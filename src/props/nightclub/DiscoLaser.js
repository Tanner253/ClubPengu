/**
 * DiscoLaser - Animated laser beam for disco mode
 */

import BaseProp from '../BaseProp';

class DiscoLaser extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.laser = null;
        this.glow = null;
        this.baseX = 0;
        this.baseZ = 0;
        this.color = 0xFF0040;
        this.laserIndex = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        
        const { 
            color = 0xFF0040, 
            laserIndex = 0,
            laserLength = 15
        } = options;
        
        this.color = color;
        this.laserIndex = laserIndex;
        this.baseX = x;
        this.baseZ = z;
        
        // Laser beam geometry - thin cylinder
        const laserGeo = new THREE.CylinderGeometry(0.03, 0.03, laserLength, 8);
        const laserMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        
        this.laser = new THREE.Mesh(laserGeo, laserMat);
        this.laser.position.set(x, y - laserLength / 4, z);
        this.laser.visible = false; // Hidden by default
        
        // Store animation data
        this.laser.userData.laserIndex = laserIndex;
        this.laser.userData.baseX = x;
        this.laser.userData.baseZ = z;
        this.laser.userData.color = color;
        
        scene.add(this.laser);
        this.meshes.push(this.laser);
        this.materials.push(laserMat);
        this.geometries.push(laserGeo);
        
        // Add glow effect (larger transparent cylinder)
        const glowGeo = new THREE.CylinderGeometry(0.15, 0.15, laserLength, 8);
        const glowMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        this.glow = new THREE.Mesh(glowGeo, glowMat);
        this.laser.add(this.glow);
        this.materials.push(glowMat);
        this.geometries.push(glowGeo);
        
        return this;
    }
    
    setVisible(visible) {
        if (this.laser) {
            this.laser.visible = visible;
        }
    }
    
    update(time, delta) {
        if (!this.laser || !this.laser.visible) return;
        
        const beatPhase = Math.sin(time * 8) * 0.5 + 0.5;
        const discoTime = time;
        const idx = this.laserIndex;
        const phase = idx * (Math.PI / 3);
        const sweepSpeed = 2 + (idx % 3) * 0.5;
        
        // Rotation sweep pattern
        const sweepAngle = Math.sin(discoTime * sweepSpeed + phase) * 0.8;
        const tiltAngle = Math.cos(discoTime * (sweepSpeed * 0.7) + phase) * 0.6;
        
        this.laser.rotation.x = tiltAngle;
        this.laser.rotation.z = sweepAngle;
        
        // Pulse opacity with beat
        this.laser.material.opacity = 0.8 + beatPhase * 0.2;
        if (this.glow) {
            this.glow.material.opacity = 0.4 + beatPhase * 0.3;
        }
        
        // Color shift
        const hue = (discoTime * 0.3 + idx * 0.15) % 1;
        this.laser.material.color.setHSL(hue, 1, 0.5);
        if (this.glow) {
            this.glow.material.color.setHSL(hue, 1, 0.5);
        }
    }
    
    /**
     * Update animation with disco parameters from room
     */
    updateDiscoAnimation(discoTime, idx, beatPhase) {
        if (!this.laser || !this.laser.visible) return;
        
        const phase = idx * (Math.PI / 3);
        const sweepSpeed = 2 + (idx % 3) * 0.5;
        
        // Rotation sweep pattern
        const sweepAngle = Math.sin(discoTime * sweepSpeed + phase) * 0.8;
        const tiltAngle = Math.cos(discoTime * (sweepSpeed * 0.7) + phase) * 0.6;
        
        this.laser.rotation.x = tiltAngle;
        this.laser.rotation.z = sweepAngle;
        
        // Pulse opacity with beat
        this.laser.material.opacity = 0.8 + beatPhase * 0.2;
        if (this.glow) {
            this.glow.material.opacity = 0.4 + beatPhase * 0.3;
        }
        
        // Color shift
        const hue = (discoTime * 0.3 + idx * 0.15) % 1;
        this.laser.material.color.setHSL(hue, 1, 0.5);
        if (this.glow) {
            this.glow.material.color.setHSL(hue, 1, 0.5);
        }
    }
    
    getMesh() {
        return this.laser;
    }
}

export default DiscoLaser;

