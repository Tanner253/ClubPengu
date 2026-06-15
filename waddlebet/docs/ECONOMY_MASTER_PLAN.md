# Waddlebet Economy Master Plan

> Living design doc for the fishing grind loop, material inventory, daily contracts, gold index, and gold ↔ $CP bridge.  
> Aligns with existing systems: `user.coins`, `OwnedCosmetic` inventory, `FishingService`, `MarketplaceService`, `DailyBonusService`, custodial `$CP` wallet, pebble marketplace.

---

## 1. Design goals

| Goal | How we achieve it |
|:-----|:----------------|
| **Rewarding but balanced grind** | Prices scale to hours-of-play targets; early game is rough, gear unlocks smoother fishing |
| **Real value for gold** | Public gold index priced from actual trades; USD display via live `$CP` spot price |
| **Sustainable $CP outflow without player caps** | No arbitrary “you earned enough $CP today” limits — sustainability via **sinks, spreads, and floating price**, not hard earn ceilings |
| **House edge always** | Bank spreads, marketplace rake, casino RTP, bait/lure consumption — treasury never pays fixed $CP per unit of grind |
| **Server authority** | Catches, inventory, bank trades, and index inputs are server-validated and logged in `Transaction` |
| **Grandfather existing balances** | Current `user.coins` stay; rebalance via **prices and NPC rates**, not coin wipes |

---

## 2. How Kintara-style “gold with a stock price” actually works

This is **not** a vault where every gold coin is backed 1:1 by tokens in a pool. That mental model leads to bankruptcy.

### What competitors are doing (Kintara pattern)

From their public UI and trades:

1. **Gold is earned in-game** through grind (fishing, etc.).
2. **Gold is sold for their token** (`$KINS`) via a marketplace or house buyback.
3. **The “gold price”** (e.g. $3.44 USD) is an **index derived from real trades** — “priced via marketplace, curated daily.”
4. **Token → USD** comes from the token’s market price (DEX/oracle).
5. **Gold → token** at settlement:  
   `gold_to_token = (gold_amount × gold_usd_index) / token_usd_price`  
   Example: 1,000 gold × $4.00 / $0.011 per `$KINS` ≈ 250k `$KINS`.
6. **“Gold in market”** is a transparency metric — circulating / listed gold supply, not a reserve denominator.
7. **Price moves** because trade prices move (thin early liquidity → big swings; later more volume → stabler index).

### What it is NOT

| Myth | Reality |
|:-----|:--------|
| “Put $CP in a vault and divide by gold supply” | Fixed-ratio backing — if gold supply grows faster than vault, either price crashes or you insolvently overpay |
| “Unlimited $CP for unlimited grind” | Without floating price + sinks, treasury drains |
| “Capped daily $CP is the only sustainability tool” | Caps frustrate dedicated players; **dynamic price + spreads + sinks** scale better |

### Waddlebet model (recommended)

**Three-layer value stack:**

```
Layer 1: Gold (soft)     — earned by play, spent on sinks, sold for $CP
Layer 2: Gold Index      — public USD price from trade history (market discovery)
Layer 3: $CP (on-chain)  — SPL token with external USD price (DEX/oracle)
```

**Sustainability without earn caps:**

- When more players grind → **more gold supply** → index **falls** → each gold unit pays **fewer $CP** automatically.
- **Sinks** (bait, lures, rods, puffles, slots, inventory upgrades) remove gold continuously.
- **Bank spread** keeps a margin on every gold ↔ $CP conversion (platform edge).
- **Treasury liquidity** for bank buybacks is funded by **revenue** (rake, spreads, house edge), not infinite mint.

Dedicated players can grind unlimited hours; their **hourly $CP value floats with the market**, like a commodity, not a fixed wage.

---

## 3. Currency roles in Waddlebet

| Asset | Storage | Earn | Spend / sink |
|:------|:--------|:-----|:-------------|
| **Gold** | `user.coins` (wallet field) | Sell fish at NPC, contracts, minigames, bank sell-side | Bait, lures, rods, puffles, slots, inventory upgrades, bank buy-side |
| **Fish** | `GameInventory` (grid stacks) | Fishing (server-validated catch) | Sell at Fish Buyer NPC for gold |
| **Gear** | Inventory + equipment slots | Shops (gold / later $CP) | Consumed (bait/lure) or durable (rod) |
| **$CP** | On-chain wallet + custodial payouts | Bank gold buyback, player market sell, daily bonus, wagers won | Igloo rent, wagers, bank gold purchase, inventory upgrades |
| **Pebbles** | `user.pebbles` | SOL deposit | Gacha, cosmetic marketplace (unchanged) |
| **Cosmetics** | `OwnedCosmetic` (existing 150+ slot system) | Gacha, marketplace | Separate from gameplay inventory |

**Important:** Gameplay inventory (fish, bait, rods) is a **new system**, separate from cosmetic `OwnedCosmetic` inventory.

---

## 4. Gold index & Waddle Gold Ledger

### Service: `GoldIndexService`

Computes and publishes the public gold price used by bank, UI ledger, and trade settlement.

**Inputs (every completed trade):**

| Event | Recorded fields |
|:------|:----------------|
| `bank_gold_buy` | gold_amount, cp_paid, wallet, timestamp |
| `bank_gold_sell` | gold_amount, cp_received, wallet, timestamp |
| `gold_market_listing_fill` | gold_amount, cp_paid, buyer, seller, timestamp |

**Derived metrics:**

| Metric | Calculation |
|:-------|:------------|
| `circulating_gold` | Sum of all `user.coins` (server query, cached) |
| `gold_in_escrow` | Gold locked in market listings + bank settlement queue |
| `last_trade_price_cp` | Per-gold $CP from most recent settled trade |
| `vwap_24h_cp` | Volume-weighted average $CP per gold, last 24h |
| `curated_daily_price_cp` | Daily snapshot (e.g. 00:00 UTC VWAP or median of trades) — **chart reference** |
| `gold_usd` | `curated_daily_price_cp × cp_usd_oracle` |
| `change_24h_pct` | vs prior curated daily point |

**Oracle:** `$CP/USD` from Jupiter / DexScreener / cached API (same infra pattern as pebble SOL equivalence).

**UI: Waddle Gold Ledger** (ATM + web panel)

- Circulating gold
- Live gold → $CP and gold → USD
- 24h / 7d price chart
- Calculator: “X gold = Y $CP = Z USD”
- Footnote: “Priced via marketplace & bank trades — curated daily”

### Anti-manipulation

- Minimum trade size for index inclusion (e.g. 1,000 gold)
- Outlier trimming (exclude top/bottom 5% of trade prices in VWAP)
- Wash-trade detection (same-wallet ring limits)
- Separate **display index** from **settlement quote** (bank uses real-time quote with spread, chart uses smoothed daily)

---

## 5. Bank / ATM (casino street)

### Placement

Interactable **ATM prop** outside the casino in town (full bank building later).

### Two-sided desk (platform-beneficial spreads)

| Side | Player action | Gold | $CP | Platform edge |
|:-----|:--------------|:-----|:----|:--------------|
| **Buyback (bid)** | Player sells gold for $CP | −gold (burned to treasury pool) | +$CP to player | Bank pays **below** index (e.g. index × 0.92) |
| **Sell (ask)** | Player buys gold with $CP | +gold (minted from pool or escrow) | −$CP from player | Bank charges **above** index (e.g. index × 1.08) |

**Spread example:** Index = 100 $CP per 1,000 gold  
- Player sells 1,000 gold → receives 92 $CP  
- Player buys 1,000 gold → pays 108 $CP  

The 16 $CP spread per round-trip is house edge.

### Treasury pool mechanics

```
TreasuryGoldPool   — gold absorbed from buybacks (sink accounting)
TreasuryCPBudget   — $CP allocated from revenue for buybacks
```

**Buyback flow:**

1. Player requests sell X gold at current bank bid.
2. Server deducts gold, credits $CP from custodial wallet (on-chain transfer).
3. Gold added to `TreasuryGoldPool` (not re-minted freely).
4. Trade logged → feeds index.

**Sell flow:**

1. Player pays $CP at bank ask.
2. Gold issued from `TreasuryGoldPool` first; if pool empty, **limited daily mint** tied to prior sink volume (never unbounded).
3. $CP goes to treasury revenue.

**Liquidity guard:** If `TreasuryCPBudget` for the period is exhausted, bank buyback pauses (players use player market). Bank sell can remain at higher spread. This prevents insolvency without capping individual player grind — the **market price adjusts**, not the player.

### Relationship to player market

Ship **bank first** (ATM testing), then **player listings**:

| Channel | Role |
|:--------|:-----|
| **Bank** | Instant fill, wide spread, liquidity of last resort, sets index floor/ceiling |
| **Player market** | Better prices for patient traders; escrow listings; 5% $CP rake |

Bank establishes a **reference price**; player market tightens around it.

---

## 6. Fish economy (primary grind)

### Flow (replaces instant coin on catch)

```
Equip rod + bait/lure → pay bait cost (gold sink) → fishing minigame
  → server validates catch → fish stack added to GameInventory
  → walk to Fish Buyer NPC → sell stack for gold (rod sell multiplier)
  → optional: ATM sell gold for $CP
```

### Server authority

- Client sends: `spotId`, `depth`, `sessionToken`, `reelOutcome` (future skill check).
- Server rolls fish from: `fishingSkill`, `equippedRod`, `bait/lure`, `depth band`, `RNG`.
- Client fish table is **display only**; payout species must match server roll.
- Anti-cheat: rate limits, session tokens, max fish/hour soft throttle only if exploit detected (not normal grind cap).

### Fish Buyer NPC

- Location: near town fishing pond.
- Sells player fish **for gold only** (per decision #1).
- Price = `species_base_value × rod_sell_multiplier × lure_bonus`.
- Same emoji/icon as caught fish in inventory.

### Fishing skill (account sub-skill)

- XP per catch and per completed run.
- Effects: slightly better rare odds, unlock bait/lure tiers, unlock zones later.
- **Separate from account level** (account level comes later for gates/unlocks).
- No level degradation, ever.

### Gear progression (gold sinks)

| Tier | Rod | Bait | Lure | Feel |
|:-----|:----|:-----|:-----|:-----|
| 0 | Twig Rod (starter) | Worm | None | Rough — low sell mult, basic fish table |
| 1 | Bamboo Rod | Shrimp | Basic spinner | Noticeable improvement |
| 2 | Carbon Rod | Squid strip | Flash lure | Good rare odds |
| 3 | Pro Rod | Premium bait | Specialty lures | 2× sell multiplier at NPC |

All bait/lures are **consumed per cast** (endless sink). Rods are durable (gold or $CP purchase).

### Ice fishing minigame updates

| Area | Change |
|:-----|:-------|
| **Economy** | No instant gold; catch → inventory |
| **Difficulty** | Deeper = harder dodge lanes; rarer fish require depth + gear |
| **Skill check (optional v1.5)** | Short reel tension minigame on rare bite — fail = fish escapes, bait still consumed |
| **Visuals** | Updated creature sprites/icons shared with inventory UI |
| **Social** | Legendary catch room broadcast + ledger “trophy catch” stat |

---

## 7. Game inventory system (Minecraft-style)

### New model: `GameInventory` + `ItemStack`

Separate from `OwnedCosmetic` (cosmetics/gacha).

**Grid:**

- Default: e.g. `10 × 6 = 60` slots (tunable in `economy/config.js`).
- Each slot: `{ itemId, quantity, metadata }` or empty.
- Stack limits per item type (fish: 64, bait: 99, rods: 1).

**Interactions (v1 scope):**

| Action | Behavior |
|:-------|:---------|
| **Stack** | Same `itemId` + metadata merges |
| **Drag & drop** | Reorder within grid |
| **Split stack** | Shift-click / drag half |
| **Drop** | Remove from inventory, spawn world drop entity; other players can pick up |
| **Pickup** | Add to inventory if space |

**Equipment slots (outside grid):**

- Rod, active lure, optional cosmetic bobber

**Upgrades (sinks):**

| Upgrade | Cost options | Effect |
|:--------|:-------------|:-------|
| +1 row (10 slots) | Gold OR $CP | More carry capacity |
| Max upgrades | Cap (e.g. 10 rows → 120 slots) | Prevents infinite hoarding |

Existing cosmetic inventory upgrades (`user.upgradeInventory`, 5,000g) remain for gacha items — **two inventories, two upgrade tracks**.

---

## 8. Daily contracts

Contract board (HUD tab or town kiosk). Resets midnight UTC.

**Example dailies:**

| Task | Reward |
|:-----|:-------|
| Catch 10 fish (any) | Gold + fishing XP |
| Sell 500g worth of fish at NPC | Gold bonus |
| Win 1 arcade game | Gold |
| Complete 3 fishing runs without jellyfish stings | Gold + small $CP bonus |

**Perfect day bonus:** Completing all dailies → extra gold + **$CP bonus priced at current gold index** (not a fixed 5,000 $CP — scales with market).

No cap on how many days a dedicated player can complete — sustainability is in the **bonus size formula** tied to index and treasury budget, not refusal to pay.

---

## 9. Economy rebalance framework

Design prices from **target hours**, not vibes.

### Reference grind rate (post-rebalance target)

Assume mid-game player with Bamboo Rod:

- ~10–15 fishing runs/hour (after minigame tuning)
- ~80–150 gold/hour **net** after bait costs (before gear investment)

### Target price anchors

| Item | Target hours | Example price @ 120g/hr net |
|:-----|:-------------|:----------------------------|
| Mythic puffle | 50–60 hr | 6,000–7,500 gold |
| Pro rod (2× sell) | 15–20 hr | 1,800–2,400 gold |
| Inventory row upgrade | 3–5 hr each | 400–600 gold |
| Basic bait (per cast) | — | 8–15 gold |
| Premium bait (per cast) | — | 25–40 gold |

### Current vs target

| Item | Current | Problem |
|:-----|:--------|:--------|
| Mythic puffle | 2,000g | ~15–20 hr today; too cheap |
| Starting coins | 100g | OK if bait costs rise |
| Instant fishing payout | up to 1,000g/catch | Bypasses inventory sink design |

**Migration:** Grandfather `user.coins`. Raise shop/NPC/puffle prices. Move fishing to inventory sell loop. Existing rich players keep gold but face new sinks.

All tunables live in **`server/config/economy.js`** (single source of truth).

---

## 10. $CP sustainability without player earn caps

### Faucets (sources of $CP to players)

| Faucet | Control mechanism |
|:-------|:------------------|
| Bank gold buyback | Bid below index; treasury budget from revenue |
| Player market | Buyer pays $CP (zero-sum between players) |
| Daily bonus (existing) | Keep 1hr session + 24h cooldown OR tie amount to index |
| Daily contract perfect day | Small; index-linked |
| Wager wins | Zero-sum (losers fund winners; rake burns) |

### Sinks (sources of $CP from players)

| Sink | Notes |
|:-----|:------|
| Igloo rent | Existing |
| P2P wagers + rake | Existing |
| Bank gold purchase (ask side) | Premium over index |
| Marketplace rake | 5% on gold listings |
| Inventory upgrades ($CP option) | Optional premium path |
| Gacha/pebbles | Parallel economy |

### Balance identity (simplified)

```
Net $CP outflow ≈ (gold_grinded × bank_bid_price) + bonuses
Net $CP inflow  ≈ sinks + spreads + rake + bank_ask_premium

Sustainable when: inflow ≥ outflow at equilibrium
```

When gold is over-farmed: index drops → bid drops → $CP/hour drops automatically.

**No “you hit your daily $CP cap”** — instead **“gold is worth less today because supply is high.”**

---

## 11. Transaction & telemetry types (new)

Extend `Transaction.type` enum:

```
fish_catch_inventory    — fish added to inventory (no gold)
fish_sell_npc           — fish → gold at buyer NPC
fishing_bait            — (existing) bait consumed
fishing_lure            — lure consumed
gear_purchase           — rod/bait/lure shop
inventory_upgrade       — grid slot purchase
game_item_drop          — dropped to world
game_item_pickup        — picked up from world
bank_gold_buy           — player sold gold for $CP
bank_gold_sell          — player bought gold with $CP
gold_market_list        — escrow lock
gold_market_cancel      — escrow release
gold_market_fill        — P2P trade settle
contract_reward         — daily contract payout
gold_index_snapshot     — daily curated price record
```

**Economy dashboard (admin):** gold minted/burned, $CP faucet/sink, index history, treasury pool levels.

---

## 12. Phased implementation (no dates — dependency order)

### Phase 0 — Spec & config

- [x] `server/config/economy.js` — stack limits, bait cost, NPC sell ratio, rod/bait stubs
- [x] `server/config/gameItems.js` — fish catalog (41 species), bait, rod definitions
- [x] `GameInventory` + `fishingProgress` on `User` schema
- [ ] `GoldIndexService` schema + snapshot job
- [ ] Rebalance spreadsheet/sim validated against target hours

**Exit criteria:** Config drives sim; team agrees on mythic puffle = ~50hr target.

---

### Phase 1 — Inventory foundation + fishing v2 (single vertical slice)

These systems overlap — ship them as **one integrated slice**, not separate passes.

**Build order (strict dependency chain):**

| Step | Deliverable | Status |
|:-----|:------------|:-------|
| 1a | `economy.js` + `gameItems.js` catalog | ✅ Done |
| 1b | `GameInventoryService` + User schema + WS API | ✅ Done |
| 1c | `GameInventoryModal` grid UI (tap move, sell) | ✅ MVP |
| 1d | Fishing → inventory (no instant gold for authed) | ✅ Done |
| 1e | Reel tension minigame on bite | ✅ Done |
| 1f | Ice fishing visual/difficulty pass | ⏳ Pending |
| 1g | Fish Buyer NPC in world | ⏳ Sell API only (HUD modal) |
| 1h | Bait purchase + per-cast consumption | ✅ Existing 5g bait |
| 1i | Starter rod + tier-1 rod shop | ⏳ Pending |
| 1j | World drop + proximity pickup | ⏳ Pending |
| 1k | Rebalance puffle/shop prices via config | ⏳ Pending |

**Exit criteria:** Cast → reel minigame → fish in grid → sell at NPC → afford bait loop. Drops work in world.

---

### Phase 2 — Daily contracts

- [ ] `ContractService` + progress tracking
- [ ] Contract board UI
- [ ] Rewards: gold + fishing XP; perfect-day index-linked $CP
- [ ] Telemetry hooks

**Exit criteria:** Three dailies completable in one session; rewards logged.

---

### Phase 3 — Gear depth + world drops

- [ ] Rod tiers 2–3, lures, sell multipliers
- [ ] Drop item to world + pickup by other players
- [ ] Inventory slot upgrades (gold / $CP)
- [ ] Optional reel skill-check minigame on rare fish

**Exit criteria:** Starter vs Pro rod feel meaningfully different over 10+ runs.

---

### Phase 4 — Gold index + ATM bank

- [ ] `GoldIndexService` — record trades, compute VWAP, daily curated price
- [ ] `$CP/USD` oracle integration
- [ ] ATM prop outside casino + bank UI (buy/sell gold)
- [ ] Waddle Gold Ledger UI (chart, calculator, circulating supply)
- [ ] Custodial $CP settlement on bank buyback
- [ ] Treasury pool accounting

**Exit criteria:** Bank trade moves index; ledger displays gold/USD; spread captured in treasury.

---

### Phase 5 — Player gold market

- [ ] Escrow listings (gold locked on list)
- [ ] On-chain $CP settlement (reuse wager/igloo payment infra)
- [ ] 5% rake; trade feed updates index
- [ ] Order history in ledger

**Exit criteria:** Player sells gold cheaper than bank bid; buyer gets better ask than bank.

---

### Future (out of current scope)

- Woodcutting (Forest Trails)
- Parkour checkpoint bounties
- Account level (gates, not fishing skill)
- Full casino bank building interior
- Wood → craft → advanced lures

---

## 13. Resolved product decisions

| # | Decision |
|:--|:---------|
| 1 | Fish → **gold only** at NPC; $CP via bank/market |
| 2 | **ATM** outside casino for bank UI (building later) |
| 3 | **Bank first**, player market second — same index |
| 4 | **Grandfather** existing coin balances |
| 5 | **Grid inventory**, stackable fish icons, drag/drop, world drops |
| 6 | **Fishing skill** + rods + bait + lures; rough start, pleasant endgame gear |
| 7 | **Fish Buyer NPC** for gold; ATM for gold ↔ $CP |
| 8 | **No player $CP earn caps** — sustainable via floating index + sinks + spreads |

---

## 14. Resolved design decisions (Phase 4 bank prep)

| # | Question | Decision |
|:--|:---------|:---------|
| 1 | **Treasury / rake funding** | Use existing revenue: ~5% wager rake, ~5% pebble withdrawal, ~7% gold slots RTP, planned 5% gold market rake, ~8% bank bid/ask spread. Split net $CP: ~50% bank buyback liquidity, ~30% developer reserve, ~20% faucets (daily bonus, contracts). |
| 2 | **Daily bonus** | Move from flat 5,000 $CP to **index-linked USD target** (~$5/day buying power via `floor(usd_target / cp_usd_price)`). |
| 3 | **Bank gold pool** | **Pool-first:** buybacks fill `TreasuryGoldPool`; bank sell pulls from pool; **pause bank sell when empty** (no unlimited mint). |
| 4 | **World drops** | Minecraft rules: drag-drop with stack slider, proximity pickup when inventory has space. Despawn TBD in implementation. |
| 5 | **Reel minigame** | **Phase 1** — shipped after inventory infra, before piling on more systems. Fail = lose fish; bait still consumed. |

**Still open for Phase 4:** exact weekly % allocation from each rake source into `TreasuryCPBudget`; world drop despawn timer; PvP loot rules.

---

## 15. Glossary

| Term | Meaning |
|:-----|:--------|
| **Gold / coins** | Soft currency (`user.coins`) |
| **Index** | Public $CP-per-gold price from trade history |
| **Curated daily** | Smoothed snapshot for charts (not a separate price floor) |
| **Bid** | Bank buys gold from player (player receives $CP) |
| **Ask** | Bank sells gold to player (player pays $CP) |
| **Spread** | Bid/ask gap — platform house edge |
| **Sink** | Anything that removes gold or $CP from circulation |
| **Treasury pool** | Accounting bucket for gold/$CP liquidity — not 1:1 backing |

---

## 16. Summary

Waddlebet gold gets **real value** the same way Kintara gold does: **people trade it for a token with a USD price**, and the game publishes an index from those trades. It is not a static vault ratio.

Our sustainable twist for dedicated grinders:

- **Uncapped play time**
- **Floating commodity price** (more grind → more supply → lower unit price)
- **Heavy gold sinks** (bait forever, gear ladder, rebalance puffles)
- **Bank + market spreads** (platform always earns on conversion)
- **Treasury liquidity bounded by revenue**, not promises

The work ahead is incremental: **config → inventory → fishing v2 → contracts → gear → index/ATM → player market**, testing each phase before the next.
