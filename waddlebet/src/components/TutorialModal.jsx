/**
 * TutorialModal - Welcome tutorial for new players
 * 
 * Shows on first login and explains:
 * - How to interact with other players
 * - Wagering system
 * - Pebbles currency
 * - Cosmetic marketplace
 * - Spaces
 * - Social features
 */

import React, { useState, useEffect, useRef } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';

const TUTORIAL_STORAGE_KEY = 'waddlebet_tutorial_dismissed';

// Tutorial slides data
const TUTORIAL_SLIDES = [
    {
        id: 'welcome',
        title: '🐧 Welcome to Waddle.bet!',
        icon: '👋',
        content: (
            <div className="space-y-3">
                <p className="text-white/90">
                    Welcome to <span className="text-cyan-400 font-bold">waddle.bet</span> - the ultimate social wagering platform inspired by Club Penguin! 
                    A world where you can 
                    <span className="text-cyan-400 font-bold"> socialize</span>, 
                    <span className="text-green-400 font-bold"> wager</span>, 
                    <span className="text-purple-400 font-bold"> collect</span>, and 
                    <span className="text-amber-400 font-bold"> explore</span>.
                </p>
                <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg p-3 border border-white/10">
                    <p className="text-sm text-white/80">
                        💡 <strong>Pro tip:</strong> Use <kbd className="px-1.5 py-0.5 bg-black/50 rounded text-xs">WASD</kbd> or arrow keys to move, 
                        <kbd className="px-1.5 py-0.5 bg-black/50 rounded text-xs mx-1">Enter</kbd> to chat!
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'wager',
        title: '⚔️ Wager ANY Solana Token',
        icon: '🎮',
        content: (
            <div className="space-y-3">
                <p className="text-white/90">
                    <strong className="text-cyan-400">Click on any player</strong> to challenge them to games - and here's the innovation:
                </p>
                <div className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg p-3 border border-green-500/30">
                    <div className="text-green-400 font-bold text-center mb-2">🚀 WAGER ANY SPL TOKEN</div>
                    <p className="text-white/80 text-sm text-center">
                        SOL, $WADDLE, memecoins, stablecoins - <strong>any Solana token</strong> can be wagered!
                    </p>
                    <p className="text-white/60 text-xs text-center mt-1">
                        First platform ever to enable wagering with any SPL token.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-black/30 rounded-lg p-2 border border-amber-500/30">
                        <div className="text-amber-400 font-bold mb-1">🪙 Gold Wagers</div>
                        <p className="text-white/70 text-xs">Practice with in-game gold - no real value at stake!</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-2 border border-purple-500/30">
                        <div className="text-purple-400 font-bold mb-1">🎰 SPL Wagers</div>
                        <p className="text-white/70 text-xs">Wager real tokens - SOL, memes, anything on Solana!</p>
                    </div>
                </div>
                <p className="text-xs text-white/50 italic text-center">
                    All SPL wagers are provably fair with on-chain verification.
                </p>
            </div>
        )
    },
    {
        id: 'pebbles',
        title: '🪨 Pebbles - Premium Currency',
        icon: '💎',
        content: (
            <div className="space-y-3">
                <p className="text-white/90">
                    <strong className="text-purple-400">Pebbles</strong> are the premium currency that powers the economy!
                </p>
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🎰</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm">Gacha Rolls</div>
                            <p className="text-white/60 text-xs">Spend 100 Pebbles per roll for rare cosmetics!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🏪</span>
                        <div>
                            <div className="text-cyan-400 font-bold text-sm">Marketplace Trading</div>
                            <p className="text-white/60 text-xs">Buy and sell cosmetics with other players!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">💸</span>
                        <div>
                            <div className="text-green-400 font-bold text-sm">Cash Out Anytime</div>
                            <p className="text-white/60 text-xs">Convert Pebbles back to SOL (5% withdrawal fee)</p>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-center text-purple-300/80 font-medium">
                    1 SOL = 1,000 Pebbles • Trade smart, profit real!
                </p>
            </div>
        )
    },
    {
        id: 'cosmetics',
        title: '✨ Cosmetics & Marketplace',
        icon: '👗',
        content: (
            <div className="space-y-3">
                <p className="text-white/90">
                    Collect <strong className="text-pink-400">unique cosmetics</strong> through gacha rolls and trade them on the open market!
                </p>
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="bg-gray-500/20 rounded p-1.5 border border-gray-500/30">
                        <div className="text-gray-400">Common</div>
                    </div>
                    <div className="bg-green-500/20 rounded p-1.5 border border-green-500/30">
                        <div className="text-green-400">Uncommon</div>
                    </div>
                    <div className="bg-blue-500/20 rounded p-1.5 border border-blue-500/30">
                        <div className="text-blue-400">Rare</div>
                    </div>
                    <div className="bg-purple-500/20 rounded p-1.5 border border-purple-500/30">
                        <div className="text-purple-400">Epic</div>
                    </div>
                    <div className="bg-amber-500/20 rounded p-1.5 border border-amber-500/30">
                        <div className="text-amber-400">Legendary</div>
                    </div>
                    <div className="bg-pink-500/20 rounded p-1.5 border border-pink-500/30">
                        <div className="text-pink-400">Mythic</div>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-amber-500/20 to-pink-500/20 rounded-lg p-2 border border-white/10">
                    <p className="text-xs text-white/80">
                        🏆 <strong>First Edition</strong> items (Serial #1-3) have <span className="text-amber-400">2x burn value</span> and are highly collectible!
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'spaces',
        title: '🏠 Spaces - Own & Monetize',
        icon: '🏔️',
        content: (
            <div className="space-y-3">
                <p className="text-white/90">
                    <strong className="text-cyan-400">Spaces</strong> are premium spaces you can rent or own - and monetize!
                </p>
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🏷️</span>
                        <div>
                            <div className="text-green-400 font-bold text-sm">Rent or Own</div>
                            <p className="text-white/60 text-xs">Secure your own space space in the metaverse</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🎟️</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm">Set Entry Fees</div>
                            <p className="text-white/60 text-xs">Charge visitors to enter - passive income!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">📺</span>
                        <div>
                            <div className="text-purple-400 font-bold text-sm">Banner Advertising</div>
                            <p className="text-white/60 text-xs">Shill your project with custom banners</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🔒</span>
                        <div>
                            <div className="text-cyan-400 font-bold text-sm">Paywall Content</div>
                            <p className="text-white/60 text-xs">Create exclusive paid experiences</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'tips',
        title: '🚀 Tips for Success',
        icon: '💡',
        content: (
            <div className="space-y-3">
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-gradient-to-r from-green-500/20 to-transparent rounded-lg p-2">
                        <span className="text-lg">💰</span>
                        <div>
                            <div className="text-green-400 font-bold text-sm">Start Small</div>
                            <p className="text-white/60 text-xs">Practice with gold wagers before going for SOL!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gradient-to-r from-purple-500/20 to-transparent rounded-lg p-2">
                        <span className="text-lg">🎰</span>
                        <div>
                            <div className="text-purple-400 font-bold text-sm">Roll Smart</div>
                            <p className="text-white/60 text-xs">Watch for rare drops - they can sell for big Pebbles!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gradient-to-r from-cyan-500/20 to-transparent rounded-lg p-2">
                        <span className="text-lg">🤝</span>
                        <div>
                            <div className="text-cyan-400 font-bold text-sm">Be Social</div>
                            <p className="text-white/60 text-xs">Make friends, find trading partners, build your reputation!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gradient-to-r from-amber-500/20 to-transparent rounded-lg p-2">
                        <span className="text-lg">📈</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm">Trade to Profit</div>
                            <p className="text-white/60 text-xs">Buy low, sell high - the marketplace is your playground!</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
];

export default function TutorialModal({ isOpen, onClose, forceShow = false }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [neverShowAgain, setNeverShowAgain] = useState(false);
    const [shouldShow, setShouldShow] = useState(false);
    const modalRef = useRef(null);
    
    // Check localStorage on mount
    useEffect(() => {
        const dismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (forceShow) {
            setShouldShow(true);
        } else if (!dismissed && isOpen) {
            setShouldShow(true);
        } else {
            setShouldShow(false);
        }
    }, [isOpen, forceShow]);
    
    // Handle close with checkbox
    const handleClose = () => {
        if (neverShowAgain) {
            localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
        }
        setShouldShow(false);
        onClose?.();
    };
    
    // Navigation
    const nextSlide = () => {
        if (currentSlide < TUTORIAL_SLIDES.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
    };
    
    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };
    
    const goToSlide = (index) => {
        setCurrentSlide(index);
    };
    
    // Hooks
    useClickOutside(modalRef, handleClose);
    useEscapeKey(handleClose);
    
    if (!shouldShow) return null;
    
    const slide = TUTORIAL_SLIDES[currentSlide];
    const isLastSlide = currentSlide === TUTORIAL_SLIDES.length - 1;
    const isFirstSlide = currentSlide === 0;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div 
                ref={modalRef}
                className="w-full max-w-lg bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
                {/* Header with progress */}
                <div className="relative bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 p-4">
                    {/* Animated background effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-pink-500/20 animate-pulse" />
                    
                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-3xl">{slide.icon}</span>
                                <h2 className="text-xl font-bold text-white">{slide.title}</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-white/70 hover:text-white transition-colors p-1"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        {/* Progress dots */}
                        <div className="flex items-center justify-center gap-1.5">
                            {TUTORIAL_SLIDES.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToSlide(index)}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                        index === currentSlide 
                                            ? 'bg-white w-6' 
                                            : index < currentSlide 
                                                ? 'bg-white/70' 
                                                : 'bg-white/30'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Content */}
                <div className="p-5 min-h-[280px]">
                    {slide.content}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black/30">
                    {/* Never show again checkbox */}
                    <label className="flex items-center gap-2 mb-4 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={neverShowAgain}
                            onChange={(e) => setNeverShowAgain(e.target.checked)}
                            className="w-4 h-4 rounded border-white/30 bg-black/50 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                            Don't show this again
                        </span>
                    </label>
                    
                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={prevSlide}
                            disabled={isFirstSlide}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                isFirstSlide 
                                    ? 'text-white/30 cursor-not-allowed' 
                                    : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            ← Previous
                        </button>
                        
                        <span className="text-sm text-white/40">
                            {currentSlide + 1} / {TUTORIAL_SLIDES.length}
                        </span>
                        
                        {isLastSlide ? (
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 rounded-lg font-bold text-sm bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white transition-all shadow-lg shadow-purple-500/25"
                            >
                                Let's Go! 🚀
                            </button>
                        ) : (
                            <button
                                onClick={nextSlide}
                                className="px-4 py-2 rounded-lg font-medium text-sm text-white bg-white/10 hover:bg-white/20 transition-all"
                            >
                                Next →
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Export helper to check if tutorial should show
export function shouldShowTutorial() {
    return !localStorage.getItem(TUTORIAL_STORAGE_KEY);
}

// Export helper to reset tutorial (for testing or settings)
export function resetTutorial() {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
}

