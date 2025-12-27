/**
 * Match Model - P2P match history
 * Stores completed and in-progress matches
 */

import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
    matchId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    challengeId: String,
    
    // ========== PARTICIPANTS ==========
    // Note: wallet can be null for guest players (no wager matches only)
    player1: {
        wallet: { type: String, index: true, sparse: true },
        name: { type: String, required: true },
        playerId: { type: String, required: true }  // Session player ID
    },
    player2: {
        wallet: { type: String, index: true, sparse: true },
        name: { type: String, required: true },
        playerId: { type: String, required: true }
    },
    
    // ========== GAME CONFIG ==========
    gameType: {
        type: String,
        required: true,
        enum: ['cardJitsu', 'connect4', 'ticTacToe', 'pong', 'monopoly', 'uno', 'blackjack', 'battleship'],
        index: true
    },
    wagerAmount: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    
    // ========== SPL TOKEN WAGER (optional, enhancement to coin wager) ==========
    wagerToken: {
        tokenAddress: { type: String, default: null },      // SPL token mint (null = no token wager)
        tokenSymbol: { type: String, default: null },       // Display symbol (e.g., "$CPw3")
        tokenDecimals: { type: Number, default: 6 },        // For amount conversion
        tokenAmount: { type: Number, default: 0 },          // Human-readable amount
        amountRaw: { type: String, default: null }          // BigInt as string (full precision)
    },
    
    // ========== x402 SIGNED PAYLOADS ==========
    // Pre-signed payment: Player1 -> Player2 (executed if Player1 loses)
    player1SignedPayload: { type: String, default: null },
    // Pre-signed payment: Player2 -> Player1 (executed if Player2 loses)
    player2SignedPayload: { type: String, default: null },
    
    // ========== x402 SETTLEMENT ==========
    settlementTx: { type: String, default: null },           // Transaction signature after settlement
    settlementStatus: {
        type: String,
        enum: ['none', 'pending', 'processing', 'completed', 'failed', 'manual_review'],
        default: 'none'
    },
    settlementError: { type: String, default: null },        // Error message if settlement failed
    
    room: {
        type: String,
        index: true
    },
    
    // ========== STATUS ==========
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned', 'draw', 'void'],
        default: 'active',
        index: true
    },
    
    // ========== RESULT ==========
    winnerId: String,        // Player session ID of winner
    winnerWallet: String,    // Wallet address of winner (for payouts)
    winnerName: String,      // Display name of winner
    loserId: String,         // Player session ID of loser
    loserWallet: String,     // Wallet address of loser
    loserName: String,       // Display name of loser
    payoutProcessed: { type: Boolean, default: false },   // Was payout executed?
    payoutAmount: { type: Number, default: 0 },           // Total pot paid out
    
    // ========== GAME STATE (for reconnection) ==========
    // Stored during active match, cleared on completion
    gameState: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    currentTurn: String,  // Wallet of current turn player
    turnCount: {
        type: Number,
        default: 0
    },
    lastMoveAt: Date,
    
    // ========== TIMING ==========
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: Date,
    duration: Number,  // Seconds
    
    // ========== PAYOUT ==========
    payoutProcessed: {
        type: Boolean,
        default: false
    },
    payoutAmount: Number,  // Total pot transferred to winner
    
    // ========== RAKE (Platform Fee) ==========
    rakeAmount: { type: Number, default: 0 },         // Rake amount taken (in tokens)
    rakeAmountRaw: { type: String, default: null },   // Rake in raw units (BigInt as string)
    rakeTx: { type: String, default: null },          // Transaction signature for rake payment
    rakePercent: { type: Number, default: 5 },        // Rake percentage at time of match
    winnerPayoutRaw: { type: String, default: null }  // Winner's actual payout after rake (BigInt as string)

}, {
    timestamps: true
});

// ==================== INDEXES ====================
matchSchema.index({ 'player1.wallet': 1, endedAt: -1 });
matchSchema.index({ 'player2.wallet': 1, endedAt: -1 });
matchSchema.index({ status: 1, startedAt: -1 });
matchSchema.index({ gameType: 1, endedAt: -1 });
matchSchema.index({ winnerWallet: 1, endedAt: -1 });
matchSchema.index({ room: 1, status: 1 });

// ==================== METHODS ====================

/**
 * Complete the match with a winner
 */
matchSchema.methods.complete = function(winnerWallet, winnerName, loserWallet, loserName) {
    this.status = 'completed';
    this.winnerWallet = winnerWallet;
    this.winnerName = winnerName;
    this.loserWallet = loserWallet;
    this.loserName = loserName;
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    this.gameState = null;  // Clear game state
    return this;
};

/**
 * Complete as draw
 */
matchSchema.methods.completeDraw = function() {
    this.status = 'draw';
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    this.gameState = null;
    return this;
};

/**
 * Void the match (disconnect, forfeit)
 */
matchSchema.methods.void = function(reason = 'disconnect') {
    this.status = 'void';
    this.endedAt = new Date();
    this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
    this.gameState = null;
    return this;
};

// ==================== STATICS ====================

/**
 * Find active match for a player
 */
matchSchema.statics.findActiveForPlayer = function(walletAddress) {
    return this.findOne({
        status: 'active',
        $or: [
            { 'player1.wallet': walletAddress },
            { 'player2.wallet': walletAddress }
        ]
    });
};

/**
 * Find match history for a player
 */
matchSchema.statics.findHistoryForPlayer = function(walletAddress, limit = 50) {
    return this.find({
        // Match status is 'complete' (not 'completed') when game ends normally
        status: { $in: ['complete', 'draw', 'void', 'abandoned'] },
        $or: [
            { 'player1.wallet': walletAddress },
            { 'player2.wallet': walletAddress }
        ]
    })
    .sort({ endedAt: -1 })
    .limit(limit);
};

/**
 * Get active matches in a room (for spectating)
 */
matchSchema.statics.findActiveInRoom = function(room) {
    return this.find({
        room: room,
        status: 'active'
    });
};

const Match = mongoose.model('Match', matchSchema);

export default Match;


