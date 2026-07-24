/**
 * EvmPaymentService - Read-only Robinhood Chain ERC-20 helpers
 * Phase 0: balance reads + transfer verification foundation for $WADDLE rail
 */

import { createPublicClient, http, parseAbi, formatUnits, isAddress, decodeEventLog } from 'viem';
import { getDefaultEvmChainId } from '../config/evm.js';
import { getPlatformToken, isEvmChainId } from '../config/tokens.js';
import { toChecksumAddress } from '../utils/evmAddress.js';

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

            return {
                valid: false,
                error: 'TRANSFER_NOT_FOUND',
                message: 'No matching ERC-20 transfer found in transaction',
            };
        } catch (error) {
            console.error('EvmPayment: verify transfer failed:', error.message);
            return { valid: false, error: 'VERIFY_FAILED', message: error.message };
        }
    }
}

const evmPaymentService = new EvmPaymentService();
export default evmPaymentService;
