import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        await dbConnect();

        // Update all existing payments to use new enum values
        const result = await Payment.updateMany(
            { planType: 'membership' },
            { $set: { planType: 'Plan' } }
        );

        const result2 = await Payment.updateMany(
            { planType: 'pt_plan' },
            { $set: { planType: 'PTplan' } }
        );

        return NextResponse.json({
            success: true,
            message: 'Payment records migrated successfully',
            updated: {
                membership: result.modifiedCount,
                ptPlan: result2.modifiedCount
            }
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
