import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VOXEL_SIZE, PALETTE } from './constants';
import { ASSETS } from './assets';
import { generateBaseBody, generateFlippers, generateFoot, generateHead } from './generators';
import { IconSend } from './Icons';
import GameHUD from './components/GameHUD';
import ChatLog from './components/ChatLog';
import Portal from './components/Portal';
import PufflePanel from './components/PufflePanel';
import VirtualJoystick from './components/VirtualJoystick';
import TouchCameraControl from './components/TouchCameraControl';
import SettingsMenu from './components/SettingsMenu';
import GameManager from './engine/GameManager';
import Puffle from './engine/Puffle';
import PropsFactory from './engine/PropsFactory';
import TownCenter from './rooms/TownCenter';
import { useMultiplayer } from './multiplayer';
import { useChallenge } from './challenge';
import { MarcusGenerators, MARCUS_PALETTE } from './characters';

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
    const roomDataRef = useRef(null); // Store room data (including beach ball) for multiplayer sync
    const raycasterRef = useRef(null); // For player click detection
    const mouseRef = useRef({ x: 0, y: 0 }); // Mouse position for raycasting
    const isInMatchRef = useRef(isInMatch); // Track match state for game loop
    const matchBannersRef = useRef(new Map()); // matchId -> { sprite, canvas, ctx }
    const wizardTrailRef = useRef(null); // World-space wizard hat particle trail
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
        playerList,           // Triggers mesh creation/removal
        playersDataRef,       // Real-time position data (no re-renders)
        connectionError,      // Error if connection rejected
        joinRoom: mpJoinRoom,
        sendPosition,
        sendChat: mpSendChat,
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
    const AI_NAMES = ["Puddles", "Waddle", "Snowy", "Flipper", "IceCube", "Chilly", "Pebble", "Igloo", "Frosty", "Slippy"];
    
    // STRUCTURED CONVERSATION DIALOGUES
    const CONVERSATIONS = [
        ["Did you see SOL today?", "SOLANA is skyrocketing! 🚀", "To the moon we go!", "HODL your flippers!"],
        ["Club Penguin is back!", "I missed this place.", "Let's go dance!", "Wait for me!"],
        ["Nice outfit.", "Thanks, it's custom.", "Very stylish.", "You look cool too."],
        ["Is it cold?", "Ideally freezing.", "Perfect weather.", "Let's slide on the ice."],
        ["Waddle on!", "Waddle on!", "See you around.", "Bye for now!"],
        ["Anyone seen the dojo?", "I think it's north.", "Let's become ninjas!", "Hyah!"],
        ["Pizza time?", "Always pizza time.", "Extra fish topping?", "Gross, but okay."]
    ];

    const AI_EMOTES = ['Wave', 'Dance', 'Laugh', 'Sit', 'Breakdance'];
    
    // Game State
    const [showEmoteWheel, setShowEmoteWheel] = useState(false);
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
    
    // Snowfall refs
    const snowParticlesRef = useRef(null);
    const snowIntensityRef = useRef(0.5); // 0-1, current intensity
    const snowTargetIntensityRef = useRef(0.5); // Target intensity for smooth transitions
    
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
    
    // Room-specific portals/doors
    // Town portal positions are OFFSETS from center (centerX/Z added in checkPortals)
    // T-STREET LAYOUT - FULL MAP SCALE (220x220)
    const ROOM_PORTALS = {
        town: [
            { 
                id: 'dojo-entrance', 
                name: 'THE DOJO', 
                emoji: '⛩️', 
                description: 'Enter the Dojo',
                targetRoom: 'dojo',
                // Dojo at (0, 70), rotated π (door faces north)
                position: { x: 0, z: 62 },
                doorRadius: 3.5
            },
            // NORTH ROW IGLOOS (north of T-bar, rotation: 0, door faces SOUTH toward street)
            // Igloos at z ~ -75, doors at z ~ -70, exit spawn at z ~ -62 (on street)
            { 
                id: 'igloo-1', 
                name: 'IGLOO 1', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo1',
                position: { x: -75, z: -70 },  // Door position (south of igloo)
                doorRadius: 3,
                exitSpawnPos: { x: -75, z: -62 }  // Spawn on street when exiting
            },
            { 
                id: 'igloo-2', 
                name: 'IGLOO 2', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo2',
                position: { x: -50, z: -73 },
                doorRadius: 3,
                exitSpawnPos: { x: -50, z: -62 }
            },
            { 
                id: 'igloo-3', 
                name: 'IGLOO 3', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo3',
                position: { x: -25, z: -70 },
                doorRadius: 3,
                exitSpawnPos: { x: -25, z: -62 }
            },
            { 
                id: 'igloo-4', 
                name: 'IGLOO 4', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo4',
                position: { x: 25, z: -70 },
                doorRadius: 3,
                exitSpawnPos: { x: 25, z: -62 }
            },
            { 
                id: 'igloo-5', 
                name: 'IGLOO 5', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo1',  // Reuse igloo1 room
                position: { x: 50, z: -73 },
                doorRadius: 3,
                exitSpawnPos: { x: 50, z: -62 }  // Exit at THIS igloo, not igloo-1
            },
            { 
                id: 'igloo-6', 
                name: 'IGLOO 6', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo2',  // Reuse igloo2 room
                position: { x: 75, z: -70 },
                doorRadius: 3,
                exitSpawnPos: { x: 75, z: -62 }  // Exit at THIS igloo
            },
            // SOUTH ROW IGLOOS (south of T-bar, rotation: π, door faces NORTH toward street)
            // Igloos at z ~ -15, doors at z ~ -20, exit spawn at z ~ -28 (on street)
            { 
                id: 'igloo-7', 
                name: 'IGLOO 7', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo3',  // Reuse igloo3 room
                position: { x: -70, z: -20 },  // Door is NORTH of igloo (faces street)
                doorRadius: 3,
                exitSpawnPos: { x: -70, z: -28 }  // Exit on street
            },
            { 
                id: 'igloo-8', 
                name: 'IGLOO 8', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo4',  // Reuse igloo4 room
                position: { x: -40, z: -23 },
                doorRadius: 3,
                exitSpawnPos: { x: -40, z: -28 }
            },
            { 
                id: 'igloo-9', 
                name: 'IGLOO 9', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo1',  // Reuse igloo1 room
                position: { x: 40, z: -23 },
                doorRadius: 3,
                exitSpawnPos: { x: 40, z: -28 }
            },
            { 
                id: 'igloo-10', 
                name: 'IGLOO 10', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo2',  // Reuse igloo2 room
                position: { x: 70, z: -20 },
                doorRadius: 3,
                exitSpawnPos: { x: 70, z: -28 }
            },
            { 
                id: 'market', 
                name: 'GIFT SHOP', 
                emoji: '🛒', 
                description: 'Coming Soon',
                targetRoom: null,
                // Gift Shop at (45, 35), door faces west
                position: { x: 38, z: 35 },
                doorRadius: 3
            },
            { 
                id: 'pizza', 
                name: 'PIZZA PARLOR', 
                emoji: '🍕', 
                description: 'Enter Pizza Parlor',
                targetRoom: 'pizza',
                // Pizza at (-45, 35), door faces east
                position: { x: -38, z: 35 },
                doorRadius: 3
            }
        ],
        pizza: [
            { 
                id: 'pizza-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 14 },
                doorRadius: 3,
                // Spawn outside pizza door
                exitSpawnPos: { x: -38, z: 35 }
            }
        ],
        igloo1: [
            { 
                id: 'igloo1-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 13.5 },
                doorRadius: 3,
                exitSpawnPos: { x: -75, z: -55 }  // On street south of igloo
            }
        ],
        igloo2: [
            { 
                id: 'igloo2-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 13.5 },
                doorRadius: 3,
                exitSpawnPos: { x: -50, z: -55 }  // On street south of igloo
            }
        ],
        igloo3: [
            { 
                id: 'igloo3-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 13.5 },
                doorRadius: 3,
                exitSpawnPos: { x: 50, z: -55 }  // On street south of igloo
            }
        ],
        igloo4: [
            { 
                id: 'igloo4-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 13.5 },
                doorRadius: 3,
                exitSpawnPos: { x: 75, z: -55 }  // On street south of igloo
            }
        ],
        dojo: [
            { 
                id: 'dojo-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 16 },
                doorRadius: 3,
                // Spawn at dojo entrance in town when exiting (dojo at z: 70, door faces north)
                exitSpawnPos: { x: 0, z: 58 }
            },
            { 
                id: 'sensei', 
                name: 'SENSEI', 
                emoji: '🥋', 
                description: 'Challenge me to Card Jitsu!',
                minigame: 'card-jitsu',
                position: { x: 0, z: -10 },
                doorRadius: 3.5
            }
        ]
    };
    
    // Building/Door Definitions for town (visual only)
    // T-STREET LAYOUT - FULL MAP SCALE (220x220)
    // Dojo at base of T (south), Nightclub at top (north), shops on sides
    const BUILDINGS = [
        { 
            id: 'dojo', 
            name: 'THE DOJO', 
            emoji: '⛩️', 
            description: 'Enter to play Card Jitsu!',
            color: 0xc0392b, // Red roof
            wallColor: 0x7f8c8d,
            position: { x: 0, z: 70 },    // Far south - base of T stem
            doorRadius: 3,
            size: { w: 14, h: 8, d: 14 },
            roofType: 'pagoda',
            rotation: Math.PI  // Door faces north toward campfire
        },
        { 
            id: 'market', 
            name: 'GIFT SHOP', 
            emoji: '🛒', 
            description: 'Browse hats & items (coming soon)',
            gameId: null,
            color: 0xf39c12, // Gold roof
            wallColor: 0xecf0f1,
            position: { x: 45, z: 35 },   // East side of T stem
            doorRadius: 3,
            size: { w: 10, h: 6, d: 10 },
            roofType: 'flat',
            rotation: -Math.PI / 2  // Door faces west toward street
        },
        { 
            id: 'plaza', 
            name: 'PIZZA PARLOR', 
            emoji: '🍕', 
            description: 'Pizza minigame coming soon!',
            gameId: null,
            color: 0xe74c3c, // Red/orange
            wallColor: 0xf5deb3,
            position: { x: -45, z: 35 },  // West side of T stem
            doorRadius: 3,
            size: { w: 12, h: 7, d: 10 },
            roofType: 'slanted',
            rotation: Math.PI / 2  // Door faces east toward street
        }
    ];
    
    // City Generation - EXPANDED for T-street layout
    const CITY_SIZE = 55;  // 55 * 4 = 220 (expanded from 40 * 4 = 160)
    const BUILDING_SCALE = 4;
    
    // Create Chat Bubble Sprite
    // Height constants for different character types (raised higher to be less intrusive)
    const BUBBLE_HEIGHT_PENGUIN = 5.8;
    const BUBBLE_HEIGHT_MARCUS = 6.8; // Marcus is taller
    const NAME_HEIGHT_PENGUIN = 5;
    const NAME_HEIGHT_MARCUS = 6;
    
    const createChatSprite = (message, height = BUBBLE_HEIGHT_PENGUIN) => {
        const THREE = window.THREE;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 48;
        const padding = 20;
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        // Word Wrap Logic - handles both words and very long strings without spaces
        const maxLineWidth = 500; 
        const maxCharsPerLine = 25; // Force break for very long words
        let lines = [];
        
        // First, break very long words into chunks
        const breakLongWord = (word) => {
            const chunks = [];
            while (word.length > maxCharsPerLine) {
                chunks.push(word.slice(0, maxCharsPerLine));
                word = word.slice(maxCharsPerLine);
            }
            if (word.length > 0) chunks.push(word);
            return chunks;
        };
        
        const words = message.split(' ');
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            let word = words[i];
            
            // Break very long words
            if (word.length > maxCharsPerLine) {
                // Push current line if not empty
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = '';
                }
                // Add broken word chunks as separate lines
                const chunks = breakLongWord(word);
                for (let j = 0; j < chunks.length - 1; j++) {
                    lines.push(chunks[j]);
                }
                currentLine = chunks[chunks.length - 1];
            } else {
                const testLine = currentLine ? currentLine + " " + word : word;
                const width = ctx.measureText(testLine).width;
                if (width < maxLineWidth) {
                    currentLine = testLine;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            }
        }
        if (currentLine) lines.push(currentLine);
        
        // Ensure at least one line
        if (lines.length === 0) lines.push(message.slice(0, maxCharsPerLine) || ' ');
        
        // Canvas Dimensions
        const textHeight = lines.length * (fontSize * 1.2);
        const textWidth = lines.length > 1 ? maxLineWidth : ctx.measureText(lines[0]).width;
        
        const w = textWidth + padding * 3;
        const h = textHeight + padding * 3;
        
        canvas.width = w;
        canvas.height = h;
        
        // Re-apply font context after resize
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        
        // Draw Bubble Background
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 6;
        
        const r = 25;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w-r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h-r);
        ctx.quadraticCurveTo(w, h, w-r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h-r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
        
        // Draw Text
        ctx.fillStyle = 'black';
        lines.forEach((line, i) => {
            ctx.fillText(line, w/2, padding + (i * fontSize * 1.2));
        });
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }); 
        const sprite = new THREE.Sprite(material);
        
        // Scale down larger messages to prevent screen coverage
        // Base scale for short messages, shrink for longer ones
        const baseScale = 0.015;
        const messageLength = message.length;
        const lineCount = lines.length;
        
        // Scale factor: shrink based on length and line count
        // Short messages (< 30 chars, 1 line): full size
        // Medium messages (30-80 chars, 1-2 lines): 80% size
        // Long messages (80-150 chars, 2-4 lines): 60% size  
        // Very long messages (150+ chars, 4+ lines): 45% size
        let scaleFactor = 1.0;
        if (messageLength > 150 || lineCount > 4) {
            scaleFactor = 0.45;
        } else if (messageLength > 80 || lineCount > 2) {
            scaleFactor = 0.60;
        } else if (messageLength > 30 || lineCount > 1) {
            scaleFactor = 0.80;
        }
        
        const scale = baseScale * scaleFactor;
        sprite.scale.set(w * scale, h * scale, 1);
        sprite.position.set(0, height, 0);
        sprite.renderOrder = 999;
        
        return sprite;
    };
    
    // Create Igloo Occupancy Bubble Sprite
    const createIglooOccupancySprite = (count) => {
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
        
        // Re-apply font after resize
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        
        // Draw bubble background - semi-transparent dark blue
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
        
        // Draw text
        ctx.fillStyle = count > 0 ? '#ffffff' : '#aaaaaa';
        ctx.fillText(text, w / 2, h / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            depthTest: false, 
            depthWrite: false,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        
        const scale = 0.012;
        sprite.scale.set(w * scale, h * scale, 1);
        sprite.position.y = 8; // Height above igloo
        sprite.renderOrder = 998;
        sprite.visible = false; // Start hidden, show when player is close
        
        return sprite;
    };

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
        
        // Helper function to create wizard hat particle pool for a player
        // Each player with wizard hat gets their own pool (not shared)
        const createWizardTrailPool = () => {
            const trailGroup = new THREE.Group();
            trailGroup.name = 'wizard_trail_pool';
            const WIZARD_PARTICLE_COUNT = 50; // Particles per player
            const colors = [0xFF69B4, 0x9400D3, 0x8A2BE2, 0xFFD700, 0x00CED1, 0xFF1493];
            for (let i = 0; i < WIZARD_PARTICLE_COUNT; i++) {
                const size = (0.08 + Math.random() * 0.06);
                const pGeo = new THREE.SphereGeometry(size, 8, 8);
                const pMat = new THREE.MeshBasicMaterial({ 
                    color: colors[Math.floor(Math.random() * colors.length)], 
                    transparent: true, 
                    opacity: 0
                });
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.visible = false;
                pMesh.userData.active = false;
                pMesh.userData.birthTime = 0;
                pMesh.userData.lifespan = 3;
                trailGroup.add(pMesh);
            }
            trailGroup.userData.lastSpawnTime = 0;
            trailGroup.userData.nextParticleIndex = 0;
            return trailGroup;
        };
        
        // Store the factory function for later use
        wizardTrailRef.current = { createPool: createWizardTrailPool, pools: new Map() };
        
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        cameraRef.current = camera;
        camera.position.set(0, 15, -15);
        
        // Detect Mac for performance optimizations (WebGL via Metal causes issues on Safari)
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0 || 
                      navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
        
        // Log for debugging
        console.log('🖥️ Platform:', navigator.platform, '| isMac:', isMac);
        
        // Mac-specific renderer settings (PC/Android unchanged)
        // Fixes WebGL via Metal performance issues on Safari/macOS
        const renderer = new THREE.WebGLRenderer({ 
            antialias: isMac ? false : true, // Mac: false, Others: true
            powerPreference: 'high-performance'
        });
        
        // Mac: dpr capped at 1.5, Others: capped at 2
        const dpr = isMac ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(dpr);
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Mac: flat rendering (no tone mapping) - fixes Metal rendering issues
        if (isMac) {
            renderer.toneMapping = THREE.NoToneMapping;
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            console.log('🍎 Mac detected - applied performance fixes: antialias=false, dpr=1.5, flat rendering');
        }
        
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap;
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

        // Lighting - Arctic daylight (cool, icy blue tones)
        // Removed hemisphere light that was causing ground glares
        const ambient = new THREE.AmbientLight(0xC0E0F0, 0.5); // Cool icy ambient
        scene.add(ambient);
        ambientLightRef.current = ambient;
        
        const sunLight = new THREE.DirectionalLight(0xF8F8FF, 1.0); // Cold bright sun
        sunLight.position.set(80, 100, 60);
        sunLight.castShadow = true;
        // OPTIMIZED: Reduced shadow map from 2048 to 1024 (still high quality, much faster)
        sunLight.shadow.mapSize.set(1024, 1024);
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.bias = -0.0005; // Reduce shadow acne
        scene.add(sunLight);
        sunLightRef.current = sunLight;
        
        // ==================== SNOWFALL PARTICLE SYSTEM ====================
        const createSnowfall = () => {
            const particleCount = 1500; // OPTIMIZED: Reduced from 2500 (still looks great)
            const positions = new Float32Array(particleCount * 3);
            const velocities = new Float32Array(particleCount * 3);
            const sizes = new Float32Array(particleCount);
            
            const spreadX = 120; // Area width around player
            const spreadZ = 120; // Area depth around player
            const height = 50; // Fall height
            
            // Get initial player position (center of town if not set)
            const spawnX = posRef.current?.x || 50;
            const spawnZ = posRef.current?.z || 50;
            
            for (let i = 0; i < particleCount; i++) {
                // Random position around spawn point (world coordinates)
                positions[i * 3] = spawnX + (Math.random() - 0.5) * spreadX;
                positions[i * 3 + 1] = Math.random() * height + 5; // Start above ground
                positions[i * 3 + 2] = spawnZ + (Math.random() - 0.5) * spreadZ;
                
                // Random velocity (downward with slight drift)
                velocities[i * 3] = (Math.random() - 0.5) * 0.3; // X drift
                velocities[i * 3 + 1] = -(3 + Math.random() * 4); // Fall speed (faster)
                velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3; // Z drift
                
                // Random sizes for depth effect
                sizes[i] = 0.2 + Math.random() * 0.25;
            }
            
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
            geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            
            const material = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.3, // Visible snowflakes
                transparent: true,
                opacity: 0.9,
                depthWrite: false,
                sizeAttenuation: true
            });
            
            const snow = new THREE.Points(geometry, material);
            snow.name = 'snowfall';
            snow.frustumCulled = false; // Always render
            snow.renderOrder = 999; // Render on top
            scene.add(snow);
            
            console.log('❄️ Snowfall system initialized with', particleCount, 'particles');
            
            return { particles: snow, velocities, spreadX, spreadZ, height };
        };
        
        const snowSystem = createSnowfall();
        snowParticlesRef.current = snowSystem;
        
        // Randomize initial snow intensity
        const initialIntensity = 0.5 + Math.random() * 0.3; // 0.5 to 0.8
        snowIntensityRef.current = initialIntensity;
        snowTargetIntensityRef.current = initialIntensity;
        
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
            const townCenterX = (CITY_SIZE / 2) * BUILDING_SCALE;
            const townCenterZ = (CITY_SIZE / 2) * BUILDING_SCALE;
            
            const iglooData = [
                { id: 'igloo1', x: -75, z: -75, room: 'igloo1' },
                { id: 'igloo2', x: -50, z: -78, room: 'igloo2' },
                { id: 'igloo3', x: -25, z: -75, room: 'igloo3' },
                { id: 'igloo4', x: 25, z: -75, room: 'igloo4' },
                { id: 'igloo5', x: 50, z: -78, room: 'igloo1' },
                { id: 'igloo6', x: 75, z: -75, room: 'igloo2' },
                { id: 'igloo7', x: -70, z: -15, room: 'igloo3' },
                { id: 'igloo8', x: -40, z: -18, room: 'igloo4' },
                { id: 'igloo9', x: 40, z: -18, room: 'igloo1' },
                { id: 'igloo10', x: 70, z: -15, room: 'igloo2' },
            ];
            
            // Clear any existing sprites
            iglooOccupancySpritesRef.current.forEach(sprite => {
                if (sprite.parent) sprite.parent.remove(sprite);
            });
            iglooOccupancySpritesRef.current.clear();
            
            // Create sprite for each igloo
            iglooData.forEach(igloo => {
                const sprite = createIglooOccupancySprite(0); // Start with 0 (empty)
                sprite.position.set(
                    townCenterX + igloo.x,
                    8, // Height above igloo
                    townCenterZ + igloo.z
                );
                sprite.userData.iglooId = igloo.id;
                sprite.userData.iglooRoom = igloo.room;
                sprite.userData.iglooX = townCenterX + igloo.x;
                sprite.userData.iglooZ = townCenterZ + igloo.z;
                sprite.visible = false; // Start hidden, show when player is close
                scene.add(sprite);
                iglooOccupancySpritesRef.current.set(igloo.id, sprite);
            });
            
            console.log(`Created ${iglooOccupancySpritesRef.current.size} igloo occupancy sprites`);
            
            return { butterflyGroup: null, townCenter }; // No butterflies in arctic
        };
        
        // Generate Dojo room scenery (50% bigger)
        const generateDojoRoom = () => {
            const DOJO_SIZE = 36; // 50% bigger than 24
            scene.background = new THREE.Color(0x1a0808);
            
            // Simple collision map for dojo (just bounds)
            const map = [];
            for(let x = 0; x < 10; x++) {
                map[x] = [];
                for(let z = 0; z < 10; z++) {
                    map[x][z] = 2; // All walkable
                }
            }
            mapRef.current = map;
            
            // Floor - wooden planks texture look
            const floorGeo = new THREE.PlaneGeometry(DOJO_SIZE, DOJO_SIZE);
            const floorMat = new THREE.MeshStandardMaterial({ color: 0x5D3A1A, roughness: 0.9 });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.receiveShadow = true;
            scene.add(floor);
            
            // Floor plank lines for detail
            for (let i = -DOJO_SIZE/2; i < DOJO_SIZE/2; i += 2) {
                const lineGeo = new THREE.BoxGeometry(DOJO_SIZE, 0.02, 0.05);
                const lineMat = new THREE.MeshStandardMaterial({ color: 0x3d2515 });
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.position.set(0, 0.01, i);
                scene.add(line);
            }
            
            // Central tatami mat area
            const matGeo = new THREE.BoxGeometry(16, 0.1, 18);
            const matMat = new THREE.MeshStandardMaterial({ color: 0x9acd32, roughness: 0.8 });
            const centerMat = new THREE.Mesh(matGeo, matMat);
            centerMat.position.set(0, 0.05, 0);
            scene.add(centerMat);
            
            // Tatami mat pattern lines
            [-4, 0, 4].forEach(x => {
                const tLine = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.12, 18),
                    new THREE.MeshStandardMaterial({ color: 0x7ab32a })
                );
                tLine.position.set(x, 0.06, 0);
                scene.add(tLine);
            });
            
            // Walls with traditional Japanese dark wood
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d1810, roughness: 0.8 });
            
            const backWall = new THREE.Mesh(new THREE.BoxGeometry(DOJO_SIZE, 14, 0.5), wallMat);
            backWall.position.set(0, 7, -DOJO_SIZE/2);
            scene.add(backWall);
            
            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 14, DOJO_SIZE), wallMat);
            leftWall.position.set(-DOJO_SIZE/2, 7, 0);
            scene.add(leftWall);
            
            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 14, DOJO_SIZE), wallMat);
            rightWall.position.set(DOJO_SIZE/2, 7, 0);
            scene.add(rightWall);
            
            // Front wall with door opening
            const frontWall1 = new THREE.Mesh(new THREE.BoxGeometry(12, 14, 0.5), wallMat);
            frontWall1.position.set(-12, 7, DOJO_SIZE/2);
            scene.add(frontWall1);
            const frontWall2 = new THREE.Mesh(new THREE.BoxGeometry(12, 14, 0.5), wallMat);
            frontWall2.position.set(12, 7, DOJO_SIZE/2);
            scene.add(frontWall2);
            // Door header
            const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 0.5), wallMat);
            doorHeader.position.set(0, 12, DOJO_SIZE/2);
            scene.add(doorHeader);
            
            // Red pillars (larger, more ornate)
            const pillarGeo = new THREE.CylinderGeometry(0.8, 0.9, 14, 12);
            const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
            const pillarPositions = [
                [-15, -15], [15, -15], [-15, 15], [15, 15],
                [-15, 0], [15, 0] // Extra pillars on sides
            ];
            pillarPositions.forEach(([x, z]) => {
                const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.set(x, 7, z);
                pillar.castShadow = true;
                scene.add(pillar);
                
                // Pillar base
                const base = new THREE.Mesh(
                    new THREE.CylinderGeometry(1.1, 1.2, 0.5, 12),
                    pillarMat
                );
                base.position.set(x, 0.25, z);
                scene.add(base);
                
                // Pillar top
                const top = new THREE.Mesh(
                    new THREE.CylinderGeometry(1.1, 0.8, 0.5, 12),
                    pillarMat
                );
                top.position.set(x, 13.75, z);
                scene.add(top);
            });
            
            // Decorative scrolls on back wall
            const scrollPositions = [-10, -5, 0, 5, 10];
            scrollPositions.forEach(x => {
                // Scroll backing
                const scrollBack = new THREE.Mesh(
                    new THREE.BoxGeometry(3.5, 6, 0.1),
                    new THREE.MeshStandardMaterial({ color: 0xf5deb3 })
                );
                scrollBack.position.set(x, 8, -DOJO_SIZE/2 + 0.3);
                scene.add(scrollBack);
                
                // Scroll rod top
                const rod = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 0.15, 4, 8),
                    new THREE.MeshStandardMaterial({ color: 0x4a2c00 })
                );
                rod.rotation.z = Math.PI / 2;
                rod.position.set(x, 11.2, -DOJO_SIZE/2 + 0.35);
                scene.add(rod);
            });
            
            // Battle/play area mat (larger)
            const battleMatGeo = new THREE.CircleGeometry(6, 32);
            const battleMatMat = new THREE.MeshStandardMaterial({ color: 0x4a1a1a });
            const battleMat = new THREE.Mesh(battleMatGeo, battleMatMat);
            battleMat.rotation.x = -Math.PI / 2;
            battleMat.position.set(0, 0.02, 2);
            scene.add(battleMat);
            
            // Element symbols on battle mat (Card Jitsu elements)
            const symbolSize = 1;
            [
                { color: 0xff4400, pos: [-3, 0], emoji: '🔥' },  // Fire
                { color: 0x0066ff, pos: [3, 0], emoji: '💧' },   // Water  
                { color: 0x88ddff, pos: [0, 4], emoji: '❄️' }    // Snow
            ].forEach(({ color, pos }) => {
                const sym = new THREE.Mesh(
                    new THREE.CircleGeometry(symbolSize, 16),
                    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
                );
                sym.rotation.x = -Math.PI / 2;
                sym.position.set(pos[0], 0.03, pos[1]);
                scene.add(sym);
            });
            
            // Sensei cushion (meditation pillow) - sensei penguin added after buildPenguinMesh
            const cushionGeo = new THREE.CylinderGeometry(1.8, 2, 0.4, 16);
            const cushionMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
            const cushion = new THREE.Mesh(cushionGeo, cushionMat);
            cushion.position.set(0, 0.2, -12);
            cushion.name = 'sensei_cushion';
            scene.add(cushion);
            
            // Sensei glow (interact zone)
            const senseiGlow = new THREE.Mesh(
                new THREE.CircleGeometry(3.5, 16),
                new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.15 })
            );
            senseiGlow.rotation.x = -Math.PI / 2;
            senseiGlow.position.set(0, 0.01, -10);
            senseiGlow.name = 'sensei_glow';
            scene.add(senseiGlow);
            
            // Exit door glow
            const exitGlow = new THREE.Mesh(
                new THREE.CircleGeometry(3, 16),
                new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.15 })
            );
            exitGlow.rotation.x = -Math.PI / 2;
            exitGlow.position.set(0, 0.01, 16);
            exitGlow.name = 'exit_glow';
            scene.add(exitGlow);
            
            // Torch lights on walls (more dramatic)
            const torchPositions = [
                [-15, 5, -15], [15, 5, -15],
                [-15, 5, 0], [15, 5, 0],
                [-15, 5, 15], [15, 5, 15]
            ];
            torchPositions.forEach(([x, y, z]) => {
                // Light
                const torch = new THREE.PointLight(0xff6622, 1.5, 15);
                torch.position.set(x, y, z);
                scene.add(torch);
                
                // Torch holder visual
                const holder = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 0.2, 0.8, 8),
                    new THREE.MeshStandardMaterial({ color: 0x4a2c00 })
                );
                holder.position.set(x * 0.95, y - 1, z * 0.95);
                scene.add(holder);
                
                // Flame glow
                const flame = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xff6622 })
                );
                flame.position.set(x * 0.95, y - 0.3, z * 0.95);
                scene.add(flame);
            });
            
            // Ambient fill light
            const ambientFill = new THREE.PointLight(0xffeedd, 0.3, 50);
            ambientFill.position.set(0, 10, 0);
            scene.add(ambientFill);
            
            // Store dojo bounds for collision
            return { 
                bounds: { minX: -DOJO_SIZE/2 + 1, maxX: DOJO_SIZE/2 - 1, minZ: -DOJO_SIZE/2 + 1, maxZ: DOJO_SIZE/2 - 1 },
                spawnPos: { x: 0, z: 14 }  // Spawn near exit
            };
        };
        
        // ==================== PIZZA PARLOR INTERIOR ====================
        const generatePizzaRoom = () => {
            const PIZZA_SIZE = 32; // Room dimensions
            scene.background = new THREE.Color(0x0a0502); // Very dark - moody atmosphere
            
            // Simple collision map
            const map = [];
            for(let x = 0; x < 10; x++) {
                map[x] = [];
                for(let z = 0; z < 10; z++) {
                    map[x][z] = 2; // All walkable
                }
            }
            mapRef.current = map;
            
            // --- FLOOR: Red & white checkered tiles ---
            const tileSize = 2;
            const tilesPerSide = Math.ceil(PIZZA_SIZE / tileSize);
            for (let tx = -tilesPerSide/2; tx < tilesPerSide/2; tx++) {
                for (let tz = -tilesPerSide/2; tz < tilesPerSide/2; tz++) {
                    const isWhite = (tx + tz) % 2 === 0;
                    const tileGeo = new THREE.BoxGeometry(tileSize, 0.1, tileSize);
                    const tileMat = new THREE.MeshStandardMaterial({ 
                        color: isWhite ? 0xf5f5f5 : 0xcc2222,
                        roughness: 0.3
                    });
                    const tile = new THREE.Mesh(tileGeo, tileMat);
                    tile.position.set(tx * tileSize + tileSize/2, 0, tz * tileSize + tileSize/2);
                    tile.receiveShadow = true;
                    scene.add(tile);
                }
            }
            
            // --- WALLS: Dark, moody Italian restaurant style ---
            const wallMat = new THREE.MeshStandardMaterial({ color: 0x3d2010, roughness: 0.8 }); // Dark brown
            const wallAccentMat = new THREE.MeshStandardMaterial({ color: 0x5a3520, roughness: 0.7 }); // Dark accent
            
            // Back wall
            const backWall = new THREE.Mesh(new THREE.BoxGeometry(PIZZA_SIZE, 10, 0.5), wallMat);
            backWall.position.set(0, 5, -PIZZA_SIZE/2);
            scene.add(backWall);
            
            // Side walls
            const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, PIZZA_SIZE), wallMat);
            leftWall.position.set(-PIZZA_SIZE/2, 5, 0);
            scene.add(leftWall);
            
            const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 10, PIZZA_SIZE), wallMat);
            rightWall.position.set(PIZZA_SIZE/2, 5, 0);
            scene.add(rightWall);
            
            // Front wall with door opening
            const frontWall1 = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 0.5), wallMat);
            frontWall1.position.set(-11, 5, PIZZA_SIZE/2);
            scene.add(frontWall1);
            const frontWall2 = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 0.5), wallMat);
            frontWall2.position.set(11, 5, PIZZA_SIZE/2);
            scene.add(frontWall2);
            // Door header
            const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(12, 3, 0.5), wallMat);
            doorHeader.position.set(0, 8.5, PIZZA_SIZE/2);
            scene.add(doorHeader);
            
            // --- CEILING ---
            const ceilingGeo = new THREE.PlaneGeometry(PIZZA_SIZE, PIZZA_SIZE);
            const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0503, roughness: 0.95 }); // Very dark
            const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
            ceiling.rotation.x = Math.PI / 2;
            ceiling.position.set(0, 10, 0);
            scene.add(ceiling);
            
            // --- COUNTER/BAR AREA (snug against back wall) ---
            const counterMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.5 });
            const COUNTER_Z = -PIZZA_SIZE/2 + 2.5; // Snug against back wall (-16 + 2.5 = -13.5)
            const COUNTER_DEPTH = 3;
            const COUNTER_HEIGHT = 2.5; // Lowered to match shorter stools
            const STOOL_Z = COUNTER_Z + COUNTER_DEPTH/2 + 1.5; // In front of counter
            
            // Main counter top
            const counterTop = new THREE.Mesh(new THREE.BoxGeometry(20, 0.25, COUNTER_DEPTH), counterMat);
            counterTop.position.set(0, COUNTER_HEIGHT, COUNTER_Z);
            counterTop.castShadow = true;
            counterTop.receiveShadow = true;
            scene.add(counterTop);
            
            // Counter front panel (customer side)
            const counterFront = new THREE.Mesh(new THREE.BoxGeometry(20, COUNTER_HEIGHT, 0.3), wallAccentMat);
            counterFront.position.set(0, COUNTER_HEIGHT / 2, COUNTER_Z + COUNTER_DEPTH/2);
            scene.add(counterFront);
            
            // Counter back panel (against wall)
            const counterBack = new THREE.Mesh(new THREE.BoxGeometry(20, COUNTER_HEIGHT, 0.3), wallAccentMat);
            counterBack.position.set(0, COUNTER_HEIGHT / 2, COUNTER_Z - COUNTER_DEPTH/2);
            scene.add(counterBack);
            
            // Counter sides
            const counterSideL = new THREE.Mesh(new THREE.BoxGeometry(0.3, COUNTER_HEIGHT, COUNTER_DEPTH), wallAccentMat);
            counterSideL.position.set(-10, COUNTER_HEIGHT / 2, COUNTER_Z);
            scene.add(counterSideL);
            
            const counterSideR = new THREE.Mesh(new THREE.BoxGeometry(0.3, COUNTER_HEIGHT, COUNTER_DEPTH), wallAccentMat);
            counterSideR.position.set(10, COUNTER_HEIGHT / 2, COUNTER_Z);
            scene.add(counterSideR);
            
            // --- PIZZA OVEN (on back wall, behind counter) ---
            const ovenMat = new THREE.MeshStandardMaterial({ color: 0x8B0000, roughness: 0.4 });
            const ovenBody = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 2), ovenMat);
            ovenBody.position.set(-5, 2.5, -PIZZA_SIZE/2 + 1);
            ovenBody.castShadow = true;
            scene.add(ovenBody);
            
            // Oven opening (dark)
            const ovenOpening = new THREE.Mesh(
                new THREE.BoxGeometry(3, 2.5, 0.1),
                new THREE.MeshBasicMaterial({ color: 0x1a0500 })
            );
            ovenOpening.position.set(-5, 2, -PIZZA_SIZE/2 + 2.1);
            scene.add(ovenOpening);
            
            // Oven fire glow - warm but not too bright
            const ovenGlow = new THREE.PointLight(0xff3300, 2.5, 8);
            ovenGlow.position.set(-5, 2, -PIZZA_SIZE/2 + 1.5);
            ovenGlow.castShadow = true;
            ovenGlow.shadow.mapSize.width = 256;
            ovenGlow.shadow.mapSize.height = 256;
            scene.add(ovenGlow);
            
            // Inner oven embers glow
            const emberGlow = new THREE.PointLight(0xff5500, 1.0, 3);
            emberGlow.position.set(-5, 1.5, -PIZZA_SIZE/2 + 1);
            scene.add(emberGlow);
            
            // --- BAR STOOLS (along counter) ---
            const barStoolPositions = [-7, -4, -1, 2, 5, 8];
            const STOOL_SEAT_HEIGHT = 1.8; // Lowered so players can jump on them
            const createBarStool = (x, z, faceDirection = 0) => {
                const stoolGroup = new THREE.Group();
                const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.3 });
                const seatMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.5 });
                
                // Base (wider for stability)
                const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.1, 12), metalMat);
                base.position.y = 0.05;
                stoolGroup.add(base);
                
                // Stool leg (shorter for jumpable height)
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, STOOL_SEAT_HEIGHT - 0.2, 8), metalMat);
                leg.position.y = (STOOL_SEAT_HEIGHT - 0.2) / 2;
                stoolGroup.add(leg);
                
                // Foot rest ring
                const footRest = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 8, 16), metalMat);
                footRest.rotation.x = Math.PI / 2;
                footRest.position.y = 0.5;
                stoolGroup.add(footRest);
                
                // Seat (padded) - jumpable height
                const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.45, 0.25, 16), seatMat);
                seat.position.y = STOOL_SEAT_HEIGHT;
                seat.castShadow = true;
                seat.receiveShadow = true;
                stoolGroup.add(seat);
                
                stoolGroup.position.set(x, 0, z);
                stoolGroup.rotation.y = faceDirection;
                return stoolGroup;
            };
            
            // Bar stools along counter (facing counter)
            barStoolPositions.forEach(x => {
                const stool = createBarStool(x, STOOL_Z, Math.PI); // Face the counter (north)
                scene.add(stool);
            });
            
            // --- ROUND TABLES WITH CHAIRS ---
            const tablePositions = [
                { x: -8, z: 2 },
                { x: 8, z: 2 },
                { x: -8, z: 9 },
                { x: 8, z: 9 }
            ];
            
            const createRoundTable = (tableX, tableZ, numChairs = 4) => {
                const tableGroup = new THREE.Group();
                const woodMat = new THREE.MeshStandardMaterial({ color: 0x5D3A1A, roughness: 0.6 });
                const tableclothMat = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.7 });
                
                // Table leg (pedestal style)
                const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 2.5, 8), woodMat);
                pedestal.position.y = 1.25;
                pedestal.castShadow = true;
                tableGroup.add(pedestal);
                
                // Table top (thicker for collision)
                const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.2, 24), woodMat);
                tableTop.position.y = 2.6;
                tableTop.castShadow = true;
                tableGroup.add(tableTop);
                
                // Red checkered tablecloth (slightly larger)
                const cloth = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.3, 0.05, 24), tableclothMat);
                cloth.position.y = 2.72;
                tableGroup.add(cloth);
                
                tableGroup.position.set(tableX, 0, tableZ);
                return tableGroup;
            };
            
            // Create a chair as a separate object (for better collision/interaction)
            // Chair faces -Z direction when rotation.y = 0 (back at +Z)
            // TALL chairs to match table height (table top at y=3.5)
            const createChair = (x, z, faceAngle) => {
                const chairGroup = new THREE.Group();
                const chairWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2810, roughness: 0.6 });
                
                // Chair seat (raised to match table height)
                const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), chairWoodMat);
                chairSeat.position.y = 2.8; // Raised from 1.5 to match table
                chairSeat.castShadow = true;
                chairGroup.add(chairSeat);
                
                // Chair back (taller, positioned above seat)
                const chairBack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.15), chairWoodMat);
                chairBack.position.set(0, 3.8, -0.52); // Raised to match new seat height
                chairGroup.add(chairBack);
                
                // Chair legs (longer to support higher seat)
                for (let lx = -0.45; lx <= 0.45; lx += 0.9) {
                    for (let lz = -0.45; lz <= 0.45; lz += 0.9) {
                        const chairLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 0.1), chairWoodMat);
                        chairLeg.position.set(lx, 1.4, lz); // Taller legs
                        chairGroup.add(chairLeg);
                    }
                }
                
                chairGroup.position.set(x, 0, z);
                chairGroup.rotation.y = faceAngle; // Chair faces this direction (+Z local → world faceAngle)
                return chairGroup;
            };
            
            // Track all chair positions for collision/interaction
            const chairData = [];
            
            // Place tables and their chairs
            tablePositions.forEach(table => {
                const tableGroup = createRoundTable(table.x, table.z, 4);
                scene.add(tableGroup);
                
                // Create 4 chairs around each table (at cardinal directions)
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2; // 0, π/2, π, 3π/2 (N, E, S, W from table)
                    const chairDist = 3;
                    const chairX = table.x + Math.cos(angle) * chairDist;
                    const chairZ = table.z + Math.sin(angle) * chairDist;
                    
                    // Calculate direction from chair to table center for rotation
                    const dirX = table.x - chairX;
                    const dirZ = table.z - chairZ;
                    const faceAngle = Math.atan2(dirX, dirZ); // Face toward table
                    
                    const chair = createChair(chairX, chairZ, faceAngle);
                    scene.add(chair);
                    
                    // Store chair data for collision and sitting
                    chairData.push({
                        type: 'chair',
                        position: { x: chairX, z: chairZ },
                        seatHeight: 2.9, // Chair seat mesh at y=2.8, penguin sits at 2.9+0.5=3.4
                        faceAngle: faceAngle,
                        radius: 0.7
                    });
                }
            });
            
            // --- DECORATIONS ---
            
            // Hanging pendant lights - moody, focused lighting
            const createPendantLight = (x, z, intensity = 2.5, distance = 10, castShadow = false) => {
                const lightGroup = new THREE.Group();
                
                // Cord
                const cord = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02, 0.02, 3, 8),
                    new THREE.MeshBasicMaterial({ color: 0x222222 })
                );
                cord.position.y = 8.5;
                lightGroup.add(cord);
                
                // Lamp shade (cone) - wide end DOWN for proper lamp shade
                const shade = new THREE.Mesh(
                    new THREE.ConeGeometry(0.8, 1, 16, 1, true),
                    new THREE.MeshStandardMaterial({ 
                        color: 0x8B0000, // Darker red
                        side: THREE.DoubleSide,
                        roughness: 0.8,
                        emissive: 0x220000,
                        emissiveIntensity: 0.2
                    })
                );
                shade.position.y = 7.5;
                lightGroup.add(shade);
                
                // Light bulb glow (warm, inside the shade)
                const bulb = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xffaa55 })
                );
                bulb.position.y = 7.0;
                lightGroup.add(bulb);
                
                // Point light - warm focused pool of light
                const light = new THREE.PointLight(0xff9944, intensity, distance);
                light.position.y = 7;
                light.castShadow = castShadow;
                if (castShadow) {
                    light.shadow.mapSize.width = 512;
                    light.shadow.mapSize.height = 512;
                }
                lightGroup.add(light);
                
                lightGroup.position.set(x, 0, z);
                return lightGroup;
            };
            
            // Lights over tables - dim pools of warm light in the darkness
            scene.add(createPendantLight(-8, 2, 2.0, 8, true));   // Table 1 - casts shadows
            scene.add(createPendantLight(8, 2, 2.0, 8));          // Table 2
            scene.add(createPendantLight(-8, 9, 2.0, 8));         // Table 3
            scene.add(createPendantLight(8, 9, 2.0, 8, true));    // Table 4 - casts shadows
            
            // --- BAR LIGHTING ---
            // Pendant lights above the bar counter with cords
            const barLightGroup = new THREE.Group();
            
            // Multiple pendant lights along the bar
            for (let i = 0; i < 3; i++) {
                const barX = -6 + i * 6;
                
                // Cord from ceiling to fixture
                const cord = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.015, 0.015, 3.5, 6),
                    new THREE.MeshBasicMaterial({ color: 0x111111 })
                );
                cord.position.set(barX, 8.25, COUNTER_Z);
                barLightGroup.add(cord);
                
                // Small pendant fixture (shade)
                const fixture = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.25, 0.4, 0.35, 8),
                    new THREE.MeshStandardMaterial({ 
                        color: 0x1a0a05, 
                        metalness: 0.7, 
                        roughness: 0.3,
                        emissive: 0x0a0200,
                        emissiveIntensity: 0.2
                    })
                );
                fixture.position.set(barX, 6.5, COUNTER_Z);
                barLightGroup.add(fixture);
                
                // Warm bar light - dimmer for moody atmosphere
                const barLight = new THREE.PointLight(0xff9933, 1.8, 7);
                barLight.position.set(barX, 6, COUNTER_Z);
                barLight.castShadow = i === 1; // Middle one casts shadows
                if (i === 1) {
                    barLight.shadow.mapSize.width = 512;
                    barLight.shadow.mapSize.height = 512;
                }
                barLightGroup.add(barLight);
                
                // Bulb glow (dimmer)
                const barBulb = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 8, 8),
                    new THREE.MeshBasicMaterial({ color: 0xffaa55 })
                );
                barBulb.position.set(barX, 6.25, COUNTER_Z);
                barLightGroup.add(barBulb);
            }
            scene.add(barLightGroup);
            
            // --- WALL DECORATIONS ---
            
            // Italian flag on back wall
            const flagColors = [0x008C45, 0xF4F5F0, 0xCD212A]; // Green, white, red
            flagColors.forEach((color, i) => {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(1.5, 3, 0.1),
                    new THREE.MeshStandardMaterial({ color })
                );
                stripe.position.set(-5 + (i * 1.5) - 1.5, 7, -PIZZA_SIZE/2 + 0.3);
                scene.add(stripe);
            });
            
            // "PIZZA" sign (neon style)
            const signBack = new THREE.Mesh(
                new THREE.BoxGeometry(8, 2, 0.2),
                new THREE.MeshStandardMaterial({ color: 0x1a0a00 })
            );
            signBack.position.set(5, 7, -PIZZA_SIZE/2 + 0.3);
            scene.add(signBack);
            
            // Neon "PIZZA" sign glow - dim, moody
            const neonLight = new THREE.PointLight(0xff4400, 0.8, 5);
            neonLight.position.set(5, 7, -PIZZA_SIZE/2 + 1);
            scene.add(neonLight);
            
            // Neon sign emissive letters (dimmer glow)
            const neonLetters = new THREE.Mesh(
                new THREE.BoxGeometry(6, 1, 0.1),
                new THREE.MeshBasicMaterial({ color: 0xcc4400 })
            );
            neonLetters.position.set(5, 7, -PIZZA_SIZE/2 + 0.45);
            scene.add(neonLetters);
            
            // Menu boards on side walls
            const menuMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
            const menuLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 6), menuMat);
            menuLeft.position.set(-PIZZA_SIZE/2 + 0.3, 6, -5);
            scene.add(menuLeft);
            
            const menuRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 6), menuMat);
            menuRight.position.set(PIZZA_SIZE/2 - 0.3, 6, -5);
            scene.add(menuRight);
            
            // --- TABLE DECORATIONS (cards, drinks) ---
            const createTableDecorations = (tableX, tableZ, tableTopY) => {
                const decorGroup = new THREE.Group();
                
                // Playing cards (scattered stack)
                const cardMat = new THREE.MeshStandardMaterial({ color: 0xf8f8ff, roughness: 0.4 });
                const cardBackMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.4 });
                
                for (let i = 0; i < 5; i++) {
                    const card = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.6), i % 2 === 0 ? cardMat : cardBackMat);
                    card.position.set(
                        0.4 + Math.random() * 0.3 - 0.15,
                        tableTopY + 0.02 + i * 0.015,
                        -0.3 + Math.random() * 0.2 - 0.1
                    );
                    card.rotation.y = Math.random() * 0.3 - 0.15;
                    decorGroup.add(card);
                }
                
                // Soda glasses
                const glassMat = new THREE.MeshStandardMaterial({ 
                    color: 0x88ccff, transparent: true, opacity: 0.6, roughness: 0.1 
                });
                const liquidMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.3 });
                
                for (let i = 0; i < 2; i++) {
                    const glassGroup = new THREE.Group();
                    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.5, 8), glassMat);
                    glass.position.y = 0.25;
                    glassGroup.add(glass);
                    
                    // Liquid inside
                    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.10, 0.35, 8), liquidMat);
                    liquid.position.y = 0.2;
                    glassGroup.add(liquid);
                    
                    glassGroup.position.set(
                        -0.6 + i * 1.2,
                        tableTopY,
                        0.5 - i * 0.3
                    );
                    decorGroup.add(glassGroup);
                }
                
                decorGroup.position.set(tableX, 0, tableZ);
                return decorGroup;
            };
            
            // Add decorations to each table
            tablePositions.forEach(table => {
                const tableDecorations = createTableDecorations(table.x, table.z, 2.78);
                scene.add(tableDecorations);
            });
            
            // --- BAR COUNTER DECORATIONS (bottles, glasses) ---
            const barDecorations = new THREE.Group();
            
            // Row of bottles behind bar (on counter)
            const bottleColors = [0x2d5c1e, 0x8B4513, 0x1a3d1a, 0x4a2c2a, 0x2a4a3a];
            for (let i = 0; i < 8; i++) {
                const bottleGroup = new THREE.Group();
                const bottleMat = new THREE.MeshStandardMaterial({ 
                    color: bottleColors[i % bottleColors.length], 
                    transparent: true, opacity: 0.85, 
                    roughness: 0.2 
                });
                
                // Bottle body
                const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.6, 8), bottleMat);
                body.position.y = 0.3;
                bottleGroup.add(body);
                
                // Bottle neck
                const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.25, 6), bottleMat);
                neck.position.y = 0.72;
                bottleGroup.add(neck);
                
                // Cap
                const capMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.8, roughness: 0.3 });
                const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 6), capMat);
                cap.position.y = 0.87;
                bottleGroup.add(cap);
                
                bottleGroup.position.set(-7 + i * 2, COUNTER_HEIGHT + 0.1, COUNTER_Z - COUNTER_DEPTH/2 + 0.5);
                barDecorations.add(bottleGroup);
            }
            
            // Glasses on counter (in front)
            for (let i = 0; i < 4; i++) {
                const glassMat = new THREE.MeshStandardMaterial({ 
                    color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.05 
                });
                const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.35, 8), glassMat);
                glass.position.set(-5 + i * 3.5, COUNTER_HEIGHT + 0.27, COUNTER_Z + 0.3);
                barDecorations.add(glass);
            }
            
            // Pizza boxes stacked on one end
            const boxMat = new THREE.MeshStandardMaterial({ color: 0xf5deb3, roughness: 0.8 });
            for (let i = 0; i < 3; i++) {
                const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.8), boxMat);
                box.position.set(8.5, COUNTER_HEIGHT + 0.15 + i * 0.11, COUNTER_Z);
                box.rotation.y = i * 0.1;
                barDecorations.add(box);
            }
            
            scene.add(barDecorations);
            
            // --- VERY MOODY AMBIENT LIGHTING ---
            // Extremely dim ambient - almost all light from fixtures only
            const ambientFill = new THREE.AmbientLight(0x0a0500, 0.08);
            scene.add(ambientFill);
            
            // Minimal fill light - deep shadows
            const fillLight = new THREE.HemisphereLight(0x0a0400, 0x000000, 0.05);
            scene.add(fillLight);
            
            // Exit sign light (dim green glow)
            const exitLight = new THREE.PointLight(0x00ff00, 0.3, 4);
            exitLight.position.set(0, 9, PIZZA_SIZE/2 - 1);
            scene.add(exitLight);
            
            // Exit sign mesh
            const exitSign = new THREE.Mesh(
                new THREE.BoxGeometry(2, 0.5, 0.1),
                new THREE.MeshBasicMaterial({ color: 0x005500 })
            );
            exitSign.position.set(0, 9.2, PIZZA_SIZE/2 - 0.3);
            scene.add(exitSign);
            
            // Build furniture sitting data (bar stools + chairs)
            const furnitureData = [
                // Bar stools (facing counter) - jumpable height stools
                ...barStoolPositions.map(x => ({
                    type: 'stool',
                    position: { x, z: STOOL_Z },
                    seatHeight: STOOL_SEAT_HEIGHT + 0.1, // Stool seat at STOOL_SEAT_HEIGHT
                    faceAngle: Math.PI, // Facing counter (north)
                    radius: 0.5,
                    dismountBack: true // Flag to dismount backwards (away from counter)
                })),
                // Chairs (from chairData)
                ...chairData
            ];
            
            // Store pizza parlor bounds for collision
            return { 
                bounds: { 
                    minX: -PIZZA_SIZE/2 + 1, 
                    maxX: PIZZA_SIZE/2 - 1, 
                    minZ: -PIZZA_SIZE/2 + 1, 
                    maxZ: PIZZA_SIZE/2 - 1 
                },
                spawnPos: { x: 0, z: 12 },  // Spawn near exit
                
                // Furniture for sitting interactions
                furniture: furnitureData,
                
                // Landing surfaces for jumping (Y heights)
                landingSurfaces: [
                    // Table tops (can jump on)
                    ...tablePositions.map(t => ({ 
                        type: 'circle', x: t.x, z: t.z, radius: 2.2, height: 2.75 
                    })),
                    // Counter top (can jump on) - snug against back wall
                    { type: 'box', minX: -10, maxX: 10, minZ: COUNTER_Z - COUNTER_DEPTH/2, maxZ: COUNTER_Z + COUNTER_DEPTH/2, height: COUNTER_HEIGHT + 0.1 },
                    // Bar stool seats (can jump on) - jumpable height
                    ...barStoolPositions.map(x => ({ 
                        type: 'circle', x, z: STOOL_Z, radius: 0.6, height: STOOL_SEAT_HEIGHT + 0.05 
                    })),
                    // Chair seats (can jump on) - raised to match tall chairs
                    ...chairData.map(c => ({ 
                        type: 'circle', x: c.position.x, z: c.position.z, radius: 0.7, height: 2.9 
                    }))
                ],
                
                // Table collision (can't walk through pedestal)
                tables: tablePositions.map(t => ({ x: t.x, z: t.z, radius: 0.6 })),
                
                // Chair collision (small radius for legs)
                chairs: chairData.map(c => ({ x: c.position.x, z: c.position.z, radius: 0.7 })),
                
                // Bar stool collision
                stools: barStoolPositions.map(x => ({ x, z: STOOL_Z, radius: 0.5 })),
                
                // Counter collision (rectangular) - snug against back wall
                counter: { minX: -10, maxX: 10, minZ: COUNTER_Z - COUNTER_DEPTH/2, maxZ: COUNTER_Z + COUNTER_DEPTH/2 }
            };
        };
        
        // Generate Igloo interior room (cozy hangout space) - 50% LARGER
        const generateIglooRoom = () => {
            const IGLOO_SIZE = 30; // 50% larger (was 20)
            scene.background = new THREE.Color(0x0d1520); // Darker, moodier background
            
            // Simple collision map for igloo
            const map = [];
            for(let x = 0; x < 15; x++) {
                map[x] = [];
                for(let z = 0; z < 15; z++) {
                    map[x][z] = 2; // All walkable
                }
            }
            mapRef.current = map;
            
            // ==================== FLOOR ====================
            // Cozy carpet in center (scaled positions for larger room)
            const carpetGeo = new THREE.CircleGeometry(10.5, 32); // Was 7
            const carpetMat = new THREE.MeshStandardMaterial({ color: 0x6B3510, roughness: 0.9 }); // Darker brown
            const carpet = new THREE.Mesh(carpetGeo, carpetMat);
            carpet.rotation.x = -Math.PI / 2;
            carpet.position.y = 0.02;
            carpet.receiveShadow = true;
            scene.add(carpet);
            
            // Carpet pattern - inner circle
            const innerCarpet = new THREE.Mesh(
                new THREE.CircleGeometry(7.5, 32), // Was 5
                new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 })
            );
            innerCarpet.rotation.x = -Math.PI / 2;
            innerCarpet.position.y = 0.03;
            scene.add(innerCarpet);
            
            // Ice floor around carpet
            const floorGeo = new THREE.CircleGeometry(IGLOO_SIZE / 2, 32);
            const floorMat = new THREE.MeshStandardMaterial({ 
                color: 0xB8D4E8, // Slightly darker ice 
                roughness: 0.4,
                metalness: 0.1
            });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = 0.01;
            floor.receiveShadow = true;
            scene.add(floor);
            
            // ==================== DOME WALLS ====================
            // Ice dome interior (hemisphere from inside)
            const domeGeo = new THREE.SphereGeometry(IGLOO_SIZE / 2, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
            const domeMat = new THREE.MeshStandardMaterial({ 
                color: 0x9CB8C8, // Darker, more atmospheric ice
                roughness: 0.5,
                side: THREE.BackSide
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.scale.y = 0.6; // Flatten dome
            scene.add(dome);
            
            // Ice block lines on dome (adjusted for larger dome)
            for (let i = 1; i < 8; i++) {
                const ringY = i * 1.2;
                const ringRadius = (IGLOO_SIZE / 2) * Math.cos(Math.asin(ringY / (IGLOO_SIZE / 2 * 0.6)));
                if (ringRadius > 1) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(ringRadius, 0.06, 4, 48),
                        new THREE.MeshStandardMaterial({ color: 0x7A9AAA })
                    );
                    ring.position.y = ringY;
                    ring.rotation.x = Math.PI / 2;
                    scene.add(ring);
                }
            }
            
            // ==================== COUCH ==================== (position: 0, -9)
            const couchGroup = new THREE.Group();
            const couchMat = new THREE.MeshStandardMaterial({ color: 0x2E4A62, roughness: 0.8 });
            const cushionMat = new THREE.MeshStandardMaterial({ color: 0x3D5A80, roughness: 0.9 });
            
            // Couch base
            const baseGeo = new THREE.BoxGeometry(5, 0.8, 2);
            const couchBase = new THREE.Mesh(baseGeo, couchMat);
            couchBase.position.y = 0.4;
            couchBase.castShadow = true;
            couchGroup.add(couchBase);
            
            // Couch back
            const backGeo = new THREE.BoxGeometry(5, 1.5, 0.5);
            const couchBack = new THREE.Mesh(backGeo, couchMat);
            couchBack.position.set(0, 1.15, -0.75);
            couchBack.castShadow = true;
            couchGroup.add(couchBack);
            
            // Couch armrests
            const armGeo = new THREE.BoxGeometry(0.5, 1, 2);
            [-2.5, 2.5].forEach(x => {
                const arm = new THREE.Mesh(armGeo, couchMat);
                arm.position.set(x, 0.7, 0);
                arm.castShadow = true;
                couchGroup.add(arm);
            });
            
            // Cushions
            [-1.5, 0, 1.5].forEach(x => {
                const cushion = new THREE.Mesh(
                    new THREE.BoxGeometry(1.4, 0.3, 1.6),
                    cushionMat
                );
                cushion.position.set(x, 0.95, 0.1);
                couchGroup.add(cushion);
            });
            
            couchGroup.position.set(0, 0, -9); // Was -6
            scene.add(couchGroup);
            
            // ==================== CHAIRS ==================== (positions adjusted)
            const createChair = (x, z, rotY) => {
                const chairGroup = new THREE.Group();
                const chairMat = new THREE.MeshStandardMaterial({ color: 0x5D4E37, roughness: 0.8 });
                const seatMat = new THREE.MeshStandardMaterial({ color: 0xC0392B, roughness: 0.9 }); // Darker red
                
                // Seat
                const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.2, 1.5), seatMat);
                seat.position.y = 0.8;
                seat.castShadow = true;
                chairGroup.add(seat);
                
                // Legs
                const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
                [[-0.5, -0.5], [-0.5, 0.5], [0.5, -0.5], [0.5, 0.5]].forEach(([lx, lz]) => {
                    const leg = new THREE.Mesh(legGeo, chairMat);
                    leg.position.set(lx, 0.4, lz);
                    chairGroup.add(leg);
                });
                
                // Back
                const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 0.15), chairMat);
                back.position.set(0, 1.5, -0.65);
                back.castShadow = true;
                chairGroup.add(back);
                
                chairGroup.position.set(x, 0, z);
                chairGroup.rotation.y = rotY;
                scene.add(chairGroup);
            };
            
            createChair(-7.5, -3, Math.PI / 4);   // Was (-5, -2)
            createChair(7.5, -3, -Math.PI / 4);   // Was (5, -2)
            
            // ==================== TV / GAME CONSOLE ==================== (position: 0, 9)
            const tvGroup = new THREE.Group();
            
            // TV Stand
            const standGeo = new THREE.BoxGeometry(3, 1, 1);
            const standMat = new THREE.MeshStandardMaterial({ color: 0x2C3E50, roughness: 0.7 });
            const stand = new THREE.Mesh(standGeo, standMat);
            stand.position.y = 0.5;
            stand.castShadow = true;
            tvGroup.add(stand);
            
            // TV Screen
            const screenGeo = new THREE.BoxGeometry(2.5, 1.8, 0.15);
            const screenMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3 });
            const screen = new THREE.Mesh(screenGeo, screenMat);
            screen.position.set(0, 1.9, 0);
            screen.castShadow = true;
            tvGroup.add(screen);
            
            // Screen glow (playing game) - dimmer
            const glowGeo = new THREE.PlaneGeometry(2.3, 1.6);
            const glowMat = new THREE.MeshBasicMaterial({ 
                color: 0x3366cc, 
                transparent: true, 
                opacity: 0.2 
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.set(0, 1.9, 0.08);
            tvGroup.add(glow);
            
            // Game console
            const consoleMesh = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.15, 0.4),
                new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
            );
            consoleMesh.position.set(0, 1.1, 0.2);
            tvGroup.add(consoleMesh);
            
            tvGroup.position.set(0, 0, 9); // Was 6
            tvGroup.rotation.y = Math.PI;
            scene.add(tvGroup);
            
            // ==================== COFFEE TABLE ==================== (position: 0, -3)
            const tableGroup = new THREE.Group();
            const tableMat = new THREE.MeshStandardMaterial({ color: 0x5D4037, roughness: 0.7 });
            
            // Table top
            const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 1.5), tableMat);
            tableTop.position.y = 0.6;
            tableTop.castShadow = true;
            tableTop.receiveShadow = true;
            tableGroup.add(tableTop);
            
            // Table legs
            const tLegGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
            [[-1, -0.5], [-1, 0.5], [1, -0.5], [1, 0.5]].forEach(([tx, tz]) => {
                const tLeg = new THREE.Mesh(tLegGeo, tableMat);
                tLeg.position.set(tx, 0.3, tz);
                tableGroup.add(tLeg);
            });
            
            tableGroup.position.set(0, 0, -3); // Was -2
            scene.add(tableGroup);
            
            // ==================== KICKABLE BEACH BALL ==================== 
            const beachBallGroup = new THREE.Group();
            beachBallGroup.name = 'beachBall';
            
            const ballGeo = new THREE.SphereGeometry(0.5, 16, 16);
            const ballMat = new THREE.MeshStandardMaterial({ color: 0xFF6B6B, roughness: 0.6 });
            const ball = new THREE.Mesh(ballGeo, ballMat);
            ball.castShadow = true;
            beachBallGroup.add(ball);
            
            // Ball stripes (attached to group so they move together)
            const stripeMat = new THREE.MeshStandardMaterial({ color: 0xFFE66D });
            for (let i = 0; i < 4; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.TorusGeometry(0.35, 0.08, 8, 16),
                    stripeMat
                );
                stripe.rotation.y = (i / 4) * Math.PI;
                beachBallGroup.add(stripe);
            }
            
            // Initial position
            beachBallGroup.position.set(4.5, 0.5, 3);
            scene.add(beachBallGroup);
            
            // Beach ball physics data (tuned for fun bouncy feel)
            const beachBall = {
                mesh: beachBallGroup,
                velocity: { x: 0, z: 0 },
                radius: 0.5,
                friction: 0.985,    // Slight friction - rolls nicely
                bounciness: 0.75    // Good bounce off walls
            };
            
            // Furniture collision boxes (for player and ball collision)
            // Note: Couch collider is the BACK only, so players can sit on the front
            // Added height property for proper 3D collision - allows jumping on top!
            const furnitureColliders = [
                // Couch BACK at (0, -9.5) - only the back rest, not the seating area
                { x: 0, z: -9.8, hw: 2.8, hd: 0.6, height: 1.8, y: 0, name: 'couch_back' },
                // Couch ARMS (left and right)
                { x: -2.5, z: -9, hw: 0.4, hd: 1.2, height: 1.2, y: 0, name: 'couch_arm_l' },
                { x: 2.5, z: -9, hw: 0.4, hd: 1.2, height: 1.2, y: 0, name: 'couch_arm_r' },
                // Coffee table at (0, -3) - LOW height so player can jump on top!
                { x: 0, z: -3, hw: 1.5, hd: 1, height: 0.8, y: 0, name: 'table' }
            ];
            
            // ==================== POTTED PLANT ==================== (position: -6, 6)
            const plantGroup = new THREE.Group();
            
            // Pot
            const potGeo = new THREE.CylinderGeometry(0.4, 0.3, 0.6, 12);
            const potMat = new THREE.MeshStandardMaterial({ color: 0xB5651D, roughness: 0.8 });
            const pot = new THREE.Mesh(potGeo, potMat);
            pot.position.y = 0.3;
            pot.castShadow = true;
            plantGroup.add(pot);
            
            // Soil
            const soil = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.35, 0.1, 12),
                new THREE.MeshStandardMaterial({ color: 0x3d2817 })
            );
            soil.position.y = 0.55;
            plantGroup.add(soil);
            
            // Plant leaves
            const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8 });
            for (let i = 0; i < 8; i++) {
                const leaf = new THREE.Mesh(
                    new THREE.ConeGeometry(0.15, 0.8, 4),
                    leafMat
                );
                const angle = (i / 8) * Math.PI * 2;
                leaf.position.set(
                    Math.cos(angle) * 0.2,
                    1,
                    Math.sin(angle) * 0.2
                );
                leaf.rotation.x = 0.3;
                leaf.rotation.y = angle;
                plantGroup.add(leaf);
            }
            // Center leaf
            const centerLeaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 4), leafMat);
            centerLeaf.position.y = 1.1;
            plantGroup.add(centerLeaf);
            
            plantGroup.position.set(-6, 0, 6); // Was (-4, 0, 4)
            scene.add(plantGroup);
            
            // ==================== BOOKSHELF ==================== (position: 9, 0)
            const shelfGroup = new THREE.Group();
            const shelfMat = new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 });
            
            // Shelf frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3, 0.4), shelfMat);
            frame.position.y = 1.5;
            frame.castShadow = true;
            shelfGroup.add(frame);
            
            // Shelves
            [0.6, 1.5, 2.4].forEach(y => {
                const shelf = new THREE.Mesh(
                    new THREE.BoxGeometry(2.3, 0.08, 0.35),
                    shelfMat
                );
                shelf.position.set(0, y, 0.05);
                shelfGroup.add(shelf);
            });
            
            // Books (colorful)
            const bookColors = [0xE74C3C, 0x3498DB, 0x2ECC71, 0xF39C12, 0x9B59B6];
            [0.8, 1.7, 2.6].forEach((y, shelfIdx) => {
                for (let i = 0; i < 5; i++) {
                    const book = new THREE.Mesh(
                        new THREE.BoxGeometry(0.15, 0.4 + Math.random() * 0.2, 0.25),
                        new THREE.MeshStandardMaterial({ color: bookColors[(i + shelfIdx) % bookColors.length] })
                    );
                    book.position.set(-0.8 + i * 0.35, y + 0.25, 0.05);
                    shelfGroup.add(book);
                }
            });
            
            shelfGroup.position.set(10, 0, 0); // Was (6, 0, 0)
            shelfGroup.rotation.y = -Math.PI / 2;
            scene.add(shelfGroup);
            
            // ==================== MOODY WARM LIGHTING ====================
            // Very dim ambient - let the point lights do the work
            const ambientLight = new THREE.AmbientLight(0x2a1a0a, 0.15); // Very dim warm brown
            scene.add(ambientLight);
            
            // Main ceiling light (warm orange glow, reduced intensity)
            const ceilingLight = new THREE.PointLight(0xFF9944, 0.8, 25);
            ceilingLight.position.set(0, 7, 0);
            ceilingLight.castShadow = true;
            scene.add(ceilingLight);
            
            // Light fixture (warm glowing orb)
            const fixtureMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xFFAA55 })
            );
            fixtureMesh.position.set(0, 7.5, 0);
            scene.add(fixtureMesh);
            
            // Subtle warm accent lights around the room
            const accentLight1 = new THREE.PointLight(0xFF6633, 0.3, 12);
            accentLight1.position.set(-8, 2, -8);
            scene.add(accentLight1);
            
            const accentLight2 = new THREE.PointLight(0xFF6633, 0.3, 12);
            accentLight2.position.set(8, 2, -8);
            scene.add(accentLight2);
            
            // TV glow light (subtle blue, for contrast)
            const tvLight = new THREE.PointLight(0x3366aa, 0.4, 10);
            tvLight.position.set(0, 2, 7);
            scene.add(tvLight);
            
            // Cozy fireplace-style warm glow from below
            const floorGlow = new THREE.PointLight(0xFF4400, 0.2, 15);
            floorGlow.position.set(0, 0.5, 0);
            scene.add(floorGlow);
            
            // ==================== EXIT GLOW ==================== (position: 0, 13.5)
            const exitGlow = new THREE.Mesh(
                new THREE.CircleGeometry(2.5, 16),
                new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.15 })
            );
            exitGlow.rotation.x = -Math.PI / 2;
            exitGlow.position.set(0, 0.02, 13.5); // Was 9
            scene.add(exitGlow);
            
            // Exit door frame
            const doorFrame = new THREE.Mesh(
                new THREE.BoxGeometry(3, 3.5, 0.3),
                new THREE.MeshStandardMaterial({ color: 0x4a3728 })
            );
            doorFrame.position.set(0, 1.75, IGLOO_SIZE / 2 - 0.5);
            scene.add(doorFrame);
            
            // Door opening (dark)
            const doorOpening = new THREE.Mesh(
                new THREE.PlaneGeometry(2.5, 3),
                new THREE.MeshBasicMaterial({ color: 0x050a10 })
            );
            doorOpening.position.set(0, 1.5, IGLOO_SIZE / 2 - 0.3);
            scene.add(doorOpening);
            
            // Furniture interaction data (for sitting) - UPDATED POSITIONS
            const furniture = [
                {
                    type: 'couch',
                    position: { x: 0, z: -9 },
                    rotation: 0, // Facing +Z (toward TV)
                    seatHeight: 0.95,
                    snapPoints: [
                        // Snap points are LOCAL to couch - z: 0 = center of seat
                        { x: -1.5, z: 0 },   // Left cushion
                        { x: 0, z: 0 },       // Middle cushion  
                        { x: 1.5, z: 0 }      // Right cushion
                    ],
                    interactionRadius: 3
                },
                {
                    type: 'chair',
                    position: { x: -7.5, z: -3 },
                    rotation: Math.PI / 4, // Angled toward center
                    seatHeight: 0.8,
                    snapPoints: [{ x: 0, z: 0 }],
                    interactionRadius: 2
                },
                {
                    type: 'chair',
                    position: { x: 7.5, z: -3 },
                    rotation: -Math.PI / 4, // Angled toward center
                    seatHeight: 0.8,
                    snapPoints: [{ x: 0, z: 0 }],
                    interactionRadius: 2
                }
            ];
            
            return {
                // Use circular bounds for igloos (radius from center)
                bounds: { 
                    type: 'circular',
                    radius: IGLOO_SIZE / 2 - 1.5, // Playable radius
                    centerX: 0,
                    centerZ: 0
                },
                spawnPos: { x: 0, z: 10 },
                furniture: furniture,
                beachBall: beachBall, // Kickable beach ball
                colliders: furnitureColliders // Furniture collision boxes
            };
        };
        
        // Generate scenery based on current room
        let roomData = null;
        let butterflyGroup = null;
        
        if (room === 'town') {
            const cityResult = generateCity();
            butterflyGroup = cityResult.butterflyGroup;
            const townCenterX = (CITY_SIZE / 2) * BUILDING_SCALE;
            const townCenterZ = (CITY_SIZE / 2) * BUILDING_SCALE;
            roomData = {
                bounds: null, // Town uses wall collision
                spawnPos: { x: townCenterX, z: townCenterZ + 85 } // South of dojo, facing north
            };
        } else if (room === 'dojo') {
            roomData = generateDojoRoom();
        } else if (room === 'pizza') {
            roomData = generatePizzaRoom();
        } else if (room.startsWith('igloo')) {
            roomData = generateIglooRoom();
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
        const centerX = (CITY_SIZE / 2) * BUILDING_SCALE;
        const centerZ = (CITY_SIZE / 2) * BUILDING_SCALE;
        
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

        // Build high-quality procedural buildings using PropsFactory
        const buildingFactory = new PropsFactory(THREE);
        
        BUILDINGS.forEach(building => {
            let buildingGroup;
            const { w, h, d } = building.size;
            
            // Use factory methods for high-quality building generation
            if (building.id === 'dojo') {
                buildingGroup = buildingFactory.createDojo({ w, h, d });
            } else if (building.id === 'market') {
                buildingGroup = buildingFactory.createGiftShop({ w, h, d });
            } else if (building.id === 'plaza') {
                buildingGroup = buildingFactory.createPizzaParlor({ w, h, d });
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
        
        // --- OPTIMIZED PLAYER & AI BUILDER ---
        // Material cache - reuse materials for same colors (HUGE performance gain)
        const materialCache = new Map();
        const getMaterial = (color) => {
            // Guard against undefined/null colors
            if (color === undefined || color === null) {
                color = 0x888888; // Default gray
            }
            const colorKey = typeof color === 'string' ? color : color.toString();
            if (!materialCache.has(colorKey)) {
                materialCache.set(colorKey, new THREE.MeshStandardMaterial({ color }));
            }
            return materialCache.get(colorKey);
        };
        
        // Shared geometry for all voxels
        const sharedVoxelGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
        
        const buildPenguinMesh = (data) => {
             const group = new THREE.Group();
             
             // OPTIMIZED: Merge voxels by color into single meshes
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
                         
                         if(pivot) {
                             px -= pivot.x * VOXEL_SIZE;
                             py -= pivot.y * VOXEL_SIZE;
                             pz -= pivot.z * VOXEL_SIZE;
                         }
                         
                         tempMatrix.makeTranslation(px, py, pz);
                         if(v.scaleY) {
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
                 
                 if(pivot) {
                      g.position.set(pivot.x * VOXEL_SIZE, pivot.y * VOXEL_SIZE, pivot.z * VOXEL_SIZE);
                 }
                 
                 return g;
             };
             
             // Check for special character types (Marcus, etc.)
             if (data.characterType === 'marcus') {
                 // Build Marcus with SEPARATE PARTS for animation (like penguin)
                 const pivots = MarcusGenerators.pivots();
                 
                 // Head (for laugh animation)
                 const headVoxels = MarcusGenerators.head();
                 const head = buildPartMerged(headVoxels, MARCUS_PALETTE, pivots.head);
                 head.name = 'head';
                 
                 // Body
                 const bodyVoxels = MarcusGenerators.body();
                 const body = buildPartMerged(bodyVoxels, MARCUS_PALETTE);
                 body.name = 'body';
                 
                 // Arms (named flipper_l/flipper_r for animation compatibility)
                 const armLVoxels = MarcusGenerators.armLeft();
                 const armL = buildPartMerged(armLVoxels, MARCUS_PALETTE, pivots.armLeft);
                 armL.name = 'flipper_l';
                 
                 const armRVoxels = MarcusGenerators.armRight();
                 const armR = buildPartMerged(armRVoxels, MARCUS_PALETTE, pivots.armRight);
                 armR.name = 'flipper_r';
                 
                 // Legs (named foot_l/foot_r for animation compatibility)
                 const legLVoxels = MarcusGenerators.legLeft();
                 const legL = buildPartMerged(legLVoxels, MARCUS_PALETTE, pivots.legLeft);
                 legL.name = 'foot_l';
                 
                 const legRVoxels = MarcusGenerators.legRight();
                 const legR = buildPartMerged(legRVoxels, MARCUS_PALETTE, pivots.legRight);
                 legR.name = 'foot_r';
                 
                 group.add(body, head, armL, armR, legL, legR);
                 
                 // Same scale and position as penguin
                 group.scale.set(0.18, 0.18, 0.18);
                 group.position.y = 0.8;
             } else {
                 // Build standard Penguin character
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
                 
                 group.add(body, head, flippersLeft, flippersRight, footL, footR);
                 
                if (data.hat && data.hat !== 'none' && ASSETS.HATS[data.hat]) {
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
                    
                    // Flaming Crown - fire particles like campfire
                    if (data.hat === 'flamingCrown') {
                        const fireGroup = new THREE.Group();
                        fireGroup.name = 'crown_fire';
                        fireGroup.position.set(0, 12 * VOXEL_SIZE, 0);
                        
                        // Create fire particles
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
                    
                    // Wizard Hat - mark player as having wizard hat (particles are world-space)
                    if (data.hat === 'wizardHat') {
                        group.userData.hasWizardHat = true;
                    }
                }
                 
                if (data.eyes && ASSETS.EYES[data.eyes]) {
                    const p = buildPartMerged(ASSETS.EYES[data.eyes], PALETTE);
                    p.name = 'eyes';
                    group.add(p);
                    
                    // Add laser eye lights for laser eyes
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
                    
                    // Add fire eye effects for fire eyes
                    if (data.eyes === 'fire') {
                        const fireEyesGroup = new THREE.Group();
                        fireEyesGroup.name = 'fire_eyes';
                        
                        // Left eye fire particles
                        const leftFireGroup = new THREE.Group();
                        leftFireGroup.position.set(-2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 4.5 * VOXEL_SIZE);
                        
                        // Right eye fire particles
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
                        
                        // Add point lights for glow
                        const lightLeft = new THREE.PointLight(0xff4500, 0.8, 5);
                        lightLeft.position.copy(leftFireGroup.position);
                        const lightRight = new THREE.PointLight(0xff4500, 0.8, 5);
                        lightRight.position.copy(rightFireGroup.position);
                        
                        fireEyesGroup.add(leftFireGroup, rightFireGroup, lightLeft, lightRight);
                        fireEyesGroup.userData.isFireEyes = true;
                        group.add(fireEyesGroup);
                    }
                } else if (ASSETS.EYES.normal) {
                    const p = buildPartMerged(ASSETS.EYES.normal, PALETTE);
                    p.name = 'eyes';
                    group.add(p);
                }
                 
                if (data.mouth && ASSETS.MOUTH[data.mouth]) {
                    const p = buildPartMerged(ASSETS.MOUTH[data.mouth], PALETTE);
                    p.name = 'mouth';
                    group.add(p);
                    
                    // Add smoke particles for cigarette, pipe, or cigar
                    if (data.mouth === 'cigarette' || data.mouth === 'pipe' || data.mouth === 'cigar') {
                        const smokeGroup = new THREE.Group();
                        smokeGroup.name = 'smoke_particles';
                        
                        // Position based on mouth type
                        const tipX = data.mouth === 'pipe' ? 2 * VOXEL_SIZE : 
                                     data.mouth === 'cigar' ? 6 * VOXEL_SIZE : 4.5 * VOXEL_SIZE;
                        const tipY = data.mouth === 'pipe' ? 6 * VOXEL_SIZE : 5.5 * VOXEL_SIZE;
                        const tipZ = data.mouth === 'pipe' ? 6 * VOXEL_SIZE : 
                                     data.mouth === 'cigar' ? 5.6 * VOXEL_SIZE : 5.5 * VOXEL_SIZE;
                        smokeGroup.position.set(tipX, tipY, tipZ);
                        
                        // Create smoke particles
                        const particleCount = 8;
                        for (let i = 0; i < particleCount; i++) {
                            const pGeo = new THREE.BoxGeometry(0.3 * VOXEL_SIZE, 0.3 * VOXEL_SIZE, 0.3 * VOXEL_SIZE);
                            const pMat = new THREE.MeshBasicMaterial({ 
                                color: 0xaaaaaa, 
                                transparent: true, 
                                opacity: 0.6 
                            });
                            const pMesh = new THREE.Mesh(pGeo, pMat);
                            // Stagger initial positions
                            pMesh.position.y = i * 0.3 * VOXEL_SIZE;
                            pMesh.userData.particleIndex = i;
                            pMesh.userData.baseY = pMesh.position.y;
                            smokeGroup.add(pMesh);
                        }
                        
                        smokeGroup.userData.isSmokeEmitter = true;
                        group.add(smokeGroup);
                    }
                    
                    // Fire Breath - forward shooting fire particles
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
                    
                    // Ice Breath - forward shooting ice particles
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
                    
                    // Bubblegum - animated growing/popping bubble
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
                } else if (ASSETS.MOUTH.beak) {
                    const p = buildPartMerged(ASSETS.MOUTH.beak, PALETTE);
                    p.name = 'mouth';
                    group.add(p);
                }
                 
                 if (data.bodyItem && data.bodyItem !== 'none' && ASSETS.BODY[data.bodyItem]) {
                     const p = buildPartMerged(ASSETS.BODY[data.bodyItem], PALETTE);
                     p.name = 'accessory';
                     group.add(p);
                     
                     // Add wing flapping for angel/demon wings
                     if (data.bodyItem === 'angelWings' || data.bodyItem === 'demonWings') {
                         p.userData.isWings = true;
                         p.userData.wingPhase = Math.random() * Math.PI * 2;
                     }
                     
                     // Fire Aura - animated fire ring (like campfire)
                     if (data.bodyItem === 'fireAura') {
                         const fireAuraGroup = new THREE.Group();
                         fireAuraGroup.name = 'fire_aura';
                         fireAuraGroup.position.y = 3 * VOXEL_SIZE;
                         
                         // Create fire flames in a ring around the player
                         const flameCount = 8;
                         for (let i = 0; i < flameCount; i++) {
                             const angle = (i / flameCount) * Math.PI * 2;
                             const radius = 6 * VOXEL_SIZE;
                             
                             // Cone-shaped flame (like campfire)
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
                         
                         // Add glow light
                         const fireLight = new THREE.PointLight(0xFF6600, 1.5, 5);
                         fireLight.position.y = 1.5 * VOXEL_SIZE;
                         fireAuraGroup.add(fireLight);
                         fireAuraGroup.userData.fireLight = fireLight;
                         
                         fireAuraGroup.userData.isFireAura = true;
                         group.add(fireAuraGroup);
                     }
                     
                     // Lightning Aura - animated electric bolts
                     if (data.bodyItem === 'lightningAura') {
                         const lightningGroup = new THREE.Group();
                         lightningGroup.name = 'lightning_aura';
                         lightningGroup.position.y = 3 * VOXEL_SIZE;
                         
                         // Create lightning bolts in a ring
                         const boltCount = 6;
                         for (let i = 0; i < boltCount; i++) {
                             const angle = (i / boltCount) * Math.PI * 2;
                             const radius = 6 * VOXEL_SIZE;
                             
                             // Simple bolt shape
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
                         
                         // Add electric glow
                         const lightningLight = new THREE.PointLight(0x00FFFF, 1.5, 5);
                         lightningLight.position.y = 1.5 * VOXEL_SIZE;
                         lightningGroup.add(lightningLight);
                         lightningGroup.userData.lightningLight = lightningLight;
                         
                         lightningGroup.userData.isLightningAura = true;
                         group.add(lightningGroup);
                     }
                 }
                 
                 group.scale.set(0.2, 0.2, 0.2); 
                 group.position.y = 0.8;
             }

             const wrapper = new THREE.Group();
             wrapper.add(group);
             
             // --- MOUNT SYSTEM ---
             if (data.mount && data.mount !== 'none' && ASSETS.MOUNTS && ASSETS.MOUNTS[data.mount]) {
                 const mountData = ASSETS.MOUNTS[data.mount];
                 
                 // Create mount group
                 const mountGroup = new THREE.Group();
                 mountGroup.name = 'mount';
                 
                 // Build mount hull voxels
                 if (mountData.voxels && mountData.voxels.length > 0) {
                     const mountMesh = buildPartMerged(mountData.voxels, PALETTE);
                     mountMesh.name = 'mount_hull';
                     mountGroup.add(mountMesh);
                 }
                 
                // Build animated oars (for rowing mounts)
                if (mountData.leftOar) {
                     const leftOarMesh = buildPartMerged(mountData.leftOar, PALETTE);
                     leftOarMesh.name = 'left_oar';
                     // Create pivot point for oar rotation at oarlock position
                     const leftOarPivot = new THREE.Group();
                     leftOarPivot.name = 'left_oar_pivot';
                     leftOarPivot.position.set(-2.0, 0, 0); // Pivot at oarlock on larger hull
                     leftOarPivot.add(leftOarMesh);
                     leftOarMesh.position.set(-0.2, 0, 0); // Oar extends from pivot
                     mountGroup.add(leftOarPivot);
                 }
                 
                 if (mountData.rightOar) {
                     const rightOarMesh = buildPartMerged(mountData.rightOar, PALETTE);
                     rightOarMesh.name = 'right_oar';
                     const rightOarPivot = new THREE.Group();
                     rightOarPivot.name = 'right_oar_pivot';
                     rightOarPivot.position.set(2.0, 0, 0); // Pivot at oarlock on larger hull
                     rightOarPivot.add(rightOarMesh);
                     rightOarMesh.position.set(0.2, 0, 0); // Oar extends from pivot
                     mountGroup.add(rightOarPivot);
                 }
                 
                 mountGroup.scale.set(0.2, 0.2, 0.2);
                 mountGroup.position.y = 0.4; // Position mount flush with ground
                 wrapper.add(mountGroup);
                 
                // Store mount data on wrapper for animation
                wrapper.userData.mount = data.mount;
                wrapper.userData.mountData = mountData;
                wrapper.userData.isMounted = true;
                
                // DON'T manually position feet here - let animateMesh handle it
                // The animation system will apply the Sit pose when isMounted is true
            }
             
             return wrapper;
        };
        
        // Store buildPenguinMesh for multiplayer to use
        buildPenguinMeshRef.current = buildPenguinMesh;
        
        // --- BUILD PLAYER ---
        const playerWrapper = buildPenguinMesh(penguinData);
        playerRef.current = playerWrapper;
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
            const townCenterX = (CITY_SIZE / 2) * BUILDING_SCALE;
            const townCenterZ = (CITY_SIZE / 2) * BUILDING_SCALE;
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
            
            // If no saved position, use default spawn (south of map, facing north toward town)
            if (!loadedFromStorage) {
                const townCenterX = (CITY_SIZE / 2) * BUILDING_SCALE;
                const townCenterZ = (CITY_SIZE / 2) * BUILDING_SCALE;
                // Spawn south of the dojo, facing north toward the action
                posRef.current = { x: townCenterX, y: 0, z: townCenterZ + 85 };
                rotRef.current = Math.PI; // Face north (toward -Z direction)
            }
        } else if (roomData && roomData.spawnPos) {
            // Other rooms: use room's spawn position
            posRef.current = { x: roomData.spawnPos.x, y: 0, z: roomData.spawnPos.z };
        } else {
            // Fallback spawn (same as town default)
            const townCenterX = (CITY_SIZE / 2) * BUILDING_SCALE;
            const townCenterZ = (CITY_SIZE / 2) * BUILDING_SCALE;
            posRef.current = { x: townCenterX + 0.4, y: 0, z: townCenterZ - 27.2 };
            rotRef.current = 0; // Face north
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
                const bodyItems = Object.keys(ASSETS.BODY);
                
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
                // T key opens emote wheel
                setShowEmoteWheel(true);
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
            if(e.code === 'KeyT') setShowEmoteWheel(false);
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
            
            if (roomRef.current !== 'town' && roomRef.current !== 'pizza') {
                // Fallback: Non-town rooms use different collision
                // Town uses wall boundaries now, not water
                const WALL_MARGIN = 10;
                const MAP_SIZE = CITY_SIZE * BUILDING_SCALE;
                
                if (nextX < WALL_MARGIN || nextX > MAP_SIZE - WALL_MARGIN ||
                    nextZ < WALL_MARGIN || nextZ > MAP_SIZE - WALL_MARGIN) {
                    collided = true; // Can't walk past walls
                }
                
                // Check collision with custom buildings (dojo, market, pizza)
                if (!collided) {
                    const centerX = (CITY_SIZE / 2) * BUILDING_SCALE;
                    const centerZ = (CITY_SIZE / 2) * BUILDING_SCALE;
                    
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
                    let nearFurniture = null;
                    for (const furn of roomData.furniture) {
                        const dx = finalX - furn.position.x;
                        const dz = finalZ - furn.position.z;
                        const dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < furn.interactionRadius) {
                            nearFurniture = furn;
                            break;
                        }
                    }
                    
                    // Dispatch interaction event (reuses existing townInteraction system)
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
                                    seatHeight: nearFurniture.seatHeight
                                }
                            }
                        }));
                    } else if (!nearFurniture && !seatedRef.current) {
                        // Exited furniture zone
                        window.dispatchEvent(new CustomEvent('townInteraction', {
                            detail: { action: 'exit' }
                        }));
                    }
                }
            } else if (townCenterRef.current && roomRef.current === 'town') {
                // Town: use TownCenter's safe position
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
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
            
            // Check for landing on pizza parlor furniture
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
            if (posRef.current.y <= GROUND_Y) {
                groundHeight = GROUND_Y;
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
                const townCenterX = (CITY_SIZE / 2) * BUILDING_SCALE;
                const townCenterZ = (CITY_SIZE / 2) * BUILDING_SCALE;
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
            
            // animateMesh now accepts isSeatedOnFurniture as 5th param, characterType as 6th, isMounted as 7th
            // OPTIMIZED: Cache part references to avoid getObjectByName every frame
            const animateMesh = (meshWrapper, isMoving, emoteType, emoteStartTime, isSeatedOnFurniture = false, characterType = 'penguin', isMounted = false) => {
                if (!meshWrapper || !meshWrapper.children[0]) return;
                const meshInner = meshWrapper.children[0];
                const isMarcus = characterType === 'marcus';
                
                // Use cached parts if available, otherwise look up and cache
                if (!meshWrapper._animParts) {
                    meshWrapper._animParts = {
                        flipperL: meshInner.getObjectByName('flipper_l'),
                        flipperR: meshInner.getObjectByName('flipper_r'),
                        head: meshInner.getObjectByName('head'),
                        hatPart: meshInner.getObjectByName('hat'),
                        eyesPart: meshInner.getObjectByName('eyes'),
                        mouthPart: meshInner.getObjectByName('mouth'),
                        footL: meshInner.getObjectByName('foot_l'),
                        footR: meshInner.getObjectByName('foot_r')
                    };
                }
                const { flipperL, flipperR, head, hatPart, eyesPart, mouthPart, footL, footR } = meshWrapper._animParts;
                
                if(flipperL) { flipperL.rotation.set(0,0,0); }
                if(flipperR) { flipperR.rotation.set(0,0,0); }
                // Position penguin so feet touch ground
                meshInner.position.y = 0.8;
                meshInner.rotation.z = 0;
                meshInner.rotation.y = 0;
                meshInner.rotation.x = 0;
                if(footL) { footL.rotation.x = 0; footL.position.z = 0; }
                if(footR) { footR.rotation.x = 0; footR.position.z = 0; }
                if(head) { head.rotation.x = 0; }
                if(hatPart) { hatPart.rotation.x = 0; }
                if(eyesPart) { eyesPart.rotation.x = 0; }
                if(mouthPart) { mouthPart.rotation.x = 0; }

                // When mounted, apply sitting animation (same as regular Sit emote)
                if (isMounted && mountEnabledRef.current) {
                    // Sitting pose - same as 'Sit' emote
                    meshInner.position.y = 0.5;
                    // Penguin feet extend forward (rotation + position so they're visible)
                    if(footL) {
                        footL.rotation.x = -Math.PI / 2.5;
                        footL.position.z = 2.5;
                    }
                    if(footR) {
                        footR.rotation.x = -Math.PI / 2.5;
                        footR.position.z = 2.5;
                    }
                    // Arms/flippers rest on sides
                    if(flipperL) flipperL.rotation.z = 0.3;
                    if(flipperR) flipperR.rotation.z = -0.3;
                    return; // Don't apply other animations when mounted
                }

                if (emoteType) {
                    const eTime = (Date.now() - emoteStartTime) * 0.001;
                    
                    if (emoteType === 'Wave') {
                        if(flipperR) {
                            flipperR.rotation.z = -Math.PI / 1.25; 
                            flipperR.rotation.x = Math.sin(eTime * 10) * 0.5; 
                        }
                    } 
                    else if (emoteType === 'Dance') {
                        meshInner.rotation.y = eTime * 6; 
                        meshInner.position.y = 0.8 + Math.abs(Math.sin(eTime * 5)) * 1;
                        if(flipperL) flipperL.rotation.z = Math.sin(eTime * 10) * 1;
                        if(flipperR) flipperR.rotation.z = -Math.sin(eTime * 10) * 1;
                    }
                    else if (emoteType === 'Sit') {
                        // SIMPLIFIED SITTING SYSTEM:
                        // seatHeight = Y position of seat surface (where butt goes)
                        // meshInner offset is SAME for ground and furniture sitting
                        // This means seatHeight alone determines elevation
                        if (isMarcus) {
                            // Marcus sitting - same offset for ground and furniture
                            meshInner.position.y = -0.2;
                            // Marcus legs extend forward
                            if(footL) {
                                footL.rotation.x = -Math.PI / 3;
                                footL.position.z = 1.5;
                            }
                            if(footR) {
                                footR.rotation.x = -Math.PI / 3;
                                footR.position.z = 1.5;
                            }
                        } else {
                            // Penguin sitting - same offset for ground and furniture
                            meshInner.position.y = 0.5;
                            // Penguin feet extend forward
                            if(footL) {
                                footL.rotation.x = -Math.PI / 2.5;
                                footL.position.z = 2.5;
                            }
                            if(footR) {
                                footR.rotation.x = -Math.PI / 2.5;
                                footR.position.z = 2.5;
                            }
                        }
                        // Arms/flippers rest on sides (same for both)
                        if(flipperL) flipperL.rotation.z = 0.3;
                        if(flipperR) flipperR.rotation.z = -0.3;
                    }
                    else if (emoteType === 'Laugh') {
                          const laughRot = -0.5 + Math.sin(eTime * 20) * 0.2; 
                          if(head) head.rotation.x = laughRot;
                          if(hatPart) hatPart.rotation.x = laughRot;
                          if(eyesPart) eyesPart.rotation.x = laughRot;
                          if(mouthPart) mouthPart.rotation.x = laughRot;
                          meshInner.rotation.x = -0.2;
                          meshInner.position.y = 0.8 + Math.abs(Math.sin(eTime * 15)) * 0.1;
                    }
                    else if (emoteType === 'Breakdance') {
                        // Breakdance: penguin spins on back with kicking feet (continuous like Sit)
                        const spinSpeed = eTime * 6; // Spin speed
                        const kickSpeed = eTime * 10; // Leg kick speed
                        
                        // Fully upside down on Z axis (lying on back), spin on Y
                        meshInner.rotation.x = 0;
                        meshInner.rotation.z = Math.PI; // Upside down
                        meshInner.rotation.y = spinSpeed; // Spinning
                        meshInner.position.y = 1.8 + Math.sin(eTime * 3) * 0.1; // Raised up so head isn't underground
                        
                        // Kick feet in circles (bicycle motion)
                        if(footL) {
                            footL.rotation.x = Math.sin(kickSpeed) * 1.0;
                            footL.position.z = 1 + Math.sin(kickSpeed) * 0.5;
                        }
                        if(footR) {
                            footR.rotation.x = Math.sin(kickSpeed + Math.PI) * 1.0;
                            footR.position.z = 1 + Math.sin(kickSpeed + Math.PI) * 0.5;
                        }
                        
                        // Flippers straight out to sides (T-pose style)
                        if(flipperL) {
                            flipperL.rotation.z = Math.PI / 2; // Straight out left
                            flipperL.rotation.x = 0;
                        }
                        if(flipperR) {
                            flipperR.rotation.z = -Math.PI / 2; // Straight out right
                            flipperR.rotation.x = 0;
                        }
                    }
                    
                    // Auto-stop non-persistent emotes after 3 seconds (Sit and Breakdance are continuous)
                    if (emoteType !== 'Sit' && emoteType !== 'Breakdance' && eTime > 3) {
                        if (playerRef.current === meshWrapper) {
                            emoteRef.current.type = null;
                            // Notify server that emote ended
                            mpSendEmote(null);
                        }
                    }
                } else if (isMoving) {
                    const walkCycle = time * 10;
                    if(footL) footL.rotation.x = Math.sin(walkCycle) * 0.5;
                    if(footR) footR.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
                    if(flipperL) flipperL.rotation.x = Math.sin(walkCycle) * 0.5;
                    if(flipperR) flipperR.rotation.x = -Math.sin(walkCycle) * 0.5;
                    meshInner.rotation.z = Math.sin(time * 8) * 0.05; 
                } else {
                    meshInner.rotation.z = Math.sin(time * 1.5) * 0.02;
                }
            };

            if (playerRef.current) {
                // Pass local player's seatedRef state for furniture sitting, character type, and mounted state
                // Only consider mounted if mount is enabled in settings
                const isMounted = !!(playerRef.current.userData?.mount && playerRef.current.userData?.mountData && mountEnabledRef.current);
                animateMesh(playerRef.current, moving, emoteRef.current.type, emoteRef.current.startTime, !!seatedRef.current, penguinData?.characterType || 'penguin', isMounted);
                
                // OPTIMIZED: Check if player has animated cosmetics
                const hasAnimatedCosmetics = penguinData?.hat === 'propeller' || 
                                              penguinData?.hat === 'flamingCrown' ||
                                              penguinData?.mouth === 'cigarette' || 
                                              penguinData?.mouth === 'pipe' ||
                                              penguinData?.mouth === 'cigar' ||
                                              penguinData?.mouth === 'fireBreath' ||
                                              penguinData?.mouth === 'iceBreath' ||
                                              penguinData?.mouth === 'bubblegum' ||
                                              penguinData?.eyes === 'laser' ||
                                              penguinData?.eyes === 'fire' ||
                                              penguinData?.bodyItem === 'angelWings' ||
                                              penguinData?.bodyItem === 'demonWings' ||
                                              penguinData?.bodyItem === 'fireAura' ||
                                              penguinData?.bodyItem === 'lightningAura';
                
                if (hasAnimatedCosmetics) {
                    // Animate local player's cosmetics
                    playerRef.current.traverse(child => {
                        if (child.name === 'propeller_blades') {
                            child.rotation.y += delta * 15; // Fast spin
                        }
                        
                        // Animate smoke particles (cigarette, pipe, cigar)
                        if (child.userData?.isSmokeEmitter) {
                            child.children.forEach((particle, i) => {
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
                        
                        // Animate laser eyes - pulsing intensity
                        if (child.userData?.isLaserEyes) {
                            const intensity = 1 + Math.sin(time * 10) * 0.5;
                            child.children.forEach(light => {
                                if (light.isPointLight) {
                                    light.intensity = intensity;
                                }
                            });
                        }
                        
                        // Animate fire eyes - flickering flames
                        if (child.userData?.isFireEyes) {
                            child.children.forEach(eyeGroup => {
                                if (eyeGroup.children) {
                                    eyeGroup.children.forEach((particle, i) => {
                                        if (particle.isMesh) {
                                            // Flames flicker up
                                            particle.position.y = (particle.userData.baseY || 0) + Math.sin(time * 15 + i) * 0.1 * VOXEL_SIZE;
                                            particle.position.x = Math.sin(time * 12 + i * 2) * 0.05 * VOXEL_SIZE;
                                            if (particle.material) {
                                                particle.material.opacity = 0.7 + Math.sin(time * 20 + i) * 0.3;
                                            }
                                        }
                                        if (particle.isPointLight) {
                                            particle.intensity = 0.5 + Math.sin(time * 15) * 0.3;
                        }
                    });
                }
                            });
            }
            
                        // Animate angel/demon wings - butterfly flapping
                        if (child.userData?.isWings) {
                            const phase = child.userData.wingPhase || 0;
                            const flapSpeed = 6; // Flaps per second
                            const flapAngle = Math.sin(time * flapSpeed + phase) * 0.3; // ±0.3 radians
                            child.rotation.y = flapAngle;
                        }
                        
                        // Fire Aura - spinning flames like campfire
                        if (child.userData?.isFireAura) {
                            // Rotate the entire aura ring
                            child.rotation.y = time * 2;
                            
                            // Animate individual flames
                            child.children.forEach((flame, i) => {
                                if (flame.userData?.isFlame) {
                                    const offset = flame.userData.offset || 0;
                                    // Flicker height
                                    flame.position.y = flame.userData.baseY + Math.sin(time * 8 + offset) * 0.3 * VOXEL_SIZE;
                                    // Flicker scale
                                    flame.scale.x = 0.8 + Math.sin(time * 10 + offset) * 0.3;
                                    flame.scale.z = 0.8 + Math.cos(time * 10 + offset) * 0.3;
                                }
                            });
                            
                            // Flicker light
                            if (child.userData.fireLight) {
                                child.userData.fireLight.intensity = 1.5 + Math.sin(time * 12) * 0.5;
                            }
                        }
                        
                        // Lightning Aura - spinning electric bolts
                        if (child.userData?.isLightningAura) {
                            // Rotate the aura ring faster
                            child.rotation.y = time * 3;
                            
                            // Animate individual bolts
                            child.children.forEach((bolt) => {
                                if (bolt.userData?.flickerOffset !== undefined) {
                                    // Random flicker visibility
                                    const flicker = Math.sin(time * 20 + bolt.userData.flickerOffset);
                                    bolt.visible = flicker > -0.3;
                                    if (bolt.material) {
                                        bolt.material.opacity = 0.5 + flicker * 0.4;
                                    }
                                    // Random position jitter
                                    bolt.position.y = Math.sin(time * 15 + bolt.userData.flickerOffset) * 0.5 * VOXEL_SIZE;
                                }
                            });
                            
                            // Flicker light
                            if (child.userData.lightningLight) {
                                child.userData.lightningLight.intensity = 1 + Math.random() * 1;
                            }
                        }
                        
                        // Flaming Crown fire particles
                        if (child.userData?.isFireEmitter) {
                            child.children.forEach((particle, i) => {
                                // Fire flickers up and resets
                                particle.position.y += delta * 3;
                                particle.position.x = (particle.userData.baseX || 0) + Math.sin(time * 8 + i) * 0.15;
                                particle.position.z = (particle.userData.baseZ || 0) + Math.cos(time * 6 + i) * 0.15;
                                
                                const height = particle.position.y - (particle.userData.baseY || 0);
                                if (particle.material) {
                                    particle.material.opacity = Math.max(0, 0.9 - height * 0.15);
                                }
                                // Scale down as it rises
                                const scale = Math.max(0.3, 1 - height * 0.1);
                                particle.scale.setScalar(scale);
                                
                                if (height > 5) {
                                    particle.position.y = particle.userData.baseY || 0;
                                    particle.scale.setScalar(1);
                                    if (particle.material) particle.material.opacity = 0.9;
                                }
                            });
                        }
                        
                        
                        // Fire Breath particles
                        if (child.userData?.isBreathFire) {
                            child.children.forEach((particle, i) => {
                                // Shoot forward
                                particle.position.z += delta * 15;
                                particle.position.y += (Math.random() - 0.5) * delta * 2;
                                particle.position.x += (Math.random() - 0.5) * delta * 2;
                                
                                const dist = particle.position.z - (particle.userData.baseZ || 0);
                                if (particle.material) {
                                    particle.material.opacity = Math.max(0, 0.9 - dist * 0.1);
                                }
                                
                                if (dist > 8) {
                                    particle.position.z = particle.userData.baseZ || 0;
                                    particle.position.y = 0;
                                    particle.position.x = 0;
                                    if (particle.material) particle.material.opacity = 0.9;
                                }
                            });
                        }
                        
                        // Ice Breath particles
                        if (child.userData?.isBreathIce) {
                            child.children.forEach((particle, i) => {
                                particle.position.z += delta * 12;
                                particle.position.y += Math.sin(time * 10 + i) * delta;
                                particle.position.x += Math.cos(time * 8 + i) * delta;
                                
                                const dist = particle.position.z - (particle.userData.baseZ || 0);
                                if (particle.material) {
                                    particle.material.opacity = Math.max(0, 0.8 - dist * 0.08);
                                }
                                
                                if (dist > 10) {
                                    particle.position.z = particle.userData.baseZ || 0;
                                    particle.position.y = 0;
                                    particle.position.x = 0;
                                    if (particle.material) particle.material.opacity = 0.8;
                                }
                            });
                        }
                        
                        // Bubblegum grow/pop animation
                        if (child.userData?.isBubblegum) {
                            const bubble = child.children[0];
                            if (bubble) {
                                // Cycle: grow from 0.5 to 2, then pop back to 0.5
                                const cycleTime = (time % 4) / 4; // 4 second cycle
                                let scale;
                                if (cycleTime < 0.8) {
                                    // Growing phase
                                    scale = 0.5 + cycleTime * 2;
                                } else if (cycleTime < 0.85) {
                                    // Pop! shrink rapidly
                                    scale = 2.1 - (cycleTime - 0.8) * 30;
                                } else {
                                    // Stay small before next cycle
                                    scale = 0.5;
                                }
                                bubble.scale.setScalar(Math.max(0.3, scale));
                            }
                        }
                    });
                }
                
                // --- WIZARD HAT WORLD-SPACE TRAIL (Per-Player Pools) ---
                // Each player with wizard hat has their own particle pool (works in all rooms)
                if (penguinData?.hat === 'wizardHat' && wizardTrailRef.current) {
                    const poolKey = 'localPlayer';
                    let trailGroup = wizardTrailRef.current.pools.get(poolKey);
                    
                    // Create pool if it doesn't exist
                    if (!trailGroup) {
                        trailGroup = wizardTrailRef.current.createPool();
                        wizardTrailRef.current.pools.set(poolKey, trailGroup);
                        sceneRef.current.add(trailGroup);
                    }
                    
                    const playerWorldPos = playerRef.current.position;
                    
                    // Spawn particles when moving - controlled rate (15/sec for 50 particles over 3 seconds)
                    if (moving) {
                        const spawnInterval = 1 / 15;
                        const timeSinceLastSpawn = time - trailGroup.userData.lastSpawnTime;
                        
                        if (timeSinceLastSpawn >= spawnInterval) {
                            let spawned = false;
                            for (let attempts = 0; attempts < trailGroup.children.length && !spawned; attempts++) {
                                const idx = (trailGroup.userData.nextParticleIndex + attempts) % trailGroup.children.length;
                                const particle = trailGroup.children[idx];
                                
                                if (!particle.userData.active) {
                                    particle.position.set(
                                        playerWorldPos.x + (Math.random() - 0.5) * 0.4,
                                        playerWorldPos.y + 2.2 + (Math.random() - 0.5) * 0.2,
                                        playerWorldPos.z + (Math.random() - 0.5) * 0.4
                                    );
                                    particle.userData.active = true;
                                    particle.userData.birthTime = time;
                                    particle.visible = true;
                                    particle.material.opacity = 0.9;
                                    particle.scale.setScalar(0.8 + Math.random() * 0.4);
                                    
                                    trailGroup.userData.nextParticleIndex = (idx + 1) % trailGroup.children.length;
                                    trailGroup.userData.lastSpawnTime = time;
                                    spawned = true;
                                }
                            }
                        }
                    }
                    
                    // Update all active particles
                    trailGroup.children.forEach((particle) => {
                        if (particle.userData.active) {
                            const age = time - particle.userData.birthTime;
                            const lifeProgress = age / particle.userData.lifespan;
                            
                            if (lifeProgress < 1) {
                                particle.position.y += delta * 0.05;
                                let opacity;
                                if (lifeProgress < 0.7) {
                                    opacity = 0.9;
                                } else {
                                    const fadeProgress = (lifeProgress - 0.7) / 0.3;
                                    opacity = 0.9 * (1 - fadeProgress * fadeProgress);
                                }
                                particle.material.opacity = Math.max(0, opacity);
                                particle.scale.setScalar(particle.scale.x * (1 + delta * 0.05));
                            } else {
                                particle.userData.active = false;
                                particle.visible = false;
                            }
                        }
                    });
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
            
            // OPTIMIZATION: Only run full AI logic every 2nd frame (60fps -> 30fps AI updates)
            // Visibility updates still happen every frame for smooth enter/exit
            const runFullAILogic = frameCount % 2 === 0;
            
            aiAgentsRef.current.forEach(ai => {
                // Only show AI that are in the same room as the player (every frame for smoothness)
                const sameRoom = ai.currentRoom === roomRef.current;
                if (ai.mesh) ai.mesh.visible = sameRoom;
                
                // Also show/hide AI's puffle - O(1) lookup now
                const aiPuffleEntry = puffleMap.get(ai.id);
                if (aiPuffleEntry && aiPuffleEntry.puffle && aiPuffleEntry.puffle.mesh) {
                    aiPuffleEntry.puffle.mesh.visible = sameRoom;
                }
                
                // OPTIMIZATION: Skip full AI logic for AIs in different rooms AND throttle updates
                let aiMoving = false;
                
                // Skip expensive AI logic on odd frames (but still sync mesh positions)
                if (!runFullAILogic) {
                    // Just sync mesh position on skipped frames
                    if (ai.mesh && sameRoom) {
                        ai.mesh.position.set(ai.pos.x, 0, ai.pos.z);
                    }
                    return; // Skip to next AI (forEach continues)
                }
                
                // --- AI Room Transition Logic (use cached values) ---
                const dojoBx = dojoBxCached;
                const dojoBz = dojoBzCached;
                const dojoHd = dojoHdCached;
                const dojoDoorZ = dojoBz + dojoHd; // Front of dojo (door position)
                
                // Pizza Parlor position (from BUILDINGS: { x: 25, z: 5 }, size w:12, d:10)
                const pizzaBx = centerX + 25;
                const pizzaBz = centerZ + 5;
                const pizzaDoorZ = pizzaBz + 5 + 1; // Front of pizza (door)
                
                if (ai.currentRoom === 'town') {
                    // Check if AI is at the dojo door
                    const doorWidth = 4;
                    const atDojoDoor = Math.abs(ai.pos.x - dojoBx) < doorWidth && 
                                       Math.abs(ai.pos.z - dojoDoorZ) < 4; // Increased detection zone
                    
                    // Check if AI is at the pizza door
                    const atPizzaDoor = Math.abs(ai.pos.x - pizzaBx) < 5 && 
                                        Math.abs(ai.pos.z - pizzaDoorZ) < 4;
                    
                    // When at dojo door, chance to enter (reduced to avoid getting stuck)
                    if (atDojoDoor && Math.random() < 0.03) { // 3% per frame
                        ai.currentRoom = 'dojo';
                        ai.pos.x = (Math.random() - 0.5) * 10;
                        ai.pos.z = 12 + Math.random() * 3;
                        ai.action = 'idle';
                        ai.actionTimer = now + 2000 + Math.random() * 3000;
                        ai.target = null;
                        ai.stuckCounter = 0;
                        if (aiPuffleEntry && aiPuffleEntry.puffle) {
                            aiPuffleEntry.puffle.position.x = ai.pos.x + 1.5;
                            aiPuffleEntry.puffle.position.z = ai.pos.z + 1.5;
                        }
                    }
                    // When at pizza door, chance to enter
                    else if (atPizzaDoor && Math.random() < 0.03) {
                        ai.currentRoom = 'pizza';
                        ai.pos.x = (Math.random() - 0.5) * 8;
                        ai.pos.z = 12 + Math.random() * 2; // Near entrance inside pizza
                        ai.action = 'idle';
                        ai.actionTimer = now + 2000 + Math.random() * 3000;
                        ai.target = null;
                        ai.stuckCounter = 0;
                        if (aiPuffleEntry && aiPuffleEntry.puffle) {
                            aiPuffleEntry.puffle.position.x = ai.pos.x + 1.5;
                            aiPuffleEntry.puffle.position.z = ai.pos.z + 1.5;
                        }
                    }
                    // If stuck at door too long without entering, move away
                    else if ((atDojoDoor || atPizzaDoor) && ai.stuckCounter > 60) {
                        ai.action = 'walk';
                        ai.target = { 
                            x: centerX + (Math.random() - 0.5) * 30, 
                            z: centerZ + (Math.random() - 0.5) * 30 
                        };
                        ai.actionTimer = now + 5000;
                        ai.stuckCounter = 0;
                    }
                } else if (ai.currentRoom === 'dojo') {
                    // AI in dojo can exit
                    const atExit = ai.pos.z > 13 && Math.abs(ai.pos.x) < 6;
                    
                    if (atExit && Math.random() < 0.02) {
                        ai.currentRoom = 'town';
                        ai.pos.x = dojoBx + (Math.random() - 0.5) * 6;
                        ai.pos.z = dojoDoorZ + 3 + Math.random() * 3;
                        ai.action = 'idle';
                        ai.actionTimer = now + 2000 + Math.random() * 3000;
                        ai.target = null;
                        ai.stuckCounter = 0;
                        if (aiPuffleEntry && aiPuffleEntry.puffle) {
                            aiPuffleEntry.puffle.position.x = ai.pos.x + 1.5;
                            aiPuffleEntry.puffle.position.z = ai.pos.z + 1.5;
                        }
                    }
                } else if (ai.currentRoom === 'pizza') {
                    // AI in pizza can exit - check if near front door (z > 14)
                    const atExit = ai.pos.z > 13 && Math.abs(ai.pos.x) < 6;
                    
                    if (atExit && Math.random() < 0.015) {
                        ai.currentRoom = 'town';
                        ai.pos.x = pizzaBx + (Math.random() - 0.5) * 6;
                        ai.pos.z = pizzaDoorZ + 3 + Math.random() * 3;
                        ai.action = 'idle';
                        ai.actionTimer = now + 2000 + Math.random() * 3000;
                        ai.target = null;
                        ai.stuckCounter = 0;
                        if (aiPuffleEntry && aiPuffleEntry.puffle) {
                            aiPuffleEntry.puffle.position.x = ai.pos.x + 1.5;
                            aiPuffleEntry.puffle.position.z = ai.pos.z + 1.5;
                        }
                    }
                }
                
                // --- AI Behavior (conversation, walking, etc.) ---
                if (ai.action === 'chatting') {
                    if (ai.conversationPartner) {
                        const partner = aiMap.get(ai.conversationPartner); // O(1) lookup
                        // Only chat with AI in same room
                        if (partner && partner.currentRoom === ai.currentRoom) {
                            ai.mesh.lookAt(partner.pos.x, 0, partner.pos.z);
                        } else {
                            // Partner left room, end conversation
                            ai.action = 'idle';
                            ai.conversationCooldown = now + 5000;
                            ai.conversationPartner = null;
                        }
                    }

                    if (ai.conversationTurn) {
                        if (!ai.bubble) {
                            const script = ai.conversationScript;
                            const line = script[ai.conversationLineIdx];
                            
                            if (line) {
                                const bubble = createChatSprite(line);
                                ai.mesh.add(bubble);
                                ai.bubble = bubble;
                                ai.bubbleTimer = now + 3500;
                                
                                ai.emoteType = 'Wave';
                                ai.emoteStart = now;
                            } else {
                                ai.action = 'idle';
                                ai.conversationCooldown = now + 10000;
                                ai.conversationPartner = null;
                                ai.emoteType = null;
                            }
                        } else if (now > ai.bubbleTimer) {
                            ai.mesh.remove(ai.bubble);
                            ai.bubble = null;
                            ai.conversationTurn = false;
                            
                            const partner = aiMap.get(ai.conversationPartner); // O(1) lookup
                            if (partner) {
                                partner.conversationTurn = true;
                                partner.conversationLineIdx++;
                            }
                            
                            if (ai.conversationLineIdx >= ai.conversationScript.length - 2) {
                                 // END CONVERSATION FOR BOTH AI
                                 ai.action = 'idle';
                                 ai.emoteType = 'Laugh';
                                 ai.emoteStart = now;
                                 ai.actionTimer = now + 2000;
                                 ai.conversationCooldown = now + 15000;
                                 ai.conversationPartner = null;
                                 ai.conversationScript = null;
                                 ai.conversationTurn = false;
                                 
                                 // Also end for partner
                                 if (partner) {
                                     partner.action = 'idle';
                                     partner.emoteType = 'Laugh';
                                     partner.emoteStart = now;
                                     partner.actionTimer = now + 2000;
                                     partner.conversationCooldown = now + 15000;
                                     partner.conversationPartner = null;
                                     partner.conversationScript = null;
                                     partner.conversationTurn = false;
                                     // Clear partner's bubble if they have one
                                     if (partner.bubble && partner.mesh) {
                                         partner.mesh.remove(partner.bubble);
                                         partner.bubble = null;
                                     }
                                 }
                            }
                        }
                    } else {
                        ai.emoteType = null;
                    }
                }
                
                else if (now > ai.actionTimer) {
                    // Clear sitting emote when timer expires
                    if (ai.action === 'sitting') {
                        ai.emoteType = null;
                    }
                    
                    // If we have a scheduled walk target from being stuck, use it
                    if (ai.nextWalkTarget) {
                        ai.action = 'walk';
                        ai.target = ai.nextWalkTarget;
                        ai.nextWalkTarget = null;
                        ai.emoteType = null;
                        ai.actionTimer = now + 5000 + Math.random() * 4000;
                    }
                    // Find conversation partner in same room (not if sitting nearby)
                    else {
                    let foundPartner = null;
                        if (now > ai.conversationCooldown && ai.action !== 'sitting') {
                        for(let other of aiAgentsRef.current) {
                            if (other.id !== ai.id && 
                                    (other.action === 'idle' || other.action === 'sitting') && 
                                    other.currentRoom === ai.currentRoom &&
                                now > other.conversationCooldown) {
                                const dx = other.pos.x - ai.pos.x;
                                const dz = other.pos.z - ai.pos.z;
                                const dist = Math.sqrt(dx*dx + dz*dz);
                                    if (dist < 6) { // Slightly larger conversation range
                                    foundPartner = other;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundPartner) {
                        const scriptIdx = Math.floor(Math.random() * CONVERSATIONS.length);
                        const script = CONVERSATIONS[scriptIdx];
                        
                        ai.action = 'chatting';
                        ai.conversationPartner = foundPartner.id;
                        ai.conversationScript = script;
                        ai.conversationLineIdx = 0;
                        ai.conversationTurn = true;
                        
                        foundPartner.action = 'chatting';
                        foundPartner.conversationPartner = ai.id;
                        foundPartner.conversationScript = script;
                        foundPartner.conversationLineIdx = 1;
                        foundPartner.conversationTurn = false;
                        
                        foundPartner.actionTimer = now + 999999; 
                        ai.actionTimer = now + 999999;
                    }
                    
                    else {
                        const r = Math.random();
                        if (r < 0.10) {
                            // Random emote (not Sit - that's handled separately)
                            ai.action = 'idle';
                            const nonSitEmotes = ['Wave', 'Dance', 'Laugh'];
                            ai.emoteType = nonSitEmotes[Math.floor(Math.random() * nonSitEmotes.length)];
                            ai.emoteStart = now;
                            ai.actionTimer = now + 3000 + Math.random() * 2000;
                        }
                        else if (r < 0.20) {
                            // Sit down for a while (organic rest behavior)
                            ai.action = 'sitting';
                            ai.emoteType = 'Sit';
                            ai.emoteStart = now;
                            // Sit for 8-20 seconds (longer, more natural)
                            ai.actionTimer = now + 8000 + Math.random() * 12000;
                        }
                        else if (r < 0.75) {
                            // Walk somewhere
                            ai.action = 'walk';
                            ai.emoteType = null;
                            
                            if (ai.currentRoom === 'town') {
                                const walkChoice = Math.random();
                                if (walkChoice < 0.12) {
                                    // Walk towards dojo door
                                    const doorX = dojoBxCached + (Math.random() - 0.5) * 4;
                                    const doorZ = dojoBzCached + dojoHdCached + 2;
                                    ai.target = { x: doorX, z: doorZ };
                                } else if (walkChoice < 0.24) {
                                    // Walk towards pizza door
                                    const doorX = pizzaBx + (Math.random() - 0.5) * 4;
                                    const doorZ = pizzaDoorZ + 2;
                                    ai.target = { x: doorX, z: doorZ };
                                } else if (walkChoice < 0.35) {
                                    // Walk to campfire area (center of T intersection)
                                    ai.target = { 
                                        x: centerX + (Math.random() - 0.5) * 15, 
                                        z: centerZ + (Math.random() - 0.5) * 15 
                                    };
                                } else if (walkChoice < 0.45) {
                                    // Walk to Christmas tree area (east side)
                                    ai.target = { 
                                        x: centerX + 29 + (Math.random() - 0.5) * 8, 
                                        z: centerZ - 1 + (Math.random() - 0.5) * 8 
                                    };
                                } else if (walkChoice < 0.55) {
                                    // Walk along the top of the T (horizontal street)
                                    ai.target = { 
                                        x: centerX + (Math.random() - 0.5) * 80, 
                                        z: centerZ - 15 + (Math.random() - 0.5) * 10 
                                    };
                                } else if (walkChoice < 0.65) {
                                    // Walk along T-bar street near igloos (but NOT into igloos)
                                    // Stay on the street (z around centerZ - 45, between the two rows of igloos)
                                    const isLeft = Math.random() > 0.5;
                                    ai.target = { 
                                        x: centerX + (isLeft ? -50 : 50) + (Math.random() - 0.5) * 20, 
                                        z: centerZ - 45 + (Math.random() - 0.5) * 15  // Stay on street
                                    };
                                } else {
                                    // Random walk in town - avoid buildings, stay within walls
                                    let tx, tz;
                                    let attempts = 0;
                                    let validTarget = false;
                                    const mapMargin = 15; // Stay away from wall boundaries
                                    
                                    do {
                                        tx = centerX + (Math.random()-0.5) * 180; // Larger map
                                        tz = centerZ + (Math.random()-0.5) * 180;
                                        validTarget = true;
                                        
                                        // Check wall boundaries
                                        if (tx < mapMargin || tx > CITY_SIZE * BUILDING_SCALE - mapMargin ||
                                            tz < mapMargin || tz > CITY_SIZE * BUILDING_SCALE - mapMargin) {
                                            validTarget = false;
                                        }
                                        
                                        // Check against all buildings
                                        if (validTarget) {
                                            for (const building of BUILDINGS) {
                                                const bx = centerX + building.position.x;
                                                const bz = centerZ + building.position.z;
                                                const hw = building.size.w / 2 + 4;
                                                const hd = building.size.d / 2 + 4;
                                                
                                                if (tx > bx - hw && tx < bx + hw && tz > bz - hd && tz < bz + hd) {
                                                    validTarget = false;
                                                    break;
                                                }
                                            }
                                        }
                                        
                                        // Check against igloo positions (AI cannot enter igloos)
                                        if (validTarget) {
                                            const iglooPositions = [
                                                // North row igloos
                                                { x: -75, z: -75 }, { x: -50, z: -78 }, { x: -25, z: -75 },
                                                { x: 25, z: -75 }, { x: 50, z: -78 }, { x: 75, z: -75 },
                                                // South row igloos  
                                                { x: -70, z: -15 }, { x: -40, z: -18 },
                                                { x: 40, z: -18 }, { x: 70, z: -15 }
                                            ];
                                            const iglooRadius = 8; // Keep AI away from igloo centers
                                            
                                            for (const igloo of iglooPositions) {
                                                const ix = centerX + igloo.x;
                                                const iz = centerZ + igloo.z;
                                                const dx = tx - ix;
                                                const dz = tz - iz;
                                                if (Math.sqrt(dx*dx + dz*dz) < iglooRadius) {
                                                    validTarget = false;
                                                    break;
                                                }
                                            }
                                        }
                                        attempts++;
                                    } while (!validTarget && attempts < 8);
                                    
                                    ai.target = { x: tx, z: tz };
                                }
                            } else if (ai.currentRoom === 'dojo') {
                                if (Math.random() < 0.30) {
                                    // Walk towards exit
                                    ai.target = { x: (Math.random() - 0.5) * 6, z: 14 + Math.random() * 2 };
                                } else {
                                    // Walk around inside dojo
                                    const tx = (Math.random()-0.5) * 26;
                                    const tz = (Math.random()-0.5) * 26;
                                    ai.target = { x: tx, z: tz };
                                }
                            } else if (ai.currentRoom === 'pizza') {
                                if (Math.random() < 0.20) {
                                    // Walk towards exit
                                    ai.target = { x: (Math.random() - 0.5) * 6, z: 14 + Math.random() * 2 };
                                } else if (Math.random() < 0.50) {
                                    // Walk to a table area
                                    const tableSpots = [
                                        { x: -8 + (Math.random()-0.5)*3, z: 2 + (Math.random()-0.5)*2 },
                                        { x: 8 + (Math.random()-0.5)*3, z: 2 + (Math.random()-0.5)*2 },
                                        { x: -8 + (Math.random()-0.5)*3, z: 9 + (Math.random()-0.5)*2 },
                                        { x: 8 + (Math.random()-0.5)*3, z: 9 + (Math.random()-0.5)*2 },
                                    ];
                                    ai.target = tableSpots[Math.floor(Math.random() * tableSpots.length)];
                                } else {
                                    // Random walk in pizza (avoid counter)
                                    let tx = (Math.random()-0.5) * 26;
                                    let tz = -8 + Math.random() * 20; // Avoid back counter
                                    ai.target = { x: tx, z: tz };
                                }
                            }
                            ai.actionTimer = now + 5000 + Math.random() * 5000;
                        }
                        else {
                            // Idle - longer, more varied wait times for natural feel
                            ai.action = 'idle';
                            ai.emoteType = null;
                            ai.actionTimer = now + 3000 + Math.random() * 5000;
                        }
                    }
                    } // Close the else block for nextWalkTarget check
                }
                
                // --- AI Movement ---
                if (ai.action === 'walk' && ai.target) {
                    const dx = ai.target.x - ai.pos.x;
                    const dz = ai.target.z - ai.pos.z;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    
                    if (dist > 0.5) {
                        const targetRot = Math.atan2(dx, dz);
                        let angleDiff = targetRot - ai.rot;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        ai.rot += angleDiff * 0.1;
                        
                        const moveSpeed = speed * 0.6; 
                        
                        const nextX = ai.pos.x + Math.sin(ai.rot) * moveSpeed;
                        const nextZ = ai.pos.z + Math.cos(ai.rot) * moveSpeed;
                        
                        let collided = false;
                        
                        // Collision depends on room
                        if (ai.currentRoom === 'town') {
                            // Town wall collision - use wall boundaries
                            const WALL_MARGIN = 10;
                            const MAP_SIZE = CITY_SIZE * BUILDING_SCALE;
                            
                            // Check wall boundaries
                            if (nextX < WALL_MARGIN || nextX > MAP_SIZE - WALL_MARGIN ||
                                nextZ < WALL_MARGIN || nextZ > MAP_SIZE - WALL_MARGIN) {
                                collided = true;
                            }
                            
                            // Building collision (with door exception)
                            if (!collided) {
                                for (const building of BUILDINGS) {
                                    const bx = centerX + building.position.x;
                                    const bz = centerZ + building.position.z;
                                    const hw = building.size.w / 2 + 0.5;
                                    const hd = building.size.d / 2 + 0.5;
                                    
                                    if (nextX > bx - hw && nextX < bx + hw && 
                                        nextZ > bz - hd && nextZ < bz + hd) {
                                        const doorWidth = 3;
                                        const atDoor = Math.abs(nextX - bx) < doorWidth && nextZ > bz + hd - 2;
                                        if (!atDoor) {
                                            collided = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        } else if (ai.currentRoom === 'dojo') {
                            // Dojo room bounds (DOJO_SIZE = 36, so -18 to 18)
                            const DOJO_HALF = 18;
                            if (Math.abs(nextX) > DOJO_HALF - 1 || Math.abs(nextZ) > DOJO_HALF - 1) {
                                collided = true;
                            }
                        } else if (ai.currentRoom === 'pizza') {
                            // Pizza parlor bounds (PIZZA_SIZE = 32, so -16 to 16)
                            const PIZZA_HALF = 16;
                            if (Math.abs(nextX) > PIZZA_HALF - 1 || Math.abs(nextZ) > PIZZA_HALF - 1) {
                                collided = true;
                            }
                            // Table collision (pedestals)
                            const tables = [
                                { x: -8, z: 2, r: 0.6 },
                                { x: 8, z: 2, r: 0.6 },
                                { x: -8, z: 9, r: 0.6 },
                                { x: 8, z: 9, r: 0.6 }
                            ];
                            for (const t of tables) {
                                const dx = nextX - t.x;
                                const dz = nextZ - t.z;
                                if (Math.sqrt(dx*dx + dz*dz) < t.r + 0.8) {
                                    collided = true;
                                    break;
                                }
                            }
                            // Counter collision (snug against back wall at z = -13.5, depth 3)
                            if (nextZ < -12 && nextZ > -16 && Math.abs(nextX) < 10) {
                                collided = true;
                            }
                        }

                        if (!collided) {
                            ai.pos.x = nextX;
                            ai.pos.z = nextZ;
                            aiMoving = true;
                            ai.stuckCounter = 0;
                        } else {
                            // AI hit a wall - improved stuck handling
                            ai.stuckCounter = (ai.stuckCounter || 0) + 1;
                            
                            if (ai.stuckCounter > 20) {
                                // Stuck too long - take a break then pick new random target away from current position
                                ai.action = 'idle';
                                ai.emoteType = null;
                                ai.actionTimer = now + 1000 + Math.random() * 2000;
                                ai.target = null;
                                ai.stuckCounter = 0;
                                
                                // Schedule a walk away from current area (larger map)
                                const mapMargin = 15;
                                const maxCoord = CITY_SIZE * BUILDING_SCALE - mapMargin;
                                ai.nextWalkTarget = {
                                    x: ai.currentRoom === 'town' 
                                        ? Math.max(mapMargin, Math.min(maxCoord, centerX + (Math.random() - 0.5) * 100))
                                        : (Math.random() - 0.5) * 20,
                                    z: ai.currentRoom === 'town' 
                                        ? Math.max(mapMargin, Math.min(maxCoord, centerZ + (Math.random() - 0.5) * 100))
                                        : (Math.random() - 0.5) * 20
                                };
                            } else if (ai.stuckCounter > 10) {
                                // Try backing up and turning
                                ai.rot += (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
                                const backDist = 2 + Math.random() * 3;
                                ai.target = {
                                    x: ai.pos.x + Math.sin(ai.rot) * backDist,
                                    z: ai.pos.z + Math.cos(ai.rot) * backDist
                                };
                            } else {
                                // Try sliding along the wall
                                const slideAngle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4 + Math.random() * Math.PI / 4);
                                ai.rot += slideAngle;
                                
                                const newDist = 4 + Math.random() * 6;
                                const mapMargin2 = 15;
                                const maxCoord2 = CITY_SIZE * BUILDING_SCALE - mapMargin2;
                                if (ai.currentRoom === 'town') {
                                    ai.target = {
                                        x: Math.max(mapMargin2, Math.min(maxCoord2, ai.pos.x + Math.sin(ai.rot) * newDist)),
                                        z: Math.max(mapMargin2, Math.min(maxCoord2, ai.pos.z + Math.cos(ai.rot) * newDist))
                                    };
                                } else if (ai.currentRoom === 'pizza') {
                                    ai.target = {
                                        x: Math.max(-14, Math.min(14, ai.pos.x + Math.sin(ai.rot) * newDist)),
                                        z: Math.max(-10, Math.min(14, ai.pos.z + Math.cos(ai.rot) * newDist))
                                    };
                                } else {
                                    ai.target = {
                                        x: Math.max(-15, Math.min(15, ai.pos.x + Math.sin(ai.rot) * newDist)),
                                        z: Math.max(-15, Math.min(15, ai.pos.z + Math.cos(ai.rot) * newDist))
                                    };
                                }
                            }
                        }
                    } else {
                        ai.action = 'idle';
                        ai.target = null;
                    }
                }
                
                // OPTIMIZATION: Skip expensive mesh updates for invisible AIs
                if (!sameRoom) return; // Early exit - AI not visible
                
                ai.mesh.position.set(ai.pos.x, 0, ai.pos.z);
                if (ai.action !== 'chatting') ai.mesh.rotation.y = ai.rot;
                
                animateMesh(ai.mesh, aiMoving, ai.emoteType, ai.emoteStart);
                
                // --- AI COSMETIC ANIMATIONS ---
                // Animate propeller, smoke, flames, wings etc. for AI
                const aiAppearance = ai.aiData;
                if (aiAppearance) {
                    const aiHasAnimatedCosmetics = aiAppearance.hat === 'propeller' || 
                                                   aiAppearance.hat === 'flamingCrown' ||
                                                   aiAppearance.hat === 'wizardHat' ||
                                                   aiAppearance.mouth === 'cigarette' || 
                                                   aiAppearance.mouth === 'pipe' ||
                                                   aiAppearance.mouth === 'cigar' ||
                                                   aiAppearance.eyes === 'laser' ||
                                                   aiAppearance.eyes === 'fire' ||
                                                   aiAppearance.bodyItem === 'angelWings' ||
                                                   aiAppearance.bodyItem === 'demonWings' ||
                                                   aiAppearance.bodyItem === 'fireAura' ||
                                                   aiAppearance.bodyItem === 'lightningAura';
                    
                    if (aiHasAnimatedCosmetics) {
                        ai.mesh.traverse(child => {
                            // Propeller spin
                            if (child.name === 'propeller_blades') {
                                child.rotation.y += delta * 15;
                            }
                            
                            // Smoke particles
                            if (child.userData?.isSmokeEmitter) {
                                child.children.forEach((particle, i) => {
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
                            
                            // Laser eyes pulse
                            if (child.userData?.isLaserEyes) {
                                const intensity = 1 + Math.sin(time * 10) * 0.5;
                                child.children.forEach(light => {
                                    if (light.isPointLight) light.intensity = intensity;
                                });
                            }
                            
                            // Fire eyes flicker
                            if (child.userData?.isFireEyes) {
                                child.children.forEach(eyeGroup => {
                                    if (eyeGroup.children) {
                                        eyeGroup.children.forEach((particle, i) => {
                                            if (particle.isMesh) {
                                                particle.position.y = (particle.userData.baseY || 0) + Math.sin(time * 15 + i) * 0.1 * VOXEL_SIZE;
                                                if (particle.material) particle.material.opacity = 0.7 + Math.sin(time * 20 + i) * 0.3;
                                            }
                                            if (particle.isPointLight) particle.intensity = 0.5 + Math.sin(time * 15) * 0.3;
                                        });
                                    }
                                });
                            }
                            
                            // Flaming crown fire
                            if (child.userData?.isFireEmitter) {
                                child.children.forEach((particle, i) => {
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
                            
                            // Wing flapping
                            if (child.userData?.isWings) {
                                const phase = child.userData.wingPhase || 0;
                                child.rotation.y = Math.sin(time * 6 + phase) * 0.3;
                            }
                            
                            // Fire Aura - spinning flames
                            if (child.userData?.isFireAura) {
                                child.rotation.y = time * 2;
                                child.children.forEach((flame) => {
                                    if (flame.userData?.isFlame) {
                                        const offset = flame.userData.offset || 0;
                                        flame.position.y = flame.userData.baseY + Math.sin(time * 8 + offset) * 0.3 * VOXEL_SIZE;
                                        flame.scale.x = 0.8 + Math.sin(time * 10 + offset) * 0.3;
                                        flame.scale.z = 0.8 + Math.cos(time * 10 + offset) * 0.3;
                                    }
                                });
                                if (child.userData.fireLight) {
                                    child.userData.fireLight.intensity = 1.5 + Math.sin(time * 12) * 0.5;
                                }
                            }
                            
                            // Lightning Aura - spinning bolts
                            if (child.userData?.isLightningAura) {
                                child.rotation.y = time * 3;
                                child.children.forEach((bolt) => {
                                    if (bolt.userData?.flickerOffset !== undefined) {
                                        const flicker = Math.sin(time * 20 + bolt.userData.flickerOffset);
                                        bolt.visible = flicker > -0.3;
                                        if (bolt.material) bolt.material.opacity = 0.5 + flicker * 0.4;
                                        bolt.position.y = Math.sin(time * 15 + bolt.userData.flickerOffset) * 0.5 * VOXEL_SIZE;
                                    }
                                });
                                if (child.userData.lightningLight) {
                                    child.userData.lightningLight.intensity = 1 + Math.random() * 1;
                                }
                            }
                        });
                    }
                    
                    // AI Wizard Hat Trail - each AI gets their own particle pool (works in all rooms)
                    if (aiAppearance.hat === 'wizardHat' && wizardTrailRef.current && sameRoom) {
                        const poolKey = `ai_${ai.id}`;
                        let trailGroup = wizardTrailRef.current.pools.get(poolKey);
                        
                        // Create pool if it doesn't exist
                        if (!trailGroup) {
                            trailGroup = wizardTrailRef.current.createPool();
                            wizardTrailRef.current.pools.set(poolKey, trailGroup);
                            sceneRef.current.add(trailGroup);
                        }
                        
                        if (aiMoving) {
                            const spawnInterval = 1 / 12; // Slightly lower rate for AI
                            const timeSinceLastSpawn = time - trailGroup.userData.lastSpawnTime;
                            
                            if (timeSinceLastSpawn >= spawnInterval) {
                                let spawned = false;
                                for (let attempts = 0; attempts < trailGroup.children.length && !spawned; attempts++) {
                                    const idx = (trailGroup.userData.nextParticleIndex + attempts) % trailGroup.children.length;
                                    const particle = trailGroup.children[idx];
                                    
                                    if (!particle.userData.active) {
                                        particle.position.set(
                                            ai.pos.x + (Math.random() - 0.5) * 0.4,
                                            2.2 + (Math.random() - 0.5) * 0.2,
                                            ai.pos.z + (Math.random() - 0.5) * 0.4
                                        );
                                        particle.userData.active = true;
                                        particle.userData.birthTime = time;
                                        particle.visible = true;
                                        particle.material.opacity = 0.9;
                                        particle.scale.setScalar(0.8 + Math.random() * 0.4);
                                        
                                        trailGroup.userData.nextParticleIndex = (idx + 1) % trailGroup.children.length;
                                        trailGroup.userData.lastSpawnTime = time;
                                        spawned = true;
                                    }
                                }
                            }
                        }
                        
                        // Update AI's particles
                        trailGroup.children.forEach((particle) => {
                            if (particle.userData.active) {
                                const age = time - particle.userData.birthTime;
                                const lifeProgress = age / particle.userData.lifespan;
                                
                                if (lifeProgress < 1) {
                                    particle.position.y += delta * 0.05;
                                    let opacity;
                                    if (lifeProgress < 0.7) {
                                        opacity = 0.9;
                                    } else {
                                        const fadeProgress = (lifeProgress - 0.7) / 0.3;
                                        opacity = 0.9 * (1 - fadeProgress * fadeProgress);
                                    }
                                    particle.material.opacity = Math.max(0, opacity);
                                    particle.scale.setScalar(particle.scale.x * (1 + delta * 0.05));
                                } else {
                                    particle.userData.active = false;
                                    particle.visible = false;
                                }
                            }
                        });
                    }
                }

                // AI puffle follow/animate
                if (aiPuffleEntry && aiPuffleEntry.puffle && aiPuffleEntry.puffle.mesh) {
                    const aiPuffle = aiPuffleEntry.puffle;
                    
                    if (typeof aiPuffle.tick === 'function') {
                        aiPuffle.tick();
                    }
                    
                    if (typeof aiPuffle.followOwner === 'function') {
                        aiPuffle.followOwner(ai.pos, delta);
                    }
                    
                    if (typeof aiPuffle.animate === 'function') {
                        aiPuffle.animate(time);
                    }
                    
                    // Sync puffle mesh position (in case followOwner didn't run)
                    if (aiPuffle.mesh && aiPuffle.position) {
                        aiPuffle.mesh.position.x = aiPuffle.position.x;
                        aiPuffle.mesh.position.z = aiPuffle.position.z;
                    }
                }
            }); // End AI update loop

            // ==================== OTHER PLAYERS UPDATE (60fps in game loop) ====================
            const otherMeshes = otherPlayerMeshesRef.current;
            const playersData = playersDataRef.current;
            
            for (const [id, meshData] of otherMeshes) {
                const playerData = playersData.get(id);
                if (!playerData || !meshData.mesh) continue;
                
                // Smooth position interpolation (lerp factor based on delta for consistent speed)
                const lerpFactor = Math.min(1, delta * 10); // Smooth catch-up
                
                if (playerData.position) {
                    meshData.mesh.position.x += (playerData.position.x - meshData.mesh.position.x) * lerpFactor;
                    meshData.mesh.position.z += (playerData.position.z - meshData.mesh.position.z) * lerpFactor;
                    // Sync Y position for jumps (with slightly faster lerp for responsiveness)
                    const targetY = playerData.position.y ?? 0;
                    meshData.mesh.position.y += (targetY - meshData.mesh.position.y) * Math.min(1, delta * 15);
                }
                
                if (playerData.rotation !== undefined) {
                    // Smooth rotation interpolation
                    let rotDiff = playerData.rotation - meshData.mesh.rotation.y;
                    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
                    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
                    meshData.mesh.rotation.y += rotDiff * lerpFactor;
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
                    meshData.puffleMesh.position.x += (targetPufflePos.x - meshData.puffleMesh.position.x) * lerpFactor;
                    meshData.puffleMesh.position.z += (targetPufflePos.z - meshData.puffleMesh.position.z) * lerpFactor;
                    meshData.puffleMesh.position.y = 0.5;
                }
                
                // Handle emotes - sync with playerData
                if (playerData.emote !== meshData.currentEmote) {
                    meshData.currentEmote = playerData.emote;
                    meshData.emoteStartTime = playerData.emoteStartTime || Date.now();
                }
                
                // Auto-end emotes after 3.5 seconds (client-side fallback)
                // Sit and Breakdance are continuous emotes - don't auto-clear
                if (meshData.currentEmote && meshData.currentEmote !== 'Sit' && meshData.currentEmote !== 'Breakdance') {
                    const emoteAge = (Date.now() - meshData.emoteStartTime) / 1000;
                    if (emoteAge > 3.5) {
                        meshData.currentEmote = null;
                        playerData.emote = null; // Also clear in data
                    }
                }
                
                // Animate other player mesh (walking/emotes)
                const isMoving = playerData.position && (
                    Math.abs(playerData.position.x - meshData.mesh.position.x) > 0.1 ||
                    Math.abs(playerData.position.z - meshData.mesh.position.z) > 0.1
                );
                // Pass each player's seatedOnFurniture state (synced from server), character type, and mounted state
                const otherPlayerMounted = !!(meshData.mesh.userData?.mount && meshData.mesh.userData?.mountData);
                animateMesh(meshData.mesh, isMoving, meshData.currentEmote, meshData.emoteStartTime, playerData.seatedOnFurniture || false, playerData.appearance?.characterType || 'penguin', otherPlayerMounted);
                
                // OPTIMIZED: Only traverse if this player has animated cosmetics
                // Cache this check to avoid checking every frame
                if (meshData.hasAnimatedCosmetics === undefined) {
                    const appearance = playerData.appearance || {};
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
                                                     appearance.bodyItem === 'lightningAura';
                }
                
                if (meshData.hasAnimatedCosmetics) {
                    meshData.mesh.traverse(child => {
                        if (child.name === 'propeller_blades') {
                            child.rotation.y += delta * 15; // Fast spin
                        }
                        
                        // Animate smoke particles (cigarette, pipe, cigar)
                        if (child.userData?.isSmokeEmitter) {
                            child.children.forEach((particle, i) => {
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
                        
                        // Animate laser eyes - pulsing intensity
                        if (child.userData?.isLaserEyes) {
                            const intensity = 1 + Math.sin(time * 10) * 0.5;
                            child.children.forEach(light => {
                                if (light.isPointLight) {
                                    light.intensity = intensity;
                                }
                            });
                        }
                        
                        // Fire eyes animation
                        if (child.userData?.isFireEyes) {
                            child.children.forEach(eyeGroup => {
                                if (eyeGroup.children) {
                                    eyeGroup.children.forEach((particle, i) => {
                                        if (particle.isMesh) {
                                            particle.position.y = (particle.userData.baseY || 0) + Math.sin(time * 15 + i) * 0.1 * VOXEL_SIZE;
                                            particle.position.x = Math.sin(time * 12 + i * 2) * 0.05 * VOXEL_SIZE;
                                            if (particle.material) {
                                                particle.material.opacity = 0.7 + Math.sin(time * 20 + i) * 0.3;
                                            }
                                        }
                                        if (particle.isPointLight) {
                                            particle.intensity = 0.5 + Math.sin(time * 15) * 0.3;
                                        }
                                    });
                                }
                            });
                        }
                        
                        // Flaming Crown fire particles
                        if (child.userData?.isFireEmitter) {
                            child.children.forEach((particle, i) => {
                                particle.position.y += delta * 3;
                                particle.position.x = (particle.userData.baseX || 0) + Math.sin(time * 8 + i) * 0.15;
                                particle.position.z = (particle.userData.baseZ || 0) + Math.cos(time * 6 + i) * 0.15;
                                
                                const height = particle.position.y - (particle.userData.baseY || 0);
                                if (particle.material) {
                                    particle.material.opacity = Math.max(0, 0.9 - height * 0.15);
                                }
                                const scale = Math.max(0.3, 1 - height * 0.1);
                                particle.scale.setScalar(scale);
                                
                                if (height > 5) {
                                    particle.position.y = particle.userData.baseY || 0;
                                    particle.scale.setScalar(1);
                                    if (particle.material) particle.material.opacity = 0.9;
                                }
                            });
                        }
                        
                        // Fire Breath particles
                        if (child.userData?.isBreathFire) {
                            child.children.forEach((particle, i) => {
                                particle.position.z += delta * 15;
                                particle.position.y += (Math.random() - 0.5) * delta * 2;
                                particle.position.x += (Math.random() - 0.5) * delta * 2;
                                
                                const dist = particle.position.z - (particle.userData.baseZ || 0);
                                if (particle.material) {
                                    particle.material.opacity = Math.max(0, 0.9 - dist * 0.1);
                                }
                                
                                if (dist > 8) {
                                    particle.position.z = particle.userData.baseZ || 0;
                                    particle.position.y = 0;
                                    particle.position.x = 0;
                                    if (particle.material) particle.material.opacity = 0.9;
                                }
                            });
                        }
                        
                        // Ice Breath particles
                        if (child.userData?.isBreathIce) {
                            child.children.forEach((particle, i) => {
                                particle.position.z += delta * 12;
                                particle.position.y += Math.sin(time * 10 + i) * delta;
                                particle.position.x += Math.cos(time * 8 + i) * delta;
                                
                                const dist = particle.position.z - (particle.userData.baseZ || 0);
                                if (particle.material) {
                                    particle.material.opacity = Math.max(0, 0.8 - dist * 0.08);
                                }
                                
                                if (dist > 10) {
                                    particle.position.z = particle.userData.baseZ || 0;
                                    particle.position.y = 0;
                                    particle.position.x = 0;
                                    if (particle.material) particle.material.opacity = 0.8;
                                }
                            });
                        }
                        
                        // Bubblegum grow/pop animation
                        if (child.userData?.isBubblegum) {
                            const bubble = child.children[0];
                            if (bubble) {
                                const cycleTime = (time % 4) / 4;
                                let scale;
                                if (cycleTime < 0.8) {
                                    scale = 0.5 + cycleTime * 2;
                                } else if (cycleTime < 0.85) {
                                    scale = 2.1 - (cycleTime - 0.8) * 30;
                                } else {
                                    scale = 0.5;
                                }
                                bubble.scale.setScalar(Math.max(0.3, scale));
                            }
                        }
                        
                        // Animate angel/demon wings - butterfly flapping
                        if (child.userData?.isWings) {
                            const phase = child.userData.wingPhase || 0;
                            const flapSpeed = 6;
                            const flapAngle = Math.sin(time * flapSpeed + phase) * 0.3;
                            child.rotation.y = flapAngle;
                        }
                        
                        // Fire Aura - spinning flames
                        if (child.userData?.isFireAura) {
                            child.rotation.y = time * 2;
                            child.children.forEach((flame) => {
                                if (flame.userData?.isFlame) {
                                    const offset = flame.userData.offset || 0;
                                    flame.position.y = flame.userData.baseY + Math.sin(time * 8 + offset) * 0.3 * VOXEL_SIZE;
                                    flame.scale.x = 0.8 + Math.sin(time * 10 + offset) * 0.3;
                                    flame.scale.z = 0.8 + Math.cos(time * 10 + offset) * 0.3;
                                }
                            });
                            if (child.userData.fireLight) {
                                child.userData.fireLight.intensity = 1.5 + Math.sin(time * 12) * 0.5;
                            }
                        }
                        
                        // Lightning Aura - spinning bolts
                        if (child.userData?.isLightningAura) {
                            child.rotation.y = time * 3;
                            child.children.forEach((bolt) => {
                                if (bolt.userData?.flickerOffset !== undefined) {
                                    const flicker = Math.sin(time * 20 + bolt.userData.flickerOffset);
                                    bolt.visible = flicker > -0.3;
                                    if (bolt.material) bolt.material.opacity = 0.5 + flicker * 0.4;
                                    bolt.position.y = Math.sin(time * 15 + bolt.userData.flickerOffset) * 0.5 * VOXEL_SIZE;
                                }
                            });
                            if (child.userData.lightningLight) {
                                child.userData.lightningLight.intensity = 1 + Math.random() * 1;
                            }
                        }
                    });
                }

                // --- MOUNT ANIMATION FOR OTHER PLAYERS ---
                if (meshData.mesh.userData?.mount && meshData.mesh.userData?.mountData?.animated) {
                    const mountGroup = meshData.mesh.getObjectByName('mount');
                    if (mountGroup) {
                        const leftOarPivot = mountGroup.getObjectByName('left_oar_pivot');
                        const rightOarPivot = mountGroup.getObjectByName('right_oar_pivot');
                        
                        if (leftOarPivot && rightOarPivot) {
                            if (isMoving) {
                                // Rowing animation when other player is moving
                                const rowSpeed = 8;
                                const rowAngle = Math.sin(time * rowSpeed) * 0.5;
                                
                                // Y rotation for forward/backward rowing motion
                                leftOarPivot.rotation.y = rowAngle;
                                rightOarPivot.rotation.y = -rowAngle;
                                // Z rotation for dip into water
                                leftOarPivot.rotation.z = Math.sin(time * rowSpeed + Math.PI/2) * 0.15;
                                rightOarPivot.rotation.z = -Math.sin(time * rowSpeed + Math.PI/2) * 0.15;
                            } else {
                                // Rest position
                                leftOarPivot.rotation.y *= 0.9;
                                rightOarPivot.rotation.y *= 0.9;
                                leftOarPivot.rotation.z *= 0.9;
                                rightOarPivot.rotation.z *= 0.9;
                            }
                        }
                    }
                }
                
                // --- WIZARD HAT TRAIL FOR OTHER PLAYERS ---
                const otherAppearance = playerData.appearance || {};
                if (otherAppearance.hat === 'wizardHat' && wizardTrailRef.current) {
                    const poolKey = `player_${id}`;
                    let trailGroup = wizardTrailRef.current.pools.get(poolKey);
                    
                    // Create pool if it doesn't exist
                    if (!trailGroup) {
                        trailGroup = wizardTrailRef.current.createPool();
                        wizardTrailRef.current.pools.set(poolKey, trailGroup);
                        sceneRef.current.add(trailGroup);
                    }
                    
                    if (isMoving) {
                        const spawnInterval = 1 / 12;
                        const timeSinceLastSpawn = time - trailGroup.userData.lastSpawnTime;
                        
                        if (timeSinceLastSpawn >= spawnInterval) {
                            let spawned = false;
                            for (let attempts = 0; attempts < trailGroup.children.length && !spawned; attempts++) {
                                const idx = (trailGroup.userData.nextParticleIndex + attempts) % trailGroup.children.length;
                                const particle = trailGroup.children[idx];
                                
                                if (!particle.userData.active) {
                                    particle.position.set(
                                        meshData.mesh.position.x + (Math.random() - 0.5) * 0.4,
                                        meshData.mesh.position.y + 2.2 + (Math.random() - 0.5) * 0.2,
                                        meshData.mesh.position.z + (Math.random() - 0.5) * 0.4
                                    );
                                    particle.userData.active = true;
                                    particle.userData.birthTime = time;
                                    particle.visible = true;
                                    particle.material.opacity = 0.9;
                                    particle.scale.setScalar(0.8 + Math.random() * 0.4);
                                    
                                    trailGroup.userData.nextParticleIndex = (idx + 1) % trailGroup.children.length;
                                    trailGroup.userData.lastSpawnTime = time;
                                    spawned = true;
                                }
                            }
                        }
                    }
                    
                    // Update particles
                    trailGroup.children.forEach((particle) => {
                        if (particle.userData.active) {
                            const age = time - particle.userData.birthTime;
                            const lifeProgress = age / particle.userData.lifespan;
                            
                            if (lifeProgress < 1) {
                                particle.position.y += delta * 0.05;
                                let opacity;
                                if (lifeProgress < 0.7) {
                                    opacity = 0.9;
                                } else {
                                    const fadeProgress = (lifeProgress - 0.7) / 0.3;
                                    opacity = 0.9 * (1 - fadeProgress * fadeProgress);
                                }
                                particle.material.opacity = Math.max(0, opacity);
                                particle.scale.setScalar(particle.scale.x * (1 + delta * 0.05));
                            } else {
                                particle.userData.active = false;
                                particle.visible = false;
                            }
                        }
                    });
                }
                
                // Handle chat bubbles
                if (playerData.chatMessage && playerData.chatTime) {
                    const chatAge = Date.now() - playerData.chatTime;
                    
                    // Create bubble if new message
                    if (!meshData.bubble || meshData.lastChatTime !== playerData.chatTime) {
                        // Remove old bubble
                        if (meshData.bubble) {
                            meshData.mesh.remove(meshData.bubble);
                        }
                        // Create new bubble - adjust height for character type
                        const bubbleHeight = playerData.appearance?.characterType === 'marcus' ? BUBBLE_HEIGHT_MARCUS : BUBBLE_HEIGHT_PENGUIN;
                        meshData.bubble = createChatSprite(playerData.chatMessage, bubbleHeight);
                        if (meshData.bubble) {
                            meshData.mesh.add(meshData.bubble);
                        }
                        meshData.lastChatTime = playerData.chatTime;
                    }
                    
                    // Remove bubble after 5 seconds - BUT NOT if it's an AFK bubble
                    if (chatAge > 5000 && meshData.bubble && !playerData.isAfkBubble) {
                        meshData.mesh.remove(meshData.bubble);
                        meshData.bubble = null;
                        playerData.chatMessage = null;
                    }
                } else if (!playerData.chatMessage && meshData.bubble) {
                    // Message cleared (e.g., AFK ended) - remove bubble
                    meshData.mesh.remove(meshData.bubble);
                    meshData.bubble = null;
                }
            }

            // Animate butterflies (only in town)
            if (butterflyGroup) {
                butterflyGroup.children.forEach(b => {
                     const speed = b.userData.speed * 0.5; 
                     b.position.y = 2 + Math.sin(time * speed * 20 + b.userData.yOffset) * 1;
                     const wings = b.children;
                     wings[0].rotation.z = Math.sin(time * 15) * 0.5;
                     wings[1].rotation.z = -Math.sin(time * 15) * 0.5;
                     b.position.x = b.userData.center.x + Math.cos(time * speed * 5) * 3;
                     b.position.z = b.userData.center.z + Math.sin(time * speed * 5) * 3;
                     b.lookAt(b.userData.center.x, b.position.y, b.userData.center.z);
                });
            }
            
            // Animate campfire (flames, embers, light flicker) and Christmas tree
            if (townCenterRef.current && roomRef.current === 'town') {
                // Calculate nightFactor for Christmas tree lighting (0=day, 1=night)
                const worldTime = serverWorldTimeRef?.current ?? 0.35;
                let nightFactor;
                if (worldTime < 0.2) {
                    // Night (early)
                    nightFactor = 1.0;
                } else if (worldTime < 0.3) {
                    // Sunrise transition
                    nightFactor = 1.0 - (worldTime - 0.2) / 0.1;
                } else if (worldTime < 0.7) {
                    // Day
                    nightFactor = 0.0;
                } else if (worldTime < 0.8) {
                    // Sunset transition
                    nightFactor = (worldTime - 0.7) / 0.1;
                } else {
                    // Night (late)
                    nightFactor = 1.0;
                }
                townCenterRef.current.update(time, delta, nightFactor);
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
            
            // Dojo-specific animations
            if (roomRef.current === 'dojo') {
                // Pulse sensei glow
                const senseiGlow = scene.getObjectByName('sensei_glow');
                if (senseiGlow && senseiGlow.material) {
                    senseiGlow.material.opacity = 0.1 + Math.sin(time * 1.5) * 0.1;
                }
                // Pulse exit glow
                const exitGlow = scene.getObjectByName('exit_glow');
                if (exitGlow && exitGlow.material) {
                    exitGlow.material.opacity = 0.1 + Math.sin(time * 2) * 0.08;
                }
            }

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
                // Use server-synchronized time (or local time for debug override)
                const serverTime = serverWorldTimeRef?.current ?? 0.35;
                const t = daySpeedRef.current === 0 ? dayTimeRef.current : serverTime;
                
                // Calculate sun position (arc across sky)
                const sunAngle = t * Math.PI * 2 - Math.PI / 2;
                const sunHeight = Math.sin(sunAngle);
                const sunX = Math.cos(sunAngle) * 100;
                const sunY = Math.max(5, sunHeight * 100 + 50);
                
                sunLightRef.current.position.set(sunX, sunY, 60);
                
                // Day/night colors - OPTIMIZED: Reuse color objects, avoid creating new ones
                let sunIntensity, ambientIntensity;
                const sunColor = sunLightRef.current.color;
                const ambientColor = ambientLightRef.current.color;
                
                if (t < 0.2) {
                    // Night - bright enough to see clearly
                    const nightT = t / 0.2;
                    sunIntensity = 0.25 + nightT * 0.1;  // Min 0.25
                    ambientIntensity = 0.55 + nightT * 0.1;  // Min 0.55
                    sunColor.setHex(0x6688cc);  // Brighter moonlight blue
                    ambientColor.setHex(0x4a5a7a);  // Brighter ambient
                    scene.background.lerpColors(scene.background.setHex(0x1a3045), ambientColor, nightT * 0.5);
                } else if (t < 0.3) {
                    // Sunrise
                    const sunriseT = (t - 0.2) / 0.1;
                    sunIntensity = 0.15 + sunriseT * 0.45;
                    ambientIntensity = 0.35 + sunriseT * 0.15;
                    sunColor.setRGB(0.27 + sunriseT * 0.73, 0.4 + sunriseT * 0.27, 0.67 - sunriseT * 0.27);
                    ambientColor.setRGB(0.16 + sunriseT * 0.34, 0.23 + sunriseT * 0.33, 0.35 + sunriseT * 0.28);
                    scene.background.setRGB(0.1 + sunriseT * 0.9, 0.19 + sunriseT * 0.61, 0.31 + sunriseT * 0.22);
                } else if (t < 0.7) {
                    // Day
                    const dayT = (t - 0.3) / 0.4;
                    const middayT = 1 - Math.abs(dayT - 0.5) * 2;
                    sunIntensity = 0.6 + middayT * 0.3;
                    ambientIntensity = 0.4 + middayT * 0.1;
                    sunColor.setHex(0xF8F8FF);
                    ambientColor.setHex(0xC0E0F0);
                    scene.background.setHex(0x87CEEB);
                } else if (t < 0.8) {
                    // Sunset
                    const sunsetT = (t - 0.7) / 0.1;
                    sunIntensity = 0.6 - sunsetT * 0.4;
                    ambientIntensity = 0.45 - sunsetT * 0.1;
                    sunColor.setRGB(0.97 - sunsetT * 0.03, 0.97 - sunsetT * 0.57, 1 - sunsetT * 0.73);
                    ambientColor.setRGB(0.75 - sunsetT * 0.46, 0.88 - sunsetT * 0.63, 0.94 - sunsetT * 0.56);
                    scene.background.setRGB(0.53 + sunsetT * 0.47, 0.81 - sunsetT * 0.34, 0.92 - sunsetT * 0.59);
                } else {
                    // Night - bright enough to see clearly
                    const nightT = (t - 0.8) / 0.2;
                    sunIntensity = 0.35 - nightT * 0.1;  // Goes to 0.25
                    ambientIntensity = 0.65 - nightT * 0.1;  // Goes to 0.55
                    sunColor.setRGB(1 - nightT * 0.6, 0.4 + nightT * 0.13, 0.27 + nightT * 0.53);
                    ambientColor.setRGB(0.35 - nightT * 0.06, 0.35 - nightT * 0, 0.48 - nightT * 0);
                    scene.background.setRGB(1 - nightT * 0.90, 0.47 - nightT * 0.28, 0.33 - nightT * 0.06);
                }
                
                sunLightRef.current.intensity = sunIntensity;
                ambientLightRef.current.intensity = ambientIntensity;
                
                // Update fog color to match sky
                if (scene.fog) scene.fog.color.copy(scene.background);
                
                // ==================== PROP LIGHTS DAY/NIGHT TOGGLE ====================
                // Lights ON at night (t < 0.25 or t >= 0.75), OFF during day
                const shouldLightsBeOn = t < 0.25 || t >= 0.75;
                
                if (shouldLightsBeOn !== lightsOnRef.current && propLightsRef.current.length > 0) {
                    lightsOnRef.current = shouldLightsBeOn;
                    
                    propLightsRef.current.forEach(light => {
                        if (light && light.isLight) {
                            // Store original intensity on first toggle if not stored
                            if (light.userData.originalIntensity === undefined) {
                                light.userData.originalIntensity = light.intensity;
                            }
                            
                            // Toggle light
                            light.intensity = shouldLightsBeOn ? light.userData.originalIntensity : 0;
                        }
                    });
                }
                
                // Update state for UI (throttled)
                if (frameCount % 30 === 0) {
                    setDayTime(daySpeedRef.current === 0 ? dayTimeRef.current : serverTime);
                }
            }
            
            // ==================== SNOWFALL UPDATE ====================
            // Update snow every frame to prevent flickering
            if (room === 'town' && snowParticlesRef.current && gameSettingsRef.current.snowEnabled !== false) {
                const snow = snowParticlesRef.current;
                const positions = snow.particles.geometry.attributes.position.array;
                const velocities = snow.velocities;
                const particleCount = positions.length / 3;
                
                // Smoothly change intensity over time (random fluctuations)
                if (frameCount % 300 === 0) {
                    snowTargetIntensityRef.current = 0.2 + Math.random() * 0.5;
                }
                snowIntensityRef.current += (snowTargetIntensityRef.current - snowIntensityRef.current) * delta;
                
                const intensity = snowIntensityRef.current;
                // OPTIMIZED: Pre-calculate wind and delta multiplier once
                const windX = Math.sin(time * 0.3) * intensity * 2;
                const windZ = Math.cos(time * 0.2) * intensity;
                const deltaIntensity = delta * intensity * 3;
                
                // Get player position in world space
                const playerX = posRef.current.x;
                const playerZ = posRef.current.z;
                // OPTIMIZED: Pre-calculate spread bounds
                const spreadX06 = snow.spreadX * 0.6;
                const spreadZ06 = snow.spreadZ * 0.6;
                const halfSpreadX = snow.spreadX * 0.5;
                const halfSpreadZ = snow.spreadZ * 0.5;
                
                // OPTIMIZED: Update particle positions with direct index access
                for (let i = 0; i < particleCount; i++) {
                    const idx = i * 3;
                    const idx1 = idx + 1;
                    const idx2 = idx + 2;
                    
                    // Apply velocity with wind
                    positions[idx] += (velocities[idx] + windX) * deltaIntensity;
                    positions[idx1] += velocities[idx1] * deltaIntensity;
                    positions[idx2] += (velocities[idx2] + windZ) * deltaIntensity;
                    
                    // Reset particles that fall below ground or drift too far from player
                    const distX = positions[idx] - playerX;
                    const distZ = positions[idx2] - playerZ;
                    
                    if (positions[idx1] < -2 || Math.abs(distX) > spreadX06 || Math.abs(distZ) > spreadZ06) {
                        // Reset to new position around player (in world space)
                        positions[idx] = playerX + (Math.random() - 0.5) * snow.spreadX;
                        positions[idx1] = snow.height + Math.random() * 10;
                        positions[idx2] = playerZ + (Math.random() - 0.5) * snow.spreadZ;
                    }
                }
                
                snow.particles.geometry.attributes.position.needsUpdate = true;
                
                // OPTIMIZED: Only update opacity every 10 frames
                if (frameCount % 10 === 0) {
                    const serverTime = serverWorldTimeRef?.current ?? 0.35;
                    const isNight = serverTime < 0.25 || serverTime > 0.75;
                    const nightBoost = isNight ? 0.15 : 0;
                    snow.particles.material.opacity = 0.6 + intensity * 0.3 + nightBoost;
                }
                snow.particles.visible = true;
            } else if (snowParticlesRef.current) {
                snowParticlesRef.current.particles.visible = false;
            }
            
            renderer.render(scene, camera);
        };
        update();
        
        return () => {
            cancelAnimationFrame(reqRef.current);
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
            if(rendererRef.current && mountRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
            // Cleanup TownCenter
            if (townCenterRef.current) {
                townCenterRef.current.dispose();
                townCenterRef.current = null;
            }
            // Cleanup match banners
            for (const [, bannerData] of matchBannersRef.current) {
                bannerData.sprite.material.map?.dispose();
                bannerData.sprite.material.dispose();
            }
            matchBannersRef.current.clear();
        };
    }, [penguinData, room]); // Rebuild scene when room changes
    
    const triggerEmote = (type) => {
        emoteRef.current = { type, startTime: Date.now() };
        setShowEmoteWheel(false);
        // Send emote to other players (emote wheel = ground emotes, not furniture)
        mpSendEmote(type, false);
    };
    
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
    
    // ==================== 3D MATCH BANNERS (SPECTATOR VIEW) ====================
    // Create floating banners above players in active matches
    useEffect(() => {
        if (!sceneRef.current || !window.THREE) return;
        
        const THREE = window.THREE;
        const scene = sceneRef.current;
        const banners = matchBannersRef.current;
        const playersData = playersDataRef.current;
        
        // Helper: Create canvas texture for match banner
        const createBannerCanvas = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 200;
            return canvas;
        };
        
        // Helper: Draw purple bubble background
        const drawBubbleBackground = (ctx, canvas) => {
            // Background - purple gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, 'rgba(88, 28, 135, 0.95)');
            gradient.addColorStop(1, 'rgba(67, 56, 202, 0.95)');
            
            // Rounded rect background with speech bubble pointer
            const radius = 20;
            ctx.beginPath();
            ctx.moveTo(radius, 0);
            ctx.lineTo(canvas.width - radius, 0);
            ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
            ctx.lineTo(canvas.width, canvas.height - radius - 20);
            ctx.quadraticCurveTo(canvas.width, canvas.height - 20, canvas.width - radius, canvas.height - 20);
            ctx.lineTo(canvas.width / 2 + 15, canvas.height - 20);
            ctx.lineTo(canvas.width / 2, canvas.height); // Triangle point
            ctx.lineTo(canvas.width / 2 - 15, canvas.height - 20);
            ctx.lineTo(radius, canvas.height - 20);
            ctx.quadraticCurveTo(0, canvas.height - 20, 0, canvas.height - radius - 20);
            ctx.lineTo(0, radius);
            ctx.quadraticCurveTo(0, 0, radius, 0);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Border
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
            ctx.lineWidth = 3;
            ctx.stroke();
        };
        
        // Helper: Render Card Jitsu match
        const renderCardJitsuBanner = (ctx, canvas, players, state, wager) => {
            // Header
            ctx.fillStyle = '#FBBF24';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`⚔️ CARD JITSU • 💰 ${wager}`, canvas.width / 2, 35);
            
            // Player names
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 26px Arial';
            const p1Name = (players[0]?.name || 'Player 1').substring(0, 10);
            const p2Name = (players[1]?.name || 'Player 2').substring(0, 10);
            ctx.textAlign = 'left';
            ctx.fillText(p1Name, 30, 80);
            ctx.textAlign = 'right';
            ctx.fillText(p2Name, canvas.width - 30, 80);
            
            // VS
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('VS', canvas.width / 2, 80);
            
            // Win indicators
            const p1Wins = state.player1Wins || { fire: 0, water: 0, snow: 0 };
            const p2Wins = state.player2Wins || { fire: 0, water: 0, snow: 0 };
            
            const renderWins = (wins, x, align) => {
                let icons = '';
                if (wins.fire > 0) icons += '🔥'.repeat(Math.min(wins.fire, 3));
                if (wins.water > 0) icons += '💧'.repeat(Math.min(wins.water, 3));
                if (wins.snow > 0) icons += '❄️'.repeat(Math.min(wins.snow, 3));
                ctx.font = '24px Arial';
                ctx.textAlign = align;
                ctx.fillText(icons || '—', x, 115);
            };
            
            renderWins(p1Wins, 30, 'left');
            renderWins(p2Wins, canvas.width - 30, 'right');
            
            // Round & Phase
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            let statusText = `Round ${state.round || 1}`;
            if (state.phase === 'select') statusText += ' • Selecting...';
            else if (state.phase === 'reveal') statusText += ' • Revealing!';
            else if (state.status === 'complete') statusText += ' • Complete!';
            ctx.fillText(statusText, canvas.width / 2, 155);
        };
        
        // Helper: Render Tic Tac Toe match
        const renderTicTacToeBanner = (ctx, canvas, players, state, wager) => {
            // Header
            ctx.fillStyle = '#FBBF24';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`⭕ TIC TAC TOE • 💰 ${wager}`, canvas.width / 2, 35);
            
            // Player names
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px Arial';
            const p1Name = (players[0]?.name || 'Player 1').substring(0, 8);
            const p2Name = (players[1]?.name || 'Player 2').substring(0, 8);
            ctx.textAlign = 'left';
            ctx.fillText(p1Name, 20, 65);
            ctx.fillStyle = '#22D3EE'; // Cyan for X
            ctx.fillText('(X)', 20, 85);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'right';
            ctx.fillText(p2Name, canvas.width - 20, 65);
            ctx.fillStyle = '#F472B6'; // Pink for O
            ctx.fillText('(O)', canvas.width - 20, 85);
            
            // Draw mini board in center
            const board = state.board || Array(9).fill(null);
            const winningLine = state.winningLine || [];
            const cellSize = 28;
            const boardX = (canvas.width - cellSize * 3) / 2;
            const boardY = 55;
            
            for (let i = 0; i < 9; i++) {
                const row = Math.floor(i / 3);
                const col = i % 3;
                const x = boardX + col * cellSize;
                const y = boardY + row * cellSize;
                
                // Cell background
                const isWinning = winningLine.includes(i);
                ctx.fillStyle = isWinning ? 'rgba(34, 197, 94, 0.5)' : 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
                
                // Cell border
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, cellSize, cellSize);
                
                // X or O
                if (board[i]) {
                    ctx.fillStyle = board[i] === 'X' ? '#22D3EE' : '#F472B6';
                    ctx.font = 'bold 20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(board[i], x + cellSize / 2, y + cellSize / 2 + 7);
                }
            }
            
            // Status
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            let statusText = '';
            if (state.winner === 'draw') {
                statusText = '🤝 Draw!';
            } else if (state.winner) {
                const winnerName = state.winner === 'X' ? players[0]?.name : players[1]?.name;
                statusText = `🏆 ${winnerName} wins!`;
            } else {
                const turnName = state.currentTurn === 'player1' ? players[0]?.name : players[1]?.name;
                statusText = `${turnName}'s turn`;
            }
            ctx.fillText(statusText, canvas.width / 2, 155);
        };
        
        // Helper: Render Connect 4 match
        const renderConnect4Banner = (ctx, canvas, players, state, wager) => {
            // Header
            ctx.fillStyle = '#FBBF24';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`🔴 CONNECT 4 • 💰 ${wager}`, canvas.width / 2, 35);
            
            // Player names
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 18px Arial';
            const p1Name = (players[0]?.name || 'Player 1').substring(0, 6);
            const p2Name = (players[1]?.name || 'Player 2').substring(0, 6);
            ctx.textAlign = 'left';
            ctx.fillText(p1Name, 15, 60);
            // Red disc for P1
            ctx.fillStyle = '#EF4444';
            ctx.beginPath();
            ctx.arc(25, 75, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'right';
            ctx.fillText(p2Name, canvas.width - 15, 60);
            // Yellow disc for P2
            ctx.fillStyle = '#FACC15';
            ctx.beginPath();
            ctx.arc(canvas.width - 25, 75, 8, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw mini board in center (7 cols x 6 rows)
            const board = state.board || Array(42).fill(null);
            const winningCells = state.winningCells || [];
            const cellSize = 12;
            const cols = 7;
            const rows = 6;
            const boardX = (canvas.width - cellSize * cols) / 2;
            const boardY = 50;
            
            // Board background
            ctx.fillStyle = 'rgba(30, 64, 175, 0.8)';
            ctx.fillRect(boardX - 2, boardY - 2, cellSize * cols + 4, cellSize * rows + 4);
            
            for (let row = 0; row < rows; row++) {
                for (let col = 0; col < cols; col++) {
                    // Board is stored bottom-to-top, display top-to-bottom
                    const displayRow = rows - 1 - row;
                    const index = displayRow * cols + col;
                    const x = boardX + col * cellSize + cellSize / 2;
                    const y = boardY + row * cellSize + cellSize / 2;
                    
                    const isWinning = winningCells.some(([r, c]) => r === displayRow && c === col);
                    
                    // Cell (disc)
                    ctx.beginPath();
                    ctx.arc(x, y, cellSize / 2 - 1, 0, Math.PI * 2);
                    
                    if (board[index] === 'R') {
                        ctx.fillStyle = isWinning ? '#FCA5A5' : '#EF4444';
                    } else if (board[index] === 'Y') {
                        ctx.fillStyle = isWinning ? '#FDE68A' : '#FACC15';
                    } else {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                    }
                    ctx.fill();
                    
                    if (isWinning) {
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    }
                }
            }
            
            // Status
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            let statusText = '';
            if (state.winner === 'draw') {
                statusText = '🤝 Draw!';
            } else if (state.winner) {
                const winnerName = state.winner === 'R' ? players[0]?.name : players[1]?.name;
                statusText = `🏆 ${winnerName} wins!`;
            } else {
                const turnName = state.currentTurn === 'player1' ? players[0]?.name : players[1]?.name;
                statusText = `${turnName}'s turn`;
            }
            ctx.fillText(statusText, canvas.width / 2, 155);
        };
        
        // Helper: Render match info to canvas (routes to game-specific renderer)
        const renderBannerToCanvas = (ctx, matchData) => {
            const canvas = ctx.canvas;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw common purple bubble background
            drawBubbleBackground(ctx, canvas);
            
            const players = matchData.players || [];
            const state = matchData.state || {};
            const wager = (matchData.wagerAmount || 0) * 2;
            const gameType = matchData.gameType || 'card_jitsu';
            
            // Route to game-specific renderer
            switch (gameType) {
                case 'tic_tac_toe':
                    renderTicTacToeBanner(ctx, canvas, players, state, wager);
                    break;
                case 'connect4':
                    renderConnect4Banner(ctx, canvas, players, state, wager);
                    break;
                case 'card_jitsu':
                default:
                    renderCardJitsuBanner(ctx, canvas, players, state, wager);
                    break;
            }
        };
        
        // Get current match IDs
        const currentMatchIds = new Set(activeMatches.map(m => m.matchId));
        
        // Remove banners for ended matches
        for (const [matchId, bannerData] of banners) {
            if (!currentMatchIds.has(matchId)) {
                scene.remove(bannerData.sprite);
                bannerData.sprite.material.map?.dispose();
                bannerData.sprite.material.dispose();
                banners.delete(matchId);
            }
        }
        
        // Create or update banners for active matches
        for (const match of activeMatches) {
            const matchId = match.matchId;
            const spectateData = spectatingMatch?.[matchId];
            const matchData = {
                ...match,
                state: spectateData?.state || match.state || {},
                wagerAmount: spectateData?.wagerAmount || match.wagerAmount,
                gameType: spectateData?.gameType || match.gameType || 'card_jitsu'
            };
            
            // Find player positions
            const p1Data = playersData.get(match.players?.[0]?.id);
            const p2Data = playersData.get(match.players?.[1]?.id);
            
            if (!p1Data?.position && !p2Data?.position) continue;
            
            // Calculate midpoint between players
            const p1Pos = p1Data?.position || p2Data?.position;
            const p2Pos = p2Data?.position || p1Data?.position;
            const midX = (p1Pos.x + p2Pos.x) / 2;
            const midZ = (p1Pos.z + p2Pos.z) / 2;
            
            let bannerData = banners.get(matchId);
            
            if (!bannerData) {
                // Create new banner
                const canvas = createBannerCanvas();
                const ctx = canvas.getContext('2d');
                const texture = new THREE.CanvasTexture(canvas);
                texture.needsUpdate = true;
                
                const material = new THREE.SpriteMaterial({ 
                    map: texture, 
                    transparent: true,
                    depthTest: false
                });
                const sprite = new THREE.Sprite(material);
                sprite.scale.set(8, 3.2, 1); // Banner size in world units
                sprite.renderOrder = 999; // Render on top
                
                scene.add(sprite);
                bannerData = { sprite, canvas, ctx, texture };
                banners.set(matchId, bannerData);
            }
            
            // Update banner content
            renderBannerToCanvas(bannerData.ctx, matchData);
            bannerData.texture.needsUpdate = true;
            
            // Position above players
            bannerData.sprite.position.set(midX, 8, midZ); // 8 units above ground
        }
        
    }, [activeMatches, spectatingMatch]);
    
    // ==================== PLAYER CLICK DETECTION ====================
    // Handle clicking/tapping on other players to open profile menu (works on both desktop and mobile)
    useEffect(() => {
        if (!rendererRef.current || !cameraRef.current || !raycasterRef.current || !onPlayerClick) return;
        
        const renderer = rendererRef.current;
        const camera = cameraRef.current;
        const raycaster = raycasterRef.current;
        
        // Unified handler for both mouse clicks and touch taps
        const handleInteraction = (clientX, clientY, eventTarget) => {
            // Don't process clicks that originated from UI elements
            if (eventTarget !== renderer.domElement) {
                return;
            }
            
            // Don't process if any UI overlay is open (check by z-index elements)
            const elementsAtPoint = document.elementsFromPoint(clientX, clientY);
            const hasUIOverlay = elementsAtPoint.some(el => {
                const zIndex = window.getComputedStyle(el).zIndex;
                return zIndex && parseInt(zIndex) >= 40 && el !== renderer.domElement.parentElement;
            });
            
            if (hasUIOverlay) {
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
            handleInteraction(event.clientX, event.clientY, event.target);
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
            const touchMoved = Math.abs(touch.clientX - touchStartPos.x) > 15 ||
                              Math.abs(touch.clientY - touchStartPos.y) > 15;
            
            // Only treat as tap if touch was short (< 300ms) and didn't move much
            if (touchDuration < 300 && !touchMoved) {
                // Get the element under the touch point
                const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
                handleInteraction(touch.clientX, touch.clientY, targetElement);
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
        const sprite = createChatSprite(activeBubble, bubbleHeight);
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
        const centerX = (CITY_SIZE / 2) * BUILDING_SCALE;
        const centerZ = (CITY_SIZE / 2) * BUILDING_SCALE;
        
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
            if (e.code === 'KeyE' && nearbyPortal && !showEmoteWheel) {
                if (nearbyPortal.targetRoom || nearbyPortal.minigame) {
                    handlePortalEnter();
                }
            }
        };
        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [nearbyPortal, showEmoteWheel]);
    
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
                const townCenterX = (CITY_SIZE / 2) * BUILDING_SCALE; // 80
                const townCenterZ = (CITY_SIZE / 2) * BUILDING_SCALE; // 80
                
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
                        updateIglooOccupancySprite(sprite, count);
                    }
                });
            }
        };
        
        window.addEventListener('roomCounts', handleRoomCounts);
        return () => window.removeEventListener('roomCounts', handleRoomCounts);
    }, []);
    
    // Helper to update igloo sprite texture
    const updateIglooOccupancySprite = (sprite, count) => {
        const THREE = window.THREE;
        if (!THREE) return;
        
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
    
    // Helper to create chat bubble sprite
    const createOtherPlayerChatSprite = useCallback((message) => {
        const THREE = window.THREE;
        if (!THREE) return null;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 32;
        const padding = 15;
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textWidth = Math.min(ctx.measureText(message).width, 300);
        
        canvas.width = textWidth + padding * 2;
        canvas.height = fontSize + padding * 2;
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 3;
        
        const r = 12;
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, r);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message.substring(0, 50), canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(canvas.width * 0.015, canvas.height * 0.015, 1);
        sprite.position.set(0, 4.5, 0);
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
            
            meshes.set(id, { 
                mesh, 
                bubble: null, 
                puffleMesh, 
                nameSprite,
                // Initialize emote from playerData (player might already be sitting)
                currentEmote: playerData.emote || null,
                emoteStartTime: playerData.emoteStartTime || Date.now()
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
                        onClick={() => setShowEmoteWheel(true)}
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
                color={nearbyPortal?.targetRoom || nearbyPortal?.minigame ? 'green' : 'gray'}
                hasGame={!!(nearbyPortal?.targetRoom || nearbyPortal?.minigame)}
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
                 <h2 className={`text-xl drop-shadow-lg ${room === 'dojo' ? 'text-red-400' : room === 'pizza' ? 'text-orange-400' : room.startsWith('igloo') ? 'text-cyan-300' : 'text-yellow-400'}`}>
                     {room === 'dojo' ? 'THE DOJO' : room === 'pizza' ? 'PIZZA PARLOR' : room.startsWith('igloo') ? `IGLOO ${room.slice(-1)}` : 'TOWN'}
                 </h2>
                 {!isMobile && (
                     <p className="text-[10px] opacity-70 mt-1">WASD Move • E Interact • T Emotes • Mouse Orbit</p>
                 )}
                 
                 {/* Multiplayer Status */}
                 <div className="flex items-center gap-2 mt-2">
                     <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                     <span className="text-[10px] opacity-80">
                         {connected ? `Online • ${playerCount + 1} players` : 'Connecting...'}
                     </span>
                 </div>
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
                             <span className="text-cyan-300 text-[10px]">{(snowIntensityRef.current * 100).toFixed(0)}%</span>
                         </div>
                     </div>
                 </div>
             )}

             
             {showEmoteWheel && (
                 <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50 backdrop-blur-sm animate-fade-in">
                     <div className="relative w-64 h-64 rounded-full border-4 border-white/20 bg-black/80 flex items-center justify-center">
                         <div className="absolute top-2 text-center w-full retro-text text-yellow-400 text-[10px]">EMOTES</div>
                         
                         {/* 5 buttons evenly spaced in a circle (72 degrees apart) */}
                         {/* Top: Wave */}
                         <button 
                             className="absolute hover:scale-110 transition-transform p-3 bg-blue-500 rounded-full border-2 border-white shadow-lg"
                             style={{ top: '12%', left: '50%', transform: 'translateX(-50%)' }}
                             onClick={() => triggerEmote('Wave')} 
                             title="Wave">👋</button>
                         
                         {/* Top-right: Laugh */}
                         <button 
                             className="absolute hover:scale-110 transition-transform p-3 bg-red-500 rounded-full border-2 border-white shadow-lg"
                             style={{ top: '30%', right: '12%' }}
                             onClick={() => triggerEmote('Laugh')} 
                             title="Laugh">😂</button>
                         
                         {/* Bottom-right: Breakdance */}
                         <button 
                             className="absolute hover:scale-110 transition-transform p-3 bg-orange-500 rounded-full border-2 border-white shadow-lg"
                             style={{ bottom: '18%', right: '18%' }}
                             onClick={() => triggerEmote('Breakdance')} 
                             title="Breakdance">🤸</button>
                         
                         {/* Bottom-left: Dance */}
                         <button 
                             className="absolute hover:scale-110 transition-transform p-3 bg-green-500 rounded-full border-2 border-white shadow-lg"
                             style={{ bottom: '18%', left: '18%' }}
                             onClick={() => triggerEmote('Dance')} 
                             title="Dance">💃</button>
                         
                         {/* Top-left: Sit */}
                         <button 
                             className="absolute hover:scale-110 transition-transform p-3 bg-purple-500 rounded-full border-2 border-white shadow-lg"
                             style={{ top: '30%', left: '12%' }}
                             onClick={() => triggerEmote('Sit')} 
                             title="Sit">🧘</button>
                         
                         <div className="text-white text-[10px] text-center opacity-50 retro-text">Press E<br/>to close</div>
                     </div>
                 </div>
             )}
             
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

