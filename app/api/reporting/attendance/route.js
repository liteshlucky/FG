import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || 'month'; // 'day', 'week', 'month', 'year', 'all'
        const exactDate = searchParams.get('date'); // YYYY-MM-DD
        const exactMonth = searchParams.get('month'); // YYYY-MM
        const exactWeek = searchParams.get('week'); // YYYY-Www

        const now = new Date();

        // Determine date range
        let startDate = new Date();
        let endDate = new Date();
        
        if (exactDate) {
            startDate = new Date(exactDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(exactDate);
            endDate.setHours(23, 59, 59, 999);
        } else if (exactMonth) {
            const [year, month] = exactMonth.split('-');
            startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(parseInt(year), parseInt(month), 0); // Last day of month
            endDate.setHours(23, 59, 59, 999);
        } else if (exactWeek) {
            // week format is YYYY-Www
            const [yearStr, weekStr] = exactWeek.split('-W');
            const year = parseInt(yearStr);
            const week = parseInt(weekStr);
            // Get first day of the year
            const simple = new Date(year, 0, 1 + (week - 1) * 7);
            // Get the Monday of that week
            const dow = simple.getDay();
            const ISOweekStart = simple;
            if (dow <= 4)
                ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
            else
                ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
            
            startDate = new Date(ISOweekStart);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(ISOweekStart);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        } else {
            // Default rolling ranges
            if (range === 'day') {
                startDate.setHours(0, 0, 0, 0);
            } else if (range === 'week') {
                startDate.setDate(endDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
            } else if (range === 'month') {
                startDate.setDate(endDate.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
            } else if (range === 'year') {
                startDate.setFullYear(endDate.getFullYear() - 1);
                startDate.setHours(0, 0, 0, 0);
            } else if (range === 'all') {
                startDate = new Date(0); // Epoch
            }
        }

        const dateFilter = {
            userType: 'Member',
            checkInTime: { $gte: startDate, $lte: endDate }
        };

        // 1. Total Present (in period)
        const totalPresent = await Attendance.countDocuments(dateFilter);

        // 2. Average Duration (in period)
        const durationStats = await Attendance.aggregate([
            { $match: { ...dateFilter, duration: { $ne: null } } },
            { $group: { _id: null, avgDuration: { $avg: "$duration" } } }
        ]);
        const avgDuration = durationStats.length > 0 ? Math.round(durationStats[0].avgDuration) : 0;

        // 3. Peak Hours Heatmap (group by hour of checkInTime)
        const peakHours = await Attendance.aggregate([
            { $match: dateFilter },
            {
                $project: {
                    // Extract hour according to UTC, but since we are doing local, let's just grab the hour
                    hour: { $hour: { date: "$checkInTime", timezone: "Asia/Kolkata" } }
                }
            },
            {
                $group: {
                    _id: "$hour",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        // Format peak hours
        const formattedPeakHours = Array.from({ length: 24 }).map((_, i) => {
            const hourData = peakHours.find(h => h._id === i);
            const hourLabel = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
            return {
                hour: i,
                label: hourLabel,
                count: hourData ? hourData.count : 0
            };
        });

        // 4. Busiest Days (group by date)
        const busiestDays = await Attendance.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$date",
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // Sort chronologically
        ]);

        const formattedBusiestDays = busiestDays.map(day => ({
            date: day._id,
            dateString: new Date(day._id).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            count: day.count
        }));

        // 5. Top Attendees
        const topAttendees = await Attendance.aggregate([
            { $match: dateFilter },
            {
                $group: {
                    _id: "$userId",
                    visits: { $sum: 1 },
                    totalDuration: { $sum: "$duration" }
                }
            },
            { $sort: { visits: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'members', // Ensure collection name matches Member.js
                    localField: '_id',
                    foreignField: '_id',
                    as: 'memberInfo'
                }
            },
            { $unwind: "$memberInfo" },
            {
                $project: {
                    _id: 1,
                    visits: 1,
                    totalDuration: 1,
                    name: "$memberInfo.name",
                    phone: "$memberInfo.phone",
                    memberId: "$memberInfo.memberId",
                    profilePicture: "$memberInfo.profilePicture"
                }
            }
        ]);

        // 6. Absentee / At-Risk Members (Active members who haven't visited in 14 days)
        // Find members who DO NOT have an attendance record in the last 14 days
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(now.getDate() - 14);
        fourteenDaysAgo.setHours(0, 0, 0, 0);

        // Get IDs of members who DID visit in the last 14 days
        const recentVisitors = await Attendance.distinct('userId', {
            userType: 'Member',
            checkInTime: { $gte: fourteenDaysAgo }
        });

        // Find Active members whose ID is NOT in the recentVisitors array
        const absenteeMembers = await Member.find({
            status: 'Active',
            _id: { $nin: recentVisitors }
        })
        .select('name phone memberId membershipEndDate')
        .sort({ membershipEndDate: 1 }) // At risk of expiry soonest
        .limit(20)
        .lean();

        // Calculate days absent for each
        const absenteeWithDays = await Promise.all(absenteeMembers.map(async (member) => {
            const lastVisit = await Attendance.findOne({ userId: member._id, userType: 'Member' })
                .sort({ checkInTime: -1 })
                .select('checkInTime');
            
            let daysAbsent = 'No records';
            if (lastVisit) {
                const diffTime = Math.abs(now - lastVisit.checkInTime);
                daysAbsent = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }
            return {
                ...member,
                lastVisit: lastVisit ? lastVisit.checkInTime : null,
                daysAbsent
            };
        }));
        
        // Sort by days absent descending 
        absenteeWithDays.sort((a, b) => {
            if (a.daysAbsent === 'No records') return 1;
            if (b.daysAbsent === 'No records') return -1;
            return b.daysAbsent - a.daysAbsent;
        });

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalPresent,
                    avgDuration
                },
                peakHours: formattedPeakHours,
                busiestDays: formattedBusiestDays,
                topAttendees,
                absenteeMembers: absenteeWithDays
            }
        });

    } catch (error) {
        console.error('Attendance Reporting Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
