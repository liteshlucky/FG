import mongoose from 'mongoose';

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

export default mongoose.models.Plan || mongoose.model('Plan', PlanSchema);
