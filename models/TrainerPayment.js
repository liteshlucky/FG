import mongoose from 'mongoose';

const TrainerPaymentSchema = new mongoose.Schema({
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainer',
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    baseSalary: {
        type: Number,
        default: 0,
    },
    commissionAmount: {
        type: Number,
        default: 0,
    },
    month: {
        type: String, // e.g., "November"
        required: true,
    },
    year: {
        type: Number, // e.g., 2025
        required: true,
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    paymentMode: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'upi'],
        default: 'bank_transfer',
    },
    status: {
        type: String,
        enum: ['paid', 'pending'],
        default: 'paid',
    },
    notes: {
        type: String,
        default: '',
    },
}, { timestamps: true });

export default mongoose.models.TrainerPayment || mongoose.model('TrainerPayment', TrainerPaymentSchema);
