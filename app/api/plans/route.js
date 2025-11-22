import dbConnect from '@/lib/db';
import Plan from '@/models/Plan';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        const plans = await Plan.find({}).sort({ price: 1 });
        return NextResponse.json({ success: true, data: plans });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const plan = await Plan.create(body);
        return NextResponse.json({ success: true, data: plan }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
