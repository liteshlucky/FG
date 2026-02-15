import mongoose from 'mongoose';
import Member from '../models/Member.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fit-app';

async function deleteMEMMembers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all members with MEM prefix
        const membersWithMEM = await Member.find({
            memberId: { $regex: /^MEM/ }
        }).select('memberId name email phone').lean();

        console.log(`📊 Found ${membersWithMEM.length} members with MEM prefix\n`);

        if (membersWithMEM.length === 0) {
            console.log('✅ No members with MEM prefix found. Nothing to delete.');
            return;
        }

        // Show members to be deleted
        console.log('⚠️  The following members will be DELETED:');
        console.log('='.repeat(80));
        membersWithMEM.forEach((m, i) => {
            console.log(`${i + 1}. ${m.memberId} - ${m.name} (${m.phone})`);
        });
        console.log('='.repeat(80));

        // Perform deletion
        console.log('\n🗑️  Deleting members with MEM prefix...\n');

        const result = await Member.deleteMany({
            memberId: { $regex: /^MEM/ }
        });

        console.log('='.repeat(80));
        console.log('✅ DELETION COMPLETE');
        console.log('='.repeat(80));
        console.log(`Deleted ${result.deletedCount} members`);
        console.log('='.repeat(80));

        // Verify deletion
        const remaining = await Member.countDocuments({
            memberId: { $regex: /^MEM/ }
        });

        if (remaining === 0) {
            console.log('\n✅ Verification: No members with MEM prefix remain');
        } else {
            console.log(`\n⚠️  Warning: ${remaining} members with MEM prefix still exist`);
        }

        // Show total remaining members
        const totalRemaining = await Member.countDocuments({});
        console.log(`📊 Total members remaining in database: ${totalRemaining}\n`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run deletion
deleteMEMMembers();
