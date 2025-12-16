import { PALETTE } from '../constants';
import { ASSETS } from '../assets/index';

/**
 * Penguin - Base class for all penguin entities (Player and AI)
 * Handles appearance, state, and animations
 */
class Penguin {
    constructor(config = {}) {
        this.id = config.id || Math.random().toString(36).substr(2, 9);
        this.name = config.name || 'Penguin';
        this.isPlayer = config.isPlayer || false;
        
        // Appearance
        this.skin = config.skin || 'blue';
        this.hat = config.hat || 'none';
        this.eyes = config.eyes || 'normal';
        this.mouth = config.mouth || 'beak';
        this.bodyItem = config.bodyItem || 'none';
        
        // Position & Movement
        this.position = { x: config.x || 0, y: 0, z: config.z || 0 };
        this.rotation = config.rotation || 0;
        this.velocity = { x: 0, z: 0 };
        this.targetPosition = null;
        
        // State
        this.state = 'idle'; // idle, walking, chatting, emoting, playing
        this.emote = null;
        this.emoteStartTime = 0;
        
        // Chat
        this.chatBubble = null;
        this.chatTimeout = null;
        
        // AI specific
        this.aiConfig = {
            actionTimer: 0,
            conversationCooldown: 0,
            conversationPartner: null,
            conversationScript: null,
            conversationLineIdx: 0,
            conversationTurn: false
        };
        
        // 3D Mesh reference (set externally)
        this.mesh = null;
    }
    
    // --- APPEARANCE ---
    getAppearance() {
        return {
            skin: this.skin,
            hat: this.hat,
            eyes: this.eyes,
            mouth: this.mouth,
            bodyItem: this.bodyItem
        };
    }
    
    setAppearance(config) {
        if (config.skin) this.skin = config.skin;
        if (config.hat) this.hat = config.hat;
        if (config.eyes) this.eyes = config.eyes;
        if (config.mouth) this.mouth = config.mouth;
        if (config.bodyItem) this.bodyItem = config.bodyItem;
    }
    
    // --- MOVEMENT ---
    setPosition(x, y, z) {
        this.position.x = x;
        this.position.y = y || 0;
        this.position.z = z;
        
        if (this.mesh) {
            this.mesh.position.set(x, y || 0, z);
        }
    }
    
    setRotation(angle) {
        this.rotation = angle;
        if (this.mesh) {
            this.mesh.rotation.y = angle;
        }
    }
    
    moveTo(x, z) {
        this.targetPosition = { x, z };
        this.state = 'walking';
    }
    
    stopMoving() {
        this.targetPosition = null;
        this.velocity = { x: 0, z: 0 };
        this.state = 'idle';
    }
    
    // --- STATE ---
    setState(state) {
        this.state = state;
    }
    
    startEmote(emoteType) {
        this.emote = emoteType;
        this.emoteStartTime = Date.now();
        this.state = 'emoting';
    }
    
    stopEmote() {
        this.emote = null;
        this.state = 'idle';
    }
    
    // --- ANIMATION ---
    animate(time, delta) {
        if (!this.mesh || !this.mesh.children[0]) return;
        
        const inner = this.mesh.children[0];
        const flipperL = inner.getObjectByName('flipper_l');
        const flipperR = inner.getObjectByName('flipper_r');
        const footL = inner.getObjectByName('foot_l');
        const footR = inner.getObjectByName('foot_r');
        const head = inner.getObjectByName('head');
        
        // Reset rotations
        if (flipperL) flipperL.rotation.set(0, 0, 0);
        if (flipperR) flipperR.rotation.set(0, 0, 0);
        if (footL) footL.rotation.x = 0;
        if (footR) footR.rotation.x = 0;
        inner.position.y = 1;
        inner.rotation.set(0, 0, 0);
        
        if (this.emote) {
            this.animateEmote(inner, time);
        } else if (this.state === 'walking') {
            this.animateWalk(inner, time);
        } else {
            // Idle breathing
            inner.rotation.z = Math.sin(time * 1.5) * 0.02;
        }
    }
    
    animateWalk(inner, time) {
        const flipperL = inner.getObjectByName('flipper_l');
        const flipperR = inner.getObjectByName('flipper_r');
        const footL = inner.getObjectByName('foot_l');
        const footR = inner.getObjectByName('foot_r');
        
        const cycle = time * 10;
        
        if (footL) footL.rotation.x = Math.sin(cycle) * 0.5;
        if (footR) footR.rotation.x = Math.sin(cycle + Math.PI) * 0.5;
        if (flipperL) flipperL.rotation.x = Math.sin(cycle) * 0.5;
        if (flipperR) flipperR.rotation.x = -Math.sin(cycle) * 0.5;
        
        inner.rotation.z = Math.sin(time * 8) * 0.05;
    }
    
    animateEmote(inner, time) {
        const eTime = (Date.now() - this.emoteStartTime) * 0.001;
        const flipperL = inner.getObjectByName('flipper_l');
        const flipperR = inner.getObjectByName('flipper_r');
        const footL = inner.getObjectByName('foot_l');
        const footR = inner.getObjectByName('foot_r');
        const head = inner.getObjectByName('head');
        
        switch (this.emote) {
            case 'Wave':
                if (flipperR) {
                    flipperR.rotation.z = -Math.PI / 1.25;
                    flipperR.rotation.x = Math.sin(eTime * 10) * 0.5;
                }
                break;
                
            case 'Dance':
                inner.rotation.y = eTime * 6;
                inner.position.y = 1 + Math.abs(Math.sin(eTime * 5));
                if (flipperL) flipperL.rotation.z = Math.sin(eTime * 10);
                if (flipperR) flipperR.rotation.z = -Math.sin(eTime * 10);
                break;
                
            case 'Sit':
                inner.position.y = 0.6;
                if (footL) footL.rotation.x = -Math.PI / 2;
                if (footR) footR.rotation.x = -Math.PI / 2;
                if (flipperL) flipperL.rotation.z = 0.5;
                if (flipperR) flipperR.rotation.z = -0.5;
                break;
                
            case 'Laugh':
                const laughRot = -0.5 + Math.sin(eTime * 20) * 0.2;
                if (head) head.rotation.x = laughRot;
                inner.rotation.x = -0.2;
                inner.position.y = 1 + Math.abs(Math.sin(eTime * 15)) * 0.1;
                break;
                
            case 'Breakdance':
                // Breakdance: penguin spins on back with kicking feet (continuous)
                const spinSpeed2 = eTime * 6;
                const kickSpeed2 = eTime * 10;
                
                inner.rotation.x = 0;
                inner.rotation.z = Math.PI; // Upside down
                inner.rotation.y = spinSpeed2; // Spinning
                inner.position.y = 1.8 + Math.sin(eTime * 3) * 0.1; // Raised up
                
                if (footL) {
                    footL.rotation.x = Math.sin(kickSpeed2) * 1.0;
                }
                if (footR) {
                    footR.rotation.x = Math.sin(kickSpeed2 + Math.PI) * 1.0;
                }
                // Flippers straight out to sides
                if (flipperL) {
                    flipperL.rotation.z = Math.PI / 2;
                    flipperL.rotation.x = 0;
                }
                if (flipperR) {
                    flipperR.rotation.z = -Math.PI / 2;
                    flipperR.rotation.x = 0;
                }
                break;
                
            case '67':
                // 67 emote: Arms held straight out in FRONT, seesaw UP/DOWN like weighing scales
                const scaleSpeed = eTime * 4; // 50% faster oscillation
                const seesaw = Math.sin(scaleSpeed) * 0.35; // Seesaw amount (up/down tilt)
                
                // Arms point FORWARD, seesaw moves them UP and DOWN (not in/out)
                if (flipperL) {
                    flipperL.rotation.x = -Math.PI / 2 + seesaw; // Forward + seesaw UP/DOWN
                    flipperL.rotation.y = 0;
                    flipperL.rotation.z = 0.2; // Slight outward spread (constant)
                }
                if (flipperR) {
                    flipperR.rotation.x = -Math.PI / 2 - seesaw; // Forward + OPPOSITE seesaw
                    flipperR.rotation.y = 0;
                    flipperR.rotation.z = -0.2; // Slight outward spread (constant)
                }
                
                // Slight head tilt to look at the "scales"
                if (head) {
                    head.rotation.x = -0.1;
                }
                break;
                
            case 'DJ':
                // DJ pose: One arm STRAIGHT UP (headphones), one arm FORWARD (turntable)
                const djScratchSpeed = eTime * 3;
                const djScratch = Math.sin(djScratchSpeed) * 0.15;
                const djHeadBob = Math.sin(eTime * 4) * 0.08;
                
                // Default: Left arm up, right arm forward (left DJ spot)
                // Left arm STRAIGHT UP (headphones) - nearly vertical
                if (flipperL) {
                    flipperL.rotation.x = 0;
                    flipperL.rotation.y = 0.2;
                    flipperL.rotation.z = Math.PI * 0.85; // Nearly straight up
                }
                // Right arm FORWARD (turntable) with scratching
                if (flipperR) {
                    flipperR.rotation.x = -Math.PI / 2 + djScratch;
                    flipperR.rotation.y = 0.3;
                    flipperR.rotation.z = -0.1;
                }
                
                // Head bob to the beat
                if (head) {
                    head.rotation.x = djHeadBob;
                }
                break;
        }
        
        // Auto-end non-persistent emotes
        // Continuous emotes: Sit, Breakdance, DJ, 67, Headbang - don't auto-end
        const continuousEmotes = ['Sit', 'Breakdance', 'DJ', '67', 'Headbang'];
        if (!continuousEmotes.includes(this.emote) && eTime > 3) {
            this.stopEmote();
        }
    }
    
    // --- SERIALIZATION ---
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            skin: this.skin,
            hat: this.hat,
            eyes: this.eyes,
            mouth: this.mouth,
            bodyItem: this.bodyItem,
            position: this.position,
            rotation: this.rotation
        };
    }
    
    static fromJSON(data) {
        return new Penguin({
            id: data.id,
            name: data.name,
            skin: data.skin,
            hat: data.hat,
            eyes: data.eyes,
            mouth: data.mouth,
            bodyItem: data.bodyItem,
            x: data.position?.x,
            z: data.position?.z,
            rotation: data.rotation
        });
    }
    
    // --- STATIC HELPERS ---
    static getRandomAppearance() {
        const validSkins = Object.keys(PALETTE).filter(k => 
            !['floorLight', 'floorDark', 'wood', 'rug', 'glass', 'beerGold', 
              'mirrorFrame', 'mirrorGlass', 'asphalt', 'roadLine', 'sidewalk',
              'grass', 'water', 'waterDeep', 'buildingConcrete', 'buildingDark',
              'buildingBeige', 'buildingBrick', 'windowLight', 'windowDark',
              'lampPost', 'lampLight', 'butterfly1', 'butterfly2', 'butterfly3'
            ].includes(k)
        );
        
        const hats = Object.keys(ASSETS.HATS);
        const bodyItems = Object.keys(ASSETS.BODY);
        
        return {
            skin: validSkins[Math.floor(Math.random() * validSkins.length)],
            hat: hats[Math.floor(Math.random() * hats.length)],
            eyes: 'normal',
            mouth: 'beak',
            bodyItem: bodyItems[Math.floor(Math.random() * bodyItems.length)]
        };
    }
}

export default Penguin;





