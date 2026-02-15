import dbConnect from '../../../../lib/db';
import Trainer from '../../../../models/Trainer';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    const { id } = await params;
    await dbConnect();

    try {
        const trainer = await Trainer.findById(id);
        if (!trainer) {
            return NextResponse.json({ success: false, error: 'Trainer not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: trainer });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(req, { params }) {
    const { id } = await params;
    await dbConnect();

    try {
        const body = await req.json();
        const trainer = await Trainer.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!trainer) {
            return NextResponse.json({ success: false, error: 'Trainer not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: trainer });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(req, { params }) {
    const { id } = await params;
    await dbConnect();

    try {
        const result = await Trainer.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            return NextResponse.json({ success: false, error: 'Trainer not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

