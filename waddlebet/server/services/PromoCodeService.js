/**
 * PromoCodeService - Server-authoritative promo code redemption
 * Handles validation, redemption, and unlocking items
 */

import PromoCode from '../db/models/PromoCode.js';
import PromoRedemption from '../db/models/PromoRedemption.js';
import CosmeticTemplate from '../db/models/CosmeticTemplate.js';
import OwnedCosmetic from '../db/models/OwnedCosmetic.js';
import { User, Transaction } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';

class PromoCodeService {
    constructor(userService) {
        this.userService = userService;
    }

    /**
     * Redeem a promo code for a user
     * @param {string} walletAddress - User's wallet
     * @param {string} code - The promo code to redeem
     * @param {object} context - Additional context (playerId, ip, etc.)
     * @returns {Promise<object>} Result with success/error and unlocked items
     */
    async redeemCode(walletAddress, code, context = {}) {
        if (!isDBConnected()) {
            return { 
                success: false, 
                error: 'DATABASE_UNAVAILABLE',
                message: 'Database not connected. Please try again later.'
            };
        }

        if (!walletAddress) {
            return { 
                success: false, 
                error: 'AUTH_REQUIRED',
                message: 'You must be logged in to redeem promo codes'
            };
        }

        if (!code || code.trim().length === 0) {
            return { 
                success: false, 
                error: 'INVALID_CODE',
                message: 'Please enter a promo code'
            };
        }

        const normalizedCode = code.toUpperCase().trim();

        try {
            // 1. Find the promo code
            const promoCode = await PromoCode.findByCode(normalizedCode);
            
            if (!promoCode) {
                // Record failed attempt for audit
                await this._recordFailedAttempt(walletAddress, normalizedCode, 'invalid', context);
                return { 
                    success: false, 
                    error: 'CODE_NOT_FOUND',
                    message: 'Invalid promo code'
                };
            }

            // 2. Check if code is valid (active, not expired, not max redemptions)
            const validityCheck = promoCode.isValid();
            if (!validityCheck.valid) {
                await this._recordFailedAttempt(walletAddress, normalizedCode, validityCheck.error, context);
                return { 
                    success: false, 
                    error: validityCheck.error,
                    message: this._getErrorMessage(validityCheck.error)
                };
            }

            // 3. Get user
            const user = await User.findOne({ walletAddress });
            if (!user) {
                return { 
                    success: false, 
                    error: 'USER_NOT_FOUND',
                    message: 'User not found'
                };
            }

            // 4. Check if already redeemed
            const hasRedeemed = await PromoRedemption.hasRedeemed(walletAddress, promoCode._id);
            const isReRedemption = hasRedeemed && promoCode.allowReRedemption;
            
            // 5. Check wallet-specific restrictions
            const canRedeem = promoCode.canWalletRedeem(walletAddress, user, hasRedeemed);
            if (!canRedeem.canRedeem) {
                await this._recordFailedAttempt(walletAddress, normalizedCode, canRedeem.error, context);
                return { 
                    success: false, 
                    error: canRedeem.error,
                    message: this._getErrorMessage(canRedeem.error, canRedeem),
                    ...canRedeem
                };
            }

            // 6. Apply the unlocks (creates OwnedCosmetic records, skips existing)
            const unlockedItems = await this._applyUnlocks(user, promoCode);

            // 7. Award coins if any (but NOT on re-redemption)
            let transactionId = null;
            if (promoCode.unlocks.coins > 0 && !isReRedemption) {
                const coinResult = await this._awardCoins(
                    walletAddress, 
                    promoCode.unlocks.coins, 
                    normalizedCode
                );
                if (coinResult.transactionId) {
                    transactionId = coinResult.transactionId;
                }
                unlockedItems.coinsAwarded = promoCode.unlocks.coins;
                unlockedItems.newBalance = coinResult.newBalance;
            }

            // 8-10: Only track redemption if this is a first-time redemption
            if (!isReRedemption) {
            // 8. Track redeemed code on user
            if (!user.redeemedPromoCodes) {
                user.redeemedPromoCodes = [];
            }
            user.redeemedPromoCodes.push({
                code: normalizedCode,
                promoCodeId: promoCode._id,
                redeemedAt: new Date()
            });
            user.stats.unlocks.totalPromoCodesRedeemed++;
            await user.save();

            // 9. Increment redemption count on promo code
            promoCode.redemptionCount++;
            await promoCode.save();

            // 10. Record successful redemption
            await PromoRedemption.recordRedemption({
                walletAddress,
                username: user.username,
                promoCodeId: promoCode._id,
                code: normalizedCode,
                codeName: promoCode.name,
                unlockedItems: {
                    mounts: promoCode.unlocks.mounts,
                    cosmetics: promoCode.unlocks.cosmetics,
                    characters: promoCode.unlocks.characters,
                    coins: promoCode.unlocks.coins
                },
                ipAddress: context.ipAddress,
                sessionId: context.sessionId,
                playerId: context.playerId,
                status: 'success',
                transactionId
            });
            }

            // Build appropriate message
            let message;
            if (isReRedemption) {
                if (unlockedItems.ownedCosmeticsCreated > 0) {
                    message = `Synced ${unlockedItems.ownedCosmeticsCreated} missing cosmetics from "${promoCode.name}"!`;
                    console.log(`🔄 Promo code re-redeemed: ${user.username} synced ${normalizedCode} - ${unlockedItems.ownedCosmeticsCreated} new records`);
                } else {
                    message = `All cosmetics from "${promoCode.name}" already unlocked!`;
                    console.log(`✅ Promo code re-redeemed: ${user.username} already has all items from ${normalizedCode}`);
                }
            } else {
                message = `Successfully redeemed "${promoCode.name}"!`;
            console.log(`🎟️ Promo code redeemed: ${user.username} used ${normalizedCode} - ${promoCode.getUnlocksSummary()}`);
            }

            return {
                success: true,
                code: normalizedCode,
                codeName: promoCode.name,
                unlocked: unlockedItems,
                isReRedemption,
                message
            };

        } catch (error) {
            console.error('Promo code redemption error:', error);
            return { 
                success: false, 
                error: 'REDEMPTION_ERROR',
                message: 'An error occurred while redeeming the code'
            };
        }
    }

    /**
     * Apply unlocks to user - Creates OwnedCosmetic records marked as non-tradable
     */
    async _applyUnlocks(user, promoCode) {
        const unlocked = {
            mounts: [],
            cosmetics: [],  // Array of { id, category } for auto-equip
            characters: [],
            skinColor: promoCode.unlocks.skinColor || null,
            skinColors: [],  // Track skin colors separately
            ownedCosmeticsCreated: 0
        };

        const walletAddress = user.walletAddress;

        // Helper to create OwnedCosmetic record for promo items (non-tradable, worthless)
        const createPromoOwnedCosmetic = async (template) => {
            try {
                // Check if user already owns this template (any instance)
                const existingOwned = await OwnedCosmetic.findOne({
                    ownerId: walletAddress,
                    templateId: template.templateId,
                    convertedToGold: false
                });
                
                if (existingOwned) {
                    // Already owns this item, skip
                    return null;
                }

                // PROMO ITEMS: Get next serial but NEVER mark as first edition
                // We still need unique serials due to index constraint
                const { serialNumber } = await OwnedCosmetic.getNextSerialAtomic(template.templateId);

                // Create the owned cosmetic record - WORTHLESS, non-tradable, hidden from inventory
                const ownedCosmetic = new OwnedCosmetic({
                    instanceId: OwnedCosmetic.generateInstanceId(),
                    templateId: template.templateId,
                    ownerId: walletAddress,
                    serialNumber,  // Unique serial (required by index)
                    quality: 'worn',  // Lowest quality - worthless
                    isHolographic: false,
                    isFirstEdition: false,  // NEVER first edition for promo items (overrides atomic result)
                    mintedBy: 'PROMO_SYSTEM',  // Mark as system-generated
                    acquisitionMethod: 'promo_code',
                    tradable: false,  // PROMO ITEMS CANNOT BE TRADED/SOLD/BURNED
                    // Initialize ownership history with promo entry
                    ownershipHistory: [{
                        walletAddress,
                        acquiredAt: new Date(),
                        acquiredFrom: 'PROMO_SYSTEM',
                        acquisitionType: 'promo',
                        price: 0
                    }],
                    totalTrades: 0
                });

                await ownedCosmetic.save();
                unlocked.ownedCosmeticsCreated++;
                
                return ownedCosmetic;
            } catch (err) {
                console.error(`Error creating promo OwnedCosmetic for ${template.templateId}:`, err.message);
                return null;
            }
        };

        // Unlock mounts
        for (const mountId of promoCode.unlocks.mounts) {
            if (!user.unlockedMounts.includes(mountId)) {
                user.unlockedMounts.push(mountId);
                user.stats.unlocks.totalMountsOwned++;
                unlocked.mounts.push(mountId);
            }
        }

        // Unlock specific cosmetics (with category info for auto-equip)
        for (const cosmetic of promoCode.unlocks.cosmetics) {
            const cosmeticId = cosmetic.id || cosmetic;
            const category = cosmetic.category || 'unknown';
            
            // Find the template
            const template = await CosmeticTemplate.findOne({ assetKey: cosmeticId });
            
            if (template) {
                // Create OwnedCosmetic record
                const created = await createPromoOwnedCosmetic(template);
                if (created) {
                    unlocked.cosmetics.push({
                        id: cosmeticId,
                        category: category
                    });
                }
            }
            
            // Also add to legacy unlockedCosmetics array for backward compatibility
            if (!user.unlockedCosmetics.includes(cosmeticId)) {
                user.unlockedCosmetics.push(cosmeticId);
                user.stats.unlocks.totalCosmeticsOwned++;
            }
        }

        // Unlock characters
        for (const characterId of promoCode.unlocks.characters) {
            if (!user.unlockedCharacters.includes(characterId)) {
                user.unlockedCharacters.push(characterId);
                user.stats.unlocks.totalCharactersOwned++;
                unlocked.characters.push(characterId);
            }
        }

        // Unlock effects
        if (promoCode.unlocks.effects) {
            for (const effectId of promoCode.unlocks.effects) {
                if (!user.unlockedEffects.includes(effectId)) {
                    user.unlockedEffects.push(effectId);
                    if (!unlocked.effects) unlocked.effects = [];
                    unlocked.effects.push(effectId);
                }
            }
        }

        // Unlock by rarity - query all cosmetics at specified rarities and create OwnedCosmetic records
        if (promoCode.unlocks.unlockByRarity && promoCode.unlocks.unlockByRarity.length > 0) {
            try {
                const rarityCosmetics = await CosmeticTemplate.find({
                    rarity: { $in: promoCode.unlocks.unlockByRarity },
                    isActive: true
                });

                console.log(`🎟️ Unlocking ${rarityCosmetics.length} cosmetics by rarity (${promoCode.unlocks.unlockByRarity.join(', ')})`);

                for (const template of rarityCosmetics) {
                    const category = template.category;
                    
                    if (category === 'mount') {
                        // Mounts go to unlockedMounts array (no OwnedCosmetic for mounts)
                        const unlockKey = template.assetKey;
                        if (!user.unlockedMounts.includes(unlockKey)) {
                            user.unlockedMounts.push(unlockKey);
                            user.stats.unlocks.totalMountsOwned++;
                            unlocked.mounts.push(unlockKey);
                        }
                    } else {
                        // All other categories (hat, eyes, mouth, bodyItem, skin) - create OwnedCosmetic
                        const created = await createPromoOwnedCosmetic(template);
                        
                        if (created) {
                            if (category === 'skin') {
                                unlocked.skinColors.push(template.assetKey);
                                // Also add to gachaOwnedCosmetics for client-side checking
                                if (!user.gachaOwnedCosmetics) {
                                    user.gachaOwnedCosmetics = [];
                                }
                                if (!user.gachaOwnedCosmetics.includes(template.templateId)) {
                                    user.gachaOwnedCosmetics.push(template.templateId);
                                }
                            } else {
                                unlocked.cosmetics.push({
                                    id: template.assetKey,
                                    category: category
                                });
                                // Also add to unlockedCosmetics for backward compatibility
                                if (!user.unlockedCosmetics.includes(template.assetKey)) {
                                    user.unlockedCosmetics.push(template.assetKey);
                                    user.stats.unlocks.totalCosmeticsOwned++;
                                }
                            }
                        }
                    }
                }
                
                console.log(`✅ Created ${unlocked.ownedCosmeticsCreated} OwnedCosmetic records (non-tradable)`);
            } catch (err) {
                console.error('Error unlocking by rarity:', err);
            }
        }

        await user.save();
        return unlocked;
    }

    /**
     * Award coins for promo code
     */
    async _awardCoins(walletAddress, amount, code) {
        const user = await User.findOne({ walletAddress });
        if (!user) return { success: false };

        const balanceBefore = user.coins;
        user.coins += amount;
        user.stats.economy.totalCoinsEarned += amount;
        await user.save();

        // Record transaction
        const transaction = await Transaction.record({
            type: 'promo_bonus',
            toWallet: walletAddress,
            amount,
            toBalanceBefore: balanceBefore,
            toBalanceAfter: user.coins,
            relatedData: { promoCode: code },
            reason: `Promo code: ${code}`
        });

        return { 
            success: true, 
            newBalance: user.coins,
            transactionId: transaction._id
        };
    }

    /**
     * Record failed redemption attempt for audit
     */
    async _recordFailedAttempt(walletAddress, code, error, context) {
        try {
            // Find promo code ID if it exists
            const promoCode = await PromoCode.findByCode(code);
            
            // Skip recording if promo code doesn't exist - can't associate with anything
            if (!promoCode) {
                console.log(`[Promo] Invalid code attempted: "${code}" by ${walletAddress.slice(0, 8)}...`);
                return;
            }
            
            await PromoRedemption.recordRedemption({
                walletAddress,
                promoCodeId: promoCode._id,
                code,
                codeName: promoCode.name || 'Unknown',
                status: error === 'ALREADY_REDEEMED' ? 'already_redeemed' :
                        error === 'CODE_EXPIRED' || error === 'CODE_NOT_YET_VALID' ? 'expired' :
                        error === 'CODE_MAX_REDEMPTIONS' ? 'max_reached' : 'invalid',
                ipAddress: context.ipAddress,
                playerId: context.playerId
            });
        } catch (e) {
            console.error('Failed to record failed promo attempt:', e);
        }
    }

    /**
     * Get human-readable error message
     */
    _getErrorMessage(error, context = {}) {
        const messages = {
            'CODE_NOT_FOUND': 'Invalid promo code',
            'CODE_INACTIVE': 'This promo code is no longer active',
            'CODE_NOT_YET_VALID': 'This promo code is not yet valid',
            'CODE_EXPIRED': 'This promo code has expired',
            'CODE_MAX_REDEMPTIONS': 'This promo code has reached its maximum redemptions',
            'ALREADY_REDEEMED': 'You have already redeemed this code',
            'WALLET_NOT_ALLOWED': 'This promo code is not available for your account',
            'MIN_GAMES_NOT_MET': `You need to play at least ${context.required || 0} games to redeem this code (you have ${context.current || 0})`
        };
        return messages[error] || 'Unable to redeem promo code';
    }

    /**
     * Get redeemed promo codes for a user (for display)
     */
    async getRedeemedCodes(walletAddress) {
        if (!walletAddress) return [];
        return PromoRedemption.getRedeemedCodesList(walletAddress);
    }

    /**
     * Validate a code without redeeming (for UI feedback)
     */
    async validateCode(walletAddress, code) {
        if (!code || code.trim().length === 0) {
            return { valid: false, error: 'INVALID_CODE' };
        }

        const promoCode = await PromoCode.findByCode(code);
        if (!promoCode) {
            return { valid: false, error: 'CODE_NOT_FOUND' };
        }

        const validityCheck = promoCode.isValid();
        if (!validityCheck.valid) {
            return { valid: false, error: validityCheck.error };
        }

        if (walletAddress) {
            const hasRedeemed = await PromoRedemption.hasRedeemed(walletAddress, promoCode._id);
            if (promoCode.singleUsePerWallet && hasRedeemed) {
                return { valid: false, error: 'ALREADY_REDEEMED' };
            }
        }

        return { 
            valid: true, 
            codeName: promoCode.name,
            unlocksSummary: promoCode.getUnlocksSummary()
        };
    }

    // ==================== ADMIN FUNCTIONS ====================

    /**
     * Create a new promo code (admin only)
     */
    async createPromoCode(data) {
        return PromoCode.createCode(data);
    }

    /**
     * Get all active promo codes (admin only)
     */
    async getActiveCodes() {
        return PromoCode.getActiveCodes();
    }

    /**
     * Deactivate a promo code (admin only)
     */
    async deactivateCode(codeId) {
        return PromoCode.findByIdAndUpdate(codeId, { isActive: false });
    }

    /**
     * Get redemption stats for a code (admin only)
     */
    async getCodeStats(codeId) {
        const redemptions = await PromoRedemption.getRedemptionsForCode(codeId);
        return {
            totalRedemptions: redemptions.length,
            successfulRedemptions: redemptions.filter(r => r.status === 'success').length,
            recentRedemptions: redemptions.slice(0, 10)
        };
    }
}

export default PromoCodeService;

