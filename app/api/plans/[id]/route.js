import dbConnect from '@/lib/db';
import Plan from '@/models/Plan';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const plan = await Plan.findById(id);
        if (!plan) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: plan });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await request.json();
        const plan = await Plan.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!plan) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: plan });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const deletedPlan = await Plan.deleteOne({ _id: id });
        if (!deletedPlan) {
            return NextResponse.json({ success: false, error: 'Plan not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
