import dbConnect from '@/lib/db';
import Trainer from '@/models/Trainer';
import Member from '@/models/Member';
import PTplan from '@/models/PTplan';
import Payment from '@/models/Payment';
import { NextResponse } from 'next/server';


export const dynamic = 'force-dynamic';
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

        // Cycle logic: 21st to 20th
        const now = new Date();
        const cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, 21);
        const cycleEnd = new Date(now.getFullYear(), now.getMonth(), 20, 23, 59, 59, 999);

        // Find all members assigned to this trainer
        const assignedMembers = await Member.find({ trainerId: id });
        const memberIds = assignedMembers.map(m => m._id);

        // Fetch payments made strictly within this cycle
        const payments = await Payment.find({
            memberId: { $in: memberIds },
            paymentDate: { $gte: cycleStart, $lte: cycleEnd },
            planType: { $in: ['PTplan', 'pt_plan'] },
            paymentStatus: 'completed'
        }).populate('memberId');

        let commissionAmount = 0;
        const memberDetails = [];

        // Sort payments by payment date ascending for tier application
        payments.sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));

        payments.forEach((payment, index) => {
            const member = payment.memberId;
            if (!member) return;

            // Full payment amount is attributed to the cycle
            const revenue = payment.amount || 0;

            // Estimate months for display
            const ptStart = new Date(member.ptStartDate);
            const ptEnd = new Date(member.ptEndDate);
            const diffDays = Math.ceil(Math.abs(ptEnd - ptStart) / (1000 * 60 * 60 * 24));
            const monthsDuration = Math.max(1, Math.round(diffDays / 30)) || 1;

            const rate = (index < 7) ? 0.40 : 0.50;
            const incentive = revenue * rate;
            commissionAmount += incentive;

            memberDetails.push({
                name: member.name,
                memberId: member.memberId || '-',
                planPrice: member.ptTotalPlanPrice || revenue,
                months: monthsDuration,
                monthlyRevenue: revenue, // We use the full amount as the recognized revenue
                ptStartDate: member.ptStartDate,
                ptEndDate: member.ptEndDate,
                paymentDate: payment.paymentDate,
                rate: rate * 100,
                incentive: Math.round(incentive)
            });
        });

        // Calculate Leave Deductions
        const cycleLeaves = trainer.leaves.filter(leaveDate => {
            const d = new Date(leaveDate);
            return d >= cycleStart && d <= cycleEnd;
        });

        const leaveDays = cycleLeaves.length;
        const dailySalary = (trainer.baseSalary || 0) / 30;
        const leaveDeduction = Math.round(leaveDays * dailySalary);

        const salaryData = {
            baseSalary: trainer.baseSalary || 0,
            commissionAmount: Math.round(commissionAmount),
            leaveDays,
            leaveDeduction,
            totalSalary: (trainer.baseSalary || 0) + Math.round(commissionAmount) - leaveDeduction,
            totalAssignedMembers: assignedMembers.length,
            cyclePaymentCount: payments.length,
            cycleStart: cycleStart.toISOString(),
            cycleEnd: cycleEnd.toISOString(),
            memberDetails
        };

        return NextResponse.json({ success: true, data: salaryData });
    } catch (error) {
        console.error('Salary calculation error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
