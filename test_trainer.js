require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
async function checkTrainers() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Trainer = require('./models/Trainer').default || require('./models/Trainer');
    let trainers = await Trainer.find({}, { trainerId: 1 }).lean();
    console.log(JSON.stringify(trainers));
    await mongoose.disconnect();
}
checkTrainers();
