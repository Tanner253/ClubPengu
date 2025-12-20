/**
 * CasinoExterior - Vegas-style casino exterior decoration system
 * PERFORMANCE OPTIMIZED VERSION
 * 
 * Key optimizations:
 * - Throttled canvas updates (sign only redraws every 200ms)
 * - Reduced LED count and simplified animations
 * - Fixed z-positions to prevent overlapping/z-fighting
 * - Removed redundant decorations
 * 
 * PERFORMANCE DEBUGGING FLAGS:
 * - DISABLE_ROULETTE_WHEEL: Set to true to disable the animated roulette wheel
 * - DISABLE_DICE_TOWERS: Set to true to disable the golden dice towers
 * - DISABLE_NEON_SUITS: Set to true to disable the neon card suit shapes
 */

import VegasMarquee from './casino/VegasMarquee';
import GoldenDiceTower from './casino/GoldenDiceTower';
import AnimatedRouletteWheel from './casino/AnimatedRouletteWheel';
import NeonTubing from './casino/NeonTubing';

// ==================== PERFORMANCE DEBUG FLAGS ====================
// Set these to true to disable specific casino decorations for performance testing
const DISABLE_ROULETTE_WHEEL = false;   // Spinning roulette wheel on roof
const DISABLE_DICE_TOWERS = false;      // Golden dice tower pillars at entrance
const DISABLE_NEON_SUITS = false;       // Neon heart/diamond/spade/club shapes
const DISABLE_DOLLAR_SIGNS = false;     // Neon dollar signs on sides
const DISABLE_MARQUEE_BULBS = false;    // U-shape marquee with chasing lights
// ==================================================================

class CasinoExterior {
    constructor(THREE) {
        this.THREE = THREE;
        this.group = null;
        this.props = [];
        this.lights = [];
        this.animatedElements = [];
        this.decorationColliders = [];
        
        // Building dimensions
        this.width = 36;
        this.height = 14;
        this.depth = 32;
        
        // Throttle state
        this.lastSignUpdate = 0;
        this.lastLedUpdate = 0;
        
        // Mobile/Apple GPU detection for performance optimizations
        this.isMobileGPU = typeof window !== 'undefined' && window._isMobileGPU;
        this.isAppleDevice = typeof window !== 'undefined' && window._isAppleDevice;
        this.needsOptimization = this.isMobileGPU || this.isAppleDevice;
    }
    
    build(config = {}) {
        const THREE = this.THREE;
        this.group = new THREE.Group();
        this.group.name = 'casino_exterior_decorations';
        
        const {
            width = this.width,
            height = this.height,
            depth = this.depth,
            scene = null
        } = config;
        
        this.width = width;
        this.height = height;
        this.depth = depth;
        
        // ==================== VEGAS MARQUEE (U-shape: top + sides, NO bottom) ====================
        if (!DISABLE_MARQUEE_BULBS) {
            this.createUShapeMarquee(this.group, width, height, depth);
        }
        
        // ==================== CASINO TITLE SIGN (z = depth/2 + 4) ====================
        this.createCasinoTitleSign(this.group, width, height, depth);
        
        // ==================== GOLDEN DICE TOWERS (z = depth/2 + 3) ====================
        if (!DISABLE_DICE_TOWERS) {
            [-1, 1].forEach((side) => {
                const diceTower = new GoldenDiceTower(THREE);
                diceTower.spawn(scene || this.group, side * 6, 0, depth / 2 + 3, {
                    diceCount: 3,     // Reduced from 4
                    diceSize: 1.0,
                    baseRadius: 1.5
                });
                this.props.push(diceTower);
                if (diceTower.group) this.group.add(diceTower.group);
            });
        }
        
        // ==================== ANIMATED ROULETTE WHEEL (z = depth/2 + 1) ====================
        if (!DISABLE_ROULETTE_WHEEL) {
            const rouletteWheel = new AnimatedRouletteWheel(THREE);
            rouletteWheel.spawn(scene || this.group, 0, height + 2, depth / 2 + 1, {
                wheelRadius: 4,
                tiltAngle: Math.PI / 4
            });
            this.props.push(rouletteWheel);
            if (rouletteWheel.group) this.group.add(rouletteWheel.group);
        } else {
            console.log('🎰 Casino: Roulette wheel DISABLED for performance testing');
        }
        
        // ==================== NEON CARD SUITS (z = depth/2 + 2) ====================
        if (!DISABLE_NEON_SUITS) {
            const suits = ['heart', 'diamond', 'spade', 'club'];
            const suitColors = [0xFF0000, 0xFF0066, 0x00FFFF, 0x00FF00];
            
            suits.forEach((suit, idx) => {
                const suitNeon = new NeonTubing(THREE);
                const xPos = -width / 3 + (idx * (width / 4.5));
                suitNeon.spawn(scene || this.group, xPos, height - 3, depth / 2 + 2, {
                    shape: suit,
                    size: 0.9,
                    color: suitColors[idx],
                    glowIntensity: 0.7
                });
                this.props.push(suitNeon);
                if (suitNeon.group) this.group.add(suitNeon.group);
            });
        }
        
        // ==================== NEON FRAME AROUND ENTRANCE ====================
        this.createNeonFrame(this.group, width, height, depth);
        
        // ==================== ENTRANCE CARPET (simplified - no LEDs) ====================
        this.createEntranceCarpet(this.group, depth);
        
        // ==================== DOLLAR SIGNS (z = depth/2 + 2.5) ====================
        if (!DISABLE_DOLLAR_SIGNS) {
            this.createDollarSigns(this.group, width, height, depth);
        }
        
        // ==================== APPLE/MOBILE SHADOW OPTIMIZATION ====================
        if (this.needsOptimization) {
            this.group.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });
        }
        
        // ==================== STATIC MESH OPTIMIZATION ====================
        // For non-animated meshes, disable matrixAutoUpdate
        // Only bulbs/animated elements need matrix updates
        const animatedMeshes = new Set();
        this.animatedElements.forEach(elem => {
            if (elem.bulbs) elem.bulbs.forEach(b => animatedMeshes.add(b));
            if (elem.mesh) animatedMeshes.add(elem.mesh);
        });
        
        this.group.traverse(child => {
            if (child.isMesh && !animatedMeshes.has(child)) {
                child.updateMatrix();
                child.matrixAutoUpdate = false;
            }
        });
        this.group.updateMatrixWorld(true);
        
        return this.group;
    }
    
    /**
     * Simplified entrance carpet - no animated LEDs
     */
    createEntranceCarpet(group, depth) {
        const THREE = this.THREE;
        
        const carpetWidth = 6;
        const carpetLength = 16;
        
        // Red carpet mesh
        const carpetMat = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            roughness: 0.9
        });
        const carpetGeo = new THREE.PlaneGeometry(carpetWidth, carpetLength);
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.02, depth / 2 + carpetLength / 2);
        group.add(carpet);
        
        // Gold trim on carpet edges
        const trimMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            roughness: 0.3,
            metalness: 0.6
        });
        [-1, 1].forEach(side => {
            const trimGeo = new THREE.BoxGeometry(0.15, 0.05, carpetLength);
            const trim = new THREE.Mesh(trimGeo, trimMat);
            trim.position.set(side * carpetWidth / 2, 0.03, depth / 2 + carpetLength / 2);
            group.add(trim);
        });
        
        // Velvet rope posts (reduced count)
        const postMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            roughness: 0.2,
            metalness: 0.8
        });
        
        [-1, 1].forEach(side => {
            // Only 3 posts per side instead of 5+
            for (let z = depth / 2 + 4; z <= depth / 2 + carpetLength - 2; z += 5) {
                const postGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 8);
                const post = new THREE.Mesh(postGeo, postMat);
                post.position.set(side * (carpetWidth / 2 + 0.5), 0.6, z);
                group.add(post);
                
                const ballGeo = new THREE.SphereGeometry(0.18, 8, 8);
                const ball = new THREE.Mesh(ballGeo, postMat);
                ball.position.set(side * (carpetWidth / 2 + 0.5), 1.3, z);
                group.add(ball);
            }
        });
        
        // Simple velvet ropes (no TubeGeometry - just boxes)
        const ropeMat = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            roughness: 0.6
        });
        
        [-1, 1].forEach(side => {
            for (let z = depth / 2 + 4; z < depth / 2 + carpetLength - 4; z += 5) {
                const ropeGeo = new THREE.BoxGeometry(0.1, 0.1, 4.8);
                const rope = new THREE.Mesh(ropeGeo, ropeMat);
                rope.position.set(side * (carpetWidth / 2 + 0.5), 1.05, z + 2.4);
                group.add(rope);
            }
        });
    }
    
    /**
     * Create CASINO title sign - THROTTLED updates
     */
    createCasinoTitleSign(group, width, height, depth) {
        const THREE = this.THREE;
        
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 1024;  // Reduced from 1536
        signCanvas.height = 256;  // Reduced from 320
        const signCtx = signCanvas.getContext('2d');
        
        // Draw static sign (no animation needed for good visuals)
        const drawCasinoSign = () => {
            signCtx.clearRect(0, 0, 1024, 256);
            signCtx.textAlign = 'center';
            signCtx.textBaseline = 'middle';
            signCtx.font = 'bold 120px "Impact", "Haettenschweiler", sans-serif';
            
            const spacedText = 'C A S I N O';
            
            // Outer glow
            signCtx.shadowColor = '#FFD700';
            signCtx.shadowBlur = 40;
            signCtx.fillStyle = '#FFD700';
            signCtx.globalAlpha = 0.7;
            signCtx.fillText(spacedText, 512, 128);
            
            // Inner glow
            signCtx.shadowBlur = 20;
            signCtx.fillStyle = '#FFFF00';
            signCtx.globalAlpha = 0.85;
            signCtx.fillText(spacedText, 512, 128);
            
            // Core text
            signCtx.shadowBlur = 10;
            signCtx.fillStyle = '#FFFFCC';
            signCtx.globalAlpha = 1.0;
            signCtx.fillText(spacedText, 512, 128);
        };
        
        drawCasinoSign();
        
        const signTexture = new THREE.CanvasTexture(signCanvas);
        signTexture.needsUpdate = true;
        
        const signSpriteMat = new THREE.SpriteMaterial({
            map: signTexture,
            transparent: true
        });
        const signSprite = new THREE.Sprite(signSpriteMat);
        signSprite.name = 'casino_title_sign';
        signSprite.scale.set(25, 6, 1);
        signSprite.position.set(0, height + 3.5, depth / 2 + 4);
        signSprite.renderOrder = 100;
        group.add(signSprite);
        
        // Store for optional slow animation
        this.animatedElements.push({ 
            type: 'casinoSign', 
            mesh: signSprite,
            canvas: signCanvas,
            ctx: signCtx,
            texture: signTexture,
            baseY: height + 3.5
        });
        
        // Accent light under sign - Apple/Mobile: skip (emissive materials provide glow)
        if (!this.needsOptimization) {
            const signLight = new THREE.PointLight(0xFFAA00, 2, 20);
            signLight.position.set(0, height + 1, depth / 2 + 4);
            group.add(signLight);
            this.lights.push(signLight);
        }
    }
    
    /**
     * Create neon dollar signs (z = depth/2 + 2.5)
     */
    createDollarSigns(group, width, height, depth) {
        const THREE = this.THREE;
        
        const positions = [
            { x: -width / 2 + 3, y: height - 5 },
            { x: width / 2 - 3, y: height - 5 },
        ];
        
        positions.forEach((pos) => {
            const dollarNeon = new NeonTubing(THREE);
            dollarNeon.spawn(this.group, pos.x, pos.y, depth / 2 + 2.5, {
                shape: 'dollar',
                size: 1.5,
                color: 0x00FF00,
                glowIntensity: 1.0
            });
            this.props.push(dollarNeon);
            if (dollarNeon.group) group.add(dollarNeon.group);
        });
    }
    
    /**
     * Create neon frame around entrance - static, no animation needed
     * Z-positions pushed out to avoid overlap with building walls
     */
    createNeonFrame(group, width, height, depth) {
        const THREE = this.THREE;
        
        // Neon pink frame around entrance
        const neonPink = 0xFF1493;
        const neonCyan = 0x00FFFF;
        const neonGold = 0xFFD700;
        
        // Z offset from building front - pushed out to avoid z-fighting
        const frameZ = depth / 2 + 1.0;  // Primary frame layer
        const outerZ = depth / 2 + 0.85;  // Outer frame slightly behind
        const accentZ = depth / 2 + 1.15; // Accents slightly in front
        
        const frameMat = new THREE.MeshStandardMaterial({
            color: neonPink,
            emissive: neonPink,
            emissiveIntensity: 0.9,
            roughness: 0.3
        });
        
        const cyanMat = new THREE.MeshStandardMaterial({
            color: neonCyan,
            emissive: neonCyan,
            emissiveIntensity: 0.8,
            roughness: 0.3
        });
        
        const goldMat = new THREE.MeshStandardMaterial({
            color: neonGold,
            emissive: neonGold,
            emissiveIntensity: 0.7,
            roughness: 0.3
        });
        
        // Vertical neon strips beside entrance (pink)
        const vertGeo = new THREE.BoxGeometry(0.2, 6, 0.2);
        [-1, 1].forEach(side => {
            const vert = new THREE.Mesh(vertGeo, frameMat);
            vert.position.set(side * 6.5, 3, frameZ);
            group.add(vert);
        });
        
        // Horizontal neon strip above entrance (pink)
        const horizGeo = new THREE.BoxGeometry(13.2, 0.2, 0.2);
        const horiz = new THREE.Mesh(horizGeo, frameMat);
        horiz.position.set(0, 6.1, frameZ);
        group.add(horiz);
        
        // Outer frame (cyan) - larger, slightly behind pink frame
        const outerVertGeo = new THREE.BoxGeometry(0.15, 7, 0.15);
        [-1, 1].forEach(side => {
            const vert = new THREE.Mesh(outerVertGeo, cyanMat);
            vert.position.set(side * 7.5, 3.5, outerZ);
            group.add(vert);
        });
        
        const outerHorizGeo = new THREE.BoxGeometry(15.2, 0.15, 0.15);
        const outerHoriz = new THREE.Mesh(outerHorizGeo, cyanMat);
        outerHoriz.position.set(0, 7, outerZ);
        group.add(outerHoriz);
        
        // Bottom accent strip (gold)
        const bottomGeo = new THREE.BoxGeometry(15, 0.15, 0.15);
        const bottom = new THREE.Mesh(bottomGeo, goldMat);
        bottom.position.set(0, 0.1, outerZ);
        group.add(bottom);
        
        // Corner accent dots (gold spheres) - in front
        const dotGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const corners = [
            { x: -7.5, y: 7 },
            { x: 7.5, y: 7 },
            { x: -7.5, y: 0.1 },
            { x: 7.5, y: 0.1 },
        ];
        corners.forEach(pos => {
            const dot = new THREE.Mesh(dotGeo, goldMat);
            dot.position.set(pos.x, pos.y, accentZ);
            group.add(dot);
        });
        
        // Diagonal accent strips at corners (pink) - in front
        const diagGeo = new THREE.BoxGeometry(0.12, 2, 0.12);
        [-1, 1].forEach(side => {
            const diag = new THREE.Mesh(diagGeo, frameMat);
            diag.position.set(side * 8, height - 2, accentZ);
            diag.rotation.z = side * 0.3;
            group.add(diag);
        });
        
        // Add accent lights for the neon - Apple/Mobile: skip
        if (!this.needsOptimization) {
            const pinkLight = new THREE.PointLight(neonPink, 1.5, 15);
            pinkLight.position.set(0, 3, depth / 2 + 3);
            group.add(pinkLight);
            this.lights.push(pinkLight);
            
            const cyanLight = new THREE.PointLight(neonCyan, 1.0, 12);
            cyanLight.position.set(0, 7, depth / 2 + 3);
            group.add(cyanLight);
            this.lights.push(cyanLight);
        }
    }
    
    /**
     * Create U-shaped marquee: across top + down both sides to ground (NO bottom)
     * OPTIMIZED: Much larger bulb spacing, simplified frame
     */
    createUShapeMarquee(group, width, height, depth) {
        const THREE = this.THREE;
        
        const parapetTop = height + 1.65;
        const bulbSpacing = 4; // OPTIMIZED: was 1.5 (much fewer bulbs)
        const bulbSize = 0.25;
        const frameZ = depth / 2 + 0.6;
        
        // Bulb materials - fewer colors
        const colors = [0xFF1493, 0x00FFFF, 0xFFD700];
        const bulbMats = colors.map(color => new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8,
            roughness: 0.3
        }));
        
        const bulbGeo = new THREE.SphereGeometry(bulbSize, 4, 4);
        const bulbs = [];
        let bulbIndex = 0;
        
        // Frame backing material
        const frameMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.8
        });
        
        // Gold trim material
        const goldMat = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            roughness: 0.3,
            metalness: 0.7
        });
        
        // === TOP HORIZONTAL STRIP (frame + single trim) ===
        const topFrameGeo = new THREE.BoxGeometry(width + 2, 1, 0.3);
        const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
        topFrame.position.set(0, parapetTop, frameZ);
        group.add(topFrame);
        
        // OPTIMIZED: Single trim instead of two
        const topTrimGeo = new THREE.BoxGeometry(width + 2.2, 0.2, 0.35);
        const topTrim = new THREE.Mesh(topTrimGeo, goldMat);
        topTrim.position.set(0, parapetTop + 0.5, frameZ);
        group.add(topTrim);
        
        // OPTIMIZED: Fewer top bulbs
        for (let x = -width / 2; x <= width / 2; x += bulbSpacing) {
            const bulb = new THREE.Mesh(bulbGeo, bulbMats[bulbIndex % colors.length]);
            bulb.position.set(x, parapetTop, frameZ + 0.2);
            group.add(bulb);
            bulbs.push(bulb);
            bulbIndex++;
        }
        
        // === VERTICAL STRIPS (simplified - no trims) ===
        const sideHeight = parapetTop;
        const sideFrameGeo = new THREE.BoxGeometry(0.8, sideHeight, 0.3);
        
        const leftFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        leftFrame.position.set(-width / 2 - 0.5, sideHeight / 2, frameZ);
        group.add(leftFrame);
        
        const rightFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        rightFrame.position.set(width / 2 + 0.5, sideHeight / 2, frameZ);
        group.add(rightFrame);
        
        // OPTIMIZED: Fewer side bulbs (just 3 per side)
        for (let i = 0; i < 3; i++) {
            const y = parapetTop - 4 - i * 4;
            if (y < 1) continue;
            
            const leftBulb = new THREE.Mesh(bulbGeo, bulbMats[bulbIndex % colors.length]);
            leftBulb.position.set(-width / 2 - 0.5, y, frameZ + 0.2);
            group.add(leftBulb);
            bulbs.push(leftBulb);
            bulbIndex++;
            
            const rightBulb = new THREE.Mesh(bulbGeo, bulbMats[bulbIndex % colors.length]);
            rightBulb.position.set(width / 2 + 0.5, y, frameZ + 0.2);
            group.add(rightBulb);
            bulbs.push(rightBulb);
            bulbIndex++;
        }
        
        // Store bulbs for animation
        this.animatedElements.push({
            type: 'marqueeBulbs',
            bulbs: bulbs,
            colors: colors
        });
    }
    
    getDecorationColliders() {
        return this.decorationColliders || [];
    }
    
    /**
     * Update - HEAVILY THROTTLED for performance
     */
    update(time, delta) {
        // Update props (they have their own throttling)
        this.props.forEach(prop => {
            if (prop.update) {
                prop.update(time, delta);
            }
        });
        
        // Casino sign - only subtle pulse, NO canvas redraw
        this.animatedElements.forEach(elem => {
            if (elem.type === 'casinoSign') {
                // Just a subtle Y bob - no expensive canvas operations
                const pulse = Math.sin(time * 2) * 0.1;
                elem.mesh.position.y = elem.baseY + pulse;
            }
        });
    }
    
    getLights() {
        let allLights = [...this.lights];
        this.props.forEach(prop => {
            if (prop.lights) {
                allLights = allLights.concat(prop.lights);
            }
        });
        return allLights;
    }
    
    dispose() {
        this.props.forEach(prop => {
            if (prop.dispose) {
                prop.dispose();
            } else if (prop.cleanup) {
                prop.cleanup();
            }
        });
        
        this.animatedElements.forEach(elem => {
            if (elem.mesh) {
                if (elem.mesh.geometry) elem.mesh.geometry.dispose();
                if (elem.mesh.material) {
                    if (Array.isArray(elem.mesh.material)) {
                        elem.mesh.material.forEach(m => m.dispose());
                    } else {
                        elem.mesh.material.dispose();
                    }
                }
            }
        });
        
        this.props = [];
        this.lights = [];
        this.animatedElements = [];
    }
}

export function createCasinoExterior(THREE, config = {}) {
    const exterior = new CasinoExterior(THREE);
    const mesh = exterior.build(config);
    
    return {
        mesh,
        update: (time, delta) => exterior.update(time, delta),
        lights: exterior.getLights(),
        dispose: () => exterior.dispose(),
        props: exterior.props,
        getDecorationColliders: () => exterior.getDecorationColliders()
    };
}

export default CasinoExterior;
