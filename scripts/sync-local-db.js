import mongoose from 'mongoose';
import Member from '../models/Member.js';
import Counter from '../models/Counter.js';
import fs from 'fs';

// Force local database connection
const LOCAL_MONGODB_URI = 'mongodb://localhost:27017/fit-app';

async function syncLocalWithCloud() {
    try {
        console.log('🔌 Connecting to LOCAL MongoDB...');
        await mongoose.connect(LOCAL_MONGODB_URI);
        console.log('✅ Connected to local database\n');

        // Read CSV file
        const csvPath = './all_members_list_15-02-2026.csv';

        if (!fs.existsSync(csvPath)) {
            console.log('❌ CSV file not found:', csvPath);
            return;
        }

        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const csvMembers = lines.slice(1).map(line => {
            const [id, name, phone] = line.split(',').map(s => s.trim());
            return { id, name, phone };
        });

        console.log(`📋 Found ${csvMembers.length} members in CSV\n`);

        let addedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        console.log('🔄 Syncing members to local database...\n');
        console.log('='.repeat(80));

        for (const csvMember of csvMembers) {
            try {
                // Check if already exists
                const existing = await Member.findOne({
                    $or: [
                        { memberId: csvMember.id },
                        { phone: csvMember.phone }
                    ]
                });

                if (existing) {
                    skippedCount++;
                    continue;
                }

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

                console.log(`✅ Added: ${newMember.name} (ID: ${newMember.memberId})`);
                addedCount++;

            } catch (error) {
                console.error(`❌ Error adding ${csvMember.name}:`, error.message);
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
        console.log(`📊 Expected from CSV: ${csvMembers.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

syncLocalWithCloud();
