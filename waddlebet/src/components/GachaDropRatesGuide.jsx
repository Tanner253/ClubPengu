/**
 * GachaDropRatesGuide - Informational guide about cosmetic gacha drop rates
 * Scrollable UI popup optimized for mobile portrait
 * Based on whitepaper data
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';

const GachaDropRatesGuide = ({ 
    isOpen, 
    onClose
}) => {
    const { t } = useLanguage();
    const [isMobile, setIsMobile] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            const portrait = window.innerHeight > window.innerWidth;
            setIsMobile(mobile);
            setIsPortrait(portrait);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('orientationchange', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
        };
    }, []);
    
    if (!isOpen) return null;
    
    const isPortraitMobile = isMobile && isPortrait;
    
    // Rarity data from whitepaper
    const rarities = [
        { 
            emoji: '✨', 
            name: 'Divine', 
            rate: '0.02%', 
            oneInX: '5,000',
            color: 'text-cyan-300',
            bgColor: 'bg-gradient-to-r from-cyan-500/10 to-pink-500/10',
            borderColor: 'border-cyan-400/50',
            dupPebbles: '50,000',
            dupSol: '50.00',
            items: 7,
            examples: ['Cosmic Crown', 'Omniscient Gaze', 'Celestial Skin', 'Transcendent']
        },
        { 
            emoji: '🔴', 
            name: 'Mythic', 
            rate: '0.18%', 
            oneInX: '556',
            color: 'text-red-400',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            dupPebbles: '10,000',
            dupSol: '10.00',
            items: 14,
            examples: ['Void Crown', 'Dragon Wings', 'Void Black', 'Ethereal Skin']
        },
        { 
            emoji: '🟡', 
            name: 'Legendary', 
            rate: '0.8%', 
            oneInX: '125',
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/30',
            dupPebbles: '2,500',
            dupSol: '2.50',
            items: 21,
            examples: ['Fire Eyes', 'Wizard Hat', 'Holographic Skin', 'Chromatic']
        },
        { 
            emoji: '🟣', 
            name: 'Epic', 
            rate: '4%', 
            oneInX: '25',
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/30',
            dupPebbles: '500',
            dupSol: '0.50',
            items: 25,
            examples: ['Angel Wings', 'Rainbow Skin', 'Aurora', 'Ice']
        },
        { 
            emoji: '🔵', 
            name: 'Rare', 
            rate: '12%', 
            oneInX: '8.3',
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/30',
            dupPebbles: '150',
            dupSol: '0.15',
            items: 54,
            examples: ['Crown', 'Laser Eyes', 'Neon Colors', 'Jewel Tones']
        },
        { 
            emoji: '🟢', 
            name: 'Uncommon', 
            rate: '28%', 
            oneInX: '3.6',
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/30',
            dupPebbles: '50',
            dupSol: '0.05',
            items: 52,
            examples: ['Viking Helmet', 'Gold Chain', 'Metallic Colors', 'Nature Tones']
        },
        { 
            emoji: '⚪', 
            name: 'Common', 
            rate: '55%', 
            oneInX: '1.8',
            color: 'text-slate-400',
            bgColor: 'bg-slate-500/10',
            borderColor: 'border-slate-500/30',
            dupPebbles: '25',
            dupSol: '0.025',
            items: 94,
            examples: ['Basic Hats', 'Simple Eyes', 'Common Clothing', 'Basic Colors']
        }
    ];
    
    // Quality modifiers
    const qualityModifiers = [
        { name: 'Worn', chance: '10%', multiplier: '0.75x', color: 'text-slate-500', desc: 'Slightly faded appearance' },
        { name: 'Standard', chance: '60%', multiplier: '1.0x', color: 'text-slate-300', desc: 'Normal quality' },
        { name: 'Pristine', chance: '25%', multiplier: '1.25x', color: 'text-green-400', desc: 'Crisp, clean visuals' },
        { name: 'Flawless', chance: '5%', multiplier: '1.5x', color: 'text-yellow-400', desc: 'Perfect condition, premium shine' }
    ];
    
    // Pity system
    const pitySystem = [
        { tier: 'Rare+', threshold: 40, desc: 'Guaranteed Rare or better every 40 rolls' },
        { tier: 'Epic+', threshold: 100, desc: 'Guaranteed Epic or better every 100 rolls' },
        { tier: 'Legendary+', threshold: 400, desc: 'Guaranteed Legendary or better every 400 rolls' }
    ];
    
    // Ultra rare combinations
    const ultraRareCombos = [
        { name: 'Flawless Holo Divine', chance: '1 in 1,250,000', avgCost: '31,250 SOL' },
        { name: 'Flawless Divine', chance: '1 in 100,000', avgCost: '2,500 SOL' },
        { name: 'Holographic Divine', chance: '1 in 62,500', avgCost: '1,562 SOL' },
        { name: 'Any Divine', chance: '1 in 5,000', avgCost: '125 SOL' }
    ];
    
    // Calculate average cost to get (in SOL)
    const calculateAvgCost = (oneInX) => {
        const rolls = parseFloat(oneInX.replace(',', ''));
        return (rolls * 0.025).toFixed(2);
    };
    
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className={`relative z-10 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden flex flex-col ${
                isPortraitMobile 
                    ? 'w-full max-w-full max-h-[95vh] mx-0 my-0 rounded-none' 
                    : 'w-full max-w-2xl mx-4 max-h-[90vh]'
            }`}>
                {/* Header */}
                <div className="relative px-6 py-4 bg-gradient-to-r from-purple-600/30 via-pink-600/20 to-yellow-600/30 border-b border-white/10 shrink-0">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">🔍</span>
                        <h2 className="text-2xl font-bold text-white">
                            ✨ Cosmetic Gacha ✨
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-600 text-white/60 hover:text-white text-xl transition-all"
                    >
                        ×
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50 text-center">
                            <div className="text-2xl mb-1">🪨</div>
                            <div className="text-sm text-slate-400">Roll Cost</div>
                            <div className="text-lg font-bold text-pink-400">25 Pebbles</div>
                            <div className="text-xs text-slate-500">≈ 0.025 SOL</div>
                        </div>
                        <div className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50 text-center">
                            <div className="text-2xl mb-1">🎁</div>
                            <div className="text-sm text-slate-400">Always Win</div>
                            <div className="text-lg font-bold text-green-400">100%</div>
                            <div className="text-xs text-slate-500">Every spin wins</div>
                        </div>
                    </div>
                    
                    {/* Drop Rates by Rarity */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">💎</span>
                            <h3 className="text-xl font-bold text-purple-400">
                                Drop Rates by Rarity
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent mb-4" />
                        
                        <div className="space-y-3">
                            {rarities.map((rarity, idx) => (
                                <div 
                                    key={idx}
                                    className={`${rarity.bgColor} rounded-lg p-4 border ${rarity.borderColor}`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{rarity.emoji}</span>
                                            <div>
                                                <h4 className={`font-bold ${rarity.color}`}>
                                                    {rarity.name}
                                                </h4>
                                                <p className="text-xs text-slate-400">
                                                    {rarity.items} items in pool
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono font-bold ${rarity.color}`}>
                                                {rarity.rate}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                1 in {rarity.oneInX}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                                        <div className="bg-slate-800/60 rounded p-2">
                                            <div className="text-slate-400 text-xs">Avg Cost</div>
                                            <div className="text-white font-mono">
                                                {calculateAvgCost(rarity.oneInX)} SOL
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/60 rounded p-2">
                                            <div className="text-slate-400 text-xs">Dupe Value</div>
                                            <div className="text-yellow-400 font-mono">
                                                {rarity.dupPebbles} 🪨
                                            </div>
                                            <div className="text-yellow-300 font-mono text-xs">
                                                {rarity.dupSol} SOL
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {idx === 0 && (
                                        <div className="mt-2 text-xs text-pink-400">
                                            ✨ 1st Ed + Holo variants available!
                                        </div>
                                    )}
                                    {idx > 0 && idx < 3 && (
                                        <div className="mt-2 text-xs text-cyan-400">
                                            ✨ Holo Chance!
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Quality Modifiers */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">⭐</span>
                            <h3 className="text-xl font-bold text-yellow-400">
                                Quality Modifiers
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent mb-4" />
                        
                        <div className="space-y-2">
                            {qualityModifiers.map((quality, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50 flex items-center justify-between"
                                >
                                    <div>
                                        <span className={`font-semibold ${quality.color}`}>
                                            {quality.name}
                                        </span>
                                        <p className="text-xs text-slate-500">{quality.desc}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-slate-300 text-sm">{quality.chance}</span>
                                        <p className={`text-xs ${quality.multiplier.includes('1.5') ? 'text-yellow-400' : quality.multiplier.includes('1.25') ? 'text-green-400' : 'text-slate-500'}`}>
                                            {quality.multiplier} value
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Special Variants */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">✨</span>
                            <h3 className="text-xl font-bold text-cyan-400">
                                Special Variants
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent mb-4" />
                        
                        <div className="space-y-3">
                            <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 rounded-lg p-4 border border-cyan-500/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                                        ✨ Holographic
                                    </span>
                                    <span className="text-cyan-400 font-mono text-sm">8% chance</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    Prismatic rainbow shimmer effect. Massive value multiplier. Rare+ items only. Highly collectible.
                                </p>
                            </div>
                            
                            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-4 border border-yellow-500/30">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-yellow-400">🥇 First Edition</span>
                                    <span className="text-yellow-400 font-mono text-sm">Serial #1-3</span>
                                </div>
                                <p className="text-slate-400 text-sm">
                                    The first 3 ever minted of any cosmetic get the "First Edition" tag. Extremely rare. Major flex. Permanent badge.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Pity System */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🛡️</span>
                            <h3 className="text-xl font-bold text-green-400">
                                Pity System
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent mb-4" />
                        
                        <div className="space-y-3">
                            {pitySystem.map((pity, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-slate-700/40 rounded-lg p-4 border border-slate-600/50"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-white">{pity.tier}</span>
                                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-mono">
                                            {pity.threshold} rolls
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm">{pity.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Ultra Rare Combinations */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">💎</span>
                            <h3 className="text-xl font-bold text-purple-400">
                                Ultra-Rare Combinations
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent mb-4" />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {ultraRareCombos.map((combo, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 text-center"
                                >
                                    <p className="text-xs text-slate-400 mb-1">{combo.name}</p>
                                    <p className="font-mono text-purple-400 text-sm">{combo.chance}</p>
                                    <p className="text-xs text-slate-500">~{combo.avgCost}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Bottom CTA */}
                    <div className="bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-yellow-500/20 rounded-lg p-4 border border-purple-500/30 text-center">
                        <p className="text-purple-400 font-semibold">
                            🎁 PITY SYSTEM ACTIVE! • Guaranteed drops after bad luck • Holographic & First Edition variants!
                        </p>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 bg-slate-900/90 border-t border-slate-700/50 shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
                    >
                        {isPortraitMobile ? t('ui.tapToClose') : t('ui.clickOrEscToClose')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GachaDropRatesGuide;

