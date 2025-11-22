import mongoose from 'mongoose';

const PTplanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a PT plan name'],
    },
    price: {
        type: Number,
        required: [true, 'Please provide a price'],
    },
    sessions: {
        type: Number,
        required: [true, 'Please provide number of sessions'],
    },
    trainerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainer',
        required: [true, 'Please assign a trainer'],
    },
    specialization: {
        type: String,
        default: '',
    },
}, { timestamps: true });

export default mongoose.models.PTplan || mongoose.model('PTplan', PTplanSchema);
