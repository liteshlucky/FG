import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Counter from '@/models/Counter';
import { NextResponse } from 'next/server';

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const members = Array.isArray(body) ? body : [body];
        const results = [];

        for (const memberData of members) {
            // Generate memberId if not present
            if (!memberData.memberId) {
                const counter = await Counter.findByIdAndUpdate(
                    { _id: 'memberId' },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );
                memberData.memberId = `MEM${String(counter.seq).padStart(3, '0')}`;
            }

            // Clean up empty strings for ObjectIds
            if (memberData.discountId === '') memberData.discountId = null;
            if (memberData.ptPlanId === '') memberData.ptPlanId = null;
            if (memberData.planId === '') memberData.planId = null;
            if (memberData.trainerId === '') memberData.trainerId = null;

            // Upsert based on memberId or email
            const filter = memberData._id
                ? { _id: memberData._id }
                : memberData.memberId
                    ? { memberId: memberData.memberId }
                    : { email: memberData.email };

            const result = await Member.findOneAndUpdate(
                filter,
                memberData,
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
            results.push(result);
        }

        return NextResponse.json({ success: true, count: results.length, data: results });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
