import dbConnect from '@/lib/db';
import TrainerPayment from '@/models/TrainerPayment';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    await dbConnect();
    try {
        const { id } = await params;
        const payments = await TrainerPayment.find({ trainerId: id }).sort({ paymentDate: -1 });
        return NextResponse.json({ success: true, data: payments });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    await dbConnect();
    try {
        const { id } = await params;
        const body = await request.json();

        const payment = await TrainerPayment.create({
            ...body,
            trainerId: id
        });

        return NextResponse.json({ success: true, data: payment }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
