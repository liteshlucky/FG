import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        // Use MongoDB's updateMany to add fields to ALL members
        const result = await Member.collection.updateMany(
            {}, // Match all documents
            {
                $set: {
                    age: { $cond: { if: { $eq: ['$age', null] }, then: Math.floor(Math.random() * (60 - 18 + 1)) + 18, else: '$age' } },
                    gender: 'Male', // Default value
                    bodyMeasurements: {
                        height: 175,
                        weight: 75,
                        chest: 40,
                        waist: 32,
                        hips: 38,
                        arms: 14,
                        thighs: 22
                    }
                }
            }
        );

        // Now update each member individually with random values
        const members = await Member.find({});
        let updated = 0;

        for (const member of members) {
            await Member.updateOne(
                { _id: member._id },
                {
                    $set: {
                        age: Math.floor(Math.random() * (60 - 18 + 1)) + 18,
                        gender: Math.random() > 0.5 ? 'Male' : 'Female',
                        bodyMeasurements: {
                            height: Math.floor(Math.random() * (190 - 150 + 1)) + 150,
                            weight: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
                            chest: Math.floor(Math.random() * (45 - 30 + 1)) + 30,
                            waist: Math.floor(Math.random() * (40 - 24 + 1)) + 24,
                            hips: Math.floor(Math.random() * (45 - 30 + 1)) + 30,
                            arms: Math.floor(Math.random() * (18 - 10 + 1)) + 10,
                            thighs: Math.floor(Math.random() * (25 - 18 + 1)) + 18,
                        },
                        medicalHistory: Math.random() > 0.8 ? 'Minor injury history' : 'None',
                        goals: Math.random() > 0.5 ? 'Weight Loss' : 'Muscle Gain'
                    }
                }
            );
            updated++;
        }

        return NextResponse.json({
            success: true,
            message: `Force updated ${updated} members with physical stats.`,
            mongoResult: result
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
