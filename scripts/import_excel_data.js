import mongoose from 'mongoose';
import xlsx from 'xlsx';
import path from 'path';
import 'dotenv/config'; // Make sure to run this script from the root which has .env or .env.local

import Member from '../models/Member.js';
import MemberListView from '../models/MemberListView.js';
import Plan from '../models/Plan.js';

const EXCEL_PATH = path.resolve('./MEMBERSHIP & PAYMENTS.xlsx');
// Use the MONGODB_URI directly from local config if process.env.MONGODB_URI is undefined or defaults to localhost
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-fg-db:9bzJGhjTv4e00VGo@fg-db.wbuzptj.mongodb.net/fitapp?retryWrites=true&w=majority";

// Parse date from DD.MM.YYYY format
function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = String(dateStr).split('.');
    if (parts.length === 3) {
        // parts[0] is day, parts[1] is month, parts[2] is year
        // months are 0-indexed in JS Date
        return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    // Try passing to new Date() if it's already a valid date string or serial
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function parseDuration(monthsStr) {
    if (!monthsStr) return 1;
    const match = String(monthsStr).match(/\d+/);
    return match ? parseInt(match[0]) : 1;
}

async function migrate() {
    try {
        console.log('Connecting to MongoDB...', MONGODB_URI.substring(0, 30) + '...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB.');

        console.log('Clearing existing Member and MemberListView data...');
        await Member.deleteMany({});
        await MemberListView.deleteMany({});
        console.log('Existing members cleared.');

        console.log('Reading Excel file...');
        const workbook = xlsx.readFile(EXCEL_PATH);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

        // First row is the nested header, skip it (already index 0)
        const entries = rows.slice(1);
        console.log(`Found ${entries.length} data rows in Excel.`);

        let insertedCount = 0;
        let errorsCount = 0;
        let generatedEmails = new Set();
        
        // Caching plans
        const planCache = {};
        const getOrCreatePlan = async (name, durationStr, amount) => {
             if (!name) return null;
             const planName = String(name).trim();
             if (planCache[planName]) return planCache[planName];
             
             let plan = await Plan.findOne({ name: planName });
             if (!plan) {
                 plan = new Plan({
                     name: planName,
                     duration: parseDuration(durationStr),
                     price: Number(amount) || 0,
                     features: []
                 });
                 await plan.save();
             }
             planCache[planName] = plan._id;
             return plan._id;
        };

        for (let i = 0; i < entries.length; i++) {
            const row = entries[i];
            
            const idNo = row["MEMBER,S DETAILS"];
            const planPackage = row["__EMPTY"];
            const name = row["__EMPTY_1"];
            const months = row["__EMPTY_2"];
            const phoneStr = row["__EMPTY_5"];
            const txDateStr = row["__EMPTY_7"];
            const amount = row["__EMPTY_8"];
            const startDateStr = row["__EMPTY_11"];
            const endDateStr = row["__EMPTY_12"];

            if (!name) {
                // skip empty rows based on missing name
                continue;
            }

            try {
                // Generate a unique dummy email
                let baseId = idNo || `row_${i}`;
                if (generatedEmails.has(baseId)) {
                   baseId = `${baseId}_${i}`;
                }
                const dummyEmail = `${baseId}@fitapp.local`;
                generatedEmails.add(baseId);

                const planId = await getOrCreatePlan(planPackage, months, amount);

                const startDate = parseDate(startDateStr) || new Date();
                const endDate = parseDate(endDateStr);
                
                let isExpired = false;
                if (endDate) {
                    const today = new Date();
                    isExpired = today > endDate;
                }
                
                const member = new Member({
                    memberId: String(idNo || `MANUAL_ID_${i}`),
                    name: String(name).trim(),
                    email: dummyEmail,
                    phone: String(phoneStr || '0000000000').trim(),
                    status: isExpired ? 'Expired' : 'Active',
                    planId: planId,
                    membershipStartDate: startDate,
                    membershipEndDate: endDate,
                    joinDate: startDate,
                    totalPlanPrice: Number(amount) || 0,
                    totalPaid: Number(amount) || 0,
                    paymentStatus: Number(amount) > 0 ? 'paid' : 'unpaid'
                });

                await member.save();
                insertedCount++;
                
                if (insertedCount % 50 === 0) {
                     console.log(`... Inserted ${insertedCount} rows`);
                }

            } catch (err) {
                console.error(`Error inserting row ${i} (Name: ${name}):`, err.message);
                errorsCount++;
            }
        }

        console.log(`Migration completed. Successfully inserted: ${insertedCount}, Errors: ${errorsCount}`);
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
}

migrate();
