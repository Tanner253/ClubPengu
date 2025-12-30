/**
 * User Model - Core player account
 * Server-authoritative for all security-critical data
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    // ========== IDENTITY (Primary Key) ==========
    walletAddress: {
        type: String,
        required: true
        // unique index defined below with schema.index()
    },

    // ========== PROFILE ==========
    username: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20
        // unique index defined below with schema.index()
    },
    characterType: {
        type: String,
        enum: ['penguin', 'marcus', 'whiteWhale', 'blackWhale', 'silverWhale', 'goldWhale', 'doginal'],
        default: 'penguin'
    },

    // Appearance
    customization: {
        skin: { type: String, default: 'blue' },
        hat: { type: String, default: 'none' },
        eyes: { type: String, default: 'normal' },
        mouth: { type: String, default: 'beak' },
        bodyItem: { type: String, default: 'none' },
        mount: { type: String, default: 'none' },
        // Doginal freestyle colors
        dogPrimaryColor: { type: String, default: '#D4A04A' },
        dogSecondaryColor: { type: String, default: '#F0D890' }
    },

    // ========== CURRENCY (Server-Authoritative) ==========
    coins: {
        type: Number,
        default: 100,  // Starting coins
        min: 0
    },
    
    // ========== PEBBLES (Premium Currency for Gacha) ==========
    pebbles: {
        type: Number,
        default: 0,  // New users start with 0 pebbles
        min: 0
    },
    pebbleStats: {
        totalDeposited: { type: Number, default: 0 },    // Lifetime pebbles bought
        totalWithdrawn: { type: Number, default: 0 },    // Lifetime pebbles cashed out
        totalSpent: { type: Number, default: 0 },        // Lifetime pebbles spent (gacha, etc.)
        totalRakePaid: { type: Number, default: 0 },     // 5% rake on withdrawals
        lastDepositAt: Date,
        lastWithdrawalAt: Date
    },

    // ========== INVENTORY SYSTEM ==========
    inventorySlots: { type: Number, default: 150 },       // Base inventory size
    inventoryUpgrades: { type: Number, default: 0 },      // Number of upgrades purchased
    maxInventorySlots: { type: Number, default: 150 },    // Computed: 150 + (upgrades * 50)
    
    // ========== UNLOCKS (Anti-Cheat Critical) ==========
    // Note: unlockedCosmetics/Mounts are for PROMO items only
    // Gacha items are tracked in OwnedCosmetic collection
    unlockedCosmetics: {
        type: [String],
        default: ['none']
    },
    unlockedMounts: {
        type: [String],
        default: ['none']
    },
    unlockedCharacters: {
        type: [String],
        default: ['penguin']
    },
    stamps: [{
        id: String,
        name: String,
        earnedAt: { type: Date, default: Date.now }
    }],
    inventory: {
        type: [String],
        default: []
    },

    // ========== COMPREHENSIVE STATISTICS ==========
    stats: {
        movement: {
            totalDistanceWalked: { type: Number, default: 0 },
            totalJumps: { type: Number, default: 0 },
            totalRoomChanges: { type: Number, default: 0 },
            totalBuildingsEntered: { type: Number, default: 0 }
        },
        social: {
            totalChatsSent: { type: Number, default: 0 },
            totalWhispersSent: { type: Number, default: 0 },
            totalWhispersReceived: { type: Number, default: 0 },
            totalEmotesUsed: { type: Number, default: 0 },
            totalFriendsAdded: { type: Number, default: 0 },
            totalChallengesSent: { type: Number, default: 0 },
            totalChallengesReceived: { type: Number, default: 0 },
            totalChallengesAccepted: { type: Number, default: 0 },
            totalChallengesDeclined: { type: Number, default: 0 }
        },
        emotes: {
            wave: { type: Number, default: 0 },
            laugh: { type: Number, default: 0 },
            breakdance: { type: Number, default: 0 },
            dance: { type: Number, default: 0 },
            sit: { type: Number, default: 0 },
            '67': { type: Number, default: 0 },
            headbang: { type: Number, default: 0 },
            dj: { type: Number, default: 0 }
        },
        economy: {
            totalCoinsEarned: { type: Number, default: 100 },
            totalCoinsSpent: { type: Number, default: 0 },
            totalCoinsWagered: { type: Number, default: 0 },
            totalCoinsWonFromWagers: { type: Number, default: 0 },
            totalCoinsLostToWagers: { type: Number, default: 0 },
            totalPurchasesMade: { type: Number, default: 0 },
            totalTradesCompleted: { type: Number, default: 0 }
        },
        session: {
            totalPlayTimeMinutes: { type: Number, default: 0 },
            totalSessions: { type: Number, default: 0 },
            longestSessionMinutes: { type: Number, default: 0 },
            totalAfkTimeMinutes: { type: Number, default: 0 }
        },
        puffles: {
            totalPufflesAdopted: { type: Number, default: 0 },
            totalTimesFedPuffle: { type: Number, default: 0 },
            totalTimesPlayedWithPuffle: { type: Number, default: 0 },
            totalPuffleHappinessGiven: { type: Number, default: 0 }
        },
        unlocks: {
            totalCosmeticsOwned: { type: Number, default: 1 },
            totalMountsOwned: { type: Number, default: 1 },
            totalCharactersOwned: { type: Number, default: 1 },
            totalStampsEarned: { type: Number, default: 0 },
            totalPromoCodesRedeemed: { type: Number, default: 0 }
        },
        roomTime: {
            town: { type: Number, default: 0 },
            nightclub: { type: Number, default: 0 },
            dojo: { type: Number, default: 0 },
            pizza: { type: Number, default: 0 },
            market: { type: Number, default: 0 },
            igloo1: { type: Number, default: 0 },
            igloo2: { type: Number, default: 0 },
            igloo3: { type: Number, default: 0 },
            igloo4: { type: Number, default: 0 },
            igloo5: { type: Number, default: 0 },
            igloo6: { type: Number, default: 0 },
            igloo7: { type: Number, default: 0 },
            igloo8: { type: Number, default: 0 },
            igloo9: { type: Number, default: 0 },
            igloo10: { type: Number, default: 0 },
            totalIglooTime: { type: Number, default: 0 }
        },
        // ========== GACHA STATS ==========
        gacha: {
            totalRolls: { type: Number, default: 0 },
            totalPebblesSpent: { type: Number, default: 0 },
            rarestRarity: { type: String, default: null },
            divineCount: { type: Number, default: 0 },
            mythicCount: { type: Number, default: 0 },
            legendaryCount: { type: Number, default: 0 },
            epicCount: { type: Number, default: 0 },
            rareCount: { type: Number, default: 0 },
            holoCount: { type: Number, default: 0 },
            firstEditionCount: { type: Number, default: 0 },
            goldFromDupes: { type: Number, default: 0 },
            firstRollAt: Date,
            lastRollAt: Date,
            // Pity counters - track consecutive rolls without hitting rarity
            pity: {
                rollsSinceRare: { type: Number, default: 0 },
                rollsSinceEpic: { type: Number, default: 0 },
                rollsSinceLegendary: { type: Number, default: 0 }
            }
        }
    },

    // ========== GAME STATISTICS ==========
    gameStats: {
        cardJitsu: {
            played: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            coinsWon: { type: Number, default: 0 },
            coinsLost: { type: Number, default: 0 },
            winStreak: { type: Number, default: 0 },
            bestWinStreak: { type: Number, default: 0 },
            lossStreak: { type: Number, default: 0 },
            worstLossStreak: { type: Number, default: 0 },
            totalRoundsPlayed: { type: Number, default: 0 },
            fireWins: { type: Number, default: 0 },
            waterWins: { type: Number, default: 0 },
            snowWins: { type: Number, default: 0 }
        },
        connect4: {
            played: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            coinsWon: { type: Number, default: 0 },
            coinsLost: { type: Number, default: 0 },
            winStreak: { type: Number, default: 0 },
            bestWinStreak: { type: Number, default: 0 },
            lossStreak: { type: Number, default: 0 },
            worstLossStreak: { type: Number, default: 0 },
            totalMovesPlayed: { type: Number, default: 0 }
        },
        ticTacToe: {
            played: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            draws: { type: Number, default: 0 },
            coinsWon: { type: Number, default: 0 },
            coinsLost: { type: Number, default: 0 },
            winStreak: { type: Number, default: 0 },
            bestWinStreak: { type: Number, default: 0 },
            lossStreak: { type: Number, default: 0 },
            worstLossStreak: { type: Number, default: 0 },
            totalMovesPlayed: { type: Number, default: 0 },
            winsAsX: { type: Number, default: 0 },
            winsAsO: { type: Number, default: 0 }
        },
        blackjack: {
            played: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            pushes: { type: Number, default: 0 },  // Ties in blackjack
            blackjacks: { type: Number, default: 0 },  // Natural 21s
            busts: { type: Number, default: 0 },  // Going over 21
            coinsWon: { type: Number, default: 0 },
            coinsLost: { type: Number, default: 0 },
            winStreak: { type: Number, default: 0 },
            bestWinStreak: { type: Number, default: 0 },
            lossStreak: { type: Number, default: 0 },
            worstLossStreak: { type: Number, default: 0 },
            totalHandsPlayed: { type: Number, default: 0 },
            totalHits: { type: Number, default: 0 },
            totalStands: { type: Number, default: 0 },
            totalDoubles: { type: Number, default: 0 },
            // PvE vs PvP tracking
            pveGames: { type: Number, default: 0 },
            pveWins: { type: Number, default: 0 },
            pvpGames: { type: Number, default: 0 },
            pvpWins: { type: Number, default: 0 }
        },
        uno: {
            played: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            coinsWon: { type: Number, default: 0 },
            coinsLost: { type: Number, default: 0 },
            winStreak: { type: Number, default: 0 },
            bestWinStreak: { type: Number, default: 0 }
        },
        monopoly: {
            played: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            coinsWon: { type: Number, default: 0 },
            coinsLost: { type: Number, default: 0 },
            winStreak: { type: Number, default: 0 },
            bestWinStreak: { type: Number, default: 0 }
        },
        battleship: {
            played: { type: Number, default: 0 },
            wins: { type: Number, default: 0 },
            losses: { type: Number, default: 0 },
            coinsWon: { type: Number, default: 0 },
            coinsLost: { type: Number, default: 0 },
            winStreak: { type: Number, default: 0 },
            bestWinStreak: { type: Number, default: 0 },
            totalShotsFired: { type: Number, default: 0 },
            totalHits: { type: Number, default: 0 },
            totalShipsSunk: { type: Number, default: 0 }
        },
        overall: {
            totalGamesPlayed: { type: Number, default: 0 },
            totalGamesWon: { type: Number, default: 0 },
            totalGamesLost: { type: Number, default: 0 },
            totalGamesDrew: { type: Number, default: 0 },
            favoriteGame: { type: String, default: null }
        }
    },

    // ========== SESSION STATE ==========
    lastRoom: { type: String, default: 'town' },
    lastPosition: {
        x: { type: Number, default: 110 },
        y: { type: Number, default: 0 },
        z: { type: Number, default: 110 }
    },

    // ========== SETTINGS ==========
    settings: {
        musicVolume: { type: Number, default: 50, min: 0, max: 100 },
        soundEnabled: { type: Boolean, default: true },
        mountEnabled: { type: Boolean, default: true },
        snowEnabled: { type: Boolean, default: true }
    },

    // ========== CONNECTION STATE ==========
    isConnected: { type: Boolean, default: false },
    currentSessionId: { type: String, default: null },
    currentPlayerId: { type: String, default: null },
    lastLoginAt: { type: Date, default: null },
    lastLogoutAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: null },
    lastIpAddress: { type: String, default: null },

    // ========== USERNAME MANAGEMENT ==========
    usernameHistory: [{
        previousName: String,
        changedAt: { type: Date, default: Date.now }
    }],
    lastUsernameChangeAt: { type: Date, default: null },

    // ========== MODERATION ==========
    isBanned: { type: Boolean, default: false },
    banReason: { type: String, default: null },
    banExpires: { type: Date, default: null },
    banHistory: [{
        reason: String,
        bannedAt: Date,
        bannedBy: String,
        expiresAt: Date,
        liftedAt: Date,
        liftedBy: String
    }],

    // ========== PROMO CODES ==========
    redeemedPromoCodes: [{
        code: String,
        promoCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode' },
        redeemedAt: { type: Date, default: Date.now }
    }],

    // ========== MIGRATION TRACKING ==========
    migrationSource: { type: String, default: null },
    migratedAt: { type: Date, default: null }

}, {
    timestamps: true  // Adds createdAt and updatedAt
});

// ==================== INDEXES ====================
userSchema.index({ walletAddress: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });  // Usernames must be unique
userSchema.index({ isConnected: 1 });
userSchema.index({ coins: -1 });  // Leaderboard
userSchema.index({ 'gameStats.cardJitsu.wins': -1 });
userSchema.index({ 'gameStats.connect4.wins': -1 });
userSchema.index({ 'gameStats.ticTacToe.wins': -1 });
userSchema.index({ 'gameStats.overall.totalGamesWon': -1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ createdAt: -1 });

// ==================== METHODS ====================

/**
 * Add coins with validation
 */
userSchema.methods.addCoins = function(amount, reason = 'unknown') {
    if (amount < 0 && this.coins + amount < 0) {
        return { success: false, error: 'INSUFFICIENT_FUNDS' };
    }
    
    this.coins += amount;
    
    if (amount > 0) {
        this.stats.economy.totalCoinsEarned += amount;
    } else {
        this.stats.economy.totalCoinsSpent += Math.abs(amount);
    }
    
    return { success: true, newBalance: this.coins };
};

/**
 * Check if user has enough coins
 */
userSchema.methods.hasCoins = function(amount) {
    return this.coins >= amount;
};

/**
 * Check if user owns a cosmetic
 * NOTE: Currently all cosmetics are FREE except promo-exclusive items.
 * Promo items are defined in PROMO_EXCLUSIVE_IDS below.
 * In the future, this will check against purchased items.
 */
const PROMO_EXCLUSIVE_IDS = [
    // Eyes
    'lmao', 'bonkEyes', 'mistorEyes',
    // Hats
    'bonkExclamation', 'mistorHair',
    // Body Items
    'joe', 'bonkShirt', 'mistorShirt', 'penguShirt',
    // Mounts
    'penguMount', 'minecraftBoat'
];

userSchema.methods.ownsCosmetic = function(cosmeticId) {
    // 'none' is always available
    if (cosmeticId === 'none') return true;
    
    // Check if this is a promo-exclusive item
    if (PROMO_EXCLUSIVE_IDS.includes(cosmeticId)) {
        // Must be explicitly unlocked via promo code
        return this.unlockedCosmetics.includes(cosmeticId) || 
               this.unlockedMounts.includes(cosmeticId);
    }
    
    // All other cosmetics are FREE (for now)
    // Future: Check against purchased items
    return true;
};

/**
 * Unlock a cosmetic for the user
 */
userSchema.methods.unlockCosmetic = function(cosmeticId, category = 'cosmetic') {
    if (category === 'mount') {
        if (!this.unlockedMounts.includes(cosmeticId)) {
            this.unlockedMounts.push(cosmeticId);
            this.stats.unlocks.totalMountsOwned++;
            return true;
        }
    } else {
        if (!this.unlockedCosmetics.includes(cosmeticId)) {
            this.unlockedCosmetics.push(cosmeticId);
            this.stats.unlocks.totalCosmeticsOwned++;
            return true;
        }
    }
    return false; // Already owned
};

/**
 * Record a game result
 */
userSchema.methods.recordGameResult = function(gameType, won, coinsDelta, isDraw = false) {
    const gameStats = this.gameStats[gameType];
    if (!gameStats) return;

    gameStats.played++;
    this.gameStats.overall.totalGamesPlayed++;

    if (isDraw) {
        gameStats.draws++;
        this.gameStats.overall.totalGamesDrew++;
        gameStats.winStreak = 0;
        gameStats.lossStreak = 0;
    } else if (won) {
        gameStats.wins++;
        gameStats.coinsWon += coinsDelta;
        gameStats.winStreak++;
        gameStats.lossStreak = 0;
        if (gameStats.winStreak > gameStats.bestWinStreak) {
            gameStats.bestWinStreak = gameStats.winStreak;
        }
        this.gameStats.overall.totalGamesWon++;
        this.stats.economy.totalCoinsWonFromWagers += coinsDelta;
    } else {
        gameStats.losses++;
        gameStats.coinsLost += coinsDelta;
        gameStats.lossStreak++;
        gameStats.winStreak = 0;
        if (gameStats.lossStreak > gameStats.worstLossStreak) {
            gameStats.worstLossStreak = gameStats.lossStreak;
        }
        this.gameStats.overall.totalGamesLost++;
        this.stats.economy.totalCoinsLostToWagers += coinsDelta;
    }
};

/**
 * Record blackjack-specific stats (extends recordGameResult)
 * @param {object} details - { result: 'WIN'|'LOSS'|'PUSH'|'BLACKJACK', isPvE, coinsDelta, gotBlackjack, busted }
 */
userSchema.methods.recordBlackjackResult = function(details) {
    const { result, isPvE, coinsDelta, gotBlackjack, busted } = details;
    const bj = this.gameStats.blackjack;
    if (!bj) return;

    bj.played++;
    bj.totalHandsPlayed++;
    this.gameStats.overall.totalGamesPlayed++;

    // Track PvE vs PvP
    if (isPvE) {
        bj.pveGames++;
    } else {
        bj.pvpGames++;
    }

    // Track special outcomes
    if (gotBlackjack) bj.blackjacks++;
    if (busted) bj.busts++;

    // Win/Loss/Push tracking
    if (result === 'PUSH') {
        bj.pushes++;
        bj.winStreak = 0;
        bj.lossStreak = 0;
        this.gameStats.overall.totalGamesDrew++;
    } else if (result === 'WIN' || result === 'BLACKJACK') {
        bj.wins++;
        bj.coinsWon += coinsDelta || 0;
        bj.winStreak++;
        bj.lossStreak = 0;
        if (bj.winStreak > bj.bestWinStreak) {
            bj.bestWinStreak = bj.winStreak;
        }
        if (isPvE) bj.pveWins++;
        else bj.pvpWins++;
        this.gameStats.overall.totalGamesWon++;
        this.stats.economy.totalCoinsWonFromWagers += coinsDelta || 0;
    } else {
        bj.losses++;
        bj.coinsLost += coinsDelta || 0;
        bj.lossStreak++;
        bj.winStreak = 0;
        if (bj.lossStreak > bj.worstLossStreak) {
            bj.worstLossStreak = bj.lossStreak;
        }
        this.gameStats.overall.totalGamesLost++;
        this.stats.economy.totalCoinsLostToWagers += coinsDelta || 0;
    }
};

/**
 * Get public profile (safe to send to other players)
 */
userSchema.methods.getPublicProfile = function() {
    return {
        walletAddress: this.walletAddress,
        username: this.username,
        characterType: this.characterType,
        customization: this.customization,
        gameStats: {
            cardJitsu: { wins: this.gameStats.cardJitsu.wins, losses: this.gameStats.cardJitsu.losses },
            connect4: { wins: this.gameStats.connect4.wins, losses: this.gameStats.connect4.losses },
            ticTacToe: { wins: this.gameStats.ticTacToe.wins, losses: this.gameStats.ticTacToe.losses },
            blackjack: { wins: this.gameStats.blackjack?.wins || 0, losses: this.gameStats.blackjack?.losses || 0, blackjacks: this.gameStats.blackjack?.blackjacks || 0 },
            uno: { wins: this.gameStats.uno?.wins || 0, losses: this.gameStats.uno?.losses || 0 },
            monopoly: { wins: this.gameStats.monopoly?.wins || 0, losses: this.gameStats.monopoly?.losses || 0 },
            overall: this.gameStats.overall
        },
        createdAt: this.createdAt
    };
};

/**
 * Check if user has established their account (entered world at least once)
 * A user is NOT established until they click "Enter World" for the first time
 */
userSchema.methods.isEstablishedUser = function() {
    // Primary check: lastUsernameChangeAt is set when user first enters world
    if (this.lastUsernameChangeAt) {
        return true;
    }
    
    // Fallback checks for legacy/migration users who don't have lastUsernameChangeAt
    // Only consider them established if they have actual gameplay activity
    if (this.stats?.session?.totalSessions > 1) return true; // More than first session
    if (this.gameStats?.overall?.totalGamesPlayed > 0) return true;
    
    // lastLoginAt alone doesn't make them established anymore
    // (we don't set this for new users until they enter world)
    
    // If username is not the default format, they chose it (legacy user)
    if (this.username && !this.username.startsWith('Penguin')) return true;
    
    return false;
};

/**
 * Get full user data (for authenticated user only)
 * This is synchronous - for gacha items, use getFullDataAsync
 */
userSchema.methods.getFullData = function() {
    const isEstablished = this.isEstablishedUser();
    
    return {
        walletAddress: this.walletAddress,
        username: this.username,
        characterType: this.characterType,
        customization: this.customization,
        coins: this.coins,
        pebbles: this.pebbles,
        unlockedCosmetics: this.unlockedCosmetics,
        unlockedMounts: this.unlockedMounts,
        unlockedCharacters: this.unlockedCharacters,
        stamps: this.stamps,
        inventory: this.inventory,
        stats: this.stats,
        gameStats: this.gameStats,
        pebbleStats: this.pebbleStats,
        gachaStats: this.gachaStats,
        settings: this.settings,
        lastRoom: this.lastRoom,
        lastPosition: this.lastPosition,
        createdAt: this.createdAt,
        lastUsernameChangeAt: this.lastUsernameChangeAt,
        canChangeUsername: this.canChangeUsername(),
        isEstablishedUser: isEstablished  // Tells client if user has entered world before
    };
};

/**
 * Get full user data including gacha-owned cosmetic IDs
 * Call this when you need to include owned gacha items
 */
userSchema.methods.getFullDataAsync = async function() {
    const baseData = this.getFullData();
    
    // Fetch gacha-owned cosmetic template IDs
    try {
        const OwnedCosmetic = mongoose.model('OwnedCosmetic');
        const ownedGacha = await OwnedCosmetic.find(
            { ownerId: this.walletAddress, convertedToGold: false },
            'templateId'
        ).lean();
        
        // Get unique template IDs
        const gachaOwnedIds = [...new Set(ownedGacha.map(c => c.templateId))];
        
        return {
            ...baseData,
            gachaOwnedCosmetics: gachaOwnedIds
        };
    } catch (error) {
        console.error('Error fetching gacha-owned cosmetics:', error);
        return {
            ...baseData,
            gachaOwnedCosmetics: []
        };
    }
};

/**
 * Add pebbles with validation
 */
userSchema.methods.addPebbles = function(amount, reason = 'unknown') {
    if (amount < 0 && this.pebbles + amount < 0) {
        return { success: false, error: 'INSUFFICIENT_PEBBLES' };
    }
    
    this.pebbles += amount;
    
    if (amount > 0) {
        this.pebbleStats.totalDeposited += amount;
        this.pebbleStats.lastDepositAt = new Date();
    } else {
        this.pebbleStats.totalSpent += Math.abs(amount);
    }
    
    return { success: true, newBalance: this.pebbles };
};

/**
 * Check if user has enough pebbles
 */
userSchema.methods.hasPebbles = function(amount) {
    return this.pebbles >= amount;
};

/**
 * Check if username can be changed (30 day cooldown)
 */
userSchema.methods.canChangeUsername = function() {
    if (!this.lastUsernameChangeAt) return true;
    
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const timeSinceChange = Date.now() - this.lastUsernameChangeAt.getTime();
    return timeSinceChange >= thirtyDaysMs;
};

/**
 * Get days until username can be changed
 */
userSchema.methods.daysUntilUsernameChange = function() {
    if (!this.lastUsernameChangeAt) return 0;
    
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const timeSinceChange = Date.now() - this.lastUsernameChangeAt.getTime();
    const remaining = thirtyDaysMs - timeSinceChange;
    
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
};

/**
 * Change username (with 30 day limit)
 */
userSchema.methods.changeUsername = async function(newUsername) {
    // Check cooldown
    if (!this.canChangeUsername()) {
        const daysLeft = this.daysUntilUsernameChange();
        return { 
            success: false, 
            error: 'USERNAME_COOLDOWN', 
            message: `You can change your username in ${daysLeft} days` 
        };
    }
    
    // Validate length
    if (newUsername.length < 3 || newUsername.length > 20) {
        return { 
            success: false, 
            error: 'INVALID_LENGTH', 
            message: 'Username must be 3-20 characters' 
        };
    }
    
    // Check if username is taken
    const existing = await mongoose.model('User').findOne({ 
        username: newUsername,
        _id: { $ne: this._id }
    });
    
    if (existing) {
        return { 
            success: false, 
            error: 'USERNAME_TAKEN', 
            message: 'This username is already taken' 
        };
    }
    
    // Save to history
    this.usernameHistory.push({
        previousName: this.username,
        changedAt: new Date()
    });
    
    // Update username
    const oldUsername = this.username;
    this.username = newUsername;
    this.lastUsernameChangeAt = new Date();
    
    return { 
        success: true, 
        oldUsername, 
        newUsername 
    };
};

/**
 * Update customization
 */
userSchema.methods.updateCustomization = function(customization) {
    if (customization.skin) this.customization.skin = customization.skin;
    if (customization.hat) this.customization.hat = customization.hat;
    if (customization.eyes) this.customization.eyes = customization.eyes;
    if (customization.mouth) this.customization.mouth = customization.mouth;
    if (customization.bodyItem) this.customization.bodyItem = customization.bodyItem;
    if (customization.mount) this.customization.mount = customization.mount;
    if (customization.characterType) this.characterType = customization.characterType;
    // Doginal freestyle colors
    if (customization.dogPrimaryColor) this.customization.dogPrimaryColor = customization.dogPrimaryColor;
    if (customization.dogSecondaryColor) this.customization.dogSecondaryColor = customization.dogSecondaryColor;
    return true;
};

// ==================== INVENTORY METHODS ====================

/**
 * Get current inventory count (non-burned, tradable items only)
 * Promo items (tradable=false) don't count towards inventory limit
 */
userSchema.methods.getInventoryCount = async function() {
    const OwnedCosmetic = mongoose.model('OwnedCosmetic');
    return await OwnedCosmetic.countDocuments({ 
        ownerId: this.walletAddress, 
        convertedToGold: false,
        tradable: { $ne: false }  // Exclude promo items from count
    });
};

/**
 * Check if user has space for more items
 */
userSchema.methods.hasInventorySpace = async function() {
    const count = await this.getInventoryCount();
    return count < this.maxInventorySlots;
};

/**
 * Get remaining inventory slots
 */
userSchema.methods.getRemainingSlots = async function() {
    const count = await this.getInventoryCount();
    return Math.max(0, this.maxInventorySlots - count);
};

/**
 * Upgrade inventory slots (costs gold)
 * @returns {object} - { success, newMaxSlots, goldSpent, error }
 */
userSchema.methods.upgradeInventory = async function() {
    const UPGRADE_COST = 5000;      // Gold per upgrade
    const SLOTS_PER_UPGRADE = 50;   // Slots gained per upgrade
    const MAX_UPGRADES = 10;        // Max 150 + (10 * 50) = 650 slots
    
    if (this.inventoryUpgrades >= MAX_UPGRADES) {
        return { success: false, error: 'MAX_UPGRADES_REACHED', message: 'Already at maximum inventory size (650 slots)' };
    }
    
    if (this.coins < UPGRADE_COST) {
        return { success: false, error: 'INSUFFICIENT_GOLD', message: `Need ${UPGRADE_COST} gold (have ${this.coins})` };
    }
    
    // Deduct gold
    this.coins -= UPGRADE_COST;
    this.stats.economy.totalCoinsSpent += UPGRADE_COST;
    
    // Add slots
    this.inventoryUpgrades += 1;
    this.maxInventorySlots = 150 + (this.inventoryUpgrades * SLOTS_PER_UPGRADE);
    
    await this.save();
    
    return { 
        success: true, 
        newMaxSlots: this.maxInventorySlots, 
        upgradeLevel: this.inventoryUpgrades,
        goldSpent: UPGRADE_COST,
        newCoins: this.coins
    };
};

/**
 * Get inventory upgrade info
 */
userSchema.methods.getInventoryUpgradeInfo = function() {
    const UPGRADE_COST = 5000;
    const SLOTS_PER_UPGRADE = 50;
    const MAX_UPGRADES = 10;
    
    return {
        currentSlots: this.maxInventorySlots,
        upgradeLevel: this.inventoryUpgrades,
        maxUpgradeLevel: MAX_UPGRADES,
        canUpgrade: this.inventoryUpgrades < MAX_UPGRADES,
        upgradeCost: UPGRADE_COST,
        slotsPerUpgrade: SLOTS_PER_UPGRADE,
        nextSlots: this.inventoryUpgrades < MAX_UPGRADES 
            ? this.maxInventorySlots + SLOTS_PER_UPGRADE 
            : this.maxInventorySlots
    };
};

const User = mongoose.model('User', userSchema);

export default User;

