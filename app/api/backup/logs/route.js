import dbConnect from '@/lib/db';
import BackupLog from '@/models/BackupLog';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/backup/logs
 * Returns the 10 most recent backup log entries for the Settings UI.
 */
export async function GET() {
    await dbConnect();
    try {
        const logs = await BackupLog.find({})
            .sort({ runAt: -1 })
            .limit(10)
            .lean();

        return NextResponse.json({ success: true, logs });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
