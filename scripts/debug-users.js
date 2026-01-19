const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MemberSchema = new mongoose.Schema({
    name: String,
    memberId: String,
    phone: String,
    status: String,
    membershipStatus: String,
    membershipEndDate: Date,
});

// Prevent overwriting if already compiled
const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

const TrainerSchema = new mongoose.Schema({
    name: String,
    trainerId: String,
    phone: String
});
const Trainer = mongoose.models.Trainer || mongoose.model('Trainer', TrainerSchema);

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not defined in .env.local');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        console.log('\n--- First 5 Members ---');
        const members = await Member.find({}).limit(5).lean();
        members.forEach(m => {
            console.log(`Name: ${m.name}, ID: ${m.memberId}, Phone: ${m.phone}`);
        });

        console.log('\n--- First 5 Trainers ---');
        const trainers = await Trainer.find({}).limit(5).lean();
        trainers.forEach(t => {
            console.log(`Name: ${t.name}, ID: ${t.trainerId}, Phone: ${t.phone}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
