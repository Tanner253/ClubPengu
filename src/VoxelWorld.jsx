import React, { useState, useEffect, useRef } from 'react';
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

const VoxelWorld = ({ 
    penguinData, 
    room = 'town',  // Current room/layer
    onExitToDesigner, 
    onChangeRoom,
    onStartMinigame,
    playerPuffle, 
    onPuffleChange 
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
    
    // Use prop for equipped puffle, with local ref for 3D tracking
    const puffle = playerPuffle;
    
    // Portal State
    const [nearbyPortal, setNearbyPortal] = useState(null);
    const portalsRef = useRef([]);
    
    // Town Interaction State
    const [nearbyInteraction, setNearbyInteraction] = useState(null);
    
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
        dojo: [
            { 
                id: 'dojo-exit', 
                name: 'EXIT', 
                emoji: '🚪', 
                description: 'Return to Town',
                targetRoom: 'town',
                position: { x: 0, z: 16 },
                doorRadius: 3
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
        
        // --- BUILD PLAYER ---
        const playerWrapper = buildPenguinMesh(penguinData);
        playerRef.current = playerWrapper;
        scene.add(playerWrapper);
        
        // Spawn position depends on room
        if (roomData && roomData.spawnPos) {
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
                // Prioritize portal interaction over emotes
                if (nearbyPortal && (nearbyPortal.targetRoom || nearbyPortal.minigame)) {
                    handlePortalEnter();
                    return;
                }
                setShowEmoteWheel(true);
            }
            if(e.code === 'Enter') {
                 const input = document.getElementById('chat-input-field');
                 if(input) input.focus();
            }
        };
        const handleUp = (e) => {
            keysRef.current[e.code] = false;
            if(e.code === 'KeyE') setShowEmoteWheel(false);
        };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        
        // --- GAME LOOP ---
        const update = () => {
            reqRef.current = requestAnimationFrame(update);
            
            const delta = clock.getDelta();
            const time = clock.getElapsedTime(); 
            
            const speed = 10 * delta; 
            const rotSpeed = 2 * delta; 
            let moving = false;
            
            if (!emoteRef.current.type) {
                if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) {
                    velRef.current.z = Math.cos(rotRef.current) * speed;
                    velRef.current.x = Math.sin(rotRef.current) * speed;
                    moving = true;
                } else if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) {
                    velRef.current.z = -Math.cos(rotRef.current) * speed;
                    velRef.current.x = -Math.sin(rotRef.current) * speed;
                    moving = true;
                } else {
                    velRef.current.x = 0;
                    velRef.current.z = 0;
                }
                
                if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) rotRef.current += rotSpeed;
                if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) rotRef.current -= rotSpeed;
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
            if (roomRef.current === 'dojo' && roomData && roomData.bounds) {
                // Dojo uses simple bounds collision
                const b = roomData.bounds;
                if (nextX < b.minX || nextX > b.maxX || nextZ < b.minZ || nextZ > b.maxZ) {
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
            
            // Update position (TownCenter returns safe position, others use original logic)
            if (townCenterRef.current && roomRef.current === 'town') {
                posRef.current.x = finalX;
                posRef.current.z = finalZ;
            } else if (!collided) {
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
                if(footL) { footL.rotation.x = 0; }
                if(footR) { footR.rotation.x = 0; }
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
                        meshInner.position.y = 0.6;
                        if(footL) footL.rotation.x = -Math.PI / 2;
                        if(footR) footR.rotation.x = -Math.PI / 2;
                        if(flipperL) flipperL.rotation.z = 0.5;
                        if(flipperR) flipperR.rotation.z = -0.5;
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
            const centerX = (CITY_SIZE / 2) * BUILDING_SCALE;
            const centerZ = (CITY_SIZE / 2) * BUILDING_SCALE;
            
            // OPTIMIZATION: Cache dojo building reference (don't search every frame)
            const dojoBuilding = BUILDINGS[0]; // Dojo is first building
            const dojoBxCached = centerX + dojoBuilding.position.x;
            const dojoBzCached = centerZ + dojoBuilding.position.z;
            const dojoHdCached = dojoBuilding.size.d / 2;
            
            // OPTIMIZATION: Create Maps for O(1) lookups instead of O(n) find()
            const puffleMap = new Map();
            aiPufflesRef.current.forEach(entry => puffleMap.set(entry.id, entry));
            
            const aiMap = new Map();
            aiAgentsRef.current.forEach(ai => aiMap.set(ai.id, ai));
            
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
        setChatInput("");
        
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
            onChangeRoom(nearbyPortal.targetRoom);
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
            const { action, message, emote, data } = e.detail;
            
            if (action === 'sit' && emote) {
                // Auto-trigger sit emote when near bench
                setNearbyInteraction({ action, message: 'Press E to sit', emote });
            } else if (action === 'interact_snowman') {
                // Show snowman message
                setNearbyInteraction({ action, message: message || '☃️ Hello friend!', emote: 'Wave' });
            } else if (action === 'enter_igloo') {
                setNearbyInteraction({ action, message: '🏠 Press E to enter igloo', emote: null });
            } else {
                setNearbyInteraction(null);
            }
        };
        
        window.addEventListener('townInteraction', handleTownInteraction);
        return () => window.removeEventListener('townInteraction', handleTownInteraction);
    }, []);
    
    // Handle interaction with E key
    useEffect(() => {
        const handleInteract = (e) => {
            if (e.code === 'KeyE' && nearbyInteraction && !showEmoteWheel && !nearbyPortal) {
                if (nearbyInteraction.emote) {
                    emoteRef.current = { type: nearbyInteraction.emote, startTime: Date.now() };
                }
                if (nearbyInteraction.action === 'interact_snowman') {
                    setActiveBubble(nearbyInteraction.message);
                }
            }
        };
        window.addEventListener('keydown', handleInteract);
        return () => window.removeEventListener('keydown', handleInteract);
    }, [nearbyInteraction, showEmoteWheel, nearbyPortal]);
    
    return (
        <div className="relative w-full h-full bg-black">
             <div ref={mountRef} className="absolute inset-0" />
             
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
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/20 text-center animate-bounce-subtle z-20">
                    <p className="text-white retro-text text-sm">{nearbyInteraction.message}</p>
                    <p className="text-yellow-400 text-xs mt-1 retro-text">Press E</p>
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
                 <h2 className={`text-xl drop-shadow-lg ${room === 'dojo' ? 'text-red-400' : 'text-yellow-400'}`}>
                     {room === 'dojo' ? 'THE DOJO' : 'TOWN'}
                 </h2>
                 <p className="text-[10px] opacity-70 mt-1">WASD Move • E Enter/Emotes • Mouse Orbit</p>
             </div>

             {/* Chat Input - Bottom */}
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

             {/* Exit Button - Bottom Right */}
             <button 
                className="absolute bottom-4 right-4 bg-red-600/80 hover:bg-red-500 text-white px-3 py-2 rounded-lg retro-text text-xs z-20 pointer-events-auto backdrop-blur-sm transition-colors"
                onClick={onExitToDesigner}
             >
                ✕ EXIT GAME
             </button>
             
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

