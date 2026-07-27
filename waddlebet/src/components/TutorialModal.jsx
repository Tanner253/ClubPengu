/**
 * TutorialModal - Welcome tutorial for new players (multichain: $WADDLE + $CP)
 *
 * Guests default to the Robinhood / $WADDLE visual rail via useChainEconomy.
 * Copy mentions both platform tokens with $WADDLE as the flagship.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useChainEconomy } from '../hooks/useChainEconomy.js';
import { getWaddleEthBlockExplorerUrl, WADDLE_ETH_CONTRACT } from '../config/evm.js';
import { CPW3_TOKEN_ADDRESS } from '../config/solana.js';

const TUTORIAL_STORAGE_KEY = 'clubpenguin_tutorial_dismissed';
const WHITEPAPER_MULTICHAIN_URL = 'https://whitepaper.waddle.bet/#multichain';
const CP_JUPITER_URL = `https://jup.ag/swap/SOL-${CPW3_TOKEN_ADDRESS}`;

function buildTutorialSlides({ isEvm, canUsePebblesRail, canReferralPayout }) {
    return [
        {
            id: 'welcome',
            title: '🐧 Welcome to Waddle.bet!',
            icon: '👋',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90">
                        Welcome to <span className="text-emerald-400 font-bold">waddle.bet</span> — a multichain social world inspired by Club Penguin!
                        Explore, wager, collect, and grind with{' '}
                        <span className="text-emerald-400 font-bold">$WADDLE</span> on Robinhood Chain and{' '}
                        <span className="text-cyan-400 font-bold">$CP</span> on Solana.
                    </p>
                    <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg p-3 border border-emerald-500/30">
                        <p className="text-sm text-white/80">
                            <span className="text-emerald-300 font-bold">$WADDLE</span> is our flagship platform token on Robinhood Chain.
                            {' '}
                            <span className="text-cyan-300 font-bold">$CP</span> stays live on Solana with the full legacy economy.
                        </p>
                    </div>
                    <div className="bg-black/30 rounded-lg p-2 border border-white/10">
                        <p className="text-sm text-white/70">
                            💡 Swipe through this guide to learn the grind loop, tokens, and social features!
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: 'controls',
            title: '🎮 Controls & Movement',
            icon: '⌨️',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">Master these controls to navigate the world:</p>
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
            ),
        },
        {
            id: 'earn-gold',
            title: '💰 Gold & Grind Loop',
            icon: '🪙',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        <strong className="text-amber-400">Gold</strong> is scarce in-game currency on every chain. Earn it by grinding — not from chat or solo Dojo practice.
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-blue-500/30">
                            <span className="text-lg">🎣</span>
                            <div className="flex-1">
                                <div className="text-blue-400 font-bold text-sm">Fish → Sell</div>
                                <p className="text-white/60 text-xs">Catch fish (uses worms), then emergency-sell at Old Salty in Snow Forts.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-green-500/30">
                            <span className="text-lg">🪵</span>
                            <div className="flex-1">
                                <div className="text-green-400 font-bold text-sm">Wood → Mint</div>
                                <p className="text-white/60 text-xs">Chop forest trees, mint logs at Copper Clive in town (best wood→gold path).</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-amber-500/30">
                            <span className="text-lg">📋</span>
                            <div className="flex-1">
                                <div className="text-amber-400 font-bold text-sm">Daily Orders</div>
                                <p className="text-white/60 text-xs">Turn in fish/wood to Salty &amp; Clive for contractor gold bonuses (2/day).</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-emerald-500/30">
                            <span className="text-lg">🎁</span>
                            <div className="flex-1">
                                <div className="text-emerald-400 font-bold text-sm">Daily Bonus Streak</div>
                                <p className="text-white/60 text-xs">
                                    Play 60 min, claim a 7-day streak — <strong className="text-emerald-300">$WADDLE</strong> on Robinhood Chain or{' '}
                                    <strong className="text-cyan-300">$CP</strong> on Solana (same rules, chain-native payouts).
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 border border-cyan-500/30">
                            <span className="text-lg">⚔️</span>
                            <div className="flex-1">
                                <div className="text-cyan-400 font-bold text-sm">PvP Wagers</div>
                                <p className="text-white/60 text-xs">Win gold wagers vs other players (max 50g stake, zero-sum) on any chain.</p>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-white/50 text-center">
                        Backpack &amp; tool upgrades use <strong className="text-green-400">wood</strong>, not gold. Settings → Game Economy Guide for full details.
                    </p>
                </div>
            ),
        },
        {
            id: 'wager',
            title: '⚔️ Multichain Wagering',
            icon: '🎮',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        <strong className="text-cyan-400">Click on any player</strong> to challenge them to games!
                    </p>
                    <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-lg p-3 border border-emerald-500/30">
                        <div className="text-emerald-400 font-bold text-center mb-2">🚀 PLATFORM + MEMECOIN WAGERS</div>
                        <p className="text-white/80 text-sm text-center">
                            <strong className="text-emerald-300">$WADDLE</strong> leads on Robinhood Chain.
                            {' '}
                            <strong className="text-cyan-300">$CP</strong> &amp; SPL memecoins live on Solana today.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-black/30 rounded-lg p-2 border border-amber-500/30">
                            <div className="text-amber-400 font-bold mb-1">🪙 Gold Wagers</div>
                            <p className="text-white/70 text-xs">Practice with in-game gold on any chain — no on-chain value!</p>
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 border border-emerald-500/30">
                            <div className="text-emerald-400 font-bold mb-1">💎 $WADDLE / $CP</div>
                            <p className="text-white/70 text-xs">
                                $WADDLE token wagers on Robinhood Chain ship next. $CP &amp; SPL wagers live on Solana now.
                            </p>
                        </div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-2 text-center">
                        <p className="text-white/60 text-xs">
                            🎲 Games: <span className="text-white/80">Card Jitsu</span> • <span className="text-white/80">Connect 4</span> • <span className="text-white/80">Blackjack</span> • <span className="text-white/80">Monopoly</span> • <span className="text-white/80">Uno</span>
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: 'platform-tokens',
            title: '🐧 $WADDLE & $CP Platform Tokens',
            icon: '🚀',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        WaddleBet runs on two chains. <strong className="text-emerald-400">$WADDLE</strong> is the flagship;{' '}
                        <strong className="text-cyan-400">$CP</strong> remains the Solana parallel with full utility.
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-start gap-2 bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/40">
                            <span className="text-lg">🪶</span>
                            <div>
                                <div className="text-emerald-400 font-bold text-sm">$WADDLE — Robinhood Chain (flagship)</div>
                                <p className="text-white/60 text-xs">Nametag tiers, daily bonus streak, and the next wave of on-chain economy features.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2 border border-cyan-500/30">
                            <span className="text-lg">◎</span>
                            <div>
                                <div className="text-cyan-400 font-bold text-sm">$CP — Solana (parallel)</div>
                                <p className="text-white/60 text-xs">Whale nametags, igloo rent, SPL wagers, pebbles rail, referrals, and NFT minting today.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2 border border-amber-500/30">
                            <span className="text-lg">👑</span>
                            <div>
                                <div className="text-amber-400 font-bold text-sm">Diamond Flippers</div>
                                <p className="text-white/60 text-xs">Hold $WADDLE on Robinhood or $CP on Solana for Bronze → Legendary nametag tiers.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <a
                            href={getWaddleEthBlockExplorerUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-lg font-bold text-sm text-center transition-all hover:scale-[1.02] active:scale-95"
                        >
                            📈 $WADDLE on Blockscout
                        </a>
                        <div className="flex gap-2">
                            <a
                                href={WHITEPAPER_MULTICHAIN_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white rounded-lg font-bold text-sm text-center transition-all"
                            >
                                📄 Whitepaper
                            </a>
                            <a
                                href={CP_JUPITER_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg font-bold text-sm text-center transition-all"
                            >
                                🪐 Buy $CP
                            </a>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-lg p-2 border border-emerald-500/20">
                        <div className="text-white/50 text-[10px] uppercase tracking-wider mb-1">$WADDLE Contract (Robinhood Chain)</div>
                        <div className="flex items-center gap-2">
                            <code className="text-emerald-400 text-[10px] break-all flex-1 font-mono">{WADDLE_ETH_CONTRACT}</code>
                            <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(WADDLE_ETH_CONTRACT)}
                                className="text-white/50 hover:text-white text-xs px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors"
                            >
                                📋
                            </button>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'pebbles',
            title: '🪨 Pebbles - Premium Currency',
            icon: '💎',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        <strong className="text-purple-400">Pebbles</strong> are the premium currency for gacha and the Cosmetic Bazaar.
                    </p>
                    {canUsePebblesRail ? (
                        <div className="space-y-2">
                            <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                                <span className="text-lg">💳</span>
                                <div>
                                    <div className="text-cyan-400 font-bold text-sm">Deposit SOL (Solana)</div>
                                    <p className="text-white/60 text-xs">Convert SOL to Pebbles (1 SOL = 1,000 Pebbles)</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                                <span className="text-lg">🎰</span>
                                <div>
                                    <div className="text-amber-400 font-bold text-sm">Gacha Rolls</div>
                                    <p className="text-white/60 text-xs">100 Pebbles per roll — win rare cosmetics!</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                                <span className="text-lg">🏪</span>
                                <div>
                                    <div className="text-pink-400 font-bold text-sm">Cosmetic Bazaar</div>
                                    <p className="text-white/60 text-xs">Buy &amp; sell cosmetics with Pebbles — separate from the gold grind!</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-violet-500/10 rounded-lg p-3 border border-violet-500/30 text-sm text-white/70">
                            Pebbles on Robinhood Chain (ETH-backed) are <strong className="text-violet-300">coming soon</strong>.
                            The full pebbles rail — gacha, marketplace, withdrawals — is live on Solana with $CP today.
                        </div>
                    )}
                    <p className="text-xs text-white/50 text-center">
                        MetaMask / $WADDLE accounts unlock pebbles when the ETH rail ships. Phantom / $CP keeps the full rail now.
                    </p>
                </div>
            ),
        },
        {
            id: 'cosmetics',
            title: '✨ Cosmetics & Gacha',
            icon: '👗',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        Collect <strong className="text-pink-400">unique cosmetics</strong> through gacha rolls (Pebbles on Solana today)!
                    </p>
                    <div className="grid grid-cols-3 gap-1 text-center text-xs">
                        <div className="bg-gray-500/20 rounded p-1 border border-gray-500/30"><div className="text-gray-400 text-[10px]">Common</div></div>
                        <div className="bg-green-500/20 rounded p-1 border border-green-500/30"><div className="text-green-400 text-[10px]">Uncommon</div></div>
                        <div className="bg-blue-500/20 rounded p-1 border border-blue-500/30"><div className="text-blue-400 text-[10px]">Rare</div></div>
                        <div className="bg-purple-500/20 rounded p-1 border border-purple-500/30"><div className="text-purple-400 text-[10px]">Epic</div></div>
                        <div className="bg-amber-500/20 rounded p-1 border border-amber-500/30"><div className="text-amber-400 text-[10px]">Legendary</div></div>
                        <div className="bg-pink-500/20 rounded p-1 border border-pink-500/30"><div className="text-pink-400 text-[10px]">Mythic</div></div>
                    </div>
                    <div className="bg-gradient-to-r from-amber-500/20 to-pink-500/20 rounded-lg p-2 border border-white/10 text-xs">
                        <p className="text-white/80">
                            🏆 <strong>First Edition</strong> (Serial #1-3) = <span className="text-amber-400">2x burn value</span>
                        </p>
                        <p className="text-white/60 mt-1">💡 Equip cosmetics from your inventory to customize your penguin!</p>
                    </div>
                </div>
            ),
        },
        {
            id: 'nfts',
            title: '🎨 Mint Cosmetics as NFTs',
            icon: '🖼️',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        Turn your cosmetics into <strong className="text-purple-400">Solana NFTs</strong> you truly own ($CP / Phantom accounts).
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2 border border-purple-500/30">
                            <span className="text-lg">📸</span>
                            <div>
                                <div className="text-purple-400 font-bold text-sm">Photo Booth</div>
                                <p className="text-white/60 text-xs">Capture your penguin wearing the cosmetic — this becomes your NFT image!</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2 border border-cyan-500/30">
                            <span className="text-lg">⛓️</span>
                            <div>
                                <div className="text-cyan-400 font-bold text-sm">On-Chain Ownership</div>
                                <p className="text-white/60 text-xs">Minted via Metaplex on Solana — visible in your wallet &amp; on marketplaces</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/20 text-xs text-white/60">
                        Robinhood / $WADDLE NFT minting is on the roadmap. Solana $CP players can mint today.
                    </div>
                </div>
            ),
        },
        {
            id: 'puffles',
            title: '🐾 Puffles - Your Pet Companion',
            icon: '🟣',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        <strong className="text-pink-400">Puffles</strong> are adorable pets that follow you around — paid with gold on any chain!
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
                            <span className="text-lg">🍎</span>
                            <div>
                                <div className="text-green-400 font-bold text-sm">Feed &amp; Care</div>
                                <p className="text-white/60 text-xs">Keep your puffle happy with food from vending machines</p>
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'minigames',
            title: '🎮 Mini-Games & Casino',
            icon: '🎲',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">Explore the world and find fun activities everywhere!</p>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                            <span className="text-lg">🎣</span>
                            <div>
                                <div className="text-blue-400 font-bold text-sm">Ice Fishing</div>
                                <p className="text-white/60 text-xs">Fish go to your backpack — sell at Old Salty for gold.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                            <span className="text-lg">🎰</span>
                            <div>
                                <div className="text-purple-400 font-bold text-sm">Casino (gold sink)</div>
                                <p className="text-white/60 text-xs">Gold slots &amp; blackjack (1–50g) — house edge drains gold.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                            <span className="text-lg">🕹️</span>
                            <div>
                                <div className="text-amber-400 font-bold text-sm">Arcade Games</div>
                                <p className="text-white/60 text-xs">Thin Ice, Pong &amp; more in the town arcade aisle!</p>
                            </div>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            id: 'igloos',
            title: '🏠 Igloos - Own & Monetize',
            icon: '🏔️',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        <strong className="text-cyan-400">Igloos</strong> are premium spaces you can own and monetize with platform tokens.
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                            <span className="text-lg">🏷️</span>
                            <div>
                                <div className="text-green-400 font-bold text-sm">Rent or Own</div>
                                <p className="text-white/60 text-xs">
                                    Pay daily rent in <strong className="text-emerald-300">$WADDLE</strong> (Robinhood) or{' '}
                                    <strong className="text-cyan-300">$CP</strong> (Solana) — same tiers, chain-native wallet.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-black/30 rounded-lg p-2">
                            <span className="text-lg">🎟️</span>
                            <div>
                                <div className="text-amber-400 font-bold text-sm">Set Entry Fees</div>
                                <p className="text-white/60 text-xs">Charge visitors in your platform token — passive income!</p>
                            </div>
                        </div>
                    </div>
                    {isEvm && (
                        <p className="text-xs text-violet-300/80 text-center">
                            Igloo rent &amp; entry fees work on both chains — $WADDLE on Robinhood Chain, $CP on Solana.
                        </p>
                    )}
                </div>
            ),
        },
        {
            id: 'referrals',
            title: '🔗 Referral Program',
            icon: '💸',
            content: (
                <div className="space-y-3">
                    <p className="text-white/90 text-sm">
                        <strong className="text-green-400">Earn rewards</strong> by inviting friends!
                    </p>
                    {canReferralPayout ? (
                        <>
                            <div className="bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg p-3 border border-green-500/30">
                                <div className="text-center">
                                    <div className="text-green-400 font-bold">💰 15% Revenue Share (Solana)</div>
                                    <p className="text-white/70 text-xs mt-1">Earn 15% of the Pebbles your friends spend on gacha!</p>
                                </div>
                            </div>
                            <div className="bg-amber-500/20 rounded-lg p-2 border border-amber-500/30 text-center">
                                <p className="text-amber-400 text-xs font-bold">🎁 LIMITED TIME: You and your friend get 1,000 $CP!</p>
                            </div>
                        </>
                    ) : (
                        <div className="bg-violet-500/10 rounded-lg p-3 border border-violet-500/30 text-sm text-white/70">
                            Referral payouts with <strong className="text-emerald-300">$WADDLE</strong> on Robinhood Chain are coming soon.
                            {' '}
                            <strong className="text-cyan-300">$CP</strong> referral bonuses are live on Solana today (connect Phantom).
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: 'tips',
            title: '🚀 Ready to Waddle!',
            icon: '💡',
            content: (
                <div className="space-y-3">
                    <div className="space-y-2">
                        <div className="flex items-start gap-2 bg-gradient-to-r from-emerald-500/20 to-transparent rounded-lg p-2">
                            <span className="text-lg">🪶</span>
                            <div>
                                <div className="text-emerald-400 font-bold text-sm">Start with $WADDLE</div>
                                <p className="text-white/60 text-xs">Connect MetaMask on Robinhood Chain — our flagship token rail.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-gradient-to-r from-cyan-500/20 to-transparent rounded-lg p-2">
                            <span className="text-lg">◎</span>
                            <div>
                                <div className="text-cyan-400 font-bold text-sm">Or play on Solana</div>
                                <p className="text-white/60 text-xs">Phantom + $CP unlocks the full legacy economy today.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-gradient-to-r from-green-500/20 to-transparent rounded-lg p-2">
                            <span className="text-lg">💰</span>
                            <div>
                                <div className="text-green-400 font-bold text-sm">Grind Gold First</div>
                                <p className="text-white/60 text-xs">Practice wagers with gold before real token stakes!</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-2 bg-gradient-to-r from-amber-500/20 to-transparent rounded-lg p-2">
                            <span className="text-lg">🤝</span>
                            <div>
                                <div className="text-amber-400 font-bold text-sm">Be Social</div>
                                <p className="text-white/60 text-xs">Make friends, trade, throw snowballs!</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-lg p-2 text-center border border-white/10">
                        <p className="text-white/80 text-sm font-bold">🐧 Have fun and waddle on!</p>
                        <p className="text-white/50 text-xs mt-1">Menu → Help &amp; Tutorial to view this again anytime</p>
                    </div>
                </div>
            ),
        },
    ];
}

export default function TutorialModal({ isOpen, onClose, forceShow = false }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [neverShowAgain, setNeverShowAgain] = useState(false);
    const [shouldShow, setShouldShow] = useState(false);
    const modalRef = useRef(null);

    const { isEvm, canUsePebblesRail, canReferralPayout } = useChainEconomy();

    const slides = useMemo(
        () => buildTutorialSlides({ isEvm, canUsePebblesRail, canReferralPayout }),
        [isEvm, canUsePebblesRail, canReferralPayout]
    );

    useEffect(() => {
        const dismissed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (forceShow && isOpen) {
            setShouldShow(true);
            setCurrentSlide(0);
        } else if (!dismissed && isOpen) {
            setShouldShow(true);
            setCurrentSlide(0);
        } else if (!isOpen) {
            setShouldShow(false);
        }
    }, [isOpen, forceShow]);

    const handleClose = () => {
        if (neverShowAgain) {
            localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
        }
        setShouldShow(false);
        onClose?.();
    };

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide((prev) => prev + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlide > 0) {
            setCurrentSlide((prev) => prev - 1);
        }
    };

    const goToSlide = (index) => setCurrentSlide(index);

    useClickOutside(modalRef, handleClose);
    useEscapeKey(handleClose);

    if (!shouldShow) return null;

    const slide = slides[currentSlide];
    const isLastSlide = currentSlide === slides.length - 1;
    const isFirstSlide = currentSlide === 0;

    const headerGradient = isEvm
        ? 'from-emerald-600 via-green-600 to-teal-600'
        : 'from-cyan-600 via-purple-600 to-pink-600';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div
                ref={modalRef}
                className="w-full max-w-lg bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            >
                <div className={`relative bg-gradient-to-r ${headerGradient} p-4`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent animate-pulse" />

                    <div className="relative">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-3xl shrink-0">{slide.icon}</span>
                                <div className="min-w-0">
                                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">{slide.title}</h2>
                                    {isEvm && (
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-100/90">
                                            Robinhood · $WADDLE
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="text-white/70 hover:text-white transition-colors p-1 shrink-0"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center justify-center gap-1.5">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => goToSlide(index)}
                                    className={`h-2 rounded-full transition-all ${
                                        index === currentSlide
                                            ? 'bg-white w-6'
                                            : index < currentSlide
                                                ? 'bg-white/70 w-2'
                                                : 'bg-white/30 w-2'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-5 min-h-[280px]">{slide.content}</div>

                <div className="p-4 border-t border-white/10 bg-black/30">
                    <label className="flex items-center gap-2 mb-4 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={neverShowAgain}
                            onChange={(e) => setNeverShowAgain(e.target.checked)}
                            className="w-4 h-4 rounded border-white/30 bg-black/50 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                        />
                        <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                            Don&apos;t show this again
                        </span>
                    </label>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
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
                            {currentSlide + 1} / {slides.length}
                        </span>

                        {isLastSlide ? (
                            <button
                                type="button"
                                onClick={handleClose}
                                className={`px-6 py-2 rounded-lg font-bold text-sm text-white transition-all shadow-lg ${
                                    isEvm
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 shadow-emerald-500/25'
                                        : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-purple-500/25'
                                }`}
                            >
                                Let&apos;s Go! 🚀
                            </button>
                        ) : (
                            <button
                                type="button"
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

export function shouldShowTutorial() {
    return !localStorage.getItem(TUTORIAL_STORAGE_KEY);
}

export function resetTutorial() {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
}
