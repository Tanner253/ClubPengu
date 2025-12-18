/**
 * CasinoTVSystem - Renders $CPw3 token info as a 3D mesh with REAL data from DexScreener API
 * Positioned at the TV location in the casino
 */

// Cache for API data - conservative rate limiting
let cachedTokenData = null;
let lastFetchTime = 0;
let lastDataHash = ''; // Track if data actually changed
const FETCH_INTERVAL = 120000; // Refresh every 2 minutes to reduce load
const MIN_FETCH_INTERVAL = 60000; // Minimum 60 seconds between requests

// Track if a fetch is in progress to prevent duplicate requests
let fetchInProgress = false;

/**
 * Fetch real token data from DexScreener API (with rate limiting)
 */
export async function fetchTokenData() {
    const now = Date.now();
    
    // Return cached data if within interval
    if (cachedTokenData && now - lastFetchTime < MIN_FETCH_INTERVAL) {
        return cachedTokenData;
    }
    
    // Prevent duplicate concurrent requests
    if (fetchInProgress) {
        return cachedTokenData;
    }
    
    fetchInProgress = true;
    
    try {
        const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump');
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
            const pair = data.pairs[0]; // Get the main pair
            cachedTokenData = {
                price: parseFloat(pair.priceUsd) || 0,
                priceNative: parseFloat(pair.priceNative) || 0,
                change1h: parseFloat(pair.priceChange?.h1) || 0,
                change24h: parseFloat(pair.priceChange?.h24) || 0,
                volume24h: parseFloat(pair.volume?.h24) || 0,
                liquidity: parseFloat(pair.liquidity?.usd) || 0,
                marketCap: parseFloat(pair.marketCap) || parseFloat(pair.fdv) || 0,
                symbol: pair.baseToken?.symbol || 'CPw3',
                name: pair.baseToken?.name || 'CPw3',
                lastUpdated: now
            };
            lastFetchTime = now;
            console.log('📊 Casino TV: Updated $CPw3 data - Price:', cachedTokenData.price);
        }
    } catch (error) {
        console.warn('Casino TV: API fetch failed, using cached data');
        // Don't update lastFetchTime on error so we can retry sooner
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
    
    // Dark background with gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(1, '#0d1520');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 12);
    ctx.fill();
    
    // Border glow
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 10);
    ctx.stroke();
    
    // Header bar
    const headerGrad = ctx.createLinearGradient(0, 0, w, 0);
    headerGrad.addColorStop(0, 'rgba(128, 0, 128, 0.8)');
    headerGrad.addColorStop(1, 'rgba(0, 128, 128, 0.8)');
    ctx.fillStyle = headerGrad;
    ctx.beginPath();
    ctx.roundRect(4, 4, w - 8, 40, [8, 8, 0, 0]);
    ctx.fill();
    
    // Title
    const symbol = tokenData?.symbol || 'CPw3';
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`📺 $${symbol} / SOL`, 15, 32);
    
    // Live indicator
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('● LIVE', w - 15, 30);
    
    // Use real data or show loading state
    const hasData = tokenData && tokenData.price > 0;
    const price = hasData ? tokenData.price : 0;
    const priceChange = hasData ? tokenData.change1h : 0;
    const marketCap = hasData ? tokenData.marketCap : 0;
    const volume = hasData ? tokenData.volume24h : 0;
    
    // If no data yet, show loading message
    if (!hasData) {
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading $CPw3 data...', w / 2, h / 2);
        return;
    }
    
    // Draw chart area
    const chartTop = 55;
    const chartBottom = h - 85;
    const chartLeft = 20;
    const chartRight = w - 20;
    const chartHeight = chartBottom - chartTop;
    const chartWidth = chartRight - chartLeft;
    
    // Grid (simplified - fewer lines for performance)
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
    
    // STATIC decorative candles - always uptrending, never changes
    const numCandles = 16;
    const candleWidth = chartWidth / numCandles * 0.65;
    const candleSpacing = chartWidth / numCandles;
    
    // Fixed seed for consistent static candles
    const seededRandom = (i) => {
        const x = Math.sin(42 + i * 127.1) * 43758.5453;
        return x - Math.floor(x);
    };
    
    // Static uptrending candles (decorative only)
    const candles = [];
    let currentVal = 100; // Arbitrary starting value
    
    for (let i = 0; i < numCandles; i++) {
        const r1 = seededRandom(i);
        const r2 = seededRandom(i + 100);
        const r3 = seededRandom(i + 200);
        
        // Mostly green with slight uptrend
        const isGreen = r1 > 0.35;
        const change = isGreen ? (r1 * 0.08 + 0.01) : -(r1 * 0.04);
        
        const open = currentVal;
        const close = currentVal * (1 + change);
        const high = Math.max(open, close) * (1 + r2 * 0.015);
        const low = Math.min(open, close) * (1 - r3 * 0.012);
        
        candles.push({ open, high, low, close, isGreen });
        currentVal = close;
    }
    
    // Scale to chart bounds
    let minP = Infinity, maxP = -Infinity;
    candles.forEach(c => {
        minP = Math.min(minP, c.low);
        maxP = Math.max(maxP, c.high);
    });
    const range = maxP - minP;
    minP -= range * 0.1;
    maxP += range * 0.1;
    
    const scaleY = (p) => chartBottom - ((p - minP) / (maxP - minP)) * chartHeight;
    
    // Draw static candles
    candles.forEach((c, i) => {
        const x = chartLeft + i * candleSpacing + (candleSpacing - candleWidth) / 2;
        ctx.fillStyle = c.isGreen ? '#00ff88' : '#ff4466';
        
        // Wick
        ctx.fillRect(x + candleWidth / 2 - 1, scaleY(c.high), 2, scaleY(c.low) - scaleY(c.high));
        
        // Body
        const bodyTop = Math.min(scaleY(c.open), scaleY(c.close));
        const bodyHeight = Math.abs(scaleY(c.close) - scaleY(c.open));
        ctx.fillRect(x, bodyTop, candleWidth, Math.max(bodyHeight, 2));
    });
    
    // Bottom info bar - REAL DATA
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 9px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LIVE DATA', 15, h - 52);
    
    // Price
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('$' + price.toFixed(7), 15, h - 33);
    
    // Change %
    ctx.fillStyle = priceChange >= 0 ? '#00ff88' : '#ff4466';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillText((priceChange >= 0 ? '+' : '') + priceChange.toFixed(2) + '%', 135, h - 33);
    
    // Market Cap (ACCURATE)
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px Arial, sans-serif';
    const mcDisplay = marketCap >= 1000000 
        ? `MC: $${(marketCap / 1000000).toFixed(2)}M`
        : marketCap >= 1000 
            ? `MC: $${(marketCap / 1000).toFixed(1)}K`
            : `MC: $${marketCap.toFixed(0)}`;
    ctx.fillText(mcDisplay, 15, h - 12);
    
    // Volume
    ctx.fillStyle = '#aaaaaa';
    const volDisplay = volume >= 1000000 
        ? `Vol: $${(volume / 1000000).toFixed(2)}M`
        : volume >= 1000 
            ? `Vol: $${(volume / 1000).toFixed(0)}K`
            : `Vol: $${volume.toFixed(0)}`;
    ctx.fillText(volDisplay, 130, h - 12);
    
    // Timeframe
    ctx.fillStyle = '#888888';
    ctx.font = '12px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('1H', w - 15, h - 33);
    
    // Data source
    ctx.fillStyle = '#555555';
    ctx.font = '9px Arial, sans-serif';
    ctx.fillText('via DexScreener API', w - 15, h - 12);
}

/**
 * Create a Casino TV mesh (static plane, not a sprite that faces camera)
 * @param {Object} THREE - THREE.js library
 * @returns {THREE.Mesh}
 */
export async function createCasinoTVSprite(THREE) {
    const canvas = document.createElement('canvas');
    const w = 400;
    const h = 280;
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d');
    
    // Fetch real data and render
    const tokenData = await fetchTokenData();
    renderCasinoTVBanner(ctx, tokenData);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // Use MeshBasicMaterial for unlit appearance (like a screen)
    const material = new THREE.MeshBasicMaterial({ 
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    
    // Create plane geometry sized to fit the TV (25% larger)
    const planeWidth = 9.375;  // Match TV screen size
    const planeHeight = 5.25;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.renderOrder = 100;
    
    // Store canvas for updates
    mesh.userData.canvas = canvas;
    mesh.userData.ctx = ctx;
    mesh.userData.texture = texture;
    mesh.userData.lastUpdate = Date.now();
    mesh.userData.isCasinoTV = true;
    
    // Start auto-refresh timer
    mesh.userData.refreshInterval = setInterval(async () => {
        await updateCasinoTVSprite(mesh);
    }, FETCH_INTERVAL);
    
    return mesh;
}

/**
 * Update the casino TV mesh with fresh data from API
 * Only re-renders if data has actually changed
 * @param {THREE.Mesh} mesh - The mesh to update
 */
export async function updateCasinoTVSprite(mesh) {
    if (!mesh || !mesh.userData.ctx) return;
    
    const tokenData = await fetchTokenData();
    if (!tokenData) return;
    
    // Create hash to check if data changed
    const dataHash = `${tokenData.price}-${tokenData.marketCap}-${tokenData.change1h}`;
    
    // Skip render if data hasn't changed
    if (dataHash === lastDataHash) {
        return;
    }
    
    lastDataHash = dataHash;
    
    const ctx = mesh.userData.ctx;
    renderCasinoTVBanner(ctx, tokenData);
    
    mesh.userData.texture.needsUpdate = true;
    mesh.userData.lastUpdate = Date.now();
    console.log('📺 Casino TV: Canvas updated with new data');
}

/**
 * Cleanup the casino TV (stop refresh interval)
 * @param {THREE.Mesh} mesh - The mesh to cleanup
 */
export function cleanupCasinoTV(mesh) {
    if (mesh?.userData?.refreshInterval) {
        clearInterval(mesh.userData.refreshInterval);
    }
}

// Default export with all functions
export default {
    createCasinoTVSprite,
    updateCasinoTVSprite,
    cleanupCasinoTV,
    fetchTokenData,
    renderCasinoTVBanner
};

// Named exports for direct imports
export { renderCasinoTVBanner };

