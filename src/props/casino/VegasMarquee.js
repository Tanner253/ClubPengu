/**
 * VegasMarquee - Vegas-style marquee frame with chasing bulb lights
 * Creates an animated border with classic incandescent-style chasing lights
 * 
 * OPTIMIZED VERSION:
 * - Shared geometry caching via PropGeometries
 * - Pooled materials with cached color states
 * - Throttled animation updates
 * - Reduced geometry segments
 */

import BaseProp from '../BaseProp';
import { getMaterialManager } from '../PropMaterials';
import { getGeometryManager } from '../PropGeometries';

class VegasMarquee extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.bulbs = [];
        this.framePanels = [];
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
        
        // Animation state cache
        this.bulbStates = [];
        this.lastUpdateTime = 0;
        this.starCenters = [];
        this.starSpikes = [];
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'vegas_marquee';
        
        const {
            width = 30,
            height = 12,
            bulbSpacing = 1.0,
            rows = 2,
            bulbSize = 0.18,
            frameDepth = 0.6
        } = options;
        
        // Create main frame backing - cached materials
        const frameMat = this.matManager.get(0x1a0a2e, { roughness: 0.8, metalness: 0.2 });
        const goldTrimMat = this.matManager.get(0xFFD700, {
            roughness: 0.3,
            metalness: 0.8,
            emissive: 0xFFD700,
            emissiveIntensity: 0.2
        });
        
        const frameThickness = 1.2;
        
        // Top frame - cached geometry
        const topFrameGeo = this.geoManager.get('Box', [width + frameThickness * 2, frameThickness, frameDepth]);
        const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
        topFrame.position.set(0, height / 2 + frameThickness / 2, 0);
        this.addMesh(topFrame, group);
        
        // Bottom frame - reuse geometry
        const bottomFrame = new THREE.Mesh(topFrameGeo, frameMat);
        bottomFrame.position.set(0, -height / 2 - frameThickness / 2, 0);
        this.addMesh(bottomFrame, group);
        
        // Side frames - cached geometry
        const sideFrameGeo = this.geoManager.get('Box', [frameThickness, height, frameDepth]);
        const leftFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        leftFrame.position.set(-width / 2 - frameThickness / 2, 0, 0);
        this.addMesh(leftFrame, group);
        
        const rightFrame = new THREE.Mesh(sideFrameGeo, frameMat);
        rightFrame.position.set(width / 2 + frameThickness / 2, 0, 0);
        this.addMesh(rightFrame, group);
        
        // Gold trim - cached geometries
        const trimThickness = 0.15;
        const trimGeo = this.geoManager.get('Box', [width + 0.2, trimThickness, frameDepth + 0.1]);
        
        const topTrim = new THREE.Mesh(trimGeo, goldTrimMat);
        topTrim.position.set(0, height / 2 + trimThickness / 2, 0.05);
        this.addMesh(topTrim, group);
        
        const bottomTrim = new THREE.Mesh(trimGeo, goldTrimMat);
        bottomTrim.position.set(0, -height / 2 - trimThickness / 2, 0.05);
        this.addMesh(bottomTrim, group);
        
        const sideTrimGeo = this.geoManager.get('Box', [trimThickness, height, frameDepth + 0.1]);
        
        const leftTrim = new THREE.Mesh(sideTrimGeo, goldTrimMat);
        leftTrim.position.set(-width / 2 - trimThickness / 2, 0, 0.05);
        this.addMesh(leftTrim, group);
        
        const rightTrim = new THREE.Mesh(sideTrimGeo, goldTrimMat);
        rightTrim.position.set(width / 2 + trimThickness / 2, 0, 0.05);
        this.addMesh(rightTrim, group);
        
        // Create bulb lights with optimizations
        this.createBulbLights(group, width, height, bulbSpacing, rows, bulbSize, frameThickness);
        
        // Add corner decorations
        this.createCornerStarbursts(group, width, height, frameThickness);
        
        this.setPosition(x, y, z);
        return this;
    }
    
    createBulbLights(group, width, height, spacing, rows, bulbSize, frameOffset) {
        const THREE = this.THREE;
        
        // OPTIMIZED: Only 1 row instead of 2, doubled spacing
        // Single shared geometry for all bulbs - reduced segments
        const bulbGeo = this.geoManager.get('Sphere', [bulbSize, 4, 4]);
        
        // Pre-create bulb color palette materials (6 colors)
        const bulbColors = [0xFFFF00, 0xFF0000, 0x00FF00, 0xFF00FF, 0x00FFFF, 0xFFA500];
        
        let bulbIndex = 0;
        const actualSpacing = spacing * 2; // Double spacing for fewer bulbs
        
        const createBulb = (x, y, rowIndex) => {
            const baseColor = bulbColors[bulbIndex % bulbColors.length];
            
            // Create material (will be modified in animation)
            const bulbMat = new THREE.MeshStandardMaterial({
                color: baseColor,
                emissive: baseColor,
                emissiveIntensity: 0.8,
                roughness: 0.3
            });
            this.materials.push(bulbMat);
            
            const bulb = new THREE.Mesh(bulbGeo, bulbMat);
            bulb.position.set(x, y, 0.35);
            bulb.userData.bulbIndex = bulbIndex;
            bulb.userData.rowIndex = rowIndex;
            bulb.userData.baseColor = baseColor;
            
            group.add(bulb);
            this.meshes.push(bulb);
            this.bulbs.push(bulb);
            
            // Initialize state cache
            this.bulbStates.push({
                isOn: false,
                lastColorUpdate: 0
            });
            
            bulbIndex++;
        };
        
        // OPTIMIZED: Only outer row (skip inner row)
        const hw = width / 2 + frameOffset - 0.3;
        const hh = height / 2 + frameOffset - 0.3;
        
        // Top edge
        for (let bx = -hw; bx <= hw; bx += actualSpacing) {
            createBulb(bx, hh, 0);
        }
        
        // Right edge
        for (let by = hh - actualSpacing; by >= -hh + actualSpacing; by -= actualSpacing) {
            createBulb(hw, by, 0);
        }
        
        // Bottom edge
        for (let bx = hw; bx >= -hw; bx -= actualSpacing) {
            createBulb(bx, -hh, 0);
        }
        
        // Left edge
        for (let by = -hh + actualSpacing; by <= hh - actualSpacing; by += actualSpacing) {
            createBulb(-hw, by, 0);
        }
    }
    
    createCornerStarbursts(group, width, height, frameOffset) {
        const THREE = this.THREE;
        
        // OPTIMIZED: Only top 2 corners instead of all 4
        const corners = [
            { x: -width / 2 - frameOffset, y: height / 2 + frameOffset },
            { x: width / 2 + frameOffset, y: height / 2 + frameOffset }
        ];
        
        // Shared geometries - fewer segments
        const centerGeo = this.geoManager.get('Sphere', [0.35, 6, 6]);
        
        corners.forEach((corner, idx) => {
            // OPTIMIZED: Just center sphere, no spikes (removes ~10 meshes)
            const centerMat = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                emissive: 0xFFFFFF,
                emissiveIntensity: 1.0
            });
            this.materials.push(centerMat);
            
            const center = new THREE.Mesh(centerGeo, centerMat);
            center.position.set(corner.x, corner.y, 0.4);
            center.userData.isStarCenter = true;
            center.userData.cornerIndex = idx;
            group.add(center);
            this.meshes.push(center);
            this.starCenters.push(center);
        });
    }
    
    update(time, delta) {
        // Throttle updates to every 120ms for performance
        if (time - this.lastUpdateTime < 0.12) return;
        this.lastUpdateTime = time;
        
        // OPTIMIZED: Process only 1/4 of bulbs per update (rotate through them)
        const bulbCount = this.bulbs.length;
        const frameOffset = Math.floor(time * 8) % 4;
        
        for (let i = frameOffset; i < bulbCount; i += 4) {
            const bulb = this.bulbs[i];
            const idx = bulb.userData.bulbIndex;
            const state = this.bulbStates[i];
            
            // Simple chase pattern
            const chasePhase = (time * 6 + idx) % 12;
            const isOn = chasePhase < 3;
            
            // Only update if state changed
            if (isOn !== state.isOn) {
                state.isOn = isOn;
                bulb.material.emissiveIntensity = isOn ? 1.0 : 0.3;
            }
        }
        
        // Animate star centers - every update
        this.starCenters.forEach((center, idx) => {
            const pulse = Math.sin(time * 4 + idx * Math.PI) * 0.4 + 0.6;
            center.material.emissiveIntensity = pulse;
        });
    }
}

export default VegasMarquee;
