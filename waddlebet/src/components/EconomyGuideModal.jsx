/**
 * EconomyGuideModal — player-facing gold grind, materials, markets, sustainability
 * Separate from TokenomicsModal ($CP / Solana)
 */

import React, { useRef } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useLanguage } from '../i18n';

const Section = ({ emoji, title, children }) => (
    <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{emoji}</span>
            <h3 className="text-lg font-bold text-amber-400">{title}</h3>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent mb-3" />
        {children}
    </div>
);

const EconomyGuideModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const { t } = useLanguage();

    useClickOutside(modalRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);

    if (!isOpen) return null;

    const currencies = [
        { emoji: '🪙', title: t('economyGuide.goldTitle'), desc: t('economyGuide.goldDesc'), border: 'border-amber-500/30' },
        { emoji: '🪨', title: t('economyGuide.pebblesTitle'), desc: t('economyGuide.pebblesDesc'), border: 'border-purple-500/30' },
        { emoji: '💎', title: t('economyGuide.cpTitle'), desc: t('economyGuide.cpDesc'), border: 'border-cyan-500/30' },
    ];

    const loopSteps = [
        t('economyGuide.loop1'),
        t('economyGuide.loop2'),
        t('economyGuide.loop3'),
        t('economyGuide.loop4'),
        t('economyGuide.loop5'),
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
            <div
                ref={modalRef}
                className="relative bg-gradient-to-br from-[#0f1419] via-[#141c24] to-[#0a1018] rounded-2xl border border-amber-500/30 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">⚖️</span>
                        <div>
                            <h2 className="text-xl font-black text-amber-400">{t('economyGuide.title')}</h2>
                            <p className="text-white/50 text-xs sm:text-sm">{t('economyGuide.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/50 hover:text-white w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 overscroll-contain text-sm">
                    <Section emoji="💱" title={t('economyGuide.currenciesHead')}>
                        <div className="space-y-2">
                            {currencies.map((c) => (
                                <div key={c.title} className={`bg-black/30 rounded-lg p-3 border ${c.border}`}>
                                    <div className="font-bold text-white flex items-center gap-2">
                                        <span>{c.emoji}</span>
                                        {c.title}
                                    </div>
                                    <p className="text-white/60 text-xs mt-1 leading-relaxed">{c.desc}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section emoji="🔄" title={t('economyGuide.loopHead')}>
                        <ol className="space-y-2">
                            {loopSteps.map((step, i) => (
                                <li key={i} className="flex gap-2 text-white/75 text-xs sm:text-sm">
                                    <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                                    <span>{step}</span>
                                </li>
                            ))}
                        </ol>
                    </Section>

                    <Section emoji="📈" title={t('economyGuide.earnHead')}>
                        <ul className="space-y-1.5 text-white/70 text-xs sm:text-sm list-disc list-inside">
                            <li>{t('economyGuide.earnFish')}</li>
                            <li>{t('economyGuide.earnWood')}</li>
                            <li>{t('economyGuide.earnDaily')}</li>
                            <li>{t('economyGuide.earnSpinner')}</li>
                            <li>{t('economyGuide.earnScavenge')}</li>
                            <li>{t('economyGuide.earnWager')}</li>
                        </ul>
                    </Section>

                    <Section emoji="📉" title={t('economyGuide.spendHead')}>
                        <p className="text-white/70 text-xs sm:text-sm">{t('economyGuide.spendList')}</p>
                    </Section>

                    <Section emoji="🪵" title={t('economyGuide.materialsHead')}>
                        <p className="text-white/70 text-xs sm:text-sm leading-relaxed">{t('economyGuide.materialsDesc')}</p>
                    </Section>

                    <Section emoji="🎡" title={t('economyGuide.spinnerHead')}>
                        <p className="text-white/70 text-xs sm:text-sm leading-relaxed">{t('economyGuide.spinnerDesc')}</p>
                    </Section>

                    <Section emoji="🏪" title={t('economyGuide.marketsHead')}>
                        <div className="space-y-2">
                            <div className="bg-purple-500/10 border border-purple-500/25 rounded-lg p-3 text-xs sm:text-sm text-white/75">
                                <span className="text-purple-300 font-bold">Cosmetic Bazaar — </span>
                                {t('economyGuide.marketCosmetic')}
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-3 text-xs sm:text-sm text-white/75">
                                <span className="text-amber-300 font-bold">Resource Exchange — </span>
                                {t('economyGuide.marketResource')}
                            </div>
                        </div>
                    </Section>

                    <Section emoji="🌱" title={t('economyGuide.sustainHead')}>
                        <ul className="space-y-2 text-white/70 text-xs sm:text-sm">
                            <li>• {t('economyGuide.sustain1')}</li>
                            <li>• {t('economyGuide.sustain2')}</li>
                            <li>• {t('economyGuide.sustain3')}</li>
                            <li>• {t('economyGuide.sustain4')}</li>
                        </ul>
                    </Section>

                    <Section emoji="🚫" title={t('economyGuide.notHead')}>
                        <p className="text-white/60 text-xs sm:text-sm">{t('economyGuide.notList')}</p>
                    </Section>
                </div>

                <div className="p-4 border-t border-white/10 shrink-0 bg-black/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black rounded-xl font-bold text-sm transition-all"
                    >
                        {t('economyGuide.close')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EconomyGuideModal;
