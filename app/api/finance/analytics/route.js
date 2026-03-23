import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import TrainerPayment from '@/models/TrainerPayment';
import Transaction from '@/models/Transaction';
import Member from '@/models/Member';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    await dbConnect();
    
    try {
        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        let startDate = null;
        let endDate = null;
        const queryDateFilter = {};

        if (startDateParam && endDateParam) {
            startDate = new Date(startDateParam);
            startDate.setHours(0, 0, 0, 0);
            
            endDate = new Date(endDateParam);
            endDate.setHours(23, 59, 59, 999);
            
            queryDateFilter.$gte = startDate;
            queryDateFilter.$lte = endDate;
        } else {
            // Default to 'this month' if missing
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            queryDateFilter.$gte = startDate;
            queryDateFilter.$lte = endDate;
        }

        // 1. Fetch relevant data simultaneously
        const [
            memberPayments,
            trainerPayments,
            transactions,
            allMembers
        ] = await Promise.all([
            Payment.find({ paymentDate: queryDateFilter }).lean(),
            TrainerPayment.find({ paymentDate: queryDateFilter }).lean(),
            Transaction.find({ date: queryDateFilter }).lean(),
            Member.find({ status: 'Active' }).lean() // Fetching all active members to calculate dues
        ]);

        // 2. Aggregate Revenue (Income)
        const revenueBreakdown = {};
        const paymentModes = { cash: 0, upi: 0, card: 0, bank_transfer: 0, cheque: 0 };
        let totalIncome = 0;

        // Process Member Payments (Income)
        memberPayments.forEach(p => {
            const amount = p.amount || 0;
            const category = p.paymentCategory || p.planType || 'Membership';
            const mode = p.paymentMode || 'cash';

            revenueBreakdown[category] = (revenueBreakdown[category] || 0) + amount;
            paymentModes[mode] = (paymentModes[mode] || 0) + amount;
            totalIncome += amount;
        });

        // Process Custom Transactions (Income only)
        transactions.filter(t => t.type === 'income').forEach(t => {
            const amount = t.amount || 0;
            const category = t.category || 'General';
            const mode = t.paymentMode || 'cash';

            revenueBreakdown[category] = (revenueBreakdown[category] || 0) + amount;
            paymentModes[mode] = (paymentModes[mode] || 0) + amount;
            totalIncome += amount;
        });

        // Convert revenue breakdown to array for Recharts
        const revenueChartData = Object.entries(revenueBreakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        // 3. Aggregate Expenses
        const expenseBreakdown = {};
        let totalExpense = 0;

        // Process Trainer Payments (Expense)
        trainerPayments.forEach(p => {
            const amount = p.amount || 0;
            const category = 'Trainer Salary';

            expenseBreakdown[category] = (expenseBreakdown[category] || 0) + amount;
            totalExpense += amount;
        });

        // Process Custom Transactions (Expense only)
        transactions.filter(t => t.type === 'expense').forEach(t => {
            const amount = t.amount || 0;
            const category = t.category || 'General';

            expenseBreakdown[category] = (expenseBreakdown[category] || 0) + amount;
            totalExpense += amount;
        });

        // Convert expense breakdown to array for Recharts
        const expenseChartData = Object.entries(expenseBreakdown).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

        // 4. Time-Series Trend
        const trendMap = {};
        
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isMonthly = diffDays > 60; // Group by month if range > 2 months

        const getGroupKey = (d) => {
            const dateObj = new Date(d);
            if (isMonthly) {
                return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            }
            return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`; // YYYY-MM-DD
        };

        const getGroupLabel = (key) => {
            const parts = key.split('-');
            if (isMonthly) {
                const dateObj = new Date(parts[0], parseInt(parts[1]) - 1, 1);
                return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            } else {
                const dateObj = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
                return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        };

        // Pre-fill range to ensure continuous lines
        if (isMonthly) {
            let cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            while (cur <= endDate) {
                const key = getGroupKey(cur);
                trendMap[key] = { sortKey: key, income: 0, expense: 0 };
                cur.setMonth(cur.getMonth() + 1);
            }
        } else if (diffDays <= 60) {
            let cur = new Date(startDate.getFullYear(), Math.max(0, startDate.getMonth()), startDate.getDate());
            while (cur <= endDate) {
                const key = getGroupKey(cur);
                trendMap[key] = { sortKey: key, income: 0, expense: 0 };
                cur.setDate(cur.getDate() + 1);
            }
        }

        memberPayments.forEach(p => {
            const key = getGroupKey(p.paymentDate);
            if (!trendMap[key]) trendMap[key] = { sortKey: key, income: 0, expense: 0 };
            trendMap[key].income += p.amount;
        });
        transactions.filter(t => t.type === 'income').forEach(t => {
            const key = getGroupKey(t.date);
            if (!trendMap[key]) trendMap[key] = { sortKey: key, income: 0, expense: 0 };
            trendMap[key].income += t.amount;
        });
        trainerPayments.forEach(p => {
            const key = getGroupKey(p.paymentDate);
            if (!trendMap[key]) trendMap[key] = { sortKey: key, income: 0, expense: 0 };
            trendMap[key].expense += p.amount;
        });
        transactions.filter(t => t.type === 'expense').forEach(t => {
            const key = getGroupKey(t.date);
            if (!trendMap[key]) trendMap[key] = { sortKey: key, income: 0, expense: 0 };
            trendMap[key].expense += t.amount;
        });

        // Convert, format date labels, and strictly sort
        const trendChartData = Object.values(trendMap)
            .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
            .map(item => ({ date: getGroupLabel(item.sortKey), income: item.income, expense: item.expense }));

        // 5. Calculate Pending Dues List
        const pendingDuesList = [];
        allMembers.forEach(member => {
            const totalDue = (member.totalPlanPrice || 0) + (member.admissionFeeAmount || 0);
            const totalPaid = member.totalPaid || 0;
            const currentBalance = totalDue - totalPaid;
            
            if (currentBalance > 0 && ['unpaid', 'partial'].includes(member.paymentStatus)) {
                pendingDuesList.push({
                    _id: member._id,
                    name: member.name,
                    phone: member.phone,
                    totalDue: totalDue,
                    totalPaid: totalPaid,
                    balance: currentBalance,
                    status: member.paymentStatus,
                    planEndDate: member.membershipEndDate
                });
            }
        });
        
        pendingDuesList.sort((a, b) => b.balance - a.balance); // Highest dues first

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalIncome,
                    totalExpense,
                    netBalance: totalIncome - totalExpense
                },
                revenueBreakdown: revenueChartData,
                expenseBreakdown: expenseChartData,
                paymentModes,
                trend: trendChartData,
                pendingDues: pendingDuesList
            }
        });

    } catch (error) {
        console.error('Finance Analytics GET Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
