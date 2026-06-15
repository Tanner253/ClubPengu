/**
 * Browser / GPU capability probes for automatic performance tuning.
 * Brave and Opera GX apply WebGL/canvas protections that add significant GPU overhead.
 */

export const WEBGL_STATUS = {
    OK: 'ok',
    UNAVAILABLE: 'unavailable',
    HARDWARE_DISABLED: 'hardware_disabled',
    SOFTWARE_RENDERER: 'software_renderer',
    INTEGRATED_GPU: 'integrated_gpu'
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

const INTEGRATED_GPU_PATTERNS = [
    /intel.*uhd/i,
    /intel.*hd graphics/i,
    /intel.*iris/i,
    /amd.*radeon.*graphics/i,
    /microsoft basic render/i
];

const DISCRETE_GPU_PATTERNS = [
    /nvidia/i,
    /geforce/i,
    /\brtx\b/i,
    /\bgtx\b/i,
    /radeon.*(rx|vega|pro)/i
];

/**
 * Classify the active GPU string (from WebGL debug info).
 */
export function analyzeGpuRenderer(renderer = '') {
    const name = renderer || '';
    return {
        renderer: name,
        isSoftware: isSoftwareRenderer(name),
        isIntegrated: INTEGRATED_GPU_PATTERNS.some((re) => re.test(name)),
        isDiscrete: DISCRETE_GPU_PATTERNS.some((re) => re.test(name))
    };
}

/**
 * Read the GPU actually used by a live WebGLRenderer (more accurate than pre-probe).
 */
export function readLiveWebGLInfo(renderer) {
    if (!renderer?.getContext) {
        return { renderer: '', vendor: '', analysis: analyzeGpuRenderer('') };
    }

    try {
        const gl = renderer.getContext();
        const info = readRendererString(gl);
        const vendorExt = gl.getExtension('WEBGL_debug_renderer_info');
        const vendor = vendorExt
            ? gl.getParameter(vendorExt.UNMASKED_VENDOR_WEBGL) || ''
            : '';

        const analysis = analyzeGpuRenderer(info);
        const result = { renderer: info, vendor, analysis };

        if (typeof window !== 'undefined') {
            window._liveGpuInfo = result;
            // NOTE: integrated GPUs (Intel UHD/Iris, AMD Radeon Graphics) are a
            // valid, hardware-accelerated configuration — most laptops/ThinkPads and
            // all phones use them, and adaptive resolution keeps them smooth. We only
            // escalate to a warning for genuine failures (software rasterizer); having
            // an integrated GPU is NOT an error and must not trigger the banner.
            if (analysis.isSoftware) {
                window._webglStatus = {
                    ...(window._webglStatus || probeWebGLStatus()),
                    status: WEBGL_STATUS.SOFTWARE_RENDERER,
                    softwareRenderer: true,
                    renderer: info
                };
            }
            window.dispatchEvent(new CustomEvent('liveGpuInfoReady', { detail: result }));
        }

        return result;
    } catch {
        return { renderer: '', vendor: '', analysis: analyzeGpuRenderer('') };
    }
}

/**
 * Support bundle players can paste when reporting lag (Settings → Copy diagnostics).
 */
export function buildSupportDiagnostics(extra = {}) {
    const caps = (typeof window !== 'undefined' && window._browserCapabilities) || {};
    const live = (typeof window !== 'undefined' && window._liveGpuInfo) || {};
    const webgl = (typeof window !== 'undefined' && window._webglStatus) || probeWebGLStatus();

    return {
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        platform: typeof navigator !== 'undefined' ? navigator.platform : '',
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
        screen: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
        performancePreset: typeof localStorage !== 'undefined'
            ? localStorage.getItem('waddlebet_performance')
            : null,
        webglStatus: webgl.status,
        gpuRenderer: live.renderer || caps.renderer || webgl.renderer || '',
        gpuVendor: live.vendor || '',
        isBrave: caps.isBrave,
        isOpera: caps.isOpera,
        ...extra
    };
}

export function formatSupportDiagnostics(extra = {}) {
    return JSON.stringify(buildSupportDiagnostics(extra), null, 2);
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
