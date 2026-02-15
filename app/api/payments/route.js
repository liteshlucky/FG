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

        // Import utilities dynamically if needed, or at top level (better at top, but sticking to file structure)
        const { calculatePaymentStatus, generateReceiptNumber } = await import('@/lib/paymentCalculations');
        const Plan = (await import('@/models/Plan')).default;

        // 1. Prepare Payment Data
        const paymentData = {
            ...body,
            paymentStatus: 'completed',
            receiptNumber: generateReceiptNumber(),
            paymentDate: body.paymentDate || new Date(),
        };

        // Determine Membership Action
        if (body.isRenewal) {
            paymentData.membershipAction = 'renewal';
        } else if (body.activateMembership) {
            paymentData.membershipAction = 'new';
        } else if (body.membershipAction) {
            paymentData.membershipAction = body.membershipAction;
        }

        // 2. Handle Member Updates
        const member = await Member.findById(body.memberId);
        if (!member) throw new Error('Member not found');

        // Logic for Membership Changes (New/Renewal/Upgrade)
        if (body.isRenewal || (body.activateMembership && body.planType === 'membership')) {
            const planIdToUse = body.renewalPlanId || body.planId || member.planId;

            if (planIdToUse) {
                const plan = await Plan.findById(planIdToUse);
                if (plan) {
                    // Update Member Plan Details
                    member.planId = plan._id;
                    member.totalPlanPrice = plan.price; // Update snapshot of price

                    // Set Dates
                    const startDate = body.renewalStartDate ? new Date(body.renewalStartDate) : new Date();
                    member.membershipStartDate = startDate;

                    const endDate = new Date(startDate);
                    endDate.setMonth(endDate.getMonth() + plan.duration);
                    member.membershipEndDate = endDate;

                    // Reset Payment Tracking for new cycle
                    // If it's a renewal, we might want to reset totalPaid to just this payment?
                    // OR do we keep cumulative? 
                    // Usually for renewals, we reset 'totalPaid' for the *current* membership cycle.
                    // But our 'totalPaid' field on Member is simple. 
                    // Let's assume 'totalPaid' tracks payments towards *current* plan.
                    member.totalPaid = 0; // Will be added to below

                    // Allow overriding plan price if provided (custom discount/deal)
                    if (body.customPlanPrice) {
                        member.totalPlanPrice = parseFloat(body.customPlanPrice);
                    }

                    // Snapshot plan price in payment too
                    paymentData.planPrice = member.totalPlanPrice;
                }
            }

            member.status = 'Active';
        }

        // 3. Create Payment Record
        const payment = await Payment.create(paymentData);

        // 4. Update Member Totals
        // Add this payment to member's total
        member.totalPaid = (member.totalPaid || 0) + payment.amount;

        // Update last payment info
        member.lastPaymentDate = payment.paymentDate;
        member.lastPaymentAmount = payment.amount;

        // Handle Admission Fee
        if (body.admissionFee && body.admissionFee > 0) {
            member.admissionFeeAmount = body.admissionFee;
            // If this payment covers admission, mark as paid? 
            // Simplified: We assume totalPaid covers everything.
        }

        // 5. Update Payment Status (paid/partial/unpaid)
        member.paymentStatus = calculatePaymentStatus(
            member.totalPlanPrice || 0,
            member.totalPaid,
            member.admissionFeeAmount || 0
        );

        await member.save();

        return NextResponse.json({ success: true, data: payment }, { status: 201 });
    } catch (error) {
        console.error('Payment creation error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
