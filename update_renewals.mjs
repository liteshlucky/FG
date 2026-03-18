import dotenv from 'dotenv';
import mongoose from 'mongoose';
import xlsx from 'xlsx';

dotenv.config({ path: '.env.local' });

// Function to parse dd.mm.yyyy to Date object
function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // months are 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(Date.UTC(year, month, day, 18, 30, 0)); // Aligning with local timezone offsets
  }
  return null;
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    // Read the excel file
    const workbook = xlsx.readFile('./renewals.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log(`Processing ${data.length} rows...`);
    
    let updatedCount = 0;
    let notFoundCount = 0;
    
    for (const row of data) {
      if (!row["MEMBER'S NAME"] || !row["I'D NO"]) continue;
      
      const memberId = row["I'D NO"].toString();
      const excelName = row["MEMBER'S NAME"];
      const amount = row["AMOUNT"] || 0;
      const due = row["DUE"] || 0;
      const totalPlanPrice = amount + due;
      const paymentMode = (row["PAY - TYPE"] || "cash").toLowerCase();
      const startDate = parseDate(row["STATING DATE"]);
      const endDate = parseDate(row["ENDING DATE"]);
      
      const member = await db.collection('members').findOne({ memberId: memberId });
      
      if (!member) {
        console.log(`[NOT FOUND] ID: ${memberId}, Name: ${excelName}`);
        notFoundCount++;
        continue;
      }
      
      console.log(`[FOUND] ID: ${memberId}, DB Name: ${member.name}, Excel Name: ${excelName}`);
      
      const paymentStatus = due > 0 ? 'partial' : 'paid';
      
      // Update the member in DB
      await db.collection('members').updateOne(
        { _id: member._id },
        {
          $set: {
            status: 'Active',
            membershipStartDate: startDate || member.membershipStartDate,
            membershipEndDate: endDate || member.membershipEndDate,
            totalPlanPrice: totalPlanPrice,
            totalPaid: amount,
            paymentStatus: paymentStatus,
            lastPaymentDate: new Date(),
            lastPaymentAmount: amount,
            updatedAt: new Date()
          }
        }
      );
      
      // Update memberlistviews
      await db.collection('memberlistviews').updateOne(
        { _id: member._id },
        {
          $set: {
            status: 'Active',
            membershipStartDate: startDate || member.membershipStartDate,
            membershipEndDate: endDate || member.membershipEndDate,
            paymentStatus: paymentStatus,
            planName: row["PKG"] || member.planName,
            planDuration: parseInt((row["PKG"] || "").split(" ")[0]) || member.planDuration
          }
        }
      );
      
      // Insert Payment record
      const paymentDoc = {
        _id: new mongoose.Types.ObjectId(),
        memberId: member._id,
        planType: 'membership',
        planId: member.planId || new mongoose.Types.ObjectId(), // We might not have a correct plan ID, fallback to fallback
        amount: amount,
        paymentMode: paymentMode === 'cash' ? 'cash' : (paymentMode === 'upi' ? 'upi' : 'cash'),
        paymentDate: new Date(),
        paymentStatus: 'completed',
        transactionId: 'RENEWAL_EXCEL_IMPORT',
        notes: `Imported from renewals.xlsx. Package: ${row["PKG"]}`,
        createdBy: 'System Import',
        paymentCategory: 'Plan',
        transactionType: 'Credit',
        planPrice: totalPlanPrice,
        admissionFee: 0,
        specialPlan: '',
        isInstallment: due > 0,
        installmentNumber: 1,
        receiptNumber: `REC-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        membershipAction: 'renewal',
        createdAt: new Date(),
        updatedAt: new Date(),
        __v: 0
      };
      
      await db.collection('payments').insertOne(paymentDoc);
      
      console.log(`[UPDATED] ID: ${memberId} - ${excelName} updated successfully.`);
      updatedCount++;
    }
    
    console.log(`\n--- Summary ---`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Not Found: ${notFoundCount}`);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
