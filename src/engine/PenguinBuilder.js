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
    generateDogPalette
} from '../characters';

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
     */
    const buildPartMerged = (voxels, palette, pivot) => {
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
            
            // Use InstancedMesh for many voxels of same color
            const instancedMesh = new THREE.InstancedMesh(
                sharedVoxelGeo,
                getMaterial(colorKey),
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
        
        // Use mount-specific scale if defined, otherwise default 0.2
        const mountScale = mountData.scale || 0.2;
        mountGroup.scale.set(mountScale, mountScale, mountScale);
        mountGroup.position.y = mountData.positionY ?? 0.4;
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
        whiteFlippersLeft.position.set(6 * VOXEL_SIZE, 2 * VOXEL_SIZE, 3 * VOXEL_SIZE);
        
        whiteFlippersRight.scale.set(0.9, 0.9, 0.9);
        whiteFlippersRight.position.set(-6 * VOXEL_SIZE, 2 * VOXEL_SIZE, 3 * VOXEL_SIZE);
        
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
        
        const body = buildPartMerged(generateBaseBody(PALETTE[skin] || skin), PALETTE);
        const head = buildPartMerged(generateHead(PALETTE[skin] || skin), PALETTE);
        
        const footL = buildPartMerged(generateFoot(3), PALETTE, {x:3, y:-6, z:1});
        footL.name = 'foot_l';
        const footR = buildPartMerged(generateFoot(-3), PALETTE, {x:-3, y:-6, z:1});
        footR.name = 'foot_r';
        
        const flippersLeft = buildPartMerged(generateFlippers(PALETTE[skin] || skin, true), PALETTE, {x:5, y:0, z:0});
        const flippersRight = buildPartMerged(generateFlippers(PALETTE[skin] || skin, false), PALETTE, {x:-5, y:0, z:0});
        
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
        
        // Check for special character types
        if (data.characterType === 'marcus') {
            group = buildMarcusMesh(data);
        } else if (data.characterType === 'doginal') {
            group = buildDoginalMesh(data);
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
        bubblegum: null
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
}

export default createPenguinBuilder;

