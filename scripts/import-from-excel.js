/**
 * Import Members and Payments from Excel
 * 
 * This script imports member and payment data from the Excel file,
 * clearing existing data first and creating proper member records
 * with membership IDs, names, and phone numbers.
 * 
 * Usage: node scripts/import-from-excel.js
 */

import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import models
import Member from '../models/Member.js';
import Payment from '../models/Payment.js';
import Transaction from '../models/Transaction.js';
import Plan from '../models/Plan.js';
import Attendance from '../models/Attendance.js';
import TrainerAttendance from '../models/TrainerAttendance.js';
import TrainerPayment from '../models/TrainerPayment.js';
import Discount from '../models/Discount.js';

const MONGODB_URI = process.env.MONGODB_URI;
const EXCEL_FILE = path.join(process.cwd(), 'membership-sales copy.xlsx');

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

// Helper function to normalize phone number
function normalizePhone(phone) {
    if (!phone) return null;
    const cleaned = phone.toString().replace(/\D/g, '');
    return cleaned.length === 10 ? cleaned : null;
}

// Helper function to parse payment mode
function parsePaymentMode(method) {
    if (!method) return 'cash';
    const normalized = method.toLowerCase();
    if (normalized.includes('card')) return 'card';
    if (normalized.includes('upi') || normalized.includes('online') ||
        normalized.includes('phonepe') || normalized.includes('gpay')) return 'upi';
    if (normalized.includes('bank') || normalized.includes('transfer')) return 'bank_transfer';
    if (normalized.includes('cheque')) return 'cheque';
    return 'cash';
}

// Helper function to parse amount
function parseAmount(amountStr) {
    if (!amountStr) return 0;
    return parseFloat(amountStr.toString().replace(/[^0-9.]/g, '')) || 0;
}

// Helper function to get plan details from Excel string
function getPlanDetails(planStr) {
    const normalized = planStr ? planStr.toString().toLowerCase().trim() : 'monthly';

    if (normalized.includes('yearly')) {
        return { name: 'Yearly Membership', duration: 12, price: 12000 };
    } else if (normalized.includes('10 months')) {
        return { name: '10 Month Membership', duration: 10, price: 10000 };
    } else if (normalized.includes('3 months')) {
        return { name: 'Quarterly Membership', duration: 3, price: 5000 };
    } else {
        return { name: 'Monthly Membership', duration: 1, price: 2000 };
    }
}

async function clearDatabase() {
    console.log('\n🗑️  Clearing existing data...\n');

    const collections = [
        { name: 'Members', model: Member },
        { name: 'Payments', model: Payment },
        { name: 'Transactions', model: Transaction },
        { name: 'Attendances', model: Attendance },
        { name: 'TrainerAttendances', model: TrainerAttendance },
        { name: 'TrainerPayments', model: TrainerPayment },
        { name: 'Discounts', model: Discount },
        { name: 'Plans', model: Plan }, // Also clear plans to avoid duplicates
    ];

    for (const { name, model } of collections) {
        const count = await model.countDocuments();
        await model.deleteMany({});
        console.log(`   ✓ Cleared ${name}: ${count} documents deleted`);
    }
}

async function importData() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Clear existing data
        await clearDatabase();

        console.log('\n📖 Reading Excel file (membership-sales copy.xlsx)...');
        const workbook = XLSX.readFile(EXCEL_FILE);

        // Use the 'Sheet1' sheet which has the membership sales data
        const sheetName = 'Sheet1';
        if (!workbook.SheetNames.includes(sheetName)) {
            throw new Error(`Sheet '${sheetName}' not found in Excel file`);
        }

        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`✅ Found ${data.length} membership sales records\n`);

        // Step 1: Create Plans
        console.log('📋 Creating plans...');
        const planMap = new Map(); // Map plan name to Plan document

        // Define standard plans
        const standardPlans = [
            { name: 'Monthly Membership', duration: 1, price: 2000, features: ['Access to gym equipment', 'General training area'] },
            { name: 'Quarterly Membership', duration: 3, price: 5000, features: ['Access to gym equipment', 'General training area', '1 Free PT session'] },
            { name: '10 Month Membership', duration: 10, price: 10000, features: ['Access to gym equipment', 'General training area', '3 Free PT sessions'] },
            { name: 'Yearly Membership', duration: 12, price: 12000, features: ['Access to gym equipment', 'General training area', '5 Free PT sessions', 'Free Diet Plan'] }
        ];

        for (const p of standardPlans) {
            const plan = await Plan.create(p);
            planMap.set(p.name, plan);
            console.log(`   ✓ Created plan: ${p.name}`);
        }
        console.log('');

        // Step 2: Extract unique members from Excel
        console.log('👥 Extracting unique members...');
        const memberMap = new Map();

        for (const row of data) {
            const mid = row['MID']?.toString().trim();
            const name = row['Name']?.toString().trim();
            const mobile = normalizePhone(row['Mobile']);

            // Skip rows without MID (these are expenses)
            if (!mid || !name || !mobile) continue;

            if (!memberMap.has(mid)) {
                memberMap.set(mid, {
                    mid,
                    name,
                    phone: mobile,
                    transactions: []
                });
            }

            // Add transaction to member
            memberMap.get(mid).transactions.push(row);
        }

        console.log(`   ✓ Found ${memberMap.size} unique members\n`);

        // Step 3: Import members
        console.log('📝 Creating member records...\n');
        const memberIdMap = new Map(); // Map MID to MongoDB _id
        let memberCount = 0;

        for (const [mid, memberData] of memberMap) {
            try {
                // Find earliest transaction date as join date
                const dates = memberData.transactions
                    .map(t => t['Receipt Date'])
                    .filter(d => d)
                    .map(d => new Date(d))
                    .sort((a, b) => a - b);

                const joinDate = dates[0] || new Date();

                // Calculate total paid
                const totalPaid = memberData.transactions
                    .filter(t => t['Sales Type'] === 'Credit')
                    .reduce((sum, t) => sum + parseAmount(t['Total Amount']), 0);

                // Determine plan based on latest transaction
                // Sort transactions by date descending
                const sortedTransactions = memberData.transactions.sort((a, b) => {
                    const dateA = new Date(a['Receipt Date'] || 0);
                    const dateB = new Date(b['Receipt Date'] || 0);
                    return dateB - dateA;
                });

                const latestTransaction = sortedTransactions[0];
                const planDetails = getPlanDetails(latestTransaction['Actual Amount']);
                const plan = planMap.get(planDetails.name) || planMap.get('Monthly Membership');

                // Determine status and end date
                const latestDate = new Date(latestTransaction['Receipt Date'] || new Date());
                const membershipEndDate = new Date(latestDate);
                membershipEndDate.setMonth(membershipEndDate.getMonth() + plan.duration);

                const status = membershipEndDate > new Date() ? 'Active' : 'Expired';

                const member = await Member.create({
                    memberId: mid,
                    name: memberData.name,
                    phone: memberData.phone,
                    email: `${memberData.phone}@fitapp.local`,
                    joinDate,
                    status,
                    planId: plan._id,
                    totalPaid,
                    paymentStatus: totalPaid > 0 ? 'paid' : 'unpaid',
                    membershipStartDate: latestDate,
                    membershipEndDate,
                });

                memberIdMap.set(mid, member._id);
                memberCount++;

                if (memberCount % 10 === 0) {
                    console.log(`   ✓ Created ${memberCount} members...`);
                }
            } catch (error) {
                console.error(`   ✗ Error creating member ${mid}:`, error.message);
            }
        }

        console.log(`\n✅ Created ${memberCount} members\n`);

        // Step 4: Import payments
        console.log('💳 Creating payment records...\n');
        let paymentCount = 0;

        for (const row of data) {
            const mid = row['MID']?.toString().trim();
            const salesType = row['Sales Type'];

            // Only process credit transactions with valid MID
            if (salesType !== 'Credit' || !mid || !memberIdMap.has(mid)) continue;

            try {
                const amount = parseAmount(row['Total Amount']);
                if (amount === 0) continue;

                const planDetails = getPlanDetails(row['Actual Amount']);
                const plan = planMap.get(planDetails.name) || planMap.get('Monthly Membership');

                const payment = await Payment.create({
                    memberId: memberIdMap.get(mid),
                    planType: 'Plan',
                    planId: plan._id,
                    amount,
                    paymentMode: parsePaymentMode(row['Payment Method']),
                    paymentDate: row['Receipt Date'] ? new Date(row['Receipt Date']) : new Date(),
                    paymentStatus: 'completed',
                    notes: `Imported from Excel. Plan: ${row['Actual Amount']}`,
                    createdBy: row['Added By'] || 'admin',
                });

                paymentCount++;

                if (paymentCount % 50 === 0) {
                    console.log(`   ✓ Created ${paymentCount} payments...`);
                }
            } catch (error) {
                console.error(`   ✗ Error creating payment for MID ${mid}:`, error.message);
            }
        }

        console.log(`\n✅ Created ${paymentCount} payments\n`);

        // Step 5: Import all transactions (income and expenses)
        console.log('💰 Creating transaction records...\n');
        let transactionCount = 0;

        for (const row of data) {
            try {
                const amount = parseAmount(row['Total Amount']);
                if (amount === 0) continue;

                const salesType = row['Sales Type'];
                const isExpense = salesType === 'Debit' || row['Payment Type'] === 'Expense';

                const transaction = await Transaction.create({
                    title: isExpense ? (row['Description'] || 'Expense') : (row['Name'] || 'Payment'),
                    amount,
                    type: isExpense ? 'expense' : 'income',
                    category: isExpense ? (row['Description'] || 'General') : (row['Payment Type'] || 'Membership'),
                    paymentMode: parsePaymentMode(row['Payment Method']),
                    date: row['Receipt Date'] ? new Date(row['Receipt Date']) : new Date(),
                    notes: `MID: ${row['MID'] || 'N/A'}, Mobile: ${row['Mobile'] || 'N/A'}, Desc: ${row['Description'] || 'N/A'}`,
                });

                transactionCount++;

                if (transactionCount % 100 === 0) {
                    console.log(`   ✓ Created ${transactionCount} transactions...`);
                }
            } catch (error) {
                console.error(`   ✗ Error creating transaction:`, error.message);
            }
        }

        console.log(`\n✅ Created ${transactionCount} transactions\n`);

        // Verification
        console.log('\n🔍 Verification:\n');
        const finalMemberCount = await Member.countDocuments();
        const finalPaymentCount = await Payment.countDocuments();
        const finalTransactionCount = await Transaction.countDocuments();
        const finalPlanCount = await Plan.countDocuments();

        console.log(`   📊 Members: ${finalMemberCount}`);
        console.log(`   📊 Payments: ${finalPaymentCount}`);
        console.log(`   📊 Transactions: ${finalTransactionCount}`);
        console.log(`   📊 Plans: ${finalPlanCount}`);

        // Sample verification
        console.log('\n📋 Sample Members:\n');
        const sampleMembers = await Member.find().limit(5).populate('planId').select('memberId name phone status planId');
        sampleMembers.forEach(m => {
            console.log(`   • MID: ${m.memberId}, Name: ${m.name}, Plan: ${m.planId?.name}, Status: ${m.status}`);
        });

        console.log('\n✅ Import completed successfully!\n');

    } catch (error) {
        console.error('❌ Import failed:', error);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log('🔒 Database connection closed\n');
    }
}

// Run import
importData();
