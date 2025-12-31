/**
 * Seed Script: Set your wallet as the owner of SKNY GANG space (space3)
 * 
 * Usage: 
 *   node scripts/seedMySpace.js YOUR_WALLET_ADDRESS
 *   node scripts/seedMySpace.js YOUR_WALLET_ADDRESS "Your Display Name"
 * 
 * Example:
 *   node scripts/seedMySpace.js 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU "Tanner"
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Space from '../db/models/Space.js';

// Get directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory first, then fall back to root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/waddlebet';

async function seedMySpace() {
    const walletAddress = process.argv[2];
    const displayName = process.argv[3] || 'SKNY GANG';
    
    if (!walletAddress) {
        console.error('❌ Usage: node scripts/seedMySpace.js YOUR_WALLET_ADDRESS [DISPLAY_NAME]');
        console.error('   Example: node scripts/seedMySpace.js 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU "Tanner"');
        process.exit(1);
    }
    
    console.log(`🔗 Connecting to MongoDB: ${MONGODB_URI}`);
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // Update space3 (SKNY GANG) to be owned by your wallet
        const result = await Space.findOneAndUpdate(
            { spaceId: 'space3' },
            {
                $set: {
                    isReserved: true, // Reserved rental space
                    isRented: true, // Reserved = always "rented" by owner
                    ownerWallet: walletAddress,
                    ownerUsername: displayName,
                    reservedOwnerName: displayName,
                    accessType: 'public', // Start as public so you can test access control
                    rentStatus: 'current',
                    banner: {
                        title: '🎧 SKNY GANG',
                        ticker: '$CPw3',
                        shill: 'VIP Access • The Rave Never Stops',
                        styleIndex: 2 // Nightclub neon style
                    }
                }
            },
            { 
                upsert: true, // Create if doesn't exist
                new: true 
            }
        );
        
        console.log('\n✅ Successfully updated space3 (SKNY GANG)!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Space ID:      ${result.spaceId}`);
        console.log(`   Owner Wallet:  ${result.ownerWallet}`);
        console.log(`   Display Name:  ${result.ownerUsername}`);
        console.log(`   Access Type:   ${result.accessType}`);
        console.log(`   Is Reserved:   ${result.isReserved}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🎉 You now own the SKNY GANG space! Connect with this wallet to test.');
        console.log('📝 Owner wallet is stored in the database - no env variables needed.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

seedMySpace();

