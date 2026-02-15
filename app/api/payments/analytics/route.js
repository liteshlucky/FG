
import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import { NextResponse } from 'next/server';

export async function GET(request) {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month'; // 'day', 'week', 'month'

    try {
        // Build date filter
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.paymentDate = {};
            if (startDate) dateFilter.paymentDate.$gte = new Date(startDate);
            if (endDate) dateFilter.paymentDate.$lte = new Date(endDate);
        }

        // Base match stage for pipeline
        const matchStage = {
            paymentStatus: 'completed', // Only count completed payments
            ...dateFilter
        };

        // 1. Total Stats
        const totalStats = await Payment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$amount" },
                    count: { $sum: 1 },
                    avgAmount: { $avg: "$amount" }
                }
            }
        ]);

        // 2. Payment Mode Breakdown
        const modeBreakdown = await Payment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$paymentMode",
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 3. Category Breakdown
        const categoryBreakdown = await Payment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$paymentCategory", // Using new field
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            }
        ]);

        // 4. Trend Analysis (Group by date)
        let dateGroupFormat;
        switch (groupBy) {
            case 'day': dateGroupFormat = "%Y-%m-%d"; break;
            case 'week': dateGroupFormat = "%Y-W%U"; break; // ISO Week
            case 'month': default: dateGroupFormat = "%Y-%m"; break;
        }

        const trendAnalysis = await Payment.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: dateGroupFormat, date: "$paymentDate" } },
                    totalAmount: { $sum: "$amount" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // Sort by date ascending
        ]);

        // 5. Recent Pending Payments (Separate query)
        const pendingPayments = await Payment.find({
            paymentStatus: { $ne: 'completed' }
        })
            .sort({ paymentDate: -1 })
            .limit(10)
            .populate('memberId', 'name phone');

        return NextResponse.json({
            success: true,
            data: {
                summary: totalStats[0] || { totalRevenue: 0, count: 0, avgAmount: 0 },
                byMode: modeBreakdown,
                byCategory: categoryBreakdown,
                trend: trendAnalysis,
                pending: pendingPayments
            }
        });

    } catch (error) {
        console.error('Payment analytics error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
