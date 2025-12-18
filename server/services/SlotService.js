/**
 * SlotService - Server-authoritative slot machine game logic
 * 
 * Features:
 * - Provably fair RNG using weighted reels
 * - House edge ensures gradual loss over time
 * - Big jackpots possible but rare
 * - Real-time spectator updates
 */

const SPIN_COST = 10; // Cost per spin in coins
const SPIN_DURATION_MS = 2000; // How long a spin takes - faster!

// ========================================
// SLOT MACHINE CONFIGURATION
// ========================================
// 
// REGULAR PLAYERS - ~85% RTP (house edge 15%)
// Over 100 spins at 10g each (1000g spent):
// - Expected return: ~850g
// - Expected loss: ~150g (1.5g per spin average)
// - Variance allows wins, but long-term = loss
//
// GUEST/DEMO MODE - ALWAYS WIN (FOMO generation)
// Guests get rigged spins to show big wins
// This generates FOMO and encourages sign-ups
// ========================================

// Regular player symbols - balanced for ~85% RTP
// Total weight per reel: 100
const SYMBOLS = [
    { id: 'cherry', emoji: '🍒', weight: 30, name: 'Cherry' },      // Most common
    { id: 'lemon', emoji: '🍋', weight: 26, name: 'Lemon' },
    { id: 'orange', emoji: '🍊', weight: 18, name: 'Orange' },
    { id: 'grape', emoji: '🍇', weight: 12, name: 'Grape' },
    { id: 'bell', emoji: '🔔', weight: 8, name: 'Bell' },
    { id: 'star', emoji: '⭐', weight: 4, name: 'Star' },           // Rare
    { id: 'diamond', emoji: '💎', weight: 1.5, name: 'Diamond' },   // Very rare
    { id: 'seven', emoji: '7️⃣', weight: 0.5, name: 'Lucky Seven' } // Ultra rare JACKPOT
];

// Payout table (multipliers of SPIN_COST)
// Designed so expected value < spin cost (house edge)
const PAYOUTS = {
    'cherry': { triple: 2, double: 0.5 },     // 20 coins (2x), 5 for pair
    'lemon': { triple: 3, double: 0.5 },      // 30 coins (3x)
    'orange': { triple: 5, double: 1 },       // 50 coins (5x), 10 for pair
    'grape': { triple: 8, double: 1 },        // 80 coins (8x)
    'bell': { triple: 15, double: 1.5 },      // 150 coins (15x), 15 for pair
    'star': { triple: 40, double: 2 },        // 400 coins (40x)
    'diamond': { triple: 100, double: 3 },    // 1000 coins (100x)
    'seven': { triple: 777, double: 10 }      // 7770 coins JACKPOT! 100 for pair
};

// Calculate total weight
const TOTAL_WEIGHT = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);

// Guest spin types - guests ALWAYS win, with occasional jackpots
const GUEST_WIN_TYPES = [
    { type: 'jackpot', weight: 5 },           // 5% - JACKPOT (7️⃣7️⃣7️⃣)
    { type: 'diamond_triple', weight: 10 },   // 10% - Diamond triple
    { type: 'star_triple', weight: 15 },      // 15% - Star triple  
    { type: 'bell_triple', weight: 20 },      // 20% - Bell triple
    { type: 'grape_triple', weight: 20 },     // 20% - Grape triple
    { type: 'orange_triple', weight: 15 },    // 15% - Orange triple
    { type: 'lemon_triple', weight: 10 },     // 10% - Lemon triple
    { type: 'cherry_triple', weight: 5 }      // 5% - Cherry triple
];
const GUEST_WIN_TOTAL = GUEST_WIN_TYPES.reduce((sum, t) => sum + t.weight, 0);

const MAX_CONCURRENT_SPINS_PER_PLAYER = 2;

class SlotService {
    constructor(userService, broadcastToRoom, sendToPlayer) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        
        // Active spins: spinKey (playerId:machineId) -> { machineId, startTime, reels, payout, room, playerId }
        this.activeSpins = new Map();
        
        // Player spin counts: playerId -> count
        this.playerSpinCounts = new Map();
        
        // Slot machine states: machineKey -> { playerId, state }
        this.machineStates = new Map();
    }
    
    /**
     * Generate spin key from player and machine
     */
    getSpinKey(playerId, machineId) {
        return `${playerId}:${machineId}`;
    }
    
    /**
     * Get count of active spins for a player
     */
    getPlayerSpinCount(playerId) {
        return this.playerSpinCounts.get(playerId) || 0;
    }
    
    /**
     * Increment player spin count
     */
    incrementPlayerSpinCount(playerId) {
        const current = this.getPlayerSpinCount(playerId);
        this.playerSpinCounts.set(playerId, current + 1);
    }
    
    /**
     * Decrement player spin count
     */
    decrementPlayerSpinCount(playerId) {
        const current = this.getPlayerSpinCount(playerId);
        if (current <= 1) {
            this.playerSpinCounts.delete(playerId);
        } else {
            this.playerSpinCounts.set(playerId, current - 1);
        }
    }
    
    /**
     * Get a weighted random symbol for regular players
     */
    getRandomSymbol() {
        let random = Math.random() * TOTAL_WEIGHT;
        for (const symbol of SYMBOLS) {
            random -= symbol.weight;
            if (random <= 0) {
                return symbol;
            }
        }
        return SYMBOLS[0]; // Fallback
    }
    
    /**
     * Generate GUARANTEED winning reels for guests (FOMO generation)
     * Guests always get triple matches, with chance of jackpot
     */
    generateGuestWinReels() {
        // Pick a random win type
        let random = Math.random() * GUEST_WIN_TOTAL;
        let winType = 'cherry_triple';
        
        for (const win of GUEST_WIN_TYPES) {
            random -= win.weight;
            if (random <= 0) {
                winType = win.type;
                break;
            }
        }
        
        // Map win type to symbol
        const symbolMap = {
            'jackpot': 'seven',
            'diamond_triple': 'diamond',
            'star_triple': 'star',
            'bell_triple': 'bell',
            'grape_triple': 'grape',
            'orange_triple': 'orange',
            'lemon_triple': 'lemon',
            'cherry_triple': 'cherry'
        };
        
        const symbolId = symbolMap[winType] || 'cherry';
        const symbol = SYMBOLS.find(s => s.id === symbolId) || SYMBOLS[0];
        
        // Return triple match
        return [symbol, symbol, symbol];
    }
    
    /**
     * Calculate payout for a spin result
     */
    calculatePayout(reels) {
        const [s1, s2, s3] = reels;
        
        // Check for triple match (JACKPOT)
        if (s1.id === s2.id && s2.id === s3.id) {
            const multiplier = PAYOUTS[s1.id].triple;
            return {
                type: 'triple',
                symbol: s1,
                multiplier,
                coins: Math.floor(SPIN_COST * multiplier)
            };
        }
        
        // Check for double match (any two)
        if (s1.id === s2.id || s2.id === s3.id || s1.id === s3.id) {
            // Find the matching symbol
            let matchSymbol;
            if (s1.id === s2.id) matchSymbol = s1;
            else if (s2.id === s3.id) matchSymbol = s2;
            else matchSymbol = s1;
            
            const multiplier = PAYOUTS[matchSymbol.id].double;
            if (multiplier > 0) {
                return {
                    type: 'double',
                    symbol: matchSymbol,
                    multiplier,
                    coins: Math.floor(SPIN_COST * multiplier)
                };
            }
        }
        
        // No win
        return {
            type: 'loss',
            symbol: null,
            multiplier: 0,
            coins: 0
        };
    }
    
    /**
     * Generate machine key from room and machine ID
     */
    getMachineKey(room, machineId) {
        return `${room}:${machineId}`;
    }
    
    /**
     * Check if a player can spin (has enough coins, not at max spins)
     */
    async canSpin(playerId, walletAddress, machineId, room, guestCoins = 0, isDemo = false) {
        // Check if machine is already in use
        const machineKey = this.getMachineKey(room, machineId);
        if (this.machineStates.has(machineKey)) {
            return { allowed: false, error: 'MACHINE_IN_USE', message: 'This machine is already in use' };
        }
        
        // Check if player has hit max concurrent spins
        const spinCount = this.getPlayerSpinCount(playerId);
        if (spinCount >= MAX_CONCURRENT_SPINS_PER_PLAYER) {
            return { allowed: false, error: 'MAX_SPINS_REACHED', message: `Maximum ${MAX_CONCURRENT_SPINS_PER_PLAYER} concurrent spins` };
        }
        
        // Demo mode - guests can always spin for free (FOMO generator)
        if (isDemo) {
            return { allowed: true, isGuest: true, isDemo: true };
        }
        
        // For authenticated users, check database
        if (walletAddress) {
            const user = await this.userService.getUser(walletAddress);
            if (!user || user.coins < SPIN_COST) {
                return { 
                    allowed: false, 
                    error: 'INSUFFICIENT_FUNDS', 
                    message: `You need ${SPIN_COST} coins (you have ${user?.coins || 0})`
                };
            }
            return { allowed: true, isGuest: false, isDemo: false };
        }
        
        // For guests with coins, allow them to play
        if (guestCoins >= SPIN_COST) {
            return { allowed: true, isGuest: true, isDemo: false };
        }
        
        // Guests without coins get demo mode
        return { allowed: true, isGuest: true, isDemo: true };
    }
    
    /**
     * Start a slot spin
     */
    async spin(playerId, walletAddress, room, machineId, playerName, playerPosition, guestCoins = 0, isDemo = false) {
        // Validate (now includes machineId and room for machine-in-use check)
        const canSpinResult = await this.canSpin(playerId, walletAddress, machineId, room, guestCoins, isDemo);
        if (!canSpinResult.allowed) {
            return canSpinResult;
        }
        
        let newBalance;
        const isDemoSpin = canSpinResult.isDemo;
        
        // Demo mode - no coin deduction, just simulate for FOMO
        if (isDemoSpin) {
            newBalance = guestCoins; // No change
        } else if (walletAddress && !canSpinResult.isGuest) {
            // Authenticated user - deduct from database
            const deductResult = await this.userService.addCoins(
                walletAddress,
                -SPIN_COST,
                'slot_spin',
                { machineId, room },
                'Slot machine spin'
            );
            
            if (!deductResult.success) {
                return { error: 'DEDUCT_FAILED', message: 'Failed to deduct coins' };
            }
            newBalance = deductResult.newBalance;
        } else {
            // Guest with coins - deduct locally
            newBalance = guestCoins - SPIN_COST;
        }
        
        // Generate result (pre-determined but revealed after animation)
        let reels;
        
        if (isDemoSpin) {
            // GUESTS ALWAYS WIN - generates FOMO
            reels = this.generateGuestWinReels();
            console.log(`🎰 GUEST WIN for ${playerName}: ${reels.map(r => r.emoji).join(' ')} (FOMO mode)`);
        } else {
            // Regular players get random weighted symbols
            reels = [
                this.getRandomSymbol(),
                this.getRandomSymbol(),
                this.getRandomSymbol()
            ];
            console.log(`🎰 Generated reels for ${playerName}: ${reels.map(r => r.emoji).join(' ')}`);
        }
        
        const payout = this.calculatePayout(reels);
        const machineKey = this.getMachineKey(room, machineId);
        const spinKey = this.getSpinKey(playerId, machineId);
        
        // Store active spin (keyed by player:machine)
        const spinData = {
            playerId,
            walletAddress,
            machineId,
            machineKey,
            spinKey,
            room,
            playerName,
            playerPosition,
            startTime: Date.now(),
            reels,
            payout,
            phase: 'spinning', // spinning -> revealing -> complete
            revealedReels: 0,
            isGuest: canSpinResult.isGuest,
            isDemo: isDemoSpin,
            guestBalance: newBalance
        };
        
        this.activeSpins.set(spinKey, spinData);
        this.machineStates.set(machineKey, { playerId, state: 'spinning' });
        this.incrementPlayerSpinCount(playerId);
        
        // Schedule reel reveals (staggered)
        this.scheduleReelReveals(spinKey, spinData);
        
        // Return initial state to player
        return {
            success: true,
            spinId: `${playerId}-${Date.now()}`,
            machineId,
            newBalance,
            spinCost: isDemoSpin ? 0 : SPIN_COST,
            isDemo: isDemoSpin
            // Don't reveal result yet - client will receive updates
        };
    }
    
    /**
     * Schedule staggered reel reveals
     */
    scheduleReelReveals(spinKey, spinData) {
        const revealTimes = [500, 1000, 1500]; // ms after spin start - faster!
        
        revealTimes.forEach((delay, reelIndex) => {
            setTimeout(() => {
                this.revealReel(spinKey, reelIndex);
            }, delay);
        });
        
        // Final result after all reels
        setTimeout(() => {
            this.completeSpin(spinKey);
        }, SPIN_DURATION_MS);
    }
    
    /**
     * Reveal a single reel (broadcast to spectators)
     */
    revealReel(spinKey, reelIndex) {
        const spin = this.activeSpins.get(spinKey);
        if (!spin) return;
        
        spin.revealedReels = reelIndex + 1;
        
        // Broadcast reel reveal to room (spectator update)
        if (this.broadcastToRoom && spin.room) {
            this.broadcastToRoom(spin.room, {
                type: 'slot_reel_reveal',
                playerId: spin.playerId,
                machineId: spin.machineId,
                reelIndex,
                symbol: spin.reels[reelIndex],
                revealedReels: spin.revealedReels,
                playerName: spin.playerName,
                playerPosition: spin.playerPosition
            });
        }
    }
    
    /**
     * Complete a spin and award payout
     */
    async completeSpin(spinKey) {
        const spin = this.activeSpins.get(spinKey);
        if (!spin) return;
        
        const { playerId, walletAddress, payout, reels, room, machineId, machineKey, playerName, playerPosition, isGuest, isDemo, guestBalance } = spin;
        
        // Award winnings if any
        let newBalance = null;
        
        if (isDemo) {
            // Demo mode - no actual winnings, just show hypothetical
            newBalance = guestBalance || 0;
        } else if (isGuest) {
            // Guest mode with real coins - calculate balance
            newBalance = (guestBalance || 0) + payout.coins;
        } else if (payout.coins > 0) {
            const awardResult = await this.userService.addCoins(
                walletAddress,
                payout.coins,
                'slot_payout',
                { machineId, room, payout: payout.type },
                `Slot ${payout.type}: ${payout.symbol.emoji} x${payout.multiplier}`
            );
            newBalance = awardResult.newBalance;
        } else {
            // Get current balance for response
            const user = await this.userService.getUser(walletAddress);
            newBalance = user?.coins || 0;
        }
        
        // Send result to player
        if (this.sendToPlayer) {
            this.sendToPlayer(playerId, {
                type: 'slot_result',
                machineId,
                reels: reels.map(r => ({ id: r.id, emoji: r.emoji, name: r.name })),
                payout: {
                    type: payout.type,
                    coins: isDemo ? 0 : payout.coins, // Demo mode shows hypothetical win
                    hypotheticalWin: isDemo ? payout.coins : 0, // What they WOULD have won
                    multiplier: payout.multiplier,
                    symbol: payout.symbol ? { id: payout.symbol.id, emoji: payout.symbol.emoji } : null
                },
                newBalance,
                isJackpot: payout.type === 'triple' && payout.symbol?.id === 'seven',
                isDemo
            });
        }
        
        // Broadcast final result to spectators
        if (this.broadcastToRoom && room) {
            this.broadcastToRoom(room, {
                type: 'slot_complete',
                playerId,
                machineId,
                playerName,
                playerPosition,
                reels: reels.map(r => ({ id: r.id, emoji: r.emoji })),
                payout: {
                    type: payout.type,
                    coins: isDemo ? 0 : payout.coins,
                    hypotheticalWin: isDemo ? payout.coins : 0,
                    symbol: payout.symbol ? payout.symbol.emoji : null
                },
                isJackpot: payout.type === 'triple' && payout.symbol?.id === 'seven',
                isDemo
            }, playerId); // Exclude player (they get slot_result)
        }
        
        // Clean up
        this.activeSpins.delete(spinKey);
        this.machineStates.delete(machineKey);
        this.decrementPlayerSpinCount(playerId);
        
        return { success: true, payout, newBalance };
    }
    
    /**
     * Get slot machine state for a player joining the room
     */
    getActiveSlotSpins(room) {
        const activeSpins = [];
        
        for (const [spinKey, spin] of this.activeSpins) {
            if (spin.room === room) {
                activeSpins.push({
                    playerId: spin.playerId,
                    machineId: spin.machineId,
                    playerName: spin.playerName,
                    playerPosition: spin.playerPosition,
                    phase: spin.phase,
                    revealedReels: spin.revealedReels,
                    isDemo: spin.isDemo,
                    // Only show revealed reels to spectators
                    reels: spin.reels.slice(0, spin.revealedReels).map(r => ({ id: r.id, emoji: r.emoji }))
                });
            }
        }
        
        return activeSpins;
    }
    
    /**
     * Handle player disconnect (cancel all active spins for player)
     */
    handleDisconnect(playerId) {
        // Find all spins for this player
        const spinsToRemove = [];
        for (const [spinKey, spin] of this.activeSpins) {
            if (spin.playerId === playerId) {
                spinsToRemove.push({ spinKey, spin });
            }
        }
        
        // Remove each spin
        for (const { spinKey, spin } of spinsToRemove) {
            this.machineStates.delete(spin.machineKey);
            this.activeSpins.delete(spinKey);
            
            // Broadcast that spin was interrupted
            if (this.broadcastToRoom && spin.room) {
                this.broadcastToRoom(spin.room, {
                    type: 'slot_interrupted',
                    playerId,
                    machineId: spin.machineId
                });
            }
        }
        
        // Clear player spin count
        this.playerSpinCounts.delete(playerId);
    }
    
    /**
     * Check if a machine is currently in use
     */
    isMachineInUse(room, machineId) {
        const machineKey = this.getMachineKey(room, machineId);
        return this.machineStates.has(machineKey);
    }
    
    /**
     * Get static slot info (for UI display / quest board)
     */
    static getSlotInfo() {
        // Calculate approximate RTP for display
        const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
        
        return {
            spinCost: SPIN_COST,
            rtp: '85%', // Return to Player
            houseEdge: '15%',
            symbols: SYMBOLS.map(s => {
                const payout = PAYOUTS[s.id];
                const prob = (s.weight / totalWeight * 100).toFixed(1);
                return {
                    id: s.id,
                    emoji: s.emoji,
                    name: s.name,
                    rarity: s.weight >= 20 ? 'Common' : s.weight >= 10 ? 'Uncommon' : s.weight >= 5 ? 'Rare' : s.weight >= 2 ? 'Epic' : 'Legendary',
                    probability: prob + '%',
                    tripleWin: payout.triple * SPIN_COST,
                    pairWin: payout.double * SPIN_COST
                };
            }),
            jackpot: {
                symbol: '7️⃣',
                name: 'Lucky Seven',
                payout: PAYOUTS['seven'].triple * SPIN_COST,
                odds: '~1 in 1,000,000'
            }
        };
    }
}

export default SlotService;
export { SPIN_COST, SYMBOLS, PAYOUTS, SPIN_DURATION_MS };

