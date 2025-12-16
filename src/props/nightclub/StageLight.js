/**
 * StageLight - Ceiling-mounted stage light with color cycling
 */

import BaseProp from '../BaseProp';

class StageLight extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.lens = null;
        this.spotlight = null;
        this.baseColor = 0xFF0000;
        this.lightIndex = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        
        const { 
            color = 0xFF0000, 
            lightIndex = 0, 
            skipSpotlight = false,
            rotation = 0
        } = options;
        
        this.baseColor = color;
        this.lightIndex = lightIndex;
        
        // Housing
        const housingMat = this.createMaterial({ color: 0x222222, metalness: 0.5 });
        const housingGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.6, 8);
        const housing = new THREE.Mesh(housingGeo, housingMat);
        housing.rotation.x = Math.PI / 2;
        this.addMesh(housing, group);
        
        // Lens
        const lensMat = this.createMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.9
        });
        const lensGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12);
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.z = 0.35;
        lens.userData.isStageLight = true;
        lens.userData.lightIndex = lightIndex;
        lens.userData.baseColor = color;
        this.addMesh(lens, group);
        this.lens = lens;
        
        // Mount
        const mountGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6);
        const mount = new THREE.Mesh(mountGeo, housingMat);
        mount.position.y = 0.4;
        this.addMesh(mount, group);
        
        // Actual spotlight (skip on mobile for performance)
        if (!skipSpotlight) {
            const spotlight = new THREE.SpotLight(color, 2, 20, Math.PI / 6, 0.5);
            spotlight.position.set(0, 0, 0.4);
            spotlight.target.position.set(0, -10, 5);
            this.addLight(spotlight, group);
            group.add(spotlight.target);
            this.spotlight = spotlight;
        }
        
        group.rotation.x = rotation;
        this.setPosition(x, y, z);
        
        return this;
    }
    
    update(time, delta) {
        if (this.lens) {
            const beatPhase = Math.sin(time * 8) * 0.5 + 0.5;
            const pulsePhase = time * 3 + this.lightIndex * 0.4;
            
            // Intensity pulse synced to beat
            this.lens.material.emissiveIntensity = 0.6 + beatPhase * 0.5 + Math.sin(pulsePhase) * 0.3;
            
            // Subtle color shift
            const hue = (time * 0.1 + this.lightIndex * 0.1) % 1;
            this.lens.material.emissive.setHSL(hue, 1, 0.5);
        }
    }
    
    /**
     * Update with beat synchronization from room
     */
    updateWithBeat(time, beatPhase, idx) {
        if (this.lens) {
            const pulsePhase = time * 3 + idx * 0.4;
            
            // Intensity pulse synced to beat
            this.lens.material.emissiveIntensity = 0.6 + beatPhase * 0.5 + Math.sin(pulsePhase) * 0.3;
            
            // Subtle color shift
            const hue = (time * 0.1 + idx * 0.1) % 1;
            this.lens.material.emissive.setHSL(hue, 1, 0.5);
        }
    }
    
    getLens() {
        return this.lens;
    }
    
    getSpotlight() {
        return this.spotlight;
    }
}

export default StageLight;

