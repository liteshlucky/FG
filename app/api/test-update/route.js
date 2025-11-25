import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        // Get first member
        const member = await Member.findOne({});

        console.log('Before update:', {
            name: member.name,
            age: member.age,
            gender: member.gender,
            bodyMeasurements: member.bodyMeasurements
        });

        // Try updating
        const updated = await Member.findByIdAndUpdate(
            member._id,
            {
                $set: {
                    age: 25,
                    gender: 'Male',
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
            },
            { new: true }
        );

        console.log('After update:', {
            name: updated.name,
            age: updated.age,
            gender: updated.gender,
            bodyMeasurements: updated.bodyMeasurements
        });

        return NextResponse.json({
            success: true,
            before: {
                name: member.name,
                age: member.age,
                gender: member.gender,
                bodyMeasurements: member.bodyMeasurements
            },
            after: {
                name: updated.name,
                age: updated.age,
                gender: updated.gender,
                bodyMeasurements: updated.bodyMeasurements
            }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
