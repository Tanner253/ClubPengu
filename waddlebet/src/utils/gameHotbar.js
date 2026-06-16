/** Client hotbar helpers — sync with server GameInventoryService hotbar shape */

import { AXE_ITEM_IDS, ROD_ITEM_IDS } from '../config/economy';
import { playSfx } from '../audio';

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

export function hasEquippedRod(gameInventory) {
    const tool = getEquippedHotbarTool(gameInventory);
    return Boolean(tool?.itemId && ROD_ITEM_IDS.includes(tool.itemId));
}

export function ownsAnyRod(gameInventory) {
    return gameInventory?.slots?.some(
        s => s?.itemId && ROD_ITEM_IDS.includes(s.itemId) && Number(s.quantity) > 0
    );
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

export function findInventorySlotUnderPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    const slotEl = el?.closest?.('[data-inventory-slot]');
    if (!slotEl) return null;
    const index = Number(slotEl.dataset.inventorySlot);
    return Number.isFinite(index) ? index : null;
}

/**
 * True when a drag release should drop the stack into the world (backdrop / drop zone / panel chrome).
 */
export function isInventoryWorldDropTarget(clientX, clientY, { modalPanel = null, sellTray = null, canSell = false } = {}) {
    const el = document.elementFromPoint(clientX, clientY);
    if (el?.closest?.('[data-inventory-world-drop]')) return true;

    if (modalPanel) {
        const rect = modalPanel.getBoundingClientRect();
        if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
            return true;
        }
    }

    if (findInventorySlotUnderPoint(clientX, clientY) != null) return false;
    if (findHotbarSlotUnderPoint(clientX, clientY) != null) return false;

    if (canSell && sellTray) {
        const trayRect = sellTray.getBoundingClientRect();
        if (
            clientX >= trayRect.left && clientX <= trayRect.right
            && clientY >= trayRect.top && clientY <= trayRect.bottom
        ) {
            return false;
        }
    }

    if (el?.closest?.('[data-inventory-no-drop]')) return false;

    return Boolean(el?.closest?.('[data-inventory-panel]') || el?.closest?.('[data-player-modal]'));
}

/** SFX event for selecting a hotbar slot with an item equipped. */
export function getHotbarEquipSfx(itemId) {
    if (!itemId) return 'equip_unequip';
    if (ROD_ITEM_IDS.includes(itemId)) return 'equip_rod';
    if (AXE_ITEM_IDS.includes(itemId)) return 'equip_axe';
    return 'equip_tool';
}

export function playHotbarEquipSound(itemId) {
    playSfx(getHotbarEquipSfx(itemId));
}
