/**
 * ArcadeMachine - Retro arcade cabinet for playing minigames
 * Players can interact with it to play games like Battleship
 */

import BaseProp from './BaseProp';

class ArcadeMachine extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.screenCanvas = null;
        this.screenTexture = null;
        this.screenCtx = null;
        this.animTime = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'arcade_machine';
        
        const {
            cabinetColor = 0x1a1a2e,
            accentColor = 0x00ff88,
            screenColor = 0x0a3d62,
            gameTitle = 'BATTLESHIP',
            interactionRadius = 4
        } = options;
        
        // Cabinet body
        const cabinetMat = this.createMaterial({
            color: cabinetColor,
            roughness: 0.4,
            metalness: 0.3
        });
        
        // Main cabinet (taller at back, angled screen)
        const cabinetGeo = new THREE.BoxGeometry(2.5, 5, 1.8);
        const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
        cabinet.position.y = 2.5;
        cabinet.castShadow = true;
        cabinet.receiveShadow = true;
        this.addMesh(cabinet, group);
        
        // Monitor housing (angled top section)
        const monitorHousingGeo = new THREE.BoxGeometry(2.4, 2, 2);
        const monitorHousing = new THREE.Mesh(monitorHousingGeo, cabinetMat);
        monitorHousing.position.set(0, 4.5, -0.2);
        monitorHousing.rotation.x = -0.15;
        monitorHousing.castShadow = true;
        this.addMesh(monitorHousing, group);
        
        // Screen canvas for animated display
        this.screenCanvas = document.createElement('canvas');
        this.screenCanvas.width = 256;
        this.screenCanvas.height = 256;
        this.screenCtx = this.screenCanvas.getContext('2d');
        this.drawScreen(gameTitle, screenColor);
        
        this.screenTexture = new THREE.CanvasTexture(this.screenCanvas);
        this.screenTexture.needsUpdate = true;
        
        const screenMat = new THREE.MeshBasicMaterial({
            map: this.screenTexture
        });
        
        const screenGeo = new THREE.PlaneGeometry(2, 1.5);
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 4.5, 0.82);
        screen.rotation.x = -0.15;
        this.addMesh(screen, group);
        this.materials.push(screenMat);
        
        // Control panel (angled)
        const controlPanelMat = this.createMaterial({
            color: 0x222222,
            roughness: 0.8
        });
        
        const controlPanelGeo = new THREE.BoxGeometry(2.3, 0.3, 1.2);
        const controlPanel = new THREE.Mesh(controlPanelGeo, controlPanelMat);
        controlPanel.position.set(0, 3.2, 0.4);
        controlPanel.rotation.x = -0.3;
        this.addMesh(controlPanel, group);
        
        // Joystick
        const joystickBaseMat = this.createMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.5
        });
        
        const joystickBaseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.1, 16);
        const joystickBase = new THREE.Mesh(joystickBaseGeo, joystickBaseMat);
        joystickBase.position.set(-0.5, 3.4, 0.3);
        joystickBase.rotation.x = -0.3;
        this.addMesh(joystickBase, group);
        
        const joystickStickMat = this.createMaterial({
            color: 0xff0000,
            roughness: 0.3,
            metalness: 0.4
        });
        
        const joystickStickGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8);
        const joystickStick = new THREE.Mesh(joystickStickGeo, joystickStickMat);
        joystickStick.position.set(-0.5, 3.6, 0.25);
        this.addMesh(joystickStick, group);
        
        const joystickBallGeo = new THREE.SphereGeometry(0.1, 16, 16);
        const joystickBall = new THREE.Mesh(joystickBallGeo, joystickStickMat);
        joystickBall.position.set(-0.5, 3.8, 0.2);
        this.addMesh(joystickBall, group);
        
        // Action buttons
        const buttonColors = [0x00ff00, 0xff0000, 0x0000ff, 0xffff00];
        const buttonPositions = [
            { x: 0.3, z: 0.4 },
            { x: 0.6, z: 0.35 },
            { x: 0.3, z: 0.2 },
            { x: 0.6, z: 0.15 }
        ];
        
        buttonPositions.forEach((pos, i) => {
            const buttonMat = this.createMaterial({
                color: buttonColors[i],
                roughness: 0.2,
                metalness: 0.4,
                emissive: buttonColors[i],
                emissiveIntensity: 0.3
            });
            
            const buttonGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.06, 16);
            const button = new THREE.Mesh(buttonGeo, buttonMat);
            button.position.set(pos.x, 3.4, pos.z);
            button.rotation.x = -0.3;
            this.addMesh(button, group);
        });
        
        // Coin slot
        const coinSlotMat = this.createMaterial({
            color: 0xffd700,
            roughness: 0.3,
            metalness: 0.8
        });
        
        const coinSlotGeo = new THREE.BoxGeometry(0.15, 0.3, 0.05);
        const coinSlot = new THREE.Mesh(coinSlotGeo, coinSlotMat);
        coinSlot.position.set(0.8, 3.0, 0.9);
        this.addMesh(coinSlot, group);
        
        // Marquee (top lit sign)
        const marqueeMat = this.createMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 0.8,
            roughness: 0.2
        });
        
        const marqueeGeo = new THREE.BoxGeometry(2.4, 0.5, 0.3);
        const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
        marquee.position.set(0, 5.8, 0);
        marquee.userData.isMarquee = true;
        this.addMesh(marquee, group);
        
        // Side panel decorative stripes
        const stripeMat = this.createMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 0.4
        });
        
        [-1.26, 1.26].forEach(xPos => {
            const stripeGeo = new THREE.BoxGeometry(0.02, 4, 0.1);
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(xPos, 2.5, 0.85);
            this.addMesh(stripe, group);
        });
        
        // Point light for screen glow
        const screenLight = new THREE.PointLight(screenColor, 0.5, 3);
        screenLight.position.set(0, 4.5, 1.5);
        group.add(screenLight);
        
        // Store game title for updates
        this.gameTitle = gameTitle;
        this.screenColorHex = screenColor;
        
        // Set collision bounds (physical cabinet)
        this.collisionBounds = {
            minX: -1.3,
            maxX: 1.3,
            minZ: -0.9,
            maxZ: 0.9,
            height: 6
        };
        
        // Set interaction trigger
        this.interactionTrigger = {
            type: 'arcade',
            radius: interactionRadius,
            message: `Press E to play ${gameTitle}`,
            emote: '🎮',
            data: {
                game: gameTitle.toLowerCase().replace(/\s+/g, '_')
            }
        };
        
        // Store mesh reference (like IceFishingHole)
        this.mesh = group;
        this.mesh.userData.propType = 'arcade_machine';
        this.mesh.userData.gameType = gameTitle.toLowerCase().replace(/\s+/g, '_');
        
        this.setPosition(x, y, z);
        return this;
    }
    
    drawScreen(title, bgColor) {
        const ctx = this.screenCtx;
        const W = this.screenCanvas.width;
        const H = this.screenCanvas.height;
        
        // Background
        ctx.fillStyle = '#0a1a2e';
        ctx.fillRect(0, 0, W, H);
        
        // Scanlines effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let y = 0; y < H; y += 4) {
            ctx.fillRect(0, y, W, 2);
        }
        
        // Animated wave effect (bottom)
        const time = this.animTime || 0;
        ctx.fillStyle = 'rgba(10, 61, 98, 0.6)';
        for (let x = 0; x < W; x += 4) {
            const waveHeight = 20 + Math.sin(x * 0.05 + time) * 10;
            ctx.fillRect(x, H - waveHeight, 4, waveHeight);
        }
        
        // Grid lines for battleship
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const offset = 60;
            const size = 15;
            // Horizontal
            ctx.beginPath();
            ctx.moveTo(offset, offset + i * size);
            ctx.lineTo(offset + 10 * size, offset + i * size);
            ctx.stroke();
            // Vertical
            ctx.beginPath();
            ctx.moveTo(offset + i * size, offset);
            ctx.lineTo(offset + i * size, offset + 10 * size);
            ctx.stroke();
        }
        
        // Ship silhouettes (animated)
        ctx.fillStyle = 'rgba(0, 255, 136, 0.6)';
        const shipX = 70 + Math.sin(time * 2) * 10;
        ctx.fillRect(shipX, 80, 45, 10);
        ctx.fillRect(shipX + 60, 110, 30, 10);
        
        // Title text
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 10;
        ctx.fillText(title, W / 2, 40);
        ctx.shadowBlur = 0;
        
        // "INSERT COIN" blinking text
        if (Math.sin(time * 5) > 0) {
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = '#ffff00';
            ctx.fillText('PRESS E TO PLAY', W / 2, H - 20);
        }
        
        if (this.screenTexture) {
            this.screenTexture.needsUpdate = true;
        }
    }
    
    update(time, delta) {
        this.animTime = time;
        
        // Update screen animation
        if (this.screenCanvas && this.screenCtx) {
            this.drawScreen(this.gameTitle, this.screenColorHex);
        }
        
        // Marquee pulse
        this.meshes.forEach(mesh => {
            if (mesh.userData.isMarquee && mesh.material) {
                const pulse = 0.6 + Math.sin(time * 4) * 0.4;
                mesh.material.emissiveIntensity = pulse;
            }
        });
    }
    
    getCollisionBounds() {
        return this.collisionBounds;
    }
    
    getTrigger() {
        return this.interactionTrigger;
    }
}

export default ArcadeMachine;

