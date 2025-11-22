const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const MemberSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    joinDate: Date,
    status: String,
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
});
const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

const PlanSchema = new mongoose.Schema({
    name: String,
    price: Number,
    duration: Number,
    features: [String],
});
const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create a 1-month plan
        const plan = await Plan.create({
            name: 'Test 1 Month Plan ' + Date.now(),
            price: 10,
            duration: 1,
            features: ['Test Feature']
        });
        console.log('Created Plan:', plan.name);

        // 2. Create a member who joined 2 months ago
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        const member = await Member.create({
            name: 'Expired Test Member',
            email: 'expired' + Date.now() + '@test.com',
            phone: '0000000000',
            joinDate: twoMonthsAgo,
            status: 'Active', // Intentionally Active
            planId: plan._id
        });
        console.log('Created Member:', member.name, 'Status:', member.status, 'Join Date:', member.joinDate);

        console.log('Seed successful. Now refresh the dashboard to see if status updates.');
        process.exit(0);
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
}

seed();
