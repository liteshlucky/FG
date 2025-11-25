import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import { NextResponse } from 'next/server';

// GET: Fetch attendance history with filters and pagination
export async function GET(request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const userType = searchParams.get('userType');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const query = {};

        if (userId) {
            query.userId = userId;
        }

        if (userType) {
            query.userType = userType;
        }

        if (startDate || endDate) {
            query.date = {};

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                query.date.$gte = start;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const skip = (page - 1) * limit;

        const [attendanceRecords, totalCount] = await Promise.all([
            Attendance.find(query)
                .populate('userId', 'name email phone')
                .select('userId userType checkInTime checkOutTime duration status date checkInPhoto checkOutPhoto')
                .sort({ checkInTime: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Attendance.countDocuments(query)
        ]);

        // Calculate statistics
        const stats = {
            totalRecords: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            recordsPerPage: limit
        };

        // Calculate aggregate stats if userId is provided
        if (userId) {
            const aggregateStats = await Attendance.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        totalVisits: { $sum: 1 },
                        totalDuration: { $sum: '$duration' },
                        avgDuration: { $avg: '$duration' }
                    }
                }
            ]);

            if (aggregateStats.length > 0) {
                stats.totalVisits = aggregateStats[0].totalVisits;
                stats.totalDuration = aggregateStats[0].totalDuration || 0;
                stats.avgDuration = Math.round(aggregateStats[0].avgDuration || 0);
            }
        }

        return NextResponse.json({
            success: true,
            data: attendanceRecords,
            stats
        });

    } catch (error) {
        console.error('Attendance History Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
