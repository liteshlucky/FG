import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import TrainerAttendance from '@/models/TrainerAttendance';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Notification from '@/models/Notification';
import Settings from '@/models/Settings';
import { sendEmailAlert } from '@/lib/email';
import { NextResponse } from 'next/server';

// POST: Self-service check-in or check-out
export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { userId, userType, action, photoUrl, lockerKey } = body; // action: 'checkin' or 'checkout', photoUrl: Cloudinary URL

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
                    checkInPhoto: photoUrl,
                    ...(lockerKey ? { lockerKey } : {})  // Optional locker key
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

            if (action === 'checkin') {
                // Check if they have an active open check-in
                const openRecord = await TrainerAttendance.findOne({ 
                    trainerId: userId, 
                    date: dayStart, 
                    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
                });

                if (openRecord && openRecord.checkIn) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} is already checked in.` },
                        { status: 400 }
                    );
                }

                // Create a new record for every check-in!
                const record = await TrainerAttendance.create({
                    trainerId: userId,
                    date: dayStart,
                    checkIn: new Date(),
                    checkInPhoto: photoUrl,
                    status: 'present'
                });

                // Create a dashboard notification
                try {
                    const message = `Coach ${user.name} checked in at ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`;
                    await Notification.create({
                        title: 'Trainer Check-In',
                        message: message,
                        type: 'info',
                        link: `/dashboard/staff/${userId}`
                    });

                    // Send Email Alert
                    const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
                    if (settings && settings.notificationEmails && settings.notificationEmails.length > 0) {
                        const htmlContent = `
                            <h2>Trainer Check-In</h2>
                            <p><strong>Coach:</strong> ${user.name}</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                            <br/>
                            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/staff/${userId}">View Profile</a></p>
                        `;
                        await sendEmailAlert(settings.notificationEmails, `✅ ${user.name} checked in`, htmlContent);
                    }
                } catch (notifErr) {
                    console.error('Failed to create notification/email', notifErr);
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
                // Find the currently open record 
                const openRecord = await TrainerAttendance.findOne({
                    trainerId: userId,
                    date: dayStart,
                    $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
                });

                if (!openRecord || !openRecord.checkIn) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} is not checked in right now.` },
                        { status: 400 }
                    );
                }

                openRecord.checkOut = new Date();
                openRecord.checkOutPhoto = photoUrl;
                await openRecord.save();

                const durationMs = openRecord.checkOut - openRecord.checkIn;
                const totalMinutes = Math.round(durationMs / (1000 * 60));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;

                // Create a dashboard notification
                try {
                    const message = `Coach ${user.name} checked out. Duration: ${hours}h ${minutes}m.`;
                    await Notification.create({
                        title: 'Trainer Check-Out',
                        message: message,
                        type: 'info',
                        link: `/dashboard/staff/${userId}`
                    });

                    // Send Email Alert
                    const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
                    if (settings && settings.notificationEmails && settings.notificationEmails.length > 0) {
                        const htmlContent = `
                            <h2>Trainer Check-Out</h2>
                            <p><strong>Coach:</strong> ${user.name}</p>
                            <p><strong>Duration:</strong> ${hours}h ${minutes}m</p>
                            <p><strong>Time:</strong> ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                            <br/>
                            <p><a href="${process.env.NEXTAUTH_URL}/dashboard/staff/${userId}">View Profile</a></p>
                        `;
                        await sendEmailAlert(settings.notificationEmails, `👋 ${user.name} checked out`, htmlContent);
                    }
                } catch (notifErr) {
                    console.error('Failed to create notification/email', notifErr);
                }

                return NextResponse.json({
                    success: true,
                    message: `Goodbye Coach ${user.name}! You have been checked out. Time spent: ${hours}h ${minutes}m`,
                    data: {
                        attendanceId: openRecord._id,
                        checkOutTime: openRecord.checkOut,
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
