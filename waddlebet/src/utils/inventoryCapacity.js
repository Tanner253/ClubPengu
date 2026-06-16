/**
 * Client-side backpack capacity checks (mirrors server stack/empty-slot logic).
 */

import { GAME_INVENTORY } from '../config/economy';

const DEFAULT_MAX_STACK = 64;

function slotHasItem(slot) {
    return Boolean(slot?.itemId) && Number(slot?.quantity) > 0;
}

function cloneSlots(slots) {
    return (slots || []).map(s => ({
        itemId: s?.itemId ?? null,
        quantity: Number(s?.quantity) || 0
    }));
}

function findStackSlot(slots, itemId, maxStack) {
    return slots.findIndex(s => s.itemId === itemId && s.quantity < maxStack);
}

function findEmptySlot(slots) {
    return slots.findIndex(s => !slotHasItem(s));
}

function resolveMaxStack(inventory, itemId, maxStackOverride, metadata = null) {
    if (maxStackOverride != null) return maxStackOverride;
    const existing = inventory?.slots?.find(s => s?.itemId === itemId);
    if (existing?.maxStack != null) return existing.maxStack;
    const category = existing?.category || metadata?.category;
    if (category === 'tool' || category === 'rod') return 1;
    if (category === 'ticket') return 20;
    return DEFAULT_MAX_STACK;
}

/**
 * @param {object} inventory Serialized game inventory from server
 * @param {string} itemId
 * @param {number} [quantity=1]
 * @param {number|null} [maxStackOverride]
 * @param {object|null} [metadata]
 */
export function canFitItemInBackpack(inventory, itemId, quantity = 1, maxStackOverride = null, metadata = null) {
    if (!inventory?.slots || !itemId || quantity <= 0) return false;

    const unlocked = inventory.unlockedSlots ?? inventory.slotCount ?? GAME_INVENTORY.DEFAULT_SLOTS;
    const maxStack = resolveMaxStack(inventory, itemId, maxStackOverride, metadata);
    const slots = cloneSlots(inventory.slots.slice(0, unlocked));

    let remaining = quantity;
    while (remaining > 0) {
        let slotIdx = findStackSlot(slots, itemId, maxStack);
        if (slotIdx === -1) slotIdx = findEmptySlot(slots);
        if (slotIdx === -1) return false;

        if (!slots[slotIdx].itemId) {
            slots[slotIdx].itemId = itemId;
            slots[slotIdx].quantity = 0;
        }

        const space = maxStack - slots[slotIdx].quantity;
        const add = Math.min(remaining, space);
        slots[slotIdx].quantity += add;
        remaining -= add;
    }

    return true;
}
