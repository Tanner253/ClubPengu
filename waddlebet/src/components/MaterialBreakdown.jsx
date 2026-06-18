import React from 'react';
import { WOOD_COLORS } from '../config/merchantOfferArt';
import { WOOD_LABELS } from '../config/economy';

/**
 * Visual material requirements with progress bars — replaces cryptic text lists.
 */
export default function MaterialBreakdown({ items = [], compact = false }) {
    if (!items.length) return null;

    return (
        <ul className={compact ? 'space-y-1' : 'space-y-1.5'}>
            {items.map((row) => {
                const itemId = row.itemId;
                const required = row.quantity ?? row.required ?? 0;
                const have = row.have ?? row.liveHave ?? 0;
                const pct = required > 0 ? Math.min(100, (have / required) * 100) : 0;
                const ready = have >= required;
                const colors = WOOD_COLORS[itemId] || { fill: '#888', edge: '#444', glow: 'rgba(136,136,136,0.3)' };
                const label = WOOD_LABELS[itemId] || itemId.replace(/_log/g, '').replace(/_/g, ' ');

                return (
                    <li key={itemId} className="flex items-center gap-2">
                        <span
                            className="shrink-0 w-2.5 h-2.5 rounded-sm border border-black/40"
                            style={{ background: `linear-gradient(135deg, ${colors.fill}, ${colors.edge})` }}
                            aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
                                <span className={`font-semibold truncate ${ready ? 'text-emerald-200' : 'text-white/80'}`}>
                                    {label}
                                </span>
                                <span className={`tabular-nums shrink-0 ${ready ? 'text-emerald-300' : 'text-amber-200/80'}`}>
                                    {Math.min(have, required)}/{required}
                                </span>
                            </div>
                            <div className="h-1.5 mt-0.5 bg-black/40 rounded-sm overflow-hidden border border-white/5">
                                <div
                                    className="h-full transition-all duration-300 rounded-sm"
                                    style={{
                                        width: `${pct}%`,
                                        background: ready
                                            ? 'linear-gradient(90deg, #34d399, #10b981)'
                                            : `linear-gradient(90deg, ${colors.edge}, ${colors.fill})`,
                                        boxShadow: ready ? '0 0 6px rgba(52,211,153,0.5)' : `0 0 4px ${colors.glow}`,
                                    }}
                                />
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
