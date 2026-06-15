/**
 * BackpackModal — Grid inventory for gameplay items (fish, resources, gear).
 * Separate from cosmetic InventoryModal (gacha wardrobe).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMultiplayer } from '../multiplayer';
import { useEscapeKey } from '../hooks';
import { getMerchant } from '../config/merchants';
import { GAME_INVENTORY } from '../config/economy';

const RARITY_STYLES = {
    common: { color: '#9CA3AF', bg: 'bg-gray-500/20', border: 'border-gray-500/40' },
    uncommon: { color: '#22C55E', bg: 'bg-green-500/20', border: 'border-green-500/40' },
    rare: { color: '#3B82F6', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
    epic: { color: '#A855F7', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
    legendary: { color: '#FBBF24', bg: 'bg-amber-500/20', border: 'border-amber-500/40' }
};

const FISH_BUYER = getMerchant('fish_buyer');

function slotHasItem(slot) {
    return Boolean(slot?.itemId) && Number(slot?.quantity) > 0;
}

export default function GameInventoryModal({ isOpen, onClose, sellMerchantId = null }) {
    const {
        gameInventory,
        backpackError,
        fetchGameInventory,
        moveGameInventorySlot,
        sellAtMerchant,
        isAuthenticated
    } = useMultiplayer();

    const canSell = sellMerchantId === 'fish_buyer';
    const sellMerchant = canSell ? getMerchant(sellMerchantId) : null;

    const [selectedSlot, setSelectedSlot] = useState(null);
    const [dragSource, setDragSource] = useState(null);
    const [hoverSlot, setHoverSlot] = useState(null);
    const [sellFeedback, setSellFeedback] = useState(null);
    const dragMovedRef = useRef(false);
    const dragSourceRef = useRef(null);
    const hoverSlotRef = useRef(null);

    useEscapeKey(onClose, isOpen);

    useEffect(() => {
        if (isOpen && isAuthenticated) {
            fetchGameInventory?.();
        }
    }, [isOpen, isAuthenticated, fetchGameInventory]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedSlot(null);
            setDragSource(null);
            setHoverSlot(null);
            setSellFeedback(null);
        }
    }, [isOpen]);

    useEffect(() => {
        dragSourceRef.current = dragSource;
    }, [dragSource]);

    useEffect(() => {
        hoverSlotRef.current = hoverSlot;
    }, [hoverSlot]);

    useEffect(() => {
        if (dragSource === null) return undefined;

        const finishDrag = () => {
            const from = dragSourceRef.current;
            const to = hoverSlotRef.current;
            if (from !== null && to !== null && from !== to && dragMovedRef.current) {
                moveGameInventorySlot?.(from, to);
                setSelectedSlot(to);
            } else if (from !== null && !dragMovedRef.current) {
                setSelectedSlot(from);
            }
            setDragSource(null);
            setHoverSlot(null);
            dragMovedRef.current = false;
        };

        window.addEventListener('pointerup', finishDrag);
        window.addEventListener('pointercancel', finishDrag);
        return () => {
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('pointercancel', finishDrag);
        };
    }, [dragSource, moveGameInventorySlot]);

    const columns = gameInventory?.columns || GAME_INVENTORY.COLUMNS;
    const rows = gameInventory?.rows || GAME_INVENTORY.DISPLAY_ROWS;
    const maxSlots = gameInventory?.maxSlots || GAME_INVENTORY.MAX_SLOTS;
    const unlockedSlots = gameInventory?.unlockedSlots ?? gameInventory?.slotCount ?? GAME_INVENTORY.DEFAULT_SLOTS;
    const storedSlots = gameInventory?.slots || [];
    const progress = gameInventory?.fishingProgress;
    const nextUpgrade = gameInventory?.nextUpgrade;

    const displayCells = useMemo(() => {
        return Array.from({ length: maxSlots }, (_, index) => {
            if (index >= unlockedSlots) {
                return { index, locked: true, slot: null };
            }
            const slot = storedSlots[index] || { itemId: null, quantity: 0 };
            return { index, locked: false, slot };
        });
    }, [maxSlots, unlockedSlots, storedSlots]);

    const selected = selectedSlot != null && selectedSlot < unlockedSlots
        ? storedSlots[selectedSlot]
        : null;

    const selectedStyle = useMemo(() => {
        const rarity = selected?.rarity || 'common';
        return RARITY_STYLES[rarity] || RARITY_STYLES.common;
    }, [selected?.rarity]);

    const stackTotalValue = selected?.npcValue > 0 && selected?.quantity
        ? selected.npcValue * selected.quantity
        : 0;

    const handlePointerDown = useCallback((e, index, hasItem, locked) => {
        if (locked || !hasItem) return;
        e.preventDefault();
        dragMovedRef.current = false;
        setDragSource(index);
        setHoverSlot(index);
        setSelectedSlot(index);
    }, []);

    const handlePointerMove = useCallback(() => {
        if (dragSourceRef.current !== null) {
            dragMovedRef.current = true;
        }
    }, []);

    const handleSell = useCallback(async (quantity = 1) => {
        if (!canSell || selectedSlot == null) return;
        const slot = storedSlots[selectedSlot];
        if (!slotHasItem(slot) || slot.category !== 'fish') return;

        const sellQty = Math.min(quantity, slot.quantity || 1);
        const result = await sellAtMerchant?.(sellMerchantId, selectedSlot, sellQty);
        if (result?.goldEarned) {
            const merchant = result.merchantName || sellMerchant?.name || 'merchant';
            setSellFeedback(`+${result.goldEarned}g from ${merchant}`);
            setTimeout(() => setSellFeedback(null), 2500);
        } else if (result?.message || result?.error) {
            setSellFeedback(result.message || result.error);
            setTimeout(() => setSellFeedback(null), 3000);
        }
        if (result?.inventory) {
            const newQty = result.inventory.slots?.[selectedSlot]?.quantity || 0;
            if (newQty <= 0) setSelectedSlot(null);
        }
    }, [canSell, sellMerchantId, selectedSlot, storedSlots, sellAtMerchant, sellMerchant]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-500/40 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🎒</span>
                        <div>
                            <h2 className="text-cyan-300 font-bold retro-text text-sm">
                                {canSell ? `Sell to ${sellMerchant?.name || 'Merchant'}` : 'Backpack'}
                            </h2>
                            <p className="text-gray-400 text-xs">
                                {gameInventory?.usedSlots ?? 0} / {unlockedSlots} slots
                                {progress ? ` · Fishing Lv.${progress.skillLevel}` : ''}
                                {canSell ? ' · Select fish to sell' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl px-2"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {backpackError && (
                    <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-red-900/40 border border-red-500/40 text-red-300 text-xs">
                        {backpackError === 'NOT_AUTHENTICATED'
                            ? 'Connect your wallet to store fish in your backpack'
                            : `Backpack error: ${backpackError}`}
                    </div>
                )}

                {!isAuthenticated && (
                    <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-500/40 text-amber-200 text-xs">
                        Demo mode — connect your wallet to keep catches in your backpack.
                    </div>
                )}

                {isAuthenticated && !backpackError && (gameInventory?.usedSlots ?? 0) === 0 && (
                    <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-600/40 text-gray-400 text-xs">
                        Empty — catch fish at the ice pond, then sell them to Old Salty.
                    </div>
                )}

                <div className="p-4 overflow-y-auto flex-1">
                    <div
                        className="grid gap-1.5 select-none touch-none"
                        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                    >
                        {displayCells.slice(0, columns * rows).map(({ index, locked, slot }) => {
                            const hasItem = !locked && slotHasItem(slot);
                            const isSelected = selectedSlot === index;
                            const isDragging = dragSource === index;
                            const isHover = hoverSlot === index && dragSource !== null && dragSource !== index;

                            return (
                                <button
                                    key={index}
                                    type="button"
                                    disabled={locked}
                                    onPointerDown={(e) => handlePointerDown(e, index, hasItem, locked)}
                                    onPointerMove={handlePointerMove}
                                    onPointerEnter={() => {
                                        if (!locked && dragSourceRef.current !== null) setHoverSlot(index);
                                    }}
                                    className={`
                                        aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                                        relative transition-colors min-h-[36px]
                                        ${locked
                                            ? 'border-slate-700/40 bg-slate-900/80 opacity-40 cursor-not-allowed'
                                            : isSelected
                                                ? 'border-amber-400 bg-amber-900/30'
                                                : 'border-slate-600/50 bg-slate-800/60'}
                                        ${isDragging ? 'ring-2 ring-cyan-400 opacity-80 scale-95' : ''}
                                        ${isHover ? 'border-green-400 bg-green-900/30' : ''}
                                        ${hasItem ? 'hover:border-cyan-400/60 cursor-grab active:cursor-grabbing' : !locked ? 'opacity-80' : ''}
                                    `}
                                    title={
                                        locked
                                            ? 'Locked — visit Copper Clive to upgrade'
                                            : hasItem
                                                ? `${slot.name} ×${slot.quantity}`
                                                : 'Empty slot'
                                    }
                                >
                                    {locked ? (
                                        <span className="text-base opacity-60 pointer-events-none">🔒</span>
                                    ) : hasItem ? (
                                        <>
                                            <span
                                                className="text-2xl leading-none pointer-events-none select-none"
                                                role="img"
                                                aria-label={slot.name}
                                            >
                                                {slot.emoji || '📦'}
                                            </span>
                                            {slot.quantity > 1 && (
                                                <span className="absolute bottom-0.5 right-1 text-[10px] text-white font-bold pointer-events-none bg-black/50 rounded px-0.5">
                                                    {slot.quantity}
                                                </span>
                                            )}
                                        </>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>

                    <p className="text-gray-500 text-[10px] mt-2 text-center">
                        Drag items between slots to move or merge · Click to inspect
                    </p>

                    {nextUpgrade && (
                        <p className="mt-3 text-center text-xs text-gray-400">
                            Need more space? Talk to{' '}
                            <span className="text-amber-300 font-bold">Copper Clive</span>
                            {' '}at his supply stall —{' '}
                            <span className="text-cyan-300">{nextUpgrade.nextSlots} slots for {nextUpgrade.cost.toLocaleString()}g</span>
                        </p>
                    )}
                </div>

                <div className="px-4 py-3 border-t border-cyan-500/20 bg-black/30">
                    {selected && slotHasItem(selected) ? (
                        <div className={`rounded-xl border p-3 ${selectedStyle.bg} ${selectedStyle.border}`}>
                            <div className="flex items-start gap-3">
                                <span className="text-4xl shrink-0" role="img" aria-label={selected.name}>
                                    {selected.emoji || '📦'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-base truncate">{selected.name}</p>
                                    <p className="text-xs mt-0.5 capitalize" style={{ color: selectedStyle.color }}>
                                        {selected.rarityDisplay || 'Common'}
                                        {selected.tier ? ` · Tier ${selected.tier}` : ''}
                                        {' · '}
                                        {selected.category || 'item'}
                                    </p>
                                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-300">
                                        <span>In stack</span>
                                        <span className="text-right font-mono">×{selected.quantity}</span>
                                        {selected.npcValue > 0 && (
                                            <>
                                                <span>{canSell ? 'Sell each' : `Value at ${FISH_BUYER?.name}`}</span>
                                                <span className="text-right font-mono text-amber-300">
                                                    {selected.npcValue}g
                                                </span>
                                                <span>Stack value</span>
                                                <span className="text-right font-mono text-amber-200 font-bold">
                                                    {stackTotalValue}g
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {canSell && selected.category === 'fish' && selected.npcValue > 0 && (
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleSell(1)}
                                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-bold retro-text"
                                    >
                                        Sell 1 to {sellMerchant?.name}
                                    </button>
                                    {selected.quantity > 1 && (
                                        <button
                                            onClick={() => handleSell(selected.quantity)}
                                            className="flex-1 bg-amber-700 hover:bg-amber-600 text-white px-3 py-2 rounded-lg text-xs font-bold retro-text"
                                        >
                                            Sell all
                                        </button>
                                    )}
                                </div>
                            )}

                            {!canSell && selected.category === 'fish' && selected.npcValue > 0 && (
                                <p className="mt-3 text-center text-xs text-amber-200/80 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2 py-1.5">
                                    Walk to <span className="font-bold text-amber-300">{FISH_BUYER?.name}</span> at his fish stand to sell catches.
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-xs text-center">Drag items between slots · Click to inspect</p>
                    )}
                    {sellFeedback && (
                        <p className="text-amber-300 text-center text-sm mt-2 font-bold">{sellFeedback}</p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
