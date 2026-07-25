/**
 * DailyBonusModal - Daily Login Bonus Panel
 * Rewards players with streak-based platform tokens ($CP / $WADDLE) after play time
 * 24 hour cooldown between claims
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useDailyBonusSessionTimer } from '../hooks/useDailyBonusSessionTimer.js';
import { useMultiplayer } from '../multiplayer';
import { useLanguage } from '../i18n';
import StreakCalendar from './StreakCalendar';
import ChainComingSoonPanel from './ChainComingSoonPanel';
import { useChainEconomy } from '../hooks/useChainEconomy.js';
import { formatTokenText } from '../utils/tokenDisplay.js';
import { formatDailyBonusPlaytime } from '../utils/dailyBonusDisplay.js';
import { getEvmTxExplorerUrl } from '../config/evm.js';
import { isEvmChainId } from '../config/tokens.js';
import { getSolscanTxUrl } from '../config/wagerTokens.js';

const generateNonce = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

const DailyBonusModal = ({ isOpen, onClose }) => {
    const menuRef = useRef(null);
    const claimInFlightRef = useRef(false);
    const {
        isAuthenticated,
        dailyBonusStatus,
        fetchDailyBonusStatus,
        claimDailyBonus,
    } = useMultiplayer();
    const { t } = useLanguage();
    const { chainId, platformToken, canClaimDailyBonus } = useChainEconomy();

    const status = dailyBonusStatus;
    const receivedAt = dailyBonusStatus?.receivedAt;
    const {
        sessionSeconds: localSessionSeconds,
        requiredSeconds,
        progressPct: sessionProgress,
    } = useDailyBonusSessionTimer(dailyBonusStatus, {
        enabled: isAuthenticated && canClaimDailyBonus,
    });

    const [isClaiming, setIsClaiming] = useState(false);
    const [claimResult, setClaimResult] = useState(null);
    const [countdown, setCountdown] = useState(null);

    const isLoading = isOpen && isAuthenticated && canClaimDailyBonus && !status;

    useClickOutside(menuRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);

    useEffect(() => {
        if (!isOpen || !isAuthenticated || !canClaimDailyBonus) return;
        setClaimResult(null);
        const receivedAt = dailyBonusStatus?.receivedAt;
        const isStale = !receivedAt || Date.now() - receivedAt > 15000;
        if (isStale) {
            fetchDailyBonusStatus?.();
        }
    }, [isOpen, isAuthenticated, canClaimDailyBonus, fetchDailyBonusStatus, dailyBonusStatus?.receivedAt]);

    useEffect(() => {
        if (!isOpen || !status || status.hasEnoughTime || status.canClaim) return;
        if (localSessionSeconds >= requiredSeconds) {
            fetchDailyBonusStatus?.();
        }
    }, [
        isOpen,
        localSessionSeconds,
        requiredSeconds,
        status?.hasEnoughTime,
        status?.canClaim,
        fetchDailyBonusStatus,
    ]);

    useEffect(() => {
        if (!status?.timeUntilClaim || status.timeUntilClaim <= 0) {
            setCountdown(null);
            return;
        }

        const updateCountdown = () => {
            const elapsed = Date.now() - (receivedAt || Date.now());
            const remaining = status.timeUntilClaim - elapsed;

            if (remaining <= 0) {
                setCountdown(null);
                fetchDailyBonusStatus?.();
                return;
            }

            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [status?.timeUntilClaim, receivedAt, fetchDailyBonusStatus]);

    const handleClaim = useCallback(async () => {
        if (claimInFlightRef.current || isClaiming || !status?.canClaim) return;

        claimInFlightRef.current = true;
        setIsClaiming(true);
        setClaimResult(null);

        try {
            const result = await claimDailyBonus?.(generateNonce());
            setClaimResult(result);
            if (result?.success) {
                fetchDailyBonusStatus?.();
            }
        } finally {
            claimInFlightRef.current = false;
            setIsClaiming(false);
        }
    }, [isClaiming, status, claimDailyBonus, fetchDailyBonusStatus]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4">
            <div
                ref={menuRef}
                className="bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98 rounded-3xl border border-white/10 shadow-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
                style={{
                    boxShadow: '0 0 60px rgba(0, 200, 255, 0.1), 0 0 100px rgba(100, 50, 200, 0.05)'
                }}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                <div className="relative px-6 pt-5 pb-3 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                                <span className="text-lg">🎁</span>
                            </div>
                            <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                                Daily Bonus
                            </span>
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 overscroll-contain">
                    {!isAuthenticated ? (
                        <div className="text-center py-8">
                            <div className="text-5xl mb-4">🔐</div>
                            <p className="text-white/60 text-sm">Connect your wallet to access daily bonuses</p>
                        </div>
                    ) : !canClaimDailyBonus ? (
                        <ChainComingSoonPanel
                            title={t('chainEconomy.dailyBonusTitle').replace(/\{token\}/g, platformToken)}
                            className="my-4"
                        />
                    ) : isLoading ? (
                        <div className="text-center py-8">
                            <div className="text-4xl animate-bounce mb-4">⏳</div>
                            <p className="text-white/60 text-sm">Loading bonus status...</p>
                        </div>
                    ) : status?.error ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">⚠️</div>
                            <p className="text-red-400 text-sm">{formatTokenText(status.message || status.error, chainId)}</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-3 sm:p-4 border border-cyan-500/20">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white text-sm font-bold">7-Day Streak</span>
                                    <span className="text-cyan-300 text-xs font-mono tabular-nums">
                                        Day {status?.streakDay || 1} / 7
                                    </span>
                                </div>
                                <StreakCalendar
                                    currentDay={status?.streakDay || 1}
                                    completedDays={status?.streakCompletedDays || 0}
                                />
                                <div className="text-center mt-3 pt-3 border-t border-white/10">
                                    <div className="text-xl sm:text-2xl font-bold tabular-nums">
                                        {(status?.rewardAmount || 0) > 0 && (
                                            <span className="text-cyan-300">
                                                {(status.rewardAmount).toLocaleString()} {platformToken}
                                            </span>
                                        )}
                                        {(status?.goldReward || 0) > 0 && (
                                            <span className={`text-amber-300 ${(status?.rewardAmount || 0) > 0 ? 'text-base sm:text-lg ml-2' : 'text-xl sm:text-2xl'}`}>
                                                {(status?.rewardAmount || 0) > 0 ? '+' : ''}{status.goldReward}g
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-white/50 text-[10px] sm:text-xs mt-1">
                                        {(status?.rewardAmount || 0) > 0
                                            ? `Today's reward after ${formatDailyBonusPlaytime(requiredSeconds)} play (${platformToken})`
                                            : 'Gold bonus day — no token payout'}
                                    </p>
                                </div>
                            </div>

                            {status?.onboardingComplete === false && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-amber-500/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">📜</span>
                                            <span className="text-white text-sm font-medium">Getting Started Quest</span>
                                        </div>
                                        <span className="text-amber-300 font-mono text-sm">
                                            {status.onboardingCompletedCount ?? 0} / {status.onboardingTotalSteps ?? '?'}
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, ((status.onboardingCompletedCount ?? 0) / Math.max(1, status.onboardingTotalSteps ?? 1)) * 100)}%`
                                            }}
                                        />
                                    </div>
                                    <p className="text-white/40 text-xs mt-2">
                                        Complete the Getting Started quest to unlock daily bonus claims.
                                    </p>
                                </div>
                            )}

                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">⏱️</span>
                                        <span className="text-white text-sm font-medium">Play Time</span>
                                    </div>
                                    <span className="text-cyan-400 font-mono text-sm">
                                        {formatDailyBonusPlaytime(localSessionSeconds)} / {formatDailyBonusPlaytime(requiredSeconds)}
                                    </span>
                                </div>
                                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${
                                            sessionProgress >= 100
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                                : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                                        }`}
                                        style={{ width: `${sessionProgress}%` }}
                                    />
                                </div>
                                <p className="text-white/40 text-xs mt-2">
                                    {sessionProgress >= 100
                                        ? '✅ Time requirement met!'
                                        : `${formatDailyBonusPlaytime(Math.max(0, requiredSeconds - localSessionSeconds))} remaining`}
                                </p>
                            </div>

                            {countdown && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-purple-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">🕐</span>
                                            <span className="text-white text-sm font-medium">Next Claim In</span>
                                        </div>
                                        <span className="text-2xl font-mono font-bold text-purple-300">
                                            {countdown}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-base">📊</span>
                                    <span className="text-white text-sm font-medium">Your Stats</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <div className="text-xl font-bold text-cyan-300">
                                            {status?.totalClaimed || 0}
                                        </div>
                                        <div className="text-white/40 text-xs">Total Claims</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <div className="text-xl font-bold text-green-300">
                                            {((status?.totalWaddleEarned || 0) / 1000).toFixed(0)}K
                                        </div>
                                        <div className="text-white/40 text-xs">{platformToken} Earned</div>
                                    </div>
                                </div>
                            </div>

                            {status?.custodialBalance !== null && status?.custodialBalance !== undefined && (
                                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">🏦</span>
                                            <span className="text-white/60 text-sm">Reward Pool</span>
                                        </div>
                                        <span className="text-purple-300 font-mono font-bold">
                                            {status.custodialBalance?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '---'} {platformToken}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {claimResult && (
                                <div className={`rounded-2xl p-4 border ${
                                    claimResult.success
                                        ? 'bg-green-500/20 border-green-500/30'
                                        : 'bg-red-500/20 border-red-500/30'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">
                                            {claimResult.success ? '🎉' : '❌'}
                                        </span>
                                        <div className="flex-1">
                                            <div className={`font-bold ${
                                                claimResult.success ? 'text-green-300' : 'text-red-300'
                                            }`}>
                                                {claimResult.success ? 'Bonus Claimed!' : 'Claim Failed'}
                                            </div>
                                            <p className="text-white/60 text-sm mt-1">
                                                {formatTokenText(claimResult.message, chainId)}
                                            </p>
                                            {claimResult.txSignature && (
                                                <a
                                                    href={
                                                        isEvmChainId(chainId)
                                                            ? getEvmTxExplorerUrl(claimResult.txSignature, chainId)
                                                            : getSolscanTxUrl(claimResult.txSignature)
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-cyan-400 text-xs hover:text-cyan-300 mt-2 inline-block"
                                                >
                                                    View Transaction ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-white/5">
                    {isAuthenticated && !canClaimDailyBonus ? (
                        <button
                            type="button"
                            disabled
                            className="w-full py-3 rounded-2xl font-bold text-sm bg-white/10 text-white/40 cursor-not-allowed"
                        >
                            {t('chainEconomy.comingSoon')}
                        </button>
                    ) : isAuthenticated && status && !status.error ? (
                        <button
                            onClick={handleClaim}
                            disabled={!status.canClaim || isClaiming}
                            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                                status.canClaim && !isClaiming
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white hover:shadow-cyan-500/25'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                            }`}
                        >
                            {isClaiming ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span>
                                    Claiming...
                                </span>
                            ) : status.canClaim ? (
                                <span className="flex items-center justify-center gap-2">
                                    Claim Day {status.streakDay || 1} Reward
                                </span>
                            ) : status.onboardingComplete === false ? (
                                <span className="flex items-center justify-center gap-2">
                                    📜 Complete Getting Started Quest
                                </span>
                            ) : !status.cooldownExpired ? (
                                <span className="flex items-center justify-center gap-2">
                                    🕐 Cooldown Active
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    ⏱️ Play {formatDailyBonusPlaytime(
                                        status.secondsRemaining ?? (status.minutesRemaining ?? 0) * 60
                                    )} More
                                </span>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-cyan-500/25"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DailyBonusModal;
