/**
 * NeonTubing - Flexible neon tube lighting that can form shapes and patterns
 * Creates glowing neon tubes for decorative casino signage
 */

import BaseProp from '../BaseProp';

class NeonTubing extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.tubes = [];
        this.lastUpdateTime = 0;
        this.flickerSeed = Math.random() * 1000; // Per-instance seed for deterministic flicker
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'neon_tubing';
        
        const {
            shape = 'dollar',  // 'dollar', 'star', 'heart', 'diamond', 'spade', 'club', 'custom'
            size = 3,
            color = 0xFF1493,
            tubeRadius = 0.08,
            glowIntensity = 1.0,
            customPath = null
        } = options;
        
        // Get path based on shape
        const path = customPath || this.getShapePath(THREE, shape, size);
        
        // Create tube geometry along path
        const tubeGeo = new THREE.TubeGeometry(path, 64, tubeRadius, 8, false);
        
        // Main neon tube material
        const tubeMat = this.createMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: glowIntensity,
            roughness: 0.3,
            metalness: 0.1
        });
        
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.userData.isNeonTube = true;
        tube.userData.baseColor = color;
        this.addMesh(tube, group);
        this.tubes.push(tube);
        
        // Outer glow effect (larger transparent tube)
        const glowGeo = new THREE.TubeGeometry(path, 64, tubeRadius * 2.5, 8, false);
        const glowMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.materials.push(glowMat);
        
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.userData.isGlow = true;
        group.add(glow);
        this.meshes.push(glow);
        this.geometries.push(glowGeo);
        
        // Add point light for local illumination - skip on Apple/Mobile for performance
        const needsOptimization = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
        if (!needsOptimization) {
            const neonLight = new THREE.PointLight(color, glowIntensity * 0.5, size * 2);
            this.addLight(neonLight, group);
        }
        
        this.setPosition(x, y, z);
        return this;
    }
    
    getShapePath(THREE, shape, size) {
        const points = [];
        const s = size;
        
        switch (shape) {
            case 'dollar':
                // Dollar sign shape
                points.push(new THREE.Vector3(0, s * 1.2, 0));
                points.push(new THREE.Vector3(0, s * 0.9, 0));
                // Top curve
                for (let i = 0; i <= 8; i++) {
                    const t = i / 8;
                    const angle = Math.PI * 0.5 + Math.PI * t;
                    points.push(new THREE.Vector3(
                        Math.cos(angle) * s * 0.4,
                        s * 0.6 + Math.sin(angle) * s * 0.25,
                        0
                    ));
                }
                // Middle part
                points.push(new THREE.Vector3(s * 0.4, s * 0.35, 0));
                // Bottom curve
                for (let i = 0; i <= 8; i++) {
                    const t = i / 8;
                    const angle = -Math.PI * 0.5 + Math.PI * t;
                    points.push(new THREE.Vector3(
                        Math.cos(angle) * s * 0.4,
                        s * 0.1 + Math.sin(angle) * s * 0.25,
                        0
                    ));
                }
                // Bottom stem
                points.push(new THREE.Vector3(0, -s * 0.15, 0));
                points.push(new THREE.Vector3(0, -s * 0.45, 0));
                break;
                
            case 'star':
                // 5-pointed star
                for (let i = 0; i <= 10; i++) {
                    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
                    const radius = i % 2 === 0 ? s : s * 0.4;
                    points.push(new THREE.Vector3(
                        Math.cos(angle) * radius,
                        Math.sin(angle) * radius,
                        0
                    ));
                }
                points.push(points[0].clone());
                break;
                
            case 'heart':
                // Heart shape
                for (let i = 0; i <= 32; i++) {
                    const t = (i / 32) * Math.PI * 2;
                    const x = s * 0.5 * Math.pow(Math.sin(t), 3);
                    const y = s * 0.4 * (
                        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 
                        2 * Math.cos(3 * t) - Math.cos(4 * t)
                    ) / 16;
                    points.push(new THREE.Vector3(x, y, 0));
                }
                break;
                
            case 'diamond':
                // Diamond shape
                points.push(new THREE.Vector3(0, s, 0));
                points.push(new THREE.Vector3(s * 0.5, 0, 0));
                points.push(new THREE.Vector3(0, -s, 0));
                points.push(new THREE.Vector3(-s * 0.5, 0, 0));
                points.push(new THREE.Vector3(0, s, 0));
                break;
                
            case 'spade':
                // Spade shape (inverted heart + stem)
                for (let i = 0; i <= 24; i++) {
                    const t = (i / 24) * Math.PI * 2;
                    const x = s * 0.4 * Math.pow(Math.sin(t), 3);
                    const y = -s * 0.3 * (
                        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 
                        2 * Math.cos(3 * t) - Math.cos(4 * t)
                    ) / 16 + s * 0.3;
                    points.push(new THREE.Vector3(x, y, 0));
                }
                // Stem
                points.push(new THREE.Vector3(0, -s * 0.2, 0));
                points.push(new THREE.Vector3(-s * 0.2, -s * 0.5, 0));
                points.push(new THREE.Vector3(0, -s * 0.4, 0));
                points.push(new THREE.Vector3(s * 0.2, -s * 0.5, 0));
                points.push(new THREE.Vector3(0, -s * 0.2, 0));
                break;
                
            case 'club':
                // Club shape (three circles + stem)
                // Top circle
                for (let i = 0; i <= 12; i++) {
                    const t = (i / 12) * Math.PI * 2;
                    points.push(new THREE.Vector3(
                        Math.cos(t) * s * 0.25,
                        s * 0.5 + Math.sin(t) * s * 0.25,
                        0
                    ));
                }
                // Right circle
                for (let i = 0; i <= 12; i++) {
                    const t = (i / 12) * Math.PI * 2;
                    points.push(new THREE.Vector3(
                        s * 0.3 + Math.cos(t) * s * 0.25,
                        s * 0.15 + Math.sin(t) * s * 0.25,
                        0
                    ));
                }
                // Left circle
                for (let i = 0; i <= 12; i++) {
                    const t = (i / 12) * Math.PI * 2;
                    points.push(new THREE.Vector3(
                        -s * 0.3 + Math.cos(t) * s * 0.25,
                        s * 0.15 + Math.sin(t) * s * 0.25,
                        0
                    ));
                }
                // Stem
                points.push(new THREE.Vector3(0, 0, 0));
                points.push(new THREE.Vector3(-s * 0.15, -s * 0.4, 0));
                points.push(new THREE.Vector3(s * 0.15, -s * 0.4, 0));
                points.push(new THREE.Vector3(0, 0, 0));
                break;
                
            default:
                // Default circle
                for (let i = 0; i <= 32; i++) {
                    const t = (i / 32) * Math.PI * 2;
                    points.push(new THREE.Vector3(
                        Math.cos(t) * s,
                        Math.sin(t) * s,
                        0
                    ));
                }
        }
        
        return new THREE.CatmullRomCurve3(points);
    }
    
    update(time, delta) {
        // Throttle updates to every 100ms for performance
        if (time - this.lastUpdateTime < 0.1) return;
        this.lastUpdateTime = time;
        
        // Pulsing glow effect
        const pulse = Math.sin(time * 4) * 0.2 + 0.8;
        const glowPulse = Math.sin(time * 4) * 0.1 + 0.25;
        
        this.meshes.forEach(mesh => {
            if (mesh.userData.isNeonTube) {
                mesh.material.emissiveIntensity = pulse;
            }
            
            if (mesh.userData.isGlow) {
                mesh.material.opacity = glowPulse;
            }
        });
        
        // Deterministic light flickering (no Math.random() - much cheaper)
        // Uses sin with instance-specific seed for unique per-light variation
        this.lights.forEach((light, idx) => {
            const flicker = 1 + Math.sin(time * 15 + this.flickerSeed + idx * 2.5) * 0.05;
            light.intensity = 0.5 * flicker;
        });
    }
}

export default NeonTubing;

