import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useMultiplayer } from '../multiplayer';
import { getDailySpendHint } from '../config/npcOrders';
import { playSfx } from '../audio';

const STORAGE_KEY = 'waddlebet_daily_quest_collapsed';

const generateNonce = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
};

function formatOrderReward(order) {
    if (order?.goldReward > 0) return `+${order.goldReward}g`;
    if (order?.itemRewards?.length) {
        return `+${order.itemRewards.map((r) => `${r.quantity} ${r.itemId.replace(/_/g, ' ')}`).join(', ')}`;
    }
    return 'Supply bonus';
}

function countInventory(gameInventory, predicate) {
    if (!gameInventory?.slots) return 0;
    return gameInventory.slots.reduce((sum, slot) => {
        if (!slot?.itemId || !slot.quantity) return sum;
        return predicate(slot) ? sum + slot.quantity : sum;
    }, 0);
}

/**
 * Persistent "Today" panel — daily NPC orders + $CP bonus progress.
 * Shown after onboarding quest reward is claimed.
 */
export default function DailyQuestHUD({ isMobile = false, isPortrait = false }) {
    const {
        isAuthenticated,
        onboardingQuest,
        dailyQuestStatus,
        dailyBonusStatus,
        gameInventory,
        fetchDailyQuestStatus,
        fetchDailyBonusStatus,
        claimDailyBonus,
    } = useMultiplayer();

    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    });
    const [claiming, setClaiming] = useState(false);
    const [claimMessage, setClaimMessage] = useState(null);
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const claimInFlightRef = useRef(false);

    const onboardingDone = !!onboardingQuest?.rewardClaimed;
    const visible = isAuthenticated && onboardingDone && dailyQuestStatus?.onboardingComplete !== false;

    const fishInPack = useMemo(
        () => countInventory(gameInventory, (s) => s.category === 'fish'),
        [gameInventory]
    );
    const woodInPack = useMemo(() => {
        const counts = { pine_log: 0, birch_log: 0, oak_log: 0, ironwood_log: 0 };
        for (const slot of gameInventory?.slots || []) {
            if (!slot?.itemId || !slot.quantity) continue;
            if (counts[slot.itemId] != null) counts[slot.itemId] += slot.quantity;
        }
        return counts;
    }, [gameInventory]);

    const orders = useMemo(() => {
        const base = (dailyQuestStatus?.orders || []).filter((order) => order.accepted);
        return base.map((order) => {
            if (order.completed) return order;
            if (order.requirementType === 'items_mixed' && order.items?.length) {
                const breakdown = order.items.map((entry) => {
                    const liveHave = woodInPack[entry.itemId] ?? 0;
                    return {
                        ...entry,
                        have: Math.min(liveHave, entry.quantity),
                        liveHave,
                    };
                });
                const ready = breakdown.every((row) => row.liveHave >= row.quantity);
                const have = breakdown.reduce((sum, row) => sum + row.have, 0);
                const required = order.required ?? breakdown.reduce((sum, row) => sum + row.quantity, 0);
                return { ...order, breakdown, have, required, ready };
            }
            let liveHave = order.have ?? 0;
            if (order.questId === 'salty_daily_catch' && order.requirementType === 'fish_any') {
                liveHave = Math.max(liveHave, fishInPack);
            } else if (order.requirementType === 'fish_min_tier') {
                liveHave = order.have ?? liveHave;
            }
            const required = order.required ?? 1;
            return {
                ...order,
                have: Math.min(liveHave, required),
                ready: liveHave >= required,
            };
        });
    }, [dailyQuestStatus?.orders, fishInPack, woodInPack]);

    const availableContracts = useMemo(
        () => (dailyQuestStatus?.orders || []).filter((o) => !o.accepted && !o.completed).length,
        [dailyQuestStatus?.orders]
    );

    const nextOrder = useMemo(
        () => orders.find((o) => !o.completed) || null,
        [orders]
    );

    const ordersComplete = orders.length > 0 && orders.every((o) => o.completed);
    const noActiveContracts = orders.length === 0 && availableContracts > 0;
    const bonusComplete = dailyBonusStatus?.canClaim === false
        && (dailyBonusStatus?.totalClaimed > 0 || dailyBonusStatus?.timeUntilClaim > 0);
    const requiredMinutes = dailyBonusStatus?.requiredMinutes ?? 60;
    const hasEnoughTime = dailyBonusStatus?.hasEnoughTime
        || sessionSeconds >= requiredMinutes * 60;

    useEffect(() => {
        if (!visible || !isAuthenticated) return;
        fetchDailyQuestStatus?.();
        fetchDailyBonusStatus?.();
    }, [visible, isAuthenticated, fetchDailyQuestStatus, fetchDailyBonusStatus]);

    useEffect(() => {
        if (!visible) return;
        setSessionSeconds((dailyBonusStatus?.sessionMinutes ?? 0) * 60);
    }, [visible, dailyBonusStatus?.sessionMinutes, dailyBonusStatus?.receivedAt]);

    useEffect(() => {
        if (!visible || hasEnoughTime) return;
        const interval = setInterval(() => {
            setSessionSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [visible, hasEnoughTime]);

    useEffect(() => {
        if (!visible || collapsed) return;
        if (!ordersComplete || dailyBonusStatus?.canClaim) return;
        if (ordersComplete && bonusComplete) {
            setCollapsed(true);
            return;
        }
    }, [visible, collapsed, ordersComplete, bonusComplete, dailyBonusStatus?.canClaim]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    }, [collapsed]);

    useEffect(() => {
        if (!visible) return;
        const incomplete = !ordersComplete || !hasEnoughTime || dailyBonusStatus?.canClaim;
        if (incomplete && typeof window !== 'undefined') {
            const wasCollapsed = window.localStorage.getItem(STORAGE_KEY) === '1';
            if (!wasCollapsed) setCollapsed(false);
        }
    }, [visible, ordersComplete, hasEnoughTime, dailyBonusStatus?.canClaim]);

    const handleClaimBonus = useCallback(async () => {
        if (claimInFlightRef.current || !dailyBonusStatus?.canClaim) return;
        claimInFlightRef.current = true;
        setClaiming(true);
        setClaimMessage(null);
        try {
            const result = await claimDailyBonus?.(generateNonce());
            if (result?.success) {
                playSfx('quest_complete');
                const cp = result.amount ?? 0;
                const gold = result.goldReward ?? 0;
                const msg = gold > 0 && cp <= 0
                    ? `+${gold}g claimed!`
                    : `+${cp.toLocaleString()} $CP${gold > 0 ? ` +${gold}g` : ''} claimed!`;
                setClaimMessage(msg);
                fetchDailyBonusStatus?.();
            } else {
                setClaimMessage(result?.message || 'Could not claim bonus');
            }
        } finally {
            claimInFlightRef.current = false;
            setClaiming(false);
        }
    }, [claimDailyBonus, dailyBonusStatus?.canClaim, fetchDailyBonusStatus]);

    if (!visible) return null;

    const mobilePortrait = isMobile && isPortrait;
    const questAnchorClass = mobilePortrait
        ? 'top-12 left-2 right-16'
        : isPortrait
            ? 'top-12 left-2 right-2'
            : 'top-28 left-4 w-72 max-w-[min(18rem,calc(100vw-24rem))]';

    const completedCount = dailyQuestStatus?.completedCount ?? orders.filter((o) => o.completed).length;
    const totalOrders = dailyQuestStatus?.totalOrders ?? orders.length;
    const sessionPct = Math.min(100, (sessionSeconds / (requiredMinutes * 60)) * 100);
    const sessionLabel = `${Math.min(requiredMinutes, Math.floor(sessionSeconds / 60))} / ${requiredMinutes} min`;

    const panelBody = (
        <div className="max-h-[48vh] overflow-y-auto overscroll-contain pr-0.5">
            {noActiveContracts && (
                <div className="mb-2 rounded-lg px-2.5 py-2 text-xs border border-amber-400/30 bg-amber-950/40 text-amber-100/90">
                    <span className="font-semibold block">Contracts available</span>
                    <span className="text-[10px] text-amber-200/75 mt-0.5 block leading-snug">
                        Visit Old Salty or Copper Clive and accept today&apos;s contract from the Tasks tab.
                    </span>
                </div>
            )}
            <ul className="space-y-1.5">
                {orders.map((order) => {
                    const isNext = order.questId === nextOrder?.questId;
                    return (
                        <li
                            key={order.questId}
                            className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                                order.completed
                                    ? 'bg-emerald-950/40 text-emerald-200/80'
                                    : isNext
                                        ? 'bg-amber-950/60 text-amber-100 border border-amber-400/40'
                                        : 'text-white/50'
                            }`}
                        >
                            <span className="shrink-0 w-4 text-center leading-5">
                                {order.completed ? '✓' : isNext ? '→' : '○'}
                            </span>
                            <span className="flex-1 leading-snug">
                                <span className={order.completed ? 'line-through opacity-70' : 'font-medium'}>
                                    {order.briefingTitle || order.label}
                                </span>
                                {!order.completed && (
                                    <span className="block text-[10px] text-amber-200/75 mt-0.5">
                                        {order.requirementType === 'items_mixed' && order.breakdown?.length
                                            ? order.breakdown.map((row) => {
                                                const short = row.itemId.replace('_log', '').slice(0, 4);
                                                return `${short} ${row.have}/${row.quantity}`;
                                            }).join(' · ')
                                            : `${order.have}/${order.required}`}
                                        {order.ready ? ' — ready to turn in!' : ''}
                                    </span>
                                )}
                                {!order.completed && isNext && order.hint && (
                                    <span className="block text-[10px] text-white/40 mt-0.5 leading-snug">
                                        {order.hint}
                                    </span>
                                )}
                                {!order.completed && (
                                    <span className="block text-[10px] text-emerald-300/80">
                                        {formatOrderReward(order)}
                                    </span>
                                )}
                            </span>
                        </li>
                    );
                })}

                <li
                    className={`rounded-lg px-2 py-2 text-xs border ${
                        dailyBonusStatus?.canClaim
                            ? 'bg-emerald-950/50 border-emerald-400/45 text-emerald-100'
                            : 'bg-white/5 border-white/10 text-white/60'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium">Daily bonus</span>
                        <span className="text-[10px] font-bold text-emerald-300/90 tabular-nums">
                            {(dailyBonusStatus?.rewardAmount || 0) > 0 && (
                                <>{(dailyBonusStatus.rewardAmount).toLocaleString()} $CP</>
                            )}
                            {(dailyBonusStatus?.goldReward || 0) > 0 && (
                                <>{(dailyBonusStatus?.rewardAmount || 0) > 0 ? ' + ' : ''}{dailyBonusStatus.goldReward}g</>
                            )}
                            {(dailyBonusStatus?.rewardAmount || 0) <= 0 && (dailyBonusStatus?.goldReward || 0) <= 0 && (
                                <>1k $CP</>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] text-white/50">{sessionLabel}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500"
                            style={{ width: `${sessionPct}%` }}
                        />
                    </div>
                    {dailyBonusStatus?.canClaim ? (
                        <button
                            type="button"
                            onClick={handleClaimBonus}
                            disabled={claiming}
                            className="mt-2 w-full py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-bold touch-manipulation"
                        >
                            {claiming ? 'Claiming…' : 'Claim reward'}
                        </button>
                    ) : (
                        <span className="block text-[10px] mt-1 text-white/40">
                            {hasEnoughTime
                                ? dailyBonusStatus?.onboardingComplete === false
                                    ? 'Finish Getting Started to unlock'
                                    : 'Already claimed — come back tomorrow'
                                : 'Play 60 min to unlock today\'s reward'}
                        </span>
                    )}
                    {claimMessage && (
                        <span className="block text-[10px] mt-1 text-emerald-300">{claimMessage}</span>
                    )}
                </li>
            </ul>
            <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-sky-200/70 leading-snug">
                {getDailySpendHint()}
            </div>
        </div>
    );

    if (collapsed) {
        const pending = orders.filter((o) => !o.completed).length
            + (dailyBonusStatus?.canClaim ? 1 : 0)
            + availableContracts;
        return (
            <button
                type="button"
                onClick={() => setCollapsed(false)}
                className={`fixed z-20 touch-manipulation ${
                    mobilePortrait ? 'top-12 left-2' : isPortrait ? 'top-12 left-2' : 'top-28 left-4'
                } bg-amber-950/90 hover:bg-amber-900/90 border border-amber-400/50 rounded-xl px-3 py-2 shadow-lg backdrop-blur-md flex items-center gap-2`}
                aria-label="Open today panel"
            >
                <span className="text-base">📋</span>
                <span className="text-amber-100 retro-text text-xs font-bold">Today</span>
                {pending > 0 && (
                    <span className="bg-amber-500 text-amber-950 text-[10px] font-bold px-1.5 rounded-full">
                        {pending}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className={`fixed z-20 pointer-events-none ${questAnchorClass}`}>
            <div className="pointer-events-auto bg-black/75 border border-amber-400/35 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-950/50 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">☀️</span>
                        <div className="min-w-0">
                            <div className="text-amber-100 retro-text text-xs font-bold truncate">Today</div>
                            <div className="text-[10px] text-white/50">
                                {completedCount}/{totalOrders} orders
                                {dailyBonusStatus?.canClaim ? ' · bonus ready!' : ''}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCollapsed(true)}
                        className="shrink-0 text-white/50 hover:text-white/90 px-2 py-1 text-xs touch-manipulation"
                        aria-label="Collapse today panel"
                    >
                        −
                    </button>
                </div>
                <div className="p-2">{panelBody}</div>
            </div>
        </div>
    );
}
