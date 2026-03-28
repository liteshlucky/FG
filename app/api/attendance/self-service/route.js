import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import TrainerAttendance from '@/models/TrainerAttendance';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Notification from '@/models/Notification';
import Settings from '@/models/Settings';
import { sendEmailAlert } from '@/lib/email';
import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Haversine formula — returns distance in metres between two GPS coordinates.
// Pure JS, no library needed.
// ---------------------------------------------------------------------------
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Earth radius in metres
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Resolves locationStatus string from provided coords vs gym config.
// Returns: 'verified' | 'far' | 'denied'
// ---------------------------------------------------------------------------
async function resolveLocationStatus(lat, lng) {
    if (lat == null || lng == null) return { status: 'denied', location: null };

    const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
    const gymLat = settings?.gymLocation?.lat;
    const gymLng = settings?.gymLocation?.lng;
    const radius = settings?.gymLocation?.radiusMeters ?? 100;

    // If gym coordinates not configured, can't verify — treat as denied
    if (gymLat == null || gymLng == null) {
        return { status: 'denied', location: { lat, lng } };
    }

    const distance = haversineDistance(lat, lng, gymLat, gymLng);
    const status = distance <= radius ? 'verified' : 'far';
    return { status, location: { lat, lng } };
}

// POST: Self-service check-in or check-out
export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { userId, userType, action, photoUrl, lat, lng, lockerKey } = body;

        if (!userId || !userType || !action) {
            return NextResponse.json(
                { success: false, error: 'userId, userType, and action are required' },
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

        // Trainers must provide a selfie photo — hard block
        if (userType === 'Trainer' && !photoUrl) {
            return NextResponse.json(
                { success: false, error: 'Selfie photo is required for trainer check-in/out' },
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

        // Resolve location status (soft check — never blocks attendance)
        const { status: locationStatus, location } = await resolveLocationStatus(
            lat != null ? parseFloat(lat) : null,
            lng != null ? parseFloat(lng) : null
        );

        // ============================================
        // MEMBER ATTENDANCE LOGIC — GPS only, no selfie
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
                    date: { $gte: today, $lt: tomorrow }
                });

                if (todayAttendance) {
                    return NextResponse.json(
                        { success: false, error: `${user.name} has already checked in today. Only one check-in per day is allowed.` },
                        { status: 400 }
                    );
                }

                // Create attendance record with location data (no photo for members)
                const attendance = await Attendance.create({
                    userId,
                    userType,
                    checkInTime: new Date(),
                    status: 'checked-in',
                    checkInLocation: location,
                    locationStatus,
                    ...(lockerKey ? { lockerKey } : {})
                });

                return NextResponse.json({
                    success: true,
                    message: `Welcome ${user.name}! You have been checked in successfully.`,
                    data: {
                        attendanceId: attendance._id,
                        checkInTime: attendance.checkInTime,
                        locationStatus
                    }
                });

            } else if (action === 'checkout') {
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

                attendance.checkOutTime = new Date();
                attendance.status = 'checked-out';
                attendance.checkOutLocation = location;
                // Update locationStatus to checkout's result (most recent wins)
                attendance.locationStatus = locationStatus;
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
                        duration: attendance.duration,
                        locationStatus
                    }
                });
            }
        }

        // ============================================
        // TRAINER ATTENDANCE LOGIC — Selfie + GPS
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

                // Create record with selfie photo + location
                const record = await TrainerAttendance.create({
                    trainerId: userId,
                    date: dayStart,
                    checkIn: new Date(),
                    checkInPhoto: photoUrl,
                    checkInLocation: location,
                    locationStatus,
                    status: 'present'
                });

                // Dashboard notification + email
                try {
                    const timeStr = new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                    });
                    const message = `Coach ${user.name} checked in at ${timeStr}.`;
                    await Notification.create({
                        title: 'Trainer Check-In',
                        message,
                        type: 'info',
                        link: `/dashboard/staff/${userId}`
                    });

                    const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
                    if (settings?.notificationEmails?.length > 0) {
                        const locationBadge = locationStatus === 'verified'
                            ? '✅ At Gym'
                            : locationStatus === 'far'
                                ? '⚠️ Far Location'
                                : '⚠️ No Location';
                        const htmlContent = `
                            <h2>Trainer Check-In</h2>
                            <p><strong>Coach:</strong> ${user.name}</p>
                            <p><strong>Time:</strong> ${timeStr}</p>
                            <p><strong>Location:</strong> ${locationBadge}</p>
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
                        checkInTime: record.checkIn,
                        locationStatus
                    }
                });

            } else if (action === 'checkout') {
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
                openRecord.checkOutLocation = location;
                openRecord.locationStatus = locationStatus; // Update with checkout location
                await openRecord.save();

                const durationMs = openRecord.checkOut - openRecord.checkIn;
                const totalMinutes = Math.round(durationMs / (1000 * 60));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;

                // Dashboard notification + email
                try {
                    const timeStr = new Date().toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
                    });
                    const message = `Coach ${user.name} checked out. Duration: ${hours}h ${minutes}m.`;
                    await Notification.create({
                        title: 'Trainer Check-Out',
                        message,
                        type: 'info',
                        link: `/dashboard/staff/${userId}`
                    });

                    const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
                    if (settings?.notificationEmails?.length > 0) {
                        const locationBadge = locationStatus === 'verified'
                            ? '✅ At Gym'
                            : locationStatus === 'far'
                                ? '⚠️ Far Location'
                                : '⚠️ No Location';
                        const htmlContent = `
                            <h2>Trainer Check-Out</h2>
                            <p><strong>Coach:</strong> ${user.name}</p>
                            <p><strong>Duration:</strong> ${hours}h ${minutes}m</p>
                            <p><strong>Time:</strong> ${timeStr}</p>
                            <p><strong>Location:</strong> ${locationBadge}</p>
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
                        duration: totalMinutes,
                        locationStatus
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
