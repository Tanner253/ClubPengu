/**
 * IglooService - Business logic for igloo rental, ownership, and access control
 * Server-authoritative for all igloo operations
 * Uses Solana SPL token transfers for payments
 */

import Igloo from '../db/models/Igloo.js';
import User from '../db/models/User.js';
import solanaPaymentService from './SolanaPaymentService.js';

// ==================== CONFIGURATION ====================
const DAILY_RENT_CPW3 = parseInt(process.env.DAILY_RENT_CPW3 || '10000');
const MINIMUM_BALANCE_CPW3 = parseInt(process.env.MINIMUM_BALANCE_CPW3 || '70000'); // 7 days
const GRACE_PERIOD_HOURS = parseInt(process.env.GRACE_PERIOD_HOURS || '12');

// Permanent igloos - these are marked as reserved but owner wallet comes from DATABASE only
// Do NOT use env variables for owner wallets - they must be set in the database
// Reserved rental igloos - pre-set owners, not available for public rent
const RESERVED_IGLOO_IDS = ['igloo3', 'igloo8'];

// Igloo positions
const IGLOO_POSITIONS = {
    'igloo1': { x: -75, z: -70, row: 'north' },
    'igloo2': { x: -50, z: -73, row: 'north' },
    'igloo3': { x: -25, z: -70, row: 'north' },
    'igloo4': { x: 25, z: -70, row: 'north' },
    'igloo5': { x: 50, z: -73, row: 'north' },
    'igloo6': { x: 75, z: -70, row: 'north' },
    'igloo7': { x: -70, z: -20, row: 'south' },
    'igloo8': { x: -40, z: -23, row: 'south' },
    'igloo9': { x: 40, z: -23, row: 'south' },
    'igloo10': { x: 70, z: -20, row: 'south' }
};

class IglooService {
    constructor() {
        this.dailyRent = DAILY_RENT_CPW3;
        this.minimumBalance = MINIMUM_BALANCE_CPW3;
        this.gracePeriodHours = GRACE_PERIOD_HOURS;
    }
    
    /**
     * Initialize all igloos in database (run once on server startup)
     * NOTE: Permanent igloos (igloo3, igloo8) must have their ownerWallet set manually in the database
     * Do NOT rely on env variables for owner wallets - use database migration scripts instead
     */
    async initializeIgloos() {
        console.log('🏠 Initializing igloo database...');
        
        for (const [iglooId, position] of Object.entries(IGLOO_POSITIONS)) {
            const existing = await Igloo.findOne({ iglooId });
            
            if (!existing) {
                const isReserved = RESERVED_IGLOO_IDS.includes(iglooId);
                
                const newIgloo = new Igloo({
                    iglooId,
                    position,
                    isReserved,
                    // Owner wallet must be set via database migration, not from env
                    ownerWallet: null,
                    isRented: false,
                    accessType: 'private'
                });
                
                await newIgloo.save();
                console.log(`  Created ${iglooId} (${isReserved ? 'reserved - needs owner wallet in DB' : 'available for rent'})`);
            } else {
                // Auto-fix existing igloos with missing data
                let needsSave = false;
                const isReserved = RESERVED_IGLOO_IDS.includes(iglooId);
                
                // Migrate old isPermanent field to isReserved
                if (existing.isPermanent !== undefined && existing.isReserved === undefined) {
                    existing.isReserved = existing.isPermanent;
                    needsSave = true;
                    console.log(`  📋 Migrated ${iglooId}: isPermanent → isReserved`);
                }
                
                // Fix reserved igloos that are rented but missing rent data
                if (isReserved && existing.isRented && existing.ownerWallet) {
                    // Ensure reserved rental igloos have proper rent data
                    if (!existing.rentStartDate) {
                        existing.rentStartDate = new Date();
                        needsSave = true;
                        console.log(`  📋 Fixed ${iglooId}: Added rentStartDate`);
                    }
                    if (!existing.lastRentPaidDate) {
                        existing.lastRentPaidDate = new Date();
                        needsSave = true;
                        console.log(`  📋 Fixed ${iglooId}: Added lastRentPaidDate`);
                    }
                    if (!existing.rentDueDate) {
                        // Reserved igloos: set rent due far in future (100 years) since they're pre-paid
                        existing.rentDueDate = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000);
                        needsSave = true;
                        console.log(`  📋 Fixed ${iglooId}: Added rentDueDate (reserved rental)`);
                    }
                    if (!existing.rentStatus || existing.rentStatus === null) {
                        existing.rentStatus = 'current';
                        needsSave = true;
                        console.log(`  📋 Fixed ${iglooId}: Added rentStatus`);
                    }
                    if (existing.stats.timesRented === 0) {
                        existing.stats.timesRented = 1;
                        needsSave = true;
                        console.log(`  📋 Fixed ${iglooId}: Set timesRented to 1`);
                    }
                }
                
                if (needsSave) {
                    await existing.save();
                }
            }
        }
        
        console.log('🏠 Igloo initialization complete');
        console.log('⚠️  IMPORTANT: Set ownerWallet for permanent igloos in database!');
    }
    
    /**
     * Get all igloos (public info)
     */
    async getAllIgloos() {
        const igloos = await Igloo.find({});
        return igloos.map(igloo => igloo.getPublicInfo());
    }
    
    /**
     * Get single igloo info
     */
    async getIgloo(iglooId) {
        const igloo = await Igloo.findOne({ iglooId });
        if (!igloo) return null;
        return igloo.getPublicInfo();
    }
    
    /**
     * Get raw igloo document (for internal use)
     */
    async getIglooRaw(iglooId) {
        return await Igloo.findOne({ iglooId });
    }
    
    /**
     * Get igloo info for owner (includes settings)
     */
    async getIglooForOwner(iglooId, walletAddress) {
        const igloo = await Igloo.findOne({ iglooId });
        if (!igloo) return { error: 'IGLOO_NOT_FOUND' };
        
        if (igloo.ownerWallet !== walletAddress) {
            return { error: 'NOT_OWNER', message: 'You do not own this igloo' };
        }
        
        return igloo.getOwnerInfo();
    }
    
    /**
     * Check if user can rent an igloo
     * @param {string} walletAddress - User's wallet
     * @param {string} iglooId - Target igloo
     */
    async canRent(walletAddress, iglooId) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { canRent: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.isReserved) {
            return { canRent: false, error: 'RESERVED', message: `Reserved rental - owned by ${igloo.ownerUsername || 'reserved owner'}` };
        }
        
        if (igloo.isRented) {
            return { 
                canRent: false, 
                error: 'ALREADY_RENTED', 
                message: `Rented by ${igloo.ownerUsername}`,
                currentOwner: igloo.ownerUsername
            };
        }
        
        // Check if user already has maximum rentals (2 igloos max)
        const MAX_RENTALS_PER_USER = 2;
        const currentRentals = await Igloo.countDocuments({ 
            ownerWallet: walletAddress, 
            isRented: true,
            isReserved: false  // Don't count reserved igloos toward limit
        });
        
        if (currentRentals >= MAX_RENTALS_PER_USER) {
            return { 
                canRent: false, 
                error: 'MAX_RENTALS_REACHED',
                message: `You can only rent up to ${MAX_RENTALS_PER_USER} igloos at a time`,
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
     * Start rental process - verify payment and assign igloo
     * @param {string} walletAddress - Renter's wallet
     * @param {string} iglooId - Target igloo
     * @param {string} paymentPayload - x402 payment authorization
     */
    async startRental(walletAddress, iglooId, transactionSignature) {
        // Verify rental eligibility
        const eligibility = await this.canRent(walletAddress, iglooId);
        if (!eligibility.canRent) {
            return { success: false, ...eligibility };
        }
        
        // Verify rent payment on-chain
        const result = await solanaPaymentService.verifyRentPayment(
            transactionSignature,
            walletAddress,
            process.env.RENT_WALLET_ADDRESS,
            this.dailyRent,
            { iglooId, isRenewal: false }  // Audit trail options
        );
        
        if (!result.success) {
            return { success: false, error: result.error, message: result.message };
        }
        
        const settlement = result;
        
        // Get user info
        const user = await User.findOne({ walletAddress });
        const username = user?.username || `Penguin${walletAddress.slice(0, 6)}`;
        
        // Assign igloo to renter
        const igloo = await Igloo.findOne({ iglooId });
        igloo.startRental(walletAddress, username, this.dailyRent);
        await igloo.save();
        
        // Audit log
        console.log(`═══════════════════════════════════════════════════════════`);
        console.log(`🏠 [RENTAL STARTED] Igloo Rented`);
        console.log(`═══════════════════════════════════════════════════════════`);
        console.log(`   Timestamp:    ${new Date().toISOString()}`);
        console.log(`   Igloo:        ${iglooId}`);
        console.log(`   New Owner:    ${username} (${walletAddress.slice(0, 8)}...)`);
        console.log(`   Rent Paid:    ${this.dailyRent} $WADDLE`);
        console.log(`   TX Signature: ${settlement.transactionHash.slice(0, 16)}...`);
        console.log(`   Solscan:      https://solscan.io/tx/${settlement.transactionHash}`);
        console.log(`═══════════════════════════════════════════════════════════`);
        
        // Get owner info (full settings) for immediate UI display
        const ownerInfo = igloo.getOwnerInfo();
        
        return {
            success: true,
            iglooId,
            transactionHash: settlement.transactionHash,
            rentDueDate: igloo.rentDueDate,
            message: 'Welcome to your new igloo!',
            igloo: ownerInfo  // Include full igloo data for settings panel
        };
    }
    
    /**
     * Process rent payment (called daily by user)
     */
    async payRent(walletAddress, iglooId, transactionSignature) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER', message: 'You do not own this igloo' };
        }
        
        // Verify rent payment on-chain
        const result = await solanaPaymentService.verifyRentPayment(
            transactionSignature,
            walletAddress,
            process.env.RENT_WALLET_ADDRESS,
            this.dailyRent,
            { iglooId, isRenewal: true }  // Mark as renewal for audit trail
        );
        
        if (!result.success) {
            return { success: false, error: result.error, message: result.message };
        }
        
        const settlement = result;
        
        // Update igloo
        igloo.payRent(this.dailyRent);
        await igloo.save();
        
        console.log(`🏠 Rent paid for ${iglooId} by ${igloo.ownerUsername}`);
        
        return {
            success: true,
            transactionHash: settlement.transactionHash,
            newDueDate: igloo.rentDueDate
        };
    }
    
    /**
     * Check if user can enter an igloo
     */
    async canEnter(walletAddress, iglooId, tokenBalance = 0) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { canEnter: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        return igloo.canEnter(walletAddress, { tokenBalance });
    }
    
    /**
     * Process entry fee payment
     * Now accepts a real Solana transaction signature instead of a signed intent
     */
    async payEntryFee(walletAddress, iglooId, transactionSignature) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (!igloo.entryFee.enabled || igloo.entryFee.amount <= 0) {
            return { success: false, error: 'NO_ENTRY_FEE', message: 'This igloo has no entry fee' };
        }
        
        // Check if already paid
        const existingPayment = igloo.paidEntryFees?.find(p => p.walletAddress === walletAddress);
        if (existingPayment) {
            return { success: true, alreadyPaid: true, message: 'Entry fee already paid' };
        }
        
        // Require transaction signature (real on-chain payment)
        if (!transactionSignature) {
            return { 
                success: false, 
                error: 'PAYMENT_REQUIRED', 
                message: 'Transaction signature required for entry fee',
                amount: igloo.entryFee.amount,
                tokenAddress: igloo.entryFee.tokenAddress,
                tokenSymbol: igloo.entryFee.tokenSymbol,
                recipient: igloo.ownerWallet
            };
        }
        
        // Verify the transaction on-chain
        const verifyResult = await solanaPaymentService.verifyTransaction(
            transactionSignature,
            walletAddress,           // Expected sender
            igloo.ownerWallet,       // Expected recipient
            igloo.entryFee.tokenAddress,
            igloo.entryFee.amount,
            {
                transactionType: 'igloo_entry_fee',
                iglooId,
                tokenSymbol: igloo.entryFee.tokenSymbol || '$WADDLE'
            }
        );
        
        if (!verifyResult.success) {
            return { success: false, error: verifyResult.error, message: verifyResult.message };
        }
        
        // Record payment with real transaction signature
        igloo.recordEntryFeePayment(walletAddress, igloo.entryFee.amount, transactionSignature);
        await igloo.save();
        
        console.log(`💰 Entry fee paid for ${iglooId}: ${transactionSignature.slice(0, 16)}...`);
        
        return { success: true, transactionSignature };
    }
    
    /**
     * Update igloo settings (owner only)
     */
    async updateSettings(walletAddress, iglooId, settings) {
        console.log('🏠 [IglooService] Updating settings for:', iglooId);
        console.log('🏠 [IglooService] Received settings.banner:', JSON.stringify(settings.banner, null, 2));
        
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER', message: 'You do not own this igloo' };
        }
        
        console.log('🏠 [IglooService] Current banner in DB:', JSON.stringify(igloo.banner, null, 2));
        
        // Track if entry fee settings changed (requires reset)
        const entryFeeChanged = settings.entryFee && (
            settings.entryFee.enabled !== igloo.entryFee.enabled ||
            settings.entryFee.amount !== igloo.entryFee.amount
        );
        
        // Track if token gate settings changed (requires reset)
        const tokenGateChanged = settings.tokenGate && (
            settings.tokenGate.enabled !== igloo.tokenGate.enabled ||
            settings.tokenGate.tokenAddress !== igloo.tokenGate.tokenAddress ||
            settings.tokenGate.minimumBalance !== igloo.tokenGate.minimumBalance
        );
        
        // Update access type
        if (settings.accessType) {
            igloo.accessType = settings.accessType;
        }
        
        // Update token gate
        if (settings.tokenGate) {
            igloo.tokenGate = { ...igloo.tokenGate, ...settings.tokenGate };
        }
        
        // Update entry fee
        if (settings.entryFee) {
            igloo.entryFee = { ...igloo.entryFee, ...settings.entryFee };
        }
        
        // Update banner - explicitly set each field for Mongoose to detect changes
        if (settings.banner) {
            // Convert Mongoose document to plain object for existing values
            const existingBanner = igloo.banner?.toObject ? igloo.banner.toObject() : (igloo.banner || {});
            
            // Merge with new settings
            const newBanner = { ...existingBanner, ...settings.banner };
            
            // Explicitly set all banner fields
            igloo.banner = {
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
            igloo.markModified('banner');
            
            console.log('🏠 [IglooService] Banner after update:', JSON.stringify(igloo.banner, null, 2));
        }
        
        // Reset entry fees if requirements changed
        if (entryFeeChanged || tokenGateChanged) {
            igloo.resetEntryFees();
        }
        
        await igloo.save();
        
        // Re-fetch the igloo to ensure we have the latest data from MongoDB
        const updatedIgloo = await Igloo.findOne({ iglooId });
        const ownerInfo = updatedIgloo.getOwnerInfo();
        
        console.log('🏠 [IglooService] Banner saved and returned:', JSON.stringify(ownerInfo.banner, null, 2));
        
        return { 
            success: true, 
            igloo: ownerInfo,
            entryFeesReset: entryFeeChanged || tokenGateChanged
        };
    }
    
    /**
     * Record a visit to an igloo
     */
    async recordVisit(walletAddress, iglooId) {
        const igloo = await Igloo.findOne({ iglooId });
        if (!igloo) return;
        
        igloo.recordVisit(walletAddress);
        await igloo.save();
    }
    
    /**
     * Check and process overdue rentals (called by scheduler)
     */
    async processOverdueRentals() {
        const now = new Date();
        const gracePeriodEnd = new Date(now.getTime() - (this.gracePeriodHours * 60 * 60 * 1000));
        
        // Find rentals that are past grace period (exclude reserved igloos)
        const overdueIgloos = await Igloo.find({
            isRented: true,
            isReserved: { $ne: true },
            rentDueDate: { $lt: gracePeriodEnd }
        });
        
        const evictions = [];
        
        for (const igloo of overdueIgloos) {
            console.log(`🏠 Evicting ${igloo.ownerUsername} from ${igloo.iglooId} - rent overdue`);
            igloo.evict();
            await igloo.save();
            evictions.push({ iglooId: igloo.iglooId, previousOwner: igloo.ownerUsername });
        }
        
        // Mark igloos entering grace period (exclude reserved igloos)
        const newlyOverdue = await Igloo.find({
            isRented: true,
            isReserved: { $ne: true },
            rentDueDate: { $lt: now, $gte: gracePeriodEnd },
            rentStatus: 'current'
        });
        
        for (const igloo of newlyOverdue) {
            igloo.rentStatus = 'grace_period';
            await igloo.save();
            console.log(`🏠 ${igloo.iglooId} entered grace period - rent due`);
        }
        
        return { evictions, gracePeriodCount: newlyOverdue.length };
    }
    
    /**
     * Get rent status for a user's igloos
     */
    async getUserIgloos(walletAddress) {
        const igloos = await Igloo.find({ ownerWallet: walletAddress });
        return igloos.map(igloo => igloo.getOwnerInfo());
    }
    
    /**
     * Voluntarily leave an igloo
     */
    async leaveIgloo(walletAddress, iglooId) {
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER' };
        }
        
        if (igloo.isReserved) {
            return { success: false, error: 'RESERVED_OWNER', message: 'Cannot leave reserved rental igloo' };
        }
        
        igloo.evict();
        await igloo.save();
        
        return { success: true, message: 'You have left the igloo' };
    }
}

// Export singleton instance
const iglooService = new IglooService();
export default iglooService;


