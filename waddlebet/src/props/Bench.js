/**
 * Bench - Snow-covered park bench
 * 
 * HEAVILY OPTIMIZED FOR DRAW CALLS:
 * - Previous: 18 meshes per bench = 18 draw calls
 * - Now: 3 meshes per bench = 3 draw calls (metal + wood + snow)
 * - 83% reduction in draw calls per bench!
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

// Cache merged geometries
const _benchGeoCache = { metal: null, wood: null, snow: null };

class Bench extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} withSnow - Add snow cover
     */
    constructor(THREE, withSnow = true) {
        super(THREE);
        this.withSnow = withSnow;
        this.matManager = getMaterialManager(THREE);
        
        this.benchWidth = 3;
        this.benchDepth = 0.8;
        this.seatHeight = 0.8;
    }
    
    _buildMergedGeometries() {
        if (_benchGeoCache.metal) return _benchGeoCache;
        
        const THREE = this.THREE;
        const metalGeos = [];
        const woodGeos = [];
        const snowGeos = [];
        
        // Metal legs (4 legs)
        const legPositions = [
            [-this.benchWidth/2 + 0.3, this.seatHeight / 2, -this.benchDepth/2 + 0.15],
            [-this.benchWidth/2 + 0.3, this.seatHeight / 2, this.benchDepth/2 - 0.15],
            [this.benchWidth/2 - 0.3, this.seatHeight / 2, -this.benchDepth/2 + 0.15],
            [this.benchWidth/2 - 0.3, this.seatHeight / 2, this.benchDepth/2 - 0.15],
        ];
        legPositions.forEach(pos => {
            const legGeo = new THREE.CylinderGeometry(0.05, 0.06, this.seatHeight, 6);
            legGeo.translate(pos[0], pos[1], pos[2]);
            metalGeos.push(legGeo);
        });
        
        // Seat planks (5 planks)
        for (let i = 0; i < 5; i++) {
            const plankGeo = new THREE.BoxGeometry(this.benchWidth, 0.08, 0.14);
            plankGeo.translate(0, this.seatHeight, -this.benchDepth/2 + 0.1 + i * 0.16);
            woodGeos.push(plankGeo);
        }
        
        // Back rest planks (3 planks)
        for (let i = 0; i < 3; i++) {
            const backGeo = new THREE.BoxGeometry(this.benchWidth, 0.08, 0.12);
            backGeo.rotateX(0.15);
            backGeo.translate(0, this.seatHeight + 0.2 + i * 0.15, -this.benchDepth/2 - 0.05);
            woodGeos.push(backGeo);
        }
        
        // Armrests (2 armrests)
        [-this.benchWidth/2 + 0.15, this.benchWidth/2 - 0.15].forEach(xPos => {
            const armGeo = new THREE.BoxGeometry(0.1, 0.08, this.benchDepth + 0.2);
            armGeo.translate(xPos, this.seatHeight + 0.25, 0);
            woodGeos.push(armGeo);
        });
        
        // Snow on seat
        const seatSnowGeo = new THREE.BoxGeometry(this.benchWidth * 0.9, 0.1, this.benchDepth * 0.8);
        seatSnowGeo.translate(0, this.seatHeight + 0.08, 0.05);
        snowGeos.push(seatSnowGeo);
        
        // Snow on back
        const backSnowGeo = new THREE.BoxGeometry(this.benchWidth * 0.85, 0.08, 0.2);
        backSnowGeo.rotateX(0.15);
        backSnowGeo.translate(0, this.seatHeight + 0.55, -this.benchDepth/2 - 0.1);
        snowGeos.push(backSnowGeo);
        
        // Snow clumps on armrests
        [-this.benchWidth/2 + 0.15, this.benchWidth/2 - 0.15].forEach(xPos => {
            const clumpGeo = new THREE.SphereGeometry(0.12, 6, 6);
            clumpGeo.scale(1, 0.5, 1);
            clumpGeo.translate(xPos, this.seatHeight + 0.35, 0.1);
            snowGeos.push(clumpGeo);
        });
        
        // Merge all
        _benchGeoCache.metal = this._mergeGeos(metalGeos);
        _benchGeoCache.wood = this._mergeGeos(woodGeos);
        _benchGeoCache.snow = this._mergeGeos(snowGeos);
        
        // Dispose source geos
        [...metalGeos, ...woodGeos, ...snowGeos].forEach(g => g.dispose());
        
        return _benchGeoCache;
    }
    
    _mergeGeos(geometries) {
        if (!geometries.length) return null;
        const THREE = this.THREE;
        
        let totalVerts = 0, totalIdx = 0;
        geometries.forEach(g => {
            totalVerts += g.getAttribute('position').count;
            if (g.getIndex()) totalIdx += g.getIndex().count;
        });
        
        const positions = new Float32Array(totalVerts * 3);
        const normals = new Float32Array(totalVerts * 3);
        const indices = totalIdx > 0 ? new Uint32Array(totalIdx) : null;
        
        let vOff = 0, iOff = 0, ivOff = 0;
        geometries.forEach(g => {
            const pos = g.getAttribute('position');
            const norm = g.getAttribute('normal');
            const idx = g.getIndex();
            
            positions.set(pos.array, vOff * 3);
            if (norm) normals.set(norm.array, vOff * 3);
            if (idx && indices) {
                for (let i = 0; i < idx.count; i++) indices[iOff + i] = idx.array[i] + ivOff;
                iOff += idx.count;
            }
            ivOff += pos.count;
            vOff += pos.count;
        });
        
        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));
        merged.computeVertexNormals();
        return merged;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'bench';
        group.position.set(x, y, z);
        
        const geos = this._buildMergedGeometries();
        
        // ONLY 3 MESHES instead of 18!
        const metalMat = this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.4 });
        const metalMesh = new THREE.Mesh(geos.metal, metalMat);
        metalMesh.castShadow = true;
        this.addMesh(metalMesh, group);
        
        const woodMat = this.matManager.get(PropColors.plankMedium, { roughness: 0.9 });
        const woodMesh = new THREE.Mesh(geos.wood, woodMat);
        woodMesh.castShadow = true;
        woodMesh.receiveShadow = true;
        this.addMesh(woodMesh, group);
        
        if (this.withSnow) {
            const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
            const snowMesh = new THREE.Mesh(geos.snow, snowMat);
            this.addMesh(snowMesh, group);
        }
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            minX: x - this.benchWidth/2 - 0.1,
            maxX: x + this.benchWidth/2 + 0.1,
            minZ: z - this.benchDepth/2 - 0.15,
            maxZ: z + this.benchDepth/2 + 0.15,
            height: this.seatHeight,
        };
    }
    
    getLandingSurface() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            name: 'bench',
            minX: x - this.benchWidth/2,
            maxX: x + this.benchWidth/2,
            minZ: z - this.benchDepth/2,
            maxZ: z + this.benchDepth/2,
            height: this.seatHeight,
        };
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const y = this.group.position.y || 0;
        
        return {
            type: 'sit',
            x,
            z,
            size: { x: this.benchWidth + 2, z: this.benchDepth + 3 },
            message: '🪑 Sit on bench',
            emote: 'Sit',
            seatHeight: y + this.seatHeight,  // Absolute seat height
            benchDepth: this.benchDepth,
            platformHeight: y,  // Platform Y for elevated benches
            snapPoints: [
                { x: -0.6, z: 0 },
                { x: 0.6, z: 0 }
            ],
            maxOccupants: 2,
            data: {
                seatHeight: y + this.seatHeight,
                platformHeight: y
            }
        };
    }
}

export default Bench;

