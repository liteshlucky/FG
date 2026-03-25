import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Counter from '@/models/Counter';
import Plan from '@/models/Plan';
import PTplan from '@/models/PTplan';
import Discount from '@/models/Discount';
import Trainer from '@/models/Trainer';
import { NextResponse } from 'next/server';


export const dynamic = 'force-dynamic';
export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const query = isObjectId ? { _id: id } : { memberId: id };
        
        const member = await Member.findOne(query).populate('planId').populate('discountId').populate('ptPlanId').populate('trainerId');
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

        // Remove empty strings for optional enums
        if (body.gender === '') delete body.gender;
        if (body.status === '') delete body.status;
        if (body.paymentStatus === '') delete body.paymentStatus;
        
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const query = isObjectId ? { _id: id } : { memberId: id };
        
        const member = await Member.findOneAndUpdate(query, body, {
            new: true,
            runValidators: true,
        });
        if (!member) {
            return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: member });
    } catch (error) {
        // Format Mongoose Validation Errors nicely
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return NextResponse.json({ success: false, error: messages.join(', ') }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request, { params }) {
    await dbConnect();
    const { id } = await params;
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
        const query = isObjectId ? { _id: id } : { memberId: id };
        
        const deletedMember = await Member.findOneAndDelete(query);
        if (!deletedMember) {
            return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
        }

        // Logic to recycle memberId if the *last* member was deleted
        if (deletedMember.memberId) {
            // Extract the numeric part of the deleted member's ID
            const numericPart = deletedMember.memberId.replace(/^\D+/g, '');
            const deletedIdVal = parseInt(numericPart);

            if (!isNaN(deletedIdVal)) {
                // Find the current counter
                const counter = await Counter.findById('memberId');
                if (counter && counter.seq === deletedIdVal) {
                    // This was the very last member added. We can safely decrement the counter.
                    await Counter.findByIdAndUpdate(
                        { _id: 'memberId' },
                        { $inc: { seq: -1 } }
                    );
                    console.log(`Recycled memberId: Decremented counter from ${counter.seq} to ${counter.seq - 1}`);
                }
            }
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
