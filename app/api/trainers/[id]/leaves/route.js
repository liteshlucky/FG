import dbConnect from '../../../../../lib/db';
import Trainer from '../../../../../models/Trainer';
import { NextResponse } from 'next/server';

export async function POST(req, { params }) {
    const { id } = await params;
    await dbConnect();

    try {
        const { date } = await req.json();
        const trainer = await Trainer.findById(id);
        if (!trainer) {
            return NextResponse.json({ success: false, error: 'Trainer not found' }, { status: 404 });
        }

        // Add date if not already present
        const leaveDate = new Date(date);
        const exists = trainer.leaves.some(d => new Date(d).toDateString() === leaveDate.toDateString());

        if (!exists) {
            trainer.leaves.push(leaveDate);
            await trainer.save();
        }

        return NextResponse.json({ success: true, data: trainer.leaves });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(req, { params }) {
    const { id } = await params;
    await dbConnect();

    try {
        const { date } = await req.json();
        const trainer = await Trainer.findById(id);
        if (!trainer) {
            return NextResponse.json({ success: false, error: 'Trainer not found' }, { status: 404 });
        }

        // Remove date
        const leaveDate = new Date(date).toDateString();
        trainer.leaves = trainer.leaves.filter(d => new Date(d).toDateString() !== leaveDate);
        await trainer.save();

        return NextResponse.json({ success: true, data: trainer.leaves });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
