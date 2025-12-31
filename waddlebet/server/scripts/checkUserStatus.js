/**
 * Check user status - verify ban status and cosmetics
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../db/connection.js';
import User from '../db/models/User.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import MarketListing from '../db/models/MarketListing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const walletAddress = process.argv[2] || '2ywHNzKQ1DU3JoA7bRQCBNUBcihfzXsy6dM8A8bne18v';

async function checkUserStatus() {
    try {
        await connectDB();
        console.log('✅ Connected to database\n');
        
        const user = await User.findOne({ walletAddress });
        if (!user) {
            console.error(`❌ User not found: ${walletAddress}`);
            process.exit(1);
        }
        
        console.log(`👤 User: ${user.username}`);
        console.log(`   Wallet: ${user.walletAddress}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Last Login: ${user.lastLoginAt || 'Never'}`);
        console.log(`   Last IP: ${user.lastIpAddress || 'Unknown'}\n`);
        
        // Check ban status
        console.log(`🚫 Ban Status:`);
        console.log(`   isBanned: ${user.isBanned}`);
        console.log(`   banReason: ${user.banReason || 'None'}`);
        console.log(`   banExpires: ${user.banExpires || 'Permanent'}\n`);
        
        // Check cosmetics
        const cosmetics = await OwnedCosmetic.find({ ownerId: walletAddress });
        console.log(`📦 Cosmetics: ${cosmetics.length} total`);
        const active = cosmetics.filter(c => !c.convertedToGold);
        console.log(`   - Active: ${active.length}`);
        console.log(`   - Converted: ${cosmetics.length - active.length}\n`);
        
        // Check marketplace listings
        const listings = await MarketListing.find({ 
            sellerId: walletAddress, 
            status: 'active' 
        });
        console.log(`🏪 Marketplace Listings: ${listings.length} active\n`);
        
        // Check pebbles
        console.log(`💰 Currency:`);
        console.log(`   Coins: ${user.coins}`);
        console.log(`   Pebbles: ${user.pebbles}`);
        console.log(`   Total Deposited: ${user.pebbleStats?.totalDeposited || 0}`);
        console.log(`   Total Withdrawn: ${user.pebbleStats?.totalWithdrawn || 0}`);
        console.log(`   Total Spent: ${user.pebbleStats?.totalSpent || 0}\n`);
        
        // Summary
        console.log(`📊 Summary:`);
        const issues = [];
        if (!user.isBanned) issues.push('❌ User is NOT banned');
        if (active.length > 0) issues.push(`⚠️  Still has ${active.length} active cosmetics`);
        if (listings.length > 0) issues.push(`⚠️  Has ${listings.length} active marketplace listings`);
        
        if (issues.length === 0) {
            console.log('✅ User is fully dealt with:');
            console.log('   ✓ Banned');
            console.log('   ✓ All cosmetics removed');
            console.log('   ✓ No active listings');
        } else {
            console.log('⚠️  Issues found:');
            issues.forEach(issue => console.log(`   ${issue}`));
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await disconnectDB();
    }
}

checkUserStatus();

