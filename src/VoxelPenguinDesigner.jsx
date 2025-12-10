import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VOXEL_SIZE, PALETTE } from './constants';
import { ASSETS } from './assets';
import { generateBaseBody, generateFlippers, generateFeet, generateHead } from './generators';
import { IconSettings, IconChevronLeft, IconChevronRight, IconCamera, IconWorld } from './Icons';

function VoxelPenguinDesigner({ onEnterWorld, currentData, updateData }) {
    const mountRef = useRef(null);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    
    const [skinColor, setSkinColor] = useState(currentData?.skin || 'blue');
    const [hat, setHat] = useState(currentData?.hat || 'none');
    const [eyes, setEyes] = useState(currentData?.eyes || 'normal');
    const [mouth, setMouth] = useState(currentData?.mouth || 'beak');
    const [bodyItem, setBodyItem] = useState(currentData?.bodyItem || 'none');
    
    useEffect(() => {
        if(updateData) updateData({skin: skinColor, hat, eyes, mouth, bodyItem});
    }, [skinColor, hat, eyes, mouth, bodyItem, updateData]);

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

        const bodyVoxels = generateBaseBody(PALETTE[skinColor] || skinColor);
        const headVoxels = generateHead(PALETTE[skinColor] || skinColor);
        const flippersLeft = generateFlippers(PALETTE[skinColor] || skinColor, true);
        const flippersRight = generateFlippers(PALETTE[skinColor] || skinColor, false);
        const feetVoxels = generateFeet();

        const hatVoxels = ASSETS.HATS[hat] || [];
        const eyeVoxels = ASSETS.EYES[eyes] || [];
        const mouthVoxels = ASSETS.MOUTH[mouth] || [];
        const bodyItemVoxels = ASSETS.BODY[bodyItem] || [];

        const addPart = (voxels, name) => {
            const partGroup = buildVoxelPart(voxels, PALETTE);
            partGroup.name = name;
            group.add(partGroup);
            if (mirrorGroup) {
                const mirrorPart = partGroup.clone();
                mirrorGroup.add(mirrorPart);
            }
        };

        addPart(bodyVoxels, 'body');
        addPart(headVoxels, 'head');
        addPart(flippersLeft, 'flipper_l');
        addPart(flippersRight, 'flipper_r');
        addPart(feetVoxels, 'feet');
        addPart(hatVoxels, 'hat');
        addPart(eyeVoxels, 'eyes');
        addPart(mouthVoxels, 'mouth');
        addPart(bodyItemVoxels, 'accessory');

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

    }, [scriptsLoaded, skinColor, hat, eyes, mouth, bodyItem]);

    const options = {
        skin: Object.keys(PALETTE).filter(k => !['floorLight','floorDark','wood','rug','glass','beerGold','mirrorFrame','mirrorGlass', 'asphalt', 'roadLine', 'buildingBrickRed', 'buildingBrickYellow', 'buildingBrickBlue', 'windowLight', 'windowDark', 'grass', 'snow', 'water', 'waterDeep', 'butterfly1', 'butterfly2', 'butterfly3'].includes(k) && !k.startsWith('tie') && !k.startsWith('shirt') && !k.startsWith('camo') && !k.startsWith('jeans')),
        head: Object.keys(ASSETS.HATS),
        eyes: Object.keys(ASSETS.EYES),
        mouth: Object.keys(ASSETS.MOUTH),
        body: Object.keys(ASSETS.BODY)
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
                        <IconSettings size={20} /> Wardrobe
                    </h2>

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
                    ].map((opt, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{opt.label}</span>
                            <div className="flex items-center justify-between bg-black/30 rounded-lg p-1">
                                <button 
                                    className="voxel-btn p-2 text-white hover:text-yellow-400"
                                    onClick={() => cycle(opt.val, opt.list, opt.set, -1)}
                                >
                                    <IconChevronLeft size={20} />
                                </button>
                                <span className="text-white font-medium text-sm capitalize truncate max-w-[120px] text-center">
                                    {opt.val.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <button 
                                    className="voxel-btn p-2 text-white hover:text-yellow-400"
                                    onClick={() => cycle(opt.val, opt.list, opt.set, 1)}
                                >
                                    <IconChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                    
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



