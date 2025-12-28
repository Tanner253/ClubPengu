/**
 * TokenomicsModal - $WADDLE Token Utility & Tokenomics Information
 */

import React, { useRef } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';

const TokenomicsModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    
    // Use shared hooks for click outside and escape key
    useClickOutside(modalRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);
    
    if (!isOpen) return null;
    
    const features = [
        { emoji: '👑', title: 'Whale Status Nametags', description: 'Your $WADDLE balance = your clout. 6 tiers from Standard to Legendary with animated effects.' },
        { emoji: '🎰', title: 'Casino & Slots', description: 'Spin slots with $WADDLE to win tradeable cosmetics. Common to Legendary drops.' },
        { emoji: '🏠', title: 'Igloo Ownership', description: 'Own or rent igloos. Sell your property on the open market to other players.' },
        { emoji: '👕', title: 'Tradeable Cosmetics', description: 'Every cosmetic is tradeable. Win rare items in slots, flip for profit.' },
        { emoji: '🎮', title: 'Universal Wagering', description: 'Wager ANY Solana token on PvP games. Tic-tac-toe, Connect 4, Card Jitsu.' },
        { emoji: '🤝', title: 'Cult Collabs', description: 'We partner with ALL Solana cults. Cross-community tournaments with massive prizes.' }
    ];

    const roadmapItems = [
        { phase: 'Phase 1', status: 'live', title: 'Foundation', items: ['Multiplayer World', 'P2P Wagering', 'Basic Minigames'] },
        { phase: 'Phase 2', status: 'building', title: 'Economy', items: ['Casino Launch', 'Igloo System', 'Cosmetic Drops'] },
        { phase: 'Phase 3', status: 'soon', title: 'Expansion', items: ['Building Ownership', 'DAO Governance', 'Mobile App'] },
        { phase: 'Phase 4', status: 'future', title: 'Metaverse', items: ['Cross-chain Support', 'VR Integration', 'Creator Tools'] }
    ];
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
            <div 
                ref={modalRef}
                className="relative bg-gradient-to-br from-[#0a0a1a] via-[#111128] to-[#0d1a2d] rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative flex items-center justify-between p-4 sm:p-6 pb-2 shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="text-3xl sm:text-4xl animate-bounce-slow">🐧</div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                                $WADDLE TOKENOMICS
                            </h2>
                            <p className="text-white/50 text-xs sm:text-sm">The Future of WaddleBet on Solana</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors w-10 h-10 flex items-center justify-center text-xl rounded-full hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="relative flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6 overscroll-contain">
                    
                    {/* Hero Banner */}
                    <div className="relative bg-gradient-to-r from-cyan-600/30 via-blue-600/30 to-purple-600/30 rounded-xl p-4 sm:p-6 border border-white/10">
                        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">🚀 Web3 Meets Nostalgia</h3>
                        <p className="text-white/70 text-sm sm:text-base leading-relaxed">
                            Remember the OG Club Penguin? We're bringing it back, but this time <span className="text-cyan-400 font-bold">YOU</span> own everything. 
                            Powered by <span className="text-purple-400 font-bold">Solana</span>, secured by <span className="text-green-400 font-bold">x402</span>.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold border border-green-500/30">✓ P2P PAYMENTS</span>
                            <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold border border-purple-500/30">✓ DECENTRALIZED</span>
                            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-bold border border-cyan-500/30">✓ COMMUNITY OWNED</span>
                        </div>
                    </div>
                    
                    {/* Token Utility */}
                    <div>
                        <h3 className="text-white font-bold text-base sm:text-lg mb-3 flex items-center gap-2">
                            <span className="text-2xl">💎</span>
                            <span>$WADDLE Utility</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {features.map((feature, idx) => (
                                <div key={idx} className="bg-white/5 hover:bg-white/10 rounded-xl p-3 sm:p-4 border border-white/5 hover:border-cyan-500/30 transition-all group">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl group-hover:scale-110 transition-transform">{feature.emoji}</span>
                                        <div>
                                            <h4 className="text-white font-bold text-sm">{feature.title}</h4>
                                            <p className="text-white/50 text-xs mt-1 leading-relaxed">{feature.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Wagering Highlight */}
                    <div className="relative bg-gradient-to-r from-orange-600/20 via-red-600/20 to-pink-600/20 rounded-xl p-4 sm:p-5 border border-orange-500/30">
                        <h3 className="text-lg sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400 mb-2">
                            🔥 WAGER ANY SOLANA TOKEN
                        </h3>
                        <p className="text-white/70 text-sm leading-relaxed mb-3">
                            Tired of tokens with no utility? Bring them here. <span className="text-orange-400 font-bold">$BONK</span>, 
                            <span className="text-purple-400 font-bold"> $WIF</span>, <span className="text-green-400 font-bold">$POPCAT</span> - 
                            every cult token becomes a gambling chip.
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-orange-500/30 text-orange-300 rounded-lg">🎯 Tic-Tac-Toe</span>
                            <span className="px-2 py-1 bg-red-500/30 text-red-300 rounded-lg">🔴 Connect 4</span>
                            <span className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded-lg">⚔️ Card Jitsu</span>
                            <span className="px-2 py-1 bg-pink-500/30 text-pink-300 rounded-lg">🎰 Casino Games</span>
                        </div>
                    </div>
                    
                    {/* Whale Status Tiers */}
                    <div className="bg-gradient-to-br from-yellow-900/20 to-purple-900/20 rounded-xl p-4 border border-yellow-500/20">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <span className="text-2xl">👑</span>
                            <span>Whale Status Tiers</span>
                        </h3>
                        <p className="text-white/60 text-sm mb-3">
                            Your $WADDLE balance determines your in-game clout. Bigger bags = fancier nametags.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                                { name: 'Standard', balance: '0-999', color: 'text-slate-400' },
                                { name: 'Bronze', balance: '1K-10K', color: 'text-amber-600' },
                                { name: 'Silver', balance: '10K-100K', color: 'text-slate-300' },
                                { name: 'Gold', balance: '100K-1M', color: 'text-yellow-400' },
                                { name: 'Diamond', balance: '1M-10M', color: 'text-cyan-300' },
                                { name: 'Legendary', balance: '10M+', color: 'text-purple-400' }
                            ].map((tier, idx) => (
                                <div key={idx} className="bg-black/30 rounded-lg p-2 border border-white/5">
                                    <div className={`font-bold text-sm ${tier.color}`}>{tier.name}</div>
                                    <div className="text-white/40 text-[10px]">{tier.balance}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Cult Partnerships */}
                    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/20">
                        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                            <span className="text-2xl">🤝</span>
                            <span>Cult Partnerships</span>
                        </h3>
                        <p className="text-white/60 text-sm mb-3">
                            We're collaborating with every Solana community. Bring your cult, bring your tokens, let's build together.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {['🐕 DOG CULTS', '🐱 CAT CULTS', '🐸 FROG CULTS', '🎭 MEME CULTS', '🎮 GAMING CULTS', '💀 DEGEN CULTS'].map((cult, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/70 hover:text-white transition-colors cursor-pointer border border-white/5 hover:border-purple-500/30">
                                    {cult}
                                </span>
                            ))}
                        </div>
                    </div>
                    
                    {/* Roadmap */}
                    <div>
                        <h3 className="text-white font-bold text-base sm:text-lg mb-3 flex items-center gap-2">
                            <span className="text-2xl">🗺️</span>
                            <span>Roadmap</span>
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
                                        {item.phase}
                                    </div>
                                    <div className="text-white font-bold text-sm mb-1">{item.title}</div>
                                    <div className="space-y-0.5">
                                        {item.items.map((subItem, subIdx) => (
                                            <div key={subIdx} className="text-white/40 text-[10px]">• {subItem}</div>
                                        ))}
                                    </div>
                                    <div className={`mt-2 text-[10px] font-bold uppercase ${
                                        item.status === 'live' ? 'text-green-400' :
                                        item.status === 'building' ? 'text-yellow-400' :
                                        item.status === 'soon' ? 'text-cyan-400' :
                                        'text-white/30'
                                    }`}>
                                        {item.status === 'live' ? '✓ LIVE' :
                                         item.status === 'building' ? '🔨 BUILDING' :
                                         item.status === 'soon' ? '⏳ SOON' : '🔮 FUTURE'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Call to Action */}
                    <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-xl p-4 text-center border border-cyan-500/20">
                        <h3 className="text-xl font-black text-white mb-2">🌊 JOIN THE WADDLE</h3>
                        <p className="text-white/60 text-sm mb-4">Be early. Build with us. The game-fi meta is here.</p>
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                            <a 
                                href="https://dexscreener.com/solana/5yfmefzrompokc2r9j8b1mzqututhywr9vrqmsxhzd3r"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95"
                            >
                                📈 View Chart
                            </a>
                            <a 
                                href="https://x.com/oSKNYo_dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-white rounded-lg font-bold text-sm transition-all hover:scale-105 active:scale-95"
                            >
                                🐦 Follow Us
                            </a>
                        </div>
                    </div>
                    
                    <div className="h-4" />
                </div>
                
                {/* Footer */}
                <div className="relative p-4 shrink-0 border-t border-white/5 bg-black/30">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-xl font-bold text-sm transition-all hover:shadow-lg hover:shadow-cyan-500/20"
                    >
                        LFG 🚀
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TokenomicsModal;
