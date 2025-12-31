/**
 * Pet - Pet companion class
 * Follows the player, has moods, and can be interacted with
 */
class Pet {
    // Pet colors with tiered pricing (cheapest = 50, scaling up for rarer colors)
    static COLORS = {
        // Common tier - $50
        blue: { hex: '#0055FF', name: 'Blue', personality: 'Playful', price: 50, tier: 'common' },
        red: { hex: '#FF2222', name: 'Red', personality: 'Adventurous', price: 50, tier: 'common' },
        green: { hex: '#22CC44', name: 'Green', personality: 'Energetic', price: 50, tier: 'common' },
        
        // Uncommon tier - $100
        pink: { hex: '#FF69B4', name: 'Pink', personality: 'Friendly', price: 100, tier: 'uncommon' },
        yellow: { hex: '#FFDD00', name: 'Yellow', personality: 'Creative', price: 100, tier: 'uncommon' },
        orange: { hex: '#FF8800', name: 'Orange', personality: 'Silly', price: 100, tier: 'uncommon' },
        
        // Rare tier - $200
        purple: { hex: '#9944FF', name: 'Purple', personality: 'Fashionable', price: 200, tier: 'rare' },
        white: { hex: '#EEEEEE', name: 'White', personality: 'Calm', price: 200, tier: 'rare' },
        brown: { hex: '#8B4513', name: 'Brown', personality: 'Tough', price: 200, tier: 'rare' },
        
        // Epic tier - $500
        black: { hex: '#222222', name: 'Black', personality: 'Mysterious', price: 500, tier: 'epic' },
        gold: { hex: '#FFD700', name: 'Gold', personality: 'Glamorous', price: 500, tier: 'epic' },
        
        // Legendary tier - $1000 (special effects)
        rainbow: { hex: '#FF0000', name: 'Rainbow', personality: 'Magical', price: 1000, tier: 'legendary', special: 'rainbow' },
        ghost: { hex: '#AADDFF', name: 'Ghost', personality: 'Spooky', price: 1000, tier: 'legendary', special: 'glow' }
    };
    
    static TIER_COLORS = {
        common: '#888888',
        uncommon: '#44CC44',
        rare: '#4488FF',
        epic: '#AA44FF',
        legendary: '#FFAA00'
    };
    
    constructor(config = {}) {
        this.id = config.id || Math.random().toString(36).substr(2, 9);
        this.name = config.name || 'Pet';
        this.color = config.color || 'blue';
        this.ownerId = config.ownerId || null;
        
        // Stats (0-100)
        this.happiness = config.happiness || 80;
        this.energy = config.energy || 100;
        this.hunger = config.hunger || 20;
        
        // Position & Movement
        this.position = { x: config.x || 0, y: 0, z: config.z || 0 };
        this.targetPosition = null;
        this.followDistance = 2; // How far behind player
        
        // State
        this.state = 'idle'; // idle, following, playing, sleeping, eating
        this.mood = 'happy'; // happy, neutral, sad, excited, tired
        
        // Animation
        this.bounceOffset = Math.random() * Math.PI * 2;
        this.targetRotation = 0;
        this.lastStatUpdate = Date.now();
        
        // 3D Mesh reference
        this.mesh = null;
    }
    
    // Called each frame to update hunger/energy decay
    tick() {
        const now = Date.now();
        const deltaSeconds = (now - this.lastStatUpdate) / 1000;
        this.lastStatUpdate = now;
        
        // Only decay every second or so to avoid micro-updates
        if (deltaSeconds > 0.5) {
            // Hunger increases over time (puffle gets hungry)
            this.hunger = Math.min(100, this.hunger + deltaSeconds * 0.05);
            
            // Energy decreases slowly when not sleeping
            if (this.state !== 'sleeping') {
                this.energy = Math.max(0, this.energy - deltaSeconds * 0.02);
            }
            
            // Happiness affected by hunger and energy
            if (this.hunger > 70) {
                this.happiness = Math.max(0, this.happiness - deltaSeconds * 0.1);
            }
            if (this.energy < 30) {
                this.happiness = Math.max(0, this.happiness - deltaSeconds * 0.05);
            }
            
            this.updateMood();
        }
    }
    
    // --- STATS MANAGEMENT ---
    updateStats(deltaTime) {
        // Decay over time
        this.hunger = Math.min(100, this.hunger + deltaTime * 0.1);
        this.energy = Math.max(0, this.energy - deltaTime * 0.05);
        
        // Happiness affected by other stats
        if (this.hunger > 70) {
            this.happiness = Math.max(0, this.happiness - deltaTime * 0.2);
        }
        if (this.energy < 30) {
            this.happiness = Math.max(0, this.happiness - deltaTime * 0.1);
        }
        
        // Update mood
        this.updateMood();
    }
    
    updateMood() {
        if (this.happiness > 80 && this.energy > 50) {
            this.mood = 'excited';
        } else if (this.happiness > 60) {
            this.mood = 'happy';
        } else if (this.happiness > 40) {
            this.mood = 'neutral';
        } else if (this.energy < 20) {
            this.mood = 'tired';
        } else {
            this.mood = 'sad';
        }
    }
    
    // --- ACTIONS ---
    feed() {
        this.hunger = Math.max(0, this.hunger - 30);
        this.happiness = Math.min(100, this.happiness + 10);
        this.state = 'eating';
        
        setTimeout(() => {
            if (this.state === 'eating') this.state = 'idle';
        }, 2000);
        
        return { hunger: this.hunger, happiness: this.happiness };
    }
    
    play() {
        if (this.energy < 20) return false;
        
        this.energy = Math.max(0, this.energy - 20);
        this.happiness = Math.min(100, this.happiness + 20);
        this.hunger = Math.min(100, this.hunger + 10);
        this.state = 'playing';
        
        setTimeout(() => {
            if (this.state === 'playing') this.state = 'idle';
        }, 3000);
        
        return true;
    }
    
    rest() {
        this.state = 'sleeping';
        this.energy = Math.min(100, this.energy + 50);
        
        setTimeout(() => {
            if (this.state === 'sleeping') this.state = 'idle';
        }, 5000);
    }
    
    pet() {
        this.happiness = Math.min(100, this.happiness + 5);
        return this.happiness;
    }
    
    // --- MOVEMENT (Snake-tail behavior) ---
    // The puffle follows the owner like a snake tail follows the head
    // It faces the direction of its OWN travel, not the owner's direction
    followOwner(ownerPos, deltaTime) {
        // Store previous position to calculate actual movement direction
        const prevX = this.position.x;
        const prevZ = this.position.z;
        
        // Get owner Y position (default to 0 for backwards compatibility)
        const ownerY = ownerPos.y || 0;
        
        // Calculate Y difference - if owner is much higher/lower, teleport puffle
        const yDiff = Math.abs(ownerY - this.position.y);
        if (yDiff > 2) {
            // Owner is on a different elevation - teleport puffle to owner's level
            this.position.y = ownerY;
            // Also teleport XZ to be close to owner
            this.position.x = ownerPos.x - 1.5;
            this.position.z = ownerPos.z - 1.5;
            if (this.mesh) {
                this.mesh.position.x = this.position.x;
                this.mesh.position.y = ownerY + 0.5; // Pet base height
                this.mesh.position.z = this.position.z;
            }
            return;
        }
        
        const dx = ownerPos.x - this.position.x;
        const dz = ownerPos.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Only follow if owner is beyond follow distance (snake-tail behavior)
        if (distance > this.followDistance) {
            this.state = 'following';
            
            // Calculate how far we need to move to maintain follow distance
            const targetDistance = distance - this.followDistance;
            
            // Smooth follow speed - faster when further, slower when closer
            const speed = Math.min(targetDistance * 3, 12) * deltaTime;
            
            // Move towards owner (along the line connecting puffle to owner)
            if (distance > 0.01) {
                const moveX = (dx / distance) * speed;
                const moveZ = (dz / distance) * speed;
                
                this.position.x += moveX;
                this.position.z += moveZ;
            }
            
            // Smoothly interpolate Y position to match owner
            this.position.y += (ownerY - this.position.y) * 0.1;
            
            // Calculate actual movement that occurred
            const actualMoveX = this.position.x - prevX;
            const actualMoveZ = this.position.z - prevZ;
            const actualMoveDist = Math.sqrt(actualMoveX * actualMoveX + actualMoveZ * actualMoveZ);
            
            // Face the direction of ACTUAL movement (snake-tail behavior)
            // The puffle faces where it's going, not where the owner is
            if (actualMoveDist > 0.001) {
                this.targetRotation = Math.atan2(actualMoveX, actualMoveZ);
            }
            
            // Update mesh position
            if (this.mesh) {
                this.mesh.position.x = this.position.x;
                this.mesh.position.y = this.position.y + 0.5; // Pet base height offset
                this.mesh.position.z = this.position.z;
            }
        } else {
            if (this.state === 'following') {
                this.state = 'idle';
            }
            // Still update Y position when idle
            this.position.y += (ownerY - this.position.y) * 0.1;
            if (this.mesh) {
                this.mesh.position.y = this.position.y + 0.5;
            }
        }
    }
    
    // Alias for backwards compatibility
    followPlayer(ownerPos, deltaTime) {
        this.followOwner(ownerPos, deltaTime);
    }
    
    // --- ANIMATION ---
    animate(time) {
        if (!this.mesh) return;
        
        const baseScale = 0.6; // Match createMesh scale
        
        // Slower, smoother bouncing (reduced speed significantly)
        const bounceSpeed = this.state === 'following' ? 4 : 1.5;
        const bounceHeight = this.state === 'following' ? 0.15 : 0.05;
        
        // Smooth sine wave bounce - add to current Y position (which includes elevation)
        const bounce = Math.abs(Math.sin(time * bounceSpeed + this.bounceOffset));
        const baseY = (this.position.y || 0) + 0.35;
        this.mesh.position.y = baseY + bounce * bounceHeight;
        
        // Subtle squash and stretch
        const squashAmount = this.state === 'following' ? 0.08 : 0.03;
        const squash = 1 + Math.sin(time * bounceSpeed * 2 + this.bounceOffset) * squashAmount;
        this.mesh.scale.set(baseScale * squash, baseScale / squash, baseScale * squash);
        
        // Smoothly rotate towards movement direction (snake-tail effect)
        // The puffle smoothly turns to face its travel direction
        if (this.targetRotation !== undefined && this.mesh.rotation) {
            const currentY = this.mesh.rotation.y;
            let diff = this.targetRotation - currentY;
            // Normalize angle to -PI to PI
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            // Smooth interpolation - like a snake tail following the curve
            this.mesh.rotation.y += diff * 0.15;
        }
        
        // State-specific animations (use baseY for elevation support)
        if (this.state === 'sleeping') {
            this.mesh.rotation.z = Math.sin(time * 0.5) * 0.1;
            this.mesh.position.y = baseY - 0.15;
            this.mesh.scale.set(baseScale * 1.1, baseScale * 0.7, baseScale * 1.1);
        } else if (this.state === 'playing') {
            this.mesh.rotation.y += 0.15;
            this.mesh.position.y = baseY + 0.05 + Math.abs(Math.sin(time * 5)) * 0.3;
            const playSquash = 1 + Math.sin(time * 5) * 0.1;
            this.mesh.scale.set(baseScale * playSquash, baseScale / playSquash, baseScale * playSquash);
        } else if (this.state === 'eating') {
            this.mesh.position.y = baseY - 0.05 + Math.sin(time * 4) * 0.05;
            this.mesh.rotation.z = Math.sin(time * 6) * 0.1;
        } else {
            this.mesh.rotation.z = 0;
        }
        
        // Special effects for legendary puffles
        if (this.mesh.userData.special === 'rainbow') {
            // Cycle through rainbow colors
            const hue = (time * 0.3) % 1;
            const rainbowColor = new (window.THREE || THREE).Color().setHSL(hue, 1, 0.5);
            this.mesh.traverse(child => {
                if (child.isMesh && child.material && child.name !== 'eye' && !child.name.includes('pupil')) {
                    child.material.color = rainbowColor;
                }
            });
        } else if (this.mesh.userData.special === 'glow') {
            // Pulsing glow effect
            const glowIntensity = 0.2 + Math.sin(time * 2) * 0.15;
            const body = this.mesh.getObjectByName('body');
            if (body && body.material) {
                body.material.emissiveIntensity = glowIntensity;
            }
        }
    }
    
    // --- MESH CREATION ---
    createMesh(THREE) {
        const colorData = Pet.COLORS[this.color] || Pet.COLORS.blue;
        const baseColor = new THREE.Color(colorData.hex);
        const darkerColor = baseColor.clone().multiplyScalar(0.7);
        const isSpecial = colorData.special;
        
        const group = new THREE.Group();
        group.userData.special = isSpecial;
        group.userData.colorData = colorData;
        
        // Main fluffy body (slightly squashed sphere)
        const bodyGeo = new THREE.SphereGeometry(0.5, 24, 18);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: colorData.hex,
            roughness: isSpecial === 'glow' ? 0.3 : 0.9,
            metalness: isSpecial === 'glow' ? 0.2 : 0,
            emissive: isSpecial === 'glow' ? colorData.hex : 0x000000,
            emissiveIntensity: isSpecial === 'glow' ? 0.3 : 0,
            transparent: isSpecial === 'glow',
            opacity: isSpecial === 'glow' ? 0.85 : 1
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.scale.set(1, 0.85, 1);
        body.castShadow = true;
        body.name = 'body';
        group.add(body);
        
        // Fluffy fur tufts around body
        const tuftMat = new THREE.MeshStandardMaterial({ 
            color: colorData.hex, 
            roughness: 0.95,
            emissive: isSpecial === 'glow' ? colorData.hex : 0x000000,
            emissiveIntensity: isSpecial === 'glow' ? 0.2 : 0
        });
        
        // Hair tuft on top (multiple spikes)
        const hairGroup = new THREE.Group();
        hairGroup.name = 'hair';
        const hairCount = 7;
        for (let i = 0; i < hairCount; i++) {
            const angle = (i / hairCount) * Math.PI * 2;
            const isCenter = i === 0;
            const height = isCenter ? 0.35 : 0.25 + Math.random() * 0.1;
            const radius = isCenter ? 0.08 : 0.06;
            
            const tuftGeo = new THREE.ConeGeometry(radius, height, 6);
            const tuft = new THREE.Mesh(tuftGeo, tuftMat.clone());
            tuft.name = `tuft_${i}`;
            
            if (isCenter) {
                tuft.position.set(0, 0.45, 0);
            } else {
                const spread = 0.12;
                tuft.position.set(
                    Math.cos(angle) * spread,
                    0.4,
                    Math.sin(angle) * spread
                );
                tuft.rotation.z = Math.cos(angle) * 0.3;
                tuft.rotation.x = Math.sin(angle) * 0.3;
            }
            hairGroup.add(tuft);
        }
        group.add(hairGroup);
        
        // Big expressive eyes (Club Pengu style - large white with black pupil)
        const eyeWhiteGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const eyeWhiteMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.1 // Shiny eyes
        });
        
        const pupilGeo = new THREE.SphereGeometry(0.09, 12, 12);
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        
        const eyeShineGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const eyeShineMat = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.5
        });
        
        [-0.14, 0.14].forEach((offset, idx) => {
            // Eye white (large)
            const eye = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
            eye.position.set(offset, 0.1, 0.38);
            eye.scale.set(1, 1.1, 0.8); // Slightly oval
            group.add(eye);
            
            // Pupil (positioned slightly to center for cute cross-eyed look)
            const pupil = new THREE.Mesh(pupilGeo, pupilMat);
            const lookOffset = idx === 0 ? 0.02 : -0.02; // Slight cross-eye
            pupil.position.set(offset + lookOffset, 0.1, 0.5);
            group.add(pupil);
            
            // Eye shine (catchlight)
            const shine = new THREE.Mesh(eyeShineGeo, eyeShineMat);
            shine.position.set(offset + 0.04, 0.15, 0.52);
            group.add(shine);
        });
        
        // Small beak/mouth area (subtle bump)
        const beakGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const beakMat = new THREE.MeshStandardMaterial({ 
            color: darkerColor.getHex()
        });
        const beak = new THREE.Mesh(beakGeo, beakMat);
        beak.position.set(0, -0.05, 0.45);
        beak.scale.set(1.2, 0.6, 0.8);
        group.add(beak);
        
        // Feet (small ovals at bottom)
        const footGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const footMat = new THREE.MeshStandardMaterial({ 
            color: darkerColor.getHex()
        });
        
        [-0.18, 0.18].forEach(offset => {
            const foot = new THREE.Mesh(footGeo, footMat);
            foot.position.set(offset, -0.38, 0.1);
            foot.scale.set(1, 0.4, 1.3);
            group.add(foot);
        });
        
        // Smaller side tufts for extra fluffiness
        [-0.4, 0.4].forEach(offset => {
            for (let i = 0; i < 3; i++) {
                const sideTuftGeo = new THREE.ConeGeometry(0.04, 0.12, 4);
                const sideTuft = new THREE.Mesh(sideTuftGeo, tuftMat);
                sideTuft.position.set(offset, 0.1 + i * 0.1 - 0.1, 0);
                sideTuft.rotation.z = offset > 0 ? -0.8 : 0.8;
                sideTuft.rotation.y = Math.random() * 0.3;
                group.add(sideTuft);
            }
        });
        
        group.scale.set(0.6, 0.6, 0.6);
        group.position.set(this.position.x, 0.5, this.position.z);
        
        this.mesh = group;
        return group;
    }
    
    // --- SERIALIZATION ---
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            color: this.color,
            happiness: this.happiness,
            energy: this.energy,
            hunger: this.hunger,
            position: this.position
        };
    }
    
    static fromJSON(data) {
        return new Pet({
            id: data.id,
            name: data.name,
            color: data.color,
            happiness: data.happiness,
            energy: data.energy,
            hunger: data.hunger,
            x: data.position?.x,
            z: data.position?.z
        });
    }
    
    // --- UI HELPERS ---
    getMoodEmoji() {
        const emojis = {
            excited: '🤩',
            happy: '😊',
            neutral: '😐',
            tired: '😴',
            sad: '😢'
        };
        return emojis[this.mood] || '😊';
    }
    
    getColorInfo() {
        return Pet.COLORS[this.color] || Pet.COLORS.blue;
    }
}

export default Pet;

