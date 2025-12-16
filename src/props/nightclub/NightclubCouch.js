/**
 * NightclubCouch - Blue lounge couch for nightclub
 */

import BaseProp from '../BaseProp';

class NightclubCouch extends BaseProp {
    constructor(THREE) {
        super(THREE);
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        
        const { rotation = 0 } = options;
        
        // Same colors as igloo couch
        const couchMat = this.createMaterial({ color: 0x2E4A62, roughness: 0.8 });
        const cushionMat = this.createMaterial({ color: 0x3D5A80, roughness: 0.9 });
        
        // Couch base
        const baseGeo = new THREE.BoxGeometry(5, 0.8, 2);
        const couchBase = new THREE.Mesh(baseGeo, couchMat);
        couchBase.position.y = 0.4;
        this.addMesh(couchBase, group);
        
        // Couch back
        const backGeo = new THREE.BoxGeometry(5, 1.5, 0.5);
        const couchBack = new THREE.Mesh(backGeo, couchMat);
        couchBack.position.set(0, 1.15, -0.75);
        this.addMesh(couchBack, group);
        
        // Armrests
        const armGeo = new THREE.BoxGeometry(0.5, 1, 2);
        [-2.5, 2.5].forEach(xOffset => {
            const arm = new THREE.Mesh(armGeo, couchMat);
            arm.position.set(xOffset, 0.7, 0);
            this.addMesh(arm, group);
        });
        
        // Cushions
        [-1.5, 0, 1.5].forEach(xOffset => {
            const cushion = new THREE.Mesh(
                new THREE.BoxGeometry(1.4, 0.3, 1.6),
                cushionMat
            );
            cushion.position.set(xOffset, 0.95, 0.1);
            this.addMesh(cushion, group);
        });
        
        group.rotation.y = rotation;
        this.setPosition(x, y, z);
        
        return this;
    }
    
    getLandingSurface() {
        return {
            name: 'interior_couch',
            minX: -1, maxX: 1,
            minZ: -2.5, maxZ: 2.5,
            height: 1.0
        };
    }
    
    getTrigger() {
        return {
            type: 'sit',
            size: { x: 5, z: 2 },
            message: '🛋️ Sit on couch',
            emote: 'Sit',
            seatHeight: 1.0,
            snapPoints: [{ x: -1.5, z: 0 }, { x: 0, z: 0 }, { x: 1.5, z: 0 }],
            maxOccupants: 3
        };
    }
}

export default NightclubCouch;

