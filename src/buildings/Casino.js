
/**
 * Casino - Walkable building with open front and 2nd floor bar
 * Players can walk inside and climb stairs to the bar area
 * Contains a portal to warp to the Casino Game Room
 * 
 * Features an EXTRAVAGANT exterior decoration system with:
 * - Vegas-style marquee with thousands of chasing bulb lights
 * - Giant animated slot machine displays
 * - Golden dice tower pillars
 * - Rotating playing cards animation
 * - Animated roulette wheel on roof
 * - Searchlights sweeping the sky
 * - Jackpot display with scrolling numbers
 * - Neon tubing shapes and LED strips
 */

import BaseBuilding from './BaseBuilding';
import { createCasinoExterior } from '../props/CasinoExterior';

class Casino extends BaseBuilding {
    constructor(THREE) {
        super(THREE);
        this.exterior = null;
        
        // Mobile/Apple GPU detection for performance optimizations
        this.isMobileGPU = typeof window !== 'undefined' && window._isMobileGPU;
        this.isAppleDevice = typeof window !== 'undefined' && window._isAppleDevice;
        this.needsOptimization = this.isMobileGPU || this.isAppleDevice;
    }
    
    build({ w = 36, h = 14, d = 32 } = {}) {
        const THREE = this.THREE;
        const group = this.group;
        group.name = 'casino_building';

        // Colors
        const darkPurple = 0x1a0a2e;
        const goldAccent = 0xFFD700;
        const neonPink = 0xFF1493;
        const neonCyan = 0x00FFFF;
        const carpetRed = 0x8B0000;
        const wallColor = 0x1a1a2e;
        const barWood = 0x3d2817;

        // ==================== GROUND FLOOR ====================
        // Floor - flat red carpet texture (no elevation, like gravel path)
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

        // Back wall (full height, from ground)
        const wallMat = this.getMaterial(wallColor, { roughness: 0.85 });
        const backWallGeo = new THREE.BoxGeometry(w, h, 0.5);
        const backWall = new THREE.Mesh(backWallGeo, wallMat);
        backWall.position.set(0, h / 2, -d / 2 + 0.25);
        backWall.castShadow = true;
        group.add(backWall);

        // Left wall (full height, from ground)
        const leftWallGeo = new THREE.BoxGeometry(0.5, h, d);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.position.set(-w / 2 + 0.25, h / 2, 0);
        leftWall.castShadow = true;
        group.add(leftWall);

        // Right wall (full height, from ground)
        const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
        rightWall.position.set(w / 2 - 0.25, h / 2, 0);
        rightWall.castShadow = true;
        group.add(rightWall);

        // Front wall - OPEN in the middle (entrance)
        const entranceWidth = 12;
        const frontSectionWidth = (w - entranceWidth) / 2;
        const frontWallLeftGeo = new THREE.BoxGeometry(frontSectionWidth, h, 0.5);
        const frontWallLeft = new THREE.Mesh(frontWallLeftGeo, wallMat);
        frontWallLeft.position.set(-w / 2 + frontSectionWidth / 2 + 0.25, h / 2, d / 2 - 0.25);
        group.add(frontWallLeft);

        const frontWallRight = new THREE.Mesh(frontWallLeftGeo, wallMat);
        frontWallRight.position.set(w / 2 - frontSectionWidth / 2 - 0.25, h / 2, d / 2 - 0.25);
        group.add(frontWallRight);

        // Top front section (above entrance)
        const entranceTopGeo = new THREE.BoxGeometry(entranceWidth, h - 6, 0.5);
        const entranceTop = new THREE.Mesh(entranceTopGeo, wallMat);
        entranceTop.position.set(0, h - (h - 6) / 2, d / 2 - 0.25);
        group.add(entranceTop);

        // ==================== CEILING ====================
        const ceilingMat = this.getMaterial(0x0a0a15, { roughness: 0.95 });
        const ceilingGeo = new THREE.BoxGeometry(w, 0.3, d);
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.position.set(0, h, 0);
        group.add(ceiling);

        // ==================== ARCHITECTURAL DETAILS ====================
        // Corner pillars - gold accented columns
        const pillarMat = this.getMaterial(0x2a1a3e, { roughness: 0.7 });
        const pillarGoldMat = this.getMaterial(goldAccent, { metalness: 0.8, roughness: 0.3 });
        
        const pillarPositions = [
            { x: -w / 2 + 1, z: d / 2 - 1 },
            { x: w / 2 - 1, z: d / 2 - 1 },
        ];
        
        pillarPositions.forEach(pos => {
            // Main pillar body
            const pillarGeo = new THREE.CylinderGeometry(0.8, 1.0, h, 8);
            const pillar = new THREE.Mesh(pillarGeo, pillarMat);
            pillar.position.set(pos.x, h / 2, pos.z);
            group.add(pillar);
            
            // Gold base
            const baseGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.5, 8);
            const base = new THREE.Mesh(baseGeo, pillarGoldMat);
            base.position.set(pos.x, 0.25, pos.z);
            group.add(base);
            
            // Gold capital (top)
            const capitalGeo = new THREE.CylinderGeometry(1.1, 0.8, 0.6, 8);
            const capital = new THREE.Mesh(capitalGeo, pillarGoldMat);
            capital.position.set(pos.x, h - 0.3, pos.z);
            group.add(capital);
            
            // OPTIMIZED: Single gold ring at center of pillar instead of multiple
            const ringGeo = new THREE.TorusGeometry(0.85, 0.08, 6, 16);
            const ring = new THREE.Mesh(ringGeo, pillarGoldMat);
            ring.position.set(pos.x, h / 2, pos.z);
            ring.rotation.x = Math.PI / 2;
            group.add(ring);
        });
        
        // Entrance archway frame - pushed forward to avoid z-fighting with walls
        const archMat = this.getMaterial(goldAccent, { metalness: 0.7, roughness: 0.3 });
        const archZ = d / 2 + 0.3; // Push forward from wall
        
        // Vertical arch sides
        const archSideGeo = new THREE.BoxGeometry(0.4, 6, 0.5);
        [-1, 1].forEach(side => {
            const archSide = new THREE.Mesh(archSideGeo, archMat);
            archSide.position.set(side * 6, 3, archZ);
            group.add(archSide);
        });
        
        // Arch top (curved would be expensive, use angled segments)
        const archTopGeo = new THREE.BoxGeometry(12.8, 0.5, 0.5);
        const archTop = new THREE.Mesh(archTopGeo, archMat);
        archTop.position.set(0, 6.25, archZ);
        group.add(archTop);
        
        // Decorative keystone
        const keystoneGeo = new THREE.BoxGeometry(1.5, 1.2, 0.6);
        const keystone = new THREE.Mesh(keystoneGeo, archMat);
        keystone.position.set(0, 6.8, archZ + 0.1);
        group.add(keystone);
        
        // Roof parapet (raised edge around roof) - positioned on TOP of ceiling
        const parapetMat = this.getMaterial(0x1a0a2e, { roughness: 0.8 });
        const parapetHeight = 1.5;
        const ceilingTop = h + 0.15; // Top of ceiling (ceiling is 0.3 thick, centered at h)
        
        // Front parapet - sits on top of ceiling, pushed slightly forward
        const frontParapetGeo = new THREE.BoxGeometry(w, parapetHeight, 0.4);
        const frontParapet = new THREE.Mesh(frontParapetGeo, parapetMat);
        frontParapet.position.set(0, ceilingTop + parapetHeight / 2, d / 2 + 0.1);
        group.add(frontParapet);
        
        // Side parapets - sit on top of ceiling
        const sideParapetGeo = new THREE.BoxGeometry(0.4, parapetHeight, d - 0.8);
        [-1, 1].forEach(side => {
            const sideParapet = new THREE.Mesh(sideParapetGeo, parapetMat);
            sideParapet.position.set(side * (w / 2 + 0.1), ceilingTop + parapetHeight / 2, 0);
            group.add(sideParapet);
        });
        
        // Back parapet
        const backParapetGeo = new THREE.BoxGeometry(w, parapetHeight, 0.4);
        const backParapet = new THREE.Mesh(backParapetGeo, parapetMat);
        backParapet.position.set(0, ceilingTop + parapetHeight / 2, -d / 2 - 0.1);
        group.add(backParapet);
        
        // Gold trim on parapet top (front only for visibility)
        const parapetTrimGeo = new THREE.BoxGeometry(w + 0.6, 0.15, 0.5);
        const parapetTrim = new THREE.Mesh(parapetTrimGeo, pillarGoldMat);
        parapetTrim.position.set(0, ceilingTop + parapetHeight + 0.08, d / 2 + 0.15);
        group.add(parapetTrim);

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
        
        // Draw $CPw3 chart display
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
            tvCtx.fillText('$CPw3 / SOL', 15, 25);
            
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

        const neonVertGeo = new THREE.BoxGeometry(0.2, 6, 0.2);
        const neonLeft = new THREE.Mesh(neonVertGeo, neonTrimMat);
        neonLeft.position.set(-6, 3.5, d / 2 + 0.1);
        group.add(neonLeft);

        const neonRight = new THREE.Mesh(neonVertGeo, neonTrimMat);
        neonRight.position.set(6, 3.5, d / 2 + 0.1);
        group.add(neonRight);

        const neonTopGeo = new THREE.BoxGeometry(12.4, 0.2, 0.2);
        const neonTop = new THREE.Mesh(neonTopGeo, neonTrimMat);
        neonTop.position.set(0, 6.5, d / 2 + 0.1);
        group.add(neonTop);

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
        const hubGeo = new THREE.SphereGeometry(0.4, 12, 8);
        const hub = new THREE.Mesh(hubGeo, chainMat);
        hub.position.y = h - 1.7;
        chandelierGroup.add(hub);
        
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
        
        // DexScreener iframe URL for the TV ($CPw3, candles, market cap, 1hr)
        group.userData.tvIframeUrl = 'https://dexscreener.com/solana/63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump?embed=1&theme=dark&chartStyle=1&chartType=mc&interval=60';

        // ==================== EXTRAVAGANT EXTERIOR DECORATIONS ====================
        // Create the Vegas-style casino exterior with all the bells and whistles
        try {
            this.exterior = createCasinoExterior(THREE, {
                width: w,
                height: h,
                depth: d
            });
            
            if (this.exterior && this.exterior.mesh) {
                group.add(this.exterior.mesh);
                
                // Add exterior lights to the building's light collection
                if (this.exterior.lights) {
                    this.lights.push(...this.exterior.lights);
                }
            }
        } catch (e) {
            console.warn('Casino exterior decorations failed to load:', e);
        }

        // ==================== APPLE/MOBILE SHADOW OPTIMIZATION ====================
        // Disable all shadows on Apple/Mobile for significant performance boost
        if (this.needsOptimization) {
            group.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                }
            });
            console.log('🍎 Casino: Disabled shadows for Apple/Mobile optimization');
        }

        // ==================== STATIC MESH OPTIMIZATION ====================
        // CRITICAL PERFORMANCE: Disable matrixAutoUpdate for static meshes
        // This prevents Three.js from recalculating world matrices every frame
        // The casino interior is static - only the exterior has animations
        group.traverse(child => {
            if (child.isMesh) {
                // Update matrix once, then disable auto-update
                child.updateMatrix();
                child.matrixAutoUpdate = false;
                
                // Frustum culling should stay enabled (default is true)
                // child.frustumCulled = true; // Already default
            }
        });
        
        // Update the group's matrix as well
        group.updateMatrixWorld(true);
        console.log('🎰 Casino: Applied static mesh optimizations (matrixAutoUpdate=false)');

        return group;
    }
    
    /**
     * Update animated exterior elements
     * @param {number} time - Current time in seconds
     * @param {number} delta - Time since last frame
     */
    update(time, delta) {
        if (this.exterior && this.exterior.update) {
            this.exterior.update(time, delta);
        }
    }
    
    /**
     * Get decoration colliders for exterior props (chip stacks, dice, etc.)
     * Returns world-space collider positions
     */
    getDecorationColliders(buildingX, buildingZ, rotation = 0) {
        if (!this.exterior || !this.exterior.getDecorationColliders) {
            return [];
        }
        
        const localColliders = this.exterior.getDecorationColliders();
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        return localColliders.map(collider => {
            // Transform local coordinates to world coordinates
            const worldX = buildingX + collider.x * cos - collider.z * sin;
            const worldZ = buildingZ + collider.x * sin + collider.z * cos;
            
            return {
                ...collider,
                worldX,
                worldZ
            };
        });
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
 * Create a Casino building with extravagant exterior decorations
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
    
    // Expose update function for animated exterior elements
    mesh.userData.update = (time, delta) => casino.update(time, delta);
    mesh.userData.hasAnimatedExterior = true;
    
    // Store reference to exterior for direct access if needed
    mesh.userData.exterior = casino.exterior;
    
    return mesh;
}

export default Casino;
