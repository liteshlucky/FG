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
    totalPaid: {
        type: Number,
        default: 0,
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'partial', 'unpaid'],
        default: 'unpaid',
    },
}, { timestamps: true });

export default mongoose.models.Member || mongoose.model('Member', MemberSchema);
