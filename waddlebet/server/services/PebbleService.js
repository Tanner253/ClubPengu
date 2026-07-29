/**
 * PebbleService - Handles Pebble currency deposits and withdrawals
 * 
 * Pebbles are the in-game premium currency.
 * 
 * DEPOSIT: SOL only (1 SOL = 1000 Pebbles)
 * 
 * WITHDRAWAL:
 * - SOL ONLY (5% rake applied)
 * - Queue system if custodial wallet low
 */

import { User, Transaction, PebbleWithdrawal } from '../db/models/index.js';
import { Connection, PublicKey } from '@solana/web3.js';
import SolanaTransaction from '../db/models/SolanaTransaction.js';
import { validateWalletAddress, validateTransactionSignature, validateAmount } from '../utils/securityValidation.js';

// ========== PEBBLE CONFIGURATION ==========
const PEBBLES_PER_SOL = 1000;           // 1 SOL = 1000 Pebbles
const WITHDRAWAL_RAKE_PERCENT = 5;       // 5% rake on withdrawals
const MIN_DEPOSIT_PEBBLES = 100;         // Minimum deposit
const MIN_WITHDRAWAL_PEBBLES = 100;      // Minimum withdrawal
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
        
        // CRITICAL SECURITY: Validate all inputs at service level
        const walletValidation = validateWalletAddress(walletAddress);
        if (!walletValidation.valid) {
            console.error(`🚨 Security: Invalid wallet address in depositPebbles: ${walletValidation.error}`);
            return { success: false, error: 'INVALID_WALLET', message: walletValidation.error };
        }
        
        const sigValidation = validateTransactionSignature(txSignature);
        if (!sigValidation.valid) {
            console.error(`🚨 Security: Invalid transaction signature in depositPebbles: ${sigValidation.error}`);
            return { success: false, error: 'INVALID_SIGNATURE', message: sigValidation.error };
        }
        
        const solValidation = validateAmount(expectedSolAmount, {
            min: 0.001,
            max: 1000,
            allowFloat: true,
            allowZero: false
        });
        if (!solValidation.valid) {
            console.error(`🚨 Security: Invalid SOL amount in depositPebbles: ${solValidation.error}`);
            return { success: false, error: 'INVALID_AMOUNT', message: solValidation.error };
        }
        
        // Use sanitized values
        const sanitizedWallet = walletValidation.address;
        const sanitizedSignature = sigValidation.signature;
        const sanitizedSolAmount = solValidation.value;
        
        console.log(`🪨 Pebble deposit requested: ${sanitizedWallet.slice(0, 8)}...`);
        console.log(`   Tx: ${sanitizedSignature.slice(0, 16)}...`);
        console.log(`   Expected: ${sanitizedSolAmount} SOL`);
        
        if (!this.rakeWallet) {
            return { success: false, error: 'SERVICE_NOT_CONFIGURED', message: 'RAKE_WALLET not set' };
        }
        
        const expectedLamports = Math.floor(sanitizedSolAmount * LAMPORTS_PER_SOL);
        const expectedPebbles = Math.floor(sanitizedSolAmount * PEBBLES_PER_SOL);
        
        if (expectedPebbles < MIN_DEPOSIT_PEBBLES) {
            return { success: false, error: 'BELOW_MINIMUM', message: `Min ${MIN_DEPOSIT_PEBBLES} Pebbles` };
        }
        
        // Check if tx already used (replay protection) - use sanitized signature
        try {
            const existsInDb = await SolanaTransaction.isSignatureUsed(sanitizedSignature);
            if (existsInDb) {
                console.log(`   ❌ Tx already used`);
                return { success: false, error: 'TX_ALREADY_USED', message: 'Transaction already processed' };
            }
        } catch (e) {
            console.warn('   ⚠️ DB check failed, continuing...');
        }
        
        // CRITICAL SECURITY: Verify the transaction actually sent SOL to the rake wallet
        // This prevents users from sending transactions to other addresses and still getting pebbles
        try {
            const verification = await this.solanaPaymentService.verifyNativeSOLTransfer(
                sanitizedSignature,      // Use sanitized signature
                sanitizedWallet,         // Use sanitized wallet
                this.rakeWallet,         // recipient (rake wallet) - MUST match
                expectedLamports,        // amount - MUST match
                { transactionType: 'pebble_deposit' }
            );
            
            if (!verification.success) {
                console.log(`   ❌ Verification failed: ${verification.error}`);
                return { success: false, error: verification.error, message: verification.message || 'Transaction verification failed' };
            }
            
            console.log(`   ✅ SOL transfer verified: ${sanitizedSolAmount} SOL from ${sanitizedWallet.slice(0, 8)}... to rake wallet`);
            
        } catch (error) {
            console.error(`   ❌ Verification error:`, error.message);
            return { success: false, error: 'VERIFICATION_FAILED', message: error.message };
        }
        
        // Credit pebbles - use sanitized wallet
        const creditResult = await this._creditPebbles(sanitizedWallet, expectedPebbles);
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
            solAmount: sanitizedSolAmount,
            txSignature: sanitizedSignature
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
        
        // CRITICAL SECURITY: Validate all inputs at service level
        const walletValidation = validateWalletAddress(walletAddress);
        if (!walletValidation.valid) {
            console.error(`🚨 Security: Invalid wallet address in withdrawPebbles: ${walletValidation.error}`);
            return { success: false, error: 'INVALID_WALLET', message: walletValidation.error };
        }
        
        const amountValidation = validateAmount(pebbleAmount, {
            min: MIN_WITHDRAWAL_PEBBLES,
            max: 10000000,
            allowFloat: false,
            allowZero: false
        });
        if (!amountValidation.valid) {
            console.error(`🚨 Security: Invalid pebble amount in withdrawPebbles: ${amountValidation.error}`);
            return { success: false, error: 'INVALID_AMOUNT', message: amountValidation.error };
        }
        
        // Use sanitized values
        const sanitizedWallet = walletValidation.address;
        const sanitizedPebbleAmount = amountValidation.value;
        
        console.log(`🪨 Pebble withdrawal request: ${sanitizedWallet.slice(0, 8)}... - ${sanitizedPebbleAmount} Pebbles`);
        
        // Server-side balance check (no client trust) - use sanitized wallet
        const user = await User.findOne({ walletAddress: sanitizedWallet }, 'pebbles pebbleStats');
        if (!user) {
            return { success: false, error: 'USER_NOT_FOUND', message: 'User not found' };
        }
        // Ensure pebbles is a valid number
        const userBalance = Number(user.pebbles) || 0;
        if (userBalance < sanitizedPebbleAmount) {
            return { success: false, error: 'INSUFFICIENT_PEBBLES', message: `You have ${userBalance} Pebbles, need ${sanitizedPebbleAmount}` };
        }
        
        // CRITICAL: Only allow withdrawal of pebbles that were actually purchased (deposited)
        // This prevents withdrawing gifted pebbles, which would drain the custodial wallet
        // Gifted pebbles can be spent on gacha but cannot be withdrawn to SOL
        const totalDeposited = Number(user.pebbleStats?.totalDeposited) || 0;
        const totalWithdrawn = Number(user.pebbleStats?.totalWithdrawn) || 0;
        const withdrawablePebbles = Math.max(0, totalDeposited - totalWithdrawn);
        
        if (sanitizedPebbleAmount > withdrawablePebbles) {
            const giftedAmount = userBalance - withdrawablePebbles;
            console.log(`   ⚠️ Withdrawal blocked: ${sanitizedPebbleAmount} requested, but only ${withdrawablePebbles} withdrawable (${giftedAmount} from gifts)`);
            console.log(`   📊 Stats: ${totalDeposited} deposited, ${totalWithdrawn} withdrawn, ${userBalance} current balance`);
            return { 
                success: false, 
                error: 'CANNOT_WITHDRAW_GIFTED', 
                message: `You can only withdraw pebbles you purchased. You have ${withdrawablePebbles} withdrawable pebbles (${giftedAmount} pebbles from gifts cannot be withdrawn).`,
                withdrawableAmount: withdrawablePebbles,
                giftedAmount: giftedAmount
            };
        }
        
        // Calculate amounts - use sanitized amount
        const grossSol = sanitizedPebbleAmount / PEBBLES_PER_SOL;
        const rakeAmount = Math.floor(sanitizedPebbleAmount * (WITHDRAWAL_RAKE_PERCENT / 100));
        const netPebbles = sanitizedPebbleAmount - rakeAmount;
        const netSol = netPebbles / PEBBLES_PER_SOL;
        const netLamports = Math.floor(netSol * LAMPORTS_PER_SOL);
        
        console.log(`   Gross: ${sanitizedPebbleAmount} Pebbles (${grossSol} SOL)`);
        console.log(`   Rake: ${rakeAmount} Pebbles (${WITHDRAWAL_RAKE_PERCENT}%)`);
        console.log(`   Net: ${netPebbles} Pebbles (${netSol} SOL)`);
        
        // Deduct pebbles FIRST (atomic, server authority) - use sanitized values
        const deductResult = await this._deductPebblesForWithdrawal(sanitizedWallet, sanitizedPebbleAmount, rakeAmount);
        if (!deductResult.success) {
            return { success: false, error: 'DEDUCTION_FAILED', message: 'Failed to deduct pebbles' };
        }
        
        // Check if we can process immediately
        const canProcessNow = await this._canProcessWithdrawalNow(netLamports);
        
        if (canProcessNow && this.custodialWalletService?.isReady()) {
            // Try immediate payout
            const payoutResult = await this._processImmediateWithdrawal(
                sanitizedWallet, sanitizedPebbleAmount, rakeAmount, netPebbles, netSol, netLamports, deductResult.newBalance
            );
            
            if (payoutResult.success) {
                return payoutResult;
            }
            
            // If immediate failed, queue it instead of refunding
            console.log(`   ⚠️ Immediate payout failed, queueing...`);
        }
        
        // Queue the withdrawal
        const queueResult = await this._queueWithdrawal(
            sanitizedWallet, sanitizedPebbleAmount, rakeAmount, netPebbles, netSol, netLamports.toString()
        );
        
        if (!queueResult.success) {
            // Refund if queueing failed
            await this._refundWithdrawal(sanitizedWallet, sanitizedPebbleAmount, rakeAmount);
            return { success: false, error: 'QUEUE_FAILED', message: 'Failed to queue withdrawal. Pebbles refunded.' };
        }
        
        console.log(`   📋 Queued as #${queueResult.queuePosition} (${queueResult.withdrawalId})`);
        
        return {
            success: true,
            status: 'queued',
            withdrawalId: queueResult.withdrawalId,
            queuePosition: queueResult.queuePosition,
            pebbleAmount: sanitizedPebbleAmount,
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
        
        const pending = await PebbleWithdrawal.getPendingQueue(maxToProcess, 'SOL');
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
            minWithdrawalPebbles: MIN_WITHDRAWAL_PEBBLES,
            withdrawalCurrency: 'SOL' // Withdrawals are SOL only
        };
    }
    
    static getExchangeInfo() {
        return { 
            ...PebbleService.getConfig(), 
            bundles: PebbleService.getBundles(),
            paymentMethods: [
                { id: 'SOL', name: 'Solana', rate: PEBBLES_PER_SOL, premium: 1.0 }
            ]
        };
    }
}

export default PebbleService;
export { 
    PEBBLES_PER_SOL, 
    WITHDRAWAL_RAKE_PERCENT, 
    MIN_DEPOSIT_PEBBLES, 
    MIN_WITHDRAWAL_PEBBLES 
};
