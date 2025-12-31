/**
 * P2PBlackjack - Production-ready P2P Blackjack Game
 * 
 * Based on Voxel Royale Blackjack source code
 * 
 * KEY CONCEPTS:
 * - Both players play against a shared dealer
 * - Player 1 plays first, then Player 2
 * - Dealer plays last, following standard casino rules (stand on 17)
 * - Winner determined by comparing results against dealer
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

// --- ASSET FACTORY ---
class AssetFactory {
    constructor() {
        this.textures = {};
    }

    createCardTexture(suit, value) {
        const id = `${suit}_${value}`;
        if (this.textures[id]) return this.textures[id];

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // White card background with rounded corners
        ctx.fillStyle = '#fff';
        this.roundRect(ctx, 0, 0, 512, 768, 40);
        ctx.fill();

        const color = (suit === '♥' || suit === '♦') ? '#e74c3c' : '#2c3e50';
        ctx.fillStyle = color;
        ctx.font = 'bold 100px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, 70, 110);
        ctx.font = '80px Montserrat, sans-serif';
        ctx.fillText(suit, 70, 200);

        ctx.font = '240px Montserrat, sans-serif';
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
        
        // Bottom right corner (upside down)
        ctx.save();
        ctx.translate(512 - 70, 768 - 110);
        ctx.rotate(Math.PI);
        ctx.fillStyle = color;
        ctx.font = 'bold 100px Montserrat, sans-serif';
        ctx.fillText(value, 0, 0);
        ctx.font = '80px Montserrat, sans-serif';
        ctx.fillText(suit, 0, -90);
        ctx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        this.textures[id] = tex;
        return tex;
    }

    createBackTexture() {
        if (this.textures['back']) return this.textures['back'];
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');

        // Red card back
        ctx.fillStyle = '#c0392b';
        this.roundRect(ctx, 0, 0, 512, 768, 40);
        ctx.fill();

        // Polka dot pattern
        ctx.fillStyle = '#e74c3c';
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 30; j++) {
                ctx.beginPath();
                ctx.arc(25 + i * 25, 25 + j * 25, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Brand text
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px Montserrat, sans-serif';
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
        if (this.textures[id]) return this.textures[id];
        
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const colors = { 10: '#fff', 50: '#e74c3c', 100: '#2c3e50', 500: '#f1c40f', 1000: '#9b59b6', 5000: '#1abc9c' };
        const baseColor = colors[value] || '#fff';

        // Outer circle
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(128, 128, 128, 0, Math.PI * 2);
        ctx.fill();

        // Edge notches
        ctx.fillStyle = '#fff';
        for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.translate(128, 128);
            ctx.rotate(i * (Math.PI / 4));
            ctx.fillRect(100, -15, 28, 30);
            ctx.restore();
        }

        // Inner circle
        ctx.beginPath();
        ctx.arc(128, 128, 90, 0, Math.PI * 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.fillStyle = baseColor;
        ctx.fill();

        // Value text
        ctx.fillStyle = (value === 500 || value === 10 || value === 5000) ? '#222' : '#fff';
        ctx.font = 'bold 70px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(value >= 1000 ? `${value/1000}K` : value, 128, 128);

        const tex = new THREE.CanvasTexture(canvas);
        this.textures[id] = tex;
        return tex;
    }

    createFeltTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        // Green felt
        ctx.fillStyle = '#216c46';
        ctx.fillRect(0, 0, 1024, 1024);
        
        // Subtle noise texture
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.1;
        for (let i = 0; i < 50000; i++) {
            ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 2, 2);
        }
        ctx.globalAlpha = 1.0;

        // Dealer arc
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(512, -200, 600, 0, Math.PI);
        ctx.stroke();

        // Table text
        ctx.font = 'bold 40px Montserrat, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.textAlign = 'center';
        ctx.fillText("BLACKJACK PAYS 3 TO 2", 512, 300);
        ctx.font = 'bold 30px Montserrat, sans-serif';
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

// --- 3D ENGINE ---
class BlackjackEngine {
    constructor(container) {
        this.container = container;
        this.assets = new AssetFactory();
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);
        this.scene.fog = new THREE.FogExp2(0x050505, 0.015);

        // Camera
        const isPortrait = container.clientHeight > container.clientWidth;
        this.camera = new THREE.PerspectiveCamera(
            isPortrait ? 60 : 50,
            container.clientWidth / container.clientHeight,
            0.1,
            100
        );
        this.camera.position.set(0, isPortrait ? 28 : 22, isPortrait ? 40 : 35);
        this.camera.lookAt(0, -2, 0);

        // Renderer
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.shadowMap.enabled = !isMobile;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Raycaster for interactions
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.setupLights();
        this.createEnvironment();

        // Groups for game elements
        this.dealerCardsGroup = new THREE.Group();
        this.player1CardsGroup = new THREE.Group();
        this.player2CardsGroup = new THREE.Group();
        this.chipsGroup = new THREE.Group();
        this.scene.add(this.dealerCardsGroup);
        this.scene.add(this.player1CardsGroup);
        this.scene.add(this.player2CardsGroup);
        this.scene.add(this.chipsGroup);

        // Dealer penguin
        this.dealerPenguin = null;
        this.dealerAnimCache = null;

        this.clock = new THREE.Clock();
        this.animationId = null;

        window.addEventListener('resize', this.handleResize);
        window.addEventListener('mousemove', this.handleMouseMove);

        this.animate();
    }

    setupLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Main directional light
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
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

        // Rim light for atmosphere
        const rim = new THREE.SpotLight(0x4444ff, 3.0);
        rim.position.set(-20, 15, -10);
        const rimTarget = new THREE.Object3D();
        rimTarget.position.set(0, 5, -22);
        this.scene.add(rimTarget);
        rim.target = rimTarget;
        this.scene.add(rim);
    }

    createEnvironment() {
        // Felt table
        const tableGeo = new THREE.PlaneGeometry(60, 40);
        const tableMat = new THREE.MeshStandardMaterial({
            map: this.assets.createFeltTexture(),
            roughness: 0.9,
            metalness: 0.1
        });
        const table = new THREE.Mesh(tableGeo, tableMat);
        table.rotation.x = -Math.PI / 2;
        table.receiveShadow = true;
        this.scene.add(table);

        // Wood rim
        const woodGeo = new THREE.BoxGeometry(62, 2, 42);
        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.4 });
        const rim = new THREE.Mesh(woodGeo, woodMat);
        rim.position.y = -1.01;
        rim.receiveShadow = true;
        this.scene.add(rim);
    }

    createDealerPenguin() {
        const group = new THREE.Group();
        
        try {
            const playerBuilder = createPlayerBuilder(THREE);
            const { buildPlayerMesh } = playerBuilder;
            
            // Dealer penguin appearance - professional casino dealer look
            const appearance = {
                color: 'black',
                hat: 'tophat',
                eyes: 'cool',
                mouth: 'beak',
                bodyItem: 'bowtie',
                mount: 'none',
                heldItem: 'none',
                characterType: null
            };
            
            const penguin = buildPlayerMesh(appearance);
            penguin.scale.set(2, 2, 2);
            penguin.name = 'dealer_penguin';
            group.add(penguin);
            
            // Cache animated parts
            this.dealerAnimCache = cacheAnimatedParts(penguin);
            group.userData.penguinMesh = penguin;
            
        } catch (e) {
            console.warn('Dealer penguin build failed, using fallback:', e);
            // Fallback: simple blue penguin shape
            const mat = new THREE.MeshStandardMaterial({ color: 0x3498db });
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 1, 8, 16), mat);
            body.position.y = 1;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), mat);
            head.position.y = 1.8;
            group.add(body, head);
        }
        
        group.position.set(0, 0.4, -22);
        this.scene.add(group);
        this.dealerPenguin = group;
        
        return group;
    }

    dealerEmote(type) {
        if (!this.dealerPenguin) return;
        
        const group = this.dealerPenguin;
        
        if (type === 'deal') {
            // Small dealing motion
            gsap.to(group.rotation, {
                y: -0.2,
                duration: 0.15,
                yoyo: true,
                repeat: 1
            });
        } else if (type === 'win') {
            // Dealer wins - happy jump
            gsap.to(group.position, {
                y: 2,
                duration: 0.15,
                yoyo: true,
                repeat: 3
            });
            gsap.to(group.rotation, {
                y: Math.PI * 2,
                duration: 0.6,
                ease: "power2.out"
            });
        } else if (type === 'lose') {
            // Dealer loses - head drop
            gsap.to(group.position, {
                y: -0.5,
                duration: 0.2
            });
            setTimeout(() => {
                gsap.to(group.position, { y: 0.4, duration: 0.3 });
            }, 1000);
        }
    }

    spawnCard(cardData, startPos, endPos, hidden = false, delay = 0) {
        const tex = hidden ? this.assets.createBackTexture() : this.assets.createCardTexture(cardData.suit, cardData.value);
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
        mesh.rotation.x = -Math.PI / 2;
        mesh.rotation.z = Math.PI;
        mesh.userData.cardData = cardData;
        mesh.userData.hidden = hidden;

        this.scene.add(mesh);

        const targetRotX = -Math.PI / 2;
        const targetRotZ = (Math.random() - 0.5) * 0.2;
        const targetRotY = hidden ? Math.PI : 0;

        gsap.to(mesh.position, {
            x: endPos.x,
            y: endPos.y,
            z: endPos.z,
            duration: 0.6,
            ease: "power2.out",
            delay
        });

        gsap.to(mesh.rotation, {
            x: targetRotX,
            y: targetRotY,
            z: targetRotZ,
            duration: 0.6,
            ease: "power2.out",
            delay,
            onStart: () => this.dealerEmote('deal')
        });

        return mesh;
    }

    revealCard(cardMesh, cardData) {
        if (!cardMesh || !cardData) return;
        
        // Create face texture
        const tex = this.assets.createCardTexture(cardData.suit, cardData.value);
        
        // Animate flip
        gsap.to(cardMesh.rotation, {
            y: 0,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => {
                // Update material
                cardMesh.material[4].map = tex;
                cardMesh.material[4].needsUpdate = true;
                cardMesh.userData.hidden = false;
            }
        });
    }

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

        this.chipsGroup.add(mesh);

        gsap.to(mesh.position, {
            y: pos.y,
            duration: 0.4,
            ease: "bounce.out"
        });

        return mesh;
    }

    clearCards() {
        // Animate cards flying away
        [this.dealerCardsGroup, this.player1CardsGroup, this.player2CardsGroup].forEach(group => {
            group.children.forEach(card => {
                gsap.to(card.position, {
                    z: -30,
                    y: 5,
                    duration: 0.5,
                    onComplete: () => group.remove(card)
                });
            });
        });
    }

    clearChips(winner) {
        const targetZ = winner === 'dealer' ? -25 : 30;
        this.chipsGroup.children.forEach(chip => {
            gsap.to(chip.position, {
                z: targetZ,
                y: 10,
                duration: 0.6,
                ease: "back.in",
                onComplete: () => this.chipsGroup.remove(chip)
            });
        });
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

        // Subtle camera parallax
        this.camera.position.x += (this.mouse.x * 2 - this.camera.position.x) * 0.05;
        
        // Make dealer look at mouse
        if (this.dealerPenguin) {
            // Subtle head tracking would go here if we had head bone access
        }
    }

    animate = () => {
        this.animationId = requestAnimationFrame(this.animate);

        const delta = this.clock.getDelta();

        // Animate dealer penguin
        if (this.dealerAnimCache) {
            animateCosmeticsFromCache(this.dealerAnimCache, delta);
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.handleResize);
        window.removeEventListener('mousemove', this.handleMouseMove);

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
const P2PBlackjack = ({ onMatchEnd }) => {
    const containerRef = useRef(null);
    const engineRef = useRef(null);
    const renderedCardsRef = useRef({ dealer: [], player1: [], player2: [] });
    const lastPhaseRef = useRef(null);
    
    const { activeMatch, matchState, playCard, forfeitMatch, clearMatch } = useChallenge();
    const { connected, playerId } = useMultiplayer();
    
    const [showDisconnected, setShowDisconnected] = useState(false);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const [message, setMessage] = useState('');
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
    const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
    
    // Update portrait orientation on resize
    useEffect(() => {
        const checkOrientation = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    // Initialize engine
    useEffect(() => {
        if (!containerRef.current || !activeMatch) return;
        
        const engine = new BlackjackEngine(containerRef.current);
        engineRef.current = engine;
        
        // Create dealer penguin
        engine.createDealerPenguin();
        
        // Spawn initial chips representing wager
        const wager = activeMatch.wagerAmount || 0;
        if (wager > 0) {
            const chipValues = [5000, 1000, 500, 100, 50, 10];
            let remaining = wager;
            let chipCount = 0;
            chipValues.forEach(val => {
                while (remaining >= val && chipCount < 20) {
                    const x = (Math.random() - 0.5) * 4;
                    const z = 8 + Math.random() * 2;
                    const y = 0.2 + chipCount * 0.45;
                    engine.spawnChip(val, { x, y, z });
                    remaining -= val;
                    chipCount++;
                }
            });
        }
        
        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, [activeMatch?.matchId]);

    // Render cards based on state
    useEffect(() => {
        if (!engineRef.current || !matchState) return;
        const engine = engineRef.current;
        
        const startPos = new THREE.Vector3(0, 5, -25);
        
        // Helper to render hand
        const renderHand = (hand, group, baseZ, existingCards, playerKey) => {
            if (!hand) return existingCards;
            
            hand.forEach((card, i) => {
                // Skip already rendered cards
                if (existingCards[i]) return;
                
                const offset = i * 2;
                const endPos = new THREE.Vector3(-2 + offset, 0.1 + i * 0.02, baseZ);
                const isHidden = card.hidden === true;
                
                const mesh = engine.spawnCard(card, startPos, endPos, isHidden, i * 0.3);
                group.add(mesh);
                existingCards[i] = { mesh, card };
            });
            
            return existingCards;
        };
        
        // Render all hands
        renderedCardsRef.current.dealer = renderHand(
            matchState.dealerHand,
            engine.dealerCardsGroup,
            -2,
            renderedCardsRef.current.dealer,
            'dealer'
        );
        
        // Determine which is "my" hand based on perspective
        const isPlayer1 = activeMatch?.yourRole === 'player1';
        const isComplete = matchState.phase === 'complete';
        
        // Get my hand and opponent info
        const myHand = matchState.myHand;
        // Opponent hand is hidden until game complete - show face-down cards based on count
        const opponentCardCount = matchState.opponentCardCount || 0;
        const opponentHand = isComplete && matchState.opponentHand 
            ? matchState.opponentHand 
            : Array(opponentCardCount).fill({ hidden: true, suit: '?', value: '?' });
        
        // Player 1 cards (left side)
        renderedCardsRef.current.player1 = renderHand(
            isPlayer1 ? myHand : opponentHand,
            engine.player1CardsGroup,
            12,
            renderedCardsRef.current.player1,
            'player1'
        );
        // Offset player1 cards to the left
        engine.player1CardsGroup.position.x = -10;
        
        // Player 2 cards (right side)
        renderedCardsRef.current.player2 = renderHand(
            isPlayer1 ? opponentHand : myHand,
            engine.player2CardsGroup,
            12,
            renderedCardsRef.current.player2,
            'player2'
        );
        // Offset player2 cards to the right
        engine.player2CardsGroup.position.x = 10;
        
        // When game completes, reveal opponent's hidden cards
        if (isComplete && lastPhaseRef.current !== 'complete') {
            const opponentCards = isPlayer1 ? renderedCardsRef.current.player2 : renderedCardsRef.current.player1;
            const revealHand = matchState.opponentHand;
            if (opponentCards && revealHand) {
                opponentCards.forEach((cardData, i) => {
                    if (cardData?.mesh?.userData?.hidden && revealHand[i]) {
                        engine.revealCard(cardData.mesh, revealHand[i]);
                    }
                });
            }
        }
        
        // Reveal dealer hole card when phase changes to dealerTurn or complete
        if ((matchState.phase === 'dealerTurn' || matchState.phase === 'complete') && lastPhaseRef.current !== matchState.phase) {
            const dealerCards = renderedCardsRef.current.dealer;
            if (dealerCards[0]?.mesh?.userData?.hidden && matchState.dealerHand?.[0]) {
                engine.revealCard(dealerCards[0].mesh, matchState.dealerHand[0]);
            }
        }
        
        // Handle game complete animations
        if (matchState.phase === 'complete' && lastPhaseRef.current !== 'complete') {
            // Dealer emote based on results
            if (matchState.dealerStatus === 'bust') {
                engine.dealerEmote('lose');
            } else {
                // Check if dealer beat both players
                const dealerWonBoth = matchState.player1Result === 'lose' && matchState.player2Result === 'lose';
                if (dealerWonBoth) {
                    engine.dealerEmote('win');
                }
            }
        }
        
        lastPhaseRef.current = matchState.phase;
        
    }, [matchState, activeMatch]);

    // Connection status
    useEffect(() => {
        if (!connected && activeMatch) {
            setShowDisconnected(true);
        } else {
            setShowDisconnected(false);
        }
    }, [connected, activeMatch]);

    // Show message helper
    const showMessage = useCallback((text) => {
        setMessage(text);
        if (text) {
            setTimeout(() => setMessage(''), 3000);
        }
    }, []);

    // Update message based on game state
    useEffect(() => {
        if (!matchState) return;
        
        if (matchState.phase === 'complete') {
            if (matchState.myResult === 'blackjack') {
                showMessage('BLACKJACK! 🎉');
            } else if (matchState.myResult === 'win') {
                showMessage('YOU WIN! 💰');
            } else if (matchState.myResult === 'push') {
                showMessage('PUSH 🤝');
            } else if (matchState.myStatus === 'bust') {
                showMessage('BUST! 💥');
            } else if (matchState.myResult === 'lose') {
                showMessage('DEALER WINS');
            }
        } else if (matchState.isMyTurn && matchState.canHit) {
            showMessage('YOUR TURN');
        }
    }, [matchState?.phase, matchState?.myResult, matchState?.isMyTurn, showMessage]);

    // Actions
    const handleHit = useCallback(() => {
        if (!matchState?.canHit) return;
        playCard({ action: 'hit' });
    }, [matchState?.canHit, playCard]);

    const handleStand = useCallback(() => {
        if (!matchState?.canStand) return;
        playCard({ action: 'stand' });
    }, [matchState?.canStand, playCard]);

    const handleDouble = useCallback(() => {
        if (!matchState?.canDouble) return;
        playCard({ action: 'double' });
    }, [matchState?.canDouble, playCard]);

    const handleForfeit = () => {
        if (confirm('Forfeit? You will lose the wager.')) forfeitMatch();
    };

    // Chat message handler
    const handleChatMessage = useCallback((msg) => {
        // Could show chat bubbles above players in 3D
    }, []);

    // === RENDER ===
    if (!activeMatch || !matchState) return null;

    const isPlayer1 = activeMatch.yourRole === 'player1';
    const isMyTurn = matchState.isMyTurn;
    const myPlayer = isPlayer1 ? activeMatch.player1 : activeMatch.player2;
    const opponent = isPlayer1 ? activeMatch.player2 : activeMatch.player1;
    const isComplete = matchState.phase === 'complete';
    const totalPot = activeMatch.wagerAmount * 2;
    
    // Determine P2P winner
    const didWin = matchState.winner === (isPlayer1 ? 'player1' : 'player2');
    const isDraw = matchState.winner === 'draw';
    
    // Token wager info
    const matchResult = activeMatch.matchResult;
    const tokenSettlement = matchResult?.tokenSettlement;
    const wagerToken = matchResult?.wagerToken || activeMatch?.wagerToken;
    const tokenWon = didWin && wagerToken ? (tokenSettlement?.amount || wagerToken.tokenAmount * 2) : 0;
    const tokenLost = !didWin && !isDraw && wagerToken ? wagerToken.tokenAmount : 0;
    const solscanLink = tokenSettlement?.txSignature ? getSolscanLink(tokenSettlement.txSignature) : null;

    return (
        <div className="fixed inset-0 z-40 select-none bg-black touch-none">
            {/* 3D Canvas */}
            <div ref={containerRef} className="absolute inset-0" />
            
            {/* HUD Header - Portrait responsive */}
            <div className={`absolute top-0 left-0 right-0 flex justify-between items-start pointer-events-none ${
                isMobile && isPortrait ? 'p-2 flex-col gap-2' : 'p-3 sm:p-6'
            }`}>
                {/* Brand */}
                <div className={`text-white/30 font-black tracking-wider ${
                    isMobile && isPortrait ? 'text-sm' : 'text-base sm:text-xl'
                }`}>
                    BLACKJACK
                </div>
                
                {/* Pot display */}
                <div 
                    className={`pointer-events-auto rounded-full flex flex-col items-end ${
                        isMobile && isPortrait ? 'px-3 py-1 self-end' : 'px-4 sm:px-6 py-2 sm:py-3'
                    }`}
                    style={{
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,215,0,0.3)',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                >
                    <span className={`text-gray-400 tracking-widest ${isMobile && isPortrait ? 'text-[9px]' : 'text-xs'}`}>POT</span>
                    <span className={`font-black text-yellow-400 ${isMobile && isPortrait ? 'text-base' : 'text-lg sm:text-2xl'}`}>${totalPot}</span>
                    {wagerToken && (
                        <span className={`text-cyan-400 ${isMobile && isPortrait ? 'text-xs' : 'text-sm'}`}>+{wagerToken.tokenAmount * 2} {wagerToken.tokenSymbol}</span>
                    )}
                </div>
            </div>

            {/* Game Message - Portrait responsive */}
            {message && (
                <div className={`absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none ${
                    isMobile && isPortrait ? 'top-[20%]' : 'top-1/4'
                }`}>
                    <div 
                        className={`rounded-2xl font-black text-gray-800 animate-in zoom-in-95 duration-300 ${
                            isMobile && isPortrait ? 'px-4 py-2 text-lg' : 'px-6 sm:px-8 py-3 sm:py-4 text-xl sm:text-3xl'
                        }`}
                        style={{
                            background: 'rgba(255,255,255,0.95)',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
                        }}
                    >
                        {message}
                    </div>
                </div>
            )}

            {/* Score displays - Portrait responsive */}
            <div className={`absolute z-10 pointer-events-none ${
                isMobile && isPortrait ? 'top-[30%] left-2' : 'top-1/3 left-3 sm:left-8'
            }`}>
                {/* Player 1 score */}
                <div 
                    className={`mb-2 sm:mb-4 rounded-xl ${matchState.phase === 'player1Turn' ? 'ring-2 ring-green-400' : ''} ${
                        isMobile && isPortrait ? 'p-1.5' : 'p-2 sm:p-3'
                    }`}
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                    <div className={`text-cyan-400 font-bold ${isMobile && isPortrait ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>
                        {isPlayer1 ? 'YOU' : (opponent?.name?.slice(0, 8) || 'P1')}
                    </div>
                    <div className={`font-black text-white ${isMobile && isPortrait ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                        {isPlayer1 ? matchState.myScore : matchState.opponentScore}
                    </div>
                    <div className={`text-gray-400 ${isMobile && isPortrait ? 'text-[8px]' : 'text-[10px] sm:text-xs'}`}>
                        {isPlayer1 ? matchState.myStatus : matchState.opponentStatus}
                    </div>
                </div>
            </div>
            
            <div className={`absolute z-10 pointer-events-none ${
                isMobile && isPortrait ? 'top-[30%] right-2' : 'top-1/3 right-3 sm:right-8'
            }`}>
                {/* Player 2 score */}
                <div 
                    className={`mb-2 sm:mb-4 rounded-xl ${matchState.phase === 'player2Turn' ? 'ring-2 ring-green-400' : ''} ${
                        isMobile && isPortrait ? 'p-1.5' : 'p-2 sm:p-3'
                    }`}
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                    <div className={`text-pink-400 font-bold ${isMobile && isPortrait ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>
                        {!isPlayer1 ? 'YOU' : (opponent?.name?.slice(0, 8) || 'P2')}
                    </div>
                    <div className={`font-black text-white ${isMobile && isPortrait ? 'text-lg' : 'text-xl sm:text-2xl'}`}>
                        {!isPlayer1 ? matchState.myScore : matchState.opponentScore}
                    </div>
                    <div className={`text-gray-400 ${isMobile && isPortrait ? 'text-[8px]' : 'text-[10px] sm:text-xs'}`}>
                        {!isPlayer1 ? matchState.myStatus : matchState.opponentStatus}
                    </div>
                </div>
            </div>

            {/* Dealer score - Portrait responsive */}
            <div className={`absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none ${
                isMobile && isPortrait ? 'top-14' : 'top-16 sm:top-20'
            }`}>
                <div 
                    className={`rounded-xl ${matchState.phase === 'dealerTurn' ? 'ring-2 ring-yellow-400 animate-pulse' : ''} ${
                        isMobile && isPortrait ? 'p-1.5' : 'p-2 sm:p-3'
                    }`}
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                >
                    <div className={`text-yellow-400 font-bold text-center ${isMobile && isPortrait ? 'text-[9px]' : 'text-[10px] sm:text-xs'}`}>DEALER</div>
                    <div className={`font-black text-white text-center ${isMobile && isPortrait ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>
                        {matchState.dealerScore || '?'}
                    </div>
                    <div className={`text-gray-400 text-center ${isMobile && isPortrait ? 'text-[8px]' : 'text-[10px] sm:text-xs'}`}>
                        {matchState.dealerStatus}
                    </div>
                </div>
            </div>

            {/* Turn indicator - Portrait responsive */}
            <div className={`absolute left-1/2 -translate-x-1/2 z-10 ${
                isMobile && isPortrait ? 'top-1' : 'top-3 sm:top-4'
            }`}>
                <div 
                    className={`rounded-full flex items-center gap-1 sm:gap-2 ${isMyTurn ? 'ring-2 ring-green-400 animate-pulse' : ''} ${
                        isMobile && isPortrait ? 'px-2 py-1' : 'px-3 sm:px-4 py-1.5 sm:py-2'
                    }`}
                    style={{ background: 'rgba(0,0,0,0.8)' }}
                >
                    <div className={`rounded-full ${isMyTurn ? 'bg-green-400' : 'bg-gray-500'} ${
                        isMobile && isPortrait ? 'w-1.5 h-1.5' : 'w-2 h-2'
                    }`} />
                    <span className={`text-white font-bold ${isMobile && isPortrait ? 'text-[10px]' : 'text-xs sm:text-sm'}`}>
                        {isMyTurn ? 'YOUR TURN' : matchState.phase === 'dealerTurn' ? 'DEALER' : 'WAITING'}
                    </span>
                    {matchState.timeRemaining && (
                        <span className={`${matchState.timeRemaining <= 10 ? 'text-red-400 animate-pulse' : 'text-gray-400'} ${
                            isMobile && isPortrait ? 'text-[9px]' : 'text-[10px] sm:text-xs'
                        }`}>
                            {matchState.timeRemaining}s
                        </span>
                    )}
                </div>
            </div>

            {/* Disconnection warning */}
            {showDisconnected && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <div className="bg-red-900/95 border-2 border-red-500 rounded-xl px-6 py-4 text-center animate-pulse">
                        <div className="text-red-400 text-lg font-bold mb-1">⚠️ Connection Lost</div>
                        <div className="text-white text-sm">Reconnecting...</div>
                    </div>
                </div>
            )}

            {/* Action buttons - Portrait responsive */}
            <div 
                className={`absolute bottom-0 left-0 right-0 flex justify-center ${
                    isMobile && isPortrait ? 'p-3 pb-6 gap-2' : 'p-4 sm:p-10 gap-2 sm:gap-5'
                }`}
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}
            >
                <button
                    onClick={handleHit}
                    disabled={!matchState.canHit || !connected}
                    className={`rounded-xl font-black uppercase tracking-wider transition-all ${
                        matchState.canHit && connected
                            ? 'bg-green-500 text-white shadow-lg hover:-translate-y-1 active:scale-95'
                            : 'bg-gray-700 text-gray-500 opacity-50'
                    } ${isMobile && isPortrait ? 'px-5 py-2.5 text-sm' : 'px-5 sm:px-10 py-2.5 sm:py-4 text-sm sm:text-lg'}`}
                    style={{ boxShadow: matchState.canHit ? '0 10px 20px rgba(0,0,0,0.3)' : 'none' }}
                >
                    Hit
                </button>
                
                <button
                    onClick={handleStand}
                    disabled={!matchState.canStand || !connected}
                    className={`rounded-xl font-black uppercase tracking-wider transition-all ${
                        matchState.canStand && connected
                            ? 'bg-red-500 text-white shadow-lg hover:-translate-y-1 active:scale-95'
                            : 'bg-gray-700 text-gray-500 opacity-50'
                    } ${isMobile && isPortrait ? 'px-4 py-2.5 text-sm' : 'px-5 sm:px-10 py-2.5 sm:py-4 text-sm sm:text-lg'}`}
                    style={{ boxShadow: matchState.canStand ? '0 10px 20px rgba(0,0,0,0.3)' : 'none' }}
                >
                    Stand
                </button>
                
                <button
                    onClick={handleDouble}
                    disabled={!matchState.canDouble || !connected}
                    className={`rounded-xl font-black uppercase tracking-wider transition-all ${
                        matchState.canDouble && connected
                            ? 'bg-orange-500 text-white shadow-lg hover:-translate-y-1 active:scale-95'
                            : 'bg-gray-700 text-gray-500 opacity-50'
                    } ${isMobile && isPortrait ? 'px-3 py-2.5 text-sm' : 'px-5 sm:px-10 py-2.5 sm:py-4 text-sm sm:text-lg'}`}
                    style={{ boxShadow: matchState.canDouble ? '0 10px 20px rgba(0,0,0,0.3)' : 'none' }}
                >
                    {isMobile && isPortrait ? '2X' : 'Double'}
                </button>
            </div>

            {/* Forfeit button - Portrait responsive */}
            <div className={`absolute z-10 ${isMobile && isPortrait ? 'bottom-2 left-2' : 'bottom-3 sm:bottom-4 left-3 sm:left-4'}`}>
                <button 
                    onClick={handleForfeit}
                    className={`bg-red-600/80 hover:bg-red-600 active:bg-red-500 text-white rounded-lg font-bold transition-colors ${
                        isMobile && isPortrait ? 'px-2 py-1 text-[10px]' : 'px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs'
                    }`}
                >
                    Forfeit
                </button>
            </div>

            {/* Game Over Modal - Portrait responsive */}
            {isComplete && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 animate-in fade-in duration-500 p-4">
                    <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl text-center border border-white/10 shadow-2xl ${
                        isMobile && isPortrait ? 'p-4 max-w-[90vw]' : 'p-6 sm:p-8 max-w-sm'
                    }`}>
                        <div className={`mb-3 sm:mb-4 ${isMobile && isPortrait ? 'text-4xl' : 'text-5xl sm:text-6xl'}`}>
                            {isDraw ? '🤝' : didWin ? '🏆' : '💸'}
                        </div>
                        <h2 className={`font-black text-white mb-2 ${isMobile && isPortrait ? 'text-2xl' : 'text-2xl sm:text-3xl'}`}>
                            {isDraw ? 'DRAW!' : didWin ? 'VICTORY!' : 'DEFEAT'}
                        </h2>
                        <p className={`text-gray-400 mb-1 sm:mb-2 ${isMobile && isPortrait ? 'text-xs' : 'text-sm'}`}>
                            Your hand: {matchState.myScore} ({matchState.myResult})
                        </p>
                        <p className={`text-gray-400 mb-3 sm:mb-4 ${isMobile && isPortrait ? 'text-xs' : 'text-sm'}`}>
                            Dealer: {matchState.dealerScore} ({matchState.dealerStatus})
                        </p>
                        
                        <div className={`font-bold mb-2 ${isDraw ? 'text-gray-400' : didWin ? 'text-green-400' : 'text-red-400'} ${
                            isMobile && isPortrait ? 'text-lg' : 'text-xl sm:text-2xl'
                        }`}>
                            {isDraw ? 'Wager returned' : didWin ? `+${totalPot}` : `-${activeMatch.wagerAmount}`} 💰
                        </div>
                        
                        {wagerToken && (
                            <div className={`font-bold mb-3 sm:mb-4 ${isDraw ? 'text-gray-400' : didWin ? 'text-cyan-400' : 'text-red-400'} ${
                                isMobile && isPortrait ? 'text-base' : 'text-lg sm:text-xl'
                            }`}>
                                {isDraw 
                                    ? `${wagerToken.tokenAmount} ${wagerToken.tokenSymbol} returned`
                                    : didWin 
                                        ? `+${tokenWon} ${tokenSettlement?.tokenSymbol || wagerToken.tokenSymbol}` 
                                        : `-${tokenLost} ${wagerToken.tokenSymbol}`
                                } 💎
                            </div>
                        )}
                        
                        {solscanLink && (
                            <a href={solscanLink} target="_blank" rel="noopener noreferrer"
                               className={`text-cyan-400 underline mb-3 sm:mb-4 block ${isMobile && isPortrait ? 'text-xs' : 'text-sm'}`}>
                                View on Solscan ↗
                            </a>
                        )}
                        
                        <button 
                            onClick={() => { clearMatch(); onMatchEnd?.(); }}
                            className={`w-full rounded-xl font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:scale-105 active:scale-95 transition-all ${
                                isMobile && isPortrait ? 'py-2.5 text-sm' : 'py-2.5 sm:py-3 text-sm sm:text-base'
                            }`}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}

            {/* Chat */}
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

export default P2PBlackjack;

