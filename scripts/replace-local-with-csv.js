import mongoose from 'mongoose';
import Member from '../models/Member.js';
import fs from 'fs';

// Force local database connection
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/fit-app';

async function replaceLocalWithCSV() {
    try {
        console.log('🔌 Connecting to LOCAL MongoDB...');
        await mongoose.connect(LOCAL_MONGODB_URI);
        console.log('✅ Connected to local database\n');

        // Step 1: Show current state
        const currentCount = await Member.countDocuments({});
        console.log('📊 CURRENT STATE:');
        console.log('='.repeat(80));
        console.log(`Current members in database: ${currentCount}`);
        console.log('='.repeat(80));

        // Step 2: Delete ALL members
        console.log('\n🗑️  STEP 1: Deleting ALL existing members...\n');
        const deleteResult = await Member.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} members`);

        // Verify deletion
        const afterDelete = await Member.countDocuments({});
        console.log(`✅ Remaining members: ${afterDelete}\n`);

        // Step 3: Read CSV and add members
        console.log('📋 STEP 2: Adding members from CSV...\n');
        const csvPath = './all_members_list_15-02-2026.csv';
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const csvMembers = lines.slice(1).map(line => {
            const [id, name, phone] = line.split(',').map(s => s.trim());
            return { id, name, phone };
        });

        console.log(`Found ${csvMembers.length} members in CSV\n`);
        console.log('='.repeat(80));

        let addedCount = 0;
        let errorCount = 0;

        for (const csvMember of csvMembers) {
            try {
                // Create member with numeric ID from CSV
                const newMember = await Member.create({
                    memberId: csvMember.id,
                    name: csvMember.name,
                    phone: csvMember.phone,
                    email: `${csvMember.name.toLowerCase().replace(/\s+/g, '.')}@fitapp.local`,
                    status: 'Pending',
                    paymentStatus: 'unpaid',
                    totalPaid: 0,
                    joinDate: new Date()
                });

                addedCount++;
                if (addedCount % 50 === 0) {
                    console.log(`✅ Added ${addedCount} members...`);
                }

            } catch (error) {
                console.error(`❌ Error adding ${csvMember.name}:`, error.message);
                errorCount++;
            }
        }

        console.log('='.repeat(80));
        console.log('\n📊 FINAL SUMMARY:');
        console.log('='.repeat(80));
        console.log(`🗑️  Deleted: ${deleteResult.deletedCount} old members`);
        console.log(`✅ Added: ${addedCount} members from CSV`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('='.repeat(80));

        // Final verification
        const finalCount = await Member.countDocuments({});
        const memCount = await Member.countDocuments({ memberId: /^MEM/ });

        console.log(`\n📊 Total members in local database: ${finalCount}`);
        console.log(`📊 Expected from CSV: ${csvMembers.length}`);
        console.log(`✅ Members with MEM prefix: ${memCount}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

replaceLocalWithCSV();
