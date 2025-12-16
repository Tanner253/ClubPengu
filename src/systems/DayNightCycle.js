/**
 * DayNightCycle - Handles day/night transitions and lighting changes
 */

class DayNightCycle {
    constructor(THREE, scene) {
        this.THREE = THREE;
        this.scene = scene;
        
        // Server-synchronized world time (0-24000)
        // 0-6000: Day, 6000-12000: Sunset, 12000-18000: Night, 18000-24000: Sunrise
        this.worldTime = 0;
        this.dayLength = 24000; // Game ticks per day
        
        // Light references
        this.ambientLight = null;
        this.sunLight = null;
        this.moonLight = null;
        
        // Night factor (0 = full day, 1 = full night)
        this.nightFactor = 0;
        
        // Colors
        this.colors = {
            dayAmbient: 0x8FA7BA,
            nightAmbient: 0x2A3A4A,
            daySun: 0xFFF8E0,
            nightSun: 0x6688AA,
            daySky: 0x87CEEB,
            nightSky: 0x1A2030,
        };
        
        // Prop lights to toggle
        this.propLights = [];
    }
    
    /**
     * Initialize lights
     */
    init() {
        const THREE = this.THREE;
        
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(this.colors.dayAmbient, 0.6);
        this.scene.add(this.ambientLight);
        
        // Sun/moon directional light
        this.sunLight = new THREE.DirectionalLight(this.colors.daySun, 0.8);
        this.sunLight.position.set(50, 100, 50);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 200;
        this.sunLight.shadow.camera.left = -60;
        this.sunLight.shadow.camera.right = 60;
        this.sunLight.shadow.camera.top = 60;
        this.sunLight.shadow.camera.bottom = -60;
        this.sunLight.shadow.bias = -0.0001;
        this.scene.add(this.sunLight);
        
        return this;
    }
    
    /**
     * Register a prop light for day/night toggling
     * @param {THREE.Light} light
     */
    registerPropLight(light) {
        this.propLights.push(light);
    }
    
    /**
     * Update world time (synchronized from server)
     * @param {number} time - Server world time (0-24000)
     */
    setWorldTime(time) {
        this.worldTime = time % this.dayLength;
        this.updateLighting();
    }
    
    /**
     * Calculate night factor from world time
     * @returns {number} 0 = day, 1 = night
     */
    calculateNightFactor() {
        const t = this.worldTime;
        
        if (t < 6000) {
            // Day (0-6000): Full brightness
            return 0;
        } else if (t < 12000) {
            // Sunset (6000-12000): Fade to night
            return (t - 6000) / 6000;
        } else if (t < 18000) {
            // Night (12000-18000): Full darkness
            return 1;
        } else {
            // Sunrise (18000-24000): Fade to day
            return 1 - (t - 18000) / 6000;
        }
    }
    
    /**
     * Update lighting based on current time
     */
    updateLighting() {
        this.nightFactor = this.calculateNightFactor();
        
        if (this.ambientLight) {
            // Interpolate ambient color
            const dayColor = new this.THREE.Color(this.colors.dayAmbient);
            const nightColor = new this.THREE.Color(this.colors.nightAmbient);
            this.ambientLight.color.copy(dayColor).lerp(nightColor, this.nightFactor);
            this.ambientLight.intensity = 0.6 - this.nightFactor * 0.3;
        }
        
        if (this.sunLight) {
            // Interpolate sun color and intensity
            const dayColor = new this.THREE.Color(this.colors.daySun);
            const nightColor = new this.THREE.Color(this.colors.nightSun);
            this.sunLight.color.copy(dayColor).lerp(nightColor, this.nightFactor);
            this.sunLight.intensity = 0.8 - this.nightFactor * 0.5;
            
            // Move sun position (arc across sky)
            const sunAngle = (this.worldTime / this.dayLength) * Math.PI * 2;
            this.sunLight.position.set(
                Math.cos(sunAngle) * 50,
                Math.sin(sunAngle) * 80 + 20,
                Math.sin(sunAngle) * 50
            );
        }
        
        // Toggle prop lights (lamps, etc.)
        const lightsOn = this.nightFactor > 0.3;
        this.propLights.forEach(light => {
            if (light.userData && light.userData.isLampLight) {
                light.visible = lightsOn;
                if (lightsOn) {
                    light.intensity = 1.8 + this.nightFactor * 1.2;
                }
            }
        });
    }
    
    /**
     * Update in game loop
     * @param {number} delta - Time since last frame
     */
    update(delta) {
        // If not synced to server, advance time locally
        // this.worldTime = (this.worldTime + delta * 100) % this.dayLength;
        // this.updateLighting();
    }
    
    /**
     * Get current night factor
     * @returns {number} 0-1
     */
    getNightFactor() {
        return this.nightFactor;
    }
    
    /**
     * Check if it's currently night
     * @returns {boolean}
     */
    isNight() {
        return this.nightFactor > 0.5;
    }
    
    /**
     * Get lights for external control
     */
    getLights() {
        return {
            ambient: this.ambientLight,
            sun: this.sunLight,
        };
    }
    
    /**
     * Cleanup
     */
    dispose() {
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight.dispose?.();
        }
        if (this.sunLight) {
            this.scene.remove(this.sunLight);
            this.sunLight.dispose?.();
        }
        this.propLights = [];
    }
}

export default DayNightCycle;

