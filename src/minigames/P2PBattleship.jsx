/**
 * P2PBattleship - P2P Battleship Game with 3D Voxel Graphics
 * 
 * Based on the standalone Voxel Battleship Remastered source
 * Adapted to use server-driven state like other P2P minigames
 * 
 * KEY CONCEPTS:
 * - Server controls game state (ship placement, hits, turns)
 * - Client renders 3D boards with voxel ships
 * - Turn-based gameplay with projectile animations
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useChallenge } from '../challenge';
import { useMultiplayer } from '../multiplayer';
import * as THREE from 'three';
import gsap from 'gsap';
import { createPenguinBuilder, cacheAnimatedParts, animateCosmeticsFromCache } from '../engine/PenguinBuilder';
import { PALETTE } from '../constants';
import ChatLog from '../components/ChatLog';

// Helper to generate Solscan link
const getSolscanLink = (txSignature) => `https://solscan.io/tx/${txSignature}`;

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

// --- PARTICLE & EFFECTS SYSTEM ---
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

        // Shockwave ring
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

        // Flash light
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
                
                // Trail particles (from source code)
                if (Math.random() > 0.7) {
                    this.emitTrail(mesh.position.clone());
                }
            },
            onComplete: () => {
                this.scene.remove(mesh);
                if (onComplete) onComplete();
            }
        });
    }

    emitTrail(pos) {
        const mesh = new THREE.Mesh(this.cubeGeo, new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true }));
        mesh.position.copy(pos);
        mesh.scale.set(0.2, 0.2, 0.2);
        this.scene.add(mesh);
        this.particles.push({ mesh, vel: new THREE.Vector3(0, 0, 0), life: 0.5, type: 'smoke' });
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
            } else if (p.type === 'smoke') {
                p.mesh.position.y += 0.02;
                p.mesh.scale.setScalar(0.2 + (0.5 - p.life));
                if (p.mesh.material) p.mesh.material.opacity = p.life;
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

// --- SHIP FACTORY (VOXEL STYLE) ---
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

        // Random greebles
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

// --- GAME BOARD ---
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

        this.initGrid();
    }

    initGrid() {
        const fullSize = this.size * CONFIG.cellSize;
        
        // Base platform
        const baseGeo = new THREE.BoxGeometry(fullSize, 0.5, fullSize);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = -0.25;
        base.receiveShadow = true;
        this.root.add(base);

        // Grid lines
        const grid = new THREE.GridHelper(fullSize, this.size, 0x444444, 0x222222);
        grid.position.y = 0.05;
        this.root.add(grid);

        // Cursor
        const curGeo = new THREE.BoxGeometry(CONFIG.cellSize, 0.2, CONFIG.cellSize);
        const curMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.6 });
        this.cursor = new THREE.Mesh(curGeo, curMat);
        this.cursor.visible = false;
        this.root.add(this.cursor);
    }

    renderShips(ships, grid) {
        // Clear existing ships
        this.shipMeshes.forEach(m => this.root.remove(m));
        this.shipMeshes = [];

        // Build ships from grid data
        ships.forEach(ship => {
            if (ship.positions && ship.positions.length > 0) {
                const template = CONFIG.ships.find(s => s.name === ship.name) || CONFIG.ships[0];
                const shipMesh = ShipFactory.build({ ...template, size: ship.size });
                
                // Calculate position from grid indices
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
                
                // Darken if sunk
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
            }
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
        mesh.userData.cellIndex = cellIndex;
        
        // Pop in animation
        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: "back.out" });
        
        this.root.add(mesh);
        this.markers.push(mesh);
    }

    renderMarkers(shots) {
        // Clear existing markers
        this.markers.forEach(m => {
            this.root.remove(m);
            m.geometry.dispose();
            m.material.dispose();
        });
        this.markers = [];
        
        // Add markers for all shots
        shots.forEach((shot, idx) => {
            if (shot !== null) {
                this.addMarker(idx, shot === 'hit');
            }
        });
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

// --- 3D ENGINE ---
class BattleshipEngine {
    constructor(container) {
        this.container = container;
        
        this.scene = new THREE.Scene();
        // No fog - keep it bright and clear
        this.scene.background = new THREE.Color(0x1a5276); // Brighter blue sky

        const isPortrait = container.clientHeight > container.clientWidth;
        this.isPortrait = isPortrait;
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isMobile = isMobile;
        
        // Adjust FOV and camera position for portrait mode - higher for mobile to see full board
        const fov = isPortrait ? 55 : 45;
        const camY = isPortrait ? 55 : 40;
        const camZ = isPortrait ? 55 : 40;
        
        this.camera = new THREE.PerspectiveCamera(fov, container.clientWidth / container.clientHeight, 1, 1000);
        this.camera.position.set(CONFIG.offsets.player, camY, camZ);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = !isMobile;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.setupLights();
        this.createWater();

        this.fx = new FXSystem(this.scene);
        this.playerBoard = new Board(this.scene, true, CONFIG.offsets.player, this.fx);
        this.enemyBoard = new Board(this.scene, false, CONFIG.offsets.enemy, this.fx);
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredCell = null;
        this.cameraTarget = { x: CONFIG.offsets.player, y: 0 };
        
        this.clock = new THREE.Clock();
        this.animationId = null;
        this.onCellClick = null;      // PC: click to fire
        this.onCellSelect = null;     // Mobile: tap to select
        
        // Hover state - set by React, used in animation loop
        this.canHover = false;
        this.currentShots = [];
        
        // Screen shake intensity (from source code)
        this.shakeIntensity = 0;
        
        this.penguinMeshes = [];
        
        window.addEventListener('resize', this.handleResize);
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.addEventListener('click', this.handleClick);
        
        // Mobile touch support
        this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        
        this.animate();
    }

    setupLights() {
        // Very bright lighting for excellent visibility
        const ambient = new THREE.HemisphereLight(0xffffff, 0x87ceeb, 1.4);
        this.scene.add(ambient);

        this.sun = new THREE.DirectionalLight(0xffffff, 2.0);
        this.sun.position.set(50, 80, 30);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.left = -50;
        this.sun.shadow.camera.right = 50;
        this.sun.shadow.camera.top = 50;
        this.sun.shadow.camera.bottom = -50;
        this.scene.add(this.sun);
        
        // Fill light for better visibility from all angles
        const fillLight = new THREE.DirectionalLight(0xaaccff, 0.8);
        fillLight.position.set(-30, 20, -30);
        this.scene.add(fillLight);
        
        // Front fill light
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.6);
        frontLight.position.set(0, 30, 60);
        this.scene.add(frontLight);
    }

    createWater() {
        // Animated water with shader
        const geo = new THREE.PlaneGeometry(300, 300, 100, 100);
        
        // Custom water shader for wave animation
        this.waterUniforms = {
            uTime: { value: 0 },
            color1: { value: CONFIG.colors.waterDeep },
            color2: { value: CONFIG.colors.waterShallow },
            sunColor: { value: new THREE.Color(0xffdfba) },
            sunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
        };
        
        const waterMat = new THREE.ShaderMaterial({
            uniforms: this.waterUniforms,
            vertexShader: `
                varying vec3 vViewPosition;
                varying vec3 vWorldPosition;
                varying float vHeight;
                uniform float uTime;
                
                // Simple noise
                float hash(vec2 p) {
                    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
                }
                
                float noise(vec2 p) {
                    vec2 i = floor(p);
                    vec2 f = fract(p);
                    f = f * f * (3.0 - 2.0 * f);
                    float a = hash(i);
                    float b = hash(i + vec2(1.0, 0.0));
                    float c = hash(i + vec2(0.0, 1.0));
                    float d = hash(i + vec2(1.0, 1.0));
                    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
                }
                
                void main() {
                    vec3 pos = position;
                    
                    // Wave animation
                    float wave1 = noise(vec2(pos.x * 0.08 + uTime * 0.4, pos.y * 0.08 + uTime * 0.3)) * 2.0;
                    float wave2 = noise(vec2(pos.x * 0.2 - uTime * 0.2, pos.y * 0.2 + uTime * 0.1)) * 0.8;
                    pos.z += wave1 + wave2;
                    vHeight = pos.z;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    vViewPosition = -mvPosition.xyz;
                    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 sunColor;
                uniform vec3 sunDirection;
                varying vec3 vViewPosition;
                varying vec3 vWorldPosition;
                varying float vHeight;
                
                void main() {
                    // Flat shading
                    vec3 fdx = dFdx(vViewPosition);
                    vec3 fdy = dFdy(vViewPosition);
                    vec3 normal = normalize(cross(fdx, fdy));
                    
                    float diffuse = max(dot(normal, sunDirection), 0.0);
                    
                    // Mix water colors based on height
                    vec3 waterCol = mix(color1, color2, diffuse * 0.8 + vHeight * 0.1);
                    
                    vec3 viewDir = normalize(vViewPosition);
                    vec3 reflectDir = reflect(-sunDirection, normal);
                    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 50.0);
                    
                    // Rim effect
                    float rim = 1.0 - max(dot(viewDir, normal), 0.0);
                    rim = pow(rim, 3.0);
                    
                    vec3 finalColor = waterCol * (0.4 + 0.6 * diffuse);
                    finalColor += sunColor * spec * 0.8;
                    finalColor += vec3(0.8, 0.9, 1.0) * rim * 0.3;
                    
                    gl_FragColor = vec4(finalColor, 0.92);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geo, waterMat);
        mesh.rotation.x = -Math.PI / 2;
        this.scene.add(mesh);
        this.waterMesh = mesh;
    }

    moveCameraTo(targetOffset) {
        // Update camera target for lookAt
        this.cameraTarget = { x: targetOffset, y: 0 };
        
        // Higher camera on mobile portrait for better board visibility
        const camY = this.isPortrait ? 55 : 35;
        const camZ = this.isPortrait ? 55 : 35;
        
        // Animate camera position with gsap
        gsap.to(this.camera.position, {
            x: targetOffset,
            y: camY,
            z: camZ,
            duration: 1.5,
            ease: "power3.inOut"
        });
        
        // Also animate where camera looks at
        gsap.to(this.cameraTarget, {
            x: targetOffset,
            duration: 1.5,
            ease: "power3.inOut"
        });
    }

    updateMyBoard(ships, grid, opponentShots) {
        this.playerBoard.renderShips(ships, grid);
        this.playerBoard.renderMarkers(opponentShots);
    }

    updateEnemyBoard(myShots, opponentShipStatus) {
        // Only render markers on enemy board (we don't see their ships)
        this.enemyBoard.renderMarkers(myShots);
    }

    fireProjectile(fromPlayer, cellIndex, isHit, onComplete) {
        const startOffset = fromPlayer ? CONFIG.offsets.player : CONFIG.offsets.enemy;
        const targetBoard = fromPlayer ? this.enemyBoard : this.playerBoard;
        
        const startPos = new THREE.Vector3(startOffset, 5 + CONFIG.boardElevation, 0);
        const targetPos = targetBoard.getCellWorldPosition(cellIndex);
        
        this.fx.createProjectile(startPos, targetPos, () => {
            if (isHit) {
                this.fx.createExplosion(targetPos, CONFIG.colors.hit);
            } else {
                this.fx.createSplash(targetPos);
            }
            if (onComplete) onComplete();
        });
    }

    addPenguinPlayer(playerIdx, playerData, position) {
        let appearanceData = playerData?.appearance || playerData?.cosmetics || {};
        if (typeof appearanceData === 'string') {
            try { appearanceData = JSON.parse(appearanceData); } catch (e) { appearanceData = {}; }
        }
        
        const featherColor = appearanceData.skin || appearanceData.color || (playerIdx === 0 ? 'cyan' : 'pink');
        const group = new THREE.Group();
        
        try {
            const penguinBuilder = createPenguinBuilder(THREE);
            const { buildPenguinMesh } = penguinBuilder;
            
            const appearance = {
                color: featherColor,
                hat: appearanceData.hat || 'none',
                eyes: appearanceData.eyes || 'normal',
                mouth: appearanceData.mouth || 'beak',
                bodyItem: appearanceData.bodyItem || 'none',
                mount: appearanceData.mount || 'none',
                heldItem: appearanceData.heldItem || 'none',
                characterType: appearanceData.characterType || playerData?.characterType || null
            };
            
            const penguin = buildPenguinMesh(appearance);
            penguin.scale.set(1.5, 1.5, 1.5);
            penguin.name = 'penguin_mesh';
            group.add(penguin);
            
            group.userData.animCache = cacheAnimatedParts(penguin);
        } catch (e) {
            console.warn('Battleship Penguin build failed, using fallback:', e);
            const colorHex = PALETTE[featherColor] || 0x00bcd4;
            const mat = new THREE.MeshStandardMaterial({ color: colorHex });
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 8, 16), mat);
            body.position.y = 0.6;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), mat);
            head.position.y = 1.3;
            group.add(body, head);
        }
        
        group.position.set(position.x, position.y, position.z);
        group.rotation.y = playerIdx === 0 ? 0 : Math.PI;
        
        this.scene.add(group);
        this.penguinMeshes[playerIdx] = { mesh: group, cache: group.userData.animCache };
        
        return group;
    }

    showChatBubble(playerIdx, text) {
        const penguin = this.penguinMeshes[playerIdx]?.mesh;
        if (!penguin) return;
        
        const existingBubble = penguin.getObjectByName('chatBubble');
        if (existingBubble) penguin.remove(existingBubble);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        const displayText = text.length > 40 ? text.substring(0, 37) + '...' : text;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 30, 15);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 10, canvas.height - 20);
        ctx.lineTo(canvas.width / 2, canvas.height - 5);
        ctx.lineTo(canvas.width / 2 + 10, canvas.height - 20);
        ctx.fill();
        
        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayText, canvas.width / 2, canvas.height / 2 - 5);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.name = 'chatBubble';
        sprite.scale.set(10, 5, 1);
        sprite.position.set(0, 5, 0);
        
        penguin.add(sprite);
        
        sprite.material.opacity = 0;
        gsap.to(sprite.material, { opacity: 1, duration: 0.2 });
        gsap.to(sprite.position, { y: 6, duration: 0.2, ease: "back.out" });
        
        setTimeout(() => {
            gsap.to(sprite.material, { 
                opacity: 0, 
                duration: 0.3,
                onComplete: () => {
                    penguin.remove(sprite);
                    texture.dispose();
                    material.dispose();
                }
            });
        }, 4000);
    }

    handleResize = () => {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    };

    handleMouseMove = (e) => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    handleClick = () => {
        if (this.hoveredCell !== null && this.onCellClick) {
            this.onCellClick(this.hoveredCell);
        }
    };

    // Mobile touch: update mouse position and SELECT cell (don't fire immediately)
    handleTouchStart = (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
            
            // Check hover to update cursor position and find cell
            this.checkHover();
            
            // Mobile: select cell instead of firing (onCellSelect callback)
            if (this.hoveredCell !== null && this.onCellSelect) {
                this.onCellSelect(this.hoveredCell);
            }
        }
    };

    handleTouchMove = (e) => {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        }
    };

    updateHover(isMyTurn, myShots) {
        // Store state for animation loop to use
        this.canHover = isMyTurn;
        this.currentShots = myShots || [];
    }
    
    // Called in animation loop to check hover
    checkHover() {
        if (!this.canHover) {
            this.enemyBoard.setCursorVisible(false);
            this.hoveredCell = null;
            this.container.style.cursor = 'default';
            return;
        }

        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CONFIG.boardElevation);
        const target = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, target);

        if (target) {
            const localX = target.x - CONFIG.offsets.enemy;
            const localZ = target.z;
            
            const step = CONFIG.cellSize;
            const gridHalf = (CONFIG.gridSize * step) / 2;
            
            const gx = Math.floor((localX + gridHalf) / step);
            const gy = Math.floor((localZ + gridHalf) / step);

            if (gx >= 0 && gx < CONFIG.gridSize && gy >= 0 && gy < CONFIG.gridSize) {
                const cellIndex = gy * CONFIG.gridSize + gx;
                
                // Only show cursor for unfired cells
                if (this.currentShots[cellIndex] === null) {
                    this.enemyBoard.setCursorVisible(true, cellIndex);
                    this.hoveredCell = cellIndex;
                    this.container.style.cursor = 'crosshair';
                    return;
                }
            }
        }
        
        this.enemyBoard.setCursorVisible(false);
        this.hoveredCell = null;
        this.container.style.cursor = 'default';
    }

    animate = () => {
        this.animationId = requestAnimationFrame(this.animate);

        // Camera looks at current target (gsap animates this.cameraTarget.x)
        this.camera.lookAt(this.cameraTarget.x, 0, 0);

        // Update hover detection based on mouse position (continuous check)
        this.checkHover();

        this.fx.update();

        // Animate water with shader
        if (this.waterMesh && this.waterUniforms) {
            const time = this.clock.getElapsedTime();
            this.waterUniforms.uTime.value = time;
            this.waterMesh.position.y = Math.sin(time * 0.5) * 0.2;
        }

        // Ship floating
        [this.playerBoard, this.enemyBoard].forEach(b => {
            const time = this.clock.getElapsedTime();
            b.shipMeshes.forEach((s, i) => {
                if (s.position.y >= 0) {
                    s.position.y = Math.sin(time * 1.5 + i) * 0.05;
                    s.rotation.z = Math.sin(time + i) * 0.01;
                }
            });
        });

        // Animate penguins
        const delta = this.clock.getDelta();
        this.penguinMeshes.forEach(p => {
            if (p?.cache) animateCosmeticsFromCache(p.cache, delta);
        });

        this.renderer.render(this.scene, this.camera);
    };

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);
        this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.removeEventListener('click', this.handleClick);
        this.renderer.domElement.removeEventListener('touchstart', this.handleTouchStart);
        this.renderer.domElement.removeEventListener('touchmove', this.handleTouchMove);
        
        this.fx.dispose();
        this.playerBoard.dispose();
        this.enemyBoard.dispose();
        
        this.scene.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
        
        this.renderer.dispose();
        if (this.container && this.renderer.domElement.parentNode === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// === MAIN COMPONENT ===
const P2PBattleship = ({ onMatchEnd }) => {
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    const lastAnimatedActionRef = useRef(null);
    const isAnimatingRef = useRef(false); // Track if projectile animation is in progress
    const pendingCameraMoveRef = useRef(null); // Store pending camera target after animation
    const { activeMatch, matchState, playCard, forfeitMatch, clearMatch } = useChallenge();
    const [selectedCell, setSelectedCell] = useState(null); // Mobile: selected target cell
    const { connected, playerId } = useMultiplayer();
    
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [showDisconnected, setShowDisconnected] = useState(false);
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Chat bubble handler
    const handleChatMessage = useCallback((msg) => {
        if (!engineRef.current || !activeMatch) return;
        const isPlayer1 = msg.senderName === activeMatch.player1?.name;
        const isPlayer2 = msg.senderName === activeMatch.player2?.name;
        if (isPlayer1) engineRef.current.showChatBubble(0, msg.text);
        else if (isPlayer2) engineRef.current.showChatBubble(1, msg.text);
    }, [activeMatch]);

    // Initialize engine
    useEffect(() => {
        if (!containerRef.current || !activeMatch) return;
        
        const engine = new BattleshipEngine(containerRef.current);
        engineRef.current = engine;
        
        // Add penguin avatars
        const p1Data = activeMatch.player1;
        const p2Data = activeMatch.player2;
        
        engine.addPenguinPlayer(0, p1Data, { x: CONFIG.offsets.player - 15, y: CONFIG.boardElevation, z: 0 });
        engine.addPenguinPlayer(1, p2Data, { x: CONFIG.offsets.enemy + 15, y: CONFIG.boardElevation, z: 0 });
        
        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, [activeMatch?.matchId]);

    // Update board state
    useEffect(() => {
        if (!engineRef.current || !matchState) return;
        const engine = engineRef.current;
        
        // Update my board (shows my ships and where opponent has shot)
        if (matchState.myShips && matchState.myGrid) {
            engine.updateMyBoard(matchState.myShips, matchState.myGrid, matchState.opponentShotsAtMe);
        }
        
        // Update enemy board (shows my shots only)
        if (matchState.myShotsAtOpponent) {
            engine.updateEnemyBoard(matchState.myShotsAtOpponent, matchState.opponentShipStatus);
        }
        
        // Move camera based on phase and turn
        const isSetup = matchState.phase === 'setup' || matchState.isSetupPhase;
        
        // Determine desired camera target
        let targetOffset;
        if (isSetup) {
            // During setup, ALWAYS look at your own board to place ships
            targetOffset = CONFIG.offsets.player;
        } else if (matchState.isMyTurn) {
            // During play, look at enemy board when attacking
            targetOffset = CONFIG.offsets.enemy;
        } else {
            // Look at own board when defending
            targetOffset = CONFIG.offsets.player;
        }
        
        // Check if there's a NEW lastAction that will trigger an animation
        // If so, don't move camera now - let the animation effect handle it after projectile lands
        const actionKey = matchState.lastAction 
            ? `${matchState.lastAction.type}-${matchState.lastAction.cellIndex}-${matchState.lastAction.player}`
            : null;
        const hasNewAnimation = actionKey && actionKey !== lastAnimatedActionRef.current;
        
        // If animation is in progress OR a new animation is about to start, store pending move
        if (isAnimatingRef.current || hasNewAnimation) {
            pendingCameraMoveRef.current = targetOffset;
        } else {
            engine.moveCameraTo(targetOffset);
        }
        
        // Update hover for clicking (only during playing phase on your turn)
        engine.updateHover(!isSetup && matchState.isMyTurn, matchState.myShotsAtOpponent || []);
        
    }, [matchState]);

    // Handle last action animations
    useEffect(() => {
        if (!engineRef.current || !matchState?.lastAction) return;
        const engine = engineRef.current;
        
        const actionKey = `${matchState.lastAction.type}-${matchState.lastAction.cellIndex}-${matchState.lastAction.player}`;
        if (actionKey === lastAnimatedActionRef.current) return;
        lastAnimatedActionRef.current = actionKey;
        
        const action = matchState.lastAction;
        const isHit = action.type === 'hit';
        const isPlayer1 = activeMatch.yourRole === 'player1';
        
        // fromPlayer = true means projectile from "my" side to enemy board
        // action.player is who FIRED the shot
        // If I'm player1 and action.player is 'player1', I fired -> fromPlayer=true (my side to enemy)
        // If I'm player1 and action.player is 'player2', opponent fired -> fromPlayer=false (enemy side to my board)
        const isFiredByMe = action.player === (isPlayer1 ? 'player1' : 'player2');
        
        // Set animating flag to prevent camera from moving until projectile lands
        isAnimatingRef.current = true;
        
        engine.fireProjectile(isFiredByMe, action.cellIndex, isHit, () => {
            // Animation complete - now move camera if there's a pending move
            isAnimatingRef.current = false;
            
            // Small delay after explosion before camera moves (like source code)
            setTimeout(() => {
                if (pendingCameraMoveRef.current !== null && engineRef.current) {
                    engineRef.current.moveCameraTo(pendingCameraMoveRef.current);
                    pendingCameraMoveRef.current = null;
                }
            }, 500);
        });
        
    }, [matchState?.lastAction, activeMatch]);

    // Set up cell click handler (PC) and cell select handler (mobile)
    useEffect(() => {
        if (!engineRef.current) return;
        
        // PC: click to fire immediately
        engineRef.current.onCellClick = (cellIndex) => {
            // Only allow firing during playing phase and on your turn
            if (matchState?.phase === 'setup' || matchState?.isSetupPhase) return;
            if (!matchState?.isMyTurn || matchState.phase !== 'playing') return;
            playCard({ cellIndex });
        };
        
        // Mobile: tap to select cell (then use Fire button)
        engineRef.current.onCellSelect = (cellIndex) => {
            if (matchState?.phase === 'setup' || matchState?.isSetupPhase) return;
            if (!matchState?.isMyTurn || matchState.phase !== 'playing') return;
            // Check if cell is already fired at
            const shots = matchState.myShotsAtOpponent || [];
            if (shots[cellIndex] !== null) return;
            setSelectedCell(cellIndex);
        };
    }, [matchState, playCard]);

    // Clear selected cell when turn changes, phase changes, or game ends
    useEffect(() => {
        setSelectedCell(null);
    }, [matchState?.isMyTurn, matchState?.phase]);

    // Connection status
    useEffect(() => {
        if (!connected && activeMatch) {
            setShowDisconnected(true);
        } else {
            setShowDisconnected(false);
        }
    }, [connected, activeMatch]);

    const handleForfeit = () => {
        if (confirm('Forfeit? You will lose the wager.')) forfeitMatch();
    };
    
    // Setup phase handlers
    const handleRandomizeFleet = () => {
        playCard({ action: 'randomizeFleet' });
    };
    
    const handleReady = () => {
        playCard({ action: 'ready' });
    };

    // === RENDER ===
    if (!activeMatch || !matchState) return null;

    const isPlayer1 = activeMatch.yourRole === 'player1';
    const isMyTurn = matchState.isMyTurn;
    const myPlayer = isPlayer1 ? activeMatch.player1 : activeMatch.player2;
    const opponent = isPlayer1 ? activeMatch.player2 : activeMatch.player1;
    const currentTurnName = matchState.currentTurn === 'player1' ? activeMatch.player1.name : activeMatch.player2.name;
    const isComplete = matchState.phase === 'complete';
    const isSetupPhase = matchState.phase === 'setup' || matchState.isSetupPhase;
    const didWin = matchState.winner === (isPlayer1 ? 'player1' : 'player2');
    const totalPot = activeMatch.wagerAmount * 2;
    
    // Setup phase state
    const myReady = matchState.myReady || false;
    const opponentReady = matchState.opponentReady || false;
    const setupTimeRemaining = matchState.setupTimeRemaining || 0;
    
    // Count sunk ships
    const mySunkShips = matchState.myShips?.filter(s => s.sunk).length || 0;
    const enemySunkShips = matchState.opponentShipStatus?.filter(s => s.sunk).length || 0;
    const totalShips = 5;

    // Token wager info
    const matchResult = activeMatch.matchResult;
    const tokenSettlement = matchResult?.tokenSettlement;
    const wagerToken = matchResult?.wagerToken || activeMatch?.wagerToken;
    const tokenWon = didWin && wagerToken ? (tokenSettlement?.amount || wagerToken.tokenAmount * 2) : 0;
    const tokenLost = !didWin && wagerToken ? wagerToken.tokenAmount : 0;
    const solscanLink = tokenSettlement?.txSignature ? getSolscanLink(tokenSettlement.txSignature) : null;

    return (
        <div className="fixed inset-0 z-40 select-none bg-[#0a3d62]">
            {/* 3D Canvas */}
            <div ref={containerRef} className="absolute inset-0" />
            
            {/* === SETUP PHASE UI - Compact bottom nav style === */}
            {isSetupPhase && (
                <div className="absolute bottom-0 left-0 right-0 z-20 p-2 pointer-events-none">
                    <div className="bg-black/80 backdrop-blur-sm rounded-xl p-3 pointer-events-auto max-w-lg mx-auto border border-cyan-400/30">
                        {/* Header row */}
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-cyan-400 font-bold text-sm">🚢 DEPLOY</span>
                                <span className="text-cyan-400/70 text-xs">({setupTimeRemaining}s)</span>
                            </div>
                            <span className={`text-xs ${opponentReady ? 'text-green-400' : 'text-yellow-400/70'}`}>
                                {opponentReady ? `✅ ${opponent.name} ready` : `⏳ ${opponent.name}...`}
                            </span>
                        </div>
                        
                        {/* Buttons row */}
                        <div className="flex gap-2">
                            <button
                                onClick={handleRandomizeFleet}
                                disabled={myReady}
                                className={`flex-1 py-2 px-3 rounded-lg font-bold text-white text-xs transition-all ${
                                    myReady 
                                        ? 'bg-gray-600/50 cursor-not-allowed text-white/50' 
                                        : 'bg-cyan-600/80 active:bg-cyan-700 active:scale-95'
                                }`}
                            >
                                🎲 Scramble
                            </button>
                            
                            <button
                                onClick={handleReady}
                                disabled={myReady}
                                className={`flex-1 py-2 px-3 rounded-lg font-bold text-white text-xs transition-all ${
                                    myReady 
                                        ? 'bg-green-700/80 cursor-not-allowed' 
                                        : 'bg-green-600 active:bg-green-700 active:scale-95 animate-pulse'
                                }`}
                            >
                                {myReady ? '✅ Ready!' : '⚔️ Ready Up'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* === TURN STATUS (only during playing phase) === */}
            {!isSetupPhase && !isComplete && (
                <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 right-4'} z-10`}>
                    <div 
                        className={`${isMobile ? 'px-4 py-2' : 'px-8 py-4'} rounded-lg backdrop-blur-md border-2 transition-all ${
                            isMyTurn ? 'border-green-400 bg-green-900/80 animate-pulse' : 'border-red-400 bg-red-900/80'
                        }`}
                    >
                        <div className={`text-white font-black ${isMobile ? 'text-base' : 'text-xl'}`}>
                            {isMyTurn ? '🎯 YOUR TURN - SELECT TARGET' : `⏳ ${currentTurnName}'s TURN`}
                        </div>
                        <div className="text-white/70 text-sm">
                            {matchState.timeRemaining}s remaining
                        </div>
                    </div>
                </div>
            )}

            {/* === SHIP STATUS PANELS === */}
            {/* Your Fleet */}
            <div 
                className={`absolute ${isMobile ? 'bottom-16 left-2 p-2' : 'bottom-24 left-4 p-3'} rounded-xl backdrop-blur-md z-10`}
                style={{ background: 'rgba(0,0,0,0.8)', borderLeft: '3px solid #00bcd4' }}
            >
                <div className="text-cyan-400 font-bold text-sm mb-1">YOUR FLEET</div>
                <div className="flex gap-1">
                    {[...Array(totalShips)].map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-4 h-4 rounded-sm ${i < (totalShips - mySunkShips) ? 'bg-cyan-500' : 'bg-gray-600'}`}
                        />
                    ))}
                </div>
                <div className="text-white/60 text-xs mt-1">
                    {totalShips - mySunkShips} / {totalShips} ships remaining
                </div>
            </div>

            {/* Enemy Fleet */}
            <div 
                className={`absolute ${isMobile ? 'top-16 left-2 p-2' : 'top-20 left-4 p-3'} rounded-xl backdrop-blur-md z-10`}
                style={{ background: 'rgba(0,0,0,0.8)', borderLeft: '3px solid #e91e63' }}
            >
                <div className="text-pink-400 font-bold text-sm mb-1">ENEMY FLEET ({opponent.name})</div>
                <div className="flex gap-1">
                    {[...Array(totalShips)].map((_, i) => (
                        <div 
                            key={i} 
                            className={`w-4 h-4 rounded-sm ${i < enemySunkShips ? 'bg-gray-600' : 'bg-pink-500'}`}
                        />
                    ))}
                </div>
                <div className="text-white/60 text-xs mt-1">
                    {enemySunkShips} / {totalShips} ships sunk
                </div>
            </div>

            {/* === LAST ACTION LOG === */}
            {matchState.lastAction && (
                <div className={`absolute ${isMobile ? 'top-32 left-2' : 'top-36 left-4'} z-10`}>
                    <div className={`px-3 py-2 rounded-lg backdrop-blur-md text-sm ${
                        matchState.lastAction.type === 'hit' ? 'bg-red-900/80 border border-red-500' : 'bg-blue-900/80 border border-blue-500'
                    }`}>
                        <span className="text-white">
                            {matchState.lastAction.type === 'hit' ? '💥 HIT!' : '💨 MISS'}
                            {matchState.lastAction.sunkShip && ` - ${matchState.lastAction.sunkShip} DESTROYED!`}
                        </span>
                    </div>
                </div>
            )}

            {/* === MOBILE FIRE BUTTON === */}
            {isMobile && !isSetupPhase && !isComplete && isMyTurn && selectedCell !== null && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30">
                    <div className="bg-black/90 rounded-xl px-4 py-3 border border-orange-500/50 flex flex-col items-center gap-2">
                        <div className="text-orange-300 text-sm font-bold">
                            🎯 TARGET: {String.fromCharCode(65 + (selectedCell % 10))}{Math.floor(selectedCell / 10) + 1}
                        </div>
                        <button
                            onClick={() => {
                                playCard({ cellIndex: selectedCell });
                                setSelectedCell(null);
                            }}
                            className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-black px-8 py-3 rounded-lg text-lg transition-all active:scale-95"
                        >
                            🎯 FIRE!
                        </button>
                    </div>
                </div>
            )}

            {/* === DISCONNECTION WARNING === */}
            {showDisconnected && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-red-900/95 border-2 border-red-500 rounded-xl px-6 py-4 text-center animate-pulse">
                        <div className="text-red-400 text-lg font-bold mb-1">⚠️ Connection Lost</div>
                        <div className="text-white text-sm">Reconnecting...</div>
                    </div>
                </div>
            )}

            {/* === POT & FORFEIT === */}
            <div className={`absolute ${isMobile ? 'bottom-4 right-2' : 'bottom-4 right-4'} z-10 flex flex-col gap-2 items-end`}>
                <div className="bg-black/70 px-3 py-1.5 rounded-lg">
                    <span className="text-yellow-400 font-bold text-sm">💰 {totalPot}</span>
                </div>
                <button 
                    onClick={handleForfeit}
                    className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                    Forfeit
                </button>
            </div>

            {/* === GAME OVER === */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-500">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-center max-w-sm border border-white/10 shadow-2xl">
                        <div className="text-6xl mb-4">{didWin ? '🏆' : '💀'}</div>
                        <h2 className={`text-3xl font-black mb-2 ${didWin ? 'text-green-400' : 'text-red-400'}`}>
                            {didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-gray-400 mb-4">
                            {didWin ? `${opponent.name}'s fleet has been neutralized!` : 'Your fleet has been destroyed...'}
                        </p>
                        <div className={`text-2xl font-bold mb-2 ${didWin ? 'text-green-400' : 'text-red-400'}`}>
                            {didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                        </div>
                        {wagerToken && (
                            <div className={`text-xl font-bold mb-4 ${didWin ? 'text-cyan-400' : 'text-red-400'}`}>
                                {didWin ? `+${tokenWon} ${tokenSettlement?.tokenSymbol || wagerToken.tokenSymbol}` : `-${tokenLost} ${wagerToken.tokenSymbol}`} 💎
                            </div>
                        )}
                        {solscanLink && (
                            <a href={solscanLink} target="_blank" rel="noopener noreferrer"
                               className="text-cyan-400 text-sm underline mb-4 block">
                                View on Solscan ↗
                            </a>
                        )}
                        <button 
                            onClick={() => { clearMatch(); onMatchEnd?.(); }}
                            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:scale-105 transition-all"
                        >
                            Return to Base
                        </button>
                    </div>
                </div>
            )}

            {/* === CHAT === */}
            {isMobile ? (
                <>
                    {!showMobileChat && (
                        <button
                            onClick={() => setShowMobileChat(true)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-black/80 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-white/20"
                        >
                            💬
                        </button>
                    )}
                    <ChatLog 
                        isMobile={true}
                        isOpen={showMobileChat}
                        onClose={() => setShowMobileChat(false)}
                        onNewMessage={handleChatMessage}
                    />
                </>
            ) : (
                <ChatLog minigameMode={true} onNewMessage={handleChatMessage} />
            )}
        </div>
    );
};

export default P2PBattleship;

