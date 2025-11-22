import mongoose from 'mongoose';

const TrainerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    specialization: {
        type: String,
        required: [true, 'Please provide a specialization'],
    },
    bio: {
        type: String,
    },
    imageUrl: {
        type: String,
    },
}, { timestamps: true });

export default mongoose.models.Trainer || mongoose.model('Trainer', TrainerSchema);
