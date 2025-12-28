/**
 * SlotMachineDisplay - Giant animated slot machine display with spinning reels
 * Creates an eye-catching animated display showing cosmetic gacha rarity symbols
 */

import BaseProp from '../BaseProp';

class SlotMachineDisplay extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.reels = [];
        this.reelPositions = [0, 0, 0];
        this.spinning = [false, false, false];
        this.spinSpeed = [0, 0, 0];
        this.canvas = null;
        this.ctx = null;
        this.texture = null;
        // Rarity symbols for cosmetic gacha
        this.symbols = ['⚪', '🟢', '🔵', '🟣', '🟡', '🔴', '✨', '💎'];
        this.jackpotFlash = 0;
        this.lastSpinTime = 0;
        
        // Mobile/Apple optimization
        this.isMobile = typeof window !== 'undefined' && (window._isMobileGPU || window._isAppleDevice);
        this.frameSkip = 0; // For throttling updates on mobile
        this.lastLEDUpdate = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'slot_machine_display';
        
        const {
            width = 8,
            height = 6,
            frameColor = 0xFFD700
        } = options;
        
        // Create ornate frame
        const frameMat = this.createMaterial({
            color: frameColor,
            roughness: 0.3,
            metalness: 0.8,
            emissive: frameColor,
            emissiveIntensity: 0.2
        });
        
        // Main frame backing
        const backMat = this.createMaterial({
            color: 0x1a0a2e,
            roughness: 0.9
        });
        const backGeo = new THREE.BoxGeometry(width + 1, height + 1, 0.5);
        const back = new THREE.Mesh(backGeo, backMat);
        this.addMesh(back, group);
        
        // Decorative frame elements
        const frameThickness = 0.4;
        
        // Top frame with arc
        const topFrameShape = new THREE.Shape();
        topFrameShape.moveTo(-width / 2 - frameThickness, 0);
        topFrameShape.lineTo(-width / 2 - frameThickness, frameThickness);
        topFrameShape.quadraticCurveTo(0, frameThickness + 1.5, width / 2 + frameThickness, frameThickness);
        topFrameShape.lineTo(width / 2 + frameThickness, 0);
        topFrameShape.lineTo(-width / 2 - frameThickness, 0);
        
        const topFrameGeo = new THREE.ExtrudeGeometry(topFrameShape, {
            depth: 0.3,
            bevelEnabled: false
        });
        const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
        topFrame.position.set(0, height / 2, 0.3);
        this.addMesh(topFrame, group);
        
        // Side frames
        const sideFrameGeo = new THREE.BoxGeometry(frameThickness, height, 0.4);
        const leftFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        leftFrame.position.set(-width / 2 - frameThickness / 2, 0, 0.3);
        this.addMesh(leftFrame, group);
        
        const rightFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        rightFrame.position.set(width / 2 + frameThickness / 2, 0, 0.3);
        this.addMesh(rightFrame, group);
        
        // Bottom frame
        const bottomFrameGeo = new THREE.BoxGeometry(width + frameThickness * 2, frameThickness, 0.4);
        const bottomFrame = new THREE.Mesh(bottomFrameGeo, frameMat);
        bottomFrame.position.set(0, -height / 2 - frameThickness / 2, 0.3);
        this.addMesh(bottomFrame, group);
        
        // Create canvas for slot display
        this.canvas = document.createElement('canvas');
        this.canvas.width = 512;
        this.canvas.height = 384;
        this.ctx = this.canvas.getContext('2d');
        
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.needsUpdate = true;
        
        const displayMat = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: false
        });
        
        const displayGeo = new THREE.PlaneGeometry(width - 0.4, height - 0.4);
        const display = new THREE.Mesh(displayGeo, displayMat);
        display.position.z = 0.3;
        this.addMesh(display, group);
        this.materials.push(displayMat);
        
        // Add LED border lights
        this.createLEDBorder(group, width, height);
        
        // Add "JACKPOT" text above
        this.createJackpotText(group, height);
        
        // Initial draw
        this.drawSlotDisplay();
        
        this.setPosition(x, y, z);
        return this;
    }
    
    createLEDBorder(group, width, height) {
        // MOBILE OPTIMIZATION: Skip LED border entirely - major perf savings
        if (this.isMobile) {
            return;
        }
        
        const THREE = this.THREE;
        const ledSize = 0.15;
        const ledSpacing = 0.35;
        
        const ledGeo = new THREE.BoxGeometry(ledSize, ledSize, ledSize);
        
        // Create LEDs around the display
        const createLED = (x, y, idx) => {
            const ledMat = this.createMaterial({
                color: 0xFF0000,
                emissive: 0xFF0000,
                emissiveIntensity: 0.8
            });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(x, y, 0.4);
            led.userData.ledIndex = idx;
            this.addMesh(led, group);
            return led;
        };
        
        let ledIdx = 0;
        
        // Top row
        for (let lx = -width / 2 + ledSpacing; lx <= width / 2 - ledSpacing; lx += ledSpacing) {
            createLED(lx, height / 2 + 0.3, ledIdx++);
        }
        
        // Right column
        for (let ly = height / 2; ly >= -height / 2; ly -= ledSpacing) {
            createLED(width / 2 + 0.3, ly, ledIdx++);
        }
        
        // Bottom row
        for (let lx = width / 2 - ledSpacing; lx >= -width / 2 + ledSpacing; lx -= ledSpacing) {
            createLED(lx, -height / 2 - 0.3, ledIdx++);
        }
        
        // Left column
        for (let ly = -height / 2; ly <= height / 2; ly += ledSpacing) {
            createLED(-width / 2 - 0.3, ly, ledIdx++);
        }
    }
    
    createJackpotText(group, height) {
        const THREE = this.THREE;
        
        // Create canvas for JACKPOT text
        const jackpotCanvas = document.createElement('canvas');
        jackpotCanvas.width = 512;
        jackpotCanvas.height = 96;
        const jackpotCtx = jackpotCanvas.getContext('2d');
        
        // Draw JACKPOT text
        jackpotCtx.fillStyle = '#000';
        jackpotCtx.fillRect(0, 0, 512, 96);
        
        jackpotCtx.font = 'bold 64px Impact, sans-serif';
        jackpotCtx.textAlign = 'center';
        jackpotCtx.textBaseline = 'middle';
        
        // Gold gradient
        const gradient = jackpotCtx.createLinearGradient(0, 0, 512, 0);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FFFF00');
        gradient.addColorStop(1, '#FFD700');
        
        jackpotCtx.fillStyle = gradient;
        jackpotCtx.shadowColor = '#A855F7';
        jackpotCtx.shadowBlur = 15;
        jackpotCtx.fillText('✨ GACHA ✨', 256, 48);
        
        const jackpotTexture = new THREE.CanvasTexture(jackpotCanvas);
        const jackpotMat = new THREE.MeshBasicMaterial({
            map: jackpotTexture,
            transparent: true
        });
        
        const jackpotGeo = new THREE.PlaneGeometry(6, 1.2);
        const jackpot = new THREE.Mesh(jackpotGeo, jackpotMat);
        jackpot.position.set(0, height / 2 + 1.5, 0.4);
        jackpot.userData.isJackpotSign = true;
        this.addMesh(jackpot, group);
        this.materials.push(jackpotMat);
    }
    
    drawSlotDisplay() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        
        // Dark background
        ctx.fillStyle = '#0a0515';
        ctx.fillRect(0, 0, W, H);
        
        // Reel dimensions
        const reelWidth = W / 3;
        const reelHeight = H;
        const symbolHeight = reelHeight / 3;
        
        // Draw each reel
        for (let r = 0; r < 3; r++) {
            const reelX = r * reelWidth;
            
            // Reel background gradient
            const gradient = ctx.createLinearGradient(reelX, 0, reelX + reelWidth, 0);
            gradient.addColorStop(0, '#1a0a2e');
            gradient.addColorStop(0.5, '#2a1a4e');
            gradient.addColorStop(1, '#1a0a2e');
            ctx.fillStyle = gradient;
            ctx.fillRect(reelX + 5, 5, reelWidth - 10, H - 10);
            
            // Draw symbols based on reel position
            const pos = this.reelPositions[r];
            const symbolCount = this.symbols.length;
            
            for (let s = -1; s <= 2; s++) {
                const symbolIdx = Math.floor((pos + s + symbolCount * 100) % symbolCount);
                const symbolY = (s + 0.5 - (pos % 1)) * symbolHeight + symbolHeight / 2;
                
                if (symbolY > -symbolHeight && symbolY < H + symbolHeight) {
                    ctx.font = 'bold 80px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Symbol glow
                    ctx.shadowColor = '#FFD700';
                    ctx.shadowBlur = 20;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(this.symbols[symbolIdx], reelX + reelWidth / 2, symbolY);
                    ctx.shadowBlur = 0;
                }
            }
            
            // Reel divider
            if (r < 2) {
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(reelX + reelWidth - 3, 0, 6, H);
            }
        }
        
        // Win line indicator
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Jackpot flash overlay
        if (this.jackpotFlash > 0) {
            ctx.fillStyle = `rgba(255, 215, 0, ${this.jackpotFlash * 0.3})`;
            ctx.fillRect(0, 0, W, H);
        }
        
        this.texture.needsUpdate = true;
    }
    
    update(time, delta) {
        // MOBILE OPTIMIZATION: Completely disable animated canvas on mobile
        // Canvas→GPU texture uploads through WebGL/Metal bridge are extremely expensive on iOS
        // This is THE main cause of lag - each texture upload costs ~5-10ms on iPhone
        if (this.isMobile) {
            // Only do lightweight jackpot sign scale animation (no texture updates)
            this.meshes.forEach(mesh => {
                if (mesh.userData.isJackpotSign) {
                    mesh.scale.setScalar(1 + Math.sin(time * 4) * 0.05);
                }
            });
            return; // Skip ALL canvas/texture updates on mobile
        }
        
        // Desktop: Full animation experience
        // Auto-spin every few seconds
        if (time - this.lastSpinTime > 4) {
            this.startSpin();
            this.lastSpinTime = time;
        }
        
        // Update spinning reels
        let anySpinning = false;
        for (let r = 0; r < 3; r++) {
            if (this.spinning[r]) {
                anySpinning = true;
                this.reelPositions[r] += this.spinSpeed[r] * delta;
                
                // Slow down gradually
                this.spinSpeed[r] *= 0.98;
                
                // Stop when slow enough
                if (this.spinSpeed[r] < 0.5) {
                    this.spinning[r] = false;
                    // Snap to nearest symbol
                    this.reelPositions[r] = Math.round(this.reelPositions[r]);
                }
            }
        }
        
        // Update jackpot flash
        if (this.jackpotFlash > 0) {
            this.jackpotFlash = Math.max(0, this.jackpotFlash - delta * 2);
        }
        
        // Check for win (all same symbols)
        if (!anySpinning && !this.spinning[0] && !this.spinning[1] && !this.spinning[2]) {
            const symbols = this.reelPositions.map(p => Math.floor(p % this.symbols.length));
            if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
                this.jackpotFlash = 1;
            }
        }
        
        // Update LED border animation
            // Throttle LED updates to every 100ms
            if (time - this.lastLEDUpdate > 0.1) {
                this.lastLEDUpdate = time;
                this.meshes.forEach(mesh => {
                    if (mesh.userData.ledIndex !== undefined) {
                        const idx = mesh.userData.ledIndex;
                        const chasePhase = (time * 10 + idx) % 20;
                        const isLit = chasePhase < 3;
                        
                        mesh.material.emissiveIntensity = isLit ? 1.0 : 0.2;
                        
                        // Color cycling
                        const hue = (time * 0.3 + idx * 0.02) % 1;
                        mesh.material.emissive.setHSL(hue, 1, 0.5);
                        mesh.material.color.setHSL(hue, 1, 0.5);
                    }
                });
        }
        
        // Jackpot sign animation (lightweight)
        this.meshes.forEach(mesh => {
            if (mesh.userData.isJackpotSign) {
                mesh.scale.setScalar(1 + Math.sin(time * 4) * 0.05);
            }
        });
        
        // Redraw the display - ONLY if spinning or jackpot
        if (anySpinning || this.jackpotFlash > 0) {
            this.drawSlotDisplay();
        }
    }
    
    startSpin() {
        // Stagger the reel starts
        for (let r = 0; r < 3; r++) {
            setTimeout(() => {
                this.spinning[r] = true;
                this.spinSpeed[r] = 15 + Math.random() * 10;
            }, r * 200);
        }
    }
}

export default SlotMachineDisplay;



