import dbConnect from '@/lib/db';
import TrainerAttendance from '@/models/TrainerAttendance';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
    console.log('Attendance POST params:', params);
    await dbConnect();
    const { id } = await params; // trainer id
    if (!id) {
        return NextResponse.json({ success: false, error: 'Trainer ID missing' }, { status: 400 });
    }
    try {
        const { action } = await request.json(); // 'checkin' or 'checkout'
        const today = new Date();
        const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        let record = await TrainerAttendance.findOne({ trainerId: id, date: dayStart });
        if (!record) {
            record = await TrainerAttendance.create({ trainerId: id, date: dayStart });
        }

        if (action === 'checkin') {
            if (record.checkIn) {
                return NextResponse.json({ success: false, error: 'Already checked in' }, { status: 400 });
            }
            record.checkIn = new Date();
            await record.save();
            return NextResponse.json({ success: true, data: record });
        }

        if (action === 'checkout') {
            if (!record.checkIn) {
                return NextResponse.json({ success: false, error: 'Check-in required first' }, { status: 400 });
            }
            if (record.checkOut) {
                return NextResponse.json({ success: false, error: 'Already checked out' }, { status: 400 });
            }
            record.checkOut = new Date();
            await record.save();
            return NextResponse.json({ success: true, data: record });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Attendance POST error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(request, { params }) {
    await dbConnect();
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Trainer ID missing' }, { status: 400 });
    }
    try {
        const records = await TrainerAttendance.find({ trainerId: id }).sort({ date: -1 });
        return NextResponse.json({ success: true, data: records });
    } catch (error) {
        console.error('Attendance GET error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
