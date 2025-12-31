/**
 * Admin Script: Unmint Cosmetics from User
 * 
 * This script removes all minted cosmetics from a user's wallet and
 * decrements the totalMinted counter on templates, making them available
 * for minting again.
 * 
 * Usage:
 *   node server/scripts/unmintCosmetics.js <walletAddress> [--dry-run] [--redistribute]
 * 
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 *   --redistribute: After unminting, redistribute items to other users (future feature)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../db/connection.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import CosmeticTemplate from '../db/models/CosmeticTemplate.js';
import User from '../db/models/User.js';
import MarketListing from '../db/models/MarketListing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function unmintCosmetics(walletAddress, options = {}) {
    const { dryRun = false, redistribute = false } = options;
    
    console.log(`\n🔧 Unminting cosmetics for wallet: ${walletAddress}`);
    console.log(`   Dry run: ${dryRun ? 'YES (no changes will be made)' : 'NO (will delete items)'}`);
    console.log(`   Redistribute: ${redistribute ? 'YES' : 'NO'}\n`);
    
    try {
        // Connect to database
        await connectDB();
        console.log('✅ Connected to database\n');
        
        // Find user
        const user = await User.findOne({ walletAddress });
        if (!user) {
            console.error(`❌ User not found: ${walletAddress}`);
            process.exit(1);
        }
        console.log(`👤 User: ${user.username} (${walletAddress.slice(0, 8)}...)\n`);
        
        // Find all owned cosmetics (including converted ones for stats)
        const allOwned = await OwnedCosmetic.find({ ownerId: walletAddress });
        const activeOwned = allOwned.filter(c => !c.convertedToGold);
        const convertedOwned = allOwned.filter(c => c.convertedToGold);
        
        console.log(`📦 Found ${allOwned.length} total cosmetics:`);
        console.log(`   - ${activeOwned.length} active (not converted)`);
        console.log(`   - ${convertedOwned.length} converted to gold\n`);
        
        if (activeOwned.length === 0) {
            console.log('ℹ️  No active cosmetics to unmint');
            await disconnectDB();
            return;
        }
        
        // Check for active marketplace listings
        const activeListings = await MarketListing.find({
            sellerId: walletAddress,
            status: 'active'
        });
        
        if (activeListings.length > 0) {
            console.log(`⚠️  WARNING: User has ${activeListings.length} active marketplace listings:`);
            activeListings.forEach(listing => {
                console.log(`   - ${listing.itemInstanceId} (${listing.price} pebbles)`);
            });
            console.log('\n   These will be cancelled if you proceed.\n');
        }
        
        // Group by templateId to count deletions per template
        const templateCounts = new Map();
        for (const cosmetic of activeOwned) {
            const count = templateCounts.get(cosmetic.templateId) || 0;
            templateCounts.set(cosmetic.templateId, count + 1);
        }
        
        console.log(`📊 Items to delete by template:`);
        const templateIds = Array.from(templateCounts.keys());
        const templates = await CosmeticTemplate.find({ templateId: { $in: templateIds } });
        const templateMap = new Map(templates.map(t => [t.templateId, t]));
        
        for (const [templateId, count] of templateCounts) {
            const template = templateMap.get(templateId);
            const name = template ? template.name : templateId;
            const rarity = template ? template.rarity : 'unknown';
            console.log(`   - ${name} (${rarity}): ${count} items`);
        }
        console.log();
        
        if (dryRun) {
            console.log('🔍 DRY RUN - No changes made');
            console.log(`   Would delete ${activeOwned.length} cosmetics`);
            console.log(`   Would decrement totalMinted on ${templateCounts.size} templates`);
            if (activeListings.length > 0) {
                console.log(`   Would cancel ${activeListings.length} marketplace listings`);
            }
            await disconnectDB();
            return;
        }
        
        // Start transaction-like operations
        console.log('🗑️  Deleting cosmetics...');
        
        // Delete marketplace listings first
        if (activeListings.length > 0) {
            await MarketListing.updateMany(
                { sellerId: walletAddress, status: 'active' },
                { status: 'cancelled', cancelledAt: new Date() }
            );
            console.log(`   ✅ Cancelled ${activeListings.length} marketplace listings`);
        }
        
        // Delete all owned cosmetics
        const deleteResult = await OwnedCosmetic.deleteMany({ ownerId: walletAddress });
        console.log(`   ✅ Deleted ${deleteResult.deletedCount} cosmetics`);
        
        // Decrement totalMinted on each template
        console.log('\n📉 Decrementing totalMinted counters...');
        console.log('   ⚠️  WARNING: This will make serial numbers available for reuse');
        console.log('   ⚠️  Future mints may reuse serial numbers from deleted items\n');
        
        let decrementedCount = 0;
        for (const [templateId, count] of templateCounts) {
            const template = templateMap.get(templateId);
            const currentTotal = template ? template.totalMinted : 0;
            const newTotal = Math.max(0, currentTotal - count);
            
            const result = await CosmeticTemplate.findOneAndUpdate(
                { templateId },
                { $inc: { totalMinted: -count } },
                { new: true }
            );
            
            if (result) {
                // Check if this affects First Edition status (serial 1-3)
                const hadFirstEdition = currentTotal >= 1 && currentTotal <= 3;
                const willHaveFirstEdition = newTotal >= 1 && newTotal <= 3;
                const firstEditionNote = (hadFirstEdition && !willHaveFirstEdition) 
                    ? ' (⚠️ First Edition range affected!)' 
                    : '';
                
                console.log(`   ✅ ${result.name}: ${currentTotal} → ${newTotal} (-${count})${firstEditionNote}`);
                decrementedCount++;
            } else {
                console.log(`   ⚠️  Template not found: ${templateId}`);
            }
        }
        
        // Remove from user's unlockedCosmetics (backwards compatibility)
        const assetKeys = templates
            .filter(t => t.assetKey)
            .map(t => t.assetKey);
        
        if (assetKeys.length > 0) {
            await User.updateOne(
                { walletAddress },
                { $pull: { unlockedCosmetics: { $in: assetKeys } } }
            );
            console.log(`\n   ✅ Removed ${assetKeys.length} items from user's unlockedCosmetics`);
        }
        
        console.log(`\n✅ Unminting complete!`);
        console.log(`   - Deleted ${deleteResult.deletedCount} cosmetics`);
        console.log(`   - Decremented ${decrementedCount} templates`);
        console.log(`   - Items are now available for minting again\n`);
        
        if (redistribute) {
            console.log('⚠️  Redistribution feature not yet implemented');
            console.log('   Items have been unminted and are available for future minting\n');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        await disconnectDB();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const walletAddress = args.find(arg => !arg.startsWith('--'));
const dryRun = args.includes('--dry-run');
const redistribute = args.includes('--redistribute');

if (!walletAddress) {
    console.error('Usage: node server/scripts/unmintCosmetics.js <walletAddress> [--dry-run] [--redistribute]');
    console.error('\nOptions:');
    console.error('  --dry-run      Show what would be deleted without actually deleting');
    console.error('  --redistribute After unminting, redistribute items (not yet implemented)');
    process.exit(1);
}

// Run the script
unmintCosmetics(walletAddress, { dryRun, redistribute })
    .then(() => {
        console.log('✅ Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Script failed:', error);
        process.exit(1);
    });

