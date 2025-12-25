/**
 * BattleshipGame - PvE Battleship Game (Arcade Machine)
 * 
 * Full voxel battleship game vs AI opponent
 * Rendered as standalone game from arcade machine interaction
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

// --- GAME CONFIG ---
const CONFIG = {
    gridSize: 10,
    cellSize: 2,
    boardElevation: 3.5,
    ships: [
        { name: "Carrier", size: 5, color: 0x34495e, accent: 0xe67e22 },
        { name: "Battleship", size: 4, color: 0x2c3e50, accent: 0xc0392b },
        { name: "Cruiser", size: 3, color: 0x7f8c8d, accent: 0x27ae60 },
        { name: "Submarine", size: 3, color: 0x2c2c2c, accent: 0xf1c40f },
        { name: "Destroyer", size: 2, color: 0x95a5a6, accent: 0x2980b9 }
    ],
    colors: {
        waterDeep: new THREE.Color(0x0a3d62),
        waterShallow: new THREE.Color(0x3c6382),
        hit: 0xe74c3c,
        miss: 0xecf0f1,
        markerHit: 0xff3333,
        markerMiss: 0xaaaaaa
    },
    offsets: {
        player: -15,
        enemy: 15
    }
};

// Helper to place ships randomly
function placeShipsRandomly() {
    const grid = Array(CONFIG.gridSize * CONFIG.gridSize).fill(null);
    const ships = [];
    
    for (const shipTemplate of CONFIG.ships) {
        let placed = false;
        let attempts = 0;
        while (!placed && attempts < 100) {
            attempts++;
            const horizontal = Math.random() > 0.5;
            const x = Math.floor(Math.random() * CONFIG.gridSize);
            const y = Math.floor(Math.random() * CONFIG.gridSize);
            
            if (horizontal && x + shipTemplate.size > CONFIG.gridSize) continue;
            if (!horizontal && y + shipTemplate.size > CONFIG.gridSize) continue;
            
            let canPlace = true;
            const positions = [];
            for (let i = 0; i < shipTemplate.size; i++) {
                const px = horizontal ? x + i : x;
                const py = horizontal ? y : y + i;
                const idx = py * CONFIG.gridSize + px;
                if (grid[idx] !== null) {
                    canPlace = false;
                    break;
                }
                positions.push(idx);
            }
            
            if (canPlace) {
                const shipId = `ship_${ships.length}`;
                positions.forEach(idx => grid[idx] = shipId);
                ships.push({
                    id: shipId,
                    name: shipTemplate.name,
                    size: shipTemplate.size,
                    positions,
                    hits: 0,
                    sunk: false
                });
                placed = true;
            }
        }
    }
    
    return { grid, ships };
}

// --- PARTICLE SYSTEM ---
class FXSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.cubeGeo = new THREE.BoxGeometry(1, 1, 1);
        this.ringGeo = new THREE.RingGeometry(0.5, 1, 32);
    }

    createExplosion(pos, color, count = 15) {
        const mat = new THREE.MeshBasicMaterial({ color });
        
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.cubeGeo, mat.clone());
            const size = 0.2 + Math.random() * 0.3;
            mesh.scale.set(size, size, size);
            mesh.position.copy(pos);
            
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                Math.random() * 2 + 0.5,
                (Math.random() - 0.5) * 1.5
            );

            this.scene.add(mesh);
            this.particles.push({ mesh, vel, life: 1.0, type: 'debris' });
        }

        const ringMat = new THREE.MeshBasicMaterial({ 
            color, transparent: true, opacity: 0.8, side: THREE.DoubleSide 
        });
        const ring = new THREE.Mesh(this.ringGeo, ringMat);
        ring.position.copy(pos);
        ring.position.y += 0.1;
        ring.rotation.x = -Math.PI / 2;
        ring.scale.set(0.1, 0.1, 0.1);
        this.scene.add(ring);
        this.particles.push({ mesh: ring, life: 1.0, type: 'ring' });

        const light = new THREE.PointLight(color, 2, 10);
        light.position.copy(pos);
        light.position.y += 2;
        this.scene.add(light);
        this.particles.push({ mesh: light, life: 0.2, type: 'flash' });
    }

    createSplash(pos) {
        this.createExplosion(pos, 0xffffff, 8);
    }

    createProjectile(start, end, onComplete) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.3, 0.6),
            new THREE.MeshBasicMaterial({ color: 0xffaa00 })
        );
        this.scene.add(mesh);

        const controlPoint = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 20, 0));
        const animObj = { t: 0 };

        gsap.to(animObj, {
            t: 1,
            duration: 0.8,
            ease: "power2.inOut",
            onUpdate: () => {
                const t = animObj.t;
                mesh.position.x = (1-t)*(1-t)*start.x + 2*(1-t)*t*controlPoint.x + t*t*end.x;
                mesh.position.y = (1-t)*(1-t)*start.y + 2*(1-t)*t*controlPoint.y + t*t*end.y;
                mesh.position.z = (1-t)*(1-t)*start.z + 2*(1-t)*t*controlPoint.z + t*t*end.z;
                mesh.lookAt(end);
            },
            onComplete: () => {
                this.scene.remove(mesh);
                if (onComplete) onComplete();
            }
        });
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life -= 0.02;

            if (p.type === 'debris') {
                p.vel.y -= 0.05;
                p.mesh.position.add(p.vel);
                p.mesh.rotation.x += p.vel.z;
                p.mesh.scale.setScalar(p.life * 0.5);
            } else if (p.type === 'ring') {
                const s = 1.0 + (1.0 - p.life) * 4;
                p.mesh.scale.set(s, s, s);
                p.mesh.material.opacity = p.life;
            }

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                if (p.mesh.geometry) p.mesh.geometry.dispose();
                if (p.mesh.material) p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    dispose() {
        this.particles.forEach(p => {
            this.scene.remove(p.mesh);
            if (p.mesh.geometry) p.mesh.geometry.dispose();
            if (p.mesh.material) p.mesh.material.dispose();
        });
        this.particles = [];
    }
}

// --- SHIP FACTORY ---
class ShipFactory {
    static getMaterials(baseColor, accentColor) {
        return {
            hull: new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.3, metalness: 0.6, flatShading: true }),
            deck: new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.8, flatShading: true }),
            accent: new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, emissive: accentColor, emissiveIntensity: 0.2, flatShading: true }),
            dark: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, flatShading: true })
        };
    }

    static addVoxel(group, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        return mesh;
    }

    static build(template) {
        const group = new THREE.Group();
        const mats = this.getMaterials(template.color, template.accent);
        const box = new THREE.BoxGeometry(1, 1, 1);
        const length = template.size * 2;
        const width = 1.6;
        const centerOffset = (template.size * 2) / 2 - 1;

        switch (template.name) {
            case "Carrier":
                this.addVoxel(group, box, mats.hull, length/2 - 1, 0.5, 0, length, 1.2, width);
                this.addVoxel(group, box, mats.deck, length/2 - 1, 1.15, 0, length, 0.1, width * 1.2);
                this.addVoxel(group, box, mats.hull, length - 3, 1.8, -0.6, 1.5, 1.2, 0.6);
                this.addVoxel(group, box, mats.accent, length - 2.8, 2.5, -0.6, 0.1, 1.5, 0.1);
                this.addVoxel(group, box, mats.accent, length/2 - 1, 1.21, 0, length * 0.8, 0.01, 0.2);
                break;

            case "Battleship":
                this.addVoxel(group, box, mats.hull, length/2 - 1, 0.6, 0, length, 1.2, width);
                this.addVoxel(group, box, mats.hull, length/2 - 1, 1.2, 0, length * 0.6, 0.6, width * 0.8);
                this.addVoxel(group, box, mats.hull, length/2, 1.8, 0, 1.5, 1.0, 1.0);
                this.addVoxel(group, box, mats.dark, length/2 + 0.5, 2.0, 0, 0.5, 0.2, 0.8);
                [1.5, length - 2.5].forEach(x => {
                    this.addVoxel(group, box, mats.hull, x, 1.4, 0, 1.2, 0.5, 1.0);
                    this.addVoxel(group, box, mats.dark, x + 0.5, 1.4, 0, 1.5, 0.15, 0.2);
                });
                break;

            case "Cruiser":
                this.addVoxel(group, box, mats.hull, length/2 - 1, 0.5, 0, length, 1.0, width * 0.8);
                this.addVoxel(group, box, mats.hull, length/2 - 1, 1.2, 0, 2.5, 0.8, 0.8);
                const dish = this.addVoxel(group, box, mats.accent, length/2 - 1, 2.2, 0, 0.1, 0.6, 0.6);
                dish.rotation.z = 0.5;
                this.addVoxel(group, box, mats.dark, 1.0, 1.0, 0, 0.8, 0.3, 0.3);
                break;

            case "Submarine":
                this.addVoxel(group, box, mats.hull, length/2 - 1, 0.4, 0, length, 0.8, 1.0);
                this.addVoxel(group, box, mats.hull, length/2 - 0.5, 1.0, 0, 1.2, 0.8, 0.6);
                this.addVoxel(group, box, mats.accent, length/2 - 0.5, 1.5, 0, 0.1, 0.8, 0.1);
                this.addVoxel(group, box, mats.hull, 0.5, 0.4, 0, 0.5, 0.1, 1.5);
                break;

            case "Destroyer":
            default:
                this.addVoxel(group, box, mats.hull, length/2 - 1, 0.5, 0, length, 1.0, width * 0.7);
                this.addVoxel(group, box, mats.hull, length - 2, 1.2, 0, 1.5, 0.6, 0.8);
                this.addVoxel(group, box, mats.dark, length/2, 1.2, 0, 0.5, 0.5, 0.5);
                break;
        }

        const greebleCount = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < greebleCount; i++) {
            const gx = Math.random() * (length - 2) + 1;
            const gz = (Math.random() - 0.5) * 0.8;
            this.addVoxel(group, box, mats.dark, gx, 1.05, gz, 0.2, 0.2, 0.2);
        }

        group.children.forEach(c => c.position.x -= centerOffset);
        return group;
    }
}

// --- BOARD CLASS ---
class Board {
    constructor(scene, isPlayer, offsetX, fx) {
        this.scene = scene;
        this.isPlayer = isPlayer;
        this.fx = fx;
        this.size = CONFIG.gridSize;
        this.root = new THREE.Group();
        this.root.position.set(offsetX, CONFIG.boardElevation, 0);
        this.scene.add(this.root);
        this.shipMeshes = [];
        this.markers = [];
        this.cells = [];
        this.ships = [];
        
        this.initGrid();
    }

    initGrid() {
        const fullSize = this.size * CONFIG.cellSize;
        
        const baseGeo = new THREE.BoxGeometry(fullSize, 0.5, fullSize);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -0.25;
        base.receiveShadow = true;
        this.root.add(base);

        const grid = new THREE.GridHelper(fullSize, this.size, 0x444444, 0x222222);
        grid.position.y = 0.05;
        this.root.add(grid);

        const curGeo = new THREE.BoxGeometry(CONFIG.cellSize, 0.2, CONFIG.cellSize);
        const curMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.6 });
        this.cursor = new THREE.Mesh(curGeo, curMat);
        this.cursor.visible = false;
        this.root.add(this.cursor);
        
        // Initialize cells
        for (let i = 0; i < this.size * this.size; i++) {
            this.cells.push({ hasShip: false, isHit: false, ship: null });
        }
    }

    placeShipsRandomly() {
        const { grid, ships } = placeShipsRandomly();
        this.ships = ships;
        
        // Update cells
        for (let i = 0; i < grid.length; i++) {
            if (grid[i]) {
                this.cells[i].hasShip = true;
                this.cells[i].ship = ships.find(s => s.id === grid[i]);
            }
        }
        
        // Render ship meshes
        this.renderShips();
    }

    renderShips() {
        this.shipMeshes.forEach(m => this.root.remove(m));
        this.shipMeshes = [];
        
        this.ships.forEach(ship => {
            const template = CONFIG.ships.find(s => s.name === ship.name) || CONFIG.ships[0];
            const shipMesh = ShipFactory.build({ ...template, size: ship.size });
            
            const firstIdx = ship.positions[0];
            const lastIdx = ship.positions[ship.positions.length - 1];
            const firstX = firstIdx % CONFIG.gridSize;
            const firstY = Math.floor(firstIdx / CONFIG.gridSize);
            const lastX = lastIdx % CONFIG.gridSize;
            const lastY = Math.floor(lastIdx / CONFIG.gridSize);
            
            const horizontal = firstY === lastY;
            const step = CONFIG.cellSize;
            const centerOffset = (CONFIG.gridSize * step) / 2 - (step / 2);
            
            const startX = (firstX * step) - centerOffset;
            const startZ = (firstY * step) - centerOffset;
            
            let mx, mz;
            if (horizontal) {
                mx = startX + ((ship.size - 1) * step / 2);
                mz = startZ;
                shipMesh.rotation.y = 0;
            } else {
                mx = startX;
                mz = startZ + ((ship.size - 1) * step / 2);
                shipMesh.rotation.y = Math.PI / 2;
            }
            
            shipMesh.position.set(mx, ship.sunk ? -1 : 0, mz);
            
            if (!this.isPlayer) {
                shipMesh.visible = false;
                shipMesh.position.y = -5;
            }
            
            if (ship.sunk) {
                shipMesh.children.forEach(c => {
                    if (c.material) {
                        c.material = c.material.clone();
                        c.material.color.multiplyScalar(0.2);
                        if (c.material.emissive) c.material.emissive.setHex(0x000000);
                    }
                });
            }
            
            this.root.add(shipMesh);
            this.shipMeshes.push(shipMesh);
            ship.mesh = shipMesh;
        });
    }

    getCellWorldPosition(cellIndex) {
        const x = cellIndex % CONFIG.gridSize;
        const y = Math.floor(cellIndex / CONFIG.gridSize);
        const step = CONFIG.cellSize;
        const offset = (CONFIG.gridSize * step) / 2 - (step / 2);
        const localX = (x * step) - offset;
        const localZ = (y * step) - offset;
        const vec = new THREE.Vector3(localX, 0.5, localZ);
        return vec.applyMatrix4(this.root.matrixWorld);
    }

    addMarker(cellIndex, isHit) {
        const x = cellIndex % CONFIG.gridSize;
        const y = Math.floor(cellIndex / CONFIG.gridSize);
        const step = CONFIG.cellSize;
        const offset = (CONFIG.gridSize * step) / 2 - (step / 2);
        const localX = (x * step) - offset;
        const localZ = (y * step) - offset;

        const col = isHit ? CONFIG.colors.markerHit : CONFIG.colors.markerMiss;
        const geo = new THREE.CylinderGeometry(0.3, 0.3, 1, 16);
        const mat = new THREE.MeshStandardMaterial({ color: col, emissive: isHit ? 0xaa0000 : 0x000000 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(localX, 0.5, localZ);
        
        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out" });
        
        this.root.add(mesh);
        this.markers.push(mesh);
    }

    sinkShip(ship) {
        if (!ship.mesh) return;
        
        ship.mesh.visible = true;
        ship.mesh.position.y = -1;
        gsap.to(ship.mesh.position, { y: 0, duration: 0.5 });
        
        ship.mesh.children.forEach(c => {
            if (c.material) {
                c.material = c.material.clone();
                c.material.color.multiplyScalar(0.2);
                if (c.material.emissive) c.material.emissive.setHex(0x000000);
            }
        });
        
        setTimeout(() => {
            gsap.to(ship.mesh.position, { y: -10, duration: 5, ease: "power2.in" });
            gsap.to(ship.mesh.rotation, { z: (Math.random() - 0.5), x: (Math.random() - 0.5) * 0.5, duration: 5 });
        }, 1000);
    }

    checkAllSunk() {
        return this.ships.every(s => s.sunk);
    }

    setCursorVisible(visible, cellIndex = 0) {
        this.cursor.visible = visible;
        if (visible) {
            const x = cellIndex % CONFIG.gridSize;
            const y = Math.floor(cellIndex / CONFIG.gridSize);
            const step = CONFIG.cellSize;
            const offset = (CONFIG.gridSize * step) / 2 - (step / 2);
            this.cursor.position.set((x * step) - offset, 0.2, (y * step) - offset);
        }
    }

    dispose() {
        this.shipMeshes.forEach(m => {
            m.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        });
        this.markers.forEach(m => {
            m.geometry.dispose();
            m.material.dispose();
        });
        this.root.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        this.scene.remove(this.root);
    }
}

// === MAIN COMPONENT ===
const BattleshipGame = ({ onClose }) => {
    const containerRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const cameraTargetRef = useRef({ x: CONFIG.offsets.player, y: 0 });
    const playerBoardRef = useRef(null);
    const enemyBoardRef = useRef(null);
    const fxRef = useRef(null);
    const animationIdRef = useRef(null);
    
    const [gamePhase, setGamePhase] = useState('setup'); // setup, playing, playerTurn, enemyTurn, gameOver
    const [winner, setWinner] = useState(null);
    const [log, setLog] = useState(['System Online... Deploy your fleet.']);
    const [isAnimating, setIsAnimating] = useState(false);
    const [playerSunk, setPlayerSunk] = useState(0);
    const [enemySunk, setEnemySunk] = useState(0);
    const [selectedCell, setSelectedCell] = useState(null); // For mobile fire button
    
    // Shot tracking for AI
    const playerShotsRef = useRef(Array(100).fill(null));
    const enemyShotsRef = useRef(Array(100).fill(null));
    const aiHitsRef = useRef([]); // Track hits for hunt mode

    const addLog = useCallback((msg, type = '') => {
        setLog(prev => [`> ${msg}`, ...prev.slice(0, 7)]);
    }, []);

    // Initialize 3D scene
    useEffect(() => {
        if (!containerRef.current) return;
        
        const container = containerRef.current;
        const scene = new THREE.Scene();
        // No fog - keep it bright and clear
        scene.background = new THREE.Color(0x1a5276); // Brighter blue sky
        sceneRef.current = scene;

        // Check if mobile portrait
        const isPortrait = container.clientHeight > container.clientWidth;
        
        const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 1000);
        // Position camera higher and further back for better view, especially on mobile
        const camY = isPortrait ? 55 : 40;
        const camZ = isPortrait ? 55 : 40;
        camera.position.set(CONFIG.offsets.player, camY, camZ);
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        // Lights - very bright for excellent visibility
        const ambient = new THREE.HemisphereLight(0xffffff, 0x87ceeb, 1.4);
        scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 2.0);
        sun.position.set(50, 80, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        scene.add(sun);
        
        // Fill light for better visibility from all angles
        const fillLight = new THREE.DirectionalLight(0xaaccff, 0.8);
        fillLight.position.set(-30, 20, -30);
        scene.add(fillLight);
        
        // Front fill light
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.6);
        frontLight.position.set(0, 30, 60);
        scene.add(frontLight);

        // Animated Water with shader (from source code)
        const waterGeo = new THREE.PlaneGeometry(300, 300, 100, 100);
        const waterUniforms = {
            uTime: { value: 0 },
            color1: { value: CONFIG.colors.waterDeep },
            color2: { value: CONFIG.colors.waterShallow },
            sunColor: { value: sun.color },
            sunDirection: { value: sun.position.clone().normalize() }
        };
        
        const waterMat = new THREE.ShaderMaterial({
            uniforms: waterUniforms,
            vertexShader: `
                varying vec3 vViewPosition;
                varying vec3 vWorldPosition;
                uniform float uTime;
                
                // Simplex Noise
                vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
                float snoise(vec2 v) {
                    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                    vec2 i  = floor(v + dot(v, C.yy) );
                    vec2 x0 = v -   i + dot(i, C.xx);
                    vec2 i1;
                    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                    vec4 x12 = x0.xyxy + C.xxzz;
                    x12.xy -= i1;
                    i = mod289(i);
                    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                    m = m*m ;
                    m = m*m ;
                    vec3 x = 2.0 * fract(p * C.www) - 1.0;
                    vec3 h = abs(x) - 0.5;
                    vec3 ox = floor(x + 0.5);
                    vec3 a0 = x - ox;
                    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                    vec3 g;
                    g.x  = a0.x  * x0.x  + h.x  * x0.y;
                    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                    return 130.0 * dot(m, g);
                }

                void main() {
                    vec3 transformed = position;
                    // Multiple wave layers
                    float wave1 = snoise(vec2(position.x * 0.05, position.y * 0.05 + uTime * 0.5)) * 1.5;
                    float wave2 = snoise(vec2(position.x * 0.1 + 10.0, position.y * 0.1 + uTime * 0.8)) * 0.8;
                    float wave3 = snoise(vec2(position.x * 0.2 + 20.0, position.y * 0.2 + uTime * 1.2)) * 0.3;
                    transformed.z = wave1 + wave2 + wave3;

                    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    vViewPosition = -mvPosition.xyz;
                    vWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 sunColor;
                uniform vec3 sunDirection;
                varying vec3 vViewPosition;
                varying vec3 vWorldPosition;

                void main() {
                    // Flat shading for low poly look
                    vec3 fdx = dFdx(vViewPosition);
                    vec3 fdy = dFdy(vViewPosition);
                    vec3 normal = normalize(cross(fdx, fdy));

                    float diffuse = max(dot(normal, sunDirection), 0.0);
                    
                    // Mix water colors based on height
                    vec3 waterCol = mix(color1, color2, diffuse * 0.8);
                    
                    vec3 viewDir = normalize(vViewPosition);
                    vec3 reflectDir = reflect(-sunDirection, normal);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 50.0);
                    
                    // Simple foam/rim approximation
                    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
                    rim = pow(rim, 3.0);

                    vec3 finalColor = waterCol * (0.4 + 0.6 * diffuse);
                    finalColor += sunColor * spec * 0.8;
                    finalColor += vec3(0.8, 0.9, 1.0) * rim * 0.3;

                    gl_FragColor = vec4(finalColor, 0.92);
                }
            `,
            transparent: true
        });
        
        const waterMesh = new THREE.Mesh(waterGeo, waterMat);
        waterMesh.rotation.x = -Math.PI / 2;
        scene.add(waterMesh);

        // FX System
        const fx = new FXSystem(scene);
        fxRef.current = fx;

        // Boards
        const playerBoard = new Board(scene, true, CONFIG.offsets.player, fx);
        const enemyBoard = new Board(scene, false, CONFIG.offsets.enemy, fx);
        playerBoardRef.current = playerBoard;
        enemyBoardRef.current = enemyBoard;
        
        // Place ships
        playerBoard.placeShipsRandomly();
        enemyBoard.placeShipsRandomly();

        // Raycaster for clicking
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        let hoveredCell = null;

        // Detect mobile
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        const onMouseMove = (e) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        };

        const onClick = (e) => {
            // Update mouse position from click/touch
            const rect = renderer.domElement.getBoundingClientRect();
            const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX);
            const clientY = e.clientY || (e.changedTouches && e.changedTouches[0]?.clientY);
            if (!clientX || !clientY) return;
            
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            
            const phase = window.battleshipGamePhase;
            if (phase !== 'playerTurn' && phase !== 'playing') return;
            
            // Calculate cell directly from touch/click position (don't rely on animation loop)
            raycaster.setFromCamera(mouse, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CONFIG.boardElevation);
            const hitPoint = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, hitPoint);
            
            if (!hitPoint) return;
            
            const localX = hitPoint.x - CONFIG.offsets.enemy;
            const localZ = hitPoint.z;
            const step = CONFIG.cellSize;
            const gridHalf = (CONFIG.gridSize * step) / 2;
            
            const gx = Math.floor((localX + gridHalf) / step);
            const gy = Math.floor((localZ + gridHalf) / step);
            
            // Check if within grid bounds
            if (gx < 0 || gx >= CONFIG.gridSize || gy < 0 || gy >= CONFIG.gridSize) return;
            
            const cellIndex = gy * CONFIG.gridSize + gx;
            
            // Check if cell hasn't been shot yet
            if (playerShotsRef.current[cellIndex] !== null) return;
            
            // Update hoveredCell for visual feedback
            hoveredCell = cellIndex;
            enemyBoard.setCursorVisible(true, cellIndex);
            
            if (isMobileDevice) {
                // On mobile: select the cell, don't fire immediately
                window.battleshipSelectedCell = cellIndex;
                setSelectedCell(cellIndex);
            } else {
                // On desktop: fire immediately
                window.dispatchEvent(new CustomEvent('battleship_fire', { detail: { cell: cellIndex } }));
            }
        };

        renderer.domElement.addEventListener('mousemove', onMouseMove);
        renderer.domElement.addEventListener('click', onClick);
        renderer.domElement.addEventListener('touchend', onClick);

        const clock = new THREE.Clock();
        
        // Function to move camera smoothly with gsap
        const moveCameraTo = (targetOffset) => {
            const camY = isPortrait ? 55 : 35;
            const camZ = isPortrait ? 55 : 35;
            
            gsap.to(camera.position, {
                x: targetOffset,
                y: camY,
                z: camZ,
                duration: 1.5,
                ease: "power3.inOut"
            });
            
            gsap.to(cameraTargetRef.current, {
                x: targetOffset,
                duration: 1.5,
                ease: "power3.inOut"
            });
        };
        
        // Store camera move function globally for external use
        window.battleshipMoveCameraTo = moveCameraTo;
        
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            
            // Camera looks at target
            camera.lookAt(cameraTargetRef.current.x, 0, 0);
            
            // Update FX
            fx.update();
            
            // Update hover (only during player turn)
            raycaster.setFromCamera(mouse, camera);
            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CONFIG.boardElevation);
            const target = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, target);
            
            // Check current game phase from ref
            const currentPhase = window.battleshipGamePhase;
            if (target && (currentPhase === 'playerTurn' || currentPhase === 'playing')) {
                const localX = target.x - CONFIG.offsets.enemy;
                const localZ = target.z;
                const step = CONFIG.cellSize;
                const gridHalf = (CONFIG.gridSize * step) / 2;
                
                const gx = Math.floor((localX + gridHalf) / step);
                const gy = Math.floor((localZ + gridHalf) / step);
                
                if (gx >= 0 && gx < CONFIG.gridSize && gy >= 0 && gy < CONFIG.gridSize) {
                    const cellIndex = gy * CONFIG.gridSize + gx;
                    if (playerShotsRef.current[cellIndex] === null) {
                        enemyBoard.setCursorVisible(true, cellIndex);
                        hoveredCell = cellIndex;
                        container.style.cursor = 'crosshair';
                    } else {
                        enemyBoard.setCursorVisible(false);
                        hoveredCell = null;
                        container.style.cursor = 'default';
                    }
                } else {
                    enemyBoard.setCursorVisible(false);
                    hoveredCell = null;
                    container.style.cursor = 'default';
                }
            } else {
                enemyBoard.setCursorVisible(false);
                hoveredCell = null;
            }
            
            // Water animation - update shader time uniform
            if (waterUniforms) {
                waterUniforms.uTime.value = clock.getElapsedTime();
            }
            
            // Ship floating
            [playerBoard, enemyBoard].forEach(b => {
                const time = clock.getElapsedTime();
                b.shipMeshes.forEach((s, i) => {
                    if (s.position.y >= 0) {
                        s.position.y = Math.sin(time * 1.5 + i) * 0.05;
                        s.rotation.z = Math.sin(time + i) * 0.01;
                    }
                });
            });
            
            renderer.render(scene, camera);
        };
        
        animate();

        // Handle resize
        const onResize = () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', onResize);

        // Initialize game phase
        window.battleshipGamePhase = 'setup';

        return () => {
            cancelAnimationFrame(animationIdRef.current);
            window.removeEventListener('resize', onResize);
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            renderer.domElement.removeEventListener('click', onClick);
            renderer.domElement.removeEventListener('touchend', onClick);
            
            fx.dispose();
            playerBoard.dispose();
            enemyBoard.dispose();
            
            renderer.dispose();
            if (container && renderer.domElement.parentNode === container) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []); // Only run once

    // Handle player fire
    useEffect(() => {
        const handleFire = (e) => {
            if (isAnimating || (gamePhase !== 'playerTurn' && gamePhase !== 'playing')) return;
            
            const cellIndex = e.detail.cell;
            if (playerShotsRef.current[cellIndex] !== null) return;
            
            setIsAnimating(true);
            setSelectedCell(null); // Clear selection after firing
            window.battleshipSelectedCell = null;
            
            const enemyBoard = enemyBoardRef.current;
            const fx = fxRef.current;
            
            const startPos = new THREE.Vector3(CONFIG.offsets.player, 5 + CONFIG.boardElevation, 0);
            const targetPos = enemyBoard.getCellWorldPosition(cellIndex);
            
            const cell = enemyBoard.cells[cellIndex];
            const isHit = cell.hasShip;
            playerShotsRef.current[cellIndex] = isHit ? 'hit' : 'miss';
            
            fx.createProjectile(startPos, targetPos, () => {
                if (isHit) {
                    fx.createExplosion(targetPos, CONFIG.colors.hit);
                    enemyBoard.addMarker(cellIndex, true);
                    
                    const ship = cell.ship;
                    ship.hits++;
                    
                    if (ship.hits >= ship.size) {
                        ship.sunk = true;
                        enemyBoard.sinkShip(ship);
                        addLog(`*** ${ship.name.toUpperCase()} DESTROYED ***`, 'sunk');
                        setEnemySunk(prev => prev + 1);
                        
                        if (enemyBoard.checkAllSunk()) {
                            setWinner('player');
                            setGamePhase('gameOver');
                            window.battleshipGamePhase = 'gameOver';
                            addLog('VICTORY! Enemy fleet neutralized.');
                            setIsAnimating(false);
                            return;
                        }
                    } else {
                        addLog(`ENEMY UNIT HIT!`, 'hit');
                    }
                } else {
                    fx.createSplash(targetPos);
                    enemyBoard.addMarker(cellIndex, false);
                    addLog(`Miss...`, 'miss');
                }
                
                // Switch to enemy turn
                setGamePhase('enemyTurn');
                window.battleshipGamePhase = 'enemyTurn';
                if (window.battleshipMoveCameraTo) {
                    window.battleshipMoveCameraTo(CONFIG.offsets.player);
                }
                
                setTimeout(() => {
                    setIsAnimating(false);
                    doEnemyTurn();
                }, 1500);
            });
        };
        
        window.addEventListener('battleship_fire', handleFire);
        return () => window.removeEventListener('battleship_fire', handleFire);
    }, [isAnimating, gamePhase, addLog]);

    // Enemy AI turn
    const doEnemyTurn = useCallback(() => {
        const playerBoard = playerBoardRef.current;
        const fx = fxRef.current;
        
        // Simple AI: Hunt/Target mode
        let targetCell = null;
        
        // Check for adjacent to hits first (hunt mode)
        for (const hitIdx of aiHitsRef.current) {
            const x = hitIdx % CONFIG.gridSize;
            const y = Math.floor(hitIdx / CONFIG.gridSize);
            
            const adjacent = [
                y > 0 ? hitIdx - 10 : -1,
                y < 9 ? hitIdx + 10 : -1,
                x > 0 ? hitIdx - 1 : -1,
                x < 9 ? hitIdx + 1 : -1
            ].filter(c => c !== -1 && enemyShotsRef.current[c] === null);
            
            if (adjacent.length > 0) {
                targetCell = adjacent[Math.floor(Math.random() * adjacent.length)];
                break;
            }
        }
        
        // Random shot if no hunt target
        if (targetCell === null) {
            const unfired = [];
            for (let i = 0; i < 100; i++) {
                if (enemyShotsRef.current[i] === null) unfired.push(i);
            }
            targetCell = unfired[Math.floor(Math.random() * unfired.length)];
        }
        
        addLog('WARNING: Enemy targeting systems active.');
        
        setTimeout(() => {
            const startPos = new THREE.Vector3(CONFIG.offsets.enemy, 5 + CONFIG.boardElevation, 0);
            const targetPos = playerBoard.getCellWorldPosition(targetCell);
            
            const cell = playerBoard.cells[targetCell];
            const isHit = cell.hasShip;
            enemyShotsRef.current[targetCell] = isHit ? 'hit' : 'miss';
            
            if (isHit) {
                aiHitsRef.current.push(targetCell);
            }
            
            fx.createProjectile(startPos, targetPos, () => {
                if (isHit) {
                    fx.createExplosion(targetPos, CONFIG.colors.hit);
                    playerBoard.addMarker(targetCell, true);
                    
                    const ship = cell.ship;
                    ship.hits++;
                    
                    if (ship.hits >= ship.size) {
                        ship.sunk = true;
                        // Remove sunk ship's hits from hunt list
                        aiHitsRef.current = aiHitsRef.current.filter(h => !ship.positions.includes(h));
                        addLog(`*** OUR ${ship.name.toUpperCase()} DESTROYED ***`, 'sunk');
                        setPlayerSunk(prev => prev + 1);
                        
                        // Darken ship
                        if (ship.mesh) {
                            ship.mesh.children.forEach(c => {
                                if (c.material) {
                                    c.material = c.material.clone();
                                    c.material.color.multiplyScalar(0.2);
                                }
                            });
                        }
                        
                        if (playerBoard.checkAllSunk()) {
                            setWinner('enemy');
                            setGamePhase('gameOver');
                            window.battleshipGamePhase = 'gameOver';
                            addLog('DEFEAT! Our fleet has been destroyed.');
                            return;
                        }
                    } else {
                        addLog(`OUR UNIT HIT!`, 'hit');
                    }
                } else {
                    fx.createSplash(targetPos);
                    playerBoard.addMarker(targetCell, false);
                    addLog(`Enemy missed.`, 'miss');
                }
                
                // Switch back to player turn
                setGamePhase('playerTurn');
                window.battleshipGamePhase = 'playerTurn';
                if (window.battleshipMoveCameraTo) {
                    window.battleshipMoveCameraTo(CONFIG.offsets.enemy);
                }
            });
        }, 1500);
    }, [addLog]);

    const startBattle = () => {
        setGamePhase('playerTurn');
        window.battleshipGamePhase = 'playerTurn';
        // Move camera to enemy board with smooth animation
        if (window.battleshipMoveCameraTo) {
            window.battleshipMoveCameraTo(CONFIG.offsets.enemy);
        }
        addLog('ENGAGE! Target enemy grid.');
    };

    const randomizeFleet = () => {
        if (playerBoardRef.current) {
            playerBoardRef.current.placeShipsRandomly();
            addLog('Fleet redeployed.');
        }
    };

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    return (
        <div className="fixed inset-0 z-50 select-none bg-[#0a3d62]">
            {/* 3D Canvas */}
            <div ref={containerRef} className="absolute inset-0" />
            
            {/* Close Button - Top right, always visible */}
            <button 
                onClick={onClose}
                className={`absolute ${isMobile ? 'top-2 right-2 w-8 h-8' : 'top-4 right-4 w-10 h-10'} bg-red-600/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center font-bold pointer-events-auto z-30`}
            >
                ✕
            </button>
            
            {/* Status Badge - Top center on mobile */}
            <div className={`absolute ${isMobile ? 'top-2 left-1/2 -translate-x-1/2' : 'top-4 right-16'} z-20`}>
                <div 
                    className={`${isMobile ? 'px-3 py-1 text-xs' : 'px-6 py-2 text-sm'} rounded border ${
                        gamePhase === 'setup' ? 'border-yellow-400 text-yellow-400' :
                        gamePhase === 'playerTurn' ? 'border-green-400 text-green-400 animate-pulse' :
                        gamePhase === 'enemyTurn' ? 'border-red-400 text-red-400' :
                        'border-white text-white'
                    } bg-black/80 font-bold tracking-wider`}
                >
                    {gamePhase === 'setup' ? 'DEPLOY' :
                     gamePhase === 'playerTurn' ? 'YOUR TURN' :
                     gamePhase === 'enemyTurn' ? 'ENEMY' :
                     winner === 'player' ? 'WIN' : 'LOSE'}
                </div>
            </div>
            
            {/* Ship Status - Compact row on mobile, stacked on desktop */}
            <div className={`absolute ${isMobile ? 'top-10 left-2 right-2 flex gap-2' : 'top-20 left-4 flex-col space-y-2'} z-10`}>
                {/* Your Fleet */}
                <div className={`bg-black/80 ${isMobile ? 'p-1.5 rounded flex-1' : 'p-3 rounded-lg'}`}>
                    <div className={`text-cyan-400 font-bold ${isMobile ? 'text-[10px]' : 'text-sm'} mb-0.5`}>YOU</div>
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} rounded-sm ${i < (5 - playerSunk) ? 'bg-cyan-500' : 'bg-gray-600'}`} />
                        ))}
                    </div>
                </div>
                
                {/* Enemy Fleet */}
                <div className={`bg-black/80 ${isMobile ? 'p-1.5 rounded flex-1' : 'p-3 rounded-lg'}`}>
                    <div className={`text-pink-400 font-bold ${isMobile ? 'text-[10px]' : 'text-sm'} mb-0.5`}>ENEMY</div>
                    <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`${isMobile ? 'w-3 h-3' : 'w-4 h-4'} rounded-sm ${i < enemySunk ? 'bg-gray-600' : 'bg-pink-500'}`} />
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Battle Log - Hidden on mobile, shown on desktop */}
            {!isMobile && (
                <div className="absolute bottom-24 left-4 w-72 max-h-32 overflow-hidden bg-black/70 border-l-2 border-white/20 p-2 text-xs">
                    {log.slice(0, 4).map((entry, i) => (
                        <div 
                            key={i} 
                            className={`${
                                entry.includes('HIT') ? 'text-red-400' :
                                entry.includes('Miss') ? 'text-blue-300' :
                                entry.includes('DESTROYED') ? 'text-orange-400 font-bold' :
                                'text-white/60'
                            }`}
                        >
                            {entry}
                        </div>
                    ))}
                </div>
            )}
            
            {/* Controls - Bottom nav style */}
            <div className={`absolute ${isMobile ? 'bottom-2 left-2 right-2' : 'bottom-6 left-1/2 -translate-x-1/2'} pointer-events-auto z-20`}>
                {gamePhase === 'setup' && (
                    <div className={`${isMobile ? 'flex gap-2' : 'flex gap-4'}`}>
                        <button 
                            onClick={randomizeFleet}
                            className={`${isMobile ? 'flex-1 px-3 py-2 text-xs' : 'px-8 py-3 text-sm'} bg-cyan-600/80 border border-cyan-400 text-white font-bold tracking-wider active:bg-cyan-700 transition-all rounded-lg`}
                        >
                            🎲 {isMobile ? 'SCRAMBLE' : 'SCRAMBLE FLEET'}
                        </button>
                        <button 
                            onClick={startBattle}
                            className={`${isMobile ? 'flex-1 px-3 py-2 text-xs' : 'px-8 py-3 text-sm'} bg-green-600/80 border border-green-400 text-white font-bold tracking-wider active:bg-green-700 transition-all rounded-lg`}
                        >
                            ⚔️ {isMobile ? 'ENGAGE' : 'ENGAGE HOSTILES'}
                        </button>
                    </div>
                )}
                {(gamePhase === 'playerTurn' || gamePhase === 'playing') && !isAnimating && (
                    isMobile ? (
                        <div className="flex gap-2">
                            {selectedCell !== null ? (
                                <>
                                    <div className="flex-1 px-3 py-2 text-xs bg-black/60 border border-cyan-400/50 text-cyan-300 font-bold rounded-lg text-center">
                                        TARGET: {String.fromCharCode(65 + (selectedCell % 10))}{Math.floor(selectedCell / 10) + 1}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (selectedCell !== null) {
                                                window.dispatchEvent(new CustomEvent('battleship_fire', { detail: { cell: selectedCell } }));
                                                setSelectedCell(null);
                                                window.battleshipSelectedCell = null;
                                            }
                                        }}
                                        className="flex-1 px-3 py-3 text-sm bg-red-600 border-2 border-red-400 text-white font-black tracking-wider active:bg-red-700 transition-all rounded-lg animate-pulse"
                                    >
                                        🎯 FIRE!
                                    </button>
                                </>
                            ) : (
                                <div className="flex-1 text-white/50 italic animate-pulse text-center text-xs py-2">
                                    Tap enemy grid to select target...
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-white/50 italic animate-pulse text-center text-sm">
                            Select coordinates on enemy grid...
                        </div>
                    )
                )}
            </div>
            
            {/* Game Over Modal */}
            {gamePhase === 'gameOver' && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-30">
                    <div className={`bg-gray-900/90 border border-white ${isMobile ? 'p-6 mx-4' : 'p-12'} text-center rounded-xl`}>
                        <h1 className={`${isMobile ? 'text-4xl' : 'text-6xl'} font-black mb-2 ${winner === 'player' ? 'text-green-400' : 'text-red-400'}`}>
                            {winner === 'player' ? 'VICTORY' : 'DEFEAT'}
                        </h1>
                        <p className={`text-gray-400 ${isMobile ? 'text-sm mb-4' : 'text-xl mb-8'}`}>
                            {winner === 'player' ? 'Enemy fleet neutralized.' : 'Fleet destroyed.'}
                        </p>
                        <button 
                            onClick={onClose}
                            className={`${isMobile ? 'px-6 py-2 text-sm' : 'px-8 py-3'} bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all`}
                        >
                            {isMobile ? 'EXIT' : 'RETURN TO BASE'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BattleshipGame;

