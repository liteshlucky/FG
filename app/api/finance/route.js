import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import TrainerPayment from '@/models/TrainerPayment';
import Transaction from '@/models/Transaction';
import { NextResponse } from 'next/server';

export async function GET(request) {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const type = searchParams.get('type'); // 'income', 'expense', or null for all

    try {
        const query = {};
        if (startDate && endDate) {
            query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        // Fetch Member Payments (Income)
        let memberPayments = [];
        if (!type || type === 'income') {
            const paymentQuery = {};
            if (startDate && endDate) {
                paymentQuery.paymentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }
            memberPayments = await Payment.find(paymentQuery).populate('memberId', 'name').lean();
        }

        // Fetch Trainer Payments (Expense)
        let trainerPayments = [];
        if (!type || type === 'expense') {
            const trainerQuery = {};
            if (startDate && endDate) {
                trainerQuery.paymentDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }
            trainerPayments = await TrainerPayment.find(trainerQuery).populate('trainerId', 'name').lean();
        }

        // Fetch Custom Transactions (Income/Expense)
        let transactions = [];
        const transactionQuery = {};
        if (startDate && endDate) {
            transactionQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }
        if (type) {
            transactionQuery.type = type;
        }
        transactions = await Transaction.find(transactionQuery).lean();

        // Normalize and Merge Data
        const allRecords = [
            ...memberPayments.map(p => ({
                _id: p._id,
                date: p.paymentDate,
                title: `Membership: ${p.memberId?.name || 'Unknown'}`,
                amount: p.amount,
                type: 'income',
                category: 'Membership',
                mode: p.paymentMode,
                isSystem: true
            })),
            ...trainerPayments.map(p => ({
                _id: p._id,
                date: p.paymentDate,
                title: `Salary: ${p.trainerId?.name || 'Unknown'}`,
                amount: p.amount,
                type: 'expense',
                category: 'Salary',
                mode: p.paymentMode,
                isSystem: true
            })),
            ...transactions.map(t => ({
                _id: t._id,
                date: t.date,
                title: t.title,
                amount: t.amount,
                type: t.type,
                category: t.category,
                mode: t.paymentMode,
                isSystem: false
            }))
        ];

        // Sort by date descending
        allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate Summary
        const summary = allRecords.reduce((acc, curr) => {
            if (curr.type === 'income') acc.totalIncome += curr.amount;
            if (curr.type === 'expense') acc.totalExpense += curr.amount;
            return acc;
        }, { totalIncome: 0, totalExpense: 0 });

        summary.netBalance = summary.totalIncome - summary.totalExpense;

        return NextResponse.json({ success: true, data: { summary, records: allRecords } });

    } catch (error) {
        console.error('Finance API Error:', error);
        console.error(error.stack);
        return NextResponse.json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

export async function POST(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const transaction = await Transaction.create(body);
        return NextResponse.json({ success: true, data: transaction }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Transaction ID missing' }, { status: 400 });
        }

        const deletedTransaction = await Transaction.findByIdAndDelete(id);

        if (!deletedTransaction) {
            return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: deletedTransaction });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
