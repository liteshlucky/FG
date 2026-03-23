import mongoose from 'mongoose';

/**
 * BackupLog
 * Records every automated backup run.
 * Old entries (> 3 days) are purged automatically by the cron handler.
 */
const BackupLogSchema = new mongoose.Schema({
    runAt:     { type: Date,   default: Date.now, index: true },
    status:    { type: String, enum: ['success', 'failed'], required: true },
    error:     { type: String, default: null },   // populated on failure
    sentTo:    { type: String, default: null },   // email address
    sizeBytes: { type: Number, default: 0 },      // raw JSON size in bytes
});

export default mongoose.models.BackupLog ||
    mongoose.model('BackupLog', BackupLogSchema);
