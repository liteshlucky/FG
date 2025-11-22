import dbConnect from '@/lib/db';
import PTplan from '@/models/PTplan';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const ptPlan = await PTplan.findById(id).populate('trainerId');
        if (!ptPlan) {
            return NextResponse.json({ success: false, error: 'PT Plan not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: ptPlan });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await request.json();
        const ptPlan = await PTplan.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!ptPlan) {
            return NextResponse.json({ success: false, error: 'PT Plan not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: ptPlan });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const deletedPTPlan = await PTplan.deleteOne({ _id: id });
        if (!deletedPTPlan) {
            return NextResponse.json({ success: false, error: 'PT Plan not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
