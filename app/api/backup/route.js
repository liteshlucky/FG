import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Payment from '@/models/Payment';
import Plan from '@/models/Plan';
import PTplan from '@/models/PTplan';
import Discount from '@/models/Discount';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        const members = await Member.find({});
        const trainers = await Trainer.find({});
        const payments = await Payment.find({});
        const plans = await Plan.find({});
        const ptPlans = await PTplan.find({});
        const discounts = await Discount.find({});

        const data = {
            members,
            trainers,
            payments,
            plans,
            ptPlans,
            discounts,
            timestamp: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { members, trainers, payments, plans, ptPlans, discounts } = body;

        // Helper for bulk upsert
        const bulkUpsert = async (Model, items) => {
            if (!items || items.length === 0) return;
            const operations = items.map((item) => ({
                updateOne: {
                    filter: { _id: item._id },
                    update: { $set: item },
                    upsert: true,
                },
            }));
            await Model.bulkWrite(operations);
        };

        await bulkUpsert(Member, members);
        await bulkUpsert(Trainer, trainers);
        await bulkUpsert(Payment, payments);
        await bulkUpsert(Plan, plans);
        await bulkUpsert(PTplan, ptPlans);
        await bulkUpsert(Discount, discounts);

        return NextResponse.json({ success: true, message: 'Data imported successfully' });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
