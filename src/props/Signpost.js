/**
 * Signpost - Directional signpost with arrow signs
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class Signpost extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {Array<{text: string, direction: number}>} signs - Array of sign configs
     */
    constructor(THREE, signs = [{ text: 'TOWN', direction: 0 }]) {
        super(THREE);
        this.signs = signs;
        this.matManager = getMaterialManager(THREE);
        this.postHeight = 3;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'signpost';
        group.position.set(x, y, z);
        
        const woodMat = this.matManager.get(PropColors.plankDark, { roughness: 0.9 });
        const signMat = this.matManager.get(PropColors.plankLight, { roughness: 0.85 });
        
        // Post
        const postGeo = new THREE.CylinderGeometry(0.08, 0.1, this.postHeight, 6);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.y = this.postHeight / 2;
        post.castShadow = true;
        this.addMesh(post, group);
        
        // Signs
        this.signs.forEach((signConfig, index) => {
            const signGroup = new THREE.Group();
            
            const boardWidth = 1.8;
            const boardHeight = 0.4;
            const arrowPoint = 0.3;
            
            // Arrow shape
            const shape = new THREE.Shape();
            shape.moveTo(-boardWidth/2, -boardHeight/2);
            shape.lineTo(boardWidth/2 - arrowPoint, -boardHeight/2);
            shape.lineTo(boardWidth/2, 0);
            shape.lineTo(boardWidth/2 - arrowPoint, boardHeight/2);
            shape.lineTo(-boardWidth/2, boardHeight/2);
            shape.lineTo(-boardWidth/2, -boardHeight/2);
            
            const extrudeSettings = { depth: 0.08, bevelEnabled: false };
            const boardGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const board = new THREE.Mesh(boardGeo, signMat);
            board.position.z = -0.04;
            board.castShadow = true;
            signGroup.add(board);
            
            // Text using canvas texture
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#3A2010';
            ctx.font = 'bold 32px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(signConfig.text || 'SIGN', 110, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            const textMat = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true,
                depthWrite: false
            });
            const textGeo = new THREE.PlaneGeometry(boardWidth - 0.4, boardHeight - 0.1);
            const text = new THREE.Mesh(textGeo, textMat);
            text.position.z = 0.05;
            signGroup.add(text);
            
            signGroup.position.y = this.postHeight - 0.3 - index * 0.5;
            signGroup.rotation.y = (signConfig.direction || 0) * Math.PI / 180;
            
            group.add(signGroup);
        });
        
        // Snow cap
        const snowGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const snowMat = this.matManager.get(PropColors.snowLight);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = this.postHeight + 0.1;
        snow.scale.set(1.5, 0.5, 1.5);
        this.addMesh(snow, group);
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.3;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.postHeight,
        };
    }
}

export default Signpost;

