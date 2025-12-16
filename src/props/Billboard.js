/**
 * Billboard - Tall highway-style billboard with lit-up advertisement
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

class Billboard extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.materialManager = getMaterialManager(THREE);
        this.spotlights = [];
        this.glowLight = null;
    }
    
    /**
     * Spawn the billboard into the scene
     * @param {THREE.Scene} scene
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} z - Z position
     * @param {Object} options - { imagePath, width, height, poleHeight, rotation }
     * @returns {Billboard}
     */
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        
        const imagePath = options.imagePath || '/advert.png';
        const boardWidth = options.width || 12;
        const boardHeight = options.height || 4;
        const poleHeight = options.poleHeight || 15;
        const frameDepth = 0.5;
        
        // Create main group
        const group = this.createGroup(scene);
        group.name = 'billboard';
        group.position.set(x, y, z);
        
        if (options.rotation !== undefined) {
            group.rotation.y = options.rotation;
        }
        
        // Colors
        const metalGray = 0x4a4a4a;
        const steelDark = 0x2a2a2a;
        
        // ==================== SUPPORT POLES ====================
        const poleMat = this.materialManager.get(metalGray, {
            metalness: 0.6,
            roughness: 0.4
        });
        
        const poleRadius = 0.4;
        const poleGeo = new THREE.CylinderGeometry(poleRadius, poleRadius * 1.2, poleHeight, 12);
        this.geometries.push(poleGeo);
        
        const pole1 = new THREE.Mesh(poleGeo, poleMat);
        pole1.position.set(-boardWidth / 3, poleHeight / 2, 0);
        pole1.castShadow = true;
        this.addMesh(pole1, group);
        
        const pole2 = new THREE.Mesh(poleGeo, poleMat);
        pole2.position.set(boardWidth / 3, poleHeight / 2, 0);
        pole2.castShadow = true;
        this.addMesh(pole2, group);
        
        // Cross bracing
        const braceMat = this.materialManager.get(steelDark, {
            metalness: 0.5,
            roughness: 0.5
        });
        
        const braceGeo = new THREE.CylinderGeometry(0.1, 0.1, boardWidth * 0.8, 8);
        this.geometries.push(braceGeo);
        
        const brace1 = new THREE.Mesh(braceGeo, braceMat);
        brace1.rotation.z = Math.PI / 2;
        brace1.position.set(0, poleHeight * 0.3, 0);
        this.addMesh(brace1, group);
        
        const brace2 = new THREE.Mesh(braceGeo, braceMat);
        brace2.rotation.z = Math.PI / 2;
        brace2.position.set(0, poleHeight * 0.7, 0);
        this.addMesh(brace2, group);
        
        // Diagonal braces
        const diagLength = Math.sqrt(Math.pow(boardWidth / 3, 2) + Math.pow(poleHeight * 0.4, 2));
        const diagGeo = new THREE.CylinderGeometry(0.08, 0.08, diagLength, 6);
        this.geometries.push(diagGeo);
        
        const diagAngle = Math.atan2(poleHeight * 0.4, boardWidth / 3);
        
        const diag1 = new THREE.Mesh(diagGeo, braceMat);
        diag1.rotation.z = diagAngle;
        diag1.position.set(-boardWidth / 6, poleHeight * 0.5, 0);
        this.addMesh(diag1, group);
        
        const diag2 = new THREE.Mesh(diagGeo, braceMat);
        diag2.rotation.z = -diagAngle;
        diag2.position.set(boardWidth / 6, poleHeight * 0.5, 0);
        this.addMesh(diag2, group);
        
        // ==================== BILLBOARD FRAME ====================
        const frameMat = this.materialManager.get(steelDark, {
            metalness: 0.4,
            roughness: 0.6
        });
        
        const backingGeo = new THREE.BoxGeometry(boardWidth + 1, boardHeight + 1, frameDepth);
        this.geometries.push(backingGeo);
        
        const backing = new THREE.Mesh(backingGeo, frameMat);
        backing.position.set(0, poleHeight + boardHeight / 2, frameDepth / 2);
        backing.castShadow = true;
        this.addMesh(backing, group);
        
        // ==================== ADVERTISEMENT DISPLAY ====================
        const textureLoader = new THREE.TextureLoader();
        const advertTexture = textureLoader.load(imagePath);
        advertTexture.colorSpace = THREE.SRGBColorSpace;
        
        const advertMat = new THREE.MeshStandardMaterial({
            map: advertTexture,
            emissive: 0xffffff,
            emissiveMap: advertTexture,
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.1
        });
        this.materials.push(advertMat);
        
        const advertGeo = new THREE.PlaneGeometry(boardWidth, boardHeight);
        this.geometries.push(advertGeo);
        
        const advert = new THREE.Mesh(advertGeo, advertMat);
        advert.position.set(0, poleHeight + boardHeight / 2, frameDepth + 0.05);
        this.addMesh(advert, group);
        
        // ==================== LIGHTING ====================
        const lightHousingMat = this.materialManager.get(metalGray, {
            metalness: 0.5,
            roughness: 0.5
        });
        
        const lightCount = 4;
        const housingGeo = new THREE.BoxGeometry(1.5, 0.4, 0.8);
        const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
        this.geometries.push(housingGeo, armGeo);
        
        for (let i = 0; i < lightCount; i++) {
            const lx = -boardWidth / 2 + boardWidth / (lightCount - 1) * i;
            
            // Light housing
            const housing = new THREE.Mesh(housingGeo, lightHousingMat);
            housing.position.set(lx, poleHeight + boardHeight + 0.8, frameDepth + 0.8);
            this.addMesh(housing, group);
            
            // Light arm
            const arm = new THREE.Mesh(armGeo, lightHousingMat);
            arm.rotation.x = Math.PI / 3;
            arm.position.set(lx, poleHeight + boardHeight + 0.5, frameDepth + 0.4);
            this.addMesh(arm, group);
            
            // Actual spotlight
            const light = new THREE.SpotLight(0xFFF5E6, 1.5, 15, Math.PI / 4, 0.5);
            light.position.set(lx, poleHeight + boardHeight + 1, frameDepth + 1.2);
            light.target.position.set(lx, poleHeight + boardHeight / 2, frameDepth + 0.1);
            this.addLight(light, group);
            group.add(light.target);
            this.spotlights.push(light);
        }
        
        // Glow effect behind sign
        this.glowLight = new THREE.PointLight(0xFFFFFF, 0.8, 20);
        this.glowLight.position.set(0, poleHeight + boardHeight / 2, -1);
        this.addLight(this.glowLight, group);
        
        // ==================== DECORATIVE CORNER LIGHTS ====================
        const accentColors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00];
        const corners = [
            { x: -boardWidth / 2 - 0.3, y: poleHeight + boardHeight + 0.3 },
            { x: boardWidth / 2 + 0.3, y: poleHeight + boardHeight + 0.3 },
            { x: -boardWidth / 2 - 0.3, y: poleHeight - 0.3 },
            { x: boardWidth / 2 + 0.3, y: poleHeight - 0.3 },
        ];
        
        const accentGeo = new THREE.SphereGeometry(0.15, 8, 8);
        this.geometries.push(accentGeo);
        
        corners.forEach((corner, i) => {
            const accentMat = new THREE.MeshStandardMaterial({
                color: accentColors[i],
                emissive: accentColors[i],
                emissiveIntensity: 0.8
            });
            this.materials.push(accentMat);
            
            const accent = new THREE.Mesh(accentGeo, accentMat);
            accent.position.set(corner.x, corner.y, frameDepth + 0.2);
            this.addMesh(accent, group);
        });
        
        // Store collision data
        this._collisionBounds = {
            minX: x - boardWidth / 6,
            maxX: x + boardWidth / 6,
            minZ: z - 0.5,
            maxZ: z + 0.5,
            height: poleHeight + boardHeight
        };
        
        this.position = { x, y, z };
        
        return this;
    }
    
    /**
     * Get collision bounds
     * @returns {Object}
     */
    getCollisionBounds() {
        return this._collisionBounds;
    }
    
    /**
     * Update nighttime lighting intensity
     * @param {number} nightFactor - 0 (day) to 1 (night)
     */
    setNightIntensity(nightFactor) {
        const intensity = 0.3 + nightFactor * 1.2;
        this.spotlights.forEach(light => {
            light.intensity = intensity;
        });
        if (this.glowLight) {
            this.glowLight.intensity = 0.3 + nightFactor * 0.5;
        }
    }
}

export default Billboard;
