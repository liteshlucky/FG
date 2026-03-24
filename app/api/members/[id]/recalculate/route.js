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

        // Sum all non-debit payments for this member (Membership)
        const membershipResult = await Payment.aggregate([
            { $match: { memberId: member._id, planType: { $nin: ['PTplan', 'pt_plan'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        // Sum all non-debit payments for this member (PT)
        const ptResult = await Payment.aggregate([
            { $match: { memberId: member._id, planType: { $in: ['PTplan', 'pt_plan'] } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const totalPaid = membershipResult[0]?.total || 0;
        const planTotal = (member.totalPlanPrice || 0) + (member.admissionFeeAmount || 0);

        const ptTotalPaid = ptResult[0]?.total || 0;
        const ptPlanTotal = member.ptTotalPlanPrice || 0;

        member.totalPaid = totalPaid;
        member.paymentStatus = totalPaid >= planTotal && planTotal > 0 ? 'paid'
            : totalPaid > 0 ? 'partial'
            : 'unpaid';

        member.ptTotalPaid = ptTotalPaid;
        member.ptPaymentStatus = ptTotalPaid >= ptPlanTotal && ptPlanTotal > 0 ? 'paid'
            : ptTotalPaid > 0 ? 'partial'
            : 'unpaid';

        await member.save();

        return NextResponse.json({
            success: true,
            data: {
                memberId:      member.memberId,
                name:          member.name,
                totalPaid,
                ptTotalPaid,
                totalPlanPrice: planTotal,
                ptTotalPlanPrice: ptPlanTotal,
                balance:       planTotal - totalPaid,
                ptBalance:     ptPlanTotal - ptTotalPaid,
                paymentStatus: member.paymentStatus,
                ptPaymentStatus: member.ptPaymentStatus,
            }

        });
    } catch (error) {
        console.error('Recalculate error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
