/**
 * LogSeat - Log seat for sitting around campfire
 * 
 * OPTIMIZED: All geometry merged into 3 meshes
 * - Previous: 8 meshes per log
 * - Now: 3 meshes (log + bark + snow)
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

const _logSeatGeoCache = { log: null, bark: null, snow: null };

class LogSeat extends BaseProp {
    constructor(THREE, rotation = 0) {
        super(THREE);
        this.initialRotation = rotation;
        this.matManager = getMaterialManager(THREE);
        
        this.logWidth = 2;
        this.logRadius = 0.35;
        this.seatHeight = 0.5;
    }
    
    _buildMergedGeometry() {
        if (_logSeatGeoCache.log) return _logSeatGeoCache;
        
        const THREE = this.THREE;
        const logGeos = [];
        const barkGeos = [];
        
        // Main log
        const mainLogGeo = new THREE.CylinderGeometry(this.logRadius, this.logRadius + 0.05, this.logWidth, 12);
        mainLogGeo.rotateZ(Math.PI / 2);
        mainLogGeo.translate(0, this.logRadius, 0);
        logGeos.push(mainLogGeo);
        
        // End caps
        const leftCapGeo = new THREE.CircleGeometry(this.logRadius, 12);
        leftCapGeo.rotateY(Math.PI / 2);
        leftCapGeo.translate(-this.logWidth / 2, this.logRadius, 0);
        logGeos.push(leftCapGeo);
        
        const rightCapGeo = new THREE.CircleGeometry(this.logRadius, 12);
        rightCapGeo.rotateY(-Math.PI / 2);
        rightCapGeo.translate(this.logWidth / 2, this.logRadius, 0);
        logGeos.push(rightCapGeo);
        
        // Bark rings
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(this.logRadius + 0.02, 0.025, 6, 16);
            ringGeo.rotateY(Math.PI / 2);
            ringGeo.translate(-0.7 + i * 0.7, this.logRadius, 0);
            barkGeos.push(ringGeo);
        }
        
        // Snow
        const snowGeo = new THREE.BoxGeometry(this.logWidth * 0.8, 0.05, this.logRadius * 0.8);
        snowGeo.translate(0, this.logRadius * 2 + 0.02, 0);
        
        _logSeatGeoCache.log = this._mergeGeos(logGeos);
        _logSeatGeoCache.bark = this._mergeGeos(barkGeos);
        _logSeatGeoCache.snow = snowGeo;
        
        [...logGeos, ...barkGeos].forEach(g => g.dispose());
        return _logSeatGeoCache;
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
        group.name = 'log_seat';
        group.position.set(x, y, z);
        group.rotation.y = this.initialRotation;
        
        const geos = this._buildMergedGeometry();
        
        // ONLY 3 MESHES instead of 8!
        const logMesh = new THREE.Mesh(geos.log, this.matManager.get(0x5C4033, { roughness: 0.9 }));
        logMesh.castShadow = true;
        logMesh.receiveShadow = true;
        this.addMesh(logMesh, group);
        
        const barkMesh = new THREE.Mesh(geos.bark, this.matManager.get(0x3D2817, { roughness: 1 }));
        this.addMesh(barkMesh, group);
        
        const snowMesh = new THREE.Mesh(geos.snow, this.matManager.get(0xFFFFFF, { roughness: 0.8 }));
        this.addMesh(snowMesh, group);
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            minX: x - this.logWidth/2 - 0.2,
            maxX: x + this.logWidth/2 + 0.2,
            minZ: z - this.logRadius - 0.2,
            maxZ: z + this.logRadius + 0.2,
            height: this.seatHeight,
        };
    }
    
    getLandingSurface() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            name: 'log_seat',
            minX: x - this.logWidth/2,
            maxX: x + this.logWidth/2,
            minZ: z - this.logRadius,
            maxZ: z + this.logRadius,
            height: this.seatHeight,
        };
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        return {
            type: 'sit',
            x: this.group.position.x,
            z: this.group.position.z,
            size: { x: this.logWidth + 1.5, z: this.logRadius * 2 + 3 },
            message: '🪵 Sit on log',
            emote: 'Sit',
            seatHeight: this.seatHeight,
            benchDepth: this.logRadius * 2,
            snapPoints: [
                { x: -0.5, z: 0 },
                { x: 0.5, z: 0 }
            ],
            maxOccupants: 2,
            bidirectionalSit: true
        };
    }
}

export default LogSeat;

