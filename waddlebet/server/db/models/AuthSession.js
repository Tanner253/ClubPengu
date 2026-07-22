/**
 * AuthSession Model - JWT authentication sessions
 * Tracks active sessions with automatic expiration
 */

import mongoose from 'mongoose';

const authSessionSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        index: true
    },
    chainId: {
        type: String,
        default: 'solana',
        required: true,
        index: true
    },
    
    sessionToken: {
        type: String,
        required: true,
        unique: true
        // unique already creates an index
    },
    
    // Timing
    expiresAt: {
        type: Date,
        required: true
        // TTL index defined below with schema.index()
    },
    lastUsed: {
        type: Date,
        default: Date.now
    },
    
    // Security metadata
    ipAddress: String,
    userAgent: String,
    
    // Activity tracking
    gamesPlayed: {
        type: Number,
        default: 0
    },
    actionsCount: {
        type: Number,
        default: 0
    },
    
    // Session state
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// TTL index - automatically delete expired sessions
authSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ==================== METHODS ====================

/**
 * Update last used timestamp
 */
authSessionSchema.methods.touch = function() {
    this.lastUsed = new Date();
    this.actionsCount++;
    return this.save();
};

/**
 * Invalidate session
 */
authSessionSchema.methods.invalidate = function() {
    this.isActive = false;
    this.expiresAt = new Date(); // Expire immediately
    return this.save();
};

// ==================== STATICS ====================

/**
 * Find valid session by token
 */
authSessionSchema.statics.findValidSession = function(token) {
    return this.findOne({
        sessionToken: token,
        isActive: true,
        expiresAt: { $gt: new Date() }
    });
};

/**
 * Invalidate all sessions for a wallet
 */
authSessionSchema.statics.invalidateAllForWallet = function(walletAddress, chainId = 'solana') {
    return this.updateMany(
        { walletAddress, chainId, isActive: true },
        { isActive: false, expiresAt: new Date() }
    );
};

const AuthSession = mongoose.model('AuthSession', authSessionSchema);

export default AuthSession;

