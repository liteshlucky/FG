import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
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
        const payment = await Payment.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });

        if (!payment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: payment });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const deletedPayment = await Payment.deleteOne({ _id: id });
        if (!deletedPayment) {
            return NextResponse.json({ success: false, error: 'Payment not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
