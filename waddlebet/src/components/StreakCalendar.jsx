import React from 'react';
import { DAILY_STREAK_REWARDS } from '../config/dailyBonusStreak';

/**
 * 7-day login streak calendar — mobile-first grid.
 */
export default function StreakCalendar({
    currentDay = 1,
    completedDays = 0,
    compact = false,
}) {
    return (
        <div className={`grid grid-cols-7 gap-1 sm:gap-1.5 ${compact ? '' : 'mb-1'}`}>
            {DAILY_STREAK_REWARDS.map((entry) => {
                const isDone = entry.day <= completedDays;
                const isCurrent = entry.day === currentDay && !isDone;
                const isLocked = entry.day > currentDay && !isDone;
                const isGoldOnly = entry.cp <= 0 && entry.gold > 0;

                return (
                    <div
                        key={entry.day}
                        className={`
                            relative flex flex-col items-center justify-center rounded-md sm:rounded-lg border text-center
                            ${compact ? 'min-h-[52px] p-1' : 'min-h-[64px] sm:min-h-[72px] p-1.5'}
                            ${isDone ? 'bg-emerald-950/50 border-emerald-400/45' : ''}
                            ${isCurrent && isGoldOnly ? 'bg-amber-950/60 border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.25)]' : ''}
                            ${isCurrent && !isGoldOnly ? 'bg-cyan-950/60 border-cyan-400/60 shadow-[0_0_12px_rgba(34,211,238,0.25)]' : ''}
                            ${isLocked ? 'bg-black/30 border-white/10 opacity-55' : ''}
                        `}
                    >
                        <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide ${
                            isDone ? 'text-emerald-300' : isCurrent ? (isGoldOnly ? 'text-amber-200' : 'text-cyan-200') : 'text-white/40'
                        }`}>
                            D{entry.day}
                        </span>
                        {isDone ? (
                            <span className="text-sm sm:text-base leading-none mt-0.5">✓</span>
                        ) : isGoldOnly ? (
                            <>
                                <span className="text-[11px] sm:text-xs font-bold text-amber-300 mt-0.5">
                                    {entry.gold}g
                                </span>
                                <span className="text-[8px] sm:text-[9px] text-amber-200/60 uppercase tracking-wide">
                                    gold
                                </span>
                            </>
                        ) : (
                            <span className={`text-[10px] sm:text-[11px] font-bold tabular-nums leading-tight mt-0.5 ${
                                isCurrent ? 'text-cyan-100' : 'text-white/70'
                            }`}>
                                {(entry.cp / 1000).toFixed(entry.cp % 1000 === 0 ? 0 : 1)}k
                            </span>
                        )}
                        {isCurrent && (
                            <span className={`absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full animate-pulse ${
                                isGoldOnly ? 'bg-amber-400' : 'bg-cyan-400'
                            }`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
