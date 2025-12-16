/**
 * DayNightUpdater - Updates day/night cycle lighting
 * Extracted from VoxelWorld.jsx for better organization
 */

/**
 * Update day/night cycle lighting
 * @param {Object} params - All required parameters
 * @param {number} params.t - Normalized time (0-1) where 0=midnight, 0.5=noon
 * @param {THREE.DirectionalLight} params.sunLight - Sun directional light
 * @param {THREE.AmbientLight} params.ambientLight - Ambient light
 * @param {THREE.Scene} params.scene - Scene (for background color)
 * @param {Array} params.propLights - Array of prop lights to toggle
 * @param {Object} params.lightsOnRef - Ref tracking if lights are on
 */
export function updateDayNightCycle({
    t,
    sunLight,
    ambientLight,
    scene,
    propLights = [],
    lightsOnRef = { current: false }
}) {
    if (!sunLight || !ambientLight) return;
    
    // Calculate sun position (arc across sky)
    const sunAngle = t * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.max(5, sunHeight * 100 + 50);
    
    sunLight.position.set(sunX, sunY, 60);
    
    // Day/night colors - reuse color objects
    let sunIntensity, ambientIntensity;
    const sunColor = sunLight.color;
    const ambientColor = ambientLight.color;
    
    if (t < 0.2) {
        // Night - bright enough to see clearly
        const nightT = t / 0.2;
        sunIntensity = 0.25 + nightT * 0.1;
        ambientIntensity = 0.55 + nightT * 0.1;
        sunColor.setHex(0x6688cc);
        ambientColor.setHex(0x4a5a7a);
        scene.background.lerpColors(scene.background.setHex(0x1a3045), ambientColor, nightT * 0.5);
    } else if (t < 0.3) {
        // Sunrise
        const sunriseT = (t - 0.2) / 0.1;
        sunIntensity = 0.15 + sunriseT * 0.45;
        ambientIntensity = 0.35 + sunriseT * 0.15;
        sunColor.setRGB(0.27 + sunriseT * 0.73, 0.4 + sunriseT * 0.27, 0.67 - sunriseT * 0.27);
        ambientColor.setRGB(0.16 + sunriseT * 0.34, 0.23 + sunriseT * 0.33, 0.35 + sunriseT * 0.28);
        scene.background.setRGB(0.1 + sunriseT * 0.9, 0.19 + sunriseT * 0.61, 0.31 + sunriseT * 0.22);
    } else if (t < 0.7) {
        // Day
        const dayT = (t - 0.3) / 0.4;
        const middayT = 1 - Math.abs(dayT - 0.5) * 2;
        sunIntensity = 0.6 + middayT * 0.3;
        ambientIntensity = 0.4 + middayT * 0.1;
        sunColor.setHex(0xF8F8FF);
        ambientColor.setHex(0xC0E0F0);
        scene.background.setHex(0x87CEEB);
    } else if (t < 0.8) {
        // Sunset
        const sunsetT = (t - 0.7) / 0.1;
        sunIntensity = 0.6 - sunsetT * 0.4;
        ambientIntensity = 0.45 - sunsetT * 0.1;
        sunColor.setRGB(0.97 - sunsetT * 0.03, 0.97 - sunsetT * 0.57, 1 - sunsetT * 0.73);
        ambientColor.setRGB(0.75 - sunsetT * 0.46, 0.88 - sunsetT * 0.63, 0.94 - sunsetT * 0.56);
        scene.background.setRGB(0.53 + sunsetT * 0.47, 0.81 - sunsetT * 0.34, 0.92 - sunsetT * 0.59);
    } else {
        // Night - bright enough to see clearly
        const nightT = (t - 0.8) / 0.2;
        sunIntensity = 0.35 - nightT * 0.1;
        ambientIntensity = 0.65 - nightT * 0.1;
        sunColor.setRGB(1 - nightT * 0.6, 0.4 + nightT * 0.13, 0.27 + nightT * 0.53);
        ambientColor.setRGB(0.35 - nightT * 0.06, 0.35 - nightT * 0, 0.48 - nightT * 0);
        scene.background.setRGB(1 - nightT * 0.90, 0.47 - nightT * 0.28, 0.33 - nightT * 0.06);
    }
    
    sunLight.intensity = sunIntensity;
    ambientLight.intensity = ambientIntensity;
    
    // Update fog color to match sky
    if (scene.fog) scene.fog.color.copy(scene.background);
    
    // Toggle prop lights (ON at night: t < 0.25 or t >= 0.75)
    const shouldLightsBeOn = t < 0.25 || t >= 0.75;
    
    if (shouldLightsBeOn !== lightsOnRef.current && propLights.length > 0) {
        lightsOnRef.current = shouldLightsBeOn;
        
        propLights.forEach(light => {
            if (light && light.isLight) {
                if (light.userData.originalIntensity === undefined) {
                    light.userData.originalIntensity = light.intensity;
                }
                light.intensity = shouldLightsBeOn ? light.userData.originalIntensity : 0;
            }
        });
    }
    
    return { sunIntensity, ambientIntensity, isNight: shouldLightsBeOn };
}

/**
 * Calculate night factor from time (0=day, 1=night)
 * @param {number} t - Normalized time (0-1)
 * @returns {number} Night factor (0-1)
 */
export function calculateNightFactor(t) {
    if (t < 0.2) return 1.0;
    if (t < 0.3) return 1.0 - (t - 0.2) / 0.1;
    if (t < 0.7) return 0.0;
    if (t < 0.8) return (t - 0.7) / 0.1;
    return 1.0;
}

export default { updateDayNightCycle, calculateNightFactor };

