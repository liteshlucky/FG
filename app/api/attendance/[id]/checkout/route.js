import dbConnect from '@/lib/db';
import Attendance from '@/models/Attendance';
import { NextResponse } from 'next/server';

// PUT: Check out user
export async function PUT(request, { params }) {
    await dbConnect();

    try {
        const { id } = await params;

        // Find the attendance record
        const attendance = await Attendance.findById(id);

        if (!attendance) {
            return NextResponse.json(
                { success: false, error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        if (attendance.status === 'checked-out') {
            return NextResponse.json(
                { success: false, error: 'User is already checked out' },
                { status: 400 }
            );
        }

        // Update check-out time and status
        attendance.checkOutTime = new Date();
        attendance.status = 'checked-out';

        // Calculate duration
        attendance.calculateDuration();

        await attendance.save();

        const populatedAttendance = await Attendance.findById(attendance._id)
            .populate('userId', 'name email phone')
            .lean();

        return NextResponse.json({
            success: true,
            data: populatedAttendance,
            message: 'Checked out successfully'
        });

    } catch (error) {
        console.error('Attendance Checkout Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
