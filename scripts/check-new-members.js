import mongoose from 'mongoose';
import Member from '../models/Member.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fit-app';

async function checkNewMembers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Check total count
        const totalCount = await Member.countDocuments({});
        console.log(`📊 Total members in database: ${totalCount}\n`);

        // Check recently added members (last 10 minutes)
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const recentMembers = await Member.find({
            createdAt: { $gte: tenMinutesAgo }
        }).select('memberId name phone email status createdAt').sort({ createdAt: -1 }).limit(10);

        console.log(`🆕 Recently added members (last 10 minutes): ${recentMembers.length}\n`);

        if (recentMembers.length > 0) {
            console.log('Recent members:');
            console.log('='.repeat(80));
            recentMembers.forEach((member, index) => {
                console.log(`${index + 1}. ID: ${member.memberId}, Name: ${member.name}, Phone: ${member.phone}`);
                console.log(`   Status: ${member.status}, Created: ${member.createdAt}`);
                console.log(`   Email: ${member.email}`);
                console.log('');
            });
        }

        // Check members with specific IDs from our added list
        const testIds = ['336', '335', '334', '333', '332'];
        console.log('\n🔍 Checking specific member IDs:', testIds.join(', '));
        console.log('='.repeat(80));

        for (const id of testIds) {
            const member = await Member.findOne({ memberId: id }).select('memberId name phone status email');
            if (member) {
                console.log(`✅ Found ID ${id}: ${member.name} (${member.phone}) - Status: ${member.status}`);
            } else {
                console.log(`❌ Not found: ID ${id}`);
            }
        }

        // Check members by status
        console.log('\n📊 Members by status:');
        console.log('='.repeat(80));
        const statusCounts = await Member.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        statusCounts.forEach(status => {
            console.log(`${status._id || 'No Status'}: ${status.count}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

checkNewMembers();
