import dbConnect from '@/lib/db';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import Plan from '@/models/Plan';
import Counter from '@/models/Counter';
import { NextResponse } from 'next/server';

const firstNames = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const trainerProfiles = [
    { name: 'Alex Rivera', specialization: 'Strength & Conditioning', bio: 'Expert in building raw strength and power.', baseSalary: 30000, ptFee: 500, commissionType: 'percentage', commissionValue: 10 },
    { name: 'Sarah Chen', specialization: 'Yoga & Flexibility', bio: 'Helping you find balance and flexibility.', baseSalary: 28000, ptFee: 450, commissionType: 'percentage', commissionValue: 15 },
    { name: 'Mike Johnson', specialization: 'HIIT & Cardio', bio: 'High energy workouts for maximum fat burn.', baseSalary: 32000, ptFee: 550, commissionType: 'fixed', commissionValue: 200 },
    { name: 'Emily Davis', specialization: 'Rehabilitation', bio: 'Recover stronger and safer.', baseSalary: 35000, ptFee: 600, commissionType: 'percentage', commissionValue: 12 },
    { name: 'Chris Thompson', specialization: 'Bodybuilding', bio: 'Sculpt your dream physique.', baseSalary: 30000, ptFee: 500, commissionType: 'percentage', commissionValue: 10 }
];

export async function GET() {
    await dbConnect();
    try {
        // 1. Create Trainers
        const createdTrainers = [];
        for (const profile of trainerProfiles) {
            // Check if trainer exists to avoid duplicates on re-run (optional, but good for safety)
            // For simplicity in seed, we'll just create new ones or skip if name exists
            const existing = await Trainer.findOne({ name: profile.name });
            if (existing) {
                createdTrainers.push(existing);
                continue;
            }

            const counter = await Counter.findByIdAndUpdate(
                { _id: 'trainerId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            const trainerId = `TRN${String(counter.seq).padStart(3, '0')}`;

            const trainer = await Trainer.create({ ...profile, trainerId });
            createdTrainers.push(trainer);
        }

        // 2. Fetch Plans (create a dummy one if none exist)
        let plans = await Plan.find({});
        if (plans.length === 0) {
            const plan = await Plan.create({ name: 'Standard Monthly', price: 2000, duration: 1, description: 'Standard access' });
            plans = [plan];
        }

        // 3. Create Members
        const createdMembers = [];
        for (let i = 0; i < 50; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const name = `${firstName} ${lastName}`;
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 1000)}@example.com`;

            // Avoid duplicate emails
            const existingMember = await Member.findOne({ email });
            if (existingMember) continue;

            const counter = await Counter.findByIdAndUpdate(
                { _id: 'memberId' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            const memberId = `MEM${String(counter.seq).padStart(3, '0')}`;

            const randomPlan = plans[Math.floor(Math.random() * plans.length)];
            const randomTrainer = Math.random() > 0.3 ? createdTrainers[Math.floor(Math.random() * createdTrainers.length)] : null; // 70% chance of having a trainer

            const member = await Member.create({
                memberId,
                name,
                email,
                phone: `9${Math.floor(Math.random() * 1000000000)}`, // Random 10 digit phone starting with 9
                status: Math.random() > 0.1 ? 'Active' : 'Expired', // 90% active
                planId: randomPlan._id,
                trainerId: randomTrainer ? randomTrainer._id : null,
                joinDate: new Date(Date.now() - Math.floor(Math.random() * 10000000000)), // Random date in past ~4 months
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
                goals: Math.random() > 0.5 ? 'Weight Loss' : 'Muscle Gain',
            });
            createdMembers.push(member);
        }

        return NextResponse.json({
            success: true,
            message: `Seeded ${createdTrainers.length} trainers and ${createdMembers.length} members.`,
            data: { trainers: createdTrainers.length, members: createdMembers.length }
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
