import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VOXEL_SIZE, PALETTE } from './constants';
import { ASSETS } from './assets';
import { generateBaseBody, generateFlippers, generateFoot, generateHead } from './generators';
import { IconSend } from './Icons';
import GameHUD from './components/GameHUD';
import Portal from './components/Portal';
import PufflePanel from './components/PufflePanel';
import GameManager from './engine/GameManager';
import Puffle from './engine/Puffle';
import TownCenter from './rooms/TownCenter';
import { useMultiplayer } from './multiplayer';

const VoxelWorld = ({ 
    penguinData, 
    room = 'town',  // Current room/layer
    onExitToDesigner, 
    onChangeRoom,
    onStartMinigame,
    playerPuffle, 
    onPuffleChange,
    customSpawnPos  // Custom spawn position (when returning from dojo/igloo)
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
        updatePuffle: mpUpdatePuffle
    } = useMultiplayer();
    
    // Refs for other player meshes and state
    const otherPlayerMeshesRef = useRef(new Map()); // playerId -> { mesh, bubble, puffle }
    const lastPositionSentRef = useRef({ x: 0, z: 0, rot: 0, time: 0 });
    const buildPenguinMeshRef = useRef(null); // Will be set in useEffect
    
    // Player State
    const posRef = useRef({ x: 0, y: 0, z: 0 });
    const velRef = useRef({ x: 0, z: 0 });
    const rotRef = useRef(0);
    const keysRef = useRef({});
    
    // Chat State
    const [chatInput, setChatInput] = useState("");
    const [activeBubble, setActiveBubble] = useState(null);
    const bubbleSpriteRef = useRef(null);
    
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

    const AI_EMOTES = ['Wave', 'Dance', 'Laugh', 'Sit'];
    
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
            const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                || ('ontouchstart' in window && window.innerWidth < 1024);
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
    const [showMobileChat, setShowMobileChat] = useState(false);
    const mobileControlsRef = useRef({ forward: false, back: false, left: false, right: false });
    const pinchRef = useRef({ startDist: 0, active: false });
    
    // Room-specific portals/doors
    // Town portal positions are OFFSETS from center (centerX/Z added in checkPortals)
    // Door positions are at the FRONT of buildings (z + d/2 + small offset)
    const ROOM_PORTALS = {
        town: [
            { 
                id: 'dojo-entrance', 
                name: 'THE DOJO', 
                emoji: '⛩️', 
                description: 'Enter the Dojo',
                targetRoom: 'dojo',
                // Dojo at (0, -25), size d=14, door at front: z = -25 + 7 + 1.5 = -16.5
                position: { x: 0, z: -16.5 },
                doorRadius: 3.5
            },
            { 
                id: 'igloo-1', 
                name: 'IGLOO', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo1',
                // Igloo 1 at (-35, 20) offset, entrance tunnel extends +5.5 in Z
                position: { x: -35, z: 25.5 },
                doorRadius: 3
            },
            { 
                id: 'igloo-2', 
                name: 'IGLOO', 
                emoji: '🏠', 
                description: 'Enter Igloo',
                targetRoom: 'igloo2',
                // Igloo 2 at (-25, 30) offset, entrance tunnel extends +5.5 in Z
                position: { x: -25, z: 35.5 },
                doorRadius: 3
            },
            { 
                id: 'market', 
                name: 'GIFT SHOP', 
                emoji: '🛒', 
                description: 'Coming Soon',
                targetRoom: null,
                // Market at (-22, -8), size d=10, door at front: z = -8 + 5 + 1.5 = -1.5
                position: { x: -22, z: -1.5 },
                doorRadius: 3
            },
            { 
                id: 'pizza', 
                name: 'PIZZA PARLOR', 
                emoji: '🍕', 
                description: 'Coming Soon',
                targetRoom: null,
                // Pizza at (25, 5), size d=10, door at front: z = 5 + 5 + 1.5 = 11.5
                position: { x: 25, z: 11.5 },
                doorRadius: 3
            }
        ],
        igloo1: [
            { 
                id: 'igloo1-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 10 },
                doorRadius: 2.5,
                // Spawn at igloo 1 entrance in town when exiting
                exitSpawnPos: { x: -35, z: 28 }
            }
        ],
        igloo2: [
            { 
                id: 'igloo2-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 10 },
                doorRadius: 2.5,
                // Spawn at igloo 2 entrance in town when exiting
                exitSpawnPos: { x: -25, z: 38 }
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
                // Spawn at dojo entrance in town when exiting
                exitSpawnPos: { x: 0, z: -14 }
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
    const BUILDINGS = [
        { 
            id: 'dojo', 
            name: 'THE DOJO', 
            emoji: '⛩️', 
            description: 'Enter to play Card Jitsu!',
            color: 0xc0392b, // Red roof
            wallColor: 0x7f8c8d,
            position: { x: 0, z: -25 },
            doorRadius: 3, // How close to door to trigger
            size: { w: 14, h: 8, d: 14 },
            roofType: 'pagoda'
        },
        { 
            id: 'market', 
            name: 'GIFT SHOP', 
            emoji: '🛒', 
            description: 'Browse hats & items (coming soon)',
            gameId: null,
            color: 0xf39c12, // Gold roof
            wallColor: 0xecf0f1,
            position: { x: -22, z: -8 },
            doorRadius: 3,
            size: { w: 10, h: 6, d: 10 },
            roofType: 'flat'
        },
        { 
            id: 'plaza', 
            name: 'PIZZA PARLOR', 
            emoji: '🍕', 
            description: 'Pizza minigame coming soon!',
            gameId: null,
            color: 0xe74c3c, // Red/orange
            wallColor: 0xf5deb3,
            position: { x: 25, z: 5 },
            doorRadius: 3,
            size: { w: 12, h: 7, d: 10 },
            roofType: 'slanted'
        }
    ];
    
    // City Generation
    const CITY_SIZE = 40; 
    const BUILDING_SCALE = 4;
    
    // Create Chat Bubble Sprite
    const createChatSprite = (message) => {
        const THREE = window.THREE;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 48;
        const padding = 20;
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        // Word Wrap Logic
        const maxLineWidth = 600; 
        const words = message.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxLineWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        
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
        
        const scale = 0.02;
        sprite.scale.set(w * scale, h * scale, 1);
        sprite.position.set(0, 4.5, 0);
        sprite.renderOrder = 999;
        
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
        
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300);
        cameraRef.current = camera;
        camera.position.set(0, 15, -15);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
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
        const ambient = new THREE.AmbientLight(0xC0E0F0, 0.5); // Cool icy ambient
        scene.add(ambient);
        
        // Hemisphere light for icy outdoor lighting (sky to ice)
        const hemiLight = new THREE.HemisphereLight(0x88B8D8, 0x6090B0, 0.4); // Icy blue gradient
        scene.add(hemiLight);
        
        const sunLight = new THREE.DirectionalLight(0xF8F8FF, 1.0); // Cold bright sun
        sunLight.position.set(80, 100, 60);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(2048, 2048);
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        scene.add(sunLight);
        
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
            
            // All tiles are now ice (type 2) - no procedural buildings
            for(let x=0; x<CITY_SIZE; x++) {
                map[x] = [];
                for(let z=0; z<CITY_SIZE; z++) {
                    const dx = x - CITY_SIZE/2;
                    const dz = z - CITY_SIZE/2;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    
                    // Ice ground, water at edges
                    if (dist > CITY_SIZE/2 - 2) {
                        map[x][z] = 3; // Water at edges
                    } else {
                        map[x][z] = 2; // Ice ground
                    }
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
                roughness: 0.4,
                metalness: 0.1,
            });
            
            const icePlane = new THREE.Mesh(iceGeo, iceMat);
            icePlane.position.set(CITY_SIZE/2 * BUILDING_SCALE, 0, CITY_SIZE/2 * BUILDING_SCALE);
            icePlane.receiveShadow = true;
            scene.add(icePlane);
            
            // Water ring around the island
            const waterGroup = { mats: [], cols: [] };
            for(let x=0; x<CITY_SIZE; x++) {
                for(let z=0; z<CITY_SIZE; z++) {
                    const type = map[x][z];
                    if (type === 3) {
                        const px = x * BUILDING_SCALE;
                        const pz = z * BUILDING_SCALE;
                        dummy.position.set(px, -0.4, pz);
                        dummy.rotation.set(0, 0, 0);
                        dummy.scale.set(BUILDING_SCALE, 0.1, BUILDING_SCALE);
                        dummy.updateMatrix();
                        
                        // Darker water variation
                        const waterColor = new THREE.Color(Math.random() > 0.5 ? WATER_ARCTIC : WATER_DEEP);
                        waterGroup.mats.push(dummy.matrix.clone());
                        waterGroup.cols.push(waterColor.r, waterColor.g, waterColor.b);
                    }
                }
            }
            
            // Create water instances
            if (waterGroup.mats.length > 0) {
                const waterGeo = new THREE.BoxGeometry(1, 1, 1);
                const waterMat = new THREE.MeshStandardMaterial({
                    vertexColors: true,
                    roughness: 0.2,
                    metalness: 0.1,
                });
                const waterMesh = new THREE.InstancedMesh(waterGeo, waterMat, waterGroup.mats.length);
                waterGroup.mats.forEach((m, i) => waterMesh.setMatrixAt(i, m));
                const cArray = new Float32Array(waterGroup.cols);
                waterGeo.setAttribute('color', new THREE.InstancedBufferAttribute(cArray, 3));
                waterMesh.receiveShadow = true;
                scene.add(waterMesh);
            }
            
            // ==================== SPAWN TOWN CENTER PROPS ====================
            // Create TownCenter room instance and spawn all props (trees, igloos, lamps, etc.)
            const townCenter = new TownCenter(THREE);
            townCenterRef.current = townCenter;
            const { meshes: propMeshes, lights: propLights, collisionSystem } = townCenter.spawn(scene);
            
            console.log(`Town Center spawned: ${propMeshes.length} props, ${propLights.length} lights`);
            
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
        
        // Generate Igloo interior room (cozy hangout space)
        const generateIglooRoom = () => {
            const IGLOO_SIZE = 20;
            scene.background = new THREE.Color(0x1a2a3a); // Cool blue-grey
            
            // Simple collision map for igloo
            const map = [];
            for(let x = 0; x < 10; x++) {
                map[x] = [];
                for(let z = 0; z < 10; z++) {
                    map[x][z] = 2; // All walkable
                }
            }
            mapRef.current = map;
            
            // ==================== FLOOR ====================
            // Cozy carpet in center
            const carpetGeo = new THREE.CircleGeometry(7, 32);
            const carpetMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 }); // Brown carpet
            const carpet = new THREE.Mesh(carpetGeo, carpetMat);
            carpet.rotation.x = -Math.PI / 2;
            carpet.position.y = 0.02;
            carpet.receiveShadow = true;
            scene.add(carpet);
            
            // Carpet pattern - inner circle
            const innerCarpet = new THREE.Mesh(
                new THREE.CircleGeometry(5, 32),
                new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.9 })
            );
            innerCarpet.rotation.x = -Math.PI / 2;
            innerCarpet.position.y = 0.03;
            scene.add(innerCarpet);
            
            // Ice floor around carpet
            const floorGeo = new THREE.CircleGeometry(IGLOO_SIZE / 2, 32);
            const floorMat = new THREE.MeshStandardMaterial({ 
                color: 0xE8F4F8, 
                roughness: 0.3,
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
                color: 0xD6EAF8,
                roughness: 0.4,
                side: THREE.BackSide // Render inside
            });
            const dome = new THREE.Mesh(domeGeo, domeMat);
            dome.scale.y = 0.6; // Flatten dome
            scene.add(dome);
            
            // Ice block lines on dome
            for (let i = 1; i < 6; i++) {
                const ringY = i * 1.0;
                const ringRadius = (IGLOO_SIZE / 2) * Math.cos(Math.asin(ringY / (IGLOO_SIZE / 2 * 0.6)));
                if (ringRadius > 1) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(ringRadius, 0.05, 4, 48),
                        new THREE.MeshStandardMaterial({ color: 0xBDC3C7 })
                    );
                    ring.position.y = ringY;
                    ring.rotation.x = Math.PI / 2;
                    scene.add(ring);
                }
            }
            
            // ==================== COUCH ====================
            const couchGroup = new THREE.Group();
            const couchMat = new THREE.MeshStandardMaterial({ color: 0x2E4A62, roughness: 0.8 }); // Blue couch
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
            
            couchGroup.position.set(0, 0, -6);
            scene.add(couchGroup);
            
            // ==================== CHAIRS ====================
            const createChair = (x, z, rotY) => {
                const chairGroup = new THREE.Group();
                const chairMat = new THREE.MeshStandardMaterial({ color: 0x5D4E37, roughness: 0.8 });
                const seatMat = new THREE.MeshStandardMaterial({ color: 0xE74C3C, roughness: 0.9 }); // Red cushion
                
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
            
            createChair(-5, -2, Math.PI / 4);
            createChair(5, -2, -Math.PI / 4);
            
            // ==================== TV / GAME CONSOLE ====================
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
            
            // Screen glow (playing game)
            const glowGeo = new THREE.PlaneGeometry(2.3, 1.6);
            const glowMat = new THREE.MeshBasicMaterial({ 
                color: 0x4488ff, 
                transparent: true, 
                opacity: 0.3 
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
            
            tvGroup.position.set(0, 0, 6);
            tvGroup.rotation.y = Math.PI;
            scene.add(tvGroup);
            
            // ==================== COFFEE TABLE ====================
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
            
            tableGroup.position.set(0, 0, -2);
            scene.add(tableGroup);
            
            // ==================== BEACH BALL ====================
            const ballGeo = new THREE.SphereGeometry(0.5, 16, 16);
            const ballMat = new THREE.MeshStandardMaterial({ color: 0xFF6B6B, roughness: 0.6 });
            const ball = new THREE.Mesh(ballGeo, ballMat);
            ball.position.set(3, 0.5, 2);
            ball.castShadow = true;
            scene.add(ball);
            
            // Ball stripes
            const stripeMat = new THREE.MeshStandardMaterial({ color: 0xFFE66D });
            for (let i = 0; i < 4; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.TorusGeometry(0.35, 0.08, 8, 16),
                    stripeMat
                );
                stripe.position.set(3, 0.5, 2);
                stripe.rotation.y = (i / 4) * Math.PI;
                scene.add(stripe);
            }
            
            // ==================== POTTED PLANT ====================
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
            
            plantGroup.position.set(-4, 0, 4);
            scene.add(plantGroup);
            
            // ==================== BOOKSHELF ====================
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
            
            shelfGroup.position.set(6, 0, 0);
            shelfGroup.rotation.y = -Math.PI / 2;
            scene.add(shelfGroup);
            
            // ==================== LIGHTING ====================
            // Warm ambient light
            const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.4);
            scene.add(ambientLight);
            
            // Ceiling light (warm glow)
            const ceilingLight = new THREE.PointLight(0xFFE4B5, 1.2, 20);
            ceilingLight.position.set(0, 5, 0);
            ceilingLight.castShadow = true;
            scene.add(ceilingLight);
            
            // Light fixture
            const fixtureMesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 16, 16),
                new THREE.MeshBasicMaterial({ color: 0xFFFACD })
            );
            fixtureMesh.position.set(0, 5.2, 0);
            scene.add(fixtureMesh);
            
            // TV glow light
            const tvLight = new THREE.PointLight(0x4488ff, 0.5, 8);
            tvLight.position.set(0, 2, 5);
            scene.add(tvLight);
            
            // ==================== EXIT GLOW ====================
            const exitGlow = new THREE.Mesh(
                new THREE.CircleGeometry(2, 16),
                new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.2 })
            );
            exitGlow.rotation.x = -Math.PI / 2;
            exitGlow.position.set(0, 0.02, 9);
            scene.add(exitGlow);
            
            // Exit door frame
            const doorFrame = new THREE.Mesh(
                new THREE.BoxGeometry(2.5, 3, 0.3),
                new THREE.MeshStandardMaterial({ color: 0x4a3728 })
            );
            doorFrame.position.set(0, 1.5, IGLOO_SIZE / 2 - 0.5);
            scene.add(doorFrame);
            
            // Door opening (dark)
            const doorOpening = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 2.5),
                new THREE.MeshBasicMaterial({ color: 0x0a1520 })
            );
            doorOpening.position.set(0, 1.25, IGLOO_SIZE / 2 - 0.3);
            scene.add(doorOpening);
            
            // Furniture interaction data (for sitting)
            const furniture = [
                {
                    type: 'couch',
                    position: { x: 0, z: -6 },
                    rotation: 0,
                    seatHeight: 0.95,
                    snapPoints: [
                        { x: -1.5, z: 0.5 },  // Left cushion
                        { x: 0, z: 0.5 },      // Middle cushion
                        { x: 1.5, z: 0.5 }     // Right cushion
                    ],
                    interactionRadius: 2.5
                },
                {
                    type: 'chair',
                    position: { x: -5, z: -2 },
                    rotation: Math.PI / 4,
                    seatHeight: 0.8,
                    snapPoints: [{ x: 0, z: 0 }],
                    interactionRadius: 1.5
                },
                {
                    type: 'chair',
                    position: { x: 5, z: -2 },
                    rotation: -Math.PI / 4,
                    seatHeight: 0.8,
                    snapPoints: [{ x: 0, z: 0 }],
                    interactionRadius: 1.5
                }
            ];
            
            return {
                bounds: { minX: -IGLOO_SIZE/2 + 1, maxX: IGLOO_SIZE/2 - 1, minZ: -IGLOO_SIZE/2 + 1, maxZ: IGLOO_SIZE/2 - 1 },
                spawnPos: { x: 0, z: 7 },
                furniture: furniture
            };
        };
        
        // Generate scenery based on current room
        let roomData = null;
        let butterflyGroup = null;
        
        if (room === 'town') {
            const cityResult = generateCity();
            butterflyGroup = cityResult.butterflyGroup;
            roomData = {
                bounds: null, // Town uses tile-based collision
                spawnPos: { x: (CITY_SIZE/2) * BUILDING_SCALE, z: (CITY_SIZE/2) * BUILDING_SCALE + 10 }
            };
        } else if (room === 'dojo') {
            roomData = generateDojoRoom();
        } else if (room === 'igloo1' || room === 'igloo2') {
            roomData = generateIglooRoom();
        }
        
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

        // Build actual buildings with doors (Club Penguin/MapleStory style)
        BUILDINGS.forEach(building => {
            const buildingGroup = new THREE.Group();
            const { w, h, d } = building.size;
            
            // Main building structure
            const wallGeo = new THREE.BoxGeometry(w, h, d);
            const wallMat = new THREE.MeshStandardMaterial({ color: building.wallColor });
            const walls = new THREE.Mesh(wallGeo, wallMat);
            walls.position.y = h / 2;
            walls.castShadow = true;
            walls.receiveShadow = true;
            buildingGroup.add(walls);
            
            // Roof based on type
            if (building.roofType === 'pagoda') {
                // Pagoda style (Dojo) - tiered roof
                for (let tier = 0; tier < 2; tier++) {
                    const roofW = w - tier * 3;
                    const roofGeo = new THREE.ConeGeometry(roofW * 0.7, 3, 4);
                    const roofMat = new THREE.MeshStandardMaterial({ color: building.color });
                    const roof = new THREE.Mesh(roofGeo, roofMat);
                    roof.position.y = h + 1.5 + tier * 2.5;
                    roof.rotation.y = Math.PI / 4;
                    roof.castShadow = true;
                    buildingGroup.add(roof);
                }
                // Add decorative pillars
                const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, h, 8);
                const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8b0000 });
                [[-w/2 + 0.5, d/2 + 0.5], [w/2 - 0.5, d/2 + 0.5]].forEach(([px, pz]) => {
                    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                    pillar.position.set(px, h/2, pz);
                    buildingGroup.add(pillar);
                });
            } else if (building.roofType === 'slanted') {
                // Slanted roof (Pizza Parlor)
                const roofGeo = new THREE.BoxGeometry(w + 1, 0.5, d + 1);
                const roofMat = new THREE.MeshStandardMaterial({ color: building.color });
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.position.y = h + 0.25;
                roof.rotation.z = 0.1;
                buildingGroup.add(roof);
            } else {
                // Flat roof with border
                const roofGeo = new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5);
                const roofMat = new THREE.MeshStandardMaterial({ color: building.color });
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.position.y = h + 0.25;
                buildingGroup.add(roof);
            }
            
            // Door frame first (behind door)
            const doorFrameGeo = new THREE.BoxGeometry(3.2, 4.8, 0.2);
            const doorFrameMat = new THREE.MeshStandardMaterial({ 
                color: building.gameId ? 0x8B4513 : 0x654321,
                roughness: 0.8
            });
            const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
            doorFrame.position.set(0, 2.4, d / 2 + 0.1);
            buildingGroup.add(doorFrame);
            
            // Door (front of building) - dark wood
            const doorGeo = new THREE.BoxGeometry(2.4, 4, 0.15);
            const doorMat = new THREE.MeshStandardMaterial({ 
                color: 0x3d2817,
                roughness: 0.7
            });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.set(0, 2, d / 2 + 0.2);
            buildingGroup.add(door);
            
            // Door handle
            const handleGeo = new THREE.SphereGeometry(0.12, 8, 8);
            const handleMat = new THREE.MeshStandardMaterial({ 
                color: 0xFFD700,
                metalness: 0.8,
                roughness: 0.2
            });
            const handle = new THREE.Mesh(handleGeo, handleMat);
            handle.position.set(0.8, 2, d / 2 + 0.35);
            buildingGroup.add(handle);
            
            // Subtle glow mat on floor in front of door (for interactive buildings)
            if (building.gameId) {
                const glowGeo = new THREE.CircleGeometry(1.5, 16);
                const glowMat = new THREE.MeshBasicMaterial({ 
                    color: 0x44ff44,
                    transparent: true,
                    opacity: 0.3
                });
                const glow = new THREE.Mesh(glowGeo, glowMat);
                glow.rotation.x = -Math.PI / 2;
                glow.position.set(0, 0.05, d / 2 + 2);
                glow.name = `door_glow_${building.id}`;
                buildingGroup.add(glow);
            }
            
            // Windows
            const windowGeo = new THREE.BoxGeometry(1.5, 1.5, 0.2);
            const windowMat = new THREE.MeshStandardMaterial({ 
                color: 0x87ceeb, 
                emissive: 0xffffaa,
                emissiveIntensity: 0.2
            });
            [[-w/3, h/2], [w/3, h/2]].forEach(([wx, wy]) => {
                const win = new THREE.Mesh(windowGeo, windowMat);
                win.position.set(wx, wy, d / 2 + 0.15);
                buildingGroup.add(win);
            });
            
            // Sign above door
            const sign = createLabelSprite(building.name, building.emoji);
            sign.position.set(0, h + 2, d / 2 + 1);
            buildingGroup.add(sign);
            
            // Warm light near door
            const doorLight = new THREE.PointLight(0xffaa55, 0.8, 10);
            doorLight.position.set(0, 3, d / 2 + 2);
            buildingGroup.add(doorLight);
            
            // Position building in world
            buildingGroup.position.set(
                centerX + building.position.x,
                0,
                centerZ + building.position.z
            );
            
            scene.add(buildingGroup);
            
            // Store building mesh for visuals
            portalsRef.current.push({ 
                ...building, 
                mesh: buildingGroup,
                doorPosition: {
                    x: centerX + building.position.x,
                    z: centerZ + building.position.z + building.size.d / 2 + 1.5
                },
                radius: building.doorRadius
            });
        });
        } // End town-only building generation
        
        // --- OPTIMIZED PLAYER & AI BUILDER ---
        // Material cache - reuse materials for same colors (HUGE performance gain)
        const materialCache = new Map();
        const getMaterial = (color) => {
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
             }
             
             if (data.eyes && ASSETS.EYES[data.eyes]) {
                 const p = buildPartMerged(ASSETS.EYES[data.eyes], PALETTE);
                 p.name = 'eyes';
                 group.add(p);
             } else if (ASSETS.EYES.normal) {
                 const p = buildPartMerged(ASSETS.EYES.normal, PALETTE);
                 p.name = 'eyes';
                 group.add(p);
             }
             
             if (data.mouth && ASSETS.MOUTH[data.mouth]) {
                 const p = buildPartMerged(ASSETS.MOUTH[data.mouth], PALETTE);
                 p.name = 'mouth';
                 group.add(p);
             } else if (ASSETS.MOUTH.beak) {
                 const p = buildPartMerged(ASSETS.MOUTH.beak, PALETTE);
                 p.name = 'mouth';
                 group.add(p);
             }
             
             if (data.bodyItem && data.bodyItem !== 'none' && ASSETS.BODY[data.bodyItem]) {
                 const p = buildPartMerged(ASSETS.BODY[data.bodyItem], PALETTE);
                 p.name = 'accessory';
                 group.add(p);
             }
             
             group.scale.set(0.2, 0.2, 0.2); 
             group.position.y = 1.4;
             
             const wrapper = new THREE.Group();
             wrapper.add(group);
             return wrapper;
        };
        
        // Store buildPenguinMesh for multiplayer to use
        buildPenguinMeshRef.current = buildPenguinMesh;
        
        // --- BUILD PLAYER ---
        const playerWrapper = buildPenguinMesh(penguinData);
        playerRef.current = playerWrapper;
        scene.add(playerWrapper);
        
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
        } else if (roomData && roomData.spawnPos) {
            posRef.current = { x: roomData.spawnPos.x, y: 0, z: roomData.spawnPos.z };
        } else {
            posRef.current = { x: (CITY_SIZE/2) * BUILDING_SCALE, y: 0, z: (CITY_SIZE/2) * BUILDING_SCALE + 10 };
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
                    if (playerRef.current && playerRef.current.children[0]) {
                        const m = playerRef.current.children[0];
                        m.position.y = 1;
                        m.rotation.x = 0;
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
        const update = () => {
            reqRef.current = requestAnimationFrame(update);
            
            const delta = clock.getDelta();
            const time = clock.getElapsedTime(); 
            
            const speed = 10 * delta; 
            const rotSpeed = 2 * delta; 
            let moving = false;
            
            // Check keyboard input
            const keyForward = keysRef.current['KeyW'] || keysRef.current['ArrowUp'];
            const keyBack = keysRef.current['KeyS'] || keysRef.current['ArrowDown'];
            const keyLeft = keysRef.current['KeyA'] || keysRef.current['ArrowLeft'];
            const keyRight = keysRef.current['KeyD'] || keysRef.current['ArrowRight'];
            
            // Check mobile button input
            const mobile = mobileControlsRef.current;
            const mobileForward = mobile.forward;
            const mobileBack = mobile.back;
            const mobileLeft = mobile.left;
            const mobileRight = mobile.right;
            
            const anyMovementInput = keyForward || keyBack || keyLeft || keyRight || 
                                      mobileForward || mobileBack || mobileLeft || mobileRight;
            
            // If seated on bench, check for movement to stand up
            if (seatedRef.current) {
                if (anyMovementInput) {
                    // Stand up from bench - move forward to avoid collision
                    const seatData = seatedRef.current;
                    const benchRot = seatData.benchRotation || 0;
                    const dismountDist = 3.0; // Distance to move forward when standing (clear of bench collision)
                    
                    // Calculate forward direction based on bench rotation
                    const forwardX = Math.sin(benchRot) * dismountDist;
                    const forwardZ = Math.cos(benchRot) * dismountDist;
                    
                    // Move player forward from bench
                    posRef.current.x = seatData.worldPos.x + forwardX;
                    posRef.current.z = seatData.worldPos.z + forwardZ;
                    
                    // Update mesh position
                    if (playerRef.current) {
                        playerRef.current.position.x = posRef.current.x;
                        playerRef.current.position.z = posRef.current.z;
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
                        m.position.y = 1;
                        m.rotation.x = 0;
                    }
                }
                // While seated, don't move
                velRef.current.x = 0;
                velRef.current.z = 0;
            }
            else if (!emoteRef.current.type) {
                if (keyForward || mobileForward) {
                    velRef.current.z = Math.cos(rotRef.current) * speed;
                    velRef.current.x = Math.sin(rotRef.current) * speed;
                    moving = true;
                } else if (keyBack || mobileBack) {
                    velRef.current.z = -Math.cos(rotRef.current) * speed;
                    velRef.current.x = -Math.sin(rotRef.current) * speed;
                    moving = true;
                } else {
                    velRef.current.x = 0;
                    velRef.current.z = 0;
                }
                
                if (keyLeft || mobileLeft) rotRef.current += rotSpeed;
                if (keyRight || mobileRight) rotRef.current -= rotSpeed;
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
            if ((roomRef.current === 'dojo' || roomRef.current === 'igloo1' || roomRef.current === 'igloo2') && roomData && roomData.bounds) {
                // Dojo and Igloo use simple bounds collision (no furniture collision)
                const b = roomData.bounds;
                const playerRadius = 0.8;
                // Clamp position to stay within bounds (prevents rotation escape)
                finalX = Math.max(b.minX + playerRadius, Math.min(b.maxX - playerRadius, nextX));
                finalZ = Math.max(b.minZ + playerRadius, Math.min(b.maxZ - playerRadius, nextZ));
                if (finalX !== nextX || finalZ !== nextZ) {
                    collided = true;
                }
            } else if (townCenterRef.current) {
                // Town uses TownCenter collision system (props + buildings + water)
                const result = townCenterRef.current.checkPlayerMovement(
                    posRef.current.x, 
                    posRef.current.z, 
                    nextX, 
                    nextZ, 
                    0.8 // Player radius
                );
                finalX = result.x;
                finalZ = result.z;
                collided = result.collided;
                
                // Also check triggers (benches, snowmen, etc.)
                townCenterRef.current.checkTriggers(finalX, finalZ);
            } else {
                // Fallback: Town uses tile-based collision (water at edges) + building collision
                const gridX = Math.floor((nextX + BUILDING_SCALE/2) / BUILDING_SCALE);
                const gridZ = Math.floor((nextZ + BUILDING_SCALE/2) / BUILDING_SCALE);
                
                if (gridX >= 0 && gridX < CITY_SIZE && gridZ >= 0 && gridZ < CITY_SIZE) {
                    const type = mapRef.current?.[gridX]?.[gridZ];
                    if (type === 3) collided = true; // Can't walk into water
                } else {
                    collided = true; // Can't walk off map
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
            if (roomRef.current === 'dojo' || roomRef.current === 'igloo1' || roomRef.current === 'igloo2') {
                // Dojo/Igloo: always use clamped position
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
                
                // Check igloo furniture proximity for interaction
                if ((roomRef.current === 'igloo1' || roomRef.current === 'igloo2') && roomData && roomData.furniture) {
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
            
            if (playerRef.current) {
                playerRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
                playerRef.current.rotation.y = rotRef.current;
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
            
            const animateMesh = (meshWrapper, isMoving, emoteType, emoteStartTime) => {
                if (!meshWrapper || !meshWrapper.children[0]) return;
                const meshInner = meshWrapper.children[0];
                const flipperL = meshInner.getObjectByName('flipper_l');
                const flipperR = meshInner.getObjectByName('flipper_r');
                const head = meshInner.getObjectByName('head');
                const hatPart = meshInner.getObjectByName('hat');
                const eyesPart = meshInner.getObjectByName('eyes');
                const mouthPart = meshInner.getObjectByName('mouth');
                const footL = meshInner.getObjectByName('foot_l');
                const footR = meshInner.getObjectByName('foot_r');
                
                if(flipperL) { flipperL.rotation.set(0,0,0); }
                if(flipperR) { flipperR.rotation.set(0,0,0); }
                meshInner.position.y = 1;
                meshInner.rotation.z = 0;
                meshInner.rotation.y = 0;
                meshInner.rotation.x = 0;
                if(footL) { footL.rotation.x = 0; footL.position.z = 0; }
                if(footR) { footR.rotation.x = 0; footR.position.z = 0; }
                if(head) { head.rotation.x = 0; }
                if(hatPart) { hatPart.rotation.x = 0; }
                if(eyesPart) { eyesPart.rotation.x = 0; }
                if(mouthPart) { mouthPart.rotation.x = 0; }

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
                        meshInner.position.y = 1 + Math.abs(Math.sin(eTime * 5)) * 1; 
                        if(flipperL) flipperL.rotation.z = Math.sin(eTime * 10) * 1;
                        if(flipperR) flipperR.rotation.z = -Math.sin(eTime * 10) * 1;
                    }
                    else if (emoteType === 'Sit') {
                        // Check if seated on furniture (bench) vs ground sitting emote
                        if (seatedRef.current) {
                            // FURNITURE SITTING: Elevate to sit ON TOP of bench
                            meshInner.position.y = 1.6; // Elevated to bench surface
                        } else {
                            // GROUND SITTING: Sit on the ground, lower position
                            meshInner.position.y = 0.5;
                        }
                        // Feet extend forward when sitting - push out in front of body
                        if(footL) {
                            footL.rotation.x = -Math.PI / 2.5;
                            footL.position.z = 2.5; // Push foot forward, clear of body
                        }
                        if(footR) {
                            footR.rotation.x = -Math.PI / 2.5;
                            footR.position.z = 2.5; // Push foot forward, clear of body
                        }
                        // Flippers rest on sides
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
                          meshInner.position.y = 1 + Math.abs(Math.sin(eTime * 15)) * 0.1;
                    }
                    
                    if (emoteType !== 'Sit' && eTime > 3) {
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
                animateMesh(playerRef.current, moving, emoteRef.current.type, emoteRef.current.startTime);
            }
            
            // --- AI UPDATE LOOP (runs always, AI have their own room state) ---
            const now = Date.now();
            // Using cached values: centerX, centerZ, dojoBxCached, dojoBzCached, dojoHdCached, puffleMap, aiMap
            
            aiAgentsRef.current.forEach(ai => {
                let aiMoving = false;
                
                // Only show AI that are in the same room as the player
                const sameRoom = ai.currentRoom === roomRef.current;
                if (ai.mesh) ai.mesh.visible = sameRoom;
                
                // Also show/hide AI's puffle - O(1) lookup now
                const aiPuffleEntry = puffleMap.get(ai.id);
                if (aiPuffleEntry && aiPuffleEntry.puffle && aiPuffleEntry.puffle.mesh) {
                    aiPuffleEntry.puffle.mesh.visible = sameRoom;
                }
                
                // --- AI Room Transition Logic (use cached values) ---
                const dojoBx = dojoBxCached;
                const dojoBz = dojoBzCached;
                const dojoHd = dojoHdCached;
                const dojoDoorZ = dojoBz + dojoHd; // Front of dojo (door position)
                
                if (ai.currentRoom === 'town') {
                    // Check if AI is at the dojo door
                    const doorWidth = 4;
                    const atDoor = Math.abs(ai.pos.x - dojoBx) < doorWidth && 
                                   Math.abs(ai.pos.z - dojoDoorZ) < 3;
                    
                    // When at door, good chance to enter
                    if (atDoor && Math.random() < 0.02) { // 2% per frame = enters quickly
                        ai.currentRoom = 'dojo';
                        // Position AI near entrance inside dojo
                        ai.pos.x = (Math.random() - 0.5) * 10;
                        ai.pos.z = 12 + Math.random() * 3; // Near the exit/entrance
                        ai.action = 'idle';
                        ai.actionTimer = now + 2000;
                        ai.target = null;
                        // Move puffle too
                        if (aiPuffleEntry && aiPuffleEntry.puffle) {
                            aiPuffleEntry.puffle.position.x = ai.pos.x + 1.5;
                            aiPuffleEntry.puffle.position.z = ai.pos.z + 1.5;
                        }
                    }
                } else if (ai.currentRoom === 'dojo') {
                    // AI in dojo can exit - check if near exit portal (z > 14)
                    const atExit = ai.pos.z > 13 && Math.abs(ai.pos.x) < 5;
                    
                    // When at exit, chance to leave
                    if (atExit && Math.random() < 0.015) { // 1.5% per frame
                        ai.currentRoom = 'town';
                        // Position AI outside dojo door in town
                        ai.pos.x = dojoBx + (Math.random() - 0.5) * 4;
                        ai.pos.z = dojoDoorZ + 2 + Math.random() * 2;
                        ai.action = 'idle';
                        ai.actionTimer = now + 2000;
                        ai.target = null;
                        // Move puffle too
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
                    // Find conversation partner in same room
                    let foundPartner = null;
                    if (now > ai.conversationCooldown) {
                        for(let other of aiAgentsRef.current) {
                            if (other.id !== ai.id && 
                                other.action === 'idle' && 
                                other.currentRoom === ai.currentRoom && // Same room check
                                now > other.conversationCooldown) {
                                const dx = other.pos.x - ai.pos.x;
                                const dz = other.pos.z - ai.pos.z;
                                const dist = Math.sqrt(dx*dx + dz*dz);
                                if (dist < 5) {
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
                        if (r < 0.15) {
                            // Random emote
                            ai.action = 'idle';
                            ai.emoteType = AI_EMOTES[Math.floor(Math.random() * AI_EMOTES.length)];
                            ai.emoteStart = now;
                            ai.actionTimer = now + 4000; 
                        }
                        else if (r < 0.75) {
                            // Walk somewhere
                            ai.action = 'walk';
                            ai.emoteType = null;
                            
                            if (ai.currentRoom === 'town') {
                                // 20% chance to walk towards dojo door
                                if (Math.random() < 0.20) {
                                    // Use cached dojo values
                                    const doorX = dojoBxCached + (Math.random() - 0.5) * 4;
                                    const doorZ = dojoBzCached + dojoHdCached + 2; // Just outside door
                                    ai.target = { x: doorX, z: doorZ };
                                } else {
                                    // Random walk in town - avoid buildings
                                    let tx, tz;
                                    let attempts = 0;
                                    let validTarget = false;
                                    
                                    do {
                                        tx = centerX + (Math.random()-0.5) * 50;
                                        tz = centerZ + (Math.random()-0.5) * 50;
                                        validTarget = true;
                                        
                                        // Check if target is inside any building
                                        for (const building of BUILDINGS) {
                                            const bx = centerX + building.position.x;
                                            const bz = centerZ + building.position.z;
                                            const hw = building.size.w / 2 + 3;
                                            const hd = building.size.d / 2 + 3;
                                            
                                            if (tx > bx - hw && tx < bx + hw && tz > bz - hd && tz < bz + hd) {
                                                validTarget = false;
                                                break;
                                            }
                                        }
                                        attempts++;
                                    } while (!validTarget && attempts < 5);
                                    
                                    ai.target = { x: tx, z: tz };
                                }
                            } else if (ai.currentRoom === 'dojo') {
                                // 25% chance to walk towards exit
                                if (Math.random() < 0.25) {
                                    ai.target = { x: (Math.random() - 0.5) * 6, z: 14 + Math.random() * 2 };
                                } else {
                                    // Walk around inside dojo
                                    const tx = (Math.random()-0.5) * 28;
                                    const tz = (Math.random()-0.5) * 28;
                                    ai.target = { x: tx, z: tz };
                                }
                            }
                            ai.actionTimer = now + 4000 + Math.random() * 4000;
                        }
                        else {
                            // Idle
                            ai.action = 'idle';
                            ai.emoteType = null;
                            ai.actionTimer = now + 2000 + Math.random() * 2000;
                        }
                    }
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
                            // Town grid collision (water at edges)
                            const gridX = Math.floor((nextX + BUILDING_SCALE/2) / BUILDING_SCALE);
                            const gridZ = Math.floor((nextZ + BUILDING_SCALE/2) / BUILDING_SCALE);
                            
                            if (gridX >= 0 && gridX < CITY_SIZE && gridZ >= 0 && gridZ < CITY_SIZE) {
                                const type = mapRef.current?.[gridX]?.[gridZ];
                                if (type === 3) collided = true; // Can't walk into water
                            } else {
                                collided = true; // Can't walk off map
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
                        }

                        if (!collided) {
                            ai.pos.x = nextX;
                            ai.pos.z = nextZ;
                            aiMoving = true;
                            ai.stuckCounter = 0; // Reset stuck counter
                        } else {
                            // AI hit a wall - try to navigate around
                            ai.stuckCounter = (ai.stuckCounter || 0) + 1;
                            
                            if (ai.stuckCounter > 30) {
                                // Really stuck - pick completely new random target
                                ai.action = 'idle';
                                ai.actionTimer = now + 500;
                                ai.target = null;
                                ai.stuckCounter = 0;
                            } else {
                                // Try sliding along the wall
                                // Rotate target direction by 45-90 degrees
                                const slideAngle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4 + Math.random() * Math.PI / 4);
                                ai.rot += slideAngle;
                                
                                // Pick new target in the rotated direction
                                const newDist = 5 + Math.random() * 10;
                                if (ai.currentRoom === 'town') {
                                    ai.target = {
                                        x: ai.pos.x + Math.sin(ai.rot) * newDist,
                                        z: ai.pos.z + Math.cos(ai.rot) * newDist
                                    };
                                } else {
                                    // In dojo, stay in bounds
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
                
                ai.mesh.position.set(ai.pos.x, 0, ai.pos.z);
                if (ai.action !== 'chatting') ai.mesh.rotation.y = ai.rot;
                
                animateMesh(ai.mesh, aiMoving, ai.emoteType, ai.emoteStart);

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
                if (meshData.currentEmote && meshData.currentEmote !== 'Sit') {
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
                animateMesh(meshData.mesh, isMoving, meshData.currentEmote, meshData.emoteStartTime);
                
                // Handle chat bubbles
                if (playerData.chatMessage && playerData.chatTime) {
                    const chatAge = Date.now() - playerData.chatTime;
                    
                    // Create bubble if new message
                    if (!meshData.bubble || meshData.lastChatTime !== playerData.chatTime) {
                        // Remove old bubble
                        if (meshData.bubble) {
                            meshData.mesh.remove(meshData.bubble);
                        }
                        // Create new bubble
                        meshData.bubble = createChatSprite(playerData.chatMessage);
                        if (meshData.bubble) {
                            meshData.mesh.add(meshData.bubble);
                        }
                        meshData.lastChatTime = playerData.chatTime;
                    }
                    
                    // Remove bubble after 5 seconds
                    if (chatAge > 5000 && meshData.bubble) {
                        meshData.mesh.remove(meshData.bubble);
                        meshData.bubble = null;
                        playerData.chatMessage = null;
                    }
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
            
            // Animate building door glows (pulse for interactive doors, town only)
            if (roomRef.current === 'town') {
                portalsRef.current.forEach(building => {
                    if (building.mesh && building.gameId) {
                        const glow = building.mesh.getObjectByName(`door_glow_${building.id}`);
                        if (glow && glow.material) {
                            glow.material.opacity = 0.2 + Math.sin(time * 2) * 0.15;
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

            const offset = camera.position.clone().sub(controls.target);
            const targetPos = new THREE.Vector3(posRef.current.x, 1, posRef.current.z);
            camera.position.copy(targetPos).add(offset);
            controls.target.copy(targetPos);
            controls.update();
            
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
        };
    }, [penguinData, room]); // Rebuild scene when room changes
    
    const triggerEmote = (type) => {
        emoteRef.current = { type, startTime: Date.now() };
        setShowEmoteWheel(false);
        // Send emote to other players
        mpSendEmote(type);
    };
    
    useEffect(() => {
        if (!activeBubble || !playerRef.current) return;
        
        if (bubbleSpriteRef.current) {
            playerRef.current.remove(bubbleSpriteRef.current);
        }
        
        const sprite = createChatSprite(activeBubble);
        playerRef.current.add(sprite);
        bubbleSpriteRef.current = sprite;
        
        const timeout = setTimeout(() => {
            if (playerRef.current && bubbleSpriteRef.current) {
                playerRef.current.remove(bubbleSpriteRef.current);
                bubbleSpriteRef.current = null;
                setActiveBubble(null);
            }
        }, 5000);
        
        return () => clearTimeout(timeout);
    }, [activeBubble]);
    
    const sendChat = () => {
        if(!chatInput.trim()) return;
        setActiveBubble(chatInput);
        
        // Send to other players via multiplayer
        mpSendChat(chatInput);
        
        setChatInput("");
        
        // Exit chat mode - blur the input so player can move again
        const input = document.getElementById('chat-input-field');
        if (input) input.blur();
        
        // Earn coins for chatting
        GameManager.getInstance().incrementStat('chatsSent');
        if (Math.random() > 0.7) {
            GameManager.getInstance().addCoins(5, 'chat');
        }
    };

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
    
    // Portal check effect
    useEffect(() => {
        const interval = setInterval(checkPortals, 200);
        return () => clearInterval(interval);
    }, [nearbyPortal, room]);
    
    // Handle portal entry
    const handlePortalEnter = () => {
        if (!nearbyPortal) return;
        
        // Room transition
        if (nearbyPortal.targetRoom && onChangeRoom) {
            // Pass exit spawn position if available (for returning to town)
            onChangeRoom(nearbyPortal.targetRoom, nearbyPortal.exitSpawnPos);
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
                        benchDepth: benchData.benchDepth || 0.8
                    };
                    setSeatedOnBench(seatData);
                    seatedRef.current = seatData;
                    
                    // Move player to seat position
                    posRef.current.x = closestWorldX;
                    posRef.current.z = closestWorldZ;
                    
                    // Face forward (same direction bench faces, +Z in bench local space)
                    rotRef.current = benchRotation;
                    
                    // Update player mesh position and rotation
                    if (playerRef.current) {
                        playerRef.current.position.x = closestWorldX;
                        playerRef.current.position.z = closestWorldZ;
                        playerRef.current.rotation.y = rotRef.current;
                    }
                    
                    // Trigger sit emote
                    emoteRef.current = { type: 'Sit', startTime: Date.now() };
                    mpSendEmote('Sit');
                    
                    // Clear the interaction prompt
                    setNearbyInteraction(null);
                }
                else if (nearbyInteraction.emote) {
                    emoteRef.current = { type: nearbyInteraction.emote, startTime: Date.now() };
                    mpSendEmote(nearbyInteraction.emote);
                }
                if (nearbyInteraction.action === 'interact_snowman') {
                    setActiveBubble(nearbyInteraction.message);
                }
            }
        };
        window.addEventListener('keydown', handleInteract);
        return () => window.removeEventListener('keydown', handleInteract);
    }, [nearbyInteraction, nearbyPortal]);
    
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
            const dRot = Math.abs(rot - last.rot);
            const distSq = dx * dx + dz * dz;
            
            // Only send if moved significantly
            if (distSq > 0.05 || dRot > 0.1) {
                const pufflePos = playerPuffleRef.current?.position || null;
                sendPosition(pos, rot, pufflePos);
                lastPositionSentRef.current = { x: pos.x, z: pos.z, rot, time: Date.now() };
            }
        }, 100); // 10 updates per second (was 20)
        
        return () => clearInterval(interval);
    }, [connected, sendPosition]);
    
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
            
            // Create name tag
            const nameSprite = createNameSprite(playerData.name || 'Player');
            if (nameSprite) {
                nameSprite.position.set(0, 5, 0);
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
                currentEmote: null,
                emoteStartTime: 0
            });
            
            // Clear the needsMesh flag
            playerData.needsMesh = false;
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
             
             {/* Mobile Directional Buttons (Minecraft-style D-pad) */}
             {isMobile && isLandscape && (
                <div className="absolute bottom-6 left-6 z-30 touch-none select-none">
                    {/* D-pad container */}
                    <div className="relative w-36 h-36">
                        {/* Forward Button (Top) */}
                        <button
                            className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-black/60 border-2 border-white/40 rounded-lg flex items-center justify-center active:bg-white/30 active:scale-95 transition-all"
                            onTouchStart={(e) => { e.preventDefault(); handleMobileButtonDown('forward'); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleMobileButtonUp('forward'); }}
                            onTouchCancel={(e) => { e.preventDefault(); handleMobileButtonUp('forward'); }}
                        >
                            <span className="text-white text-2xl">▲</span>
                        </button>
                        
                        {/* Back Button (Bottom) */}
                        <button
                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-black/60 border-2 border-white/40 rounded-lg flex items-center justify-center active:bg-white/30 active:scale-95 transition-all"
                            onTouchStart={(e) => { e.preventDefault(); handleMobileButtonDown('back'); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleMobileButtonUp('back'); }}
                            onTouchCancel={(e) => { e.preventDefault(); handleMobileButtonUp('back'); }}
                        >
                            <span className="text-white text-2xl">▼</span>
                        </button>
                        
                        {/* Left Button (Rotate Left) */}
                        <button
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 border-2 border-white/40 rounded-lg flex items-center justify-center active:bg-white/30 active:scale-95 transition-all"
                            onTouchStart={(e) => { e.preventDefault(); handleMobileButtonDown('left'); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleMobileButtonUp('left'); }}
                            onTouchCancel={(e) => { e.preventDefault(); handleMobileButtonUp('left'); }}
                        >
                            <span className="text-white text-2xl">◀</span>
                        </button>
                        
                        {/* Right Button (Rotate Right) */}
                        <button
                            className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 border-2 border-white/40 rounded-lg flex items-center justify-center active:bg-white/30 active:scale-95 transition-all"
                            onTouchStart={(e) => { e.preventDefault(); handleMobileButtonDown('right'); }}
                            onTouchEnd={(e) => { e.preventDefault(); handleMobileButtonUp('right'); }}
                            onTouchCancel={(e) => { e.preventDefault(); handleMobileButtonUp('right'); }}
                        >
                            <span className="text-white text-2xl">▶</span>
                        </button>
                        
                        {/* Center indicator */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 border border-white/20 flex items-center justify-center pointer-events-none">
                            <span className="text-white/40 text-[8px] retro-text">MOVE</span>
                        </div>
                    </div>
                </div>
             )}
             
             {/* Mobile Action Buttons */}
             {isMobile && isLandscape && (
                <div className="absolute bottom-8 right-8 flex flex-col gap-3 z-30">
                    {/* Emote Button */}
                    <button 
                        className="w-14 h-14 rounded-full bg-purple-600/80 border-2 border-white/40 flex items-center justify-center active:scale-95 transition-transform"
                        onClick={() => setShowEmoteWheel(true)}
                    >
                        <span className="text-2xl">😄</span>
                    </button>
                    
                    {/* Chat Button */}
                    <button 
                        className="w-14 h-14 rounded-full bg-blue-600/80 border-2 border-white/40 flex items-center justify-center active:scale-95 transition-transform"
                        onClick={() => setShowMobileChat(true)}
                    >
                        <span className="text-2xl">💬</span>
                    </button>
                    
                    {/* Interact Button (E key) */}
                    {(nearbyPortal || nearbyInteraction) && (
                        <button 
                            className="w-14 h-14 rounded-full bg-green-600/80 border-2 border-white/40 flex items-center justify-center active:scale-95 transition-transform animate-pulse"
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
                                        
                                        const seatData = {
                                            snapPoint: closestPoint,
                                            worldPos: { x: closestWorldX, z: closestWorldZ },
                                            seatHeight: benchData.seatHeight || 0.8,
                                            benchRotation: benchRotation,
                                            benchDepth: benchData.benchDepth || 0.8
                                        };
                                        setSeatedOnBench(seatData);
                                        seatedRef.current = seatData;
                                        
                                        posRef.current.x = closestWorldX;
                                        posRef.current.z = closestWorldZ;
                                        rotRef.current = benchRotation; // Face forward
                                        
                                        if (playerRef.current) {
                                            playerRef.current.position.x = closestWorldX;
                                            playerRef.current.position.z = closestWorldZ;
                                            playerRef.current.rotation.y = rotRef.current;
                                        }
                                        
                                        emoteRef.current = { type: 'Sit', startTime: Date.now() };
                                        mpSendEmote('Sit');
                                        setNearbyInteraction(null);
                                    }
                                    else if (nearbyInteraction.emote) {
                                        emoteRef.current = { type: nearbyInteraction.emote, startTime: Date.now() };
                                        mpSendEmote(nearbyInteraction.emote);
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
             
             {/* Mobile Chat Modal */}
             {isMobile && showMobileChat && (
                <div className="absolute inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl p-4 w-full max-w-md border border-white/20">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white retro-text text-sm">Chat</h3>
                            <button 
                                className="text-white/60 hover:text-white p-2"
                                onClick={() => setShowMobileChat(false)}
                            >✕</button>
                        </div>
                        <input 
                            type="text" 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type your message..."
                            className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-white text-base"
                            autoFocus
                        />
                        <div className="flex gap-2 mt-3">
                            <button 
                                className="flex-1 bg-gray-700 text-white py-3 rounded-xl retro-text text-xs"
                                onClick={() => setShowMobileChat(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="flex-1 bg-yellow-500 text-black py-3 rounded-xl retro-text text-xs"
                                onClick={() => {
                                    sendChat();
                                    setShowMobileChat(false);
                                }}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
             )}
             
             {/* HUD - Top Right */}
             <GameHUD onOpenPuffles={() => setShowPufflePanel(true)} />
             
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
                <div className={`absolute ${isMobile ? 'bottom-32 right-28' : 'bottom-24 left-1/2 -translate-x-1/2'} bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20 text-center animate-bounce-subtle z-20`}>
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
                 <h2 className={`text-xl drop-shadow-lg ${room === 'dojo' ? 'text-red-400' : room.startsWith('igloo') ? 'text-cyan-300' : 'text-yellow-400'}`}>
                     {room === 'dojo' ? 'THE DOJO' : room === 'igloo1' ? 'IGLOO 1' : room === 'igloo2' ? 'IGLOO 2' : 'TOWN'}
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

             {/* Chat Input - Bottom (Desktop only) */}
             {!isMobile && (
                <div className="absolute bottom-4 left-4 right-20 flex gap-2 pointer-events-auto z-20">
                     <input 
                       id="chat-input-field"
                       type="text" 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => {
                           if(e.key === 'Enter') sendChat();
                           if(e.key === 'Escape') e.target.blur();
                       }}
                       placeholder="Press Enter to chat..."
                       className="flex-1 bg-black/60 border-2 border-white/20 rounded-full px-4 py-2 text-white retro-text text-xs focus:outline-none focus:border-yellow-400 backdrop-blur-sm"
                     />
                     <button onClick={sendChat} className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 rounded-full retro-text text-xs transition-colors">
                         <IconSend size={16}/>
                     </button>
                </div>
             )}

             
             {showEmoteWheel && (
                 <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50 backdrop-blur-sm animate-fade-in">
                     <div className="relative w-64 h-64 rounded-full border-4 border-white/20 bg-black/80 flex items-center justify-center">
                         <div className="absolute top-4 text-center w-full retro-text text-yellow-400 text-xs">EMOTES</div>
                         
                         <button className="absolute top-12 hover:scale-110 transition-transform p-3 bg-blue-500 rounded-full border-2 border-white" onClick={() => triggerEmote('Wave')}>👋</button>
                         <button className="absolute bottom-12 hover:scale-110 transition-transform p-3 bg-green-500 rounded-full border-2 border-white" onClick={() => triggerEmote('Dance')}>💃</button>
                         <button className="absolute left-4 hover:scale-110 transition-transform p-3 bg-purple-500 rounded-full border-2 border-white" onClick={() => triggerEmote('Sit')}>🧘</button>
                         <button className="absolute right-4 hover:scale-110 transition-transform p-3 bg-red-500 rounded-full border-2 border-white" onClick={() => triggerEmote('Laugh')}>😂</button>
                         
                         <div className="text-white text-xs text-center opacity-50 retro-text">Select<br/>Animation</div>
                     </div>
                 </div>
             )}
        </div>
    );
};

export default VoxelWorld;

