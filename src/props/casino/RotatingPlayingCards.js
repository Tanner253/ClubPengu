/**
 * RotatingPlayingCards - Giant animated playing cards floating and spinning
 * Creates a mesmerizing display of the four aces rotating in 3D space
 */

import BaseProp from '../BaseProp';

class RotatingPlayingCards extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.cards = [];
        this.cardTextures = [];
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'rotating_playing_cards';
        
        const {
            cardWidth = 2,
            cardHeight = 3,
            orbitRadius = 3,
            cardCount = 4
        } = options;
        
        // Card suits and colors
        const suits = [
            { symbol: '♠', color: '#000000', name: 'spade' },
            { symbol: '♥', color: '#FF0000', name: 'heart' },
            { symbol: '♦', color: '#FF0000', name: 'diamond' },
            { symbol: '♣', color: '#000000', name: 'club' }
        ];
        
        // Create each card
        suits.forEach((suit, idx) => {
            const cardGroup = new THREE.Group();
            
            // Create card texture
            const cardCanvas = document.createElement('canvas');
            cardCanvas.width = 256;
            cardCanvas.height = 384;
            const ctx = cardCanvas.getContext('2d');
            
            // Draw card
            this.drawCard(ctx, cardCanvas.width, cardCanvas.height, suit, 'A');
            
            const cardTexture = new THREE.CanvasTexture(cardCanvas);
            cardTexture.needsUpdate = true;
            this.cardTextures.push(cardTexture);
            
            // Front face
            const frontMat = new THREE.MeshStandardMaterial({
                map: cardTexture,
                roughness: 0.4,
                metalness: 0.1
            });
            this.materials.push(frontMat);
            
            // Back face (ornate design)
            const backCanvas = document.createElement('canvas');
            backCanvas.width = 256;
            backCanvas.height = 384;
            const backCtx = backCanvas.getContext('2d');
            this.drawCardBack(backCtx, backCanvas.width, backCanvas.height);
            
            const backTexture = new THREE.CanvasTexture(backCanvas);
            backTexture.needsUpdate = true;
            
            const backMat = new THREE.MeshStandardMaterial({
                map: backTexture,
                roughness: 0.4,
                metalness: 0.1
            });
            this.materials.push(backMat);
            
            // Create card geometry (two-sided)
            const cardGeo = new THREE.PlaneGeometry(cardWidth, cardHeight);
            
            // Front
            const cardFront = new THREE.Mesh(cardGeo, frontMat);
            cardFront.position.z = 0.02;
            cardGroup.add(cardFront);
            
            // Back
            const cardBack = new THREE.Mesh(cardGeo, backMat);
            cardBack.rotation.y = Math.PI;
            cardBack.position.z = -0.02;
            cardGroup.add(cardBack);
            
            // Card edge
            const edgeMat = this.createMaterial({
                color: 0xFFFFFF,
                roughness: 0.8
            });
            const edgeGeo = new THREE.BoxGeometry(cardWidth, cardHeight, 0.04);
            const edge = new THREE.Mesh(edgeGeo, edgeMat);
            cardGroup.add(edge);
            
            // Position in orbit
            const angle = (idx / cardCount) * Math.PI * 2;
            cardGroup.userData.cardIndex = idx;
            cardGroup.userData.orbitAngle = angle;
            cardGroup.userData.orbitRadius = orbitRadius;
            cardGroup.userData.baseY = 0;
            
            cardGroup.position.set(
                Math.cos(angle) * orbitRadius,
                0,
                Math.sin(angle) * orbitRadius
            );
            
            this.cards.push(cardGroup);
            group.add(cardGroup);
            this.geometries.push(cardGeo, edgeGeo);
        });
        
        // Add central glow sphere
        const glowMat = this.createMaterial({
            color: 0xFFD700,
            emissive: 0xFFD700,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.6
        });
        const glowGeo = new THREE.SphereGeometry(0.8, 16, 16);
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.userData.isCentralGlow = true;
        this.addMesh(glow, group);
        
        // Add sparkle particles around the cards
        this.createSparkles(group, orbitRadius);
        
        // Add point light - skip on Apple/Mobile for performance
        const needsOptimization = typeof window !== 'undefined' && (window._isAppleDevice || window._isMobileGPU);
        if (!needsOptimization) {
            const cardLight = new THREE.PointLight(0xFFD700, 1.5, 15);
            this.addLight(cardLight, group);
        }
        
        this.setPosition(x, y, z);
        return this;
    }
    
    drawCard(ctx, W, H, suit, value) {
        // White background with rounded corners effect
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, W, H);
        
        // Border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeRect(5, 5, W - 10, H - 10);
        
        // Inner border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 12, W - 24, H - 24);
        
        ctx.fillStyle = suit.color;
        ctx.font = 'bold 48px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Top left value
        ctx.fillText(value, 20, 20);
        ctx.font = '36px Arial';
        ctx.fillText(suit.symbol, 22, 65);
        
        // Bottom right (inverted)
        ctx.save();
        ctx.translate(W, H);
        ctx.rotate(Math.PI);
        ctx.font = 'bold 48px Georgia, serif';
        ctx.fillText(value, 20, 20);
        ctx.font = '36px Arial';
        ctx.fillText(suit.symbol, 22, 65);
        ctx.restore();
        
        // Large center symbol
        ctx.font = '140px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Gold shadow for center symbol
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;
        ctx.fillText(suit.symbol, W / 2, H / 2);
        ctx.shadowBlur = 0;
    }
    
    drawCardBack(ctx, W, H) {
        // Deep purple background
        const gradient = ctx.createLinearGradient(0, 0, W, H);
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(0.5, '#2a1a4e');
        gradient.addColorStop(1, '#1a0a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);
        
        // Gold border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 8;
        ctx.strokeRect(8, 8, W - 16, H - 16);
        
        // Inner pattern
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        
        // Diamond pattern
        const spacing = 30;
        ctx.beginPath();
        for (let dx = -W; dx < W * 2; dx += spacing) {
            ctx.moveTo(dx, 0);
            ctx.lineTo(dx + H, H);
            ctx.moveTo(dx + H, 0);
            ctx.lineTo(dx, H);
        }
        ctx.stroke();
        
        // Center medallion
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 50, 0, Math.PI * 2);
        ctx.fillStyle = '#1a0a2e';
        ctx.fill();
        
        // Casino star in center
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', W / 2, H / 2);
    }
    
    createSparkles(group, radius) {
        const THREE = this.THREE;
        const sparkleCount = 30;
        
        for (let i = 0; i < sparkleCount; i++) {
            const sparkleMat = this.createMaterial({
                color: 0xFFFFFF,
                emissive: 0xFFFFFF,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.8
            });
            
            const sparkleGeo = new THREE.SphereGeometry(0.05, 4, 4);
            const sparkle = new THREE.Mesh(sparkleGeo, sparkleMat);
            
            // Random position in a sphere around the cards
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const r = radius * 0.5 + Math.random() * radius;
            
            sparkle.position.set(
                Math.sin(phi) * Math.cos(theta) * r,
                Math.cos(phi) * r * 0.5,
                Math.sin(phi) * Math.sin(theta) * r
            );
            
            sparkle.userData.sparkleIndex = i;
            sparkle.userData.basePos = sparkle.position.clone();
            sparkle.userData.speed = 0.5 + Math.random() * 1.5;
            sparkle.userData.phase = Math.random() * Math.PI * 2;
            
            this.addMesh(sparkle, group);
        }
    }
    
    update(time, delta) {
        // Rotate cards in orbit
        this.cards.forEach((card) => {
            const idx = card.userData.cardIndex;
            const radius = card.userData.orbitRadius;
            
            // Orbit around Y axis
            const orbitSpeed = 0.3;
            const angle = card.userData.orbitAngle + time * orbitSpeed;
            
            card.position.x = Math.cos(angle) * radius;
            card.position.z = Math.sin(angle) * radius;
            
            // Vertical bobbing
            card.position.y = card.userData.baseY + Math.sin(time * 2 + idx * Math.PI / 2) * 0.5;
            
            // Card rotation (face always toward center with spin)
            card.rotation.y = -angle + Math.PI / 2 + Math.sin(time * 1.5 + idx) * 0.3;
            
            // Tilt
            card.rotation.x = Math.sin(time * 1.2 + idx * 0.8) * 0.15;
            card.rotation.z = Math.cos(time * 0.9 + idx * 0.6) * 0.1;
        });
        
        // Update sparkles
        this.meshes.forEach(mesh => {
            if (mesh.userData.sparkleIndex !== undefined) {
                const idx = mesh.userData.sparkleIndex;
                const basePos = mesh.userData.basePos;
                const speed = mesh.userData.speed;
                const phase = mesh.userData.phase;
                
                // Floating motion
                mesh.position.y = basePos.y + Math.sin(time * speed + phase) * 0.3;
                
                // Twinkle effect
                const twinkle = Math.sin(time * 8 + idx * 0.5) * 0.5 + 0.5;
                mesh.material.opacity = 0.3 + twinkle * 0.7;
                mesh.scale.setScalar(0.5 + twinkle * 0.5);
                
                // Color shift
                const hue = (time * 0.1 + idx * 0.03) % 1;
                mesh.material.emissive.setHSL(hue, 0.5, 0.7);
            }
            
            // Central glow animation
            if (mesh.userData.isCentralGlow) {
                const pulse = Math.sin(time * 3) * 0.5 + 0.5;
                mesh.material.emissiveIntensity = 0.5 + pulse * 0.5;
                mesh.material.opacity = 0.4 + pulse * 0.3;
                mesh.scale.setScalar(1 + pulse * 0.2);
                mesh.rotation.y = time * 0.5;
            }
        });
    }
}

export default RotatingPlayingCards;

