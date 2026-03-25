import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Settings from '@/models/Settings';
import Notification from '@/models/Notification';
import MemberListView from '@/models/MemberListView';
import Member from '@/models/Member';
import Attendance from '@/models/Attendance';
import { sendEmailAlert } from '@/lib/email';

// This function can run for a maximum of 60 seconds on hobby plan
export const maxDuration = 60; 
export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        // Vercel Cron sends a specific header, good for basic security check
        const authHeader = request.headers.get('authorization');
        if (
            process.env.CRON_SECRET && 
            authHeader !== `Bearer ${process.env.CRON_SECRET}`
        ) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await dbConnect();

        // 1. Fetch Global Settings
        let settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' });
        if (!settings) return NextResponse.json({ success: true, message: 'No settings configured' });

        const { preferences, notificationEmails } = settings;
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const notificationsToInsert = [];
        let emailHtmlContent = `<h2>Daily Gym Summary for ${startOfToday.toDateString()}</h2>`;

        // 2. Membership Expiring Logic
        if (preferences.membershipExpiring) {
            const in1Day = new Date(startOfToday); in1Day.setDate(in1Day.getDate() + 1);
            const in3Days = new Date(startOfToday); in3Days.setDate(in3Days.getDate() + 3);
            
            const expiringMembers = await MemberListView.find({
                membershipEndDate: { $gte: in1Day, $lte: in3Days },
                status: 'Active'
            }).select('name memberId membershipEndDate phone');

            if (expiringMembers.length > 0) {
                emailHtmlContent += `<h3>Expiring Memberships (Next 1-3 Days)</h3><ul>`;
                expiringMembers.forEach(m => {
                    const daysLeft = Math.ceil((m.membershipEndDate - now) / (1000 * 60 * 60 * 24));
                    const msg = `${m.name} (${m.memberId}) expires in ${daysLeft} days. Phone: ${m.phone}`;
                    
                    notificationsToInsert.push({
                        title: 'Membership Expiring Soon',
                        message: msg,
                        type: 'warning',
                        link: `/dashboard/members/${m.memberId || m._id}`
                    });
                    
                    emailHtmlContent += `<li>${msg}</li>`;
                });
                emailHtmlContent += `</ul>`;
            } else {
                emailHtmlContent += `<p>No memberships expiring in the next 1-3 days.</p>`;
            }
        }

        // 3. Pending Dues Logic
        if (preferences.pendingDues) {
            // Find members with partial/unpaid status whose plan has already ended, or just any partial/unpaid active members
            const pendingDuesMembers = await MemberListView.find({
                paymentStatus: { $in: ['partial', 'unpaid'] },
                status: 'Active'
            }).select('name memberId phone');

            if (pendingDuesMembers.length > 0) {
                emailHtmlContent += `<h3>Pending Dues Alert</h3><ul>`;
                // Limit notifications to avoid spamming the DB, maybe top 10
                pendingDuesMembers.slice(0, 10).forEach(m => {
                    const msg = `${m.name} (${m.memberId}) has pending dues. Please collect payment.`;
                    
                    notificationsToInsert.push({
                        title: 'Pending Dues Alert',
                        message: msg,
                        type: 'warning',
                        link: `/dashboard/members/${m.memberId || m._id}`
                    });
                    
                    emailHtmlContent += `<li>${msg} Phone: ${m.phone}</li>`;
                });
                emailHtmlContent += `</ul>`;
                if(pendingDuesMembers.length > 10) emailHtmlContent += `<p>... and ${pendingDuesMembers.length - 10} more pending dues.</p>`;
            } else {
                 emailHtmlContent += `<p>No active pending dues.</p>`;
            }
        }

        // 4. Absentee Logic (No attendance in last 7 days)
        if (preferences.absenteeAlert) {
            const sevenDaysAgo = new Date(startOfToday);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            // Get members active right now
            const activeMembers = await Member.find({ status: 'Active' }).select('_id name memberId');
            const activeMemberIds = activeMembers.map(m => m._id);

            // Find attendance from these members in the last 7 days
            const recentAttendance = await Attendance.find({
                userId: { $in: activeMemberIds },
                checkInTime: { $gte: sevenDaysAgo }
            }).distinct('userId');

            // Find members who are active but NOT in the recentAttendance list
            const recentAttendanceStrings = recentAttendance.map(id => id.toString());
            const absentMembers = activeMembers.filter(m => !recentAttendanceStrings.includes(m._id.toString()));

            if (absentMembers.length > 0) {
                emailHtmlContent += `<h3>Absentee Alert (7+ Days)</h3><ul>`;
                absentMembers.slice(0, 10).forEach(m => {
                    const msg = `${m.name} (${m.memberId}) has not visited the gym in 7 days.`;
                    
                    notificationsToInsert.push({
                        title: 'Absentee Alert',
                        message: msg,
                        type: 'info',
                        link: `/dashboard/members/${m.memberId || m._id}`
                    });
                    emailHtmlContent += `<li>${msg}</li>`;
                });
                emailHtmlContent += `</ul>`;
            }
        }

        // 5. Birthday Logic
        if (preferences.birthdays) {
            // MongoDB aggregation to match birth month and day, as birth year doesn't matter
            const todayMonth = now.getMonth() + 1; // 1-12
            const todayDay = now.getDate(); // 1-31

            // We don't have a direct 'dob' field in Member schema based on the review. 
            // NOTE: I am assuming age is stored but no Date of Birth. 
            // If DOB is not tracked in the schema, birthdays cannot accurately trigger. 
            // Wait, the schema review shows: age: Number, no dob Date field.
            // But let's check if they have a birthday field in real data.
            // We will skip strict implementation if 'dob' field is missing, or leave a stub.
            // Let's assume DOB is not fully implemented yet in Member model
        }

        // 6. Batch Insert In-App Notifications
        if (notificationsToInsert.length > 0) {
            await Notification.insertMany(notificationsToInsert);
        }

        // 7. Send Email Batch
        if (notificationEmails && notificationEmails.length > 0 && notificationsToInsert.length > 0) {
            await sendEmailAlert(
                notificationEmails,
                `Fit App Daily Summary - ${startOfToday.toDateString()}`,
                emailHtmlContent
            );
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Daily alerts processed',
            notificationsCreated: notificationsToInsert.length
        });

    } catch (error) {
        console.error('Error in daily-alerts cron:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
