/**
 * CasinoSearchlight - Vegas-style searchlights sweeping the sky
 * Creates dramatic beams of light that sweep across the scene
 */

import BaseProp from '../BaseProp';

class CasinoSearchlight extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.beam = null;
        this.beamCone = null;
        this.housing = null;
        this.baseAngle = 0;
        this.sweepSpeed = 1;
        this.sweepAmplitude = Math.PI / 3;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'casino_searchlight';
        
        const {
            beamLength = 30,
            beamWidth = 2,
            color = 0xFFFFFF,
            sweepSpeed = 1,
            sweepAmplitude = Math.PI / 3,
            baseAngle = 0
        } = options;
        
        this.sweepSpeed = sweepSpeed;
        this.sweepAmplitude = sweepAmplitude;
        this.baseAngle = baseAngle;
        
        // Base pedestal
        const baseMat = this.createMaterial({
            color: 0x1a1a1a,
            roughness: 0.7,
            metalness: 0.3
        });
        
        const baseGeo = new THREE.CylinderGeometry(0.8, 1, 0.5, 16);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.25;
        this.addMesh(base, group);
        
        // Rotating mount
        const mountGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 12);
        const mount = new THREE.Mesh(mountGeo, baseMat);
        mount.position.y = 0.9;
        this.addMesh(mount, group);
        
        // Pivot group for rotating housing
        const pivotGroup = new THREE.Group();
        pivotGroup.position.y = 1.3;
        group.add(pivotGroup);
        
        // Housing (cylindrical lamp housing)
        const housingMat = this.createMaterial({
            color: 0x333333,
            roughness: 0.5,
            metalness: 0.6
        });
        
        const housingGeo = new THREE.CylinderGeometry(0.6, 0.8, 1.5, 12);
        this.housing = new THREE.Mesh(housingGeo, housingMat);
        this.housing.rotation.x = Math.PI / 2;
        pivotGroup.add(this.housing);
        
        // Lens (front of housing)
        const lensMat = this.createMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 1.0,
            transparent: true,
            opacity: 0.9
        });
        
        const lensGeo = new THREE.CircleGeometry(0.55, 16);
        const lens = new THREE.Mesh(lensGeo, lensMat);
        lens.position.z = 0.76;
        lens.userData.isLens = true;
        this.housing.add(lens);
        this.meshes.push(lens);
        this.materials.push(lensMat);
        
        // Heat fins on housing
        const finMat = this.createMaterial({
            color: 0x222222,
            roughness: 0.6,
            metalness: 0.4
        });
        
        for (let f = 0; f < 8; f++) {
            const finGeo = new THREE.BoxGeometry(0.05, 1.2, 0.8);
            const fin = new THREE.Mesh(finGeo, finMat);
            const angle = (f / 8) * Math.PI * 2;
            fin.position.set(
                Math.cos(angle) * 0.65,
                Math.sin(angle) * 0.65,
                -0.2
            );
            fin.rotation.z = angle;
            this.housing.add(fin);
            this.geometries.push(finGeo);
        }
        
        // Light beam cone (volumetric effect)
        const beamMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.materials.push(beamMat);
        
        const beamGeo = new THREE.ConeGeometry(beamWidth, beamLength, 32, 1, true);
        this.beamCone = new THREE.Mesh(beamGeo, beamMat);
        this.beamCone.rotation.x = Math.PI;
        this.beamCone.position.z = beamLength / 2 + 0.8;
        this.beamCone.userData.isBeam = true;
        this.housing.add(this.beamCone);
        this.geometries.push(beamGeo);
        
        // Inner bright beam core
        const coreMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.materials.push(coreMat);
        
        const coreGeo = new THREE.ConeGeometry(beamWidth * 0.3, beamLength * 0.9, 16, 1, true);
        const beamCore = new THREE.Mesh(coreGeo, coreMat);
        beamCore.rotation.x = Math.PI;
        beamCore.position.z = beamLength / 2 + 0.8;
        this.housing.add(beamCore);
        this.geometries.push(coreGeo);
        
        // Store pivot reference for animation
        this.pivotGroup = pivotGroup;
        
        // Spotlight for actual lighting (optional)
        const spotlight = new THREE.SpotLight(color, 2, beamLength * 1.5, Math.PI / 12, 0.5, 1);
        spotlight.position.z = 0.8;
        this.housing.add(spotlight);
        this.lights.push(spotlight);
        
        // Spotlight target
        const targetObj = new THREE.Object3D();
        targetObj.position.z = beamLength;
        this.housing.add(targetObj);
        spotlight.target = targetObj;
        
        this.setPosition(x, y, z);
        return this;
    }
    
    update(time, delta) {
        if (!this.pivotGroup) return;
        
        // Sweeping motion
        const sweepAngle = Math.sin(time * this.sweepSpeed + this.baseAngle) * this.sweepAmplitude;
        const tiltAngle = Math.cos(time * this.sweepSpeed * 0.7 + this.baseAngle) * (this.sweepAmplitude * 0.5);
        
        this.pivotGroup.rotation.y = sweepAngle;
        this.pivotGroup.rotation.x = -0.3 + tiltAngle * 0.3;
        
        // Beam intensity pulsing
        if (this.beamCone) {
            const pulse = Math.sin(time * 4) * 0.05 + 0.15;
            this.beamCone.material.opacity = pulse;
        }
        
        // Lens glow pulsing
        this.meshes.forEach(mesh => {
            if (mesh.userData.isLens) {
                const lensPulse = Math.sin(time * 6) * 0.2 + 0.8;
                mesh.material.emissiveIntensity = lensPulse;
            }
        });
    }
}

export default CasinoSearchlight;

