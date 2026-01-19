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
        console.log('Lookup Request Identifier:', identifier);

        if (!identifier) {
            return NextResponse.json(
                { success: false, error: 'Membership ID or phone number is required' },
                { status: 400 }
            );
        }

        // Normalize identifier (remove spaces, dashes) to handle "MEM 59", "MEM-59"
        const cleanIdentifier = identifier.replace(/[\s-]/g, '');

        // Check if it's numeric OR starts with MEM/TR followed by numbers
        const numericMatch = cleanIdentifier.match(/^(\d+)$/) || cleanIdentifier.match(/^(?:MEM|TR)(\d+)$/i);
        const coreNumber = numericMatch ? numericMatch[1] : null;
        const isNumericSearch = coreNumber !== null;

        // If we found a number (either pure, or extracted from MEM/TR prefix), use that for ID lookup
        // Otherwise use the original identifier for name/phone search execution
        const searchId = isNumericSearch ? coreNumber : identifier;

        // Log for debug
        console.log(`Processing: Original="${identifier}", Clean="${cleanIdentifier}", CoreNum="${coreNumber}"`);

        const isNumericOnly = isNumericSearch; // Reuse existing flag name to minimize code change ripple

        let user = null;
        let userType = 'Member';

        if (isNumericOnly) {
            // Try with MEM prefix (handling potential leading zeros)
            // Example: User types "59", we check "MEM59", "MEM059", "MEM0059"
            const queries = [
                { memberId: `MEM${searchId}` },
                { memberId: `MEM0${searchId}` },
                { memberId: `MEM00${searchId}` },
                { memberId: searchId }, // Support raw ID (e.g. "284")
                { phone: identifier } // Keep original identifier for phone check
            ];

            user = await Member.findOne({
                $or: queries
            }).select('_id name phone memberId membershipStatus status membershipEndDate').lean();

            // If not found, try with TR prefix for trainers
            if (!user) {
                const trainerQueries = [
                    { trainerId: `TR${searchId}` },
                    { trainerId: `TR0${searchId}` },
                    { trainerId: `TR00${searchId}` },
                    { phone: identifier }
                ];

                user = await Trainer.findOne({
                    $or: trainerQueries
                }).select('_id name phone trainerId').lean();

                if (user) {
                    userType = 'Trainer';
                }
            }
        } else {
            // Try to find member with full ID, phone, OR NAME regex
            user = await Member.findOne({
                $or: [
                    { memberId: identifier },
                    { phone: identifier },
                    { name: { $regex: identifier, $options: 'i' } }
                ]
            }).select('_id name phone memberId membershipStatus status membershipEndDate').lean();

            // If not found in members, try trainers
            if (!user) {
                user = await Trainer.findOne({
                    $or: [
                        { trainerId: identifier },
                        { phone: identifier },
                        { name: { $regex: identifier, $options: 'i' } }
                    ]
                }).select('_id name phone trainerId').lean();

                userType = 'Trainer';
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
        console.log('User FOUND:', user._id, user.name);

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
