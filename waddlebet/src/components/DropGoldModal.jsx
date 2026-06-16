import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MIN_GOLD_DROP, MAX_GOLD_DROP } from '../config/worldDrops';

const PRESETS = [1, 10, 50, 100, 500, 1000];

export default function DropGoldModal({ isOpen, onClose, maxCoins = 0, onConfirm, dropping = false }) {
    const [amount, setAmount] = useState('10');

    useEffect(() => {
        if (isOpen) {
            setAmount(String(Math.min(10, Math.max(MIN_GOLD_DROP, maxCoins || MIN_GOLD_DROP))));
        }
    }, [isOpen, maxCoins]);

    const parsedAmount = useMemo(() => {
        const n = Math.floor(Number(amount) || 0);
        return Math.min(MAX_GOLD_DROP, Math.max(0, n));
    }, [amount]);

    const canSubmit = parsedAmount >= MIN_GOLD_DROP
        && parsedAmount <= maxCoins
        && !dropping;

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onConfirm?.(parsedAmount);
    };

    return createPortal(
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl border-2 border-yellow-500/40 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-yellow-500/20 flex items-center justify-between">
                    <div>
                        <h2 className="text-yellow-300 font-bold retro-text text-sm">Drop Gold</h2>
                        <p className="text-gray-400 text-xs mt-0.5">You have {maxCoins.toLocaleString()} gold</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-xl leading-none px-2"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <p className="text-gray-300 text-xs">
                        Drop a gold bag in the world. Other players can pick it up. Despawns in 5 minutes.
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                        {PRESETS.map((preset) => {
                            const disabled = preset > maxCoins;
                            const active = parsedAmount === preset;
                            return (
                                <button
                                    key={preset}
                                    type="button"
                                    disabled={disabled || dropping}
                                    onClick={() => setAmount(String(preset))}
                                    className={`py-2 rounded-lg text-xs font-bold retro-text border transition-colors ${
                                        active
                                            ? 'bg-yellow-500 text-black border-yellow-300'
                                            : disabled
                                                ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'
                                                : 'bg-gray-800/80 text-yellow-200 border-yellow-500/30 hover:border-yellow-400/60'
                                    }`}
                                >
                                    {preset.toLocaleString()}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            disabled={maxCoins < MIN_GOLD_DROP || dropping}
                            onClick={() => setAmount(String(maxCoins))}
                            className={`py-2 rounded-lg text-xs font-bold retro-text border transition-colors ${
                                parsedAmount === maxCoins
                                    ? 'bg-yellow-500 text-black border-yellow-300'
                                    : 'bg-gray-800/80 text-yellow-200 border-yellow-500/30 hover:border-yellow-400/60'
                            }`}
                        >
                            All
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs text-yellow-400 mb-1">Custom amount</label>
                        <input
                            type="number"
                            min={MIN_GOLD_DROP}
                            max={Math.min(MAX_GOLD_DROP, maxCoins)}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full px-3 py-2 bg-black/50 border border-yellow-500/40 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-400"
                        />
                    </div>

                    {parsedAmount > maxCoins && (
                        <p className="text-red-400 text-xs">Not enough gold.</p>
                    )}

                    <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                        className={`w-full py-3 rounded-lg font-bold retro-text text-sm border-b-4 transition-all ${
                            canSubmit
                                ? 'bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-700 active:scale-95'
                                : 'bg-gray-700 text-gray-400 border-gray-800 cursor-not-allowed'
                        }`}
                    >
                        {dropping ? 'Dropping…' : `Drop ${parsedAmount.toLocaleString()} Gold`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
