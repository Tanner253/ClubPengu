/**
 * Low-end rendering fallback.
 *
 * This is applied ONLY to environments that measurably cannot sustain the full
 * render path (sustained low FPS — see PerformanceManager low-end detection).
 * Machines that run well (the majority) NEVER hit this path, so full quality is
 * preserved for them.
 *
 * The levers below all target per-fragment (fill-rate) cost, which is the real
 * bottleneck on integrated / older GPUs (the cohort that lags while phones and
 * strong GPUs are smooth):
 *   1. Disable shadows globally — removes the shadow render pass AND the
 *      per-fragment shadow sampling in every lit material. Covers all current
 *      and future objects with zero per-object bookkeeping.
 *   2. Render below native resolution and upscale — fewer fragments per frame.
 *      Global; covers future objects automatically.
 *   3. Replace PBR MeshStandardMaterial with the far cheaper MeshLambertMaterial.
 *      Done via a one-time idempotent scene traversal (re-running only converts
 *      newly added Standard materials, never double-converts).
 */

const LOW_END_RENDER_SCALE = 0.7;

function toLambert(THREE, m) {
    const lm = new THREE.MeshLambertMaterial({
        color: m.color ? m.color.clone() : 0xffffff,
        map: m.map || null,
        emissive: m.emissive ? m.emissive.clone() : 0x000000,
        emissiveMap: m.emissiveMap || null,
        emissiveIntensity: m.emissiveIntensity ?? 1.0,
        alphaMap: m.alphaMap || null,
        aoMap: m.aoMap || null,
        lightMap: m.lightMap || null,
        transparent: m.transparent,
        opacity: m.opacity,
        alphaTest: m.alphaTest,
        side: m.side,
        vertexColors: m.vertexColors,
        fog: m.fog,
        depthWrite: m.depthWrite,
        depthTest: m.depthTest,
        wireframe: m.wireframe,
        flatShading: m.flatShading,
        // Preserve depth-fighting controls — ground decals/paths rely on these to
        // sit on top of the terrain without z-fighting ("ground tears").
        polygonOffset: m.polygonOffset,
        polygonOffsetFactor: m.polygonOffsetFactor,
        polygonOffsetUnits: m.polygonOffsetUnits,
    });
    lm.name = m.name;
    return lm;
}

/**
 * Convert every MeshStandardMaterial in the scene to MeshLambertMaterial in place.
 * Idempotent: non-Standard materials (including already-converted Lambert) are skipped.
 * @returns {number} count of materials converted
 */
export function degradeSceneMaterials(scene, THREE) {
    if (!scene || !THREE) return 0;
    let converted = 0;

    scene.traverse((obj) => {
        if (!obj.isMesh && !obj.isInstancedMesh && !obj.isSkinnedMesh) return;

        const mat = obj.material;
        if (Array.isArray(mat)) {
            obj.material = mat.map((mm) => {
                if (mm && mm.isMeshStandardMaterial) {
                    const lm = toLambert(THREE, mm);
                    mm.dispose();
                    converted++;
                    return lm;
                }
                return mm;
            });
        } else if (mat && mat.isMeshStandardMaterial) {
            const lm = toLambert(THREE, mat);
            mat.dispose();
            obj.material = lm;
            converted++;
        }
    });

    return converted;
}

/**
 * Render below native resolution (upscaled by the browser) to cut fragment count.
 */
export function applyLowEndRenderScale(renderer) {
    if (!renderer) return;
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const scale = Math.max(0.5, Math.min(dpr, 1.25) * LOW_END_RENDER_SCALE);
    renderer.setPixelRatio(scale);
    if (typeof window !== 'undefined') {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

/**
 * Apply all low-end mitigations. Safe to call multiple times (idempotent).
 */
export function applyLowEndMode({ renderer, scene, THREE }) {
    if (renderer) {
        renderer.shadowMap.enabled = false;
        renderer.shadowMap.needsUpdate = true;
        applyLowEndRenderScale(renderer);
    }
    if (scene && THREE) {
        const converted = degradeSceneMaterials(scene, THREE);
        if (converted > 0) {
            console.log(`🎮 Low-end mode: simplified ${converted} materials, shadows disabled, render scale lowered`);
        }
    }
}
