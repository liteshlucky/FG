import xlsx from 'xlsx';
const w = xlsx.readFile('/Users/apple/Desktop/fit-app/MEMBERSHIP & PAYMENTS.xlsx');
const sheetName = w.SheetNames[0];
const sheet = w.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(sheet, { defval: "" });
console.log(data.slice(330, 336).map(row => ({
  id: row['MEMBER,S DETAILS'],
  name: row['__EMPTY_1']
})));
