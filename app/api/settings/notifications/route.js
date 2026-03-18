import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';


export const dynamic = 'force-dynamic';
export async function GET(request) {
    try {
        await dbConnect();
        // Since we only have one global settings document, find it or create default
        let settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
        
        if (!settings) {
            settings = await Settings.create({ singletonKey: 'GLOBAL_SETTINGS' });
        }
        
        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        await dbConnect();
        const { notificationEmails, preferences } = await request.json();

        // Find and update or create
        const settings = await Settings.findOneAndUpdate(
            { singletonKey: 'GLOBAL_SETTINGS' },
            { notificationEmails, preferences },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, data: settings });
    } catch (error) {
        console.error('Error updating settings:', error);
        return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
    }
}
