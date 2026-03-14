import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['info', 'warning', 'success', 'error'],
        default: 'info'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String, // Optional URL to redirect to when clicked
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // If we want to target specific admins (optional for now, gym might be single-admin)
    }
}, { timestamps: true });

// Optional: Automatically delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
