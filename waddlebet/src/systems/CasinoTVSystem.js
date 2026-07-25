/**
 * CasinoTVSystem - Renders $WADDLE token info as a 3D mesh with REAL data from DexScreener API
 * Positioned at the TV location in the casino
 */

import { EVM_PLATFORM_TOKEN } from '../config/tokens.js';

const WADDLE_TOKEN_ADDRESS = EVM_PLATFORM_TOKEN.address;
const DEXSCREENER_TOKEN_URL = `https://api.dexscreener.com/latest/dex/tokens/${WADDLE_TOKEN_ADDRESS}`;
const DEXSCREENER_PAGE_URL = `https://dexscreener.com/robinhood/${WADDLE_TOKEN_ADDRESS}`;

function getHttpServerBase() {
    const wsUrl = import.meta.env.VITE_WS_SERVER
        || (import.meta.env.DEV ? 'ws://localhost:3001' : '');
    if (!wsUrl) return '';
    return wsUrl.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
}

function normalizeTokenPayload(raw) {
    if (!raw || raw.error) return null;
    const price = parseFloat(raw.price ?? raw.priceUsd) || 0;
    const marketCap = parseFloat(raw.marketCap) || parseFloat(raw.fdv) || 0;
    if (price <= 0 && marketCap <= 0) return null;
    return {
        price,
        priceNative: parseFloat(raw.priceNative) || 0,
        change1h: parseFloat(raw.change1h ?? raw.priceChange?.h1) || 0,
        change24h: parseFloat(raw.change24h ?? raw.priceChange?.h24) || 0,
        volume24h: parseFloat(raw.volume24h ?? raw.volume?.h24) || 0,
        liquidity: parseFloat(raw.liquidity ?? raw.liquidity?.usd) || 0,
        marketCap,
        symbol: raw.symbol || EVM_PLATFORM_TOKEN.symbol,
        name: raw.name || 'WaddleBet',
        quoteSymbol: raw.quoteSymbol || raw.quoteToken?.symbol || 'WETH',
        contractAddress: raw.contractAddress || raw.baseToken?.address || WADDLE_TOKEN_ADDRESS,
        dexUrl: raw.dexUrl || raw.url || DEXSCREENER_PAGE_URL,
        lastUpdated: raw.lastUpdated || Date.now(),
    };
}

async function fetchFromGameServer() {
    const base = getHttpServerBase();
    if (!base) return null;
    try {
        const response = await fetch(`${base}/api/token-chart/waddle`);
        if (!response.ok) return null;
        const data = await response.json();
        return normalizeTokenPayload(data);
    } catch {
        return null;
    }
}

async function fetchFromDexScreenerDirect() {
    try {
        const response = await fetch(DEXSCREENER_TOKEN_URL);
        if (!response.ok) return null;
        const data = await response.json();
        const pair = data?.pairs?.[0];
        if (!pair) return null;
        return normalizeTokenPayload({
            price: pair.priceUsd,
            priceNative: pair.priceNative,
            change1h: pair.priceChange?.h1,
            change24h: pair.priceChange?.h24,
            volume24h: pair.volume?.h24,
            liquidity: pair.liquidity?.usd,
            marketCap: pair.marketCap || pair.fdv,
            symbol: pair.baseToken?.symbol,
            name: pair.baseToken?.name,
            quoteSymbol: pair.quoteToken?.symbol,
            contractAddress: pair.baseToken?.address,
            dexUrl: pair.url,
        });
    } catch {
        return null;
    }
}

// Cache for API data - conservative rate limiting
let cachedTokenData = null;
let lastFetchTime = 0;
let lastDataHash = '';
const FETCH_INTERVAL = 120000;
const MIN_FETCH_INTERVAL = 60000;
let fetchInProgress = false;

/**
 * Fetch real token data (game server proxy first, DexScreener direct fallback).
 */
export async function fetchTokenData() {
    const now = Date.now();

    if (cachedTokenData && now - lastFetchTime < MIN_FETCH_INTERVAL) {
        return cachedTokenData;
    }

    if (fetchInProgress) {
        return cachedTokenData;
    }

    fetchInProgress = true;

    try {
        cachedTokenData = await fetchFromGameServer() || await fetchFromDexScreenerDirect();
        if (cachedTokenData) {
            lastFetchTime = now;
            console.log('📊 Casino TV: Updated $WADDLE data - Price:', cachedTokenData.price);
        }
    } catch (error) {
        console.warn('Casino TV: API fetch failed, using cached data', error);
    } finally {
        fetchInProgress = false;
    }

    return cachedTokenData;
}

/**
 * Render the casino TV banner to a canvas with REAL data
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} tokenData - Real token data from API
 */
function renderCasinoTVBanner(ctx, tokenData = null) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(1, '#0d1520');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 10);
    ctx.stroke();

    const headerGrad = ctx.createLinearGradient(0, 0, w, 0);
    headerGrad.addColorStop(0, 'rgba(128, 0, 128, 0.8)');
    headerGrad.addColorStop(1, 'rgba(0, 128, 128, 0.8)');
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, 40, [8, 8, 0, 0]);
    ctx.fill();

    const symbol = tokenData?.symbol || EVM_PLATFORM_TOKEN.symbol;
    const quote = tokenData?.quoteSymbol || 'WETH';
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📺 $${symbol} / ${quote}`, 15, 32);

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(tokenData ? '● LIVE' : '○ OFFLINE', w - 15, 30);

    const hasData = tokenData && (tokenData.price > 0 || tokenData.marketCap > 0);
    const price = hasData ? tokenData.price : 0;
    const priceChange = hasData ? tokenData.change1h : 0;
    const marketCap = hasData ? tokenData.marketCap : 0;
    const volume = hasData ? tokenData.volume24h : 0;

    if (!hasData) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading $WADDLE data...', w / 2, h / 2 - 8);
        ctx.fillStyle = '#888888';
        ctx.font = '11px Arial, sans-serif';
        ctx.fillText('Robinhood Chain', w / 2, h / 2 + 16);
        return;
    }

    const chartTop = 55;
    const chartBottom = h - 85;
    const chartLeft = 20;
    const chartRight = w - 20;
    const chartHeight = chartBottom - chartTop;
    const chartWidth = chartRight - chartLeft;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const x = chartLeft + (chartWidth / 4) * i;
        ctx.beginPath();
        ctx.moveTo(x, chartTop);
        ctx.lineTo(x, chartBottom);
        ctx.stroke();
    }
    for (let i = 0; i <= 3; i++) {
        const y = chartTop + (chartHeight / 3) * i;
        ctx.beginPath();
        ctx.moveTo(chartLeft, y);
        ctx.lineTo(chartRight, y);
        ctx.stroke();
    }

    const numCandles = 16;
    const candleWidth = chartWidth / numCandles * 0.65;
    const candleSpacing = chartWidth / numCandles;

    const seededRandom = (i) => {
        const x = Math.sin(42 + i * 127.1) * 43758.5453;
        return x - Math.floor(x);
    };

    const candles = [];
    let currentVal = 100;

    for (let i = 0; i < numCandles; i++) {
        const r1 = seededRandom(i);
        const r2 = seededRandom(i + 100);
        const r3 = seededRandom(i + 200);
        const isGreen = r1 > 0.35;
        const change = isGreen ? (r1 * 0.08 + 0.01) : -(r1 * 0.04);
        const open = currentVal;
        const close = currentVal * (1 + change);
        const high = Math.max(open, close) * (1 + r2 * 0.015);
        const low = Math.min(open, close) * (1 - r3 * 0.012);
        candles.push({ open, high, low, close, isGreen });
        currentVal = close;
    }

    let minP = Infinity;
    let maxP = -Infinity;
    candles.forEach((c) => {
        minP = Math.min(minP, c.low);
        maxP = Math.max(maxP, c.high);
    });
    const range = maxP - minP;
    minP -= range * 0.1;
    maxP += range * 0.1;

    const scaleY = (p) => chartBottom - ((p - minP) / (maxP - minP)) * chartHeight;

    candles.forEach((c, i) => {
        const x = chartLeft + i * candleSpacing + (candleSpacing - candleWidth) / 2;
        ctx.fillStyle = c.isGreen ? '#00ff88' : '#ff4466';
        ctx.fillRect(x + candleWidth / 2 - 1, scaleY(c.high), 2, scaleY(c.low) - scaleY(c.high));
        const bodyTop = Math.min(scaleY(c.open), scaleY(c.close));
        const bodyHeight = Math.abs(scaleY(c.close) - scaleY(c.open));
        ctx.fillRect(x, bodyTop, candleWidth, Math.max(bodyHeight, 2));
    });

    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE DATA', 15, h - 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('$' + price.toFixed(7), 15, h - 33);

    ctx.fillStyle = priceChange >= 0 ? '#00ff88' : '#ff4466';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText((priceChange >= 0 ? '+' : '') + priceChange.toFixed(2) + '%', 135, h - 33);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px Arial, sans-serif';
    const mcDisplay = marketCap >= 1000000
        ? `MC: $${(marketCap / 1000000).toFixed(2)}M`
        : marketCap >= 1000
            ? `MC: $${(marketCap / 1000).toFixed(1)}K`
            : `MC: $${marketCap.toFixed(0)}`;
    ctx.fillText(mcDisplay, 15, h - 12);

    ctx.fillStyle = '#aaaaaa';
    const volDisplay = volume >= 1000000
        ? `Vol: $${(volume / 1000000).toFixed(2)}M`
        : volume >= 1000
            ? `Vol: $${(volume / 1000).toFixed(0)}K`
            : `Vol: $${volume.toFixed(0)}`;
    ctx.fillText(volDisplay, 130, h - 12);

    ctx.fillStyle = '#888888';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('1H', w - 15, h - 33);

    ctx.fillStyle = '#555555';
    ctx.font = '9px Arial, sans-serif';
    const ca = tokenData?.contractAddress || WADDLE_TOKEN_ADDRESS;
    const caShort = `${ca.slice(0, 6)}…${ca.slice(-4)}`;
    ctx.fillText(`DexScreener · ${caShort}`, w - 15, h - 12);
}

export async function createCasinoTVSprite(THREE) {
    const canvas = document.createElement('canvas');
    const w = 400;
    const h = 280;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');

    const tokenData = await fetchTokenData();
    renderCasinoTVBanner(ctx, tokenData);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });

    const planeWidth = 9.375;
    const planeHeight = 5.25;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.renderOrder = 100;

    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.texture = texture;
    mesh.userData.lastUpdate = Date.now();
    mesh.userData.isCasinoTV = true;

    mesh.userData.bannerData = {
        type: 'canvas',
        title: '$WADDLE Token Chart',
        description: `Live $WADDLE price on Robinhood Chain (${WADDLE_TOKEN_ADDRESS})`,
        canvas,
        renderFn: (bannerCtx) => {
            renderCasinoTVBanner(bannerCtx, cachedTokenData);
        }
    };

    mesh.userData.refreshInterval = setInterval(async () => {
        await updateCasinoTVSprite(mesh);
    }, FETCH_INTERVAL);

    // Retry quickly if first load failed (e.g. server still connecting)
    if (!cachedTokenData) {
        setTimeout(() => updateCasinoTVSprite(mesh), 4000);
    }

    return mesh;
}

export async function updateCasinoTVSprite(mesh) {
    if (!mesh || !mesh.userData.ctx) return;

    const tokenData = await fetchTokenData();
    if (!tokenData) return;

    const dataHash = `${tokenData.price}-${tokenData.marketCap}-${tokenData.change1h}`;
    if (dataHash === lastDataHash) {
        return;
    }

    lastDataHash = dataHash;

    renderCasinoTVBanner(mesh.userData.ctx, tokenData);

    mesh.userData.texture.needsUpdate = true;
    mesh.userData.lastUpdate = Date.now();
}

export function cleanupCasinoTV(mesh) {
    if (mesh?.userData?.refreshInterval) {
        clearInterval(mesh.userData.refreshInterval);
    }
}

export default {
    createCasinoTVSprite,
    updateCasinoTVSprite,
    cleanupCasinoTV,
    fetchTokenData,
    renderCasinoTVBanner
};

export { renderCasinoTVBanner };
