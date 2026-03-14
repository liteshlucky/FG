import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';

export async function PUT(request) {
    try {
        await dbConnect();
        
        await Notification.updateMany({ isRead: false }, { isRead: true });

        return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
