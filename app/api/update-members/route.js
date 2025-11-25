import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import PTplan from '@/models/PTplan';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        // Fetch all members, trainers, and PT plans
        const members = await Member.find({});
        const trainers = await Trainer.find({});
        const ptPlans = await PTplan.find({});

        if (trainers.length === 0 || ptPlans.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No trainers or PT plans found. Please create them first.'
            }, { status: 400 });
        }

        let updatedCount = 0;
        let ptAssignedCount = 0;

        // Update all members with physical stats
        for (const member of members) {
            const updates = {};

            // Add age, gender, and body measurements if missing (handle both null and undefined)
            if (member.age == null) updates.age = Math.floor(Math.random() * (60 - 18 + 1)) + 18;
            if (member.gender == null) updates.gender = Math.random() > 0.5 ? 'Male' : 'Female';

            // Check if bodyMeasurements is null, undefined, or empty object
            if (member.bodyMeasurements == null ||
                (typeof member.bodyMeasurements === 'object' && Object.keys(member.bodyMeasurements).length === 0)) {
                updates.bodyMeasurements = {
                    height: Math.floor(Math.random() * (190 - 150 + 1)) + 150,
                    weight: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
                    chest: Math.floor(Math.random() * (45 - 30 + 1)) + 30,
                    waist: Math.floor(Math.random() * (40 - 24 + 1)) + 24,
                    hips: Math.floor(Math.random() * (45 - 30 + 1)) + 30,
                    arms: Math.floor(Math.random() * (18 - 10 + 1)) + 10,
                    thighs: Math.floor(Math.random() * (25 - 18 + 1)) + 18,
                };
            }

            if (!member.medicalHistory) {
                updates.medicalHistory = Math.random() > 0.8 ? 'Minor injury history' : 'None';
            }

            if (!member.goals) {
                updates.goals = Math.random() > 0.5 ? 'Weight Loss' : 'Muscle Gain';
            }

            if (Object.keys(updates).length > 0) {
                await Member.findByIdAndUpdate(
                    member._id,
                    { $set: updates },
                    { new: true, runValidators: false }
                );
                updatedCount++;
            }
        }

        // Randomly assign PT plans and trainers to 10-12 members
        const membersWithoutPT = members.filter(m => !m.ptPlanId && !m.trainerId);
        const numToAssign = Math.min(Math.floor(Math.random() * 3) + 10, membersWithoutPT.length); // 10-12 members

        // Shuffle and pick random members
        const shuffled = membersWithoutPT.sort(() => 0.5 - Math.random());
        const selectedMembers = shuffled.slice(0, numToAssign);

        for (const member of selectedMembers) {
            const randomTrainer = trainers[Math.floor(Math.random() * trainers.length)];
            const randomPTPlan = ptPlans[Math.floor(Math.random() * ptPlans.length)];

            await Member.findByIdAndUpdate(member._id, {
                trainerId: randomTrainer._id,
                ptPlanId: randomPTPlan._id,
            });
            ptAssignedCount++;
        }

        return NextResponse.json({
            success: true,
            message: `Updated ${updatedCount} members with physical stats. Assigned PT plans/trainers to ${ptAssignedCount} members.`,
            data: { updated: updatedCount, ptAssigned: ptAssignedCount }
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
