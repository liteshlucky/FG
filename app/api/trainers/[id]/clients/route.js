import dbConnect from '../../../../../lib/db';
import Member from '../../../../../models/Member';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    const { id } = await params;
    await dbConnect();
    try {
        const members = await Member.find({ trainerId: id }).select('name profilePicture');
        return NextResponse.json({ success: true, data: members });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
