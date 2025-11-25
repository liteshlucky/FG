const mongoose = require('mongoose');

const TrainerAttendanceSchema = new mongoose.Schema({
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true },
    date: { type: Date, required: true }, // start of day (UTC)
    checkIn: { type: Date },
    checkOut: { type: Date },
    status: { type: String, enum: ['present', 'absent', 'week_off'], default: 'present' },
}, { timestamps: true });

module.exports = mongoose.models.TrainerAttendance || mongoose.model('TrainerAttendance', TrainerAttendanceSchema);
