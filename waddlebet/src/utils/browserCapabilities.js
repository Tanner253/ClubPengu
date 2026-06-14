/**
 * Browser / GPU capability probes for automatic performance tuning.
 * Brave applies WebGL/canvas fingerprinting protections that add significant GPU overhead.
 */

const SOFTWARE_RENDERER_PATTERNS = [
    /swiftshader/i,
    /llvmpipe/i,
    /software/i,
    /microsoft basic render/i,
    /mesa offscreen/i
];

let braveProbePromise = null;
let braveProbeResult = null;

/**
 * Synchronous WebGL probe — safe to call before renderer creation.
 */
export function probeWebGLConstraints() {
    const result = {
        webglAvailable: false,
        softwareRenderer: false,
        renderer: '',
        recommendPreset: null
    };

    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
            || canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: true });

        if (!gl) {
            result.recommendPreset = 'potato';
            return result;
        }

        result.webglAvailable = true;

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
            result.softwareRenderer = SOFTWARE_RENDERER_PATTERNS.some((re) => re.test(result.renderer));
        }

        if (result.softwareRenderer) {
            result.recommendPreset = 'potato';
        }
    } catch {
        result.recommendPreset = 'low';
    }

    return result;
}

/**
 * Detect Brave (async — navigator.brave.isBrave()).
 */
export async function detectBraveBrowser() {
    if (braveProbeResult !== null) {
        return braveProbeResult;
    }

    if (!braveProbePromise) {
        braveProbePromise = (async () => {
            let isBrave = false;
            try {
                if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
                    isBrave = await navigator.brave.isBrave();
                }
            } catch {
                isBrave = false;
            }
            braveProbeResult = isBrave;
            if (typeof window !== 'undefined') {
                window._isBraveBrowser = isBrave;
            }
            return isBrave;
        })();
    }

    return braveProbePromise;
}

/**
 * Full capability init — call once before creating the main WebGL renderer.
 */
export async function initBrowserCapabilities() {
    const webgl = probeWebGLConstraints();
    const isBrave = await detectBraveBrowser();

    const caps = {
        isBrave,
        ...webgl,
        recommendPreset: webgl.recommendPreset || (isBrave ? 'medium' : null)
    };

    if (typeof window !== 'undefined') {
        window._browserCapabilities = caps;
    }

    return caps;
}
