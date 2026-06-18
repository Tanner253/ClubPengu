/**
 * IglooRentalGuide - Informational guide about igloo rental mechanics
 * Scrollable UI popup optimized for mobile portrait
 */

import React, { useState, useEffect } from 'react';
import { IGLOO_CONFIG } from '../config/solana.js';
import { useLanguage } from '../i18n';

const formatCp = (amount) => `${amount.toLocaleString()} $CP`;

const IglooRentalGuide = ({ 
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
    const { DAILY_RENT_CPW3, MINIMUM_BALANCE_CPW3, GRACE_PERIOD_HOURS, RENTABLE_IGLOOS } = IGLOO_CONFIG;
    
    const rentInfo = [
        { 
            label: 'Daily Rent', 
            value: formatCp(DAILY_RENT_CPW3), 
            color: 'text-yellow-400', 
            icon: '💰',
            detail: 'Paid in $CP each day you want to keep the igloo.'
        },
        { 
            label: 'Min Balance', 
            value: formatCp(MINIMUM_BALANCE_CPW3), 
            color: 'text-red-400', 
            icon: '⚠️',
            detail: '7 days of rent held in your wallet to qualify for a new rental.'
        },
        { 
            label: 'Grace Period', 
            value: `${GRACE_PERIOD_HOURS} hours`, 
            color: 'text-cyan-400', 
            icon: '⏰',
            detail: 'Extra time after rent is due before you are evicted.'
        },
        { 
            label: 'Available', 
            value: `${RENTABLE_IGLOOS.length} igloos`, 
            color: 'text-green-400', 
            icon: '🏠',
            detail: 'Along the north row of town — look for vacant ones on the map.'
        },
    ];
    
    const rentSteps = [
        'Connect your Solana wallet (must hold enough $CP)',
        'Walk to a vacant igloo along the north row in town',
        'Press E at the door to open the rental panel',
        'Pay the first day\'s rent — the igloo is yours for 24 hours',
        'Open Igloo Settings inside to set your banner, access rules, and fees'
    ];
    
    const keepSteps = [
        'Rent is due every 24 hours — pay again from Igloo Settings → Rent Info',
        'If you miss a payment, you get a grace period before eviction',
        'After grace expires, the igloo goes back on the market for anyone to rent',
        'You can rent up to 2 igloos at once, or leave voluntarily anytime'
    ];
    
    const ownerPerks = [
        { 
            emoji: '📺', 
            title: '24/7 Map Banner', 
            desc: 'Your custom banner floats above your igloo on the town map so every player walking by sees your project, link, or promo — even when you are offline.'
        },
        { 
            emoji: '💵', 
            title: 'Entry Fees', 
            desc: 'Charge visitors an SPL token fee to enter your igloo. Payments go on-chain to your wallet. Great for exclusive hangouts, alpha groups, or paid events.'
        },
        { 
            emoji: '🔐', 
            title: 'Token Gate', 
            desc: 'Require visitors to hold a minimum balance of your token before they can enter. Use this to build a holder-only lounge for your community.'
        },
        { 
            emoji: '🎨', 
            title: 'Full Customization', 
            desc: 'Upload a banner image, set title text, and choose who can enter — public, private, token-gated, entry fee, or a combination.'
        },
        { 
            emoji: '📊', 
            title: 'Visitor Analytics', 
            desc: 'Track total visits, unique visitors, and entry fees collected so you can see whether your igloo is pulling traffic.'
        },
    ];
    
    const accessTypes = [
        { 
            type: '🌐 Public', 
            desc: 'Anyone can walk in for free. Best for open hangouts and meetups.',
            color: 'text-green-400' 
        },
        { 
            type: '💰 Entry Fee', 
            desc: 'Visitors pay a one-time SPL token fee (set by you) before entering. You keep the revenue.',
            color: 'text-yellow-400' 
        },
        { 
            type: '🪙 Token Gated', 
            desc: 'Visitors must hold a minimum amount of your chosen token in their wallet.',
            color: 'text-purple-400' 
        },
        { 
            type: '🔒 Private', 
            desc: 'Only you can enter. Useful while you are setting up your banner and access rules.',
            color: 'text-red-400' 
        },
        { 
            type: '🪙💰 Token + Fee', 
            desc: 'Combine both — holders must meet your token minimum and pay an entry fee.',
            color: 'text-cyan-400' 
        },
    ];
    
    const visitSteps = [
        'Find igloos on the north row of town (banners show who owns each one)',
        'Walk to the door and press E',
        'If access is restricted, pay the entry fee or connect a wallet with enough tokens',
        'Once inside, hang out — chat, emote, and explore the owner\'s space'
    ];
    
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            
            <div className={`relative z-10 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-cyan-500/30 overflow-hidden flex flex-col ${
                isPortraitMobile 
                    ? 'w-full max-w-full max-h-[95vh] mx-0 my-0 rounded-none' 
                    : 'w-full max-w-2xl mx-4 max-h-[90vh]'
            }`}>
                <div className="relative px-6 py-4 bg-gradient-to-r from-cyan-600/30 via-purple-600/20 to-cyan-600/30 border-b border-white/10 shrink-0">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">🏠</span>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">
                            Igloo Rental Guide
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-600 text-white/60 hover:text-white text-xl transition-all"
                    >
                        ×
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                    {/* Why rent */}
                    <div className="mb-6 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-cyan-500/10 rounded-xl p-4 border border-cyan-500/25">
                        <h3 className="text-lg font-bold text-white mb-2">Why rent an igloo?</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Igloos are your own private space in town with a <strong className="text-cyan-300">permanent map presence</strong>. 
                            Rent one to advertise your project, host holder-only lounges, charge entry fees, or run community events — 
                            all while earning from visitors who want in.
                        </p>
                    </div>

                    {/* How to rent */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">💰</span>
                            <h3 className="text-xl font-bold text-yellow-400">
                                How to Rent
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent mb-4" />
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {rentInfo.map((info, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-lg">{info.icon}</span>
                                        <span className="text-sm text-slate-400">{info.label}</span>
                                    </div>
                                    <div className={`font-bold mb-1 ${info.color}`}>
                                        {info.value}
                                    </div>
                                    <p className="text-slate-500 text-xs leading-relaxed">
                                        {info.detail}
                                    </p>
                                </div>
                            ))}
                        </div>
                        
                        <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                            <h4 className="text-cyan-400 font-semibold mb-3">Getting started:</h4>
                            <div className="space-y-2.5">
                                {rentSteps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-white text-sm">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <span className="leading-relaxed">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Keeping your igloo */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🔄</span>
                            <h3 className="text-xl font-bold text-orange-400">
                                Keeping Your Igloo
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-orange-400/50 to-transparent mb-4" />
                        
                        <div className="bg-slate-800/60 rounded-lg p-4 border border-orange-500/20">
                            <div className="space-y-2.5">
                                {keepSteps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                                        <span className="text-orange-400 flex-shrink-0 mt-0.5">•</span>
                                        <span className="leading-relaxed">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Owner perks */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">👑</span>
                            <h3 className="text-xl font-bold text-purple-400">
                                Owner Perks
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent mb-4" />
                        
                        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                            Once you rent, open <strong className="text-purple-300">Igloo Settings</strong> from inside your igloo to configure everything below.
                        </p>
                        
                        <div className="space-y-3">
                            {ownerPerks.map((perk, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50 flex items-start gap-3"
                                >
                                    <span className="text-2xl flex-shrink-0">{perk.emoji}</span>
                                    <div className="flex-1">
                                        <h4 className="text-white font-semibold mb-1">
                                            {perk.title}
                                        </h4>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            {perk.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Visitors */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🚶</span>
                            <h3 className="text-xl font-bold text-green-400">
                                For Visitors
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent mb-4" />
                        
                        <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                            Each owner picks an access mode. You will see the requirement when you press E at the door.
                        </p>
                        
                        <div className="space-y-3 mb-4">
                            {accessTypes.map((access, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50"
                                >
                                    <div className={`font-bold mb-1 ${access.color}`}>
                                        {access.type}
                                    </div>
                                    <div className="text-slate-400 text-sm leading-relaxed">
                                        {access.desc}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                            <h4 className="text-green-400 font-semibold mb-3">How to visit:</h4>
                            <div className="space-y-2.5">
                                {visitSteps.map((step, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-white text-sm">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <span className="leading-relaxed">{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-lg p-4 border border-cyan-500/30 text-center">
                        <p className="text-cyan-300 font-semibold text-sm leading-relaxed">
                            Rent an igloo to put your brand on the map, monetize access, and build a home base for your community.
                        </p>
                    </div>
                </div>
                
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

export default IglooRentalGuide;
