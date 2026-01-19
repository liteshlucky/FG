
const XLSX = require('xlsx');
const path = require('path');

const files = [
    'sheets/PT-sales.xlsx',
    'sheets/payments_31-12-2025.xlsx'
];

function analyze() {
    const descriptions = new Set();
    const amounts = new Set();
    const paymentTypes = new Set();
    const actualAmounts = new Set();
    const mapping = new Set();

    files.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        try {
            const workbook = XLSX.readFile(filePath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(sheet);

            data.forEach(row => {
                if (row['Description']) descriptions.add(row['Description']);
                if (row['Amount']) amounts.add(row['Amount']);
                if (row['Actual Amount']) actualAmounts.add(row['Actual Amount']);
                if (row['Payment Type']) paymentTypes.add(row['Payment Type']);

                mapping.add(`${row['Payment Type']} | ${row['Description']} | ${row['Actual Amount']}`);
            });
        } catch (e) {
            console.error(`Error reading ${file}:`, e.message);
        }
    });

    console.log('Unique Payment Types:', Array.from(paymentTypes));
    console.log('Unique Descriptions:', Array.from(descriptions));
    console.log('Unique Actual Amounts:', Array.from(actualAmounts));
    console.log('\nMapping (Type | Desc | Amount):');
    Array.from(mapping).sort().forEach(m => console.log(m));
}

analyze();
