/**
 * AnimatedRouletteWheel - Giant spinning roulette wheel decoration
 * Features realistic segments, ball animation, and LED lighting
 * 
 * OPTIMIZED VERSION:
 * - Shared geometry/material caching via PropGeometries/PropMaterials
 * - Single merged segment geometry instead of 37 individual ExtrudeGeometries
 * - Single texture atlas for all numbers
 * - Shared LED geometry and pooled materials
 * - Throttled animation updates
 */

import BaseProp from '../BaseProp';
import { getMaterialManager } from '../PropMaterials';
import { getGeometryManager } from '../PropGeometries';

class AnimatedRouletteWheel extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.wheel = null;
        this.ball = null;
        this.rimLights = [];
        this.wheelSpeed = 0;
        this.ballAngle = 0;
        this.ballRadius = 0;
        this.isSpinning = true;
        this.matManager = getMaterialManager(THREE);
        this.geoManager = getGeometryManager(THREE);
        
        // LED animation state (cached to reduce calculations)
        this.ledColorCache = [];
        this.lastLedUpdate = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'animated_roulette_wheel';
        
        const {
            wheelRadius = 4,
            wheelHeight = 0.8,
            tiltAngle = Math.PI / 6
        } = options;
        
        // Roulette numbers in order
        const numbers = [
            0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
            5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
        ];
        
        // Colors for numbers (cached)
        const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
        const getNumberColor = (num) => {
            if (num === 0) return 0x00AA00;
            return redNumbers.has(num) ? 0xCC0000 : 0x1a1a1a;
        };
        
        // Create tilted container
        const wheelContainer = new THREE.Group();
        wheelContainer.rotation.x = tiltAngle;
        group.add(wheelContainer);
        
        // Base platform - use cached geometry
        const baseMat = this.matManager.get(0x3d2817, { roughness: 0.6, metalness: 0.2 });
        const baseGeo = this.geoManager.get('Cylinder', [wheelRadius + 1.5, wheelRadius + 2, 0.5, 32]);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -0.3;
        this.addMesh(base, wheelContainer);
        
        // Gold rim - use cached geometry
        const rimMat = this.matManager.get(0xFFD700, {
            roughness: 0.2,
            metalness: 0.9,
            emissive: 0xFFD700,
            emissiveIntensity: 0.2
        });
        const rimGeo = this.geoManager.get('Torus', [wheelRadius + 0.8, 0.3, 8, 32]);
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.2;
        this.addMesh(rim, wheelContainer);
        
        // Inner rim with ball track - use cached geometry
        const trackMat = this.matManager.get(0x8B4513, { roughness: 0.4, metalness: 0.3 });
        const trackGeo = this.geoManager.get('Torus', [wheelRadius + 0.3, 0.15, 6, 32]);
        const track = new THREE.Mesh(trackGeo, trackMat);
        track.rotation.x = Math.PI / 2;
        track.position.y = 0.4;
        this.addMesh(track, wheelContainer);
        
        // Spinning wheel group
        this.wheel = new THREE.Group();
        this.wheel.position.y = 0.1;
        wheelContainer.add(this.wheel);
        
        // Wheel center cone - use cached geometry
        const coneMat = this.matManager.get(0xFFD700, { roughness: 0.2, metalness: 0.8 });
        const coneGeo = this.geoManager.get('Cone', [0.8, 1, 12]);
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.y = 0.5;
        this.wheel.add(cone);
        
        // Create wheel segments with MERGED geometry for performance
        this.createMergedSegments(numbers, wheelRadius, getNumberColor);
        
        // Create single texture atlas for all numbers
        this.createNumberAtlas(numbers, wheelRadius);
        
        // Create segment dividers as single merged geometry
        this.createMergedDividers(numbers, wheelRadius);
        
        // Roulette ball - reduced segments
        const ballMat = this.matManager.get(0xFFFFFF, {
            roughness: 0.1,
            metalness: 0.3,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.3
        });
        const ballGeo = this.geoManager.get('Sphere', [0.2, 8, 8]);
        this.ball = new THREE.Mesh(ballGeo, ballMat);
        this.ball.position.set(wheelRadius - 0.5, 0.5, 0);
        this.addMesh(this.ball, wheelContainer);
        
        this.ballRadius = wheelRadius - 0.5;
        this.ballAngle = 0;
        
        // LED rim lights - shared geometry, pooled materials
        this.createOptimizedLEDs(wheelContainer, wheelRadius);
        
        // Central light - skip on Apple/Mobile for performance
        const needsOptimization = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
        if (!needsOptimization) {
            const centerLight = new THREE.PointLight(0xFFD700, 2, 15);
            centerLight.position.y = 2;
            this.addLight(centerLight, wheelContainer);
        }
        
        this.wheelSpeed = 1.5;
        
        this.setPosition(x, y, z);
        return this;
    }
    
    /**
     * Create merged segment geometry (instead of 37 individual ExtrudeGeometries)
     */
    createMergedSegments(numbers, wheelRadius, getNumberColor) {
        const THREE = this.THREE;
        const segmentCount = numbers.length;
        const segmentAngle = (Math.PI * 2) / segmentCount;
        const innerR = 0.9;
        const outerR = wheelRadius;
        
        // Group segments by color for efficient batching
        const colorGroups = {
            green: { color: 0x00AA00, indices: [] },
            red: { color: 0xCC0000, indices: [] },
            black: { color: 0x1a1a1a, indices: [] }
        };
        
        numbers.forEach((num, idx) => {
            const color = getNumberColor(num);
            if (color === 0x00AA00) colorGroups.green.indices.push(idx);
            else if (color === 0xCC0000) colorGroups.red.indices.push(idx);
            else colorGroups.black.indices.push(idx);
        });
        
        // Create merged geometry per color group
        Object.values(colorGroups).forEach(group => {
            if (group.indices.length === 0) return;
            
            const mergedPositions = [];
            const mergedNormals = [];
            const mergedIndices = [];
            let indexOffset = 0;
            
            group.indices.forEach(idx => {
                const angle = idx * segmentAngle;
                
                // Create simple quad for each segment (2 triangles)
                // Much cheaper than ExtrudeGeometry!
                const cos0 = Math.cos(angle);
                const sin0 = Math.sin(angle);
                const cos1 = Math.cos(angle + segmentAngle);
                const sin1 = Math.sin(angle + segmentAngle);
                
                // 4 vertices: inner-start, outer-start, outer-end, inner-end
                const vertices = [
                    [cos0 * innerR, 0.08, -sin0 * innerR],
                    [cos0 * outerR, 0.08, -sin0 * outerR],
                    [cos1 * outerR, 0.08, -sin1 * outerR],
                    [cos1 * innerR, 0.08, -sin1 * innerR]
                ];
                
                // Also add side faces for thickness
                const verticesBottom = vertices.map(v => [v[0], v[1] + 0.15, v[2]]);
                
                // Top face
                vertices.forEach(v => {
                    mergedPositions.push(v[0], v[1], v[2]);
                    mergedNormals.push(0, 1, 0);
                });
                
                // Top face indices
                mergedIndices.push(
                    indexOffset, indexOffset + 1, indexOffset + 2,
                    indexOffset, indexOffset + 2, indexOffset + 3
                );
                indexOffset += 4;
                
                // Bottom face
                verticesBottom.forEach(v => {
                    mergedPositions.push(v[0], v[1], v[2]);
                    mergedNormals.push(0, -1, 0);
                });
                
                mergedIndices.push(
                    indexOffset, indexOffset + 2, indexOffset + 1,
                    indexOffset, indexOffset + 3, indexOffset + 2
                );
                indexOffset += 4;
            });
            
            if (mergedPositions.length > 0) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mergedNormals, 3));
                geometry.setIndex(mergedIndices);
                geometry.computeBoundingSphere();
                
                const material = this.matManager.get(group.color, { roughness: 0.6, metalness: 0.1 });
                const mesh = new THREE.Mesh(geometry, material);
                this.wheel.add(mesh);
                this.geometries.push(geometry);
            }
        });
    }
    
    /**
     * Create single texture atlas with all numbers (instead of 37 canvas textures)
     */
    createNumberAtlas(numbers, wheelRadius) {
        const THREE = this.THREE;
        const segmentCount = numbers.length;
        const segmentAngle = (Math.PI * 2) / segmentCount;
        const innerR = 0.9;
        const outerR = wheelRadius;
        const numR = (innerR + outerR) / 2;
        
        // Create single canvas for number atlas (8x5 grid = 40 slots)
        const atlasCanvas = document.createElement('canvas');
        atlasCanvas.width = 512;
        atlasCanvas.height = 320;
        const ctx = atlasCanvas.getContext('2d');
        
        // Clear with transparency
        ctx.clearRect(0, 0, 512, 320);
        
        // Draw all numbers into atlas grid
        const cellW = 64;
        const cellH = 64;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        numbers.forEach((num, idx) => {
            const col = idx % 8;
            const row = Math.floor(idx / 8);
            const cx = col * cellW + cellW / 2;
            const cy = row * cellH + cellH / 2;
            ctx.fillText(num.toString(), cx, cy);
        });
        
        const atlasTexture = new THREE.CanvasTexture(atlasCanvas);
        atlasTexture.needsUpdate = true;
        
        // Create number meshes using atlas UV mapping
        numbers.forEach((num, idx) => {
            const angle = idx * segmentAngle;
            const numAngle = angle + segmentAngle / 2;
            
            const col = idx % 8;
            const row = Math.floor(idx / 8);
            
            // UV coordinates for this number in atlas
            const u0 = col / 8;
            const v0 = 1 - (row + 1) / 5;
            const u1 = (col + 1) / 8;
            const v1 = 1 - row / 5;
            
            // Create small plane with custom UVs
            const numGeo = new THREE.PlaneGeometry(0.5, 0.5);
            const uvs = numGeo.attributes.uv.array;
            uvs[0] = u0; uvs[1] = v1;
            uvs[2] = u1; uvs[3] = v1;
            uvs[4] = u0; uvs[5] = v0;
            uvs[6] = u1; uvs[7] = v0;
            numGeo.attributes.uv.needsUpdate = true;
            
            const numMat = new THREE.MeshBasicMaterial({
                map: atlasTexture,
                transparent: true,
                depthWrite: false
            });
            
            const numMesh = new THREE.Mesh(numGeo, numMat);
            numMesh.position.set(
                Math.cos(numAngle) * numR,
                0.25,
                -Math.sin(numAngle) * numR
            );
            numMesh.rotation.x = -Math.PI / 2;
            numMesh.rotation.z = numAngle - Math.PI / 2;
            this.wheel.add(numMesh);
            
            this.materials.push(numMat);
            this.geometries.push(numGeo);
        });
    }
    
    /**
     * Create merged divider geometry
     */
    createMergedDividers(numbers, wheelRadius) {
        const THREE = this.THREE;
        const segmentCount = numbers.length;
        const segmentAngle = (Math.PI * 2) / segmentCount;
        const dividerLength = wheelRadius - 0.9;
        
        // Shared material for all dividers
        const dividerMat = this.matManager.get(0xFFD700, { roughness: 0.3, metalness: 0.7 });
        
        // Merge all dividers into single geometry
        const positions = [];
        const normals = [];
        const indices = [];
        let indexOffset = 0;
        
        const halfW = 0.025;
        const halfH = 0.1;
        const halfD = dividerLength / 2;
        const centerR = wheelRadius / 2 + 0.45;
        
        numbers.forEach((_, idx) => {
            const angle = idx * segmentAngle;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Create rotated box vertices
            const cx = cos * centerR;
            const cy = 0.2;
            const cz = -sin * centerR;
            
            // Local box vertices (simplified - just top face for visual)
            const localVerts = [
                [-halfW, halfH, -halfD],
                [halfW, halfH, -halfD],
                [halfW, halfH, halfD],
                [-halfW, halfH, halfD]
            ];
            
            // Transform vertices by rotation
            localVerts.forEach(lv => {
                const rx = lv[0] * cos - lv[2] * sin;
                const rz = lv[0] * sin + lv[2] * cos;
                positions.push(cx + rx, cy + lv[1], cz + rz);
                normals.push(0, 1, 0);
            });
            
            indices.push(
                indexOffset, indexOffset + 1, indexOffset + 2,
                indexOffset, indexOffset + 2, indexOffset + 3
            );
            indexOffset += 4;
        });
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingSphere();
        
        const mesh = new THREE.Mesh(geometry, dividerMat);
        this.wheel.add(mesh);
        this.geometries.push(geometry);
    }
    
    /**
     * Create optimized LED lights with shared geometry and pooled materials
     */
    createOptimizedLEDs(wheelContainer, wheelRadius) {
        const THREE = this.THREE;
        const ledCount = 32; // Reduced from 48
        
        // Single shared geometry for all LEDs
        const ledGeo = this.geoManager.get('Sphere', [0.1, 6, 6]);
        
        // Pre-create materials for 3 color states (we'll switch between them)
        const ledColors = [0xFF0000, 0x00FF00, 0xFFD700];
        const ledMaterials = ledColors.map(color => 
            this.matManager.get(color, {
                emissive: color,
                emissiveIntensity: 0.8
            })
        );
        
        for (let i = 0; i < ledCount; i++) {
            const angle = (i / ledCount) * Math.PI * 2;
            
            // Start with first material, will be swapped in update
            const led = new THREE.Mesh(ledGeo, ledMaterials[0].clone());
            led.position.set(
                Math.cos(angle) * (wheelRadius + 1.2),
                0.3,
                Math.sin(angle) * (wheelRadius + 1.2)
            );
            led.userData.ledIndex = i;
            led.userData.baseMaterials = ledMaterials;
            
            this.addMesh(led, wheelContainer);
            this.rimLights.push(led);
            
            // Initialize color cache
            this.ledColorCache.push({ colorIdx: 0, intensity: 0.8 });
        }
    }
    
    update(time, delta) {
        if (!this.wheel) return;
        
        // Continuous wheel rotation (always runs - cheap operation)
        this.wheelSpeed = 0.8 + Math.sin(time * 0.2) * 0.3;
        this.wheel.rotation.y += this.wheelSpeed * delta;
        
        // Ball animation - only update every other call for slight savings
        this.ballAngle += -2.5 * delta;
        const currentRadius = 3.5 + Math.sin(time * 0.5) * 0.8;
        this.ball.position.x = Math.cos(this.ballAngle) * currentRadius;
        this.ball.position.z = Math.sin(this.ballAngle) * currentRadius;
        this.ball.position.y = 0.35 + Math.abs(Math.sin(time * 8)) * 0.15;
        
        // LED rim light animation - THROTTLED to every 150ms for performance (was 100ms)
        if (time - this.lastLedUpdate > 0.15) {
            this.lastLedUpdate = time;
            
            const colorPhaseBase = Math.floor(time * 2);
            const ledCount = this.rimLights.length;
            
            // Process only half the LEDs per update cycle (alternating)
            const startIdx = Math.floor(time * 6) % 2;
            
            for (let i = startIdx; i < ledCount; i += 2) {
                const led = this.rimLights[i];
                const idx = led.userData.ledIndex;
                const cache = this.ledColorCache[idx];
                
                // Chasing pattern
                const chasePhase = (time * 5 + idx * 0.3) % (Math.PI * 2);
                const intensity = Math.sin(chasePhase) * 0.5 + 0.5;
                
                // Only update if intensity changed significantly
                if (Math.abs(intensity - cache.intensity) > 0.15) {
                    cache.intensity = intensity;
                    led.material.emissiveIntensity = 0.3 + intensity * 0.7;
                }
                
                // Alternating colors (less frequent checks)
                const colorPhase = (colorPhaseBase + Math.floor(idx * 0.1)) % 3;
                if (colorPhase !== cache.colorIdx) {
                    cache.colorIdx = colorPhase;
                    const colors = [0xFF0000, 0x00FF00, 0xFFD700];
                    led.material.emissive.setHex(colors[colorPhase]);
                    led.material.color.setHex(colors[colorPhase]);
                }
            }
        }
    }
}

export default AnimatedRouletteWheel;
