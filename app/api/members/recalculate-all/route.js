import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/members/recalculate-all
 * Fix all member balances by re-summing actual payment records.
 * Safe to run multiple times (idempotent).
 */
export async function POST() {
    await dbConnect();

    try {
        const members = await Member.find({});
        const results = [];

        for (const member of members) {
            // Aggregate all payments for this member (Membership)
            const membershipAgg = await Payment.aggregate([
                { $match: { memberId: member._id, planType: { $nin: ['PTplan', 'pt_plan'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            // Aggregate all payments for this member (PT)
            const ptAgg = await Payment.aggregate([
                { $match: { memberId: member._id, planType: { $in: ['PTplan', 'pt_plan'] } } },
                { $group: { _id: null, total: { $sum: '$amount' } } }
            ]);

            const totalPaid = membershipAgg[0]?.total || 0;
            const ptTotalPaid = ptAgg[0]?.total || 0;

            const planTotal = (member.totalPlanPrice || 0) + (member.admissionFeeAmount || 0);
            const ptPlanTotal = member.ptTotalPlanPrice || 0;

            const oldPaid = member.totalPaid;
            const oldPtPaid = member.ptTotalPaid || 0;

            const newStatus =
                planTotal > 0
                    ? totalPaid >= planTotal ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
                    : totalPaid > 0 ? 'paid' : 'unpaid';
                    
            const newPtStatus =
                ptPlanTotal > 0
                    ? ptTotalPaid >= ptPlanTotal ? 'paid' : ptTotalPaid > 0 ? 'partial' : 'unpaid'
                    : ptTotalPaid > 0 ? 'paid' : 'unpaid';

            // Use updateOne to bypass Mongoose validation (e.g. required gender)
            await Member.updateOne(
                { _id: member._id },
                { $set: { 
                    totalPaid, 
                    paymentStatus: newStatus,
                    ptTotalPaid,
                    ptPaymentStatus: newPtStatus
                } }
            );

            // Only report members that changed
            if (oldPaid !== totalPaid || oldPtPaid !== ptTotalPaid) {
                results.push({
                    memberId: member.memberId,
                    name: member.name,
                    before: oldPaid,
                    after: totalPaid,
                    ptBefore: oldPtPaid,
                    ptAfter: ptTotalPaid,
                    paymentStatus: newStatus,
                    ptPaymentStatus: newPtStatus,
                });
            }
        }

        return NextResponse.json({
            success: true,
            fixed: results.length,
            details: results,
        });
    } catch (error) {
        console.error('Bulk recalculate error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
