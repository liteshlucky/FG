require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function syncCounter() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Member = require('./models/Member').default || require('./models/Member');
        const Counter = require('./models/Counter').default || require('./models/Counter');
        
        let members = await Member.find({}, { memberId: 1 }).lean();
        
        let maxId = 0;
        for (let m of members) {
            let num = parseInt(m.memberId, 10);
            if (!isNaN(num) && num > maxId) {
                maxId = num;
            }
        }
        
        console.log("Max memberId found:", maxId);
        
        let counter = await Counter.findById('memberId');
        console.log("Current counter seq before update:", counter ? counter.seq : 'None');
        
        // Update counter to maxId
        await Counter.findByIdAndUpdate('memberId', { seq: maxId }, { upsert: true });
        console.log(`Updated Counter 'memberId' to seq: ${maxId}`);
        
        // Also sync trainerId to be safe
        const Trainer = require('./models/Trainer').default || require('./models/Trainer');
        let trainers = await Trainer.find({}, { trainerId: 1 }).lean();
        
        let maxTrainerId = 0;
        for (let t of trainers) {
            let num = parseInt(t.trainerId, 10);
            if (!isNaN(num) && num > maxTrainerId) {
                maxTrainerId = num;
            }
        }
        
        console.log("Max trainerId found:", maxTrainerId);
        
        let trainerCounter = await Counter.findById('trainerId');
        console.log("Current trainer counter seq before update:", trainerCounter ? trainerCounter.seq : 'None');
        
        await Counter.findByIdAndUpdate('trainerId', { seq: maxTrainerId }, { upsert: true });
        console.log(`Updated Counter 'trainerId' to seq: ${maxTrainerId}`);
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

syncCounter();
