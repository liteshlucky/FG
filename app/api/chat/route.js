import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import Member from "@/models/Member";
import Payment from "@/models/Payment";
import Transaction from "@/models/Transaction";
import Attendance from "@/models/Attendance";
import Trainer from "@/models/Trainer";
import dbConnect from "@/lib/db";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- TOOL DEFINITIONS ---

const tools = [
    {
        name: "findMember",
        description: "Search for a member by name, email, or phone. Use this to find a member's ID.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: { type: "STRING", description: "The name, email, or phone number to search for." },
            },
            required: ["query"],
        },
    },
    {
        name: "getMemberDetails",
        description: "Get detailed information about a specific member using their Member ID. Includes plan details and expiry.",
        parameters: {
            type: "OBJECT",
            properties: {
                memberId: { type: "STRING", description: "The unique ID of the member." },
            },
            required: ["memberId"],
        },
    },
    {
        name: "getFinancialMetrics",
        description: "Get financial data (revenue, expenses) for a specific date range. Use this for business insights.",
        parameters: {
            type: "OBJECT",
            properties: {
                startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format." },
                endDate: { type: "STRING", description: "End date in YYYY-MM-DD format." },
            },
            required: ["startDate", "endDate"],
        },
    },
    {
        name: "getAttendanceStats",
        description: "Get gym attendance statistics for a specific date range.",
        parameters: {
            type: "OBJECT",
            properties: {
                startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format." },
                endDate: { type: "STRING", description: "End date in YYYY-MM-DD format." },
            },
            required: ["startDate", "endDate"],
        },
    },
    {
        name: "getMemberStats",
        description: "Get statistics about the member base, such as total count, active members, or PT (Personal Training) members.",
        parameters: {
            type: "OBJECT",
            properties: {
                filter: {
                    type: "STRING",
                    description: "The category to filter by. Options: 'total', 'active', 'expired', 'pt'."
                },
            },
            required: ["filter"],
        },
    },
    {
        name: "getExpiringMembers",
        description: "Get a list of members whose membership is expiring within a specified number of days.",
        parameters: {
            type: "OBJECT",
            properties: {
                days: { type: "NUMBER", description: "Number of days from today to check for expiry (e.g., 7, 30)." },
            },
            required: ["days"],
        },
    },
    {
        name: "getAbsentMembers",
        description: "Get a list of active members who have NOT attended the gym in the last X days.",
        parameters: {
            type: "OBJECT",
            properties: {
                days: { type: "NUMBER", description: "The threshold of inactivity in days (e.g., 10)." },
            },
            required: ["days"],
        },
    },
    {
        name: "getTrainerStats",
        description: "Get performance statistics for a specific trainer, including active client count.",
        parameters: {
            type: "OBJECT",
            properties: {
                name: { type: "STRING", description: "Name of the trainer to analyze." },
            },
            required: ["name"],
        },
    },
    {
        name: "getPlanStats",
        description: "Get a breakdown of active members by plan type (e.g., Monthly, Yearly).",
        parameters: {
            type: "OBJECT",
            properties: {},
        },
    },
];

// --- TOOL IMPLEMENTATIONS ---

async function getMemberStats(filter) {
    await dbConnect();
    try {
        let query = {};
        let label = "Total Members";

        if (filter === 'active') {
            query = { status: 'Active' };
            label = "Active Members";
        } else if (filter === 'expired') {
            query = { status: 'Expired' };
            label = "Expired Members";
        } else if (filter === 'pt') {
            // searching for members with a PT plan assigned
            query = { status: 'Active', ptPlanId: { $exists: true, $ne: null } };
            label = "Active PT Members";
        } else {
            // 'total' or unknown
            query = {};
        }

        const count = await Member.countDocuments(query);

        return JSON.stringify({
            category: label,
            count: count,
            filterUsed: filter
        });
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

async function getExpiringMembers(days = 7) {
    await dbConnect();
    try {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + days);

        const members = await Member.find({
            status: 'Active',
            membershipEndDate: { $gte: today, $lte: futureDate }
        }).select('name memberId phone membershipEndDate plan').limit(10);

        const count = await Member.countDocuments({
            status: 'Active',
            membershipEndDate: { $gte: today, $lte: futureDate }
        });

        return JSON.stringify({
            expiringCount: count,
            list: members,
            period: `Next ${days} days`
        });
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

async function getAbsentMembers(days = 10) {
    await dbConnect();
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // 1. Find all members who HAVE attended since cutoff
        const recentAttendance = await Attendance.find({
            date: { $gte: cutoffDate }
        }).distinct('memberId');

        // 2. Find Active members whose ID is NOT in the recentAttendance list
        const absentMembers = await Member.find({
            status: 'Active',
            _id: { $nin: recentAttendance }
        }).select('name memberId phone lastCheckIn').limit(10);

        const count = await Member.countDocuments({
            status: 'Active',
            _id: { $nin: recentAttendance }
        });

        return JSON.stringify({
            absentCount: count,
            list: absentMembers,
            threshold: `${days} days inactivity`
        });
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

async function getTrainerStats(name) {
    await dbConnect();
    try {
        const regex = new RegExp(name, 'i');
        const trainer = await Trainer.findOne({ name: regex });

        if (!trainer) return JSON.stringify({ error: "Trainer not found" });

        // Count active members assigned to this trainer
        const clientCount = await Member.countDocuments({
            trainerId: trainer._id,
            status: 'Active'
        });

        // Calculate revenue from PT plans associated with this trainer?
        // This is complex, maybe just return client count and bio for now.

        return JSON.stringify({
            trainer: trainer.name,
            specialization: trainer.specialization,
            activeClients: clientCount,
            rating: 4.8 // Hardcoded for MVP or fetch if available
        });
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

async function getPlanStats() {
    await dbConnect();
    try {
        const stats = await Member.aggregate([
            { $match: { status: 'Active' } },
            {
                $lookup: {
                    from: "plans", // Assuming collection name is 'plans'
                    localField: "planId",
                    foreignField: "_id",
                    as: "planDetails"
                }
            },
            { $unwind: "$planDetails" },
            {
                $group: {
                    _id: "$planDetails.name",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return JSON.stringify({
            breakdown: stats
        });
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

async function findMember(query) {
    await dbConnect();
    try {
        const regex = new RegExp(query, 'i');
        const members = await Member.find({
            $or: [
                { name: regex },
                { email: regex },
                { contact: regex },
                { memberId: regex }
            ]
        }).select('name _id contact memberId plan planExpires status').limit(5);

        return JSON.stringify(members);
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

async function getMemberDetails(idInput) {
    await dbConnect();
    try {
        let member = await Member.findOne({ memberId: idInput });

        if (!member) {
            // If not found by custom ID, try by ObjectId if valid
            // (We import mongoose to check validity, or just try-catch)
            try {
                member = await Member.findById(idInput);
            } catch (e) {
                // Invalid ObjectId, ignore
            }
        }

        if (!member) return JSON.stringify({ error: "Member not found" });

        // Fetch recent payments
        const payments = await Payment.find({ memberId: member._id }).sort({ paymentDate: -1 }).limit(3);

        // Fetch recent attendance
        let attendance = [];
        try {
            attendance = await Attendance.find({ memberId: member._id }).sort({ date: -1 }).limit(5);
        } catch (e) {
            console.log("Attendance fetch failed", e);
        }

        return JSON.stringify({
            ...member.toObject(),
            recentPayments: payments,
            recentAttendance: attendance
        });
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

async function getFinancialMetrics(startDate, endDate) {
    await dbConnect();
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        // 1. Calculate General Transactions (Income/Expense)
        const transactions = await Transaction.aggregate([
            { $match: { date: { $gte: start, $lte: end } } },
            { $group: { _id: "$type", total: { $sum: "$amount" } } }
        ]);

        // 2. Calculate Membership Payments
        const payments = await Payment.aggregate([
            { $match: { paymentDate: { $gte: start, $lte: end }, paymentStatus: 'completed' } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const totalPayments = payments.length > 0 ? payments[0].total : 0;

        const incomeTxn = transactions.find(t => t._id === 'income')?.total || 0;
        const expenseTxn = transactions.find(t => t._id === 'expense')?.total || 0;

        const totalRevenue = totalPayments + incomeTxn;
        const totalExpenses = expenseTxn;

        return JSON.stringify({
            period: { startDate, endDate },
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            details: {
                membershipIncome: totalPayments,
                otherIncome: incomeTxn,
                expenses: expenseTxn
            }
        });

    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

async function getAttendanceStats(startDate, endDate) {
    await dbConnect();
    try {
        const start = new Date(startDate);
        const end = new Date(endDate);

        const count = await Attendance.countDocuments({
            date: { $gte: start, $lte: end }
        });

        // Maybe get daily average?
        const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
        const avgDaily = daysDiff > 0 ? (count / daysDiff).toFixed(1) : count;

        return JSON.stringify({
            totalCheckins: count,
            period: { startDate, endDate },
            averageDailyCheckins: avgDaily
        });

    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

// --- MAIN HANDLER ---

export async function POST(req) {
    try {
        const { message, history } = await req.json();

        // Use a lightweight model for speed, or a standard one if complex tools needed.
        // gemini-1.5-flash is good.
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            tools: [{ functionDeclarations: tools }],
        });

        // Sanitize history:
        // Google Gemini requires that the history starts with a 'user' turn.
        // If the client sends a history starting with 'model', we must strip it.
        let sanitizedHistory = history || [];
        while (sanitizedHistory.length > 0 && sanitizedHistory[0].role !== 'user') {
            sanitizedHistory.shift();
        }

        const chat = model.startChat({
            history: sanitizedHistory,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        // Send the user message
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const call = response.functionCalls();

        if (call && call.length > 0) {
            const functionParams = call[0].args;
            const functionName = call[0].name;

            let toolResult = "";

            console.log(`[AI] Calling tool: ${functionName}`, functionParams);

            if (functionName === "findMember") {
                toolResult = await findMember(functionParams.query);
            } else if (functionName === "getMemberDetails") {
                toolResult = await getMemberDetails(functionParams.memberId);
            } else if (functionName === "getFinancialMetrics") {
                toolResult = await getFinancialMetrics(functionParams.startDate, functionParams.endDate);
            } else if (functionName === "getAttendanceStats") {
                toolResult = await getAttendanceStats(functionParams.startDate, functionParams.endDate);
            } else if (functionName === "getMemberStats") {
                toolResult = await getMemberStats(functionParams.filter);
            } else if (functionName === "getExpiringMembers") {
                toolResult = await getExpiringMembers(functionParams.days);
            } else if (functionName === "getAbsentMembers") {
                toolResult = await getAbsentMembers(functionParams.days);
            } else if (functionName === "getTrainerStats") {
                toolResult = await getTrainerStats(functionParams.name);
            } else if (functionName === "getPlanStats") {
                toolResult = await getPlanStats();
            } else {
                toolResult = JSON.stringify({ error: "Unknown tool" });
            }

            // Send tool result back to model
            const finalResult = await chat.sendMessage([{
                functionResponse: {
                    name: functionName,
                    response: { content: toolResult }
                }
            }]);

            return NextResponse.json({ text: finalResult.response.text() });
        }

        return NextResponse.json({ text: response.text() });

    } catch (error) {
        console.error("Chatbot Error:", error);
        return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
    }
}
