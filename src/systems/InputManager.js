/**
 * InputManager - Centralized input handling for keyboard, mouse, and touch
 */

class InputManager {
    constructor() {
        this.keys = {};
        this.mobileControls = {
            up: false,
            down: false,
            left: false,
            right: false
        };
        this.mouse = { x: 0, y: 0, clicked: false };
        this.joystick = { x: 0, y: 0 };
        this.listeners = [];
        this.enabled = true;
    }
    
    /**
     * Initialize input listeners
     * @param {HTMLElement} element - Element to attach listeners to
     */
    init(element) {
        // Keyboard
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
        
        // Mouse
        element.addEventListener('mousemove', this.handleMouseMove);
        element.addEventListener('mousedown', this.handleMouseDown);
        element.addEventListener('mouseup', this.handleMouseUp);
        
        // Touch
        element.addEventListener('touchstart', this.handleTouchStart, { passive: true });
        element.addEventListener('touchmove', this.handleTouchMove, { passive: true });
        element.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    }
    
    /**
     * Cleanup input listeners
     */
    dispose() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }
    
    handleKeyDown = (e) => {
        if (!this.enabled) return;
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.code] = true;
        this.emit('keydown', e);
    };
    
    handleKeyUp = (e) => {
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.code] = false;
        this.emit('keyup', e);
    };
    
    handleMouseMove = (e) => {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    
    handleMouseDown = (e) => {
        this.mouse.clicked = true;
        this.emit('click', e);
    };
    
    handleMouseUp = () => {
        this.mouse.clicked = false;
    };
    
    handleTouchStart = (e) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        }
    };
    
    handleTouchMove = (e) => {
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        }
    };
    
    handleTouchEnd = () => {
        // Reset touch state if needed
    };
    
    /**
     * Get movement direction from current input
     * @returns {{ x: number, z: number }}
     */
    getMovementVector() {
        let dx = 0;
        let dz = 0;
        
        // Keyboard input
        if (this.keys['w'] || this.keys['arrowup'] || this.mobileControls.up) dz -= 1;
        if (this.keys['s'] || this.keys['arrowdown'] || this.mobileControls.down) dz += 1;
        if (this.keys['a'] || this.keys['arrowleft'] || this.mobileControls.left) dx -= 1;
        if (this.keys['d'] || this.keys['arrowright'] || this.mobileControls.right) dx += 1;
        
        // Joystick input (overrides if non-zero)
        if (Math.abs(this.joystick.x) > 0.1 || Math.abs(this.joystick.y) > 0.1) {
            dx = this.joystick.x;
            dz = this.joystick.y;
        }
        
        // Normalize diagonal movement
        const len = Math.sqrt(dx * dx + dz * dz);
        if (len > 1) {
            dx /= len;
            dz /= len;
        }
        
        return { x: dx, z: dz };
    }
    
    /**
     * Check if jump key is pressed
     */
    isJumping() {
        return this.keys[' '] || this.keys['space'];
    }
    
    /**
     * Check if sprint/run modifier is pressed
     */
    isSprinting() {
        return this.keys['shift'];
    }
    
    /**
     * Set mobile control state
     */
    setMobileControl(direction, active) {
        this.mobileControls[direction] = active;
    }
    
    /**
     * Update joystick values from VirtualJoystick component
     */
    updateJoystick(x, y) {
        this.joystick.x = x;
        this.joystick.y = y;
    }
    
    /**
     * Enable/disable input
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
    
    /**
     * Add event listener
     */
    on(event, callback) {
        this.listeners.push({ event, callback });
        return () => this.off(event, callback);
    }
    
    /**
     * Remove event listener
     */
    off(event, callback) {
        this.listeners = this.listeners.filter(
            l => l.event !== event || l.callback !== callback
        );
    }
    
    /**
     * Emit event
     */
    emit(event, data) {
        this.listeners
            .filter(l => l.event === event)
            .forEach(l => l.callback(data));
    }
}

// Singleton instance
let instance = null;

export const getInputManager = () => {
    if (!instance) {
        instance = new InputManager();
    }
    return instance;
};

export default InputManager;

