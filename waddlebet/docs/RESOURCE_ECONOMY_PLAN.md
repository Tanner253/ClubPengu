# Resource Economy & Cross-System Progression

> Companion to [ECONOMY_MASTER_PLAN.md](./ECONOMY_MASTER_PLAN.md).  
> Defines **why players want wood**, how axes pay for themselves, and how gathering loops stack (fish ↔ wood ↔ craft ↔ quests).

---

## 1. Design intent (yes, this makes sense)

Players should feel one continuous “survival economy”:

```
Fish (town pier)  ──gold──►  buy axe / bait
       ▲                           │
       │                           ▼
  better rod ◄── craft ◄── Wood (forest)
       │                           │
       └── lures / quests ◄────────┘
```

- **Early game:** gold is tight; Basic Axe + saplings = slow, modest gold (intentional sink).
- **Mid game:** wood feeds **crafting** more than NPC sell; fishing improves via rod/lures.
- **Late game:** Master Axe + elder trees = strong gold/hour; wood stockpiled for high-tier recipes & quests.
- **Future:** stone/ore/mining parallel branch; cooking & contract bundles tie species + materials.

NPC sell prices are **emergency cash**, not the primary wood sink. Crafting uses `craftValue` (higher than NPC) so hoarding logs is rational.

---

## 2. Implemented: stage-based axe wear

| Tree stage | Base durability loss | Example (Basic ×1.35) | Example (Master ×0.5) |
|------------|---------------------:|----------------------:|----------------------:|
| Sapling    | 1 | 2 | 1 |
| Baby       | 3 | 5 | 2 |
| Mature     | 6 | 9 | 3 |
| Elder      | 12 | 17 | 6 |

Formula: `loss = ceil(stageBase × axeDurabilityMultiplier)`, minimum 1.

Config: `server/config/economy.js` → `WOODCUTTING.STAGE_DURABILITY_LOSS`, `TOOLS.*.durabilityDamageMultiplier`.

**Basic axes are punished on big trees** — elders cost 17 durability per chop vs 2 on saplings.

---

## 3. Axe ROI model (NPC sell only — pre-crafting)

Assumptions: player sells **all** logs to Clive at `NPC_SELL_RATIO = 1.0`, full durability bar, optimal tree tier focus.

### Tool stats (current tuning)

| Axe | Cost | Max dur | Speed | Wear mult |
|-----|-----:|--------:|------:|----------:|
| Basic | 100g | 80 | 100% | 1.35 |
| Iron | 450g | 220 | 82% | 1.00 |
| Steel | 1,400g | 400 | 68% | 0.75 |
| Master | 3,800g | 650 | 55% | 0.50 |

### Gold per tree (NPC)

| Stage | Logs | Sell/log | Harvest gold |
|-------|-----:|---------:|-------------:|
| Sapling | 1 pine | 3g | **3g** |
| Baby | 25 birch | 6g | **150g** |
| Mature | 50 oak | 10g | **500g** |
| Elder | 100 ironwood | 16g | **1,600g** |

### Lifetime NPC gold (one full axe, single-stage farming)

| Axe | Best focus | Chops/axe | Gross gold | Net vs cost | Payback chops |
|-----|------------|----------:|-----------:|------------:|--------------:|
| Basic | Saplings | ~40 | ~120g | **+20g** | — (grind sink) |
| Basic | Elders | ~4 | ~6,400g | +6,300g | 1 chop (misleading — only ~4 elders/axe!) |
| Iron | Baby | ~73 | ~10,950g | +10,500g | 3 baby |
| Steel | Mature | ~53 | ~26,500g | +25,100g | 3 mature |
| Master | Elder | ~108 | ~172,800g | +169,000g | **3 elder (~4,800g)** |

**Reading this table:**

- **Basic + saplings:** barely profitable in gold — real cost is **time** (12s/chop, low yield). Feels grindy ✓
- **Basic + elders:** high gross but only **~4 trees per axe** and slow — bad efficiency vs Iron+ 
- **Master:** pays for itself in **~3 elder trees** (~3 min chop time), then strong surplus ✓

When **crafting sinks** go live, NPC sell share drops; masters still excel on volume + speed.

---

## 4. What wood is for (resource sinks & progression)

### Phase 1 — Live now
- Sell logs at **Copper Clive** (low NPC rate — emergency gold)
- **Backpack pressure** — large harvests need upgrades (existing gold sink)

### Phase 2 — Fishing crossover (next build)
| Recipe | Materials | Gold | Effect |
|--------|-----------|-----:|--------|
| Pro Rod upgrade | 30 birch + 15 oak + 200g | 200g | Unlock tier-2 fishing table |
| Master Rod upgrade | 50 oak + 25 ironwood + 500g | 500g | Tier-3 fishing |
| Pine Lure (×5) | 10 pine + 5 worm + 25g | 25g | +common fish weight |
| Oak Lure (×3) | 15 oak + 3 reef squid + 75g | 75g | +rare fish weight |
| Ironwood Lure (×1) | 10 ironwood + 1 marlin + 150g | 150g | +legendary bias |

Wood **craftValue** in config is ~1.6× NPC — crafting always beats selling raw logs.

### Phase 3 — Contracts & quests
- Daily board: “Deliver 8 birch + 3 clownfish” → gold + reputation
- Story quests: specific tier fish + specific log types
- Rotating **Clive commissions** burn surplus mid-tier wood

### Phase 4 — Mining & multi-resource
| Resource | Source | Feeds |
|----------|--------|-------|
| Stone | Quarry (future zone) | Igloo decor, tool handles |
| Copper/Iron ore | Mine | Steel/master axe repairs, rod parts |
| Gems | Rare mining | Lures, cosmetics |

**Tree visuals:** Harvestable forest trees use the standard snow pine prop (small / medium / large by stage) plus the green/gold interaction ring. Unique tree meshes are reserved for **future wood types** (e.g. birch grove, ironwood grove) — not the current pine/birch/oak/ironwood log tiers.

### Phase 5 — Cooking
- Fish + herb/wood fuel → buff meals (luck, chop speed, catch rate)
- Quest NPCs request meals, not raw fish

---

## 5. Gold flow principles

1. **Sinks beat faucets** — bait, lures, rods, axes, backpack, slots, igloo rent absorb gold.
2. **Materials sink via crafting** — wood/stone/fish consumed in recipes (destroy stacks).
3. **No fixed wage** — see ECONOMY_MASTER_PLAN gold index; more grinding → floating price.
4. **Tier progression** — early tools are gold sinks; top tools return investment + skill expression.
5. **Cross-link loops** — fishing funds first axe; wood funds fishing upgrades; better fishing funds master axe.

---

## 6. Tuning knobs (single source)

| Knob | File |
|------|------|
| Axe cost / durability / speed / wear | `server/config/economy.js` → `TOOLS` |
| Stage chop time & durability base | `economy.js` + `harvestableTrees.js` |
| Wood NPC vs craft value | `economy.js` → `WOOD`, `gameItems.js` |
| Tree count & respawn | `harvestableTrees.js` |
| Recipe costs (future) | `server/config/recipes.js` (TBD) |

Before changing live NPC wood prices, run ROI table in §3 and check master payback stays ~3–5 elder chops.

---

## 7. Related docs

- [ECONOMY_MASTER_PLAN.md](./ECONOMY_MASTER_PLAN.md) — gold index, $CP bridge, house edge
- [../documentation/INVENTORY_SYSTEM_PLAN.md](../documentation/INVENTORY_SYSTEM_PLAN.md) — grid, hotbar, equipment

---

*Last updated: woodcutting balance pass — stage durability loss, axe retune, wood NPC trim.*
