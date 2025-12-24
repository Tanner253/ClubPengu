/**
 * PromoCode Model - Admin-defined promotional codes
 * SECURITY CRITICAL - Server only, never expose code list to client
 */

import mongoose from 'mongoose';

const promoCodeSchema = new mongoose.Schema({
    // ========== CODE DEFINITION ==========
    code: {
        type: String,
        required: true,
        uppercase: true,  // Store all codes uppercase
        trim: true
        // Note: unique + case-insensitive index defined below with collation
    },
    
    // Display info
    name: {
        type: String,
        required: true
    },
    description: String,
    
    // ========== WHAT IT UNLOCKS ==========
    unlocks: {
        // Mounts (e.g., ['penguMount', 'minecraftBoat'])
        mounts: {
            type: [String],
            default: []
        },
        // Cosmetics with categories for auto-equip
        // Format: [{ id: 'bonkShirt', category: 'bodyItem' }]
        cosmetics: {
            type: [{
                id: { type: String, required: true },
                category: { 
                    type: String, 
                    enum: ['hat', 'eyes', 'mouth', 'bodyItem'],
                    required: true 
                }
            }],
            default: []
        },
        // Character types (e.g., ['marcus'])
        characters: {
            type: [String],
            default: []
        },
        // Skin color to set (optional, for themed sets)
        skinColor: {
            type: String,
            default: null
        },
        // Bonus coins
        coins: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // ========== LIMITS ==========
    maxRedemptions: {
        type: Number,
        default: null  // null = unlimited
    },
    redemptionCount: {
        type: Number,
        default: 0
    },
    singleUsePerWallet: {
        type: Boolean,
        default: true  // Each wallet can only redeem once
    },
    
    // ========== AVAILABILITY ==========
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    validFrom: {
        type: Date,
        default: null  // null = immediately valid
    },
    validUntil: {
        type: Date,
        default: null  // null = never expires
    },
    
    // ========== RESTRICTIONS ==========
    // Optional: Only allow certain wallets (whitelist)
    allowedWallets: {
        type: [String],
        default: []  // Empty = no restriction
    },
    // Optional: Minimum games played to redeem
    minGamesPlayed: {
        type: Number,
        default: 0
    },
    
    // ========== METADATA ==========
    createdBy: String,  // Admin wallet who created
    notes: String       // Internal notes

}, {
    timestamps: true
});

// ==================== INDEXES ====================
promoCodeSchema.index({ isActive: 1, validUntil: 1 });
promoCodeSchema.index({ code: 1 }, { 
    unique: true,
    collation: { locale: 'en', strength: 2 }  // Case-insensitive
});

// ==================== METHODS ====================

/**
 * Check if this promo code is currently valid
 */
promoCodeSchema.methods.isValid = function() {
    if (!this.isActive) return { valid: false, error: 'CODE_INACTIVE' };
    
    const now = new Date();
    
    // Check date range
    if (this.validFrom && now < this.validFrom) {
        return { valid: false, error: 'CODE_NOT_YET_VALID' };
    }
    if (this.validUntil && now > this.validUntil) {
        return { valid: false, error: 'CODE_EXPIRED' };
    }
    
    // Check max redemptions
    if (this.maxRedemptions !== null && this.redemptionCount >= this.maxRedemptions) {
        return { valid: false, error: 'CODE_MAX_REDEMPTIONS' };
    }
    
    return { valid: true };
};

/**
 * Check if a specific wallet can redeem this code
 */
promoCodeSchema.methods.canWalletRedeem = function(walletAddress, user, hasRedeemed) {
    // Check if already redeemed by this wallet
    if (this.singleUsePerWallet && hasRedeemed) {
        return { canRedeem: false, error: 'ALREADY_REDEEMED' };
    }
    
    // Check whitelist
    if (this.allowedWallets.length > 0 && !this.allowedWallets.includes(walletAddress)) {
        return { canRedeem: false, error: 'WALLET_NOT_ALLOWED' };
    }
    
    // Check minimum games
    if (this.minGamesPlayed > 0 && user) {
        const gamesPlayed = user.gameStats?.overall?.totalGamesPlayed || 0;
        if (gamesPlayed < this.minGamesPlayed) {
            return { 
                canRedeem: false, 
                error: 'MIN_GAMES_NOT_MET',
                required: this.minGamesPlayed,
                current: gamesPlayed
            };
        }
    }
    
    return { canRedeem: true };
};

/**
 * Get what this code unlocks (safe to send to client after redemption)
 */
promoCodeSchema.methods.getUnlocksSummary = function() {
    const items = [];
    
    if (this.unlocks.mounts.length > 0) {
        items.push(`${this.unlocks.mounts.length} mount(s)`);
    }
    if (this.unlocks.cosmetics.length > 0) {
        items.push(`${this.unlocks.cosmetics.length} cosmetic(s)`);
    }
    if (this.unlocks.characters.length > 0) {
        items.push(`${this.unlocks.characters.length} character(s)`);
    }
    if (this.unlocks.coins > 0) {
        items.push(`${this.unlocks.coins} coins`);
    }
    
    return items.join(', ') || 'nothing';
};

// ==================== STATICS ====================

/**
 * Find a promo code by code string (case-insensitive)
 */
promoCodeSchema.statics.findByCode = function(code) {
    return this.findOne({ 
        code: code.toUpperCase().trim() 
    });
};

/**
 * Get all active promo codes (admin only)
 */
promoCodeSchema.statics.getActiveCodes = function() {
    const now = new Date();
    return this.find({
        isActive: true,
        $or: [
            { validUntil: null },
            { validUntil: { $gt: now } }
        ]
    }).sort({ createdAt: -1 });
};

/**
 * Create a new promo code (admin function)
 */
promoCodeSchema.statics.createCode = async function(data) {
    const code = new this({
        code: data.code.toUpperCase().trim(),
        name: data.name,
        description: data.description,
        unlocks: {
            mounts: data.mounts || [],
            cosmetics: data.cosmetics || [],  // Array of { id, category }
            characters: data.characters || [],
            skinColor: data.skinColor || null,
            coins: data.coins || 0
        },
        maxRedemptions: data.maxRedemptions || null,
        singleUsePerWallet: data.singleUsePerWallet !== false,
        validFrom: data.validFrom || null,
        validUntil: data.validUntil || null,
        allowedWallets: data.allowedWallets || [],
        minGamesPlayed: data.minGamesPlayed || 0,
        createdBy: data.createdBy,
        notes: data.notes
    });
    
    return code.save();
};

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

export default PromoCode;

