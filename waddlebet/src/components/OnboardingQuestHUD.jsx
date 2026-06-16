import React, { useEffect, useMemo, useState } from 'react';
import { useMultiplayer } from '../multiplayer';
import { ONBOARDING_REWARD_GOLD } from '../config/onboardingQuest';

const STORAGE_KEY = 'waddlebet_onboarding_quest_collapsed';

/**
 * Lightweight on-screen quest checklist — teaches core gameplay loop.
 * Collapsible on mobile; persists collapse preference in localStorage.
 */
export default function OnboardingQuestHUD({ isMobile = false, isPortrait = false }) {
    const { isAuthenticated, onboardingQuest } = useMultiplayer();
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(STORAGE_KEY) === '1';
    });
    const [flashStepId, setFlashStepId] = useState(null);
    const [showRewardBanner, setShowRewardBanner] = useState(false);

    const status = onboardingQuest;
    const visible = isAuthenticated && status && !status.rewardClaimed;

    useEffect(() => {
        if (!status?.justCompletedStepId) return;
        setFlashStepId(status.justCompletedStepId);
        const timer = setTimeout(() => setFlashStepId(null), 2500);
        return () => clearTimeout(timer);
    }, [status?.justCompletedStepId]);

    useEffect(() => {
        if (!status?.rewardGranted) return;
        setShowRewardBanner(true);
        const timer = setTimeout(() => setShowRewardBanner(false), 6000);
        return () => clearTimeout(timer);
    }, [status?.rewardGranted, status?.rewardGold]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    }, [collapsed]);

    const nextStep = useMemo(() => {
        if (!status?.steps) return null;
        return status.steps.find((s) => !s.completed) || null;
    }, [status?.steps]);

    if (!visible && !showRewardBanner) return null;

    // Portrait mobile: keep quest off the bottom-left joystick zone
    const mobilePortrait = isMobile && isPortrait;
    const questAnchorClass = mobilePortrait
        ? 'top-12 left-2 right-14'
        : isPortrait
            ? 'bottom-20 left-2 right-2'
            : 'top-24 left-4 w-72 max-w-[calc(100vw-2rem)]';

    if (showRewardBanner && status?.rewardClaimed) {
        return (
            <div
                className={`fixed z-30 pointer-events-none ${
                    mobilePortrait ? 'top-12 left-2 right-2' : isPortrait ? 'bottom-20 left-2 right-2' : 'bottom-6 left-4 max-w-sm'
                }`}
            >
                <div className="bg-emerald-900/90 border border-emerald-400/60 rounded-xl px-4 py-3 shadow-lg backdrop-blur-md">
                    <div className="text-emerald-200 font-bold retro-text text-sm">
                        Quest complete!
                    </div>
                    <div className="text-emerald-100 text-xs mt-1">
                        +{status.rewardGold ?? ONBOARDING_REWARD_GOLD} gold — you know the ropes now.
                    </div>
                </div>
            </div>
        );
    }

    if (!visible) return null;

    const completedCount = status.completedCount ?? 0;
    const totalSteps = status.totalSteps ?? status.steps?.length ?? 0;

    const panelBody = (
        <div className="max-h-[42vh] overflow-y-auto overscroll-contain pr-0.5">
            <ul className="space-y-1.5">
                {status.steps.map((step) => {
                    const isNext = step.id === nextStep?.id;
                    const isFlash = flashStepId === step.id;
                    return (
                        <li
                            key={step.id}
                            className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                                step.completed
                                    ? 'bg-emerald-950/40 text-emerald-200/80'
                                    : isNext
                                        ? 'bg-sky-950/60 text-sky-100 border border-sky-400/40'
                                        : 'text-white/45'
                            } ${isFlash ? 'ring-1 ring-emerald-400/70' : ''}`}
                        >
                            <span className="shrink-0 w-4 text-center leading-5">
                                {step.completed ? '✓' : isNext ? '→' : '○'}
                            </span>
                            <span className="flex-1 leading-snug">
                                <span className={step.completed ? 'line-through opacity-70' : 'font-medium'}>
                                    {step.label}
                                </span>
                                {isNext && step.hint && (
                                    <span className="block text-[10px] text-sky-200/80 mt-0.5 font-normal">
                                        {step.hint}
                                    </span>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>
            <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-amber-200/80">
                Finish all tasks for {ONBOARDING_REWARD_GOLD} gold
            </div>
        </div>
    );

    if (collapsed) {
        return (
            <button
                type="button"
                onClick={() => setCollapsed(false)}
                className={`fixed z-30 touch-manipulation ${
                    mobilePortrait ? 'top-12 left-2' : isPortrait ? 'bottom-20 left-2' : 'top-24 left-4'
                } bg-sky-950/90 hover:bg-sky-900/90 border border-sky-400/50 rounded-xl px-3 py-2 shadow-lg backdrop-blur-md flex items-center gap-2`}
                aria-label="Open quest guide"
            >
                <span className="text-base">📋</span>
                <span className="text-sky-100 retro-text text-xs font-bold">
                    {completedCount}/{totalSteps}
                </span>
            </button>
        );
    }

    return (
        <div className={`fixed z-30 ${questAnchorClass}`}>
            <div className="bg-black/75 border border-sky-400/35 rounded-xl shadow-xl backdrop-blur-md overflow-hidden">
                <div className="flex items-center justify-between gap-2 px-3 py-2 bg-sky-950/50 border-b border-white/10">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm shrink-0">📋</span>
                        <div className="min-w-0">
                            <div className="text-sky-100 retro-text text-xs font-bold truncate">
                                Getting Started
                            </div>
                            <div className="text-[10px] text-white/50">
                                {completedCount}/{totalSteps} done
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCollapsed(true)}
                        className="shrink-0 text-white/50 hover:text-white/90 px-2 py-1 text-xs touch-manipulation"
                        aria-label="Collapse quest guide"
                    >
                        −
                    </button>
                </div>
                <div className="p-2">{panelBody}</div>
            </div>
        </div>
    );
}
