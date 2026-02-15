import mongoose from 'mongoose';
import Member from '../models/Member.js';
import Counter from '../models/Counter.js';
import fs from 'fs';

// Force local database connection
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/fit-app';

async function addMissingMembersToLocal() {
    try {
        console.log('🔌 Connecting to LOCAL MongoDB...');
        console.log('URI:', LOCAL_MONGODB_URI);
        await mongoose.connect(LOCAL_MONGODB_URI);
        console.log('✅ Connected to local database\n');

        // Read the not-found members list
        const notFoundPath = './scripts/not-found-members.json';

        if (!fs.existsSync(notFoundPath)) {
            console.log('❌ not-found-members.json not found. Please run verify-members.js first.');
            return;
        }

        const notFoundMembers = JSON.parse(fs.readFileSync(notFoundPath, 'utf-8'));
        console.log(`📋 Found ${notFoundMembers.length} members to add\n`);

        let addedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        console.log('🔄 Adding members to local database...\n');
        console.log('='.repeat(80));

        for (const csvMember of notFoundMembers) {
            try {
                // Check if already exists by phone or ID
                const existingByPhone = await Member.findOne({ phone: csvMember.Phone });
                const existingById = await Member.findOne({ memberId: csvMember.ID });

                if (existingByPhone || existingById) {
                    console.log(`⏭️  Skipped: ${csvMember.Name} (ID: ${csvMember.ID}) - already exists`);
                    skippedCount++;
                    continue;
                }

                // Get next counter value
                const counter = await Counter.findOneAndUpdate(
                    { _id: 'memberId' },
                    { $inc: { seq: 1 } },
                    { new: true, upsert: true }
                );

                // Create member with numeric ID
                const newMember = await Member.create({
                    memberId: csvMember.ID, // Use the ID from CSV
                    name: csvMember.Name,
                    phone: csvMember.Phone,
                    email: `${csvMember.Name.toLowerCase().replace(/\s+/g, '.')}@fitapp.local`,
                    status: 'Pending',
                    paymentStatus: 'unpaid',
                    totalPaid: 0,
                    joinDate: new Date()
                });

                console.log(`✅ Added: ${newMember.name} (ID: ${newMember.memberId})`);
                addedCount++;

            } catch (error) {
                console.error(`❌ Error adding ${csvMember.Name}:`, error.message);
                errorCount++;
            }
        }

        console.log('='.repeat(80));
        console.log('\n📊 SUMMARY:');
        console.log('='.repeat(80));
        console.log(`✅ Successfully added: ${addedCount}`);
        console.log(`⏭️  Skipped (already exist): ${skippedCount}`);
        console.log(`❌ Errors: ${errorCount}`);
        console.log('='.repeat(80));

        // Show final count
        const finalCount = await Member.countDocuments({});
        console.log(`\n📊 Total members in local database: ${finalCount}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

addMissingMembersToLocal();
