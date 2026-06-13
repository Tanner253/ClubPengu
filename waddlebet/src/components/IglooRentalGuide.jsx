/**
 * IglooRentalGuide - Informational guide about igloo rental mechanics
 * Scrollable UI popup optimized for mobile portrait
 */

import React, { useState, useEffect } from 'react';
import { IGLOO_CONFIG } from '../config/solana.js';
import { useLanguage } from '../i18n';

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
    
    // Rental information
    const rentInfo = [
        { label: 'Daily Rent', value: '10,000 $CP', color: 'text-yellow-400', icon: '💰' },
        { label: 'Min Balance', value: '70,000 $CP', color: 'text-red-400', icon: '⚠️' },
        { label: 'Grace Period', value: '12 hours', color: 'text-cyan-400', icon: '⏰' },
        { label: 'Total Igloos', value: '10 available', color: 'text-green-400', icon: '🏠' },
    ];
    
    const steps = [
        'Walk to igloo',
        'Press E',
        'Click Rent',
        'Pay $CP'
    ];
    
    const ownerPerks = [
        { emoji: '📺', title: '24/7 Ads', desc: 'Banner on map' },
        { emoji: '💵', title: 'Entry Fees', desc: 'Earn tokens' },
        { emoji: '🔐', title: 'Token Gate', desc: 'Holder access' },
        { emoji: '🎨', title: 'Customize', desc: 'Your style' },
        { emoji: '📊', title: 'Analytics', desc: 'Track stats' },
    ];
    
    const accessTypes = [
        { type: '🌐 Public', desc: 'Walk in free!', color: 'text-green-400' },
        { type: '💰 Fee', desc: 'Pay to enter', color: 'text-yellow-400' },
        { type: '🪙 Token', desc: 'Hold tokens', color: 'text-purple-400' },
        { type: '🔒 Private', desc: 'Owner only', color: 'text-red-400' },
    ];
    
    const visitSteps = [
        'Walk near igloo',
        'Press E to enter',
        'Meet requirements'
    ];
    
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className={`relative z-10 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-cyan-500/30 overflow-hidden flex flex-col ${
                isPortraitMobile 
                    ? 'w-full max-w-full max-h-[95vh] mx-0 my-0 rounded-none' 
                    : 'w-full max-w-2xl mx-4 max-h-[90vh]'
            }`}>
                {/* Header */}
                <div className="relative px-6 py-4 bg-gradient-to-r from-cyan-600/30 via-purple-600/20 to-cyan-600/30 border-b border-white/10 shrink-0">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl">🔍</span>
                        <h2 className="text-2xl font-bold text-white">
                            🏠 Igloo Rental Guide
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
                    {/* Section 1: How to Rent */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">💰</span>
                            <h3 className="text-xl font-bold text-yellow-400">
                                HOW TO RENT
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent mb-4" />
                        
                        {/* Rental Info Cards */}
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
                                    <div className={`font-bold ${info.color}`}>
                                        {info.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Steps */}
                        <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                            <h4 className="text-cyan-400 font-semibold mb-3">Steps:</h4>
                            <div className="space-y-2">
                                {steps.map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-white">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold">
                                            {idx + 1}
                                        </span>
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Section 2: Owner Perks */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">👑</span>
                            <h3 className="text-xl font-bold text-purple-400">
                                OWNER PERKS
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent mb-4" />
                        
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
                                        <p className="text-slate-400 text-sm">
                                            {perk.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                            <p className="text-purple-400 font-semibold text-sm text-center">
                                🔒Private 🌐Public 🪙Token 💰Fee
                            </p>
                        </div>
                    </div>
                    
                    {/* Section 3: Visitors */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🚶</span>
                            <h3 className="text-xl font-bold text-green-400">
                                VISITORS
                            </h3>
                        </div>
                        <div className="h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent mb-4" />
                        
                        <div className="space-y-3 mb-4">
                            {accessTypes.map((access, idx) => (
                                <div 
                                    key={idx}
                                    className="bg-slate-700/40 rounded-lg p-3 border border-slate-600/50"
                                >
                                    <div className={`font-bold mb-1 ${access.color}`}>
                                        {access.type}
                                    </div>
                                    <div className="text-slate-400 text-sm">
                                        {access.desc}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        {/* Visit Steps */}
                        <div className="bg-slate-800/60 rounded-lg p-4 border border-slate-700/50">
                            <h4 className="text-green-400 font-semibold mb-3">How to Visit:</h4>
                            <div className="space-y-2">
                                {visitSteps.map((step, idx) => (
                                    <div key={idx} className="flex items-center gap-3 text-white">
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">
                                            {idx + 1}
                                        </span>
                                        <span>{step}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Bottom CTA */}
                    <div className="bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 rounded-lg p-4 border border-cyan-500/30 text-center">
                        <p className="text-cyan-400 font-semibold">
                            🎉 Rent an igloo to advertise & earn from visitors! 🎉
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

export default IglooRentalGuide;

