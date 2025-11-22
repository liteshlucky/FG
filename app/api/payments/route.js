import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export async function GET(request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const memberId = searchParams.get('memberId');
        const planType = searchParams.get('planType');
        const paymentStatus = searchParams.get('paymentStatus');

        let query = {};
        if (memberId) query.memberId = memberId;
        if (planType) query.planType = planType;
        if (paymentStatus) query.paymentStatus = paymentStatus;

        const payments = await Payment.find(query)
            .populate('memberId')
            .sort({ createdAt: -1 });

        // Manually populate planId based on planType
        for (let payment of payments) {
            if (payment.planId) {
                const modelName = payment.planType === 'membership' ? 'Plan' : 'PTplan';
                await payment.populate({ path: 'planId', model: modelName });
            }
        }

        return NextResponse.json({ success: true, data: payments });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();

        // Create payment
        const payment = await Payment.create(body);

        // Update member's totalPaid and paymentStatus
        const member = await Member.findById(body.memberId).populate('planId').populate('ptPlanId').populate('discountId');

        if (member) {
            member.totalPaid = (member.totalPaid || 0) + body.amount;

            // Calculate total due
            let totalDue = 0;
            if (member.planId) totalDue += member.planId.price;
            if (member.ptPlanId) totalDue += member.ptPlanId.price;

            // Apply discount
            if (member.discountId) {
                if (member.discountId.type === 'percentage') {
                    totalDue -= (totalDue * member.discountId.value) / 100;
                } else {
                    totalDue -= member.discountId.value;
                }
            }

            // Update payment status
            if (member.totalPaid >= totalDue) {
                member.paymentStatus = 'paid';
            } else if (member.totalPaid > 0) {
                member.paymentStatus = 'partial';
            } else {
                member.paymentStatus = 'unpaid';
            }

            await member.save();
        }

        return NextResponse.json({ success: true, data: payment }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
