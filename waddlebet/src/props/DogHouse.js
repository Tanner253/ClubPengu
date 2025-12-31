/**
 * DogHouse - Cozy doghouse for dog spaces
 * Features a classic A-frame roof, wooden construction, and a welcoming entrance
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class DogHouse extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} withEntrance - Include the entrance
     */
    constructor(THREE, withEntrance = true) {
        super(THREE);
        this.withEntrance = withEntrance;
        this.matManager = getMaterialManager(THREE);
        this.houseWidth = 3.0;
        this.houseDepth = 3.0;
        this.houseHeight = 2.0;
        this.roofHeight = 1.5;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'doghouse';
        group.position.set(x, y, z);
        
        // Materials
        const woodMat = this.matManager.get(0x8B4513, { roughness: 0.7, metalness: 0.0 });
        const darkWoodMat = this.matManager.get(0x654321, { roughness: 0.8, metalness: 0.0 });
        const roofMat = this.matManager.get(0xCD853F, { roughness: 0.6, metalness: 0.0 });
        const doorMat = this.matManager.get(0x4A2C2A, { roughness: 0.8, metalness: 0.0 });
        const warmGlow = this.matManager.get(0xFFA500, { 
            emissive: 0xFF8C00, 
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6
        });
        const darkMat = this.matManager.get('#030810', { roughness: 1 });
        
        // Base platform
        const baseGeo = new THREE.BoxGeometry(this.houseWidth + 0.2, 0.1, this.houseDepth + 0.2);
        const base = new THREE.Mesh(baseGeo, darkWoodMat);
        base.position.y = 0.05;
        base.castShadow = true;
        base.receiveShadow = true;
        this.addMesh(base, group);
        
        // Main house body (box)
        const bodyGeo = new THREE.BoxGeometry(this.houseWidth, this.houseHeight, this.houseDepth);
        const body = new THREE.Mesh(bodyGeo, woodMat);
        body.position.y = this.houseHeight / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        this.addMesh(body, group);
        
        // Wooden planks texture (vertical boards)
        this.createWoodPlanks(group, woodMat, darkWoodMat);
        
        // A-frame roof
        this.createRoof(group, roofMat);
        
        // Entrance
        if (this.withEntrance) {
            this.createEntrance(group, doorMat, warmGlow, darkMat);
        }
        
        // Decorative elements
        this.createDecorations(group, woodMat, darkWoodMat);
        
        return this;
    }
    
    createWoodPlanks(group, woodMat, darkWoodMat) {
        const THREE = this.THREE;
        const plankCount = 6;
        const plankWidth = this.houseWidth / plankCount;
        
        // Front and back planks
        for (let i = 0; i < plankCount; i++) {
            const x = -this.houseWidth / 2 + (i + 0.5) * plankWidth;
            
            // Front planks
            const frontPlankGeo = new THREE.BoxGeometry(plankWidth * 0.9, this.houseHeight, 0.05);
            const frontPlank = new THREE.Mesh(frontPlankGeo, i % 2 === 0 ? woodMat : darkWoodMat);
            frontPlank.position.set(x, this.houseHeight / 2, this.houseDepth / 2 + 0.025);
            this.addMesh(frontPlank, group);
            
            // Back planks
            const backPlankGeo = new THREE.BoxGeometry(plankWidth * 0.9, this.houseHeight, 0.05);
            const backPlank = new THREE.Mesh(backPlankGeo, i % 2 === 0 ? darkWoodMat : woodMat);
            backPlank.position.set(x, this.houseHeight / 2, -this.houseDepth / 2 - 0.025);
            this.addMesh(backPlank, group);
        }
        
        // Side planks
        const sidePlankCount = 4;
        const sidePlankHeight = this.houseHeight / sidePlankCount;
        
        for (let i = 0; i < sidePlankCount; i++) {
            const y = (i + 0.5) * sidePlankHeight;
            
            // Left side
            const leftPlankGeo = new THREE.BoxGeometry(0.05, sidePlankHeight * 0.9, this.houseDepth);
            const leftPlank = new THREE.Mesh(leftPlankGeo, i % 2 === 0 ? woodMat : darkWoodMat);
            leftPlank.position.set(-this.houseWidth / 2 - 0.025, y, 0);
            this.addMesh(leftPlank, group);
            
            // Right side
            const rightPlankGeo = new THREE.BoxGeometry(0.05, sidePlankHeight * 0.9, this.houseDepth);
            const rightPlank = new THREE.Mesh(rightPlankGeo, i % 2 === 0 ? darkWoodMat : woodMat);
            rightPlank.position.set(this.houseWidth / 2 + 0.025, y, 0);
            this.addMesh(rightPlank, group);
        }
    }
    
    createRoof(group, roofMat) {
        const THREE = this.THREE;
        const roofOverhang = 0.3;
        const roofWidth = this.houseWidth + roofOverhang * 2;
        const roofDepth = this.houseDepth + roofOverhang * 2;
        
        // Left roof panel
        const leftRoofShape = new THREE.Shape();
        leftRoofShape.moveTo(0, 0);
        leftRoofShape.lineTo(roofWidth / 2, this.roofHeight);
        leftRoofShape.lineTo(0, this.roofHeight);
        leftRoofShape.lineTo(0, 0);
        
        const leftRoofGeo = new THREE.ExtrudeGeometry(leftRoofShape, {
            depth: roofDepth,
            bevelEnabled: false
        });
        const leftRoof = new THREE.Mesh(leftRoofGeo, roofMat);
        leftRoof.position.set(-roofWidth / 4, this.houseHeight, 0);
        leftRoof.rotation.y = Math.PI / 2;
        leftRoof.castShadow = true;
        this.addMesh(leftRoof, group);
        
        // Right roof panel
        const rightRoofShape = new THREE.Shape();
        rightRoofShape.moveTo(0, 0);
        rightRoofShape.lineTo(-roofWidth / 2, this.roofHeight);
        rightRoofShape.lineTo(0, this.roofHeight);
        rightRoofShape.lineTo(0, 0);
        
        const rightRoofGeo = new THREE.ExtrudeGeometry(rightRoofShape, {
            depth: roofDepth,
            bevelEnabled: false
        });
        const rightRoof = new THREE.Mesh(rightRoofGeo, roofMat);
        rightRoof.position.set(roofWidth / 4, this.houseHeight, 0);
        rightRoof.rotation.y = Math.PI / 2;
        rightRoof.castShadow = true;
        this.addMesh(rightRoof, group);
        
        // Roof peak (ridge)
        const ridgeGeo = new THREE.BoxGeometry(0.1, 0.1, roofDepth);
        const ridge = new THREE.Mesh(ridgeGeo, roofMat);
        ridge.position.set(0, this.houseHeight + this.roofHeight, 0);
        this.addMesh(ridge, group);
        
        // Roof shingles texture (horizontal lines)
        for (let i = 0; i < 5; i++) {
            const shingleY = this.houseHeight + (i / 5) * this.roofHeight;
            const shingleGeo = new THREE.BoxGeometry(roofWidth, 0.05, roofDepth);
            const shingle = new THREE.Mesh(shingleGeo, roofMat);
            shingle.position.set(0, shingleY, 0);
            shingle.rotation.x = Math.atan2(this.roofHeight, roofWidth / 2);
            this.addMesh(shingle, group);
        }
    }
    
    createEntrance(group, doorMat, warmGlow, darkMat) {
        const THREE = this.THREE;
        const entranceWidth = 1.0;
        const entranceHeight = 1.2;
        const entranceZ = this.houseDepth / 2;
        
        // Entrance arch (cutout in front wall)
        const archGeo = new THREE.BoxGeometry(entranceWidth, entranceHeight, 0.2);
        const arch = new THREE.Mesh(archGeo, doorMat);
        arch.position.set(0, entranceHeight / 2, entranceZ + 0.1);
        this.addMesh(arch, group);
        
        // Door frame
        const frameThickness = 0.08;
        // Top frame
        const topFrameGeo = new THREE.BoxGeometry(entranceWidth + frameThickness * 2, frameThickness, 0.15);
        const topFrame = new THREE.Mesh(topFrameGeo, doorMat);
        topFrame.position.set(0, entranceHeight + frameThickness / 2, entranceZ + 0.075);
        this.addMesh(topFrame, group);
        
        // Side frames
        const sideFrameGeo = new THREE.BoxGeometry(frameThickness, entranceHeight, 0.15);
        const leftFrame = new THREE.Mesh(sideFrameGeo, doorMat);
        leftFrame.position.set(-entranceWidth / 2 - frameThickness / 2, entranceHeight / 2, entranceZ + 0.075);
        this.addMesh(leftFrame, group);
        
        const rightFrame = new THREE.Mesh(sideFrameGeo, doorMat);
        rightFrame.position.set(entranceWidth / 2 + frameThickness / 2, entranceHeight / 2, entranceZ + 0.075);
        this.addMesh(rightFrame, group);
        
        // Warm glow from interior
        const glowGeo = new THREE.CircleGeometry(entranceWidth * 0.4, 16);
        const glow = new THREE.Mesh(glowGeo, warmGlow);
        glow.position.set(0, entranceHeight * 0.5, entranceZ - 0.1);
        this.addMesh(glow, group);
        
        // Dark interior
        const interiorGeo = new THREE.CircleGeometry(entranceWidth * 0.45, 16);
        const interior = new THREE.Mesh(interiorGeo, darkMat);
        interior.position.set(0, entranceHeight * 0.5, entranceZ - 0.15);
        this.addMesh(interior, group);
    }
    
    createDecorations(group, woodMat, darkWoodMat) {
        const THREE = this.THREE;
        
        // Bone decoration above entrance (optional)
        const boneGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
        const boneMat = this.matManager.get(0xF5F5DC, { roughness: 0.5 });
        const bone = new THREE.Mesh(boneGeo, boneMat);
        bone.position.set(0, this.houseHeight + this.roofHeight - 0.2, this.houseDepth / 2 + 0.2);
        bone.rotation.z = Math.PI / 4;
        this.addMesh(bone, group);
        
        // Corner supports
        const supportGeo = new THREE.CylinderGeometry(0.08, 0.08, this.houseHeight, 8);
        const supportMat = darkWoodMat;
        const corners = [
            { x: -this.houseWidth / 2, z: -this.houseDepth / 2 },
            { x: this.houseWidth / 2, z: -this.houseDepth / 2 },
            { x: -this.houseWidth / 2, z: this.houseDepth / 2 },
            { x: this.houseWidth / 2, z: this.houseDepth / 2 }
        ];
        
        corners.forEach(corner => {
            const support = new THREE.Mesh(supportGeo, supportMat);
            support.position.set(corner.x, this.houseHeight / 2, corner.z);
            this.addMesh(support, group);
        });
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const w = this.houseWidth / 2 + 0.5;
        const d = this.houseDepth / 2 + 0.5;
        
        return {
            minX: x - w,
            maxX: x + w,
            minZ: z - d,
            maxZ: z + d,
            height: this.houseHeight + this.roofHeight,
        };
    }
    
    getTrigger() {
        if (!this.group || !this.withEntrance) return null;
        
        return {
            x: this.group.position.x,
            z: this.group.position.z + this.houseDepth / 2 + 2.2,
            radius: 1.5,
            type: 'enter_space',
            data: {}
        };
    }
}

export default DogHouse;
