/**
 * Update ban reason for a user
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../db/connection.js';
import User from '../db/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const walletAddress = process.argv[2];
const banReason = process.argv[3];

if (!walletAddress || !banReason) {
    console.error('Usage: node server/scripts/updateBanReason.js <walletAddress> "<banReason>"');
    process.exit(1);
}

async function updateBanReason() {
    try {
        await connectDB();
        console.log('✅ Connected to database\n');
        
        const user = await User.findOne({ walletAddress });
        if (!user) {
            console.error(`❌ User not found: ${walletAddress}`);
            process.exit(1);
        }
        
        console.log(`👤 User: ${user.username} (${walletAddress.slice(0, 8)}...)\n`);
        console.log(`📝 Current ban reason: ${user.banReason || 'None'}\n`);
        
        user.banReason = banReason;
        user.isBanned = true; // Ensure they're banned
        await user.save();
        
        console.log(`✅ Updated ban reason:`);
        console.log(`   "${banReason}"\n`);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await disconnectDB();
    }
}

updateBanReason();

