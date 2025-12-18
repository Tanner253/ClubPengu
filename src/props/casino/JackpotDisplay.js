/**
 * JackpotDisplay - Animated scrolling jackpot counter with LED effects
 * Shows ever-increasing prize amounts with dramatic visual effects
 */

import BaseProp from '../BaseProp';

class JackpotDisplay extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.canvas = null;
        this.ctx = null;
        this.texture = null;
        this.currentValue = 1000000;
        this.targetValue = 1000000;
        this.displayValue = 1000000;
        this.winFlash = 0;
        this.borderLEDs = [];
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'jackpot_display';
        
        const {
            width = 12,
            height = 4,
            startValue = 1000000
        } = options;
        
        this.currentValue = startValue;
        this.displayValue = startValue;
        this.targetValue = startValue + Math.floor(Math.random() * 500000);
        
        // Main backing panel
        const backMat = this.createMaterial({
            color: 0x0a0515,
            roughness: 0.9,
            metalness: 0.1
        });
        
        const backGeo = new THREE.BoxGeometry(width + 2, height + 2, 0.5);
        const back = new THREE.Mesh(backGeo, backMat);
        this.addMesh(back, group);
        
        // Gold frame
        const frameMat = this.createMaterial({
            color: 0xFFD700,
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3
        });
        
        // Frame pieces
        const frameThickness = 0.4;
        
        // Top frame with decorative arch
        const topFrameGeo = new THREE.BoxGeometry(width + 2.5, frameThickness, 0.6);
        const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
        topFrame.position.set(0, height / 2 + frameThickness / 2 + 0.8, 0.3);
        this.addMesh(topFrame, group);
        
        // Bottom frame
        const bottomFrame = new THREE.Mesh(topFrameGeo, frameMat);
        bottomFrame.position.set(0, -height / 2 - frameThickness / 2 - 0.8, 0.3);
        this.addMesh(bottomFrame, group);
        
        // Side frames
        const sideFrameGeo = new THREE.BoxGeometry(frameThickness, height + 2, 0.6);
        const leftFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        leftFrame.position.set(-width / 2 - frameThickness / 2 - 0.8, 0, 0.3);
        this.addMesh(leftFrame, group);
        
        const rightFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        rightFrame.position.set(width / 2 + frameThickness / 2 + 0.8, 0, 0.3);
        this.addMesh(rightFrame, group);
        
        // "JACKPOT" header canvas
        const headerCanvas = document.createElement('canvas');
        headerCanvas.width = 512;
        headerCanvas.height = 128;
        const headerCtx = headerCanvas.getContext('2d');
        
        this.drawHeader(headerCtx, headerCanvas.width, headerCanvas.height);
        
        const headerTexture = new THREE.CanvasTexture(headerCanvas);
        const headerMat = new THREE.MeshBasicMaterial({
            map: headerTexture,
            transparent: true
        });
        this.materials.push(headerMat);
        
        const headerGeo = new THREE.PlaneGeometry(width - 1, 1.5);
        const header = new THREE.Mesh(headerGeo, headerMat);
        header.position.set(0, height / 2 - 0.3, 0.35);
        this.addMesh(header, group);
        
        // Main display canvas for numbers - higher resolution for crisp text
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1280;
        this.canvas.height = 320;
        this.ctx = this.canvas.getContext('2d');
        
        this.texture = new THREE.CanvasTexture(this.canvas);
        const displayMat = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: false
        });
        this.materials.push(displayMat);
        
        const displayGeo = new THREE.PlaneGeometry(width - 0.5, height - 2);
        const display = new THREE.Mesh(displayGeo, displayMat);
        display.position.set(0, -0.3, 0.35);
        this.addMesh(display, group);
        
        // Create LED border
        this.createLEDBorder(group, width, height);
        
        // Add corner starbursts
        this.createCornerDecorations(group, width, height);
        
        // Initial draw
        this.drawDisplay();
        
        this.setPosition(x, y, z);
        return this;
    }
    
    drawHeader(ctx, W, H) {
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, W, H);
        
        // Gradient text
        ctx.font = 'bold 80px Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const gradient = ctx.createLinearGradient(0, 0, W, 0);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.3, '#FFFF00');
        gradient.addColorStop(0.5, '#FFFFFF');
        gradient.addColorStop(0.7, '#FFFF00');
        gradient.addColorStop(1, '#FFD700');
        
        ctx.shadowColor = '#FF0000';
        ctx.shadowBlur = 20;
        ctx.fillStyle = gradient;
        ctx.fillText('★ JACKPOT ★', W / 2, H / 2);
        ctx.shadowBlur = 0;
    }
    
    drawDisplay() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        
        // Background
        ctx.fillStyle = '#0a0515';
        ctx.fillRect(0, 0, W, H);
        
        // Win flash overlay
        if (this.winFlash > 0) {
            ctx.fillStyle = `rgba(255, 215, 0, ${this.winFlash * 0.5})`;
            ctx.fillRect(0, 0, W, H);
        }
        
        // Dollar sign - larger and bolder
        ctx.font = 'bold 180px Impact, Arial Black, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#00FF00';
        ctx.shadowColor = '#00FF00';
        ctx.shadowBlur = 25;
        ctx.fillText('$', 40, H / 2);
        
        // Format number with commas
        const formattedValue = Math.floor(this.displayValue).toLocaleString('en-US');
        
        // Main number display - MUCH larger font for visibility
        ctx.font = 'bold 200px Impact, Arial Black, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00FF00';
        ctx.shadowColor = '#00FF00';
        ctx.shadowBlur = 30;
        ctx.fillText(formattedValue, W / 2 + 60, H / 2);
        
        ctx.shadowBlur = 0;
        
        this.texture.needsUpdate = true;
    }
    
    createLEDBorder(group, width, height) {
        const THREE = this.THREE;
        const ledSize = 0.18;
        const ledSpacing = 0.5;
        
        const ledGeo = new THREE.SphereGeometry(ledSize, 6, 6);
        
        const createLED = (x, y, idx) => {
            const ledMat = this.createMaterial({
                color: 0xFFD700,
                emissive: 0xFFD700,
                emissiveIntensity: 0.8
            });
            
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(x, y, 0.5);
            led.userData.ledIndex = idx;
            this.addMesh(led, group);
            this.borderLEDs.push(led);
        };
        
        let idx = 0;
        const hw = width / 2 + 1;
        const hh = height / 2 + 1;
        
        // Top row
        for (let lx = -hw; lx <= hw; lx += ledSpacing) {
            createLED(lx, hh, idx++);
        }
        
        // Right column
        for (let ly = hh - ledSpacing; ly >= -hh; ly -= ledSpacing) {
            createLED(hw, ly, idx++);
        }
        
        // Bottom row
        for (let lx = hw - ledSpacing; lx >= -hw; lx -= ledSpacing) {
            createLED(lx, -hh, idx++);
        }
        
        // Left column
        for (let ly = -hh + ledSpacing; ly <= hh - ledSpacing; ly += ledSpacing) {
            createLED(-hw, ly, idx++);
        }
    }
    
    createCornerDecorations(group, width, height) {
        const THREE = this.THREE;
        
        const corners = [
            { x: -width / 2 - 1.2, y: height / 2 + 1.2 },
            { x: width / 2 + 1.2, y: height / 2 + 1.2 },
            { x: -width / 2 - 1.2, y: -height / 2 - 1.2 },
            { x: width / 2 + 1.2, y: -height / 2 - 1.2 }
        ];
        
        corners.forEach((corner, cornerIdx) => {
            // Diamond shape
            const diamondMat = this.createMaterial({
                color: 0xFF0000,
                emissive: 0xFF0000,
                emissiveIntensity: 0.8
            });
            
            const diamondGeo = new THREE.OctahedronGeometry(0.4, 0);
            const diamond = new THREE.Mesh(diamondGeo, diamondMat);
            diamond.position.set(corner.x, corner.y, 0.5);
            diamond.userData.cornerIdx = cornerIdx;
            diamond.userData.isCornerDiamond = true;
            this.addMesh(diamond, group);
        });
    }
    
    update(time, delta) {
        // Smoothly increment toward target value
        if (this.displayValue < this.targetValue) {
            const increment = Math.max(1, (this.targetValue - this.displayValue) * 0.02);
            this.displayValue = Math.min(this.targetValue, this.displayValue + increment);
        } else {
            // Set new target periodically
            this.targetValue = this.displayValue + Math.floor(Math.random() * 100000) + 10000;
        }
        
        // Update win flash
        if (this.winFlash > 0) {
            this.winFlash = Math.max(0, this.winFlash - delta * 3);
        }
        
        // Trigger occasional win flash
        if (Math.random() < 0.002) {
            this.winFlash = 1;
        }
        
        // Animate LED border
        this.borderLEDs.forEach((led) => {
            const idx = led.userData.ledIndex;
            const total = this.borderLEDs.length;
            
            // Chase pattern
            const chasePhase = ((time * 8 + idx) % total) / total;
            const isLit = chasePhase < 0.2;
            
            led.material.emissiveIntensity = isLit ? 1.0 : 0.3;
            
            // Color cycling during win flash
            if (this.winFlash > 0) {
                const hue = (time * 2 + idx * 0.1) % 1;
                led.material.emissive.setHSL(hue, 1, 0.5);
            } else {
                // Normal gold/red alternating
                const colorPhase = Math.floor(time * 3 + idx * 0.2) % 2;
                led.material.emissive.setHex(colorPhase === 0 ? 0xFFD700 : 0xFF0000);
            }
        });
        
        // Animate corner diamonds
        this.meshes.forEach(mesh => {
            if (mesh.userData.isCornerDiamond) {
                const idx = mesh.userData.cornerIdx;
                mesh.rotation.y = time * 2 + idx * Math.PI / 2;
                mesh.rotation.x = Math.sin(time * 3 + idx) * 0.3;
                
                const pulse = Math.sin(time * 4 + idx * Math.PI / 2) * 0.5 + 0.5;
                mesh.material.emissiveIntensity = 0.5 + pulse * 0.5;
                mesh.scale.setScalar(1 + pulse * 0.2);
            }
        });
        
        // Redraw display
        this.drawDisplay();
    }
}

export default JackpotDisplay;

