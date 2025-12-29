/**
 * ChatBubbleSystem - Manages chat bubble sprites above characters
 * Extracted from VoxelWorld.jsx for modularity
 */

// Height constants for different character types
export const BUBBLE_HEIGHT_PENGUIN = 5.8;
export const BUBBLE_HEIGHT_MARCUS = 6.8;
export const BUBBLE_HEIGHT_WHALE = 6.5;
export const NAME_HEIGHT_PENGUIN = 5;
export const NAME_HEIGHT_MARCUS = 6;
export const NAME_HEIGHT_WHALE = 5.8;

/**
 * Create a chat bubble sprite for a message
 * @param {Object} THREE - Three.js library
 * @param {string} message - Text message to display
 * @param {number} height - Height above character
 * @returns {THREE.Sprite}
 */
export function createChatSprite(THREE, message, height = BUBBLE_HEIGHT_PENGUIN) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 48;
    const padding = 20;
    
    ctx.font = `bold ${fontSize}px sans-serif`;
    
    // Word Wrap Logic - handles both words and very long strings without spaces
    const maxLineWidth = 500; 
    const maxCharsPerLine = 25;
    let lines = [];
    
    // Break very long words into chunks
    const breakLongWord = (word) => {
        const chunks = [];
        while (word.length > maxCharsPerLine) {
            chunks.push(word.slice(0, maxCharsPerLine));
            word = word.slice(maxCharsPerLine);
        }
        if (word.length > 0) chunks.push(word);
        return chunks;
    };
    
    const words = message.split(' ');
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        
        if (word.length > maxCharsPerLine) {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = '';
            }
            const chunks = breakLongWord(word);
            for (let j = 0; j < chunks.length - 1; j++) {
                lines.push(chunks[j]);
            }
            currentLine = chunks[chunks.length - 1];
        } else {
            const testLine = currentLine ? currentLine + " " + word : word;
            const width = ctx.measureText(testLine).width;
            if (width < maxLineWidth) {
                currentLine = testLine;
            } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
            }
        }
    }
    if (currentLine) lines.push(currentLine);
    
    if (lines.length === 0) lines.push(message.slice(0, maxCharsPerLine) || ' ');
    
    // Canvas Dimensions
    const textHeight = lines.length * (fontSize * 1.2);
    const textWidth = lines.length > 1 ? maxLineWidth : ctx.measureText(lines[0]).width;
    
    const w = textWidth + padding * 3;
    const h = textHeight + padding * 3;
    
    canvas.width = w;
    canvas.height = h;
    
    // Re-apply font context after resize
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    
    // Draw Bubble Background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 6;
    
    const r = 25;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(w-r, 0);
    ctx.quadraticCurveTo(w, 0, w, r);
    ctx.lineTo(w, h-r);
    ctx.quadraticCurveTo(w, h, w-r, h);
    ctx.lineTo(r, h);
    ctx.quadraticCurveTo(0, h, 0, h-r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
    
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 5;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    
    // Draw Text
    ctx.fillStyle = 'black';
    lines.forEach((line, i) => {
        ctx.fillText(line, w/2, padding + (i * fontSize * 1.2));
    });
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        depthTest: false, 
        depthWrite: false 
    }); 
    const sprite = new THREE.Sprite(material);
    
    // Scale down larger messages to prevent screen coverage
    const baseScale = 0.015;
    const messageLength = message.length;
    const lineCount = lines.length;
    
    let scaleFactor = 1.0;
    if (messageLength > 150 || lineCount > 4) {
        scaleFactor = 0.45;
    } else if (messageLength > 80 || lineCount > 2) {
        scaleFactor = 0.60;
    } else if (messageLength > 30 || lineCount > 1) {
        scaleFactor = 0.80;
    }
    
    const scale = baseScale * scaleFactor;
    sprite.scale.set(w * scale, h * scale, 1);
    sprite.position.set(0, height, 0);
    sprite.renderOrder = 999;
    
    return sprite;
}

/**
 * Get bubble height for a character type
 * @param {string} characterType - 'penguin', 'marcus', or whale variants
 * @returns {number}
 */
export function getBubbleHeight(characterType) {
    if (characterType === 'marcus') return BUBBLE_HEIGHT_MARCUS;
    if (characterType?.includes('Whale')) return BUBBLE_HEIGHT_WHALE;
    return BUBBLE_HEIGHT_PENGUIN;
}

/**
 * Get name height for a character type
 * @param {string} characterType - 'penguin', 'marcus', or whale variants
 * @returns {number}
 */
export function getNameHeight(characterType) {
    if (characterType === 'marcus') return NAME_HEIGHT_MARCUS;
    if (characterType?.includes('Whale')) return NAME_HEIGHT_WHALE;
    return NAME_HEIGHT_PENGUIN;
}

/**
 * ChatBubbleManager - Manages multiple chat bubbles
 */
class ChatBubbleManager {
    constructor(THREE) {
        this.THREE = THREE;
        this.bubbles = new Map(); // entityId -> { sprite, timer, isAFK }
    }

    /**
     * Show a chat bubble for an entity
     * @param {string} entityId - Unique entity identifier
     * @param {THREE.Object3D} entityMesh - Mesh to attach bubble to
     * @param {string} message - Message text
     * @param {Object} options - { characterType, isAFK, duration }
     */
    showBubble(entityId, entityMesh, message, options = {}) {
        const { characterType = 'penguin', isAFK = false, duration = 5000 } = options;
        
        // Remove existing bubble
        this.hideBubble(entityId, entityMesh);
        
        // Create new bubble
        const height = getBubbleHeight(characterType);
        const sprite = createChatSprite(this.THREE, message, height);
        entityMesh.add(sprite);
        
        const bubbleData = {
            sprite,
            isAFK,
            timer: isAFK ? null : setTimeout(() => {
                this.hideBubble(entityId, entityMesh);
            }, duration)
        };
        
        this.bubbles.set(entityId, bubbleData);
        
        return sprite;
    }

    /**
     * Hide bubble for an entity
     * @param {string} entityId
     * @param {THREE.Object3D} entityMesh
     */
    hideBubble(entityId, entityMesh) {
        const data = this.bubbles.get(entityId);
        if (data) {
            if (data.timer) clearTimeout(data.timer);
            if (data.sprite && entityMesh) {
                entityMesh.remove(data.sprite);
                // Dispose sprite resources
                if (data.sprite.material) {
                    if (data.sprite.material.map) data.sprite.material.map.dispose();
                    data.sprite.material.dispose();
                }
            }
            this.bubbles.delete(entityId);
        }
    }

    /**
     * Check if entity has a bubble
     * @param {string} entityId
     */
    hasBubble(entityId) {
        return this.bubbles.has(entityId);
    }

    /**
     * Check if entity has AFK bubble
     * @param {string} entityId
     */
    isAFKBubble(entityId) {
        const data = this.bubbles.get(entityId);
        return data?.isAFK || false;
    }

    /**
     * Clear all bubbles
     */
    clearAll() {
        this.bubbles.forEach((data, entityId) => {
            if (data.timer) clearTimeout(data.timer);
            if (data.sprite?.material) {
                if (data.sprite.material.map) data.sprite.material.map.dispose();
                data.sprite.material.dispose();
            }
        });
        this.bubbles.clear();
    }

    /**
     * Dispose the manager
     */
    dispose() {
        this.clearAll();
    }
}

export default ChatBubbleManager;

