/**
 * Database Backup Script
 * 
 * This script exports all MongoDB collections to a single JSON file
 * that can be easily restored later.
 * 
 * Usage: node scripts/backup-database.js
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

async function backupDatabase() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        const backup = {
            metadata: {
                backupDate: new Date().toISOString(),
                databaseName: db.databaseName,
                collections: collections.map(c => c.name),
                totalCollections: collections.length
            },
            data: {}
        };

        console.log(`\n📦 Found ${collections.length} collections to backup:\n`);

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;
            console.log(`   📄 Backing up: ${collectionName}...`);

            const collection = db.collection(collectionName);
            const documents = await collection.find({}).toArray();

            backup.data[collectionName] = documents;
            console.log(`      ✓ Exported ${documents.length} documents`);
        }

        // Create backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const backupDir = path.join(process.cwd(), 'backups');

        // Create backups directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupFilePath = path.join(backupDir, `fit-app-backup-${timestamp}.json`);

        // Write backup to file
        fs.writeFileSync(backupFilePath, JSON.stringify(backup, null, 2));

        const fileSize = (fs.statSync(backupFilePath).size / 1024 / 1024).toFixed(2);

        console.log('\n✅ Backup completed successfully!');
        console.log(`\n📁 Backup file: ${backupFilePath}`);
        console.log(`📊 File size: ${fileSize} MB`);
        console.log(`📅 Backup date: ${backup.metadata.backupDate}`);
        console.log(`📦 Total collections: ${backup.metadata.totalCollections}`);

        // Print summary
        console.log('\n📋 Backup Summary:');
        for (const [collectionName, documents] of Object.entries(backup.data)) {
            console.log(`   • ${collectionName}: ${documents.length} documents`);
        }

        await mongoose.connection.close();
        console.log('\n🔒 Database connection closed');

    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    }
}

// Run backup
backupDatabase();
