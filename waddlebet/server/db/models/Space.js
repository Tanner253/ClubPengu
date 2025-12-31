/**
 * Space Model - Space ownership, settings, and access control
 * Server-authoritative for all rental and access logic
 */

import mongoose from 'mongoose';

const spaceSchema = new mongoose.Schema({
    // ========== IDENTITY ==========
    spaceId: {
        type: String,
        required: true,
        unique: true,
        enum: ['space1', 'space2', 'space3', 'space4', 'space5', 'space6', 'space7', 'space8', 'space9', 'space10']
    },
    
    // Space type - determines visual appearance and interior
    spaceType: {
        type: String,
        enum: ['igloo', 'doghouse', 'pond', 'apartment', 'lounge'],
        default: 'igloo' // Default to igloo for backward compatibility
    },
    
    // ========== POSITION (from roomConfig) ==========
    position: {
        x: { type: Number, required: true },
        z: { type: Number, required: true },
        row: { type: String, enum: ['north', 'south'], required: true }
    },
    
    // ========== OWNERSHIP ==========
    // Rental status
    isRented: { type: Boolean, default: false },
    
    // Reserved rental space (pre-set owner, not available for public rent)
    // Note: These are still rental spaces, just pre-configured
    isReserved: { type: Boolean, default: false },
    reservedOwnerName: { type: String, default: null },
    
    // Current owner (wallet address)
    ownerWallet: { type: String, default: null },
    ownerUsername: { type: String, default: null },
    
    // Rental dates
    rentStartDate: { type: Date, default: null },
    lastRentPaidDate: { type: Date, default: null },
    rentDueDate: { type: Date, default: null },
    
    // Rent status
    rentStatus: {
        type: String,
        enum: ['current', 'overdue', 'grace_period', 'evicted', null],
        default: null
    },
    
    // ========== ACCESS CONTROL ==========
    accessType: {
        type: String,
        enum: ['private', 'public', 'token', 'fee', 'both'],
        default: 'private'
    },
    
    // Token gating settings
    tokenGate: {
        enabled: { type: Boolean, default: false },
        tokenAddress: { type: String, default: null },
        tokenSymbol: { type: String, default: null },
        minimumBalance: { type: Number, default: 1 }
    },
    
    // Entry fee settings
    entryFee: {
        enabled: { type: Boolean, default: false },
        amount: { type: Number, default: 0 },
        tokenAddress: { type: String, default: null },  // Token CA for fee payment
        tokenSymbol: { type: String, default: null },   // e.g., "$BONK", "$USDC"
        // One-time payment per user - tracked in paidEntryFees array
    },
    
    // Users who have paid entry fee (persists until settings change)
    paidEntryFees: [{
        walletAddress: { type: String, required: true },
        paidAt: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        transactionHash: { type: String, default: null }
    }],
    
    // Version tracker - when this increments, all paid entry fees are reset
    entryFeeVersion: { type: Number, default: 1 },
    
    // ========== CUSTOMIZATION ==========
    // Banner displayed above space in town
    // Max lengths are optimized to fit the banner bubble display nicely
    banner: {
        title: { type: String, default: null, maxlength: 20 },    // Fits at readable font size
        ticker: { type: String, default: null, maxlength: 10 },   // e.g., "$COIN"
        shill: { type: String, default: null, maxlength: 60 },    // Short tagline (2 lines max)
        styleIndex: { type: Number, default: 0 },  // Index into SPACE_BANNER_STYLES
        // Custom color options
        useCustomColors: { type: Boolean, default: false },
        customGradient: { type: [String], default: ['#845EF7', '#BE4BDB', '#F06595'] }, // Array of 3 gradient colors
        textColor: { type: String, default: '#FFFFFF' },
        accentColor: { type: String, default: '#00FFFF' },
        font: { type: String, default: 'Inter, system-ui, sans-serif' },
        textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'center' }
    },
    
    // Interior customization (furniture, etc.)
    interior: {
        theme: { type: String, default: 'default' },
        furniture: [{ type: mongoose.Schema.Types.Mixed }]
    },
    
    // ========== STATISTICS ==========
    stats: {
        totalVisits: { type: Number, default: 0 },
        uniqueVisitors: { type: Number, default: 0 },
        totalRentPaid: { type: Number, default: 0 },
        totalEntryFeesCollected: { type: Number, default: 0 },
        timesRented: { type: Number, default: 0 }
    },
    
    // Unique visitors tracking (wallet addresses)
    uniqueVisitorWallets: [{ type: String }]
    
}, {
    timestamps: true
});

// ==================== INDEXES ====================
// Note: spaceId already has unique:true in schema definition, no need to duplicate
spaceSchema.index({ ownerWallet: 1 });
spaceSchema.index({ isRented: 1 });
spaceSchema.index({ rentDueDate: 1 });
spaceSchema.index({ rentStatus: 1 });

// ==================== METHODS ====================

/**
 * Check if a wallet can enter this space
 * @param {string} walletAddress - Visitor's wallet
 * @param {Object} options - { tokenBalance: number } for token gate check
 * @returns {Object} { canEnter: boolean, reason?: string, requiresPayment?: boolean, paymentAmount?: number }
 */
spaceSchema.methods.canEnter = function(walletAddress, options = {}) {
    // Owner can always enter
    if (walletAddress === this.ownerWallet) {
        return { canEnter: true, isOwner: true };
    }
    
    // Reserved space owners can always enter (redundant with ownerWallet check above, but kept for clarity)
    if (this.isReserved && walletAddress === this.ownerWallet) {
        return { canEnter: true, isOwner: true };
    }
    
    // Private = only owner
    if (this.accessType === 'private') {
        return { canEnter: false, reason: 'SPACE_LOCKED', message: 'This space is private' };
    }
    
    // Public = anyone can enter
    if (this.accessType === 'public') {
        return { canEnter: true };
    }
    
    // Token gated
    if (this.accessType === 'token' || this.accessType === 'both') {
        if (this.tokenGate.enabled) {
            const balance = options.tokenBalance || 0;
            if (balance < this.tokenGate.minimumBalance) {
                return { 
                    canEnter: false, 
                    reason: 'TOKEN_REQUIRED',
                    message: `Hold ${this.tokenGate.minimumBalance} ${this.tokenGate.tokenSymbol || 'tokens'} to enter`,
                    tokenRequired: {
                        address: this.tokenGate.tokenAddress,
                        symbol: this.tokenGate.tokenSymbol,
                        minimum: this.tokenGate.minimumBalance
                    }
                };
            }
        }
    }
    
    // Entry fee
    if (this.accessType === 'fee' || this.accessType === 'both') {
        if (this.entryFee.enabled && this.entryFee.amount > 0) {
            // Check if user has already paid (for current version)
            const hasPaid = this.paidEntryFees.some(
                fee => fee.walletAddress === walletAddress
            );
            
            if (!hasPaid) {
                const tokenSymbol = this.entryFee.tokenSymbol || 'TOKEN';
                return {
                    canEnter: false,
                    reason: 'ENTRY_FEE_REQUIRED',
                    requiresPayment: true,
                    paymentAmount: this.entryFee.amount,
                    paymentToken: {
                        tokenAddress: this.entryFee.tokenAddress,
                        tokenSymbol: tokenSymbol
                    },
                    message: `Entry fee: ${this.entryFee.amount} ${tokenSymbol}`
                };
            }
        }
    }
    
    // All checks passed
    return { canEnter: true };
};

/**
 * Record entry fee payment
 */
spaceSchema.methods.recordEntryFeePayment = function(walletAddress, amount, transactionHash = null) {
    // Remove any existing payment from this wallet (shouldn't happen, but safety)
    this.paidEntryFees = this.paidEntryFees.filter(f => f.walletAddress !== walletAddress);
    
    this.paidEntryFees.push({
        walletAddress,
        amount,
        paidAt: new Date(),
        transactionHash
    });
    
    this.stats.totalEntryFeesCollected += amount;
};

/**
 * Reset all entry fees (when owner changes settings)
 */
spaceSchema.methods.resetEntryFees = function() {
    this.paidEntryFees = [];
    this.entryFeeVersion += 1;
};

/**
 * Record a visit
 */
spaceSchema.methods.recordVisit = function(walletAddress) {
    this.stats.totalVisits += 1;
    
    if (!this.uniqueVisitorWallets.includes(walletAddress)) {
        this.uniqueVisitorWallets.push(walletAddress);
        this.stats.uniqueVisitors += 1;
    }
};

/**
 * Start rental period
 * @param {string} walletAddress - New owner's wallet
 * @param {string} username - New owner's username
 * @param {number} rentAmount - Amount of rent paid (optional, for stats tracking)
 */
spaceSchema.methods.startRental = function(walletAddress, username, rentAmount = 0) {
    const now = new Date();
    
    this.isRented = true;
    this.ownerWallet = walletAddress;
    this.ownerUsername = username;
    this.rentStartDate = now;
    this.lastRentPaidDate = now;
    this.rentDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    this.rentStatus = 'current';
    this.accessType = 'private'; // Default to private on new rental
    this.stats.timesRented += 1;
    
    // Record the initial rent payment in stats
    if (rentAmount > 0) {
        this.stats.totalRentPaid += rentAmount;
    }
    
    // Clear previous entry fees
    this.resetEntryFees();
};

/**
 * Process rent payment
 */
spaceSchema.methods.payRent = function(amount) {
    const now = new Date();
    
    this.lastRentPaidDate = now;
    this.rentDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    this.rentStatus = 'current';
    this.stats.totalRentPaid += amount;
};

/**
 * Evict current tenant
 */
spaceSchema.methods.evict = function() {
    this.isRented = false;
    this.ownerWallet = null;
    this.ownerUsername = null;
    this.rentStartDate = null;
    this.lastRentPaidDate = null;
    this.rentDueDate = null;
    this.rentStatus = 'evicted';
    this.accessType = 'private';
    this.spaceType = 'igloo'; // Reset to default igloo for next renter
    
    // Reset customization
    this.banner = { 
        title: null, 
        ticker: null, 
        shill: null, 
        styleIndex: 0,
        useCustomColors: false,
        customGradient: ['#845EF7', '#BE4BDB', '#F06595'],
        textColor: '#FFFFFF',
        accentColor: '#00FFFF',
        font: 'Inter, system-ui, sans-serif',
        textAlign: 'center'
    };
    this.paidEntryFees = [];
    this.entryFeeVersion += 1;
    this.tokenGate = { enabled: false, tokenAddress: null, tokenSymbol: null, minimumBalance: 1 };
    this.entryFee = { enabled: false, amount: 0 };
};

/**
 * Get public space info (safe to send to any client)
 */
spaceSchema.methods.getPublicInfo = function() {
    return {
        spaceId: this.spaceId,
        spaceType: this.spaceType || 'igloo', // Include space type for rendering
        position: this.position,
        isRented: this.isRented,
        isReserved: this.isReserved, // Pre-set rental space (not available for public rent)
        ownerWallet: this.ownerWallet, // Include for ownership verification
        ownerUsername: this.ownerUsername || this.reservedOwnerName,
        accessType: this.accessType,
        banner: this.banner,
        hasTokenGate: this.tokenGate?.enabled || false,
        hasEntryFee: this.entryFee?.enabled || false,
        entryFeeAmount: this.entryFee?.amount || 0,
        entryFeeToken: this.entryFee?.enabled ? {
            tokenAddress: this.entryFee.tokenAddress,
            tokenSymbol: this.entryFee.tokenSymbol || 'TOKEN'
        } : null,
        tokenGateInfo: this.tokenGate?.enabled ? {
            symbol: this.tokenGate.tokenSymbol,
            minimum: this.tokenGate.minimumBalance,
            tokenAddress: this.tokenGate.tokenAddress,
            minimumBalance: this.tokenGate.minimumBalance
        } : null,
        tokenGate: this.tokenGate, // Include full token gate for settings
        entryFee: this.entryFee, // Include full entry fee for settings
        stats: {
            totalVisits: this.stats.totalVisits,
            uniqueVisitors: this.stats.uniqueVisitors
        }
    };
};

/**
 * Get owner-only info
 */
spaceSchema.methods.getOwnerInfo = function() {
    return {
        ...this.getPublicInfo(),
        rentStartDate: this.rentStartDate,
        lastRentPaidDate: this.lastRentPaidDate,
        rentDueDate: this.rentDueDate,
        rentStatus: this.rentStatus,
        tokenGate: this.tokenGate,
        entryFee: this.entryFee,
        paidEntryFeesCount: this.paidEntryFees.length,
        stats: this.stats
    };
};

const Space = mongoose.model('Space', spaceSchema);

export default Space;


