/**
 * SKNYIgloo - SKNY GANG Nightclub-themed Igloo #3
 * A miniature nightclub with animated neon signs, LED strips, and rave aesthetics
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

class SKNYIgloo extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.matManager = getMaterialManager(THREE);
        this.domeRadius = 3.5;
        this.domeHeight = 2.8;
        this.animatedElements = [];
        this.lights = [];
        this.time = 0;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'skny_igloo';
        group.position.set(x, y, z);
        
        // Dark base materials
        const darkMetal = this.matManager.get(0x0a0a0f, { roughness: 0.3, metalness: 0.8 });
        const blackMat = this.matManager.get(0x050508, { roughness: 0.4, metalness: 0.6 });
        const chromeMat = this.matManager.get(0x888899, { roughness: 0.1, metalness: 0.95 });
        
        // Neon colors
        const neonPink = this.matManager.get(0xff00ff, { emissive: 0xff00ff, emissiveIntensity: 2.0 });
        const neonCyan = this.matManager.get(0x00ffff, { emissive: 0x00ffff, emissiveIntensity: 2.0 });
        const neonPurple = this.matManager.get(0x9900ff, { emissive: 0x9900ff, emissiveIntensity: 1.8 });
        const neonGreen = this.matManager.get(0x00ff66, { emissive: 0x00ff66, emissiveIntensity: 1.5 });
        const goldMat = this.matManager.get(0xffd700, { emissive: 0xffa500, emissiveIntensity: 0.8, metalness: 0.9 });
        
        // Main dome - dark metallic with hexagonal pattern
        this._createNightclubDome(group, darkMetal, blackMat, chromeMat);
        
        // Neon ring strips around dome
        this._createNeonRings(group, neonPink, neonCyan, neonPurple);
        
        // SKNY GANG ticker sign
        this._createTickerSign(group, neonPink, neonCyan, goldMat);
        
        // $WADDLE logo
        this._createWADDLELogo(group, neonGreen, goldMat);
        
        // Entrance with VIP rope and lights
        this._createVIPEntrance(group, chromeMat, neonPurple, neonPink);
        
        // Animated searchlights on top
        this._createSearchlights(group);
        
        // LED ground strips
        this._createGroundLEDs(group);
        
        // Smoke machine vents
        this._createSmokeVents(group, darkMetal);
        
        // Speakers on exterior
        this._createExteriorSpeakers(group, blackMat, chromeMat);
        
        return this;
    }
    
    _createNightclubDome(group, darkMetal, blackMat, chromeMat) {
        const THREE = this.THREE;
        
        // Main dome with darker aesthetic
        const domeGeo = new THREE.SphereGeometry(this.domeRadius, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, darkMetal);
        dome.scale.y = this.domeHeight / this.domeRadius;
        dome.castShadow = true;
        dome.receiveShadow = true;
        this.addMesh(dome, group);
        
        // Hexagonal panel overlay
        const panelCount = 24;
        for (let i = 0; i < panelCount; i++) {
            const angle = (i / panelCount) * Math.PI * 2;
            const rowCount = 4;
            for (let row = 0; row < rowCount; row++) {
                const t = (row + 0.5) / (rowCount + 1);
                const rowY = t * this.domeHeight * 0.85;
                const rowRadius = this.domeRadius * Math.sqrt(1 - Math.pow(t * 0.9, 2)) * 0.98;
                
                if (rowRadius < 0.8) continue;
                
                // Skip entrance area
                if (Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) > 0) continue;
                
                const hexGeo = new THREE.CircleGeometry(0.25, 6);
                const hexMat = row % 2 === 0 ? blackMat : chromeMat;
                const hex = new THREE.Mesh(hexGeo, hexMat);
                hex.position.set(
                    Math.cos(angle + row * 0.2) * rowRadius,
                    rowY,
                    Math.sin(angle + row * 0.2) * rowRadius
                );
                hex.lookAt(0, rowY, 0);
                this.addMesh(hex, group);
            }
        }
        
        // Chrome trim at base
        const baseTrimGeo = new THREE.TorusGeometry(this.domeRadius + 0.1, 0.08, 8, 48);
        const baseTrim = new THREE.Mesh(baseTrimGeo, chromeMat);
        baseTrim.rotation.x = Math.PI / 2;
        baseTrim.position.y = 0.05;
        this.addMesh(baseTrim, group);
    }
    
    _createNeonRings(group, neonPink, neonCyan, neonPurple) {
        const THREE = this.THREE;
        const colors = [neonPink, neonCyan, neonPurple, neonPink, neonCyan];
        
        for (let i = 0; i < 5; i++) {
            const t = (i + 1) / 6;
            const ringY = t * this.domeHeight * 0.9;
            const ringRadius = this.domeRadius * Math.sqrt(1 - Math.pow(t * 0.85, 2)) * 0.99;
            
            if (ringRadius < 0.5) continue;
            
            const ringGeo = new THREE.TorusGeometry(ringRadius, 0.03, 8, 64);
            const ring = new THREE.Mesh(ringGeo, colors[i % colors.length]);
            ring.position.y = ringY;
            ring.rotation.x = Math.PI / 2;
            this.addMesh(ring, group);
            
            this.animatedElements.push({
                type: 'neonRing',
                mesh: ring,
                baseIntensity: 2.0,
                phase: i * 0.5
            });
        }
    }
    
    _createTickerSign(group, neonPink, neonCyan, goldMat) {
        const THREE = this.THREE;
        
        // Ticker board backing
        const boardWidth = 3.5;
        const boardHeight = 0.8;
        const boardGeo = new THREE.BoxGeometry(boardWidth, boardHeight, 0.15);
        const boardMat = this.matManager.get(0x0a0a12, { roughness: 0.3, metalness: 0.7 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(0, this.domeHeight + 0.8, -this.domeRadius * 0.3);
        board.rotation.x = -0.2;
        this.addMesh(board, group);
        
        // Chrome frame
        const frameGeo = new THREE.BoxGeometry(boardWidth + 0.15, boardHeight + 0.15, 0.08);
        const frameMat = this.matManager.get(0xaaaacc, { roughness: 0.1, metalness: 0.95 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.copy(board.position);
        frame.position.z -= 0.05;
        frame.rotation.x = -0.2;
        this.addMesh(frame, group);
        
        // "SKNY GANG" text using simple geometry
        const letters = ['S', 'K', 'N', 'Y', ' ', 'G', 'A', 'N', 'G'];
        const letterWidth = 0.3;
        const startX = -((letters.length - 1) * letterWidth) / 2;
        
        letters.forEach((letter, i) => {
            if (letter === ' ') return;
            
            // Each letter is a glowing box
            const letterGeo = new THREE.BoxGeometry(0.22, 0.4, 0.05);
            const letterMat = i < 4 ? neonPink : goldMat;
            const letterMesh = new THREE.Mesh(letterGeo, letterMat);
            letterMesh.position.set(
                startX + i * letterWidth,
                this.domeHeight + 0.85,
                -this.domeRadius * 0.3 + 0.1
            );
            letterMesh.rotation.x = -0.2;
            this.addMesh(letterMesh, group);
            
            this.animatedElements.push({
                type: 'tickerLetter',
                mesh: letterMesh,
                index: i,
                baseY: letterMesh.position.y
            });
        });
        
        // Animated border lights
        const lightCount = 20;
        for (let i = 0; i < lightCount; i++) {
            const t = i / lightCount;
            const x = (t - 0.5) * boardWidth * 0.95;
            const isTop = i < lightCount / 2;
            const y = board.position.y + (isTop ? boardHeight / 2 + 0.05 : -boardHeight / 2 - 0.05);
            
            const bulbGeo = new THREE.SphereGeometry(0.04, 8, 8);
            const bulb = new THREE.Mesh(bulbGeo, i % 2 === 0 ? neonPink : neonCyan);
            bulb.position.set(
                isTop ? (i / (lightCount / 2) - 0.5) * boardWidth * 0.95 : ((i - lightCount / 2) / (lightCount / 2) - 0.5) * boardWidth * 0.95,
                y,
                board.position.z + 0.1
            );
            this.addMesh(bulb, group);
            
            this.animatedElements.push({
                type: 'borderLight',
                mesh: bulb,
                index: i
            });
        }
    }
    
    _createWADDLELogo(group, neonGreen, goldMat) {
        const THREE = this.THREE;
        
        // $WADDLE sign on side
        const signGroup = new THREE.Group();
        
        // Dollar sign
        const dollarGeo = new THREE.BoxGeometry(0.15, 0.5, 0.05);
        const dollar = new THREE.Mesh(dollarGeo, neonGreen);
        dollar.position.set(-0.7, 0, 0);
        signGroup.add(dollar);
        
        // WADDLE letters
        const waddleLetters = ['W', 'A', 'D', 'D', 'L', 'E'];
        waddleLetters.forEach((letter, i) => {
            const lGeo = new THREE.BoxGeometry(0.16, 0.35, 0.05);
            const lMesh = new THREE.Mesh(lGeo, goldMat);
            lMesh.position.set(-0.45 + i * 0.22, 0, 0);
            signGroup.add(lMesh);
        });
        
        signGroup.position.set(-this.domeRadius - 0.2, 1.5, 0);
        signGroup.rotation.y = Math.PI / 2;
        this.addMesh(signGroup, group);
        
        this.animatedElements.push({
            type: 'waddleSign',
            mesh: signGroup,
            baseY: 1.5
        });
    }
    
    _createVIPEntrance(group, chromeMat, neonPurple, neonPink) {
        const THREE = this.THREE;
        const tunnelZ = this.domeRadius * 0.6;
        const tunnelW = 1.6;
        const tunnelH = 1.8;
        const tunnelD = 2.2;
        
        // Dark entrance tunnel
        const tunnelMat = this.matManager.get(0x08080f, { roughness: 0.4, metalness: 0.5 });
        
        // Left wall
        const wallGeo = new THREE.BoxGeometry(0.2, tunnelH, tunnelD);
        const leftWall = new THREE.Mesh(wallGeo, tunnelMat);
        leftWall.position.set(-tunnelW / 2 - 0.1, tunnelH / 2, tunnelZ + tunnelD / 2);
        this.addMesh(leftWall, group);
        
        // Right wall
        const rightWall = new THREE.Mesh(wallGeo, tunnelMat);
        rightWall.position.set(tunnelW / 2 + 0.1, tunnelH / 2, tunnelZ + tunnelD / 2);
        this.addMesh(rightWall, group);
        
        // Roof
        const roofGeo = new THREE.BoxGeometry(tunnelW + 0.4, 0.15, tunnelD);
        const roof = new THREE.Mesh(roofGeo, tunnelMat);
        roof.position.set(0, tunnelH + 0.08, tunnelZ + tunnelD / 2);
        this.addMesh(roof, group);
        
        // Floor - red carpet style
        const carpetMat = this.matManager.get(0x8b0000, { roughness: 0.9 });
        const carpet = new THREE.Mesh(new THREE.BoxGeometry(tunnelW, 0.05, tunnelD + 1.5), carpetMat);
        carpet.position.set(0, 0.025, tunnelZ + tunnelD / 2 + 0.5);
        carpet.receiveShadow = true;
        this.addMesh(carpet, group);
        
        // VIP rope posts
        [-tunnelW / 2 - 0.6, tunnelW / 2 + 0.6].forEach((xPos, i) => {
            // Chrome post
            const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.0, 12);
            const post = new THREE.Mesh(postGeo, chromeMat);
            post.position.set(xPos, 0.5, tunnelZ + tunnelD + 0.8);
            this.addMesh(post, group);
            
            // Gold ball on top
            const ballGeo = new THREE.SphereGeometry(0.1, 12, 12);
            const ballMat = this.matManager.get(0xffd700, { roughness: 0.2, metalness: 0.9 });
            const ball = new THREE.Mesh(ballGeo, ballMat);
            ball.position.set(xPos, 1.05, tunnelZ + tunnelD + 0.8);
            this.addMesh(ball, group);
        });
        
        // Velvet rope (purple neon)
        const ropeGeo = new THREE.CylinderGeometry(0.025, 0.025, tunnelW + 0.8, 8);
        const rope = new THREE.Mesh(ropeGeo, neonPurple);
        rope.rotation.z = Math.PI / 2;
        rope.position.set(0, 0.85, tunnelZ + tunnelD + 0.8);
        this.addMesh(rope, group);
        
        // Entrance arch with lights
        const archLightCount = 12;
        for (let i = 0; i < archLightCount; i++) {
            const angle = (i / (archLightCount - 1)) * Math.PI;
            const archRadius = tunnelW / 2 + 0.35;
            const lightGeo = new THREE.SphereGeometry(0.06, 8, 8);
            const lightMat = i % 3 === 0 ? neonPink : (i % 3 === 1 ? neonPurple : this.matManager.get(0x00ffff, { emissive: 0x00ffff, emissiveIntensity: 2.0 }));
            const light = new THREE.Mesh(lightGeo, lightMat);
            light.position.set(
                Math.cos(angle) * archRadius,
                tunnelH * 0.5 + Math.sin(angle) * (tunnelH * 0.5 + 0.2),
                tunnelZ + tunnelD + 0.12
            );
            this.addMesh(light, group);
            
            this.animatedElements.push({
                type: 'archLight',
                mesh: light,
                index: i
            });
        }
        
        // Interior glow
        const glowMat = this.matManager.get(0xff00ff, { 
            emissive: 0xff00ff, 
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.4
        });
        const glowGeo = new THREE.CircleGeometry(tunnelW * 0.5, 16);
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.set(0, tunnelH * 0.5, tunnelZ - 0.1);
        this.addMesh(glow, group);
        
        this.animatedElements.push({
            type: 'entranceGlow',
            mesh: glow
        });
    }
    
    _createSearchlights(group) {
        const THREE = this.THREE;
        
        // Two searchlights on top
        [-0.8, 0.8].forEach((xOffset, i) => {
            const searchGroup = new THREE.Group();
            
            // Base
            const baseGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.2, 12);
            const baseMat = this.matManager.get(0x222233, { roughness: 0.3, metalness: 0.8 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            searchGroup.add(base);
            
            // Light housing
            const housingGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.3, 12);
            const housingMat = this.matManager.get(0x333344, { roughness: 0.2, metalness: 0.9 });
            const housing = new THREE.Mesh(housingGeo, housingMat);
            housing.position.y = 0.2;
            housing.rotation.x = Math.PI / 4;
            searchGroup.add(housing);
            
            // Light beam (cone) - flipped so wide end is at housing, tip points outward
            const beamMat = this.matManager.get(0xffffff, { 
                emissive: 0xffffff, 
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.15
            });
            const beamGeo = new THREE.ConeGeometry(0.8, 4, 16, 1, true);
            const beam = new THREE.Mesh(beamGeo, beamMat);
            beam.position.y = 2.2;
            beam.rotation.x = Math.PI / 4 + Math.PI; // Flip cone 180 degrees
            searchGroup.add(beam);
            
            searchGroup.position.set(xOffset, this.domeHeight - 0.1, -0.5);
            this.addMesh(searchGroup, group);
            
            this.animatedElements.push({
                type: 'searchlight',
                mesh: searchGroup,
                index: i,
                baseRotation: searchGroup.rotation.y
            });
        });
    }
    
    _createGroundLEDs(group) {
        const THREE = this.THREE;
        
        // LED strip around base
        const ledCount = 32;
        const colors = [0xff00ff, 0x00ffff, 0x9900ff, 0x00ff66];
        
        for (let i = 0; i < ledCount; i++) {
            const angle = (i / ledCount) * Math.PI * 2;
            
            // Skip entrance area
            if (Math.abs(Math.sin(angle)) < 0.25 && Math.cos(angle) > 0) continue;
            
            const ledGeo = new THREE.BoxGeometry(0.15, 0.05, 0.15);
            const ledColor = colors[i % colors.length];
            const ledMat = this.matManager.get(ledColor, { 
                emissive: ledColor, 
                emissiveIntensity: 1.5 
            });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(
                Math.cos(angle) * (this.domeRadius + 0.5),
                0.025,
                Math.sin(angle) * (this.domeRadius + 0.5)
            );
            led.rotation.y = angle;
            this.addMesh(led, group);
            
            this.animatedElements.push({
                type: 'groundLED',
                mesh: led,
                index: i,
                baseColor: ledColor
            });
        }
    }
    
    _createSmokeVents(group, darkMetal) {
        const THREE = this.THREE;
        
        // Smoke vents at corners
        const ventPositions = [
            { x: -2.5, z: -2 },
            { x: 2.5, z: -2 }
        ];
        
        ventPositions.forEach(pos => {
            const ventGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.3, 8);
            const vent = new THREE.Mesh(ventGeo, darkMetal);
            vent.position.set(pos.x, 0.15, pos.z);
            this.addMesh(vent, group);
            
            // Grate on top
            const grateGeo = new THREE.CircleGeometry(0.14, 8);
            const grateMat = this.matManager.get(0x333333, { roughness: 0.8 });
            const grate = new THREE.Mesh(grateGeo, grateMat);
            grate.rotation.x = -Math.PI / 2;
            grate.position.set(pos.x, 0.31, pos.z);
            this.addMesh(grate, group);
        });
    }
    
    _createExteriorSpeakers(group, blackMat, chromeMat) {
        const THREE = this.THREE;
        
        // Small speakers mounted on dome
        const speakerPositions = [
            { angle: Math.PI * 0.7, y: 1.5 },
            { angle: Math.PI * 1.3, y: 1.5 }
        ];
        
        speakerPositions.forEach(sp => {
            const speakerGroup = new THREE.Group();
            
            // Cabinet
            const cabGeo = new THREE.BoxGeometry(0.4, 0.5, 0.3);
            const cab = new THREE.Mesh(cabGeo, blackMat);
            speakerGroup.add(cab);
            
            // Woofer
            const wooferGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.05, 16);
            const wooferMat = this.matManager.get(0x222222, { roughness: 0.6 });
            const woofer = new THREE.Mesh(wooferGeo, wooferMat);
            woofer.rotation.x = Math.PI / 2;
            woofer.position.z = 0.16;
            speakerGroup.add(woofer);
            
            // Chrome trim
            const trimGeo = new THREE.TorusGeometry(0.15, 0.02, 8, 16);
            const trim = new THREE.Mesh(trimGeo, chromeMat);
            trim.position.z = 0.16;
            speakerGroup.add(trim);
            
            const radius = this.domeRadius * 0.85;
            speakerGroup.position.set(
                Math.cos(sp.angle) * radius,
                sp.y,
                Math.sin(sp.angle) * radius
            );
            speakerGroup.lookAt(0, sp.y, 0);
            this.addMesh(speakerGroup, group);
            
            this.animatedElements.push({
                type: 'speaker',
                mesh: woofer,
                baseScale: 1.0
            });
        });
    }
    
    update(time) {
        this.time = time;
        
        this.animatedElements.forEach(el => {
            switch (el.type) {
                case 'neonRing':
                    if (el.mesh.material) {
                        el.mesh.material.emissiveIntensity = el.baseIntensity + Math.sin(time * 3 + el.phase) * 0.5;
                    }
                    break;
                    
                case 'tickerLetter':
                    el.mesh.position.y = el.baseY + Math.sin(time * 4 + el.index * 0.3) * 0.02;
                    break;
                    
                case 'borderLight':
                    if (el.mesh.material) {
                        const on = Math.sin(time * 8 + el.index * 0.5) > 0;
                        el.mesh.material.emissiveIntensity = on ? 2.5 : 0.3;
                    }
                    break;
                    
                case 'waddleSign':
                    el.mesh.position.y = el.baseY + Math.sin(time * 2) * 0.05;
                    break;
                    
                case 'archLight':
                    if (el.mesh.material) {
                        const wave = Math.sin(time * 6 + el.index * 0.4);
                        el.mesh.material.emissiveIntensity = 1.5 + wave * 1.0;
                    }
                    break;
                    
                case 'entranceGlow':
                    if (el.mesh.material) {
                        el.mesh.material.opacity = 0.3 + Math.sin(time * 2) * 0.15;
                    }
                    break;
                    
                case 'searchlight':
                    el.mesh.rotation.y = el.baseRotation + Math.sin(time * 0.8 + el.index * Math.PI) * 0.8;
                    break;
                    
                case 'groundLED':
                    if (el.mesh.material) {
                        const pulse = Math.sin(time * 5 + el.index * 0.2) > 0.3;
                        el.mesh.material.emissiveIntensity = pulse ? 2.0 : 0.5;
                    }
                    break;
                    
                case 'speaker':
                    const bass = 1 + Math.abs(Math.sin(time * 15)) * 0.1;
                    el.mesh.scale.z = bass;
                    break;
            }
        });
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = this.domeRadius + 0.6;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.domeHeight,
        };
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        return {
            x: this.group.position.x,
            z: this.group.position.z + this.domeRadius + 2.5,
            radius: 1.8,
            type: 'enter_igloo',
            data: { iglooType: 'skny' }
        };
    }
}

export default SKNYIgloo;

