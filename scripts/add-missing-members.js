import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Member from '../models/Member.js';
import Counter from '../models/Counter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fit-app';

// Normalize phone number (remove decimals, spaces, etc.)
function normalizePhone(phone) {
    if (!phone) return '';
    return phone.toString().replace(/\.0$/, '').replace(/\s+/g, '').trim();
}

async function addMissingMembers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Read the not-found members JSON file
        const notFoundPath = path.join(__dirname, '..', 'verification-results', 'not-found-members.json');

        if (!fs.existsSync(notFoundPath)) {
            console.error('❌ Error: not-found-members.json file not found!');
            console.log('Please run verify-members.js first.');
            return;
        }

        const notFoundMembers = JSON.parse(fs.readFileSync(notFoundPath, 'utf-8'));
        console.log(`📋 Found ${notFoundMembers.length} members to add\n`);

        const results = {
            added: [],
            skipped: [],
            errors: []
        };

        console.log('➕ Adding members to database...\n');
        console.log('='.repeat(80));

        for (const member of notFoundMembers) {
            const { csvId, csvName, csvPhone } = member;

            // Skip if essential data is missing
            if (!csvName || csvName === 'N/A') {
                results.skipped.push({
                    id: csvId,
                    reason: 'Missing name'
                });
                console.log(`⏭️  Skipped ID ${csvId}: Missing name`);
                continue;
            }

            if (!csvPhone || csvPhone === 'N/A') {
                results.skipped.push({
                    id: csvId,
                    name: csvName,
                    reason: 'Missing phone number'
                });
                console.log(`⏭️  Skipped ID ${csvId} (${csvName}): Missing phone number`);
                continue;
            }

            try {
                // Check if member already exists by phone (double-check)
                const existingByPhone = await Member.findOne({ phone: csvPhone });
                if (existingByPhone) {
                    results.skipped.push({
                        id: csvId,
                        name: csvName,
                        phone: csvPhone,
                        reason: 'Phone number already exists in database',
                        existingMemberId: existingByPhone.memberId
                    });
                    console.log(`⏭️  Skipped ${csvName}: Phone already exists (Member ID: ${existingByPhone.memberId})`);
                    continue;
                }

                // Check if member ID already exists
                const existingById = await Member.findOne({ memberId: csvId.toString() });
                if (existingById) {
                    results.skipped.push({
                        id: csvId,
                        name: csvName,
                        phone: csvPhone,
                        reason: 'Member ID already exists',
                        existingMember: existingById.name
                    });
                    console.log(`⏭️  Skipped ${csvName}: Member ID ${csvId} already assigned to ${existingById.name}`);
                    continue;
                }

                // Create email from name (simple approach)
                const emailUsername = csvName.toLowerCase()
                    .replace(/\s+/g, '.')
                    .replace(/[^a-z0-9.]/g, '');
                const email = `${emailUsername}@fitapp.local`;

                // Create new member
                const newMember = new Member({
                    memberId: csvId.toString(),
                    name: csvName,
                    phone: csvPhone,
                    email: email,
                    status: 'Pending', // Set as Pending since we don't have full details
                    joinDate: new Date(),
                    paymentStatus: 'unpaid',
                    totalPaid: 0
                });

                await newMember.save();

                results.added.push({
                    id: csvId,
                    name: csvName,
                    phone: csvPhone,
                    email: email,
                    mongoId: newMember._id.toString()
                });

                console.log(`✅ Added: ${csvName} (ID: ${csvId}, Phone: ${csvPhone})`);

            } catch (error) {
                results.errors.push({
                    id: csvId,
                    name: csvName,
                    phone: csvPhone,
                    error: error.message
                });
                console.error(`❌ Error adding ${csvName}: ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n📊 SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total to add: ${notFoundMembers.length}`);
        console.log(`✅ Successfully added: ${results.added.length}`);
        console.log(`⏭️  Skipped: ${results.skipped.length}`);
        console.log(`❌ Errors: ${results.errors.length}`);
        console.log('='.repeat(80));

        // Save results
        const resultsDir = path.join(__dirname, '..', 'verification-results');
        const resultsPath = path.join(resultsDir, 'add-members-results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n💾 Results saved to: ${resultsPath}`);

        if (results.added.length > 0) {
            console.log('\n✨ Successfully added members to database!');
        }

        if (results.skipped.length > 0) {
            console.log('\n⚠️  Some members were skipped. Check add-members-results.json for details.');
        }

        if (results.errors.length > 0) {
            console.log('\n❌ Some errors occurred. Check add-members-results.json for details.');
        }

    } catch (error) {
        console.error('❌ Fatal Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Run the script
addMissingMembers();
