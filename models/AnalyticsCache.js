import mongoose from 'mongoose';

const AnalyticsCacheSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        default: 'ai_predictions',
        index: true
    },
    timeRange: {
        type: String,
        required: true,
        index: true // Lookups will frequently valid this
    },
    data: {
        type: Object,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 2592000 // 30 days in seconds (just in case we want a hard TTL, though we manage logic manually)
    }
});

// Composite index to speed up lookups by type and range
AnalyticsCacheSchema.index({ type: 1, timeRange: 1, createdAt: -1 });

export default mongoose.models.AnalyticsCache || mongoose.model('AnalyticsCache', AnalyticsCacheSchema);
