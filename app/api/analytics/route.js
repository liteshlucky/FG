import dbConnect from '@/lib/db';
import Transaction from '@/models/Transaction';
import Payment from '@/models/Payment';
import TrainerPayment from '@/models/TrainerPayment';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getWeatherForMonth, analyzeWeatherImpact } from '@/lib/weather';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function GET(request) {
    await dbConnect();

    try {
        const { searchParams } = new URL(request.url);
        const months = parseInt(searchParams.get('months') || '12');

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        // Fetch all financial data
        const [transactions, payments, trainerPayments] = await Promise.all([
            Transaction.find({ date: { $gte: startDate, $lte: endDate } }).lean(),
            Payment.find({ paymentDate: { $gte: startDate, $lte: endDate } }).lean(),
            TrainerPayment.find({ paymentDate: { $gte: startDate, $lte: endDate } }).lean()
        ]);

        // Aggregate by month
        const monthlyData = {};

        // Process all transactions
        const allRecords = [
            ...transactions.map(t => ({
                date: t.date,
                amount: t.amount,
                type: t.type
            })),
            ...payments.map(p => ({
                date: p.paymentDate,
                amount: p.amount,
                type: 'income'
            })),
            ...trainerPayments.map(tp => ({
                date: tp.paymentDate,
                amount: tp.amount,
                type: 'expense'
            }))
        ];

        allRecords.forEach(record => {
            const monthKey = new Date(record.date).toISOString().slice(0, 7); // YYYY-MM
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { income: 0, expense: 0, net: 0 };
            }
            if (record.type === 'income') {
                monthlyData[monthKey].income += record.amount;
            } else {
                monthlyData[monthKey].expense += record.amount;
            }
            monthlyData[monthKey].net = monthlyData[monthKey].income - monthlyData[monthKey].expense;
        });

        // Convert to array and sort
        const monthlyArray = await Promise.all(
            Object.keys(monthlyData)
                .sort()
                .map(async (month) => {
                    const [year, monthNum] = month.split('-');
                    const weather = await getWeatherForMonth(parseInt(year), parseInt(monthNum) - 1);
                    return {
                        month,
                        ...monthlyData[month],
                        weather
                    };
                })
        );

        // Calculate key metrics
        const totalIncome = monthlyArray.reduce((sum, m) => sum + m.income, 0);
        const totalExpense = monthlyArray.reduce((sum, m) => sum + m.expense, 0);
        const avgMonthlyIncome = totalIncome / monthlyArray.length;
        const avgMonthlyExpense = totalExpense / monthlyArray.length;

        // Get current month and season
        const now = new Date();
        const currentMonth = now.toLocaleString('en-US', { month: 'long' });
        const currentSeason = getCurrentSeason(now.getMonth());
        const upcomingFestivals = getUpcomingFestivals(now.getMonth());

        // Analyze weather impact
        const weatherImpact = analyzeWeatherImpact(monthlyArray);

        // Generate AI insights
        const aiInsights = await generateAIInsights({
            monthlyData: monthlyArray,
            totalIncome,
            totalExpense,
            avgMonthlyIncome,
            avgMonthlyExpense,
            currentMonth,
            currentSeason,
            upcomingFestivals,
            weatherImpact
        });

        return NextResponse.json({
            success: true,
            data: {
                monthlyData: monthlyArray,
                metrics: {
                    totalIncome,
                    totalExpense,
                    netProfit: totalIncome - totalExpense,
                    avgMonthlyIncome,
                    avgMonthlyExpense,
                    profitMargin: ((totalIncome - totalExpense) / totalIncome * 100).toFixed(2)
                },
                weatherImpact,
                insights: aiInsights
            }
        });

    } catch (error) {
        console.error('Analytics API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function getCurrentSeason(month) {
    if (month >= 5 && month <= 8) return 'Monsoon';
    if (month >= 10 || month <= 1) return 'Winter';
    return 'Summer';
}

function getUpcomingFestivals(currentMonth) {
    const festivals = {
        0: ['Republic Day (Jan 26)', 'Saraswati Puja (Late Jan/Early Feb)'],
        1: ['Saraswati Puja', 'Holi (Mar)'],
        2: ['Holi', 'Bengali New Year (Apr 14-15)'],
        3: ['Bengali New Year (Poila Boishakh)', 'Eid (varies)'],
        4: ['Summer Vacation Period'],
        5: ['Monsoon Season Begins', 'Eid (varies)'],
        6: ['Monsoon Peak', 'Independence Day (Aug 15)'],
        7: ['Independence Day', 'Janmashtami (Aug/Sep)'],
        8: ['Durga Puja (Sep/Oct)', 'Navratri'],
        9: ['Durga Puja', 'Diwali (Oct/Nov)', 'Kali Puja'],
        10: ['Diwali', 'Wedding Season Begins', 'Chhath Puja'],
        11: ['Wedding Season Peak', 'Christmas', 'New Year']
    };

    const next2Months = [currentMonth, (currentMonth + 1) % 12];
    return [...new Set([...festivals[next2Months[0]], ...festivals[next2Months[1]]])];
}

async function generateAIInsights(data) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `You are a business analyst for a gym located in Sodepur, West Bengal, India.

HISTORICAL DATA (Last ${data.monthlyData.length} months):
${data.monthlyData.map(m => `${m.month}: Income ₹${m.income.toLocaleString()}, Expense ₹${m.expense.toLocaleString()}, Net ₹${m.net.toLocaleString()}`).join('\n')}

KEY METRICS:
- Total Income: ₹${data.totalIncome.toLocaleString()}
- Total Expense: ₹${data.totalExpense.toLocaleString()}
- Avg Monthly Income: ₹${data.avgMonthlyIncome.toLocaleString()}
- Avg Monthly Expense: ₹${data.avgMonthlyExpense.toLocaleString()}

CURRENT CONTEXT:
- Current Month: ${data.currentMonth}
- Season: ${data.currentSeason}
- Upcoming Festivals/Events: ${data.upcomingFestivals.join(', ')}

LOCATION CONTEXT (Sodepur, West Bengal):
- Student population from nearby colleges
- Monsoon season (Jun-Sep) affects outdoor activities
- Major festivals: Durga Puja (biggest), Diwali, Bengali New Year
- Wedding season (Nov-Feb) impacts attendance
- Academic calendar affects student memberships

WEATHER IMPACT ANALYSIS:
- Rainy Days: ${data.weatherImpact.rainyDays.totalDays} days, Avg Daily Revenue: ₹${data.weatherImpact.rainyDays.avgDailyRevenue.toLocaleString()}
- Hot Days (>35°C): ${data.weatherImpact.hotDays.totalDays} days, Avg Daily Revenue: ₹${data.weatherImpact.hotDays.avgDailyRevenue.toLocaleString()}
- Cold Days (<15°C): ${data.weatherImpact.coldDays.totalDays} days, Avg Daily Revenue: ₹${data.weatherImpact.coldDays.avgDailyRevenue.toLocaleString()}
- Normal Days: ${data.weatherImpact.normalDays.totalDays} days, Avg Daily Revenue: ₹${data.weatherImpact.normalDays.avgDailyRevenue.toLocaleString()}

Provide a comprehensive business analysis in JSON format with the following structure:
{
  "trends": {
    "revenue": "Brief analysis of revenue trends",
    "seasonal": "Seasonal pattern observations",
    "growth": "Growth rate and trajectory"
  },
  "forecast": {
    "nextMonth": { "income": number, "expense": number, "confidence": "high/medium/low" },
    "next3Months": { "income": number, "expense": number, "confidence": "high/medium/low" }
  },
  "insights": [
    "Key insight 1",
    "Key insight 2",
    "Key insight 3"
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "risks": [
    "Potential risk 1",
    "Potential risk 2"
  ],
  "opportunities": [
    "Growth opportunity 1",
    "Growth opportunity 2"
  ]
}

Ensure all numbers are realistic based on historical data. Consider local context, festivals, weather, and student behavior patterns.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error('Failed to parse AI response');

    } catch (error) {
        console.error('AI Insights Error:', error);
        return {
            trends: {
                revenue: "Unable to generate AI insights at this time",
                seasonal: "Please try again later",
                growth: "Error occurred"
            },
            forecast: {
                nextMonth: { income: data.avgMonthlyIncome, expense: data.avgMonthlyExpense, confidence: "low" },
                next3Months: { income: data.avgMonthlyIncome * 3, expense: data.avgMonthlyExpense * 3, confidence: "low" }
            },
            insights: ["AI insights temporarily unavailable"],
            recommendations: ["Please refresh to try again"],
            risks: [],
            opportunities: []
        };
    }
}
