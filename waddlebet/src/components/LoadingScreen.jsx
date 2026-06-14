/**
 * Full-screen entry loading (GTA-style art + reassuring copy). Uses /advert.jpg.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '../i18n';

const TIP_KEYS = ['loading.tip1', 'loading.tip2', 'loading.tip3', 'loading.tip4'];

const LoadingScreen = ({ visible }) => {
    const { t } = useLanguage();
    const [dots, setDots] = useState(0);
    const [tipIndex, setTipIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [slowLoad, setSlowLoad] = useState(false);

    const tips = useMemo(() => TIP_KEYS.map((k) => t(k)), [t]);

    useEffect(() => {
        if (!visible) {
            setSlowLoad(false);
            return undefined;
        }
        const timer = setTimeout(() => setSlowLoad(true), 25000);
        return () => clearTimeout(timer);
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        const a = setInterval(() => setDots((d) => (d + 1) % 4), 400);
        return () => clearInterval(a);
    }, [visible]);

    // Real build progress from the chunked world loader (monotonic — never goes backwards)
    useEffect(() => {
        if (!visible) {
            setProgress(0);
            return undefined;
        }
        const onProgress = (e) => {
            const p = e.detail?.progress;
            if (typeof p === 'number') {
                setProgress((prev) => Math.max(prev, Math.min(1, p)));
            }
        };
        window.addEventListener('worldLoadProgress', onProgress);
        return () => window.removeEventListener('worldLoadProgress', onProgress);
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        const b = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 2800);
        return () => clearInterval(b);
    }, [visible, tips.length]);

    if (!visible) return null;

    const dotStr = '.'.repeat(dots);

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url(/advert.jpg)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/40" />
            <div className="absolute left-4 top-4 z-10 font-black tracking-tight text-white/90 drop-shadow-lg retro-text text-sm sm:text-base">
                {t('loading.brand')}
            </div>
            <div className="relative z-10 mt-auto flex flex-col justify-end px-4 pb-10 pt-24 sm:px-8 sm:pb-14">
                <div className="mx-auto w-full max-w-2xl">
                    <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-white/50">
                        {t('loading.title')}
                        {dotStr}
                    </div>
                    <h2 className="mb-3 text-xl font-black text-white drop-shadow sm:text-2xl">
                        {t('loading.subtitle')}
                    </h2>
                    <p className="min-h-[3rem] text-sm leading-relaxed text-white/85 sm:text-base">
                        {tips[tipIndex]}
                    </p>
                    <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className="h-full animate-pulse rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-[width] duration-300 ease-out"
                            style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-white/55 sm:text-sm">{t('loading.footer')}</p>
                    {slowLoad && (
                        <p className="mt-3 text-xs leading-relaxed text-amber-200/90 sm:text-sm">
                            {t('loading.slowHint')}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
