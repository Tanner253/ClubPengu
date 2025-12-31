/**
 * Admin script to set user role (admin or moderator)
 * Usage: node server/scripts/setUserRole.js <walletAddress> <role>
 * Example: node server/scripts/setUserRole.js 8nDEcDzV7xGiiWSQSHg5W7eouAtFhG2YN6QEKFCzjivK admin
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const User = (await import('../db/models/User.js')).default;

async function setUserRole() {
    const walletAddress = process.argv[2];
    const role = process.argv[3];

    if (!walletAddress || !role) {
        console.error('Usage: node server/scripts/setUserRole.js <walletAddress> <role>');
        console.error('Roles: admin, moderator');
        process.exit(1);
    }

    if (role !== 'admin' && role !== 'moderator') {
        console.error('Invalid role. Must be "admin" or "moderator"');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const user = await User.findOne({ walletAddress });
        if (!user) {
            console.error(`❌ User not found: ${walletAddress}`);
            process.exit(1);
        }

        console.log(`\n📋 Current user info:`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Current role: ${user.role || 'null (no role)'}`);
        console.log(`   Wallet: ${walletAddress}`);

        user.role = role;
        await user.save();

        console.log(`\n✅ Successfully set role to "${role}" for ${user.username}`);
        console.log(`   Updated user: ${user.username} (${walletAddress.slice(0, 8)}...)`);
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

setUserRole();

