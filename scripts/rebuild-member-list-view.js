import 'dotenv/config';
import dbConnect from '../lib/db.js';
import Member from '../models/Member.js';
import MemberListView from '../models/MemberListView.js';

/**
 * Rebuild MemberListView from Member collection
 * 
 * This script:
 * 1. Clears the existing MemberListView collection
 * 2. Fetches all members with populated plan data
 * 3. Creates new MemberListView entries for each member
 * 
 * Use this for:
 * - Initial setup/migration
 * - Recovery from sync failures
 * - Data validation
 */

async function rebuildMemberListView() {
    try {
        console.log('🔄 Starting MemberListView rebuild...\n');

        await dbConnect();

        // Step 1: Clear existing MemberListView
        console.log('1️⃣  Clearing existing MemberListView...');
        const deleteResult = await MemberListView.deleteMany({});
        console.log(`   ✓ Deleted ${deleteResult.deletedCount} existing entries\n`);

        // Step 2: Fetch all members with plan populated
        console.log('2️⃣  Fetching all members...');
        const members = await Member.find({})
            .populate('planId')
            .lean();
        console.log(`   ✓ Found ${members.length} members\n`);

        if (members.length === 0) {
            console.log('⚠️  No members found. Nothing to rebuild.');
            return;
        }

        // Step 3: Create list view entries
        console.log('3️⃣  Creating MemberListView entries...');
        const listViewDocs = members.map(member => ({
            _id: member._id,
            memberId: member.memberId,
            name: member.name,
            email: member.email,
            phone: member.phone,
            status: member.status,
            paymentStatus: member.paymentStatus,
            planName: member.planId?.name || 'No Plan',
            planDuration: member.planId?.duration,
            planId: member.planId?._id,
            membershipStartDate: member.membershipStartDate,
            membershipEndDate: member.membershipEndDate,
            joinDate: member.joinDate,
            profilePicture: member.profilePicture,
            ptPlanId: member.ptPlanId,
            discountId: member.discountId
        }));

        await MemberListView.insertMany(listViewDocs);
        console.log(`   ✓ Created ${listViewDocs.length} MemberListView entries\n`);

        // Step 4: Verify
        console.log('4️⃣  Verifying...');
        const memberCount = await Member.countDocuments();
        const listViewCount = await MemberListView.countDocuments();

        console.log(`   Members: ${memberCount}`);
        console.log(`   MemberListView: ${listViewCount}`);

        if (memberCount === listViewCount) {
            console.log('   ✅ Counts match!\n');
        } else {
            console.log('   ⚠️  Counts do not match!\n');
        }

        console.log('✅ MemberListView rebuild complete!\n');

    } catch (error) {
        console.error('❌ Error rebuilding MemberListView:', error);
        throw error;
    }
}

// Run the script
rebuildMemberListView()
    .then(() => {
        console.log('Script finished successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
