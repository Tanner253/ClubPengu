/**
 * PerformanceManager.js
 * 
 * Manages performance settings and optimizations for the game.
 * Allows PC users to opt into mobile-like optimizations for better FPS.
 * Provides distance-based LOD and update throttling.
 */

import { initBrowserCapabilities, probeWebGLConstraints, usesPrivacyBrowserOptimizations } from '../utils/browserCapabilities.js';

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

// ==================== LOW-END AUTO-DETECTION ====================
// A minority of environments (older/integrated GPUs, some Macs, old iPhones)
// are fill-rate bound and can't sustain the full PBR + soft-shadow render path,
// while the majority run it smoothly. Rather than downgrading everyone, we watch
// runtime FPS and, only when a machine PROVES it's struggling, switch it to a
// cheap render path (see utils/lowEndRender.js). The decision is persisted so
// repeat visits start light immediately. Healthy machines (~60 FPS) never trip this.
const LOW_END = {
    FPS_THRESHOLD: 40,   // sustained EMA below this → struggling environment
    FPS_RECOVER: 46,     // hysteresis: clears the "struggling" timer
    SUSTAIN_MS: 3000,    // must stay below threshold this long before activating
    STORAGE_KEY: 'waddlebet_lowend',
};

class PerformanceManager {
    constructor() {
        this.currentPreset = 'high';
        this.settings = { ...PERFORMANCE_PRESETS.high };
        this.frameCount = 0;
        this.listeners = new Set();
        this.isBraveBrowser = false;
        this.isOperaBrowser = false;
        this._autoPresetApplied = false;
        this._userPresetSaved = false;
        this._fpsSamples = [];
        this._emergencyDowngradeDone = false;
        this._lastRecordedFps = 0;
        this._gameplayReady = false;
        this._gameplayReadyAt = 0;
        this._overlayActive = false;

        // Low-end auto-detection state (smooth-play defaults ON until user opts out)
        this._lowEndEma = 0;
        this._lowEndBelowSince = 0;
        this._lowEndMode = true;
        this._lowEndDecided = false;

        // Load saved preference (or sync GPU probe fallback)
        this.loadSettings();
        this._loadLowEnd();
    }

    _loadLowEnd() {
        try {
            const stored = localStorage.getItem(LOW_END.STORAGE_KEY);
            if (stored === '0') {
                this._lowEndMode = false;
                this._lowEndDecided = true;
                return;
            }
            if (stored === '1') {
                this._lowEndMode = true;
                this._lowEndDecided = true;
                return;
            }
            // No saved preference — smooth-play ON by default for new visitors.
            this._lowEndMode = true;
            this._lowEndDecided = false;
        } catch {
            this._lowEndMode = true;
        }
    }

    /**
     * Fullscreen minigames (fishing, arcade, blackjack) run their own UI loop.
     * Pause FPS sampling so emergency downgrade does not drop world quality to potato.
     */
    setOverlayActive(active) {
        this._overlayActive = Boolean(active);
        if (active) {
            this._fpsSamples = [];
        }
    }

    isOverlayActive() {
        return this._overlayActive;
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
                    this._userPresetSaved = true;
                    console.log(`🎮 Performance: Loaded "${this.settings.name}" preset`);
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to load performance settings:', e);
        }

        const webgl = probeWebGLConstraints();
        if (webgl.recommendPreset) {
            this._applyPreset(webgl.recommendPreset, false);
            console.log(`🎮 Performance: Auto-applied "${this.settings.name}" (${webgl.renderer || 'WebGL probe'})`);
        }
    }

    /**
     * Async browser probe — Brave/Opera GX WebGL protections need lower quality settings.
     * Call before main renderer init when no user-saved preset exists.
     */
    async ensureAutoPreset() {
        if (this._autoPresetApplied || this._userPresetSaved) {
            return;
        }
        this._autoPresetApplied = true;

        const caps = await initBrowserCapabilities();
        this.isBraveBrowser = caps.isBrave;
        this.isOperaBrowser = caps.isOpera;

        if (caps.recommendPreset) {
            this._applyPreset(caps.recommendPreset, false);
            const reason = caps.isBrave
                ? 'Brave browser detected'
                : caps.isOpera
                    ? 'Opera browser detected'
                    : (caps.renderer || 'GPU probe');
            console.log(`🎮 Performance: Auto-applied "${this.settings.name}" (${reason})`);
        }
    }

    _needsPrivacyBrowserOpts() {
        return usesPrivacyBrowserOptimizations({
            isBrave: this.isBraveBrowser,
            isOpera: this.isOperaBrowser
        });
    }

    /**
     * Call once the world has finished loading — avoids false downgrades during heavy init.
     */
    markGameplayReady() {
        this._gameplayReady = true;
        this._gameplayReadyAt = performance.now();
        this._fpsSamples = [];
    }

    /**
     * Desktop shadow maps were historically capped at 1024 regardless of Ultra preset.
     */
    getWorldShadowMapSize(isMobile = false) {
        if (isMobile) return 512;
        return Math.min(this.getSettings().shadowMapSize, 1024);
    }

    /**
     * Sample frame delta — triggers emergency downgrade if sustained FPS is very low.
     */
    recordFrame(delta) {
        if (!this._gameplayReady || this._overlayActive) return;
        // Ignore the first 8s after world load — init spikes would false-trigger downgrade.
        if (performance.now() - this._gameplayReadyAt < 8000) return;

        if (!delta || delta <= 0 || delta > 1) return;

        const fps = 1 / delta;
        this._lastRecordedFps = fps;

        // Low-end auto-detection: if a machine sustains sub-target FPS, switch it to
        // the cheap render path once (and remember the decision). Smooth machines
        // (~60 FPS) never satisfy this, so their quality is untouched.
        if (!this._lowEndDecided) {
            this._lowEndEma = this._lowEndEma ? (this._lowEndEma * 0.92 + fps * 0.08) : fps;
            const now = performance.now();
            if (this._lowEndEma < LOW_END.FPS_THRESHOLD) {
                if (!this._lowEndBelowSince) {
                    this._lowEndBelowSince = now;
                } else if (now - this._lowEndBelowSince > LOW_END.SUSTAIN_MS) {
                    this.activateLowEnd();
                }
            } else if (this._lowEndEma > LOW_END.FPS_RECOVER) {
                this._lowEndBelowSince = 0;
            }
        }

        this._fpsSamples.push(fps);
        if (this._fpsSamples.length > 180) {
            this._fpsSamples.shift();
        }

        if (this._emergencyDowngradeDone || this._fpsSamples.length < 120) {
            return;
        }

        const avg = this._fpsSamples.reduce((sum, value) => sum + value, 0) / this._fpsSamples.length;
        if (avg < 20) {
            this.emergencyDowngrade(avg);
        }
    }

    getLastRecordedFps() {
        return Math.round(this._lastRecordedFps);
    }

    /**
     * Switch this environment to the low-end render path (once). Persisted so the
     * next visit starts light. Dispatches 'lowEndModeActivated' for the renderer to act on.
     */
    activateLowEnd() {
        if (this._lowEndMode) return;
        this._lowEndMode = true;
        this._lowEndDecided = true;
        try {
            localStorage.setItem(LOW_END.STORAGE_KEY, '1');
        } catch {
            // ignore
        }
        console.warn(`🎮 Low-end mode enabled (sustained ~${Math.round(this._lowEndEma)} FPS): shadows off, lower render scale, simplified materials`);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('lowEndModeActivated', {
                detail: { fps: Math.round(this._lowEndEma) }
            }));
        }
    }

    isLowEndMode() {
        return this._lowEndMode;
    }

    /** Clear the persisted low-end decision (debug / opt back into full quality). */
    resetLowEnd() {
        this._lowEndMode = false;
        this._lowEndDecided = true;
        this._lowEndBelowSince = 0;
        this._lowEndEma = 0;
        try {
            localStorage.setItem(LOW_END.STORAGE_KEY, '0');
        } catch {
            // ignore
        }
    }

    /**
     * Drop quality when runtime FPS proves the current preset is too heavy.
     * Persists so a saved Ultra preset cannot trap low-end GPU paths.
     */
    emergencyDowngrade(avgFps) {
        const order = ['ultra', 'high', 'medium', 'low', 'potato'];
        const currentIdx = Math.max(0, order.indexOf(this.currentPreset));
        const targetIdx = Math.min(order.length - 1, currentIdx + 2);
        const target = order[targetIdx];

        if (target === this.currentPreset) {
            this._emergencyDowngradeDone = true;
            return;
        }

        const previous = this.currentPreset;
        this._emergencyDowngradeDone = true;
        this._applyPreset(target, true);
        this.notifyListeners();

        window.dispatchEvent(new CustomEvent('performanceEmergencyDowngrade', {
            detail: {
                from: previous,
                to: target,
                avgFps: Math.round(avgFps),
                settings: this.getSettings()
            }
        }));

        window.dispatchEvent(new CustomEvent('performancePresetChanged', {
            detail: { preset: target, settings: this.getSettings() }
        }));

        console.warn(`🎮 Emergency performance downgrade: ${previous} → ${target} (avg ${Math.round(avgFps)} FPS)`);
    }

    /**
     * Apply live renderer tuning after a preset change (DPR, shadows).
     */
    applyRendererTuning(renderer, THREE, sunLight = null, isMobile = false) {
        if (!renderer || !THREE) return;

        const dpr = this.getDPR(isMobile);
        renderer.setPixelRatio(dpr);
        renderer.shadowMap.type = this.getShadowMapType(THREE, isMobile);

        if (sunLight?.shadow?.mapSize) {
            const shadowMapSize = isMobile ? 512 : this.getWorldShadowMapSize(false);
            sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
            if (sunLight.shadow.map) {
                sunLight.shadow.map.dispose();
                sunLight.shadow.map = null;
            }
        }
    }

    _applyPreset(presetName, persist = true) {
        if (!PERFORMANCE_PRESETS[presetName]) return;
        this.currentPreset = presetName;
        this.settings = { ...PERFORMANCE_PRESETS[presetName] };
        if (persist) {
            this._userPresetSaved = true;
            this.saveSettings();
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
        
        this._applyPreset(presetName, true);
        
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
        // Skins, feather hats, and animated cosmetics always run for nearby players
        // (all devices/presets — identity visuals should not be preset-gated).
        if (distanceSq <= LOD_THRESHOLDS_SQ.HIGH_QUALITY) return true;
        if (!this.settings.animateDistantCosmetics) return false;
        const threshold = this.settings.distantPlayerThreshold * 0.7;
        return distanceSq <= threshold * threshold;
    }

    /**
     * Nametag tier particles (gold rain, sparkles, whale rain) — always on for
     * nearby players regardless of the ambient gold-rain performance toggle.
     */
    shouldShowNametagParticles(distanceSq) {
        return distanceSq <= LOD_THRESHOLDS_SQ.HIGH_QUALITY;
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
     * WebGL context options for initial renderer creation.
     * Antialias and precision are fixed at construction time — live preset changes only
     * tune DPR and shadows via applyRendererTuning(). Using lightweight bootstrap options
     * on refresh matches the fast Potato→Ultra path users get mid-session.
     */
    getBootstrapRendererOptions(isAppleDevice = false, isAndroidDevice = false) {
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

        const privacyOptimized = this._needsPrivacyBrowserOpts();
        return {
            antialias: false,
            powerPreference: privacyOptimized ? 'low-power' : 'high-performance',
            depth: true,
            precision: 'mediump',
            stencil: false,
        };
    }

    /**
     * Full-scene shader compile + texture pre-upload at Ultra/High init is heavier than
     * the live preset path and causes sustained stutter after refresh.
     */
    shouldSkipSceneWarmup() {
        return this.currentPreset === 'ultra' || this.currentPreset === 'high';
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
        
        // Brave / Opera GX: WebGL fingerprinting protections add heavy per-frame overhead
        const privacyOptimized = this._needsPrivacyBrowserOpts();

        // PC uses preset settings
        return {
            antialias: privacyOptimized ? false : this.settings.antialias,
            powerPreference: privacyOptimized ? 'low-power' : 'high-performance',
            depth: true,
            precision: privacyOptimized ? 'mediump' : (this.settings.antialias ? 'highp' : 'mediump'),
            stencil: privacyOptimized ? false : this.settings.antialias,
        };
    }
    
    /**
     * Get DPR (device pixel ratio) based on current settings
     * @param {boolean} isMobile - True if mobile device
     */
    getDPR(isMobile = false) {
        if (isMobile) return 1.0;
        const privacyCap = this._needsPrivacyBrowserOpts() ? 1.0 : this.settings.dpr;
        return Math.min(window.devicePixelRatio, privacyCap);
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

