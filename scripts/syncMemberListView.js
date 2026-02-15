
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// We need to import the actual models to get the middleware and schema definitions,
// but since they are ES modules, we need to use dynamic import() in an async context.
// However, for a simple sync script, we can just define the logic here to avoid module issues.

const MemberListViewSchema = new mongoose.Schema({}, { strict: false });
const MemberSchema = new mongoose.Schema({
    memberId: String,
    name: String,
    email: String,
    phone: String,
    status: String,
    paymentStatus: String,
    planId: mongoose.Schema.Types.ObjectId, // We need to populate this
    ptPlanId: mongoose.Schema.Types.ObjectId,
    discountId: mongoose.Schema.Types.ObjectId,
    membershipStartDate: Date,
    membershipEndDate: Date,
    joinDate: Date,
    profilePicture: String,
    totalPaid: Number,
    totalPlanPrice: Number,
    admissionFeeAmount: Number
}, { strict: false, timestamps: true });

// Define Plan schema for population
const PlanSchema = new mongoose.Schema({ name: String, duration: Number, price: Number }, { strict: false });

const Member = mongoose.model('Member', MemberSchema);
const MemberListView = mongoose.model('MemberListView', MemberListViewSchema);
const Plan = mongoose.model('Plan', PlanSchema);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

async function syncMembers() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        console.log('Fetching all members...');
        // Populate planId to get details
        const members = await Member.find({}).populate('planId');
        console.log(`Found ${members.length} members.`);

        let syncedCount = 0;
        let errorCount = 0;

        for (const member of members) {
            try {
                const listViewData = {
                    memberId: member.memberId,
                    name: member.name,
                    email: member.email,
                    phone: member.phone,
                    status: member.status,
                    paymentStatus: member.paymentStatus,

                    // Plan details
                    planName: member.planId?.name || 'No Plan',
                    planDuration: member.planId?.duration,
                    planId: member.planId?._id || member.planId,

                    membershipStartDate: member.membershipStartDate,
                    membershipEndDate: member.membershipEndDate,
                    joinDate: member.joinDate,
                    profilePicture: member.profilePicture,
                    ptPlanId: member.ptPlanId,
                    discountId: member.discountId,

                    // Financials (Optional - verify MemberListView schema supports these)
                    // If MemberListView is just a cache, we can add whatever we want usually if strict: false
                    totalPaid: member.totalPaid,
                    totalPlanPrice: member.totalPlanPrice,
                };

                await MemberListView.findOneAndUpdate(
                    { _id: member._id },
                    listViewData,
                    { upsert: true, new: true }
                );

                // console.log(`Synced: ${member.name}`);
                syncedCount++;

                if (syncedCount % 50 === 0) console.log(`Synced ${syncedCount} members...`);

            } catch (err) {
                console.error(`Failed to sync ${member.name}:`, err.message);
                errorCount++;
            }
        }

        console.log('Sync completed!');
        console.log(`Synced: ${syncedCount}`);
        console.log(`Errors: ${errorCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

syncMembers();
