/**
 * BackpackModal — Grid inventory for gameplay items (fish, resources, gear).
 * Separate from cosmetic InventoryModal (gacha wardrobe).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMultiplayer } from '../multiplayer';
import { useEscapeKey } from '../hooks';
import {
    getMerchant,
    getMerchantAcceptsLabel,
    getMerchantStackSellTotal,
    getMerchantUnitSellPrice,
    merchantAcceptsSlot
} from '../config/merchants';
import { GAME_INVENTORY } from '../config/economy';
import { findHotbarSlotUnderPoint, findInventorySlotUnderPoint, isHotbarItem, isInventoryWorldDropTarget } from '../utils/gameHotbar';
import { getInventoryDetailVisual, getInventorySlotVisual } from '../utils/inventorySlotVisual';
import GameHotbar from './GameHotbar';

const FISH_BUYER = getMerchant('fish_buyer');
const DRAG_THRESHOLD_PX = 8;

function slotHasItem(slot) {
    return Boolean(slot?.itemId) && Number(slot?.quantity) > 0;
}

export default function GameInventoryModal({ isOpen, onClose, sellMerchantId = null }) {
    const {
        gameInventory,
        backpackError,
        fetchGameInventory,
        moveGameInventorySlot,
        setGameHotbarSlot,
        sellAtMerchant,
        sellBatchAtMerchant,
        dropWorldItem,
        isAuthenticated
    } = useMultiplayer();

    const canSell = Boolean(sellMerchantId && getMerchant(sellMerchantId));
    const sellMerchant = canSell ? getMerchant(sellMerchantId) : null;

    const [selectedSlot, setSelectedSlot] = useState(null);
    const [sellSelection, setSellSelection] = useState(() => new Set());
    const [dragSource, setDragSource] = useState(null);
    const [hoverSlot, setHoverSlot] = useState(null);
    const [sellFeedback, setSellFeedback] = useState(null);
    const [dropFeedback, setDropFeedback] = useState(null);
    const [selling, setSelling] = useState(false);
    const dragMovedRef = useRef(false);
    const dragSourceRef = useRef(null);
    const hoverSlotRef = useRef(null);
    const sellTrayRef = useRef(null);
    const modalPanelRef = useRef(null);
    const modalOverlayRef = useRef(null);
    const lastPointerRef = useRef({ x: 0, y: 0 });
    const dragStartPosRef = useRef({ x: 0, y: 0 });
    const longPressTimerRef = useRef(null);
    const longPressTriggeredRef = useRef(false);
    const [isMobileLayout, setIsMobileLayout] = useState(false);

    const dropSlotToWorld = useCallback(async (slotIndex, quantity = 1) => {
        if (!isAuthenticated || slotIndex == null) return;
        const slot = storedSlotsRef.current[slotIndex];
        if (!slotHasItem(slot)) return;
        const dropQty = Math.min(Math.max(1, quantity), slot.quantity || 1);
        const result = await dropWorldItem?.(slotIndex, dropQty);
        if (result?.error) {
            setDropFeedback(result.message || result.error);
            setTimeout(() => setDropFeedback(null), 3000);
            return;
        }
        setDropFeedback(dropQty > 1 ? `Dropped ${dropQty} in world` : 'Dropped in world');
        setTimeout(() => setDropFeedback(null), 2000);
        if (slotIndex === selectedSlot && !result?.inventory?.slots?.[slotIndex]?.quantity) {
            setSelectedSlot(null);
        }
    }, [dropWorldItem, isAuthenticated, selectedSlot]);

    useEscapeKey(onClose, isOpen);

    useEffect(() => {
        if (isOpen && isAuthenticated) {
            fetchGameInventory?.();
        }
    }, [isOpen, isAuthenticated, fetchGameInventory]);

    useEffect(() => {
        const updateLayout = () => {
            setIsMobileLayout(window.innerWidth < 768 || ('ontouchstart' in window && window.matchMedia('(pointer: coarse)').matches));
        };
        updateLayout();
        window.addEventListener('resize', updateLayout);
        return () => window.removeEventListener('resize', updateLayout);
    }, []);

    useEffect(() => {
        if (!isOpen) {
            setSelectedSlot(null);
            setSellSelection(new Set());
            setDragSource(null);
            setHoverSlot(null);
            setSellFeedback(null);
            setSelling(false);
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            longPressTriggeredRef.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        dragSourceRef.current = dragSource;
    }, [dragSource]);

    useEffect(() => {
        hoverSlotRef.current = hoverSlot;
    }, [hoverSlot]);

    const columns = gameInventory?.columns || GAME_INVENTORY.COLUMNS;
    const rows = gameInventory?.rows || GAME_INVENTORY.DISPLAY_ROWS;
    const maxSlots = gameInventory?.maxSlots || GAME_INVENTORY.MAX_SLOTS;
    const unlockedSlots = gameInventory?.unlockedSlots ?? gameInventory?.slotCount ?? GAME_INVENTORY.DEFAULT_SLOTS;
    const storedSlots = gameInventory?.slots || [];
    const storedSlotsRef = useRef(storedSlots);
    storedSlotsRef.current = storedSlots;

    const isSellableSlot = useCallback((index) => {
        const slot = storedSlotsRef.current[index];
        return canSell && merchantAcceptsSlot(slot, sellMerchantId);
    }, [canSell, sellMerchantId]);

    const toggleSellSelection = useCallback((index) => {
        if (!isSellableSlot(index)) return;
        setSellSelection((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
        setSelectedSlot(index);
    }, [isSellableSlot]);

    const addToSellSelection = useCallback((index) => {
        if (!isSellableSlot(index)) return;
        setSellSelection((prev) => new Set(prev).add(index));
        setSelectedSlot(index);
    }, [isSellableSlot]);

    useEffect(() => {
        if (dragSource === null) return undefined;

        const trackPointer = (e) => {
            lastPointerRef.current = { x: e.clientX, y: e.clientY, shiftKey: e.shiftKey };
            const dx = e.clientX - dragStartPosRef.current.x;
            const dy = e.clientY - dragStartPosRef.current.y;
            if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
                dragMovedRef.current = true;
                e.preventDefault();
            }
            const slotUnder = findInventorySlotUnderPoint(e.clientX, e.clientY);
            if (slotUnder != null) {
                setHoverSlot(slotUnder);
            }
        };

        const finishDrag = async () => {
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            if (longPressTriggeredRef.current) {
                longPressTriggeredRef.current = false;
                setDragSource(null);
                setHoverSlot(null);
                dragMovedRef.current = false;
                return;
            }
            const from = dragSourceRef.current;
            const { x, y } = lastPointerRef.current;
            const to = findInventorySlotUnderPoint(x, y) ?? hoverSlotRef.current;
            const hotbarIndex = findHotbarSlotUnderPoint(x, y);
            const draggedSlot = from != null ? storedSlotsRef.current[from] : null;
            const droppedOnSellTray = canSell
                && sellTrayRef.current
                && (() => {
                    const rect = sellTrayRef.current.getBoundingClientRect();
                    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
                })();
            const droppedInWorld = dragMovedRef.current
                && isInventoryWorldDropTarget(x, y, {
                    modalPanel: modalPanelRef.current,
                    sellTray: sellTrayRef.current,
                    canSell
                });

            if (from !== null && droppedInWorld && slotHasItem(draggedSlot) && isAuthenticated) {
                const dropQty = lastPointerRef.current.shiftKey
                    ? (draggedSlot.quantity || 1)
                    : 1;
                dropSlotToWorld(from, dropQty);
            } else if (from !== null && droppedOnSellTray && isSellableSlot(from)) {
                addToSellSelection(from);
            } else if (from !== null && hotbarIndex != null && isHotbarItem(draggedSlot)) {
                await setGameHotbarSlot?.(hotbarIndex, from);
                if (!dragMovedRef.current) setSelectedSlot(from);
            } else if (from !== null && to !== null && from !== to && dragMovedRef.current) {
                moveGameInventorySlot?.(from, to);
                setSelectedSlot(to);
            } else if (from !== null && !dragMovedRef.current) {
                setSelectedSlot(from);
            }
            setDragSource(null);
            setHoverSlot(null);
            dragMovedRef.current = false;
        };

        const pointerOpts = { passive: false, capture: true };
        window.addEventListener('pointermove', trackPointer, pointerOpts);
        window.addEventListener('pointerup', finishDrag, true);
        window.addEventListener('pointercancel', finishDrag, true);
        return () => {
            window.removeEventListener('pointermove', trackPointer, pointerOpts);
            window.removeEventListener('pointerup', finishDrag, true);
            window.removeEventListener('pointercancel', finishDrag, true);
        };
    }, [dragSource, moveGameInventorySlot, setGameHotbarSlot, canSell, isSellableSlot, addToSellSelection, isMobileLayout, toggleSellSelection, dropSlotToWorld, isAuthenticated]);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

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

    const isDragging = dragSource !== null;
    const detailSlotIndex = isDragging ? null : selectedSlot;
    const selected = detailSlotIndex != null && detailSlotIndex < unlockedSlots
        ? storedSlots[detailSlotIndex]
        : null;

    const selectedStyle = useMemo(() => {
        if (!selected) return getInventoryDetailVisual(null);
        return getInventoryDetailVisual(selected);
    }, [selected]);

    const unitSellPrice = selected && merchantAcceptsSlot(selected, sellMerchantId)
        ? getMerchantUnitSellPrice(selected.npcValue, sellMerchantId)
        : selected?.npcValue || 0;

    const stackTotalValue = unitSellPrice > 0 && selected?.quantity
        ? unitSellPrice * selected.quantity
        : 0;

    const sellQueue = useMemo(() => {
        return [...sellSelection]
            .filter((index) => index < unlockedSlots && isSellableSlot(index))
            .map((index) => {
                const slot = storedSlots[index];
                return {
                    index,
                    slot,
                    totalGold: getMerchantStackSellTotal(slot, sellMerchantId)
                };
            })
            .sort((a, b) => a.index - b.index);
    }, [sellSelection, storedSlots, unlockedSlots, sellMerchantId, isSellableSlot]);

    const sellQueueTotal = sellQueue.reduce((sum, entry) => sum + entry.totalGold, 0);

    const handlePointerDown = useCallback((e, index, hasItem, locked) => {
        if (locked || !hasItem) return;
        e.preventDefault();
        e.stopPropagation();

        if (e.shiftKey && canSell && isSellableSlot(index)) {
            toggleSellSelection(index);
            return;
        }

        if (e.shiftKey && isAuthenticated && hasItem) {
            dropSlotToWorld(index, storedSlotsRef.current[index]?.quantity || 1);
            return;
        }

        dragMovedRef.current = false;
        longPressTriggeredRef.current = false;
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };
        lastPointerRef.current = { x: e.clientX, y: e.clientY, shiftKey: e.shiftKey };
        setDragSource(index);
        setHoverSlot(index);

        if (e.currentTarget.setPointerCapture) {
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
                // ignore — capture unsupported on some browsers
            }
        }

        if (isMobileLayout && canSell && isSellableSlot(index)) {
            clearLongPressTimer();
            longPressTimerRef.current = setTimeout(() => {
                longPressTimerRef.current = null;
                longPressTriggeredRef.current = true;
                toggleSellSelection(index);
            }, 480);
        }
    }, [canSell, isSellableSlot, toggleSellSelection, isMobileLayout, clearLongPressTimer, dropSlotToWorld, isAuthenticated]);

    const handlePointerMove = useCallback((e) => {
        if (dragSourceRef.current === null) return;
        const dx = e.clientX - dragStartPosRef.current.x;
        const dy = e.clientY - dragStartPosRef.current.y;
        if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
            dragMovedRef.current = true;
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            const slotUnder = findInventorySlotUnderPoint(e.clientX, e.clientY);
            if (slotUnder != null) {
                setHoverSlot(slotUnder);
            }
        }
    }, []);

    const handleSell = useCallback(async (quantity = 1) => {
        if (!canSell || selectedSlot == null || selling) return;
        const slot = storedSlots[selectedSlot];
        if (!merchantAcceptsSlot(slot, sellMerchantId)) return;

        const sellQty = Math.min(quantity, slot.quantity || 1);
        setSelling(true);
        const result = await sellAtMerchant?.(sellMerchantId, selectedSlot, sellQty);
        setSelling(false);

        if (result?.goldEarned) {
            const merchant = result.merchantName || sellMerchant?.name || 'merchant';
            setSellFeedback(`+${result.goldEarned}g from ${merchant}`);
            setTimeout(() => setSellFeedback(null), 2500);
        } else if (result?.message || result?.error) {
            setSellFeedback(result.message || result.error);
            setTimeout(() => setSellFeedback(null), 3000);
        }
        if (result?.inventory) {
            setSellSelection((prev) => {
                const next = new Set(prev);
                next.delete(selectedSlot);
                return next;
            });
            const newQty = result.inventory.slots?.[selectedSlot]?.quantity || 0;
            if (newQty <= 0) setSelectedSlot(null);
        }
    }, [canSell, sellMerchantId, selectedSlot, storedSlots, sellAtMerchant, sellMerchant, selling]);

    const handleSellSelected = useCallback(async () => {
        if (!canSell || sellQueue.length === 0 || selling) return;
        setSelling(true);
        const sells = sellQueue.map(({ index, slot }) => ({
            slotIndex: index,
            quantity: slot.quantity
        }));
        const result = await sellBatchAtMerchant?.(sellMerchantId, sells);
        setSelling(false);

        if (result?.goldEarned) {
            setSellFeedback(`+${result.goldEarned}g from ${result.merchantName || sellMerchant?.name}`);
            setTimeout(() => setSellFeedback(null), 2500);
            setSellSelection(new Set());
            setSelectedSlot(null);
        } else if (result?.message || result?.error) {
            setSellFeedback(result.message || result.error);
            setTimeout(() => setSellFeedback(null), 3000);
        }
    }, [canSell, sellQueue, sellMerchantId, sellBatchAtMerchant, sellMerchant, selling]);

    if (!isOpen) return null;

    const acceptsLabel = canSell ? getMerchantAcceptsLabel(sellMerchantId) : '';
    const gridColumns = isMobileLayout && canSell ? 5 : columns;

    const sellHint = canSell ? (
        <p className="text-[10px] text-amber-200/80 mb-2 text-center uppercase tracking-wide">
            {isMobileLayout
                ? 'Tap stacks to inspect · Long-press to queue for sale'
                : 'Shift+click stacks · Drag to merchant tray →'}
        </p>
    ) : null;

    const inventoryGrid = (
        <div
            className="grid gap-1.5 select-none touch-none"
            style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
        >
            {displayCells.slice(0, columns * rows).map(({ index, locked, slot }) => {
                const hasItem = !locked && slotHasItem(slot);
                const sellable = hasItem && merchantAcceptsSlot(slot, sellMerchantId);
                const visual = hasItem ? getInventorySlotVisual(slot) : null;
                const isSelected = !isDragging && selectedSlot === index;
                const isQueued = sellSelection.has(index);
                const isDragSource = dragSource === index;
                const isHover = hoverSlot === index && dragSource !== null && dragSource !== index;
                const cellBorder = locked
                    ? 'border-slate-700/40 bg-slate-900/80'
                    : isQueued
                        ? 'border-amber-300 bg-amber-900/40 ring-2 ring-amber-400/60'
                        : isSelected
                            ? 'border-cyan-400 bg-cyan-900/20'
                            : `${visual?.border || 'border-slate-600/50'} ${visual?.bg || 'bg-slate-800/60'}`;

                return (
                    <button
                        key={index}
                        type="button"
                        data-inventory-slot={index}
                        disabled={locked}
                        onPointerDown={(e) => handlePointerDown(e, index, hasItem, locked)}
                        onPointerMove={handlePointerMove}
                        onPointerEnter={() => {
                            if (!locked && dragSourceRef.current !== null) setHoverSlot(index);
                        }}
                        className={`
                            aspect-square rounded-lg border-2 flex flex-col items-center justify-center
                            relative transition-colors
                            ${isMobileLayout && canSell ? 'min-h-[44px]' : 'min-h-[36px]'}
                            ${cellBorder}
                            ${canSell && hasItem && !sellable ? 'opacity-35 saturate-50' : ''}
                            ${isDragSource ? 'ring-2 ring-cyan-400 opacity-80 scale-95' : ''}
                            ${isHover ? 'border-green-400 bg-green-900/30' : ''}
                            ${hasItem ? 'hover:border-cyan-400/60 cursor-grab active:cursor-grabbing' : !locked ? 'opacity-80' : ''}
                            ${locked ? 'opacity-40 cursor-not-allowed' : ''}
                        `}
                        title={
                            locked
                                ? 'Locked — visit Copper Clive to upgrade'
                                : hasItem
                                    ? `${slot.name} ×${slot.quantity}${visual?.shortLabel ? ` · ${visual.shortLabel}` : ''}${sellable ? (isMobileLayout ? ' · Long-press to queue' : ' · Shift+click to queue') : ''}`
                                    : 'Empty slot'
                        }
                    >
                        {locked ? (
                            <span className="text-base opacity-60 pointer-events-none">🔒</span>
                        ) : hasItem ? (
                            <>
                                {visual?.stripe && (
                                    <span
                                        className={`absolute left-0 top-1 bottom-1 w-1 rounded-full pointer-events-none ${visual.stripe}`}
                                        aria-hidden
                                    />
                                )}
                                <span
                                    className={`${isMobileLayout && canSell ? 'text-xl' : 'text-2xl'} leading-none pointer-events-none select-none`}
                                    role="img"
                                    aria-label={slot.name}
                                >
                                    {visual?.emoji || slot.emoji || '📦'}
                                </span>
                                {visual?.shortLabel && slot.category === 'wood' && (
                                    <span className={`absolute top-0.5 right-0.5 text-[8px] font-bold pointer-events-none px-0.5 rounded ${visual.text} bg-black/45`}>
                                        {visual.shortLabel}
                                    </span>
                                )}
                                {slot.quantity > 1 && (
                                    <span className="absolute bottom-0.5 right-1 text-[10px] text-white font-bold pointer-events-none bg-black/50 rounded px-0.5">
                                        {slot.quantity}
                                    </span>
                                )}
                                {isQueued && (
                                    <span className="absolute top-0.5 left-1 text-[10px] text-amber-200 font-bold pointer-events-none">
                                        ✓
                                    </span>
                                )}
                            </>
                        ) : null}
                    </button>
                );
            })}
        </div>
    );

    const merchantTrayPanel = canSell ? (
        <div
            ref={sellTrayRef}
            data-sell-tray="true"
            className={`rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-950/20 flex flex-col ${
                isMobileLayout ? 'p-2 shrink-0' : 'w-44 shrink-0 p-3 min-h-[220px]'
            }`}
        >
            <div className={`flex items-center justify-between gap-2 ${isMobileLayout ? 'mb-1.5' : 'mb-1'}`}>
                <p className="text-[10px] uppercase tracking-wider text-amber-200/90 font-bold">
                    Merchant tray
                </p>
                {sellQueue.length > 0 && (
                    <p className="text-[10px] text-amber-200 font-bold tabular-nums">
                        {sellQueue.length} · {sellQueueTotal}g
                    </p>
                )}
            </div>
            {!isMobileLayout && (
                <p className="text-[10px] text-amber-100/60 mb-2 text-center leading-snug">
                    Drop or shift+click {acceptsLabel}
                </p>
            )}
            <div className={`${isMobileLayout ? 'overflow-x-auto overflow-y-hidden flex gap-2 pb-1 min-h-[52px]' : 'flex-1 overflow-y-auto space-y-1.5 min-h-0'}`}>
                {sellQueue.length === 0 ? (
                    <p className={`text-[11px] text-amber-100/40 text-center ${isMobileLayout ? 'py-3 px-2 w-full' : 'py-6 px-1'}`}>
                        {isMobileLayout ? `Long-press ${acceptsLabel} to queue` : 'Queue stacks here to sell in one trip'}
                    </p>
                ) : (
                    sellQueue.map(({ index, slot, totalGold }) => (
                        <div
                            key={index}
                            className={`flex items-center gap-1.5 rounded-lg bg-black/30 border border-amber-500/20 px-2 py-1.5 ${
                                isMobileLayout ? 'shrink-0 min-w-[9rem]' : ''
                            }`}
                        >
                            <span className="text-lg shrink-0">{slot.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white truncate">{slot.name}</p>
                                <p className="text-[10px] text-amber-200/80">×{slot.quantity} · {totalGold}g</p>
                            </div>
                            <button
                                type="button"
                                className="text-white/40 hover:text-white text-xs shrink-0"
                                onClick={() => toggleSellSelection(index)}
                                aria-label="Remove from tray"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>
            {sellQueue.length > 0 && (
                <button
                    type="button"
                    disabled={selling}
                    onClick={handleSellSelected}
                    className={`w-full bg-gradient-to-b from-amber-400 to-orange-700 hover:from-amber-300 hover:to-orange-600 disabled:opacity-60 text-black rounded-lg font-bold retro-text ${
                        isMobileLayout ? 'mt-2 px-3 py-2.5 text-sm' : 'mt-2 px-3 py-2 text-xs'
                    }`}
                >
                    {selling ? 'Selling…' : `Sell queued (${sellQueueTotal}g)`}
                </button>
            )}
        </div>
    ) : null;

    return createPortal(
        <div
            ref={modalOverlayRef}
            data-player-modal="true"
            {...(isDragging ? { 'data-inventory-world-drop': 'true' } : {})}
            className={`fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 ${isDragging ? 'touch-none overscroll-none' : ''}`}
        >
            {isDragging && (
                <div
                    className={`absolute inset-x-3 z-[1] flex items-center justify-center pointer-events-none ${
                        isMobileLayout ? 'top-3 bottom-[calc(92vh+0.75rem)]' : 'top-4 h-20'
                    }`}
                >
                    <div className="rounded-xl border-2 border-dashed border-cyan-400/60 bg-cyan-950/55 px-4 py-2.5 shadow-lg">
                        <p className="text-cyan-200 retro-text text-xs sm:text-sm text-center">
                            {isMobileLayout ? '↑ Release here to drop in world' : 'Release above backpack to drop in world'}
                        </p>
                    </div>
                </div>
            )}
            <div ref={modalPanelRef} data-inventory-panel className={`relative z-10 bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-500/40 rounded-2xl shadow-2xl w-full ${canSell ? 'max-w-3xl' : 'max-w-lg'} ${canSell && isMobileLayout ? 'h-[92vh]' : 'max-h-[92vh] sm:max-h-[90vh]'} overflow-hidden flex flex-col ${isDragging ? 'touch-none' : ''}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{canSell ? (sellMerchant?.emoji || '🪙') : '🎒'}</span>
                        <div>
                            <h2 className="text-cyan-300 font-bold retro-text text-sm">
                                {canSell ? `Sell to ${sellMerchant?.name || 'Merchant'}` : 'Backpack'}
                            </h2>
                            <p className="text-gray-400 text-xs">
                                {gameInventory?.usedSlots ?? 0} / {unlockedSlots} slots
                                {progress ? ` · Fishing Lv.${progress.skillLevel}` : ''}
                                {canSell ? ` · Accepts ${acceptsLabel}` : ''}
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

                {canSell && isMobileLayout ? (
                    <>
                        <div
                            className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-2 pb-1 ${isDragging ? 'overflow-hidden touch-none' : ''}`}
                            style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                            {sellHint}
                            {inventoryGrid}
                        </div>
                        <div className="shrink-0 border-t border-amber-500/25 bg-amber-950/15 px-3 py-2">
                            {merchantTrayPanel}
                        </div>
                    </>
                ) : (
                <div className={`p-3 sm:p-4 overflow-y-auto flex-1 min-h-0 ${canSell ? 'flex gap-4' : ''} ${isDragging ? 'overflow-hidden touch-none' : ''}`}>
                    <div className={canSell ? 'flex-1 min-w-0 min-h-0' : ''}>
                        {sellHint}
                        {inventoryGrid}
                        {!canSell && (
                        <p className="text-gray-500 text-[10px] mt-2 text-center">
                            {isMobileLayout
                                ? 'Drag between slots · Drag up outside grid to drop in world'
                                : 'Drag items between slots · Drag outside backpack to drop in world'}
                        </p>
                        )}
                    </div>
                    {merchantTrayPanel}
                </div>
                )}

                {!canSell && (
                <div className="px-4 py-3 border-t border-cyan-500/20 bg-black/40" data-inventory-no-drop="true">
                    <p className="text-[10px] text-center text-gray-400 mb-2 uppercase tracking-wide">
                        Hand hotbar · {isMobileLayout ? 'tap equipped item to unequip' : 'right-click equipped item to unequip'}
                    </p>
                    <GameHotbar className="justify-center" inventoryMode />
                </div>
                )}

                <div className={`shrink-0 border-t border-cyan-500/20 bg-black/30 flex flex-col ${
                    canSell && isMobileLayout ? 'max-h-[38vh] overflow-y-auto overscroll-contain' : 'min-h-[172px] justify-center'
                } px-3 sm:px-4 py-3`} data-inventory-no-drop="true" style={canSell && isMobileLayout ? { WebkitOverflowScrolling: 'touch' } : undefined}>
                    {isDragging ? (
                        <p className="text-cyan-300/90 text-xs text-center retro-text">
                            Drag up to the drop zone to place in world…
                        </p>
                    ) : selected && slotHasItem(selected) ? (
                        <div className={`rounded-xl border p-3 ${selectedStyle.bg} ${selectedStyle.border}`}>
                            <div className="flex items-start gap-3">
                                <span className="text-4xl shrink-0" role="img" aria-label={selected.name}>
                                    {getInventorySlotVisual(selected).emoji || selected.emoji || '📦'}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-base truncate">{selected.name}</p>
                                    <p className="text-xs mt-0.5 capitalize" style={{ color: selectedStyle.color }}>
                                        {selected.rarityDisplay || 'Common'}
                                        {selected.tier ? ` · Tier ${selected.tier}` : ''}
                                        {' · '}
                                        {selected.category || 'item'}
                                        {getInventorySlotVisual(selected).shortLabel
                                            ? ` · ${getInventorySlotVisual(selected).shortLabel}`
                                            : ''}
                                    </p>
                                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-300">
                                        {selected.category === 'fish' && selected.weightKg != null && (
                                            <>
                                                <span>Weight</span>
                                                <span className="text-right font-mono">{selected.weightKg} kg</span>
                                            </>
                                        )}
                                        <span>In stack</span>
                                        <span className="text-right font-mono">×{selected.quantity}</span>
                                        {selected.npcValue > 0 && merchantAcceptsSlot(selected, sellMerchantId) && (
                                            <>
                                                <span>Sell each</span>
                                                <span className="text-right font-mono text-amber-300">
                                                    {unitSellPrice}g
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

                            {canSell && merchantAcceptsSlot(selected, sellMerchantId) && (
                                <div className={`flex gap-2 mt-3 ${isMobileLayout ? 'flex-wrap' : ''}`}>
                                    <button
                                        type="button"
                                        disabled={selling}
                                        onClick={() => handleSell(1)}
                                        className={`flex-1 min-w-[5rem] bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white px-3 py-2.5 rounded-lg text-xs font-bold retro-text`}
                                    >
                                        Sell 1
                                    </button>
                                    {selected.quantity > 1 && (
                                        <button
                                            type="button"
                                            disabled={selling}
                                            onClick={() => handleSell(selected.quantity)}
                                            className="flex-1 min-w-[5rem] bg-amber-700 hover:bg-amber-600 disabled:opacity-60 text-white px-3 py-2.5 rounded-lg text-xs font-bold retro-text"
                                        >
                                            Sell stack
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        disabled={selling}
                                        onClick={() => addToSellSelection(selectedSlot)}
                                        className="flex-1 min-w-[5rem] bg-amber-900/60 hover:bg-amber-800/70 border border-amber-500/30 text-amber-100 px-3 py-2.5 rounded-lg text-xs font-bold retro-text"
                                    >
                                        {sellSelection.has(selectedSlot) ? 'Queued ✓' : 'Queue'}
                                    </button>
                                </div>
                            )}

                            {!canSell && selected.category === 'wood' && selected.npcValue > 0 && (
                                <p className="mt-3 text-center text-xs text-orange-200/80 bg-orange-950/30 border border-orange-500/20 rounded-lg px-2 py-1.5">
                                    Walk to <span className="font-bold text-orange-300">Copper Clive</span> or{' '}
                                    <span className="font-bold text-green-300">Ranger Pike</span> to sell timber.
                                </p>
                            )}

                            {!canSell && selected.category === 'fish' && selected.npcValue > 0 && (
                                <p className="mt-3 text-center text-xs text-amber-200/80 bg-amber-950/30 border border-amber-500/20 rounded-lg px-2 py-1.5">
                                    Walk to <span className="font-bold text-amber-300">{FISH_BUYER?.name}</span> at his fish stand to sell catches.
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-xs text-center">
                            {canSell
                                ? (isMobileLayout
                                    ? 'Tap a stack to inspect · Long-press to queue for sale'
                                    : 'Click a stack to inspect · Shift+click to queue for sale')
                                : (isMobileLayout
                                    ? 'Tap a stack to inspect · Drag up to drop in world'
                                    : 'Click a stack to inspect · Shift+click to drop stack · Drag outside to drop 1 · Shift+drag outside for full stack')}
                        </p>
                    )}
                    {dropFeedback && (
                        <p className="text-cyan-300 text-center text-sm mt-2 font-bold">{dropFeedback}</p>
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
