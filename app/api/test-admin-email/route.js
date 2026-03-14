import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import { sendEmailAlert } from '@/lib/email';

export async function GET(request) {
    try {
        await dbConnect();

        const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
        
        if (!settings || !settings.notificationEmails || settings.notificationEmails.length === 0) {
            return NextResponse.json({ success: false, message: 'No emails configured in Settings -> Notifications yet.' });
        }

        const emails = settings.notificationEmails;
        
        console.log(`Sending manual test email to configured addresses: ${emails.join(', ')}`);
        
        const htmlContent = `
            <h2>Fitness Garage Notifications Test</h2>
            <p>Hello!</p>
            <p>This is a manual test to confirm that your gym's email notification system is currently able to reach the addresses saved in your Admin Dashboard.</p>
            <p>If you are receiving this, your setup is complete and ready!</p>
        `;

        await sendEmailAlert(
            emails,
            "🛎️ Test Notification from Fitness Garage Admin",
            htmlContent
        );

        return NextResponse.json({ 
            success: true, 
            message: `Test email successfully dispatched to: ${emails.join(', ')}`
        });

    } catch (error) {
        console.error('Manual test email error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
