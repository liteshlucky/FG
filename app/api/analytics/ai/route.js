import dbConnect from '@/lib/db';
import Payment from '@/models/Payment';
import Transaction from '@/models/Transaction';
import Member from '@/models/Member';
import TrainerPayment from '@/models/TrainerPayment';
import AnalyticsCache from '@/models/AnalyticsCache';
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export async function GET(request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const months = parseInt(searchParams.get('months') || '12');
        const forceRefresh = searchParams.get('force') === 'true';

        // Check cache first
        if (!forceRefresh) {
            const fifteenDaysAgo = new Date();
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

            const cachedResult = await AnalyticsCache.findOne({
                type: 'ai_predictions',
                timeRange: months.toString(),
                createdAt: { $gte: fifteenDaysAgo }
            }).sort({ createdAt: -1 });

            if (cachedResult) {
                return NextResponse.json({
                    success: true,
                    data: cachedResult.data,
                    cached: true,
                    lastUpdated: cachedResult.createdAt
                });
            }
        }

        // Calculate date ranges
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        // Fetch necessary data for AI context
        const [payments, trainerPayments, transactions, members] = await Promise.all([
            Payment.find({ paymentDate: { $gte: startDate, $lte: endDate } }).lean(),
            TrainerPayment.find({ paymentDate: { $gte: startDate, $lte: endDate } }).lean(),
            Transaction.find({ date: { $gte: startDate, $lte: endDate } }).lean(),
            Member.find().lean()
        ]);

        // Calculate basic metrics for context
        const revenueBreakdown = { membership: 0, pt: 0, other: 0 };
        payments.forEach(p => {
            if (p.planType === 'Plan' || p.planType === 'membership') revenueBreakdown.membership += p.amount;
            else if (p.planType === 'PTplan' || p.planType === 'pt_plan') revenueBreakdown.pt += p.amount;
        });
        transactions.forEach(t => {
            if (t.type === 'income') revenueBreakdown.other += t.amount;
        });

        const profitMargins = {
            membership: { margin: 0 },
            pt: { margin: 0 }
        };

        // ... (simplified margin calc for AI context) ...
        const ptCosts = trainerPayments.reduce((sum, tp) => sum + (tp.commissionAmount || 0), 0);
        profitMargins.pt.margin = revenueBreakdown.pt > 0
            ? ((revenueBreakdown.pt - ptCosts) / revenueBreakdown.pt * 100).toFixed(2)
            : 0;

        const memCosts = trainerPayments.reduce((sum, tp) => sum + (tp.baseSalary || 0), 0);
        profitMargins.membership.margin = revenueBreakdown.membership > 0
            ? ((revenueBreakdown.membership - memCosts) / revenueBreakdown.membership * 100).toFixed(2)
            : 0;

        // Generate Predictions
        const predictions = await generateAIPredictions({
            payments,
            transactions,
            members,
            trainerPayments,
            revenueBreakdown,
            profitMargins
        });

        // Save to cache
        await AnalyticsCache.create({
            type: 'ai_predictions',
            timeRange: months.toString(),
            data: predictions,
            createdAt: new Date()
        });

        return NextResponse.json({
            success: true,
            data: predictions,
            cached: false,
            lastUpdated: new Date()
        });

    } catch (error) {
        console.error('AI Analytics API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

async function generateAIPredictions(data) {
    const { payments, transactions, members, trainerPayments, revenueBreakdown, profitMargins } = data;

    if (!genAI) {
        return getFallbackPredictions(members);
    }

    try {
        // User requested gemini-2.5-flash-lite
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const totalRevenue = revenueBreakdown.membership + revenueBreakdown.pt + revenueBreakdown.other;
        const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) +
            trainerPayments.reduce((sum, tp) => sum + tp.amount, 0);

        // Calculate monthly trends for context
        const monthlyRevenue = {};
        payments.forEach(p => {
            const month = new Date(p.paymentDate).toLocaleString('default', { month: 'short' });
            monthlyRevenue[month] = (monthlyRevenue[month] || 0) + p.amount;
        });
        const revenueTrendStr = Object.entries(monthlyRevenue)
            .map(([m, val]) => `${m}: ₹${val}`)
            .join(', ');

        const prompt = `You are a business analytics AI for a gym in Sodepur, West Bengal, India.
        
FINANCIAL DATA:
- Total Revenue: ₹${totalRevenue.toLocaleString()}
- Total Expense: ₹${totalExpense.toLocaleString()}
- Membership Revenue: ₹${revenueBreakdown.membership.toLocaleString()}
- PT Revenue: ₹${revenueBreakdown.pt.toLocaleString()}
- Monthly Revenue Trend: ${revenueTrendStr}
- Membership Profit Margin: ${profitMargins.membership.margin}%
- PT Profit Margin: ${profitMargins.pt.margin}%

MEMBER DATA:
- Total Members: ${members.length}
- Recent Payments: ${payments.length}
- Current Date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

TASK: Provide AI-powered predictions and LOCAL INSIGHTS in the following JSON format:

{
  "churnRisk": {
    "highRiskCount": <number>,
    "mediumRiskCount": <number>,
    "lowRiskCount": <number>,
    "topReasons": ["reason1", "reason2", "reason3"],
    "recommendations": ["action1", "action2", "action3"]
  },
  "pricingOptimization": {
    "currentStrategy": "brief analysis of current pricing",
    "recommendations": [
      {
        "type": "membership" or "pt" or "general",
        "suggestion": "specific pricing suggestion",
        "expectedImpact": "expected outcome",
        "priority": "high" or "medium" or "low"
      }
    ],
    "competitiveAnalysis": "market positioning insight"
  },
  "revenueOpportunities": [
    {
      "opportunity": "specific opportunity",
      "potentialRevenue": <estimated amount in rupees>,
      "effort": "low" or "medium" or "high",
      "timeline": "timeframe to implement"
    }
  ],
  "localInsights": {
    "festivalImpact": [
      { "festival": "Name", "impact": "high/medium/low", "details": "Specific impact analysis based on Sodepur context and data" }
    ],
    "studentBehavior": {
      "insight": "Analysis of student enrollment patterns (exams/vacations)",
      "action": "Recommended action"
    },
    "seasonalAnalysis": [
       { "season": "Upcoming Season/Event", "impact": "Predicted Impact", "recommendation": "Preparation Strategy" }
    ],
    "upcomingEvents": [
        { "event": "Name (e.g. Next Major Festival)", "date": "Approx Date", "prediction": "Expected business impact" }
    ]
  }
}

IMPORTANT:
- Base churn risk on payment frequency and member count
- **CRITICAL**: Adopt a holistic view for Sodepur, West Bengal. Do NOT attribute everything to a single festival like Durga Puja unless the data strongly correlates.
- **Analyze Multiple Factors**: user general local trends, weather patterns (monsoon, summer heat), exam seasons, economic factors, AND cultural events.
- **Data Driven**: Look at the provided Monthly Revenue Trend. If there is a dip, find the most logical local explanation (e.g. heavy rains in July vs exams in May).
- **LOOK AHEAD**: Identify upcoming seasonal shifts or events based on Current Date.
- Return ONLY valid JSON, no markdown formatting`;

        // 30 second timeout for AI generation (increased to prevent false timeouts)
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI generation timed out')), 30000)
        );

        const result = await Promise.race([
            model.generateContent(prompt),
            timeoutPromise
        ]);

        const response = result.response.text();
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
        }

        return JSON.parse(cleanedResponse);

    } catch (error) {
        console.error('AI Generation Error:', error);
        // User requested NO fallback data. Re-throw error to be handled by main API handler.
        throw error;
    }
}

function getFallbackPredictions(members) {
    return {
        churnRisk: {
            highRiskCount: Math.round(members.length * 0.15),
            mediumRiskCount: Math.round(members.length * 0.25),
            lowRiskCount: Math.round(members.length * 0.60),
            topReasons: ['Irregular payment patterns', 'Low attendance frequency', 'No recent engagement'],
            recommendations: ['Send personalized re-engagement emails', 'Offer limited-time renewal discounts', 'Schedule one-on-one check-ins']
        },
        pricingOptimization: {
            currentStrategy: 'Current pricing appears competitive for the local market',
            recommendations: [
                { type: 'membership', suggestion: 'Introduce quarterly plans at 10% discount', expectedImpact: 'Increase upfront revenue', priority: 'high' },
                { type: 'pt', suggestion: 'Create PT package bundles', expectedImpact: 'Higher average transaction value', priority: 'medium' }
            ],
            competitiveAnalysis: 'Position as premium gym with personalized training focus'
        },
        revenueOpportunities: [
            { opportunity: 'Group fitness classes', potentialRevenue: 50000, effort: 'medium', timeline: '2-3 months' },
            { opportunity: 'Nutrition consultation add-on', potentialRevenue: 30000, effort: 'low', timeline: '1 month' }
        ],
        localInsights: {
            festivalImpact: [
                { festival: 'Major Regional Festivals', impact: 'high', details: 'High footfall variance expected during major cultural events' }
            ],
            studentBehavior: {
                insight: 'Seasonal attendance fluctuations observed due to academic calendars',
                action: 'Offer flexible pause options during exam months'
            },
            seasonalAnalysis: [
                { season: 'Monsoon (Jun-Sep)', impact: 'potential attendance drop due to weather', recommendation: 'Promote indoor group activities & challenges' }
            ],
            upcomingEvents: [
                { event: 'Check Local Calendar', date: 'Upcoming', prediction: 'Review local event schedule for impact' }
            ]
        }
    };
}
