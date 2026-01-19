const XLSX = require('xlsx');
const path = require('path');

const filePath = process.argv[2] || '/Users/apple/Desktop/fit-app/payments_25-11-2025 (1).xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log('Total rows:', data.length);
    console.log('First 3 rows:', JSON.stringify(data.slice(0, 3), null, 2));
    console.log('Headers:', Object.keys(data[0] || {}));
} catch (error) {
    console.error('Error reading file:', error);
}
