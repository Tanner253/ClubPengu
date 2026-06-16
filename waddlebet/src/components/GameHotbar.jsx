/**
 * GameHotbar — hand slots for world interactions (tools, fish, wood, etc.)
 */

import React, { useCallback, useEffect } from 'react';
import { useMultiplayer } from '../multiplayer';
import { HOTBAR_SIZE, playHotbarEquipSound } from '../utils/gameHotbar';

function DurabilityBar({ durability, maxDurability }) {
    if (maxDurability == null || durability == null) return null;
    const pct = Math.max(0, Math.min(100, (durability / maxDurability) * 100));
    const color = pct > 50 ? 'bg-emerald-400' : pct > 20 ? 'bg-amber-400' : 'bg-red-500';
    return (
        <div className="absolute bottom-0.5 left-0.5 right-0.5 h-1 rounded-full bg-black/50 overflow-hidden pointer-events-none">
            <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export default function GameHotbar({ className = '', inventoryMode = false }) {
    const {
        gameInventory,
        isAuthenticated,
        setGameHotbarSlot,
        setActiveHotbarSlot
    } = useMultiplayer();

    const hotbar = gameInventory?.hotbar || [];
    const activeHotbar = gameInventory?.activeHotbar ?? 0;

    const selectHotbarSlot = useCallback((index) => {
        const entry = hotbar[index];
        const slotHasItem = Boolean(entry?.itemId) && Number(entry?.quantity) > 0;
        if (index !== activeHotbar && slotHasItem) {
            playHotbarEquipSound(entry.itemId);
        }
        setActiveHotbarSlot?.(index);
    }, [hotbar, activeHotbar, setActiveHotbarSlot]);

    const handleSlotClick = useCallback((index) => {
        const entry = hotbar[index];
        const slotHasItem = Boolean(entry?.itemId) && Number(entry?.quantity) > 0;
        if (inventoryMode && slotHasItem) {
            setGameHotbarSlot?.(index, null);
            return;
        }
        selectHotbarSlot(index);
    }, [hotbar, inventoryMode, setGameHotbarSlot, selectHotbarSlot]);

    const handleClearSlot = useCallback((e, index) => {
        e.preventDefault();
        setGameHotbarSlot?.(index, null);
    }, [setGameHotbarSlot]);

    useEffect(() => {
        if (!isAuthenticated) return undefined;

        const onKeyDown = (e) => {
            if (e.repeat || isTypingTarget(e.target)) return;
            const num = Number(e.key);
            if (num >= 1 && num <= HOTBAR_SIZE) {
                e.preventDefault();
                selectHotbarSlot(num - 1);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isAuthenticated, selectHotbarSlot]);

    if (!isAuthenticated) return null;

    return (
        <div
            className={`flex items-center justify-center gap-1.5 pointer-events-auto ${className}`}
            aria-label="Hand hotbar"
        >
            {Array.from({ length: HOTBAR_SIZE }, (_, index) => {
                const entry = hotbar[index];
                const hasItem = Boolean(entry?.itemId) && Number(entry?.quantity) > 0;
                const isActive = activeHotbar === index;
                const durability = entry?.durability ?? entry?.metadata?.durability;
                const maxDurability = entry?.maxDurability ?? entry?.metadata?.maxDurability;
                const slotLabel = index + 1;

                return (
                    <button
                        key={index}
                        type="button"
                        data-hotbar-slot={index}
                        onClick={() => handleSlotClick(index)}
                        onContextMenu={(e) => handleClearSlot(e, index)}
                        title={hasItem
                            ? inventoryMode
                                ? `[${slotLabel}] ${entry.name} — tap to unequip`
                                : `[${slotLabel}] ${entry.name}${durability != null ? ` (${durability}/${maxDurability})` : ''} — right-click to unequip`
                            : `[${slotLabel}] Empty hand slot — drag an item here`}
                        className={[
                            'hotbar-slot relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg border-2 transition-all touch-manipulation',
                            'bg-slate-900/80 backdrop-blur-sm',
                            isActive ? 'border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.45)] scale-105' : 'border-slate-600/70 hover:border-slate-400/80 active:scale-95',
                            !hasItem ? 'border-dashed opacity-80' : ''
                        ].join(' ')}
                    >
                        <span className={`absolute top-0.5 left-1 text-[9px] font-bold pointer-events-none ${isActive ? 'text-cyan-300' : 'text-slate-500'}`}>
                            {slotLabel}
                        </span>
                        {hasItem ? (
                            <>
                                <span className="text-xl sm:text-2xl leading-none select-none pointer-events-none mt-1">
                                    {entry.emoji || '📦'}
                                </span>
                                <DurabilityBar durability={durability} maxDurability={maxDurability} />
                            </>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );
}
