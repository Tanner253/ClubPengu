/**
 * Owner-facing igloo payment receipts (rent + entry fees) with explorer links.
 */

import React from 'react';
import { shortenTx, shortenWallet } from '../utils/txExplorer.js';

function formatWhen(timestamp) {
    if (!timestamp) return '';
    try {
        return new Date(timestamp).toLocaleString();
    } catch {
        return String(timestamp);
    }
}

export default function IglooPaymentLog({ payments = [], loading = false, error = null }) {
    if (loading) {
        return (
            <div className="text-sm text-slate-400 py-3 text-center">
                Loading payment receipts…
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-sm text-red-400 py-2">
                {error}
            </div>
        );
    }

    if (!payments.length) {
        return (
            <div className="text-sm text-slate-500 py-3 text-center">
                No on-chain payments recorded for this igloo yet.
            </div>
        );
    }

    return (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {payments.map((p) => {
                const isIn = p.direction === 'in';
                return (
                    <div
                        key={p.id}
                        className="bg-black/25 border border-white/10 rounded-lg px-3 py-2.5"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-bold uppercase tracking-wide ${
                                        isIn ? 'text-emerald-400' : 'text-cyan-400'
                                    }`}>
                                        {isIn ? 'Received' : 'Paid'}
                                    </span>
                                    <span className="text-xs text-white/80">{p.label}</span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {formatWhen(p.timestamp)}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">
                                    {isIn
                                        ? `From ${shortenWallet(p.payerWallet)}`
                                        : `To treasury ${shortenWallet(p.recipientWallet)}`}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <div className={`text-sm font-mono font-semibold ${
                                    isIn ? 'text-emerald-300' : 'text-cyan-300'
                                }`}>
                                    {isIn ? '+' : '−'}
                                    {Number(p.amount || 0).toLocaleString()}{' '}
                                    {p.tokenSymbol || ''}
                                </div>
                                {p.explorerUrl && (
                                    <a
                                        href={p.explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] text-amber-300/90 hover:text-amber-200 mt-1"
                                        title={`View on ${p.explorerLabel || 'explorer'}`}
                                    >
                                        {p.explorerLabel || 'Explorer'} ↗
                                        <span className="text-slate-500 font-mono">
                                            ({shortenTx(p.txHash, 4)})
                                        </span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
