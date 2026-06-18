# WaddleBet — Game Client & Server

3D voxel social MMO with a **closed NPC economy loop**, on-chain $CP rewards, and P2P wagering.

## Quick start

```bash
npm install
npm run dev          # Vite client → http://localhost:5173
npm run dev:server   # WebSocket server (separate terminal)
# or
npm run dev:all
```

**Restart the server** after pulling server-side economy changes.

## Economy (current build)

| Currency | Role |
|----------|------|
| **Gold** | Soft currency — ferries (1g), bait, wagers, puffles. Infinite supply. |
| **Wood / fish** | Progression — axes, rods, backpack tiers, NPC contracts. |
| **$CP** | On-chain SPL token — 7-day login streak, igloo rent, cosmetic bazaar. |

### Player loop

1. **Gather** — fish ice holes, chop forest trees, forage worms  
2. **Upgrade** — wood-only gear at Copper Clive & Old Salty  
3. **Contracts** — visit NPC → accept daily order → track on HUD → turn in  
4. **Streak** — 60 min play → $CP on days 1, 2, 4, 5, 7 (1k→5k); gold only on days 3 & 6  

### Key NPCs

- **Old Salty** — fish buyer, rod upgrades, catch contracts  
- **Copper Clive** — axes, backpack, wood mint recipes, timber contracts  
- **Ranger Pike** — trail-side timber sell (65% rate), mushroom ferry quest  

### Docs (development)

- [Economy index](docs/ECONOMY_README.md) — start here for build plans  
- [Rollout order](docs/ECONOMY_ROLLOUT.md) — what to ship next  
- [MMORPG roadmap](docs/MMORPG_ROADMAP.md)  
- Public tokenomics: [whitepaper](../whitepaper)

## Tests

```bash
cd server
npm test
```

## Structure

```
src/           React + Three.js client
server/        Node WebSocket + MongoDB
```

Config lives in `server/config/` and `src/config/` — server is authoritative for economy values.
