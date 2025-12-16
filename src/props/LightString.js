/**
 * LightString - Christmas light string connecting two points
 */

import BaseProp from './BaseProp';

class LightString extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.bulbs = [];
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        
        const {
            from = { x: 0, z: 0 },
            to = { x: 10, z: 0 },
            height = 5.5,
            bulbCount = 8,
            sag = 0.5
        } = options;
        
        // Light colors
        const lightColors = [
            0xFF0000, // Red
            0x00FF00, // Green
            0xFFFF00, // Yellow
            0x0000FF, // Blue
            0xFF00FF, // Magenta
            0x00FFFF, // Cyan
        ];
        
        // Wire material
        const wireMat = this.createMaterial({ color: 0x333333 });
        
        // Calculate wire path with sag
        const dx = to.x - from.x;
        const dz = to.z - from.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Create wire as a curved line
        const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(from.x, height, from.z),
            new THREE.Vector3((from.x + to.x) / 2, height - sag, (from.z + to.z) / 2),
            new THREE.Vector3(to.x, height, to.z)
        );
        
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.02, 4, false);
        const wire = new THREE.Mesh(tubeGeo, wireMat);
        this.addMesh(wire, group);
        
        // Add bulbs along the wire
        for (let i = 0; i <= bulbCount; i++) {
            const t = i / bulbCount;
            const pos = curve.getPoint(t);
            const color = lightColors[i % lightColors.length];
            
            // Bulb base (dark)
            const baseMat = this.createMaterial({ color: 0x444444 });
            const baseGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.1, 6);
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.copy(pos);
            base.position.y -= 0.05;
            this.addMesh(base, group);
            
            // Bulb (emissive)
            const bulbMat = this.createMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.9
            });
            const bulbGeo = new THREE.SphereGeometry(0.08, 8, 8);
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.copy(pos);
            bulb.position.y -= 0.15;
            bulb.userData.bulbIndex = i;
            bulb.userData.baseColor = color;
            this.addMesh(bulb, group);
            this.bulbs.push(bulb);
        }
        
        this.setPosition(x, y, z);
        return this;
    }
    
    update(time, delta) {
        // Twinkling effect
        this.bulbs.forEach((bulb, idx) => {
            const twinkle = Math.sin(time * 3 + idx * 0.7) * 0.3 + 0.7;
            bulb.material.emissiveIntensity = twinkle;
        });
    }
    
    getBulbs() {
        return this.bulbs;
    }
}

export default LightString;

