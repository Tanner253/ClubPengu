/**
 * Server-authoritative $CP balance → Diamond Flippers nametag tier.
 * Cached to limit Solana RPC calls.
 */

import { getTierFromBalance } from '../../src/config/whaleNametagTiers.js';
import solanaPaymentService from './SolanaPaymentService.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const balanceCache = new Map();

function getCpTokenMint() {
    return process.env.CPW3_TOKEN_ADDRESS || '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump';
}

class NametagTierService {
    async refreshPlayerTier(player, { force = false } = {}) {
        if (!player?.walletAddress) {
            player.cpBalance = 0;
            player.cpNametagTier = 'standard';
            return { balance: 0, tier: 'standard' };
        }

        const wallet = player.walletAddress;
        const cached = balanceCache.get(wallet);
        if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
            player.cpBalance = cached.balance;
            player.cpNametagTier = cached.tier;
            return cached;
        }

        let balance = 0;
        try {
            balance = await solanaPaymentService.getTokenBalance(wallet, getCpTokenMint());
        } catch (err) {
            console.warn(`💎 Nametag tier balance check failed for ${wallet.slice(0, 8)}:`, err.message);
            if (cached) {
                player.cpBalance = cached.balance;
                player.cpNametagTier = cached.tier;
                return cached;
            }
        }

        const tier = getTierFromBalance(balance);
        const entry = { balance, tier, at: Date.now() };
        balanceCache.set(wallet, entry);
        player.cpBalance = balance;
        player.cpNametagTier = tier;
        return entry;
    }

    clearCache(walletAddress) {
        if (walletAddress) balanceCache.delete(walletAddress);
    }
}

const nametagTierService = new NametagTierService();
export default nametagTierService;
