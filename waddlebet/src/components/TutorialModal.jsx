/**
 * TutorialModal - Welcome tutorial for new players
 * 
 * Shows on first login and explains:
 * - How to interact with other players
 * - Wagering system
 * - Pebbles currency
 * - Cosmetic marketplace
 * - Igloos
 * - Social features
 */

import React, { useState, useEffect, useRef } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';

const TUTORIAL_STORAGE_KEY = 'clubpenguin_tutorial_dismissed';

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
                        💡 Swipe through this guide to learn everything you need to know!
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'controls',
        title: '🎮 Controls & Movement',
        icon: '⌨️',
        content: (
            <div className="space-y-3">
                <p className="text-white/90 text-sm">
                    Master these controls to navigate the world:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-black/40 rounded-lg p-2 border border-cyan-500/30">
                        <div className="text-cyan-400 font-bold mb-1">🚶 Movement</div>
                        <div className="text-white/70 space-y-0.5">
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">WASD</kbd> Move around</div>
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">Space</kbd> Jump</div>
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">Mouse</kbd> Rotate camera</div>
                        </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-2 border border-pink-500/30">
                        <div className="text-pink-400 font-bold mb-1">❄️ Snowballs</div>
                        <div className="text-white/70 space-y-0.5">
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">Shift</kbd> Hold to aim</div>
                            <div>Release to throw!</div>
                            <div className="text-white/50 italic">Hit other penguins!</div>
                        </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-2 border border-amber-500/30">
                        <div className="text-amber-400 font-bold mb-1">💬 Social</div>
                        <div className="text-white/70 space-y-0.5">
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">Enter</kbd> Open chat</div>
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">T</kbd> Emote wheel</div>
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">1-7</kbd> Quick emotes</div>
                        </div>
                    </div>
                    <div className="bg-black/40 rounded-lg p-2 border border-green-500/30">
                        <div className="text-green-400 font-bold mb-1">🎯 Interact</div>
                        <div className="text-white/70 space-y-0.5">
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">Click</kbd> on players</div>
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">Click</kbd> on objects</div>
                            <div><kbd className="px-1 bg-black/50 rounded text-[10px]">E</kbd> Enter portals</div>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'earn-gold',
        title: '💰 Ways to Earn Gold',
        icon: '🪙',
        content: (
            <div className="space-y-3">
                <p className="text-white/90 text-sm">
                    <strong className="text-amber-400">Gold</strong> is the in-game currency. Here's how to earn it:
                </p>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-blue-500/30">
                        <span className="text-lg">🎣</span>
                        <div className="flex-1">
                            <div className="text-blue-400 font-bold text-sm">Ice Fishing</div>
                            <p className="text-white/60 text-xs">Catch fish at fishing holes - earn 10-500 gold per catch!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-purple-500/30">
                        <span className="text-lg">🎰</span>
                        <div className="flex-1">
                            <div className="text-purple-400 font-bold text-sm">Slot Machines</div>
                            <p className="text-white/60 text-xs">Try your luck at the Casino - hit jackpots!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-green-500/30">
                        <span className="text-lg">📅</span>
                        <div className="flex-1">
                            <div className="text-green-400 font-bold text-sm">Daily Bonus</div>
                            <p className="text-white/60 text-xs">Login daily for free gold - streaks give more!</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-cyan-500/30">
                        <span className="text-lg">⚔️</span>
                        <div className="flex-1">
                            <div className="text-cyan-400 font-bold text-sm">Win Wagers</div>
                            <p className="text-white/60 text-xs">Challenge players to gold wagers and win!</p>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-white/50 text-center italic">
                    Gold has no real value - it's for fun and practice!
                </p>
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
                    <strong className="text-cyan-400">Click on any player</strong> to challenge them to games!
                </p>
                <div className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg p-3 border border-green-500/30">
                    <div className="text-green-400 font-bold text-center mb-2">🚀 WAGER ANY SPL TOKEN</div>
                    <p className="text-white/80 text-sm text-center">
                        SOL, $CP, memecoins, stablecoins - <strong>any Solana token</strong>!
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-black/30 rounded-lg p-2 border border-amber-500/30">
                        <div className="text-amber-400 font-bold mb-1">🪙 Gold Wagers</div>
                        <p className="text-white/70 text-xs">Practice with in-game gold - no real value!</p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-2 border border-purple-500/30">
                        <div className="text-purple-400 font-bold mb-1">🎰 SPL Wagers</div>
                        <p className="text-white/70 text-xs">Wager real tokens - play for keeps!</p>
                    </div>
                </div>
                <div className="bg-black/30 rounded-lg p-2 text-center">
                    <p className="text-white/60 text-xs">
                        🎲 Games: <span className="text-white/80">Rock Paper Scissors</span> • <span className="text-white/80">Blackjack</span> • <span className="text-white/80">Coin Flip</span> • <span className="text-white/80">Higher/Lower</span>
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'pebbles',
        title: '🪨 Pebbles - Premium Currency',
        icon: '💎',
        content: (
            <div className="space-y-3">
                <p className="text-white/90 text-sm">
                    <strong className="text-purple-400">Pebbles</strong> are the premium currency backed by real SOL!
                </p>
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">💳</span>
                        <div>
                            <div className="text-cyan-400 font-bold text-sm">Deposit SOL</div>
                            <p className="text-white/60 text-xs">Convert SOL to Pebbles (1 SOL = 1,000 Pebbles)</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🎰</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm">Gacha Rolls</div>
                            <p className="text-white/60 text-xs">100 Pebbles per roll - win rare cosmetics!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🏪</span>
                        <div>
                            <div className="text-pink-400 font-bold text-sm">Marketplace</div>
                            <p className="text-white/60 text-xs">Buy & sell cosmetics with other players!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">💸</span>
                        <div>
                            <div className="text-green-400 font-bold text-sm">Withdraw Anytime</div>
                            <p className="text-white/60 text-xs">Cash out to SOL (5% fee) - real value!</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'cosmetics',
        title: '✨ Cosmetics & Gacha',
        icon: '👗',
        content: (
            <div className="space-y-3">
                <p className="text-white/90 text-sm">
                    Collect <strong className="text-pink-400">unique cosmetics</strong> through gacha rolls!
                </p>
                <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="bg-gray-500/20 rounded p-1 border border-gray-500/30">
                        <div className="text-gray-400 text-[10px]">Common</div>
                    </div>
                    <div className="bg-green-500/20 rounded p-1 border border-green-500/30">
                        <div className="text-green-400 text-[10px]">Uncommon</div>
                    </div>
                    <div className="bg-blue-500/20 rounded p-1 border border-blue-500/30">
                        <div className="text-blue-400 text-[10px]">Rare</div>
                    </div>
                    <div className="bg-purple-500/20 rounded p-1 border border-purple-500/30">
                        <div className="text-purple-400 text-[10px]">Epic</div>
                    </div>
                    <div className="bg-amber-500/20 rounded p-1 border border-amber-500/30">
                        <div className="text-amber-400 text-[10px]">Legendary</div>
                    </div>
                    <div className="bg-pink-500/20 rounded p-1 border border-pink-500/30">
                        <div className="text-pink-400 text-[10px]">Mythic</div>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-amber-500/20 to-pink-500/20 rounded-lg p-2 border border-white/10 text-xs">
                    <p className="text-white/80">
                        🏆 <strong>First Edition</strong> (Serial #1-3) = <span className="text-amber-400">2x burn value</span>
                    </p>
                    <p className="text-white/60 mt-1">
                        💡 Equip cosmetics from your inventory to customize your penguin!
                    </p>
                </div>
                <div className="bg-black/30 rounded-lg p-2 text-center">
                    <p className="text-white/60 text-xs">
                        🎁 <span className="text-white/80">Hats</span> • <span className="text-white/80">Faces</span> • <span className="text-white/80">Necks</span> • <span className="text-white/80">Bodies</span> • <span className="text-white/80">Hands</span> • <span className="text-white/80">Feet</span>
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'puffles',
        title: '🐾 Puffles - Your Pet Companion',
        icon: '🟣',
        content: (
            <div className="space-y-3">
                <p className="text-white/90 text-sm">
                    <strong className="text-pink-400">Puffles</strong> are adorable pets that follow you around!
                </p>
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🏪</span>
                        <div>
                            <div className="text-cyan-400 font-bold text-sm">Puffle Shop</div>
                            <p className="text-white/60 text-xs">Buy puffles of different colors and rarities</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🏋️</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm">Train Your Puffle</div>
                            <p className="text-white/60 text-xs">Play minigames to level up your puffle!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🍎</span>
                        <div>
                            <div className="text-green-400 font-bold text-sm">Feed & Care</div>
                            <p className="text-white/60 text-xs">Keep your puffle happy with food from vending machines</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">👑</span>
                        <div>
                            <div className="text-purple-400 font-bold text-sm">Rare Puffles</div>
                            <p className="text-white/60 text-xs">Collect legendary puffles for status!</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'minigames',
        title: '🎮 Mini-Games & Casino',
        icon: '🎲',
        content: (
            <div className="space-y-3">
                <p className="text-white/90 text-sm">
                    Explore the world and find fun activities everywhere!
                </p>
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🎣</span>
                        <div>
                            <div className="text-blue-400 font-bold text-sm">Ice Fishing</div>
                            <p className="text-white/60 text-xs">Click fishing holes - catch fish for gold!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🎰</span>
                        <div>
                            <div className="text-purple-400 font-bold text-sm">Casino Slots</div>
                            <p className="text-white/60 text-xs">Spin for gold - match symbols for jackpots!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🃏</span>
                        <div>
                            <div className="text-green-400 font-bold text-sm">Card Games</div>
                            <p className="text-white/60 text-xs">Blackjack tables in the Casino - wager gold or tokens!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🕹️</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm">Arcade Games</div>
                            <p className="text-white/60 text-xs">Click arcade machines - Thin Ice, Pong & more!</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'igloos',
        title: '🏠 Igloos - Own & Monetize',
        icon: '🏔️',
        content: (
            <div className="space-y-3">
                <p className="text-white/90 text-sm">
                    <strong className="text-cyan-400">Igloos</strong> are premium spaces you can own and monetize!
                </p>
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🏷️</span>
                        <div>
                            <div className="text-green-400 font-bold text-sm">Rent or Own</div>
                            <p className="text-white/60 text-xs">Secure your own igloo in the metaverse</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🎟️</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm">Set Entry Fees</div>
                            <p className="text-white/60 text-xs">Charge visitors - passive income!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">📺</span>
                        <div>
                            <div className="text-purple-400 font-bold text-sm">Advertising</div>
                            <p className="text-white/60 text-xs">Display custom banners for your project</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                        <span className="text-lg">🔒</span>
                        <div>
                            <div className="text-cyan-400 font-bold text-sm">Exclusive Content</div>
                            <p className="text-white/60 text-xs">Create paywalled experiences</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        id: 'referrals',
        title: '🔗 Referral Program',
        icon: '💸',
        content: (
            <div className="space-y-3">
                <p className="text-white/90 text-sm">
                    <strong className="text-green-400">Earn real SOL</strong> by inviting friends!
                </p>
                <div className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg p-3 border border-green-500/30">
                    <div className="text-center">
                        <div className="text-green-400 font-bold">💰 15% Revenue Share</div>
                        <p className="text-white/70 text-xs mt-1">
                            Earn 15% of the Pebbles your friends spend on gacha!
                        </p>
                    </div>
                </div>
                <div className="space-y-2 text-xs">
                    <div className="flex justify-between bg-black/30 rounded-lg p-2">
                        <span className="text-white/60">Tier 1 (Direct)</span>
                        <span className="text-green-400 font-bold">15% earnings</span>
                    </div>
                    <div className="flex justify-between bg-black/30 rounded-lg p-2">
                        <span className="text-white/60">Tier 2 (Indirect)</span>
                        <span className="text-cyan-400 font-bold">3% earnings</span>
                    </div>
                </div>
                <div className="bg-amber-500/20 rounded-lg p-2 border border-amber-500/30 text-center">
                    <p className="text-amber-400 text-xs font-bold">
                        🎁 LIMITED TIME: Both you and your friend get 1,000 $CP!
                    </p>
                    <p className="text-white/60 text-[10px] mt-1">
                        (Friend must connect wallet & play 1 hour)
                    </p>
                </div>
            </div>
        )
    },
    {
        id: 'tips',
        title: '🚀 Ready to Waddle!',
        icon: '💡',
        content: (
            <div className="space-y-3">
                <div className="space-y-2">
                    <div className="flex items-start gap-2 bg-gradient-to-r from-green-500/20 to-transparent rounded-lg p-2">
                        <span className="text-lg">💰</span>
                        <div>
                            <div className="text-green-400 font-bold text-sm">Start with Gold</div>
                            <p className="text-white/60 text-xs">Practice wagers with gold before real tokens!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gradient-to-r from-purple-500/20 to-transparent rounded-lg p-2">
                        <span className="text-lg">🎰</span>
                        <div>
                            <div className="text-purple-400 font-bold text-sm">Roll Gacha Smart</div>
                            <p className="text-white/60 text-xs">Rare drops sell for big Pebbles on marketplace!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gradient-to-r from-cyan-500/20 to-transparent rounded-lg p-2">
                        <span className="text-lg">🤝</span>
                        <div>
                            <div className="text-cyan-400 font-bold text-sm">Be Social</div>
                            <p className="text-white/60 text-xs">Make friends, trade, throw snowballs!</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2 bg-gradient-to-r from-amber-500/20 to-transparent rounded-lg p-2">
                        <span className="text-lg">📈</span>
                        <div>
                            <div className="text-amber-400 font-bold text-sm">Invite Friends</div>
                            <p className="text-white/60 text-xs">Share your referral link and earn SOL!</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 rounded-lg p-2 text-center border border-white/10">
                    <p className="text-white/80 text-sm font-bold">
                        🐧 Have fun and waddle on!
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                        Settings → Tutorial to view this again anytime
                    </p>
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
    
    // Check localStorage and determine if should show
    useEffect(() => {
        const dismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (forceShow && isOpen) {
            // Force show from settings - always show
            setShouldShow(true);
            setCurrentSlide(0); // Reset to first slide
        } else if (!dismissed && isOpen) {
            // First time user - auto show
            setShouldShow(true);
            setCurrentSlide(0);
        } else if (!isOpen) {
            // Modal was closed
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

