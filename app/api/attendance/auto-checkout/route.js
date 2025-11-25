import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import { NextResponse } from 'next/server';

// POST: Auto-checkout users at end of day
export async function POST(request) {
    await dbConnect();

    try {
        // Find all users still checked in
        const activeAttendance = await Attendance.find({
            status: 'checked-in'
        });

        if (activeAttendance.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active check-ins to process',
                count: 0
            });
        }

        // Auto-checkout all active users
        const checkoutTime = new Date();
        checkoutTime.setHours(23, 59, 59, 999); // Set to end of day

        const updatePromises = activeAttendance.map(async (attendance) => {
            attendance.checkOutTime = checkoutTime;
            attendance.status = 'checked-out';
            attendance.calculateDuration();
            return attendance.save();
        });

        await Promise.all(updatePromises);

        return NextResponse.json({
            success: true,
            message: `Auto-checked out ${activeAttendance.length} user(s)`,
            count: activeAttendance.length
        });

    } catch (error) {
        console.error('Auto-checkout Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// GET: Check status of auto-checkout (for cron monitoring)
export async function GET(request) {
    await dbConnect();

    try {
        const activeCount = await Attendance.countDocuments({
            status: 'checked-in'
        });

        return NextResponse.json({
            success: true,
            activeCheckIns: activeCount,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Auto-checkout Status Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
