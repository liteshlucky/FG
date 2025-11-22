import dbConnect from '@/lib/db';
import Discount from '@/models/Discount';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await request.json();
        const discount = await Discount.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!discount) {
            return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: discount });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const deletedDiscount = await Discount.deleteOne({ _id: id });
        if (!deletedDiscount) {
            return NextResponse.json({ success: false, error: 'Discount not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
