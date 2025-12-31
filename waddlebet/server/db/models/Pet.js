/**
 * Pet Model - Player-owned pet companions
 * Tracks puffle stats, ownership, and state
 */

import mongoose from 'mongoose';

// Pet pricing tiers (matches Pet.js)
const PUFFLE_TIERS = {
    common: ['blue', 'red', 'green'],           // 50 coins
    uncommon: ['pink', 'yellow', 'orange'],     // 100 coins
    rare: ['purple', 'white', 'brown'],         // 200 coins
    epic: ['black', 'gold'],                    // 500 coins
    legendary: ['rainbow', 'ghost']             // 1000 coins
};

const PUFFLE_PRICES = {
    blue: 50, red: 50, green: 50,
    pink: 100, yellow: 100, orange: 100,
    purple: 200, white: 200, brown: 200,
    black: 500, gold: 500,
    rainbow: 1000, ghost: 1000
};

const puffleSchema = new mongoose.Schema({
    puffleId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    ownerWallet: {
        type: String,
        required: true,
        index: true
    },
    
    // ========== APPEARANCE ==========
    name: {
        type: String,
        default: 'Pet',
        maxlength: 20
    },
    color: {
        type: String,
        required: true,
        enum: Object.keys(PUFFLE_PRICES)
    },
    
    // ========== STATS (0-100) ==========
    happiness: {
        type: Number,
        default: 80,
        min: 0,
        max: 100
    },
    energy: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    hunger: {
        type: Number,
        default: 20,
        min: 0,
        max: 100
    },
    
    // ========== TIMESTAMPS ==========
    lastFed: {
        type: Date,
        default: Date.now
    },
    lastPlayed: {
        type: Date,
        default: Date.now
    },
    lastStatUpdate: {
        type: Date,
        default: Date.now
    },
    
    // ========== POSITION ==========
    lastPosition: {
        x: { type: Number, default: 0 },
        y: { type: Number, default: 0 },
        z: { type: Number, default: 0 }
    },
    
    // ========== STATE ==========
    isActive: {
        type: Boolean,
        default: false,
        index: true
    },
    
    adoptedAt: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

// ==================== INDEXES ====================
puffleSchema.index({ ownerWallet: 1, isActive: 1 });

// ==================== METHODS ====================

/**
 * Feed the puffle
 */
puffleSchema.methods.feed = function() {
    this.hunger = Math.max(0, this.hunger - 30);
    this.happiness = Math.min(100, this.happiness + 10);
    this.lastFed = new Date();
    return { hunger: this.hunger, happiness: this.happiness };
};

/**
 * Play with the puffle
 */
puffleSchema.methods.play = function() {
    if (this.energy < 20) {
        return { success: false, error: 'TOO_TIRED' };
    }
    
    this.energy = Math.max(0, this.energy - 20);
    this.happiness = Math.min(100, this.happiness + 20);
    this.hunger = Math.min(100, this.hunger + 10);
    this.lastPlayed = new Date();
    
    return { 
        success: true, 
        energy: this.energy, 
        happiness: this.happiness, 
        hunger: this.hunger 
    };
};

/**
 * Rest the puffle
 */
puffleSchema.methods.rest = function() {
    this.energy = Math.min(100, this.energy + 50);
    return { energy: this.energy };
};

/**
 * Update stats based on time passed (decay)
 */
puffleSchema.methods.updateStats = function() {
    const now = Date.now();
    const hoursPassed = (now - this.lastStatUpdate.getTime()) / (1000 * 60 * 60);
    
    // Decay rates per hour
    this.hunger = Math.min(100, this.hunger + hoursPassed * 5);
    this.energy = Math.max(0, this.energy - hoursPassed * 2);
    
    // Happiness affected by hunger and energy
    if (this.hunger > 70) {
        this.happiness = Math.max(0, this.happiness - hoursPassed * 3);
    }
    if (this.energy < 30) {
        this.happiness = Math.max(0, this.happiness - hoursPassed * 2);
    }
    
    this.lastStatUpdate = new Date();
    return this;
};

/**
 * Get tier based on color
 */
puffleSchema.methods.getTier = function() {
    for (const [tier, colors] of Object.entries(PUFFLE_TIERS)) {
        if (colors.includes(this.color)) return tier;
    }
    return 'common';
};

/**
 * Get puffle data for client
 */
puffleSchema.methods.toClientData = function() {
    return {
        id: this.puffleId,
        name: this.name,
        color: this.color,
        happiness: this.happiness,
        energy: this.energy,
        hunger: this.hunger,
        isActive: this.isActive,
        tier: this.getTier(),
        adoptedAt: this.adoptedAt
    };
};

// ==================== STATICS ====================

/**
 * Find all puffles for an owner
 */
puffleSchema.statics.findByOwner = function(walletAddress) {
    return this.find({ ownerWallet: walletAddress });
};

/**
 * Find active puffle for an owner
 */
puffleSchema.statics.findActiveForOwner = function(walletAddress) {
    return this.findOne({ ownerWallet: walletAddress, isActive: true });
};

/**
 * Get puffle price
 */
puffleSchema.statics.getPrice = function(color) {
    return PUFFLE_PRICES[color] || 50;
};

/**
 * Deactivate all puffles for owner (before activating a new one)
 */
puffleSchema.statics.deactivateAllForOwner = function(walletAddress) {
    return this.updateMany(
        { ownerWallet: walletAddress },
        { isActive: false }
    );
};

const Pet = mongoose.model('Pet', puffleSchema);

export { PUFFLE_PRICES, PUFFLE_TIERS };
export default Pet;





