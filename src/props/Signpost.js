/**
 * Signpost - Directional signpost with arrow signs
 * Enhanced with neon text for night visibility
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
        this.postHeight = 3.2; // Slightly taller for bigger signs
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'signpost';
        group.position.set(x, y, z);
        
        const woodMat = this.matManager.get(PropColors.plankDark, { roughness: 0.9 });
        const signMat = this.matManager.get(PropColors.plankLight, { roughness: 0.85 });
        
        // Post - 75% thinner (0.08 * 0.25 = 0.02, 0.1 * 0.25 = 0.025)
        const postGeo = new THREE.CylinderGeometry(0.02, 0.025, this.postHeight, 6);
        const post = new THREE.Mesh(postGeo, woodMat);
        post.position.y = this.postHeight / 2;
        post.castShadow = true;
        this.addMesh(post, group);
        
        // Signs - 20% bigger
        this.signs.forEach((signConfig, index) => {
            const signGroup = new THREE.Group();
            
            // 20% bigger dimensions
            const boardWidth = 2.16;   // 1.8 * 1.2
            const boardHeight = 0.48;  // 0.4 * 1.2
            const arrowPoint = 0.36;   // 0.3 * 1.2
            
            // Arrow shape
            const shape = new THREE.Shape();
            shape.moveTo(-boardWidth/2, -boardHeight/2);
            shape.lineTo(boardWidth/2 - arrowPoint, -boardHeight/2);
            shape.lineTo(boardWidth/2, 0);
            shape.lineTo(boardWidth/2 - arrowPoint, boardHeight/2);
            shape.lineTo(-boardWidth/2, boardHeight/2);
            shape.lineTo(-boardWidth/2, -boardHeight/2);
            
            const extrudeSettings = { depth: 0.1, bevelEnabled: false }; // Slightly thicker
            const boardGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const board = new THREE.Mesh(boardGeo, signMat);
            board.position.z = -0.05;
            board.castShadow = true;
            signGroup.add(board);
            
            // Neon/bright text using canvas texture for night visibility
            const canvas = document.createElement('canvas');
            canvas.width = 512;  // Higher resolution for crisp text
            canvas.height = 128;
            const ctx = canvas.getContext('2d');
            
            // Clear with transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Neon glow effect - outer glow
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            
            // Bright neon text - warm golden yellow for visibility
            ctx.fillStyle = '#FFEE00';
            ctx.font = 'bold 56px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(signConfig.text || 'SIGN', canvas.width / 2, canvas.height / 2);
            
            // Second pass for stronger glow
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(signConfig.text || 'SIGN', canvas.width / 2, canvas.height / 2);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            
            // Use MeshBasicMaterial for self-illuminating text (visible at night)
            const textMat = new THREE.MeshBasicMaterial({ 
                map: texture, 
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            
            // Text plane with proper padding (20% bigger with padding)
            const textGeo = new THREE.PlaneGeometry(boardWidth - 0.3, boardHeight - 0.08);
            const text = new THREE.Mesh(textGeo, textMat);
            text.position.set(-0.1, 0, 0.06); // Offset left slightly for arrow space
            signGroup.add(text);
            
            // Spacing between signs adjusted for bigger size
            signGroup.position.y = this.postHeight - 0.4 - index * 0.6;
            signGroup.rotation.y = (signConfig.direction || 0) * Math.PI / 180;
            
            group.add(signGroup);
        });
        
        // Snow cap - scaled down to match thinner post
        const snowGeo = new THREE.SphereGeometry(0.08, 6, 6);
        const snowMat = this.matManager.get(PropColors.snowLight);
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = this.postHeight + 0.05;
        snow.scale.set(1.2, 0.4, 1.2);
        this.addMesh(snow, group);
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.15; // Smaller collision for thinner post
        
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

