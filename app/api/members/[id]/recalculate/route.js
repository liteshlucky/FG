import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/members/[id]/recalculate
 * Recalculates totalPaid and paymentStatus for a member by summing all actual payment records.
 * Call this to fix stale balance after manual payment deletions.
 */
export async function POST(request, { params }) {
    await dbConnect();
    const { id } = await params;

    try {
        const member = await Member.findById(id);
        if (!member) {
            return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
        }

        // Sum all non-debit payments for this member
        const result = await Payment.aggregate([
            { $match: { memberId: member._id } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalPaid = result[0]?.total || 0;
        const planTotal = (member.totalPlanPrice || 0) + (member.admissionFeeAmount || 0);

        member.totalPaid = totalPaid;
        member.paymentStatus = totalPaid >= planTotal && planTotal > 0 ? 'paid'
            : totalPaid > 0 ? 'partial'
            : 'unpaid';

        await member.save();

        return NextResponse.json({
            success: true,
            data: {
                memberId:      member.memberId,
                name:          member.name,
                totalPaid,
                totalPlanPrice: planTotal,
                balance:       planTotal - totalPaid,
                paymentStatus: member.paymentStatus,
            }
        });
    } catch (error) {
        console.error('Recalculate error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
