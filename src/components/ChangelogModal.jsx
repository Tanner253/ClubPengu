/**
 * ChangelogModal - In-game development changelog
 * Accessible via Settings menu
 * 1:1 match with whitepaper changelog
 */

import React, { useRef, useState } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';

// Change types with styling (matching whitepaper)
const CHANGE_TYPES = {
    feature: { label: 'New', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    fix: { label: 'Fix', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    improvement: { label: 'Improved', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    content: { label: 'Content', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    mobile: { label: 'Mobile', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
    backend: { label: 'Backend', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    refactor: { label: 'Refactor', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    security: { label: 'Security', bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
    performance: { label: 'Perf', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
};

// ==================== CHANGELOG DATA (1:1 with whitepaper) ====================
const CHANGELOG = [
    {
        version: '1.0.2',
        date: 'December 30, 2025',
        title: '🏪 Cosmetic Marketplace & Economy',
        description: 'Full Runescape-style open market for cosmetics, gift system, and tutorial for new players!',
        highlight: true,
        stats: { filesChanged: 26, additions: 5593, deletions: 93 },
        changes: [
            { type: 'feature', text: 'Cosmetic Marketplace - buy and sell items for Pebbles, RS/CS:GO style open economy' },
            { type: 'feature', text: 'Real-time market updates - listings appear instantly for all players' },
            { type: 'feature', text: 'Market announcements in global chat when items are listed or sold' },
            { type: 'feature', text: 'Complete ownership history tracking - trace any item from mint to current owner' },
            { type: 'feature', text: 'Gift System - send Gold, Pebbles, Items, or any SPL token to other players' },
            { type: 'feature', text: 'Tutorial Modal - interactive 6-slide guide for new players' },
            { type: 'feature', text: '$WADDLE Pebble deposits - buy pebbles with $WADDLE at 1.5x premium rate' },
            { type: 'feature', text: 'Black Whale, Silver Whale, Gold Whale characters (BWHALE, SWHALE, GWHALE promo codes)' },
            { type: 'backend', text: 'MarketplaceService.js - listing, buying, canceling with atomic transactions' },
            { type: 'backend', text: 'MarketListing model with expiration and statistics' },
            { type: 'backend', text: 'GiftHandlers for secure item/currency transfers between players' },
            { type: 'backend', text: 'OwnedCosmetic ownership history array for full provenance tracking' },
            { type: 'improvement', text: 'Item tooltips explain rarity, quality, editions, and market value' },
            { type: 'improvement', text: 'Listed items disabled in inventory (cannot burn while on sale)' },
            { type: 'improvement', text: 'Auto-unequip items when listed if only instance owned' },
            { type: 'fix', text: 'Withdrawal history now updates instantly after transactions' },
            { type: 'fix', text: 'Portal-based tooltips prevent overflow clipping issues' },
        ],
    },
    {
        version: '1.0.1',
        date: 'December 29, 2025',
        title: '🐋 White Whale Character',
        description: 'New secret playable character - the majestic White Whale!',
        highlight: true,
        changes: [
            { type: 'feature', text: 'White Whale character - whale-headed creature with penguin body (WhiteWhaleCharacter.js - 230 lines)' },
            { type: 'feature', text: 'WWHALE promo code unlocks the White Whale character' },
            { type: 'improvement', text: 'Character height system extended for new character types' },
        ],
    },
    {
        version: '1.0.0',
        date: 'December 27, 2025',
        title: '🚀 Rebranding - New Token Coming Soon!',
        description: 'Major rebranding with new token launch. Airdrop for OG holders who helped invest and get the game developed!',
        highlight: true,
        changes: [
            { type: 'feature', text: 'New token launching - airdrop for early supporters and investors' },
            { type: 'feature', text: 'OG holder rewards program for those who helped develop the game' },
            { type: 'content', text: 'Complete brand refresh and identity update' },
        ],
    },
    {
        version: '0.13.0',
        date: 'December 25-27, 2025',
        title: '🎰 P2P Rake System, Blackjack & Battleship',
        description: 'Platform revenue generation with 5% P2P rake, two new casino games, and comprehensive game fixes',
        highlight: true,
        stats: { filesChanged: 28, additions: 3200, deletions: 450 },
        changes: [
            { type: 'feature', text: '5% P2P Rake System - platform takes 5% of all wager pots for revenue' },
            { type: 'feature', text: 'RAKE_WALLET configuration - all rake sent to platform wallet automatically' },
            { type: 'feature', text: 'P2P Blackjack - both players vs shared dealer, best result wins the pot' },
            { type: 'feature', text: 'P2P Battleship - classic naval warfare with real-time ship placement and attacks' },
            { type: 'feature', text: 'Battleship hit/miss animations and ship sinking effects' },
            { type: 'backend', text: 'WagerSettlementService rake calculation and split payout logic' },
            { type: 'backend', text: 'CustodialWalletService.processRakePayout() for secure rake transfers' },
            { type: 'backend', text: 'Match model extended with rake tracking fields (rakeAmount, rakeTx, rakePercent)' },
            { type: 'backend', text: 'MatchService Blackjack engine with dealer AI (hits to 17)' },
            { type: 'backend', text: 'MatchService Battleship game state management and move validation' },
            { type: 'security', text: 'Server-authoritative rake calculation - clients cannot manipulate' },
            { type: 'security', text: 'Rake fail-safe: winner still paid full pot if rake transfer fails' },
            { type: 'fix', text: 'Battleship ship placement validation and overlap detection' },
            { type: 'fix', text: 'Blackjack score calculation edge cases with multiple aces' },
            { type: 'improvement', text: 'Challenge system now supports blackjack and battleship game types' },
            { type: 'improvement', text: 'Stats tracking for new game types' },
        ],
    },
    {
        version: '0.12.0',
        date: 'December 22-24, 2025',
        title: '💎 Token Wagering & Comprehensive Stats',
        description: 'Full Solana SPL token wagering system with custodial wallet, match history tracking, and player statistics dashboard',
        highlight: true,
        stats: { filesChanged: 32, additions: 4500, deletions: 890 },
        changes: [
            { type: 'feature', text: 'Complete SPL token wagering system - bet any Solana token on minigames' },
            { type: 'feature', text: 'Custodial wallet service for secure wager escrow and automated payouts' },
            { type: 'feature', text: 'WagerBot NPC (dev mode) for testing token wagers against AI opponent' },
            { type: 'feature', text: 'StatsModal.jsx - comprehensive statistics dashboard with 3 tabs' },
            { type: 'feature', text: 'Match history tracking with opponent, result, wager amounts, durations' },
            { type: 'feature', text: 'Transaction history with type labels, amounts, and timestamps' },
            { type: 'feature', text: 'Solscan links for all on-chain settlement transactions' },
            { type: 'feature', text: 'Token validation - real-time blockchain verification of any token CA' },
            { type: 'feature', text: 'Igloo banner customization: gradients, fonts, colors, alignment' },
            { type: 'backend', text: 'CustodialWalletService.js - secure key management with rate limiting' },
            { type: 'backend', text: 'WagerSettlementService.js - handles escrow, settlement, and refunds' },
            { type: 'backend', text: 'DevBotService.js - AI opponent for development testing' },
            { type: 'backend', text: 'my_full_stats WebSocket endpoint for player statistics' },
            { type: 'backend', text: 'Orphaned match recovery - auto-refund on server restart' },
            { type: 'security', text: 'Server-authoritative settlement - clients cannot manipulate payouts' },
            { type: 'security', text: 'Token-2022 program support with dynamic detection' },
            { type: 'fix', text: 'Victory screen now shows correct token winnings (+200 not +0)' },
            { type: 'fix', text: 'Igloo settings persist correctly with markModified for nested objects' },
            { type: 'fix', text: 'Duplicate settlement prevention with MATCH_ALREADY_PROCESSED guard' },
            { type: 'mobile', text: 'TicTacToe mobile portrait layout improvements' },
        ],
    },
    {
        version: '0.11.0',
        date: 'December 20-21, 2025',
        title: '🏠 Igloo Economy & X402 Payments',
        description: 'Full igloo rental system with Solana X402 payment protocol, automated rent collection, and comprehensive test coverage',
        highlight: true,
        stats: { filesChanged: 39, additions: 10943, deletions: 104 },
        changes: [
            { type: 'feature', text: 'Complete igloo ownership/rental system with IglooContext state management' },
            { type: 'feature', text: 'IglooEntryModal - visit and enter igloos with ownership display' },
            { type: 'feature', text: 'IglooRentalModal - purchase/rent igloos with Solana payments' },
            { type: 'feature', text: 'IglooSettingsPanel - customize your igloo (privacy, style, furniture)' },
            { type: 'feature', text: 'X402 Payment Protocol - HTTP 402-based micropayments via Solana' },
            { type: 'backend', text: 'IglooService.js (442 lines) - server-side igloo business logic' },
            { type: 'backend', text: 'Igloo.js model (327 lines) - MongoDB schema for igloo ownership' },
            { type: 'backend', text: 'iglooHandlers.js (361 lines) - WebSocket handlers for real-time igloo events' },
            { type: 'backend', text: 'RentScheduler.js (111 lines) - automated rent collection system' },
            { type: 'backend', text: 'X402Service.js server implementation (309 lines) - payment verification' },
            { type: 'feature', text: 'Solana network configuration with devnet/mainnet support' },
            { type: 'improvement', text: 'IglooOccupancySystem.js refactored for rental integration' },
            { type: 'backend', text: 'GitHub Actions CI/CD pipeline (219 lines) - automated testing & deployment' },
            { type: 'security', text: 'Comprehensive test coverage: 14 test files, unit + integration + e2e' },
            { type: 'backend', text: 'Vitest configuration for both client and server testing' },
            { type: 'improvement', text: 'ENV_TEMPLATE.md documentation for easy environment setup' },
        ],
    },
    {
        version: '0.10.5',
        date: 'December 18-20, 2025',
        title: '🎰 Casino, Minigames & Community Love',
        description: 'Slots, Monopoly, Uno, Ice Fishing - plus our first open source contribution!',
        highlight: true,
        stats: { filesChanged: 45, additions: 10540, deletions: 680 },
        changes: [
            { type: 'feature', text: 'Slot Machine System with jackpot celebrations (SlotMachineSystem.js - 619 lines)' },
            { type: 'backend', text: 'SlotService.js (585 lines) - server-side slot logic with payout calculations' },
            { type: 'feature', text: 'JackpotCelebration.js (328 lines) - particle effects and visual jackpot feedback' },
            { type: 'feature', text: 'SlotPayoutBoard.js (217 lines) - dynamic payout display' },
            { type: 'feature', text: 'Monopoly P2P minigame (MonopolyGame.js - 646 lines, P2PMonopoly.jsx - 1,345 lines)' },
            { type: 'feature', text: 'Uno P2P minigame (P2PUno.jsx - 1,274 lines) - full card game implementation' },
            { type: 'feature', text: 'In-game chat system for Monopoly matches' },
            { type: 'feature', text: 'Ice Fishing game improvements with enhanced gameplay' },
            { type: 'content', text: 'Lord Fishnu NPC character for fishing area' },
            { type: 'feature', text: 'MatchSpectator.jsx - watch ongoing P2P matches' },
            { type: 'fix', text: 'Username reset bug after promo code redemption (community PR #2 from pollomuslo 🎉)' },
            { type: 'fix', text: 'Card Jitsu gameplay bug fixes' },
            { type: 'backend', text: 'Heartbeat system for dead client connection cleanup' },
            { type: 'backend', text: 'MatchService.js expanded (+1,000 lines) for Monopoly/Uno support' },
            { type: 'performance', text: 'Casino optimizations for Mac devices' },
            { type: 'performance', text: 'React strict mode implementation' },
            { type: 'mobile', text: 'Monopoly mobile handling and brighter UI' },
        ],
    },
    {
        version: '0.10.0',
        date: 'December 17-18, 2025',
        title: '🔐 Full Database Migration & Auth System',
        description: 'Massive backend overhaul: MongoDB integration, Phantom wallet auth, server-authoritative game logic',
        highlight: true,
        stats: { filesChanged: 79, additions: 10701, deletions: 2204 },
        changes: [
            { type: 'backend', text: 'Complete MongoDB database integration with 8 new models (User, Match, Challenge, Transaction, Puffle, PromoCode, AuthSession, PromoRedemption)' },
            { type: 'security', text: 'Phantom wallet authentication with Solana signature verification' },
            { type: 'security', text: 'Server-authoritative promo code system - codes can no longer be scraped from client' },
            { type: 'security', text: 'JWT-based session management with secure token handling' },
            { type: 'backend', text: 'New UserService, AuthService, PromoCodeService for clean separation of concerns' },
            { type: 'feature', text: 'Guest mode with full gameplay (stats don\'t persist)' },
            { type: 'feature', text: 'Smooth third-person camera system with auto-trailing behind player' },
            { type: 'feature', text: 'Arrow keys now rotate camera, WASD for movement' },
            { type: 'mobile', text: 'True multitouch support - move with joystick AND rotate camera simultaneously' },
            { type: 'backend', text: 'Server-side coin rewards for chat and minigames (anti-exploit)' },
            { type: 'backend', text: 'Transaction logging for full audit trail of economy' },
            { type: 'fix', text: 'Fixed campfire bench alignment (community PR from marcus-the-worm 🐛)' },
        ],
    },
    {
        version: '0.9.0',
        date: 'December 16, 2025',
        title: '✨ Whale Status & Nametag System',
        description: 'Tiered status system based on $WADDLE holdings with particle effects',
        stats: { filesChanged: 6, additions: 795, deletions: 657 },
        changes: [
            { type: 'feature', text: 'Whale Status nametag tiers: Standard → Bronze → Silver → Gold → Diamond → Legendary' },
            { type: 'feature', text: 'LocalizedParticleSystem for gold rain effects on high-tier nametags (275 lines)' },
            { type: 'feature', text: 'Real-time $WADDLE balance checking via Solana RPC' },
            { type: 'content', text: 'BONK cosmetic set: orange skin + hat + eyes + shirt (154 lines of voxel art)' },
            { type: 'content', text: 'MISTOR GOAT cosmetic set with silver skin theme' },
            { type: 'improvement', text: 'Chat bubbles repositioned with correct offset above players' },
            { type: 'improvement', text: 'Settings menu expanded with nametag customization options' },
        ],
    },
    {
        version: '0.8.0',
        date: 'December 15-16, 2025',
        title: '🏗️ The Great Refactor',
        description: 'Reduced VoxelWorld.jsx from 9,500 to 4,188 lines. Created 20+ new modular systems.',
        highlight: true,
        stats: { filesChanged: 111, additions: 18179, deletions: 13061 },
        changes: [
            { type: 'refactor', text: 'VoxelWorld.jsx: 9,500 → 4,188 lines (-56% code reduction)' },
            { type: 'refactor', text: 'PropsFactory.js: 4,372 → 1,262 lines (-71% code reduction)' },
            { type: 'refactor', text: 'assets.js split into 6 focused modules (hats.js, eyes.js, mouths.js, bodyItems.js, mounts.js)' },
            { type: 'refactor', text: 'Created 17 new system modules in src/systems/ (AIManager, ChatBubbleSystem, DayNightCycle, etc.)' },
            { type: 'refactor', text: 'Extracted 20+ prop classes (Igloo, Campfire, Bench, PineTree, ChristmasTree, etc.)' },
            { type: 'refactor', text: 'New buildings module: Dojo.js (395 lines), GiftShop.js (279 lines), PizzaParlor.js (486 lines)' },
            { type: 'refactor', text: 'Created reusable hooks: useClickOutside, useEscapeKey, useDeviceDetection, useLocalStorage' },
            { type: 'refactor', text: 'Nightclub.js refactored: 1,574 → 557 lines with proper room architecture' },
            { type: 'feature', text: 'Mount trail system with icy particle effects (MountTrailSystem.js - 427 lines)' },
            { type: 'feature', text: 'SnowfallSystem.js (249 lines) - Dynamic weather particles' },
            { type: 'feature', text: 'WizardTrailSystem.js (176 lines) - Magic hat particle trails' },
            { type: 'feature', text: 'EmoteWheel component extracted (90 lines) - Radial emote selection' },
            { type: 'performance', text: 'Reduced bundle size by eliminating duplicate code' },
            { type: 'performance', text: 'Improved memory management with proper cleanup in all systems' },
        ],
    },
    {
        version: '0.7.0',
        date: 'December 15, 2025',
        title: '📱 Mobile Revolution',
        description: 'Complete mobile experience overhaul with PUBG-style controls',
        stats: { filesChanged: 5, additions: 1069, deletions: 752 },
        changes: [
            { type: 'mobile', text: 'PUBG-style virtual joystick with floating anchor point (VirtualJoystick.jsx - 191 lines)' },
            { type: 'mobile', text: 'Touch camera controls - drag anywhere to rotate view (TouchCameraControl.jsx - 86 lines)' },
            { type: 'mobile', text: 'iOS-specific optimizations: 512px shadow maps, reduced particles' },
            { type: 'mobile', text: 'Android-specific fixes: removed fullscreen API issues' },
            { type: 'mobile', text: 'Responsive P2P minigame UIs (Card Jitsu, Connect 4, Tic Tac Toe)' },
            { type: 'mobile', text: 'iPad viewport optimizations with dynamic padding' },
            { type: 'backend', text: 'Server-side animation broadcasting for better multiplayer sync' },
            { type: 'performance', text: 'Separate GPU optimization paths for iOS/Mac vs Android vs Desktop' },
            { type: 'fix', text: 'Fixed landscape mode orientation handling' },
        ],
    },
    {
        version: '0.6.0',
        date: 'December 14, 2025',
        title: '🏠 Properties & Nightlife',
        description: 'Nightclub with disco mode, igloos, bench seating, and economic systems',
        stats: { filesChanged: 7, additions: 1001, deletions: 96 },
        changes: [
            { type: 'feature', text: 'Nightclub interior with LED dance floor, DJ booth, disco ball (Nightclub.js - 1,293 lines)' },
            { type: 'feature', text: 'Disco mode: lasers, spotlights, color cycling when 5+ players dance' },
            { type: 'feature', text: 'Bench seating system with sit/stand animations' },
            { type: 'feature', text: 'Igloo interiors with customizable furniture' },
            { type: 'feature', text: 'P2P wagering system for minigames (ChallengeService.js - 299 lines)' },
            { type: 'feature', text: 'Live player count display in HUD' },
            { type: 'content', text: 'MISTOR character with silver theme' },
            { type: 'backend', text: 'MatchService.js (610 lines) for P2P game state management' },
            { type: 'backend', text: 'InboxService.js (160 lines) for challenge notifications' },
        ],
    },
    {
        version: '0.5.0',
        date: 'December 13-14, 2025',
        title: '🗺️ Arctic Overhaul',
        description: 'Brand new map design, Pizza Parlor, massive performance improvements',
        highlight: true,
        stats: { filesChanged: 6, additions: 2868, deletions: 21 },
        changes: [
            { type: 'feature', text: 'Complete new arctic island map with icy terrain' },
            { type: 'feature', text: 'Pizza Parlor building with full interior (counter, ovens, seating)' },
            { type: 'feature', text: 'Day/night cycle synchronized across all players via server' },
            { type: 'feature', text: 'Dynamic prop lighting based on time of day' },
            { type: 'content', text: 'LMAO eyes cosmetic (promo code unlock)' },
            { type: 'content', text: 'Minecraft boat mount with water physics' },
            { type: 'content', text: '20+ new hats, eyes, and body items' },
            { type: 'performance', text: '3x frame rate improvement on Mac devices' },
            { type: 'performance', text: 'Shadow map optimizations: 1024→512 on mobile' },
            { type: 'performance', text: 'Instanced mesh rendering for repeated props' },
            { type: 'improvement', text: 'TownCenter.js restructured with proper spawn points' },
        ],
    },
    {
        version: '0.4.0',
        date: 'December 12, 2025',
        title: '🎮 Multiplayer & Minigames',
        description: 'P2P challenges, match spectating, Connect 4 & Tic Tac Toe',
        stats: { filesChanged: 19, additions: 3859, deletions: 256 },
        changes: [
            { type: 'feature', text: 'P2P Challenge system: send, accept, deny challenges' },
            { type: 'feature', text: 'Match spectating with live game state updates' },
            { type: 'feature', text: 'Connect 4 minigame with AI opponent (Connect4Game.js - 343 lines)' },
            { type: 'feature', text: 'Tic Tac Toe minigame (TicTacToeGame.js - 250 lines)' },
            { type: 'feature', text: 'Wager modal for setting bet amounts (WagerModal.jsx - 235 lines)' },
            { type: 'feature', text: 'Settings menu with sound, graphics, controls options (SettingsMenu.jsx - 140 lines)' },
            { type: 'feature', text: 'Lo-fi background music option (6.2MB audio file)' },
            { type: 'backend', text: 'StatsService.js for tracking player statistics' },
            { type: 'improvement', text: 'Profile menu with stats display (ProfileMenu.jsx - 218 lines)' },
        ],
    },
    {
        version: '0.3.0',
        date: 'December 11, 2025',
        title: '🦅 Characters & Social',
        description: 'Marcus the Eagle character, AFK system, improved chat',
        stats: { filesChanged: 6, additions: 876, deletions: 149 },
        changes: [
            { type: 'feature', text: 'Marcus the Eagle - new playable character type (MarcusCharacter.js - 348 lines)' },
            { type: 'feature', text: 'CharacterRegistry system for extensible character types (132 lines)' },
            { type: 'feature', text: '/afk command with automatic AFK detection after 5 minutes' },
            { type: 'feature', text: '/spawn command to teleport back to spawn point' },
            { type: 'feature', text: 'ChatLog component with message history (ChatLog.jsx - 369 lines)' },
            { type: 'feature', text: 'Bob Ross NPC that paints happy little trees' },
            { type: 'improvement', text: 'Sitting animation broadcasts to other players' },
            { type: 'fix', text: 'Chat message persistence and scroll behavior' },
        ],
    },
    {
        version: '0.2.0',
        date: 'December 10, 2025',
        title: '🌐 Multiplayer Foundation',
        description: 'Real-time multiplayer with WebSocket sync, igloos, emotes',
        stats: { filesChanged: 5, additions: 1178, deletions: 111 },
        changes: [
            { type: 'feature', text: 'Real-time multiplayer with WebSocket server (server/index.js - 576 lines)' },
            { type: 'feature', text: 'MultiplayerContext.jsx for state management (368 lines)' },
            { type: 'feature', text: 'Player position and rotation sync at 20 updates/sec' },
            { type: 'feature', text: 'Igloo system with multiple themed interiors' },
            { type: 'feature', text: 'Emote system with 8 expressions (wave, dance, sit, cry, laugh, etc.)' },
            { type: 'feature', text: 'Inbox system for receiving challenges (Inbox.jsx - 260 lines)' },
            { type: 'feature', text: 'Notification toasts for game events' },
            { type: 'backend', text: 'Room-based architecture for Town, Nightclub, Igloos' },
            { type: 'backend', text: 'Player join/leave events with proper cleanup' },
        ],
    },
    {
        version: '0.1.0',
        date: 'December 9, 2025',
        title: '🐧 Genesis',
        description: 'The foundation - 3D voxel world, penguin customization, Card Jitsu',
        highlight: true,
        stats: { filesChanged: 52, additions: 21877, deletions: 0 },
        changes: [
            { type: 'feature', text: '3D voxel game engine built on Three.js' },
            { type: 'feature', text: 'VoxelPenguinDesigner.jsx - full character customization (474 lines)' },
            { type: 'feature', text: 'VoxelWorld.jsx - main game world renderer (2,212 lines)' },
            { type: 'feature', text: '24+ penguin skin colors from classic blue to rainbow' },
            { type: 'feature', text: '17+ hats: crown, viking helm, propeller cap, wizard hat, etc.' },
            { type: 'feature', text: '17+ eye styles: cool shades, angry, hearts, stars, etc.' },
            { type: 'feature', text: '12+ mouth options: beak, smile, tongue out, beard, etc.' },
            { type: 'feature', text: 'Card Jitsu minigame with rock-paper-scissors mechanics (CardJitsuGame.js - 296 lines)' },
            { type: 'feature', text: 'Puffle companion system with 10 colors (Puffle.js - 486 lines)' },
            { type: 'feature', text: 'Puffle care: feed, play, rest with stat management' },
            { type: 'feature', text: 'Collision system with terrain and props (CollisionSystem.js - 549 lines)' },
            { type: 'feature', text: 'GameManager singleton for persistent state (GameManager.js - 187 lines)' },
            { type: 'feature', text: 'PropsFactory for world decoration (PropsFactory.js - 984 lines)' },
            { type: 'feature', text: 'TownCenter spawn area with igloos, trees, campfire (501 lines)' },
            { type: 'feature', text: 'Whitepaper website with Next.js (1,180 lines)' },
            { type: 'content', text: 'Voxel art assets: 347 lines of hand-crafted pixel data' },
        ],
    },
];

// ==================== COMPONENTS ====================

const ChangeTag = ({ type }) => {
    const style = CHANGE_TYPES[type] || CHANGE_TYPES.feature;
    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text} border ${style.border}`}>
            {style.label}
        </span>
    );
};

const StatsBar = ({ stats }) => (
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono mt-1">
        {stats.filesChanged && (
            <span className="text-slate-400">
                <span className="text-blue-400">{stats.filesChanged}</span> files
            </span>
        )}
        {stats.additions > 0 && (
            <span className="text-green-400">+{stats.additions.toLocaleString()}</span>
        )}
        {stats.deletions > 0 && (
            <span className="text-red-400">-{stats.deletions.toLocaleString()}</span>
        )}
    </div>
);

const VersionCard = ({ version, isExpanded, onToggle }) => (
    <div className={`bg-black/30 rounded-xl overflow-hidden border ${version.highlight ? 'border-cyan-500/30' : 'border-white/5'}`}>
        <button
            onClick={onToggle}
            className="w-full p-3 flex items-start gap-3 text-left hover:bg-white/5 transition-colors"
        >
            <span className="text-white/50 text-sm mt-0.5">
                {isExpanded ? '▼' : '▶'}
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-cyan-400 font-mono text-xs font-bold">v{version.version}</span>
                    <span className="text-white/30">•</span>
                    <span className="text-white/40 text-xs">{version.date}</span>
                    {version.highlight && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-medium">
                            ⭐ Major
                        </span>
                    )}
                </div>
                <h4 className="text-white font-bold text-sm">{version.title}</h4>
                {version.description && (
                    <p className="text-white/50 text-xs mt-1">{version.description}</p>
                )}
                {version.stats && <StatsBar stats={version.stats} />}
                
                {/* Summary tags when collapsed */}
                {!isExpanded && (
                    <div className="flex flex-wrap gap-1 mt-2">
                        {Array.from(new Set(version.changes.map(c => c.type))).slice(0, 5).map((type) => (
                            <ChangeTag key={type} type={type} />
                        ))}
                        {version.changes.length > 5 && (
                            <span className="text-white/40 text-[10px] px-1">
                                +{version.changes.length - 5} more
                            </span>
                        )}
                    </div>
                )}
            </div>
            <span className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-white/40 text-xs">
                {version.changes.length}
            </span>
        </button>
        
        {isExpanded && (
            <div className="px-3 pb-3 border-t border-white/5">
                <ul className="mt-3 space-y-1.5">
                    {version.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <div className="shrink-0 mt-0.5">
                                <ChangeTag type={change.type} />
                            </div>
                            <span className="text-white/70 text-xs leading-relaxed">{change.text}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
    </div>
);

// ==================== MAIN COMPONENT ====================

const ChangelogModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const [expanded, setExpanded] = useState(new Set([CHANGELOG[0]?.version]));
    const [expandAll, setExpandAll] = useState(false);
    
    useClickOutside(modalRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);
    
    if (!isOpen) return null;
    
    const toggleVersion = (v) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(v) ? next.delete(v) : next.add(v);
            return next;
        });
    };
    
    const handleExpandAll = () => {
        if (expandAll) {
            setExpanded(new Set([CHANGELOG[0]?.version]));
        } else {
            setExpanded(new Set(CHANGELOG.map(v => v.version)));
        }
        setExpandAll(!expandAll);
    };
    
    // Calculate totals (matching whitepaper)
    const totalChanges = CHANGELOG.reduce((acc, v) => acc + v.changes.length, 0);
    const totalVersions = CHANGELOG.length;
    const totalAdditions = CHANGELOG.reduce((acc, v) => acc + (v.stats?.additions || 0), 0);
    const totalFiles = CHANGELOG.reduce((acc, v) => acc + (v.stats?.filesChanged || 0), 0);
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
            <div 
                ref={modalRef}
                className="relative bg-gradient-to-br from-[#0a0a1a] via-[#111128] to-[#0d1a2d] rounded-2xl border border-green-500/30 shadow-2xl shadow-green-500/10 w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative flex items-center justify-between p-4 pb-2 shrink-0 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="text-2xl">📋</div>
                        <div>
                            <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400">
                                CHANGELOG
                            </h2>
                            <p className="text-white/50 text-xs">Development Log</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white transition-colors w-10 h-10 flex items-center justify-center text-xl rounded-full hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Stats Bar */}
                <div className="px-4 py-3 bg-black/30 border-b border-white/5">
                    <div className="grid grid-cols-4 gap-2">
                        <div className="text-center">
                            <div className="text-lg font-bold text-cyan-400">{totalVersions}</div>
                            <div className="text-[9px] text-white/40 uppercase">Releases</div>
                        </div>
                        <div className="text-center border-l border-white/10">
                            <div className="text-lg font-bold text-green-400">{totalChanges}</div>
                            <div className="text-[9px] text-white/40 uppercase">Changes</div>
                        </div>
                        <div className="text-center border-l border-white/10">
                            <div className="text-lg font-bold text-purple-400">{totalFiles.toLocaleString()}</div>
                            <div className="text-[9px] text-white/40 uppercase">Files</div>
                        </div>
                        <div className="text-center border-l border-white/10">
                            <div className="text-lg font-bold text-yellow-400">{Math.round(totalAdditions / 1000)}k+</div>
                            <div className="text-[9px] text-white/40 uppercase">Lines</div>
                        </div>
                    </div>
                    
                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                        {Object.keys(CHANGE_TYPES).map((type) => (
                            <ChangeTag key={type} type={type} />
                        ))}
                    </div>
                    
                    {/* Expand/Collapse All */}
                    <button
                        onClick={handleExpandAll}
                        className="w-full mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60 text-xs"
                    >
                        {expandAll ? 'Collapse All' : 'Expand All'}
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 overscroll-contain">
                    {/* Version List */}
                    {CHANGELOG.map((version) => (
                        <VersionCard
                            key={version.version}
                            version={version}
                            isExpanded={expanded.has(version.version)}
                            onToggle={() => toggleVersion(version.version)}
                        />
                    ))}
                    
                    {/* Refactoring Highlights */}
                    <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-3 border border-yellow-500/20">
                        <h4 className="text-yellow-400 font-bold text-xs mb-2 flex items-center gap-1">
                            ⚡ Refactoring Highlights
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-black/30 rounded-lg p-2">
                                <div className="text-[10px] text-white/40 mb-1">VoxelWorld</div>
                                <div className="text-xs font-mono">
                                    <span className="text-red-400">9.5k</span>
                                    <span className="text-white/30">→</span>
                                    <span className="text-green-400">4.2k</span>
                                </div>
                                <div className="text-[9px] text-green-400">-56%</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-2">
                                <div className="text-[10px] text-white/40 mb-1">PropsFactory</div>
                                <div className="text-xs font-mono">
                                    <span className="text-red-400">4.4k</span>
                                    <span className="text-white/30">→</span>
                                    <span className="text-green-400">1.3k</span>
                                </div>
                                <div className="text-[9px] text-green-400">-71%</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-2">
                                <div className="text-[10px] text-white/40 mb-1">Systems</div>
                                <div className="text-cyan-400 text-sm font-bold">20+</div>
                                <div className="text-[9px] text-cyan-400">Modular</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="h-2" />
                </div>
                
                {/* Footer */}
                <div className="relative p-4 shrink-0 border-t border-white/5 bg-black/30">
                    <p className="text-center text-white/40 text-[10px] mb-2">
                        Open source and always cooking 🐧🔥
                    </p>
                    <div className="flex gap-2">
                        <a
                            href="https://github.com/Tanner253/ClubPengu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium text-sm transition-all text-center flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            GitHub
                        </a>
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-400 hover:to-cyan-400 text-white rounded-xl font-bold text-sm transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChangelogModal;
