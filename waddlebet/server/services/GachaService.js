/**
 * GachaService - Cosmetic gacha system using Pebbles currency
 * 
 * REUSES:
 * - Weighted RNG pattern from SlotService
 * - Unlock pattern from PromoCodeService
 * - Transaction logging from Transaction model
 * 
 * INTEGRATES WITH:
 * - User model for pebble balance and gacha stats
 * - CosmeticTemplate for item pool
 * - OwnedCosmetic for minted instances
 * - GachaRoll for audit logging
 */

import CosmeticTemplate from '../db/models/CosmeticTemplate.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import GachaRoll from '../db/models/GachaRoll.js';
import { Transaction, User } from '../db/models/index.js';
import { getReferralService } from './ReferralService.js';

// ========== RARITY CONFIGURATION ==========
// Total weight: 10000 for precision
const RARITY_WEIGHTS = {
    common: 5500,      // 55.00%
    uncommon: 2800,    // 28.00%
    rare: 1200,        // 12.00%
    epic: 400,         // 4.00%
    legendary: 80,     // 0.80%
    mythic: 18,        // 0.18%
    divine: 2          // 0.02%
};
const TOTAL_RARITY_WEIGHT = 10000;

const RARITY_COLORS = {
    common: '#9CA3AF',
    uncommon: '#22C55E',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#EC4899',
    mythic: '#EF4444',
    divine: '#F59E0B'
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine'];

// ========== QUALITY CONFIGURATION ==========
const QUALITY_WEIGHTS = {
    worn: 35,
    standard: 40,
    pristine: 20,
    flawless: 5
};
const TOTAL_QUALITY_WEIGHT = 100;

const QUALITY_MULTIPLIERS = {
    worn: 0.7,
    standard: 1.0,
    pristine: 1.8,
    flawless: 4.0
};

// ========== HOLOGRAPHIC ==========
const HOLO_CHANCE = 0.08; // 8%
const HOLO_MULTIPLIER = 3.0;

// ========== PEBBLE PRICING ==========
// 1 SOL = 1000 Pebbles, so 25 Pebbles = 0.025 SOL
const ROLL_PRICE_PEBBLES = 25;
const PEBBLES_PER_SOL = 1000;

// ========== DUPLICATE GOLD VALUES (Base) ==========
const DUPLICATE_GOLD_BASE = {
    common: 25,
    uncommon: 50,
    rare: 150,
    epic: 500,
    legendary: 2500,
    mythic: 10000,
    divine: 50000
};

// ========== PITY SYSTEM ==========
// Pity doesn't add items - it shifts WHEN drops happen
// This preserves economy while reducing frustration
const PITY_CONFIG = {
    rare: {
        softPity: 20,      // After 20 rolls without Rare+
        softBoost: 0.25,   // +25% chance to get Rare+
        hardPity: 40,      // After 40 rolls, guarantee Rare+
    },
    epic: {
        softPity: 60,
        softBoost: 0.15,
        hardPity: 100,
    },
    legendary: {
        softPity: 200,
        softBoost: 0.10,
        hardPity: 400,
    }
    // NO PITY for Mythic/Divine - keeps them truly rare
};

class GachaService {
    /**
     * GachaService follows SlotService/FishingService pattern
     * Also receives broadcastToAll for server-wide announcements
     * 
     * @param {UserService} userService - For coin/unlock operations
     * @param {Function} broadcastToRoom - Broadcast to players in same room
     * @param {Function} sendToPlayer - Send to specific player
     * @param {Function} broadcastToAll - Broadcast to ALL connected players
     */
    constructor(userService, broadcastToRoom, sendToPlayer, broadcastToAll = null) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        this.broadcastToAll = broadcastToAll;
        
        // Cache for gacha pool (refresh periodically)
        this.gachaPoolCache = null;
        this.cacheExpiry = 0;
        this.CACHE_TTL = 60000; // 1 minute cache
        
        console.log('🎰 GachaService initialized');
        console.log(`   Roll price: ${ROLL_PRICE_PEBBLES} Pebbles (${ROLL_PRICE_PEBBLES / PEBBLES_PER_SOL} SOL)`);
    }
    
    // ==================== CORE ROLLING ====================
    
    /**
     * Execute a gacha roll using Pebbles (premium currency)
     * NO wallet signature required - instant roll!
     * 
     * NEW: No auto-burn! Users keep ALL items. Must burn manually.
     * 
     * @param {string} walletAddress - User's wallet
     * @param {string} collection - Collection to roll from
     * @param {string} username - Player's display name
     * @param {string} playerId - Player's connection ID (for sending result)
     * @returns {Promise<object>} Roll result
     */
    async roll(walletAddress, collection = 'OG Collection', username = 'Anonymous', playerId = null) {
        console.log(`🎰 Gacha roll requested: ${username} (${walletAddress?.slice(0, 8)}...)`);
        
        // 0. CHECK INVENTORY SPACE FIRST (before taking pebbles!)
        const user = await User.findOne({ walletAddress });
        if (!user) {
            return { success: false, error: 'USER_NOT_FOUND', message: 'User not found' };
        }
        
        const inventoryCount = await user.getInventoryCount();
        if (inventoryCount >= user.maxInventorySlots) {
            console.log(`   ❌ Inventory full: ${inventoryCount}/${user.maxInventorySlots}`);
            return {
                success: false,
                error: 'INVENTORY_FULL',
                message: `Inventory full (${inventoryCount}/${user.maxInventorySlots}). Burn items or upgrade slots!`,
                inventoryCount,
                maxSlots: user.maxInventorySlots
            };
        }
        
        // 1. Check and deduct Pebbles (instant, no blockchain!)
        const deductResult = await this._deductPebbles(walletAddress, ROLL_PRICE_PEBBLES);
        if (!deductResult.success) {
            console.log(`   ❌ Insufficient pebbles: has ${deductResult.balance}, needs ${ROLL_PRICE_PEBBLES}`);
            return { 
                success: false, 
                error: deductResult.error,
                message: deductResult.message,
                pebbleBalance: deductResult.balance,
                required: ROLL_PRICE_PEBBLES
            };
        }
        
        // 2. Get gacha pool
        const pool = await this._getGachaPool(collection);
        if (pool.length === 0) {
            // Refund pebbles if no items available
            await this._refundPebbles(walletAddress, ROLL_PRICE_PEBBLES, 'No items in pool');
            return { success: false, error: 'NO_ITEMS_IN_POOL' };
        }
        
        // 3. Get user's pity counters
        const pity = user?.stats?.gacha?.pity || {
            rollsSinceRare: 0,
            rollsSinceEpic: 0,
            rollsSinceLegendary: 0
        };
        
        // 4. Roll rarity (with pity system)
        const { rarity, triggeredPity } = this._rollRarityWithPity(pity);
        console.log(`   Rolled rarity: ${rarity}${triggeredPity !== 'none' ? ` (${triggeredPity})` : ''}`);
        
        // 5. Select template from rarity tier
        const template = this._selectTemplate(pool, rarity);
        if (!template) {
            // Refund pebbles if no template found
            await this._refundPebbles(walletAddress, ROLL_PRICE_PEBBLES, 'No template for rarity');
            return { success: false, error: 'NO_TEMPLATE_FOR_RARITY' };
        }
        
        // 6. Roll quality
        const quality = this._rollQuality();
        
        // 7. Roll holographic
        const isHolographic = template.canBeHolographic && this._rollHolo();
        
        // 8. Check if this is a NEW unlock (first of this template type)
        // This determines if it's a "NEW!" badge in UI, but we ALWAYS mint now
        const isNewUnlock = !(await OwnedCosmetic.userOwnsTemplate(walletAddress, template.templateId));
        
        // 9. ALWAYS mint the cosmetic (NO AUTO-BURN!)
        let result;
        try {
            result = await this._mintCosmetic(walletAddress, template, quality, isHolographic);
        } catch (mintError) {
            console.error(`🚨 CRITICAL: Minting failed for ${walletAddress}:`, mintError.message);
            console.error(`   Template: ${template.templateId}`);
            
            // Log failed roll for manual review
            await this._logFailedRoll(walletAddress, template, mintError.message, pity, triggeredPity, collection);
            
            // Refund pebbles on failure
            await this._refundPebbles(walletAddress, ROLL_PRICE_PEBBLES, mintError.message);
            
            return { 
                success: false, 
                error: 'MINT_FAILED',
                message: 'Roll failed. Pebbles refunded.',
                requiresManualReview: true
            };
        }
        
        // 10. Log successful roll (isDuplicate = !isNewUnlock for logging purposes)
        await this._logRoll(walletAddress, template, result, quality, isHolographic, collection, pity, triggeredPity);
        
        // 11. Update user stats AND pity counters (no gold awarded - user keeps item!)
        await this._updateUserStats(walletAddress, rarity, pity, !isNewUnlock, 0, isHolographic, result.isFirstEdition);
        
        // 12. Build response
        const rollResult = {
            success: true,
            templateId: template.templateId,
            name: template.name,
            category: template.category,
            rarity: template.rarity,
            rarityColor: RARITY_COLORS[template.rarity],
            quality,
            qualityMultiplier: QUALITY_MULTIPLIERS[quality],
            isHolographic,
            isNewUnlock,        // TRUE = first of this type (NEW! badge)
            isDuplicate: !isNewUnlock,  // TRUE = already had this type
            // NO goldAwarded - user keeps ALL items now!
            instanceId: result.instanceId,
            serialNumber: result.serialNumber,
            isFirstEdition: result.isFirstEdition,
            assetKey: template.assetKey,
            newPebbleBalance: deductResult.newBalance,
            triggeredPity,
            // Include burn value for UI display
            burnValue: this._calculateBurnValue(template, quality, isHolographic, result.isFirstEdition, result.serialNumber)
        };
        
        console.log(`   ✅ Roll complete: ${template.name} #${result.serialNumber} (${rarity}${quality !== 'standard' ? `, ${quality}` : ''}${isHolographic ? ', HOLO' : ''}${result.isFirstEdition ? ', FIRST EDITION!' : ''}${!isNewUnlock ? ', DUPE' : ''})`);
        
        // 13. Server-wide announcement
        this._announceRoll(username, rollResult);
        
        // 14. Send result to player if playerId provided
        if (playerId && this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'gacha_result',
                ...rollResult
            });
        }
        
        return rollResult;
    }
    
    /**
     * Calculate burn value for an item (for UI display)
     */
    _calculateBurnValue(template, quality, isHolographic, isFirstEdition, serialNumber) {
        let value = template.duplicateGoldBase || DUPLICATE_GOLD_BASE[template.rarity] || 25;
        
        // Quality multipliers
        value *= QUALITY_MULTIPLIERS[quality] || 1.0;
        
        // Holographic bonus (3x)
        if (isHolographic) value *= 3.0;
        
        // First Edition bonus (2x)
        if (isFirstEdition) value *= 2.0;
        
        // Low serial bonus
        if (serialNumber <= 10) value *= 2.0;
        else if (serialNumber <= 100) value *= 1.5;
        
        return Math.floor(value);
    }
    
    // ==================== RNG FUNCTIONS ====================
    
    /**
     * Roll rarity with pity system
     */
    _rollRarityWithPity(pity) {
        const { rollsSinceRare, rollsSinceEpic, rollsSinceLegendary } = pity;
        let triggeredPity = 'none';
        
        // Check for hard pity guarantees (highest priority first)
        if (rollsSinceLegendary >= PITY_CONFIG.legendary.hardPity) {
            console.log(`   🎊 HARD PITY: Guaranteed Legendary+ after ${rollsSinceLegendary} rolls`);
            triggeredPity = 'legendary_hard';
            return { rarity: this._rollRarityMinimum('legendary'), triggeredPity };
        }
        if (rollsSinceEpic >= PITY_CONFIG.epic.hardPity) {
            console.log(`   🎊 HARD PITY: Guaranteed Epic+ after ${rollsSinceEpic} rolls`);
            triggeredPity = 'epic_hard';
            return { rarity: this._rollRarityMinimum('epic'), triggeredPity };
        }
        if (rollsSinceRare >= PITY_CONFIG.rare.hardPity) {
            console.log(`   🎊 HARD PITY: Guaranteed Rare+ after ${rollsSinceRare} rolls`);
            triggeredPity = 'rare_hard';
            return { rarity: this._rollRarityMinimum('rare'), triggeredPity };
        }
        
        // Check for soft pity boosts
        if (rollsSinceLegendary >= PITY_CONFIG.legendary.softPity && Math.random() < PITY_CONFIG.legendary.softBoost) {
            console.log(`   ✨ SOFT PITY: Legendary+ boost triggered!`);
            triggeredPity = 'legendary_soft';
            return { rarity: this._rollRarityMinimum('legendary'), triggeredPity };
        }
        if (rollsSinceEpic >= PITY_CONFIG.epic.softPity && Math.random() < PITY_CONFIG.epic.softBoost) {
            console.log(`   ✨ SOFT PITY: Epic+ boost triggered!`);
            triggeredPity = 'epic_soft';
            return { rarity: this._rollRarityMinimum('epic'), triggeredPity };
        }
        if (rollsSinceRare >= PITY_CONFIG.rare.softPity && Math.random() < PITY_CONFIG.rare.softBoost) {
            console.log(`   ✨ SOFT PITY: Rare+ boost triggered!`);
            triggeredPity = 'rare_soft';
            return { rarity: this._rollRarityMinimum('rare'), triggeredPity };
        }
        
        // Normal roll
        return { rarity: this._rollRarity(), triggeredPity: 'none' };
    }
    
    /**
     * Roll rarity with minimum floor (for pity)
     */
    _rollRarityMinimum(minimum) {
        const minIndex = RARITY_ORDER.indexOf(minimum);
        
        // Build weights for only minimum+ rarities
        const eligibleWeights = {};
        let totalWeight = 0;
        
        for (let i = minIndex; i < RARITY_ORDER.length; i++) {
            const rarity = RARITY_ORDER[i];
            eligibleWeights[rarity] = RARITY_WEIGHTS[rarity];
            totalWeight += RARITY_WEIGHTS[rarity];
        }
        
        // Roll within eligible rarities
        let roll = Math.floor(Math.random() * totalWeight);
        for (const [rarity, weight] of Object.entries(eligibleWeights)) {
            roll -= weight;
            if (roll < 0) return rarity;
        }
        
        return minimum; // Fallback
    }
    
    /**
     * Standard rarity roll (no pity)
     */
    _rollRarity() {
        let roll = Math.floor(Math.random() * TOTAL_RARITY_WEIGHT);
        for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
            roll -= weight;
            if (roll < 0) return rarity;
        }
        return 'common';
    }
    
    /**
     * Roll quality
     */
    _rollQuality() {
        let roll = Math.floor(Math.random() * TOTAL_QUALITY_WEIGHT);
        for (const [quality, weight] of Object.entries(QUALITY_WEIGHTS)) {
            roll -= weight;
            if (roll < 0) return quality;
        }
        return 'standard';
    }
    
    /**
     * Roll holographic
     */
    _rollHolo() {
        return Math.random() < HOLO_CHANCE;
    }
    
    /**
     * Select a random template from a rarity tier
     */
    _selectTemplate(pool, rarity) {
        const candidates = pool.filter(t => t.rarity === rarity);
        if (candidates.length === 0) {
            // Fallback: try lower rarities
            const currentIdx = RARITY_ORDER.indexOf(rarity);
            for (let i = currentIdx + 1; i < RARITY_ORDER.length; i++) {
                const fallback = pool.filter(t => t.rarity === RARITY_ORDER[i]);
                if (fallback.length > 0) {
                    console.log(`   ⚠️ No ${rarity} items, falling back to ${RARITY_ORDER[i]}`);
                    return fallback[Math.floor(Math.random() * fallback.length)];
                }
            }
            // Try higher rarities if no lower available
            for (let i = currentIdx - 1; i >= 0; i--) {
                const fallback = pool.filter(t => t.rarity === RARITY_ORDER[i]);
                if (fallback.length > 0) {
                    console.log(`   ⚠️ No ${rarity} items, falling back to ${RARITY_ORDER[i]}`);
                    return fallback[Math.floor(Math.random() * fallback.length)];
                }
            }
            return null;
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
    }
    
    // ==================== MINTING & DUPLICATES ====================
    
    /**
     * Mint a new cosmetic instance
     */
    async _mintCosmetic(walletAddress, template, quality, isHolographic) {
        // Get next serial number atomically (prevents race conditions)
        const { serialNumber, isFirstEdition } = await OwnedCosmetic.getNextSerialAtomic(template.templateId);
        
        // Create instance
        const instanceId = OwnedCosmetic.generateInstanceId();
        
        const cosmetic = new OwnedCosmetic({
            instanceId,
            templateId: template.templateId,
            ownerId: walletAddress,
            serialNumber,
            quality,
            isHolographic,
            isFirstEdition,
            mintedBy: walletAddress,
            acquisitionMethod: 'gacha_roll',
            // Initialize ownership history with mint entry
            ownershipHistory: [{
                walletAddress,
                acquiredAt: new Date(),
                acquiredFrom: null, // null = minted
                acquisitionType: 'mint',
                price: 0
            }],
            totalTrades: 0
        });
        
        await cosmetic.save();
        
        // Add to user's unlockedCosmetics for backwards compatibility
        await User.updateOne(
            { walletAddress },
            { 
                $addToSet: { 
                    unlockedCosmetics: template.assetKey 
                }
            }
        );
        
        console.log(`   🎁 Minted: ${template.name} #${serialNumber}${isFirstEdition ? ' (FIRST EDITION!)' : ''}`);
        
        return {
            instanceId,
            serialNumber,
            isFirstEdition
        };
    }
    
    // NOTE: _processDuplicate removed - users now keep ALL items!
    // Manual burning is handled by OwnedCosmetic.burnForGold()
    
    // ==================== PEBBLE MANAGEMENT ====================
    
    /**
     * Deduct pebbles from user (atomic)
     */
    async _deductPebbles(walletAddress, amount) {
        const result = await User.findOneAndUpdate(
            { 
                walletAddress,
                pebbles: { $gte: amount }
            },
            { 
                $inc: { 
                    pebbles: -amount,
                    'pebbleStats.totalSpent': amount
                }
            },
            { new: true, select: 'pebbles' }
        );
        
        if (!result) {
            // Check if user exists with insufficient balance
            const user = await User.findOne({ walletAddress }, 'pebbles');
            return { 
                success: false, 
                error: 'INSUFFICIENT_PEBBLES',
                message: `Need ${amount} Pebbles, have ${user?.pebbles || 0}`,
                balance: user?.pebbles || 0
            };
        }
        
        // Track revenue contribution for referral system
        // This runs async - don't await to avoid slowing down the roll
        const referralService = getReferralService();
        if (referralService) {
            referralService.recordRevenueContribution(walletAddress, amount).catch(err => {
                console.error('[Gacha] Referral tracking error:', err.message);
            });
        }
        
        return { 
            success: true, 
            newBalance: result.pebbles 
        };
    }
    
    /**
     * Refund pebbles to user (for failed rolls)
     */
    async _refundPebbles(walletAddress, amount, reason) {
        await User.updateOne(
            { walletAddress },
            { 
                $inc: { 
                    pebbles: amount,
                    'pebbleStats.totalSpent': -amount
                }
            }
        );
        
        // Log refund transaction
        await Transaction.record({
            type: 'pebble_refund',
            toWallet: walletAddress,
            amount: amount,
            currency: 'pebbles',
            reason: `Gacha roll refund: ${reason}`
        });
        
        console.log(`   💸 Refunded ${amount} pebbles to ${walletAddress.slice(0, 8)}...`);
    }
    
    // ==================== GACHA POOL ====================
    
    /**
     * Get gacha pool (with caching)
     */
    async _getGachaPool(collection = null) {
        const now = Date.now();
        
        // Check cache
        if (this.gachaPoolCache && now < this.cacheExpiry) {
            return collection 
                ? this.gachaPoolCache.filter(t => t.collection === collection)
                : this.gachaPoolCache;
        }
        
        // Refresh cache
        this.gachaPoolCache = await CosmeticTemplate.getGachaPool();
        this.cacheExpiry = now + this.CACHE_TTL;
        
        console.log(`🎰 Gacha pool refreshed: ${this.gachaPoolCache.length} items`);
        
        return collection 
            ? this.gachaPoolCache.filter(t => t.collection === collection)
            : this.gachaPoolCache;
    }
    
    /**
     * Clear gacha pool cache (call when templates change)
     */
    clearPoolCache() {
        this.gachaPoolCache = null;
        this.cacheExpiry = 0;
    }
    
    // ==================== LOGGING ====================
    
    /**
     * Log successful roll to GachaRoll
     */
    async _logRoll(walletAddress, template, result, quality, isHolographic, collection, pity, triggeredPity) {
        const roll = new GachaRoll({
            rollId: GachaRoll.generateRollId(),
            ownerId: walletAddress,
            collection,
            pebblesPaid: ROLL_PRICE_PEBBLES,
            templateId: template.templateId,
            instanceId: result.instanceId || null,
            rarity: template.rarity,
            quality,
            isHolographic,
            isFirstEdition: result.isFirstEdition || false,
            serialNumber: result.serialNumber || null,
            isDuplicate: result.isDuplicate || false,
            goldAwarded: result.goldAwarded || 0,
            pityCountAtRoll: {
                rollsSinceRare: pity.rollsSinceRare,
                rollsSinceEpic: pity.rollsSinceEpic,
                rollsSinceLegendary: pity.rollsSinceLegendary
            },
            triggeredPity,
            status: 'success'
        });
        
        await roll.save();
    }
    
    /**
     * Log failed roll for admin review
     */
    async _logFailedRoll(walletAddress, template, errorMessage, pity, triggeredPity, collection) {
        const roll = new GachaRoll({
            rollId: GachaRoll.generateRollId(),
            ownerId: walletAddress,
            collection,
            pebblesPaid: ROLL_PRICE_PEBBLES,
            templateId: template?.templateId,
            rarity: template?.rarity,
            pityCountAtRoll: pity ? {
                rollsSinceRare: pity.rollsSinceRare,
                rollsSinceEpic: pity.rollsSinceEpic,
                rollsSinceLegendary: pity.rollsSinceLegendary
            } : null,
            triggeredPity: triggeredPity || 'none',
            status: 'failed',
            errorMessage,
            requiresRefund: true
        });
        
        await roll.save();
        console.log(`   ⚠️ Logged failed roll for manual review: ${roll.rollId}`);
    }
    
    // ==================== USER STATS ====================
    
    /**
     * Update user's gacha stats and pity counters
     */
    async _updateUserStats(walletAddress, rarity, oldPity, isDuplicate, goldAwarded, isHolographic, isFirstEdition) {
        const rarityIndex = RARITY_ORDER.indexOf(rarity);
        
        // Calculate new pity counters
        // Reset counter if we hit that rarity or higher
        const newPity = {
            rollsSinceRare: rarityIndex >= 2 ? 0 : oldPity.rollsSinceRare + 1,
            rollsSinceEpic: rarityIndex >= 3 ? 0 : oldPity.rollsSinceEpic + 1,
            rollsSinceLegendary: rarityIndex >= 4 ? 0 : oldPity.rollsSinceLegendary + 1
        };
        
        // Build update object
        const update = {
            $inc: {
                'stats.gacha.totalRolls': 1,
                'stats.gacha.totalPebblesSpent': ROLL_PRICE_PEBBLES
            },
            $set: {
                'stats.gacha.lastRollAt': new Date(),
                'stats.gacha.pity': newPity
            }
        };
        
        // Track rarity counts
        if (rarity === 'divine') update.$inc['stats.gacha.divineCount'] = 1;
        else if (rarity === 'mythic') update.$inc['stats.gacha.mythicCount'] = 1;
        else if (rarity === 'legendary') update.$inc['stats.gacha.legendaryCount'] = 1;
        else if (rarity === 'epic') update.$inc['stats.gacha.epicCount'] = 1;
        else if (rarity === 'rare') update.$inc['stats.gacha.rareCount'] = 1;
        
        // Track special drops
        if (isHolographic) update.$inc['stats.gacha.holoCount'] = 1;
        if (isFirstEdition) update.$inc['stats.gacha.firstEditionCount'] = 1;
        if (isDuplicate) update.$inc['stats.gacha.goldFromDupes'] = goldAwarded;
        
        // Update rarest rarity if applicable
        const user = await User.findOne({ walletAddress }, 'stats.gacha.rarestRarity');
        const currentRarestIndex = user?.stats?.gacha?.rarestRarity 
            ? RARITY_ORDER.indexOf(user.stats.gacha.rarestRarity) 
            : -1;
        
        if (rarityIndex > currentRarestIndex) {
            update.$set['stats.gacha.rarestRarity'] = rarity;
        }
        
        // Set firstRollAt if not set
        if (!user?.stats?.gacha?.firstRollAt) {
            update.$set['stats.gacha.firstRollAt'] = new Date();
        }
        
        await User.updateOne({ walletAddress }, update);
    }
    
    // ==================== ANNOUNCEMENTS ====================
    
    /**
     * Announce roll to all online players
     */
    _announceRoll(username, rollResult) {
        if (!this.broadcastToAll) return;
        
        const { rarity, name, isHolographic, isFirstEdition, quality, category } = rollResult;
        
        // Build announcement message based on rarity
        let emoji, message;
        const rarityIndex = RARITY_ORDER.indexOf(rarity);
        
        if (rarity === 'divine') {
            emoji = '🌟💫✨';
            message = `${username} just pulled a DIVINE ${name}!!!`;
        } else if (rarity === 'mythic') {
            emoji = '🔥✨';
            message = `${username} pulled a MYTHIC ${name}!!`;
        } else if (rarity === 'legendary') {
            emoji = '⭐✨';
            message = `${username} pulled a LEGENDARY ${name}!`;
        } else if (rarity === 'epic') {
            emoji = '💜';
            message = `${username} pulled an Epic ${name}`;
        } else if (rarity === 'rare') {
            emoji = '💙';
            message = `${username} pulled a Rare ${name}`;
        } else {
            emoji = rarityIndex >= 1 ? '💚' : '⚪';
            message = `${username} pulled a ${name}`;
        }
        
        // Add special modifiers
        const modifiers = [];
        if (isFirstEdition) modifiers.push('🏆 FIRST EDITION');
        if (isHolographic) modifiers.push('✨ HOLOGRAPHIC');
        if (quality === 'flawless') modifiers.push('💎 FLAWLESS');
        else if (quality === 'pristine') modifiers.push('⭐ PRISTINE');
        
        const fullMessage = modifiers.length > 0 
            ? `${emoji} ${message} [${modifiers.join(' ')}]`
            : `${emoji} ${message}`;
        
        this.broadcastToAll({
            type: 'gacha_announcement',
            message: fullMessage,
            username,
            rarity,
            rarityColor: RARITY_COLORS[rarity],
            name,
            category,
            quality,
            isHolographic,
            isFirstEdition
        });
    }
    
    // ==================== PUBLIC API ====================
    
    /**
     * Get gacha rates for display
     */
    static getRates() {
        return {
            rarities: Object.entries(RARITY_WEIGHTS).map(([rarity, weight]) => ({
                rarity,
                rate: (weight / TOTAL_RARITY_WEIGHT * 100).toFixed(2) + '%',
                oneIn: Math.round(TOTAL_RARITY_WEIGHT / weight),
                color: RARITY_COLORS[rarity],
                duplicateGold: DUPLICATE_GOLD_BASE[rarity]
            })),
            qualities: Object.entries(QUALITY_WEIGHTS).map(([quality, weight]) => ({
                quality,
                rate: weight + '%',
                multiplier: QUALITY_MULTIPLIERS[quality]
            })),
            holographic: {
                rate: (HOLO_CHANCE * 100) + '%',
                multiplier: HOLO_MULTIPLIER
            },
            pricing: {
                rollCost: ROLL_PRICE_PEBBLES,
                pebblesPerSol: PEBBLES_PER_SOL,
                rollCostSol: ROLL_PRICE_PEBBLES / PEBBLES_PER_SOL
            },
            pity: PITY_CONFIG
        };
    }
    
    /**
     * Get user's gacha roll history
     */
    async getRollHistory(walletAddress, limit = 50) {
        return GachaRoll.getUserHistory(walletAddress, limit);
    }
    
    /**
     * Get user's owned cosmetics with template data
     */
    async getOwnedCosmetics(walletAddress) {
        return OwnedCosmetic.getUserCosmeticsWithTemplates(walletAddress);
    }
    
    /**
     * Get user's pebble balance
     */
    async getPebbleBalance(walletAddress) {
        const user = await User.findOne({ walletAddress }, 'pebbles pebbleStats');
        return {
            balance: user?.pebbles || 0,
            stats: user?.pebbleStats || {}
        };
    }
    
    /**
     * Check if user can afford a roll
     */
    async canRoll(walletAddress) {
        const user = await User.findOne({ walletAddress }, 'pebbles');
        return {
            canRoll: (user?.pebbles || 0) >= ROLL_PRICE_PEBBLES,
            balance: user?.pebbles || 0,
            required: ROLL_PRICE_PEBBLES
        };
    }
}

export default GachaService;
export { 
    ROLL_PRICE_PEBBLES, 
    PEBBLES_PER_SOL,
    RARITY_WEIGHTS,
    RARITY_COLORS,
    RARITY_ORDER,
    QUALITY_WEIGHTS,
    QUALITY_MULTIPLIERS,
    DUPLICATE_GOLD_BASE,
    HOLO_CHANCE,
    PITY_CONFIG
};

