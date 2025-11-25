import dbConnect from '../../../../../lib/db';
import Trainer from '../../../../../models/Trainer';
import Member from '../../../../../models/Member';
import Payment from '../../../../../models/Payment';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    const { id } = await params;
    await dbConnect();
    try {
        const trainer = await Trainer.findById(id);
        if (!trainer) {
            return NextResponse.json({ success: false, error: 'Trainer not found' }, { status: 404 });
        }
        // Find members linked to this trainer
        const members = await Member.find({ trainerId: trainer._id }).select('_id');
        const memberIds = members.map((m) => m._id);
        // Find PT payments for these members
        const payments = await Payment.find({
            memberId: { $in: memberIds },
            type: 'pt',
        }).select('memberId amount date');
        return NextResponse.json({ success: true, data: payments });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
