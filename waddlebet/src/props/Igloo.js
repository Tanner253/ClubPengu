/**
 * Igloo - Enhanced quality igloo with icy blue gradient and block pattern
 * 
 * BALANCED FOR QUALITY + PERFORMANCE:
 * - Vertical blue gradient on dome (dark base → light crown)
 * - Hexagonal ice panel overlay
 * - Block ring grooves
 * - Detailed entrance tunnel
 * - Icicles and snow mounds
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

/** Icy palette — avoids near-white surfaces that blow out in daylight */
const ICE_PALETTE = {
    deep: 0x1e4a66,
    dark: 0x2d6080,
    mid: 0x4a8aad,
    light: 0x6eb0cc,
    pale: 0x8ec8e3,
    frost: 0xa8d8ec,
    snow: 0xc0dce8,
};

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

        const iceDeep = this.matManager.get(ICE_PALETTE.deep, { roughness: 0.45, metalness: 0.08 });
        const iceDark = this.matManager.get(ICE_PALETTE.dark, { roughness: 0.38, metalness: 0.1 });
        const iceMid = this.matManager.get(ICE_PALETTE.mid, { roughness: 0.32, metalness: 0.12 });
        const iceLight = this.matManager.get(ICE_PALETTE.light, { roughness: 0.28, metalness: 0.14 });
        const icePale = this.matManager.get(ICE_PALETTE.pale, { roughness: 0.25, metalness: 0.1 });
        const darkMat = this.matManager.get('#061018', { roughness: 1 });
        const snowMat = this.matManager.get(ICE_PALETTE.snow, { roughness: 0.55 });
        const warmGlow = this.matManager.get(0xFFAA44, {
            emissive: 0xFF8833,
            emissiveIntensity: 0.45,
            transparent: true,
            opacity: 0.65
        });

        // Main dome with vertical icy gradient (dark base → lighter crown)
        const domeGeo = new THREE.SphereGeometry(this.domeRadius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        this.applyDomeGradient(domeGeo);
        const domeMat = this.createMaterial({
            vertexColors: true,
            roughness: 0.32,
            metalness: 0.12,
        });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.scale.y = this.domeHeight / this.domeRadius;
        dome.castShadow = true;
        dome.receiveShadow = true;
        this.addMesh(dome, group);

        // Hexagonal ice panels + horizontal groove rings
        this.createIcePanels(group, iceDeep, iceMid, iceLight);
        this.createBlockRings(group, iceDeep);

        // Frosted base band where dome meets ground
        const baseBandGeo = new THREE.TorusGeometry(this.domeRadius * 0.98, 0.12, 8, 32);
        const baseBand = new THREE.Mesh(baseBandGeo, iceDeep);
        baseBand.rotation.x = Math.PI / 2;
        baseBand.position.y = 0.08;
        this.addMesh(baseBand, group);

        if (this.withEntrance) {
            this.createEntranceEnhanced(group, iceDark, iceMid, icePale, snowMat, warmGlow, darkMat);
        }

        // Blue-tinted snow drift at base (not pure white)
        const driftGeo = new THREE.TorusGeometry(this.domeRadius + 0.5, 0.7, 10, 24);
        const drift = new THREE.Mesh(driftGeo, snowMat);
        drift.rotation.x = Math.PI / 2;
        drift.position.y = 0.2;
        drift.scale.y = 0.35;
        this.addMesh(drift, group);

        this.createSnowMounds(group, snowMat);
        this.createIcicles(group);

        return this;
    }

    /**
     * Paint dome vertices: deep blue at base transitioning to pale ice at the crown
     */
    applyDomeGradient(geometry) {
        const THREE = this.THREE;
        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        const colorBottom = new THREE.Color(ICE_PALETTE.dark);
        const colorTop = new THREE.Color(ICE_PALETTE.pale);
        const maxY = this.domeRadius;

        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i);
            const t = Math.pow(Math.max(0, Math.min(1, y / maxY)), 0.85);
            const c = colorBottom.clone().lerp(colorTop, t);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    /**
     * Hexagonal ice block panels on the dome surface (SKNY-style layout, icy colors)
     */
    createIcePanels(group, deepMat, midMat, lightMat) {
        const THREE = this.THREE;
        const panelCount = 22;
        const rowCount = 4;
        const mats = [deepMat, midMat, lightMat, midMat];

        for (let i = 0; i < panelCount; i++) {
            const angle = (i / panelCount) * Math.PI * 2;
            for (let row = 0; row < rowCount; row++) {
                const t = (row + 0.5) / (rowCount + 1);
                const rowY = t * this.domeHeight * 0.88;
                const rowRadius = this.domeRadius * Math.sqrt(1 - Math.pow(t * 0.88, 2)) * 0.97;
                if (rowRadius < 0.7) continue;

                // Skip entrance opening (front / +Z)
                if (Math.abs(Math.sin(angle)) < 0.35 && Math.cos(angle) > 0.2) continue;

                const hexGeo = new THREE.CircleGeometry(0.2 - row * 0.02, 6);
                const hex = new THREE.Mesh(hexGeo, mats[row % mats.length]);
                hex.position.set(
                    Math.sin(angle) * rowRadius,
                    rowY,
                    Math.cos(angle) * rowRadius
                );
                hex.lookAt(0, rowY, 0);
                hex.castShadow = true;
                this.addMesh(hex, group);
            }
        }
    }
    
    /**
     * Horizontal groove rings — darker blue seams between block rows
     */
    createBlockRings(group, grooveMat) {
        const THREE = this.THREE;
        const ringCount = 5;

        for (let i = 0; i < ringCount; i++) {
            const t = (i + 1) / (ringCount + 1);
            const y = this.domeHeight * t * 0.88;
            const ringRadius = this.domeRadius * Math.cos(Math.asin(t * 0.88)) * 1.005;

            const ringGeo = new THREE.TorusGeometry(ringRadius, 0.055, 4, 32);
            const ring = new THREE.Mesh(ringGeo, grooveMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = y;
            this.addMesh(ring, group);
        }
    }
    
    /**
     * Enhanced entrance — same tunnel geometry as SKNY igloo (flat roof, arch frame)
     */
    createEntranceEnhanced(group, iceDark, iceMid, icePale, snowMat, warmGlow, darkMat) {
        const THREE = this.THREE;
        const tunnelZ = this.domeRadius * 0.6;
        const tunnelW = 1.6;
        const tunnelH = 1.8;
        const tunnelD = 2.2;

        const wallGeo = new THREE.BoxGeometry(0.2, tunnelH, tunnelD);
        [-1, 1].forEach(side => {
            const wall = new THREE.Mesh(wallGeo, iceDark);
            wall.position.set(side * (tunnelW / 2 + 0.1), tunnelH / 2, tunnelZ + tunnelD / 2);
            wall.castShadow = true;
            wall.receiveShadow = true;
            this.addMesh(wall, group);
        });

        const roofGeo = new THREE.BoxGeometry(tunnelW + 0.4, 0.15, tunnelD);
        const roof = new THREE.Mesh(roofGeo, iceMid);
        roof.position.set(0, tunnelH + 0.08, tunnelZ + tunnelD / 2);
        roof.castShadow = true;
        this.addMesh(roof, group);

        const floorGeo = new THREE.BoxGeometry(tunnelW + 0.4, 0.08, tunnelD + 0.4);
        const floor = new THREE.Mesh(floorGeo, iceDark);
        floor.position.set(0, 0.04, tunnelZ + tunnelD / 2);
        floor.receiveShadow = true;
        this.addMesh(floor, group);

        const archBeadCount = 12;
        const beadHighlight = this.matManager.get(ICE_PALETTE.frost, { roughness: 0.2, metalness: 0.18 });
        for (let i = 0; i < archBeadCount; i++) {
            const angle = (i / (archBeadCount - 1)) * Math.PI;
            const archRadius = tunnelW / 2 + 0.35;
            const beadGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const bead = new THREE.Mesh(beadGeo, i % 2 === 0 ? icePale : beadHighlight);
            bead.position.set(
                Math.cos(angle) * archRadius,
                tunnelH * 0.5 + Math.sin(angle) * (tunnelH * 0.5 + 0.2),
                tunnelZ + tunnelD + 0.12
            );
            bead.castShadow = true;
            this.addMesh(bead, group);
        }

        const glowGeo = new THREE.CircleGeometry(tunnelW * 0.45, 12);
        const glow = new THREE.Mesh(glowGeo, warmGlow);
        glow.position.set(0, tunnelH * 0.5, tunnelZ - 0.1);
        this.addMesh(glow, group);

        const interiorGeo = new THREE.CircleGeometry(tunnelW * 0.5, 12);
        const interior = new THREE.Mesh(interiorGeo, darkMat);
        interior.position.set(0, tunnelH * 0.5, tunnelZ - 0.15);
        this.addMesh(interior, group);

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
        const icicleMat = this.matManager.get(ICE_PALETTE.pale, {
            roughness: 0.08,
            metalness: 0.2,
            transparent: true,
            opacity: 0.8
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

