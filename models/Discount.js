import mongoose from 'mongoose';

const DiscountSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Please provide a discount code'],
        unique: true,
        uppercase: true,
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Please provide a description'],
    },
    value: {
        type: Number,
        required: [true, 'Please provide a discount value'],
        min: 0,
    },
    type: {
        type: String,
        enum: ['percentage', 'fixed'],
        default: 'percentage',
    },
    active: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

export default mongoose.models.Discount || mongoose.model('Discount', DiscountSchema);
