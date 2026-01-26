/**
 * LanguageToggle - Button to cycle through available languages
 * Shows flag, click to cycle to next language
 */

import React from 'react';
import { useLanguage } from '../i18n';

const LanguageToggle = ({ className = '', compact = false }) => {
    const { cycleLanguage, currentLanguage } = useLanguage();

    return (
        <button
            onClick={() => {
                cycleLanguage();
                // Play a subtle click sound if available
                try {
                    const audio = new Audio('/sounds/click.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(() => {});
                } catch (e) {}
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40 hover:bg-black/60 border border-white/20 hover:border-white/40 transition-all backdrop-blur-sm ${className}`}
            title={`${currentLanguage.nativeName} - Click to change language`}
        >
            <span className="text-2xl leading-none">{currentLanguage.flag}</span>
            {!compact && (
                <span className="text-white text-sm font-medium">
                    {currentLanguage.nativeName}
                </span>
            )}
        </button>
    );
};

export default LanguageToggle;
