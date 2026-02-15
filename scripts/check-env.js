import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env.local') });

console.log('📋 Environment Check:');
console.log('='.repeat(80));
console.log('MONGODB_URI from .env.local:', process.env.MONGODB_URI);
console.log('='.repeat(80));
