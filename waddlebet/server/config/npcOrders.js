/**
 * NPC daily orders — material turn-ins pay a small gold contractor bonus.
 */

/** @typedef {'fish_any' | 'fish_min_tier' | 'item' | 'items_mixed'} NpcOrderRequirementType */
/** @typedef {{ itemId: string, quantity: number }} NpcOrderItemReq */
/** @typedef {{ itemId: string, quantity: number }} NpcOrderItemReward */

const WOOD_NPC_VALUE = {
    pine_log: 3,
    birch_log: 6,
    oak_log: 10,
    ironwood_log: 16,
};

const WOOD_MIX_BASE = [
    { itemId: 'pine_log', quantity: 128 },
    { itemId: 'birch_log', quantity: 80 },
    { itemId: 'oak_log', quantity: 48 },
    { itemId: 'ironwood_log', quantity: 16 },
];

const CLIVE_ORDER_LABELS = [
    {
        label: "Clive's timber bundle",
        briefingTitle: 'Timber Supply Contract',
        briefing: 'I need a full spread of logs for the mill — pine, birch, oak, and a touch of ironwood. Chop the Forest Trails and bring the bundle back here.',
        hint: 'Mixed contractor order — every wood type counts. More pine & birch, less oak & ironwood.',
    },
    {
        label: "Clive's supply run",
        briefingTitle: 'Heavy Supply Run',
        briefing: 'The workshop is backed up. Haul a heavy mixed load from the forest — all four wood types on my list.',
        hint: 'Heavy forest day — deliver a full spread of logs from pine through ironwood.',
    },
    {
        label: "Clive's mill contract",
        briefingTitle: 'Mill Contract',
        briefing: 'Premium timber only today. Fill my ironwood quota and don\'t skimp on birch and oak.',
        hint: 'Premium timber bundle — chop all four wood tiers for a contractor bonus.',
    },
];

const SALTY_ORDER_VARIANTS = [
    {
        label: "Salty's catch order",
        briefingTitle: 'Daily Catch Contract',
        briefing: 'The ice holes are biting but my buyers want volume. Fill this crate with fish — any species counts.',
        hint: 'Bring 24 fish of any species to Old Salty at Snow Forts.',
        requirementType: 'fish_any',
        quantity: 24,
        goldReward: 18,
    },
    {
        label: "Salty's reef order",
        briefingTitle: 'Reef Quality Contract',
        briefing: 'Tavern wants better fillets today. Bring uncommon fish from deeper holes — tier two or higher.',
        hint: 'Bring 16 uncommon+ fish (tier 2 or better) — deeper holes help!',
        requirementType: 'fish_min_tier',
        minTier: 2,
        quantity: 16,
        goldReward: 22,
    },
    {
        label: "Salty's trophy order",
        briefingTitle: 'Trophy Catch Contract',
        briefing: 'High rollers are in town. I need rare trophy fish — only the best from your pack.',
        hint: 'Bring 12 rare fish (tier 3+) for a premium contractor bonus.',
        requirementType: 'fish_min_tier',
        minTier: 3,
        quantity: 12,
        goldReward: 32,
    },
];

const ORDER_TEMPLATES = [
    {
        questId: 'salty_daily_catch',
        merchantId: 'fish_buyer',
        npcId: 'old_salty',
        turnInLabel: "Turn in today's catch order",
        variants: SALTY_ORDER_VARIANTS,
    },
    {
        questId: 'clive_daily_timber',
        merchantId: 'supply_merchant',
        npcId: 'copper_clive',
        turnInLabel: "Turn in today's timber order",
        kind: 'wood_mix',
    },
];

function dayIndex(utcDay = getUtcDayKey()) {
    const n = Number(utcDay.replace(/-/g, ''));
    return Number.isFinite(n) ? n : 0;
}

export function buildWoodMixItems(idx = 0) {
    const scale = 1 + (idx % 3) * 0.15;
    return WOOD_MIX_BASE.map(({ itemId, quantity }) => ({
        itemId,
        quantity: Math.max(1, Math.round(quantity * scale)),
    }));
}

/** Gold contractor fee scaled to bundle size (player already turns in the wood). */
export function woodMixGoldReward(items) {
    const total = woodMixTotalQuantity(items);
    return Math.round(12 + total * 0.12);
}

export function woodMixTotalQuantity(items) {
    return items.reduce((sum, entry) => sum + entry.quantity, 0);
}

function buildCliveOrder(idx) {
    const items = buildWoodMixItems(idx);
    const copy = CLIVE_ORDER_LABELS[idx % CLIVE_ORDER_LABELS.length];
    const parts = items.map((i) => `${i.quantity} ${i.itemId.replace('_log', '')}`).join(', ');
    return {
        label: copy.label,
        briefingTitle: copy.briefingTitle,
        briefing: copy.briefing,
        hint: `${copy.hint} (${parts}).`,
        requirementType: 'items_mixed',
        items,
        quantity: woodMixTotalQuantity(items),
        goldReward: woodMixGoldReward(items),
    };
}

export function getOrdersForDay(utcDay = getUtcDayKey()) {
    const idx = dayIndex(utcDay);
    return ORDER_TEMPLATES.map((template) => {
        if (template.kind === 'wood_mix') {
            const variant = buildCliveOrder(idx);
            return {
                questId: template.questId,
                merchantId: template.merchantId,
                npcId: template.npcId,
                turnInLabel: template.turnInLabel,
                requirementType: variant.requirementType,
                items: variant.items,
                quantity: variant.quantity,
                goldReward: variant.goldReward,
                label: variant.label,
                briefingTitle: variant.briefingTitle,
                briefing: variant.briefing,
                hint: variant.hint,
            };
        }
        const variant = template.variants[idx % template.variants.length];
        const requirementType = variant.itemId ? 'item' : variant.requirementType;
        return {
            questId: template.questId,
            merchantId: template.merchantId,
            npcId: template.npcId,
            turnInLabel: template.turnInLabel,
            requirementType,
            itemId: variant.itemId,
            minTier: variant.minTier,
            quantity: variant.quantity,
            goldReward: variant.goldReward ?? 0,
            label: variant.label,
            briefingTitle: variant.briefingTitle,
            briefing: variant.briefing,
            hint: variant.hint,
        };
    });
}

export const NPC_DAILY_ORDERS = getOrdersForDay();

export function getNpcDailyOrder(questId, utcDay = getUtcDayKey()) {
    return getOrdersForDay(utcDay).find((o) => o.questId === questId) || null;
}

export function getUtcDayKey(date = new Date()) {
    return date.toISOString().slice(0, 10);
}

export default getOrdersForDay;
