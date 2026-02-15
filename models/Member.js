import mongoose from 'mongoose';
import MemberListView from './MemberListView.js';

const MemberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
    },
    phone: {
        type: String,
        required: [true, 'Please provide a phone number'],
    },
    joinDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Pending'],
        default: 'Active',
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Plan',
    },
    discountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discount',
    },
    ptPlanId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PTplan',
    },
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainer',
    },
    totalPaid: {
        type: Number,
        default: 0,
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'partial', 'unpaid'],
        default: 'unpaid',
    },
    memberId: {
        type: String,
        unique: true,
    },
    age: {
        type: Number,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
    },
    bodyMeasurements: {
        height: Number, // cm
        weight: Number, // kg
        chest: Number, // in
        waist: Number, // in
        hips: Number, // in
        arms: Number, // in
        thighs: Number, // in
    },
    medicalHistory: {
        type: String,
    },
    goals: {
        type: String,
    },
    dietaryPreferences: {
        type: [String],
        default: [],
    },
    allergies: {
        type: String,
        default: '',
    },
    aiAnalysis: {
        dietPlan: {
            generatedAt: Date,
            breakfast: [String],
            midMorningSnack: [String],
            lunch: [String],
            eveningSnack: [String],
            dinner: [String],
            notes: String,
            calories: Number,
            macros: {
                protein: Number,
                carbs: Number,
                fats: Number,
            },
        },
        workoutPlan: {
            generatedAt: Date,
            weeklySchedule: [{
                day: String,
                focus: String,
                exercises: [{
                    name: String,
                    sets: Number,
                    reps: String,
                    rest: String,
                    notes: String,
                }],
                duration: Number,
                warmup: String,
                cooldown: String,
            }],
            notes: String,
        },
    },
    profilePicture: {
        type: String,
        default: '',
    },
    membershipStartDate: {
        type: Date,
    },
    membershipEndDate: {
        type: Date,
    },
    // ============================================
    // NEW FIELDS for payment tracking
    // ============================================
    totalPlanPrice: {
        type: Number, // Total price of current plan (snapshot)
        default: 0,
    },
    admissionFeePaid: {
        type: Boolean,
        default: false,
    },
    admissionFeeAmount: {
        type: Number,
        default: 0,
    },
    lastPaymentDate: {
        type: Date,
    },
    lastPaymentAmount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

// ============================================
// VIRTUALS
// ============================================

// Virtual: Current balance (CALCULATED, not stored)
MemberSchema.virtual('currentBalance').get(function () {
    const totalDue = (this.totalPlanPrice || 0) + (this.admissionFeeAmount || 0);
    return Math.max(0, totalDue - (this.totalPaid || 0));
});

// Virtual: Payment completion percentage
MemberSchema.virtual('paymentCompletionPercentage').get(function () {
    const totalDue = (this.totalPlanPrice || 0) + (this.admissionFeeAmount || 0);
    if (totalDue === 0) return 0;
    return Math.round(((this.totalPaid || 0) / totalDue) * 100);
});

// Virtual: Days until expiration
MemberSchema.virtual('daysUntilExpiration').get(function () {
    if (!this.membershipEndDate) return null;
    const today = new Date();
    // Reset time part for accurate day calculation
    const todayNoTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDateNoTime = new Date(this.membershipEndDate.getFullYear(), this.membershipEndDate.getMonth(), this.membershipEndDate.getDate());

    const diffTime = endDateNoTime - todayNoTime;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual: Is membership expiring soon (within 7 days)
MemberSchema.virtual('isExpiringSoon').get(function () {
    const days = this.daysUntilExpiration;
    // Check if days is valid number (not null/undefined)
    if (typeof days !== 'number') return false;
    return days <= 7 && days >= 0;
});

// Ensure virtuals are included when converting to JSON/Object
MemberSchema.set('toJSON', { virtuals: true });
MemberSchema.set('toObject', { virtuals: true });

// Indexes for better performance
// MemberSchema.index({ name: 1 }); // Already indexed by schema definition if unique, but explicit is fine unless duplicate
// MemberSchema.index({ email: 1 }); // Duplicate: unique: true creates an index
// MemberSchema.index({ phone: 1 }); // Indexed by schema? No, explicit needed.
// MemberSchema.index({ memberId: 1 }); // Duplicate: unique: true creates an index
MemberSchema.index({ name: 1 });
MemberSchema.index({ phone: 1 });
MemberSchema.index({ status: 1 });
MemberSchema.index({ status: 1, membershipEndDate: 1 }); // For expiration checks

// ============================================
// MIDDLEWARE: Auto-sync MemberListView
// ============================================

/**
 * Helper function to sync Member data to MemberListView
 */
async function syncToListView(member) {
    try {
        // Populate planId to get plan details
        if (member.planId && !member.planId.name) {
            await member.populate('planId');
        }

        const listViewData = {
            _id: member._id,
            memberId: member.memberId,
            name: member.name,
            email: member.email,
            phone: member.phone,
            status: member.status,
            paymentStatus: member.paymentStatus,
            planName: member.planId?.name || 'No Plan',
            planDuration: member.planId?.duration,
            planId: member.planId?._id || member.planId,
            membershipStartDate: member.membershipStartDate,
            membershipEndDate: member.membershipEndDate,
            joinDate: member.joinDate,
            profilePicture: member.profilePicture,
            ptPlanId: member.ptPlanId,
            discountId: member.discountId
        };

        await MemberListView.findByIdAndUpdate(
            member._id,
            listViewData,
            { upsert: true, new: true }
        );

        console.log(`✓ Synced MemberListView for member: ${member.memberId}`);
    } catch (error) {
        console.error('Failed to sync MemberListView:', error);
        // Don't throw - we don't want to break the main operation
    }
}

// After save (handles both create and update via save())
MemberSchema.post('save', async function (doc) {
    await syncToListView(doc);
});

// After findOneAndUpdate
MemberSchema.post('findOneAndUpdate', async function (doc) {
    if (doc) {
        await syncToListView(doc);
    }
});

// After updateOne
MemberSchema.post('updateOne', async function () {
    try {
        const docId = this.getQuery()._id;
        if (docId) {
            const member = await this.model.findById(docId);
            if (member) {
                await syncToListView(member);
            }
        }
    } catch (error) {
        console.error('Failed to sync after updateOne:', error);
    }
});

// After delete operations
MemberSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        try {
            await MemberListView.findByIdAndDelete(doc._id);
            console.log(`✓ Deleted MemberListView for member: ${doc.memberId}`);
        } catch (error) {
            console.error('Failed to delete from MemberListView:', error);
        }
    }
});

MemberSchema.post('deleteOne', async function (doc) {
    if (doc) {
        try {
            await MemberListView.findByIdAndDelete(doc._id);
            console.log(`✓ Deleted MemberListView for member: ${doc.memberId}`);
        } catch (error) {
            console.error('Failed to delete from MemberListView:', error);
        }
    }
});

export default mongoose.models.Member || mongoose.model('Member', MemberSchema);
