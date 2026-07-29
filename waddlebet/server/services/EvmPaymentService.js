/**
 * EvmPaymentService - Read-only Robinhood Chain ERC-20 helpers
 * Phase 0: balance reads + transfer verification foundation for $WADDLE rail
 */

import { createPublicClient, http, parseAbi, formatUnits, parseEther, isAddress, decodeEventLog } from 'viem';
import { getDefaultEvmChainId } from '../config/evm.js';
import { getPlatformToken, isEvmChainId } from '../config/tokens.js';
import { toChecksumAddress } from '../utils/evmAddress.js';
import EvmTransaction from '../db/models/EvmTransaction.js';
import rateLimiter from '../utils/RateLimiter.js';

/** Wei tolerance for native ETH deposits (~0.00001 ETH) */
const NATIVE_ETH_WEI_TOLERANCE = 10_000_000_000_000n;

const ERC20_ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

const MAINNET_RPC = 'https://rpc.mainnet.chain.robinhood.com';
const TESTNET_RPC = 'https://rpc.testnet.chain.robinhood.com';

class EvmPaymentService {
    constructor() {
        this._clients = new Map();
        this._decimalsCache = new Map();
        this.recentTxHashes = new Set();
    }

    _resolveChainId(chainId) {
        if (isEvmChainId(chainId)) {
            return parseInt(chainId, 10);
        }
        return getDefaultEvmChainId();
    }

    _getRpcUrl(chainId) {
        const id = this._resolveChainId(chainId);
        if (id === 46630) {
            return process.env.EVM_RPC_URL_TESTNET || TESTNET_RPC;
        }
        return process.env.EVM_RPC_URL || MAINNET_RPC;
    }

    _getClient(chainId) {
        const id = this._resolveChainId(chainId);
        if (!this._clients.has(id)) {
            this._clients.set(
                id,
                createPublicClient({
                    chain: {
                        id,
                        name: id === 46630 ? 'Robinhood Chain Testnet' : 'Robinhood Chain',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                    },
                    transport: http(this._getRpcUrl(id)),
                })
            );
        }
        return this._clients.get(id);
    }

    async getTokenDecimals(tokenAddress, chainId) {
        const checksum = toChecksumAddress(tokenAddress);
        const cacheKey = `${this._resolveChainId(chainId)}:${checksum.toLowerCase()}`;
        if (this._decimalsCache.has(cacheKey)) {
            return this._decimalsCache.get(cacheKey);
        }

        const configured = getPlatformToken(chainId).decimals;
        try {
            const client = this._getClient(chainId);
            const decimals = await client.readContract({
                address: checksum,
                abi: ERC20_ABI,
                functionName: 'decimals',
            });
            this._decimalsCache.set(cacheKey, decimals);
            return decimals;
        } catch (error) {
            console.warn(`EvmPayment: decimals() failed for ${checksum.slice(0, 10)}..., using ${configured}:`, error.message);
            return configured;
        }
    }

    async getTokenBalance(walletAddress, tokenAddress, chainId) {
        if (!isAddress(walletAddress) || !isAddress(tokenAddress)) {
            return 0;
        }

        try {
            const client = this._getClient(chainId);
            const wallet = toChecksumAddress(walletAddress);
            const token = toChecksumAddress(tokenAddress);
            const raw = await client.readContract({
                address: token,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [wallet],
            });
            const decimals = await this.getTokenDecimals(token, chainId);
            return parseFloat(formatUnits(raw, decimals));
        } catch (error) {
            console.error('EvmPayment: balance check failed:', error.message);
            return 0;
        }
    }

    async getPlatformTokenBalance(walletAddress, chainId) {
        const token = getPlatformToken(chainId);
        return this.getTokenBalance(walletAddress, token.address, chainId);
    }

    async checkMinimumBalance(walletAddress, tokenAddress, minimumBalance, chainId) {
        const balance = await this.getTokenBalance(walletAddress, tokenAddress, chainId);
        return {
            hasBalance: balance >= minimumBalance,
            balance,
        };
    }

    /**
     * Verify an ERC-20 transfer on Robinhood Chain.
     * Checks tx success, token contract, sender/recipient, and minimum amount.
     */
    async verifyErc20Transfer(txHash, {
        expectedSender,
        expectedRecipient,
        tokenAddress,
        minimumAmount,
        chainId,
    }) {
        if (!txHash || typeof txHash !== 'string') {
            return { valid: false, error: 'INVALID_TX_HASH', message: 'Missing transaction hash' };
        }

        try {
            const client = this._getClient(chainId);
            const receipt = await client.getTransactionReceipt({ hash: txHash });

            if (!receipt || receipt.status !== 'success') {
                return { valid: false, error: 'TX_FAILED', message: 'Transaction not confirmed or failed' };
            }

            const token = toChecksumAddress(tokenAddress);
            const sender = toChecksumAddress(expectedSender);
            const recipient = toChecksumAddress(expectedRecipient);
            const decimals = await this.getTokenDecimals(token, chainId);
            const minRaw = BigInt(Math.floor(minimumAmount * 10 ** decimals));

            for (const log of receipt.logs) {
                if (log.address.toLowerCase() !== token.toLowerCase()) continue;

                let decoded;
                try {
                    decoded = decodeEventLog({
                        abi: ERC20_ABI,
                        data: log.data,
                        topics: log.topics,
                    });
                } catch {
                    continue;
                }

                if (decoded.eventName !== 'Transfer') continue;

                const { from, to, value } = decoded.args;
                if (from.toLowerCase() !== sender.toLowerCase()) continue;
                if (to.toLowerCase() !== recipient.toLowerCase()) continue;
                if (value < minRaw) continue;

                return {
                    valid: true,
                    amount: parseFloat(formatUnits(value, decimals)),
                    from,
                    to,
                    tokenAddress: token,
                    txHash,
                };
            }

            console.error(
                `EvmPayment: TRANSFER_NOT_FOUND tx=${txHash?.slice(0, 12)}... ` +
                `token=${token.slice(0, 10)}... to=${recipient.slice(0, 10)}... ` +
                `from=${sender.slice(0, 10)}... minAmount=${minimumAmount}`
            );
            return {
                valid: false,
                error: 'TRANSFER_NOT_FOUND',
                message:
                    `No matching ERC-20 transfer found. Expected ${minimumAmount} tokens ` +
                    `of ${token.slice(0, 10)}… to ${recipient.slice(0, 10)}…. ` +
                    `Check that the client and server use the same WADDLE token address.`,
            };
        } catch (error) {
            console.error('EvmPayment: verify transfer failed:', error.message);
            return { valid: false, error: 'VERIFY_FAILED', message: error.message };
        }
    }

    async verifyTransaction(txHash, expectedSender, expectedRecipient, expectedToken, expectedAmount, options = {}) {
        const chainId = options.chainId ?? getDefaultEvmChainId();

        if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
            return { success: false, error: 'INVALID_TX_HASH', message: 'Invalid transaction hash' };
        }

        const rateCheck = rateLimiter.check('payment', expectedSender);
        if (!rateCheck.allowed) {
            return {
                success: false,
                error: 'RATE_LIMITED',
                message: 'Too many payment attempts. Please wait.',
                retryAfterMs: rateCheck.retryAfterMs,
            };
        }

        if (this.recentTxHashes.has(txHash)) {
            return {
                success: false,
                error: 'TX_ALREADY_USED',
                message: 'This transaction has already been used for a payment',
            };
        }

        try {
            const existsInDb = await EvmTransaction.isTxHashUsed(txHash);
            if (existsInDb) {
                this.recentTxHashes.add(txHash);
                return {
                    success: false,
                    error: 'TX_ALREADY_USED',
                    message: 'This transaction has already been used for a payment',
                };
            }
        } catch (dbError) {
            console.error('EvmPayment: DB replay check failed:', dbError.message);
        }

        const startTime = Date.now();
        const verification = await this.verifyErc20Transfer(txHash, {
            expectedSender,
            expectedRecipient,
            tokenAddress: expectedToken,
            minimumAmount: expectedAmount,
            chainId,
        });

        if (!verification.valid) {
            console.error(
                `EvmPayment: verifyTransaction failed (${verification.error}) ` +
                `tx=${txHash.slice(0, 12)}... expectedToken=${String(expectedToken).slice(0, 10)}... ` +
                `expectedAmount=${expectedAmount} recipient=${String(expectedRecipient).slice(0, 10)}...`
            );
            return {
                success: false,
                error: verification.error || 'VERIFY_FAILED',
                message: verification.message || 'Transaction verification failed',
            };
        }

        const decimals = await this.getTokenDecimals(expectedToken, chainId);
        const amountRaw = BigInt(Math.floor(verification.amount * 10 ** decimals)).toString();

        try {
            await EvmTransaction.recordTransaction({
                txHash,
                chainId: String(chainId),
                type: options.transactionType || 'other',
                senderWallet: expectedSender,
                recipientWallet: expectedRecipient,
                amount: verification.amount,
                amountRaw,
                tokenAddress: expectedToken,
                tokenSymbol: options.tokenSymbol || getPlatformToken(chainId).displaySymbol,
                iglooId: options.iglooId,
                matchId: options.matchId,
                status: 'verified',
                processingTimeMs: Date.now() - startTime,
            });
            this.recentTxHashes.add(txHash);
        } catch (recordError) {
            if (recordError.code === 11000) {
                return {
                    success: false,
                    error: 'TX_ALREADY_USED',
                    message: 'This transaction has already been used for a payment',
                };
            }
            console.error('EvmPayment: failed to record transaction:', recordError.message);
        }

        return {
            success: true,
            transactionHash: txHash,
            amount: verification.amount,
        };
    }

    /**
     * Verify a native ETH transfer (pebble deposits).
     */
    async verifyNativeEthTransfer(txHash, {
        expectedSender,
        expectedRecipient,
        expectedEthAmount,
        chainId,
        transactionType = 'pebble_deposit',
    }) {
        if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
            return { success: false, error: 'INVALID_TX_HASH', message: 'Invalid transaction hash' };
        }

        const rateCheck = rateLimiter.check('payment', expectedSender);
        if (!rateCheck.allowed) {
            return {
                success: false,
                error: 'RATE_LIMITED',
                message: 'Too many payment attempts. Please wait.',
                retryAfterMs: rateCheck.retryAfterMs,
            };
        }

        if (this.recentTxHashes.has(txHash)) {
            return {
                success: false,
                error: 'TX_ALREADY_USED',
                message: 'This transaction has already been used for a payment',
            };
        }

        try {
            const existsInDb = await EvmTransaction.isTxHashUsed(txHash);
            if (existsInDb) {
                this.recentTxHashes.add(txHash);
                return {
                    success: false,
                    error: 'TX_ALREADY_USED',
                    message: 'This transaction has already been used for a payment',
                };
            }
        } catch (dbError) {
            console.error('EvmPayment: DB replay check failed:', dbError.message);
        }

        const startTime = Date.now();
        try {
            const client = this._getClient(chainId);
            const receipt = await client.getTransactionReceipt({ hash: txHash });
            if (!receipt || receipt.status !== 'success') {
                return { success: false, error: 'TX_FAILED', message: 'Transaction not confirmed or failed' };
            }

            const tx = await client.getTransaction({ hash: txHash });
            if (!tx) {
                return { success: false, error: 'TX_NOT_FOUND', message: 'Transaction not found' };
            }

            const sender = toChecksumAddress(expectedSender);
            const recipient = toChecksumAddress(expectedRecipient);
            if (tx.from.toLowerCase() !== sender.toLowerCase()) {
                return { success: false, error: 'SENDER_MISMATCH', message: 'Transaction sender mismatch' };
            }
            if (!tx.to || tx.to.toLowerCase() !== recipient.toLowerCase()) {
                return { success: false, error: 'RECIPIENT_MISMATCH', message: 'ETH must be sent to the rake wallet' };
            }

            const expectedWei = parseEther(String(expectedEthAmount));
            const actualWei = tx.value ?? 0n;
            if (actualWei + NATIVE_ETH_WEI_TOLERANCE < expectedWei) {
                return {
                    success: false,
                    error: 'AMOUNT_TOO_LOW',
                    message: `Expected ≥ ${expectedEthAmount} ETH`,
                };
            }

            const amountEth = parseFloat(formatUnits(actualWei, 18));

            try {
                await EvmTransaction.recordTransaction({
                    txHash,
                    chainId: String(this._resolveChainId(chainId)),
                    type: transactionType,
                    senderWallet: sender,
                    recipientWallet: recipient,
                    amount: amountEth,
                    amountRaw: actualWei.toString(),
                    tokenAddress: null,
                    tokenSymbol: 'ETH',
                    isNative: true,
                    status: 'verified',
                    processingTimeMs: Date.now() - startTime,
                });
                this.recentTxHashes.add(txHash);
            } catch (recordError) {
                if (recordError.code === 11000) {
                    return {
                        success: false,
                        error: 'TX_ALREADY_USED',
                        message: 'This transaction has already been used for a payment',
                    };
                }
                console.error('EvmPayment: failed to record native ETH tx:', recordError.message);
            }

            return {
                success: true,
                transactionHash: txHash,
                amount: amountEth,
            };
        } catch (error) {
            console.error('EvmPayment: verify native ETH failed:', error.message);
            return { success: false, error: 'VERIFY_FAILED', message: error.message };
        }
    }

    async verifyRentPayment(txHash, expectedSender, expectedRecipient, expectedAmount, options = {}) {
        const chainId = options.chainId ?? getDefaultEvmChainId();
        const tokenAddress = options.tokenAddress || getPlatformToken(chainId).address;

        if (!expectedRecipient) {
            return {
                success: false,
                error: 'CONFIG_ERROR',
                message: 'EVM rent treasury wallet not configured',
            };
        }

        return this.verifyTransaction(
            txHash,
            expectedSender,
            expectedRecipient,
            tokenAddress,
            expectedAmount,
            {
                chainId,
                transactionType: options.isRenewal ? 'igloo_rent_renewal' : 'igloo_rent',
                tokenSymbol: options.tokenSymbol || getPlatformToken(chainId).displaySymbol,
                iglooId: options.iglooId,
                ipAddress: options.ipAddress,
            }
        );
    }
}

const evmPaymentService = new EvmPaymentService();
export default evmPaymentService;
