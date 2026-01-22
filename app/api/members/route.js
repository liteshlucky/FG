import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Plan from '@/models/Plan';
import PTplan from '@/models/PTplan';
import Discount from '@/models/Discount';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        const now = new Date();

        // Batch update expired members
        await Member.updateMany(
            { status: 'Active', membershipEndDate: { $lt: now } },
            { $set: { status: 'Expired' } }
        );

        // Fetch using lean() for better performance
        let members = await Member.find({})
            .populate('planId')
            .populate('discountId')
            .populate('ptPlanId')
            .sort({ createdAt: -1 })
            .lean();

        // Apply runtime logic for missing dates (in-memory only)
        members = members.map(member => {
            if (member.planId) {
                // Default start date to join date if missing
                if (!member.membershipStartDate) {
                    member.membershipStartDate = member.joinDate;
                }

                // Calculate end date if missing
                if (!member.membershipEndDate && member.planId.duration) {
                    const startDate = new Date(member.membershipStartDate);
                    const endDate = new Date(startDate);
                    endDate.setMonth(endDate.getMonth() + member.planId.duration);
                    member.membershipEndDate = endDate;
                }
            }
            return member;
        });

        return NextResponse.json({ success: true, data: members });
    } catch (error) {
        console.error('Error in GET /api/members:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

import Counter from '@/models/Counter';

// ... imports

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();

        // Convert empty strings to null for optional reference fields
        if (body.discountId === '') body.discountId = null;
        if (body.ptPlanId === '') body.ptPlanId = null;
        if (body.planId === '') body.planId = null;
        if (body.trainerId === '') body.trainerId = null;

        // Auto-generate memberId
        const counter = await Counter.findByIdAndUpdate(
            { _id: 'memberId' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        body.memberId = `MEM${String(counter.seq).padStart(3, '0')}`;

        const member = await Member.create(body);
        return NextResponse.json({ success: true, data: member }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
