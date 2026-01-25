
/**
 * Casino - Walkable building with open front and 2nd floor bar
 * Players can walk inside and climb stairs to the bar area
 * Contains a portal to warp to the Casino Game Room
 * 
 * VEGAS STYLE exterior with:
 * - Cream/gold Art Deco facade
 * - Neon trim and animated marquee bulbs
 * - Grand entrance with columns
 * - Animated elements built-in (no separate CasinoExterior)
 */

import BaseBuilding from './BaseBuilding';
import AnimatedRouletteWheel from '../props/casino/AnimatedRouletteWheel';
import PBRSlotReels from '../props/casino/PBRSlotReels';
import GoldenDiceTower from '../props/casino/GoldenDiceTower';
import NeonTubing from '../props/casino/NeonTubing';

class Casino extends BaseBuilding {
    constructor(THREE) {
        super(THREE);
        
        // Animated elements
        this.marqueBulbs = [];
        this.neonTubes = [];
        this.rouletteWheel = null;
        this.floatingText = null;
        this.slotMachineDisplay = null;
        
        // Exterior props
        this.exteriorProps = [];
        this.coinStacks = [];
        this.spotlights = [];
        
        // Mobile/Apple GPU detection for performance optimizations
        this.isMobileGPU = typeof window !== 'undefined' && window._isMobileGPU;
        this.isAppleDevice = typeof window !== 'undefined' && window._isAppleDevice;
        this.needsOptimization = this.isMobileGPU || this.isAppleDevice;
    }
    
    build({ w = 36, h = 14, d = 32 } = {}) {
        const THREE = this.THREE;
        const group = this.group;
        group.name = 'casino_building';

        // ==================== VEGAS COLOR PALETTE ====================
        const creamWhite = 0xFFF8E7;      // Main facade
        const goldAccent = 0xFFD700;       // Gold trim
        const warmGold = 0xDAA520;         // Darker gold accents
        const burgundy = 0x800020;         // Rich accent color
        const neonPink = 0xFF1493;         // Neon trim
        const neonCyan = 0x00FFFF;         // Neon accent
        const neonYellow = 0xFFFF00;       // Marquee bulbs
        const carpetRed = 0x8B0000;        // Interior carpet
        const interiorWall = 0x2a1a2e;     // Dark interior walls
        const barWood = 0x3d2817;          // Bar wood

        // ==================== GROUND FLOOR ====================
        // Floor - flat red carpet texture
        const carpetMat = this.getMaterial(carpetRed, { 
            roughness: 0.9,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        const carpetGeo = new THREE.PlaneGeometry(w - 0.5, d - 0.5);
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.y = 0.02;
        carpet.receiveShadow = true;
        group.add(carpet);

        // ==================== EXTERIOR FACADE (VEGAS STYLE) ====================
        const facadeMat = this.getMaterial(creamWhite, { roughness: 0.6 });
        const facadeAccentMat = this.getMaterial(warmGold, { roughness: 0.4, metalness: 0.3 });
        const goldTrimMat = this.getMaterial(goldAccent, { metalness: 0.8, roughness: 0.2 });
        const burgundyMat = this.getMaterial(burgundy, { roughness: 0.7 });
        
        // Back wall - cream facade (interior dark)
        const backWallGeo = new THREE.BoxGeometry(w, h, 0.8);
        const backWall = new THREE.Mesh(backWallGeo, facadeMat);
        backWall.position.set(0, h / 2, -d / 2 + 0.4);
        backWall.castShadow = true;
        group.add(backWall);
        
        // Interior back wall overlay (dark)
        const interiorBackMat = this.getMaterial(interiorWall, { roughness: 0.85 });
        const interiorBackGeo = new THREE.BoxGeometry(w - 1, h - 0.5, 0.1);
        const interiorBack = new THREE.Mesh(interiorBackGeo, interiorBackMat);
        interiorBack.position.set(0, h / 2, -d / 2 + 0.9);
        group.add(interiorBack);

        // Left wall - layered facade
        const leftWallGeo = new THREE.BoxGeometry(0.8, h, d);
        const leftWall = new THREE.Mesh(leftWallGeo, facadeMat);
        leftWall.position.set(-w / 2 + 0.4, h / 2, 0);
        leftWall.castShadow = true;
        group.add(leftWall);
        
        // Interior left wall overlay
        const interiorLeftGeo = new THREE.BoxGeometry(0.1, h - 0.5, d - 1);
        const interiorLeft = new THREE.Mesh(interiorLeftGeo, interiorBackMat);
        interiorLeft.position.set(-w / 2 + 0.9, h / 2, 0);
        group.add(interiorLeft);

        // Right wall
        const rightWall = new THREE.Mesh(leftWallGeo, facadeMat);
        rightWall.position.set(w / 2 - 0.4, h / 2, 0);
        rightWall.castShadow = true;
        group.add(rightWall);
        
        // Interior right wall overlay
        const interiorRight = new THREE.Mesh(interiorLeftGeo, interiorBackMat);
        interiorRight.position.set(w / 2 - 0.9, h / 2, 0);
        group.add(interiorRight);

        // Front wall sections - OPEN entrance
        const entranceWidth = 12;
        const frontSectionWidth = (w - entranceWidth) / 2;
        
        // Front left facade section
        const frontWallLeftGeo = new THREE.BoxGeometry(frontSectionWidth, h, 0.8);
        const frontWallLeft = new THREE.Mesh(frontWallLeftGeo, facadeMat);
        frontWallLeft.position.set(-w / 2 + frontSectionWidth / 2 + 0.4, h / 2, d / 2 - 0.4);
        group.add(frontWallLeft);

        // Front right facade section
        const frontWallRight = new THREE.Mesh(frontWallLeftGeo, facadeMat);
        frontWallRight.position.set(w / 2 - frontSectionWidth / 2 - 0.4, h / 2, d / 2 - 0.4);
        group.add(frontWallRight);

        // Top front section (above entrance) - Art Deco style
        const entranceTopGeo = new THREE.BoxGeometry(entranceWidth + 2, h - 6, 0.8);
        const entranceTop = new THREE.Mesh(entranceTopGeo, facadeMat);
        entranceTop.position.set(0, h - (h - 6) / 2, d / 2 - 0.4);
        group.add(entranceTop);
        
        // ==================== ART DECO FACADE DETAILS (ALL SIDES) ====================
        
        // FRONT FACADE - Horizontal gold trim bands (LEFT and RIGHT of entrance only)
        const leftTrimWidth = frontSectionWidth - 1;
        const rightTrimWidth = frontSectionWidth - 1;
        
        [2, 5, h - 1].forEach(yPos => {
            // Left trim (before entrance)
            const leftTrimGeo = new THREE.BoxGeometry(leftTrimWidth, 0.25, 0.25);
            const leftTrim = new THREE.Mesh(leftTrimGeo, goldTrimMat);
            leftTrim.position.set(-w/2 + leftTrimWidth/2 + 0.5, yPos, d / 2 + 0.5);
            group.add(leftTrim);
            
            // Right trim (after entrance)
            const rightTrimGeo = new THREE.BoxGeometry(rightTrimWidth, 0.25, 0.25);
            const rightTrim = new THREE.Mesh(rightTrimGeo, goldTrimMat);
            rightTrim.position.set(w/2 - rightTrimWidth/2 - 0.5, yPos, d / 2 + 0.5);
            group.add(rightTrim);
        });
        
        // SIDE WALLS - Horizontal gold trim bands
        [2, 5, h - 1].forEach(yPos => {
            // Left side
            const leftSideTrimGeo = new THREE.BoxGeometry(0.25, 0.25, d - 2);
            const leftSideTrim = new THREE.Mesh(leftSideTrimGeo, goldTrimMat);
            leftSideTrim.position.set(-w/2 - 0.5, yPos, 0);
            group.add(leftSideTrim);
            
            // Right side
            const rightSideTrim = new THREE.Mesh(leftSideTrimGeo, goldTrimMat);
            rightSideTrim.position.set(w/2 + 0.5, yPos, 0);
            group.add(rightSideTrim);
        });
        
        // BACK WALL - Horizontal gold trim bands
        [2, 5, h - 1].forEach(yPos => {
            const backTrimGeo = new THREE.BoxGeometry(w - 2, 0.25, 0.25);
            const backTrim = new THREE.Mesh(backTrimGeo, goldTrimMat);
            backTrim.position.set(0, yPos, -d/2 - 0.5);
            group.add(backTrim);
        });
        
        // Vertical gold pilasters on front facade (only on solid wall sections)
        const pilasterGeo = new THREE.BoxGeometry(0.5, h, 0.35);
        // Left section pilasters
        [-w/2 + 2, -w/2 + frontSectionWidth - 2].forEach(xPos => {
            const pilaster = new THREE.Mesh(pilasterGeo, facadeAccentMat);
            pilaster.position.set(xPos, h / 2, d / 2 + 0.55);
            group.add(pilaster);
        });
        // Right section pilasters
        [w/2 - frontSectionWidth + 2, w/2 - 2].forEach(xPos => {
            const pilaster = new THREE.Mesh(pilasterGeo, facadeAccentMat);
            pilaster.position.set(xPos, h / 2, d / 2 + 0.55);
            group.add(pilaster);
        });
        
        // Side wall pilasters
        const sidePilasterGeo = new THREE.BoxGeometry(0.35, h, 0.5);
        [-d/4, d/4].forEach(zPos => {
            // Left side
            const leftPilaster = new THREE.Mesh(sidePilasterGeo, facadeAccentMat);
            leftPilaster.position.set(-w/2 - 0.55, h / 2, zPos);
            group.add(leftPilaster);
            // Right side
            const rightPilaster = new THREE.Mesh(sidePilasterGeo, facadeAccentMat);
            rightPilaster.position.set(w/2 + 0.55, h / 2, zPos);
            group.add(rightPilaster);
        });
        
        // Burgundy accent panels on front (only on solid sections, not entrance)
        const panelGeo = new THREE.BoxGeometry(3.5, 2.5, 0.1);
        [-w/2 + frontSectionWidth/2, w/2 - frontSectionWidth/2].forEach(xPos => {
            const panel = new THREE.Mesh(panelGeo, burgundyMat);
            panel.position.set(xPos, 3.5, d / 2 + 0.65);
            group.add(panel);
        });

        // ==================== GRAND ENTRANCE (NO BLOCKING) ====================
        // Entrance columns positioned OUTSIDE entrance opening
        const columnMat = this.getMaterial(creamWhite, { roughness: 0.5 });
        const columnPositions = [
            { x: -entranceWidth / 2 - 1.5, z: d / 2 + 2 },
            { x: entranceWidth / 2 + 1.5, z: d / 2 + 2 },
        ];
        
        columnPositions.forEach(pos => {
            // Column base (stepped) - clear of entrance
            const base1Geo = new THREE.BoxGeometry(2, 0.35, 2);
            const base1 = new THREE.Mesh(base1Geo, goldTrimMat);
            base1.position.set(pos.x, 0.18, pos.z);
            group.add(base1);
            
            const base2Geo = new THREE.BoxGeometry(1.6, 0.25, 1.6);
            const base2 = new THREE.Mesh(base2Geo, goldTrimMat);
            base2.position.set(pos.x, 0.48, pos.z);
            group.add(base2);
            
            // Main column shaft
            const columnGeo = new THREE.CylinderGeometry(0.6, 0.7, h - 2, 12);
            const column = new THREE.Mesh(columnGeo, columnMat);
            column.position.set(pos.x, h / 2, pos.z);
            group.add(column);
            
            // Column rings
            for (let i = 1; i < 4; i++) {
                const ringGeo = new THREE.TorusGeometry(0.65, 0.05, 6, 16);
                const ring = new THREE.Mesh(ringGeo, goldTrimMat);
                ring.position.set(pos.x, i * 3, pos.z);
                ring.rotation.x = Math.PI / 2;
                group.add(ring);
            }
            
            // Column capital
            const capitalGeo = new THREE.CylinderGeometry(0.9, 0.6, 0.7, 12);
            const capital = new THREE.Mesh(capitalGeo, goldTrimMat);
            capital.position.set(pos.x, h - 0.55, pos.z);
            group.add(capital);
            
            // Capital crown
            const crownGeo = new THREE.BoxGeometry(1.8, 0.25, 1.8);
            const crown = new THREE.Mesh(crownGeo, goldTrimMat);
            crown.position.set(pos.x, h - 0.13, pos.z);
            group.add(crown);
        });
        
        // Entrance canopy - ABOVE entrance, not blocking
        const canopyGeo = new THREE.BoxGeometry(entranceWidth + 6, 0.35, 2.5);
        const canopy = new THREE.Mesh(canopyGeo, burgundyMat);
        canopy.position.set(0, 6.8, d / 2 + 2.25);
        group.add(canopy);
        
        // Gold trim on canopy front edge only
        const canopyTrimGeo = new THREE.BoxGeometry(entranceWidth + 6.2, 0.12, 0.15);
        const canopyTrim = new THREE.Mesh(canopyTrimGeo, goldTrimMat);
        canopyTrim.position.set(0, 6.68, d / 2 + 3.45);
        group.add(canopyTrim);

        // ==================== RED CARPET WITH VELVET ROPES ====================
        // Simplified on mobile (fewer rope posts)
        this.createRedCarpet(group, d, goldTrimMat);
        
        // ==================== GOLDEN DICE TOWERS ====================
        // Apple/Mobile: Reduced dice count for performance
        if (!this.needsOptimization) {
            [-1, 1].forEach(side => {
                const diceTower = new GoldenDiceTower(THREE);
                diceTower.spawn(group, side * 10, 0, d / 2 + 4, {
                    diceCount: 4,
                    diceSize: 1.2,
                    baseRadius: 1.8
                });
                this.exteriorProps.push(diceTower);
            });
        } else {
            // Mobile: Single smaller dice tower
            const diceTower = new GoldenDiceTower(THREE);
            diceTower.spawn(group, 10, 0, d / 2 + 4, {
                diceCount: 2,
                diceSize: 1.0,
                baseRadius: 1.5
            });
            this.exteriorProps.push(diceTower);
        }
        
        // ==================== NEON CARD SUITS ====================
        // Apple/Mobile: Only 2 suits instead of 4
        const suits = this.needsOptimization ? ['heart', 'spade'] : ['heart', 'diamond', 'spade', 'club'];
        const suitColors = this.needsOptimization ? [0xFF0044, 0x00DDFF] : [0xFF0044, 0xFF0088, 0x00DDFF, 0x44FF44];
        const suitSpacing = this.needsOptimization ? w / 2.5 : w / 4.5;
        suits.forEach((suit, idx) => {
            const suitNeon = new NeonTubing(THREE);
            const xPos = this.needsOptimization ? (idx === 0 ? -w / 4 : w / 4) : -w / 3 + (idx * suitSpacing);
            suitNeon.spawn(group, xPos, h - 2, d / 2 + 1.5, {
                shape: suit,
                size: this.needsOptimization ? 1.0 : 1.2,
                color: suitColors[idx],
                glowIntensity: this.needsOptimization ? 0.6 : 0.9
            });
            this.exteriorProps.push(suitNeon);
        });
        
        // ==================== NEON DOLLAR SIGNS ====================
        // Apple/Mobile: Skip dollar signs (too many draw calls)
        if (!this.needsOptimization) {
            [-1, 1].forEach(side => {
                const dollarNeon = new NeonTubing(THREE);
                dollarNeon.spawn(group, side * (w / 2 - 5), h - 4, d / 2 + 1.5, {
                    shape: 'dollar',
                    size: 2,
                    color: 0x00FF44,
                    glowIntensity: 1.0
                });
                this.exteriorProps.push(dollarNeon);
            });
        }
        
        // ==================== ANIMATED COIN STACKS ====================
        // Apple/Mobile: Reduced coin stacks
        if (!this.needsOptimization) {
            this.createCoinStacks(group, w, d);
        }
        
        // ==================== SPOTLIGHTS ====================
        // Already skipped on mobile in createSpotlights()
        this.createSpotlights(group, w, h, d);

        // ==================== ROOFTOP / PARAPET (ALL SIDES) ====================
        // Ceiling inset by 1 on each side to sit inside walls (not overlap)
        const ceilingMat = this.getMaterial(0x1a1a2a, { roughness: 0.95 });
        const ceilingGeo = new THREE.BoxGeometry(w - 2, 0.25, d - 2);
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.position.set(0, h, 0);
        group.add(ceiling);
        
        const parapetHeight = 1.8;
        const ceilingTop = h + 0.13;
        
        // Parapet material with polygonOffset to prevent z-fighting
        const parapetMat = this.getMaterial(creamWhite, { 
            roughness: 0.6,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        });
        
        // Front parapet - sits on top of wall
        const mainParapetGeo = new THREE.BoxGeometry(w + 0.4, parapetHeight, 0.6);
        const mainParapet = new THREE.Mesh(mainParapetGeo, parapetMat);
        mainParapet.position.set(0, ceilingTop + parapetHeight / 2, d / 2);
        group.add(mainParapet);
        
        // Art Deco stepped crown on front
        const crownStep1Geo = new THREE.BoxGeometry(10, 1.3, 0.65);
        const crownStep1 = new THREE.Mesh(crownStep1Geo, parapetMat);
        crownStep1.position.set(0, ceilingTop + parapetHeight + 0.65, d / 2 + 0.1);
        group.add(crownStep1);
        
        const crownStep2Geo = new THREE.BoxGeometry(6, 0.9, 0.65);
        const crownStep2 = new THREE.Mesh(crownStep2Geo, parapetMat);
        crownStep2.position.set(0, ceilingTop + parapetHeight + 1.75, d / 2 + 0.1);
        group.add(crownStep2);
        
        // Gold sunburst on crown
        const sunburstMat = this.getMaterial(goldAccent, { 
            metalness: 0.9, 
            roughness: 0.2,
            emissive: goldAccent,
            emissiveIntensity: 0.3
        });
        const sunburstGeo = new THREE.CircleGeometry(1.3, 16);
        const sunburst = new THREE.Mesh(sunburstGeo, sunburstMat);
        sunburst.position.set(0, ceilingTop + parapetHeight + 1.75, d / 2 + 0.45);
        group.add(sunburst);
        
        // Side parapets - sit on top of walls
        const sideParapetGeo = new THREE.BoxGeometry(0.6, parapetHeight, d + 0.4);
        [-1, 1].forEach(side => {
            const sideParapet = new THREE.Mesh(sideParapetGeo, parapetMat);
            sideParapet.position.set(side * (w / 2), ceilingTop + parapetHeight / 2, 0);
            group.add(sideParapet);
        });
        
        // Back parapet - sits on top of wall
        const backParapetGeo = new THREE.BoxGeometry(w + 0.4, parapetHeight, 0.6);
        const backParapet = new THREE.Mesh(backParapetGeo, parapetMat);
        backParapet.position.set(0, ceilingTop + parapetHeight / 2, -d / 2);
        group.add(backParapet);
        
        // Gold trim along all parapet tops
        const frontParapetTrimGeo = new THREE.BoxGeometry(w + 0.6, 0.15, 0.35);
        const frontParapetTrim = new THREE.Mesh(frontParapetTrimGeo, goldTrimMat);
        frontParapetTrim.position.set(0, ceilingTop + parapetHeight + 0.08, d / 2 + 0.15);
        group.add(frontParapetTrim);
        
        const sideParapetTrimGeo = new THREE.BoxGeometry(0.35, 0.15, d + 0.6);
        [-1, 1].forEach(side => {
            const sideTrim = new THREE.Mesh(sideParapetTrimGeo, goldTrimMat);
            sideTrim.position.set(side * (w / 2 + 0.15), ceilingTop + parapetHeight + 0.08, 0);
            group.add(sideTrim);
        });
        
        const backParapetTrimGeo = new THREE.BoxGeometry(w + 0.6, 0.15, 0.35);
        const backParapetTrim = new THREE.Mesh(backParapetTrimGeo, goldTrimMat);
        backParapetTrim.position.set(0, ceilingTop + parapetHeight + 0.08, -d / 2 - 0.15);
        group.add(backParapetTrim);

        // ==================== ANIMATED ROULETTE WHEEL ON ROOF (Centered backdrop for sign) ====================
        const rouletteWheel = new AnimatedRouletteWheel(THREE);
        rouletteWheel.spawn(group, 0, h + 5, d / 2 + 1, {
            wheelRadius: 5,
            tiltAngle: Math.PI / 2.5  // More upright to serve as backdrop
        });
        this.rouletteWheelProp = rouletteWheel;
        if (rouletteWheel.group) {
            this.rouletteWheel = rouletteWheel.group;
        }

        // ==================== FLOATING "CASINO" TEXT (Vegas Style - In front of wheel) ====================
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 1024;
        signCanvas.height = 256;
        const signCtx = signCanvas.getContext('2d');
        
        // Draw Vegas-style casino sign
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
        signSprite.position.set(0, h + 5, d / 2 + 3);  // In front of roulette wheel
        signSprite.renderOrder = 100;
        signSprite.userData.isFloatingText = true;
        signSprite.userData.baseY = h + 5;
        group.add(signSprite);
        this.floatingText = signSprite;
        
        // Accent light under sign - Apple/Mobile: skip
        if (!this.needsOptimization) {
            const signLight = new THREE.PointLight(0xFFAA00, 2, 20);
            signLight.position.set(0, h + 1, d / 2 + 4);
            group.add(signLight);
            this.lights.push(signLight);
        }

        // ==================== PBR SLOT REELS DISPLAY (Above Entrance Canopy) ====================
        const slotDisplay = new PBRSlotReels(THREE);
        slotDisplay.spawn(group, 0, 10, d / 2 + 1.5, {
            width: 10,
            height: 6,
            reelCount: 3,
            symbolsPerReel: 6,
            frameColor: 0xFFD700
        });
        this.slotMachineDisplay = slotDisplay;

        // ==================== NEON OUTLINE (ABOVE ENTRANCE) ====================
        const neonMat = this.getMaterial(neonPink, {
            emissive: neonPink,
            emissiveIntensity: 1.0,
            roughness: 0.3
        });
        
        // Neon frame around upper facade (above entrance)
        const neonTopGeo = new THREE.BoxGeometry(entranceWidth + 2, 0.15, 0.15);
        const neonTop = new THREE.Mesh(neonTopGeo, neonMat);
        neonTop.position.set(0, h - 0.5, d / 2 + 0.75);
        group.add(neonTop);
        this.neonTubes.push(neonTop);
        
        const neonBottomGeo = new THREE.BoxGeometry(entranceWidth + 2, 0.15, 0.15);
        const neonBottom = new THREE.Mesh(neonBottomGeo, neonMat);
        neonBottom.position.set(0, 6.9, d / 2 + 0.75);
        group.add(neonBottom);
        this.neonTubes.push(neonBottom);
        
        // Vertical neon sides (beside entrance)
        const neonSideGeo = new THREE.BoxGeometry(0.15, h - 7.4, 0.15);
        [-entranceWidth/2 - 0.9, entranceWidth/2 + 0.9].forEach(xPos => {
            const neonSide = new THREE.Mesh(neonSideGeo, neonMat);
            neonSide.position.set(xPos, (h + 6.9) / 2, d / 2 + 0.75);
            group.add(neonSide);
            this.neonTubes.push(neonSide);
        });
        
        // ==================== MARQUEE BULBS (AROUND CANOPY) ====================
        const bulbGeo = new THREE.SphereGeometry(0.1, 8, 6);
        const bulbsPerSide = 18;
        
        // Front edge of canopy
        for (let i = 0; i < bulbsPerSide; i++) {
            const x = -entranceWidth / 2 - 2.5 + (i / (bulbsPerSide - 1)) * (entranceWidth + 5);
            const bulbMat = new THREE.MeshStandardMaterial({
                color: neonYellow,
                emissive: neonYellow,
                emissiveIntensity: 0.8,
                roughness: 0.3
            });
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.set(x, 6.55, d / 2 + 3.4);
            bulb.userData.bulbIndex = i;
            bulb.userData.bulbMat = bulbMat;
            group.add(bulb);
            this.marqueBulbs.push(bulb);
        }
        
        // Side edges of canopy
        for (let i = 0; i < 5; i++) {
            const z = d / 2 + 1 + (i / 4) * 2.3;
            [-entranceWidth / 2 - 2.8, entranceWidth / 2 + 2.8].forEach((x, sideIdx) => {
                const bulbMat = new THREE.MeshStandardMaterial({
                    color: neonYellow,
                    emissive: neonYellow,
                    emissiveIntensity: 0.8,
                    roughness: 0.3
                });
                const bulb = new THREE.Mesh(bulbGeo, bulbMat);
                bulb.position.set(x, 6.55, z);
                bulb.userData.bulbIndex = bulbsPerSide + i + sideIdx * 5;
                bulb.userData.bulbMat = bulbMat;
                group.add(bulb);
                this.marqueBulbs.push(bulb);
            });
        }

        // Pillar gold accents (keeping compatible with old code)
        const pillarGoldMat = goldTrimMat;

        // ==================== 2ND FLOOR (BAR AREA) ====================
        const secondFloorHeight = 5;
        const secondFloorDepth = d * 0.5;

        // 2nd floor platform - FULL WIDTH
        const floorMat = this.getMaterial(barWood, { roughness: 0.7 });
        const secondFloorGeo = new THREE.BoxGeometry(w - 1, 0.4, secondFloorDepth);
        const secondFloor = new THREE.Mesh(secondFloorGeo, floorMat);
        secondFloor.position.set(0, secondFloorHeight, -d / 2 + secondFloorDepth / 2 + 0.5);
        secondFloor.receiveShadow = true;
        secondFloor.castShadow = true;
        group.add(secondFloor);

        // ==================== STAIRS (Proper individual steps for visual quality) ====================
        const stairWidth = 4;
        const stairMat = this.getMaterial(0x2a2a3a, { roughness: 0.7 });
        const stairTrimMat = this.getMaterial(goldAccent, { metalness: 0.7, roughness: 0.3 });
        
        const stairStartZ = d / 2 - 3;
        const stairEndZ = -d / 2 + secondFloorDepth + 0.5;
        const totalStairRun = stairStartZ - stairEndZ;
        const stairHeight = 0.4;
        const numStairs = Math.ceil(secondFloorHeight / stairHeight);
        const stairDepth = totalStairRun / numStairs;

        // Create proper individual stairs for visual quality
        for (let i = 0; i < numStairs; i++) {
            const stepGeo = new THREE.BoxGeometry(stairWidth, stairHeight, stairDepth);
            const step = new THREE.Mesh(stepGeo, stairMat);
            step.position.set(
                -w / 2 + stairWidth / 2 + 1,
                i * stairHeight + stairHeight / 2,
                stairStartZ - i * stairDepth - stairDepth / 2
            );
            step.receiveShadow = true;
            step.castShadow = true;
            group.add(step);
            
            // Gold trim on front of each step (every 2nd step for performance)
            if (i % 2 === 0) {
                const trimGeo = new THREE.BoxGeometry(stairWidth - 0.1, 0.08, 0.08);
                const trim = new THREE.Mesh(trimGeo, stairTrimMat);
                trim.position.set(
                    -w / 2 + stairWidth / 2 + 1,
                    (i + 1) * stairHeight,
                    stairStartZ - i * stairDepth - stairDepth
                );
                group.add(trim);
            }
        }

        // Railing for 2nd floor - with gap for stairs
        const railingMat = this.getMaterial(goldAccent, { metalness: 0.8, roughness: 0.2 });
        
        // Right railing section (from stair opening to right wall)
        const rightRailingWidth = w - 1 - stairWidth - 2;
        const railingGeo = new THREE.BoxGeometry(rightRailingWidth, 0.1, 0.1);
        const railing = new THREE.Mesh(railingGeo, railingMat);
        railing.position.set((stairWidth + 2) / 2, secondFloorHeight + 1.2, -d / 2 + secondFloorDepth + 0.5);
        group.add(railing);

        // OPTIMIZED: Only 3 railing posts instead of ~7
        const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6);
        const postStartX = -w / 2 + stairWidth + 3;
        for (let i = 0; i < 3; i++) {
            const post = new THREE.Mesh(postGeo, railingMat);
            post.position.set(postStartX + i * 8, secondFloorHeight + 0.6, -d / 2 + secondFloorDepth + 0.5);
            group.add(post);
        }

        // ==================== BAR COUNTER (2nd Floor - Against Back Wall) ====================
        const barCounterMat = this.getMaterial(barWood, { roughness: 0.6 });
        const barCounterGeo = new THREE.BoxGeometry(w - 4, 1.2, 1.5);
        const barCounter = new THREE.Mesh(barCounterGeo, barCounterMat);
        barCounter.position.set(0, secondFloorHeight + 0.6, -d / 2 + 2);
        barCounter.castShadow = true;
        group.add(barCounter);

        // Bar counter top
        const barTopMat = this.getMaterial(0x1a0a0a, { roughness: 0.2, metalness: 0.4 });
        const barTopGeo = new THREE.BoxGeometry(w - 3.8, 0.15, 1.7);
        const barTop = new THREE.Mesh(barTopGeo, barTopMat);
        barTop.position.set(0, secondFloorHeight + 1.28, -d / 2 + 2);
        group.add(barTop);

        // ==================== BAR STOOLS (8 proper stools with base, pole, and seat) ====================
        const stoolMetalMat = this.getMaterial(0x333333, { metalness: 0.7, roughness: 0.3 });
        const stoolSeatMat = this.getMaterial(carpetRed, { roughness: 0.7 });
        
        // Store stool positions for furniture data
        const stoolPositions = [];
        
        for (let i = 0; i < 8; i++) {
            const stoolX = -w / 2 + 4 + i * 4;
            const stoolZ = -d / 2 + 3.8;
            
            // Stool base (circular)
            const baseGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.15, 12);
            const base = new THREE.Mesh(baseGeo, stoolMetalMat);
            base.position.set(stoolX, secondFloorHeight + 0.08, stoolZ);
            group.add(base);
            
            // Stool pole
            const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 8);
            const pole = new THREE.Mesh(poleGeo, stoolMetalMat);
            pole.position.set(stoolX, secondFloorHeight + 0.65, stoolZ);
            group.add(pole);
            
            // Cushioned seat
            const seatGeo = new THREE.CylinderGeometry(0.38, 0.35, 0.18, 12);
            const seat = new THREE.Mesh(seatGeo, stoolSeatMat);
            seat.position.set(stoolX, secondFloorHeight + 1.3, stoolZ);
            group.add(seat);
            
            // Store for furniture data
            stoolPositions.push({
                localX: stoolX,
                localZ: stoolZ
            });
        }
        
        // Store stool positions for external access
        group.userData.stoolPositions = stoolPositions;

        // ==================== COUCH (Proper velvet couch with cushions and armrests) ====================
        const couchGroup = new THREE.Group();
        const couchMat = this.getMaterial(0x2a1a3a, { roughness: 0.8 });
        const cushionMat = this.getMaterial(0x4a2a5a, { roughness: 0.9 });
        const couchGoldMat = this.getMaterial(goldAccent, { metalness: 0.7, roughness: 0.3 });
        
        // Couch base
        const couchBaseGeo = new THREE.BoxGeometry(6, 0.6, 2.2);
        const couchBase = new THREE.Mesh(couchBaseGeo, couchMat);
        couchBase.position.y = 0.3;
        couchGroup.add(couchBase);
        
        // Couch back
        const couchBackGeo = new THREE.BoxGeometry(6, 1.8, 0.5);
        const couchBack = new THREE.Mesh(couchBackGeo, couchMat);
        couchBack.position.set(0, 1.0, -0.85);
        couchGroup.add(couchBack);
        
        // Armrests
        const armrestGeo = new THREE.BoxGeometry(0.5, 0.9, 2.2);
        [-1, 1].forEach(side => {
            const armrest = new THREE.Mesh(armrestGeo, couchMat);
            armrest.position.set(side * 2.75, 0.75, 0);
            couchGroup.add(armrest);
        });
        
        // Seat cushions (3 cushions)
        const cushionGeo = new THREE.BoxGeometry(1.8, 0.25, 1.6);
        for (let i = 0; i < 3; i++) {
            const cushion = new THREE.Mesh(cushionGeo, cushionMat);
            cushion.position.set(-2 + i * 2, 0.75, 0.1);
            couchGroup.add(cushion);
        }
        
        // Gold feet (decorative)
        const footGeo = new THREE.BoxGeometry(0.25, 0.15, 0.25);
        [[-2.7, -0.8], [2.7, -0.8], [-2.7, 0.8], [2.7, 0.8]].forEach(([x, z]) => {
            const foot = new THREE.Mesh(footGeo, couchGoldMat);
            foot.position.set(x, 0.08, z);
            couchGroup.add(foot);
        });
        
        couchGroup.position.set(w / 2 - 5, secondFloorHeight + 0.2, -d / 2 + secondFloorDepth / 2);
        couchGroup.rotation.y = -Math.PI / 2;
        group.add(couchGroup);

        // ==================== TV SCREEN (2nd Floor) ====================
        const tvGroup = new THREE.Group();
        
        // TV Frame (25% larger)
        const tvFrameMat = this.getMaterial(0x111111, { roughness: 0.3, metalness: 0.8 });
        const tvFrameGeo = new THREE.BoxGeometry(10, 5.625, 0.3);
        const tvFrame = new THREE.Mesh(tvFrameGeo, tvFrameMat);
        tvGroup.add(tvFrame);
        
        // TV Screen - Create canvas texture for DexScreener-style chart display
        const tvCanvas = document.createElement('canvas');
        tvCanvas.width = 512;
        tvCanvas.height = 256;
        const tvCtx = tvCanvas.getContext('2d');
        
        // Draw $WADDLE chart display
        const drawTVScreen = () => {
            const W = 512, H = 256;
            
            // Dark background
            tvCtx.fillStyle = '#0d1117';
            tvCtx.fillRect(0, 0, W, H);
            
            // Chart area (leave room for header)
            const chartTop = 65;
            const chartBottom = H - 15;
            const chartLeft = 15;
            const chartRight = W - 15;
            const chartHeight = chartBottom - chartTop;
            const chartWidth = chartRight - chartLeft;
            
            // Grid lines
            tvCtx.strokeStyle = '#1a2332';
            tvCtx.lineWidth = 1;
            for (let i = 0; i <= 8; i++) {
                const x = chartLeft + (chartWidth / 8) * i;
                tvCtx.beginPath();
                tvCtx.moveTo(x, chartTop);
                tvCtx.lineTo(x, chartBottom);
                tvCtx.stroke();
            }
            for (let i = 0; i <= 5; i++) {
                const y = chartTop + (chartHeight / 5) * i;
                tvCtx.beginPath();
                tvCtx.moveTo(chartLeft, y);
                tvCtx.lineTo(chartRight, y);
                tvCtx.stroke();
            }
            
            // Generate candle data (hourly candles)
            const numCandles = 24; // 24 hours
            const candleData = [];
            let price = 0.00045 + Math.random() * 0.0001;
            
            for (let i = 0; i < numCandles; i++) {
                const volatility = 0.15;
                const change = (Math.random() - 0.48) * volatility;
                const open = price;
                const close = price * (1 + change);
                const high = Math.max(open, close) * (1 + Math.random() * 0.05);
                const low = Math.min(open, close) * (1 - Math.random() * 0.05);
                candleData.push({ open, high, low, close });
                price = close;
            }
            
            // Find min/max for auto-scaling
            let minPrice = Infinity, maxPrice = -Infinity;
            candleData.forEach(c => {
                minPrice = Math.min(minPrice, c.low);
                maxPrice = Math.max(maxPrice, c.high);
            });
            const priceRange = maxPrice - minPrice;
            const padding = priceRange * 0.1;
            minPrice -= padding;
            maxPrice += padding;
            
            // Calculate candle dimensions to fit
            const candleSpacing = chartWidth / numCandles;
            const candleWidth = candleSpacing * 0.7;
            const wickWidth = 2;
            
            // Draw candles (auto-scaled to fit)
            candleData.forEach((candle, i) => {
                const x = chartLeft + i * candleSpacing + (candleSpacing - candleWidth) / 2;
                const wickX = x + candleWidth / 2;
                
                // Scale prices to chart coordinates
                const scaleY = (p) => chartBottom - ((p - minPrice) / (maxPrice - minPrice)) * chartHeight;
                
                const openY = scaleY(candle.open);
                const closeY = scaleY(candle.close);
                const highY = scaleY(candle.high);
                const lowY = scaleY(candle.low);
                
                const isGreen = candle.close >= candle.open;
                tvCtx.strokeStyle = isGreen ? '#00ff88' : '#ff4466';
                tvCtx.fillStyle = isGreen ? '#00ff88' : '#ff4466';
                
                // Wick
                tvCtx.fillRect(wickX - wickWidth/2, highY, wickWidth, lowY - highY);
                
                // Body
                const bodyTop = Math.min(openY, closeY);
                const bodyHeight = Math.abs(closeY - openY);
                tvCtx.fillRect(x, bodyTop, candleWidth, Math.max(bodyHeight, 2));
            });
            
            // Header background
            tvCtx.fillStyle = '#0d1117';
            tvCtx.fillRect(0, 0, W, 60);
            
            // Token ticker
            tvCtx.fillStyle = '#00ffff';
            tvCtx.font = 'bold 22px monospace';
            tvCtx.fillText('$CP / SOL', 15, 25);
            
            // Current price
            const currentPrice = candleData[candleData.length - 1].close;
            const priceChange = ((currentPrice / candleData[0].open) - 1) * 100;
            tvCtx.fillStyle = priceChange >= 0 ? '#00ff88' : '#ff4466';
            tvCtx.font = 'bold 20px monospace';
            tvCtx.fillText('$' + currentPrice.toFixed(6), 15, 50);
            
            // Price change
            tvCtx.font = '16px monospace';
            tvCtx.fillText((priceChange >= 0 ? '+' : '') + priceChange.toFixed(2) + '%', 180, 50);
            
            // Timeframe
            tvCtx.fillStyle = '#666';
            tvCtx.font = '14px monospace';
            tvCtx.fillText('1H', chartRight - 25, 25);
            
            // Market cap
            tvCtx.fillStyle = '#888';
            tvCtx.font = '13px monospace';
            tvCtx.fillText('MC: $' + (Math.random() * 500 + 100).toFixed(0) + 'K', chartRight - 120, 50);
        };
        
        drawTVScreen();
        
        const tvTexture = new THREE.CanvasTexture(tvCanvas);
        tvTexture.needsUpdate = true;
        
        const tvScreenMat = new THREE.MeshStandardMaterial({
            map: tvTexture,
            emissive: 0xffffff,
            emissiveMap: tvTexture,
            emissiveIntensity: 0.5,
            roughness: 0.1
        });
        
        const tvScreenGeo = new THREE.PlaneGeometry(9.375, 5);
        const tvScreen = new THREE.Mesh(tvScreenGeo, tvScreenMat);
        tvScreen.position.z = 0.16;
        tvScreen.name = 'casino_tv_screen';
        tvScreen.userData.tvCanvas = tvCanvas;
        tvScreen.userData.tvCtx = tvCtx;
        tvScreen.userData.tvTexture = tvTexture;
        tvScreen.userData.drawTVScreen = drawTVScreen;
        tvGroup.add(tvScreen);
        
        // TV Stand
        const tvStandMat = this.getMaterial(0x222222, { metalness: 0.7, roughness: 0.3 });
        const tvStandGeo = new THREE.BoxGeometry(2.5, 0.3, 0.8);
        const tvStand = new THREE.Mesh(tvStandGeo, tvStandMat);
        tvStand.position.y = -3;
        tvGroup.add(tvStand);
        
        const tvPoleMat = this.getMaterial(0x333333, { metalness: 0.6 });
        const tvPoleGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8);
        const tvPole = new THREE.Mesh(tvPoleGeo, tvPoleMat);
        tvPole.position.y = -2.6;
        tvGroup.add(tvPole);
        
        tvGroup.position.set(0, secondFloorHeight + 4.2, -d / 2 + 1);
        group.add(tvGroup);

        // ==================== DRINKS SHELF (3 shelves with bottles for visual richness) ====================
        const shelfMat = this.getMaterial(0x2a1a0a, { roughness: 0.7 });
        const shelfGoldTrim = this.getMaterial(goldAccent, { metalness: 0.6, roughness: 0.3 });
        
        for (let shelf = 0; shelf < 3; shelf++) {
            // Shelf board
            const shelfGeo = new THREE.BoxGeometry(w - 5, 0.12, 0.5);
            const shelfMesh = new THREE.Mesh(shelfGeo, shelfMat);
            shelfMesh.position.set(0, secondFloorHeight + 2 + shelf * 1.2, -d / 2 + 0.5);
            group.add(shelfMesh);
            
            // Gold trim on shelf front
            const trimGeo = new THREE.BoxGeometry(w - 5, 0.05, 0.08);
            const trim = new THREE.Mesh(trimGeo, shelfGoldTrim);
            trim.position.set(0, secondFloorHeight + 2 + shelf * 1.2 + 0.08, -d / 2 + 0.25);
            group.add(trim);

            // 8 bottles per shelf with varied colors
            const bottleColors = [0x8B0000, 0x228B22, 0xFFD700, 0x4169E1, 0x8B4513, 0x006400, 0xDC143C, 0x00CED1];
            for (let b = 0; b < 8; b++) {
                // Vary bottle heights
                const bottleHeight = 0.6 + Math.random() * 0.3;
                const bottleGeo = new THREE.CylinderGeometry(0.12, 0.15, bottleHeight, 8);
                const bottleMat = this.getMaterial(bottleColors[b % bottleColors.length], { 
                    roughness: 0.2, 
                    transparent: true, 
                    opacity: 0.85,
                    metalness: 0.1
                });
                const bottle = new THREE.Mesh(bottleGeo, bottleMat);
                bottle.position.set(
                    -w / 2 + 4 + b * 3.5,
                    secondFloorHeight + 2.4 + shelf * 1.2,
                    -d / 2 + 0.5
                );
                group.add(bottle);
            }
        }

        // ==================== COFFEE TABLE (Proper table with top and legs) ====================
        const tableMat = this.getMaterial(0x2a1a0a, { roughness: 0.5 });
        const tableGoldMat = this.getMaterial(goldAccent, { metalness: 0.7, roughness: 0.3 });
        const tableX = w / 2 - 9;
        const tableZ = -d / 2 + secondFloorDepth / 2;
        
        // Table top
        const tableTopGeo = new THREE.BoxGeometry(2.5, 0.15, 1.4);
        const tableTop = new THREE.Mesh(tableTopGeo, tableMat);
        tableTop.position.set(tableX, secondFloorHeight + 0.7, tableZ);
        group.add(tableTop);
        
        // Gold trim around table top
        const tableTrimGeo = new THREE.BoxGeometry(2.6, 0.06, 0.06);
        [-1, 1].forEach(side => {
            const trim = new THREE.Mesh(tableTrimGeo, tableGoldMat);
            trim.position.set(tableX, secondFloorHeight + 0.72, tableZ + side * 0.7);
            group.add(trim);
        });
        
        // Table legs (4 corners)
        const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8);
        [[-1, -0.55], [1, -0.55], [-1, 0.55], [1, 0.55]].forEach(([xOff, zOff]) => {
            const leg = new THREE.Mesh(legGeo, tableGoldMat);
            leg.position.set(tableX + xOff, secondFloorHeight + 0.45, tableZ + zOff);
            group.add(leg);
        });

        // ==================== GAME ROOM FLOOR TRIGGER ZONE ====================
        // Floor glow at CENTER of main casino floor for easy visibility
        // This creates a visible floor area where players can enter the game room
        const gameRoomTriggerX = 0;      // Center of casino width
        const gameRoomTriggerZ = d / 4;  // Center of main floor area (d/4 = 8 for d=32)
        
        // Floor glow circle
        const floorGlowMat = this.getMaterial(neonCyan, {
            emissive: neonCyan,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.4
        });
        const floorGlowGeo = new THREE.CircleGeometry(3, 32);
        const floorGlow = new THREE.Mesh(floorGlowGeo, floorGlowMat);
        floorGlow.rotation.x = -Math.PI / 2;
        floorGlow.position.set(gameRoomTriggerX, 0.03, gameRoomTriggerZ);
        floorGlow.userData.isGameRoomFloorGlow = true;
        group.add(floorGlow);
        
        // Outer ring for better visibility
        const floorRingMat = this.getMaterial(neonCyan, {
            emissive: neonCyan,
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.7
        });
        const floorRingGeo = new THREE.RingGeometry(2.8, 3.2, 32);
        const floorRing = new THREE.Mesh(floorRingGeo, floorRingMat);
        floorRing.rotation.x = -Math.PI / 2;
        floorRing.position.set(gameRoomTriggerX, 0.04, gameRoomTriggerZ);
        group.add(floorRing);
        
        // "GAME ROOM" text above floor glow
        const floorSignCanvas = document.createElement('canvas');
        floorSignCanvas.width = 256;
        floorSignCanvas.height = 64;
        const floorCtx = floorSignCanvas.getContext('2d');
        floorCtx.fillStyle = 'transparent';
        floorCtx.clearRect(0, 0, 256, 64);
        floorCtx.fillStyle = '#00FFFF';
        floorCtx.font = 'bold 28px Arial';
        floorCtx.textAlign = 'center';
        floorCtx.shadowColor = '#00FFFF';
        floorCtx.shadowBlur = 10;
        floorCtx.fillText('GAME ROOM', 128, 40);
        
        const floorSignTexture = new THREE.CanvasTexture(floorSignCanvas);
        const floorSignMat = new THREE.MeshBasicMaterial({ 
            map: floorSignTexture, 
            transparent: true,
            side: THREE.DoubleSide
        });
        const floorSignGeo = new THREE.PlaneGeometry(4, 1);
        const floorSign = new THREE.Mesh(floorSignGeo, floorSignMat);
        floorSign.rotation.x = -Math.PI / 2;
        floorSign.position.set(gameRoomTriggerX, 0.05, gameRoomTriggerZ - 4);
        group.add(floorSign);
        
        // Point light to illuminate the floor zone - Apple/Mobile: skip
        if (!this.needsOptimization) {
            const floorZoneLight = new THREE.PointLight(neonCyan, 0.8, 8);
            floorZoneLight.position.set(gameRoomTriggerX, 2, gameRoomTriggerZ);
            group.add(floorZoneLight);
            this.lights.push(floorZoneLight);
        }

        // ==================== NEON DECORATIONS ====================
        const neonTrimMat = this.getMaterial(neonPink, {
            emissive: neonPink,
            emissiveIntensity: 0.9,
            roughness: 0.3
        });

        // ==================== INTERIOR LIGHTING ====================
        // Apple/Mobile: Skip expensive point lights (ambient + emissive materials provide enough light)
        if (!this.needsOptimization) {
            const interiorLight = new THREE.PointLight(0xFFAA55, 0.6, 20);
            interiorLight.position.set(0, h - 2, 0);
            group.add(interiorLight);
            this.lights.push(interiorLight);

            const barLight = new THREE.PointLight(0xFF6655, 0.8, 12);
            barLight.position.set(0, h - 1, -d / 2 + 3);
            group.add(barLight);
            this.lights.push(barLight);
        }

        // ==================== GRAND CHANDELIER (Elegant multi-tier design) ====================
        const chandelierGroup = new THREE.Group();
        
        // Chain links
        const chainMat = this.getMaterial(0xFFD700, { metalness: 0.9, roughness: 0.2 });
        const chainGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8);
        const chain = new THREE.Mesh(chainGeo, chainMat);
        chain.position.y = h - 0.75;
        chandelierGroup.add(chain);
        
        // Central hub (ornate sphere)
        const chandelierHubGeo = new THREE.SphereGeometry(0.4, 12, 8);
        const chandelierHub = new THREE.Mesh(chandelierHubGeo, chainMat);
        chandelierHub.position.y = h - 1.7;
        chandelierGroup.add(chandelierHub);
        
        // Chandelier body (concentric rings)
        const chandelierBodyMat = this.getMaterial(0xFFD700, { metalness: 0.9, roughness: 0.15 });
        
        // Outer ring
        const outerRingGeo = new THREE.TorusGeometry(2.5, 0.12, 8, 24);
        const outerRing = new THREE.Mesh(outerRingGeo, chandelierBodyMat);
        outerRing.position.y = h - 2.5;
        outerRing.rotation.x = Math.PI / 2;
        chandelierGroup.add(outerRing);
        
        // Inner ring
        const innerRingGeo = new THREE.TorusGeometry(1.5, 0.1, 8, 20);
        const innerRing = new THREE.Mesh(innerRingGeo, chandelierBodyMat);
        innerRing.position.y = h - 2.3;
        innerRing.rotation.x = Math.PI / 2;
        chandelierGroup.add(innerRing);
        
        // Support arms connecting rings
        const armGeo = new THREE.BoxGeometry(0.08, 0.08, 1.2);
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const arm = new THREE.Mesh(armGeo, chandelierBodyMat);
            arm.position.set(Math.cos(angle) * 2, h - 2.4, Math.sin(angle) * 2);
            arm.rotation.y = angle;
            chandelierGroup.add(arm);
        }
        
        // Crystal droplets on outer ring (8 crystals)
        const crystalMat = this.getMaterial(0xFFEEDD, { 
            emissive: 0xFFAA66, 
            emissiveIntensity: 0.9, 
            transparent: true, 
            opacity: 0.9,
            roughness: 0.05 
        });
        const crystalGeo = new THREE.ConeGeometry(0.15, 0.6, 6);
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            crystal.position.set(Math.cos(angle) * 2.5, h - 3.1, Math.sin(angle) * 2.5);
            crystal.rotation.x = Math.PI;
            chandelierGroup.add(crystal);
        }
        
        // Inner crystals (smaller, 6 crystals)
        const smallCrystalGeo = new THREE.ConeGeometry(0.1, 0.4, 6);
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + 0.3;
            const crystal = new THREE.Mesh(smallCrystalGeo, crystalMat);
            crystal.position.set(Math.cos(angle) * 1.5, h - 2.8, Math.sin(angle) * 1.5);
            crystal.rotation.x = Math.PI;
            chandelierGroup.add(crystal);
        }
        
        // Central pendant
        const pendantGeo = new THREE.ConeGeometry(0.25, 1.0, 8);
        const pendant = new THREE.Mesh(pendantGeo, crystalMat);
        pendant.position.y = h - 3.2;
        pendant.rotation.x = Math.PI;
        chandelierGroup.add(pendant);
        
        // Chandelier center light - Apple/Mobile: skip
        if (!this.needsOptimization) {
            const chandelierLight = new THREE.PointLight(0xFFDD99, 1.5, 30);
            chandelierLight.position.set(0, h - 2.8, 0);
            chandelierGroup.add(chandelierLight);
            this.lights.push(chandelierLight);
        }
        
        // Position chandelier at center of main floor
        chandelierGroup.position.set(0, 0, d / 4);
        group.add(chandelierGroup);
        
        // ==================== STRING LIGHTS (Festive Edison-style bulbs) ====================
        const stringLightMat = this.getMaterial(0xFFEE88, { 
            emissive: 0xFFDD66, 
            emissiveIntensity: 0.9,
            transparent: true,
            opacity: 0.95
        });
        const wireMat = this.getMaterial(0x222222, { roughness: 0.8 });
        const stringWidth = w - 6;
        
        // Create 2 rows of string lights for ambiance
        [-1, 1].forEach((side, rowIdx) => {
            const wireGeo = new THREE.BoxGeometry(stringWidth, 0.03, 0.03);
            const wire = new THREE.Mesh(wireGeo, wireMat);
            wire.position.set(0, h - 1.2, d / 4 + side * 4);
            group.add(wire);
            
            // 8 bulbs per row
            const bulbGeo = new THREE.SphereGeometry(0.12, 8, 6);
            const capGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.08, 8);
            
            for (let i = 0; i < 8; i++) {
                const x = -stringWidth / 2 + (i + 0.5) * (stringWidth / 8);
                
                // Bulb cap
                const cap = new THREE.Mesh(capGeo, wireMat);
                cap.position.set(x, h - 1.3, d / 4 + side * 4);
                group.add(cap);
                
                // Glowing bulb
                const bulb = new THREE.Mesh(bulbGeo, stringLightMat);
                bulb.position.set(x, h - 1.45, d / 4 + side * 4);
                group.add(bulb);
            }
        });
        
        // Single point light for the strings - Apple/Mobile: skip
        if (!this.needsOptimization) {
            const stringLight = new THREE.PointLight(0xFFDD66, 0.5, 18);
            stringLight.position.set(0, h - 1.5, d / 4);
            group.add(stringLight);
            this.lights.push(stringLight);
        }
        
        // ==================== WALL SCONCES (Elegant torch-style sconces) ====================
        const sconceBracketMat = this.getMaterial(goldAccent, { metalness: 0.8, roughness: 0.3 });
        const sconceGlassMat = this.getMaterial(0xFFEEDD, { 
            emissive: 0xFFAA44, 
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9
        });
        
        // 4 wall sconces - 2 on each side wall
        const sconcePositions = [
            { x: -w / 2 + 0.3, z: -d / 6 },
            { x: -w / 2 + 0.3, z: d / 3 },
            { x: w / 2 - 0.3, z: -d / 6 },
            { x: w / 2 - 0.3, z: d / 3 }
        ];
        
        sconcePositions.forEach((pos, idx) => {
            // Bracket backplate
            const backplateGeo = new THREE.BoxGeometry(0.15, 0.4, 0.3);
            const backplate = new THREE.Mesh(backplateGeo, sconceBracketMat);
            backplate.position.set(pos.x, 5, pos.z);
            group.add(backplate);
            
            // Support arm
            const armDir = pos.x < 0 ? 1 : -1;
            const armGeo = new THREE.BoxGeometry(0.4, 0.08, 0.08);
            const arm = new THREE.Mesh(armGeo, sconceBracketMat);
            arm.position.set(pos.x + armDir * 0.25, 5, pos.z);
            group.add(arm);
            
            // Bulb holder cup
            const holderGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.15, 8);
            const holder = new THREE.Mesh(holderGeo, sconceBracketMat);
            holder.position.set(pos.x + armDir * 0.45, 4.95, pos.z);
            group.add(holder);
            
            // Glowing glass bulb
            const bulbGeo = new THREE.SphereGeometry(0.18, 10, 8);
            const bulb = new THREE.Mesh(bulbGeo, sconceGlassMat);
            bulb.position.set(pos.x + armDir * 0.45, 5.15, pos.z);
            group.add(bulb);
        });

        // Entrance light - keep ONE for Apple/Mobile (important for visibility)
        const entranceLight = new THREE.PointLight(neonPink, this.needsOptimization ? 0.8 : 1.5, 15);
        entranceLight.position.set(0, 3, d / 2 + 2);
        group.add(entranceLight);
        this.lights.push(entranceLight);

        // Store dimensions for collision
        group.userData.dimensions = { w, h, d };
        group.userData.secondFloorHeight = secondFloorHeight;
        group.userData.secondFloorDepth = secondFloorDepth;
        group.userData.stairData = {
            x: -w / 2 + stairWidth / 2 + 1,
            startZ: stairStartZ,
            endZ: stairEndZ,
            width: stairWidth,
            stepDepth: stairDepth,
            stepHeight: stairHeight,
            numSteps: numStairs,
            direction: -1
        };
        // Store game room floor trigger location (used by getPortalTrigger)
        group.userData.portalRoom = {
            x: 0,     // Local X for floor trigger (center of casino)
            z: d / 4, // Local Z for floor trigger (center of main floor)
            radius: 3.5
        };
        group.userData.entranceWidth = 12;
        
        // stoolPositions already stored in group.userData by bar stools section above
        
        // Couch position
        group.userData.couchPosition = {
            localX: w / 2 - 5,
            localZ: -d / 2 + secondFloorDepth / 2
        };
        
        // TV position for iframe overlay
        group.userData.tvPosition = {
            localX: 0,
            localY: secondFloorHeight + 4.2,
            localZ: -d / 2 + 1,
            width: 9.375,
            height: 5
        };
        
        // DexScreener iframe URL for the TV ($CP, candles, market cap, 1hr)
        group.userData.tvIframeUrl = 'https://dexscreener.com/solana/9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump?embed=1&theme=dark&chartStyle=1&chartType=mc&interval=60';

        // ==================== APPLE/MOBILE PERFORMANCE OPTIMIZATIONS ====================
        if (this.needsOptimization) {
            let meshCount = 0;
            let lightsDisabled = 0;
            
            group.traverse(child => {
                if (child.isMesh) {
                    meshCount++;
                    // Disable shadows completely
                    child.castShadow = false;
                    child.receiveShadow = false;
                    
                    // Reduce material complexity for Apple GPUs
                    if (child.material) {
                        // Lower emissive intensity to reduce GPU load
                        if (child.material.emissiveIntensity > 0.5) {
                            child.material.emissiveIntensity *= 0.7;
                        }
                        // Ensure no unnecessary transparency computations
                        if (child.material.transparent && child.material.opacity === 1) {
                            child.material.transparent = false;
                        }
                    }
                }
                
                // Reduce point light intensity and range on Apple/Mobile
                if (child.isLight && child.isPointLight) {
                    child.intensity *= 0.6;
                    child.distance *= 0.7;
                    lightsDisabled++;
                }
            });
            
            console.log(`🍎 Casino: Apple/Mobile optimizations applied - ${meshCount} meshes, ${lightsDisabled} lights reduced`);
        }

        // Store optimization flag for update throttling
        group.userData.needsOptimization = this.needsOptimization;

        return group;
    }
    
    /**
     * Create red carpet with velvet ropes - Vegas VIP entrance!
     */
    createRedCarpet(group, d, goldTrimMat) {
        const THREE = this.THREE;
        
        const carpetWidth = 8;
        const carpetLength = 18;
        
        // Luxurious red carpet
        const carpetMat = this.getMaterial(0x8B0000, { roughness: 0.85 });
        const carpetGeo = new THREE.PlaneGeometry(carpetWidth, carpetLength);
        const carpet = new THREE.Mesh(carpetGeo, carpetMat);
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.02, d / 2 + carpetLength / 2);
        carpet.receiveShadow = true;
        group.add(carpet);
        
        // Gold trim edges
        [-1, 1].forEach(side => {
            const trimGeo = new THREE.BoxGeometry(0.2, 0.08, carpetLength);
            const trim = new THREE.Mesh(trimGeo, goldTrimMat);
            trim.position.set(side * carpetWidth / 2, 0.04, d / 2 + carpetLength / 2);
            group.add(trim);
        });
        
        // Velvet rope posts with ornate tops
        // Apple/Mobile: Reduced segments for geometry
        const postSegments = this.needsOptimization ? 6 : 12;
        const postMat = this.getMaterial(0xFFD700, { 
            metalness: 0.9, 
            roughness: 0.2,
            emissive: 0xFFAA00,
            emissiveIntensity: this.needsOptimization ? 0.05 : 0.1
        });
        
        // Apple/Mobile: Fewer posts (every 8 units instead of 4)
        const postSpacing = this.needsOptimization ? 8 : 4;
        const ropePostPositions = [];
        [-1, 1].forEach(side => {
            for (let z = d / 2 + 3; z <= d / 2 + carpetLength - 2; z += postSpacing) {
                ropePostPositions.push({ x: side * (carpetWidth / 2 + 0.8), z });
            }
        });
        
        ropePostPositions.forEach((pos, idx) => {
            // Post base
            const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.15, postSegments);
            const base = new THREE.Mesh(baseGeo, postMat);
            base.position.set(pos.x, 0.08, pos.z);
            group.add(base);
            
            // Post shaft
            const shaftGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.1, postSegments);
            const shaft = new THREE.Mesh(shaftGeo, postMat);
            shaft.position.set(pos.x, 0.7, pos.z);
            group.add(shaft);
            
            // Ornate ball top - skip on mobile for perf
            if (!this.needsOptimization) {
                const ballGeo = new THREE.SphereGeometry(0.18, postSegments, postSegments);
                const ball = new THREE.Mesh(ballGeo, postMat);
                ball.position.set(pos.x, 1.35, pos.z);
                group.add(ball);
            }
        });
        
        // Velvet ropes (deep red)
        // Apple/Mobile: Skip ropes entirely for major draw call reduction
        if (!this.needsOptimization) {
            const ropeMat = this.getMaterial(0x660022, { 
                roughness: 0.7,
                emissive: 0x220000,
                emissiveIntensity: 0.2
            });
            
            [-1, 1].forEach(side => {
                for (let i = 0; i < ropePostPositions.length / 2 - 1; i++) {
                    const startZ = d / 2 + 3 + i * postSpacing;
                    const ropeLength = postSpacing - 0.2;
                    const ropeGeo = new THREE.CylinderGeometry(0.04, 0.04, ropeLength, 6);
                    const rope = new THREE.Mesh(ropeGeo, ropeMat);
                    rope.rotation.x = Math.PI / 2;
                    rope.position.set(side * (carpetWidth / 2 + 0.8), 1.1, startZ + ropeLength / 2);
                    group.add(rope);
                }
            });
        }
        
        // Carpet end welcome mat with star pattern
        const welcomeMat = this.getMaterial(0xFFD700, {
            emissive: 0xFFAA00,
            emissiveIntensity: 0.3
        });
        const starGeo = new THREE.CircleGeometry(1.5, 5);
        const star = new THREE.Mesh(starGeo, welcomeMat);
        star.rotation.x = -Math.PI / 2;
        star.rotation.z = Math.PI / 2;
        star.position.set(0, 0.03, d / 2 + carpetLength - 2);
        group.add(star);
    }
    
    /**
     * Create animated coin stacks for that Vegas wealth feel
     */
    createCoinStacks(group, w, d) {
        const THREE = this.THREE;
        
        const coinMat = this.getMaterial(0xFFD700, {
            metalness: 0.95,
            roughness: 0.15,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.2
        });
        
        // Coin stack positions around entrance
        const stackPositions = [
            { x: -w / 2 - 2, z: d / 2 + 2, height: 6 },
            { x: w / 2 + 2, z: d / 2 + 2, height: 5 },
            { x: -w / 2 - 2, z: d / 2 + 8, height: 4 },
            { x: w / 2 + 2, z: d / 2 + 8, height: 7 },
        ];
        
        stackPositions.forEach((stack, stackIdx) => {
            const stackGroup = new THREE.Group();
            stackGroup.position.set(stack.x, 0, stack.z);
            stackGroup.userData.baseY = 0;
            stackGroup.userData.stackIndex = stackIdx;
            
            for (let i = 0; i < stack.height; i++) {
                const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 20);
                const coin = new THREE.Mesh(coinGeo, coinMat);
                coin.position.y = 0.05 + i * 0.12;
                coin.rotation.y = Math.random() * 0.2 - 0.1;
                stackGroup.add(coin);
                
                // Coin edge detail
                const edgeGeo = new THREE.TorusGeometry(0.38, 0.02, 4, 20);
                const edge = new THREE.Mesh(edgeGeo, coinMat);
                edge.position.y = 0.05 + i * 0.12;
                edge.rotation.x = Math.PI / 2;
                stackGroup.add(edge);
            }
            
            group.add(stackGroup);
            this.coinStacks.push(stackGroup);
        });
    }
    
    /**
     * Create sweeping spotlights for dramatic effect
     */
    createSpotlights(group, w, h, d) {
        const THREE = this.THREE;
        
        // Skip on mobile for performance
        if (this.needsOptimization) return;
        
        // Spotlight housings
        const housingMat = this.getMaterial(0x222222, {
            metalness: 0.8,
            roughness: 0.3
        });
        
        const spotlightPositions = [
            { x: -w / 2 - 3, z: d / 2 + 12 },
            { x: w / 2 + 3, z: d / 2 + 12 },
        ];
        
        spotlightPositions.forEach((pos, idx) => {
            // Housing - narrow end (0.4) at TOP where light emits, wide end (0.7) at bottom
            // Tilted to point upward into the sky
            const housingGeo = new THREE.CylinderGeometry(0.4, 0.7, 1.2, 12);
            const housing = new THREE.Mesh(housingGeo, housingMat);
            housing.position.set(pos.x, 1.8, pos.z);
            // Tilt backward so narrow end points UP toward the sky (positive X rotation)
            housing.rotation.x = Math.PI / 2 - 0.3; // ~60 degrees up
            group.add(housing);
            
            // Lens/glass at the emitting end (narrow top)
            const lensMat = this.getMaterial(0xFFFFAA, {
                emissive: 0xFFFF88,
                emissiveIntensity: 1.5,
                transparent: true,
                opacity: 0.9
            });
            const lensGeo = new THREE.CircleGeometry(0.35, 12);
            const lens = new THREE.Mesh(lensGeo, lensMat);
            // Position at the narrow end of the housing, pointing up
            lens.position.set(pos.x, 1.8 + 0.55, pos.z - 0.3);
            lens.rotation.x = -Math.PI / 2 + 0.3; // Match housing angle
            group.add(lens);
            
            // Tripod legs
            for (let leg = 0; leg < 3; leg++) {
                const angle = (leg / 3) * Math.PI * 2;
                const legGeo = new THREE.CylinderGeometry(0.05, 0.08, 1.8, 6);
                const legMesh = new THREE.Mesh(legGeo, housingMat);
                legMesh.position.set(
                    pos.x + Math.cos(angle) * 0.5,
                    0.9,
                    pos.z + Math.sin(angle) * 0.5
                );
                // Legs splay outward
                legMesh.rotation.z = Math.cos(angle) * 0.25;
                legMesh.rotation.x = Math.sin(angle) * 0.25;
                group.add(legMesh);
            }
            
            // Spotlight beam (cone) - points UP into the sky
            const beamMat = this.getMaterial(0xFFFFAA, {
                transparent: true,
                opacity: 0.12,
                emissive: 0xFFFFAA,
                emissiveIntensity: 0.4,
                side: THREE.DoubleSide
            });
            const beamGeo = new THREE.ConeGeometry(5, 20, 16, 1, true);
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.set(pos.x, 12, pos.z);
            beam.rotation.x = Math.PI; // Cone points UP
            beam.userData.spotlightBeam = true;
            beam.userData.spotlightIndex = idx;
            beam.userData.baseX = pos.x;
            beam.userData.baseZ = pos.z;
            group.add(beam);
            this.spotlights.push(beam);
        });
    }
    
    /**
     * Update animated exterior elements (marquee bulbs, neon, roulette, text)
     * OPTIMIZED: Throttled updates for Apple/Mobile devices
     * @param {number} time - Current time in seconds
     * @param {number} delta - Time since last frame
     */
    update(time, delta) {
        // ==================== APPLE/MOBILE THROTTLING ====================
        // Skip every other frame on mobile for major performance gains
        if (this.needsOptimization) {
            this._frameCount = (this._frameCount || 0) + 1;
            if (this._frameCount % 2 === 0) {
                // Only update essential animations on even frames
                if (this.rouletteWheelProp && this.rouletteWheelProp.update) {
                    this.rouletteWheelProp.update(time, delta * 2);
                }
                if (this.slotMachineDisplay && this.slotMachineDisplay.update) {
                    this.slotMachineDisplay.update(time, delta * 2);
                }
                return; // Skip all other animations
            }
        }
        
        // ==================== MARQUEE BULBS ====================
        // Animate marquee bulbs - chasing pattern
        if (this.marqueBulbs && this.marqueBulbs.length > 0) {
            const chaseSpeed = this.needsOptimization ? 4 : 8;
            const activeIndex = Math.floor(time * chaseSpeed) % this.marqueBulbs.length;
            
            this.marqueBulbs.forEach((bulb, idx) => {
                if (bulb.userData.bulbMat) {
                    const distance = Math.abs(idx - activeIndex);
                    const wrapDistance = Math.min(distance, this.marqueBulbs.length - distance);
                    const intensity = Math.max(0, 1 - wrapDistance * 0.15);
                    bulb.userData.bulbMat.emissiveIntensity = 0.2 + intensity * 0.8;
                }
            });
        }
        
        // ==================== NEON TUBES ====================
        // Animate neon tubes - subtle pulse (throttled on mobile)
        if (this.neonTubes && this.neonTubes.length > 0) {
            const pulseSpeed = this.needsOptimization ? 1.5 : 3;
            const pulseIntensity = 0.8 + Math.sin(time * pulseSpeed) * 0.2;
            this.neonTubes.forEach(tube => {
                if (tube.material && tube.material.emissiveIntensity !== undefined) {
                    tube.material.emissiveIntensity = pulseIntensity;
                }
            });
        }
        
        // ==================== ROULETTE WHEEL ====================
        if (this.rouletteWheelProp && this.rouletteWheelProp.update) {
            this.rouletteWheelProp.update(time, delta);
        }
        
        // ==================== SLOT MACHINE ====================
        if (this.slotMachineDisplay && this.slotMachineDisplay.update) {
            this.slotMachineDisplay.update(time, delta);
        }
        
        // ==================== FLOATING TEXT ====================
        if (this.floatingText) {
            const baseY = this.floatingText.userData.baseY || 19;
            const bobSpeed = this.needsOptimization ? 1 : 1.5;
            const bobAmount = this.needsOptimization ? 0.15 : 0.3;
            this.floatingText.position.y = baseY + Math.sin(time * bobSpeed) * bobAmount;
        }
        
        // ==================== EXTERIOR PROPS ====================
        // Skip on mobile - already reduced in build()
        if (this.exteriorProps && this.exteriorProps.length > 0 && !this.needsOptimization) {
            this.exteriorProps.forEach(prop => {
                if (prop.update) {
                    prop.update(time, delta);
                }
            });
        } else if (this.exteriorProps && this.needsOptimization) {
            // Mobile: Only update first prop (reduced set)
            if (this.exteriorProps[0] && this.exteriorProps[0].update) {
                this.exteriorProps[0].update(time, delta);
            }
        }
        
        // ==================== COIN STACKS ====================
        // Skip on mobile (coin stacks not created on mobile anyway)
        if (this.coinStacks && this.coinStacks.length > 0 && !this.needsOptimization) {
            this.coinStacks.forEach((stack, idx) => {
                const bounce = Math.sin(time * 2 + idx * 0.8) * 0.05;
                stack.position.y = bounce;
                stack.rotation.y = Math.sin(time * 0.5 + idx) * 0.1;
            });
        }
        
        // ==================== SPOTLIGHTS ====================
        // Already skipped in createSpotlights() on mobile
        if (this.spotlights && this.spotlights.length > 0) {
            this.spotlights.forEach((beam, idx) => {
                const sweepAngle = Math.sin(time * 0.8 + idx * Math.PI) * 0.4;
                const baseX = beam.userData.baseX;
                const baseZ = beam.userData.baseZ;
                
                // Sweep left/right
                beam.position.x = baseX + Math.sin(sweepAngle) * 3;
                beam.rotation.z = sweepAngle * 0.3;
                
                // Pulse intensity
                if (beam.material) {
                    beam.material.opacity = 0.1 + Math.sin(time * 3 + idx) * 0.05;
                }
            });
        }
    }
    
    /**
     * Get decoration colliders for exterior props
     * Returns world-space collider positions
     */
    getDecorationColliders(buildingX, buildingZ, rotation = 0) {
        // Entrance columns are the main exterior colliders
        const dim = this.group.userData.dimensions;
        const d = dim?.d || 32;
        const entranceWidth = 12;
        
        const colliders = [];
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        // Column positions (local)
        const columnPositions = [
            { x: -entranceWidth / 2 - 0.5, z: d / 2 + 1 },
            { x: entranceWidth / 2 + 0.5, z: d / 2 + 1 },
        ];
        
        columnPositions.forEach((col, idx) => {
            const worldX = buildingX + col.x * cos - col.z * sin;
            const worldZ = buildingZ + col.x * sin + col.z * cos;
            colliders.push({
                x: col.x,
                z: col.z,
                worldX,
                worldZ,
                size: { x: 2, z: 2 },
                height: 14,
                name: `casino_column_${idx}`
            });
        });
        
        return colliders;
    }

    /**
     * Get furniture data for interaction system (stools, couch)
     * Returns world-space positions with proper rotation applied
     */
    getFurnitureData(x, z, rotation = 0) {
        const dim = this.group.userData.dimensions;
        const secondFloorHeight = this.group.userData.secondFloorHeight;
        const furniture = [];
        
        const adjustedRotation = rotation + Math.PI;
        const cos = Math.cos(adjustedRotation);
        const sin = Math.sin(adjustedRotation);
        
        const transform = (localX, localZ) => ({
            x: x + localX * cos - localZ * sin,
            z: z + localX * sin + localZ * cos
        });
        
        // Bar stools (same format as Pizza Parlor / SKNY Igloo)
        const stoolPositions = this.group.userData.stoolPositions || [];
        stoolPositions.forEach((stool, idx) => {
            const worldPos = transform(stool.localX, stool.localZ);
            furniture.push({
                type: 'stool',
                position: { x: worldPos.x, z: worldPos.z },
                rotation: adjustedRotation,
                seatHeight: secondFloorHeight + 1.8,  // 2nd floor + stool height
                snapPoints: [{ x: 0, z: 0 }],
                interactionRadius: 1.0,
                dismountBack: true,
                elevated: true,
                name: `casino_stool_${idx}`
            });
        });
        
        // Couch (same format as Nightclub / SKNY Igloo)
        const couchPos = this.group.userData.couchPosition;
        if (couchPos) {
            const worldPos = transform(couchPos.localX, couchPos.localZ);
            furniture.push({
                type: 'couch',
                position: { x: worldPos.x, z: worldPos.z },
                rotation: adjustedRotation + Math.PI / 2,  // Face toward TV/bar (rotated 180 from before)
                seatHeight: secondFloorHeight + 1.2,  // 2nd floor + couch seat height (raised to not clip through cushion)
                snapPoints: [
                    { x: -1.5, z: 0 },
                    { x: 0, z: 0 },
                    { x: 1.5, z: 0 }
                ],
                interactionRadius: 3,
                maxOccupants: 3,
                elevated: true,
                name: 'casino_couch'
            });
        }
        
        return furniture;
    }

    /**
     * Get collision data for the casino walls
     */
    getCollisionData(x, z, rotation = 0) {
        const dim = this.group.userData.dimensions;
        const { w, h, d } = dim;
        const entranceWidth = this.group.userData.entranceWidth || 12;
        const colliders = [];

        const adjustedRotation = rotation + Math.PI;
        const cos = Math.cos(adjustedRotation);
        const sin = Math.sin(adjustedRotation);

        const transform = (localX, localZ) => {
            return {
                x: x + localX * cos - localZ * sin,
                z: z + localX * sin + localZ * cos
            };
        };

        const transformSize = (sizeX, sizeZ) => {
            const absRot = Math.abs(adjustedRotation % Math.PI);
            if (Math.abs(absRot - Math.PI / 2) < 0.2) {
                return { x: sizeZ, z: sizeX };
            }
            return { x: sizeX, z: sizeZ };
        };

        // Back wall
        const backWallPos = transform(0, -d / 2);
        const backWallSize = transformSize(w, 0.8);
        colliders.push({
            x: backWallPos.x, z: backWallPos.z,
            size: backWallSize, height: h,
            name: 'casino_back_wall', rotation: 0
        });

        // Left wall
        const leftWallPos = transform(-w / 2, 0);
        const leftWallSize = transformSize(0.8, d);
        colliders.push({
            x: leftWallPos.x, z: leftWallPos.z,
            size: leftWallSize, height: h,
            name: 'casino_left_wall', rotation: 0
        });

        // Right wall
        const rightWallPos = transform(w / 2, 0);
        const rightWallSize = transformSize(0.8, d);
        colliders.push({
            x: rightWallPos.x, z: rightWallPos.z,
            size: rightWallSize, height: h,
            name: 'casino_right_wall', rotation: 0
        });

        // Front wall sections with entrance gap
        const frontSectionWidth = (w - entranceWidth) / 2;
        
        const frontLeftPos = transform(-w / 2 + frontSectionWidth / 2, d / 2);
        const frontLeftSize = transformSize(frontSectionWidth, 0.8);
        colliders.push({
            x: frontLeftPos.x, z: frontLeftPos.z,
            size: frontLeftSize, height: h,
            name: 'casino_front_left', rotation: 0
        });

        const frontRightPos = transform(w / 2 - frontSectionWidth / 2, d / 2);
        const frontRightSize = transformSize(frontSectionWidth, 0.8);
        colliders.push({
            x: frontRightPos.x, z: frontRightPos.z,
            size: frontRightSize, height: h,
            name: 'casino_front_right', rotation: 0
        });

        // Bar counter collision (on 2nd floor)
        const secondFloorHeight = this.group.userData.secondFloorHeight;
        const barPos = transform(0, -d / 2 + 2);
        const barSize = transformSize(w - 6, 2);
        colliders.push({
            x: barPos.x, z: barPos.z,
            size: barSize, height: 1.5,
            name: 'casino_bar_counter', rotation: 0,
            y: secondFloorHeight
        });

        return colliders;
    }

    /**
     * Get landing surfaces (2nd floor only - stairs handled dynamically)
     */
    getLandingSurfaces(x, z, rotation = 0) {
        const dim = this.group.userData.dimensions;
        const surfaces = [];

        const adjustedRotation = rotation + Math.PI;
        const cos = Math.cos(adjustedRotation);
        const sin = Math.sin(adjustedRotation);

        const transform = (localX, localZ) => {
            return {
                x: x + localX * cos - localZ * sin,
                z: z + localX * sin + localZ * cos
            };
        };

        const transformSize = (sizeX, sizeZ) => {
            const absRot = Math.abs(adjustedRotation % Math.PI);
            if (Math.abs(absRot - Math.PI / 2) < 0.2) {
                return { width: sizeZ, depth: sizeX };
            }
            return { width: sizeX, depth: sizeZ };
        };

        // 2nd floor platform - FULL platform area
        const secondFloorHeight = this.group.userData.secondFloorHeight;
        const secondFloorDepth = this.group.userData.secondFloorDepth;
        const floorPos = transform(0, -dim.d / 2 + secondFloorDepth / 2 + 0.5);
        const floorSize = transformSize(dim.w - 1, secondFloorDepth);
        surfaces.push({
            name: 'casino_second_floor',
            x: floorPos.x,
            z: floorPos.z,
            width: floorSize.width,
            depth: floorSize.depth,
            height: secondFloorHeight + 0.4
        });

        return surfaces;
    }

    /**
     * Get stair data for dynamic height calculation
     */
    getStairData(x, z, rotation = 0) {
        const dim = this.group.userData.dimensions;
        const stairs = this.group.userData.stairData;

        const adjustedRotation = rotation + Math.PI;
        const cos = Math.cos(adjustedRotation);
        const sin = Math.sin(adjustedRotation);

        const transform = (localX, localZ) => {
            return {
                x: x + localX * cos - localZ * sin,
                z: z + localX * sin + localZ * cos
            };
        };

        const stairCenterLocalZ = stairs.startZ - (stairs.numSteps * stairs.stepDepth) / 2;
        const stairPos = transform(stairs.x, stairCenterLocalZ);

        const isRotated90 = Math.abs(Math.abs(adjustedRotation % Math.PI) - Math.PI / 2) < 0.2;

        return {
            x: stairPos.x,
            z: stairPos.z,
            width: isRotated90 ? stairs.numSteps * stairs.stepDepth : stairs.width,
            depth: isRotated90 ? stairs.width : stairs.numSteps * stairs.stepDepth,
            stepHeight: stairs.stepHeight,
            stepDepth: stairs.stepDepth,
            totalSteps: stairs.numSteps,
            startZ: transform(stairs.x, stairs.startZ).z,
            endZ: transform(stairs.x, stairs.endZ).z,
            startX: transform(stairs.x, stairs.startZ).x,
            endX: transform(stairs.x, stairs.endZ).x,
            runsAlongX: isRotated90,
            localStairX: stairs.x,
            localStartZ: stairs.startZ,
            localEndZ: stairs.endZ,
            localWidth: stairs.width
        };
    }

    /**
     * Get portal trigger data
     * Floor trigger in back-left corner where "Game Room" text is rendered
     * User-specified world coords: x: C + -60.6, z: C + 17.4 (where C = 110)
     */
    getPortalTrigger(x, z, rotation = 0) {
        // Calculate local coordinates that produce the correct world position
        // With casino at (C-50, C+3) = (60, 113) and rotation PI/2:
        // worldX = 60 - localZ, worldZ = 113 + localX
        // Target: worldX = 49.4, worldZ = 127.4
        // So: localZ = 10.6, localX = 14.4
        const localX = 14.4;
        const localZ = 10.6;
        
        // Transform to world coordinates
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        const worldX = x + localX * cos - localZ * sin;
        const worldZ = z + localX * sin + localZ * cos;

        return {
            x: worldX,
            z: worldZ,
            radius: 3.5, // Trigger zone radius
            action: 'enter_casino_game_room',
            message: '🎰 Enter Game Room (Press E)',
            destination: 'casino_game_room'
        };
    }
}

/**
 * Create a Casino building with Vegas-style exterior
 * @param {THREE} THREE - Three.js library
 * @param {Object} config - Building configuration
 * @returns {THREE.Group} - The casino mesh with update function attached
 */
export function createCasino(THREE, config = {}) {
    const casino = new Casino(THREE);
    const mesh = casino.build(config);
    mesh.userData.getCollisionData = (x, z, rot) => casino.getCollisionData(x, z, rot);
    mesh.userData.getLandingSurfaces = (x, z, rot) => casino.getLandingSurfaces(x, z, rot);
    mesh.userData.getStairData = (x, z, rot) => casino.getStairData(x, z, rot);
    mesh.userData.getPortalTrigger = (x, z, rot) => casino.getPortalTrigger(x, z, rot);
    mesh.userData.getFurnitureData = (x, z, rot) => casino.getFurnitureData(x, z, rot);
    mesh.userData.getDecorationColliders = (x, z, rot) => casino.getDecorationColliders(x, z, rot);
    mesh.userData.lights = casino.lights;
    
    // Expose update function for animated marquee and neon
    mesh.userData.update = (time, delta) => casino.update(time, delta);
    mesh.userData.hasAnimatedExterior = true;
    
    return mesh;
}

export default Casino;

