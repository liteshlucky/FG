import mongoose from 'mongoose';

const TrainerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
    },
    role: {
        type: String,
        enum: ['Management', 'Trainer', 'Support Staff', 'Other'],
        default: 'Trainer',
    },
    trainerId: {
        type: String,
        unique: true,
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
    profilePicture: {
        type: String,
        default: '',
    },
    baseSalary: {
        type: Number,
        default: 0,
    },
    ptFee: {
        type: Number,
        default: 0,
    },
    commissionType: {
        type: String,
        enum: ['fixed', 'percentage'],
        default: 'percentage',
    },
    commissionValue: {
        type: Number,
        default: 0,
    },
    dayOff: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'None'],
        default: 'None',
    },
    leaves: [{
        type: Date,
    }],
    bankDetails: {
        accountName: { type: String, default: '' },
        accountNumber: { type: String, default: '' },
        bankName: { type: String, default: '' },
        ifscCode: { type: String, default: '' },
    },
}, { timestamps: true });

export default mongoose.models.Trainer || mongoose.model('Trainer', TrainerSchema);
