import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Member from '../models/Member.js';
import fs from 'fs';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function verifyCloudDatabase() {
    try {
        console.log('🔌 Connecting to CLOUD MongoDB...');
        console.log('URI:', MONGODB_URI.substring(0, 50) + '...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to cloud database\n');

        // Read CSV file
        const csvPath = './all_members_list_15-02-2026.csv';
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.trim().split('\n');
        const csvMembers = lines.slice(1).map(line => {
            const [id, name, phone] = line.split(',').map(s => s.trim());
            return { id, name, phone };
        });

        console.log(`📋 CSV contains ${csvMembers.length} members\n`);

        // Check database
        const dbMembers = await Member.find({}).select('memberId name phone').lean();
        console.log(`📊 Database contains ${dbMembers.length} members\n`);

        // Check for members with MEM prefix
        const memCount = await Member.countDocuments({ memberId: /^MEM/ });
        console.log(`⚠️  Members with MEM prefix: ${memCount}\n`);

        // Find missing members
        const missing = [];
        const found = [];

        for (const csvMember of csvMembers) {
            const exists = dbMembers.find(db =>
                db.memberId === csvMember.id ||
                db.phone === csvMember.phone
            );

            if (!exists) {
                missing.push(csvMember);
            } else {
                found.push(csvMember);
            }
        }

        console.log('='.repeat(80));
        console.log('📊 VERIFICATION RESULTS:');
        console.log('='.repeat(80));
        console.log(`✅ Found in database: ${found.length}`);
        console.log(`❌ Missing from database: ${missing.length}`);
        console.log('='.repeat(80));

        if (missing.length > 0) {
            console.log('\n❌ MISSING MEMBERS:');
            missing.forEach((m, i) => {
                console.log(`${i + 1}. ID: ${m.id}, Name: ${m.name}, Phone: ${m.phone}`);
            });
        } else {
            console.log('\n✅ All CSV members are in the database!');
        }

        // Show sample of database IDs
        console.log('\n📋 Sample database member IDs:');
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

verifyCloudDatabase();
