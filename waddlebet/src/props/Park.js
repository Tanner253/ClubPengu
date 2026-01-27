/**
 * Park - A cozy green park with benches, fountain, flowers, and butterflies
 * Performance-conscious: minimal particles, instanced geometry where possible
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';
import Bench from './Bench';

class Park extends BaseProp {
    constructor(THREE, config = {}) {
        super(THREE);
        this.matManager = getMaterialManager(THREE);
        this.parkRadius = config.radius || 12;
        this.withFountain = config.withFountain !== false;
        this.withButterflies = config.withButterflies !== false;
        this.benchCount = config.benchCount || 4;
        
        // Animation state
        this.butterflies = [];
        this.fountainParticles = null;
        this.time = 0;
    }
    
    /**
     * Create the grass ground (circular green area)
     */
    _createGrass(radius) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'park_grass';
        
        // Main grass circle - raised higher to prevent z-fighting with ground
        const grassMat = this.matManager.get(0x4a7c32, { roughness: 0.95 });
        const grassGeo = new THREE.CircleGeometry(radius, 32);
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = 0.05; // Raised to prevent z-fighting with main ground
        grass.receiveShadow = true;
        group.add(grass);
        
        // Darker edge ring for definition
        const edgeMat = this.matManager.get(0x3d6828, { roughness: 0.95 });
        const edgeGeo = new THREE.RingGeometry(radius - 0.3, radius, 32);
        const edge = new THREE.Mesh(edgeGeo, edgeMat);
        edge.rotation.x = -Math.PI / 2;
        edge.position.y = 0.06; // Raised to prevent z-fighting
        edge.receiveShadow = true;
        group.add(edge);
        
        // Stone border
        const stoneMat = this.matManager.get(0x808080, { roughness: 0.9 });
        const borderGeo = new THREE.TorusGeometry(radius + 0.15, 0.2, 6, 32);
        const border = new THREE.Mesh(borderGeo, stoneMat);
        border.rotation.x = Math.PI / 2;
        border.position.y = 0.1;
        border.castShadow = true;
        border.receiveShadow = true;
        group.add(border);
        
        return group;
    }
    
    /**
     * Create the fountain with water
     */
    _createFountain() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'fountain';
        
        const stoneMat = this.matManager.get(0x707070, { roughness: 0.8 });
        const darkStoneMat = this.matManager.get(0x505050, { roughness: 0.85 });
        const waterMat = this.matManager.get(0x4a90b8, { 
            roughness: 0.1, 
            metalness: 0.3,
            transparent: true,
            opacity: 0.7,
            depthWrite: false  // Prevent z-fighting with pool
        });
        
        // Base pool (octagonal)
        const poolRadius = 2.5;
        const poolGeo = new THREE.CylinderGeometry(poolRadius, poolRadius + 0.3, 0.6, 8);
        const pool = new THREE.Mesh(poolGeo, stoneMat);
        pool.position.y = 0.3;
        pool.castShadow = true;
        pool.receiveShadow = true;
        group.add(pool);
        
        // Inner pool (water surface) - raised higher to prevent z-fighting
        const waterGeo = new THREE.CylinderGeometry(poolRadius - 0.25, poolRadius - 0.25, 0.08, 16);
        const water = new THREE.Mesh(waterGeo, waterMat);
        water.position.y = 0.58;  // Raised from 0.55
        water.receiveShadow = true;
        water.renderOrder = 1;  // Render after pool to prevent z-fighting
        group.add(water);
        this.waterSurface = water;
        
        // Center column
        const columnGeo = new THREE.CylinderGeometry(0.35, 0.45, 2, 8);
        const column = new THREE.Mesh(columnGeo, darkStoneMat);
        column.position.y = 1;
        column.castShadow = true;
        group.add(column);
        
        // Top basin
        const basinGeo = new THREE.CylinderGeometry(0.8, 0.5, 0.3, 8);
        const basin = new THREE.Mesh(basinGeo, stoneMat);
        basin.position.y = 2.1;
        basin.castShadow = true;
        group.add(basin);
        
        // Water spout on top
        const spoutGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.4, 6);
        const spout = new THREE.Mesh(spoutGeo, darkStoneMat);
        spout.position.y = 2.4;
        spout.castShadow = true;
        group.add(spout);
        
        // Decorative details around pool edge
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const detailGeo = new THREE.BoxGeometry(0.3, 0.25, 0.15);
            const detail = new THREE.Mesh(detailGeo, darkStoneMat);
            detail.position.set(
                Math.cos(angle) * (poolRadius + 0.1),
                0.65,
                Math.sin(angle) * (poolRadius + 0.1)
            );
            detail.rotation.y = -angle;
            detail.castShadow = true;
            group.add(detail);
        }
        
        // Simple water stream particles (low count for performance)
        const streamCount = 12;
        const streamGeo = new THREE.BufferGeometry();
        const streamPositions = new Float32Array(streamCount * 3);
        
        for (let i = 0; i < streamCount; i++) {
            const t = i / streamCount;
            streamPositions[i * 3] = (Math.random() - 0.5) * 0.15;
            streamPositions[i * 3 + 1] = 2.5 - t * 1.8;
            streamPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
        }
        
        streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
        const streamMat = new THREE.PointsMaterial({
            color: 0x6eb8e0,
            size: 0.12,
            transparent: true,
            opacity: 0.7
        });
        
        const stream = new THREE.Points(streamGeo, streamMat);
        group.add(stream);
        this.fountainStream = stream;
        
        return group;
    }
    
    /**
     * Create flower patches
     */
    _createFlowers(count, radius) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'flowers';
        
        const flowerColors = [0xff6b8a, 0xffd93d, 0xff8c42, 0xc56cf0, 0xff6b6b, 0xffeaa7];
        const stemMat = this.matManager.get(0x228B22, { roughness: 0.9 });
        
        for (let i = 0; i < count; i++) {
            // Random position in ring around fountain
            const angle = Math.random() * Math.PI * 2;
            const dist = 3.5 + Math.random() * (radius - 5);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            
            const flowerGroup = new THREE.Group();
            
            // Stem
            const stemGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.3 + Math.random() * 0.2, 4);
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.15;
            flowerGroup.add(stem);
            
            // Flower head (simple disc)
            const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            const flowerMat = this.matManager.get(color, { roughness: 0.8 });
            const flowerGeo = new THREE.CircleGeometry(0.08 + Math.random() * 0.05, 6);
            const flower = new THREE.Mesh(flowerGeo, flowerMat);
            flower.position.y = 0.35 + Math.random() * 0.1;
            flower.rotation.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            flower.rotation.z = Math.random() * Math.PI * 2;
            flowerGroup.add(flower);
            
            // Center
            const centerMat = this.matManager.get(0xffeb3b, { roughness: 0.7 });
            const centerGeo = new THREE.CircleGeometry(0.03, 5);
            const center = new THREE.Mesh(centerGeo, centerMat);
            center.position.copy(flower.position);
            center.position.y += 0.01;
            center.rotation.copy(flower.rotation);
            flowerGroup.add(center);
            
            flowerGroup.position.set(x, 0, z);
            group.add(flowerGroup);
        }
        
        return group;
    }
    
    /**
     * Create butterflies (animated)
     */
    _createButterflies(count) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'butterflies';
        
        const colors = [0xff9ff3, 0x54a0ff, 0xfeca57, 0xff6b6b, 0x5f27cd];
        
        for (let i = 0; i < count; i++) {
            const butterfly = new THREE.Group();
            butterfly.name = 'butterfly';
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            const wingMat = this.matManager.get(color, { 
                roughness: 0.6,
                side: THREE.DoubleSide
            });
            
            // Wings (simple triangles)
            const wingShape = new THREE.Shape();
            wingShape.moveTo(0, 0);
            wingShape.lineTo(0.15, 0.1);
            wingShape.lineTo(0.12, -0.08);
            wingShape.lineTo(0, 0);
            
            const wingGeo = new THREE.ShapeGeometry(wingShape);
            
            // Left wing
            const leftWing = new THREE.Mesh(wingGeo, wingMat);
            leftWing.position.x = -0.01;
            butterfly.add(leftWing);
            
            // Right wing (mirrored)
            const rightWing = new THREE.Mesh(wingGeo, wingMat);
            rightWing.scale.x = -1;
            rightWing.position.x = 0.01;
            butterfly.add(rightWing);
            
            // Body
            const bodyMat = this.matManager.get(0x2c2c2c, { roughness: 0.8 });
            const bodyGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.1, 4);
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.rotation.x = Math.PI / 2;
            butterfly.add(body);
            
            // Random starting position
            const angle = Math.random() * Math.PI * 2;
            const dist = 2 + Math.random() * 6;
            butterfly.position.set(
                Math.cos(angle) * dist,
                1 + Math.random() * 1.5,
                Math.sin(angle) * dist
            );
            
            // Store animation data
            butterfly.userData = {
                leftWing,
                rightWing,
                baseY: butterfly.position.y,
                angle: Math.random() * Math.PI * 2,
                speed: 0.3 + Math.random() * 0.4,
                radius: dist,
                wingSpeed: 8 + Math.random() * 4,
                bobSpeed: 1.5 + Math.random() * 1,
                bobAmount: 0.3 + Math.random() * 0.3
            };
            
            this.butterflies.push(butterfly);
            group.add(butterfly);
        }
        
        return group;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'park';
        group.position.set(x, y, z);
        
        const R = this.parkRadius;
        
        // Grass base
        const grass = this._createGrass(R);
        this.addMesh(grass, group);
        
        // Fountain in center
        if (this.withFountain) {
            const fountain = this._createFountain();
            this.addMesh(fountain, group);
        }
        
        // Benches around the edge - use standard Bench prop (no snow for garden park)
        // Benches face INWARD toward the fountain
        const benchPositions = [];
        for (let i = 0; i < this.benchCount; i++) {
            const angle = (i / this.benchCount) * Math.PI * 2 + Math.PI / this.benchCount;
            const bx = Math.cos(angle) * (R - 1.8);
            const bz = Math.sin(angle) * (R - 1.8);
            // Rotate 180 degrees to face inward toward fountain
            const benchRotation = -angle + Math.PI / 2 + Math.PI;
            
            // Create standard Bench prop (reuses unified bench with sitting functionality)
            const benchProp = new Bench(this.THREE, false); // No snow for garden park
            benchProp.spawn(null, bx, 0, bz);
            benchProp.group.rotation.y = benchRotation;
            this.addMesh(benchProp.group, group);
            benchPositions.push({ x: bx, z: bz, angle, rotation: benchRotation });
        }
        
        // Flowers scattered around
        const flowers = this._createFlowers(25, R);
        this.addMesh(flowers, group);
        
        // Butterflies (limit for performance)
        if (this.withButterflies) {
            const butterflies = this._createButterflies(5);
            this.addMesh(butterflies, group);
        }
        
        // Store data for collision/interaction
        group.userData.parkRadius = R;
        group.userData.benchPositions = benchPositions;
        group.userData.hasFountain = this.withFountain;
        
        return group;
    }
    
    /**
     * Animate butterflies and fountain (call from render loop)
     */
    animate(deltaTime) {
        this.time += deltaTime;
        
        // Animate butterflies
        this.butterflies.forEach(butterfly => {
            const data = butterfly.userData;
            
            // Wing flapping
            const wingAngle = Math.sin(this.time * data.wingSpeed) * 0.6;
            data.leftWing.rotation.y = wingAngle;
            data.rightWing.rotation.y = -wingAngle;
            
            // Circular flying path
            data.angle += deltaTime * data.speed;
            butterfly.position.x = Math.cos(data.angle) * data.radius;
            butterfly.position.z = Math.sin(data.angle) * data.radius;
            
            // Bobbing up and down
            butterfly.position.y = data.baseY + Math.sin(this.time * data.bobSpeed) * data.bobAmount;
            
            // Face direction of travel
            butterfly.rotation.y = -data.angle - Math.PI / 2;
        });
        
        // Animate fountain water
        if (this.fountainStream) {
            const positions = this.fountainStream.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                // Move particles down
                positions[i * 3 + 1] -= deltaTime * 2;
                
                // Reset when below water level
                if (positions[i * 3 + 1] < 0.6) {
                    positions[i * 3] = (Math.random() - 0.5) * 0.15;
                    positions[i * 3 + 1] = 2.5;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
                }
            }
            this.fountainStream.geometry.attributes.position.needsUpdate = true;
        }
        
        // Subtle water surface animation
        if (this.waterSurface) {
            this.waterSurface.position.y = 0.58 + Math.sin(this.time * 2) * 0.01;
        }
    }
}

/**
 * Factory function
 */
export function createPark(THREE, config = {}) {
    const park = new Park(THREE, config);
    const mesh = park.spawn(null, config.x || 0, config.y || 0, config.z || 0);
    mesh.userData.parkInstance = park; // Store for animation
    return mesh;
}

export default Park;

