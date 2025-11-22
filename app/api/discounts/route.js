import dbConnect from '@/lib/db';
import Discount from '@/models/Discount';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        const discounts = await Discount.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: discounts });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const discount = await Discount.create(body);
        return NextResponse.json({ success: true, data: discount }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
