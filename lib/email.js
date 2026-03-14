import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends an email to multiple recipients.
 * @param {string[]} to - Array of recipient email addresses.
 * @param {string} subject - Email subject.
 * @param {string} html - HTML content of the email.
 */
export async function sendEmailAlert(to, subject, html) {
    if (!to || to.length === 0) {
        console.log('No notification emails configured, skipping email dispatch.');
        return;
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('SMTP credentials not configured, skipping email dispatch to:', to);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Fit App Notifications" <${process.env.SMTP_USER}>`,
            to: to.join(', '), // Send to multiple emails at once
            subject: subject,
            html: html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
