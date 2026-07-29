/**
 * PriceOracleService — SOL/USD + ETH/USD for USD-pegged EVM pebbles.
 * Canonical: 1 pebble ≈ solUsd / 1000 (matches Solana 1 SOL = 1000 pebbles).
 */

import crypto from 'crypto';

const CACHE_TTL_MS = 45_000;
const MAX_PRICE_AGE_MS = 120_000;
const QUOTE_TTL_MS = 60_000;
const COINGECKO_URL =
    'https://api.coingecko.com/api/v3/simple/price?ids=solana,ethereum&vs_currencies=usd';
const PEBBLES_PER_SOL = 1000;

class PriceOracleService {
    constructor() {
        this._cache = null;
        this._quotes = new Map();
        this._fetchPromise = null;
    }

    /** @returns {Promise<{ solUsd: number, ethUsd: number, pebbleUsd: number, fetchedAt: number }>} */
    async getPrices() {
        const now = Date.now();
        if (this._cache && now - this._cache.fetchedAt < CACHE_TTL_MS) {
            return this._cache;
        }
        if (this._fetchPromise) {
            return this._fetchPromise;
        }

        this._fetchPromise = this._fetchPrices()
            .then((prices) => {
                this._cache = prices;
                return prices;
            })
            .finally(() => {
                this._fetchPromise = null;
            });

        return this._fetchPromise;
    }

    async _fetchPrices() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8_000);
        let res;
        try {
            res = await fetch(COINGECKO_URL, {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timer);
        }
        if (!res.ok) {
            throw new Error(`Price oracle HTTP ${res.status}`);
        }
        const data = await res.json();
        const solUsd = Number(data?.solana?.usd);
        const ethUsd = Number(data?.ethereum?.usd);
        if (!Number.isFinite(solUsd) || solUsd <= 0 || !Number.isFinite(ethUsd) || ethUsd <= 0) {
            throw new Error('Price oracle returned invalid SOL/ETH USD');
        }
        return {
            solUsd,
            ethUsd,
            pebbleUsd: solUsd / PEBBLES_PER_SOL,
            fetchedAt: Date.now(),
        };
    }

    async requireFreshPrices() {
        const prices = await this.getPrices();
        if (Date.now() - prices.fetchedAt > MAX_PRICE_AGE_MS) {
            this._cache = null;
            const refreshed = await this.getPrices();
            if (Date.now() - refreshed.fetchedAt > MAX_PRICE_AGE_MS) {
                throw new Error('Price oracle stale');
            }
            return refreshed;
        }
        return prices;
    }

    getPebbleUsd(prices) {
        return prices.pebbleUsd;
    }

    /** pebbles = floor(eth * ethUsd * 1000 / solUsd) */
    ethToPebbles(ethAmount, prices) {
        const eth = Number(ethAmount);
        if (!Number.isFinite(eth) || eth <= 0) return 0;
        return Math.floor((eth * prices.ethUsd * PEBBLES_PER_SOL) / prices.solUsd);
    }

    /** eth = pebbles * solUsd / (1000 * ethUsd) */
    pebblesToEth(pebbles, prices) {
        const p = Number(pebbles);
        if (!Number.isFinite(p) || p <= 0) return 0;
        return (p * prices.solUsd) / (PEBBLES_PER_SOL * prices.ethUsd);
    }

    /**
     * Locked deposit quote for EVM.
     * @param {{ chainId: string, ethAmount?: number, targetPebbles?: number, walletAddress: string }} opts
     */
    async createDepositQuote(opts) {
        const { chainId, walletAddress } = opts;
        const prices = await this.requireFreshPrices();

        let ethAmount = opts.ethAmount != null ? Number(opts.ethAmount) : null;
        let pebbles = opts.targetPebbles != null ? Math.floor(Number(opts.targetPebbles)) : null;

        if (ethAmount != null && Number.isFinite(ethAmount) && ethAmount > 0) {
            pebbles = this.ethToPebbles(ethAmount, prices);
        } else if (pebbles != null && pebbles > 0) {
            ethAmount = this.pebblesToEth(pebbles, prices);
            // Recompute pebbles from rounded eth so credit matches what user sends
            pebbles = this.ethToPebbles(ethAmount, prices);
        } else {
            return { success: false, error: 'INVALID_QUOTE', message: 'Provide ethAmount or targetPebbles' };
        }

        if (pebbles < 100) {
            return { success: false, error: 'BELOW_MINIMUM', message: 'Minimum 100 pebbles' };
        }

        const quoteId = `pq_${crypto.randomBytes(12).toString('hex')}`;
        const expiresAt = Date.now() + QUOTE_TTL_MS;
        const quote = {
            quoteId,
            chainId: String(chainId),
            walletAddress: walletAddress.toLowerCase(),
            ethAmount,
            pebbles,
            solUsd: prices.solUsd,
            ethUsd: prices.ethUsd,
            pebbleUsd: prices.pebbleUsd,
            usdValue: pebbles * prices.pebbleUsd,
            expiresAt,
            createdAt: Date.now(),
        };
        this._quotes.set(quoteId, quote);
        this._pruneQuotes();
        return { success: true, quote };
    }

    consumeQuote(quoteId, walletAddress) {
        const quote = this._quotes.get(quoteId);
        if (!quote) {
            return { success: false, error: 'QUOTE_NOT_FOUND', message: 'Quote expired or unknown' };
        }
        if (Date.now() > quote.expiresAt) {
            this._quotes.delete(quoteId);
            return { success: false, error: 'QUOTE_EXPIRED', message: 'Quote expired — request a new one' };
        }
        if (quote.walletAddress !== String(walletAddress).toLowerCase()) {
            return { success: false, error: 'QUOTE_WALLET_MISMATCH', message: 'Quote belongs to another wallet' };
        }
        this._quotes.delete(quoteId);
        return { success: true, quote };
    }

    peekQuote(quoteId) {
        return this._quotes.get(quoteId) || null;
    }

    _pruneQuotes() {
        const now = Date.now();
        for (const [id, q] of this._quotes) {
            if (now > q.expiresAt) this._quotes.delete(id);
        }
    }

    /** Test helper */
    _setCacheForTests(prices) {
        this._cache = { ...prices, fetchedAt: prices.fetchedAt ?? Date.now() };
    }

    _clearForTests() {
        this._cache = null;
        this._quotes.clear();
    }
}

export const PEBBLES_PER_SOL_RATE = PEBBLES_PER_SOL;
export const QUOTE_TTL_MS_EXPORT = QUOTE_TTL_MS;

const priceOracleService = new PriceOracleService();
export default priceOracleService;
