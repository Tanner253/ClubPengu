/**
 * PokerChipStack - Decorative stacked poker chips with value markings
 * Creates towering stacks of colorful casino chips
 * 
 * OPTIMIZED VERSION:
 * - Shared geometry caching via PropGeometries
 * - Reduced edge notches (24 → 8 per chip)
 * - Single texture atlas for all chip values
 * - Throttled animations
 */

import BaseProp from '../BaseProp';
import { getMaterialManager } from '../PropMaterials';
import { getGeometryManager } from '../PropGeometries';

class PokerChipStack extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.chips = [];
        this.glowRing = null;
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
        this.lastUpdateTime = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'poker_chip_stack';
        
        const {
            chipCount = 8,
            chipRadius = 0.8,
            chipHeight = 0.15,
            colors = [0xFF0000, 0x0000FF, 0x00AA00, 0x000000, 0xFFD700]
        } = options;
        
        // Shared geometries - created once, reused for all chips
        const chipGeo = this.geoManager.get('Cylinder', [chipRadius, chipRadius, chipHeight, 16]);
        const centerGeo = this.geoManager.get('Cylinder', [chipRadius * 0.5, chipRadius * 0.5, chipHeight + 0.02, 12]);
        const notchGeo = this.geoManager.get('Box', [0.1, chipHeight * 1.1, 0.08]);
        const topGeo = this.geoManager.get('Circle', [chipRadius * 0.48, 12]);
        
        // Shared edge material
        const edgeMat = this.matManager.get(0xFFFFFF, { roughness: 0.5 });
        const centerMat = this.matManager.get(0xFFFFFF, { roughness: 0.3 });
        
        // Create single texture atlas for all chip values
        const valueTexture = this.createValueAtlas(colors);
        
        // Create chips stacked on top of each other
        let currentY = 0;
        
        for (let c = 0; c < chipCount; c++) {
            const chipGroup = new THREE.Group();
            const color = colors[c % colors.length];
            
            // Main chip body - cached geometry, cached material
            const chipMat = this.matManager.get(color, { roughness: 0.4, metalness: 0.2 });
            const chip = new THREE.Mesh(chipGeo, chipMat);
            chipGroup.add(chip);
            
            // Edge pattern - REDUCED from 24 to 8 notches
            const edgeCount = 8;
            for (let e = 0; e < edgeCount; e++) {
                const angle = (e / edgeCount) * Math.PI * 2;
                const notch = new THREE.Mesh(notchGeo, edgeMat);
                notch.position.set(
                    Math.cos(angle) * (chipRadius - 0.03),
                    0,
                    Math.sin(angle) * (chipRadius - 0.03)
                );
                notch.rotation.y = angle;
                chipGroup.add(notch);
            }
            
            // Center value circle - shared geometry and material
            const center = new THREE.Mesh(centerGeo, centerMat);
            chipGroup.add(center);
            
            // Value text on top - use atlas UV mapping
            const colorIndex = colors.indexOf(color);
            const topMat = new THREE.MeshBasicMaterial({
                map: valueTexture,
                transparent: true
            });
            this.materials.push(topMat);
            
            const top = new THREE.Mesh(topGeo, topMat);
            // Set UVs based on color index in atlas
            this.setAtlasUVs(top.geometry, colorIndex, colors.length);
            top.rotation.x = -Math.PI / 2;
            top.position.y = chipHeight / 2 + 0.01;
            chipGroup.add(top);
            
            // Position chip in stack with slight random offset for realism
            const offsetX = (Math.random() - 0.5) * 0.05;
            const offsetZ = (Math.random() - 0.5) * 0.05;
            chipGroup.position.set(offsetX, currentY + chipHeight / 2, offsetZ);
            chipGroup.userData.chipIndex = c;
            chipGroup.userData.baseY = currentY + chipHeight / 2;
            
            this.chips.push(chipGroup);
            group.add(chipGroup);
            
            currentY += chipHeight;
        }
        
        // Add glow ring at base - cached geometry
        const glowMat = this.matManager.get(0xFFD700, {
            emissive: 0xFFD700,
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.8
        });
        
        const glowGeo = this.geoManager.get('Torus', [chipRadius + 0.2, 0.08, 6, 16]);
        this.glowRing = new THREE.Mesh(glowGeo, glowMat.clone());
        this.glowRing.rotation.x = Math.PI / 2;
        this.glowRing.position.y = 0.05;
        this.addMesh(this.glowRing, group);
        
        // Point light above stack - skip on Apple/Mobile for performance
        const needsOptimization = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
        if (!needsOptimization) {
            const stackLight = new THREE.PointLight(0xFFD700, 0.5, 5);
            stackLight.position.y = currentY + 1;
            this.addLight(stackLight, group);
        }
        
        this.setPosition(x, y, z);
        return this;
    }
    
    /**
     * Create a single texture atlas for all chip values
     */
    createValueAtlas(colors) {
        const THREE = this.THREE;
        const cellSize = 128;
        const canvas = document.createElement('canvas');
        canvas.width = cellSize * colors.length;
        canvas.height = cellSize;
        const ctx = canvas.getContext('2d');
        
        const values = { 
            [0xFF0000]: '5', 
            [0x0000FF]: '10', 
            [0x00AA00]: '25', 
            [0x000000]: '100', 
            [0xFFD700]: '500' 
        };
        
        colors.forEach((color, i) => {
            const x = i * cellSize;
            
            // White background circle
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, cellSize / 2, cellSize / 2 - 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Value text
            const value = values[color] || '?';
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 48px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(value, x + cellSize / 2, cellSize / 2);
            
            // Color border
            ctx.strokeStyle = '#' + color.toString(16).padStart(6, '0');
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(x + cellSize / 2, cellSize / 2, cellSize / 2 - 8, 0, Math.PI * 2);
            ctx.stroke();
        });
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }
    
    /**
     * Set UVs to show specific cell from atlas
     */
    setAtlasUVs(geometry, index, total) {
        const uvs = geometry.attributes.uv;
        const u0 = index / total;
        const u1 = (index + 1) / total;
        
        // CircleGeometry has center vertex + ring vertices
        // We need to remap all UVs to the atlas cell
        for (let i = 0; i < uvs.count; i++) {
            const u = uvs.getX(i);
            const v = uvs.getY(i);
            // Remap from [0,1] to [u0, u1]
            uvs.setX(i, u0 + u * (u1 - u0));
        }
        uvs.needsUpdate = true;
    }
    
    update(time, delta) {
        // Throttle to every 100ms
        if (time - this.lastUpdateTime < 0.1) return;
        this.lastUpdateTime = time;
        
        // Subtle chip wobble
        this.chips.forEach((chip) => {
            const idx = chip.userData.chipIndex;
            
            // Gentle floating
            const floatOffset = Math.sin(time * 2 + idx * 0.3) * 0.02;
            chip.position.y = chip.userData.baseY + floatOffset;
            
            // Slight rotation
            chip.rotation.y = Math.sin(time * 0.5 + idx * 0.5) * 0.1;
        });
        
        // Glow ring animation
        if (this.glowRing) {
            const pulse = Math.sin(time * 3) * 0.5 + 0.5;
            this.glowRing.material.emissiveIntensity = 0.4 + pulse * 0.4;
            this.glowRing.material.opacity = 0.5 + pulse * 0.3;
            this.glowRing.scale.setScalar(1 + pulse * 0.1);
        }
    }
}

export default PokerChipStack;
