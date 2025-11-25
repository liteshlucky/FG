import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Counter from '@/models/Counter';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        const members = await Member.find({ memberId: { $exists: false } }).sort({ createdAt: 1 });
        const trainers = await Trainer.find({ trainerId: { $exists: false } }).sort({ createdAt: 1 });

        let memberCount = 0;
        let trainerCount = 0;

        // Migrate Members
        for (const member of members) {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'memberId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            member.memberId = `MEM${String(counter.seq).padStart(3, '0')}`;
            await member.save();
            memberCount++;
        }

        // Migrate Trainers
        for (const trainer of trainers) {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'trainerId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            trainer.trainerId = `TRN${String(counter.seq).padStart(3, '0')}`;
            await trainer.save();
            trainerCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Migrated ${memberCount} members and ${trainerCount} trainers.`,
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
