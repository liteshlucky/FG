import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

// Minimal schemas
const PaymentSchema = new mongoose.Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
    planType: String,
    amount: Number,
    paymentStatus: String,
}, { collection: 'payments', strict: false });

const MemberSchema = new mongoose.Schema({
    memberId: String,
    totalPlanPrice: Number,
    admissionFeeAmount: Number,
    totalPaid: Number,
    paymentStatus: String,
    ptTotalPlanPrice: Number,
    ptTotalPaid: Number,
    ptPaymentStatus: String,
}, { collection: 'members', strict: false });

const MemberListViewSchema = new mongoose.Schema({
    memberId: String,
    paymentStatus: String,
    ptPaymentStatus: String,
}, { collection: 'memberlistviews', strict: false });

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
    const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);
    const MemberListView = mongoose.models.MemberListView || mongoose.model('MemberListView', MemberListViewSchema);

    const specificMemberId = process.argv[2];
    
    let membersToFix = [];
    if (specificMemberId) {
        membersToFix = await Member.find({ memberId: specificMemberId });
        console.log(`Found ${membersToFix.length} matching member(s) with memberId=${specificMemberId}`);
    } else {
        membersToFix = await Member.find({});
        console.log(`Processing all ${membersToFix.length} members...`);
    }

    let updatedCount = 0;

    for (const member of membersToFix) {
        let calculatedMembershipPaid = 0;
        let calculatedPTPaid = 0;

        // Fetch ALL completed payments for this member
        const payments = await Payment.find({ 
            memberId: member._id,
            paymentStatus: { $in: ['completed', 'success', undefined] } // Handle legacy missing status just in case
        });
        
        // Wait, what if paymentStatus is strictly 'completed'? Some might not have it.
        const allMemberPayments = await Payment.find({ memberId: member._id });
        for (const p of allMemberPayments) {
            // we assume if not failed, it's paid
            if (p.paymentStatus === 'failed') continue;
            
            const planType = p.planType || '';
            const amount = p.amount || 0;
            
            if (planType.toLowerCase() === 'ptplan' || planType.toLowerCase() === 'pt_plan') {
                calculatedPTPaid += amount;
            } else {
                // Default to membership payment
                calculatedMembershipPaid += amount;
            }
        }

        let needsUpdate = false;
        
        // 1. Check Membership Payment Status
        const oldMembershipPaid = member.totalPaid || 0;
        if (oldMembershipPaid !== calculatedMembershipPaid) {
            console.log(`Mismatch (Membership) for ${member.memberId || member._id}: current totalPaid=${oldMembershipPaid}, actual=${calculatedMembershipPaid}`);
            member.totalPaid = calculatedMembershipPaid;
            needsUpdate = true;
        }

        const mTotalDue = (member.totalPlanPrice || 0) + (member.admissionFeeAmount || 0);
        let mNewStatus = member.paymentStatus || 'unpaid';

        if (mTotalDue > 0) {
            if (member.totalPaid >= mTotalDue) mNewStatus = 'paid';
            else if (member.totalPaid > 0 && member.totalPaid < mTotalDue) mNewStatus = 'partial';
            else if (member.totalPaid === 0) mNewStatus = 'unpaid';
        } else {
            if (member.totalPaid > 0) {
                mNewStatus = 'paid';
            }
        }

        if (member.paymentStatus !== mNewStatus) {
            console.log(`Status update (Membership) for ${member.memberId || member._id}: ${member.paymentStatus} -> ${mNewStatus}`);
            member.paymentStatus = mNewStatus;
            needsUpdate = true;
        }

        // 2. Check PT Payment Status
        const oldPTPaid = member.ptTotalPaid || 0;
        if (oldPTPaid !== calculatedPTPaid) {
            console.log(`Mismatch (PT) for ${member.memberId || member._id}: current ptTotalPaid=${oldPTPaid}, actual=${calculatedPTPaid}`);
            member.ptTotalPaid = calculatedPTPaid;
            needsUpdate = true;
        }

        const ptTotalDue = member.ptTotalPlanPrice || 0;
        let ptNewStatus = member.ptPaymentStatus || 'unpaid';

        if (ptTotalDue > 0) {
            if (member.ptTotalPaid >= ptTotalDue) ptNewStatus = 'paid';
            else if (member.ptTotalPaid > 0 && member.ptTotalPaid < ptTotalDue) ptNewStatus = 'partial';
            else if (member.ptTotalPaid === 0) ptNewStatus = 'unpaid';
        } else {
            if (member.ptTotalPaid > 0) {
                ptNewStatus = 'paid';
            }
        }

        if (member.ptPaymentStatus !== ptNewStatus) {
            console.log(`Status update (PT) for ${member.memberId || member._id}: ${member.ptPaymentStatus} -> ${ptNewStatus}`);
            member.ptPaymentStatus = ptNewStatus;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await member.save();
            await MemberListView.updateOne(
                { _id: member._id },
                { $set: { paymentStatus: member.paymentStatus, ptPaymentStatus: member.ptPaymentStatus } }
            );
            
            updatedCount++;
            console.log(`✅ Fixed member: ${member.memberId}`);
        }
    }
    
    console.log(`\nFinished! Updated ${updatedCount} member(s).`);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
}

run();
