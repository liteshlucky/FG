import dbConnect from '@/lib/db';
import BackupLog from '@/models/BackupLog';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Payment from '@/models/Payment';
import Plan from '@/models/Plan';
import PTplan from '@/models/PTplan';
import Discount from '@/models/Discount';
import Attendance from '@/models/Attendance';
import TrainerAttendance from '@/models/TrainerAttendance';
import TrainerPayment from '@/models/TrainerPayment';
import Transaction from '@/models/Transaction';
import User from '@/models/User';
import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ─── Email transporter using existing SMTP credentials ────────────────────────
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// ─── Collect all data from every collection ──────────────────────────────────
async function collectBackupData() {
    const [
        members, trainers, payments, plans, ptPlans,
        discounts, attendance, trainerAttendance,
        trainerPayments, transactions, users,
    ] = await Promise.all([
        Member.find({}),
        Trainer.find({}),
        Payment.find({}),
        Plan.find({}),
        PTplan.find({}),
        Discount.find({}),
        Attendance.find({}),
        TrainerAttendance.find({}),
        TrainerPayment.find({}),
        Transaction.find({}),
        User.find({}, { password: 0 }), // exclude password hashes
    ]);

    return {
        metadata: {
            backupDate: new Date().toISOString(),
            generatedBy: 'Fitness Garage Auto-Backup',
        },
        data: {
            members, trainers, payments, plans, ptPlans,
            discounts, attendance, trainerAttendance,
            trainerPayments, transactions, users,
        },
    };
}

// ─── Send backup JSON as email attachment ─────────────────────────────────────
async function sendBackupEmail(backupJson, recipientEmail) {
    const transporter = createTransporter();
    const dateStr = new Date().toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
    const fileName = `fit-app-backup-${new Date().toISOString().split('T')[0]}.json`;

    await transporter.sendMail({
        from: `"Fitness Garage Backup" <${process.env.SMTP_USER}>`,
        to: recipientEmail,
        subject: `🗄️ Daily Database Backup — ${dateStr}`,
        html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto">
                <h2 style="color:#1e293b">Daily Database Backup</h2>
                <p>Your automated database backup for <strong>${dateStr}</strong> is attached.</p>
                <table style="border-collapse:collapse;width:100%;margin-top:16px">
                    <tr style="background:#f1f5f9">
                        <td style="padding:8px 12px;font-weight:bold">File</td>
                        <td style="padding:8px 12px">${fileName}</td>
                    </tr>
                    <tr>
                        <td style="padding:8px 12px;font-weight:bold">Generated</td>
                        <td style="padding:8px 12px">${new Date().toLocaleString('en-IN')}</td>
                    </tr>
                </table>
                <p style="margin-top:24px;color:#64748b;font-size:13px">
                    This is an automated message from Fitness Garage. Do not reply.
                </p>
            </div>
        `,
        attachments: [
            {
                filename: fileName,
                content: backupJson,
                contentType: 'application/json',
            },
        ],
    });
}

// ─── Delete backup log records older than 3 days ──────────────────────────────
async function purgeOldLogs() {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const result = await BackupLog.deleteMany({ runAt: { $lt: cutoff } });
    return result.deletedCount;
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function GET(req) {
    // Allow Vercel Cron or manual trigger with a secret header
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // In production, validate the cron secret (Vercel sends it automatically)
    if (
        process.env.NODE_ENV === 'production' &&
        cronSecret &&
        authHeader !== `Bearer ${cronSecret}`
    ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const recipientEmail = process.env.BACKUP_EMAIL || process.env.SMTP_USER;
    let logEntry = null;

    try {
        // 1. Collect all data
        const backupData = await collectBackupData();
        const backupJson = JSON.stringify(backupData, null, 2);
        const sizeBytes = Buffer.byteLength(backupJson, 'utf8');

        // 2. Email the backup
        await sendBackupEmail(backupJson, recipientEmail);

        // 3. Save success log
        logEntry = await BackupLog.create({
            status: 'success',
            sentTo: recipientEmail,
            sizeBytes,
        });

        // 4. Purge logs older than 3 days
        const purgedCount = await purgeOldLogs();

        console.log(
            `✅ Auto-backup complete. Sent to ${recipientEmail}. Size: ${(sizeBytes / 1024).toFixed(1)} KB. Purged ${purgedCount} old log(s).`
        );

        return NextResponse.json({
            success: true,
            message: `Backup sent to ${recipientEmail}`,
            sizeBytes,
            purgedOldLogs: purgedCount,
        });

    } catch (error) {
        console.error('❌ Auto-backup failed:', error);

        // Save failure log
        await BackupLog.create({
            status: 'failed',
            error: error.message,
            sentTo: recipientEmail,
        }).catch(() => {}); // don't let logging failure mask the original error

        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
