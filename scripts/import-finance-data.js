require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const Transaction = require('../models/Transaction');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Please define the MONGODB_URI environment variable inside .env.local');
    process.exit(1);
}

const filePath = '/Users/apple/Desktop/fit-app/payments_25-11-2025 (1).xlsx';

async function importData() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        console.log(`Found ${data.length} records to process.`);

        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
            try {
                // Map fields
                const amountStr = row['Total Amount'] || '0';
                const amount = parseFloat(amountStr.toString().replace(/[^0-9.]/g, ''));

                if (!amount) {
                    console.log('Skipping row with 0 amount:', row['S.No.']);
                    continue;
                }

                const dateStr = row['Receipt Date'];
                const date = dateStr ? new Date(dateStr) : new Date();

                let type = 'income';
                let category = 'General';
                let title = row['Name'] || 'Unknown';

                // Determine Type and Category
                if (row['Sales Type'] === 'Debit' || row['Payment Type'] === 'Expense') {
                    type = 'expense';
                    title = row['Description'] || 'Expense';
                    category = row['Description'] || 'General';
                } else {
                    type = 'income';
                    category = row['Payment Type'] || 'Membership';
                    if (row['Description'] && row['Description'] !== 'Plan') {
                        category = row['Description'];
                    }
                }

                // Normalize Payment Mode
                let mode = 'cash';
                const method = (row['Payment Method'] || '').toLowerCase();
                if (method.includes('card')) mode = 'card';
                else if (method.includes('upi') || method.includes('online') || method.includes('phonepe') || method.includes('gpay')) mode = 'upi';
                else if (method.includes('bank') || method.includes('transfer')) mode = 'bank_transfer';
                else if (method.includes('cheque')) mode = 'cheque';

                const transaction = new Transaction({
                    title: title,
                    amount: amount,
                    type: type,
                    category: category,
                    paymentMode: mode,
                    date: date,
                    notes: `Imported. MID: ${row['MID'] || ''}, Mobile: ${row['Mobile'] || ''}, Desc: ${row['Description'] || ''}`
                });

                await transaction.save();
                successCount++;
            } catch (err) {
                console.error(`Error importing row ${row['S.No.']}:`, err.message);
                errorCount++;
            }
        }

        console.log(`Import completed. Success: ${successCount}, Failed: ${errorCount}`);

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

importData();
