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
        
        // Single shared geometry for all bulbs - reduced segments
        const bulbGeo = this.geoManager.get('Sphere', [bulbSize, 6, 6]);
        
        // Pre-create bulb color palette materials (6 colors)
        const bulbColors = [0xFFFF00, 0xFF0000, 0x00FF00, 0xFF00FF, 0x00FFFF, 0xFFA500];
        
        let bulbIndex = 0;
        
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
        
        // Create bulbs for each row
        for (let row = 0; row < rows; row++) {
            const rowOffset = row * 0.5;
            const hw = width / 2 + frameOffset - 0.3 - rowOffset;
            const hh = height / 2 + frameOffset - 0.3 - rowOffset;
            
            // Top edge
            for (let bx = -hw; bx <= hw; bx += spacing) {
                createBulb(bx, hh, row);
            }
            
            // Right edge
            for (let by = hh - spacing; by >= -hh + spacing; by -= spacing) {
                createBulb(hw, by, row);
            }
            
            // Bottom edge
            for (let bx = hw; bx >= -hw; bx -= spacing) {
                createBulb(bx, -hh, row);
            }
            
            // Left edge
            for (let by = -hh + spacing; by <= hh - spacing; by += spacing) {
                createBulb(-hw, by, row);
            }
        }
    }
    
    createCornerStarbursts(group, width, height, frameOffset) {
        const THREE = this.THREE;
        
        const corners = [
            { x: -width / 2 - frameOffset, y: height / 2 + frameOffset },
            { x: width / 2 + frameOffset, y: height / 2 + frameOffset },
            { x: -width / 2 - frameOffset, y: -height / 2 - frameOffset },
            { x: width / 2 + frameOffset, y: -height / 2 - frameOffset }
        ];
        
        // Shared geometries
        const centerGeo = this.geoManager.get('Sphere', [0.3, 8, 8]);
        const spikeGeo = this.geoManager.get('Cone', [0.1, 0.6, 4]);
        
        corners.forEach((corner, idx) => {
            const starGroup = new THREE.Group();
            starGroup.position.set(corner.x, corner.y, 0.4);
            
            // Central bulb - clone material so we can animate it
            const centerMat = new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
                emissive: 0xFFFFFF,
                emissiveIntensity: 1.0
            });
            this.materials.push(centerMat);
            
            const center = new THREE.Mesh(centerGeo, centerMat);
            center.userData.isStarCenter = true;
            center.userData.cornerIndex = idx;
            starGroup.add(center);
            this.starCenters.push(center);
            
            // Radiating spikes - reduced from 8 to 5
            const spikeCount = 5;
            for (let s = 0; s < spikeCount; s++) {
                const angle = (s / spikeCount) * Math.PI * 2;
                
                const spikeMat = new THREE.MeshStandardMaterial({
                    color: 0xFFD700,
                    emissive: 0xFFD700,
                    emissiveIntensity: 0.8
                });
                this.materials.push(spikeMat);
                
                const spike = new THREE.Mesh(spikeGeo, spikeMat);
                spike.position.set(
                    Math.cos(angle) * 0.5,
                    Math.sin(angle) * 0.5,
                    0
                );
                spike.rotation.z = angle - Math.PI / 2;
                spike.userData.spikeIndex = s;
                spike.userData.cornerIndex = idx;
                starGroup.add(spike);
                this.starSpikes.push(spike);
            }
            
            group.add(starGroup);
        });
    }
    
    update(time, delta) {
        // Throttle updates to every 80ms for performance (was 50ms)
        if (time - this.lastUpdateTime < 0.08) return;
        this.lastUpdateTime = time;
        
        // Pre-calculate values used across all bulbs
        const colorUpdateThreshold = Math.floor(time * 2) % 15 === 0; // Less frequent color updates
        
        // Animate chasing bulb lights - only process every 3rd bulb per frame for performance
        // All bulbs still animate, but checks are distributed across frames
        const bulbCount = this.bulbs.length;
        const frameOffset = Math.floor(time * 20) % 3;
        
        for (let i = frameOffset; i < bulbCount; i += 3) {
            const bulb = this.bulbs[i];
            const idx = bulb.userData.bulbIndex;
            const row = bulb.userData.rowIndex;
            const state = this.bulbStates[i];
            
            // Chase speed varies by row
            const chaseSpeed = 8 + row * 3;
            const chasePhase = (time * chaseSpeed + idx) % 16;
            
            // Bulb is "on" for part of the cycle
            const isOn = chasePhase < 4;
            
            // Only update if state changed
            if (isOn !== state.isOn) {
                state.isOn = isOn;
                if (isOn) {
                    bulb.material.emissiveIntensity = 1.0;
                    bulb.scale.setScalar(1.1);
                } else {
                    bulb.material.emissiveIntensity = 0.2;
                    bulb.scale.setScalar(0.9);
                }
            }
            
            // Color cycling - only for row 0 and only occasionally
            if (row === 0 && colorUpdateThreshold) {
                const hue = (time * 0.3 + idx * 0.05) % 1;
                bulb.material.emissive.setHSL(hue, 1, 0.5);
                bulb.material.color.setHSL(hue, 1, 0.5);
            }
        }
        
        // Animate star centers - only every other frame
        if (frameOffset === 0) {
            this.starCenters.forEach((center, idx) => {
                const pulse = Math.sin(time * 6 + idx * Math.PI / 2) * 0.5 + 0.5;
                center.material.emissiveIntensity = 0.6 + pulse * 0.4;
                center.scale.setScalar(1 + pulse * 0.15);
            });
        }
        
        // Animate star spikes - only every other frame (offset from centers)
        if (frameOffset === 1) {
            this.starSpikes.forEach(spike => {
                const sIdx = spike.userData.spikeIndex;
                const cIdx = spike.userData.cornerIndex;
                
                const spikePhase = (time * 4 + sIdx * 0.3 + cIdx) % (Math.PI * 2);
                const spikePulse = Math.sin(spikePhase) * 0.5 + 0.5;
                spike.material.emissiveIntensity = 0.4 + spikePulse * 0.6;
            });
        }
    }
}

export default VegasMarquee;
