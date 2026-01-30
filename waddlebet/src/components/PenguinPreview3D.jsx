/**
 * PenguinPreview3D - Renders a 3D rotating penguin preview
 * Used in ProfileMenu and PenguinCreatorOverlay for consistent penguin previews
 */

import React, { useEffect, useRef } from 'react';
import { VOXEL_SIZE, PALETTE } from '../constants';
import { generateBaseBody, generateFlippers, generateFeet, generateHead } from '../generators';
import { ASSETS } from '../assets/index';
import { 
    DoginalGenerators,
    generateDogPalette,
    FrogGenerators,
    generateFrogPalette,
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
    ShrimpGenerators,
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

// Color palette for penguin skins
const SKIN_COLORS = {
    blue: { color: '#3B82F6', highlight: '#60A5FA', shadow: '#2563EB' },
    red: { color: '#EF4444', highlight: '#F87171', shadow: '#DC2626' },
    green: { color: '#22C55E', highlight: '#4ADE80', shadow: '#16A34A' },
    yellow: { color: '#EAB308', highlight: '#FACC15', shadow: '#CA8A04' },
    pink: { color: '#EC4899', highlight: '#F472B6', shadow: '#DB2777' },
    purple: { color: '#A855F7', highlight: '#C084FC', shadow: '#9333EA' },
    orange: { color: '#F97316', highlight: '#FB923C', shadow: '#EA580C' },
    black: { color: '#374151', highlight: '#4B5563', shadow: '#1F2937' },
    white: { color: '#F3F4F6', highlight: '#FFFFFF', shadow: '#D1D5DB' },
    cyan: { color: '#06B6D4', highlight: '#22D3EE', shadow: '#0891B2' },
    teal: { color: '#14B8A6', highlight: '#2DD4BF', shadow: '#0D9488' },
    gold: { color: '#F59E0B', highlight: '#FBBF24', shadow: '#D97706' },
    // Animated skins - show first color as base
    cosmic: { color: '#0B0B45', highlight: '#3d1a6e', shadow: '#1a0a3e', animated: true },
    galaxy: { color: '#1A0533', highlight: '#2a1055', shadow: '#0a1628', animated: true },
    rainbow: { color: '#ff0000', highlight: '#ff8800', shadow: '#ffff00', animated: true },
    prismatic: { color: '#ff00ff', highlight: '#00ffff', shadow: '#ffff00', animated: true },
    nebula: { color: '#9932CC', highlight: '#8A2BE2', shadow: '#4B0082', animated: true },
    lava: { color: '#FF4500', highlight: '#FF6600', shadow: '#CC3300', animated: true },
    ocean: { color: '#006994', highlight: '#00B4D8', shadow: '#0077B6', animated: true },
    sunset: { color: '#FF6B35', highlight: '#FF5E78', shadow: '#C71585', animated: true },
    frost: { color: '#E0FFFF', highlight: '#87CEEB', shadow: '#ADD8E6', animated: true },
    matrix: { color: '#00FF00', highlight: '#00CC00', shadow: '#003300', animated: true },
    glitch: { color: '#FF00FF', highlight: '#00FFFF', shadow: '#FFFF00', animated: true },
    chromatic: { color: '#C0C0C0', highlight: '#D4AF37', shadow: '#E6E6FA', animated: true },
    holographic: { color: '#FF69B4', highlight: '#00CED1', shadow: '#FFD700', animated: true },
};

// Animated skin configurations for preview animation
const ANIMATED_SKIN_CONFIGS = {
    cosmic: { colors: ['#0B0B45', '#3d1a6e', '#6b2d8b'], speed: 0.5 },
    galaxy: { colors: ['#1A0533', '#2a1055', '#0a1628'], speed: 0.4 },
    rainbow: { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#0088ff', '#8800ff'], speed: 0.8 },
    prismatic: { colors: ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#8800ff'], speed: 0.6 },
    nebula: { colors: ['#9932CC', '#4B0082', '#8A2BE2'], speed: 0.6 },
    lava: { colors: ['#FF4500', '#CC3300', '#8B0000'], speed: 0.7 },
    ocean: { colors: ['#006994', '#00B4D8', '#48CAE4'], speed: 0.5 },
    sunset: { colors: ['#FF6B35', '#FF5E78', '#C71585'], speed: 0.4 },
    frost: { colors: ['#E0FFFF', '#87CEEB', '#ADD8E6'], speed: 0.3 },
    matrix: { colors: ['#001100', '#00FF00', '#00CC00'], speed: 1.0 },
    glitch: { colors: ['#FF0000', '#00FF00', '#0000FF'], speed: 0.6 },
    chromatic: { colors: ['#C0C0C0', '#D4AF37', '#E6E6FA'], speed: 0.6 },
    holographic: { colors: ['#FF69B4', '#00CED1', '#FFD700'], speed: 0.4 },
};

const PenguinPreview3D = ({ 
    appearance = {}, 
    size = 120, 
    autoRotate = true,
    rotationSpeed = 0.01,
    className = ''
}) => {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const penguinGroupRef = useRef(null);
    const animationRef = useRef(null);
    
    useEffect(() => {
        if (!mountRef.current) return;
        
        let mounted = true;
        
        const initThree = async () => {
            const THREE = await import('three');
            
            if (!mounted || !mountRef.current) return;
            
            // Scene setup
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a2e);
            sceneRef.current = scene;
            
            // Camera
            const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
            camera.position.set(0, 4, 12);
            camera.lookAt(0, 1, 0);
            cameraRef.current = camera;
            
            // Renderer
            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(size, size);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);
            
            // Clear any existing canvas
            while (mountRef.current.firstChild) {
                mountRef.current.removeChild(mountRef.current.firstChild);
            }
            mountRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;
            
            // Lighting
            const ambient = new THREE.AmbientLight(0xffffff, 0.7);
            scene.add(ambient);
            
            const directional = new THREE.DirectionalLight(0xffffff, 0.8);
            directional.position.set(5, 10, 5);
            scene.add(directional);
            
            const backLight = new THREE.DirectionalLight(0x8888ff, 0.3);
            backLight.position.set(-5, 5, -5);
            scene.add(backLight);
            
            // Penguin group
            const penguinGroup = new THREE.Group();
            scene.add(penguinGroup);
            penguinGroupRef.current = penguinGroup;
            
            // Build the penguin
            const skinMaterials = buildPenguin(THREE, penguinGroup, appearance);
            
            // Animation loop
            let time = 0;
            const animate = () => {
                if (!mounted) return;
                animationRef.current = requestAnimationFrame(animate);
                time += 0.016; // ~60fps
                
                if (autoRotate && penguinGroupRef.current) {
                    penguinGroupRef.current.rotation.y += rotationSpeed;
                }
                
                // Animate skin colors for animated skins
                const skinName = appearance?.skin || 'blue';
                const animConfig = ANIMATED_SKIN_CONFIGS[skinName];
                if (animConfig && skinMaterials && skinMaterials.length > 0) {
                    const t = time * animConfig.speed;
                    const colorIdx = Math.floor(t) % animConfig.colors.length;
                    const nextColorIdx = (colorIdx + 1) % animConfig.colors.length;
                    const blend = t % 1;
                    
                    const fromColor = new THREE.Color(animConfig.colors[colorIdx]);
                    const toColor = new THREE.Color(animConfig.colors[nextColorIdx]);
                    const currentColor = fromColor.clone().lerp(toColor, blend);
                    
                    skinMaterials.forEach(mat => {
                        if (mat && mat.color) {
                            mat.color.copy(currentColor);
                            if (mat.emissive) {
                                mat.emissive.copy(currentColor);
                                mat.emissiveIntensity = 0.15 + Math.sin(t * 2) * 0.05;
                            }
                        }
                    });
                }
                
                renderer.render(scene, camera);
            };
            animate();
        };
        
        initThree();
        
        return () => {
            mounted = false;
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
        };
    }, [size, autoRotate, rotationSpeed]);
    
    // Rebuild penguin when appearance changes
    useEffect(() => {
        if (!penguinGroupRef.current || !sceneRef.current) return;
        
        const rebuild = async () => {
            try {
                const THREE = await import('three');
                console.log('🎨 Rebuilding penguin preview with appearance:', appearance);
                buildPenguin(THREE, penguinGroupRef.current, appearance);
            } catch (error) {
                console.error('Error rebuilding penguin preview:', error);
            }
        };
        
        rebuild();
    }, [appearance]);
    
    return (
        <div 
            ref={mountRef} 
            className={`rounded-xl overflow-hidden ${className}`}
            style={{ width: size, height: size }}
        />
    );
};

// Build penguin mesh from appearance data
function buildPenguin(THREE, group, appearance) {
    // Validate appearance object
    if (!appearance || typeof appearance !== 'object') {
        console.warn('buildPenguin: Invalid appearance object, using defaults');
        appearance = {};
    }
    
    // Clear existing
    while (group.children.length > 0) {
        const child = group.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        group.remove(child);
    }
    
    // Normalize character type - handle both camelCase (from DB) and snake_case (from code)
    let characterType = appearance.characterType || 'penguin';
    // Convert snake_case to camelCase for whale types to match database enum
    if (characterType === 'white_whale') characterType = 'whiteWhale';
    else if (characterType === 'black_whale') characterType = 'blackWhale';
    else if (characterType === 'silver_whale') characterType = 'silverWhale';
    else if (characterType === 'gold_whale') characterType = 'goldWhale';
    
    const skinName = appearance.skin || 'blue';
    const skinColor = SKIN_COLORS[skinName] || SKIN_COLORS.blue;
    
    let voxels = [];
    let characterPalette = null; // Declare at function scope - will be set in character type blocks
    
    // Generate voxels based on character type
    if (characterType === 'penguin') {
        characterPalette = {
            main: skinColor.color,
            mainLight: skinColor.highlight,
            mainDark: skinColor.shadow,
            belly: '#FFFFFF',
            bellyShade: '#E5E5E5',
            beak: '#FFB347',
            beakDark: '#FF8C00',
            feet: '#FFB347',
            feetDark: '#FF8C00'
        };
        
        voxels = [
            ...generateBaseBody(characterPalette.main),
            ...generateHead(characterPalette.main),
            ...generateFlippers(characterPalette.main, true),  // Left flipper
            ...generateFlippers(characterPalette.main, false), // Right flipper
            ...generateFeet()
        ];
    } else if (characterType === 'doginal') {
        characterPalette = generateDogPalette(
            appearance.dogPrimaryColor || '#D2691E',
            appearance.dogSecondaryColor || '#8B4513'
        );
        voxels = [
            ...DoginalGenerators.head(),
            ...DoginalGenerators.body(),
            ...DoginalGenerators.armLeft(),
            ...DoginalGenerators.armRight(),
            ...DoginalGenerators.legLeft(),
            ...DoginalGenerators.legRight(),
            ...DoginalGenerators.tail(),
            ...DoginalGenerators.earLeft(),
            ...DoginalGenerators.earRight()
        ];
        
        // Doginal ALWAYS wears wizard hat - it's part of the character!
        const doginalHat = ASSETS.HATS['wizardHat'] || [];
        if (doginalHat.length > 0) {
            // Offset hat voxels to sit on dog's head (Y+3 for head height, Z+3 for head forward offset)
            const offsetHatVoxels = doginalHat.map(v => ({ ...v, y: v.y + 3, z: v.z + 3 }));
            voxels = [...voxels, ...offsetHatVoxels];
        }
    } else if (characterType === 'frog') {
        characterPalette = generateFrogPalette(
            appearance.frogPrimaryColor || '#6B8E23',
            appearance.frogSecondaryColor || '#556B2F'
        );
        voxels = [
            ...FrogGenerators.head(),
            ...FrogGenerators.body(),
            ...FrogGenerators.flipperLeft(),
            ...FrogGenerators.flipperRight(),
            ...FrogGenerators.footLeft(),
            ...FrogGenerators.footRight()
        ];
    } else if (characterType === 'shrimp') {
        characterPalette = generateShrimpPalette(appearance.shrimpPrimaryColor || '#FF6B4A');
        voxels = [
            ...ShrimpGenerators.head(),
            ...ShrimpGenerators.body(),
            ...ShrimpGenerators.flipperLeft(),
            ...ShrimpGenerators.flipperRight(),
            ...ShrimpGenerators.tail(),
            ...ShrimpGenerators.legs()
        ];
    } else if (characterType === 'duck') {
        characterPalette = DUCK_PALETTE;
        voxels = [
            ...DuckGenerators.head(),
            ...DuckGenerators.body(),
            ...DuckGenerators.armLeft(),
            ...DuckGenerators.armRight(),
            ...DuckGenerators.legLeft(),
            ...DuckGenerators.legRight(),
            ...DuckGenerators.tail()
        ];
    } else if (characterType === 'tungTung') {
        characterPalette = TUNG_PALETTE;
        voxels = [
            ...TungTungGenerators.head(),
            ...TungTungGenerators.body(),
            ...TungTungGenerators.armLeft(),
            ...TungTungGenerators.armRight(),
            ...TungTungGenerators.legLeft(),
            ...TungTungGenerators.legRight()
        ];
    } else if (characterType === 'gake') {
        characterPalette = GAKE_PALETTE;
        voxels = [
            ...GakeGenerators.head(),
            ...GakeGenerators.body(),
            ...GakeGenerators.armLeft(),
            ...GakeGenerators.armRight(),
            ...GakeGenerators.footLeft(),
            ...GakeGenerators.footRight()
        ];
    } else if (characterType === 'pump') {
        characterPalette = PUMP_PALETTE;
        voxels = [
            ...PumpGenerators.head(),
            ...PumpGenerators.body(),
            ...PumpGenerators.armLeft(),
            ...PumpGenerators.armRight(),
            ...PumpGenerators.footLeft(),
            ...PumpGenerators.footRight()
        ];
        
        // Add eyes with offset for pump head (y+5, z+2)
        const PUMP_FACE_OFFSET = 5;
        const pumpEyes = appearance.eyes && appearance.eyes !== 'none' ? ASSETS.EYES[appearance.eyes] : ASSETS.EYES['normal'];
        if (pumpEyes) {
            voxels = [...voxels, ...pumpEyes.map(v => ({ ...v, y: v.y + PUMP_FACE_OFFSET, z: v.z + 2 }))];
        }
        
        // Add mouth with offset (y+5, z+2)
        const pumpMouth = appearance.mouth && appearance.mouth !== 'none' ? ASSETS.MOUTH[appearance.mouth] : ASSETS.MOUTH['beak'];
        if (pumpMouth) {
            voxels = [...voxels, ...pumpMouth.map(v => ({ ...v, y: v.y + PUMP_FACE_OFFSET, z: v.z + 2 }))];
        }
    } else if (characterType === 'marcus') {
        characterPalette = MARCUS_PALETTE;
        voxels = [
            ...MarcusGenerators.generateMarcusBody(MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusHead(MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusFlipper(true, MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusFlipper(false, MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusFoot(true, MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusFoot(false, MARCUS_PALETTE)
        ];
    } else if (characterType === 'whiteWhale' || characterType === 'white_whale') {
        characterPalette = WHITE_WHALE_PALETTE;
        voxels = [
            ...WhiteWhaleGenerators.generateWhaleBody(WHITE_WHALE_PALETTE),
            ...WhiteWhaleGenerators.generateWhaleHead(WHITE_WHALE_PALETTE),
            ...WhiteWhaleGenerators.generateWhaleFlipper(true, WHITE_WHALE_PALETTE),
            ...WhiteWhaleGenerators.generateWhaleFlipper(false, WHITE_WHALE_PALETTE),
            ...WhiteWhaleGenerators.generateWhaleTail(WHITE_WHALE_PALETTE)
        ];
    } else if (characterType === 'blackWhale' || characterType === 'black_whale') {
        characterPalette = BLACK_WHALE_PALETTE;
        voxels = [
            ...BlackWhaleGenerators.generateWhaleBody(BLACK_WHALE_PALETTE),
            ...BlackWhaleGenerators.generateWhaleHead(BLACK_WHALE_PALETTE),
            ...BlackWhaleGenerators.generateWhaleFlipper(true, BLACK_WHALE_PALETTE),
            ...BlackWhaleGenerators.generateWhaleFlipper(false, BLACK_WHALE_PALETTE),
            ...BlackWhaleGenerators.generateWhaleTail(BLACK_WHALE_PALETTE)
        ];
    } else if (characterType === 'silverWhale' || characterType === 'silver_whale') {
        characterPalette = SILVER_WHALE_PALETTE;
        voxels = [
            ...SilverWhaleGenerators.generateWhaleBody(SILVER_WHALE_PALETTE),
            ...SilverWhaleGenerators.generateWhaleHead(SILVER_WHALE_PALETTE),
            ...SilverWhaleGenerators.generateWhaleFlipper(true, SILVER_WHALE_PALETTE),
            ...SilverWhaleGenerators.generateWhaleFlipper(false, SILVER_WHALE_PALETTE),
            ...SilverWhaleGenerators.generateWhaleTail(SILVER_WHALE_PALETTE)
        ];
    } else if (characterType === 'goldWhale' || characterType === 'gold_whale') {
        characterPalette = GOLD_WHALE_PALETTE;
        voxels = [
            ...GoldWhaleGenerators.generateWhaleBody(GOLD_WHALE_PALETTE),
            ...GoldWhaleGenerators.generateWhaleHead(GOLD_WHALE_PALETTE),
            ...GoldWhaleGenerators.generateWhaleFlipper(true, GOLD_WHALE_PALETTE),
            ...GoldWhaleGenerators.generateWhaleFlipper(false, GOLD_WHALE_PALETTE),
            ...GoldWhaleGenerators.generateWhaleTail(GOLD_WHALE_PALETTE)
        ];
    } else {
        // Fallback for unknown character types - use penguin palette
        console.warn(`Unknown character type: ${characterType}, using penguin as fallback`);
        characterPalette = {
            main: skinColor.color,
            mainLight: skinColor.highlight,
            mainDark: skinColor.shadow,
            belly: '#FFFFFF',
            bellyShade: '#E5E5E5',
            beak: '#FFB347',
            beakDark: '#FF8C00',
            feet: '#FFB347',
            feetDark: '#FF8C00'
        };
        voxels = [
            ...generateBaseBody(characterPalette.main),
            ...generateHead(characterPalette.main),
            ...generateFlippers(characterPalette.main, true),
            ...generateFlippers(characterPalette.main, false),
            ...generateFeet()
        ];
    }
    
    // Create voxel mesh
    const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    
    // Group voxels by color for instancing
    const colorGroups = new Map();
    
    voxels.forEach(v => {
        let color = v.c;
        // Resolve palette color names to hex using the character's palette
        if (typeof color === 'string' && !color.startsWith('#')) {
            if (characterPalette) {
                // Use the character-specific palette (works for all character types)
                color = characterPalette[color] || color;
            } else if (characterType === 'penguin') {
                // Fallback for penguin if palette wasn't set
                const palette = {
                    main: skinColor.color,
                    mainLight: skinColor.highlight,
                    mainDark: skinColor.shadow,
                    belly: '#FFFFFF',
                    bellyShade: '#E5E5E5',
                    beak: '#FFB347',
                    beakDark: '#FF8C00',
                    feet: '#FFB347',
                    feetDark: '#FF8C00'
                };
                color = palette[color] || skinColor.color;
            } else {
                // Last resort fallback
                color = skinColor.color;
            }
        }
        
        if (!colorGroups.has(color)) {
            colorGroups.set(color, []);
        }
        colorGroups.get(color).push(v);
    });
    
    // Track skin materials for animation
    const skinMaterials = [];
    const isAnimatedSkin = skinColor.animated === true;
    
    // Create meshes for each color group
    colorGroups.forEach((voxelList, color) => {
        // Check if this is the main skin color
        const isSkinColor = color === skinColor.color || color === skinColor.highlight || color === skinColor.shadow;
        
        let material;
        if (isAnimatedSkin && isSkinColor) {
            // Use StandardMaterial for animated skins (supports emissive)
            material = new THREE.MeshStandardMaterial({ 
                color: color,
                roughness: 0.3,
                metalness: 0.1,
                emissive: new THREE.Color(color),
                emissiveIntensity: 0.15
            });
            skinMaterials.push(material);
        } else {
            material = new THREE.MeshLambertMaterial({ color: color });
        }
        
        voxelList.forEach(v => {
            const mesh = new THREE.Mesh(boxGeo, material);
            mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
            group.add(mesh);
        });
    });
    
    // Add cosmetics (hat, eyes, mouth, body item)
    // Pass characterPalette for proper color resolution in cosmetics
    addCosmetics(THREE, group, appearance, characterType, characterPalette || skinColor);
    
    // Add mount if present
    addMount(THREE, group, appearance);
    
    // Return skin materials for animation
    return skinMaterials;
}

// Add cosmetics to the penguin
function addCosmetics(THREE, group, appearance, characterType, paletteOrSkinColor) {
    // Determine the palette to use for cosmetics
    // If paletteOrSkinColor is an object (palette), use it; otherwise use default PALETTE
    const cosmeticsPalette = (paletteOrSkinColor && typeof paletteOrSkinColor === 'object' && !paletteOrSkinColor.color) 
        ? paletteOrSkinColor 
        : PALETTE;
    
    // Add hat - with offset for special characters
    if (appearance.hat && appearance.hat !== 'none' && ASSETS.HATS && ASSETS.HATS[appearance.hat]) {
        let hatVoxels = ASSETS.HATS[appearance.hat];
        if (hatVoxels && hatVoxels.length > 0) {
            // Apply offset for Gake (raised head, y+2)
            if (characterType === 'gake') {
                hatVoxels = hatVoxels.map(v => ({ ...v, y: v.y + 2 }));
            }
            const hatGroup = buildVoxelGroup(THREE, hatVoxels, cosmeticsPalette);
            hatGroup.name = 'hat';
            group.add(hatGroup);
        }
    }
    
    // Add eyes - with offset for TungTung and Gake characters
    const eyesKey = appearance.eyes && ASSETS.EYES && ASSETS.EYES[appearance.eyes] ? appearance.eyes : 'normal';
    if (ASSETS.EYES && ASSETS.EYES[eyesKey]) {
        let eyesVoxels = ASSETS.EYES[eyesKey];
        if (eyesVoxels && eyesVoxels.length > 0) {
            // Apply offset for TungTung (tall cylinder - face on upper half, y+21)
            if (characterType === 'tungTung') {
                eyesVoxels = eyesVoxels.map(v => ({ ...v, y: v.y + 21, z: v.z + 1 }));
            }
            // Apply offset for Gake (raised head, y+2)
            if (characterType === 'gake') {
                eyesVoxels = eyesVoxels.map(v => ({ ...v, y: v.y + 2 }));
            }
            const eyesGroup = buildVoxelGroup(THREE, eyesVoxels, cosmeticsPalette);
            eyesGroup.name = 'eyes';
            group.add(eyesGroup);
        }
    }
    
    // Add mouth (ASSETS.MOUTH is an alias for MOUTHS) - with offset for TungTung and Gake characters
    const mouthKey = appearance.mouth && ASSETS.MOUTH && ASSETS.MOUTH[appearance.mouth] ? appearance.mouth : 'beak';
    if (ASSETS.MOUTH && ASSETS.MOUTH[mouthKey]) {
        let mouthVoxels = ASSETS.MOUTH[mouthKey];
        if (mouthVoxels && mouthVoxels.length > 0) {
            // Apply offset for TungTung (tall cylinder - face on upper half, y+21)
            if (characterType === 'tungTung') {
                mouthVoxels = mouthVoxels.map(v => ({ ...v, y: v.y + 21, z: v.z + 1 }));
            }
            // Apply offset for Gake (raised head, y+2)
            if (characterType === 'gake') {
                mouthVoxels = mouthVoxels.map(v => ({ ...v, y: v.y + 2 }));
            }
            const mouthGroup = buildVoxelGroup(THREE, mouthVoxels, cosmeticsPalette);
            mouthGroup.name = 'mouth';
            group.add(mouthGroup);
        }
    }
    
    // Add body item
    if (appearance.bodyItem && appearance.bodyItem !== 'none' && ASSETS.BODY && ASSETS.BODY[appearance.bodyItem]) {
        const bodyItemInfo = ASSETS.BODY[appearance.bodyItem];
        const isHideBodyItem = bodyItemInfo?.hideBody === true;
        
        if (!isHideBodyItem) {
            const bodyVoxels = bodyItemInfo?.voxels || bodyItemInfo || [];
            if (bodyVoxels && bodyVoxels.length > 0) {
                const bodyGroup = buildVoxelGroup(THREE, bodyVoxels, cosmeticsPalette);
                bodyGroup.name = 'bodyItem';
                group.add(bodyGroup);
            }
        }
    }
}

// Add mount to the penguin
function addMount(THREE, group, appearance) {
    if (!appearance.mount || appearance.mount === 'none' || !ASSETS.MOUNTS || !ASSETS.MOUNTS[appearance.mount]) {
        return;
    }
    
    const mountData = ASSETS.MOUNTS[appearance.mount];
    const mountGroup = new THREE.Group();
    mountGroup.name = 'mount';
    
    // Build mount hull voxels
    if (mountData.voxels && mountData.voxels.length > 0) {
        const mountMesh = buildVoxelGroup(THREE, mountData.voxels, PALETTE);
        mountMesh.name = 'mount_hull';
        mountGroup.add(mountMesh);
    }
    
    // Build oars for boat mounts
    if (mountData.leftOar && mountData.leftOar.length > 0) {
        const leftOarMesh = buildVoxelGroup(THREE, mountData.leftOar, PALETTE);
        leftOarMesh.name = 'left_oar';
        mountGroup.add(leftOarMesh);
    }
    
    if (mountData.rightOar && mountData.rightOar.length > 0) {
        const rightOarMesh = buildVoxelGroup(THREE, mountData.rightOar, PALETTE);
        rightOarMesh.name = 'right_oar';
        mountGroup.add(rightOarMesh);
    }
    
    // Build wheels for shopping cart
    if (mountData.wheelFL) {
        const wheelMesh = buildVoxelGroup(THREE, mountData.wheelFL, PALETTE);
        wheelMesh.name = 'wheel_fl';
        mountGroup.add(wheelMesh);
    }
    if (mountData.wheelFR) {
        const wheelMesh = buildVoxelGroup(THREE, mountData.wheelFR, PALETTE);
        wheelMesh.name = 'wheel_fr';
        mountGroup.add(wheelMesh);
    }
    if (mountData.wheelBL) {
        const wheelMesh = buildVoxelGroup(THREE, mountData.wheelBL, PALETTE);
        wheelMesh.name = 'wheel_bl';
        mountGroup.add(wheelMesh);
    }
    if (mountData.wheelBR) {
        const wheelMesh = buildVoxelGroup(THREE, mountData.wheelBR, PALETTE);
        wheelMesh.name = 'wheel_br';
        mountGroup.add(wheelMesh);
    }
    
    // Build trucks for skateboard
    if (mountData.frontTruck) {
        const truckMesh = buildVoxelGroup(THREE, mountData.frontTruck, PALETTE);
        truckMesh.name = 'front_truck';
        mountGroup.add(truckMesh);
    }
    if (mountData.backTruck) {
        const truckMesh = buildVoxelGroup(THREE, mountData.backTruck, PALETTE);
        truckMesh.name = 'back_truck';
        mountGroup.add(truckMesh);
    }
    
    if (mountGroup.children.length > 0) {
        // Apply scale if specified
        const mountScale = mountData.scale || 0.2;
        mountGroup.scale.set(mountScale, mountScale, mountScale);
        
        // Apply position offset
        mountGroup.position.y = mountData.positionY ?? 0.4;
        
        // Apply rotation if specified (e.g., shopping cart)
        if (mountData.mountRotation) {
            mountGroup.rotation.y = mountData.mountRotation;
        }
        
        group.add(mountGroup);
    }
}

// Helper function to build voxel group from voxel array
function buildVoxelGroup(THREE, voxels, palette) {
    const group = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    
    // Group voxels by color
    const colorGroups = new Map();
    
    voxels.forEach(v => {
        let color = v.c;
        // Resolve palette color names to hex
        if (typeof color === 'string' && !color.startsWith('#')) {
            color = palette[color] || color;
        }
        
        if (!colorGroups.has(color)) {
            colorGroups.set(color, []);
        }
        colorGroups.get(color).push(v);
    });
    
    // Create meshes for each color group
    colorGroups.forEach((voxelList, color) => {
        const material = new THREE.MeshLambertMaterial({ color: color });
        
        voxelList.forEach(v => {
            const mesh = new THREE.Mesh(boxGeo, material);
            mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
            group.add(mesh);
        });
    });
    
    return group;
}

export default PenguinPreview3D;

