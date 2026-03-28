import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';

export const dynamic = 'force-dynamic';

// GET — fetch current gym location config
export async function GET() {
    try {
        await dbConnect();
        let settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
        if (!settings) {
            settings = await Settings.create({ singletonKey: 'GLOBAL_SETTINGS' });
        }
        return NextResponse.json({ success: true, data: settings.gymLocation });
    } catch (error) {
        console.error('Error fetching gym location:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch gym location' }, { status: 500 });
    }
}

// PUT — update gym location
export async function PUT(request) {
    try {
        await dbConnect();
        const { lat, lng, radiusMeters } = await request.json();

        const settings = await Settings.findOneAndUpdate(
            { singletonKey: 'GLOBAL_SETTINGS' },
            { gymLocation: { lat: lat ?? null, lng: lng ?? null, radiusMeters: radiusMeters ?? 100 } },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, data: settings.gymLocation });
    } catch (error) {
        console.error('Error updating gym location:', error);
        return NextResponse.json({ success: false, error: 'Failed to update gym location' }, { status: 500 });
    }
}
