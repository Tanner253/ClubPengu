/**
 * GameInventoryService — Grid backpack for gameplay items (fish, resources, gear).
 * Separate from cosmetic OwnedCosmetic wardrobe.
 */

import { User } from '../db/models/index.js';
import { ECONOMY, getBackpackUpgradeInfo, getMaxSlotCount } from '../config/economy.js';
import {
    getRodUpgradeStep,
    getNextRodUpgrade,
    buildNextRodUpgradePreview,
    ROD_UPGRADE_MAX_STEP
} from '../config/rodUpgrades.js';
import { getGameItem, isFishItem, getFishRarityLabel, getFishRarityDisplay, getFerryTicketItemForRoute } from '../config/gameItems.js';
import { getMerchant, merchantAcceptsCategory } from '../config/merchants.js';
import { getToolPurchasePrerequisite } from '../config/toolTiers.js';
import {
    MUSHROOM_QUEST_REQUIRED,
    MUSHROOM_QUEST_REWARD_ITEM
} from '../config/harvestableMushrooms.js';

const GI = ECONOMY.GAME_INVENTORY;

function emptySlot() {
    return { itemId: null, quantity: 0, metadata: {} };
}

function cloneSlots(slots) {
    return (slots || []).map(s => ({
        itemId: s?.itemId ?? null,
        quantity: Number(s?.quantity) || 0,
        metadata: s?.metadata ? { ...s.metadata } : {}
    }));
}

function normalizeSlots(rawSlots, slotCount) {
    const slots = Array.isArray(rawSlots) ? cloneSlots(rawSlots) : [];

    while (slots.length < slotCount) {
        slots.push(emptySlot());
    }
    return slots.slice(0, slotCount);
}

function slotHasItem(slot) {
    return Boolean(slot?.itemId) && Number(slot?.quantity) > 0;
}

function enrichSlot(slot) {
    if (!slotHasItem(slot)) {
        return { itemId: null, quantity: 0, metadata: {} };
    }
    const def = getGameItem(slot.itemId);
    const meta = slot.metadata || {};
    const category = def?.category || meta.category || 'unknown';
    const npcValue = (category === 'fish' && meta.npcValue != null)
        ? meta.npcValue
        : (def?.npcValue ?? meta.npcValue ?? 0);
    const emoji = def?.emoji || meta.emoji || '📦';
    const out = {
        itemId: slot.itemId,
        quantity: slot.quantity,
        metadata: meta,
        name: def?.name || meta.name || slot.itemId,
        emoji,
        category,
        npcValue,
        tier: def?.tier || meta.tier || 0,
        weightKg: meta.weightKg ?? null,
        rarity: getFishRarityLabel(slot.itemId),
        rarityDisplay: getFishRarityDisplay(slot.itemId),
        maxStack: def?.maxStack || GI.MAX_STACK
    };
    if (category === 'tool' || category === 'rod') {
        const gearCfg = ECONOMY.TOOLS?.[slot.itemId] || ECONOMY.RODS?.[slot.itemId];
        const maxDurability = meta.maxDurability ?? gearCfg?.maxDurability ?? 100;
        out.maxDurability = maxDurability;
        out.durability = meta.durability ?? maxDurability;
    }
    return out;
}

class GameInventoryService {
    constructor(userService) {
        this.userService = userService;
    }

    getUnlockedSlots(user) {
        const gi = user?.gameInventory;
        if (gi?.unlockedSlots != null && gi.unlockedSlots > 0) {
            return Math.min(Math.max(GI.DEFAULT_SLOTS, gi.unlockedSlots), GI.MAX_SLOTS);
        }

        const rawSlots = Array.isArray(gi?.slots) ? gi.slots : [];
        const highestUsed = rawSlots.reduce((max, s, i) => (
            slotHasItem(s) ? Math.max(max, i + 1) : max
        ), 0);
        const legacyCount = (gi?.rows || GI.DISPLAY_ROWS) * (gi?.columns || GI.COLUMNS);
        const hasItems = highestUsed > 0;

        if (hasItems) {
            return Math.min(Math.max(highestUsed, GI.DEFAULT_SLOTS), GI.MAX_SLOTS);
        }
        if (legacyCount >= GI.MAX_SLOTS) {
            return GI.DEFAULT_SLOTS;
        }
        return GI.DEFAULT_SLOTS;
    }

    buildDefaultSlots(slotCount) {
        return Array.from({ length: slotCount }, () => emptySlot());
    }
    buildDefaultHotbar() {
        const size = ECONOMY.HOTBAR?.SIZE || 5;
        return Array.from({ length: size }, () => null);
    }
    normalizeHotbar(rawHotbar) {
        const size = ECONOMY.HOTBAR?.SIZE || 5;
        const hotbar = Array.isArray(rawHotbar) ? rawHotbar.map(ref => (
            ref && typeof ref.inventorySlot === 'number'
                ? { inventorySlot: ref.inventorySlot }
                : null
        )) : [];
        while (hotbar.length < size) hotbar.push(null);
        return hotbar.slice(0, size);
    }
    isToolSlot(slot) {
        if (!slotHasItem(slot)) return false;
        const def = getGameItem(slot.itemId);
        return (def?.category || slot.metadata?.category) === 'tool';
    }
    isRodSlot(slot) {
        if (!slotHasItem(slot)) return false;
        const def = getGameItem(slot.itemId);
        return (def?.category || slot.metadata?.category) === 'rod';
    }
    isGearSlot(slot) {
        return this.isToolSlot(slot) || this.isRodSlot(slot);
    }
    sanitizeHotbar(slots, hotbar) {
        for (let i = 0; i < hotbar.length; i++) {
            const ref = hotbar[i];
            if (!ref || typeof ref.inventorySlot !== 'number') {
                hotbar[i] = null;
                continue;
            }
            const slot = slots[ref.inventorySlot];
            if (!slotHasItem(slot)) {
                hotbar[i] = null;
            }
        }
    }
    syncHotbarAfterMove(hotbar, fromIndex, toIndex, slots) {
        const fromHadItem = slotHasItem(slots[fromIndex]);
        const toHadItem = slotHasItem(slots[toIndex]);
        const swapped = fromHadItem && toHadItem;
        hotbar.forEach((ref) => {
            if (!ref) return;
            if (ref.inventorySlot === fromIndex && !slotHasItem(slots[fromIndex])) {
                ref.inventorySlot = toIndex;
            } else if (swapped && ref.inventorySlot === toIndex) {
                ref.inventorySlot = fromIndex;
            }
        });
        this.sanitizeHotbar(slots, hotbar);
    }
    getGearMetadataForNewItem(itemId) {
        const gearCfg = ECONOMY.TOOLS?.[itemId] || ECONOMY.RODS?.[itemId];
        if (!gearCfg?.maxDurability) return {};
        return {
            durability: gearCfg.maxDurability,
            maxDurability: gearCfg.maxDurability
        };
    }
    getToolMetadataForNewItem(itemId) {
        return this.getGearMetadataForNewItem(itemId);
    }
    getEquippedTool(user) {
        const equipped = this._getEquippedGear(user);
        if (!equipped || !this.isToolSlot({ itemId: equipped.itemId, quantity: 1 })) return null;
        return equipped;
    }
    getEquippedRod(user) {
        const equipped = this._getEquippedGear(user);
        if (!equipped || !this.isRodSlot({ itemId: equipped.itemId, quantity: 1 })) return null;
        return equipped;
    }
    _getEquippedGear(user) {
        const slots = normalizeSlots(user.gameInventory?.slots, this.getUnlockedSlots(user));
        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.sanitizeHotbar(slots, hotbar);
        const active = Math.min(
            Math.max(0, user.gameInventory?.activeHotbar ?? 0),
            hotbar.length - 1
        );
        const ref = hotbar[active];
        if (!ref || typeof ref.inventorySlot !== 'number') return null;
        const slot = slots[ref.inventorySlot];
        if (!this.isGearSlot(slot)) return null;
        const meta = slot.metadata || {};
        const gearCfg = ECONOMY.TOOLS?.[slot.itemId] || ECONOMY.RODS?.[slot.itemId];
        const maxDurability = meta.maxDurability ?? gearCfg?.maxDurability ?? 100;
        const durability = meta.durability ?? maxDurability;
        if (durability <= 0) return null;
        return {
            itemId: slot.itemId,
            inventorySlot: ref.inventorySlot,
            hotbarIndex: active,
            durability,
            maxDurability
        };
    }
    async autoEquipToolToHotbar(walletAddress, itemId) {
        const user = await this.userService.getUser(walletAddress);
        if (!user) return null;
        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        const inventorySlot = slots.findIndex(s => slotHasItem(s) && s.itemId === itemId);
        if (inventorySlot < 0) return null;
        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        if (hotbar.some(ref => ref?.inventorySlot === inventorySlot)) {
            return this.serializeInventory(user);
        }
        const emptyIndex = hotbar.findIndex(ref => ref == null);
        if (emptyIndex < 0) return null;
        hotbar[emptyIndex] = { inventorySlot };
        const activeHotbar = user.gameInventory?.activeHotbar ?? emptyIndex;
        const updated = await User.findOneAndUpdate(
            { walletAddress },
            { $set: { 'gameInventory.hotbar': hotbar, 'gameInventory.activeHotbar': activeHotbar } },
            { new: true }
        );
        return updated ? this.serializeInventory(updated) : null;
    }
    async setHotbarSlot(walletAddress, hotbarIndex, inventorySlotIndex) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };
        const hotbarSize = ECONOMY.HOTBAR?.SIZE || 5;
        if (hotbarIndex < 0 || hotbarIndex >= hotbarSize) {
            return { error: 'INVALID_HOTBAR' };
        }
        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        if (inventorySlotIndex == null) {
            hotbar[hotbarIndex] = null;
        } else {
            if (inventorySlotIndex < 0 || inventorySlotIndex >= unlockedSlots) {
                return { error: 'INVALID_SLOT' };
            }
            const slot = slots[inventorySlotIndex];
            if (!slotHasItem(slot)) {
                return { error: 'EMPTY_SLOT', message: 'That backpack slot is empty' };
            }
            hotbar[hotbarIndex] = { inventorySlot: inventorySlotIndex };
        }
        this.sanitizeHotbar(slots, hotbar);
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };
        return { success: true, inventory: this.serializeInventory(updated) };
    }
    async setActiveHotbar(walletAddress, hotbarIndex) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };
        const hotbarSize = ECONOMY.HOTBAR?.SIZE || 5;
        const clamped = Math.min(Math.max(0, hotbarIndex), hotbarSize - 1);
        const updated = await User.findOneAndUpdate(
            { walletAddress },
            { $set: { 'gameInventory.activeHotbar': clamped } },
            { new: true }
        );
        if (!updated) return { error: 'SAVE_FAILED' };
        return { success: true, inventory: this.serializeInventory(updated) };
    }
    async damageEquippedTool(walletAddress, amount = null) {
        return this._damageEquippedGear(walletAddress, amount, 'tool');
    }
    async damageEquippedRod(walletAddress, amount = null) {
        return this._damageEquippedGear(walletAddress, amount, 'rod');
    }
    async _damageEquippedGear(walletAddress, amount = null, gearKind = 'tool') {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };
        const equipped = gearKind === 'rod' ? this.getEquippedRod(user) : this.getEquippedTool(user);
        if (!equipped) return { error: gearKind === 'rod' ? 'NO_ROD' : 'NO_TOOL', broken: false };
        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        const slot = slots[equipped.inventorySlot];
        const meta = { ...(slot.metadata || {}) };
        const gearCfg = ECONOMY.TOOLS?.[equipped.itemId] || ECONOMY.RODS?.[equipped.itemId];
        const maxDurability = meta.maxDurability ?? gearCfg?.maxDurability ?? 100;
        const defaultLoss = gearKind === 'rod'
            ? (gearCfg?.durabilityLossPerCast ?? 1)
            : (gearCfg?.durabilityLossPerChop ?? 1);
        const loss = amount ?? defaultLoss;
        const nextDurability = (meta.durability ?? maxDurability) - loss;
        if (nextDurability <= 0) {
            slots[equipped.inventorySlot] = emptySlot();
            hotbar.forEach((ref, i) => {
                if (ref?.inventorySlot === equipped.inventorySlot) hotbar[i] = null;
            });
            const updated = await this.persistUserInventory(walletAddress, slots, null, {
                'gameInventory.hotbar': hotbar
            });
            if (!updated) return { error: 'SAVE_FAILED' };
            return {
                broken: true,
                itemId: equipped.itemId,
                inventory: this.serializeInventory(updated)
            };
        }
        meta.durability = nextDurability;
        meta.maxDurability = maxDurability;
        slot.metadata = meta;
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };
        return {
            broken: false,
            durability: nextDurability,
            maxDurability,
            inventory: this.serializeInventory(updated)
        };
    }

    async persistUserInventory(walletAddress, slots, progressPatch = null, extraSets = null) {
        const plainSlots = cloneSlots(slots);
        const update = { 'gameInventory.slots': plainSlots };
        if (extraSets) Object.assign(update, extraSets);
        if (progressPatch) Object.assign(update, progressPatch);
        const used = plainSlots.filter(slotHasItem).length;
        console.log(`[INVENTORY] persist wallet=${walletAddress.slice(0, 8)}… usedSlots=${used} keys=${Object.keys(update).join(',')}`);
        let updated = await User.findOneAndUpdate(
            { walletAddress },
            { $set: update },
            { new: true }
        );
        if (!updated) {
            console.error(`[INVENTORY] persist findOneAndUpdate returned NULL wallet=${walletAddress.slice(0, 8)}… — retrying with updateOne`);
            const retry = await User.updateOne({ walletAddress }, { $set: update });
            console.log(`[INVENTORY] persist retry matched=${retry.matchedCount} modified=${retry.modifiedCount}`);
            updated = await User.findOne({ walletAddress });
            if (!updated) {
                console.error(`[INVENTORY] persist FAILED — user not found after retry wallet=${walletAddress.slice(0, 8)}…`);
            }
        }
        return updated;
    }

    async ensureInventory(walletAddress) {
        let user = await this.userService.getUser(walletAddress);
        if (!user) return null;

        let needsSave = false;
        const sets = {};
        const unlocked = this.getUnlockedSlots(user);
        const gi = user.gameInventory || {};

        if (!user.gameInventory) {
            sets['gameInventory.columns'] = GI.COLUMNS;
            sets['gameInventory.displayRows'] = GI.DISPLAY_ROWS;
            sets['gameInventory.unlockedSlots'] = GI.DEFAULT_SLOTS;
            sets['gameInventory.slots'] = this.buildDefaultSlots(GI.DEFAULT_SLOTS);
            sets['gameInventory.hotbar'] = this.buildDefaultHotbar();
            sets['gameInventory.activeHotbar'] = 0;
            needsSave = true;
        } else {
            if (!gi.columns) {
                sets['gameInventory.columns'] = GI.COLUMNS;
                needsSave = true;
            }
            if (!gi.displayRows) {
                sets['gameInventory.displayRows'] = GI.DISPLAY_ROWS;
                needsSave = true;
            }
            if (gi.unlockedSlots == null || gi.unlockedSlots <= 0) {
                sets['gameInventory.unlockedSlots'] = unlocked;
                needsSave = true;
            }

            if (!Array.isArray(gi.slots)) {
                sets['gameInventory.slots'] = this.buildDefaultSlots(unlocked);
                needsSave = true;
            } else {
                const normalized = normalizeSlots(gi.slots, unlocked);
                const hasItems = gi.slots.some(slotHasItem);
                if (gi.slots.length === 0 && !hasItems) {
                    sets['gameInventory.slots'] = this.buildDefaultSlots(unlocked);
                    needsSave = true;
                } else if (normalized.length !== gi.slots.length) {
                    sets['gameInventory.slots'] = normalized;
                    needsSave = true;
                }
            }
            if (!Array.isArray(gi.hotbar)) {
                sets['gameInventory.hotbar'] = this.buildDefaultHotbar();
                needsSave = true;
            }
            if (gi.activeHotbar == null || gi.activeHotbar < 0) {
                sets['gameInventory.activeHotbar'] = 0;
                needsSave = true;
            }
        }

        if (!user.fishingProgress) {
            sets.fishingProgress = {
                skillXp: 0,
                skillLevel: 1,
                equippedRod: 'basic_rod',
                equippedBait: null,
                equippedLure: null,
                totalCatches: 0
            };
            needsSave = true;
        }

        if (needsSave) {
            user = await User.findOneAndUpdate(
                { walletAddress },
                { $set: sets },
                { new: true, upsert: false }
            );
            if (!user) {
                console.error(`[INVENTORY] ensureInventory init update NULL wallet=${walletAddress.slice(0, 8)}… keys=${Object.keys(sets).join(',')}`);
                await User.updateOne({ walletAddress }, { $set: sets });
                user = await this.userService.getUser(walletAddress);
            } else {
                console.log(`[INVENTORY] ensureInventory initialized wallet=${walletAddress.slice(0, 8)}… unlocked=${sets['gameInventory.unlockedSlots'] || user.gameInventory?.unlockedSlots}`);
            }
        }

        return user;
    }

    serializeInventory(user) {
        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        const usedSlots = slots.filter(slotHasItem).length;
        const nextUpgrade = getBackpackUpgradeInfo(unlockedSlots);
        const rodStep = getRodUpgradeStep(user);
        const ownsRod = (id) => this.countItemInSlots(slots, id) > 0;
        const nextRodUpgrade = buildNextRodUpgradePreview(rodStep, ownsRod);
        const hotbarRaw = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.sanitizeHotbar(slots, hotbarRaw);
        const hotbarSize = ECONOMY.HOTBAR?.SIZE || 5;
        const hotbar = hotbarRaw.map((ref) => {
            if (!ref || ref.inventorySlot == null) return null;
            const slot = slots[ref.inventorySlot];
            if (!slotHasItem(slot)) return null;
            const enriched = enrichSlot(slot);
            return { inventorySlot: ref.inventorySlot, ...enriched };
        });

        return {
            columns: user.gameInventory?.columns || GI.COLUMNS,
            rows: user.gameInventory?.displayRows || GI.DISPLAY_ROWS,
            unlockedSlots,
            maxSlots: getMaxSlotCount(),
            slotCount: unlockedSlots,
            usedSlots,
            slots: slots.map(enrichSlot),
            hotbar,
            activeHotbar: Math.min(
                Math.max(0, user.gameInventory?.activeHotbar ?? 0),
                hotbarSize - 1
            ),
            nextUpgrade,
            nextRodUpgrade,
            fishingProgress: user.fishingProgress || null
        };
    }

    async getInventory(walletAddress) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };
        return { success: true, inventory: this.serializeInventory(user) };
    }

    findStackSlot(slots, itemId, metadata = {}) {
        const maxStack = getGameItem(itemId)?.maxStack || GI.MAX_STACK;
        const isFish = isFishItem(itemId) || metadata.category === 'fish';
        const catchValue = isFish && metadata.npcValue != null ? metadata.npcValue : null;

        return slots.findIndex((s) => {
            if (s.itemId !== itemId || s.quantity >= maxStack) return false;
            if (catchValue == null) return true;
            const stackValue = s.metadata?.npcValue ?? getGameItem(itemId)?.npcValue ?? 0;
            return stackValue === catchValue;
        });
    }

    findEmptySlot(slots) {
        return slots.findIndex(s => !slotHasItem(s));
    }

    /**
     * Dry-run: can quantity of itemId fit without persisting?
     */
    canAddItemSlots(slots, itemId, quantity = 1, metadata = {}) {
        const itemDef = this.resolveItemDef(itemId, metadata);
        if (!itemDef) return { ok: false, error: 'INVALID_ITEM' };
        if (quantity <= 0) return { ok: false, error: 'INVALID_QUANTITY' };

        const simSlots = cloneSlots(slots);
        let remaining = quantity;
        const maxStack = itemDef.maxStack || GI.MAX_STACK;

        while (remaining > 0) {
            let slotIdx = this.findStackSlot(simSlots, itemId, metadata);
            if (slotIdx === -1) slotIdx = this.findEmptySlot(simSlots);
            if (slotIdx === -1) {
                return { ok: false, error: 'INVENTORY_FULL' };
            }

            const slot = simSlots[slotIdx];
            if (!slot.itemId) {
                slot.itemId = itemId;
                slot.quantity = 0;
            }

            const space = maxStack - slot.quantity;
            const add = Math.min(remaining, space);
            slot.quantity += add;
            remaining -= add;
        }

        return { ok: true };
    }

    async canAddItem(walletAddress, itemId, quantity = 1, metadata = {}) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { ok: false, error: 'USER_NOT_FOUND' };

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        const result = this.canAddItemSlots(slots, itemId, quantity, metadata);
        if (!result.ok) {
            return {
                ok: false,
                error: result.error,
                message: result.error === 'INVENTORY_FULL'
                    ? 'Backpack is full — upgrade or sell items'
                    : undefined
            };
        }
        return { ok: true };
    }

    resolveItemDef(itemId, metadata = {}) {
        let itemDef = getGameItem(itemId);
        if (!itemDef && metadata.npcValue != null && metadata.npcValue >= 0) {
            itemDef = {
                id: itemId,
                name: metadata.name || itemId,
                emoji: metadata.emoji || '🐟',
                category: metadata.category || 'fish',
                npcValue: metadata.npcValue,
                maxStack: GI.MAX_STACK,
                tier: metadata.tier || 0
            };
        }
        if (!itemDef && (metadata.category === 'fish' || metadata.name)) {
            itemDef = {
                id: itemId,
                name: metadata.name || itemId,
                emoji: metadata.emoji || '🐟',
                category: metadata.category || 'fish',
                npcValue: metadata.npcValue ?? 0,
                maxStack: GI.MAX_STACK,
                tier: metadata.tier || 0
            };
        }
        return itemDef;
    }

    /**
     * Add items to backpack (stack-first, then empty slots).
     */
    async addItem(walletAddress, itemId, quantity = 1, metadata = {}) {
        console.log(`[INVENTORY] addItem wallet=${walletAddress.slice(0, 8)}… item=${itemId} qty=${quantity}`);
        const itemDef = this.resolveItemDef(itemId, metadata);
        if (!itemDef) {
            console.warn(`[INVENTORY] addItem INVALID_ITEM wallet=${walletAddress.slice(0, 8)}… item=${itemId} meta=${JSON.stringify(metadata)}`);
            return { error: 'INVALID_ITEM', message: `Unknown item: ${itemId}` };
        }
        if (quantity <= 0) return { error: 'INVALID_QUANTITY' };

        const user = await this.ensureInventory(walletAddress);
        if (!user) {
            console.error(`[INVENTORY] addItem USER_NOT_FOUND wallet=${walletAddress.slice(0, 8)}…`);
            return { error: 'USER_NOT_FOUND' };
        }

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        let remaining = quantity;
        const maxStack = itemDef.maxStack || GI.MAX_STACK;
        const storedMeta = {
            ...metadata,
            name: metadata.name || itemDef.name,
            emoji: metadata.emoji || itemDef.emoji,
            npcValue: metadata.npcValue ?? itemDef.npcValue,
            category: metadata.category || itemDef.category,
            tier: metadata.tier ?? itemDef.tier,
            weightKg: metadata.weightKg,
            caughtWithRod: metadata.caughtWithRod
        };

        while (remaining > 0) {
            let slotIdx = this.findStackSlot(slots, itemId, storedMeta);
            if (slotIdx === -1) slotIdx = this.findEmptySlot(slots);
            if (slotIdx === -1) {
                return { error: 'INVENTORY_FULL', message: 'Backpack is full — upgrade or sell fish' };
            }

            const slot = slots[slotIdx];
            if (!slot.itemId) {
                slot.itemId = itemId;
                slot.quantity = 0;
                slot.metadata = storedMeta;
            }

            const space = maxStack - slot.quantity;
            const add = Math.min(remaining, space);
            slot.quantity += add;
            remaining -= add;
        }

        const progressPatch = {};
        const isFish = isFishItem(itemId) || storedMeta.category === 'fish';
        if (isFish) {
            const userFresh = await this.userService.getUser(walletAddress);
            progressPatch['fishingProgress.totalCatches'] = (userFresh?.fishingProgress?.totalCatches || 0) + quantity;
            progressPatch['fishingProgress.skillXp'] = (userFresh?.fishingProgress?.skillXp || 0) + ECONOMY.FISHING.XP_PER_CATCH * quantity;
        }

        const updated = await this.persistUserInventory(walletAddress, slots, progressPatch);
        if (!updated) {
            console.error(`[INVENTORY] addItem SAVE_FAILED wallet=${walletAddress.slice(0, 8)}… item=${itemId} — DB write returned null`);
            return { error: 'SAVE_FAILED', message: 'Failed to save backpack' };
        }

        const serialized = this.serializeInventory(updated);
        console.log(`[INVENTORY] addItem OK wallet=${walletAddress.slice(0, 8)}… item=${itemId} used=${serialized.usedSlots}/${serialized.unlockedSlots} slots=${(serialized.slots || []).filter(s => s?.itemId).map(s => `${s.itemId}x${s.quantity}`).join(', ') || 'none'}`);

        return {
            success: true,
            itemId,
            quantityAdded: quantity,
            inventory: serialized
        };
    }

    /**
     * Move or merge stacks between slots (drag-and-drop).
     */
    async moveSlot(walletAddress, fromIndex, toIndex, quantity = null) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);

        if (fromIndex < 0 || fromIndex >= unlockedSlots || toIndex < 0 || toIndex >= unlockedSlots) {
            return { error: 'INVALID_SLOT' };
        }
        if (fromIndex === toIndex) return { success: true, inventory: this.serializeInventory(user) };

        const from = slots[fromIndex];
        const to = slots[toIndex];
        if (!slotHasItem(from)) {
            return { error: 'EMPTY_SOURCE' };
        }

        const moveQty = quantity == null ? from.quantity : Math.min(quantity, from.quantity);
        const itemDef = getGameItem(from.itemId);
        const maxStack = itemDef?.maxStack || GI.MAX_STACK;

        if (!slotHasItem(to)) {
            to.itemId = from.itemId;
            to.quantity = moveQty;
            to.metadata = { ...from.metadata };
            from.quantity -= moveQty;
            if (from.quantity <= 0) {
                slots[fromIndex] = emptySlot();
            }
        } else if (to.itemId === from.itemId) {
            const space = maxStack - to.quantity;
            const transfer = Math.min(moveQty, space);
            to.quantity += transfer;
            from.quantity -= transfer;
            if (from.quantity <= 0) {
                slots[fromIndex] = emptySlot();
            }
        } else {
            const temp = { ...to };
            to.itemId = from.itemId;
            to.quantity = from.quantity;
            to.metadata = { ...from.metadata };
            from.itemId = temp.itemId;
            from.quantity = temp.quantity;
            from.metadata = { ...temp.metadata };
        }

        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.syncHotbarAfterMove(hotbar, fromIndex, toIndex, slots);
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };

        return { success: true, inventory: this.serializeInventory(updated) };
    }

    /**
     * Remove quantity from a specific slot (world drop, consume, etc.).
     */
    async removeFromSlot(walletAddress, slotIndex, quantity = 1) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);

        if (slotIndex < 0 || slotIndex >= unlockedSlots) {
            return { error: 'INVALID_SLOT' };
        }

        const slot = slots[slotIndex];
        if (!slotHasItem(slot)) {
            return { error: 'EMPTY_SOURCE', message: 'That slot is empty.' };
        }

        const takeQty = Math.min(Math.max(1, quantity), slot.quantity);
        const removed = {
            itemId: slot.itemId,
            quantity: takeQty,
            metadata: { ...slot.metadata }
        };

        slot.quantity -= takeQty;
        if (slot.quantity <= 0) {
            slots[slotIndex] = emptySlot();
        }

        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.sanitizeHotbar(slots, hotbar);
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };

        return {
            success: true,
            inventory: this.serializeInventory(updated),
            removed
        };
    }

    /**
     * One-time free basic rod near Old Salty (server-authoritative).
     */
    async claimStarterRod(walletAddress) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        if (user.fishingProgress?.starterRodClaimed) {
            return { error: 'ALREADY_CLAIMED', message: 'You already picked up the starter rod' };
        }

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        if (this.countItemInSlots(slots, 'basic_rod') > 0) {
            await User.findOneAndUpdate(
                { walletAddress },
                { $set: { 'fishingProgress.starterRodClaimed': true } },
                { new: true }
            );
            return { error: 'ALREADY_OWNED', message: 'You already have a basic rod' };
        }

        const addResult = await this.addItem(walletAddress, 'basic_rod', 1, this.getGearMetadataForNewItem('basic_rod'));
        if (addResult.error) return addResult;

        let inventory = addResult.inventory;
        const autoEquipped = await this.autoEquipToolToHotbar(walletAddress, 'basic_rod');
        if (autoEquipped) inventory = autoEquipped;

        await User.findOneAndUpdate(
            { walletAddress },
            { $set: { 'fishingProgress.starterRodClaimed': true } },
            { new: true }
        );

        return {
            success: true,
            itemId: 'basic_rod',
            inventory
        };
    }

    /**
     * Unlock more backpack slots for gold.
     */
    async upgradeBackpack(walletAddress) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        const unlockedSlots = this.getUnlockedSlots(user);
        const upgrade = getBackpackUpgradeInfo(unlockedSlots);
        if (!upgrade) return { error: 'MAX_SLOTS', message: 'Backpack is already max size' };

        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);

        if (upgrade.woodRequired) {
            for (const [itemId, qty] of Object.entries(upgrade.woodRequired)) {
                const have = this.countItemInSlots(slots, itemId);
                if (have < qty) {
                    return {
                        error: 'INSUFFICIENT_WOOD',
                        message: `Need ${qty} of each wood type (${itemId}: ${have}/${qty})`,
                        woodRequired: upgrade.woodRequired,
                        itemId,
                        need: qty,
                        have
                    };
                }
            }
        }

        const deduct = await this.userService.addCoins(
            walletAddress,
            -upgrade.cost,
            'backpack_upgrade',
            {
                fromSlots: unlockedSlots,
                toSlots: upgrade.nextSlots,
                woodRequired: upgrade.woodRequired || undefined
            },
            `Backpack upgrade ${unlockedSlots}→${upgrade.nextSlots} slots`
        );
        if (!deduct.success) {
            return {
                error: 'INSUFFICIENT_FUNDS',
                message: `Need ${upgrade.cost}g (you have ${deduct.currentBalance ?? 0})`,
                cost: upgrade.cost
            };
        }

        if (upgrade.woodRequired) {
            for (const [itemId, qty] of Object.entries(upgrade.woodRequired)) {
                let remaining = qty;
                for (let i = 0; i < slots.length && remaining > 0; i++) {
                    const slot = slots[i];
                    if (slot?.itemId !== itemId) continue;
                    const take = Math.min(remaining, slot.quantity);
                    slot.quantity -= take;
                    remaining -= take;
                    if (slot.quantity <= 0) slots[i] = emptySlot();
                }
            }
        }

        while (slots.length < upgrade.nextSlots) {
            slots.push(emptySlot());
        }

        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.sanitizeHotbar(slots, hotbar);
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'gameInventory.unlockedSlots': upgrade.nextSlots,
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };

        return {
            success: true,
            goldSpent: upgrade.cost,
            woodSpent: upgrade.woodRequired || null,
            newBalance: deduct.newBalance,
            unlockedSlots: upgrade.nextSlots,
            inventory: this.serializeInventory(updated)
        };
    }

    /**
     * Two-step wood + gold rod upgrades at Old Salty (fish_buyer).
     */
    async upgradeRod(walletAddress, merchantId = 'fish_buyer') {
        if (merchantId !== 'fish_buyer') {
            return { error: 'WRONG_MERCHANT', message: 'Rod upgrades are only available from Old Salty' };
        }

        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        const completedSteps = getRodUpgradeStep(user);
        if (completedSteps >= ROD_UPGRADE_MAX_STEP) {
            return { error: 'MAX_ROD', message: 'Your rod is fully upgraded to Master' };
        }

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        const ownsRod = (id) => this.countItemInSlots(slots, id) > 0;
        const step = getNextRodUpgrade(completedSteps, ownsRod);

        if (!step) {
            return {
                error: 'MISSING_ROD',
                message: 'Keep your current rod in the backpack to upgrade it'
            };
        }

        for (const [woodId, qty] of Object.entries(step.woodRequired)) {
            const have = this.countItemInSlots(slots, woodId);
            if (have < qty) {
                return {
                    error: 'INSUFFICIENT_WOOD',
                    message: `Need ${qty} ${woodId} (have ${have})`,
                    woodRequired: step.woodRequired,
                    itemId: woodId,
                    need: qty,
                    have
                };
            }
        }

        const userFresh = await this.userService.getUser(walletAddress);
        if (!userFresh || userFresh.coins < step.goldCost) {
            return {
                error: 'INSUFFICIENT_FUNDS',
                message: `Need ${step.goldCost}g (you have ${userFresh?.coins || 0}g)`,
                cost: step.goldCost
            };
        }

        const deduct = await this.userService.addCoins(
            walletAddress,
            -step.goldCost,
            'rod_upgrade',
            { stepId: step.id, merchantId },
            `Rod upgrade: ${step.label}`
        );
        if (!deduct.success) return deduct;

        for (const [woodId, qty] of Object.entries(step.woodRequired)) {
            let remaining = qty;
            for (let i = 0; i < slots.length && remaining > 0; i++) {
                const slot = slots[i];
                if (slot?.itemId !== woodId) continue;
                const take = Math.min(remaining, slot.quantity);
                slot.quantity -= take;
                remaining -= take;
                if (slot.quantity <= 0) slots[i] = emptySlot();
            }
        }

        const newStep = completedSteps + 1;

        if (step.grantsRodId) {
            const rodSlotIdx = slots.findIndex((s) => s?.itemId === step.requiredRodId);
            if (rodSlotIdx === -1) {
                return { error: 'MISSING_ROD', message: 'Required rod not found in backpack' };
            }
            slots[rodSlotIdx] = {
                itemId: step.grantsRodId,
                quantity: 1,
                metadata: this.getGearMetadataForNewItem(step.grantsRodId)
            };
        }

        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.sanitizeHotbar(slots, hotbar);
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'fishingProgress.rodUpgradeStep': newStep,
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };

        let inventory = this.serializeInventory(updated);
        if (step.grantsRodId) {
            const autoEquipped = await this.autoEquipToolToHotbar(walletAddress, step.grantsRodId);
            if (autoEquipped) inventory = autoEquipped;
        }

        const grantedDef = step.grantsRodId ? getGameItem(step.grantsRodId) : null;

        return {
            success: true,
            stepIndex: newStep,
            stepId: step.id,
            grantsRodId: step.grantsRodId,
            itemName: grantedDef?.name || step.label,
            label: step.label,
            goldSpent: step.goldCost,
            woodSpent: step.woodRequired,
            newBalance: deduct.newBalance,
            inventory,
            isPartialStep: !step.grantsRodId
        };
    }

    /** Count total quantity of an item across all backpack slots. */
    countItemInSlots(slots, itemId) {
        let total = 0;
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            if (slot?.itemId === itemId) total += Number(slot.quantity) || 0;
        }
        return total;
    }

    /**
     * Buy a listed item from a merchant (tools, bait, etc.).
     */
    async buyFromMerchant(walletAddress, merchantId, itemId) {
        const merchant = getMerchant(merchantId);
        if (!merchant) return { error: 'UNKNOWN_MERCHANT' };

        const listing = merchant.sells?.find(s => s.itemId === itemId);
        if (!listing) return { error: 'NOT_FOR_SALE', message: 'That item is not sold here' };

        const itemDef = getGameItem(itemId);
        if (!itemDef) return { error: 'INVALID_ITEM' };

        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);

        if ((itemDef.maxStack || 1) === 1 && this.countItemInSlots(slots, itemId) > 0) {
            return { error: 'ALREADY_OWNED', message: 'You already own this item' };
        }

        if (itemDef.category === 'tool' || itemDef.category === 'rod') {
            const prereq = getToolPurchasePrerequisite(
                itemId,
                (toolId) => this.countItemInSlots(slots, toolId) > 0
            );
            if (prereq) {
                return {
                    error: 'MISSING_TOOL_PREREQUISITE',
                    message: prereq.message,
                    requiredItemId: prereq.requiredItemId,
                };
            }
        }

        const woodRequired = listing.woodRequired || ECONOMY.RODS?.[itemId]?.woodRequired || null;
        if (woodRequired) {
            for (const [woodId, qty] of Object.entries(woodRequired)) {
                const have = this.countItemInSlots(slots, woodId);
                if (have < qty) {
                    return {
                        error: 'INSUFFICIENT_WOOD',
                        message: `Need ${qty} ${woodId} (have ${have})`,
                        woodRequired,
                        itemId: woodId,
                        need: qty,
                        have
                    };
                }
            }
        }

        const userFresh = await this.userService.getUser(walletAddress);
        if (!userFresh || userFresh.coins < listing.cost) {
            return {
                error: 'INSUFFICIENT_FUNDS',
                message: `Need ${listing.cost}g (you have ${userFresh?.coins || 0}g)`,
                cost: listing.cost
            };
        }

        const deduct = await this.userService.addCoins(
            walletAddress,
            -listing.cost,
            merchant.buyTransactionType || 'merchant_buy',
            { itemId, merchantId, merchantName: merchant.name, cost: listing.cost },
            `Bought ${itemDef.name} from ${merchant.name}`
        );

        if (!deduct.success) return deduct;

        if (woodRequired) {
            for (const [woodId, qty] of Object.entries(woodRequired)) {
                let remaining = qty;
                for (let i = 0; i < slots.length && remaining > 0; i++) {
                    const slot = slots[i];
                    if (slot?.itemId !== woodId) continue;
                    const take = Math.min(remaining, slot.quantity);
                    slot.quantity -= take;
                    remaining -= take;
                    if (slot.quantity <= 0) slots[i] = emptySlot();
                }
            }
            await this.persistUserInventory(walletAddress, slots);
        }

        const toolMeta = this.getGearMetadataForNewItem(itemId);
        const addResult = await this.addItem(walletAddress, itemId, 1, toolMeta);
        if (addResult.error) {
            await this.userService.addCoins(
                walletAddress,
                listing.cost,
                'merchant_buy_refund',
                { itemId, merchantId },
                `Refund — ${addResult.message || addResult.error}`
            );
            return addResult;
        }
        let inventory = addResult.inventory;
        if (itemDef.category === 'tool' || itemDef.category === 'rod') {
            const autoEquipped = await this.autoEquipToolToHotbar(walletAddress, itemId);
            if (autoEquipped) inventory = autoEquipped;
        }

        return {
            success: true,
            itemId,
            itemName: itemDef.name,
            goldSpent: listing.cost,
            woodSpent: woodRequired || null,
            newBalance: deduct.newBalance,
            merchantId,
            merchantName: merchant.name,
            inventory
        };
    }

    /**
     * @returns {{ error: string, message?: string } | { slotIndex: number, sellQty: number, goldEarned: number, soldItemId: string, category: string }}
     */
    computeSellEntry(merchant, merchantId, slots, unlockedSlots, slotIndex, quantity = 1) {
        if (slotIndex < 0 || slotIndex >= unlockedSlots) {
            return { error: 'INVALID_SLOT' };
        }

        const slot = slots[slotIndex];
        if (!slotHasItem(slot)) {
            return { error: 'EMPTY_SLOT' };
        }

        const itemDef = getGameItem(slot.itemId);
        const category = itemDef?.category || slot.metadata?.category || 'unknown';
        if (!merchantAcceptsCategory(merchantId, category)) {
            return { error: 'MERCHANT_REJECTS', message: `${merchant.name} doesn't buy that item` };
        }

        const sellQty = Math.min(quantity, slot.quantity);
        const unitValue = (category === 'fish' && slot.metadata?.npcValue != null)
            ? slot.metadata.npcValue
            : (itemDef?.npcValue ?? slot.metadata?.npcValue ?? 0);
        const categoryRatio = (category === 'wood' || category === 'forage')
            ? ECONOMY.WOODCUTTING.NPC_SELL_RATIO
            : ECONOMY.FISHING.NPC_SELL_RATIO;
        const merchantRatio = merchant.npcSellRatio ?? categoryRatio;
        const goldEarned = Math.floor(unitValue * merchantRatio) * sellQty;
        if (goldEarned <= 0) {
            return { error: 'NO_VALUE' };
        }

        return {
            slotIndex,
            sellQty,
            goldEarned,
            soldItemId: slot.itemId,
            category,
            unitValue,
        };
    }

    applySellEntry(slots, entry) {
        const slot = slots[entry.slotIndex];
        slot.quantity -= entry.sellQty;
        if (slot.quantity <= 0) {
            slots[entry.slotIndex] = emptySlot();
        }
    }

    getSellXpGain(entries) {
        return entries.reduce((sum, entry) => {
            const xpPerGold = entry.category === 'wood' || entry.category === 'forage'
                ? ECONOMY.WOODCUTTING.XP_PER_GOLD_SOLD
                : ECONOMY.FISHING.XP_PER_GOLD_SOLD;
            return sum + xpPerGold * entry.goldEarned;
        }, 0);
    }

    /**
     * Sell items at a merchant NPC (generic — fish buyer, future vendors).
     */
    async sellAtMerchant(walletAddress, merchantId, slotIndex, quantity = 1) {
        const merchant = getMerchant(merchantId);
        if (!merchant) return { error: 'UNKNOWN_MERCHANT' };

        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);

        const entry = this.computeSellEntry(
            merchant, merchantId, slots, unlockedSlots, slotIndex, quantity
        );
        if (entry.error) return entry;

        this.applySellEntry(slots, entry);

        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.sanitizeHotbar(slots, hotbar);
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };

        const coinResult = await this.userService.addCoins(
            walletAddress,
            entry.goldEarned,
            merchant.sellTransactionType || 'fish_sell_npc',
            { itemId: entry.soldItemId, quantity: entry.sellQty, merchantId, merchantName: merchant.name },
            `Sold ${entry.sellQty}x ${entry.soldItemId} to ${merchant.name}`
        );

        if (!coinResult.success) {
            return coinResult;
        }

        const progressPatch = {
            'fishingProgress.skillXp': (updated.fishingProgress?.skillXp || 0) + this.getSellXpGain([entry])
        };
        const finalUser = await User.findOneAndUpdate(
            { walletAddress },
            { $set: progressPatch },
            { new: true }
        );

        return {
            success: true,
            goldEarned: entry.goldEarned,
            newBalance: coinResult.newBalance,
            itemId: entry.soldItemId,
            quantitySold: entry.sellQty,
            merchantId,
            merchantName: merchant.name,
            inventory: this.serializeInventory(finalUser || updated)
        };
    }

    /**
     * Sell multiple backpack stacks to one merchant in a single transaction.
     * @param {string} walletAddress
     * @param {string} merchantId
     * @param {{ slotIndex: number, quantity?: number }[]} sells
     */
    async sellBatchAtMerchant(walletAddress, merchantId, sells) {
        const merchant = getMerchant(merchantId);
        if (!merchant) return { error: 'UNKNOWN_MERCHANT' };
        if (!Array.isArray(sells) || sells.length === 0) {
            return { error: 'EMPTY_BATCH', message: 'Select items to sell' };
        }

        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);

        const merged = new Map();
        for (const sell of sells) {
            const slotIndex = Number(sell?.slotIndex);
            const quantity = Number(sell?.quantity) || 1;
            if (!Number.isInteger(slotIndex)) continue;
            merged.set(slotIndex, (merged.get(slotIndex) || 0) + quantity);
        }

        const entries = [];
        for (const [slotIndex, quantity] of merged.entries()) {
            const entry = this.computeSellEntry(
                merchant, merchantId, slots, unlockedSlots, slotIndex, quantity
            );
            if (entry.error) return entry;
            entries.push(entry);
        }

        if (entries.length === 0) {
            return { error: 'EMPTY_BATCH', message: 'Select items to sell' };
        }

        entries.sort((a, b) => b.slotIndex - a.slotIndex);
        for (const entry of entries) {
            this.applySellEntry(slots, entry);
        }

        const totalGold = entries.reduce((sum, entry) => sum + entry.goldEarned, 0);
        const totalQty = entries.reduce((sum, entry) => sum + entry.sellQty, 0);

        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.sanitizeHotbar(slots, hotbar);
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };

        const soldSummary = entries.map((entry) => `${entry.sellQty}x ${entry.soldItemId}`).join(', ');
        const coinResult = await this.userService.addCoins(
            walletAddress,
            totalGold,
            merchant.sellTransactionType || 'fish_sell_npc',
            {
                merchantId,
                merchantName: merchant.name,
                batchSize: entries.length,
                items: entries.map(({ soldItemId, sellQty, goldEarned }) => ({ soldItemId, sellQty, goldEarned })),
            },
            `Sold ${soldSummary} to ${merchant.name}`
        );

        if (!coinResult.success) {
            return coinResult;
        }

        const progressPatch = {
            'fishingProgress.skillXp': (updated.fishingProgress?.skillXp || 0) + this.getSellXpGain(entries)
        };
        const finalUser = await User.findOneAndUpdate(
            { walletAddress },
            { $set: progressPatch },
            { new: true }
        );

        return {
            success: true,
            goldEarned: totalGold,
            quantitySold: totalQty,
            stacksSold: entries.length,
            newBalance: coinResult.newBalance,
            merchantId,
            merchantName: merchant.name,
            inventory: this.serializeInventory(finalUser || updated)
        };
    }

    /** @deprecated use sellAtMerchant */
    async sellFishAtNpc(walletAddress, slotIndex, quantity = 1) {
        return this.sellAtMerchant(walletAddress, 'fish_buyer', slotIndex, quantity);
    }

    async countItem(walletAddress, itemId) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return 0;
        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        let total = 0;
        for (const slot of slots) {
            if (slot?.itemId === itemId) total += Number(slot.quantity) || 0;
        }
        return total;
    }

    async removeItemsById(walletAddress, itemId, quantity = 1) {
        const user = await this.ensureInventory(walletAddress);
        if (!user) return { error: 'USER_NOT_FOUND' };
        if (quantity <= 0) return { error: 'INVALID_QUANTITY' };

        const unlockedSlots = this.getUnlockedSlots(user);
        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);
        let remaining = quantity;

        for (let i = 0; i < slots.length && remaining > 0; i++) {
            const slot = slots[i];
            if (slot?.itemId !== itemId) continue;
            const take = Math.min(remaining, slot.quantity);
            slot.quantity -= take;
            remaining -= take;
            if (slot.quantity <= 0) slots[i] = emptySlot();
        }

        if (remaining > 0) {
            return { error: 'NOT_ENOUGH_ITEMS', message: `Need ${quantity}x ${itemId}` };
        }

        const hotbar = this.normalizeHotbar(user.gameInventory?.hotbar);
        this.sanitizeHotbar(slots, hotbar);
        const updated = await this.persistUserInventory(walletAddress, slots, null, {
            'gameInventory.hotbar': hotbar
        });
        if (!updated) return { error: 'SAVE_FAILED' };

        return { success: true, inventory: this.serializeInventory(updated) };
    }

    /**
     * Consume one ferry ticket matching a travel route (if present).
     */
    async tryConsumeFerryTicket(walletAddress, routeId) {
        const ticketItemId = getFerryTicketItemForRoute(routeId);
        if (!ticketItemId) return { consumed: false };
        const count = await this.countItem(walletAddress, ticketItemId);
        if (count < 1) return { consumed: false };
        const result = await this.removeItemsById(walletAddress, ticketItemId, 1);
        if (result.error) return { consumed: false, error: result.error };
        return { consumed: true, itemId: ticketItemId, inventory: result.inventory };
    }

    /**
     * Ranger quest — trade mushrooms for a ferry ticket back toward town.
     */
    async turnInMushroomQuest(walletAddress) {
        const have = await this.countItem(walletAddress, 'forest_mushroom');
        if (have < MUSHROOM_QUEST_REQUIRED) {
            return {
                error: 'NOT_ENOUGH',
                message: `Need ${MUSHROOM_QUEST_REQUIRED} forest mushrooms (you have ${have}).`,
                have,
                required: MUSHROOM_QUEST_REQUIRED
            };
        }

        const removed = await this.removeItemsById(walletAddress, 'forest_mushroom', MUSHROOM_QUEST_REQUIRED);
        if (removed.error) return removed;

        const added = await this.addItem(walletAddress, MUSHROOM_QUEST_REWARD_ITEM, 1);
        if (added.error) return added;

        return {
            success: true,
            mushroomsTurnedIn: MUSHROOM_QUEST_REQUIRED,
            rewardItemId: MUSHROOM_QUEST_REWARD_ITEM,
            inventory: added.inventory
        };
    }
}

function usedSlotsAfter(slots) {
    return slots.filter(slotHasItem).length;
}

export default GameInventoryService;

