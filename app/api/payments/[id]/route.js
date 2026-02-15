
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

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

        // 1. Get Original Payment
        const payment = await Payment.findById(id);
        if (!payment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        // 2. Calculate Amount Difference
        const oldAmount = payment.amount || 0;
        const newAmount = parseFloat(body.amount);
        const diff = newAmount - oldAmount;

        // 3. Update Payment
        const updatedPayment = await Payment.findByIdAndUpdate(
            id,
            {
                $set: {
                    amount: newAmount,
                    paymentDate: body.paymentDate,
                    paymentMode: body.paymentMode,
                    paymentCategory: body.paymentCategory,
                    notes: body.notes,
                    transactionId: body.transactionId,
                    // Allow updating planId if needed, but be careful
                    planId: body.planId || payment.planId
                }
            },
            { new: true }
        );

        // 4. Update Member totalPaid if amount changed
        if (diff !== 0) {
            const member = await Member.findById(payment.memberId);
            if (member) {
                member.totalPaid = (member.totalPaid || 0) + diff;

                // Recalculate status logic (simplified)
                const due = (member.totalPlanPrice || 0) - member.totalPaid;
                if (member.totalPlanPrice > 0) {
                    member.paymentStatus = due <= 0 ? 'paid' : (member.totalPaid > 0 ? 'partial' : 'unpaid');
                }

                await member.save();
            }
        }

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
        // 1. Get Payment
        const payment = await Payment.findById(id);
        if (!payment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }

        // 2. Update Member totalPaid
        const member = await Member.findById(payment.memberId);
        if (member) {
            member.totalPaid = (member.totalPaid || 0) - payment.amount;

            // Recalculate status logic
            const due = (member.totalPlanPrice || 0) - member.totalPaid;
            if (member.totalPlanPrice > 0) {
                member.paymentStatus = due <= 0 ? 'paid' : (member.totalPaid > 0 ? 'partial' : 'unpaid');
            }

            await member.save();
        }

        // 3. Delete Payment
        await Payment.findByIdAndDelete(id);

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        console.error('Payment delete error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
