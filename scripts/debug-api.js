import mongoose from 'mongoose';
import Member from '../models/Member.js';
import Plan from '../models/Plan.js';
import Discount from '../models/Discount.js';
import PTplan from '../models/PTplan.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fit-app';

async function debugAPI() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Simulate the API query
        console.log('📡 Simulating API query: Member.find({}).populate(...).sort(...).lean()');

        const members = await Member.find({})
            .populate('planId')
            .populate('discountId')
            .populate('ptPlanId')
            .sort({ createdAt: -1 })
            .lean();

        console.log(`\n📊 Total members returned: ${members.length}\n`);

        // Check for RAHUL RUDRA
        const rahul = members.find(m => m.name === 'RAHUL RUDRA');
        if (rahul) {
            console.log('✅ Found RAHUL RUDRA:');
            console.log(JSON.stringify(rahul, null, 2));
        } else {
            console.log('❌ RAHUL RUDRA not found in API results');
        }

        // Check member 334
        const member334 = members.find(m => m.memberId === '334');
        if (member334) {
            console.log('\n✅ Found member ID 334:');
            console.log(JSON.stringify(member334, null, 2));
        } else {
            console.log('\n❌ Member ID 334 not found in API results');
        }

        // Check database directly
        console.log('\n🔍 Checking database directly for member ID 334...');
        const directQuery = await Member.findOne({ memberId: '334' }).lean();
        if (directQuery) {
            console.log('✅ Found in database:');
            console.log(JSON.stringify(directQuery, null, 2));
        } else {
            console.log('❌ Not found in database');
        }

        // Check by phone
        console.log('\n🔍 Checking by phone 7044942373...');
        const byPhone = await Member.findOne({ phone: '7044942373' }).lean();
        if (byPhone) {
            console.log('✅ Found by phone:');
            console.log(JSON.stringify(byPhone, null, 2));
        } else {
            console.log('❌ Not found by phone');
        }

        // List some recent members
        console.log('\n📋 Last 5 members by createdAt:');
        const recent = await Member.find({}).sort({ createdAt: -1 }).limit(5).select('memberId name phone status createdAt').lean();
        recent.forEach((m, i) => {
            console.log(`${i + 1}. ID: ${m.memberId}, Name: ${m.name}, Created: ${m.createdAt}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

debugAPI();
