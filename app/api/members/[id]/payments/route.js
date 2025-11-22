import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const payments = await Payment.find({ memberId: id })
            .populate('planId')
            .sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: payments });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
