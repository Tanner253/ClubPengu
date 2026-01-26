/**
 * Puffle - Pet companion class
 * Duck Life style training system with tricks, accessories, and racing stats
 */
class Puffle {
    // Puffle colors with tiered pricing (cheapest = 50, scaling up for rarer colors)
    static COLORS = {
        // Common tier - $50
        blue: { hex: '#0055FF', name: 'Blue', personality: 'Playful', price: 50, tier: 'common' },
        red: { hex: '#FF2222', name: 'Red', personality: 'Adventurous', price: 50, tier: 'common' },
        green: { hex: '#22CC44', name: 'Green', personality: 'Energetic', price: 50, tier: 'common' },
        
        // Uncommon tier - $100
        pink: { hex: '#FF69B4', name: 'Pink', personality: 'Friendly', price: 100, tier: 'uncommon' },
        yellow: { hex: '#FFDD00', name: 'Yellow', personality: 'Creative', price: 100, tier: 'uncommon' },
        orange: { hex: '#FF8800', name: 'Orange', personality: 'Silly', price: 100, tier: 'uncommon' },
        
        // Rare tier - $200
        purple: { hex: '#9944FF', name: 'Purple', personality: 'Fashionable', price: 200, tier: 'rare' },
        white: { hex: '#EEEEEE', name: 'White', personality: 'Calm', price: 200, tier: 'rare' },
        brown: { hex: '#8B4513', name: 'Brown', personality: 'Tough', price: 200, tier: 'rare' },
        
        // Epic tier - $500
        black: { hex: '#222222', name: 'Black', personality: 'Mysterious', price: 500, tier: 'epic' },
        gold: { hex: '#FFD700', name: 'Gold', personality: 'Glamorous', price: 500, tier: 'epic' },
        
        // Legendary tier - $1000 (special effects)
        rainbow: { hex: '#FF0000', name: 'Rainbow', personality: 'Magical', price: 1000, tier: 'legendary', special: 'rainbow' },
        ghost: { hex: '#AADDFF', name: 'Ghost', personality: 'Spooky', price: 1000, tier: 'legendary', special: 'glow' }
    };
    
    static TIER_COLORS = {
        common: '#888888',
        uncommon: '#44CC44',
        rare: '#4488FF',
        epic: '#AA44FF',
        legendary: '#FFAA00'
    };
    
    // Available puffle food
    static FOOD = {
        cookie: { name: 'Puffle Cookie', hungerReduction: 20, happinessBoost: 5, price: 10, emoji: '🍪' },
        fish: { name: 'Puffle Fish', hungerReduction: 35, happinessBoost: 10, price: 25, emoji: '🐟' },
        cake: { name: 'Puffle Cake', hungerReduction: 50, happinessBoost: 20, price: 50, emoji: '🎂' },
        gourmet: { name: 'Gourmet Meal', hungerReduction: 80, happinessBoost: 30, price: 100, emoji: '🍽️' },
        energyDrink: { name: 'Energy Drink', hungerReduction: 10, happinessBoost: 5, energyBoost: 40, price: 75, emoji: '⚡' }
    };
    
    // Special care items (neglect protection, etc.)
    static CARE_ITEMS = {
        safetyNet24h: { 
            name: 'Safety Net (24h)', 
            description: 'Extends neglect protection to 24 hours', 
            protectionHours: 24, 
            price: 150, 
            emoji: '🛡️' 
        },
        safetyNet48h: { 
            name: 'Safety Net (48h)', 
            description: 'Extends neglect protection to 48 hours', 
            protectionHours: 48, 
            price: 250, 
            emoji: '🛡️🛡️' 
        },
        sleepingBag: {
            name: 'Cozy Sleeping Bag',
            description: 'Puffle rests 50% faster',
            sleepBonus: 1.5,
            price: 100,
            emoji: '🛏️'
        },
        energyPillow: {
            name: 'Energy Pillow',
            description: 'Puffle gains more energy from rest',
            energyMultiplier: 1.5,
            price: 75,
            emoji: '💤'
        }
    };
    
    // Rest/Sleep configuration
    // Full rest takes 6 hours (360 minutes) to restore 100% energy
    // Energy regenerates linearly over time
    static REST_CONFIG = {
        fullRestHours: 6, // 6 hours for 0% → 100% energy
        energyPerHour: 100 / 6, // ~16.67% per hour
        hungerIncreasePerHour: 5, // Hunger slowly increases while resting
        happinessDecreasePerHour: 3, // Happiness slowly decreases while resting
    };
    
    // Available puffle toys
    static TOYS = {
        ball: { name: 'Ball', happinessBoost: 15, energyCost: 15, price: 25, emoji: '⚽' },
        frisbee: { name: 'Frisbee', happinessBoost: 20, energyCost: 20, price: 50, emoji: '🥏' },
        trampoline: { name: 'Trampoline', happinessBoost: 25, energyCost: 25, price: 100, emoji: '🎪' },
        puzzleBox: { name: 'Puzzle Box', happinessBoost: 30, energyCost: 10, price: 150, emoji: '🧩' },
        tennisBall: { name: 'Tennis Ball', happinessBoost: 18, energyCost: 18, price: 40, emoji: '🎾' }
    };
    
    // Learnable tricks with emoji displays
    static TRICKS = {
        spin: { name: 'Spin', playsRequired: 5, description: 'A simple spin!', emoji: '🔄' },
        jump: { name: 'Jump', playsRequired: 10, description: 'Bouncy jump!', emoji: '⬆️' },
        backflip: { name: 'Backflip', playsRequired: 25, description: 'Impressive backflip!', emoji: '🤸' },
        dance: { name: 'Dance', playsRequired: 50, description: 'Happy dance!', emoji: '💃' },
        juggle: { name: 'Juggle', playsRequired: 100, description: 'Juggles snowballs!', emoji: '🤹' },
        firework: { name: 'Firework', playsRequired: 200, description: 'Shoots sparkles!', emoji: '🎆' }
    };
    
    // Available accessories
    static ACCESSORIES = {
        hats: {
            none: { name: 'None', price: 0 },
            propeller: { name: 'Propeller Hat', price: 50, emoji: '🚁' },
            bow: { name: 'Bow', price: 30, emoji: '🎀' },
            tophat: { name: 'Top Hat', price: 75, emoji: '🎩' },
            crown: { name: 'Crown', price: 200, emoji: '👑' },
            pirate: { name: 'Pirate Hat', price: 100, emoji: '🏴‍☠️' },
            viking: { name: 'Viking Helmet', price: 150, emoji: '⚔️' },
            party: { name: 'Party Hat', price: 25, emoji: '🎉' }
        },
        glasses: {
            none: { name: 'None', price: 0 },
            sunglasses: { name: 'Sunglasses', price: 40, emoji: '😎' },
            nerd: { name: 'Nerd Glasses', price: 35, emoji: '🤓' },
            star: { name: 'Star Glasses', price: 60, emoji: '⭐' },
            heart: { name: 'Heart Glasses', price: 55, emoji: '❤️' }
        },
        neckwear: {
            none: { name: 'None', price: 0 },
            bowtie: { name: 'Bow Tie', price: 30, emoji: '🎀' },
            bandana: { name: 'Bandana', price: 25, emoji: '🧣' },
            scarf: { name: 'Scarf', price: 45, emoji: '🧣' },
            collar: { name: 'Collar', price: 20, emoji: '📿' }
        }
    };
    
    // Mood to emoji mapping - expanded for depth
    static MOOD_EMOJIS = {
        // Positive moods
        ecstatic: '🥳',
        excited: '🤩',
        happy: '😊',
        content: '😌',
        playful: '😜',
        loving: '🥰',
        proud: '😤',
        silly: '🤪',
        // Neutral moods  
        neutral: '😐',
        curious: '🧐',
        thinking: '🤔',
        confused: '😕',
        // Negative moods
        tired: '😴',
        sleepy: '🥱',
        hungry: '🍽️',
        hangry: '😤',
        sad: '😢',
        lonely: '🥺',
        bored: '😒',
        grumpy: '😠',
        sick: '🤢',
        cold: '🥶',
        scared: '😨'
    };
    
    // Emote bubbles the puffle can randomly show
    static RANDOM_EMOTES = {
        // Happy emotes
        happy: ['😊', '😄', '😁', '🥰', '💕', '✨', '🌟', '💫', '🎉', '🎊'],
        // Excited emotes
        excited: ['🤩', '🥳', '🎉', '✨', '💫', '⭐', '🌈', '🔥', '💥', '🎆'],
        // Playful emotes
        playful: ['😜', '😝', '🤪', '🎮', '🎾', '⚽', '🎪', '🤸', '🎯', '🏆'],
        // Hungry emotes
        hungry: ['🍽️', '🍪', '🍰', '🍕', '🍔', '🥺', '😋', '🤤', '🍩', '🐟'],
        // Tired emotes
        tired: ['😴', '💤', '🥱', '😪', '🛏️', '🌙', '⭐', '🌛', '😑', '🥴'],
        // Sad emotes
        sad: ['😢', '😭', '🥺', '😞', '😔', '💔', '🫤', '😿', '🌧️', '☁️'],
        // Love emotes (for puffle interactions)
        love: ['💕', '💖', '💗', '💓', '💞', '💝', '❤️', '🧡', '💛', '💚'],
        // Thinking emotes
        thinking: ['🤔', '🧐', '💭', '❓', '❔', '🤷', '💡', '📚', '🎓', '🔍'],
        // Special occasion emotes
        celebration: ['🎉', '🎊', '🎁', '🎈', '🎂', '🍰', '🎵', '🎶', '🎤', '🕺'],
        // Nature emotes
        nature: ['🌸', '🌺', '🌻', '🌼', '🌷', '🌱', '🍀', '🌈', '☀️', '🌙'],
        // Action emotes
        action: ['💪', '🏃', '🏊', '✈️', '🧗', '🎯', '🏆', '🥇', '⚡', '💨']
    };
    
    // Urgent need emojis
    static NEED_EMOJIS = {
        hunger: { high: '🍽️', medium: '🍪' },
        energy: { high: '😴', medium: '💤' },
        play: '🎮',
        attention: '👋',
        cold: '🥶',
        lonely: '🥺'
    };
    
    constructor(config = {}) {
        this.id = config.id || Math.random().toString(36).substr(2, 9);
        this.name = config.name || 'Puffle';
        this.color = config.color || 'blue';
        this.ownerId = config.ownerId || null;
        
        // Core Stats (0-100)
        this.happiness = config.happiness ?? 80;
        this.energy = config.energy ?? 100;
        this.hunger = config.hunger ?? 20;
        
        // Duck Life Training Stats (0-999)
        this.trainingStats = config.trainingStats || {
            running: 10,
            swimming: 10,
            flying: 10,
            climbing: 10
        };
        
        // Level & Experience
        this.level = config.level || 1;
        this.experience = config.experience || 0;
        this.xpForNextLevel = config.xpForNextLevel || 100;
        
        // Tricks & Toys
        this.totalPlays = config.totalPlays || 0;
        this.unlockedTricks = config.unlockedTricks || [];
        this.favoriteTrick = config.favoriteTrick || null;
        this.ownedToys = config.ownedToys || [];
        this.favoriteToy = config.favoriteToy || null;
        
        // Food Inventory
        this.foodInventory = config.foodInventory || {
            cookie: 0,
            fish: 0,
            cake: 0,
            pizza: 0,
            deluxeMeal: 0
        };
        
        // Equipped Accessories
        this.equippedAccessories = config.equippedAccessories || {
            hat: 'none',
            glasses: 'none',
            neckwear: 'none'
        };
        this.ownedAccessories = config.ownedAccessories || {
            hats: [],
            glasses: [],
            neckwear: []
        };
        
        // Equipped Toy (currently being used for play)
        this.equippedToy = config.equippedToy || null;
        
        // Racing Stats
        this.racingStats = config.racingStats || {
            totalRaces: 0,
            wins: 0,
            bestTime: null,
            trophies: 0
        };
        
        // State
        this.inDaycare = config.inDaycare || false;
        this.urgentNeed = config.urgentNeed || null;
        
        // ========== REST STATE ==========
        // Rest takes 6 hours for full energy restore (0% → 100%)
        this.isSleeping = config.isSleeping || false;
        this.sleepStartTime = config.sleepStartTime || null;
        this.sleepDuration = config.sleepDuration || 0; // ms
        this.sleepStartEnergy = config.sleepStartEnergy || 0;
        this.sleepStartHunger = config.sleepStartHunger || 0;
        this.sleepStartHappiness = config.sleepStartHappiness || 0;
        
        // ========== NEGLECT / RUNAWAY PROTECTION ==========
        this.neglectStartTime = config.neglectStartTime || null; // When stats hit critical
        this.neglectProtectionHours = config.neglectProtectionHours || 12; // Default 12h grace period
        this.hasRunAway = config.hasRunAway || false;
        
        // Position & Movement
        this.position = { x: config.x || 0, y: 0, z: config.z || 0 };
        this.targetPosition = null;
        this.followDistance = 2; // How far behind player
        
        // State
        this.state = 'idle'; // idle, following, playing, sleeping, eating, trick
        this.mood = config.mood || 'happy'; // happy, neutral, sad, excited, tired, hungry
        
        // Animation
        this.bounceOffset = Math.random() * Math.PI * 2;
        this.targetRotation = 0;
        this.lastStatUpdate = Date.now();
        this.currentTrick = null; // Currently performing trick
        this.trickStartTime = 0;
        
        // Emote bubble
        this.showingEmote = false;
        this.currentEmote = null;
        this.emoteStartTime = 0;
        this.emoteDuration = 3000; // ms
        
        // 3D Mesh reference
        this.mesh = null;
        this.emoteBubble = null;
        this._THREE = null; // Store THREE reference for accessory updates
    }
    
    // Get total power for racing
    getTotalPower() {
        return this.trainingStats.running + 
               this.trainingStats.swimming + 
               this.trainingStats.flying + 
               this.trainingStats.climbing;
    }
    
    // Get next trick that can be unlocked
    getNextTrick() {
        for (const [trickId, trick] of Object.entries(Puffle.TRICKS)) {
            if (!this.unlockedTricks.includes(trickId)) {
                return { id: trickId, ...trick, playsRemaining: trick.playsRequired - this.totalPlays };
            }
        }
        return null;
    }
    
    // Calculate happiness bonus for minigames (0-25% bonus)
    getMinigameBonus() {
        if (this.happiness >= 90) return 0.25;
        if (this.happiness >= 70) return 0.15;
        if (this.happiness >= 50) return 0.10;
        if (this.happiness >= 30) return 0.05;
        return 0;
    }
    
    // Called each frame to update hunger/energy decay
    tick() {
        const now = Date.now();
        const deltaSeconds = (now - this.lastStatUpdate) / 1000;
        this.lastStatUpdate = now;
        
        // Skip decay if in daycare
        if (this.inDaycare) return;
        
        // Only decay every second or so to avoid micro-updates
        if (deltaSeconds > 0.5) {
            // Hunger increases over time (puffle gets hungry) - more aggressive
            this.hunger = Math.min(100, this.hunger + deltaSeconds * 0.15);
            
            // Energy decreases when not sleeping - more noticeable
            if (this.state !== 'sleeping') {
                this.energy = Math.max(0, this.energy - deltaSeconds * 0.08);
            }
            
            // Happiness affected by hunger and energy
            if (this.hunger > 60) {
                this.happiness = Math.max(0, this.happiness - deltaSeconds * 0.2);
            }
            if (this.energy < 40) {
                this.happiness = Math.max(0, this.happiness - deltaSeconds * 0.15);
            }
            
            // Bonus: well-fed and rested puffles slowly gain happiness
            if (this.hunger < 30 && this.energy > 70) {
                this.happiness = Math.min(100, this.happiness + deltaSeconds * 0.05);
            }
            
            this.updateMood();
            this.updateUrgentNeed();
            this.maybeShowEmote();
        }
    }
    
    // --- STATS MANAGEMENT ---
    updateStats(deltaTime) {
        if (this.inDaycare) return;
        
        // Decay over time
        this.hunger = Math.min(100, this.hunger + deltaTime * 0.15);
        this.energy = Math.max(0, this.energy - deltaTime * 0.08);
        
        // Happiness affected by other stats
        if (this.hunger > 60) {
            this.happiness = Math.max(0, this.happiness - deltaTime * 0.2);
        }
        if (this.energy < 40) {
            this.happiness = Math.max(0, this.happiness - deltaTime * 0.15);
        }
        
        // Update mood
        this.updateMood();
        this.updateUrgentNeed();
    }
    
    updateMood() {
        // More nuanced mood system based on multiple factors
        const { happiness, energy, hunger } = this;
        const recentlyPlayed = Date.now() - (this.lastPlayTime || 0) < 60000;
        const recentlyFed = Date.now() - (this.lastFeedTime || 0) < 60000;
        
        // Critical states take priority
        if (hunger > 90) {
            this.mood = 'hangry';
        } else if (energy < 10) {
            this.mood = 'sleepy';
        } else if (hunger > 80) {
            this.mood = 'hungry';
        } else if (energy < 20) {
            this.mood = 'tired';
        }
        // High happiness states
        else if (happiness > 90 && energy > 70) {
            this.mood = recentlyPlayed ? 'ecstatic' : 'excited';
        } else if (happiness > 80) {
            this.mood = recentlyFed ? 'loving' : 'excited';
        } else if (happiness > 70 && recentlyPlayed) {
            this.mood = 'playful';
        } else if (happiness > 70) {
            this.mood = Math.random() > 0.5 ? 'happy' : 'content';
        } else if (happiness > 60) {
            this.mood = 'happy';
        }
        // Medium happiness states
        else if (happiness > 50) {
            this.mood = Math.random() > 0.7 ? 'curious' : 'content';
        } else if (happiness > 40) {
            this.mood = Math.random() > 0.5 ? 'neutral' : 'thinking';
        }
        // Low happiness states
        else if (happiness > 30) {
            this.mood = Math.random() > 0.5 ? 'bored' : 'confused';
        } else if (happiness > 20) {
            this.mood = Math.random() > 0.5 ? 'lonely' : 'sad';
        } else if (happiness > 10) {
            this.mood = 'sad';
        } else {
            this.mood = Math.random() > 0.5 ? 'grumpy' : 'lonely';
        }
        
        // Random silly mood when very happy
        if (happiness > 85 && Math.random() > 0.95) {
            this.mood = 'silly';
        }
    }
    
    updateUrgentNeed() {
        if (this.hunger > 80) {
            this.urgentNeed = { type: 'hunger', emoji: '🍽️', message: "I'm starving!" };
        } else if (this.energy < 20) {
            this.urgentNeed = { type: 'energy', emoji: '😴', message: 'So tired...' };
        } else if (this.hunger > 60) {
            this.urgentNeed = { type: 'hunger', emoji: '🍪', message: 'Getting hungry...' };
        } else if (this.energy < 40) {
            this.urgentNeed = { type: 'energy', emoji: '💤', message: 'Need rest...' };
        } else if (this.happiness < 30) {
            this.urgentNeed = { type: 'play', emoji: '🎮', message: 'Play with me!' };
        } else if (this.happiness < 50) {
            this.urgentNeed = { type: 'attention', emoji: '👋', message: 'Notice me!' };
        } else {
            this.urgentNeed = null;
        }
    }
    
    // --- EMOTE SYSTEM ---
    maybeShowEmote() {
        // Don't spam emotes
        if (this.showingEmote) return;
        
        // Show emote based on need/mood every 10-20 seconds
        if (Math.random() < 0.008) { // ~0.8% chance per tick - slightly more frequent
            // Urgent needs take priority
            if (this.urgentNeed) {
                this.showEmote(this.urgentNeed.emoji);
                return;
            }
            
            // Pick emote set based on mood
            let emoteSet;
            switch(this.mood) {
                case 'ecstatic':
                case 'excited':
                    emoteSet = Puffle.RANDOM_EMOTES.excited;
                    break;
                case 'playful':
                case 'silly':
                    emoteSet = Puffle.RANDOM_EMOTES.playful;
                    break;
                case 'happy':
                case 'content':
                case 'loving':
                case 'proud':
                    emoteSet = Puffle.RANDOM_EMOTES.happy;
                    break;
                case 'hungry':
                case 'hangry':
                    emoteSet = Puffle.RANDOM_EMOTES.hungry;
                    break;
                case 'tired':
                case 'sleepy':
                    emoteSet = Puffle.RANDOM_EMOTES.tired;
                    break;
                case 'sad':
                case 'lonely':
                case 'grumpy':
                    emoteSet = Puffle.RANDOM_EMOTES.sad;
                    break;
                case 'curious':
                case 'thinking':
                case 'confused':
                    emoteSet = Puffle.RANDOM_EMOTES.thinking;
                    break;
                case 'bored':
                    // Mix of action and thinking when bored
                    emoteSet = Math.random() > 0.5 
                        ? Puffle.RANDOM_EMOTES.action 
                        : Puffle.RANDOM_EMOTES.thinking;
                    break;
                case 'neutral':
                default:
                    // Neutral gets a mix of everything
                    const allSets = [
                        Puffle.RANDOM_EMOTES.nature,
                        Puffle.RANDOM_EMOTES.thinking,
                        Puffle.RANDOM_EMOTES.happy
                    ];
                    emoteSet = allSets[Math.floor(Math.random() * allSets.length)];
            }
            
            // Pick random emote from set
            if (emoteSet && emoteSet.length > 0) {
                this.showEmote(emoteSet[Math.floor(Math.random() * emoteSet.length)]);
            }
        }
    }
    
    showEmote(emoji) {
        this.showingEmote = true;
        this.currentEmote = emoji;
        this.emoteStartTime = Date.now();
        
        setTimeout(() => {
            this.showingEmote = false;
            this.currentEmote = null;
        }, this.emoteDuration);
    }
    
    // Show hearts when interacting with another puffle
    showHearts() {
        this.showEmote('💕');
    }
    
    // --- ACTIONS ---
    feed(foodType = 'cookie') {
        const food = Puffle.FOOD[foodType] || Puffle.FOOD.cookie;
        
        this.hunger = Math.max(0, this.hunger - food.hungerReduction);
        this.happiness = Math.min(100, this.happiness + food.happinessBoost);
        if (food.energyBoost) {
            this.energy = Math.min(100, this.energy + food.energyBoost);
        }
        this.state = 'eating';
        this.lastFeedTime = Date.now(); // Track for mood system
        
        // Show happy emote
        this.showEmote('😋');
        
        setTimeout(() => {
            if (this.state === 'eating') this.state = 'idle';
        }, 2000);
        
        this.updateMood();
        return { hunger: this.hunger, happiness: this.happiness, energy: this.energy, foodUsed: foodType };
    }
    
    play(toyType = null) {
        if (this.energy < 15) {
            this.showEmote('😴');
            return false;
        }
        
        // Use toy if specified and owned
        const toy = toyType && this.ownedToys.includes(toyType) ? Puffle.TOYS[toyType] : null;
        
        const happinessGain = toy ? toy.happinessBoost : 15;
        const energyCost = toy ? toy.energyCost : 15;
        
        this.energy = Math.max(0, this.energy - energyCost);
        this.happiness = Math.min(100, this.happiness + happinessGain);
        this.hunger = Math.min(100, this.hunger + 8);
        this.state = 'playing';
        this.totalPlays++;
        this.lastPlayTime = Date.now(); // Track for mood system
        
        // Check for new tricks unlocked
        const newTricks = [];
        for (const [trickId, trick] of Object.entries(Puffle.TRICKS)) {
            if (this.totalPlays >= trick.playsRequired && !this.unlockedTricks.includes(trickId)) {
                this.unlockedTricks.push(trickId);
                newTricks.push({ id: trickId, ...trick });
            }
        }
        
        // Show play emote
        this.showEmote(toy ? toy.emoji : '🎾');
        
        setTimeout(() => {
            if (this.state === 'playing') this.state = 'idle';
        }, 3000);
        
        this.updateMood();
        return { 
            success: true, 
            toyUsed: toyType,
            newTricksUnlocked: newTricks,
            totalPlays: this.totalPlays
        };
    }
    
    // ========== REST SYSTEM (Time-based, 6 hours for full rest) ==========
    
    /**
     * Start resting - puffle must be unequipped to rest
     * Takes 6 hours for full energy restoration (0% → 100%)
     * Energy regenerates linearly over time
     * Hunger increases and happiness decreases slowly while resting
     */
    startRest() {
        if (this.isSleeping) {
            return { success: false, error: 'ALREADY_RESTING' };
        }
        
        const config = Puffle.REST_CONFIG;
        const energyNeeded = 100 - this.energy;
        const hoursNeeded = energyNeeded / config.energyPerHour;
        const msNeeded = hoursNeeded * 60 * 60 * 1000;
        
        this.isSleeping = true;
        this.state = 'sleeping';
        this.sleepStartTime = Date.now();
        this.sleepDuration = msNeeded; // Time to reach 100% energy
        this.sleepStartEnergy = this.energy;
        this.sleepStartHunger = this.hunger;
        this.sleepStartHappiness = this.happiness;
        
        console.log(`🐾 ${this.name} started resting. Energy: ${this.energy}% → 100% (${hoursNeeded.toFixed(1)} hours)`);
        
        return { 
            success: true,
            startEnergy: this.energy,
            hoursToFullRest: hoursNeeded,
            estimatedWakeTime: this.sleepStartTime + msNeeded
        };
    }
    
    /**
     * Check rest progress and update stats
     * Energy increases, hunger increases, happiness decreases over time
     * @returns {Object} Rest status with current progress
     */
    updateRest() {
        if (!this.isSleeping) {
            return { isResting: false };
        }
        
        const now = Date.now();
        const elapsed = now - this.sleepStartTime;
        const elapsedHours = elapsed / (60 * 60 * 1000);
        const config = Puffle.REST_CONFIG;
        
        // Calculate current stats based on time elapsed
        const energyGained = elapsedHours * config.energyPerHour;
        const hungerIncrease = elapsedHours * config.hungerIncreasePerHour;
        const happinessDecrease = elapsedHours * config.happinessDecreasePerHour;
        
        // Update stats (don't save yet, just calculate current values)
        const currentEnergy = Math.min(100, this.sleepStartEnergy + energyGained);
        const currentHunger = Math.min(100, this.sleepStartHunger + hungerIncrease);
        const currentHappiness = Math.max(0, this.sleepStartHappiness - happinessDecrease);
        
        // Check if rest is complete (energy at 100%)
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
    }
    
    /**
     * Stop resting and apply accumulated stats
     * Can be called manually (interrupt) or when rest is complete
     * @returns {Object} Final rest results
     */
    stopRest() {
        if (!this.isSleeping) {
            return { success: false, error: 'NOT_RESTING' };
        }
        
        // Get final stats
        const status = this.updateRest();
        
        // Apply the stats
        this.energy = status.currentEnergy;
        this.hunger = status.currentHunger;
        this.happiness = status.currentHappiness;
        
        // Clear rest state
        this.isSleeping = false;
        this.state = 'idle';
        this.sleepStartTime = null;
        this.sleepDuration = 0;
        this.sleepStartEnergy = 0;
        this.sleepStartHunger = 0;
        this.sleepStartHappiness = 0;
        
        this.updateMood();
        
        console.log(`🐾 ${this.name} woke up! Energy: ${this.energy}%, Hunger: ${this.hunger}%, Happiness: ${this.happiness}%`);
        
        return {
            success: true,
            finalEnergy: this.energy,
            finalHunger: this.hunger,
            finalHappiness: this.happiness,
            wasComplete: status.isComplete
        };
    }
    
    /**
     * Check if puffle can be equipped (not resting, not run away)
     */
    canBeEquipped() {
        if (this.isSleeping) {
            const status = this.updateRest();
            return { 
                canEquip: false, 
                reason: 'RESTING',
                restProgress: status.progress,
                remainingHours: status.remainingHours
            };
        }
        if (this.hasRunAway) {
            return { canEquip: false, reason: 'RAN_AWAY' };
        }
        return { canEquip: true };
    }
    
    // Legacy methods for compatibility
    startSleep(sleepType) {
        console.warn('Puffle.startSleep() is deprecated. Use startRest() instead.');
        return this.startRest();
    }
    
    updateSleep() {
        return this.updateRest();
    }
    
    wakeUp(forceWake = false) {
        return this.stopRest();
    }
    
    rest() {
        console.warn('Puffle.rest() is deprecated. Use startRest() instead.');
        return this.startRest();
    }
    
    // ========== NEGLECT / RUNAWAY SYSTEM ==========
    
    /**
     * Check if puffle is being neglected (hunger/energy critically low)
     * @returns {Object} Neglect status
     */
    checkNeglect() {
        const isCritical = this.hunger >= 90 || this.energy <= 10;
        
        if (isCritical) {
            // Start tracking neglect time if not already
            if (!this.neglectStartTime) {
                this.neglectStartTime = Date.now();
            }
            
            const neglectDuration = Date.now() - this.neglectStartTime;
            const protectionMs = this.neglectProtectionHours * 60 * 60 * 1000;
            const timeRemaining = protectionMs - neglectDuration;
            
            if (timeRemaining <= 0 && !this.hasRunAway) {
                // Puffle runs away!
                this.runAway();
            }
            
            return {
                isNeglected: true,
                neglectStartTime: this.neglectStartTime,
                protectionHours: this.neglectProtectionHours,
                timeRemainingMs: Math.max(0, timeRemaining),
                timeRemainingHours: Math.max(0, timeRemaining / (60 * 60 * 1000)),
                willRunAway: timeRemaining <= 0
            };
        } else {
            // Reset neglect if stats are okay
            this.neglectStartTime = null;
            return { isNeglected: false };
        }
    }
    
    /**
     * Apply neglect protection item
     * @param {number} hours - Hours of protection to add
     */
    applyNeglectProtection(hours) {
        this.neglectProtectionHours = Math.max(this.neglectProtectionHours, hours);
        return { success: true, protectionHours: this.neglectProtectionHours };
    }
    
    /**
     * Puffle runs away due to neglect
     */
    runAway() {
        this.hasRunAway = true;
        this.state = 'ran_away';
        this.showEmote('😢');
        console.warn(`🐾 Puffle ${this.name} has run away due to neglect!`);
        return { ranAway: true, puffleName: this.name };
    }
    
    /**
     * Get puffle status summary including sleep and neglect
     */
    getStatus() {
        const sleepStatus = this.updateSleep();
        const neglectStatus = this.checkNeglect();
        
        return {
            name: this.name,
            color: this.color,
            level: this.level,
            happiness: this.happiness,
            energy: this.energy,
            hunger: this.hunger,
            mood: this.mood,
            state: this.state,
            isSleeping: this.isSleeping,
            sleepStatus,
            neglectStatus,
            hasRunAway: this.hasRunAway,
            canBeEquipped: this.canBeEquipped()
        };
    }
    
    pet() {
        this.happiness = Math.min(100, this.happiness + 5);
        this.showEmote('💕');
        this.updateMood();
        return this.happiness;
    }
    
    // Perform a trick
    performTrick(trickId) {
        if (!this.unlockedTricks.includes(trickId)) return false;
        if (this.energy < 10) return false;
        
        this.energy = Math.max(0, this.energy - 5);
        this.state = 'trick';
        this.currentTrick = trickId;
        this.trickStartTime = Date.now();
        
        const trick = Puffle.TRICKS[trickId];
        this.showEmote(trick.emoji);
        
        setTimeout(() => {
            if (this.state === 'trick') {
                this.state = 'idle';
                this.currentTrick = null;
            }
        }, 2500);
        
        return true;
    }
    
    // Add XP and check for level up (called after server response)
    syncFromServer(serverData) {
        // Sync all stats from server
        this.happiness = serverData.happiness ?? this.happiness;
        this.energy = serverData.energy ?? this.energy;
        this.hunger = serverData.hunger ?? this.hunger;
        this.level = serverData.level ?? this.level;
        this.experience = serverData.experience ?? this.experience;
        this.xpForNextLevel = serverData.xpForNextLevel ?? this.xpForNextLevel;
        this.trainingStats = serverData.trainingStats ?? this.trainingStats;
        this.totalPlays = serverData.totalPlays ?? this.totalPlays;
        this.unlockedTricks = serverData.unlockedTricks ?? this.unlockedTricks;
        this.ownedToys = serverData.ownedToys ?? this.ownedToys;
        this.equippedToy = serverData.equippedToy ?? this.equippedToy;
        this.equippedAccessories = serverData.equippedAccessories ?? this.equippedAccessories;
        this.ownedAccessories = serverData.ownedAccessories ?? this.ownedAccessories;
        this.foodInventory = serverData.foodInventory ?? this.foodInventory;
        this.racingStats = serverData.racingStats ?? this.racingStats;
        this.inDaycare = serverData.inDaycare ?? this.inDaycare;
        this.mood = serverData.mood ?? this.mood;
        this.urgentNeed = serverData.urgentNeed ?? this.urgentNeed;
        
        // Rest state
        this.isSleeping = serverData.isSleeping ?? this.isSleeping;
        this.sleepStartTime = serverData.sleepStartTime ? new Date(serverData.sleepStartTime).getTime() : this.sleepStartTime;
        this.sleepDuration = serverData.sleepDuration ?? this.sleepDuration;
        this.sleepStartEnergy = serverData.sleepStartEnergy ?? this.sleepStartEnergy;
        this.sleepStartHunger = serverData.sleepStartHunger ?? this.sleepStartHunger;
        this.sleepStartHappiness = serverData.sleepStartHappiness ?? this.sleepStartHappiness;
        
        // Neglect state
        this.neglectStartTime = serverData.neglectStartTime ?? this.neglectStartTime;
        this.neglectProtectionHours = serverData.neglectProtectionHours ?? this.neglectProtectionHours;
        this.hasRunAway = serverData.hasRunAway ?? this.hasRunAway;
        
        // Update visual accessories if mesh exists
        const THREE = this._THREE || window.THREE;
        if (this.mesh && THREE) {
            this.updateAccessories(THREE);
        }
    }
    
    // --- MOVEMENT (Snake-tail behavior) ---
    // The puffle follows the owner like a snake tail follows the head
    // It faces the direction of its OWN travel, not the owner's direction
    followOwner(ownerPos, deltaTime) {
        // Store previous position to calculate actual movement direction
        const prevX = this.position.x;
        const prevZ = this.position.z;
        
        // Get owner Y position (default to 0 for backwards compatibility)
        const ownerY = ownerPos.y || 0;
        
        // Calculate Y difference - if owner is much higher/lower, teleport puffle
        const yDiff = Math.abs(ownerY - this.position.y);
        if (yDiff > 2) {
            // Owner is on a different elevation - teleport puffle to owner's level
            this.position.y = ownerY;
            // Also teleport XZ to be close to owner
            this.position.x = ownerPos.x - 1.5;
            this.position.z = ownerPos.z - 1.5;
            if (this.mesh) {
                this.mesh.position.x = this.position.x;
                this.mesh.position.y = ownerY + 0.5; // Puffle base height
                this.mesh.position.z = this.position.z;
            }
            return;
        }
        
        const dx = ownerPos.x - this.position.x;
        const dz = ownerPos.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Only follow if owner is beyond follow distance (snake-tail behavior)
        if (distance > this.followDistance) {
            this.state = 'following';
            
            // Calculate how far we need to move to maintain follow distance
            const targetDistance = distance - this.followDistance;
            
            // Smooth follow speed - faster when further, slower when closer
            const speed = Math.min(targetDistance * 3, 12) * deltaTime;
            
            // Move towards owner (along the line connecting puffle to owner)
            if (distance > 0.01) {
                const moveX = (dx / distance) * speed;
                const moveZ = (dz / distance) * speed;
                
                this.position.x += moveX;
                this.position.z += moveZ;
            }
            
            // Smoothly interpolate Y position to match owner
            this.position.y += (ownerY - this.position.y) * 0.1;
            
            // Calculate actual movement that occurred
            const actualMoveX = this.position.x - prevX;
            const actualMoveZ = this.position.z - prevZ;
            const actualMoveDist = Math.sqrt(actualMoveX * actualMoveX + actualMoveZ * actualMoveZ);
            
            // Face the direction of ACTUAL movement (snake-tail behavior)
            // The puffle faces where it's going, not where the owner is
            if (actualMoveDist > 0.001) {
                this.targetRotation = Math.atan2(actualMoveX, actualMoveZ);
            }
            
            // Update mesh position
            if (this.mesh) {
                this.mesh.position.x = this.position.x;
                this.mesh.position.y = this.position.y + 0.5; // Puffle base height offset
                this.mesh.position.z = this.position.z;
            }
        } else {
            if (this.state === 'following') {
                this.state = 'idle';
            }
            // Still update Y position when idle
            this.position.y += (ownerY - this.position.y) * 0.1;
            if (this.mesh) {
                this.mesh.position.y = this.position.y + 0.5;
            }
        }
    }
    
    // Alias for backwards compatibility
    followPlayer(ownerPos, deltaTime) {
        this.followOwner(ownerPos, deltaTime);
    }
    
    // --- ANIMATION ---
    animate(time) {
        if (!this.mesh) return;
        
        const baseScale = 0.6; // Match createMesh scale
        
        // Slower, smoother bouncing (reduced speed significantly)
        const bounceSpeed = this.state === 'following' ? 4 : 1.5;
        const bounceHeight = this.state === 'following' ? 0.15 : 0.05;
        
        // Smooth sine wave bounce - add to current Y position (which includes elevation)
        const bounce = Math.abs(Math.sin(time * bounceSpeed + this.bounceOffset));
        const baseY = (this.position.y || 0) + 0.35;
        this.mesh.position.y = baseY + bounce * bounceHeight;
        
        // Subtle squash and stretch
        const squashAmount = this.state === 'following' ? 0.08 : 0.03;
        const squash = 1 + Math.sin(time * bounceSpeed * 2 + this.bounceOffset) * squashAmount;
        this.mesh.scale.set(baseScale * squash, baseScale / squash, baseScale * squash);
        
        // Smoothly rotate towards movement direction (snake-tail effect)
        // The puffle smoothly turns to face its travel direction
        if (this.targetRotation !== undefined && this.mesh.rotation) {
            const currentY = this.mesh.rotation.y;
            let diff = this.targetRotation - currentY;
            // Normalize angle to -PI to PI
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            // Smooth interpolation - like a snake tail following the curve
            this.mesh.rotation.y += diff * 0.15;
        }
        
        // State-specific animations (use baseY for elevation support)
        if (this.state === 'sleeping') {
            this.mesh.rotation.z = Math.sin(time * 0.5) * 0.1;
            this.mesh.position.y = baseY - 0.15;
            this.mesh.scale.set(baseScale * 1.1, baseScale * 0.7, baseScale * 1.1);
        } else if (this.state === 'playing') {
            this.mesh.rotation.y += 0.15;
            this.mesh.position.y = baseY + 0.05 + Math.abs(Math.sin(time * 5)) * 0.3;
            const playSquash = 1 + Math.sin(time * 5) * 0.1;
            this.mesh.scale.set(baseScale * playSquash, baseScale / playSquash, baseScale * playSquash);
        } else if (this.state === 'eating') {
            this.mesh.position.y = baseY - 0.05 + Math.sin(time * 4) * 0.05;
            this.mesh.rotation.z = Math.sin(time * 6) * 0.1;
        } else if (this.state === 'trick' && this.currentTrick) {
            // Trick animations
            if (this.currentTrick === 'spin') {
                this.mesh.rotation.y += 0.3;
            } else if (this.currentTrick === 'jump') {
                this.mesh.position.y = baseY + Math.abs(Math.sin(time * 6)) * 0.5;
            } else if (this.currentTrick === 'backflip') {
                const trickProgress = ((Date.now() - this.trickStartTime) / 2500) * Math.PI * 4;
                this.mesh.rotation.x = Math.sin(trickProgress) * Math.PI;
                this.mesh.position.y = baseY + Math.abs(Math.sin(trickProgress * 0.5)) * 0.4;
            } else if (this.currentTrick === 'dance') {
                this.mesh.rotation.y += 0.15;
                this.mesh.position.y = baseY + Math.abs(Math.sin(time * 8)) * 0.2;
                const danceSquash = 1 + Math.sin(time * 8) * 0.15;
                this.mesh.scale.set(baseScale * danceSquash, baseScale / danceSquash, baseScale * danceSquash);
            }
        } else {
            this.mesh.rotation.z = 0;
            this.mesh.rotation.x = 0;
        }
        
        // Special effects for legendary puffles
        if (this.mesh.userData.special === 'rainbow') {
            // Cycle through rainbow colors
            const hue = (time * 0.3) % 1;
            const rainbowColor = new (window.THREE || THREE).Color().setHSL(hue, 1, 0.5);
            this.mesh.traverse(child => {
                if (child.isMesh && child.material && child.name !== 'eye' && !child.name.includes('pupil')) {
                    child.material.color = rainbowColor;
                }
            });
        } else if (this.mesh.userData.special === 'glow') {
            // Pulsing glow effect
            const glowIntensity = 0.2 + Math.sin(time * 2) * 0.15;
            const body = this.mesh.getObjectByName('body');
            if (body && body.material) {
                body.material.emissiveIntensity = glowIntensity;
            }
        }
        
        // Update emote bubble
        this.updateEmoteBubble(time);
    }
    
    // Update emote bubble visibility and content
    updateEmoteBubble(time) {
        if (!this.emoteBubble) return;
        
        if (this.showingEmote && this.currentEmote) {
            this.emoteBubble.visible = true;
            
            // Animate bubble - bob up and down, face camera
            const bobOffset = Math.sin(time * 3) * 0.05;
            this.emoteBubble.position.y = 1.2 + bobOffset;
            
            // Fade in/out animation
            const elapsed = Date.now() - this.emoteStartTime;
            const fadeInTime = 200;
            const fadeOutStart = this.emoteDuration - 500;
            
            let opacity = 1;
            if (elapsed < fadeInTime) {
                opacity = elapsed / fadeInTime;
            } else if (elapsed > fadeOutStart) {
                opacity = 1 - ((elapsed - fadeOutStart) / 500);
            }
            
            // Scale animation for pop effect
            const scaleProgress = Math.min(1, elapsed / 150);
            const popScale = 0.8 + 0.2 * Math.sin(scaleProgress * Math.PI * 0.5);
            this.emoteBubble.scale.setScalar(popScale);
            
            // Update sprite material opacity
            if (this.emoteBubble.material) {
                this.emoteBubble.material.opacity = opacity;
            }
            
            // Update emoji if changed
            if (this.emoteBubble.userData.currentEmoji !== this.currentEmote) {
                this.updateEmoteBubbleTexture(this.currentEmote);
            }
        } else {
            this.emoteBubble.visible = false;
        }
    }
    
    // Update the emoji texture on the bubble
    updateEmoteBubbleTexture(emoji) {
        if (!this.emoteBubble || !this.emoteBubble.material) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Draw bubble background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(64, 54, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw bubble tail
        ctx.beginPath();
        ctx.moveTo(50, 95);
        ctx.lineTo(64, 115);
        ctx.lineTo(78, 95);
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(64, 54, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        // Draw emoji
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 64, 54);
        
        // Update texture
        const THREE = window.THREE;
        if (THREE) {
            const texture = new THREE.CanvasTexture(canvas);
            this.emoteBubble.material.map = texture;
            this.emoteBubble.material.needsUpdate = true;
            this.emoteBubble.userData.currentEmoji = emoji;
        }
    }
    
    // --- MESH CREATION ---
    createMesh(THREE) {
        // Store THREE reference for later accessory updates
        this._THREE = THREE;
        
        const colorData = Puffle.COLORS[this.color] || Puffle.COLORS.blue;
        const baseColor = new THREE.Color(colorData.hex);
        const darkerColor = baseColor.clone().multiplyScalar(0.7);
        const isSpecial = colorData.special;
        
        const group = new THREE.Group();
        group.userData.special = isSpecial;
        group.userData.colorData = colorData;
        
        // Main fluffy body (slightly squashed sphere)
        const bodyGeo = new THREE.SphereGeometry(0.5, 24, 18);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: colorData.hex,
            roughness: isSpecial === 'glow' ? 0.3 : 0.9,
            metalness: isSpecial === 'glow' ? 0.2 : 0,
            emissive: isSpecial === 'glow' ? colorData.hex : 0x000000,
            emissiveIntensity: isSpecial === 'glow' ? 0.3 : 0,
            transparent: isSpecial === 'glow',
            opacity: isSpecial === 'glow' ? 0.85 : 1
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.scale.set(1, 0.85, 1);
        body.castShadow = true;
        body.name = 'body';
        group.add(body);
        
        // Fluffy fur tufts around body
        const tuftMat = new THREE.MeshStandardMaterial({ 
            color: colorData.hex, 
            roughness: 0.95,
            emissive: isSpecial === 'glow' ? colorData.hex : 0x000000,
            emissiveIntensity: isSpecial === 'glow' ? 0.2 : 0
        });
        
        // Hair tuft on top (multiple spikes)
        const hairGroup = new THREE.Group();
        hairGroup.name = 'hair';
        const hairCount = 7;
        for (let i = 0; i < hairCount; i++) {
            const angle = (i / hairCount) * Math.PI * 2;
            const isCenter = i === 0;
            const height = isCenter ? 0.35 : 0.25 + Math.random() * 0.1;
            const radius = isCenter ? 0.08 : 0.06;
            
            const tuftGeo = new THREE.ConeGeometry(radius, height, 6);
            const tuft = new THREE.Mesh(tuftGeo, tuftMat.clone());
            tuft.name = `tuft_${i}`;
            
            if (isCenter) {
                tuft.position.set(0, 0.45, 0);
            } else {
                const spread = 0.12;
                tuft.position.set(
                    Math.cos(angle) * spread,
                    0.4,
                    Math.sin(angle) * spread
                );
                tuft.rotation.z = Math.cos(angle) * 0.3;
                tuft.rotation.x = Math.sin(angle) * 0.3;
            }
            hairGroup.add(tuft);
        }
        group.add(hairGroup);
        
        // Big expressive eyes (Club Pengu style - large white with black pupil)
        const eyeWhiteGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.1 // Shiny eyes
        });
        
        const pupilGeo = new THREE.SphereGeometry(0.09, 12, 12);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        
        const eyeShineGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const eyeShineMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        
        [-0.14, 0.14].forEach((offset, idx) => {
            // Eye white (large)
            const eye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
            eye.position.set(offset, 0.1, 0.38);
            eye.scale.set(1, 1.1, 0.8); // Slightly oval
            group.add(eye);
            
            // Pupil (positioned slightly to center for cute cross-eyed look)
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            const lookOffset = idx === 0 ? 0.02 : -0.02; // Slight cross-eye
            pupil.position.set(offset + lookOffset, 0.1, 0.5);
            group.add(pupil);
            
            // Eye shine (catchlight)
            const shine = new THREE.Mesh(eyeShineGeo, eyeShineMat);
            shine.position.set(offset + 0.04, 0.15, 0.52);
            group.add(shine);
        });
        
        // Small beak/mouth area (subtle bump)
        const beakGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const beakMat = new THREE.MeshStandardMaterial({ 
            color: darkerColor.getHex()
        });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, -0.05, 0.45);
        beak.scale.set(1.2, 0.6, 0.8);
        group.add(beak);
        
        // Feet (small ovals at bottom)
        const footGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const footMat = new THREE.MeshStandardMaterial({ 
            color: darkerColor.getHex()
        });
        
        [-0.18, 0.18].forEach(offset => {
            const foot = new THREE.Mesh(footGeo, footMat);
            foot.position.set(offset, -0.38, 0.1);
            foot.scale.set(1, 0.4, 1.3);
            group.add(foot);
        });
        
        // Smaller side tufts for extra fluffiness
        [-0.4, 0.4].forEach(offset => {
            for (let i = 0; i < 3; i++) {
                const sideTuftGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
                const sideTuft = new THREE.Mesh(sideTuftGeo, tuftMat);
                sideTuft.position.set(offset, 0.1 + i * 0.1 - 0.1, 0);
                sideTuft.rotation.z = offset > 0 ? -0.8 : 0.8;
                sideTuft.rotation.y = Math.random() * 0.3;
                group.add(sideTuft);
            }
        });
        
        // Create emote bubble (speech bubble with emoji)
        const emoteBubble = this.createEmoteBubble(THREE);
        emoteBubble.position.set(0, 1.2, 0);
        emoteBubble.visible = false; // Hidden by default
        group.add(emoteBubble);
        this.emoteBubble = emoteBubble;
        
        // ========== ACCESSORIES GROUP ==========
        const accessoriesGroup = new THREE.Group();
        accessoriesGroup.name = 'accessories';
        group.add(accessoriesGroup);
        
        // Add visual accessories using the rebuild method
        this._rebuildAccessories(THREE, accessoriesGroup);
        
        group.scale.set(0.6, 0.6, 0.6);
        group.position.set(this.position.x, 0.5, this.position.z);
        
        this.mesh = group;
        return group;
    }
    
    // Update accessories when equipped items change
    updateAccessories(THREE) {
        if (!this.mesh) {
            console.warn('Puffle.updateAccessories: No mesh available');
            return;
        }
        
        if (!THREE) {
            console.warn('Puffle.updateAccessories: THREE not provided');
            return;
        }
        
        try {
            // Find or create accessories group
            let accessoriesGroup = this.mesh.getObjectByName('accessories');
            
            if (!accessoriesGroup) {
                // Create it if it doesn't exist
                accessoriesGroup = new THREE.Group();
                accessoriesGroup.name = 'accessories';
                this.mesh.add(accessoriesGroup);
                console.log('🐾 Created new accessories group');
            }
            
            // Rebuild accessories
            this._rebuildAccessories(THREE, accessoriesGroup);
            console.log('🐾 Puffle accessories updated:', this.equippedAccessories);
        } catch (err) {
            console.error('Error in updateAccessories:', err);
        }
    }
    
    // Rebuild accessories with clean slate approach
    _rebuildAccessories(THREE, parent) {
        // Remove all children from parent
        while (parent.children.length > 0) {
            const child = parent.children[0];
            parent.remove(child);
            this._disposeObject(child);
        }
        
        // Add new accessories
        this._createHatMesh(THREE, parent);
        this._createGlassesMesh(THREE, parent);
        this._createNeckwearMesh(THREE, parent);
    }
    
    // Dispose THREE object and its resources
    _disposeObject(obj) {
        if (!obj) return;
        
        if (obj.children) {
            for (const child of [...obj.children]) {
                this._disposeObject(child);
            }
        }
        
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m && m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    }
    
    // Create hat mesh based on equipped hat
    _createHatMesh(THREE, parent) {
        const hatId = this.equippedAccessories?.hat;
        if (!hatId || hatId === 'none') return;
        
        console.log(`Creating hat mesh for: ${hatId}`);
        
        const hatGroup = new THREE.Group();
        hatGroup.name = 'hat_accessory';
        
        try {
            switch (hatId) {
                case 'party':
                    this._buildPartyHat(THREE, hatGroup);
                    break;
                case 'bow':
                    this._buildBowHat(THREE, hatGroup);
                    break;
                case 'tophat':
                    this._buildTopHat(THREE, hatGroup);
                    break;
                case 'crown':
                    this._buildCrown(THREE, hatGroup);
                    break;
                case 'propeller':
                    this._buildPropellerHat(THREE, hatGroup);
                    break;
                case 'pirate':
                    this._buildPirateHat(THREE, hatGroup);
                    break;
                case 'viking':
                    this._buildVikingHelmet(THREE, hatGroup);
                    break;
                default:
                    console.log(`Unknown hat: ${hatId}`);
                    return;
            }
            
            parent.add(hatGroup);
        } catch (err) {
            console.error(`Error creating hat ${hatId}:`, err);
        }
    }
    
    // Individual hat builders
    _buildPartyHat(THREE, group) {
        const cone = new THREE.Mesh(
            new THREE.ConeGeometry(0.2, 0.4, 8),
            new THREE.MeshStandardMaterial({ color: 0xff69b4, roughness: 0.6 })
        );
        cone.position.y = 0.6;
        group.add(cone);
        
        const pom = new THREE.Mesh(
            new THREE.SphereGeometry(0.06, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffff00 })
        );
        pom.position.y = 0.82;
        group.add(pom);
    }
    
    _buildBowHat(THREE, group) {
        const bowMat = new THREE.MeshStandardMaterial({ color: 0xff1493, roughness: 0.5 });
        const loopGeo = new THREE.TorusGeometry(0.1, 0.03, 8, 16);
        
        const leftLoop = new THREE.Mesh(loopGeo, bowMat);
        leftLoop.position.set(-0.1, 0.5, 0);
        leftLoop.rotation.y = Math.PI / 4;
        group.add(leftLoop);
        
        const rightLoop = new THREE.Mesh(loopGeo, bowMat.clone());
        rightLoop.position.set(0.1, 0.5, 0);
        rightLoop.rotation.y = -Math.PI / 4;
        group.add(rightLoop);
        
        const knot = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            bowMat.clone()
        );
        knot.position.set(0, 0.5, 0);
        group.add(knot);
    }
    
    _buildTopHat(THREE, group) {
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.2 });
        
        const brim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16),
            hatMat
        );
        brim.position.y = 0.48;
        group.add(brim);
        
        const top = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.2, 0.35, 16),
            hatMat.clone()
        );
        top.position.y = 0.68;
        group.add(top);
        
        const band = new THREE.Mesh(
            new THREE.CylinderGeometry(0.21, 0.21, 0.05, 16),
            new THREE.MeshStandardMaterial({ color: 0xcc0000 })
        );
        band.position.y = 0.55;
        group.add(band);
    }
    
    _buildCrown(THREE, group) {
        const goldMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, metalness: 0.8, roughness: 0.2,
            emissive: 0xffd700, emissiveIntensity: 0.1
        });
        
        const base = new THREE.Mesh(
            new THREE.TorusGeometry(0.18, 0.04, 8, 16),
            goldMat
        );
        base.position.y = 0.5;
        base.rotation.x = Math.PI / 2;
        group.add(base);
        
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const point = new THREE.Mesh(
                new THREE.ConeGeometry(0.04, 0.15, 4),
                goldMat.clone()
            );
            point.position.set(
                Math.cos(angle) * 0.15,
                0.6,
                Math.sin(angle) * 0.15
            );
            group.add(point);
            
            const gem = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.03),
                new THREE.MeshStandardMaterial({ 
                    color: i % 2 === 0 ? 0xff0000 : 0x0000ff,
                    emissive: i % 2 === 0 ? 0xff0000 : 0x0000ff,
                    emissiveIntensity: 0.3
                })
            );
            gem.position.set(
                Math.cos(angle) * 0.15,
                0.68,
                Math.sin(angle) * 0.15
            );
            group.add(gem);
        }
    }
    
    _buildPropellerHat(THREE, group) {
        const cap = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x3366cc })
        );
        cap.position.y = 0.42;
        group.add(cap);
        
        const hub = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8),
            new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.5 })
        );
        hub.position.y = 0.65;
        group.add(hub);
        
        const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff6600 });
        for (let i = 0; i < 3; i++) {
            const blade = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.02, 0.06),
                bladeMat.clone()
            );
            blade.rotation.y = (i / 3) * Math.PI * 2;
            blade.position.y = 0.7;
            group.add(blade);
        }
    }
    
    _buildPirateHat(THREE, group) {
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
        
        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            hatMat
        );
        dome.position.y = 0.45;
        group.add(dome);
        
        const brim = new THREE.Mesh(
            new THREE.CircleGeometry(0.3, 16),
            hatMat.clone()
        );
        brim.rotation.x = -Math.PI / 2;
        brim.position.y = 0.45;
        group.add(brim);
        
        const skull = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
        );
        skull.position.set(0, 0.52, 0.2);
        group.add(skull);
    }
    
    _buildVikingHelmet(THREE, group) {
        const helmet = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 })
        );
        helmet.position.y = 0.4;
        group.add(helmet);
        
        const hornMat = new THREE.MeshStandardMaterial({ color: 0xfffff0 });
        [-0.2, 0.2].forEach(offset => {
            const horn = new THREE.Mesh(
                new THREE.ConeGeometry(0.05, 0.2, 6),
                hornMat.clone()
            );
            horn.position.set(offset, 0.55, 0);
            horn.rotation.z = offset > 0 ? -0.5 : 0.5;
            group.add(horn);
        });
    }
    
    // Create glasses mesh
    _createGlassesMesh(THREE, parent) {
        const glassesId = this.equippedAccessories?.glasses;
        if (!glassesId || glassesId === 'none') return;
        
        console.log(`Creating glasses mesh for: ${glassesId}`);
        
        const glassesGroup = new THREE.Group();
        glassesGroup.name = 'glasses_accessory';
        glassesGroup.position.z = 0.35;
        glassesGroup.position.y = 0.1;
        
        try {
            switch (glassesId) {
                case 'sunglasses':
                    this._buildSunglasses(THREE, glassesGroup);
                    break;
                case 'nerd':
                    this._buildNerdGlasses(THREE, glassesGroup);
                    break;
                case 'star':
                    this._buildStarGlasses(THREE, glassesGroup);
                    break;
                case 'heart':
                    this._buildHeartGlasses(THREE, glassesGroup);
                    break;
                default:
                    console.log(`Unknown glasses: ${glassesId}`);
                    return;
            }
            
            parent.add(glassesGroup);
        } catch (err) {
            console.error(`Error creating glasses ${glassesId}:`, err);
        }
    }
    
    _buildSunglasses(THREE, group) {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.3 });
        const lensMat = new THREE.MeshStandardMaterial({ 
            color: 0x222222, transparent: true, opacity: 0.7, metalness: 0.5
        });
        
        [-0.12, 0.12].forEach(offset => {
            const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), lensMat.clone());
            lens.position.set(offset, 0, 0.02);
            group.add(lens);
            
            const frame = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 4, 16), frameMat.clone());
            frame.position.set(offset, 0, 0.01);
            group.add(frame);
        });
        
        const bridge = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.02, 0.02),
            frameMat.clone()
        );
        bridge.position.set(0, 0, 0.01);
        group.add(bridge);
    }
    
    _buildNerdGlasses(THREE, group) {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const lensMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff, transparent: true, opacity: 0.3
        });
        
        [-0.12, 0.12].forEach(offset => {
            const lens = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.01), lensMat.clone());
            lens.position.set(offset, 0, 0.02);
            group.add(lens);
            
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.02), frameMat.clone());
            frame.position.set(offset, 0, 0.01);
            group.add(frame);
        });
    }
    
    _buildStarGlasses(THREE, group) {
        const lensMat = new THREE.MeshStandardMaterial({ 
            color: 0xff69b4, transparent: true, opacity: 0.6
        });
        
        [-0.12, 0.12].forEach(offset => {
            const lens = new THREE.Mesh(new THREE.CircleGeometry(0.1, 5), lensMat.clone());
            lens.position.set(offset, 0, 0.02);
            lens.rotation.z = Math.PI / 2;
            group.add(lens);
        });
    }
    
    _buildHeartGlasses(THREE, group) {
        const lensMat = new THREE.MeshStandardMaterial({ 
            color: 0xff1493, emissive: 0xff1493, emissiveIntensity: 0.2
        });
        
        [-0.12, 0.12].forEach(offset => {
            const lens = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), lensMat.clone());
            lens.position.set(offset, 0, 0.02);
            group.add(lens);
        });
    }
    
    // Create neckwear mesh
    _createNeckwearMesh(THREE, parent) {
        const neckwearId = this.equippedAccessories?.neckwear;
        if (!neckwearId || neckwearId === 'none') return;
        
        console.log(`Creating neckwear mesh for: ${neckwearId}`);
        
        const neckwearGroup = new THREE.Group();
        neckwearGroup.name = 'neckwear_accessory';
        neckwearGroup.position.y = -0.25;
        neckwearGroup.position.z = 0.2;
        
        try {
            switch (neckwearId) {
                case 'bowtie':
                    this._buildBowtie(THREE, neckwearGroup);
                    break;
                case 'scarf':
                    this._buildScarf(THREE, neckwearGroup);
                    break;
                case 'bandana':
                    this._buildBandana(THREE, neckwearGroup);
                    break;
                case 'necklace':
                    this._buildNecklace(THREE, neckwearGroup);
                    break;
                default:
                    console.log(`Unknown neckwear: ${neckwearId}`);
                    return;
            }
            
            parent.add(neckwearGroup);
        } catch (err) {
            console.error(`Error creating neckwear ${neckwearId}:`, err);
        }
    }
    
    _buildBowtie(THREE, group) {
        const bowMat = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
        const triGeo = new THREE.ConeGeometry(0.08, 0.12, 3);
        
        const left = new THREE.Mesh(triGeo, bowMat);
        left.rotation.z = Math.PI / 2;
        left.position.x = -0.08;
        group.add(left);
        
        const right = new THREE.Mesh(triGeo.clone(), bowMat.clone());
        right.rotation.z = -Math.PI / 2;
        right.position.x = 0.08;
        group.add(right);
        
        const knot = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 8, 8),
            bowMat.clone()
        );
        group.add(knot);
    }
    
    _buildScarf(THREE, group) {
        const scarfMat = new THREE.MeshStandardMaterial({ color: 0x4169e1 });
        
        const wrap = new THREE.Mesh(
            new THREE.TorusGeometry(0.28, 0.06, 8, 16, Math.PI * 1.5),
            scarfMat
        );
        wrap.rotation.x = Math.PI / 2;
        wrap.position.y = 0.05;
        group.add(wrap);
        
        const end = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.25, 0.04),
            scarfMat.clone()
        );
        end.position.set(0.15, -0.1, 0.15);
        end.rotation.z = 0.3;
        group.add(end);
    }
    
    _buildBandana(THREE, group) {
        const wrap = new THREE.Mesh(
            new THREE.TorusGeometry(0.3, 0.04, 8, 16),
            new THREE.MeshStandardMaterial({ color: 0xff4500 })
        );
        wrap.rotation.x = Math.PI / 2;
        wrap.position.y = 0.05;
        group.add(wrap);
    }
    
    _buildNecklace(THREE, group) {
        const chainMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd700, metalness: 0.8, roughness: 0.2 
        });
        
        const chain = new THREE.Mesh(
            new THREE.TorusGeometry(0.25, 0.02, 4, 32),
            chainMat
        );
        chain.rotation.x = Math.PI / 2;
        chain.position.y = 0.05;
        group.add(chain);
        
        const pendant = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.06),
            new THREE.MeshStandardMaterial({ 
                color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.3
            })
        );
        pendant.position.set(0, -0.15, 0.2);
        group.add(pendant);
    }
    
    // Create the emote bubble sprite
    createEmoteBubble(THREE) {
        // Create canvas for bubble texture
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Draw bubble background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(64, 54, 50, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw bubble tail
        ctx.beginPath();
        ctx.moveTo(50, 95);
        ctx.lineTo(64, 115);
        ctx.lineTo(78, 95);
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(64, 54, 50, 0, Math.PI * 2);
        ctx.stroke();
        
        // Create texture and sprite material
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.2, 1.2, 1);
        sprite.name = 'puffleEmoteBubble'; // Match VoxelWorld's expected name
        sprite.userData = { currentEmoji: null };
        
        return sprite;
    }
    
    // --- SERIALIZATION ---
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            happiness: this.happiness,
            energy: this.energy,
            hunger: this.hunger,
            level: this.level,
            experience: this.experience,
            xpForNextLevel: this.xpForNextLevel,
            trainingStats: this.trainingStats,
            totalPlays: this.totalPlays,
            unlockedTricks: this.unlockedTricks,
            favoriteTrick: this.favoriteTrick,
            ownedToys: this.ownedToys,
            favoriteToy: this.favoriteToy,
            equippedToy: this.equippedToy,
            equippedAccessories: this.equippedAccessories,
            ownedAccessories: this.ownedAccessories,
            foodInventory: this.foodInventory,
            racingStats: this.racingStats,
            inDaycare: this.inDaycare,
            // Rest state
            isSleeping: this.isSleeping,
            sleepStartTime: this.sleepStartTime,
            sleepDuration: this.sleepDuration,
            sleepStartEnergy: this.sleepStartEnergy,
            sleepStartHunger: this.sleepStartHunger,
            sleepStartHappiness: this.sleepStartHappiness,
            // Neglect state
            neglectStartTime: this.neglectStartTime,
            neglectProtectionHours: this.neglectProtectionHours,
            hasRunAway: this.hasRunAway,
            // Position & mood
            position: this.position,
            mood: this.mood
        };
    }
    
    static fromJSON(data) {
        return new Puffle({
            id: data.id,
            name: data.name,
            color: data.color,
            happiness: data.happiness,
            energy: data.energy,
            hunger: data.hunger,
            level: data.level,
            experience: data.experience,
            xpForNextLevel: data.xpForNextLevel,
            trainingStats: data.trainingStats,
            totalPlays: data.totalPlays,
            unlockedTricks: data.unlockedTricks,
            favoriteTrick: data.favoriteTrick,
            ownedToys: data.ownedToys,
            favoriteToy: data.favoriteToy,
            equippedToy: data.equippedToy,
            equippedAccessories: data.equippedAccessories,
            ownedAccessories: data.ownedAccessories,
            foodInventory: data.foodInventory,
            racingStats: data.racingStats,
            inDaycare: data.inDaycare,
            // Rest state
            isSleeping: data.isSleeping,
            sleepStartTime: data.sleepStartTime,
            sleepDuration: data.sleepDuration,
            sleepStartEnergy: data.sleepStartEnergy,
            sleepStartHunger: data.sleepStartHunger,
            sleepStartHappiness: data.sleepStartHappiness,
            // Neglect state
            neglectStartTime: data.neglectStartTime,
            neglectProtectionHours: data.neglectProtectionHours,
            hasRunAway: data.hasRunAway,
            // Position & mood
            mood: data.mood,
            urgentNeed: data.urgentNeed,
            x: data.position?.x,
            z: data.position?.z
        });
    }
    
    // --- UI HELPERS ---
    getMoodEmoji() {
        return Puffle.MOOD_EMOJIS[this.mood] || '😊';
    }
    
    getColorInfo() {
        return Puffle.COLORS[this.color] || Puffle.COLORS.blue;
    }
    
    // Get progress to next trick
    getNextTrickProgress() {
        const nextTrick = this.getNextTrick();
        if (!nextTrick) return { progress: 1, current: this.totalPlays, needed: this.totalPlays, trick: null };
        
        const prevTrick = Object.values(Puffle.TRICKS)
            .filter(t => t.playsRequired < nextTrick.playsRequired)
            .sort((a, b) => b.playsRequired - a.playsRequired)[0];
        
        const start = prevTrick ? prevTrick.playsRequired : 0;
        const end = nextTrick.playsRequired;
        const progress = (this.totalPlays - start) / (end - start);
        
        return {
            progress: Math.min(1, Math.max(0, progress)),
            current: this.totalPlays,
            needed: nextTrick.playsRequired,
            trick: nextTrick
        };
    }
    
    // Get XP progress as percentage
    getXpProgress() {
        return this.experience / this.xpForNextLevel;
    }
    
    // Get stat rating (for display)
    getStatRating(stat) {
        const value = this.trainingStats[stat] || 0;
        if (value >= 500) return 'S';
        if (value >= 300) return 'A';
        if (value >= 150) return 'B';
        if (value >= 50) return 'C';
        return 'D';
    }
    
    // --- FOOD INVENTORY MANAGEMENT ---
    addFood(foodType, quantity = 1) {
        if (!this.foodInventory[foodType]) {
            this.foodInventory[foodType] = 0;
        }
        this.foodInventory[foodType] += quantity;
        return this.foodInventory[foodType];
    }
    
    useFood(foodType) {
        if (!this.foodInventory[foodType] || this.foodInventory[foodType] <= 0) {
            return false;
        }
        this.foodInventory[foodType]--;
        return this.feed(foodType);
    }
    
    getTotalFood() {
        return Object.values(this.foodInventory).reduce((sum, count) => sum + count, 0);
    }
    
    // --- ACCESSORY MANAGEMENT ---
    // Map between singular (equippedAccessories key) and plural (ACCESSORIES/ownedAccessories key)
    static ACCESSORY_KEY_MAP = {
        hat: 'hats',
        hats: 'hats',
        glasses: 'glasses',
        neckwear: 'neckwear'
    };
    
    equipAccessory(category, itemId) {
        // Map category to correct keys
        const pluralKey = Puffle.ACCESSORY_KEY_MAP[category] || category;
        const singularKey = pluralKey === 'hats' ? 'hat' : pluralKey;
        
        // Check accessory exists in ACCESSORIES (uses plural keys)
        if (!Puffle.ACCESSORIES[pluralKey]?.[itemId]) {
            console.warn(`Puffle: Invalid accessory ${itemId} in category ${category}`);
            return false;
        }
        
        // Check if owned (uses plural keys) or if it's 'none' which is always available
        if (itemId !== 'none' && !this.ownedAccessories[pluralKey]?.includes(itemId)) {
            console.warn(`Puffle: Accessory ${itemId} not owned`);
            return false;
        }
        
        // Set equipped (uses singular key for hat, otherwise same)
        this.equippedAccessories[singularKey] = itemId;
        
        console.log(`🐾 Puffle equipped ${itemId} to ${singularKey}`);
        
        // Update visual mesh if it exists
        try {
            const THREE = this._THREE || window.THREE;
            if (this.mesh && THREE) {
                this.updateAccessories(THREE);
            }
        } catch (err) {
            console.error('Error updating puffle accessories:', err);
        }
        
        return true;
    }
    
    unequipAccessory(category) {
        // Map category to singular key for equippedAccessories
        const singularKey = category === 'hats' ? 'hat' : category;
        
        this.equippedAccessories[singularKey] = 'none';
        
        console.log(`🐾 Puffle unequipped ${singularKey}`);
        
        // Update visual mesh if it exists
        try {
            const THREE = this._THREE || window.THREE;
            if (this.mesh && THREE) {
                this.updateAccessories(THREE);
            }
        } catch (err) {
            console.error('Error updating puffle accessories:', err);
        }
        
        return true;
    }
    
    buyAccessory(category, itemId) {
        const accessory = Puffle.ACCESSORIES[category]?.[itemId];
        if (!accessory) return { success: false, error: 'Invalid accessory' };
        
        if (this.ownedAccessories[category]?.includes(itemId)) {
            return { success: false, error: 'Already owned' };
        }
        
        if (!this.ownedAccessories[category]) {
            this.ownedAccessories[category] = [];
        }
        this.ownedAccessories[category].push(itemId);
        
        return { success: true, accessory };
    }
    
    // --- TOY MANAGEMENT ---
    equipToy(toyId) {
        if (!this.ownedToys.includes(toyId)) return false;
        this.equippedToy = toyId;
        return true;
    }
    
    unequipToy() {
        this.equippedToy = null;
        return true;
    }
    
    // Get display description for food
    static getFoodDescription(foodType) {
        const food = Puffle.FOOD[foodType];
        if (!food) return '';
        
        let desc = `Reduces hunger by ${food.hungerReduction}`;
        if (food.happinessBoost) desc += `, +${food.happinessBoost} happiness`;
        if (food.energyBoost) desc += `, +${food.energyBoost} energy`;
        return desc;
    }
    
    // Get display description for toy
    static getToyDescription(toyType) {
        const toy = Puffle.TOYS[toyType];
        if (!toy) return '';
        return `+${toy.happinessBoost} happiness, costs ${toy.energyCost} energy`;
    }
}

export default Puffle;

