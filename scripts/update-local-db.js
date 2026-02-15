import mongoose from 'mongoose';
import Member from '../models/Member.js';

// Force local database connection
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/fit-app';

async function updateLocalDatabase() {
    try {
        console.log('🔌 Connecting to LOCAL MongoDB...');
        console.log('URI:', LOCAL_MONGODB_URI);
        await mongoose.connect(LOCAL_MONGODB_URI);
        console.log('✅ Connected to local database\n');

        // Step 1: Check current state
        console.log('📊 CURRENT STATE:');
        console.log('='.repeat(80));

        const totalMembers = await Member.countDocuments({});
        const membersWithMEM = await Member.countDocuments({ memberId: /^MEM/ });

        console.log(`Total members: ${totalMembers}`);
        console.log(`Members with MEM prefix: ${membersWithMEM}`);

        // Show sample IDs
        const sampleMembers = await Member.find({}).select('memberId name').limit(10).lean();
        console.log('\nSample member IDs:');
        sampleMembers.forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.memberId} - ${m.name}`);
        });
        console.log('='.repeat(80));

        // Step 2: Remove MEM prefix if exists
        if (membersWithMEM > 0) {
            console.log('\n🔄 STEP 1: Removing MEM prefix from member IDs...\n');

            const membersToUpdate = await Member.find({ memberId: /^MEM/ }).lean();

            let updateCount = 0;
            for (const member of membersToUpdate) {
                const numericId = member.memberId.replace(/^MEM0*/, '');

                // Check for conflicts
                const existing = await Member.findOne({
                    memberId: numericId,
                    _id: { $ne: member._id }
                });

                if (!existing) {
                    await Member.updateOne(
                        { _id: member._id },
                        { $set: { memberId: numericId } }
                    );
                    console.log(`  ✅ ${member.memberId} → ${numericId}`);
                    updateCount++;
                } else {
                    console.log(`  ⚠️  Skipped ${member.memberId} (conflict with existing ID ${numericId})`);
                }
            }

            console.log(`\n✅ Updated ${updateCount} member IDs`);
        } else {
            console.log('\n✅ STEP 1: No MEM prefix found, skipping...');
        }

        // Step 3: Verify final state
        console.log('\n📊 FINAL STATE:');
        console.log('='.repeat(80));

        const finalTotal = await Member.countDocuments({});
        const finalMEM = await Member.countDocuments({ memberId: /^MEM/ });

        console.log(`Total members: ${finalTotal}`);
        console.log(`Members with MEM prefix: ${finalMEM}`);

        // Show sample IDs after update
        const finalSample = await Member.find({}).select('memberId name').sort({ memberId: 1 }).limit(10).lean();
        console.log('\nSample member IDs (sorted):');
        finalSample.forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.memberId} - ${m.name}`);
        });
        console.log('='.repeat(80));

        console.log('\n✅ Local database update complete!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

updateLocalDatabase();
