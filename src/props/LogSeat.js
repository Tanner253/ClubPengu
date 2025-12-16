/**
 * LogSeat - Log seat for sitting around campfire
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

class LogSeat extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {number} rotation - Rotation in radians (facing direction)
     */
    constructor(THREE, rotation = 0) {
        super(THREE);
        this.initialRotation = rotation;
        this.matManager = getMaterialManager(THREE);
        
        this.logWidth = 2;
        this.logRadius = 0.35;
        this.seatHeight = 0.5;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'log_seat';
        group.position.set(x, y, z);
        group.rotation.y = this.initialRotation;
        
        const logMat = this.matManager.get(0x5C4033, { roughness: 0.9 });
        const barkMat = this.matManager.get(0x3D2817, { roughness: 1 });
        const endCapMat = this.matManager.get(0x8B7355, { roughness: 0.9 });
        const snowMat = this.matManager.get(0xFFFFFF, { roughness: 0.8 });
        
        // Main log (lying on its side)
        const logGeo = new THREE.CylinderGeometry(this.logRadius, this.logRadius + 0.05, this.logWidth, 12);
        const log = new THREE.Mesh(logGeo, logMat);
        log.rotation.z = Math.PI / 2;
        log.position.y = this.logRadius;
        log.castShadow = true;
        log.receiveShadow = true;
        this.addMesh(log, group);
        
        // Bark texture rings
        for (let i = 0; i < 3; i++) {
            const ringGeo = new THREE.TorusGeometry(this.logRadius + 0.02, 0.025, 6, 16);
            const ring = new THREE.Mesh(ringGeo, barkMat);
            ring.rotation.y = Math.PI / 2;
            ring.position.set(-0.7 + i * 0.7, this.logRadius, 0);
            this.addMesh(ring, group);
        }
        
        // End caps (tree rings visible)
        const endCapGeo = new THREE.CircleGeometry(this.logRadius, 12);
        
        const leftCap = new THREE.Mesh(endCapGeo, endCapMat);
        leftCap.rotation.y = Math.PI / 2;
        leftCap.position.set(-this.logWidth / 2, this.logRadius, 0);
        this.addMesh(leftCap, group);
        
        const rightCap = new THREE.Mesh(endCapGeo, endCapMat);
        rightCap.rotation.y = -Math.PI / 2;
        rightCap.position.set(this.logWidth / 2, this.logRadius, 0);
        this.addMesh(rightCap, group);
        
        // Light snow dusting on top
        const snowGeo = new THREE.BoxGeometry(this.logWidth * 0.8, 0.05, this.logRadius * 0.8);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = this.logRadius * 2 + 0.02;
        this.addMesh(snow, group);
        
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

