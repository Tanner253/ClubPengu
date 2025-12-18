/**
 * Snowman - Classic snowman with hat, scarf, and stick arms
 * OPTIMIZED: Uses cached geometries for all snowman parts
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';
import { getGeometryManager } from './PropGeometries';

class Snowman extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     */
    constructor(THREE) {
        super(THREE);
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const geo = this.geoManager;
        const group = this.createGroup(scene);
        group.name = 'snowman';
        group.position.set(x, y, z);
        
        const snowMat = this.matManager.get(PropColors.snowLight, { roughness: 0.6 });
        const eyeMat = this.matManager.get('#1A1A1A');
        const hatMat = this.matManager.get('#1A1A1A');
        const scarfMat = this.matManager.get('#CC2222', { roughness: 0.8 });
        const stickMat = this.matManager.get(PropColors.barkDark);
        const noseMat = this.matManager.get('#FF6600');
        const bandMat = this.matManager.get('#CC2222');
        
        // Bottom ball (CACHED)
        const bottom = new THREE.Mesh(geo.sphere(0.8, 16, 12), snowMat);
        bottom.position.y = 0.7;
        bottom.scale.y = 0.9;
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        this.addMesh(bottom, group);
        
        // Middle ball (CACHED)
        const middle = new THREE.Mesh(geo.sphere(0.55, 14, 10), snowMat);
        middle.position.y = 1.7;
        middle.castShadow = true;
        this.addMesh(middle, group);
        
        // Head (CACHED)
        const head = new THREE.Mesh(geo.sphere(0.4, 12, 10), snowMat);
        head.position.y = 2.4;
        head.castShadow = true;
        this.addMesh(head, group);
        
        // Eyes (CACHED - both eyes share same geometry)
        const eyeGeo = geo.sphere(0.05, 6, 6);
        [-0.12, 0.12].forEach(xOffset => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(xOffset, 2.5, 0.35);
            this.addMesh(eye, group);
        });
        
        // Carrot nose (CACHED)
        const nose = new THREE.Mesh(geo.cone(0.06, 0.3, 6), noseMat);
        nose.position.set(0, 2.4, 0.4);
        nose.rotation.x = Math.PI / 2;
        this.addMesh(nose, group);
        
        // Smile (CACHED - all 5 mouth dots share same geometry)
        const mouthGeo = geo.sphere(0.03, 4, 4);
        for (let i = -2; i <= 2; i++) {
            const mouth = new THREE.Mesh(mouthGeo, eyeMat);
            const angle = (i / 4) * 0.5 - 0.1;
            mouth.position.set(
                Math.sin(angle) * 0.25,
                2.22 + Math.abs(i) * 0.04,
                0.35 + Math.cos(angle) * 0.05
            );
            this.addMesh(mouth, group);
        }
        
        // Buttons (CACHED - all 3 buttons share same geometry)
        const buttonGeo = geo.sphere(0.04, 6, 6);
        [1.5, 1.7, 1.9].forEach(yPos => {
            const button = new THREE.Mesh(buttonGeo, eyeMat);
            button.position.set(0, yPos, 0.52);
            this.addMesh(button, group);
        });
        
        // Stick arms (CACHED - both arms share same geometry)
        const armGeo = geo.cylinder(0.03, 0.02, 0.8, 4);
        const twigGeo = geo.cylinder(0.015, 0.01, 0.2, 3);
        [-1, 1].forEach(side => {
            const arm = new THREE.Mesh(armGeo, stickMat);
            arm.position.set(side * 0.7, 1.7, 0);
            arm.rotation.z = side * 0.8;
            arm.castShadow = true;
            this.addMesh(arm, group);
            
            // Twig fingers (CACHED)
            for (let i = 0; i < 2; i++) {
                const twig = new THREE.Mesh(twigGeo, stickMat);
                twig.position.set(side * 1.0, 1.9 + i * 0.1, 0);
                twig.rotation.z = side * (1.2 + i * 0.3);
                this.addMesh(twig, group);
            }
        });
        
        // Scarf (CACHED)
        const scarf = new THREE.Mesh(geo.torus(0.45, 0.08, 6, 16), scarfMat);
        scarf.position.y = 2.1;
        scarf.rotation.x = Math.PI / 2;
        this.addMesh(scarf, group);
        
        // Scarf tail (CACHED)
        const tail = new THREE.Mesh(geo.box(0.15, 0.5, 0.06), scarfMat);
        tail.position.set(0.3, 1.85, 0.3);
        tail.rotation.z = 0.3;
        this.addMesh(tail, group);
        
        // Top hat (CACHED)
        const brim = new THREE.Mesh(geo.cylinder(0.45, 0.45, 0.05, 12), hatMat);
        brim.position.y = 2.75;
        this.addMesh(brim, group);
        
        const crown = new THREE.Mesh(geo.cylinder(0.3, 0.32, 0.35, 12), hatMat);
        crown.position.y = 2.95;
        crown.castShadow = true;
        this.addMesh(crown, group);
        
        // Hat band (CACHED)
        const band = new THREE.Mesh(geo.torus(0.31, 0.03, 6, 16), bandMat);
        band.position.y = 2.82;
        band.rotation.x = Math.PI / 2;
        this.addMesh(band, group);
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            minX: x - 1,
            maxX: x + 1,
            minZ: z - 1,
            maxZ: z + 1,
            height: 3.2,
        };
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        return {
            type: 'interact_snowman',
            x: this.group.position.x,
            z: this.group.position.z,
            radius: 2,
            message: '☃️ Hello friend!'
        };
    }
}

export default Snowman;

