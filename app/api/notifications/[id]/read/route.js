import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = params;

        const notification = await Notification.findByIdAndUpdate(
            id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
