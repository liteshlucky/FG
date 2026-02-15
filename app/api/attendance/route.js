import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import TrainerAttendance from '@/models/TrainerAttendance';
import { NextResponse } from 'next/server';

// GET: Fetch today's attendance or filter by query params
export async function GET(request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const userType = searchParams.get('userType'); // 'Member' or 'Trainer'
        const status = searchParams.get('status'); // 'checked-in' or 'checked-out'
        const date = searchParams.get('date'); // YYYY-MM-DD format

        if (userType === 'Trainer') {
            // ============================================
            // TRAINER ATTENDANCE LOGIC
            // ============================================

            // Map common query params to TrainerAttendance schema
            const trainerQuery = {};
            if (date) {
                const targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                trainerQuery.date = targetDate;
            } else {
                // Default to today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                trainerQuery.date = today;
            }

            if (status === 'checked-in') {
                trainerQuery.checkIn = { $exists: true };
                trainerQuery.checkOut = { $exists: false };
            } else if (status === 'checked-out') {
                trainerQuery.checkOut = { $exists: true };
            }

            const attendanceRecords = await TrainerAttendance.find(trainerQuery)
                .populate('trainerId', 'name phone email')
                .sort({ checkIn: -1 })
                .lean();

            // Map fields to match the UI expectation (Attendance schema format)
            const mappedRecords = attendanceRecords.map(record => {
                let currentDuration = null;
                let status = 'absent';

                if (record.checkIn && !record.checkOut) {
                    status = 'checked-in';
                    const now = new Date();
                    const durationMs = now - new Date(record.checkIn);
                    currentDuration = Math.round(durationMs / (1000 * 60)); // minutes
                } else if (record.checkIn && record.checkOut) {
                    status = 'checked-out';
                    const durationMs = new Date(record.checkOut) - new Date(record.checkIn);
                    currentDuration = Math.round(durationMs / (1000 * 60)); // minutes
                }

                return {
                    _id: record._id,
                    userId: record.trainerId, // Remap trainerId to userId for UI consistency
                    userType: 'Trainer',
                    checkInTime: record.checkIn,
                    checkOutTime: record.checkOut,
                    status: status,
                    currentDuration: currentDuration,
                    date: record.date
                };
            });

            return NextResponse.json({
                success: true,
                data: mappedRecords,
                count: mappedRecords.length
            });

        } else {
            // ============================================
            // MEMBER ATTENDANCE LOGIC (Default)
            // ============================================
            const query = {};

            if (userType) {
                query.userType = userType;
            }

            if (status) {
                query.status = status;
            }

            if (date) {
                const targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                const nextDay = new Date(targetDate);
                nextDay.setDate(nextDay.getDate() + 1);

                query.date = {
                    $gte: targetDate,
                    $lt: nextDay
                };
            } else {
                // Default to today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                query.date = {
                    $gte: today,
                    $lt: tomorrow
                };
            }

            const attendanceRecords = await Attendance.find(query)
                .populate('userId', 'name email phone')
                .sort({ checkInTime: -1 })
                .lean();

            // Calculate current duration for checked-in users
            const recordsWithDuration = attendanceRecords.map(record => {
                if (record.status === 'checked-in') {
                    const now = new Date();
                    const durationMs = now - new Date(record.checkInTime);
                    record.currentDuration = Math.round(durationMs / (1000 * 60)); // minutes
                }
                return record;
            });

            return NextResponse.json({
                success: true,
                data: recordsWithDuration,
                count: recordsWithDuration.length
            });
        }

    } catch (error) {
        console.error('Attendance GET Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Create check-in record
export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { userId, userType } = body;

        if (!userId || !userType) {
            return NextResponse.json(
                { success: false, error: 'userId and userType are required' },
                { status: 400 }
            );
        }

        // Validate userType
        if (!['Member', 'Trainer'].includes(userType)) {
            return NextResponse.json(
                { success: false, error: 'userType must be either "Member" or "Trainer"' },
                { status: 400 }
            );
        }

        // Check if user exists
        const UserModel = userType === 'Member' ? Member : Trainer;
        const user = await UserModel.findById(userId);

        if (!user) {
            return NextResponse.json(
                { success: false, error: `${userType} not found` },
                { status: 404 }
            );
        }

        // Check if user is already checked in
        const isCheckedIn = await Attendance.isUserCheckedIn(userId);

        if (isCheckedIn) {
            return NextResponse.json(
                { success: false, error: `${user.name} is already checked in` },
                { status: 400 }
            );
        }

        // Create attendance record
        const attendance = await Attendance.create({
            userId,
            userType,
            checkInTime: new Date(),
            status: 'checked-in'
        });

        const populatedAttendance = await Attendance.findById(attendance._id)
            .populate('userId', 'name email phone')
            .lean();

        return NextResponse.json({
            success: true,
            data: populatedAttendance,
            message: `${user.name} checked in successfully`
        });

    } catch (error) {
        console.error('Attendance POST Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
