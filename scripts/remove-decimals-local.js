import mongoose from 'mongoose';
import Member from '../models/Member.js';

// Force local database connection
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/fit-app';

async function removeDecimalsFromLocalIDs() {
    try {
        console.log('🔌 Connecting to LOCAL MongoDB...');
        await mongoose.connect(LOCAL_MONGODB_URI);
        console.log('✅ Connected to local database\n');

        // Find all members with decimal IDs
        const allMembers = await Member.find({}).select('memberId name').lean();

        console.log(`📊 Total members: ${allMembers.length}\n`);

        const membersWithDecimals = allMembers.filter(m => m.memberId.includes('.'));
        console.log(`📊 Members with decimal IDs: ${membersWithDecimals.length}\n`);

        if (membersWithDecimals.length === 0) {
            console.log('✅ No decimal IDs found!');
            return;
        }

        console.log('🔄 Removing decimal values from IDs...\n');
        console.log('='.repeat(80));

        let updatedCount = 0;
        let errorCount = 0;

        for (const member of membersWithDecimals) {
            try {
                // Remove .0 from ID
                const newId = member.memberId.replace(/\.0$/, '');

                // Check if the new ID already exists
                const existing = await Member.findOne({
                    memberId: newId,
                    _id: { $ne: member._id }
                });

                if (existing) {
                    console.log(`⚠️  Skipped ${member.memberId} → ${newId} (conflict with existing)`);
                    errorCount++;
                    continue;
                }

                // Update the member ID
                await Member.updateOne(
                    { _id: member._id },
                    { $set: { memberId: newId } }
                );

                updatedCount++;
                if (updatedCount % 50 === 0) {
                    console.log(`✅ Updated ${updatedCount} members...`);
                }

            } catch (error) {
                console.error(`❌ Error updating ${member.memberId}:`, error.message);
                errorCount++;
            }
        }

        console.log('='.repeat(80));
        console.log('\n📊 SUMMARY:');
        console.log('='.repeat(80));
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('='.repeat(80));

        // Verify
        const remainingDecimals = await Member.countDocuments({ memberId: /\./ });
        console.log(`\n📊 Members with decimal IDs remaining: ${remainingDecimals}`);

        // Show sample
        console.log('\n📋 Sample member IDs after update:');
        const sample = await Member.find({}).select('memberId name').sort({ memberId: 1 }).limit(10).lean();
        sample.forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.memberId} - ${m.name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

removeDecimalsFromLocalIDs();
