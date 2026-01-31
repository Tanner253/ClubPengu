/**
 * PerformanceManager.js
 * 
 * Manages performance settings and optimizations for the game.
 * Allows PC users to opt into mobile-like optimizations for better FPS.
 * Provides distance-based LOD and update throttling.
 */

// ==================== UNIVERSAL LOD THRESHOLDS ====================
// These apply to ALL quality presets for consistent optimization
// AGGRESSIVE thresholds for expanded map (matching mobile performance)
export const LOD_THRESHOLDS = {
    // Full quality - all effects enabled
    FULL_QUALITY: 20,      // Within 20 units = 100% fidelity (was 35)
    // High quality - minor reductions
    HIGH_QUALITY: 40,      // 20-40 units = 80% fidelity (was 60)
    // Medium quality - significant reductions  
    MEDIUM_QUALITY: 65,    // 40-65 units = 60% fidelity (was 100)
    // Low quality - very distant
    LOW_QUALITY: 90,       // 65-90 units = 40% fidelity (was 150)
    // Beyond 90 units = ULTRA_LOW - extremely minimal rendering
};

// Squared thresholds for faster distance checks (avoid sqrt)
export const LOD_THRESHOLDS_SQ = {
    FULL_QUALITY: LOD_THRESHOLDS.FULL_QUALITY * LOD_THRESHOLDS.FULL_QUALITY,
    HIGH_QUALITY: LOD_THRESHOLDS.HIGH_QUALITY * LOD_THRESHOLDS.HIGH_QUALITY,
    MEDIUM_QUALITY: LOD_THRESHOLDS.MEDIUM_QUALITY * LOD_THRESHOLDS.MEDIUM_QUALITY,
    LOW_QUALITY: LOD_THRESHOLDS.LOW_QUALITY * LOD_THRESHOLDS.LOW_QUALITY,
};

// LOD levels for easy checking
export const LOD_LEVEL = {
    FULL: 0,      // 100% quality
    HIGH: 1,      // 80% quality  
    MEDIUM: 2,    // 60% quality
    LOW: 3,       // 40% quality (very distant)
    ULTRA_LOW: 4, // Minimal quality (extremely distant - static only)
};

// Performance presets - MORE AGGRESSIVE for expanded map (matching mobile)
export const PERFORMANCE_PRESETS = {
    // Maximum quality (default PC) - still aggressive for large map
    ultra: {
        name: 'Ultra',
        dpr: 2.0,
        antialias: true,
        shadowMapSize: 2048,
        shadowType: 'PCFSoft',
        snowParticles: 800,             // Reduced from 1000
        distantPlayerThreshold: 50,     // Reduced from 80
        distantPlayerUpdateRate: 1,
        veryDistantThreshold: 90,       // Reduced from 150
        veryDistantUpdateRate: 2,
        animateDistantPlayers: true,
        animateDistantCosmetics: true,
        trailParticles: true,
        goldRainParticles: true,
    },
    // High quality (default for good PCs)
    high: {
        name: 'High',
        dpr: 1.5,
        antialias: true,
        shadowMapSize: 1024,
        shadowType: 'PCF',
        snowParticles: 600,             // Reduced from 800
        distantPlayerThreshold: 40,     // Reduced from 60
        distantPlayerUpdateRate: 1,
        veryDistantThreshold: 75,       // Reduced from 120
        veryDistantUpdateRate: 2,
        animateDistantPlayers: true,
        animateDistantCosmetics: false, // Disabled for perf
        trailParticles: true,
        goldRainParticles: true,
    },
    // Medium quality (balanced)
    medium: {
        name: 'Medium',
        dpr: 1.0,
        antialias: true,
        shadowMapSize: 512,
        shadowType: 'PCF',
        snowParticles: 400,             // Reduced from 500
        distantPlayerThreshold: 35,     // Reduced from 50
        distantPlayerUpdateRate: 2,
        veryDistantThreshold: 60,       // Reduced from 100
        veryDistantUpdateRate: 4,
        animateDistantPlayers: false,   // Disabled
        animateDistantCosmetics: false,
        trailParticles: true,
        goldRainParticles: false,       // Disabled
    },
    // Low quality (performance mode)
    low: {
        name: 'Low',
        dpr: 1.0,
        antialias: false,
        shadowMapSize: 256,             // Reduced from 512
        shadowType: 'Basic',
        snowParticles: 250,             // Reduced from 400
        distantPlayerThreshold: 25,     // Reduced from 40
        distantPlayerUpdateRate: 3,     // Slower updates
        veryDistantThreshold: 50,       // Reduced from 80
        veryDistantUpdateRate: 6,
        animateDistantPlayers: false,
        animateDistantCosmetics: false,
        trailParticles: false,
        goldRainParticles: false,
    },
    // Potato mode (maximum performance)
    potato: {
        name: 'Potato',
        dpr: 0.75,
        antialias: false,
        shadowMapSize: 256,
        shadowType: 'Basic',
        snowParticles: 200,
        distantPlayerThreshold: 30,
        distantPlayerUpdateRate: 3,
        veryDistantThreshold: 60,
        veryDistantUpdateRate: 8,
        animateDistantPlayers: false,
        animateDistantCosmetics: false,
        trailParticles: false,
        goldRainParticles: false,
    },
};

class PerformanceManager {
    constructor() {
        this.currentPreset = 'ultra';
        this.settings = { ...PERFORMANCE_PRESETS.ultra };
        this.frameCount = 0;
        this.listeners = new Set();
        
        // Load saved preference
        this.loadSettings();
    }
    
    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('waddlebet_performance');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (PERFORMANCE_PRESETS[parsed.preset]) {
                    this.currentPreset = parsed.preset;
                    this.settings = { ...PERFORMANCE_PRESETS[parsed.preset] };
                    console.log(`🎮 Performance: Loaded "${this.settings.name}" preset`);
                }
            }
        } catch (e) {
            console.warn('Failed to load performance settings:', e);
        }
    }
    
    /**
     * Save current settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('waddlebet_performance', JSON.stringify({
                preset: this.currentPreset,
            }));
        } catch (e) {
            console.warn('Failed to save performance settings:', e);
        }
    }
    
    /**
     * Set performance preset
     * @param {string} presetName - Name of preset (ultra, high, medium, low, potato)
     */
    setPreset(presetName) {
        if (!PERFORMANCE_PRESETS[presetName]) {
            console.warn(`Unknown performance preset: ${presetName}`);
            return;
        }
        
        this.currentPreset = presetName;
        this.settings = { ...PERFORMANCE_PRESETS[presetName] };
        this.saveSettings();
        
        console.log(`🎮 Performance: Set to "${this.settings.name}" preset`);
        
        // Notify listeners
        this.notifyListeners();
        
        // Dispatch event for components to react
        window.dispatchEvent(new CustomEvent('performancePresetChanged', {
            detail: { preset: presetName, settings: this.settings }
        }));
    }
    
    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }
    
    /**
     * Get current preset name
     */
    getPreset() {
        return this.currentPreset;
    }
    
    /**
     * Check if a distant player should be updated this frame
     * @param {number} distanceSq - Squared distance to player
     * @returns {boolean} True if should update
     */
    shouldUpdatePlayer(distanceSq) {
        const { distantPlayerThreshold, distantPlayerUpdateRate, veryDistantThreshold, veryDistantUpdateRate } = this.settings;
        
        // Very distant players - reduced update rate
        if (distanceSq > veryDistantThreshold * veryDistantThreshold) {
            return (this.frameCount % veryDistantUpdateRate) === 0;
        }
        
        // Distant players - slightly reduced update rate  
        if (distanceSq > distantPlayerThreshold * distantPlayerThreshold) {
            return (this.frameCount % distantPlayerUpdateRate) === 0;
        }
        
        // Close players - always update
        return true;
    }
    
    /**
     * Check if animations should run for a player at given distance
     * @param {number} distanceSq - Squared distance to player
     * @returns {boolean} True if should animate
     */
    shouldAnimatePlayer(distanceSq) {
        if (!this.settings.animateDistantPlayers) {
            const threshold = this.settings.distantPlayerThreshold;
            return distanceSq <= threshold * threshold;
        }
        return true;
    }
    
    /**
     * Check if cosmetic animations should run for a player at given distance
     * @param {number} distanceSq - Squared distance to player
     * @returns {boolean} True if should animate cosmetics
     */
    shouldAnimateCosmetics(distanceSq) {
        if (!this.settings.animateDistantCosmetics) {
            const threshold = this.settings.distantPlayerThreshold * 0.7;
            return distanceSq <= threshold * threshold;
        }
        return true;
    }
    
    /**
     * Increment frame counter (call once per frame)
     */
    tick() {
        this.frameCount++;
        if (this.frameCount > 1000000) this.frameCount = 0; // Prevent overflow
    }
    
    /**
     * Add a listener for settings changes
     */
    addListener(callback) {
        this.listeners.add(callback);
    }
    
    /**
     * Remove a listener
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }
    
    /**
     * Notify all listeners of settings change
     */
    notifyListeners() {
        for (const listener of this.listeners) {
            try {
                listener(this.settings);
            } catch (e) {
                console.error('Performance listener error:', e);
            }
        }
    }
    
    /**
     * Get renderer options based on current settings
     * @param {boolean} isAppleDevice - True if Apple device
     * @param {boolean} isAndroidDevice - True if Android device
     */
    getRendererOptions(isAppleDevice = false, isAndroidDevice = false) {
        // Mobile devices always use mobile settings regardless of preset
        const isMobile = isAppleDevice || isAndroidDevice;
        
        if (isMobile) {
            return {
                antialias: false,
                powerPreference: 'high-performance',
                depth: true,
                precision: 'mediump',
                stencil: false,
            };
        }
        
        // PC uses preset settings
        return {
            antialias: this.settings.antialias,
            powerPreference: 'high-performance',
            depth: true,
            precision: this.settings.antialias ? 'highp' : 'mediump',
            stencil: this.settings.antialias,
        };
    }
    
    /**
     * Get DPR (device pixel ratio) based on current settings
     * @param {boolean} isMobile - True if mobile device
     */
    getDPR(isMobile = false) {
        if (isMobile) return 1.0;
        return Math.min(window.devicePixelRatio, this.settings.dpr);
    }
    
    /**
     * Get shadow map type based on current settings
     * @param {THREE} THREE - Three.js reference
     * @param {boolean} isMobile - True if mobile device
     */
    getShadowMapType(THREE, isMobile = false) {
        if (isMobile) return THREE.BasicShadowMap;
        
        switch (this.settings.shadowType) {
            case 'PCFSoft': return THREE.PCFSoftShadowMap;
            case 'PCF': return THREE.PCFShadowMap;
            case 'Basic': return THREE.BasicShadowMap;
            default: return THREE.PCFShadowMap;
        }
    }
    
    /**
     * Get snow particle count based on current settings
     * @param {boolean} isMobile - True if mobile device
     */
    getSnowParticleCount(isMobile = false) {
        if (isMobile) return 400;
        return this.settings.snowParticles;
    }
    
    /**
     * Check if trail particles should be shown
     */
    shouldShowTrails() {
        return this.settings.trailParticles;
    }
    
    /**
     * Check if gold rain particles should be shown
     */
    shouldShowGoldRain() {
        return this.settings.goldRainParticles;
    }
    
    // ==================== UNIVERSAL LOD METHODS ====================
    // These work across ALL quality presets
    
    /**
     * Get LOD level for a given squared distance
     * @param {number} distanceSq - Squared distance to object
     * @returns {number} LOD level (0=full, 1=high, 2=medium, 3=low, 4=ultra_low)
     */
    getLODLevel(distanceSq) {
        if (distanceSq <= LOD_THRESHOLDS_SQ.FULL_QUALITY) return LOD_LEVEL.FULL;
        if (distanceSq <= LOD_THRESHOLDS_SQ.HIGH_QUALITY) return LOD_LEVEL.HIGH;
        if (distanceSq <= LOD_THRESHOLDS_SQ.MEDIUM_QUALITY) return LOD_LEVEL.MEDIUM;
        if (distanceSq <= LOD_THRESHOLDS_SQ.LOW_QUALITY) return LOD_LEVEL.LOW;
        return LOD_LEVEL.ULTRA_LOW;
    }
    
    /**
     * Check if an object should cast shadows at given distance
     * Shadows are EXPENSIVE - only enable for close objects
     * @param {number} distanceSq - Squared distance to object
     * @returns {boolean} True if should cast shadow
     */
    shouldCastShadow(distanceSq) {
        // Only full quality objects cast shadows (within 50 units)
        return distanceSq <= LOD_THRESHOLDS_SQ.FULL_QUALITY;
    }
    
    /**
     * Check if particles (gold rain, sparks, trails) should show for object
     * @param {number} distanceSq - Squared distance to object
     * @returns {boolean} True if should show particles
     */
    shouldShowParticlesForDistance(distanceSq) {
        // Particles only for full and high quality (within 100 units)
        return distanceSq <= LOD_THRESHOLDS_SQ.HIGH_QUALITY;
    }
    
    /**
     * Check if detailed cosmetics (animated eyes, wings flap, etc) should animate
     * @param {number} distanceSq - Squared distance to object  
     * @returns {boolean} True if should animate cosmetic details
     */
    shouldAnimateCosmeticDetails(distanceSq) {
        // Cosmetic animations within 100 units
        return distanceSq <= LOD_THRESHOLDS_SQ.HIGH_QUALITY;
    }
    
    /**
     * Check if name tags should be visible
     * @param {number} distanceSq - Squared distance to player
     * @returns {boolean} True if nametag should be visible
     */
    shouldShowNametag(distanceSq) {
        // Nametags visible within 200 units
        return distanceSq <= LOD_THRESHOLDS_SQ.MEDIUM_QUALITY;
    }
    
    /**
     * Check if puffle should be visible/animated
     * @param {number} distanceSq - Squared distance to player
     * @returns {boolean} True if puffle should be visible
     */
    shouldShowPuffle(distanceSq) {
        // Puffles visible within 50 units (very aggressive for larger map)
        const PUFFLE_THRESHOLD_SQ = 50 * 50;
        return distanceSq <= PUFFLE_THRESHOLD_SQ;
    }
    
    /**
     * Check if object should be updated at all (extremely distant objects can skip updates)
     * @param {number} distanceSq - Squared distance to object
     * @param {number} frameCount - Current frame count for throttling
     * @returns {boolean} True if should update this frame
     */
    shouldUpdateDistantObject(distanceSq, frameCount) {
        if (distanceSq <= LOD_THRESHOLDS_SQ.MEDIUM_QUALITY) return true;
        if (distanceSq <= LOD_THRESHOLDS_SQ.LOW_QUALITY) {
            // Update every 2nd frame for distant objects
            return (frameCount % 2) === 0;
        }
        // Ultra distant - update every 4th frame
        return (frameCount % 4) === 0;
    }
    
    /**
     * Check if prop/environment object should be visible at distance
     * @param {number} distanceSq - Squared distance
     * @returns {boolean} True if should render
     */
    shouldRenderProp(distanceSq) {
        // Props visible within 120 units (was 200, more aggressive for expanded map)
        const PROP_VISIBLE_SQ = 120 * 120;
        return distanceSq <= PROP_VISIBLE_SQ;
    }
    
    /**
     * Get opacity/scale multiplier for LOD fade
     * @param {number} distanceSq - Squared distance
     * @returns {number} Multiplier 0-1
     */
    getLODFadeFactor(distanceSq) {
        if (distanceSq <= LOD_THRESHOLDS_SQ.FULL_QUALITY) return 1.0;
        if (distanceSq <= LOD_THRESHOLDS_SQ.HIGH_QUALITY) return 0.85;
        if (distanceSq <= LOD_THRESHOLDS_SQ.MEDIUM_QUALITY) return 0.7;
        if (distanceSq <= LOD_THRESHOLDS_SQ.LOW_QUALITY) return 0.5;
        return 0.3; // Ultra distant - very faded
    }
}

// Singleton instance
const performanceManager = new PerformanceManager();

export default performanceManager;
export { PerformanceManager };

