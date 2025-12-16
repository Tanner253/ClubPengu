/**
 * AIManager - Manages AI penguin NPCs (behavior, movement, conversations)
 */

// Default AI penguin names
const AI_NAMES = [
    'Frosty', 'Waddles', 'Chilly', 'Snowball', 'Iggy', 
    'Pebbles', 'Flipper', 'Glacier', 'Tux', 'Blizzard',
    'Penny', 'Arctic', 'Icicle', 'Polar', 'Berg',
];

// Conversation topics
const CONVERSATION_TOPICS = [
    ['Hey!', 'Hi there!', 'Nice to see you!'],
    ['Have you tried Card-Jitsu?', 'I love minigames!', 'Let\'s play!'],
    ['Beautiful day!', 'I love the snow!', 'Waddle on!'],
    ['Nice outfit!', 'Cool hat!', 'Looking good!'],
    ['See you around!', 'Bye!', 'Catch ya later!'],
];

class AIManager {
    constructor(options = {}) {
        this.aiPenguins = new Map(); // id -> { mesh, state, target, etc. }
        this.maxAI = options.maxAI || 8;
        this.spawnArea = options.spawnArea || { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
        this.enabled = true;
        this.updateInterval = 2; // Update every N frames for performance
        this.frameCount = 0;
    }
    
    /**
     * Generate a random AI appearance
     */
    generateAppearance() {
        const colors = ['blue', 'red', 'green', 'pink', 'yellow', 'purple', 'orange', 'black'];
        const hats = ['none', 'topHat', 'propeller', 'crown', 'santa', 'viking', 'cowboy', 'chef'];
        const eyes = ['default', 'sleepy', 'angry', 'happy', 'hearts'];
        const mouths = ['default', 'smile', 'open', 'tongue'];
        
        return {
            skin: colors[Math.floor(Math.random() * colors.length)],
            hat: hats[Math.floor(Math.random() * hats.length)],
            eyes: eyes[Math.floor(Math.random() * eyes.length)],
            mouth: mouths[Math.floor(Math.random() * mouths.length)],
        };
    }
    
    /**
     * Spawn an AI penguin
     * @param {Function} buildPenguinFn - Function to build penguin mesh
     * @param {THREE.Scene} scene
     * @returns {Object} AI data
     */
    spawnAI(buildPenguinFn, scene) {
        if (this.aiPenguins.size >= this.maxAI) return null;
        
        const id = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const name = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
        const appearance = this.generateAppearance();
        
        // Random spawn position
        const x = this.spawnArea.minX + Math.random() * (this.spawnArea.maxX - this.spawnArea.minX);
        const z = this.spawnArea.minZ + Math.random() * (this.spawnArea.maxZ - this.spawnArea.minZ);
        
        // Build penguin mesh using provided function
        const mesh = buildPenguinFn(appearance, name);
        mesh.position.set(x, 0, z);
        scene.add(mesh);
        
        const ai = {
            id,
            name,
            mesh,
            appearance,
            state: 'idle',
            target: null,
            walkTimer: 0,
            idleTimer: 0,
            conversationTimer: 0,
            currentPhrase: null,
            phraseTimer: 0,
            speed: 2 + Math.random() * 1.5,
            facingAngle: Math.random() * Math.PI * 2,
        };
        
        this.aiPenguins.set(id, ai);
        return ai;
    }
    
    /**
     * Remove an AI penguin
     */
    removeAI(id, scene) {
        const ai = this.aiPenguins.get(id);
        if (ai) {
            scene.remove(ai.mesh);
            this.aiPenguins.delete(id);
        }
    }
    
    /**
     * Update all AI penguins
     * @param {number} delta - Time since last frame
     * @param {Object} playerPos - Player position { x, z }
     * @param {Function} checkCollision - Collision check function
     */
    update(delta, playerPos, checkCollision) {
        if (!this.enabled) return;
        
        this.frameCount++;
        if (this.frameCount % this.updateInterval !== 0) return;
        
        this.aiPenguins.forEach(ai => {
            this.updateAI(ai, delta * this.updateInterval, playerPos, checkCollision);
        });
    }
    
    /**
     * Update single AI penguin
     */
    updateAI(ai, delta, playerPos, checkCollision) {
        switch (ai.state) {
            case 'idle':
                this.updateIdle(ai, delta, playerPos);
                break;
            case 'walking':
                this.updateWalking(ai, delta, checkCollision);
                break;
            case 'talking':
                this.updateTalking(ai, delta);
                break;
        }
        
        // Update phrase timer (chat bubble)
        if (ai.currentPhrase && ai.phraseTimer > 0) {
            ai.phraseTimer -= delta;
            if (ai.phraseTimer <= 0) {
                ai.currentPhrase = null;
            }
        }
    }
    
    /**
     * Idle state - stand around, occasionally start walking or talking
     */
    updateIdle(ai, delta, playerPos) {
        ai.idleTimer += delta;
        
        // Random chance to start walking
        if (ai.idleTimer > 3 + Math.random() * 5) {
            ai.idleTimer = 0;
            
            // Pick random target
            ai.target = {
                x: ai.mesh.position.x + (Math.random() - 0.5) * 20,
                z: ai.mesh.position.z + (Math.random() - 0.5) * 20,
            };
            
            // Clamp to spawn area
            ai.target.x = Math.max(this.spawnArea.minX, Math.min(this.spawnArea.maxX, ai.target.x));
            ai.target.z = Math.max(this.spawnArea.minZ, Math.min(this.spawnArea.maxZ, ai.target.z));
            
            ai.state = 'walking';
        }
        
        // Random chance to say something if player is nearby
        if (playerPos) {
            const dx = ai.mesh.position.x - playerPos.x;
            const dz = ai.mesh.position.z - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < 8 && !ai.currentPhrase && Math.random() < 0.01) {
                this.say(ai);
            }
        }
    }
    
    /**
     * Walking state - move towards target
     */
    updateWalking(ai, delta, checkCollision) {
        if (!ai.target) {
            ai.state = 'idle';
            return;
        }
        
        const dx = ai.target.x - ai.mesh.position.x;
        const dz = ai.target.z - ai.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        // Reached target?
        if (dist < 1) {
            ai.target = null;
            ai.state = 'idle';
            return;
        }
        
        // Move towards target
        const moveX = (dx / dist) * ai.speed * delta;
        const moveZ = (dz / dist) * ai.speed * delta;
        
        // Check collision before moving
        const newX = ai.mesh.position.x + moveX;
        const newZ = ai.mesh.position.z + moveZ;
        
        if (!checkCollision || !checkCollision(newX, newZ)) {
            ai.mesh.position.x = newX;
            ai.mesh.position.z = newZ;
        } else {
            // Blocked - stop walking
            ai.target = null;
            ai.state = 'idle';
            return;
        }
        
        // Face movement direction
        ai.facingAngle = Math.atan2(dx, dz);
        ai.mesh.rotation.y = ai.facingAngle;
        
        // Walking animation (bobbing)
        ai.walkTimer += delta * 8;
        ai.mesh.position.y = Math.abs(Math.sin(ai.walkTimer)) * 0.15;
    }
    
    /**
     * Talking state
     */
    updateTalking(ai, delta) {
        ai.conversationTimer -= delta;
        
        if (ai.conversationTimer <= 0) {
            ai.state = 'idle';
        }
    }
    
    /**
     * Make AI say something
     */
    say(ai, phrase = null) {
        if (!phrase) {
            const topic = CONVERSATION_TOPICS[Math.floor(Math.random() * CONVERSATION_TOPICS.length)];
            phrase = topic[Math.floor(Math.random() * topic.length)];
        }
        
        ai.currentPhrase = phrase;
        ai.phraseTimer = 3;
        
        return phrase;
    }
    
    /**
     * Get all AI data for rendering chat bubbles
     */
    getAIData() {
        return Array.from(this.aiPenguins.values()).map(ai => ({
            id: ai.id,
            name: ai.name,
            position: ai.mesh.position.clone(),
            phrase: ai.currentPhrase,
        }));
    }
    
    /**
     * Get AI count
     */
    getCount() {
        return this.aiPenguins.size;
    }
    
    /**
     * Enable/disable AI
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    /**
     * Cleanup all AI
     */
    dispose(scene) {
        this.aiPenguins.forEach((ai, id) => {
            scene.remove(ai.mesh);
        });
        this.aiPenguins.clear();
    }
}

export default AIManager;

