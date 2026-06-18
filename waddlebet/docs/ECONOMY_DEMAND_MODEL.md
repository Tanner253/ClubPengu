# Economy Demand Model — Reference (Kintara comparison)

> **Status:** Reference / theory doc — **not the implementation checklist.**  
> **Use instead:** [ECONOMY_GROUNDED_PLAN.md](./ECONOMY_GROUNDED_PLAN.md) for what we actually build.

This file keeps the Kintara/KINS analysis for context. The June 2026 code audit showed several proposals here were **over-scoped** for WaddleBet's current architecture.

---

## What we kept from this analysis

- **Supply needs demand** — gold must have sinks before cash-out scales
- **Floating gold price** — not vault-backed (see ECONOMY_MASTER_PLAN)
- **Progression before profit** — onboarding complete before gold↔$CP listings
- **Pebbles stay separate** — live SOL + cosmetic marketplace
- **Farmers + buyers + social** — three player types in one ecosystem

## What we simplified after code audit

| Original proposal | Grounded replacement |
|:------------------|:---------------------|
| Server-wide `MerchantGoldPool` day 1 | **Per-player daily NPC orders** (mushroom quest pattern) |
| Market A (gold items) + Market B ($CP) + Pebble market | **Pebble market (live)** + **one** gold↔$CP market later |
| Gear retune to materials-only | **Keep** gold+wood upgrades (onboarding teaches this) |
| Gold cosmetic GE | **Gold items in existing merchant `sells`** + pebble gacha for rare |
| 10-step rollout with index before trades | **8 steps** — listings before ledger/bank |

## Circulation (simplified mental model)

```
Materials → NPC sell (low) OR daily order (bonus gold) → Gold
Gold → existing sinks (bait, ferry, gear, puffles, slots)
Gold surplus → future: list for $CP → buyer puts money in
Pebbles → SOL in → gacha / cosmetic market
```

See [ECONOMY_GROUNDED_PLAN.md](./ECONOMY_GROUNDED_PLAN.md) for the full grounded plan.
