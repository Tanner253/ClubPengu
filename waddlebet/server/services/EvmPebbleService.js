/**
 * EvmPebbleService — USD-pegged ETH pebbles on Robinhood Chain.
 * Credit: floor(eth * ethUsd * 1000 / solUsd) from locked quote.
 * Withdraw: inverse FX − 5% rake, same-rail only (per-chain User docs).
 */

import { parseEther, formatUnits } from 'viem';
import { User, Transaction, PebbleWithdrawal } from '../db/models/index.js';
import {
    validateWalletAddress,
    validateTransactionSignature,
    validateAmount,
} from '../utils/securityValidation.js';
import { isChainFeatureLive } from '../config/chainFeatures.js';
import { getDefaultEvmChainId } from '../config/evm.js';
import priceOracleService from './PriceOracleService.js';
import evmPaymentService from './EvmPaymentService.js';
import evmCustodialWalletService from './EvmCustodialWalletService.js';

const WITHDRAWAL_RAKE_PERCENT = 5;
const MIN_DEPOSIT_PEBBLES = 100;
const MIN_WITHDRAWAL_PEBBLES = 100;

class EvmPebbleService {
    constructor() {
        this.rakeWallet = null;
        this._configured = false;
    }

    _ensureConfigured() {
        if (this._configured) return;
        this.rakeWallet =
            process.env.EVM_RAKE_WALLET_ADDRESS
            || process.env.EVM_RAKE_WALLET
            || null;
        this._configured = true;
        console.log('🪨 EvmPebbleService configured');
        console.log(`   EVM rake wallet: ${this.rakeWallet?.slice(0, 10) || 'NOT SET'}...`);
    }

    getRakeWallet() {
        this._ensureConfigured();
        return this.rakeWallet;
    }

    _assertRail(chainId) {
        if (!isChainFeatureLive(chainId, 'pebblesRail')) {
            return {
                success: false,
                error: 'FEATURE_DISABLED',
                message: 'Pebbles on this chain are not available yet',
            };
        }
        return null;
    }

    async createQuote(walletAddress, chainId, { ethAmount, targetPebbles } = {}) {
        const gate = this._assertRail(chainId);
        if (gate) return gate;

        const walletValidation = validateWalletAddress(walletAddress, chainId);
        if (!walletValidation.valid) {
            return { success: false, error: 'INVALID_WALLET', message: walletValidation.error };
        }

        this._ensureConfigured();
        if (!this.rakeWallet) {
            return { success: false, error: 'SERVICE_NOT_CONFIGURED', message: 'EVM_RAKE_WALLET_ADDRESS not set' };
        }

        try {
            const result = await priceOracleService.createDepositQuote({
                chainId,
                walletAddress: walletValidation.address,
                ethAmount,
                targetPebbles,
            });
            if (!result.success) return result;

            return {
                success: true,
                quote: {
                    ...result.quote,
                    rakeWallet: this.rakeWallet,
                    asset: 'ETH',
                },
            };
        } catch (error) {
            console.error('🪨 EVM pebble quote failed:', error.message);
            return { success: false, error: 'ORACLE_UNAVAILABLE', message: 'Price oracle unavailable — try again' };
        }
    }

    async depositPebbles(walletAddress, txHash, quoteId, chainId) {
        const gate = this._assertRail(chainId);
        if (gate) return gate;

        this._ensureConfigured();
        if (!this.rakeWallet) {
            return { success: false, error: 'SERVICE_NOT_CONFIGURED', message: 'EVM_RAKE_WALLET_ADDRESS not set' };
        }

        const walletValidation = validateWalletAddress(walletAddress, chainId);
        if (!walletValidation.valid) {
            return { success: false, error: 'INVALID_WALLET', message: walletValidation.error };
        }

        const sigValidation = validateTransactionSignature(txHash);
        if (!sigValidation.valid || sigValidation.chain !== 'evm') {
            return { success: false, error: 'INVALID_SIGNATURE', message: 'Invalid EVM transaction hash' };
        }

        const consumed = priceOracleService.consumeQuote(quoteId, walletValidation.address);
        if (!consumed.success) return consumed;
        const quote = consumed.quote;

        if (String(quote.chainId) !== String(chainId)) {
            return { success: false, error: 'QUOTE_CHAIN_MISMATCH', message: 'Quote chain mismatch' };
        }

        const ethValidation = validateAmount(quote.ethAmount, {
            min: 0.00001,
            max: 100,
            allowFloat: true,
            allowZero: false,
        });
        if (!ethValidation.valid) {
            return { success: false, error: 'INVALID_AMOUNT', message: ethValidation.error };
        }

        const expectedPebbles = quote.pebbles;
        if (expectedPebbles < MIN_DEPOSIT_PEBBLES) {
            return { success: false, error: 'BELOW_MINIMUM', message: `Min ${MIN_DEPOSIT_PEBBLES} Pebbles` };
        }

        console.log(`🪨 EVM pebble deposit: ${walletValidation.address.slice(0, 10)}... quote=${quoteId.slice(0, 12)}`);
        console.log(`   Expected: ${quote.ethAmount} ETH → ${expectedPebbles} pebbles`);

        const verification = await evmPaymentService.verifyNativeEthTransfer(sigValidation.signature, {
            expectedSender: walletValidation.address,
            expectedRecipient: this.rakeWallet,
            expectedEthAmount: quote.ethAmount,
            chainId,
            transactionType: 'pebble_deposit',
        });

        if (!verification.success) {
            return {
                success: false,
                error: verification.error,
                message: verification.message || 'ETH transfer verification failed',
            };
        }

        const creditResult = await this._creditPebbles(walletValidation.address, chainId, expectedPebbles);
        if (!creditResult.success) return creditResult;

        try {
            await Transaction.record({
                type: 'pebble_deposit',
                toWallet: walletValidation.address,
                amount: expectedPebbles,
                currency: 'pebbles',
                toBalanceAfter: creditResult.newBalance,
                relatedData: {
                    ethTxHash: sigValidation.signature,
                    ethAmount: quote.ethAmount,
                    quoteId,
                    solUsd: quote.solUsd,
                    ethUsd: quote.ethUsd,
                    chainId: String(chainId),
                },
                reason: `Deposited ${quote.ethAmount} ETH for ${expectedPebbles} Pebbles (USD-pegged)`,
            });
        } catch (e) {
            console.warn('   ⚠️ Failed to log EVM pebble deposit:', e.message);
        }

        return {
            success: true,
            pebblesReceived: expectedPebbles,
            newBalance: creditResult.newBalance,
            ethAmount: quote.ethAmount,
            usdValue: quote.usdValue,
            txHash: sigValidation.signature,
            asset: 'ETH',
        };
    }

    async withdrawPebbles(walletAddress, pebbleAmount, chainId) {
        const gate = this._assertRail(chainId);
        if (gate) return gate;

        const walletValidation = validateWalletAddress(walletAddress, chainId);
        if (!walletValidation.valid) {
            return { success: false, error: 'INVALID_WALLET', message: walletValidation.error };
        }

        const amountValidation = validateAmount(pebbleAmount, {
            min: MIN_WITHDRAWAL_PEBBLES,
            max: 10000000,
            allowFloat: false,
            allowZero: false,
        });
        if (!amountValidation.valid) {
            return { success: false, error: 'INVALID_AMOUNT', message: amountValidation.error };
        }

        const sanitizedWallet = walletValidation.address;
        const sanitizedPebbleAmount = amountValidation.value;
        const resolvedChain = String(chainId || getDefaultEvmChainId());

        console.log(`🪨 EVM pebble withdraw: ${sanitizedWallet.slice(0, 10)}... ${sanitizedPebbleAmount} pebbles`);

        let prices;
        try {
            prices = await priceOracleService.requireFreshPrices();
        } catch (error) {
            return { success: false, error: 'ORACLE_UNAVAILABLE', message: 'Price oracle unavailable — try again' };
        }

        const user = await User.findOne(
            { walletAddress: sanitizedWallet, chainId: resolvedChain },
            'pebbles pebbleStats'
        );
        if (!user) {
            return { success: false, error: 'USER_NOT_FOUND', message: 'User not found' };
        }

        const userBalance = Number(user.pebbles) || 0;
        if (userBalance < sanitizedPebbleAmount) {
            return {
                success: false,
                error: 'INSUFFICIENT_PEBBLES',
                message: `You have ${userBalance} Pebbles, need ${sanitizedPebbleAmount}`,
            };
        }

        const totalDeposited = Number(user.pebbleStats?.totalDeposited) || 0;
        const totalWithdrawn = Number(user.pebbleStats?.totalWithdrawn) || 0;
        const withdrawablePebbles = Math.max(0, totalDeposited - totalWithdrawn);
        if (sanitizedPebbleAmount > withdrawablePebbles) {
            return {
                success: false,
                error: 'CANNOT_WITHDRAW_GIFTED',
                message: `You can only withdraw pebbles you purchased. Withdrawable: ${withdrawablePebbles}.`,
                withdrawableAmount: withdrawablePebbles,
            };
        }

        const rakeAmount = Math.floor(sanitizedPebbleAmount * (WITHDRAWAL_RAKE_PERCENT / 100));
        const netPebbles = sanitizedPebbleAmount - rakeAmount;
        const netEth = priceOracleService.pebblesToEth(netPebbles, prices);
        const grossEth = priceOracleService.pebblesToEth(sanitizedPebbleAmount, prices);

        let netWei;
        try {
            netWei = parseEther(netEth.toFixed(18));
        } catch {
            return { success: false, error: 'AMOUNT_TOO_SMALL', message: 'Withdrawal amount too small' };
        }
        if (netWei <= 0n) {
            return { success: false, error: 'AMOUNT_TOO_SMALL', message: 'Withdrawal amount too small' };
        }

        const deductResult = await this._deductPebblesForWithdrawal(
            sanitizedWallet,
            resolvedChain,
            sanitizedPebbleAmount,
            rakeAmount
        );
        if (!deductResult.success) {
            return { success: false, error: 'DEDUCTION_FAILED', message: 'Failed to deduct pebbles' };
        }

        const canInstant = await this._canProcessNow(netWei, resolvedChain);
        if (canInstant && evmCustodialWalletService.isReady()) {
            const payout = await evmCustodialWalletService.sendNativeEth(
                sanitizedWallet,
                netWei,
                resolvedChain,
                `pebble_withdrawal_${Date.now()}`
            );
            if (payout.success) {
                try {
                    await Transaction.record({
                        type: 'pebble_withdrawal',
                        fromWallet: sanitizedWallet,
                        amount: sanitizedPebbleAmount,
                        currency: 'pebbles',
                        fromBalanceAfter: deductResult.newBalance,
                        relatedData: {
                            ethTxHash: payout.txId,
                            ethAmount: netEth,
                            rakeAmount,
                            chainId: resolvedChain,
                            solUsd: prices.solUsd,
                            ethUsd: prices.ethUsd,
                        },
                        reason: `Withdrew ${sanitizedPebbleAmount} Pebbles → ${netEth.toFixed(6)} ETH`,
                    });
                } catch (e) {
                    console.warn('   ⚠️ Failed to log EVM pebble withdrawal:', e.message);
                }

                return {
                    success: true,
                    status: 'completed',
                    pebbleAmount: sanitizedPebbleAmount,
                    rakeAmount,
                    netPebbles,
                    ethReceived: netEth,
                    solReceived: netEth, // client compat field name
                    asset: 'ETH',
                    rakePercent: WITHDRAWAL_RAKE_PERCENT,
                    newBalance: deductResult.newBalance,
                    txSignature: payout.txId,
                    usdValue: netPebbles * prices.pebbleUsd,
                };
            }
            console.log('   ⚠️ Immediate EVM payout failed, queueing...');
        }

        const queueResult = await PebbleWithdrawal.createRequest({
            walletAddress: sanitizedWallet,
            pebbleAmount: sanitizedPebbleAmount,
            rakeAmount,
            netPebbles,
            solAmount: netEth,
            lamports: netWei.toString(),
            chainId: resolvedChain,
            asset: 'ETH',
        }).then((w) => ({
            success: true,
            withdrawalId: w.withdrawalId,
            queuePosition: w.queuePosition,
        })).catch((error) => {
            console.error('   ❌ EVM queue error:', error.message);
            return { success: false };
        });

        if (!queueResult.success) {
            await this._refundWithdrawal(sanitizedWallet, resolvedChain, sanitizedPebbleAmount, rakeAmount);
            return { success: false, error: 'QUEUE_FAILED', message: 'Failed to queue withdrawal. Pebbles refunded.' };
        }

        return {
            success: true,
            status: 'queued',
            withdrawalId: queueResult.withdrawalId,
            queuePosition: queueResult.queuePosition,
            pebbleAmount: sanitizedPebbleAmount,
            rakeAmount,
            netPebbles,
            ethToReceive: netEth,
            solToReceive: netEth,
            asset: 'ETH',
            newBalance: deductResult.newBalance,
            message: `Withdrawal queued at #${queueResult.queuePosition}. You'll receive ~${netEth.toFixed(6)} ETH when funds are available.`,
            usdValue: grossEth * prices.ethUsd * (1 - WITHDRAWAL_RAKE_PERCENT / 100),
        };
    }

    async processEthWithdrawalQueue(maxToProcess = 5) {
        if (!evmCustodialWalletService.isReady()) {
            return { processed: 0, failed: 0 };
        }

        const pending = await PebbleWithdrawal.find({
            status: 'pending',
            asset: 'ETH',
        }).sort({ queuePosition: 1 }).limit(maxToProcess);

        let processed = 0;
        let failed = 0;

        for (const withdrawal of pending) {
            const wei = BigInt(withdrawal.lamports);
            const canAfford = await this._canProcessNow(wei, withdrawal.chainId || getDefaultEvmChainId());
            if (!canAfford) break;

            await PebbleWithdrawal.markProcessing(withdrawal.withdrawalId);
            const sendResult = await evmCustodialWalletService.sendNativeEth(
                withdrawal.walletAddress,
                wei,
                withdrawal.chainId || getDefaultEvmChainId(),
                `pebble_withdrawal_${withdrawal.withdrawalId}`
            );

            if (sendResult.success) {
                await PebbleWithdrawal.markCompleted(withdrawal.withdrawalId, sendResult.txId);
                processed += 1;
            } else {
                await PebbleWithdrawal.markFailed(withdrawal.withdrawalId, sendResult.error);
                failed += 1;
            }
        }

        return { processed, failed };
    }

    async _canProcessNow(weiNeeded, chainId) {
        if (!evmCustodialWalletService.isReady()) return false;
        const bal = await evmCustodialWalletService.getNativeBalance(chainId);
        if (!bal.success) return false;
        const have = BigInt(bal.balance);
        const buffer = 1_000_000_000_000_000n; // 0.001 ETH
        return have >= weiNeeded + buffer;
    }

    async _creditPebbles(walletAddress, chainId, amount) {
        const result = await User.findOneAndUpdate(
            { walletAddress, chainId: String(chainId) },
            {
                $inc: { pebbles: amount, 'pebbleStats.totalDeposited': amount },
                $set: { 'pebbleStats.lastDepositAt': new Date() },
            },
            { new: true, select: 'pebbles' }
        );
        if (!result) return { success: false, error: 'USER_NOT_FOUND' };
        return { success: true, newBalance: result.pebbles };
    }

    async _deductPebblesForWithdrawal(walletAddress, chainId, pebbleAmount, rakeAmount) {
        const result = await User.findOneAndUpdate(
            {
                walletAddress,
                chainId: String(chainId),
                pebbles: { $gte: pebbleAmount },
            },
            {
                $inc: {
                    pebbles: -pebbleAmount,
                    'pebbleStats.totalWithdrawn': pebbleAmount,
                },
                $set: { 'pebbleStats.lastWithdrawalAt': new Date() },
            },
            { new: true, select: 'pebbles' }
        );
        if (!result) return { success: false, error: 'DEDUCTION_FAILED' };
        return { success: true, newBalance: result.pebbles, rakeAmount };
    }

    async _refundWithdrawal(walletAddress, chainId, pebbleAmount, _rakeAmount) {
        await User.findOneAndUpdate(
            { walletAddress, chainId: String(chainId) },
            {
                $inc: {
                    pebbles: pebbleAmount,
                    'pebbleStats.totalWithdrawn': -pebbleAmount,
                },
            }
        );
    }
}

const evmPebbleService = new EvmPebbleService();
export default evmPebbleService;
export { WITHDRAWAL_RAKE_PERCENT, MIN_DEPOSIT_PEBBLES, MIN_WITHDRAWAL_PEBBLES };
