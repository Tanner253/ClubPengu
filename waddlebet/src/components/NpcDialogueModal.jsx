/**
 * NpcDialogueModal — Tarkov-style trader UI with typewriter dialogue.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useEscapeKey } from '../hooks';
import { getMerchant } from '../config/merchants';
import { getNpcDisplayName, getNpcTitle } from '../config/worldNpcs';
import { getToolPurchasePrerequisite, STARTER_TOOL_IDS } from '../config/toolTiers';
import { WOOD_LABELS } from '../config/economy';
import NpcSpeechBox, { npcPitchFromId } from './NpcSpeechBox';
import TraderOfferCanvas from './TraderOfferCanvas';
import MaterialBreakdown from './MaterialBreakdown';
import { resolveOfferArt, getOfferDisplayName, getOfferSubtitle } from '../config/merchantOfferArt';
import { playSfx } from '../audio';

function formatOrderReward(order) {
    if (order?.goldReward > 0) return `${order.goldReward}g`;
    if (order?.itemRewards?.length) {
        return order.itemRewards.map((r) => `${r.quantity} ${r.itemId.replace(/_/g, ' ')}`).join(', ');
    }
    return 'supply bonus';
}

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
    forest_ranger: {
        stallName: "Ranger Pike's Post",
        stallIcon: '🌲',
        panelBg: 'from-[#0a1408] via-[#142010] to-[#060a04]',
        banner: 'from-green-600 via-emerald-600 to-green-700',
        bannerText: 'text-green-950',
        accent: 'text-green-300',
        accentMuted: 'text-green-200/70',
        glow: 'rgba(74, 222, 128, 0.3)',
        frameBorder: 'border-green-400/50',
        bubbleBg: 'bg-green-950/50 border-green-500/30',
        choiceBg: 'bg-green-950/40 hover:bg-green-900/60 border-green-500/25 hover:border-green-400/50',
        choiceDisabled: 'bg-black/30 border-white/5',
        badge: 'bg-green-500/20 border-green-400/40 text-green-200',
        portraitRing: 'from-green-400 to-emerald-700',
        loreBg: 'bg-[#0f1a0c]/80 border-green-600/30'
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

function resolveActionState(action, { hasSellableFish, hasSellableWood, ownedToolIds, nextUpgrade, nextRodUpgrade, coins, merchant, mushroomCount = 0, woodCounts = {}, itemCounts = {}, dailyOrders = [] }) {
    let disabled = Boolean(action.disabled);
    let label = action.label;
    let sublabel = null;
    let costBadge = null;

    if (action.requiresFish && !hasSellableFish) {
        disabled = true;
        sublabel = 'Nothing to sell';
    }
    if (action.requiresWood && !hasSellableWood) {
        disabled = true;
        sublabel = 'No timber to sell';
    }
    if (action.requiresMerchantRecipe && action.itemId) {
        const listing = merchant?.sells?.find((s) => s.itemId === action.itemId);
        const materialCost = listing?.materialCost;
        if (!listing) {
            disabled = true;
            sublabel = 'Recipe unavailable';
        } else if (listing.goldMintOutput && materialCost) {
            const parts = Object.entries(materialCost).map(([matId, qty]) => {
                const have = itemCounts[matId] ?? 0;
                const label = WOOD_LABELS[matId] || matId.replace(/_log/g, '').replace(/_/g, ' ');
                return `${label} ${have}/${qty}`;
            });
            sublabel = listing.description || parts.join(', ');
            costBadge = `+${listing.goldMintOutput}g`;
            for (const [matId, qty] of Object.entries(materialCost)) {
                if ((itemCounts[matId] ?? 0) < qty) {
                    disabled = true;
                    break;
                }
            }
        } else if (materialCost) {
            const parts = Object.entries(materialCost).map(([matId, qty]) => {
                const have = itemCounts[matId] ?? 0;
                return `${matId.replace(/_/g, ' ')} ${have}/${qty}`;
            });
            sublabel = parts.join(', ');
            if (listing.quantity) {
                costBadge = `×${listing.quantity}`;
            }
            for (const [matId, qty] of Object.entries(materialCost)) {
                if ((itemCounts[matId] ?? 0) < qty) {
                    disabled = true;
                    break;
                }
            }
        } else if (listing.cost != null && listing.quantity) {
            costBadge = `${listing.cost}g`;
            sublabel = `×${listing.quantity} worm bait`;
            if (coins < listing.cost) {
                disabled = true;
                sublabel = `Need ${listing.cost}g (you have ${coins.toLocaleString()}g)`;
            }
        } else {
            disabled = true;
            sublabel = 'Recipe unavailable';
        }
    }
    if (action.requiresBuyTool && action.itemId) {
        const listing = merchant?.sells?.find(s => s.itemId === action.itemId);
        const cost = listing?.cost ?? 0;
        const woodRequired = listing?.woodRequired;
        costBadge = woodRequired
            ? '🪵 timber'
            : `${cost.toLocaleString()}g`;
        const isStarterTool = STARTER_TOOL_IDS.has(action.itemId);
        if (isStarterTool && ownedToolIds.has(action.itemId)) {
            disabled = true;
            sublabel = 'Already in your backpack';
        } else {
            const prereq = getToolPurchasePrerequisite(action.itemId, (id) => ownedToolIds.has(id));
            if (prereq) {
                disabled = true;
                sublabel = prereq.message;
            } else if (woodRequired) {
                const woodParts = Object.entries(woodRequired).map(([itemId, qty]) => {
                    const label = WOOD_LABELS[itemId] || itemId;
                    const have = woodCounts[itemId] ?? 0;
                    return `${label} ${have}/${qty}`;
                });
                sublabel = `🪵 ${woodParts.join(', ')} + ${cost.toLocaleString()}g`;
                for (const [itemId, qty] of Object.entries(woodRequired)) {
                    if ((woodCounts[itemId] ?? 0) < qty) {
                        disabled = true;
                        break;
                    }
                }
            }
            if (!disabled && coins < cost) {
                disabled = true;
                sublabel = `Need ${cost.toLocaleString()}g (you have ${coins.toLocaleString()}g)`;
            } else if (!disabled && !woodRequired) {
                sublabel = isStarterTool
                    ? 'Equip on hotbar after purchase'
                    : 'Stacks in backpack — buy & sell freely';
            }
        }
    }
    if (action.requiresRodUpgrade && action.id === 'upgrade_rod') {
        if (!nextRodUpgrade) {
            disabled = true;
            label = 'Rod fully upgraded';
            sublabel = 'Master rod complete';
        } else {
            label = nextRodUpgrade.label;
            costBadge = nextRodUpgrade.goldCost > 0
                ? `${nextRodUpgrade.goldCost.toLocaleString()}g + 🪵`
                : '🪵 wood';
            sublabel = nextRodUpgrade.sublabel || nextRodUpgrade.tierName;
            if (nextRodUpgrade.woodRequired) {
                const woodParts = Object.entries(nextRodUpgrade.woodRequired).map(([itemId, qty]) => {
                    const woodLabel = WOOD_LABELS[itemId] || itemId;
                    const have = woodCounts[itemId] ?? 0;
                    return `${woodLabel} ${have}/${qty}`;
                });
                sublabel = `${sublabel} · 🪵 ${woodParts.join(', ')}`;
                for (const [itemId, qty] of Object.entries(nextRodUpgrade.woodRequired)) {
                    if ((woodCounts[itemId] ?? 0) < qty) {
                        disabled = true;
                        const woodLabel = WOOD_LABELS[itemId] || itemId;
                        sublabel = nextRodUpgrade.goldCost > 0
                            ? `Need ${qty} ${woodLabel} (have ${woodCounts[itemId] ?? 0}) + ${nextRodUpgrade.goldCost.toLocaleString()}g`
                            : `Need ${qty} ${woodLabel} (have ${woodCounts[itemId] ?? 0})`;
                        break;
                    }
                }
            }
            if (!disabled && !ownedToolIds.has(nextRodUpgrade.requiredRodId)) {
                disabled = true;
                sublabel = 'Keep your rod in the backpack to upgrade';
            }
            if (!disabled && nextRodUpgrade.goldCost > 0 && coins < nextRodUpgrade.goldCost) {
                disabled = true;
                sublabel = `Need ${nextRodUpgrade.goldCost.toLocaleString()}g (you have ${coins.toLocaleString()}g)`;
            }
        }
    }
    if (action.requiresBuyAxe && action.id === 'buy_basic_axe') {
        const listing = merchant?.sells?.find(s => s.itemId === 'basic_axe');
        const cost = listing?.cost ?? 0;
        costBadge = listing?.woodRequired ? '🪵 timber' : `${cost.toLocaleString()}g`;
        if (ownedToolIds.has('basic_axe')) {
            disabled = true;
            label = 'Basic Axe';
            sublabel = 'Already in your backpack';
        } else if (coins < cost) {
            disabled = true;
            sublabel = `Need ${cost.toLocaleString()}g (you have ${coins.toLocaleString()}g)`;
        } else {
            sublabel = 'Chop trees in the Forest Trails';
        }
    }
    if (action.requiresUpgrade && action.id === 'upgrade_backpack') {
        if (!nextUpgrade) {
            disabled = true;
            label = 'Backpack maxed out';
            sublabel = 'All slots unlocked';
        } else {
            if (nextUpgrade.cost > 0) {
                costBadge = `${nextUpgrade.cost.toLocaleString()}g`;
            } else if (nextUpgrade.woodRequired) {
                costBadge = '🪵 Wood';
            }
            sublabel = `+${nextUpgrade.slotsAdded} slots → ${nextUpgrade.nextSlots} total`;
            if (nextUpgrade.woodRequired) {
                const woodParts = Object.entries(nextUpgrade.woodRequired).map(([itemId, qty]) => {
                    const label = WOOD_LABELS[itemId] || itemId;
                    const have = woodCounts[itemId] ?? 0;
                    return `${label} ${have}/${qty}`;
                });
                sublabel = `${sublabel} · 🪵 ${woodParts.join(', ')}`;
                for (const [itemId, qty] of Object.entries(nextUpgrade.woodRequired)) {
                    if ((woodCounts[itemId] ?? 0) < qty) {
                        disabled = true;
                        const label = WOOD_LABELS[itemId] || itemId;
                        sublabel = `Need ${qty} ${label} (have ${woodCounts[itemId] ?? 0})`;
                        break;
                    }
                }
            }
            if (!disabled && nextUpgrade.cost > 0 && coins < nextUpgrade.cost) {
                disabled = true;
                sublabel = `Need ${nextUpgrade.cost.toLocaleString()}g (you have ${coins.toLocaleString()}g)`;
            }
        }
    }
    if (action.requiresMushrooms && action.id === 'quest_mushroom_ticket') {
        const required = 5;
        costBadge = `${required}🍄`;
        sublabel = `You have ${mushroomCount}/${required} mushrooms`;
        if (mushroomCount < required) {
            disabled = true;
            sublabel = `Gather ${required - mushroomCount} more on the trails (slow respawn)`;
        } else {
            sublabel = 'Earn a 🎫 ferry ticket to Town';
        }
    }
    if (action.requiresDailyOrder) {
        const order = dailyOrders.find((o) => o.questId === action.requiresDailyOrder);
        let orderBriefing = null;
        if (!order) {
            disabled = true;
            sublabel = 'Finish Getting Started first';
        } else if (order.completed) {
            disabled = true;
            label = 'Contract fulfilled';
            sublabel = 'New contract tomorrow at midnight UTC';
        } else if (!order.accepted) {
            label = order.briefingTitle || order.label || "Today's contract";
            sublabel = order.briefing || order.hint;
            costBadge = order.goldReward > 0 ? `+${order.goldReward}g` : null;
            orderBriefing = {
                title: order.briefingTitle || order.label,
                subtitle: order.briefing,
                items: order.items,
                breakdown: order.breakdown,
                required: order.required,
                requirementType: order.requirementType,
                goldReward: order.goldReward,
            };
        } else if (order.ready) {
            label = 'Turn in contract';
            sublabel = `All requirements met — claim your +${formatOrderReward(order)} bonus`;
            costBadge = formatOrderReward(order);
            orderBriefing = {
                title: order.label,
                subtitle: 'Ready to deliver!',
                items: order.items,
                breakdown: order.breakdown,
                required: order.required,
                requirementType: order.requirementType,
                goldReward: order.goldReward,
            };
        } else {
            disabled = true;
            label = 'Contract in progress';
            costBadge = order.requirementType === 'items_mixed' && order.breakdown?.length
                ? `${order.breakdown.filter((r) => (r.liveHave ?? r.have) >= r.quantity).length}/${order.breakdown.length}`
                : `${order.have}/${order.required}`;
            if (order.requirementType === 'items_mixed' && order.breakdown?.length) {
                const missing = order.breakdown
                    .filter((row) => (row.liveHave ?? row.have) < row.quantity)
                    .map((row) => `${row.quantity - (row.liveHave ?? row.have)} ${row.itemId.replace('_log', '')}`)
                    .join(', ');
                sublabel = missing ? `Still need: ${missing}` : 'Almost there…';
            } else if (order.questId === 'salty_daily_catch') {
                const need = Math.max(0, order.required - order.have);
                sublabel = `Catch ${need} more fish (any species)`;
            } else {
                const need = Math.max(0, order.required - order.have);
                sublabel = `Need ${need} more`;
            }
            orderBriefing = {
                title: order.label,
                subtitle: order.hint,
                items: order.items,
                breakdown: order.breakdown,
                required: order.required,
                requirementType: order.requirementType,
                goldReward: order.goldReward,
            };
        }
        return { disabled, label, sublabel, costBadge, orderBriefing, order };
    }

    return { disabled, label, sublabel, costBadge, orderBriefing: null, order: null };
}

const TRADER_TABS = [
    { id: 'deals', label: 'DEALS' },
    { id: 'gear', label: 'GEAR' },
    { id: 'tasks', label: 'TASKS' },
    { id: 'sell', label: 'SELL' },
    { id: 'info', label: 'INTEL' },
];

function getActionCategory(action) {
    if (action.loreText) return 'info';
    if (action.requiresDailyOrder || action.requiresMushrooms || action.id?.startsWith('quest_')) return 'tasks';
    if (action.requiresMerchantRecipe) return 'deals';
    if (action.requiresBuyTool || action.requiresUpgrade || action.requiresRodUpgrade || action.id === 'buy_basic_axe') {
        return 'gear';
    }
    if (action.id === 'open_backpack') return 'sell';
    return 'other';
}

function shortCardLabel(label = '') {
    const trimmed = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (trimmed.length <= 28) return trimmed;
    return `${trimmed.slice(0, 26)}…`;
}

export default function NpcDialogueModal({
    isOpen,
    npcDef,
    onClose,
    onAction,
    gameInventory,
    coins = 0,
    dailyOrders = [],
}) {
    const [loreText, setLoreText] = useState(null);
    const [actionFeedback, setActionFeedback] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);
    const [greetingDone, setGreetingDone] = useState(false);
    const [activeTab, setActiveTab] = useState('deals');
    const [selectedActionId, setSelectedActionId] = useState(null);
    const [questBriefingText, setQuestBriefingText] = useState(null);
    const [chestOpening, setChestOpening] = useState(false);

    useEscapeKey(onClose, isOpen);

    useEffect(() => {
        if (!isOpen) return;
        setGreetingDone(false);
        setLoreText(null);
        setActionFeedback(null);
        setSelectedActionId(null);
        setActiveTab('deals');
        setQuestBriefingText(null);
        setChestOpening(false);
        playSfx('ui_open');
    }, [isOpen, npcDef?.merchantId, npcDef?.npcId]);

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

    const hasSellableWood = useMemo(() => (
        gameInventory?.slots?.some(s => s?.itemId && s.quantity > 0 && s.category === 'wood' && s.npcValue > 0)
    ), [gameInventory]);

    const ownedToolIds = useMemo(() => new Set(
        (gameInventory?.slots || [])
            .filter(s => s?.itemId && s.quantity > 0 && (s.category === 'tool' || s.category === 'rod'))
            .map(s => s.itemId)
    ), [gameInventory]);

    const nextUpgrade = gameInventory?.nextUpgrade;
    const nextRodUpgrade = gameInventory?.nextRodUpgrade;

    const mushroomCount = useMemo(() => (
        (gameInventory?.slots || [])
            .filter(s => s?.itemId === 'forest_mushroom' && s.quantity > 0)
            .reduce((sum, s) => sum + s.quantity, 0)
    ), [gameInventory]);

    const itemCounts = useMemo(() => {
        const counts = {};
        for (const slot of gameInventory?.slots || []) {
            if (!slot?.itemId || !(slot.quantity > 0)) continue;
            counts[slot.itemId] = (counts[slot.itemId] || 0) + (slot.quantity || 0);
        }
        return counts;
    }, [gameInventory]);

    const woodCounts = useMemo(() => {
        const counts = {};
        for (const slot of gameInventory?.slots || []) {
            if (!slot?.itemId || slot.category !== 'wood') continue;
            counts[slot.itemId] = (counts[slot.itemId] || 0) + (slot.quantity || 0);
        }
        return counts;
    }, [gameInventory]);

    const fishTotal = useMemo(() => (
        (gameInventory?.slots || [])
            .filter((s) => s?.itemId && s.quantity > 0 && s.category === 'fish')
            .reduce((sum, s) => sum + s.quantity, 0)
    ), [gameInventory]);

    const resolvedDailyOrders = useMemo(() => (
        (dailyOrders || []).map((order) => {
            if (order.completed) return order;
            let have = order.have ?? 0;
            if (order.questId === 'salty_daily_catch') {
                have = Math.max(have, fishTotal);
            } else if (order.questId === 'clive_daily_timber') {
                have = Math.max(have, woodCounts.pine_log || 0);
            }
            const required = order.required ?? 1;
            return {
                ...order,
                have: Math.min(have, required),
                ready: have >= required,
            };
        })
    ), [dailyOrders, fishTotal, woodCounts]);

    const menuActions = useMemo(
        () => (npcDef?.actions || []).filter(a => a.id !== 'close'),
        [npcDef?.actions]
    );

    const actionContext = useMemo(() => ({
        hasSellableFish,
        hasSellableWood,
        ownedToolIds,
        nextUpgrade,
        nextRodUpgrade,
        coins,
        merchant,
        mushroomCount,
        woodCounts,
        itemCounts,
        dailyOrders: resolvedDailyOrders,
    }), [
        hasSellableFish, hasSellableWood, ownedToolIds, nextUpgrade, nextRodUpgrade,
        coins, merchant, mushroomCount, woodCounts, itemCounts, resolvedDailyOrders,
    ]);

    const resolvedActions = useMemo(() => (
        menuActions.map((action) => ({
            action,
            ...resolveActionState(action, actionContext),
        }))
    ), [menuActions, actionContext]);

    const actionsByTab = useMemo(() => {
        const grouped = { deals: [], gear: [], tasks: [], sell: [], info: [], other: [] };
        for (const entry of resolvedActions) {
            const tab = getActionCategory(entry.action);
            if (grouped[tab]) grouped[tab].push(entry);
        }
        return grouped;
    }, [resolvedActions]);

    const visibleTabs = useMemo(
        () => TRADER_TABS.filter((tab) => actionsByTab[tab.id]?.length > 0),
        [actionsByTab]
    );

    useEffect(() => {
        if (!isOpen) return;
        const first = visibleTabs[0]?.id;
        if (first && !visibleTabs.some((t) => t.id === activeTab)) {
            setActiveTab(first);
        }
    }, [isOpen, visibleTabs, activeTab]);

    const tabActions = (actionsByTab[activeTab] || []).filter((entry) => {
        if (entry.action.requiresDailyOrder && entry.order?.completed) return false;
        return true;
    });
    const selectedEntry = resolvedActions.find((e) => e.action.id === selectedActionId)
        || tabActions[0]
        || null;

    useEffect(() => {
        if (!isOpen || !tabActions.length) return;
        if (!tabActions.some((e) => e.action.id === selectedActionId)) {
            setSelectedActionId(tabActions[0].action.id);
        }
    }, [isOpen, activeTab, tabActions, selectedActionId]);

    const npcPitch = useMemo(
        () => npcPitchFromId(npcDef?.merchantId || npcDef?.npcId || name),
        [npcDef?.merchantId, npcDef?.npcId, name]
    );

    const speechText = actionFeedback || questBriefingText || loreText || greeting;

    const handleSpeechComplete = useCallback(() => {
        setGreetingDone(true);
    }, []);

    const handleSelectAction = useCallback((action, entry) => {
        setSelectedActionId(action.id);
        setActionFeedback(null);
        if (action.loreText) {
            setLoreText(action.loreText);
            setQuestBriefingText(null);
            return;
        }
        setLoreText(null);
        if (action.requiresDailyOrder && entry?.orderBriefing) {
            const b = entry.orderBriefing;
            const reqLine = b.requirementType === 'items_mixed' && b.items?.length
                ? `Bring: ${b.items.map((i) => `${i.quantity} ${WOOD_LABELS[i.itemId] || i.itemId.replace('_log', '')}`).join(', ')}.`
                : b.required
                    ? `Bring ${b.required} items.`
                    : '';
            const rewardLine = b.goldReward > 0 ? ` Reward: ${b.goldReward} gold.` : '';
            setQuestBriefingText(`${b.subtitle || b.title}${reqLine ? ` ${reqLine}` : ''}${rewardLine}`);
            return;
        }
        setQuestBriefingText(null);
    }, []);

    const handleAction = useCallback(async (action) => {
        setLoreText(null);
        setQuestBriefingText(null);
        setActionFeedback(null);

        if (action.id === 'close') {
            onClose?.();
            return;
        }
        if (action.loreText) {
            setLoreText(action.loreText);
            return;
        }
        if (action.requiresDailyOrder) {
            const order = dailyOrders.find((o) => o.questId === action.requiresDailyOrder);
            if (order && !order.accepted && !order.completed) {
                setPendingAction(action.id);
                const result = await onAction?.('quest_accept', npcDef, { questId: order.questId });
                setPendingAction(null);
                if (result?.success) {
                    playSfx('quest_step');
                    setActionFeedback(result.message || 'Contract accepted — track it on your quest HUD!');
                } else if (result?.message) {
                    setActionFeedback(result.message);
                } else if (result?.error) {
                    setActionFeedback(result.message || result.error);
                }
                return;
            }
            if (order?.ready) {
                setPendingAction(action.id);
                const result = await onAction?.(action.id, npcDef);
                setPendingAction(null);
                if (result?.success) {
                    setChestOpening(true);
                    playSfx('quest_complete');
                    setTimeout(() => setChestOpening(false), 1600);
                    setActionFeedback(result.message || 'Contract fulfilled!');
                } else if (result?.message) {
                    setActionFeedback(result.message);
                } else if (result?.error) {
                    setActionFeedback(result.message || result.error);
                }
                return;
            }
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
        if (action.id === 'upgrade_rod') {
            setPendingAction(action.id);
            const result = await onAction?.('upgrade_rod', npcDef);
            setPendingAction(null);
            if (result?.grantsRodId && result?.itemName) {
                setActionFeedback(`🎣 ${result.itemName} ready — equip it on your hotbar!`);
            } else if (result?.label && result?.isPartialStep) {
                setActionFeedback(`🎣 ${result.label} complete — one more step for the next tier!`);
            } else if (result?.message) {
                setActionFeedback(result.message);
            } else if (result?.error) {
                setActionFeedback(result.message || result.error);
            }
            return;
        }
        if (action.requiresMerchantRecipe && action.itemId) {
            setPendingAction(action.id);
            const result = await onAction?.('merchant_recipe', npcDef, { itemId: action.itemId });
            setPendingAction(null);
            if (result?.goldMinted) {
                setActionFeedback(`🪙 Minted ${result.goldMinted}g! Balance: ${result.newBalance?.toLocaleString?.() ?? result.newBalance}g`);
            } else if (result?.itemName) {
                setActionFeedback(`✅ Got ${result.itemName}!`);
            } else if (result?.message) {
                setActionFeedback(result.message);
            } else if (result?.error) {
                setActionFeedback(result.message || result.error);
            }
            return;
        }
        if (action.requiresBuyTool && action.itemId) {
            setPendingAction(action.id);
            const result = await onAction?.(action.id, npcDef);
            setPendingAction(null);
            if (result?.itemName) {
                const isRod = result.itemId?.includes('_rod');
                setActionFeedback(
                    isRod
                        ? `🎣 Bought ${result.itemName}! Equip it on your hotbar for better sell prices.`
                        : `🪓 Bought ${result.itemName}! Equip it on your hotbar to chop trees.`
                );
            } else if (result?.message) {
                setActionFeedback(result.message);
            } else if (result?.error) {
                setActionFeedback(result.message || result.error);
            }
            return;
        }
        if (action.id === 'buy_basic_axe') {
            setPendingAction(action.id);
            const result = await onAction?.('buy_basic_axe', npcDef);
            setPendingAction(null);
            if (result?.itemName) {
                setActionFeedback(`🪓 Bought ${result.itemName}! It is on your hotbar — chop trees in the Forest Trails.`);
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
    }, [npcDef, onAction, onClose, dailyOrders]);

    if (!isOpen || !npcDef) return null;

    const selectedAction = selectedEntry?.action;
    const selectedState = selectedEntry || null;
    const selectedListing = selectedAction?.itemId
        ? merchant?.sells?.find((s) => s.itemId === selectedAction.itemId)
        : null;
    const selectedArt = resolveOfferArt(selectedAction, { listing: selectedListing, order: selectedState?.order });
    const isDealPending = pendingAction === selectedAction?.id;
    const isLoreOnly = Boolean(selectedAction?.loreText);
    const selectedOrder = selectedState?.order;
    const isQuestAction = Boolean(selectedAction?.requiresDailyOrder);
    const questCanAccept = isQuestAction && selectedOrder && !selectedOrder.accepted && !selectedOrder.completed;
    const questCanTurnIn = isQuestAction && selectedOrder?.ready;
    const questInProgress = isQuestAction && selectedOrder?.accepted && !selectedOrder.ready && !selectedOrder.completed;
    const canDeal = greetingDone && selectedState && !isLoreOnly && (
        isQuestAction
            ? (questCanAccept || questCanTurnIn)
            : !selectedState.disabled
    );

    const dealLabel = (() => {
        if (isDealPending) return 'PROCESSING…';
        if (questCanAccept) return 'ACCEPT CONTRACT';
        if (questCanTurnIn) return 'TURN IN & CLAIM';
        if (selectedAction?.id === 'open_backpack') return 'OPEN BACKPACK';
        return 'DEAL';
    })();

    const materialRows = (() => {
        if (selectedState?.orderBriefing?.breakdown?.length) {
            return selectedState.orderBriefing.breakdown.map((row) => ({
                itemId: row.itemId,
                quantity: row.quantity,
                have: row.liveHave ?? row.have ?? 0,
            }));
        }
        if (selectedState?.orderBriefing?.items?.length) {
            return selectedState.orderBriefing.items.map((row) => ({
                itemId: row.itemId,
                quantity: row.quantity,
                have: 0,
            }));
        }
        if (selectedListing?.materialCost) {
            return Object.entries(selectedListing.materialCost).map(([itemId, quantity]) => ({
                itemId,
                quantity,
                have: itemCounts[itemId] ?? 0,
            }));
        }
        if (selectedListing?.woodRequired) {
            return Object.entries(selectedListing.woodRequired).map(([itemId, quantity]) => ({
                itemId,
                quantity,
                have: woodCounts[itemId] ?? 0,
            }));
        }
        return [];
    })();

    return createPortal(
        <div className="npc-dialogue-overlay fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-2 sm:p-4 pointer-events-none">
            <button
                type="button"
                className="absolute inset-0 bg-black/60 backdrop-blur-[3px] pointer-events-auto"
                onClick={onClose}
                aria-label="Close dialogue"
            />

            <div
                className={`npc-trader-panel npc-dialogue-panel pointer-events-auto relative w-full max-w-5xl animate-slide-up sm:animate-fade-in bg-gradient-to-b ${theme.panelBg} border border-white/15 rounded-sm overflow-hidden`}
                style={{ boxShadow: `0 0 0 1px rgba(0,0,0,0.6), 0 0 32px ${theme.glow}, 0 24px 64px rgba(0,0,0,0.75)` }}
            >
                <div className={`relative bg-gradient-to-r ${theme.banner} px-4 py-2 flex items-center justify-between border-b border-black/30`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg shrink-0 drop-shadow">{theme.stallIcon}</span>
                        <div className="min-w-0">
                            <span className={`block font-black retro-text text-sm sm:text-base uppercase tracking-wide truncate ${theme.bannerText}`}>
                                {theme.stallName}
                            </span>
                            <span className={`block text-[10px] font-semibold uppercase tracking-widest truncate ${theme.bannerText} opacity-70`}>
                                {name} · {title}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border ${theme.badge}`}>
                            <span className="text-sm">🪙</span>
                            <span className="font-bold retro-text text-sm tabular-nums">{coins.toLocaleString()}</span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-sm bg-black/35 hover:bg-black/55 border border-black/40 text-white/60 hover:text-white text-sm transition-colors"
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:h-[min(88vh,540px)] sm:max-h-[540px]">
                    <div className={`npc-trader-sidebar sm:w-[36%] lg:w-[34%] border-b sm:border-b-0 sm:border-r border-white/10 p-2.5 sm:p-4 flex flex-col gap-2 sm:gap-3 bg-black/25 max-h-[38vh] sm:max-h-none`}>
                        <div className="flex gap-3 items-center shrink-0">
                            <div
                                className={`shrink-0 w-14 h-14 rounded-sm bg-gradient-to-br ${theme.portraitRing} p-[2px]`}
                                style={{ boxShadow: `0 2px 12px ${theme.glow}` }}
                            >
                                <div className="w-full h-full rounded-[2px] bg-[#0a0a12] flex items-center justify-center text-2xl border border-black/50">
                                    {merchant?.emoji || theme.stallIcon}
                                </div>
                            </div>
                            <div className="min-w-0">
                                <h2 className={`font-black retro-text text-sm sm:text-base leading-tight truncate ${theme.accent}`}>{name}</h2>
                                <p className={`text-[10px] font-semibold uppercase tracking-wider truncate ${theme.accentMuted}`}>{title}</p>
                            </div>
                        </div>
                        <div className="flex-1 min-h-[120px] sm:min-h-0 flex flex-col">
                            <NpcSpeechBox
                                text={speechText}
                                active={isOpen}
                                theme={theme}
                                npcPitch={npcPitch}
                                onComplete={handleSpeechComplete}
                            />
                        </div>
                    </div>

                    <div className="npc-trader-offers sm:flex-1 flex flex-col min-h-0 p-2.5 sm:p-4 overflow-hidden">
                        <div className="flex gap-0.5 shrink-0 border-b border-white/10 mb-2 sm:mb-3 overflow-x-auto scrollbar-none -mx-0.5 px-0.5">
                            {visibleTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`npc-trader-tab px-3 py-2 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                                        activeTab === tab.id ? 'npc-trader-tab-active' : 'text-white/40 hover:text-white/70'
                                    }`}
                                >
                                    {tab.label}
                                    <span className="ml-1.5 text-[10px] opacity-60 tabular-nums">
                                        {actionsByTab[tab.id]?.length ?? 0}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="npc-trader-grid grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 flex-1 content-start auto-rows-fr min-h-[200px] sm:min-h-0 sm:max-h-none overflow-hidden">
                            {tabActions.map((entry) => {
                                const { action, disabled, label, costBadge, order } = entry;
                                const isSelected = selectedActionId === action.id;
                                const isPending = pendingAction === action.id;
                                const listing = action.itemId
                                    ? merchant?.sells?.find((s) => s.itemId === action.itemId)
                                    : null;
                                const art = resolveOfferArt(action, { listing, order });
                                const displayName = getOfferDisplayName(action, entry, listing);

                                return (
                                    <button
                                        key={action.id}
                                        type="button"
                                        onClick={() => handleSelectAction(action, entry)}
                                        className={`
                                            npc-trader-card relative flex flex-col items-center justify-end gap-1 p-2 pb-2.5 rounded-sm border text-center
                                            transition-all duration-100 min-h-[108px] sm:min-h-[124px]
                                            ${isSelected ? 'npc-trader-card-selected' : ''}
                                            ${disabled ? 'opacity-45 border-white/5 bg-black/30' : theme.choiceBg}
                                        `}
                                    >
                                        <TraderOfferCanvas
                                            variant={art.variant}
                                            tier={art.tier}
                                            selected={isSelected}
                                            opening={isSelected && chestOpening}
                                            size={isSelected ? 64 : 56}
                                        />
                                        <span className={`text-[10px] sm:text-[11px] font-bold leading-tight line-clamp-2 px-0.5 w-full ${disabled ? 'text-white/35' : 'text-white/90'}`}>
                                            {isPending ? '…' : shortCardLabel(displayName || label)}
                                        </span>
                                        {costBadge && (
                                            <span className={`absolute top-1 right-1 px-1.5 py-px rounded-sm text-[9px] font-bold border tabular-nums ${theme.badge}`}>
                                                {costBadge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {selectedState && (
                            <div className="npc-trader-detail mt-3 pt-3 border-t border-white/10 shrink-0">
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 w-[88px] sm:w-[96px]">
                                        <TraderOfferCanvas
                                            variant={selectedArt.variant}
                                            tier={selectedArt.tier}
                                            selected
                                            opening={chestOpening}
                                            size={88}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold retro-text leading-snug ${selectedState.disabled && !questCanAccept ? 'text-white/40' : 'text-white'}`}>
                                            {getOfferDisplayName(selectedAction, selectedState, selectedListing) || selectedState.label}
                                        </p>
                                        <p className={`text-[11px] mt-1 leading-relaxed ${theme.accentMuted}`}>
                                            {getOfferSubtitle(selectedAction, selectedState, selectedListing) || selectedState.sublabel}
                                        </p>
                                        {materialRows.length > 0 && (
                                            <div className="mt-2">
                                                <MaterialBreakdown items={materialRows} compact />
                                            </div>
                                        )}
                                        {questInProgress && (
                                            <p className={`text-[10px] mt-2 uppercase tracking-wider ${theme.accentMuted}`}>
                                                Tracked on your quest HUD — gather goods and return here.
                                            </p>
                                        )}
                                        {!greetingDone && !isLoreOnly && (
                                            <p className={`text-[10px] mt-1.5 uppercase tracking-wider animate-pulse ${theme.accentMuted}`}>
                                                Listen to {name} first…
                                            </p>
                                        )}
                                    </div>
                                    {selectedState.costBadge && (
                                        <span className={`shrink-0 px-2 py-1 rounded-sm border text-xs font-bold tabular-nums ${theme.badge}`}>
                                            {selectedState.costBadge}
                                        </span>
                                    )}
                                </div>

                                {!isLoreOnly && !questInProgress && (
                                    <button
                                        type="button"
                                        disabled={!canDeal || isDealPending}
                                        onClick={() => handleAction(selectedAction)}
                                        className={`
                                            npc-trader-deal-btn mt-3 w-full py-2.5 rounded-sm border-2 font-black retro-text text-sm uppercase tracking-widest
                                            transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed
                                            ${canDeal ? 'active:translate-y-[1px]' : ''}
                                        `}
                                    >
                                        {dealLabel}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-4 py-2 border-t border-white/5 bg-black/30 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => handleAction({ id: 'close' })}
                        className="px-2.5 py-1 rounded-sm text-[11px] font-bold text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent hover:border-white/10 transition-colors retro-text uppercase tracking-wide"
                    >
                        Leave
                    </button>
                    <span className="text-[10px] text-white/25 uppercase tracking-wider hidden sm:inline">
                        Esc · tap speech to skip
                    </span>
                </div>
            </div>
        </div>,
        document.body
    );
}
