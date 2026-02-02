"use client";

import React, { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Bug,
  Wrench,
  Zap,
  Smartphone,
  Server,
  Code,
  Shield,
  Cpu,
  Layers,
} from "lucide-react";

// Changelog entry types
type ChangeType = "feature" | "fix" | "improvement" | "content" | "mobile" | "backend" | "refactor" | "security" | "performance";

interface ChangelogEntry {
  type: ChangeType;
  text: string;
}

interface ChangelogVersion {
  version: string;
  date: string;
  title: string;
  description?: string;
  highlight?: boolean;
  stats?: {
    filesChanged?: number;
    additions?: number;
    deletions?: number;
  };
  changes: ChangelogEntry[];
}

// Icon mapping for change types
const typeIcons: Record<ChangeType, ReactNode> = {
  feature: <Sparkles className="w-3.5 h-3.5" />,
  fix: <Bug className="w-3.5 h-3.5" />,
  improvement: <Wrench className="w-3.5 h-3.5" />,
  content: <Layers className="w-3.5 h-3.5" />,
  mobile: <Smartphone className="w-3.5 h-3.5" />,
  backend: <Server className="w-3.5 h-3.5" />,
  refactor: <Code className="w-3.5 h-3.5" />,
  security: <Shield className="w-3.5 h-3.5" />,
  performance: <Cpu className="w-3.5 h-3.5" />,
};

const typeColors: Record<ChangeType, string> = {
  feature: "text-green-400 bg-green-400/10 border-green-400/30",
  fix: "text-red-400 bg-red-400/10 border-red-400/30",
  improvement: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  content: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  mobile: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  backend: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  refactor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  security: "text-pink-400 bg-pink-400/10 border-pink-400/30",
  performance: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

const typeLabels: Record<ChangeType, string> = {
  feature: "New",
  fix: "Fix",
  improvement: "Improved",
  content: "Content",
  mobile: "Mobile",
  backend: "Backend",
  refactor: "Refactor",
  security: "Security",
  performance: "Perf",
};

// ==================== CHANGELOG DATA ====================
// Comprehensive changelog from git history
const CHANGELOG_DATA: ChangelogVersion[] = [
  {
    version: "1.1.4",
    date: "January 31, 2026",
    title: "🎨 NFT Minting & Photo Booth",
    description: "Mint your cosmetics as Solana NFTs! Photo booth for capturing custom NFT images, full Metaplex integration",
    highlight: true,
    stats: { filesChanged: 18, additions: 3200, deletions: 200 },
    changes: [
      { type: "feature", text: "NFT Minting System - mint any owned cosmetic as a Solana NFT via Metaplex" },
      { type: "feature", text: "Photo Booth - capture custom images for your NFT with pose selection" },
      { type: "feature", text: "NFT metadata follows Metaplex Token Metadata Standard with full attributes" },
      { type: "feature", text: "NFT images stored in database for persistence across deployments" },
      { type: "feature", text: "First Edition and Holographic traits reflected in NFT metadata" },
      { type: "feature", text: "5% royalties on secondary sales go to platform wallet" },
      { type: "backend", text: "NFTMintService.js - Metaplex transaction building without external libraries" },
      { type: "backend", text: "NFTImageStorage.js - database-backed image storage for NFT renders" },
      { type: "backend", text: "nftHandlers.js - HTTP endpoints for /api/nft/image and /api/nft/metadata" },
      { type: "backend", text: "Master Edition creation makes each NFT a unique 1/1" },
      { type: "security", text: "Server-side ownership verification before mint transaction building" },
      { type: "security", text: "CORS headers for marketplace compatibility (Magic Eden, Tensor)" },
      { type: "improvement", text: "Tutorial updated with NFT minting information" },
    ],
  },
  {
    version: "1.1.3",
    date: "January 26, 2026",
    title: "❄️ Snowball Fights & Internationalization",
    description: "Club Penguin-style snowball throwing, skateboard tricks, 10-language support, and two new arcade minigames",
    highlight: true,
    stats: { filesChanged: 28, additions: 6500, deletions: 800 },
    changes: [
      { type: "feature", text: "Snowball Throwing System - locational throwing like classic Club Penguin (click where you want it to land)" },
      { type: "feature", text: "Multiplayer snowball sync - all players see snowballs thrown by others in real-time" },
      { type: "feature", text: "Snowball collision detection with walls, furniture, gravel paths, and any surface" },
      { type: "feature", text: "Snowball splat effects oriented to surface normal (splats on walls appear on walls!)" },
      { type: "feature", text: "Mobile snowball mode - tap snowball button then tap screen to throw" },
      { type: "feature", text: "Skateboard Kickflip - 50% chance on double jump for a kickflip animation" },
      { type: "feature", text: "Skateboard 360 Spin - 50% chance on double jump for a board spin animation" },
      { type: "feature", text: "Internationalization (i18n) - full UI translation support for 10 languages" },
      { type: "feature", text: "Language Toggle button in main menu - cycles through EN, ZH, ES, PT, KO, JA, FR, DE, RU, AR" },
      { type: "feature", text: "Thin Ice Minigame - 15 levels of puzzle gameplay, melt ice tiles to reach the exit" },
      { type: "feature", text: "Avalanche Run Minigame - endless runner with obstacles, fish collection, and power-ups" },
      { type: "mobile", text: "Persistent snowball button for mobile users" },
      { type: "backend", text: "Server-side snowball_throw handler with velocity validation (anti-cheat)" },
      { type: "backend", text: "Snowball broadcasts to all players in room via WebSocket" },
      { type: "fix", text: "Snowballs no longer collide with thrower (150ms safe period + mesh exclusion)" },
      { type: "fix", text: "Skateboard trick animations loop cleanly without reversing" },
      { type: "fix", text: "Avalanche Run collision detection aligned with visual rendering" },
      { type: "fix", text: "Thin Ice trapped detection now recognizes locked exit as impassable" },
      { type: "improvement", text: "All UI text translatable including guest warnings, wallet status, interactions" },
      { type: "improvement", text: "1 second snowball cooldown for rapid-fire fun" },
    ],
  },
  {
    version: "1.1.2",
    date: "January 23, 2026",
    title: "🪵 Tung Tung Tung Sahur Character",
    description: "New meme character - a tall cylindrical log creature with stick limbs and a baseball bat",
    highlight: true,
    stats: { filesChanged: 12, additions: 650, deletions: 50 },
    changes: [
      { type: "feature", text: "Tung Tung Tung Sahur - new playable character based on the viral meme (TungTungCharacter.js - 308 lines)" },
      { type: "feature", text: "TUNG promo code unlocks the Tung Tung character" },
      { type: "feature", text: "Tall cylindrical 'log' body design with customizable eyes and mouth" },
      { type: "feature", text: "Stick arms and legs with unique animation handling" },
      { type: "feature", text: "Baseball bat held in right hand (Bonk-style)" },
      { type: "feature", text: "Character-specific animation overrides for Laugh and Headbang emotes (whole body rocks)" },
      { type: "improvement", text: "Chat bubbles and nametags positioned correctly for tall character height" },
      { type: "improvement", text: "VoxelPenguinDesigner updated with 🪵 log icon for character selection" },
      { type: "fix", text: "Split head/body cylinder design for proper sitting and dancing animations" },
      { type: "fix", text: "Leg positioning moved below body to prevent clipping" },
    ],
  },
  {
    version: "1.1.1",
    date: "January 12, 2026",
    title: "🏔️ Parkour Stage 6 & Performance",
    description: "Expert parkour course with big drops, performance optimization for high-altitude gameplay, and critical fixes",
    highlight: true,
    stats: { filesChanged: 8, additions: 1200, deletions: 150 },
    changes: [
      { type: "feature", text: "Parkour Stage 6 'The Gauntlet' - expert difficulty course with 50+ platforms heading towards nightclub" },
      { type: "feature", text: "Big drop jumps and spiral descents - significant vertical height changes for advanced players" },
      { type: "feature", text: "The Needle Run - consecutive tiny 1.5x1.5 platforms requiring precision" },
      { type: "feature", text: "The Frozen Throne - grand finale platform overlooking the nightclub area" },
      { type: "feature", text: "/warp pk[1-6] commands - teleport to any parkour stage start for testing (dev mode)" },
      { type: "performance", text: "Parkour Performance Mode - disables heavy animations when player Y >= 30 for better FPS" },
      { type: "performance", text: "Campfire, Christmas tree, door glows, and building animations paused during high-altitude parkour" },
      { type: "fix", text: "Player air momentum now correctly uses current frame delta - prevents excessive forward drift on lag spikes" },
      { type: "fix", text: "Igloo public access now properly resets token gate and entry fee to defaults" },
      { type: "fix", text: "Igloo settings clear all paid entry records when switching to public/private mode" },
      { type: "backend", text: "IglooService resetEntryFees called automatically on public/private access change" },
    ],
  },
  {
    version: "1.1.0",
    date: "January 10-11, 2026",
    title: "🦐 Shrimp Character & Cosmetic Fixes",
    description: "New playable shrimp character, cosmetic unlock system fixes, character preview improvements, and blackjack payout corrections",
    highlight: true,
    stats: { filesChanged: 16, additions: 2773, deletions: 1178 },
    changes: [
      { type: "feature", text: "Shrimp Character - new playable character type with unique animations (ShrimpCharacter.js - 466 lines)" },
      { type: "feature", text: "SKRIMPS promo code unlocks the Shrimp character" },
      { type: "feature", text: "PBR Slot Reels - realistic physically-based rendering for casino slots" },
      { type: "feature", text: "Spectator wager banner - shows active wagers during match spectating" },
      { type: "feature", text: "All character types now available in golden igloo wardrobe when cosmetics unlocked" },
      { type: "fix", text: "Golden igloo preview now supports animated skins with proper materials and cosmic stars" },
      { type: "fix", text: "Player profile preview correctly renders all character types (doginal, frog, shrimp, whales)" },
      { type: "fix", text: "Cosmetic ownership checks now properly construct templateId with category prefix" },
      { type: "fix", text: "Appearance data sync explicitly spreads all customization fields for proper Mongoose handling" },
      { type: "fix", text: "Blackjack split hand payouts now calculate correctly" },
      { type: "fix", text: "Blackjack push payout logic fixed - ties properly return wager" },
      { type: "fix", text: "Blackjack only applies to 2-card hands, not split hands" },
      { type: "fix", text: "Double down scenarios now pay out correctly" },
      { type: "fix", text: "Busted players properly handled in payout calculations" },
      { type: "security", text: "Banned IP connection logs throttled to once per minute to reduce spam" },
    ],
  },
  {
    version: "1.0.3",
    date: "December 31, 2025",
    title: "🐛 Bug Fixes & Game Balance",
    description: "Critical fixes for Blackjack payouts, UNO spectator display, Monopoly rent scaling, player preview rendering, appearance synchronization, banner interactions, and personal igloo wardrobe",
    highlight: false,
    changes: [
      { type: "fix", text: "Blackjack PvE payouts now correctly credit gold coins to player balance on win" },
      { type: "fix", text: "Improved error handling and validation in blackjack payout system" },
      { type: "fix", text: "UNO spectator banner now updates card counts in real-time when cards are played or drawn" },
      { type: "fix", text: "UNO state notifications trigger immediately on card actions for accurate spectator display" },
      { type: "fix", text: "Monopoly rent now scales dynamically with game duration (1x to 3x over 10 minutes) instead of fixed values" },
      { type: "fix", text: "Monopoly rent calculation uses gameStartTime for fair duration-based scaling" },
      { type: "fix", text: "WagerBot player preview now correctly renders both flippers and all cosmetics (hat, bodyItem)" },
      { type: "fix", text: "PenguinPreview3D flipper generation fixed to call generateFlippers twice (left and right)" },
      { type: "fix", text: "PenguinPreview3D now correctly renders all character types (penguin, doginal, frog, whales, marcus) with all cosmetics" },
      { type: "fix", text: "Player appearance updates now properly rebuild meshes for all clients in real-time" },
      { type: "fix", text: "Fixed state synchronization issue where players appeared stuck after saving customization in igloo wardrobe" },
      { type: "fix", text: "Local player mesh now rebuilds when penguinData changes after saving customization" },
      { type: "fix", text: "Position updates continue to sync after appearance changes, ensuring movement is visible to all players" },
      { type: "fix", text: "BannerZoomOverlay now works for all clickable banners: igloo instructions, casino charts, slot drop rates, nightclub banners, highway billboards" },
      { type: "fix", text: "BannerZoomOverlay improved with centered content, better formatting, and mobile portrait support" },
      { type: "feature", text: "Personal igloo wardrobe now has full penguin creator functionality - customize appearance in-game without disconnecting" },
      { type: "feature", text: "Personal igloo wardrobe loads all cosmetics from database instead of hardcoded values for better maintainability" },
      { type: "feature", text: "IglooRentalGuide - new React component for igloo rental information with mobile portrait support" },
      { type: "feature", text: "GachaDropRatesGuide - new React component for cosmetic gacha drop rates with detailed information and mobile support" },
      { type: "improvement", text: "Monopoly rent system balances early game (cheap) with late game (expensive) for fair gameplay" },
      { type: "improvement", text: "Profile menu player preview now shows all equipped cosmetics and character types correctly" },
    ],
  },
  {
    version: "1.0.2",
    date: "December 30, 2025",
    title: "🏪 Cosmetic Marketplace & Economy",
    description: "Full Runescape-style open market for cosmetics, gift system, and tutorial for new players!",
    highlight: true,
    stats: { filesChanged: 26, additions: 5593, deletions: 93 },
    changes: [
      { type: "feature", text: "Cosmetic Marketplace - buy and sell items for Pebbles, RS/CS:GO style open economy" },
      { type: "feature", text: "Real-time market updates - listings appear instantly for all players" },
      { type: "feature", text: "Market announcements in global chat when items are listed or sold" },
      { type: "feature", text: "Complete ownership history tracking - trace any item from mint to current owner" },
      { type: "feature", text: "Gift System - send Gold, Pebbles, Items, or any SPL token to other players" },
      { type: "feature", text: "Tutorial Modal - interactive 6-slide guide for new players" },
      { type: "feature", text: "$CPC Pebble deposits - buy pebbles with $CPC at 1.5x premium rate" },
      { type: "feature", text: "Black Whale, Silver Whale, Gold Whale characters (BWHALE, SWHALE, GWHALE promo codes)" },
      { type: "backend", text: "MarketplaceService.js - listing, buying, canceling with atomic transactions" },
      { type: "backend", text: "MarketListing model with expiration and statistics" },
      { type: "backend", text: "GiftHandlers for secure item/currency transfers between players" },
      { type: "backend", text: "OwnedCosmetic ownership history array for full provenance tracking" },
      { type: "improvement", text: "Item tooltips explain rarity, quality, editions, and market value" },
      { type: "improvement", text: "Listed items disabled in inventory (cannot burn while on sale)" },
      { type: "improvement", text: "Auto-unequip items when listed if only instance owned" },
      { type: "fix", text: "Withdrawal history now updates instantly after transactions" },
      { type: "fix", text: "Portal-based tooltips prevent overflow clipping issues" },
    ],
  },
  {
    version: "1.0.1",
    date: "December 29, 2025",
    title: "🐋 Whale Characters",
    description: "New secret playable characters - whale-headed creatures!",
    highlight: true,
    changes: [
      { type: "feature", text: "White Whale character - whale-headed creature with penguin body" },
      { type: "feature", text: "WWHALE promo code unlocks the White Whale character" },
      { type: "improvement", text: "Character height system extended for new character types" },
      { type: "improvement", text: "Customization options disabled for whale characters (pure whale aesthetic)" },
    ],
  },
  {
    version: "1.0.0",
    date: "December 27, 2025",
    title: "🚀 WaddleBet Rebrand & $CPC Token Launch",
    description: "Major rebranding to WaddleBet with $CPC token launch. Airdrop for OG holders who helped invest and get the game developed!",
    highlight: true,
    changes: [
      { type: "feature", text: "$CPC token launching on Solana - airdrop for early supporters and investors" },
      { type: "feature", text: "OG holder rewards program for those who helped develop the game" },
      { type: "content", text: "Complete rebrand from Club Pengu to WaddleBet" },
    ],
  },
  {
    version: "0.13.0",
    date: "December 25-27, 2025",
    title: "🎰 P2P Rake System, Blackjack & Battleship",
    description: "Platform revenue generation with 5% P2P rake, two new casino games, and comprehensive game fixes",
    highlight: true,
    stats: { filesChanged: 28, additions: 3200, deletions: 450 },
    changes: [
      { type: "feature", text: "5% P2P Rake System - platform takes 5% of all wager pots for revenue" },
      { type: "feature", text: "RAKE_WALLET configuration - all rake sent to platform wallet automatically" },
      { type: "feature", text: "P2P Blackjack - both players vs shared dealer, best result wins the pot" },
      { type: "feature", text: "P2P Battleship - classic naval warfare with real-time ship placement and attacks" },
      { type: "feature", text: "Battleship hit/miss animations and ship sinking effects" },
      { type: "backend", text: "WagerSettlementService rake calculation and split payout logic" },
      { type: "backend", text: "CustodialWalletService.processRakePayout() for secure rake transfers" },
      { type: "backend", text: "Match model extended with rake tracking fields (rakeAmount, rakeTx, rakePercent)" },
      { type: "backend", text: "MatchService Blackjack engine with dealer AI (hits to 17)" },
      { type: "backend", text: "MatchService Battleship game state management and move validation" },
      { type: "security", text: "Server-authoritative rake calculation - clients cannot manipulate" },
      { type: "security", text: "Rake fail-safe: winner still paid full pot if rake transfer fails" },
      { type: "fix", text: "Battleship ship placement validation and overlap detection" },
      { type: "fix", text: "Blackjack score calculation edge cases with multiple aces" },
      { type: "improvement", text: "Challenge system now supports blackjack and battleship game types" },
      { type: "improvement", text: "Stats tracking for new game types" },
    ],
  },
  {
    version: "0.12.0",
    date: "December 22-24, 2025",
    title: "💎 Token Wagering & Comprehensive Stats",
    description: "Full Solana SPL token wagering system with custodial wallet, match history tracking, and player statistics dashboard",
    highlight: true,
    stats: { filesChanged: 32, additions: 4500, deletions: 890 },
    changes: [
      { type: "feature", text: "Complete SPL token wagering system - bet any Solana token on minigames" },
      { type: "feature", text: "Custodial wallet service for secure wager escrow and automated payouts" },
      { type: "feature", text: "WagerBot NPC (dev mode) for testing token wagers against AI opponent" },
      { type: "feature", text: "StatsModal.jsx - comprehensive statistics dashboard with 3 tabs" },
      { type: "feature", text: "Match history tracking with opponent, result, wager amounts, durations" },
      { type: "feature", text: "Transaction history with type labels, amounts, and timestamps" },
      { type: "feature", text: "Solscan links for all on-chain settlement transactions" },
      { type: "feature", text: "Token validation - real-time blockchain verification of any token CA" },
      { type: "feature", text: "Igloo banner customization: gradients, fonts, colors, alignment" },
      { type: "backend", text: "CustodialWalletService.js - secure key management with rate limiting" },
      { type: "backend", text: "WagerSettlementService.js - handles escrow, settlement, and refunds" },
      { type: "backend", text: "DevBotService.js - AI opponent for development testing" },
      { type: "backend", text: "my_full_stats WebSocket endpoint for player statistics" },
      { type: "backend", text: "Orphaned match recovery - auto-refund on server restart" },
      { type: "security", text: "Server-authoritative settlement - clients cannot manipulate payouts" },
      { type: "security", text: "Token-2022 program support with dynamic detection" },
      { type: "fix", text: "Victory screen now shows correct token winnings (+200 not +0)" },
      { type: "fix", text: "Igloo settings persist correctly with markModified for nested objects" },
      { type: "fix", text: "Duplicate settlement prevention with MATCH_ALREADY_PROCESSED guard" },
      { type: "mobile", text: "TicTacToe mobile portrait layout improvements" },
    ],
  },
  {
    version: "0.11.0",
    date: "December 20-21, 2025",
    title: "🏠 Igloo Economy & X402 Payments",
    description: "Full igloo rental system with Solana X402 payment protocol, automated rent collection, and comprehensive test coverage",
    highlight: true,
    stats: { filesChanged: 39, additions: 10943, deletions: 104 },
    changes: [
      { type: "feature", text: "Complete igloo ownership/rental system with IglooContext state management" },
      { type: "feature", text: "IglooEntryModal - visit and enter igloos with ownership display" },
      { type: "feature", text: "IglooRentalModal - purchase/rent igloos with Solana payments" },
      { type: "feature", text: "IglooSettingsPanel - customize your igloo (privacy, style, furniture)" },
      { type: "feature", text: "X402 Payment Protocol - HTTP 402-based micropayments via Solana" },
      { type: "backend", text: "IglooService.js (442 lines) - server-side igloo business logic" },
      { type: "backend", text: "Igloo.js model (327 lines) - MongoDB schema for igloo ownership" },
      { type: "backend", text: "iglooHandlers.js (361 lines) - WebSocket handlers for real-time igloo events" },
      { type: "backend", text: "RentScheduler.js (111 lines) - automated rent collection system" },
      { type: "backend", text: "X402Service.js server implementation (309 lines) - payment verification" },
      { type: "feature", text: "Solana network configuration with devnet/mainnet support" },
      { type: "improvement", text: "IglooOccupancySystem.js refactored for rental integration" },
      { type: "backend", text: "GitHub Actions CI/CD pipeline (219 lines) - automated testing & deployment" },
      { type: "security", text: "Comprehensive test coverage: 14 test files, unit + integration + e2e" },
      { type: "backend", text: "Vitest configuration for both client and server testing" },
      { type: "improvement", text: "ENV_TEMPLATE.md documentation for easy environment setup" },
    ],
  },
  {
    version: "0.10.5",
    date: "December 18-20, 2025",
    title: "🎰 Casino, Minigames & Community Love",
    description: "Slots, Monopoly, Uno, Ice Fishing - plus our first open source contribution!",
    highlight: true,
    stats: { filesChanged: 45, additions: 10540, deletions: 680 },
    changes: [
      { type: "feature", text: "Slot Machine System with jackpot celebrations (SlotMachineSystem.js - 619 lines)" },
      { type: "backend", text: "SlotService.js (585 lines) - server-side slot logic with payout calculations" },
      { type: "feature", text: "JackpotCelebration.js (328 lines) - particle effects and visual jackpot feedback" },
      { type: "feature", text: "SlotPayoutBoard.js (217 lines) - dynamic payout display" },
      { type: "feature", text: "Monopoly P2P minigame (MonopolyGame.js - 646 lines, P2PMonopoly.jsx - 1,345 lines)" },
      { type: "feature", text: "Uno P2P minigame (P2PUno.jsx - 1,274 lines) - full card game implementation" },
      { type: "feature", text: "In-game chat system for Monopoly matches" },
      { type: "feature", text: "Ice Fishing game improvements with enhanced gameplay" },
      { type: "content", text: "Lord Fishnu NPC character for fishing area" },
      { type: "feature", text: "MatchSpectator.jsx - watch ongoing P2P matches" },
      { type: "fix", text: "Username reset bug after promo code redemption (community PR #2 from pollomuslo 🎉)" },
      { type: "fix", text: "Card Jitsu gameplay bug fixes" },
      { type: "backend", text: "Heartbeat system for dead client connection cleanup" },
      { type: "backend", text: "MatchService.js expanded (+1,000 lines) for Monopoly/Uno support" },
      { type: "performance", text: "Casino optimizations for Mac devices" },
      { type: "performance", text: "React strict mode implementation" },
      { type: "mobile", text: "Monopoly mobile handling and brighter UI" },
    ],
  },
  {
    version: "0.10.0",
    date: "December 17-18, 2025",
    title: "🔐 Full Database Migration & Auth System",
    description: "Massive backend overhaul: MongoDB integration, Phantom wallet auth, server-authoritative game logic",
    highlight: true,
    stats: { filesChanged: 79, additions: 10701, deletions: 2204 },
    changes: [
      { type: "backend", text: "Complete MongoDB database integration with 8 new models (User, Match, Challenge, Transaction, Puffle, PromoCode, AuthSession, PromoRedemption)" },
      { type: "security", text: "Phantom wallet authentication with Solana signature verification" },
      { type: "security", text: "Server-authoritative promo code system - codes can no longer be scraped from client" },
      { type: "security", text: "JWT-based session management with secure token handling" },
      { type: "backend", text: "New UserService, AuthService, PromoCodeService for clean separation of concerns" },
      { type: "feature", text: "Guest mode with full gameplay (stats don't persist)" },
      { type: "feature", text: "Smooth third-person camera system with auto-trailing behind player" },
      { type: "feature", text: "Arrow keys now rotate camera, WASD for movement" },
      { type: "mobile", text: "True multitouch support - move with joystick AND rotate camera simultaneously" },
      { type: "backend", text: "Server-side coin rewards for chat and minigames (anti-exploit)" },
      { type: "backend", text: "Transaction logging for full audit trail of economy" },
      { type: "fix", text: "Fixed campfire bench alignment (community PR from marcus-the-worm 🐛)" },
    ],
  },
  {
    version: "0.9.0",
    date: "December 16, 2025",
    title: "✨ Whale Status & Nametag System",
    description: "Tiered status system based on $CPC holdings with particle effects",
    stats: { filesChanged: 6, additions: 795, deletions: 657 },
    changes: [
      { type: "feature", text: "Whale Status nametag tiers: Standard → Bronze → Silver → Gold → Diamond → Legendary" },
      { type: "feature", text: "LocalizedParticleSystem for gold rain effects on high-tier nametags (275 lines)" },
      { type: "feature", text: "Real-time $CPC balance checking via Solana RPC" },
      { type: "content", text: "BONK cosmetic set: orange skin + hat + eyes + shirt (154 lines of voxel art)" },
      { type: "content", text: "MISTOR GOAT cosmetic set with silver skin theme" },
      { type: "improvement", text: "Chat bubbles repositioned with correct offset above players" },
      { type: "improvement", text: "Settings menu expanded with nametag customization options" },
    ],
  },
  {
    version: "0.8.0",
    date: "December 15-16, 2025",
    title: "🏗️ The Great Refactor",
    description: "Reduced VoxelWorld.jsx from 9,500 to 4,188 lines. Created 20+ new modular systems.",
    highlight: true,
    stats: { filesChanged: 111, additions: 18179, deletions: 13061 },
    changes: [
      { type: "refactor", text: "VoxelWorld.jsx: 9,500 → 4,188 lines (-56% code reduction)" },
      { type: "refactor", text: "PropsFactory.js: 4,372 → 1,262 lines (-71% code reduction)" },
      { type: "refactor", text: "assets.js split into 6 focused modules (hats.js, eyes.js, mouths.js, bodyItems.js, mounts.js)" },
      { type: "refactor", text: "Created 17 new system modules in src/systems/ (AIManager, ChatBubbleSystem, DayNightCycle, etc.)" },
      { type: "refactor", text: "Extracted 20+ prop classes (Igloo, Campfire, Bench, PineTree, ChristmasTree, etc.)" },
      { type: "refactor", text: "New buildings module: Dojo.js (395 lines), GiftShop.js (279 lines), PizzaParlor.js (486 lines)" },
      { type: "refactor", text: "Created reusable hooks: useClickOutside, useEscapeKey, useDeviceDetection, useLocalStorage" },
      { type: "refactor", text: "Nightclub.js refactored: 1,574 → 557 lines with proper room architecture" },
      { type: "feature", text: "Mount trail system with icy particle effects (MountTrailSystem.js - 427 lines)" },
      { type: "feature", text: "SnowfallSystem.js (249 lines) - Dynamic weather particles" },
      { type: "feature", text: "WizardTrailSystem.js (176 lines) - Magic hat particle trails" },
      { type: "feature", text: "EmoteWheel component extracted (90 lines) - Radial emote selection" },
      { type: "performance", text: "Reduced bundle size by eliminating duplicate code" },
      { type: "performance", text: "Improved memory management with proper cleanup in all systems" },
    ],
  },
  {
    version: "0.7.0",
    date: "December 15, 2025",
    title: "📱 Mobile Revolution",
    description: "Complete mobile experience overhaul with PUBG-style controls",
    stats: { filesChanged: 5, additions: 1069, deletions: 752 },
    changes: [
      { type: "mobile", text: "PUBG-style virtual joystick with floating anchor point (VirtualJoystick.jsx - 191 lines)" },
      { type: "mobile", text: "Touch camera controls - drag anywhere to rotate view (TouchCameraControl.jsx - 86 lines)" },
      { type: "mobile", text: "iOS-specific optimizations: 512px shadow maps, reduced particles" },
      { type: "mobile", text: "Android-specific fixes: removed fullscreen API issues" },
      { type: "mobile", text: "Responsive P2P minigame UIs (Card Jitsu, Connect 4, Tic Tac Toe)" },
      { type: "mobile", text: "iPad viewport optimizations with dynamic padding" },
      { type: "backend", text: "Server-side animation broadcasting for better multiplayer sync" },
      { type: "performance", text: "Separate GPU optimization paths for iOS/Mac vs Android vs Desktop" },
      { type: "fix", text: "Fixed landscape mode orientation handling" },
    ],
  },
  {
    version: "0.6.0",
    date: "December 14, 2025",
    title: "🏠 Properties & Nightlife",
    description: "Nightclub with disco mode, igloos, bench seating, and economic systems",
    stats: { filesChanged: 7, additions: 1001, deletions: 96 },
    changes: [
      { type: "feature", text: "Nightclub interior with LED dance floor, DJ booth, disco ball (Nightclub.js - 1,293 lines)" },
      { type: "feature", text: "Disco mode: lasers, spotlights, color cycling when 5+ players dance" },
      { type: "feature", text: "Bench seating system with sit/stand animations" },
      { type: "feature", text: "Igloo interiors with customizable furniture" },
      { type: "feature", text: "P2P wagering system for minigames (ChallengeService.js - 299 lines)" },
      { type: "feature", text: "Live player count display in HUD" },
      { type: "content", text: "MISTOR character with silver theme" },
      { type: "backend", text: "MatchService.js (610 lines) for P2P game state management" },
      { type: "backend", text: "InboxService.js (160 lines) for challenge notifications" },
    ],
  },
  {
    version: "0.5.0",
    date: "December 13-14, 2025",
    title: "🗺️ Arctic Overhaul",
    description: "Brand new map design, Pizza Parlor, massive performance improvements",
    highlight: true,
    stats: { filesChanged: 6, additions: 2868, deletions: 21 },
    changes: [
      { type: "feature", text: "Complete new arctic island map with icy terrain" },
      { type: "feature", text: "Pizza Parlor building with full interior (counter, ovens, seating)" },
      { type: "feature", text: "Day/night cycle synchronized across all players via server" },
      { type: "feature", text: "Dynamic prop lighting based on time of day" },
      { type: "content", text: "LMAO eyes cosmetic (promo code unlock)" },
      { type: "content", text: "Minecraft boat mount with water physics" },
      { type: "content", text: "20+ new hats, eyes, and body items" },
      { type: "performance", text: "3x frame rate improvement on Mac devices" },
      { type: "performance", text: "Shadow map optimizations: 1024→512 on mobile" },
      { type: "performance", text: "Instanced mesh rendering for repeated props" },
      { type: "improvement", text: "TownCenter.js restructured with proper spawn points" },
    ],
  },
  {
    version: "0.4.0",
    date: "December 12, 2025",
    title: "🎮 Multiplayer & Minigames",
    description: "P2P challenges, match spectating, Connect 4 & Tic Tac Toe",
    stats: { filesChanged: 19, additions: 3859, deletions: 256 },
    changes: [
      { type: "feature", text: "P2P Challenge system: send, accept, deny challenges" },
      { type: "feature", text: "Match spectating with live game state updates" },
      { type: "feature", text: "Connect 4 minigame with AI opponent (Connect4Game.js - 343 lines)" },
      { type: "feature", text: "Tic Tac Toe minigame (TicTacToeGame.js - 250 lines)" },
      { type: "feature", text: "Wager modal for setting bet amounts (WagerModal.jsx - 235 lines)" },
      { type: "feature", text: "Settings menu with sound, graphics, controls options (SettingsMenu.jsx - 140 lines)" },
      { type: "feature", text: "Lo-fi background music option (6.2MB audio file)" },
      { type: "backend", text: "StatsService.js for tracking player statistics" },
      { type: "improvement", text: "Profile menu with stats display (ProfileMenu.jsx - 218 lines)" },
    ],
  },
  {
    version: "0.3.0",
    date: "December 11, 2025",
    title: "🦅 Characters & Social",
    description: "Marcus the Eagle character, AFK system, improved chat",
    stats: { filesChanged: 6, additions: 876, deletions: 149 },
    changes: [
      { type: "feature", text: "Marcus the Eagle - new playable character type (MarcusCharacter.js - 348 lines)" },
      { type: "feature", text: "CharacterRegistry system for extensible character types (132 lines)" },
      { type: "feature", text: "/afk command with automatic AFK detection after 5 minutes" },
      { type: "feature", text: "/spawn command to teleport back to spawn point" },
      { type: "feature", text: "ChatLog component with message history (ChatLog.jsx - 369 lines)" },
      { type: "feature", text: "Bob Ross NPC that paints happy little trees" },
      { type: "improvement", text: "Sitting animation broadcasts to other players" },
      { type: "fix", text: "Chat message persistence and scroll behavior" },
    ],
  },
  {
    version: "0.2.0",
    date: "December 10, 2025",
    title: "🌐 Multiplayer Foundation",
    description: "Real-time multiplayer with WebSocket sync, igloos, emotes",
    stats: { filesChanged: 5, additions: 1178, deletions: 111 },
    changes: [
      { type: "feature", text: "Real-time multiplayer with WebSocket server (server/index.js - 576 lines)" },
      { type: "feature", text: "MultiplayerContext.jsx for state management (368 lines)" },
      { type: "feature", text: "Player position and rotation sync at 20 updates/sec" },
      { type: "feature", text: "Igloo system with multiple themed interiors" },
      { type: "feature", text: "Emote system with 8 expressions (wave, dance, sit, cry, laugh, etc.)" },
      { type: "feature", text: "Inbox system for receiving challenges (Inbox.jsx - 260 lines)" },
      { type: "feature", text: "Notification toasts for game events" },
      { type: "backend", text: "Room-based architecture for Town, Nightclub, Igloos" },
      { type: "backend", text: "Player join/leave events with proper cleanup" },
    ],
  },
  {
    version: "0.1.0",
    date: "December 9, 2025",
    title: "🐧 Genesis",
    description: "The foundation - 3D voxel world, penguin customization, Card Jitsu",
    highlight: true,
    stats: { filesChanged: 52, additions: 21877, deletions: 0 },
    changes: [
      { type: "feature", text: "3D voxel game engine built on Three.js" },
      { type: "feature", text: "VoxelPenguinDesigner.jsx - full character customization (474 lines)" },
      { type: "feature", text: "VoxelWorld.jsx - main game world renderer (2,212 lines)" },
      { type: "feature", text: "108 penguin skin colors from classic blue to cosmic divine variants" },
      { type: "feature", text: "17+ hats: crown, viking helm, propeller cap, wizard hat, etc." },
      { type: "feature", text: "17+ eye styles: cool shades, angry, hearts, stars, etc." },
      { type: "feature", text: "12+ mouth options: beak, smile, tongue out, beard, etc." },
      { type: "feature", text: "Card Jitsu minigame with rock-paper-scissors mechanics (CardJitsuGame.js - 296 lines)" },
      { type: "feature", text: "Puffle companion system with 10 colors (Puffle.js - 486 lines)" },
      { type: "feature", text: "Puffle care: feed, play, rest with stat management" },
      { type: "feature", text: "Collision system with terrain and props (CollisionSystem.js - 549 lines)" },
      { type: "feature", text: "GameManager singleton for persistent state (GameManager.js - 187 lines)" },
      { type: "feature", text: "PropsFactory for world decoration (PropsFactory.js - 984 lines)" },
      { type: "feature", text: "TownCenter spawn area with igloos, trees, campfire (501 lines)" },
      { type: "feature", text: "Whitepaper website with Next.js (1,180 lines)" },
      { type: "content", text: "Voxel art assets: 347 lines of hand-crafted pixel data" },
    ],
  },
];

// ==================== COMPONENTS ====================

function ChangeTag({ type }: { type: ChangeType }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${typeColors[type]}`}>
      {typeIcons[type]}
      {typeLabels[type]}
    </span>
  );
}

function StatsBar({ stats }: { stats: { filesChanged?: number; additions?: number; deletions?: number } }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
      {stats.filesChanged && (
        <span className="text-slate-400">
          <span className="text-blue-400">{stats.filesChanged}</span> files
        </span>
      )}
      {stats.additions && (
        <span className="text-green-400">
          +{stats.additions.toLocaleString()}
        </span>
      )}
      {stats.deletions && (
        <span className="text-red-400">
          -{stats.deletions.toLocaleString()}
        </span>
      )}
    </div>
  );
}

function VersionCard({ version, isExpanded, onToggle }: { version: ChangelogVersion; isExpanded: boolean; onToggle: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card rounded-xl overflow-hidden ${version.highlight ? "border-cyan-500/30 ring-1 ring-cyan-500/20" : ""}`}
    >
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 sm:p-6 flex items-start gap-4 text-left hover:bg-white/5 transition-colors"
      >
        {/* Expand/collapse icon */}
        <div className="mt-1 text-slate-500">
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
        
        {/* Version info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-cyan-400 font-mono text-sm font-bold">v{version.version}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500 text-sm">{version.date}</span>
            {version.highlight && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-medium">
                ⭐ Major Release
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{version.title}</h3>
          {version.description && (
            <p className="text-slate-400 text-sm mb-2">{version.description}</p>
          )}
          
          {/* Stats bar */}
          {version.stats && <StatsBar stats={version.stats} />}
          
          {/* Summary tags when collapsed */}
          {!isExpanded && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Array.from(new Set(version.changes.map(c => c.type))).slice(0, 5).map((type) => (
                <ChangeTag key={type} type={type} />
              ))}
              {version.changes.length > 5 && (
                <span className="text-slate-500 text-xs px-2 py-0.5">
                  +{version.changes.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Change count badge */}
        <div className="shrink-0 text-right">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-slate-400 text-sm font-medium">
            {version.changes.length}
          </span>
        </div>
      </button>
      
      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-white/5">
              <ul className="mt-4 space-y-2">
                {version.changes.map((change, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      <ChangeTag type={change.type} />
                    </div>
                    <span className="text-slate-300 text-sm leading-relaxed">{change.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

export default function Changelog() {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set([CHANGELOG_DATA[0]?.version]));
  const [expandAll, setExpandAll] = useState(false);

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedVersions(new Set([CHANGELOG_DATA[0]?.version]));
    } else {
      setExpandedVersions(new Set(CHANGELOG_DATA.map((v) => v.version)));
    }
    setExpandAll(!expandAll);
  };

  // Calculate totals
  const totalChanges = CHANGELOG_DATA.reduce((acc, v) => acc + v.changes.length, 0);
  const totalVersions = CHANGELOG_DATA.length;
  const totalAdditions = CHANGELOG_DATA.reduce((acc, v) => acc + (v.stats?.additions || 0), 0);
  const totalDeletions = CHANGELOG_DATA.reduce((acc, v) => acc + (v.stats?.deletions || 0), 0);
  const totalFiles = CHANGELOG_DATA.reduce((acc, v) => acc + (v.stats?.filesChanged || 0), 0);

  return (
    <section id="changelog" className="py-32 px-4 sm:px-6 relative">
      <div className="section-divider mb-32" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-green-400 text-sm font-semibold uppercase tracking-widest">Development Log</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            <span className="text-green-400">Changelog</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Every line of code, every feature, every optimization documented. 
            <span className="text-cyan-400 font-semibold"> 36 days of shipping.</span>
          </p>
          
          {/* Impressive stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 max-w-2xl mx-auto">
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{totalVersions}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Releases</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{totalChanges}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Changes</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{totalFiles.toLocaleString()}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Files Touched</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{Math.round(totalAdditions / 1000)}k+</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Lines Written</div>
            </div>
          </div>
          
          {/* Legend and controls */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {(Object.keys(typeLabels) as ChangeType[]).map((type) => (
              <ChangeTag key={type} type={type} />
            ))}
          </div>
          
          <button
            onClick={handleExpandAll}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-slate-300 text-sm"
          >
            {expandAll ? "Collapse All" : "Expand All"}
          </button>
        </motion.div>

        {/* Version cards */}
        <div className="space-y-4">
          {CHANGELOG_DATA.map((version) => (
            <VersionCard
              key={version.version}
              version={version}
              isExpanded={expandedVersions.has(version.version)}
              onToggle={() => toggleVersion(version.version)}
            />
          ))}
        </div>
        
        {/* Code reduction highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 glass-card rounded-2xl p-6 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5"
        >
          <h3 className="font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Refactoring Highlights
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 rounded-lg bg-black/20">
              <div className="text-slate-400 mb-1">VoxelWorld.jsx</div>
              <div className="text-lg font-mono">
                <span className="text-red-400">9,500</span>
                <span className="text-slate-500"> → </span>
                <span className="text-green-400">4,188</span>
              </div>
              <div className="text-xs text-green-400">-56% lines</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-black/20">
              <div className="text-slate-400 mb-1">PropsFactory.js</div>
              <div className="text-lg font-mono">
                <span className="text-red-400">4,372</span>
                <span className="text-slate-500"> → </span>
                <span className="text-green-400">1,262</span>
              </div>
              <div className="text-xs text-green-400">-71% lines</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-black/20">
              <div className="text-slate-400 mb-1">New Systems</div>
              <div className="text-lg font-mono text-cyan-400">20+</div>
              <div className="text-xs text-cyan-400">Modular Files</div>
            </div>
          </div>
        </motion.div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="text-slate-500 text-sm mb-4">
            Open source and always cooking 🐧🔥
          </p>
          <a
            href="https://github.com/Tanner253/ClubPengu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-slate-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
