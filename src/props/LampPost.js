/**
 * LampPost - Classic street lamp with warm glow
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

class LampPost extends BaseProp {
    /**
     * @param {THREE} THREE - Three.js library
     * @param {boolean} isOn - Whether the lamp is lit
     * @param {boolean} castShadow - Whether the light casts shadows (performance impact)
     */
    constructor(THREE, isOn = true, castShadow = false) {
        super(THREE);
        this.isOn = isOn;
        this.castShadow = castShadow;
        this.matManager = getMaterialManager(THREE);
        this.light = null;
        this.postHeight = 5;
        this.postRadius = 0.12;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'lamp_post';
        group.position.set(x, y, z);
        
        const metalMat = this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.4 });
        const snowMat = this.matManager.get(PropColors.snowLight);
        
        // Base plate - ornate Victorian style
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.25, 8);
        const base = new THREE.Mesh(baseGeo, metalMat);
        base.position.y = 0.125;
        base.castShadow = true;
        this.addMesh(base, group);
        
        // Base ring detail
        const baseRingGeo = new THREE.TorusGeometry(0.4, 0.04, 6, 16);
        const baseRing = new THREE.Mesh(baseRingGeo, metalMat);
        baseRing.position.y = 0.25;
        baseRing.rotation.x = Math.PI / 2;
        this.addMesh(baseRing, group);
        
        // Post - tapered
        const postGeo = new THREE.CylinderGeometry(this.postRadius * 0.9, this.postRadius * 1.1, this.postHeight, 8);
        const post = new THREE.Mesh(postGeo, metalMat);
        post.position.y = this.postHeight / 2 + 0.25;
        post.castShadow = true;
        this.addMesh(post, group);
        
        // Decorative rings on post
        [0.4, 0.7].forEach(t => {
            const ringGeo = new THREE.TorusGeometry(this.postRadius * 1.4, 0.025, 6, 12);
            const ring = new THREE.Mesh(ringGeo, metalMat);
            ring.position.y = this.postHeight * t;
            ring.rotation.x = Math.PI / 2;
            this.addMesh(ring, group);
        });
        
        // Lamp arm bracket
        const bracketGeo = new THREE.BoxGeometry(0.08, 0.4, 0.08);
        const bracket = new THREE.Mesh(bracketGeo, metalMat);
        bracket.position.y = this.postHeight + 0.2;
        this.addMesh(bracket, group);
        
        // Lamp housing (lantern style)
        const housingGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.35, 6);
        const housing = new THREE.Mesh(housingGeo, metalMat);
        housing.position.y = this.postHeight + 0.55;
        housing.castShadow = true;
        this.addMesh(housing, group);
        
        // Lamp roof (pointed)
        const roofGeo = new THREE.ConeGeometry(0.4, 0.35, 6);
        const roof = new THREE.Mesh(roofGeo, metalMat);
        roof.position.y = this.postHeight + 0.9;
        this.addMesh(roof, group);
        
        // Roof finial
        const finialGeo = new THREE.SphereGeometry(0.06, 6, 6);
        const finial = new THREE.Mesh(finialGeo, metalMat);
        finial.position.y = this.postHeight + 1.1;
        this.addMesh(finial, group);
        
        // Glass globe
        const globeGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const globeMat = this.matManager.get(
            this.isOn ? 0xFFF8E0 : PropColors.iceTranslucent,
            {
                roughness: 0.1,
                transparent: true,
                opacity: this.isOn ? 0.95 : 0.6,
                emissive: this.isOn ? 0xFFE4B5 : undefined,
                emissiveIntensity: this.isOn ? 1.2 : 0,
            }
        );
        const globe = new THREE.Mesh(globeGeo, globeMat);
        globe.position.y = this.postHeight + 0.35;
        this.addMesh(globe, group);
        
        // Point light - skip on Apple (Mac + iOS) + Android for performance
        const skipPointLight = typeof window !== 'undefined' && (window._isAppleDevice || window._isAndroidDevice);
        if (this.isOn && !skipPointLight) {
            const intensity = this.castShadow ? 3.0 : 1.8;
            const distance = this.castShadow ? 20 : 12;
            
            this.light = new THREE.PointLight(0xFFE4B5, intensity, distance, 1.8);
            this.light.position.y = this.postHeight + 0.35;
            this.light.castShadow = this.castShadow;
            
            if (this.castShadow) {
                this.light.shadow.mapSize.width = 512;
                this.light.shadow.mapSize.height = 512;
                this.light.shadow.camera.near = 0.5;
                this.light.shadow.camera.far = 20;
                this.light.shadow.bias = -0.001;
            }
            
            this.addLight(this.light, group);
        }
        
        // Snow on top
        const snowCapGeo = new THREE.SphereGeometry(0.28, 8, 8);
        const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
        snowCap.position.y = this.postHeight + 1.15;
        snowCap.scale.set(1.4, 0.35, 1.4);
        this.addMesh(snowCap, group);
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.35;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: this.postHeight + 1.2,
        };
    }
    
    /**
     * Get the light object for external control
     */
    getLight() {
        return this.light;
    }
}

export default LampPost;

