/**
 * P2PUno - Production-ready P2P UNO Game
 * 
 * Based on Lumina UNO 3D implementation
 * 
 * KEY CONCEPTS:
 * - "Active Player": The player whose turn it is - can interact with cards
 * - "Spectator": The opponent waiting for their turn - watches only
 * - Camera is fixed: Both players see table from their perspective
 * - Game state is SERVER-DRIVEN: All actions validated server-side
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useChallenge } from '../challenge';
import { useMultiplayer } from '../multiplayer';
import * as THREE from 'three';
import gsap from 'gsap';
import { createPlayerBuilder, cacheAnimatedParts, animateCosmeticsFromCache } from '../engine/PlayerBuilder';
import { PALETTE } from '../constants';
import ChatLog from '../components/ChatLog';

// Helper to generate Solscan link
const getSolscanLink = (txSignature) => `https://solscan.io/tx/${txSignature}`;

// --- GAME CONFIG ---
const CONFIG = {
    colors: ['Red', 'Blue', 'Green', 'Yellow'],
    values: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'],
    wilds: ['Wild', 'Wild +4'],
    cardSize: { w: 4, h: 6, d: 0.05 },
    animSpeed: 400
};

const COLOR_HEX = {
    Red: 0xff3333,
    Blue: 0x1155ff,
    Green: 0x00aa00,
    Yellow: 0xffcc00,
    Black: 0x111111
};

// --- ASSET FACTORY ---
class AssetFactory {
    constructor() {
        this.textures = {};
        this.cache = {};
    }

    createCardTexture(color, value) {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');
        
        const palettes = {
            'Red': '#ff3333', 'Blue': '#1155ff', 'Green': '#00aa00', 'Yellow': '#ffcc00', 'Black': '#111111'
        };
        const bg = palettes[color] || '#111111';

        ctx.fillStyle = '#ffffff';
        this.roundRect(ctx, 0, 0, 512, 768, 40);
        ctx.fill();

        ctx.fillStyle = bg;
        if(color === 'Black') {
            const g = ctx.createLinearGradient(0,0,512,768);
            g.addColorStop(0, '#222');
            g.addColorStop(1, '#000');
            ctx.fillStyle = g;
        }
        this.roundRect(ctx, 25, 25, 462, 718, 30);
        ctx.fill();

        ctx.save();
        ctx.translate(256, 384);
        ctx.rotate(Math.PI / 4); 
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, 180, 280, 0, 0, 2*Math.PI);
        ctx.fill();
        ctx.restore();

        let symbol = value;
        let fontSize = 240;
        let font = '900';

        if(value === 'Skip') { symbol = '⊘'; fontSize = 260; }
        else if(value === 'Reverse') { symbol = '⇄'; fontSize = 260; }
        else if(value === '+2') { symbol = '+2'; fontSize = 220; }
        else if(value === 'Wild') { symbol = '★'; fontSize = 260; }
        else if(value === 'Wild +4') { symbol = '+4'; fontSize = 220; }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 8;
        ctx.shadowOffsetY = 8;

        ctx.fillStyle = (color === 'Black') ? 'url(#rainbow)' : bg; 
        if (color === 'Black') {
            const grad = ctx.createLinearGradient(150, 300, 350, 500);
            grad.addColorStop(0, '#ff3333');
            grad.addColorStop(0.3, '#1155ff');
            grad.addColorStop(0.6, '#00aa00');
            grad.addColorStop(1, '#ffcc00');
            ctx.fillStyle = grad;
        }
        
        ctx.font = `${font} ${fontSize}px sans-serif`;
        ctx.fillText(symbol, 256, 394);

        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px sans-serif';
        
        ctx.fillText(symbol, 65, 75);
        ctx.save();
        ctx.translate(512-65, 768-75);
        ctx.rotate(Math.PI);
        ctx.fillText(symbol, 0, 0);
        ctx.restore();

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        return texture;
    }

    createBackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#111';
        this.roundRect(ctx, 0, 0, 512, 768, 40);
        ctx.fill();
        
        ctx.font = '900 160px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 20;

        ctx.fillStyle = '#ff3333';
        ctx.fillText("U", 180, 384);
        ctx.fillStyle = '#ffcc00';
        ctx.fillText("N", 280, 384);
        ctx.fillStyle = '#1155ff';
        ctx.fillText("O", 380, 384);

        const texture = new THREE.CanvasTexture(canvas);
        texture.anisotropy = 16;
        return texture;
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

    generate() {
        this.back = this.createBackTexture();
        this.cache = {};
    }

    get(color, value) {
        const key = `${color}_${value}`;
        if(!this.cache[key]) {
            this.cache[key] = this.createCardTexture(color, value);
        }
        return this.cache[key];
    }
}

// --- 3D ENGINE ---
class UnoEngine {
    constructor(container) {
        this.container = container;
        this.assets = new AssetFactory();
        this.assets.generate();
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x3a5a7c); // Brighter blue-gray room
        // No fog - keep room bright and clear

        const isPortrait = container.clientHeight > container.clientWidth;
        this.camera = new THREE.PerspectiveCamera(isPortrait ? 55 : 45, container.clientWidth / container.clientHeight, 0.1, 100);
        // Portrait: pull camera back and up to see more of the table and cards
        this.camera.position.set(0, isPortrait ? 35 : 25, isPortrait ? 55 : 45);
        this.camera.lookAt(0, isPortrait ? 2 : -2, 0);
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = !isMobile;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.setupLights();
        this.createEnvironment();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.interactables = [];
        this.hovered = null;
        
        // Groups for card management
        this.deckGroup = new THREE.Group();
        this.discardGroup = new THREE.Group();
        this.playerHandGroup = new THREE.Group();
        this.opponentHandGroup = new THREE.Group();
        this.scene.add(this.deckGroup);
        this.scene.add(this.discardGroup);
        this.scene.add(this.playerHandGroup);
        this.scene.add(this.opponentHandGroup);

        // Penguin models
        this.penguinMeshes = [];
        
        this.clock = new THREE.Clock();
        this.animationId = null;
        this.onCardClick = null;
        this.onDeckClick = null;
        
        this.renderDeckStack();
        
        window.addEventListener('resize', this.handleResize);
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.addEventListener('click', this.handleClick);
        
        this.animate();
    }

    setupLights() {
        // Bright ambient for well-lit room
        const ambient = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambient);

        const spot = new THREE.SpotLight(0xffffff, 2.0);
        spot.position.set(0, 50, 10);
        spot.angle = Math.PI / 4;
        spot.penumbra = 0.5;
        spot.castShadow = true;
        spot.shadow.mapSize.width = 2048;
        spot.shadow.mapSize.height = 2048;
        this.scene.add(spot);

        // Brighter hand light for card visibility
        const handLight = new THREE.PointLight(0xffeedd, 1.2, 40);
        handLight.position.set(0, 10, 20);
        this.scene.add(handLight);
        
        // Additional fill light from above
        const fillLight = new THREE.PointLight(0xffffff, 0.8, 50);
        fillLight.position.set(0, 30, 0);
        this.scene.add(fillLight);
    }

    createEnvironment() {
        const geo = new THREE.PlaneGeometry(150, 150);
        const mat = new THREE.MeshStandardMaterial({ 
            color: 0x111111, // Black table as requested
            roughness: 0.8,
            metalness: 0.1
        });
        const table = new THREE.Mesh(geo, mat);
        table.rotation.x = -Math.PI / 2;
        table.receiveShadow = true;
        this.scene.add(table);
    }

    createCardMesh(texture) {
        const geometry = new THREE.BoxGeometry(CONFIG.cardSize.w, CONFIG.cardSize.h, CONFIG.cardSize.d);
        
        const faceMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.2, metalness: 0.1 });
        const backMat = new THREE.MeshStandardMaterial({ map: this.assets.back, roughness: 0.2, metalness: 0.1 });
        const sideMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); 

        const materials = [sideMat, sideMat, sideMat, sideMat, faceMat, backMat];

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    renderDeckStack() {
        this.deckGroup.clear();
        this.interactables = this.interactables.filter(o => o.userData.type !== 'deck');

        for(let i = 0; i < 6; i++) {
            const mesh = this.createCardMesh(this.assets.back);
            mesh.rotation.x = -Math.PI/2;
            mesh.rotation.z = (Math.random() - 0.5) * 0.1;
            mesh.position.y = i * 0.06;
            mesh.castShadow = true;
            
            if(i === 5) {
                mesh.userData = { type: 'deck' };
                this.interactables.push(mesh);
            }
            this.deckGroup.add(mesh);
        }
        this.deckGroup.position.set(-6, 0.1, -2);
    }

    updateDiscard(card) {
        const mesh = this.createCardMesh(this.assets.get(card.c, card.v));
        mesh.position.set(0, 15, 15);
        mesh.rotation.set(Math.random(), Math.random(), Math.random());
        this.scene.add(mesh);

        const pileH = 0.1 + this.discardGroup.children.length * 0.01;
        const targetX = 2 + (Math.random() * 0.5);
        const targetZ = Math.random() * 0.5;
        const targetRotZ = Math.random() * 2;
        
        gsap.to(mesh.position, {
            x: targetX,
            y: pileH,
            z: targetZ,
            duration: 0.4,
            ease: "bounce.out"
        });
        gsap.to(mesh.rotation, {
            x: -Math.PI / 2,
            y: 0,
            z: targetRotZ,
            duration: 0.4,
            onComplete: () => {
                this.scene.remove(mesh);
                const finalMesh = this.createCardMesh(this.assets.get(card.c, card.v));
                finalMesh.position.set(targetX, pileH, targetZ);
                finalMesh.rotation.set(-Math.PI / 2, 0, targetRotZ);
                this.discardGroup.add(finalMesh);
            }
        });
    }
    
    // Render the initial starting card without animation
    renderInitialDiscard(card) {
        this.discardGroup.clear();
        const mesh = this.createCardMesh(this.assets.get(card.c, card.v));
        mesh.position.set(2, 0.1, 0);
        mesh.rotation.set(-Math.PI / 2, 0, Math.random() * 0.3);
        this.discardGroup.add(mesh);
    }

    renderPlayerHand(hand, isMyTurn) {
        // Clear old cards
        this.playerHandGroup.clear();
        this.interactables = this.interactables.filter(o => o.userData.type !== 'playerCard');
        
        // Check if portrait mode (mobile)
        const isPortrait = this.container.clientHeight > this.container.clientWidth;
        this.isPortrait = isPortrait;
        this.currentHand = hand;
        this.isMyTurn = isMyTurn;
        
        if (isPortrait) {
            // Mobile: Carousel view - show focused card raised
            this.renderMobileHand(hand, isMyTurn);
        } else {
            // Desktop: Standard spread
            this.renderDesktopHand(hand, isMyTurn);
        }
    }
    
    renderDesktopHand(hand, isMyTurn) {
        const w = Math.min(hand.length * 3.5, 30);
        const start = -w/2;
        const step = hand.length > 1 ? w / (hand.length - 1) : 0;

        hand.forEach((card, i) => {
            const tex = this.assets.get(card.c, card.v);
            const m = this.createCardMesh(tex);
            const x = start + i * step;
            
            const y = 2 - Math.abs(x) * 0.1; 
            const z = 18 + Math.abs(x) * 0.3; 
            
            m.position.set(x, y, z);
            m.rotation.set(-0.9, -x * 0.05, 0); 
            
            m.userData = { 
                type: 'playerCard', 
                card: card,
                cardIndex: i,
                origin: {x, y, z}
            };
            
            this.playerHandGroup.add(m);
            if (isMyTurn) {
                this.interactables.push(m);
            }
        });
    }
    
    renderMobileHand(hand, isMyTurn) {
        // Initialize focused index if not set
        if (this.focusedCardIndex === undefined || this.focusedCardIndex >= hand.length) {
            this.focusedCardIndex = Math.floor(hand.length / 2);
        }
        
        // Show 3 cards max centered around focused card for better visibility
        const visibleCount = Math.min(3, hand.length);
        const halfVisible = Math.floor(visibleCount / 2);
        
        // Calculate which cards to show
        let startIdx = Math.max(0, this.focusedCardIndex - halfVisible);
        let endIdx = Math.min(hand.length, startIdx + visibleCount);
        if (endIdx - startIdx < visibleCount) {
            startIdx = Math.max(0, endIdx - visibleCount);
        }
        
        const spacing = 6; // Wider spacing for visibility
        const centerX = 0;
        
        for (let i = startIdx; i < endIdx; i++) {
            const card = hand[i];
            const tex = this.assets.get(card.c, card.v);
            const m = this.createCardMesh(tex);
            
            const relativePos = i - this.focusedCardIndex;
            const x = centerX + relativePos * spacing;
            const isFocused = i === this.focusedCardIndex;
            
            // Cards positioned closer to camera and larger for mobile
            const y = isFocused ? 3 : 1;  // Raised up for visibility
            const z = isFocused ? 22 : 26; // Much closer to camera
            const scale = isFocused ? 1.8 : 1.0; // Larger cards
            
            m.position.set(x, y, z);
            m.rotation.set(-0.6, relativePos * -0.05, 0); // Slight tilt towards center
            m.scale.set(scale, scale, scale);
            
            m.userData = { 
                type: 'playerCard', 
                card: card,
                cardIndex: i,
                origin: {x, y, z},
                isFocused
            };
            
            this.playerHandGroup.add(m);
            if (isMyTurn) {
                this.interactables.push(m);
            }
        }
    }
    
    // Mobile navigation - just update internal index, React state drives the render
    setFocusedIndex(index) {
        this.focusedCardIndex = index;
    }
    
    getFocusedCard() {
        if (!this.currentHand || this.focusedCardIndex === undefined) return null;
        return this.currentHand[this.focusedCardIndex];
    }

    renderOpponentHand(cardCount) {
        this.opponentHandGroup.clear();
        
        const w = Math.min(cardCount * 2, 24);
        const start = -w/2;
        const step = w / Math.max(1, cardCount-1);

        for (let i = 0; i < cardCount; i++) {
            const m = this.createCardMesh(this.assets.back);
            const x = start + i*step;
            m.position.set(x, 4, -22 - Math.abs(x)*0.2);
            m.rotation.set(0.5, -x*0.05, 0); 
            this.opponentHandGroup.add(m);
        }
    }

    animateDrawCard(callback) {
        const mesh = this.createCardMesh(this.assets.back);
        mesh.position.copy(this.deckGroup.position);
        mesh.position.y += 1;
        mesh.rotation.x = -Math.PI/2;
        this.scene.add(mesh);

        gsap.to(mesh.position, {
            x: 0,
            y: 5,
            z: 20,
            duration: 0.4,
            ease: "power3.out"
        });
        gsap.to(mesh.rotation, {
            x: -0.8,
            y: 0,
            z: 0,
            duration: 0.4,
            onComplete: () => {
                this.scene.remove(mesh);
                if (callback) callback();
            }
        });
    }

    addPenguinPlayer(playerIdx, playerData, position) {
        // Get appearance data
        let appearanceData = playerData?.appearance || playerData?.cosmetics || {};
        
        // Parse appearance if it's a string
        if (typeof appearanceData === 'string') {
            try { appearanceData = JSON.parse(appearanceData); } catch (e) { appearanceData = {}; }
        }
        
        console.log(`🐧 UNO player ${playerIdx} appearance:`, appearanceData);
        
        // Determine feather color - check all possible property names
        const featherColor = appearanceData.skin || appearanceData.color || appearanceData.featherColor || (playerIdx === 0 ? 'cyan' : 'pink');
        
        const group = new THREE.Group();
        
        try {
            const playerBuilder = createPlayerBuilder(THREE);
            const { buildPlayerMesh } = playerBuilder;
            
            // Build appearance object matching voxel world format
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
            
            const penguin = buildPlayerMesh(appearance);
            penguin.scale.set(1.5, 1.5, 1.5);
            penguin.name = 'penguin_mesh';
            group.add(penguin);
            
            group.userData.penguinMesh = penguin;
            group.userData.appearance = appearance;
            
            // Cache animated parts for cosmetic animations
            const animCache = cacheAnimatedParts(penguin);
            group.userData.animCache = animCache;
        } catch (e) {
            console.warn('UNO Penguin build failed, using fallback:', e);
            // Fallback penguin
            const colorHex = typeof featherColor === 'string' 
                ? (PALETTE[featherColor] || 0x00bcd4)
                : featherColor;
            
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
        
        // Remove existing bubble for this player
        const existingBubble = penguin.getObjectByName('chatBubble');
        if (existingBubble) {
            penguin.remove(existingBubble);
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
        sprite.scale.set(10, 5, 1); // Much larger for readability
        sprite.position.set(0, 5, 0);
        
        penguin.add(sprite);
        
        // Animate in
        sprite.material.opacity = 0;
        gsap.to(sprite.material, { opacity: 1, duration: 0.2 });
        gsap.to(sprite.position, { y: 6, duration: 0.2, ease: "back.out" });
        
        // Remove after 4 seconds
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
    }

    handleMouseMove = (e) => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        // Subtle Parallax
        const targetX = this.mouse.x * 2; 
        const targetY = 25 + this.mouse.y * 1;
        this.camTarget = { x: targetX, y: targetY };
    }

    handleClick = () => {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables);
        
        if(intersects.length > 0) {
            const obj = intersects[0].object;
            if(obj.userData.type === 'deck' && this.onDeckClick) {
                this.onDeckClick();
            } else if(obj.userData.type === 'playerCard' && this.onCardClick) {
                this.onCardClick(obj.userData.card);
            }
        }
    }

    animate = () => {
        this.animationId = requestAnimationFrame(this.animate);

        if(this.camTarget) {
            this.camera.position.x += (this.camTarget.x - this.camera.position.x) * 0.05;
            this.camera.position.y += (this.camTarget.y - this.camera.position.y) * 0.05;
        }
        
        this.camera.lookAt(0, -2, 0);

        // Hover effects
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.interactables);
        
        if(intersects.length > 0) {
            const obj = intersects[0].object;
            if(this.hovered !== obj) {
                this.clearHover();
                this.hovered = obj;
                this.container.style.cursor = 'pointer';
                
                if(obj.userData.type === 'playerCard') {
                    gsap.to(obj.position, {
                        y: obj.userData.origin.y + 1.5,
                        z: obj.userData.origin.z - 1,
                        duration: 0.15,
                        ease: "power2.out"
                    });
                }
                if(obj.userData.type === 'deck') {
                    gsap.to(this.deckGroup.scale, {
                        x: 1.1,
                        y: 1.1,
                        z: 1.1,
                        duration: 0.2
                    });
                }
            }
        } else {
            this.clearHover();
        }

        // Animate penguins
        const delta = this.clock.getDelta();
        this.penguinMeshes.forEach(p => {
            if (p?.cache) animateCosmeticsFromCache(p.cache, delta);
        });

        this.renderer.render(this.scene, this.camera);
    }

    clearHover() {
        if(this.hovered) {
            const obj = this.hovered;
            if(obj.userData.type === 'playerCard') {
                gsap.to(obj.position, {
                    y: obj.userData.origin.y,
                    z: obj.userData.origin.z,
                    duration: 0.15,
                    ease: "power2.out"
                });
            }
            if(obj.userData.type === 'deck') {
                gsap.to(this.deckGroup.scale, {
                    x: 1,
                    y: 1,
                    z: 1,
                    duration: 0.2
                });
            }
        }
        this.hovered = null;
        if (this.container) this.container.style.cursor = 'default';
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);
        this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
        this.renderer.domElement.removeEventListener('click', this.handleClick);
        
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
const P2PUno = ({ onMatchEnd }) => {
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    const lastAnimatedActionRef = useRef(null); // Track last animated discard to prevent replays
    const { activeMatch, matchState, playCard, forfeitMatch, clearMatch } = useChallenge();
    const { connected, playerId } = useMultiplayer();
    
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [lastAction, setLastAction] = useState(null);
    const [showDisconnected, setShowDisconnected] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [focusedCardIndex, setFocusedCardIndex] = useState(0);
    
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

    // Initialize engine
    useEffect(() => {
        if (!containerRef.current || !activeMatch) return;
        
        const engine = new UnoEngine(containerRef.current);
        engineRef.current = engine;
        
        // Add penguin avatars - adjust positions for portrait/landscape
        const p1Data = activeMatch.player1;
        const p2Data = activeMatch.player2;
        const isPortrait = containerRef.current.clientHeight > containerRef.current.clientWidth;
        
        if (isPortrait) {
            // Portrait: Move penguins closer to center so they're not cut off
            engine.addPenguinPlayer(0, p1Data, { x: -6, y: 0.5, z: 12 });
            engine.addPenguinPlayer(1, p2Data, { x: 6, y: 0.5, z: -15 });
        } else {
            engine.addPenguinPlayer(0, p1Data, { x: -12, y: 0.5, z: 15 });
            engine.addPenguinPlayer(1, p2Data, { x: 12, y: 0.5, z: -18 });
        }
        
        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, [activeMatch?.matchId]);

    // Update hand rendering - this can re-run when focusedCardIndex changes
    useEffect(() => {
        if (!engineRef.current || !matchState) return;
        const engine = engineRef.current;
        
        // Keep focused index in bounds when hand changes
        if (matchState.myHand && focusedCardIndex >= matchState.myHand.length) {
            setFocusedCardIndex(Math.max(0, matchState.myHand.length - 1));
        }
        
        // Sync engine's focused index with React state
        if (engine.focusedCardIndex !== focusedCardIndex) {
            engine.focusedCardIndex = focusedCardIndex;
        }
        
        // Render hands
        if (matchState.myHand) {
            engine.renderPlayerHand(matchState.myHand, matchState.isMyTurn && matchState.phase === 'playing');
        }
        if (matchState.opponentCardCount !== undefined) {
            engine.renderOpponentHand(matchState.opponentCardCount);
        }
        
    }, [matchState, focusedCardIndex]);
    
    // Separate effect for discard animation - only runs when lastAction changes
    useEffect(() => {
        if (!engineRef.current || !matchState) return;
        const engine = engineRef.current;
        
        // Only animate if this is a NEW action we haven't animated yet
        const actionKey = matchState.lastAction 
            ? `${matchState.lastAction.type}-${matchState.lastAction.card?.uid}-${matchState.lastAction.player}` 
            : null;
        
        if (actionKey && actionKey !== lastAnimatedActionRef.current) {
            lastAnimatedActionRef.current = actionKey;
            
            if (matchState.topCard && matchState.lastAction?.type === 'play') {
                engine.updateDiscard(matchState.topCard);
            }
        }
        
        // Show color picker if needed
        setShowColorPicker(matchState.waitingForColor === true);
        
        // Track last action for UI
        if (matchState.lastAction) {
            setLastAction(matchState.lastAction);
        }
        
    }, [matchState?.lastAction, matchState?.topCard, matchState?.waitingForColor]);
    
    // Render initial top card when game starts (no lastAction yet)
    useEffect(() => {
        if (!engineRef.current || !matchState?.topCard) return;
        
        // Only render initial card if there's no lastAction (game just started)
        // and we haven't already animated anything
        if (!matchState.lastAction && !lastAnimatedActionRef.current) {
            lastAnimatedActionRef.current = 'initial';
            engineRef.current.renderInitialDiscard(matchState.topCard);
        }
    }, [matchState?.topCard, matchState?.lastAction]);

    // Set up card click handlers
    useEffect(() => {
        if (!engineRef.current) return;
        const engine = engineRef.current;
        
        engine.onCardClick = (card) => {
            if (!matchState?.isMyTurn || matchState.phase !== 'playing') return;
            playCard({ action: 'play', cardUid: card.uid });
        };
        
        engine.onDeckClick = () => {
            if (!matchState?.isMyTurn || matchState.phase !== 'playing') return;
            playCard({ action: 'draw' });
            engineRef.current?.animateDrawCard();
        };
        
    }, [matchState, playCard]);

    // Connection status
    useEffect(() => {
        if (!connected && activeMatch) {
            setShowDisconnected(true);
        } else {
            setShowDisconnected(false);
        }
    }, [connected, activeMatch]);

    // Handle color selection
    const handleColorSelect = useCallback((color) => {
        playCard({ action: 'selectColor', color });
        setShowColorPicker(false);
    }, [playCard]);

    // Handle UNO call
    const handleUnoCall = useCallback(() => {
        playCard({ action: 'callUno' });
    }, [playCard]);

    const handleForfeit = () => {
        if (confirm('Forfeit? You will lose the wager.')) forfeitMatch();
    };

    // === RENDER ===
    if (!activeMatch || !matchState) return null;

    const isPlayer1 = activeMatch.yourRole === 'player1';
    const isMyTurn = matchState.isMyTurn;
    const myPlayer = isPlayer1 ? activeMatch.player1 : activeMatch.player2;
    const opponent = isPlayer1 ? activeMatch.player2 : activeMatch.player1;
    const currentTurnName = matchState.currentTurn === 'player1' 
        ? activeMatch.player1.name : activeMatch.player2.name;
    const isComplete = matchState.phase === 'complete';
    const didWin = matchState.winner === (isPlayer1 ? 'player1' : 'player2');
    const totalPot = activeMatch.wagerAmount * 2;
    
    // Token wager info from match result OR active match
    const matchResult = activeMatch.matchResult;
    const tokenSettlement = matchResult?.tokenSettlement;
    const wagerToken = matchResult?.wagerToken || activeMatch?.wagerToken;
    const tokenWon = didWin && wagerToken ? (tokenSettlement?.amount || wagerToken.tokenAmount * 2) : 0;
    const tokenLost = !didWin && wagerToken ? wagerToken.tokenAmount : 0;
    const solscanLink = tokenSettlement?.txSignature ? getSolscanLink(tokenSettlement.txSignature) : null;
    
    // Show UNO button when player has 2 cards and it's their turn
    const showUnoButton = isMyTurn && matchState.myHand?.length === 2;

    return (
        <div className="fixed inset-0 z-40 select-none bg-black">
            {/* 3D Canvas */}
            <div ref={containerRef} className="absolute inset-0" />
            
            {/* === STATUS PILL === */}
            <div className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 right-4'} z-10`}>
                <div 
                    className={`${isMobile ? 'px-4 py-2' : 'px-8 py-4'} rounded-full backdrop-blur-md transition-all ${isMyTurn ? 'animate-pulse' : ''}`}
                    style={{ 
                        background: isMyTurn ? 'rgba(34, 197, 94, 0.9)' : 'rgba(20, 20, 20, 0.8)',
                        borderWidth: '3px',
                        borderStyle: 'solid',
                        borderColor: isMyTurn ? '#22c55e' : (COLOR_HEX[matchState.activeColor] ? `#${COLOR_HEX[matchState.activeColor].toString(16).padStart(6, '0')}` : '#fff'),
                        boxShadow: isMyTurn 
                            ? '0 0 30px rgba(34, 197, 94, 0.8), 0 0 60px rgba(34, 197, 94, 0.4)' 
                            : `0 5px 20px ${COLOR_HEX[matchState.activeColor] ? `#${COLOR_HEX[matchState.activeColor].toString(16).padStart(6, '0')}40` : 'rgba(0,0,0,0.6)'}`
                    }}
                >
                    <div className={`text-white font-black ${isMobile ? 'text-base' : 'text-2xl'} ${isMyTurn ? 'drop-shadow-lg' : ''}`}>
                        {isMyTurn ? '🎯 YOUR TURN!' : `${currentTurnName}'s TURN`}
                    </div>
                    <div 
                        className={`${isMobile ? 'text-xs' : 'text-base'} uppercase tracking-wider font-medium`}
                        style={{ color: isMyTurn ? 'rgba(255,255,255,0.9)' : (COLOR_HEX[matchState.activeColor] ? `#${COLOR_HEX[matchState.activeColor].toString(16).padStart(6, '0')}` : '#fff') }}
                    >
                        Active: {matchState.activeColor} {matchState.activeValue}
                    </div>
                </div>
            </div>

            {/* === TURN INDICATOR === */}
            <div className={`absolute ${isMobile ? 'top-2 left-2' : 'top-4 left-4'} z-10`}>
                <div 
                    className={`${isMobile ? 'px-2 py-1' : 'px-4 py-2'} rounded-full flex items-center gap-1.5 backdrop-blur-md border-2 ${
                        isMyTurn 
                            ? 'border-green-400 shadow-[0_0_10px_rgba(74,222,128,0.4)]' 
                            : 'border-gray-500'
                    }`}
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                    <div className={`${isMobile ? 'w-2 h-2' : 'w-2.5 h-2.5'} rounded-full ${isMyTurn ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                    <span className={`text-white font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                        {matchState.timeRemaining}s
                    </span>
                </div>
            </div>

            {/* === PLAYER INFO CARDS === */}
            {/* Your info - bottom left */}
            <div 
                className={`absolute ${isMobile ? 'bottom-16 left-2 p-2' : 'bottom-24 left-4 p-3'} rounded-xl backdrop-blur-md z-10`}
                style={{ background: 'rgba(0,0,0,0.8)', borderLeft: `3px solid #00bcd4` }}
            >
                <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`${isMobile ? 'w-5 h-5 text-[8px]' : 'w-6 h-6 text-[10px]'} rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold`}>YOU</div>
                    <span className={`text-cyan-400 font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate max-w-[80px]`}>{myPlayer.name}</span>
                </div>
                <div className={`text-white font-bold ${isMobile ? 'text-sm' : 'text-lg'}`}>
                    🃏 {matchState.myHand?.length || 0} cards
                </div>
            </div>
            
            {/* Mobile: Card position indicator */}
            {isMobile && matchState.myHand?.length > 0 && (
                <div className="absolute bottom-[105px] left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-black/80 px-2 py-0.5 rounded-full text-white text-[10px] font-medium">
                        {focusedCardIndex + 1} / {matchState.myHand.length}
                    </div>
                </div>
            )}

            {/* Opponent info - top left */}
            <div 
                className={`absolute ${isMobile ? 'top-16 left-2 p-2' : 'top-20 left-4 p-3'} rounded-xl backdrop-blur-md z-10`}
                style={{ background: 'rgba(0,0,0,0.8)', borderLeft: `3px solid #e91e63` }}
            >
                <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={`${isMobile ? 'w-5 h-5 text-[8px]' : 'w-6 h-6 text-[10px]'} rounded-full bg-pink-500 flex items-center justify-center text-white font-bold`}>OPP</div>
                    <span className={`text-pink-400 font-bold ${isMobile ? 'text-xs' : 'text-sm'} truncate max-w-[80px]`}>{opponent.name}</span>
                </div>
                <div className={`text-white font-bold ${isMobile ? 'text-sm' : 'text-lg'}`}>
                    🃏 {matchState.opponentCardCount || 0} cards
                </div>
            </div>

            {/* === COLOR PICKER MODAL === */}
            {showColorPicker && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div 
                        className="p-6 sm:p-10 rounded-3xl text-center backdrop-blur-xl animate-in zoom-in-95 duration-200"
                        style={{ background: 'rgba(15, 15, 20, 0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.9)' }}
                    >
                        <h2 className="text-white text-2xl font-light mb-2">WILD CARD</h2>
                        <p className="text-white/50 text-sm mb-6">Select a color to continue</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => handleColorSelect('Red')}
                                className="w-20 h-20 rounded-2xl cursor-pointer transition-transform hover:scale-105 relative overflow-hidden"
                                style={{ background: '#ff4757', boxShadow: '0 10px 20px rgba(255, 71, 87, 0.3)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
                            </button>
                            <button 
                                onClick={() => handleColorSelect('Blue')}
                                className="w-20 h-20 rounded-2xl cursor-pointer transition-transform hover:scale-105 relative overflow-hidden"
                                style={{ background: '#3742fa', boxShadow: '0 10px 20px rgba(55, 66, 250, 0.3)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
                            </button>
                            <button 
                                onClick={() => handleColorSelect('Green')}
                                className="w-20 h-20 rounded-2xl cursor-pointer transition-transform hover:scale-105 relative overflow-hidden"
                                style={{ background: '#2ed573', boxShadow: '0 10px 20px rgba(46, 213, 115, 0.3)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
                            </button>
                            <button 
                                onClick={() => handleColorSelect('Yellow')}
                                className="w-20 h-20 rounded-2xl cursor-pointer transition-transform hover:scale-105 relative overflow-hidden"
                                style={{ background: '#ffa502', boxShadow: '0 10px 20px rgba(255, 165, 2, 0.3)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === UNO BUTTON === */}
            {showUnoButton && (
                <button
                    onClick={handleUnoCall}
                    className="absolute right-4 sm:right-10 bottom-36 sm:bottom-48 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center font-black text-xl sm:text-2xl text-white z-50 animate-pulse"
                    style={{ 
                        background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
                        border: '6px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 0 40px rgba(255, 71, 87, 0.6)'
                    }}
                >
                    UNO!
                </button>
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

            {/* === BOTTOM ACTION BAR === */}
            <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex ${isMobile ? 'gap-1' : 'gap-2'} items-center`}>
                {/* Mobile: Left arrow */}
                {isMobile && (
                    <button
                        onClick={() => {
                            const newIdx = Math.max(0, focusedCardIndex - 1);
                            setFocusedCardIndex(newIdx);
                        }}
                        disabled={focusedCardIndex === 0}
                        className="w-10 h-10 rounded-full bg-black/70 text-white text-lg flex items-center justify-center active:scale-90 disabled:opacity-30"
                    >
                        ◀
                    </button>
                )}
                
                {/* Mobile: PLAY focused card */}
                {isMobile && (
                    <button
                        onClick={() => {
                            const card = engineRef.current?.getFocusedCard();
                            if (card) playCard({ action: 'play', cardUid: card.uid });
                        }}
                        disabled={!isMyTurn || matchState.phase !== 'playing' || !connected}
                        className={`px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                            isMyTurn && matchState.phase === 'playing' && connected
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white active:scale-95'
                                : 'bg-gray-700 text-gray-500'
                        }`}
                    >
                        ▶ PLAY
                    </button>
                )}
                
                {/* DRAW button */}
                <button
                    onClick={() => engineRef.current?.onDeckClick?.()}
                    disabled={!isMyTurn || matchState.phase !== 'playing' || !connected}
                    className={`${isMobile ? 'px-3 py-2 text-xs' : 'px-5 py-3 text-sm'} rounded-lg font-bold flex items-center gap-1 transition-all ${
                        isMyTurn && matchState.phase === 'playing' && connected
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg hover:scale-105 active:scale-95'
                            : 'bg-gray-700 text-gray-500'
                    }`}
                >
                    📥 DRAW
                </button>
                
                {/* Mobile: Right arrow */}
                {isMobile && (
                    <button
                        onClick={() => {
                            const maxIdx = (matchState.myHand?.length || 1) - 1;
                            const newIdx = Math.min(maxIdx, focusedCardIndex + 1);
                            setFocusedCardIndex(newIdx);
                        }}
                        disabled={focusedCardIndex >= (matchState.myHand?.length || 1) - 1}
                        className="w-10 h-10 rounded-full bg-black/70 text-white text-lg flex items-center justify-center active:scale-90 disabled:opacity-30"
                    >
                        ▶
                    </button>
                )}
            </div>

            {/* === POT & FORFEIT === */}
            {isMobile ? (
                <>
                    {/* Mobile: Pot next to action buttons */}
                    <div className="absolute bottom-4 right-2 z-10 flex flex-col gap-1 items-center">
                        <div className="bg-black/70 px-2 py-1 rounded text-xs">
                            <span className="text-yellow-400 font-bold">💰 {totalPot}</span>
                        </div>
                        <button 
                            onClick={handleForfeit}
                            className="bg-red-600/80 text-white px-2 py-1 rounded text-[10px] font-bold"
                        >
                            Forfeit
                        </button>
                    </div>
                </>
            ) : (
                <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2 items-end">
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
            )}

            {/* === GAME OVER === */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-500">
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 text-center max-w-sm border border-white/10 shadow-2xl">
                        <div className="text-6xl mb-4">{didWin ? '🏆' : '💸'}</div>
                        <h2 className="text-3xl font-black text-white mb-2">
                            {didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className="text-gray-400 mb-4">
                            {didWin ? `${opponent.name} ran out of cards!` : 'You couldn\'t get rid of your cards...'}
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

export default P2PUno;

