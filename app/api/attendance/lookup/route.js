import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Attendance from '@/models/Attendance';
import { NextResponse } from 'next/server';

// POST: Lookup user by membership ID or phone number
export async function POST(request) {
    await dbConnect();

    try {
        const body = await request.json();
        let { identifier } = body; // Can be membership ID or phone number

        if (!identifier) {
            return NextResponse.json(
                { success: false, error: 'Membership ID or phone number is required' },
                { status: 400 }
            );
        }

        // If identifier is numeric only, try to find by adding prefixes
        const isNumericOnly = /^\d+$/.test(identifier);

        let user = null;
        let userType = 'Member';

        if (isNumericOnly) {
            // Try with MEM prefix first
            user = await Member.findOne({
                memberId: `MEM${identifier}`
            }).select('_id name phone memberId membershipStatus status membershipEndDate').lean();

            // If not found, try with TR prefix for trainers
            if (!user) {
                user = await Trainer.findOne({
                    trainerId: `TR${identifier}`
                }).select('_id name phone trainerId').lean();

                if (user) {
                    userType = 'Trainer';
                }
            }
        } else {
            // Try to find member with full ID or phone
            user = await Member.findOne({
                $or: [
                    { memberId: identifier },
                    { phone: identifier }
                ]
            }).select('_id name phone memberId membershipStatus status membershipEndDate').lean();

            // If not found in members, try trainers
            if (!user) {
                user = await Trainer.findOne({
                    $or: [
                        { trainerId: identifier },
                        { phone: identifier }
                    ]
                }).select('_id name phone trainerId').lean();

                userType = 'Trainer';
            }
        }

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found. Please check your ID or phone number.' },
                { status: 404 }
            );
        }

        // Check current attendance status
        const activeAttendance = await Attendance.findOne({
            userId: user._id,
            status: 'checked-in'
        });

        const isCheckedIn = activeAttendance !== null;
        let currentDuration = null;

        if (isCheckedIn && activeAttendance) {
            const now = new Date();
            const durationMs = now - new Date(activeAttendance.checkInTime);
            currentDuration = Math.round(durationMs / (1000 * 60)); // minutes
        }

        // Check if user has already checked in today (even if checked out)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAttendance = await Attendance.findOne({
            userId: user._id,
            date: {
                $gte: today,
                $lt: tomorrow
            }
        });

        const hasCheckedInToday = todayAttendance !== null;

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
                attendanceId: activeAttendance?._id,
                hasCheckedInToday
            }
        });

    } catch (error) {
        console.error('User Lookup Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
