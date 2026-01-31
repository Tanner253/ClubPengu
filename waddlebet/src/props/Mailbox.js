/**
 * Mailbox - Classic penguin-style mailbox with snow
 * 
 * OPTIMIZED: All geometry merged by material
 * - Previous: 8-9 meshes per mailbox
 * - Now: 3-4 meshes per mailbox
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

const _mailboxGeoCache = { classic: null, modern: null };

class Mailbox extends BaseProp {
    constructor(THREE, style = 'classic') {
        super(THREE);
        this.style = style;
        this.matManager = getMaterialManager(THREE);
    }
    
    _buildClassicGeometry() {
        if (_mailboxGeoCache.classic) return _mailboxGeoCache.classic;
        
        const THREE = this.THREE;
        const blueGeos = [];
        const woodGeos = [];
        const redGeos = [];
        const snowGeos = [];
        
        // Post (wood)
        const postGeo = new THREE.BoxGeometry(0.15, 1.2, 0.15);
        postGeo.translate(0, 0.6, 0);
        woodGeos.push(postGeo);
        
        // Body (blue)
        const bodyGeo = new THREE.BoxGeometry(0.4, 0.3, 0.55);
        bodyGeo.translate(0, 1.35, 0);
        blueGeos.push(bodyGeo);
        
        // Rounded top (blue)
        const topGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.55, 8, 1, false, 0, Math.PI);
        topGeo.rotateZ(Math.PI / 2);
        topGeo.rotateY(Math.PI / 2);
        topGeo.translate(0, 1.5, 0);
        blueGeos.push(topGeo);
        
        // Slot (darker blue - merge with blue)
        const slotGeo = new THREE.BoxGeometry(0.25, 0.04, 0.02);
        slotGeo.translate(0, 1.4, 0.28);
        blueGeos.push(slotGeo);
        
        // Flag pole (red)
        const flagPoleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.25, 6);
        flagPoleGeo.rotateZ(-0.3);
        flagPoleGeo.translate(0.22, 1.45, 0);
        redGeos.push(flagPoleGeo);
        
        // Flag (red)
        const flagGeo = new THREE.BoxGeometry(0.02, 0.12, 0.08);
        flagGeo.translate(0.32, 1.55, 0);
        redGeos.push(flagGeo);
        
        // Snow
        const snowGeo = new THREE.SphereGeometry(0.25, 8, 6);
        snowGeo.scale(1.2, 0.4, 1.4);
        snowGeo.translate(0, 1.7, 0);
        snowGeos.push(snowGeo);
        
        _mailboxGeoCache.classic = {
            blue: this._mergeGeos(blueGeos),
            wood: this._mergeGeos(woodGeos),
            red: this._mergeGeos(redGeos),
            snow: this._mergeGeos(snowGeos)
        };
        
        [...blueGeos, ...woodGeos, ...redGeos, ...snowGeos].forEach(g => g.dispose());
        return _mailboxGeoCache.classic;
    }
    
    _buildModernGeometry() {
        if (_mailboxGeoCache.modern) return _mailboxGeoCache.modern;
        
        const THREE = this.THREE;
        const metalGeos = [];
        const greenGeos = [];
        const snowGeos = [];
        
        // Post (metal)
        const postGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.0, 8);
        postGeo.translate(0, 0.5, 0);
        metalGeos.push(postGeo);
        
        // Base (metal)
        const baseGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.08, 8);
        baseGeo.translate(0, 0.04, 0);
        metalGeos.push(baseGeo);
        
        // Handle (metal)
        const handleGeo = new THREE.BoxGeometry(0.1, 0.03, 0.03);
        handleGeo.translate(0, 1.15, 0.2);
        metalGeos.push(handleGeo);
        
        // Body (green)
        const bodyGeo = new THREE.BoxGeometry(0.45, 0.55, 0.35);
        bodyGeo.translate(0, 1.28, 0);
        greenGeos.push(bodyGeo);
        
        // Door (darker green - merge with green)
        const doorGeo = new THREE.BoxGeometry(0.35, 0.45, 0.02);
        doorGeo.translate(0, 1.28, 0.18);
        greenGeos.push(doorGeo);
        
        // Snow
        const snowGeo = new THREE.BoxGeometry(0.5, 0.1, 0.4);
        snowGeo.translate(0, 1.6, 0);
        snowGeos.push(snowGeo);
        
        _mailboxGeoCache.modern = {
            metal: this._mergeGeos(metalGeos),
            green: this._mergeGeos(greenGeos),
            snow: this._mergeGeos(snowGeos)
        };
        
        [...metalGeos, ...greenGeos, ...snowGeos].forEach(g => g.dispose());
        return _mailboxGeoCache.modern;
    }
    
    _mergeGeos(geometries) {
        if (!geometries.length) return null;
        const THREE = this.THREE;
        let totalVerts = 0, totalIdx = 0;
        geometries.forEach(g => {
            totalVerts += g.getAttribute('position').count;
            if (g.getIndex()) totalIdx += g.getIndex().count;
        });
        const positions = new Float32Array(totalVerts * 3);
        const normals = new Float32Array(totalVerts * 3);
        const indices = totalIdx > 0 ? new Uint32Array(totalIdx) : null;
        let vOff = 0, iOff = 0, ivOff = 0;
        geometries.forEach(g => {
            const pos = g.getAttribute('position');
            const norm = g.getAttribute('normal');
            const idx = g.getIndex();
            positions.set(pos.array, vOff * 3);
            if (norm) normals.set(norm.array, vOff * 3);
            if (idx && indices) {
                for (let i = 0; i < idx.count; i++) indices[iOff + i] = idx.array[i] + ivOff;
                iOff += idx.count;
            }
            ivOff += pos.count;
            vOff += pos.count;
        });
        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));
        merged.computeVertexNormals();
        return merged;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = `mailbox_${this.style}`;
        group.position.set(x, y, z);
        
        if (this.style === 'modern') {
            const geos = this._buildModernGeometry();
            
            const metalMesh = new THREE.Mesh(geos.metal, this.matManager.get(PropColors.metalDark, { roughness: 0.5, metalness: 0.4 }));
            metalMesh.castShadow = true;
            this.addMesh(metalMesh, group);
            
            const greenMesh = new THREE.Mesh(geos.green, this.matManager.get('#2E8B57', { roughness: 0.5, metalness: 0.2 }));
            greenMesh.castShadow = true;
            this.addMesh(greenMesh, group);
            
            const snowMesh = new THREE.Mesh(geos.snow, this.matManager.get(PropColors.snowLight, { roughness: 0.6 }));
            this.addMesh(snowMesh, group);
        } else {
            const geos = this._buildClassicGeometry();
            
            const blueMesh = new THREE.Mesh(geos.blue, this.matManager.get('#1E90FF', { roughness: 0.4, metalness: 0.3 }));
            blueMesh.castShadow = true;
            this.addMesh(blueMesh, group);
            
            const woodMesh = new THREE.Mesh(geos.wood, this.matManager.get(PropColors.plankDark, { roughness: 0.85 }));
            woodMesh.castShadow = true;
            this.addMesh(woodMesh, group);
            
            const redMesh = new THREE.Mesh(geos.red, this.matManager.get('#FF4444', { roughness: 0.5 }));
            this.addMesh(redMesh, group);
            
            const snowMesh = new THREE.Mesh(geos.snow, this.matManager.get(PropColors.snowLight, { roughness: 0.6 }));
            this.addMesh(snowMesh, group);
        }
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        const r = 0.3;
        
        return {
            minX: x - r,
            maxX: x + r,
            minZ: z - r,
            maxZ: z + r,
            height: 1.8,
        };
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        return {
            type: 'interact',
            x: this.group.position.x,
            z: this.group.position.z,
            radius: 1.5,
            message: '📬 Check Mail'
        };
    }
}

export default Mailbox;





