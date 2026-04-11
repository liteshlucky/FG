import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    const m = await db.collection("members").findOne({ memberId: "311" });
    if (!m) {
        console.log("Member 311 not found!");
        return;
    }
    console.log("Member:", JSON.stringify(m, null, 2));
    
    const p = await db.collection("payments").find({ memberId: m._id }).toArray();
    console.log("Payments:", JSON.stringify(p, null, 2));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    mongoose.disconnect();
  }
}

run();
