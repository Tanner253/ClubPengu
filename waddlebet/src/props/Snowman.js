/**
 * Snowman - Classic snowman with hat, scarf, and stick arms
 * 
 * HEAVILY OPTIMIZED FOR DRAW CALLS:
 * - Previous: ~30 meshes per snowman = 30 draw calls
 * - Now: 5 meshes per snowman = 5 draw calls (snow + dark + orange + red + brown)
 * - 83% reduction in draw calls!
 */

import BaseProp from './BaseProp';
import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

// Cache merged geometries by material type
const _snowmanGeoCache = { snow: null, dark: null, orange: null, red: null, brown: null };

class Snowman extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.matManager = getMaterialManager(THREE);
    }
    
    _buildMergedGeometries() {
        if (_snowmanGeoCache.snow) return _snowmanGeoCache;
        
        const THREE = this.THREE;
        const snowGeos = [];
        const darkGeos = [];  // eyes, buttons, hat
        const orangeGeos = []; // nose
        const redGeos = [];   // scarf
        const brownGeos = []; // arms
        
        // Snow body - bottom ball
        const bottomGeo = new THREE.SphereGeometry(0.8, 16, 12);
        bottomGeo.scale(1, 0.9, 1);
        bottomGeo.translate(0, 0.7, 0);
        snowGeos.push(bottomGeo);
        
        // Middle ball
        const middleGeo = new THREE.SphereGeometry(0.55, 14, 10);
        middleGeo.translate(0, 1.7, 0);
        snowGeos.push(middleGeo);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.4, 12, 10);
        headGeo.translate(0, 2.4, 0);
        snowGeos.push(headGeo);
        
        // Eyes
        [-0.12, 0.12].forEach(xOff => {
            const eyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
            eyeGeo.translate(xOff, 2.5, 0.35);
            darkGeos.push(eyeGeo);
        });
        
        // Carrot nose
        const noseGeo = new THREE.ConeGeometry(0.06, 0.3, 6);
        noseGeo.rotateX(Math.PI / 2);
        noseGeo.translate(0, 2.4, 0.4);
        orangeGeos.push(noseGeo);
        
        // Smile (5 dots)
        for (let i = -2; i <= 2; i++) {
            const mouthGeo = new THREE.SphereGeometry(0.03, 4, 4);
            const angle = (i / 4) * 0.5 - 0.1;
            mouthGeo.translate(Math.sin(angle) * 0.25, 2.22 + Math.abs(i) * 0.04, 0.35 + Math.cos(angle) * 0.05);
            darkGeos.push(mouthGeo);
        }
        
        // Buttons (3)
        [1.5, 1.7, 1.9].forEach(yPos => {
            const btnGeo = new THREE.SphereGeometry(0.04, 6, 6);
            btnGeo.translate(0, yPos, 0.52);
            darkGeos.push(btnGeo);
        });
        
        // Stick arms and twigs
        [-1, 1].forEach(side => {
            const armGeo = new THREE.CylinderGeometry(0.03, 0.02, 0.8, 4);
            armGeo.rotateZ(side * 0.8);
            armGeo.translate(side * 0.7, 1.7, 0);
            brownGeos.push(armGeo);
            
            for (let i = 0; i < 2; i++) {
                const twigGeo = new THREE.CylinderGeometry(0.015, 0.01, 0.2, 3);
                twigGeo.rotateZ(side * (1.2 + i * 0.3));
                twigGeo.translate(side * 1.0, 1.9 + i * 0.1, 0);
                brownGeos.push(twigGeo);
            }
        });
        
        // Scarf
        const scarfGeo = new THREE.TorusGeometry(0.45, 0.08, 6, 16);
        scarfGeo.rotateX(Math.PI / 2);
        scarfGeo.translate(0, 2.1, 0);
        redGeos.push(scarfGeo);
        
        // Scarf tail
        const tailGeo = new THREE.BoxGeometry(0.15, 0.5, 0.06);
        tailGeo.rotateZ(0.3);
        tailGeo.translate(0.3, 1.85, 0.3);
        redGeos.push(tailGeo);
        
        // Hat brim
        const brimGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 12);
        brimGeo.translate(0, 2.75, 0);
        darkGeos.push(brimGeo);
        
        // Hat crown
        const crownGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.35, 12);
        crownGeo.translate(0, 2.95, 0);
        darkGeos.push(crownGeo);
        
        // Hat band (red)
        const bandGeo = new THREE.TorusGeometry(0.31, 0.03, 6, 16);
        bandGeo.rotateX(Math.PI / 2);
        bandGeo.translate(0, 2.82, 0);
        redGeos.push(bandGeo);
        
        // Merge all by material
        _snowmanGeoCache.snow = this._mergeGeos(snowGeos);
        _snowmanGeoCache.dark = this._mergeGeos(darkGeos);
        _snowmanGeoCache.orange = this._mergeGeos(orangeGeos);
        _snowmanGeoCache.red = this._mergeGeos(redGeos);
        _snowmanGeoCache.brown = this._mergeGeos(brownGeos);
        
        // Dispose source geos
        [...snowGeos, ...darkGeos, ...orangeGeos, ...redGeos, ...brownGeos].forEach(g => g.dispose());
        
        return _snowmanGeoCache;
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
        group.name = 'snowman';
        group.position.set(x, y, z);
        
        const geos = this._buildMergedGeometries();
        
        // ONLY 5 MESHES instead of 30!
        const snowMesh = new THREE.Mesh(geos.snow, this.matManager.get(PropColors.snowLight, { roughness: 0.6 }));
        snowMesh.castShadow = true;
        snowMesh.receiveShadow = true;
        this.addMesh(snowMesh, group);
        
        const darkMesh = new THREE.Mesh(geos.dark, this.matManager.get('#1A1A1A'));
        darkMesh.castShadow = true;
        this.addMesh(darkMesh, group);
        
        const orangeMesh = new THREE.Mesh(geos.orange, this.matManager.get('#FF6600'));
        this.addMesh(orangeMesh, group);
        
        const redMesh = new THREE.Mesh(geos.red, this.matManager.get('#CC2222', { roughness: 0.8 }));
        this.addMesh(redMesh, group);
        
        const brownMesh = new THREE.Mesh(geos.brown, this.matManager.get(PropColors.barkDark));
        brownMesh.castShadow = true;
        this.addMesh(brownMesh, group);
        
        return this;
    }
    
    getCollisionBounds() {
        if (!this.group) return null;
        
        const x = this.group.position.x;
        const z = this.group.position.z;
        
        return {
            minX: x - 1,
            maxX: x + 1,
            minZ: z - 1,
            maxZ: z + 1,
            height: 3.2,
        };
    }
    
    getTrigger() {
        if (!this.group) return null;
        
        return {
            type: 'interact_snowman',
            x: this.group.position.x,
            z: this.group.position.z,
            radius: 2,
            message: '☃️ Hello friend!'
        };
    }
}

export default Snowman;

