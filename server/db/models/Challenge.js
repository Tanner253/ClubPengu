/**
 * Challenge Model - P2P game challenges
 * Tracks pending challenges between players
 */

import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
    challengeId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // ========== CHALLENGER ==========
    // Note: wallet can be null for guest players (friendly matches only)
    challengerWallet: {
        type: String,
        index: true,
        sparse: true
    },
    challengerName: { type: String, required: true },
    challengerId: { type: String, required: true },  // Session player ID
    challengerAppearance: mongoose.Schema.Types.Mixed,
    
    // ========== TARGET ==========
    targetWallet: {
        type: String,
        index: true,
        sparse: true
    },
    targetName: { type: String, required: true },
    targetId: { type: String, required: true },
    targetAppearance: mongoose.Schema.Types.Mixed,
    
    // ========== GAME DETAILS ==========
    gameType: {
        type: String,
        required: true,
        enum: ['cardJitsu', 'connect4', 'ticTacToe', 'pong', 'monopoly', 'uno', 'blackjack', 'battleship']
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
    // Pre-signed payment authorization from challenger -> target (executed if challenger loses)
    challengerSignedPayload: { type: String, default: null },
    // Pre-signed payment authorization from target -> challenger (filled on accept, executed if target loses)
    targetSignedPayload: { type: String, default: null },
    
    room: String,
    
    // ========== STATUS ==========
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled'],
        default: 'pending',
        index: true
    },
    
    // ========== TIMING ==========
    expiresAt: {
        type: Date,
        required: true
        // TTL index defined below with schema.index()
    },
    respondedAt: Date,
    
    // ========== RESULT ==========
    matchId: String,  // If accepted, reference to resulting match
    
    // ========== REFUND TRACKING (for expired token wager challenges) ==========
    refundProcessed: { type: Boolean, default: false },
    refundTx: { type: String, default: null }  // Transaction signature if refunded

}, {
    timestamps: true
});

// TTL index - automatically delete expired challenges
challengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes
challengeSchema.index({ challengerWallet: 1, status: 1 });
challengeSchema.index({ targetWallet: 1, status: 1 });
challengeSchema.index({ room: 1, status: 1 });

// ==================== METHODS ====================

/**
 * Accept the challenge
 */
challengeSchema.methods.accept = function(matchId) {
    this.status = 'accepted';
    this.respondedAt = new Date();
    this.matchId = matchId;
    return this;
};

/**
 * Decline the challenge
 */
challengeSchema.methods.decline = function() {
    this.status = 'declined';
    this.respondedAt = new Date();
    return this;
};

/**
 * Cancel the challenge (by challenger)
 */
challengeSchema.methods.cancel = function() {
    this.status = 'cancelled';
    this.respondedAt = new Date();
    return this;
};

/**
 * Check if challenge is valid/pending
 */
challengeSchema.methods.isValid = function() {
    return this.status === 'pending' && this.expiresAt > new Date();
};

// ==================== STATICS ====================

/**
 * Find pending challenges for a player
 */
challengeSchema.statics.findPendingForPlayer = function(walletAddress) {
    return this.find({
        targetWallet: walletAddress,
        status: 'pending',
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

/**
 * Find pending challenges sent by a player
 */
challengeSchema.statics.findPendingSentBy = function(walletAddress) {
    return this.find({
        challengerWallet: walletAddress,
        status: 'pending',
        expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });
};

/**
 * Check if players have a pending challenge between them
 */
challengeSchema.statics.findExistingBetween = function(wallet1, wallet2) {
    return this.findOne({
        status: 'pending',
        expiresAt: { $gt: new Date() },
        $or: [
            { challengerWallet: wallet1, targetWallet: wallet2 },
            { challengerWallet: wallet2, targetWallet: wallet1 }
        ]
    });
};

const Challenge = mongoose.model('Challenge', challengeSchema);

export default Challenge;

