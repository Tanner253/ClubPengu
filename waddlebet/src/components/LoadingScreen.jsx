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

    const tips = useMemo(() => TIP_KEYS.map((k) => t(k)), [t]);

    useEffect(() => {
        if (!visible) return;
        const a = setInterval(() => setDots((d) => (d + 1) % 4), 400);
        return () => clearInterval(a);
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
                    <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/5 animate-pulse rounded-full bg-gradient-to-r from-cyan-500 to-purple-500" />
                    </div>
                    <p className="mt-4 text-xs text-white/55 sm:text-sm">{t('loading.footer')}</p>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
