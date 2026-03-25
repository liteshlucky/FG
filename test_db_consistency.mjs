import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const db = mongoose.connection.db;
    
    const listViews = await db.collection('memberlistviews').find({}).toArray();
    console.log(`Found ${listViews.length} members in memberlistviews`);

    let missingCount = 0;
    const missingIds = [];

    for (const view of listViews) {
        const member = await db.collection('members').findOne({ _id: view._id });
        if (!member) {
            missingCount++;
            missingIds.push({ _id: view._id, name: view.name });
        }
    }

    console.log(`Missing: ${missingCount}`);
    if (missingCount > 0) {
        console.log('Missing IDs:', missingIds);
    }
    process.exit(0);
}

run().catch(console.error);
