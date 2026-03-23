
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Helper: recalculate member totalPaid from actual DB records ───────────────
async function recalculateMemberBalance(memberId) {
    const member = await Member.findById(memberId);
    if (!member) return;

    // Sum all credit payments that still exist
    const result = await Payment.aggregate([
        { $match: { memberId: member._id, transactionType: { $ne: 'Debit' } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalPaid = result[0]?.total || 0;
    member.totalPaid = totalPaid;

    // Recalculate payment status
    const planTotal = (member.totalPlanPrice || 0) + (member.admissionFeeAmount || 0);
    if (planTotal > 0) {
        member.paymentStatus = totalPaid >= planTotal ? 'paid'
            : totalPaid > 0 ? 'partial'
            : 'unpaid';
    } else {
        member.paymentStatus = totalPaid > 0 ? 'paid' : 'unpaid';
    }

    await member.save();
    return member;
}

export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const payment = await Payment.findById(id)
            .populate('memberId')
            .populate('planId');

        if (!payment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: payment });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await request.json();

        const payment = await Payment.findById(id);
        if (!payment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        // Update the payment record
        const updatedPayment = await Payment.findByIdAndUpdate(
            id,
            {
                $set: {
                    amount:          parseFloat(body.amount),
                    paymentDate:     body.paymentDate,
                    paymentMode:     body.paymentMode,
                    paymentCategory: body.paymentCategory,
                    notes:           body.notes,
                    transactionId:   body.transactionId,
                    planId:          body.planId || payment.planId
                }
            },
            { new: true }
        );

        // Always recalculate from DB — never rely on arithmetic
        await recalculateMemberBalance(payment.memberId);

        return NextResponse.json({ success: true, data: updatedPayment });
    } catch (error) {
        console.error('Payment update error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const payment = await Payment.findById(id);
        if (!payment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        const memberId = payment.memberId;

        // Delete first, then recalculate from remaining records
        await Payment.findByIdAndDelete(id);
        await recalculateMemberBalance(memberId);

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        console.error('Payment delete error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
