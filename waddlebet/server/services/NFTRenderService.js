/**
 * NFTRenderService - Server-side rendering of penguin cosmetics for NFT images
 * Uses Puppeteer to render Three.js scenes and capture screenshots
 * 
 * Images are cached to avoid re-rendering the same cosmetic multiple times
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache directory for rendered images
const CACHE_DIR = join(__dirname, '..', 'cache', 'nft-renders');

// Image dimensions
const IMAGE_WIDTH = 512;
const IMAGE_HEIGHT = 512;

// Puppeteer instance (lazily initialized)
let browserInstance = null;
let puppeteerModule = null;

class NFTRenderService {
    constructor() {
        this.initialized = false;
        this.renderUrl = null;
        this.useCache = true;
        
        // Ensure cache directory exists
        if (!existsSync(CACHE_DIR)) {
            mkdirSync(CACHE_DIR, { recursive: true });
            console.log('📁 Created NFT render cache directory');
        }
    }

    /**
     * Initialize the render service
     * @param {string} baseUrl - Base URL where the render page is hosted
     */
    async initialize(baseUrl = 'http://localhost:3000') {
        if (this.initialized) return;

        try {
            // Dynamically import puppeteer (only when needed)
            puppeteerModule = await import('puppeteer');
            
            this.renderUrl = `${baseUrl}/nft-render.html`;
            this.initialized = true;
            
            console.log('🎨 NFTRenderService initialized');
            console.log(`   Render URL: ${this.renderUrl}`);
            console.log(`   Cache dir: ${CACHE_DIR}`);
            
        } catch (error) {
            console.error('❌ NFTRenderService initialization failed:', error.message);
            console.log('   Install puppeteer: npm install puppeteer');
            throw error;
        }
    }

    /**
     * Get or create browser instance
     */
    async getBrowser() {
        if (!browserInstance || !browserInstance.isConnected()) {
            browserInstance = await puppeteerModule.default.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--allow-file-access-from-files'
                ]
            });
            console.log('🌐 Puppeteer browser launched');
        }
        return browserInstance;
    }

    /**
     * Generate cache key for a cosmetic configuration
     */
    getCacheKey(cosmeticData) {
        const keyData = {
            templateId: cosmeticData.templateId,
            assetKey: cosmeticData.assetKey,
            rarity: cosmeticData.rarity,
            quality: cosmeticData.quality,
            isHolographic: cosmeticData.isHolographic,
            isFirstEdition: cosmeticData.isFirstEdition,
            serialNumber: cosmeticData.serialNumber,
            skin: cosmeticData.skin || 'blue'
        };
        
        const hash = crypto
            .createHash('md5')
            .update(JSON.stringify(keyData))
            .digest('hex');
            
        return hash;
    }

    /**
     * Get cached image if exists
     */
    getCachedImage(cacheKey) {
        if (!this.useCache) return null;
        
        const cachePath = join(CACHE_DIR, `${cacheKey}.png`);
        
        if (existsSync(cachePath)) {
            return readFileSync(cachePath);
        }
        
        return null;
    }

    /**
     * Save image to cache
     */
    saveToCache(cacheKey, imageBuffer) {
        if (!this.useCache) return;
        
        const cachePath = join(CACHE_DIR, `${cacheKey}.png`);
        writeFileSync(cachePath, imageBuffer);
    }

    /**
     * Render a cosmetic on a penguin and return PNG buffer
     * 
     * @param {object} cosmeticData - Cosmetic data from OwnedCosmetic.getForNftMetadata()
     * @returns {Promise<Buffer>} PNG image buffer
     */
    async renderCosmetic(cosmeticData) {
        if (!this.initialized) {
            throw new Error('NFTRenderService not initialized');
        }

        // Check cache first
        const cacheKey = this.getCacheKey(cosmeticData);
        const cachedImage = this.getCachedImage(cacheKey);
        
        if (cachedImage) {
            console.log(`🎨 Using cached render for ${cosmeticData.name} #${cosmeticData.serialNumber}`);
            return cachedImage;
        }

        console.log(`🎨 Rendering ${cosmeticData.name} #${cosmeticData.serialNumber}...`);

        const browser = await this.getBrowser();
        const page = await browser.newPage();

        try {
            // Set viewport
            await page.setViewport({
                width: IMAGE_WIDTH,
                height: IMAGE_HEIGHT,
                deviceScaleFactor: 2 // High DPI
            });

            // Build URL with parameters
            const params = new URLSearchParams({
                templateId: cosmeticData.templateId,
                category: cosmeticData.category,
                name: cosmeticData.name,
                rarity: cosmeticData.rarity,
                quality: cosmeticData.quality,
                serialNumber: cosmeticData.serialNumber.toString(),
                holographic: cosmeticData.isHolographic.toString(),
                firstEdition: cosmeticData.isFirstEdition.toString(),
                assetKey: cosmeticData.assetKey,
                skin: cosmeticData.skin || 'blue'
            });

            const renderUrl = `${this.renderUrl}?${params.toString()}`;
            
            // Navigate to render page
            await page.goto(renderUrl, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });

            // Wait for render to complete
            await page.waitForFunction('window.renderComplete === true', {
                timeout: 10000
            });

            // Small delay for any final rendering
            await page.waitForTimeout(500);

            // Take screenshot
            const screenshot = await page.screenshot({
                type: 'png',
                omitBackground: false,
                clip: {
                    x: 0,
                    y: 0,
                    width: IMAGE_WIDTH,
                    height: IMAGE_HEIGHT
                }
            });

            // Cache the result
            this.saveToCache(cacheKey, screenshot);

            console.log(`   ✅ Rendered and cached: ${cacheKey.slice(0, 8)}...`);

            return screenshot;

        } catch (error) {
            console.error(`   ❌ Render failed:`, error.message);
            throw error;
        } finally {
            await page.close();
        }
    }

    /**
     * Render and return as base64 data URL
     */
    async renderAsDataUrl(cosmeticData) {
        const buffer = await this.renderCosmetic(cosmeticData);
        return `data:image/png;base64,${buffer.toString('base64')}`;
    }

    /**
     * Clear the render cache
     */
    clearCache() {
        const files = readdirSync(CACHE_DIR);
        for (const file of files) {
            unlinkSync(join(CACHE_DIR, file));
        }
        console.log(`🗑️ Cleared ${files.length} cached renders`);
    }

    /**
     * Cleanup - close browser instance
     */
    async shutdown() {
        if (browserInstance) {
            await browserInstance.close();
            browserInstance = null;
            console.log('🌐 Puppeteer browser closed');
        }
    }
}

// Singleton instance
const nftRenderService = new NFTRenderService();

// Cleanup on process exit
process.on('SIGINT', async () => {
    await nftRenderService.shutdown();
});

process.on('SIGTERM', async () => {
    await nftRenderService.shutdown();
});

export default nftRenderService;

