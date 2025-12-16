# Club Pengu: Database Migration Plan

## 🎯 Project Goal
Migrate Club Pengu from localStorage/server-memory to MongoDB Atlas for production-ready, anti-cheat protected data persistence.

---

## 📋 Table of Contents
1. [Current State Analysis (Complete Audit)](#current-state-analysis)
2. [Data Classification](#data-classification)
3. [Database Schema Overview](#database-schema-overview)
4. [Implementation Phases](#implementation-phases)
5. [Migration Checklist](#migration-checklist)
6. [Anti-Cheat Strategy](#anti-cheat-strategy)
7. [Open Questions & Ambiguities](#open-questions--ambiguities)
8. [Reference Projects](#reference-projects)

---

## 🔍 Current State Analysis (Complete Audit)

### localStorage Keys (Client-Side) - COMPLETE LIST

| Key | Data Contents | Persist to DB? | Notes |
|-----|--------------|----------------|-------|
| `penguin_name` | Username string | ✅ YES | Part of user profile |
| `penguin_customization` | `{ skin, hat, eyes, mouth, bodyItem, characterType, mount }` | ✅ YES | Player appearance |
| `game_settings` | `{ musicVolume, soundEnabled, mountEnabled, snowEnabled }` | ❌ NO | Not security-critical, keep local |
| `player_position` | `{ x, y, z, room, savedAt }` | ⚠️ OPTIONAL | Last position for continuity |
| `owned_puffles` | `[{ id, name, color, happiness, energy, hunger, position }]` | ✅ YES | Pet ownership |
| `unlocked_characters` | `['penguin', 'marcus', ...]` | ✅ YES | **CRITICAL** - character unlocks |
| `unlocked_mounts` | `['none', 'minecraftBoat', 'penguMount', ...]` | ✅ YES | **CRITICAL** - mount unlocks |
| `unlocked_cosmetics` | `['joe', 'pengu_shirt', ...]` | ✅ YES | **CRITICAL** - cosmetic unlocks |
| `clubpenguin_save` | `{ coins, inventory, stamps, stats, unlockedItems, savedAt }` | ✅ YES | Core game progress |
| `character_type` | Currently selected character type | ✅ YES | Part of customization |

### Server In-Memory Maps - COMPLETE LIST

| Variable | Location | Data Structure | Persist to DB? | Notes |
|----------|----------|----------------|----------------|-------|
| `players` | `server/index.js:17` | `Map<playerId, { id, name, room, position, rotation, appearance, puffle, ip, coins, lastPing, isAlive, emote, afkMessage, ws }>` | ⚠️ PARTIAL | Session-only except coins/stats |
| `rooms` | `server/index.js:18` | `Map<roomId, Set<playerIds>>` | ❌ NO | Ephemeral session data |
| `ipConnections` | `server/index.js:19` | `Map<ip, Set<playerIds>>` | ❌ NO | Rate limiting only |
| `beachBalls` | `server/index.js:22` | `Map<roomId, { x, z, vx, vz }>` | ❌ NO | Ephemeral physics state |
| `playerCoins` | `server/index.js:31` | `Map<playerId, coins>` | ✅ YES | Currency must be server-authoritative |
| `playerTrailPoints` | `server/index.js:35` | `Map<playerId, [{ x, z, trailType, timestamp }]>` | ❌ NO | Visual only, expires in 8s |
| `worldTime` | `server/index.js:41` | `number (0-1)` | ⚠️ OPTIONAL | Day/night cycle sync |

### Service-Level In-Memory Data

| Service | Data Structure | Persist? | Notes |
|---------|---------------|----------|-------|
| `StatsService.stats` | `Map<playerId, { cardJitsu: {wins,losses,coinsWon,coinsLost}, connect4: {...}, ticTacToe: {...}, pong: {...} }>` | ✅ YES | Game stats (pong: future) |
| `InboxService.inboxes` | `Map<playerId, messages[]>` | ✅ YES | Player notifications |
| `ChallengeService.challenges` | `Map<challengeId, { challengerId, targetId, gameType, wagerAmount, status, room, createdAt, expiresAt }>` | ✅ YES | Pending P2P challenges |
| `MatchService.matches` | `Map<matchId, { gameType, player1, player2, wagerAmount, room, status, state, createdAt, endedAt, winnerId }>` | ✅ YES | Active + historical matches |
| `MatchService.playerMatches` | `Map<playerId, matchId>` | ❌ NO | Session routing only |

### Statistics to Track (Comprehensive)

> **NOTE:** This section describes the **TARGET STATE** for the database schema. The current codebase 
> (`StatsService.js`) only tracks basic wins/losses/coins. Extended stats (streaks, game-specific, 
> per-emote) will be implemented during Phase 3 migration.

| Category | Stats | When Updated | Current State |
|----------|-------|--------------|---------------|
| **Movement** | distanceWalked, jumps, roomChanges, buildingsEntered | Real-time during gameplay | 🔴 Not tracked |
| **Social** | chatsSent, whispersSent, emotes (per type), friendsAdded, challengesSent | On each action | 🔴 Not tracked |
| **Economy** | coinsEarned, coinsSpent, coinsWagered, coinsWon, coinsLost, purchases, trades | On transactions | 🟡 Partial (coins only) |
| **Session** | totalPlayTime, sessionCount, longestSession, afkTime | On login/logout | 🔴 Not tracked |
| **Puffles** | adopted, fed, played, happinessGiven | On puffle interactions | 🔴 Not tracked |
| **Per-Emote** | wave, dance, sit, laugh, breakdance, dj, 67, headbang | On emote trigger | 🔴 Not tracked |
| **Per-Game** | played, wins, losses, draws, coinsWon, coinsLost, winStreak, bestStreak | On match end | 🟡 Basic only |
| **Game-Specific** | fireWins (CardJitsu), cornerStartWins (TicTacToe), etc. | On match end | 🔴 Not tracked |
| **Room Time** | minutes per room (see Room IDs below) | Periodic + logout | 🔴 Not tracked |

### Complete Room IDs (for stats.roomTime)

| Room ID | Description | Type |
|---------|-------------|------|
| `town` | Main outdoor area (T-shaped street) | Outdoor |
| `nightclub` | Dance club interior | Building |
| `dojo` | Card Jitsu training area | Building |
| `pizzaParlor` | Pizza Parlor interior (future) | Building |
| `giftShop` | Gift Shop interior (future) | Building |
| `igloo1` - `igloo10` | Individual igloo interiors | Igloo |

### Complete Emote IDs

| Emote ID | Display | Looping | Trigger Method | Notes |
|----------|---------|---------|----------------|-------|
| `Wave` | 👋 | No | Wheel/Key 1 | |
| `Laugh` | 😂 | No | Wheel/Key 2 | |
| `Breakdance` | 🤸 | Yes | Wheel/Key 3 | |
| `Dance` | 💃 | Yes | Wheel/Key 4 | |
| `Sit` | 🧘 | Yes | Wheel/Key 5 | Can trigger `seatedOnFurniture` flag |
| `67` | ⚖️ | Yes | Wheel/Key 6 | Balance/scale emote |
| `Headbang` | 🎸 | Yes | Wheel/Key 7 | Rock emote |
| `DJ` | 🎧 | Yes | **Context** | DJ booth interaction only (E key near booth) |

### Promo Code System (Currently Client-Side Constants!)

| Location | Data | Issue |
|----------|------|-------|
| `VoxelPenguinDesigner.jsx:83-105` | `MOUNT_PROMO_CODES`, `COSMETIC_PROMO_CODES` | ⚠️ **SECURITY RISK** - codes visible in source |
| `CharacterRegistry.js:9` | `promoCodes` Map | Character unlock codes exposed client-side |

**ISSUE**: Promo codes are hardcoded client-side. Anyone can read the source and find all codes.

### Current Promo Codes to Migrate (from codebase)

| Code | Type | Unlocks | Source File | Notes |
|------|------|---------|-------------|-------|
| `BOATCOIN` | Mount | `minecraftBoat` | VoxelPenguinDesigner.jsx | Minecraft-style rowboat |
| `PENGU` | Mount + Cosmetic | `penguMount` + `penguShirt` (bodyItem) | VoxelPenguinDesigner.jsx | PENGU partnership combo |
| `LMAO` | Cosmetic | `lmao` (eyes) | VoxelPenguinDesigner.jsx | 😂 face |
| `JOE` | Cosmetic | `joe` (bodyItem) | VoxelPenguinDesigner.jsx | 👻 Invisible body effect |
| `MISTORGOAT` | Cosmetic Set | `mistorHair` (hat), `mistorEyes` (eyes), `mistorShirt` (bodyItem) + skin: `silver` | VoxelPenguinDesigner.jsx | 🐐 Multi-item unlock |
| `MARCUS` | Character | `marcus` character type | CharacterRegistry.js | Marcus character unlock |

**Migration Note:** The `PENGU` code is a combo code that unlocks both a mount AND a cosmetic. The schema supports this via the `unlocks` object having multiple arrays populated.

---

## 📊 Data Classification

### 🔴 CRITICAL (Anti-Cheat Priority)
Must be 100% server-authoritative with audit trails:
- **Cosmetic Ownership** - What items player owns
- **Mount Ownership** - What mounts player has unlocked
- **Character Unlocks** - What character types player can use
- **Coins/Currency** - Player balance
- **Match Results** - Win/loss outcomes affecting coins
- **Promo Code Redemptions** - What codes have been used

### 🟡 HIGH (Persistence Required)
Important data that must persist across sessions:
- Player profile (name, appearance, customization)
- Puffle ownership and stats
- Game statistics (wins/losses per game type)
- Inbox messages
- Friend relationships
- Match history

### 🟢 LOW (Can Stay Client-Side)
Not security-sensitive, convenience only:
- Game settings (volume, visual preferences)
- Last known position (for spawn location)
- UI preferences

### ⚪ EPHEMERAL (Session Only)
Never persist, regenerated each session:
- Active player connections (`players` Map)
- Room membership (`rooms` Map)
- Beach ball physics state (`beachBalls` Map - per igloo room)
- Mount trail points (`playerTrailPoints` Map - expires in 8s)
- Current emote state (Wave, Dance, Sit, etc.)
- AFK status (`player.isAfk`, `player.afkMessage`) - session only
- Puffle following/sleeping/playing state - resets to idle on login
- Day/night cycle `worldTime` - resets to morning on restart

---

## 🗄️ Database Schema Overview

### Core Collections (16 total)

| # | Collection | Purpose | Priority |
|---|------------|---------|----------|
| 1 | `users` | Player accounts + profile | P1 |
| 2 | `auth_sessions` | x403 JWT sessions | P1 |
| 3 | `puffles` | Pet ownership | P2 |
| 4 | `cosmetics` | Item definitions | P3 |
| 5 | `user_cosmetics` | Ownership + audit | P3 |
| 6 | `promo_codes` | Code definitions | P3 |
| 7 | `promo_redemptions` | Code usage audit | P3 |
| 8 | `matches` | Match history | P4 |
| 9 | `challenges` | Pending challenges | P4 |
| 10 | `inbox_messages` | Notifications | P4 |
| 11 | `friendships` | Social graph | P4 |
| 12 | `transactions` | Financial audit | P5 |
| 13 | `audit_logs` | Security events | P5 |
| 14 | `igloos` | Property ownership | P5+ |
| 15 | `leaderboards` | Cached rankings | P5 |
| 16 | `banned_ips` | Rate limit/ban list | P1 |

---

## 🚀 Implementation Phases

### Phase 1: Foundation & Auth (Week 1)
- [ ] Set up MongoDB connection (`server/lib/db.js`)
- [ ] Create Mongoose models (all 16 collections)
- [ ] Implement x403 authentication protocol
  - [ ] Server: `server/lib/x403.js` 
  - [ ] Client: `src/lib/x403.js`
- [ ] Create `AuthSession` management with TTL
- [ ] Create `BannedIP` model for rate limiting
- [ ] Implement `AuthModal.jsx` + `WalletProvider.jsx`
- [ ] WebSocket auth token validation on connection
- [ ] **Single connection enforcement**:
  - [ ] `users.isConnected` flag management
  - [ ] Reject if already connected (production only)
  - [ ] Cleanup on disconnect/timeout
  - [ ] Server startup: reset all `isConnected = false`
- [ ] **Username uniqueness**:
  - [ ] Case-insensitive unique index
  - [ ] Reserved name blocklist
  - [ ] Name change API with cooldown

### Phase 2: User Profile Migration (Week 2)
- [ ] `users` collection CRUD operations
- [ ] Migrate `penguin_name` → `users.username`
- [ ] Migrate `penguin_customization` → `users.customization`
- [ ] Migrate `clubpenguin_save.coins` → `users.coins`
- [ ] Migrate `clubpenguin_save.stats` → `users.stats`
- [ ] Migrate `clubpenguin_save.stamps` → `users.stamps`
- [ ] Migrate `character_type` → `users.characterType`
- [ ] Update `GameManager.js` to fetch/save via API
- [ ] Update `VoxelPenguinDesigner.jsx` to use DB

### Phase 3: Critical Unlocks & Anti-Cheat (Week 3)
- [ ] `cosmetics` collection seeding (see Cosmetic Seeding Checklist below)
- [ ] `user_cosmetics` ownership tracking with audit
- [ ] Move mount unlocks to `users.unlockedMounts`
- [ ] Move character unlocks to `users.unlockedCharacters`
- [ ] `promo_codes` admin collection (migrate 6 existing codes)
- [ ] `promo_redemptions` audit trail
- [ ] **Remove client-side promo code constants**
- [ ] Server-side validation on every appearance broadcast
- [ ] Reject invalid cosmetics with fallback to defaults
- [ ] Implement extended stats tracking (streaks, per-emote, game-specific)

### Phase 4: Puffle System (Week 3-4)
- [ ] `puffles` collection with owner reference
- [ ] Migrate `owned_puffles` localStorage
- [ ] Puffle stat decay cron job (or on-access)
- [ ] Update `PufflePanel.jsx` to use API
- [ ] Update `VoxelWorld.jsx` puffle sync

### Phase 5: Social & Matches (Week 4)
- [ ] `friendships` collection
- [ ] Friend request/accept/block flows
- [ ] `inbox_messages` persistence
- [ ] `challenges` migration from `ChallengeService`
- [ ] `matches` history from `MatchService`
- [ ] Match reconnection via stored game state
- [ ] Update `InboxService`, `ChallengeService`, `MatchService`

### Phase 6: Economy & Properties (Week 5+)
- [ ] `transactions` logging for all coin movements
- [ ] `audit_logs` for security events
- [ ] `igloos` ownership model
- [ ] Rental system with expiration
- [ ] `leaderboards` caching system
- [ ] Casino/slots audit trail (future)

---

## ✅ Migration Checklist

### Server Files to Create
```
server/
├── lib/
│   ├── db.js              # MongoDB connection
│   └── x403.js            # Auth protocol
├── models/
│   ├── User.js
│   ├── AuthSession.js
│   ├── Puffle.js
│   ├── Cosmetic.js
│   ├── UserCosmetic.js
│   ├── PromoCode.js
│   ├── PromoRedemption.js
│   ├── Match.js
│   ├── Challenge.js
│   ├── InboxMessage.js
│   ├── Friendship.js
│   ├── Transaction.js
│   ├── AuditLog.js
│   ├── Igloo.js
│   ├── Leaderboard.js
│   └── BannedIP.js
├── services/
│   ├── UserService.js      # NEW
│   ├── CosmeticService.js  # NEW
│   ├── PromoService.js     # NEW
│   ├── AuditService.js     # NEW
│   ├── StatsService.js     # MODIFY to use DB
│   ├── InboxService.js     # MODIFY to use DB
│   ├── ChallengeService.js # MODIFY to use DB
│   └── MatchService.js     # MODIFY to use DB
└── index.js                # MODIFY: add auth, DB connection
```

### Client Files to Create
```
src/
├── lib/
│   └── x403.js            # Client auth utilities
├── components/
│   ├── AuthModal.jsx      # Wallet sign-in modal
│   └── WalletProvider.jsx # Phantom wallet context
└── api/
    └── client.js          # API client for DB operations
```

### Client Files to Modify
| File | Changes |
|------|---------|
| `App.jsx` | Add WalletProvider, auth state |
| `VoxelPenguinDesigner.jsx` | Remove localStorage, add API calls, **remove promo code constants** |
| `VoxelWorld.jsx` | Remove localStorage, validate cosmetics server-side |
| `GameManager.js` | Remove localStorage save/load, use API |
| `MultiplayerContext.jsx` | Add auth token to WebSocket, remove localStorage name |
| `CharacterRegistry.js` | Remove client-side promo codes, use API |
| `PufflePanel.jsx` | Use API for puffle operations |

### Files to Remove/Deprecate
| File | Reason |
|------|--------|
| `useLocalStorage.js` | Most uses replaced by DB |
| Promo code constants in `VoxelPenguinDesigner.jsx` | Security risk |
| Promo code Map in `CharacterRegistry.js` | Security risk |

---

## 🛡️ Anti-Cheat Strategy

### Threat Model

| Attack Vector | Current Vulnerability | Solution |
|--------------|----------------------|----------|
| localStorage manipulation | Player can edit coins, unlocks, cosmetics | Server is only source of truth |
| WebSocket message spoofing | Could claim any appearance/items | Validate against `user_cosmetics` before broadcast |
| Promo code discovery | Codes visible in client source | Move to server-only `promo_codes` collection |
| Replay attacks | Could replay auth signatures | Nonces marked used, 3-minute expiry |
| Bot farming | Mass account creation | x403 wallet signature + rate limiting |
| Coin manipulation | Could edit playerCoins client-side | Coins only server-modifiable with audit |

### Validation Flow (On Every Appearance Broadcast)

```
1. Client sends: { appearance: { hat: 'crown', mount: 'penguMount', ... } }
2. Server receives → validates JWT token
3. Server queries: user_cosmetics.find({ walletAddress, cosmeticId: 'crown' })
4. If NOT owned → replace with default, log audit event
5. Broadcast validated appearance to room
```

### Audit Events to Log

| Event | Severity | Data |
|-------|----------|------|
| `cosmetic_unlock` | INFO | walletAddress, cosmeticId, method, proofData |
| `invalid_cosmetic_attempted` | WARNING | walletAddress, attempted item, replaced with |
| `promo_code_redeemed` | INFO | walletAddress, code, unlockedItems |
| `coin_modification` | INFO | walletAddress, amount, reason, newBalance |
| `auth_failure` | WARNING | walletAddress, ip, reason |
| `rate_limit_triggered` | WARNING | walletAddress, ip, failureCount |
| `match_wager_resolved` | INFO | matchId, winnerId, loserId, amount |

---

## 🔐 Connection & Authentication Rules

### Single Connection Per Wallet (CRITICAL)

| Rule | Implementation |
|------|----------------|
| **One client per wallet** | Database `isConnected` flag prevents duplicate sessions |
| **Production enforcement** | Only enforced when `NODE_ENV === 'production'` |
| **Dev mode** | Allow multiple connections for testing |
| **Connection rejection** | Return clear error: "Already connected from another device" |

### Connection Flow

```
1. Client initiates WebSocket connection
2. Server sends x403 challenge (wallet signature required)
3. Client signs with Phantom → sends signed challenge
4. Server verifies signature → checks users.isConnected
5. IF isConnected === true AND NODE_ENV === 'production':
   → REJECT: "Already connected from another device"
6. IF signature valid:
   → Set users.isConnected = true
   → Set users.lastLoginAt = Date.now()
   → Create auth_session record
   → Return JWT token
7. On disconnect (clean or timeout):
   → Set users.isConnected = false
   → Set users.lastActiveAt = Date.now()
```

### Handling Stale Connections

| Scenario | Solution |
|----------|----------|
| Server crash | Startup script sets all `isConnected = false` |
| Client disconnect without cleanup | Heartbeat timeout (35s) triggers cleanup |
| Browser tab closed | `beforeunload` sends disconnect, fallback to heartbeat |
| Network loss | Heartbeat timeout handles it |

### Server Startup Sequence
```javascript
// On server start (before accepting connections):
async function initializeServer() {
  // 1. Connect to MongoDB
  await connectDB();
  
  // 2. Reset ALL connection states (handles crash recovery)
  await User.updateMany(
    { isConnected: true },
    { 
      $set: { 
        isConnected: false, 
        lastLogoutAt: new Date(),
        currentSessionId: null,
        currentPlayerId: null
      }
    }
  );
  console.log('🔄 Reset all connection states');
  
  // 3. Expire stale challenges
  await Challenge.updateMany(
    { status: 'pending', expiresAt: { $lt: new Date() } },
    { $set: { status: 'expired' } }
  );
  
  // 4. Mark abandoned matches
  await Match.updateMany(
    { status: 'active' },
    { $set: { status: 'abandoned', endedAt: new Date() } }
  );
  
  // 5. Start WebSocket server
  startWebSocketServer();
}
```

### Username Uniqueness

| Requirement | Implementation |
|-------------|----------------|
| Unique usernames | `users.username` has unique index |
| Case-insensitive | Store lowercase, display original case |
| Name changes | API endpoint to change, validates uniqueness |
| Reserved names | Block admin-like names: "admin", "moderator", "system" |

---

## ❓ Open Questions & Ambiguities

### Questions Needing Clarification

| # | Question | Impact | Current Assumption |
|---|----------|--------|-------------------|
| 1 | Should **player position** persist? | If yes, add `lastRoom` + `lastPosition` to users | Currently assuming YES for continuity |
| 2 | Should **AFK state** persist across sessions? | Probably not needed | Assuming NO (ephemeral) |
| 3 | Should **world time (day/night)** persist across server restarts? | Minor impact | Assuming NO (resets to morning) |
| 4 | Should **chat messages** be logged? | Moderation tool | Assuming NO for MVP |
| 5 | How long to keep **match history**? | Storage cost | Assuming forever (index by date for cleanup) |
| 6 | Should **game settings** sync across devices? | UX consideration | Assuming NO (keep localStorage) |
| 7 | What happens to **pending challenges** on server restart? | Expire them or restore? | Assuming EXPIRE (DB stores but marks stale) |
| 8 | Should **spectator count** for matches persist? | Analytics | Assuming NO |
| 9 | **Username change cooldown?** | Prevent abuse | Assuming 7 days between changes |

### Animation/State Data - What Persists?

| Data | Persist? | Reasoning |
|------|----------|-----------|
| Mount animation type (e.g., `rowing`, `penguin_waddle`) | ❌ NO | Derived from mount type, not stored |
| Current emote (Wave, Dance, Sit...) | ❌ NO | Ephemeral visual state |
| Emote start time | ❌ NO | Session only |
| **Emote usage count** | ✅ YES | Track per-emote stats for analytics |
| isSeatedOnFurniture | ❌ NO | Session only |
| isAirborne | ❌ NO | Session only |
| **Jump count** | ✅ YES | Track total jumps in stats |
| Current room | ⚠️ OPTIONAL | `lastRoom` for spawn location |
| **Room time** | ✅ YES | Track minutes per room for analytics |
| Puffle state (following, sleeping) | ❌ NO | Resets to idle on login |
| Puffle mood | ⚠️ DERIVED | Calculated from hunger/energy/happiness |

### Promo Code System Design Decision

**Option A**: Admin-only database collection
- Pros: Secure, auditable, can expire/limit uses
- Cons: Requires admin UI or DB access to add codes

**Option B**: Environment variables
- Pros: Easy deployment config
- Cons: Can't track redemptions, no expiry

**Recommendation**: Option A with admin API endpoint (protected by wallet whitelist)

---

## 📚 Reference Projects

### x403 Authentication Implementation
- `C:\Users\perci\source\repos\ShitcoinApps\AGARw3\agarFi`
- `C:\Users\perci\source\repos\ShitcoinApps\SlitherFi.io`

### Key Files to Reference

| File | Purpose |
|------|---------|
| `packages/server/src/lib/x403.ts` | Server auth protocol (challenge, verify, JWT) |
| `packages/client/app/lib/x403.ts` | Client signing utilities |
| `packages/server/src/models/User.ts` | User model pattern |
| `packages/server/src/models/AuthSession.ts` | Session with TTL index |
| `packages/server/src/models/Cosmetic.ts` | Cosmetic definitions |
| `packages/server/src/cosmeticsService.ts` | Ownership validation + purchase |
| `packages/server/src/models/Transaction.ts` | Financial audit log |
| `packages/server/src/models/BannedIP.ts` | Rate limiting |

---

## 📅 Timeline Estimate

| Phase | Duration | Dependencies | Risk |
|-------|----------|--------------|------|
| Phase 1: Foundation | 5-7 days | MongoDB Atlas ready | Low |
| Phase 2: User Profile | 5-7 days | Phase 1 | Medium (data migration) |
| Phase 3: Anti-Cheat | 5-7 days | Phase 2 | High (breaking change) |
| Phase 4: Puffles | 3-5 days | Phase 2 | Low |
| Phase 5: Social | 5-7 days | Phase 3 | Medium |
| Phase 6: Economy | 7-10 days | Phase 5 | Low |

**Total Estimate: 5-7 weeks**

---

## 📝 Notes & Decisions

### What STAYS in localStorage
- `game_settings` (music, sound, visual prefs) - not security-sensitive
- `player_position` (optional, for offline spawn location)

### What MUST Move to Server
- All unlocks (cosmetics, mounts, characters)
- All currency (coins)
- All ownership (puffles, igloos)
- All promo code logic
- All statistics

### Breaking Changes
- Players will need to sign in with Phantom wallet
- Existing localStorage data needs one-time migration
  - Option: API endpoint to "claim" existing progress by signing a message
  - Alternative: Fresh start for everyone (simpler but loses progress)

### Future Considerations
- Casino/slots will need `slot_sessions` collection
- Igloo marketplace will need `listings` collection
- Cross-chain support will need additional wallet fields
- **Pong game** - schema includes columns but game not yet implemented

---

## 🎨 Cosmetic Seeding Checklist

Before migration, the `cosmetics` collection must be seeded with all items from the codebase.

### Mounts (from `src/assets/mounts.js`)

| cosmeticId | Name | Rarity | obtainMethods | Special Properties |
|------------|------|--------|---------------|-------------------|
| `none` | No Mount | common | default | - |
| `minecraftBoat` | Minecraft Boat | legendary | promo | `animation: 'rowing'` |
| `penguMount` | PENGU Mount | legendary | promo | `speedBonus: 0.05`, `animation: 'penguin_waddle'` |

### Hats (from `src/assets/hats.js` via ASSETS.HATS)

Seed all keys from `ASSETS.HATS` object. Example entries:
- `none`, `crown`, `tophat`, `propeller`, `halo`, `wizard`, `pirate`, `party`, `santa`, etc.

Plus promo-locked: `mistorHair`

### Eyes (from `src/assets/eyes.js` via ASSETS.EYES)

Seed all keys from `ASSETS.EYES` object. Example entries:
- `normal`, `cool_shades`, `laser`, `dizzy`, etc.

Plus promo-locked: `lmao`, `mistorEyes`

### Mouths (from `src/assets/index.js` via ASSETS.MOUTH)

Seed all keys from `ASSETS.MOUTH` object. Example entries:
- `beak`, `smile`, `cigarette`, `pipe`, etc.

### Body Items (from `src/assets/bodyItems.js` via ASSETS.BODY)

Seed all keys from `ASSETS.BODY` object. Example entries:
- `none`, various shirts and accessories

Plus promo-locked: `joe` (hideBody effect), `mistorShirt`, `penguShirt`

### Characters (from `src/characters/`)

| characterId | Name | obtainMethods | Notes |
|-------------|------|---------------|-------|
| `penguin` | Penguin | default | Always unlocked |
| `marcus` | Marcus | promo | Unlock via MARCUS code |

### Mount renderData Schema

```javascript
// Actual mount properties from src/assets/mounts.js:
renderData: {
    // Movement & Animation
    speedBoost: Number,      // Multiplier, e.g., 1.05 = 5% faster (penguMount only)
    animationType: String,   // 'rowing' | 'penguin_waddle' | null
    animated: Boolean,       // Whether mount has animation
    
    // Positioning
    seatOffset: { y: Number },   // Player vertical offset when seated
    riderOffset: { y: Number },  // Additional rider position adjustment
    positionY: Number,           // Mount base Y position
    scale: Number,               // Mount scale factor
    
    // Rendering
    hidesFeet: Boolean,      // Hide player feet when mounted
    voxelData: Mixed,        // Voxel definition array
    oarData: Mixed           // Oar voxels (minecraftBoat only)
}

// penguMount: speedBoost=1.05, animationType='penguin_waddle', scale=0.3125
// minecraftBoat: animationType='rowing', seatOffset={y:-2}, has oarData
```
