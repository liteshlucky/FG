import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import TrainerPayment from '@/models/TrainerPayment';
import Transaction from '@/models/Transaction';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
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
            // Cycle: 21st of previous month to 20th of current month
            const now = new Date();
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 21);
            endDate = new Date(now.getFullYear(), now.getMonth(), 20, 23, 59, 59, 999);
            
            queryDateFilter.$gte = startDate;
            queryDateFilter.$lte = endDate;
        }

        // 1b. Determine the exact Trainer Cycle (21st to 20th) based on the endDate context
        const cycleRefDate = endDate || new Date();
        const cycleStart = new Date(cycleRefDate.getFullYear(), cycleRefDate.getMonth() - 1, 21);
        const cycleEnd = new Date(cycleRefDate.getFullYear(), cycleRefDate.getMonth(), 20, 23, 59, 59, 999);

        // 1. Fetch relevant data simultaneously
        const [
            memberPayments,
            trainerCyclePayments,
            trainerPayments,
            transactions,
            allMembers,
            trainers
        ] = await Promise.all([
            Payment.find({ paymentDate: queryDateFilter }).lean(),
            Payment.find({ 
                paymentDate: { $gte: cycleStart, $lte: cycleEnd },
                planType: { $in: ['PTplan', 'pt_plan'] },
                paymentStatus: 'completed'
            }).lean(),
            TrainerPayment.find({ paymentDate: queryDateFilter }).lean(),
            Transaction.find({ date: queryDateFilter }).lean(),
            Member.find().lean(), // Fetch all to accurately map past payments and dues
            Trainer.find({ role: 'Trainer' }).lean()
        ]);

        const trainerStats = {};
        trainers.forEach(t => {
            trainerStats[t._id.toString()] = {
                id: t._id,
                name: t.name,
                profilePicture: t.profilePicture || t.imageUrl || '',
                ptTarget: t.ptTarget || 20,
                ptCount: 0,
                revenue: 0,
                clients: []
            };
        });

        const memberMap = {};
        allMembers.forEach(m => {
            memberMap[m._id.toString()] = m;
        });

        // 2. Aggregate Revenue (Income)
        const revenueBreakdown = {};
        const paymentModes = { cash: 0, upi: 0, card: 0, bank_transfer: 0, cheque: 0 };
        let totalIncome = 0;

        const ptVsMembership = { 'PT': 0, 'Membership': 0, 'Other': 0 };
        const ptVsMembershipCount = { 'PT': 0, 'Membership': 0, 'Other': 0 };

        const newVsRenewal = {
            'New Member': { count: 0, revenue: 0, list: [] },
            'Renewal': { count: 0, revenue: 0, list: [] },
            'Dues': { count: 0, revenue: 0, list: [] },
            'Other': { count: 0, revenue: 0, list: [] }
        };

        // Build a map of primary member actions per day to properly categorize same-day dues
        const memberDailyActions = {};
        memberPayments.forEach(p => {
            const type = (p.planType || '').toLowerCase();
            const category = p.paymentCategory || p.planType || '';
            if (type !== 'pt_plan' && type !== 'ptplan' && category !== 'PT Plan') {
                const action = (p.membershipAction || 'none').toLowerCase();
                if (action === 'new' || action === 'renewal') {
                    const dateStr = new Date(p.paymentDate).toISOString().split('T')[0];
                    const memberId = p.memberId?.toString();
                    if (memberId) {
                        if (!memberDailyActions[memberId]) {
                            memberDailyActions[memberId] = {};
                        }
                        memberDailyActions[memberId][dateStr] = action === 'new' ? 'New Member' : 'Renewal';
                    }
                }
            }
        });

        // Process Member Payments (Income)
        memberPayments.forEach(p => {
            const amount = p.amount || 0;
            const category = p.paymentCategory || p.planType || 'Membership';
            const mode = p.paymentMode || 'cash';
            const type = (p.planType || '').toLowerCase();

            revenueBreakdown[category] = (revenueBreakdown[category] || 0) + amount;
            paymentModes[mode] = (paymentModes[mode] || 0) + amount;
            totalIncome += amount;

            if (type === 'pt_plan' || type === 'ptplan' || category === 'PT Plan') {
                ptVsMembership['PT'] += amount;
                ptVsMembershipCount['PT'] += 1;
                // Note: We no longer attribute UPFRONT PT revenue to trainers here
                // Revenue is now recognized monthly (accrual basis) in the next section.
            } else if (type === 'membership' || type === 'plan' || category === 'Plan') {
                ptVsMembership['Membership'] += amount;
                ptVsMembershipCount['Membership'] += 1;
            } else {
                ptVsMembership['Other'] += amount;
                ptVsMembershipCount['Other'] += 1;
            }

            // New vs Renewal Tracking (Exclude PT Plans)
            if (type !== 'pt_plan' && type !== 'ptplan' && category !== 'PT Plan') {
                const action = (p.membershipAction || 'none').toLowerCase();
                const payCategory = p.paymentCategory || '';
                
                let categoryKey = 'Other';
                const dateStr = new Date(p.paymentDate).toISOString().split('T')[0];
                const memberId = p.memberId?.toString();

                if (action === 'new') {
                    categoryKey = 'New Member';
                } else if (action === 'renewal') {
                    categoryKey = 'Renewal';
                } else if (payCategory === 'Due Amount' || action === 'none') {
                    if (memberId && memberDailyActions[memberId] && memberDailyActions[memberId][dateStr]) {
                        categoryKey = memberDailyActions[memberId][dateStr];
                    } else {
                        categoryKey = 'Dues';
                    }
                }
                
                newVsRenewal[categoryKey].count += 1;
                newVsRenewal[categoryKey].revenue += amount;
                
                const memberObj = memberMap[p.memberId?.toString()];
                newVsRenewal[categoryKey].list.push({
                    paymentId: p._id,
                    memberName: memberObj ? memberObj.name : 'Unknown',
                    memberIdStr: memberObj ? memberObj.memberId : '-',
                    memberObjId: memberObj ? memberObj._id : p.memberId,
                    amount: amount,
                    paymentDate: p.paymentDate,
                    paymentMode: mode,
                    planType: p.planType || 'Membership'
                });
            }
        });

        // 2b. Recognize PT Revenue (Cash Basis - strictly based on 21st to 20th trainer cycle)
        trainerCyclePayments.forEach(p => {
            const amount = p.amount || 0;
            
            const memberObj = memberMap[p.memberId?.toString()];
            if (memberObj && memberObj.trainerId) {
                const tId = memberObj.trainerId.toString();
                
                if (trainerStats[tId]) {
                    // Calculate months duration for display
                    const ptStart = new Date(memberObj.ptStartDate);
                    const ptEnd = new Date(memberObj.ptEndDate);
                    const diffTime = Math.abs(ptEnd - ptStart);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const monthsDuration = Math.max(1, Math.round(diffDays / 30)) || 1;
                    
                    trainerStats[tId].ptCount += 1;
                    trainerStats[tId].revenue += amount;
                    trainerStats[tId].clients.push({
                        id: memberObj._id,
                        name: memberObj.name,
                        memberId: memberObj.memberId || '-',
                        ptStartDate: memberObj.ptStartDate,
                        ptEndDate: memberObj.ptEndDate,
                        ptTotalPlanPrice: memberObj.ptTotalPlanPrice || amount,
                        monthsDuration: monthsDuration,
                        monthlyRevenue: amount, // Use full payment amount
                        paymentDate: p.paymentDate
                    });
                }
            }
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

        const ptVsMembershipData = Object.entries(ptVsMembership)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value, count: ptVsMembershipCount[name] || 0 }))
            .sort((a, b) => b.value - a.value);

        const newVsRenewalData = Object.entries(newVsRenewal)
            .filter(([_, data]) => data.count > 0 || data.revenue > 0)
            .map(([name, data]) => ({ name, value: data.revenue, count: data.count, list: data.list }))
            .sort((a, b) => b.value - a.value);
        
        // Also return the date range so the UI can display it
        const reportDateRange = {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };

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
                reportDateRange,
                revenueBreakdown: revenueChartData,
                ptVsMembership: ptVsMembershipData,
                newVsRenewal: newVsRenewalData,
                expenseBreakdown: expenseChartData,
                paymentModes,
                trend: trendChartData,
                pendingDues: pendingDuesList,
                trainerLeaderboard: Object.values(trainerStats).map(t => {
                    // Calculate Incentive
                    // First 7 members: 40% of their revenue
                    // 8th member onward: 50% of their revenue
                    // We use the average revenue per member for the tiers
                    let incentive = 0;
                    const enrichedClients = [];
                    if (t.ptCount > 0) {
                        // Sort clients chronologically by payment date
                        const sortedClients = [...t.clients].sort((a, b) => new Date(a.paymentDate) - new Date(b.paymentDate));

                        sortedClients.forEach((client, index) => {
                            const rate = (index < 7) ? 0.40 : 0.50;
                            const clientIncentive = (client.monthlyRevenue || 0) * rate;
                            incentive += clientIncentive;
                            
                            enrichedClients.push({
                                ...client,
                                rate: rate * 100,
                                incentive: Math.round(clientIncentive)
                            });
                        });
                    }

                    return {
                        ...t,
                        clients: enrichedClients,
                        incentive: Math.round(incentive),
                        targetMet: t.ptCount >= t.ptTarget,
                        targetGoal: t.ptTarget
                    };
                }).sort((a, b) => (b.revenue - a.revenue) || (b.ptCount - a.ptCount))
            }
        });

    } catch (error) {
        console.error('Finance Analytics GET Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
