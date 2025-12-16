/**
 * InteractionSystem - Handles player interactions with world objects
 * (portals, benches, NPCs, triggers)
 */

class InteractionSystem {
    constructor() {
        this.portals = [];
        this.triggers = [];
        this.interactionRange = 3;
        this.currentInteraction = null;
    }
    
    /**
     * Register portals for this room
     * @param {Array} portals - Array of portal definitions
     */
    setPortals(portals) {
        this.portals = portals;
    }
    
    /**
     * Register triggers for this room
     * @param {Array} triggers - Array of trigger definitions
     */
    setTriggers(triggers) {
        this.triggers = triggers;
    }
    
    /**
     * Check for nearby interactions
     * @param {number} x - Player X
     * @param {number} z - Player Z
     * @returns {Object|null} Nearby interaction or null
     */
    checkInteractions(x, z) {
        // Check portals first
        const nearPortal = this.findNearbyPortal(x, z);
        if (nearPortal) {
            this.currentInteraction = { type: 'portal', data: nearPortal };
            return this.currentInteraction;
        }
        
        // Check triggers
        const nearTrigger = this.findNearbyTrigger(x, z);
        if (nearTrigger) {
            this.currentInteraction = { type: 'trigger', data: nearTrigger };
            return this.currentInteraction;
        }
        
        this.currentInteraction = null;
        return null;
    }
    
    /**
     * Find nearby portal
     * @param {number} x
     * @param {number} z
     * @returns {Object|null}
     */
    findNearbyPortal(x, z) {
        for (const portal of this.portals) {
            const dx = x - portal.x;
            const dz = z - portal.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            
            if (dist < (portal.radius || this.interactionRange)) {
                return portal;
            }
        }
        return null;
    }
    
    /**
     * Find nearby trigger
     * @param {number} x
     * @param {number} z
     * @returns {Object|null}
     */
    findNearbyTrigger(x, z) {
        for (const trigger of this.triggers) {
            // Box trigger
            if (trigger.size) {
                const halfX = trigger.size.x / 2;
                const halfZ = trigger.size.z / 2;
                
                if (x >= trigger.x - halfX && x <= trigger.x + halfX &&
                    z >= trigger.z - halfZ && z <= trigger.z + halfZ) {
                    return trigger;
                }
            }
            // Radius trigger
            else if (trigger.radius) {
                const dx = x - trigger.x;
                const dz = z - trigger.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                
                if (dist < trigger.radius) {
                    return trigger;
                }
            }
        }
        return null;
    }
    
    /**
     * Try to activate current interaction
     * @returns {Object|null} Activation result
     */
    activate() {
        if (!this.currentInteraction) return null;
        
        const { type, data } = this.currentInteraction;
        
        switch (type) {
            case 'portal':
                return {
                    action: 'changeRoom',
                    targetRoom: data.targetRoom,
                    targetSpawn: data.targetSpawn,
                };
                
            case 'trigger':
                return this.activateTrigger(data);
                
            default:
                return null;
        }
    }
    
    /**
     * Activate a trigger
     * @param {Object} trigger
     * @returns {Object}
     */
    activateTrigger(trigger) {
        switch (trigger.type) {
            case 'sit':
                return {
                    action: 'sit',
                    seatHeight: trigger.seatHeight,
                    snapPoint: trigger.snapPoints?.[0],
                    emote: trigger.emote,
                };
                
            case 'minigame':
                return {
                    action: 'startMinigame',
                    gameType: trigger.gameType,
                };
                
            case 'interact_snowman':
                return {
                    action: 'emote',
                    emote: 'Wave',
                    message: trigger.message,
                };
                
            case 'warm_campfire':
                return {
                    action: 'sit',
                    seatHeight: 0,
                    emote: trigger.emote,
                    message: trigger.message,
                };
                
            default:
                return {
                    action: trigger.type,
                    ...trigger,
                };
        }
    }
    
    /**
     * Get current interaction for UI display
     */
    getCurrentInteraction() {
        return this.currentInteraction;
    }
    
    /**
     * Get interaction prompt text
     * @returns {string|null}
     */
    getPromptText() {
        if (!this.currentInteraction) return null;
        
        const { type, data } = this.currentInteraction;
        
        if (type === 'portal') {
            return data.label || `Enter ${data.targetRoom}`;
        }
        
        if (type === 'trigger' && data.message) {
            return data.message;
        }
        
        return null;
    }
    
    /**
     * Clear current interaction
     */
    clearInteraction() {
        this.currentInteraction = null;
    }
    
    /**
     * Set interaction range
     * @param {number} range
     */
    setInteractionRange(range) {
        this.interactionRange = range;
    }
}

export default InteractionSystem;

