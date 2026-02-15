import mongoose from 'mongoose';
import MemberListView from './MemberListView.js';

const PlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a plan name'],
        unique: true,
    },
    price: {
        type: Number,
        required: [true, 'Please provide a plan price'],
    },
    duration: {
        type: Number, // in months
        required: [true, 'Please provide a duration in months'],
    },
    features: {
        type: [String],
        default: [],
    },
}, { timestamps: true });

// ============================================
// MIDDLEWARE: Propagate plan changes to MemberListView
// ============================================

// After save (update plan name/duration in all member list views)
PlanSchema.post('save', async function (doc) {
    try {
        const result = await MemberListView.updateMany(
            { planId: doc._id },
            {
                planName: doc.name,
                planDuration: doc.duration
            }
        );
        if (result.modifiedCount > 0) {
            console.log(`✓ Updated ${result.modifiedCount} members with new plan: ${doc.name}`);
        }
    } catch (error) {
        console.error('Failed to propagate plan changes to MemberListView:', error);
    }
});

// After update
PlanSchema.post('findOneAndUpdate', async function (doc) {
    if (doc) {
        try {
            const result = await MemberListView.updateMany(
                { planId: doc._id },
                {
                    planName: doc.name,
                    planDuration: doc.duration
                }
            );
            if (result.modifiedCount > 0) {
                console.log(`✓ Updated ${result.modifiedCount} members with updated plan: ${doc.name}`);
            }
        } catch (error) {
            console.error('Failed to propagate plan changes to MemberListView:', error);
        }
    }
});

export default mongoose.models.Plan || mongoose.model('Plan', PlanSchema);
