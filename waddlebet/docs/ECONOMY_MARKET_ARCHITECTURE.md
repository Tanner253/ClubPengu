# Economy — Market Architecture & Index Plan

> **Status:** Design reference — June 2026  
> **Related:** [ECONOMY_README.md](./ECONOMY_README.md) (index), [ECONOMY_ROLLOUT.md](./ECONOMY_ROLLOUT.md) (build order), [ECONOMY_MASTER_PLAN.md](./ECONOMY_MASTER_PLAN.md) (gold↔$CP bank math)

---

## Current state (safe to test today)

The **closed NPC loop** is implemented and hardened. No player resource market or dynamic index exists yet.

| System | Status | Currency |
|--------|--------|----------|
| Fish / wood grind → NPC sell / mint | **Live** | Gold |
| Daily NPC orders (Salty, Clive) | **Live** | Materials + gold bonus |
| Cosmetic marketplace | **Live** | Pebbles only |
| Player resource listings | **Not built** | — |
| Dynamic price index | **Not built** | — |
| Gold ↔ $CP bank / ATM | **Planned** (Step 5) | $CP |

**Verdict:** Economy is in a **good spot to test** the current rebalance (grind loop, faucets/sinks, security fixes). Do **not** open player resource trading until Phase 1 index + stronger sinks are in place.

---

## Two markets — keep them separate

### 1. Cosmetic Bazaar (existing)

- **Service:** `MarketplaceService.js` + `MarketListing` model
- **Items:** `OwnedCosmetic` instances (hats, mounts, skins, etc.)
- **Currency:** **Pebbles** (premium / SOL-backed)
- **UI:** `MarketplaceModal` from Game HUD
- **Purpose:** CS:GO / RS Grand Exchange style cosmetic liquidity

### 2. Resource Exchange (future)

- **Service:** `ResourceMarketService` (new — do not extend cosmetic service)
- **Items:** `gameInventory` stacks (fish, wood, worms, mushrooms, etc.)
- **Currency:** **Gold** first (in-game grind currency)
- **UI:** Separate modal or tab — e.g. **“Resource Exchange”** vs **“Cosmetic Bazaar”**
- **Purpose:** Player-set prices for grind materials; feeds economy index

```
Game HUD
  ├─ Cosmetic Bazaar  → Pebbles  → OwnedCosmetic escrow
  └─ Resource Exchange → Gold     → gameInventory escrow  (Phase 3)
```

**Why separate:** Different escrow models, currencies, rake rules, and exploit surfaces. Mixing them in one listing table creates pricing confusion and makes gold↔pebble arbitrage easier.

---

## If cosmetics become tradable for gold

Only consider this **after** the resource index exists. It changes the economy materially.

| Approach | Recommendation |
|----------|----------------|
| **Pebbles-only cosmetics (current)** | Keep. Clean currency separation. |
| **Some commons buyable with gold (shop)** | OK per GROUNDED §11 — fixed high prices, not player listings. |
| **Player lists cosmetics for gold** | **Avoid** unless you want gold inflation from premium items dumping. |
| **Unified “everything for gold” market** | **Do not** — collapses pebble premium identity. |

If you ever allow gold-priced cosmetic **listings**, use a **third channel** or explicit filter:

- Cosmetic Bazaar → Pebbles (default)
- Gold Style Shop → fixed catalog prices (NPC-style, not player listings)
- Resource Exchange → materials only

Never one order book where a legendary hat and 5,000 pine logs compete in the same currency without index guards.

---

## Kintara lessons (why index + separation matter)

| Failure mode | Cause | WaddleBet guard |
|--------------|-------|-----------------|
| Wood crashes to $0.50 | Open P2P supply, weak sinks, bots | No resource market until sinks proven; listing caps |
| Gold mint arbitrage | Fixed NPC recipe + floating player prices | NPC bid/mint must track index; mint cost > market cost |
| “Indians / bots dumping” | No listing friction | Listing fee, account gates, volume caps |

---

## Dynamic price index (phased)

### Phase 0 — Now (static)

- `gameItems.js` `npcValue` × `NPC_SELL_RATIO` (0.1)
- Clive mint recipes in `goldEconomy.js` (fixed)
- Daily order gold bonuses in `npcOrders.js`

### Phase 1 — Index + NPC only (no player listings)

**New:** `EconomyIndexService` + `EconomyIndex` DB collection (or embedded server state)

```javascript
// Per itemId
{
  baseValue: 3,              // design anchor (pine_log)
  indexMultiplier: 1.0,      // clamped 0.6 – 1.4
  volume24h: { npcSells: 0, npcMints: 0 },
  lastUpdated: Date
}
```

- Update multiplier from **NPC transaction volume** (sell/mint), not player trades yet
- `GameInventoryService.computeSellEntry` reads `effectiveValue = base × indexMultiplier`
- Clive mint output/input scales with index so flooded wood → lower mint payout

**Exit criteria:** No profitable loop between emergency sell ↔ mint over 24h simulated grind.

### Phase 2 — Gold bank / ATM (Step 5 in ROLLOUT)

- Establishes gold ↔ $CP reference price
- Treasury pool; wide bid/ask spread
- Trades feed gold index (separate from material index)

### Phase 3 — Player Resource Exchange (gold)

**New model:** `ResourceListing`

| Field | Notes |
|-------|-------|
| `listingId` | Unique |
| `sellerWallet` | |
| `itemId` | `pine_log`, `minnow`, etc. |
| `quantity` | Escrowed from inventory |
| `unitPriceGold` | Player-set |
| `status` | active / sold / cancelled / expired |

**Flow:** List → escrow stack → buyer pays gold → transfer stack → 5% gold rake → **record trade → update material index**

**Safeguards:**

- Listing fee (2g)
- Max stack per listing (64–128 for commons)
- Onboarding complete + playtime gate
- Daily sell volume cap per item per wallet
- NPC bid always below market median; NPC mint always above market cost

### Phase 4 — Optional Pebbles resource market

Only if gold resource market is stable for 30+ days.

---

## Index math (sketch)

```
playerMarketMedian = median(last 50 player trades, unitPriceGold)

indexMultiplier = clamp(
  0.7 × (playerMarketMedian / baseValue) + 0.3 × (npcVolumeFactor),
  0.6,
  1.4
)

npcEmergencySell = floor(baseValue × NPC_SELL_RATIO × indexMultiplier × 0.85)
npcMintGoldOut   = floor(recipeGold × indexMultiplier × 0.9)   // lower when flooded
npcMintMaterials = ceil(recipeMaterials × indexMultiplier × 1.1) // more wood when flooded
```

NPC spreads intentionally **discourage arbitrage** between player market and merchant.

---

## Testing checklist (current rebalance)

Run after **server restart + client hard refresh**.

### Security (should be impossible)

- [ ] Chat does not grant gold
- [ ] Legacy `blackjack_payout` / `blackjack_deduct_bet` rejected
- [ ] PvE blackjack only pays via `pve_blackjack_*`
- [ ] Puffle accessory / cosmetic buy rejects client-sent prices
- [ ] Migration caps at 100g
- [ ] PvP wager capped at 50g

### Grind loop (30–60 min fresh account)

- [ ] Starter rod + 12 worms → ferry (1g) → fish → sell at Salty
- [ ] Forest chop → forage worms → Clive mint or backpack upgrade
- [ ] Both daily orders completable; gold bonus received once each
- [ ] Town trash + casino trash scavenge on cooldown
- [ ] Solo Card Jitsu completes onboarding step; **no gold** granted

### Economy feel

- [ ] Gold feels scarce; ferry + bait matter
- [ ] Wood upgrades do not require gold
- [ ] Emergency sell worse than mint (wood)
- [ ] Casino BJ bets 1–50g

### Automated

```bash
cd waddlebet/server && npm test
```

Expect **346 passing** tests.

---

## Build order relative to ROLLOUT

| ROLLOUT step | Market work |
|--------------|-------------|
| **1** (now) | Daily orders + HUD — **test current economy** |
| **2** | Spin wheel — gold sink |
| **3** | Gold style shop (fixed prices) — **not** player cosmetic listings |
| **4** | Telemetry — required before index |
| **5** | Gold↔$CP bank |
| **—** | **Phase 1 index** — between 4 and 5 |
| **—** | **Phase 3 resource exchange** — after 5 + telemetry green |

---

## Key files (today)

| Area | Path |
|------|------|
| NPC sell/mint | `server/services/GameInventoryService.js` |
| Static prices | `server/config/gameItems.js`, `goldEconomy.js` |
| Cosmetic market | `server/services/MarketplaceService.js` |
| Gold tuning | `server/config/goldEconomy.js` |
| Live balance tuning | `server/config/goldEconomy.js`, `npcOrders.js`, `dailyBonusStreak.js` |

---

*Last updated: June 2026*
