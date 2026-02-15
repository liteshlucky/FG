
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define Schemas (Minimal)
const MemberSchema = new mongoose.Schema({
    memberId: String,
    name: String,
    phone: String,
    totalPaid: Number,
    totalPlanPrice: Number,
    planId: mongoose.Schema.Types.ObjectId,
    membershipStartDate: Date,
    membershipEndDate: Date,
    status: String
}, { strict: false });

const PlanSchema = new mongoose.Schema({
    name: String,
    duration: Number,
    price: Number
}, { strict: false });

const PaymentSchema = new mongoose.Schema({
    memberId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    paymentDate: Date,
    planPrice: Number,
    paymentCategory: String
}, { strict: false });

const Member = mongoose.model('Member', MemberSchema);
const Plan = mongoose.model('Plan', PlanSchema);
const Payment = mongoose.model('Payment', PaymentSchema);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

function calculateEndDate(startDate, durationMonths) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + durationMonths);
    return d;
}

async function assignPlans() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        // 1. Fetch Plans and Sort
        console.log('Fetching plans...');
        const plans = await Plan.find({});
        // Sort plans by price ASC, then duration DESC (to prefer longer plans for same price)
        plans.sort((a, b) => {
            if (a.price !== b.price) return a.price - b.price;
            return b.duration - a.duration;
        });

        // Map for exact lookups
        const plansByPrice = {};
        plans.forEach(p => {
            if (!plansByPrice[p.price]) plansByPrice[p.price] = [];
            plansByPrice[p.price].push(p);
        });

        console.log(`Loaded ${plans.length} plans.`);

        // 2. Fetch Members
        console.log('Fetching members...');
        const members = await Member.find({});
        console.log(`Found ${members.length} members.`);

        let updatedCount = 0;
        let unmatchedCount = 0;
        let alreadyAssignedCount = 0;

        for (const member of members) {
            // Check if plan already assigned (maybe skip if you want to overwrite only missing?)
            // For now, let's process all to ensure correctness.

            let targetPrice = member.totalPlanPrice || 0;

            if (targetPrice === 0) {
                const lastPayment = await Payment.findOne({
                    memberId: member._id,
                    paymentCategory: { $in: ['Plan', 'Plan (Multiple)', 'Admission Fee'] }
                }).sort({ paymentDate: -1 });

                if (lastPayment) {
                    targetPrice = lastPayment.planPrice || lastPayment.amount;
                }
            }

            if (targetPrice === 0 || targetPrice < 100) { // Skip very small amounts
                continue;
            }

            let matchedPlan = null;
            let matchType = '';

            // 2a. Exact Match (preferring longest duration)
            if (plansByPrice[targetPrice]) {
                // Already sorted by duration DESC in prep step
                matchedPlan = plansByPrice[targetPrice][0];
                matchType = 'Exact';
            } else {
                // 2b. Fuzzy Match
                let bestMatch = null;
                let minDiff = Infinity;

                for (const p of plans) {
                    // Skip 'Test' plans or small plans if target is large? 
                    // No, reliance on diff is enough.

                    const diff = Math.abs(p.price - targetPrice);
                    // Threshold: 10% or 500 INR
                    const threshold = Math.max(500, p.price * 0.1);

                    if (diff <= threshold && diff < minDiff) {
                        minDiff = diff;
                        bestMatch = p;
                    }
                }

                if (bestMatch) {
                    matchedPlan = bestMatch;
                    matchType = 'Fuzzy';
                }
            }

            if (matchedPlan) {
                member.planId = matchedPlan._id;

                // Recalculate dates
                const lastPayment = await Payment.findOne({ memberId: member._id }).sort({ paymentDate: -1 });
                const startDate = lastPayment ? lastPayment.paymentDate : (member.joinDate || member.createdAt);

                member.membershipStartDate = startDate;
                member.membershipEndDate = calculateEndDate(startDate, matchedPlan.duration);

                const now = new Date();
                // Set status based on expiration
                if (member.membershipEndDate > now) {
                    member.status = 'Active';
                } else {
                    member.status = 'Expired';
                }

                await member.save();
                updatedCount++;
                // console.log(`[${matchType}] Assigned ${matchedPlan.name} (${matchedPlan.price}) to ${member.name} (Target: ${targetPrice})`);
            } else {
                // console.log(`Unmatched: ${member.name} (Price: ${targetPrice})`);
                unmatchedCount++;
            }
        }

        console.log('Assignment completed!');
        console.log(`Updated: ${updatedCount}`);
        console.log(`Unmatched (No suitable plan found): ${unmatchedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Assignment failed:', error);
        process.exit(1);
    }
}

assignPlans();
