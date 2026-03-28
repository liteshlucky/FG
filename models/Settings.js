import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
    // Only one settings document should exist, we can enforce a singleton pattern later
    singletonKey: {
        type: String,
        default: 'GLOBAL_SETTINGS',
        unique: true
    },
    notificationEmails: {
        type: [String],
        default: []
    },
    preferences: {
        membershipExpiring: { type: Boolean, default: true },
        pendingDues: { type: Boolean, default: true },
        paymentReceived: { type: Boolean, default: true },
        absenteeAlert: { type: Boolean, default: true },
        birthdays: { type: Boolean, default: true },
        newMember: { type: Boolean, default: true },
    },
    // Gym GPS location for attendance verification
    gymLocation: {
        lat:          { type: Number, default: null },
        lng:          { type: Number, default: null },
        radiusMeters: { type: Number, default: 100 }  // Default 100m radius
    }
}, { timestamps: true });

export default mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
