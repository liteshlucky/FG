import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import TrainerPayment from '@/models/TrainerPayment';
import Transaction from '@/models/Transaction';
import Member from '@/models/Member';
import Trainer from '@/models/Trainer';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const months = parseInt(searchParams.get('months') || '12');
        const compareMode = searchParams.get('compare'); // 'month' or 'year'

        // Calculate date ranges
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        // Comparison date ranges
        let compareStartDate, compareEndDate;
        if (compareMode === 'month') {
            compareEndDate = new Date(startDate);
            compareStartDate = new Date(compareEndDate);
            compareStartDate.setMonth(compareStartDate.getMonth() - months);
        } else if (compareMode === 'year') {
            compareEndDate = new Date(startDate);
            compareStartDate = new Date(compareEndDate);
            compareStartDate.setFullYear(compareStartDate.getFullYear() - 1);
        }

        // Fetch all data
        const [payments, trainerPayments, transactions, members, trainers] = await Promise.all([
            Payment.find({ paymentDate: { $gte: startDate, $lte: endDate } })
                .populate('memberId', 'name joinDate')
                .lean(),
            TrainerPayment.find({ paymentDate: { $gte: startDate, $lte: endDate } })
                .populate('trainerId', 'name')
                .lean(),
            Transaction.find({ date: { $gte: startDate, $lte: endDate } }).lean(),
            Member.find().lean(),
            Trainer.find().lean()
        ]);

        // 1. REVENUE BREAKDOWN (Membership vs PT vs Other)
        const revenueBreakdown = {
            membership: 0,
            pt: 0,
            other: 0
        };

        payments.forEach(p => {
            if (p.planType === 'membership') {
                revenueBreakdown.membership += p.amount;
            } else if (p.planType === 'pt_plan') {
                revenueBreakdown.pt += p.amount;
            }
        });

        transactions.forEach(t => {
            if (t.type === 'income') {
                revenueBreakdown.other += t.amount;
            }
        });

        const totalRevenue = revenueBreakdown.membership + revenueBreakdown.pt + revenueBreakdown.other;

        // 2. DISCOUNT IMPACT ANALYSIS
        const discountAnalysis = {
            totalDiscounts: 0,
            discountedTransactions: 0,
            averageDiscount: 0,
            potentialRevenue: 0
        };

        // Note: Payment model doesn't have discountAmount field yet
        // This is a placeholder for when it's added
        payments.forEach(p => {
            if (p.discountAmount) {
                discountAnalysis.totalDiscounts += p.discountAmount;
                discountAnalysis.discountedTransactions++;
            }
        });

        if (discountAnalysis.discountedTransactions > 0) {
            discountAnalysis.averageDiscount = discountAnalysis.totalDiscounts / discountAnalysis.discountedTransactions;
        }
        discountAnalysis.potentialRevenue = totalRevenue + discountAnalysis.totalDiscounts;

        // 3. REVENUE PER TRAINER & COMMISSION BREAKDOWN
        const trainerMetrics = {};

        trainers.forEach(trainer => {
            trainerMetrics[trainer._id.toString()] = {
                name: trainer.name,
                totalRevenue: 0,
                baseSalary: 0,
                commission: 0,
                totalPaid: 0,
                sessions: 0
            };
        });

        // Calculate PT revenue per trainer
        payments.forEach(p => {
            if (p.planType === 'pt_plan' && p.planId && p.planId.trainerId) {
                const trainerId = p.planId.trainerId.toString();
                if (trainerMetrics[trainerId]) {
                    trainerMetrics[trainerId].totalRevenue += p.amount;
                    trainerMetrics[trainerId].sessions++;
                }
            }
        });

        // Add trainer payments
        trainerPayments.forEach(tp => {
            const trainerId = tp.trainerId._id ? tp.trainerId._id.toString() : tp.trainerId.toString();
            if (trainerMetrics[trainerId]) {
                trainerMetrics[trainerId].baseSalary += tp.baseSalary || 0;
                trainerMetrics[trainerId].commission += tp.commissionAmount || 0;
                trainerMetrics[trainerId].totalPaid += tp.amount;
            }
        });

        // Convert to array and sort by revenue
        const trainerPerformance = Object.values(trainerMetrics)
            .sort((a, b) => b.totalRevenue - a.totalRevenue);

        // 4. PROFIT MARGIN BY MEMBERSHIP TYPE
        const profitMargins = {
            membership: { revenue: revenueBreakdown.membership, costs: 0, margin: 0 },
            pt: { revenue: revenueBreakdown.pt, costs: 0, margin: 0 }
        };

        // PT costs = trainer commissions
        profitMargins.pt.costs = trainerPayments.reduce((sum, tp) => sum + (tp.commissionAmount || 0), 0);
        profitMargins.pt.margin = profitMargins.pt.revenue > 0
            ? ((profitMargins.pt.revenue - profitMargins.pt.costs) / profitMargins.pt.revenue * 100).toFixed(2)
            : 0;

        // Membership costs = operational overhead (simplified)
        profitMargins.membership.costs = trainerPayments.reduce((sum, tp) => sum + (tp.baseSalary || 0), 0);
        profitMargins.membership.margin = profitMargins.membership.revenue > 0
            ? ((profitMargins.membership.revenue - profitMargins.membership.costs) / profitMargins.membership.revenue * 100).toFixed(2)
            : 0;

        // 5. COST PER MEMBER ACQUISITION
        const newMembers = members.filter(m => {
            const joinDate = new Date(m.joinDate);
            return joinDate >= startDate && joinDate <= endDate;
        });

        const memberAcquisition = {
            newMembers: newMembers.length,
            totalMembers: members.length,
            // Marketing costs would come from Transaction expenses
            marketingCosts: transactions
                .filter(t => t.type === 'expense' && (t.category?.toLowerCase().includes('marketing') || t.category?.toLowerCase().includes('advertising')))
                .reduce((sum, t) => sum + t.amount, 0),
            costPerAcquisition: 0
        };

        if (memberAcquisition.newMembers > 0) {
            memberAcquisition.costPerAcquisition = Math.round(memberAcquisition.marketingCosts / memberAcquisition.newMembers);
        }

        // 6. COMPARISON DATA (if requested)
        let comparisonData = null;
        if (compareMode && compareStartDate && compareEndDate) {
            const [comparePayments, compareTransactions] = await Promise.all([
                Payment.find({ paymentDate: { $gte: compareStartDate, $lte: compareEndDate } }).lean(),
                Transaction.find({ date: { $gte: compareStartDate, $lte: compareEndDate } }).lean()
            ]);

            const compareRevenue = {
                membership: comparePayments.filter(p => p.planType === 'membership').reduce((sum, p) => sum + p.amount, 0),
                pt: comparePayments.filter(p => p.planType === 'pt_plan').reduce((sum, p) => sum + p.amount, 0),
                other: compareTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
            };

            const compareTotal = compareRevenue.membership + compareRevenue.pt + compareRevenue.other;

            comparisonData = {
                revenue: compareTotal,
                growth: totalRevenue > 0 ? (((totalRevenue - compareTotal) / compareTotal) * 100).toFixed(2) : 0,
                breakdown: compareRevenue
            };
        }

        // 7. CASH FLOW PROJECTIONS (6 months)
        const cashFlowProjections = await generateCashFlowProjections({
            payments,
            transactions,
            trainerPayments,
            months: 6
        });

        // 8. LOCAL INSIGHTS (Festival Impact)
        const localInsights = await generateLocalInsights({
            payments,
            transactions,
            startDate,
            endDate
        });

        // 9. AI PREDICTIONS (Moved to separate endpoint)
        const aiPredictions = null;

        return NextResponse.json({
            success: true,
            data: {
                revenueBreakdown: {
                    ...revenueBreakdown,
                    total: totalRevenue,
                    percentages: {
                        membership: totalRevenue > 0 ? ((revenueBreakdown.membership / totalRevenue) * 100).toFixed(1) : 0,
                        pt: totalRevenue > 0 ? ((revenueBreakdown.pt / totalRevenue) * 100).toFixed(1) : 0,
                        other: totalRevenue > 0 ? ((revenueBreakdown.other / totalRevenue) * 100).toFixed(1) : 0
                    }
                },
                discountAnalysis,
                trainerPerformance,
                profitMargins,
                memberAcquisition,
                cashFlowProjections,
                localInsights,
                aiPredictions, // Now null, fetched separately
                comparison: comparisonData
            }
        });

    } catch (error) {
        console.error('Advanced Analytics API Error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);

        return NextResponse.json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

// Helper function: Generate cash flow projections
async function generateCashFlowProjections(data) {
    const { payments, transactions, trainerPayments, months } = data;

    // Calculate historical monthly averages
    const monthlyData = {};

    payments.forEach(p => {
        const monthKey = new Date(p.paymentDate).toISOString().slice(0, 7);
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        monthlyData[monthKey].income += p.amount;
    });

    transactions.forEach(t => {
        const monthKey = new Date(t.date).toISOString().slice(0, 7);
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        if (t.type === 'income') monthlyData[monthKey].income += t.amount;
        else monthlyData[monthKey].expense += t.amount;
    });

    trainerPayments.forEach(tp => {
        const monthKey = new Date(tp.paymentDate).toISOString().slice(0, 7);
        if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
        monthlyData[monthKey].expense += tp.amount;
    });

    const monthlyArray = Object.values(monthlyData);
    const avgIncome = monthlyArray.reduce((sum, m) => sum + m.income, 0) / monthlyArray.length;
    const avgExpense = monthlyArray.reduce((sum, m) => sum + m.expense, 0) / monthlyArray.length;

    // Generate projections for next 6 months
    const projections = [];
    const now = new Date();

    for (let i = 1; i <= months; i++) {
        const projectionDate = new Date(now);
        projectionDate.setMonth(projectionDate.getMonth() + i);
        const month = projectionDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        const monthNum = projectionDate.getMonth();

        // Apply seasonal multipliers
        let incomeMultiplier = 1.0;
        let expenseMultiplier = 1.0;

        // Monsoon (Jun-Sep): -10% income
        if (monthNum >= 5 && monthNum <= 8) incomeMultiplier = 0.9;
        // Durga Puja (Sep-Oct): +15% income, +20% expense
        if (monthNum === 8 || monthNum === 9) {
            incomeMultiplier = 1.15;
            expenseMultiplier = 1.2;
        }
        // Winter (Nov-Feb): +5% income
        if (monthNum >= 10 || monthNum <= 1) incomeMultiplier = 1.05;
        // New Year (Jan): +20% income
        if (monthNum === 0) incomeMultiplier = 1.2;

        projections.push({
            month,
            projectedIncome: Math.round(avgIncome * incomeMultiplier),
            projectedExpense: Math.round(avgExpense * expenseMultiplier),
            netCashFlow: Math.round((avgIncome * incomeMultiplier) - (avgExpense * expenseMultiplier)),
            confidence: i <= 3 ? 'high' : 'medium'
        });
    }

    return projections;
}

// Helper function: Generate local insights
async function generateLocalInsights(data) {
    const { payments, transactions, startDate, endDate } = data;

    // Festival periods (approximate dates)
    const festivals = [
        { name: 'Durga Puja', months: [8, 9], impact: 'high' },
        { name: 'Diwali', months: [9, 10], impact: 'medium' },
        { name: 'Bengali New Year', months: [3], impact: 'low' },
        { name: 'Holi', months: [2], impact: 'low' },
        { name: 'New Year', months: [0], impact: 'high' }
    ];

    const festivalImpact = [];

    for (const festival of festivals) {
        let festivalRevenue = 0;
        let festivalCount = 0;

        payments.forEach(p => {
            const month = new Date(p.paymentDate).getMonth();
            if (festival.months.includes(month)) {
                festivalRevenue += p.amount;
                festivalCount++;
            }
        });

        transactions.forEach(t => {
            const month = new Date(t.date).getMonth();
            if (t.type === 'income' && festival.months.includes(month)) {
                festivalRevenue += t.amount;
                festivalCount++;
            }
        });

        if (festivalCount > 0) {
            festivalImpact.push({
                festival: festival.name,
                revenue: festivalRevenue,
                transactions: festivalCount,
                avgPerTransaction: Math.round(festivalRevenue / festivalCount),
                impact: festival.impact
            });
        }
    }

    // Student behavior analysis (college semesters)
    const studentInsights = {
        examPeriod: 'May-June & Nov-Dec: Expect 15-20% drop in attendance',
        vacationPeriod: 'June-July: Summer vacation, potential for special programs',
        peakEnrollment: 'August & January: New semester starts, high enrollment opportunity'
    };

    return {
        festivalImpact: festivalImpact.sort((a, b) => b.revenue - a.revenue),
        studentBehavior: studentInsights,
        monsoonEffect: {
            period: 'June-September',
            expectedImpact: '-10 to -15% revenue',
            recommendation: 'Offer indoor activities, monsoon special packages'
        },
        weddingSeason: {
            period: 'November-February',
            expectedImpact: '-5 to -10% attendance',
            recommendation: 'Target post-wedding fitness goals, couple packages'
        }
    };
}


