require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function dropIndex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Member = require('./models/Member').default || require('./models/Member');
        const MemberListView = require('./models/MemberListView').default || require('./models/MemberListView');
        
        // Members collection
        try {
            await Member.collection.dropIndex('email_1');
            console.log("Successfully dropped 'email_1' index from members.");
        } catch (e) {
            if (e.code === 27) {
                console.log("Index 'email_1' does not exist on members.");
            } else {
                console.error("Error dropping member index:", e);
            }
        }
        
        // MemberListViews collection
        try {
            await MemberListView.collection.dropIndex('email_1');
            console.log("Successfully dropped 'email_1' index from memberlistviews.");
        } catch (e) {
            if (e.code === 27) {
                console.log("Index 'email_1' does not exist on memberlistviews.");
            } else {
                console.error("Error dropping memberlistviews index:", e);
            }
        }
        
    } catch (err) {
        console.error("Connection Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

dropIndex();
