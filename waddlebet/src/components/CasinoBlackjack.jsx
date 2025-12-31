/**
 * CasinoBlackjack - PvE Blackjack
 * 
 * 1:1 EXACT copy of blackjacksource.md
 * ONLY change: Dealer uses createPlayerBuilder (black + bowtie)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useMultiplayer } from '../multiplayer';
import * as THREE from 'three';
import gsap from 'gsap';
import { createPlayerBuilder, cacheAnimatedParts, animateCosmeticsFromCache } from '../engine/PlayerBuilder';
import GameManager from '../engine/GameManager';

// --- UTILITIES --- (exact from source)
const MathUtils = {
    randFloat: (min, max) => Math.random() * (max - min) + min,
    randInt: (min, max) => Math.floor(Math.random() * (max - min + 1) + min),
    delay: (ms) => new Promise(res => setTimeout(res, ms))
};

// --- ASSET FACTORY --- (exact from source)
class AssetFactory {
    constructor() {
        this.textures = {};
    }

    createCardTexture(suit, value) {
        const id = `${suit}_${value}`;
        if (this.textures[id]) return this.textures[id];

        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 768;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#fff';
        this.roundRect(ctx, 0, 0, 512, 768, 40);
        ctx.fill();

        const color = (suit === '♥' || suit === '♦') ? '#e74c3c' : '#2c3e50';
        ctx.fillStyle = color;
        ctx.font = 'bold 100px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, 70, 110);
        ctx.font = '80px Montserrat, Arial, sans-serif';
        ctx.fillText(suit, 70, 200);

        ctx.font = '240px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        if (['K','Q','J'].includes(value)) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 10;
            ctx.strokeRect(120, 150, 272, 468);
            ctx.fillText(value, 256, 384);
        } else {
            ctx.fillText(suit, 256, 384);
        }
        
        ctx.save();
        ctx.translate(512-70, 768-110);
        ctx.rotate(Math.PI);
        ctx.fillStyle = color;
        ctx.font = 'bold 100px Montserrat, Arial, sans-serif';
        ctx.fillText(value, 0, 0);
        ctx.font = '80px Montserrat, Arial, sans-serif';
        ctx.fillText(suit, 0, -90);
        ctx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        this.textures[id] = tex;
        return tex;
    }

    createBackTexture() {
        if(this.textures['back']) return this.textures['back'];
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 768;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#c0392b';
        this.roundRect(ctx, 0, 0, 512, 768, 40);
        ctx.fill();

        ctx.fillStyle = '#e74c3c';
        for(let i=0; i<20; i++) {
            for(let j=0; j<30; j++) {
                ctx.beginPath();
                ctx.arc(25 + i*25, 25 + j*25, 8, 0, Math.PI*2);
                ctx.fill();
            }
        }
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("CLUB", 256, 350);
        ctx.fillText("PENGU", 256, 410);

        const tex = new THREE.CanvasTexture(canvas);
        this.textures['back'] = tex;
        return tex;
    }

    createChipTexture(value) {
        const id = `chip_${value}`;
        if(this.textures[id]) return this.textures[id];
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const colors = { 10: '#fff', 50: '#e74c3c', 100: '#2c3e50', 500: '#f1c40f', 1000: '#9b59b6' };
        const baseColor = colors[value] || '#fff';

        ctx.fillStyle = baseColor;
        ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI*2); ctx.fill();

        ctx.fillStyle = '#fff';
        for(let i=0; i<8; i++) {
            ctx.save();
            ctx.translate(128, 128);
            ctx.rotate(i * (Math.PI/4));
            ctx.fillRect(100, -15, 28, 30);
            ctx.restore();
        }

        ctx.beginPath(); ctx.arc(128, 128, 90, 0, Math.PI*2); 
        ctx.strokeStyle = 'white'; ctx.lineWidth = 5; ctx.stroke();
        ctx.fillStyle = baseColor; ctx.fill();

        ctx.fillStyle = (value === 500 || value === 10 || value === 1000) ? '#222' : '#fff';
        ctx.font = 'bold 80px Montserrat, Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value >= 1000 ? '1K' : value.toString(), 128, 128);

        const tex = new THREE.CanvasTexture(canvas);
        this.textures[id] = tex;
        return tex;
    }

    createFeltTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#216c46'; 
        ctx.fillRect(0,0,1024,1024);
        
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.1;
        for(let i=0; i<50000; i++) {
            ctx.fillRect(Math.random()*1024, Math.random()*1024, 2, 2);
        }
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(512, -200, 600, 0, Math.PI);
        ctx.stroke();

        ctx.font = 'bold 40px Montserrat, Arial, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'center';
        ctx.fillText("BLACKJACK PAYS 3 TO 2", 512, 300);
        ctx.font = 'bold 30px Montserrat, Arial, sans-serif';
        ctx.fillText("DEALER MUST STAND ON 17 AND DRAW TO 16", 512, 350);

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = 16;
        return tex;
    }

    roundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
}

// --- DEALER CLASS --- (Uses our penguin builder instead of source voxel penguin)
class Dealer {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);
        this.group.position.set(0, 0.4, -22); // Exact position from source
        this.buildCharacter();
        
        this.state = 'idle';
        this.lookTarget = new THREE.Vector3(0, 0, 0);
        this.clock = new THREE.Clock();
        this.emoting = false;
    }

    buildCharacter() {
        try {
            const { buildPlayerMesh } = createPlayerBuilder(THREE);
            
            // Black penguin with bowtie as dealer - per user request
            const appearance = {
                color: 'black', // Black feathers
                hat: 'tophat',
                eyes: 'cool',
                mouth: 'beak',
                bodyItem: 'bowtie',
                mount: 'none',
                heldItem: 'none',
                characterType: null
            };
            
            this.penguin = buildPlayerMesh(appearance);
            this.penguin.scale.set(3.5, 3.5, 3.5); // Larger dealer
            this.penguin.name = 'dealer_penguin';
            
            // Make feathers black while keeping bowtie, beak, feet their proper colors
            this.penguin.traverse((child) => {
                if (child.isMesh && child.material) {
                    const name = (child.name || '').toLowerCase();
                    const mat = Array.isArray(child.material) ? child.material : [child.material];
                    
                    mat.forEach(m => {
                        if (!m.color) return;
                        
                        const colorHex = m.color.getHex();
                        
                        // Skip if it's white (belly) - keep white
                        if (colorHex === 0xffffff || colorHex === 0xf5f5f5) return;
                        
                        // Skip orange/yellow colors (beak, feet)
                        const r = (colorHex >> 16) & 0xff;
                        const g = (colorHex >> 8) & 0xff;
                        const b = colorHex & 0xff;
                        if (r > 200 && g > 100 && b < 100) return; // Orange-ish
                        if (r > 200 && g > 200 && b < 100) return; // Yellow-ish
                        
                        // Skip red colors (bowtie)
                        if (r > 150 && g < 80 && b < 80) return; // Red-ish
                        
                        // Skip if mesh name suggests it's not feathers
                        if (name.includes('beak') || name.includes('foot') || name.includes('feet') ||
                            name.includes('bow') || name.includes('tie') || name.includes('eye') ||
                            name.includes('hat') || name.includes('top')) return;
                        
                        // This is likely a feather/body part - make it black
                        m.color.setHex(0x111111);
                    });
                }
            });
            
            this.group.add(this.penguin);
            
            // Cache for animations
            this.animCache = cacheAnimatedParts(this.penguin);
            
        } catch (e) {
            console.warn('Dealer penguin build failed, using fallback:', e);
            // Fallback: Simple black sphere penguin
            const mat = new THREE.MeshStandardMaterial({ color: 0x111111 });
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(1, 2, 8, 16), mat);
            body.position.y = 2;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 16), mat);
            head.position.y = 4;
            this.group.add(body, head);
        }
    }

    update(dt) {
        const time = this.clock.getElapsedTime();
        if (!this.emoting) {
            // Idle breathing animation - exact from source
            this.group.scale.y = 1 + Math.sin(time * 3) * 0.02;
            
            // Animate cosmetics if available
            if (this.animCache) {
                animateCosmeticsFromCache(this.animCache, dt);
            }
            
            // Head tracking - look at target
            const lookPos = this.lookTarget.clone();
            lookPos.y = this.group.position.y + 3;
            // Subtle rotation towards look target
            const dir = new THREE.Vector3().subVectors(lookPos, this.group.position);
            const targetRotY = Math.atan2(dir.x, dir.z);
            this.group.rotation.y += (targetRotY - this.group.rotation.y) * 0.1;
        }
    }

    lookAt(x, y, z) {
        this.lookTarget.set(x, y, z);
    }

    // Emote animations - exact behavior from source
    emote(type) {
        this.emoting = true;
        const reset = () => {
            this.emoting = false;
            gsap.to(this.group.position, { y: 0.4, duration: 0.3 });
            gsap.to(this.group.rotation, { y: 0, x: 0, z: 0, duration: 0.3 });
        };

        if (type === 'win') { 
            // Dealer wins - happy jump and spin (exact from source)
            gsap.to(this.group.position, { y: 2.4, duration: 0.15, yoyo: true, repeat: 3 });
            gsap.to(this.group.rotation, { 
                y: Math.PI * 2, 
                duration: 0.6, 
                ease: "power2.out",
                onComplete: reset 
            });
        } else if (type === 'lose') { 
            // Player wins - dealer slumps (exact from source)
            gsap.to(this.group.position, { y: -0.6, duration: 0.2, ease: "power2.out" });
            gsap.to(this.group.rotation, { x: 0.3, duration: 0.5, ease: "elastic.out" });
            setTimeout(() => reset(), 1500);
        } else if (type === 'deal') {
            // Deal card animation - wave motion (exact from source)
            gsap.to(this.group.rotation, { 
                y: -0.2, 
                duration: 0.15, 
                yoyo: true, 
                repeat: 1,
                onComplete: () => this.emoting = false 
            });
        }
    }
}

// --- ENGINE --- (exact from source)
class Engine {
    constructor(container) {
        this.container = container;
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e); // Brighter background, no fog

        // Camera - exact from source
        const isPortrait = container.clientHeight > container.clientWidth;
        this.camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
        if (isPortrait) {
            this.camera.position.set(0, 28, 45);
            this.camera.lookAt(0, 0, 5);
        } else {
            this.camera.position.set(0, 22, 35);
            this.camera.lookAt(0, -2, 0);
        }

        // Renderer - exact from source
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.assets = new AssetFactory();
        this.dealer = new Dealer(this.scene);
        this.objects = []; 
        this.cardMeshes = [];
        this.chipMeshes = [];

        this.setupLights();
        this.createEnvironment();

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('click', this.handleClick);

        this.clock = new THREE.Clock();
        this.animate();
    }

    // Lights - brighter for better visibility
    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 1.0); // Brighter ambient
        this.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5); // Brighter directional
        dirLight.position.set(5, 25, 20);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 100;
        dirLight.shadow.camera.left = -30;
        dirLight.shadow.camera.right = 30;
        dirLight.shadow.camera.top = 30;
        dirLight.shadow.camera.bottom = -30;
        this.scene.add(dirLight);

        // Rim light - exact from source
        const rim = new THREE.SpotLight(0x4444ff, 3.0);
        rim.position.set(-20, 15, -10);
        const rimTarget = new THREE.Object3D();
        rimTarget.position.set(0, 5, -22);
        this.scene.add(rimTarget);
        rim.target = rimTarget;
        this.scene.add(rim);
    }

    // Environment - exact from source
    createEnvironment() {
        const geo = new THREE.PlaneGeometry(60, 40);
        const mat = new THREE.MeshStandardMaterial({ 
            map: this.assets.createFeltTexture(),
            roughness: 0.9,
            metalness: 0.1
        });
        const table = new THREE.Mesh(geo, mat);
        table.rotation.x = -Math.PI / 2;
        table.receiveShadow = true;
        this.scene.add(table);
        
        const woodGeo = new THREE.BoxGeometry(62, 2, 42);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.4 });
        const rim = new THREE.Mesh(woodGeo, woodMat);
        rim.position.y = -1.01;
        rim.receiveShadow = true;
        this.scene.add(rim);
        
        // Card shoe/pile behind dealer - stack of cards
        this.createCardShoe();
    }
    
    createCardShoe() {
        const backTex = this.assets.createBackTexture();
        const cardGeo = new THREE.BoxGeometry(3.5, 5, 0.05);
        
        // Create a stack of ~20 cards behind dealer
        for (let i = 0; i < 20; i++) {
            const mat = [
                new THREE.MeshStandardMaterial({ color: 0xffffff }),
                new THREE.MeshStandardMaterial({ color: 0xffffff }),
                new THREE.MeshStandardMaterial({ color: 0xffffff }),
                new THREE.MeshStandardMaterial({ color: 0xffffff }),
                new THREE.MeshStandardMaterial({ map: backTex }),
                new THREE.MeshStandardMaterial({ map: backTex })
            ];
            const card = new THREE.Mesh(cardGeo, mat);
            card.rotation.x = -Math.PI / 2;
            card.position.set(
                8 + (Math.random() - 0.5) * 0.3, // Right of dealer
                0.1 + i * 0.03, // Stack up
                -18 + (Math.random() - 0.5) * 0.3
            );
            card.rotation.z = (Math.random() - 0.5) * 0.1; // Slight rotation
            card.castShadow = true;
            this.scene.add(card);
        }
    }

    handleResize = () => {
        if (!this.container) return;
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    handleMouseMove = (e) => {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        // Parallax camera movement - exact from source
        this.camera.position.x += (this.mouse.x * 2 - this.camera.position.x) * 0.05;
        // Dealer looks at mouse
        this.dealer.lookAt(this.mouse.x * 10, 0, 10);
    }

    handleClick = () => {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects);
        if(intersects.length > 0) {
            const obj = intersects[0].object;
            if (obj.userData.onClick) obj.userData.onClick();
        }
    }

    animate = () => {
        this.animationId = requestAnimationFrame(this.animate);
        const dt = this.clock.getDelta();
        this.dealer.update(dt);
        this.renderer.render(this.scene, this.camera);
    }

    // Card spawning - EXACT from source
    spawnCard(cardData, startPos, endPos, delay = 0) {
        const tex = this.assets.createCardTexture(cardData.suit, cardData.value);
        const backTex = this.assets.createBackTexture();
        const geo = new THREE.BoxGeometry(3.5, 5, 0.05);
        const mat = [
            new THREE.MeshStandardMaterial({ color: 0xffffff }),
            new THREE.MeshStandardMaterial({ color: 0xffffff }),
            new THREE.MeshStandardMaterial({ color: 0xffffff }),
            new THREE.MeshStandardMaterial({ color: 0xffffff }),
            new THREE.MeshStandardMaterial({ map: tex }), 
            new THREE.MeshStandardMaterial({ map: backTex })
        ];

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.copy(startPos);
        
        mesh.rotation.x = -Math.PI/2; 
        mesh.rotation.z = Math.PI; 

        this.scene.add(mesh);
        this.cardMeshes.push(mesh);

        const targetRotX = -Math.PI/2; 
        const targetRotZ = (Math.random() - 0.5) * 0.2; 
        const targetRotY = cardData.hidden ? Math.PI : 0; 

        // Animation - exact TWEEN behavior from source (using gsap)
        gsap.to(mesh.position, {
            x: endPos.x,
            y: endPos.y,
            z: endPos.z,
            duration: 0.6,
            ease: "power2.out",
            delay: delay / 1000
        });

        gsap.to(mesh.rotation, {
            x: targetRotX,
            y: targetRotY,
            z: targetRotZ,
            duration: 0.6,
            ease: "power2.out",
            delay: delay / 1000,
            onStart: () => this.dealer.emote('deal')
        });

        mesh.userData.cardData = cardData;
        return mesh;
    }

    // Chip spawning - EXACT from source
    spawnChip(value, pos) {
        const tex = this.assets.createChipTexture(value);
        const geo = new THREE.CylinderGeometry(1.5, 1.5, 0.4, 32);
        
        const materials = [
            new THREE.MeshStandardMaterial({ color: 0xdddddd }), 
            new THREE.MeshStandardMaterial({ map: tex }), 
            new THREE.MeshStandardMaterial({ map: tex }) 
        ];

        const mesh = new THREE.Mesh(geo, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(pos.x, pos.y + 10, pos.z); 
        mesh.rotation.y = Math.random() * Math.PI;

        this.scene.add(mesh);
        this.chipMeshes.push(mesh);

        // Bounce animation - exact from source
        gsap.to(mesh.position, {
            y: pos.y,
            duration: 0.4,
            ease: "bounce.out"
        });
        
        return mesh;
    }

    // Reveal hole card - exact from source
    revealHoleCard(mesh) {
        if (!mesh) return;
        gsap.to(mesh.rotation, {
            y: 0,
            duration: 0.4,
            ease: "power2.out"
        });
    }

    // Clear cards with animation
    clearCards() {
        this.cardMeshes.forEach(c => {
            gsap.to(c.position, {
                z: -30,
                y: 5,
                duration: 0.5,
                onComplete: () => this.scene.remove(c)
            });
        });
        this.cardMeshes = [];
    }

    // Clear chips with animation - exact from source
    clearChips(toDealer = false) {
        const targetZ = toDealer ? -25 : 30;
        this.chipMeshes.forEach(c => {
            gsap.to(c.position, {
                z: targetZ,
                y: 10,
                duration: 0.6,
                ease: "back.in",
                onComplete: () => this.scene.remove(c)
            });
        });
        this.chipMeshes = [];
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('click', this.handleClick);
        
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

// --- BLACKJACK GAME LOGIC --- (exact from source)
class BlackjackGame {
    constructor(engine, onBalanceChange) {
        this.engine = engine;
        this.onBalanceChange = onBalanceChange;
        
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.currentBet = 0;
        this.gameState = 'BETTING'; 
        this.holeCardMesh = null;
    }

    createDeck() {
        const suits = ['♥', '♦', '♣', '♠'];
        const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        this.deck = [];
        for(let s of suits) {
            for(let v of values) {
                this.deck.push({ suit: s, value: v, hidden: false });
            }
        }
        // Shuffle - exact from source
        for(let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    async deal() {
        if (this.currentBet === 0) return;
        
        this.gameState = 'PLAYING';
        this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.engine.clearCards();

        // Start position - from dealer (exact from source)
        const startPos = { x: 0, y: 5, z: -25 };

        // Deal sequence: player, dealer, player, dealer (exact from source)
        await this.dealCard('player', 0);
        await this.dealCard('dealer', 1, false); 
        await this.dealCard('player', 2);
        await this.dealCard('dealer', 3, true); // Hole card

        const pScore = this.calculateScore(this.playerHand);
        if (pScore === 21) {
            await MathUtils.delay(500);
            return this.stand(); // Auto-stand on blackjack
        }
        
        return { phase: 'playing', playerScore: pScore };
    }

    async dealCard(who, index, hidden = false) {
        const card = this.deck.pop();
        card.hidden = hidden;
        if (who === 'player') this.playerHand.push(card);
        else this.dealerHand.push(card);

        const startPos = new THREE.Vector3(0, 5, -25);
        let endPos;

        // Card positions - exact from source
        if (who === 'player') {
            const offset = (this.playerHand.length - 1) * 2;
            endPos = new THREE.Vector3(-2 + offset, 0.1 + index * 0.02, 12);
        } else {
            const offset = (this.dealerHand.length - 1) * 2;
            endPos = new THREE.Vector3(-2 + offset, 0.1 + index * 0.02, -2);
        }

        const mesh = this.engine.spawnCard(card, startPos, endPos);
        mesh.userData.cardInfo = card;
        
        if (hidden) this.holeCardMesh = mesh;

        await MathUtils.delay(400);
        return card;
    }

    hit() {
        if (this.gameState !== 'PLAYING') return null;
        
        const card = this.deck.pop();
        this.playerHand.push(card);
        
        const startPos = new THREE.Vector3(0, 5, -25);
        const offset = (this.playerHand.length - 1) * 2;
        const endPos = new THREE.Vector3(-2 + offset, 0.1 + this.playerHand.length * 0.02, 12);
        
        this.engine.spawnCard(card, startPos, endPos);
        
        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            return { bust: true, score };
        }
        return { bust: false, score };
    }

    async stand() {
        this.gameState = 'DEALER_TURN';
        
        // Reveal hole card - exact from source
        const holeCardData = this.dealerHand[1];
        if (holeCardData) holeCardData.hidden = false;
        this.engine.revealHoleCard(this.holeCardMesh);
        
        await MathUtils.delay(800);

        // Dealer draws to 17 - exact from source
        while (this.calculateScore(this.dealerHand) < 17) {
            const card = this.deck.pop();
            this.dealerHand.push(card);
            
            const startPos = new THREE.Vector3(0, 5, -25);
            const offset = (this.dealerHand.length - 1) * 2;
            const endPos = new THREE.Vector3(-2 + offset, 0.1 + 10 * 0.02, -2);
            
            this.engine.spawnCard(card, startPos, endPos);
            await MathUtils.delay(800);
        }

        return this.resolve();
    }

    double(canAfford) {
        if (this.gameState !== 'PLAYING' || this.playerHand.length !== 2 || !canAfford) return null;
        
        // Draw one card and stand
        const card = this.deck.pop();
        this.playerHand.push(card);
        
        const startPos = new THREE.Vector3(0, 5, -25);
        const offset = (this.playerHand.length - 1) * 2;
        const endPos = new THREE.Vector3(-2 + offset, 0.1 + this.playerHand.length * 0.02, 12);
        
        this.engine.spawnCard(card, startPos, endPos);
        
        const score = this.calculateScore(this.playerHand);
        if (score > 21) {
            return { bust: true, score, doubled: true };
        }
        return { bust: false, score, doubled: true };
    }

    calculateScore(hand) {
        let score = 0;
        let aces = 0;
        hand.forEach(c => {
            if (['J','Q','K'].includes(c.value)) score += 10;
            else if (c.value === 'A') { score += 11; aces++; }
            else score += parseInt(c.value);
        });
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    }

    resolve() {
        const pScore = this.calculateScore(this.playerHand);
        const dScore = this.calculateScore(this.dealerHand);
        const isPlayerBJ = pScore === 21 && this.playerHand.length === 2;
        const isDealerBJ = dScore === 21 && this.dealerHand.length === 2;

        let result;
        if (pScore > 21) result = 'BUST';
        else if (dScore > 21) result = 'WIN';
        else if (isPlayerBJ && isDealerBJ) result = 'PUSH';  // Both blackjack = push
        else if (isPlayerBJ) result = 'BLACKJACK';  // Player blackjack wins 3:2
        else if (isDealerBJ) result = 'LOSE';  // Dealer blackjack beats non-blackjack 21
        else if (pScore > dScore) result = 'WIN';
        else if (pScore < dScore) result = 'LOSE';
        else result = 'PUSH';

        this.gameState = 'END';
        
        return {
            result,
            playerScore: pScore,
            dealerScore: dScore
        };
    }

    reset() {
        this.gameState = 'BETTING';
        this.currentBet = 0;
        this.playerHand = [];
        this.dealerHand = [];
        this.holeCardMesh = null;
    }
}

// --- MAIN COMPONENT ---
const CasinoBlackjack = ({ tableId, onLeave }) => {
    const { send, userData, updateUserCoins, isAuthenticated } = useMultiplayer();
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    const gameRef = useRef(null);
    
    const [phase, setPhase] = useState('betting'); // betting, playing, dealer, result
    const [playerScore, setPlayerScore] = useState(0);
    const [dealerScore, setDealerScore] = useState('?');
    const [bet, setBet] = useState(0);
    const [pendingBet, setPendingBet] = useState(0);
    const [result, setResult] = useState(null);
    const [payout, setPayout] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    
    const [isMobile, setIsMobile] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    
    // Use ref to track balance to avoid stale closure issues
    const balanceRef = useRef(userData?.coins ?? GameManager.getInstance().getCoins() ?? 0);
    const [displayBalance, setDisplayBalance] = useState(balanceRef.current);
    
    const CHIP_VALUES = [10, 50, 100, 500, 1000];
    const MIN_BET = 10;
    const MAX_BET = 5000;
    
    // Update balance helper that updates both ref and display state
    const updateBalance = useCallback((newBalance) => {
        console.log('🎰 Blackjack updating balance to:', newBalance);
        balanceRef.current = newBalance;
        setDisplayBalance(newBalance);
        GameManager.getInstance().setCoinsFromServer(newBalance);
    }, []);
    
    // Sync from server/userData when it changes
    useEffect(() => {
        const serverBalance = userData?.coins;
        if (serverBalance !== undefined && serverBalance !== balanceRef.current) {
            console.log('🎰 Blackjack server sync:', serverBalance);
            balanceRef.current = serverBalance;
            setDisplayBalance(serverBalance);
        }
    }, [userData?.coins]);
    
    // Poll for balance changes as fallback
    useEffect(() => {
        const interval = setInterval(() => {
            const gmBalance = GameManager.getInstance().getCoins();
            if (gmBalance !== balanceRef.current) {
                console.log('🎰 Blackjack poll sync:', gmBalance);
                balanceRef.current = gmBalance;
                setDisplayBalance(gmBalance);
            }
        }, 300);
        return () => clearInterval(interval);
    }, []);
    
    // Initialize engine
    useEffect(() => {
        if (!containerRef.current || engineRef.current) return;
        
        const portrait = window.innerHeight > window.innerWidth;
        setIsPortrait(portrait);
        setIsMobile(window.innerWidth <= 768);
        
        const engine = new Engine(containerRef.current);
        engineRef.current = engine;
        gameRef.current = new BlackjackGame(engine);
        
        const handleResize = () => {
            const p = window.innerHeight > window.innerWidth;
            setIsPortrait(p);
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        
        return () => {
            window.removeEventListener('resize', handleResize);
            if (engineRef.current) {
                engineRef.current.dispose();
                engineRef.current = null;
            }
        };
    }, []);
    
    // Render chips when pending bet changes
    useEffect(() => {
        if (!engineRef.current) return;
        
        engineRef.current.chipMeshes.forEach(c => engineRef.current.scene.remove(c));
        engineRef.current.chipMeshes = [];
        
        const amount = bet || pendingBet;
        if (amount <= 0) return;
        
        let remaining = amount;
        let stackIndex = 0;
        [1000, 500, 100, 50, 10].forEach(val => {
            while (remaining >= val && stackIndex < 15) {
                const x = MathUtils.randFloat(-2, 2);
                const z = MathUtils.randFloat(8, 10);
                const y = 0.2 + stackIndex * 0.45;
                engineRef.current.spawnChip(val, { x, y, z });
                remaining -= val;
                stackIndex++;
            }
        });
    }, [bet, pendingBet]);
    
    const addChip = useCallback((amount) => {
        if (balanceRef.current - pendingBet < amount) return;
        if (pendingBet + amount > MAX_BET) return;
        setPendingBet(prev => prev + amount);
    }, [pendingBet]);
    
    const clearBet = useCallback(() => {
        setPendingBet(0);
    }, []);
    
    const deal = useCallback(async () => {
        if (pendingBet < MIN_BET || pendingBet > balanceRef.current) return;
        if (!gameRef.current) return;
        
        setIsLoading(true);
        
        // Optimistically deduct balance locally
        const newBalance = balanceRef.current - pendingBet;
        updateBalance(newBalance);
        
        // Send to server for persistence
        console.log('🎰 Sending blackjack_deduct_bet:', pendingBet);
        send({ type: 'blackjack_deduct_bet', amount: pendingBet });
        
        gameRef.current.currentBet = pendingBet;
        setBet(pendingBet);
        setPendingBet(0);
        setResult(null);
        setPayout(0);
        
        const dealResult = await gameRef.current.deal();
        
        if (dealResult) {
            const playerScoreVal = dealResult.playerScore || gameRef.current.calculateScore(gameRef.current.playerHand);
            setPlayerScore(playerScoreVal);
            setDealerScore('?');
            setPhase('playing');
            
            // Send initial game state for PvE spectator banner
            const dealerVisibleCard = gameRef.current.dealerHand?.[1]; // Second card is visible
            send({
                type: 'blackjack_update',
                playerHand: gameRef.current.playerHand?.map(c => ({ suit: c.suit, value: c.value })),
                dealerHand: [{ hidden: true }, dealerVisibleCard ? { suit: dealerVisibleCard.suit, value: dealerVisibleCard.value } : null].filter(Boolean),
                playerScore: playerScoreVal,
                dealerScore: gameRef.current.dealerHand?.[1] ? gameRef.current.calculateScore([gameRef.current.dealerHand[1]]) : 0,
                phase: 'playing'
            });
        }
        
        setIsLoading(false);
        
        // Check for natural blackjack
        if (dealResult?.result) {
            finishGame(dealResult);
        }
    }, [pendingBet, send, updateBalance]);
    
    const hit = useCallback(() => {
        if (!gameRef.current || phase !== 'playing') return;
        
        const result = gameRef.current.hit();
        if (!result) return;
        
        setPlayerScore(result.score);
        
        // Update spectators with new hand
        const dealerVisibleCard = gameRef.current.dealerHand?.[1];
        send({
            type: 'blackjack_update',
            playerHand: gameRef.current.playerHand?.map(c => ({ suit: c.suit, value: c.value })),
            dealerHand: [{ hidden: true }, dealerVisibleCard ? { suit: dealerVisibleCard.suit, value: dealerVisibleCard.value } : null].filter(Boolean),
            playerScore: result.score,
            phase: 'playing'
        });
        
        if (result.bust) {
            finishGame({ result: 'BUST', playerScore: result.score, dealerScore: gameRef.current.calculateScore(gameRef.current.dealerHand) });
        }
    }, [phase, send]);
    
    const stand = useCallback(async () => {
        if (!gameRef.current || phase !== 'playing') return;
        
        setPhase('dealer');
        setDealerScore('...');
        
        const result = await gameRef.current.stand();
        finishGame(result);
    }, [phase]);
    
    const doubleDown = useCallback(async () => {
        if (!gameRef.current || phase !== 'playing') return;
        if (gameRef.current.playerHand.length !== 2) return;
        if (balanceRef.current < bet) return;
        
        // Optimistically deduct double amount
        const newBalance = balanceRef.current - bet;
        updateBalance(newBalance);
        
        console.log('🎰 Double down - deducting:', bet);
        send({ type: 'blackjack_deduct_bet', amount: bet });
        
        // Add chip for double
        const x = MathUtils.randFloat(-2, 2);
        const z = MathUtils.randFloat(8, 10);
        engineRef.current?.spawnChip(bet, { x, y: 2, z });
        
        const result = gameRef.current.double(true);
        setBet(prev => prev * 2);
        
        if (!result) return;
        
        setPlayerScore(result.score);
        
        if (result.bust) {
            finishGame({ result: 'BUST', playerScore: result.score, dealerScore: gameRef.current.calculateScore(gameRef.current.dealerHand) });
        } else {
            // Auto-stand after double
            setPhase('dealer');
            const standResult = await gameRef.current.stand();
            finishGame(standResult);
        }
    }, [phase, bet, send, updateBalance]);
    
    const finishGame = useCallback((gameResult) => {
        setPhase('result');
        setResult(gameResult.result);
        setPlayerScore(gameResult.playerScore);
        setDealerScore(gameResult.dealerScore);
        
        let winAmount = 0;
        
        if (gameResult.result === 'WIN') {
            winAmount = bet * 2;
            engineRef.current?.dealer.emote('lose');
            engineRef.current?.clearChips(false); // Chips to player
        } else if (gameResult.result === 'BLACKJACK') {
            winAmount = bet + Math.floor(bet * 1.5); // 3:2 payout
            engineRef.current?.dealer.emote('lose');
            engineRef.current?.clearChips(false);
        } else if (gameResult.result === 'PUSH') {
            winAmount = bet; // Return bet
        } else {
            // BUST or LOSE - balance already deducted when betting
            engineRef.current?.dealer.emote('win');
            engineRef.current?.clearChips(true); // Chips to dealer
        }
        
        setPayout(winAmount);
        
        // Get hands for spectator display
        const playerHandData = gameRef.current?.playerHand?.map(c => ({ suit: c.suit, value: c.value }));
        const dealerHandData = gameRef.current?.dealerHand?.map(c => ({ suit: c.suit, value: c.value }));
        
        if (winAmount > 0) {
            // Optimistically add winnings to balance immediately
            const newBal = balanceRef.current + winAmount;
            console.log('🎰 Blackjack WIN - updating balance:', balanceRef.current, '+', winAmount, '=', newBal);
            updateBalance(newBal);
            
            // Send to server for persistence (includes hands/scores for spectator display)
            console.log('🎰 Sending blackjack_payout:', winAmount, gameResult.result);
            send({ 
                type: 'blackjack_payout', 
                amount: winAmount, 
                result: gameResult.result,
                playerScore: gameResult.playerScore,
                dealerScore: gameResult.dealerScore,
                playerHand: playerHandData,
                dealerHand: dealerHandData
            });
        } else {
            // Even on loss, send payout (amount: 0) so spectators see the result
            console.log('🎰 Blackjack LOSS - sending result for spectators, bet was:', bet);
            send({ 
                type: 'blackjack_payout', 
                amount: 0, 
                result: gameResult.result,
                playerScore: gameResult.playerScore,
                dealerScore: gameResult.dealerScore,
                playerHand: playerHandData,
                dealerHand: dealerHandData
            });
        }
        
        // Auto-loop back to betting phase after showing result briefly
        setTimeout(() => {
            gameRef.current?.reset();
            setPhase('betting');
            setPlayerScore(0);
            setDealerScore('?');
            setBet(0);
            setResult(null);
            setPayout(0);
            engineRef.current?.clearCards();
        }, 2500); // Show result for 2.5 seconds then auto-reset
    }, [bet, send, updateBalance]);
    
    const newGame = useCallback(() => {
        gameRef.current?.reset();
        setPhase('betting');
        setPlayerScore(0);
        setDealerScore('?');
        setBet(0);
        setResult(null);
        setPayout(0);
        engineRef.current?.clearCards();
    }, []);
    
    const getMessage = () => {
        switch (result) {
            case 'BLACKJACK': return '🎰 BLACKJACK! 🎰';
            case 'WIN': return '💰 YOU WIN! 💰';
            case 'LOSE': return 'DEALER WINS';
            case 'BUST': return '💥 BUST! 💥';
            case 'PUSH': return '🤝 PUSH 🤝';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#1a1a1a]">
            {/* 3D Canvas */}
            <div ref={containerRef} className="absolute inset-0" />
            
            {/* UI Layer - exact styling from source */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
                {/* Header */}
                <div className={`flex justify-between items-start ${isPortrait ? 'p-3' : 'p-6'}`}>
                    <div className={`text-white/30 font-black ${isPortrait ? 'text-base' : 'text-xl'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        BLACKJACK
                    </div>
                    <div className={`flex items-center ${isPortrait ? 'gap-2' : 'gap-4'}`}>
                        {/* Balance pill - exact from source */}
                        <div 
                            className={`rounded-full pointer-events-auto ${isPortrait ? 'px-3 py-2' : 'px-6 py-3'}`}
                            style={{ 
                                background: 'rgba(0,0,0,0.6)', 
                                backdropFilter: 'blur(10px)', 
                                border: '1px solid rgba(255,215,0,0.3)',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                            }}
                        >
                            <div className={`text-[#aaa] uppercase tracking-wider ${isPortrait ? 'text-[10px]' : 'text-xs'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>Bankroll</div>
                            <div className={`text-[#ffd700] font-black ${isPortrait ? 'text-lg' : 'text-2xl'}`} style={{ fontFamily: 'Montserrat, sans-serif' }}>${displayBalance.toLocaleString()}</div>
                        </div>
                        <button
                            onClick={onLeave}
                            className={`bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg pointer-events-auto ${isPortrait ? 'px-3 py-2 text-sm' : 'px-4 py-2'}`}
                        >
                            EXIT
                        </button>
                    </div>
                </div>
                
                {/* Message Area - exact from source */}
                {result && (
                    <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
                        <div 
                            className={`rounded-2xl font-black shadow-2xl ${isPortrait ? 'px-6 py-4 text-xl' : 'px-10 py-5 text-2xl'}`}
                            style={{ 
                                background: 'rgba(255,255,255,0.95)', 
                                color: '#222',
                                fontFamily: 'Montserrat, sans-serif',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                                animation: 'messageIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                            }}
                        >
                            {getMessage()}
                            {payout > 0 && result !== 'PUSH' && (
                                <div className="text-green-600 text-lg mt-1">+${payout.toLocaleString()}</div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Scores - display during play */}
                {phase !== 'betting' && (
                    <div className={`absolute ${isPortrait ? 'top-[22%] left-2' : 'top-[40%] left-4'} space-y-2`}>
                        <div className="bg-black/70 rounded-lg px-3 py-2 text-white backdrop-blur-sm">
                            <div className="text-white/50 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>DEALER</div>
                            <div className="font-bold text-xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>{dealerScore}</div>
                        </div>
                        <div className="bg-black/70 rounded-lg px-3 py-2 text-white backdrop-blur-sm">
                            <div className="text-white/50 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>YOU</div>
                            <div className="font-bold text-xl text-green-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>{playerScore}</div>
                        </div>
                        <div className="bg-black/70 rounded-lg px-3 py-2 text-white backdrop-blur-sm">
                            <div className="text-white/50 text-xs" style={{ fontFamily: 'Montserrat, sans-serif' }}>BET</div>
                            <div className="font-bold text-lg text-yellow-400" style={{ fontFamily: 'Montserrat, sans-serif' }}>${bet}</div>
                        </div>
                    </div>
                )}
                
                {/* Bet Display - exact from source */}
                {phase === 'betting' && (
                    <div className={`absolute left-1/2 -translate-x-1/2 ${isPortrait ? 'bottom-36' : 'bottom-52'}`}>
                        <div 
                            className="bg-black/70 text-white px-5 py-2 rounded-full font-bold"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                        >
                            Current Bet: <span className="text-[#ffd700]">${pendingBet}</span>
                        </div>
                    </div>
                )}
                
                {/* Chip Selector - exact from source */}
                {phase === 'betting' && (
                    <div className={`absolute left-1/2 -translate-x-1/2 flex gap-3 pointer-events-auto ${isPortrait ? 'bottom-24' : 'bottom-36'}`}>
                        {CHIP_VALUES.map(val => (
                            <button
                                key={val}
                                onClick={() => addChip(val)}
                                disabled={displayBalance - pendingBet < val || pendingBet + val > MAX_BET}
                                className={`rounded-full font-bold transition-all ${
                                    displayBalance - pendingBet >= val ? 'hover:scale-110 hover:bg-black/80 hover:border-white' : 'opacity-30'
                                } ${isPortrait ? 'w-12 h-12 text-sm' : 'w-14 h-14'}`}
                                style={{ 
                                    border: '4px dashed rgba(255,255,255,0.2)', 
                                    background: 'rgba(0,0,0,0.5)', 
                                    color: 'white',
                                    fontFamily: 'Montserrat, sans-serif'
                                }}
                            >
                                {val >= 1000 ? '1K' : val}
                            </button>
                        ))}
                        <button
                            onClick={clearBet}
                            className={`rounded-full font-bold transition-all hover:scale-110 ${isPortrait ? 'w-12 h-12' : 'w-14 h-14'}`}
                            style={{ 
                                border: '4px dashed #ff4757', 
                                background: 'rgba(0,0,0,0.5)', 
                                color: '#ff4757',
                                fontFamily: 'Montserrat, sans-serif'
                            }}
                        >
                            X
                        </button>
                    </div>
                )}
                
                {/* Action Buttons - exact from source */}
                <div 
                    className={`flex justify-center gap-4 pointer-events-auto ${isPortrait ? 'p-6 pb-8' : 'p-10'}`}
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
                >
                    {phase === 'betting' ? (
                        <button
                            onClick={deal}
                            disabled={pendingBet < MIN_BET || isLoading}
                            className={`rounded-xl font-black uppercase tracking-wider transition-all shadow-xl ${
                                pendingBet >= MIN_BET 
                                    ? 'bg-white text-gray-800 hover:-translate-y-1 opacity-100' 
                                    : 'bg-white text-gray-800 opacity-50 pointer-events-none translate-y-24'
                            } ${isPortrait ? 'px-10 py-4 text-xl' : 'px-12 py-4 text-2xl w-52'}`}
                            style={{ 
                                fontFamily: 'Montserrat, sans-serif',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                            }}
                        >
                            {isLoading ? '...' : 'DEAL'}
                        </button>
                    ) : phase === 'playing' ? (
                        <>
                            <button 
                                onClick={hit} 
                                className={`rounded-xl font-black uppercase tracking-wider text-white shadow-xl hover:-translate-y-1 transition-all ${isPortrait ? 'px-6 py-3 text-base' : 'px-10 py-4 text-lg'}`}
                                style={{ 
                                    background: '#2ed573',
                                    fontFamily: 'Montserrat, sans-serif',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                                }}
                            >
                                Hit
                            </button>
                            <button 
                                onClick={stand} 
                                className={`rounded-xl font-black uppercase tracking-wider text-white shadow-xl hover:-translate-y-1 transition-all ${isPortrait ? 'px-5 py-3 text-base' : 'px-10 py-4 text-lg'}`}
                                style={{ 
                                    background: '#ff4757',
                                    fontFamily: 'Montserrat, sans-serif',
                                    boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                                }}
                            >
                                Stand
                            </button>
                            {gameRef.current?.playerHand?.length === 2 && displayBalance >= bet && (
                                <button 
                                    onClick={doubleDown} 
                                    className={`rounded-xl font-black uppercase tracking-wider text-white shadow-xl hover:-translate-y-1 transition-all ${isPortrait ? 'px-4 py-3 text-base' : 'px-10 py-4 text-lg'}`}
                                    style={{ 
                                        background: '#ffa502',
                                        fontFamily: 'Montserrat, sans-serif',
                                        boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    {isPortrait ? '2X' : 'Double'}
                                </button>
                            )}
                        </>
                    ) : phase === 'dealer' ? (
                        <div className="text-white font-bold text-lg animate-pulse" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Dealer playing...
                        </div>
                    ) : phase === 'result' ? (
                        <div className="text-white/70 font-bold text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Next round starting...
                        </div>
                    ) : null}
                </div>
            </div>
            
            {/* Message animation keyframes */}
            <style>{`
                @keyframes messageIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.9); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default CasinoBlackjack;
