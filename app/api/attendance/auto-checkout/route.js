import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import TrainerAttendance from '@/models/TrainerAttendance';
import { NextResponse } from 'next/server';

// POST: Auto-checkout users at end of day
export async function POST(request) {
    await dbConnect();

    try {
        // Find all members still checked in
        const activeAttendance = await Attendance.find({
            status: 'checked-in'
        });

        // Find all trainers still checked in
        const activeTrainers = await TrainerAttendance.find({
            checkIn: { $exists: true, $ne: null },
            $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
        });

        if (activeAttendance.length === 0 && activeTrainers.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active check-ins to process',
                count: 0
            });
        }

        const memberUpdatePromises = activeAttendance.map(async (attendance) => {
            // Set checkout exactly at today's midnight (23:59:59)
            const checkoutTime = new Date(attendance.date);
            checkoutTime.setHours(23, 59, 59, 999); 
            
            attendance.checkOutTime = checkoutTime;
            attendance.status = 'checked-out';
            attendance.autoCheckedOut = true;
            attendance.calculateDuration();
            return attendance.save();
        });

        const trainerUpdatePromises = activeTrainers.map(async (record) => {
            const checkoutTime = new Date(record.date);
            checkoutTime.setHours(23, 59, 59, 999);

            record.checkOut = checkoutTime;
            record.autoCheckedOut = true;
            return record.save();
        });

        await Promise.all([...memberUpdatePromises, ...trainerUpdatePromises]);

        return NextResponse.json({
            success: true,
            message: `Auto-checked out ${activeAttendance.length} member(s) and ${activeTrainers.length} trainer(s)`,
            count: activeAttendance.length + activeTrainers.length
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
        const activeMemberCount = await Attendance.countDocuments({
            status: 'checked-in'
        });

        const activeTrainerCount = await TrainerAttendance.countDocuments({
            checkIn: { $exists: true, $ne: null },
            $or: [{ checkOut: { $exists: false } }, { checkOut: null }]
        });

        return NextResponse.json({
            success: true,
            activeCheckIns: activeMemberCount + activeTrainerCount,
            memberCheckIns: activeMemberCount,
            trainerCheckIns: activeTrainerCount,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Auto-checkout Status Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
