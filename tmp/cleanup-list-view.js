const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env.local');
    process.exit(1);
}

// Minimal models
const MemberListViewSchema = new mongoose.Schema({}, { strict: false });
const MemberListView = mongoose.models.MemberListView || mongoose.model('MemberListView', MemberListViewSchema);

const MemberSchema = new mongoose.Schema({}, { strict: false });
const Member = mongoose.models.Member || mongoose.model('Member', MemberSchema);

async function cleanup() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const listViewMembers = await MemberListView.find({}, { _id: 1 });
        console.log(`Found ${listViewMembers.length} members in List View.`);

        let deletedCount = 0;
        for (const lvMember of listViewMembers) {
            const exists = await Member.exists({ _id: lvMember._id });
            if (!exists) {
                await MemberListView.findByIdAndDelete(lvMember._id);
                console.log(`🗑️ Removed orphaned list record for ID: ${lvMember._id}`);
                deletedCount++;
            }
        }

        console.log(`Cleanup complete. Deleted ${deletedCount} orphaned records.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

cleanup();
