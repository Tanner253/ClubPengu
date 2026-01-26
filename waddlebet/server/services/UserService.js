/**
 * UserService - User CRUD operations and coin management
 * Server-authoritative for all user data
 */

import { User, Transaction, Puffle, OwnedCosmetic, CosmeticTemplate } from '../db/models/index.js';

// ========== FREE ITEMS (always available, no gacha needed) ==========
const FREE_ITEMS = ['none', 'normal', 'beak'];

// ========== 10 BASE SKIN COLORS (free selection) ==========
const FREE_SKIN_COLORS = [
    'blue', 'white', 'black', 'red', 'green', 
    'orange', 'pink', 'gold', 'purple', 'brown'
];

// ========== PROMO EXCLUSIVE IDS (must be unlocked via promo code) ==========
const PROMO_EXCLUSIVE_IDS = [
    'lmao', 'bonkEyes', 'mistorEyes',
    'bonkExclamation', 'mistorHair',
    'joe', 'bonkShirt', 'mistorShirt', 'penguShirt',
    'penguMount', 'minecraftBoat'
];

class UserService {
    /**
     * Get user by wallet address
     */
    async getUser(walletAddress) {
        return User.findOne({ walletAddress });
    }

    /**
     * Get user by current player ID (session-based)
     */
    async getUserByPlayerId(playerId) {
        return User.findOne({ currentPlayerId: playerId, isConnected: true });
    }

    /**
     * Update user profile
     */
    async updateProfile(walletAddress, updates) {
        const allowedUpdates = ['username', 'characterType', 'customization', 'settings'];
        const filteredUpdates = {};
        
        for (const key of allowedUpdates) {
            if (updates[key] !== undefined) {
                filteredUpdates[key] = updates[key];
            }
        }

        // Validate customization ownership (async checks for gacha items)
        if (filteredUpdates.customization) {
            const user = await this.getUser(walletAddress);
            if (!user) return { success: false, error: 'USER_NOT_FOUND' };

            // TEMPORARY: Skip ownership validation when all cosmetics are unlocked
            // TODO: Remove this check when ready to enforce cosmetic ownership
            const UNLOCK_ALL_COSMETICS = true;
            if (!UNLOCK_ALL_COSMETICS) {
                const { skin, hat, eyes, mouth, bodyItem, mount } = filteredUpdates.customization;
                
                // Check each cosmetic with the authoritative ownsCosmetic method
                if (skin && !await this.ownsCosmetic(walletAddress, skin, 'skin')) {
                    return { success: false, error: 'COSMETIC_NOT_OWNED', item: skin, category: 'skin' };
                }
                if (hat && !await this.ownsCosmetic(walletAddress, hat, 'hat')) {
                    return { success: false, error: 'COSMETIC_NOT_OWNED', item: hat, category: 'hat' };
                }
                if (eyes && !await this.ownsCosmetic(walletAddress, eyes, 'eyes')) {
                    return { success: false, error: 'COSMETIC_NOT_OWNED', item: eyes, category: 'eyes' };
                }
                if (mouth && !await this.ownsCosmetic(walletAddress, mouth, 'mouth')) {
                    return { success: false, error: 'COSMETIC_NOT_OWNED', item: mouth, category: 'mouth' };
                }
                if (bodyItem && !await this.ownsCosmetic(walletAddress, bodyItem, 'bodyItem')) {
                    return { success: false, error: 'COSMETIC_NOT_OWNED', item: bodyItem, category: 'bodyItem' };
                }
                if (mount && !await this.ownsCosmetic(walletAddress, mount, 'mount')) {
                    return { success: false, error: 'MOUNT_NOT_OWNED', item: mount, category: 'mount' };
                }
            }
        }

        // Track username changes
        if (filteredUpdates.username) {
            const user = await this.getUser(walletAddress);
            if (user && user.username !== filteredUpdates.username) {
                // Use model method for consistent 30-day cooldown
                if (!user.canChangeUsername()) {
                    const daysRemaining = user.daysUntilUsernameChange();
                    return { 
                        success: false, 
                        error: 'USERNAME_COOLDOWN', 
                        daysRemaining
                    };
                }
                
                // Add to history
                filteredUpdates.$push = {
                    usernameHistory: {
                        previousName: user.username,
                        changedAt: new Date()
                    }
                };
                filteredUpdates.lastUsernameChangeAt = new Date();
            }
        }

        const user = await User.findOneAndUpdate(
            { walletAddress },
            filteredUpdates,
            { new: true }
        );

        return { success: true, user: user?.getFullData() };
    }

    // ==================== COIN OPERATIONS (Server-Authoritative) ====================

    /**
     * Add coins to user (only called by server, never by client)
     * @param {string} walletAddress - User's wallet
     * @param {number} amount - Amount to add (positive or negative)
     * @param {string} type - Transaction type
     * @param {object} relatedData - Related entity IDs
     * @param {string} reason - Human-readable reason
     */
    async addCoins(walletAddress, amount, type, relatedData = {}, reason = '') {
        const user = await this.getUser(walletAddress);
        if (!user) {
            return { success: false, error: 'USER_NOT_FOUND' };
        }

        const balanceBefore = user.coins;
        
        // Check if deduction would result in negative balance
        if (amount < 0 && user.coins + amount < 0) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', balance: user.coins };
        }

        // Update balance
        user.coins += amount;
        
        // Update stats
        if (amount > 0) {
            user.stats.economy.totalCoinsEarned += amount;
        } else {
            user.stats.economy.totalCoinsSpent += Math.abs(amount);
        }
        
        await user.save();

        // Record transaction
        await Transaction.record({
            type,
            fromWallet: amount < 0 ? walletAddress : null,
            toWallet: amount > 0 ? walletAddress : null,
            amount: Math.abs(amount),
            fromBalanceBefore: amount < 0 ? balanceBefore : null,
            fromBalanceAfter: amount < 0 ? user.coins : null,
            toBalanceBefore: amount > 0 ? balanceBefore : null,
            toBalanceAfter: amount > 0 ? user.coins : null,
            relatedData,
            reason
        });

        return { success: true, newBalance: user.coins };
    }

    /**
     * Transfer coins between users (for wagers)
     */
    async transferCoins(fromWallet, toWallet, amount, type, relatedData = {}, reason = '') {
        // Get both users
        const fromUser = await this.getUser(fromWallet);
        const toUser = await this.getUser(toWallet);

        if (!fromUser) return { success: false, error: 'FROM_USER_NOT_FOUND' };
        if (!toUser) return { success: false, error: 'TO_USER_NOT_FOUND' };
        if (fromUser.coins < amount) return { success: false, error: 'INSUFFICIENT_FUNDS' };

        const fromBefore = fromUser.coins;
        const toBefore = toUser.coins;

        // Perform transfer
        fromUser.coins -= amount;
        toUser.coins += amount;

        // Update stats
        fromUser.stats.economy.totalCoinsSpent += amount;
        toUser.stats.economy.totalCoinsEarned += amount;

        await fromUser.save();
        await toUser.save();

        // Record transaction
        await Transaction.record({
            type,
            fromWallet,
            toWallet,
            amount,
            fromBalanceBefore: fromBefore,
            fromBalanceAfter: fromUser.coins,
            toBalanceBefore: toBefore,
            toBalanceAfter: toUser.coins,
            relatedData,
            reason
        });

        return {
            success: true,
            fromBalance: fromUser.coins,
            toBalance: toUser.coins
        };
    }

    /**
     * Escrow coins for a wager (deduct from player, hold until match completes)
     */
    async escrowWager(walletAddress, amount, matchId) {
        return this.addCoins(
            walletAddress,
            -amount,
            'wager_escrow',
            { matchId },
            `Wager escrow for match ${matchId}`
        );
    }

    /**
     * Payout wager winnings
     */
    async payoutWager(winnerWallet, loserWallet, totalPot, matchId) {
        return this.addCoins(
            winnerWallet,
            totalPot,
            'wager_payout',
            { matchId },
            `Won match ${matchId}`
        );
    }

    /**
     * Refund wager (for draws or voids)
     */
    async refundWager(walletAddress, amount, matchId, reason = 'draw') {
        return this.addCoins(
            walletAddress,
            amount,
            'wager_refund',
            { matchId },
            `Wager refund: ${reason}`
        );
    }

    /**
     * Check if user has enough coins for a wager
     */
    async canAffordWager(walletAddress, amount) {
        const user = await this.getUser(walletAddress);
        return user && user.coins >= amount;
    }

    /**
     * Simple coin update for PvE blackjack
     * @param {string} walletAddress - User's wallet
     * @param {number} amount - Positive for win, negative for bet
     */
    async updateCoins(walletAddress, amount) {
        const type = amount >= 0 ? 'blackjack_win' : 'blackjack_bet';
        const reason = amount >= 0 ? 'Blackjack win' : 'Blackjack bet';
        return this.addCoins(walletAddress, amount, type, {}, reason);
    }

    /**
     * Get user's current coin balance
     */
    async getUserCoins(walletAddress) {
        const user = await this.getUser(walletAddress);
        return user?.coins ?? 0;
    }

    // ==================== PUFFLE OPERATIONS ====================

    /**
     * Adopt a puffle
     */
    async adoptPuffle(walletAddress, color, name = 'Puffle') {
        const user = await this.getUser(walletAddress);
        if (!user) return { success: false, error: 'USER_NOT_FOUND' };

        const price = Puffle.getPrice(color);
        if (user.coins < price) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: price, have: user.coins };
        }

        // Deduct coins
        const coinResult = await this.addCoins(
            walletAddress,
            -price,
            'puffle_adopt',
            {},
            `Adopted ${color} puffle`
        );

        if (!coinResult.success) return coinResult;

        // Deactivate other puffles
        await Puffle.deactivateAllForOwner(walletAddress);

        // Create puffle
        const puffle = new Puffle({
            puffleId: `puffle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ownerWallet: walletAddress,
            name,
            color,
            isActive: true
        });

        await puffle.save();

        // Update user stats
        user.stats.puffles.totalPufflesAdopted++;
        await user.save();

        return { success: true, puffle: puffle.toClientData(), newBalance: coinResult.newBalance };
    }

    /**
     * Get user's puffles
     */
    async getPuffles(walletAddress) {
        const puffles = await Puffle.findByOwner(walletAddress);
        return puffles.map(p => p.toClientData());
    }

    /**
     * Set active puffle
     */
    async setActivePuffle(walletAddress, puffleId) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        // Deactivate all others
        await Puffle.deactivateAllForOwner(walletAddress);
        
        // Activate this one
        puffle.isActive = true;
        await puffle.save();

        return { success: true, puffle: puffle.toClientData() };
    }

    /**
     * Deactivate puffle (unequip)
     */
    async deactivatePuffle(walletAddress) {
        await Puffle.deactivateAllForOwner(walletAddress);
        return { success: true };
    }

    /**
     * Feed puffle with specific food
     */
    async feedPuffle(walletAddress, puffleId, foodType) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const foodInfo = Puffle.getFoodInfo(foodType);
        if (!foodInfo) return { success: false, error: 'INVALID_FOOD' };

        const user = await this.getUser(walletAddress);
        if (!user || user.coins < foodInfo.price) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: foodInfo.price };
        }

        // Deduct coins
        await this.addCoins(walletAddress, -foodInfo.price, 'puffle_food', { puffleId, foodType }, `Fed puffle ${foodType}`);

        // Update puffle stats
        const result = puffle.feed(foodType);
        await puffle.save();

        return { success: true, puffle: puffle.toClientData(), ...result };
    }

    /**
     * Play with puffle using a toy
     */
    async playWithPuffle(walletAddress, puffleId, toyType = null) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.play(toyType);
        if (!result.success && result.error) {
            return result;
        }

        await puffle.save();
        return { success: true, puffle: puffle.toClientData(), ...result };
    }

    /**
     * Buy a toy for puffle
     */
    async buyPuffleToy(walletAddress, puffleId, toyType) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const toyInfo = Puffle.getToyInfo(toyType);
        if (!toyInfo) return { success: false, error: 'INVALID_TOY' };

        if (puffle.ownedToys.includes(toyType)) {
            return { success: false, error: 'ALREADY_OWNED' };
        }

        const user = await this.getUser(walletAddress);
        if (!user || user.coins < toyInfo.price) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: toyInfo.price };
        }

        // Deduct coins
        await this.addCoins(walletAddress, -toyInfo.price, 'puffle_toy', { puffleId, toyType }, `Bought ${toyType} toy`);

        // Add toy to puffle
        puffle.ownedToys.push(toyType);
        await puffle.save();

        return { success: true, puffle: puffle.toClientData() };
    }

    /**
     * Buy food for puffle inventory (doesn't feed immediately)
     */
    async buyPuffleFood(walletAddress, puffleId, foodType, quantity = 1) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const foodInfo = Puffle.getFoodInfo(foodType);
        if (!foodInfo) return { success: false, error: 'INVALID_FOOD' };

        const totalCost = foodInfo.price * quantity;
        const user = await this.getUser(walletAddress);
        if (!user || user.coins < totalCost) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: totalCost };
        }

        // Deduct coins
        await this.addCoins(walletAddress, -totalCost, 'puffle_food_buy', { puffleId, foodType, quantity }, `Bought ${quantity}x ${foodType}`);

        // Add food to inventory
        puffle.addFood(foodType, quantity);
        await puffle.save();

        return { success: true, puffle: puffle.toClientData(), newBalance: user.coins - totalCost };
    }

    /**
     * Use food from puffle inventory
     */
    async usePuffleFood(walletAddress, puffleId, foodType) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.useFood(foodType);
        if (!result.success) return result;

        await puffle.save();
        return { success: true, puffle: puffle.toClientData(), ...result };
    }

    /**
     * Buy accessory for puffle
     */
    async buyPuffleAccessory(walletAddress, puffleId, category, itemId, price) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        // Check if already owned
        const categoryMap = { hat: 'hats', glasses: 'glasses', neckwear: 'neckwear' };
        const arrayKey = categoryMap[category] || category;
        if (puffle.ownedAccessories[arrayKey]?.includes(itemId)) {
            return { success: false, error: 'ALREADY_OWNED' };
        }

        const user = await this.getUser(walletAddress);
        if (!user || user.coins < price) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: price };
        }

        // Deduct coins
        await this.addCoins(walletAddress, -price, 'puffle_accessory', { puffleId, category, itemId }, `Bought ${itemId} ${category}`);

        // Add accessory
        puffle.addAccessory(category, itemId);
        await puffle.save();

        return { success: true, puffle: puffle.toClientData() };
    }

    /**
     * Equip puffle accessory
     */
    async equipPuffleAccessory(walletAddress, puffleId, category, itemId) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.equipAccessory(category, itemId);
        if (!result.success) return result;

        await puffle.save();
        return { success: true, puffle: puffle.toClientData() };
    }

    /**
     * Equip puffle toy
     */
    async equipPuffleToy(walletAddress, puffleId, toyType) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.equipToy(toyType);
        if (!result.success) return result;

        await puffle.save();
        return { success: true, puffle: puffle.toClientData() };
    }

    /**
     * Start puffle rest
     */
    async restPuffle(walletAddress, puffleId) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.startRest();
        if (!result.success) {
            return result;
        }
        await puffle.save();
        return { success: true, puffle: puffle.toClientData(), ...result };
    }

    /**
     * Stop puffle rest (interrupt or complete)
     */
    async stopRestPuffle(walletAddress, puffleId) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.stopRest();
        if (!result.success) {
            return result;
        }
        await puffle.save();
        return { success: true, puffle: puffle.toClientData(), ...result };
    }

    /**
     * Get current rest status
     */
    async getPuffleRestStatus(walletAddress, puffleId) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        return { success: true, ...puffle.getRestStatus() };
    }

    /**
     * Train puffle in a specific stat
     */
    async trainPuffle(walletAddress, puffleId, statType, amount) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.train(statType, amount);
        if (!result.success) return result;

        await puffle.save();
        return { success: true, puffle: puffle.toClientData(), ...result };
    }

    /**
     * Record puffle-to-puffle interaction (proximity dance)
     * Returns gold reward if successful
     */
    async recordPuffleInteraction(walletAddress, otherWalletAddress) {
        if (walletAddress === otherWalletAddress) {
            return { success: false, error: 'SAME_OWNER' };
        }

        const puffle = await Puffle.findActiveForOwner(walletAddress);
        const otherPuffle = await Puffle.findActiveForOwner(otherWalletAddress);

        if (!puffle || !otherPuffle) {
            return { success: false, error: 'NO_ACTIVE_PUFFLE' };
        }

        // Check cooldown (1 hour between interactions with same player)
        if (!puffle.canInteractWith(otherWalletAddress)) {
            return { success: false, error: 'COOLDOWN', message: 'Can only interact once per hour' };
        }

        // Record interaction on both puffles
        puffle.recordInteraction(otherWalletAddress);
        otherPuffle.recordInteraction(walletAddress);

        await puffle.save();
        await otherPuffle.save();

        // Award gold to both players
        const goldReward = 10;
        await this.addCoins(walletAddress, goldReward, 'puffle_social', { otherWallet: otherWalletAddress }, 'Puffle social bonus');
        await this.addCoins(otherWalletAddress, goldReward, 'puffle_social', { otherWallet: walletAddress }, 'Puffle social bonus');

        return { 
            success: true, 
            goldEarned: goldReward,
            puffle: puffle.toClientData(),
            otherPuffle: otherPuffle.toClientData()
        };
    }

    /**
     * Start puffle daycare
     */
    async startPuffleDaycare(walletAddress, puffleId, hours = 24) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        // Cost: 5 gold per hour
        const cost = hours * 5;
        const user = await this.getUser(walletAddress);
        if (!user || user.coins < cost) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: cost };
        }

        // Deduct coins
        await this.addCoins(walletAddress, -cost, 'puffle_daycare', { puffleId, hours }, `Puffle daycare for ${hours}h`);

        puffle.startDaycare();
        await puffle.save();

        return { success: true, puffle: puffle.toClientData(), cost };
    }

    /**
     * End puffle daycare
     */
    async endPuffleDaycare(walletAddress, puffleId) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        puffle.endDaycare();
        await puffle.save();

        return { success: true, puffle: puffle.toClientData() };
    }

    /**
     * Get puffle shop items (food, toys, accessories)
     */
    getPuffleShopItems() {
        return Puffle.getShopItems();
    }

    /**
     * Buy food for puffle inventory
     */
    async buyPuffleFood(walletAddress, puffleId, foodType, quantity = 1) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const foodInfo = Puffle.getFoodInfo(foodType);
        if (!foodInfo) return { success: false, error: 'INVALID_FOOD' };

        const totalCost = foodInfo.price * quantity;
        const user = await this.getUser(walletAddress);
        if (!user || user.coins < totalCost) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: totalCost, have: user?.coins || 0 };
        }

        // Deduct coins
        await this.addCoins(walletAddress, -totalCost, 'puffle_food_purchase', { puffleId, foodType, quantity }, `Bought ${quantity}x ${foodType}`);

        // Add to puffle's food inventory
        puffle.addFood(foodType, quantity);
        await puffle.save();

        return { success: true, puffle: puffle.toClientData(), foodType, quantity, newInventory: puffle.foodInventory };
    }

    /**
     * Feed puffle using food from inventory
     * @param {boolean} useInventory - if true, use food from inventory; if false, buy on-the-fly
     */
    async feedPuffleFromInventory(walletAddress, puffleId, foodType) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const foodInfo = Puffle.getFoodInfo(foodType);
        if (!foodInfo) return { success: false, error: 'INVALID_FOOD' };

        // Try to use from inventory
        const useResult = puffle.useFood(foodType);
        if (!useResult.success) {
            return { success: false, error: 'NO_FOOD_IN_INVENTORY', message: 'You need to buy more food!' };
        }

        // Apply feeding effects
        const feedResult = puffle.feed(foodType);
        await puffle.save();

        return { success: true, puffle: puffle.toClientData(), ...feedResult, usedFromInventory: true };
    }

    /**
     * Buy accessory for puffle
     */
    async buyPuffleAccessory(walletAddress, puffleId, category, accessoryId, price) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const user = await this.getUser(walletAddress);
        if (!user || user.coins < price) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: price, have: user?.coins || 0 };
        }

        // Check if already owned
        const result = puffle.addAccessory(category, accessoryId);
        if (!result.success) {
            return result;
        }

        // Deduct coins
        await this.addCoins(walletAddress, -price, 'puffle_accessory', { puffleId, category, accessoryId }, `Bought ${accessoryId} for puffle`);
        await puffle.save();

        return { success: true, puffle: puffle.toClientData(), category, accessoryId };
    }

    /**
     * Equip toy on puffle
     */
    async equipPuffleToy(walletAddress, puffleId, toyType) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.equipToy(toyType);
        if (!result.success) return result;

        await puffle.save();
        return { success: true, puffle: puffle.toClientData(), equippedToy: toyType };
    }

    /**
     * Equip accessory on puffle
     */
    async equipPuffleAccessory(walletAddress, puffleId, category, accessoryId) {
        const puffle = await Puffle.findOne({ puffleId, ownerWallet: walletAddress });
        if (!puffle) return { success: false, error: 'PUFFLE_NOT_FOUND' };

        const result = puffle.equipAccessory(category, accessoryId);
        if (!result.success) return result;

        await puffle.save();
        return { success: true, puffle: puffle.toClientData(), accessories: puffle.accessories };
    }

    // ==================== COSMETIC OPERATIONS ====================

    /**
     * Check if a cosmetic is owned by the user
     * This is the AUTHORITATIVE check for cosmetic ownership
     * 
     * @param {string} walletAddress - User's wallet
     * @param {string} cosmeticId - Asset key of the cosmetic
     * @param {string} category - Category (skin, hat, eyes, mouth, bodyItem, mount)
     * @returns {Promise<boolean>} Whether the user owns the cosmetic
     */
    async ownsCosmetic(walletAddress, cosmeticId, category = null) {
        // TEMPORARY: Unlock all cosmetics for everyone
        // TODO: Set to false when ready to enforce cosmetic ownership
        const UNLOCK_ALL_COSMETICS = true;
        if (UNLOCK_ALL_COSMETICS) {
            return true;
        }
        
        // Always allow 'none' and other free defaults
        if (FREE_ITEMS.includes(cosmeticId)) {
            return true;
        }
        
        // Free skin colors are always available
        if (category === 'skin' && FREE_SKIN_COLORS.includes(cosmeticId)) {
            return true;
        }
        
        const user = await this.getUser(walletAddress);
        if (!user) return false;
        
        // Check promo exclusives - must be in unlockedCosmetics or unlockedMounts
        if (PROMO_EXCLUSIVE_IDS.includes(cosmeticId)) {
            return user.unlockedCosmetics.includes(cosmeticId) || 
                   user.unlockedMounts.includes(cosmeticId);
        }
        
        // Check if in legacy unlocked arrays (for backwards compat)
        if (user.unlockedCosmetics.includes(cosmeticId) || 
            user.unlockedMounts.includes(cosmeticId)) {
            return true;
        }
        
        // Check if owned via gacha (OwnedCosmetic)
        // IMPORTANT: templateId is stored as `${category}_${assetKey}` in the database
        // If we have a category, construct the proper templateId
        if (category) {
            const templateId = `${category}_${cosmeticId}`;
            const owned = await OwnedCosmetic.userOwnsTemplate(walletAddress, templateId);
            if (owned) return true;
        }
        
        // Also check by assetKey directly (fallback for legacy or if category not provided)
        // This queries by the raw cosmeticId in case some templates don't follow the prefix pattern
        const ownedByAsset = await OwnedCosmetic.userOwnsTemplate(walletAddress, cosmeticId);
        
        return ownedByAsset;
    }
    
    /**
     * Get all cosmetics owned by a user with their ownership status
     * Used by frontend to show locked/unlocked state
     * 
     * @param {string} walletAddress - User's wallet
     * @returns {Promise<object>} Owned cosmetics by category
     */
    async getOwnedCosmetics(walletAddress) {
        const user = await this.getUser(walletAddress);
        if (!user) return null;
        
        // Get gacha-owned cosmetics
        const gachaOwned = await OwnedCosmetic.getUserCosmeticsWithTemplates(walletAddress);
        
        // Combine legacy unlocks with gacha ownership
        const owned = {
            skin: [...FREE_SKIN_COLORS],  // Free skins always available
            hat: ['none'],
            eyes: ['none', 'normal'],
            mouth: ['none', 'beak'],
            bodyItem: ['none'],
            mount: ['none'],
            // Detailed gacha items for display
            gachaItems: gachaOwned
        };
        
        // Add legacy unlocked cosmetics
        for (const cosmeticId of user.unlockedCosmetics) {
            // We don't know the category for legacy items, so we'll need to
            // check the template or frontend will handle it
            if (!owned.hat.includes(cosmeticId)) owned.hat.push(cosmeticId);
            if (!owned.eyes.includes(cosmeticId)) owned.eyes.push(cosmeticId);
            if (!owned.mouth.includes(cosmeticId)) owned.mouth.push(cosmeticId);
            if (!owned.bodyItem.includes(cosmeticId)) owned.bodyItem.push(cosmeticId);
        }
        
        // Add legacy unlocked mounts
        for (const mountId of user.unlockedMounts) {
            if (!owned.mount.includes(mountId)) owned.mount.push(mountId);
        }
        
        // Add gacha-owned items to their categories
        for (const item of gachaOwned) {
            const category = item.template?.category;
            if (category && owned[category] && !owned[category].includes(item.templateId)) {
                owned[category].push(item.templateId);
            }
        }
        
        return owned;
    }
    
    /**
     * Check and unequip any locked cosmetics from user's customization
     * Called when user enters world or updates profile
     * 
     * @param {string} walletAddress - User's wallet
     * @returns {Promise<object>} Result with any unequipped items
     */
    async validateAndUnequipLockedCosmetics(walletAddress) {
        const user = await this.getUser(walletAddress);
        if (!user) return { success: false, error: 'USER_NOT_FOUND' };
        
        const unequipped = [];
        const updates = {};
        
        // Check each equipped cosmetic
        const categories = [
            { field: 'skin', default: 'blue' },
            { field: 'hat', default: 'none' },
            { field: 'eyes', default: 'normal' },
            { field: 'mouth', default: 'beak' },
            { field: 'bodyItem', default: 'none' },
            { field: 'mount', default: 'none' }
        ];
        
        for (const { field, default: defaultVal } of categories) {
            const equipped = user.customization[field];
            if (equipped && equipped !== defaultVal) {
                const owns = await this.ownsCosmetic(walletAddress, equipped, field);
                if (!owns) {
                    updates[`customization.${field}`] = defaultVal;
                    unequipped.push({ field, item: equipped, replacedWith: defaultVal });
                }
            }
        }
        
        // Apply updates if any items were unequipped
        if (Object.keys(updates).length > 0) {
            await User.updateOne({ walletAddress }, { $set: updates });
            console.log(`⚠️ Unequipped locked cosmetics for ${walletAddress.slice(0, 8)}:`, unequipped);
        }
        
        return { 
            success: true, 
            unequipped,
            hasLockedItems: unequipped.length > 0
        };
    }
    
    /**
     * Reset customization to defaults (clear button)
     * 
     * @param {string} walletAddress - User's wallet
     * @returns {Promise<object>} Result
     */
    async resetCustomization(walletAddress) {
        const defaultCustomization = {
            skin: 'blue',
            hat: 'none',
            eyes: 'normal',
            mouth: 'beak',
            bodyItem: 'none',
            mount: 'none'
        };
        
        const result = await User.findOneAndUpdate(
            { walletAddress },
            { $set: { customization: defaultCustomization } },
            { new: true }
        );
        
        if (!result) return { success: false, error: 'USER_NOT_FOUND' };
        
        return { 
            success: true, 
            customization: defaultCustomization 
        };
    }
    
    /**
     * Get free skin colors (for display in penguin maker)
     */
    static getFreeSkinColors() {
        return FREE_SKIN_COLORS;
    }
    
    /**
     * Get promo exclusive IDs
     */
    static getPromoExclusiveIds() {
        return PROMO_EXCLUSIVE_IDS;
    }

    /**
     * Purchase a cosmetic
     */
    async purchaseCosmetic(walletAddress, cosmeticId, price, category = 'cosmetic') {
        const user = await this.getUser(walletAddress);
        if (!user) return { success: false, error: 'USER_NOT_FOUND' };

        // Check if already owned
        if (user.ownsCosmetic(cosmeticId)) {
            return { success: false, error: 'ALREADY_OWNED' };
        }

        // Check funds
        if (user.coins < price) {
            return { success: false, error: 'INSUFFICIENT_FUNDS', required: price, have: user.coins };
        }

        // Deduct coins
        const coinResult = await this.addCoins(
            walletAddress,
            -price,
            'purchase',
            { cosmeticId },
            `Purchased ${cosmeticId}`
        );

        if (!coinResult.success) return coinResult;

        // Unlock cosmetic
        user.unlockCosmetic(cosmeticId, category);
        user.stats.economy.totalPurchasesMade++;
        await user.save();

        return { success: true, newBalance: coinResult.newBalance };
    }
    
    /**
     * Raw MongoDB update (for complex operations like $inc, $set)
     * Used by GachaService for atomic stat updates
     * @param {string} walletAddress - User's wallet
     * @param {object} update - MongoDB update object ($inc, $set, etc.)
     */
    async updateUserRaw(walletAddress, update) {
        return User.updateOne({ walletAddress }, update);
    }

    // ==================== STATS OPERATIONS ====================

    /**
     * Increment a stat
     */
    async incrementStat(walletAddress, statPath, amount = 1) {
        const update = { $inc: {} };
        update.$inc[statPath] = amount;
        
        await User.updateOne({ walletAddress }, update);
    }

    /**
     * Record room time
     */
    async recordRoomTime(walletAddress, room, minutes) {
        const roomKey = `stats.roomTime.${room}`;
        await this.incrementStat(walletAddress, roomKey, minutes);
        
        if (room.startsWith('igloo')) {
            await this.incrementStat(walletAddress, 'stats.roomTime.totalIglooTime', minutes);
        }
    }

    /**
     * Get leaderboard
     */
    async getLeaderboard(type = 'coins', limit = 100) {
        let sortField;
        switch (type) {
            case 'coins':
                sortField = { coins: -1 };
                break;
            case 'cardJitsu':
                sortField = { 'gameStats.cardJitsu.wins': -1 };
                break;
            case 'connect4':
                sortField = { 'gameStats.connect4.wins': -1 };
                break;
            case 'ticTacToe':
                sortField = { 'gameStats.ticTacToe.wins': -1 };
                break;
            case 'overall':
                sortField = { 'gameStats.overall.totalGamesWon': -1 };
                break;
            default:
                sortField = { coins: -1 };
        }

        const users = await User.find({})
            .select('walletAddress username coins gameStats.cardJitsu.wins gameStats.connect4.wins gameStats.ticTacToe.wins gameStats.overall customization')
            .sort(sortField)
            .limit(limit);

        return users.map((user, index) => ({
            rank: index + 1,
            walletAddress: user.walletAddress,
            username: user.username,
            score: type === 'coins' ? user.coins : 
                   type === 'overall' ? user.gameStats.overall.totalGamesWon :
                   user.gameStats[type]?.wins || 0,
            customization: {
                skin: user.customization?.skin,
                hat: user.customization?.hat
            }
        }));
    }
}

export default UserService;
