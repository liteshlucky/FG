import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const member = await Member.findById(id).populate('planId').populate('discountId').populate('ptPlanId');
        if (!member) {
            return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
        }

        // Calculate membership dates if missing
        const memberObj = member.toObject();
        if (memberObj.planId) {
            if (!memberObj.membershipStartDate) {
                memberObj.membershipStartDate = memberObj.joinDate;
            }
            if (!memberObj.membershipEndDate && memberObj.planId.duration) {
                const startDate = new Date(memberObj.membershipStartDate);
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + memberObj.planId.duration);
                memberObj.membershipEndDate = endDate;
            }
        }

        return NextResponse.json({ success: true, data: memberObj });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function PUT(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await request.json();

        // Handle empty strings for ObjectId fields
        if (body.discountId === '') body.discountId = null;
        if (body.planId === '') body.planId = null;
        if (body.ptPlanId === '') body.ptPlanId = null;
        if (body.trainerId === '') body.trainerId = null;
        const member = await Member.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!member) {
            return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: member });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const deletedMember = await Member.deleteOne({ _id: id });
        if (!deletedMember) {
            return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
