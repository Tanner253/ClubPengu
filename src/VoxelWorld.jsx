import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VOXEL_SIZE, PALETTE } from './constants';
import { ASSETS } from './assets/index';
import { IconSend } from './Icons';
import GameHUD from './components/GameHUD';
import ChatLog from './components/ChatLog';
import Portal from './components/Portal';
import PufflePanel from './components/PufflePanel';
import VirtualJoystick from './components/VirtualJoystick';
import TouchCameraControl from './components/TouchCameraControl';
import SettingsMenu from './components/SettingsMenu';
import EmoteWheel from './components/EmoteWheel';
import GameManager from './engine/GameManager';
import Puffle from './engine/Puffle';
import { createPenguinBuilder, cacheAnimatedParts, animateCosmeticsFromCache } from './engine/PenguinBuilder';
import TownCenter from './rooms/TownCenter';
import Nightclub from './rooms/Nightclub';
import { generateIglooInterior } from './rooms/BaseRoom';
import { generateSKNYIglooInterior } from './rooms/SKNYIglooInterior';
import { useMultiplayer } from './multiplayer';
import { useChallenge } from './challenge';
import { EMOTE_WHEEL_ITEMS, LOOPING_EMOTES, EMOTE_EMOJI_MAP } from './systems';
import { 
    CITY_SIZE, 
    BUILDING_SCALE, 
    CENTER_X, 
    CENTER_Z, 
    BUILDINGS, 
    AI_NAMES, 
    AI_EMOTES,
    AI_CONVERSATIONS,
    BUBBLE_HEIGHT_PENGUIN,
    BUBBLE_HEIGHT_MARCUS,
    NAME_HEIGHT_PENGUIN,
    NAME_HEIGHT_MARCUS,
    ROOM_PORTALS,
    IGLOO_BANNER_STYLES,
    IGLOO_BANNER_CONTENT
} from './config';
import { createChatSprite, updateAIAgents, updateMatchBanners, createIglooOccupancySprite, updateIglooOccupancySprite, animateMesh, updateDayNightCycle, calculateNightFactor, SnowfallSystem, WizardTrailSystem } from './systems';
import { createDojo, createGiftShop, createPizzaParlor, generateDojoInterior, generatePizzaInterior } from './buildings';

const VoxelWorld = ({ 
    penguinData, 
    room = 'town',  // Current room/layer
    onExitToDesigner, 
    onChangeRoom,
    onStartMinigame,
    playerPuffle, 
    onPuffleChange,
    customSpawnPos,  // Custom spawn position (when returning from dojo/igloo)
    onPlayerClick,   // Callback when clicking another player (for challenge system)
    isInMatch = false, // True when player is in a P2P match (disable movement input)
    activeMatches = [], // Active matches in the room (for spectator banners)
    spectatingMatch = {} // Real-time match state data for spectating
}) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const playerRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const reqRef = useRef(null);
    const mapRef = useRef(null);
    const clockRef = useRef(null);
    const roomRef = useRef(room); // Track current room
    const townCenterRef = useRef(null); // TownCenter room instance
    const nightclubRef = useRef(null); // Nightclub room instance
    const sknyIglooInteriorRef = useRef(null); // SKNY GANG igloo interior (with update function)
    const roomDataRef = useRef(null); // Store room data (including beach ball) for multiplayer sync
    const raycasterRef = useRef(null); // For player click detection
    const mouseRef = useRef({ x: 0, y: 0 }); // Mouse position for raycasting
    const isInMatchRef = useRef(isInMatch); // Track match state for game loop
    const matchBannersRef = useRef(new Map()); // matchId -> { sprite, canvas, ctx }
    const wizardTrailSystemRef = useRef(null); // World-space wizard hat particle trail
    const mountEnabledRef = useRef(true); // Track if mount is equipped/enabled
    
    // Keep isInMatch ref up to date
    useEffect(() => {
        isInMatchRef.current = isInMatch;
    }, [isInMatch]);
    
    // Mount toggle - listen for settings changes
    useEffect(() => {
        // Initialize from localStorage
        try {
            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
            mountEnabledRef.current = settings.mountEnabled !== false;
        } catch { mountEnabledRef.current = true; }
        
        const handleMountToggle = (e) => {
            const enabled = e.detail?.enabled ?? true;
            mountEnabledRef.current = enabled;
            
            // Toggle mount visibility on current player mesh
            if (playerRef.current) {
                const mountGroup = playerRef.current.getObjectByName('mount');
                if (mountGroup) {
                    mountGroup.visible = enabled;
                }
                // Also toggle mount-related userData
                if (playerRef.current.userData) {
                    playerRef.current.userData.mountVisible = enabled;
                }
                // Clear cached animation parts so they reset properly
                playerRef.current._animParts = null;
            }
        };
        
        window.addEventListener('mountToggled', handleMountToggle);
        return () => window.removeEventListener('mountToggled', handleMountToggle);
    }, []);
    
    // Multiplayer - OPTIMIZED: use refs for positions, state only for player list changes
    const {
        connected,
        playerId,
        playerName,
        playerCount,
        totalPlayerCount,     // Total players online (all rooms)
        playerList,           // Triggers mesh creation/removal
        playersDataRef,       // Real-time position data (no re-renders)
        connectionError,      // Error if connection rejected
        joinRoom: mpJoinRoom,
        sendPosition,
        sendChat: mpSendChat,
        sendEmoteBubble: mpSendEmoteBubble,
        sendEmote: mpSendEmote,
        changeRoom: mpChangeRoom,
        updatePuffle: mpUpdatePuffle,
        sendBallKick: mpSendBallKick,
        requestBallSync: mpRequestBallSync,
        registerCallbacks,
        chatMessages,
        worldTimeRef: serverWorldTimeRef // Server-synchronized world time
    } = useMultiplayer();
    
    // Challenge context for position updates and dance trigger
    const { updateLocalPosition, shouldDance, clearDance } = useChallenge();
    
    // Refs for other player meshes and state
    const otherPlayerMeshesRef = useRef(new Map()); // playerId -> { mesh, bubble, puffle }
    const lastPositionSentRef = useRef({ x: 0, y: 0, z: 0, rot: 0, time: 0 });
    const buildPenguinMeshRef = useRef(null); // Will be set in useEffect
    
    // OPTIMIZATION: Reusable vectors to avoid GC pressure in update loop
    const tempVec3Ref = useRef(null);
    const tempOffsetRef = useRef(null);
    
    // Player State
    const posRef = useRef({ x: 0, y: 0, z: 0 });
    const velRef = useRef({ x: 0, y: 0, z: 0 }); // Added y for jump velocity
    const rotRef = useRef(0);
    const keysRef = useRef({});
    const isGroundedRef = useRef(true);
    const jumpRequestedRef = useRef(false);
    
    // Store igloo entry spawn position (so exiting returns to correct igloo)
    const iglooEntrySpawnRef = useRef(null);
    
    // Chat State (for local player bubble)
    const [activeBubble, setActiveBubble] = useState(null);
    const bubbleSpriteRef = useRef(null);
    const isAfkRef = useRef(false);
    const afkMessageRef = useRef(null);
    
    // Igloo Occupancy Bubbles
    const iglooOccupancySpritesRef = useRef(new Map()); // Map of igloo id -> sprite
    const [iglooOccupancy, setIglooOccupancy] = useState({}); // { igloo1: 2, igloo2: 0, ... }
    
    // AI State
    const aiAgentsRef = useRef([]);
    // AI_NAMES, AI_EMOTES, AI_CONVERSATIONS imported from ./config
    // EMOTE_WHEEL_ITEMS imported from ./systems
    
    // Emote Wheel State
    const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);
    const [emoteWheelSelection, setEmoteWheelSelection] = useState(-1);
    const emoteSelectionRef = useRef(-1); // Sticky selection - persists until changed
    const emoteWheelKeyHeld = useRef(false); // Track if T is currently held
    const emoteRef = useRef({ type: null, startTime: 0 });
    const [showPufflePanel, setShowPufflePanel] = useState(false);
    const playerPuffleRef = useRef(null);
    const aiPufflesRef = useRef([]); // { id, puffle }
    
    // Multi-puffle ownership system
    const [ownedPuffles, setOwnedPuffles] = useState(() => {
        // Load from localStorage
        const saved = localStorage.getItem('owned_puffles');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                return data.map(p => Puffle.fromJSON(p));
            } catch { return []; }
        }
        return [];
    });
    
    // Save owned puffles when they change
    useEffect(() => {
        localStorage.setItem('owned_puffles', JSON.stringify(ownedPuffles.map(p => p.toJSON())));
    }, [ownedPuffles]);
    
    // Mobile detection and orientation handling
    useEffect(() => {
        const checkMobile = () => {
            // Check for mobile user agents
            const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            // Check for iPadOS 13+ (reports as Macintosh but has touch)
            const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            
            // Any device with touch support should show mobile controls
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            
            // Mobile = mobile UA OR iPadOS OR touch device
            const mobile = mobileUA || isIPadOS || hasTouch;
            setIsMobile(mobile);
        };
        
        const checkOrientation = () => {
            setIsLandscape(window.innerWidth > window.innerHeight);
        };
        
        checkMobile();
        checkOrientation();
        
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);
    
    // Use prop for equipped puffle, with local ref for 3D tracking
    const puffle = playerPuffle;
    
    // Portal State
    const [nearbyPortal, setNearbyPortal] = useState(null);
    const portalsRef = useRef([]);
    
    // Town Interaction State
    const [nearbyInteraction, setNearbyInteraction] = useState(null);
    
    // Bench Sitting State
    const [seatedOnBench, setSeatedOnBench] = useState(null); // { benchId, snapPoint, worldPos }
    const seatedRef = useRef(null); // For game loop access
    
    // Mobile State
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [showDebugPosition, setShowDebugPosition] = useState(false);
    const showDebugPositionRef = useRef(false);
    const [debugPosition, setDebugPosition] = useState({ x: 0, y: 0, z: 0, offsetX: 0, offsetZ: 0 });
    
    // Settings (persisted to localStorage)
    const [gameSettings, setGameSettings] = useState(() => {
        const defaults = {
            leftHanded: false,
            cameraSensitivity: 0.3,
            soundEnabled: true,
            showFps: false,
            snowEnabled: true // Snowfall particles - ON by default
        };
        try {
            const saved = localStorage.getItem('game_settings');
            if (saved) {
                // Merge saved settings with defaults (so new settings get their default values)
                return { ...defaults, ...JSON.parse(saved) };
            }
            return defaults;
        } catch {
            return defaults;
        }
    });
    
    // Day/night cycle state
    const [dayTime, setDayTime] = useState(0.35); // 0-1, 0.35 = morning
    const [daySpeed, setDaySpeed] = useState(0.01); // Speed multiplier for debug
    const dayTimeRef = useRef(0.35);
    const daySpeedRef = useRef(0.01);
    
    // Lighting refs for day/night cycle
    const sunLightRef = useRef(null);
    const ambientLightRef = useRef(null);
    const propLightsRef = useRef([]); // Town prop lights (lamps, campfire, tree, etc.)
    const lightsOnRef = useRef(true); // Track if lights are currently on
    
    // Snowfall system ref
    const snowfallSystemRef = useRef(null);
    
    // Save settings when they change
    useEffect(() => {
        localStorage.setItem('game_settings', JSON.stringify(gameSettings));
    }, [gameSettings]);
    
    // Save player position periodically and on unmount
    useEffect(() => {
        const savePosition = () => {
            if (posRef.current && roomRef.current === 'town') {
                try {
                    const posData = {
                        x: posRef.current.x,
                        y: posRef.current.y,
                        z: posRef.current.z,
                        room: 'town',
                        savedAt: Date.now()
                    };
                    localStorage.setItem('player_position', JSON.stringify(posData));
                    console.log('💾 Saved player position:', posData);
                } catch (e) {
                    console.warn('Failed to save position:', e);
                }
            }
        };
        
        // Save position every 5 seconds
        const interval = setInterval(savePosition, 5000);
        
        // Save on page unload
        window.addEventListener('beforeunload', savePosition);
        
        return () => {
            clearInterval(interval);
            window.removeEventListener('beforeunload', savePosition);
            savePosition(); // Final save on unmount
        };
    }, []);
    
    // Joystick input ref (updated by VirtualJoystick component)
    const joystickInputRef = useRef({ x: 0, y: 0 });
    const cameraRotationRef = useRef({ deltaX: 0, deltaY: 0 });
    const gameSettingsRef = useRef(gameSettings);
    
    // Keep gameSettingsRef updated
    useEffect(() => {
        gameSettingsRef.current = gameSettings;
    }, [gameSettings]);
    const mobileControlsRef = useRef({ forward: false, back: false, left: false, right: false });
    const pinchRef = useRef({ startDist: 0, active: false });
    

    useEffect(() => {
        if (!mountRef.current || !window.THREE) return;
        const THREE = window.THREE;
        const OrbitControls = window.THREE.OrbitControls;
        
        // Setup
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        // Arctic sky - deeper blue to match icy ground
        scene.background = new THREE.Color('#6AA8C8'); // Icy arctic sky
        
        // OPTIMIZATION: Initialize reusable vectors
        tempVec3Ref.current = new THREE.Vector3();
        tempOffsetRef.current = new THREE.Vector3();
        
        // Initialize wizard trail particle system
        wizardTrailSystemRef.current = new WizardTrailSystem(THREE, scene);
        
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        cameraRef.current = camera;
        camera.position.set(0, 15, -15);
        
        // ==================== DEVICE DETECTION ====================
        // Detect device types for performance optimizations
        const isIOSDevice = /iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isMacDesktop = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                            navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
        const isAndroidDevice = /Android/i.test(navigator.userAgent);
        
        // All Apple devices get optimizations (Mac desktop + iOS)
        const isAppleDevice = isIOSDevice || isMacDesktop;
        
        // Mobile devices need GPU optimizations (iOS + Android phones/tablets)
        // Desktop (PC/Mac) can handle full quality
        const isMobileGPU = isIOSDevice || isAndroidDevice;
        
        // Store detection globally for other components to use
        window._isMacDevice = isAppleDevice; // Keep same name for compatibility
        window._isIOSDevice = isIOSDevice;
        window._isAppleDevice = isAppleDevice;
        window._isAndroidDevice = isAndroidDevice;
        window._isMobileGPU = isMobileGPU;
        
        // Log for debugging
        console.log('🖥️ Platform:', navigator.platform, '| isApple:', isAppleDevice, '| isIOS:', isIOSDevice, '| isAndroid:', isAndroidDevice, '| isMobileGPU:', isMobileGPU);
        
        // ==================== RENDERER SETTINGS ====================
        // Mobile GPUs (iOS + Android) need optimizations for smooth gameplay
        // Desktop (Windows/Linux/Mac desktop) can handle full quality
        const rendererOptions = {
            antialias: !isMobileGPU, // Mobile: false (big perf gain), Desktop: true
            powerPreference: 'high-performance',
            depth: true
        };
        
        // Mobile: lower precision for faster shader math
        if (isMobileGPU) {
            rendererOptions.precision = 'mediump';
            rendererOptions.stencil = false;
        }
        
        const renderer = new THREE.WebGLRenderer(rendererOptions);
        
        // Mobile: DPR capped at 1.0 (renders at native resolution, not 2x/3x)
        // This is the BIGGEST performance win - high DPR renders 4-9x more pixels
        // Desktop: allow up to 2x for crisp visuals
        const dpr = isMobileGPU ? Math.min(window.devicePixelRatio, 1.0) : Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Mobile: flat rendering (faster), Desktop: full rendering
        if (isMobileGPU) {
            renderer.toneMapping = THREE.NoToneMapping;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            if (isAndroidDevice) {
                console.log('🤖 Android device detected - applied mobile GPU optimizations: antialias=false, dpr=1.0, mediump precision');
            } else {
                console.log('🍎 iOS device detected - applied mobile GPU optimizations: antialias=false, dpr=1.0, mediump precision');
            }
        }
        
        // Shadows: Mobile gets BasicShadowMap (fastest), Desktop gets PCFShadowMap (better quality)
        renderer.shadowMap.enabled = true;
        if (isMobileGPU) {
            renderer.shadowMap.type = THREE.BasicShadowMap;
            console.log('📱 Mobile: Using BasicShadowMap for better performance');
        } else {
            renderer.shadowMap.type = THREE.PCFShadowMap;
        }
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        // Initialize raycaster for player click detection
        raycasterRef.current = new THREE.Raycaster();
        
        const clock = new THREE.Clock();
        clockRef.current = clock;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.minDistance = 5;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 2 - 0.1; 
        controls.enablePan = false; 
        controlsRef.current = controls;
        
        // Window resize handler (important for iOS URL bar showing/hiding)
        const handleResize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);
        // Also listen for orientation change on mobile
        window.addEventListener('orientationchange', () => {
            // Delay to let iOS finish orientation animation
            setTimeout(handleResize, 100);
        });

        // Lighting - Arctic daylight (cool, icy blue tones)
        // Removed hemisphere light that was causing ground glares
        const ambient = new THREE.AmbientLight(0xC0E0F0, 0.5); // Cool icy ambient
        scene.add(ambient);
        ambientLightRef.current = ambient;
        
        const sunLight = new THREE.DirectionalLight(0xF8F8FF, 1.0); // Cold bright sun
        sunLight.position.set(80, 100, 60);
        sunLight.castShadow = true;
        // Mobile: 512 shadow map (faster), Desktop: 1024 (better quality)
        const shadowMapSize = isMobileGPU ? 512 : 1024;
        sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.bias = -0.0005; // Reduce shadow acne
        scene.add(sunLight);
        sunLightRef.current = sunLight;
        
        // ==================== SNOWFALL PARTICLE SYSTEM ====================
        const snowfallSystem = new SnowfallSystem(THREE, scene, { isMobileGPU });
        snowfallSystem.create({ x: posRef.current?.x || 50, z: posRef.current?.z || 50 });
        snowfallSystemRef.current = snowfallSystem;
        
        // --- ICY ICEBERG ISLAND GENERATION ---
        const generateCity = () => {
            const map = [];
            const dummy = new THREE.Object3D();
            
            // Icy color palette - more blues, less white
            const ICE_COLORS = [
                '#7EB8D8', // Light ice blue
                '#6AA8C8', // Medium ice blue  
                '#5898B8', // Deeper ice blue
                '#4888A8', // Dark ice blue
                '#3878A0', // Deep blue
                '#A8D0E0', // Pale ice (less common)
            ];
            const WATER_ARCTIC = '#1A4A6A';
            const WATER_DEEP = '#0A3A5A';
            
            // All tiles are now ice (type 2) - no water, walls handle boundaries
            for(let x=0; x<CITY_SIZE; x++) {
                map[x] = [];
                for(let z=0; z<CITY_SIZE; z++) {
                    map[x][z] = 2; // All ice ground - walls handle boundaries
                }
            }
            
            mapRef.current = map;
            
            // Create one large ice plane instead of grid tiles
            const iceGeo = new THREE.PlaneGeometry(CITY_SIZE * BUILDING_SCALE, CITY_SIZE * BUILDING_SCALE, 32, 32);
            iceGeo.rotateX(-Math.PI / 2);
            
            // Add vertex color variation for organic look
            const colors = [];
            const positions = iceGeo.attributes.position;
            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const z = positions.getZ(i);
                
                // Use noise-like pattern for color variation
                const noise = Math.sin(x * 0.1) * Math.cos(z * 0.1) + 
                              Math.sin(x * 0.05 + 1) * Math.cos(z * 0.07) * 0.5;
                const colorIndex = Math.floor((noise + 1) * 2.5) % ICE_COLORS.length;
                const color = new THREE.Color(ICE_COLORS[colorIndex]);
                
                // Slight darkening towards edges
                const distFromCenter = Math.sqrt(x*x + z*z) / (CITY_SIZE * BUILDING_SCALE / 2);
                const edgeDarken = Math.max(0, 1 - distFromCenter * 0.3);
                color.multiplyScalar(0.85 + edgeDarken * 0.15);
                
                colors.push(color.r, color.g, color.b);
            }
            iceGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            
            const iceMat = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.85, // High roughness to prevent specular glare
                metalness: 0, // No metallic reflections
            });
            
            const icePlane = new THREE.Mesh(iceGeo, iceMat);
            icePlane.position.set(CITY_SIZE/2 * BUILDING_SCALE, 0, CITY_SIZE/2 * BUILDING_SCALE);
            icePlane.receiveShadow = true;
            scene.add(icePlane);
            
            // No water ring - walls handle boundaries now
            
            // ==================== SPAWN TOWN CENTER PROPS ====================
            // Create TownCenter room instance and spawn all props (trees, igloos, lamps, etc.)
            const townCenter = new TownCenter(THREE);
            townCenterRef.current = townCenter;
            const { meshes: propMeshes, lights: propLights, collisionSystem } = townCenter.spawn(scene);
            
            // Store prop lights for day/night cycle toggling
            propLightsRef.current = propLights;
            
            console.log(`Town Center spawned: ${propMeshes.length} props, ${propLights.length} lights`);
            
            // ==================== IGLOO OCCUPANCY BUBBLES ====================
            // Create occupancy indicator sprites above each igloo
            const townCenterX = CENTER_X;
            const townCenterZ = CENTER_Z;
            
            // 10 unique igloos - each has its own room
            // igloo3 is SKNY GANG nightclub-themed igloo
            const iglooData = [
                { id: 'igloo1', x: -75, z: -75, room: 'igloo1' },
                { id: 'igloo2', x: -50, z: -78, room: 'igloo2' },
                { id: 'igloo3', x: -25, z: -75, room: 'igloo3' },   // SKNY GANG nightclub
                { id: 'igloo4', x: 25, z: -75, room: 'igloo4' },
                { id: 'igloo5', x: 50, z: -78, room: 'igloo5' },
                { id: 'igloo6', x: 75, z: -75, room: 'igloo6' },
                { id: 'igloo7', x: -70, z: -15, room: 'igloo7' },
                { id: 'igloo8', x: -40, z: -18, room: 'igloo8' },
                { id: 'igloo9', x: 40, z: -18, room: 'igloo9' },
                { id: 'igloo10', x: 70, z: -15, room: 'igloo10' },
            ];
            
            // Clear any existing sprites
            iglooOccupancySpritesRef.current.forEach(sprite => {
                if (sprite.parent) sprite.parent.remove(sprite);
            });
            iglooOccupancySpritesRef.current.clear();
            
            // Create sprite for each igloo with unique MapleStory-style banners
            iglooData.forEach((igloo, index) => {
                const sprite = createIglooOccupancySprite(THREE, 0, index); // Start with 0, unique style per igloo
                sprite.position.set(
                    townCenterX + igloo.x,
                    10, // Higher above igloo for bigger banners
                    townCenterZ + igloo.z
                );
                sprite.userData.iglooId = igloo.id;
                sprite.userData.iglooRoom = igloo.room;
                sprite.userData.iglooX = townCenterX + igloo.x;
                sprite.userData.iglooZ = townCenterZ + igloo.z;
                sprite.userData.iglooIndex = index; // Store index for style
                sprite.visible = false; // Start hidden, show when player is close
                scene.add(sprite);
                iglooOccupancySpritesRef.current.set(igloo.id, sprite);
            });
            
            console.log(`Created ${iglooOccupancySpritesRef.current.size} igloo occupancy sprites`);
            
            return { butterflyGroup: null, townCenter }; // No butterflies in arctic
        };
        
        // Generate scenery based on current room
        let roomData = null;
        let butterflyGroup = null;
        
        if (room === 'town') {
            const cityResult = generateCity();
            butterflyGroup = cityResult.butterflyGroup;
            const townCenterX = CENTER_X;
            const townCenterZ = CENTER_Z;
            // Park bench positions (matching TownCenter.js propPlacements)
            const C = townCenterX; // CENTER = 110
            const benchSnapPoints = [{ x: -0.6, z: 0 }, { x: 0, z: 0 }, { x: 0.6, z: 0 }];
            const parkBenches = [
                // T-stem walkway benches
                { x: C - 22, z: C + 20, rotation: Math.PI / 2 },
                { x: C + 22, z: C + 20, rotation: -Math.PI / 2 },
                { x: C - 22, z: C + 45, rotation: Math.PI / 2 },
                { x: C + 22, z: C + 45, rotation: -Math.PI / 2 },
                // T-bar walkway benches (south edge)
                { x: C - 35, z: C - 22, rotation: Math.PI },
                { x: C + 35, z: C - 22, rotation: Math.PI },
                { x: C - 65, z: C - 22, rotation: Math.PI },
                { x: C + 65, z: C - 22, rotation: Math.PI },
                // T-bar walkway benches (north edge)
                { x: C - 35, z: C - 68, rotation: 0 },
                { x: C + 35, z: C - 68, rotation: 0 },
                { x: C - 65, z: C - 68, rotation: 0 },
                { x: C + 65, z: C - 68, rotation: 0 },
                // Benches near buildings
                { x: C - 55, z: C + 48, rotation: -Math.PI / 2 },
                { x: C + 55, z: C + 48, rotation: Math.PI / 2 },
            ].map(b => ({
                type: 'bench',
                position: { x: b.x, z: b.z },
                rotation: b.rotation,
                seatHeight: 0.8,
                platformHeight: 0,
                snapPoints: benchSnapPoints,
                interactionRadius: 2.5
            }));
            
            // Christmas tree benches (4 benches in circle around tree)
            const treeX = C + 43.2;
            const treeZ = C + 6.8;
            const treeBenchRadius = 8;
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const benchX = treeX + Math.cos(angle) * treeBenchRadius;
                const benchZ = treeZ + Math.sin(angle) * treeBenchRadius;
                const flipRotation = (i === 0 || i === 2) ? Math.PI : 0;
                parkBenches.push({
                    type: 'bench',
                    position: { x: benchX, z: benchZ },
                    rotation: angle + Math.PI / 2 + flipRotation,
                    seatHeight: 0.8,
                    platformHeight: 0,
                    snapPoints: benchSnapPoints,
                    interactionRadius: 2.5
                });
            }
            
            // Campfire log seats (6 logs in circle around campfire, facing inward)
            const campfireX = C;
            const campfireZ = C + 10;
            const seatRadius = 5.5;
            const logSeats = [];
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const seatX = campfireX + Math.cos(angle) * seatRadius;
                const seatZ = campfireZ + Math.sin(angle) * seatRadius;
                // Rotation faces the campfire (angle + PI points toward center)
                const needsFlip = (i === 1 || i === 2 || i === 4 || i === 5);
                const flipOffset = needsFlip ? Math.PI : 0;
                logSeats.push({
                    type: 'log',
                    position: { x: seatX, z: seatZ },
                    rotation: angle + Math.PI / 2 + flipOffset,
                    seatHeight: 0.5,
                    platformHeight: 0,
                    snapPoints: [{ x: -0.6, z: 0 }, { x: 0.6, z: 0 }], // Along log length
                    interactionRadius: 2.5,
                    bidirectionalSit: true // Sit from either side, face based on approach
                });
            }
            
            roomData = {
                bounds: null, // Town uses wall collision
                spawnPos: { x: townCenterX, z: townCenterZ + 85 }, // South of dojo, facing north
                furniture: [
                    // Nightclub roof couch
                    {
                        type: 'couch',
                        position: { x: townCenterX, z: townCenterZ - 75 },
                        rotation: 0,
                        seatHeight: 13 + 0.95,
                        platformHeight: 13,
                        snapPoints: [
                            { x: -1.5, z: 0 },
                            { x: 0, z: 0 },
                            { x: 1.5, z: 0 }
                        ],
                        interactionRadius: 3
                    },
                    // All park benches
                    ...parkBenches,
                    // Campfire log seats
                    ...logSeats
                ]
            };
        } else if (room === 'dojo') {
            // Simple collision map for dojo
            const map = [];
            for(let x = 0; x < 10; x++) {
                map[x] = [];
                for(let z = 0; z < 10; z++) map[x][z] = 2;
            }
            mapRef.current = map;
            roomData = generateDojoInterior(THREE, scene);
        } else if (room === 'pizza') {
            // Simple collision map for pizza
            const map = [];
            for(let x = 0; x < 10; x++) {
                map[x] = [];
                for(let z = 0; z < 10; z++) map[x][z] = 2;
            }
            mapRef.current = map;
            roomData = generatePizzaInterior(THREE, scene);
        } else if (room === 'nightclub') {
            // Generate nightclub interior - all room data is in Nightclub.js
            const nightclub = new Nightclub(THREE);
            nightclub.spawn(scene);
            nightclubRef.current = nightclub;
            roomData = nightclub.getRoomData();
        } else if (room.startsWith('igloo')) {
            // igloo3 is SKNY GANG nightclub-themed igloo
            if (room === 'igloo3') {
                roomData = generateSKNYIglooInterior(THREE, scene);
                // Store update function for SKNY interior animations
                sknyIglooInteriorRef.current = roomData;
            } else {
                roomData = generateIglooInterior(THREE, scene);
            }
            mapRef.current = roomData.map;
            // Request ball sync from server when entering igloo
            if (mpRequestBallSync) {
                setTimeout(() => mpRequestBallSync(), 100);
            }
        }
        
        // Store roomData in ref for multiplayer access
        roomDataRef.current = roomData;
        
        // Update roomRef for collision checks
        roomRef.current = room;
        
        const spawnPuffleMesh = (puffleObj, ownerPosition) => {
            if (!puffleObj) return null;
            
            // Set puffle's internal position first (slightly offset from owner)
            const offsetX = ownerPosition.x + 1.5;
            const offsetZ = ownerPosition.z + 1.5;
            puffleObj.position = { x: offsetX, y: 0, z: offsetZ };
            
            // Create mesh (will use puffle's internal position)
            const mesh = puffleObj.createMesh(THREE);
            mesh.position.set(offsetX, 0.5, offsetZ);
            scene.add(mesh);
            puffleObj.mesh = mesh;
            
            return mesh;
        };
        
        // --- PORTAL MARKERS (Town only) ---
        const centerX = CENTER_X;
        const centerZ = CENTER_Z;
        
        // Only generate town buildings in town room
        if (room !== 'town') {
            // Skip building generation for non-town rooms
        } else {
        
        // Create building label sprite
        const createLabelSprite = (text, emoji = '') => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 80;
            const ctx = canvas.getContext('2d');
            
            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.roundRect(0, 0, 256, 80, 10);
            ctx.fill();
            
            // Emoji
            ctx.font = '32px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(emoji, 128, 30);
            
            // Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(text, 128, 60);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(6, 2, 1);
            return sprite;
        };

        // Build high-quality procedural buildings using extracted building classes
        
        BUILDINGS.forEach(building => {
            let buildingGroup;
            const { w, h, d } = building.size;
            
            // Use standalone building classes for high-quality building generation
            if (building.id === 'dojo') {
                buildingGroup = createDojo(THREE, { w, h, d });
            } else if (building.id === 'market') {
                buildingGroup = createGiftShop(THREE, { w, h, d });
            } else if (building.id === 'plaza') {
                buildingGroup = createPizzaParlor(THREE, { w, h, d });
            } else {
                // Fallback to simple building
                buildingGroup = new THREE.Group();
                const wallGeo = new THREE.BoxGeometry(w, h, d);
                const wallMat = new THREE.MeshStandardMaterial({ color: building.wallColor || 0x808080 });
                const walls = new THREE.Mesh(wallGeo, wallMat);
                walls.position.y = h / 2;
                walls.castShadow = true;
                walls.receiveShadow = true;
                buildingGroup.add(walls);
            }
            
            // Add label sprite above building
            const sign = createLabelSprite(building.name, building.emoji);
            sign.position.set(0, h + 5, d / 2 + 1);
            sign.name = `label_${building.id}`; // Name for visibility control
            buildingGroup.add(sign);
            
            // Add interactive glow for buildings with games
            if (building.gameId) {
                const glowGeo = new THREE.CircleGeometry(2, 16);
                const glowMat = new THREE.MeshBasicMaterial({ 
                    color: 0x44ff44,
                    transparent: true,
                    opacity: 0.4
                });
                const glow = new THREE.Mesh(glowGeo, glowMat);
                glow.rotation.x = -Math.PI / 2;
                glow.position.set(0, 0.05, d / 2 + 3);
                glow.name = `door_glow_${building.id}`;
                buildingGroup.add(glow);
            }
            
            // Position building in world
            buildingGroup.position.set(
                centerX + building.position.x,
                0,
                centerZ + building.position.z
            );
            
            // Apply building rotation (for T-street layout)
            if (building.rotation) {
                buildingGroup.rotation.y = building.rotation;
            }
            
            scene.add(buildingGroup);
            
            // Calculate door position based on rotation
            const doorOffset = building.size.d / 2 + 1.5;
            const rot = building.rotation || 0;
            const doorX = centerX + building.position.x + Math.sin(rot) * doorOffset;
            const doorZ = centerZ + building.position.z + Math.cos(rot) * doorOffset;
            
            // Store building mesh for visuals and portal detection
            portalsRef.current.push({ 
                ...building, 
                mesh: buildingGroup,
                doorPosition: {
                    x: doorX,
                    z: doorZ
                },
                radius: building.doorRadius
            });
        });
        } // End town-only building generation
        
        // --- PENGUIN BUILDER (extracted to PenguinBuilder.js) ---
        const penguinBuilder = createPenguinBuilder(THREE);
        const { buildPenguinMesh } = penguinBuilder;
        
        // Store buildPenguinMesh for multiplayer to use
        buildPenguinMeshRef.current = buildPenguinMesh;
        
        // NOTE: cacheAnimatedParts and animateCosmeticsFromCache are imported from PenguinBuilder.js
        // The inline versions below handle the animation loop specifics
        
        // Wrapper that uses imported functions but passes VOXEL_SIZE
        const animateCosmetics = (cache, time, delta) => {
            animateCosmeticsFromCache(cache, time, delta, VOXEL_SIZE);
        };
        
        // Store buildPenguinMesh for multiplayer to use
        buildPenguinMeshRef.current = buildPenguinMesh;
        
        // OPTIMIZATION: Cache animated cosmetic parts to avoid traverse() every frame
        // This function should be called once after building a mesh
        const cacheAnimatedParts = (mesh) => {
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
        };
        
        // OPTIMIZATION: Animate cosmetics using cached references instead of traverse
        const animateCosmeticsFromCache = (cache, time, delta) => {
            if (!cache) return;
            
            // Propeller blades
            if (cache.propellerBlades) {
                cache.propellerBlades.rotation.y += delta * 15;
            }
            
            // Smoke emitter (cigarette, pipe, cigar)
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
            
            // Wings (angel/demon)
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
        };
        
        // --- BUILD PLAYER ---
        const playerWrapper = buildPenguinMesh(penguinData);
        playerRef.current = playerWrapper;
        // OPTIMIZATION: Cache animated parts for local player
        playerWrapper.userData._animatedPartsCache = cacheAnimatedParts(playerWrapper);
        scene.add(playerWrapper);
        
        // Check if mount should be hidden based on settings (on initial load)
        try {
            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
            if (settings.mountEnabled === false) {
                mountEnabledRef.current = false;
                const mountGroup = playerWrapper.getObjectByName('mount');
                if (mountGroup) {
                    mountGroup.visible = false;
                }
            }
        } catch (e) { /* ignore */ }
        
        // Spawn position: use custom spawn (from portal exit) or default room spawn
        if (customSpawnPos && room === 'town') {
            // Exiting dojo/igloo: spawn at portal location in town
            // customSpawnPos is an OFFSET from town center, so add center coordinates
            const townCenterX = CENTER_X;
            const townCenterZ = CENTER_Z;
            posRef.current = { 
                x: townCenterX + customSpawnPos.x, 
                y: 0, 
                z: townCenterZ + customSpawnPos.z 
            };
        } else if (room === 'town') {
            // Town room: check localStorage for saved position FIRST
            let loadedFromStorage = false;
            try {
                const savedPos = localStorage.getItem('player_position');
                if (savedPos) {
                    const parsed = JSON.parse(savedPos);
                    if (parsed.room === 'town' && parsed.x !== undefined && parsed.z !== undefined) {
                        posRef.current = { x: parsed.x, y: parsed.y || 0, z: parsed.z };
                        loadedFromStorage = true;
                        console.log('✅ Restored player position from localStorage:', parsed);
                    }
                }
            } catch (e) {
                console.warn('Failed to load saved position:', e);
            }
            
            // If no saved position, use default spawn at TOWN CENTER (same as /spawn command)
            if (!loadedFromStorage) {
                const townCenterX = CENTER_X;
                const townCenterZ = CENTER_Z;
                // Spawn at town center - same location as /spawn command
                posRef.current = { x: townCenterX, y: 0, z: townCenterZ };
                rotRef.current = 0; // Face south (default orientation)
            }
        } else if (roomData && roomData.spawnPos) {
            // Other rooms: use room's spawn position
            posRef.current = { x: roomData.spawnPos.x, y: 0, z: roomData.spawnPos.z };
        } else {
            // Fallback spawn at TOWN CENTER (same as /spawn command)
            const townCenterX = CENTER_X;
            const townCenterZ = CENTER_Z;
            posRef.current = { x: townCenterX, y: 0, z: townCenterZ };
            rotRef.current = 0; // Face south (default orientation)
        }
        
        // CRITICAL: Sync mesh position with posRef IMMEDIATELY after spawn logic
        // This ensures first-time players don't spawn at (0,0,0) before game loop runs
        if (playerRef.current) {
            playerRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
            playerRef.current.rotation.y = rotRef.current;
        }

        // Spawn player puffle if equipped (ensure it's a Puffle instance)
        if (puffle) {
            // If puffle is not a proper Puffle instance, recreate it
            let puffleInstance = puffle;
            if (!(puffle instanceof Puffle) || typeof puffle.tick !== 'function') {
                puffleInstance = new Puffle({
                    id: puffle.id,
                    name: puffle.name || 'Puffle',
                    color: puffle.color || 'blue',
                    happiness: puffle.happiness,
                    energy: puffle.energy,
                    hunger: puffle.hunger
                });
            }
            const mesh = spawnPuffleMesh(puffleInstance, posRef.current);
            playerPuffleRef.current = puffleInstance;
            playerPuffleRef.current.mesh = mesh;
        }
        
        // --- INITIALIZE/RESTORE AI AGENTS ---
        // AI persist across room changes. Only create new AI data if none exist.
        // centerX and centerZ already declared above
        
        if (aiAgentsRef.current.length === 0) {
            // First time - create AI agents
            AI_NAMES.forEach((name, i) => {
                const skins = Object.keys(PALETTE).filter(k => !['floorLight','floorDark','wood','rug','glass','beerGold','mirrorFrame','mirrorGlass', 'asphalt', 'roadLine', 'buildingBrickRed', 'buildingBrickYellow', 'buildingBrickBlue', 'windowLight', 'windowDark', 'grass', 'snow', 'water', 'waterDeep', 'butterfly1', 'butterfly2', 'butterfly3'].includes(k));
                const hats = Object.keys(ASSETS.HATS);
                // Filter out promo-code-only items like "joe" from AI clothing
                const bodyItems = Object.keys(ASSETS.BODY).filter(k => !ASSETS.BODY[k]?.hideBody);
                
                const aiData = {
                    skin: skins[Math.floor(Math.random() * skins.length)],
                    hat: hats[Math.floor(Math.random() * hats.length)],
                    eyes: 'normal',
                    mouth: 'beak',
                    bodyItem: bodyItems[Math.floor(Math.random() * bodyItems.length)]
                };
                
                // Store appearance data for mesh rebuilding
                const aiMesh = buildPenguinMesh(aiData);
                
                // Town spawn - avoid spawning inside buildings, water, or out of bounds
                let sx, sz;
                let spawnAttempts = 0;
                let validSpawn = false;
                
                do {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 10 + Math.random() * 20; // Spawn in middle area
                    sx = centerX + Math.cos(angle) * dist;
                    sz = centerZ + Math.sin(angle) * dist;
                    
                    validSpawn = true;
                    
                    // Check map bounds (stay away from edges/water)
                    const gridX = Math.floor(sx / BUILDING_SCALE);
                    const gridZ = Math.floor(sz / BUILDING_SCALE);
                    if (gridX < 3 || gridX >= CITY_SIZE - 3 || gridZ < 3 || gridZ >= CITY_SIZE - 3) {
                        validSpawn = false;
                    }
                    
                    // Check against all buildings (with larger margin)
                    if (validSpawn) {
                        for (const building of BUILDINGS) {
                            const bx = centerX + building.position.x;
                            const bz = centerZ + building.position.z;
                            const hw = building.size.w / 2 + 4; // Larger margin
                            const hd = building.size.d / 2 + 4;
                            
                            if (sx > bx - hw && sx < bx + hw && sz > bz - hd && sz < bz + hd) {
                                validSpawn = false;
                                break;
                            }
                        }
                    }
                    
                    spawnAttempts++;
                } while (!validSpawn && spawnAttempts < 20);
                
                aiMesh.position.set(sx, 0, sz);
                scene.add(aiMesh);

                // 20% chance to have a puffle companion
                let aiPuffle = null;
                if (Math.random() < 0.2) {
                    const puffleColors = Object.keys(Puffle.COLORS);
                    const randomColor = puffleColors[Math.floor(Math.random() * puffleColors.length)];
                    aiPuffle = new Puffle({ 
                        color: randomColor, 
                        name: `${name}'s Puffle`
                    });
                    spawnPuffleMesh(aiPuffle, { x: sx, y: 0, z: sz });
                    aiPufflesRef.current.push({ id: i, puffle: aiPuffle });
                }

                aiAgentsRef.current.push({
                    id: i,
                    name: name,
                    aiData: aiData, // Store for rebuilding mesh
                    mesh: aiMesh,
                    pos: { x: sx, y: 0, z: sz },
                    rot: Math.random() * Math.PI * 2,
                    currentRoom: 'town',
                    action: 'idle',
                    conversationCooldown: 0,
                    conversationPartner: null,
                    conversationScript: null,
                    conversationLineIdx: 0,
                    conversationTurn: false,
                    target: null,
                    actionTimer: 0,
                    emoteType: null,
                    emoteStart: 0,
                    bubble: null,
                    bubbleTimer: 0
                });
            });
        } else {
            // Room changed - rebuild AI meshes and add to new scene
            aiAgentsRef.current.forEach(ai => {
                // Rebuild mesh using stored appearance data
                const newMesh = buildPenguinMesh(ai.aiData);
                newMesh.position.set(ai.pos.x, 0, ai.pos.z);
                newMesh.rotation.y = ai.rot;
                // Show only if AI is in the same room as player
                newMesh.visible = (ai.currentRoom === room);
                scene.add(newMesh);
                ai.mesh = newMesh;
                ai.bubble = null; // Clear old bubble reference
            });
            
            // Rebuild AI puffle meshes
            aiPufflesRef.current.forEach(entry => {
                if (entry.puffle) {
                    const puffleMesh = entry.puffle.createMesh(THREE);
                    puffleMesh.position.set(entry.puffle.position.x, 0.5, entry.puffle.position.z);
                    // Find the AI owner - O(n) is okay here, only runs on room change
                    const owner = aiAgentsRef.current.find(a => a.id === entry.id);
                    puffleMesh.visible = owner ? (owner.currentRoom === room) : false;
                    scene.add(puffleMesh);
                    entry.puffle.mesh = puffleMesh;
                }
            });
        }
        
        // --- SENSEI PENGUIN (Dojo only) ---
        if (room === 'dojo') {
            const senseiData = {
                skin: 'grey',
                hat: 'sensei',
                eyes: 'normal',
                mouth: 'beard',
                bodyItem: 'none'
            };
            const senseiMesh = buildPenguinMesh(senseiData);
            // 25% bigger than normal penguins
            senseiMesh.scale.set(1.25, 1.25, 1.25);
            // Cushion is at y=0.2, sensei sits on top of it
            senseiMesh.position.set(0, 0.4, -12);
            senseiMesh.name = 'sensei_penguin';
            scene.add(senseiMesh);
        }

        // --- INPUT HANDLING ---
        const handleDown = (e) => {
            if (document.activeElement.tagName === 'INPUT') {
                if(e.code === 'Escape') {
                    document.activeElement.blur();
                }
                return;
            }
            keysRef.current[e.code] = true;
            
            if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                if (emoteRef.current.type) {
                    emoteRef.current.type = null;
                    // Notify server that emote ended (important for continuous emotes like Sit/Breakdance)
                    mpSendEmote(null);
                    if (playerRef.current && playerRef.current.children[0]) {
                        const m = playerRef.current.children[0];
                        m.position.y = 0.8;
                        m.rotation.x = 0;
                        m.rotation.z = 0; // Reset Z rotation too (for Breakdance)
                    }
                }
            }

            if(e.code === 'KeyE') {
                // E key is for portal interactions only
                if (nearbyPortal && (nearbyPortal.targetRoom || nearbyPortal.minigame)) {
                    handlePortalEnter();
                    return;
                }
            }
            if(e.code === 'KeyT') {
                // Only open once when T is first pressed (not on repeat)
                if (!emoteWheelKeyHeld.current) {
                    emoteWheelKeyHeld.current = true;
                    setEmoteWheelOpen(true);
                    setEmoteWheelSelection(-1);
                    emoteSelectionRef.current = -1;
                }
            }
            if(e.code === 'F3') {
                // F3 toggles debug position panel (like Minecraft) - DEV ONLY
                e.preventDefault();
                // Only allow in development mode
                if (process.env.NODE_ENV !== 'production') {
                    setShowDebugPosition(prev => {
                        showDebugPositionRef.current = !prev;
                        return !prev;
                    });
                }
            }
            if(e.code === 'Enter') {
                 const input = document.getElementById('chat-input-field');
                 // Only focus if not already focused (prevents re-focusing after sendChat blurs)
                 if(input && document.activeElement !== input) input.focus();
            }
        };
        const handleUp = (e) => {
            keysRef.current[e.code] = false;
            if(e.code === 'KeyT') {
                // T released - close wheel and play selection if any
                emoteWheelKeyHeld.current = false;
                
                const idx = emoteSelectionRef.current;
                if (idx >= 0 && idx < EMOTE_WHEEL_ITEMS.length) {
                    triggerEmote(EMOTE_WHEEL_ITEMS[idx].id);
                }
                
                // Always close the wheel on T release
                setEmoteWheelOpen(false);
                setEmoteWheelSelection(-1);
                emoteSelectionRef.current = -1;
            }
        };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        
        // --- CACHED VALUES FOR GAME LOOP (calculated once, not every frame) ---
        // centerX and centerZ already declared above at line ~739
        const dojoBuilding = BUILDINGS[0];
        const dojoBxCached = centerX + dojoBuilding.position.x;
        const dojoBzCached = centerZ + dojoBuilding.position.z;
        const dojoHdCached = dojoBuilding.size.d / 2;
        
        // Reusable Maps for AI lookups (updated when AI list changes, not every frame)
        let puffleMap = new Map();
        let aiMap = new Map();
        const rebuildAIMaps = () => {
            puffleMap.clear();
            aiPufflesRef.current.forEach(entry => puffleMap.set(entry.id, entry));
            aiMap.clear();
            aiAgentsRef.current.forEach(ai => aiMap.set(ai.id, ai));
        };
        rebuildAIMaps(); // Initial build
        
        // --- GAME LOOP ---
        let frameCount = 0;
        const update = () => {
            reqRef.current = requestAnimationFrame(update);
            frameCount++;
            
            const delta = clock.getDelta();
            const time = clock.getElapsedTime(); 
            
            const speed = 10 * delta; 
            // PC rotation is faster for tighter turning with A/D keys
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const rotSpeed = isMobileDevice ? (2 * delta) : (4.5 * delta); // PC: 50% increase (3 -> 4.5)
            let moving = false;
            
            // Jump physics constants
            const GRAVITY = 30;
            const JUMP_VELOCITY = 12;
            const GROUND_Y = 0;
            
            // Check keyboard input (disabled during P2P match)
            const inMatch = isInMatchRef.current;
            const keyForward = !inMatch && (keysRef.current['KeyW'] || keysRef.current['ArrowUp']);
            const keyBack = !inMatch && (keysRef.current['KeyS'] || keysRef.current['ArrowDown']);
            const keyLeft = !inMatch && (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']);
            const keyRight = !inMatch && (keysRef.current['KeyD'] || keysRef.current['ArrowRight']);
            const keyJump = !inMatch && keysRef.current['Space'];
            
            // Check mobile button input (legacy D-pad)
            const mobile = mobileControlsRef.current;
            const mobileForward = mobile.forward;
            const mobileBack = mobile.back;
            const mobileLeft = mobile.left;
            const mobileRight = mobile.right;
            const mobileJump = mobile.jump || jumpRequestedRef.current;
            
            // Check joystick input (new PUBG-style controls)
            const joystick = joystickInputRef.current;
            const joystickForward = !inMatch && joystick.y > 0.1;
            const joystickBack = !inMatch && joystick.y < -0.1;
            const joystickMagnitude = Math.sqrt(joystick.x * joystick.x + joystick.y * joystick.y);
            
            // Apply touch camera rotation with sensitivity
            const camDelta = cameraRotationRef.current;
            const camSensitivity = gameSettingsRef.current?.cameraSensitivity || 0.3;
            if (camDelta.deltaX !== 0 && !inMatch) {
                rotRef.current -= camDelta.deltaX * 0.015 * (camSensitivity * 2);
                cameraRotationRef.current.deltaX = 0;
            }
            
            // Handle jumping
            if ((keyJump || mobileJump) && isGroundedRef.current && !inMatch) {
                velRef.current.y = JUMP_VELOCITY;
                isGroundedRef.current = false;
                jumpRequestedRef.current = false;
            }
            
            // ALWAYS apply gravity - this ensures player falls when walking off ledges
            // Gravity will be counteracted by ground/surface collision detection
            velRef.current.y -= GRAVITY * delta;
            
            // Clamp terminal velocity to prevent falling through floors
            if (velRef.current.y < -50) velRef.current.y = -50;
            
            const anyMovementInput = keyForward || keyBack || keyLeft || keyRight || 
                                      mobileForward || mobileBack || mobileLeft || mobileRight ||
                                      joystickMagnitude > 0.1;
            
            // Clear AFK state when movement is detected
            if (anyMovementInput && isAfkRef.current) {
                isAfkRef.current = false;
                afkMessageRef.current = null;
                // Remove the AFK bubble
                if (playerRef.current && bubbleSpriteRef.current) {
                    playerRef.current.remove(bubbleSpriteRef.current);
                    bubbleSpriteRef.current = null;
                }
                setActiveBubble(null);
            }
            
            // Clear emote when movement is detected (for mobile/joystick users)
            // Keyboard users are handled in keydown event
            if (anyMovementInput && emoteRef.current.type && (joystickMagnitude > 0.1 || mobileForward || mobileBack || mobileLeft || mobileRight)) {
                emoteRef.current.type = null;
                mpSendEmote(null); // Notify server
                if (playerRef.current && playerRef.current.children[0]) {
                    const m = playerRef.current.children[0];
                    m.position.y = 0.8;
                    m.rotation.x = 0;
                    m.rotation.z = 0;
                }
            }
            
            // If seated on bench/chair, check for movement to stand up
            if (seatedRef.current) {
                if (anyMovementInput) {
                    // Stand up - move to clear the seat
                    const seatData = seatedRef.current;
                    const benchRot = seatData.benchRotation || 0;
                    const dismountDist = 1.5; // Distance to clear seat
                    
                    // Check if we should dismount backwards (for bar stools facing counter)
                    // INVERTED: dismountBack=true now goes FORWARD (opposite of face direction)
                    const dismountBackward = seatData.dismountBack === true;
                    const direction = dismountBackward ? 1 : -1; // INVERTED: 1 = forwards (behind stool), -1 = backwards
                    
                    // Calculate dismount direction based on seat rotation
                    const offsetX = Math.sin(benchRot) * dismountDist * direction;
                    const offsetZ = Math.cos(benchRot) * dismountDist * direction;
                    
                    // Move player in dismount direction from seat
                    posRef.current.x = seatData.worldPos.x + offsetX;
                    posRef.current.z = seatData.worldPos.z + offsetZ;
                    
                    // Calculate dismount Y: stay at platform height if elevated, otherwise ground
                    // If seat has platformHeight (rooftop benches), stay at that height
                    const platformHeight = seatData.platformHeight || 0;
                    const dismountY = platformHeight > 0 ? platformHeight : 0;
                    posRef.current.y = dismountY;
                    velRef.current.y = 0; // Stop any vertical velocity
                    
                    // Update mesh position
                    if (playerRef.current) {
                        playerRef.current.position.x = posRef.current.x;
                        playerRef.current.position.z = posRef.current.z;
                        playerRef.current.position.y = dismountY;
                    }
                    
                    // Clear seated state
                    seatedRef.current = null;
                    setSeatedOnBench(null);
                    
                    // Clear sit emote
                    emoteRef.current.type = null;
                    mpSendEmote(null);
                    
                    // Reset penguin mesh position (inner body)
                    if (playerRef.current && playerRef.current.children[0]) {
                        const m = playerRef.current.children[0];
                        m.position.y = 0.8;
                        m.rotation.x = 0;
                    }
                } else {
                    // While seated (no movement input), don't move and maintain seat height
                    velRef.current.x = 0;
                    velRef.current.z = 0;
                    velRef.current.y = 0; // No vertical velocity while seated
                    
                    // Keep player at seat height
                    if (seatedRef.current && seatedRef.current.seatHeight) {
                        posRef.current.y = seatedRef.current.seatHeight;
                        if (playerRef.current) {
                            playerRef.current.position.y = seatedRef.current.seatHeight;
                        }
                    }
                }
            }
            else if (!emoteRef.current.type) {
                const isInAir = !isGroundedRef.current;
                
                // Handle rotation
                if (keyLeft || mobileLeft) rotRef.current += rotSpeed;
                if (keyRight || mobileRight) rotRef.current -= rotSpeed;
                
                // === GROUND MOVEMENT ===
                if (!isInAir) {
                    // Mobile Joystick: 2D plane movement - player faces direction of movement
                if (joystickMagnitude > 0.1 && !inMatch) {
                    const moveSpeed = speed * Math.min(joystickMagnitude, 1.0);
                        
                        // Get camera forward direction projected onto XZ plane
                        const camera = cameraRef.current;
                        if (camera) {
                            // Camera looks at player, so forward is from camera toward player
                            const camForward = new THREE.Vector3();
                            camera.getWorldDirection(camForward);
                            camForward.y = 0; // Project onto XZ plane
                            camForward.normalize();
                            
                            // Camera right vector (perpendicular to forward on XZ plane)
                            const camRight = new THREE.Vector3(-camForward.z, 0, camForward.x);
                            
                            // Calculate world movement direction from joystick input
                            // joystick.y = forward/back relative to camera, joystick.x = left/right
                            const worldDirX = camRight.x * joystick.x + camForward.x * joystick.y;
                            const worldDirZ = camRight.z * joystick.x + camForward.z * joystick.y;
                            
                            // Normalize and apply speed
                            const dirMag = Math.sqrt(worldDirX * worldDirX + worldDirZ * worldDirZ);
                            if (dirMag > 0.01) {
                                velRef.current.x = (worldDirX / dirMag) * moveSpeed;
                                velRef.current.z = (worldDirZ / dirMag) * moveSpeed;
                    
                                // Auto-rotate player to face movement direction
                                const targetRot = Math.atan2(worldDirX, worldDirZ);
                                // Smooth rotation interpolation
                                let rotDiff = targetRot - rotRef.current;
                                // Normalize to -PI to PI
                                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                                rotRef.current += rotDiff * 0.2; // Smooth turn (20% per frame)
                                
                    moving = true;
                            }
                        }
                }
                // Keyboard/D-pad movement (digital control)
                    // Note: mobileBack removed - mobile users can't walk backwards
                else if (keyForward || mobileForward) {
                    velRef.current.z = Math.cos(rotRef.current) * speed;
                    velRef.current.x = Math.sin(rotRef.current) * speed;
                    moving = true;
                    } else if (keyBack) { // Keyboard only - no mobileBack
                    velRef.current.z = -Math.cos(rotRef.current) * speed;
                    velRef.current.x = -Math.sin(rotRef.current) * speed;
                    moving = true;
                } else {
                    velRef.current.x = 0;
                    velRef.current.z = 0;
                }
                }
                // === AIR MOVEMENT ===
                // In air: allow movement in facing direction (like ground, but same speed - no boost)
                else {
                    // Mobile Joystick in air: same 2D plane movement with auto-facing
                    if (joystickMagnitude > 0.1 && !inMatch) {
                        const moveSpeed = speed * Math.min(joystickMagnitude, 1.0);
                        
                        const camera = cameraRef.current;
                        if (camera) {
                            const camForward = new THREE.Vector3();
                            camera.getWorldDirection(camForward);
                            camForward.y = 0;
                            camForward.normalize();
                            
                            const camRight = new THREE.Vector3(-camForward.z, 0, camForward.x);
                            
                            const worldDirX = camRight.x * joystick.x + camForward.x * joystick.y;
                            const worldDirZ = camRight.z * joystick.x + camForward.z * joystick.y;
                            
                            const dirMag = Math.sqrt(worldDirX * worldDirX + worldDirZ * worldDirZ);
                            if (dirMag > 0.01) {
                                velRef.current.x = (worldDirX / dirMag) * moveSpeed;
                                velRef.current.z = (worldDirZ / dirMag) * moveSpeed;
                                
                                // Auto-rotate in air too
                                const targetRot = Math.atan2(worldDirX, worldDirZ);
                                let rotDiff = targetRot - rotRef.current;
                                while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                                while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                                rotRef.current += rotDiff * 0.2;
                                
                                moving = true;
                            }
                        }
                    }
                    // Keyboard/D-pad movement in air (same as ground - no boost by default)
                    // Note: mobileBack removed - mobile users can't walk backwards
                    else if (keyForward || mobileForward) {
                        velRef.current.z = Math.cos(rotRef.current) * speed;
                        velRef.current.x = Math.sin(rotRef.current) * speed;
                        moving = true;
                    } else if (keyBack) { // Keyboard only - no mobileBack
                        velRef.current.z = -Math.cos(rotRef.current) * speed;
                        velRef.current.x = -Math.sin(rotRef.current) * speed;
                        moving = true;
                    }
                    // No input in air - maintain momentum (don't reset to 0)
                    // velocity stays as-is from last frame
                }
            } else {
                velRef.current.x = 0;
                velRef.current.z = 0;
            }
            
            const nextX = posRef.current.x + velRef.current.x;
            const nextZ = posRef.current.z + velRef.current.z;
            
            let collided = false;
            let finalX = nextX;
            let finalZ = nextZ;
            
            // Room-specific collision
            if ((roomRef.current === 'dojo') && roomData && roomData.bounds) {
                // Dojo uses square bounds
                const b = roomData.bounds;
                const playerRadius = 0.8;
                finalX = Math.max(b.minX + playerRadius, Math.min(b.maxX - playerRadius, nextX));
                finalZ = Math.max(b.minZ + playerRadius, Math.min(b.maxZ - playerRadius, nextZ));
                if (finalX !== nextX || finalZ !== nextZ) {
                    collided = true;
                }
            } else if (roomRef.current === 'pizza' && roomData && roomData.bounds) {
                // Pizza parlor collision - enclosed room like igloos
                const b = roomData.bounds;
                const playerRadius = 0.6;
                const playerY = posRef.current.y;
                
                // Wall bounds - ALWAYS enforced (enclosed room)
                finalX = Math.max(b.minX + playerRadius, Math.min(b.maxX - playerRadius, nextX));
                finalZ = Math.max(b.minZ + playerRadius, Math.min(b.maxZ - playerRadius, nextZ));
                if (finalX !== nextX || finalZ !== nextZ) collided = true;
                
                // Counter collision - ALWAYS enforced (it's a solid bar)
                // Counter blocks movement regardless of player height
                if (roomData.counter) {
                    const c = roomData.counter;
                    if (finalX > c.minX - playerRadius && finalX < c.maxX + playerRadius &&
                        finalZ > c.minZ - playerRadius && finalZ < c.maxZ + playerRadius) {
                        // Only block if player is below counter top height (2.5)
                        if (playerY < 2.4) {
                            const fromLeft = finalX - (c.minX - playerRadius);
                            const fromRight = (c.maxX + playerRadius) - finalX;
                            const fromFront = finalZ - (c.minZ - playerRadius);
                            const fromBack = (c.maxZ + playerRadius) - finalZ;
                            
                            const minDist = Math.min(fromLeft, fromRight, fromFront, fromBack);
                            if (minDist === fromFront) finalZ = c.minZ - playerRadius;
                            else if (minDist === fromBack) finalZ = c.maxZ + playerRadius;
                            else if (minDist === fromLeft) finalX = c.minX - playerRadius;
                            else finalX = c.maxX + playerRadius;
                            collided = true;
                        }
                    }
                }
                
                // Only check small furniture collision if player is on ground
                if (playerY < 1.5) {
                    // Table pedestal collision (circular, small radius)
                    if (roomData.tables) {
                        for (const table of roomData.tables) {
                            const dx = finalX - table.x;
                            const dz = finalZ - table.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < table.radius + playerRadius) {
                                const angle = Math.atan2(dz, dx);
                                finalX = table.x + Math.cos(angle) * (table.radius + playerRadius);
                                finalZ = table.z + Math.sin(angle) * (table.radius + playerRadius);
                                collided = true;
                            }
                        }
                    }
                    
                    // Chair collision (when on ground)
                    if (roomData.chairs) {
                        for (const chair of roomData.chairs) {
                            const dx = finalX - chair.x;
                            const dz = finalZ - chair.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < chair.radius + playerRadius) {
                                const angle = Math.atan2(dz, dx);
                                finalX = chair.x + Math.cos(angle) * (chair.radius + playerRadius);
                                finalZ = chair.z + Math.sin(angle) * (chair.radius + playerRadius);
                                collided = true;
                            }
                        }
                    }
                    
                    // Bar stool collision (when on ground)
                    if (roomData.stools) {
                        for (const stool of roomData.stools) {
                            const dx = finalX - stool.x;
                            const dz = finalZ - stool.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < stool.radius + playerRadius) {
                                const angle = Math.atan2(dz, dx);
                                finalX = stool.x + Math.cos(angle) * (stool.radius + playerRadius);
                                finalZ = stool.z + Math.sin(angle) * (stool.radius + playerRadius);
                                collided = true;
                            }
                        }
                    }
                }
            } else if (roomRef.current.startsWith('igloo') && roomData && roomData.bounds) {
                // Igloos use CIRCULAR bounds to match dome shape
                const b = roomData.bounds;
                const playerRadius = 0.8;
                const maxRadius = b.radius - playerRadius;
                
                // Calculate distance from center
                const distFromCenter = Math.sqrt(nextX * nextX + nextZ * nextZ);
                
                if (distFromCenter > maxRadius) {
                    // Push player back inside circle
                    const angle = Math.atan2(nextZ, nextX);
                    finalX = Math.cos(angle) * maxRadius;
                    finalZ = Math.sin(angle) * maxRadius;
                    collided = true;
                }
                
                // ==================== FURNITURE COLLISION (Player) ====================
                // Now with proper height checks - player can jump on top of objects
                if (roomData.colliders) {
                    for (const col of roomData.colliders) {
                        // Get collider height (default to 2 units if not specified)
                        const colliderHeight = col.height || col.hh * 2 || 2;
                        const colliderTop = col.y !== undefined ? col.y + colliderHeight : colliderHeight;
                        const colliderBottom = col.y || 0;
                        
                        // AABB collision with player radius
                        const minX = col.x - col.hw - playerRadius;
                        const maxX = col.x + col.hw + playerRadius;
                        const minZ = col.z - col.hd - playerRadius;
                        const maxZ = col.z + col.hd + playerRadius;
                        
                        // Check if player is within XZ bounds
                        if (finalX > minX && finalX < maxX && finalZ > minZ && finalZ < maxZ) {
                            const playerY = posRef.current.y;
                            const playerFeetY = playerY; // Player's feet are at posRef.current.y
                            
                            // If player is ABOVE the collider top, they can stand on it
                            if (playerFeetY >= colliderTop - 0.1) {
                                // Player is on top - check if falling onto it
                                if (velRef.current.y <= 0 && playerFeetY < colliderTop + 0.5) {
                                    // Land on top of object
                                    posRef.current.y = colliderTop;
                                    velRef.current.y = 0;
                                    isGroundedRef.current = true;
                                }
                                // Don't block horizontal movement when on top
                            } else if (playerFeetY < colliderTop && playerY + 2 > colliderBottom) {
                                // Player is at collider height level - block horizontal movement
                                const overlapLeft = finalX - minX;
                                const overlapRight = maxX - finalX;
                                const overlapBack = finalZ - minZ;
                                const overlapFront = maxZ - finalZ;
                                
                                // Find smallest overlap and push out that direction
                                const minOverlap = Math.min(overlapLeft, overlapRight, overlapBack, overlapFront);
                                
                                if (minOverlap === overlapLeft) finalX = minX;
                                else if (minOverlap === overlapRight) finalX = maxX;
                                else if (minOverlap === overlapBack) finalZ = minZ;
                                else finalZ = maxZ;
                                
                                collided = true;
                            }
                        }
                    }
                }
                
                // ==================== BEACH BALL PHYSICS ====================
                if (roomData.beachBall) {
                    const ball = roomData.beachBall;
                    const ballX = ball.mesh.position.x;
                    const ballZ = ball.mesh.position.z;
                    
                    // Check player-ball collision
                    const dx = ballX - finalX; // Direction from player TO ball
                    const dz = ballZ - finalZ;
                    const dist = Math.sqrt(dx * dx + dz * dz);
                    const minDist = playerRadius + ball.radius;
                    
                    if (dist < minDist && dist > 0.01) {
                        // Normalize direction
                        const nx = dx / dist;
                        const nz = dz / dist;
                        
                        // Calculate kick strength based on player velocity toward ball
                        const playerVelX = velRef.current.x;
                        const playerVelZ = velRef.current.z;
                        const approachSpeed = -(playerVelX * nx + playerVelZ * nz); // Dot product
                        
                        // Only kick if player is moving toward ball
                        if (approachSpeed > 0.01) {
                            // Transfer momentum: ball gets pushed in direction from player
                            const kickPower = approachSpeed * 3 + 1.5; // Base kick + momentum
                            ball.velocity.x += nx * kickPower;
                            ball.velocity.z += nz * kickPower;
                        } else {
                            // Gentle push if just touching
                            ball.velocity.x += nx * 0.8;
                            ball.velocity.z += nz * 0.8;
                        }
                        
                        // Separate ball from player (prevent overlap)
                        const overlap = minDist - dist;
                        ball.mesh.position.x += nx * overlap * 1.1;
                        ball.mesh.position.z += nz * overlap * 1.1;
                        
                        // SYNC TO SERVER: Send ball kick to all clients
                        if (mpSendBallKick) {
                            mpSendBallKick(
                                ball.mesh.position.x,
                                ball.mesh.position.z,
                                ball.velocity.x,
                                ball.velocity.z
                            );
                        }
                    }
                    
                    // Update ball position based on velocity (smooth movement)
                    ball.mesh.position.x += ball.velocity.x * delta;
                    ball.mesh.position.z += ball.velocity.z * delta;
                    
                    // Ball spin based on velocity (rolling effect)
                    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.z ** 2);
                    if (speed > 0.1) {
                        ball.mesh.rotation.x += ball.velocity.z * delta * 3;
                        ball.mesh.rotation.z -= ball.velocity.x * delta * 3;
                    }
                    
                    // Ball-wall collision (circular bounds)
                    const ballDistFromCenter = Math.sqrt(
                        ball.mesh.position.x ** 2 + ball.mesh.position.z ** 2
                    );
                    const ballMaxRadius = b.radius - ball.radius - 0.3;
                    
                    if (ballDistFromCenter > ballMaxRadius) {
                        // Calculate wall normal (points inward)
                        const wallAngle = Math.atan2(ball.mesh.position.z, ball.mesh.position.x);
                        const normalX = -Math.cos(wallAngle);
                        const normalZ = -Math.sin(wallAngle);
                        
                        // Push ball back inside
                        ball.mesh.position.x = Math.cos(wallAngle) * ballMaxRadius;
                        ball.mesh.position.z = Math.sin(wallAngle) * ballMaxRadius;
                        
                        // Reflect velocity off wall
                        const dot = ball.velocity.x * normalX + ball.velocity.z * normalZ;
                        if (dot < 0) { // Only bounce if moving toward wall
                            ball.velocity.x -= 2 * dot * normalX;
                            ball.velocity.z -= 2 * dot * normalZ;
                            // Energy loss on bounce
                            ball.velocity.x *= ball.bounciness;
                            ball.velocity.z *= ball.bounciness;
                        }
                    }
                    
                    // Ball-furniture collision
                    if (roomData.colliders) {
                        for (const col of roomData.colliders) {
                            const bx = ball.mesh.position.x;
                            const bz = ball.mesh.position.z;
                            const br = ball.radius;
                            
                            // Find closest point on furniture box to ball center
                            const closestX = Math.max(col.x - col.hw, Math.min(bx, col.x + col.hw));
                            const closestZ = Math.max(col.z - col.hd, Math.min(bz, col.z + col.hd));
                            
                            // Distance from ball center to closest point
                            const distX = bx - closestX;
                            const distZ = bz - closestZ;
                            const distSq = distX * distX + distZ * distZ;
                            
                            if (distSq < br * br && distSq > 0.001) {
                                // Ball is colliding with furniture
                                const dist = Math.sqrt(distSq);
                                const nx = distX / dist; // Normal pointing away from furniture
                                const nz = distZ / dist;
                                
                                // Push ball out of furniture
                                const overlap = br - dist;
                                ball.mesh.position.x += nx * overlap * 1.1;
                                ball.mesh.position.z += nz * overlap * 1.1;
                                
                                // Reflect velocity
                                const vDot = ball.velocity.x * nx + ball.velocity.z * nz;
                                if (vDot < 0) { // Only bounce if moving toward furniture
                                    ball.velocity.x -= 2 * vDot * nx;
                                    ball.velocity.z -= 2 * vDot * nz;
                                    ball.velocity.x *= ball.bounciness;
                                    ball.velocity.z *= ball.bounciness;
                                    
                                    // Sync bounce to server
                                    if (mpSendBallKick) {
                                        mpSendBallKick(
                                            ball.mesh.position.x,
                                            ball.mesh.position.z,
                                            ball.velocity.x,
                                            ball.velocity.z
                                        );
                                    }
                                }
                            }
                        }
                    }
                    
                    // Apply ground friction (gradual slowdown)
                    const frictionPerFrame = Math.pow(ball.friction, delta * 60);
                    ball.velocity.x *= frictionPerFrame;
                    ball.velocity.z *= frictionPerFrame;
                    
                    // Clamp very small velocities to zero (stop rolling)
                    if (Math.abs(ball.velocity.x) < 0.05 && Math.abs(ball.velocity.z) < 0.05) {
                        ball.velocity.x = 0;
                        ball.velocity.z = 0;
                    }
                    
                    // Keep ball at correct height (bouncy bob effect when moving)
                    const bobAmount = speed > 0.5 ? Math.sin(time * 15) * 0.05 : 0;
                    ball.mesh.position.y = 0.5 + bobAmount;
                }
            } else if (roomRef.current === 'nightclub' && nightclubRef.current) {
                // Nightclub collision - handled by Nightclub.js
                const result = nightclubRef.current.checkPlayerMovement(
                    posRef.current.x,
                    posRef.current.z,
                    nextX,
                    nextZ,
                    0.6, // playerRadius
                    posRef.current.y // playerY for height-based collision
                );
                finalX = result.x;
                finalZ = result.z;
                collided = result.collided;
            } else if (townCenterRef.current) {
                // Town uses TownCenter collision system (props + buildings + water)
                // Pass Y position for height-based collision (so player can jump on objects)
                const result = townCenterRef.current.checkPlayerMovement(
                    posRef.current.x, 
                    posRef.current.z, 
                    nextX, 
                    nextZ, 
                    0.8, // Player radius
                    posRef.current.y // Y position for height check
                );
                finalX = result.x;
                finalZ = result.z;
                collided = result.collided;
                
                // Landing on objects is now handled in the unified ground collision section below
                
                // OPTIMIZED: Only check triggers every 3rd frame (still responsive, but 3x faster)
                if (frameCount % 3 === 0) {
                // Also check triggers (benches, snowmen, etc.)
                // Pass Y position so triggers can filter by height (e.g., don't show "sit" prompt when standing ON furniture)
                townCenterRef.current.checkTriggers(finalX, finalZ, posRef.current.y);
                }
            }
            
            // Pizza room furniture interactions
            if (roomRef.current === 'pizza' && roomDataRef.current?.furniture) {
                const px = posRef.current.x;
                const pz = posRef.current.z;
                const py = posRef.current.y;
                
                // Only check when on ground level (not standing on furniture)
                if (py < 1.0) {
                    let foundSeat = null;
                    let closestDist = 1.5; // Interaction radius
                    
                    for (const seat of roomDataRef.current.furniture) {
                        const dx = px - seat.position.x;
                        const dz = pz - seat.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        
                        if (dist < closestDist) {
                            closestDist = dist;
                            foundSeat = seat;
                        }
                    }
                    
                    if (foundSeat) {
                        const seatName = foundSeat.type === 'stool' ? 'bar stool' : 'chair';
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'sit',
                                emote: 'Sit',
                                data: {
                                    worldX: foundSeat.position.x,
                                    worldZ: foundSeat.position.z,
                                    worldRotation: foundSeat.faceAngle || 0,
                                    seatHeight: foundSeat.seatHeight,
                                    snapPoints: [{ x: 0, z: 0, rotation: 0 }]
                                }
                            }
                        }));
                    } else {
                        // Clear interaction when not near any seat
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'exit' }
                        }));
                    }
                } else {
                    // Clear interaction when on furniture
                    window.dispatchEvent(new CustomEvent('townInteraction', {
                        detail: { action: 'exit' }
                    }));
                }
            }
            
            if (roomRef.current !== 'town' && roomRef.current !== 'pizza' && roomRef.current !== 'nightclub') {
                // Fallback: Non-town rooms use different collision
                // Town uses wall boundaries now, not water
                // Nightclub has its own wall-clamping collision above
                const WALL_MARGIN = 10;
                const MAP_SIZE = CITY_SIZE * BUILDING_SCALE;
                
                if (nextX < WALL_MARGIN || nextX > MAP_SIZE - WALL_MARGIN ||
                    nextZ < WALL_MARGIN || nextZ > MAP_SIZE - WALL_MARGIN) {
                    collided = true; // Can't walk past walls
                }
                
                // Check collision with custom buildings (dojo, market, pizza)
                if (!collided) {
                    const centerX = CENTER_X;
                    const centerZ = CENTER_Z;
                    
                    for (const building of BUILDINGS) {
                        const bx = centerX + building.position.x;
                        const bz = centerZ + building.position.z;
                        const hw = building.size.w / 2 + 0.5; // Half width + margin
                        const hd = building.size.d / 2 + 0.5; // Half depth + margin
                        
                        // Check if player is inside building bounds (but allow door area)
                        if (nextX > bx - hw && nextX < bx + hw && 
                            nextZ > bz - hd && nextZ < bz + hd) {
                            // Allow through the door area (front center)
                            const doorWidth = 3;
                            const atDoor = Math.abs(nextX - bx) < doorWidth && nextZ > bz + hd - 2;
                            if (!atDoor) {
                                collided = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            // Update position (use clamped finalX/finalZ for all rooms)
            if (roomRef.current === 'dojo' || roomRef.current.startsWith('igloo')) {
                // Dojo/Igloo: always use clamped position
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
                
                // Check igloo furniture proximity for interaction
                if (roomRef.current.startsWith('igloo') && roomData && roomData.furniture) {
                    let nearInteraction = null;
                    
                    // Check furniture (couches, bar stools)
                    for (const furn of roomData.furniture) {
                        const dx = finalX - furn.position.x;
                        const dz = finalZ - furn.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < furn.interactionRadius) {
                            nearInteraction = { type: 'furniture', data: furn };
                            break;
                        }
                    }
                    
                    // Check DJ spots (igloo3 SKNY has a DJ booth)
                    if (!nearInteraction && roomData.djSpots) {
                        for (const dj of roomData.djSpots) {
                            const dx = finalX - dj.position.x;
                            const dz = finalZ - dj.position.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < dj.interactionRadius) {
                                nearInteraction = { type: 'dj', data: dj };
                                break;
                            }
                        }
                    }
                    
                    // Dispatch interaction event (reuses existing townInteraction system)
                    if (nearInteraction && !seatedRef.current) {
                        if (nearInteraction.type === 'dj') {
                            const dj = nearInteraction.data;
                            window.dispatchEvent(new CustomEvent('townInteraction', {
                                detail: {
                                    action: 'dj',
                                    message: '🎧 Press E to DJ',
                                    emote: 'DJ',
                                    data: {
                                        worldX: dj.position.x,
                                        worldZ: dj.position.z,
                                        worldRotation: dj.rotation
                                    }
                                }
                            }));
                        } else {
                            const furn = nearInteraction.data;
                            window.dispatchEvent(new CustomEvent('townInteraction', {
                                detail: {
                                    action: 'sit',
                                    message: `Press E to sit on ${furn.type}`,
                                    emote: 'Sit',
                                    data: {
                                        worldX: furn.position.x,
                                        worldZ: furn.position.z,
                                        worldRotation: furn.rotation,
                                        snapPoints: furn.snapPoints,
                                        seatHeight: furn.seatHeight,
                                        bidirectionalSit: furn.bidirectionalSit || false
                                    }
                                }
                            }));
                        }
                    } else if (!nearInteraction && !seatedRef.current) {
                        // Exited interaction zone
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'exit' }
                        }));
                    }
                }
            } else if (roomRef.current === 'nightclub') {
                // Nightclub: use wall-clamped position (free movement inside, walls only block)
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
                
                // Check nightclub furniture proximity for interaction (couch)
                let nearInteraction = null;
                if (roomData && roomData.furniture) {
                    for (const furn of roomData.furniture) {
                        const dx = finalX - furn.position.x;
                        const dz = finalZ - furn.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < furn.interactionRadius) {
                            nearInteraction = { type: 'furniture', data: furn };
                            break;
                        }
                    }
                }
                
                // Check DJ spots (only when on the platform - Y ~= 0.75)
                if (!nearInteraction && roomData && roomData.djSpots) {
                    const playerY = posRef.current.y;
                    const onPlatform = playerY >= 0.5 && playerY <= 1.2; // On DJ platform
                    if (onPlatform) {
                        for (const dj of roomData.djSpots) {
                            const dx = finalX - dj.position.x;
                            const dz = finalZ - dj.position.z;
                            const dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < dj.interactionRadius) {
                                nearInteraction = { type: 'dj', data: dj };
                                break;
                            }
                        }
                    }
                }
                
                // Dispatch interaction event
                if (nearInteraction && !seatedRef.current) {
                    if (nearInteraction.type === 'dj') {
                        const dj = nearInteraction.data;
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'dj',
                                message: '🎧 Press E to DJ',
                                emote: 'DJ',
                                data: {
                                    worldX: dj.position.x,
                                    worldZ: dj.position.z,
                                    worldRotation: dj.rotation,
                                    seatHeight: dj.standHeight
                                }
                            }
                        }));
                    } else {
                        const furn = nearInteraction.data;
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'sit',
                                message: `Press E to sit on ${furn.type}`,
                                emote: 'Sit',
                                data: {
                                    worldX: furn.position.x,
                                    worldZ: furn.position.z,
                                    worldRotation: furn.rotation,
                                    snapPoints: furn.snapPoints,
                                    seatHeight: furn.seatHeight
                                }
                            }
                        }));
                    }
                } else if (!nearInteraction && !seatedRef.current) {
                    // Exited interaction zone
                    window.dispatchEvent(new CustomEvent('townInteraction', {
                        detail: { action: 'exit' }
                    }));
                }
            } else if (townCenterRef.current && roomRef.current === 'town') {
                // Town: use TownCenter's safe position
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
                
                // Check town furniture proximity for interaction (roof couch)
                if (roomData && roomData.furniture) {
                    let nearFurniture = null;
                    for (const furn of roomData.furniture) {
                        const dx = finalX - furn.position.x;
                        const dz = finalZ - furn.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        // Only interact if player is at the right height (on the roof)
                        const playerY = posRef.current.y;
                        const furnY = furn.platformHeight || 0;
                        const yMatch = Math.abs(playerY - furnY) < 2; // Within 2 units height
                        if (dist < furn.interactionRadius && yMatch) {
                            nearFurniture = furn;
                            break;
                        }
                    }
                    
                    // Dispatch interaction event
                    if (nearFurniture && !seatedRef.current) {
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'sit',
                                message: `Press E to sit on ${nearFurniture.type}`,
                                emote: 'Sit',
                                data: {
                                    worldX: nearFurniture.position.x,
                                    worldZ: nearFurniture.position.z,
                                    worldRotation: nearFurniture.rotation,
                                    snapPoints: nearFurniture.snapPoints,
                                    seatHeight: nearFurniture.seatHeight,
                                    platformHeight: nearFurniture.platformHeight,
                                    bidirectionalSit: nearFurniture.bidirectionalSit || false
                                }
                            }
                        }));
                    } else if (!nearFurniture && !seatedRef.current) {
                        // Only clear if we were showing a furniture prompt
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'exit' }
                        }));
                    }
                }
            } else if (!collided) {
                // Fallback: only move if no collision
                posRef.current.x = nextX;
                posRef.current.z = nextZ;
            }
            
            // Apply Y velocity (jumping/falling)
            posRef.current.y += velRef.current.y * delta;
            
            // Track if player found ground this frame
            let foundGround = false;
            let groundHeight = GROUND_Y;
            
            // Check for landing on furniture (in igloo rooms)
            if (roomData?.colliders) {
                for (const col of roomData.colliders) {
                    const colliderHeight = col.height || col.hh * 2 || 2;
                    const colliderTop = col.y !== undefined ? col.y + colliderHeight : colliderHeight;
                    
                    const minX = col.x - col.hw - 0.5;
                    const maxX = col.x + col.hw + 0.5;
                    const minZ = col.z - col.hd - 0.5;
                    const maxZ = col.z + col.hd + 0.5;
                    
                    // Check if player is within XZ bounds
                    if (posRef.current.x > minX && posRef.current.x < maxX && 
                        posRef.current.z > minZ && posRef.current.z < maxZ) {
                        // Player is above this surface and falling
                        if (posRef.current.y <= colliderTop + 0.1 && posRef.current.y >= colliderTop - 0.5) {
                            if (colliderTop >= groundHeight) {
                                groundHeight = colliderTop;
                                foundGround = true;
                            }
                        }
                    }
                }
            }
            
            // Check for landing on town objects
            if (room === 'town' && townCenterRef.current && velRef.current.y <= 0) {
                const landing = townCenterRef.current.checkLanding(posRef.current.x, posRef.current.z, posRef.current.y, 0.8);
                if (landing.canLand && posRef.current.y <= landing.landingY + 0.3) {
                    if (landing.landingY >= groundHeight) {
                        groundHeight = landing.landingY;
                        foundGround = true;
                    }
                }
            }
            
            // Check for landing on nightclub surfaces (uses Nightclub.checkLanding)
            if (room === 'nightclub' && nightclubRef.current) {
                const isDescending = velRef.current.y <= 0;
                const landing = nightclubRef.current.checkLanding(
                    posRef.current.x, posRef.current.z, posRef.current.y, isDescending
                );
                if (landing.canLand && landing.landingY > groundHeight) {
                    groundHeight = landing.landingY;
                    foundGround = true;
                }
            }
            
            // Check for landing on pizza parlor furniture (uses room's landingSurfaces)
            if (room === 'pizza' && roomDataRef.current?.landingSurfaces && velRef.current.y <= 0) {
                const px = posRef.current.x;
                const pz = posRef.current.z;
                const py = posRef.current.y;
                
                for (const surface of roomDataRef.current.landingSurfaces) {
                    let isOver = false;
                    
                    if (surface.type === 'circle') {
                        const dx = px - surface.x;
                        const dz = pz - surface.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        isOver = dist <= surface.radius;
                    } else if (surface.type === 'box') {
                        isOver = px >= surface.minX && px <= surface.maxX &&
                                 pz >= surface.minZ && pz <= surface.maxZ;
                    }
                    
                    if (isOver && py >= surface.height - 0.5 && py <= surface.height + 1) {
                        if (surface.height >= groundHeight) {
                            groundHeight = surface.height;
                            foundGround = true;
                        }
                    }
                }
            }
            
            // Ground plane collision (y = 0)
            // Only use ground level if no higher surface was already found
            if (posRef.current.y <= GROUND_Y) {
                if (groundHeight <= GROUND_Y) {
                    groundHeight = GROUND_Y;
                }
                foundGround = true;
            }
            
            // Apply ground collision
            if (foundGround && velRef.current.y <= 0) {
                posRef.current.y = groundHeight;
                velRef.current.y = 0;
                isGroundedRef.current = true;
            } else if (posRef.current.y > GROUND_Y + 0.1) {
                // Player is in the air - not grounded
                isGroundedRef.current = false;
            }
            
            if (playerRef.current) {
                playerRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
                playerRef.current.rotation.y = rotRef.current;
            }
            
            // Update debug position display (throttled)
            if (showDebugPositionRef.current && frameCount % 10 === 0) {
                const townCenterX = CENTER_X;
                const townCenterZ = CENTER_Z;
                setDebugPosition({
                    x: posRef.current.x.toFixed(1),
                    y: posRef.current.y.toFixed(1),
                    z: posRef.current.z.toFixed(1),
                    offsetX: (posRef.current.x - townCenterX).toFixed(1),
                    offsetZ: (posRef.current.z - townCenterZ).toFixed(1),
                    rotation: ((rotRef.current * 180 / Math.PI) % 360).toFixed(0)
                });
            }

            // Player puffle follow/animate/tick - snake-tail behavior
            if (playerPuffleRef.current && playerPuffleRef.current.mesh) {
                // Tick for stats decay
                if (typeof playerPuffleRef.current.tick === 'function') {
                    playerPuffleRef.current.tick();
                }
                // Follow owner (player) - snake-tail behavior
                if (typeof playerPuffleRef.current.followOwner === 'function') {
                    playerPuffleRef.current.followOwner(posRef.current, delta);
                }
                // Animate bounce and rotation
                if (typeof playerPuffleRef.current.animate === 'function') {
                    playerPuffleRef.current.animate(time);
                }
            }
            
            if (playerRef.current) {
                // Pass local player's seatedRef state for furniture sitting, character type, and mounted state
                // Only consider mounted if mount is enabled in settings
                const isMounted = !!(playerRef.current.userData?.mount && playerRef.current.userData?.mountData && mountEnabledRef.current);
                // Simple airborne check: feet not touching ground (Y above threshold)
                const isAirborne = velRef.current.y !== 0 && posRef.current.y > 0.05;
                animateMesh(
                    playerRef.current, 
                    moving, 
                    emoteRef.current.type, 
                    emoteRef.current.startTime, 
                    !!seatedRef.current, 
                    penguinData?.characterType || 'penguin', 
                    isMounted, 
                    isAirborne,
                    time,
                    () => {
                        // Emote ended naturally - clear it
                        emoteRef.current.type = null;
                        mpSendEmote(null);
                    }
                );
                
                // OPTIMIZATION: Use cached animated parts instead of traverse() every frame
                // Cache is built once when mesh is created, avoiding expensive tree traversal
                const animCache = playerRef.current.userData._animatedPartsCache;
                if (animCache) {
                    animateCosmeticsFromCache(animCache, time, delta);
                }
                
                // --- WIZARD HAT WORLD-SPACE TRAIL (Per-Player Pools) ---
                if (penguinData?.hat === 'wizardHat' && wizardTrailSystemRef.current) {
                    wizardTrailSystemRef.current.getOrCreatePool('localPlayer');
                    wizardTrailSystemRef.current.update('localPlayer', playerRef.current.position, moving, time, delta);
                }
                
                // --- MOUNT ANIMATION ---
                // Animate mount oars when player is moving (only if mount is enabled)
                if (playerRef.current.userData?.mount && playerRef.current.userData?.mountData?.animated && mountEnabledRef.current) {
                    const mountGroup = playerRef.current.getObjectByName('mount');
                    if (mountGroup) {
                        const leftOarPivot = mountGroup.getObjectByName('left_oar_pivot');
                        const rightOarPivot = mountGroup.getObjectByName('right_oar_pivot');
                        
                        if (leftOarPivot && rightOarPivot) {
                            // Check for turning input
                            const turningLeft = keyLeft || mobileLeft || (joystickInputRef.current.x < -0.3);
                            const turningRight = keyRight || mobileRight || (joystickInputRef.current.x > 0.3);
                            
                            // Check forward/backward direction
                            const movingForward = keyForward || mobileForward || (joystickInputRef.current.y < -0.1);
                            const movingBackward = keyBack || mobileBack || (joystickInputRef.current.y > 0.1);
                            
                            // Direction multiplier: -1 for forward (pull oars back), +1 for backward (push oars forward)
                            const directionMult = movingForward ? -1 : 1;
                            
                            if (moving) {
                                const rowSpeed = 8;
                                const baseRowAngle = Math.sin(time * rowSpeed) * 0.5 * directionMult;
                                
                                // Differential rowing for turning
                                let leftSpeed = 1.0;
                                let rightSpeed = 1.0;
                                
                                if (turningLeft) {
                                    // Turn left: LEFT oar rows faster
                                    leftSpeed = 1.5;
                                    rightSpeed = 0.3;
                                } else if (turningRight) {
                                    // Turn right: RIGHT oar rows faster
                                    leftSpeed = 0.3;
                                    rightSpeed = 1.5;
                                }
                                
                                // Apply rowing animation - Y rotation for forward/backward motion
                                leftOarPivot.rotation.y = baseRowAngle * leftSpeed;
                                rightOarPivot.rotation.y = -baseRowAngle * rightSpeed;
                                
                                // Z rotation for oar dip into water
                                leftOarPivot.rotation.z = Math.sin(time * rowSpeed + Math.PI/2) * 0.15 * leftSpeed * directionMult;
                                rightOarPivot.rotation.z = -Math.sin(time * rowSpeed + Math.PI/2) * 0.15 * rightSpeed * directionMult;
                            } else if (turningLeft || turningRight) {
                                // Stationary turning - only one oar rows
                                const rowSpeed = 6;
                                const turnAngle = Math.sin(time * rowSpeed) * 0.4;
                                
                                if (turningLeft) {
                                    // Turn left: left oar rows
                                    leftOarPivot.rotation.y = turnAngle;
                                    leftOarPivot.rotation.z = Math.sin(time * rowSpeed + Math.PI/2) * 0.1;
                                    rightOarPivot.rotation.y *= 0.9;
                                    rightOarPivot.rotation.z *= 0.9;
                                } else {
                                    // Turn right: right oar rows
                                    rightOarPivot.rotation.y = -turnAngle;
                                    rightOarPivot.rotation.z = -Math.sin(time * rowSpeed + Math.PI/2) * 0.1;
                                    leftOarPivot.rotation.y *= 0.9;
                                    leftOarPivot.rotation.z *= 0.9;
                                }
                            } else {
                                // Rest position when not moving
                                leftOarPivot.rotation.y *= 0.9;
                                rightOarPivot.rotation.y *= 0.9;
                                leftOarPivot.rotation.z *= 0.9;
                                rightOarPivot.rotation.z *= 0.9;
                            }
                        }
                    }
                }
            }
            
            // --- AI UPDATE LOOP (OPTIMIZED: throttle to every 2nd frame) ---
            const now = Date.now();
            // Using cached values: centerX, centerZ, dojoBxCached, dojoBzCached, dojoHdCached, puffleMap, aiMap
            
            // Update all AI agents (movement, conversations, room transitions, animations)
            updateAIAgents({
                aiAgents: aiAgentsRef.current,
                aiPuffles: aiPufflesRef.current,
                currentRoom: roomRef.current,
                roomData: roomDataRef.current,
                frameCount,
                time,
                delta,
                centerCoords: { centerX, centerZ },
                dojoCoords: { dojoBx: dojoBxCached, dojoBz: dojoBzCached, dojoHd: dojoHdCached },
                constants: { CITY_SIZE, BUILDING_SCALE, BUILDINGS },
                THREE,
                createChatSprite: (THREE, text) => createChatSprite(THREE, text),
                animateMesh,
                cacheAnimatedParts,
                animateCosmeticsFromCache,
                wizardTrailRef: wizardTrailSystemRef
            });

            // Animate campfire (flames, embers, light flicker) and Christmas tree
            if (townCenterRef.current && roomRef.current === 'town') {
                const worldTime = serverWorldTimeRef?.current ?? 0.35;
                const nightFactor = calculateNightFactor(worldTime);
                townCenterRef.current.update(time, delta, nightFactor);
            }
            
            // Animate nightclub interior (dance floor, stage lights, speakers, disco ball)
            if (nightclubRef.current && roomRef.current === 'nightclub') {
                nightclubRef.current.update(time, delta, 0.7); // Always club lighting
            }
            
            // Animate SKNY GANG igloo interior (disco ball, lasers, LED floor, etc.)
            if (sknyIglooInteriorRef.current?.update && roomRef.current === 'igloo3') {
                sknyIglooInteriorRef.current.update(time);
            }
            
            // Animate building door glows (pulse for interactive doors, town only)
            if (roomRef.current === 'town') {
                portalsRef.current.forEach(building => {
                    if (building.mesh && building.gameId) {
                        const glow = building.mesh.getObjectByName(`door_glow_${building.id}`);
                        if (glow && glow.material) {
                            glow.material.opacity = 0.2 + Math.sin(time * 2) * 0.15;
                        }
                    }
                    
                    // Hide dojo label when player is on the roof (y > 9)
                    if (building.id === 'dojo' && building.mesh) {
                        const dojoLabel = building.mesh.getObjectByName('label_dojo');
                        if (dojoLabel) {
                            dojoLabel.visible = posRef.current.y < 9;
                        }
                    }
                });
            }
            
            // Room-specific updates (self-contained in room modules)
            if (roomDataRef.current?.update) {
                roomDataRef.current.update(time, delta);
            }
            
            // Match banners are updated in a separate useEffect that responds to prop changes
            // (not in the game loop, since activeMatches/spectatingMatch are props that change)

            // OPTIMIZED: Reuse vectors instead of creating new ones every frame
            const offset = tempOffsetRef.current.copy(camera.position).sub(controls.target);
            // Follow player's actual Y position (add slight offset for eye level)
            const playerY = posRef.current.y + 1.2;
            const targetPos = tempVec3Ref.current.set(posRef.current.x, playerY, posRef.current.z);
            camera.position.copy(targetPos).add(offset);
            controls.target.copy(targetPos);
            controls.update();
            
            // ==================== DAY/NIGHT CYCLE (Town only, Server-synchronized) ====================
            // OPTIMIZED: Only update lighting every 3rd frame (still smooth at 60fps = 20 updates/sec)
            if (room === 'town' && sunLightRef.current && ambientLightRef.current && frameCount % 3 === 0) {
                const serverTime = serverWorldTimeRef?.current ?? 0.35;
                const t = daySpeedRef.current === 0 ? dayTimeRef.current : serverTime;
                
                updateDayNightCycle({
                    t,
                    sunLight: sunLightRef.current,
                    ambientLight: ambientLightRef.current,
                    scene,
                    propLights: propLightsRef.current,
                    lightsOnRef
                });
                
                // Update state for UI (throttled)
                if (frameCount % 30 === 0) {
                    setDayTime(daySpeedRef.current === 0 ? dayTimeRef.current : serverTime);
                }
            }
            
            // ==================== SNOWFALL UPDATE ====================
            if (room === 'town' && snowfallSystemRef.current && gameSettingsRef.current.snowEnabled !== false) {
                const serverTime = serverWorldTimeRef?.current ?? 0.35;
                snowfallSystemRef.current.update(time, delta, posRef.current, serverTime);
                snowfallSystemRef.current.setVisible(true);
            } else if (snowfallSystemRef.current) {
                snowfallSystemRef.current.setVisible(false);
            }
            
            renderer.render(scene, camera);
        };
        update();
        
        return () => {
            cancelAnimationFrame(reqRef.current);
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
            if(rendererRef.current && mountRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            // Cleanup TownCenter
            if (townCenterRef.current) {
                townCenterRef.current.dispose();
                townCenterRef.current = null;
            }
            // Cleanup Nightclub
            if (nightclubRef.current) {
                nightclubRef.current.dispose();
                nightclubRef.current = null;
            }
            // Cleanup match banners
            for (const [, bannerData] of matchBannersRef.current) {
                bannerData.sprite.material.map?.dispose();
                bannerData.sprite.material.dispose();
            }
            matchBannersRef.current.clear();
            // Cleanup Snowfall system
            if (snowfallSystemRef.current) {
                snowfallSystemRef.current.dispose();
                snowfallSystemRef.current = null;
            }
            // Cleanup Wizard trail system
            if (wizardTrailSystemRef.current) {
                wizardTrailSystemRef.current.dispose();
                wizardTrailSystemRef.current = null;
            }
        };
    }, [penguinData, room]); // Rebuild scene when room changes
    
    // ==================== 3D MATCH BANNERS (SPECTATOR VIEW) ====================
    // Create floating banners above players in active matches
    // This runs as a useEffect responding to prop changes, not in the game loop
    useEffect(() => {
        if (!sceneRef.current || !window.THREE) return;
        
        const THREE = window.THREE;
        const scene = sceneRef.current;
        const banners = matchBannersRef.current;
        const playersData = playersDataRef.current;
        
        // Update banners using the extracted system
        updateMatchBanners({
            THREE,
            scene,
            bannersRef: banners,
            playersData,
            activeMatches,
            spectatingMatch
        });
        
    }, [activeMatches, spectatingMatch]); // Re-run when matches or spectating data changes
    
    const triggerEmote = (type) => {
        emoteRef.current = { type, startTime: Date.now() };
        // Send emote to other players (emote wheel = ground emotes, not furniture)
        mpSendEmote(type, false);
        
        // Special handling for "67" emote - show chat bubble without logging
        if (type === '67') {
            mpSendEmoteBubble('67!'); // Send to other players
            setActiveBubble('67!'); // Show locally above own head
        }
    };
    
    // ==================== EMOTE WHEEL - STICKY SELECTION ====================
    // Selection stays on last hovered sector until a DIFFERENT sector is entered
    useEffect(() => {
        if (!emoteWheelOpen) return;
        
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const DEAD_ZONE = 50; // pixels from center
        const NUM_SECTORS = EMOTE_WHEEL_ITEMS.length;
        const SECTOR_SIZE = 360 / NUM_SECTORS;
        
        const handleMouseMove = (e) => {
            const dx = e.clientX - centerX;
            const dy = e.clientY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // DEAD ZONE: Don't change selection, keep the sticky value
            if (distance < DEAD_ZONE) {
                return; // Keep current selection
            }
            
            // Calculate angle (0° at top, clockwise)
            let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
            if (angle < 0) angle += 360;
            
            // Determine sector index
            const newIndex = Math.floor(angle / SECTOR_SIZE) % NUM_SECTORS;
            
            // STICKY: Only update if entering a DIFFERENT sector
            if (newIndex !== emoteSelectionRef.current) {
                emoteSelectionRef.current = newIndex;
                setEmoteWheelSelection(newIndex);
            }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        return () => document.removeEventListener('mousemove', handleMouseMove);
    }, [emoteWheelOpen]);
    
    // ==================== VICTORY DANCE ====================
    // Auto-trigger dance animation when player wins a match
    useEffect(() => {
        if (shouldDance) {
            console.log('🎉 Victory dance triggered!');
            triggerEmote('Dance');
            // Clear the dance flag after triggering
            if (clearDance) {
                setTimeout(() => clearDance(), 100);
            }
        }
    }, [shouldDance, clearDance]);
    

    // ==================== PLAYER CLICK DETECTION ====================
    // Handle clicking/tapping on other players to open profile menu (works on both desktop and mobile)
    useEffect(() => {
        if (!rendererRef.current || !cameraRef.current || !raycasterRef.current || !onPlayerClick) return;
        
        const renderer = rendererRef.current;
        const camera = cameraRef.current;
        const raycaster = raycasterRef.current;
        
        // Unified handler for both mouse clicks and touch taps
        const handleInteraction = (clientX, clientY, eventTarget, isTouch = false) => {
            // Don't process if any UI overlay is open (check by z-index elements)
            const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
            
            // Check if click/tap is on a UI element (buttons, menus, joystick, etc.)
            const isUIElement = elementsAtPoint.some(el => {
                // Skip canvas and its container
                if (el === renderer.domElement || el === renderer.domElement.parentElement) {
                    return false;
                }
                // Check for high z-index (UI overlays)
                const zIndex = window.getComputedStyle(el).zIndex;
                if (zIndex && parseInt(zIndex) >= 40) {
                    return true;
                }
                // Check for common UI element classes/tags
                if (el.tagName === 'BUTTON' || el.tagName === 'INPUT' || 
                    el.closest('button') || el.closest('[role="button"]') ||
                    el.closest('[data-joystick]') || el.hasAttribute?.('data-joystick') ||
                    el.closest('.joystick') || el.closest('[class*="joystick"]')) {
                    return true;
                }
                return false;
            });
            
            if (isUIElement) {
                return;
            }
            
            // For mouse clicks, require exact target match
            // For touch, be more lenient (touch events can bubble differently)
            if (!isTouch && eventTarget !== renderer.domElement) {
                return;
            }
            
            // Calculate position in normalized device coordinates (-1 to +1)
            const rect = renderer.domElement.getBoundingClientRect();
            mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            
            // Update raycaster
            raycaster.setFromCamera(mouseRef.current, camera);
            
            // Collect all other player meshes
            const playerMeshes = [];
            const meshToPlayerMap = new Map();
            
            for (const [id, data] of otherPlayerMeshesRef.current) {
                if (data.mesh) {
                    playerMeshes.push(data.mesh);
                    // Also add children for better hit detection
                    data.mesh.traverse(child => {
                        if (child.isMesh) {
                            meshToPlayerMap.set(child, id);
                        }
                    });
                    meshToPlayerMap.set(data.mesh, id);
                }
            }
            
            // Check for intersections
            const allMeshes = [];
            playerMeshes.forEach(m => m.traverse(child => { if (child.isMesh) allMeshes.push(child); }));
            
            const intersects = raycaster.intersectObjects(allMeshes, false);
            
            if (intersects.length > 0) {
                // Find which player was clicked/tapped
                let clickedPlayerId = null;
                
                for (const intersect of intersects) {
                    // Traverse up to find the root mesh
                    let obj = intersect.object;
                    while (obj && !meshToPlayerMap.has(obj)) {
                        obj = obj.parent;
                    }
                    
                    if (obj && meshToPlayerMap.has(obj)) {
                        clickedPlayerId = meshToPlayerMap.get(obj);
                        break;
                    }
                }
                
                if (clickedPlayerId) {
                    const playerData = playersDataRef.current.get(clickedPlayerId);
                    if (playerData) {
                        console.log('🖱️ Clicked/tapped on player:', playerData.name);
                        onPlayerClick({
                            id: clickedPlayerId,
                            name: playerData.name,
                            appearance: playerData.appearance,
                            position: playerData.position
                        });
                    }
                }
            }
        };
        
        // Mouse click handler
        const handleClick = (event) => {
            handleInteraction(event.clientX, event.clientY, event.target, false);
        };
        
        // Touch handler - detect taps on players
        let touchStartTime = 0;
        let touchStartPos = { x: 0, y: 0 };
        
        const handleTouchStart = (event) => {
            if (event.touches.length === 1) {
                touchStartTime = Date.now();
                touchStartPos = {
                    x: event.touches[0].clientX,
                    y: event.touches[0].clientY
                };
            }
        };
        
        const handleTouchEnd = (event) => {
            // Only process single-finger taps
            if (event.changedTouches.length !== 1) return;
            
            const touch = event.changedTouches[0];
            const touchDuration = Date.now() - touchStartTime;
            const touchMoved = Math.abs(touch.clientX - touchStartPos.x) > 20 ||
                              Math.abs(touch.clientY - touchStartPos.y) > 20;
            
            // Only treat as tap if touch was short (< 400ms) and didn't move much
            // Slightly more lenient for mobile (was 300ms/15px, now 400ms/20px)
            if (touchDuration < 400 && !touchMoved) {
                // Get the element under the touch point
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                handleInteraction(touch.clientX, touch.clientY, targetElement, true);
            }
        };
        
        renderer.domElement.addEventListener('click', handleClick);
        renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: true });
        renderer.domElement.addEventListener('touchend', handleTouchEnd, { passive: true });
        
        return () => {
            if (renderer.domElement) {
                renderer.domElement.removeEventListener('click', handleClick);
                renderer.domElement.removeEventListener('touchstart', handleTouchStart);
                renderer.domElement.removeEventListener('touchend', handleTouchEnd);
            }
        };
    }, [onPlayerClick, playerId]);
    
    useEffect(() => {
        if (!activeBubble || !playerRef.current) return;
        
        if (bubbleSpriteRef.current) {
            playerRef.current.remove(bubbleSpriteRef.current);
        }
        
        // Use taller bubble height for Marcus
        const bubbleHeight = penguinData?.characterType === 'marcus' ? BUBBLE_HEIGHT_MARCUS : BUBBLE_HEIGHT_PENGUIN;
        const sprite = createChatSprite(window.THREE, activeBubble, bubbleHeight);
        playerRef.current.add(sprite);
        bubbleSpriteRef.current = sprite;
        
        // Don't auto-clear if AFK - bubble stays until movement
        if (isAfkRef.current) {
            return; // No timeout for AFK messages
        }
        
        const timeout = setTimeout(() => {
            if (playerRef.current && bubbleSpriteRef.current) {
                playerRef.current.remove(bubbleSpriteRef.current);
                bubbleSpriteRef.current = null;
                setActiveBubble(null);
            }
        }, 5000);
        
        return () => clearTimeout(timeout);
    }, [activeBubble]);
    
    // Listen for our own chat messages to show local bubble
    const lastChatIdRef = useRef(null);
    useEffect(() => {
        if (!chatMessages || chatMessages.length === 0 || !playerId) return;
        
        const latestMsg = chatMessages[chatMessages.length - 1];
        
        // Only process if it's a new message from us
        if (latestMsg.id === lastChatIdRef.current) return;
        if (latestMsg.playerId !== playerId && latestMsg.name !== playerName) return;
        
        lastChatIdRef.current = latestMsg.id;
        
        // Don't show bubbles for whispers - they're private
        if (latestMsg.isWhisper) return;
        
        // Don't show bubbles for system messages
        if (latestMsg.isSystem) return;
        
        // Handle AFK messages
        if (latestMsg.text?.toLowerCase().startsWith('/afk') || latestMsg.text?.startsWith('💤')) {
            const afkText = latestMsg.text.startsWith('💤') ? latestMsg.text : `💤 ${latestMsg.text.slice(4).trim() || 'AFK'}`;
            isAfkRef.current = true;
            afkMessageRef.current = afkText;
            setActiveBubble(afkText);
        } else {
            // Regular message - clear AFK if was AFK
            if (isAfkRef.current) {
                isAfkRef.current = false;
                afkMessageRef.current = null;
            }
            setActiveBubble(latestMsg.text);
        }
        
        // Earn coins for chatting
        GameManager.getInstance().incrementStat('chatsSent');
        if (Math.random() > 0.7) {
            GameManager.getInstance().addCoins(5, 'chat');
        }
    }, [chatMessages, playerId, playerName]);

    // Puffle management - supports multiple ownership, 1 equipped at a time
    const handleAdoptPuffle = (newPuffle) => {
        // Add to owned puffles
        setOwnedPuffles(prev => [...prev, newPuffle]);
        
        // Auto-equip the newly adopted puffle
        handleEquipPuffle(newPuffle);
    };
    
    const handleEquipPuffle = (puffleToEquip) => {
        // First unequip current puffle if any
        if (playerPuffleRef.current && playerPuffleRef.current.mesh && sceneRef.current) {
            sceneRef.current.remove(playerPuffleRef.current.mesh);
            playerPuffleRef.current.mesh = null;
        }
        
        // Equip new puffle
        if (onPuffleChange) onPuffleChange(puffleToEquip);
        playerPuffleRef.current = puffleToEquip;
        
        // Spawn puffle mesh in world if scene is ready
        if (sceneRef.current && window.THREE && puffleToEquip) {
            puffleToEquip.position = { x: posRef.current.x + 1.5, y: 0, z: posRef.current.z + 1.5 };
            const mesh = puffleToEquip.createMesh(window.THREE);
            mesh.position.set(posRef.current.x + 1.5, 0.35, posRef.current.z + 1.5);
            sceneRef.current.add(mesh);
            puffleToEquip.mesh = mesh;
        }
    };
    
    const handleUnequipPuffle = () => {
        // Remove mesh from scene
        if (playerPuffleRef.current && playerPuffleRef.current.mesh && sceneRef.current) {
            sceneRef.current.remove(playerPuffleRef.current.mesh);
            playerPuffleRef.current.mesh = null;
        }
        
        // Clear equipped puffle
        if (onPuffleChange) onPuffleChange(null);
        playerPuffleRef.current = null;
    };

    const handleUpdatePuffle = (updatedPuffle) => {
        // Update the puffle instance
        if (onPuffleChange) onPuffleChange(updatedPuffle);
        playerPuffleRef.current = updatedPuffle;
        
        // Also update in owned puffles list
        setOwnedPuffles(prev => prev.map(p => p.id === updatedPuffle.id ? updatedPuffle : p));
    };
    
    // Check for nearby portals (room-specific)
    const checkPortals = () => {
        const playerPos = posRef.current;
        const portals = ROOM_PORTALS[room] || [];
        
        // Town portal positions are offsets - add center coordinates
        const centerX = CENTER_X;
        const centerZ = CENTER_Z;
        
        for (const portal of portals) {
            // Town portals use offset positions, dojo uses absolute
            let portalX = portal.position.x;
            let portalZ = portal.position.z;
            
            if (room === 'town') {
                portalX = centerX + portal.position.x;
                portalZ = centerZ + portal.position.z;
            }
            
            const dx = playerPos.x - portalX;
            const dz = playerPos.z - portalZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < portal.doorRadius) {
                if (nearbyPortal?.id !== portal.id) {
                    setNearbyPortal(portal);
                }
                return;
            }
        }
        
        if (nearbyPortal) {
            setNearbyPortal(null);
        }
    };
    
    // Check igloo proximity and show/hide occupancy bubbles
    const checkIglooProximity = () => {
        if (room !== 'town') return;
        
        const playerPos = posRef.current;
        const VISIBILITY_DISTANCE = 25; // Show bubble when within 25 units
        
        iglooOccupancySpritesRef.current.forEach((sprite, iglooId) => {
            if (!sprite.userData) return;
            
            const dx = playerPos.x - sprite.userData.iglooX;
            const dz = playerPos.z - sprite.userData.iglooZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // Show sprite if player is close enough
            const shouldShow = dist < VISIBILITY_DISTANCE;
            
            if (sprite.visible !== shouldShow) {
                sprite.visible = shouldShow;
            }
            
            // Make sprite face camera (billboard effect)
            if (shouldShow && cameraRef.current) {
                sprite.quaternion.copy(cameraRef.current.quaternion);
            }
        });
    };
    
    // Update igloo occupancy sprite with new count
    const updateIglooOccupancy = (iglooId, count) => {
        const sprite = iglooOccupancySpritesRef.current.get(iglooId);
        if (!sprite) return;
        
        // Recreate the sprite texture with new count
        const THREE = window.THREE;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const fontSize = 36;
        const padding = 16;
        const text = count > 0 ? `🐧 ${count}` : '🐧 empty';
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(text).width;
        
        const w = textWidth + padding * 2;
        const h = fontSize + padding * 2;
        
        canvas.width = w;
        canvas.height = h;
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        ctx.fillStyle = count > 0 ? 'rgba(30, 60, 100, 0.85)' : 'rgba(60, 60, 80, 0.75)';
        ctx.strokeStyle = count > 0 ? '#4a9eff' : '#666';
        ctx.lineWidth = 3;
        
        const r = 12;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r);
        ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = count > 0 ? '#ffffff' : '#aaaaaa';
        ctx.fillText(text, w / 2, h / 2);
        
        // Update sprite texture
        if (sprite.material.map) {
            sprite.material.map.dispose();
        }
        sprite.material.map = new THREE.CanvasTexture(canvas);
        sprite.material.needsUpdate = true;
        
        const scale = 0.012;
        sprite.scale.set(w * scale, h * scale, 1);
    };
    
    // Portal check effect
    useEffect(() => {
        const interval = setInterval(() => {
            checkPortals();
            checkIglooProximity();
        }, 200);
        return () => clearInterval(interval);
    }, [nearbyPortal, room]);
    
    // Handle portal entry
    const handlePortalEnter = () => {
        if (!nearbyPortal) return;
        
        // Teleport to roof (ladder climb)
        if (nearbyPortal.teleportToRoof) {
            const centerX = CENTER_X;
            const centerZ = CENTER_Z;
            
            // Nightclub center is at (0, -75) offset, building depth is 20
            // Spawn near rear of roof: center - 25% of depth = -75 - 5 = -80
            const roofX = centerX;
            const roofZ = centerZ - 75 - 5; // Offset -25% to spawn near rear
            const roofY = 16; // Spawn above roof collision (roof at 13) to land on it
            
            posRef.current.x = roofX;
            posRef.current.z = roofZ;
            posRef.current.y = roofY;
            velRef.current.y = 0;
            
            if (playerRef.current) {
                playerRef.current.position.set(roofX, roofY, roofZ);
            }
            
            // Immediately save position so Y is preserved on refresh/reconnect
            try {
                localStorage.setItem('player_position', JSON.stringify({
                    x: roofX, y: roofY, z: roofZ, room: 'town', savedAt: Date.now()
                }));
                console.log('💾 Saved roof position:', { x: roofX, y: roofY, z: roofZ });
            } catch (e) { /* ignore */ }
            
            setNearbyPortal(null);
            return;
        }
        
        // Room transition
        if (nearbyPortal.targetRoom && onChangeRoom) {
            let exitSpawnPos = nearbyPortal.exitSpawnPos;
            
            // If entering an igloo from town, store the exit spawn position
            if (room === 'town' && nearbyPortal.targetRoom.startsWith('igloo')) {
                iglooEntrySpawnRef.current = nearbyPortal.exitSpawnPos;
            }
            
            // If exiting an igloo back to town, use the stored entry position
            if (room.startsWith('igloo') && nearbyPortal.targetRoom === 'town') {
                if (iglooEntrySpawnRef.current) {
                    exitSpawnPos = iglooEntrySpawnRef.current;
                    iglooEntrySpawnRef.current = null; // Clear after use
                }
            }
            
            // Pass exit spawn position if available (for returning to town)
            onChangeRoom(nearbyPortal.targetRoom, exitSpawnPos);
            return;
        }
        
        // Start minigame
        if (nearbyPortal.minigame && onStartMinigame) {
            onStartMinigame(nearbyPortal.minigame);
            return;
        }
    };
    
    // Handle E key for portal entry
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.code === 'KeyE' && nearbyPortal && !emoteWheelOpen) {
                if (nearbyPortal.targetRoom || nearbyPortal.minigame || nearbyPortal.teleportToRoof) {
                    handlePortalEnter();
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [nearbyPortal, emoteWheelOpen]);
    
    // Handle town interactions (benches, snowmen, etc.)
    useEffect(() => {
        const handleTownInteraction = (e) => {
            const { action, message, emote, data, exitedZone } = e.detail;
            
            // Handle exit events - clear the interaction prompt (but not if seated)
            if (action === 'exit') {
                if (!seatedRef.current) {
                    setNearbyInteraction(null);
                }
                return;
            }
            
            if (action === 'sit' && emote) {
                // Don't show prompt if already seated
                if (seatedRef.current) return;
                // Pass bench data including snap points and world position
                setNearbyInteraction({ 
                    action, 
                    message: 'Press E to sit', 
                    emote,
                    benchData: data // Contains snapPoints, seatHeight, etc.
                });
            } else if (action === 'dj') {
                // Don't show prompt if already DJing
                if (seatedRef.current) return;
                // Pass DJ booth data
                setNearbyInteraction({ 
                    action, 
                    message: message || '🎧 Press E to DJ',
                    emote: emote || 'DJ',
                    benchData: data // Contains position, rotation, etc.
                });
            } else if (action === 'climb_roof') {
                // Show ladder climb prompt
                setNearbyInteraction({ 
                    action, 
                    message: message || '🪜 Climb to Roof (Press E)',
                    data: data
                });
            } else if (action === 'interact_snowman') {
                // Show snowman message
                setNearbyInteraction({ action, message: message || '☃️ Say hi to the snowman!', emote: 'Wave' });
            }
            // Note: enter_igloo is handled by portal system, not interaction prompts
        };
        
        window.addEventListener('townInteraction', handleTownInteraction);
        return () => window.removeEventListener('townInteraction', handleTownInteraction);
    }, []);
    
    // Handle interaction with E key
    useEffect(() => {
        const handleInteract = (e) => {
            if (e.code === 'KeyE' && nearbyInteraction && !nearbyPortal) {
                // Handle bench sitting with snap points
                if (nearbyInteraction.action === 'sit' && nearbyInteraction.benchData) {
                    const benchData = nearbyInteraction.benchData;
                    const snapPoints = benchData.snapPoints || [{ x: 0, z: 0, rotation: 0 }];
                    const benchX = benchData.worldX;
                    const benchZ = benchData.worldZ;
                    const benchRotation = benchData.worldRotation || 0;
                    
                    // Find the closest available snap point
                    const playerX = posRef.current.x;
                    const playerZ = posRef.current.z;
                    
                    // Find closest snap point (transform to world space considering rotation)
                    let closestPoint = snapPoints[0];
                    let closestDist = Infinity;
                    let closestWorldX = benchX;
                    let closestWorldZ = benchZ;
                    
                    for (const point of snapPoints) {
                        // Rotate snap point by bench rotation
                        const rotatedX = point.x * Math.cos(benchRotation) - point.z * Math.sin(benchRotation);
                        const rotatedZ = point.x * Math.sin(benchRotation) + point.z * Math.cos(benchRotation);
                        
                        // Transform to world space
                        const worldX = benchX + rotatedX;
                        const worldZ = benchZ + rotatedZ;
                        
                        const dist = Math.sqrt((playerX - worldX) ** 2 + (playerZ - worldZ) ** 2);
                        if (dist < closestDist) {
                            closestDist = dist;
                            closestPoint = point;
                            closestWorldX = worldX;
                            closestWorldZ = worldZ;
                        }
                    }
                    
                    // Set seated state
                    const seatData = {
                        snapPoint: closestPoint,
                        worldPos: { x: closestWorldX, z: closestWorldZ },
                        seatHeight: benchData.seatHeight || 0.8,
                        benchRotation: benchRotation,
                        benchDepth: benchData.benchDepth || 0.8,
                        dismountBack: benchData.dismountBack || false, // For bar stools
                        platformHeight: benchData.platformHeight || benchData.data?.platformHeight || 0 // For rooftop benches
                    };
                    setSeatedOnBench(seatData);
                    seatedRef.current = seatData;
                    
                    // Move player to seat position (including Y height!)
                    posRef.current.x = closestWorldX;
                    posRef.current.z = closestWorldZ;
                    posRef.current.y = seatData.seatHeight; // SET Y TO SEAT HEIGHT!
                    velRef.current.y = 0; // Stop any falling
                    
                    // Determine facing direction
                    let finalRotation = benchRotation;
                    
                    // BIDIRECTIONAL SIT (log seats only): Face based on approach side
                    if (benchData.bidirectionalSit) {
                        // Calculate which side of the log the player approached from
                        // Get the log's forward direction (+Z in local space after rotation)
                        const logForwardX = Math.sin(benchRotation);
                        const logForwardZ = Math.cos(benchRotation);
                        
                        // Vector from log center to player position
                        const toPlayerX = playerX - benchX;
                        const toPlayerZ = playerZ - benchZ;
                        
                        // Dot product to determine which side player is on
                        const dotProduct = toPlayerX * logForwardX + toPlayerZ * logForwardZ;
                        
                        // If player approached from back side (negative dot), flip 180°
                        if (dotProduct < 0) {
                            finalRotation = benchRotation + Math.PI;
                        }
                    }
                    
                    rotRef.current = finalRotation;
                    
                    // Update player mesh position and rotation
                    if (playerRef.current) {
                        playerRef.current.position.x = closestWorldX;
                        playerRef.current.position.z = closestWorldZ;
                        playerRef.current.position.y = seatData.seatHeight; // SET Y TO SEAT HEIGHT!
                        playerRef.current.rotation.y = rotRef.current;
                    }
                    
                    // Trigger sit emote (furniture sit - elevated)
                    emoteRef.current = { type: 'Sit', startTime: Date.now() };
                    mpSendEmote('Sit', true); // true = seatedOnFurniture
                    
                    // Clear the interaction prompt
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.action === 'dj' && nearbyInteraction.benchData) {
                    // DJ at the turntable
                    const djData = nearbyInteraction.benchData;
                    const djX = djData.worldX;
                    const djZ = djData.worldZ;
                    const djRotation = djData.worldRotation !== undefined ? djData.worldRotation : 0;
                    const djHeight = djData.seatHeight || 0.75;
                    
                    // Set seated/DJ state
                    const seatData = {
                        snapPoint: { x: 0, z: 0 },
                        worldPos: { x: djX, z: djZ },
                        seatHeight: djHeight,
                        benchRotation: djRotation,
                        benchDepth: 1,
                        dismountBack: true, // Step back when exiting DJ booth
                        platformHeight: djHeight
                    };
                    setSeatedOnBench(seatData);
                    seatedRef.current = seatData;
                    
                    // Move player to DJ position
                    posRef.current.x = djX;
                    posRef.current.z = djZ;
                    posRef.current.y = djHeight;
                    velRef.current.y = 0;
                    rotRef.current = djRotation;
                    
                    if (playerRef.current) {
                        playerRef.current.position.set(djX, djHeight, djZ);
                        playerRef.current.rotation.y = djRotation;
                    }
                    
                    // Trigger DJ emote
                    emoteRef.current = { type: 'DJ', startTime: Date.now() };
                    mpSendEmote('DJ', true); // true = seatedOnFurniture (continuous emote)
                    
                    // Clear the interaction prompt
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.action === 'climb_roof') {
                    // Teleport to nightclub roof
                    const townCenterX = CENTER_X;
                    const townCenterZ = CENTER_Z;
                    
                    // Nightclub is at (CENTER, CENTER - 75), roof height is ~13 (building height 12 + 1)
                    const roofX = townCenterX;
                    const roofZ = townCenterZ - 75;
                    const roofY = 15; // Spawn above roof to land on it
                    
                    posRef.current.x = roofX;
                    posRef.current.z = roofZ;
                    posRef.current.y = roofY;
                    velRef.current.y = 0;
                    
                    if (playerRef.current) {
                        playerRef.current.position.set(roofX, roofY, roofZ);
                    }
                    
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.emote) {
                    emoteRef.current = { type: nearbyInteraction.emote, startTime: Date.now() };
                    // Ground sit emote (not on furniture)
                    mpSendEmote(nearbyInteraction.emote, false);
                }
                if (nearbyInteraction.action === 'interact_snowman') {
                    setActiveBubble(nearbyInteraction.message);
                }
            }
        };
        window.addEventListener('keydown', handleInteract);
        return () => window.removeEventListener('keydown', handleInteract);
    }, [nearbyInteraction, nearbyPortal]);
    
    // ==================== CHAT COMMANDS ====================
    // Handle /spawn command to teleport to TOWN CENTER spawn (always)
    useEffect(() => {
        const handleChatCommand = (e) => {
            const { command } = e.detail;
            
            if (command === 'spawn') {
                // ALWAYS teleport to town center spawn - no questions asked
                const townCenterX = CENTER_X;
                const townCenterZ = CENTER_Z;
                
                // Clear any seated state first
                if (seatedRef.current) {
                    seatedRef.current = null;
                    setSeatedOnBench(null);
                    emoteRef.current.type = null;
                    mpSendEmote(null);
                }
                
                // If not in town, change room to town first
                if (roomRef.current !== 'town') {
                    // Change to town room
                    if (onChangeRoom) {
                        onChangeRoom('town', null);
                    }
                } else {
                    // Already in town - just teleport
                    posRef.current.x = townCenterX;
                    posRef.current.y = 0;
                    posRef.current.z = townCenterZ;
                    velRef.current = { x: 0, y: 0, z: 0 };
                    
                    // Update mesh position
                    if (playerRef.current) {
                        playerRef.current.position.set(townCenterX, 0, townCenterZ);
                    }
                }
                
                console.log('🌟 Teleported to Town Center spawn:', { x: townCenterX, z: townCenterZ });
            }
        };
        
        window.addEventListener('chatCommand', handleChatCommand);
        return () => window.removeEventListener('chatCommand', handleChatCommand);
    }, [mpSendEmote, onChangeRoom]);
    
    // Listen for room counts updates from server (for igloo occupancy bubbles)
    useEffect(() => {
        const handleRoomCounts = (event) => {
            const counts = event.detail;
            if (!counts) return;
            
            // Update each igloo sprite with the count from server
            // Map room names to igloo IDs (multiple igloos can share the same room)
            const roomToIgloos = {
                'igloo1': ['igloo1', 'igloo5', 'igloo9'],
                'igloo2': ['igloo2', 'igloo6', 'igloo10'],
                'igloo3': ['igloo3', 'igloo7'],
                'igloo4': ['igloo4', 'igloo8']
            };
            
            // Update sprites for each room's igloos
            for (const [roomName, iglooIds] of Object.entries(roomToIgloos)) {
                const count = counts[roomName] || 0;
                iglooIds.forEach(iglooId => {
                    const sprite = iglooOccupancySpritesRef.current.get(iglooId);
                    if (sprite) {
                        // Update the sprite texture with new count
                        updateIglooOccupancySprite(window.THREE, sprite, count);
                    }
                });
            }
        };
        
        window.addEventListener('roomCounts', handleRoomCounts);
        return () => window.removeEventListener('roomCounts', handleRoomCounts);
    }, []);
    

    // ==================== MULTIPLAYER SYNC (OPTIMIZED) ====================
    
    // Helper to create name sprite for other players
    const createNameSprite = useCallback((name) => {
        const THREE = window.THREE;
        if (!THREE) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.roundRect(0, 0, 256, 64, 10);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(4, 1, 1);
        return sprite;
    }, []);
    
    // Join room when connected and scene is ready
    useEffect(() => {
        if (connected && sceneRef.current && playerId) {
            const puffleData = playerPuffle ? {
                id: playerPuffle.id,
                color: playerPuffle.color,
                name: playerPuffle.name
            } : null;
            mpJoinRoom(room, penguinData, puffleData);
        }
    }, [connected, playerId, room, penguinData]);
    
    // Send position updates (throttled) - OPTIMIZED: 100ms interval, only when changed
    useEffect(() => {
        if (!connected) return;
        
        const interval = setInterval(() => {
            const pos = posRef.current;
            const rot = rotRef.current;
            const last = lastPositionSentRef.current;
            
            const dx = pos.x - last.x;
            const dz = pos.z - last.z;
            const dy = (pos.y || 0) - (last.y || 0);
            const dRot = Math.abs(rot - last.rot);
            const distSq = dx * dx + dz * dz;
            const yChanged = Math.abs(dy) > 0.1; // Detect jumps
            
            // Only send if moved significantly (including Y for jumps)
            if (distSq > 0.05 || dRot > 0.1 || yChanged) {
                const pufflePos = playerPuffleRef.current?.position || null;
                // Send full 3D position including Y for jump sync
                sendPosition({ x: pos.x, y: pos.y, z: pos.z }, rot, pufflePos);
                lastPositionSentRef.current = { x: pos.x, y: pos.y, z: pos.z, rot, time: Date.now() };
            }
            
            // Always update local position for proximity checking
            if (updateLocalPosition) {
                updateLocalPosition(pos);
            }
        }, 100); // 10 updates per second (was 20)
        
        return () => clearInterval(interval);
    }, [connected, sendPosition]);
    
    // Register ball update callback for igloo sync
    useEffect(() => {
        if (!registerCallbacks) return;
        
        registerCallbacks({
            onBallUpdate: (x, z, vx, vz) => {
                // Update local ball from server
                const rd = roomDataRef.current;
                if (rd && rd.beachBall) {
                    const ball = rd.beachBall;
                    // Smoothly interpolate to server position
                    ball.mesh.position.x = x;
                    ball.mesh.position.z = z;
                    ball.velocity.x = vx;
                    ball.velocity.z = vz;
                }
            }
        });
    }, [registerCallbacks]);
    
    // Handle player list changes - CREATE/REMOVE meshes only
    useEffect(() => {
        if (!sceneRef.current || !window.THREE || !buildPenguinMeshRef.current) return;
        
        const THREE = window.THREE;
        const scene = sceneRef.current;
        const meshes = otherPlayerMeshesRef.current;
        const playersData = playersDataRef.current;
        
        // Current player IDs from server
        const currentPlayerIds = new Set(playerList);
        
        // Remove meshes for players who left
        for (const [id, data] of meshes) {
            if (!currentPlayerIds.has(id)) {
                if (data.mesh) scene.remove(data.mesh);
                if (data.bubble) scene.remove(data.bubble);
                if (data.puffleMesh) scene.remove(data.puffleMesh);
                meshes.delete(id);
            }
        }
        
        // Create meshes for new players
        for (const id of playerList) {
            if (meshes.has(id)) continue; // Already has mesh
            
            const playerData = playersData.get(id);
            if (!playerData || !playerData.appearance) continue;
            
            console.log(`🐧 Creating mesh for ${playerData.name}`, playerData.puffle ? `with ${playerData.puffle.color} puffle` : '(no puffle)');
            
            const mesh = buildPenguinMeshRef.current(playerData.appearance);
            mesh.position.set(
                playerData.position?.x || 0,
                0,
                playerData.position?.z || 0
            );
            mesh.rotation.y = playerData.rotation || 0;
            scene.add(mesh);
            
            // Create name tag - adjust height for character type
            const nameSprite = createNameSprite(playerData.name || 'Player');
            if (nameSprite) {
                const nameHeight = playerData.appearance?.characterType === 'marcus' ? NAME_HEIGHT_MARCUS : NAME_HEIGHT_PENGUIN;
                nameSprite.position.set(0, nameHeight, 0);
                mesh.add(nameSprite);
            }
            
            // Create puffle if player has one
            let puffleMesh = null;
            if (playerData.puffle) {
                console.log(`🐾 Creating puffle mesh: ${playerData.puffle.color}`);
                const puffleInstance = new Puffle({
                    color: playerData.puffle.color,
                    name: playerData.puffle.name
                });
                puffleMesh = puffleInstance.createMesh(THREE);
                // Set initial puffle position
                const pufflePos = playerData.pufflePosition || {
                    x: (playerData.position?.x || 0) + 1.5,
                    z: (playerData.position?.z || 0) + 1.5
                };
                puffleMesh.position.set(pufflePos.x, 0.5, pufflePos.z);
                scene.add(puffleMesh);
                console.log(`🐾 Puffle mesh added at`, pufflePos);
            }
            
            // OPTIMIZATION: Check if player has animated cosmetics
            const appearance = playerData.appearance || {};
            const hasAnimatedCosmetics = appearance.hat === 'propeller' || 
                                         appearance.hat === 'flamingCrown' ||
                                         appearance.mouth === 'cigarette' || 
                                         appearance.mouth === 'pipe' ||
                                         appearance.mouth === 'cigar' ||
                                         appearance.mouth === 'fireBreath' ||
                                         appearance.mouth === 'iceBreath' ||
                                         appearance.mouth === 'bubblegum' ||
                                         appearance.eyes === 'laser' ||
                                         appearance.eyes === 'fire' ||
                                         appearance.bodyItem === 'angelWings' ||
                                         appearance.bodyItem === 'demonWings' ||
                                         appearance.bodyItem === 'fireAura' ||
                                         appearance.bodyItem === 'lightningAura';
            
            meshes.set(id, { 
                mesh, 
                bubble: null, 
                puffleMesh, 
                nameSprite,
                // Initialize emote from playerData (player might already be sitting)
                currentEmote: playerData.emote || null,
                emoteStartTime: playerData.emoteStartTime || Date.now(),
                // OPTIMIZATION: Pre-cache whether this player has animated cosmetics
                hasAnimatedCosmetics
            });
            
            // Clear the needsMesh flag
            playerData.needsMesh = false;
            console.log(`🐧 Created mesh for ${playerData.name}, emote: ${playerData.emote}, seatedOnFurniture: ${playerData.seatedOnFurniture}`);
        }
    }, [playerList, createNameSprite]);
    
    // Notify server when changing rooms
    useEffect(() => {
        if (connected && playerId) {
            mpChangeRoom(room);
        }
    }, [room, connected, playerId]);
    
    // Update puffle on server when changed
    useEffect(() => {
        if (connected && playerId) {
            const puffleData = playerPuffle ? {
                id: playerPuffle.id,
                color: playerPuffle.color,
                name: playerPuffle.name
            } : null;
            mpUpdatePuffle(puffleData);
        }
    }, [playerPuffle, connected, playerId]);
    
    // Mobile directional button handlers
    const handleMobileButtonDown = (direction) => {
        mobileControlsRef.current[direction] = true;
    };
    
    const handleMobileButtonUp = (direction) => {
        mobileControlsRef.current[direction] = false;
    };
    
    return (
        <div className="relative w-full h-full bg-black">
             <div ref={mountRef} className="absolute inset-0" />
             
             {/* Connection Error Display */}
             {connectionError && (
                <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8">
                    <div className="text-6xl mb-6">⚠️</div>
                    <h2 className="text-red-400 text-xl retro-text text-center mb-4">Connection Error</h2>
                    <p className="text-white text-center text-sm mb-2">{connectionError.message}</p>
                    {connectionError.code === 'TOO_MANY_CONNECTIONS' && (
                        <p className="text-gray-400 text-center text-xs">
                            Please close other browser tabs running this game.
                        </p>
                    )}
                    <button 
                        className="mt-6 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-xl retro-text text-sm"
                        onClick={() => window.location.reload()}
                    >
                        Retry Connection
                    </button>
                </div>
             )}
             
             {/* Mobile Portrait Mode Warning */}
             {isMobile && !isLandscape && (
                <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8">
                    <div className="text-6xl mb-6 animate-bounce">📱</div>
                    <h2 className="text-white text-xl retro-text text-center mb-4">Rotate Your Device</h2>
                    <p className="text-gray-400 text-center text-sm">
                        Please rotate your device to landscape mode for the best experience
                    </p>
                    <div className="mt-8 w-20 h-12 border-2 border-white/50 rounded-lg relative animate-pulse">
                        <div className="absolute inset-1 bg-cyan-500/30 rounded"></div>
                    </div>
                </div>
             )}
             
             {/* Mobile PUBG-style Joystick - LEFT side (or right if left-handed) */}
             {isMobile && isLandscape && (
                <VirtualJoystick
                    onMove={(input) => { joystickInputRef.current = input; }}
                    size={window.innerWidth >= 768 ? 150 : 120}
                    position={gameSettings.leftHanded ? 'right' : 'left'}
                    deadzone={0.1}
                />
             )}
             
             {/* Mobile Touch Camera Control - covers entire screen, joystick handles its own touches */}
             {isMobile && isLandscape && (
                <TouchCameraControl
                    onRotate={(delta) => { cameraRotationRef.current = delta; }}
                    sensitivity={gameSettings.cameraSensitivity || 0.3}
                />
             )}
             
             {/* Mobile Jump Button - positioned above action buttons on opposite side of joystick */}
             {isMobile && isLandscape && (
                <button 
                    className={`absolute bottom-[200px] ${gameSettings.leftHanded ? 'left-6' : 'right-6'} w-16 h-16 rounded-full bg-green-600/80 border-2 border-white/40 flex items-center justify-center active:scale-90 active:bg-green-500 transition-all z-30 touch-none`}
                    onTouchStart={(e) => { e.preventDefault(); jumpRequestedRef.current = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); jumpRequestedRef.current = false; }}
                >
                    <span className="text-2xl">⬆️</span>
                </button>
             )}
             
             {/* Mobile Action Buttons - positioned on opposite side of joystick */}
             {isMobile && isLandscape && (
                <div className={`absolute bottom-[70px] ${gameSettings.leftHanded ? 'left-6' : 'right-6'} flex flex-col gap-2 z-30`}>
                    {/* Chat Button */}
                    <button 
                        className="w-12 h-12 rounded-full bg-cyan-600/80 border-2 border-white/40 flex items-center justify-center active:scale-90 transition-transform touch-none"
                        onClick={() => setShowMobileChat(true)}
                    >
                        <span className="text-xl">💬</span>
                    </button>
                    
                    {/* Emote Button */}
                    <button 
                        className="w-12 h-12 rounded-full bg-purple-600/80 border-2 border-white/40 flex items-center justify-center active:scale-90 transition-transform touch-none"
                        onClick={() => { setEmoteWheelOpen(true); emoteSelectionRef.current = -1; setEmoteWheelSelection(-1); }}
                    >
                        <span className="text-xl">😄</span>
                    </button>
                    
                    {/* Interact Button (E key) */}
                    {(nearbyPortal || nearbyInteraction) && (
                        <button 
                            className="w-12 h-12 rounded-full bg-yellow-600/80 border-2 border-white/40 flex items-center justify-center active:scale-90 transition-transform animate-pulse touch-none"
                            onClick={() => {
                                if (nearbyPortal) {
                                    handlePortalEnter();
                                } else if (nearbyInteraction) {
                                    // Handle bench sitting with snap points
                                    if (nearbyInteraction.action === 'sit' && nearbyInteraction.benchData) {
                                        const benchData = nearbyInteraction.benchData;
                                        const snapPoints = benchData.snapPoints || [{ x: 0, z: 0, rotation: 0 }];
                                        const benchX = benchData.worldX;
                                        const benchZ = benchData.worldZ;
                                        const benchRotation = benchData.worldRotation || 0;
                                        const playerX = posRef.current.x;
                                        const playerZ = posRef.current.z;
                                        
                                        // Find closest snap point with rotation
                                        let closestPoint = snapPoints[0];
                                        let closestDist = Infinity;
                                        let closestWorldX = benchX;
                                        let closestWorldZ = benchZ;
                                        
                                        for (const point of snapPoints) {
                                            const rotatedX = point.x * Math.cos(benchRotation) - point.z * Math.sin(benchRotation);
                                            const rotatedZ = point.x * Math.sin(benchRotation) + point.z * Math.cos(benchRotation);
                                            const worldX = benchX + rotatedX;
                                            const worldZ = benchZ + rotatedZ;
                                            const dist = Math.sqrt((playerX - worldX) ** 2 + (playerZ - worldZ) ** 2);
                                            if (dist < closestDist) {
                                                closestDist = dist;
                                                closestPoint = point;
                                                closestWorldX = worldX;
                                                closestWorldZ = worldZ;
                                            }
                                        }
                                        
                                        // Determine facing direction
                                        let finalRotation = benchRotation;
                                        
                                        // BIDIRECTIONAL SIT (log seats only): Face based on approach side
                                        if (benchData.bidirectionalSit) {
                                            const logForwardX = Math.sin(benchRotation);
                                            const logForwardZ = Math.cos(benchRotation);
                                            const toPlayerX = playerX - benchX;
                                            const toPlayerZ = playerZ - benchZ;
                                            const dotProduct = toPlayerX * logForwardX + toPlayerZ * logForwardZ;
                                            if (dotProduct < 0) {
                                                finalRotation = benchRotation + Math.PI;
                                            }
                                        }
                                        
                                        const seatData = {
                                            snapPoint: closestPoint,
                                            worldPos: { x: closestWorldX, z: closestWorldZ },
                                            seatHeight: benchData.seatHeight || 0.8,
                                            benchRotation: finalRotation,
                                            benchDepth: benchData.benchDepth || 0.8,
                                            dismountBack: benchData.dismountBack || false, // For bar stools
                                            platformHeight: benchData.platformHeight || benchData.data?.platformHeight || 0 // For rooftop benches
                                        };
                                        setSeatedOnBench(seatData);
                                        seatedRef.current = seatData;
                                        
                                        posRef.current.x = closestWorldX;
                                        posRef.current.z = closestWorldZ;
                                        posRef.current.y = seatData.seatHeight; // SET Y TO SEAT HEIGHT!
                                        velRef.current.y = 0; // Stop any falling
                                        rotRef.current = finalRotation; // Face based on approach
                                        
                                        if (playerRef.current) {
                                            playerRef.current.position.x = closestWorldX;
                                            playerRef.current.position.z = closestWorldZ;
                                            playerRef.current.position.y = seatData.seatHeight; // SET Y TO SEAT HEIGHT!
                                            playerRef.current.rotation.y = rotRef.current;
                                        }
                                        
                                        emoteRef.current = { type: 'Sit', startTime: Date.now() };
                                        mpSendEmote('Sit', true); // true = seatedOnFurniture
                                        setNearbyInteraction(null);
                                    }
                                    else if (nearbyInteraction.action === 'dj' && nearbyInteraction.benchData) {
                                        // DJ at the turntable (mobile)
                                        const djData = nearbyInteraction.benchData;
                                        const djX = djData.worldX;
                                        const djZ = djData.worldZ;
                                        const djRotation = djData.worldRotation !== undefined ? djData.worldRotation : 0;
                                        const djHeight = djData.seatHeight || 0.75;
                                        
                                        const seatData = {
                                            snapPoint: { x: 0, z: 0 },
                                            worldPos: { x: djX, z: djZ },
                                            seatHeight: djHeight,
                                            benchRotation: djRotation,
                                            benchDepth: 1,
                                            dismountBack: true,
                                            platformHeight: djHeight
                                        };
                                        setSeatedOnBench(seatData);
                                        seatedRef.current = seatData;
                                        
                                        posRef.current.x = djX;
                                        posRef.current.z = djZ;
                                        posRef.current.y = djHeight;
                                        velRef.current.y = 0;
                                        rotRef.current = djRotation;
                                        
                                        if (playerRef.current) {
                                            playerRef.current.position.set(djX, djHeight, djZ);
                                            playerRef.current.rotation.y = djRotation;
                                        }
                                        
                                        emoteRef.current = { type: 'DJ', startTime: Date.now() };
                                        mpSendEmote('DJ', true);
                                        setNearbyInteraction(null);
                                    }
                                    else if (nearbyInteraction.emote) {
                                        emoteRef.current = { type: nearbyInteraction.emote, startTime: Date.now() };
                                        mpSendEmote(nearbyInteraction.emote, false); // Ground emote
                                    }
                                    if (nearbyInteraction.action === 'interact_snowman') {
                                        setActiveBubble(nearbyInteraction.message);
                                    }
                                }
                            }}
                        >
                            <span className="text-xl retro-text text-white">E</span>
                        </button>
                    )}
                </div>
             )}
             
             {/* HUD - Top Right */}
             <GameHUD 
                onOpenPuffles={() => setShowPufflePanel(true)}
                onOpenSettings={() => setShowSettings(true)}
                isMobile={isMobile}
                playerCount={playerCount}
                totalPlayerCount={totalPlayerCount}
             />
             
             {/* Chat Log - Desktop: bottom-left, Mobile: toggleable overlay */}
             <ChatLog 
                isMobile={isMobile}
                isOpen={!isMobile || showMobileChat}
                onClose={() => setShowMobileChat(false)}
             />
             
             {/* Door/Portal Prompt */}
             <Portal 
                name={nearbyPortal?.name}
                emoji={nearbyPortal?.emoji}
                description={nearbyPortal?.description}
                isNearby={!!nearbyPortal}
                onEnter={handlePortalEnter}
                color={nearbyPortal?.targetRoom || nearbyPortal?.minigame || nearbyPortal?.teleportToRoof ? 'green' : 'gray'}
                hasGame={!!(nearbyPortal?.targetRoom || nearbyPortal?.minigame || nearbyPortal?.teleportToRoof)}
             />
             
             {/* Town Interaction Prompt */}
             {nearbyInteraction && !nearbyPortal && (
                <div className={`absolute ${isMobile ? 'bottom-[180px] right-28' : 'bottom-24 left-1/2 -translate-x-1/2'} bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20 text-center animate-bounce-subtle z-20`}>
                    <p className="text-white retro-text text-sm">{nearbyInteraction.message}</p>
                    <p className="text-yellow-400 text-xs mt-1 retro-text">{isMobile ? 'Tap E' : 'Press E'}</p>
                </div>
             )}

             {/* Puffle Panel */}
             {showPufflePanel && (
                <PufflePanel
                    equippedPuffle={puffle}
                    ownedPuffles={ownedPuffles}
                    onAdopt={handleAdoptPuffle}
                    onEquip={handleEquipPuffle}
                    onUnequip={handleUnequipPuffle}
                    onUpdate={handleUpdatePuffle}
                    onClose={() => setShowPufflePanel(false)}
                />
             )}
             
             {/* Title & Controls - Top Left */}
             <div className="absolute top-4 left-4 retro-text text-white drop-shadow-md z-10 pointer-events-none">
                 <h2 className={`text-xl drop-shadow-lg ${room === 'dojo' ? 'text-red-400' : room === 'pizza' ? 'text-orange-400' : room === 'nightclub' ? 'text-fuchsia-400' : room === 'igloo3' ? 'text-fuchsia-400' : room.startsWith('igloo') ? 'text-cyan-300' : 'text-yellow-400'}`}>
                     {room === 'dojo' ? 'THE DOJO' : room === 'pizza' ? 'PIZZA PARLOR' : room === 'nightclub' ? '🎵 THE NIGHTCLUB' : room === 'igloo3' ? '🎵 SKNY GANG $CPw3' : room.startsWith('igloo') ? `IGLOO ${room.replace('igloo', '')}` : 'TOWN'}
                 </h2>
                 {!isMobile && (
                     <p className="text-[10px] opacity-70 mt-1">WASD Move • E Interact • T Emotes • Mouse Orbit</p>
                 )}
             </div>
             
             {/* Debug Position Panel - Press F3 to toggle (DEV ONLY) */}
             {process.env.NODE_ENV !== 'production' && showDebugPosition && (
                 <div className="absolute top-4 right-4 bg-black/80 border border-green-500/50 rounded-lg p-3 z-50 pointer-events-auto font-mono text-xs">
                     <div className="text-green-400 font-bold mb-2 flex items-center gap-2">
                         📍 DEBUG POSITION
                         <span className="text-[10px] text-white/50">(F3 to hide)</span>
                     </div>
                     <div className="space-y-1 text-white/90">
                         <div className="flex justify-between gap-4">
                             <span className="text-cyan-400">World X:</span>
                             <span>{debugPosition.x}</span>
                         </div>
                         <div className="flex justify-between gap-4">
                             <span className="text-yellow-400">World Y:</span>
                             <span>{debugPosition.y}</span>
                         </div>
                         <div className="flex justify-between gap-4">
                             <span className="text-pink-400">World Z:</span>
                             <span>{debugPosition.z}</span>
                         </div>
                         <div className="border-t border-white/20 my-2"></div>
                         <div className="text-green-300 text-[10px] mb-1">Offset from Center (C):</div>
                         <div className="flex justify-between gap-4">
                             <span className="text-cyan-300">C + X:</span>
                             <span className="text-green-400">{debugPosition.offsetX}</span>
                         </div>
                         <div className="flex justify-between gap-4">
                             <span className="text-pink-300">C + Z:</span>
                             <span className="text-green-400">{debugPosition.offsetZ}</span>
                         </div>
                         <div className="flex justify-between gap-4">
                             <span className="text-orange-300">Rotation:</span>
                             <span>{debugPosition.rotation}°</span>
                         </div>
                     </div>
                     <button
                         onClick={() => {
                             const text = `x: C + ${debugPosition.offsetX}, z: C + ${debugPosition.offsetZ}`;
                             navigator.clipboard.writeText(text);
                         }}
                         className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white text-[10px] py-1 px-2 rounded"
                     >
                         📋 Copy Offset
                     </button>
                     <div className="mt-2 text-[9px] text-white/40 text-center">
                         Use offsets in TownCenter.js props
                     </div>
                     
                     {/* Day/Night Cycle Controls */}
                     <div className="border-t border-white/20 mt-3 pt-3">
                         <div className="text-yellow-400 font-bold mb-2 text-[10px]">☀️ DAY/NIGHT CYCLE</div>
                         <div className="text-green-400 text-[9px] mb-2">🌐 Server Synced</div>
                         <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                 <span className="text-white/70 text-[10px]">Time:</span>
                                 <span className="text-yellow-300 text-[10px]">
                                     {dayTime < 0.2 ? '🌙 Night' : dayTime < 0.3 ? '🌅 Sunrise' : dayTime < 0.7 ? '☀️ Day' : dayTime < 0.8 ? '🌇 Sunset' : '🌙 Night'}
                                     {' '}({(dayTime * 24).toFixed(1)}h)
                                 </span>
                             </div>
                             <div>
                                 <label className="text-white/50 text-[9px] block mb-1">Debug Override (pause to use)</label>
                                 <input
                                     type="range"
                                     min="0"
                                     max="1"
                                     step="0.01"
                                     value={dayTime}
                                     onChange={(e) => {
                                         const val = parseFloat(e.target.value);
                                         setDayTime(val);
                                         dayTimeRef.current = val;
                                     }}
                                     disabled={daySpeed !== 0}
                                     className="w-full h-1 bg-gray-700 rounded appearance-none cursor-pointer disabled:opacity-30"
                                 />
                             </div>
                             <div className="flex gap-1 mt-1">
                                 <button
                                     onClick={() => { setDaySpeed(0); daySpeedRef.current = 0; }}
                                     className={`flex-1 text-white text-[9px] py-1 rounded ${daySpeed === 0 ? 'bg-red-500' : 'bg-red-600/50 hover:bg-red-500'}`}
                                 >
                                     ⏸ Pause
                                 </button>
                                 <button
                                     onClick={() => { setDaySpeed(1); daySpeedRef.current = 1; }}
                                     className={`flex-1 text-white text-[9px] py-1 rounded ${daySpeed !== 0 ? 'bg-green-500' : 'bg-green-600/50 hover:bg-green-500'}`}
                                 >
                                     ▶ Server
                                 </button>
                             </div>
                         </div>
                     </div>
                     
                     {/* Snow Controls */}
                     <div className="border-t border-white/20 mt-3 pt-3">
                         <div className="text-cyan-400 font-bold mb-2 text-[10px]">❄️ SNOWFALL</div>
                         <div className="flex justify-between items-center">
                             <span className="text-white/70 text-[10px]">Intensity:</span>
                             <span className="text-cyan-300 text-[10px]">{((snowfallSystemRef.current?.getIntensity() || 0.5) * 100).toFixed(0)}%</span>
                         </div>
                     </div>
                 </div>
             )}

             
            <EmoteWheel
                isOpen={emoteWheelOpen}
                selection={emoteWheelSelection}
                items={EMOTE_WHEEL_ITEMS}
                onSelect={triggerEmote}
                onClose={() => setEmoteWheelOpen(false)}
            />
             
             {/* Settings Menu Modal */}
             <SettingsMenu
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                settings={gameSettings}
                onSettingsChange={setGameSettings}
             />
        </div>
    );
};

export default VoxelWorld;

