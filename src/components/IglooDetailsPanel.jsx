/**
 * IglooDetailsPanel - Marketing panel for igloos available for rent
 * Shows benefits of ownership and CTAs for purchasing or previewing
 */

import React from 'react';
import { IGLOO_CONFIG } from '../config/solana.js';

const IglooDetailsPanel = ({ 
    isOpen, 
    onClose,
    iglooData,
    onRent,       // "I want to buy" - opens rental modal
    onPreview,    // "I want to see inside" - demo mode
    walletAddress
}) => {
    if (!isOpen) return null;
    
    const iglooName = iglooData?.iglooId?.replace('igloo', 'Igloo ') || 'This Igloo';
    
    // Benefits of owning an igloo
    const benefits = [
        {
            icon: '📺',
            title: '24/7 Advertising',
            description: 'Your custom banner displays to all visitors on the map. Promote your project, token, or community around the clock.'
        },
        {
            icon: '💰',
            title: 'Monetization',
            description: 'Set entry fees and earn tokens every time someone visits. Choose your own token for payments.'
        },
        {
            icon: '🔐',
            title: 'Token Gating',
            description: 'Create exclusive spaces for your community. Require visitors to hold specific tokens to enter.'
        },
        {
            icon: '🎨',
            title: 'Full Customization',
            description: 'Personalize your space with custom banners, titles, and settings. Make it uniquely yours.'
        },
        {
            icon: '👥',
            title: 'Community Hub',
            description: 'Host events, meetups, and hangouts. Build your community in an exclusive virtual space.'
        },
        {
            icon: '📊',
            title: 'Visitor Analytics',
            description: 'Track visits and engagement. See who\'s visiting and how your igloo is performing.'
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-emerald-500/30 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-600 text-white/60 hover:text-white text-xl transition-all"
                >
                    ×
                </button>
                
                {/* Hero Header */}
                <div className="relative px-6 py-6 bg-gradient-to-r from-emerald-600/30 via-cyan-600/20 to-purple-600/30 border-b border-white/10">
                    <div className="text-center">
                        <div className="text-5xl mb-2">🏠</div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                            {iglooName}
                        </h2>
                        <p className="text-emerald-400 font-semibold">
                            Available for Rent!
                        </p>
                    </div>
                    
                    {/* Price Tag */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-4 py-1.5 rounded-full font-bold text-sm shadow-lg shadow-yellow-500/30">
                            💎 {IGLOO_CONFIG.DAILY_RENT_CPW3?.toLocaleString() || '10,000'} $WADDLE/day
                        </div>
                    </div>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 py-8">
                    {/* Tagline */}
                    <div className="text-center mb-6">
                        <h3 className="text-lg font-semibold text-cyan-400 mb-2">
                            ✨ Own Your Space in WaddleBet ✨
                        </h3>
                        <p className="text-slate-400 text-sm">
                            Rent an igloo and unlock powerful features for your brand, community, or project.
                        </p>
                    </div>
                    
                    {/* Benefits Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {benefits.map((benefit, index) => (
                            <div 
                                key={index}
                                className="bg-slate-700/40 rounded-xl p-3 border border-slate-600/50 hover:border-cyan-500/50 transition-colors group"
                            >
                                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                                    {benefit.icon}
                                </div>
                                <h4 className="text-white font-semibold text-sm mb-1">
                                    {benefit.title}
                                </h4>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    {benefit.description}
                                </p>
                            </div>
                        ))}
                    </div>
                    
                    {/* Quick Stats */}
                    <div className="bg-slate-800/60 rounded-xl p-4 mb-6 border border-slate-700/50">
                        <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
                            Rental Details
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Daily Rent:</span>
                                <span className="text-yellow-400 font-mono">
                                    {IGLOO_CONFIG.DAILY_RENT_CPW3?.toLocaleString()} $WADDLE
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Min Balance:</span>
                                <span className="text-cyan-400 font-mono">
                                    {IGLOO_CONFIG.MINIMUM_BALANCE_CPW3?.toLocaleString()} $WADDLE
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Grace Period:</span>
                                <span className="text-red-400 font-mono">
                                    {IGLOO_CONFIG.GRACE_PERIOD_HOURS}h
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Payment:</span>
                                <span className="text-purple-400 font-mono">
                                    x402 Protocol
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Social Proof / Trust */}
                    <div className="text-center mb-4">
                        <p className="text-slate-500 text-xs">
                            🔒 Secure payments via x402 • 💜 Join the WaddleBet community
                        </p>
                    </div>
                </div>
                
                {/* Sticky Footer with CTAs */}
                <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-700/50 space-y-3">
                    {/* Primary CTA - Buy */}
                    <button
                        onClick={onRent}
                        disabled={!walletAddress}
                        className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all duration-300 ${
                            !walletAddress
                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-emerald-500 via-cyan-500 to-purple-500 text-white hover:from-emerald-400 hover:via-cyan-400 hover:to-purple-400 shadow-lg hover:shadow-cyan-500/30 hover:scale-[1.02]'
                        }`}
                    >
                        {!walletAddress ? (
                            '🔌 Connect Wallet to Rent'
                        ) : (
                            <>🏠 I Want to Rent!</>
                        )}
                    </button>
                    
                    {/* Secondary CTA - Preview */}
                    <button
                        onClick={onPreview}
                        className="w-full py-3 rounded-xl font-semibold text-sm bg-slate-700/60 text-slate-300 hover:bg-slate-600/80 hover:text-white border border-slate-600/50 hover:border-slate-500 transition-all duration-200"
                    >
                        👀 I Want to See Inside (Demo)
                    </button>
                    
                    {/* Tertiary - Cancel */}
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-slate-500 hover:text-slate-400 text-sm transition-colors"
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IglooDetailsPanel;


