import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userType'
    },
    userType: {
        type: String,
        required: true,
        enum: ['Member', 'Trainer']
    },
    checkInTime: {
        type: Date,
        required: true,
        default: Date.now
    },
    checkOutTime: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // Duration in minutes
        default: null
    },
    date: {
        type: Date,
        required: true,
        default: () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today;
        }
    },
    status: {
        type: String,
        enum: ['checked-in', 'checked-out'],
        default: 'checked-in'
    },
    checkInPhoto: {
        type: String,
        default: null
    },
    checkOutPhoto: {
        type: String,
        default: null
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
attendanceSchema.index({ userId: 1, date: 1 }); // Compound index for user's daily attendance
attendanceSchema.index({ userType: 1, status: 1 }); // For filtering active sessions
attendanceSchema.index({ date: 1 }); // For date range queries
attendanceSchema.index({ status: 1 }); // For active session lookups

// Virtual for user details
attendanceSchema.virtual('user', {
    refPath: 'userType',
    localField: 'userId',
    foreignField: '_id',
    justOne: true
});

// Method to calculate duration
attendanceSchema.methods.calculateDuration = function () {
    if (this.checkOutTime && this.checkInTime) {
        const durationMs = this.checkOutTime - this.checkInTime;
        this.duration = Math.round(durationMs / (1000 * 60)); // Convert to minutes
    }
    return this.duration;
};

// Static method to check if user is currently checked in
attendanceSchema.statics.isUserCheckedIn = async function (userId) {
    const activeSession = await this.findOne({
        userId,
        status: 'checked-in'
    });
    return activeSession !== null;
};

// Static method to get active session for user
attendanceSchema.statics.getActiveSession = async function (userId) {
    return await this.findOne({
        userId,
        status: 'checked-in'
    });
};

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

export default Attendance;
