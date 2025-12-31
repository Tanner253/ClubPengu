/**
 * P2PMonopoly - Production-ready P2P Monopoly Game
 * 
 * KEY CONCEPTS:
 * - "Active Player": The player whose turn it is - can interact with buttons
 * - "Spectator": The opponent waiting for their turn - watches only, no interaction
 * - Camera is SERVER-DRIVEN: Both clients see identical camera movements
 * - Events are SERVER-DRIVEN: Modals auto-dismiss for spectators
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useChallenge } from '../challenge';
import { useMultiplayer } from '../multiplayer';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';
import { createCharacterBuilder, cacheAnimatedParts, animateCosmeticsFromCache } from '../engine/PlayerBuilder';
import { PALETTE } from '../constants';
import ChatLog from '../components/ChatLog';

// Helper to generate Solscan link
const getSolscanLink = (txSignature) => `https://solscan.io/tx/${txSignature}`;

// --- GAME DATA ---
const GROUPS = {
    BROWN: 0x8B4513, LIGHTBLUE: 0x87CEEB, PINK: 0xFF69B4, ORANGE: 0xFFA500,
    RED: 0xFF4757, YELLOW: 0xFFD32A, GREEN: 0x2ED573, DARKBLUE: 0x3742fa,
    STATION: 0x2f3542, UTILITY: 0x747d8c, NONE: 0xced6e0
};

const SPACES = [
    { name: "GO", type: "go", price: 0, group: "NONE" },
    { name: "Mediterranean", type: "property", price: 60, rent: 2, group: "BROWN" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Baltic Ave", type: "property", price: 60, rent: 4, group: "BROWN" },
    { name: "Income Tax", type: "tax", price: 200, group: "NONE" },
    { name: "Reading RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Oriental Ave", type: "property", price: 100, rent: 6, group: "LIGHTBLUE" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Vermont Ave", type: "property", price: 100, rent: 6, group: "LIGHTBLUE" },
    { name: "Conn. Ave", type: "property", price: 120, rent: 8, group: "LIGHTBLUE" },
    { name: "Jail", type: "jail", price: 0, group: "NONE" },
    { name: "St. Charles", type: "property", price: 140, rent: 10, group: "PINK" },
    { name: "Electric Co", type: "utility", price: 150, rent: 0, group: "UTILITY" },
    { name: "States Ave", type: "property", price: 140, rent: 10, group: "PINK" },
    { name: "Virginia Ave", type: "property", price: 160, rent: 12, group: "PINK" },
    { name: "Penn. RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "St. James", type: "property", price: 180, rent: 14, group: "ORANGE" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Tenn. Ave", type: "property", price: 180, rent: 14, group: "ORANGE" },
    { name: "NY Ave", type: "property", price: 200, rent: 16, group: "ORANGE" },
    { name: "Free Parking", type: "parking", price: 0, group: "NONE" },
    { name: "Kentucky Ave", type: "property", price: 220, rent: 18, group: "RED" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Indiana Ave", type: "property", price: 220, rent: 18, group: "RED" },
    { name: "Illinois Ave", type: "property", price: 240, rent: 20, group: "RED" },
    { name: "B&O RR", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Atlantic Ave", type: "property", price: 260, rent: 22, group: "YELLOW" },
    { name: "Ventnor Ave", type: "property", price: 260, rent: 22, group: "YELLOW" },
    { name: "Water Works", type: "utility", price: 150, rent: 0, group: "UTILITY" },
    { name: "Marvin Gdns", type: "property", price: 280, rent: 24, group: "YELLOW" },
    { name: "Go To Jail", type: "gotojail", price: 0, group: "NONE" },
    { name: "Pacific Ave", type: "property", price: 300, rent: 26, group: "GREEN" },
    { name: "NC Ave", type: "property", price: 300, rent: 26, group: "GREEN" },
    { name: "Comm. Chest", type: "chest", price: 0, group: "NONE" },
    { name: "Penn. Ave", type: "property", price: 320, rent: 28, group: "GREEN" },
    { name: "Short Line", type: "station", price: 200, rent: 25, group: "STATION" },
    { name: "Chance", type: "chance", price: 0, group: "NONE" },
    { name: "Park Place", type: "property", price: 350, rent: 35, group: "DARKBLUE" },
    { name: "Luxury Tax", type: "tax", price: 100, group: "NONE" },
    { name: "Boardwalk", type: "property", price: 400, rent: 50, group: "DARKBLUE" }
];

// --- 3D ENGINE ---
class MonopolyEngine {
    constructor(container) {
        this.container = container;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e); // Brighter dark blue
        // No fog - cleaner look

        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(0, 85, 95); // Pulled back to see full board
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        // Limit pixel ratio on mobile to prevent memory issues
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = !isMobile; // Disable shadows on mobile for performance
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Controls - enabled for optional manual camera control
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minPolarAngle = Math.PI / 6;
        this.controls.minDistance = 30;
        this.controls.maxDistance = 150;
        this.controls.enabled = true; // Users can optionally look around
        this.controls.target.set(0, 0, 0);

        // Lighting
        // Bright ambient light for good visibility
        this.ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(this.ambientLight);
        
        // Main directional light - brighter and warmer
        this.moonLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.moonLight.position.set(30, 60, 30);
        this.moonLight.castShadow = true;
        this.moonLight.shadow.mapSize.width = 2048;
        this.moonLight.shadow.mapSize.height = 2048;
        this.moonLight.shadow.camera.near = 0.5;
        this.moonLight.shadow.camera.far = 500;
        this.moonLight.shadow.camera.left = -50;
        this.moonLight.shadow.camera.right = 50;
        this.moonLight.shadow.camera.top = 50;
        this.moonLight.shadow.camera.bottom = -50;
        this.scene.add(this.moonLight);
        
        // Secondary fill light from opposite side
        const fillLight = new THREE.DirectionalLight(0xffeedd, 0.5);
        fillLight.position.set(-30, 40, -30);
        this.scene.add(fillLight);

        // Bright center light
        const streetLight = new THREE.PointLight(0xffffff, 1.0, 80);
        streetLight.position.set(0, 25, 0);
        this.scene.add(streetLight);
        
        this.windowTexture = this.createWindowTexture();

        this.tiles = [];
        this.playerMeshes = [];
        this.playerAnimCaches = []; // Animation caches for penguin cosmetics
        this.cashPiles = [[], []];
        this.ambientCars = [];
        this.pedestrians = [];
        this.isMoving = false;
        this.animationFrameId = null;
        this.disposed = false;
        this.lastTime = 0;

        this.initBoard();
        this.initBlackBorder();
        this.initPerimeterLights();
        this.initRoad();
        this.initSidewalks();
        this.initTraffic();
        this.initPedestrians();
        this.initDecor();
        
        this.animate();
    }

    createWindowTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#222'; ctx.fillRect(0,0,64,64);
        ctx.fillStyle = '#ffeb3b'; 
        ctx.fillRect(8, 8, 20, 20); ctx.fillRect(36, 8, 20, 20);
        ctx.fillRect(8, 36, 20, 20); ctx.fillRect(36, 36, 20, 20);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }

    createTexture(text, colorHex, price) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f1f2f6'; ctx.fillRect(0,0,512,512);
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        for(let i=0; i<50; i++) ctx.fillRect(Math.random()*512, Math.random()*512, 10, 10);
        if(colorHex !== 'NONE') {
            ctx.fillStyle = '#' + new THREE.Color(GROUPS[colorHex]).getHexString();
            ctx.fillRect(0,0,512, 120);
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 120, 512, 10);
        }
        ctx.fillStyle = '#2d3436'; ctx.textAlign = 'center'; ctx.font = 'bold 50px Segoe UI';
        const words = text.split(' '); let y = (colorHex !== 'NONE') ? 180 : 200;
        words.forEach(w => { ctx.fillText(w, 256, y); y += 60; });
        if (price > 0) {
            ctx.font = 'bold 60px Courier New'; ctx.fillStyle = '#2d3436'; ctx.fillText(`$${price}`, 256, 460);
        }
        ctx.strokeStyle = '#2d3436'; ctx.lineWidth = 10; ctx.strokeRect(0,0,512,512);
        return new THREE.CanvasTexture(canvas);
    }

    initBoard() {
        const L_CARDS = 36;
        const tileStep = 7.2;
        
        const tableGeo = new THREE.CylinderGeometry(120, 120, 2, 32);
        const tableMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.position.y = -1;
        this.scene.add(table);
        
        const centerGeo = new THREE.BoxGeometry(24, 0.2, 24);
        const centerMat = new THREE.MeshStandardMaterial({ color: 0x27ae60 });
        const center = new THREE.Mesh(centerGeo, centerMat);
        center.position.y = 0.1;
        this.scene.add(center);
        
        for(let i=0; i<40; i++) {
            let x=0, z=0, rot=0;
            if (i >= 0 && i <= 10) { 
                if(i===0) { x = L_CARDS; z = L_CARDS; rot = 0; } 
                else if(i===10) { x = -L_CARDS; z = L_CARDS; rot = 0; } 
                else { x = (5 - i) * tileStep; z = L_CARDS; rot = 0; }
            } else if (i > 10 && i <= 20) { 
                if(i===20) { x = -L_CARDS; z = -L_CARDS; rot = -Math.PI/2; } 
                else { x = -L_CARDS; z = (15 - i) * tileStep; rot = -Math.PI/2; }
            } else if (i > 20 && i <= 30) { 
                if(i===30) { x = L_CARDS; z = -L_CARDS; rot = Math.PI; } 
                else { x = -(25 - i) * tileStep; z = -L_CARDS; rot = Math.PI; }
            } else if (i > 30) { 
                x = L_CARDS; z = -(35 - i) * tileStep; rot = Math.PI/2;
            }
            
            const data = SPACES[i];
            const isCorner = (i%10 === 0);
            const w = isCorner ? 5.5 : 4.0;
            const d = 5.5;
            
            const mat = new THREE.MeshStandardMaterial({ 
                map: this.createTexture(data.name, data.group, data.price),
                roughness: 0.3, metalness: 0.05
            });
            const geo = new THREE.BoxGeometry(w, 0.4, d);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, 0.2, z);
            mesh.rotation.y = rot;
            mesh.castShadow = true; mesh.receiveShadow = true;
            mesh.userData = { id: i, data: data };
            this.scene.add(mesh);
            this.tiles.push({ mesh, x, z, rot });
            
            if (data.type === 'property' || data.type === 'station') {
                this.addBuilding(mesh, data, x, z, rot);
            }
        }
    }

    initBlackBorder() {
        const group = new THREE.Group(); group.position.y = 0.04;
        const mat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.8 });
        const R = 44; const width = 5;
        const sideLen = (R * 2) + width;
        const t = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, width), mat);
        t.rotation.x = -Math.PI/2; t.position.set(0,0, -R);
        const b = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, width), mat);
        b.rotation.x = -Math.PI/2; b.position.set(0,0, R);
        const l = new THREE.Mesh(new THREE.PlaneGeometry(width, sideLen - width*2), mat);
        l.rotation.x = -Math.PI/2; l.position.set(-R, 0, 0);
        const r = new THREE.Mesh(new THREE.PlaneGeometry(width, sideLen - width*2), mat);
        r.rotation.x = -Math.PI/2; r.position.set(R, 0, 0);
        group.add(t, b, l, r);
        this.scene.add(group);
    }

    initPerimeterLights() {
        const R = 48; const count = 20;
        for(let i=0; i<count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const x = Math.cos(angle) * R; const z = Math.sin(angle) * R;
            const postGroup = new THREE.Group();
            postGroup.position.set(x, 0, z); postGroup.lookAt(0, 0, 0);
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6), new THREE.MeshStandardMaterial({color: 0x222222}));
            pole.position.y = 3;
            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 2.5), new THREE.MeshStandardMaterial({color: 0x222222}));
            arm.position.y = 5.8; arm.position.z = 1.2;
            const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.4), new THREE.MeshBasicMaterial({color: 0xffaa00}));
            bulb.position.set(0, 5.75, 2.3);
            const spot = new THREE.SpotLight(0xffaa00, 2.0, 30, 0.8, 0.5, 1);
            spot.position.set(0, 5.8, 2.3);
            const targetObj = new THREE.Object3D();
            targetObj.position.set(0, 0, 4);
            postGroup.add(targetObj);
            spot.target = targetObj;
            const point = new THREE.PointLight(0xffaa00, 0.5, 10);
            point.position.set(0, 5.5, 2.3);
            postGroup.add(pole, arm, bulb, spot, point);
            this.scene.add(postGroup);
        }
    }

    initRoad() {
        const R = 24; const roadWidth = 6; const len = 42;
        const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
        const group = new THREE.Group(); group.position.y = 0.05;
        
        const addStrip = (x, z, w, h, rot) => {
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roadMat);
            plane.rotation.x = -Math.PI/2; plane.rotation.z = rot;
            plane.position.set(x, 0, z); plane.receiveShadow = true;
            const line = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.15), new THREE.MeshBasicMaterial({ color: 0xffcc00 }));
            line.position.z = 0.02;
            const dashL = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.1), new THREE.MeshBasicMaterial({color:0xaaaaaa}));
            dashL.position.set(0, 0.02, -1.5);
            const dashR = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.1), new THREE.MeshBasicMaterial({color:0xaaaaaa}));
            dashR.position.set(0, 0.02, 1.5);
            plane.add(line, dashL, dashR); group.add(plane);
        };
        addStrip(0, R, len, roadWidth, 0); addStrip(0, -R, len, roadWidth, 0);
        addStrip(-R, 0, len, roadWidth, Math.PI/2); addStrip(R, 0, len, roadWidth, Math.PI/2);
        
        const cornerGeo = new THREE.PlaneGeometry(roadWidth, roadWidth);
        [{x:R, z:R}, {x:-R, z:R}, {x:-R, z:-R}, {x:R, z:-R}].forEach(c => {
            const m = new THREE.Mesh(cornerGeo, roadMat);
            m.rotation.x = -Math.PI/2; m.position.set(c.x, 0, c.z); group.add(m);
        });
        this.scene.add(group);
    }

    initSidewalks() {
        const swMat = new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.9 });
        const group = new THREE.Group(); group.position.y = 0.06;
        [19, 30].forEach(radius => {
            const width = 3;
            const sideLen = (radius * 2) + width;
            const t = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, width), swMat);
            t.rotation.x = -Math.PI/2; t.position.set(0,0, -radius);
            const b = new THREE.Mesh(new THREE.PlaneGeometry(sideLen, width), swMat);
            b.rotation.x = -Math.PI/2; b.position.set(0,0, radius);
            const l = new THREE.Mesh(new THREE.PlaneGeometry(width, sideLen - width*2), swMat);
            l.rotation.x = -Math.PI/2; l.position.set(-radius, 0, 0);
            const r = new THREE.Mesh(new THREE.PlaneGeometry(width, sideLen - width*2), swMat);
            r.rotation.x = -Math.PI/2; r.position.set(radius, 0, 0);
            group.add(t, b, l, r);
        });
        this.scene.add(group);
    }

    initTraffic() {
        for(let i=0; i<6; i++) { this.ambientCars.push(this.createAmbientCar(i * 0.16, 0)); }
        for(let i=0; i<6; i++) { this.ambientCars.push(this.createAmbientCar(i * 0.16 + 0.08, 1)); }
    }

    createAmbientCar(offset, lane) {
        const group = new THREE.Group();
        const color = Math.random() > 0.5 ? 0xffffff : (Math.random() > 0.5 ? 0xff4757 : 0x1e90ff);
        const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.2 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 2.2), bodyMat); body.position.y = 0.5;
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x333 })); cabin.position.y = 1.0;
        group.add(body, cabin); 
        this.scene.add(group);
        return { mesh: group, progress: offset, lane, speed: 0.00015 + Math.random() * 0.0001 };
    }

    initPedestrians() {
        for(let i=0; i<16; i++) {
            this.pedestrians.push(this.createPedestrian(Math.random(), Math.random() > 0.5 ? 0 : 1));
        }
    }

    createPedestrian(progress, lane) {
        const group = new THREE.Group();
        const shirtColor = new THREE.Color().setHSL(Math.random(), 0.7, 0.5);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.2), new THREE.MeshStandardMaterial({ color: shirtColor }));
        body.position.y = 0.5;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.25, 0.2), new THREE.MeshStandardMaterial({ color: 0xffdab9 }));
        head.position.y = 0.85;
        group.add(body, head);
        this.scene.add(group);
        return { mesh: group, progress, lane, speed: 0.00005 + Math.random() * 0.00005 };
    }

    addBuilding(tileMesh, data, tx, tz, rot) {
        const height = data.price ? (data.price / 30) : 3;
        const color = data.group !== 'NONE' ? GROUPS[data.group] : 0x7f8c8d;
        const buildingGroup = new THREE.Group();
        
        // Material with emissive for ownership glow effect (like source code)
        const baseMat = new THREE.MeshStandardMaterial({ 
            color, 
            roughness: 0.3, 
            metalness: 0.1, 
            map: this.windowTexture,
            emissive: 0x000000,  // Will be set when purchased
            emissiveIntensity: 0.3
        });
        baseMat.map.repeat.set(1, Math.floor(height/2));
        
        const type = (height > 6) ? 'SKYSCRAPER' : (data.type === 'station' ? 'STATION' : 'RESIDENTIAL');
        
        if (type === 'SKYSCRAPER') {
            const tower = new THREE.Mesh(new THREE.BoxGeometry(2.5, height, 2.5), baseMat);
            tower.position.y = height/2;
            buildingGroup.add(tower);
            if (height > 10) {
                const topMat = baseMat.clone();
                const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.5), topMat);
                top.position.y = height + 1.5;
                buildingGroup.add(top);
            }
        } else if (type === 'STATION') {
            const base = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 2), baseMat);
            base.position.y = 1.25;
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x000000, emissiveIntensity: 0.3 });
            const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 16, 1, false, 0, Math.PI), roofMat);
            roof.rotation.z = Math.PI/2;
            roof.position.y = 2.5;
            buildingGroup.add(base, roof);
        } else {
            const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, height, 2.2), baseMat);
            base.position.y = height/2;
            buildingGroup.add(base);
            // Add roof or AC unit like source
            if (Math.random() > 0.5) {
                const roofMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, emissive: 0x000000, emissiveIntensity: 0.3 });
                const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.5, 4), roofMat);
                roof.rotation.y = Math.PI/4;
                roof.position.y = height + 0.75;
                buildingGroup.add(roof);
            } else {
                const acMat = new THREE.MeshStandardMaterial({ color: 0x999999, emissive: 0x000000, emissiveIntensity: 0.3 });
                const ac = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), acMat);
                ac.position.y = height + 0.25;
                buildingGroup.add(ac);
            }
        }
        
        const innerR = 15; const scale = 15 / 36;
        let bx = tx * scale; let bz = tz * scale;
        if (Math.abs(tx) > Math.abs(tz)) { bx = (tx > 0) ? innerR : -innerR; } 
        else { bz = (tz > 0) ? innerR : -innerR; }
        buildingGroup.position.set(bx, 0.2, bz);
        buildingGroup.userData = { targetY: 0.2 };
        buildingGroup.rotation.y = rot;
        buildingGroup.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; }});
        this.scene.add(buildingGroup);
        this.tiles[tileMesh.userData.id].building = buildingGroup;
    }

    initDecor() {
        for(let i=0; i<20; i++) {
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 1.5), new THREE.MeshStandardMaterial({color: 0x5D4037}));
            const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2), new THREE.MeshStandardMaterial({color: 0x27ae60}));
            leaves.position.y = 1.5; trunk.position.y = 0.75; tree.add(trunk, leaves);
            const angle = Math.random() * Math.PI * 2; const r = Math.random() * 10;
            tree.position.set(Math.cos(angle)*r, 0.1, Math.sin(angle)*r);
            this.scene.add(tree);
        }
    }

    addPenguinPlayer(playerId, playerData) {
        const group = new THREE.Group();
        
        // Get appearance data - can be passed as 'appearance' or 'cosmetics'
        // Authenticated users have: { skin, hat, eyes, mouth, bodyItem, mount }
        // Guests may have: { color, hat, eyes, mouth, bodyItem, mount }
        const appearanceData = playerData.appearance || playerData.cosmetics || {};
        
        // Debug: log what appearance we received
        console.log(`🐧 Monopoly player ${playerId} appearance:`, appearanceData);
        
        // Determine feather color - check all possible property names
        // Priority: skin (authenticated) > color > featherColor > default
        const featherColor = appearanceData.skin || appearanceData.color || appearanceData.featherColor || (playerId === 0 ? 'cyan' : 'pink');
        
        try {
            const characterBuilder = createCharacterBuilder(THREE);
            const { buildCharacterMesh } = characterBuilder;
            
            // Build appearance object matching voxel world format
            const appearance = {
                // Feather color - use determined color
                color: featherColor,
                // All cosmetics from voxel world
                hat: appearanceData.hat || 'none',
                eyes: appearanceData.eyes || 'normal',
                mouth: appearanceData.mouth || 'beak',
                bodyItem: appearanceData.bodyItem || 'none',
                mount: appearanceData.mount || 'none',
                heldItem: appearanceData.heldItem || 'none',
                // Special character types
                characterType: appearanceData.characterType || playerData.characterType || null
            };
            
            console.log(`🐧 Building penguin with appearance:`, appearance);
            
            const penguin = buildCharacterMesh(appearance);
            penguin.scale.set(2, 2, 2);
            penguin.name = 'penguin_mesh';
            group.add(penguin);
            
            // Store penguin mesh reference for animations
            group.userData.penguinMesh = penguin;
            group.userData.appearance = appearance;
            
            // Cache animated parts for cosmetic animations (propeller, flames, etc.)
            const animCache = cacheAnimatedParts(penguin);
            this.playerAnimCaches.push(animCache);
        } catch (e) {
            console.warn('Penguin build failed, using fallback:', e);
            // Fallback penguin with player's color if available
            const fallbackColor = featherColor;
            const colorHex = typeof fallbackColor === 'string' 
                ? (fallbackColor.startsWith('#') ? parseInt(fallbackColor.slice(1), 16) : PALETTE[fallbackColor] || 0x00bcd4)
                : fallbackColor;
            
            const mat = new THREE.MeshStandardMaterial({ color: colorHex });
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 8, 16), mat);
            body.position.y = 1;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), mat);
            head.position.y = 1.8;
            group.add(body, head);
            
            // No animations for fallback penguin
            this.playerAnimCaches.push(null);
        }
        
        // Name tag with player's feather color as background
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Use player's color for name tag background
        const tagColor = featherColor;
        const tagColorHex = typeof tagColor === 'string' 
            ? (PALETTE[tagColor] ? '#' + PALETTE[tagColor].toString(16).padStart(6, '0') : tagColor)
            : '#' + tagColor.toString(16).padStart(6, '0');
        
        ctx.fillStyle = tagColorHex;
        ctx.fillRect(0, 0, 256, 64);
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        const nameText = (playerData.name || `Player ${playerId + 1}`).slice(0, 12);
        ctx.strokeText(nameText, 128, 42);
        ctx.fillText(nameText, 128, 42);
        const labelMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) });
        const label = new THREE.Sprite(labelMat);
        label.scale.set(4, 1, 1);
        label.position.y = 4;
        group.add(label);
        
        const startPos = this.getPawnPos(0, playerId);
        group.position.set(startPos.x, 0.3, startPos.z);
        this.scene.add(group);
        this.playerMeshes.push(group);
        
        return group;
    }

    getPawnPos(tileIndex, playerId) {
        const L = 44; const step = 8.8;
        let x=0, z=0, rot=0;
        
        if (tileIndex <= 10) { 
            if(tileIndex===0) { x = L; z = L; }
            else if(tileIndex===10) { x = -L; z = L; }
            else { x = (5 - tileIndex) * step; z = L; }
        } else if (tileIndex <= 20) { 
            if(tileIndex===20) { x = -L; z = -L; rot = -Math.PI/2; }
            else { x = -L; z = (15 - tileIndex) * step; rot = -Math.PI/2; }
        } else if (tileIndex <= 30) { 
            if(tileIndex===30) { x = L; z = -L; rot = Math.PI; }
            else { x = -(25 - tileIndex) * step; z = -L; rot = Math.PI; }
        } else { 
            x = L; z = -(35 - tileIndex) * step; rot = Math.PI/2;
        }

        // Offset players so they don't overlap
        const offset = playerId === 0 ? -2 : 2;
        x += Math.cos(rot + Math.PI/2) * offset;
        z += Math.sin(rot + Math.PI/2) * offset;

        return { x, z, rot };
    }

    // Camera - move to specific board position (wide view)
    focusOnPosition(position) {
        const tile = this.tiles[position];
        if (!tile) return;
        
        // Camera pulled back significantly to see board
        const targetX = tile.x * 0.25;
        const targetZ = tile.z * 0.25;
        
        gsap.to(this.camera.position, { x: targetX, y: 60, z: targetZ + 65, duration: 1.2, ease: "power2.inOut" });
        gsap.to(this.controls.target, { x: targetX, y: 0, z: targetZ, duration: 1.2, ease: "power2.inOut" });
    }

    // Camera - focus on player piece (positioned behind player, facing board center)
    focusOnPlayer(playerIdx) {
        const piece = this.playerMeshes[playerIdx];
        if (!piece) return;
        
        const px = piece.position.x;
        const pz = piece.position.z;
        
        // Calculate direction from center to player (to position camera behind player)
        const distFromCenter = Math.sqrt(px * px + pz * pz);
        const dirX = distFromCenter > 0 ? px / distFromCenter : 0;
        const dirZ = distFromCenter > 0 ? pz / distFromCenter : 1;
        
        // Position camera behind the player, looking toward board center
        // Camera sits behind the player (further from center) and elevated
        const camDistance = 25; // Distance behind player
        const camHeight = 18;   // Camera height
        
        const camX = px + dirX * camDistance;
        const camZ = pz + dirZ * camDistance;
        
        // Camera looks at the board center (0, 0, 0)
        gsap.to(this.camera.position, { x: camX, y: camHeight, z: camZ, duration: 1, ease: "power2.inOut" });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1, ease: "power2.inOut" });
    }

    // Overview camera - shows entire board
    focusOverview() {
        gsap.to(this.camera.position, { x: 0, y: 90, z: 85, duration: 1.5, ease: "power2.inOut" });
        gsap.to(this.controls.target, { x: 0, y: 0, z: 0, duration: 1.5, ease: "power2.inOut" });
    }

    // Animate piece moving with camera following (wide view to keep piece visible)
    movePiece(playerId, fromIndex, toIndex, onComplete) {
        const piece = this.playerMeshes[playerId];
        if (!piece) { onComplete?.(); return; }
        
        this.isMoving = true;

        // First, position camera to see the movement path
        const startPos = this.getPawnPos(fromIndex, playerId);
        const endPos = this.getPawnPos(toIndex, playerId);
        
        // Camera looks at midpoint between start and end, pulled way back
        const midX = (startPos.x + endPos.x) / 2 * 0.3;
        const midZ = (startPos.z + endPos.z) / 2 * 0.3;
        
        // Set camera to wide view before movement starts
        gsap.to(this.camera.position, { x: midX, y: 65, z: midZ + 70, duration: 0.5, ease: "power2.out" });
        gsap.to(this.controls.target, { x: midX, y: 0, z: midZ, duration: 0.5, ease: "power2.out" });

        const tl = gsap.timeline({ 
            delay: 0.5, // Wait for camera to settle
            onComplete: () => {
                this.isMoving = false;
                onComplete?.();
            } 
        });
        
        let currentIndex = fromIndex;
        const steps = toIndex >= fromIndex ? (toIndex - fromIndex) : (40 - fromIndex + toIndex);
        
        for(let s=0; s < steps; s++) {
            currentIndex = (currentIndex + 1) % 40;
            const target = this.getPawnPos(currentIndex, playerId);
            
            // Piece hops to next space
            tl.to(piece.position, { x: target.x, z: target.z, duration: 0.3, ease: "power1.inOut" }, ">");
            tl.to(piece.position, { y: 3, duration: 0.12, ease: "power1.out" }, "<");
            tl.to(piece.position, { y: 0.3, duration: 0.18, ease: "bounce.out" }, ">-0.08");
        }
        
        // After movement done, smoothly focus on landing spot
        tl.call(() => {
            const finalPos = this.getPawnPos(toIndex, playerId);
            gsap.to(this.camera.position, { 
                x: finalPos.x * 0.3, 
                y: 55, 
                z: finalPos.z * 0.3 + 60, 
                duration: 0.8, 
                ease: "power2.inOut" 
            });
            gsap.to(this.controls.target, { 
                x: finalPos.x * 0.3, 
                y: 0, 
                z: finalPos.z * 0.3, 
                duration: 0.8, 
                ease: "power2.inOut" 
            });
        });
    }

    setPlayerPosition(playerId, position) {
        const piece = this.playerMeshes[playerId];
        if (!piece) return;
        const pos = this.getPawnPos(position, playerId);
        piece.position.set(pos.x, 0.3, pos.z);
    }
    
    showChatBubble(playerIdx, text) {
        const piece = this.playerMeshes[playerIdx];
        if (!piece) return;
        
        // Remove existing bubble for this player
        const existingBubble = piece.getObjectByName('chatBubble');
        if (existingBubble) {
            piece.remove(existingBubble);
        }
        
        // Create canvas for speech bubble
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        // Truncate text
        const displayText = text.length > 40 ? text.substring(0, 37) + '...' : text;
        
        // Draw bubble background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(10, 10, canvas.width - 20, canvas.height - 30, 15);
        ctx.fill();
        
        // Draw bubble pointer
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 10, canvas.height - 20);
        ctx.lineTo(canvas.width / 2, canvas.height - 5);
        ctx.lineTo(canvas.width / 2 + 10, canvas.height - 20);
        ctx.fill();
        
        // Draw text
        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Word wrap
        const words = displayText.split(' ');
        let lines = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            if (ctx.measureText(testLine).width > canvas.width - 40) {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        
        const lineHeight = 22;
        const startY = (canvas.height - 15) / 2 - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, startY + i * lineHeight);
        });
        
        // Create sprite - larger for readability
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.name = 'chatBubble';
        sprite.scale.set(12, 6, 1); // Much larger for readability
        sprite.position.set(0, 6, 0);
        
        piece.add(sprite);
        
        // Animate in
        sprite.material.opacity = 0;
        gsap.to(sprite.material, { opacity: 1, duration: 0.2 });
        gsap.to(sprite.position, { y: 7, duration: 0.2, ease: "back.out" });
        
        // Remove after 4 seconds
        setTimeout(() => {
            gsap.to(sprite.material, { 
                opacity: 0, 
                duration: 0.3,
                onComplete: () => {
                    piece.remove(sprite);
                    texture.dispose();
                    material.dispose();
                }
            });
        }, 4000);
    }

    setPlayerLight(playerIdx) {
        // Subtle tint based on player, but keep it bright
        const color = playerIdx === 0 ? new THREE.Color(0xddeeff) : new THREE.Color(0xffeedd);
        gsap.to(this.moonLight.color, { r: color.r, g: color.g, b: color.b, duration: 0.8 });
    }

    // Money particle effect - animated bills flying between positions (from source code)
    spawnMoneyParticles(startPos, endPos) {
        const count = 10;
        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(0.5, 0.25), 
                new THREE.MeshBasicMaterial({ color: 0x2ecc71, side: THREE.DoubleSide })
            );
            mesh.position.copy(startPos);
            mesh.position.y += 2;
            this.scene.add(mesh);
            
            const midX = (startPos.x + endPos.x) / 2;
            const midZ = (startPos.z + endPos.z) / 2;
            const tl = gsap.timeline({ onComplete: () => this.scene.remove(mesh) });
            tl.to(mesh.position, { x: midX, y: 10, z: midZ, duration: 0.5, ease: "power1.out" });
            tl.to(mesh.position, { x: endPos.x, y: 0, z: endPos.z, duration: 0.5, ease: "power1.in" });
            tl.to(mesh.rotation, { x: Math.random()*5, y: Math.random()*5, duration: 1 }, "<");
        }
    }
    
    updateCashVisuals(playerId, money, payerPos = null) {
        const count = Math.floor(money / 250);
        const pile = this.cashPiles[playerId];
        const sideX = playerId === 0 ? 55 : -55;
        const sideZ = playerId === 0 ? 20 : -20;
        
        // Spawn money particles when receiving rent (from source code)
        if (payerPos) {
            this.spawnMoneyParticles(payerPos, new THREE.Vector3(sideX, 0, sideZ));
        }

        // Add bills with animation (from source code)
        if (pile.length < count) {
            const diff = count - pile.length;
            for (let i = 0; i < diff && pile.length < 30; i++) {
                const geo = new THREE.BoxGeometry(1.5, 0.2, 0.8);
                const mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
                const bill = new THREE.Mesh(geo, mat);
                const stackIndex = pile.length;
                const col = stackIndex % 3;
                const row = Math.floor(stackIndex / 3);
                const height = Math.floor(stackIndex / 9);
                bill.position.set(sideX + (col * 1.2), height * 0.25, sideZ + (row * 1.5));
                bill.rotation.y = Math.random() * 0.5;
                this.scene.add(bill);
                pile.push(bill);
                // Pop-in animation (from source code)
                gsap.from(bill.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: "back.out" });
            }
        } else if (pile.length > count) {
            const diff = pile.length - count;
            for (let i = 0; i < diff; i++) {
                const bill = pile.pop();
                this.scene.remove(bill);
            }
        }
    }

    // When a property is purchased - set emissive color and animate (from source code)
    highlightBuilding(position, ownerIdx) {
        const tile = this.tiles[position];
        if (!tile?.building) return;
        
        const building = tile.building;
        const ownerColor = ownerIdx === 0 ? 0xFF4757 : 0x1E90FF; // Player 1: red, Player 2: blue (from source)
        
        // Set emissive glow on all building materials
        building.traverse(child => {
            if (child.isMesh && child.material && child.material.emissive) {
                child.material.emissive.setHex(ownerColor);
                child.material.emissiveIntensity = 0.4;
            }
        });
        
        // Scale animation (exactly like source: y: 1.2, yoyo, repeat 1)
        gsap.to(building.scale, { y: 1.2, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" });
    }
    
    // Monopoly effect - pulse all buildings in a color group (from source code)
    highlightMonopoly(positions) {
        positions.forEach(pos => {
            const tile = this.tiles[pos];
            if (tile?.building) {
                gsap.to(tile.building.scale, { x: 1.1, z: 1.1, duration: 0.5, yoyo: true, repeat: 1 });
            }
        });
    }
    
    // Sync all owned properties at once (for reconnection or initial sync)
    syncOwnedProperties(player1Props, player2Props) {
        player1Props?.forEach(pos => {
            const tile = this.tiles[pos];
            if (tile?.building) {
                tile.building.traverse(child => {
                    if (child.isMesh && child.material && child.material.emissive) {
                        child.material.emissive.setHex(0xFF4757); // P1 red
                        child.material.emissiveIntensity = 0.4;
                    }
                });
            }
        });
        player2Props?.forEach(pos => {
            const tile = this.tiles[pos];
            if (tile?.building) {
                tile.building.traverse(child => {
                    if (child.isMesh && child.material && child.material.emissive) {
                        child.material.emissive.setHex(0x1E90FF); // P2 blue
                        child.material.emissiveIntensity = 0.4;
                    }
                });
            }
        });
    }

    spawnFireworks() {
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];
        for(let i=0; i<8; i++) {
            setTimeout(() => {
                const x = (Math.random() - 0.5) * 60;
                const z = (Math.random() - 0.5) * 60;
                const color = colors[Math.floor(Math.random() * colors.length)];
                for(let j=0; j<15; j++) {
                    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
                    const p = new THREE.Mesh(new THREE.SphereGeometry(0.3), mat);
                    p.position.set(x, 15, z);
                    this.scene.add(p);
                    gsap.to(p.position, {
                        x: x + (Math.random()-0.5)*20,
                        y: 15 + (Math.random()-0.5)*20,
                        z: z + (Math.random()-0.5)*20,
                        duration: 1.2,
                        ease: "power2.out",
                        onComplete: () => this.scene.remove(p)
                    });
                    gsap.to(mat, { opacity: 0, duration: 1.2 });
                }
            }, i * 400);
        }
    }

    onResize(w, h) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    animate() {
        if (this.disposed) return;
        this.animationFrameId = requestAnimationFrame(() => this.animate());
        const time = Date.now() * 0.001;
        const delta = time - this.lastTime;
        this.lastTime = time;
        
        // Update cars
        this.ambientCars.forEach(car => {
            car.progress += car.lane === 0 ? car.speed : -car.speed;
            if (car.progress > 1) car.progress -= 1;
            if (car.progress < 0) car.progress += 1;
            const R = car.lane === 0 ? 22.5 : 25.5;
            const P = car.progress * 4;
            let x, z;
            if (P < 1) { x = R - P * 2 * R; z = R; }
            else if (P < 2) { x = -R; z = R - (P-1) * 2 * R; }
            else if (P < 3) { x = -R + (P-2) * 2 * R; z = -R; }
            else { x = R; z = -R + (P-3) * 2 * R; }
            car.mesh.position.set(x, 0.5, z);
            car.mesh.lookAt(x + (car.lane === 0 ? -1 : 1), 0.5, z);
        });
        
        // Update pedestrians
        this.pedestrians.forEach(p => {
            p.progress = (p.progress + p.speed) % 1;
            const R = p.lane === 0 ? 19 : 30;
            const P = p.progress * 4;
            let x, z;
            if (P < 1) { x = R - P * 2 * R; z = R; }
            else if (P < 2) { x = -R; z = R - (P-1) * 2 * R; }
            else if (P < 3) { x = -R + (P-2) * 2 * R; z = -R; }
            else { x = R; z = -R + (P-3) * 2 * R; }
            p.mesh.position.set(x, 0.1 + Math.sin(time * 8) * 0.03, z);
        });
        
        // Animate penguin cosmetics (propeller hats, fire effects, etc.)
        this.playerAnimCaches.forEach(cache => {
            if (cache) {
                animateCosmeticsFromCache(cache, time, delta, 0.1); // VOXEL_SIZE = 0.1 at penguin scale
            }
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        this.disposed = true;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        this.renderer.dispose();
        if (this.container?.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

// ============== REACT COMPONENT ==============
const P2PMonopoly = ({ onMatchEnd }) => {
    const { activeMatch, matchState, playCard, forfeitMatch, clearMatch } = useChallenge();
    
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    
    // Get connection status for mobile handling
    const { connected } = useMultiplayer();
    
    // UI State
    const [showDice, setShowDice] = useState(false);
    const [diceValues, setDiceValues] = useState([1, 1]);
    const [isRolling, setIsRolling] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [showDisconnected, setShowDisconnected] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    
    // Check if mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Show chat bubble above character when message received
    const handleChatMessage = useCallback((msg) => {
        if (!engineRef.current || !activeMatch) return;
        const isPlayer1 = msg.senderName === activeMatch.player1?.name;
        const isPlayer2 = msg.senderName === activeMatch.player2?.name;
        if (isPlayer1) engineRef.current.showChatBubble(0, msg.text);
        else if (isPlayer2) engineRef.current.showChatBubble(1, msg.text);
    }, [activeMatch]);
    
    // Refs for tracking state changes
    const initedRef = useRef(false);
    const lastMoveKeyRef = useRef(null);
    const lastTurnRef = useRef(null);
    const lastEventKeyRef = useRef(null);
    const lastPropsCountRef = useRef({ p1: 0, p2: 0 });
    
    // Track connection status for mobile
    useEffect(() => {
        if (!connected) {
            // Show disconnection warning after brief delay (avoid flicker)
            const timeout = setTimeout(() => setShowDisconnected(true), 1000);
            return () => clearTimeout(timeout);
        } else {
            setShowDisconnected(false);
        }
    }, [connected]);

    // Initialize engine
    useEffect(() => {
        if (!containerRef.current || engineRef.current) return;
        engineRef.current = new MonopolyEngine(containerRef.current);
        
        const handleResize = () => {
            if (containerRef.current && engineRef.current) {
                engineRef.current.onResize(containerRef.current.clientWidth, containerRef.current.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            engineRef.current?.dispose();
            engineRef.current = null;
        };
    }, []);

    // Initialize players
    useEffect(() => {
        if (!engineRef.current || !activeMatch || initedRef.current) return;
        
        // Player 1 (challenger) - use appearance data from match
        engineRef.current.addPenguinPlayer(0, { 
            name: activeMatch.player1?.name,
            appearance: activeMatch.player1?.appearance  // Contains all cosmetics: color, hat, eyes, mouth, bodyItem, etc.
        });
        
        // Player 2 (target) - use appearance data from match
        engineRef.current.addPenguinPlayer(1, { 
            name: activeMatch.player2?.name,
            appearance: activeMatch.player2?.appearance  // Contains all cosmetics: color, hat, eyes, mouth, bodyItem, etc.
        });
        
        engineRef.current.updateCashVisuals(0, 1500);
        engineRef.current.updateCashVisuals(1, 1500);
        
        // Initial camera - overview then focus on player 1
        setTimeout(() => engineRef.current?.focusOnPlayer(0), 800);
        
        initedRef.current = true;
    }, [activeMatch]);
    
    // Sync existing properties on initial load (for reconnection)
    useEffect(() => {
        if (!engineRef.current || !matchState || !initedRef.current) return;
        const isPlayer1 = activeMatch?.yourRole === 'player1';
        const p1Props = isPlayer1 ? matchState.myProperties : matchState.opponentProperties;
        const p2Props = isPlayer1 ? matchState.opponentProperties : matchState.myProperties;
        
        // Only sync once on first render with data
        if (lastPropsCountRef.current.p1 === 0 && lastPropsCountRef.current.p2 === 0) {
            engineRef.current.syncOwnedProperties(p1Props, p2Props);
            lastPropsCountRef.current = { p1: p1Props?.length || 0, p2: p2Props?.length || 0 };
        }
    }, [matchState, activeMatch]);

    // Sync game state from server
    useEffect(() => {
        if (!engineRef.current || !matchState) return;
        const engine = engineRef.current;
        const isPlayer1 = activeMatch?.yourRole === 'player1';
        
        // === UPDATE CASH ===
        engine.updateCashVisuals(0, isPlayer1 ? matchState.myMoney : matchState.opponentMoney);
        engine.updateCashVisuals(1, isPlayer1 ? matchState.opponentMoney : matchState.myMoney);
        
        // === SYNC PROPERTY OWNERSHIP - Highlight buildings (from source code visual) ===
        const p1Props = isPlayer1 ? matchState.myProperties : matchState.opponentProperties;
        const p2Props = isPlayer1 ? matchState.opponentProperties : matchState.myProperties;
        const currentP1Count = p1Props?.length || 0;
        const currentP2Count = p2Props?.length || 0;
        
        // When properties change, highlight newly purchased building
        if (currentP1Count > lastPropsCountRef.current.p1 && p1Props?.length > 0) {
            const newProp = p1Props[p1Props.length - 1];
            engine.highlightBuilding(newProp, 0);
        }
        if (currentP2Count > lastPropsCountRef.current.p2 && p2Props?.length > 0) {
            const newProp = p2Props[p2Props.length - 1];
            engine.highlightBuilding(newProp, 1);
        }
        lastPropsCountRef.current = { p1: currentP1Count, p2: currentP2Count };
        
        // === SYNC POSITIONS (when not animating) ===
        if (!engine.isMoving) {
            engine.setPlayerPosition(0, isPlayer1 ? matchState.myPosition : matchState.opponentPosition);
            engine.setPlayerPosition(1, isPlayer1 ? matchState.opponentPosition : matchState.myPosition);
        }
        
        // === HANDLE TURN CHANGE ===
        if (lastTurnRef.current !== matchState.currentTurn) {
            lastTurnRef.current = matchState.currentTurn;
            const currentPlayerIdx = matchState.currentTurn === 'player1' ? 0 : 1;
            engine.setPlayerLight(currentPlayerIdx);
            // Focus camera on current player at start of their turn
            if (!engine.isMoving) {
                engine.focusOnPlayer(currentPlayerIdx);
            }
        }
        
        // === HANDLE MOVE ANIMATION ===
        if (matchState.animatingMove && matchState.moveFrom !== undefined) {
            const moveKey = `${matchState.currentTurn}-${matchState.moveFrom}-${matchState.moveTo}`;
            if (lastMoveKeyRef.current !== moveKey) {
                lastMoveKeyRef.current = moveKey;
                const movingIdx = matchState.currentTurn === 'player1' ? 0 : 1;
                engine.movePiece(movingIdx, matchState.moveFrom, matchState.moveTo, () => {
                    // Only the active player sends completeMove
                    if (matchState.isMyTurn) {
                        playCard({ action: 'completeMove' });
                    }
                });
            }
        }
        
        // === HANDLE EVENTS ===
        if (matchState.currentEvent) {
            const eventKey = `${matchState.currentTurn}-${matchState.currentEvent.title}-${Date.now()}`;
            if (lastEventKeyRef.current !== eventKey) {
                lastEventKeyRef.current = eventKey;
                setCurrentEvent(matchState.currentEvent);
                setShowEventModal(true);
                
                // For spectator (not their turn), auto-dismiss after delay
                if (!matchState.isMyTurn) {
                    setTimeout(() => setShowEventModal(false), 2500);
                }
            }
        }
        
        // === HANDLE DICE DISPLAY ===
        if (matchState.lastDice && matchState.lastDice[0] > 0) {
            setDiceValues(matchState.lastDice);
        }
        
        // === VICTORY ===
        if (matchState.status === 'complete') {
            engine.spawnFireworks();
        }
    }, [matchState, activeMatch, playCard]);

    // === ACTIONS (only for active player) ===
    const handleRoll = useCallback(() => {
        if (!matchState?.isMyTurn || !matchState?.canRoll || isRolling) return;
        
        setIsRolling(true);
        setShowDice(true);
        
        // Dice animation
        let count = 0;
        const interval = setInterval(() => {
            setDiceValues([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
            count++;
            if (count >= 12) {
                clearInterval(interval);
                playCard({ action: 'roll' });
                setTimeout(() => {
                    setIsRolling(false);
                    setShowDice(false);
                }, 1800);
            }
        }, 70);
    }, [matchState?.isMyTurn, matchState?.canRoll, isRolling, playCard]);

    const handleBuy = useCallback(() => {
        if (!matchState?.isMyTurn || !matchState?.canBuy) return;
        playCard({ action: 'buy' });
        engineRef.current?.highlightBuilding(matchState.myPosition, activeMatch?.yourRole === 'player1' ? 0 : 1);
    }, [matchState, activeMatch, playCard]);

    const handleEndTurn = useCallback(() => {
        if (!matchState?.isMyTurn || !matchState?.canEndTurn) return;
        setShowEventModal(false);
        playCard({ action: 'endTurn' });
    }, [matchState?.isMyTurn, matchState?.canEndTurn, playCard]);

    const handleForfeit = () => {
        if (confirm('Forfeit? You will lose the wager.')) forfeitMatch();
    };

    const handleDismissEvent = () => {
        // Only active player can dismiss by clicking
        if (matchState?.isMyTurn) {
            setShowEventModal(false);
        }
    };

    // === RENDER ===
    if (!activeMatch || !matchState) return null;

    const isPlayer1 = activeMatch.yourRole === 'player1';
    const isMyTurn = matchState.isMyTurn;
    const myPlayer = isPlayer1 ? activeMatch.player1 : activeMatch.player2;
    const opponent = isPlayer1 ? activeMatch.player2 : activeMatch.player1;
    const currentTurnName = matchState.currentTurn === 'player1' 
        ? activeMatch.player1.name : activeMatch.player2.name;
    const isComplete = matchState.status === 'complete';
    const didWin = (matchState.winner === 'player1' && isPlayer1) || (matchState.winner === 'player2' && !isPlayer1);
    const totalPot = activeMatch.wagerAmount * 2;
    
    // Token wager info from match result OR active match
    const matchResult = activeMatch.matchResult;
    const tokenSettlement = matchResult?.tokenSettlement;
    const wagerToken = matchResult?.wagerToken || activeMatch?.wagerToken;
    const tokenWon = didWin && wagerToken ? (tokenSettlement?.amount || wagerToken.tokenAmount * 2) : 0;
    const tokenLost = !didWin && wagerToken ? wagerToken.tokenAmount : 0;
    const solscanLink = tokenSettlement?.txSignature ? getSolscanLink(tokenSettlement.txSignature) : null;

    return (
        <div className="fixed inset-0 z-40 select-none bg-black">
            {/* 3D Canvas */}
            <div ref={containerRef} className="absolute inset-0" />
            
            {/* === TURN INDICATOR === */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                <div 
                    className={`px-6 py-3 rounded-full flex items-center gap-3 backdrop-blur-md border-2 transition-all duration-500 ${
                        isMyTurn 
                            ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' 
                            : 'border-gray-500 shadow-lg'
                    }`}
                    style={{ background: 'rgba(0,0,0,0.8)' }}
                >
                    <div className={`w-3 h-3 rounded-full ${isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="text-white font-bold text-sm sm:text-base">
                        {isMyTurn ? '🎮 YOUR TURN' : `👀 ${currentTurnName}'s turn`}
                    </span>
                    <span className={`text-xs font-mono ${matchState.turnTimeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>
                        {matchState.turnTimeRemaining}s
                    </span>
                </div>
            </div>

            {/* === PLAYER PANELS === */}
            {/* Player 1 (Cyan) - Always on left */}
            <div 
                className={`absolute top-20 left-2 sm:left-4 w-44 sm:w-52 p-3 rounded-xl backdrop-blur-md transition-all duration-300 ${
                    matchState.currentTurn === 'player1' ? 'ring-2 ring-cyan-400 shadow-lg shadow-cyan-400/20' : 'opacity-70'
                }`}
                style={{ background: 'rgba(0,0,0,0.85)', borderLeft: '4px solid #00bcd4' }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-xs">P1</div>
                    <div>
                        <div className="text-cyan-400 font-bold text-xs truncate max-w-[100px]">
                            {activeMatch.player1.name}
                        </div>
                        {isPlayer1 && <div className="text-[10px] text-cyan-400/60">(YOU)</div>}
                    </div>
                </div>
                <div className="text-green-400 text-xl font-bold mb-1">
                    ${isPlayer1 ? matchState.myMoney : matchState.opponentMoney}
                </div>
                <div className="flex flex-wrap gap-1">
                    {(isPlayer1 ? matchState.myProperties : matchState.opponentProperties).slice(0, 10).map(idx => (
                        <div 
                            key={idx}
                            className="w-3 h-4 rounded-sm"
                            style={{ backgroundColor: '#' + GROUPS[SPACES[idx].group].toString(16).padStart(6, '0') }}
                            title={SPACES[idx].name}
                        />
                    ))}
                </div>
            </div>

            {/* Player 2 (Pink) - Always on right */}
            <div 
                className={`absolute top-20 right-2 sm:right-4 w-44 sm:w-52 p-3 rounded-xl backdrop-blur-md text-right transition-all duration-300 ${
                    matchState.currentTurn === 'player2' ? 'ring-2 ring-pink-400 shadow-lg shadow-pink-400/20' : 'opacity-70'
                }`}
                style={{ background: 'rgba(0,0,0,0.85)', borderRight: '4px solid #e91e63' }}
            >
                <div className="flex items-center gap-2 mb-2 justify-end">
                    <div>
                        <div className="text-pink-400 font-bold text-xs truncate max-w-[100px]">
                            {activeMatch.player2.name}
                        </div>
                        {!isPlayer1 && <div className="text-[10px] text-pink-400/60">(YOU)</div>}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white font-bold text-xs">P2</div>
                </div>
                <div className="text-green-400 text-xl font-bold mb-1">
                    ${isPlayer1 ? matchState.opponentMoney : matchState.myMoney}
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                    {(isPlayer1 ? matchState.opponentProperties : matchState.myProperties).slice(0, 10).map(idx => (
                        <div 
                            key={idx}
                            className="w-3 h-4 rounded-sm"
                            style={{ backgroundColor: '#' + GROUPS[SPACES[idx].group].toString(16).padStart(6, '0') }}
                            title={SPACES[idx].name}
                        />
                    ))}
                </div>
            </div>

            {/* === DICE DISPLAY (centered, only during roll) === */}
            {showDice && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4 pointer-events-none">
                    <div className="flex gap-4">
                        {[diceValues[0], diceValues[1]].map((val, i) => (
                            <div 
                                key={i}
                                className={`w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl flex items-center justify-center text-3xl sm:text-4xl font-black text-gray-800 shadow-2xl border-4 border-gray-200 ${isRolling ? 'animate-bounce' : ''}`}
                            >
                                {val}
                            </div>
                        ))}
                    </div>
                    <div className="bg-black/80 px-6 py-2 rounded-full border-2 border-yellow-500">
                        <span className="text-white font-bold text-lg">= {diceValues[0] + diceValues[1]}</span>
                    </div>
                </div>
            )}

            {/* === EVENT MODAL === */}
            {/* Active player sees interactive modal, spectator sees info-only that auto-dismisses */}
            {showEventModal && currentEvent && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-72 sm:w-80">
                    <div 
                        className="p-6 rounded-2xl text-center backdrop-blur-lg border-2 border-yellow-500/50 animate-in zoom-in-95 duration-200"
                        style={{ background: 'rgba(20,20,30,0.95)', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }}
                    >
                        <h2 className="text-yellow-400 text-xl sm:text-2xl font-black mb-2 uppercase tracking-wide">
                            {currentEvent.title}
                        </h2>
                        <p className="text-gray-300 text-sm sm:text-base mb-4">
                            {currentEvent.description}
                        </p>
                        
                        {/* Only show button for active player */}
                        {isMyTurn ? (
                            <button 
                                onClick={handleDismissEvent}
                                className="w-full py-2.5 rounded-lg font-bold text-white transition-all hover:scale-105 active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #00bcd4, #2196f3)' }}
                            >
                                OK
                            </button>
                        ) : (
                            <div className="text-gray-500 text-xs">Waiting for {currentTurnName}...</div>
                        )}
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

            {/* === ACTION BAR (only interactive for active player) === */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 sm:gap-4">
                <button
                    onClick={handleRoll}
                    disabled={!isMyTurn || !matchState.canRoll || isRolling || !connected}
                    className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all ${
                        isMyTurn && matchState.canRoll && !isRolling && connected
                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg hover:scale-105 active:scale-95'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    🎲 ROLL
                </button>
                
                <button
                    onClick={handleBuy}
                    disabled={!isMyTurn || !matchState.canBuy}
                    className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all ${
                        isMyTurn && matchState.canBuy
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:scale-105 active:scale-95'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    🏠 BUY {matchState.buyPrice ? `$${matchState.buyPrice}` : ''}
                </button>
                
                <button
                    onClick={handleEndTurn}
                    disabled={!isMyTurn || !matchState.canEndTurn}
                    className={`px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all ${
                        isMyTurn && matchState.canEndTurn
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:scale-105 active:scale-95'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    ⏭ END
                </button>
            </div>

            {/* === POT & FORFEIT === */}
            <div className="absolute bottom-4 left-2 sm:left-4 z-10 flex flex-col gap-2">
                <div className="bg-black/70 px-3 py-1.5 rounded-lg">
                    <span className="text-yellow-400 font-bold text-xs sm:text-sm">💰 {totalPot}</span>
                </div>
                <button 
                    onClick={handleForfeit}
                    className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                    Forfeit
                </button>
            </div>

            {/* === CAMERA CONTROLS === */}
            <div className="absolute bottom-4 right-2 sm:right-4 z-10 flex flex-col gap-2">
                <button 
                    onClick={() => engineRef.current?.focusOverview()}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm border border-white/20"
                >
                    🌍 Full Board
                </button>
                <button 
                    onClick={() => {
                        const currentIdx = matchState.currentTurn === 'player1' ? 0 : 1;
                        engineRef.current?.focusOnPlayer(currentIdx);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur-sm border border-white/20"
                >
                    👤 Focus Player
                </button>
            </div>

            {/* === GAME OVER === */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-500">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-center max-w-sm border border-white/10 shadow-2xl">
                        <div className="text-6xl mb-4">{didWin ? '🏆' : '💸'}</div>
                        <h2 className="text-3xl font-black text-white mb-2">
                            {didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-gray-400 mb-4">
                            {didWin ? `${opponent.name} went bankrupt!` : 'You went bankrupt...'}
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
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* === CHAT === */}
            {isMobile ? (
                <>
                    {/* Mobile: Toggle button */}
                    {!showMobileChat && (
                        <button
                            onClick={() => setShowMobileChat(true)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-black/80 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-white/20"
                        >
                            💬
                        </button>
                    )}
                    {/* Mobile: Chat overlay */}
                    <ChatLog 
                        isMobile={true}
                        isOpen={showMobileChat}
                        onClose={() => setShowMobileChat(false)}
                        onNewMessage={handleChatMessage}
                    />
                </>
            ) : (
                /* Desktop: Middle-left positioning */
                <ChatLog minigameMode={true} onNewMessage={handleChatMessage} />
            )}
        </div>
    );
};

export default P2PMonopoly;
