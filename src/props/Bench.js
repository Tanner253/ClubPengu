/**
 * Bench - Snow-covered park bench
 * OPTIMIZED: Uses cached geometries for all bench parts
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';
import { getGeometryManager } from './PropGeometries';

class Bench extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} withSnow - Add snow cover
     */
    constructor(THREE, withSnow = true) {
        super(THREE);
        this.withSnow = withSnow;
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
        
        this.benchWidth = 3;
        this.benchDepth = 0.8;
        this.seatHeight = 0.8;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const geo = this.geoManager;
        const group = this.createGroup(scene);
        group.name = 'bench';
        group.position.set(x, y, z);
        
        const woodMat = this.matManager.get(PropColors.plankMedium, { roughness: 0.9 });
        const metalMat = this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.4 });
        
        // Metal legs (CACHED - all 4 legs share same geometry)
        const legPositions = [
            [-this.benchWidth/2 + 0.3, 0, -this.benchDepth/2 + 0.15],
            [-this.benchWidth/2 + 0.3, 0, this.benchDepth/2 - 0.15],
            [this.benchWidth/2 - 0.3, 0, -this.benchDepth/2 + 0.15],
            [this.benchWidth/2 - 0.3, 0, this.benchDepth/2 - 0.15],
        ];
        
        const legGeo = geo.cylinder(0.05, 0.06, this.seatHeight, 6);
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(pos[0], this.seatHeight / 2, pos[2]);
            leg.castShadow = true;
            this.addMesh(leg, group);
        });
        
        // Seat planks (CACHED - all 5 planks share same geometry)
        const plankGeo = geo.box(this.benchWidth, 0.08, 0.14);
        for (let i = 0; i < 5; i++) {
            const plank = new THREE.Mesh(plankGeo, woodMat);
            plank.position.set(0, this.seatHeight, -this.benchDepth/2 + 0.1 + i * 0.16);
            plank.castShadow = true;
            plank.receiveShadow = true;
            this.addMesh(plank, group);
        }
        
        // Back rest planks (CACHED - all 3 planks share same geometry)
        const backGeo = geo.box(this.benchWidth, 0.08, 0.12);
        for (let i = 0; i < 3; i++) {
            const back = new THREE.Mesh(backGeo, woodMat);
            back.position.set(0, this.seatHeight + 0.2 + i * 0.15, -this.benchDepth/2 - 0.05);
            back.rotation.x = 0.15;
            back.castShadow = true;
            this.addMesh(back, group);
        }
        
        // Armrests (CACHED - both share same geometry)
        const armGeo = geo.box(0.1, 0.08, this.benchDepth + 0.2);
        [-this.benchWidth/2 + 0.15, this.benchWidth/2 - 0.15].forEach(xPos => {
            const arm = new THREE.Mesh(armGeo, woodMat);
            arm.position.set(xPos, this.seatHeight + 0.25, 0);
            arm.castShadow = true;
            this.addMesh(arm, group);
        });
        
        // Snow cover
        if (this.withSnow) {
            this.addSnowCover(group);
        }
        
        return this;
    }
    
    addSnowCover(group) {
        const THREE = this.THREE;
        const geo = this.geoManager;
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        
        // Snow on seat (CACHED)
        const seatSnow = new THREE.Mesh(geo.box(this.benchWidth * 0.9, 0.1, this.benchDepth * 0.8), snowMat);
        seatSnow.position.set(0, this.seatHeight + 0.08, 0.05);
        this.addMesh(seatSnow, group);
        
        // Snow on back (CACHED)
        const backSnow = new THREE.Mesh(geo.box(this.benchWidth * 0.85, 0.08, 0.2), snowMat);
        backSnow.position.set(0, this.seatHeight + 0.55, -this.benchDepth/2 - 0.1);
        backSnow.rotation.x = 0.15;
        this.addMesh(backSnow, group);
        
        // Snow clumps on armrests (CACHED - both share same geometry)
        const clumpGeo = geo.sphere(0.12, 6, 6);
        [-this.benchWidth/2 + 0.15, this.benchWidth/2 - 0.15].forEach(xPos => {
            const clump = new THREE.Mesh(clumpGeo, snowMat);
            clump.position.set(xPos, this.seatHeight + 0.35, 0.1);
            clump.scale.y = 0.5;
            this.addMesh(clump, group);
        });
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

