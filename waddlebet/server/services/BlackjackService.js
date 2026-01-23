/**
 * BlackjackService - PvE Blackjack at Casino Tables
 * 
 * Server-authoritative game logic for playing against the house (dealer NPC)
 * - Uses in-game gold coins only (no SPL tokens)
 * - House edge via standard blackjack rules
 * - Supports up to 4 players per table simultaneously
 * - Each player plays independently against the dealer
 * 
 * Payouts:
 * - Standard win: 1:1
 * - Blackjack: 3:2
 * - Insurance (if dealer shows Ace): 2:1
 * - Push: Bet returned
 */

// Constants
const SUITS = ['♥', '♦', '♣', '♠'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const MAX_BET = 5000;
const MIN_BET = 10;
const MAX_PLAYERS_PER_TABLE = 4;
const TURN_TIMEOUT_MS = 30000; // 30 seconds per action

// Create and shuffle a deck
function createDeck(numDecks = 6) {
    const deck = [];
    let uid = 0;
    for (let d = 0; d < numDecks; d++) {
        for (const suit of SUITS) {
            for (const value of VALUES) {
                deck.push({ suit, value, uid: uid++ });
            }
        }
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Calculate hand value
function calculateScore(hand) {
    let score = 0;
    let aces = 0;
    
    for (const card of hand) {
        if (['J','Q','K'].includes(card.value)) {
            score += 10;
        } else if (card.value === 'A') {
            score += 11;
            aces++;
        } else {
            score += parseInt(card.value);
        }
    }
    
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    
    return score;
}

// Check if hand is a natural blackjack (21 with 2 cards)
function isBlackjack(hand) {
    return hand.length === 2 && calculateScore(hand) === 21;
}

class BlackjackService {
    constructor(userService, broadcastToRoom, sendToPlayer) {
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        
        // Active tables: tableId -> table state
        this.tables = new Map();
        
        // Player to table mapping: playerId -> tableId
        this.playerTables = new Map();
        
        // Timer interval for turn timeouts
        this.timerInterval = setInterval(() => this.checkTimeouts(), 1000);
    }
    
    /**
     * Initialize a blackjack table
     */
    initializeTable(tableId, position = { x: 0, z: 0 }) {
        if (this.tables.has(tableId)) return this.tables.get(tableId);
        
        const table = {
            id: tableId,
            position,
            deck: createDeck(6), // 6-deck shoe
            cutCardPosition: Math.floor(Math.random() * 50) + 250, // Reshuffle around 5 decks
            cardsDealt: 0,
            
            // Players at the table (seatIndex -> player data)
            players: new Map(),
            
            // Game state
            phase: 'betting', // 'betting' | 'dealing' | 'playing' | 'dealer' | 'payout'
            currentSeat: -1, // Which seat is currently playing (-1 = dealer)
            dealerHand: [],
            dealerScore: 0,
            
            createdAt: Date.now(),
            lastActivity: Date.now()
        };
        
        this.tables.set(tableId, table);
        return table;
    }
    
    /**
     * Player sits at a table
     */
    async sitAtTable(playerId, playerName, walletAddress, tableId, seatIndex) {
        let table = this.tables.get(tableId);
        if (!table) {
            table = this.initializeTable(tableId);
        }
        
        // Validate seat
        if (seatIndex < 0 || seatIndex >= MAX_PLAYERS_PER_TABLE) {
            return { error: 'INVALID_SEAT' };
        }
        
        if (table.players.has(seatIndex)) {
            return { error: 'SEAT_TAKEN' };
        }
        
        // Check if player is already at another table
        if (this.playerTables.has(playerId)) {
            return { error: 'ALREADY_AT_TABLE' };
        }
        
        // Add player to table
        const playerData = {
            id: playerId,
            name: playerName,
            wallet: walletAddress,
            seatIndex,
            hand: [],
            splitHand: null,
            bet: 0,
            splitBet: 0,
            insuranceBet: 0,
            status: 'waiting', // 'waiting' | 'betting' | 'playing' | 'stand' | 'bust' | 'blackjack' | 'surrender'
            result: null,
            payout: 0,
            splitResult: null,
            splitPayout: 0,
            turnStartedAt: null
        };
        
        table.players.set(seatIndex, playerData);
        this.playerTables.set(playerId, tableId);
        table.lastActivity = Date.now();
        
        console.log(`🎰 ${playerName} sat at blackjack table ${tableId}, seat ${seatIndex}`);
        
        return { 
            success: true, 
            table: this.getTableState(tableId, playerId),
            seatIndex 
        };
    }
    
    /**
     * Player leaves the table
     */
    async leaveTable(playerId) {
        const tableId = this.playerTables.get(playerId);
        if (!tableId) return { error: 'NOT_AT_TABLE' };
        
        const table = this.tables.get(tableId);
        if (!table) return { error: 'TABLE_NOT_FOUND' };
        
        // Find player's seat
        let playerSeat = -1;
        for (const [seat, player] of table.players) {
            if (player.id === playerId) {
                playerSeat = seat;
                break;
            }
        }
        
        if (playerSeat === -1) return { error: 'NOT_AT_TABLE' };
        
        const player = table.players.get(playerSeat);
        
        // If player has an active bet and game is in progress, they forfeit
        if (player.bet > 0 && table.phase !== 'betting') {
            console.log(`🎰 ${player.name} forfeited ${player.bet} coins by leaving mid-game`);
            // Bet is already deducted, no refund
        }
        
        // Remove player
        table.players.delete(playerSeat);
        this.playerTables.delete(playerId);
        
        // Clean up empty table after a delay
        if (table.players.size === 0) {
            setTimeout(() => {
                const t = this.tables.get(tableId);
                if (t && t.players.size === 0) {
                    this.tables.delete(tableId);
                    console.log(`🎰 Empty blackjack table ${tableId} removed`);
                }
            }, 60000);
        }
        
        console.log(`🎰 Player left blackjack table ${tableId}`);
        
        return { success: true };
    }
    
    /**
     * Place a bet
     */
    async placeBet(playerId, amount) {
        const tableId = this.playerTables.get(playerId);
        if (!tableId) return { error: 'NOT_AT_TABLE' };
        
        const table = this.tables.get(tableId);
        if (!table) return { error: 'TABLE_NOT_FOUND' };
        
        if (table.phase !== 'betting') return { error: 'NOT_BETTING_PHASE' };
        
        // Find player
        let player = null;
        for (const [, p] of table.players) {
            if (p.id === playerId) {
                player = p;
                break;
            }
        }
        if (!player) return { error: 'NOT_AT_TABLE' };
        
        // Validate bet amount
        if (amount < MIN_BET || amount > MAX_BET) {
            return { error: 'INVALID_BET', minBet: MIN_BET, maxBet: MAX_BET };
        }
        
        // Check player balance
        const balance = await this.userService?.getUserCoins?.(player.wallet || playerId) ?? 0;
        if (balance < amount) {
            return { error: 'INSUFFICIENT_FUNDS', balance };
        }
        
        // Deduct bet from player
        if (this.userService?.updateCoins) {
            await this.userService.updateCoins(player.wallet || playerId, -amount);
        }
        
        player.bet = amount;
        player.status = 'betting';
        table.lastActivity = Date.now();
        
        // For single player, start dealing immediately
        // For multiplayer, wait for all bets
        let allBetsIn = true;
        for (const [, p] of table.players) {
            if (p.bet === 0) {
                allBetsIn = false;
                break;
            }
        }
        
        if (allBetsIn && table.players.size > 0) {
            this._startDealing(table);
            // Broadcast state to all players after dealing
            this._broadcastTableState(table);
        }
        
        return { 
            success: true, 
            bet: amount,
            table: this.getTableState(tableId, playerId)
        };
    }
    
    /**
     * Start dealing cards
     */
    _startDealing(table) {
        table.phase = 'dealing';
        
        // Check if we need to reshuffle
        if (table.cardsDealt > table.cutCardPosition) {
            table.deck = createDeck(6);
            table.cardsDealt = 0;
            table.cutCardPosition = Math.floor(Math.random() * 50) + 250;
            console.log(`🎰 Table ${table.id} reshuffled`);
        }
        
        // Deal initial cards: each player gets 2, dealer gets 2 (one hidden)
        const seatIndices = Array.from(table.players.keys()).sort((a, b) => a - b);
        
        // First round - one card each
        for (const seat of seatIndices) {
            const player = table.players.get(seat);
            player.hand = [table.deck.pop()];
            table.cardsDealt++;
        }
        
        // Dealer first card (face down - hole card)
        table.dealerHand = [{ ...table.deck.pop(), hidden: true }];
        table.cardsDealt++;
        
        // Second round - one card each
        for (const seat of seatIndices) {
            const player = table.players.get(seat);
            player.hand.push(table.deck.pop());
            table.cardsDealt++;
            
            // Check for blackjack
            if (isBlackjack(player.hand)) {
                player.status = 'blackjack';
            } else {
                player.status = 'waiting';
            }
        }
        
        // Dealer second card (face up)
        table.dealerHand.push(table.deck.pop());
        table.cardsDealt++;
        
        // Calculate visible dealer score (only the face-up card)
        table.dealerScore = calculateScore([table.dealerHand[1]]);
        
        // Check if dealer has blackjack possibility (Ace showing)
        // In real casinos, insurance would be offered here
        
        // Start playing phase - find first player to act
        table.phase = 'playing';
        this._nextPlayer(table);
    }
    
    /**
     * Move to next player or dealer
     */
    _nextPlayer(table) {
        const seatIndices = Array.from(table.players.keys()).sort((a, b) => a - b);
        
        // Find next player who needs to act
        let foundCurrent = table.currentSeat === -1;
        for (const seat of seatIndices) {
            if (!foundCurrent && seat === table.currentSeat) {
                foundCurrent = true;
                continue;
            }
            
            if (foundCurrent) {
                const player = table.players.get(seat);
                // Skip players who have blackjack, bust, or stood
                if (player.status === 'waiting' || player.status === 'playing') {
                    table.currentSeat = seat;
                    player.status = 'playing';
                    player.turnStartedAt = Date.now();
                    return;
                }
            }
        }
        
        // No more players - dealer's turn
        table.currentSeat = -1;
        this._dealerPlay(table);
    }
    
    /**
     * Handle player action
     */
    async playerAction(playerId, action) {
        const tableId = this.playerTables.get(playerId);
        if (!tableId) return { error: 'NOT_AT_TABLE' };
        
        const table = this.tables.get(tableId);
        if (!table) return { error: 'TABLE_NOT_FOUND' };
        
        if (table.phase !== 'playing') return { error: 'NOT_PLAYING_PHASE' };
        
        // Find player
        let player = null;
        let playerSeat = -1;
        for (const [seat, p] of table.players) {
            if (p.id === playerId) {
                player = p;
                playerSeat = seat;
                break;
            }
        }
        if (!player) return { error: 'NOT_AT_TABLE' };
        
        // Check if it's this player's turn
        if (table.currentSeat !== playerSeat) return { error: 'NOT_YOUR_TURN' };
        
        // Handle action
        switch (action.type) {
            case 'hit':
                return this._playerHit(table, player, playerSeat);
                
            case 'stand':
                return this._playerStand(table, player, playerSeat);
                
            case 'double':
                return this._playerDouble(table, player, playerSeat);
                
            case 'split':
                return this._playerSplit(table, player, playerSeat);
                
            case 'surrender':
                return this._playerSurrender(table, player, playerSeat);
                
            default:
                return { error: 'INVALID_ACTION' };
        }
    }
    
    _playerHit(table, player, seat) {
        const card = table.deck.pop();
        player.hand.push(card);
        table.cardsDealt++;
        
        const score = calculateScore(player.hand);
        
        if (score > 21) {
            player.status = 'bust';
            player.result = 'lose';
            this._nextPlayer(table);
        } else if (score === 21) {
            // Auto-stand on 21
            player.status = 'stand';
            this._nextPlayer(table);
        }
        
        table.lastActivity = Date.now();
        
        return { 
            success: true, 
            card,
            score,
            table: this.getTableState(table.id, player.id)
        };
    }
    
    _playerStand(table, player, seat) {
        player.status = 'stand';
        this._nextPlayer(table);
        
        table.lastActivity = Date.now();
        
        return { 
            success: true,
            table: this.getTableState(table.id, player.id)
        };
    }
    
    async _playerDouble(table, player, seat) {
        // Can only double on first two cards
        if (player.hand.length !== 2) {
            return { error: 'CANNOT_DOUBLE' };
        }
        
        // Check player has funds
        const balance = await this.userService?.getUserCoins?.(player.wallet || player.id) ?? 0;
        if (balance < player.bet) {
            return { error: 'INSUFFICIENT_FUNDS' };
        }
        
        // Deduct additional bet
        if (this.userService?.updateCoins) {
            await this.userService.updateCoins(player.wallet || player.id, -player.bet);
        }
        player.bet *= 2;
        
        // Get one more card then stand
        const card = table.deck.pop();
        player.hand.push(card);
        table.cardsDealt++;
        
        const score = calculateScore(player.hand);
        
        if (score > 21) {
            player.status = 'bust';
            player.result = 'lose';
        } else {
            player.status = 'stand';
        }
        
        this._nextPlayer(table);
        table.lastActivity = Date.now();
        
        return { 
            success: true, 
            card,
            score,
            newBet: player.bet,
            table: this.getTableState(table.id, player.id)
        };
    }
    
    async _playerSplit(table, player, seat) {
        // Can only split with two cards of same value
        if (player.hand.length !== 2) return { error: 'CANNOT_SPLIT' };
        
        const card1Value = player.hand[0].value;
        const card2Value = player.hand[1].value;
        if (card1Value !== card2Value) return { error: 'CANNOT_SPLIT' };
        
        // Check player has funds for second bet
        const balance = await this.userService?.getUserCoins?.(player.wallet || player.id) ?? 0;
        if (balance < player.bet) {
            return { error: 'INSUFFICIENT_FUNDS' };
        }
        
        // Deduct additional bet
        if (this.userService?.updateCoins) {
            await this.userService.updateCoins(player.wallet || player.id, -player.bet);
        }
        
        // Create split hand
        player.splitHand = [player.hand.pop()];
        player.splitBet = player.bet;
        
        // Deal one card to each hand
        player.hand.push(table.deck.pop());
        player.splitHand.push(table.deck.pop());
        table.cardsDealt += 2;
        
        table.lastActivity = Date.now();
        
        return { 
            success: true,
            table: this.getTableState(table.id, player.id)
        };
    }
    
    async _playerSurrender(table, player, seat) {
        // Can only surrender on first action with two cards
        if (player.hand.length !== 2) {
            return { error: 'CANNOT_SURRENDER' };
        }
        
        player.status = 'surrender';
        player.result = 'surrender';
        player.payout = Math.floor(player.bet / 2); // Return half the bet
        
        // Return half bet to player
        if (this.userService?.updateCoins) {
            await this.userService.updateCoins(player.wallet || player.id, player.payout);
        }
        
        this._nextPlayer(table);
        table.lastActivity = Date.now();
        
        return { 
            success: true,
            payout: player.payout,
            table: this.getTableState(table.id, player.id)
        };
    }
    
    /**
     * Dealer plays (after all players have acted)
     */
    _dealerPlay(table) {
        table.phase = 'dealer';
        
        // Reveal hole card
        table.dealerHand[0].hidden = false;
        table.dealerScore = calculateScore(table.dealerHand);
        
        // Check if all players busted - dealer wins automatically
        let allBusted = true;
        for (const [, player] of table.players) {
            if (player.status !== 'bust' && player.status !== 'surrender' && player.bet > 0) {
                allBusted = false;
                break;
            }
        }
        
        if (!allBusted) {
            // Dealer draws to 17+ (standard casino rules: stand on soft 17)
            while (table.dealerScore < 17) {
                const card = table.deck.pop();
                table.dealerHand.push(card);
                table.cardsDealt++;
                table.dealerScore = calculateScore(table.dealerHand);
            }
        }
        
        // Payout phase
        this._processPayout(table);
    }
    
    /**
     * Process payouts for all players
     */
    async _processPayout(table) {
        table.phase = 'payout';
        
        const dealerScore = table.dealerScore;
        const dealerBust = dealerScore > 21;
        const dealerBlackjack = isBlackjack(table.dealerHand);
        
        for (const [, player] of table.players) {
            if (player.bet === 0 && player.splitBet === 0) continue;
            
            const walletAddress = player.wallet;
            if (!walletAddress) {
                console.error(`🎰 ERROR: Cannot payout to ${player.name} (playerId: ${player.id}) - no wallet address`);
                continue;
            }
            
            if (!this.userService?.updateCoins) {
                console.error(`🎰 ERROR: Cannot payout - userService.updateCoins not available`);
                continue;
            }
            
            let totalPayout = 0;
            
            // Process main hand
            if (player.bet > 0) {
                const playerScore = calculateScore(player.hand);
                // Blackjack can only occur with exactly 2 cards - if player doubled or hit, they can't have blackjack
                const playerBJ = player.status === 'blackjack' && player.hand.length === 2;
                
                // Already handled: surrender, bust
                if (!player.result) {
                    // Calculate result for main hand
                    if (playerBJ && !dealerBlackjack) {
                        // Player blackjack beats dealer (3:2 payout)
                        player.result = 'blackjack';
                        player.payout = player.bet + Math.floor(player.bet * 1.5);
                    } else if (playerBJ && dealerBlackjack) {
                        // Push - both have blackjack
                        player.result = 'push';
                        player.payout = player.bet;
                    } else if (dealerBlackjack) {
                        // Dealer blackjack
                        player.result = 'lose';
                        player.payout = 0;
                    } else if (dealerBust) {
                        // Dealer bust, player wins
                        player.result = 'win';
                        player.payout = player.bet * 2;
                    } else if (playerScore > dealerScore) {
                        // Player higher score
                        player.result = 'win';
                        player.payout = player.bet * 2;
                    } else if (playerScore < dealerScore) {
                        // Dealer higher score
                        player.result = 'lose';
                        player.payout = 0;
                    } else {
                        // Push
                        player.result = 'push';
                        player.payout = player.bet;
                    }
                } else {
                    // Result already set (bust, surrender) - ensure payout is 0 if not set
                    if (player.payout === undefined || player.payout === null) {
                        player.payout = 0;
                    }
                }
                
                totalPayout += player.payout || 0;
            }
            
            // Process split hand if it exists
            if (player.splitHand && player.splitBet > 0) {
                const splitScore = calculateScore(player.splitHand);
                const splitBJ = player.splitHand.length === 2 && calculateScore(player.splitHand) === 21;
                let splitResult = null;
                let splitPayout = 0;
                
                // Calculate result for split hand
                if (splitBJ && !dealerBlackjack) {
                    // Split hand blackjack (3:2 payout)
                    splitResult = 'blackjack';
                    splitPayout = player.splitBet + Math.floor(player.splitBet * 1.5);
                } else if (splitBJ && dealerBlackjack) {
                    // Push - both have blackjack
                    splitResult = 'push';
                    splitPayout = player.splitBet;
                } else if (dealerBlackjack) {
                    // Dealer blackjack
                    splitResult = 'lose';
                    splitPayout = 0;
                } else if (dealerBust) {
                    // Dealer bust, split hand wins
                    splitResult = 'win';
                    splitPayout = player.splitBet * 2;
                } else if (splitScore > dealerScore) {
                    // Split hand higher score
                    splitResult = 'win';
                    splitPayout = player.splitBet * 2;
                } else if (splitScore < dealerScore) {
                    // Dealer higher score
                    splitResult = 'lose';
                    splitPayout = 0;
                } else {
                    // Push
                    splitResult = 'push';
                    splitPayout = player.splitBet;
                }
                
                // Store split hand result (for display purposes)
                player.splitResult = splitResult;
                player.splitPayout = splitPayout;
                totalPayout += splitPayout;
            }
            
            // Pay out total (main hand + split hand if applicable)
            if (totalPayout > 0) {
                try {
                    // Credit the payout (payout already includes bet + winnings)
                    const coinResult = await this.userService.updateCoins(walletAddress, totalPayout);
                    
                    if (!coinResult.success) {
                        console.error(`🎰 ERROR: Payout failed for ${player.name}: ${coinResult.error}`);
                        continue;
                    }
                    
                    const mainResult = player.result || 'none';
                    const splitResult = player.splitResult || '';
                    const resultStr = splitResult ? `${mainResult}/${splitResult}` : mainResult;
                    const isBlackjackWin = mainResult === 'blackjack' || splitResult === 'blackjack';
                    
                    console.log(`🎰 ${player.name}: ${resultStr}${isBlackjackWin ? ' - BLACKJACK!' : ''} Main Bet: ${player.bet}, Split Bet: ${player.splitBet || 0}, Total Payout: ${totalPayout}, New Balance: ${coinResult.newBalance || 'unknown'}`);
                    
                    // Send coins update to player
                    const newBalance = coinResult.newBalance || await this.userService.getUserCoins(walletAddress);
                    this.sendToPlayer?.(player.id, {
                        type: 'coins_update',
                        coins: newBalance,
                        isAuthenticated: true
                    });
                } catch (error) {
                    console.error(`🎰 ERROR: Exception during payout for ${player.name}:`, error);
                }
            } else {
                // Loss - no payout (bet was already deducted)
                console.log(`🎰 ${player.name}: Loss - Bet: ${player.bet}, Split Bet: ${player.splitBet || 0}, Payout: 0`);
            }
        }
        
        // Broadcast results
        this._broadcastTableState(table);
        
        // Reset for next round after delay
        setTimeout(() => {
            this._resetRound(table);
        }, 5000);
    }
    
    /**
     * Reset table for next round
     */
    _resetRound(table) {
        table.phase = 'betting';
        table.currentSeat = -1;
        table.dealerHand = [];
        table.dealerScore = 0;
        
        // Reset each player
        for (const [, player] of table.players) {
            player.hand = [];
            player.splitHand = null;
            player.bet = 0;
            player.splitBet = 0;
            player.insuranceBet = 0;
            player.status = 'waiting';
            player.result = null;
            player.payout = 0;
            player.splitResult = null;
            player.splitPayout = 0;
            player.turnStartedAt = null;
        }
        
        // Broadcast new betting phase
        this._broadcastTableState(table);
    }
    
    /**
     * Get table state for a specific player
     */
    getTableState(tableId, playerId) {
        const table = this.tables.get(tableId);
        if (!table) return null;
        
        // Build players array with appropriate visibility
        const players = [];
        for (const [seat, player] of table.players) {
            players.push({
                seatIndex: seat,
                id: player.id,
                name: player.name,
                hand: player.hand,
                score: calculateScore(player.hand),
                bet: player.bet,
                status: player.status,
                result: player.result,
                payout: player.payout,
                splitHand: player.splitHand || null,
                splitScore: player.splitHand ? calculateScore(player.splitHand) : null,
                splitBet: player.splitBet || 0,
                splitResult: player.splitResult || null,
                splitPayout: player.splitPayout || 0,
                isYou: player.id === playerId
            });
        }
        
        // Dealer hand - hide hole card unless revealed
        const dealerHand = table.dealerHand.map(card => 
            card.hidden ? { hidden: true } : card
        );
        
        return {
            tableId: table.id,
            phase: table.phase,
            currentSeat: table.currentSeat,
            players,
            dealerHand,
            dealerScore: table.phase === 'dealer' || table.phase === 'payout' 
                ? table.dealerScore 
                : (table.dealerHand.length > 1 ? calculateScore([table.dealerHand[1]]) : 0),
            cardsDealt: table.cardsDealt,
            minBet: MIN_BET,
            maxBet: MAX_BET
        };
    }
    
    /**
     * Broadcast table state to all players at the table and spectators
     */
    _broadcastTableState(table) {
        // Send to all players at the table
        for (const [, player] of table.players) {
            this.sendToPlayer?.(player.id, {
                type: 'blackjack_state',
                table: this.getTableState(table.id, player.id)
            });
        }
        
        // Also broadcast spectator state to everyone in the casino room
        if (this.broadcastToRoom) {
            const spectatorState = this.getSpectatorState(table.id);
            if (spectatorState && spectatorState.players.length > 0) {
                this.broadcastToRoom('casino_game_room', {
                    type: 'blackjack_spectator',
                    tableId: table.id,
                    state: spectatorState
                }, null); // Broadcast to everyone
            }
        }
    }
    
    /**
     * Check for turn timeouts
     */
    checkTimeouts() {
        const now = Date.now();
        
        for (const [, table] of this.tables) {
            if (table.phase !== 'playing') continue;
            if (table.currentSeat === -1) continue;
            
            const player = table.players.get(table.currentSeat);
            if (!player || !player.turnStartedAt) continue;
            
            if (now - player.turnStartedAt > TURN_TIMEOUT_MS) {
                console.log(`⏰ Blackjack timeout: ${player.name} auto-stands`);
                player.status = 'stand';
                this._nextPlayer(table);
                this._broadcastTableState(table);
            }
        }
    }
    
    /**
     * Get spectator state for a table (for observers)
     */
    getSpectatorState(tableId) {
        const table = this.tables.get(tableId);
        if (!table) return null;
        
        const players = [];
        for (const [seat, player] of table.players) {
            players.push({
                seatIndex: seat,
                name: player.name,
                hand: player.hand,
                score: calculateScore(player.hand),
                bet: player.bet,
                status: player.status,
                result: player.result
            });
        }
        
        return {
            tableId: table.id,
            phase: table.phase,
            currentSeat: table.currentSeat,
            players,
            dealerHand: table.dealerHand.map(card => 
                card.hidden ? { hidden: true } : card
            ),
            dealerScore: table.phase === 'dealer' || table.phase === 'payout' 
                ? table.dealerScore 
                : null
        };
    }
    
    /**
     * Handle player disconnect
     */
    handleDisconnect(playerId) {
        return this.leaveTable(playerId);
    }
    
    /**
     * Cleanup
     */
    dispose() {
        clearInterval(this.timerInterval);
    }
}

export default BlackjackService;
