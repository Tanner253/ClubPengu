/**
 * TokenomicsModal - $WADDLE Token Utility & Tokenomics Information
 */

import React, { useRef, useMemo } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useLanguage } from '../i18n';

const TokenomicsModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const { t } = useLanguage();
    
    useClickOutside(modalRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);
    
    const features = useMemo(() => [
        { emoji: '👑', titleKey: 'tokenomics.f1t', descKey: 'tokenomics.f1d' },
        { emoji: '🎰', titleKey: 'tokenomics.f2t', descKey: 'tokenomics.f2d' },
        { emoji: '🏠', titleKey: 'tokenomics.f3t', descKey: 'tokenomics.f3d' },
        { emoji: '👕', titleKey: 'tokenomics.f4t', descKey: 'tokenomics.f4d' },
        { emoji: '🎮', titleKey: 'tokenomics.f5t', descKey: 'tokenomics.f5d' },
        { emoji: '🤝', titleKey: 'tokenomics.f6t', descKey: 'tokenomics.f6d' },
    ], []);
    
    const roadmapItems = useMemo(() => [
        { phaseKey: 'tokenomics.phase1', status: 'live', titleKey: 'tokenomics.rTitle1', itemKeys: ['tokenomics.r1i1', 'tokenomics.r1i2', 'tokenomics.r1i3'] },
        { phaseKey: 'tokenomics.phase2', status: 'live', titleKey: 'tokenomics.rTitle2', itemKeys: ['tokenomics.r2i1', 'tokenomics.r2i2', 'tokenomics.r2i3'] },
        { phaseKey: 'tokenomics.phase3', status: 'building', titleKey: 'tokenomics.rTitle3', itemKeys: ['tokenomics.r3i1', 'tokenomics.r3i2', 'tokenomics.r3i3'] },
        { phaseKey: 'tokenomics.phase4', status: 'soon', titleKey: 'tokenomics.rTitle4', itemKeys: ['tokenomics.r4i1', 'tokenomics.r4i2', 'tokenomics.r4i3'] },
    ], []);
    
    const tiers = useMemo(() => [
        { nameKey: 'tokenomics.tierStandard', balance: '0-999', color: 'text-slate-400' },
        { nameKey: 'tokenomics.tierBronze', balance: '1K-10K', color: 'text-amber-600' },
        { nameKey: 'tokenomics.tierSilver', balance: '10K-100K', color: 'text-slate-300' },
        { nameKey: 'tokenomics.tierGold', balance: '100K-1M', color: 'text-yellow-400' },
        { nameKey: 'tokenomics.tierDiamond', balance: '1M-10M', color: 'text-cyan-300' },
        { nameKey: 'tokenomics.tierLegendary', balance: '10M+', color: 'text-purple-400' },
    ], []);
    
    if (!isOpen) return null;
    
    const statusLabel = (status) => {
        if (status === 'live') return t('tokenomics.statusLive');
        if (status === 'building') return t('tokenomics.statusBuilding');
        if (status === 'soon') return t('tokenomics.statusSoon');
        return t('tokenomics.statusFuture');
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
            <div 
                ref={modalRef}
                className="relative bg-gradient-to-br from-[#0a0a1a] via-[#111128] to-[#0d1a2d] rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                <div className="relative flex items-center justify-between p-4 sm:p-6 pb-2 shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl sm:text-4xl animate-bounce-slow">🐧</div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                                {t('tokenomics.title')}
                            </h2>
                            <p className="text-white/50 text-xs sm:text-sm">{t('tokenomics.subtitle')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors w-10 h-10 flex items-center justify-center text-xl rounded-full hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>
                
                <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 overscroll-contain">
                    
                    <div className="relative bg-gradient-to-r from-cyan-600/30 via-blue-600/30 to-purple-600/30 rounded-xl p-4 sm:p-6 border border-white/10">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{t('tokenomics.heroTitle')}</h3>
                        <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                            {t('tokenomics.heroA')}
                            <span className="text-cyan-400 font-bold">{t('tokenomics.heroYou')}</span>
                            {t('tokenomics.heroB')}
                            <span className="text-purple-400 font-bold">{t('tokenomics.heroSolana')}</span>
                            {t('tokenomics.heroC')}
                            <span className="text-green-400 font-bold">{t('tokenomics.heroX402')}</span>
                            .
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/30">{t('tokenomics.badgeP2p')}</span>
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold border border-purple-500/30">{t('tokenomics.badgeDecent')}</span>
                            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold border border-cyan-500/30">{t('tokenomics.badgeCommunity')}</span>
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-white font-bold text-base sm:text-lg mb-3 flex items-center gap-2">
                            <span className="text-2xl">💎</span>
                            <span>{t('tokenomics.utilityHeading')}</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {features.map((feature, idx) => (
                                <div key={idx} className="bg-white/5 hover:bg-white/10 rounded-xl p-3 sm:p-4 border border-white/5 hover:border-cyan-500/30 transition-all group">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl group-hover:scale-110 transition-transform">{feature.emoji}</span>
                                        <div>
                                            <h4 className="text-white font-bold text-sm">{t(feature.titleKey)}</h4>
                                            <p className="text-white/50 text-xs mt-1 leading-relaxed">{t(feature.descKey)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="relative bg-gradient-to-r from-orange-600/20 via-red-600/20 to-pink-600/20 rounded-xl p-4 sm:p-5 border border-orange-500/30">
                        <h3 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400 mb-2">
                            {t('tokenomics.wagerHead')}
                        </h3>
                        <p className="text-white/70 text-sm leading-relaxed mb-3">
                            {t('tokenomics.wagerBody')}
                            <span className="text-orange-400 font-bold">$BONK</span>
                            <span className="text-purple-400 font-bold"> $WIF</span>
                            <span className="text-green-400 font-bold">$POPCAT</span>
                            {' — '}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-orange-500/30 text-orange-300 rounded-lg">{t('tokenomics.wagerChipTtt')}</span>
                            <span className="px-2 py-1 bg-red-500/30 text-red-300 rounded-lg">{t('tokenomics.wagerChipC4')}</span>
                            <span className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded-lg">{t('tokenomics.wagerChipCj')}</span>
                            <span className="px-2 py-1 bg-pink-500/30 text-pink-300 rounded-lg">{t('tokenomics.wagerChipCasino')}</span>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-yellow-900/20 to-purple-900/20 rounded-xl p-4 border border-yellow-500/20">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <span className="text-2xl">👑</span>
                            <span>{t('tokenomics.whaleHead')}</span>
                        </h3>
                        <p className="text-white/60 text-sm mb-3">
                            {t('tokenomics.whaleDesc')}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {tiers.map((tier, idx) => (
                                <div key={idx} className="bg-black/30 rounded-lg p-2 border border-white/5">
                                    <div className={`font-bold text-sm ${tier.color}`}>{t(tier.nameKey)}</div>
                                    <div className="text-white/40 text-[10px]">{tier.balance}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <span className="text-2xl">🤝</span>
                            <span>{t('tokenomics.cultHead')}</span>
                        </h3>
                        <p className="text-white/60 text-sm mb-3">
                            {t('tokenomics.cultBody')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['🐕 DOG CULTS', '🐱 CAT CULTS', '🐸 FROG CULTS', '🎭 MEME CULTS', '🎮 GAMING CULTS', '💀 DEGEN CULTS'].map((cult, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-colors cursor-pointer border border-white/5 hover:border-purple-500/30">
                                    {cult}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <h3 className="text-white font-bold text-base sm:text-lg mb-3 flex items-center gap-2">
                            <span className="text-2xl">🗺️</span>
                            <span>{t('tokenomics.roadmapHead')}</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {roadmapItems.map((item, idx) => (
                                <div 
                                    key={idx}
                                    className={`rounded-xl p-3 border transition-all ${
                                        item.status === 'live' ? 'bg-green-500/10 border-green-500/30' :
                                        item.status === 'building' ? 'bg-yellow-500/10 border-yellow-500/30' :
                                        item.status === 'soon' ? 'bg-cyan-500/10 border-cyan-500/30' :
                                        'bg-white/5 border-white/10'
                                    }`}
                                >
                                    <div className={`text-xs font-bold mb-1 ${
                                        item.status === 'live' ? 'text-green-400' :
                                        item.status === 'building' ? 'text-yellow-400' :
                                        item.status === 'soon' ? 'text-cyan-400' :
                                        'text-white/50'
                                    }`}>
                                        {t(item.phaseKey)}
                                    </div>
                                    <div className="text-white font-bold text-sm mb-1">{t(item.titleKey)}</div>
                                    <div className="space-y-0.5">
                                        {item.itemKeys.map((ik, subIdx) => (
                                            <div key={subIdx} className="text-white/40 text-[10px]">• {t(ik)}</div>
                                        ))}
                                    </div>
                                    <div className={`mt-2 text-[10px] font-bold uppercase ${
                                        item.status === 'live' ? 'text-green-400' :
                                        item.status === 'building' ? 'text-yellow-400' :
                                        item.status === 'soon' ? 'text-cyan-400' :
                                        'text-white/30'
                                    }`}>
                                        {statusLabel(item.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-4 text-center border border-cyan-500/20">
                        <h3 className="text-xl font-black text-white mb-2">{t('tokenomics.joinHead')}</h3>
                        <p className="text-white/60 text-sm mb-4">{t('tokenomics.joinBody')}</p>
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                            <a 
                                href="https://dexscreener.com/solana/5yfmefzrompokc2r9j8b1mzqututhywr9vrqmsxhzd3r"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95"
                            >
                                {t('tokenomics.viewChart')}
                            </a>
                            <a 
                                href="https://x.com/oSKNYo_dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-white rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95"
                            >
                                {t('tokenomics.followUs')}
                            </a>
                        </div>
                    </div>
                    
                    <div className="h-4" />
                </div>
                
                <div className="relative p-4 shrink-0 border-t border-white/5 bg-black/30">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-cyan-500/20"
                    >
                        {t('tokenomics.lfg')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TokenomicsModal;
