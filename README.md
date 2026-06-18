# 🐧 Waddlebet

<div align="center">

![Waddlebet](whitepaper/public/character.png)

**Club Penguin–inspired 3D social MMO on Solana**

*Gather, trade, wager, and customize — with a closed NPC economy and on-chain $CP rewards.*

[![Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Live%20Beta-green?style=for-the-badge)]()

[Play Now](https://waddle.bet) • [Whitepaper](./whitepaper) • [Community](https://x.com/i/communities/1998537610592137381) • [Buy $CP](https://pump.fun/coin/PSNFtAvpVSZDFjRScGkKxMdEYArRr6LvScwmuYRpump)

</div>

---

> **Rebrand:** Waddlebet was formerly "Club Pengu" / "Club Penguin on Solana". Same team, new name.

---

## What is Waddlebet?

A **Web3 social MMO** built in React + Three.js with a real-time multiplayer server. Players explore a voxel world, customize penguins, adopt puffles, play minigames, and participate in a dual-currency economy backed by the **$CP** SPL token.

---

## Economy (current build)

| Layer | Role |
|-------|------|
| **Gold** | Soft currency — ferries, bait, wagers, puffles. Infinite supply. |
| **Wood / fish** | Progression materials — gear upgrades and NPC daily contracts. |
| **$CP** | On-chain token — 7-day login streak, igloo rent, cosmetic bazaar. |

### Player loop

1. **Gather** — fish ice holes, chop forest trees, forage worms  
2. **Upgrade** — wood-only axes, rods, and backpack tiers at merchant NPCs  
3. **Contracts** — visit NPC → accept daily order → track on HUD → turn in for gold  
4. **Streak** — 60 min play per UTC day → $CP on days 1, 2, 4, 5, 7 (1k→5k); gold only on days 3 & 6  

### Key NPCs

| NPC | Role |
|-----|------|
| **Old Salty** | Fish buyer, rod upgrades, catch contracts |
| **Copper Clive** | Axes, backpack, wood mint recipes, timber contracts |
| **Ranger Pike** | Trail-side timber sell, mushroom ferry quest |
| **Captain Skipper** | Ice Ferry between Town, Snow Forts, and Forest |

Full economics (public): **[whitepaper](./whitepaper)**. Internal build plans: **[waddlebet/docs/ECONOMY_README.md](waddlebet/docs/ECONOMY_README.md)**.

---

## Features

### Customization
24+ colors, 17+ hats, 17+ eyes, 12+ mouths, 20+ clothing items — plus puffles from common to legendary.

### Minigames
Card Jitsu, Connect 4, Tic Tac Toe, Pong, Blackjack, and more — with optional P2P wagering in gold or SPL tokens.

### World & travel
- **Town Center** — social hub, Dojo, shops  
- **Snow Forts** — starter fishing, rod pickup  
- **Forest Trails** — woodcutting, Ranger Pike, Copper Clive  
- **Ice Ferry** — 1g travel between zones  

### Daily systems
- 9-step onboarding quest for new wallets  
- NPC daily contracts (Salty + Clive)  
- 7-day login streak — $CP days 1/2/4/5/7 (1k→5k), gold-only days 3 (+5g) & 6 (+10g)  

---

## Getting started

### Prerequisites
- Node.js 18+
- npm

### Game client + server

```bash
git clone https://github.com/Tanner253/waddlebet.git
cd waddlebet/waddlebet
npm install
npm run dev          # client → http://localhost:5173
npm run dev:server   # WebSocket server (separate terminal)
# or
npm run dev:all
```

Restart the server after pulling economy or inventory changes.

### Whitepaper site

```bash
cd whitepaper
npm install
npm run dev          # → http://localhost:3000
```

### Tests

```bash
cd waddlebet/server
npm test
```

---

## Repository structure

```
├── waddlebet/          # Game client (Vite/React/Three.js) + server (Node/MongoDB)
│   └── docs/           # Internal economy, MMORPG, cosmetics dev plans
├── whitepaper/         # Public docs site — tokenomics, changelog
├── LICENSE
└── README.md           # This file
```

Developer quick reference: [waddlebet/README.md](waddlebet/README.md)

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Client | React, Three.js, Vite, Tailwind |
| Server | Node.js, WebSocket, MongoDB |
| Chain | Solana, SPL tokens ($CP) |
| Docs | Next.js, TypeScript, Framer Motion |

---

## Roadmap

### Shipped
- [x] 3D voxel world + multiplayer  
- [x] Penguin customization + puffles  
- [x] Card Jitsu, Connect 4, Tic Tac Toe, Pong  
- [x] Ice Ferry, Snow Forts, Forest Trails  
- [x] Fishing, woodcutting, merchant NPCs, daily contracts  
- [x] 7-day $CP login streak + onboarding quest  
- [x] Tarkov-style trader UI + quest accept flow  

### In progress
- [ ] Property rental system  
- [ ] $CP cosmetic bazaar (full rollout)  
- [ ] Gold ↔ $CP player market  

### Planned
- [ ] Gacha + tradeable cosmetics marketplace  
- [ ] Property paywalls  
- [ ] Level gates + skill progression  
- [ ] Mobile companion  

---

## Links

| Resource | Link |
|----------|------|
| Play | [waddle.bet](https://waddle.bet) |
| Whitepaper | [./whitepaper](./whitepaper) |
| X Community | [Join](https://x.com/i/communities/1998537610592137381) |
| Buy $CP | [PumpFun](https://pump.fun/coin/PSNFtAvpVSZDFjRScGkKxMdEYArRr6LvScwmuYRpump) |
| GitHub | [Tanner253/waddlebet](https://github.com/Tanner253/waddlebet) |

### Contract address

```
PSNFtAvpVSZDFjRScGkKxMdEYArRr6LvScwmuYRpump
```

---

## Disclaimer

Waddlebet is in active development. Features, tokenomics, and mechanics may change. This is not financial advice.

---

## License

MIT — see [LICENSE](LICENSE).

<div align="center">

**Built with ❄️ by the Waddlebet Team**

*Waddle on!* 🐧

</div>
