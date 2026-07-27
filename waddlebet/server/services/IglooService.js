/**
 * IglooService - Business logic for igloo rental, ownership, and access control
 * Server-authoritative for all igloo operations
 * Uses chain-aware SPL / ERC-20 transfers for payments
 */

import Igloo from '../db/models/Igloo.js';
import User from '../db/models/User.js';
import SolanaTransaction from '../db/models/SolanaTransaction.js';
import EvmTransaction from '../db/models/EvmTransaction.js';
import chainPaymentService from './ChainPaymentService.js';
import { getIglooEconomy } from '../config/iglooEconomy.js';
import { getTxExplorerUrl, getExplorerLabel } from '../utils/txExplorer.js';

const GRACE_PERIOD_HOURS = parseInt(process.env.GRACE_PERIOD_HOURS || '12', 10);

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
        this.gracePeriodHours = GRACE_PERIOD_HOURS;
    }

    _economy(chainId) {
        return getIglooEconomy(chainId || 'solana');
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
    async canRent(walletAddress, iglooId, chainId = 'solana') {
        const economy = this._economy(chainId);
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
        
        const balanceCheck = await chainPaymentService.checkMinimumBalance(
            walletAddress,
            economy.platformTokenAddress,
            economy.minimumBalance,
            chainId
        );

        if (!balanceCheck.hasBalance) {
            return {
                canRent: false,
                error: 'INSUFFICIENT_BALANCE',
                message: `Minimum balance of ${economy.minimumBalance} ${economy.platformTokenSymbol} required (7 days rent)`,
                required: economy.minimumBalance,
                current: balanceCheck.balance,
            };
        }

        return {
            canRent: true,
            dailyRent: economy.dailyRent,
            minimumBalance: economy.minimumBalance,
            platformTokenSymbol: economy.platformTokenSymbol,
        };
    }
    
    /**
     * Start rental process - verify payment and assign igloo
     * @param {string} walletAddress - Renter's wallet
     * @param {string} iglooId - Target igloo
     * @param {string} paymentPayload - x402 payment authorization
     */
    async startRental(walletAddress, iglooId, transactionSignature, chainId = 'solana') {
        const economy = this._economy(chainId);

        const eligibility = await this.canRent(walletAddress, iglooId, chainId);
        if (!eligibility.canRent) {
            return { success: false, ...eligibility };
        }

        const result = await chainPaymentService.verifyRentPayment(
            transactionSignature,
            walletAddress,
            chainId,
            { iglooId, isRenewal: false }
        );
        
        if (!result.success) {
            return { success: false, error: result.error, message: result.message };
        }
        
        const settlement = result;
        
        // Get user info
        const user = await User.findOne({ walletAddress, chainId: chainId || 'solana' });
        const username = user?.username || `Penguin${walletAddress.slice(0, 6)}`;

        const igloo = await Igloo.findOne({ iglooId });
        igloo.startRental(walletAddress, username, economy.dailyRent);
        await igloo.save();
        
        // Audit log
        console.log(`═══════════════════════════════════════════════════════════`);
        console.log(`🏠 [RENTAL STARTED] Igloo Rented`);
        console.log(`═══════════════════════════════════════════════════════════`);
        console.log(`   Timestamp:    ${new Date().toISOString()}`);
        console.log(`   Igloo:        ${iglooId}`);
        console.log(`   New Owner:    ${username} (${walletAddress.slice(0, 8)}...)`);
        const explorerUrl = getTxExplorerUrl(settlement.transactionHash, chainId);
        console.log(`   Rent Paid:    ${economy.dailyRent} ${economy.platformTokenSymbol}`);
        console.log(`   TX Signature: ${settlement.transactionHash.slice(0, 16)}...`);
        console.log(`   ${getExplorerLabel(chainId)}:     ${explorerUrl}`);
        console.log(`═══════════════════════════════════════════════════════════`);
        
        // Get owner info (full settings) for immediate UI display
        const ownerInfo = igloo.getOwnerInfo();
        
        return {
            success: true,
            iglooId,
            transactionHash: settlement.transactionHash,
            explorerUrl,
            explorerLabel: getExplorerLabel(chainId),
            amount: economy.dailyRent,
            tokenSymbol: economy.platformTokenSymbol,
            rentDueDate: igloo.rentDueDate,
            message: 'Welcome to your new igloo!',
            igloo: ownerInfo  // Include full igloo data for settings panel
        };
    }
    
    /**
     * Process rent payment (called daily by user)
     */
    async payRent(walletAddress, iglooId, transactionSignature, chainId = 'solana') {
        const economy = this._economy(chainId);
        const igloo = await Igloo.findOne({ iglooId });
        
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        
        if (igloo.ownerWallet !== walletAddress) {
            return { success: false, error: 'NOT_OWNER', message: 'You do not own this igloo' };
        }
        
        // Verify rent payment on-chain
        const result = await chainPaymentService.verifyRentPayment(
            transactionSignature,
            walletAddress,
            chainId,
            { iglooId, isRenewal: true }
        );
        
        if (!result.success) {
            return { success: false, error: result.error, message: result.message };
        }
        
        const settlement = result;
        
        // Update igloo
        igloo.payRent(economy.dailyRent);
        await igloo.save();
        
        console.log(`🏠 Rent paid for ${iglooId} by ${igloo.ownerUsername}`);
        const explorerUrl = getTxExplorerUrl(settlement.transactionHash, chainId);
        
        return {
            success: true,
            transactionHash: settlement.transactionHash,
            explorerUrl,
            explorerLabel: getExplorerLabel(chainId),
            amount: economy.dailyRent,
            tokenSymbol: economy.platformTokenSymbol,
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
    async payEntryFee(walletAddress, iglooId, transactionSignature, chainId = 'solana') {
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
        const verifyResult = await chainPaymentService.verifyEntryFee(
            transactionSignature,
            walletAddress,
            igloo.ownerWallet,
            igloo.entryFee.tokenAddress,
            igloo.entryFee.amount,
            chainId,
            {
                iglooId,
                tokenSymbol: igloo.entryFee.tokenSymbol || getIglooEconomy(chainId).platformTokenSymbol,
            }
        );
        
        if (!verifyResult.success) {
            return { success: false, error: verifyResult.error, message: verifyResult.message };
        }
        
        // Record payment with real transaction signature
        igloo.recordEntryFeePayment(walletAddress, igloo.entryFee.amount, transactionSignature);
        await igloo.save();

        const explorerUrl = getTxExplorerUrl(transactionSignature, chainId);
        console.log(`💰 Entry fee paid for ${iglooId}: ${transactionSignature.slice(0, 16)}...`);
        console.log(`   ${getExplorerLabel(chainId)}: ${explorerUrl}`);
        
        return {
            success: true,
            transactionSignature,
            transactionHash: transactionSignature,
            explorerUrl,
            explorerLabel: getExplorerLabel(chainId),
            amount: igloo.entryFee.amount,
            tokenSymbol: igloo.entryFee.tokenSymbol,
            recipient: igloo.ownerWallet,
        };
    }

    /**
     * Owner-facing payment log (rent + entry fees) with explorer links.
     * Owner-only — verifies wallet owns the igloo.
     */
    async getPaymentHistory(walletAddress, iglooId, options = {}) {
        const { limit = 40 } = options;
        const igloo = await Igloo.findOne({ iglooId });
        if (!igloo) {
            return { success: false, error: 'IGLOO_NOT_FOUND' };
        }
        if (!walletAddress || igloo.ownerWallet?.toLowerCase() !== walletAddress.toLowerCase()) {
            return { success: false, error: 'NOT_OWNER', message: 'Only the igloo owner can view payment receipts' };
        }

        const [solanaRows, evmRows] = await Promise.all([
            SolanaTransaction.getIglooHistory(iglooId, { limit }),
            EvmTransaction.getIglooHistory(iglooId, { limit }),
        ]);

        const TYPE_LABELS = {
            igloo_rent: 'Igloo rented',
            igloo_rent_renewal: 'Daily rent paid',
            igloo_entry_fee: 'Entry fee received',
        };

        const mapRow = (row, chain) => {
            const txHash = chain === 'evm' ? row.txHash : row.signature;
            const chainId = chain === 'evm' ? (row.chainId || '4663') : 'solana';
            const isEntry = row.type === 'igloo_entry_fee';
            return {
                id: `${chain}:${txHash}`,
                type: row.type,
                label: TYPE_LABELS[row.type] || row.type,
                direction: isEntry ? 'in' : 'out',
                amount: row.amount,
                tokenSymbol: row.tokenSymbol || (chain === 'evm' ? '$WADDLE' : '$CP'),
                tokenAddress: chain === 'evm' ? row.tokenAddress : row.tokenMint,
                payerWallet: row.senderWallet,
                recipientWallet: row.recipientWallet,
                txHash,
                explorerUrl: getTxExplorerUrl(txHash, chainId),
                explorerLabel: getExplorerLabel(chainId),
                chainId,
                chain,
                iglooId: row.iglooId,
                timestamp: row.processedAt || row.createdAt,
            };
        };

        const payments = [
            ...solanaRows.map((r) => mapRow(r, 'solana')),
            ...evmRows.map((r) => mapRow(r, 'evm')),
        ]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);

        return {
            success: true,
            iglooId,
            payments,
            summary: {
                entryFeesCollected: igloo.stats?.totalEntryFeesCollected || 0,
                rentPaid: igloo.stats?.totalRentPaid || 0,
                uniqueVisitors: igloo.stats?.uniqueVisitors || 0,
            },
        };
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
            
            // IMPORTANT: When setting to PUBLIC or PRIVATE, reset ALL gate/fee requirements
            // This ensures owners can properly go back to public without old settings persisting
            if (settings.accessType === 'public' || settings.accessType === 'private') {
                console.log(`🏠 [IglooService] Access type changed to ${settings.accessType} - resetting all gates/fees`);
                
                // Reset token gate to defaults
                igloo.tokenGate = {
                    enabled: false,
                    tokenAddress: null,
                    tokenSymbol: null,
                    minimumBalance: 0
                };
                
                // Reset entry fee to defaults
                igloo.entryFee = {
                    enabled: false,
                    amount: 0,
                    tokenAddress: null,
                    tokenSymbol: null
                };
                
                // Clear all paid entry records since requirements are now reset
                igloo.resetEntryFees();
                
                // Mark as modified to ensure Mongoose saves these changes
                igloo.markModified('tokenGate');
                igloo.markModified('entryFee');
            }
        }
        
        // Update token gate (only if NOT public/private - those reset above)
        if (settings.tokenGate && settings.accessType !== 'public' && settings.accessType !== 'private') {
            igloo.tokenGate = { ...igloo.tokenGate, ...settings.tokenGate };
        }
        
        // Update entry fee (only if NOT public/private - those reset above)
        if (settings.entryFee && settings.accessType !== 'public' && settings.accessType !== 'private') {
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


