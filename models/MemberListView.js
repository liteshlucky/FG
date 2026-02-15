import mongoose from 'mongoose';

/**
 * MemberListView - Materialized view for fast member list queries
 * This is a denormalized, lightweight version of Member model
 * containing only fields needed for the members list table.
 * 
 * Automatically synced via Member model middleware.
 */
const MemberListViewSchema = new mongoose.Schema({
    _id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    memberId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Pending'],
        default: 'Active'
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'partial', 'unpaid'],
        default: 'unpaid'
    },
    // Denormalized plan data (from Plan collection)
    planName: {
        type: String,
        default: 'No Plan'
    },
    planDuration: {
        type: Number
    },
    membershipStartDate: {
        type: Date
    },
    membershipEndDate: {
        type: Date
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    profilePicture: {
        type: String,
        default: ''
    },
    // Reference IDs (not populated, just stored for reference)
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan'
    },
    ptPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PTplan'
    },
    discountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discount'
    }
}, {
    timestamps: true,
    collection: 'memberlistviews'
});

// Indexes for fast queries and sorting
MemberListViewSchema.index({ name: 1 });
MemberListViewSchema.index({ email: 1 });
MemberListViewSchema.index({ phone: 1 });
MemberListViewSchema.index({ memberId: 1 });
MemberListViewSchema.index({ status: 1 });
MemberListViewSchema.index({ membershipEndDate: 1 });
MemberListViewSchema.index({ joinDate: -1 });
MemberListViewSchema.index({ paymentStatus: 1 });
MemberListViewSchema.index({ membershipStartDate: 1 });
MemberListViewSchema.index({ ptPlanId: 1 });
MemberListViewSchema.index({ planId: 1 });

// Compound indexes for common query patterns
MemberListViewSchema.index({ status: 1, membershipEndDate: 1 });
MemberListViewSchema.index({ status: 1, joinDate: -1 });

// Text index for search
MemberListViewSchema.index({ name: 'text', email: 'text' });

export default mongoose.models.MemberListView || mongoose.model('MemberListView', MemberListViewSchema);
