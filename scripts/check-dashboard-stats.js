import 'dotenv/config';
import dbConnect from '../lib/db.js';
import MemberListView from '../models/MemberListView.js';

async function checkDashboardStats() {
    await dbConnect();

    console.log('Checking MemberListView data...\n');

    // Get status distribution
    const statusCounts = await MemberListView.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);

    console.log('Status distribution:');
    statusCounts.forEach(s => {
        console.log(`  ${s._id || 'null'}: ${s.count}`);
    });

    // Sample a few members
    console.log('\nSample members:');
    const samples = await MemberListView.find().limit(5).lean();
    samples.forEach(m => {
        console.log(`  ${m.memberId}: status="${m.status}", planName="${m.planName}"`);
    });

    // Test the aggregation query from dashboard
    console.log('\nTesting dashboard aggregation...');
    const [statsResult] = await MemberListView.aggregate([
        {
            $facet: {
                totalClients: [{ $count: 'count' }],
                activeClients: [
                    { $match: { status: 'Active' } },
                    { $count: 'count' }
                ],
            }
        }
    ]);

    console.log('Results:');
    console.log(`  Total: ${statsResult.totalClients[0]?.count || 0}`);
    console.log(`  Active: ${statsResult.activeClients[0]?.count || 0}`);

    process.exit(0);
}

checkDashboardStats().catch(err => {
    console.error(err);
    process.exit(1);
});
