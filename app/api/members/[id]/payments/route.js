import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Filters
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        // 1. Build Query
        let query = { memberId: id };

        if (category) {
            query.paymentCategory = category;
        }

        if (startDate || endDate) {
            query.paymentDate = {};
            if (startDate) query.paymentDate.$gte = new Date(startDate);
            if (endDate) query.paymentDate.$lte = new Date(endDate);
        }

        // 2. Fetch Payments
        const payments = await Payment.find(query)
            .populate('planId', 'name duration price') // populate name, duration, price
            .sort({ paymentDate: -1 })
            .skip(offset)
            .limit(limit);

        // 3. Fetch Total Count (for pagination)
        const totalCount = await Payment.countDocuments(query);

        // 4. Fetch Member (for summary stats)
        const member = await Member.findById(id).select('totalPaid totalPlanPrice admissionFeeAmount paymentStatus');

        // Calculate summary from member virtuals if available
        let summary = {
            totalPaid: 0,
            currentBalance: 0,
            paymentStatus: 'unknown'
        };

        if (member) {
            summary = {
                totalPaid: member.totalPaid || 0,
                currentBalance: member.currentBalance, // using virtual
                paymentStatus: member.paymentStatus,
                totalPlanPrice: member.totalPlanPrice || 0
            };
        }

        return NextResponse.json({
            success: true,
            data: {
                member: member ? {
                    _id: member._id,
                    name: member.name,
                    paymentStatus: member.paymentStatus
                } : null,
                summary,
                payments,
                pagination: {
                    total: totalCount,
                    limit,
                    offset,
                    hasMore: offset + limit < totalCount
                }
            }
        });
    } catch (error) {
        console.error('Error fetching member payments:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
