/**
 * Igloo - Enhanced quality igloo with improved visual details
 * 
 * BALANCED FOR QUALITY + PERFORMANCE:
 * - Smoother dome (24x16 segments)
 * - Ice block pattern overlay
 * - Detailed entrance with arch
 * - Icicles and snow mounds
 * - Warm interior glow
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Igloo extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} withEntrance - Include the entrance tunnel
     */
    constructor(THREE, withEntrance = true) {
        super(THREE);
        this.withEntrance = withEntrance;
        this.matManager = getMaterialManager(THREE);
        this.domeRadius = 3.2;
        this.domeHeight = 2.5;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'igloo';
        group.position.set(x, y, z);
        
        // Enhanced material palette
        const iceWhite = this.matManager.get(0xF0F8FF, { roughness: 0.25, metalness: 0.05 });
        const iceMedium = this.matManager.get(0xE0EEF8, { roughness: 0.35, metalness: 0.03 });
        const iceBlue = this.matManager.get(0xD8EAF5, { roughness: 0.3, metalness: 0.08 });
        const iceShadow = this.matManager.get(0xC8D8E8, { roughness: 0.4, metalness: 0.02 });
        const darkMat = this.matManager.get('#030810', { roughness: 1 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.5 });
        const warmGlow = this.matManager.get(0xFFAA44, { 
            emissive: 0xFF8833, 
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.7
        });
        
        // Main dome - smooth quality (24x16 segments)
        const domeGeo = new THREE.SphereGeometry(this.domeRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, iceWhite);
        dome.scale.y = this.domeHeight / this.domeRadius;
        dome.castShadow = true;
        dome.receiveShadow = true;
        this.addMesh(dome, group);
        
        // Ice block pattern rings (subtle visual detail)
        this.createBlockRings(group, iceShadow);
        
        // Enhanced entrance tunnel
        if (this.withEntrance) {
            this.createEntranceEnhanced(group, iceMedium, iceBlue, snowMat, warmGlow, darkMat);
        }
        
        // Snow drift ring at base
        const driftGeo = new THREE.TorusGeometry(this.domeRadius + 0.5, 0.7, 10, 24);
        const drift = new THREE.Mesh(driftGeo, snowMat);
        drift.rotation.x = Math.PI / 2;
        drift.position.y = 0.2;
        drift.scale.y = 0.35;
        this.addMesh(drift, group);
        
        // Snow mounds around base
        this.createSnowMounds(group, snowMat);
        
        // Icicles hanging from dome edge
        this.createIcicles(group);
        
        return this;
    }
    
    /**
     * Create subtle ice block ring pattern on dome
     */
    createBlockRings(group, shadowMat) {
        const THREE = this.THREE;
        const ringCount = 4;
        
        for (let i = 0; i < ringCount; i++) {
            const t = (i + 1) / (ringCount + 1);
            const y = this.domeHeight * t * 0.85;
            const ringRadius = this.domeRadius * Math.cos(Math.asin(t * 0.85)) * 1.01;
            
            const ringGeo = new THREE.TorusGeometry(ringRadius, 0.04, 4, 32);
            const ring = new THREE.Mesh(ringGeo, shadowMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = y;
            this.addMesh(ring, group);
        }
    }
    
    /**
     * Enhanced entrance with arch and details
     */
    createEntranceEnhanced(group, iceMedium, iceBlue, snowMat, warmGlow, darkMat) {
        const THREE = this.THREE;
        const tunnelW = 1.5;
        const tunnelH = 1.5;
        const tunnelD = 2.2;
        const tunnelZ = this.domeRadius * 0.55;
        
        // Tunnel walls (left and right)
        const wallGeo = new THREE.BoxGeometry(0.25, tunnelH, tunnelD);
        [-1, 1].forEach(side => {
            const wall = new THREE.Mesh(wallGeo, iceMedium);
            wall.position.set(side * (tunnelW / 2 + 0.1), tunnelH / 2, tunnelZ + tunnelD / 2);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.addMesh(wall, group);
        });
        
        // Arched roof
        const roofGeo = new THREE.CylinderGeometry(tunnelW / 2 + 0.15, tunnelW / 2 + 0.15, tunnelD, 12, 1, true, 0, Math.PI);
        const roof = new THREE.Mesh(roofGeo, iceMedium);
        roof.rotation.x = Math.PI / 2;
        roof.rotation.z = Math.PI / 2;
        roof.position.set(0, tunnelH, tunnelZ + tunnelD / 2);
        roof.castShadow = true;
        this.addMesh(roof, group);
        
        // Tunnel floor
        const floorGeo = new THREE.BoxGeometry(tunnelW + 0.4, 0.08, tunnelD + 0.4);
        const floor = new THREE.Mesh(floorGeo, iceMedium);
        floor.position.set(0, 0.04, tunnelZ + tunnelD / 2);
        floor.receiveShadow = true;
        this.addMesh(floor, group);
        
        // Entrance arch frame (decorative blocks)
        const archBlockCount = 5;
        for (let i = 0; i < archBlockCount; i++) {
            const angle = (i / (archBlockCount - 1)) * Math.PI;
            const archRadius = tunnelW / 2 + 0.3;
            const blockGeo = new THREE.BoxGeometry(0.25, 0.18, 0.18);
            const block = new THREE.Mesh(blockGeo, iceBlue);
            block.position.set(
                Math.cos(angle) * archRadius,
                tunnelH * 0.55 + Math.sin(angle) * archRadius * 0.6,
                tunnelZ + tunnelD + 0.1
            );
            block.rotation.z = angle - Math.PI / 2;
            this.addMesh(block, group);
        }
        
        // Warm glow from interior
        const glowGeo = new THREE.CircleGeometry(tunnelW * 0.45, 12);
        const glow = new THREE.Mesh(glowGeo, warmGlow);
        glow.position.set(0, tunnelH * 0.55, tunnelZ - 0.1);
        this.addMesh(glow, group);
        
        // Dark interior void
        const interiorGeo = new THREE.CircleGeometry(tunnelW * 0.5, 12);
        const interior = new THREE.Mesh(interiorGeo, darkMat);
        interior.position.set(0, tunnelH * 0.55, tunnelZ - 0.15);
        this.addMesh(interior, group);
        
        // Snow piles at entrance sides
        [-1, 1].forEach(side => {
            const pile = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), snowMat);
            pile.position.set(side * 1.3, 0.2, tunnelZ + tunnelD + 0.6);
            pile.scale.set(1.2, 0.45, 1.0);
            pile.castShadow = true;
            this.addMesh(pile, group);
        });
    }
    
    /**
     * Create snow mounds around the igloo base
     */
    createSnowMounds(group, snowMat) {
        const THREE = this.THREE;
        const moundPositions = [
            { x: -2.5, z: -2.0, scale: 1.2 },
            { x: 2.8, z: -1.5, scale: 1.0 },
            { x: -3.0, z: 1.0, scale: 0.9 },
            { x: 3.2, z: 0.5, scale: 1.1 },
        ];
        
        moundPositions.forEach(pos => {
            const mound = new THREE.Mesh(
                new THREE.SphereGeometry(0.6 * pos.scale, 8, 6),
                snowMat
            );
            mound.position.set(pos.x, 0.15, pos.z);
            mound.scale.set(1.5, 0.4, 1.3);
            mound.castShadow = true;
            this.addMesh(mound, group);
        });
    }
    
    /**
     * Create icicles hanging from dome edge
     */
    createIcicles(group) {
        const THREE = this.THREE;
        const icicleMat = this.matManager.get(0xE8F4FF, { 
            roughness: 0.1, 
            metalness: 0.1,
            transparent: true,
            opacity: 0.85
        });
        
        const icicleCount = 8;
        for (let i = 0; i < icicleCount; i++) {
            // Skip the entrance area (front)
            const angle = (i / icicleCount) * Math.PI * 2 + Math.PI * 0.15;
            if (angle > Math.PI * 0.3 && angle < Math.PI * 0.7) continue; // Skip front
            
            const x = Math.sin(angle) * (this.domeRadius - 0.1);
            const z = Math.cos(angle) * (this.domeRadius - 0.1);
            const length = 0.3 + Math.random() * 0.4;
            
            const icicleGeo = new THREE.ConeGeometry(0.06, length, 4);
            const icicle = new THREE.Mesh(icicleGeo, icicleMat);
            icicle.position.set(x, 0.6 - length / 2, z);
            icicle.rotation.x = Math.PI;
            this.addMesh(icicle, group);
        }
    }
    
    // Keep the old detailed entrance method for backwards compatibility (not called by default)
    createEntranceDetailed(group, iceMedium, iceWhite, iceBlue, snowMat, warmGlow, darkMat) {
        const THREE = this.THREE;
        const tunnelW = 1.4;
        const tunnelH = 1.4;
        const tunnelD = 2.0;
        const tunnelZ = this.domeRadius * 0.6;
        
        const wallExtrudeSettings = { depth: tunnelD, bevelEnabled: false };
        
        // Left wall
        const leftWallShape = new THREE.Shape();
        leftWallShape.moveTo(-tunnelW/2 - 0.15, 0);
        leftWallShape.lineTo(-tunnelW/2 - 0.15, tunnelH * 0.8);
        leftWallShape.quadraticCurveTo(-tunnelW/2 - 0.15, tunnelH + 0.1, -tunnelW/4, tunnelH + 0.2);
        leftWallShape.lineTo(-tunnelW/2, tunnelH);
        leftWallShape.quadraticCurveTo(-tunnelW/2, tunnelH * 0.7, -tunnelW/2, 0);
        
        const leftWallGeo = new THREE.ExtrudeGeometry(leftWallShape, wallExtrudeSettings);
        const leftWall = new THREE.Mesh(leftWallGeo, iceMedium);
        leftWall.position.set(0, 0, tunnelZ);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        this.addMesh(leftWall, group);
        
        // Right wall (mirror)
        const rightWallShape = new THREE.Shape();
        rightWallShape.moveTo(tunnelW/2 + 0.15, 0);
        rightWallShape.lineTo(tunnelW/2 + 0.15, tunnelH * 0.8);
        rightWallShape.quadraticCurveTo(tunnelW/2 + 0.15, tunnelH + 0.1, tunnelW/4, tunnelH + 0.2);
        rightWallShape.lineTo(tunnelW/2, tunnelH);
        rightWallShape.quadraticCurveTo(tunnelW/2, tunnelH * 0.7, tunnelW/2, 0);
        
        const rightWallGeo = new THREE.ExtrudeGeometry(rightWallShape, wallExtrudeSettings);
        const rightWall = new THREE.Mesh(rightWallGeo, iceMedium);
        rightWall.position.set(0, 0, tunnelZ);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        this.addMesh(rightWall, group);
        
        // Arched roof
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-tunnelW/2 - 0.1, tunnelH);
        roofShape.quadraticCurveTo(0, tunnelH + 0.5, tunnelW/2 + 0.1, tunnelH);
        roofShape.lineTo(tunnelW/2 + 0.2, tunnelH + 0.15);
        roofShape.quadraticCurveTo(0, tunnelH + 0.7, -tunnelW/2 - 0.2, tunnelH + 0.15);
        
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, wallExtrudeSettings);
        const roof = new THREE.Mesh(roofGeo, iceWhite);
        roof.position.set(0, 0, tunnelZ);
        roof.castShadow = true;
        this.addMesh(roof, group);
        
        // Tunnel floor
        const floorGeo = new THREE.BoxGeometry(tunnelW + 0.3, 0.06, tunnelD + 0.3);
        const floor = new THREE.Mesh(floorGeo, this.matManager.get(0xE0E8EE, { roughness: 0.55 }));
        floor.position.set(0, 0.03, tunnelZ + tunnelD / 2);
        floor.receiveShadow = true;
        this.addMesh(floor, group);
        
        // Warm glow from interior
        const glowGeo = new THREE.CircleGeometry(tunnelW * 0.4, 16);
        const glow = new THREE.Mesh(glowGeo, warmGlow);
        glow.position.set(0, tunnelH * 0.5, tunnelZ - 0.1);
        this.addMesh(glow, group);
        
        // Dark interior
        const interiorGeo = new THREE.CircleGeometry(tunnelW * 0.45, 16);
        const interior = new THREE.Mesh(interiorGeo, darkMat);
        interior.position.set(0, tunnelH * 0.5, tunnelZ - 0.15);
        this.addMesh(interior, group);
        
        // Entrance arch frame
        const archBlockCount = 7;
        for (let i = 0; i < archBlockCount; i++) {
            const angle = (i / (archBlockCount - 1)) * Math.PI;
            const archRadius = tunnelW / 2 + 0.25;
            const blockGeo = new THREE.BoxGeometry(0.2, 0.15, 0.15);
            const block = new THREE.Mesh(blockGeo, iceBlue);
            block.position.set(
                Math.cos(angle) * archRadius,
                tunnelH * 0.5 + Math.sin(angle) * archRadius,
                tunnelZ + tunnelD + 0.08
            );
            block.rotation.z = angle - Math.PI / 2;
            this.addMesh(block, group);
        }
        
        // Snow piles at entrance
        [-1, 1].forEach(side => {
            const pile = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), snowMat);
            pile.position.set(side * 1.2, 0.2, tunnelZ + tunnelD + 0.5);
            pile.scale.set(1.3, 0.5, 1.1);
            pile.castShadow = true;
            this.addMesh(pile, group);
        });
    }
    
    // REMOVED: createSnowMounds - 5 extra meshes, not worth the draw calls
    // REMOVED: createIcicles - 8 extra meshes, not visible at distance
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = this.domeRadius + 0.5;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.domeHeight,
        };
    }
    
    getTrigger() {
        if (!this.group || !this.withEntrance) return null;
        
        return {
            x: this.group.position.x,
            z: this.group.position.z + this.domeRadius + 2.2,
            radius: 1.5,
            type: 'enter_igloo',
            data: {}
        };
    }
}

export default Igloo;

