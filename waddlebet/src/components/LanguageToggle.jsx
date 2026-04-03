/**
 * Language picker: horizontal flag bar on desktop; compact + expandable grid on mobile.
 * Settings can pass variant="inline" for a wrapped grid without overlay.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../i18n';

const playClick = () => {
    try {
        const audio = new Audio('/sounds/click.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {});
    } catch (e) {}
};

const LanguageToggle = ({
    className = '',
    compact = false,
    variant = 'auto',
    isMobile: isMobileProp,
}) => {
    const { setLanguage, currentLanguage, language, t, availableLanguages } = useLanguage();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );

    useEffect(() => {
        if (isMobileProp !== undefined) {
            setIsMobile(isMobileProp);
            return;
        }
        const onResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [isMobileProp]);

    const langs = Object.values(availableLanguages || {});

    const selectLang = useCallback(
        (code) => {
            setLanguage(code);
            playClick();
            setMobileOpen(false);
        },
        [setLanguage]
    );

    const showBar = variant === 'bar' || (variant === 'auto' && !isMobile);
    const showSheet = variant === 'sheet' || (variant === 'auto' && isMobile);
    const inlineSettings = variant === 'inline';

    const flagImg = (langInfo, sizeClass) => {
        const fc = langInfo.flagCode || 'us';
        return (
            <img
                src={`https://flagcdn.com/w40/${fc}.png`}
                srcSet={`https://flagcdn.com/w80/${fc}.png 2x`}
                alt=""
                width={40}
                height={27}
                loading="lazy"
                decoding="async"
                className={`object-cover rounded shadow-sm ${sizeClass}`}
            />
        );
    };

    const flagBtn = (langInfo, small) => {
        const active = language === langInfo.code;
        return (
            <button
                key={langInfo.code}
                type="button"
                onClick={() => selectLang(langInfo.code)}
                className={`flex items-center justify-center rounded-lg border transition-all backdrop-blur-sm overflow-hidden ${
                    small ? 'w-9 h-9 p-0.5' : 'w-11 h-11 p-1'
                } ${
                    active
                        ? 'bg-cyan-500/40 border-cyan-400/80 ring-1 ring-cyan-300/50'
                        : 'bg-black/40 hover:bg-black/60 border-white/20 hover:border-white/40'
                }`}
                title={`${langInfo.nativeName} (${langInfo.name})`}
                aria-pressed={active}
                aria-label={langInfo.nativeName}
            >
                {flagImg(langInfo, small ? 'w-full h-full min-h-0' : 'w-full h-full min-h-0')}
            </button>
        );
    };

    if (inlineSettings) {
        return (
            <div className={`flex flex-wrap gap-2 ${className}`}>
                {langs.map((L) => flagBtn(L, true))}
            </div>
        );
    }

    if (showBar) {
        return (
            <div
                className={`flex flex-row flex-wrap items-center gap-1.5 sm:gap-2 ${className}`}
                role="group"
                aria-label={t('menu.language')}
            >
                {langs.map((L) => flagBtn(L, compact))}
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => {
                    setMobileOpen((o) => !o);
                    playClick();
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 transition-all backdrop-blur-sm"
                aria-expanded={mobileOpen}
                aria-haspopup="dialog"
                title={t('menu.languagePickerTitle')}
                aria-label={t('menu.languagePickerTitle')}
            >
                <span className="flex h-7 w-10 shrink-0 overflow-hidden rounded shadow-sm ring-1 ring-white/10">
                    {flagImg(currentLanguage, 'w-full h-full object-cover')}
                </span>
                <span className="text-white/50 text-xs">{mobileOpen ? '▲' : '▼'}</span>
            </button>

            {mobileOpen && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-[60] bg-black/50 sm:hidden"
                        aria-label={t('ui.close')}
                        onClick={() => setMobileOpen(false)}
                    />
                    <div
                        className="fixed left-1/2 top-1/2 z-[70] w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md sm:absolute sm:inset-auto sm:bottom-full sm:left-0 sm:mb-2 sm:translate-x-0 sm:translate-y-0 sm:w-auto"
                        role="dialog"
                        aria-label={t('menu.languagePickerTitle')}
                    >
                        <span className="sr-only">{t('menu.languagePickerTitle')}</span>
                        <div className="grid grid-cols-5 gap-2">{langs.map((L) => flagBtn(L, true))}</div>
                    </div>
                </>
            )}
        </div>
    );
};

export default LanguageToggle;
