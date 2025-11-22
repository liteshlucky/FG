import dbConnect from '@/lib/db';
import PTplan from '@/models/PTplan';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        const ptPlans = await PTplan.find({}).populate('trainerId').sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: ptPlans });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const ptPlan = await PTplan.create(body);
        return NextResponse.json({ success: true, data: ptPlan }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
