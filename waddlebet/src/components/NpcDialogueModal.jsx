/**
 * NpcDialogueModal — RPG-style merchant dialogue & shop menu.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks';
import { getMerchant } from '../config/merchants';
import { getNpcDisplayName, getNpcTitle } from '../config/worldNpcs';

const MERCHANT_THEMES = {
    fish_buyer: {
        stallName: "Salty's Fish Stand",
        stallIcon: '🐟',
        panelBg: 'from-[#1a1208] via-[#2a1a0a] to-[#120a04]',
        banner: 'from-amber-500 via-yellow-500 to-orange-500',
        bannerText: 'text-amber-950',
        accent: 'text-amber-300',
        accentMuted: 'text-amber-200/70',
        glow: 'rgba(251, 191, 36, 0.35)',
        frameBorder: 'border-amber-400/60',
        bubbleBg: 'bg-amber-950/50 border-amber-500/30',
        choiceBg: 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/25 hover:border-amber-400/50',
        choiceDisabled: 'bg-black/30 border-white/5',
        badge: 'bg-amber-500/20 border-amber-400/40 text-amber-200',
        portraitRing: 'from-amber-400 to-orange-600',
        loreBg: 'bg-[#1f1408]/80 border-amber-600/30'
    },
    supply_merchant: {
        stallName: "Clive's Supply",
        stallIcon: '🔧',
        panelBg: 'from-[#141008] via-[#1f150c] to-[#0a0806]',
        banner: 'from-orange-500 via-amber-600 to-yellow-700',
        bannerText: 'text-orange-950',
        accent: 'text-orange-300',
        accentMuted: 'text-orange-200/70',
        glow: 'rgba(234, 88, 12, 0.35)',
        frameBorder: 'border-orange-400/60',
        bubbleBg: 'bg-orange-950/50 border-orange-500/30',
        choiceBg: 'bg-orange-950/40 hover:bg-orange-900/60 border-orange-500/25 hover:border-orange-400/50',
        choiceDisabled: 'bg-black/30 border-white/5',
        badge: 'bg-orange-500/20 border-orange-400/40 text-orange-200',
        portraitRing: 'from-orange-400 to-amber-700',
        loreBg: 'bg-[#1a1008]/80 border-orange-600/30'
    },
    default: {
        stallName: 'Merchant',
        stallIcon: '🐧',
        panelBg: 'from-slate-900 via-slate-800 to-slate-950',
        banner: 'from-cyan-500 to-teal-600',
        bannerText: 'text-cyan-950',
        accent: 'text-cyan-300',
        accentMuted: 'text-cyan-200/70',
        glow: 'rgba(34, 211, 238, 0.25)',
        frameBorder: 'border-cyan-400/50',
        bubbleBg: 'bg-slate-900/60 border-cyan-500/25',
        choiceBg: 'bg-slate-800/50 hover:bg-slate-700/60 border-cyan-500/20 hover:border-cyan-400/40',
        choiceDisabled: 'bg-black/30 border-white/5',
        badge: 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200',
        portraitRing: 'from-cyan-400 to-teal-600',
        loreBg: 'bg-slate-900/80 border-cyan-600/25'
    }
};

function resolveActionState(action, { hasSellableFish, nextUpgrade, coins }) {
    let disabled = Boolean(action.disabled);
    let label = action.label;
    let sublabel = null;
    let costBadge = null;

    if (action.requiresFish && !hasSellableFish) {
        disabled = true;
        sublabel = 'Nothing to sell';
    }
    if (action.requiresUpgrade && action.id === 'upgrade_backpack') {
        if (!nextUpgrade) {
            disabled = true;
            label = 'Backpack maxed out';
            sublabel = 'All slots unlocked';
        } else {
            costBadge = `${nextUpgrade.cost.toLocaleString()}g`;
            sublabel = `+${nextUpgrade.slotsAdded} slots → ${nextUpgrade.nextSlots} total`;
            if (coins < nextUpgrade.cost) {
                disabled = true;
                sublabel = `Need ${nextUpgrade.cost.toLocaleString()}g (you have ${coins.toLocaleString()}g)`;
            }
        }
    }

    return { disabled, label, sublabel, costBadge };
}

export default function NpcDialogueModal({
    isOpen,
    npcDef,
    onClose,
    onAction,
    gameInventory,
    coins = 0
}) {
    const [loreText, setLoreText] = useState(null);
    const [actionFeedback, setActionFeedback] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    useEscapeKey(onClose, isOpen);

    const merchant = useMemo(() => getMerchant(npcDef?.merchantId), [npcDef?.merchantId]);
    const theme = MERCHANT_THEMES[npcDef?.merchantId] || MERCHANT_THEMES.default;
    const name = getNpcDisplayName(npcDef);
    const title = getNpcTitle(npcDef);

    const greeting = useMemo(() => {
        const lines = npcDef?.greetings || [];
        if (!lines.length) return merchant?.greeting || '...';
        return lines[Math.floor(Math.random() * lines.length)];
    }, [npcDef, merchant, isOpen]);

    const hasSellableFish = useMemo(() => (
        gameInventory?.slots?.some(s => s?.itemId && s.quantity > 0 && s.category === 'fish' && s.npcValue > 0)
    ), [gameInventory]);

    const nextUpgrade = gameInventory?.nextUpgrade;

    const menuActions = useMemo(
        () => (npcDef?.actions || []).filter(a => a.id !== 'close'),
        [npcDef?.actions]
    );

    const handleAction = useCallback(async (action) => {
        setLoreText(null);
        setActionFeedback(null);

        if (action.id === 'close') {
            onClose?.();
            return;
        }
        if (action.loreText) {
            setLoreText(action.loreText);
            return;
        }
        if (action.id === 'upgrade_backpack') {
            setPendingAction(action.id);
            const result = await onAction?.('upgrade_backpack', npcDef);
            setPendingAction(null);
            if (result?.unlockedSlots) {
                setActionFeedback(`🎒 Backpack expanded to ${result.unlockedSlots} slots!`);
            } else if (result?.message) {
                setActionFeedback(result.message);
            } else if (result?.error) {
                setActionFeedback(result.message || result.error);
            }
            return;
        }
        if (action.id === 'open_backpack') {
            onAction?.('open_backpack', npcDef);
            onClose?.();
            return;
        }
        onAction?.(action.id, npcDef);
    }, [npcDef, onAction, onClose]);

    if (!isOpen || !npcDef) return null;

    return createPortal(
        <div className="npc-dialogue-overlay fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-3 sm:p-6 pointer-events-none">
            <button
                type="button"
                className="absolute inset-0 bg-black/50 backdrop-blur-[2px] pointer-events-auto"
                onClick={onClose}
                aria-label="Close dialogue"
            />

            <div
                className={`npc-dialogue-panel pointer-events-auto relative w-full max-w-lg animate-slide-up sm:animate-fade-in bg-gradient-to-b ${theme.panelBg} border-2 ${theme.frameBorder} rounded-2xl overflow-hidden`}
                style={{ boxShadow: `0 0 0 1px rgba(0,0,0,0.5), 0 8px 0 rgba(0,0,0,0.45), 0 0 40px ${theme.glow}, 0 20px 60px rgba(0,0,0,0.6)` }}
            >
                {/* Stall banner ribbon */}
                <div className={`relative bg-gradient-to-r ${theme.banner} px-4 py-2 flex items-center justify-between`}>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0 drop-shadow">{theme.stallIcon}</span>
                        <span className={`font-black retro-text text-sm sm:text-base uppercase tracking-wide truncate ${theme.bannerText}`}>
                            {theme.stallName}
                        </span>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${theme.badge} shrink-0`}>
                        <span className="text-sm">🪙</span>
                        <span className="font-bold retro-text text-sm tabular-nums">{coins.toLocaleString()}</span>
                    </div>
                </div>

                {/* NPC header + speech */}
                <div className="px-4 pt-4 pb-3">
                    <div className="flex gap-3 items-start mb-3">
                        <div
                            className={`shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${theme.portraitRing} p-[2px] shadow-lg`}
                            style={{ boxShadow: `0 4px 12px ${theme.glow}` }}
                        >
                            <div className="w-full h-full rounded-[10px] bg-black/40 flex items-center justify-center text-3xl">
                                {merchant?.emoji || theme.stallIcon}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h2 className={`font-black retro-text text-lg leading-tight ${theme.accent}`}>{name}</h2>
                            <p className={`text-xs font-semibold uppercase tracking-wider ${theme.accentMuted}`}>{title}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="shrink-0 w-8 h-8 rounded-lg bg-black/30 hover:bg-black/50 border border-white/10 text-white/50 hover:text-white text-sm transition-colors"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    <div className={`relative ${theme.bubbleBg} border rounded-xl px-4 py-3 npc-speech-bubble`}>
                        <p className="text-white/90 text-sm leading-relaxed retro-text">
                            {greeting}
                        </p>
                    </div>
                </div>

                {/* Lore / feedback */}
                {(loreText || actionFeedback) && (
                    <div className="px-4 pb-2 space-y-2">
                        {loreText && (
                            <div className={`${theme.loreBg} border rounded-xl px-3 py-2.5 text-xs text-white/80 leading-relaxed`}>
                                <span className={`${theme.accent} font-bold text-[10px] uppercase tracking-wider block mb-1`}>📜 Tip</span>
                                {loreText}
                            </div>
                        )}
                        {actionFeedback && (
                            <div className={`npc-feedback-pop px-3 py-2 rounded-xl border ${theme.badge} text-sm font-bold retro-text text-center`}>
                                {actionFeedback}
                            </div>
                        )}
                    </div>
                )}

                {/* Menu choices */}
                <div className="px-4 pb-2">
                    <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${theme.accentMuted}`}>
                        What would you like?
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {menuActions.map((action, index) => {
                            const { disabled, label, sublabel, costBadge } = resolveActionState(action, {
                                hasSellableFish,
                                nextUpgrade,
                                coins
                            });
                            const isPending = pendingAction === action.id;

                            return (
                                <button
                                    key={action.id}
                                    type="button"
                                    disabled={disabled || isPending}
                                    onClick={() => handleAction(action)}
                                    className={`
                                        npc-choice-btn group w-full text-left rounded-xl border-2 px-3 py-2.5
                                        transition-all duration-150 active:translate-y-[2px]
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0
                                        ${disabled ? theme.choiceDisabled : theme.choiceBg}
                                    `}
                                    style={disabled ? undefined : { boxShadow: '0 3px 0 rgba(0,0,0,0.35)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`
                                                shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black
                                                ${disabled ? 'bg-white/5 text-white/30' : `bg-black/30 ${theme.accent}`}
                                            `}
                                        >
                                            {isPending ? '…' : index + 1}
                                        </span>
                                        <span className="text-xl shrink-0">{action.icon || '▸'}</span>
                                        <div className="flex-1 min-w-0">
                                            <span className={`block text-sm font-bold retro-text ${disabled ? 'text-white/40' : 'text-white'}`}>
                                                {label}
                                            </span>
                                            {sublabel && (
                                                <span className={`block text-[11px] mt-0.5 ${disabled ? 'text-red-300/80' : theme.accentMuted}`}>
                                                    {sublabel}
                                                </span>
                                            )}
                                        </div>
                                        {costBadge && !disabled && (
                                            <span className={`shrink-0 px-2 py-0.5 rounded-md border text-xs font-bold ${theme.badge}`}>
                                                {costBadge}
                                            </span>
                                        )}
                                        {!disabled && (
                                            <span className={`shrink-0 text-lg opacity-0 group-hover:opacity-100 transition-opacity ${theme.accent}`}>
                                                ›
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-white/5 bg-black/25 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => handleAction({ id: 'close' })}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors retro-text"
                    >
                        👋 Walk away
                    </button>
                    <span className="text-[10px] text-white/25 uppercase tracking-wider hidden sm:inline">
                        Esc to close
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
}
