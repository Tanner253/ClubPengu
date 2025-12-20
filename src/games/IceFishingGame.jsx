/**
 * IceFishingGame - Full screen arcade-style fishing minigame
 * 
 * Gameplay:
 * - POV camera looking down into the water
 * - Hook with worm descends through 1500m of water (~3 min game)
 * - Fish swim left/right as obstacles to DODGE
 * - A/D or Arrow keys to move hook horizontally
 * - Dodge cheap fish to reach expensive fish at bottom
 * - Hitting ground = nothing gained
 * 
 * Visual Features:
 * - Dynamic lighting that darkens with depth
 * - Light rays and caustics effect
 * - Depth zones with unique atmospheres
 * - Glowing rare fish
 * - Particle effects (bubbles, plankton, debris)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

// ==================== GAME CONFIG ====================
const GAME_CONFIG = {
    // Water depth - 1500m for ~3 minute game
    WATER_DEPTH: 1500,
    DESCENT_SPEED: 15, // Meters per second
    
    // Hook movement on X-axis - smooth with acceleration
    HOOK_ACCELERATION: 100,   // How fast to accelerate
    HOOK_MAX_SPEED: 25,       // Max movement speed
    HOOK_FRICTION: 0.90,      // Friction when not pressing (smooth stop)
    HOOK_MAX_X: 10,           // Playable area bounds (-10 to +10)
    
    // Fish lanes - fish swim horizontally in lanes below the hook
    LANE_SPACING: 15,         // Vertical distance between lanes (more space!)
    LANE_LOOKAHEAD: 8,        // How many lanes ahead to spawn fish
    FISH_SPEED_MIN: 4,        // Min horizontal speed
    FISH_SPEED_MAX: 9,        // Max horizontal speed
    
    // Collision - Properly scaled hitboxes based on creature body type
    HOOK_HITBOX_RADIUS: 0.6,  // Hook + worm collision radius (generous for catching)
    BASE_HITBOX_HEIGHT: 1.8,  // Base vertical collision zone
    
    // Body type hitbox multipliers (how wide/tall the collision is relative to size)
    BODY_HITBOX_SCALES: {
        fish: { width: 2.2, height: 0.9 },      // Standard fish shape
        jellyfish: { width: 1.0, height: 1.4 }, // Tall bell shape
        squid: { width: 1.8, height: 1.0 },     // Long tentacles
        shark: { width: 2.8, height: 0.8 },     // Streamlined
        eel: { width: 3.2, height: 0.6 },       // Very long and thin
        angler: { width: 1.4, height: 1.2 },    // Bulbous
        whale: { width: 3.0, height: 1.0 },     // Massive
        crab: { width: 1.6, height: 0.8 },      // Wide and flat
        turtle: { width: 1.4, height: 1.0 },    // Shell shape
        coin: { width: 1.2, height: 1.2 }       // Circular pickup
    },
    
    // Visual - depth zones
    ZONES: [
        { maxDepth: 100, name: 'Shallows', bgTop: 0x66CCFF, bgBottom: 0x4488CC, fogDensity: 0.004, lightIntensity: 1.0 },
        { maxDepth: 300, name: 'Sunlit Zone', bgTop: 0x4488CC, bgBottom: 0x336699, fogDensity: 0.006, lightIntensity: 0.8 },
        { maxDepth: 600, name: 'Twilight Zone', bgTop: 0x336699, bgBottom: 0x224466, fogDensity: 0.01, lightIntensity: 0.5 },
        { maxDepth: 1000, name: 'Midnight Zone', bgTop: 0x224466, bgBottom: 0x112233, fogDensity: 0.012, lightIntensity: 0.2 },
        { maxDepth: 1500, name: 'Abyss', bgTop: 0x112233, bgBottom: 0x050510, fogDensity: 0.015, lightIntensity: 0.05 }
    ],
    
    // Camera
    FOG_NEAR: 15,
    FOG_FAR: 100,
};

// Creature types for different rendering
const CREATURE_TYPES = {
    FISH: 'fish',
    JELLYFISH: 'jellyfish',
    SQUID: 'squid',
    SHARK: 'shark',
    EEL: 'eel',
    ANGLER: 'angler',
    WHALE: 'whale',
    CRAB: 'crab',
    TURTLE: 'turtle',
    COIN: 'coin'
};

// ==================== JELLYFISH HAZARDS (spawn at ALL depths) ====================
// Small, numerous obstacles to dodge - NOT catches, just hazards!
const JELLYFISH_HAZARDS = [
    { id: 'tiny_jelly', emoji: '🎐', name: 'Tiny Jelly', coins: 0, color: 0xAADDFF, size: 0.4, speed: 0.2, glow: true, type: CREATURE_TYPES.JELLYFISH },
    { id: 'blue_jelly', emoji: '🎐', name: 'Blue Jelly', coins: 0, color: 0x88CCFF, size: 0.5, speed: 0.25, glow: true, type: CREATURE_TYPES.JELLYFISH },
    { id: 'pink_dot_jelly', emoji: '🎐', name: 'Pink Dot Jelly', coins: 0, color: 0xFFAADD, size: 0.45, speed: 0.22, glow: true, type: CREATURE_TYPES.JELLYFISH },
    { id: 'clear_jelly', emoji: '🎐', name: 'Crystal Jelly', coins: 0, color: 0xDDFFFF, size: 0.35, speed: 0.18, glow: true, type: CREATURE_TYPES.JELLYFISH },
    { id: 'violet_jelly', emoji: '🎐', name: 'Violet Jelly', coins: 0, color: 0xCC88FF, size: 0.5, speed: 0.28, glow: true, type: CREATURE_TYPES.JELLYFISH },
];

// ==================== FISH BY DEPTH TIER (CUMULATIVE SPAWNING) ====================
// As you go deeper, ALL previous tier fish can still spawn + new tier fish!
// This creates natural density increase and variety

const FISH_BY_TIER = {
    // TIER 1: 0m+ (always available once unlocked)
    1: [
        { id: 'minnow', emoji: '🐟', name: 'Minnow', coins: 3, color: 0x88AACC, size: 0.9, speed: 0.7, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xAABBDD },
        { id: 'sardine', emoji: '🐟', name: 'Sardine', coins: 4, color: 0xAABBCC, size: 0.85, speed: 0.75, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xCCDDEE },
        { id: 'anchovy', emoji: '🐟', name: 'Anchovy', coins: 3, color: 0x7799BB, size: 0.75, speed: 0.8, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0x99BBDD },
        { id: 'guppy', emoji: '🐠', name: 'Guppy', coins: 5, color: 0xFF8844, size: 0.6, speed: 0.65, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xFFAA66 },
        { id: 'neon_tetra', emoji: '🐠', name: 'Neon Tetra', coins: 6, color: 0x00FFFF, size: 0.5, speed: 0.7, glow: true, type: CREATURE_TYPES.FISH, accentColor: 0xFF0066 },
    ],
    // TIER 2: 100m+ 
    2: [
        { id: 'clownfish', emoji: '🐠', name: 'Clownfish', coins: 10, color: 0xFF6600, size: 1.0, speed: 0.75, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xFFFFFF },
        { id: 'blue_tang', emoji: '🐠', name: 'Blue Tang', coins: 12, color: 0x2255FF, size: 1.1, speed: 0.8, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xFFFF00 },
        { id: 'butterfly_fish', emoji: '🐠', name: 'Butterfly Fish', coins: 15, color: 0xFFDD00, size: 1.15, speed: 0.7, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0x222222 },
        { id: 'angelfish', emoji: '🐠', name: 'Angelfish', coins: 14, color: 0xFFAA00, size: 1.2, speed: 0.65, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0x000000 },
    ],
    // TIER 3: 200m+
    3: [
        { id: 'parrotfish', emoji: '🐠', name: 'Parrot Fish', coins: 20, color: 0x22DD88, size: 1.35, speed: 0.75, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xFF4488 },
        { id: 'sea_turtle', emoji: '🐢', name: 'Sea Turtle', coins: 30, color: 0x446644, size: 1.8, speed: 0.4, glow: false, type: CREATURE_TYPES.TURTLE, accentColor: 0x88AA66 },
        { id: 'reef_squid', emoji: '🦑', name: 'Reef Squid', coins: 22, color: 0xFFAABB, size: 1.2, speed: 0.85, glow: false, type: CREATURE_TYPES.SQUID, accentColor: 0xFF88AA },
        { id: 'lionfish', emoji: '🐡', name: 'Lionfish', coins: 35, color: 0xDD3322, size: 1.3, speed: 0.55, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xFFFFFF },
    ],
    // TIER 4: 350m+
    4: [
        { id: 'reef_shark', emoji: '🦈', name: 'Reef Shark', coins: 40, color: 0x556677, size: 2.0, speed: 1.1, glow: false, type: CREATURE_TYPES.SHARK, accentColor: 0xEEEEEE },
        { id: 'blue_marlin', emoji: '🐟', name: 'Blue Marlin', coins: 45, color: 0x1155AA, size: 2.2, speed: 1.25, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xCCDDFF },
        { id: 'swordfish', emoji: '🐟', name: 'Swordfish', coins: 50, color: 0x334466, size: 2.4, speed: 1.35, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0x889AAA },
        { id: 'manta_ray', emoji: '🦈', name: 'Manta Ray', coins: 55, color: 0x223344, size: 2.5, speed: 0.8, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xFFFFFF },
    ],
    // TIER 5: 500m+
    5: [
        { id: 'hammerhead', emoji: '🦈', name: 'Hammerhead', coins: 65, color: 0x667788, size: 2.5, speed: 1.15, glow: false, type: CREATURE_TYPES.SHARK, accentColor: 0xCCCCCC },
        { id: 'barracuda', emoji: '🐟', name: 'Barracuda', coins: 60, color: 0x889999, size: 2.0, speed: 1.4, glow: false, type: CREATURE_TYPES.FISH, accentColor: 0xDDDDDD },
        { id: 'moray_eel', emoji: '🐍', name: 'Moray Eel', coins: 70, color: 0x445533, size: 2.0, speed: 0.7, glow: false, type: CREATURE_TYPES.EEL, accentColor: 0xFFDD88 },
        { id: 'giant_crab', emoji: '🦀', name: 'Giant Crab', coins: 75, color: 0xCC4433, size: 1.6, speed: 0.45, glow: false, type: CREATURE_TYPES.CRAB, accentColor: 0xFF8866 },
    ],
    // TIER 6: 700m+
    6: [
        { id: 'giant_squid', emoji: '🦑', name: 'Giant Squid', coins: 100, color: 0xCC4444, size: 3.0, speed: 0.85, glow: true, type: CREATURE_TYPES.SQUID, accentColor: 0xFF6666 },
        { id: 'lantern_fish', emoji: '🔦', name: 'Lantern Fish', coins: 85, color: 0x44FFAA, size: 1.3, speed: 0.8, glow: true, type: CREATURE_TYPES.FISH, accentColor: 0xFFFF88 },
        { id: 'vampire_squid', emoji: '🦑', name: 'Vampire Squid', coins: 110, color: 0x660022, size: 1.8, speed: 0.5, glow: true, type: CREATURE_TYPES.SQUID, accentColor: 0xFF0044 },
        { id: 'hatchetfish', emoji: '🐟', name: 'Hatchetfish', coins: 90, color: 0xBBCCDD, size: 1.1, speed: 0.7, glow: true, type: CREATURE_TYPES.FISH, accentColor: 0x88FFFF },
    ],
    // TIER 7: 900m+
    7: [
        { id: 'goblin_shark', emoji: '🦈', name: 'Goblin Shark', coins: 150, color: 0xBB8877, size: 2.8, speed: 0.95, glow: true, type: CREATURE_TYPES.SHARK, accentColor: 0xFFCCBB },
        { id: 'oarfish', emoji: '🐟', name: 'Oarfish', coins: 160, color: 0xCCBBCC, size: 3.5, speed: 0.6, glow: true, type: CREATURE_TYPES.EEL, accentColor: 0xFF4444 },
        { id: 'anglerfish', emoji: '🐡', name: 'Anglerfish', coins: 175, color: 0x332211, size: 2.0, speed: 0.65, glow: true, type: CREATURE_TYPES.ANGLER, accentColor: 0x88FFFF },
        { id: 'fangtooth', emoji: '🐟', name: 'Fangtooth', coins: 140, color: 0x222233, size: 1.5, speed: 0.75, glow: true, type: CREATURE_TYPES.FISH, accentColor: 0xFF4444 },
    ],
    // TIER 8: 1050m+
    8: [
        { id: 'gulper_eel', emoji: '🐍', name: 'Gulper Eel', coins: 220, color: 0x111122, size: 2.5, speed: 0.6, glow: true, type: CREATURE_TYPES.EEL, accentColor: 0xFF88FF },
        { id: 'ghost_shark', emoji: '🦈', name: 'Ghost Shark', coins: 250, color: 0x99AABB, size: 2.8, speed: 0.9, glow: true, type: CREATURE_TYPES.SHARK, accentColor: 0xFFFFFF },
        { id: 'viperfish', emoji: '🐟', name: 'Viperfish', coins: 200, color: 0x223344, size: 1.7, speed: 1.05, glow: true, type: CREATURE_TYPES.FISH, accentColor: 0x00FFFF },
        { id: 'colossal_squid', emoji: '🦑', name: 'Colossal Squid', coins: 280, color: 0xAA2222, size: 3.8, speed: 0.8, glow: true, type: CREATURE_TYPES.SQUID, accentColor: 0xFF4444 },
    ],
    // TIER 9: 1200m+
    9: [
        { id: 'dragonfish', emoji: '🐉', name: 'Dragonfish', coins: 350, color: 0xDD2200, size: 2.5, speed: 0.95, glow: true, type: CREATURE_TYPES.FISH, accentColor: 0xFFAA00 },
        { id: 'giant_isopod', emoji: '🦞', name: 'Giant Isopod', coins: 320, color: 0x776655, size: 1.8, speed: 0.4, glow: false, type: CREATURE_TYPES.CRAB, accentColor: 0x998877 },
        { id: 'frilled_shark', emoji: '🦈', name: 'Frilled Shark', coins: 450, color: 0x443344, size: 3.2, speed: 0.75, glow: true, type: CREATURE_TYPES.SHARK, accentColor: 0xFF88AA },
        { id: 'black_seadevil', emoji: '🐡', name: 'Black Seadevil', coins: 400, color: 0x111111, size: 2.0, speed: 0.6, glow: true, type: CREATURE_TYPES.ANGLER, accentColor: 0x00FF88 },
    ],
    // TIER 10: 1350m+ (MYTHIC)
    10: [
        { id: 'megalodon', emoji: '🦈', name: 'Megalodon', coins: 600, color: 0x445566, size: 5.0, speed: 1.15, glow: true, type: CREATURE_TYPES.SHARK, accentColor: 0x889999 },
        { id: 'kraken', emoji: '🦑', name: 'Kraken', coins: 800, color: 0x550033, size: 6.0, speed: 0.7, glow: true, type: CREATURE_TYPES.SQUID, accentColor: 0xFF44AA },
        { id: 'leviathan', emoji: '🐋', name: 'Leviathan', coins: 1000, color: 0x112244, size: 7.0, speed: 0.5, glow: true, type: CREATURE_TYPES.WHALE, accentColor: 0x4488FF },
        { id: 'sea_serpent', emoji: '🐉', name: 'Sea Serpent', coins: 900, color: 0x224433, size: 5.5, speed: 0.85, glow: true, type: CREATURE_TYPES.EEL, accentColor: 0x44FF88 },
    ],
};

// Depth thresholds for each tier (cumulative - once reached, always available)
const TIER_UNLOCK_DEPTHS = {
    1: 0,      // Always available
    2: 100,    // Unlocks at 100m
    3: 200,    // Unlocks at 200m
    4: 350,    // Unlocks at 350m
    5: 500,    // Unlocks at 500m
    6: 700,    // Unlocks at 700m
    7: 900,    // Unlocks at 900m
    8: 1050,   // Unlocks at 1050m
    9: 1200,   // Unlocks at 1200m
    10: 1350,  // Unlocks at 1350m
};

// Generate game fish pool - randomly selects 2 fish per tier for this game session
// This creates variety while keeping the "must play multiple times" feel
const generateGameFishPool = () => {
    const pool = {};
    for (let tier = 1; tier <= 10; tier++) {
        const tierFish = FISH_BY_TIER[tier];
        // Shuffle and pick 2 (or all if < 2)
        const shuffled = [...tierFish].sort(() => Math.random() - 0.5);
        pool[tier] = shuffled.slice(0, Math.min(2, shuffled.length));
    }
    return pool;
};

// Get all available fish at a given depth (cumulative!)
const getAvailableFishAtDepth = (depth, fishPool) => {
    const available = [];
    for (let tier = 1; tier <= 10; tier++) {
        if (depth >= TIER_UNLOCK_DEPTHS[tier] && fishPool[tier]) {
            available.push(...fishPool[tier].map(f => ({ ...f, tier })));
        }
    }
    return available;
};

// Coin pickup
const COIN_PICKUP = { 
    id: 'gold_coin', emoji: '🪙', name: 'Gold Coin', coins: 5, color: 0xFFD700, 
    size: 0.8, speed: 0.0, glow: true, type: CREATURE_TYPES.COIN, isPickup: true,
    accentColor: 0xFFAA00
};

// ==================== FUN POWER-UPS & RARE PICKUPS ====================
// Treasure chest - rare, high value
const TREASURE_CHEST = {
    id: 'treasure_chest', emoji: '🎁', name: 'Treasure Chest', coins: 25, color: 0x8B4513,
    size: 1.2, speed: 0.0, glow: true, type: CREATURE_TYPES.COIN, isPickup: true,
    accentColor: 0xFFD700, isTreasure: true
};

// Speed bubble - gives temporary speed boost
const SPEED_BUBBLE = {
    id: 'speed_bubble', emoji: '💨', name: 'Speed Bubble', coins: 0, color: 0x00FFFF,
    size: 0.7, speed: 0.0, glow: true, type: CREATURE_TYPES.COIN, isPickup: true,
    accentColor: 0x88FFFF, isSpeedBoost: true
};

// Pearl - medium rare, decent value
const PEARL_PICKUP = {
    id: 'pearl', emoji: '🦪', name: 'Pearl', coins: 15, color: 0xFFFAFA,
    size: 0.9, speed: 0.0, glow: true, type: CREATURE_TYPES.COIN, isPickup: true,
    accentColor: 0xFFE4E1, isPearl: true
};

// All pickup types with spawn weights (higher = more common)
const PICKUP_TYPES = [
    { pickup: COIN_PICKUP, weight: 60 },      // Common gold coin
    { pickup: PEARL_PICKUP, weight: 25 },     // Uncommon pearl
    { pickup: SPEED_BUBBLE, weight: 10 },     // Rare speed boost
    { pickup: TREASURE_CHEST, weight: 5 }     // Very rare treasure
];

// Get weighted random pickup
const getRandomPickup = () => {
    const totalWeight = PICKUP_TYPES.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    for (const { pickup, weight } of PICKUP_TYPES) {
        random -= weight;
        if (random <= 0) return pickup;
    }
    return COIN_PICKUP;
};

// Max pickups per game (total of all types)
const MAX_COINS_PER_GAME = 5;

// ==================== GAME COMPONENT ====================
export default function IceFishingGame({ 
    onClose, 
    onCatch, 
    onMiss,
    playerName,
    isDemo = false,
    spotId
}) {
    const containerRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const gameStateRef = useRef(null);
    const animationFrameRef = useRef(null);
    const fishMeshesRef = useRef([]);
    const hookGroupRef = useRef(null);
    const particlesRef = useRef([]);
    const lightRaysRef = useRef(null);
    const ambientLightRef = useRef(null);
    const lastTimeRef = useRef(0);
    const velocityRef = useRef(0); // For smooth movement
    
    // Game-specific randomized fish pool (1 fish per tier, regenerated each game)
    const gameFishPoolRef = useRef(null);
    const coinsSpawnedRef = useRef(0); // Track coins spawned this game (max 3)
    const gameEndingRef = useRef(false); // For smooth end animation
    
    const [gamePhase, setGamePhase] = useState('intro');
    const [depth, setDepth] = useState(0);
    const [currentZone, setCurrentZone] = useState(GAME_CONFIG.ZONES[0]);
    const [caughtFish, setCaughtFish] = useState(null);
    const [countdown, setCountdown] = useState(3);
    const [collectedCoins, setCollectedCoins] = useState(0); // Bonus coins from pickups!
    const collectedCoinsRef = useRef(0); // Ref for game loop access
    
    // Power-up states
    const [hasSpeedBoost, setHasSpeedBoost] = useState(false);
    const [treasureFound, setTreasureFound] = useState(false);
    const [pearlFound, setPearlFound] = useState(false);
    const speedBoostRef = useRef(0); // Timestamp when speed boost expires
    
    const inputRef = useRef({ left: false, right: false });
    
    // Get current zone based on depth
    const getZone = useCallback((d) => {
        for (const zone of GAME_CONFIG.ZONES) {
            if (d <= zone.maxDepth) return zone;
        }
        return GAME_CONFIG.ZONES[GAME_CONFIG.ZONES.length - 1];
    }, []);
    
    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        // Scene with fog
        const scene = new THREE.Scene();
        const zone = GAME_CONFIG.ZONES[0];
        scene.background = new THREE.Color(zone.bgTop);
        scene.fog = new THREE.FogExp2(zone.bgBottom, zone.fogDensity);
        sceneRef.current = scene;
        
        // Camera - behind and above hook, looking down at fish lanes
        const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 500);
        camera.position.set(0, 12, 15);
        camera.lookAt(0, -15, 0);
        cameraRef.current = camera;
        
        // Renderer with better quality
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        // Ambient light (will dim with depth)
        const ambientLight = new THREE.AmbientLight(0x88CCFF, 0.8);
        scene.add(ambientLight);
        ambientLightRef.current = ambientLight;
        
        // Directional light (sun through water)
        const sunLight = new THREE.DirectionalLight(0xFFFFEE, 0.6);
        sunLight.position.set(5, 50, 10);
        scene.add(sunLight);
        
        // Create underwater environment
        createHookAndLine(scene);
        createLightRays(scene);
        createParticles(scene);
        createDepthEnvironment(scene);
        
        // Initialize game state
        gameStateRef.current = {
            hookX: 0,
            depth: 0,
            fish: [],
            startTime: 0,
            isPlaying: false,
            caughtFish: null,
            lastFishSpawn: 0,
            spawnInterval: GAME_CONFIG.FISH_SPAWN_BASE_INTERVAL
        };
        
        // Handle resize
        const handleResize = () => {
            if (!container || !renderer || !camera) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', handleResize);
        
        // Initial render
        renderer.render(scene, camera);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);
    
    // Create hook and fishing line
    const createHookAndLine = (scene) => {
        const hookGroup = new THREE.Group();
        
        // Fishing line - thicker and more visible
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xEEEEEE, 
            linewidth: 3,
            transparent: true,
            opacity: 0.9
        });
        
        const linePoints = [];
        for (let i = 0; i < 30; i++) {
            linePoints.push(new THREE.Vector3(0, 10 - i * 0.4, 0));
        }
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        hookGroup.add(line);
        
        // Hook - metallic and detailed
        const hookGeometry = new THREE.TorusGeometry(0.4, 0.1, 12, 24, Math.PI * 1.6);
        const hookMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xCCCCCC,
            metalness: 0.9,
            roughness: 0.2,
            emissive: 0x222222
        });
        const hook = new THREE.Mesh(hookGeometry, hookMaterial);
        hook.rotation.z = Math.PI / 2;
        hook.rotation.x = 0.2;
        hook.position.y = -2;
        hookGroup.add(hook);
        
        // Hook point (sharp end)
        const pointGeometry = new THREE.ConeGeometry(0.08, 0.3, 8);
        const point = new THREE.Mesh(pointGeometry, hookMaterial);
        point.position.set(0.35, -2.3, 0);
        point.rotation.z = -0.8;
        hookGroup.add(point);
        
        // Worm - segmented and animated
        const wormGroup = new THREE.Group();
        const wormSegments = 8;
        for (let i = 0; i < wormSegments; i++) {
            const size = 0.15 - i * 0.012;
            const segGeom = new THREE.SphereGeometry(size, 10, 8);
            const hue = 0.95 + (i / wormSegments) * 0.05; // Pink to red gradient
            const segMat = new THREE.MeshStandardMaterial({ 
                color: new THREE.Color().setHSL(hue, 0.7, 0.5),
                roughness: 0.8,
                metalness: 0.1
            });
            const segment = new THREE.Mesh(segGeom, segMat);
            segment.position.y = -i * 0.18;
            segment.userData.segmentIndex = i;
            wormGroup.add(segment);
        }
        wormGroup.position.set(0, -2.5, 0);
        hookGroup.add(wormGroup);
        hookGroup.userData.wormGroup = wormGroup;
        
        // Glow around hook (helps visibility in dark)
        const glowGeometry = new THREE.SphereGeometry(1.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x88CCFF,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.y = -2;
        hookGroup.add(glow);
        hookGroup.userData.glow = glow;
        
        scene.add(hookGroup);
        hookGroupRef.current = hookGroup;
    };
    
    // No light ray objects - just use ambient lighting and bubbles
    const createLightRays = (scene) => {
        // Empty - we don't need light ray meshes
        lightRaysRef.current = null;
    };
    
    // Create underwater particles (bubbles only - constant stream)
    const createParticles = (scene) => {
        const particles = [];
        
        // More bubbles, spread across visible area
        const bubbleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bubbleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xCCEEFF,
            transparent: true,
            opacity: 0.6
        });
        
        // Create bubbles in a range around where the player will be
        for (let i = 0; i < 150; i++) {
            const bubble = new THREE.Mesh(bubbleGeometry.clone(), bubbleMaterial.clone());
            bubble.position.set(
                (Math.random() - 0.5) * 40,
                -Math.random() * 100, // Start in view
                (Math.random() - 0.5) * 20 - 5
            );
            bubble.scale.setScalar(0.3 + Math.random() * 0.8);
            bubble.userData.riseSpeed = 0.08 + Math.random() * 0.12; // Faster rise
            bubble.userData.wobbleOffset = Math.random() * Math.PI * 2;
            bubble.userData.type = 'bubble';
            scene.add(bubble);
            particles.push(bubble);
        }
        
        particlesRef.current = particles;
    };
    
    // Create depth environment (just bottom, no walls)
    const createDepthEnvironment = (scene) => {
        // No walls - open water feel
        
        // Sandy bottom at 1500m
        const groundGeom = new THREE.CircleGeometry(50, 32);
        const groundMat = new THREE.MeshStandardMaterial({ 
            color: 0x8B7355,
            roughness: 1.0,
            metalness: 0
        });
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -GAME_CONFIG.WATER_DEPTH - 5;
        scene.add(ground);
        
        // Rocks on bottom
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x555544, roughness: 1 });
        for (let i = 0; i < 20; i++) {
            const rockGeom = new THREE.DodecahedronGeometry(1 + Math.random() * 2, 0);
            const rock = new THREE.Mesh(rockGeom, rockMat);
            rock.position.set(
                (Math.random() - 0.5) * 40,
                -GAME_CONFIG.WATER_DEPTH - 3 + Math.random() * 2,
                (Math.random() - 0.5) * 20
            );
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.scale.y = 0.5;
            scene.add(rock);
        }
    };
    
    // Track which lanes have been spawned
    const spawnedLanesRef = useRef(new Set());
    
    // Create creature mesh - HIGH QUALITY procedural models with animations
    const createFishMesh = useCallback((fishType, fromLeft) => {
        const group = new THREE.Group();
        const size = fishType.size;
        const creatureType = fishType.type || CREATURE_TYPES.FISH;
        const accentColor = fishType.accentColor || 0xFFFFFF;
        
        // Primary material with enhanced appearance
        const mat = new THREE.MeshStandardMaterial({ 
            color: fishType.color,
            metalness: fishType.glow ? 0.6 : 0.3,
            roughness: fishType.glow ? 0.2 : 0.5,
            emissive: fishType.glow ? fishType.color : 0x000000,
            emissiveIntensity: fishType.glow ? 0.7 : 0
        });
        
        // Accent material for stripes/details
        const accentMat = new THREE.MeshStandardMaterial({
            color: accentColor,
            metalness: 0.2,
            roughness: 0.4,
            emissive: fishType.glow ? accentColor : 0x000000,
            emissiveIntensity: fishType.glow ? 0.3 : 0
        });
        
        // Translucent material for jellyfish/fins
        const translucentMat = new THREE.MeshStandardMaterial({
            color: fishType.color,
            transparent: true,
            opacity: 0.65,
            metalness: 0.1,
            roughness: 0.2,
            emissive: fishType.glow ? fishType.color : 0x000000,
            emissiveIntensity: fishType.glow ? 0.9 : 0,
            side: THREE.DoubleSide
        });
        
        // ========== COIN PICKUP ==========
        if (creatureType === CREATURE_TYPES.COIN) {
            // Detailed coin with embossed look
            const coinGeom = new THREE.CylinderGeometry(size * 0.6, size * 0.6, size * 0.12, 24);
            const coinMat = new THREE.MeshStandardMaterial({
                color: 0xFFD700,
                metalness: 0.95,
                roughness: 0.05,
                emissive: 0xFFAA00,
                emissiveIntensity: 0.6
            });
            const coin = new THREE.Mesh(coinGeom, coinMat);
            coin.rotation.x = Math.PI / 2;
            group.add(coin);
            
            // Inner ring detail
            const ringGeom = new THREE.TorusGeometry(size * 0.4, size * 0.05, 8, 24);
            const ring = new THREE.Mesh(ringGeom, coinMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.z = size * 0.07;
            group.add(ring);
            
            // Multiple glow layers for shimmer
            for (let i = 0; i < 3; i++) {
                const glowGeom = new THREE.SphereGeometry(size * (0.7 + i * 0.2), 12, 12);
                const glowMat = new THREE.MeshBasicMaterial({
                    color: 0xFFFF44,
                    transparent: true,
                    opacity: 0.2 - i * 0.05,
                    side: THREE.BackSide
                });
                group.add(new THREE.Mesh(glowGeom, glowMat));
            }
            group.userData.isCoin = true;
        }
        // ========== JELLYFISH (Small hazards) ==========
        else if (creatureType === CREATURE_TYPES.JELLYFISH) {
            // Detailed bell with inner structure
            const bellGeom = new THREE.SphereGeometry(size * 0.55, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
            const bell = new THREE.Mesh(bellGeom, translucentMat);
            bell.rotation.x = Math.PI;
            group.add(bell);
            
            // Inner bell detail
            const innerBell = new THREE.Mesh(
                new THREE.SphereGeometry(size * 0.4, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
                new THREE.MeshBasicMaterial({ 
                    color: fishType.color, 
                    transparent: true, 
                    opacity: 0.3,
                    side: THREE.BackSide
                })
            );
            innerBell.rotation.x = Math.PI;
            innerBell.position.y = -size * 0.05;
            group.add(innerBell);
            
            // Oral arms (frilly center tentacles)
            for (let i = 0; i < 4; i++) {
                const armGeom = new THREE.ConeGeometry(size * 0.08, size * 0.5, 6);
                const arm = new THREE.Mesh(armGeom, translucentMat);
                const angle = (i / 4) * Math.PI * 2;
                arm.position.set(
                    Math.cos(angle) * size * 0.12,
                    -size * 0.25,
                    Math.sin(angle) * size * 0.12
                );
                arm.rotation.x = 0.3;
                arm.userData.isOralArm = true;
                group.add(arm);
            }
            
            // Long trailing tentacles
            const tentCount = 12;
            for (let i = 0; i < tentCount; i++) {
                const tentLen = size * (0.8 + Math.random() * 0.6);
                const tentGeom = new THREE.CylinderGeometry(size * 0.015, size * 0.005, tentLen, 4);
                const tent = new THREE.Mesh(tentGeom, translucentMat);
                const angle = (i / tentCount) * Math.PI * 2;
                const radius = size * (0.25 + (i % 2) * 0.1);
                tent.position.set(
                    Math.cos(angle) * radius,
                    -tentLen / 2 - size * 0.1,
                    Math.sin(angle) * radius
                );
                tent.userData.isTentacle = true;
                tent.userData.tentIndex = i;
                tent.userData.baseLen = tentLen;
                group.add(tent);
            }
            
            // Pulsing glow
            const pulseGlow = new THREE.Mesh(
                new THREE.SphereGeometry(size * 0.8, 16, 16),
                new THREE.MeshBasicMaterial({
                    color: fishType.color,
                    transparent: true,
                    opacity: 0.25,
                    side: THREE.BackSide
                })
            );
            pulseGlow.userData.isPulseGlow = true;
            group.add(pulseGlow);
        }
        // ========== SQUID ==========
        else if (creatureType === CREATURE_TYPES.SQUID) {
            // Squid swims mantle-first (jet propulsion), tentacles trail behind
            // Mantle at FRONT (+X, swimming direction), head and tentacles at BACK (-X)
            
            // Elongated mantle (front/propulsion end) - cone tip points forward
            const mantleGeom = new THREE.ConeGeometry(size * 0.45, size * 1.6, 10);
            const mantle = new THREE.Mesh(mantleGeom, mat);
            mantle.rotation.z = Math.PI / 2; // Tip points toward +X (swimming direction)
            mantle.position.x = size * 0.5;
            group.add(mantle);
            
            // Side fins on mantle (triangular)
            const finShape = new THREE.Shape();
            finShape.moveTo(0, 0);
            finShape.lineTo(-size * 0.4, size * 0.15);
            finShape.lineTo(-size * 0.5, -size * 0.15);
            finShape.lineTo(0, 0);
            const finGeom = new THREE.ExtrudeGeometry(finShape, { depth: size * 0.02, bevelEnabled: false });
            const finL = new THREE.Mesh(finGeom, mat);
            finL.position.set(size * 0.4, 0, size * 0.35);
            finL.rotation.y = Math.PI / 2;
            group.add(finL);
            const finR = finL.clone();
            finR.position.z = -size * 0.35;
            finR.rotation.y = -Math.PI / 2;
            group.add(finR);
            
            // Head (behind mantle, where tentacles attach)
            const headGeom = new THREE.SphereGeometry(size * 0.42, 14, 12);
            const head = new THREE.Mesh(headGeom, mat);
            head.position.x = -size * 0.25;
            group.add(head);
            
            // Big expressive eyes (on sides of head)
            const eyeWhiteGeom = new THREE.SphereGeometry(size * 0.18, 10, 10);
            const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const eyeWhiteL = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
            eyeWhiteL.position.set(-size * 0.15, size * 0.12, size * 0.32);
            group.add(eyeWhiteL);
            const eyeWhiteR = eyeWhiteL.clone();
            eyeWhiteR.position.z = -size * 0.32;
            group.add(eyeWhiteR);
            
            // Pupils
            const pupilGeom = new THREE.SphereGeometry(size * 0.1, 8, 8);
            const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
            const pupilL = new THREE.Mesh(pupilGeom, pupilMat);
            pupilL.position.set(-size * 0.08, size * 0.12, size * 0.35);
            group.add(pupilL);
            const pupilR = pupilL.clone();
            pupilR.position.z = -size * 0.35;
            group.add(pupilR);
            
            // Tentacles trailing BEHIND (negative X direction)
            // 8 short arms + 2 long feeding tentacles
            for (let i = 0; i < 10; i++) {
                const isLong = i >= 8;
                const len = isLong ? size * 1.5 : size * 0.9;
                const armGeom = new THREE.CylinderGeometry(size * 0.06, size * 0.02, len, 6);
                const arm = new THREE.Mesh(armGeom, mat);
                const spread = ((i % 8) / 8) * Math.PI * 1.5 - Math.PI * 0.75;
                // Tentacles extend backward (negative X)
                arm.rotation.z = -Math.PI / 2 + spread * 0.35;
                arm.position.set(
                    -size * 0.55 - (len / 2) * Math.cos(Math.PI / 2 - spread * 0.35),
                    spread * size * 0.15,
                    isLong ? (i === 8 ? size * 0.1 : -size * 0.1) : 0
                );
                arm.userData.isTentacle = true;
                arm.userData.tentIndex = i;
                group.add(arm);
            }
        }
        // ========== SHARK ==========
        else if (creatureType === CREATURE_TYPES.SHARK) {
            // Streamlined torpedo body
            const bodyGeom = new THREE.SphereGeometry(size * 0.45, 20, 14);
            bodyGeom.scale(2.6, 0.75, 0.65);
            const body = new THREE.Mesh(bodyGeom, mat);
            group.add(body);
            
            // Underbelly (lighter color)
            const bellyGeom = new THREE.SphereGeometry(size * 0.4, 16, 10);
            bellyGeom.scale(2.2, 0.5, 0.5);
            const belly = new THREE.Mesh(bellyGeom, accentMat);
            belly.position.y = -size * 0.1;
            group.add(belly);
            
            // Pointed snout
            const snoutGeom = new THREE.ConeGeometry(size * 0.22, size * 0.7, 10);
            const snout = new THREE.Mesh(snoutGeom, mat);
            snout.rotation.z = -Math.PI / 2;
            snout.position.x = size * 1.2;
            group.add(snout);
            
            // Iconic dorsal fin
            const dorsalShape = new THREE.Shape();
            dorsalShape.moveTo(0, 0);
            dorsalShape.lineTo(-size * 0.2, size * 0.65);
            dorsalShape.quadraticCurveTo(-size * 0.1, size * 0.7, size * 0.15, size * 0.55);
            dorsalShape.lineTo(size * 0.25, 0);
            const dorsalGeom = new THREE.ExtrudeGeometry(dorsalShape, { depth: size * 0.04, bevelEnabled: false });
            const dorsal = new THREE.Mesh(dorsalGeom, mat);
            dorsal.position.set(-size * 0.1, size * 0.25, -size * 0.02);
            group.add(dorsal);
            
            // Powerful caudal (tail) fin - points backward (negative X)
            const tailGeom = new THREE.ConeGeometry(size * 0.35, size * 0.9, 6);
            const tail = new THREE.Mesh(tailGeom, mat);
            tail.rotation.z = -Math.PI / 2; // Point toward back of shark
            tail.position.x = -size * 1.3;
            tail.userData.isTail = true;
            group.add(tail);
            
            // Lower tail lobe - also points backward
            const lowerTail = new THREE.Mesh(
                new THREE.ConeGeometry(size * 0.2, size * 0.5, 4),
                mat
            );
            lowerTail.rotation.z = -Math.PI / 2 - 0.4; // Point backward with angle
            lowerTail.position.set(-size * 1.2, -size * 0.25, 0);
            group.add(lowerTail);
            
            // Pectoral fins (swept back)
            const pectoralGeom = new THREE.ConeGeometry(size * 0.12, size * 0.55, 4);
            const pectoralL = new THREE.Mesh(pectoralGeom, mat);
            pectoralL.rotation.set(0.3, 0.5, Math.PI / 2 + 0.6);
            pectoralL.position.set(size * 0.4, -size * 0.18, size * 0.38);
            group.add(pectoralL);
            const pectoralR = pectoralL.clone();
            pectoralR.position.z = -size * 0.38;
            pectoralR.rotation.y = -0.5;
            group.add(pectoralR);
            
            // Gill slits
            for (let i = 0; i < 5; i++) {
                const gillGeom = new THREE.BoxGeometry(size * 0.02, size * 0.15, size * 0.01);
                const gillMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
                const gillL = new THREE.Mesh(gillGeom, gillMat);
                gillL.position.set(size * (0.6 - i * 0.08), 0, size * 0.32);
                group.add(gillL);
            }
            
            // Predatory eyes
            const eyeGeom = new THREE.SphereGeometry(size * 0.09, 10, 10);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
            const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
            eyeL.position.set(size * 0.85, size * 0.1, size * 0.25);
            group.add(eyeL);
            const eyeR = eyeL.clone();
            eyeR.position.z = -size * 0.25;
            group.add(eyeR);
        }
        // ========== EEL ==========
        else if (creatureType === CREATURE_TYPES.EEL) {
            // Smooth segmented body with gradient
            const segments = 12;
            for (let i = 0; i < segments; i++) {
                const t = i / (segments - 1);
                const segSize = size * 0.28 * (1 - t * 0.5);
                const segGeom = new THREE.SphereGeometry(segSize, 12, 10);
                segGeom.scale(1.4, 1, 1);
                const seg = new THREE.Mesh(segGeom, mat);
                seg.position.x = -i * size * 0.32;
                seg.userData.isSegment = true;
                seg.userData.segIndex = i;
                group.add(seg);
            }
            
            // Elegant head
            const headGeom = new THREE.SphereGeometry(size * 0.32, 14, 12);
            headGeom.scale(1.5, 0.85, 0.85);
            const head = new THREE.Mesh(headGeom, mat);
            head.position.x = size * 0.35;
            group.add(head);
            
            // Snout
            const snoutGeom = new THREE.SphereGeometry(size * 0.15, 10, 8);
            snoutGeom.scale(1.8, 0.7, 0.7);
            const snout = new THREE.Mesh(snoutGeom, mat);
            snout.position.x = size * 0.6;
            group.add(snout);
            
            // Dorsal fin ridge
            for (let i = 0; i < 6; i++) {
                const finGeom = new THREE.ConeGeometry(size * 0.04, size * 0.15, 4);
                const fin = new THREE.Mesh(finGeom, mat);
                fin.position.set(size * (0.1 - i * 0.35), size * 0.22, 0);
                group.add(fin);
            }
            
            // Eyes
            const eyeGeom = new THREE.SphereGeometry(size * 0.09, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: fishType.glow ? 0xFFFF44 : 0x222222 });
            const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
            eyeL.position.set(size * 0.45, size * 0.1, size * 0.15);
            group.add(eyeL);
            const eyeR = eyeL.clone();
            eyeR.position.z = -size * 0.15;
            group.add(eyeR);
        }
        // ========== ANGLERFISH ==========
        else if (creatureType === CREATURE_TYPES.ANGLER) {
            // Bulbous scary body
            const bodyGeom = new THREE.SphereGeometry(size * 0.55, 18, 14);
            bodyGeom.scale(1.25, 1.15, 0.95);
            const body = new THREE.Mesh(bodyGeom, mat);
            group.add(body);
            
            // Gaping maw
            const mouthGeom = new THREE.SphereGeometry(size * 0.4, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2);
            const mouthMat = new THREE.MeshBasicMaterial({ color: 0x110000, side: THREE.DoubleSide });
            const mouth = new THREE.Mesh(mouthGeom, mouthMat);
            mouth.rotation.z = Math.PI / 2;
            mouth.position.x = size * 0.45;
            group.add(mouth);
            
            // Terrifying teeth (irregular)
            const teethCount = 10;
            for (let i = 0; i < teethCount; i++) {
                const toothSize = size * (0.08 + Math.random() * 0.08);
                const toothGeom = new THREE.ConeGeometry(toothSize * 0.4, toothSize, 4);
                const toothMat = new THREE.MeshBasicMaterial({ color: 0xFFFFDD });
                const tooth = new THREE.Mesh(toothGeom, toothMat);
                const angle = (i / teethCount) * Math.PI * 1.2 - Math.PI * 0.6;
                const radius = size * 0.32;
                tooth.position.set(
                    size * 0.58,
                    Math.sin(angle) * radius,
                    Math.cos(angle) * radius
                );
                tooth.rotation.z = -Math.PI / 2 - angle * 0.3;
                group.add(tooth);
            }
            
            // Bioluminescent lure (illicium)
            const stalkGeom = new THREE.CylinderGeometry(size * 0.025, size * 0.015, size * 0.55, 6);
            const stalk = new THREE.Mesh(stalkGeom, mat);
            stalk.rotation.z = -Math.PI / 3.5;
            stalk.position.set(size * 0.25, size * 0.55, 0);
            group.add(stalk);
            
            // Glowing esca (lure bulb)
            const lureGeom = new THREE.SphereGeometry(size * 0.14, 12, 12);
            const lureMat = new THREE.MeshBasicMaterial({ color: accentColor });
            const lure = new THREE.Mesh(lureGeom, lureMat);
            lure.position.set(size * 0.45, size * 0.8, 0);
            group.add(lure);
            
            // Multiple glow layers for lure
            [0.25, 0.4, 0.55].forEach((r, i) => {
                const glowGeom = new THREE.SphereGeometry(size * r, 10, 10);
                const glowMat = new THREE.MeshBasicMaterial({
                    color: accentColor,
                    transparent: true,
                    opacity: 0.3 - i * 0.08,
                    side: THREE.BackSide
                });
                const glow = new THREE.Mesh(glowGeom, glowMat);
                lure.add(glow);
            });
            
            // Small evil eye
            const eyeGeom = new THREE.SphereGeometry(size * 0.1, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xFF4444 });
            const eye = new THREE.Mesh(eyeGeom, eyeMat);
            eye.position.set(size * 0.35, size * 0.25, size * 0.32);
            group.add(eye);
            const eyeR = eye.clone();
            eyeR.position.z = -size * 0.32;
            group.add(eyeR);
        }
        // ========== WHALE ==========
        else if (creatureType === CREATURE_TYPES.WHALE) {
            // Majestic body
            const bodyGeom = new THREE.SphereGeometry(size * 0.55, 24, 18);
            bodyGeom.scale(2.6, 0.95, 0.85);
            const body = new THREE.Mesh(bodyGeom, mat);
            group.add(body);
            
            // Throat grooves (for baleen whales)
            for (let i = 0; i < 8; i++) {
                const grooveGeom = new THREE.BoxGeometry(size * 1.5, size * 0.02, size * 0.01);
                const grooveMat = new THREE.MeshBasicMaterial({ color: accentColor });
                const groove = new THREE.Mesh(grooveGeom, grooveMat);
                groove.position.set(size * 0.3, -size * 0.35 + i * size * 0.05, 0);
                group.add(groove);
            }
            
            // Rounded head
            const headGeom = new THREE.SphereGeometry(size * 0.45, 18, 14);
            const head = new THREE.Mesh(headGeom, mat);
            head.position.x = size * 1.1;
            group.add(head);
            
            // Blowhole
            const blowGeom = new THREE.CylinderGeometry(size * 0.08, size * 0.06, size * 0.1, 8);
            const blowMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
            const blow = new THREE.Mesh(blowGeom, blowMat);
            blow.position.set(size * 0.9, size * 0.48, 0);
            group.add(blow);
            
            // Powerful tail flukes
            const flukeShape = new THREE.Shape();
            flukeShape.moveTo(0, 0);
            flukeShape.quadraticCurveTo(-size * 0.2, size * 0.5, -size * 0.8, size * 0.4);
            flukeShape.quadraticCurveTo(-size * 0.3, size * 0.1, 0, 0);
            const flukeGeom = new THREE.ExtrudeGeometry(flukeShape, { depth: size * 0.06, bevelEnabled: false });
            const flukeL = new THREE.Mesh(flukeGeom, mat);
            flukeL.position.set(-size * 1.5, 0, size * 0.03);
            flukeL.userData.isTail = true;
            group.add(flukeL);
            const flukeR = flukeL.clone();
            flukeR.scale.y = -1;
            flukeR.position.z = -size * 0.03;
            group.add(flukeR);
            
            // Pectoral fins
            const pectoralGeom = new THREE.BoxGeometry(size * 0.7, size * 0.12, size * 0.3);
            const pectoralL = new THREE.Mesh(pectoralGeom, mat);
            pectoralL.rotation.z = 0.4;
            pectoralL.position.set(size * 0.4, -size * 0.35, size * 0.55);
            group.add(pectoralL);
            const pectoralR = pectoralL.clone();
            pectoralR.position.z = -size * 0.55;
            group.add(pectoralR);
            
            // Wise eye
            const eyeGeom = new THREE.SphereGeometry(size * 0.12, 10, 10);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222244 });
            const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
            eyeL.position.set(size * 1.2, size * 0.1, size * 0.38);
            group.add(eyeL);
        }
        // ========== TURTLE ==========
        else if (creatureType === CREATURE_TYPES.TURTLE) {
            // Domed shell (top half of sphere, pointing UP)
            const shellGeom = new THREE.SphereGeometry(size * 0.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
            const shell = new THREE.Mesh(shellGeom, mat);
            // Shell dome should point UP (positive Y), no rotation needed for hemisphere
            shell.position.y = size * 0.05;
            group.add(shell);
            
            // Shell pattern (hexagonal plates on top of shell)
            for (let i = 0; i < 6; i++) {
                const plateGeom = new THREE.CircleGeometry(size * 0.12, 6);
                const plateMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.8 });
                const plate = new THREE.Mesh(plateGeom, plateMat);
                const angle = (i / 6) * Math.PI * 2;
                plate.position.set(
                    Math.cos(angle) * size * 0.25,
                    size * 0.38, // On top of shell
                    Math.sin(angle) * size * 0.25
                );
                plate.rotation.x = -Math.PI / 2; // Face up
                group.add(plate);
            }
            
            // Center plate on shell
            const centerPlateGeom = new THREE.CircleGeometry(size * 0.15, 6);
            const centerPlateMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.8 });
            const centerPlate = new THREE.Mesh(centerPlateGeom, centerPlateMat);
            centerPlate.position.y = size * 0.5;
            centerPlate.rotation.x = -Math.PI / 2;
            group.add(centerPlate);
            
            // Plastron (underbelly - flat bottom)
            const plastronGeom = new THREE.CylinderGeometry(size * 0.45, size * 0.42, size * 0.1, 14);
            const plastron = new THREE.Mesh(plastronGeom, accentMat);
            plastron.position.y = -size * 0.05;
            group.add(plastron);
            
            // Head
            const headGeom = new THREE.SphereGeometry(size * 0.18, 12, 10);
            headGeom.scale(1.4, 1, 1);
            const head = new THREE.Mesh(headGeom, mat);
            head.position.set(size * 0.55, 0, 0);
            group.add(head);
            
            // Beak
            const beakGeom = new THREE.ConeGeometry(size * 0.08, size * 0.15, 6);
            const beak = new THREE.Mesh(beakGeom, mat);
            beak.rotation.z = -Math.PI / 2;
            beak.position.set(size * 0.72, -size * 0.02, 0);
            group.add(beak);
            
            // Flippers
            const flipperGeom = new THREE.BoxGeometry(size * 0.5, size * 0.08, size * 0.2);
            const flipperFL = new THREE.Mesh(flipperGeom, mat);
            flipperFL.rotation.z = 0.3;
            flipperFL.position.set(size * 0.25, -size * 0.1, size * 0.45);
            flipperFL.userData.isFlipper = true;
            group.add(flipperFL);
            const flipperFR = flipperFL.clone();
            flipperFR.position.z = -size * 0.45;
            group.add(flipperFR);
            
            // Rear flippers (smaller)
            const rearFlipperGeom = new THREE.BoxGeometry(size * 0.25, size * 0.06, size * 0.12);
            const flipperRL = new THREE.Mesh(rearFlipperGeom, mat);
            flipperRL.position.set(-size * 0.35, -size * 0.1, size * 0.35);
            group.add(flipperRL);
            const flipperRR = flipperRL.clone();
            flipperRR.position.z = -size * 0.35;
            group.add(flipperRR);
            
            // Eyes
            const eyeGeom = new THREE.SphereGeometry(size * 0.05, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
            const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
            eyeL.position.set(size * 0.62, size * 0.05, size * 0.1);
            group.add(eyeL);
            const eyeR = eyeL.clone();
            eyeR.position.z = -size * 0.1;
            group.add(eyeR);
        }
        // ========== CRAB ==========
        else if (creatureType === CREATURE_TYPES.CRAB) {
            // Carapace (shell)
            const bodyGeom = new THREE.SphereGeometry(size * 0.38, 14, 10);
            bodyGeom.scale(1.9, 0.55, 1.3);
            const body = new THREE.Mesh(bodyGeom, mat);
            group.add(body);
            
            // Shell texture ridges
            for (let i = 0; i < 3; i++) {
                const ridgeGeom = new THREE.TorusGeometry(size * (0.25 - i * 0.06), size * 0.02, 6, 16, Math.PI);
                const ridge = new THREE.Mesh(ridgeGeom, mat);
                ridge.rotation.x = Math.PI / 2;
                ridge.position.set(size * (0.1 - i * 0.15), size * 0.18, 0);
                group.add(ridge);
            }
            
            // Powerful claws
            const clawArmGeom = new THREE.CylinderGeometry(size * 0.08, size * 0.06, size * 0.35, 8);
            const clawArmL = new THREE.Mesh(clawArmGeom, mat);
            clawArmL.rotation.z = Math.PI / 2 - 0.4;
            clawArmL.position.set(size * 0.5, size * 0.05, size * 0.4);
            group.add(clawArmL);
            
            // Pincer (two parts)
            const pincerTopGeom = new THREE.BoxGeometry(size * 0.25, size * 0.08, size * 0.15);
            const pincerTop = new THREE.Mesh(pincerTopGeom, mat);
            pincerTop.position.set(size * 0.75, size * 0.1, size * 0.5);
            pincerTop.rotation.z = 0.2;
            group.add(pincerTop);
            const pincerBot = pincerTop.clone();
            pincerBot.position.y = size * 0.0;
            pincerBot.rotation.z = -0.2;
            group.add(pincerBot);
            
            // Mirror claws for right side
            const clawArmR = clawArmL.clone();
            clawArmR.position.z = -size * 0.4;
            group.add(clawArmR);
            const pincerTopR = pincerTop.clone();
            pincerTopR.position.z = -size * 0.5;
            group.add(pincerTopR);
            const pincerBotR = pincerBot.clone();
            pincerBotR.position.z = -size * 0.5;
            group.add(pincerBotR);
            
            // Walking legs (4 pairs)
            for (let i = 0; i < 4; i++) {
                const legLen = size * (0.35 - i * 0.04);
                const legGeom = new THREE.CylinderGeometry(size * 0.035, size * 0.02, legLen, 6);
                const legL = new THREE.Mesh(legGeom, mat);
                legL.rotation.z = 1.0 + i * 0.1;
                legL.position.set(size * (0.15 - i * 0.18), -size * 0.08, size * 0.48);
                legL.userData.isLeg = true;
                group.add(legL);
                
                const legR = legL.clone();
                legR.position.z = -size * 0.48;
                legR.rotation.z = -1.0 - i * 0.1;
                group.add(legR);
            }
            
            // Eye stalks
            const stalkGeom = new THREE.CylinderGeometry(size * 0.035, size * 0.03, size * 0.15, 6);
            const stalkL = new THREE.Mesh(stalkGeom, mat);
            stalkL.position.set(size * 0.25, size * 0.22, size * 0.15);
            group.add(stalkL);
            const stalkR = stalkL.clone();
            stalkR.position.z = -size * 0.15;
            group.add(stalkR);
            
            // Eyes on stalks
            const eyeGeom = new THREE.SphereGeometry(size * 0.055, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
            const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
            eyeL.position.set(size * 0.25, size * 0.32, size * 0.15);
            group.add(eyeL);
            const eyeR = eyeL.clone();
            eyeR.position.z = -size * 0.15;
            group.add(eyeR);
        }
        // ========== DEFAULT FISH (ENHANCED) ==========
        else {
            // Streamlined body
            const bodyGeom = new THREE.SphereGeometry(size * 0.42, 18, 14);
            bodyGeom.scale(2.3, 0.85, 0.55);
            const body = new THREE.Mesh(bodyGeom, mat);
            group.add(body);
            
            // Accent stripe/pattern
            const stripeGeom = new THREE.SphereGeometry(size * 0.38, 14, 10);
            stripeGeom.scale(2.0, 0.4, 0.5);
            const stripe = new THREE.Mesh(stripeGeom, accentMat);
            stripe.position.y = size * 0.05;
            group.add(stripe);
            
            // Elegant tail fin
            const tailShape = new THREE.Shape();
            tailShape.moveTo(0, 0);
            tailShape.quadraticCurveTo(-size * 0.4, size * 0.35, -size * 0.5, size * 0.5);
            tailShape.lineTo(-size * 0.35, 0);
            tailShape.quadraticCurveTo(-size * 0.4, -size * 0.35, -size * 0.5, -size * 0.5);
            tailShape.lineTo(0, 0);
            const tailGeom = new THREE.ExtrudeGeometry(tailShape, { depth: size * 0.03, bevelEnabled: false });
            const tail = new THREE.Mesh(tailGeom, mat);
            tail.position.set(-size * 0.85, 0, -size * 0.015);
            tail.userData.isTail = true;
            group.add(tail);
            
            // Dorsal fin
            const dorsalShape = new THREE.Shape();
            dorsalShape.moveTo(0, 0);
            dorsalShape.quadraticCurveTo(size * 0.1, size * 0.35, -size * 0.15, size * 0.4);
            dorsalShape.lineTo(-size * 0.3, 0);
            const dorsalGeom = new THREE.ExtrudeGeometry(dorsalShape, { depth: size * 0.02, bevelEnabled: false });
            const dorsal = new THREE.Mesh(dorsalGeom, mat);
            dorsal.position.set(size * 0.1, size * 0.28, -size * 0.01);
            group.add(dorsal);
            
            // Pectoral fins
            const pectoralGeom = new THREE.ConeGeometry(size * 0.08, size * 0.3, 4);
            const pectoralL = new THREE.Mesh(pectoralGeom, mat);
            pectoralL.rotation.set(0.3, 0.4, Math.PI / 2 + 0.4);
            pectoralL.position.set(size * 0.35, -size * 0.1, size * 0.25);
            group.add(pectoralL);
            const pectoralR = pectoralL.clone();
            pectoralR.position.z = -size * 0.25;
            pectoralR.rotation.y = -0.4;
            group.add(pectoralR);
            
            // Anal fin
            const analGeom = new THREE.ConeGeometry(size * 0.06, size * 0.18, 4);
            const anal = new THREE.Mesh(analGeom, mat);
            anal.position.set(-size * 0.4, -size * 0.28, 0);
            anal.rotation.x = 0.3;
            group.add(anal);
            
            // Expressive eyes with highlights
            const eyeWhiteGeom = new THREE.SphereGeometry(size * 0.1, 10, 10);
            const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const eyeWhiteL = new THREE.Mesh(eyeWhiteGeom, eyeWhiteMat);
            eyeWhiteL.position.set(size * 0.6, size * 0.1, size * 0.18);
            group.add(eyeWhiteL);
            const eyeWhiteR = eyeWhiteL.clone();
            eyeWhiteR.position.z = -size * 0.18;
            group.add(eyeWhiteR);
            
            // Pupils
            const pupilGeom = new THREE.SphereGeometry(size * 0.055, 8, 8);
            const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
            const pupilL = new THREE.Mesh(pupilGeom, pupilMat);
            pupilL.position.set(size * 0.66, size * 0.1, size * 0.18);
            group.add(pupilL);
            const pupilR = pupilL.clone();
            pupilR.position.z = -size * 0.18;
            group.add(pupilR);
            
            // Eye highlights
            const highlightGeom = new THREE.SphereGeometry(size * 0.025, 6, 6);
            const highlightMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            const highlightL = new THREE.Mesh(highlightGeom, highlightMat);
            highlightL.position.set(size * 0.64, size * 0.13, size * 0.2);
            group.add(highlightL);
            const highlightR = highlightL.clone();
            highlightR.position.z = -size * 0.2;
            group.add(highlightR);
            
            // Mouth
            const mouthGeom = new THREE.TorusGeometry(size * 0.06, size * 0.015, 6, 8, Math.PI);
            const mouthMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
            const mouth = new THREE.Mesh(mouthGeom, mouthMat);
            mouth.rotation.y = Math.PI / 2;
            mouth.rotation.x = Math.PI;
            mouth.position.set(size * 0.78, -size * 0.02, 0);
            group.add(mouth);
        }
        
        // ========== GLOW EFFECT FOR DEEP SEA CREATURES ==========
        if (fishType.glow && creatureType !== CREATURE_TYPES.COIN) {
            // Multi-layer ethereal glow
            [1.0, 1.3, 1.6].forEach((scale, i) => {
                const glowGeom = new THREE.SphereGeometry(size * scale, 14, 14);
                const glowMat = new THREE.MeshBasicMaterial({
                    color: fishType.color,
                    transparent: true,
                    opacity: 0.18 - i * 0.04,
                    side: THREE.BackSide
                });
                group.add(new THREE.Mesh(glowGeom, glowMat));
            });
        }
        
        // Flip direction for right-to-left swimming
        if (!fromLeft && creatureType !== CREATURE_TYPES.COIN) {
            group.scale.x = -1;
        }
        
        return group;
    }, []);
    
    // Spawn fish in a horizontal lane at a specific depth
    // CUMULATIVE SPAWNING: All fish from unlocked tiers can appear!
    // Creates streams with GUARANTEED gaps for player to pass through
    const spawnLane = useCallback((laneDepth) => {
        if (!sceneRef.current) return;
        if (spawnedLanesRef.current.has(laneDepth)) return;
        
        spawnedLanesRef.current.add(laneDepth);
        
        // Generate fish pool on first spawn if not yet created
        if (!gameFishPoolRef.current) {
            gameFishPoolRef.current = generateGameFishPool();
        }
        
        // Get ALL available fish at this depth (cumulative!)
        const availableFish = getAvailableFishAtDepth(laneDepth, gameFishPoolRef.current);
        if (availableFish.length === 0) return;
        
        // Lane direction - random
        const fromLeft = Math.random() > 0.5;
        
        // Speed scales with depth
        const depthProgress = laneDepth / GAME_CONFIG.WATER_DEPTH;
        const baseSpeed = GAME_CONFIG.FISH_SPEED_MIN + 
            Math.random() * (GAME_CONFIG.FISH_SPEED_MAX - GAME_CONFIG.FISH_SPEED_MIN);
        const laneSpeed = baseSpeed * (1 + depthProgress * 0.4);
        
        // Small depth variation
        const depthOffset = (Math.random() - 0.5) * 2;
        const actualDepth = laneDepth + depthOffset;
        
        // ========== DENSITY INCREASES WITH DEPTH (more fish types = more density) ==========
        // More available fish types = longer streams with more variety
        const tierCount = Math.min(10, Math.floor(laneDepth / 100) + 1);
        const densityMultiplier = 1 + (tierCount - 1) * 0.15; // Up to 2.35x at max depth
        
        // Stream length scales with depth and tier count
        const streamLength = (40 + depthProgress * 50) * densityMultiplier;
        
        // Gaps: passable but tighter with depth
        const minGap = Math.max(3.0, 4.5 - depthProgress * 1.5);
        const maxGap = Math.max(4.5, 9 - depthProgress * 4);
        
        let currentPos = 0;
        const fishPositions = [];
        
        // Place fish along the stream with gaps
        while (currentPos < streamLength) {
            // Weight selection toward higher tier fish (rarer but more valuable)
            let selectedFish;
            if (Math.random() < 0.3 && availableFish.length > 1) {
                // 30% chance: pick from higher tiers (more valuable)
                const highTierFish = availableFish.filter(f => f.tier >= Math.max(1, tierCount - 2));
                selectedFish = highTierFish[Math.floor(Math.random() * highTierFish.length)] || availableFish[0];
            } else {
                // 70% chance: any available fish
                selectedFish = availableFish[Math.floor(Math.random() * availableFish.length)];
            }
            
            // Size scales slightly with depth
            const sizeBonus = 1 + depthProgress * 0.25;
            const effectiveSize = selectedFish.size * sizeBonus;
            const fishWidth = effectiveSize * 2.2;
            
            fishPositions.push({
                pos: currentPos,
                type: selectedFish,
                effectiveSize,
                width: fishWidth
            });
            
            // Gap to next fish
            const gap = minGap + Math.random() * (maxGap - minGap);
            currentPos += fishWidth + gap;
        }
        
        // ========== SPAWN JELLYFISH HAZARDS (always, small, numerous) ==========
        // 40% chance per lane, more likely deeper
        const jellyChance = 0.4 + depthProgress * 0.3;
        if (Math.random() < jellyChance && fishPositions.length > 0) {
            const jellyCount = 1 + Math.floor(Math.random() * 2); // 1-2 jellies per lane
            for (let j = 0; j < jellyCount; j++) {
                const jellyType = JELLYFISH_HAZARDS[Math.floor(Math.random() * JELLYFISH_HAZARDS.length)];
                
                // Place in a gap
                if (fishPositions.length > 1) {
                    const gapIndex = Math.floor(Math.random() * (fishPositions.length - 1));
                    const gapStart = fishPositions[gapIndex].pos + fishPositions[gapIndex].width;
                    const gapEnd = fishPositions[gapIndex + 1]?.pos || gapStart + 4;
                    const jellyPos = gapStart + (gapEnd - gapStart) * (0.3 + Math.random() * 0.4);
                    
                    const jellyGroup = createFishMesh({ ...jellyType, size: jellyType.size * 0.8 }, fromLeft);
                    let jellyX = fromLeft 
                        ? -GAME_CONFIG.HOOK_MAX_X - 20 - jellyPos 
                        : GAME_CONFIG.HOOK_MAX_X + 20 + jellyPos;
                    
                    // Slight vertical offset so they're not exactly in line
                    const jellyDepthOffset = (Math.random() - 0.5) * 1.5;
                    jellyGroup.position.set(jellyX, -actualDepth + jellyDepthOffset, 0);
                    
                    jellyGroup.userData = {
                        type: jellyType,
                        speed: (fromLeft ? 1 : -1) * (laneSpeed * 0.6), // Slower than fish
                        fromLeft,
                        laneDepth: actualDepth + jellyDepthOffset,
                        creatureType: 'jellyfish',
                        bodyScale: GAME_CONFIG.BODY_HITBOX_SCALES.jellyfish,
                        isGameFish: true,
                        isJellyfish: true, // Mark as jellyfish hazard
                        swimPhase: Math.random() * Math.PI * 2,
                        bobOffset: Math.random() * Math.PI * 2,
                        bobSpeed: 0.6 + Math.random() * 0.4,
                        pulsePhase: Math.random() * Math.PI * 2,
                        pulseSpeed: 1.5 + Math.random() * 0.5
                    };
                    
                    sceneRef.current.add(jellyGroup);
                    fishMeshesRef.current.push(jellyGroup);
                }
            }
        }
        
        // ========== SPAWN COIN (20% chance, max 3 per game, only if gap exists) ==========
        if (coinsSpawnedRef.current < MAX_COINS_PER_GAME && Math.random() < 0.20 && fishPositions.length > 1) {
            coinsSpawnedRef.current++;
            
            // Pick a random gap
            const gapIndex = Math.floor(Math.random() * (fishPositions.length - 1));
            const gapStart = fishPositions[gapIndex].pos + fishPositions[gapIndex].width;
            const gapEnd = fishPositions[gapIndex + 1]?.pos || gapStart + 5;
            const coinPos = gapStart + (gapEnd - gapStart) / 2;
            
            // Random pickup type (coin, pearl, treasure chest, or speed bubble)
            const selectedPickup = getRandomPickup();
            
            const coinGroup = createFishMesh(selectedPickup, fromLeft);
            const coinX = fromLeft 
                ? -GAME_CONFIG.HOOK_MAX_X - 25 - coinPos 
                : GAME_CONFIG.HOOK_MAX_X + 25 + coinPos;
            
            coinGroup.position.set(coinX, -actualDepth, 0);
            coinGroup.userData = {
                type: selectedPickup,
                speed: fromLeft ? laneSpeed : -laneSpeed,
                fromLeft,
                laneDepth: actualDepth,
                creatureType: 'coin',
                bodyScale: GAME_CONFIG.BODY_HITBOX_SCALES.coin,
                isGameFish: true,
                isPickup: true,
                isTreasure: selectedPickup.isTreasure,
                isSpeedBoost: selectedPickup.isSpeedBoost,
                isPearl: selectedPickup.isPearl,
                swimPhase: 0,
                bobOffset: Math.random() * Math.PI * 2,
                bobSpeed: selectedPickup.isTreasure ? 1.0 : 1.5,
                spinSpeed: selectedPickup.isTreasure ? 1.5 : 2.0
            };
            
            sceneRef.current.add(coinGroup);
            fishMeshesRef.current.push(coinGroup);
        }
        
        // ========== CREATE FISH MESHES ==========
        const startOffset = 18 + Math.random() * 12;
        
        fishPositions.forEach((fishData) => {
            const fishGroup = createFishMesh({ ...fishData.type, size: fishData.effectiveSize }, fromLeft);
            
            const fishX = fromLeft 
                ? -GAME_CONFIG.HOOK_MAX_X - startOffset - fishData.pos 
                : GAME_CONFIG.HOOK_MAX_X + startOffset + fishData.pos;
            
            const zOffset = (Math.random() - 0.5) * 1.0;
            fishGroup.position.set(fishX, -actualDepth, zOffset);
            
            // Get body-type-specific animation parameters
            const creatureType = fishData.type.type || 'fish';
            const bodyScale = GAME_CONFIG.BODY_HITBOX_SCALES[creatureType] || 
                              GAME_CONFIG.BODY_HITBOX_SCALES.fish;
            
            fishGroup.userData = {
                type: fishData.type,
                speed: fromLeft ? laneSpeed : -laneSpeed,
                fromLeft,
                laneDepth: actualDepth,
                creatureType,
                bodyScale,
                isGameFish: true,
                // Enhanced animation parameters per body type
                swimPhase: Math.random() * Math.PI * 2,
                bobOffset: Math.random() * Math.PI * 2,
                bobSpeed: creatureType === 'jellyfish' ? 0.6 : 
                          creatureType === 'whale' ? 0.15 :
                          creatureType === 'crab' ? 0.1 :
                          0.25 + Math.random() * 0.25,
                tailWagSpeed: creatureType === 'shark' ? 8 :
                              creatureType === 'eel' ? 3 :
                              creatureType === 'fish' ? 6 : 5,
                tailWagAmount: creatureType === 'shark' ? 0.25 :
                               creatureType === 'eel' ? 0.5 :
                               creatureType === 'fish' ? 0.4 : 0.3,
                finPhase: Math.random() * Math.PI * 2,
                pulsePhase: Math.random() * Math.PI * 2
            };
            
            sceneRef.current.add(fishGroup);
            fishMeshesRef.current.push(fishGroup);
        });
    }, [createFishMesh]);
    
    // Check collision - Body-type-aware hitboxes for proper catching
    // The worm/hook touching ANY part of the fish triggers a catch
    const checkCollision = useCallback((hookX, hookDepth) => {
        // Calculate worm tip position (extends below hook)
        const wormTipDepth = hookDepth + 1.5; // Worm hangs ~1.5 units below hook center
        
        for (const fish of fishMeshesRef.current) {
            if (!fish.userData.isGameFish) continue;
            
            const fishDepth = fish.userData.laneDepth;
            const creatureType = fish.userData.type?.type || 'fish';
            const fishSize = fish.userData.type?.size || 1;
            
            // Get body-type-specific hitbox scales
            const bodyScale = GAME_CONFIG.BODY_HITBOX_SCALES[creatureType] || 
                              GAME_CONFIG.BODY_HITBOX_SCALES.fish;
            
            // Calculate actual hitbox dimensions based on size and body type
            const hitboxWidth = fishSize * bodyScale.width;
            const hitboxHeight = GAME_CONFIG.BASE_HITBOX_HEIGHT * bodyScale.height * (fishSize / 1.5);
            
            // Check vertical collision - consider both hook center and worm tip
            const depthDiffHook = Math.abs(hookDepth - fishDepth);
            const depthDiffWorm = Math.abs(wormTipDepth - fishDepth);
            const minDepthDiff = Math.min(depthDiffHook, depthDiffWorm);
            
            if (minDepthDiff > hitboxHeight) continue;
            
            // Check horizontal collision - hook + worm radius overlaps fish body
            const fishX = fish.position.x;
            const dx = Math.abs(hookX - fishX);
            
            // Collision when hook/worm enters fish's body area
            if (dx < hitboxWidth / 2 + GAME_CONFIG.HOOK_HITBOX_RADIUS) {
                return fish;
            }
        }
        return null;
    }, []);
    
    // Game loop
    const gameLoop = useCallback((timestamp) => {
        if (!gameStateRef.current?.isPlaying) return;
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        
        const state = gameStateRef.current;
        const now = timestamp || performance.now();
        const deltaTime = Math.min((now - lastTimeRef.current) / 1000, 0.05);
        lastTimeRef.current = now;
        
        // ========== SMOOTH PLAYER MOVEMENT ==========
        const moveDir = (inputRef.current.left ? -1 : 0) + (inputRef.current.right ? 1 : 0);
        
        // Speed boost multiplier (1.75x when active)
        const speedMultiplier = (speedBoostRef.current > Date.now()) ? 1.75 : 1.0;
        const maxSpeed = GAME_CONFIG.HOOK_MAX_SPEED * speedMultiplier;
        const acceleration = GAME_CONFIG.HOOK_ACCELERATION * speedMultiplier;
        
        if (moveDir !== 0) {
            // Accelerate in input direction (faster with speed boost!)
            velocityRef.current += moveDir * acceleration * deltaTime;
            // Clamp to max speed
            velocityRef.current = Math.max(-maxSpeed, Math.min(maxSpeed, velocityRef.current));
        } else {
            // Apply friction when no input
            velocityRef.current *= GAME_CONFIG.HOOK_FRICTION;
            // Stop completely when very slow
            if (Math.abs(velocityRef.current) < 0.1) velocityRef.current = 0;
        }
        
        // Update position with velocity
        state.hookX += velocityRef.current * deltaTime;
        state.hookX = Math.max(-GAME_CONFIG.HOOK_MAX_X, Math.min(GAME_CONFIG.HOOK_MAX_X, state.hookX));
        
        // Bounce off edges
        if (Math.abs(state.hookX) >= GAME_CONFIG.HOOK_MAX_X) {
            velocityRef.current *= -0.3; // Soft bounce
        }
        
        // ========== DESCENT - constant falling ==========
        state.depth += GAME_CONFIG.DESCENT_SPEED * deltaTime;
        
        // Update UI
        const displayDepth = Math.floor(state.depth);
        if (displayDepth !== depth) {
            setDepth(displayDepth);
        }
        
        const zone = getZone(state.depth);
        setCurrentZone(zone); // React will optimize if same value
        
        // ========== SPAWN FISH LANES ahead of player ==========
        const currentLane = Math.floor(state.depth / GAME_CONFIG.LANE_SPACING);
        for (let i = 1; i <= GAME_CONFIG.LANE_LOOKAHEAD; i++) {
            const laneDepth = (currentLane + i) * GAME_CONFIG.LANE_SPACING;
            if (laneDepth <= GAME_CONFIG.WATER_DEPTH) {
                spawnLane(laneDepth);
            }
        }
        
        // ========== UPDATE HOOK POSITION ==========
        if (hookGroupRef.current) {
            hookGroupRef.current.position.x = state.hookX;
            hookGroupRef.current.position.y = -state.depth;
            hookGroupRef.current.position.z = 0; // On the play plane
            
            // Smooth tilt based on velocity (more natural)
            const tiltAmount = (velocityRef.current / GAME_CONFIG.HOOK_MAX_SPEED) * 0.25;
            hookGroupRef.current.rotation.z = tiltAmount;
            
            // Worm wiggle animation - follows hook movement
            const wormGroup = hookGroupRef.current.userData.wormGroup;
            if (wormGroup) {
                wormGroup.children.forEach((seg, i) => {
                    const phase = now * 0.01 + i * 0.5;
                    const velocityInfluence = velocityRef.current * 0.02;
                    seg.position.x = Math.sin(phase) * 0.12 * (1 + i * 0.15) - velocityInfluence * i * 0.1;
                });
            }
            
            // Glow intensity increases with depth
            const glow = hookGroupRef.current.userData.glow;
            if (glow) {
                glow.material.opacity = 0.15 + (state.depth / GAME_CONFIG.WATER_DEPTH) * 0.25;
            }
        }
        
        // ========== CAMERA - behind and above, looking down at fish lanes ==========
        if (cameraRef.current) {
            cameraRef.current.position.x = state.hookX * 0.3;
            cameraRef.current.position.y = -state.depth + 12; // Above the hook
            cameraRef.current.position.z = 15; // Behind
            // Look ahead and down to see the fish lanes below
            cameraRef.current.lookAt(state.hookX * 0.2, -state.depth - 15, 0);
        }
        
        // ========== ATMOSPHERE ==========
        const depthProgress = state.depth / zone.maxDepth;
        const topColor = new THREE.Color(zone.bgTop);
        const bottomColor = new THREE.Color(zone.bgBottom);
        sceneRef.current.background = topColor.clone().lerp(bottomColor, Math.min(depthProgress, 1));
        sceneRef.current.fog.color = sceneRef.current.background;
        sceneRef.current.fog.density = zone.fogDensity;
        
        if (ambientLightRef.current) {
            ambientLightRef.current.intensity = zone.lightIntensity * 0.8;
        }
        
        // ========== UPDATE BUBBLES ==========
        particlesRef.current.forEach(p => {
            p.position.y += p.userData.riseSpeed * deltaTime * 60;
            p.position.x += Math.sin(now * 0.003 + p.userData.wobbleOffset) * 0.02;
            
            if (p.position.y > -state.depth + 20) {
                p.position.y = -state.depth - 40 - Math.random() * 30;
                p.position.x = (Math.random() - 0.5) * 30;
                p.position.z = (Math.random() - 0.5) * 10;
            }
        });
        
        // ========== UPDATE FISH - High quality procedural animations ==========
        fishMeshesRef.current = fishMeshesRef.current.filter(fish => {
            // Move fish horizontally
            fish.position.x += fish.userData.speed * deltaTime;
            
            const creatureType = fish.userData.creatureType || 'fish';
            const swimPhase = now * 0.008 + fish.userData.swimPhase;
            const finPhase = now * 0.012 + (fish.userData.finPhase || 0);
            const pulsePhase = now * 0.005 + (fish.userData.pulsePhase || 0);
            
            // ========== CREATURE-SPECIFIC ANIMATIONS ==========
            switch (creatureType) {
                case 'jellyfish':
                    // Pulsating bell movement
                    const pulse = Math.sin(pulsePhase * (fish.userData.pulseSpeed || 1.5));
                    const bobJelly = Math.sin(now * 0.002 * fish.userData.bobSpeed + fish.userData.bobOffset) * 0.5;
                    fish.position.y = -fish.userData.laneDepth + bobJelly + pulse * 0.15;
                    
                    // Bell contraction animation
                    fish.scale.x = 1 + pulse * 0.1;
                    fish.scale.y = 1 - pulse * 0.15;
                    
                    // Gentle drift rotation
                    fish.rotation.z = Math.sin(swimPhase * 0.5) * 0.1;
                    
                    // Animate tentacles
                    fish.children.forEach(child => {
                        if (child.userData?.isTentacle) {
                            const tentIdx = child.userData.tentIndex || 0;
                            child.rotation.x = 0.2 + Math.sin(swimPhase + tentIdx * 0.5) * 0.3;
                            child.rotation.z = Math.sin(swimPhase * 0.8 + tentIdx) * 0.2;
                        }
                        if (child.userData?.isPulseGlow) {
                            child.material.opacity = 0.15 + Math.abs(pulse) * 0.2;
                            child.scale.setScalar(1 + Math.abs(pulse) * 0.15);
                        }
                    });
                    break;
                    
                case 'squid':
                    // Jet propulsion undulation
                    const jetPhase = now * 0.015;
                    fish.position.y = -fish.userData.laneDepth + Math.sin(jetPhase + fish.userData.bobOffset) * 0.4;
                    fish.rotation.z = Math.sin(swimPhase * 0.7) * 0.12;
                    
                    // Tentacle wave animation
                    fish.children.forEach(child => {
                        if (child.userData?.isTentacle) {
                            const tentIdx = child.userData.tentIndex || 0;
                            const waveOffset = tentIdx * 0.3;
                            child.rotation.z = child.rotation.z + Math.sin(swimPhase * 3 + waveOffset) * 0.15;
                            child.rotation.x = Math.sin(swimPhase * 2 + waveOffset) * 0.1;
                        }
                    });
                    break;
                    
                case 'shark':
                    // Powerful side-to-side tail thrust
                    const sharkBob = Math.sin(now * 0.002 * fish.userData.bobSpeed + fish.userData.bobOffset) * 0.2;
                    fish.position.y = -fish.userData.laneDepth + sharkBob;
                    
                    // Subtle body undulation
                    fish.rotation.z = Math.sin(swimPhase * 0.6) * 0.04;
                    fish.rotation.y = Math.sin(swimPhase * 1.2) * 0.05;
                    
                    // Aggressive tail wag
                    fish.children.forEach(child => {
                        if (child.userData?.isTail) {
                            child.rotation.y = Math.sin(swimPhase * (fish.userData.tailWagSpeed || 8)) * (fish.userData.tailWagAmount || 0.25);
                        }
                    });
                    break;
                    
                case 'eel':
                    // Serpentine body wave
                    const eelBob = Math.sin(now * 0.0015 * fish.userData.bobSpeed + fish.userData.bobOffset) * 0.3;
                    fish.position.y = -fish.userData.laneDepth + eelBob;
                    
                    // S-curve body animation
                    fish.rotation.z = Math.sin(swimPhase * 0.5) * 0.15;
                    
                    // Animate body segments
                    fish.children.forEach(child => {
                        if (child.userData?.isSegment) {
                            const segIdx = child.userData.segIndex || 0;
                            const wavePhase = swimPhase * 3 - segIdx * 0.5;
                            child.position.y = Math.sin(wavePhase) * 0.1;
                            child.position.z = Math.sin(wavePhase) * 0.15;
                        }
                    });
                    break;
                    
                case 'whale':
                    // Majestic slow undulation
                    const whaleBob = Math.sin(now * 0.001 + fish.userData.bobOffset) * 0.6;
                    fish.position.y = -fish.userData.laneDepth + whaleBob;
                    
                    // Gentle roll
                    fish.rotation.z = Math.sin(swimPhase * 0.3) * 0.03;
                    
                    // Slow powerful tail movement
                    fish.children.forEach(child => {
                        if (child.userData?.isTail) {
                            child.rotation.y = Math.sin(swimPhase * 2) * 0.2;
                        }
                    });
                    break;
                    
                case 'crab':
                    // Sideways scuttle movement
                    const scuttlePhase = now * 0.02;
                    const crabBob = Math.sin(scuttlePhase * 2 + fish.userData.bobOffset) * 0.1;
                    fish.position.y = -fish.userData.laneDepth + crabBob;
                    
                    // Body tilt while moving
                    fish.rotation.z = Math.sin(scuttlePhase) * 0.08;
                    
                    // Animate legs
                    fish.children.forEach(child => {
                        if (child.userData?.isLeg) {
                            child.rotation.z += Math.sin(scuttlePhase * 8) * 0.1;
                        }
                    });
                    break;
                    
                case 'turtle':
                    // Graceful glide with flipper strokes
                    const turtleBob = Math.sin(now * 0.002 + fish.userData.bobOffset) * 0.35;
                    fish.position.y = -fish.userData.laneDepth + turtleBob;
                    
                    // Slow body rotation
                    fish.rotation.z = Math.sin(swimPhase * 0.4) * 0.06;
                    
                    // Flipper animation
                    fish.children.forEach(child => {
                        if (child.userData?.isFlipper) {
                            child.rotation.z = 0.3 + Math.sin(finPhase * 2) * 0.4;
                        }
                    });
                    break;
                    
                case 'angler':
                    // Lurking movement with lure dance
                    const anglerBob = Math.sin(now * 0.0025 + fish.userData.bobOffset) * 0.25;
                    fish.position.y = -fish.userData.laneDepth + anglerBob;
                    
                    // Slight menacing tilt
                    fish.rotation.z = Math.sin(swimPhase * 0.5) * 0.08;
                    
                    // Lure sway animation (handled by glow meshes)
                    break;
                    
                case 'coin':
                    // Floating coin with spin
                    const coinBob = Math.sin(now * 0.004 * fish.userData.bobSpeed + fish.userData.bobOffset) * 0.3;
                    fish.position.y = -fish.userData.laneDepth + coinBob;
                    
                    // Continuous spin
                    fish.rotation.y = now * 0.003 * (fish.userData.spinSpeed || 2);
                    
                    // Sparkle pulse
                    fish.children.forEach(child => {
                        if (child.material?.transparent) {
                            child.material.opacity = 0.15 + Math.sin(now * 0.01) * 0.1;
                        }
                    });
                    break;
                    
                default: // Standard fish
                    // Natural swimming motion
                    const bobAmount = Math.sin(now * 0.003 * fish.userData.bobSpeed + fish.userData.bobOffset) * 0.3;
                    fish.position.y = -fish.userData.laneDepth + bobAmount;
                    
                    // Body flexion while swimming
                    fish.rotation.z = Math.sin(swimPhase) * 0.08;
                    fish.rotation.y = Math.sin(swimPhase * 0.5) * 0.03;
                    
                    // Tail and fin animation
                    fish.children.forEach(child => {
                        if (child.userData?.isTail) {
                            child.rotation.y = Math.sin(swimPhase * (fish.userData.tailWagSpeed || 6)) * (fish.userData.tailWagAmount || 0.4);
                        }
                    });
            }
            
            // ========== GLOW PULSE FOR DEEP SEA CREATURES ==========
            if (fish.userData.type?.glow && creatureType !== 'coin') {
                fish.children.forEach(child => {
                    if (child.material?.emissive) {
                        const glowPulse = 0.5 + Math.sin(now * 0.004 + fish.userData.swimPhase) * 0.3;
                        child.material.emissiveIntensity = glowPulse;
                    }
                });
            }
            
            // Remove fish that have swum off screen
            if (Math.abs(fish.position.x) > GAME_CONFIG.HOOK_MAX_X + 35) {
                sceneRef.current.remove(fish);
                fish.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose?.();
                });
                return false;
            }
            
            // Remove fish in lanes far above player (already passed)
            const fishLaneDepth = fish.userData.laneDepth;
            if (state.depth - fishLaneDepth > 50) {
                sceneRef.current.remove(fish);
                fish.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose?.();
                });
                return false;
            }
            
            return true;
        });
        
        // Check collision
        const hitFish = checkCollision(state.hookX, state.depth);
        if (hitFish && !gameEndingRef.current) {
            // ========== PICKUP COLLECTION - Add coins/effects and continue! ==========
            if (hitFish.userData.isPickup) {
                // Collect the pickup
                const coinValue = hitFish.userData.type.coins;
                collectedCoinsRef.current += coinValue;
                setCollectedCoins(collectedCoinsRef.current);
                
                // Speed boost effect!
                if (hitFish.userData.isSpeedBoost) {
                    speedBoostRef.current = Date.now() + 5000; // 5 second speed boost
                    setHasSpeedBoost(true);
                    setTimeout(() => setHasSpeedBoost(false), 5000);
                }
                
                // Treasure chest celebration!
                if (hitFish.userData.isTreasure) {
                    setTreasureFound(true);
                    setTimeout(() => setTreasureFound(false), 1500);
                }
                
                // Pearl found!
                if (hitFish.userData.isPearl) {
                    setPearlFound(true);
                    setTimeout(() => setPearlFound(false), 1000);
                }
                
                // Remove the pickup from the game
                sceneRef.current.remove(hitFish);
                hitFish.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose?.();
                });
                fishMeshesRef.current = fishMeshesRef.current.filter(f => f !== hitFish);
                
                // Don't end the game - continue playing!
            } else {
                // ========== CAUGHT A CREATURE (or JELLYFISH!) - Start end animation ==========
                gameEndingRef.current = true;
                state.caughtFish = hitFish.userData.type;
                
                // Check if jellyfish hazard (stung!) vs regular fish catch
                const isJellyfish = hitFish.userData.isJellyfish || 
                    hitFish.userData.type.type === CREATURE_TYPES.JELLYFISH;
                
                // Start smooth slowdown animation
                const endAnimation = () => {
                    // Slow descent to a stop over 1 second
                    let animProgress = 0;
                    const animDuration = 1000;
                    const animStart = performance.now();
                    const originalSpeed = GAME_CONFIG.DESCENT_SPEED;
                    
                    const animate = () => {
                        const now = performance.now();
                        animProgress = Math.min((now - animStart) / animDuration, 1);
                        
                        // Ease out - slow to a stop
                        const easeOut = 1 - Math.pow(1 - animProgress, 3);
                        GAME_CONFIG.DESCENT_SPEED = originalSpeed * (1 - easeOut);
                        
                        // Continue descent but slowing
                        if (animProgress < 1 && rendererRef.current && sceneRef.current) {
                            state.depth += GAME_CONFIG.DESCENT_SPEED * 0.016;
                            if (hookGroupRef.current) {
                                hookGroupRef.current.position.y = -state.depth;
                            }
                            if (cameraRef.current) {
                                cameraRef.current.position.y = -state.depth + 12;
                                cameraRef.current.lookAt(state.hookX * 0.2, -state.depth - 15, 0);
                            }
                            rendererRef.current.render(sceneRef.current, cameraRef.current);
                            requestAnimationFrame(animate);
                        } else {
                            // Animation complete - show result
                            GAME_CONFIG.DESCENT_SPEED = originalSpeed; // Reset speed
                            state.isPlaying = false;
                            setCaughtFish(hitFish.userData.type);
                            setGamePhase(isJellyfish ? 'stung' : 'caught');
                            
                            if (onCatch) onCatch(hitFish.userData.type, collectedCoinsRef.current);
                        }
                    };
                    animate();
                };
                
                // Stop the main game loop and start end animation
                cancelAnimationFrame(animationFrameRef.current);
                endAnimation();
                return;
            }
        }
        
        // Check if hit bottom (reached max depth without catching!)
        if (state.depth >= GAME_CONFIG.WATER_DEPTH && !gameEndingRef.current) {
            gameEndingRef.current = true;
            
            // Smooth stop animation for hitting bottom
            const endAnimation = () => {
                let animProgress = 0;
                const animDuration = 800;
                const animStart = performance.now();
                const originalSpeed = GAME_CONFIG.DESCENT_SPEED;
                
                const animate = () => {
                    const now = performance.now();
                    animProgress = Math.min((now - animStart) / animDuration, 1);
                    
                    const easeOut = 1 - Math.pow(1 - animProgress, 3);
                    GAME_CONFIG.DESCENT_SPEED = originalSpeed * (1 - easeOut);
                    
                    if (animProgress < 1 && rendererRef.current && sceneRef.current) {
                        rendererRef.current.render(sceneRef.current, cameraRef.current);
                        requestAnimationFrame(animate);
                    } else {
                        GAME_CONFIG.DESCENT_SPEED = originalSpeed;
                        state.isPlaying = false;
                        setGamePhase('missed');
                        
                        if (onMiss) onMiss('hit_bottom', collectedCoinsRef.current);
                    }
                };
                animate();
            };
            
            cancelAnimationFrame(animationFrameRef.current);
            endAnimation();
            return;
        }
        
        // Render
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        
        // Continue loop
        animationFrameRef.current = requestAnimationFrame(gameLoop);
    }, [spawnLane, checkCollision, onCatch, onMiss, getZone]);
    
    // Start countdown
    useEffect(() => {
        if (gamePhase === 'intro') {
            const countdownInterval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        setGamePhase('playing');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(countdownInterval);
        }
    }, [gamePhase]);
    
    // Track if game has been initialized this session
    const gameInitializedRef = useRef(false);
    
    // Start game loop - ONLY when gamePhase changes to 'playing'
    useEffect(() => {
        // Only initialize once when phase becomes 'playing'
        if (gamePhase === 'playing' && gameStateRef.current && !gameInitializedRef.current) {
            gameInitializedRef.current = true;
            
            // Reset game state
            gameStateRef.current.isPlaying = true;
            gameStateRef.current.startTime = performance.now();
            gameStateRef.current.depth = 0;
            gameStateRef.current.hookX = 0;
            lastTimeRef.current = performance.now();
            velocityRef.current = 0;
            collectedCoinsRef.current = 0;
            setCollectedCoins(0); // Reset bonus coins
            
            // Generate new randomized fish pool for this game (1 fish per tier)
            gameFishPoolRef.current = generateGameFishPool();
            coinsSpawnedRef.current = 0; // Reset coin counter
            gameEndingRef.current = false; // Reset ending flag
            
            // Clear any existing fish and reset lane tracking
            spawnedLanesRef.current.clear();
            fishMeshesRef.current.forEach(fish => {
                sceneRef.current?.remove(fish);
            });
            fishMeshesRef.current = [];
            
            // Spawn first few lanes immediately
            for (let i = 1; i <= GAME_CONFIG.LANE_LOOKAHEAD; i++) {
                spawnLane(i * GAME_CONFIG.LANE_SPACING);
            }
            
            animationFrameRef.current = requestAnimationFrame(gameLoop);
        }
        
        // Reset the initialized flag when game ends
        if (gamePhase !== 'playing') {
            gameInitializedRef.current = false;
        }
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [gamePhase, gameLoop, spawnLane]);
    
    // Keyboard input
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                inputRef.current.left = true;
            }
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                inputRef.current.right = true;
            }
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        
        const handleKeyUp = (e) => {
            if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
                inputRef.current.left = false;
            }
            if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
                inputRef.current.right = false;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [onClose]);
    
    // Auto close after result
    useEffect(() => {
        if (gamePhase === 'caught' || gamePhase === 'missed' || gamePhase === 'stung') {
            const timer = setTimeout(() => {
                setGamePhase('ending');
                setTimeout(() => onClose?.(), 500);
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [gamePhase, onClose]);
    
    // Format depth display
    const formatDepth = (d) => {
        if (d >= 1000) return `${(d / 1000).toFixed(1)}km`;
        return `${d}m`;
    };
    
    return (
        <div className="fixed inset-0 z-[9999] bg-black overflow-hidden">
            {/* 3D Canvas Container */}
            <div ref={containerRef} className="absolute inset-0" />
            
            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Header */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
                    <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] retro-text tracking-wider">
                        🎣 ICE FISHING
                    </h1>
                    {isDemo && (
                        <span className="bg-green-500/90 px-4 py-1 rounded-full text-sm text-black font-bold mt-2 inline-block">
                            ✨ FREE DEMO
                        </span>
                    )}
                </div>
                
                {/* Depth indicator - Left side */}
                <div className="absolute top-20 left-4 bg-gradient-to-b from-blue-900/80 to-black/80 backdrop-blur-sm rounded-xl px-5 py-3 border border-blue-500/30">
                    <div className="text-blue-300 text-xs uppercase tracking-wider mb-1">Depth</div>
                    <div className="text-white text-3xl font-bold font-mono">{formatDepth(depth)}</div>
                    <div className="text-blue-400/80 text-xs mt-1">{currentZone.name}</div>
                </div>
                
                {/* Collected coins display */}
                {collectedCoins > 0 && gamePhase === 'playing' && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600/90 to-amber-500/90 backdrop-blur-sm rounded-full px-6 py-2 border-2 border-yellow-300/50 animate-pulse">
                        <div className="text-yellow-100 text-lg font-bold flex items-center gap-2">
                            <span className="text-2xl">🪙</span>
                            <span>+{collectedCoins}</span>
                        </div>
                    </div>
                )}
                
                {/* Speed Boost Active Indicator */}
                {hasSpeedBoost && gamePhase === 'playing' && (
                    <div className="absolute top-36 left-1/2 -translate-x-1/2 bg-gradient-to-r from-cyan-500/90 to-blue-500/90 backdrop-blur-sm rounded-full px-5 py-2 border-2 border-cyan-300/50 animate-bounce">
                        <div className="text-white text-sm font-bold flex items-center gap-2">
                            <span className="text-xl">💨</span>
                            <span>SPEED BOOST!</span>
                        </div>
                    </div>
                )}
                
                {/* Treasure Found Flash */}
                {treasureFound && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                        <div className="text-8xl animate-ping">🎁</div>
                        <div className="absolute text-4xl font-bold text-yellow-300 animate-bounce mt-32">+25 TREASURE!</div>
                    </div>
                )}
                
                {/* Pearl Found Flash */}
                {pearlFound && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                        <div className="text-6xl animate-ping">🦪</div>
                    </div>
                )}
                
                {/* Depth progress bar - Right side */}
                <div className="absolute top-20 right-4 w-3 h-64 bg-black/50 rounded-full border border-blue-500/30 overflow-hidden">
                    <div 
                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-full transition-all duration-100"
                        style={{ height: `${(depth / GAME_CONFIG.WATER_DEPTH) * 100}%` }}
                    />
                    {/* Zone markers */}
                    {GAME_CONFIG.ZONES.map((zone, i) => (
                        <div 
                            key={zone.name}
                            className="absolute w-full h-0.5 bg-white/30"
                            style={{ bottom: `${(zone.maxDepth / GAME_CONFIG.WATER_DEPTH) * 100}%` }}
                        />
                    ))}
                    {/* Target (bottom) */}
                    <div className="absolute bottom-0 w-full h-1 bg-yellow-500"/>
                </div>
                
                {/* Fish values hint - only at start */}
                {gamePhase === 'playing' && depth < 50 && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 text-center animate-pulse">
                        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 text-yellow-300 text-sm">
                            🐟 Find gaps between fish to descend! 🐟
                        </div>
                    </div>
                )}
                
                {/* Touch/Click controls - Always visible, centered more */}
                {gamePhase === 'playing' && (
                    <div className="absolute bottom-6 left-[15%] right-[15%] flex justify-between pointer-events-auto">
                        <button
                            className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-cyan-500/90 to-blue-600/90 rounded-2xl text-white text-4xl sm:text-5xl font-bold active:scale-90 active:bg-cyan-400 transition-all shadow-2xl border-4 border-white/40 flex items-center justify-center select-none touch-manipulation"
                            onTouchStart={() => { inputRef.current.left = true; }}
                            onTouchEnd={() => { inputRef.current.left = false; }}
                            onTouchCancel={() => { inputRef.current.left = false; }}
                            onMouseDown={() => { inputRef.current.left = true; }}
                            onMouseUp={() => { inputRef.current.left = false; }}
                            onMouseLeave={() => inputRef.current.left = false}
                        >
                            ◀
                        </button>
                        <div className="flex flex-col items-center justify-center text-white/80 text-sm px-2">
                            <span className="text-base font-bold">← →</span>
                            <span className="text-xs text-white/60">or A/D</span>
                        </div>
                        <button
                            className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-cyan-500/90 to-blue-600/90 rounded-2xl text-white text-4xl sm:text-5xl font-bold active:scale-90 active:bg-cyan-400 transition-all shadow-2xl border-4 border-white/40 flex items-center justify-center select-none touch-manipulation"
                            onTouchStart={() => { inputRef.current.right = true; }}
                            onTouchEnd={() => { inputRef.current.right = false; }}
                            onTouchCancel={() => { inputRef.current.right = false; }}
                            onMouseDown={() => { inputRef.current.right = true; }}
                            onMouseUp={() => { inputRef.current.right = false; }}
                            onMouseLeave={() => inputRef.current.right = false}
                        >
                            ▶
                        </button>
                    </div>
                )}
                
                {/* Countdown */}
                {gamePhase === 'intro' && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="text-9xl font-bold text-white animate-bounce drop-shadow-[0_0_30px_rgba(59,130,246,0.8)]">
                                {countdown}
                            </div>
                            <div className="text-2xl text-blue-300 mt-6 font-medium">Get ready to fish!</div>
                            <div className="text-gray-400 mt-2">Dodge fish • Go deep • Catch legends!</div>
                        </div>
                    </div>
                )}
                
                {/* Caught fish result */}
                {gamePhase === 'caught' && caughtFish && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="text-8xl mb-4 drop-shadow-[0_0_30px_rgba(255,215,0,0.8)] animate-bounce">
                                {caughtFish.emoji}
                            </div>
                            <div className="text-4xl font-bold text-green-400 mb-2 drop-shadow-lg">
                                🎉 CAUGHT! 🎉
                            </div>
                            <div className="text-3xl text-white mb-2 font-medium">
                                {caughtFish.name}
                            </div>
                            <div className="text-sm text-gray-400 mb-4">
                                Caught at {formatDepth(depth)}
                            </div>
                            {!isDemo && (
                                <div className="space-y-2">
                                    <div className="text-3xl text-yellow-400 font-bold drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">
                                        🐟 +{caughtFish.coins} 🪙
                                    </div>
                                    {collectedCoins > 0 && (
                                        <div className="text-2xl text-amber-300 font-bold">
                                            🪙 +{collectedCoins} bonus!
                                        </div>
                                    )}
                                    <div className="text-xl text-green-300 font-bold mt-2 pt-2 border-t border-white/20">
                                        Total: {caughtFish.coins + collectedCoins} 🪙
                                    </div>
                                </div>
                            )}
                            {isDemo && (
                                <div className="text-sm text-gray-400 mt-4 bg-black/50 rounded-lg px-4 py-2">
                                    🔑 Sign up to earn real gold!
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Stung by jellyfish result */}
                {gamePhase === 'stung' && caughtFish && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="text-8xl mb-4 drop-shadow-[0_0_30px_rgba(255,100,150,0.8)] animate-pulse">
                                {caughtFish.emoji}
                            </div>
                            <div className="text-4xl font-bold text-pink-400 mb-2 drop-shadow-lg">
                                ⚡ STUNG! ⚡
                            </div>
                            <div className="text-3xl text-white mb-2 font-medium">
                                {caughtFish.name}
                            </div>
                            <div className="text-sm text-gray-400 mb-4">
                                Stung at {formatDepth(depth)}
                            </div>
                            {!isDemo && (
                                <div className="space-y-2">
                                    <div className="text-2xl text-pink-300 font-bold">
                                        The jellyfish got you!
                                    </div>
                                    <div className="text-3xl text-yellow-400 font-bold drop-shadow-[0_0_20px_rgba(255,215,0,0.5)]">
                                        🎐 +{caughtFish.coins} 🪙
                                    </div>
                                    {collectedCoins > 0 && (
                                        <div className="text-2xl text-amber-300 font-bold">
                                            🪙 +{collectedCoins} bonus!
                                        </div>
                                    )}
                                    <div className="text-xl text-green-300 font-bold mt-2 pt-2 border-t border-white/20">
                                        Total: {caughtFish.coins + collectedCoins} 🪙
                                    </div>
                                </div>
                            )}
                            {isDemo && (
                                <div className="text-sm text-gray-400 mt-4 bg-black/50 rounded-lg px-4 py-2">
                                    🔑 Sign up to earn real gold!
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Missed result (hit bottom) */}
                {gamePhase === 'missed' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="text-8xl mb-6">🏆</div>
                            <div className="text-4xl font-bold text-yellow-400 mb-3">
                                REACHED THE BOTTOM!
                            </div>
                            <div className="text-xl text-gray-300 mb-2">
                                {formatDepth(GAME_CONFIG.WATER_DEPTH)} deep!
                            </div>
                            {collectedCoins > 0 ? (
                                <div className="text-2xl text-amber-300 font-bold mt-4">
                                    🪙 +{collectedCoins} coins collected!
                                </div>
                            ) : (
                                <div className="text-lg text-gray-500">
                                    No coins collected - try collecting gold coins next time!
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Close button */}
                <button
                    className="absolute top-4 right-4 w-12 h-12 bg-red-600/80 hover:bg-red-500 rounded-xl text-white text-2xl pointer-events-auto transition-all hover:scale-110 border border-white/20 shadow-lg"
                    onClick={onClose}
                >
                    ✕
                </button>
            </div>
        </div>
    );
}
