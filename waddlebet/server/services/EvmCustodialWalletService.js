/**
 * EvmCustodialWalletService - Custodial ERC-20 payouts on Robinhood Chain
 * Used for daily bonus $WADDLE rewards and future EVM rails.
 */

import {
    createPublicClient,
    createWalletClient,
    http,
    parseAbi,
    formatUnits,
    isAddress,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getDefaultEvmChainId } from '../config/evm.js';
import { isEvmChainId, getPlatformTokenAddress } from '../config/tokens.js';
import { toChecksumAddress } from '../utils/evmAddress.js';

const ERC20_ABI = parseAbi([
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function transfer(address to, uint256 amount) returns (bool)',
]);

const MAINNET_RPC = 'https://rpc.mainnet.chain.robinhood.com';
const TESTNET_RPC = 'https://rpc.testnet.chain.robinhood.com';

const MAX_SINGLE_PAYOUT_RAW = BigInt(
    process.env.EVM_CUSTODIAL_MAX_SINGLE_PAYOUT || '1000000000000000000000000'
);

const MIN_NATIVE_BALANCE_WEI = BigInt(
    process.env.EVM_CUSTODIAL_MIN_ETH_WEI || '1000000000000000'
); // 0.001 ETH

let _account = null;
let _publicAddress = null;

class EvmCustodialWalletService {
    constructor() {
        this.initialized = false;
        this._publicClients = new Map();
        this._walletClients = new Map();
        this._decimalsCache = new Map();
        console.log('🔐 EvmCustodialWalletService created (not yet initialized)');
    }

    toJSON() {
        return {
            type: 'EvmCustodialWalletService',
            initialized: this.initialized,
            ready: this.isReady(),
            publicKey: this.getPublicKeyMasked(),
        };
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

    _getChainConfig(chainId) {
        const id = this._resolveChainId(chainId);
        return {
            id,
            name: id === 46630 ? 'Robinhood Chain Testnet' : 'Robinhood Chain',
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        };
    }

    _getPublicClient(chainId) {
        const id = this._resolveChainId(chainId);
        if (!this._publicClients.has(id)) {
            this._publicClients.set(
                id,
                createPublicClient({
                    chain: this._getChainConfig(chainId),
                    transport: http(this._getRpcUrl(chainId)),
                })
            );
        }
        return this._publicClients.get(id);
    }

    _getWalletClient(chainId) {
        if (!_account) return null;
        const id = this._resolveChainId(chainId);
        if (!this._walletClients.has(id)) {
            this._walletClients.set(
                id,
                createWalletClient({
                    account: _account,
                    chain: this._getChainConfig(chainId),
                    transport: http(this._getRpcUrl(chainId)),
                })
            );
        }
        return this._walletClients.get(id);
    }

    async initialize() {
        if (this.initialized) {
            return { success: true };
        }

        const privateKeyEnv = process.env.EVM_CUSTODIAL_WALLET_PRIVATE_KEY;
        if (process.env.EVM_CUSTODIAL_WALLET_PRIVATE_KEY) {
            delete process.env.EVM_CUSTODIAL_WALLET_PRIVATE_KEY;
        }

        if (!privateKeyEnv) {
            console.warn('⚠️ EVM custodial wallet private key not configured — $WADDLE payouts disabled');
            return { success: false, error: 'NO_PRIVATE_KEY' };
        }

        try {
            const normalizedKey = privateKeyEnv.startsWith('0x')
                ? privateKeyEnv
                : `0x${privateKeyEnv}`;
            _account = privateKeyToAccount(normalizedKey);
            _publicAddress = toChecksumAddress(_account.address);
        } catch {
            console.error('🚨 Failed to parse EVM custodial wallet key — use 0x-prefixed hex');
            return { success: false, error: 'INVALID_KEY_FORMAT' };
        }

        try {
            const chainId = getDefaultEvmChainId();
            const client = this._getPublicClient(chainId);
            const nativeBalance = await client.getBalance({ address: _publicAddress });

            this.initialized = true;
            const masked = `${_publicAddress.slice(0, 6)}...${_publicAddress.slice(-4)}`;
            const tokenAddress = getPlatformTokenAddress(chainId);
            console.log('🔐 EvmCustodialWalletService initialized');
            console.log(`   Wallet: ${masked}`);
            console.log(`   Chain ID: ${chainId}`);
            console.log(`   Native balance: ${formatUnits(nativeBalance, 18)} ETH`);
            console.log(`   Token: ${tokenAddress}`);

            const tokenBalance = await this.getTokenBalance(tokenAddress, chainId);
            if (tokenBalance.success) {
                console.log(`   Token balance: ${tokenBalance.uiBalance?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? tokenBalance.balance}`);
            } else {
                console.warn(`   Token balance check failed: ${tokenBalance.error}`);
            }
        } catch (error) {
            console.error('🚨 EvmCustodialWalletService RPC check failed:', error.message);
            return { success: false, error: 'RPC_UNAVAILABLE' };
        }

        return { success: true };
    }

    isReady() {
        return this.initialized && _account != null;
    }

    getPublicKeyMasked() {
        if (!_publicAddress) return null;
        return `${_publicAddress.slice(0, 6)}...${_publicAddress.slice(-4)}`;
    }

    getPublicAddress() {
        return _publicAddress;
    }

    async getTokenDecimals(tokenAddress, chainId) {
        const checksum = toChecksumAddress(tokenAddress);
        const cacheKey = `${this._resolveChainId(chainId)}:${checksum.toLowerCase()}`;
        if (this._decimalsCache.has(cacheKey)) {
            return this._decimalsCache.get(cacheKey);
        }

        try {
            const client = this._getPublicClient(chainId);
            const decimals = await client.readContract({
                address: checksum,
                abi: ERC20_ABI,
                functionName: 'decimals',
            });
            this._decimalsCache.set(cacheKey, decimals);
            return decimals;
        } catch {
            return 18;
        }
    }

    async getTokenBalance(tokenAddress, chainId) {
        if (!this.isReady()) {
            return { success: false, error: 'SERVICE_NOT_READY' };
        }

        if (!isAddress(tokenAddress)) {
            return { success: false, error: 'INVALID_TOKEN' };
        }

        try {
            const client = this._getPublicClient(chainId);
            const token = toChecksumAddress(tokenAddress);
            const raw = await client.readContract({
                address: token,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [_publicAddress],
            });
            const decimals = await this.getTokenDecimals(token, chainId);
            return {
                success: true,
                balance: raw.toString(),
                uiBalance: parseFloat(formatUnits(raw, decimals)),
            };
        } catch {
            return { success: false, error: 'BALANCE_CHECK_FAILED' };
        }
    }

    /**
     * Send ERC-20 tokens from custodial wallet to recipient.
     * @returns {Promise<{success: boolean, txId?: string, error?: string}>}
     */
    async sendTokenPayout(recipientWallet, tokenAddress, amountRaw, chainId, memo) {
        if (!this.isReady()) {
            return { success: false, error: 'SERVICE_NOT_READY' };
        }

        if (!isAddress(recipientWallet) || !isAddress(tokenAddress)) {
            return { success: false, error: 'INVALID_ADDRESS' };
        }

        const amount = BigInt(amountRaw);
        if (amount <= 0n) {
            return { success: false, error: 'INVALID_AMOUNT' };
        }

        if (amount > MAX_SINGLE_PAYOUT_RAW) {
            console.error('🚨 EVM payout exceeds max single payout cap');
            return { success: false, error: 'AMOUNT_EXCEEDS_LIMIT' };
        }

        const walletClient = this._getWalletClient(chainId);
        const publicClient = this._getPublicClient(chainId);
        if (!walletClient || !publicClient) {
            return { success: false, error: 'SERVICE_NOT_READY' };
        }

        const recipient = toChecksumAddress(recipientWallet);
        const token = toChecksumAddress(tokenAddress);

        let txHash = null;

        try {
            const nativeBalance = await publicClient.getBalance({ address: _publicAddress });
            if (nativeBalance < MIN_NATIVE_BALANCE_WEI) {
                console.error(
                    `🚨 EVM custodial wallet ETH too low for payout (${formatUnits(nativeBalance, 18)} ETH)`
                );
                return { success: false, error: 'INSUFFICIENT_ETH_FOR_FEES' };
            }

            const tokenBalance = await publicClient.readContract({
                address: token,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [_publicAddress],
            });

            if (tokenBalance < amount) {
                console.error('🚨 EVM custodial wallet token balance too low');
                return { success: false, error: 'INSUFFICIENT_BALANCE' };
            }

            console.log(`   📤 EVM payout (${memo || 'payout'}): ${amount.toString()} raw → ${recipient.slice(0, 10)}...`);

            txHash = await walletClient.writeContract({
                address: token,
                abi: ERC20_ABI,
                functionName: 'transfer',
                args: [recipient, amount],
            });

            console.log(`   📤 Broadcast: ${txHash.slice(0, 18)}...`);

            const receipt = await publicClient.waitForTransactionReceipt({
                hash: txHash,
                confirmations: 1,
            });

            if (receipt.status !== 'success') {
                return { success: false, error: 'TRANSACTION_FAILED', txId: txHash };
            }

            console.log('   ✅ EVM payout confirmed');
            return { success: true, txId: txHash };
        } catch (error) {
            console.error('🚨 EVM payout failed:', error.message?.slice(0, 120));
            if (txHash) {
                return { success: false, error: 'CONFIRMATION_UNCERTAIN', txId: txHash };
            }
            return { success: false, error: 'TRANSACTION_FAILED' };
        }
    }
}

const evmCustodialWalletService = new EvmCustodialWalletService();
export default evmCustodialWalletService;
