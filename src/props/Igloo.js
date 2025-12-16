/**
 * Igloo - High-quality igloo with realistic ice block pattern
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
        
        // Materials
        const iceWhite = this.matManager.get(0xF8FCFF, { roughness: 0.3, metalness: 0.02 });
        const iceMedium = this.matManager.get(0xE8F4FA, { roughness: 0.35, metalness: 0.02 });
        const iceBlue = this.matManager.get(0xD8EAF5, { roughness: 0.4, metalness: 0.03 });
        const seamMat = this.matManager.get(0xB8D4E8, { roughness: 0.5 });
        const darkMat = this.matManager.get('#030810', { roughness: 1 });
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        const warmGlow = this.matManager.get(0xFFA500, { 
            emissive: 0xFF8C00, 
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6
        });
        
        // Main dome
        const domeGeo = new THREE.SphereGeometry(this.domeRadius, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, iceMedium);
        dome.scale.y = this.domeHeight / this.domeRadius;
        dome.castShadow = true;
        dome.receiveShadow = true;
        this.addMesh(dome, group);
        
        // Ice block rows
        this.createBlockPattern(group, seamMat, iceWhite);
        
        // Entrance tunnel
        if (this.withEntrance) {
            this.createEntrance(group, iceMedium, iceWhite, iceBlue, snowMat, warmGlow, darkMat);
        }
        
        // Snow drift ring at base
        const driftGeo = new THREE.TorusGeometry(this.domeRadius + 0.4, 0.6, 12, 64);
        const drift = new THREE.Mesh(driftGeo, this.matManager.get(0xF0F5FA, { roughness: 0.6 }));
        drift.rotation.x = Math.PI / 2;
        drift.position.y = 0.15;
        drift.scale.y = 0.3;
        this.addMesh(drift, group);
        
        // Random snow mounds around base
        this.createSnowMounds(group, snowMat);
        
        // Icicles hanging from dome edge
        this.createIcicles(group);
        
        return this;
    }
    
    createBlockPattern(group, seamMat, iceWhite) {
        const THREE = this.THREE;
        const rowCount = 7;
        const blocksPerRow = [16, 15, 14, 12, 10, 8, 5];
        
        for (let row = 0; row < rowCount; row++) {
            const t = (row + 0.5) / rowCount;
            const rowY = t * this.domeHeight * 0.95;
            const rowRadius = this.domeRadius * Math.sqrt(1 - Math.pow(t, 2)) * 0.998;
            
            if (rowRadius < 0.5) continue;
            
            // Horizontal seam
            const seamGeo = new THREE.TorusGeometry(rowRadius, 0.025, 4, 64);
            const seam = new THREE.Mesh(seamGeo, seamMat);
            seam.position.y = rowY;
            seam.rotation.x = Math.PI / 2;
            this.addMesh(seam, group);
            
            // Vertical seams with spiral offset
            const blockCount = blocksPerRow[row] || 8;
            const spiralOffset = row * 0.15;
            
            for (let b = 0; b < blockCount; b++) {
                const blockAngle = (b / blockCount) * Math.PI * 2 + spiralOffset;
                
                // Skip blocks near entrance
                if (Math.abs(Math.sin(blockAngle)) < 0.25 && Math.cos(blockAngle) > 0) continue;
                
                // Vertical seam line
                const nextRowT = (row + 1.5) / rowCount;
                const nextRowY = Math.min(nextRowT * this.domeHeight * 0.95, this.domeHeight * 0.9);
                const nextRowRadius = this.domeRadius * Math.sqrt(1 - Math.pow(nextRowT, 2)) * 0.998;
                
                if (nextRowRadius > 0.3) {
                    const points = [
                        new THREE.Vector3(
                            Math.cos(blockAngle) * rowRadius,
                            rowY,
                            Math.sin(blockAngle) * rowRadius
                        ),
                        new THREE.Vector3(
                            Math.cos(blockAngle + spiralOffset * 0.1) * nextRowRadius,
                            nextRowY,
                            Math.sin(blockAngle + spiralOffset * 0.1) * nextRowRadius
                        )
                    ];
                    
                    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ 
                        color: 0xA8C8DD, 
                        linewidth: 1 
                    }));
                    this.addMesh(line, group);
                }
                
                // Subtle block highlight
                if (b % 3 === 0 && row < rowCount - 1) {
                    const highlightT = t + 0.05;
                    const highlightR = this.domeRadius * Math.sqrt(1 - Math.pow(highlightT, 2)) * 0.99;
                    const highlightGeo = new THREE.SphereGeometry(0.15, 6, 4);
                    const highlight = new THREE.Mesh(highlightGeo, iceWhite);
                    highlight.position.set(
                        Math.cos(blockAngle + 0.1) * highlightR,
                        rowY + 0.1,
                        Math.sin(blockAngle + 0.1) * highlightR
                    );
                    highlight.scale.set(1.5, 0.8, 1);
                    this.addMesh(highlight, group);
                }
            }
        }
    }
    
    createEntrance(group, iceMedium, iceWhite, iceBlue, snowMat, warmGlow, darkMat) {
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
    
    createSnowMounds(group, snowMat) {
        const THREE = this.THREE;
        const moundCount = 5;
        
        for (let i = 0; i < moundCount; i++) {
            const angle = (i / moundCount) * Math.PI * 2 + 0.5;
            // Skip entrance area
            if (Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) > 0) continue;
            
            const moundGeo = new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 8, 6);
            const mound = new THREE.Mesh(moundGeo, snowMat);
            mound.position.set(
                Math.cos(angle) * (this.domeRadius + 0.8),
                0.1 + Math.random() * 0.1,
                Math.sin(angle) * (this.domeRadius + 0.8)
            );
            mound.scale.set(1.2, 0.4, 1);
            this.addMesh(mound, group);
        }
    }
    
    createIcicles(group) {
        const THREE = this.THREE;
        const icicleCount = 8;
        
        for (let i = 0; i < icicleCount; i++) {
            const angle = (i / icicleCount) * Math.PI * 2 + 0.4;
            // Skip entrance area
            if (Math.abs(Math.sin(angle)) < 0.35 && Math.cos(angle) > 0) continue;
            
            const icicleLen = 0.25 + Math.random() * 0.2;
            const icicleGeo = new THREE.ConeGeometry(0.04, icicleLen, 4);
            const icicleMat = this.matManager.get(0xD0F0FF, { 
                roughness: 0.05, 
                transparent: true, 
                opacity: 0.9,
                metalness: 0.1
            });
            const icicle = new THREE.Mesh(icicleGeo, icicleMat);
            icicle.position.set(
                Math.cos(angle) * (this.domeRadius - 0.02),
                0.4 + Math.random() * 0.2,
                Math.sin(angle) * (this.domeRadius - 0.02)
            );
            icicle.rotation.x = Math.PI;
            this.addMesh(icicle, group);
        }
    }
    
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

