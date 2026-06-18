# Economy & Game Design Docs — Index

> **Start here** for internal development. Public-facing summary: [whitepaper](../whitepaper) · [root README](../../README.md)

---

## Pricing model (canonical)

| Layer | How it works |
|-------|----------------|
| **Gold** | Infinite soft currency. Fish, wood, dailies, PvP wagers. Sinks: bait, ferries, gear, puffles, casino. |
| **Gold → $CP** | **Player market + bank quotes** when live. Not tied to circulating gold supply. |
| **$CP / USD** | **DEX only.** In-game gold supply does not move the token price. |
| **$CP demand** | Igloo rent, SPL wagers, 7-day login streak, cosmetic bazaar (planned). |
| **Pebbles** | SOL-backed premium. Gacha + cosmetic bazaar only — not a grind cash-out path. |

---

## Read in this order

| # | File | Purpose |
|:--|:-----|:--------|
| 1 | **[ECONOMY_GROUNDED_PLAN.md](./ECONOMY_GROUNDED_PLAN.md)** | Canonical strategy — currencies, retention, daily loop |
| 2 | **[ECONOMY_ROLLOUT.md](./ECONOMY_ROLLOUT.md)** | Build order + exit criteria — **what to ship next** |
| 3 | **[ECONOMY_MARKET_ARCHITECTURE.md](./ECONOMY_MARKET_ARCHITECTURE.md)** | Two markets, index phases, safeguards |
| — | **[ECONOMY_MASTER_PLAN.md](./ECONOMY_MASTER_PLAN.md)** | Gold index, bank math, escrow (Step 5+) |
| — | **[INVESTOR_ECONOMY_BRIEF.md](./INVESTOR_ECONOMY_BRIEF.md)** | Partner / investor one-pager |

---

## Specialized references

| File | Purpose |
|:-----|:--------|
| [RESOURCE_ECONOMY_PLAN.md](./RESOURCE_ECONOMY_PLAN.md) | Wood/axe ROI tuning tables |
| [MMORPG_ROADMAP.md](./MMORPG_ROADMAP.md) | Zones, levels, PvP, long vision |
| [COSMETICS_ROADMAP.md](./COSMETICS_ROADMAP.md) | Art/voxel implementation checklist |
| [ECONOMY_DEMAND_MODEL.md](./ECONOMY_DEMAND_MODEL.md) | Kintara comparison (reference only) |
| [EUPHORIA_INTEGRATION.md](./EUPHORIA_INTEGRATION.md) | Euphoria iframe wagering integration spec |
| [EUPHORIA_CHECKLIST.md](./EUPHORIA_CHECKLIST.md) | Euphoria quick checklist |

---

## Shipped vs next (June 2026)

| Area | Status |
|:-----|:-------|
| Closed NPC grind loop (fish/wood/bait) | ✅ Live |
| Daily Quest HUD + NPC contract accept/turn-in | ✅ Shipped |
| Tarkov-style merchant UI | ✅ Shipped |
| 7-day login streak (CP days + gold-only days 3 & 6) | ✅ Shipped |
| Tier 1 economy fixes (sell math, Clive gold, loaner axe) | ✅ Shipped |
| Economy Guide (Settings) + Tutorial | ✅ Live |
| Daily spin wheel | 📋 Step 2 |
| Gold merchant shop + spend hints | 📋 Step 3 |
| Telemetry (gold created vs destroyed) | 📋 Step 4 |
| Gold ↔ $CP player market | 📋 Step 5 |
| Bank ATM / ledger | 📋 Step 6 |
| Crafting (`recipes.js`) | 📋 Step 7 |
| Phone UI shell | 📋 Step 8 |

**Next implementation focus:** [ECONOMY_ROLLOUT.md](./ECONOMY_ROLLOUT.md) Step 2 — daily task rotation + spin wheel.

---

*Last updated: June 2026*
