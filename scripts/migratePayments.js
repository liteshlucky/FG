
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Define Minimal Schemas
const MemberSchema = new mongoose.Schema({
    memberId: String,
    name: String,
    phone: String,
    totalPaid: Number,
    totalPlanPrice: Number,
    admissionFeeAmount: Number,
    lastPaymentDate: Date,
    lastPaymentAmount: Number,
    paymentStatus: String,
    planId: mongoose.Schema.Types.ObjectId,
    membershipStartDate: Date,
    membershipEndDate: Date,
    status: String,
    ptPlanId: mongoose.Schema.Types.ObjectId // For Trainer/PT tracking
}, { strict: false });

const PaymentSchema = new mongoose.Schema({
    memberId: mongoose.Schema.Types.ObjectId,
    amount: Number,
    paymentDate: Date,
    paymentMode: String,
    paymentCategory: String, // Plan, Trainer, Admission Fee, Other
    transactionType: String,
    planPrice: Number,
    admissionFee: Number,
    specialPlan: String,
    isInstallment: Boolean,
    installmentNumber: Number,
    receiptNumber: String,
    membershipAction: String,
    createdBy: String,
    notes: String
}, { strict: false, timestamps: true });

const PlanSchema = new mongoose.Schema({
    name: String,
    duration: Number, // in months
    price: Number
}, { strict: false });

const Member = mongoose.model('Member', MemberSchema);
const Payment = mongoose.model('Payment', PaymentSchema);
const Plan = mongoose.model('Plan', PlanSchema);

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

// ---- Helpers ----

// Map Excel Plan Name to { name, duration }
function mapPlan(excelPlanName) {
    const p = String(excelPlanName || '').trim().toLowerCase();

    // Explicit Ignore List / Numeric Checks
    if (!p || /^[\d]+$/.test(p)) return null; // Ignore "2000", "1500" etc

    if (p.includes('monthly')) return { name: 'Monthly', duration: 1 };
    if (p.includes('quaterly') || p.includes('quarterly')) return { name: 'Quarterly', duration: 3 };
    if (p.includes('half')) return { name: 'Half Yearly', duration: 6 };
    if (p.includes('yearly') || p.includes('annual')) return { name: 'Yearly', duration: 12 };
    if (p.includes('10 months')) return { name: '10 Months', duration: 10 };

    // Special handling for Trainer/PT
    if (p.includes('pt') || p.includes('trainer')) return { name: 'PT', duration: 1, type: 'Trainer' };

    return null; // Unknown/Custom
}

function calculateEndDate(startDate, durationMonths) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + durationMonths);
    return d;
}

function generateReceiptNumber() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 90000) + 10000;
    return `RCP-${dateStr}-${random}`;
}

async function getOrCreatePlan(planInfo) {
    if (!planInfo || planInfo.type === 'Trainer') return null;

    // Find absolute closest Plan doc or create a placeholder if needed?
    // User wants to map to existing.
    // Find by Name with Start Anchor to avoid substring matches (e.g. 'Yearly' matching 'Half Yearly')
    // We try exact match first, then prefix match
    let plan = await Plan.findOne({ name: new RegExp(`^${planInfo.name}$`, 'i') }); // Exact
    if (!plan) {
        plan = await Plan.findOne({ name: new RegExp(`^${planInfo.name}`, 'i') }); // Prefix (Yearly -> Yearly Membership)
    }

    if (!plan && planInfo.name === '10 Months') {
        // Create 10 Months plan if missing?
        // Let's check if there's a custom plan.
        // For now, return null but user can manually fix or we create it.
        // Better to create it if it's a known valid membership.
        console.log(`Creating missing plan: ${planInfo.name}`);
        plan = await Plan.create({
            name: planInfo.name,
            duration: planInfo.duration,
            price: 0 // Unknown price from lookup
        });
    }

    return plan;
}

// ---- Main Migration ----

async function migratePayments() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        // 0. Cleanup (Optional: remove old payments to avoid duplicates if re-running?)
        // User implied "re-implement", so maybe clear old?
        // To be safe, let's delete all payments imported from Excel (if we can identify them).
        // Or just delete ALL payments if this is a fresh reload.
        console.log('Clearing existing payments...');
        await Payment.deleteMany({});
        // Reset member fields related to payment
        await Member.updateMany({}, {
            $set: {
                totalPaid: 0,
                totalPlanPrice: 0,
                paymentStatus: 'unpaid',
                status: 'Pending',
                planId: null,
                membershipStartDate: null,
                membershipEndDate: null
            }
        });

        // 1. Read Excel
        const filePath = path.join(__dirname, '../payments_15-02-2026.xlsx');
        console.log(`Reading: ${filePath}`);
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log(`Found ${rows.length} rows.`);

        // 2. Cache Members
        const members = await Member.find({});
        const memberMap = new Map(); // normalized phone -> member
        const memberIdMap = new Map(); // mid -> member

        const normalizePhone = (p) => String(p || '').split('.')[0].trim();
        members.forEach(m => {
            if (m.phone) memberMap.set(normalizePhone(m.phone), m);
            if (m.memberId) memberIdMap.set(String(m.memberId).trim(), m);
        });

        let processedCount = 0;
        let skippedCount = 0;

        // 3. Group by Member
        const rowsByMember = {};
        for (const row of rows) {
            const mid = String(row['MID'] || '').trim();
            const phone = normalizePhone(row['Mobile'] || row['Phone']);
            const key = mid || phone;
            if (!key) continue;
            if (!rowsByMember[key]) rowsByMember[key] = [];
            rowsByMember[key].push(row);
        }

        // 4. Process Each Member
        for (const key of Object.keys(rowsByMember)) {
            const memberRows = rowsByMember[key];

            // Find Member
            let member = memberIdMap.get(key) || memberMap.get(key);
            if (!member) {
                // Try alternate lookup
                const row = memberRows[0];
                const altMid = String(row['MID'] || '').trim();
                const altPhone = normalizePhone(row['Mobile'] || row['Phone']);
                member = memberIdMap.get(altMid) || memberMap.get(altPhone);
            }

            if (!member) {
                console.warn(`Skipping member key: ${key} (Rows: ${memberRows.length})`);
                skippedCount += memberRows.length;
                continue;
            }

            // Sort by Date ASC (Oldest first) to build timeline
            memberRows.sort((a, b) => new Date(a['Receipt Date']) - new Date(b['Receipt Date']));

            let runningTotalPaid = 0;
            let currentPlan = null; // { doc, startDate, endDate, totalAmount }
            let latestPlan = null;

            for (const row of memberRows) {
                // Extract Data
                let amountStr = String(row['Paid Amount'] || row['Total Amount'] || '0').replace(/[^\d.-]/g, '');
                const amount = parseFloat(amountStr) || 0;
                const paymentDate = new Date(row['Receipt Date'] || row['Date']);
                const rawPlan = row['Plan'];
                const planInfo = mapPlan(rawPlan);

                let category = 'Plan';
                if (planInfo && planInfo.type === 'Trainer') category = 'Trainer';
                else if (!planInfo) {
                    // Check Description if Plan column is missing/ignored
                    const desc = (row['Description'] || '').toLowerCase();
                    if (desc.includes('trainer') || desc.includes('pt')) category = 'Trainer';
                    else if (desc.includes('admission')) category = 'Admission Fee';
                    else {
                        // Inherit category from context if strictly necessary?
                        // For now default to 'Plan' or 'Other' if ignored
                        if (mapPlan(desc)) category = 'Plan'; // If desc has plan name
                        else category = 'Other';
                    }
                }

                // If explicit Plan found, switch context
                let planDoc = null;
                let membershipAction = 'none';

                if (category === 'Plan' && planInfo) {
                    // New/Renewal Start
                    planDoc = await getOrCreatePlan(planInfo);

                    // Logic: Is this a new cycle?
                    // If currentPlan is expired OR this is a different plan type OR explicit new plan naming
                    // Simplified: Every row with a valid Plan Name starts/extends a cycle?
                    // User said: "check the payments dates.. memberships should be based on that"

                    // If we have an active plan covering this date, maybe this is a part payment?
                    // But Plan column is present. Usually installments align with Plan presence.
                    // Let's assume matches start a cycle.

                    currentPlan = {
                        doc: planDoc,
                        startDate: paymentDate,
                        endDate: calculateEndDate(paymentDate, planInfo.duration),
                        totalAmount: parseFloat(String(row['Actual Amount'] || row['Total Amount']).replace(/[^\d.-]/g, '')) || 0
                    };
                    latestPlan = currentPlan;
                    membershipAction = 'renewal'; // or new
                } else if (category === 'Plan' && !planInfo && currentPlan) {
                    // Part payment for existing plan?
                    // If no Plan name but category 'Plan', treat as installment
                    membershipAction = 'none';
                }

                // Create Payment
                await Payment.create({
                    memberId: member._id,
                    amount: amount,
                    paymentDate: paymentDate,
                    paymentMode: (row['Payment Method'] || 'Cash').toLowerCase(),
                    paymentCategory: category,
                    planType: category === 'Plan' ? 'membership' : (category === 'Trainer' ? 'pt_plan' : 'other'),
                    planId: (category === 'Plan' && currentPlan && currentPlan.doc) ? currentPlan.doc._id : undefined,
                    transactionType: row['Sales Type'] || 'Credit',
                    planPrice: currentPlan ? currentPlan.totalAmount : 0,
                    admissionFee: 0, // TODO: parse if needed
                    specialPlan: row['Discount Code'],
                    isInstallment: !planInfo && category === 'Plan',
                    installmentNumber: 1, // simplified
                    receiptNumber: generateReceiptNumber(),
                    membershipAction: membershipAction,
                    createdBy: row['Added By'] || 'admin',
                    notes: `Imported. Plan: ${rawPlan}`
                });

                if (category === 'Plan') {
                    runningTotalPaid += amount;
                }
            }

            // Update Member Status based on latestPlan
            if (latestPlan && latestPlan.doc) {
                member.planId = latestPlan.doc._id;
                member.membershipStartDate = latestPlan.startDate;
                member.membershipEndDate = latestPlan.endDate;
                member.totalPlanPrice = latestPlan.totalAmount;

                const now = new Date();
                member.status = member.membershipEndDate > now ? 'Active' : 'Expired';
            }

            member.totalPaid = runningTotalPaid;
            // update paymentStatus
            const due = (member.totalPlanPrice || 0) - member.totalPaid;
            if (member.totalPlanPrice > 0) {
                member.paymentStatus = due <= 0 ? 'paid' : (member.totalPaid > 0 ? 'partial' : 'unpaid');
            } else {
                member.paymentStatus = 'unpaid';
            }

            await member.save();
            processedCount += memberRows.length;
        }

        console.log('Migration completed!');
        console.log(`Processed: ${processedCount}`);
        console.log(`Skipped: ${skippedCount}`);

        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migratePayments();
