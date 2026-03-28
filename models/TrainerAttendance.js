const mongoose = require('mongoose');

const TrainerAttendanceSchema = new mongoose.Schema({
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
    date: { type: Date, required: true }, // start of day (UTC)
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { type: String, enum: ['present', 'absent', 'week_off'], default: 'present' },
    // Selfie photos — mandatory for trainers
    checkInPhoto: { type: String },
    checkOutPhoto: { type: String },
    // GPS location — soft check, captured alongside selfie
    checkInLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    checkOutLocation: {
        lat: { type: Number, default: null },
        lng: { type: Number, default: null }
    },
    locationStatus: {
        type: String,
        enum: ['verified', 'far', 'denied', 'unknown'],
        default: 'unknown'
    },
    autoCheckedOut: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.models.TrainerAttendance || mongoose.model('TrainerAttendance', TrainerAttendanceSchema);
