/**

 * GameInventoryService — Grid backpack for gameplay items (fish, resources, gear).

 * Separate from cosmetic OwnedCosmetic wardrobe.

 */



import { User } from '../db/models/index.js';

import { ECONOMY, getBackpackUpgradeInfo, getMaxSlotCount } from '../config/economy.js';

import { getGameItem, isFishItem, getFishRarityLabel, getFishRarityDisplay } from '../config/gameItems.js';

import { getMerchant, merchantAcceptsCategory } from '../config/merchants.js';



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

    const npcValue = def?.npcValue ?? meta.npcValue ?? 0;

    const emoji = def?.emoji || meta.emoji || '📦';

    return {

        itemId: slot.itemId,

        quantity: slot.quantity,

        metadata: meta,

        name: def?.name || meta.name || slot.itemId,

        emoji,

        category,

        npcValue,

        tier: def?.tier || meta.tier || 0,

        rarity: getFishRarityLabel(slot.itemId),

        rarityDisplay: getFishRarityDisplay(slot.itemId),

        maxStack: def?.maxStack || GI.MAX_STACK

    };

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



        return {

            columns: user.gameInventory?.columns || GI.COLUMNS,

            rows: user.gameInventory?.displayRows || GI.DISPLAY_ROWS,

            unlockedSlots,

            maxSlots: getMaxSlotCount(),

            slotCount: unlockedSlots,

            usedSlots,

            slots: slots.map(enrichSlot),

            nextUpgrade,

            fishingProgress: user.fishingProgress || null

        };

    }



    async getInventory(walletAddress) {

        const user = await this.ensureInventory(walletAddress);

        if (!user) return { error: 'USER_NOT_FOUND' };

        return { success: true, inventory: this.serializeInventory(user) };

    }



    findStackSlot(slots, itemId) {

        return slots.findIndex(s => (

            s.itemId === itemId

            && s.quantity < (getGameItem(itemId)?.maxStack || GI.MAX_STACK)

        ));

    }



    findEmptySlot(slots) {

        return slots.findIndex(s => !slotHasItem(s));

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

            tier: metadata.tier ?? itemDef.tier

        };



        while (remaining > 0) {

            let slotIdx = this.findStackSlot(slots, itemId);

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



        const updated = await this.persistUserInventory(walletAddress, slots);

        if (!updated) return { error: 'SAVE_FAILED' };



        return { success: true, inventory: this.serializeInventory(updated) };

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



        const deduct = await this.userService.addCoins(

            walletAddress,

            -upgrade.cost,

            'backpack_upgrade',

            { fromSlots: unlockedSlots, toSlots: upgrade.nextSlots },

            `Backpack upgrade ${unlockedSlots}→${upgrade.nextSlots} slots`

        );

        if (!deduct.success) {

            return {

                error: 'INSUFFICIENT_FUNDS',

                message: `Need ${upgrade.cost}g (you have ${deduct.currentBalance ?? 0})`,

                cost: upgrade.cost

            };

        }



        const slots = normalizeSlots(user.gameInventory?.slots, unlockedSlots);

        while (slots.length < upgrade.nextSlots) {

            slots.push(emptySlot());

        }



        const updated = await this.persistUserInventory(walletAddress, slots, null, {

            'gameInventory.unlockedSlots': upgrade.nextSlots

        });

        if (!updated) return { error: 'SAVE_FAILED' };



        return {

            success: true,

            goldSpent: upgrade.cost,

            newBalance: deduct.newBalance,

            unlockedSlots: upgrade.nextSlots,

            inventory: this.serializeInventory(updated)

        };

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

        const soldItemId = slot.itemId;

        const unitValue = itemDef?.npcValue ?? slot.metadata?.npcValue ?? 0;

        const goldEarned = Math.floor(unitValue * ECONOMY.FISHING.NPC_SELL_RATIO * sellQty);

        if (goldEarned <= 0) {

            return { error: 'NO_VALUE' };

        }



        slot.quantity -= sellQty;

        if (slot.quantity <= 0) {

            slots[slotIndex] = emptySlot();

        }



        const updated = await this.persistUserInventory(walletAddress, slots);

        if (!updated) return { error: 'SAVE_FAILED' };



        const coinResult = await this.userService.addCoins(

            walletAddress,

            goldEarned,

            merchant.sellTransactionType || 'fish_sell_npc',

            { itemId: soldItemId, quantity: sellQty, merchantId, merchantName: merchant.name },

            `Sold ${sellQty}x ${soldItemId} to ${merchant.name}`

        );



        if (!coinResult.success) {

            return coinResult;

        }



        const progressPatch = {

            'fishingProgress.skillXp': (updated.fishingProgress?.skillXp || 0) + ECONOMY.FISHING.XP_PER_GOLD_SOLD * goldEarned

        };

        const finalUser = await User.findOneAndUpdate(

            { walletAddress },

            { $set: progressPatch },

            { new: true }

        );



        return {

            success: true,

            goldEarned,

            newBalance: coinResult.newBalance,

            itemId: soldItemId,

            quantitySold: sellQty,

            merchantId,

            merchantName: merchant.name,

            inventory: this.serializeInventory(finalUser || updated)

        };

    }



    /** @deprecated use sellAtMerchant */

    async sellFishAtNpc(walletAddress, slotIndex, quantity = 1) {

        return this.sellAtMerchant(walletAddress, 'fish_buyer', slotIndex, quantity);

    }

}



function usedSlotsAfter(slots) {

    return slots.filter(slotHasItem).length;

}



export default GameInventoryService;


