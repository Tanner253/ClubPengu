/**
 * DayNightUpdater - Smooth, natural day/night cycle
 * Simplified: Uses sine wave for smooth transitions
 */

// Day/Night duration configuration
// DAY_LENGTH_RATIO: 0.5 = equal day/night, 0.7 = 70% daylight, etc.
const DAY_LENGTH_RATIO = 0.75; // 75% daylight — shorter, less oppressive nights
/** Floor for dayFactor so midnight never goes fully dark */
const MIN_DAY_FACTOR = 0.38;

/**
 * Remap time to create longer days and shorter nights
 * @param {number} t - Raw normalized time (0-1)
 * @returns {number} Remapped time for sine wave calculation
 */
function remapTimeForLongerDays(t) {
    const nightHalf = (1 - DAY_LENGTH_RATIO) / 2;
    const nightStart = nightHalf;     // When sunrise happens (e.g., 0.15 for 70% day)
    const dayEnd = 1 - nightHalf;     // When sunset happens (e.g., 0.85 for 70% day)
    
    if (t < nightStart) {
        // First night portion (0 to nightStart) -> maps to original (0 to 0.25)
        return (t / nightStart) * 0.25;
    } else if (t < dayEnd) {
        // Day portion (nightStart to dayEnd) -> maps to original (0.25 to 0.75)
        return 0.25 + ((t - nightStart) / (dayEnd - nightStart)) * 0.5;
    } else {
        // Second night portion (dayEnd to 1) -> maps to original (0.75 to 1)
        return 0.75 + ((t - dayEnd) / (1 - dayEnd)) * 0.25;
    }
}

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
    
    // Remap time for longer days
    const remappedT = remapTimeForLongerDays(t);
    
    // Smooth sun arc using sine wave
    // remappedT=0 midnight, remappedT=0.25 sunrise, remappedT=0.5 noon, remappedT=0.75 sunset
    const sunAngle = (remappedT - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle); // -1 at midnight, +1 at noon
    
    // Sun position - arc across the sky
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = Math.max(5, sunHeight * 80 + 50);
    sunLight.position.set(sunX, sunY, 60);
    
    // Daylight factor: 0 at night, 1 at noon — floored so nights stay softly lit
    const rawSunHeight = Math.max(0, sunHeight);
    const dayFactor = MIN_DAY_FACTOR + rawSunHeight * (1 - MIN_DAY_FACTOR);
    const nightFactor = Math.max(0, -sunHeight);
    
    // Colors - smooth interpolation between day and night (night = moonlit twilight, not pitch black)
    const dayAmbient = { r: 0.75, g: 0.88, b: 0.94 };
    const nightAmbient = { r: 0.58, g: 0.64, b: 0.74 };
    const daySun = { r: 1.0, g: 0.98, b: 0.95 };
    const nightSun = { r: 0.62, g: 0.70, b: 0.88 };
    const daySky = { r: 0.53, g: 0.81, b: 0.92 };
    const nightSky = { r: 0.38, g: 0.45, b: 0.62 };
    
    // Lerp colors based on dayFactor
    const lerpColor = (day, night, factor) => ({
        r: day.r * factor + night.r * (1 - factor),
        g: day.g * factor + night.g * (1 - factor),
        b: day.b * factor + night.b * (1 - factor)
    });
    
    const ambientC = lerpColor(dayAmbient, nightAmbient, dayFactor);
    const sunC = lerpColor(daySun, nightSun, dayFactor);
    const skyC = lerpColor(daySky, nightSky, dayFactor);
    
    // Apply colors
    ambientLight.color.setRGB(ambientC.r, ambientC.g, ambientC.b);
    sunLight.color.setRGB(sunC.r, sunC.g, sunC.b);
    scene.background.setRGB(skyC.r, skyC.g, skyC.b);
    
    // Intensities — softer nights: never drop below ~58% of daytime fill
    sunLight.intensity = 0.58 + dayFactor * 0.37; // Night: ~0.58, Day: 0.95
    ambientLight.intensity = 0.58 + dayFactor * 0.10; // Night: ~0.58, Day: 0.68
    
    // Update fog color to match sky
    if (scene.fog) scene.fog.color.copy(scene.background);
    
    // Toggle prop lights (ON when sun is below horizon)
    const shouldLightsBeOn = nightFactor > 0.5;
    
    if (shouldLightsBeOn !== lightsOnRef.current && propLights.length > 0) {
        lightsOnRef.current = shouldLightsBeOn;
        
        propLights.forEach(light => {
            if (light && light.isLight) {
                if (light.userData.originalIntensity === undefined) {
                    light.userData.originalIntensity = light.intensity;
                }
                // Smooth transition for prop lights based on night factor
                light.intensity = shouldLightsBeOn ? light.userData.originalIntensity : 0;
            }
        });
    }
    
    return { sunIntensity: sunLight.intensity, ambientIntensity: ambientLight.intensity, isNight: shouldLightsBeOn };
}

/**
 * Calculate night factor from time (0=day, 1=night)
 * Smooth sine-based calculation
 * @param {number} t - Normalized time (0-1)
 * @returns {number} Night factor (0-1)
 */
export function calculateNightFactor(t) {
    // Remap time for longer days
    const remappedT = remapTimeForLongerDays(t);
    // Sine wave: remappedT=0 midnight (night=1), remappedT=0.5 noon (night=0)
    const sunAngle = (remappedT - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(sunAngle);
    return Math.max(0, -sunHeight); // 0 during day, peaks at 1 at midnight
}

export default { updateDayNightCycle, calculateNightFactor };
