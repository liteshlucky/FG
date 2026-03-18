import mongoose from 'mongoose';
import 'dotenv/config'; 
import Member from '../models/Member.js';

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Vercel-Admin-fg-db:9bzJGhjTv4e00VGo@fg-db.wbuzptj.mongodb.net/fitapp?retryWrites=true&w=majority";

async function verify() {
    try {
        await mongoose.connect(MONGODB_URI);
        const count = await Member.countDocuments();
        console.log(`Total members in DB: ${count}`);
        
        const member332 = await Member.findOne({ memberId: '332' });
        console.log('Member with ID 332:', member332 ? member332.name : 'Not found');
        
        const memberAritra = await Member.find({ name: /ARITRA MUKHERJEE/i });
        console.log('Members named ARITRA MUKHERJEE:', memberAritra.map(m => ({ id: m.memberId, name: m.name })));
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
