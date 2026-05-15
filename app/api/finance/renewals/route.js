import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Payment from '@/models/Payment';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    await dbConnect();
    
    try {
        const { searchParams } = new URL(request.url);
        const monthParam = searchParams.get('month'); // 1-12
        const yearParam = searchParams.get('year');
        
        const now = new Date();
        const targetMonth = monthParam ? parseInt(monthParam) - 1 : now.getMonth();
        const targetYear = yearParam ? parseInt(yearParam) : now.getFullYear();

        const startDate = new Date(targetYear, targetMonth, 1);
        const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

        // 1. Fetch Expected Renewals (Pending)
        // These are members whose CURRENT membership end date falls in this month.
        // Because they haven't renewed yet, their end date is still in this month.
        const pendingMembers = await Member.find({
            membershipEndDate: { $gte: startDate, $lte: endDate }
        }).populate('planId', 'name price').lean();

        // 2. Fetch Successfully Renewed
        // These are payments made in this month categorized as 'renewal'
        const renewedPayments = await Payment.find({
            paymentDate: { $gte: startDate, $lte: endDate },
            membershipAction: 'renewal',
            paymentStatus: 'completed'
        }).populate('memberId', 'name phone memberId').lean();

        // Optional: If you want to check if a pending member has an unpaid due on the same day,
        // it's already handled when they make the payment.

        // Calculate Metrics
        let expectedRevenue = 0;
        const pendingList = pendingMembers.map(m => {
            const expected = m.totalPlanPrice || (m.planId?.price || 0);
            expectedRevenue += expected;
            return {
                _id: m._id,
                memberId: m.memberId,
                name: m.name,
                phone: m.phone,
                expirationDate: m.membershipEndDate,
                planName: m.planId?.name || 'Unknown',
                expectedRevenue: expected,
                status: m.status
            };
        });

        // Sort pending by expiration date
        pendingList.sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate));

        let realizedRevenue = 0;
        
        // We might have multiple payments for the same renewal (e.g. Plan + Due Amount on same day).
        // To be completely accurate with revenue, we should fetch all payments in that month 
        // that belong to the members who renewed, or just count the 'renewal' transactions + their dues.
        // For simplicity based on our recent fix, we fetch all payments for the month, and attribute 
        // them properly.
        
        // Wait, the previous fix was only in the analytics aggregate route.
        // Let's do a similar approach here to get the full realized revenue.
        
        const allPaymentsInMonth = await Payment.find({
            paymentDate: { $gte: startDate, $lte: endDate },
            paymentStatus: 'completed'
        })
        .populate({
            path: 'memberId',
            select: 'name phone memberId planId',
            populate: { path: 'planId', select: 'name' }
        })
        .populate('planId', 'name')
        .lean();

        // Map primary actions per member per day
        const memberDailyActions = {};
        allPaymentsInMonth.forEach(p => {
            if (p.planType !== 'pt_plan' && p.planType !== 'ptplan' && p.paymentCategory !== 'PT Plan') {
                const action = (p.membershipAction || 'none').toLowerCase();
                if (action === 'new' || action === 'renewal') {
                    const dateStr = new Date(p.paymentDate).toISOString().split('T')[0];
                    const mId = p.memberId?._id?.toString() || p.memberId?.toString();
                    if (mId) {
                        if (!memberDailyActions[mId]) memberDailyActions[mId] = {};
                        memberDailyActions[mId][dateStr] = action;
                    }
                }
            }
        });

        // Now collect all 'renewal' payments including their same-day dues
        const renewedListRaw = [];
        const processedPaymentIds = new Set();
        
        allPaymentsInMonth.forEach(p => {
            if (p.planType === 'pt_plan' || p.planType === 'ptplan' || p.paymentCategory === 'PT Plan') return;
            if (processedPaymentIds.has(p._id.toString())) return;

            const action = (p.membershipAction || 'none').toLowerCase();
            const payCategory = p.paymentCategory || '';
            const dateStr = new Date(p.paymentDate).toISOString().split('T')[0];
            const mId = p.memberId?._id?.toString() || p.memberId?.toString();

            let isRenewal = false;
            
            if (action === 'renewal') {
                isRenewal = true;
            } else if (payCategory === 'Due Amount' || action === 'none') {
                // Check if it's tied to a renewal on the same day
                if (mId && memberDailyActions[mId] && memberDailyActions[mId][dateStr] === 'renewal') {
                    isRenewal = true;
                }
            }

            if (isRenewal) {
                realizedRevenue += (p.amount || 0);
                processedPaymentIds.add(p._id.toString());
                
                // Check if we already have this member's renewal for this day to group them
                const existing = renewedListRaw.find(r => r.memberIdStr === mId && r.dateStr === dateStr);
                if (existing) {
                    existing.amount += (p.amount || 0);
                } else {
                    renewedListRaw.push({
                        _id: p._id,
                        memberIdStr: mId,
                        dateStr: dateStr,
                        memberId: p.memberId?.memberId || '-',
                        name: p.memberId?.name || 'Unknown',
                        phone: p.memberId?.phone || '-',
                        paymentDate: p.paymentDate,
                        planType: p.planId?.name || p.memberId?.planId?.name || (p.planType === 'membership' ? 'Membership' : p.planType) || 'Membership',
                        amount: p.amount || 0
                    });
                }
            }
        });

        // Sort renewed by payment date (descending)
        renewedListRaw.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

        const conversionRate = (renewedListRaw.length + pendingList.length) > 0 
            ? Math.round((renewedListRaw.length / (renewedListRaw.length + pendingList.length)) * 100)
            : 0;

        return NextResponse.json({
            success: true,
            data: {
                metrics: {
                    pendingCount: pendingList.length,
                    expectedRevenue: expectedRevenue,
                    renewedCount: renewedListRaw.length,
                    realizedRevenue: realizedRevenue,
                    conversionRate: conversionRate
                },
                pendingList: pendingList,
                renewedList: renewedListRaw
            }
        });

    } catch (error) {
        console.error('Renewals API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
