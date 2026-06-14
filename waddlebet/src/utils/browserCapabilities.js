/**
 * Browser / GPU capability probes for automatic performance tuning.
 * Brave and Opera GX apply WebGL/canvas protections that add significant GPU overhead.
 */

export const WEBGL_STATUS = {
    OK: 'ok',
    UNAVAILABLE: 'unavailable',
    HARDWARE_DISABLED: 'hardware_disabled',
    SOFTWARE_RENDERER: 'software_renderer'
};

const SOFTWARE_RENDERER_PATTERNS = [
    /swiftshader/i,
    /llvmpipe/i,
    /software/i,
    /microsoft basic render/i,
    /mesa offscreen/i,
    /google swiftshader/i
];

let capabilityProbePromise = null;
let capabilityProbeResult = null;

function readRendererString(gl) {
    try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        }
    } catch {
        // ignore
    }
    return '';
}

function isSoftwareRenderer(renderer) {
    return SOFTWARE_RENDERER_PATTERNS.some((re) => re.test(renderer));
}

/**
 * Detailed WebGL health check for user-facing warnings.
 */
export function probeWebGLStatus() {
    const result = {
        status: WEBGL_STATUS.OK,
        webglAvailable: false,
        hardwareAcceleration: true,
        softwareRenderer: false,
        renderer: '',
        vendor: ''
    };

    const canvas = document.createElement('canvas');
    let glBasic = null;

    try {
        glBasic = canvas.getContext('webgl')
            || canvas.getContext('experimental-webgl');
    } catch {
        glBasic = null;
    }

    if (!glBasic) {
        return {
            ...result,
            status: WEBGL_STATUS.UNAVAILABLE,
            hardwareAcceleration: false
        };
    }

    result.webglAvailable = true;

    let glHw = null;
    try {
        glHw = canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true })
            || canvas.getContext('experimental-webgl', { failIfMajorPerformanceCaveat: true });
    } catch {
        glHw = null;
    }

    if (!glHw) {
        return {
            ...result,
            status: WEBGL_STATUS.HARDWARE_DISABLED,
            hardwareAcceleration: false
        };
    }

    result.renderer = readRendererString(glHw);
    result.softwareRenderer = isSoftwareRenderer(result.renderer);

    if (result.softwareRenderer) {
        return {
            ...result,
            status: WEBGL_STATUS.SOFTWARE_RENDERER,
            hardwareAcceleration: false
        };
    }

    return result;
}

/**
 * Synchronous WebGL probe — safe to call before renderer creation.
 */
export function probeWebGLConstraints() {
    const status = probeWebGLStatus();

    const result = {
        webglAvailable: status.webglAvailable,
        softwareRenderer: status.softwareRenderer,
        renderer: status.renderer,
        recommendPreset: null
    };

    if (status.status === WEBGL_STATUS.UNAVAILABLE) {
        result.recommendPreset = 'potato';
        return result;
    }

    if (status.status === WEBGL_STATUS.HARDWARE_DISABLED) {
        result.recommendPreset = 'low';
        return result;
    }

    if (status.status === WEBGL_STATUS.SOFTWARE_RENDERER) {
        result.recommendPreset = 'potato';
    }

    return result;
}

/**
 * Detect Opera / Opera GX (Chromium-based, OPR in user agent).
 */
export function detectOperaBrowser() {
    const ua = navigator.userAgent || '';
    return /\bOPR\//.test(ua) || /\bOpera\//.test(ua) || !!(typeof window !== 'undefined' && window.opr);
}

/**
 * Detect Brave (async — navigator.brave.isBrave()).
 */
export async function detectBraveBrowser() {
    let isBrave = false;
    try {
        if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
            isBrave = await navigator.brave.isBrave();
        }
    } catch {
        isBrave = false;
    }
    return isBrave;
}

export function usesPrivacyBrowserOptimizations(caps = {}) {
    return !!(caps.isBrave || caps.isOpera
        || (typeof window !== 'undefined' && (window._isBraveBrowser || window._isOperaBrowser)));
}

/**
 * Generic fix steps; optional browser-specific hint appended when detected.
 */
export function getWebGLFixSteps(caps = {}) {
    const steps = [
        'enableHardwareAcceleration',
        'updateGraphicsDrivers',
        'disableWebglBlockers',
        'restartBrowser'
    ];

    let browserHint = null;
    if (caps.isBrave) {
        browserHint = 'brave';
    } else if (caps.isOpera) {
        browserHint = 'opera';
    }

    return { steps, browserHint };
}

/**
 * Full capability init — call once before creating the main WebGL renderer.
 */
export async function initBrowserCapabilities() {
    if (capabilityProbeResult) {
        return capabilityProbeResult;
    }

    if (!capabilityProbePromise) {
        capabilityProbePromise = (async () => {
            const webgl = probeWebGLConstraints();
            const webglStatus = probeWebGLStatus();
            const isOpera = detectOperaBrowser();
            const isBrave = await detectBraveBrowser();
            const needsPrivacyOpts = isBrave || isOpera;

            const caps = {
                isBrave,
                isOpera,
                needsPrivacyOpts,
                webglStatus: webglStatus.status,
                ...webgl,
                recommendPreset: webgl.recommendPreset || (needsPrivacyOpts ? 'medium' : null)
            };

            if (typeof window !== 'undefined') {
                window._isBraveBrowser = isBrave;
                window._isOperaBrowser = isOpera;
                window._browserCapabilities = caps;
                window._webglStatus = webglStatus;
            }

            capabilityProbeResult = caps;
            return caps;
        })();
    }

    return capabilityProbePromise;
}
