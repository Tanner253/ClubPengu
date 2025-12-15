import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VOXEL_SIZE, PALETTE } from './constants';
import { ASSETS } from './assets';
import { generateBaseBody, generateFlippers, generateFeet, generateHead } from './generators';
import { IconSettings, IconChevronLeft, IconChevronRight, IconCamera, IconWorld } from './Icons';
import { useMultiplayer } from './multiplayer';
import { characterRegistry, MarcusGenerators, MARCUS_PALETTE } from './characters';

function VoxelPenguinDesigner({ onEnterWorld, currentData, updateData }) {
    const mountRef = useRef(null);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    
    // Multiplayer context for username
    const { setName } = useMultiplayer();
    
    // Username state with localStorage persistence
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('penguin_name') || '';
    });
    
    // Character type state - 'penguin' is default, can unlock others via promo codes
    const [characterType, setCharacterType] = useState(() => {
        return localStorage.getItem('character_type') || 'penguin';
    });
    
    // Promo code input state
    const [promoCode, setPromoCode] = useState('');
    const [promoMessage, setPromoMessage] = useState(null); // { type: 'success'|'error', text: string }
    
    const [skinColor, setSkinColor] = useState(currentData?.skin || 'blue');
    const [hat, setHat] = useState(currentData?.hat || 'none');
    const [eyes, setEyes] = useState(currentData?.eyes || 'normal');
    const [mouth, setMouth] = useState(currentData?.mouth || 'beak');
    const [bodyItem, setBodyItem] = useState(currentData?.bodyItem || 'none');
    
    // Mount unlock system - BOATCOIN promo code required
    const [unlockedMounts, setUnlockedMounts] = useState(() => {
        try {
            const saved = localStorage.getItem('unlocked_mounts');
            return saved ? JSON.parse(saved) : ['none'];
        } catch {
            return ['none'];
        }
    });
    
    // Cosmetic unlock system - promo code required for special items
    const [unlockedCosmetics, setUnlockedCosmetics] = useState(() => {
        try {
            const saved = localStorage.getItem('unlocked_cosmetics');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    
    // Check if current mount is unlocked, reset to none if not
    const [mount, setMount] = useState(() => {
        const savedMount = currentData?.mount || 'none';
        const saved = localStorage.getItem('unlocked_mounts');
        const unlocked = saved ? JSON.parse(saved) : ['none'];
        // If mount is not unlocked, reset to none
        if (savedMount !== 'none' && !unlocked.includes(savedMount)) {
            return 'none';
        }
        return savedMount;
    });
    
    // Check if a mount is unlocked
    const isMountUnlocked = (mountId) => {
        return mountId === 'none' || unlockedMounts.includes(mountId);
    };
    
    // Save username to localStorage and multiplayer context when it changes
    const handleUsernameChange = (value) => {
        // Limit to 20 characters
        const trimmed = value.slice(0, 20);
        setUsername(trimmed);
        localStorage.setItem('penguin_name', trimmed);
        if (setName) setName(trimmed);
    };
    
    // Mount promo codes (case-sensitive)
    const MOUNT_PROMO_CODES = {
        'BOATCOIN': 'minecraftBoat'
    };
    
    // Cosmetic promo codes (case-sensitive) - { code: { id, category, name } } or { code: { items: [...], name } }
    const COSMETIC_PROMO_CODES = {
        'LMAO': { id: 'lmao', category: 'eyes', name: '😂 LMAO Face' },
        'JOE': { id: 'joe', category: 'bodyItem', name: '👻 Invisible Body' },
        'MISTORGOAT': { 
            items: [
                { id: 'mistorHair', category: 'hat' },
                { id: 'mistorEyes', category: 'eyes' },
                { id: 'mistorShirt', category: 'bodyItem' }
            ],
            skin: 'silver',  // Set feathers to soft grey/cream
            name: '🐐 Mistor Goat Set'
        }
    };
    
    // Check if a cosmetic is unlocked (or doesn't require unlock)
    const isCosmeticUnlocked = (cosmeticId) => {
        // Check if this cosmetic requires a promo code
        const requiresCode = Object.values(COSMETIC_PROMO_CODES).some(c => 
            c.id === cosmeticId || (c.items && c.items.some(i => i.id === cosmeticId))
        );
        if (!requiresCode) return true; // Doesn't require promo code
        return unlockedCosmetics.includes(cosmeticId);
    };
    
    // Handle promo code submission
    const handlePromoCodeSubmit = () => {
        if (!promoCode.trim()) return;
        
        // Check character promo codes first
        const result = characterRegistry.redeemPromoCode(promoCode);
        if (result) {
            setPromoMessage({ type: 'success', text: `🎉 Unlocked: ${result.name}!` });
            setCharacterType(result.id);
            localStorage.setItem('character_type', result.id);
            setPromoCode('');
            setTimeout(() => setPromoMessage(null), 3000);
            return;
        }
        
        // Check mount promo codes (case-sensitive)
        const mountId = MOUNT_PROMO_CODES[promoCode.trim()];
        if (mountId) {
            const newUnlocked = [...unlockedMounts, mountId];
            setUnlockedMounts(newUnlocked);
            localStorage.setItem('unlocked_mounts', JSON.stringify(newUnlocked));
            setMount(mountId); // Auto-equip the unlocked mount
            setPromoMessage({ type: 'success', text: `🚣 Unlocked: Minecraft Boat!` });
            setPromoCode('');
            setTimeout(() => setPromoMessage(null), 3000);
            return;
        }
        
        // Check cosmetic promo codes (case-sensitive)
        const cosmeticData = COSMETIC_PROMO_CODES[promoCode.trim()];
        if (cosmeticData) {
            // Handle multi-item promo codes
            if (cosmeticData.items) {
                const itemIds = cosmeticData.items.map(i => i.id);
                const newUnlocked = [...unlockedCosmetics, ...itemIds];
                setUnlockedCosmetics(newUnlocked);
                localStorage.setItem('unlocked_cosmetics', JSON.stringify(newUnlocked));
                // Auto-equip all items
                cosmeticData.items.forEach(item => {
                    if (item.category === 'eyes') setEyes(item.id);
                    else if (item.category === 'hat') setHat(item.id);
                    else if (item.category === 'mouth') setMouth(item.id);
                    else if (item.category === 'bodyItem') setBodyItem(item.id);
                });
                // Set skin color if specified
                if (cosmeticData.skin) {
                    setSkinColor(cosmeticData.skin);
                }
            } else {
                // Single item promo code
                const newUnlocked = [...unlockedCosmetics, cosmeticData.id];
                setUnlockedCosmetics(newUnlocked);
                localStorage.setItem('unlocked_cosmetics', JSON.stringify(newUnlocked));
                // Auto-equip based on category
                if (cosmeticData.category === 'eyes') setEyes(cosmeticData.id);
                else if (cosmeticData.category === 'hat') setHat(cosmeticData.id);
                else if (cosmeticData.category === 'mouth') setMouth(cosmeticData.id);
                else if (cosmeticData.category === 'bodyItem') setBodyItem(cosmeticData.id);
            }
            setPromoMessage({ type: 'success', text: `🎉 Unlocked: ${cosmeticData.name}!` });
            setPromoCode('');
            setTimeout(() => setPromoMessage(null), 3000);
            return;
        }
        
        setPromoMessage({ type: 'error', text: 'Invalid promo code' });
        setTimeout(() => setPromoMessage(null), 2000);
    };
    
    // Handle character type change
    const handleCharacterTypeChange = (typeId) => {
        if (characterRegistry.isUnlocked(typeId)) {
            setCharacterType(typeId);
            localStorage.setItem('character_type', typeId);
        }
    };
    
    // Get current character config
    const currentCharacter = characterRegistry.getCharacter(characterType);
    const unlockedCharacters = characterRegistry.getAvailableCharacterIds();
    
    useEffect(() => {
        if(updateData) updateData({skin: skinColor, hat, eyes, mouth, bodyItem, mount, characterType});
    }, [skinColor, hat, eyes, mouth, bodyItem, mount, characterType, updateData]);

    const sceneRef = useRef(null);
    const penguinRef = useRef(null);
    const reflectionRef = useRef(null); 
    const particlesRef = useRef([]);
    const lasersRef = useRef([]); 
    const timeRef = useRef(0);
    const spinRef = useRef(0); 
    const reqRef = useRef(null);
    const rendererRef = useRef(null);

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

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color('#2c3e50');
        scene.fog = new THREE.Fog('#2c3e50', 20, 60);
        
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(20, 20, 30);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);
        
        const warmLight = new THREE.PointLight(0xFFDDAA, 1.2, 50);
        warmLight.position.set(0, 15, 5);
        scene.add(warmLight);
        
        const rimLight = new THREE.SpotLight(0x4455ff, 1.5);
        rimLight.position.set(-20, 10, -10);
        scene.add(rimLight);

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
            
            mountGroup.position.y = 0; // Mount sits at ground level
            group.add(mountGroup);
            
            // Also lower penguin to sit in the boat
            if (mountData.seatOffset) {
                group.position.y = (mountData.seatOffset.y || 0) * VOXEL_SIZE;
            }
        }

    }, [scriptsLoaded, skinColor, hat, eyes, mouth, bodyItem, mount, characterType]);

    const options = {
        skin: Object.keys(PALETTE).filter(k => !['floorLight','floorDark','wood','rug','glass','beerGold','mirrorFrame','mirrorGlass', 'asphalt', 'roadLine', 'buildingBrickRed', 'buildingBrickYellow', 'buildingBrickBlue', 'windowLight', 'windowDark', 'grass', 'snow', 'water', 'waterDeep', 'butterfly1', 'butterfly2', 'butterfly3'].includes(k) && !k.startsWith('tie') && !k.startsWith('shirt') && !k.startsWith('camo') && !k.startsWith('jeans')),
        head: Object.keys(ASSETS.HATS).filter(k => isCosmeticUnlocked(k)),
        eyes: Object.keys(ASSETS.EYES).filter(k => isCosmeticUnlocked(k)),
        mouth: Object.keys(ASSETS.MOUTH).filter(k => isCosmeticUnlocked(k)),
        body: Object.keys(ASSETS.BODY).filter(k => isCosmeticUnlocked(k)),
        mounts: Object.keys(ASSETS.MOUNTS || {})
    };
    
    const cycle = (current, list, setter, dir) => {
        const idx = list.indexOf(current);
        let nextIdx = idx + dir;
        if(nextIdx < 0) nextIdx = list.length - 1;
        if(nextIdx >= list.length) nextIdx = 0;
        setter(list[nextIdx]);
    };

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden font-sans">
            <div ref={mountRef} className="absolute inset-0 z-0" />
            
            <div className="absolute top-0 left-0 p-6 z-10 w-full pointer-events-none">
                <h1 className="retro-text text-4xl text-white drop-shadow-lg" style={{textShadow: '4px 4px 0px #000'}}>
                    PENGUIN MAKER <span className="text-yellow-400 text-sm align-top">DELUXE</span>
                </h1>
            </div>

            <div className="absolute bottom-10 right-10 z-10 w-80 pointer-events-auto">
                <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
                    <h2 className="text-white font-bold text-lg mb-2 flex items-center gap-2 sticky top-0 bg-gray-900/50 p-2 rounded backdrop-blur-md z-20">
                        <IconSettings size={20} /> {characterType === 'penguin' ? 'Wardrobe' : currentCharacter?.name || 'Character'}
                    </h2>

                    {/* Customization options - ONLY for penguin character */}
                    {characterType === 'penguin' ? (
                        <>
                            <div className="flex flex-col gap-2 text-white">
                                <span className="font-semibold text-xs text-gray-300 uppercase tracking-wider">Feathers ({options.skin.length})</span>
                                <div className="grid grid-cols-6 gap-2">
                                    {options.skin.map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => setSkinColor(c)}
                                            title={c}
                                            className={`w-8 h-8 rounded-full border-2 ${skinColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70'} transition-all hover:scale-105`}
                                            style={{backgroundColor: PALETTE[c] || c}}
                                        />
                                    ))}
                                </div>
                            </div>

                            <hr className="border-gray-600/50" />

                            {[
                                { label: `HEADWEAR (${options.head.length})`, val: hat, set: setHat, list: options.head },
                                { label: `EYES (${options.eyes.length})`, val: eyes, set: setEyes, list: options.eyes },
                                { label: `MOUTH (${options.mouth.length})`, val: mouth, set: setMouth, list: options.mouth },
                                { label: `CLOTHING (${options.body.length})`, val: bodyItem, set: setBodyItem, list: options.body },
                                { label: `MOUNTS (${options.mounts.length})`, val: mount, set: setMount, list: options.mounts, isMount: true },
                            ].map((opt, i) => (
                                <div key={i} className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        {opt.label}
                                        {opt.isMount && <span className="text-orange-400 ml-1">(PROMO)</span>}
                                    </span>
                                    <div className="flex items-center justify-between bg-black/30 rounded-lg p-1">
                                        <button 
                                            className="voxel-btn p-2 text-white hover:text-yellow-400"
                                            onClick={() => {
                                                if (opt.isMount) {
                                                    // Only cycle to unlocked mounts
                                                    const unlockedList = opt.list.filter(m => isMountUnlocked(m));
                                                    cycle(opt.val, unlockedList, opt.set, -1);
                                                } else {
                                                    cycle(opt.val, opt.list, opt.set, -1);
                                                }
                                            }}
                                        >
                                            <IconChevronLeft size={20} />
                                        </button>
                                        <span className={`font-medium text-sm capitalize truncate max-w-[120px] text-center ${
                                            opt.isMount && !isMountUnlocked(opt.val) ? 'text-red-400' : 'text-white'
                                        }`}>
                                            {opt.isMount && !isMountUnlocked(opt.val) 
                                                ? `🔒 ${opt.val.replace(/([A-Z])/g, ' $1').trim()}`
                                                : opt.val.replace(/([A-Z])/g, ' $1').trim()
                                            }
                                        </span>
                                        <button 
                                            className="voxel-btn p-2 text-white hover:text-yellow-400"
                                            onClick={() => {
                                                if (opt.isMount) {
                                                    // Only cycle to unlocked mounts
                                                    const unlockedList = opt.list.filter(m => isMountUnlocked(m));
                                                    cycle(opt.val, unlockedList, opt.set, 1);
                                                } else {
                                                    cycle(opt.val, opt.list, opt.set, 1);
                                                }
                                            }}
                                        >
                                            <IconChevronRight size={20} />
                                        </button>
                                    </div>
                                    {opt.isMount && !isMountUnlocked('minecraftBoat') && (
                                        <p className="text-[10px] text-orange-400/80 text-center">Enter promo code to unlock mounts</p>
                                    )}
                                </div>
                            ))}
                        </>
                    ) : (
                        /* Special character info - no customization */
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
                    
                    {/* Username Input */}
                    <div className="mt-4">
                        <label className="block text-xs text-yellow-400 mb-1 retro-text">USERNAME</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            maxLength={20}
                            placeholder="Enter your name..."
                            className="w-full px-3 py-2 bg-black/50 border-2 border-yellow-500/50 rounded-lg text-white text-sm focus:border-yellow-400 focus:outline-none placeholder-white/30"
                        />
                        <p className="text-xs text-white/40 mt-1 text-right">{username.length}/20</p>
                    </div>
                    
                    {/* Promo Code Input */}
                    <div className="mt-2">
                        <label className="block text-xs text-purple-400 mb-1 retro-text">PROMO CODE</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={promoCode}
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === 'Enter' && handlePromoCodeSubmit()}
                                maxLength={20}
                                placeholder="Enter code..."
                                className="flex-1 px-3 py-2 bg-black/50 border-2 border-purple-500/50 rounded-lg text-white text-sm focus:border-purple-400 focus:outline-none placeholder-white/30 uppercase"
                            />
                            <button
                                onClick={handlePromoCodeSubmit}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                            >
                                REDEEM
                            </button>
                        </div>
                        {promoMessage && (
                            <p className={`text-xs mt-1 ${promoMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {promoMessage.text}
                            </p>
                        )}
                    </div>
                    
                    {/* Character Selector - only show if multiple characters unlocked */}
                    {unlockedCharacters.length > 1 && (
                        <div className="mt-4">
                            <label className="block text-xs text-cyan-400 mb-2 retro-text">CHARACTER</label>
                            <div className="flex gap-2">
                                {unlockedCharacters.map(charId => {
                                    const char = characterRegistry.getCharacter(charId);
                                    if (!char) return null;
                                    return (
                                        <button
                                            key={charId}
                                            onClick={() => handleCharacterTypeChange(charId)}
                                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
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
                    
                    <button 
                        onClick={onEnterWorld}
                        className="mt-4 w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg shadow-lg transform active:scale-95 transition-all retro-text text-xs border-b-4 border-yellow-700 flex justify-center items-center gap-2"
                    >
                        <IconWorld size={16} /> ENTER WORLD
                    </button>
                </div>
            </div>
            
            <div className="absolute bottom-4 left-6 text-white/30 text-xs flex items-center gap-2">
                <IconCamera size={14} /> Click & Drag to Rotate • Scroll to Zoom
            </div>

            {!scriptsLoaded && (
                <div className="absolute inset-0 bg-black flex items-center justify-center text-white retro-text z-50">
                    LOADING ENGINE...
                </div>
            )}
        </div>
    );
}

export default VoxelPenguinDesigner;



