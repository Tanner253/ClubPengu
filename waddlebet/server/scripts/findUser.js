/**
 * Quick script to find a user by wallet address (with fuzzy matching)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../db/connection.js';
import User from '../db/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const searchTerm = process.argv[2];

if (!searchTerm) {
    console.error('Usage: node server/scripts/findUser.js <walletAddress or username>');
    process.exit(1);
}

async function findUser() {
    try {
        await connectDB();
        console.log('✅ Connected to database\n');
        
        // Try exact match first
        let user = await User.findOne({ walletAddress: searchTerm });
        if (!user) {
            // Try case-insensitive
            user = await User.findOne({ 
                walletAddress: { $regex: new RegExp(`^${searchTerm}$`, 'i') } 
            });
        }
        if (!user) {
            // Try partial match
            user = await User.findOne({ 
                walletAddress: { $regex: searchTerm, $options: 'i' } 
            });
        }
        if (!user) {
            // Try username
            user = await User.findOne({ username: { $regex: searchTerm, $options: 'i' } });
        }
        
        if (user) {
            console.log('✅ User found:');
            console.log(`   Wallet: ${user.walletAddress}`);
            console.log(`   Username: ${user.username}`);
            console.log(`   Created: ${user.createdAt}`);
            console.log(`   Last Login: ${user.lastLoginAt || 'Never'}`);
        } else {
            console.log('❌ User not found');
            // Show similar wallet addresses
            const similar = await User.find({
                walletAddress: { $regex: searchTerm.slice(0, 8), $options: 'i' }
            }).limit(5).select('walletAddress username');
            
            if (similar.length > 0) {
                console.log('\n🔍 Similar wallet addresses:');
                similar.forEach(u => {
                    console.log(`   ${u.walletAddress} (${u.username})`);
                });
            }
        }
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await disconnectDB();
    }
}

findUser();

