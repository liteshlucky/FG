import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import TrainerAttendance from '@/models/TrainerAttendance';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import { NextResponse } from 'next/server';

// POST: Self-service check-in or check-out
export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { userId, userType, action, photoUrl } = body; // action: 'checkin' or 'checkout', photoUrl: Cloudinary URL

        if (!userId || !userType || !action) {
            return NextResponse.json(
                { success: false, error: 'userId, userType, and action are required' },
                { status: 400 }
            );
        }

        if (!photoUrl) {
            return NextResponse.json(
                { success: false, error: 'Photo verification is required' },
                { status: 400 }
            );
        }

        // Validate userType
        if (!['Member', 'Trainer'].includes(userType)) {
            return NextResponse.json(
                { success: false, error: 'Invalid user type' },
                { status: 400 }
            );
        }

        // Verify user exists
        const UserModel = userType === 'Member' ? Member : Trainer;
        const user = await UserModel.findById(userId);

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // ============================================
        // MEMBER ATTENDANCE LOGIC
        // ============================================
        if (userType === 'Member') {
            if (action === 'checkin') {
                // Check if already checked in
                const existingAttendance = await Attendance.findOne({
                    userId,
                    status: 'checked-in'
                });

                if (existingAttendance) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} is already checked in` },
                        { status: 400 }
                    );
                }

                // Check if user has already checked in today (even if checked out)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const todayAttendance = await Attendance.findOne({
                    userId,
                    date: {
                        $gte: today,
                        $lt: tomorrow
                    }
                });

                if (todayAttendance) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} has already checked in today. Only one check-in per day is allowed.` },
                        { status: 400 }
                    );
                }

                // Create new attendance record with photo
                console.log('📸 Creating attendance with photo URL:', photoUrl);
                const attendance = await Attendance.create({
                    userId,
                    userType,
                    checkInTime: new Date(),
                    status: 'checked-in',
                    checkInPhoto: photoUrl
                });

                console.log('✅ Attendance created:', attendance._id, 'Photo:', attendance.checkInPhoto);

                return NextResponse.json({
                    success: true,
                    message: `Welcome ${user.name}! You have been checked in successfully.`,
                    data: {
                        attendanceId: attendance._id,
                        checkInTime: attendance.checkInTime
                    }
                });

            } else if (action === 'checkout') {
                // Find active attendance record
                const attendance = await Attendance.findOne({
                    userId,
                    status: 'checked-in'
                });

                if (!attendance) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} is not currently checked in` },
                        { status: 400 }
                    );
                }

                // Update attendance record with checkout photo
                attendance.checkOutTime = new Date();
                attendance.status = 'checked-out';
                attendance.checkOutPhoto = photoUrl;
                attendance.calculateDuration();
                await attendance.save();

                const hours = Math.floor(attendance.duration / 60);
                const minutes = attendance.duration % 60;

                return NextResponse.json({
                    success: true,
                    message: `Goodbye ${user.name}! You have been checked out. Time spent: ${hours}h ${minutes}m`,
                    data: {
                        attendanceId: attendance._id,
                        checkOutTime: attendance.checkOutTime,
                        duration: attendance.duration
                    }
                });
            }
        }

        // ============================================
        // TRAINER ATTENDANCE LOGIC
        // ============================================
        else if (userType === 'Trainer') {
            const today = new Date();
            const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            // Determine check-in/out logic for TrainerAttendance
            let record = await TrainerAttendance.findOne({ trainerId: userId, date: dayStart });

            if (action === 'checkin') {
                // If record exists and has checkIn, fail (already in)
                if (record && record.checkIn) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} is already checked in for today.` },
                        { status: 400 }
                    );
                }

                if (!record) {
                    record = await TrainerAttendance.create({
                        trainerId: userId,
                        date: dayStart,
                        checkIn: new Date(),
                        checkInPhoto: photoUrl,
                        status: 'present'
                    });
                } else {
                    // This case shouldn't strictly happen if we check validity well, but if record exists without checkIn (maybe created by admin as absent/leave?)
                    record.checkIn = new Date();
                    record.checkInPhoto = photoUrl;
                    record.status = 'present'; // Override typical status if they show up
                    await record.save();
                }

                return NextResponse.json({
                    success: true,
                    message: `Welcome Coach ${user.name}! You have been checked in.`,
                    data: {
                        attendanceId: record._id,
                        checkInTime: record.checkIn
                    }
                });

            } else if (action === 'checkout') {
                if (!record || !record.checkIn) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} is not checked in for today.` },
                        { status: 400 }
                    );
                }

                if (record.checkOut) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} has already checked out.` },
                        { status: 400 }
                    );
                }

                record.checkOut = new Date();
                record.checkOutPhoto = photoUrl;
                await record.save();

                const durationMs = record.checkOut - record.checkIn;
                const totalMinutes = Math.round(durationMs / (1000 * 60));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;

                return NextResponse.json({
                    success: true,
                    message: `Goodbye Coach ${user.name}! You have been checked out. Time spent: ${hours}h ${minutes}m`,
                    data: {
                        attendanceId: record._id,
                        checkOutTime: record.checkOut,
                        duration: totalMinutes
                    }
                });
            }
        }

        return NextResponse.json(
            { success: false, error: 'Invalid action or user type' },
            { status: 400 }
        );

    } catch (error) {
        console.error('Self-Service Attendance Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
