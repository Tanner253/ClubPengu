# Economy Rollout — Build Order

> **Start here for implementation.** Strategy: [ECONOMY_GROUNDED_PLAN.md](./ECONOMY_GROUNDED_PLAN.md)  
> Future math (index, bank): [ECONOMY_MASTER_PLAN.md](./ECONOMY_MASTER_PLAN.md)  
> Last audit: **June 2026** — verified against live `waddlebet` code.

---

## Rules

1. **One step at a time** — exit criteria before next step.
2. **Extend existing patterns** — NPC dialogue, `npc_quest_turnin`, `OnboardingQuestService`, `OnboardingQuestHUD`.
3. **Economy + retention ship together** in Steps 1–2 — backend without visible daily loop does not move DAU.
4. **No new currencies.** Pebbles + gold + $CP only.
5. **No new top-level HUD buttons** until Phone shell (Step 8). Daily loop uses the **onboarding quest panel slot**.
6. **Gold↔$CP market only after** sinks + telemetry show gold accumulating.
7. **Pebbles marketplace unchanged** — do not duplicate with a gold cosmetic GE.

---

## Live today vs sticky today

| Backend works | Player habit / discoverability |
|:--------------|:-------------------------------|
| Fish → sell; chop → sell | No daily reason to visit NPCs after onboarding |
| Onboarding 9-step HUD | **Vanishes** after reward — cliff |
| Daily $CP bonus (60 min) | Hidden behind 🎁; progress only in modal |
| Pebble deposit, igloo rent, wagers | Not on any checklist or quest log |
| Mushroom quest | Not surfaced after onboarding |

**Target:** Runescape / MapleStory / Club Penguin style — **“Today” panel always answers what to do next.**

---

## Build order

| Step | Deliverable | Exit criteria |
|:----:|:------------|:--------------|
| **1** | **Daily Quest HUD + NPC daily orders** | ✅ **Shipped** — contract accept, HUD tracker, trader UI |
| **2** | **Daily task rotation + spin wheel** | ✅ **Shipped** — spin wheel live; generic daily tasks 📋 next |
| **3** | **Gold merchant shop + spend hints** | New `sells` at merchants; rotating footer hints for pebbles/$CP sinks |
| **4** | **Telemetry** | Daily gold created vs destroyed query |
| **5** | **Gold ↔ $CP market** | Escrow listings; onboarding complete + wallet gate; 5% rake |
| **6** | **Ledger + bank** | Only if step 5 has trades |
| **7** | **Crafting** | `recipes.js`; after sinks proven |
| **8** | **Phone UI** | Marketplace, ledger, inbox as apps; trim HUD |

**Current focus: Step 2** (daily task rotation — prize wheel spec only; see [DAILY_SPINNER.md](./DAILY_SPINNER.md)).

See **[DAILY_SPINNER.md](./DAILY_SPINNER.md)** for planned free spin + paid **`$CP`** roll design (not implemented).

---

## Step 1 — Daily loop package

### Why one step, not orders-only

NPC orders alone are invisible if players don't know to walk to Salty. The onboarding HUD proved the right UX — we **keep that panel** and fill it with dailies.

### A. Daily Quest HUD (client)

Extend `OnboardingQuestHUD.jsx` (or sibling `DailyQuestHUD.jsx`):

| Row | Source | Behavior |
|:----|:-------|:---------|
| Salty's catch order | `npcOrders` status WS | Highlight next; `[Go]` sets waypoint / hint |
| Clive's timber order | same | same |
| Daily bonus | `daily_bonus_status` | `34/60 min` bar; claim button when ready |
| Optional mushroom | existing quest | Show if ferry ticket path useful |

- Panel title: **"Today"** after onboarding; **"Getting Started"** before.
- Auto-expand on login when any row incomplete.
- Claim $CP from panel (reuses existing `daily_bonus_claim`).
- Footer: rotating spend hint (pebbles gacha, $CP igloo, gold upgrades).

**Touchpoints:** `OnboardingQuestHUD.jsx`, `GameHUD.jsx`, `MultiplayerContext.jsx` (status merge), i18n.

### B. NPC daily orders (server)

| questId | NPC | Requires | Reward | limit |
|:--------|:----|:---------|:-------|:------|
| `salty_daily_catch` | fish_buyer | 15× fish | 400 gold | 1/player/day |
| `clive_daily_timber` | supply_merchant | 80× pine_log | 350 gold | 1/player/day |

- `server/config/npcOrders.js` (new)
- `turnInNpcOrder(wallet, questId)` in `GameInventoryService.js`
- `npc_quest_turnin` accepts `questId`
- `worldNpcs.js` — dialogue shows order + turn-in action
- Optional: `!` marker on NPC when order completable
- `Transaction` type: `npc_order_turnin`

### C. Exit criteria (Step 1)

- [ ] New player finishes onboarding → panel becomes "Today" without disappearing
- [ ] Player can complete Salty + Clive orders and see checks on panel
- [ ] Player sees 60 min progress without opening 🎁 modal
- [ ] Player can claim daily bonus from panel
- [ ] At least one spend-path hint visible on panel

### Out of scope

Gold market, ledger, crafting, Phone UI, pebble economy changes, gear rebalance.

---

## Step 2 — Daily task rotation

Generic tasks on the same HUD (server: extend `OnboardingQuestService` or `DailyQuestService`):

- Catch N fish
- Chop N logs
- Win/play one minigame (Card Jitsu, blackjack, etc.)

Midnight UTC reset. Small gold reward per task + bonus for all three.

---

## Phone UI (Step 8 — design only)

Daily Quest HUD stays on screen (RS quest log). Phone holds commerce/social apps later.

| Stays visible | Phone apps (later) |
|:--------------|:-------------------|
| Gold, Today quest panel, hotbar | Marketplace, gold market, ledger, inbox |

---

## Doc maintenance

When a step ships: mark ✅ here, update `ECONOMY_GROUNDED_PLAN.md`, changelog if player-facing.

---

*Next action: **Step 1 — Daily Quest HUD + NPC daily orders**.*
