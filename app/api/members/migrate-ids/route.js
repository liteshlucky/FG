import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Counter from '@/models/Counter';
import { NextResponse } from 'next/server';

export async function POST() {
    await dbConnect();
    try {
        // Find members without memberId
        const membersToUpdate = await Member.find({
            $or: [
                { memberId: { $exists: false } },
                { memberId: null },
                { memberId: '' }
            ]
        });

        console.log(`Found ${membersToUpdate.length} members to update.`);

        const results = [];

        for (const member of membersToUpdate) {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'memberId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            const newMemberId = `MEM${String(counter.seq).padStart(3, '0')}`;

            member.memberId = newMemberId;
            await member.save();
            results.push({ id: member._id, name: member.name, newMemberId });
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${results.length} members`,
            data: results
        });

    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
