/**
 * Database Restore Script
 * 
 * This script restores MongoDB collections from a backup JSON file.
 * 
 * Usage: node scripts/restore-database.js <backup-file-path>
 * Example: node scripts/restore-database.js backups/fit-app-backup-2025-12-02.json
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import all models to register schemas
import '../models/Member.js';
import '../models/Trainer.js';
import '../models/Plan.js';
import '../models/PTplan.js';
import '../models/Payment.js';
import '../models/Attendance.js';
import '../models/TrainerAttendance.js';
import '../models/TrainerPayment.js';
import '../models/Transaction.js';
import '../models/Discount.js';
import '../models/Counter.js';
import '../models/User.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

async function restoreDatabase(backupFilePath) {
    try {
        // Check if backup file exists
        if (!fs.existsSync(backupFilePath)) {
            console.error(`❌ Backup file not found: ${backupFilePath}`);
            process.exit(1);
        }

        console.log('📖 Reading backup file...');
        const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

        console.log('\n📋 Backup Information:');
        console.log(`   📅 Backup Date: ${backupData.metadata.backupDate}`);
        console.log(`   🗄️  Database: ${backupData.metadata.databaseName}`);
        console.log(`   📦 Collections: ${backupData.metadata.totalCollections}`);

        console.log('\n🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;

        console.log('\n⚠️  WARNING: This will replace existing data in the database!');
        console.log('🔄 Starting restore process...\n');

        let totalDocuments = 0;

        for (const [collectionName, documents] of Object.entries(backupData.data)) {
            if (documents.length === 0) {
                console.log(`   ⏭️  Skipping empty collection: ${collectionName}`);
                continue;
            }

            console.log(`   📄 Restoring: ${collectionName}...`);

            const collection = db.collection(collectionName);

            // Clear existing data in collection
            await collection.deleteMany({});

            // Insert backup data
            await collection.insertMany(documents);

            totalDocuments += documents.length;
            console.log(`      ✓ Restored ${documents.length} documents`);
        }

        console.log('\n✅ Restore completed successfully!');
        console.log(`📊 Total documents restored: ${totalDocuments}`);
        console.log(`📦 Collections restored: ${Object.keys(backupData.data).length}`);

        await mongoose.connection.close();
        console.log('\n🔒 Database connection closed');

    } catch (error) {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    }
}

// Get backup file path from command line arguments
const backupFilePath = process.argv[2];

if (!backupFilePath) {
    console.error('❌ Please provide a backup file path');
    console.log('\nUsage: node scripts/restore-database.js <backup-file-path>');
    console.log('Example: node scripts/restore-database.js backups/fit-app-backup-2025-12-02.json');
    process.exit(1);
}

// Run restore
restoreDatabase(backupFilePath);
