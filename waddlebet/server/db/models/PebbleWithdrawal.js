/**
 * PebbleWithdrawal Model
 * Tracks pebble withdrawal requests with queue support for low-balance scenarios
 */

import mongoose from 'mongoose';

const pebbleWithdrawalSchema = new mongoose.Schema({
    // Request identification
    withdrawalId: { type: String, required: true, unique: true, index: true },
    
    // User info
    walletAddress: { type: String, required: true, index: true },
    chainId: { type: String, default: 'solana', index: true },
    asset: { type: String, enum: ['SOL', 'ETH'], default: 'SOL' },
    
    // Amount details
    pebbleAmount: { type: Number, required: true },        // Total pebbles requested
    rakeAmount: { type: Number, required: true },          // Pebbles taken as rake
    netPebbles: { type: Number, required: true },          // Pebbles after rake
    solAmount: { type: Number, required: true },           // SOL or ETH to be sent (net)
    lamports: { type: String, required: true },            // Lamports or wei as string (BigInt safe)
    
    // Status tracking
    status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
        default: 'pending',
        index: true
    },
    
    // Queue position (for pending withdrawals)
    queuePosition: { type: Number, default: null },
    
    // Processing info
    txSignature: { type: String, default: null },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
    
    // Timestamps
    requestedAt: { type: Date, default: Date.now, index: true },
    lastAttemptAt: { type: Date, default: null },
    
}, { timestamps: true });

// Compound indexes for efficient queries
pebbleWithdrawalSchema.index({ status: 1, requestedAt: 1 });
pebbleWithdrawalSchema.index({ walletAddress: 1, status: 1 });

// ========== STATIC METHODS ==========

/**
 * Generate unique withdrawal ID
 */
pebbleWithdrawalSchema.statics.generateWithdrawalId = function() {
    return `pw_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
};

/**
 * Create a new pending withdrawal request
 */
pebbleWithdrawalSchema.statics.createRequest = async function(data) {
    const {
        walletAddress,
        pebbleAmount,
        rakeAmount,
        netPebbles,
        solAmount,
        lamports,
        chainId = 'solana',
        asset = 'SOL',
    } = data;
    
    // Get next queue position
    const lastInQueue = await this.findOne({ status: 'pending' }).sort({ queuePosition: -1 });
    const queuePosition = (lastInQueue?.queuePosition || 0) + 1;
    
    return this.create({
        withdrawalId: this.generateWithdrawalId(),
        walletAddress,
        chainId,
        asset,
        pebbleAmount,
        rakeAmount,
        netPebbles,
        solAmount,
        lamports,
        status: 'pending',
        queuePosition
    });
};

/**
 * Get pending withdrawals in queue order
 */
pebbleWithdrawalSchema.statics.getPendingQueue = function(limit = 10, asset = 'SOL') {
    return this.find({ status: 'pending', asset: asset || 'SOL' })
        .sort({ queuePosition: 1 })
        .limit(limit);
};

/**
 * Get user's pending/recent withdrawals
 */
pebbleWithdrawalSchema.statics.getUserWithdrawals = function(walletAddress, limit = 10) {
    return this.find({ walletAddress })
        .sort({ requestedAt: -1 })
        .limit(limit);
};

/**
 * Mark withdrawal as processing
 */
pebbleWithdrawalSchema.statics.markProcessing = function(withdrawalId) {
    return this.findOneAndUpdate(
        { withdrawalId, status: 'pending' },
        { 
            $set: { status: 'processing', lastAttemptAt: new Date() },
            $inc: { retryCount: 1 }
        },
        { new: true }
    );
};

/**
 * Mark withdrawal as completed
 */
pebbleWithdrawalSchema.statics.markCompleted = function(withdrawalId, txSignature) {
    return this.findOneAndUpdate(
        { withdrawalId, status: 'processing' },
        { 
            $set: { 
                status: 'completed', 
                txSignature, 
                processedAt: new Date(),
                queuePosition: null
            }
        },
        { new: true }
    );
};

/**
 * Mark withdrawal as failed (will retry later)
 */
pebbleWithdrawalSchema.statics.markFailed = function(withdrawalId, reason) {
    return this.findOneAndUpdate(
        { withdrawalId },
        { 
            $set: { 
                status: 'pending', // Back to pending for retry
                failureReason: reason,
                lastAttemptAt: new Date()
            }
        },
        { new: true }
    );
};

/**
 * Cancel a pending withdrawal (refund pebbles handled separately)
 */
pebbleWithdrawalSchema.statics.cancelWithdrawal = function(withdrawalId, walletAddress) {
    return this.findOneAndUpdate(
        { withdrawalId, walletAddress, status: 'pending' },
        { $set: { status: 'cancelled', queuePosition: null } },
        { new: true }
    );
};

/**
 * Get queue stats
 */
pebbleWithdrawalSchema.statics.getQueueStats = async function() {
    const pending = await this.countDocuments({ status: 'pending' });
    const processing = await this.countDocuments({ status: 'processing' });
    const totalPendingSol = await this.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$solAmount' } } }
    ]);
    
    return {
        pendingCount: pending,
        processingCount: processing,
        totalPendingSol: totalPendingSol[0]?.total || 0
    };
};

const PebbleWithdrawal = mongoose.model('PebbleWithdrawal', pebbleWithdrawalSchema);
export default PebbleWithdrawal;

