/**
 * Snowman - Classic snowman with hat, scarf, and stick arms
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Snowman extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     */
    constructor(THREE) {
        super(THREE);
        this.matManager = getMaterialManager(THREE);
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
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
        
        // Bottom ball
        const bottomGeo = new THREE.SphereGeometry(0.8, 16, 12);
        const bottom = new THREE.Mesh(bottomGeo, snowMat);
        bottom.position.y = 0.7;
        bottom.scale.y = 0.9;
        bottom.castShadow = true;
        bottom.receiveShadow = true;
        this.addMesh(bottom, group);
        
        // Middle ball
        const middleGeo = new THREE.SphereGeometry(0.55, 14, 10);
        const middle = new THREE.Mesh(middleGeo, snowMat);
        middle.position.y = 1.7;
        middle.castShadow = true;
        this.addMesh(middle, group);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.4, 12, 10);
        const head = new THREE.Mesh(headGeo, snowMat);
        head.position.y = 2.4;
        head.castShadow = true;
        this.addMesh(head, group);
        
        // Eyes
        const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
        [-0.12, 0.12].forEach(xOffset => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(xOffset, 2.5, 0.35);
            this.addMesh(eye, group);
        });
        
        // Carrot nose
        const noseGeo = new THREE.ConeGeometry(0.06, 0.3, 6);
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 2.4, 0.4);
        nose.rotation.x = Math.PI / 2;
        this.addMesh(nose, group);
        
        // Smile
        for (let i = -2; i <= 2; i++) {
            const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), eyeMat);
            const angle = (i / 4) * 0.5 - 0.1;
            mouth.position.set(
                Math.sin(angle) * 0.25,
                2.22 + Math.abs(i) * 0.04,
                0.35 + Math.cos(angle) * 0.05
            );
            this.addMesh(mouth, group);
        }
        
        // Buttons
        [1.5, 1.7, 1.9].forEach(yPos => {
            const button = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
            button.position.set(0, yPos, 0.52);
            this.addMesh(button, group);
        });
        
        // Stick arms
        [-1, 1].forEach(side => {
            const armGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 4);
            const arm = new THREE.Mesh(armGeo, stickMat);
            arm.position.set(side * 0.7, 1.7, 0);
            arm.rotation.z = side * 0.8;
            arm.castShadow = true;
            this.addMesh(arm, group);
            
            // Twig fingers
            for (let i = 0; i < 2; i++) {
                const twig = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.01, 0.2, 3),
                    stickMat
                );
                twig.position.set(side * 1.0, 1.9 + i * 0.1, 0);
                twig.rotation.z = side * (1.2 + i * 0.3);
                this.addMesh(twig, group);
            }
        });
        
        // Scarf
        const scarfGeo = new THREE.TorusGeometry(0.45, 0.08, 6, 16);
        const scarf = new THREE.Mesh(scarfGeo, scarfMat);
        scarf.position.y = 2.1;
        scarf.rotation.x = Math.PI / 2;
        this.addMesh(scarf, group);
        
        // Scarf tail
        const tailGeo = new THREE.BoxGeometry(0.15, 0.5, 0.06);
        const tail = new THREE.Mesh(tailGeo, scarfMat);
        tail.position.set(0.3, 1.85, 0.3);
        tail.rotation.z = 0.3;
        this.addMesh(tail, group);
        
        // Top hat
        const brimGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 12);
        const brim = new THREE.Mesh(brimGeo, hatMat);
        brim.position.y = 2.75;
        this.addMesh(brim, group);
        
        const crownGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.35, 12);
        const crown = new THREE.Mesh(crownGeo, hatMat);
        crown.position.y = 2.95;
        crown.castShadow = true;
        this.addMesh(crown, group);
        
        // Hat band
        const hatBandGeo = new THREE.TorusGeometry(0.31, 0.03, 6, 16);
        const band = new THREE.Mesh(hatBandGeo, bandMat);
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

