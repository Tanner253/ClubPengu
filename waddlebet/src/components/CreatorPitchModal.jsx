/**
 * CreatorPitchModal — quick new-player pitch on Penguin Maker
 */

import React, { useMemo, useRef } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useLanguage } from '../i18n';

const Section = ({ title, children }) => (
    <section className="py-4 border-b border-white/10 last:border-0">
        <h3 className="text-sm font-bold text-white/90 uppercase tracking-wide mb-2">{title}</h3>
        {children}
    </section>
);

const CreatorPitchModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const { t } = useLanguage();

    useClickOutside(modalRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);

    const moneySteps = useMemo(() => [
        'creatorPitch.moneyHow1',
        'creatorPitch.moneyHow2',
        'creatorPitch.moneyHow3',
        'creatorPitch.moneyHow4',
    ], []);

    const worldItems = useMemo(() => [
        'creatorPitch.world1',
        'creatorPitch.world2',
        'creatorPitch.world3',
        'creatorPitch.world4',
        'creatorPitch.world5',
        'creatorPitch.world6',
        'creatorPitch.world7',
    ], []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
            <div
                ref={modalRef}
                className="relative bg-[#0f1218] rounded-xl border border-white/10 shadow-2xl w-full max-w-md max-h-[88vh] flex flex-col animate-fade-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                            {t('creatorPitch.title')}
                        </h2>
                        <p className="text-white/45 text-xs sm:text-sm mt-0.5">{t('creatorPitch.subtitle')}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 text-white/40 hover:text-white w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 overscroll-contain text-sm text-white/75">
                    <Section title={t('creatorPitch.whatHead')}>
                        <p className="leading-relaxed">{t('creatorPitch.whatBody')}</p>
                    </Section>

                    <Section title={t('creatorPitch.moneyHead')}>
                        <p className="text-green-400/90 font-semibold mb-3">{t('creatorPitch.moneyYes')}</p>
                        <ol className="space-y-2 list-none">
                            {moneySteps.map((key, i) => (
                                <li key={key} className="flex gap-2.5 leading-snug">
                                    <span className="text-amber-400/80 font-bold shrink-0 w-4">{i + 1}.</span>
                                    <span>{t(key)}</span>
                                </li>
                            ))}
                        </ol>
                        <p className="text-white/40 text-xs mt-3 leading-relaxed">{t('creatorPitch.moneyNote')}</p>
                    </Section>

                    <Section title={t('creatorPitch.worldHead')}>
                        <ul className="space-y-1.5">
                            {worldItems.map((key) => (
                                <li key={key} className="flex gap-2 leading-snug">
                                    <span className="text-white/25 shrink-0">·</span>
                                    <span>{t(key)}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                </div>

                <div className="p-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-lg font-black text-sm tracking-wide transition-colors active:scale-[0.98]"
                    >
                        {t('creatorPitch.cta')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreatorPitchModal;
