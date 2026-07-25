/**
 * Token chart data for in-world displays (Casino TV).
 * Fetched server-side to avoid browser CORS / ad-blocker issues with DexScreener.
 */

import { EVM_PLATFORM_TOKEN } from '../config/tokens.js';

const WADDLE_ADDRESS = EVM_PLATFORM_TOKEN.address;
const DEXSCREENER_URL = `https://api.dexscreener.com/latest/dex/tokens/${WADDLE_ADDRESS}`;

let cached = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

/**
 * @returns {Promise<object|null>}
 */
export async function fetchWaddleChartData() {
    const now = Date.now();
    if (cached && now - cachedAt < CACHE_MS) {
        return cached;
    }

    try {
        const response = await fetch(DEXSCREENER_URL);
        if (!response.ok) {
            throw new Error(`DexScreener ${response.status}`);
        }
        const data = await response.json();
        const pair = data?.pairs?.[0];
        if (!pair) {
            throw new Error('No pairs returned');
        }

        cached = {
            price: parseFloat(pair.priceUsd) || 0,
            priceNative: parseFloat(pair.priceNative) || 0,
            change1h: parseFloat(pair.priceChange?.h1) || 0,
            change24h: parseFloat(pair.priceChange?.h24) || 0,
            volume24h: parseFloat(pair.volume?.h24) || 0,
            liquidity: parseFloat(pair.liquidity?.usd) || 0,
            marketCap: parseFloat(pair.marketCap) || parseFloat(pair.fdv) || 0,
            symbol: pair.baseToken?.symbol || 'WADDLE',
            name: pair.baseToken?.name || 'WaddleBet',
            quoteSymbol: pair.quoteToken?.symbol || 'WETH',
            contractAddress: pair.baseToken?.address || WADDLE_ADDRESS,
            dexUrl: pair.url || `https://dexscreener.com/robinhood/${WADDLE_ADDRESS}`,
            lastUpdated: now,
        };
        cachedAt = now;
        return cached;
    } catch (err) {
        console.warn('[TokenChart] WADDLE fetch failed:', err.message);
        return cached;
    }
}

export default fetchWaddleChartData;
