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
    // ============================================
    // NEW FIELDS for enhanced payment tracking
    // ============================================
    paymentCategory: {
        type: String,
        enum: ['Plan', 'Due Amount', 'Plan (Multiple)', 'Admission Fee', 'Other'],
        default: 'Plan',
    },
    transactionType: {
        type: String,
        enum: ['Credit', 'Debit'],
        default: 'Credit',
    },
    planPrice: {
        type: Number, // Original plan price (snapshot at time of payment)
        default: 0,
    },
    admissionFee: {
        type: Number,
        default: 0,
    },
    specialPlan: {
        type: String, // COUPLE, SPECIAL, SPECIAL 1-4, etc.
        default: '',
    },
    isInstallment: {
        type: Boolean,
        default: false,
    },
    installmentNumber: {
        type: Number, // 1st payment, 2nd payment, etc.
        default: 1,
    },
    receiptNumber: {
        type: String, // For generating receipts
        default: '',
    },
    membershipAction: {
        type: String,
        enum: ['new', 'renewal', 'upgrade', 'downgrade', 'extension', 'none'],
        default: 'none', // Most payments are just installments
    },
}, { timestamps: true });

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
