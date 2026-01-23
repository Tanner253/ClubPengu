/**
 * PBRSlotReels - Premium 3D slot machine display
 * High-quality geometry-based reels with rich visual effects
 * Optimized for performance while maintaining visual quality
 */

import BaseProp from '../BaseProp';
import { getMaterialManager } from '../PropMaterials';
import { getGeometryManager } from '../PropGeometries';

class PBRSlotReels extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.reels = [];
        this.reelSpeeds = [0, 0, 0];
        this.isSpinning = false;
        this.lastSpinTime = 0;
        this.winFlash = 0;
        this.borderLights = [];
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
        
        // Premium symbol colors with glow
        this.symbolColors = [
            { main: 0xE8E8E8, glow: 0xFFFFFF }, // Silver
            { main: 0x22DD44, glow: 0x44FF66 }, // Emerald
            { main: 0x3388FF, glow: 0x66AAFF }, // Sapphire
            { main: 0xBB44FF, glow: 0xDD88FF }, // Amethyst
            { main: 0xFFD700, glow: 0xFFEE44 }, // Gold
            { main: 0xFF3333, glow: 0xFF6666 }, // Ruby
        ];
        
        this.symbolTypes = ['cherry', 'bar', 'bell', 'diamond', 'seven', 'star'];
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'pbr_slot_reels';
        
        const {
            width = 10,
            height = 6,
            reelCount = 3,
            symbolsPerReel = 8,
            frameColor = 0xFFD700
        } = options;
        
        this.reelCount = reelCount;
        this.symbolsPerReel = symbolsPerReel;
        this.width = width;
        this.height = height;
        
        // ==================== MAIN CABINET ====================
        this.createCabinet(group, width, height, frameColor);
        
        // ==================== SPINNING REELS ====================
        this.createReels(group, width, height, reelCount, symbolsPerReel);
        
        // ==================== DECORATIVE ELEMENTS ====================
        this.createDecorations(group, width, height, frameColor);
        
        // ==================== JACKPOT HEADER ====================
        this.createJackpotHeader(group, width, height);
        
        // ==================== BORDER LIGHTS ====================
        this.createBorderLights(group, width, height);
        
        this.setPosition(x, y, z);
        return this;
    }
    
    createCabinet(group, width, height, frameColor) {
        const THREE = this.THREE;
        
        // Rich purple velvet backing
        const backMat = this.matManager.get(0x1a0825, { 
            roughness: 0.95,
            metalness: 0.05
        });
        const backGeo = this.geoManager.get('Box', [width + 1.5, height + 2, 0.8]);
        const back = new THREE.Mesh(backGeo, backMat);
        back.position.z = -0.2;
        this.addMesh(back, group);
        
        // Glossy black display panel
        const panelMat = this.matManager.get(0x050508, { 
            roughness: 0.1,
            metalness: 0.3
        });
        const panelGeo = this.geoManager.get('Box', [width - 0.2, height - 0.2, 0.3]);
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.z = 0.1;
        this.addMesh(panel, group);
        
        // Gold ornate frame
        const frameMat = this.matManager.get(frameColor, {
            roughness: 0.2,
            metalness: 0.9,
            emissive: frameColor,
            emissiveIntensity: 0.15
        });
        
        const frameThickness = 0.5;
        const frameDepth = 0.6;
        
        // Top frame with arch detail
        const topFrameGeo = this.geoManager.get('Box', [width + 1.2, frameThickness, frameDepth]);
        const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
        topFrame.position.set(0, height / 2 + frameThickness / 2, 0.3);
        this.addMesh(topFrame, group);
        
        // Bottom frame
        const bottomFrame = new THREE.Mesh(topFrameGeo, frameMat);
        bottomFrame.position.set(0, -height / 2 - frameThickness / 2, 0.3);
        this.addMesh(bottomFrame, group);
        
        // Side frames with embossed pattern
        const sideFrameGeo = this.geoManager.get('Box', [frameThickness, height + 1, frameDepth]);
        [-1, 1].forEach(side => {
            const sideFrame = new THREE.Mesh(sideFrameGeo, frameMat);
            sideFrame.position.set(side * (width / 2 + frameThickness / 2), 0, 0.3);
            this.addMesh(sideFrame, group);
            
            // Decorative gem insets
            const gemMat = this.matManager.get(0xFF0044, {
                emissive: 0xFF0044,
                emissiveIntensity: 0.8,
                roughness: 0.1,
                metalness: 0.2
            });
            const gemGeo = this.geoManager.get('Octahedron', [0.2, 0]);
            
            for (let i = 0; i < 3; i++) {
                const gem = new THREE.Mesh(gemGeo, gemMat);
                gem.position.set(
                    side * (width / 2 + frameThickness / 2),
                    (i - 1) * 1.5,
                    0.65
                );
                gem.rotation.z = Math.PI / 4;
                gem.scale.set(1, 1.5, 0.5);
                this.addMesh(gem, group);
            }
        });
        
        // Corner flourishes
        const flourishMat = this.matManager.get(0xFFE066, {
            roughness: 0.25,
            metalness: 0.85,
            emissive: 0xFFD700,
            emissiveIntensity: 0.1
        });
        
        const corners = [
            { x: -width / 2 - 0.2, y: height / 2 + 0.2 },
            { x: width / 2 + 0.2, y: height / 2 + 0.2 },
            { x: -width / 2 - 0.2, y: -height / 2 - 0.2 },
            { x: width / 2 + 0.2, y: -height / 2 - 0.2 }
        ];
        
        corners.forEach((pos, idx) => {
            // Ornate corner piece
            const cornerGeo = this.geoManager.get('Cylinder', [0.4, 0.3, 0.4, 6]);
            const corner = new THREE.Mesh(cornerGeo, flourishMat);
            corner.position.set(pos.x, pos.y, 0.5);
            corner.rotation.x = Math.PI / 2;
            this.addMesh(corner, group);
            
            // Corner gem
            const cornerGemGeo = this.geoManager.get('Sphere', [0.15, 8, 8]);
            const cornerGemMat = this.matManager.get(0x00FFFF, {
                emissive: 0x00FFFF,
                emissiveIntensity: 0.9,
                roughness: 0.05
            });
            const cornerGem = new THREE.Mesh(cornerGemGeo, cornerGemMat);
            cornerGem.position.set(pos.x, pos.y, 0.7);
            cornerGem.userData.cornerGem = idx;
            this.addMesh(cornerGem, group);
        });
    }
    
    createReels(group, width, height, reelCount, symbolsPerReel) {
        const THREE = this.THREE;
        const reelWidth = (width - 1.5) / reelCount;
        const reelRadius = height / 3.5;
        
        // Reel window glow effect
        const glowMat = this.matManager.get(0x4400AA, {
            emissive: 0x4400AA,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.5
        });
        
        for (let r = 0; r < reelCount; r++) {
            const reelGroup = new THREE.Group();
            reelGroup.name = `reel_${r}`;
            
            const reelX = -width / 2 + reelWidth / 2 + 0.75 + r * reelWidth;
            reelGroup.position.set(reelX, 0, 0.35);
            
            // Reel drum with metallic finish
            const drumMat = this.matManager.get(0x0a0a12, { 
                roughness: 0.4,
                metalness: 0.6
            });
            const drumGeo = this.geoManager.get('Cylinder', [reelRadius, reelRadius, reelWidth - 0.6, 24]);
            const drum = new THREE.Mesh(drumGeo, drumMat);
            drum.rotation.z = Math.PI / 2;
            reelGroup.add(drum);
            
            // Reel rim accents
            const rimMat = this.matManager.get(0xFFD700, {
                roughness: 0.2,
                metalness: 0.9
            });
            [-1, 1].forEach(side => {
                const rimGeo = this.geoManager.get('Torus', [reelRadius, 0.05, 8, 24]);
                const rim = new THREE.Mesh(rimGeo, rimMat);
                rim.rotation.y = Math.PI / 2;
                rim.position.x = side * (reelWidth / 2 - 0.35);
                reelGroup.add(rim);
            });
            
            // Add symbols around the reel
            this.createReelSymbols(reelGroup, reelRadius, symbolsPerReel, r, reelWidth);
            
            group.add(reelGroup);
            this.reels.push(reelGroup);
            
            // Reel dividers with neon accent
            if (r < reelCount - 1) {
                const dividerMat = this.matManager.get(0x222222, {
                    roughness: 0.3,
                    metalness: 0.8
                });
                const dividerGeo = this.geoManager.get('Box', [0.12, height - 0.8, 0.5]);
                const divider = new THREE.Mesh(dividerGeo, dividerMat);
                divider.position.set(reelX + reelWidth / 2, 0, 0.4);
                this.addMesh(divider, group);
                
                // Neon strip on divider
                const neonMat = this.matManager.get(0xFF00FF, {
                    emissive: 0xFF00FF,
                    emissiveIntensity: 0.8
                });
                const neonGeo = this.geoManager.get('Box', [0.04, height - 1.2, 0.08]);
                const neon = new THREE.Mesh(neonGeo, neonMat);
                neon.position.set(reelX + reelWidth / 2, 0, 0.7);
                this.addMesh(neon, group);
            }
        }
        
        // Win line indicators (3 lines)
        const winLineColors = [0xFF0000, 0x00FF00, 0xFFFF00];
        [-1, 0, 1].forEach((row, idx) => {
            const winLineMat = this.matManager.get(winLineColors[idx], {
                emissive: winLineColors[idx],
                emissiveIntensity: 0.6,
                transparent: true,
                opacity: 0.8
            });
            const winLineGeo = this.geoManager.get('Box', [width - 1, 0.08, 0.06]);
            const winLine = new THREE.Mesh(winLineGeo, winLineMat);
            winLine.position.set(0, row * (height / 4), 0.75);
            winLine.userData.winLine = idx;
            this.addMesh(winLine, group);
        });
    }
    
    createReelSymbols(reelGroup, reelRadius, symbolCount, reelIndex, reelWidth) {
        const THREE = this.THREE;
        const angleStep = (Math.PI * 2) / symbolCount;
        
        for (let s = 0; s < symbolCount; s++) {
            const angle = s * angleStep;
            const symbolGroup = new THREE.Group();
            
            // Position symbol on reel surface
            const surfaceRadius = reelRadius - 0.15;
            symbolGroup.position.set(
                0,
                Math.cos(angle) * surfaceRadius,
                Math.sin(angle) * surfaceRadius
            );
            
            // Rotate to face outward
            symbolGroup.rotation.x = -angle;
            
            // Create the symbol
            const colorData = this.symbolColors[(s + reelIndex * 2) % this.symbolColors.length];
            const symbolType = this.symbolTypes[(s + reelIndex) % this.symbolTypes.length];
            this.createSymbol(symbolGroup, symbolType, colorData, reelWidth);
            
            reelGroup.add(symbolGroup);
        }
    }
    
    createSymbol(parent, type, colorData, reelWidth) {
        const THREE = this.THREE;
        
        const symbolMat = this.matManager.get(colorData.main, {
            emissive: colorData.glow,
            emissiveIntensity: 0.7,
            roughness: 0.2,
            metalness: 0.6
        });
        
        const size = Math.min(reelWidth * 0.35, 1.0);
        
        switch (type) {
            case 'cherry':
                this.createCherry(parent, symbolMat, size);
                break;
            case 'bar':
                this.createBar(parent, symbolMat, size);
                break;
            case 'bell':
                this.createBell(parent, symbolMat, size);
                break;
            case 'diamond':
                this.createDiamond(parent, symbolMat, size);
                break;
            case 'seven':
                this.createSeven(parent, symbolMat, size);
                break;
            case 'star':
                this.createStar(parent, symbolMat, size);
                break;
        }
    }
    
    createCherry(parent, mat, size) {
        const THREE = this.THREE;
        const cherryGroup = new THREE.Group();
        
        // Two cherries
        const cherryGeo = this.geoManager.get('Sphere', [size * 0.35, 12, 12]);
        [-0.3, 0.3].forEach((offset, idx) => {
            const cherry = new THREE.Mesh(cherryGeo, mat);
            cherry.position.set(offset * size, -size * 0.2, 0);
            cherry.scale.set(1, 1.1, 0.6);
            cherryGroup.add(cherry);
        });
        
        // Stem
        const stemMat = this.matManager.get(0x228822, {
            emissive: 0x44AA44,
            emissiveIntensity: 0.3
        });
        const stemGeo = this.geoManager.get('Cylinder', [size * 0.04, size * 0.04, size * 0.5, 6]);
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(0, size * 0.15, 0);
        stem.rotation.z = 0.2;
        cherryGroup.add(stem);
        
        parent.add(cherryGroup);
    }
    
    createBar(parent, mat, size) {
        const THREE = this.THREE;
        
        // BAR shape
        const barGeo = this.geoManager.get('Box', [size * 1.2, size * 0.4, size * 0.2]);
        const bar = new THREE.Mesh(barGeo, mat);
        parent.add(bar);
        
        // Highlight stripe
        const stripeMat = this.matManager.get(0xFFFFFF, {
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.5
        });
        const stripeGeo = this.geoManager.get('Box', [size * 1.1, size * 0.08, size * 0.22]);
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.z = 0.01;
        parent.add(stripe);
    }
    
    createBell(parent, mat, size) {
        const THREE = this.THREE;
        const bellGroup = new THREE.Group();
        
        // Bell body (cone + sphere)
        const bodyGeo = this.geoManager.get('Cylinder', [size * 0.15, size * 0.45, size * 0.6, 12]);
        const body = new THREE.Mesh(bodyGeo, mat);
        bellGroup.add(body);
        
        // Bell top
        const topGeo = this.geoManager.get('Sphere', [size * 0.18, 8, 8]);
        const top = new THREE.Mesh(topGeo, mat);
        top.position.y = size * 0.35;
        bellGroup.add(top);
        
        // Clapper
        const clapperMat = this.matManager.get(0x444444, { metalness: 0.8 });
        const clapperGeo = this.geoManager.get('Sphere', [size * 0.1, 6, 6]);
        const clapper = new THREE.Mesh(clapperGeo, clapperMat);
        clapper.position.y = -size * 0.2;
        bellGroup.add(clapper);
        
        parent.add(bellGroup);
    }
    
    createDiamond(parent, mat, size) {
        const THREE = this.THREE;
        
        const diamondGeo = this.geoManager.get('Octahedron', [size * 0.5, 0]);
        const diamond = new THREE.Mesh(diamondGeo, mat);
        diamond.scale.set(0.8, 1.2, 0.4);
        diamond.rotation.z = Math.PI / 4;
        parent.add(diamond);
    }
    
    createSeven(parent, mat, size) {
        const THREE = this.THREE;
        const sevenGroup = new THREE.Group();
        
        // Top bar of 7
        const topGeo = this.geoManager.get('Box', [size * 0.8, size * 0.22, size * 0.15]);
        const top = new THREE.Mesh(topGeo, mat);
        top.position.y = size * 0.35;
        sevenGroup.add(top);
        
        // Diagonal stroke
        const diagGeo = this.geoManager.get('Box', [size * 0.22, size * 0.9, size * 0.15]);
        const diag = new THREE.Mesh(diagGeo, mat);
        diag.rotation.z = -0.35;
        diag.position.set(size * 0.12, -size * 0.05, 0);
        sevenGroup.add(diag);
        
        // Serif
        const serifGeo = this.geoManager.get('Box', [size * 0.3, size * 0.12, size * 0.15]);
        const serif = new THREE.Mesh(serifGeo, mat);
        serif.position.set(size * 0.3, size * 0.28, 0);
        sevenGroup.add(serif);
        
        parent.add(sevenGroup);
    }
    
    createStar(parent, mat, size) {
        const THREE = this.THREE;
        
        // Create extruded star
        const starShape = new THREE.Shape();
        const points = 5;
        const outerR = size * 0.5;
        const innerR = size * 0.2;
        
        for (let i = 0; i < points * 2; i++) {
            const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
            const r = i % 2 === 0 ? outerR : innerR;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            
            if (i === 0) starShape.moveTo(x, y);
            else starShape.lineTo(x, y);
        }
        starShape.closePath();
        
        const starGeo = new THREE.ExtrudeGeometry(starShape, {
            depth: size * 0.15,
            bevelEnabled: true,
            bevelThickness: 0.02,
            bevelSize: 0.02,
            bevelSegments: 1
        });
        starGeo.center();
        
        const star = new THREE.Mesh(starGeo, mat);
        star.rotation.x = Math.PI / 2;
        parent.add(star);
        
        this.geometries.push(starGeo);
    }
    
    createDecorations(group, width, height, frameColor) {
        const THREE = this.THREE;
        
        // Coin stack decorations on sides
        const coinMat = this.matManager.get(0xFFD700, {
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xFFAA00,
            emissiveIntensity: 0.2
        });
        
        [-1, 1].forEach(side => {
            for (let i = 0; i < 4; i++) {
                const coinGeo = this.geoManager.get('Cylinder', [0.25, 0.25, 0.06, 16]);
                const coin = new THREE.Mesh(coinGeo, coinMat);
                coin.position.set(
                    side * (width / 2 + 0.8),
                    -height / 2 + 0.3 + i * 0.08,
                    0.4
                );
                coin.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
                this.addMesh(coin, group);
            }
        });
    }
    
    createJackpotHeader(group, width, height) {
        const THREE = this.THREE;
        
        // Header backing with gradient effect
        const headerMat = this.matManager.get(0x220044, {
            roughness: 0.7,
            metalness: 0.3
        });
        const headerGeo = this.geoManager.get('Box', [width * 0.85, 1.6, 0.4]);
        const header = new THREE.Mesh(headerGeo, headerMat);
        header.position.set(0, height / 2 + 1.3, 0.2);
        this.addMesh(header, group);
        
        // Gold trim on header
        const trimMat = this.matManager.get(0xFFD700, {
            roughness: 0.2,
            metalness: 0.9
        });
        const trimGeo = this.geoManager.get('Box', [width * 0.9, 0.15, 0.45]);
        const topTrim = new THREE.Mesh(trimGeo, trimMat);
        topTrim.position.set(0, height / 2 + 2.15, 0.25);
        this.addMesh(topTrim, group);
        
        const bottomTrim = new THREE.Mesh(trimGeo, trimMat);
        bottomTrim.position.set(0, height / 2 + 0.55, 0.25);
        this.addMesh(bottomTrim, group);
        
        // JACKPOT neon letters (simplified 3D boxes)
        const neonMat = this.matManager.get(0xFF0066, {
            emissive: 0xFF0066,
            emissiveIntensity: 1.2
        });
        
        // Create stylized "SLOTS" text using boxes
        const letters = [
            { x: -2.5, char: 'S' },
            { x: -1.5, char: 'L' },
            { x: -0.5, char: 'O' },
            { x: 0.5, char: 'T' },
            { x: 1.5, char: 'S' }
        ];
        
        letters.forEach(letter => {
            const letterGeo = this.geoManager.get('Box', [0.7, 0.9, 0.2]);
            const letterMesh = new THREE.Mesh(letterGeo, neonMat);
            letterMesh.position.set(letter.x, height / 2 + 1.35, 0.45);
            letterMesh.userData.isNeonLetter = true;
            this.addMesh(letterMesh, group);
        });
    }
    
    createBorderLights(group, width, height) {
        const THREE = this.THREE;
        
        const lightGeo = this.geoManager.get('Sphere', [0.12, 8, 8]);
        const lightSpacing = 0.6;
        const colors = [0xFF0000, 0xFFFF00, 0x00FF00, 0x00FFFF, 0xFF00FF];
        let lightIdx = 0;
        
        // Top edge
        for (let x = -width / 2; x <= width / 2; x += lightSpacing) {
            this.createBorderLight(group, lightGeo, x, height / 2 + 0.6, colors[lightIdx % colors.length], lightIdx);
            lightIdx++;
        }
        
        // Bottom edge
        for (let x = -width / 2; x <= width / 2; x += lightSpacing) {
            this.createBorderLight(group, lightGeo, x, -height / 2 - 0.6, colors[lightIdx % colors.length], lightIdx);
            lightIdx++;
        }
        
        // Left edge
        for (let y = -height / 2; y <= height / 2; y += lightSpacing) {
            this.createBorderLight(group, lightGeo, -width / 2 - 0.6, y, colors[lightIdx % colors.length], lightIdx);
            lightIdx++;
        }
        
        // Right edge
        for (let y = -height / 2; y <= height / 2; y += lightSpacing) {
            this.createBorderLight(group, lightGeo, width / 2 + 0.6, y, colors[lightIdx % colors.length], lightIdx);
            lightIdx++;
        }
    }
    
    createBorderLight(group, geo, x, y, color, idx) {
        const mat = this.matManager.get(color, {
            emissive: color,
            emissiveIntensity: 0.8
        }).clone();
        
        const light = new this.THREE.Mesh(geo, mat);
        light.position.set(x, y, 0.5);
        light.userData.borderLightIdx = idx;
        light.userData.baseColor = color;
        this.addMesh(light, group);
        this.borderLights.push({ mesh: light, mat: mat, baseColor: color });
        this.materials.push(mat);
    }
    
    update(time, delta) {
        // Auto-spin every 5 seconds
        if (time - this.lastSpinTime > 5 && !this.isSpinning) {
            this.startSpin();
            this.lastSpinTime = time;
        }
        
        // Update spinning reels with smooth easing
        if (this.isSpinning) {
            let allStopped = true;
            
            this.reels.forEach((reel, idx) => {
                if (this.reelSpeeds[idx] > 0.05) {
                    allStopped = false;
                    
                    // Spin the reel
                    reel.rotation.x += this.reelSpeeds[idx] * delta;
                    
                    // Smooth deceleration with staggered timing
                    const elapsed = time - this.lastSpinTime;
                    const stopTime = 1.5 + idx * 0.6;
                    
                    if (elapsed > stopTime) {
                        // Ease out deceleration
                        this.reelSpeeds[idx] *= 0.94;
                        
                        // Snap to symbol when very slow
                        if (this.reelSpeeds[idx] < 0.3) {
                            const angleStep = (Math.PI * 2) / this.symbolsPerReel;
                            const currentAngle = reel.rotation.x % (Math.PI * 2);
                            const targetAngle = Math.round(currentAngle / angleStep) * angleStep;
                            
                            // Smooth snap
                            reel.rotation.x += (targetAngle - currentAngle) * 0.3;
                            
                            if (Math.abs(targetAngle - currentAngle) < 0.05) {
                                reel.rotation.x = targetAngle;
                                this.reelSpeeds[idx] = 0;
                            }
                        }
                    }
                }
            });
            
            if (allStopped) {
                this.isSpinning = false;
                this.winFlash = 1.0;
            }
        }
        
        // Win flash effect
        if (this.winFlash > 0) {
            this.winFlash = Math.max(0, this.winFlash - delta * 2);
        }
        
        // Animate border lights (chasing pattern)
        const chaseSpeed = 15;
        const chasePos = (time * chaseSpeed) % this.borderLights.length;
        
        this.borderLights.forEach((light, idx) => {
            const dist = Math.abs(idx - chasePos);
            const wrapDist = Math.min(dist, this.borderLights.length - dist);
            const intensity = Math.max(0.2, 1 - wrapDist * 0.12);
            
            light.mat.emissiveIntensity = intensity + this.winFlash * 0.5;
        });
        
        // Animate corner gems
        this.meshes.forEach(mesh => {
            if (mesh.userData.cornerGem !== undefined) {
                const pulse = Math.sin(time * 4 + mesh.userData.cornerGem) * 0.3 + 0.7;
                mesh.material.emissiveIntensity = pulse;
            }
            
            // Neon letter pulse
            if (mesh.userData.isNeonLetter) {
                mesh.material.emissiveIntensity = 0.9 + Math.sin(time * 5) * 0.3 + this.winFlash * 0.5;
            }
            
            // Win line pulse
            if (mesh.userData.winLine !== undefined) {
                const phase = time * 3 + mesh.userData.winLine * 0.5;
                mesh.material.opacity = 0.5 + Math.sin(phase) * 0.3;
            }
        });
    }
    
    startSpin() {
        this.isSpinning = true;
        this.reels.forEach((reel, idx) => {
            // Staggered acceleration
            this.reelSpeeds[idx] = 15 + idx * 2 + Math.random() * 3;
        });
    }
}

export default PBRSlotReels;
