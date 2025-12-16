/**
 * EmoteSystem - Manages emote wheel UI and emote animations
 * Extracted from VoxelWorld.jsx for modularity
 */

// Emote wheel configuration (ordered clockwise from top)
export const EMOTE_WHEEL_ITEMS = [
    { id: 'Wave', emoji: '👋', label: 'Wave', color: 'bg-blue-500' },
    { id: 'Laugh', emoji: '😂', label: 'Laugh', color: 'bg-red-500' },
    { id: 'Breakdance', emoji: '🤸', label: 'Break', color: 'bg-orange-500' },
    { id: 'Dance', emoji: '💃', label: 'Dance', color: 'bg-green-500' },
    { id: 'Sit', emoji: '🧘', label: 'Sit', color: 'bg-purple-500' },
    { id: '67', emoji: '⚖️', label: '67', color: 'bg-yellow-500' },
    { id: 'Headbang', emoji: '🎸', label: 'Rock', color: 'bg-pink-500' },
];

// Emotes that loop continuously (don't auto-end after 3 seconds)
export const LOOPING_EMOTES = ['Sit', 'Breakdance', 'Dance', 'Headbang', 'DJ'];

// Emote to emoji mapping for multiplayer display
export const EMOTE_EMOJI_MAP = {
    'Wave': '👋',
    'Laugh': '😂',
    'Breakdance': '🤸',
    'Dance': '💃',
    'Sit': '🧘',
    '67': '⚖️',
    'Headbang': '🎸',
    'DJ': '🎧',
};

class EmoteSystem {
    constructor() {
        this.currentEmote = null;
        this.emoteStartTime = 0;
        this.wheelOpen = false;
        this.selection = -1;
        this.stickySelection = -1; // Persists until changed
        this.keyHeld = false;
        this.onEmoteTriggered = null; // Callback when emote is triggered
        this.onEmoteEnded = null; // Callback when emote ends
    }

    /**
     * Set callbacks for emote events
     * @param {Object} callbacks - { onEmoteTriggered, onEmoteEnded }
     */
    setCallbacks(callbacks) {
        if (callbacks.onEmoteTriggered) this.onEmoteTriggered = callbacks.onEmoteTriggered;
        if (callbacks.onEmoteEnded) this.onEmoteEnded = callbacks.onEmoteEnded;
    }

    /**
     * Trigger an emote
     * @param {string} type - Emote type (e.g., 'Wave', 'Dance')
     * @param {boolean} isOnFurniture - Whether player is on furniture
     */
    triggerEmote(type, isOnFurniture = false) {
        this.currentEmote = type;
        this.emoteStartTime = Date.now();
        
        if (this.onEmoteTriggered) {
            this.onEmoteTriggered(type, isOnFurniture);
        }
    }

    /**
     * Cancel current emote
     */
    cancelEmote() {
        if (this.currentEmote) {
            const wasEmote = this.currentEmote;
            this.currentEmote = null;
            this.emoteStartTime = 0;
            
            if (this.onEmoteEnded) {
                this.onEmoteEnded(wasEmote);
            }
        }
    }

    /**
     * Get current emote state
     * @returns {{ type: string|null, startTime: number }}
     */
    getEmoteState() {
        return {
            type: this.currentEmote,
            startTime: this.emoteStartTime
        };
    }

    /**
     * Check if emote should auto-end (non-looping emotes end after 3 seconds)
     * @param {number} now - Current timestamp
     * @returns {boolean}
     */
    shouldAutoEnd(now = Date.now()) {
        if (!this.currentEmote) return false;
        if (LOOPING_EMOTES.includes(this.currentEmote)) return false;
        
        const elapsed = (now - this.emoteStartTime) / 1000;
        return elapsed > 3;
    }

    /**
     * Update emote state (call each frame)
     */
    update() {
        if (this.shouldAutoEnd()) {
            this.cancelEmote();
        }
    }

    /**
     * Open emote wheel
     */
    openWheel() {
        this.wheelOpen = true;
        this.keyHeld = true;
    }

    /**
     * Close emote wheel
     * @param {boolean} triggerSelection - Whether to trigger selected emote
     */
    closeWheel(triggerSelection = false) {
        if (triggerSelection && this.stickySelection >= 0 && this.stickySelection < EMOTE_WHEEL_ITEMS.length) {
            this.triggerEmote(EMOTE_WHEEL_ITEMS[this.stickySelection].id);
        }
        
        this.wheelOpen = false;
        this.keyHeld = false;
    }

    /**
     * Check if wheel is open
     */
    isWheelOpen() {
        return this.wheelOpen;
    }

    /**
     * Update wheel selection based on mouse/touch position
     * @param {number} clientX - Mouse X position
     * @param {number} clientY - Mouse Y position
     * @param {number} centerX - Wheel center X
     * @param {number} centerY - Wheel center Y
     * @param {number} deadZone - Dead zone radius in pixels
     */
    updateSelection(clientX, clientY, centerX, centerY, deadZone = 50) {
        const dx = clientX - centerX;
        const dy = clientY - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < deadZone) {
            this.selection = this.stickySelection; // Keep sticky selection when in dead zone
            return this.selection;
        }
        
        const NUM_SECTORS = EMOTE_WHEEL_ITEMS.length;
        const SECTOR_SIZE = 360 / NUM_SECTORS;
        
        // Calculate angle from center (in degrees, 0° = up, clockwise positive)
        let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        
        // Convert angle to sector index
        const idx = Math.floor((angle + SECTOR_SIZE / 2) / SECTOR_SIZE) % NUM_SECTORS;
        
        this.selection = idx;
        this.stickySelection = idx; // Update sticky selection
        
        return idx;
    }

    /**
     * Set selection directly (for keyboard shortcuts)
     * @param {number} index - Emote index (0-based)
     */
    setSelection(index) {
        if (index >= 0 && index < EMOTE_WHEEL_ITEMS.length) {
            this.selection = index;
            this.stickySelection = index;
        }
    }

    /**
     * Get current selection
     */
    getSelection() {
        return this.selection;
    }

    /**
     * Get sticky selection
     */
    getStickySelection() {
        return this.stickySelection;
    }

    /**
     * Handle key down for emote shortcuts (1-7 keys)
     * @param {KeyboardEvent} event
     * @returns {boolean} - True if event was handled
     */
    handleKeyDown(event) {
        const code = event.code;
        
        // T key to open wheel
        if (code === 'KeyT') {
            if (!this.keyHeld) {
                this.openWheel();
            }
            return true;
        }
        
        // Number keys 1-7 for quick emotes
        const keyNum = parseInt(code.replace('Digit', '').replace('Numpad', ''));
        if (keyNum >= 1 && keyNum <= EMOTE_WHEEL_ITEMS.length) {
            const idx = keyNum - 1;
            this.triggerEmote(EMOTE_WHEEL_ITEMS[idx].id);
            return true;
        }
        
        return false;
    }

    /**
     * Handle key up
     * @param {KeyboardEvent} event
     * @returns {boolean} - True if event was handled
     */
    handleKeyUp(event) {
        if (event.code === 'KeyT') {
            if (this.keyHeld) {
                this.closeWheel(true);
            }
            return true;
        }
        return false;
    }

    /**
     * Cancel emote on movement
     */
    onMovement() {
        this.cancelEmote();
    }

    /**
     * Get emoji for an emote type
     * @param {string} type - Emote type
     * @returns {string} - Emoji character
     */
    static getEmoji(type) {
        return EMOTE_EMOJI_MAP[type] || '❓';
    }

    /**
     * Check if emote is looping
     * @param {string} type - Emote type
     * @returns {boolean}
     */
    static isLooping(type) {
        return LOOPING_EMOTES.includes(type);
    }
}

export default EmoteSystem;

