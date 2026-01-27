/**
 * Lighthouse - Classic red and white striped lighthouse with rotating beacon
 * Iconic Club Penguin landmark
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';
import { getGeometryManager } from './PropGeometries';

class Lighthouse extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} beaconOn - Whether the beacon light is active
     */
    constructor(THREE, beaconOn = true) {
        super(THREE);
        this.beaconOn = beaconOn;
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
        this.beaconLight = null;
        this.towerHeight = 12;
        this.baseRadius = 3;
        this.topRadius = 1.8;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const geo = this.geoManager;
        const group = this.createGroup(scene);
        group.name = 'lighthouse';
        group.position.set(x, y, z);
        
        const whiteMat = this.matManager.get(0xF5F5F5, { roughness: 0.7 });
        const redMat = this.matManager.get(0xCC2222, { roughness: 0.7 });
        const darkMat = this.matManager.get(0x333333, { roughness: 0.5, metalness: 0.3 });
        const glassMat = this.matManager.get(0xAADDFF, { 
            roughness: 0.1, 
            transparent: true, 
            opacity: 0.6 
        });
        
        // ==================== BASE PLATFORM ====================
        const basePlatform = new THREE.Mesh(
            geo.cylinder(this.baseRadius + 1.5, this.baseRadius + 2, 0.5, 16),
            this.matManager.get(0x666666, { roughness: 0.9 })
        );
        basePlatform.position.y = 0.25;
        basePlatform.castShadow = true;
        basePlatform.receiveShadow = true;
        this.addMesh(basePlatform, group);
        
        // ==================== TOWER (striped) ====================
        const stripeCount = 6;
        const stripeHeight = this.towerHeight / stripeCount;
        
        for (let i = 0; i < stripeCount; i++) {
            const t = i / stripeCount;
            const nextT = (i + 1) / stripeCount;
            const bottomR = this.baseRadius - t * (this.baseRadius - this.topRadius);
            const topR = this.baseRadius - nextT * (this.baseRadius - this.topRadius);
            
            const stripeMat = i % 2 === 0 ? whiteMat : redMat;
            const stripe = new THREE.Mesh(
                new THREE.CylinderGeometry(topR, bottomR, stripeHeight, 16),
                stripeMat
            );
            stripe.position.y = 0.5 + stripeHeight / 2 + i * stripeHeight;
            stripe.castShadow = true;
            stripe.receiveShadow = true;
            this.addMesh(stripe, group);
        }
        
        // ==================== OBSERVATION DECK ====================
        const deckY = this.towerHeight + 0.5;
        
        // Deck floor
        const deckFloor = new THREE.Mesh(
            geo.cylinder(this.topRadius + 0.8, this.topRadius + 0.5, 0.3, 16),
            darkMat
        );
        deckFloor.position.y = deckY;
        deckFloor.castShadow = true;
        this.addMesh(deckFloor, group);
        
        // Deck railing posts
        const railingCount = 12;
        const railingRadius = this.topRadius + 0.6;
        for (let i = 0; i < railingCount; i++) {
            const angle = (i / railingCount) * Math.PI * 2;
            const rx = Math.cos(angle) * railingRadius;
            const rz = Math.sin(angle) * railingRadius;
            
            const post = new THREE.Mesh(
                geo.cylinder(0.05, 0.05, 0.8, 6),
                darkMat
            );
            post.position.set(rx, deckY + 0.55, rz);
            post.castShadow = true;
            this.addMesh(post, group);
        }
        
        // Deck railing top ring
        const railingRing = new THREE.Mesh(
            geo.torus(railingRadius, 0.06, 6, 24),
            darkMat
        );
        railingRing.position.y = deckY + 0.95;
        railingRing.rotation.x = Math.PI / 2;
        this.addMesh(railingRing, group);
        
        // ==================== BEACON ROOM ====================
        const beaconRoomY = deckY + 0.3;
        
        // Glass enclosure
        const glassRoom = new THREE.Mesh(
            geo.cylinder(this.topRadius - 0.2, this.topRadius - 0.2, 2, 16),
            glassMat
        );
        glassRoom.position.y = beaconRoomY + 1.3;
        this.addMesh(glassRoom, group);
        
        // Metal frame strips on glass
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const fx = Math.cos(angle) * (this.topRadius - 0.15);
            const fz = Math.sin(angle) * (this.topRadius - 0.15);
            
            const frameStrip = new THREE.Mesh(
                geo.box(0.08, 2, 0.08),
                darkMat
            );
            frameStrip.position.set(fx, beaconRoomY + 1.3, fz);
            this.addMesh(frameStrip, group);
        }
        
        // ==================== ROOF ====================
        const roofY = beaconRoomY + 2.3;
        
        // Conical roof
        const roof = new THREE.Mesh(
            geo.cone(this.topRadius + 0.3, 1.5, 16),
            redMat
        );
        roof.position.y = roofY + 0.75;
        roof.castShadow = true;
        this.addMesh(roof, group);
        
        // Roof finial
        const finial = new THREE.Mesh(
            geo.sphere(0.15, 8, 8),
            darkMat
        );
        finial.position.y = roofY + 1.6;
        this.addMesh(finial, group);
        
        // ==================== BEACON LIGHT ====================
        if (this.beaconOn) {
            // Point light for beacon (no visible sphere - just the glow effect)
            // Skip on mobile for performance
            const skipLight = typeof window !== 'undefined' && (window._isAppleDevice || window._isAndroidDevice);
            if (!skipLight) {
                this.beaconLight = new THREE.PointLight(0xFFFF88, 3, 40);
                this.beaconLight.position.y = beaconRoomY + 1.3;
                this.addLight(this.beaconLight, group);
            }
        }
        
        // ==================== DOOR ====================
        const doorMat = this.matManager.get(0x4a3728, { roughness: 0.9 });
        const door = new THREE.Mesh(
            geo.box(1.2, 2.2, 0.15),
            doorMat
        );
        door.position.set(0, 1.6, this.baseRadius - 0.05);
        this.addMesh(door, group);
        
        // Door frame
        const frameMat = this.matManager.get(0x333333, { roughness: 0.6 });
        const doorFrame = new THREE.Mesh(
            geo.box(1.4, 2.4, 0.1),
            frameMat
        );
        doorFrame.position.set(0, 1.6, this.baseRadius + 0.02);
        this.addMesh(doorFrame, group);
        
        // Store height data for teleport
        group.userData.towerHeight = this.towerHeight;
        group.userData.deckHeight = deckY;
        
        return this;
    }
    
    /**
     * Animate the beacon (call from render loop)
     */
    update(time, delta, nightFactor = 0.5) {
        // Pulse beacon intensity based on time of day
        if (this.beaconLight) {
            const baseIntensity = 2 + nightFactor * 3; // Brighter at night
            this.beaconLight.intensity = baseIntensity + Math.sin(time * 2) * 0.5;
        }
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            minX: x - this.baseRadius - 1,
            maxX: x + this.baseRadius + 1,
            minZ: z - this.baseRadius - 1,
            maxZ: z + this.baseRadius + 1,
            height: this.towerHeight + 5,
        };
    }
    
    getLight() {
        return this.beaconLight;
    }
}

export default Lighthouse;


