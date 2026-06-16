/** Client hotbar helpers — sync with server GameInventoryService hotbar shape */

import { AXE_ITEM_IDS } from '../config/economy';

export const HOTBAR_SIZE = 5;

export function isHotbarItem(slot) {
    return Boolean(slot?.itemId) && Number(slot?.quantity) > 0;
}

/** @deprecated use isHotbarItem */
export function isToolSlot(slot) {
    return isHotbarItem(slot);
}

/** Active hotbar entry (any item), or null if slot empty */
export function getActiveHotbarEntry(gameInventory) {
    if (!gameInventory?.hotbar) return null;
    const active = Math.min(
        Math.max(0, gameInventory.activeHotbar ?? 0),
        HOTBAR_SIZE - 1
    );
    const entry = gameInventory.hotbar[active];
    if (!entry?.itemId || Number(entry.quantity) <= 0) return null;
    return { ...entry, activeIndex: active };
}

/** Active hotbar tool entry, or null if none / broken */
export function getEquippedHotbarTool(gameInventory) {
    if (!gameInventory?.hotbar) return null;
    const active = Math.min(
        Math.max(0, gameInventory.activeHotbar ?? 0),
        HOTBAR_SIZE - 1
    );
    const entry = gameInventory.hotbar[active];
    if (!entry?.itemId || Number(entry.quantity) <= 0) return null;
    const durability = entry.durability ?? entry.metadata?.durability ?? entry.maxDurability ?? 0;
    if (durability <= 0) return null;
    return { ...entry, activeIndex: active, durability };
}

export function hasEquippedAxe(gameInventory) {
    const tool = getEquippedHotbarTool(gameInventory);
    return Boolean(tool?.itemId && AXE_ITEM_IDS.includes(tool.itemId));
}

export function ownsAnyAxe(gameInventory) {
    return gameInventory?.slots?.some(
        s => s?.itemId && AXE_ITEM_IDS.includes(s.itemId) && Number(s.quantity) > 0
    );
}

export function findHotbarSlotUnderPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const slotEl = el?.closest?.('[data-hotbar-slot]');
    if (!slotEl) return null;
    const index = Number(slotEl.dataset.hotbarSlot);
    return Number.isFinite(index) ? index : null;
}
