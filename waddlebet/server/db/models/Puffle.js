/**
 * Puffle Model - Player-owned pet companions
 * Tracks puffle stats, ownership, and state
 */

import mongoose from 'mongoose';

// Puffle pricing tiers (matches Puffle.js)
const PUFFLE_TIERS = {
    common: ['blue', 'red', 'green'],           // 50 coins
    uncommon: ['pink', 'yellow', 'orange'],     // 100 coins
    rare: ['purple', 'white', 'brown'],         // 200 coins
    epic: ['black', 'gold'],                    // 500 coins
    legendary: ['rainbow', 'ghost'],            // 1000 coins
    mythic: ['barkingDog', 'babyShrimp', 'babyDuck', 'babyPenguin']  // 2000 coins
};

const PUFFLE_PRICES = {
    blue: 50, red: 50, green: 50,
    pink: 100, yellow: 100, orange: 100,
    purple: 200, white: 200, brown: 200,
    black: 500, gold: 500,
    rainbow: 1000, ghost: 1000,
    barkingDog: 2000, babyShrimp: 2000, babyDuck: 2000, babyPenguin: 2000
};

// Food definitions (matches Puffle.js)
const PUFFLE_FOOD = {
    cookie: { name: 'Puffle Cookie', hungerReduction: 20, happinessBoost: 5, price: 10 },
    fish: { name: 'Puffle Fish', hungerReduction: 35, happinessBoost: 10, price: 25 },
    cake: { name: 'Puffle Cake', hungerReduction: 50, happinessBoost: 20, price: 50 },
    gourmet: { name: 'Gourmet Meal', hungerReduction: 80, happinessBoost: 30, price: 100 },
    energyDrink: { name: 'Energy Drink', hungerReduction: 10, happinessBoost: 5, energyBoost: 40, price: 75 }
};

// Toy definitions
const PUFFLE_TOYS = {
    ball: { name: 'Ball', happinessBoost: 15, energyCost: 15, price: 25 },
    frisbee: { name: 'Frisbee', happinessBoost: 20, energyCost: 20, price: 50 },
    trampoline: { name: 'Trampoline', happinessBoost: 25, energyCost: 25, price: 100 },
    puzzleBox: { name: 'Puzzle Box', happinessBoost: 30, energyCost: 10, price: 150 },
    tennisBall: { name: 'Tennis Ball', happinessBoost: 18, energyCost: 18, price: 40 }
};

// Trick definitions
const PUFFLE_TRICKS = {
    spin: { playsRequired: 5 },
    jump: { playsRequired: 10 },
    backflip: { playsRequired: 25 },
    dance: { playsRequired: 50 },
    juggle: { playsRequired: 100 },
    firework: { playsRequired: 200 }
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
        default: 'Puffle',
        maxlength: 20
    },
    color: {
        type: String,
        required: true,
        enum: Object.keys(PUFFLE_PRICES)
    },
    
    // ========== CORE STATS (0-100) ==========
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
    
    // ========== LEVELING ==========
    level: {
        type: Number,
        default: 1,
        min: 1
    },
    experience: {
        type: Number,
        default: 0,
        min: 0
    },
    xpForNextLevel: {
        type: Number,
        default: 100
    },
    
    // ========== TRAINING STATS (Duck Life style, 0-999) ==========
    trainingStats: {
        running: { type: Number, default: 10, min: 0, max: 999 },
        swimming: { type: Number, default: 10, min: 0, max: 999 },
        flying: { type: Number, default: 10, min: 0, max: 999 },
        climbing: { type: Number, default: 10, min: 0, max: 999 }
    },
    
    // ========== TRICKS & PLAYS ==========
    totalPlays: {
        type: Number,
        default: 0
    },
    unlockedTricks: [{
        type: String,
        enum: Object.keys(PUFFLE_TRICKS)
    }],
    
    // ========== INVENTORY ==========
    foodInventory: {
        cookie: { type: Number, default: 0 },
        fish: { type: Number, default: 0 },
        cake: { type: Number, default: 0 },
        gourmet: { type: Number, default: 0 },
        energyDrink: { type: Number, default: 0 }
    },
    
    ownedToys: [{
        type: String,
        enum: Object.keys(PUFFLE_TOYS)
    }],
    equippedToy: {
        type: String,
        default: null
    },
    
    // ========== ACCESSORIES ==========
    equippedAccessories: {
        hat: { type: String, default: 'none' },
        glasses: { type: String, default: 'none' },
        neckwear: { type: String, default: 'none' }
    },
    ownedAccessories: {
        hats: [{ type: String }],
        glasses: [{ type: String }],
        neckwear: [{ type: String }]
    },
    
    // ========== RACING STATS ==========
    racingStats: {
        totalRaces: { type: Number, default: 0 },
        wins: { type: Number, default: 0 },
        bestTime: { type: Number, default: null },
        trophies: { type: Number, default: 0 }
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
    mood: {
        type: String,
        default: 'happy'
    },
    
    // ========== REST STATE ==========
    // Rest takes 6 hours for full energy restoration
    // Energy restores at ~16.67% per hour
    // Hunger increases and happiness decreases slowly while resting
    isSleeping: {
        type: Boolean,
        default: false
    },
    sleepStartTime: {
        type: Date,
        default: null
    },
    sleepDuration: {
        type: Number,
        default: 0
    },
    sleepStartEnergy: {
        type: Number,
        default: 0
    },
    sleepStartHunger: {
        type: Number,
        default: 0
    },
    sleepStartHappiness: {
        type: Number,
        default: 0
    },
    
    // ========== NEGLECT / RUNAWAY ==========
    neglectStartTime: {
        type: Date,
        default: null
    },
    neglectProtectionHours: {
        type: Number,
        default: 12 // Default 12 hours grace period
    },
    hasRunAway: {
        type: Boolean,
        default: false
    },
    
    // ========== CARE ITEMS OWNED ==========
    ownedCareItems: {
        safetyNet24h: { type: Number, default: 0 },
        safetyNet48h: { type: Number, default: 0 },
        sleepingBag: { type: Number, default: 0 },
        energyPillow: { type: Number, default: 0 }
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
 * Feed the puffle with specific food type
 */
puffleSchema.methods.feed = function(foodType = 'cookie') {
    const food = PUFFLE_FOOD[foodType] || PUFFLE_FOOD.cookie;
    
    this.hunger = Math.max(0, this.hunger - food.hungerReduction);
    this.happiness = Math.min(100, this.happiness + food.happinessBoost);
    if (food.energyBoost) {
        this.energy = Math.min(100, this.energy + food.energyBoost);
    }
    this.lastFed = new Date();
    this.updateMood();
    
    return { 
        hunger: this.hunger, 
        happiness: this.happiness, 
        energy: this.energy,
        foodUsed: foodType 
    };
};

/**
 * Use food from inventory
 */
puffleSchema.methods.useFood = function(foodType) {
    if (!this.foodInventory[foodType] || this.foodInventory[foodType] <= 0) {
        return { success: false, error: 'NO_FOOD' };
    }
    this.foodInventory[foodType]--;
    const result = this.feed(foodType);
    return { success: true, ...result };
};

/**
 * Add food to inventory
 */
puffleSchema.methods.addFood = function(foodType, quantity = 1) {
    if (!PUFFLE_FOOD[foodType]) return { success: false, error: 'INVALID_FOOD' };
    this.foodInventory[foodType] = (this.foodInventory[foodType] || 0) + quantity;
    return { success: true, newCount: this.foodInventory[foodType] };
};

/**
 * Play with the puffle (optionally with a toy)
 */
puffleSchema.methods.play = function(toyType = null) {
    if (this.energy < 20) {
        return { success: false, error: 'TOO_TIRED' };
    }
    
    const toy = toyType && this.ownedToys.includes(toyType) ? PUFFLE_TOYS[toyType] : null;
    const happinessGain = toy ? toy.happinessBoost : 15;
    const energyCost = toy ? toy.energyCost : 15;
    
    this.energy = Math.max(0, this.energy - energyCost);
    this.happiness = Math.min(100, this.happiness + happinessGain);
    this.hunger = Math.min(100, this.hunger + 8);
    this.totalPlays++;
    this.lastPlayed = new Date();
    
    // Check for new tricks unlocked
    const newTricks = [];
    for (const [trickId, trick] of Object.entries(PUFFLE_TRICKS)) {
        if (this.totalPlays >= trick.playsRequired && !this.unlockedTricks.includes(trickId)) {
            this.unlockedTricks.push(trickId);
            newTricks.push(trickId);
        }
    }
    
    // Add XP
    const xpGain = toy ? 15 : 10;
    this.addExperience(xpGain);
    
    this.updateMood();
    
    return { 
        success: true, 
        energy: this.energy, 
        happiness: this.happiness, 
        hunger: this.hunger,
        totalPlays: this.totalPlays,
        newTricksUnlocked: newTricks,
        toyUsed: toyType,
        xpGained: xpGain
    };
};

/**
 * Add experience and handle level ups
 */
puffleSchema.methods.addExperience = function(amount) {
    this.experience += amount;
    
    while (this.experience >= this.xpForNextLevel) {
        this.experience -= this.xpForNextLevel;
        this.level++;
        this.xpForNextLevel = Math.floor(this.xpForNextLevel * 1.2);
    }
    
    return { level: this.level, experience: this.experience, xpForNextLevel: this.xpForNextLevel };
};

/**
 * Train a specific stat
 */
puffleSchema.methods.train = function(stat, xpGain) {
    if (!this.trainingStats[stat] && this.trainingStats[stat] !== 0) {
        return { success: false, error: 'INVALID_STAT' };
    }
    if (this.energy < 15) {
        return { success: false, error: 'TOO_TIRED' };
    }
    
    this.trainingStats[stat] = Math.min(999, this.trainingStats[stat] + xpGain);
    this.energy = Math.max(0, this.energy - 15);
    this.addExperience(xpGain);
    this.updateMood();
    
    return { 
        success: true, 
        stat, 
        newValue: this.trainingStats[stat],
        energy: this.energy
    };
};

// ========== REST CONFIG ==========
const REST_CONFIG = {
    fullRestHours: 6, // 6 hours for 0% → 100% energy
    energyPerHour: 100 / 6, // ~16.67% per hour
    hungerIncreasePerHour: 5, // Hunger slowly increases while resting
    happinessDecreasePerHour: 3, // Happiness slowly decreases while resting
};

/**
 * Start resting - puffle must be unequipped
 * Takes 6 hours for full energy restoration (0% → 100%)
 */
puffleSchema.methods.startRest = function() {
    if (this.isSleeping) {
        return { success: false, error: 'ALREADY_RESTING' };
    }
    
    const energyNeeded = 100 - this.energy;
    const hoursNeeded = energyNeeded / REST_CONFIG.energyPerHour;
    const msNeeded = hoursNeeded * 60 * 60 * 1000;
    
    this.isSleeping = true;
    this.sleepStartTime = new Date();
    this.sleepDuration = msNeeded;
    this.sleepStartEnergy = this.energy;
    this.sleepStartHunger = this.hunger;
    this.sleepStartHappiness = this.happiness;
    
    return { 
        success: true,
        startEnergy: this.energy,
        hoursToFullRest: hoursNeeded,
        estimatedWakeTime: new Date(Date.now() + msNeeded)
    };
};

/**
 * Get current rest status
 */
puffleSchema.methods.getRestStatus = function() {
    if (!this.isSleeping) {
        return { isResting: false };
    }
    
    const now = Date.now();
    const elapsed = now - new Date(this.sleepStartTime).getTime();
    const elapsedHours = elapsed / (60 * 60 * 1000);
    
    // Calculate current stats based on time elapsed
    const energyGained = elapsedHours * REST_CONFIG.energyPerHour;
    const hungerIncrease = elapsedHours * REST_CONFIG.hungerIncreasePerHour;
    const happinessDecrease = elapsedHours * REST_CONFIG.happinessDecreasePerHour;
    
    const currentEnergy = Math.min(100, this.sleepStartEnergy + energyGained);
    const currentHunger = Math.min(100, this.sleepStartHunger + hungerIncrease);
    const currentHappiness = Math.max(0, this.sleepStartHappiness - happinessDecrease);
    
    const isComplete = currentEnergy >= 100;
    const remaining = Math.max(0, this.sleepDuration - elapsed);
    const remainingHours = remaining / (60 * 60 * 1000);
    const progress = Math.min(1, currentEnergy / 100);
    
    return {
        isResting: true,
        progress,
        currentEnergy: Math.round(currentEnergy),
        currentHunger: Math.round(currentHunger),
        currentHappiness: Math.round(currentHappiness),
        elapsedHours: elapsedHours.toFixed(2),
        remainingHours: remainingHours.toFixed(2),
        remainingMs: remaining,
        isComplete
    };
};

/**
 * Stop resting and apply accumulated stats
 */
puffleSchema.methods.stopRest = function() {
    if (!this.isSleeping) {
        return { success: false, error: 'NOT_RESTING' };
    }
    
    // Get final stats
    const status = this.getRestStatus();
    
    // Apply the stats
    this.energy = status.currentEnergy;
    this.hunger = status.currentHunger;
    this.happiness = status.currentHappiness;
    
    // Clear rest state
    this.isSleeping = false;
    this.sleepStartTime = null;
    this.sleepDuration = 0;
    this.sleepStartEnergy = 0;
    this.sleepStartHunger = 0;
    this.sleepStartHappiness = 0;
    
    this.updateMood();
    
    return {
        success: true,
        finalEnergy: this.energy,
        finalHunger: this.hunger,
        finalHappiness: this.happiness,
        wasComplete: status.isComplete
    };
};

/**
 * Legacy rest method - starts resting
 */
puffleSchema.methods.rest = function() {
    return this.startRest();
    this.updateMood();
    return { energy: this.energy };
};

/**
 * Add a toy to owned toys
 */
puffleSchema.methods.addToy = function(toyType) {
    if (!PUFFLE_TOYS[toyType]) return { success: false, error: 'INVALID_TOY' };
    if (this.ownedToys.includes(toyType)) return { success: false, error: 'ALREADY_OWNED' };
    this.ownedToys.push(toyType);
    return { success: true };
};

/**
 * Equip/unequip toy
 */
puffleSchema.methods.equipToy = function(toyType) {
    if (toyType && !this.ownedToys.includes(toyType)) return { success: false, error: 'NOT_OWNED' };
    this.equippedToy = toyType || null;
    return { success: true };
};

/**
 * Add an accessory to owned
 */
puffleSchema.methods.addAccessory = function(category, itemId) {
    const categoryMap = { hat: 'hats', glasses: 'glasses', neckwear: 'neckwear' };
    const arrayKey = categoryMap[category] || category;
    if (!this.ownedAccessories[arrayKey]) this.ownedAccessories[arrayKey] = [];
    if (this.ownedAccessories[arrayKey].includes(itemId)) return { success: false, error: 'ALREADY_OWNED' };
    this.ownedAccessories[arrayKey].push(itemId);
    return { success: true };
};

/**
 * Equip accessory
 */
puffleSchema.methods.equipAccessory = function(category, itemId) {
    if (!this.equippedAccessories[category] && this.equippedAccessories[category] !== '') {
        return { success: false, error: 'INVALID_CATEGORY' };
    }
    this.equippedAccessories[category] = itemId || 'none';
    return { success: true };
};

/**
 * Update mood based on stats
 */
puffleSchema.methods.updateMood = function() {
    const { happiness, energy, hunger } = this;
    
    if (hunger > 80) this.mood = 'hungry';
    else if (energy < 20) this.mood = 'tired';
    else if (happiness > 80) this.mood = 'excited';
    else if (happiness > 60) this.mood = 'happy';
    else if (happiness > 40) this.mood = 'content';
    else if (happiness > 20) this.mood = 'sad';
    else this.mood = 'grumpy';
    
    return this.mood;
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
        adoptedAt: this.adoptedAt,
        // Leveling
        level: this.level,
        experience: this.experience,
        xpForNextLevel: this.xpForNextLevel,
        // Training
        trainingStats: this.trainingStats,
        totalPlays: this.totalPlays,
        unlockedTricks: this.unlockedTricks || [],
        // Inventory
        foodInventory: this.foodInventory,
        ownedToys: this.ownedToys || [],
        equippedToy: this.equippedToy,
        ownedCareItems: this.ownedCareItems,
        // Accessories
        equippedAccessories: this.equippedAccessories,
        ownedAccessories: this.ownedAccessories,
        // Racing
        racingStats: this.racingStats,
        // State
        mood: this.mood,
        // Rest state
        isSleeping: this.isSleeping,
        sleepStartTime: this.sleepStartTime,
        sleepDuration: this.sleepDuration,
        sleepStartEnergy: this.sleepStartEnergy,
        sleepStartHunger: this.sleepStartHunger,
        sleepStartHappiness: this.sleepStartHappiness,
        restStatus: this.isSleeping ? this.getRestStatus() : null,
        // Neglect state
        neglectStartTime: this.neglectStartTime,
        neglectProtectionHours: this.neglectProtectionHours,
        hasRunAway: this.hasRunAway
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
 * Get food info
 */
puffleSchema.statics.getFoodInfo = function(foodType) {
    return PUFFLE_FOOD[foodType] || null;
};

/**
 * Get toy info
 */
puffleSchema.statics.getToyInfo = function(toyType) {
    return PUFFLE_TOYS[toyType] || null;
};

/**
 * Get food price
 */
puffleSchema.statics.getFoodPrice = function(foodType) {
    return PUFFLE_FOOD[foodType]?.price || 0;
};

/**
 * Get toy price
 */
puffleSchema.statics.getToyPrice = function(toyType) {
    return PUFFLE_TOYS[toyType]?.price || 0;
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

const Puffle = mongoose.model('Puffle', puffleSchema);

export { PUFFLE_PRICES, PUFFLE_TIERS, PUFFLE_FOOD, PUFFLE_TOYS, PUFFLE_TRICKS };
export default Puffle;





