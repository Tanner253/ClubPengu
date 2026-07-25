/**
 * EntryTokenModal — $WADDLE flagship + $CP on Solana (Penguin Maker entry CTA)
 */

import React, { useRef, useState } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useLanguage } from '../i18n';
import { CPW3_TOKEN_ADDRESS } from '../config/solana';
import { WADDLE_ETH_CONTRACT, getWaddleEthBlockExplorerUrl } from '../config/evm';

export const ENTRY_TOKEN_MODAL_STORAGE_KEY = 'waddlebet_entry_token_modal_hidden';

const CP_JUPITER_URL = `https://jup.ag/swap/SOL-${CPW3_TOKEN_ADDRESS}`;
const CP_DEXSCREENER_URL = `https://dexscreener.com/solana/${CPW3_TOKEN_ADDRESS}`;
const WHITEPAPER_MULTICHAIN_URL = 'https://whitepaper.waddle.bet/#multichain';
const WADDLE_EXPLORER_URL = getWaddleEthBlockExplorerUrl();

const EntryTokenModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const { t } = useLanguage();
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [copiedSolana, setCopiedSolana] = useState(false);
    const [copiedWaddle, setCopiedWaddle] = useState(false);

    useClickOutside(modalRef, () => onClose(dontShowAgain), isOpen);
    useEscapeKey(() => onClose(dontShowAgain), isOpen);

    const handleCopySolanaCa = async () => {
        try {
            await navigator.clipboard.writeText(CPW3_TOKEN_ADDRESS);
            setCopiedSolana(true);
            setTimeout(() => setCopiedSolana(false), 2000);
        } catch {
            setCopiedSolana(false);
        }
    };

    const handleCopyWaddleCa = async () => {
        try {
            await navigator.clipboard.writeText(WADDLE_ETH_CONTRACT);
            setCopiedWaddle(true);
            setTimeout(() => setCopiedWaddle(false), 2000);
        } catch {
            setCopiedWaddle(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 sm:p-4">
            <div
                ref={modalRef}
                className="relative bg-[#0a0e14] rounded-xl border border-emerald-500/25 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="entry-token-modal-title"
            >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-green-400 to-cyan-500" />

                <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2 shrink-0">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/90 mb-1">
                            {t('entryToken.badge')}
                        </p>
                        <h2 id="entry-token-modal-title" className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {t('entryToken.title')}
                        </h2>
                        <p className="text-white/50 text-xs sm:text-sm mt-1 leading-relaxed">{t('entryToken.subtitle')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onClose(dontShowAgain)}
                        className="shrink-0 text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5"
                        aria-label={t('entryToken.close')}
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pb-4 overscroll-contain space-y-4">
                    {/* Flagship: $WADDLE on Robinhood Chain */}
                    <section className="rounded-xl border border-emerald-500/35 bg-emerald-500/8 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-emerald-500/30 bg-[#1a1f2e] w-8 h-8">
                                <img
                                    src="/robinhood-logo.png"
                                    alt="Robinhood"
                                    width={32}
                                    height={32}
                                    className="h-full w-full object-cover"
                                />
                            </span>
                            <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide">
                                {t('entryToken.waddleHead')}
                            </h3>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35">
                                {t('entryToken.liveNow')}
                            </span>
                        </div>
                        <p className="text-sm text-white/70 leading-relaxed mb-4">{t('entryToken.waddleBody')}</p>

                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-white/45 mb-1.5">
                            {t('entryToken.waddleCaLabel')}
                        </label>
                        <div className="flex gap-2">
                            <code className="flex-1 min-w-0 text-[11px] sm:text-xs text-emerald-100 bg-black/40 border border-emerald-500/20 rounded-lg px-3 py-2.5 font-mono break-all leading-snug">
                                {WADDLE_ETH_CONTRACT}
                            </code>
                            <button
                                type="button"
                                onClick={handleCopyWaddleCa}
                                className="shrink-0 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-100 text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                            >
                                {copiedWaddle ? t('entryToken.copied') : t('entryToken.copyCa')}
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <a
                                href={WADDLE_EXPLORER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center py-2.5 px-4 rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-100 font-bold text-sm hover:bg-emerald-500/25 transition-colors"
                            >
                                {t('entryToken.viewExplorer')}
                            </a>
                            <a
                                href={WHITEPAPER_MULTICHAIN_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center py-2.5 px-4 rounded-lg border border-white/15 bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-colors"
                            >
                                {t('entryToken.viewWhitepaper')}
                            </a>
                        </div>
                    </section>

                    {/* Parallel: $CP on Solana */}
                    <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg" aria-hidden="true">◎</span>
                            <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wide">
                                {t('entryToken.solanaHead')}
                            </h3>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/90 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25">
                                {t('entryToken.solanaParallel')}
                            </span>
                        </div>
                        <p className="text-sm text-white/65 leading-relaxed mb-4">{t('entryToken.solanaBody')}</p>

                        <label className="block text-[10px] font-semibold uppercase tracking-wide text-white/45 mb-1.5">
                            {t('entryToken.caLabel')}
                        </label>
                        <div className="flex gap-2">
                            <code className="flex-1 min-w-0 text-[11px] sm:text-xs text-cyan-100 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 font-mono break-all leading-snug">
                                {CPW3_TOKEN_ADDRESS}
                            </code>
                            <button
                                type="button"
                                onClick={handleCopySolanaCa}
                                className="shrink-0 px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white text-xs font-bold hover:bg-white/10 transition-colors"
                            >
                                {copiedSolana ? t('entryToken.copied') : t('entryToken.copyCa')}
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                            <a
                                href={CP_JUPITER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center py-2.5 px-4 rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-100 font-bold text-sm hover:bg-cyan-500/20 transition-colors"
                            >
                                {t('entryToken.buyJupiter')}
                            </a>
                            <a
                                href={CP_DEXSCREENER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 text-center py-2.5 px-4 rounded-lg border border-white/15 bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-colors"
                            >
                                {t('entryToken.viewChart')}
                            </a>
                        </div>
                    </section>
                </div>

                <div className="shrink-0 px-5 py-4 border-t border-white/10 bg-black/20 space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="w-4 h-4 rounded border-white/30 bg-black/40 text-emerald-500 focus:ring-emerald-500/50"
                        />
                        <span className="text-xs text-white/60">{t('entryToken.dontShowAgain')}</span>
                    </label>
                    <button
                        type="button"
                        onClick={() => onClose(dontShowAgain)}
                        className="w-full py-3 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-sm uppercase tracking-wide hover:from-emerald-400 hover:to-green-500 transition-colors"
                    >
                        {t('entryToken.continue')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EntryTokenModal;
