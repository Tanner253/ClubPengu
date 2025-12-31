/**
 * SpaceService - Business logic for space rental, ownership, and access control
 * Server-authoritative for all space operations
 * Uses Solana SPL token transfers for payments
 */

import Space from '../db/models/Space.js';
import User from '../db/models/User.js';
import solanaPaymentService from './SolanaPaymentService.js';

// ==================== CONFIGURATION ====================
const DAILY_RENT_CPW3 = parseInt(process.env.DAILY_RENT_CPW3 || '10000');
const MINIMUM_BALANCE_CPW3 = parseInt(process.env.MINIMUM_BALANCE_CPW3 || '70000'); // 7 days
const GRACE_PERIOD_HOURS = parseInt(process.env.GRACE_PERIOD_HOURS || '12');

// Permanent spaces - these are marked as reserved but owner wallet comes from DATABASE only
// Do NOT use env variables for owner wallets - they must be set in the database
// Reserved rental spaces - pre-set owners, not available for public rent
const RESERVED_SPACE_IDS = ['space3', 'space8'];

// Space positions
const SPACE_POSITIONS = {
    'space1': { x: -75, z: -70, row: 'north' },
    'space2': { x: -50, z: -73, row: 'north' },
    'space3': { x: -25, z: -70, row: 'north' },
    'space4': { x: 25, z: -70, row: 'north' },
    'space5': { x: 50, z: -73, row: 'north' },
    'space6': { x: 75, z: -70, row: 'north' },
    'space7': { x: -70, z: -20, row: 'south' },
    'space8': { x: -40, z: -23, row: 'south' },
    'space9': { x: 40, z: -23, row: 'south' },
    'space10': { x: 70, z: -20, row: 'south' }
};

class SpaceService {
    constructor() {
        this.dailyRent = DAILY_RENT_CPW3;
        this.minimumBalance = MINIMUM_BALANCE_CPW3;
        this.gracePeriodHours = GRACE_PERIOD_HOURS;
    }
    
    /**
     * Initialize all spaces in database (run once on server startup)
     * NOTE: Permanent spaces (space3, space8) must have their ownerWallet set manually in the database
     * Do NOT rely on env variables for owner wallets - use database migration scripts instead
     */
    async initializeSpaces() {
        console.log('🏠 Initializing space database...');
        
        for (const [spaceId, position] of Object.entries(SPACE_POSITIONS)) {
            const existing = await Space.findOne({ spaceId });
            
            if (!existing) {
                const isReserved = RESERVED_SPACE_IDS.includes(spaceId);
                
                const newSpace = new Space({
                    spaceId,
                    position,
                    isReserved,
                    spaceType: 'igloo', // Default to igloo, will be set based on renter's character type
                    // Owner wallet must be set via database migration, not from env
                    ownerWallet: null,
                    isRented: false,
                    accessType: 'private'
                });
                
                await newSpace.save();
                console.log(`  Created ${spaceId} (${isReserved ? 'reserved - needs owner wallet in DB' : 'available for rent'})`);
            } else {
                // Auto-fix existing spaces with missing data
                let needsSave = false;
                const isReserved = RESERVED_SPACE_IDS.includes(spaceId);
                
                // Migrate old isPermanent field to isReserved
                if (existing.isPermanent !== undefined && existing.isReserved === undefined) {
                    existing.isReserved = existing.isPermanent;
                    needsSave = true;
                    console.log(`  📋 Migrated ${spaceId}: isPermanent → isReserved`);
                }
                
                // Fix reserved spaces that are rented but missing rent data
                if (isReserved && existing.isRented && existing.ownerWallet) {
                    // Ensure reserved rental spaces have proper rent data
                    if (!existing.rentStartDate) {
                        existing.rentStartDate = new Date();
                        needsSave = true;
                        console.log(`  📋 Fixed ${spaceId}: Added rentStartDate`);
                    }
                    if (!existing.lastRentPaidDate) {
                        existing.lastRentPaidDate = new Date();
                        needsSave = true;
                        console.log(`  📋 Fixed ${spaceId}: Added lastRentPaidDate`);
                    }
                    if (!existing.rentDueDate) {
                        // Reserved spaces: set rent due far in future (100 years) since they're pre-paid
                        existing.rentDueDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
                        needsSave = true;
                        console.log(`  📋 Fixed ${spaceId}: Added rentDueDate (reserved rental)`);
                    }
                    if (!existing.rentStatus || existing.rentStatus === null) {
                        existing.rentStatus = 'current';
                        needsSave = true;
                        console.log(`  📋 Fixed ${spaceId}: Added rentStatus`);
                    }
                    if (existing.stats.timesRented === 0) {
                        existing.stats.timesRented = 1;
                        needsSave = true;
                        console.log(`  📋 Fixed ${spaceId}: Set timesRented to 1`);
                    }
                }
                
                if (needsSave) {
                    await existing.save();
                }
            }
        }
        
        console.log('🏠 Space initialization complete');
        console.log('⚠️  IMPORTANT: Set ownerWallet for permanent spaces in database!');
    }
    
    /**
     * Get all spaces (public info)
     */
    async getAllSpaces() {
        // Check if database is connected
        const { isDBConnected } = await import('../db/connection.js');
        if (!isDBConnected()) {
            console.warn('🏠 Database not connected - returning empty space list');
            return [];
        }
        
        const spaces = await Space.find({});
        return spaces.map(space => space.getPublicInfo());
    }
    
    /**
     * Get single space info
     */
    async getSpace(spaceId) {
        const space = await Space.findOne({ spaceId });
        if (!space) return null;
        return space.getPublicInfo();
    }
    
    /**
     * Get raw space document (for internal use)
     */
    async getSpaceRaw(spaceId) {
        return await Space.findOne({ spaceId });
    }
    
    /**
     * Get space info for owner (includes settings)
     */
    async getSpaceForOwner(spaceId, walletAddress) {
        const space = await Space.findOne({ spaceId });
        if (!space) return { error: 'SPACE_NOT_FOUND' };
        
        if (space.ownerWallet !== walletAddress) {
            return { error: 'NOT_OWNER', message: 'You do not own this space' };
        }
        
        return space.getOwnerInfo();
    }
    
    /**
     * Check if user can rent an space
     * @param {string} walletAddress - User's wallet
     * @param {string} spaceId - Target space
     */
    async canRent(walletAddress, spaceId) {
        const space = await Space.findOne({ spaceId });
        
        if (!space) {
            return { canRent: false, error: 'SPACE_NOT_FOUND' };
        }
        
        if (space.isReserved) {
            return { canRent: false, error: 'RESERVED', message: `Reserved rental - owned by ${space.ownerUsername || 'reserved owner'}` };
        }
        
        if (space.isRented) {
            return { 
                canRent: false, 
                error: 'ALREADY_RENTED', 
                message: `Rented by ${space.ownerUsername}`,
                currentOwner: space.ownerUsername
            };
        }
        
        // Check if user already has maximum rentals (2 spaces max)
        const MAX_RENTALS_PER_USER = 2;
        const currentRentals = await Space.countDocuments({ 
            ownerWallet: walletAddress, 
            isRented: true,
            isReserved: false  // Don't count reserved spaces toward limit
        });
        
        if (currentRentals >= MAX_RENTALS_PER_USER) {
            return { 
                canRent: false, 
                error: 'MAX_RENTALS_REACHED',
                message: `You can only rent up to ${MAX_RENTALS_PER_USER} spaces at a time`,
                currentRentals,
                maxRentals: MAX_RENTALS_PER_USER
            };
        }
        
        // Check balance eligibility using $WADDLE token
        const cpw3TokenAddress = process.env.CPW3_TOKEN_ADDRESS || 'BDbMVbcc5hD5qiiGYwipeuUVMKDs16s9Nxk2hrhbpump';
        const balanceCheck = await solanaPaymentService.checkMinimumBalance(
            walletAddress, 
            cpw3TokenAddress, 
            this.minimumBalance
        );
        
        if (!balanceCheck.hasBalance) {
            return { 
                canRent: false, 
                error: 'INSUFFICIENT_BALANCE',
                message: `Minimum balance of ${this.minimumBalance} $WADDLE required (7 days rent)`,
                required: this.minimumBalance,
                current: balanceCheck.balance
            };
        }
        
        return { 
            canRent: true, 
            dailyRent: this.dailyRent,
            minimumBalance: this.minimumBalance
        };
    }
    
    /**
     * Start rental process - verify payment and assign space
     * @param {string} walletAddress - Renter's wallet
     * @param {string} spaceId - Target space
     * @param {string} paymentPayload - x402 payment authorization
     */
    async startRental(walletAddress, spaceId, transactionSignature) {
        // Verify rental eligibility
        const eligibility = await this.canRent(walletAddress, spaceId);
        if (!eligibility.canRent) {
            return { success: false, ...eligibility };
        }
        
        // Verify rent payment on-chain
        const result = await solanaPaymentService.verifyRentPayment(
            transactionSignature,
            walletAddress,
            process.env.RENT_WALLET_ADDRESS,
            this.dailyRent,
            { spaceId, isRenewal: false }  // Audit trail options
        );
        
        if (!result.success) {
            return { success: false, error: result.error, message: result.message };
        }
        
        const settlement = result;
        
        // Get user info
        const user = await User.findOne({ walletAddress });
        const username = user?.username || `Penguin${walletAddress.slice(0, 6)}`;
        
        // Determine space type based on user's character type
        // Map character types to space types
        const characterToSpaceType = {
            'penguin': 'igloo',
            'marcus': 'igloo',
            'whiteWhale': 'igloo',
            'blackWhale': 'igloo',
            'silverWhale': 'igloo',
            'goldWhale': 'igloo',
            'dog': 'doghouse',
            'frog': 'pond'
        };
        
        const characterType = user?.characterType || 'penguin';
        const spaceType = characterToSpaceType[characterType] || 'igloo'; // Default to igloo
        
        // Assign space to renter
        const space = await Space.findOne({ spaceId });
        space.spaceType = spaceType; // Set space type based on character
        space.startRental(walletAddress, username, this.dailyRent);
        await space.save();
        
        // Audit log
        console.log(`═══════════════════════════════════════════════════════════`);
        console.log(`🏠 [RENTAL STARTED] Space Rented`);
        console.log(`═══════════════════════════════════════════════════════════`);
        console.log(`   Timestamp:    ${new Date().toISOString()}`);
        console.log(`   Space:        ${spaceId}`);
        console.log(`   New Owner:    ${username} (${walletAddress.slice(0, 8)}...)`);
        console.log(`   Rent Paid:    ${this.dailyRent} $WADDLE`);
        console.log(`   TX Signature: ${settlement.transactionHash.slice(0, 16)}...`);
        console.log(`   Solscan:      https://solscan.io/tx/${settlement.transactionHash}`);
        console.log(`═══════════════════════════════════════════════════════════`);
        
        // Get owner info (full settings) for immediate UI display
        const ownerInfo = space.getOwnerInfo();
        
        return {
            success: true,
            spaceId,
            transactionHash: settlement.transactionHash,
            rentDueDate: space.rentDueDate,
            message: 'Welcome to your new space!',
            space: ownerInfo  // Include full space data for settings panel
        };
    }
    
    /**
     * Process rent payment (called daily by user)
     */
    async payRent(walletAddress, spaceId, transactionSignature) {
        const space = await Space.findOne({ spaceId });
        
        if (!space) {
            return { success: false, error: 'SPACE_NOT_FOUND' };
        }
        
        if (space.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER', message: 'You do not own this space' };
        }
        
        // Verify rent payment on-chain
        const result = await solanaPaymentService.verifyRentPayment(
            transactionSignature,
            walletAddress,
            process.env.RENT_WALLET_ADDRESS,
            this.dailyRent,
            { spaceId, isRenewal: true }  // Mark as renewal for audit trail
        );
        
        if (!result.success) {
            return { success: false, error: result.error, message: result.message };
        }
        
        const settlement = result;
        
        // Update space
        space.payRent(this.dailyRent);
        await space.save();
        
        console.log(`🏠 Rent paid for ${spaceId} by ${space.ownerUsername}`);
        
        return {
            success: true,
            transactionHash: settlement.transactionHash,
            newDueDate: space.rentDueDate
        };
    }
    
    /**
     * Check if user can enter an space
     */
    async canEnter(walletAddress, spaceId, tokenBalance = 0) {
        const space = await Space.findOne({ spaceId });
        
        if (!space) {
            return { canEnter: false, error: 'SPACE_NOT_FOUND' };
        }
        
        return space.canEnter(walletAddress, { tokenBalance });
    }
    
    /**
     * Process entry fee payment
     * Now accepts a real Solana transaction signature instead of a signed intent
     */
    async payEntryFee(walletAddress, spaceId, transactionSignature) {
        const space = await Space.findOne({ spaceId });
        
        if (!space) {
            return { success: false, error: 'SPACE_NOT_FOUND' };
        }
        
        if (!space.entryFee.enabled || space.entryFee.amount <= 0) {
            return { success: false, error: 'NO_ENTRY_FEE', message: 'This space has no entry fee' };
        }
        
        // Check if already paid
        const existingPayment = space.paidEntryFees?.find(p => p.walletAddress === walletAddress);
        if (existingPayment) {
            return { success: true, alreadyPaid: true, message: 'Entry fee already paid' };
        }
        
        // Require transaction signature (real on-chain payment)
        if (!transactionSignature) {
            return { 
                success: false, 
                error: 'PAYMENT_REQUIRED', 
                message: 'Transaction signature required for entry fee',
                amount: space.entryFee.amount,
                tokenAddress: space.entryFee.tokenAddress,
                tokenSymbol: space.entryFee.tokenSymbol,
                recipient: space.ownerWallet
            };
        }
        
        // Verify the transaction on-chain
        const verifyResult = await solanaPaymentService.verifyTransaction(
            transactionSignature,
            walletAddress,           // Expected sender
            space.ownerWallet,       // Expected recipient
            space.entryFee.tokenAddress,
            space.entryFee.amount,
            {
                transactionType: 'space_entry_fee',
                spaceId,
                tokenSymbol: space.entryFee.tokenSymbol || '$WADDLE'
            }
        );
        
        if (!verifyResult.success) {
            return { success: false, error: verifyResult.error, message: verifyResult.message };
        }
        
        // Record payment with real transaction signature
        space.recordEntryFeePayment(walletAddress, space.entryFee.amount, transactionSignature);
        await space.save();
        
        console.log(`💰 Entry fee paid for ${spaceId}: ${transactionSignature.slice(0, 16)}...`);
        
        return { success: true, transactionSignature };
    }
    
    /**
     * Update space settings (owner only)
     */
    async updateSettings(walletAddress, spaceId, settings) {
        console.log('🏠 [SpaceService] Updating settings for:', spaceId);
        console.log('🏠 [SpaceService] Received settings.banner:', JSON.stringify(settings.banner, null, 2));
        
        const space = await Space.findOne({ spaceId });
        
        if (!space) {
            return { success: false, error: 'SPACE_NOT_FOUND' };
        }
        
        if (space.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER', message: 'You do not own this space' };
        }
        
        console.log('🏠 [SpaceService] Current banner in DB:', JSON.stringify(space.banner, null, 2));
        
        // Track if entry fee settings changed (requires reset)
        const entryFeeChanged = settings.entryFee && (
            settings.entryFee.enabled !== space.entryFee.enabled ||
            settings.entryFee.amount !== space.entryFee.amount
        );
        
        // Track if token gate settings changed (requires reset)
        const tokenGateChanged = settings.tokenGate && (
            settings.tokenGate.enabled !== space.tokenGate.enabled ||
            settings.tokenGate.tokenAddress !== space.tokenGate.tokenAddress ||
            settings.tokenGate.minimumBalance !== space.tokenGate.minimumBalance
        );
        
        // Update access type
        if (settings.accessType) {
            space.accessType = settings.accessType;
        }
        
        // Update token gate
        if (settings.tokenGate) {
            space.tokenGate = { ...space.tokenGate, ...settings.tokenGate };
        }
        
        // Update entry fee
        if (settings.entryFee) {
            space.entryFee = { ...space.entryFee, ...settings.entryFee };
        }
        
        // Update banner - explicitly set each field for Mongoose to detect changes
        if (settings.banner) {
            // Convert Mongoose document to plain object for existing values
            const existingBanner = space.banner?.toObject ? space.banner.toObject() : (space.banner || {});
            
            // Merge with new settings
            const newBanner = { ...existingBanner, ...settings.banner };
            
            // Explicitly set all banner fields
            space.banner = {
                title: newBanner.title ?? null,
                ticker: newBanner.ticker ?? null,
                shill: newBanner.shill ?? null,
                styleIndex: newBanner.styleIndex ?? 0,
                useCustomColors: newBanner.useCustomColors ?? false,
                customGradient: newBanner.customGradient ?? ['#845EF7', '#BE4BDB', '#F06595'],
                textColor: newBanner.textColor ?? '#FFFFFF',
                accentColor: newBanner.accentColor ?? '#00FFFF',
                font: newBanner.font ?? 'Inter, system-ui, sans-serif',
                textAlign: newBanner.textAlign ?? 'center'
            };
            
            // Mark banner as modified to ensure Mongoose saves it
            space.markModified('banner');
            
            console.log('🏠 [SpaceService] Banner after update:', JSON.stringify(space.banner, null, 2));
        }
        
        // Reset entry fees if requirements changed
        if (entryFeeChanged || tokenGateChanged) {
            space.resetEntryFees();
        }
        
        await space.save();
        
        // Re-fetch the space to ensure we have the latest data from MongoDB
        const updatedSpace = await Space.findOne({ spaceId });
        const ownerInfo = updatedSpace.getOwnerInfo();
        
        console.log('🏠 [SpaceService] Banner saved and returned:', JSON.stringify(ownerInfo.banner, null, 2));
        
        return { 
            success: true, 
            space: ownerInfo,
            entryFeesReset: entryFeeChanged || tokenGateChanged
        };
    }
    
    /**
     * Record a visit to an space
     */
    async recordVisit(walletAddress, spaceId) {
        const space = await Space.findOne({ spaceId });
        if (!space) return;
        
        space.recordVisit(walletAddress);
        await space.save();
    }
    
    /**
     * Check and process overdue rentals (called by scheduler)
     */
    async processOverdueRentals() {
        const now = new Date();
        const gracePeriodEnd = new Date(now.getTime() - (this.gracePeriodHours * 60 * 60 * 1000));
        
        // Find rentals that are past grace period (exclude reserved spaces)
        const overdueSpaces = await Space.find({
            isRented: true,
            isReserved: { $ne: true },
            rentDueDate: { $lt: gracePeriodEnd }
        });
        
        const evictions = [];
        
        for (const space of overdueSpaces) {
            console.log(`🏠 Evicting ${space.ownerUsername} from ${space.spaceId} - rent overdue`);
            space.evict();
            await space.save();
            evictions.push({ spaceId: space.spaceId, previousOwner: space.ownerUsername });
        }
        
        // Mark spaces entering grace period (exclude reserved spaces)
        const newlyOverdue = await Space.find({
            isRented: true,
            isReserved: { $ne: true },
            rentDueDate: { $lt: now, $gte: gracePeriodEnd },
            rentStatus: 'current'
        });
        
        for (const space of newlyOverdue) {
            space.rentStatus = 'grace_period';
            await space.save();
            console.log(`🏠 ${space.spaceId} entered grace period - rent due`);
        }
        
        return { evictions, gracePeriodCount: newlyOverdue.length };
    }
    
    /**
     * Get rent status for a user's spaces
     */
    async getUserSpaces(walletAddress) {
        const spaces = await Space.find({ ownerWallet: walletAddress });
        return spaces.map(space => space.getOwnerInfo());
    }
    
    /**
     * Voluntarily leave an space
     */
    async leaveSpace(walletAddress, spaceId) {
        const space = await Space.findOne({ spaceId });
        
        if (!space) {
            return { success: false, error: 'SPACE_NOT_FOUND' };
        }
        
        if (space.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER' };
        }
        
        if (space.isReserved) {
            return { success: false, error: 'RESERVED_OWNER', message: 'Cannot leave reserved rental space' };
        }
        
        space.evict();
        await space.save();
        
        return { success: true, message: 'You have left the space' };
    }
}

// Export singleton instance
const spaceService = new SpaceService();
export default spaceService;


