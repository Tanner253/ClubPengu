/**
 * Server-authoritative platform token balance → Diamond Flippers nametag tier.
 * Solana: $CP SPL · Robinhood EVM: $WADDLE ERC-20
 */

import { getTierFromBalance } from '../../src/config/whaleNametagTiers.js';
import { getPlatformToken, isEvmChainId } from '../config/tokens.js';
import solanaPaymentService from './SolanaPaymentService.js';
import evmPaymentService from './EvmPaymentService.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const balanceCache = new Map();

function cacheKey(walletAddress, chainId) {
    return `${chainId || 'solana'}:${walletAddress.toLowerCase()}`;
}

class NametagTierService {
    async refreshPlayerTier(player, { force = false } = {}) {
        if (!player?.walletAddress) {
            player.cpBalance = 0;
            player.cpNametagTier = 'standard';
            return { balance: 0, tier: 'standard' };
        }

        const wallet = player.walletAddress;
        const chainId = player.chainId || 'solana';
        const key = cacheKey(wallet, chainId);
        const cached = balanceCache.get(key);

        if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
            player.cpBalance = cached.balance;
            player.cpNametagTier = cached.tier;
            return cached;
        }

        let balance = 0;
        try {
            const token = getPlatformToken(chainId);
            if (isEvmChainId(chainId)) {
                balance = await evmPaymentService.getTokenBalance(wallet, token.address, chainId);
            } else {
                balance = await solanaPaymentService.getTokenBalance(wallet, token.address);
            }
        } catch (err) {
            console.warn(`💎 Nametag tier balance check failed for ${wallet.slice(0, 8)} (${chainId}):`, err.message);
            if (cached) {
                player.cpBalance = cached.balance;
                player.cpNametagTier = cached.tier;
                return cached;
            }
        }

        const tier = getTierFromBalance(balance);
        const entry = { balance, tier, at: Date.now() };
        balanceCache.set(key, entry);
        player.cpBalance = balance;
        player.cpNametagTier = tier;
        return entry;
    }

    clearCache(walletAddress, chainId = 'solana') {
        if (walletAddress) balanceCache.delete(cacheKey(walletAddress, chainId));
    }
}

const nametagTierService = new NametagTierService();
export default nametagTierService;
