import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VOXEL_SIZE, PALETTE } from './constants';
import { ASSETS } from './assets/index';
import { generateBaseBody, generateFlippers, generateFeet, generateHead } from './generators';
import { IconSettings, IconChevronLeft, IconChevronRight, IconCamera, IconWorld } from './Icons';
import { useMultiplayer } from './multiplayer';
import { 
    characterRegistry, 
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
} from './characters';
import WalletAuth from './components/WalletAuth';

function VoxelPenguinDesigner({ onEnterWorld, currentData, updateData }) {
    const mountRef = useRef(null);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    
    // Track layout for responsive design
    const [layoutState, setLayoutState] = useState(() => ({
        isPortrait: typeof window !== 'undefined' && window.innerWidth < window.innerHeight,
        isMobileView: typeof window !== 'undefined' && window.innerWidth < 768
    }));
    
    // Update layout on resize/orientation change
    useEffect(() => {
        const handleResize = () => {
            const newIsPortrait = window.innerWidth < window.innerHeight;
            const newIsMobileView = window.innerWidth < 768;
            
            setLayoutState(prev => {
                if (prev.isPortrait !== newIsPortrait || prev.isMobileView !== newIsMobileView) {
                    return { isPortrait: newIsPortrait, isMobileView: newIsMobileView };
                }
                return prev;
            });
            
            // Resize renderer if it exists
            if (rendererRef.current && cameraRef.current && mountRef.current) {
                const width = mountRef.current.clientWidth || window.innerWidth;
                const height = mountRef.current.clientHeight || window.innerHeight;
                rendererRef.current.setSize(width, height);
                cameraRef.current.aspect = width / height;
                cameraRef.current.updateProjectionMatrix();
            }
        };
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => setTimeout(handleResize, 100));
        
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, []);
    
    const { isPortrait, isMobileView } = layoutState;
    
    // Multiplayer context
    const { setName, isAuthenticated, userData, checkUsername, registerCallbacks, isRestoringSession, redeemPromoCode, promoLoading } = useMultiplayer();
    
    // Username state
    const [username, setUsername] = useState('');
    const [usernameStatus, setUsernameStatus] = useState(null); // 'available', 'taken', 'checking', null
    const usernameCheckTimeout = useRef(null);
    const hasInitializedUsername = useRef(false);
    
    // Is this a NEW user who needs to pick a username? (authenticated but never entered world)
    // Use isEstablishedUser flag from server - handles migration cases
    const isNewUser = isAuthenticated && userData && !userData.isEstablishedUser;
    
    // Is this a returning user with a locked username? (has entered world before)
    const isReturningUser = isAuthenticated && userData?.isEstablishedUser;
    
    // Can the user edit the username field? Only new users can
    const canEditUsername = isAuthenticated && isNewUser;
    
    // Character type - session only
    const [characterType, setCharacterType] = useState(currentData?.characterType || 'penguin');
    
    // Promo code input (server-authoritative - NO code data stored in client)
    const [promoCode, setPromoCode] = useState('');
    const [promoMessage, setPromoMessage] = useState(null);
    
    // Show only owned cosmetics toggle
    const [showOwnedOnly, setShowOwnedOnly] = useState(false);
    
    // Customization state - from props (synced from server for auth users)
    const [skinColor, setSkinColor] = useState(currentData?.skin || 'blue');
    const [hat, setHat] = useState(currentData?.hat || 'none');
    const [eyes, setEyes] = useState(currentData?.eyes || 'normal');
    const [mouth, setMouth] = useState(currentData?.mouth || 'beak');
    const [bodyItem, setBodyItem] = useState(currentData?.bodyItem || 'none');
    const [mount, setMount] = useState(currentData?.mount || 'none');
    
    // Doginal freestyle colors (primary fur, secondary belly)
    const [dogPrimaryColor, setDogPrimaryColor] = useState(currentData?.dogPrimaryColor || '#D4A04A');
    const [dogSecondaryColor, setDogSecondaryColor] = useState(currentData?.dogSecondaryColor || '#F0D890');
    
    // Sync state when currentData changes (from server restore)
    useEffect(() => {
        if (currentData) {
            setSkinColor(currentData.skin || 'blue');
            setHat(currentData.hat || 'none');
            setEyes(currentData.eyes || 'normal');
            setMouth(currentData.mouth || 'beak');
            setBodyItem(currentData.bodyItem || 'none');
            setMount(currentData.mount || 'none');
            setCharacterType(currentData.characterType || 'penguin');
            // Doginal colors
            setDogPrimaryColor(currentData.dogPrimaryColor || '#D4A04A');
            setDogSecondaryColor(currentData.dogSecondaryColor || '#F0D890');
        }
    }, [currentData]);
    
    // Sync username from server when authenticated
    useEffect(() => {
        if (isAuthenticated && userData?.username) {
            // Returning users: always sync from server
            // New users: only sync once on first load (prevents overwriting during promo redemption)
            if (userData.isEstablishedUser || !hasInitializedUsername.current) {
                setUsername(userData.username);
                localStorage.setItem('penguin_name', userData.username);
                hasInitializedUsername.current = true;
            }
        }
    }, [isAuthenticated, userData?.username, userData?.isEstablishedUser]);
    
    // Register callback for username status
    useEffect(() => {
        registerCallbacks({
            onUsernameStatus: (status) => {
                if (status.username === username) {
                    setUsernameStatus(status.reason);
                }
            }
        });
    }, [registerCallbacks, username]);
    
    // Check username availability when typing (debounced)
    useEffect(() => {
        if (!canEditUsername || !username || username.length < 3) {
            setUsernameStatus(null);
            return;
        }
        
        // Don't check if it matches the server username
        if (username === userData?.username) {
            setUsernameStatus('current');
            return;
        }
        
        setUsernameStatus('checking');
        
        // Debounce the check
        clearTimeout(usernameCheckTimeout.current);
        usernameCheckTimeout.current = setTimeout(() => {
            checkUsername(username);
        }, 500);
        
        return () => clearTimeout(usernameCheckTimeout.current);
    }, [username, canEditUsername, checkUsername, userData?.username]);
    
    // Unlocked items come from server (userData.unlockedMounts, userData.unlockedCosmetics, userData.unlockedCharacters)
    // NO client-side promo code data - everything is server-authoritative
    
    // Get unlocked items from server data (or defaults for guests)
    const unlockedMounts = useMemo(() => {
        if (isAuthenticated && userData?.unlockedMounts) {
            return ['none', ...userData.unlockedMounts];
        }
        return ['none']; // Guests only get 'none'
    }, [isAuthenticated, userData?.unlockedMounts]);
    
    const unlockedCosmetics = useMemo(() => {
        if (isAuthenticated && userData?.unlockedCosmetics) {
            return userData.unlockedCosmetics;
        }
        return []; // Guests have no promo cosmetics
    }, [isAuthenticated, userData?.unlockedCosmetics]);
    
    // Check if a mount is unlocked
    const isMountUnlocked = React.useCallback((mountId) => {
        // 'none' is always available
        if (mountId === 'none') return true;
        // All mounts are promo-exclusive currently
        return unlockedMounts.includes(mountId);
    }, [unlockedMounts]);
    
    // Handle username change (only for new authenticated users)
    const handleUsernameChange = (value) => {
        if (!canEditUsername) return;
        const trimmed = value.slice(0, 20);
        setUsername(trimmed);
        if (setName) setName(trimmed);
    };
    
    // PROMO CODE IDS THAT REQUIRE UNLOCKING
    // These IDs are checked against server data - NO code strings stored client-side
    const PROMO_COSMETIC_IDS = [
        'lmao', 'joe', 'mistorHair', 'mistorEyes', 'mistorShirt',
        'bonkExclamation', 'bonkEyes', 'bonkShirt', 'penguShirt'
    ];
    
    // BASE SKIN COLORS (free for everyone) - Only blue is default
    // All other colors require unlocking via gacha
    const BASE_SKIN_COLORS = ['blue'];
    
    // PREMIUM SKIN COLORS (gacha drops) - All 100+ colors except blue require unlock
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
    
    // Get gacha-owned cosmetics from server data
    const gachaOwnedCosmetics = useMemo(() => {
        if (isAuthenticated && userData?.gachaOwnedCosmetics) {
            return userData.gachaOwnedCosmetics;
        }
        return [];
    }, [isAuthenticated, userData?.gachaOwnedCosmetics]);
    
    // Check if a skin color is unlocked
    const isSkinColorUnlocked = (colorId) => {
        // Base colors are always unlocked
        if (BASE_SKIN_COLORS.includes(colorId)) return true;
        // Premium colors require gacha unlock
        if (PREMIUM_SKIN_COLORS.includes(colorId)) {
            return gachaOwnedCosmetics.includes(`skin_${colorId}`) || unlockedCosmetics.includes(`skin_${colorId}`);
        }
        // Unknown colors - locked by default
        return false;
    };
    
    // Default cosmetics that are free for everyone (including guests)
    const FREE_DEFAULT_COSMETICS = ['none', 'normal', 'beak'];
    
    // Check if a cosmetic is unlocked (or doesn't require unlock)
    const isCosmeticUnlocked = React.useCallback((cosmeticId, category = null) => {
        // Default items are always available
        if (FREE_DEFAULT_COSMETICS.includes(cosmeticId)) return true;
        
        // Guests cannot own ANY non-default cosmetics
        if (!isAuthenticated) return false;
        
        // Check if this cosmetic requires a promo code
        if (PROMO_COSMETIC_IDS.includes(cosmeticId)) {
            return unlockedCosmetics.includes(cosmeticId);
        }
        
        // Check gacha-owned cosmetics (templateId format: category_assetKey)
        // Try both with and without category prefix since server returns templateId
        if (gachaOwnedCosmetics.includes(cosmeticId)) {
            return true;
        }
        
        // Also check with category prefix (server stores as "hat_topHat", "eyes_bored", etc.)
        if (category) {
            const templateId = `${category}_${cosmeticId}`;
            if (gachaOwnedCosmetics.includes(templateId)) {
                return true;
            }
        }
        
        // All non-free items require gacha unlock or promo code
        return false;
    }, [isAuthenticated, unlockedCosmetics, gachaOwnedCosmetics]);
    
    // Check if current customization is valid (all equipped items owned)
    const isCustomizationValid = useMemo(() => {
        // Guests can only use default appearance (all 'none'/defaults or base items)
        if (!isAuthenticated) {
            // Allow guests to use base colors and default options only
            if (!BASE_SKIN_COLORS.includes(skinColor)) return false;
            if (hat !== 'none') return false; // Guests cannot wear hats
            if (eyes !== 'normal') return false; // Guests can only use default eyes
            if (mouth !== 'beak') return false; // Guests can only use default mouth
            if (bodyItem !== 'none') return false; // Guests cannot wear body items
            if (mount !== 'none') return false; // Guests cannot use mounts
            return true;
        }
        
        // Authenticated users - check all equipped items
        if (!isSkinColorUnlocked(skinColor)) return false;
        if (!isCosmeticUnlocked(hat, 'hat')) return false;
        if (!isCosmeticUnlocked(eyes, 'eyes')) return false;
        if (!isCosmeticUnlocked(mouth, 'mouth')) return false;
        if (!isCosmeticUnlocked(bodyItem, 'bodyItem')) return false;
        if (!isMountUnlocked(mount)) return false;
        
        return true;
    }, [isAuthenticated, skinColor, hat, eyes, mouth, bodyItem, mount, gachaOwnedCosmetics, unlockedCosmetics, unlockedMounts]);
    
    // Handle promo code submission - SERVER HANDLES ALL VALIDATION
    const handlePromoCodeSubmit = async () => {
        if (!promoCode.trim()) return;
        
        if (!isAuthenticated) {
            setPromoMessage({ type: 'error', text: 'Login to redeem promo codes' });
            setTimeout(() => setPromoMessage(null), 3000);
            return;
        }
        
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
            
            // === AUTO-EQUIP ALL UNLOCKED ITEMS ===
            
            // Auto-equip mount
            if (unlocked.mounts?.length > 0) {
                setMount(unlocked.mounts[0]);
            }
            
            // Auto-equip character
            if (unlocked.characters?.length > 0) {
                setCharacterType(unlocked.characters[0]);
            }
            
            // Auto-equip cosmetics by category
            if (unlocked.cosmetics?.length > 0) {
                for (const cosmetic of unlocked.cosmetics) {
                    // cosmetic is { id, category }
                    const { id, category } = cosmetic;
                    switch (category) {
                        case 'hat':
                            setHat(id);
                            break;
                        case 'eyes':
                            setEyes(id);
                            break;
                        case 'mouth':
                            setMouth(id);
                            break;
                        case 'bodyItem':
                            setBodyItem(id);
                            break;
                    }
                }
            }
            
            // Auto-set skin color if included (for themed sets)
            if (unlocked.skinColor) {
                setSkinColor(unlocked.skinColor);
            }
        } else {
            setPromoMessage({ type: 'error', text: result.message || 'Invalid promo code' });
        }
        
        setTimeout(() => setPromoMessage(null), 4000);
    };
    
    // Handle character type change
    const handleCharacterTypeChange = (typeId) => {
        // Check if character is unlocked (penguin always available, others from server)
        if (typeId === 'penguin' || unlockedCharactersList.includes(typeId)) {
            setCharacterType(typeId);
            
            // Doginal has built-in wizard hat and doesn't use penguin cosmetics
            if (typeId === 'doginal') {
                setHat('none');      // Wizard hat is built into the model
                setEyes('none');     // Dog has its own eyes
                setMouth('none');    // Dog has its own mouth/snout
                setBodyItem('none'); // No shirt on dog
            }
        }
    };
    
    // Get current character config
    const currentCharacter = characterRegistry.getCharacter(characterType);
    
    // Get unlocked characters from server (penguin always available)
    const unlockedCharactersList = useMemo(() => {
        const chars = ['penguin']; // Penguin always unlocked
        if (isAuthenticated && userData?.unlockedCharacters) {
            userData.unlockedCharacters.forEach(c => {
                if (!chars.includes(c)) chars.push(c);
            });
        }
        return chars;
    }, [isAuthenticated, userData?.unlockedCharacters]);
    
    // Filter to only include characters that exist in registry
    const unlockedCharacters = unlockedCharactersList.filter(id => characterRegistry.getCharacter(id));
    
    useEffect(() => {
        if(updateData) updateData({skin: skinColor, hat, eyes, mouth, bodyItem, mount, characterType, dogPrimaryColor, dogSecondaryColor});
    }, [skinColor, hat, eyes, mouth, bodyItem, mount, characterType, dogPrimaryColor, dogSecondaryColor, updateData]);

    const sceneRef = useRef(null);
    const penguinRef = useRef(null);
    const reflectionRef = useRef(null); 
    const particlesRef = useRef([]);
    const lasersRef = useRef([]); 
    const timeRef = useRef(0);
    const spinRef = useRef(0); 
    const reqRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);

    // --- SCRIPT LOADING ---
    useEffect(() => {
        const loadScripts = async () => {
            if (window.THREE && window.THREE.OrbitControls) {
                setScriptsLoaded(true);
                return;
            }

            if (!window.THREE) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }

            if (!window.THREE.OrbitControls) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }
            
            setScriptsLoaded(true);
        };

        loadScripts().catch(console.error);
    }, []);

    // --- 3D SCENE SETUP ---
    const backgroundData = useMemo(() => {
        const items = [];
        for(let x=-12; x<=12; x++) {
            for(let z=-12; z<=12; z++) {
                const color = (x+z)%2===0 ? PALETTE.floorLight : PALETTE.floorDark;
                items.push({ type: 'box', x, y: -8, z, w: 1, h: 1, d: 1, c: color });
            }
        }
        items.push({ type: 'box', x: 0, y: -7.5, z: 0, w: 8, h: 2, d: 8, c: PALETTE.wood });
        items.push({ type: 'box', x: 0, y: -6.5, z: 0, w: 6, h: 1, d: 6, c: PALETTE.gold });
        items.push({ type: 'box', x: 0, y: 5, z: -10, w: 22, h: 26, d: 2, c: PALETTE.wood });
        items.push({ type: 'box', x: 0, y: 5, z: -9, w: 18, h: 22, d: 1, c: '#E0F7FA' });
        for(let z=0; z<12; z++) items.push({ type: 'box', x: 0, y: -7.4, z: z, w: 4, h: 0.2, d: 1, c: PALETTE.rug });
        return items;
    }, []);

    // Scene Init
    useEffect(() => {
        if (!scriptsLoaded || !mountRef.current) return;

        const THREE = window.THREE;
        
        // Detect mobile GPU for performance optimizations
        const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroidDevice = /Android/i.test(navigator.userAgent);
        const isMobileGPU = isIOSDevice || isAndroidDevice;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color('#2c3e50');
        scene.fog = new THREE.Fog('#2c3e50', 20, 60);
        
        // Get actual container dimensions (for portrait mode support)
        const containerWidth = mountRef.current.clientWidth || window.innerWidth;
        const containerHeight = mountRef.current.clientHeight || window.innerHeight;
        
        const camera = new THREE.PerspectiveCamera(45, containerWidth / containerHeight, 0.1, 1000);
        camera.position.set(20, 20, 30);
        cameraRef.current = camera;
        
        // Mobile: disable antialias for performance
        const rendererOptions = {
            antialias: !isMobileGPU,
            alpha: false
        };
        if (isMobileGPU) {
            rendererOptions.precision = 'mediump';
        }
        const renderer = new THREE.WebGLRenderer(rendererOptions);
        renderer.setSize(containerWidth, containerHeight);
        // Mobile: cap DPR at 1.0 to avoid rendering 4-9x more pixels
        const dpr = isMobileGPU ? Math.min(window.devicePixelRatio, 1.0) : Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(dpr);
        renderer.shadowMap.enabled = true;
        // Mobile: BasicShadowMap (fastest), Desktop: PCFSoftShadowMap (best quality)
        renderer.shadowMap.type = isMobileGPU ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        // Mobile: smaller shadow map for performance
        const shadowMapSize = isMobileGPU ? 512 : 2048;
        dirLight.shadow.mapSize.width = shadowMapSize;
        dirLight.shadow.mapSize.height = shadowMapSize;
        scene.add(dirLight);
        
        // Mobile: skip expensive point and spot lights (ambient + directional is enough)
        if (!isMobileGPU) {
            const warmLight = new THREE.PointLight(0xFFDDAA, 1.2, 50);
            warmLight.position.set(0, 15, 5);
            scene.add(warmLight);
            
            const rimLight = new THREE.SpotLight(0x4455ff, 1.5);
            rimLight.position.set(-20, 10, -10);
            scene.add(rimLight);
        }

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 15;
        controls.maxDistance = 60;
        controls.target.set(0, 5, 0);

        const gridHelper = new THREE.GridHelper(100, 100, 0x333333, 0x222222);
        gridHelper.position.y = -8;
        scene.add(gridHelper);
        
        const bgGroup = new THREE.Group();
        const colorBatches = {};
        backgroundData.forEach(item => {
            const key = item.c;
            if(!colorBatches[key]) colorBatches[key] = [];
            colorBatches[key].push(item);
        });

        Object.keys(colorBatches).forEach(color => {
            const items = colorBatches[color];
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshStandardMaterial({ color: color });
            const mesh = new THREE.InstancedMesh(geo, mat, items.length);
            mesh.receiveShadow = true;
            
            const dummy = new THREE.Object3D();
            items.forEach((item, i) => {
                dummy.position.set(item.x * (item.w === 1 ? VOXEL_SIZE * 2 : 1), item.y, item.z * (item.w === 1 ? VOXEL_SIZE * 2 : 1));
                dummy.scale.set(item.w, item.h, item.d);
                if (item.w === 1 && item.h === 1 && item.d === 1) {
                     dummy.position.set(item.x * 2, item.y, item.z * 2);
                     dummy.scale.set(2, 1, 2); 
                } else {
                     dummy.position.set(item.x, item.y, item.z);
                     dummy.scale.set(item.w, item.h, item.d);
                }
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            });
            bgGroup.add(mesh);
        });
        scene.add(bgGroup);

        const penguinGroup = new THREE.Group();
        scene.add(penguinGroup);
        penguinRef.current = penguinGroup;
        
        const reflectionGroup = new THREE.Group();
        reflectionGroup.scale.set(1, 1, -1);
        reflectionGroup.position.set(0, 0, -18);
        scene.add(reflectionGroup);
        reflectionRef.current = reflectionGroup;

        const animate = () => {
            reqRef.current = requestAnimationFrame(animate);
            timeRef.current += 0.02;
            controls.update();

            if (penguinRef.current) {
                if (spinRef.current > 0) {
                    penguinRef.current.rotation.y += 0.2;
                    spinRef.current -= 0.2;
                    penguinRef.current.position.y = Math.sin(timeRef.current * 10) * 0.5;
                } else {
                    penguinRef.current.rotation.y = THREE.MathUtils.lerp(penguinRef.current.rotation.y, 0, 0.1);
                    penguinRef.current.position.y = Math.sin(timeRef.current * 2) * 0.2;
                }
                
                if (reflectionRef.current) {
                    reflectionRef.current.position.y = penguinRef.current.position.y;
                    reflectionRef.current.rotation.y = penguinRef.current.rotation.y;
                }
            }

            const propeller = scene.getObjectByName('propeller_blades');
            if (propeller) propeller.rotation.y += 0.3;
            
            const mirrorPropeller = reflectionRef.current?.getObjectByName('propeller_blades');
            if (mirrorPropeller) mirrorPropeller.rotation.y += 0.3;

            particlesRef.current.forEach((p, i) => {
                p.mesh.position.y += p.speed;
                p.mesh.position.x += Math.sin(timeRef.current + i) * 0.02;
                p.life -= 0.01;
                const scale = 1 - p.life;
                p.mesh.scale.set(scale, scale, scale);
                p.mesh.material.opacity = p.life;
                if (p.life <= 0) {
                    p.mesh.position.set(p.origin.x, p.origin.y, p.origin.z);
                    p.life = 1;
                }
            });

            if (lasersRef.current.length > 0) {
                const intensity = 1 + Math.sin(timeRef.current * 10) * 0.5;
                lasersRef.current.forEach(l => {
                    l.intensity = intensity;
                });
            }

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(reqRef.current);
            if (rendererRef.current && mountRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, [scriptsLoaded, backgroundData]);

    // --- REBUILD PENGUIN ---
    useEffect(() => {
        if (!scriptsLoaded || !sceneRef.current || !penguinRef.current) return;
        
        spinRef.current = Math.PI * 2;
        const THREE = window.THREE;
        const group = penguinRef.current;
        const mirrorGroup = reflectionRef.current;
        
        while(group.children.length > 0) group.remove(group.children[0]); 
        if (mirrorGroup) while(mirrorGroup.children.length > 0) mirrorGroup.remove(mirrorGroup.children[0]);
        
        particlesRef.current = [];
        lasersRef.current = [];

        function buildVoxelPart(voxelData, colorPalette, offset = {x:0, y:0, z:0}) {
            const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
            const partGroup = new THREE.Group();
            const colorBatches = {};
            voxelData.forEach(v => {
                const colorHex = colorPalette[v.c] || v.c; 
                if (!colorBatches[colorHex]) colorBatches[colorHex] = [];
                const matrix = new THREE.Matrix4();
                matrix.setPosition(
                    (v.x + offset.x) * VOXEL_SIZE,
                    (v.y + offset.y) * VOXEL_SIZE,
                    (v.z + offset.z) * VOXEL_SIZE
                );
                if (v.scaleY) matrix.scale(new THREE.Vector3(1, v.scaleY, 1));
                colorBatches[colorHex].push(matrix);
            });

            Object.keys(colorBatches).forEach(color => {
                const count = colorBatches[color].length;
                const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ 
                    color: new THREE.Color(color),
                    roughness: 0.3,
                    metalness: 0.1,
                }), count);
                colorBatches[color].forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
                mesh.instanceMatrix.needsUpdate = true;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                partGroup.add(mesh);
            });
            return partGroup;
        }

        const addPart = (voxels, name, palette = PALETTE) => {
            const partGroup = buildVoxelPart(voxels, palette);
            partGroup.name = name;
            group.add(partGroup);
            if (mirrorGroup) {
                const mirrorPart = partGroup.clone();
                mirrorGroup.add(mirrorPart);
            }
        };

        // Build character based on type
        if (characterType === 'marcus') {
            // Build Marcus with separate parts (Y offset is built into the generators now)
            addPart(MarcusGenerators.head(), 'head', MARCUS_PALETTE);
            addPart(MarcusGenerators.body(), 'body', MARCUS_PALETTE);
            addPart(MarcusGenerators.armLeft(), 'flipper_l', MARCUS_PALETTE);
            addPart(MarcusGenerators.armRight(), 'flipper_r', MARCUS_PALETTE);
            addPart(MarcusGenerators.legLeft(), 'foot_l', MARCUS_PALETTE);
            addPart(MarcusGenerators.legRight(), 'foot_r', MARCUS_PALETTE);
        } else if (characterType === 'doginal') {
            // Build Doginal dog character - use freestyle color selection!
            const dogPalette = generateDogPalette(dogPrimaryColor, dogSecondaryColor);
            
            addPart(DoginalGenerators.head(), 'head', dogPalette);
            addPart(DoginalGenerators.body(), 'body', dogPalette);
            addPart(DoginalGenerators.armLeft(), 'flipper_l', dogPalette);
            addPart(DoginalGenerators.armRight(), 'flipper_r', dogPalette);
            addPart(DoginalGenerators.legLeft(), 'foot_l', dogPalette);
            addPart(DoginalGenerators.legRight(), 'foot_r', dogPalette);
            
            // Animated parts - tail, ears
            addPart(DoginalGenerators.tail(), 'tail', dogPalette);
            addPart(DoginalGenerators.earLeft(), 'ear_l', dogPalette);
            addPart(DoginalGenerators.earRight(), 'ear_r', dogPalette);
            
            // Doginal ALWAYS wears wizard hat - it's part of the character!
            const doginalHat = ASSETS.HATS['wizardHat'] || [];
            if (doginalHat.length > 0) {
                // Offset hat voxels to sit on dog's head (Y+3 for head height, Z+3 for head forward offset)
                const offsetHatVoxels = doginalHat.map(v => ({ ...v, y: v.y + 3, z: v.z + 3 }));
                addPart(offsetHatVoxels, 'hat');
                
                // Add wizard hat glow effect (magic tip light) - offset for dog head
                const wizardLight = new THREE.PointLight(0xFF69B4, 1.5, 8); // Pink magic glow
                wizardLight.position.set(0, (17 + 3) * VOXEL_SIZE, 0); // Tip of wizard hat, offset
                group.add(wizardLight);
                if (mirrorGroup) mirrorGroup.add(wizardLight.clone());
                
                // Add gold star glows
                const starLight = new THREE.PointLight(0xFFD700, 0.8, 5); // Gold glow
                starLight.position.set(0, (14 + 3) * VOXEL_SIZE, 2 * VOXEL_SIZE);
                group.add(starLight);
                if (mirrorGroup) mirrorGroup.add(starLight.clone());
            }
            
            // Add body item (trenchcoat, etc.) for Doginal
            const dogBodyItemData = ASSETS.BODY[bodyItem];
            const dogBodyItemVoxels = dogBodyItemData?.voxels || dogBodyItemData || [];
            if (dogBodyItemVoxels.length > 0) {
                // Offset for dog body position (Y_OFFSET=4, adjust by -4 from penguin)
                const offsetBodyVoxels = dogBodyItemVoxels.map(v => ({ ...v, y: v.y - 4 }));
                addPart(offsetBodyVoxels, 'bodyItem');
            }
        } else if (characterType?.includes('Whale')) {
            // Build Whale variant - whale head on penguin body
            const WHALE_CONFIGS = {
                whiteWhale: { generators: WhiteWhaleGenerators, palette: WHITE_WHALE_PALETTE },
                blackWhale: { generators: BlackWhaleGenerators, palette: BLACK_WHALE_PALETTE },
                silverWhale: { generators: SilverWhaleGenerators, palette: SILVER_WHALE_PALETTE },
                goldWhale: { generators: GoldWhaleGenerators, palette: GOLD_WHALE_PALETTE },
            };
            const config = WHALE_CONFIGS[characterType] || WHALE_CONFIGS.whiteWhale;
            const { generators, palette } = config;
            addPart(generators.head(), 'head', palette);
            addPart(generators.body(), 'body', { ...PALETTE, ...palette });
            addPart(generators.flipperLeft(), 'flipper_l', { ...PALETTE, ...palette });
            addPart(generators.flipperRight(), 'flipper_r', { ...PALETTE, ...palette });
            addPart(generators.feet(), 'feet', PALETTE);
        } else {
            // Build standard Penguin character
            const bodyVoxels = generateBaseBody(PALETTE[skinColor] || skinColor);
            const headVoxels = generateHead(PALETTE[skinColor] || skinColor);
            const flippersLeft = generateFlippers(PALETTE[skinColor] || skinColor, true);
            const flippersRight = generateFlippers(PALETTE[skinColor] || skinColor, false);
            const feetVoxels = generateFeet();

            const hatVoxels = ASSETS.HATS[hat] || [];
            const eyeVoxels = ASSETS.EYES[eyes] || [];
            const mouthVoxels = ASSETS.MOUTH[mouth] || [];
            const bodyItemData = ASSETS.BODY[bodyItem];
            const bodyItemVoxels = bodyItemData?.voxels || bodyItemData || [];
            
            // Check if bodyItem hides the body (e.g., "joe" clothing)
            const hideBody = bodyItemData?.hideBody === true;

            // Only render body if not hidden by clothing item
            if (!hideBody) {
                addPart(bodyVoxels, 'body');
                addPart(headVoxels, 'head');
                addPart(flippersLeft, 'flipper_l');
                addPart(flippersRight, 'flipper_r');
                addPart(feetVoxels, 'feet');
                addPart(hatVoxels, 'hat');
                addPart(eyeVoxels, 'eyes');
                addPart(mouthVoxels, 'mouth');
                addPart(bodyItemVoxels, 'accessory');
                
                // Handle flipper attachments (like baseball bat)
                if (bodyItemData?.flipperAttachment) {
                    const attach = bodyItemData.flipperAttachment;
                    const flipperName = attach.flipper === 'left' ? 'flipper_l' : 'flipper_r';
                    const targetFlipper = group.getObjectByName(flipperName);
                    
                    if (targetFlipper && attach.voxels && attach.voxels.length > 0) {
                        const heldItemGroup = buildVoxelPart(attach.voxels, PALETTE, attach.offset || {x:0, y:0, z:0});
                        heldItemGroup.name = 'held_item';
                        targetFlipper.add(heldItemGroup);
                        
                        if (mirrorGroup) {
                            const mirrorFlipper = mirrorGroup.getObjectByName(flipperName);
                            if (mirrorFlipper) {
                                const mirrorItem = heldItemGroup.clone();
                                mirrorFlipper.add(mirrorItem);
                            }
                        }
                    }
                }
                
                // Handle text decal body items (e.g., lobotomy shirt)
                if (bodyItemData?.textDecal) {
                    const decal = bodyItemData.textDecal;
                    const scale = decal.scale || 1;
                    
                    // Create canvas for text
                    const canvas = document.createElement('canvas');
                    canvas.width = 512;
                    canvas.height = 128;
                    const ctx = canvas.getContext('2d');
                    
                    // Transparent background
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw text centered
                    ctx.font = decal.font || 'bold 32px Arial';
                    ctx.fillStyle = decal.color || '#000000';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(decal.text, canvas.width / 2, canvas.height / 2);
                    
                    // Create texture from canvas
                    const texture = new THREE.CanvasTexture(canvas);
                    texture.needsUpdate = true;
                    
                    // Create plane with text - size based on scale
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
                    
                    if (mirrorGroup) {
                        const mirrorText = textPlane.clone();
                        mirrorGroup.add(mirrorText);
                    }
                }
            } else {
                // JOE MODE: Big floating head like M&M meme
                // Create a wrapper group for the enlarged head
                const joeHeadGroup = new THREE.Group();
                joeHeadGroup.name = 'joe_head';
                
                // Build head parts into a sub-group for scaling
                const headGroup = new THREE.Group();
                
                // Add head voxels
                headVoxels.forEach(v => {
                    const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                    const mat = new THREE.MeshStandardMaterial({ color: PALETTE[v.c] || v.c });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
                    mesh.castShadow = true;
                    headGroup.add(mesh);
                });
                
                // Add eyes
                eyeVoxels.forEach(v => {
                    const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                    const mat = new THREE.MeshStandardMaterial({ color: PALETTE[v.c] || v.c });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
                    headGroup.add(mesh);
                });
                
                // Add mouth
                mouthVoxels.forEach(v => {
                    const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                    const mat = new THREE.MeshStandardMaterial({ color: PALETTE[v.c] || v.c });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
                    headGroup.add(mesh);
                });
                
                // Add hat
                hatVoxels.forEach(v => {
                    const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                    const mat = new THREE.MeshStandardMaterial({ color: PALETTE[v.c] || v.c });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
                    headGroup.add(mesh);
                });
                
                // Scale up the head (1.8x bigger)
                headGroup.scale.set(1.8, 1.8, 1.8);
                // Move head down since no body (center it vertically)
                headGroup.position.y = -2 * VOXEL_SIZE;
                joeHeadGroup.add(headGroup);
                group.add(joeHeadGroup);
                
                // Add WHITE floating hands (like M&M gloves) - positioned higher near head
                const whiteFlippersLeft = generateFlippers('#FFFFFF', true);
                const leftHandGroup = new THREE.Group();
                whiteFlippersLeft.forEach(v => {
                    const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                    const mat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
                    mesh.castShadow = true;
                    leftHandGroup.add(mesh);
                });
                leftHandGroup.scale.set(0.9, 0.9, 0.9);
                leftHandGroup.position.set(6 * VOXEL_SIZE, 2 * VOXEL_SIZE, 3 * VOXEL_SIZE);
                leftHandGroup.name = 'flipper_l';
                group.add(leftHandGroup);
                
                const whiteFlippersRight = generateFlippers('#FFFFFF', false);
                const rightHandGroup = new THREE.Group();
                whiteFlippersRight.forEach(v => {
                    const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                    const mat = new THREE.MeshStandardMaterial({ color: '#FFFFFF' });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
                    mesh.castShadow = true;
                    rightHandGroup.add(mesh);
                });
                rightHandGroup.scale.set(0.9, 0.9, 0.9);
                rightHandGroup.position.set(-6 * VOXEL_SIZE, 2 * VOXEL_SIZE, 3 * VOXEL_SIZE);
                rightHandGroup.name = 'flipper_r';
                group.add(rightHandGroup);
                
                // Add feet at the bottom
                addPart(feetVoxels, 'feet');
            }
        }

        if (hat === 'propeller') {
            const blades = new THREE.Group();
            blades.name = 'propeller_blades';
            blades.position.set(0, 13 * VOXEL_SIZE, 0); 
            const bladeGeo = new THREE.BoxGeometry(4, 0.2, 0.5);
            const bladeMat = new THREE.MeshStandardMaterial({color: 'red'});
            const b1 = new THREE.Mesh(bladeGeo, bladeMat);
            const b2 = new THREE.Mesh(bladeGeo, bladeMat);
            b2.rotation.y = Math.PI / 2;
            blades.add(b1, b2);
            group.add(blades);
            if (mirrorGroup) mirrorGroup.add(blades.clone());
        }

        if (mouth === 'cigarette' || mouth === 'pipe') {
            const tipX = mouth === 'pipe' ? 2 * VOXEL_SIZE : 4.5 * VOXEL_SIZE;
            const tipY = mouth === 'pipe' ? 6 * VOXEL_SIZE : 5.5 * VOXEL_SIZE;
            const tipZ = mouth === 'pipe' ? 6 * VOXEL_SIZE : 5.5 * VOXEL_SIZE;
            for(let i=0; i<10; i++) {
                const pGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                const pMat = new THREE.MeshBasicMaterial({color: 0xaaaaaa, transparent: true});
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.position.set(tipX, tipY, tipZ);
                group.add(pMesh);
                if(mirrorGroup) mirrorGroup.add(pMesh.clone());
                particlesRef.current.push({
                    mesh: pMesh,
                    life: Math.random(),
                    speed: 0.05 + Math.random() * 0.05,
                    origin: {x: tipX, y: tipY, z: tipZ}
                });
            }
        }

        if (eyes === 'laser') {
            const lightLeft = new THREE.PointLight(0xff0000, 1, 10);
            lightLeft.position.set(-2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 5 * VOXEL_SIZE);
            const lightRight = new THREE.PointLight(0xff0000, 1, 10);
            lightRight.position.set(2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 5 * VOXEL_SIZE);
            lasersRef.current.push(lightLeft, lightRight);
            group.add(lightLeft, lightRight);
            if (mirrorGroup) {
                 mirrorGroup.add(lightLeft.clone());
                 mirrorGroup.add(lightRight.clone());
            }
        }
        
        if (hat === 'halo') {
             const light = new THREE.PointLight(0xFFD700, 1, 5);
             light.position.set(0, 14 * VOXEL_SIZE, 0);
             group.add(light);
             if (mirrorGroup) mirrorGroup.add(light.clone());
        }
        
        // --- MOUNT PREVIEW ---
        if (mount && mount !== 'none' && ASSETS.MOUNTS && ASSETS.MOUNTS[mount]) {
            const mountData = ASSETS.MOUNTS[mount];
            const mountGroup = new THREE.Group();
            mountGroup.name = 'mount';
            
            // Build mount hull voxels
            if (mountData.voxels && mountData.voxels.length > 0) {
                const geometry = new THREE.BufferGeometry();
                const positions = [];
                const colors = [];
                
                mountData.voxels.forEach(voxel => {
                    const s = VOXEL_SIZE;
                    const x = voxel.x * s;
                    const y = voxel.y * s;
                    const z = voxel.z * s;
                    
                    // Add cube vertices for each voxel
                    const cubePositions = [
                        x, y, z,  x+s, y, z,  x+s, y+s, z,  x, y+s, z,
                        x, y, z+s,  x+s, y, z+s,  x+s, y+s, z+s,  x, y+s, z+s
                    ];
                    
                    // Simple box faces
                    const indices = [
                        0,1,2, 0,2,3, // front
                        4,6,5, 4,7,6, // back
                        0,4,5, 0,5,1, // bottom
                        2,6,7, 2,7,3, // top
                        0,3,7, 0,7,4, // left
                        1,5,6, 1,6,2  // right
                    ];
                    
                    const color = new THREE.Color(voxel.c);
                    indices.forEach(i => {
                        positions.push(cubePositions[i*3], cubePositions[i*3+1], cubePositions[i*3+2]);
                        colors.push(color.r, color.g, color.b);
                    });
                });
                
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                geometry.computeVertexNormals();
                
                const material = new THREE.MeshStandardMaterial({ 
                    vertexColors: true,
                    roughness: 0.7,
                    metalness: 0.1
                });
                const mountMesh = new THREE.Mesh(geometry, material);
                mountGroup.add(mountMesh);
            }
            
            // Build left oar
            if (mountData.leftOar && mountData.leftOar.length > 0) {
                const oarGroup = new THREE.Group();
                mountData.leftOar.forEach(voxel => {
                    const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                    const mat = new THREE.MeshStandardMaterial({ color: voxel.c });
                    const cube = new THREE.Mesh(geo, mat);
                    cube.position.set(voxel.x * VOXEL_SIZE, voxel.y * VOXEL_SIZE, voxel.z * VOXEL_SIZE);
                    oarGroup.add(cube);
                });
                oarGroup.name = 'left_oar';
                mountGroup.add(oarGroup);
            }
            
            // Build right oar
            if (mountData.rightOar && mountData.rightOar.length > 0) {
                const oarGroup = new THREE.Group();
                mountData.rightOar.forEach(voxel => {
                    const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                    const mat = new THREE.MeshStandardMaterial({ color: voxel.c });
                    const cube = new THREE.Mesh(geo, mat);
                    cube.position.set(voxel.x * VOXEL_SIZE, voxel.y * VOXEL_SIZE, voxel.z * VOXEL_SIZE);
                    oarGroup.add(cube);
                });
                oarGroup.name = 'right_oar';
                mountGroup.add(oarGroup);
            }
            
            mountGroup.position.y = -3; // Mount sits lower on the platform
            group.add(mountGroup);
            
            // Also adjust penguin position based on mount's seat offset
            if (mountData.seatOffset) {
                group.position.y = (mountData.seatOffset.y || 0) * VOXEL_SIZE;
            }
        }

    }, [scriptsLoaded, skinColor, hat, eyes, mouth, bodyItem, mount, characterType, dogPrimaryColor, dogSecondaryColor]);

    // Get available skin colors - base + unlocked premium
    const availableSkinColors = useMemo(() => {
        const available = [...BASE_SKIN_COLORS];
        // Add any unlocked premium colors
        PREMIUM_SKIN_COLORS.forEach(color => {
            if (isSkinColorUnlocked(color)) {
                available.push(color);
            }
        });
        return available;
    }, [gachaOwnedCosmetics, unlockedCosmetics]);
    
    // Show cosmetics - filter by owned if toggle is on
    const options = useMemo(() => {
        // ALL skin colors available (base + all premium)
        const allSkinColors = [...BASE_SKIN_COLORS, ...PREMIUM_SKIN_COLORS];
        
        const allOptions = {
            skin: allSkinColors,
            head: Object.keys(ASSETS.HATS),
            eyes: Object.keys(ASSETS.EYES),
            mouth: Object.keys(ASSETS.MOUTH),
            body: Object.keys(ASSETS.BODY),
            mounts: Object.keys(ASSETS.MOUNTS || {})
        };
        
        if (!showOwnedOnly || !isAuthenticated) {
            return allOptions;
        }
        
        // Filter to only owned/unlocked items
        // For skins, include base colors + any gacha-won skin colors
        const ownedSkinColors = gachaOwnedCosmetics
            .filter(id => id.startsWith('skin_'))
            .map(id => id.replace('skin_', ''));
        const unlockedSkinOptions = [...new Set([...BASE_SKIN_COLORS, ...ownedSkinColors])];
        
        return {
            skin: unlockedSkinOptions,
            head: allOptions.head.filter(k => k === 'none' || isCosmeticUnlocked(k, 'hat')),
            eyes: allOptions.eyes.filter(k => k === 'none' || k === 'normal' || isCosmeticUnlocked(k, 'eyes')),
            mouth: allOptions.mouth.filter(k => k === 'none' || k === 'beak' || isCosmeticUnlocked(k, 'mouth')),
            body: allOptions.body.filter(k => k === 'none' || isCosmeticUnlocked(k, 'bodyItem')),
            mounts: allOptions.mounts.filter(k => k === 'none' || isMountUnlocked(k))
        };
    }, [showOwnedOnly, isAuthenticated, isCosmeticUnlocked, isMountUnlocked, gachaOwnedCosmetics]);
    
    // Count all and unlocked items for display
    const allCounts = {
        head: Object.keys(ASSETS.HATS).length,
        eyes: Object.keys(ASSETS.EYES).length,
        mouth: Object.keys(ASSETS.MOUTH).length,
        body: Object.keys(ASSETS.BODY).length,
        mounts: Object.keys(ASSETS.MOUNTS || {}).length
    };
    
    const unlockedCounts = {
        head: Object.keys(ASSETS.HATS).filter(k => isCosmeticUnlocked(k, 'hat')).length,
        eyes: Object.keys(ASSETS.EYES).filter(k => isCosmeticUnlocked(k, 'eyes')).length,
        mouth: Object.keys(ASSETS.MOUTH).filter(k => isCosmeticUnlocked(k, 'mouth')).length,
        body: Object.keys(ASSETS.BODY).filter(k => isCosmeticUnlocked(k, 'bodyItem')).length,
        mounts: Object.keys(ASSETS.MOUNTS || {}).filter(k => isMountUnlocked(k)).length
    };
    
    // Cycle function - allows selecting ANY item for window shopping/preview
    const cycle = (current, list, setter, dir) => {
        if (list.length <= 1) return; // Nothing to cycle
        
        const idx = list.indexOf(current);
        let nextIdx;
        if (idx === -1) {
            nextIdx = 0;
        } else {
            nextIdx = idx + dir;
            if(nextIdx < 0) nextIdx = list.length - 1;
            if(nextIdx >= list.length) nextIdx = 0;
        }
        setter(list[nextIdx]);
    };
    
    // Reset to default appearance
    const handleResetToDefault = () => {
        setSkinColor('blue');
        setHat('none');
        setEyes('normal');
        setMouth('beak');
        setBodyItem('none');
        setMount('none');
        setCharacterType('penguin');
    };

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden font-sans">
            {/* 3D Canvas - in portrait mode, only show top portion */}
            <div 
                ref={mountRef} 
                className="absolute left-0 right-0 z-0" 
                style={{
                    top: 0,
                    height: isPortrait && isMobileView ? '35%' : '100%'
                }}
            />
            
            {/* Title - smaller on mobile portrait */}
            <div className={`absolute top-0 left-0 z-10 w-full pointer-events-none ${isPortrait && isMobileView ? 'p-3' : 'p-6'}`}>
                <h1 className={`retro-text text-white drop-shadow-lg ${isPortrait && isMobileView ? 'text-2xl' : 'text-4xl'}`} style={{textShadow: '4px 4px 0px #000'}}>
                    PENGUIN MAKER <span className={`text-yellow-400 align-top ${isPortrait && isMobileView ? 'text-xs' : 'text-sm'}`}>DELUXE</span>
                </h1>
            </div>

            {/* Settings Panel - bottom sheet on mobile portrait, side panel on landscape/desktop */}
            <div className={`absolute z-10 pointer-events-auto ${
                isPortrait && isMobileView 
                    ? 'bottom-0 left-0 right-0 w-full px-3 pb-3' 
                    : 'bottom-10 right-10 w-80'
            }`}>
                <div className={`glass-panel rounded-2xl flex flex-col gap-3 overflow-y-auto ${
                    isPortrait && isMobileView 
                        ? 'p-4 max-h-[60vh] rounded-b-none' 
                        : 'p-6 max-h-[80vh]'
                }`}>
                    <h2 className={`text-white font-bold flex items-center gap-2 sticky top-0 bg-gray-900/50 p-2 rounded backdrop-blur-md z-20 ${isPortrait && isMobileView ? 'text-base mb-1' : 'text-lg mb-2'}`}>
                        <IconSettings size={isPortrait && isMobileView ? 16 : 20} /> {characterType === 'penguin' ? 'Wardrobe' : currentCharacter?.name || 'Character'}
                    </h2>

                    {/* Customization options - ONLY for penguin character */}
                    {characterType === 'penguin' ? (
                        <>
                            <div className="flex flex-col gap-1 text-white">
                                <span className={`font-semibold text-gray-300 uppercase tracking-wider ${isPortrait && isMobileView ? 'text-[10px]' : 'text-xs'}`}>
                                    Feathers ({options.skin.filter(c => isSkinColorUnlocked(c)).length}/{options.skin.length})
                                </span>
                                <div className={`grid gap-1.5 ${isPortrait && isMobileView ? 'grid-cols-8' : 'grid-cols-6 gap-2'}`}>
                                    {options.skin.map(c => {
                                        const isUnlocked = isSkinColorUnlocked(c);
                                        const isSelected = skinColor === c;
                                        return (
                                        <button 
                                            key={c}
                                                onClick={() => isUnlocked && setSkinColor(c)}
                                                title={isUnlocked ? c : `${c} (🔒 Gacha)`}
                                                disabled={!isUnlocked}
                                                className={`rounded-full border-2 relative ${
                                                    isSelected ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                                                } ${
                                                    isUnlocked ? 'opacity-100 hover:scale-105 cursor-pointer' : 'opacity-30 cursor-not-allowed'
                                                } transition-all ${isPortrait && isMobileView ? 'w-6 h-6' : 'w-8 h-8'}`}
                                            style={{backgroundColor: PALETTE[c] || c}}
                                            >
                                                {!isUnlocked && (
                                                    <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">🔒</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <hr className="border-gray-600/50" />

                            {[
                                { label: 'HEADWEAR', key: 'head', val: hat, set: setHat, list: options.head },
                                { label: 'EYES', key: 'eyes', val: eyes, set: setEyes, list: options.eyes },
                                { label: 'MOUTH', key: 'mouth', val: mouth, set: setMouth, list: options.mouth },
                                { label: 'CLOTHING', key: 'body', val: bodyItem, set: setBodyItem, list: options.body },
                                { label: 'MOUNTS', key: 'mounts', val: mount, set: setMount, list: options.mounts, isMount: true },
                            ].map((opt, i) => {
                                const categoryForCheck = opt.key === 'head' ? 'hat' : opt.key === 'body' ? 'bodyItem' : opt.key;
                                const isCurrentLocked = opt.isMount ? !isMountUnlocked(opt.val) : !isCosmeticUnlocked(opt.val, categoryForCheck);
                                const unlockedCount = opt.isMount ? unlockedCounts.mounts : unlockedCounts[opt.key];
                                const totalCount = opt.isMount ? allCounts.mounts : allCounts[opt.key];
                                const displayCount = showOwnedOnly ? opt.list.length : totalCount;
                                
                                return (
                                    <div key={i} className="flex flex-col gap-1">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                            {opt.label} {showOwnedOnly 
                                                ? <span className="text-green-400">({displayCount} owned)</span>
                                                : `(${unlockedCount}/${totalCount})`
                                            }
                                            {opt.isMount && <span className="text-orange-400 ml-1">(PROMO)</span>}
                                        </span>
                                        <div className={`flex items-center justify-between rounded-lg p-1 ${
                                            isCurrentLocked ? 'bg-red-900/30 border border-red-500/30' : 'bg-black/30'
                                        }`}>
                                            <button 
                                                className="voxel-btn p-2 text-white hover:text-yellow-400"
                                                onClick={() => cycle(opt.val, opt.list, opt.set, -1)}
                                            >
                                                <IconChevronLeft size={20} />
                                            </button>
                                            <div className="flex flex-col items-center">
                                                <span className={`font-medium text-sm capitalize truncate max-w-[120px] text-center ${
                                                    isCurrentLocked ? 'text-red-400' : 'text-white'
                                                }`}>
                                                    {isCurrentLocked && '🔒 '}
                                                    {opt.val.replace(/([A-Z])/g, ' $1').trim()}
                                                </span>
                                                {isCurrentLocked && (
                                                    <span className="text-[9px] text-red-400/80">
                                                        {opt.isMount ? 'Promo Only' : 'Unlock in Casino!'}
                                                    </span>
                                                )}
                                            </div>
                                            <button 
                                                className="voxel-btn p-2 text-white hover:text-yellow-400"
                                                onClick={() => cycle(opt.val, opt.list, opt.set, 1)}
                                            >
                                                <IconChevronRight size={20} />
                                            </button>
                                        </div>
                                        {opt.isMount && !isMountUnlocked('minecraftBoat') && !isMountUnlocked('penguMount') && (
                                            <p className="text-[10px] text-orange-400/80 text-center">Enter promo code to unlock mounts</p>
                                        )}
                                        {opt.isMount && opt.val === 'penguMount' && isMountUnlocked('penguMount') && (
                                            <div className="flex items-center justify-center gap-1 mt-1">
                                                <span className="text-[10px] text-green-400 font-bold">⚡ +5% SPEED</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    ) : characterType === 'doginal' ? (
                        /* Doginal color customization */
                        <div className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 rounded-xl p-4 border border-amber-500/30">
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
                    ) : (
                        /* Other special characters - no customization */
                        <div className="bg-gradient-to-br from-purple-900/50 to-cyan-900/50 rounded-xl p-4 border border-purple-500/30">
                            <div className="text-center">
                                <span className="text-2xl">🎭</span>
                                <h3 className="text-white font-bold mt-2">{currentCharacter?.name || 'Special Character'}</h3>
                                <p className="text-white/60 text-xs mt-1">
                                    {currentCharacter?.description || 'A unique character model'}
                                </p>
                                <p className="text-purple-400 text-xs mt-3 italic">
                                    Special characters cannot be customized
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Show Owned Only Toggle + Reset Button */}
                    {characterType === 'penguin' && (
                        <div className="flex gap-2 mt-2">
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
                    
                    {/* Username Section - Only show after authentication */}
                    {!isAuthenticated && !isRestoringSession && (
                        <div className="mt-4 p-3 bg-black/30 rounded-lg border border-gray-500/30">
                            <p className="text-xs text-gray-400 text-center">
                                🔐 Connect wallet to set your username
                            </p>
                        </div>
                    )}
                    
                    {isRestoringSession && (
                        <div className="mt-4 p-3 bg-black/30 rounded-lg border border-cyan-500/30">
                            <p className="text-xs text-cyan-400 text-center animate-pulse">
                                🔄 Restoring session...
                            </p>
                        </div>
                    )}
                    
                    {isAuthenticated && (
                        <div className="mt-4">
                            <label className="block text-xs text-yellow-400 mb-1 retro-text">
                                {isReturningUser ? '🔒 USERNAME (LOCKED)' : '✏️ CHOOSE USERNAME'}
                            </label>
                            
                            {/* Returning user - locked username display */}
                            {isReturningUser && (
                                <>
                                    <div className="w-full px-3 py-2 bg-black/30 border-2 border-gray-500/50 rounded-lg text-white text-sm">
                                        {username}
                                    </div>
                                    <p className="text-xs text-orange-400 mt-1">
                                        🔒 Username locked for 30 days after first entry
                                    </p>
                                </>
                            )}
                            
                            {/* New user - editable username */}
                            {!isReturningUser && (
                                <>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => handleUsernameChange(e.target.value)}
                                            maxLength={20}
                                            minLength={3}
                                            placeholder="Choose a unique name (3-20 chars)..."
                                            className={`w-full px-3 py-2 pr-24 bg-black/50 border-2 rounded-lg text-white text-sm focus:outline-none placeholder-white/30 ${
                                                usernameStatus === 'taken' 
                                                    ? 'border-red-500/50 focus:border-red-400'
                                                    : usernameStatus === 'available'
                                                        ? 'border-green-500/50 focus:border-green-400'
                                                        : username.length > 0 && username.length < 3 
                                                            ? 'border-red-500/50 focus:border-red-400' 
                                                            : 'border-yellow-500/50 focus:border-yellow-400'
                                            }`}
                                        />
                                        {/* Availability status badge */}
                                        {username.length >= 3 && (
                                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded ${
                                                usernameStatus === 'checking' 
                                                    ? 'bg-gray-500/50 text-gray-300'
                                                    : usernameStatus === 'available'
                                                        ? 'bg-green-500/50 text-green-300'
                                                        : usernameStatus === 'taken'
                                                            ? 'bg-red-500/50 text-red-300'
                                                            : usernameStatus === 'current'
                                                                ? 'bg-blue-500/50 text-blue-300'
                                                                : 'bg-gray-500/50 text-gray-300'
                                            }`}>
                                                {usernameStatus === 'checking' && '⏳ Checking...'}
                                                {usernameStatus === 'available' && '✓ Available'}
                                                {usernameStatus === 'taken' && '✗ Taken'}
                                                {usernameStatus === 'current' && '✓ Current'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <p className="text-xs text-amber-400">
                                            ⚠️ Cannot be changed for 30 days after entering world
                                        </p>
                                        <p className={`text-xs ${
                                            username.length > 0 && username.length < 3 ? 'text-red-400' : 'text-white/40'
                                        }`}>
                                            {username.length}/20
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    
                    {/* Promo Code Input */}
                    <div className="mt-2">
                        <label className="block text-xs text-purple-400 mb-1 retro-text">PROMO CODE</label>
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
                    
                    {/* Character Selector - only show if multiple characters unlocked */}
                    {unlockedCharacters.length > 1 && (
                        <div className="mt-4">
                            <label className="block text-xs text-cyan-400 mb-2 retro-text">CHARACTER</label>
                            <div 
                                className="flex gap-2 overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing select-none"
                                onMouseDown={(e) => {
                                    const el = e.currentTarget;
                                    el.dataset.dragging = 'true';
                                    el.dataset.startX = e.pageX;
                                    el.dataset.scrollLeft = el.scrollLeft;
                                }}
                                onMouseMove={(e) => {
                                    const el = e.currentTarget;
                                    if (el.dataset.dragging !== 'true') return;
                                    e.preventDefault();
                                    const walk = (e.pageX - Number(el.dataset.startX)) * 1.5;
                                    el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
                                }}
                                onMouseUp={(e) => e.currentTarget.dataset.dragging = 'false'}
                                onMouseLeave={(e) => e.currentTarget.dataset.dragging = 'false'}
                            >
                                {unlockedCharacters.map(charId => {
                                    const char = characterRegistry.getCharacter(charId);
                                    if (!char) return null;
                                    return (
                                        <button
                                            key={charId}
                                            onClick={() => handleCharacterTypeChange(charId)}
                                            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                                                characterType === charId
                                                    ? 'bg-cyan-500 text-black border-2 border-cyan-300'
                                                    : 'bg-black/50 text-white border-2 border-cyan-500/30 hover:border-cyan-400'
                                            }`}
                                        >
                                            {char.name.toUpperCase()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    
                    {/* Wallet Authentication */}
                    <div className="mt-4">
                        <WalletAuth />
                    </div>
                    
                    {/* Enter World Button */}
                    {isAuthenticated && isNewUser && (!username || username.length < 3 || usernameStatus === 'taken') ? (
                        <div className="mt-4">
                            <button 
                                disabled
                                className="w-full py-3 bg-gray-600 text-gray-400 font-bold rounded-lg retro-text text-xs border-b-4 border-gray-700 flex justify-center items-center gap-2 cursor-not-allowed"
                            >
                                <IconWorld size={16} /> {usernameStatus === 'taken' ? 'USERNAME TAKEN' : 'CHOOSE A USERNAME'}
                            </button>
                            <p className="text-xs text-amber-400 text-center mt-2">
                                Pick an available username to continue
                            </p>
                        </div>
                    ) : !isCustomizationValid ? (
                        <div className="mt-4">
                            <button 
                                disabled
                                className="w-full py-3 bg-red-900/50 text-red-400 font-bold rounded-lg retro-text text-xs border-b-4 border-red-900 flex justify-center items-center gap-2 cursor-not-allowed"
                            >
                                <IconWorld size={16} /> 🔒 INVALID COSMETICS
                            </button>
                            <p className="text-xs text-red-400 text-center mt-2">
                                {isAuthenticated 
                                    ? '⚠️ Unequip locked items or unlock them in the Casino!'
                                    : '⚠️ Guests can only use default appearance'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4">
                            <button 
                                onClick={onEnterWorld}
                                className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg shadow-lg transform active:scale-95 transition-all retro-text text-xs border-b-4 border-yellow-700 flex justify-center items-center gap-2"
                            >
                                <IconWorld size={16} /> {isAuthenticated ? 'ENTER WORLD' : 'PLAY AS GUEST'}
                            </button>
                            {!isAuthenticated && (
                                <p className="text-xs text-amber-400 text-center mt-2">
                                    ⚠️ Guest mode: Progress won't be saved
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {/* Help text - hide on mobile portrait to save space */}
            {!(isPortrait && isMobileView) && (
                <div className="absolute bottom-4 left-6 text-white/30 text-xs flex items-center gap-2">
                    <IconCamera size={14} /> Click & Drag to Rotate • Scroll to Zoom
                </div>
            )}

            {!scriptsLoaded && (
                <div className="absolute inset-0 bg-black flex items-center justify-center text-white retro-text z-50">
                    LOADING ENGINE...
                </div>
            )}
        </div>
    );
}

export default VoxelPenguinDesigner;