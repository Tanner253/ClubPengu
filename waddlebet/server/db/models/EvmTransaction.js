/**
 * EvmTransaction Model - Audit trail for Robinhood Chain ERC-20 payments
 */

import mongoose from 'mongoose';

const evmTransactionSchema = new mongoose.Schema({
    txHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    chainId: {
        type: String,
        required: true,
        index: true,
    },
    type: {
        type: String,
        required: true,
        enum: [
            'igloo_rent',
            'igloo_rent_renewal',
            'igloo_entry_fee',
            'wager',
            'other',
        ],
        index: true,
    },
    senderWallet: {
        type: String,
        required: true,
        index: true,
    },
    recipientWallet: {
        type: String,
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    amountRaw: {
        type: String,
        required: true,
    },
    tokenAddress: {
        type: String,
        required: true,
        index: true,
    },
    tokenSymbol: {
        type: String,
        default: '$WADDLE',
    },
    iglooId: {
        type: String,
        index: true,
    },
    matchId: {
        type: String,
        index: true,
    },
    status: {
        type: String,
        enum: ['verified', 'failed', 'pending'],
        default: 'verified',
        index: true,
    },
    blockNumber: Number,
    processedAt: {
        type: Date,
        default: Date.now,
    },
    processingTimeMs: Number,
}, {
    timestamps: true,
});

evmTransactionSchema.index({ senderWallet: 1, createdAt: -1 });
evmTransactionSchema.index({ senderWallet: 1, processedAt: -1 });

evmTransactionSchema.statics.isTxHashUsed = async function(txHash) {
    const existing = await this.findOne({ txHash }).select('_id').lean();
    return !!existing;
};

evmTransactionSchema.statics.recordTransaction = async function(data) {
    const transaction = new this({
        ...data,
        processedAt: new Date(),
    });
    return transaction.save();
};

/**
 * Wallet history (sender or recipient) — mirrors SolanaTransaction.getWalletHistory
 */
evmTransactionSchema.statics.getWalletHistory = function(walletAddress, options = {}) {
    const limit = typeof options === 'number' ? options : (options.limit ?? 50);
    const type = typeof options === 'object' ? options.type : undefined;
    const iglooId = typeof options === 'object' ? options.iglooId : undefined;

    const query = {
        $or: [
            { senderWallet: new RegExp(`^${walletAddress}$`, 'i') },
            { recipientWallet: new RegExp(`^${walletAddress}$`, 'i') },
        ],
        status: 'verified',
    };
    if (type) query.type = type;
    if (iglooId) query.iglooId = iglooId;

    return this.find(query).sort({ createdAt: -1 }).limit(limit).lean();
};

/**
 * All verified igloo payments for a room (rent + entry fees)
 */
evmTransactionSchema.statics.getIglooHistory = function(iglooId, options = {}) {
    const { limit = 50 } = options;
    return this.find({ iglooId, status: 'verified' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

evmTransactionSchema.index({ iglooId: 1, createdAt: -1 });
evmTransactionSchema.index({ recipientWallet: 1, createdAt: -1 });

const EvmTransaction = mongoose.model('EvmTransaction', evmTransactionSchema);

export default EvmTransaction;
