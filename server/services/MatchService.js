/**
 * MatchService - Manages active P2P matches with MongoDB persistence
 * Server-authoritative match state and wager handling
 * 
 * Enhanced with SPL token wagering support (x402 protocol)
 */

import { Match as MatchModel } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';
// NOTE: Token settlement is handled by handleMatchPayout() in server/index.js

// Turn time limit (30 seconds)
const TURN_TIME_LIMIT_MS = 30 * 1000;

// Card Jitsu card definitions
const CARD_ELEMENTS = ['fire', 'water', 'snow'];
const CARD_EMOJIS = {
    fire: ['🔥', '🌋', '☀️', '💥', '🌶️'],
    water: ['💧', '🌊', '🌧️', '❄️', '🐚'],
    snow: ['❄️', '⛄', '🏔️', '🌨️', '🧊']
};

// Tic Tac Toe winning combinations
const TTT_WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// Connect 4 constants
const C4_ROWS = 6;
const C4_COLS = 7;
const C4_WIN_LENGTH = 4;

// Monopoly constants
const MONOPOLY_SPACES = [
    { name: "GO", type: "go", price: 0, group: "NONE" },
    { name: "Mediterranean", type: "property", price: 60, rent: 2, group: "BROWN" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Baltic Ave", type: "property", price: 60, rent: 4, group: "BROWN" },
    { name: "Income Tax", type: "tax", price: 200, group: "NONE" },
    { name: "Reading RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Oriental Ave", type: "property", price: 100, rent: 6, group: "LIGHTBLUE" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Vermont Ave", type: "property", price: 100, rent: 6, group: "LIGHTBLUE" },
    { name: "Conn. Ave", type: "property", price: 120, rent: 8, group: "LIGHTBLUE" },
    { name: "Jail", type: "jail", price: 0, group: "NONE" },
    { name: "St. Charles", type: "property", price: 140, rent: 10, group: "PINK" },
    { name: "Electric Co", type: "utility", price: 150, rent: 0, group: "UTILITY" },
    { name: "States Ave", type: "property", price: 140, rent: 10, group: "PINK" },
    { name: "Virginia Ave", type: "property", price: 160, rent: 12, group: "PINK" },
    { name: "Penn. RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "St. James", type: "property", price: 180, rent: 14, group: "ORANGE" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Tenn. Ave", type: "property", price: 180, rent: 14, group: "ORANGE" },
    { name: "NY Ave", type: "property", price: 200, rent: 16, group: "ORANGE" },
    { name: "Free Parking", type: "parking", price: 0, group: "NONE" },
    { name: "Kentucky Ave", type: "property", price: 220, rent: 18, group: "RED" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Indiana Ave", type: "property", price: 220, rent: 18, group: "RED" },
    { name: "Illinois Ave", type: "property", price: 240, rent: 20, group: "RED" },
    { name: "B&O RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Atlantic Ave", type: "property", price: 260, rent: 22, group: "YELLOW" },
    { name: "Ventnor Ave", type: "property", price: 260, rent: 22, group: "YELLOW" },
    { name: "Water Works", type: "utility", price: 150, rent: 0, group: "UTILITY" },
    { name: "Marvin Gdns", type: "property", price: 280, rent: 24, group: "YELLOW" },
    { name: "Go To Jail", type: "gotojail", price: 0, group: "NONE" },
    { name: "Pacific Ave", type: "property", price: 300, rent: 26, group: "GREEN" },
    { name: "NC Ave", type: "property", price: 300, rent: 26, group: "GREEN" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Penn. Ave", type: "property", price: 320, rent: 28, group: "GREEN" },
    { name: "Short Line", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Park Place", type: "property", price: 350, rent: 35, group: "DARKBLUE" },
    { name: "Luxury Tax", type: "tax", price: 100, group: "NONE" },
    { name: "Boardwalk", type: "property", price: 400, rent: 50, group: "DARKBLUE" }
];

const MONOPOLY_GROUP_SIZES = {
    BROWN: 2, LIGHTBLUE: 3, PINK: 3, ORANGE: 3,
    RED: 3, YELLOW: 3, GREEN: 3, DARKBLUE: 2,
    STATION: 4, UTILITY: 2
};

// Official Monopoly Chance Cards (expanded set)
const MONOPOLY_CHANCE_CARDS = [
    { text: "Advance to GO! Collect $200", action: "go" },
    { text: "Advance to Illinois Ave.", action: "moveTo", position: 24 },
    { text: "Advance to St. Charles Place", action: "moveTo", position: 11 },
    { text: "Advance to Boardwalk", action: "moveTo", position: 39 },
    { text: "Advance to Reading Railroad", action: "moveTo", position: 5 },
    { text: "Bank pays you dividend of $50", action: "collect", amount: 50 },
    { text: "Bank error in your favor. Collect $200", action: "collect", amount: 200 },
    { text: "Doctor's fees. Pay $50", action: "pay", amount: 50 },
    { text: "Go to Jail!", action: "jail" },
    { text: "Speeding fine $15", action: "pay", amount: 15 },
    { text: "Take a trip to Reading Railroad", action: "moveTo", position: 5 },
    { text: "Your building loan matures. Collect $150", action: "collect", amount: 150 },
    { text: "You have won a crossword competition. Collect $100", action: "collect", amount: 100 }
];

// Official Monopoly Community Chest Cards (expanded set)
const MONOPOLY_CHEST_CARDS = [
    { text: "Advance to GO! Collect $200", action: "go" },
    { text: "Bank error in your favor. Collect $200", action: "collect", amount: 200 },
    { text: "Doctor's fees. Pay $50", action: "pay", amount: 50 },
    { text: "From sale of stock you get $50", action: "collect", amount: 50 },
    { text: "Go to Jail!", action: "jail" },
    { text: "Grand Opera Night. Collect $50", action: "collect", amount: 50 },
    { text: "Holiday Fund matures. Collect $100", action: "collect", amount: 100 },
    { text: "Income tax refund. Collect $20", action: "collect", amount: 20 },
    { text: "It is your birthday. Collect $10", action: "collect", amount: 10 },
    { text: "Life insurance matures. Collect $100", action: "collect", amount: 100 },
    { text: "Pay Hospital Fees of $100", action: "pay", amount: 100 },
    { text: "Pay school fees of $50", action: "pay", amount: 50 },
    { text: "Receive $25 consultancy fee", action: "collect", amount: 25 },
    { text: "You inherit $100", action: "collect", amount: 100 },
    { text: "You have won second prize in a beauty contest. Collect $10", action: "collect", amount: 10 }
];

const MONOPOLY_STARTING_MONEY = 1500;

// UNO constants
const UNO_COLORS = ['Red', 'Blue', 'Green', 'Yellow'];
const UNO_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'];
const UNO_WILDS = ['Wild', 'Wild +4'];
const UNO_INITIAL_CARDS = 7;

// Create a fresh UNO deck
function createUnoDeck() {
    const deck = [];
    let uid = 0;
    
    // Add colored cards
    UNO_COLORS.forEach(color => {
        UNO_VALUES.forEach(value => {
            // 0 appears once per color, others appear twice
            const count = (value === '0') ? 1 : 2;
            for (let i = 0; i < count; i++) {
                deck.push({ c: color, v: value, uid: uid++ });
            }
        });
    });
    
    // Add wild cards (4 of each)
    for (let i = 0; i < 4; i++) {
        deck.push({ c: 'Black', v: 'Wild', uid: uid++ });
        deck.push({ c: 'Black', v: 'Wild +4', uid: uid++ });
    }
    
    return deck;
}

// Shuffle array in-place
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Blackjack constants
const BLACKJACK_SUITS = ['♥', '♦', '♣', '♠'];
const BLACKJACK_VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

// Create and shuffle a blackjack deck (standard 52 cards)
function createBlackjackDeck() {
    const deck = [];
    let uid = 0;
    for (const suit of BLACKJACK_SUITS) {
        for (const value of BLACKJACK_VALUES) {
            deck.push({ suit, value, uid: uid++, hidden: false });
        }
    }
    return shuffleArray(deck);
}

// Calculate blackjack hand score
function calculateBlackjackScore(hand) {
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
    
    // Convert aces from 11 to 1 as needed
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    
    return score;
}

// Normalize game type
const normalizeGameType = (gameType) => {
    const mapping = {
        'card_jitsu': 'cardJitsu',
        'tic_tac_toe': 'ticTacToe',
        'connect4': 'connect4',
        'monopoly': 'monopoly',
        'pong': 'pong',
        'uno': 'uno',
        'blackjack': 'blackjack',
        'battleship': 'battleship'
    };
    return mapping[gameType] || gameType;
};

// Reverse normalize for server messages
const denormalizeGameType = (gameType) => {
    const mapping = {
        'cardJitsu': 'card_jitsu',
        'ticTacToe': 'tic_tac_toe',
        'connect4': 'connect4',
        'monopoly': 'monopoly',
        'uno': 'uno',
        'blackjack': 'blackjack',
        'battleship': 'battleship'
    };
    return mapping[gameType] || gameType;
};

// ========== BATTLESHIP CONSTANTS ==========
const BATTLESHIP_GRID_SIZE = 10;
const BATTLESHIP_SETUP_TIME = 45; // seconds for ship placement
const BATTLESHIP_SHIPS = [
    { name: "Carrier", size: 5 },
    { name: "Battleship", size: 4 },
    { name: "Cruiser", size: 3 },
    { name: "Submarine", size: 3 },
    { name: "Destroyer", size: 2 }
];

// Place ships randomly on a grid
function placeShipsRandomly() {
    const grid = Array(BATTLESHIP_GRID_SIZE * BATTLESHIP_GRID_SIZE).fill(null);
    const ships = [];
    
    for (const shipTemplate of BATTLESHIP_SHIPS) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            attempts++;
            const horizontal = Math.random() > 0.5;
            const x = Math.floor(Math.random() * BATTLESHIP_GRID_SIZE);
            const y = Math.floor(Math.random() * BATTLESHIP_GRID_SIZE);
            
            if (horizontal && x + shipTemplate.size > BATTLESHIP_GRID_SIZE) continue;
            if (!horizontal && y + shipTemplate.size > BATTLESHIP_GRID_SIZE) continue;
            
            let canPlace = true;
            const positions = [];
            for (let i = 0; i < shipTemplate.size; i++) {
                const px = horizontal ? x + i : x;
                const py = horizontal ? y : y + i;
                const idx = py * BATTLESHIP_GRID_SIZE + px;
                if (grid[idx] !== null) {
                    canPlace = false;
                    break;
                }
                positions.push(idx);
            }
            
            if (canPlace) {
                const shipId = `ship_${ships.length}`;
                positions.forEach(idx => grid[idx] = shipId);
                ships.push({
                    id: shipId,
                    name: shipTemplate.name,
                    size: shipTemplate.size,
                    positions,
                    hits: 0,
                    sunk: false
                });
                placed = true;
            }
        }
    }
    
    return { grid, ships };
}

class MatchService {
    constructor(statsService, userService, broadcastToRoom, sendToPlayer) {
        this.statsService = statsService;
        this.userService = userService;
        this.broadcastToRoom = broadcastToRoom;
        this.sendToPlayer = sendToPlayer;
        
        // Active matches (matchId -> match)
        this.matches = new Map();
        // Player to match mapping (playerId -> matchId)
        this.playerMatches = new Map();
        // Wallet to match mapping (walletAddress -> matchId)
        this.walletMatches = new Map();
        
        this.nextMatchId = 1;
        
        // Turn timer interval
        this.timerInterval = setInterval(() => this.checkTurnTimers(), 1000);
    }

    /**
     * Create a match from an accepted challenge
     * Includes wagerToken (x402) if present
     * @param {object} signedPayloads - { challengerSignedPayload, targetSignedPayload } for token wager settlement
     */
    async createMatch(challenge, player1Data, player2Data, signedPayloads = {}) {
        const matchId = `match_${Date.now()}_${this.nextMatchId++}`;
        const gameType = denormalizeGameType(challenge.gameType);
        const hasTokenWager = challenge.wagerToken?.tokenAddress && challenge.wagerToken?.tokenAmount > 0;
        
        const match = {
            id: matchId,
            gameType,
            player1: {
                id: challenge.challengerId,
                wallet: challenge.challengerWallet,
                name: challenge.challengerName,
                appearance: challenge.challengerAppearance,
                position: player1Data?.position || { x: 0, y: 0, z: 0 },
                signedPayload: signedPayloads.challengerSignedPayload || null  // x402 signed payment
            },
            player2: {
                id: challenge.targetId,
                wallet: challenge.targetWallet,
                name: challenge.targetName,
                appearance: challenge.targetAppearance,
                position: player2Data?.position || { x: 0, y: 0, z: 0 },
                signedPayload: signedPayloads.targetSignedPayload || null  // x402 signed payment
            },
            wagerAmount: challenge.wagerAmount,
            wagerToken: hasTokenWager ? challenge.wagerToken : null,  // x402 token wager
            room: challenge.room,
            status: 'active',
            state: this._createInitialState(gameType),
            createdAt: Date.now(),
            endedAt: null,
            winnerId: null,
            winnerWallet: null,
            settlementStatus: hasTokenWager ? 'pending' : 'none'  // Track token settlement
        };
        
        // Store in memory
        this.matches.set(matchId, match);
        this.playerMatches.set(challenge.challengerId, matchId);
        this.playerMatches.set(challenge.targetId, matchId);
        
        if (challenge.challengerWallet) {
            this.walletMatches.set(challenge.challengerWallet, matchId);
        }
        if (challenge.targetWallet) {
            this.walletMatches.set(challenge.targetWallet, matchId);
        }

        // Save to database
        if (isDBConnected()) {
            try {
                const dbMatchData = {
                    matchId,
                    challengeId: challenge.id || challenge.challengeId,
                    player1: {
                        wallet: challenge.challengerWallet,
                        name: challenge.challengerName,
                        playerId: challenge.challengerId
                    },
                    player2: {
                        wallet: challenge.targetWallet,
                        name: challenge.targetName,
                        playerId: challenge.targetId
                    },
                    gameType: normalizeGameType(gameType),
                    wagerAmount: challenge.wagerAmount,
                    room: challenge.room,
                    status: 'active',
                    gameState: match.state
                };
                
                // Add wagerToken and signed payloads if present (x402)
                if (hasTokenWager) {
                    dbMatchData.wagerToken = challenge.wagerToken;
                    dbMatchData.settlementStatus = 'pending';
                    dbMatchData.player1SignedPayload = signedPayloads.challengerSignedPayload || null;
                    dbMatchData.player2SignedPayload = signedPayloads.targetSignedPayload || null;
                }
                
                const dbMatch = new MatchModel(dbMatchData);
                await dbMatch.save();
            } catch (error) {
                console.error('Error saving match to DB:', error);
            }
        }
        
        // Log with token wager info if present
        const tokenWagerText = hasTokenWager ? ` + ${challenge.wagerToken.tokenAmount} ${challenge.wagerToken.tokenSymbol}` : '';
        console.log(`🎮 Match started: ${match.player1.name} vs ${match.player2.name} (${gameType}, ${challenge.wagerAmount} coins${tokenWagerText})`);
        
        return match;
    }
    
    /**
     * Create initial game state based on game type
     */
    _createInitialState(gameType) {
        switch (gameType) {
            case 'tic_tac_toe':
                return {
                    board: Array(9).fill(null),
                    currentTurn: 'player1',
                    phase: 'playing',
                    winner: null,
                    winningLine: null,
                    turnStartedAt: Date.now()
                };
            
            case 'connect4':
                return {
                    board: Array(C4_ROWS * C4_COLS).fill(null),
                    currentTurn: 'player1',
                    phase: 'playing',
                    winner: null,
                    winningCells: null,
                    lastMove: null,
                    turnStartedAt: Date.now()
                };
            
            case 'monopoly':
                return {
                    player1: {
                        position: 0,
                        money: MONOPOLY_STARTING_MONEY,
                        properties: [],
                        inJail: false,
                        jailTurns: 0
                    },
                    player2: {
                        position: 0,
                        money: MONOPOLY_STARTING_MONEY,
                        properties: [],
                        inJail: false,
                        jailTurns: 0
                    },
                    propertyOwners: Array(40).fill(null),
                    currentTurn: 'player1',
                    phase: 'roll', // 'roll' | 'moving' | 'action' | 'end' | 'complete'
                    lastDice: [0, 0],
                    doublesCount: 0,
                    currentEvent: null,
                    canBuy: false,
                    buyPrice: 0,
                    winner: null,
                    turnStartedAt: Date.now(),
                    animatingMove: false,
                    moveFrom: 0,
                    moveTo: 0,
                    pendingPropertyLanding: false // For card-based movement
                };
            
            case 'uno':
                return this._createUnoInitialState();
            
            case 'blackjack':
                return this._createBlackjackState();
            
            case 'battleship':
                return this._createBattleshipState();
            
            case 'card_jitsu':
            default:
                return {
                    round: 1,
                    phase: 'select',
                    player1Hand: this._generateHand(),
                    player2Hand: this._generateHand(),
                    player1SelectedCard: null,
                    player2SelectedCard: null,
                    player1Wins: { fire: 0, water: 0, snow: 0 },
                    player2Wins: { fire: 0, water: 0, snow: 0 },
                    turnStartedAt: Date.now(),
                    lastRoundResult: null
                };
        }
    }

    _generateCard() {
        const element = CARD_ELEMENTS[Math.floor(Math.random() * 3)];
        const power = Math.floor(Math.random() * 5) + 1;
        const emoji = CARD_EMOJIS[element][Math.floor(Math.random() * 5)];
        return {
            id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            element,
            power,
            emoji
        };
    }

    _generateHand() {
        return Array(5).fill(null).map(() => this._generateCard());
    }

    // ========== UNO METHODS ==========
    
    _createUnoInitialState() {
        // Create and shuffle deck
        const deck = shuffleArray(createUnoDeck());
        
        // Deal 7 cards to each player
        const player1Hand = [];
        const player2Hand = [];
        for (let i = 0; i < UNO_INITIAL_CARDS; i++) {
            player1Hand.push(deck.pop());
            player2Hand.push(deck.pop());
        }
        
        // Find a non-wild starting card for the discard pile
        let startCard = deck.pop();
        while (startCard.c === 'Black') {
            deck.unshift(startCard); // Put wild back at bottom
            startCard = deck.pop();
        }
        
        return {
            deck,
            discard: [startCard],
            player1Hand,
            player2Hand,
            currentTurn: 'player1',
            phase: 'playing', // 'playing' | 'selectColor' | 'complete'
            activeColor: startCard.c,
            activeValue: startCard.v,
            winner: null,
            turnStartedAt: Date.now(),
            skipNextTurn: false,
            lastAction: null, // { type: 'play'|'draw', player: 'player1'|'player2', card?: {...} }
            mustDraw: 0, // For +2 and +4 stacking
            calledUno: { player1: false, player2: false }
        };
    }
    
    _playUno(match, playerId, action) {
        console.log(`[UNO] _playUno called - action:`, JSON.stringify(action));
        const state = match.state;
        console.log(`[UNO] Current state - activeColor: ${state.activeColor}, activeValue: ${state.activeValue}, currentTurn: ${state.currentTurn}`);
        if (state.phase === 'complete') return { error: 'GAME_OVER' };
        
        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };
        
        const playerKey = isPlayer1 ? 'player1' : 'player2';
        
        // Handle UNO call
        if (action.action === 'callUno') {
            state.calledUno[playerKey] = true;
            return { success: true };
        }
        
        // Handle color selection (after playing a wild)
        if (action.action === 'selectColor') {
            if (state.phase !== 'selectColor') return { error: 'NOT_SELECTING_COLOR' };
            if (state.waitingForColor !== playerKey) return { error: 'NOT_YOUR_TURN' };
            
            if (!UNO_COLORS.includes(action.color)) return { error: 'INVALID_COLOR' };
            
            state.activeColor = action.color;
            state.phase = 'playing';
            
            // Apply any effects from the wild card
            if (state.pendingWildEffect) {
                this._applyUnoCardEffect(match, state.pendingWildEffect, playerKey);
                state.pendingWildEffect = null;
            }
            
            // Move to next turn
            this._unoNextTurn(match);
            state.waitingForColor = null;
            
            return { success: true };
        }
        
        // Check if it's player's turn
        const isMyTurn = state.currentTurn === playerKey;
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };
        
        if (state.phase === 'selectColor') return { error: 'MUST_SELECT_COLOR' };
        
        const hand = isPlayer1 ? state.player1Hand : state.player2Hand;
        
        // Handle draw action
        if (action.action === 'draw') {
            // Draw from deck
            this._unoDrawCards(match, playerKey, 1);
            
            state.lastAction = { type: 'draw', player: playerKey };
            state.calledUno[playerKey] = false;
            
            // After drawing, turn passes
            this._unoNextTurn(match);
            return { success: true };
        }
        
        // Handle play action
        if (action.action === 'play') {
            // Find the card in hand by uid
            const cardIndex = hand.findIndex(c => c.uid === action.cardUid);
            if (cardIndex === -1) {
                console.log(`[UNO] CARD_NOT_IN_HAND - looking for uid ${action.cardUid}, hand uids: ${hand.map(c => c.uid).join(',')}`);
                return { error: 'CARD_NOT_IN_HAND' };
            }
            
            const card = hand[cardIndex];
            
            // Validate the card can be played
            console.log(`[UNO] Validating play: card=${card.c} ${card.v}, activeColor=${state.activeColor}, activeValue=${state.activeValue}`);
            if (!this._unoIsValidPlay(card, state.activeColor, state.activeValue)) {
                console.log(`[UNO] INVALID_PLAY - card ${card.c} ${card.v} does not match ${state.activeColor}/${state.activeValue}`);
                return { error: 'INVALID_PLAY' };
            }
            
            // Remove card from hand and add to discard
            hand.splice(cardIndex, 1);
            state.discard.push(card);
            
            // Update active values
            state.activeValue = card.v;
            if (card.c !== 'Black') {
                state.activeColor = card.c;
            }
            
            state.lastAction = { type: 'play', player: playerKey, card };
            
            // Check for win condition
            if (hand.length === 0) {
                // Check if UNO was called when they had 1 card
                state.phase = 'complete';
                state.winner = playerKey;
                match.status = 'complete';
                match.winnerId = isPlayer1 ? match.player1.id : match.player2.id;
                match.winnerWallet = isPlayer1 ? match.player1.wallet : match.player2.wallet;
                match.endedAt = Date.now();
                return { success: true, gameComplete: true };
            }
            
            // Reset UNO call status after playing
            if (hand.length !== 1) {
                state.calledUno[playerKey] = false;
            }
            
            // Handle wild cards - need color selection
            if (card.c === 'Black') {
                state.phase = 'selectColor';
                state.waitingForColor = playerKey;
                state.pendingWildEffect = card.v;
                return { success: true, needColorSelection: true };
            }
            
            // Apply card effects
            this._applyUnoCardEffect(match, card.v, playerKey);
            
            // Move to next turn
            this._unoNextTurn(match);
            return { success: true };
        }
        
        return { error: 'INVALID_ACTION' };
    }
    
    _unoIsValidPlay(card, activeColor, activeValue) {
        // Wild cards can always be played
        if (card.c === 'Black') return true;
        // Match color
        if (card.c === activeColor) return true;
        // Match value
        if (card.v === activeValue) return true;
        return false;
    }
    
    _unoDrawCards(match, playerKey, count) {
        const state = match.state;
        const hand = playerKey === 'player1' ? state.player1Hand : state.player2Hand;
        
        for (let i = 0; i < count; i++) {
            // Reshuffle if deck is empty
            if (state.deck.length === 0) {
                this._unoReshuffleDeck(state);
            }
            
            if (state.deck.length > 0) {
                hand.push(state.deck.pop());
            }
        }
    }
    
    _unoReshuffleDeck(state) {
        // Keep the top card on discard
        const topCard = state.discard.pop();
        // Shuffle the rest back into deck
        state.deck = shuffleArray([...state.discard]);
        state.discard = [topCard];
    }
    
    _applyUnoCardEffect(match, value, playerKey) {
        const state = match.state;
        const opponentKey = playerKey === 'player1' ? 'player2' : 'player1';
        
        switch (value) {
            case 'Skip':
                state.skipNextTurn = true;
                break;
            case 'Reverse':
                // In 2-player, Reverse acts like Skip
                state.skipNextTurn = true;
                break;
            case '+2':
                this._unoDrawCards(match, opponentKey, 2);
                state.skipNextTurn = true;
                break;
            case 'Wild +4':
                this._unoDrawCards(match, opponentKey, 4);
                state.skipNextTurn = true;
                break;
        }
    }
    
    _unoNextTurn(match) {
        const state = match.state;
        
        if (state.skipNextTurn) {
            state.skipNextTurn = false;
            // Turn stays with same player (opponent was skipped)
        } else {
            state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
        }
        
        state.turnStartedAt = Date.now();
    }
    
    _handleUnoTimeout(match) {
        const state = match.state;
        if (state.phase === 'complete') return;
        
        const currentPlayer = state.currentTurn;
        
        if (state.phase === 'selectColor') {
            // Auto-select a random color
            state.activeColor = UNO_COLORS[Math.floor(Math.random() * UNO_COLORS.length)];
            state.phase = 'playing';
            if (state.pendingWildEffect) {
                this._applyUnoCardEffect(match, state.pendingWildEffect, state.waitingForColor);
                state.pendingWildEffect = null;
            }
            this._unoNextTurn(match);
            state.waitingForColor = null;
        } else {
            // Auto-draw a card
            this._unoDrawCards(match, currentPlayer, 1);
            state.lastAction = { type: 'draw', player: currentPlayer };
            this._unoNextTurn(match);
        }
    }

    // ========== BLACKJACK METHODS ==========
    
    _createBlackjackState() {
        const deck = createBlackjackDeck();
        
        // Deal initial cards: Player1, Dealer(hidden), Player2, Dealer(visible)
        // P2P mode: Both players play against a shared dealer
        const player1Hand = [deck.pop(), deck.pop()];
        const player2Hand = [deck.pop(), deck.pop()];
        const dealerHand = [
            { ...deck.pop(), hidden: true },  // Hole card (face down)
            deck.pop()                         // Up card (face up)
        ];
        
        return {
            deck,
            dealerHand,
            player1Hand,
            player2Hand,
            player1Score: calculateBlackjackScore(player1Hand),
            player2Score: calculateBlackjackScore(player2Hand),
            dealerScore: calculateBlackjackScore([dealerHand[1]]), // Only visible card
            
            // Game phases: 'player1Turn' | 'player2Turn' | 'dealerTurn' | 'complete'
            phase: 'player1Turn',
            currentTurn: 'player1',
            
            // Player statuses: 'playing' | 'stand' | 'bust' | 'blackjack'
            player1Status: calculateBlackjackScore(player1Hand) === 21 ? 'blackjack' : 'playing',
            player2Status: calculateBlackjackScore(player2Hand) === 21 ? 'blackjack' : 'playing',
            dealerStatus: 'waiting',
            
            // Results
            player1Result: null,  // 'win' | 'lose' | 'push' | 'blackjack'
            player2Result: null,
            winner: null,  // 'player1' | 'player2' | 'draw' | null
            
            turnStartedAt: Date.now(),
            lastAction: null
        };
    }
    
    // ========== BATTLESHIP METHODS ==========
    
    _createBattleshipState() {
        // Generate random ship placements for both players
        const player1Setup = placeShipsRandomly();
        const player2Setup = placeShipsRandomly();
        
        return {
            // Each player's ships and grid
            player1Ships: player1Setup.ships,
            player1Grid: player1Setup.grid,
            player2Ships: player2Setup.ships,
            player2Grid: player2Setup.grid,
            
            // Shot tracking (null = not shot, 'hit' = hit, 'miss' = miss)
            player1Shots: Array(BATTLESHIP_GRID_SIZE * BATTLESHIP_GRID_SIZE).fill(null), // P1's shots at P2
            player2Shots: Array(BATTLESHIP_GRID_SIZE * BATTLESHIP_GRID_SIZE).fill(null), // P2's shots at P1
            
            // Setup phase
            phase: 'setup', // 'setup' | 'playing' | 'complete'
            player1Ready: false,
            player2Ready: false,
            setupStartedAt: Date.now(),
            
            // Turn tracking
            currentTurn: 'player1',
            turnStartedAt: Date.now(),
            
            // Last action for animations
            lastAction: null,
            
            // Winner
            winner: null
        };
    }
    
    _playBattleship(match, playerId, action) {
        const state = match.state;
        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };
        
        const playerKey = isPlayer1 ? 'player1' : 'player2';
        const opponentKey = isPlayer1 ? 'player2' : 'player1';
        
        // Handle setup phase actions
        if (state.phase === 'setup') {
            if (typeof action === 'object') {
                if (action.action === 'randomizeFleet') {
                    // Re-randomize this player's ship placement
                    const newSetup = placeShipsRandomly();
                    if (isPlayer1) {
                        state.player1Ships = newSetup.ships;
                        state.player1Grid = newSetup.grid;
                    } else {
                        state.player2Ships = newSetup.ships;
                        state.player2Grid = newSetup.grid;
                    }
                    this._notifyMatchState(match);
                    return { success: true };
                }
                
                if (action.action === 'ready') {
                    // Mark player as ready
                    if (isPlayer1) {
                        state.player1Ready = true;
                    } else {
                        state.player2Ready = true;
                    }
                    
                    // Check if both players are ready
                    if (state.player1Ready && state.player2Ready) {
                        state.phase = 'playing';
                        state.currentTurn = 'player1';
                        state.turnStartedAt = Date.now();
                        console.log(`🚢 Battleship: Both players ready, starting game`);
                    }
                    
                    this._notifyMatchState(match);
                    return { success: true };
                }
            }
            return { error: 'INVALID_SETUP_ACTION' };
        }
        
        // Handle playing phase (firing shots)
        if (state.phase !== 'playing') return { error: 'GAME_NOT_ACTIVE' };
        
        // Check if it's this player's turn
        const isMyTurn = state.currentTurn === playerKey;
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };
        
        // Get cell index from action
        const cellIndex = typeof action === 'object' ? action.cellIndex : action;
        if (cellIndex === undefined || cellIndex < 0 || cellIndex >= BATTLESHIP_GRID_SIZE * BATTLESHIP_GRID_SIZE) {
            return { error: 'INVALID_CELL' };
        }
        
        // Get the shot array and opponent's grid
        const shotsArray = isPlayer1 ? state.player1Shots : state.player2Shots;
        const opponentGrid = isPlayer1 ? state.player2Grid : state.player1Grid;
        const opponentShips = isPlayer1 ? state.player2Ships : state.player1Ships;
        
        // Check if cell already shot
        if (shotsArray[cellIndex] !== null) {
            return { error: 'ALREADY_SHOT' };
        }
        
        // Process the shot
        const shipId = opponentGrid[cellIndex];
        const isHit = shipId !== null;
        shotsArray[cellIndex] = isHit ? 'hit' : 'miss';
        
        // Track last action for client animations
        state.lastAction = {
            type: isHit ? 'hit' : 'miss',
            cellIndex,
            player: playerKey
        };
        
        // If hit, update ship damage
        let sunkShip = null;
        if (isHit) {
            const ship = opponentShips.find(s => s.id === shipId);
            if (ship) {
                ship.hits++;
                if (ship.hits >= ship.size) {
                    ship.sunk = true;
                    sunkShip = ship;
                    console.log(`🚢 Battleship: ${ship.name} sunk!`);
                }
            }
        }
        
        // Check for win condition (all opponent ships sunk)
        const allOpponentShipsSunk = opponentShips.every(s => s.sunk);
        if (allOpponentShipsSunk) {
            state.phase = 'complete';
            state.winner = playerKey;
            match.status = 'completed';
            match.winnerId = playerId;
            match.winnerWallet = isPlayer1 ? match.player1.wallet : match.player2.wallet;
            match.endedAt = Date.now();
            console.log(`🚢 Battleship: ${playerKey} wins!`);
        } else {
            // Switch turns
            state.currentTurn = opponentKey;
            state.turnStartedAt = Date.now();
        }
        
        this._notifyMatchState(match);
        return { success: true, isHit, sunkShip: sunkShip?.name || null };
    }
    
    _getBattleshipState(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const playerKey = isPlayer1 ? 'player1' : 'player2';
        const opponentKey = isPlayer1 ? 'player2' : 'player1';
        
        // Calculate setup time remaining
        const setupTimeRemaining = state.phase === 'setup' 
            ? Math.max(0, BATTLESHIP_SETUP_TIME - Math.floor((Date.now() - state.setupStartedAt) / 1000))
            : 0;
        
        // My ships with full info
        const myShips = isPlayer1 ? state.player1Ships : state.player2Ships;
        const myGrid = isPlayer1 ? state.player1Grid : state.player2Grid;
        
        // Shots fired by me at opponent
        const myShotsAtOpponent = isPlayer1 ? state.player1Shots : state.player2Shots;
        
        // Shots fired by opponent at me
        const opponentShotsAtMe = isPlayer1 ? state.player2Shots : state.player1Shots;
        
        // Opponent ship status (only show sunk status, not positions)
        const opponentShips = isPlayer1 ? state.player2Ships : state.player1Ships;
        const opponentShipStatus = opponentShips.map(ship => ({
            name: ship.name,
            size: ship.size,
            sunk: ship.sunk
            // Don't expose positions!
        }));
        
        return {
            // Phase and turn
            phase: state.phase,
            isSetupPhase: state.phase === 'setup',
            isMyTurn: state.currentTurn === playerKey,
            currentTurn: state.currentTurn,
            timeRemaining,
            setupTimeRemaining,
            
            // Setup status
            myReady: isPlayer1 ? state.player1Ready : state.player2Ready,
            opponentReady: isPlayer1 ? state.player2Ready : state.player1Ready,
            
            // My board data (full visibility)
            myShips: myShips.map(ship => ({
                id: ship.id,
                name: ship.name,
                size: ship.size,
                positions: ship.positions,
                hits: ship.hits,
                sunk: ship.sunk
            })),
            myGrid: [...myGrid],
            
            // Shot data
            myShotsAtOpponent: [...myShotsAtOpponent],
            opponentShotsAtMe: [...opponentShotsAtMe],
            
            // Opponent info (limited)
            opponentShipStatus,
            
            // Animation data
            lastAction: state.lastAction,
            
            // Winner
            winner: state.winner
        };
    }
    
    _playBlackjack(match, playerId, action) {
        const state = match.state;
        if (state.phase === 'complete') return { error: 'GAME_OVER' };
        
        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };
        
        const playerKey = isPlayer1 ? 'player1' : 'player2';
        const actionType = typeof action === 'object' ? action.action : action;
        
        // Check if it's this player's turn
        if (state.phase === 'player1Turn' && !isPlayer1) return { error: 'NOT_YOUR_TURN' };
        if (state.phase === 'player2Turn' && !isPlayer2) return { error: 'NOT_YOUR_TURN' };
        if (state.phase === 'dealerTurn') return { error: 'DEALER_PLAYING' };
        
        const hand = isPlayer1 ? state.player1Hand : state.player2Hand;
        const statusKey = isPlayer1 ? 'player1Status' : 'player2Status';
        const scoreKey = isPlayer1 ? 'player1Score' : 'player2Score';
        
        // Already done (blackjack or bust)
        if (state[statusKey] !== 'playing') {
            return this._blackjackAdvanceTurn(match, state);
        }
        
        switch (actionType) {
            case 'hit':
                // Draw a card
                const newCard = state.deck.pop();
                hand.push(newCard);
                state[scoreKey] = calculateBlackjackScore(hand);
                state.lastAction = { type: 'hit', player: playerKey, card: newCard };
                
                // Check for bust
                if (state[scoreKey] > 21) {
                    state[statusKey] = 'bust';
                    return this._blackjackAdvanceTurn(match, state);
                }
                
                // Check for 21 (auto-stand)
                if (state[scoreKey] === 21) {
                    state[statusKey] = 'stand';
                    return this._blackjackAdvanceTurn(match, state);
                }
                
                state.turnStartedAt = Date.now();
                return { success: true };
                
            case 'stand':
                state[statusKey] = 'stand';
                state.lastAction = { type: 'stand', player: playerKey };
                return this._blackjackAdvanceTurn(match, state);
                
            case 'double':
                // Double down: one more card, then stand (P2P doesn't track bets per-action, so just hit + stand)
                const doubleCard = state.deck.pop();
                hand.push(doubleCard);
                state[scoreKey] = calculateBlackjackScore(hand);
                state.lastAction = { type: 'double', player: playerKey, card: doubleCard };
                
                if (state[scoreKey] > 21) {
                    state[statusKey] = 'bust';
                } else {
                    state[statusKey] = 'stand';
                }
                
                return this._blackjackAdvanceTurn(match, state);
                
            default:
                return { error: 'INVALID_ACTION' };
        }
    }
    
    _blackjackAdvanceTurn(match, state) {
        // If player1 just finished, move to player2
        if (state.phase === 'player1Turn') {
            // Check if player2 has blackjack (auto-complete)
            if (state.player2Status === 'blackjack') {
                state.phase = 'dealerTurn';
                return this._blackjackDealerPlay(match, state);
            }
            state.phase = 'player2Turn';
            state.currentTurn = 'player2';
            state.turnStartedAt = Date.now();
            return { success: true, nextTurn: 'player2' };
        }
        
        // If player2 just finished, dealer plays
        if (state.phase === 'player2Turn') {
            state.phase = 'dealerTurn';
            return this._blackjackDealerPlay(match, state);
        }
        
        return { success: true };
    }
    
    _blackjackDealerPlay(match, state) {
        // Reveal hole card
        state.dealerHand[0].hidden = false;
        state.dealerScore = calculateBlackjackScore(state.dealerHand);
        
        // Check if both players busted - dealer wins automatically
        if (state.player1Status === 'bust' && state.player2Status === 'bust') {
            return this._blackjackResolve(match, state);
        }
        
        // Dealer draws to 17+ (standard casino rules)
        while (state.dealerScore < 17) {
            const card = state.deck.pop();
            state.dealerHand.push(card);
            state.dealerScore = calculateBlackjackScore(state.dealerHand);
        }
        
        state.dealerStatus = state.dealerScore > 21 ? 'bust' : 'stand';
        
        return this._blackjackResolve(match, state);
    }
    
    _blackjackResolve(match, state) {
        state.phase = 'complete';
        
        const dealerScore = state.dealerScore;
        const dealerBust = dealerScore > 21;
        const dealerBlackjack = state.dealerHand.length === 2 && dealerScore === 21;
        
        // Resolve player 1
        if (state.player1Status === 'bust') {
            state.player1Result = 'lose';
        } else if (state.player1Status === 'blackjack') {
            state.player1Result = dealerBlackjack ? 'push' : 'blackjack';
        } else if (dealerBust) {
            state.player1Result = 'win';
        } else if (state.player1Score > dealerScore) {
            state.player1Result = 'win';
        } else if (state.player1Score < dealerScore) {
            state.player1Result = 'lose';
        } else {
            state.player1Result = 'push';
        }
        
        // Resolve player 2
        if (state.player2Status === 'bust') {
            state.player2Result = 'lose';
        } else if (state.player2Status === 'blackjack') {
            state.player2Result = dealerBlackjack ? 'push' : 'blackjack';
        } else if (dealerBust) {
            state.player2Result = 'win';
        } else if (state.player2Score > dealerScore) {
            state.player2Result = 'win';
        } else if (state.player2Score < dealerScore) {
            state.player2Result = 'lose';
        } else {
            state.player2Result = 'push';
        }
        
        // Determine P2P winner:
        // - Better result wins (blackjack > win > push > lose)
        // - If same result, higher score wins
        // - Bust is worst
        const resultRank = { 'blackjack': 4, 'win': 3, 'push': 2, 'lose': 1 };
        const p1Rank = state.player1Status === 'bust' ? 0 : resultRank[state.player1Result] || 0;
        const p2Rank = state.player2Status === 'bust' ? 0 : resultRank[state.player2Result] || 0;
        
        if (p1Rank > p2Rank) {
            state.winner = 'player1';
        } else if (p2Rank > p1Rank) {
            state.winner = 'player2';
        } else {
            // Same result rank - compare scores (non-bust only)
            const p1Score = state.player1Status === 'bust' ? 0 : state.player1Score;
            const p2Score = state.player2Status === 'bust' ? 0 : state.player2Score;
            
            if (p1Score > p2Score) {
                state.winner = 'player1';
            } else if (p2Score > p1Score) {
                state.winner = 'player2';
            } else {
                state.winner = 'draw';
            }
        }
        
        // Set match-level winner
        if (state.winner === 'player1') {
            match.status = 'complete';
            match.winnerId = match.player1.id;
            match.winnerWallet = match.player1.wallet;
        } else if (state.winner === 'player2') {
            match.status = 'complete';
            match.winnerId = match.player2.id;
            match.winnerWallet = match.player2.wallet;
        } else {
            // Draw
            match.status = 'complete';
            match.winnerId = null;
            match.winnerWallet = null;
        }
        match.endedAt = Date.now();
        
        return { success: true, gameComplete: true, isDraw: state.winner === 'draw' };
    }
    
    _handleBlackjackTimeout(match) {
        const state = match.state;
        if (state.phase === 'complete') return;
        
        // Auto-stand for the current player
        const currentPlayerId = state.phase === 'player1Turn' ? match.player1.id : match.player2.id;
        const playerKey = state.phase === 'player1Turn' ? 'player1' : 'player2';
        const statusKey = `${playerKey}Status`;
        
        console.log(`⏰ Blackjack auto-stand for ${playerKey}`);
        
        if (state[statusKey] === 'playing') {
            state[statusKey] = 'stand';
            state.lastAction = { type: 'stand', player: playerKey, timeout: true };
        }
        
        this._blackjackAdvanceTurn(match, state);
    }
    
    _handleBattleshipTimeout(match) {
        const state = match.state;
        
        // Handle setup phase timeout - auto-ready both players if needed
        if (state.phase === 'setup') {
            const setupElapsed = (Date.now() - state.setupStartedAt) / 1000;
            if (setupElapsed >= BATTLESHIP_SETUP_TIME) {
                console.log(`⏰ Battleship setup timeout - auto-starting game`);
                state.player1Ready = true;
                state.player2Ready = true;
                state.phase = 'playing';
                state.currentTurn = 'player1';
                state.turnStartedAt = Date.now();
                return;
            }
        }
        
        // Handle playing phase timeout - auto-fire random shot
        if (state.phase === 'playing') {
            const currentPlayerId = state.currentTurn === 'player1' ? match.player1.id : match.player2.id;
            const shotsArray = state.currentTurn === 'player1' ? state.player1Shots : state.player2Shots;
            
            // Find unfired cells
            const unfiredCells = [];
            for (let i = 0; i < BATTLESHIP_GRID_SIZE * BATTLESHIP_GRID_SIZE; i++) {
                if (shotsArray[i] === null) unfiredCells.push(i);
            }
            
            if (unfiredCells.length === 0) return;
            
            const randomCell = unfiredCells[Math.floor(Math.random() * unfiredCells.length)];
            console.log(`⏰ Battleship auto-fire for ${state.currentTurn}`);
            this._playBattleship(match, currentPlayerId, { cellIndex: randomCell });
        }
    }
    
    _getBlackjackState(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const playerKey = isPlayer1 ? 'player1' : 'player2';
        const opponentKey = isPlayer1 ? 'player2' : 'player1';
        
        const isMyTurn = (state.phase === 'player1Turn' && isPlayer1) || 
                         (state.phase === 'player2Turn' && !isPlayer1);
        
        const myHand = isPlayer1 ? state.player1Hand : state.player2Hand;
        const opponentHand = isPlayer1 ? state.player2Hand : state.player1Hand;
        const myScore = isPlayer1 ? state.player1Score : state.player2Score;
        const opponentScore = isPlayer1 ? state.player2Score : state.player1Score;
        const myStatus = isPlayer1 ? state.player1Status : state.player2Status;
        const opponentStatus = isPlayer1 ? state.player2Status : state.player1Status;
        const myResult = isPlayer1 ? state.player1Result : state.player2Result;
        const opponentResult = isPlayer1 ? state.player2Result : state.player1Result;
        
        // HIDE opponent's hand until game is complete (prevent cheating)
        // Only show card count during gameplay
        const isComplete = state.phase === 'complete';
        const visibleOpponentHand = isComplete ? [...opponentHand] : null;
        const visibleOpponentScore = isComplete ? opponentScore : null;
        
        // Dealer hand - hide hole card until dealer's turn
        const visibleDealerHand = state.phase === 'dealerTurn' || state.phase === 'complete'
            ? state.dealerHand
            : state.dealerHand.map((card, i) => i === 0 ? { ...card, hidden: true } : card);
        const visibleDealerScore = state.phase === 'dealerTurn' || state.phase === 'complete'
            ? state.dealerScore
            : calculateBlackjackScore([state.dealerHand[1]]); // Only visible card
        
        return {
            // My hand (always visible to me)
            myHand: [...myHand],
            myScore,
            myStatus,
            myResult,
            
            // Opponent hand - HIDDEN until game complete (anti-cheat)
            opponentHand: visibleOpponentHand,
            opponentCardCount: opponentHand.length,  // Show card count only
            opponentScore: visibleOpponentScore,
            opponentStatus,
            opponentResult,
            
            // Dealer
            dealerHand: visibleDealerHand,
            dealerScore: visibleDealerScore,
            dealerStatus: state.dealerStatus,
            
            // Turn state
            phase: state.phase,
            currentTurn: state.currentTurn,
            isMyTurn,
            
            // Can perform actions
            canHit: isMyTurn && myStatus === 'playing',
            canStand: isMyTurn && myStatus === 'playing',
            canDouble: isMyTurn && myStatus === 'playing' && myHand.length === 2,
            
            // Last action for animations
            lastAction: state.lastAction,
            
            // Result
            winner: state.winner,
            gameComplete: state.phase === 'complete',
            
            // Timer
            timeRemaining,
            
            // Metadata
            isPlayer1,
            status: match.status,
            matchId: match.id
        };
    }

    getMatch(matchId) {
        return this.matches.get(matchId);
    }

    getPlayerMatch(playerId) {
        const matchId = this.playerMatches.get(playerId);
        return matchId ? this.matches.get(matchId) : null;
    }

    isPlayerInMatch(playerId) {
        return this.playerMatches.has(playerId);
    }

    isWalletInMatch(walletAddress) {
        return walletAddress && this.walletMatches.has(walletAddress);
    }

    /**
     * Play a card/make a move
     * For Monopoly: cardIndex is an action object { action: 'roll' | 'buy' | 'endTurn' | 'completMove' }
     * For UNO: cardIndex is an action object { action: 'play' | 'draw' | 'selectColor', cardUid?, color? }
     */
    playCard(matchId, playerId, cardIndex) {
        const match = this.matches.get(matchId);
        if (!match) return { error: 'MATCH_NOT_FOUND' };
        if (match.status !== 'active') return { error: 'MATCH_NOT_ACTIVE' };

        if (match.gameType === 'tic_tac_toe') {
            return this._playTicTacToe(match, playerId, cardIndex);
        }
        if (match.gameType === 'connect4') {
            return this._playConnect4(match, playerId, cardIndex);
        }
        if (match.gameType === 'monopoly') {
            return this._playMonopoly(match, playerId, cardIndex);
        }
        if (match.gameType === 'uno') {
            return this._playUno(match, playerId, cardIndex);
        }
        if (match.gameType === 'blackjack') {
            return this._playBlackjack(match, playerId, cardIndex);
        }
        if (match.gameType === 'battleship') {
            return this._playBattleship(match, playerId, cardIndex);
        }
        return this._playCardJitsu(match, playerId, cardIndex);
    }

    _playTicTacToe(match, playerId, cellIndex) {
        const state = match.state;
        if (state.phase !== 'playing') return { error: 'GAME_OVER' };

        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };

        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && isPlayer2);
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };

        if (cellIndex < 0 || cellIndex > 8) return { error: 'INVALID_CELL' };
        if (state.board[cellIndex] !== null) return { error: 'CELL_TAKEN' };

        const symbol = isPlayer1 ? 'X' : 'O';
        state.board[cellIndex] = symbol;

        const winResult = this._checkTicTacToeWinner(state.board);
        
        if (winResult.winner) {
            state.phase = 'complete';
            state.winner = winResult.winner;
            state.winningLine = winResult.line;
            match.status = 'complete';
            match.winnerId = winResult.winner === 'X' ? match.player1.id : match.player2.id;
            match.winnerWallet = winResult.winner === 'X' ? match.player1.wallet : match.player2.wallet;
            match.endedAt = Date.now();
            return { success: true, gameComplete: true };
        }

        if (state.board.every(cell => cell !== null)) {
            state.phase = 'complete';
            state.winner = 'draw';
            match.status = 'complete';
            match.endedAt = Date.now();
            return { success: true, gameComplete: true, isDraw: true };
        }

        state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
        state.turnStartedAt = Date.now();
        return { success: true };
    }

    _checkTicTacToeWinner(board) {
        for (const line of TTT_WIN_LINES) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return { winner: board[a], line };
            }
        }
        return { winner: null, line: null };
    }

    _playConnect4(match, playerId, column) {
        const state = match.state;
        if (state.phase !== 'playing') return { error: 'GAME_OVER' };

        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };

        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && isPlayer2);
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };

        if (column < 0 || column >= C4_COLS) return { error: 'INVALID_COLUMN' };

        const row = this._getConnect4LowestRow(state.board, column);
        if (row === -1) return { error: 'COLUMN_FULL' };

        const disc = isPlayer1 ? 'R' : 'Y';
        const cellIndex = row * C4_COLS + column;
        state.board[cellIndex] = disc;
        state.lastMove = { row, col: column };

        const winResult = this._checkConnect4Winner(state.board, row, column);
        
        if (winResult.winner) {
            state.phase = 'complete';
            state.winner = winResult.winner;
            state.winningCells = winResult.cells;
            match.status = 'complete';
            match.winnerId = winResult.winner === 'R' ? match.player1.id : match.player2.id;
            match.winnerWallet = winResult.winner === 'R' ? match.player1.wallet : match.player2.wallet;
            match.endedAt = Date.now();
            return { success: true, gameComplete: true };
        }

        if (state.board.every(cell => cell !== null)) {
            state.phase = 'complete';
            state.winner = 'draw';
            match.status = 'complete';
            match.endedAt = Date.now();
            return { success: true, gameComplete: true, isDraw: true };
        }

        state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
        state.turnStartedAt = Date.now();
        return { success: true };
    }

    _getConnect4LowestRow(board, column) {
        for (let row = 0; row < C4_ROWS; row++) {
            if (board[row * C4_COLS + column] === null) return row;
        }
        return -1;
    }

    _checkConnect4Winner(board, lastRow, lastCol) {
        const player = board[lastRow * C4_COLS + lastCol];
        if (!player) return { winner: null, cells: null };

        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
        
        for (const [dr, dc] of directions) {
            const cells = this._countConnect4Line(board, lastRow, lastCol, dr, dc, player);
            if (cells.length >= C4_WIN_LENGTH) {
                return { winner: player, cells };
            }
        }
        return { winner: null, cells: null };
    }

    _countConnect4Line(board, row, col, dr, dc, player) {
        const cells = [[row, col]];
        
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r * C4_COLS + c] === player) {
            cells.push([r, c]);
            r += dr;
            c += dc;
        }
        
        r = row - dr;
        c = col - dc;
        while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r * C4_COLS + c] === player) {
            cells.push([r, c]);
            r -= dr;
            c -= dc;
        }
        
        return cells;
    }

    // ==================== MONOPOLY ====================
    
    _playMonopoly(match, playerId, actionData) {
        const state = match.state;
        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };
        
        const currentPlayer = isPlayer1 ? 'player1' : 'player2';
        const isMyTurn = state.currentTurn === currentPlayer;
        
        // Parse action
        const action = typeof actionData === 'object' ? actionData.action : actionData;
        
        switch (action) {
            case 'roll':
                return this._monopolyRoll(match, state, currentPlayer, isMyTurn);
            case 'completeMove':
                return this._monopolyCompleteMove(match, state, currentPlayer, isMyTurn);
            case 'buy':
                return this._monopolyBuy(match, state, currentPlayer, isMyTurn);
            case 'endTurn':
                return this._monopolyEndTurn(match, state, currentPlayer, isMyTurn);
            default:
                return { error: 'INVALID_ACTION' };
        }
    }
    
    _monopolyRoll(match, state, currentPlayer, isMyTurn) {
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };
        if (state.phase !== 'roll') return { error: 'NOT_ROLL_PHASE' };
        
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const total = d1 + d2;
        const isDoubles = d1 === d2;
        
        state.lastDice = [d1, d2];
        const player = state[currentPlayer];
        
        // Handle jail (per official rules: roll doubles OR pay $50 after 3 failed attempts)
        if (player.inJail) {
            if (isDoubles) {
                player.inJail = false;
                player.jailTurns = 0;
                state.doublesCount = 0; // Reset doubles after escaping jail
                state.currentEvent = { type: 'jail', title: 'DOUBLES!', description: 'You escaped jail!' };
                // Continue to move with this roll
            } else {
                player.jailTurns++;
                if (player.jailTurns >= 3) {
                    // Must pay $50 bail after 3 attempts
                    player.money -= 50;
                    player.inJail = false;
                    player.jailTurns = 0;
                    state.currentEvent = { type: 'jail', title: 'PAID BAIL', description: 'Paid $50 to leave jail' };
                    
                    // Check bankruptcy from bail payment
                    if (player.money < 0) {
                        state.phase = 'complete';
                        state.winner = currentPlayer === 'player1' ? 'player2' : 'player1';
                        match.status = 'complete';
                        match.winnerId = state.winner === 'player1' ? match.player1.id : match.player2.id;
                        match.winnerWallet = state.winner === 'player1' ? match.player1.wallet : match.player2.wallet;
                        match.endedAt = Date.now();
                        return { success: true, gameComplete: true, bankruptcy: true };
                    }
                    // Continue to move with this roll after paying bail
                } else {
                    state.currentEvent = { type: 'jail', title: 'STILL IN JAIL', description: `${3 - player.jailTurns} tries left` };
                    state.phase = 'end';
                    return { success: true, stayInJail: true };
                }
            }
        }
        
        // Check 3 doubles = jail
        if (isDoubles && !player.inJail) {
            state.doublesCount++;
            if (state.doublesCount >= 3) {
                this._monopolySendToJail(state, currentPlayer);
                state.currentEvent = { type: 'jail', title: 'ARRESTED!', description: 'Three doubles - go to jail!' };
                state.phase = 'end';
                return { success: true, goToJail: true };
            }
        } else if (!isDoubles) {
            state.doublesCount = 0;
        }
        
        // Calculate new position
        const oldPos = player.position;
        const newPos = (oldPos + total) % 40;
        const passedGo = newPos < oldPos && oldPos !== 0;
        
        if (passedGo) {
            player.money += 200;
        }
        
        // Set animation state
        state.animatingMove = true;
        state.moveFrom = oldPos;
        state.moveTo = newPos;
        state.phase = 'moving';
        
        return { success: true, dice: [d1, d2], total, isDoubles, passedGo, from: oldPos, to: newPos };
    }
    
    _monopolyCompleteMove(match, state, currentPlayer, isMyTurn) {
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };
        if (state.phase !== 'moving') return { error: 'NOT_MOVING_PHASE' };
        
        const player = state[currentPlayer];
        player.position = state.moveTo;
        state.animatingMove = false;
        
        const space = MONOPOLY_SPACES[player.position];
        state.canBuy = false;
        state.buyPrice = 0;
        
        // Handle landing
        switch (space.type) {
            case 'property':
            case 'station':
            case 'utility':
                this._monopolyHandlePropertyLanding(match, state, currentPlayer, player.position);
                break;
            case 'tax':
                player.money -= space.price;
                state.currentEvent = { type: 'tax', title: 'TAX', description: `Paid $${space.price}` };
                state.phase = 'end';
                break;
            case 'chance':
                this._monopolyHandleCard(match, state, currentPlayer, MONOPOLY_CHANCE_CARDS, 'CHANCE');
                break;
            case 'chest':
                this._monopolyHandleCard(match, state, currentPlayer, MONOPOLY_CHEST_CARDS, 'COMMUNITY CHEST');
                break;
            case 'gotojail':
                this._monopolySendToJail(state, currentPlayer);
                state.currentEvent = { type: 'jail', title: 'GO TO JAIL', description: 'Do not pass GO' };
                state.phase = 'end';
                break;
            default:
                state.phase = 'end';
                break;
        }
        
        // Check bankruptcy
        if (player.money < 0) {
            state.phase = 'complete';
            state.winner = currentPlayer === 'player1' ? 'player2' : 'player1';
            match.status = 'complete';
            match.winnerId = state.winner === 'player1' ? match.player1.id : match.player2.id;
            match.winnerWallet = state.winner === 'player1' ? match.player1.wallet : match.player2.wallet;
            match.endedAt = Date.now();
            return { success: true, gameComplete: true };
        }
        
        return { success: true };
    }
    
    _monopolyHandlePropertyLanding(match, state, currentPlayer, position) {
        const owner = state.propertyOwners[position];
        const space = MONOPOLY_SPACES[position];
        const player = state[currentPlayer];
        
        if (owner === null) {
            if (player.money >= space.price) {
                state.canBuy = true;
                state.buyPrice = space.price;
                state.currentEvent = { type: 'buy', title: space.name, description: `Available for $${space.price}` };
                state.phase = 'action';
            } else {
                state.currentEvent = { type: 'buy', title: space.name, description: `Can't afford $${space.price}` };
                state.phase = 'end';
            }
        } else if (owner === currentPlayer) {
            state.currentEvent = { type: 'own', title: space.name, description: 'You own this' };
            state.phase = 'end';
        } else {
            const rent = this._monopolyCalculateRent(state, position, owner);
            player.money -= rent;
            state[owner].money += rent;
            state.currentEvent = { type: 'rent', title: 'RENT DUE', description: `Paid $${rent}` };
            state.phase = 'end';
        }
    }
    
    _monopolyCalculateRent(state, position, owner) {
        const space = MONOPOLY_SPACES[position];
        let rent = space.rent || 0;
        const ownerProps = state[owner].properties;
        const group = space.group;
        
        if (group !== 'NONE' && group !== 'UTILITY' && group !== 'STATION') {
            const groupCount = ownerProps.filter(i => MONOPOLY_SPACES[i].group === group).length;
            if (groupCount === MONOPOLY_GROUP_SIZES[group]) {
                rent *= 2;
            }
        }
        
        if (space.type === 'station') {
            const count = ownerProps.filter(i => MONOPOLY_SPACES[i].type === 'station').length;
            rent = 25 * Math.pow(2, count - 1);
        }
        
        if (space.type === 'utility') {
            const count = ownerProps.filter(i => MONOPOLY_SPACES[i].type === 'utility').length;
            const multiplier = count === 2 ? 10 : 4;
            rent = (state.lastDice[0] + state.lastDice[1]) * multiplier;
        }
        
        return rent;
    }
    
    _monopolyHandleCard(match, state, currentPlayer, deck, title) {
        const card = deck[Math.floor(Math.random() * deck.length)];
        const player = state[currentPlayer];
        
        state.currentEvent = { type: title.toLowerCase().replace(' ', ''), title, description: card.text };
        
        let needsLandingCheck = false;
        
        switch (card.action) {
            case 'go':
                player.position = 0;
                player.money += 200;
                break;
            case 'moveTo':
                // Check if passing GO when moving to new position
                if (card.position < player.position && player.position !== 0) {
                    player.money += 200; // Passed GO
                    state.currentEvent.description += ' (Collected $200 for passing GO!)';
                }
                player.position = card.position;
                needsLandingCheck = true; // Need to handle landing on new position
                break;
            case 'collect':
                player.money += card.amount;
                break;
            case 'pay':
                player.money -= card.amount;
                break;
            case 'jail':
                this._monopolySendToJail(state, currentPlayer);
                break;
        }
        
        // If the card moved the player, handle landing on the new space
        if (needsLandingCheck) {
            const newSpace = MONOPOLY_SPACES[player.position];
            if (newSpace.type === 'property' || newSpace.type === 'station' || newSpace.type === 'utility') {
                // Delay the property handling - first show the card, then handle landing
                // Set a flag that we need to handle property landing after card dismissal
                state.pendingPropertyLanding = true;
                state.phase = 'end'; // End turn first to show card, then player can click end turn to trigger landing
            } else if (newSpace.type === 'gotojail') {
                this._monopolySendToJail(state, currentPlayer);
                state.phase = 'end';
            } else if (newSpace.type === 'tax') {
                player.money -= newSpace.price;
                state.currentEvent.description += ` Then paid $${newSpace.price} tax.`;
                state.phase = 'end';
            } else {
                state.phase = 'end';
            }
        } else {
            state.phase = 'end';
        }
    }
    
    _monopolySendToJail(state, currentPlayer) {
        const player = state[currentPlayer];
        player.position = 10;
        player.inJail = true;
        player.jailTurns = 0;
        state.doublesCount = 0;
    }
    
    _monopolyBuy(match, state, currentPlayer, isMyTurn) {
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };
        if (state.phase !== 'action' || !state.canBuy) return { error: 'CANNOT_BUY' };
        
        const player = state[currentPlayer];
        const position = player.position;
        const space = MONOPOLY_SPACES[position];
        
        if (player.money < space.price) return { error: 'NOT_ENOUGH_MONEY' };
        
        player.money -= space.price;
        player.properties.push(position);
        state.propertyOwners[position] = currentPlayer;
        state.canBuy = false;
        
        // Check monopoly
        const group = space.group;
        let isMonopoly = false;
        if (group !== 'NONE' && group !== 'UTILITY' && group !== 'STATION') {
            const groupCount = player.properties.filter(i => MONOPOLY_SPACES[i].group === group).length;
            isMonopoly = groupCount === MONOPOLY_GROUP_SIZES[group];
        }
        
        state.currentEvent = { 
            type: 'bought', 
            title: 'PURCHASED!', 
            description: `Bought ${space.name}${isMonopoly ? ' - MONOPOLY!' : ''}` 
        };
        state.phase = 'end';
        
        return { success: true, property: position, price: space.price, isMonopoly };
    }
    
    _monopolyEndTurn(match, state, currentPlayer, isMyTurn) {
        if (!isMyTurn) return { error: 'NOT_YOUR_TURN' };
        if (state.phase !== 'action' && state.phase !== 'end') return { error: 'CANNOT_END_TURN' };
        
        // Handle pending property landing from card movement
        if (state.pendingPropertyLanding) {
            state.pendingPropertyLanding = false;
            const player = state[currentPlayer];
            this._monopolyHandlePropertyLanding(match, state, currentPlayer, player.position);
            
            // Check bankruptcy after landing
            if (player.money < 0) {
                state.phase = 'complete';
                state.winner = currentPlayer === 'player1' ? 'player2' : 'player1';
                match.status = 'complete';
                match.winnerId = state.winner === 'player1' ? match.player1.id : match.player2.id;
                match.winnerWallet = state.winner === 'player1' ? match.player1.wallet : match.player2.wallet;
                match.endedAt = Date.now();
                return { success: true, gameComplete: true };
            }
            
            // If landing gave them an action (buy property), don't end turn yet
            if (state.phase === 'action') {
                return { success: true, canBuy: true };
            }
        }
        
        // Check doubles (roll again)
        if (state.doublesCount > 0 && !state[currentPlayer].inJail) {
            state.phase = 'roll';
            state.currentEvent = { type: 'doubles', title: 'DOUBLES!', description: 'Roll again!' };
            return { success: true, rollAgain: true };
        }
        
        // Switch turn
        state.currentTurn = state.currentTurn === 'player1' ? 'player2' : 'player1';
        state.phase = 'roll';
        state.doublesCount = 0;
        state.currentEvent = null;
        state.pendingPropertyLanding = false;
        state.turnStartedAt = Date.now();
        
        return { success: true };
    }

    _playCardJitsu(match, playerId, cardIndex) {
        if (match.state.phase !== 'select') return { error: 'NOT_SELECT_PHASE' };

        const isPlayer1 = playerId === match.player1.id;
        const isPlayer2 = playerId === match.player2.id;
        if (!isPlayer1 && !isPlayer2) return { error: 'NOT_IN_MATCH' };

        const hand = isPlayer1 ? match.state.player1Hand : match.state.player2Hand;
        if (cardIndex < 0 || cardIndex >= hand.length) return { error: 'INVALID_CARD' };

        if (isPlayer1) {
            if (match.state.player1SelectedCard !== null) return { error: 'ALREADY_SELECTED' };
            match.state.player1SelectedCard = cardIndex;
        } else {
            if (match.state.player2SelectedCard !== null) return { error: 'ALREADY_SELECTED' };
            match.state.player2SelectedCard = cardIndex;
        }

        if (match.state.player1SelectedCard !== null && match.state.player2SelectedCard !== null) {
            this._resolveRound(match);
        }

        return { success: true, bothSelected: match.state.phase === 'reveal' };
    }

    _resolveRound(match) {
        match.state.phase = 'reveal';
        
        const p1Card = match.state.player1Hand[match.state.player1SelectedCard];
        const p2Card = match.state.player2Hand[match.state.player2SelectedCard];
        
        let roundWinner = this._determineWinner(p1Card, p2Card);
        
        if (roundWinner === 'player1') {
            match.state.player1Wins[p1Card.element]++;
        } else if (roundWinner === 'player2') {
            match.state.player2Wins[p2Card.element]++;
        }
        
        match.state.lastRoundResult = { player1Card: p1Card, player2Card: p2Card, winner: roundWinner };

        const p1Won = this._checkWinCondition(match.state.player1Wins);
        const p2Won = this._checkWinCondition(match.state.player2Wins);
        
        if (p1Won || p2Won) {
            match.state.phase = 'complete';
            match.status = 'complete';
            match.winnerId = p1Won ? match.player1.id : match.player2.id;
            match.winnerWallet = p1Won ? match.player1.wallet : match.player2.wallet;
            match.endedAt = Date.now();
        } else {
            setTimeout(() => {
                if (match.status === 'active' || match.state.phase === 'reveal') {
                    this._startNextRound(match);
                }
            }, 2000);
        }

        return match.state.lastRoundResult;
    }

    _determineWinner(card1, card2) {
        const wins = { fire: 'snow', snow: 'water', water: 'fire' };
        
        if (wins[card1.element] === card2.element) return 'player1';
        if (wins[card2.element] === card1.element) return 'player2';
        
        if (card1.power > card2.power) return 'player1';
        if (card2.power > card1.power) return 'player2';
        return 'tie';
    }

    _checkWinCondition(wins) {
        if (wins.fire >= 3 || wins.water >= 3 || wins.snow >= 3) return true;
        if (wins.fire >= 1 && wins.water >= 1 && wins.snow >= 1) return true;
        return false;
    }

    _startNextRound(match) {
        if (match.state.player1SelectedCard !== null) {
            match.state.player1Hand.splice(match.state.player1SelectedCard, 1);
            match.state.player1Hand.push(this._generateCard());
        }
        if (match.state.player2SelectedCard !== null) {
            match.state.player2Hand.splice(match.state.player2SelectedCard, 1);
            match.state.player2Hand.push(this._generateCard());
        }
        
        match.state.round++;
        match.state.phase = 'select';
        match.state.player1SelectedCard = null;
        match.state.player2SelectedCard = null;
        match.state.turnStartedAt = Date.now();
        match.state.lastRoundResult = null;
        
        while (match.state.player1Hand.length < 5) match.state.player1Hand.push(this._generateCard());
        while (match.state.player2Hand.length < 5) match.state.player2Hand.push(this._generateCard());
        
        this._notifyMatchState(match);
    }

    checkTurnTimers() {
        const now = Date.now();
        
        for (const [matchId, match] of this.matches) {
            if (match.status !== 'active') continue;
            
            const elapsed = now - match.state.turnStartedAt;
            if (elapsed < TURN_TIME_LIMIT_MS) continue;
            
            if (match.gameType === 'tic_tac_toe') {
                this._handleTicTacToeTimeout(match);
            } else if (match.gameType === 'connect4') {
                this._handleConnect4Timeout(match);
            } else if (match.gameType === 'monopoly') {
                this._handleMonopolyTimeout(match);
            } else if (match.gameType === 'uno') {
                this._handleUnoTimeout(match);
            } else if (match.gameType === 'blackjack') {
                this._handleBlackjackTimeout(match);
            } else if (match.gameType === 'battleship') {
                this._handleBattleshipTimeout(match);
            } else {
                this._handleCardJitsuTimeout(match);
            }
            
            this._notifyMatchState(match);
        }
    }

    _handleTicTacToeTimeout(match) {
        const state = match.state;
        if (state.phase !== 'playing') return;
        
        const emptyCells = state.board.map((cell, i) => cell === null ? i : -1).filter(i => i !== -1);
        if (emptyCells.length === 0) return;
        
        const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const currentPlayerId = state.currentTurn === 'player1' ? match.player1.id : match.player2.id;
        
        console.log(`⏰ Auto-play for ${state.currentTurn === 'player1' ? match.player1.name : match.player2.name}`);
        this._playTicTacToe(match, currentPlayerId, randomCell);
    }

    _handleConnect4Timeout(match) {
        const state = match.state;
        if (state.phase !== 'playing') return;
        
        const availableCols = [];
        for (let col = 0; col < C4_COLS; col++) {
            if (state.board[(C4_ROWS - 1) * C4_COLS + col] === null) availableCols.push(col);
        }
        if (availableCols.length === 0) return;
        
        const column = availableCols.includes(3) ? 3 : availableCols[Math.floor(Math.random() * availableCols.length)];
        const currentPlayerId = state.currentTurn === 'player1' ? match.player1.id : match.player2.id;
        
        console.log(`⏰ Auto-play for ${state.currentTurn === 'player1' ? match.player1.name : match.player2.name}`);
        this._playConnect4(match, currentPlayerId, column);
    }

    _handleCardJitsuTimeout(match) {
        if (match.state.phase !== 'select') return;
        
        if (match.state.player1SelectedCard === null) {
            match.state.player1SelectedCard = 0;
            console.log(`⏰ Auto-play for ${match.player1.name}`);
        }
        if (match.state.player2SelectedCard === null) {
            match.state.player2SelectedCard = 0;
            console.log(`⏰ Auto-play for ${match.player2.name}`);
        }
        
        this._resolveRound(match);
    }
    
    _handleMonopolyTimeout(match) {
        const state = match.state;
        const currentPlayerId = state.currentTurn === 'player1' ? match.player1.id : match.player2.id;
        const playerName = state.currentTurn === 'player1' ? match.player1.name : match.player2.name;
        
        console.log(`⏰ Monopoly auto-play for ${playerName}, phase: ${state.phase}`);
        
        // Auto-actions based on phase
        if (state.phase === 'roll') {
            this._monopolyRoll(match, state, state.currentTurn, true);
            this._notifyMatchState(match);
        } else if (state.phase === 'moving') {
            this._monopolyCompleteMove(match, state, state.currentTurn, true);
            this._notifyMatchState(match);
        } else if (state.phase === 'action' || state.phase === 'end') {
            // Skip buying, just end turn
            this._monopolyEndTurn(match, state, state.currentTurn, true);
            this._notifyMatchState(match);
        }
    }

    _notifyMatchState(match) {
        const state1 = this.getMatchState(match.id, match.player1.id);
        this.sendToPlayer(match.player1.id, { type: 'match_state', matchId: match.id, state: state1 });
        
        const state2 = this.getMatchState(match.id, match.player2.id);
        this.sendToPlayer(match.player2.id, { type: 'match_state', matchId: match.id, state: state2 });
        
        this._broadcastSpectatorUpdate(match);
    }

    _broadcastSpectatorUpdate(match) {
        if (!match.room) return;
        
        let spectatorState;
        if (match.gameType === 'tic_tac_toe') {
            spectatorState = {
                board: [...match.state.board],
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                winner: match.state.winner,
                winningLine: match.state.winningLine,
                status: match.status,
                winnerId: match.winnerId
            };
        } else if (match.gameType === 'connect4') {
            spectatorState = {
                board: [...match.state.board],
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                winner: match.state.winner,
                winningCells: match.state.winningCells,
                lastMove: match.state.lastMove,
                status: match.status,
                winnerId: match.winnerId
            };
        } else if (match.gameType === 'monopoly') {
            spectatorState = {
                player1Position: match.state.player1.position,
                player1Money: match.state.player1.money,
                player1Properties: match.state.player1.properties,
                player1InJail: match.state.player1.inJail,
                player2Position: match.state.player2.position,
                player2Money: match.state.player2.money,
                player2Properties: match.state.player2.properties,
                player2InJail: match.state.player2.inJail,
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                lastDice: match.state.lastDice,
                currentEvent: match.state.currentEvent,
                propertyOwners: match.state.propertyOwners,
                winner: match.state.winner,
                status: match.status,
                winnerId: match.winnerId
            };
        } else if (match.gameType === 'uno') {
            // Get top discard card
            const topDiscard = match.state.discard[match.state.discard.length - 1];
            spectatorState = {
                player1CardCount: match.state.player1Hand.length,
                player2CardCount: match.state.player2Hand.length,
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                activeColor: match.state.activeColor,
                activeValue: match.state.activeValue,
                topCard: topDiscard,
                lastAction: match.state.lastAction,
                winner: match.state.winner,
                status: match.status,
                winnerId: match.winnerId,
                calledUno: match.state.calledUno
            };
        } else if (match.gameType === 'blackjack') {
            // P2P Blackjack: Hide hands from spectators to prevent cheating
            // Only show card counts, status, and results (not actual cards)
            const isComplete = match.state.phase === 'complete';
            spectatorState = {
                player1CardCount: match.state.player1Hand?.length || 0,
                player1Status: match.state.player1Status,
                player1Result: match.state.player1Result,
                player1Score: isComplete ? match.state.player1Score : null,
                player2CardCount: match.state.player2Hand?.length || 0,
                player2Status: match.state.player2Status,
                player2Result: match.state.player2Result,
                player2Score: isComplete ? match.state.player2Score : null,
                dealerCardCount: match.state.dealerHand?.length || 0,
                dealerStatus: match.state.dealerStatus,
                dealerScore: isComplete ? match.state.dealerScore : null,
                currentTurn: match.state.currentTurn,
                phase: match.state.phase,
                lastAction: match.state.lastAction ? { type: match.state.lastAction.type, player: match.state.lastAction.player } : null,
                winner: match.state.winner,
                status: match.status,
                winnerId: match.winnerId
            };
        } else if (match.gameType === 'battleship') {
            // Battleship: Show phase, ship counts (not positions), and who's winning
            const p1SunkCount = match.state.player1Ships?.filter(s => s.sunk).length || 0;
            const p2SunkCount = match.state.player2Ships?.filter(s => s.sunk).length || 0;
            spectatorState = {
                phase: match.state.phase,
                currentTurn: match.state.currentTurn,
                player1ShipsSunk: p1SunkCount,
                player2ShipsSunk: p2SunkCount,
                totalShips: BATTLESHIP_SHIPS.length,
                player1Ready: match.state.player1Ready,
                player2Ready: match.state.player2Ready,
                lastAction: match.state.lastAction ? { type: match.state.lastAction.type, player: match.state.lastAction.player } : null,
                winner: match.state.winner,
                status: match.status,
                winnerId: match.winnerId
            };
        } else {
            spectatorState = {
                round: match.state.round,
                phase: match.state.phase,
                player1Wins: match.state.player1Wins,
                player2Wins: match.state.player2Wins,
                lastRoundResult: match.state.lastRoundResult ? {
                    player1Card: { element: match.state.lastRoundResult.player1Card?.element, emoji: match.state.lastRoundResult.player1Card?.emoji },
                    player2Card: { element: match.state.lastRoundResult.player2Card?.element, emoji: match.state.lastRoundResult.player2Card?.emoji },
                    winner: match.state.lastRoundResult.winner
                } : null,
                status: match.status,
                winnerId: match.winnerId
            };
        }
        
        this.broadcastToRoom(match.room, {
            type: 'match_spectate',
            matchId: match.id,
            gameType: match.gameType,
            players: [
                { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                { id: match.player2.id, name: match.player2.name, position: match.player2.position }
            ],
            state: spectatorState,
            wagerAmount: match.wagerAmount
        }, match.player1.id, match.player2.id);
    }

    getMatchState(matchId, playerId) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        const isPlayer1 = playerId === match.player1.id;
        const timeRemaining = Math.max(0, Math.ceil(
            (TURN_TIME_LIMIT_MS - (Date.now() - match.state.turnStartedAt)) / 1000
        ));

        if (match.gameType === 'tic_tac_toe') {
            return this._getTicTacToeState(match, playerId, isPlayer1, timeRemaining);
        }
        if (match.gameType === 'connect4') {
            return this._getConnect4State(match, playerId, isPlayer1, timeRemaining);
        }
        if (match.gameType === 'monopoly') {
            return this._getMonopolyState(match, playerId, isPlayer1, timeRemaining);
        }
        if (match.gameType === 'uno') {
            return this._getUnoState(match, playerId, isPlayer1, timeRemaining);
        }
        if (match.gameType === 'blackjack') {
            return this._getBlackjackState(match, playerId, isPlayer1, timeRemaining);
        }
        if (match.gameType === 'battleship') {
            return this._getBattleshipState(match, playerId, isPlayer1, timeRemaining);
        }
        return this._getCardJitsuState(match, playerId, isPlayer1, timeRemaining);
    }
    
    _getUnoState(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const currentPlayer = isPlayer1 ? 'player1' : 'player2';
        const opponent = isPlayer1 ? 'player2' : 'player1';
        const isMyTurn = state.currentTurn === currentPlayer;
        
        // Get top discard card
        const topDiscard = state.discard[state.discard.length - 1];
        
        // My hand shows full cards, opponent's hand shows only count
        const myHand = isPlayer1 ? state.player1Hand : state.player2Hand;
        const opponentHandCount = isPlayer1 ? state.player2Hand.length : state.player1Hand.length;
        
        return {
            // My hand (with full card data)
            myHand: [...myHand],
            opponentCardCount: opponentHandCount,
            
            // Discard/deck info
            topCard: topDiscard,
            deckCount: state.deck.length,
            
            // Game state
            activeColor: state.activeColor,
            activeValue: state.activeValue,
            currentTurn: state.currentTurn,
            phase: state.phase,
            isMyTurn,
            
            // For color selection
            waitingForColor: state.waitingForColor === currentPlayer,
            
            // Last action
            lastAction: state.lastAction,
            
            // UNO call status
            myUnoCall: state.calledUno[currentPlayer],
            opponentUnoCall: state.calledUno[opponent],
            
            // Win state
            winner: state.winner,
            gameComplete: state.phase === 'complete',
            
            // Timer
            timeRemaining,
            
            // Match info
            status: match.status,
            matchId: match.id
        };
    }
    
    _getMonopolyState(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const currentPlayer = isPlayer1 ? 'player1' : 'player2';
        const opponent = isPlayer1 ? 'player2' : 'player1';
        const isMyTurn = state.currentTurn === currentPlayer;
        
        return {
            // My info
            myPosition: state[currentPlayer].position,
            myMoney: state[currentPlayer].money,
            myProperties: state[currentPlayer].properties,
            myInJail: state[currentPlayer].inJail,
            
            // Opponent info
            opponentPosition: state[opponent].position,
            opponentMoney: state[opponent].money,
            opponentProperties: state[opponent].properties,
            opponentInJail: state[opponent].inJail,
            
            // Turn state
            isMyTurn,
            currentTurn: state.currentTurn,
            phase: state.phase,
            
            // Dice and events
            lastDice: state.lastDice,
            currentEvent: state.currentEvent,
            
            // Actions available
            canBuy: state.canBuy && isMyTurn,
            buyPrice: state.buyPrice,
            canRoll: state.phase === 'roll' && isMyTurn,
            canEndTurn: (state.phase === 'action' || state.phase === 'end') && isMyTurn,
            
            // Animation
            animatingMove: state.animatingMove,
            moveFrom: state.moveFrom,
            moveTo: state.moveTo,
            
            // Game end
            winner: state.winner,
            status: state.winner ? 'complete' : 'playing',
            
            // Board state
            propertyOwners: state.propertyOwners,
            
            // Metadata
            isPlayer1,
            turnTimeRemaining: timeRemaining,
            winnerId: match.winnerId
        };
    }

    _getTicTacToeState(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && !isPlayer1);
        
        return {
            board: [...state.board],
            currentTurn: state.currentTurn,
            isMyTurn,
            mySymbol: isPlayer1 ? 'X' : 'O',
            opponentSymbol: isPlayer1 ? 'O' : 'X',
            phase: state.phase,
            winner: state.winner,
            winningLine: state.winningLine,
            turnTimeRemaining: timeRemaining,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }

    _getConnect4State(match, playerId, isPlayer1, timeRemaining) {
        const state = match.state;
        const isMyTurn = (state.currentTurn === 'player1' && isPlayer1) || 
                         (state.currentTurn === 'player2' && !isPlayer1);
        
        return {
            board: [...state.board],
            currentTurn: state.currentTurn,
            isMyTurn,
            myColor: isPlayer1 ? 'R' : 'Y',
            opponentColor: isPlayer1 ? 'Y' : 'R',
            phase: state.phase,
            winner: state.winner,
            winningCells: state.winningCells,
            lastMove: state.lastMove,
            turnTimeRemaining: timeRemaining,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }

    _getCardJitsuState(match, playerId, isPlayer1, timeRemaining) {
        const myHand = isPlayer1 ? match.state.player1Hand : match.state.player2Hand;
        const mySelection = isPlayer1 ? match.state.player1SelectedCard : match.state.player2SelectedCard;
        const opponentSelection = isPlayer1 ? match.state.player2SelectedCard : match.state.player1SelectedCard;

        return {
            round: match.state.round,
            phase: match.state.phase,
            myHand,
            mySelectedCard: mySelection,
            opponentHasSelected: opponentSelection !== null,
            player1Wins: match.state.player1Wins,
            player2Wins: match.state.player2Wins,
            turnTimeRemaining: timeRemaining,
            lastRoundResult: match.state.lastRoundResult,
            isPlayer1,
            status: match.status,
            winnerId: match.winnerId
        };
    }

    /**
     * Void a match and save to DB
     */
    async voidMatch(matchId, reason = 'disconnect') {
        const match = this.matches.get(matchId);
        if (!match) return null;

        match.status = 'void';
        match.endedAt = Date.now();
        
        // Clean up mappings
        this.playerMatches.delete(match.player1.id);
        this.playerMatches.delete(match.player2.id);
        if (match.player1.wallet) this.walletMatches.delete(match.player1.wallet);
        if (match.player2.wallet) this.walletMatches.delete(match.player2.wallet);
        
        // Update in database
        if (isDBConnected()) {
            try {
                await MatchModel.updateOne(
                    { matchId },
                    { 
                        status: 'void',
                        endedAt: match.endedAt,
                        gameState: null
                    }
                );
            } catch (error) {
                console.error('Error voiding match in DB:', error);
            }
        }
        
        console.log(`🚫 Match voided: ${match.player1.name} vs ${match.player2.name} (${reason})`);
        
        return {
            matchId,
            player1Id: match.player1.id,
            player2Id: match.player2.id,
            player1Wallet: match.player1.wallet,
            player2Wallet: match.player2.wallet,
            wagerAmount: match.wagerAmount,
            reason
        };
    }

    /**
     * End a match and persist to DB
     * NOTE: Token settlement is handled by handleMatchPayout() in server/index.js
     * This method only handles cleanup and DB persistence
     */
    async endMatch(matchId) {
        const match = this.matches.get(matchId);
        if (!match) return null;

        // Clean up mappings
        this.playerMatches.delete(match.player1.id);
        this.playerMatches.delete(match.player2.id);
        if (match.player1.wallet) this.walletMatches.delete(match.player1.wallet);
        if (match.player2.wallet) this.walletMatches.delete(match.player2.wallet);
        
        // Determine winner/loser info for DB persistence
        const isPlayer1Winner = match.winnerId === match.player1.id;
        const winnerId = match.winnerId;
        const winnerName = isPlayer1Winner ? match.player1.name : match.player2.name;
        const winnerWallet = isPlayer1Winner ? match.player1.wallet : match.player2.wallet;
        const loserId = isPlayer1Winner ? match.player2.id : match.player1.id;
        const loserName = isPlayer1Winner ? match.player2.name : match.player1.name;
        const loserWallet = isPlayer1Winner ? match.player2.wallet : match.player1.wallet;

        // Update in database
        if (isDBConnected()) {
            try {
                await MatchModel.updateOne(
                    { matchId },
                    { 
                        status: match.status,
                        endedAt: match.endedAt,
                        winnerId: winnerId,
                        winnerWallet: winnerWallet,
                        winnerName: winnerName,
                        loserId: loserId,
                        loserWallet: loserWallet,
                        loserName: loserName,
                        payoutProcessed: true,
                        payoutAmount: match.wagerAmount * 2,
                        gameState: null,
                        duration: Math.floor((match.endedAt - match.createdAt) / 1000)
                    }
                );
                console.log(`📊 Match ${matchId} saved to DB: ${winnerName} beat ${loserName} (payout: ${match.wagerAmount * 2} coins)`);
            } catch (error) {
                console.error('Error ending match in DB:', error);
            }
        }

        return match;
    }

    handleDisconnect(playerId) {
        const matchId = this.playerMatches.get(playerId);
        if (!matchId) return null;

        const match = this.matches.get(matchId);
        if (!match || match.status !== 'active') return null;

        return this.voidMatch(matchId, 'disconnect');
    }

    getMatchesInRoom(room) {
        const matches = [];
        for (const [, match] of this.matches) {
            if (match.room === room && match.status === 'active') {
                let spectatorState;
                if (match.gameType === 'tic_tac_toe') {
                    spectatorState = {
                        board: [...match.state.board],
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        winningLine: match.state.winningLine,
                        status: match.status
                    };
                } else if (match.gameType === 'connect4') {
                    spectatorState = {
                        board: [...match.state.board],
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        winningCells: match.state.winningCells,
                        lastMove: match.state.lastMove,
                        status: match.status
                    };
                } else if (match.gameType === 'monopoly') {
                    spectatorState = {
                        player1Position: match.state.player1.position,
                        player1Money: match.state.player1.money,
                        player1Properties: match.state.player1.properties,
                        player2Position: match.state.player2.position,
                        player2Money: match.state.player2.money,
                        player2Properties: match.state.player2.properties,
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        lastDice: match.state.lastDice,
                        propertyOwners: match.state.propertyOwners,
                        winner: match.state.winner,
                        status: match.status
                    };
                } else if (match.gameType === 'uno') {
                    const topDiscard = match.state.discard[match.state.discard.length - 1];
                    spectatorState = {
                        player1CardCount: match.state.player1Hand.length,
                        player2CardCount: match.state.player2Hand.length,
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        activeColor: match.state.activeColor,
                        activeValue: match.state.activeValue,
                        topCard: topDiscard,
                        lastAction: match.state.lastAction,
                        winner: match.state.winner,
                        status: match.status,
                        calledUno: match.state.calledUno
                    };
                } else if (match.gameType === 'blackjack') {
                    // P2P blackjack - hide hands during gameplay
                    const visibleDealerHand = match.state.phase === 'dealerTurn' || match.state.phase === 'complete'
                        ? match.state.dealerHand
                        : match.state.dealerHand?.map((card, i) => i === 0 ? { hidden: true } : card) || [];
                    spectatorState = {
                        player1CardCount: match.state.player1Hand?.length || 0,
                        player1Status: match.state.player1Status,
                        player2CardCount: match.state.player2Hand?.length || 0,
                        player2Status: match.state.player2Status,
                        dealerCardCount: visibleDealerHand?.length || 0,
                        dealerStatus: match.state.dealerStatus,
                        dealerScore: match.state.phase === 'complete' ? match.state.dealerScore : null,
                        currentTurn: match.state.currentTurn,
                        phase: match.state.phase,
                        winner: match.state.winner,
                        status: match.status
                    };
                } else if (match.gameType === 'battleship') {
                    const p1SunkCount = match.state.player1Ships?.filter(s => s.sunk).length || 0;
                    const p2SunkCount = match.state.player2Ships?.filter(s => s.sunk).length || 0;
                    spectatorState = {
                        phase: match.state.phase,
                        currentTurn: match.state.currentTurn,
                        player1ShipsSunk: p1SunkCount,
                        player2ShipsSunk: p2SunkCount,
                        totalShips: BATTLESHIP_SHIPS.length,
                        winner: match.state.winner,
                        status: match.status
                    };
                } else {
                    spectatorState = {
                        round: match.state.round,
                        phase: match.state.phase,
                        player1Wins: match.state.player1Wins,
                        player2Wins: match.state.player2Wins,
                        status: match.status
                    };
                }
                
                matches.push({
                    matchId: match.id,
                    players: [
                        { id: match.player1.id, name: match.player1.name, position: match.player1.position },
                        { id: match.player2.id, name: match.player2.name, position: match.player2.position }
                    ],
                    gameType: match.gameType,
                    wagerAmount: match.wagerAmount,
                    state: spectatorState
                });
            }
        }
        return matches;
    }

    dispose() {
        clearInterval(this.timerInterval);
    }
}

export default MatchService;
