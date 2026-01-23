import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VOXEL_SIZE, PALETTE } from './constants';
import { ASSETS } from './assets/index';
import { IconSend } from './Icons';
import GameHUD from './components/GameHUD';
import ChatLog from './components/ChatLog';
import Portal from './components/Portal';
import IglooPortal from './components/IglooPortal';
import BannerZoomOverlay from './components/BannerZoomOverlay';
import IglooRentalGuide from './components/IglooRentalGuide';
import GachaDropRatesGuide from './components/GachaDropRatesGuide';
import PenguinCreatorOverlay from './components/PenguinCreatorOverlay';
import PufflePanel from './components/PufflePanel';
import VirtualJoystick from './components/VirtualJoystick';
import TouchCameraControl from './components/TouchCameraControl';
import SettingsMenu from './components/SettingsMenu';
import ChangelogModal from './components/ChangelogModal';
import EmoteWheel from './components/EmoteWheel';
import GameManager from './engine/GameManager';
import Puffle from './engine/Puffle';
import { createPenguinBuilder, cacheAnimatedParts, animateCosmeticsFromCache } from './engine/PenguinBuilder';
import TownCenter from './rooms/TownCenter';
import Nightclub from './rooms/Nightclub';
import CasinoRoom from './rooms/CasinoRoom';
import { generateIglooInterior } from './rooms/BaseRoom';
import { generateSKNYIglooInterior } from './rooms/SKNYIglooInterior';
import { useMultiplayer } from './multiplayer';
import { useChallenge } from './challenge';
import { useIgloo } from './igloo';
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
    BUBBLE_HEIGHT_WHALE,
    NAME_HEIGHT_PENGUIN,
    NAME_HEIGHT_MARCUS,
    NAME_HEIGHT_WHALE,
    ROOM_PORTALS,
    IGLOO_BANNER_STYLES,
    IGLOO_BANNER_CONTENT
} from './config';
import { createChatSprite, updateAIAgents, updateMatchBanners, updatePveBanners, cleanupPveBanners, createIglooOccupancySprite, updateIglooOccupancySprite, animateMesh, updateDayNightCycle, calculateNightFactor, SnowfallSystem, WizardTrailSystem, GakeCandleTrailSystem, MountTrailSystem, LocalizedParticleSystem, CameraController, lerp, lerpRotation, calculateLerpFactor, SlotMachineSystem, JackpotCelebration, IceFishingSystem } from './systems';
import { createDojo, createGiftShop, createPizzaParlor, generateDojoInterior, generatePizzaInterior } from './buildings';
import IceFishingGame from './games/IceFishingGame';
import CasinoBlackjack from './components/CasinoBlackjack';
import BattleshipGame from './minigames/BattleshipGame';

const VoxelWorld = ({ 
    penguinData, 
    onPenguinDataChange, // Callback to update penguinData in parent (App.jsx)
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
    spectatingMatch = {}, // Real-time match state data for spectating
    activePveActivities = {}, // PvE activity state for spectator banners (fishing, blackjack, etc.)
    onRequestAuth,    // Callback to redirect to penguin maker for auth
    turnstileToken = null // Cloudflare Turnstile verification token (for bot protection)
}) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const playerRef = useRef(null);
    const playerNameSpriteRef = useRef(null); // Player's own name tag
    const playerGoldRainRef = useRef(null); // Gold rain particle system for Day 1 nametag
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const reqRef = useRef(null);
    const mapRef = useRef(null);
    const clockRef = useRef(null);
    const roomRef = useRef(room); // Track current room
    const townCenterRef = useRef(null); // TownCenter room instance
    const nightclubRef = useRef(null); // Nightclub room instance
    const casinoRoomRef = useRef(null); // CasinoRoom room instance
    const sknyIglooInteriorRef = useRef(null); // SKNY GANG igloo interior (with update function)
    const roomDataRef = useRef(null); // Store room data (including beach ball) for multiplayer sync
    const raycasterRef = useRef(null); // For player click detection
    const mouseRef = useRef({ x: 0, y: 0 }); // Mouse position for raycasting
    const wagerBotMeshRef = useRef(null); // WagerBot NPC mesh (dev mode only)
    const isInMatchRef = useRef(isInMatch); // Track match state for game loop
    const matchBannersRef = useRef(new Map()); // matchId -> { sprite, canvas, ctx }
    const pveBannersRef = useRef(new Map()); // playerId -> { sprite, canvas, ctx } for PvE activities
    const wizardTrailSystemRef = useRef(null); // World-space wizard hat particle trail
    const gakeCandleTrailSystemRef = useRef(null); // Gake character green candle trail
    const mountTrailSystemRef = useRef(null); // Mount trail system (icy trails, etc.)
    const mountEnabledRef = useRef(true); // Track if mount is equipped/enabled
    const mpUpdateAppearanceRef = useRef(null); // Ref for appearance update function
    const cameraControllerRef = useRef(null); // Smooth third-person camera controller
    const penguinDataRef = useRef(null); // Ref for current penguin data
    const wasInCasinoRef = useRef(false); // Track if player was inside casino (for one-time zoom)
    const casinoZoomTransitionRef = useRef({ active: false, targetDistance: 20, progress: 0 }); // Casino zoom state
    const slotMachineSystemRef = useRef(null); // Slot machine interaction system
    const jackpotCelebrationRef = useRef(null); // Jackpot celebration effects (disco ball, confetti, lasers)
    const iceFishingSystemRef = useRef(null); // Ice fishing interaction system
    
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
            
            // SYNC TO SERVER: Notify other players about mount visibility change
            if (mpUpdateAppearanceRef.current && penguinDataRef.current) {
                mpUpdateAppearanceRef.current({
                    ...penguinDataRef.current,
                    mountEnabled: enabled
                });
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
        updateAppearance: mpUpdateAppearance,
        updatePuffle: mpUpdatePuffle,
        sendBallKick: mpSendBallKick,
        requestBallSync: mpRequestBallSync,
        registerCallbacks,
        chatMessages,
        worldTimeRef: serverWorldTimeRef, // Server-synchronized world time
        isAuthenticated, // For determining persistence mode
        walletAddress, // User's wallet address for igloo ownership checks
        // Slot machine
        spinSlot,
        slotSpinning,
        slotResult,
        activeSlotSpins,
        // Ice fishing
        startFishing,
        attemptCatch,
        cancelFishing,
        fishingActive,
        fishingResult,
        userData,
        // Raw send for PvE activity messages
        send: mpSend
    } = useMultiplayer();
    
    // Keep refs updated for use in event handlers (must be after useMultiplayer destructuring)
    useEffect(() => {
        mpUpdateAppearanceRef.current = mpUpdateAppearance;
    }, [mpUpdateAppearance]);
    
    useEffect(() => {
        penguinDataRef.current = penguinData;
    }, [penguinData]);
    
    // Rebuild local player mesh when penguinData changes (e.g., after saving customization)
    const prevPenguinDataRef = useRef(penguinData);
    useEffect(() => {
        // Skip on initial mount (mesh is built in initThree)
        if (prevPenguinDataRef.current === penguinData) {
            prevPenguinDataRef.current = penguinData;
            return;
        }
        prevPenguinDataRef.current = penguinData;
        
        if (!playerRef.current || !buildPenguinMeshRef.current || !sceneRef.current || !penguinData) return;
        
        // Store current position, rotation, and attachments
        const currentPos = playerRef.current.position.clone();
        const currentRot = playerRef.current.rotation.y;
        const nameSprite = playerNameSpriteRef.current;
        
        // Remove old mesh from scene
        sceneRef.current.remove(playerRef.current);
        
        // Build new mesh with updated appearance
        const newMesh = buildPenguinMeshRef.current(penguinData);
        newMesh.position.copy(currentPos);
        newMesh.rotation.y = currentRot;
        sceneRef.current.add(newMesh);
        
        // Reattach nametag
        if (nameSprite) {
            newMesh.add(nameSprite);
        }
        
        // Update mount visibility based on settings
        try {
            const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
            if (settings.mountEnabled === false) {
                mountEnabledRef.current = false;
                const mountGroup = newMesh.getObjectByName('mount');
                if (mountGroup) {
                    mountGroup.visible = false;
                }
            }
        } catch (e) { /* ignore */ }
        
        // Update playerRef
        playerRef.current = newMesh;
        
        // Rebuild animated parts cache
        newMesh.userData._animatedPartsCache = cacheAnimatedParts(newMesh);
        
        console.log('🔄 Rebuilt local player mesh with updated appearance');
    }, [penguinData]);
    
    // Challenge context for position updates and dance trigger
    const { updateLocalPosition, shouldDance, clearDance } = useChallenge();
    
    // Igloo context for rental state and access control
    const { 
        igloos, 
        getIgloo, 
        isOwner: isIglooOwner, 
        myRentals, 
        openDetailsPanel,
        openRequirementsPanel,
        openSettingsPanel,
        checkIglooEntry,
        enterIglooRoom,
        leaveIglooRoom,
        userClearance
    } = useIgloo();
    
    // Check if player is inside their own igloo (for HUD settings button)
    const isInsideOwnedIgloo = room?.startsWith('igloo') && isIglooOwner(room);
    
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
    const isFishnuRespectRef = useRef(false); // True when showing Fishnu respect message
    const fishnuRespectMessageRef = useRef(null);
    
    // Igloo Occupancy Bubbles
    const iglooOccupancySpritesRef = useRef(new Map()); // Map of igloo id -> sprite
    const [iglooOccupancy, setIglooOccupancy] = useState({}); // { igloo1: 2, igloo2: 0, ... }
    
    // Lord Fishnu Lore Sprite
    const lordFishnuSpriteRef = useRef(null);
    
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
    
    // Banner Zoom Overlay State
    const [bannerZoomOpen, setBannerZoomOpen] = useState(false);
    const [bannerZoomData, setBannerZoomData] = useState(null);
    const [iglooRentalGuideOpen, setIglooRentalGuideOpen] = useState(false);
    const [gachaDropRatesGuideOpen, setGachaDropRatesGuideOpen] = useState(false);
    const bannerZoomRenderFn = useRef(null);
    const aiPufflesRef = useRef([]); // { id, puffle }
    
    // Multi-puffle ownership system
    // For guests: empty array (no persistence)
    // For authenticated: loaded from server via GameManager sync
    const [ownedPuffles, setOwnedPuffles] = useState([]);
    
    // Sync puffles from server when authentication state changes
    useEffect(() => {
        if (isAuthenticated) {
            const gm = GameManager.getInstance();
            const serverData = gm.getUserData?.();
            if (serverData?.puffles?.length > 0) {
                try {
                    setOwnedPuffles(serverData.puffles.map(p => Puffle.fromJSON(p)));
                    console.log('🐾 Loaded puffles from server:', serverData.puffles.length);
                } catch (e) {
                    console.warn('Failed to load puffles from server:', e);
                }
            }
        } else {
            // Guest mode - no puffles persistence
            setOwnedPuffles([]);
        }
    }, [isAuthenticated]);
    
    // DON'T persist puffles to localStorage - server is authoritative for auth users
    // Guests don't get persistence
    
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
    
    // Slot Machine Interaction State
    const [slotInteraction, setSlotInteraction] = useState(null); // { machine, prompt, canSpin }
    
    // Blackjack Table Interaction State
    const [blackjackInteraction, setBlackjackInteraction] = useState(null); // { tableId, prompt, canPlay }
    const [blackjackGameActive, setBlackjackGameActive] = useState(false); // True when blackjack UI is open
    const [blackjackTableId, setBlackjackTableId] = useState(null);
    const blackjackDealersRef = useRef([]); // References to dealer penguin meshes
    
    // Ice Fishing Interaction State
    const [fishingInteraction, setFishingInteraction] = useState(null); // { spot, prompt, canFish }
    const [fishingGameActive, setFishingGameActive] = useState(false); // True when fishing minigame is open
    const [fishingGameSpot, setFishingGameSpot] = useState(null); // Current fishing spot for game
    
    // Arcade Game State (PvE Battleship etc)
    const [arcadeGameActive, setArcadeGameActive] = useState(false); // True when arcade minigame is open
    const [arcadeGameType, setArcadeGameType] = useState(null); // 'battleship' etc
    const [arcadeInteraction, setArcadeInteraction] = useState(null); // { machine, prompt, gameType }
    
    // Penguin Creator Overlay State (for in-game wardrobe)
    const [penguinCreatorOpen, setPenguinCreatorOpen] = useState(false);
    
    // Lord Fishnu Interaction State
    const [lordFishnuInteraction, setLordFishnuInteraction] = useState(null); // { canPayRespects, prompt }
    const lordFishnuCooldownRef = useRef(false); // Prevent spam
    
    // Bench Sitting State
    const [seatedOnBench, setSeatedOnBench] = useState(null); // { benchId, snapPoint, worldPos }
    const seatedRef = useRef(null); // For game loop access
    
    // Mobile State
    const [isMobile, setIsMobile] = useState(false);
    const [isLandscape, setIsLandscape] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [showDebugPosition, setShowDebugPosition] = useState(false);
    const showDebugPositionRef = useRef(false);
    const [debugPosition, setDebugPosition] = useState({ x: 0, y: 0, z: 0, offsetX: 0, offsetZ: 0 });
    const [showCollisionDebug, setShowCollisionDebug] = useState(false);
    
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
                } catch (e) {
                    // Ignore position save errors
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
        
        // Initialize Gake candle trail system (green trading candles)
        gakeCandleTrailSystemRef.current = new GakeCandleTrailSystem(THREE, scene);
        
        // Initialize mount trail system (icy trails, etc.)
        mountTrailSystemRef.current = new MountTrailSystem(THREE, scene);
        
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
        // Apple devices (Mac + iOS) need optimizations for WebGL-via-Metal issues on Safari
        // Android gets mobile optimizations too
        // Windows/Linux desktop can handle full quality
        const needsOptimization = isAppleDevice || isAndroidDevice;
        
        const rendererOptions = {
            antialias: !needsOptimization, // Apple/Android: false (big perf gain), PC: true
            powerPreference: 'high-performance',
            depth: true
        };
        
        // Apple/Android: lower precision for faster shader math and Metal compatibility
        if (needsOptimization) {
            rendererOptions.precision = 'mediump';
            rendererOptions.stencil = false;
        }
        
        const renderer = new THREE.WebGLRenderer(rendererOptions);
        
        // Apple/Android: DPR capped at 1.0 (renders at native resolution, not 2x/3x)
        // This is the BIGGEST performance win - Retina/high-DPR renders 4-9x more pixels
        // PC: allow up to 2x for crisp visuals
        const dpr = needsOptimization ? Math.min(window.devicePixelRatio, 1.0) : Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Apple/Android: flat rendering (faster), fixes Metal rendering issues
        if (needsOptimization) {
            renderer.toneMapping = THREE.NoToneMapping;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            if (isAndroidDevice) {
                console.log('🤖 Android device detected - applied GPU optimizations: antialias=false, dpr=1.0, mediump precision');
            } else if (isMacDesktop) {
                console.log('🍎 Mac desktop detected - applied Metal/Safari optimizations: antialias=false, dpr=1.0, mediump precision, flat rendering');
            } else {
                console.log('🍎 iOS device detected - applied GPU optimizations: antialias=false, dpr=1.0, mediump precision');
            }
        }
        
        // Shadows: Apple/Android gets BasicShadowMap (fastest), PC gets PCFShadowMap (better quality)
        renderer.shadowMap.enabled = true;
        if (needsOptimization) {
            renderer.shadowMap.type = THREE.BasicShadowMap;
            console.log('📱 Apple/Android: Using BasicShadowMap for better performance');
        } else {
            renderer.shadowMap.type = THREE.PCFShadowMap;
        }
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        // Initialize raycaster for player click detection
        raycasterRef.current = new THREE.Raycaster();
        
        const clock = new THREE.Clock();
        clockRef.current = clock;

        // Controls - OrbitControls for traditional drag-to-rotate and scroll-to-zoom
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;  // Smooth damping
        controls.minDistance = 5;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 2 - 0.1; // Initial value - dynamically updated by CameraController based on player elevation
        controls.minPolarAngle = 0.02;              // Allow looking almost straight up when zoomed in
        controls.enablePan = false;
        controls.rotateSpeed = 0.5;     // Slower rotation for smoother feel
        controls.zoomSpeed = 0.8;       // Smooth zoom
        controlsRef.current = controls;
        
        // Initialize smooth camera controller (works alongside OrbitControls)
        const cameraController = new CameraController(THREE, camera, controls);
        cameraControllerRef.current = cameraController;
        
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
        // Apple (Mac + iOS) + Android: 512 shadow map (faster), PC: 1024 (better quality)
        const shadowMapSize = needsOptimization ? 512 : 1024;
        sunLight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.bias = -0.0005; // Reduce shadow acne
        scene.add(sunLight);
        sunLightRef.current = sunLight;
        
        // ==================== SNOWFALL PARTICLE SYSTEM ====================
        // Apple (Mac + iOS) + Android: use reduced particles for performance
        const snowfallSystem = new SnowfallSystem(THREE, scene, { isMobileGPU: needsOptimization });
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
            
            // Add casino as snow exclusion zone (snow shouldn't fall inside)
            if (townCenter.casinoBounds && snowfallSystemRef.current) {
                snowfallSystemRef.current.addExclusionZone({
                    ...townCenter.casinoBounds,
                    roofHeight: 14 // Casino roof height
                });
                console.log('❄️ Added casino as snow exclusion zone');
            }
            
            // ==================== ICE FISHING SYSTEM ====================
            // Initialize fishing system with spots from TownCenter
            if (townCenter.fishingSpots && townCenter.fishingSpots.length > 0) {
                if (!iceFishingSystemRef.current) {
                    iceFishingSystemRef.current = new IceFishingSystem(THREE, scene);
                }
                iceFishingSystemRef.current.initForTown(townCenter.fishingSpots, scene);
                // Set players ref for positioning catch bubbles above players
                iceFishingSystemRef.current.setPlayersRef(() => playersDataRef.current);
            }
            
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
            // Use igloo data from IglooContext if available
            iglooData.forEach((igloo, index) => {
                // Get server-side igloo state if available
                const serverIglooData = getIgloo ? getIgloo(igloo.id) : null;
                const sprite = createIglooOccupancySprite(THREE, 0, index, serverIglooData); // Pass igloo state
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
            
            // ==================== LORD FISHNU LORE SPRITE ====================
            // Create lore banner above the holy fish sculpture
            if (lordFishnuSpriteRef.current) {
                scene.remove(lordFishnuSpriteRef.current);
            }
            
            const fishnuCanvas = document.createElement('canvas');
            const fw = 400;
            const fh = 280;
            fishnuCanvas.width = fw;
            fishnuCanvas.height = fh;
            const fctx = fishnuCanvas.getContext('2d');
            
            // Clear
            fctx.clearRect(0, 0, fw, fh);
            
            // Draw fish-styled banner background
            const cornerRadius = 20;
            const gradient = fctx.createLinearGradient(0, 0, 0, fh);
            gradient.addColorStop(0, 'rgba(0, 60, 100, 0.95)');
            gradient.addColorStop(0.5, 'rgba(0, 40, 80, 0.95)');
            gradient.addColorStop(1, 'rgba(0, 20, 60, 0.95)');
            
            fctx.beginPath();
            fctx.moveTo(cornerRadius, 0);
            fctx.lineTo(fw - cornerRadius, 0);
            fctx.quadraticCurveTo(fw, 0, fw, cornerRadius);
            fctx.lineTo(fw, fh - cornerRadius);
            fctx.quadraticCurveTo(fw, fh, fw - cornerRadius, fh);
            fctx.lineTo(cornerRadius, fh);
            fctx.quadraticCurveTo(0, fh, 0, fh - cornerRadius);
            fctx.lineTo(0, cornerRadius);
            fctx.quadraticCurveTo(0, 0, cornerRadius, 0);
            fctx.closePath();
            fctx.fillStyle = gradient;
            fctx.fill();
            
            // Golden border
            fctx.strokeStyle = '#FFD700';
            fctx.lineWidth = 4;
            fctx.stroke();
            
            // Inner glow border
            fctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
            fctx.lineWidth = 2;
            fctx.beginPath();
            fctx.moveTo(cornerRadius + 8, 8);
            fctx.lineTo(fw - cornerRadius - 8, 8);
            fctx.quadraticCurveTo(fw - 8, 8, fw - 8, cornerRadius + 8);
            fctx.lineTo(fw - 8, fh - cornerRadius - 8);
            fctx.quadraticCurveTo(fw - 8, fh - 8, fw - cornerRadius - 8, fh - 8);
            fctx.lineTo(cornerRadius + 8, fh - 8);
            fctx.quadraticCurveTo(8, fh - 8, 8, fh - cornerRadius - 8);
            fctx.lineTo(8, cornerRadius + 8);
            fctx.quadraticCurveTo(8, 8, cornerRadius + 8, 8);
            fctx.closePath();
            fctx.stroke();
            
            // Fish emoji decorations
            fctx.font = '20px Arial';
            fctx.textAlign = 'center';
            fctx.fillText('🐟', 25, 28);
            fctx.fillText('🐟', fw - 25, 28);
            fctx.fillText('🐠', 25, fh - 18);
            fctx.fillText('🐠', fw - 25, fh - 18);
            
            // Title
            fctx.font = 'bold 28px Georgia, serif';
            fctx.textAlign = 'center';
            fctx.textBaseline = 'middle';
            fctx.fillStyle = '#FFD700';
            fctx.shadowColor = '#000';
            fctx.shadowBlur = 4;
            fctx.shadowOffsetX = 2;
            fctx.shadowOffsetY = 2;
            fctx.fillText('⚜️ LORD FISHNU ⚜️', fw / 2, 38);
            
            // Subtitle
            fctx.font = 'italic 14px Georgia, serif';
            fctx.fillStyle = '#87CEEB';
            fctx.shadowBlur = 2;
            fctx.fillText('Guardian of the Frozen Seas', fw / 2, 62);
            
            // Lore text
            fctx.shadowBlur = 0;
            fctx.shadowOffsetX = 0;
            fctx.shadowOffsetY = 0;
            fctx.font = '12px Arial';
            fctx.fillStyle = '#E0E0E0';
            fctx.textAlign = 'left';
            
            const loreLines = [
                'In the Great Thaw of Year 42, when the',
                'Shark Armies besieged Waddle Island,',
                'Lord Fishnu rose from the depths to',
                'defend our beloved land.',
                '',
                'With his Divine Tail Slap, he scattered',
                'a thousand predators. His golden eyes',
                'see all who trade with pure hearts.',
                '',
                '🌊 "May your bags pump eternal" 🌊',
            ];
            
            loreLines.forEach((line, i) => {
                if (line.includes('🌊')) {
                    fctx.font = 'italic 13px Georgia, serif';
                    fctx.fillStyle = '#FFD700';
                    fctx.textAlign = 'center';
                    fctx.fillText(line, fw / 2, 90 + i * 17);
                } else {
                    fctx.font = '12px Arial';
                    fctx.fillStyle = '#E0E0E0';
                    fctx.textAlign = 'left';
                    fctx.fillText(line, 25, 90 + i * 17);
                }
            });
            
            const fishnuTexture = new THREE.CanvasTexture(fishnuCanvas);
            const fishnuMaterial = new THREE.SpriteMaterial({ 
                map: fishnuTexture, 
                depthTest: false, 
                depthWrite: false,
                transparent: true
            });
            const fishnuSprite = new THREE.Sprite(fishnuMaterial);
            
            // Position above Lord Fishnu statue
            const fishnuStatueX = townCenterX - 52.5;
            const fishnuStatueZ = townCenterZ + 54.7;
            fishnuSprite.position.set(fishnuStatueX, 12, fishnuStatueZ);
            
            // Scale the sprite
            const fscale = 0.03;
            fishnuSprite.scale.set(fw * fscale, fh * fscale, 1);
            fishnuSprite.renderOrder = 998;
            fishnuSprite.visible = false; // Start hidden, show when player is close
            
            scene.add(fishnuSprite);
            lordFishnuSpriteRef.current = fishnuSprite;
            console.log('🐟 Created Lord Fishnu lore sprite');
            
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
        } else if (room === 'casino_game_room') {
            // Generate casino game room interior
            const casinoRoom = new CasinoRoom(THREE);
            casinoRoom.spawn(scene);
            casinoRoomRef.current = casinoRoom;
            roomData = casinoRoom.getRoomData();
            
            // Initialize slot machine system
            if (!slotMachineSystemRef.current && sceneRef.current) {
                slotMachineSystemRef.current = new SlotMachineSystem(THREE, sceneRef.current);
            }
            if (slotMachineSystemRef.current) {
                slotMachineSystemRef.current.initForCasino(roomData.roomWidth, roomData.roomDepth, sceneRef.current);
            }
            
            // Initialize jackpot celebration system (disco ball, confetti, lasers)
            if (!jackpotCelebrationRef.current && sceneRef.current) {
                jackpotCelebrationRef.current = new JackpotCelebration(
                    THREE, 
                    sceneRef.current, 
                    roomData.roomWidth, 
                    roomData.roomDepth, 
                    roomData.roomHeight || 20
                );
            }
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
                bubblegum: null,
                // Animated skin colors (cosmic, galaxy, rainbow, nebula)
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
            
            // Animated skin colors (cosmic, galaxy, rainbow, nebula)
            // Each body part has a phase offset for a flowing galaxy effect
            if (cache.animatedSkin && cache.animatedSkin.materials && cache.animatedSkin.materials.length > 0) {
                const skinConfig = cache.animatedSkin.config;
                if (skinConfig && skinConfig.colors) {
                    const baseT = time * skinConfig.speed;
                    const colorCount = skinConfig.colors.length;
                    
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
                        const starScale = baseScale * (0.8 + twinkleNorm * 0.4);
                        star.scale.setScalar(starScale);
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
                // Ignore position load errors
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
        // AI DISABLED FOR PERFORMANCE - set to true to re-enable
        const AI_ENABLED = false;
        
        if (AI_ENABLED && aiAgentsRef.current.length === 0) {
            // First time - create AI agents
            AI_NAMES.forEach((name, i) => {
                const skins = Object.keys(PALETTE).filter(k => !['floorLight','floorDark','wood','rug','glass','beerGold','mirrorFrame','mirrorGlass', 'asphalt', 'roadLine', 'buildingBrickRed', 'buildingBrickYellow', 'buildingBrickBlue', 'windowLight', 'windowDark', 'grass', 'snow', 'water', 'waterDeep', 'butterfly1', 'butterfly2', 'butterfly3'].includes(k));
                const hats = Object.keys(ASSETS.HATS);
                // Filter out exclusive items like "joe" (invisible body) from AI clothing
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
                    actionTimer: Date.now() + 2000 + Math.random() * 5000, // Stagger initial actions
                    emoteType: null,
                    emoteStart: 0,
                    bubble: null,
                    bubbleTimer: 0,
                    roomTransitionCooldown: Date.now() + 10000 + Math.random() * 20000, // Initial room stability
                    stuckCounter: 0,
                    lastRoomChange: Date.now()
                });
            });
        } else if (AI_ENABLED) {
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
        
        // --- BLACKJACK DEALER PENGUINS (Casino Game Room only) ---
        if (room === 'casino_game_room' && roomData?.blackjackDealers) {
            blackjackDealersRef.current = [];
            
            roomData.blackjackDealers.forEach((dealerPos, idx) => {
                const dealerData = {
                    skin: 'black',
                    hat: 'tophat',
                    eyes: 'cool',
                    mouth: 'beak',
                    bodyItem: 'bowtie'
                };
                const dealerMesh = buildPenguinMesh(dealerData);
                // Slightly larger dealer penguins
                dealerMesh.scale.set(1.1, 1.1, 1.1);
                dealerMesh.position.set(dealerPos.x, 0.05, dealerPos.z);
                dealerMesh.rotation.y = dealerPos.rotation;
                dealerMesh.name = `blackjack_dealer_${dealerPos.tableId}`;
                dealerMesh.userData.tableId = dealerPos.tableId;
                dealerMesh.userData.tableX = dealerPos.tableX;
                dealerMesh.userData.tableZ = dealerPos.tableZ;
                scene.add(dealerMesh);
                
                blackjackDealersRef.current.push(dealerMesh);
                console.log(`🎰 Blackjack dealer spawned at table ${dealerPos.tableId}`);
            });
        }

        // --- WAGERBOT NPC (Town only, Development mode) ---
        // Static NPC for testing token wagering - challenge this bot to test wagers
        const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';
        if (room === 'town' && isDev) {
            const wagerBotData = {
                characterType: 'doginal',
                skin: 'purple',
                hat: 'none',
                eyes: 'none',
                mouth: 'none',
                bodyItem: 'none',
                dogPrimaryColor: '#D2691E',
                dogSecondaryColor: '#8B4513'
            };
            const wagerBotMesh = buildPenguinMesh(wagerBotData);
            // Slightly bigger than normal penguins to stand out
            wagerBotMesh.scale.set(1.15, 1.15, 1.15);
            // Position near spawn (visible when entering town)
            wagerBotMesh.position.set(105, 0, 100);
            wagerBotMesh.name = 'wagerbot_npc';
            wagerBotMesh.userData.isWagerBot = true; // Mark for click detection
            scene.add(wagerBotMesh);
            wagerBotMeshRef.current = wagerBotMesh; // Store ref for click detection
            
            // Add floating name tag above bot
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.roundRect(0, 0, 256, 64, 8);
            ctx.fill();
            ctx.fillStyle = '#00FF88';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🤖 WagerBot', 128, 40);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(4, 1, 1);
            sprite.position.set(105, 5, 100); // Above the bot
            sprite.name = 'wagerbot_label';
            scene.add(sprite);
            
            console.log('🤖 WagerBot NPC spawned at (105, 0, 100) in town - DEV MODE');
        } else {
            wagerBotMeshRef.current = null; // Clear ref if not in town/dev
        }

        // --- INPUT HANDLING ---
        const handleDown = (e) => {
            const activeElement = document.activeElement;
            const isInputFocused = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
            
            // Handle Escape key for any input
            if (isInputFocused && e.code === 'Escape') {
                activeElement.blur();
                return;
            }
            
            // Handle Enter and Slash keys to open chat
            // Only handle Slash if Shift is NOT pressed (to allow "?" to be typed)
            if (e.code === 'Enter' || (e.code === 'Slash' && !e.shiftKey)) {
                const chatInput = document.getElementById('chat-input-field');
                if (chatInput) {
                    // If chat input is already focused:
                    // - Enter sends message (normal behavior, don't prevent default)
                    // - Slash should be typed as a character (don't prevent default, don't refocus)
                    if (activeElement === chatInput) {
                        if (e.code === 'Enter') {
                            // Don't prevent default - let Enter send message
                            return;
                        }
                        if (e.code === 'Slash') {
                            // Don't prevent default - let "/" be typed in the input
                            return;
                        }
                    }
                    // If another input is focused, don't interfere
                    if (isInputFocused && activeElement !== chatInput) {
                        return;
                    }
                    // Otherwise, focus chat input (both Enter and Slash do this when NOT already focused)
                    chatInput.focus();
                    // Prevent "/" from being typed when opening chat (only if not Shift+Slash)
                    if (e.code === 'Slash' && !e.shiftKey) {
                        e.preventDefault();
                    }
                    return; // Don't process movement keys when opening chat
                }
            }
            
            // Don't process game keys if an input is focused
            if (isInputFocused) {
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

            // NOTE: E key for portal entry is handled in a separate useEffect (search: "Handle E key for portal entry")
            // This ensures proper dependency tracking and avoids duplicate handlers
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
        
        // OPTIMIZATION: Cache device detection outside loop (runs once, not every frame)
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const rotSpeedMultiplier = isMobileDevice ? 2 : 4.5;
        
        // OPTIMIZATION: Pre-calculate constants
        const MAX_DELTA = 0.1;
        const BASE_SPEED = 10;
        const TERMINAL_VELOCITY = -25;
        
        const update = () => {
            reqRef.current = requestAnimationFrame(update);
            frameCount++;
            
            let delta = clock.getDelta();
            const time = clock.getElapsedTime(); 
            
            // CRITICAL: Clamp delta to prevent physics issues when tab loses focus
            if (delta > MAX_DELTA) {
                delta = MAX_DELTA;
            }
            
            // Base speed with mount speed boost (pengu mount gives 5% boost)
            let speed = BASE_SPEED * delta;
            const mountData = playerRef.current?.userData?.mountData;
            if (mountData?.speedBoost && mountEnabledRef.current) {
                speed *= mountData.speedBoost;
            }
            // Apply mount trail effects (icy = speed boost + slippery)
            if (mountTrailSystemRef.current) {
                speed *= mountTrailSystemRef.current.getSpeedMultiplier();
            }
            const rotSpeed = rotSpeedMultiplier * delta;
            let moving = false;
            
            // Jump physics constants
            const GRAVITY = 30;
            const JUMP_VELOCITY = 12;
            const GROUND_Y = 0;
            
            // Check keyboard input (disabled during P2P match)
            const inMatch = isInMatchRef.current;
            // WASD for player movement, Arrow keys for camera rotation
            const keyForward = !inMatch && keysRef.current['KeyW'];
            const keyBack = !inMatch && keysRef.current['KeyS'];
            const keyLeft = !inMatch && keysRef.current['KeyA'];
            const keyRight = !inMatch && keysRef.current['KeyD'];
            const keyJump = !inMatch && keysRef.current['Space'];
            
            // Arrow keys rotate camera (horizontal only)
            const arrowLeft = !inMatch && keysRef.current['ArrowLeft'];
            const arrowRight = !inMatch && keysRef.current['ArrowRight'];
            
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
            
            // Apply camera controller inputs
            const camController = cameraControllerRef.current;
            const camSensitivity = gameSettingsRef.current?.cameraSensitivity || 0.3;
            
            // Arrow key camera rotation
            if (camController && !inMatch) {
                const arrowDir = (arrowLeft ? 1 : 0) - (arrowRight ? 1 : 0);
                camController.applyArrowKeyRotation(arrowDir);
            }
            
            // Touch/mouse camera rotation
            const camDelta = cameraRotationRef.current;
            if (camDelta.deltaX !== 0 || camDelta.deltaY !== 0) {
                if (camController && !inMatch) {
                    camController.applyRotationInput(camDelta.deltaX, camDelta.deltaY, camSensitivity * 2);
                }
                cameraRotationRef.current = { deltaX: 0, deltaY: 0 };
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
            if (velRef.current.y < TERMINAL_VELOCITY) velRef.current.y = TERMINAL_VELOCITY;
            
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
            
            // Clear Fishnu respect message when movement is detected
            if (anyMovementInput && isFishnuRespectRef.current) {
                isFishnuRespectRef.current = false;
                fishnuRespectMessageRef.current = null;
                // Remove the bubble
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
                    // Apply friction (slippery on icy trails)
                    const friction = mountTrailSystemRef.current?.getFrictionMultiplier() ?? 1.0;
                    if (friction < 1.0) {
                        // Slippery - gradual slowdown
                        velRef.current.x *= friction;
                        velRef.current.z *= friction;
                        // Stop completely when very slow
                        if (Math.abs(velRef.current.x) < 0.01) velRef.current.x = 0;
                        if (Math.abs(velRef.current.z) < 0.01) velRef.current.z = 0;
                    } else {
                        velRef.current.x = 0;
                        velRef.current.z = 0;
                    }
                }
                }
                // === AIR MOVEMENT ===
                // In air: allow movement in facing direction with proper momentum
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
                    } else {
                        // No input in air - apply air momentum with CURRENT delta
                        // This prevents lag spikes from causing massive forward movement
                        // Get the direction of current velocity and re-apply with current delta
                        const currentVelMag = Math.sqrt(velRef.current.x * velRef.current.x + velRef.current.z * velRef.current.z);
                        if (currentVelMag > 0.01) {
                            // Normalize direction, apply BASE_SPEED * current delta
                            // This maintains momentum direction but uses correct delta timing
                            const airMomentumSpeed = BASE_SPEED * delta * 0.9; // 90% of ground speed for air drag
                            velRef.current.x = (velRef.current.x / currentVelMag) * airMomentumSpeed;
                            velRef.current.z = (velRef.current.z / currentVelMag) * airMomentumSpeed;
                        }
                        // If velocity was basically zero, keep it zero
                    }
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
            } else if (roomRef.current === 'casino_game_room' && casinoRoomRef.current) {
                // Casino room collision - handled by CasinoRoom.js (same pattern as Nightclub)
                const result = casinoRoomRef.current.checkPlayerMovement(
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
            
            // Casino room furniture interactions (bar stools, couches, chairs)
            if (roomRef.current === 'casino_game_room' && roomDataRef.current?.furniture) {
                const px = posRef.current.x;
                const pz = posRef.current.z;
                const py = posRef.current.y;
                
                // Only check when on ground level (not standing on furniture)
                if (py < 1.5) {
                    let foundSeat = null;
                    let closestDist = 2.0; // Interaction radius
                    
                    for (const seat of roomDataRef.current.furniture) {
                        const dx = px - seat.position.x;
                        const dz = pz - seat.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        
                        // For couches with snap points, check distance to each snap point
                        if (seat.snapPoints && seat.snapPoints.length > 0) {
                            const cos = Math.cos(seat.rotation || 0);
                            const sin = Math.sin(seat.rotation || 0);
                            for (const snap of seat.snapPoints) {
                                // Transform snap point by couch rotation
                                const snapWorldX = seat.position.x + snap.x * cos - snap.z * sin;
                                const snapWorldZ = seat.position.z + snap.x * sin + snap.z * cos;
                                const snapDx = px - snapWorldX;
                                const snapDz = pz - snapWorldZ;
                                const snapDist = Math.sqrt(snapDx * snapDx + snapDz * snapDz);
                                if (snapDist < closestDist) {
                                    closestDist = snapDist;
                                    foundSeat = {
                                        ...seat,
                                        // Override position with snap point
                                        snapPosition: { x: snapWorldX, z: snapWorldZ }
                                    };
                                }
                            }
                        } else if (dist < closestDist) {
                            closestDist = dist;
                            foundSeat = seat;
                        }
                    }
                    
                    if (foundSeat) {
                        const seatType = foundSeat.type === 'stool' ? 'bar stool' : 
                                        foundSeat.type === 'couch' ? 'couch' : 'chair';
                        const seatX = foundSeat.snapPosition ? foundSeat.snapPosition.x : foundSeat.position.x;
                        const seatZ = foundSeat.snapPosition ? foundSeat.snapPosition.z : foundSeat.position.z;
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: {
                                action: 'sit',
                                emote: 'Sit',
                                data: {
                                    worldX: seatX,
                                    worldZ: seatZ,
                                    worldRotation: foundSeat.faceAngle || foundSeat.rotation || 0,
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
            
            if (roomRef.current !== 'town' && roomRef.current !== 'pizza' && roomRef.current !== 'nightclub' && roomRef.current !== 'casino_game_room') {
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
                
                // Check town furniture proximity for interaction (roof couch, park benches)
                // Also check casino furniture (stools, couch on 2nd floor)
                let nearFurniture = null;
                const playerY = posRef.current.y;
                
                // First check regular town furniture
                if (roomData && roomData.furniture) {
                    for (const furn of roomData.furniture) {
                        const dx = finalX - furn.position.x;
                        const dz = finalZ - furn.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        // Only interact if player is at the right height (on the roof)
                        const furnY = furn.platformHeight || 0;
                        const yMatch = Math.abs(playerY - furnY) < 2; // Within 2 units height
                        if (dist < furn.interactionRadius && yMatch) {
                            nearFurniture = furn;
                            break;
                        }
                    }
                }
                
                // Then check casino furniture (elevated on 2nd floor)
                if (!nearFurniture && townCenterRef.current) {
                    const casinoFurniture = townCenterRef.current.getCasinoFurniture();
                    for (const furn of casinoFurniture) {
                        const dx = finalX - furn.position.x;
                        const dz = finalZ - furn.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        // Casino furniture is elevated - check player is on 2nd floor
                        const furnY = furn.seatHeight - 1.0; // Platform is ~1 below seat
                        const yMatch = Math.abs(playerY - furnY) < 2;
                        if (dist < furn.interactionRadius && yMatch) {
                            nearFurniture = furn;
                            break;
                        }
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
                                platformHeight: nearFurniture.platformHeight || (nearFurniture.seatHeight - 1.0),
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
            } else if (!collided) {
                // Fallback: only move if no collision
                posRef.current.x = nextX;
                posRef.current.z = nextZ;
            }
            
            // Apply Y velocity (jumping/falling)
            // Clamp maximum fall distance per frame to prevent clipping through surfaces
            const yDelta = velRef.current.y * delta;
            const MAX_FALL_PER_FRAME = 2.0; // Maximum 2 units fall per frame
            posRef.current.y += Math.max(yDelta, -MAX_FALL_PER_FRAME);
            
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
            
            // Check for landing on casino room furniture (uses room's landingSurfaces)
            if (room === 'casino_game_room' && roomDataRef.current?.landingSurfaces && velRef.current.y <= 0) {
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
                // Triggers for wizardHat equipped OR doginal character (who always has wizard hat)
                const hasWizardHat = penguinData?.hat === 'wizardHat' || penguinData?.characterType === 'doginal';
                if (hasWizardHat && wizardTrailSystemRef.current) {
                    wizardTrailSystemRef.current.getOrCreatePool('localPlayer');
                    wizardTrailSystemRef.current.update('localPlayer', playerRef.current.position, moving, time, delta);
                }
                
                // --- GAKE CHARACTER GREEN CANDLE TRAIL ---
                // Triggers for Gake character (green trading candles sprout from ground)
                const isGake = penguinData?.characterType === 'gake';
                if (isGake && gakeCandleTrailSystemRef.current) {
                    gakeCandleTrailSystemRef.current.getOrCreatePool('localPlayer');
                    gakeCandleTrailSystemRef.current.update('localPlayer', playerRef.current.position, moving, time, delta);
                }
                
                // --- SLOT MACHINE SYSTEM (spectator bubbles) ---
                if (slotMachineSystemRef.current) {
                    // Pass player position for distance-based culling optimization
                    slotMachineSystemRef.current.setPlayerPosition(
                        playerRef.current.position.x,
                        playerRef.current.position.z
                    );
                    slotMachineSystemRef.current.update(time, delta);
                }
                
                // --- JACKPOT CELEBRATION (disco ball, confetti, lasers) ---
                if (jackpotCelebrationRef.current) {
                    jackpotCelebrationRef.current.update(time, delta);
                }
                
                // --- MOUNT TRAIL SYSTEM (Icy trails, etc.) ---
                if (mountTrailSystemRef.current) {
                    const isMountedWithTrail = playerRef.current.userData?.mount && 
                                               playerRef.current.userData?.mountData && 
                                               mountEnabledRef.current &&
                                               MountTrailSystem.mountHasTrail(playerRef.current.userData.mount);
                    
                    // Only draw trail when on ground (not airborne) and moving
                    const isOnGround = !isAirborne && posRef.current.y < 0.1;
                    if (isMountedWithTrail && moving && isOnGround) {
                        mountTrailSystemRef.current.updateFromMount(
                            'local',
                            posRef.current.x,
                            posRef.current.z,
                            playerRef.current.userData.mount,
                            moving
                        );
                    }
                    
                    // Update trail system (fade trails, check effects)
                    // Note: 'time' from clock.getElapsedTime() is used for consistent timing
                    mountTrailSystemRef.current.update(time * 1000, { x: posRef.current.x, z: posRef.current.z });
                }
                
                // --- MOUNT ANIMATION ---
                // Animate mount when player is moving (only if mount is enabled)
                if (playerRef.current.userData?.mount && playerRef.current.userData?.mountData?.animated && mountEnabledRef.current) {
                    const mountGroup = playerRef.current.getObjectByName('mount');
                    const mountData = playerRef.current.userData.mountData;
                    
                    if (mountGroup) {
                        // Pengu mount waddle animation
                        if (mountData.animationType === 'penguin_waddle') {
                            const leftFlipper = mountGroup.getObjectByName('left_flipper');
                            const rightFlipper = mountGroup.getObjectByName('right_flipper');
                            const leftFoot = mountGroup.getObjectByName('left_foot');
                            const rightFoot = mountGroup.getObjectByName('right_foot');
                            
                            if (moving) {
                                const waddleSpeed = 10;
                                const flapAmount = Math.sin(time * waddleSpeed) * 0.8; // Y offset for flapping
                                
                                // Flippers flap up and down (Y axis) - opposite of each other
                                if (leftFlipper) leftFlipper.position.y = flapAmount;
                                if (rightFlipper) rightFlipper.position.y = -flapAmount;
                                
                                // Feet paddle up and down (Y axis) - opposite of flippers
                                if (leftFoot) leftFoot.position.y = -flapAmount * 0.6;
                                if (rightFoot) rightFoot.position.y = flapAmount * 0.6;
                                
                                // Waddle the whole mount side to side and bob up/down
                                mountGroup.rotation.z = Math.sin(time * waddleSpeed) * 0.06;
                                mountGroup.position.y = 0.65 + Math.abs(Math.sin(time * waddleSpeed * 0.5)) * 0.08;
                            } else {
                                // Return to rest position smoothly
                                if (leftFlipper) leftFlipper.position.y *= 0.85;
                                if (rightFlipper) rightFlipper.position.y *= 0.85;
                                if (leftFoot) leftFoot.position.y *= 0.85;
                                if (rightFoot) rightFoot.position.y *= 0.85;
                                mountGroup.rotation.z *= 0.9;
                                mountGroup.position.y = 0.65 + (mountGroup.position.y - 0.65) * 0.9;
                            }
                        }
                        // Boat rowing animation
                        else {
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

            // ==================== OTHER PLAYERS UPDATE (60fps in game loop) ====================
            const otherMeshes = otherPlayerMeshesRef.current;
            const playersData = playersDataRef.current;
            const lerpFactor = calculateLerpFactor(delta, 10);
            const yLerpFactor = calculateLerpFactor(delta, 15);
            
            // OPTIMIZATION: Cache local player position for distance checks
            const localPosX = posRef.current?.x || 0;
            const localPosZ = posRef.current?.z || 0;
            const DISTANT_PLAYER_THRESHOLD_SQ = 50 * 50; // 50 units = distant
            
            for (const [id, meshData] of otherMeshes) {
                const playerData = playersData.get(id);
                if (!playerData || !meshData.mesh) continue;
                
                // Rebuild mesh if appearance changed
                if (playerData.needsMeshRebuild && buildPenguinMeshRef.current) {
                    console.log(`🔄 Rebuilding mesh for ${playerData.name} due to appearance change`);
                    
                    // Store current position and rotation
                    const currentPos = meshData.mesh.position.clone();
                    const currentRot = meshData.mesh.rotation.y;
                    
                    // Store nametag and other attachments
                    const nameSprite = meshData.nameSprite;
                    const bubble = meshData.bubble;
                    const goldRainSystem = meshData.goldRainSystem;
                    
                    // Remove old mesh from scene
                    scene.remove(meshData.mesh);
                    
                    // Build new mesh with updated appearance
                    const newMesh = buildPenguinMeshRef.current(playerData.appearance);
                    newMesh.position.copy(currentPos);
                    newMesh.rotation.y = currentRot;
                    scene.add(newMesh);
                    
                    // Reattach nametag
                    if (nameSprite) {
                        newMesh.add(nameSprite);
                    }
                    
                    // Reattach bubble if it exists
                    if (bubble) {
                        newMesh.add(bubble);
                    }
                    
                    // Hide mount if player has mountEnabled set to false
                    if (playerData.appearance?.mountEnabled === false) {
                        const mountGroup = newMesh.getObjectByName('mount');
                        if (mountGroup) {
                            mountGroup.visible = false;
                            newMesh.userData.mountVisible = false;
                        }
                    }
                    
                    // Update mesh reference
                    meshData.mesh = newMesh;
                    
                    // Update animated cosmetics flag
                    const appearance = playerData.appearance || {};
                    // Animated skin colors (cosmic, galaxy, rainbow, prismatic, nebula)
                    const animatedSkins = ['cosmic', 'galaxy', 'rainbow', 'prismatic', 'nebula'];
                    meshData.hasAnimatedCosmetics = appearance.hat === 'propeller' || 
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
                                                     appearance.bodyItem === 'lightningAura' ||
                                                     animatedSkins.includes(appearance.skin);
                    
                    // Clear the rebuild flag
                    playerData.needsMeshRebuild = false;
                    
                    // Clear animated parts cache so it gets rebuilt
                    if (newMesh.userData._animatedPartsCache) {
                        delete newMesh.userData._animatedPartsCache;
                    }
                }
                
                // OPTIMIZATION: Calculate distance to local player
                const dx = (playerData.position?.x || 0) - localPosX;
                const dz = (playerData.position?.z || 0) - localPosZ;
                const distSq = dx * dx + dz * dz;
                const isDistant = distSq > DISTANT_PLAYER_THRESHOLD_SQ;
                
                // Check if player is seated - if so, handle position differently
                const isSeated = playerData.seatedOnFurniture || 
                                (meshData.currentEmote === 'Sit' && playerData.emote === 'Sit');
                
                // Position interpolation
                if (playerData.position) {
                    if (isSeated) {
                        // When seated, snap to the seat position immediately (no interpolation)
                        // This ensures the player appears on the bench for other clients
                        meshData.mesh.position.x = playerData.position.x;
                        meshData.mesh.position.z = playerData.position.z;
                        meshData.mesh.position.y = playerData.position.y ?? 0;
                    } else {
                        // Normal interpolation when walking
                        meshData.mesh.position.x = lerp(meshData.mesh.position.x, playerData.position.x, lerpFactor);
                        meshData.mesh.position.z = lerp(meshData.mesh.position.z, playerData.position.z, lerpFactor);
                        meshData.mesh.position.y = lerp(meshData.mesh.position.y, playerData.position.y ?? 0, yLerpFactor);
                    }
                }
                
                // Rotation interpolation
                if (playerData.rotation !== undefined) {
                    if (isSeated) {
                        // Snap rotation when seated
                        meshData.mesh.rotation.y = playerData.rotation;
                    } else {
                        meshData.mesh.rotation.y = lerpRotation(meshData.mesh.rotation.y, playerData.rotation, lerpFactor);
                    }
                }
                
                // Handle puffle creation/removal dynamically
                if (playerData.needsPuffleUpdate) {
                    playerData.needsPuffleUpdate = false;
                    
                    // Remove old puffle mesh if exists
                    if (meshData.puffleMesh) {
                        scene.remove(meshData.puffleMesh);
                        meshData.puffleMesh = null;
                    }
                    
                    // Create new puffle if player has one
                    if (playerData.puffle) {
                        console.log(`🐾 Creating puffle for ${playerData.name}: ${playerData.puffle.color}`);
                        const puffleInstance = new Puffle({
                            color: playerData.puffle.color,
                            name: playerData.puffle.name
                        });
                        meshData.puffleMesh = puffleInstance.createMesh(THREE);
                        const pufflePos = playerData.pufflePosition || {
                            x: (playerData.position?.x || 0) + 1.5,
                            z: (playerData.position?.z || 0) + 1.5
                        };
                        meshData.puffleMesh.position.set(pufflePos.x, 0.5, pufflePos.z);
                        scene.add(meshData.puffleMesh);
                    }
                }
                
                // Update puffle position (with fallback to player position offset)
                if (meshData.puffleMesh) {
                    const targetPufflePos = playerData.pufflePosition || {
                        x: (playerData.position?.x || 0) + 1.5,
                        z: (playerData.position?.z || 0) + 1.5
                    };
                    meshData.puffleMesh.position.x = lerp(meshData.puffleMesh.position.x, targetPufflePos.x, lerpFactor);
                    meshData.puffleMesh.position.z = lerp(meshData.puffleMesh.position.z, targetPufflePos.z, lerpFactor);
                    meshData.puffleMesh.position.y = 0.5;
                }
                
                // Handle emotes - sync with playerData
                if (playerData.emote !== meshData.currentEmote) {
                    meshData.currentEmote = playerData.emote;
                    meshData.emoteStartTime = playerData.emoteStartTime || Date.now();
                }
                
                // Auto-end emotes after 3.5 seconds (continuous emotes don't auto-clear)
                const continuousEmotes = ['Sit', 'Breakdance', 'DJ', '67', 'Headbang', 'Dance'];
                if (meshData.currentEmote && !continuousEmotes.includes(meshData.currentEmote)) {
                    const emoteAge = (Date.now() - meshData.emoteStartTime) / 1000;
                    if (emoteAge > 3.5) {
                        meshData.currentEmote = null;
                        playerData.emote = null;
                    }
                }
                
                // Sync mount visibility from appearance updates
                const appearanceMountEnabled = playerData.appearance?.mountEnabled !== false;
                const currentMountVisible = meshData.mesh.userData?.mountVisible !== false;
                if (appearanceMountEnabled !== currentMountVisible) {
                    const mountGroup = meshData.mesh.getObjectByName('mount');
                    if (mountGroup) {
                        mountGroup.visible = appearanceMountEnabled;
                        meshData.mesh.userData.mountVisible = appearanceMountEnabled;
                    }
                }
                
                // OPTIMIZATION: Distant players only animate every 3rd frame (saves ~66% CPU on animations)
                const shouldAnimateThisFrame = !isDistant || (frameCount % 3 === 0);
                
                // Calculate isMoving OUTSIDE the animation block so it's available for mount trails and wizard trails
                // If seated on furniture, never consider as "moving" (prevents walk animation overriding sit)
                const isMoving = !isSeated && playerData.position && (
                    Math.abs(playerData.position.x - meshData.mesh.position.x) > 0.1 ||
                    Math.abs(playerData.position.z - meshData.mesh.position.z) > 0.1
                );
                
                if (shouldAnimateThisFrame) {
                    // Animate other player mesh (walking/emotes)
                    // Consider mount only if it's visible
                    const otherPlayerMounted = !!(meshData.mesh.userData?.mount && meshData.mesh.userData?.mountData && meshData.mesh.userData?.mountVisible !== false);
                    const otherIsAirborne = (playerData.position?.y ?? 0) > 0.1;
                    animateMesh(meshData.mesh, isMoving, meshData.currentEmote, meshData.emoteStartTime, playerData.seatedOnFurniture || false, playerData.appearance?.characterType || 'penguin', otherPlayerMounted, otherIsAirborne, time);
                    
                    // Animate cosmetics for other players with animated items
                    if (meshData.hasAnimatedCosmetics) {
                        if (!meshData.mesh.userData._animatedPartsCache) {
                            meshData.mesh.userData._animatedPartsCache = cacheAnimatedParts(meshData.mesh);
                        }
                        animateCosmeticsFromCache(meshData.mesh.userData._animatedPartsCache, time, delta);
                    }
                }
                
                // Mount animation for other players (also throttled for distant players)
                if (shouldAnimateThisFrame && meshData.mesh.userData?.mount && meshData.mesh.userData?.mountData?.animated) {
                    const mountGroup = meshData.mesh.getObjectByName('mount');
                    const mountData = meshData.mesh.userData.mountData;
                    
                    if (mountGroup) {
                        // Pengu mount waddle animation
                        if (mountData.animationType === 'penguin_waddle') {
                            const leftFlipper = mountGroup.getObjectByName('left_flipper');
                            const rightFlipper = mountGroup.getObjectByName('right_flipper');
                            const leftFoot = mountGroup.getObjectByName('left_foot');
                            const rightFoot = mountGroup.getObjectByName('right_foot');
                            
                            if (isMoving) {
                                const waddleSpeed = 10;
                                const flapAmount = Math.sin(time * waddleSpeed) * 0.8;
                                
                                // Flippers flap up and down - opposite of each other
                                if (leftFlipper) leftFlipper.position.y = flapAmount;
                                if (rightFlipper) rightFlipper.position.y = -flapAmount;
                                
                                // Feet paddle up and down - opposite of flippers
                                if (leftFoot) leftFoot.position.y = -flapAmount * 0.6;
                                if (rightFoot) rightFoot.position.y = flapAmount * 0.6;
                                
                                // Waddle the whole mount side to side and bob up/down
                                mountGroup.rotation.z = Math.sin(time * waddleSpeed) * 0.06;
                                mountGroup.position.y = (mountData.positionY || 0.65) + Math.abs(Math.sin(time * waddleSpeed * 0.5)) * 0.08;
                            } else {
                                // Return to rest position smoothly
                                if (leftFlipper) leftFlipper.position.y *= 0.85;
                                if (rightFlipper) rightFlipper.position.y *= 0.85;
                                if (leftFoot) leftFoot.position.y *= 0.85;
                                if (rightFoot) rightFoot.position.y *= 0.85;
                                mountGroup.rotation.z *= 0.9;
                                const restY = mountData.positionY || 0.65;
                                mountGroup.position.y = restY + (mountGroup.position.y - restY) * 0.9;
                            }
                        }
                        // Boat rowing animation
                        else {
                            const leftOarPivot = mountGroup.getObjectByName('left_oar_pivot');
                            const rightOarPivot = mountGroup.getObjectByName('right_oar_pivot');
                            
                            if (leftOarPivot && rightOarPivot) {
                                if (isMoving) {
                                    const rowSpeed = 8;
                                    const rowAngle = Math.sin(time * rowSpeed) * 0.5;
                                    leftOarPivot.rotation.y = rowAngle;
                                    rightOarPivot.rotation.y = -rowAngle;
                                    leftOarPivot.rotation.z = Math.sin(time * rowSpeed + Math.PI/2) * 0.15;
                                    rightOarPivot.rotation.z = -Math.sin(time * rowSpeed + Math.PI/2) * 0.15;
                                } else {
                                    leftOarPivot.rotation.y *= 0.9;
                                    rightOarPivot.rotation.y *= 0.9;
                                    leftOarPivot.rotation.z *= 0.9;
                                    rightOarPivot.rotation.z *= 0.9;
                                }
                            }
                        }
                    }
                }
                
                // Mount trail for other players (icy trail from pengu mount, etc.)
                // Spawn locally based on other player's position - no server sync needed
                if (meshData.mesh.userData?.mount && meshData.mesh.userData?.mountVisible !== false && mountTrailSystemRef.current) {
                    const otherMountName = meshData.mesh.userData.mount;
                    const otherIsOnGround = (playerData.position?.y ?? 0) < 0.1;
                    
                    if (isMoving && otherIsOnGround && MountTrailSystem.mountHasTrail(otherMountName)) {
                        mountTrailSystemRef.current.updateFromMount(
                            id, // Use player ID as owner
                            meshData.mesh.position.x,
                            meshData.mesh.position.z,
                            otherMountName,
                            true // isMoving
                        );
                    }
                }
                
                // Update slot spectator bubble position for other players
                // Slot displays are now attached to machines, not players
                
                // Wizard hat trail for other players - use the same system as local player
                // Triggers for wizardHat equipped OR doginal character (who always has wizard hat)
                const otherAppearance = playerData.appearance || {};
                const otherHasWizardHat = otherAppearance.hat === 'wizardHat' || otherAppearance.characterType === 'doginal';
                if (otherHasWizardHat && wizardTrailSystemRef.current) {
                    const poolKey = `player_${id}`;
                    wizardTrailSystemRef.current.getOrCreatePool(poolKey);
                    wizardTrailSystemRef.current.update(poolKey, meshData.mesh.position, isMoving, time, delta);
                }
                
                // Gake candle trail for other players
                const otherIsGake = otherAppearance.characterType === 'gake';
                if (otherIsGake && gakeCandleTrailSystemRef.current) {
                    const poolKey = `player_${id}`;
                    gakeCandleTrailSystemRef.current.getOrCreatePool(poolKey);
                    gakeCandleTrailSystemRef.current.update(poolKey, meshData.mesh.position, isMoving, time, delta);
                }
                
                // Dynamic name tag scaling based on camera distance
                // Scale smaller when closer, max size when far (no scaling up beyond default)
                if (meshData.nameSprite && camera) {
                    const distToCamera = camera.position.distanceTo(meshData.mesh.position);
                    // Moderate scaling for readable effect
                    const minDist = 8;   // Distance where scale is minimum
                    const maxDist = 25;  // Distance where scale is maximum (default)
                    const minScale = 0.25; // Smaller when close (25%) - reduced from 15%
                    const maxScale = 1.0;
                    
                    const t = Math.min(1, Math.max(0, (distToCamera - minDist) / (maxDist - minDist)));
                    const scaleFactor = minScale + t * (maxScale - minScale);
                    
                    const baseScale = meshData.nameSprite.userData.baseScale || { x: 4, y: 1 };
                    meshData.nameSprite.scale.set(
                        baseScale.x * scaleFactor,
                        baseScale.y * scaleFactor,
                        1
                    );
                    
                    // Animated nametag floating effect (day1 and whale)
                    const nameStyle = meshData.nameSprite.userData.nametagStyle;
                    if (nameStyle === 'day1' || nameStyle === 'whale') {
                        const phase = meshData.nameSprite.userData.animationPhase || 0;
                        const floatOffset = Math.sin(time * 1.5 + phase) * 0.1;
                        const characterType = meshData.mesh.userData?.characterType || 'penguin';
                        const baseHeight = characterType === 'marcus' ? NAME_HEIGHT_MARCUS : characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                        meshData.nameSprite.position.y = baseHeight + floatOffset;
                    }
                    
                    
                    // Update gold rain particle system for Day 1 nametag (other players)
                    // Nametag particle rain - controlled by same setting as snow
                    if (meshData.goldRainSystem && camera) {
                        if (gameSettingsRef.current.snowEnabled !== false) {
                            const pos = meshData.mesh.position;
                            const camPos = camera.position;
                            meshData.goldRainSystem.update(time, delta, 
                                { x: pos.x, y: pos.y, z: pos.z },
                                { x: camPos.x, y: camPos.y, z: camPos.z }
                            );
                            meshData.goldRainSystem.setVisible(true);
                        } else {
                            meshData.goldRainSystem.setVisible(false);
                        }
                    }
                }
                
                // Handle chat bubbles for other players
                if (playerData.chatMessage && playerData.chatTime) {
                    const bubbleAge = Date.now() - playerData.chatTime;
                    const isAfkBubble = playerData.isAfkBubble;
                    
                    // Show bubble if within time limit (5 seconds) or AFK bubble
                    if (bubbleAge < 5000 || isAfkBubble) {
                        // Create or update bubble
                        const needsNewBubble = !meshData.bubble || meshData.lastChatMessage !== playerData.chatMessage;
                        
                        if (needsNewBubble) {
                            // Remove old bubble first
                            if (meshData.bubble) {
                                meshData.mesh.remove(meshData.bubble);
                            }
                            const bubbleHeight = playerData.appearance?.characterType === 'marcus' ? BUBBLE_HEIGHT_MARCUS : playerData.appearance?.characterType === 'whiteWhale' ? BUBBLE_HEIGHT_WHALE : BUBBLE_HEIGHT_PENGUIN;
                            meshData.bubble = createChatSprite(THREE, playerData.chatMessage, bubbleHeight);
                            meshData.mesh.add(meshData.bubble);
                            meshData.lastChatMessage = playerData.chatMessage;
                        }
                    } else {
                        // Remove expired bubble
                        if (meshData.bubble) {
                            meshData.mesh.remove(meshData.bubble);
                            meshData.bubble = null;
                            meshData.lastChatMessage = null;
                        }
                        // Clear the chat data
                        playerData.chatMessage = null;
                        playerData.chatTime = null;
                    }
                } else if (meshData.bubble) {
                    // No chat message but bubble exists - remove it
                    meshData.mesh.remove(meshData.bubble);
                    meshData.bubble = null;
                    meshData.lastChatMessage = null;
                }
            }
            
            // Dynamic name tag scaling for LOCAL player
            if (playerNameSpriteRef.current && playerRef.current && camera) {
                const distToCamera = camera.position.distanceTo(playerRef.current.position);
                const minDist = 8;
                const maxDist = 25;
                const minScale = 0.25; // Reduced from 15%
                const maxScale = 1.0;
                
                const t = Math.min(1, Math.max(0, (distToCamera - minDist) / (maxDist - minDist)));
                const scaleFactor = minScale + t * (maxScale - minScale);
                
                const baseScale = playerNameSpriteRef.current.userData.baseScale || { x: 4, y: 1 };
                playerNameSpriteRef.current.scale.set(
                    baseScale.x * scaleFactor,
                    baseScale.y * scaleFactor,
                    1
                );
                
                // Animated nametag floating effect for local player (day1 and whale)
                const localNameStyle = playerNameSpriteRef.current.userData.nametagStyle;
                if (localNameStyle === 'day1' || localNameStyle === 'whale') {
                    const phase = playerNameSpriteRef.current.userData.animationPhase || 0;
                    const floatOffset = Math.sin(time * 1.5 + phase) * 0.1;
                    const baseHeight = penguinData?.characterType === 'marcus' ? NAME_HEIGHT_MARCUS : penguinData?.characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                    playerNameSpriteRef.current.position.y = baseHeight + floatOffset;
                }
                
            }
            
            // Update world-space nametag particle rain for local player
            // Controlled by same setting as snow particles
            if (playerGoldRainRef.current && playerRef.current && camera) {
                if (gameSettingsRef.current.snowEnabled !== false) {
                    const pos = playerRef.current.position;
                    const camPos = camera.position;
                    playerGoldRainRef.current.update(time, delta, 
                        { x: pos.x, y: pos.y, z: pos.z },
                        { x: camPos.x, y: camPos.y, z: camPos.z }
                    );
                    playerGoldRainRef.current.setVisible(true);
                } else {
                    playerGoldRainRef.current.setVisible(false);
                }
            }

            // PARKOUR PERFORMANCE MODE: Skip heavy animations when player is high up (parkour course 4+)
            // This significantly improves FPS during parkour challenges
            // Note: Particles (snow, gold rain) are NOT affected - only prop animations
            const PARKOUR_PERFORMANCE_Y_THRESHOLD = 30; // Stage 4 starts around Y=33
            const inParkourPerformanceMode = roomRef.current === 'town' && posRef.current.y >= PARKOUR_PERFORMANCE_Y_THRESHOLD;
            
            // Animate campfire (flames, embers, light flicker) and Christmas tree
            // Skip when in parkour performance mode
            if (townCenterRef.current && roomRef.current === 'town' && !inParkourPerformanceMode) {
                const worldTime = serverWorldTimeRef?.current ?? 0.35;
                const nightFactor = calculateNightFactor(worldTime);
                // Pass player position for distance-based animation culling
                const playerPos = posRef.current;
                townCenterRef.current.update(time, delta, nightFactor, playerPos);
            }
            
            // Animate nightclub interior (dance floor, stage lights, speakers, disco ball)
            if (nightclubRef.current && roomRef.current === 'nightclub') {
                nightclubRef.current.update(time, delta, 0.7); // Always club lighting
            }
            
            // Animate casino room interior (slot machines, roulette wheels, etc.)
            if (casinoRoomRef.current && roomRef.current === 'casino_game_room') {
                casinoRoomRef.current.update(time, delta, 0.7);
            }
            
            // Animate SKNY GANG igloo interior (disco ball, lasers, LED floor, etc.)
            if (sknyIglooInteriorRef.current?.update && roomRef.current === 'igloo3') {
                sknyIglooInteriorRef.current.update(time);
            }
            
            // Animate building door glows (pulse for interactive doors, town only)
            // Skip door glow animations when in parkour performance mode
            if (roomRef.current === 'town' && !inParkourPerformanceMode) {
                portalsRef.current.forEach(building => {
                    if (building.mesh && building.gameId) {
                        const glow = building.mesh.getObjectByName(`door_glow_${building.id}`);
                        if (glow && glow.material) {
                            glow.material.opacity = 0.2 + Math.sin(time * 2) * 0.15;
                        }
                    }
                    
                    // Check if player is inside casino
                    const isInCasino = townCenterRef.current?.isPlayerInCasino(posRef.current.x, posRef.current.z);
                    
                    // Hide dojo label when player is on the roof (y > 9) or inside casino
                    if (building.id === 'dojo' && building.mesh) {
                        const dojoLabel = building.mesh.getObjectByName('label_dojo');
                        if (dojoLabel) {
                            dojoLabel.visible = posRef.current.y < 9 && !isInCasino;
                        }
                    }
                    
                    // Hide other building labels when inside casino
                    if (building.mesh) {
                        const label = building.mesh.getObjectByName(`label_${building.id}`);
                        if (label && building.id !== 'dojo') {
                            label.visible = !isInCasino;
                        }
                    }
                });
                
                // Check if player is inside casino for nightclub sign
                const isInCasino = townCenterRef.current?.isPlayerInCasino(posRef.current.x, posRef.current.z);
                
                // Hide nightclub title sign when player is on the roof (y > 12) or inside casino
                if (townCenterRef.current?.propMeshes) {
                    const nightclubMesh = townCenterRef.current.propMeshes.find(m => m.name === 'nightclub');
                    if (nightclubMesh) {
                        const titleSign = nightclubMesh.getObjectByName('nightclub_title_sign');
                        if (titleSign) {
                            titleSign.visible = posRef.current.y < 12 && !isInCasino;
                        }
                    }
                }
                
                // ==================== CASINO INTERIOR CAMERA ZOOM ====================
                // Auto-zoom camera ONCE when entering/exiting casino (allows free zoom otherwise)
                if (controls && camera) {
                    // Track state change (only zoom on transition, not continuously)
                    const wasInCasino = wasInCasinoRef.current;
                    
                    if (isInCasino !== wasInCasino) {
                        // State changed - trigger one-time zoom adjustment
                        wasInCasinoRef.current = isInCasino;
                        casinoZoomTransitionRef.current = {
                            active: true,
                            targetDistance: isInCasino ? 10 : 20, // Zoom in for casino, normal for outside
                            progress: 0
                        };
                    }
                    
                    // Smooth zoom transition (only while transition is active)
                    const transition = casinoZoomTransitionRef.current;
                    if (transition?.active) {
                        const offset = camera.position.clone().sub(controls.target);
                        const currentDistance = offset.length();
                        const targetDistance = transition.targetDistance;
                        
                        // Smooth lerp toward target
                        if (Math.abs(currentDistance - targetDistance) > 0.3) {
                            const newDistance = currentDistance + (targetDistance - currentDistance) * 0.08;
                            const direction = offset.normalize();
                            camera.position.copy(controls.target).add(direction.multiplyScalar(newDistance));
                        } else {
                            // Transition complete - stop adjusting, allow free zoom
                            transition.active = false;
                        }
                    }
                }
                
            }
            
            // Room-specific updates (self-contained in room modules)
            if (roomDataRef.current?.update) {
                roomDataRef.current.update(time, delta);
            }
            
            // Match banners are updated in a separate useEffect that responds to prop changes
            // (not in the game loop, since activeMatches/spectatingMatch are props that change)

            // ==================== SMOOTH CAMERA UPDATE ====================
            // Update camera controller with player state
            if (cameraControllerRef.current) {
                cameraControllerRef.current.setPlayerState(
                    posRef.current,
                    rotRef.current,
                    moving // True when player is actively moving
                );
                cameraControllerRef.current.update(delta);
            } else {
                // Fallback: simple camera follow if controller not initialized
                const offset = tempOffsetRef.current.copy(camera.position).sub(controls.target);
                const playerY = posRef.current.y + 1.2;
                const targetPos = tempVec3Ref.current.set(posRef.current.x, playerY, posRef.current.z);
                camera.position.copy(targetPos).add(offset);
                controls.target.copy(targetPos);
                controls.update();
            }
            
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
            // Cleanup CasinoRoom
            if (casinoRoomRef.current) {
                casinoRoomRef.current.cleanup();
                casinoRoomRef.current = null;
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
            // Cleanup Gake candle trail system
            if (gakeCandleTrailSystemRef.current) {
                gakeCandleTrailSystemRef.current.dispose();
                gakeCandleTrailSystemRef.current = null;
            }
            // Cleanup Mount trail system
            if (mountTrailSystemRef.current) {
                mountTrailSystemRef.current.dispose();
                mountTrailSystemRef.current = null;
            }
            // Cleanup slot machine system
            if (slotMachineSystemRef.current) {
                slotMachineSystemRef.current.cleanup();
            }
            // Cleanup jackpot celebration
            if (jackpotCelebrationRef.current) {
                jackpotCelebrationRef.current.cleanup();
                jackpotCelebrationRef.current = null;
            }
            // Cleanup gold rain particle system
            if (playerGoldRainRef.current) {
                playerGoldRainRef.current.dispose();
                playerGoldRainRef.current = null;
            }
            // Cleanup camera controller
            if (cameraControllerRef.current) {
                cameraControllerRef.current.dispose();
                cameraControllerRef.current = null;
            }
            // Cleanup player name sprite ref
            playerNameSpriteRef.current = null;
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
    
    // ==================== PvE ACTIVITY BANNERS ====================
    // Update PvE activity banners (fishing, blackjack, etc.)
    useEffect(() => {
        if (!sceneRef.current || !window.THREE) return;
        
        const THREE = window.THREE;
        const scene = sceneRef.current;
        const pveBanners = pveBannersRef.current;
        const playersData = playersDataRef.current;
        
        // Update PvE banners using the extracted system
        updatePveBanners({
            THREE,
            scene,
            pveBannersRef: pveBanners,
            playersData,
            activePveActivities,
            localPlayerId: playerId
        });
        
    }, [activePveActivities, playerId]); // Re-run when PvE activities change
    
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
            
            // Add WagerBot NPC to clickable meshes (dev mode)
            if (wagerBotMeshRef.current) {
                const botMesh = wagerBotMeshRef.current;
                playerMeshes.push(botMesh);
                botMesh.traverse(child => {
                    if (child.isMesh) {
                        meshToPlayerMap.set(child, 'dev_bot_wager');
                    }
                });
                meshToPlayerMap.set(botMesh, 'dev_bot_wager');
            }
            
            // Collect banner sprites for click detection
            const bannerSprites = [];
            // Igloo banners
            iglooOccupancySpritesRef.current.forEach(sprite => {
                if (sprite.visible) bannerSprites.push(sprite);
            });
            // Match banners (from matchBannersRef)
            if (matchBannersRef.current) {
                matchBannersRef.current.forEach((bannerData) => {
                    if (bannerData.sprite && bannerData.sprite.visible) {
                        bannerSprites.push(bannerData.sprite);
                    }
                });
            }
            // PvE banners (from pveBannersRef)
            if (pveBannersRef.current) {
                pveBannersRef.current.forEach((bannerData) => {
                    if (bannerData.sprite && bannerData.sprite.visible) {
                        bannerSprites.push(bannerData.sprite);
                    }
                });
            }
            // Lord Fishnu sprite
            if (lordFishnuSpriteRef.current && lordFishnuSpriteRef.current.visible) {
                bannerSprites.push(lordFishnuSpriteRef.current);
                // Store banner data if not already set
                if (!lordFishnuSpriteRef.current.userData.bannerData) {
                    lordFishnuSpriteRef.current.userData.bannerData = {
                        type: 'canvas',
                        title: 'Lord Fishnu Lore',
                        description: 'The legend of Lord Fishnu',
                        canvas: lordFishnuSpriteRef.current.material.map.image,
                        renderFn: (ctx, w, h) => {
                            const img = lordFishnuSpriteRef.current.material.map.image;
                            if (img) {
                                ctx.drawImage(img, 0, 0, w, h);
                            }
                        }
                    };
                }
            }
            // Casino TV and payout boards (stored in room refs)
            if (casinoRoomRef.current) {
                const casino = casinoRoomRef.current;
                if (casino.tvMesh && casino.tvMesh.visible) {
                    bannerSprites.push(casino.tvMesh);
                }
                if (casino.payoutBoards) {
                    casino.payoutBoards.forEach(board => {
                        if (board.group && board.group.visible) {
                            board.group.traverse(child => {
                                if (child.isMesh && child.userData.isBanner) {
                                    bannerSprites.push(child);
                                }
                            });
                        }
                    });
                }
            }
            // Nightclub banners (stored in nightclub ref)
            if (nightclubRef.current) {
                const nightclub = nightclubRef.current;
                if (nightclub.bannerMeshes) {
                    nightclub.bannerMeshes.forEach(mesh => {
                        if (mesh.visible) bannerSprites.push(mesh);
                    });
                }
            }
            
            // Billboards (find all billboard groups in scene and get their advert meshes)
            if (sceneRef.current) {
                sceneRef.current.traverse(obj => {
                    if (obj.name === 'billboard' && obj.isGroup) {
                        // Traverse billboard group to find advert mesh with bannerData
                        obj.traverse(child => {
                            if (child.isMesh && child.userData?.isBanner && child.userData?.bannerData) {
                                if (child.visible) bannerSprites.push(child);
                            }
                        });
                    }
                });
            }
            
            // Also check all meshes in scene for bannerData (catch any we might have missed)
            if (sceneRef.current) {
                sceneRef.current.traverse(obj => {
                    if (obj.isMesh && obj.userData?.isBanner && obj.userData?.bannerData && !bannerSprites.includes(obj)) {
                        if (obj.visible) bannerSprites.push(obj);
                    }
                });
            }
            
            // Check for intersections with players first
            const allMeshes = [];
            playerMeshes.forEach(m => m.traverse(child => { if (child.isMesh) allMeshes.push(child); }));
            
            const intersects = raycaster.intersectObjects(allMeshes, false);
            
            // Check banner clicks - handle sprites and meshes separately
            // THREE.Sprite objects don't work with standard raycaster, need manual check
            let clickedBanner = null;
            let bannerData = null;
            
            // Separate sprites from meshes
            const bannerMeshes = [];
            const bannerSpritesOnly = [];
            bannerSprites.forEach(s => {
                if (s.isMesh) {
                    bannerMeshes.push(s);
                } else if (s.isSprite) {
                    bannerSpritesOnly.push(s);
                }
            });
            
            // First check meshes (they work with raycaster)
            const bannerMeshIntersects = raycaster.intersectObjects(bannerMeshes, false);
            
            if (bannerMeshIntersects.length > 0) {
                clickedBanner = bannerMeshIntersects[0].object;
            } else if (bannerSpritesOnly.length > 0) {
                // Check sprites manually (THREE.Sprite needs special handling)
                // Sprites are always billboarded (facing camera), so check distance from ray to sprite position
                const ray = raycaster.ray;
                let closestSprite = null;
                let closestDistance = Infinity;
                
                for (const sprite of bannerSpritesOnly) {
                    if (!sprite.visible) continue;
                    
                    // Get sprite world position
                    const spriteWorldPos = new THREE.Vector3();
                    sprite.getWorldPosition(spriteWorldPos);
                    
                    // Calculate distance from ray to sprite position
                    const rayToSprite = new THREE.Vector3().subVectors(spriteWorldPos, ray.origin);
                    const rayDir = ray.direction.clone().normalize();
                    const projectionLength = rayToSprite.dot(rayDir);
                    
                    // Closest point on ray to sprite
                    const closestPointOnRay = ray.origin.clone().add(rayDir.multiplyScalar(projectionLength));
                    const distanceToRay = closestPointOnRay.distanceTo(spriteWorldPos);
                    
                    // Get sprite size (approximate from scale)
                    const spriteSize = Math.max(sprite.scale.x, sprite.scale.y) / 2;
                    
                    // Check if ray passes through sprite bounds
                    if (distanceToRay < spriteSize && projectionLength > 0) {
                        if (distanceToRay < closestDistance) {
                            closestDistance = distanceToRay;
                            closestSprite = sprite;
                        }
                    }
                }
                
                if (closestSprite) {
                    clickedBanner = closestSprite;
                }
            }
            
            // If we found a clicked banner, get its banner data
            if (clickedBanner) {
                let obj = clickedBanner;
                while (obj && !bannerData) {
                    bannerData = obj.userData?.bannerData;
                    if (!bannerData && obj.parent) {
                        obj = obj.parent;
                    } else {
                        break;
                    }
                }
                
                if (bannerData) {
                    // Check if this is the Igloo Rental Guide - use special component
                    if (bannerData.title === '🏠 Igloo Rental Guide' || 
                        (bannerData.title && bannerData.title.includes('Igloo Rental Guide'))) {
                        setIglooRentalGuideOpen(true);
                        return; // Don't process player clicks if banner was clicked
                    }
                    
                    // Check if this is the Gacha Drop Rates board - use special component
                    if (bannerData.title === 'Gacha Drop Rates' || 
                        (bannerData.title && bannerData.title.includes('Gacha')) ||
                        (bannerData.title && bannerData.title.includes('Cosmetic Gacha'))) {
                        setGachaDropRatesGuideOpen(true);
                        return; // Don't process player clicks if banner was clicked
                    }
                    
                    // Open banner zoom overlay for other banners
                    setBannerZoomData({
                        type: bannerData.type || 'canvas',
                        title: bannerData.title || 'Banner',
                        description: bannerData.description,
                        imagePath: bannerData.imagePath, // For image type banners (billboards)
                        canvas: bannerData.canvas
                    });
                    bannerZoomRenderFn.current = bannerData.renderFn;
                    setBannerZoomOpen(true);
                    return; // Don't process player clicks if banner was clicked
                }
            }
            
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
                    // Handle WagerBot NPC click (dev mode)
                    if (clickedPlayerId === 'dev_bot_wager') {
                        console.log('🖱️ Clicked on WagerBot NPC');
                        // Use the same appearance as defined in server/services/DevBotService.js BOT_CONFIG
                        onPlayerClick({
                            id: 'dev_bot_wager',
                            name: '🤖 WagerBot',
                            appearance: {
                                characterType: 'doginal',
                                skin: 'purple',
                                hat: 'none',
                                eyes: 'none',
                                mouth: 'none',
                                bodyItem: 'none',
                                dogPrimaryColor: '#D2691E',
                                dogSecondaryColor: '#8B4513'
                            },
                            position: { x: 105, y: 0, z: 100 },
                            isAuthenticated: true, // Bot is "authenticated" so can accept wagers
                            isBot: true // Mark as bot for UI
                        });
                        return;
                    }
                    
                    const playerData = playersDataRef.current.get(clickedPlayerId);
                    if (playerData) {
                        console.log('🖱️ Clicked/tapped on player:', playerData.name);
                        onPlayerClick({
                            id: clickedPlayerId,
                            name: playerData.name,
                            appearance: playerData.appearance,
                            position: playerData.position,
                            isAuthenticated: playerData.isAuthenticated
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
        
        // Use taller bubble height for special characters
        const bubbleHeight = penguinData?.characterType === 'marcus' ? BUBBLE_HEIGHT_MARCUS : penguinData?.characterType === 'whiteWhale' ? BUBBLE_HEIGHT_WHALE : BUBBLE_HEIGHT_PENGUIN;
        const sprite = createChatSprite(window.THREE, activeBubble, bubbleHeight);
        playerRef.current.add(sprite);
        bubbleSpriteRef.current = sprite;
        
        // Don't auto-clear if AFK or Fishnu respect - bubble stays until movement
        if (isAfkRef.current || isFishnuRespectRef.current) {
            return; // No timeout for AFK/Fishnu messages
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
        // Guard: need chatMessages array with content and valid playerId
        if (!chatMessages?.length || !playerId) return;
        
        const latestMsg = chatMessages[chatMessages.length - 1];
        if (!latestMsg) return;
        
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
        
        // Track chat stat (coins are awarded server-side in chat handler)
        GameManager.getInstance().incrementStat('chatsSent');
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
                    // Enrich igloo portals with dynamic state data
                    if (portal.targetRoom?.startsWith('igloo')) {
                        const iglooData = getIgloo(portal.targetRoom);
                        setNearbyPortal({
                            ...portal,
                            isIgloo: true,
                            iglooData: iglooData || null
                        });
                    } else {
                        setNearbyPortal(portal);
                    }
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
        
        // Hide all banners if player is inside the casino
        const isInCasino = townCenterRef.current?.isPlayerInCasino(playerPos.x, playerPos.z);
        
        iglooOccupancySpritesRef.current.forEach((sprite, iglooId) => {
            if (!sprite.userData) return;
            
            const dx = playerPos.x - sprite.userData.iglooX;
            const dz = playerPos.z - sprite.userData.iglooZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // Show sprite if player is close enough AND not inside casino
            const shouldShow = dist < VISIBILITY_DISTANCE && !isInCasino;
            
            if (sprite.visible !== shouldShow) {
                sprite.visible = shouldShow;
            }
            
            // Make sprite face camera (billboard effect)
            if (shouldShow && cameraRef.current) {
                sprite.quaternion.copy(cameraRef.current.quaternion);
            }
        });
        
        // ==================== LORD FISHNU LORE SPRITE VISIBILITY ====================
        if (lordFishnuSpriteRef.current) {
            const fishnuX = CENTER_X - 52.5;
            const fishnuZ = CENTER_Z + 54.7;
            const dx = playerPos.x - fishnuX;
            const dz = playerPos.z - fishnuZ;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            const FISHNU_VISIBILITY_DISTANCE = 18; // Show lore when within 18 units
            const shouldShowFishnu = dist < FISHNU_VISIBILITY_DISTANCE && !isInCasino;
            
            if (lordFishnuSpriteRef.current.visible !== shouldShowFishnu) {
                lordFishnuSpriteRef.current.visible = shouldShowFishnu;
            }
            
            // Make sprite face camera (billboard effect)
            if (shouldShowFishnu && cameraRef.current) {
                lordFishnuSpriteRef.current.quaternion.copy(cameraRef.current.quaternion);
            }
        }
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
    // Check for nearby slot machines (casino only)
    const checkSlotMachines = () => {
        if (room !== 'casino_game_room') {
            if (slotInteraction) setSlotInteraction(null);
            return;
        }
        
        // Initialize slot system if not already done
        if (!slotMachineSystemRef.current && window.THREE && sceneRef.current) {
            slotMachineSystemRef.current = new SlotMachineSystem(window.THREE, sceneRef.current);
            const roomData = roomDataRef.current;
            if (roomData?.roomWidth && roomData?.roomDepth) {
                slotMachineSystemRef.current.initForCasino(roomData.roomWidth, roomData.roomDepth, sceneRef.current);
            }
        }
        
        if (!slotMachineSystemRef.current) {
            return;
        }
        
        const playerPos = posRef.current;
        const playerPebbles = userData?.pebbles || 0; // Slot gacha uses Pebbles, not coins
        
        const interaction = slotMachineSystemRef.current.checkInteraction(
            playerPos.x,
            playerPos.z,
            playerPebbles,
            isAuthenticated
        );
        
        if (interaction) {
            if (!slotInteraction || slotInteraction.machine?.id !== interaction.machine?.id) {
                setSlotInteraction(interaction);
            }
        } else if (slotInteraction) {
            setSlotInteraction(null);
        }
    };
    
    // Check for nearby blackjack tables (casino only)
    // Only shows the play prompt when player is SEATED at a blackjack stool
    const checkBlackjackTables = () => {
        if (room !== 'casino_game_room' || blackjackGameActive) {
            if (blackjackInteraction && !blackjackGameActive) setBlackjackInteraction(null);
            return;
        }
        
        // Only show blackjack UI when player is seated on a blackjack stool
        // This prevents overlap with the "sit" prompt
        if (!seatedRef.current) {
            if (blackjackInteraction) setBlackjackInteraction(null);
            return;
        }
        
        const roomData = roomDataRef.current;
        if (!roomData?.blackjackTables) return;
        
        const playerPos = posRef.current;
        const playerY = playerPos.y || 0;
        
        // Only check when player is on ground level
        if (playerY > 1.5) return;
        
        let nearestTable = null;
        let nearestDist = Infinity;
        
        for (const table of roomData.blackjackTables) {
            const dx = playerPos.x - table.x;
            const dz = playerPos.z - table.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            // Large interaction radius (7) to include seated players at stools
            if (dist < (table.interactionRadius || 7) && dist < nearestDist) {
                nearestDist = dist;
                nearestTable = table;
            }
        }
        
        if (nearestTable) {
            const playerCoins = userData?.coins || GameManager.getInstance().getCoins();
            const canPlay = playerCoins >= 10; // Minimum bet
            
            const newInteraction = {
                tableId: nearestTable.tableId,
                table: nearestTable,
                canPlay,
                balance: playerCoins
            };
            
            if (!blackjackInteraction || blackjackInteraction.tableId !== nearestTable.tableId) {
                setBlackjackInteraction(newInteraction);
            }
        } else if (blackjackInteraction) {
            setBlackjackInteraction(null);
        }
    };
    
    // Check for nearby ice fishing spots (town only)
    const checkFishingSpots = () => {
        if (room !== 'town') {
            if (fishingInteraction) setFishingInteraction(null);
            return;
        }
        
        if (!iceFishingSystemRef.current) {
            return;
        }
        
        const playerPos = posRef.current;
        const playerCoins = userData?.coins || GameManager.getInstance().getCoins();
        
        const interaction = iceFishingSystemRef.current.checkInteraction(
            playerPos.x,
            playerPos.z,
            playerCoins,
            isAuthenticated
        );
        
        if (interaction) {
            if (!fishingInteraction || fishingInteraction.spot?.id !== interaction.spot?.id) {
                setFishingInteraction(interaction);
            }
        } else if (fishingInteraction) {
            setFishingInteraction(null);
        }
    };
    
    // Check for nearby arcade machines (town only) - PvE Battleship
    const checkArcadeMachines = () => {
        if (room !== 'town') {
            if (arcadeInteraction) setArcadeInteraction(null);
            return;
        }
        
        const playerPos = posRef.current;
        // Arcade machine position from TownCenter.js: C + 21.5, C - 5.2 (where C = 110)
        const arcadeX = 110 + 21.5;
        const arcadeZ = 110 - 5.2;
        const interactionRadius = 4; // Slightly larger than the collision radius
        
        const dx = playerPos.x - arcadeX;
        const dz = playerPos.z - arcadeZ;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < interactionRadius) {
            if (!arcadeInteraction) {
                setArcadeInteraction({
                    prompt: '🎮 Press E to play Battleship',
                    gameType: 'battleship'
                });
            }
        } else if (arcadeInteraction) {
            setArcadeInteraction(null);
        }
    };
    
    // Check for Lord Fishnu proximity (town only)
    const checkLordFishnu = () => {
        if (room !== 'town') {
            if (lordFishnuInteraction) setLordFishnuInteraction(null);
            return;
        }
        
        const playerPos = posRef.current;
        // Lord Fishnu position (from TownCenter.js: C - 52.5, C + 54.7)
        // TownCenter.CENTER = 110 (same as CENTER_X/CENTER_Z)
        const fishnuX = CENTER_X - 52.5;
        const fishnuZ = CENTER_Z + 54.7;
        
        const dx = playerPos.x - fishnuX;
        const dz = playerPos.z - fishnuZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        const INTERACTION_RADIUS = 6;
        
        if (dist < INTERACTION_RADIUS) {
            if (!lordFishnuInteraction) {
                setLordFishnuInteraction({
                    canPayRespects: true,
                    prompt: '🐟 Press E to pay respects to Lord Fishnu'
                });
            }
        } else if (lordFishnuInteraction) {
            setLordFishnuInteraction(null);
        }
    };
    
    // State for wardrobe igloo interaction
    const [wardrobeInteraction, setWardrobeInteraction] = useState(null);
    
    // Check for wardrobe/personal igloo proximity (town only)
    const checkWardrobeIgloo = () => {
        if (room !== 'town' || penguinCreatorOpen) {
            if (wardrobeInteraction) setWardrobeInteraction(null);
            return;
        }
        
        const playerPos = posRef.current;
        // Personal igloo position (from TownCenter.js: C + 67.6, C + 78.7)
        const wardrobeX = CENTER_X + 67.6;
        const wardrobeZ = CENTER_Z + 78.7;
        const interactionRadius = 6;
        
        const dx = playerPos.x - wardrobeX;
        const dz = playerPos.z - wardrobeZ;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < interactionRadius) {
            if (!wardrobeInteraction) {
                setWardrobeInteraction({
                    prompt: '✨ Press E to customize your penguin',
                    type: 'wardrobe'
                });
            }
        } else if (wardrobeInteraction) {
            setWardrobeInteraction(null);
        }
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
            checkPortals();
            checkIglooProximity();
            checkSlotMachines();
            checkBlackjackTables();
            checkFishingSpots();
            checkLordFishnu();
            checkArcadeMachines();
            checkWardrobeIgloo();
        }, 200);
        return () => clearInterval(interval);
    }, [nearbyPortal, room, slotInteraction, blackjackInteraction, blackjackGameActive, fishingInteraction, lordFishnuInteraction, arcadeInteraction, wardrobeInteraction, penguinCreatorOpen, userData?.coins, isAuthenticated]);
    
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
            } catch (e) { /* ignore */ }
            
            setNearbyPortal(null);
            return;
        }
        
        // Room transition
        if (nearbyPortal.targetRoom && onChangeRoom) {
            // === IGLOO ENTRY REQUIREMENTS CHECK ===
            // Only check requirements when ENTERING an igloo, not when EXITING to town
            const isEnteringIgloo = nearbyPortal.targetRoom.startsWith('igloo');
            const isExitingToTown = nearbyPortal.targetRoom === 'town';
            
            // If entering an igloo (from town), check requirements
            if (isEnteringIgloo && !isExitingToTown && nearbyPortal.isIgloo && nearbyPortal.iglooData) {
                const iglooData = nearbyPortal.iglooData;
                const isOwner = walletAddress && iglooData.ownerWallet === walletAddress;
                
                // If not rented (available), show details panel instead
                if (!iglooData.isRented) {
                    console.log('🏠 Igloo not rented - showing details panel');
                    openDetailsPanel(nearbyPortal.targetRoom);
                    return;
                }
                
                // Owner always has direct entry
                if (isOwner) {
                    console.log('🏠 Owner entering igloo directly');
                    // Continue to room transition below
                } else {
                    const accessType = iglooData.accessType;
                    
                    // PUBLIC igloo - anyone can enter freely, no requirements check needed
                    if (accessType === 'public') {
                        console.log('🏠 Public igloo - entering directly');
                        // Continue to room transition below
                    }
                    // PRIVATE igloo - only owner can enter, show requirements panel for others
                    else if (accessType === 'private') {
                        console.log('🔒 Private igloo - showing requirements panel');
                        openRequirementsPanel(nearbyPortal.targetRoom);
                        return;
                    }
                    // TOKEN, FEE, or BOTH - check requirements
                    else if (accessType === 'token' || accessType === 'fee' || accessType === 'both') {
                        // Check if user is already cleared (from previous check or payment)
                        const clearance = userClearance?.[nearbyPortal.targetRoom];
                        if (clearance?.canEnter) {
                            console.log('✅ User already cleared - entering directly');
                            // Continue to room transition below
                        } else {
                            // Ask server if user can enter (server checks real balances + paid status)
                            // If allowed: enters directly | If blocked: shows requirements panel
                            console.log('🔍 Checking entry requirements with server...');
                            checkIglooEntry(nearbyPortal.targetRoom, (iglooId) => {
                                // This callback is called if user CAN enter directly
                                console.log('✅ Server approved entry - entering:', iglooId);
                                
                                let exitSpawnPos = nearbyPortal.exitSpawnPos;
                                if (room === 'town' && iglooId.startsWith('igloo')) {
                                    iglooEntrySpawnRef.current = exitSpawnPos;
                                }
                                
                                onChangeRoom(iglooId, exitSpawnPos);
                            });
                            return; // Wait for server response
                        }
                    }
                    // Default (unknown access type) - allow entry
                    else {
                        console.log('🏠 Default access - entering directly');
                    }
                }
            }
            
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
    
    // Handle E key for slot machine spin - use ref to avoid stale closure
    const slotInteractionRef = useRef(slotInteraction);
    useEffect(() => {
        slotInteractionRef.current = slotInteraction;
    }, [slotInteraction]);
    
    // Blackjack interaction ref for E key handler
    const blackjackInteractionRef = useRef(null);
    useEffect(() => {
        blackjackInteractionRef.current = blackjackInteraction;
    }, [blackjackInteraction]);
    
    // Fishing interaction ref for E key handler
    const fishingInteractionRef = useRef(null);
    useEffect(() => {
        fishingInteractionRef.current = fishingInteraction;
    }, [fishingInteraction]);
    
    // Lord Fishnu interaction ref for E key handler
    const lordFishnuInteractionRef = useRef(null);
    useEffect(() => {
        lordFishnuInteractionRef.current = lordFishnuInteraction;
    }, [lordFishnuInteraction]);
    
    // Wardrobe interaction ref for E key handler
    const wardrobeInteractionRef = useRef(null);
    useEffect(() => {
        wardrobeInteractionRef.current = wardrobeInteraction;
    }, [wardrobeInteraction]);
    
    // Holy messages for Lord Fishnu
    const LORD_FISHNU_MESSAGES = [
        "🐟 Praise be to Lord Fishnu!",
        "🙏 Pls pump my bags, Lord Fishnu",
        "🦈 Please keep the sharks away!",
        "💎 Lord Fishnu, grant me diamond fins",
        "🎣 May your catches be plentiful",
        "🌊 Protect me from the deep, O Holy One",
        "✨ Fishnu is love, Fishnu is life",
        "🐠 Swim with me through these troubled waters",
        "💰 Bless my wallet, mighty Fishnu",
        "🔱 All hail the Aquatic One!",
        "🐡 May I never get rugged, Lord Fishnu",
        "🌟 In Fishnu we trust",
        "🎰 Let the slots be ever in my favor",
        "🐋 The whale smiles upon me today",
        "🏊 Guide my trades, O Scaly Savior",
        "💫 Fishnu sees all, knows all",
        "🌈 From the depths, prosperity rises",
        "🐚 Grant me pearls of wisdom",
    ];
    
    // Ref-based lock to prevent E spam (React state updates too slowly)
    const spinLockRef = useRef(false);
    const fishingLockRef = useRef(false);
    
    const handleSlotSpin = useCallback(async () => {
        if (spinLockRef.current) return;
        
        const currentSlotInteraction = slotInteractionRef.current;
        if (!currentSlotInteraction?.canSpin || !currentSlotInteraction?.machine) return;
        
        const machineId = currentSlotInteraction.machine.id;
        const isDemo = currentSlotInteraction.isDemo;
        
        spinLockRef.current = true;
        
        // Show spinning animation IMMEDIATELY (don't wait for server)
        if (slotMachineSystemRef.current) {
            if (!slotMachineSystemRef.current.scene && sceneRef.current) {
                slotMachineSystemRef.current.scene = sceneRef.current;
            }
            slotMachineSystemRef.current.startSpin(machineId, playerName, isDemo);
        }
        
        // Send spin request to server
        spinSlot(machineId).then(result => {
            if (result.error && slotMachineSystemRef.current) {
                slotMachineSystemRef.current.handleSpinError(machineId);
            }
        }).finally(() => {
            setTimeout(() => { spinLockRef.current = false; }, 500);
        });
    }, [spinSlot, playerId, playerName]);
    
    useEffect(() => {
        const handleSlotKeyPress = (e) => {
            if (e.code === 'KeyE') {
                if (slotInteractionRef.current?.canSpin && !nearbyPortal && !emoteWheelOpen && !slotSpinning && !spinLockRef.current) {
                    handleSlotSpin();
                }
            }
        };
        window.addEventListener('keydown', handleSlotKeyPress);
        return () => window.removeEventListener('keydown', handleSlotKeyPress);
    }, [nearbyPortal, emoteWheelOpen, slotSpinning, handleSlotSpin]);
    
    // Blackjack lock ref to prevent E spam
    const blackjackLockRef = useRef(false);
    
    // Handle blackjack start action - opens the blackjack UI overlay
    const handleBlackjackStart = useCallback(() => {
        if (blackjackLockRef.current || blackjackGameActive) return;
        
        const currentBJInteraction = blackjackInteractionRef.current;
        if (!currentBJInteraction?.canPlay || !currentBJInteraction?.tableId) return;
        
        blackjackLockRef.current = true;
        
        // Open the blackjack game overlay
        setBlackjackTableId(currentBJInteraction.tableId);
        setBlackjackGameActive(true);
        
        // Send sit message to server (done in CasinoBlackjack component)
        
        setTimeout(() => { blackjackLockRef.current = false; }, 300);
    }, [blackjackGameActive]);
    
    // Blackjack is click-only (no E key) to avoid conflict with sit interaction
    
    // Handle blackjack game leave
    const handleBlackjackLeave = useCallback(() => {
        setBlackjackGameActive(false);
        setBlackjackTableId(null);
    }, []);
    
    // Handle fishing action - opens the fishing minigame overlay
    const handleFishingAction = useCallback(async () => {
        if (fishingLockRef.current || fishingGameActive) return;
        
        const currentFishingInteraction = fishingInteractionRef.current;
        if (!currentFishingInteraction?.canFish || !currentFishingInteraction?.spot) return;
        
        const spotId = currentFishingInteraction.spot.id;
        const isDemo = currentFishingInteraction.isDemo;
        
        fishingLockRef.current = true;
        
        // Start fishing on server (deduct bait cost)
        const result = await startFishing(spotId);
        if (result.error) {
            fishingLockRef.current = false;
            return;
        }
        
        // Open the fishing minigame overlay
        setFishingGameSpot({ 
            id: spotId, 
            isDemo,
            ...currentFishingInteraction.spot 
        });
        setFishingGameActive(true);
        
        // Mark local player as fishing (for interaction prompt)
        if (iceFishingSystemRef.current) {
            iceFishingSystemRef.current.startLocalFishing(spotId);
        }
        
        setTimeout(() => { fishingLockRef.current = false; }, 300);
    }, [startFishing, playerName, fishingGameActive]);
    
    // Track depth for fishing game result
    const fishingDepthRef = useRef(0);
    
    // Handle fishing game catch result
    const handleFishingCatch = useCallback((fish) => {
        if (!fishingGameSpot) return;
        
        const catchDepth = fishingDepthRef.current;
        
        // Send catch to server for coin reward (with depth)
        // Server will broadcast to room for catch bubble display
        attemptCatch(fishingGameSpot.id, fish, catchDepth);
    }, [fishingGameSpot, attemptCatch]);
    
    // Handle fishing game miss (hit bottom)
    const handleFishingMiss = useCallback((reason) => {
        if (!fishingGameSpot) return;
        
        // Notify server of miss (no catch bubble shown for misses)
        cancelFishing?.(fishingGameSpot.id, fishingDepthRef.current);
    }, [fishingGameSpot, cancelFishing]);
    
    // Handle fishing game close
    const handleFishingGameClose = useCallback(() => {
        setFishingGameActive(false);
        setFishingGameSpot(null);
        
        // Clear local fishing state so player can fish again immediately
        if (iceFishingSystemRef.current) {
            iceFishingSystemRef.current.stopLocalFishing();
        }
        
        // Notify server that fishing ended (for PvE spectator banners)
        mpSend?.({ type: 'fishing_end' });
    }, [mpSend]);
    
    // Handle arcade game close (PvE Battleship)
    const handleArcadeGameClose = useCallback(() => {
        setArcadeGameActive(false);
        setArcadeGameType(null);
    }, []);
    
    // E key handler for fishing
    useEffect(() => {
        const handleFishingKeyPress = (e) => {
            if (e.code === 'KeyE' && room === 'town') {
                const fi = fishingInteractionRef.current;
                if (fi?.canFish && !nearbyPortal && !emoteWheelOpen && !fishingLockRef.current) {
                    handleFishingAction();
                }
            }
        };
        window.addEventListener('keydown', handleFishingKeyPress);
        return () => window.removeEventListener('keydown', handleFishingKeyPress);
    }, [nearbyPortal, emoteWheelOpen, room, handleFishingAction]);
    
    // E key handler for arcade machines (Battleship PvE)
    useEffect(() => {
        const handleArcadeKeyPress = (e) => {
            if (e.code === 'KeyE' && room === 'town') {
                if (arcadeInteraction && !nearbyPortal && !emoteWheelOpen && !arcadeGameActive) {
                    setArcadeGameType(arcadeInteraction.gameType || 'battleship');
                    setArcadeGameActive(true);
                    setArcadeInteraction(null);
                }
            }
        };
        window.addEventListener('keydown', handleArcadeKeyPress);
        return () => window.removeEventListener('keydown', handleArcadeKeyPress);
    }, [nearbyPortal, emoteWheelOpen, room, arcadeInteraction, arcadeGameActive]);
    
    // Handle paying respects to Lord Fishnu (works like AFK - dismisses on movement)
    const handlePayRespects = useCallback(() => {
        if (lordFishnuCooldownRef.current) return;
        
        const lfInteraction = lordFishnuInteractionRef.current;
        if (!lfInteraction?.canPayRespects) return;
        
        // Set cooldown to prevent spam
        lordFishnuCooldownRef.current = true;
        setTimeout(() => {
            lordFishnuCooldownRef.current = false;
        }, 3000); // 3 second cooldown
        
        // Pick random holy message
        const message = LORD_FISHNU_MESSAGES[Math.floor(Math.random() * LORD_FISHNU_MESSAGES.length)];
        
        // Set Fishnu respect state (like AFK - stays until movement)
        isFishnuRespectRef.current = true;
        fishnuRespectMessageRef.current = message;
        
        // Show chat bubble above player (stays until movement, like AFK)
        setActiveBubble(message);
        
        // Send to other players so they can see it (like AFK bubble)
        mpSendEmoteBubble(message);
    }, [mpSendEmoteBubble]);
    
    // E key handler for Lord Fishnu
    useEffect(() => {
        const handleFishnuKeyPress = (e) => {
            if (e.code === 'KeyE' && room === 'town') {
                const lf = lordFishnuInteractionRef.current;
                // Only trigger if near Fishnu and NOT near a portal or fishing spot
                if (lf?.canPayRespects && !nearbyPortal && !fishingInteraction && !emoteWheelOpen && !lordFishnuCooldownRef.current) {
                    handlePayRespects();
                }
            }
        };
        window.addEventListener('keydown', handleFishnuKeyPress);
        return () => window.removeEventListener('keydown', handleFishnuKeyPress);
    }, [nearbyPortal, fishingInteraction, emoteWheelOpen, room, handlePayRespects]);
    
    // E key handler for Wardrobe Igloo (Penguin Creator)
    useEffect(() => {
        const handleWardrobeKeyPress = (e) => {
            if (e.code === 'KeyE' && room === 'town' && !penguinCreatorOpen) {
                const wi = wardrobeInteractionRef.current;
                // Only trigger if near wardrobe and NOT near other interactions
                if (wi?.type === 'wardrobe' && !nearbyPortal && !fishingInteraction && !emoteWheelOpen && !arcadeInteraction) {
                    setPenguinCreatorOpen(true);
                    setWardrobeInteraction(null);
                }
            }
        };
        window.addEventListener('keydown', handleWardrobeKeyPress);
        return () => window.removeEventListener('keydown', handleWardrobeKeyPress);
    }, [nearbyPortal, fishingInteraction, emoteWheelOpen, arcadeInteraction, room, penguinCreatorOpen]);
    
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
            } else if (action === 'enter_casino_game_room') {
                // Casino game room portal
                setNearbyInteraction({ 
                    action, 
                    message: message || '🎰 Enter Game Room (Press E)',
                    targetRoom: data?.destination || 'casino_game_room'
                });
            } else if (action === 'enter_nightclub') {
                // Nightclub portal
                setNearbyInteraction({ 
                    action, 
                    message: message || '🎵 Enter Nightclub (Press E)',
                    targetRoom: data?.destination || 'nightclub'
                });
            } else if (action === 'play_arcade') {
                // Arcade machine interaction
                setNearbyInteraction({ 
                    action, 
                    message: message || '🎮 Press E to play',
                    gameType: data?.gameType || 'battleship'
                });
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
                else if (nearbyInteraction.action === 'enter_casino_game_room' || nearbyInteraction.action === 'enter_nightclub') {
                    // Room transition via trigger-based portals
                    const targetRoom = nearbyInteraction.targetRoom;
                    if (targetRoom && onChangeRoom) {
                        // Clear interaction and transition to room
                        setNearbyInteraction(null);
                        onChangeRoom(targetRoom);
                    }
                }
                else if (nearbyInteraction.action === 'play_arcade') {
                    // Open arcade minigame (PvE Battleship)
                    const gameType = nearbyInteraction.gameType || 'battleship';
                    setArcadeGameType(gameType);
                    setArcadeGameActive(true);
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
    // Handle /tp pk1-pk5 commands for parkour testing (DEV only)
    useEffect(() => {
        const handleChatCommand = (e) => {
            const { command } = e.detail;
            
            // Parkour teleport positions (DEV/QA only)
            // Based on: CENTER = 100, DOJO_OFFSET = { x: 0, z: 70 }
            // dojoX = 100, dojoZ = 170, mirrored = true
            const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'qa';
            
            // Parkour stage start positions (approximate, for testing)
            // Y values raised +3 to land on top of platforms with clearance
            const parkourPositions = {
                // Stage 1 (Blue) - Ground level start near dojo
                pk1: { x: CENTER_X - 12, y: 4, z: CENTER_Z + 70 + 9, name: 'Stage 1 (Blue) Start' },
                // Stage 2 (Purple) - Tier 1 platform (first roof)
                pk2: { x: CENTER_X - 13, y: 14, z: CENTER_Z + 70, name: 'Stage 2 (Purple) Start' },
                // Stage 3 (Green) - Tier 3 platform
                pk3: { x: CENTER_X - 6, y: 25, z: CENTER_Z + 70 + 2, name: 'Stage 3 (Green) Start' },
                // Stage 4 (Orange) - Near fishing area (end of stage 3)
                pk4: { x: CENTER_X - 70.4 + 4, y: 37, z: CENTER_Z + 78.5 - 2, name: 'Stage 4 (Orange) Start' },
                // Stage 5 (Red) - End of stage 4
                pk5: { x: CENTER_X - 70.4 + 49 + 3, y: 48, z: CENTER_Z + 78.5 + 1 + 3, name: 'Stage 5 (Red) Start' },
                // Stage 6 (Cyan) - The Gauntlet - Expert course
                pk6: { x: CENTER_X - 70.4 + 49 + 48 - 3, y: 57, z: CENTER_Z + 78.5 + 1 + 2 - 3, name: 'Stage 6 (Cyan) - The Gauntlet' },
            };
            
            // Handle parkour teleports (DEV only)
            if (isDev && parkourPositions[command]) {
                const pos = parkourPositions[command];
                
                // Clear any seated state first
                if (seatedRef.current) {
                    seatedRef.current = null;
                    setSeatedOnBench(null);
                    emoteRef.current.type = null;
                    mpSendEmote(null);
                }
                
                // If not in town, change room to town first
                if (roomRef.current !== 'town') {
                    if (onChangeRoom) {
                        onChangeRoom('town', null);
                    }
                    // Teleport after room change
                    setTimeout(() => {
                        posRef.current.x = pos.x;
                        posRef.current.y = pos.y;
                        posRef.current.z = pos.z;
                        velRef.current = { x: 0, y: 0, z: 0 };
                        if (playerRef.current) {
                            playerRef.current.position.set(pos.x, pos.y, pos.z);
                        }
                    }, 100);
                } else {
                    // Already in town - just teleport
                    posRef.current.x = pos.x;
                    posRef.current.y = pos.y;
                    posRef.current.z = pos.z;
                    velRef.current = { x: 0, y: 0, z: 0 };
                    
                    if (playerRef.current) {
                        playerRef.current.position.set(pos.x, pos.y, pos.z);
                    }
                }
                
                console.log(`🎮 Teleported to ${pos.name}:`, { x: pos.x, y: pos.y, z: pos.z });
                return;
            }
            
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
    
    // Handle admin/moderator teleport command
    useEffect(() => {
        const handleTeleport = (e) => {
            const { position, room: targetRoom } = e.detail;
            
            if (!position) return;
            
            // Clear any seated state first
            if (seatedRef.current) {
                seatedRef.current = null;
                setSeatedOnBench(null);
                emoteRef.current.type = null;
                mpSendEmote(null);
            }
            
            // If target room is different, change room first
            if (targetRoom && room !== targetRoom) {
                onChangeRoom(targetRoom);
                // Position will be set after room change
                setTimeout(() => {
                    posRef.current.x = position.x || 0;
                    posRef.current.y = position.y || 0;
                    posRef.current.z = position.z || 0;
                    velRef.current = { x: 0, y: 0, z: 0 };
                    if (playerRef.current) {
                        playerRef.current.position.set(position.x || 0, position.y || 0, position.z || 0);
                    }
                    // Snap camera to new position
                    if (cameraControllerRef.current) {
                        cameraControllerRef.current.snapToTarget();
                    }
                }, 100);
            } else {
                // Same room - just teleport
                posRef.current.x = position.x || 0;
                posRef.current.y = position.y || 0;
                posRef.current.z = position.z || 0;
                velRef.current = { x: 0, y: 0, z: 0 };
                
                if (playerRef.current) {
                    playerRef.current.position.set(position.x || 0, position.y || 0, position.z || 0);
                }
                // Snap camera to new position
                if (cameraControllerRef.current) {
                    cameraControllerRef.current.snapToTarget();
                }
            }
            
            console.log('✨ Teleported to:', position, targetRoom ? `(room: ${targetRoom})` : '');
        };
        
        window.addEventListener('teleport', handleTeleport);
        return () => window.removeEventListener('teleport', handleTeleport);
    }, [room, onChangeRoom, mpSendEmote]);
    
    // Listen for room counts updates from server (for igloo occupancy bubbles)
    useEffect(() => {
        const handleRoomCounts = (event) => {
            const counts = event.detail;
            if (!counts) return;
            
            // Each igloo has its own unique room (igloo1 -> igloo1, igloo2 -> igloo2, etc.)
            // Update each igloo sprite with the count from its corresponding room
            iglooOccupancySpritesRef.current.forEach((sprite, iglooId) => {
                const roomName = sprite.userData.iglooRoom || iglooId;
                const count = counts[roomName] || 0;
                // Get server igloo data for dynamic banner content
                const serverIglooData = getIgloo ? getIgloo(iglooId) : null;
                updateIglooOccupancySprite(window.THREE, sprite, count, serverIglooData);
            });
        };
        
        window.addEventListener('roomCounts', handleRoomCounts);
        return () => window.removeEventListener('roomCounts', handleRoomCounts);
    }, [getIgloo]);
    
    // Update igloo banners when igloo data changes from server
    useEffect(() => {
        if (!igloos || igloos.length === 0) return;
        
        console.log('🏠 [VoxelWorld] Igloos data changed, updating banners. Sample banner:', 
            igloos[0]?.banner ? {
                iglooId: igloos[0].iglooId,
                font: igloos[0].banner.font,
                styleIndex: igloos[0].banner.styleIndex,
                useCustomColors: igloos[0].banner.useCustomColors
            } : 'no banner data'
        );
        
        // Update each igloo sprite with the latest server data
        iglooOccupancySpritesRef.current.forEach((sprite, iglooId) => {
            const serverIglooData = igloos.find(i => i.iglooId === iglooId);
            if (serverIglooData) {
                // Get current occupancy count from sprite
                const currentCount = sprite.userData.lastCount || 0;
                updateIglooOccupancySprite(window.THREE, sprite, currentCount, serverIglooData);
            }
        });
    }, [igloos]);
    

    // ==================== MULTIPLAYER SYNC (OPTIMIZED) ====================
    
    // ==================== NAMETAG STYLE SYSTEM ====================
    // Nametag styles: 'default', 'day1' (Day One supporter badge), 'whale' (Whale status)
    const NAME_SPRITE_BASE_SCALE = { x: 4, y: 1 }; // Default/max scale
    
    // Helper to create name sprite for players (including self)
    // style: 'default' | 'day1' | 'whale'
    const createNameSprite = useCallback((name, style = 'day1') => {
        const THREE = window.THREE;
        if (!THREE) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Higher res for animated styles
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        if (style === 'whale') {
            // Whale Status - Premium diamond/legendary style
            // Outer glow with cyan/purple shimmer
            ctx.shadowColor = 'rgba(6, 182, 212, 0.9)';
            ctx.shadowBlur = 25;
            
            // Gradient border
            const borderGradient = ctx.createLinearGradient(20, 0, 492, 0);
            borderGradient.addColorStop(0, 'rgba(6, 182, 212, 1)');     // Cyan
            borderGradient.addColorStop(0.5, 'rgba(168, 85, 247, 1)');  // Purple
            borderGradient.addColorStop(1, 'rgba(236, 72, 153, 1)');    // Pink
            ctx.fillStyle = borderGradient;
            ctx.beginPath();
            ctx.roundRect(20, 20, 472, 88, 20);
            ctx.fill();
            
            // Inner background - darker with luxury feel
            ctx.shadowBlur = 0;
            const innerGradient = ctx.createLinearGradient(28, 28, 28, 100);
            innerGradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
            innerGradient.addColorStop(1, 'rgba(30, 41, 59, 0.95)');
            ctx.fillStyle = innerGradient;
            ctx.beginPath();
            ctx.roundRect(28, 28, 456, 72, 16);
            ctx.fill();
            
            // Inner shimmer border
            ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(28, 28, 456, 72, 16);
            ctx.stroke();
            
            // Whale emoji
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('🐳', 45, 64);
            
            // Separator line with gradient
            const sepGradient = ctx.createLinearGradient(100, 38, 100, 90);
            sepGradient.addColorStop(0, 'rgba(6, 182, 212, 0)');
            sepGradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.8)');
            sepGradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
            ctx.fillStyle = sepGradient;
            ctx.fillRect(100, 38, 2, 52);
            
            // Player name with animated gradient effect
            const nameGradient = ctx.createLinearGradient(120, 0, 470, 0);
            nameGradient.addColorStop(0, '#67e8f9');    // Cyan
            nameGradient.addColorStop(0.5, '#c084fc');  // Purple
            nameGradient.addColorStop(1, '#f472b6');    // Pink
            ctx.fillStyle = nameGradient;
            ctx.font = 'bold 38px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Truncate long names
            let displayName = name;
            if (ctx.measureText(name).width > 300) {
                while (ctx.measureText(displayName + '...').width > 300 && displayName.length > 0) {
                    displayName = displayName.slice(0, -1);
                }
                displayName += '...';
            }
            ctx.fillText(displayName, 290, 64);
            
        } else if (style === 'day1') {
            // Day One Supporter - Golden gradient badge
            const gradient = ctx.createLinearGradient(20, 0, 492, 0);
            gradient.addColorStop(0, 'rgba(234, 179, 8, 0.9)');     // Gold
            gradient.addColorStop(0.3, 'rgba(251, 191, 36, 0.9)');  // Amber
            gradient.addColorStop(0.7, 'rgba(245, 158, 11, 0.9)');  // Orange-gold
            gradient.addColorStop(1, 'rgba(234, 179, 8, 0.9)');     // Gold
            
            // Outer glow
            ctx.shadowColor = 'rgba(234, 179, 8, 0.8)';
            ctx.shadowBlur = 20;
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(20, 20, 472, 88, 20);
            ctx.fill();
            
            // Inner darker background
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(28, 28, 456, 72, 16);
            ctx.fill();
            
            // Border shimmer
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(28, 28, 456, 72, 16);
            ctx.stroke();
            
            // Day 1 badge icon (star)
            ctx.fillStyle = '#fbbf24'; // Gold
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText('⭐', 48, 64);
            
            // "DAY 1" text
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 18px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('DAY 1', 88, 50);
            
            // Supporter subtitle
            ctx.fillStyle = 'rgba(251, 191, 36, 0.7)';
            ctx.font = '12px sans-serif';
            ctx.fillText('SUPPORTER', 88, 72);
            
            // Separator line
            ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
            ctx.fillRect(170, 38, 2, 52);
            
            // Player name with golden glow
            ctx.shadowColor = 'rgba(251, 191, 36, 0.5)';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Truncate long names
            let displayName = name;
            if (ctx.measureText(name).width > 250) {
                while (ctx.measureText(displayName + '...').width > 250 && displayName.length > 0) {
                    displayName = displayName.slice(0, -1);
                }
                displayName += '...';
            }
            ctx.fillText(displayName, 330, 64);
            
        } else {
            // Default style - simple clean background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.roundRect(64, 32, 384, 64, 16);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(64, 32, 384, 64, 16);
            ctx.stroke();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name, 256, 64);
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            depthTest: false,
            depthWrite: false,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        
        // Ensure nametags ALWAYS render on top of trails, particles, everything
        sprite.renderOrder = 9999;
        
        // Styled nametags are wider
        const isStyled = style === 'day1' || style === 'whale';
        const scaleX = isStyled ? 5.5 : NAME_SPRITE_BASE_SCALE.x;
        const scaleY = isStyled ? 1.4 : NAME_SPRITE_BASE_SCALE.y;
        sprite.scale.set(scaleX, scaleY, 1);
        sprite.userData.baseScale = { x: scaleX, y: scaleY };
        sprite.userData.nametagStyle = style;
        
        // Store animation data for styled nametags
        if (isStyled) {
            sprite.userData.animationPhase = Math.random() * Math.PI * 2;
        }
        
        // Mark if this nametag needs gold rain (created separately as world-space effect)
        sprite.userData.needsGoldRain = (style === 'day1');
        
        return sprite;
    }, []);
    
    // Listen for nametag style changes from settings
    useEffect(() => {
        const handleNametagChange = (e) => {
            // Guests can only use 'default' style - enforce even if UI didn't block it
            const requestedStyle = e.detail?.style || 'day1';
            const newStyle = isAuthenticated ? requestedStyle : 'default';
            
            // Remove old nametag from player mesh
            if (playerRef.current && playerNameSpriteRef.current) {
                playerRef.current.remove(playerNameSpriteRef.current);
                playerNameSpriteRef.current = null;
            }
            
            // Dispose old gold rain system if present
            if (playerGoldRainRef.current) {
                playerGoldRainRef.current.dispose();
                playerGoldRainRef.current = null;
            }
            
            // Create new nametag with new style
            if (playerRef.current && playerName) {
                const THREE = window.THREE;
                if (THREE) {
                    const nameSprite = createNameSprite(playerName, newStyle);
                    if (nameSprite) {
                        // Determine character type for height
                        let characterType = 'penguin';
                        try {
                            const customization = JSON.parse(localStorage.getItem('penguin_customization') || '{}');
                            characterType = customization.characterType || 'penguin';
                        } catch { /* use default */ }
                        const nameHeight = characterType === 'marcus' ? NAME_HEIGHT_MARCUS : characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                        nameSprite.position.set(0, nameHeight, 0);
                        playerRef.current.add(nameSprite);
                        playerNameSpriteRef.current = nameSprite;
                        
                        // Create world-space particle rain for Day 1 or Whale nametag (only for authenticated)
                        if (isAuthenticated && (newStyle === 'day1' || newStyle === 'whale') && sceneRef.current) {
                            const playerPos = playerRef.current.position;
                            const preset = newStyle === 'day1' ? 'goldRain' : 'whaleRain';
                            const particleRain = new LocalizedParticleSystem(THREE, sceneRef.current, preset);
                            particleRain.create({ x: playerPos.x, y: playerPos.y, z: playerPos.z });
                            playerGoldRainRef.current = particleRain;
                        }
                    }
                }
            }
            
            // Broadcast to server via appearance update
            if (mpUpdateAppearanceRef.current) {
                try {
                    const savedSettings = JSON.parse(localStorage.getItem('game_settings') || '{}');
                    const customization = JSON.parse(localStorage.getItem('penguin_customization') || '{}');
                    mpUpdateAppearanceRef.current({
                        ...customization,
                        mountEnabled: savedSettings.mountEnabled !== false,
                        nametagStyle: newStyle
                    });
                } catch { /* ignore */ }
            }
        };
        
        window.addEventListener('nametagChanged', handleNametagChange);
        return () => window.removeEventListener('nametagChanged', handleNametagChange);
    }, [createNameSprite, isAuthenticated, playerName]);
    
    // Join room when connected and scene is ready
    useEffect(() => {
        if (connected && sceneRef.current && playerId) {
            const puffleData = playerPuffle ? {
                id: playerPuffle.id,
                color: playerPuffle.color,
                name: playerPuffle.name
            } : null;
            
            // Include current mount enabled state and nametag style from settings
            // Guests always get 'default' nametag style - only authenticated users get special styles
            let mountEnabled = true;
            let nametagStyle = 'default';
            try {
                const settings = JSON.parse(localStorage.getItem('game_settings') || '{}');
                mountEnabled = settings.mountEnabled !== false;
                // Only authenticated users can use non-default nametag styles
                nametagStyle = isAuthenticated ? (settings.nametagStyle || 'day1') : 'default';
            } catch { /* use default */ }
            
            const appearanceWithMount = {
                ...penguinData,
                mountEnabled,
                nametagStyle  // Broadcast nametag style to all players
            };
            
            mpJoinRoom(room, appearanceWithMount, puffleData, turnstileToken);
            
            // Add player's own name tag (so they can see their username)
            if (playerRef.current && playerName && !playerNameSpriteRef.current) {
                
                const nameSprite = createNameSprite(playerName, nametagStyle);
                if (nameSprite) {
                    const nameHeight = penguinData?.characterType === 'marcus' ? NAME_HEIGHT_MARCUS : penguinData?.characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                    nameSprite.position.set(0, nameHeight, 0);
                    playerRef.current.add(nameSprite);
                    playerNameSpriteRef.current = nameSprite;
                    
                    // Create world-space particle rain for Day 1 or Whale nametag
                    if ((nametagStyle === 'day1' || nametagStyle === 'whale') && sceneRef.current && !playerGoldRainRef.current) {
                        const THREE = window.THREE;
                        if (THREE) {
                            const playerPos = playerRef.current.position;
                            const preset = nametagStyle === 'day1' ? 'goldRain' : 'whaleRain';
                            const particleRain = new LocalizedParticleSystem(THREE, sceneRef.current, preset);
                            particleRain.create({ x: playerPos.x, y: playerPos.y, z: playerPos.z });
                            playerGoldRainRef.current = particleRain;
                        }
                    }
                }
            }
        }
    }, [connected, playerId, room, penguinData, playerName, createNameSprite]);
    
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
            },
            // Slot machine callbacks - displays are now attached to MACHINES not players
            onSlotSpinStarted: (data) => {
                // Server confirmed our spin started - display already created in handleSlotSpin
            },
            onSlotReelReveal: (data) => {
                // Update machine display with revealed reel
                if (slotMachineSystemRef.current) {
                    slotMachineSystemRef.current.revealReel(
                        data.machineId,
                        data.reelIndex,
                        data.symbol
                    );
                }
            },
            onSlotResult: (data) => {
                // Complete machine display with cosmetic result
                if (slotMachineSystemRef.current) {
                    // Build cosmetic result object for display
                    const cosmeticResult = data.isDemo ? { 
                        rarity: data.demoRarity || 'common',
                        isDemo: true 
                    } : {
                        rarity: data.rarity,
                        name: data.name,
                        templateId: data.templateId,
                        quality: data.quality,
                        qualityDisplay: data.qualityDisplay,
                        isHolographic: data.isHolographic,
                        isFirstEdition: data.isFirstEdition,
                        serialNumber: data.serialNumber,
                        isDuplicate: data.isDuplicate,
                        goldAwarded: data.goldAwarded
                    };
                    
                    slotMachineSystemRef.current.completeSpin(
                        data.machineId,
                        data.reels,
                        cosmeticResult,
                        data.isDemo
                    );
                }
                
                // Trigger jackpot celebration if it's a jackpot (Legendary or better)!
                if (data.isJackpot && jackpotCelebrationRef.current) {
                    jackpotCelebrationRef.current.triggerJackpot();
                }
            },
            onSlotPlayerSpinning: (data) => {
                // Another player started spinning on a machine
                if (slotMachineSystemRef.current && data.playerId !== playerId) {
                    slotMachineSystemRef.current.handleRemoteSpinStart(
                        data.machineId,
                        data.playerName,
                        data.isDemo
                    );
                }
            },
            onSlotComplete: (data) => {
                // Another player completed spinning - show their cosmetic result to spectators
                if (slotMachineSystemRef.current && data.playerId !== playerId) {
                    // Build cosmetic result object for spectator display
                    const cosmeticResult = data.isDemo ? {
                        rarity: data.demoRarity || 'common',
                        isDemo: true
                    } : {
                        rarity: data.rarity,
                        name: data.name,
                        quality: data.quality,
                        isHolographic: data.isHolographic,
                        isFirstEdition: data.isFirstEdition,
                        isDuplicate: data.isDuplicate
                    };
                    
                    slotMachineSystemRef.current.completeSpin(
                        data.machineId,
                        data.reels,
                        cosmeticResult,
                        data.isDemo
                    );
                }
            },
            onSlotInterrupted: (data) => {
                // A player's spin was interrupted - hide machine display
                if (slotMachineSystemRef.current) {
                    slotMachineSystemRef.current.handleSpinError(data.machineId);
                }
            },
            onSlotActiveSpins: (spins) => {
                // Show displays for all active spins when joining room
                if (slotMachineSystemRef.current) {
                    for (const spin of spins) {
                        slotMachineSystemRef.current.handleRemoteSpinStart(
                            spin.machineId,
                            spin.playerName,
                            spin.isDemo
                        );
                        // Set revealed reels
                        spin.reels?.forEach((reel, idx) => {
                            slotMachineSystemRef.current.revealReel(
                                spin.machineId,
                                idx,
                                reel
                            );
                        });
                    }
                }
            },
            // Ice Fishing callbacks - simple catch bubble display
            onFishingStarted: () => {
                // Fishing started - minigame overlay handles display
            },
            onPlayerCaughtFish: (data) => {
                // A player caught a fish - show bubble above them
                if (iceFishingSystemRef.current) {
                    const isJellyfish = data.fish?.type === 'jellyfish' || data.fish?.id?.includes('jelly');
                    iceFishingSystemRef.current.showCatchBubble(
                        data.playerId,
                        data.playerName,
                        data.fish,
                        data.coins,
                        data.isDemo,
                        isJellyfish
                    );
                }
            }
        });
    }, [registerCallbacks, playerId, playerName]);
    
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
                // Clean up gold rain particle system
                if (data.goldRainSystem) {
                    data.goldRainSystem.dispose();
                }
                // Clean up their trail points
                if (mountTrailSystemRef.current) {
                    mountTrailSystemRef.current.removePlayerTrails(id);
                }
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
            
            // Hide mount if player has mountEnabled set to false
            if (playerData.appearance?.mountEnabled === false) {
                const mountGroup = mesh.getObjectByName('mount');
                if (mountGroup) {
                    mountGroup.visible = false;
                    mesh.userData.mountVisible = false;
                }
            }
            
            // Create name tag - adjust height for character type
            // Use player's chosen nametag style from appearance (default to 'day1')
            const playerNametagStyle = playerData.appearance?.nametagStyle || 'day1';
            const nameSprite = createNameSprite(playerData.name || 'Player', playerNametagStyle);
            if (nameSprite) {
                const nameHeight = playerData.appearance?.characterType === 'marcus' ? NAME_HEIGHT_MARCUS : playerData.appearance?.characterType === 'whiteWhale' ? NAME_HEIGHT_WHALE : NAME_HEIGHT_PENGUIN;
                nameSprite.position.set(0, nameHeight, 0);
                mesh.add(nameSprite);
            }
            
            // Create world-space particle rain for Day 1 or Whale nametag
            let goldRainSystem = null;
            if ((playerNametagStyle === 'day1' || playerNametagStyle === 'whale') && scene) {
                const pos = playerData.position || { x: 0, y: 0, z: 0 };
                const preset = playerNametagStyle === 'day1' ? 'goldRain' : 'whaleRain';
                goldRainSystem = new LocalizedParticleSystem(THREE, scene, preset);
                goldRainSystem.create({ x: pos.x, y: pos.y || 0, z: pos.z });
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
            // Animated skin colors (cosmic, galaxy, rainbow, prismatic, nebula)
            const animatedSkins = ['cosmic', 'galaxy', 'rainbow', 'prismatic', 'nebula'];
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
                                         appearance.bodyItem === 'lightningAura' ||
                                         animatedSkins.includes(appearance.skin);
            
            meshes.set(id, { 
                mesh, 
                bubble: null, 
                puffleMesh, 
                nameSprite,
                goldRainSystem, // World-space gold rain for Day 1 nametag
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
    
    // Track igloo room entry/exit for eligibility checks
    useEffect(() => {
        const isIgloo = room?.startsWith('igloo');
        
        if (isIgloo) {
            // Entering an igloo - set up eligibility tracking with kick callback
            const handleKick = (reason) => {
                console.log('🚪 Kicked from igloo due to:', reason);
                // Show notification
                window.dispatchEvent(new CustomEvent('notification', {
                    detail: {
                        type: 'warning',
                        message: reason === 'AUTH_LOST' 
                            ? '🔌 Wallet disconnected - returning to town' 
                            : '🚫 Access to this igloo has been revoked',
                        duration: 5000
                    }
                }));
                // Return to town
                if (onChangeRoom) {
                    onChangeRoom('town', null);
                }
            };
            enterIglooRoom(room, handleKick);
        } else {
            // Left an igloo (or in a non-igloo room)
            leaveIglooRoom();
        }
        
        // Cleanup when leaving
        return () => {
            if (isIgloo) {
                leaveIglooRoom();
            }
        };
    }, [room, enterIglooRoom, leaveIglooRoom, onChangeRoom]);
    
    // Reset casino zoom state when changing rooms (so zoom triggers properly on re-entry)
    useEffect(() => {
        // When room changes, reset the casino tracking so zoom can trigger fresh
        wasInCasinoRef.current = false;
        casinoZoomTransitionRef.current = { active: false, targetDistance: 20, progress: 0 };
        
        // If entering town and spawning inside the casino, immediately trigger zoom
        if (room === 'town') {
            // Small delay to let position settle after room change
            setTimeout(() => {
                const pos = posRef.current;
                if (pos) {
                    // Check if player spawned inside casino building bounds
                    const casinoX = CENTER_X - 42;
                    const casinoZ = CENTER_Z + 15;
                    const dx = pos.x - casinoX;
                    const dz = pos.z - casinoZ;
                    const isInCasino = Math.abs(dx) < 20 && Math.abs(dz) < 20 && pos.y < 15;
                    
                    if (isInCasino) {
                        wasInCasinoRef.current = true;
                        casinoZoomTransitionRef.current = {
                            active: true,
                            targetDistance: 10,
                            progress: 0
                        };
                    }
                }
            }, 100);
        }
    }, [room]);
    
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
             
             {/* Mobile Portrait Mode - No longer blocking, game works in portrait now */}
             
             {/* Ice Fishing Minigame Overlay */}
             {fishingGameActive && fishingGameSpot && (
                <IceFishingGame
                    spotId={fishingGameSpot.id}
                    playerName={playerName}
                    isDemo={fishingGameSpot.isDemo}
                    onCatch={handleFishingCatch}
                    onMiss={handleFishingMiss}
                    onClose={handleFishingGameClose}
                />
             )}
             
             {/* Casino Blackjack PvE Game Overlay */}
             {blackjackGameActive && blackjackTableId && room === 'casino_game_room' && (
                <CasinoBlackjack
                    tableId={blackjackTableId}
                    seatIndex={0}
                    onLeave={handleBlackjackLeave}
                />
             )}
             
             {/* Arcade Battleship PvE Game Overlay */}
             {arcadeGameActive && arcadeGameType === 'battleship' && (
                <BattleshipGame
                    onClose={handleArcadeGameClose}
                />
             )}
             
             {/* Banner Zoom Overlay */}
             <BannerZoomOverlay
                isOpen={bannerZoomOpen}
                onClose={() => {
                    setBannerZoomOpen(false);
                    setBannerZoomData(null);
                    bannerZoomRenderFn.current = null;
                }}
                bannerData={bannerZoomData}
                renderCanvas={bannerZoomRenderFn.current}
             />
             
             {/* Igloo Rental Guide */}
             <IglooRentalGuide
                isOpen={iglooRentalGuideOpen}
                onClose={() => setIglooRentalGuideOpen(false)}
             />
             
             {/* Gacha Drop Rates Guide */}
             <GachaDropRatesGuide
                isOpen={gachaDropRatesGuideOpen}
                onClose={() => setGachaDropRatesGuideOpen(false)}
             />
             
             {/* Penguin Creator Overlay (Wardrobe Igloo) */}
             <PenguinCreatorOverlay
                isOpen={penguinCreatorOpen}
                onClose={() => setPenguinCreatorOpen(false)}
                currentData={penguinData}
                onSave={(newData) => {
                    console.log('🎨 Saving appearance from golden igloo wardrobe:', newData);
                    
                    // Update local state immediately (for instant visual feedback)
                    if (onPenguinDataChange) {
                        onPenguinDataChange(newData);
                    }
                    
                    // Update appearance on server (broadcasts to all players)
                    // Ensure all appearance fields are included
                    const fullAppearance = {
                        ...newData,
                        // Ensure mountEnabled is preserved if it exists
                        mountEnabled: newData.mountEnabled !== undefined ? newData.mountEnabled : true
                    };
                    mpUpdateAppearance(fullAppearance);
                    console.log('📤 Sent appearance update to server:', fullAppearance);
                    
                    // Force a position update to ensure other players see us moving
                    // This fixes the issue where players appear stuck after appearance update
                    // Use setTimeout to ensure position is sent after appearance update is processed
                    setTimeout(() => {
                        if (posRef.current && sendPosition && playerRef.current) {
                            const rot = playerRef.current.rotation.y || 0;
                            const pufflePos = playerPuffleRef.current?.position || null;
                            sendPosition(
                                { x: posRef.current.x, y: posRef.current.y, z: posRef.current.z },
                                rot,
                                pufflePos
                            );
                            console.log('📍 Sent position update after appearance change (100ms delay)');
                        }
                    }, 100);
                    
                    // Send another position update after a longer delay to ensure it's received
                    setTimeout(() => {
                        if (posRef.current && sendPosition && playerRef.current) {
                            const rot = playerRef.current.rotation.y || 0;
                            const pufflePos = playerPuffleRef.current?.position || null;
                            sendPosition(
                                { x: posRef.current.x, y: posRef.current.y, z: posRef.current.z },
                                rot,
                                pufflePos
                            );
                            console.log('📍 Sent position update after appearance change (500ms delay)');
                        }
                    }, 500);
                }}
             />
             
             {/* Casino TV is now rendered in 3D space with real data from DexScreener API */}
             
             {/* Mobile PUBG-style Joystick - LEFT side (or right if left-handed) */}
             {/* Supports both portrait and landscape modes */}
             {isMobile && (
                <VirtualJoystick
                    onMove={(input) => { joystickInputRef.current = input; }}
                    size={isLandscape ? (window.innerWidth >= 768 ? 150 : 120) : 100}
                    position={gameSettings.leftHanded ? 'right' : 'left'}
                    deadzone={0.1}
                    isPortrait={!isLandscape}
                />
             )}
             
             {/* Mobile Touch Camera Control - covers entire screen, joystick handles its own touches */}
             {isMobile && (
                <TouchCameraControl
                    onRotate={(delta) => { cameraRotationRef.current = delta; }}
                    sensitivity={gameSettings.cameraSensitivity || 0.3}
                />
             )}
             
             {/* Mobile Jump Button - positioned above action buttons on opposite side of joystick */}
             {/* 50% larger for better touch targets */}
             {isMobile && (
                <button 
                    className={`absolute ${isLandscape ? 'bottom-[200px]' : 'bottom-[200px]'} ${gameSettings.leftHanded ? 'left-3' : 'right-3'} ${isLandscape ? 'w-24 h-24' : 'w-[72px] h-[72px]'} rounded-full bg-green-600/80 border-2 border-white/40 flex items-center justify-center active:scale-90 active:bg-green-500 transition-all z-30 touch-none`}
                    onTouchStart={(e) => { e.preventDefault(); jumpRequestedRef.current = true; }}
                    onTouchEnd={(e) => { e.preventDefault(); jumpRequestedRef.current = false; }}
                >
                    <span className={isLandscape ? 'text-3xl' : 'text-2xl'}>⬆️</span>
                </button>
             )}
             
             {/* Mobile Action Buttons - positioned on opposite side of joystick */}
             {/* Supports both portrait and landscape modes */}
             {isMobile && (
                <div className={`absolute ${isLandscape ? 'bottom-[70px]' : 'bottom-[80px]'} ${gameSettings.leftHanded ? 'left-3' : 'right-3'} flex flex-col gap-1.5 z-30`}>
                    {/* Chat Button */}
                    <button 
                        className={`${isLandscape ? 'w-12 h-12' : 'w-11 h-11'} rounded-full bg-cyan-600/80 border-2 border-white/40 flex items-center justify-center active:scale-90 transition-transform touch-none`}
                        onClick={() => setShowMobileChat(true)}
                    >
                        <span className={isLandscape ? 'text-xl' : 'text-lg'}>💬</span>
                    </button>
                    
                    {/* Emote Button */}
                    <button 
                        className={`${isLandscape ? 'w-12 h-12' : 'w-11 h-11'} rounded-full bg-purple-600/80 border-2 border-white/40 flex items-center justify-center active:scale-90 transition-transform touch-none`}
                        onClick={() => { setEmoteWheelOpen(true); emoteSelectionRef.current = -1; setEmoteWheelSelection(-1); }}
                    >
                        <span className={isLandscape ? 'text-xl' : 'text-lg'}>😄</span>
                    </button>
                </div>
             )}
             
             {/* HUD - Top Right */}
             <GameHUD 
                onOpenPuffles={() => setShowPufflePanel(true)}
                onOpenSettings={() => setShowSettings(true)}
                isMobile={isMobile}
                playerCount={playerCount}
                totalPlayerCount={totalPlayerCount}
                onRequestAuth={onRequestAuth}
                currentRoom={room}
                isInsideOwnedIgloo={isInsideOwnedIgloo}
                onOpenIglooSettings={() => openSettingsPanel(room)}
             />
             
             {/* Chat Log - Desktop: bottom-left, Mobile: toggleable overlay */}
             <ChatLog 
                isMobile={isMobile}
                isOpen={!isMobile || showMobileChat}
                onClose={() => setShowMobileChat(false)}
             />
             
             {/* Door/Portal Prompt - Use IglooPortal for igloos, regular Portal otherwise */}
             {/* Always get fresh iglooData from context to ensure real-time updates */}
             {nearbyPortal?.isIgloo ? (
                <IglooPortal
                    portal={nearbyPortal}
                    iglooData={getIgloo(nearbyPortal.targetRoom)}
                    isNearby={!!nearbyPortal}
                    onEnter={handlePortalEnter}
                    onViewDetails={() => openDetailsPanel(nearbyPortal.targetRoom)}
                    onViewRequirements={() => openRequirementsPanel(nearbyPortal.targetRoom)}
                    walletAddress={walletAddress}
                    isAuthenticated={isAuthenticated}
                    userClearance={userClearance?.[nearbyPortal?.targetRoom]}
                />
             ) : (
                <Portal 
                    name={nearbyPortal?.name}
                    emoji={nearbyPortal?.emoji}
                    description={nearbyPortal?.description}
                    isNearby={!!nearbyPortal}
                    onEnter={handlePortalEnter}
                    color={nearbyPortal?.targetRoom || nearbyPortal?.minigame || nearbyPortal?.teleportToRoof ? 'green' : 'gray'}
                    hasGame={!!(nearbyPortal?.targetRoom || nearbyPortal?.minigame || nearbyPortal?.teleportToRoof)}
                />
             )}
             
             {/* Slot Machine Interaction Prompt */}
             {slotInteraction && !nearbyPortal && room === 'casino_game_room' && (
                <div 
                    className={`absolute bg-gradient-to-b from-purple-900/95 to-black/95 backdrop-blur-sm rounded-xl border text-center z-20 shadow-lg ${
                        slotInteraction.isDemo 
                            ? 'border-green-500/50 shadow-green-500/20' 
                            : 'border-yellow-500/50 shadow-yellow-500/20'
                    } ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    {/* Slot machine icon */}
                    <div className="text-3xl mb-1">{slotInteraction.isDemo ? '🎁' : '🎰'}</div>
                    
                    {/* Demo badge for guests */}
                    {slotInteraction.isDemo && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-full px-3 py-0.5 mb-2 inline-block">
                            <span className="text-green-400 text-xs font-bold">✨ FREE DEMO</span>
                        </div>
                    )}
                    
                    {/* Prompt text */}
                    <p className={`retro-text mb-2 text-sm ${
                        slotInteraction.isDemo ? 'text-green-400' : 
                        slotInteraction.canSpin ? 'text-yellow-400' : 'text-gray-400'
                    }`}>
                        {slotInteraction.prompt}
                    </p>
                    
                    {/* Spin Button (only if can spin) */}
                    {slotInteraction.canSpin && (
                        <button
                            className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg ${
                                slotInteraction.isDemo
                                    ? 'bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-black'
                                    : 'bg-gradient-to-b from-yellow-400 to-yellow-600 hover:from-yellow-300 hover:to-yellow-500 text-black'
                            }`}
                            onClick={handleSlotSpin}
                            disabled={slotSpinning}
                        >
                            {slotSpinning ? '🎰 SPINNING...' : slotInteraction.isDemo ? '🎁 TRY FREE!' : '🎰 SPIN!'}
                        </button>
                    )}
                    
                    {/* FOMO hint for guests */}
                    {slotInteraction.isDemo && (
                        <p className="text-xs text-yellow-400/80 mt-2">🔑 Login to win real gold!</p>
                    )}
                </div>
             )}
             
             {/* Blackjack Table Interaction Prompt - Positioned ABOVE sit prompts */}
             {blackjackInteraction && !slotInteraction && !nearbyPortal && room === 'casino_game_room' && !blackjackGameActive && (
                <div 
                    className={`absolute bg-gradient-to-b from-green-900/95 to-emerald-950/95 backdrop-blur-sm rounded-xl border border-emerald-500/50 text-center z-30 shadow-lg shadow-emerald-500/20 ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[280px] right-28 p-3' 
                                : 'bottom-[280px] left-1/2 -translate-x-1/2 p-3 max-w-[90vw]'
                            : 'bottom-44 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    {/* Blackjack icon */}
                    <div className={`mb-1 ${isMobile && !isLandscape ? 'text-2xl' : 'text-3xl'}`}>🂡</div>
                    
                    {/* Balance display */}
                    <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-full px-3 py-0.5 mb-2 inline-block">
                        <span className={`text-yellow-400 font-bold ${isMobile && !isLandscape ? 'text-[10px]' : 'text-xs'}`}>
                            💰 {blackjackInteraction.balance?.toLocaleString() || 0}
                        </span>
                    </div>
                    
                    {/* Simple prompt - NO Press E */}
                    <p className={`retro-text mb-2 ${isMobile && !isLandscape ? 'text-xs' : 'text-sm'} ${
                        blackjackInteraction.canPlay ? 'text-emerald-400' : 'text-gray-400'
                    }`}>
                        {blackjackInteraction.canPlay ? 'Min $10 • Max $5000' : 'Need 10+ coins to play'}
                    </p>
                    
                    {/* Play Button - Click to play, no E key */}
                    {blackjackInteraction.canPlay && (
                        <button
                            className={`w-full font-bold rounded-lg retro-text transition-all active:scale-95 shadow-lg bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-black ${
                                isMobile && !isLandscape ? 'px-4 py-2 text-xs' : 'px-6 py-2 text-sm'
                            }`}
                            onClick={handleBlackjackStart}
                        >
                            🂡 PLAY BLACKJACK
                        </button>
                    )}
                    
                    {/* Can't play hint */}
                    {!blackjackInteraction.canPlay && (
                        <p className={`text-yellow-400/80 mt-2 ${isMobile && !isLandscape ? 'text-[10px]' : 'text-xs'}`}>
                            Earn coins at slot machines!
                        </p>
                    )}
                </div>
             )}
             
             {/* Ice Fishing Interaction UI */}
             {fishingInteraction && room === 'town' && (
                <div 
                    className={`absolute bg-gradient-to-b from-blue-900/95 to-cyan-900/95 backdrop-blur-sm rounded-xl border text-center z-20 shadow-lg ${
                        fishingInteraction.isDemo 
                            ? 'border-green-500/50 shadow-green-500/20' 
                            : 'border-cyan-500/50 shadow-cyan-500/20'
                    } ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-3xl mb-1">{fishingInteraction.isDemo ? '🎁' : '🎣'}</div>
                    
                    {/* Demo badge for guests */}
                    {fishingInteraction.isDemo && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-full px-3 py-0.5 mb-2 inline-block">
                            <span className="text-green-400 text-xs font-bold">✨ FREE DEMO</span>
                        </div>
                    )}
                    
                    {/* Current state indicator */}
                    {fishingInteraction.isLocalFishing && (
                        <div className={`rounded-full px-3 py-0.5 mb-2 inline-block ${
                            fishingInteraction.currentState === 'bite' 
                                ? 'bg-red-500/30 border border-red-500/50 animate-pulse' 
                                : 'bg-blue-500/20 border border-blue-500/50'
                        }`}>
                            <span className={`text-xs font-bold ${
                                fishingInteraction.currentState === 'bite' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                                {fishingInteraction.currentState === 'waiting' && '🎣 Waiting...'}
                                {fishingInteraction.currentState === 'bite' && '🐟 FISH ON!'}
                                {fishingInteraction.currentState === 'reeling' && '🎣 Reeling...'}
                                {fishingInteraction.currentState === 'casting' && '🎣 Casting...'}
                            </span>
                        </div>
                    )}
                    
                    {/* Prompt text */}
                    <p className={`retro-text mb-2 text-sm ${
                        fishingInteraction.currentState === 'bite' ? 'text-red-400 font-bold animate-bounce' :
                        fishingInteraction.isDemo ? 'text-green-400' : 
                        fishingInteraction.canFish ? 'text-cyan-400' : 'text-gray-400'
                    }`}>
                        {fishingInteraction.prompt}
                    </p>
                    
                    {/* Fish/Catch Button */}
                    {fishingInteraction.canFish && (
                        <button
                            className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg ${
                                fishingInteraction.currentState === 'bite'
                                    ? 'bg-gradient-to-b from-red-400 to-red-600 hover:from-red-300 hover:to-red-500 text-white animate-pulse'
                                    : fishingInteraction.isDemo
                                        ? 'bg-gradient-to-b from-green-400 to-green-600 hover:from-green-300 hover:to-green-500 text-black'
                                        : 'bg-gradient-to-b from-cyan-400 to-cyan-600 hover:from-cyan-300 hover:to-cyan-500 text-black'
                            }`}
                            onClick={handleFishingAction}
                        >
                            {fishingInteraction.isLocalFishing 
                                ? (fishingInteraction.currentState === 'bite' ? '🐟 CATCH!' : '🎣 Fishing...')
                                : (fishingInteraction.isDemo ? '🎁 TRY FREE!' : '🎣 FISH!')
                            }
                        </button>
                    )}
                    
                    {/* FOMO hint for guests */}
                    {fishingInteraction.isDemo && (
                        <p className="text-xs text-cyan-400/80 mt-2">🔑 Login to earn coins!</p>
                    )}
                </div>
             )}
             
             {/* Lord Fishnu Interaction UI */}
             {lordFishnuInteraction && room === 'town' && !fishingInteraction && !nearbyPortal && (
                <div 
                    className={`absolute bg-gradient-to-b from-amber-900/95 to-yellow-900/95 backdrop-blur-sm rounded-xl border border-yellow-500/50 text-center z-20 shadow-lg shadow-yellow-500/20 ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <p className="text-yellow-300 retro-text text-sm mb-2">
                        {isMobile 
                            ? '🐟 Tap to pay respects to Lord Fishnu'
                            : lordFishnuInteraction.prompt
                        }
                    </p>
                    
                    <button
                        className={`w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg ${
                            lordFishnuCooldownRef.current
                                ? 'bg-gradient-to-b from-gray-400 to-gray-600 text-gray-200 cursor-not-allowed'
                                : 'bg-gradient-to-b from-yellow-400 to-amber-600 hover:from-yellow-300 hover:to-amber-500 text-black'
                        }`}
                        onClick={handlePayRespects}
                        disabled={lordFishnuCooldownRef.current}
                    >
                        🙏 Pay Respects
                    </button>
                </div>
             )}
             
             {/* Arcade Machine Interaction UI (Battleship PvE) */}
             {arcadeInteraction && room === 'town' && !fishingInteraction && !nearbyPortal && !arcadeGameActive && (
                <div 
                    className={`absolute bg-gradient-to-b from-indigo-900/95 to-purple-900/95 backdrop-blur-sm rounded-xl border border-cyan-500/50 text-center z-20 shadow-lg shadow-cyan-500/20 ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-3xl mb-1">🚢</div>
                    <p className="text-cyan-300 retro-text text-sm mb-2">
                        {isMobile 
                            ? '🎮 Tap to play Battleship'
                            : arcadeInteraction.prompt
                        }
                    </p>
                    
                    <button
                        className="w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg bg-gradient-to-b from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white"
                        onClick={() => {
                            setArcadeGameType(arcadeInteraction.gameType || 'battleship');
                            setArcadeGameActive(true);
                            setArcadeInteraction(null);
                        }}
                    >
                        🎮 PLAY
                    </button>
                    
                    {/* Desktop hint */}
                    {!isMobile && (
                        <p className="text-white/50 text-[10px] mt-1 retro-text">or press E</p>
                    )}
                </div>
             )}
             
             {/* Wardrobe Igloo Interaction UI (Penguin Creator) */}
             {wardrobeInteraction && room === 'town' && !fishingInteraction && !nearbyPortal && !penguinCreatorOpen && (
                <div 
                    className={`absolute bg-gradient-to-b from-purple-900/95 to-indigo-900/95 backdrop-blur-sm rounded-xl border border-yellow-500/50 text-center z-20 shadow-lg shadow-yellow-500/30 ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    <div className="text-3xl mb-1">✨</div>
                    <p className="text-yellow-300 retro-text text-sm mb-2">
                        {isMobile 
                            ? '👔 Tap to customize'
                            : wardrobeInteraction.prompt
                        }
                    </p>
                    
                    <button
                        className="w-full px-6 py-2 font-bold rounded-lg retro-text text-sm transition-all active:scale-95 shadow-lg bg-gradient-to-b from-yellow-400 to-amber-600 hover:from-yellow-300 hover:to-amber-500 text-black"
                        onClick={() => {
                            setPenguinCreatorOpen(true);
                            setWardrobeInteraction(null);
                        }}
                    >
                        🐧 CUSTOMIZE
                    </button>
                    
                    {/* Desktop hint */}
                    {!isMobile && (
                        <p className="text-white/50 text-[10px] mt-1 retro-text">or press E</p>
                    )}
                </div>
             )}

             {/* Town Interaction Prompt - Clickable like dojo enter */}
             {/* Hide when blackjack interaction is showing to prevent overlap */}
             {nearbyInteraction && !nearbyPortal && !slotInteraction && !blackjackInteraction && (
                <div 
                    className={`absolute bg-black/80 backdrop-blur-sm rounded-xl border border-white/20 text-center z-20 ${
                        isMobile 
                            ? isLandscape 
                                ? 'bottom-[180px] right-28 p-3' 
                                : 'bottom-[170px] left-1/2 -translate-x-1/2 p-3'
                            : 'bottom-24 left-1/2 -translate-x-1/2 p-4'
                    }`}
                >
                    {/* Mobile-friendly message without "Press E" */}
                    <p className="text-white retro-text text-sm mb-2">
                        {isMobile 
                            ? nearbyInteraction.message.replace('Press E to ', 'Tap to ').replace('(Press E)', '')
                            : nearbyInteraction.message
                        }
                    </p>
                    
                    {/* Action Button */}
                    <button
                        className="w-full px-4 py-2 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black font-bold rounded-lg retro-text text-sm transition-all active:scale-95"
                        onClick={() => {
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
                                    dismountBack: benchData.dismountBack || false,
                                    platformHeight: benchData.platformHeight || benchData.data?.platformHeight || 0
                                };
                                setSeatedOnBench(seatData);
                                seatedRef.current = seatData;
                                
                                posRef.current.x = closestWorldX;
                                posRef.current.z = closestWorldZ;
                                posRef.current.y = seatData.seatHeight;
                                velRef.current.y = 0;
                                rotRef.current = finalRotation;
                                
                                if (playerRef.current) {
                                    playerRef.current.position.x = closestWorldX;
                                    playerRef.current.position.z = closestWorldZ;
                                    playerRef.current.position.y = seatData.seatHeight;
                                    playerRef.current.rotation.y = rotRef.current;
                                }
                                
                                emoteRef.current = { type: 'Sit', startTime: Date.now() };
                                mpSendEmote('Sit', true);
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.action === 'dj' && nearbyInteraction.benchData) {
                                // DJ at the turntable
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
                            else if (nearbyInteraction.action === 'climb_roof') {
                                // Teleport to nightclub roof
                                const roofX = CENTER_X;
                                const roofZ = CENTER_Z - 75;
                                const roofY = 15;
                                
                                posRef.current.x = roofX;
                                posRef.current.z = roofZ;
                                posRef.current.y = roofY;
                                velRef.current.y = 0;
                                
                                if (playerRef.current) {
                                    playerRef.current.position.set(roofX, roofY, roofZ);
                                }
                                
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.action === 'play_arcade') {
                                // Open arcade minigame (PvE Battleship)
                                const gameType = nearbyInteraction.gameType || 'battleship';
                                setArcadeGameType(gameType);
                                setArcadeGameActive(true);
                                setNearbyInteraction(null);
                            }
                            else if (nearbyInteraction.emote) {
                                emoteRef.current = { type: nearbyInteraction.emote, startTime: Date.now() };
                                mpSendEmote(nearbyInteraction.emote, false);
                            }
                            if (nearbyInteraction.action === 'interact_snowman') {
                                setActiveBubble(nearbyInteraction.message);
                            }
                        }}
                    >
                        {nearbyInteraction.action === 'sit' ? '🪑 SIT' : 
                         nearbyInteraction.action === 'dj' ? '🎧 DJ' :
                         nearbyInteraction.action === 'climb_roof' ? '🪜 CLIMB' :
                         nearbyInteraction.action === 'play_arcade' ? '🎮 PLAY' :
                         '✓ OK'}
                    </button>
                    
                    {/* Desktop hint only */}
                    {!isMobile && (
                        <p className="text-white/50 text-[10px] mt-1 retro-text">or press E</p>
                    )}
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
             <div className={`absolute retro-text text-white drop-shadow-md z-10 pointer-events-none ${
                 isMobile && !isLandscape ? 'top-2 left-2' : 'top-4 left-4'
             }`}>
                 <h2 className={`drop-shadow-lg ${
                     isMobile && !isLandscape ? 'text-sm' : 'text-xl'
                 } ${room === 'dojo' ? 'text-red-400' : room === 'pizza' ? 'text-orange-400' : room === 'nightclub' ? 'text-fuchsia-400' : room === 'casino_game_room' ? 'text-yellow-400' : room === 'igloo3' ? 'text-fuchsia-400' : room.startsWith('igloo') ? 'text-cyan-300' : 'text-yellow-400'}`}>
                     {room === 'dojo' ? 'THE DOJO' : room === 'pizza' ? 'PIZZA PARLOR' : room === 'nightclub' ? '🎵 THE NIGHTCLUB' : room === 'casino_game_room' ? '🎰 CASINO' : room === 'igloo3' ? '🎵 SKNY GANG' : room.startsWith('igloo') ? `IGLOO ${room.replace('igloo', '')}` : 'TOWN'}
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
                     
                     {/* Collision Debug Controls */}
                     <div className="border-t border-white/20 mt-3 pt-3">
                         <div className="text-red-400 font-bold mb-2 text-[10px]">🧱 COLLISION DEBUG</div>
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-white/70 text-[10px]">Show Wireframes:</span>
                             <button
                                 onClick={() => {
                                     const newVal = !showCollisionDebug;
                                     setShowCollisionDebug(newVal);
                                     if (townCenterRef.current) {
                                         townCenterRef.current.toggleCollisionDebug(newVal);
                                     }
                                 }}
                                 className={`text-[10px] px-2 py-0.5 rounded ${showCollisionDebug ? 'bg-red-500 text-white' : 'bg-gray-600 text-white/70'}`}
                             >
                                 {showCollisionDebug ? 'ON' : 'OFF'}
                             </button>
                         </div>
                         <div className="text-[8px] text-white/40 space-y-0.5">
                             <div>🔴 Red = Ground colliders</div>
                             <div>🟡 Yellow = Elevated colliders</div>
                             <div>🟢 Green = Triggers</div>
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
                onOpenChangelog={() => setShowChangelog(true)}
                isAuthenticated={isAuthenticated}
             />
             
             {/* Changelog Modal */}
             <ChangelogModal
                isOpen={showChangelog}
                onClose={() => setShowChangelog(false)}
             />
        </div>
    );
};

export default VoxelWorld;


