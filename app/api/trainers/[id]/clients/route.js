import dbConnect from '../../../../../lib/db';
import Member from '../../../../../models/Member';
import { NextResponse } from 'next/server';


export const dynamic = 'force-dynamic';
export async function GET(req, { params }) {
    const { id } = await params;
    await dbConnect();
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const members = await Member.find({ 
            trainerId: id,
            status: 'Active',
            $or: [
                { ptEndDate: { $gte: today } },
                { ptEndDate: { $exists: false } }
            ]
        })
        .populate('ptPlanId', 'name')
        .select('name memberId phone profilePicture ptStartDate ptEndDate ptPlanId ptFee status')
        .sort({ ptEndDate: 1 });

        // Filter out those who don't actually have a valid PT assignment 
        // (Just to be safe, we only want ones with ptEndDate >= today)
        const activePtMembers = members.filter(m => {
            if (!m.ptEndDate) return false;
            const endDate = new Date(m.ptEndDate);
            return endDate >= today;
        });

        return NextResponse.json({ success: true, count: activePtMembers.length, data: activePtMembers });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
