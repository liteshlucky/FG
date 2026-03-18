import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Notification from '@/models/Notification';


export const dynamic = 'force-dynamic';
export async function GET(request) {
    try {
        await dbConnect();
        
        // Fetch the 50 most recent notifications
        const notifications = await Notification.find({})
            .sort({ createdAt: -1 })
            .limit(50);
            
        const unreadCount = await Notification.countDocuments({ isRead: false });
        
        return NextResponse.json({ 
            success: true, 
            data: notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
    }
}
