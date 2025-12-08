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
                let modelName;
                if (payment.planType === 'membership' || payment.planType === 'Plan') {
                    modelName = 'Plan';
                } else if (payment.planType === 'pt_plan' || payment.planType === 'PTplan') {
                    modelName = 'PTplan';
                }

                if (modelName) {
                    await payment.populate({ path: 'planId', model: modelName });
                }
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

        // Create payment with additional fields
        const paymentData = {
            ...body,
            paymentStatus: 'completed', // Always set to completed
        };

        // If part payment, store the full amount
        if (body.paymentType === 'part_payment' && body.fullAmount) {
            paymentData.fullAmount = parseFloat(body.fullAmount);
        }

        const payment = await Payment.create(paymentData);

        // Update member's totalPaid and paymentStatus
        const member = await Member.findById(body.memberId).populate('planId').populate('ptPlanId').populate('discountId');

        if (member) {
            // Handle membership activation
            if (body.activateMembership && body.planType === 'membership') {
                member.status = 'Active';
            }

            // Handle membership renewal
            if (body.isRenewal && body.planType === 'membership' && body.renewalPlanId && body.renewalStartDate) {
                // Fetch the renewal plan to get its duration
                const Plan = (await import('@/models/Plan')).default;
                const renewalPlan = await Plan.findById(body.renewalPlanId);

                if (renewalPlan) {
                    // Update member's plan
                    member.planId = body.renewalPlanId;

                    // Set membership start date
                    member.membershipStartDate = new Date(body.renewalStartDate);

                    // Calculate membership end date based on plan duration
                    const endDate = new Date(body.renewalStartDate);
                    endDate.setMonth(endDate.getMonth() + renewalPlan.duration);
                    member.membershipEndDate = endDate;

                    // Reset payment tracking for new billing cycle
                    member.totalPaid = body.amount;

                    // Calculate new payment status based on renewal plan price
                    let totalDue = renewalPlan.price;

                    // Apply discount if exists
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
                }
            } else {
                // Regular payment (no renewal)

                // Determine total due based on payment type
                let totalDue = 0;

                if (body.paymentType === 'part_payment' && body.fullAmount) {
                    // For part payment, use the full amount specified
                    totalDue = parseFloat(body.fullAmount);
                    member.totalPaid = (member.totalPaid || 0) + body.amount;
                } else {
                    // For due clear, calculate from plans
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

                    member.totalPaid = (member.totalPaid || 0) + body.amount;
                }

                // Update payment status
                if (member.totalPaid >= totalDue) {
                    member.paymentStatus = 'paid';
                } else if (member.totalPaid > 0) {
                    member.paymentStatus = 'partial';
                } else {
                    member.paymentStatus = 'unpaid';
                }
            }

            await member.save();
        }

        return NextResponse.json({ success: true, data: payment }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
