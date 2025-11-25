import dbConnect from '../../../../../lib/db';
import Trainer from '../../../../../models/Trainer';
import Member from '../../../../../models/Member';
import Payment from '../../../../../models/Payment';
import { NextResponse } from 'next/server';

// Helper to calculate salary for a given month/year
async function calculateSalary(trainer, month, year) {
    // Base salary pro-rated
    const commissionStartDate = new Date(year, month - 1, 21);
    const commissionEndDate = new Date(year, month, 20);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month, daysInMonth);
    const leavesInCalendarMonth = (trainer.leaves || []).filter((d) => {
        const date = new Date(d);
        return date >= firstDayOfMonth && date <= lastDayOfMonth;
    }).length;
    const baseSalaryProRated = trainer.baseSalary
        ? (trainer.baseSalary / daysInMonth) * (daysInMonth - leavesInCalendarMonth)
        : 0;

    // Commission: find PT payments for members linked to this trainer in the cycle
    const members = await Member.find({ trainerId: trainer._id }).select('_id');
    const memberIds = members.map((m) => m._id);
    const payments = await Payment.find({
        memberId: { $in: memberIds },
        type: 'pt',
        date: { $gte: commissionStartDate, $lte: commissionEndDate },
    });
    let commission = 0;
    if (trainer.commissionType === 'fixed') {
        commission = payments.length * trainer.commissionValue;
    } else if (trainer.commissionType === 'percentage') {
        const total = payments.reduce((sum, p) => sum + p.amount, 0);
        commission = (total * trainer.commissionValue) / 100;
    }
    const totalPayable = baseSalaryProRated + commission;
    return { month: month + 1, year, baseSalaryProRated, commission, totalPayable };
}

export async function GET(req, { params }) {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get('months') || '12');
    await dbConnect();
    try {
        const trainer = await Trainer.findById(id);
        if (!trainer) {
            return NextResponse.json({ success: false, error: 'Trainer not found' }, { status: 404 });
        }
        const now = new Date();
        const history = [];
        for (let i = 0; i < months; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const record = await calculateSalary(trainer, date.getMonth(), date.getFullYear());
            history.push(record);
        }
        return NextResponse.json({ success: true, data: history });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
