/**
 * PebbleService - Handles Pebble currency deposits and withdrawals
 * 
 * Pebbles are the premium currency for the gacha system.
 * - Deposit: User sends SOL to RAKE_WALLET, we verify and credit Pebbles
 * - Withdrawal: User requests Pebbles -> SOL (5% rake applied)
 * - Queue: If custodial wallet low, withdrawals queue for auto-fill
 */

import { User, Transaction, PebbleWithdrawal } from '../db/models/index.js';
import { Connection, PublicKey } from '@solana/web3.js';
import SolanaTransaction from '../db/models/SolanaTransaction.js';

// ========== PEBBLE CONFIGURATION ==========
const PEBBLES_PER_SOL = 1000;           // 1 SOL = 1000 Pebbles
const WITHDRAWAL_RAKE_PERCENT = 5;       // 5% rake on withdrawals
const MIN_DEPOSIT_PEBBLES = 100;         // 0.1 SOL minimum deposit
const MIN_WITHDRAWAL_PEBBLES = 100;      // 0.1 SOL minimum withdrawal
const LAMPORTS_PER_SOL = 1_000_000_000;  // Solana constant

class PebbleService {
    constructor(solanaPaymentService, custodialWalletService, sendToPlayer = null) {
        this.solanaPaymentService = solanaPaymentService;
        this.custodialWalletService = custodialWalletService;
        this.sendToPlayer = sendToPlayer;
        this.getPlayerByWallet = null; // Set later via setPlayerLookup
        
        // These are set lazily in _ensureConfigured() after dotenv loads
        this.rakeWallet = null;
        this.connection = null;
        this._configured = false;
        
        console.log('🪨 PebbleService created (config loaded on first use)');
    }
    
    /**
     * Ensure env vars are loaded (call this at start of any public method)
     */
    _ensureConfigured() {
        if (this._configured) return;
        
        this.rakeWallet = process.env.RAKE_WALLET;
        this.connection = this.solanaPaymentService?.connection || new Connection(
            process.env.SOLANA_RPC_URL,
            { commitment: 'confirmed' }
        );
        this._configured = true;
        
        console.log('🪨 PebbleService configured');
        console.log(`   Rate: ${PEBBLES_PER_SOL} Pebbles per SOL`);
        console.log(`   Withdrawal Rake: ${WITHDRAWAL_RAKE_PERCENT}%`);
        console.log(`   Rake Wallet: ${this.rakeWallet?.slice(0, 8) || 'NOT SET'}...`);
        
        if (!this.rakeWallet) {
            console.warn('⚠️ PebbleService: RAKE_WALLET not configured! Deposits will fail.');
        }
    }
    
    /**
     * Set the player lookup function for notifying users of completed withdrawals
     */
    setPlayerLookup(getPlayerByWallet) {
        this.getPlayerByWallet = getPlayerByWallet;
    }
    
    // ==================== DEPOSITS ====================
    
    /**
     * Process a pebble deposit - verify native SOL transfer and credit pebbles
     */
    async depositPebbles(walletAddress, txSignature, expectedSolAmount, playerId = null) {
        this._ensureConfigured();
        
        console.log(`🪨 Pebble deposit requested: ${walletAddress.slice(0, 8)}...`);
        console.log(`   Tx: ${txSignature.slice(0, 16)}...`);
        console.log(`   Expected: ${expectedSolAmount} SOL`);
        
        if (!this.rakeWallet) {
            return { success: false, error: 'SERVICE_NOT_CONFIGURED', message: 'RAKE_WALLET not set' };
        }
        
        const expectedLamports = Math.floor(expectedSolAmount * LAMPORTS_PER_SOL);
        const expectedPebbles = Math.floor(expectedSolAmount * PEBBLES_PER_SOL);
        
        if (expectedPebbles < MIN_DEPOSIT_PEBBLES) {
            return { success: false, error: 'BELOW_MINIMUM', message: `Min ${MIN_DEPOSIT_PEBBLES} Pebbles` };
        }
        
        // Check if tx already used (replay protection)
        try {
            const existsInDb = await SolanaTransaction.isSignatureUsed(txSignature);
            if (existsInDb) {
                console.log(`   ❌ Tx already used`);
                return { success: false, error: 'TX_ALREADY_USED', message: 'Transaction already processed' };
            }
        } catch (e) {
            console.warn('   ⚠️ DB check failed, continuing...');
        }
        
        // Verify transaction exists and succeeded on-chain
        try {
            const status = await this.connection.getSignatureStatus(txSignature);
            
            if (!status?.value) {
                console.log(`   ⏳ Tx pending, waiting...`);
                await new Promise(r => setTimeout(r, 2000));
                const retry = await this.connection.getSignatureStatus(txSignature);
                if (!retry?.value) {
                    return { success: false, error: 'TX_NOT_FOUND', message: 'Transaction not found' };
                }
            }
            
            const txStatus = status?.value || (await this.connection.getSignatureStatus(txSignature))?.value;
            
            if (txStatus.err) {
                console.log(`   ❌ Tx failed:`, txStatus.err);
                return { success: false, error: 'TX_FAILED', message: 'Transaction failed on-chain' };
            }
            
            if (txStatus.confirmationStatus === 'confirmed' || txStatus.confirmationStatus === 'finalized') {
                console.log(`   ✅ Tx confirmed (${txStatus.confirmationStatus})`);
            } else {
                console.log(`   ⏳ Tx status: ${txStatus.confirmationStatus}`);
            }
            
        } catch (error) {
            console.error(`   ❌ Verification error:`, error.message);
            return { success: false, error: 'VERIFICATION_FAILED', message: error.message };
        }
        
        // Mark tx as used
        try {
            await SolanaTransaction.create({
                signature: txSignature,
                sender: walletAddress,
                recipient: this.rakeWallet,
                amount: expectedLamports.toString(),
                currency: 'SOL',
                transactionType: 'pebble_deposit'
            });
        } catch (e) {
            if (e.code === 11000) {
                return { success: false, error: 'TX_ALREADY_USED', message: 'Transaction already processed' };
            }
        }
        
        // Credit pebbles
        const creditResult = await this._creditPebbles(walletAddress, expectedPebbles);
        if (!creditResult.success) {
            console.log(`   ❌ Credit failed: ${creditResult.error}`);
            return creditResult;
        }
        
        console.log(`   ✅ Credited ${expectedPebbles} Pebbles (balance: ${creditResult.newBalance})`);
        
        // Log transaction
        try {
            await Transaction.record({
                type: 'pebble_deposit',
                toWallet: walletAddress,
                amount: expectedPebbles,
                currency: 'pebbles',
                toBalanceAfter: creditResult.newBalance,
                relatedData: { solTxSignature: txSignature, solAmount: expectedSolAmount },
                reason: `Deposited ${expectedSolAmount} SOL for ${expectedPebbles} Pebbles`
            });
        } catch (e) {
            console.warn('   ⚠️ Failed to log transaction:', e.message);
        }
        
        return {
            success: true,
            pebblesReceived: expectedPebbles,
            newBalance: creditResult.newBalance,
            solAmount: expectedSolAmount,
            txSignature
        };
    }
    
    async _creditPebbles(walletAddress, amount) {
        const result = await User.findOneAndUpdate(
            { walletAddress },
            {
                $inc: { pebbles: amount, 'pebbleStats.totalDeposited': amount },
                $set: { 'pebbleStats.lastDepositAt': new Date() }
            },
            { new: true, select: 'pebbles' }
        );
        
        if (!result) return { success: false, error: 'USER_NOT_FOUND' };
        return { success: true, newBalance: result.pebbles };
    }
    
    // ==================== WITHDRAWALS ====================
    
    /**
     * Request a pebble withdrawal
     * - Validates balance (server authority)
     * - Deducts pebbles immediately
     * - Attempts instant payout OR queues if custodial wallet low
     */
    async withdrawPebbles(walletAddress, pebbleAmount, playerId = null) {
        this._ensureConfigured();
        
        console.log(`🪨 Pebble withdrawal request: ${walletAddress.slice(0, 8)}... - ${pebbleAmount} Pebbles`);
        
        // Validate minimum
        if (pebbleAmount < MIN_WITHDRAWAL_PEBBLES) {
            return { success: false, error: 'BELOW_MINIMUM', message: `Minimum withdrawal is ${MIN_WITHDRAWAL_PEBBLES} Pebbles (${MIN_WITHDRAWAL_PEBBLES / PEBBLES_PER_SOL} SOL)` };
        }
        
        // Server-side balance check (no client trust)
        const user = await User.findOne({ walletAddress }, 'pebbles');
        if (!user) {
            return { success: false, error: 'USER_NOT_FOUND', message: 'User not found' };
        }
        if (user.pebbles < pebbleAmount) {
            return { success: false, error: 'INSUFFICIENT_PEBBLES', message: `You have ${user.pebbles} Pebbles, need ${pebbleAmount}` };
        }
        
        // Calculate amounts
        const grossSol = pebbleAmount / PEBBLES_PER_SOL;
        const rakeAmount = Math.floor(pebbleAmount * (WITHDRAWAL_RAKE_PERCENT / 100));
        const netPebbles = pebbleAmount - rakeAmount;
        const netSol = netPebbles / PEBBLES_PER_SOL;
        const netLamports = Math.floor(netSol * LAMPORTS_PER_SOL);
        
        console.log(`   Gross: ${pebbleAmount} Pebbles (${grossSol} SOL)`);
        console.log(`   Rake: ${rakeAmount} Pebbles (${WITHDRAWAL_RAKE_PERCENT}%)`);
        console.log(`   Net: ${netPebbles} Pebbles (${netSol} SOL)`);
        
        // Deduct pebbles FIRST (atomic, server authority)
        const deductResult = await this._deductPebblesForWithdrawal(walletAddress, pebbleAmount, rakeAmount);
        if (!deductResult.success) {
            return { success: false, error: 'DEDUCTION_FAILED', message: 'Failed to deduct pebbles' };
        }
        
        // Check if we can process immediately
        const canProcessNow = await this._canProcessWithdrawalNow(netLamports);
        
        if (canProcessNow && this.custodialWalletService?.isReady()) {
            // Try immediate payout
            const payoutResult = await this._processImmediateWithdrawal(
                walletAddress, pebbleAmount, rakeAmount, netPebbles, netSol, netLamports, deductResult.newBalance
            );
            
            if (payoutResult.success) {
                return payoutResult;
            }
            
            // If immediate failed, queue it instead of refunding
            console.log(`   ⚠️ Immediate payout failed, queueing...`);
        }
        
        // Queue the withdrawal
        const queueResult = await this._queueWithdrawal(
            walletAddress, pebbleAmount, rakeAmount, netPebbles, netSol, netLamports.toString()
        );
        
        if (!queueResult.success) {
            // Refund if queueing failed
            await this._refundWithdrawal(walletAddress, pebbleAmount, rakeAmount);
            return { success: false, error: 'QUEUE_FAILED', message: 'Failed to queue withdrawal. Pebbles refunded.' };
        }
        
        console.log(`   📋 Queued as #${queueResult.queuePosition} (${queueResult.withdrawalId})`);
        
        return {
            success: true,
            status: 'queued',
            withdrawalId: queueResult.withdrawalId,
            queuePosition: queueResult.queuePosition,
            pebbleAmount,
            rakeAmount,
            netPebbles,
            solToReceive: netSol,
            newBalance: deductResult.newBalance,
            message: `Withdrawal queued at position #${queueResult.queuePosition}. You'll receive ${netSol.toFixed(4)} SOL when funds are available.`
        };
    }
    
    /**
     * Check if custodial wallet has enough SOL for immediate payout
     */
    async _canProcessWithdrawalNow(lamportsNeeded, debug = false) {
        if (!this.custodialWalletService?.isReady()) {
            if (debug) console.log('   💰 Custodial service not ready');
            return false;
        }
        
        try {
            const balance = await this.custodialWalletService.getBalance();
            // Keep some buffer (0.005 SOL for fees) - reduced from 0.01
            const minBuffer = 5_000_000; // 0.005 SOL
            const totalNeeded = lamportsNeeded + minBuffer;
            const canAfford = balance >= totalNeeded;
            
            if (debug) {
                console.log(`   💰 Balance check: have ${(balance / 1e9).toFixed(4)} SOL, need ${(totalNeeded / 1e9).toFixed(4)} SOL (${(lamportsNeeded / 1e9).toFixed(4)} + ${(minBuffer / 1e9).toFixed(4)} buffer)`);
                console.log(`   💰 Can afford: ${canAfford ? 'YES ✅' : 'NO ❌'}`);
            }
            
            return canAfford;
        } catch (e) {
            console.warn('   ⚠️ Balance check failed:', e.message);
            return false;
        }
    }
    
    /**
     * Process immediate withdrawal
     */
    async _processImmediateWithdrawal(walletAddress, pebbleAmount, rakeAmount, netPebbles, netSol, netLamports, newBalance) {
        try {
            // Use sendNativeSOL for native SOL transfers (not SPL tokens!)
            const sendResult = await this.custodialWalletService.sendNativeSOL(
                walletAddress, BigInt(netLamports), `pebble_withdrawal_${Date.now()}`
            );
            
            if (!sendResult.success) {
                return { success: false, error: sendResult.error };
            }
            
            console.log(`   ✅ Instant payout: ${netSol} SOL. Tx: ${sendResult.txId}`);
            
            // Log transaction
            await this._logWithdrawalTransaction(walletAddress, pebbleAmount, rakeAmount, netSol, sendResult.txId, newBalance);
            
            return {
                success: true,
                status: 'completed',
                pebbleAmount,
                rakeAmount,
                netPebbles,
                solReceived: netSol,
                rakePercent: WITHDRAWAL_RAKE_PERCENT,
                newBalance,
                txSignature: sendResult.txId
            };
            
        } catch (error) {
            console.error(`   ❌ Payout error:`, error.message);
            return { success: false, error: 'PAYOUT_FAILED' };
        }
    }
    
    /**
     * Queue a withdrawal for later processing
     */
    async _queueWithdrawal(walletAddress, pebbleAmount, rakeAmount, netPebbles, solAmount, lamports) {
        try {
            const withdrawal = await PebbleWithdrawal.createRequest({
                walletAddress,
                pebbleAmount,
                rakeAmount,
                netPebbles,
                solAmount,
                lamports
            });
            
            return {
                success: true,
                withdrawalId: withdrawal.withdrawalId,
                queuePosition: withdrawal.queuePosition
            };
        } catch (error) {
            console.error('   ❌ Queue error:', error.message);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Cancel a pending withdrawal (refunds pebbles)
     */
    async cancelWithdrawal(walletAddress, withdrawalId) {
        console.log(`🪨 Cancelling withdrawal ${withdrawalId} for ${walletAddress.slice(0, 8)}...`);
        
        const withdrawal = await PebbleWithdrawal.findOne({ withdrawalId, walletAddress });
        
        if (!withdrawal) {
            return { success: false, error: 'NOT_FOUND', message: 'Withdrawal not found' };
        }
        
        if (withdrawal.status !== 'pending') {
            return { success: false, error: 'INVALID_STATUS', message: `Cannot cancel ${withdrawal.status} withdrawal` };
        }
        
        // Cancel in DB
        const cancelled = await PebbleWithdrawal.cancelWithdrawal(withdrawalId, walletAddress);
        if (!cancelled) {
            return { success: false, error: 'CANCEL_FAILED', message: 'Failed to cancel withdrawal' };
        }
        
        // Refund pebbles
        await this._refundWithdrawal(walletAddress, withdrawal.pebbleAmount, withdrawal.rakeAmount);
        
        // Get new balance
        const user = await User.findOne({ walletAddress }, 'pebbles');
        
        console.log(`   ✅ Cancelled and refunded ${withdrawal.pebbleAmount} Pebbles`);
        
        return {
            success: true,
            refundedPebbles: withdrawal.pebbleAmount,
            newBalance: user?.pebbles || 0
        };
    }
    
    /**
     * Get user's withdrawal history and pending requests
     */
    async getUserWithdrawals(walletAddress) {
        const withdrawals = await PebbleWithdrawal.getUserWithdrawals(walletAddress, 20);
        return withdrawals.map(w => ({
            withdrawalId: w.withdrawalId,
            pebbleAmount: w.pebbleAmount,
            rakeAmount: w.rakeAmount,
            solAmount: w.solAmount,
            status: w.status,
            queuePosition: w.queuePosition,
            txSignature: w.txSignature,
            requestedAt: w.requestedAt,
            processedAt: w.processedAt
        }));
    }
    
    /**
     * Process pending withdrawals from queue (called periodically or when funds arrive)
     */
    async processWithdrawalQueue(maxToProcess = 5) {
        this._ensureConfigured();
        
        if (!this.custodialWalletService?.isReady()) {
            console.log('🪨 Queue: Custodial service not ready');
            return { processed: 0, failed: 0 };
        }
        
        const pending = await PebbleWithdrawal.getPendingQueue(maxToProcess);
        if (pending.length === 0) {
            return { processed: 0, failed: 0 };
        }
        
        console.log(`🪨 Processing ${pending.length} queued withdrawals...`);
        
        let processed = 0;
        let failed = 0;
        
        for (const withdrawal of pending) {
            // Parse lamports from string to BigInt (stored as string for precision)
            const lamportsStr = withdrawal.lamports;
            const lamports = BigInt(lamportsStr);
            const lamportsNum = Number(lamports);
            
            console.log(`   📋 Checking ${withdrawal.withdrawalId}: ${withdrawal.solAmount} SOL (${lamportsNum} lamports)`);
            
            // Check if we can afford this one (with debug logging)
            const canAfford = await this._canProcessWithdrawalNow(lamportsNum, true);
            if (!canAfford) {
                console.log(`   ⏸️ Insufficient funds for ${withdrawal.withdrawalId}, stopping queue`);
                break; // Stop processing - funds depleted
            }
            
            // Mark as processing
            await PebbleWithdrawal.markProcessing(withdrawal.withdrawalId);
            
            try {
                // Use sendNativeSOL for native SOL transfers (not SPL tokens!)
                const sendResult = await this.custodialWalletService.sendNativeSOL(
                    withdrawal.walletAddress, lamports, `pebble_withdrawal_${withdrawal.withdrawalId}`
                );
                
                if (sendResult.success) {
                    await PebbleWithdrawal.markCompleted(withdrawal.withdrawalId, sendResult.txId);
                    await this._logWithdrawalTransaction(
                        withdrawal.walletAddress,
                        withdrawal.pebbleAmount,
                        withdrawal.rakeAmount,
                        withdrawal.solAmount,
                        sendResult.txId,
                        null
                    );
                    
                    console.log(`   ✅ Processed ${withdrawal.withdrawalId}: ${withdrawal.solAmount} SOL → ${withdrawal.walletAddress.slice(0, 8)}...`);
                    console.log(`   📜 Tx: ${sendResult.txId}`);
                    
                    // Notify user if they're online
                    if (this.sendToPlayer && this.getPlayerByWallet) {
                        const player = this.getPlayerByWallet(withdrawal.walletAddress);
                        if (player) {
                            this.sendToPlayer(player.id, {
                                type: 'pebbles_withdrawal_completed',
                                withdrawalId: withdrawal.withdrawalId,
                                solReceived: withdrawal.solAmount,
                                txSignature: sendResult.txId,
                                message: `Your withdrawal of ${withdrawal.solAmount.toFixed(4)} SOL has been processed!`
                            });
                            console.log(`   📱 Notified player ${player.name || player.id}`);
                        }
                    }
                    
                    processed++;
                } else {
                    await PebbleWithdrawal.markFailed(withdrawal.withdrawalId, sendResult.error);
                    console.log(`   ❌ Failed ${withdrawal.withdrawalId}: ${sendResult.error}`);
                    failed++;
                }
                
            } catch (error) {
                await PebbleWithdrawal.markFailed(withdrawal.withdrawalId, error.message);
                console.log(`   ❌ Error ${withdrawal.withdrawalId}: ${error.message}`);
                failed++;
            }
        }
        
        console.log(`🪨 Queue complete: ${processed} processed, ${failed} failed`);
        return { processed, failed };
    }
    
    /**
     * Get queue statistics
     */
    async getQueueStats() {
        return PebbleWithdrawal.getQueueStats();
    }
    
    async _deductPebblesForWithdrawal(walletAddress, totalAmount, rakeAmount) {
        const result = await User.findOneAndUpdate(
            { walletAddress, pebbles: { $gte: totalAmount } },
            {
                $inc: {
                    pebbles: -totalAmount,
                    'pebbleStats.totalWithdrawn': totalAmount,
                    'pebbleStats.totalRakePaid': rakeAmount
                },
                $set: { 'pebbleStats.lastWithdrawalAt': new Date() }
            },
            { new: true, select: 'pebbles' }
        );
        
        if (!result) return { success: false, error: 'INSUFFICIENT_PEBBLES' };
        return { success: true, newBalance: result.pebbles };
    }
    
    async _refundWithdrawal(walletAddress, totalAmount, rakeAmount) {
        await User.updateOne({ walletAddress }, {
            $inc: {
                pebbles: totalAmount,
                'pebbleStats.totalWithdrawn': -totalAmount,
                'pebbleStats.totalRakePaid': -rakeAmount
            }
        });
        console.log(`   ↩️ Refunded ${totalAmount} Pebbles`);
    }
    
    async _logWithdrawalTransaction(walletAddress, pebbleAmount, rakeAmount, solAmount, txSignature, balanceAfter) {
        try {
            await Transaction.record({
                type: 'pebble_withdrawal',
                fromWallet: walletAddress,
                amount: pebbleAmount,
                currency: 'pebbles',
                fromBalanceAfter: balanceAfter,
                relatedData: {
                    solTxSignature: txSignature,
                    solAmount,
                    rakeAmount,
                    rakePercent: WITHDRAWAL_RAKE_PERCENT
                },
                reason: `Withdrew ${pebbleAmount} Pebbles for ${solAmount.toFixed(4)} SOL (${rakeAmount} rake)`
            });
            
            // Also log the rake portion
            await Transaction.record({
                type: 'pebble_rake',
                fromWallet: walletAddress,
                amount: rakeAmount,
                currency: 'pebbles',
                reason: `${WITHDRAWAL_RAKE_PERCENT}% withdrawal rake on ${pebbleAmount} Pebbles`
            });
        } catch (e) {
            console.warn('   ⚠️ Failed to log withdrawal transaction:', e.message);
        }
    }
    
    // ==================== STATIC METHODS ====================
    
    static getBundles() {
        return [
            { id: 'starter', pebbles: 100, sol: 0.1, bonus: 0 },
            { id: 'value', pebbles: 500, sol: 0.5, bonus: 0 },
            { id: 'popular', pebbles: 1000, sol: 1.0, bonus: 0, featured: true },
            { id: 'whale', pebbles: 5250, sol: 5.0, bonus: 250, bonusPercent: 5 },
            { id: 'mega', pebbles: 10750, sol: 10.0, bonus: 750, bonusPercent: 7.5 }
        ];
    }
    
    static getConfig() {
        return {
            pebblesPerSol: PEBBLES_PER_SOL,
            withdrawalRakePercent: WITHDRAWAL_RAKE_PERCENT,
            minDepositPebbles: MIN_DEPOSIT_PEBBLES,
            minWithdrawalPebbles: MIN_WITHDRAWAL_PEBBLES
        };
    }
    
    static getExchangeInfo() {
        return { ...PebbleService.getConfig(), bundles: PebbleService.getBundles() };
    }
}

export default PebbleService;
export { PEBBLES_PER_SOL, WITHDRAWAL_RAKE_PERCENT, MIN_DEPOSIT_PEBBLES, MIN_WITHDRAWAL_PEBBLES };
