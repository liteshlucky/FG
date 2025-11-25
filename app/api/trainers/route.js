import dbConnect from '@/lib/db';
import Trainer from '@/models/Trainer';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        const trainers = await Trainer.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: trainers });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

import Counter from '@/models/Counter';

// ... imports

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();

        // Auto-generate trainerId
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'trainerId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        body.trainerId = `TRN${String(counter.seq).padStart(3, '0')}`;

        const trainer = await Trainer.create(body);
        return NextResponse.json({ success: true, data: trainer }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
