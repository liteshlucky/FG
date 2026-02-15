import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import Trainer from '../models/Trainer.js';
import Counter from '../models/Counter.js';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

// Staff members to add
const staffMembers = [
    { id: '1', name: 'AVIRUP BARMAN', phone: '8961108482', role: 'Support Staff', specialization: 'General Support' },
    { id: '2', name: 'SANDIP DAS', phone: '7688061261', role: 'Support Staff', specialization: 'General Support' },
    { id: '3', name: 'MADHUCHHANDA NAG', phone: '7003800634', role: 'Support Staff', specialization: 'General Support' },
    { id: '4', name: 'PRITAM SAHA', phone: '9830491766', role: 'Support Staff', specialization: 'General Support' },
    { id: '5', name: 'ANGANA BHATTACHARJEE', phone: '9836370922', role: 'Support Staff', specialization: 'General Support' },
    { id: '6', name: 'SANJIB SARKAR', phone: '8910101497', role: 'Support Staff', specialization: 'General Support' },
    { id: '7', name: 'Reshmi Saha', phone: '7980130055', role: 'Support Staff', specialization: 'General Support' },
    { id: '8', name: 'Abhimanyu Shaw', phone: '9912345678', role: 'Support Staff', specialization: 'Housekeeping' },
    { id: '9', name: 'SOUTRICK DAS', phone: '8100575289', role: 'Support Staff', specialization: 'General Support' }
];

async function addStaffMembers() {
    try {
        console.log('🔌 Connecting to CLOUD MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to cloud database\n');

        console.log('👥 Adding Staff Members...\n');
        console.log('='.repeat(80));

        let addedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const staff of staffMembers) {
            try {
                // Check if already exists by phone
                const existing = await Trainer.findOne({
                    $or: [
                        { trainerId: `ST${staff.id}` },
                        { name: staff.name }
                    ]
                });

                if (existing) {
                    console.log(`⏭️  Skipped: ${staff.name} (already exists)`);
                    skippedCount++;
                    continue;
                }

                // Create staff member
                const newStaff = await Trainer.create({
                    trainerId: `ST${staff.id}`,
                    name: staff.name,
                    role: staff.role,
                    specialization: staff.specialization,
                    bio: `${staff.role} member`,
                    baseSalary: 0,
                    ptFee: 0,
                    commissionType: 'fixed',
                    commissionValue: 0,
                    dayOff: 'None'
                });

                console.log(`✅ Added: ${newStaff.name} (ID: ${newStaff.trainerId}, Role: ${newStaff.role})`);
                addedCount++;

            } catch (error) {
                console.error(`❌ Error adding ${staff.name}:`, error.message);
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

        // Show all staff members
        const allStaff = await Trainer.find({ role: 'Support Staff' }).select('trainerId name role specialization').lean();
        console.log(`\n📋 Total Support Staff: ${allStaff.length}`);
        allStaff.forEach((s, i) => {
            console.log(`  ${i + 1}. ${s.trainerId} - ${s.name} (${s.specialization})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

addStaffMembers();
