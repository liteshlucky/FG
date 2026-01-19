
/**
 * Import All Sales (PT and Membership)
 * Based on sheets/PT-sales.xlsx and sheets/payments_31-12-2025.xlsx
 */

import mongoose from 'mongoose';
import XLSX from 'xlsx';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Models
import Member from '../models/Member.js';
import Payment from '../models/Payment.js';
import Plan from '../models/Plan.js';
import PTplan from '../models/PTplan.js';
import Trainer from '../models/Trainer.js';

// Load env
dotenv.config({ path: '.env.local' });

const FILES = [
    'sheets/PT-sales.xlsx',
    'sheets/payments_31-12-2025.xlsx'
];

async function connectDB() {
    if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
}

// Helpers
function normalizePhone(phone) {
    if (!phone) return null;
    const cleaned = phone.toString().replace(/\D/g, '');
    return cleaned.length >= 10 ? cleaned.slice(-10) : cleaned; // Last 10 digits
}

function parseAmount(amt) {
    if (!amt) return 0;
    return parseFloat(amt.toString().replace(/[^0-9.]/g, '')) || 0;
}

function getPlanDefinition(amount, type) {
    // Type: 'Plan' or 'Trainer'
    const amt = Math.round(parseAmount(amount));

    if (type === 'Trainer') {
        if (amt === 11000) return { name: 'Quarterly PT', price: 11000, sessions: 36 };
        // Default to Monthly PT for 4000 or others
        return { name: 'Monthly PT', price: 4000, sessions: 12 };
    } else {
        // Plan
        if (amt === 11999 || amt === 12000) return { name: 'Yearly Membership', price: 11999, duration: 12 };
        if (amt === 7999 || amt === 8000) return { name: 'Half Yearly Membership', price: 7999, duration: 6 };
        if (amt === 4999 || amt === 5000) return { name: 'Quarterly Membership', price: 4999, duration: 3 };
        if (amt === 6000) return { name: 'Special Membership', price: 6000, duration: 3 };
        // Default
        return { name: 'Monthly Membership', price: 1999, duration: 1 };
    }
}

async function setupPlans(trainerId) {
    const plansInfo = [
        { name: 'Monthly Membership', price: 1999, duration: 1 },
        { name: 'Quarterly Membership', price: 4999, duration: 3 },
        { name: 'Special Membership', price: 6000, duration: 3 },
        { name: 'Half Yearly Membership', price: 7999, duration: 6 },
        { name: 'Yearly Membership', price: 11999, duration: 12 },
    ];

    const ptPlansInfo = [
        { name: 'Monthly PT', price: 4000, sessions: 12 },
        { name: 'Quarterly PT', price: 11000, sessions: 36 },
    ];

    const planMap = {};
    const ptPlanMap = {};

    console.log('📋 Setting up Plans...');
    for (const p of plansInfo) {
        let plan = await Plan.findOne({ name: p.name });
        if (!plan) {
            plan = await Plan.create({
                name: p.name,
                price: p.price,
                duration: p.duration,
                features: ['Gym Access']
            });
            console.log(`   + Created Plan: ${p.name}`);
        }
        planMap[Math.round(p.price)] = plan;
        // Also map slight variations if needed, but we rely on getPlanDefinition to normalize name
        planMap[p.name] = plan;
    }

    console.log('📋 Setting up PT Plans...');
    for (const p of ptPlansInfo) {
        let ptPlan = await PTplan.findOne({ name: p.name });
        if (!ptPlan) {
            ptPlan = await PTplan.create({
                name: p.name,
                price: p.price,
                sessions: p.sessions,
                trainerId: trainerId
            });
            console.log(`   + Created PT Plan: ${p.name}`);
        }
        ptPlanMap[Math.round(p.price)] = ptPlan;
        ptPlanMap[p.name] = ptPlan;
    }

    return { planMap, ptPlanMap };
}

async function run() {
    try {
        await connectDB();

        // 1. Get/Create Trainer
        let trainer = await Trainer.findOne();
        if (!trainer) {
            trainer = await Trainer.create({ name: 'General Trainer', specialization: 'General' });
            console.log('   + Created Default Trainer');
        }

        // 2. Setup Plans
        const { planMap, ptPlanMap } = await setupPlans(trainer._id);

        // 3. Read Files
        let allRows = [];
        for (const file of FILES) {
            const filePath = path.join(process.cwd(), file);
            console.log(`📖 Reading ${file}...`);
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);
            allRows = allRows.concat(data);
        }
        console.log(`   Total rows: ${allRows.length}`);

        // 4. Group by MID
        const membersMap = new Map();
        for (const row of allRows) {
            const mid = row['MID']?.toString().trim();
            if (!mid) continue; // Skip implicit expense rows without MID

            // Only care about rows relevant to members (Credit usually)
            // But we might want expense info? No, user said "sales report".

            if (!membersMap.has(mid)) {
                membersMap.set(mid, []);
            }
            membersMap.get(mid).push(row);
        }

        console.log(`👥 Found ${membersMap.size} unique MIDs`);

        // 5. Process Members
        let createdMembers = 0;
        let updatedMembers = 0;

        for (const [mid, rows] of membersMap) {
            // Determine details from latest row
            // Sort rows by date (DESC)
            rows.sort((a, b) => {
                const da = new Date(a['Receipt Date'] || 0);
                const db = new Date(b['Receipt Date'] || 0);
                return db - da; // Descending
            });

            const latest = rows[0];
            const name = latest['Name'] || 'Unknown';
            const phone = normalizePhone(latest['Mobile']) || '0000000000';
            const email = `${mid}@fitness.local`; // Generate unique email based on MID to avoid collisions

            // Calculate Join Date (earliest)
            const earliest = rows[rows.length - 1]; // Since sorted desc
            const joinDate = new Date(earliest['Receipt Date'] || Date.now());

            // Check if member exists
            let member = await Member.findOne({ memberId: mid });

            // Determine active plan from latest "Plan" transaction
            const lastPlanTx = rows.find(r => r['Payment Type'] === 'Plan');
            let planId = null;
            let membershipStartDate = null;
            let membershipEndDate = null;

            if (lastPlanTx) {
                const def = getPlanDefinition(lastPlanTx['Actual Amount'], 'Plan');
                const p = planMap[def.name];
                if (p) {
                    planId = p._id;
                    membershipStartDate = new Date(lastPlanTx['Receipt Date'] || Date.now());
                    membershipEndDate = new Date(membershipStartDate);
                    membershipEndDate.setMonth(membershipEndDate.getMonth() + p.duration);
                }
            }

            // Determine PT plan
            const lastPtTx = rows.find(r => r['Payment Type'] === 'Trainer');
            let ptPlanId = null;
            if (lastPtTx) {
                const def = getPlanDefinition(lastPtTx['Actual Amount'], 'Trainer');
                const p = ptPlanMap[def.name];
                if (p) ptPlanId = p._id;
            }

            // Valid status
            let status = 'Expired';
            if (membershipEndDate && membershipEndDate > new Date()) {
                status = 'Active';
            }

            // Upsert Member
            const memberData = {
                memberId: mid,
                name,
                phone,
                joinDate,
                status,
                planId,
                ptPlanId,
                membershipStartDate,
                membershipEndDate,
                trainerId: ptPlanId ? trainer._id : undefined
            };

            if (member) {
                // Update
                // Don't overwrite email to avoid breaking existing real emails if manually edited
                await Member.updateOne({ _id: member._id }, memberData);
                updatedMembers++;
            } else {
                // Create
                memberData.email = email;
                member = await Member.create(memberData);
                createdMembers++;
            }

            // 6. Process Payments for this member
            // We iterate all rows for this member
            for (const row of rows) {
                const amount = parseAmount(row['Total Amount']);
                if (amount <= 0) continue;

                // Check for duplicate payment: MemberId + Date + Amount
                const pDate = new Date(row['Receipt Date'] || Date.now());
                const type = row['Payment Type'] === 'Trainer' ? 'pt_plan' : 'membership';

                // Identify Plan/PTPlan
                let relatedPlanId = null;
                const def = getPlanDefinition(row['Actual Amount'], row['Payment Type']);
                if (row['Payment Type'] === 'Trainer') {
                    // Check ptPlanMap
                    if (ptPlanMap[def.name]) relatedPlanId = ptPlanMap[def.name]._id;
                } else {
                    if (planMap[def.name]) relatedPlanId = planMap[def.name]._id;
                }

                if (!relatedPlanId) continue; // Skip if can't map to a plan

                // Check duplicate
                // We define duplicate as: same member, same date (approx), same amount
                // Exact date matching might be tricky due to time components, checking range of same day
                const startOfDay = new Date(pDate); startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(pDate); endOfDay.setHours(23, 59, 59, 999);

                const existingPayment = await Payment.findOne({
                    memberId: member._id,
                    amount: amount,
                    paymentDate: { $gte: startOfDay, $lte: endOfDay }
                });

                if (!existingPayment) {
                    await Payment.create({
                        memberId: member._id,
                        planType: type, // New enum value 'membership' or 'pt_plan'
                        planId: relatedPlanId,
                        amount: amount,
                        paymentMode: row['Payment Method']?.toLowerCase() || 'cash',
                        paymentDate: pDate,
                        paymentStatus: 'completed',
                        notes: `Imported: ${row['Description']}`,
                        createdBy: 'import_script'
                    });
                }
            }
        }

        console.log(`\nResults:`);
        console.log(`Created Members: ${createdMembers}`);
        console.log(`Updated Members: ${updatedMembers}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}

run();
