/**
 * Transaction Model - Audit trail for all coin/value transfers
 * Critical for tracking economy and detecting exploits
 */

import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    transactionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // ========== TYPE ==========
    type: {
        type: String,
        required: true,
        enum: [
            'wager_escrow',      // Coins locked for wager
            'wager_payout',      // Winner receives pot
            'wager_refund',      // Refund on void/draw
            'purchase',          // Shop purchase
            'puffle_adopt',      // Puffle adoption cost
            'promo_bonus',       // Promo code reward
            'stamp_bonus',       // Stamp achievement reward
            'admin_adjustment',  // Admin modification
            'starting_bonus',    // New player starting coins
            'migration',         // Migration from localStorage
            'chat_bonus',        // Coins earned from chatting
            'minigame_reward',   // Coins earned from single-player minigames
            'slot_spin',         // Slot machine spin cost
            'slot_payout',       // Slot machine winnings
            'fishing_bait',      // Bait cost for fishing
            'fishing_catch',     // Coins earned from fishing
            'blackjack_bet',     // PvE blackjack bet
            'blackjack_win',     // PvE blackjack payout
            // ========== GACHA/PEBBLE TYPES ==========
            'gacha_roll',        // Pebbles spent on gacha roll
            'pebble_deposit',    // SOL to Pebbles conversion
            'pebble_withdrawal', // Pebbles to SOL conversion
            'pebble_rake',       // Rake from pebble withdrawal
            'pebble_refund',     // Failed roll refund
            // ========== INVENTORY TYPES ==========
            'cosmetic_burn',     // Cosmetic burned for gold (manual)
            'inventory_upgrade', // Gold spent on inventory slot upgrade
            'gold_sink_reroll',  // Gold spent on quality reroll (future)
            'gold_sink_holo',    // Gold spent on holo blessing (future)
            // ========== GIFTING TYPES ==========
            'gift_gold',         // Gold/coins gifted to another player
            'gift_pebbles',      // Pebbles gifted to another player
            'gift_item',         // Item gifted to another player
            // ========== DAILY BONUS TYPES ==========
            'daily_bonus'        // Daily login bonus WADDLE reward
        ],
        index: true
    },
    
    // ========== PARTICIPANTS ==========
    fromWallet: {
        type: String,
        index: true
    },  // null for system/mint operations
    toWallet: {
        type: String,
        index: true
    },
    
    // ========== AMOUNT ==========
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'coins',
        enum: ['coins', 'pebbles', 'SOL', 'WADDLE', 'CPw3']  // Added WADDLE (formerly CPw3)
    },
    
    // ========== BALANCE SNAPSHOTS ==========
    fromBalanceBefore: Number,
    fromBalanceAfter: Number,
    toBalanceBefore: Number,
    toBalanceAfter: Number,
    
    // ========== RELATED ENTITIES ==========
    relatedData: {
        matchId: String,
        challengeId: String,
        puffleId: String,
        cosmeticId: String,
        promoCode: String,
        fishId: String,
        spotId: String,
        // Gacha-related
        gachaRollId: String,
        cosmeticInstanceId: String,
        cosmeticTemplateId: String,
        // Pebble-related  
        solTxSignature: String,
        solAmount: Number,
        pebbleAmount: Number
    },
    
    // ========== STATUS ==========
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'refunded'],
        default: 'success',
        index: true
    },
    
    // ========== METADATA ==========
    reason: String,  // Human-readable description
    processedAt: {
        type: Date,
        default: Date.now
    },
    failureReason: String,
    
    // ========== AUDIT ==========
    ipAddress: String,
    sessionId: String

}, {
    timestamps: true
});

// ==================== INDEXES ====================
transactionSchema.index({ fromWallet: 1, createdAt: -1 });
transactionSchema.index({ toWallet: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ 'relatedData.matchId': 1 });

// ==================== STATICS ====================

/**
 * Generate unique transaction ID
 */
transactionSchema.statics.generateId = function() {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create and save a transaction
 */
transactionSchema.statics.record = async function(data) {
    const transaction = new this({
        transactionId: this.generateId(),
        ...data
    });
    return transaction.save();
};

/**
 * Get transaction history for a wallet
 */
transactionSchema.statics.getHistoryForWallet = function(walletAddress, limit = 100) {
    return this.find({
        $or: [
            { fromWallet: walletAddress },
            { toWallet: walletAddress }
        ]
    })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get transactions for a specific match
 */
transactionSchema.statics.getForMatch = function(matchId) {
    return this.find({ 'relatedData.matchId': matchId })
        .sort({ createdAt: 1 });
};

const Transaction = mongoose.model('Transaction', transactionSchema);

export default Transaction;


