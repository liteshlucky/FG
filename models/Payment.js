import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: [true, 'Please provide a member'],
    },
    planType: {
        type: String,
        // Support both old and new values for backward compatibility
        enum: ['Plan', 'PTplan', 'membership', 'pt_plan'],
        required: [true, 'Please specify plan type'],
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        // Removed refPath - we'll populate manually in routes
        required: [true, 'Please provide a plan'],
    },
    amount: {
        type: Number,
        required: [true, 'Please provide payment amount'],
    },
    paymentMode: {
        type: String,
        enum: ['cash', 'card', 'upi', 'bank_transfer', 'cheque'],
        required: [true, 'Please provide payment mode'],
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    paymentStatus: {
        type: String,
        enum: ['completed', 'pending', 'failed'],
        default: 'completed',
    },
    transactionId: {
        type: String,
        default: '',
    },
    notes: {
        type: String,
        default: '',
    },
    createdBy: {
        type: String,
        default: '',
    },
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
