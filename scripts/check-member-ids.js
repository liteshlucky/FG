import mongoose from 'mongoose';
import Member from '../models/Member.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fit-app';

async function checkMemberIds() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log('URI:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected\n');

        // Get all member IDs
        const members = await Member.find({}).select('memberId name').limit(20).lean();

        console.log('📋 First 20 member IDs:');
        members.forEach((m, i) => {
            console.log(`${i + 1}. ${m.memberId} - ${m.name}`);
        });

        // Count MEM prefix
        const memCount = await Member.countDocuments({ memberId: /^MEM/ });
        console.log(`\n📊 Members with MEM prefix: ${memCount}`);

        // Count total
        const total = await Member.countDocuments({});
        console.log(`📊 Total members: ${total}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkMemberIds();
