/**
 * WagerSettlementService - Handles SPL token wager settlements (x402 protocol)
 * 
 * Settlement Flow (Custodial Wallet Approach):
 * 1. Both players deposit wager to custodial wallet before game starts
 * 2. Match plays out
 * 3. Match ends with winner determined
 * 4. Calculate 5% rake (sent to RAKE_WALLET)
 * 5. Send remaining 95% to winner
 * 
 * Security: Uses CustodialWalletService which has rate limits, amount caps,
 * match verification, and lockdown capabilities.
 */

import { Match } from '../db/models/index.js';
import { isDBConnected } from '../db/connection.js';
import custodialWalletService from './CustodialWalletService.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RAKE CONFIGURATION (loaded lazily after dotenv)
// ═══════════════════════════════════════════════════════════════════════════════
const RAKE_CONFIG = {
    // These are set in initialize() after dotenv loads
    RAKE_WALLET: null,
    RAKE_PERCENT: 5,
    MIN_POT_FOR_RAKE: BigInt(1000),
    _initialized: false
};

function initRakeConfig() {
    if (RAKE_CONFIG._initialized) return;
    RAKE_CONFIG.RAKE_WALLET = process.env.RAKE_WALLET || null;
    RAKE_CONFIG.RAKE_PERCENT = parseFloat(process.env.RAKE_PERCENT || '5');
    RAKE_CONFIG._initialized = true;
}

class WagerSettlementService {
    constructor() {
        // Track pending settlements (matchId -> settlement info)
        this.pendingSettlements = new Map();
        
        // Settlement status tracking
        this.settlementHistory = new Map();
    }
    
    /**
     * Initialize the settlement service (and custodial wallet)
     * Call this at server startup
     */
    async initialize() {
        // Load rake config NOW (after dotenv has loaded)
        initRakeConfig();
        
        const result = await custodialWalletService.initialize();
        if (result.success) {
            console.log('💰 WagerSettlementService ready - custodial wallet initialized');
            
            // Log rake configuration
            if (RAKE_CONFIG.RAKE_WALLET) {
                console.log(`   🏦 Rake enabled: ${RAKE_CONFIG.RAKE_PERCENT}% to ${RAKE_CONFIG.RAKE_WALLET.slice(0, 8)}...`);
            } else {
                console.log('   ℹ️ Rake disabled: No RAKE_WALLET configured');
            }
        } else {
            console.warn('⚠️ WagerSettlementService: Custodial wallet not available -', result.error);
        }
        return result;
    }
    
    /**
     * Recover orphaned matches from server crash/restart
     * Finds all 'active' matches in DB that have token wagers and refunds them
     * Called at server startup after DB and custodial wallet are ready
     * 
     * @returns {Promise<{recovered: number, failed: number, total: number}>}
     */
    async recoverOrphanedMatches() {
        if (!isDBConnected()) {
            console.log('🔄 [Orphan Recovery] Skipping - database not connected');
            return { recovered: 0, failed: 0, total: 0 };
        }
        
        console.log('🔄 [Orphan Recovery] Checking for orphaned matches...');
        
        try {
            // Find all active matches that were started before current server boot
            // These are orphans from a previous server instance
            const serverStartTime = Date.now();
            
            const orphanedMatches = await Match.find({
                status: 'active',
                // Match started more than 5 minutes ago (grace period for in-flight starts)
                startedAt: { $lt: new Date(serverStartTime - 5 * 60 * 1000) }
            });
            
            if (orphanedMatches.length === 0) {
                console.log('🔄 [Orphan Recovery] No orphaned matches found');
                return { recovered: 0, failed: 0, total: 0 };
            }
            
            console.log(`🔄 [Orphan Recovery] Found ${orphanedMatches.length} orphaned match(es)`);
            
            let recovered = 0;
            let failed = 0;
            
            for (const dbMatch of orphanedMatches) {
                const matchId = dbMatch.matchId;
                const hasTokenWager = dbMatch.wagerToken?.tokenAddress && dbMatch.wagerToken?.tokenAmount > 0;
                const hasCoinWager = dbMatch.wagerAmount > 0;
                
                console.log(`   📋 Processing orphan: ${matchId}`);
                console.log(`      Game: ${dbMatch.gameType}, Players: ${dbMatch.player1.name} vs ${dbMatch.player2.name}`);
                console.log(`      Wagers: ${dbMatch.wagerAmount} coins${hasTokenWager ? ` + ${dbMatch.wagerToken.tokenAmount} ${dbMatch.wagerToken.tokenSymbol}` : ''}`);
                
                try {
                    // Handle token wager refund
                    if (hasTokenWager) {
                        // Build match object for handleVoid
                        const matchForRefund = {
                            id: matchId,
                            matchId,
                            wagerToken: dbMatch.wagerToken,
                            player1: { wallet: dbMatch.player1.wallet },
                            player2: { wallet: dbMatch.player2.wallet },
                            player1Wallet: dbMatch.player1.wallet,
                            player2Wallet: dbMatch.player2.wallet
                        };
                        
                        const refundResult = await this.handleVoid(matchForRefund, 'server_restart');
                        
                        if (refundResult.success) {
                            console.log(`      ✅ Token wager refunded`);
                        } else {
                            console.error(`      ⚠️ Token refund failed: ${refundResult.error}`);
                        }
                    }
                    
                    // Note: Coin wager refunds are handled separately through UserService escrow
                    // If coins were escrowed, they should be returned when match is voided
                    // (For now we'll mark them for manual review if there are coin wagers)
                    if (hasCoinWager && !hasTokenWager) {
                        console.log(`      ℹ️ Coin-only wager - marking for review`);
                    }
                    
                    // Update match status to void/abandoned
                    await Match.updateOne(
                        { matchId },
                        {
                            status: 'abandoned',
                            endedAt: new Date(),
                            settlementStatus: hasTokenWager ? 'refunded' : 'none',
                            settlementError: 'Server restart - match abandoned',
                            gameState: null
                        }
                    );
                    
                    console.log(`      ✅ Match marked as abandoned`);
                    recovered++;
                    
                } catch (err) {
                    console.error(`      ❌ Error processing orphan ${matchId}:`, err.message);
                    
                    // Mark as needing manual review
                    await Match.updateOne(
                        { matchId },
                        {
                            status: 'abandoned',
                            endedAt: new Date(),
                            settlementStatus: 'manual_review',
                            settlementError: `Recovery failed: ${err.message}`
                        }
                    );
                    
                    failed++;
                }
            }
            
            console.log(`🔄 [Orphan Recovery] Complete: ${recovered} recovered, ${failed} failed, ${orphanedMatches.length} total`);
            
            return {
                recovered,
                failed,
                total: orphanedMatches.length
            };
            
        } catch (error) {
            console.error('🔄 [Orphan Recovery] Error:', error.message);
            return { recovered: 0, failed: 0, total: 0, error: error.message };
        }
    }
    
    /**
     * Get custodial wallet public key for deposits
     */
    getCustodialWalletAddress() {
        return custodialWalletService.getPublicKey();
    }
    
    /**
     * Check if custodial wallet is ready for settlements
     */
    isReady() {
        return custodialWalletService.isReady();
    }
    
    /**
     * Get the custodial wallet service instance (for challenge refunds)
     */
    getCustodialWalletService() {
        return custodialWalletService;
    }
    
    /**
     * Check if a match has a token wager that needs settlement
     * @param {object} match - Match object
     * @returns {boolean}
     */
    hasTokenWager(match) {
        return match?.wagerToken?.tokenAddress && match?.wagerToken?.tokenAmount > 0;
    }
    
    /**
     * Settle a token wager after match completion
     * Takes 5% rake to RAKE_WALLET, sends 95% to winner
     * 
     * @param {object} match - Completed match object
     * @param {string} winnerId - Player ID of the winner
     * @param {string} winnerWallet - Wallet address of the winner
     * @param {string} loserId - Player ID of the loser
     * @param {string} loserWallet - Wallet address of the loser
     * @returns {Promise<{success: boolean, txSignature?: string, error?: string}>}
     */
    async settleTokenWager(match, winnerId, winnerWallet, loserId, loserWallet) {
        if (!this.hasTokenWager(match)) {
            return { success: true, message: 'No token wager to settle' };
        }
        
        const matchId = match.id || match.matchId;
        const { wagerToken } = match;
        
        console.log(`💰 [Settlement] Starting token wager settlement for match ${matchId}`);
        console.log(`   Winner: ${winnerWallet?.slice(0, 8)}...`);
        console.log(`   Loser: ${loserWallet?.slice(0, 8)}...`);
        
        // Update match settlement status to processing
        await this._updateSettlementStatus(matchId, 'processing');
        
        try {
            if (!custodialWalletService.isReady()) {
                console.log(`   ⚠️ Custodial wallet not ready - CANNOT process payout!`);
                await this._updateSettlementStatus(matchId, 'manual_review', null, 
                    'Custodial wallet not initialized - requires manual review'
                );
                return {
                    success: false,
                    error: 'CUSTODIAL_NOT_READY',
                    message: 'Custodial wallet service not available - manual payout required'
                };
            }
            
            // Calculate total pot (2x wager = both players' deposits)
            const totalPotRaw = BigInt(wagerToken.amountRaw) * 2n;
            
            // ═══════════════════════════════════════════════════════════════════
            // RAKE CALCULATION
            // ═══════════════════════════════════════════════════════════════════
            const rakeEnabled = RAKE_CONFIG.RAKE_WALLET && totalPotRaw >= RAKE_CONFIG.MIN_POT_FOR_RAKE;
            let rakeAmountRaw = 0n;
            let winnerPayoutRaw = totalPotRaw;
            let rakeTxId = null;
            
            if (rakeEnabled) {
                // Calculate rake: (totalPot * rakePercent) / 100
                rakeAmountRaw = (totalPotRaw * BigInt(Math.floor(RAKE_CONFIG.RAKE_PERCENT * 100))) / 10000n;
                winnerPayoutRaw = totalPotRaw - rakeAmountRaw;
                
                const rakeAmount = Number(rakeAmountRaw) / Math.pow(10, wagerToken.decimals || 6);
                const winnerAmount = Number(winnerPayoutRaw) / Math.pow(10, wagerToken.decimals || 6);
                
                console.log(`   📊 Rake Breakdown:`);
                console.log(`      Total Pot: ${wagerToken.tokenAmount * 2} ${wagerToken.tokenSymbol}`);
                console.log(`      Rake (${RAKE_CONFIG.RAKE_PERCENT}%): ${rakeAmount.toFixed(4)} ${wagerToken.tokenSymbol}`);
                console.log(`      Winner Gets: ${winnerAmount.toFixed(4)} ${wagerToken.tokenSymbol}`);
                console.log(`      Rake Wallet: ${RAKE_CONFIG.RAKE_WALLET.slice(0, 8)}...`);
                
                // ═══════════════════════════════════════════════════════════════
                // STEP 1: Send rake to RAKE_WALLET
                // ═══════════════════════════════════════════════════════════════
                console.log(`   💸 [1/2] Sending rake to platform wallet...`);
                
                const rakeResult = await custodialWalletService.processRakePayout({
                    matchId,
                    rakeWallet: RAKE_CONFIG.RAKE_WALLET,
                    tokenAddress: wagerToken.tokenAddress,
                    amountRaw: rakeAmountRaw.toString(),
                    decimals: wagerToken.decimals
                });
                
                if (rakeResult.success) {
                    rakeTxId = rakeResult.txId;
                    console.log(`   ✅ Rake sent! Tx: ${rakeTxId}`);
                } else {
                    // Rake failed - but we still pay winner the full amount
                    // Log for manual recovery but don't block winner payout
                    console.error(`   ⚠️ Rake payment failed: ${rakeResult.error}`);
                    console.error(`      Will pay winner full amount and log for manual rake recovery`);
                    winnerPayoutRaw = totalPotRaw; // Winner gets full pot if rake fails
                    rakeAmountRaw = 0n;
                }
            } else {
                if (!RAKE_CONFIG.RAKE_WALLET) {
                    console.log(`   ℹ️ Rake disabled: No RAKE_WALLET configured`);
                } else {
                    console.log(`   ℹ️ Rake skipped: Pot below minimum threshold`);
                }
                console.log(`   💸 Full pot to winner: ${wagerToken.tokenAmount * 2} ${wagerToken.tokenSymbol}`);
            }
            
            // ═══════════════════════════════════════════════════════════════════
            // STEP 2: Send winner payout (after rake deduction)
            // ═══════════════════════════════════════════════════════════════════
            console.log(`   💸 [${rakeEnabled ? '2/2' : '1/1'}] Sending payout to winner...`);
            
            const payoutResult = await custodialWalletService.processPayout({
                matchId,
                winnerWallet,
                loserWallet,
                tokenAddress: wagerToken.tokenAddress,
                amountRaw: winnerPayoutRaw.toString(),
                decimals: wagerToken.decimals
            });
            
            if (payoutResult.success) {
                const result = {
                    success: true,
                    txSignature: payoutResult.txId,
                    amount: Number(winnerPayoutRaw) / Math.pow(10, wagerToken.decimals || 6),
                    amountRaw: winnerPayoutRaw.toString(),
                    tokenSymbol: wagerToken.tokenSymbol,
                    tokenAddress: wagerToken.tokenAddress,
                    from: 'custodial_wallet',
                    to: winnerWallet,
                    // Rake info
                    rakeAmount: Number(rakeAmountRaw) / Math.pow(10, wagerToken.decimals || 6),
                    rakeAmountRaw: rakeAmountRaw.toString(),
                    rakePercent: RAKE_CONFIG.RAKE_PERCENT,
                    rakeTxSignature: rakeTxId,
                    timestamp: Date.now()
                };
                
                await this._updateSettlementStatusWithRake(matchId, 'completed', payoutResult.txId, {
                    rakeAmountRaw: rakeAmountRaw.toString(),
                    rakePercent: RAKE_CONFIG.RAKE_PERCENT,
                    rakeTx: rakeTxId,
                    winnerPayoutRaw: winnerPayoutRaw.toString()
                });
                
                this.settlementHistory.set(matchId, result);
                
                console.log(`   ✅ Settlement complete!`);
                console.log(`      Winner Tx: ${payoutResult.txId}`);
                if (rakeTxId) console.log(`      Rake Tx: ${rakeTxId}`);
                
                return result;
            } else {
                console.error(`   ❌ Winner payout failed: ${payoutResult.error}`);
                await this._updateSettlementStatus(matchId, 'failed', null, payoutResult.error);
                return {
                    success: false,
                    error: payoutResult.error,
                    message: 'Winner payout failed'
                };
            }
            
        } catch (error) {
            console.error(`   ❌ Settlement error for match ${matchId}:`, error);
            
            await this._updateSettlementStatus(matchId, 'failed', null, error.message);
            
            return {
                success: false,
                error: 'SETTLEMENT_FAILED',
                message: error.message
            };
        }
    }
    
    /**
     * Handle settlement for a draw (refund both players from custodial wallet)
     * @param {object} match - Match that ended in draw
     * @returns {Promise<{success: boolean}>}
     */
    async handleDraw(match) {
        if (!this.hasTokenWager(match)) {
            return { success: true, message: 'No token wager to refund' };
        }
        
        const matchId = match.id || match.matchId;
        const { wagerToken } = match;
        
        console.log(`🤝 [Settlement] Match ${matchId} ended in draw - processing refunds`);
        console.log(`   Refunding ${wagerToken.tokenAmount} ${wagerToken.tokenSymbol} to each player`);
        
        // Real refunds require custodial wallet
        if (!custodialWalletService.isReady()) {
            console.log(`   ⚠️ Custodial wallet not ready - CANNOT process draw refund!`);
            await this._updateSettlementStatus(matchId, 'manual_review', null, 'Draw refund needed - custodial not ready');
            return { success: false, error: 'CUSTODIAL_NOT_READY', message: 'Manual refund required' };
        }
        
        // Real refunds via custodial wallet
        const player1Wallet = match.player1?.wallet || match.player1Wallet;
        const player2Wallet = match.player2?.wallet || match.player2Wallet;
        
        if (!player1Wallet || !player2Wallet) {
            await this._updateSettlementStatus(matchId, 'failed', null, 'Missing wallet addresses for draw');
            return { success: false, error: 'MISSING_WALLETS' };
        }
        
        console.log(`   💸 Processing real draw refunds via custodial wallet`);
        
        try {
            const refundResult = await custodialWalletService.processRefund({
                matchId,
                player1Wallet,
                player2Wallet,
                tokenAddress: wagerToken.tokenAddress,
                amountRaw: wagerToken.amountRaw,
                decimals: wagerToken.decimals || wagerToken.tokenDecimals
            });
            
            if (refundResult.success) {
                console.log(`   ✅ Draw refunds complete!`);
                if (refundResult.tx1) console.log(`      P1 tx: ${refundResult.tx1}`);
                if (refundResult.tx2) console.log(`      P2 tx: ${refundResult.tx2}`);
                
                await this._updateSettlementStatus(matchId, 'refunded', refundResult.tx1 || refundResult.tx2);
                const [tx1, tx2] = refundResult.txIds || [];
                return {
                    success: true,
                    message: 'Draw - both players refunded',
                    isDraw: true,
                    txIds: { player1: tx1, player2: tx2 }
                };
            } else {
                console.error(`   ❌ Draw refund failed: ${refundResult.error}`);
                await this._updateSettlementStatus(matchId, 'failed', null, refundResult.error);
                return { success: false, error: refundResult.error };
            }
        } catch (err) {
            console.error(`   ❌ Draw refund error: ${err.message}`);
            await this._updateSettlementStatus(matchId, 'failed', null, err.message);
            return { success: false, error: err.message };
        }
    }
    
    /**
     * Handle settlement for void match (disconnect/forfeit before game really started)
     * With custodial wallet, we need to refund both players' deposits
     * @param {object} match - Voided match
     * @param {string} reason - Reason for void (disconnect, forfeit, etc)
     * @returns {Promise<{success: boolean}>}
     */
    async handleVoid(match, reason = 'void') {
        if (!this.hasTokenWager(match)) {
            return { success: true, message: 'No token wager to refund' };
        }
        
        const matchId = match.id || match.matchId;
        const { wagerToken } = match;
        
        console.log(`❌ [Settlement] Match ${matchId} voided (${reason}) - processing refunds`);
        
        // Real refunds require custodial wallet
        if (!custodialWalletService.isReady()) {
            console.log(`   ⚠️ Custodial wallet not ready - CANNOT process refund!`);
            await this._updateSettlementStatus(matchId, 'manual_review', null, `Refund needed - custodial not ready`);
            return { success: false, error: 'CUSTODIAL_NOT_READY', message: 'Manual refund required' };
        }
        
        // Real refund via custodial wallet
        const player1Wallet = match.player1?.wallet || match.player1Wallet;
        const player2Wallet = match.player2?.wallet || match.player2Wallet;
        
        console.log(`   💸 Processing real refunds via custodial wallet`);
        console.log(`      Player 1: ${player1Wallet?.slice(0, 8)}...`);
        console.log(`      Player 2: ${player2Wallet?.slice(0, 8)}...`);
        console.log(`      Amount: ${wagerToken.tokenAmount} ${wagerToken.tokenSymbol} each`);
        
        try {
            const refundResult = await custodialWalletService.processRefund({
                matchId,
                player1Wallet,
                player2Wallet,
                tokenAddress: wagerToken.tokenAddress,
                amountRaw: wagerToken.amountRaw,
                decimals: wagerToken.decimals || wagerToken.tokenDecimals
            });
            
            if (refundResult.success) {
                const [tx1, tx2] = refundResult.txIds || [];
                console.log(`   ✅ Refunds complete!`);
                if (tx1) console.log(`      P1 tx: ${tx1}`);
                if (tx2) console.log(`      P2 tx: ${tx2}`);
                
                await this._updateSettlementStatus(matchId, 'refunded', tx1 || tx2);
                return {
                    success: true,
                    message: `Match voided (${reason}) - both players refunded`,
                    isVoid: true,
                    txIds: { player1: tx1, player2: tx2 }
                };
            } else {
                console.error(`   ❌ Refund failed: ${refundResult.error}`);
                await this._updateSettlementStatus(matchId, 'failed', null, refundResult.error);
                return { success: false, error: refundResult.error };
            }
        } catch (err) {
            console.error(`   ❌ Refund error: ${err.message}`);
            await this._updateSettlementStatus(matchId, 'failed', null, err.message);
            return { success: false, error: err.message };
        }
    }
    
    /**
     * Update settlement status in database
     * @private
     */
    async _updateSettlementStatus(matchId, status, txSignature = null, error = null) {
        if (!isDBConnected()) {
            console.log(`   ⚠️ Database not connected - settlement status not persisted`);
            return;
        }
        
        try {
            const update = {
                settlementStatus: status,
                settlementTx: txSignature,
                settlementError: error
            };
            
            await Match.updateOne({ matchId }, update);
            console.log(`   📝 Settlement status updated to: ${status}`);
            
        } catch (dbError) {
            console.error(`   ⚠️ Failed to update settlement status:`, dbError.message);
        }
    }
    
    /**
     * Update settlement status with rake information
     * @private
     */
    async _updateSettlementStatusWithRake(matchId, status, txSignature, rakeInfo) {
        if (!isDBConnected()) {
            console.log(`   ⚠️ Database not connected - settlement status not persisted`);
            return;
        }
        
        try {
            const update = {
                settlementStatus: status,
                settlementTx: txSignature,
                // Rake fields
                rakeAmountRaw: rakeInfo.rakeAmountRaw,
                rakePercent: rakeInfo.rakePercent,
                rakeTx: rakeInfo.rakeTx,
                winnerPayoutRaw: rakeInfo.winnerPayoutRaw
            };
            
            await Match.updateOne({ matchId }, update);
            console.log(`   📝 Settlement status updated to: ${status} (with rake info)`);
            
        } catch (dbError) {
            console.error(`   ⚠️ Failed to update settlement status with rake:`, dbError.message);
        }
    }
    
    /**
     * Get settlement status for a match
     * @param {string} matchId - Match ID
     * @returns {object|null}
     */
    getSettlementStatus(matchId) {
        return this.settlementHistory.get(matchId) || null;
    }
    
    /**
     * Get overall service status (for health checks and admin)
     */
    getStatus() {
        return {
            ready: this.isReady(),
            custodialWallet: custodialWalletService.getStatus(),
            pendingSettlements: this.pendingSettlements.size,
            historySize: this.settlementHistory.size,
            rake: {
                enabled: !!RAKE_CONFIG.RAKE_WALLET,
                percent: RAKE_CONFIG.RAKE_PERCENT,
                wallet: RAKE_CONFIG.RAKE_WALLET ? 
                    RAKE_CONFIG.RAKE_WALLET.slice(0, 4) + '...' + RAKE_CONFIG.RAKE_WALLET.slice(-4) : 
                    null
            }
        };
    }
    
    /**
     * Get custodial wallet audit log
     */
    getAuditLog(limit = 100) {
        return custodialWalletService.getAuditLog(limit);
    }
    
    /**
     * Process any pending settlements (for recovery after server restart)
     * @returns {Promise<number>} Number of settlements processed
     */
    async processPendingSettlements() {
        if (!isDBConnected()) {
            return 0;
        }
        
        try {
            // Find matches with pending or processing settlements
            const pendingMatches = await Match.find({
                settlementStatus: { $in: ['pending', 'processing'] },
                status: 'completed',
                wagerToken: { $ne: null }
            }).lean();
            
            console.log(`🔄 Found ${pendingMatches.length} pending settlements to process`);
            
            for (const match of pendingMatches) {
                // Mark all pending settlements for manual review - server restart 
                // means we lost the match state needed for automatic settlement
                await this._updateSettlementStatus(
                    match.matchId,
                    'manual_review',
                    null,
                    'Requires manual settlement after server recovery'
                );
                console.log(`   ⚠️ Match ${match.matchId} marked for manual review`);
            }
            
            return pendingMatches.length;
            
        } catch (error) {
            console.error('Error processing pending settlements:', error);
            return 0;
        }
    }
}

// Export singleton instance
const wagerSettlementService = new WagerSettlementService();
export default wagerSettlementService;

