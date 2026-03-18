require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function fixTrainerCounter() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Counter = require('./models/Counter').default || require('./models/Counter');
        
        await Counter.findByIdAndUpdate('trainerId', { seq: 14 }, { upsert: true });
        console.log(`Updated Counter 'trainerId' back to seq: 14`);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

fixTrainerCounter();
