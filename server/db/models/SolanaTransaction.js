/**
 * SolanaTransaction Model - Audit trail for all Solana SPL token transactions
 * 
 * Purposes:
 * 1. REPLAY ATTACK PREVENTION - Track used signatures to prevent reuse
 * 2. AUDIT LOGGING - Full record of all payments for accounting/debugging
 * 3. RATE LIMITING DATA - Track request patterns per wallet
 */

import mongoose from 'mongoose';

const solanaTransactionSchema = new mongoose.Schema({
    // ========== SIGNATURE (PRIMARY KEY FOR REPLAY PREVENTION) ==========
    signature: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    
    // ========== TRANSACTION TYPE ==========
    type: {
        type: String,
        required: true,
        enum: [
            'igloo_rent',           // Initial igloo rental payment
            'igloo_rent_renewal',   // Daily rent payment
            'igloo_entry_fee',      // Entry fee to someone's igloo
            'wager',                // PvP wager payment
            'other'                 // Future use
        ],
        index: true
    },
    
    // ========== PARTICIPANTS ==========
    senderWallet: {
        type: String,
        required: true,
        index: true
    },
    recipientWallet: {
        type: String,
        required: true,
        index: true
    },
    
    // ========== PAYMENT DETAILS ==========
    amount: {
        type: Number,
        required: true
    },
    // Amount in smallest units (e.g., for 6 decimals: 10000 = 0.01 tokens)
    amountRaw: {
        type: String,  // String to handle BigInt precision
        required: true
    },
    tokenMint: {
        type: String,
        required: true,
        index: true
    },
    tokenSymbol: {
        type: String,
        default: '$WADDLE'
    },
    
    // ========== RELATED ENTITIES ==========
    iglooId: {
        type: String,
        index: true
    },
    matchId: {
        type: String,
        index: true
    },
    
    // ========== VERIFICATION STATUS ==========
    status: {
        type: String,
        enum: ['verified', 'failed', 'pending'],
        default: 'verified',
        index: true
    },
    verificationDetails: {
        blockTime: Number,
        slot: Number,
        verifiedAt: Date,
        error: String
    },
    
    // ========== SOLANA DETAILS ==========
    blockTime: Number,
    slot: Number,
    
    // ========== AUDIT METADATA ==========
    ipAddress: String,
    userAgent: String,
    sessionId: String,
    
    // ========== SERVER PROCESSING ==========
    processedAt: {
        type: Date,
        default: Date.now
    },
    processingTimeMs: Number  // How long verification took

}, {
    timestamps: true
});

// ==================== INDEXES ====================
// Note: signature index is already defined in schema with unique: true

// For audit queries
solanaTransactionSchema.index({ senderWallet: 1, createdAt: -1 });
solanaTransactionSchema.index({ recipientWallet: 1, createdAt: -1 });
solanaTransactionSchema.index({ type: 1, createdAt: -1 });
solanaTransactionSchema.index({ iglooId: 1, type: 1 });

// For rate limiting queries - count recent transactions per wallet
solanaTransactionSchema.index({ senderWallet: 1, processedAt: -1 });

// TTL index to auto-delete very old records (optional - keep 1 year)
// solanaTransactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// ==================== STATICS ====================

/**
 * Check if a signature has already been used (replay attack prevention)
 * @param {string} signature - Transaction signature to check
 * @returns {boolean} - True if signature exists (potential replay attack)
 */
solanaTransactionSchema.statics.isSignatureUsed = async function(signature) {
    const existing = await this.findOne({ signature }).select('_id').lean();
    return !!existing;
};

/**
 * Record a verified transaction
 * @param {Object} data - Transaction data
 * @returns {Document} - Saved transaction document
 */
solanaTransactionSchema.statics.recordTransaction = async function(data) {
    const transaction = new this({
        ...data,
        processedAt: new Date()
    });
    return transaction.save();
};

/**
 * Count recent transactions for rate limiting
 * @param {string} walletAddress - Wallet to check
 * @param {number} windowMs - Time window in milliseconds (default 1 minute)
 * @returns {number} - Count of transactions in window
 */
solanaTransactionSchema.statics.countRecentTransactions = async function(walletAddress, windowMs = 60000) {
    const windowStart = new Date(Date.now() - windowMs);
    return this.countDocuments({
        senderWallet: walletAddress,
        processedAt: { $gte: windowStart }
    });
};

/**
 * Get transaction history for a wallet
 * @param {string} walletAddress - Wallet address
 * @param {Object} options - Query options
 * @returns {Array} - Transaction history
 */
solanaTransactionSchema.statics.getWalletHistory = function(walletAddress, options = {}) {
    const { limit = 50, type, iglooId } = options;
    
    const query = {
        $or: [
            { senderWallet: walletAddress },
            { recipientWallet: walletAddress }
        ]
    };
    
    if (type) query.type = type;
    if (iglooId) query.iglooId = iglooId;
    
    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

/**
 * Get igloo revenue stats
 * @param {string} iglooId - Igloo ID
 * @returns {Object} - Revenue stats
 */
solanaTransactionSchema.statics.getIglooStats = async function(iglooId) {
    const result = await this.aggregate([
        { $match: { iglooId, status: 'verified' } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' }
            }
        }
    ]);
    
    return result.reduce((acc, item) => {
        acc[item._id] = { count: item.count, totalAmount: item.totalAmount };
        return acc;
    }, {});
};

/**
 * Get daily transaction summary (for monitoring)
 * @param {number} days - Number of days to look back
 * @returns {Array} - Daily summaries
 */
solanaTransactionSchema.statics.getDailySummary = async function(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
            $group: {
                _id: {
                    date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    type: '$type'
                },
                count: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                uniqueWallets: { $addToSet: '$senderWallet' }
            }
        },
        {
            $project: {
                date: '$_id.date',
                type: '$_id.type',
                count: 1,
                totalAmount: 1,
                uniqueWalletsCount: { $size: '$uniqueWallets' }
            }
        },
        { $sort: { date: -1, type: 1 } }
    ]);
};

const SolanaTransaction = mongoose.model('SolanaTransaction', solanaTransactionSchema);

export default SolanaTransaction;

