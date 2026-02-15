import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Attendance from '@/models/Attendance';
import TrainerAttendance from '@/models/TrainerAttendance';
import { NextResponse } from 'next/server';

// POST: Lookup user by membership ID or phone number
export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        let { identifier } = body; // Can be membership ID or phone number
        console.log('Lookup Request Identifier:', identifier);

        if (!identifier) {
            return NextResponse.json(
                { success: false, error: 'Membership ID or phone number is required' },
                { status: 400 }
            );
        }

        // Normalize identifier (remove spaces, dashes)
        const cleanIdentifier = identifier.replace(/[\s-]/g, '');

        // Check if it's numeric
        const isNumericOnly = /^\d+$/.test(cleanIdentifier);

        let user = null;
        let userType = 'Member';

        if (isNumericOnly) {
            // Search by numeric member ID or phone
            user = await Member.findOne({
                $or: [
                    { memberId: cleanIdentifier },
                    { phone: identifier }
                ]
            }).select('_id name phone memberId membershipStatus status membershipEndDate').lean();

            // If not found, try trainers
            if (!user) {
                user = await Trainer.findOne({
                    $or: [
                        { trainerId: cleanIdentifier },
                        { phone: identifier }
                    ]
                }).select('_id name phone trainerId').lean();

                if (user) {
                    userType = 'Trainer';
                }
            }
        } else {
            // Try to find member with full ID, phone, OR NAME regex
            // Priority: Member ID -> Phone -> Name
            user = await Member.findOne({
                $or: [
                    { memberId: identifier }, // Exact match
                    { memberId: cleanIdentifier }, // Clean match
                    { phone: identifier },
                    { name: { $regex: identifier, $options: 'i' } }
                ]
            }).select('_id name phone memberId membershipStatus status membershipEndDate').lean();

            // If not found in members, try trainers
            if (!user) {
                // For trainers, try exact ID, clean ID, phone, name
                // Case insensitive for ID "st9" vs "ST9"
                user = await Trainer.findOne({
                    $or: [
                        { trainerId: identifier },
                        { trainerId: cleanIdentifier },
                        { trainerId: { $regex: `^${cleanIdentifier}$`, $options: 'i' } }, // Case insensitive ID
                        { phone: identifier },
                        { name: { $regex: identifier, $options: 'i' } }
                    ]
                }).select('_id name phone trainerId').lean();

                if (user) {
                    userType = 'Trainer';
                }
            }
        }

        if (isNumericOnly) {
            console.log('Strategy: Numeric Search');
        } else {
            console.log('Strategy: Text/Full ID Search');
        }

        if (!user) {
            console.log('User NOT found for identifier:', identifier);
            return NextResponse.json(
                { success: false, error: 'User not found. Please check your ID or phone number.' },
                { status: 404 }
            );
        }
        console.log('User FOUND:', user._id, user.name, userType);

        // Check current attendance status
        let isCheckedIn = false;
        let hasCheckedInToday = false;
        let currentDuration = null;
        let activeAttendanceId = null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (userType === 'Member') {
            const activeAttendance = await Attendance.findOne({
                userId: user._id,
                status: 'checked-in'
            });

            isCheckedIn = activeAttendance !== null;
            activeAttendanceId = activeAttendance?._id;

            if (isCheckedIn && activeAttendance) {
                const now = new Date();
                const durationMs = now - new Date(activeAttendance.checkInTime);
                currentDuration = Math.round(durationMs / (1000 * 60)); // minutes
            }

            const todayAttendance = await Attendance.findOne({
                userId: user._id,
                date: {
                    $gte: today,
                    $lt: tomorrow
                }
            });

            hasCheckedInToday = todayAttendance !== null;

        } else if (userType === 'Trainer') {
            // Check TrainerAttendance
            const todayRecord = await TrainerAttendance.findOne({
                trainerId: user._id,
                date: today
            });

            if (todayRecord) {
                hasCheckedInToday = !!todayRecord.checkIn;

                if (todayRecord.checkIn && !todayRecord.checkOut) {
                    isCheckedIn = true;
                    activeAttendanceId = todayRecord._id;

                    const now = new Date();
                    const durationMs = now - new Date(todayRecord.checkIn);
                    currentDuration = Math.round(durationMs / (1000 * 60)); // minutes
                } else if (todayRecord.checkIn && todayRecord.checkOut) {
                    isCheckedIn = false;
                }
            } else {
                hasCheckedInToday = false;
                isCheckedIn = false;
            }
        }

        // Calculate membership expiry info for members
        let membershipExpired = false;
        let daysUntilExpiry = null;
        let membershipEndDate = null;

        if (userType === 'Member' && user.membershipEndDate) {
            membershipEndDate = user.membershipEndDate;
            const now = new Date();
            const endDate = new Date(user.membershipEndDate);
            const diffTime = endDate.getTime() - now.getTime();
            daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            membershipExpired = daysUntilExpiry < 0;
        } else if (userType === 'Member' && user.status === 'Expired') {
            membershipExpired = true;
        }

        return NextResponse.json({
            success: true,
            data: {
                userId: user._id,
                name: user.name,
                phone: user.phone,
                identifier: user.memberId || user.trainerId,
                userType,
                membershipStatus: user.membershipStatus || 'active',
                status: user.status,
                membershipEndDate,
                daysUntilExpiry,
                membershipExpired,
                isCheckedIn,
                currentDuration,
                attendanceId: activeAttendanceId,
                hasCheckedInToday
            }
        });

    } catch (error) {
        console.error('User Lookup Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
