const mongoose = require('mongoose');

const TrainerAttendanceSchema = new mongoose.Schema({
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
    date: { type: Date, required: true }, // start of day (UTC)
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { type: String, enum: ['present', 'absent', 'week_off'], default: 'present' },
    checkInPhoto: { type: String },
    checkOutPhoto: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.TrainerAttendance || mongoose.model('TrainerAttendance', TrainerAttendanceSchema);
