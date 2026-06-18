# Grounded Economy Plan — Built on What We Have

> **Read this first.** This doc replaces over-scoped Kintara imports with extensions that fit WaddleBet as shipped.  
> Deep reference: [ECONOMY_MASTER_PLAN.md](./ECONOMY_MASTER_PLAN.md) (index/bank math) · [ECONOMY_ROLLOUT.md](./ECONOMY_ROLLOUT.md) (build order)  
> Last audit: **June 2026** — code review of `waddlebet/src` + `waddlebet/server`.

---

## 1. What players actually do today (verified)

```
Designer → Town world
  → Onboarding quest (9 steps, 500g) teaches:
       Dojo → Ferry → Fish → Sell to Old Salty → Ferry → Chop → Sell to Clive → Upgrade backpack
  → Daily loop (repeatable):
       Fish (5g bait) → sell fish │ Chop wood → sell logs │ Travel (25–35g) │ Upgrade rod/backpack (gold+wood)
  → Parallel tracks:
       Pebbles (SOL) → gacha + cosmetic marketplace
       $CP → igloo rent (10k/day) · wagers · 60min daily bonus (5k $CP)
```

**This loop works.** The problem is not missing systems — it's **gold earns faster than players need to spend it**, and there is **no way to sell surplus gold for $CP yet**.

---

## 2. Three currencies — keep it simple

One sentence each (this is all players need):

| Currency | Plain English | Live today |
|:---------|:----------------|:-----------|
| **Gold** | Money you earn playing. Spend on bait, boats, axes, puffles, casino. | ✅ Full grind loop |
| **Pebbles** | Premium coins from SOL. Gacha + player cosmetic shop. | ✅ Deposit, slots, marketplace |
| **$CP** | On-chain token. Rent igloos, wager, daily bonus. **Later:** buy gold from players. | ✅ Rent, wagers, bonus |

**Do not add a fourth earnable currency.**  
**Do not merge Pebbles into gold** — we already have two shops (gold gameplay vs pebble cosmetics).

### Who pays whom (circulation)

```
GRINDER (time)          WHALE / NEW PLAYER ($CP)         SOCIAL PLAYER
     │                            │                            │
     ▼                            ▼                            ▼
  Earn gold                  Buy gold (future)              Rent igloo ($CP)
  Spend on bait/gear         Skip grind                     Host friends
  Sell surplus gold ─────────► Matched trade                 Pebble gacha
  (future Market)            for $CP
```

Money **out** for grinders = sell gold for $CP (future).  
Money **in** for the game = SOL→Pebbles, $CP rent/wagers, $CP to buy gold (future).

---

## 3. What already creates demand (don't rebuild)

| Sink | Status | File |
|:-----|:------:|:-----|
| Bait 5g/cast | Live | `economy.js` |
| Ferry 25–35g | Live | `travel.js` |
| Axes 100–3800g | Live | `merchants.js` |
| Rod upgrade gold+wood | Live | `rodUpgrades.js` |
| Backpack upgrade gold+wood | Live | `economy.js` |
| Puffles 50–2000g + upkeep | Live | `Puffle.js` |
| Gold slots 25g/spin | Live | `goldSlots.js` |
| Blackjack | Live | `BlackjackService.js` |
| Card Jitsu 75/225g | Live | `minigameRewards.js` |

| Faucet | Status | Notes |
|:-------|:------:|:------|
| Sell fish to Old Salty | Live | NPC dialogue → backpack sell |
| Sell wood to Clive / Pike | Live | Pike 65% emergency rate |
| Mushroom quest → ferry ticket | Live | **`turnInMushroomQuest`** — our turn-in pattern |
| Onboarding 500g | Live | **`OnboardingQuestService`** |
| Gacha dupe → gold | Live | Pebble layer feeds gold |

**Natural precedent:** Ranger Pike already takes **5 mushrooms → ferry ticket**. Step 1 should extend **this pattern**, not invent a parallel economy.

---

## 4. What's actually missing (small list)

| Gap | Why it matters | Fit with our game |
|:----|:---------------|:------------------|
| **Bonus gold for material turn-ins** | Gives wood/fish purpose beyond low NPC sell | Extend `npc_quest_turnin` + NPC dialogue |
| **Daily reasons to return** | Habit | Extend `OnboardingQuestService` → 3 daily tasks |
| **More gold sinks** | Demand for gold | New rows in `merchants.js` `sells` (bait packs, emotes) |
| **Sell gold for $CP** | Grinders earn real value | New escrow market (Phase 2 of economy) — **one** market, not three |
| **Telemetry** | Tune without guessing | `Transaction` aggregates |

**Not missing (don't frankenstein):**
- ❌ Second cosmetic marketplace in gold (we have Pebble market)
- ❌ Replacing rod/backpack gold costs (onboarding teaches gold+wood)
- ❌ Server-wide merchant coffer on day one (add only if telemetry shows inflation)
- ❌ Gold Ledger / bank / index before anyone trades gold for $CP

---

## 5. Kintara lessons — what we take vs skip

| Kintara idea | WaddleBet take | Skip for now |
|:-------------|:---------------|:-------------|
| Gold is hub currency | ✅ Gold pays for gameplay; extend sinks | Copy their property UI |
| Limited merchant gold | ⚠️ **Per-player daily orders first**; server pool only if needed | Day-one global coffer UI |
| Progression before cash-out | ✅ Finish onboarding before gold listings | Account level system (use onboarding flag first) |
| Player-set gold prices | ✅ Gold↔$CP listings later | Gold-item GE duplicating Pebble market |
| Farmers + social | ✅ Already have both | — |
| Simple marketplace | ✅ One new screen when ready (Phone app later) | Three parallel markets |

---

## 6. Revised build order (simple, one step each)

| Step | What | Builds on | Player sees |
|:----:|:-----|:----------|:------------|
| **1** | **NPC daily orders** | `npc_quest_turnin`, `NpcDialogueModal` | "Salty wants 15 fish → +400g bonus" (once/day) |
| **2** | **Merchant gold shop rows** | `merchants.js` `sells`, `buyFromMerchant` | Clive sells bait bundles, trail emotes for gold |
| **3** | **Daily quest board** | `OnboardingQuestService` | 3 tasks/day, gold + XP, same HUD style |
| **4** | **Telemetry** | `Transaction` model | Ops dashboard (internal) |
| **5** | **Gold ↔ $CP listings** | `WagerSettlementService` / x402 pattern | "Sell gold" in marketplace or Phone app |
| **6** | **Ledger + bank** | Only if step 5 has volume | Chart + ATM (optional liquidity) |
| **7** | **Crafting** | `GameInventoryService.removeItem` | Lures from wood when sinks proven |
| **8** | **Phone UI** | Move 🏪📊📬 to apps | Declutter HUD |

**Current focus: Step 1 only.**

### Step 1 detail (NPC daily orders)

Mirror mushroom quest — minimal new code:

```text
Ranger Pike (existing):  5 mushrooms → ferry ticket        [already live]
Old Salty (new order):   15× any fish tier → +400 gold      [daily, per player]
Copper Clive (new order): 80× pine_log → +350 gold           [daily, per player]
```

- Handler: generalize `npc_quest_turnin` with `questId` + config in `server/config/npcOrders.js`
- UI: new dialogue action on existing NPCs (no new HUD button)
- Limit: **per-player once per UTC day** (easy to explain: "Salty's daily order")
- Emergency NPC sell stays unlimited at low rates

**No server-wide gold pool in Step 1.** If grinders inflate gold, Step 4 telemetry → add pool in Step 1b.

---

## 7. Player goals mapped to design

| Goal | How we satisfy it (grounded) |
|:-----|:-----------------------------|
| **Earn money grinding** | Step 5: sell gold for $CP to buyers. Steps 1–3 make grinding pay more gold in-game first. |
| **Put money in to progress** | Already live: SOL→Pebbles (gacha/cosmetics), $CP rent/wagers. Step 5: buy gold with $CP to skip fish/wood loop. |
| **Come back daily** | Already live: daily $CP bonus (60min). Add: Step 1 daily orders + Step 3 daily quests. |

---

## 8. Frankenstein checklist (reject if proposed)

Before any economy PR, ask:

1. Does it use an **existing** NPC / modal / service?  
2. Can a player explain it in **one sentence**?  
3. Does it add a **new currency** or **new top-level HUD button**? (bad)  
4. Does it duplicate the **Pebble marketplace**? (bad)  
5. Does it change **onboarding-taught** costs (rod/backpack) without migration plan? (bad)

---

## 9. Doc hierarchy (which file to trust)

| Question | Read |
|:---------|:-----|
| What do we build next? | **This file** + [ECONOMY_ROLLOUT.md](./ECONOMY_ROLLOUT.md) |
| How does gold index / bank math work? | [ECONOMY_MASTER_PLAN.md](./ECONOMY_MASTER_PLAN.md) §4–5 (future) |
| Wood/axe ROI tuning | [RESOURCE_ECONOMY_PLAN.md](./RESOURCE_ECONOMY_PLAN.md) |
| MMORPG zones / levels (later) | [MMORPG_ROADMAP.md](./MMORPG_ROADMAP.md) |
| Kintara comparison / demand theory | [ECONOMY_DEMAND_MODEL.md](./ECONOMY_DEMAND_MODEL.md) (reference only) |

---

*Next implementation: **Step 1 — NPC daily orders** via generalized `npc_quest_turnin`.*
