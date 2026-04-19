import mongoose from 'mongoose';

/**
 * LinkedProfile — Represents a relationship between two members.
 *
 * Links can be created by:
 *   - Admin (source: 'admin') — active immediately
 *   - Auto-linking (source: 'auto') — becomes active after bulkCheckinCount >= 3
 *
 * The relationship field describes the connection (buddy, spouse, family, etc.).
 * Auto-linked profiles default to 'buddy'.
 */
const linkedProfileSchema = new mongoose.Schema({
    // The member who initiates / is the "from" side
    memberA: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    // The member who is the "to" side
    memberB: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true
    },
    // Relationship label
    relationship: {
        type: String,
        enum: ['buddy', 'spouse', 'family', 'friend', 'other'],
        default: 'buddy'
    },
    // How this link was created
    source: {
        type: String,
        enum: ['admin', 'auto'],
        default: 'auto'
    },
    // Number of times memberA has bulk-checked-in memberB (for auto-link threshold)
    bulkCheckinCount: {
        type: Number,
        default: 0
    },
    // Whether this link is active (shown as suggestion)
    // Admin links: active immediately. Auto links: active after threshold.
    active: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Unique compound index — only one link per pair in each direction
linkedProfileSchema.index({ memberA: 1, memberB: 1 }, { unique: true });

// Query indexes for fetching a member's linked profiles
linkedProfileSchema.index({ memberA: 1, active: 1 });
linkedProfileSchema.index({ memberB: 1, active: 1 });

const LinkedProfile = mongoose.models.LinkedProfile || mongoose.model('LinkedProfile', linkedProfileSchema);

export default LinkedProfile;
