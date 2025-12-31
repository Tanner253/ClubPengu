/**
 * Setup Promo Codes - Create/Update all promo codes in database
 * RUN: node server/scripts/setupPromoCodes.js
 * 
 * This script populates the database with all promo codes.
 * Safe to run multiple times - uses upsert to update existing codes.
 */

import 'dotenv/config';
import { connectDB, disconnectDB } from '../db/connection.js';
import PromoCode from '../db/models/PromoCode.js';

// ==================== ALL PROMO CODES ====================
const PROMO_CODES = [
    // ========== MOUNT CODES ==========
    {
        code: 'BOATCOIN',
        name: 'Minecraft Boat',
        description: 'Unlocks the Minecraft Boat mount',
        unlocks: {
            mounts: ['minecraftBoat'],
            cosmetics: [],
            characters: [],
            skinColor: null,
            coins: 0
        }
    },
    
    // ========== COMBO CODES (Mount + Cosmetics) ==========
    {
        code: 'PENGU',
        name: '$PENGU Bundle',
        description: 'Unlocks the Pengu Mount and $PENGU Shirt',
        unlocks: {
            mounts: ['penguMount'],
            cosmetics: [
                { id: 'penguShirt', category: 'bodyItem' }
            ],
            characters: [],
            skinColor: null,
            coins: 0
        }
    },
    
    // ========== COSMETIC CODES ==========
    {
        code: 'LMAO',
        name: '😂 LMAO Face',
        description: 'Unlocks the LMAO eyes cosmetic',
        unlocks: {
            mounts: [],
            cosmetics: [
                { id: 'lmao', category: 'eyes' }
            ],
            characters: [],
            skinColor: null,
            coins: 0
        }
    },
    {
        code: 'JOE',
        name: '👻 Invisible Body',
        description: 'Unlocks the invisible body item',
        unlocks: {
            mounts: [],
            cosmetics: [
                { id: 'joe', category: 'bodyItem' }
            ],
            characters: [],
            skinColor: null,
            coins: 0
        }
    },
    
    // ========== SET CODES (Multiple items + skin color) ==========
    {
        code: 'MISTORGOAT',
        name: '🐐 Mistor Goat Set',
        description: 'Unlocks the complete Mistor Goat cosmetic set (hair, eyes, shirt)',
        unlocks: {
            mounts: [],
            cosmetics: [
                { id: 'mistorHair', category: 'hat' },
                { id: 'mistorEyes', category: 'eyes' },
                { id: 'mistorShirt', category: 'bodyItem' }
            ],
            characters: [],
            skinColor: 'silver',
            coins: 0
        }
    },
    {
        code: 'BONK',
        name: '🐕 BONK Set',
        description: 'Unlocks the complete BONK Shiba cosmetic set',
        unlocks: {
            mounts: [],
            cosmetics: [
                { id: 'bonkExclamation', category: 'hat' },
                { id: 'bonkEyes', category: 'eyes' },
                { id: 'bonkShirt', category: 'bodyItem' }
            ],
            characters: [],
            skinColor: 'orange',
            coins: 0
        }
    },
    
    // ========== CHARACTER CODES ==========
    {
        code: 'MARCUS',
        name: '🦅 Marcus Character',
        description: 'Unlocks the Marcus eagle character type',
        unlocks: {
            mounts: [],
            cosmetics: [],
            characters: ['marcus'],
            skinColor: null,
            coins: 0
        }
    },
    {
        code: 'DOGINAL',
        name: '🐕 Dog Character + Wizard Hat',
        description: 'Unlocks the Dog character type and wizard hat cosmetic (legacy code - dog is now default, but this code still works)',
        unlocks: {
            mounts: [],
            cosmetics: [
                { id: 'wizardHat', category: 'hat' }
            ],
            characters: ['dog'],
            skinColor: null,
            coins: 0
        }
    },
    {
        code: 'WZRDOG',
        name: '🧙 Wizard Dog',
        description: 'Unlocks the wizard hat cosmetic (only works when playing as a dog)',
        unlocks: {
            mounts: [],
            cosmetics: [
                { id: 'wizardHat', category: 'hat' }
            ],
            characters: [],
            skinColor: null,
            coins: 0
        }
    },
    {
        code: 'WWHALE',
        name: '🐋 White Whale Character',
        description: 'Unlocks the majestic White Whale character type',
        unlocks: {
            mounts: [],
            cosmetics: [],
            characters: ['whiteWhale'],
            skinColor: null,
            coins: 0
        }
    },
    {
        code: 'BWHALE',
        name: '🖤 Black Whale Character',
        description: 'Unlocks the sleek Black Whale character type',
        unlocks: {
            mounts: [],
            cosmetics: [],
            characters: ['blackWhale'],
            skinColor: null,
            coins: 0
        }
    },
    {
        code: 'SWHALE',
        name: '🩶 Silver Whale Character',
        description: 'Unlocks the shimmering Silver Whale character type',
        unlocks: {
            mounts: [],
            cosmetics: [],
            characters: ['silverWhale'],
            skinColor: null,
            coins: 0
        }
    },
    {
        code: 'GWHALE',
        name: '💛 Gold Whale Character',
        description: 'Unlocks the legendary Gold Whale character type',
        unlocks: {
            mounts: [],
            cosmetics: [],
            characters: ['goldWhale'],
            skinColor: null,
            coins: 0
        }
    },
    {
        code: 'PEPE',
        name: '🐸 PEPE Frog Character',
        description: 'Unlocks the legendary PEPE Frog character - feels good man',
        unlocks: {
            mounts: [],
            cosmetics: [],
            characters: ['frog'],
            skinColor: null,
            coins: 0
        }
    },
    
    // ========== INTERNAL TEAM CODES ==========
    {
        code: 'AB442BC3C938F16BEA70',
        name: '🔑 Team Starter Pack',
        description: 'Dev/Marketing team code - Unlocks all Common, Uncommon, and Rare cosmetics + Wizard Hat (non-tradable)',
        unlocks: {
            mounts: [],
            cosmetics: [
                { id: 'wizardHat', category: 'hat' }
            ],
            characters: [],
            skinColor: null,
            coins: 0,
            unlockByRarity: ['common', 'uncommon', 'rare']
        },
        allowReRedemption: true,  // Allow re-redemption to create missing OwnedCosmetic records
        notes: 'Internal use only - Dev team and marketing team'
    }
];

async function setupPromoCodes() {
    console.log('🎟️  Club Pengu - Promo Code Setup\n');
    console.log('================================\n');
    
    try {
        await connectDB();
        console.log('✅ Database connected\n');
        
        let created = 0;
        let updated = 0;
        let errors = 0;
        
        for (const codeData of PROMO_CODES) {
            try {
                // Check if code already exists
                const existing = await PromoCode.findOne({ code: codeData.code });
                
                if (existing) {
                    // Update existing code
                    existing.name = codeData.name;
                    existing.description = codeData.description;
                    existing.unlocks = codeData.unlocks;
                    existing.allowReRedemption = codeData.allowReRedemption || false;
                    existing.notes = codeData.notes || existing.notes;
                    await existing.save();
                    
                    console.log(`📝 Updated: ${codeData.code} - ${codeData.name}${codeData.allowReRedemption ? ' (re-redemption enabled)' : ''}`);
                    updated++;
                } else {
                    // Create new promo code
                    const promoCode = new PromoCode({
                        code: codeData.code,
                        name: codeData.name,
                        description: codeData.description,
                        unlocks: codeData.unlocks,
                        singleUsePerWallet: true,
                        allowReRedemption: codeData.allowReRedemption || false,
                        isActive: true,
                        maxRedemptions: null,
                        redemptionCount: 0,
                        notes: codeData.notes
                    });
                    await promoCode.save();
                    
                    console.log(`✅ Created: ${codeData.code} - ${codeData.name}${codeData.allowReRedemption ? ' (re-redemption enabled)' : ''}`);
                    created++;
                }
                
                // Log what it unlocks
                const u = codeData.unlocks;
                const parts = [];
                if (u.mounts?.length) parts.push(`Mounts: ${u.mounts.join(', ')}`);
                if (u.cosmetics?.length) parts.push(`Cosmetics: ${u.cosmetics.map(c => `${c.id} (${c.category})`).join(', ')}`);
                if (u.characters?.length) parts.push(`Characters: ${u.characters.join(', ')}`);
                if (u.skinColor) parts.push(`Skin: ${u.skinColor}`);
                if (u.coins > 0) parts.push(`Coins: ${u.coins}`);
                if (parts.length) console.log(`   └─ ${parts.join(' | ')}`);
                
            } catch (err) {
                console.error(`❌ Error with ${codeData.code}:`, err.message);
                errors++;
            }
        }
        
        console.log('\n================================');
        console.log('📊 SUMMARY');
        console.log('================================');
        console.log(`✅ Created: ${created}`);
        console.log(`📝 Updated: ${updated}`);
        console.log(`❌ Errors:  ${errors}`);
        console.log(`📦 Total:   ${PROMO_CODES.length}`);
        console.log('================================\n');
        
        // List all codes in database
        const allCodes = await PromoCode.find({}).select('code name isActive redemptionCount');
        console.log('📋 All promo codes in database:\n');
        for (const c of allCodes) {
            const status = c.isActive ? '🟢' : '🔴';
            console.log(`   ${status} ${c.code.padEnd(12)} - ${c.name} (${c.redemptionCount} redemptions)`);
        }
        
    } catch (err) {
        console.error('💥 Fatal error:', err);
        process.exit(1);
    } finally {
        await disconnectDB();
        console.log('\n✅ Database disconnected');
        process.exit(0);
    }
}

// Run
setupPromoCodes();



