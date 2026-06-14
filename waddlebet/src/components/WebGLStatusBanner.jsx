/**
 * WebGLStatusBanner — warns on the penguin creator when WebGL / GPU acceleration is unavailable.
 */

import React, { useEffect, useState } from 'react';
import {
    probeWebGLStatus,
    WEBGL_STATUS,
    initBrowserCapabilities,
    getWebGLFixSteps
} from '../utils/browserCapabilities.js';
import { useLanguage } from '../i18n';

const ISSUE_META = {
    [WEBGL_STATUS.UNAVAILABLE]: {
        titleKey: 'creator.webgl.unavailable.title',
        descKey: 'creator.webgl.unavailable.desc',
        severity: 'error'
    },
    [WEBGL_STATUS.HARDWARE_DISABLED]: {
        titleKey: 'creator.webgl.noHardware.title',
        descKey: 'creator.webgl.noHardware.desc',
        severity: 'error'
    },
    [WEBGL_STATUS.SOFTWARE_RENDERER]: {
        titleKey: 'creator.webgl.software.title',
        descKey: 'creator.webgl.software.desc',
        severity: 'warning'
    }
};

const STEP_KEYS = {
    enableHardwareAcceleration: 'creator.webgl.fixEnableHw',
    updateGraphicsDrivers: 'creator.webgl.fixUpdateDrivers',
    disableWebglBlockers: 'creator.webgl.fixDisableBlockers',
    restartBrowser: 'creator.webgl.fixRestart'
};

const HINT_KEYS = {
    brave: 'creator.webgl.hintBrave',
    opera: 'creator.webgl.hintOpera'
};

const WebGLStatusBanner = () => {
    const { t } = useLanguage();
    const [issue, setIssue] = useState(null);
    const [browserHint, setBrowserHint] = useState(null);
    const [fixSteps, setFixSteps] = useState([]);

    useEffect(() => {
        const status = probeWebGLStatus();
        if (status.status === WEBGL_STATUS.OK) {
            setIssue(null);
            return;
        }

        setIssue(status);

        initBrowserCapabilities().then((caps) => {
            const { steps, browserHint: hint } = getWebGLFixSteps(caps);
            setFixSteps(steps);
            setBrowserHint(hint);
        }).catch(() => {
            setFixSteps(getWebGLFixSteps().steps);
        });
    }, []);

    if (!issue || issue.status === WEBGL_STATUS.OK) {
        return null;
    }

    const meta = ISSUE_META[issue.status];
    if (!meta) return null;

    const isError = meta.severity === 'error';
    const panelClass = isError
        ? 'border-red-500/50 bg-red-950/90'
        : 'border-amber-500/50 bg-amber-950/90';
    const titleClass = isError ? 'text-red-200' : 'text-amber-200';

    return (
        <div className="absolute inset-x-3 top-20 z-30 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:max-w-lg sm:w-full">
            <div className={`pointer-events-auto rounded-2xl border p-4 shadow-2xl backdrop-blur-md ${panelClass}`}>
                <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0" aria-hidden>
                        {isError ? '🚫' : '⚠️'}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className={`text-sm font-bold sm:text-base ${titleClass}`}>
                            {t(meta.titleKey)}
                        </h2>
                        <p className="mt-1 text-xs text-white/75 sm:text-sm">
                            {t(meta.descKey)}
                        </p>

                        <div className="mt-3 rounded-xl bg-black/30 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                                {t('creator.webgl.howToFix')}
                            </p>
                            <ol className="mt-2 list-decimal list-inside space-y-1.5 text-xs text-white/80 sm:text-sm">
                                {fixSteps.map((step) => (
                                    <li key={step}>{t(STEP_KEYS[step])}</li>
                                ))}
                            </ol>
                            {browserHint && HINT_KEYS[browserHint] && (
                                <p className="mt-2 text-xs text-cyan-200/90 sm:text-sm">
                                    {t(HINT_KEYS[browserHint])}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebGLStatusBanner;
