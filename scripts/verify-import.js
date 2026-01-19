
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Member from '../models/Member.js';
import Payment from '../models/Payment.js';
import Plan from '../models/Plan.js';
import PTplan from '../models/PTplan.js';

dotenv.config({ path: '.env.local' });

async function verify() {
    await mongoose.connect(process.env.MONGODB_URI);

    const members = await Member.countDocuments();
    const payments = await Payment.countDocuments();
    const plans = await Plan.countDocuments();
    const ptPlans = await PTplan.countDocuments();

    // Revenue
    const revenue = await Payment.aggregate([
        { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenue[0]?.total || 0;

    // By Type
    const byType = await Payment.aggregate([
        { $group: { _id: "$planType", total: { $sum: "$amount" }, count: { $sum: 1 } } }
    ]);

    console.log('--- Analysis & Verification ---');
    console.log(`Total Members: ${members}`);
    console.log(`Total Payments: ${payments}`);
    console.log(`Total Revenue: ₹${totalRevenue}`);
    console.log('\nRevenue by Type:');
    byType.forEach(t => console.log(` - ${t._id}: ₹${t.total} (${t.count} payments)`));

    const sample = await Member.findOne({ memberId: '94' }).populate('planId');
    if (sample) {
        console.log('\nSample Member (MID: 94):');
        console.log(`Name: ${sample.name}`);
        console.log(`Plan: ${sample.planId?.name}`);
        console.log(`Status: ${sample.status}`);

        const memberPayments = await Payment.find({ memberId: sample._id });
        console.log(`Payments found: ${memberPayments.length}`);
    }

    await mongoose.connection.close();
}

verify();
