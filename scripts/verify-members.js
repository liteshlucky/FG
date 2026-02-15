import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Member from '../models/Member.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fit-app';

// Parse CSV file
function parseCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    // Skip header and empty lines
    const members = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const [id, name, phone] = line.split(',').map(field => field?.trim());

        // Skip empty rows
        if (!id && !name && !phone) continue;

        members.push({
            csvId: id ? parseFloat(id) : null,
            csvName: name || '',
            csvPhone: phone ? parseFloat(phone).toString() : ''
        });
    }

    return members;
}

// Normalize phone number (remove decimals, spaces, etc.)
function normalizePhone(phone) {
    if (!phone) return '';
    return phone.toString().replace(/\.0$/, '').replace(/\s+/g, '').trim();
}

// Normalize name for comparison
function normalizeName(name) {
    if (!name) return '';
    return name.toUpperCase().trim().replace(/\s+/g, ' ');
}

async function verifyMembers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Parse CSV
        const csvPath = path.join(__dirname, '..', 'all_members_list_15-02-2026.csv');
        console.log(`📄 Reading CSV file: ${csvPath}\n`);
        const csvMembers = parseCSV(csvPath);
        console.log(`📊 Found ${csvMembers.length} members in CSV\n`);

        // Fetch all members from database
        console.log('🔍 Fetching members from database...');
        const dbMembers = await Member.find({}).select('memberId name phone email').lean();
        console.log(`✅ Found ${dbMembers.length} members in database\n`);

        // Create lookup maps
        const dbByMemberId = new Map();
        const dbByPhone = new Map();
        const dbByName = new Map();

        dbMembers.forEach(member => {
            if (member.memberId) {
                dbByMemberId.set(member.memberId, member);
            }
            const normalizedPhone = normalizePhone(member.phone);
            if (normalizedPhone) {
                dbByPhone.set(normalizedPhone, member);
            }
            const normalizedName = normalizeName(member.name);
            if (normalizedName) {
                if (!dbByName.has(normalizedName)) {
                    dbByName.set(normalizedName, []);
                }
                dbByName.get(normalizedName).push(member);
            }
        });

        // Verification results
        const notFound = [];
        const needsUpdate = [];
        const exactMatches = [];

        console.log('🔎 Verifying members...\n');
        console.log('='.repeat(80));

        for (const csvMember of csvMembers) {
            const { csvId, csvName, csvPhone } = csvMember;

            // Skip completely empty rows
            if (!csvId && !csvName && !csvPhone) continue;

            const normalizedCsvPhone = normalizePhone(csvPhone);
            const normalizedCsvName = normalizeName(csvName);
            const csvMemberIdStr = csvId ? csvId.toString() : '';

            let dbMember = null;
            let matchType = null;

            // Try to find by memberId first
            if (csvMemberIdStr && dbByMemberId.has(csvMemberIdStr)) {
                dbMember = dbByMemberId.get(csvMemberIdStr);
                matchType = 'ID';
            }
            // Try to find by phone
            else if (normalizedCsvPhone && dbByPhone.has(normalizedCsvPhone)) {
                dbMember = dbByPhone.get(normalizedCsvPhone);
                matchType = 'PHONE';
            }
            // Try to find by name
            else if (normalizedCsvName && dbByName.has(normalizedCsvName)) {
                const nameMatches = dbByName.get(normalizedCsvName);
                if (nameMatches.length === 1) {
                    dbMember = nameMatches[0];
                    matchType = 'NAME';
                }
            }

            if (!dbMember) {
                notFound.push({
                    csvId: csvId || 'N/A',
                    csvName: csvName || 'N/A',
                    csvPhone: normalizedCsvPhone || 'N/A',
                    reason: 'Not found in database'
                });
            } else {
                // Check if all fields match exactly
                const dbMemberIdStr = dbMember.memberId || '';
                const normalizedDbPhone = normalizePhone(dbMember.phone);
                const normalizedDbName = normalizeName(dbMember.name);

                const idMatch = csvMemberIdStr === dbMemberIdStr;
                const phoneMatch = normalizedCsvPhone === normalizedDbPhone;
                const nameMatch = normalizedCsvName === normalizedDbName;

                if (idMatch && phoneMatch && nameMatch) {
                    exactMatches.push({
                        csvId,
                        csvName,
                        csvPhone: normalizedCsvPhone,
                        dbMemberId: dbMember.memberId,
                        dbName: dbMember.name,
                        dbPhone: normalizedDbPhone
                    });
                } else {
                    const mismatches = [];
                    if (!idMatch) mismatches.push(`ID (CSV: ${csvId || 'N/A'}, DB: ${dbMemberIdStr || 'N/A'})`);
                    if (!nameMatch) mismatches.push(`Name (CSV: "${csvName}", DB: "${dbMember.name}")`);
                    if (!phoneMatch) mismatches.push(`Phone (CSV: ${normalizedCsvPhone}, DB: ${normalizedDbPhone})`);

                    needsUpdate.push({
                        matchedBy: matchType,
                        csvId: csvId || 'N/A',
                        csvName: csvName || 'N/A',
                        csvPhone: normalizedCsvPhone || 'N/A',
                        dbMemberId: dbMemberIdStr || 'N/A',
                        dbName: dbMember.name || 'N/A',
                        dbPhone: normalizedDbPhone || 'N/A',
                        dbEmail: dbMember.email || 'N/A',
                        dbObjectId: dbMember._id.toString(),
                        mismatches: mismatches.join(', ')
                    });
                }
            }
        }

        // Print results
        console.log('\n📊 VERIFICATION SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total CSV Members: ${csvMembers.length}`);
        console.log(`Exact Matches: ${exactMatches.length}`);
        console.log(`Needs Update: ${needsUpdate.length}`);
        console.log(`Not Found: ${notFound.length}`);
        console.log('='.repeat(80));

        // Save results to files
        const resultsDir = path.join(__dirname, '..', 'verification-results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir);
        }

        // Not found members
        if (notFound.length > 0) {
            console.log('\n❌ MEMBERS NOT FOUND IN DATABASE:');
            console.log('='.repeat(80));
            const notFoundPath = path.join(resultsDir, 'not-found-members.json');
            fs.writeFileSync(notFoundPath, JSON.stringify(notFound, null, 2));

            notFound.forEach((member, index) => {
                console.log(`${index + 1}. ID: ${member.csvId}, Name: ${member.csvName}, Phone: ${member.csvPhone}`);
            });
            console.log(`\n💾 Saved to: ${notFoundPath}`);
        }

        // Members needing updates
        if (needsUpdate.length > 0) {
            console.log('\n⚠️  MEMBERS NEEDING UPDATES (Mismatches):');
            console.log('='.repeat(80));
            const needsUpdatePath = path.join(resultsDir, 'needs-update-members.json');
            fs.writeFileSync(needsUpdatePath, JSON.stringify(needsUpdate, null, 2));

            needsUpdate.forEach((member, index) => {
                console.log(`\n${index + 1}. Matched by: ${member.matchedBy}`);
                console.log(`   CSV  -> ID: ${member.csvId}, Name: "${member.csvName}", Phone: ${member.csvPhone}`);
                console.log(`   DB   -> ID: ${member.dbMemberId}, Name: "${member.dbName}", Phone: ${member.dbPhone}`);
                console.log(`   Mismatches: ${member.mismatches}`);
                console.log(`   DB ObjectId: ${member.dbObjectId}`);
            });
            console.log(`\n💾 Saved to: ${needsUpdatePath}`);
        }

        // Exact matches summary
        if (exactMatches.length > 0) {
            const exactMatchesPath = path.join(resultsDir, 'exact-matches.json');
            fs.writeFileSync(exactMatchesPath, JSON.stringify(exactMatches, null, 2));
            console.log(`\n✅ ${exactMatches.length} exact matches saved to: ${exactMatchesPath}`);
        }

        console.log('\n✨ Verification complete!\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run verification
verifyMembers();
