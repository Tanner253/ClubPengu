/**
 * PenguinCreatorOverlay - In-game penguin customization overlay
 * 
 * Opens when player enters the Personal Igloo (Wardrobe).
 * Mirrors the full VoxelPenguinDesigner functionality.
 * Allows changing appearance without disconnecting from the game.
 * Updates are synced to server in real-time.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { VOXEL_SIZE, PALETTE } from '../constants';
import { ASSETS } from '../assets/index';
import { generateBaseBody, generateFlippers, generateFeet, generateHead } from '../generators';
import { useMultiplayer } from '../multiplayer';
import { 
    DoginalGenerators,
    generateDogPalette,
    FrogGenerators,
    generateFrogPalette,
    ShrimpGenerators,
    generateShrimpPalette
} from '../characters';

// FREE items that are always available (not in database)
const FREE_DEFAULT_COSMETICS = ['none', 'normal', 'beak'];
const FREE_SKIN_COLORS = ['blue']; // Only blue is free by default

// TEMPORARY: Client-side unlock all cosmetics bypass (matches server UNLOCK_ALL_COSMETICS)
const UNLOCK_ALL_COSMETICS = import.meta.env.VITE_UNLOCK_ALL_COSMETICS === 'true';

// PREMIUM SKIN COLORS (gacha drops) - All colors except blue require unlock
// This matches VoxelPenguinDesigner - used as fallback when database hasn't loaded
const PREMIUM_SKIN_COLORS = [
    // COMMON - Former free colors + basics
    'red', 'green', 'yellow', 'pink', 'purple', 'orange', 'black', 'white', 'cyan',
    'grey', 'brown', 'beige', 'tan', 'cream', 'ivory',
    
    // UNCOMMON - Nice variations
    'gold', 'silver', 'bronze', 'copper', 'platinum',
    'teal', 'lime', 'coral', 'salmon', 'olive', 'forest', 'moss', 'sage', 'seafoam',
    'sky', 'azure', 'cerulean', 'aqua', 'turquoise',
    'tangerine', 'peach', 'apricot', 'amber', 'honey', 'mustard', 'rust',
    'periwinkle', 'lilac', 'mauve', 'plum',
    
    // RARE - Distinctive colors
    'lavender', 'mint', 'blush', 'rose', 'bubblegum', 'cotton', 'powder', 'baby', 'lemon', 'canary',
    'navy', 'maroon', 'burgundy', 'wine', 'crimson', 'scarlet', 'cherry', 'ruby',
    'darkBlue', 'midnight', 'indigo', 'violet', 'magenta', 'fuchsia',
    'sapphire', 'emerald', 'amethyst', 'topaz', 'jade',
    'hotPink', 'electricBlue', 'neonGreen', 'neonOrange', 'neonPink', 'neonYellow',
    
    // EPIC - Special colors (animated)
    'rainbow', 'galaxy', 'aurora', 'sunset', 'ocean', 'lava', 'ice', 'prismatic',
    'roseGold', 'champagne', 'neonCyan', 'neonPurple', 'neonRed',
    
    // LEGENDARY - Animated + glow
    'chromatic', 'holographic', 'starlight', 'nebula', 'plasma', 'inferno', 'arctic',
    
    // MYTHIC - Ultra rare
    'voidblack', 'ethereal', 'singularity', 'supernova', 'phantom',
    
    // DIVINE - Extremely rare
    'celestial', 'cosmic', 'transcendent'
];

// ALL skin colors (base + premium) - used for fallback when database not loaded
const ALL_SKIN_COLORS = [...FREE_SKIN_COLORS, ...PREMIUM_SKIN_COLORS];

function PenguinCreatorOverlay({ isOpen, onClose, currentData, onSave }) {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const penguinGroupRef = useRef(null);
    const animationRef = useRef(null);
    const threeRef = useRef(null);
    const controlsRef = useRef(null);
    
    // Get multiplayer context for unlocked items and cosmetics
    const { userData, isAuthenticated, redeemPromoCode, allCosmetics, fetchAllCosmetics } = useMultiplayer();
    
    // Load cosmetics from database on mount
    useEffect(() => {
        if (isOpen && !allCosmetics) {
            fetchAllCosmetics();
        }
    }, [isOpen, allCosmetics, fetchAllCosmetics]);
    
    // Unlocked items from user data - match VoxelPenguinDesigner structure
    const unlockedMounts = useMemo(() => userData?.unlockedMounts || userData?.unlocks?.mounts || [], [userData]);
    const unlockedCosmetics = useMemo(() => userData?.unlockedCosmetics || userData?.unlocks?.cosmetics || [], [userData]);
    const unlockedCharacters = useMemo(() => {
        // Check both possible locations for unlocked characters
        if (userData?.unlockedCharacters && Array.isArray(userData.unlockedCharacters)) {
            return userData.unlockedCharacters;
        }
        if (userData?.unlocks?.characters && Array.isArray(userData.unlocks.characters)) {
            return userData.unlocks.characters;
        }
        return [];
    }, [userData]);
    const gachaOwnedCosmetics = useMemo(() => {
        if (isAuthenticated && userData?.gachaOwnedCosmetics) {
            return userData.gachaOwnedCosmetics;
        }
        return [];
    }, [isAuthenticated, userData?.gachaOwnedCosmetics]);
    
    // Local state for editing - initialize from currentData
    const [skinColor, setSkinColor] = useState(currentData?.skin || 'blue');
    const [hat, setHat] = useState(currentData?.hat || 'none');
    const [eyes, setEyes] = useState(currentData?.eyes || 'normal');
    const [mouth, setMouth] = useState(currentData?.mouth || 'beak');
    const [bodyItem, setBodyItem] = useState(currentData?.bodyItem || 'none');
    const [mount, setMount] = useState(currentData?.mount || 'none');
    const [characterType, setCharacterType] = useState(currentData?.characterType || 'penguin');
    
    // Doginal colors
    const [dogPrimaryColor, setDogPrimaryColor] = useState(currentData?.dogPrimaryColor || '#D2691E');
    const [dogSecondaryColor, setDogSecondaryColor] = useState(currentData?.dogSecondaryColor || '#8B4513');
    
    // Frog colors
    const [frogPrimaryColor, setFrogPrimaryColor] = useState(currentData?.frogPrimaryColor || '#6B8E23');
    const [frogSecondaryColor, setFrogSecondaryColor] = useState(currentData?.frogSecondaryColor || '#556B2F');
    
    // Shrimp color
    const [shrimpPrimaryColor, setShrimpPrimaryColor] = useState(currentData?.shrimpPrimaryColor || '#FF6B4A');
    
    // Show owned only toggle
    const [showOwnedOnly, setShowOwnedOnly] = useState(false);
    
    // Promo code state
    const [promoCode, setPromoCode] = useState('');
    const [promoMessage, setPromoMessage] = useState(null);
    const [promoLoading, setPromoLoading] = useState(false);
    
    // Update local state when currentData changes
    useEffect(() => {
        if (currentData && isOpen) {
            setSkinColor(currentData.skin || 'blue');
            setHat(currentData.hat || 'none');
            setEyes(currentData.eyes || 'normal');
            setMouth(currentData.mouth || 'beak');
            setBodyItem(currentData.bodyItem || 'none');
            setMount(currentData.mount || 'none');
            setCharacterType(currentData.characterType || 'penguin');
            if (currentData.dogPrimaryColor) setDogPrimaryColor(currentData.dogPrimaryColor);
            if (currentData.dogSecondaryColor) setDogSecondaryColor(currentData.dogSecondaryColor);
            if (currentData.frogPrimaryColor) setFrogPrimaryColor(currentData.frogPrimaryColor);
            if (currentData.frogSecondaryColor) setFrogSecondaryColor(currentData.frogSecondaryColor);
            if (currentData.shrimpPrimaryColor) setShrimpPrimaryColor(currentData.shrimpPrimaryColor);
        }
    }, [currentData, isOpen]);
    
    // Default cosmetics that are free for everyone (including guests)
    const FREE_DEFAULT_COSMETICS = ['none', 'normal', 'beak'];
    
    // Check if a cosmetic is unlocked (or doesn't require unlock)
    const isCosmeticUnlocked = useCallback((itemName, category = null) => {
        // TEMPORARY: Unlock all cosmetics for everyone
        if (UNLOCK_ALL_COSMETICS) return true;
        
        // Default items are always available
        if (FREE_DEFAULT_COSMETICS.includes(itemName)) return true;
        
        // Guests cannot own ANY non-default cosmetics
        if (!isAuthenticated) return false;
        
        // Check gacha-owned cosmetics (templateId format: category_assetKey)
        // Try both with and without category prefix since server returns templateId
        if (gachaOwnedCosmetics.includes(itemName)) {
            return true;
        }
        
        // Also check with category prefix (server stores as "hat_topHat", "eyes_bored", etc.)
        if (category) {
            const templateId = `${category}_${itemName}`;
            if (gachaOwnedCosmetics.includes(templateId)) {
                return true;
            }
        }
        
        // Check promo unlocked
        if (unlockedCosmetics.includes(itemName)) return true;
        
        // All non-free items require gacha unlock or promo code
        return false;
    }, [isAuthenticated, gachaOwnedCosmetics, unlockedCosmetics]);
    
    // Check if mount is unlocked
    const isMountUnlocked = useCallback((mountName) => {
        // TEMPORARY: Unlock all for everyone
        if (UNLOCK_ALL_COSMETICS) return true;
        if (mountName === 'none') return true;
        return unlockedMounts.includes(mountName);
    }, [unlockedMounts]);
    
    // Get cosmetics from database, fallback to ASSETS + hardcoded colors for backwards compatibility
    const cosmeticsFromDB = useMemo(() => {
        if (!allCosmetics) {
            // Fallback to ASSETS + hardcoded skin colors if database not loaded yet
            // Use ALL_SKIN_COLORS so count is correct even before DB loads
            return {
                skin: ALL_SKIN_COLORS, // Use all colors as fallback, not just FREE_SKIN_COLORS
                hat: Object.keys(ASSETS.HATS || {}),
                eyes: Object.keys(ASSETS.EYES || {}),
                mouth: Object.keys(ASSETS.MOUTH || {}),
                bodyItem: Object.keys(ASSETS.BODY || {}),
                mount: Object.keys(ASSETS.MOUNTS || {})
            };
        }
        
        // Load from database - merge with hardcoded colors for skin (database may not have all colors)
        const dbSkinColors = allCosmetics.skin?.map(c => c.id) || [];
        const mergedSkinColors = [...new Set([...ALL_SKIN_COLORS, ...dbSkinColors])];
        
        return {
            skin: mergedSkinColors,
            hat: ['none', ...(allCosmetics.hat?.map(c => c.id) || []), ...Object.keys(ASSETS.HATS || {})].filter((v, i, a) => a.indexOf(v) === i),
            eyes: ['none', 'normal', ...(allCosmetics.eyes?.map(c => c.id) || []), ...Object.keys(ASSETS.EYES || {})].filter((v, i, a) => a.indexOf(v) === i),
            mouth: ['none', 'beak', ...(allCosmetics.mouth?.map(c => c.id) || []), ...Object.keys(ASSETS.MOUTH || {})].filter((v, i, a) => a.indexOf(v) === i),
            bodyItem: ['none', ...(allCosmetics.bodyItem?.map(c => c.id) || []), ...Object.keys(ASSETS.BODY || {})].filter((v, i, a) => a.indexOf(v) === i),
            mount: ['none', ...(allCosmetics.mount?.map(c => c.id) || []), ...Object.keys(ASSETS.MOUNTS || {})].filter((v, i, a) => a.indexOf(v) === i)
        };
    }, [allCosmetics]);
    
    // Check if skin color is unlocked
    const isSkinColorUnlocked = useCallback((color) => {
        // TEMPORARY: Unlock all for everyone
        if (UNLOCK_ALL_COSMETICS) return true;
        // Free colors are always unlocked
        if (FREE_SKIN_COLORS.includes(color)) return true;
        // Check if owned via gacha or promo
        return gachaOwnedCosmetics.includes(`skin_${color}`) || unlockedCosmetics.includes(`skin_${color}`);
    }, [gachaOwnedCosmetics, unlockedCosmetics]);
    
    // Get available options based on showOwnedOnly - Loaded from database
    const options = useMemo(() => {
        const allOptions = {
            skin: cosmeticsFromDB.skin,
            head: cosmeticsFromDB.hat,
            eyes: cosmeticsFromDB.eyes,
            mouth: cosmeticsFromDB.mouth,
            body: cosmeticsFromDB.bodyItem,
            mounts: cosmeticsFromDB.mount
        };
        
        if (!showOwnedOnly || !isAuthenticated) {
            return allOptions;
        }
        
        // Filter to only owned/unlocked items
        // For skins, include free colors + any gacha-won skin colors
        const ownedSkinColors = gachaOwnedCosmetics
            .filter(id => id.startsWith('skin_'))
            .map(id => id.replace('skin_', ''));
        const unlockedSkinOptions = [...new Set([...FREE_SKIN_COLORS, ...ownedSkinColors])];
        
        // Ensure 'beak' and 'normal' are always in the lists (they're defaults, not selectable but should be visible)
        const mouthOptions = allOptions.mouth.filter(k => k === 'none' || k === 'beak' || isCosmeticUnlocked(k, 'mouth'));
        if (!mouthOptions.includes('beak')) mouthOptions.push('beak');
        
        const eyesOptions = allOptions.eyes.filter(k => k === 'none' || k === 'normal' || isCosmeticUnlocked(k, 'eyes'));
        if (!eyesOptions.includes('normal')) eyesOptions.push('normal');
        
        return {
            skin: unlockedSkinOptions,
            head: allOptions.head.filter(k => k === 'none' || isCosmeticUnlocked(k, 'hat')),
            eyes: eyesOptions,
            mouth: mouthOptions,
            body: allOptions.body.filter(k => k === 'none' || isCosmeticUnlocked(k, 'bodyItem')),
            mounts: allOptions.mounts.filter(k => k === 'none' || isMountUnlocked(k))
        };
    }, [showOwnedOnly, isAuthenticated, isCosmeticUnlocked, isMountUnlocked, gachaOwnedCosmetics, cosmeticsFromDB]);
    
    // Available characters - match VoxelPenguinDesigner logic
    const availableCharacters = useMemo(() => {
        const chars = [{ id: 'penguin', name: 'Penguin', emoji: '🐧' }];
        
        // Check if each character is unlocked
        unlockedCharacters.forEach(charId => {
            if (charId === 'doginal') chars.push({ id: 'doginal', name: 'Doginal', emoji: '🐕' });
            else if (charId === 'frog') chars.push({ id: 'frog', name: 'PEPE Frog', emoji: '🐸' });
            else if (charId === 'marcus') chars.push({ id: 'marcus', name: 'Marcus', emoji: '🦁' });
            else if (charId === 'white_whale') chars.push({ id: 'white_whale', name: 'White Whale', emoji: '🐋' });
            else if (charId === 'black_whale') chars.push({ id: 'black_whale', name: 'Black Whale', emoji: '🐋' });
            else if (charId === 'silver_whale') chars.push({ id: 'silver_whale', name: 'Silver Whale', emoji: '🐋' });
            else if (charId === 'gold_whale') chars.push({ id: 'gold_whale', name: 'Gold Whale', emoji: '🐋' });
        });
        
        return chars;
    }, [unlockedCharacters]);
    
    // Cycle function for cosmetics
    // Only skip "none" for eyes (default: "normal") and mouth (default: "beak")
    // Other categories can have "none" as a selectable option
    // NOTE: "normal" and "beak" should be selectable options, not just defaults
    const cycle = useCallback((current, list, setter, dir, defaultVal = null) => {
        // For eyes and mouth, only filter out "none" (keep defaultVal like "normal" and "beak" as selectable)
        // For other categories, allow "none" to be selectable
        const shouldSkipNone = defaultVal !== null && defaultVal !== 'none';
        const filteredList = shouldSkipNone 
            ? list.filter(item => item !== 'none')  // Only filter out 'none', keep defaultVal in the list
            : list;
        
        if (filteredList.length === 0) return;
        
        // If current is "none" (for eyes/mouth), start from first/last item
        if (shouldSkipNone && current === 'none') {
            setter(dir > 0 ? filteredList[0] : filteredList[filteredList.length - 1]);
            return;
        }
        
        const idx = filteredList.indexOf(current);
        let nextIdx = idx === -1 ? 0 : idx + dir;
        if (nextIdx < 0) nextIdx = filteredList.length - 1;
        if (nextIdx >= filteredList.length) nextIdx = 0;
        setter(filteredList[nextIdx]);
    }, []);
    
    // Initialize Three.js preview
    useEffect(() => {
        if (!isOpen || !mountRef.current) return;
        
        let mounted = true;
        
        const initThree = async () => {
            const THREE = await import('three');
            const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
            threeRef.current = THREE;
            
            if (!mounted || !mountRef.current) return;
            
            // Scene setup
            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a2e);
            sceneRef.current = scene;
            
            // Camera - positioned to allow maximum upward viewing range
            const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
            camera.position.set(0, 3, 15);
            camera.lookAt(0, 0, 0); // Look at ground level (allows camera to go well below for upward viewing)
            cameraRef.current = camera;
            
            // Renderer - detect mobile for performance optimizations
            const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const isAndroidDevice = /Android/i.test(navigator.userAgent);
            const isMobileGPU = isIOSDevice || isAndroidDevice;
            
            const rendererOptions = {
                antialias: !isMobileGPU,
                alpha: false
            };
            if (isMobileGPU) {
                rendererOptions.precision = 'mediump';
            }
            const renderer = new THREE.WebGLRenderer(rendererOptions);
            
            // Get actual container dimensions (for responsive sizing)
            const containerWidth = mountRef.current.clientWidth || 280;
            const containerHeight = mountRef.current.clientHeight || 280;
            renderer.setSize(containerWidth, containerHeight);
            
            // Mobile: cap DPR at 1.0 to avoid rendering 4-9x more pixels
            const dpr = isMobileGPU ? Math.min(window.devicePixelRatio, 1.0) : Math.min(window.devicePixelRatio, 2);
            renderer.setPixelRatio(dpr);
            
            // Clear existing
            while (mountRef.current.firstChild) {
                mountRef.current.removeChild(mountRef.current.firstChild);
            }
            mountRef.current.appendChild(renderer.domElement);
            rendererRef.current = renderer;
            
            // OrbitControls for camera interaction (zoom, rotate, look up/down)
            const controls = new OrbitControls(camera, renderer.domElement);
            controls.target.set(0, -2, 0); // Look below ground level (allows camera to go much lower for maximum upward viewing)
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 2; // Minimum zoom distance (closer)
            controls.maxDistance = 30; // Maximum zoom distance
            // Allow looking much further up - negative values allow camera to go below target
            // -Math.PI/2 (-90 degrees) would be camera directly below target looking straight up
            // Using -1.5 radians (~-86 degrees) allows near-maximum upward viewing
            controls.minPolarAngle = -1.5; // Allow looking much further up (negative = camera can go below target)
            controls.maxPolarAngle = Math.PI; // Allow looking straight down (π radians = down)
            controls.enablePan = false; // Disable panning (only rotate and zoom)
            // Increase vertical rotation speed for better control
            controls.rotateSpeed = 1.0;
            // Remove any automatic up vector constraints that might limit vertical rotation
            controls.screenSpacePanning = false;
            controlsRef.current = controls;
            
            // Lighting
            const ambient = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambient);
            
            const directional = new THREE.DirectionalLight(0xffffff, 0.8);
            directional.position.set(5, 10, 5);
            scene.add(directional);
            
            // Penguin group
            const penguinGroup = new THREE.Group();
            scene.add(penguinGroup);
            penguinGroupRef.current = penguinGroup;
            
            // Animation loop - update controls for smooth damping
            const animate = () => {
                if (!mounted) return;
                animationRef.current = requestAnimationFrame(animate);
                
                // Update controls (for damping) and render
                if (controlsRef.current && cameraRef.current && sceneRef.current && rendererRef.current) {
                    controlsRef.current.update();
                    rendererRef.current.render(sceneRef.current, cameraRef.current);
                }
            };
            animate();
        };
        
        initThree();
        
        return () => {
            mounted = false;
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (controlsRef.current) {
                controlsRef.current.dispose();
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
        };
    }, [isOpen]);
    
    // Rebuild penguin when any appearance option changes or when opened
    useEffect(() => {
        if (!isOpen) return; // Don't rebuild if not open
        
        // Wait for Three.js to be fully initialized before building penguin
        const buildPenguin = () => {
        const THREE = threeRef.current;
        const group = penguinGroupRef.current;
            
            if (!THREE || !group || !rendererRef.current) {
                // If not ready, wait and try again
                setTimeout(buildPenguin, 50);
                return;
            }
        
        // Clear existing
        while (group.children.length > 0) {
            const child = group.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
            group.remove(child);
        }
        
        // Generate voxels based on character type
        let voxels = [];
        let palette = {};
        
        if (characterType === 'penguin') {
            const colorVal = PALETTE[skinColor] || skinColor || '#3B82F6';
            palette = {
                main: colorVal,
                mainLight: colorVal,
                mainDark: colorVal,
                belly: '#FFFFFF',
                bellyShade: '#E5E5E5',
                beak: '#FFB347',
                beakDark: '#FF8C00',
                feet: '#FFB347',
                feetDark: '#FF8C00'
            };
            
            // Generate flippers separately for left and right
            const flipperColor = palette.main || colorVal;
            voxels = [
                ...generateBaseBody(colorVal),  // Pass color string, not palette object
                ...generateHead(colorVal),      // Pass color string, not palette object
                ...generateFlippers(flipperColor, true),  // Left flipper
                ...generateFlippers(flipperColor, false), // Right flipper
                ...generateFeet()  // Feet don't need color parameter
            ];
            
            // Add hat voxels (same as designer - always check if exists)
            const hatVoxels = ASSETS.HATS[hat] || [];
            if (hatVoxels.length > 0) {
                voxels = [...voxels, ...hatVoxels];
            }
            
            // Add eyes voxels (same as designer - always render, "normal" is default)
            const eyeVoxels = ASSETS.EYES[eyes] || [];
            if (eyeVoxels.length > 0) {
                voxels = [...voxels, ...eyeVoxels];
            }
            
            // Add mouth voxels (same as designer - always render, "beak" is default)
            const mouthVoxels = ASSETS.MOUTH[mouth] || [];
            if (mouthVoxels.length > 0) {
                voxels = [...voxels, ...mouthVoxels];
            }
            
            // Add body item voxels (same as designer - check for hideBody property)
            const bodyItemData = ASSETS.BODY[bodyItem];
            const bodyItemVoxels = bodyItemData?.voxels || bodyItemData || [];
            
            // Check if bodyItem hides the body (e.g., "joe" clothing)
            const hideBody = bodyItemData?.hideBody === true;
            
            // Only add body item if it exists and doesn't hide body (body is already added above)
            if (bodyItemVoxels.length > 0 && !hideBody) {
                voxels = [...voxels, ...bodyItemVoxels];
            }
        } else if (characterType === 'doginal') {
            palette = generateDogPalette(dogPrimaryColor, dogSecondaryColor);
            // Use correct generator methods (same as VoxelPenguinDesigner)
            const dogVoxels = [
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
                dogVoxels.push(...offsetHatVoxels);
            }
            
            // Add body item (trenchcoat, etc.) for Doginal
            const dogBodyItemData = ASSETS.BODY[bodyItem];
            const dogBodyItemVoxels = dogBodyItemData?.voxels || dogBodyItemData || [];
            if (dogBodyItemVoxels.length > 0) {
                // Offset for dog body position (Y_OFFSET=4, adjust by -4 from penguin)
                const offsetBodyVoxels = dogBodyItemVoxels.map(v => ({ ...v, y: v.y - 4 }));
                dogVoxels.push(...offsetBodyVoxels);
            }
            
            voxels = dogVoxels;
        } else if (characterType === 'frog') {
            palette = generateFrogPalette(frogPrimaryColor, frogSecondaryColor);
            // Use correct generator methods (same as VoxelPenguinDesigner)
            const frogVoxels = [
                ...FrogGenerators.head(),
                ...FrogGenerators.body(),
                ...FrogGenerators.flipperLeft(),
                ...FrogGenerators.flipperRight(),
                ...FrogGenerators.footLeft(),
                ...FrogGenerators.footRight()
            ];
            
            // Add hat support for frog (offset for frog head position)
            const frogHatVoxels = ASSETS.HATS[hat] || [];
            if (frogHatVoxels.length > 0) {
                // Offset hat voxels to sit on frog's head (Y+1 for head height, Z+2 for head forward offset)
                // Lowered by 1 voxel from Y+2 to Y+1 for better fit
                const offsetHatVoxels = frogHatVoxels.map(v => ({ ...v, y: v.y + 1, z: v.z + 2 }));
                frogVoxels.push(...offsetHatVoxels);
            }
            
            // Add body item for frog - raise by 2 voxels for better fit
            const frogBodyItemData = ASSETS.BODY[bodyItem];
            const frogBodyItemVoxels = frogBodyItemData?.voxels || frogBodyItemData || [];
            if (frogBodyItemVoxels.length > 0) {
                // Raise clothing by 2 voxels on Y axis for better fit on frog
                const offsetBodyVoxels = frogBodyItemVoxels.map(v => ({ ...v, y: v.y + 2 }));
                frogVoxels.push(...offsetBodyVoxels);
            }
            
            voxels = frogVoxels;
        } else if (characterType === 'shrimp') {
            // Shrimp character - segmented body with tail flappers and clawed arms
            palette = generateShrimpPalette(shrimpPrimaryColor || '#FF6B4A');
            const shrimpVoxels = [
                ...ShrimpGenerators.head(),
                ...ShrimpGenerators.body(),
                ...ShrimpGenerators.flipperLeft(),
                ...ShrimpGenerators.flipperRight(),
                ...ShrimpGenerators.tail(),
                ...ShrimpGenerators.legs()
            ];
            
            // Add hat support for shrimp (offset for shrimp head position)
            const shrimpHatVoxels = ASSETS.HATS[hat] || [];
            if (shrimpHatVoxels.length > 0) {
                // Offset hat voxels: Y+1, Z+2 (pushed back toward tail)
                const offsetHatVoxels = shrimpHatVoxels.map(v => ({ ...v, y: v.y + 1, z: v.z + 2 }));
                shrimpVoxels.push(...offsetHatVoxels);
            }
            
            // Add body item for shrimp (lowered by 4 from previous)
            const shrimpBodyItemData = ASSETS.BODY[bodyItem];
            const shrimpBodyItemVoxels = shrimpBodyItemData?.voxels || shrimpBodyItemData || [];
            if (shrimpBodyItemVoxels.length > 0) {
                // Offset for shrimp body position: lowered by 4 (was +2, now -2)
                const offsetBodyVoxels = shrimpBodyItemVoxels.map(v => ({ ...v, y: v.y - 2 }));
                shrimpVoxels.push(...offsetBodyVoxels);
            }
            
            voxels = shrimpVoxels;
        }
        
            // Create voxel meshes with proper color resolution
        const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
        
            // Group voxels by color for better performance
            const colorGroups = new Map();
        voxels.forEach(v => {
            let color = v.c;
                // Resolve palette colors (for doginal/frog, palette keys like 'main', 'belly', etc.)
            if (typeof color === 'string' && !color.startsWith('#')) {
                color = palette[color] || PALETTE[color] || '#888888';
            }
            
                if (!colorGroups.has(color)) {
                    colorGroups.set(color, []);
                }
                colorGroups.get(color).push(v);
            });
            
            // Create meshes for each color group
            colorGroups.forEach((voxelList, color) => {
            const material = new THREE.MeshLambertMaterial({ color });
                
                voxelList.forEach(v => {
            const mesh = new THREE.Mesh(boxGeo, material);
            mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
            group.add(mesh);
        });
            });
            
            // Add mount if equipped
            if (mount && mount !== 'none' && ASSETS.MOUNTS && ASSETS.MOUNTS[mount]) {
                const mountData = ASSETS.MOUNTS[mount];
                const mountGroup = new THREE.Group();
                mountGroup.name = 'mount';
                
                // Build mount hull voxels
                if (mountData.voxels && mountData.voxels.length > 0) {
                    mountData.voxels.forEach(voxel => {
                        let color = voxel.c;
                        if (typeof color === 'string' && !color.startsWith('#')) {
                            color = PALETTE[color] || '#888888';
                        }
                        const material = new THREE.MeshLambertMaterial({ color });
                        const mesh = new THREE.Mesh(boxGeo, material);
                        mesh.position.set(voxel.x * VOXEL_SIZE, voxel.y * VOXEL_SIZE, voxel.z * VOXEL_SIZE);
                        mountGroup.add(mesh);
                    });
                }
                
                // Build left oar
                if (mountData.leftOar && mountData.leftOar.length > 0) {
                    mountData.leftOar.forEach(voxel => {
                        let color = voxel.c;
                        if (typeof color === 'string' && !color.startsWith('#')) {
                            color = PALETTE[color] || '#888888';
                        }
                        const material = new THREE.MeshLambertMaterial({ color });
                        const mesh = new THREE.Mesh(boxGeo, material);
                        mesh.position.set(voxel.x * VOXEL_SIZE, voxel.y * VOXEL_SIZE, voxel.z * VOXEL_SIZE);
                        mountGroup.add(mesh);
                    });
                }
                
                // Build right oar
                if (mountData.rightOar && mountData.rightOar.length > 0) {
                    mountData.rightOar.forEach(voxel => {
                        let color = voxel.c;
                        if (typeof color === 'string' && !color.startsWith('#')) {
                            color = PALETTE[color] || '#888888';
                        }
                        const material = new THREE.MeshLambertMaterial({ color });
                        const mesh = new THREE.Mesh(boxGeo, material);
                        mesh.position.set(voxel.x * VOXEL_SIZE, voxel.y * VOXEL_SIZE, voxel.z * VOXEL_SIZE);
                        mountGroup.add(mesh);
                    });
                }
                
                mountGroup.position.y = -3; // Mount sits lower
                group.add(mountGroup);
            }
            
        };
        
        // Start building - will retry if Three.js isn't ready yet
        buildPenguin();
        
        // No cleanup needed - buildPenguin handles its own retries
    }, [isOpen, skinColor, hat, eyes, mouth, bodyItem, mount, characterType, dogPrimaryColor, dogSecondaryColor, frogPrimaryColor, frogSecondaryColor, shrimpPrimaryColor]);
    
    // Reset to default appearance
    const handleResetToDefault = useCallback(() => {
        setSkinColor('blue');
        setHat('none');
        setEyes('normal');
        setMouth('beak');
        setBodyItem('none');
        setMount('none');
        setCharacterType('penguin');
        // Reset character-specific colors to defaults
        setDogPrimaryColor('#D2691E');
        setDogSecondaryColor('#8B4513');
        setFrogPrimaryColor('#6B8E23');
        setFrogSecondaryColor('#556B2F');
        setShrimpPrimaryColor('#FF6B4A');
    }, []);
    
    // Handle promo code submission
    const handlePromoCodeSubmit = useCallback(async () => {
        if (!promoCode.trim()) return;
        
        if (!isAuthenticated) {
            setPromoMessage({ type: 'error', text: 'Login to redeem promo codes' });
            setTimeout(() => setPromoMessage(null), 3000);
            return;
        }
        
        setPromoLoading(true);
        
        // Send to server - server handles ALL validation and unlocking
        const result = await redeemPromoCode(promoCode.trim());
        
        if (result.success) {
            // Server returns what was unlocked
            const unlocked = result.unlocked || {};
            const parts = [];
            
            if (unlocked.mounts?.length > 0) parts.push(`${unlocked.mounts.length} mount(s)`);
            if (unlocked.cosmetics?.length > 0) parts.push(`${unlocked.cosmetics.length} cosmetic(s)`);
            if (unlocked.characters?.length > 0) parts.push(`${unlocked.characters.length} character(s)`);
            if (unlocked.coinsAwarded > 0) parts.push(`${unlocked.coinsAwarded} coins`);
            
            const unlockedText = parts.length > 0 ? parts.join(', ') : 'items';
            setPromoMessage({ type: 'success', text: `🎉 ${result.codeName || 'Code'}: Unlocked ${unlockedText}!` });
            setPromoCode('');
            
            // Auto-equip unlocked items
            if (unlocked.mounts?.length > 0) {
                setMount(unlocked.mounts[0]);
            }
            if (unlocked.characters?.length > 0) {
                setCharacterType(unlocked.characters[0]);
            }
            if (unlocked.cosmetics?.length > 0) {
                for (const cosmetic of unlocked.cosmetics) {
                    const { id, category } = cosmetic;
                    switch (category) {
                        case 'hat': setHat(id); break;
                        case 'eyes': setEyes(id); break;
                        case 'mouth': setMouth(id); break;
                        case 'bodyItem': setBodyItem(id); break;
                    }
                }
            }
            if (unlocked.skinColor) {
                setSkinColor(unlocked.skinColor);
            }
        } else {
            setPromoMessage({ type: 'error', text: result.message || 'Invalid promo code' });
        }
        
        setPromoLoading(false);
        setTimeout(() => setPromoMessage(null), 4000);
    }, [promoCode, isAuthenticated, redeemPromoCode]);
    
    // Handle save
    const handleSave = useCallback(() => {
        // Check if trying to save locked items
        const isHatLocked = hat !== 'none' && !isCosmeticUnlocked(hat, 'hat');
        // Skip eyes/mouth validation for frog character (they don't apply)
        const isEyesLocked = characterType === 'frog' ? false : (eyes !== 'normal' && eyes !== 'none' && !isCosmeticUnlocked(eyes, 'eyes'));
        const isMouthLocked = characterType === 'frog' ? false : (mouth !== 'beak' && mouth !== 'none' && !isCosmeticUnlocked(mouth, 'mouth'));
        const isBodyLocked = bodyItem !== 'none' && !isCosmeticUnlocked(bodyItem, 'bodyItem');
        const isMountLocked = mount !== 'none' && !isMountUnlocked(mount);
        const isSkinLocked = !isSkinColorUnlocked(skinColor);
        
        if (isHatLocked || isEyesLocked || isMouthLocked || isBodyLocked || isMountLocked || isSkinLocked) {
            alert('You cannot save with locked items! Please select only items you own.');
            return;
        }
        
        const finalData = {
            skin: skinColor,
            hat,
            // For frog character, don't save eyes/mouth (they don't apply)
            eyes: characterType === 'frog' ? 'normal' : eyes,
            mouth: characterType === 'frog' ? 'beak' : mouth,
            bodyItem,
            mount,
            characterType,
            dogPrimaryColor,
            dogSecondaryColor,
            frogPrimaryColor,
            frogSecondaryColor,
            shrimpPrimaryColor
        };
        onSave(finalData);
        onClose();
    }, [skinColor, hat, eyes, mouth, bodyItem, mount, characterType, dogPrimaryColor, dogSecondaryColor, frogPrimaryColor, frogSecondaryColor, shrimpPrimaryColor, onSave, onClose, isCosmeticUnlocked, isMountUnlocked, isSkinColorUnlocked]);
    
    // Count all and unlocked items for display - Using database cosmetics
    // MUST be before early return to avoid hooks error
    const allCounts = useMemo(() => ({
        head: cosmeticsFromDB.hat.length,
        eyes: cosmeticsFromDB.eyes.length,
        mouth: cosmeticsFromDB.mouth.length,
        body: cosmeticsFromDB.bodyItem.length,
        mounts: cosmeticsFromDB.mount.length,
        skin: cosmeticsFromDB.skin.length
    }), [cosmeticsFromDB]);
    
    // Count unlocked items (for display when showOwnedOnly is off)
    const unlockedCounts = useMemo(() => {
        return {
            head: cosmeticsFromDB.hat.filter(k => k === 'none' || isCosmeticUnlocked(k, 'hat')).length,
            eyes: cosmeticsFromDB.eyes.filter(k => k === 'none' || k === 'normal' || isCosmeticUnlocked(k, 'eyes')).length,
            mouth: cosmeticsFromDB.mouth.filter(k => k === 'none' || k === 'beak' || isCosmeticUnlocked(k, 'mouth')).length,
            body: cosmeticsFromDB.bodyItem.filter(k => k === 'none' || isCosmeticUnlocked(k, 'bodyItem')).length,
            mounts: cosmeticsFromDB.mount.filter(k => k === 'none' || isMountUnlocked(k)).length,
            skin: cosmeticsFromDB.skin.filter(k => FREE_SKIN_COLORS.includes(k) || isSkinColorUnlocked(k)).length
        };
    }, [isCosmeticUnlocked, isMountUnlocked, isSkinColorUnlocked, cosmeticsFromDB]);
    
    // Detect mobile and portrait mode - MUST be before early return (React hooks rules)
    const [isMobile, setIsMobile] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            const portrait = window.innerHeight > window.innerWidth;
            setIsMobile(mobile);
            setIsPortrait(portrait);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('orientationchange', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
        };
    }, []);
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className={`bg-slate-900 rounded-2xl border-2 border-cyan-500 shadow-2xl w-full mx-4 overflow-hidden flex flex-col ${
                isMobile && isPortrait 
                    ? 'max-h-[95vh]' 
                    : 'max-w-5xl max-h-[90vh]'
            }`}>
                {/* Header */}
                <div className={`bg-gradient-to-r from-cyan-600 to-purple-600 px-4 ${isMobile && isPortrait ? 'py-2' : 'px-6 py-4'} flex items-center justify-between shrink-0`}>
                    <h2 className={`${isMobile && isPortrait ? 'text-lg' : 'text-2xl'} font-bold text-white flex items-center gap-2`}>
                        🐧 Penguin Creator
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-white hover:text-red-300 text-3xl font-bold transition-colors"
                    >
                        ×
                    </button>
                </div>
                
                {/* Content */}
                <div className={`flex flex-1 overflow-hidden ${
                    isMobile && isPortrait ? 'flex-col' : 'flex-row'
                }`}>
                    {/* Preview */}
                    <div className={`${isMobile && isPortrait ? 'w-full h-64' : 'w-1/3'} p-4 flex flex-col items-center justify-center bg-slate-800 shrink-0`}>
                        <div 
                            ref={mountRef} 
                            className={`${isMobile && isPortrait ? 'w-full h-full max-w-[200px] max-h-[200px]' : 'w-[280px] h-[280px]'} rounded-xl overflow-hidden border border-cyan-500/50`}
                        />
                        <p className="text-cyan-400 text-sm mt-2">Preview</p>
                    </div>
                    
                    {/* Options */}
                    <div className={`flex-1 p-4 overflow-y-auto ${isMobile && isPortrait ? 'max-h-[calc(95vh-16rem)]' : ''}`}>
                        {/* Character Selection */}
                        {availableCharacters.length > 1 && (
                            <div className="mb-4">
                                <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider">Character Type</h3>
                                <div className="flex gap-2 flex-wrap">
                                    {availableCharacters.map(char => (
                                        <button
                                            key={char.id}
                                            onClick={() => setCharacterType(char.id)}
                                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                                                characterType === char.id 
                                                    ? 'bg-cyan-500 text-white' 
                                                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                                            }`}
                                        >
                                            {char.emoji} {char.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Doginal Colors */}
                        {characterType === 'doginal' && (
                            <div className="mb-4 p-3 bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-xl border border-amber-500/30">
                                <div className="text-center mb-4">
                                    <span className="text-2xl">🐕</span>
                                    <h3 className="text-white font-bold mt-2">Doginal Colors</h3>
                                    <p className="text-white/60 text-xs mt-1">
                                        Pick your dog's fur colors!
                                    </p>
                                    </div>
                                
                                {/* Primary Color - Main Fur */}
                                <div className="mb-4">
                                    <label className="text-amber-300 text-xs font-bold uppercase tracking-wider block mb-2">
                                        🎨 Primary Fur Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={dogPrimaryColor}
                                            onChange={(e) => setDogPrimaryColor(e.target.value)}
                                            className="w-12 h-10 rounded cursor-pointer border-2 border-amber-500/50"
                                        />
                                        <input
                                            type="text"
                                            value={dogPrimaryColor}
                                            onChange={(e) => setDogPrimaryColor(e.target.value)}
                                            className="flex-1 bg-black/50 border border-amber-500/30 rounded px-2 py-1 text-white text-sm font-mono"
                                            placeholder="#D4A04A"
                                        />
                                    </div>
                                </div>
                                
                                {/* Secondary Color - Belly */}
                                <div className="mb-4">
                                    <label className="text-amber-300 text-xs font-bold uppercase tracking-wider block mb-2">
                                        🎨 Belly/Accent Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={dogSecondaryColor}
                                            onChange={(e) => setDogSecondaryColor(e.target.value)}
                                            className="w-12 h-10 rounded cursor-pointer border-2 border-amber-500/50"
                                        />
                                        <input
                                            type="text"
                                            value={dogSecondaryColor}
                                            onChange={(e) => setDogSecondaryColor(e.target.value)}
                                            className="flex-1 bg-black/50 border border-amber-500/30 rounded px-2 py-1 text-white text-sm font-mono"
                                            placeholder="#F0D890"
                                        />
                                    </div>
                                </div>
                                
                                {/* Preset Colors */}
                                    <div>
                                    <label className="text-amber-300 text-xs font-bold uppercase tracking-wider block mb-2">
                                        Quick Presets
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { name: 'Golden', primary: '#D4A04A', secondary: '#F0D890' },
                                            { name: 'Black', primary: '#2A2A2A', secondary: '#3A3A3A' },
                                            { name: 'White', primary: '#F5F5F5', secondary: '#FFFFFF' },
                                            { name: 'Brown', primary: '#6B4423', secondary: '#9B7653' },
                                            { name: 'Husky', primary: '#7A8A9A', secondary: '#E8F0F8' },
                                            { name: 'Red', primary: '#B84020', secondary: '#E88060' },
                                            { name: 'Corgi', primary: '#E8A040', secondary: '#FFFFFF' },
                                            { name: 'Dalmatian', primary: '#F8F8F8', secondary: '#FFFFFF' },
                                        ].map((preset) => (
                                            <button
                                                key={preset.name}
                                                onClick={() => {
                                                    setDogPrimaryColor(preset.primary);
                                                    setDogSecondaryColor(preset.secondary);
                                                }}
                                                className="flex flex-col items-center p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-amber-500/20 hover:border-amber-400 transition-all"
                                                title={preset.name}
                                            >
                                                <div className="flex gap-1">
                                                    <div 
                                                        className="w-4 h-4 rounded-full border border-white/30"
                                                        style={{ backgroundColor: preset.primary }}
                                                    />
                                                    <div 
                                                        className="w-4 h-4 rounded-full border border-white/30"
                                                        style={{ backgroundColor: preset.secondary }}
                                                    />
                                                </div>
                                                <span className="text-white/70 text-[9px] mt-1">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Frog Colors */}
                        {characterType === 'frog' && (
                            <div className="mb-4 p-3 bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-xl border border-green-500/30">
                                <div className="text-center mb-4">
                                    <span className="text-2xl">🐸</span>
                                    <h3 className="text-white font-bold mt-2">PEPE Colors</h3>
                                    <p className="text-white/60 text-xs mt-1">
                                        Pick your frog's skin colors!
                                    </p>
                                    </div>
                                
                                {/* Primary Color - Main Skin */}
                                <div className="mb-4">
                                    <label className="text-green-300 text-xs font-bold uppercase tracking-wider block mb-2">
                                        🎨 Primary Skin Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={frogPrimaryColor}
                                            onChange={(e) => setFrogPrimaryColor(e.target.value)}
                                            className="w-12 h-10 rounded cursor-pointer border-2 border-green-500/50"
                                        />
                                        <input
                                            type="text"
                                            value={frogPrimaryColor}
                                            onChange={(e) => setFrogPrimaryColor(e.target.value)}
                                            className="flex-1 bg-black/50 border border-green-500/30 rounded px-2 py-1 text-white text-sm font-mono"
                                            placeholder="#4A8C4A"
                                        />
                                    </div>
                                </div>
                                
                                {/* Secondary Color - Belly */}
                                <div className="mb-4">
                                    <label className="text-green-300 text-xs font-bold uppercase tracking-wider block mb-2">
                                        🎨 Belly Color
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={frogSecondaryColor}
                                            onChange={(e) => setFrogSecondaryColor(e.target.value)}
                                            className="w-12 h-10 rounded cursor-pointer border-2 border-green-500/50"
                                        />
                                        <input
                                            type="text"
                                            value={frogSecondaryColor}
                                            onChange={(e) => setFrogSecondaryColor(e.target.value)}
                                            className="flex-1 bg-black/50 border border-green-500/30 rounded px-2 py-1 text-white text-sm font-mono"
                                            placeholder="#B8C8B0"
                                        />
                                    </div>
                                </div>
                                
                                {/* Preset Colors */}
                                    <div>
                                    <label className="text-green-300 text-xs font-bold uppercase tracking-wider block mb-2">
                                        Quick Presets
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { name: 'Classic', primary: '#4A8C4A', secondary: '#B8C8B0' },
                                            { name: 'Dark', primary: '#2A4A2A', secondary: '#4A5A4A' },
                                            { name: 'Golden', primary: '#C8A040', secondary: '#F0E0B0' },
                                            { name: 'Blue', primary: '#3060A0', secondary: '#80A0C8' },
                                            { name: 'Red', primary: '#A04030', secondary: '#D0A090' },
                                            { name: 'Lime', primary: '#80C040', secondary: '#C0E090' },
                                            { name: 'Purple', primary: '#6040A0', secondary: '#A080C8' },
                                            { name: 'Cyan', primary: '#40A0A0', secondary: '#80C8C8' },
                                        ].map((preset) => (
                                            <button
                                                key={preset.name}
                                                onClick={() => {
                                                    setFrogPrimaryColor(preset.primary);
                                                    setFrogSecondaryColor(preset.secondary);
                                                }}
                                                className="flex flex-col items-center p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-green-500/20 hover:border-green-400 transition-all"
                                                title={preset.name}
                                            >
                                                <div className="flex gap-1">
                                                    <div 
                                                        className="w-4 h-4 rounded-full border border-white/30"
                                                        style={{ backgroundColor: preset.primary }}
                                                    />
                                                    <div 
                                                        className="w-4 h-4 rounded-full border border-white/30"
                                                        style={{ backgroundColor: preset.secondary }}
                                                    />
                                                </div>
                                                <span className="text-white/70 text-[9px] mt-1">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Shrimp Colors */}
                        {characterType === 'shrimp' && (
                            <div className="mb-4 p-3 bg-gradient-to-br from-orange-900/50 to-red-900/50 rounded-xl border border-orange-500/30">
                                <div className="text-center mb-4">
                                    <span className="text-2xl">🦐</span>
                                    <h3 className="text-white font-bold mt-2">Shrimp Colors</h3>
                                    <p className="text-white/60 text-xs mt-1">
                                        Pick your shrimp's shell color!
                                    </p>
                                </div>
                                
                                {/* Shell Color */}
                                <div className="mb-3">
                                    <label className="text-orange-300 text-xs font-bold uppercase tracking-wider block mb-2">
                                        Shell Color
                                    </label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="color"
                                            value={shrimpPrimaryColor}
                                            onChange={(e) => setShrimpPrimaryColor(e.target.value)}
                                            className="w-12 h-10 rounded cursor-pointer border-2 border-orange-500/50"
                                        />
                                        <input
                                            type="text"
                                            value={shrimpPrimaryColor}
                                            onChange={(e) => setShrimpPrimaryColor(e.target.value)}
                                            className="flex-1 bg-black/50 border border-orange-500/30 rounded px-2 py-1 text-white text-sm font-mono"
                                            placeholder="#FF6B4A"
                                        />
                                    </div>
                                </div>
                                
                                {/* Quick Presets */}
                                <div>
                                    <label className="text-orange-300 text-xs font-bold uppercase tracking-wider block mb-2">
                                        Quick Presets
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { name: 'Cooked', color: '#FF6B4A', emoji: '🦐' },
                                            { name: 'Raw', color: '#7A8A9A', emoji: '🥶' },
                                            { name: 'Golden', color: '#FFB840', emoji: '✨' },
                                            { name: 'Blue', color: '#4080C0', emoji: '💎' },
                                            { name: 'Pink', color: '#FF9999', emoji: '💗' },
                                            { name: 'Red', color: '#CC3333', emoji: '🔴' },
                                            { name: 'Tiger', color: '#FF8844', emoji: '🐯' },
                                            { name: 'Ghost', color: '#CCDDEE', emoji: '👻' },
                                        ].map((preset) => (
                                            <button
                                                key={preset.name}
                                                onClick={() => setShrimpPrimaryColor(preset.color)}
                                                className="flex flex-col items-center p-2 rounded-lg bg-black/30 hover:bg-black/50 border border-orange-500/20 hover:border-orange-400 transition-all"
                                                title={preset.name}
                                            >
                                                <div 
                                                    className="w-6 h-6 rounded-full border border-white/30"
                                                    style={{ backgroundColor: preset.color }}
                                                />
                                                <span className="text-white/70 text-[9px] mt-1">{preset.emoji} {preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Penguin Customization Options */}
                        {characterType === 'penguin' && (
                            <>
                                {/* Feathers (Skin Color) */}
                                <div className="mb-4">
                                    <h3 className="text-white font-semibold mb-2 text-sm uppercase tracking-wider">
                                        Feathers ({showOwnedOnly ? options.skin.length : allCounts.skin}/{allCounts.skin})
                                    </h3>
                                    <div className={`grid ${isMobile && isPortrait ? 'grid-cols-8' : 'grid-cols-10'} gap-2 ${isMobile && isPortrait ? 'max-h-[150px]' : 'max-h-[200px]'} overflow-y-auto`}>
                                        {(showOwnedOnly ? options.skin : cosmeticsFromDB.skin).map(color => {
                                            const isUnlocked = isSkinColorUnlocked(color);
                                            const isSelected = skinColor === color;
                                            return (
                                                <button
                                                    key={color}
                                                    onClick={() => isUnlocked && setSkinColor(color)}
                                                    disabled={!isUnlocked}
                                                    title={isUnlocked ? color : `${color} (🔒 Locked)`}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                                                        isSelected ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                                                    } ${isUnlocked ? 'opacity-100 hover:scale-105' : 'opacity-30 cursor-not-allowed'}`}
                                                    style={{ backgroundColor: PALETTE[color] || color }}
                                                >
                                                    {!isUnlocked && <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">🔒</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <hr className="border-slate-700 my-3" />
                                
                                {/* Cosmetic Selectors */}
                                {[
                                    { label: 'HEADWEAR', key: 'head', val: hat, set: setHat, list: options.head, category: 'hat', defaultVal: null },
                                    { label: 'EYES', key: 'eyes', val: eyes, set: setEyes, list: options.eyes, category: 'eyes', defaultVal: 'normal' },
                                    { label: 'MOUTH', key: 'mouth', val: mouth, set: setMouth, list: options.mouth, category: 'mouth', defaultVal: 'beak' },
                                    { label: 'CLOTHING', key: 'body', val: bodyItem, set: setBodyItem, list: options.body, category: 'bodyItem', defaultVal: null },
                                    { label: 'MOUNTS', key: 'mounts', val: mount, set: setMount, list: options.mounts, isMount: true, defaultVal: null },
                                ]
                                // Filter out eyes and mouth options for frog character (only hat and clothing work)
                                .filter(opt => {
                                    if (characterType === 'frog') {
                                        return opt.key === 'head' || opt.key === 'body';
                                    }
                                    return true; // Show all options for other characters
                                })
                                .map((opt) => {
                                    const isCurrentLocked = opt.isMount 
                                        ? (opt.val !== 'none' && !isMountUnlocked(opt.val))
                                        : (opt.val !== 'none' && opt.val !== opt.defaultVal && !isCosmeticUnlocked(opt.val, opt.category));
                                    
                                    // Display text - show default name instead of "none" only for eyes and mouth
                                    const displayText = (opt.val === 'none' && opt.defaultVal)
                                        ? (opt.defaultVal === 'normal' ? 'Normal' : opt.defaultVal === 'beak' ? 'Beak' : 'Default')
                                        : opt.val.replace(/([A-Z])/g, ' $1').trim();
                                    
                                    // Only disable cycling for eyes/mouth when on "none" (which shows as default)
                                    const shouldDisableCycling = opt.defaultVal && opt.val === 'none';
                                    
                                    return (
                                        <div key={opt.key} className="mb-3">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                                {opt.label} {showOwnedOnly 
                                                    ? <span className="text-green-400">({opt.list.length} owned)</span>
                                                    : `(${unlockedCounts[opt.key]}/${allCounts[opt.key]})`
                                                }
                                                {opt.isMount && <span className="text-orange-400 ml-1">(PROMO)</span>}
                                            </span>
                                            <div className={`flex items-center justify-between rounded-lg p-2 ${
                                                isCurrentLocked ? 'bg-red-900/30 border border-red-500/30' : 'bg-slate-800'
                                            }`}>
                                                <button 
                                                    className="p-2 text-white hover:text-yellow-400 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                                    onClick={() => cycle(opt.val, opt.list, opt.set, -1, opt.defaultVal)}
                                                    disabled={shouldDisableCycling}
                                                >
                                                    ◀
                                                </button>
                                                <div className="flex flex-col items-center flex-1">
                                                    <span className={`font-medium text-sm capitalize truncate max-w-[180px] text-center ${
                                                        isCurrentLocked ? 'text-red-400' : 'text-white'
                                                    }`}>
                                                        {isCurrentLocked && '🔒 '}
                                                        {displayText}
                                                    </span>
                                                    {isCurrentLocked && (
                                                        <span className="text-[9px] text-red-400/80">
                                                            {opt.isMount ? 'Promo Only' : 'Unlock in Casino!'}
                                                        </span>
                                                    )}
                                                </div>
                                                <button 
                                                    className="p-2 text-white hover:text-yellow-400 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                                    onClick={() => cycle(opt.val, opt.list, opt.set, 1, opt.defaultVal)}
                                                    disabled={shouldDisableCycling}
                                                >
                                                    ▶
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                        
                        {/* Show Owned Only Toggle + Reset Button */}
                        {characterType === 'penguin' && (
                            <div className="flex gap-2 mt-4">
                                {/* Owned Only Toggle */}
                                {isAuthenticated && (
                                    <button
                                        onClick={() => setShowOwnedOnly(!showOwnedOnly)}
                                        className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors border ${
                                            showOwnedOnly 
                                                ? 'bg-green-600/30 border-green-500 text-green-300 hover:bg-green-600/40' 
                                                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                        }`}
                                        title="Show only cosmetics you own"
                                    >
                                        {showOwnedOnly ? '✓ Owned Only' : '👁 Show All'}
                                    </button>
                                )}
                                
                                {/* Reset Button */}
                                <button
                                    onClick={handleResetToDefault}
                                    className={`${isAuthenticated ? 'flex-1' : 'w-full'} py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-lg transition-colors border border-gray-600`}
                                >
                                    ↺ Reset
                                </button>
                            </div>
                        )}
                        
                        {/* Promo Code Input */}
                        <div className="mt-4">
                            <label className="block text-xs text-purple-400 mb-1 font-bold uppercase tracking-wider">PROMO CODE</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={promoCode}
                                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => e.key === 'Enter' && !promoLoading && handlePromoCodeSubmit()}
                                    maxLength={20}
                                    placeholder={isAuthenticated ? "Enter code..." : "Login to redeem"}
                                    disabled={promoLoading || !isAuthenticated}
                                    className={`flex-1 px-3 py-2 bg-black/50 border-2 border-purple-500/50 rounded-lg text-white text-sm focus:border-purple-400 focus:outline-none placeholder-white/30 uppercase ${!isAuthenticated ? 'opacity-50' : ''}`}
                                />
                                <button
                                    onClick={handlePromoCodeSubmit}
                                    disabled={promoLoading || !isAuthenticated}
                                    className={`px-3 py-2 text-white rounded-lg text-xs font-bold transition-colors ${
                                        promoLoading || !isAuthenticated 
                                            ? 'bg-gray-600 cursor-not-allowed' 
                                            : 'bg-purple-600 hover:bg-purple-500'
                                    }`}
                                >
                                    {promoLoading ? '...' : 'REDEEM'}
                                </button>
                            </div>
                            {promoMessage && (
                                <p className={`text-xs mt-1 ${promoMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                    {promoMessage.text}
                                </p>
                            )}
                            {!isAuthenticated && (
                                <p className="text-xs mt-1 text-amber-400/70">
                                    Connect wallet to redeem promo codes
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="bg-slate-800 px-6 py-4 flex justify-end gap-4 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-lg font-semibold transition-all"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PenguinCreatorOverlay;
