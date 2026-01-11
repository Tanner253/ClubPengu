# 🐧 Waddlebet 🐧 Club penguin inspired remake 

<div align="center">

![Waddlebet](whitepaper/public/character.png)

**The First Trencher Social Platform on Solana**

*Penguin-powered Web3 gaming with wagering, tradeable cosmetics, and virtual property rentals.*

[![Solana](https://img.shields.io/badge/Built%20on-Solana-9945FF?style=for-the-badge&logo=solana)](https://solana.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge)]()

[Whitepaper](./whitepaper) • [Play Now](https://waddlebet.fun) • [Community](https://x.com/i/communities/1998537610592137381) • [Buy $WADDLE](https://pump.fun/coin/63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump)

</div>

---

> **📢 Rebrand Notice:** Waddlebet was formerly known as "Club Pengu" / "Club Penguin on Solana". Same team, same vision, new name!

---

## 🎮 What is Waddlebet?

Waddlebet is a **Web3 social gaming platform** that combines the nostalgic charm of classic penguin social games with modern blockchain technology. Built on Solana, it offers:

- **🐧 Classic Penguin Vibes** - 3D voxel world, penguin customization, puffles, emotes, and the social experience you remember
- **🏢 GTA V-Style Properties** - Rent igloos, apartments, and lounges. Paywall your space with any token
- **🔄 RuneScape Trading** - Open gacha for rare cosmetics. Trade items with other players

---

## ✨ Features

### 🎨 Deep Customization
- **24+ Penguin Colors** - From classic blue to legendary rainbow and ghost variants
- **17+ Headwear Options** - Crowns, viking helmets, party hats, ninja masks
- **17+ Eye Styles** - Normal, shades, angry, sleepy, hearts, stars
- **12+ Mouth Options** - Beaks, smiles, beards, and special expressions
- **20+ Clothing Items** - Scarves, hoodies, suits, and exclusive outfits

### 🎮 Minigames
- **Card Jitsu** - Fire beats Snow, Snow beats Water, Water beats Fire
- **Connect 4** - Classic four-in-a-row strategy
- **Tic Tac Toe** - Quick matches, high stakes
- **Pong** - Fast reflexes, winner takes all
- *More coming soon...*

### 🐾 Puffle Companions
Adopt fluffy puffle pets with tiered rarity:
- **Common** - Blue, Red, Green (50 coins)
- **Uncommon** - Pink, Yellow, Orange (100 coins)
- **Rare** - Purple, White, Brown (200 coins)
- **Epic** - Black, Gold (500 coins)
- **Legendary** - Rainbow, Ghost (1000 coins) - *Special effects!*

### 💰 $WADDLE Token Economy
The native platform token powers the ecosystem:
- **Property Rentals** - Rent igloos, apartments, and exclusive spaces
- **Gacha System** - Spend $WADDLE to unlock rare, tradeable cosmetics
- **Trading** - All items are tradeable between players

### 🎲 P2P Wagering
Bet on minigames with **any Solana token**:
- $SOL, $WADDLE, $BONK, $WIF, $PENGU, or any SPL token
- You choose the token, you set the stakes
- Winner takes all with instant Solana settlement

### 🏠 Virtual Properties
GTA V-style property system:
- Rent igloos and apartments
- Customize your space
- Set paywalls with any token
- Invite players for exclusive hangouts

---

## 🗺️ Game World

### Current Locations
- **Town Center** - Central hub with shops and social areas
- **The Dojo** - Battle arena for Card Jitsu

### Coming Soon
- **Ski Village** - Northern mountain area with winter sports
- **Plaza** - Eastern area with Pet Shop and Stage
- **Beach & Dock** - Southern coastline with lighthouse
- **Forest & Cove** - Dense forest trails and hidden areas
- **Underground Mines** - Crystal caverns and mine cart rides

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Tanner253/waddlebet.git
   cd waddlebet
   ```

2. **Install dependencies for the game**
   ```bash
   cd waddlebet
   npm install
   ```

3. **Run the game demo**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Run the server (for multiplayer)**
   ```bash
   npm run dev:server
   ```

5. **Run both client and server**
   ```bash
   npm run dev:all
   ```

### Running the Whitepaper Site

1. **Navigate to whitepaper folder** (from repo root)
   ```bash
   cd whitepaper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Structure

```
waddlebet/
├── waddlebet/          # Game client & server
│   ├── src/            # React frontend
│   ├── server/         # Node.js backend
│   ├── public/         # Static assets
│   └── package.json    # Game dependencies
├── whitepaper/         # Documentation site (Next.js)
├── documentation/      # Technical docs & specs
├── LICENSE
└── README.md
```

---

## 🎮 Controls

| Key | Action |
|-----|--------|
| `W` / `↑` | Move Forward |
| `S` / `↓` | Move Backward |
| `A` / `←` | Turn Left |
| `D` / `→` | Turn Right |
| `E` | Interact / Emote Wheel |
| `Enter` | Open Chat |
| `Mouse` | Orbit Camera |

---

## 🛠️ Tech Stack

### Game Client
- **React** - UI Framework
- **Three.js** - 3D Graphics Engine
- **Vite** - Build Tool
- **Tailwind CSS** - Styling

### Whitepaper Site
- **Next.js 14** - React Framework
- **TypeScript** - Type Safety
- **Framer Motion** - Animations
- **Tailwind CSS** - Styling

### Blockchain
- **Solana** - Fast, low-fee transactions
- **SPL Tokens** - Multi-token support

---

## 📍 Roadmap

### Phase 1: Foundation ✅
- [x] 3D Voxel World Engine
- [x] Penguin Customization System
- [x] Puffle Companion System
- [x] Card Jitsu Minigame
- [x] AI NPCs & Social Features
- [ ] Playable Demo Release

### Phase 2: Expansion
- [ ] New Locations (Beach, Ski Village, Plaza)
- [ ] Additional Minigames (Pong, Connect 4, Tic Tac Toe)
- [ ] Property Rental System
- [ ] Igloo Customization
- [ ] $WADDLE Token Integration

### Phase 3: Wagering
- [ ] P2P Wagering System
- [ ] Multi-Token Support
- [ ] x403 Integration
- [ ] x402 Integration
- [ ] Leaderboards & Rankings

### Phase 4: Economy
- [ ] Gacha System Launch
- [ ] Tradeable Cosmetics Marketplace
- [ ] Property Paywalls
- [ ] Advanced Social Features
- [ ] Mobile Companion App

---

## 🔗 Links

| Resource | Link |
|----------|------|
| 🎮 **Play Now** | [waddlebet.fun](https://waddlebet.fun) |
| 🌐 **Whitepaper** | [View Whitepaper](./whitepaper) |
| 🐦 **X Community** | [Join Community](https://x.com/i/communities/1998537610592137381) |
| 💰 **Buy $WADDLE** | [PumpFun](https://pump.fun/coin/63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump) |
| 📦 **GitHub** | [Repository](https://github.com/Tanner253/waddlebet) |

---

## 📜 Contract Address

```
63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump
```

---

## ⚠️ Disclaimer

**Waddlebet is currently in active development.** Features, tokenomics, and gameplay mechanics described in this repository are subject to change. This is not financial advice. Always do your own research before participating in any cryptocurrency projects.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❄️ by the Waddlebet Team**

*Waddle on!* 🐧

</div>
