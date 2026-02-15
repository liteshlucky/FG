import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import TrainerAttendance from '@/models/TrainerAttendance';
import { NextResponse } from 'next/server';

// GET: Fetch attendance history with filters and pagination
export async function GET(request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const userType = searchParams.get('userType'); // 'Member', 'Trainer', or 'all'
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');

        const query = {};
        const trainerQuery = {};

        if (userId) {
            query.userId = userId;
            trainerQuery.trainerId = userId;
        }

        if (startDate || endDate) {
            query.date = {};
            trainerQuery.date = {};

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                query.date.$gte = start;
                trainerQuery.date.$gte = start;
            }

            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
                trainerQuery.date.$lte = end;
            }
        }

        const skip = (page - 1) * limit;

        let members = [];
        let trainers = [];
        let totalMembers = 0;
        let totalTrainers = 0;

        const shouldFetchMembers = !userType || userType === 'all' || userType === 'Member';
        const shouldFetchTrainers = !userType || userType === 'all' || userType === 'Trainer';

        // Fetch Data
        // Optimization: For "All" we fetch (skip + limit) from both to ensure correct sorting/pagination after merge
        // For specific types, we can use standard skip/limit
        const fetchLimit = userType && userType !== 'all' ? limit : (skip + limit);
        const fetchSkip = userType && userType !== 'all' ? skip : 0;

        await Promise.all([
            // Fetch Members
            shouldFetchMembers ? (async () => {
                [members, totalMembers] = await Promise.all([
                    Attendance.find(query)
                        .populate('userId', 'name email phone')
                        .select('userId userType checkInTime checkOutTime duration status date checkInPhoto checkOutPhoto')
                        .sort({ checkInTime: -1 })
                        .skip(fetchSkip)
                        .limit(fetchLimit)
                        .lean(),
                    Attendance.countDocuments(query)
                ]);
            })() : Promise.resolve(),

            // Fetch Trainers
            shouldFetchTrainers ? (async () => {
                let trainerRecords = [];
                [trainerRecords, totalTrainers] = await Promise.all([
                    TrainerAttendance.find(trainerQuery)
                        .populate('trainerId', 'name email phone')
                        .sort({ checkIn: -1 })
                        .skip(fetchSkip)
                        .limit(fetchLimit)
                        .lean(),
                    TrainerAttendance.countDocuments(trainerQuery)
                ]);

                // Map Trainer records to match Member structure
                trainers = trainerRecords.map(record => {
                    let duration = 0;
                    if (record.checkIn && record.checkOut) {
                        const durationMs = new Date(record.checkOut) - new Date(record.checkIn);
                        duration = Math.round(durationMs / (1000 * 60)); // minutes
                    }

                    return {
                        _id: record._id,
                        userId: record.trainerId, // Map trainerId to userId
                        userType: 'Trainer',
                        checkInTime: record.checkIn,
                        checkOutTime: record.checkOut,
                        duration: duration,
                        status: record.checkOut ? 'checked-out' : 'checked-in',
                        date: record.date,
                        checkInPhoto: record.checkInPhoto,
                        checkOutPhoto: record.checkOutPhoto
                    };
                });
            })() : Promise.resolve()
        ]);

        let combinedRecords = [];

        if (userType && userType !== 'all') {
            // If specific type, we already skipped and limited in DB
            combinedRecords = shouldFetchMembers ? members : trainers;
        } else {
            // "All" case: Merge, Sort, Slice
            combinedRecords = [...members, ...trainers];
            combinedRecords.sort((a, b) => new Date(b.checkInTime || 0).getTime() - new Date(a.checkInTime || 0).getTime());
            combinedRecords = combinedRecords.slice(skip, skip + limit);
        }

        const totalCount = totalMembers + totalTrainers;

        // Calculate statistics
        const stats = {
            totalRecords: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            recordsPerPage: limit
        };

        // Calculate aggregate stats if userId is provided (Simpler to separate implementation or keep simplistic)
        // For MVP, if userId is provided, usually userType is also known/implied, so we likely hit specific path.
        // If "All" + userId (rare?), we'd need complex aggregation.
        // Let's keep existing specific aggregation for members if userType is Member, add for Trainer.

        // If we strictly need stats for the filtered set:
        if (userId) {
            let aggregateStats = [];
            if (shouldFetchMembers && (!userType || userType === 'Member')) {
                aggregateStats = await Attendance.aggregate([
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
            } else if (shouldFetchTrainers && userType === 'Trainer') {
                // Trainer stats approximation (duration isn't stored, need to calc or use runtime?)
                // Since TrainerAttendance doesn't store 'duration' explicitly in DB (based on schema), this agg might fail or return 0.
                // We'd need to calculate it. For MVP, let's skip complex Agg for trainers or rely on client side if needed.
                // Or: assume we added duration? No, we didn't add duration field to TrainerAttendance.
                // Let's compute approx stats from the fetched records if meaningful, or just return 0s for now to avoid crashes.
                stats.totalVisits = totalTrainers;
            }

            if (aggregateStats.length > 0) {
                stats.totalVisits = aggregateStats[0].totalVisits;
                stats.totalDuration = aggregateStats[0].totalDuration || 0;
                stats.avgDuration = Math.round(aggregateStats[0].avgDuration || 0);
            }
        }

        return NextResponse.json({
            success: true,
            data: combinedRecords,
            stats
        });

    } catch (error) {
        console.error('Attendance History Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
