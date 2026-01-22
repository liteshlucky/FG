import mongoose from 'mongoose';

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
}, { timestamps: true });

// Indexes for better performance
// MemberSchema.index({ name: 1 }); // Already indexed by schema definition if unique, but explicit is fine unless duplicate
// MemberSchema.index({ email: 1 }); // Duplicate: unique: true creates an index
// MemberSchema.index({ phone: 1 }); // Indexed by schema? No, explicit needed.
// MemberSchema.index({ memberId: 1 }); // Duplicate: unique: true creates an index
MemberSchema.index({ name: 1 });
MemberSchema.index({ phone: 1 });
MemberSchema.index({ status: 1 });
MemberSchema.index({ status: 1, membershipEndDate: 1 }); // For expiration checks

export default mongoose.models.Member || mongoose.model('Member', MemberSchema);
