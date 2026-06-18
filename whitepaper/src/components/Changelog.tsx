"use client";

import React, { useState, type ReactNode } from "react";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";
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
    version: "1.3.3",
    date: "June 16, 2026",
    title: "📊 Economy Step 1 — Daily Loop, Gold Scarcity & Trader Overhaul",
    description:
      "The largest economy pass since 1.3.0: gold scarcity tuning, server-authoritative fishing holes, NPC daily contracts with Tarkov-style merchant UI, 7-day $CP streak calendar, Today HUD, PvE blackjack, puffle shop tabs, economy guide, and closed-loop whitepaper visuals. 137 files — +10,149 / −1,894 lines.",
    highlight: true,
    stats: { filesChanged: 137, additions: 10149, deletions: 1894 },
    changes: [
      // ── Gold economy & scarcity ──
      { type: "backend", text: "goldEconomy.js — single source of truth for starting coins (10g), ferry cost, bait bundles, wager caps, emergency sell ratio, mint recipes, and economy version migration" },
      { type: "backend", text: "Gold economy v2 migration — existing wallets receive 10% balance retention on login (relative wealth preserved, inflation drained)" },
      { type: "fix", text: "Emergency NPC sell uses floor(unit×ratio×qty) on total stack — stops per-item 1g exploit on bulk wood/fish dumps" },
      { type: "improvement", text: "Onboarding quest completion reward reduced to 10g (was 500g); Dojo Sensei win grants 1g once during onboarding only" },
      { type: "improvement", text: "Solo minigames no longer mint gold — Card Jitsu practice, Connect 4, and Tic Tac Toe are wager-only or fun; gold stays scarce" },
      { type: "backend", text: "Removed minigameRewards.js flat gold faucets; PvP wagers capped at 50g; gold slot bets clamped 1–25g" },
      { type: "feature", text: "Wood mint recipes at Copper Clive — burn log stacks at better rates than emergency sell to intentionally mint gold" },

      // ── Fishing holes (server-authoritative) ──
      { type: "feature", text: "FishingHoleService — per-hole tier stock (minnow → trophy) depletes on catch and regrows on server tick, mirrored to all players in the room" },
      { type: "feature", text: "FishingHoleWorldState Mongo model + fishingHoles.js defs — room-scoped hole snapshots, rare-bias per location, minnows always available" },
      { type: "backend", text: "fishingLoot.js overhaul — catch tables keyed to rod tier and hole tier stock; server rejects casts when hole tier is empty" },
      { type: "improvement", text: "IceFishingGame + IceFishingSystem — client shows hole stock tiers, respects server depletion, bait miss extra-loss chance" },
      { type: "improvement", text: "fishingHoleStock.js client util — tier color coding and stock labels synced from server broadcasts" },

      // ── Wood, worms & gathering ──
      { type: "feature", text: "treeWoodSpecies.js — pine/birch/oak/ironwood species mapping for harvestable trees with tier-appropriate yields" },
      { type: "feature", text: "WormForageService — forage mossy logs in forest for worm bait; forageableLogs.js spawn defs" },
      { type: "improvement", text: "woodcuttingLoot.js + axe durability tuning — yields scale with tree stage and axe tier; HarvestableTree props simplified" },
      { type: "fix", text: "Forest ferry arrival grants loaner basic axe if player has none — onboarding chop step no longer soft-locks" },

      // ── NPC daily contracts (Step 1) ──
      { type: "feature", text: "NpcDailyOrderService — daily Salty catch + Clive timber orders with UTC midnight rotation, accept gate, and one turn-in per day" },
      { type: "feature", text: "npcOrders.js — rotating contract copy, mixed-wood bundle requirements, gold contractor bonus (~12 + 12% of bundle size)" },
      { type: "feature", text: "NPC contract flow — accept at merchant Tasks tab (npc_quest_accept), track on Today HUD, turn in via npc_quest_turnin" },
      { type: "feature", text: "DailyQuestHUD — persistent Today panel after onboarding: accepted contracts with live fish/wood progress, streak calendar, 60 min bar, claim button, spend hints" },
      { type: "improvement", text: "Contracts-available hint when orders exist but none accepted — directs players to Old Salty / Copper Clive" },
      { type: "improvement", text: "OnboardingQuestHUD hands off to Today panel after reward; panel auto-expands when dailies incomplete; collapse persists in localStorage" },

      // ── 7-day $CP streak ──
      { type: "feature", text: "7-day login streak calendar — $CP on days 1/2/4/5/7 (1k→5k); gold-only bonus days 3 (+5g) & 6 (+10g) skip on-chain transfer" },
      { type: "feature", text: "StreakCalendar.jsx — mobile-first 7-cell grid with amber gold-days and cyan $CP-days; shown in Today HUD and DailyBonusModal" },
      { type: "backend", text: "DailyBonusService rewrite — streakDay/streakLastUtcDay on User, gold-only claim path, daily_streak_gold transaction type, custodial $CP payout on CP days" },
      { type: "backend", text: "dailyBonusStreak.js config (server + client sync) — resolveNextStreakDay, UTC miss resets to day 1" },

      // ── Tarkov-style merchant UI ──
      { type: "feature", text: "NpcDialogueModal Tarkov overhaul — split layout: typewriter speech left, tabbed offer grid right, detail strip + DEAL / ACCEPT CONTRACT / TURN IN" },
      { type: "feature", text: "TraderOfferCanvas — animated chests, crates, axes, rods, and contract art replace emoji merchant tiles; selection glow + open animation" },
      { type: "feature", text: "MaterialBreakdown.jsx — wood progress bars on mint recipes and timber contracts showing have/need per log type" },
      { type: "feature", text: "merchantOfferArt.js — maps actions to canvas variants (tier, art type, display names)" },
      { type: "mobile", text: "Merchant UI mobile — 2-col offer grid, 92vh panel cap, scrollable detail strip, 44px tabs, 48px DEAL button, touch-action manipulation" },

      // ── Inventory & merchants ──
      { type: "backend", text: "GameInventoryService expansion — loaner axe grant, mint gold from recipes, sell batch fix, npc order material burn on turn-in, starter rod+worms pickup" },
      { type: "improvement", text: "GameInventoryModal — tier-colored wood cells, sell feedback, emergency vs mint value hints" },
      { type: "improvement", text: "merchants.js + worldNpcs.js — Clive lore mentions loaner axe; Salty/Clive daily contract dialogue actions; Ranger Pike emergency sell at 65%" },
      { type: "improvement", text: "AuthService — new wallets start with 10g only; rod + worms claimed at Snow Forts world pickup (claimStarterRod)" },

      // ── Casino & puffles ──
      { type: "feature", text: "PveBlackjackService (server) — authoritative PvE blackjack with blackjackRules.js; bets 1–50g; CasinoBlackjack.jsx client rewrite" },
      { type: "feature", text: "PuffleShopTabs + PuffleCanvasPreview — tabbed puffle shop with canvas-rendered preview; puffleAccessories.js config" },
      { type: "improvement", text: "PufflePanel polish — accessory equip flow and shop integration" },
      { type: "improvement", text: "GoldSlotsService + goldSlots config aligned to goldEconomy bet caps" },

      // ── Player-facing guides & creator ──
      { type: "feature", text: "EconomyGuideModal — Settings → Game Economy Guide explaining gold vs pebbles vs $CP, grind loop, and sustainability (separate from TokenomicsModal)" },
      { type: "feature", text: "CreatorPitchModal + TOKENOMICS badge on Penguin Maker — play-to-earn pitch with grind → bank → $CP flow" },
      { type: "improvement", text: "VoxelPenguinDesigner header badges — animated WHITEPAPER, TOKENOMICS, and OPEN SOURCED links matching retro shimmer style" },
      { type: "improvement", text: "TutorialModal + economyGuide i18n — updated copy for dual-currency loop and daily systems" },
      { type: "feature", text: "buildingBanner.js — raised shop signage for Dojo, Gift Shop, Pizza Parlor matching NPC stand style" },

      // ── Multiplayer & server wiring ──
      { type: "backend", text: "server/index.js — npc_quest_accept, npc_quest_turnin, daily_npc_orders_status, forest loaner axe on arrival, fishing hole sync, PvE BJ handlers" },
      { type: "backend", text: "MultiplayerContext — dailyQuestStatus, streak claim with goldNewBalance, quest accept/turn-in senders, session timer merge" },
      { type: "backend", text: "User model — dailyBonus.streakDay, streakLastUtcDay, acceptedQuestIds on dailyNpcOrders" },
      { type: "backend", text: "Transaction types — daily_streak_gold, npc_order_turnin; UserService gold economy version on login" },

      // ── Tests ──
      { type: "backend", text: "Test suite +8 files — NpcDailyOrderService, FishingHoleService, goldEconomy, dailyBonusStreak, PveBlackjackService, expanded GameInventory/Woodcutting/Fishing tests" },

      // ── Whitepaper & docs ──
      { type: "content", text: "Whitepaper economics section — EconomyLoopCanvas, StreakRewardCanvas, RevenueFlywheelCanvas; dual-currency copy; MMORPG link to GitHub roadmap" },
      { type: "content", text: "Changelog v1.3.3 entry; README rewrites (root, waddlebet, whitepaper) with mermaid diagrams and feature hooks" },
      { type: "content", text: "waddlebet/docs economy dev plans restored — ECONOMY_GROUNDED_PLAN, ECONOMY_ROLLOUT (Step 1 ✅), MARKET_ARCHITECTURE, MMORPG_ROADMAP" },

      // ── Misc fixes & polish ──
      { type: "improvement", text: "VoxelWorld.jsx — fishing hole stock UI, NPC quest markers, merchant interaction wiring, forest axe grant hook" },
      { type: "improvement", text: "index.css — npc-trader-* styles, creator badge animations (pitch, OSS, whitepaper)" },
      { type: "improvement", text: "i18n — creatorPitch, economyGuide, fishing hole tiers, menu whitepaper badges (EN + 9 locales)" },
      { type: "fix", text: "DailyQuestHUD gold-day display — days 3 & 6 show gold reward only (not 0 $CP) in preview and claim toast" },
      { type: "refactor", text: "GameManager coin faucet removed from client minigame base class — server is sole gold authority" },
    ],
  },
  {
    version: "1.3.2",
    date: "June 16, 2026",
    title: "🔊 Zone Music, Ambient Audio & Ferry Fixes",
    description:
      "The world now has a full procedural audio layer: distinct zone soundtracks with unique percussion, proximity ambient loops at campfires and landmarks, and nearby multiplayer action sounds. Ferry cabin spawning is fixed for mobile passengers.",
    highlight: true,
    stats: { filesChanged: 38, additions: 2551, deletions: 358 },
    changes: [
      { type: "feature", text: "Procedural zone music — Auto mode picks a distinct track per room (Coastal Dawn, Forest Path, Town Square, Snow Forts, Harbor Evening, Neon Dancefloor)" },
      { type: "feature", text: "Zone-specific percussion — beach shaker, forest wood knocks, town rim clicks, snow crystal tinkles, harbor brush snare, club hi-hats (no more identical hats on every ambient loop)" },
      { type: "feature", text: "Proximity ambient SFX — campfires, town fountain, ice fishing holes, casino floor hum, dojo murmur, and pizza kitchen sizzle fade in as you approach" },
      { type: "feature", text: "Multiplayer proximity SFX — nearby players hear wood chops, item/gold drops, snowball throws, and manual chop hits without full-room spam" },
      { type: "feature", text: "Audio module (client) — music scheduler, procedural SFX, settings sync, AudioBootstrap lifecycle, and track picker in Settings → Audio" },
      { type: "feature", text: "NPC typewriter speech box — ferry captain, merchants, and travel dialogue use animated text reveal" },
      { type: "improvement", text: "Campfire crackle retuned — warmer low-pass body with audible pops; wider hear radius at docks and forest campsites" },
      { type: "improvement", text: "Snow Forts music brightened (C major I–IV–I–V); nightclub track tempo follows dance-floor energy" },
      { type: "improvement", text: "Default music volume set to 35% for new users (client + server User model)" },
      { type: "improvement", text: "Town ice ground texture extracted to TownIceGround module for cleaner room loading" },
      { type: "fix", text: "Mobile ferry passengers sometimes spawned outside the transit cabin — spawn now applies before multiplayer sync, cabin bounds clamp, and joystick input clears on travel transfer" },
      { type: "fix", text: "Ferry lobby spawn aligned server/client to cabin center (12, 10)" },
      { type: "backend", text: "proximitySfx utility — broadcastProximitySfx with distance radius, player_sfx throttling, and wood_chop_tick / snowball_throw hooks" },
      { type: "mobile", text: "Ferry boarding and transit more reliable on touch controls — movement input reset on room transfer" },
      { type: "improvement", text: "Removed looping fishing reel SFX from the ice fishing minigame" },
    ],
  },
  {
    version: "1.3.1",
    date: "June 16, 2026",
    title: "📦 World Drops, Gold Bags & Backpack Trade",
    description:
      "Drop items and gold on the ground for other players to pick up — server-authoritative, room-synced, with rotating voxel models and 5-minute despawn. Backpack drag-and-drop gets stack controls; gold drops use a money-sack model that scales with the amount.",
    highlight: false,
    stats: { filesChanged: 16, additions: 1762, deletions: 54 },
    changes: [
      { type: "feature", text: "World item drops — drag from backpack outside the window to drop items in front of your penguin; all players in the room see rotating 3D voxel models" },
      { type: "feature", text: "Shift+click a stack to drop the full quantity; shift+drag outside drops the whole stack; normal drag outside drops 1" },
      { type: "feature", text: "WorldDropService (server) — per-room drop state, proximity pickup validation, 5-minute despawn tick, snapshot on room join, rollback only on rare save failures" },
      { type: "feature", text: "Voxel drop models for fish tiers, wood logs, axes, mushrooms, bait, rods, ferry tickets, and specialty shapes (crab, squid, shark, eel, jellyfish)" },
      { type: "feature", text: "Drop gold from HUD — tap coin balance to open amount picker (presets, custom, or all); spawns a gold money-sack baggie in the world" },
      { type: "feature", text: "Gold baggie 3D model — tied sack with coins spilling out; visual size scales with dropped amount (small / medium / large piles)" },
      { type: "feature", text: "Anyone signed in can pick up drops in the same room; gold goes straight to wallet balance, items go to backpack" },
      { type: "improvement", text: "Pickup blocked upfront when backpack is full — no remove-then-rollback for inventory items" },
      { type: "improvement", text: "Penguin Maker mobile layout — title and Enter World button stack without overlap; signed-in button shows Welcome {username}" },
      { type: "backend", text: "world_item_drop / world_item_pickup / world_gold_drop handlers, GameInventoryService.removeFromSlot + canAddItem dry-run, WorldDropService unit tests" },
      { type: "fix", text: "World init crash from worldDrops scope and missing getActiveHotbarEntry import after drop system integration" },
      { type: "mobile", text: "Backpack hint text documents shift+click stack drop and drag-outside controls" },
    ],
  },
  {
    version: "1.3.0",
    date: "June 15, 2026",
    title: "🌲 Overworld Economy, Ice Ferry & Onboarding",
    description:
      "The largest gameplay update since the MMORPG pivot: a connected overworld with Captain Skipper's Ice Ferry, server-authoritative gathering (fish, wood, mushrooms), merchant NPCs, scavenge loops, and a guided 9-step onboarding quest. Backpack progression now gates on wood tiers — the grind loop begins.",
    highlight: true,
    stats: { filesChanged: 100, additions: 14537, deletions: 2297 },
    changes: [
      { type: "feature", text: "Ice Ferry travel system — Captain Skipper docks link Town Center, Snow Forts, and Forest Trails with paid tickets, 25s boarding, transit lobby, and up to 12 passengers per voyage" },
      { type: "feature", text: "TravelService (server) — route booking, group tickets (one payer buys for others), wallet-based passengers, voyage tick lifecycle, and route cooldown broadcasts" },
      { type: "feature", text: "TravelDialogueModal + TravelLobbyHUD — RPG ticket UI at docks, boarding/transit countdowns visible to passengers and dock bystanders, ferry cabin lobby room" },
      { type: "feature", text: "Travel reconnect safety — logout or disconnect mid-voyage no longer cancels or speeds transit; pending arrivals resume on reconnect with correct route quest credit" },
      { type: "feature", text: "Game backpack (server-authoritative) — separate from cosmetics: fish, wood logs, tools, bait, ferry tickets in a grid with hotbar, stack limits, and Copper Clive slot upgrades" },
      { type: "feature", text: "GameInventoryModal — drag-and-drop slots, merchant sell tray, shift+click batch queue, tier-colored wood cells (🪵), and sellable-item filtering at NPCs" },
      { type: "feature", text: "GameHotbar — 5 active tool slots synced to server; HeldGameItemBuilder renders equipped rod/axe in the penguin's flippers" },
      { type: "feature", text: "Ice fishing inventory loop — catches land in backpack (not instant gold); sell at Old Salty's Fish Stand; bait cost deducted server-side on cast" },
      { type: "feature", text: "Woodcutting system — chop harvestable trees in Forest Trails (sapling → elder), axe durability wear scales with tree stage, logs stack as pine/birch/oak/ironwood tiers" },
      { type: "feature", text: "ForestTreeWorldState — trees despawn globally for all players when harvested; server regrowth tick restores stumps over time with room broadcasts" },
      { type: "feature", text: "Mushroom clusters — forage forest mushrooms; Ranger Pike quest trades 5 mushrooms for a ferry ticket back toward town" },
      { type: "feature", text: "World merchant NPCs — Old Salty (fish buyer), Copper Clive (tools, bait, backpack upgrades), Ranger Pike (wood + forage buyer) with NpcDialogueModal shop menus" },
      { type: "feature", text: "Merchant batch sell — sellBatchAtMerchant server handler + inventory modal tray for clearing multiple stacks in one payout" },
      { type: "feature", text: "Tool tier gates — must own the previous axe/rod tier in backpack before buying the next (basic → iron → steel → master chains)" },
      { type: "feature", text: "Backpack wood grind — upgrade #1 (5→10 slots) gold-only; upgrade #2+ requires every wood type (32 each at 50% stack, scaling toward 64) plus exponential gold cost" },
      { type: "feature", text: "Scavenge spots — 10 independent town trash cans (10% for 10g, 1hr per-can cooldown); Snow Forts casino trash (guaranteed 50g, 1hr cooldown)" },
      { type: "feature", text: "Getting Started onboarding quest — 9-step server-tracked checklist (dojo gold → ferry → fish → sell → forest → chop → return → upgrade → trash) with 500g completion reward" },
      { type: "feature", text: "OnboardingQuestHUD — collapsible overlay with checkmarks, current-step hints, mobile bottom sheet, and completion toast; progress persists on User model" },
      { type: "feature", text: "Overworld zones — Snow Forts west dock (fishing holes, gold lobby slots, casino setpiece), Forest Trails cabin ambience, overworldLoader connects rooms at scale" },
      { type: "feature", text: "NpcStandBuilder shop signs — ICE FERRY, Old Salty, Copper Clive, and Ranger Pike front banners with raised/larger ferry dock signage" },
      { type: "feature", text: "NpcMarkerSprite — quest/status ! and ? markers float above shop banners instead of overlapping signs" },
      { type: "improvement", text: "Transit camera — heavy zoom inside ferry cabin lobby for a cramped-cabin feel during voyage" },
      { type: "improvement", text: "Forest Trails path polish — removed moss edge decals that caused green rectangle z-fighting on paths" },
      { type: "improvement", text: "Forest → Town ferry arrival — spawns at town center (110, 110) instead of dock edge" },
      { type: "improvement", text: "Card Jitsu minigame chat — panel moves to bottom-right so public chat no longer covers the How to Win rules panel" },
      { type: "improvement", text: "ChatLog minigameMode positioning — bottom-right in overlays, bottom-left in open world" },
      { type: "fix", text: "Press E to fish in Snow Forts — E-key handler now matches fishing prompt UI (previously town-only)" },
      { type: "fix", text: "Old Salty E-to-talk — fish buyer NPC interaction radius and dialogue open reliably at the Snow Forts dock" },
      { type: "fix", text: "Forest ranger sell error — wood_sell_ranger added to Transaction enum; ranger accepts wood and forage with batch sell" },
      { type: "fix", text: "Settings toggles — mount, green candles, and left-handed mode persist and apply correctly again" },
      { type: "fix", text: "Town ferry dock — collision, mountain backdrop, and Captain Skipper placement aligned with dock geometry" },
      { type: "fix", text: "Casino scavenge HUD — cooldown display and HUD gold refresh on successful scavenge" },
      { type: "backend", text: "New services — TravelService, WoodcuttingService, ForestTreeService, MushroomService, ScavengeService, OnboardingQuestService wired into server/index.js" },
      { type: "backend", text: "Economy config overhaul — economy.js single source for fishing bait, wood NPC values, axe durability multipliers, backpack upgrade tiers, and wood requirements" },
      { type: "backend", text: "Transaction audit types — fish_catch_inventory, wood_sell_ranger, merchant_sell_batch, travel_ticket, travel_refund, scavenge, onboarding_quest_reward, backpack_upgrade" },
      { type: "backend", text: "User model extensions — gameInventory grid, scavengeSpotCooldowns Map, onboardingQuest progress, forest tree world state collection" },
      { type: "backend", text: "Staff /warp commands — forest, snowforts, and related zone teleports for QA (staff-only)" },
      { type: "backend", text: "Test suite expanded — TravelService, WoodcuttingService, ForestTreeService, FishingService, ScavengeService, OnboardingQuestService, GameInventoryService, toolTiers, chatCommands" },
      { type: "content", text: "RESOURCE_ECONOMY_PLAN.md — design doc for fish ↔ wood ↔ craft progression, axe ROI tables, and future crafting sinks" },
      { type: "mobile", text: "Onboarding quest HUD — collapsible FAB on portrait; fishing/travel/NPC prompts repositioned above mobile hotbar" },
    ],
  },
  {
    version: "1.2.3",
    date: "June 15, 2026",
    title: "🚀 Smooth-Play Graphics & Chat UX",
    description:
      "Adaptive smooth-play rendering for fill-rate-limited devices — on by default with a Settings toggle to restore full quality. Runtime FPS detection persists the lighter path (shadows off, lower render scale, simplified materials) without blanket integrated-GPU warnings. Chat minimizes cleanly in minigames with fixed scroll and consistent bottom-left placement.",
    highlight: true,
    stats: { filesChanged: 13, additions: 540, deletions: 65 },
    changes: [
      { type: "performance", text: "Smooth-play mode — default-on lightweight render path: disables shadow pass, lowers render scale, and converts MeshStandardMaterial → MeshLambertMaterial for struggling GPUs" },
      { type: "performance", text: "Runtime FPS auto-detection — sustained sub-40 FPS after world load triggers smooth-play once; decision persisted in localStorage for instant lighter loads on return visits" },
      { type: "feature", text: "Settings → Display smooth-play toggle — turn off to restore full graphics (page reload); turn on to opt back into the lighter path without console hacks" },
      { type: "improvement", text: "Smooth-play re-applies on room change and on a timed refresh so late-spawned meshes (players, props) stay simplified while mode is active" },
      { type: "improvement", text: "Activation toast — blue in-game notice when smooth-play engages, matching the existing emergency preset downgrade toast pattern" },
      { type: "fix", text: "Integrated GPU warning removed — laptops and phones with Intel/AMD integrated graphics no longer flagged; only genuine software rasterizer failures surface in WebGL banner" },
      { type: "feature", text: "Chat minimize (desktop) — header − button collapses to a compact 💬 bar; state persisted in localStorage across sessions" },
      { type: "fix", text: "Chat positioning in minigames — panel stays bottom-left instead of center-screen so blackjack and casino UI stay visible" },
      { type: "fix", text: "Chat scroll container — vertical scrollbar and mouse wheel now target the message log only, not the tab navigation row" },
      { type: "improvement", text: "Nightclub exit banner — floating green EXIT TO TOWN sign at the teleporter replaces old voxel letters; bob animation on update" },
      { type: "backend", text: "Performance diagnostics export — support clipboard bundle now includes lowEndMode flag alongside FPS and active preset" },
    ],
  },
  {
    version: "1.2.2",
    date: "June 14, 2026",
    title: "💬 RuneScape Chat, Town Stability & Ship Polish",
    description:
      "Full tabbed chat system with global/room/whisper channels, slash commands, and minigame access on mobile. Town performance and interaction regressions fixed — portals, blackjack prompts, and walk-away dismissals work everywhere again. Unread tab glow, nightclub reconnect spawn fix, and server test suite brought current.",
    highlight: true,
    stats: { filesChanged: 36, additions: 2800, deletions: 950 },
    changes: [
      { type: "feature", text: "RuneScape-style tabbed chat — Global, Room, Whisper, Casino, Announcements, Market, and Local console with channel routing and 1,000-message server history cap" },
      { type: "feature", text: "ChatService + ChatMessage model — persisted messages, history on join, and staff command routing (/help, /warp, whisper, /r reply)" },
      { type: "feature", text: "Slash command UX — Tab autocomplete for player names and commands, private command feedback to Local tab, suggestion dropdown on desktop and mobile" },
      { type: "feature", text: "Unread tab notifications — gold pulse glow on any chat tab with new messages until opened; mobile FAB glows when chat is closed" },
      { type: "feature", text: "Global chat in minigames — MobileChatOpener FAB and overlay mode so P2P matches, solo Card Jitsu, and world overlays keep chat reachable" },
      { type: "feature", text: "Server population popup — live per-room player counts for staff and curious explorers" },
      { type: "improvement", text: "ChatLog RuneScape UI — tabbed header, custom scrollbar, z-index fixes for minigame overlays, and Enter-to-send on mobile" },
      { type: "fix", text: "Nightclub reconnect spawn — invalid corner (0,0) positions rejected on save/resume; reconnect snaps to /spawn instead of map edge" },
      { type: "fix", text: "Portal and interaction regressions — proximity interval restored for all rooms (nightclub exit, casino blackjack, igloo/dojo doors); prompts dismiss when walking away" },
      { type: "fix", text: "isMobile initialization crash — jump touch listeners moved after mobile state declaration (TDZ ReferenceError)" },
      { type: "performance", text: "Town WebGL memory — disposeThreeObject() on player mesh rebuild, room teardown, and other-player leave paths; full scene dispose on unmount" },
      { type: "performance", text: "TownCenter casino TV interval cleared on dispose; AI agents, ice fishing, and gold rain cleaned up on room change" },
      { type: "performance", text: "meshSyncVersion retry cap — stops infinite missing-appearance poll loop for remote players" },
      { type: "performance", text: "Duplicate RAF guard via updateLoopGenerationRef — prevents stacked game loops on fast room transitions" },
      { type: "backend", text: "getSavedSpawnForUser — server falls back to default nightclub spawn when saved nightclub position is invalid" },
      { type: "backend", text: "Server test suite updated — DevBot, gift handlers, igloo accessType, and MarketplaceService mocks aligned with current code (392 tests passing)" },
    ],
  },
  {
    version: "1.2.1",
    date: "June 14, 2026",
    title: "🎰 Casino Overhaul, Gold Slots & Session Resume",
    description:
      "Major casino pass: lobby gold slots with server-authoritative payouts, guest blackjack demo, exterior animation fixes, and spawn/portal polish. Players now resume where they logged out. Town igloos get a visual upgrade and the personal igloo wardrobe flow is removed.",
    highlight: false,
    stats: { filesChanged: 33, additions: 3329, deletions: 3135 },
    changes: [
      { type: "feature", text: "Gold lobby slot machines — walk up to casino lobby slots, bet 25 gold per spin, server-authoritative reels and payouts via GoldSlotsService (~93% RTP)" },
      { type: "feature", text: "GoldLobbySlotSystem — independent per-machine state, canvas-texture SlotMachineDisplay reels, and multiplayer spin sync so other players see your spins" },
      { type: "feature", text: "Guest blackjack demo — unauthenticated players get a FREE DEMO table with $1,000 demo chips; no real coin deducts or payouts" },
      { type: "feature", text: "Session resume — log back in where you left off; server persists lastRoom/lastPosition for authenticated users, localStorage covers guests and refresh" },
      { type: "improvement", text: "playerSession.js — getResumeRoom() and getResumePosition() restore room and coordinates on Enter World instead of always spawning at nightclub" },
      { type: "improvement", text: "Casino lobby interior expanded — more lobby slot machines, decor, and interaction data wired through Casino.js and TownCenter" },
      { type: "improvement", text: "Casino game-room portal moved to the red carpet east approach — enter and exit spawn at the same spot in front of the building" },
      { type: "content", text: "Town igloo visual overhaul — icy blue gradient domes, hexagonal ice panels, block ring grooves, entrance tunnels, icicles, and snow mounds" },
      { type: "content", text: "Personal igloo wardrobe removed — PenguinCreatorOverlay retired; community igloos (igloo1–10) remain the social housing layer" },
      { type: "content", text: "Pizza Parlor bar polish — martini glasses on the counter and dining tables" },
      { type: "fix", text: "Casino exterior animations restored — dice towers, front slot reels, and roof roulette no longer baked into static merged geometry (_isProtectedAnimatedMesh + skipGeometryMerge)" },
      { type: "fix", text: "Casino landmark updates run every frame when the player is within 80 units — dice spin and slot reels stay smooth on Ultra graphics" },
      { type: "performance", text: "Ultra/High refresh stutter fix — lightweight bootstrap renderer options and skip scene warmup on Ultra/High so refresh matches mid-session Potato→Ultra smoothness" },
      { type: "performance", text: "TownCenter animation cache — nightclub exterior, casino, park, and campfire updates distance-culled and frame-throttled to cut idle CPU cost" },
      { type: "performance", text: "PropsFactory nightclub exterior update path optimized — fewer redundant traversals on distant buildings" },
      { type: "backend", text: "persistPlayerLocation() — saves room and position on disconnect, logout, room change, and throttled movement; join restores saved spawn per room" },
      { type: "backend", text: "blackjack_deduct_bet / blackjack_payout no-op safely when isDemo so guest tables cannot touch real balances" },
      { type: "backend", text: "goldSlots.js server config — weighted reel stops, paytable, and GoldSlotsService spin lifecycle" },
    ],
  },
  {
    version: "1.2.0",
    date: "June 12, 2026",
    title: "⚡ Load Performance Overhaul & MMORPG Pivot",
    description:
      "Major enter-world performance pass eliminates load hitches and first-movement stutter. Product direction shifts toward an exploration and PvP-driven MMORPG on Solana. $CP redeploy explained after $CPW3 chart issues.",
    highlight: true,
    stats: { filesChanged: 15, additions: 850, deletions: 380 },
    changes: [
      { type: "performance", text: "Chunked async world build — VoxelWorld init split into phased yields so the loading screen paints and animates instead of freezing the tab" },
      { type: "performance", text: "spawnChunked() for Town Center, Snow Forts, and Forest Trails — props, buildings, and trees spawn in batches with cooperative frame yields" },
      { type: "performance", text: "Real loading progress bar driven by worldLoadProgress events — monotonic progress tied to actual build phases (GTA-style load flow)" },
      { type: "performance", text: "Deferred world init — guarantees one painted loading-screen frame before heavy Three.js work begins" },
      { type: "performance", text: "renderer.compileAsync() plus batched GPU texture pre-upload (16 per batch) to cut first-movement shader compilation hitch" },
      { type: "performance", text: "Per-building and per-AI spawn yields spread collision meshes and NPC creation across frames" },
      { type: "performance", text: "AIUpdateLoop lookup maps rebuilt only when agent arrays change — not every frame" },
      { type: "performance", text: "Preload /advert.jpg in index.html so loading-screen artwork is cached before Play is clicked" },
      { type: "improvement", text: "Removed loading-screen freeze warning — load path is now cooperative instead of blocking" },
      { type: "mobile", text: "Enter World button pinned in a fixed footer with safe-area padding — stays tappable above mobile browser chrome on portrait phones" },
      { type: "content", text: "Product pivot — WaddleBet is evolving from a social wagering hub into a full MMORPG with exploration, progression, and world PvP at the center" },
      { type: "content", text: "Exploration-first world design across Town Center, Snow Forts, and Forest Trails — larger interconnected zones and open traversal on the roadmap" },
      { type: "feature", text: "PvP layer expanding beyond minigame wagers — in-world snowball fights, walk-up challenges, and head-to-head SPL token matches anywhere in the world" },
      { type: "content", text: "MMO systems incoming: character progression, levels, deeper persistent economies, and expanded zone content" },
      { type: "content", text: "$CP redeploy — $CPW3 was not a taggable ticker on X; after ~$700k ATH a massive sell-off left the chart exposed when a third party bundled ~40% of supply and held the chart hostage" },
      { type: "content", text: "Redeployed as $CP with a proper X-taggable ticker so the community and product can grow on a chart we control — whitepaper updated across all sections" },
    ],
  },
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
      { type: "feature", text: "$CP Pebble deposits - buy pebbles with $CP at 1.5x premium rate" },
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
    title: "🚀 WaddleBet Rebrand & $CP Token Launch",
    description: "Major rebranding to WaddleBet with $CP token launch on Pump.fun. Fresh start after 700k ATH pump never supported us. Airdrop for OG holders who helped invest and get the game developed!",
    highlight: true,
    changes: [
      { type: "feature", text: "$CP token launching on Pump.fun - airdrop for early supporters and investors" },
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
    description: "Tiered status system based on $CP holdings with particle effects",
    stats: { filesChanged: 6, additions: 795, deletions: 657 },
    changes: [
      { type: "feature", text: "Whale Status nametag tiers: Standard → Bronze → Silver → Gold → Diamond → Legendary" },
      { type: "feature", text: "LocalizedParticleSystem for gold rain effects on high-tier nametags (275 lines)" },
      { type: "feature", text: "Real-time $CP balance checking via Solana RPC" },
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

/** First git commit (`init`, 2025-12-09). Changelog date strings use ranges that parse incorrectly. */
const REPO_INCEPTION = new Date(2025, 11, 9);

function getShippingMonths(): number {
  const end = new Date();
  let months =
    (end.getFullYear() - REPO_INCEPTION.getFullYear()) * 12 +
    (end.getMonth() - REPO_INCEPTION.getMonth());
  if (end.getDate() < REPO_INCEPTION.getDate()) months -= 1;
  return Math.max(1, months);
}

function formatShippingHighlight(months: number, locale: string): string {
  if (locale === "zh") return `自 2025 年 12 月起連續交付 ${months} 個月以上。`;
  return `${months}+ months of shipping since Dec 2025.`;
}

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

  const { t, locale } = useWhitepaperLanguage();
  const shippingHighlight = formatShippingHighlight(getShippingMonths(), locale);

  return (
    <section id="changelog" className="py-16 md:py-32 px-4 sm:px-6 relative">
      <div className="section-divider mb-16 md:mb-32" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-green-400 text-sm font-semibold uppercase tracking-widest">{t("changelog.kicker")}</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            <span className="text-green-400">{t("changelog.title")}</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-4">
            {t("changelog.lead")}
            <span className="text-cyan-400 font-semibold"> {shippingHighlight}</span>
          </p>
          <p className="text-slate-500 text-sm max-w-xl mx-auto mb-8">{t("changelog.localeNote")}</p>
          
          {/* Impressive stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 max-w-2xl mx-auto">
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{totalVersions}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{t("changelog.stat.releases")}</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{totalChanges}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{t("changelog.stat.changes")}</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{totalFiles.toLocaleString()}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{t("changelog.stat.files")}</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{Math.round(totalAdditions / 1000)}k+</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{t("changelog.stat.lines")}</div>
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
            {expandAll ? t("changelog.collapseAll") : t("changelog.expandAll")}
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
