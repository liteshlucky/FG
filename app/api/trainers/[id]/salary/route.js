import dbConnect from '@/lib/db';
import Trainer from '@/models/Trainer';
import Member from '@/models/Member';
import PTplan from '@/models/PTplan';
import { NextResponse } from 'next/server';

export async function GET(request) {
    // Extract trainer ID from the request URL
    const pathname = request.nextUrl?.pathname || new URL(request.url).pathname;
    // Expected pattern: /api/trainers/<id>/salary
    const parts = pathname.split('/');
    const id = parts[3] ?? parts[parts.length - 2];

    console.log('Salary GET extracted id:', id);
    await dbConnect();

    if (!id) {
        return NextResponse.json({ success: false, error: 'Trainer ID missing' }, { status: 400 });
    }

    try {
        const trainer = await Trainer.findById(id);
        if (!trainer) {
            return NextResponse.json({ success: false, error: 'Trainer not found' }, { status: 404 });
        }

        // Find active members assigned to this trainer for PT
        const assignedMembers = await Member.find({
            trainerId: id,
            status: 'Active',
            ptPlanId: { $ne: null }
        }).populate('ptPlanId');

        let commissionAmount = 0;
        const memberDetails = [];

        if (trainer.commissionType === 'fixed') {
            commissionAmount = assignedMembers.length * (trainer.commissionValue || 0);
        } else if (trainer.commissionType === 'percentage') {
            const totalPtRevenue = assignedMembers.reduce((sum, member) => {
                return sum + (member.ptPlanId?.price || 0);
            }, 0);
            commissionAmount = (totalPtRevenue * (trainer.commissionValue || 0)) / 100;
        }

        // Prepare member details for the UI
        assignedMembers.forEach(member => {
            memberDetails.push({
                name: member.name,
                planName: member.ptPlanId?.name || 'Unknown Plan',
                planPrice: member.ptPlanId?.price || 0
            });
        });

        const salaryData = {
            baseSalary: trainer.baseSalary || 0,
            commissionAmount: Math.round(commissionAmount),
            totalSalary: (trainer.baseSalary || 0) + Math.round(commissionAmount),
            activeMembersCount: assignedMembers.length,
            memberDetails
        };

        return NextResponse.json({ success: true, data: salaryData });
    } catch (error) {
        console.error('Salary calculation error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
