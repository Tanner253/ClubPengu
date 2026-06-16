/**
 * Pokemon / Animal Crossing style speech box with typewriter text.
 */

import React from 'react';
import { useTypewriterText } from '../hooks/useTypewriterText';

export default function NpcSpeechBox({
    text = '',
    active = true,
    theme,
    npcPitch = 1,
    onComplete,
    onSkip,
    className = '',
    showPrompt = true,
}) {
    const { display, isTyping, done, skip } = useTypewriterText(text, {
        active,
        speed: 30,
        pitch: npcPitch,
        onComplete,
    });

    const handleClick = () => {
        if (isTyping) {
            skip();
            onSkip?.();
        }
    };

    const bubbleBg = theme?.bubbleBg || 'bg-slate-900/70 border-white/15';
    const accent = theme?.accent || 'text-cyan-300';

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`
                npc-speech-box group w-full text-left relative
                ${bubbleBg} border-2 rounded-xl px-4 py-3.5
                shadow-[inset_0_2px_0_rgba(255,255,255,0.06),inset_0_-3px_0_rgba(0,0,0,0.25)]
                transition-transform active:scale-[0.995] cursor-pointer
                ${className}
            `}
            aria-live="polite"
        >
            <div className="npc-speech-scanlines pointer-events-none absolute inset-0 rounded-[10px] opacity-[0.04]" />
            <p className="relative text-white/95 text-sm sm:text-[15px] leading-relaxed retro-text min-h-[2.75rem] pr-6">
                {display}
                {isTyping && (
                    <span className="npc-type-cursor inline-block w-[0.55em] h-[1em] align-[-2px] ml-0.5 bg-white/80 animate-pulse" />
                )}
            </p>
            {showPrompt && done && (
                <span
                    className={`npc-speech-prompt absolute bottom-2 right-3 text-xs ${accent} opacity-90`}
                    aria-hidden
                >
                    ▼
                </span>
            )}
            {isTyping && (
                <span className="absolute bottom-2 right-3 text-[10px] text-white/30 uppercase tracking-wider">
                    tap
                </span>
            )}
        </button>
    );
}

/** Stable pitch multiplier from NPC / merchant id (each character sounds slightly different). */
export function npcPitchFromId(id) {
    if (!id) return 1;
    let h = 0;
    const s = String(id);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return 0.88 + (Math.abs(h) % 28) / 100;
}
