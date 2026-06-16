import { useState, useEffect, useCallback, useRef } from 'react';
import { playNpcBlip } from '../audio/sfx';

/**
 * Pokemon-style character-by-character text reveal with optional blips.
 */
export function useTypewriterText(fullText, { active = true, speed = 32, pitch = 1, onComplete } = {}) {
    const [index, setIndex] = useState(0);
    const [done, setDone] = useState(false);
    const completeRef = useRef(onComplete);
    completeRef.current = onComplete;

    useEffect(() => {
        if (!active) return;
        setIndex(0);
        setDone(false);
    }, [fullText, active]);

    useEffect(() => {
        if (!active || !fullText || done) return;
        if (index >= fullText.length) {
            setDone(true);
            completeRef.current?.();
            return undefined;
        }

        const ch = fullText[index];
        let delay = speed;
        if (ch === ' ') delay = speed * 0.35;
        else if (ch === ',' || ch === ';') delay = speed * 1.4;
        else if (ch === '.' || ch === '!' || ch === '?') delay = speed * 2.2;
        else if (ch === '…') delay = speed * 1.8;

        const id = setTimeout(() => {
            if (ch.trim() && !/[.,!?;…]/.test(ch)) {
                playNpcBlip(pitch);
            }
            setIndex((i) => i + 1);
        }, delay);

        return () => clearTimeout(id);
    }, [index, fullText, active, done, speed, pitch]);

    const skip = useCallback(() => {
        if (!fullText) return;
        setIndex(fullText.length);
        if (!done) {
            setDone(true);
            completeRef.current?.();
        }
    }, [fullText, done]);

    return {
        display: fullText ? fullText.slice(0, index) : '',
        isTyping: active && !done && index < (fullText?.length || 0),
        done: done || !fullText,
        skip,
    };
}
