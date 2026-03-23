const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://developerlitesh:7Vd9gq7l8K1eUaE7@cluster0.zowok.mongodb.net/fit-app?retryWrites=true&w=majority&appName=Cluster0")
    .then(async () => {
        console.log('Connected to MongoDB');
        
        try {
            const db = mongoose.connection.db;
            const records = await db.collection('trainerattendances').find({}).toArray();
            console.log('Total trainer attendances:', records.length);
            
            if (records.length > 0) {
                const latestRecords = await db.collection('trainerattendances')
                    .find()
                    .sort({ checkIn: -1 })
                    .limit(5)
                    .toArray();
                
                console.log('Latest 5 records:');
                latestRecords.forEach(r => {
                    console.log(`ID: ${r._id}, Date: ${r.date}, CheckIn: ${r.checkIn}`);
                });
            }
            
        } catch (e) {
            console.error(e);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => console.error(err));
