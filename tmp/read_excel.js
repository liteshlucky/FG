const xlsx = require('xlsx');

function readExcel() {
  const file = '/Users/apple/Desktop/fit-app/MEMBERSHIP & PAYMENTS.xlsx';
  const workbook = xlsx.readFile(file);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  
  console.log('Total Rows:', data.length);
  console.log('First 3 Rows:');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
}

readExcel();
