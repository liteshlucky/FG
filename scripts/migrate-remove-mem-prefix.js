import mongoose from 'mongoose';
import Member from '../models/Member.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fit-app';

async function migrateMemberIds() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Find all members with MEM prefix (case-sensitive)
        const membersWithMEM = await Member.find({
            memberId: { $regex: /^MEM/ }
        }).lean();

        console.log(`📊 Found ${membersWithMEM.length} members with MEM prefix\n`);

        if (membersWithMEM.length === 0) {
            console.log('✅ No members with MEM prefix found. Migration not needed.');
            return;
        }

        // Check for potential conflicts
        const updates = [];
        const conflicts = [];

        for (const member of membersWithMEM) {
            // Extract numeric part from MEM### format
            const numericPart = member.memberId.replace(/^MEM0*/, '');

            // Check if this numeric ID already exists
            const existing = await Member.findOne({
                memberId: numericPart,
                _id: { $ne: member._id }
            });

            if (existing) {
                conflicts.push({
                    oldId: member.memberId,
                    newId: numericPart,
                    conflictsWith: existing.name
                });
            } else {
                updates.push({
                    _id: member._id,
                    oldId: member.memberId,
                    newId: numericPart,
                    name: member.name
                });
            }
        }

        if (conflicts.length > 0) {
            console.log('❌ CONFLICTS DETECTED:');
            console.log('='.repeat(80));
            conflicts.forEach(c => {
                console.log(`${c.oldId} → ${c.newId} conflicts with existing member: ${c.conflictsWith}`);
            });
            console.log('\n⚠️  Migration aborted due to conflicts. Please resolve manually.\n');
            return;
        }

        // Perform migration
        console.log('🔄 Starting migration...\n');
        console.log('='.repeat(80));

        let successCount = 0;
        let errorCount = 0;

        for (const update of updates) {
            try {
                await Member.updateOne(
                    { _id: update._id },
                    { $set: { memberId: update.newId } }
                );
                console.log(`✅ ${update.oldId} → ${update.newId} (${update.name})`);
                successCount++;
            } catch (error) {
                console.error(`❌ Failed to update ${update.oldId}: ${error.message}`);
                errorCount++;
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n📊 MIGRATION SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total members to migrate: ${updates.length}`);
        console.log(`✅ Successfully migrated: ${successCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('='.repeat(80));

        // Verify migration
        console.log('\n🔍 Verifying migration...');
        const remainingMEM = await Member.countDocuments({
            memberId: { $regex: /^MEM/ }
        });

        if (remainingMEM === 0) {
            console.log('✅ Migration verified! No members with MEM prefix remain.\n');
        } else {
            console.log(`⚠️  Warning: ${remainingMEM} members still have MEM prefix.\n`);
        }

        // Show sample of migrated IDs
        console.log('📋 Sample of migrated member IDs:');
        const sample = await Member.find({})
            .select('memberId name')
            .sort({ memberId: 1 })
            .limit(10)
            .lean();

        sample.forEach(m => {
            console.log(`  ${m.memberId} - ${m.name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run migration
migrateMemberIds();
