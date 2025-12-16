/**
 * DiscoSpotlight - Moving spotlight cone for disco mode
 */

import BaseProp from '../BaseProp';

class DiscoSpotlight extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.cone = null;
        this.baseX = 0;
        this.baseZ = 0;
        this.spotIndex = 0;
        this.colorIndex = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        
        const { 
            color = 0xFF00FF, 
            spotIndex = 0,
            coneHeight = 11,
            coneRadius = 4,
            colorIndex = 0
        } = options;
        
        this.spotIndex = spotIndex;
        this.colorIndex = colorIndex;
        this.baseX = x;
        this.baseZ = z;
        
        // Spotlight cone geometry
        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 16, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });
        
        this.cone = new THREE.Mesh(coneGeo, coneMat);
        this.cone.position.set(x, coneHeight / 2, z);
        this.cone.visible = false; // Hidden by default
        
        // Store animation data
        this.cone.userData.spotIndex = spotIndex;
        this.cone.userData.baseX = x;
        this.cone.userData.baseZ = z;
        this.cone.userData.colorIndex = colorIndex;
        
        scene.add(this.cone);
        this.meshes.push(this.cone);
        this.materials.push(coneMat);
        this.geometries.push(coneGeo);
        
        return this;
    }
    
    setVisible(visible) {
        if (this.cone) {
            this.cone.visible = visible;
        }
    }
    
    update(time, delta) {
        if (!this.cone || !this.cone.visible) return;
        
        const beatPhase = Math.sin(time * 8) * 0.5 + 0.5;
        const discoTime = time;
        const idx = this.spotIndex;
        const phase = idx * (Math.PI / 2);
        const orbitSpeed = 1.5 + (idx % 2) * 0.3;
        
        // Circular wobble motion
        const wobbleX = Math.sin(discoTime * orbitSpeed + phase) * 3;
        const wobbleZ = Math.cos(discoTime * orbitSpeed + phase) * 3;
        
        this.cone.position.x = this.baseX + wobbleX;
        this.cone.position.z = this.baseZ + wobbleZ;
        
        // Tilt rotation for sweeping effect
        this.cone.rotation.x = Math.sin(discoTime * 2 + phase) * 0.2;
        this.cone.rotation.z = Math.cos(discoTime * 1.5 + phase) * 0.15;
        
        // Color cycling
        const hue = (discoTime * 0.2 + idx * 0.25) % 1;
        this.cone.material.color.setHSL(hue, 1, 0.5);
        
        // Opacity pulse
        this.cone.material.opacity = 0.2 + beatPhase * 0.2;
    }
    
    /**
     * Update animation with disco parameters from room
     */
    updateDiscoAnimation(discoTime, idx, beatPhase) {
        if (!this.cone || !this.cone.visible) return;
        
        const phase = idx * (Math.PI / 2);
        const orbitSpeed = 1.5 + (idx % 2) * 0.3;
        
        // Circular wobble motion
        const wobbleX = Math.sin(discoTime * orbitSpeed + phase) * 3;
        const wobbleZ = Math.cos(discoTime * orbitSpeed + phase) * 3;
        
        this.cone.position.x = this.baseX + wobbleX;
        this.cone.position.z = this.baseZ + wobbleZ;
        
        // Tilt rotation for sweeping effect
        this.cone.rotation.x = Math.sin(discoTime * 2 + phase) * 0.2;
        this.cone.rotation.z = Math.cos(discoTime * 1.5 + phase) * 0.15;
        
        // Color cycling
        const hue = (discoTime * 0.2 + idx * 0.25) % 1;
        this.cone.material.color.setHSL(hue, 1, 0.5);
        
        // Opacity pulse
        this.cone.material.opacity = 0.2 + beatPhase * 0.2;
    }
    
    getMesh() {
        return this.cone;
    }
}

export default DiscoSpotlight;

