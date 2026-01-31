/**
 * PenguinBuilder - Creates penguin mesh with all cosmetics and mounts
 * Extracted from VoxelWorld.jsx for better organization
 */

import { VOXEL_SIZE, PALETTE } from '../constants';
import { ASSETS } from '../assets/index';
import { generateBaseBody, generateFlippers, generateFoot, generateHead } from '../generators';
import { 
    MarcusGenerators, 
    MARCUS_PALETTE, 
    WhiteWhaleGenerators, 
    WHITE_WHALE_PALETTE,
    BlackWhaleGenerators,
    BLACK_WHALE_PALETTE,
    SilverWhaleGenerators,
    SILVER_WHALE_PALETTE,
    GoldWhaleGenerators,
    GOLD_WHALE_PALETTE,
    DoginalGenerators,
    DOGINAL_PALETTE,
    DOG_PALETTES,
    generateDogPalette,
    FrogGenerators,
    FROG_PALETTE,
    FROG_PALETTES,
    generateFrogPalette,
    ShrimpGenerators,
    SHRIMP_PALETTE,
    SHRIMP_PALETTES,
    generateShrimpPalette,
    DuckGenerators,
    DUCK_PALETTE,
    TungTungGenerators,
    TUNG_PALETTE,
    GakeGenerators,
    GAKE_PALETTE,
    PumpGenerators,
    PUMP_PALETTE
} from '../characters';

/**
 * Animated skin color configurations
 * Colors shift over time for various effects
 */
export const ANIMATED_SKIN_COLORS = {
    cosmic: {
        // Galaxy with shifting purples, deep blues, and magenta hints
        colors: ['#0B0B45', '#1a0a3e', '#3d1a6e', '#6b2d8b', '#4a1259', '#2a0e4f', '#0B0B45'],
        speed: 0.5,
        emissive: 0.2,
        hasStars: true,
        usePhaseOffsets: true // Each part at different point in cycle
    },
    galaxy: {
        // Darker, more mysterious space feel
        colors: ['#1A0533', '#0a1628', '#2a1055', '#0f0f3f', '#1a0a3e', '#1A0533'],
        speed: 0.4,
        emissive: 0.15,
        hasStars: true,
        usePhaseOffsets: true
    },
    rainbow: {
        // Full spectrum cycling - WHOLE penguin same color
        colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'],
        speed: 0.8,
        emissive: 0.25,
        hasStars: false,
        usePhaseOffsets: false // All parts same color
    },
    prismatic: {
        // Each body part is a DIFFERENT color from the spectrum (like a prism splitting light)
        colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#0088ff', '#8800ff', '#ff00ff'],
        speed: 0.6,
        emissive: 0.3,
        hasStars: false,
        usePhaseOffsets: true, // Each part different color
        phaseMultiplier: 1.2 // Larger offset between parts for more contrast
    },
    nebula: {
        // Purple/violet nebula
        colors: ['#9932CC', '#4B0082', '#8A2BE2', '#9400D3', '#6B238E', '#9932CC'],
        speed: 0.6,
        emissive: 0.2,
        hasStars: true,
        usePhaseOffsets: true
    },
    // ========== NEW ANIMATED SKINS ==========
    lava: {
        // Molten lava - orange/red/black flowing
        colors: ['#FF4500', '#FF6600', '#CC3300', '#8B0000', '#1a0000', '#FF4500'],
        speed: 0.7,
        emissive: 0.4,
        hasStars: false,
        usePhaseOffsets: true
    },
    ocean: {
        // Deep ocean - blue/teal wave ripple
        colors: ['#006994', '#0077B6', '#00B4D8', '#48CAE4', '#90E0EF', '#006994'],
        speed: 0.5,
        emissive: 0.15,
        hasStars: false,
        usePhaseOffsets: true
    },
    sunset: {
        // Warm sunset - orange → pink → purple gradient
        colors: ['#FF6B35', '#F7931A', '#FF5E78', '#C71585', '#9B59B6', '#FF6B35'],
        speed: 0.4,
        emissive: 0.2,
        hasStars: false,
        usePhaseOffsets: true
    },
    frost: {
        // Ice frost - pale blue with white shimmer
        colors: ['#E0FFFF', '#B0E0E6', '#87CEEB', '#ADD8E6', '#F0FFFF', '#E0FFFF'],
        speed: 0.3,
        emissive: 0.25,
        hasStars: true, // Repurpose as ice crystals
        usePhaseOffsets: true
    },
    matrix: {
        // Digital matrix - green code effect
        colors: ['#001100', '#003300', '#00FF00', '#00CC00', '#009900', '#001100'],
        speed: 1.0, // Fast like falling code
        emissive: 0.3,
        hasStars: true, // Repurpose as "code bits"
        usePhaseOffsets: false
    },
    glitch: {
        // RGB glitch - color split effect
        colors: ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00'],
        speed: 0.6, // Slower, more subtle glitch
        emissive: 0.3,
        hasStars: false,
        usePhaseOffsets: false // Uniform glitch
    },
    chromatic: {
        // Metallic chrome - color shifting metal
        colors: ['#C0C0C0', '#A8A8A8', '#D4AF37', '#E6E6FA', '#B8B8B8', '#C0C0C0'],
        speed: 0.6,
        emissive: 0.35,
        hasStars: false,
        usePhaseOffsets: true
    },
    holographic: {
        // Holographic - oily rainbow shimmer
        colors: ['#FF69B4', '#00CED1', '#FFD700', '#9370DB', '#00FA9A', '#FF69B4'],
        speed: 0.4, // Slower, smoother shimmer
        emissive: 0.4,
        hasStars: true, // Sparkle effect
        usePhaseOffsets: true,
        phaseMultiplier: 0.8
    }
};

/**
 * Creates a PenguinBuilder factory with cached materials and geometry
 * @param {Object} THREE - Three.js instance
 * @returns {Object} Builder object with buildPenguinMesh function
 */
export function createPenguinBuilder(THREE) {
    // Material cache - reuse materials for same colors (HUGE performance gain)
    const materialCache = new Map();
    const getMaterial = (color) => {
        // Handle undefined/null
        if (color === undefined || color === null) {
            color = 0x888888; // Default gray
        }
        
        // Handle objects that can't be converted to primitive (prevents "Cannot convert object to primitive value" error)
        if (typeof color === 'object') {
            // If it's a THREE.Color, get its hex value
            if (color.isColor && typeof color.getHex === 'function') {
                color = color.getHex();
            } else if (typeof color.r !== 'undefined' && typeof color.g !== 'undefined' && typeof color.b !== 'undefined') {
                // RGB object - convert to hex
                color = ((color.r * 255) << 16) | ((color.g * 255) << 8) | (color.b * 255);
            } else {
                // Unknown object - use default gray
                console.warn('getMaterial received unknown object type:', color);
                color = 0x888888;
            }
        }
        
        const colorKey = typeof color === 'string' ? color : String(color);
        if (!materialCache.has(colorKey)) {
            materialCache.set(colorKey, new THREE.MeshStandardMaterial({ color }));
        }
        return materialCache.get(colorKey);
    };
    
    // Shared geometry for all voxels
    const sharedVoxelGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    
    /**
     * Build a part from voxels, merged by color into InstancedMeshes
     * @param {Array} voxels - Voxel data
     * @param {Object} palette - Color palette
     * @param {Object} pivot - Pivot point for rotation
     * @param {Object} animatedSkinInfo - Optional: { skinHex, skinConfig, materials[] } for animated skins
     */
    const buildPartMerged = (voxels, palette, pivot, animatedSkinInfo = null) => {
        const g = new THREE.Group();
        
        // Group voxels by color
        const colorGroups = new Map();
        voxels.forEach(v => {
            const colorKey = palette[v.c] || v.c;
            if (!colorGroups.has(colorKey)) {
                colorGroups.set(colorKey, []);
            }
            colorGroups.get(colorKey).push(v);
        });
        
        // Create ONE merged mesh per color
        colorGroups.forEach((colorVoxels, colorKey) => {
            const matrices = [];
            const tempMatrix = new THREE.Matrix4();
            
            colorVoxels.forEach(v => {
                let px = v.x * VOXEL_SIZE;
                let py = v.y * VOXEL_SIZE;
                let pz = v.z * VOXEL_SIZE;
                
                if (pivot) {
                    px -= pivot.x * VOXEL_SIZE;
                    py -= pivot.y * VOXEL_SIZE;
                    pz -= pivot.z * VOXEL_SIZE;
                }
                
                tempMatrix.makeTranslation(px, py, pz);
                if (v.scaleY) {
                    tempMatrix.multiply(new THREE.Matrix4().makeScale(1, v.scaleY, 1));
                }
                matrices.push(tempMatrix.clone());
            });
            
            // Check if this is an animated skin color that needs special material
            let material;
            const isAnimatedSkinColor = animatedSkinInfo && colorKey === animatedSkinInfo.skinHex;
            
            if (isAnimatedSkinColor) {
                // Create unique material for animated skin (not cached - needs to animate)
                material = new THREE.MeshStandardMaterial({ 
                    color: new THREE.Color(colorKey),
                    roughness: 0.3,
                    metalness: 0.1,
                    emissive: new THREE.Color(colorKey),
                    emissiveIntensity: animatedSkinInfo.skinConfig?.emissive || 0.1
                });
                // Add phase offset for multi-color effect (only if usePhaseOffsets is true)
                const useOffsets = animatedSkinInfo.skinConfig?.usePhaseOffsets ?? true;
                const phaseMultiplier = animatedSkinInfo.skinConfig?.phaseMultiplier || 0.7;
                const phaseOffset = useOffsets ? (animatedSkinInfo.materials.length * phaseMultiplier) : 0;
                material.userData = { phaseOffset };
                // Track this material for animation
                animatedSkinInfo.materials.push(material);
            } else {
                material = getMaterial(colorKey);
            }
            
            // Use InstancedMesh for many voxels of same color
            const instancedMesh = new THREE.InstancedMesh(
                sharedVoxelGeo,
                material,
                matrices.length
            );
            matrices.forEach((m, i) => instancedMesh.setMatrixAt(i, m));
            instancedMesh.castShadow = true;
            instancedMesh.instanceMatrix.needsUpdate = true;
            g.add(instancedMesh);
        });
        
        if (pivot) {
            g.position.set(pivot.x * VOXEL_SIZE, pivot.y * VOXEL_SIZE, pivot.z * VOXEL_SIZE);
        }
        
        return g;
    };
    
    /**
     * Add hat with special effects
     */
    const addHat = (group, data) => {
        if (!data.hat || data.hat === 'none' || !ASSETS.HATS[data.hat]) return;
        
        const p = buildPartMerged(ASSETS.HATS[data.hat], PALETTE);
        p.name = 'hat';
        group.add(p);
        
        // Add spinning propeller blades for propeller hat
        if (data.hat === 'propeller') {
            const blades = new THREE.Group();
            blades.name = 'propeller_blades';
            blades.position.set(0, 13 * VOXEL_SIZE, 0);
            const bladeGeo = new THREE.BoxGeometry(4 * VOXEL_SIZE, 0.2 * VOXEL_SIZE, 0.5 * VOXEL_SIZE);
            const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            const b1 = new THREE.Mesh(bladeGeo, bladeMat);
            const b2 = new THREE.Mesh(bladeGeo, bladeMat);
            b2.rotation.y = Math.PI / 2;
            blades.add(b1, b2);
            group.add(blades);
        }
        
        // Flaming Crown - fire particles
        if (data.hat === 'flamingCrown') {
            const fireGroup = new THREE.Group();
            fireGroup.name = 'crown_fire';
            fireGroup.position.set(0, 12 * VOXEL_SIZE, 0);
            
            const particleCount = 15;
            for (let i = 0; i < particleCount; i++) {
                const size = (0.3 + Math.random() * 0.3) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size, size, size);
                const colors = [0xFF4500, 0xFF6600, 0xFFAA00, 0xFFFF00];
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: colors[Math.floor(Math.random() * colors.length)], 
                    transparent: true, 
                    opacity: 0.9 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.position.set(
                    (Math.random() - 0.5) * 3 * VOXEL_SIZE,
                    i * 0.3 * VOXEL_SIZE,
                    (Math.random() - 0.5) * 3 * VOXEL_SIZE
                );
                pMesh.userData.particleIndex = i;
                pMesh.userData.baseY = pMesh.position.y;
                pMesh.userData.baseX = pMesh.position.x;
                pMesh.userData.baseZ = pMesh.position.z;
                fireGroup.add(pMesh);
            }
            fireGroup.userData.isFireEmitter = true;
            group.add(fireGroup);
        }
        
        // Wizard Hat - mark for world-space trail
        if (data.hat === 'wizardHat') {
            group.userData.hasWizardHat = true;
        }
        
        // ========== ANIMATED FEATHERS ==========
        
        // Aurora Feathers - Intense northern lights with trails
        if (data.hat === 'auroraFeathers') {
            const auroraGroup = new THREE.Group();
            auroraGroup.name = 'aurora_particles';
            auroraGroup.position.set(0, 14 * VOXEL_SIZE, -2 * VOXEL_SIZE);
            
            // Main aurora ribbons (larger, more visible)
            const ribbonCount = 8;
            const colors = [0x00FF7F, 0x00CED1, 0x9370DB, 0x00FA9A, 0x48D1CC, 0x7FFFD4];
            for (let i = 0; i < ribbonCount; i++) {
                const size = (0.3 + Math.random() * 0.25) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size * 2, size, size * 0.5);
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: colors[i % colors.length], 
                    transparent: true, 
                    opacity: 0.85 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                const angle = (i / ribbonCount) * Math.PI * 2;
                pMesh.position.set(
                    Math.cos(angle) * 2 * VOXEL_SIZE,
                    i * 0.6 * VOXEL_SIZE,
                    Math.sin(angle) * 1.5 * VOXEL_SIZE - VOXEL_SIZE
                );
                pMesh.userData.isRibbon = true;
                pMesh.userData.angle = angle;
                pMesh.userData.baseY = pMesh.position.y;
                pMesh.userData.speed = 0.8 + Math.random() * 0.4;
                pMesh.userData.phaseOffset = i * 0.5;
                auroraGroup.add(pMesh);
            }
            
            // Trailing sparkle particles
            const trailCount = 25;
            for (let i = 0; i < trailCount; i++) {
                const size = (0.1 + Math.random() * 0.15) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size, size, size);
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: colors[Math.floor(Math.random() * colors.length)], 
                    transparent: true, 
                    opacity: 0.6 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.position.set(
                    (Math.random() - 0.5) * 5 * VOXEL_SIZE,
                    Math.random() * 6 * VOXEL_SIZE,
                    (Math.random() - 0.5) * 4 * VOXEL_SIZE
                );
                pMesh.userData.isTrail = true;
                pMesh.userData.baseY = pMesh.position.y;
                pMesh.userData.baseX = pMesh.position.x;
                pMesh.userData.baseZ = pMesh.position.z;
                pMesh.userData.life = Math.random();
                pMesh.userData.maxLife = 2 + Math.random() * 2;
                pMesh.userData.speed = 1.5 + Math.random();
                auroraGroup.add(pMesh);
            }
            auroraGroup.userData.isAuroraEmitter = true;
            group.add(auroraGroup);
        }
        
        // Crystal Feathers - Brilliant prismatic sparkles with burst effect
        if (data.hat === 'crystalFeathers') {
            const crystalGroup = new THREE.Group();
            crystalGroup.name = 'crystal_particles';
            crystalGroup.position.set(0, 13 * VOXEL_SIZE, -1.5 * VOXEL_SIZE);
            
            // Core crystal shards (larger, more defined)
            const shardCount = 10;
            const shardColors = [0xE0FFFF, 0xFFFFFF, 0xB0E0E6, 0x87CEEB, 0xADD8E6];
            for (let i = 0; i < shardCount; i++) {
                const size = (0.2 + Math.random() * 0.2) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size, size * 1.5, size * 0.3);
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: shardColors[i % shardColors.length], 
                    transparent: true, 
                    opacity: 0.9 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                const angle = (i / shardCount) * Math.PI * 2;
                pMesh.position.set(
                    Math.cos(angle) * 1.5 * VOXEL_SIZE,
                    1 + i * 0.4 * VOXEL_SIZE,
                    Math.sin(angle) * 1 * VOXEL_SIZE
                );
                pMesh.rotation.z = angle;
                pMesh.userData.isShard = true;
                pMesh.userData.angle = angle;
                pMesh.userData.baseY = pMesh.position.y;
                pMesh.userData.twinkleSpeed = 3 + Math.random() * 4;
                pMesh.userData.twinkleOffset = Math.random() * Math.PI * 2;
                crystalGroup.add(pMesh);
            }
            
            // Sparkle burst particles (small, fast moving)
            const sparkleCount = 30;
            for (let i = 0; i < sparkleCount; i++) {
                const size = (0.08 + Math.random() * 0.1) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size, size, size);
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: 0xFFFFFF, 
                    transparent: true, 
                    opacity: 0.7 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 3;
                pMesh.position.set(
                    Math.cos(angle) * radius * VOXEL_SIZE,
                    Math.random() * 5 * VOXEL_SIZE,
                    Math.sin(angle) * radius * VOXEL_SIZE
                );
                pMesh.userData.isSparkle = true;
                pMesh.userData.velocity = {
                    x: (Math.random() - 0.5) * 2,
                    y: 1 + Math.random() * 2,
                    z: (Math.random() - 0.5) * 2
                };
                pMesh.userData.life = Math.random();
                pMesh.userData.maxLife = 1 + Math.random() * 1.5;
                crystalGroup.add(pMesh);
            }
            crystalGroup.userData.isCrystalEmitter = true;
            group.add(crystalGroup);
        }
        
        // Void Feathers - Intense dark vortex with energy tendrils
        if (data.hat === 'voidFeathers') {
            const voidGroup = new THREE.Group();
            voidGroup.name = 'void_particles';
            voidGroup.position.set(0, 14 * VOXEL_SIZE, -2 * VOXEL_SIZE);
            
            // Energy tendrils (larger, more visible)
            const tendrilCount = 6;
            const tendrilColors = [0x8B008B, 0x9400D3, 0x4B0082, 0x800080];
            for (let i = 0; i < tendrilCount; i++) {
                const size = (0.25 + Math.random() * 0.2) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size, size * 2, size * 0.4);
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: tendrilColors[i % tendrilColors.length], 
                    transparent: true, 
                    opacity: 0.85 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                const angle = (i / tendrilCount) * Math.PI * 2;
                pMesh.position.set(
                    Math.cos(angle) * 2 * VOXEL_SIZE,
                    i * 0.7 * VOXEL_SIZE,
                    Math.sin(angle) * 2 * VOXEL_SIZE - VOXEL_SIZE
                );
                pMesh.userData.isTendril = true;
                pMesh.userData.angle = angle;
                pMesh.userData.baseY = pMesh.position.y;
                pMesh.userData.radius = 2;
                pMesh.userData.speed = 1.2 + Math.random() * 0.5;
                voidGroup.add(pMesh);
            }
            
            // Vortex particles (swirling inward)
            const vortexCount = 35;
            for (let i = 0; i < vortexCount; i++) {
                const size = (0.1 + Math.random() * 0.15) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size, size, size);
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: tendrilColors[Math.floor(Math.random() * tendrilColors.length)], 
                    transparent: true, 
                    opacity: 0.7 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                const angle = Math.random() * Math.PI * 2;
                const radius = 1 + Math.random() * 3;
                pMesh.position.set(
                    Math.cos(angle) * radius * VOXEL_SIZE,
                    Math.random() * 6 * VOXEL_SIZE,
                    Math.sin(angle) * radius * VOXEL_SIZE - VOXEL_SIZE
                );
                pMesh.userData.isVortex = true;
                pMesh.userData.angle = angle;
                pMesh.userData.radius = radius;
                pMesh.userData.baseY = pMesh.position.y;
                pMesh.userData.speed = 1.5 + Math.random() * 0.8;
                pMesh.userData.life = Math.random();
                pMesh.userData.spiralSpeed = 0.5 + Math.random() * 0.5;
                voidGroup.add(pMesh);
            }
            voidGroup.userData.isVoidEmitter = true;
            group.add(voidGroup);
        }
    };
    
    /**
     * Add eyes with special effects
     */
    const addEyes = (group, data) => {
        const eyesKey = data.eyes && ASSETS.EYES[data.eyes] ? data.eyes : 'normal';
        if (!ASSETS.EYES[eyesKey]) return;
        
        const p = buildPartMerged(ASSETS.EYES[eyesKey], PALETTE);
        p.name = 'eyes';
        group.add(p);
        
        // Laser eye lights
        if (data.eyes === 'laser') {
            const laserGroup = new THREE.Group();
            laserGroup.name = 'laser_lights';
            
            const lightLeft = new THREE.PointLight(0xff0000, 1, 10);
            lightLeft.position.set(-2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 5 * VOXEL_SIZE);
            lightLeft.name = 'laser_left';
            
            const lightRight = new THREE.PointLight(0xff0000, 1, 10);
            lightRight.position.set(2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 5 * VOXEL_SIZE);
            lightRight.name = 'laser_right';
            
            laserGroup.add(lightLeft, lightRight);
            laserGroup.userData.isLaserEyes = true;
            group.add(laserGroup);
        }
        
        // Fire eyes
        if (data.eyes === 'fire') {
            const fireEyesGroup = new THREE.Group();
            fireEyesGroup.name = 'fire_eyes';
            
            const leftFireGroup = new THREE.Group();
            leftFireGroup.position.set(-2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 4.5 * VOXEL_SIZE);
            
            const rightFireGroup = new THREE.Group();
            rightFireGroup.position.set(2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 4.5 * VOXEL_SIZE);
            
            [leftFireGroup, rightFireGroup].forEach(eyeGroup => {
                for (let i = 0; i < 5; i++) {
                    const size = 0.2 * VOXEL_SIZE;
                    const pGeo = new THREE.BoxGeometry(size, size, size);
                    const colors = [0xFF4500, 0xFF6600, 0xFFAA00];
                    const pMat = new THREE.MeshBasicMaterial({ 
                        color: colors[i % colors.length], 
                        transparent: true, 
                        opacity: 0.9 
                    });
                    const pMesh = new THREE.Mesh(pGeo, pMat);
                    pMesh.position.y = i * 0.15 * VOXEL_SIZE;
                    pMesh.userData.particleIndex = i;
                    pMesh.userData.baseY = pMesh.position.y;
                    eyeGroup.add(pMesh);
                }
            });
            
            const lightLeft = new THREE.PointLight(0xff4500, 0.8, 5);
            lightLeft.position.copy(leftFireGroup.position);
            const lightRight = new THREE.PointLight(0xff4500, 0.8, 5);
            lightRight.position.copy(rightFireGroup.position);
            
            fireEyesGroup.add(leftFireGroup, rightFireGroup, lightLeft, lightRight);
            fireEyesGroup.userData.isFireEyes = true;
            group.add(fireEyesGroup);
        }
    };
    
    /**
     * Add mouth with special effects (smoke, breath, etc.)
     */
    const addMouth = (group, data) => {
        const mouthKey = data.mouth && ASSETS.MOUTH[data.mouth] ? data.mouth : 'beak';
        if (!ASSETS.MOUTH[mouthKey]) return;
        
        const p = buildPartMerged(ASSETS.MOUTH[mouthKey], PALETTE);
        p.name = 'mouth';
        group.add(p);
        
        // Smoke particles for cigarette, pipe, cigar
        if (data.mouth === 'cigarette' || data.mouth === 'pipe' || data.mouth === 'cigar') {
            const smokeGroup = new THREE.Group();
            smokeGroup.name = 'smoke_particles';
            
            const tipX = data.mouth === 'pipe' ? 2 * VOXEL_SIZE : 
                         data.mouth === 'cigar' ? 6 * VOXEL_SIZE : 4.5 * VOXEL_SIZE;
            const tipY = data.mouth === 'pipe' ? 6 * VOXEL_SIZE : 5.5 * VOXEL_SIZE;
            const tipZ = data.mouth === 'pipe' ? 6 * VOXEL_SIZE : 
                         data.mouth === 'cigar' ? 5.6 * VOXEL_SIZE : 5.5 * VOXEL_SIZE;
            smokeGroup.position.set(tipX, tipY, tipZ);
            
            const particleCount = 8;
            for (let i = 0; i < particleCount; i++) {
                const pGeo = new THREE.BoxGeometry(0.3 * VOXEL_SIZE, 0.3 * VOXEL_SIZE, 0.3 * VOXEL_SIZE);
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: 0xaaaaaa, 
                    transparent: true, 
                    opacity: 0.6 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.position.y = i * 0.3 * VOXEL_SIZE;
                pMesh.userData.particleIndex = i;
                pMesh.userData.baseY = pMesh.position.y;
                smokeGroup.add(pMesh);
            }
            
            smokeGroup.userData.isSmokeEmitter = true;
            group.add(smokeGroup);
        }
        
        // Fire Breath
        if (data.mouth === 'fireBreath') {
            const fireGroup = new THREE.Group();
            fireGroup.name = 'breath_fire';
            fireGroup.position.set(0, 5 * VOXEL_SIZE, 5.5 * VOXEL_SIZE);
            
            const particleCount = 20;
            for (let i = 0; i < particleCount; i++) {
                const size = (0.2 + Math.random() * 0.3) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size, size, size);
                const colors = [0xFF4500, 0xFF6600, 0xFFAA00, 0xFFFF00];
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: colors[Math.floor(Math.random() * colors.length)], 
                    transparent: true, 
                    opacity: 0.9 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.position.z = i * 0.5 * VOXEL_SIZE;
                pMesh.userData.particleIndex = i;
                pMesh.userData.baseZ = pMesh.position.z;
                fireGroup.add(pMesh);
            }
            fireGroup.userData.isBreathFire = true;
            group.add(fireGroup);
        }
        
        // Ice Breath
        if (data.mouth === 'iceBreath') {
            const iceGroup = new THREE.Group();
            iceGroup.name = 'breath_ice';
            iceGroup.position.set(0, 5 * VOXEL_SIZE, 5.5 * VOXEL_SIZE);
            
            const particleCount = 20;
            for (let i = 0; i < particleCount; i++) {
                const size = (0.2 + Math.random() * 0.2) * VOXEL_SIZE;
                const pGeo = new THREE.BoxGeometry(size, size, size);
                const colors = [0x87CEEB, 0xADD8E6, 0xE0FFFF, 0xFFFFFF];
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: colors[Math.floor(Math.random() * colors.length)], 
                    transparent: true, 
                    opacity: 0.8 
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.position.z = i * 0.5 * VOXEL_SIZE;
                pMesh.userData.particleIndex = i;
                pMesh.userData.baseZ = pMesh.position.z;
                iceGroup.add(pMesh);
            }
            iceGroup.userData.isBreathIce = true;
            group.add(iceGroup);
        }
        
        // Bubblegum
        if (data.mouth === 'bubblegum') {
            const bubbleGroup = new THREE.Group();
            bubbleGroup.name = 'bubblegum_bubble';
            bubbleGroup.position.set(0, 5 * VOXEL_SIZE, 6 * VOXEL_SIZE);
            
            const bubbleGeo = new THREE.SphereGeometry(0.5 * VOXEL_SIZE, 8, 8);
            const bubbleMat = new THREE.MeshBasicMaterial({ 
                color: 0xFF69B4, 
                transparent: true, 
                opacity: 0.7 
            });
            const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
            bubble.userData.isBubble = true;
            bubbleGroup.add(bubble);
            bubbleGroup.userData.isBubblegum = true;
            group.add(bubbleGroup);
        }
    };
    
    /**
     * Add body item with effects (wings, auras, etc.)
     */
    const addBodyItem = (group, data) => {
        if (!data.bodyItem || data.bodyItem === 'none' || !ASSETS.BODY[data.bodyItem]) return;
        
        const bodyItemInfo = ASSETS.BODY[data.bodyItem];
        const isHideBodyItem = bodyItemInfo?.hideBody === true;
        
        // Only add accessory voxels if it has any
        let accessoryMesh = null;
        if (!isHideBodyItem) {
            const voxels = bodyItemInfo?.voxels || bodyItemInfo || [];
            if (voxels.length > 0) {
                accessoryMesh = buildPartMerged(voxels, PALETTE);
                accessoryMesh.name = 'accessory';
                group.add(accessoryMesh);
            }
            
            // Handle text decal body items
            if (bodyItemInfo?.textDecal) {
                const decal = bodyItemInfo.textDecal;
                const scale = decal.scale || 1;
                
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 128;
                const ctx = canvas.getContext('2d');
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = decal.font || 'bold 32px Arial';
                ctx.fillStyle = decal.color || '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(decal.text, canvas.width / 2, canvas.height / 2);
                
                const texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                
                const planeWidth = 2.5 * scale;
                const planeHeight = 0.6 * scale;
                const planeGeo = new THREE.PlaneGeometry(planeWidth, planeHeight);
                const planeMat = new THREE.MeshBasicMaterial({ 
                    map: texture, 
                    transparent: true,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                const textPlane = new THREE.Mesh(planeGeo, planeMat);
                textPlane.position.set(0, (decal.y || 0) * VOXEL_SIZE, (decal.z || 6) * VOXEL_SIZE);
                textPlane.name = 'text_decal';
                group.add(textPlane);
            }
        }
        
        // Wings flapping
        if ((data.bodyItem === 'angelWings' || data.bodyItem === 'demonWings') && accessoryMesh) {
            accessoryMesh.userData.isWings = true;
            accessoryMesh.userData.wingPhase = Math.random() * Math.PI * 2;
        }
        
        // Fire Aura
        if (data.bodyItem === 'fireAura') {
            const fireAuraGroup = new THREE.Group();
            fireAuraGroup.name = 'fire_aura';
            fireAuraGroup.position.y = 3 * VOXEL_SIZE;
            
            const flameCount = 8;
            for (let i = 0; i < flameCount; i++) {
                const angle = (i / flameCount) * Math.PI * 2;
                const radius = 6 * VOXEL_SIZE;
                
                const flameGeo = new THREE.ConeGeometry(0.8 * VOXEL_SIZE, 3 * VOXEL_SIZE, 8);
                const colors = [0xFF4500, 0xFF6600, 0xFFAA00, 0xFFFF00];
                const flameMat = new THREE.MeshBasicMaterial({ 
                    color: colors[i % colors.length], 
                    transparent: true, 
                    opacity: 0.85 
                });
                const flame = new THREE.Mesh(flameGeo, flameMat);
                flame.position.set(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                );
                flame.userData.isFlame = true;
                flame.userData.baseY = 0;
                flame.userData.angle = angle;
                flame.userData.radius = radius;
                flame.userData.offset = Math.random() * Math.PI * 2;
                fireAuraGroup.add(flame);
            }
            
            const fireLight = new THREE.PointLight(0xFF6600, 1.5, 5);
            fireLight.position.y = 1.5 * VOXEL_SIZE;
            fireAuraGroup.add(fireLight);
            fireAuraGroup.userData.fireLight = fireLight;
            
            fireAuraGroup.userData.isFireAura = true;
            group.add(fireAuraGroup);
        }
        
        // Lightning Aura
        if (data.bodyItem === 'lightningAura') {
            const lightningGroup = new THREE.Group();
            lightningGroup.name = 'lightning_aura';
            lightningGroup.position.y = 3 * VOXEL_SIZE;
            
            const boltCount = 6;
            for (let i = 0; i < boltCount; i++) {
                const angle = (i / boltCount) * Math.PI * 2;
                const radius = 6 * VOXEL_SIZE;
                
                const boltGeo = new THREE.CylinderGeometry(0.15 * VOXEL_SIZE, 0.15 * VOXEL_SIZE, 4 * VOXEL_SIZE, 6);
                const boltMat = new THREE.MeshBasicMaterial({ 
                    color: 0x00FFFF, 
                    transparent: true, 
                    opacity: 0.9 
                });
                const bolt = new THREE.Mesh(boltGeo, boltMat);
                bolt.position.set(
                    Math.cos(angle) * radius,
                    0,
                    Math.sin(angle) * radius
                );
                bolt.rotation.z = Math.random() * 0.5 - 0.25;
                bolt.userData.angle = angle;
                bolt.userData.radius = radius;
                bolt.userData.flickerOffset = Math.random() * Math.PI * 2;
                lightningGroup.add(bolt);
            }
            
            const lightningLight = new THREE.PointLight(0x00FFFF, 1.5, 5);
            lightningLight.position.y = 1.5 * VOXEL_SIZE;
            lightningGroup.add(lightningLight);
            lightningGroup.userData.lightningLight = lightningLight;
            
            lightningGroup.userData.isLightningAura = true;
            group.add(lightningGroup);
        }
    };
    
    /**
     * Add mount (rowboat, etc.)
     */
    const addMount = (wrapper, group, data) => {
        if (!data.mount || data.mount === 'none' || !ASSETS.MOUNTS || !ASSETS.MOUNTS[data.mount]) return;
        
        const mountData = ASSETS.MOUNTS[data.mount];
        
        const mountGroup = new THREE.Group();
        mountGroup.name = 'mount';
        
        // Build mount hull voxels
        if (mountData.voxels && mountData.voxels.length > 0) {
            const mountMesh = buildPartMerged(mountData.voxels, PALETTE);
            mountMesh.name = 'mount_hull';
            mountGroup.add(mountMesh);
        }
        
        // Build animated flippers for pengu mount
        if (mountData.leftFlipper) {
            const leftFlipperMesh = buildPartMerged(mountData.leftFlipper, PALETTE);
            leftFlipperMesh.name = 'left_flipper';
            mountGroup.add(leftFlipperMesh);
        }
        
        if (mountData.rightFlipper) {
            const rightFlipperMesh = buildPartMerged(mountData.rightFlipper, PALETTE);
            rightFlipperMesh.name = 'right_flipper';
            mountGroup.add(rightFlipperMesh);
        }
        
        // Build animated feet for pengu mount
        if (mountData.leftFoot) {
            const leftFootMesh = buildPartMerged(mountData.leftFoot, PALETTE);
            leftFootMesh.name = 'left_foot';
            mountGroup.add(leftFootMesh);
        }
        
        if (mountData.rightFoot) {
            const rightFootMesh = buildPartMerged(mountData.rightFoot, PALETTE);
            rightFootMesh.name = 'right_foot';
            mountGroup.add(rightFootMesh);
        }
        
        // Build animated oars for boat
        if (mountData.leftOar) {
            const leftOarMesh = buildPartMerged(mountData.leftOar, PALETTE);
            leftOarMesh.name = 'left_oar';
            const leftOarPivot = new THREE.Group();
            leftOarPivot.name = 'left_oar_pivot';
            leftOarPivot.position.set(-2.0, 0, 0);
            leftOarPivot.add(leftOarMesh);
            leftOarMesh.position.set(-0.2, 0, 0);
            mountGroup.add(leftOarPivot);
        }
        
        if (mountData.rightOar) {
            const rightOarMesh = buildPartMerged(mountData.rightOar, PALETTE);
            rightOarMesh.name = 'right_oar';
            const rightOarPivot = new THREE.Group();
            rightOarPivot.name = 'right_oar_pivot';
            rightOarPivot.position.set(2.0, 0, 0);
            rightOarPivot.add(rightOarMesh);
            rightOarMesh.position.set(0.2, 0, 0);
            mountGroup.add(rightOarPivot);
        }
        
        // Build skateboard trucks (for grinding animation)
        if (mountData.frontTruck) {
            const frontTruckMesh = buildPartMerged(mountData.frontTruck, PALETTE);
            frontTruckMesh.name = 'front_truck';
            const frontTruckPivot = new THREE.Group();
            frontTruckPivot.name = 'front_truck_pivot';
            frontTruckPivot.add(frontTruckMesh);
            mountGroup.add(frontTruckPivot);
        }
        
        if (mountData.backTruck) {
            const backTruckMesh = buildPartMerged(mountData.backTruck, PALETTE);
            backTruckMesh.name = 'back_truck';
            const backTruckPivot = new THREE.Group();
            backTruckPivot.name = 'back_truck_pivot';
            backTruckPivot.add(backTruckMesh);
            mountGroup.add(backTruckPivot);
        }
        
        // Build shopping cart wheels (for spin animation)
        if (mountData.wheelFL) {
            const wheelMesh = buildPartMerged(mountData.wheelFL, PALETTE);
            wheelMesh.name = 'wheel_fl_mesh';
            const wheelPivot = new THREE.Group();
            wheelPivot.name = 'wheel_fl_pivot';
            wheelPivot.position.set(-7 * VOXEL_SIZE, -2 * VOXEL_SIZE, -8 * VOXEL_SIZE);
            wheelMesh.position.set(7 * VOXEL_SIZE, 2 * VOXEL_SIZE, 8 * VOXEL_SIZE); // Offset to center
            wheelPivot.add(wheelMesh);
            mountGroup.add(wheelPivot);
        }
        if (mountData.wheelFR) {
            const wheelMesh = buildPartMerged(mountData.wheelFR, PALETTE);
            wheelMesh.name = 'wheel_fr_mesh';
            const wheelPivot = new THREE.Group();
            wheelPivot.name = 'wheel_fr_pivot';
            wheelPivot.position.set(7 * VOXEL_SIZE, -2 * VOXEL_SIZE, -8 * VOXEL_SIZE);
            wheelMesh.position.set(-7 * VOXEL_SIZE, 2 * VOXEL_SIZE, 8 * VOXEL_SIZE);
            wheelPivot.add(wheelMesh);
            mountGroup.add(wheelPivot);
        }
        if (mountData.wheelBL) {
            const wheelMesh = buildPartMerged(mountData.wheelBL, PALETTE);
            wheelMesh.name = 'wheel_bl_mesh';
            const wheelPivot = new THREE.Group();
            wheelPivot.name = 'wheel_bl_pivot';
            wheelPivot.position.set(-7 * VOXEL_SIZE, -2 * VOXEL_SIZE, 8 * VOXEL_SIZE);
            wheelMesh.position.set(7 * VOXEL_SIZE, 2 * VOXEL_SIZE, -8 * VOXEL_SIZE);
            wheelPivot.add(wheelMesh);
            mountGroup.add(wheelPivot);
        }
        if (mountData.wheelBR) {
            const wheelMesh = buildPartMerged(mountData.wheelBR, PALETTE);
            wheelMesh.name = 'wheel_br_mesh';
            const wheelPivot = new THREE.Group();
            wheelPivot.name = 'wheel_br_pivot';
            wheelPivot.position.set(7 * VOXEL_SIZE, -2 * VOXEL_SIZE, 8 * VOXEL_SIZE);
            wheelMesh.position.set(-7 * VOXEL_SIZE, 2 * VOXEL_SIZE, -8 * VOXEL_SIZE);
            wheelPivot.add(wheelMesh);
            mountGroup.add(wheelPivot);
        }
        
        // Build puffle tuft (for wiggle animation)
        if (mountData.tuft) {
            const tuftMesh = buildPartMerged(mountData.tuft, PALETTE);
            tuftMesh.name = 'tuft_mesh';
            const tuftPivot = new THREE.Group();
            tuftPivot.name = 'tuft_pivot';
            tuftPivot.position.set(0, 9 * VOXEL_SIZE, 0); // Position at top of puffle
            tuftMesh.position.set(0, -9 * VOXEL_SIZE, 0); // Offset mesh to pivot from base
            tuftPivot.add(tuftMesh);
            mountGroup.add(tuftPivot);
        }
        
        // Build UFO spin ring (for rotation animation)
        if (mountData.spinRing) {
            const ringMesh = buildPartMerged(mountData.spinRing, PALETTE);
            ringMesh.name = 'spin_ring_mesh';
            const ringPivot = new THREE.Group();
            ringPivot.name = 'spin_ring_pivot';
            // Ring rotates around center
            ringPivot.add(ringMesh);
            mountGroup.add(ringPivot);
        }
        
        // Build UFO abduction ray (green cone of light)
        if (mountData.hasAbductionRay) {
            // Create cone geometry pointing downward
            const coneGeom = new THREE.ConeGeometry(0.8, 2.5, 16, 1, true);
            const coneMat = new THREE.MeshBasicMaterial({
                color: 0x00FF00,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const abductionRay = new THREE.Mesh(coneGeom, coneMat);
            abductionRay.name = 'abduction_ray';
            abductionRay.rotation.x = Math.PI; // Point downward
            abductionRay.position.y = -0.6; // Below the UFO
            
            // Add inner brighter core
            const innerConeGeom = new THREE.ConeGeometry(0.4, 2.2, 12, 1, true);
            const innerConeMat = new THREE.MeshBasicMaterial({
                color: 0x44FF44,
                transparent: true,
                opacity: 0.35,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const innerRay = new THREE.Mesh(innerConeGeom, innerConeMat);
            innerRay.name = 'abduction_ray_inner';
            innerRay.rotation.x = Math.PI;
            innerRay.position.y = -0.55;
            
            // Add point light for glow effect
            const rayLight = new THREE.PointLight(0x00FF00, 0.5, 3);
            rayLight.name = 'abduction_light';
            rayLight.position.y = -0.3;
            
            mountGroup.add(abductionRay);
            mountGroup.add(innerRay);
            mountGroup.add(rayLight);
        }
        
        // Build jetpack fire trail particle system
        if (mountData.hasFireTrail) {
            // Create particle geometry for fire/thrust
            const particleCount = 30;
            const particleGeom = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            
            // Initialize particles at exhaust positions
            for (let i = 0; i < particleCount; i++) {
                // Alternate between left and right exhaust
                const side = i % 2 === 0 ? -1 : 1;
                positions[i * 3] = side * 3 * VOXEL_SIZE; // x - left or right tank
                positions[i * 3 + 1] = -7 * VOXEL_SIZE - Math.random() * 0.5; // y - below exhaust
                positions[i * 3 + 2] = 0; // z
                
                // Fire colors: orange to red to yellow
                const colorChoice = Math.random();
                if (colorChoice < 0.4) {
                    colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.3; colors[i * 3 + 2] = 0.0; // Orange
                } else if (colorChoice < 0.7) {
                    colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.1; colors[i * 3 + 2] = 0.0; // Red-orange
                } else {
                    colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.0; // Yellow
                }
                
                sizes[i] = 0.08 + Math.random() * 0.06;
            }
            
            particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            particleGeom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            
            const particleMat = new THREE.PointsMaterial({
                size: 0.1,
                vertexColors: true,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const fireParticles = new THREE.Points(particleGeom, particleMat);
            fireParticles.name = 'fire_trail';
            fireParticles.userData.particleCount = particleCount;
            fireParticles.userData.isFireEmitter = true;
            mountGroup.add(fireParticles);
            
            // Add glow lights at exhausts
            const leftGlow = new THREE.PointLight(0xFF4500, 0.8, 2);
            leftGlow.name = 'exhaust_light_left';
            leftGlow.position.set(-3 * VOXEL_SIZE, -7 * VOXEL_SIZE, 0);
            mountGroup.add(leftGlow);
            
            const rightGlow = new THREE.PointLight(0xFF4500, 0.8, 2);
            rightGlow.name = 'exhaust_light_right';
            rightGlow.position.set(3 * VOXEL_SIZE, -7 * VOXEL_SIZE, 0);
            mountGroup.add(rightGlow);
        }
        
        // Build dragon wings (for flapping animation)
        if (mountData.leftWing) {
            const leftWingMesh = buildPartMerged(mountData.leftWing, PALETTE);
            leftWingMesh.name = 'left_wing_mesh';
            const leftWingPivot = new THREE.Group();
            leftWingPivot.name = 'left_wing_pivot';
            leftWingPivot.position.set(-3 * VOXEL_SIZE, 3 * VOXEL_SIZE, 0); // Pivot at wing joint
            leftWingMesh.position.set(3 * VOXEL_SIZE, -3 * VOXEL_SIZE, 0);  // Offset mesh
            leftWingPivot.add(leftWingMesh);
            mountGroup.add(leftWingPivot);
        }
        
        if (mountData.rightWing) {
            const rightWingMesh = buildPartMerged(mountData.rightWing, PALETTE);
            rightWingMesh.name = 'right_wing_mesh';
            const rightWingPivot = new THREE.Group();
            rightWingPivot.name = 'right_wing_pivot';
            rightWingPivot.position.set(3 * VOXEL_SIZE, 3 * VOXEL_SIZE, 0);  // Pivot at wing joint
            rightWingMesh.position.set(-3 * VOXEL_SIZE, -3 * VOXEL_SIZE, 0); // Offset mesh
            rightWingPivot.add(rightWingMesh);
            mountGroup.add(rightWingPivot);
        }
        
        // Build dragon breath particle system (ice, fire, or void)
        const hasBreath = mountData.hasIceBreath || mountData.hasFireBreath || mountData.hasVoidBreath;
        if (hasBreath) {
            const isBaby = data.mount && data.mount.startsWith('baby');
            const particleCount = isBaby ? 25 : 50;
            const particleGeom = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            
            // Mouth position (smaller for baby dragons)
            const mouthZ = isBaby ? -12 : -16;
            const mouthY = isBaby ? 2 : 1.5;
            
            // Determine breath type and colors
            let breathType = 'ice';
            let glowColor = 0x00FFFF;
            if (mountData.hasFireBreath) { breathType = 'fire'; glowColor = 0xFF4500; }
            if (mountData.hasVoidBreath) { breathType = 'void'; glowColor = 0x9B59B6; }
            
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 0.2;
                positions[i * 3 + 1] = mouthY * VOXEL_SIZE;
                positions[i * 3 + 2] = mouthZ * VOXEL_SIZE - Math.random() * 0.4;
                
                // Colors based on breath type
                const colorChoice = Math.random();
                if (breathType === 'ice') {
                    if (colorChoice < 0.3) { colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; }
                    else if (colorChoice < 0.6) { colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1.0; }
                    else { colors[i * 3] = 0.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; }
                } else if (breathType === 'fire') {
                    if (colorChoice < 0.3) { colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 0.0; } // Yellow
                    else if (colorChoice < 0.6) { colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.5; colors[i * 3 + 2] = 0.0; } // Orange
                    else { colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 0.0; } // Red
                } else { // void
                    if (colorChoice < 0.3) { colors[i * 3] = 0.9; colors[i * 3 + 1] = 0.3; colors[i * 3 + 2] = 1.0; } // Pink-purple
                    else if (colorChoice < 0.6) { colors[i * 3] = 0.6; colors[i * 3 + 1] = 0.2; colors[i * 3 + 2] = 0.8; } // Purple
                    else { colors[i * 3] = 0.2; colors[i * 3 + 1] = 0.0; colors[i * 3 + 2] = 0.3; } // Dark void
                }
                
                sizes[i] = (isBaby ? 0.05 : 0.08) + Math.random() * 0.06;
            }
            
            particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particleGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            particleGeom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            
            const particleMat = new THREE.PointsMaterial({
                size: isBaby ? 0.08 : 0.12,
                vertexColors: true,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            
            const breathParticles = new THREE.Points(particleGeom, particleMat);
            breathParticles.name = 'dragon_breath';
            breathParticles.userData.particleCount = particleCount;
            breathParticles.userData.breathType = breathType;
            breathParticles.userData.mouthZ = mouthZ;
            breathParticles.userData.mouthY = mouthY;
            mountGroup.add(breathParticles);
            
            // Add breath glow at mouth
            const breathGlow = new THREE.PointLight(glowColor, isBaby ? 0.6 : 1.0, isBaby ? 2 : 4);
            breathGlow.name = 'breath_glow';
            breathGlow.position.set(0, mouthY * VOXEL_SIZE, (mouthZ + 1) * VOXEL_SIZE);
            mountGroup.add(breathGlow);
            
            // Add eye glows
            const eyeZ = isBaby ? -8 : -11;
            const eyeY = isBaby ? 3 : 4;
            const leftEyeGlow = new THREE.PointLight(glowColor, 0.4, 1.5);
            leftEyeGlow.name = 'left_eye_glow';
            leftEyeGlow.position.set(-3 * VOXEL_SIZE, eyeY * VOXEL_SIZE, eyeZ * VOXEL_SIZE);
            mountGroup.add(leftEyeGlow);
            
            const rightEyeGlow = new THREE.PointLight(glowColor, 0.4, 1.5);
            rightEyeGlow.name = 'right_eye_glow';
            rightEyeGlow.position.set(3 * VOXEL_SIZE, eyeY * VOXEL_SIZE, eyeZ * VOXEL_SIZE);
            mountGroup.add(rightEyeGlow);
        }
        
        // Use mount-specific scale if defined, otherwise default 0.2
        const mountScale = mountData.scale || 0.2;
        mountGroup.scale.set(mountScale, mountScale, mountScale);
        mountGroup.position.y = mountData.positionY ?? 0.4;
        
        // Apply mount rotation if specified (e.g., shopping cart faces backward)
        if (mountData.mountRotation) {
            mountGroup.rotation.y = mountData.mountRotation;
        }
        
        wrapper.add(mountGroup);
        
        wrapper.userData.mount = data.mount;
        wrapper.userData.mountData = mountData;
        wrapper.userData.isMounted = true;
    };
    
    /**
     * Build Marcus (special character) mesh
     */
    const buildMarcusMesh = (data) => {
        const group = new THREE.Group();
        const pivots = MarcusGenerators.pivots();
        
        const headVoxels = MarcusGenerators.head();
        const head = buildPartMerged(headVoxels, MARCUS_PALETTE);
        head.name = 'head';
        
        const bodyVoxels = MarcusGenerators.body();
        const body = buildPartMerged(bodyVoxels, MARCUS_PALETTE);
        body.name = 'body';
        
        const armLVoxels = MarcusGenerators.armLeft();
        const armL = buildPartMerged(armLVoxels, MARCUS_PALETTE, pivots.armLeft);
        armL.name = 'flipper_l';
        
        const armRVoxels = MarcusGenerators.armRight();
        const armR = buildPartMerged(armRVoxels, MARCUS_PALETTE, pivots.armRight);
        armR.name = 'flipper_r';
        
        const legLVoxels = MarcusGenerators.legLeft();
        const legL = buildPartMerged(legLVoxels, MARCUS_PALETTE, pivots.legLeft);
        legL.name = 'foot_l';
        
        const legRVoxels = MarcusGenerators.legRight();
        const legR = buildPartMerged(legRVoxels, MARCUS_PALETTE, pivots.legRight);
        legR.name = 'foot_r';
        
        group.add(body, head, armL, armR, legL, legR);
        group.scale.set(0.18, 0.18, 0.18);
        group.position.y = 0.8;
        
        return group;
    };
    
    /**
     * Build Doginal (dog character) mesh with hat support
     */
    const buildDoginalMesh = (data) => {
        const group = new THREE.Group();
        const pivots = DoginalGenerators.pivots();
        
        // Use freestyle colors if provided, otherwise default golden
        const primaryColor = data.dogPrimaryColor || '#D4A04A';
        const secondaryColor = data.dogSecondaryColor || '#F0D890';
        const dogPalette = generateDogPalette(primaryColor, secondaryColor);
        
        const headVoxels = DoginalGenerators.head();
        const head = buildPartMerged(headVoxels, dogPalette);
        head.name = 'head';
        
        const bodyVoxels = DoginalGenerators.body();
        const body = buildPartMerged(bodyVoxels, dogPalette);
        body.name = 'body';
        
        const armLVoxels = DoginalGenerators.armLeft();
        const armL = buildPartMerged(armLVoxels, dogPalette, pivots.armLeft);
        armL.name = 'flipper_l';
        
        const armRVoxels = DoginalGenerators.armRight();
        const armR = buildPartMerged(armRVoxels, dogPalette, pivots.armRight);
        armR.name = 'flipper_r';
        
        const legLVoxels = DoginalGenerators.legLeft();
        const legL = buildPartMerged(legLVoxels, dogPalette, pivots.legLeft);
        legL.name = 'foot_l';
        
        const legRVoxels = DoginalGenerators.legRight();
        const legR = buildPartMerged(legRVoxels, dogPalette, pivots.legRight);
        legR.name = 'foot_r';
        
        // Animated tail
        const tailVoxels = DoginalGenerators.tail();
        const tail = buildPartMerged(tailVoxels, dogPalette, pivots.tail);
        tail.name = 'tail';
        
        // Animated ears
        const earLVoxels = DoginalGenerators.earLeft();
        const earL = buildPartMerged(earLVoxels, dogPalette, pivots.earLeft);
        earL.name = 'ear_l';
        
        const earRVoxels = DoginalGenerators.earRight();
        const earR = buildPartMerged(earRVoxels, dogPalette, pivots.earRight);
        earR.name = 'ear_r';
        
        group.add(body, head, armL, armR, legL, legR, tail, earL, earR);
        
        // Doginal ALWAYS wears wizard hat - use proper hat system with effects!
        // Create modified data to pass to addHat, but offset the voxels for dog head
        const wizardHatVoxels = ASSETS.HATS['wizardHat'];
        if (wizardHatVoxels && wizardHatVoxels.length > 0) {
            // Offset hat voxels to sit on dog's head (Y+3 for head height, Z+3 for head forward offset)
            const offsetHatVoxels = wizardHatVoxels.map(v => ({ ...v, y: v.y + 3, z: v.z + 3 }));
            const hat = buildPartMerged(offsetHatVoxels, PALETTE);
            hat.name = 'hat';
            group.add(hat);
            
            // Set up wizard hat flag for magic trail animations (same as addHat does)
            group.userData.hasWizardHat = true;
        }
        
        // Add body item (trenchcoat, etc.) - offset for dog body position
        if (data.bodyItem && data.bodyItem !== 'none' && ASSETS.BODY[data.bodyItem]) {
            const bodyItemData = ASSETS.BODY[data.bodyItem];
            const bodyItemVoxels = bodyItemData?.voxels || bodyItemData || [];
            if (bodyItemVoxels.length > 0) {
                // Offset body item voxels for dog body (Y_OFFSET=4, so adjust by -4 from penguin position)
                const offsetBodyVoxels = bodyItemVoxels.map(v => ({ ...v, y: v.y - 4 }));
                const bodyItemMesh = buildPartMerged(offsetBodyVoxels, PALETTE);
                bodyItemMesh.name = 'bodyItem';
                group.add(bodyItemMesh);
            }
        }
        
        group.scale.set(0.18, 0.18, 0.18);
        group.position.y = 0.8;
        
        return group;
    };
    
    /**
     * Build Frog (PEPE character) mesh with cosmetics support
     */
    const buildFrogMesh = (data) => {
        const group = new THREE.Group();
        const pivots = FrogGenerators.pivots();
        
        // Use freestyle colors if provided, otherwise default green
        const primaryColor = data.frogPrimaryColor || '#4A8C4A';
        const secondaryColor = data.frogSecondaryColor || '#B8C8B0';
        const frogPalette = generateFrogPalette(primaryColor, secondaryColor);
        
        // Frog head
        const headVoxels = FrogGenerators.head();
        const head = buildPartMerged(headVoxels, frogPalette);
        head.name = 'head';
        
        // Frog body (penguin-style but green)
        const bodyVoxels = FrogGenerators.body();
        const body = buildPartMerged(bodyVoxels, frogPalette);
        body.name = 'body';
        
        // Flippers (green frog arms)
        const flipperLVoxels = FrogGenerators.flipperLeft();
        const flipperL = buildPartMerged(flipperLVoxels, frogPalette, pivots.flipperLeft);
        flipperL.name = 'flipper_l';
        
        const flipperRVoxels = FrogGenerators.flipperRight();
        const flipperR = buildPartMerged(flipperRVoxels, frogPalette, pivots.flipperRight);
        flipperR.name = 'flipper_r';
        
        // Orange webbed feet
        const footLVoxels = FrogGenerators.footLeft();
        const footL = buildPartMerged(footLVoxels, frogPalette, pivots.footLeft);
        footL.name = 'foot_l';
        
        const footRVoxels = FrogGenerators.footRight();
        const footR = buildPartMerged(footRVoxels, frogPalette, pivots.footRight);
        footR.name = 'foot_r';
        
        group.add(body, head, flipperL, flipperR, footL, footR);
        
        // Add hat support - offset voxels to sit on frog's head
        if (data.hat && data.hat !== 'none' && ASSETS.HATS[data.hat]) {
            const hatVoxels = ASSETS.HATS[data.hat];
            if (hatVoxels && hatVoxels.length > 0) {
                // Offset hat voxels to sit on frog's head (Y+1 for head height, Z+2 for head forward offset)
                // Lowered by 1 voxel from Y+2 to Y+1 for better fit
                const offsetHatVoxels = hatVoxels.map(v => ({ ...v, y: v.y + 1, z: v.z + 2 }));
                const hat = buildPartMerged(offsetHatVoxels, PALETTE);
                hat.name = 'hat';
                group.add(hat);
                
                // Add propeller blades for propeller hat
                if (data.hat === 'propeller') {
                    const blades = new THREE.Group();
                    blades.name = 'propeller_blades';
                    blades.position.set(0, 15 * VOXEL_SIZE, 2 * VOXEL_SIZE);
                    const bladeGeo = new THREE.BoxGeometry(4 * VOXEL_SIZE, 0.2 * VOXEL_SIZE, 0.5 * VOXEL_SIZE);
                    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                    const b1 = new THREE.Mesh(bladeGeo, bladeMat);
                    const b2 = new THREE.Mesh(bladeGeo, bladeMat);
                    b2.rotation.y = Math.PI / 2;
                    blades.add(b1, b2);
                    group.add(blades);
                }
                
                // Wizard hat magic trail
                if (data.hat === 'wizardHat') {
                    group.userData.hasWizardHat = true;
                }
                
                // Flaming Crown fire particles
                if (data.hat === 'flamingCrown') {
                    const fireGroup = new THREE.Group();
                    fireGroup.name = 'crown_fire';
                    fireGroup.position.set(0, 14 * VOXEL_SIZE, 2 * VOXEL_SIZE);
                    
                    const particleCount = 15;
                    for (let i = 0; i < particleCount; i++) {
                        const size = (0.3 + Math.random() * 0.3) * VOXEL_SIZE;
                        const pGeo = new THREE.BoxGeometry(size, size, size);
                        const colors = [0xFF4500, 0xFF6600, 0xFFAA00, 0xFFFF00];
                        const pMat = new THREE.MeshBasicMaterial({ 
                            color: colors[Math.floor(Math.random() * colors.length)], 
                            transparent: true, 
                            opacity: 0.9 
                        });
                        const pMesh = new THREE.Mesh(pGeo, pMat);
                        pMesh.position.set(
                            (Math.random() - 0.5) * 3 * VOXEL_SIZE,
                            i * 0.3 * VOXEL_SIZE,
                            (Math.random() - 0.5) * 3 * VOXEL_SIZE
                        );
                        pMesh.userData.particleIndex = i;
                        pMesh.userData.baseY = pMesh.position.y;
                        pMesh.userData.baseX = pMesh.position.x;
                        pMesh.userData.baseZ = pMesh.position.z;
                        fireGroup.add(pMesh);
                    }
                    fireGroup.userData.isFireEmitter = true;
                    group.add(fireGroup);
                }
            }
        }
        
        // Add body item support - offset for frog body position
        if (data.bodyItem && data.bodyItem !== 'none' && ASSETS.BODY[data.bodyItem]) {
            const bodyItemData = ASSETS.BODY[data.bodyItem];
            const bodyItemVoxels = bodyItemData?.voxels || bodyItemData || [];
            if (bodyItemVoxels.length > 0) {
                // Raise clothing by 2 voxels on Y axis for better fit on frog
                // Changed from y: v.y - 4 to y: v.y - 2 (raised by 2 voxels)
                const offsetBodyVoxels = bodyItemVoxels.map(v => ({ ...v, y: v.y - 2 }));
                const bodyItemMesh = buildPartMerged(offsetBodyVoxels, PALETTE);
                bodyItemMesh.name = 'bodyItem';
                group.add(bodyItemMesh);
            }
        }
        
        group.scale.set(0.18, 0.18, 0.18);
        group.position.y = 0.8;
        
        return group;
    };
    
    /**
     * Build Shrimp character mesh with tail flappers and antennae
     */
    const buildShrimpMesh = (data) => {
        const group = new THREE.Group();
        const pivots = ShrimpGenerators.pivots();
        
        // Use shrimpPrimaryColor first, then fall back to skin-based palette
        let shrimpPalette;
        
        if (data.shrimpPrimaryColor) {
            // Generate palette from custom color
            shrimpPalette = generateShrimpPalette(data.shrimpPrimaryColor);
        } else if (SHRIMP_PALETTES[data.skin]) {
            // Use named palette if skin matches
            shrimpPalette = SHRIMP_PALETTES[data.skin];
        } else if (data.skin && PALETTE[data.skin]) {
            // Generate palette from penguin skin color
            shrimpPalette = generateShrimpPalette(PALETTE[data.skin]);
        } else {
            shrimpPalette = SHRIMP_PALETTE; // Default orange
        }
        
        // Shrimp head with antennae and eye stalks
        const headVoxels = ShrimpGenerators.head();
        const head = buildPartMerged(headVoxels, shrimpPalette);
        head.name = 'head';
        
        // Shrimp body (segmented)
        const bodyVoxels = ShrimpGenerators.body();
        const body = buildPartMerged(bodyVoxels, shrimpPalette);
        body.name = 'body';
        
        // Arms/claws (flipper position for cosmetic compatibility)
        const armLVoxels = ShrimpGenerators.flipperLeft();
        const armL = buildPartMerged(armLVoxels, shrimpPalette, pivots.flipperLeft);
        armL.name = 'flipper_l';
        
        const armRVoxels = ShrimpGenerators.flipperRight();
        const armR = buildPartMerged(armRVoxels, shrimpPalette, pivots.flipperRight);
        armR.name = 'flipper_r';
        
        // Tail fan (the distinctive shrimp tail flappers!)
        const tailVoxels = ShrimpGenerators.tail();
        const tail = buildPartMerged(tailVoxels, shrimpPalette, pivots.tail);
        tail.name = 'tail';
        tail.userData.isTailFlapper = true; // For animation
        
        // Walking legs
        const legsVoxels = ShrimpGenerators.legs();
        const legs = buildPartMerged(legsVoxels, shrimpPalette);
        legs.name = 'legs';
        
        group.add(body, head, armL, armR, tail, legs);
        
        // Add hat support (no eyes/mouth for shrimp - has own eye stalks and rostrum)
        if (data.hat && data.hat !== 'none' && ASSETS.HATS[data.hat]) {
            const hatVoxels = ASSETS.HATS[data.hat];
            if (hatVoxels && hatVoxels.length > 0) {
                // Offset hat: Y+2, Z+2 (raised by 3 from -1, pushed back toward tail)
                const offsetHatVoxels = hatVoxels.map(v => ({ ...v, y: v.y + 2, z: v.z + 2 }));
                const hat = buildPartMerged(offsetHatVoxels, PALETTE);
                hat.name = 'hat';
                group.add(hat);
                
                // Propeller hat blades
                if (data.hat === 'propeller') {
                    const blades = new THREE.Group();
                    blades.name = 'propeller_blades';
                    blades.position.set(0, 16 * VOXEL_SIZE, 2 * VOXEL_SIZE);
                    const bladeGeo = new THREE.BoxGeometry(4 * VOXEL_SIZE, 0.2 * VOXEL_SIZE, 0.5 * VOXEL_SIZE);
                    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                    const b1 = new THREE.Mesh(bladeGeo, bladeMat);
                    const b2 = new THREE.Mesh(bladeGeo, bladeMat);
                    b2.rotation.y = Math.PI / 2;
                    blades.add(b1, b2);
                    group.add(blades);
                }
                
                if (data.hat === 'wizardHat') {
                    group.userData.hasWizardHat = true;
                }
            }
        }
        
        // Add body item support
        if (data.bodyItem && data.bodyItem !== 'none' && ASSETS.BODY[data.bodyItem]) {
            const bodyItemData = ASSETS.BODY[data.bodyItem];
            const bodyItemVoxels = bodyItemData?.voxels || bodyItemData || [];
            if (bodyItemVoxels.length > 0) {
                // Offset clothing for shrimp body: Y-2 (raised by 3 from -5)
                const offsetBodyVoxels = bodyItemVoxels.map(v => ({ ...v, y: v.y - 2 }));
                const bodyItemMesh = buildPartMerged(offsetBodyVoxels, PALETTE);
                bodyItemMesh.name = 'bodyItem';
                group.add(bodyItemMesh);
            }
        }
        
        group.scale.set(0.18, 0.18, 0.18);
        group.position.y = 0.8;
        
        // Mark as shrimp for tail animation
        group.userData.isShrimp = true;
        
        return group;
    };
    
    /**
     * Build Duck character mesh with orange bill and wings
     */
    const buildDuckMesh = (data) => {
        const group = new THREE.Group();
        const pivots = DuckGenerators.pivots();
        
        // Duck uses fixed yellow palette
        const duckPalette = DUCK_PALETTE;
        
        // Duck head with bill
        const headVoxels = DuckGenerators.head();
        const head = buildPartMerged(headVoxels, duckPalette);
        head.name = 'head';
        
        // Duck body
        const bodyVoxels = DuckGenerators.body();
        const body = buildPartMerged(bodyVoxels, duckPalette);
        body.name = 'body';
        
        // Wings (like flippers)
        const wingLVoxels = DuckGenerators.armLeft();
        const wingL = buildPartMerged(wingLVoxels, duckPalette, pivots.armLeft);
        wingL.name = 'flipper_l';
        
        const wingRVoxels = DuckGenerators.armRight();
        const wingR = buildPartMerged(wingRVoxels, duckPalette, pivots.armRight);
        wingR.name = 'flipper_r';
        
        // Orange webbed feet
        const footLVoxels = DuckGenerators.legLeft();
        const footL = buildPartMerged(footLVoxels, duckPalette, pivots.legLeft);
        footL.name = 'foot_l';
        
        const footRVoxels = DuckGenerators.legRight();
        const footR = buildPartMerged(footRVoxels, duckPalette, pivots.legRight);
        footR.name = 'foot_r';
        
        // Tail (separate for animation - wagging!)
        const tailVoxels = DuckGenerators.tail();
        const tail = buildPartMerged(tailVoxels, duckPalette, pivots.tail);
        tail.name = 'tail';
        
        group.add(body, head, wingL, wingR, footL, footR, tail);
        
        // Add hat support - raised by 5 for duck head height
        if (data.hat && data.hat !== 'none' && ASSETS.HATS[data.hat]) {
            const hatVoxels = ASSETS.HATS[data.hat];
            if (hatVoxels && hatVoxels.length > 0) {
                // Offset hat voxels up by 5 for duck's taller head
                const offsetHatVoxels = hatVoxels.map(v => ({ ...v, y: v.y + 5 }));
                const hat = buildPartMerged(offsetHatVoxels, PALETTE);
                hat.name = 'hat';
                group.add(hat);
                
                // Propeller hat blades - also raised
                if (data.hat === 'propeller') {
                    const blades = new THREE.Group();
                    blades.name = 'propeller_blades';
                    blades.position.set(0, 17 * VOXEL_SIZE, 0);  // 12 + 5 = 17
                    const bladeGeo = new THREE.BoxGeometry(4 * VOXEL_SIZE, 0.2 * VOXEL_SIZE, 0.5 * VOXEL_SIZE);
                    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
                    const b1 = new THREE.Mesh(bladeGeo, bladeMat);
                    const b2 = new THREE.Mesh(bladeGeo, bladeMat);
                    b2.rotation.y = Math.PI / 2;
                    blades.add(b1, b2);
                    group.add(blades);
                }
                
                if (data.hat === 'wizardHat') {
                    group.userData.hasWizardHat = true;
                }
            }
        }
        
        // Add body item support
        if (data.bodyItem && data.bodyItem !== 'none' && ASSETS.BODY[data.bodyItem]) {
            const bodyItemData = ASSETS.BODY[data.bodyItem];
            const bodyItemVoxels = bodyItemData?.voxels || bodyItemData || [];
            if (bodyItemVoxels.length > 0) {
                const bodyItemMesh = buildPartMerged(bodyItemVoxels, PALETTE);
                bodyItemMesh.name = 'bodyItem';
                group.add(bodyItemMesh);
            }
        }
        
        group.scale.set(0.2, 0.2, 0.2);
        group.position.y = 0.8;
        
        // Mark as duck for animations
        group.userData.isDuck = true;
        
        return group;
    };
    
    /**
     * Build Tung Tung Tung Sahur (tall cylindrical log creature with bat)
     */
    const buildTungTungMesh = (data) => {
        const group = new THREE.Group();
        const pivots = TungTungGenerators.pivots();
        
        // Head - upper half of cylinder (y=10-20)
        const headVoxels = TungTungGenerators.head();
        const head = buildPartMerged(headVoxels, TUNG_PALETTE, pivots.head);
        head.name = 'head';
        
        // Body - lower half of cylinder (y=0-10)
        const bodyVoxels = TungTungGenerators.body();
        const body = buildPartMerged(bodyVoxels, TUNG_PALETTE, pivots.body);
        body.name = 'body';
        
        // Arms (right arm has the baseball bat built in)
        const armLVoxels = TungTungGenerators.armLeft();
        const armL = buildPartMerged(armLVoxels, TUNG_PALETTE, pivots.armLeft);
        armL.name = 'flipper_l';
        
        const armRVoxels = TungTungGenerators.armRight();
        const armR = buildPartMerged(armRVoxels, TUNG_PALETTE, pivots.armRight);
        armR.name = 'flipper_r';
        
        // Legs
        const legLVoxels = TungTungGenerators.legLeft();
        const legL = buildPartMerged(legLVoxels, TUNG_PALETTE, pivots.legLeft);
        legL.name = 'foot_l';
        
        const legRVoxels = TungTungGenerators.legRight();
        const legR = buildPartMerged(legRVoxels, TUNG_PALETTE, pivots.legRight);
        legR.name = 'foot_r';
        
        group.add(head, body, armL, armR, legL, legR);
        
        // Add eyes - offset for tall cylinder (face is on head, upper half)
        // Head is y=15-30, face around y=27-29, standard eyes at y=6-8, offset +21
        if (data.eyes && data.eyes !== 'none' && ASSETS.EYES[data.eyes]) {
            const eyeVoxels = ASSETS.EYES[data.eyes];
            const offsetEyeVoxels = eyeVoxels.map(v => ({ ...v, y: v.y + 8, z: v.z + 1 }));
            const eyesMesh = buildPartMerged(offsetEyeVoxels, PALETTE);
            eyesMesh.name = 'eyes';
            group.add(eyesMesh);
        }
        
        // Add mouth - offset for tall cylinder
        if (data.mouth && data.mouth !== 'none' && ASSETS.MOUTH[data.mouth]) {
            const mouthVoxels = ASSETS.MOUTH[data.mouth];
            const offsetMouthVoxels = mouthVoxels.map(v => ({ ...v, y: v.y + 8, z: v.z + 1 }));
            const mouthMesh = buildPartMerged(offsetMouthVoxels, PALETTE);
            mouthMesh.name = 'mouth';
            group.add(mouthMesh);
        }
        
        // Slightly smaller scale due to tall body
        group.scale.set(0.16, 0.16, 0.16);
        group.position.y = 0.8;
        
        // Mark as Tung Tung for animations
        group.userData.isTungTung = true;
        
        return group;
    };
    
    /**
     * Build Gake (Patrick Star style) mesh
     * Uses same pivot points as penguin for proper animations
     */
    const buildGakeMesh = (data) => {
        const group = new THREE.Group();
        const pivots = GakeGenerators.pivots();
        
        // Head - same pivot as penguin
        const headVoxels = GakeGenerators.head();
        const head = buildPartMerged(headVoxels, GAKE_PALETTE);
        head.name = 'head';
        
        // Body - same pivot as penguin
        const bodyVoxels = GakeGenerators.body();
        const body = buildPartMerged(bodyVoxels, GAKE_PALETTE);
        body.name = 'body';
        
        // Flippers - same pivot as penguin
        const armLVoxels = GakeGenerators.armLeft();
        const armL = buildPartMerged(armLVoxels, GAKE_PALETTE, pivots.armLeft);
        armL.name = 'flipper_l';
        
        const armRVoxels = GakeGenerators.armRight();
        const armR = buildPartMerged(armRVoxels, GAKE_PALETTE, pivots.armRight);
        armR.name = 'flipper_r';
        
        // Feet - same pivot as penguin
        const footLVoxels = GakeGenerators.footLeft();
        const footL = buildPartMerged(footLVoxels, GAKE_PALETTE, pivots.footLeft);
        footL.name = 'foot_l';
        
        const footRVoxels = GakeGenerators.footRight();
        const footR = buildPartMerged(footRVoxels, GAKE_PALETTE, pivots.footRight);
        footR.name = 'foot_r';
        
        group.add(head, body, armL, armR, footL, footR);
        
        // Gake's face is raised by +2 compared to penguin
        const GAKE_FACE_OFFSET = 2;
        
        // Add eyes - raised to match Gake's head position
        if (data.eyes && data.eyes !== 'none' && ASSETS.EYES[data.eyes]) {
            const eyeVoxels = ASSETS.EYES[data.eyes];
            const offsetEyeVoxels = eyeVoxels.map(v => ({ ...v, y: v.y + GAKE_FACE_OFFSET }));
            const eyesMesh = buildPartMerged(offsetEyeVoxels, PALETTE);
            eyesMesh.name = 'eyes';
            group.add(eyesMesh);
        }
        
        // Add mouth - raised to match Gake's head position
        if (data.mouth && data.mouth !== 'none' && ASSETS.MOUTH[data.mouth]) {
            const mouthVoxels = ASSETS.MOUTH[data.mouth];
            const offsetMouthVoxels = mouthVoxels.map(v => ({ ...v, y: v.y + GAKE_FACE_OFFSET }));
            const mouthMesh = buildPartMerged(offsetMouthVoxels, PALETTE);
            mouthMesh.name = 'mouth';
            group.add(mouthMesh);
        }
        
        // Add hat support - raised to match Gake's head position
        if (data.hat && data.hat !== 'none' && ASSETS.HATS[data.hat]) {
            const hatVoxels = ASSETS.HATS[data.hat];
            const offsetHatVoxels = hatVoxels.map(v => ({ ...v, y: v.y + GAKE_FACE_OFFSET }));
            const hatMesh = buildPartMerged(offsetHatVoxels, PALETTE);
            hatMesh.name = 'hat';
            group.add(hatMesh);
        }
        
        // Note: Gake does NOT support body items - only hat, eyes, and mouth/beak
        
        group.scale.set(0.16, 0.16, 0.16);
        group.position.y = 0.8;
        
        // Mark as Gake for animations
        group.userData.isGake = true;
        
        return group;
    };
    
    /**
     * Build Pump (Pump.fun pill) mesh
     * Uses same pivot points as penguin for proper animations
     */
    const buildPumpMesh = (data) => {
        const group = new THREE.Group();
        const pivots = PumpGenerators.pivots();
        
        // Head - cream/beige face
        const headVoxels = PumpGenerators.head();
        const head = buildPartMerged(headVoxels, PUMP_PALETTE);
        head.name = 'head';
        
        // Body - green pill body
        const bodyVoxels = PumpGenerators.body();
        const body = buildPartMerged(bodyVoxels, PUMP_PALETTE);
        body.name = 'body';
        
        // Arms - green stubby arms
        const armLVoxels = PumpGenerators.armLeft();
        const armL = buildPartMerged(armLVoxels, PUMP_PALETTE, pivots.armLeft);
        armL.name = 'flipper_l';
        
        const armRVoxels = PumpGenerators.armRight();
        const armR = buildPartMerged(armRVoxels, PUMP_PALETTE, pivots.armRight);
        armR.name = 'flipper_r';
        
        // Feet - green stubby feet
        const footLVoxels = PumpGenerators.footLeft();
        const footL = buildPartMerged(footLVoxels, PUMP_PALETTE, pivots.footLeft);
        footL.name = 'foot_l';
        
        const footRVoxels = PumpGenerators.footRight();
        const footR = buildPartMerged(footRVoxels, PUMP_PALETTE, pivots.footRight);
        footR.name = 'foot_r';
        
        group.add(head, body, armL, armR, footL, footR);
        
        // Pump's face is raised compared to penguin (pill head is higher)
        const PUMP_FACE_OFFSET = 5;
        
        // Add eyes - raised and forward for pump head (z+2)
        if (data.eyes && data.eyes !== 'none' && ASSETS.EYES[data.eyes]) {
            const eyeVoxels = ASSETS.EYES[data.eyes];
            const offsetEyeVoxels = eyeVoxels.map(v => ({ ...v, y: v.y + PUMP_FACE_OFFSET, z: v.z + 2 }));
            const eyesMesh = buildPartMerged(offsetEyeVoxels, PALETTE);
            eyesMesh.name = 'eyes';
            group.add(eyesMesh);
        }
        
        // Add mouth/beak - raised and forward for pump head (z+2)
        if (data.mouth && data.mouth !== 'none' && ASSETS.MOUTH[data.mouth]) {
            const mouthVoxels = ASSETS.MOUTH[data.mouth];
            const offsetMouthVoxels = mouthVoxels.map(v => ({ ...v, y: v.y + PUMP_FACE_OFFSET, z: v.z + 2 }));
            const mouthMesh = buildPartMerged(offsetMouthVoxels, PALETTE);
            mouthMesh.name = 'mouth';
            group.add(mouthMesh);
        }
        
        // Add hat support - raised to match Pump's head position
        if (data.hat && data.hat !== 'none' && ASSETS.HATS[data.hat]) {
            const hatVoxels = ASSETS.HATS[data.hat];
            const offsetHatVoxels = hatVoxels.map(v => ({ ...v, y: v.y + PUMP_FACE_OFFSET }));
            const hatMesh = buildPartMerged(offsetHatVoxels, PALETTE);
            hatMesh.name = 'hat';
            group.add(hatMesh);
        }
        
        // Add body item support
        if (data.bodyItem && data.bodyItem !== 'none' && ASSETS.BODY[data.bodyItem]) {
            const bodyItemVoxels = ASSETS.BODY[data.bodyItem].voxels || ASSETS.BODY[data.bodyItem];
            const bodyMesh = buildPartMerged(bodyItemVoxels, PALETTE);
            bodyMesh.name = 'bodyItem';
            group.add(bodyMesh);
        }
        
        group.scale.set(0.16, 0.16, 0.16);
        group.position.y = 0.8;
        
        // Mark as Pump for animations
        group.userData.isPump = true;
        
        return group;
    };
    
    // Whale character configs
    const WHALE_CONFIGS = {
        whiteWhale: { generators: WhiteWhaleGenerators, palette: WHITE_WHALE_PALETTE },
        blackWhale: { generators: BlackWhaleGenerators, palette: BLACK_WHALE_PALETTE },
        silverWhale: { generators: SilverWhaleGenerators, palette: SILVER_WHALE_PALETTE },
        goldWhale: { generators: GoldWhaleGenerators, palette: GOLD_WHALE_PALETTE },
    };

    /**
     * Build Whale (special character) mesh - handles all whale color variants
     * Whale head on penguin body
     */
    const buildWhaleMesh = (data) => {
        const config = WHALE_CONFIGS[data.characterType];
        if (!config) return null;
        
        const { generators, palette } = config;
        const group = new THREE.Group();
        const pivots = generators.pivots();
        
        // Whale head
        const headVoxels = generators.head();
        const head = buildPartMerged(headVoxels, palette);
        head.name = 'head';
        
        // Whale-colored penguin body
        const bodyVoxels = generators.body();
        const body = buildPartMerged(bodyVoxels, { ...PALETTE, ...palette });
        body.name = 'body';
        
        // Whale-colored flippers
        const flipperLVoxels = generators.flipperLeft();
        const flipperL = buildPartMerged(flipperLVoxels, { ...PALETTE, ...palette }, pivots.flipperLeft);
        flipperL.name = 'flipper_l';
        
        const flipperRVoxels = generators.flipperRight();
        const flipperR = buildPartMerged(flipperRVoxels, { ...PALETTE, ...palette }, pivots.flipperRight);
        flipperR.name = 'flipper_r';
        
        // Orange penguin feet (for contrast)
        const feetVoxels = generators.feet();
        const footL = buildPartMerged(feetVoxels.filter(v => v.x > 0), PALETTE, pivots.footLeft);
        footL.name = 'foot_l';
        const footR = buildPartMerged(feetVoxels.filter(v => v.x < 0), PALETTE, pivots.footRight);
        footR.name = 'foot_r';
        
        group.add(body, head, flipperL, flipperR, footL, footR);
        group.scale.set(0.2, 0.2, 0.2);
        group.position.y = 0.8;
        
        return group;
    };
    
    /**
     * Build "Joe Mode" penguin (big floating head)
     */
    const buildJoeModePenguin = (data) => {
        const group = new THREE.Group();
        const skin = data.skin || 'blue';
        
        const head = buildPartMerged(generateHead(PALETTE[skin] || skin), PALETTE);
        head.name = 'head';
        
        const footL = buildPartMerged(generateFoot(3), PALETTE, {x:3, y:-6, z:1});
        footL.name = 'foot_l';
        const footR = buildPartMerged(generateFoot(-3), PALETTE, {x:-3, y:-6, z:1});
        footR.name = 'foot_r';
        
        // Create head wrapper with cosmetics
        const joeHeadWrapper = new THREE.Group();
        joeHeadWrapper.name = 'joe_head_wrapper';
        joeHeadWrapper.add(head);
        
        // Add hat
        if (data.hat && data.hat !== 'none' && ASSETS.HATS[data.hat]) {
            const hatMesh = buildPartMerged(ASSETS.HATS[data.hat], PALETTE);
            hatMesh.name = 'hat';
            joeHeadWrapper.add(hatMesh);
        }
        
        // Add eyes
        if (data.eyes && ASSETS.EYES[data.eyes]) {
            const eyesMesh = buildPartMerged(ASSETS.EYES[data.eyes], PALETTE);
            eyesMesh.name = 'eyes';
            joeHeadWrapper.add(eyesMesh);
        }
        
        // Add mouth
        if (data.mouth && ASSETS.MOUTH[data.mouth]) {
            const mouthMesh = buildPartMerged(ASSETS.MOUTH[data.mouth], PALETTE);
            mouthMesh.name = 'mouth';
            joeHeadWrapper.add(mouthMesh);
        } else if (ASSETS.MOUTH.beak) {
            const mouthMesh = buildPartMerged(ASSETS.MOUTH.beak, PALETTE);
            mouthMesh.name = 'mouth';
            joeHeadWrapper.add(mouthMesh);
        }
        
        // Scale up the head wrapper
        joeHeadWrapper.scale.set(1.8, 1.8, 1.8);
        joeHeadWrapper.position.y = -2 * VOXEL_SIZE;
        group.add(joeHeadWrapper);
        
        // White floating flippers
        const whiteFlippersLeft = buildPartMerged(generateFlippers('#FFFFFF', true), PALETTE, {x:5, y:0, z:0});
        const whiteFlippersRight = buildPartMerged(generateFlippers('#FFFFFF', false), PALETTE, {x:-5, y:0, z:0});
        whiteFlippersLeft.name = 'flipper_l';
        whiteFlippersRight.name = 'flipper_r';
        
        whiteFlippersLeft.scale.set(0.9, 0.9, 0.9);
        whiteFlippersLeft.position.set(5 * VOXEL_SIZE, 2 * VOXEL_SIZE, 3 * VOXEL_SIZE);
        
        whiteFlippersRight.scale.set(0.9, 0.9, 0.9);
        whiteFlippersRight.position.set(-5 * VOXEL_SIZE, 2 * VOXEL_SIZE, 3 * VOXEL_SIZE);
        
        group.userData.isJoeMode = true;
        group.add(whiteFlippersLeft, whiteFlippersRight, footL, footR);
        
        // Apply overall scale (same as other character types)
        group.scale.set(0.2, 0.2, 0.2);
        group.position.y = 0.8;
        
        return group;
    };
    
    /**
     * Build standard penguin mesh
     */
    const buildStandardPenguin = (data) => {
        const group = new THREE.Group();
        const skin = data.skin || 'blue';
        const skinHex = PALETTE[skin] || skin;
        
        // Check if this is an animated skin (cosmic, galaxy, rainbow, nebula)
        const skinConfig = ANIMATED_SKIN_COLORS[skin];
        const animatedSkinInfo = skinConfig ? {
            skinHex,
            skinConfig,
            materials: [] // Will be populated by buildPartMerged
        } : null;
        
        const body = buildPartMerged(generateBaseBody(skinHex), PALETTE, null, animatedSkinInfo);
        const head = buildPartMerged(generateHead(skinHex), PALETTE, null, animatedSkinInfo);
        
        const footL = buildPartMerged(generateFoot(3), PALETTE, {x:3, y:-6, z:1});
        footL.name = 'foot_l';
        const footR = buildPartMerged(generateFoot(-3), PALETTE, {x:-3, y:-6, z:1});
        footR.name = 'foot_r';
        
        const flippersLeft = buildPartMerged(generateFlippers(skinHex, true), PALETTE, {x:5, y:0, z:0}, animatedSkinInfo);
        const flippersRight = buildPartMerged(generateFlippers(skinHex, false), PALETTE, {x:-5, y:0, z:0}, animatedSkinInfo);
        
        flippersLeft.name = 'flipper_l';
        flippersRight.name = 'flipper_r';
        head.name = 'head';
        body.name = 'body';
        
        // Handle body item flipper modifications
        const bodyItemInfo = data.bodyItem ? ASSETS.BODY[data.bodyItem] : null;
        
        // Attach held items to flippers (like baseball bat)
        if (bodyItemInfo?.flipperAttachment) {
            const attach = bodyItemInfo.flipperAttachment;
            const targetFlipper = attach.flipper === 'left' ? flippersLeft : flippersRight;
            const flipperPivot = attach.flipper === 'left' ? {x:5, y:0, z:0} : {x:-5, y:0, z:0};
            
            if (attach.voxels && attach.voxels.length > 0) {
                // Apply offset to voxels (offset is in world space, convert to flipper local space)
                const offsetVoxels = attach.voxels.map(v => ({
                    ...v,
                    x: v.x + (attach.offset?.x || 0) - flipperPivot.x,
                    y: v.y + (attach.offset?.y || 0) - flipperPivot.y,
                    z: v.z + (attach.offset?.z || 0) - flipperPivot.z
                }));
                
                const heldItem = buildPartMerged(offsetVoxels, PALETTE);
                heldItem.name = 'held_item';
                targetFlipper.add(heldItem);
            }
        }
        
        group.add(body, head, flippersLeft, flippersRight, footL, footR);
        
        // Add cosmetics
        addHat(group, data);
        addEyes(group, data);
        addMouth(group, data);
        addBodyItem(group, data);
        
        // Add cosmic stars for animated skins
        if (animatedSkinInfo && skinConfig?.hasStars) {
            const starsGroup = new THREE.Group();
            starsGroup.name = 'cosmic_stars';
            
            const starCount = 30;
            const starGeometry = new THREE.SphereGeometry(VOXEL_SIZE * 0.12, 6, 6);
            
            for (let i = 0; i < starCount; i++) {
                const starMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.8,
                    emissive: new THREE.Color(0xaabbff),
                    emissiveIntensity: 1.0,
                    roughness: 0.2,
                    metalness: 0.8
                });
                
                const star = new THREE.Mesh(starGeometry, starMaterial);
                
                // Random position on the penguin surface
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.random() * Math.PI * 0.7 + 0.15;
                const radius = 1.0 + Math.random() * 0.8;
                
                star.position.set(
                    Math.sin(phi) * Math.cos(theta) * radius,
                    Math.cos(phi) * radius + 0.3,
                    Math.sin(phi) * Math.sin(theta) * radius
                );
                
                // Store twinkle parameters
                star.userData.twinkleSpeed = 0.8 + Math.random() * 1.2;
                star.userData.twinkleOffset = Math.random() * Math.PI * 2;
                star.userData.baseScale = 0.6 + Math.random() * 0.5;
                star.userData.isCosmicStar = true;
                
                starsGroup.add(star);
            }
            
            starsGroup.userData.isCosmicStars = true;
            group.add(starsGroup);
        }
        
        // Add subtle glow light for animated skins (reduced 80% from original)
        if (animatedSkinInfo && animatedSkinInfo.materials.length > 0) {
            const glowLight = new THREE.PointLight(
                new THREE.Color(skinConfig.colors[0]), // Initial color
                0.3, // Intensity (reduced 80% from 1.5)
                5    // Distance (reduced from 8)
            );
            glowLight.position.set(0, 3 * VOXEL_SIZE, 0); // Center of penguin body
            glowLight.name = 'animated_skin_glow';
            glowLight.userData.isAnimatedSkinGlow = true;
            group.add(glowLight);
        }
        
        // Store animated skin data on the group for animation
        if (animatedSkinInfo && animatedSkinInfo.materials.length > 0) {
            group.userData.animatedSkin = {
                skinName: skin,
                config: skinConfig,
                materials: animatedSkinInfo.materials
            };
        }
        
        group.scale.set(0.2, 0.2, 0.2);
        group.position.y = 0.8;
        
        return group;
    };
    
    /**
     * Main build function - creates penguin mesh with all cosmetics
     * @param {Object} data - Penguin customization data
     * @returns {THREE.Group} The penguin wrapper mesh
     */
    const buildPenguinMesh = (data) => {
        // Validate data to prevent "Cannot convert object to primitive value" errors
        if (!data || typeof data !== 'object') {
            console.warn('buildPenguinMesh received invalid data:', data);
            data = {}; // Use empty object as fallback
        }
        
        // Ensure color is a primitive value (string or number), not an object
        if (data.color && typeof data.color === 'object') {
            console.warn('buildPenguinMesh: color is an object, converting:', data.color);
            if (data.color.isColor && typeof data.color.getHex === 'function') {
                data.color = data.color.getHex();
            } else if (typeof data.color.r !== 'undefined') {
                data.color = ((data.color.r * 255) << 16) | ((data.color.g * 255) << 8) | (data.color.b * 255);
            } else {
                data.color = 'blue'; // Default color
            }
        }
        
        let group;
        
        // Debug log for character type
        if (data.characterType && data.characterType !== 'penguin') {
            console.log(`🎭 Building ${data.characterType} character mesh`);
        }
        
        // Check for special character types
        if (data.characterType === 'marcus') {
            group = buildMarcusMesh(data);
        } else if (data.characterType === 'doginal') {
            group = buildDoginalMesh(data);
        } else if (data.characterType === 'frog') {
            group = buildFrogMesh(data);
        } else if (data.characterType === 'shrimp') {
            group = buildShrimpMesh(data);
        } else if (data.characterType === 'duck') {
            group = buildDuckMesh(data);
        } else if (data.characterType === 'tungTung') {
            group = buildTungTungMesh(data);
        } else if (data.characterType === 'gake') {
            group = buildGakeMesh(data);
        } else if (data.characterType === 'pump') {
            group = buildPumpMesh(data);
        } else if (WHALE_CONFIGS[data.characterType]) {
            group = buildWhaleMesh(data);
        } else {
            // Check if bodyItem hides the body (e.g., "joe" clothing)
            const bodyItemData = data.bodyItem ? ASSETS.BODY[data.bodyItem] : null;
            const hideBody = bodyItemData?.hideBody === true;
            
            if (hideBody) {
                group = buildJoeModePenguin(data);
            } else {
                group = buildStandardPenguin(data);
            }
        }
        
        const wrapper = new THREE.Group();
        wrapper.add(group);
        
        // Add mount if equipped
        addMount(wrapper, group, data);
        
        return wrapper;
    };
    
    return {
        buildPenguinMesh,
        buildPartMerged,
        getMaterial,
        sharedVoxelGeo
    };
}

/**
 * Cache animated cosmetic parts for efficient updates
 * @param {THREE.Object3D} mesh - The penguin mesh
 * @returns {Object} Cached references to animated parts
 */
export function cacheAnimatedParts(mesh) {
    if (!mesh) return null;
    
    const cache = {
        propellerBlades: null,
        smokeEmitter: null,
        laserEyes: null,
        fireEyes: null,
        wings: [],
        fireAura: null,
        lightningAura: null,
        fireEmitter: null,
        breathFire: null,
        breathIce: null,
        bubblegum: null,
        // Animated feathers
        auroraEmitter: null,
        crystalEmitter: null,
        voidEmitter: null,
        // Animated skin (cosmic, galaxy, rainbow, nebula)
        animatedSkin: null,
        cosmicStars: [],
        animatedSkinGlow: null
    };
    
    mesh.traverse(child => {
        if (child.name === 'propeller_blades') cache.propellerBlades = child;
        if (child.userData?.isSmokeEmitter) cache.smokeEmitter = child;
        if (child.userData?.isLaserEyes) cache.laserEyes = child;
        if (child.userData?.isFireEyes) cache.fireEyes = child;
        if (child.userData?.isWings) cache.wings.push(child);
        if (child.userData?.isFireAura) cache.fireAura = child;
        if (child.userData?.isLightningAura) cache.lightningAura = child;
        if (child.userData?.isFireEmitter) cache.fireEmitter = child;
        if (child.userData?.isBreathFire) cache.breathFire = child;
        if (child.userData?.isBreathIce) cache.breathIce = child;
        if (child.userData?.isBubblegum) cache.bubblegum = child;
        // Animated feathers
        if (child.userData?.isAuroraEmitter) cache.auroraEmitter = child;
        if (child.userData?.isCrystalEmitter) cache.crystalEmitter = child;
        if (child.userData?.isVoidEmitter) cache.voidEmitter = child;
        // Animated skin data
        if (child.userData?.animatedSkin) cache.animatedSkin = child.userData.animatedSkin;
        if (child.userData?.isCosmicStar) cache.cosmicStars.push(child);
        if (child.userData?.isCosmicStars) {
            // Traverse stars group
            child.children.forEach(star => {
                if (star.userData?.isCosmicStar) cache.cosmicStars.push(star);
            });
        }
        if (child.userData?.isAnimatedSkinGlow) cache.animatedSkinGlow = child;
    });
    
    return cache;
}

/**
 * Animate cosmetics using cached references
 * @param {Object} cache - Cached animated parts
 * @param {number} time - Current time
 * @param {number} delta - Delta time
 * @param {number} VOXEL_SIZE - Voxel size constant
 */
export function animateCosmeticsFromCache(cache, time, delta, VOXEL_SIZE) {
    if (!cache) return;
    
    // Propeller blades
    if (cache.propellerBlades) {
        cache.propellerBlades.rotation.y += delta * 15;
    }
    
    // Smoke emitter
    if (cache.smokeEmitter) {
        cache.smokeEmitter.children.forEach((particle, i) => {
            particle.position.y += delta * 2;
            particle.position.x += Math.sin(time * 2 + i) * delta * 0.5;
            const height = particle.position.y - (particle.userData.baseY || 0);
            if (particle.material) {
                particle.material.opacity = Math.max(0, 0.6 - height * 0.3);
            }
            if (height > 2) {
                particle.position.y = particle.userData.baseY || 0;
                particle.position.x = 0;
                if (particle.material) particle.material.opacity = 0.6;
            }
        });
    }
    
    // Laser eyes
    if (cache.laserEyes) {
        const intensity = 1 + Math.sin(time * 10) * 0.5;
        cache.laserEyes.children.forEach(light => {
            if (light.isPointLight) light.intensity = intensity;
        });
    }
    
    // Fire eyes
    if (cache.fireEyes) {
        cache.fireEyes.children.forEach(eyeGroup => {
            if (eyeGroup.children) {
                eyeGroup.children.forEach((particle, i) => {
                    if (particle.isMesh) {
                        particle.position.y = (particle.userData.baseY || 0) + Math.sin(time * 15 + i) * 0.1 * VOXEL_SIZE;
                        particle.position.x = Math.sin(time * 12 + i * 2) * 0.05 * VOXEL_SIZE;
                        if (particle.material) particle.material.opacity = 0.7 + Math.sin(time * 20 + i) * 0.3;
                    }
                    if (particle.isPointLight) particle.intensity = 0.5 + Math.sin(time * 15) * 0.3;
                });
            }
        });
    }
    
    // Wings
    cache.wings.forEach(child => {
        const phase = child.userData.wingPhase || 0;
        child.rotation.y = Math.sin(time * 6 + phase) * 0.3;
    });
    
    // Fire Aura
    if (cache.fireAura) {
        cache.fireAura.rotation.y = time * 2;
        cache.fireAura.children.forEach(flame => {
            if (flame.userData?.isFlame) {
                const offset = flame.userData.offset || 0;
                flame.position.y = flame.userData.baseY + Math.sin(time * 8 + offset) * 0.3 * VOXEL_SIZE;
                flame.scale.x = 0.8 + Math.sin(time * 10 + offset) * 0.3;
                flame.scale.z = 0.8 + Math.cos(time * 10 + offset) * 0.3;
            }
        });
        if (cache.fireAura.userData.fireLight) {
            cache.fireAura.userData.fireLight.intensity = 1.5 + Math.sin(time * 12) * 0.5;
        }
    }
    
    // Lightning Aura
    if (cache.lightningAura) {
        cache.lightningAura.rotation.y = time * 3;
        cache.lightningAura.children.forEach(bolt => {
            if (bolt.userData?.flickerOffset !== undefined) {
                const flicker = Math.sin(time * 20 + bolt.userData.flickerOffset);
                bolt.visible = flicker > -0.3;
                if (bolt.material) bolt.material.opacity = 0.5 + flicker * 0.4;
                bolt.position.y = Math.sin(time * 15 + bolt.userData.flickerOffset) * 0.5 * VOXEL_SIZE;
            }
        });
        if (cache.lightningAura.userData.lightningLight) {
            cache.lightningAura.userData.lightningLight.intensity = 1 + Math.random() * 1;
        }
    }
    
    // Fire Emitter (flaming crown)
    if (cache.fireEmitter) {
        cache.fireEmitter.children.forEach((particle, i) => {
            particle.position.y += delta * 3;
            particle.position.x = (particle.userData.baseX || 0) + Math.sin(time * 8 + i) * 0.15;
            particle.position.z = (particle.userData.baseZ || 0) + Math.cos(time * 6 + i) * 0.15;
            const height = particle.position.y - (particle.userData.baseY || 0);
            if (particle.material) particle.material.opacity = Math.max(0, 0.9 - height * 0.15);
            particle.scale.setScalar(Math.max(0.3, 1 - height * 0.1));
            if (height > 5) {
                particle.position.y = particle.userData.baseY || 0;
                particle.scale.setScalar(1);
                if (particle.material) particle.material.opacity = 0.9;
            }
        });
    }
    
    // ========== ANIMATED FEATHERS (ENHANCED) ==========
    
    // Aurora Feathers - Intense northern lights with trails
    if (cache.auroraEmitter) {
        cache.auroraEmitter.children.forEach((particle, i) => {
            if (particle.userData.isRibbon) {
                // Main ribbons - flowing wave motion
                const angle = particle.userData.angle || 0;
                const phase = particle.userData.phaseOffset || 0;
                const baseY = particle.userData.baseY || 0;
                const speed = particle.userData.speed || 1;
                
                // Serpentine motion
                const wave = Math.sin(time * speed + phase) * 1.5;
                particle.position.x = Math.cos(angle + time * 0.3) * (2 + wave * 0.5) * VOXEL_SIZE;
                particle.position.z = Math.sin(angle + time * 0.3) * (1.5 + wave * 0.3) * VOXEL_SIZE - VOXEL_SIZE;
                particle.position.y = baseY + Math.sin(time * speed * 1.5 + phase) * 1.2 * VOXEL_SIZE;
                
                // Rotation follows motion
                particle.rotation.y = time * 0.5 + phase;
                particle.rotation.z = Math.sin(time * 2 + phase) * 0.3;
                
                // Vivid color cycling
                if (particle.material) {
                    const hue = (time * 0.15 + phase * 0.1) % 1;
                    particle.material.color.setHSL(hue * 0.3 + 0.35, 0.9, 0.55);
                    particle.material.opacity = 0.7 + Math.sin(time * 4 + phase) * 0.25;
                }
            } else if (particle.userData.isTrail) {
                // Trail particles - rising and fading
                particle.userData.life += delta * particle.userData.speed;
                const lifeRatio = particle.userData.life / particle.userData.maxLife;
                
                if (lifeRatio >= 1) {
                    // Reset particle
                    particle.userData.life = 0;
                    particle.position.x = particle.userData.baseX + (Math.random() - 0.5) * 2 * VOXEL_SIZE;
                    particle.position.y = 0;
                    particle.position.z = particle.userData.baseZ + (Math.random() - 0.5) * 2 * VOXEL_SIZE;
                } else {
                    // Rise and drift
                    particle.position.y += delta * 3 * VOXEL_SIZE;
                    particle.position.x += Math.sin(time * 3 + i) * delta * 0.5 * VOXEL_SIZE;
                    
                    // Fade out
                    if (particle.material) {
                        particle.material.opacity = (1 - lifeRatio) * 0.8;
                        const hue = (time * 0.2 + i * 0.05) % 1;
                        particle.material.color.setHSL(hue * 0.3 + 0.35, 0.85, 0.6);
                    }
                    particle.scale.setScalar(1 - lifeRatio * 0.5);
                }
            }
        });
    }
    
    // Crystal Feathers - Brilliant sparkle bursts
    if (cache.crystalEmitter) {
        cache.crystalEmitter.children.forEach((particle, i) => {
            if (particle.userData.isShard) {
                // Crystal shards - pulsing and rotating
                const twinkle = Math.sin(time * particle.userData.twinkleSpeed + particle.userData.twinkleOffset);
                const twinkleNorm = (twinkle + 1) / 2;
                const angle = particle.userData.angle || 0;
                
                // Subtle orbit
                particle.position.x = Math.cos(angle + time * 0.2) * 1.5 * VOXEL_SIZE;
                particle.position.z = Math.sin(angle + time * 0.2) * 1 * VOXEL_SIZE;
                particle.position.y = particle.userData.baseY + Math.sin(time * 2 + i) * 0.3 * VOXEL_SIZE;
                
                // Rotation
                particle.rotation.y = time + angle;
                particle.rotation.x = Math.sin(time * 1.5 + i) * 0.2;
                
                // Brilliant color shift
                if (particle.material) {
                    const hue = (time * 0.1 + particle.userData.twinkleOffset * 0.1) % 1;
                    particle.material.color.setHSL(hue, 0.2 + twinkleNorm * 0.3, 0.85 + twinkleNorm * 0.15);
                    particle.material.opacity = 0.7 + twinkleNorm * 0.3;
                }
                particle.scale.setScalar(0.8 + twinkleNorm * 0.4);
            } else if (particle.userData.isSparkle) {
                // Sparkle particles - burst outward and fade
                particle.userData.life += delta * 2;
                const lifeRatio = particle.userData.life / particle.userData.maxLife;
                
                if (lifeRatio >= 1) {
                    // Reset at center
                    particle.userData.life = 0;
                    particle.position.set(0, VOXEL_SIZE, 0);
                    particle.userData.velocity = {
                        x: (Math.random() - 0.5) * 3,
                        y: 2 + Math.random() * 3,
                        z: (Math.random() - 0.5) * 3
                    };
                } else {
                    // Burst outward
                    particle.position.x += particle.userData.velocity.x * delta * VOXEL_SIZE;
                    particle.position.y += particle.userData.velocity.y * delta * VOXEL_SIZE;
                    particle.position.z += particle.userData.velocity.z * delta * VOXEL_SIZE;
                    particle.userData.velocity.y -= delta * 2; // Gravity
                    
                    // Fade and shrink
                    if (particle.material) {
                        particle.material.opacity = (1 - lifeRatio) * 0.9;
                        // Rainbow sparkle
                        const hue = (time * 0.5 + i * 0.1) % 1;
                        particle.material.color.setHSL(hue, 0.5, 0.9);
                    }
                    particle.scale.setScalar((1 - lifeRatio * 0.7));
                }
            }
        });
    }
    
    // Void Feathers - Intense dark vortex
    if (cache.voidEmitter) {
        cache.voidEmitter.children.forEach((particle, i) => {
            if (particle.userData.isTendril) {
                // Energy tendrils - swirling upward
                const angle = particle.userData.angle || 0;
                const baseY = particle.userData.baseY || 0;
                const speed = particle.userData.speed || 1;
                
                // Spiral motion
                const currentAngle = angle + time * speed;
                const radius = particle.userData.radius + Math.sin(time * 2) * 0.5;
                particle.position.x = Math.cos(currentAngle) * radius * VOXEL_SIZE;
                particle.position.z = Math.sin(currentAngle) * radius * VOXEL_SIZE - VOXEL_SIZE;
                particle.position.y = baseY + Math.sin(time * speed + angle) * 1.5 * VOXEL_SIZE;
                
                // Tendril rotation
                particle.rotation.y = currentAngle;
                particle.rotation.x = Math.sin(time * 3) * 0.4;
                
                // Pulsing purple energy
                if (particle.material) {
                    const pulse = Math.sin(time * 4 + angle) * 0.5 + 0.5;
                    particle.material.color.setHSL(0.78 + pulse * 0.08, 0.9, 0.25 + pulse * 0.15);
                    particle.material.opacity = 0.7 + pulse * 0.25;
                }
            } else if (particle.userData.isVortex) {
                // Vortex particles - spiraling inward then resetting
                particle.userData.life += delta * particle.userData.spiralSpeed;
                const lifeRatio = particle.userData.life % 1;
                
                // Spiral inward
                const angle = particle.userData.angle + time * particle.userData.speed;
                const baseRadius = particle.userData.radius;
                const currentRadius = baseRadius * (1 - lifeRatio * 0.8);
                
                particle.position.x = Math.cos(angle + lifeRatio * Math.PI * 4) * currentRadius * VOXEL_SIZE;
                particle.position.z = Math.sin(angle + lifeRatio * Math.PI * 4) * currentRadius * VOXEL_SIZE - VOXEL_SIZE;
                particle.position.y = particle.userData.baseY + lifeRatio * 4 * VOXEL_SIZE;
                
                // Fade as it spirals in
                if (particle.material) {
                    particle.material.opacity = (1 - lifeRatio * 0.7) * 0.8;
                    const hue = 0.75 + Math.sin(time * 2 + i) * 0.1;
                    particle.material.color.setHSL(hue, 0.85, 0.2 + lifeRatio * 0.2);
                }
                particle.scale.setScalar(1 - lifeRatio * 0.6);
            }
        });
    }
    
    // Fire breath
    if (cache.breathFire) {
        cache.breathFire.children.forEach(particle => {
            particle.position.z += delta * 15;
            particle.position.y += (Math.random() - 0.5) * delta * 2;
            particle.position.x += (Math.random() - 0.5) * delta * 2;
            const dist = particle.position.z - (particle.userData.baseZ || 0);
            if (particle.material) particle.material.opacity = Math.max(0, 0.9 - dist * 0.1);
            if (dist > 8) {
                particle.position.z = particle.userData.baseZ || 0;
                particle.position.y = 0;
                particle.position.x = 0;
                if (particle.material) particle.material.opacity = 0.9;
            }
        });
    }
    
    // Ice breath
    if (cache.breathIce) {
        cache.breathIce.children.forEach((particle, i) => {
            particle.position.z += delta * 12;
            particle.position.y += Math.sin(time * 10 + i) * delta;
            particle.position.x += Math.cos(time * 8 + i) * delta;
            const dist = particle.position.z - (particle.userData.baseZ || 0);
            if (particle.material) particle.material.opacity = Math.max(0, 0.8 - dist * 0.08);
            if (dist > 10) {
                particle.position.z = particle.userData.baseZ || 0;
                particle.position.y = 0;
                particle.position.x = 0;
                if (particle.material) particle.material.opacity = 0.8;
            }
        });
    }
    
    // Bubblegum
    if (cache.bubblegum) {
        const bubble = cache.bubblegum.children[0];
        if (bubble) {
            const cycleTime = (time % 4) / 4;
            let scale;
            if (cycleTime < 0.8) scale = 0.5 + cycleTime * 2;
            else if (cycleTime < 0.85) scale = 2.1 - (cycleTime - 0.8) * 30;
            else scale = 0.5;
            bubble.scale.setScalar(Math.max(0.3, scale));
        }
    }
    
    // Animated skin colors (cosmic, galaxy, rainbow, nebula)
    // Each body part has a phase offset for a flowing galaxy effect
    if (cache.animatedSkin && cache.animatedSkin.materials && cache.animatedSkin.materials.length > 0) {
        const skinConfig = cache.animatedSkin.config;
        if (skinConfig && skinConfig.colors) {
            const baseT = time * skinConfig.speed;
            const colorCount = skinConfig.colors.length;
            
            // Need THREE for color operations - get from window
            const THREE = window.THREE;
            if (THREE) {
                cache.animatedSkin.materials.forEach((mat, idx) => {
                    if (mat && mat.color) {
                        // Each material has its own phase offset for galaxy flow effect
                        // Use ?? instead of || so that phaseOffset=0 (for rainbow) is respected
                        const phaseOffset = mat.userData?.phaseOffset ?? (idx * 0.7);
                        const t = baseT + phaseOffset;
                        
                        // Interpolate between colors based on time + offset
                        const colorIndex = Math.abs(t) % colorCount;
                        const fromIdx = Math.floor(colorIndex) % colorCount;
                        const toIdx = (fromIdx + 1) % colorCount;
                        const blend = colorIndex - Math.floor(colorIndex);
                        
                        const fromColor = new THREE.Color(skinConfig.colors[fromIdx]);
                        const toColor = new THREE.Color(skinConfig.colors[toIdx]);
                        const currentColor = fromColor.clone().lerp(toColor, blend);
                        
                        mat.color.copy(currentColor);
                        if (mat.emissive) {
                            mat.emissive.copy(currentColor);
                            mat.emissiveIntensity = (skinConfig.emissive || 0.1) + Math.sin(t * 2) * 0.05;
                        }
                    }
                });
            }
        }
    }
    
    // Cosmic stars twinkling
    if (cache.cosmicStars && cache.cosmicStars.length > 0) {
        cache.cosmicStars.forEach(star => {
            if (star && star.material && star.userData) {
                // Each star twinkles at its own rate
                const twinkle = Math.sin(time * (star.userData.twinkleSpeed || 1) + (star.userData.twinkleOffset || 0));
                const twinkleNorm = (twinkle + 1) / 2; // Normalize to 0-1
                
                // Opacity pulsing
                star.material.opacity = 0.4 + twinkleNorm * 0.6;
                
                // Emissive intensity pulsing for glow effect
                star.material.emissiveIntensity = 0.6 + twinkleNorm * 0.8;
                
                // Subtle color temperature shift (warmer when bright)
                const warmth = twinkleNorm * 0.15;
                if (star.material.emissive) {
                    star.material.emissive.setRGB(0.7 + warmth, 0.75 + warmth * 0.5, 1.0);
                }
                
                // Subtle size pulsing
                const baseScale = star.userData.baseScale || 1;
                const scale = baseScale * (0.8 + twinkleNorm * 0.4);
                star.scale.setScalar(scale);
            }
        });
    }
    
    // Animated skin glow light - follows the average color of animated materials
    if (cache.animatedSkinGlow && cache.animatedSkin && cache.animatedSkin.materials.length > 0) {
        // Get color from first material (they're all similar with slight offsets)
        const firstMat = cache.animatedSkin.materials[0];
        if (firstMat && firstMat.color) {
            cache.animatedSkinGlow.color.copy(firstMat.color);
            // Subtle pulse (reduced 80%)
            const pulse = Math.sin(time * 2) * 0.06 + 0.06;
            cache.animatedSkinGlow.intensity = 0.24 + pulse;
        }
    }
}

export default createPenguinBuilder;

