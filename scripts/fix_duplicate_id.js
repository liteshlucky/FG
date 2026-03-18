import mongoose from 'mongoose';
import xlsx from 'xlsx';
import path from 'path';
import 'dotenv/config';

import Member from '../models/Member.js';
import Plan from '../models/Plan.js';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-fg-db:9bzJGhjTv4e00VGo@fg-db.wbuzptj.mongodb.net/fitapp?retryWrites=true&w=majority";

async function fixAritra() {
    try {
        await mongoose.connect(MONGODB_URI);
        
        const w = xlsx.readFile(path.resolve('./MEMBERSHIP & PAYMENTS.xlsx'));
        const sheet = w.Sheets[w.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
        
        // Find ARITRA MUKHERJEE
        const aritraRow = rows.find(r => r['__EMPTY_1'] === 'ARITRA MUKHERJEE' && r['MEMBER,S DETAILS'] === 332);
        if (!aritraRow) {
            console.log("ARITRA MUKHERJEE not found in excel");
            return;
        }
        
        const amount = aritraRow["__EMPTY_8"];
        const startDateStr = aritraRow["__EMPTY_11"];
        const endDateStr = aritraRow["__EMPTY_12"];
        const phoneStr = aritraRow["__EMPTY_5"];
        const planPackage = aritraRow["__EMPTY"];
        
        // Get plan
        let planId = null;
        if (planPackage) {
             const plan = await Plan.findOne({ name: String(planPackage).trim() });
             if (plan) planId = plan._id;
        }

        const parseDate = (d) => {
             if (!d) return null;
             const p = String(d).split('.');
             if (p.length === 3) return new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
             const dt = new Date(d);
             return isNaN(dt.getTime()) ? null : dt;
        }

        const member = new Member({
            memberId: '333',
            name: 'ARITRA MUKHERJEE',
            email: '333@fitapp.local',
            phone: String(phoneStr || '0000000000').trim(),
            status: 'Active',
            planId: planId,
            membershipStartDate: parseDate(startDateStr) || new Date(),
            membershipEndDate: parseDate(endDateStr),
            joinDate: parseDate(startDateStr) || new Date(),
            totalPlanPrice: Number(amount) || 0,
            totalPaid: Number(amount) || 0,
            paymentStatus: Number(amount) > 0 ? 'paid' : 'unpaid'
        });

        await member.save();
        console.log("Successfully inserted ARITRA MUKHERJEE with ID 333");

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

fixAritra();
