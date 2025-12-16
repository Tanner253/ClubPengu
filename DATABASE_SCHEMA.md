# Club Pengu Database Schema
## MongoDB Atlas Collections (16 Total)

---

## 📑 Table of Contents

1. [Authentication & Users](#-authentication--users)
2. [Promo Codes & Redemptions](#-promo-codes--redemptions)
3. [Puffles](#-puffles)
4. [Cosmetics & Ownership](#-cosmetics--ownership)
5. [P2P Matches & Challenges](#-p2p-matches--challenges)
6. [Social Features](#-social-features)
7. [Transactions & Audit](#-transactions--audit)
8. [Properties (Future)](#-properties-future)
9. [Leaderboards](#-leaderboards)
10. [Index Summary](#-index-summary)

---

## 🔐 Authentication & Users

### Collection: `users`
Primary player accounts linked to Solana wallets.

```javascript
{
  _id: ObjectId,
  
  // ========== IDENTITY (Primary Key) ==========
  walletAddress: String,        // Solana wallet address (unique, indexed)
  
  // ========== PROFILE ==========
  username: String,             // Display name (indexed, from penguin_name)
  characterType: String,        // 'penguin' | 'marcus' | future types (from character_type)
  
  // Appearance (from penguin_customization)
  customization: {
    skin: String,               // Color hex or preset name (e.g., 'blue', '#FF0000')
    hat: String,                // Hat ID or 'none'
    eyes: String,               // Eyes ID (e.g., 'normal', 'cool_shades')
    mouth: String,              // Mouth ID (e.g., 'beak', 'smile')
    bodyItem: String,           // Body item ID or 'none'
    mount: String               // **EQUIPPED** mount ID or 'none' (must be in unlockedMounts)
  },
  
  // ========== CURRENCY (Server-Authoritative) ==========
  coins: Number,                // In-game currency (default: 100) - from clubpenguin_save.coins
  
  // ========== UNLOCKS (Critical Anti-Cheat) ==========
  unlockedCosmetics: [String],  // Cosmetic IDs owned (from unlocked_cosmetics + clubpenguin_save.unlockedItems)
  unlockedMounts: [String],     // Mount IDs owned (from unlocked_mounts) - DEFAULT: ['none']
  unlockedCharacters: [String], // Character types owned (from unlocked_characters) - DEFAULT: ['penguin']
  stamps: [{                    // Achievement stamps (from clubpenguin_save.stamps)
    id: String,
    name: String,
    earnedAt: Date
  }],
  inventory: [String],          // Generic item IDs (from clubpenguin_save.inventory)
  
  // ========== COMPREHENSIVE STATISTICS ==========
  
  // --- MOVEMENT & ACTIONS ---
  stats: {
    movement: {
      totalDistanceWalked: Number,    // Units traveled
      totalJumps: Number,
      totalRoomChanges: Number,       // Times entered a new room
      totalBuildingsEntered: Number,  // Dojo, Pizza Parlor, etc.
    },
    
    // --- SOCIAL ---
    social: {
      totalChatsSent: Number,
      totalWhispersSent: Number,
      totalWhispersReceived: Number,
      totalEmotesUsed: Number,        // Sum of all emotes
      totalFriendsAdded: Number,
      totalChallengesSent: Number,
      totalChallengesReceived: Number,
      totalChallengesAccepted: Number,
      totalChallengesDeclined: Number,
    },
    
    // --- EMOTES (per type) ---
    // Based on EmoteSystem.js EMOTE_WHEEL_ITEMS + LOOPING_EMOTES
    emotes: {
      // Emote Wheel (keyboard 1-7, mouse wheel selector)
      wave: Number,                   // 👋 Wave - non-looping
      laugh: Number,                  // 😂 Laugh - non-looping
      breakdance: Number,             // 🤸 Breakdance (looping)
      dance: Number,                  // 💃 Dance (looping)
      sit: Number,                    // 🧘 Sit (looping) - can trigger seatedOnFurniture
      sixtySeven: Number,             // ⚖️ "67" balance emote (looping)
      headbang: Number,               // 🎸 Headbang/rock emote (looping)
      
      // Context-triggered emotes (not in wheel)
      dj: Number,                     // 🎧 DJ (looping) - triggered by DJ booth interaction
    },
    
    // --- ECONOMY ---
    economy: {
      totalCoinsEarned: Number,       // Lifetime earnings
      totalCoinsSpent: Number,        // Lifetime spending
      totalCoinsWagered: Number,      // Total put into wagers
      totalCoinsWonFromWagers: Number,
      totalCoinsLostToWagers: Number,
      totalPurchasesMade: Number,     // Items bought
      totalTradesCompleted: Number,   // Future: cosmetic trading
      // Casino (future)
      totalSlotSpins: Number,
      totalSlotWins: Number,
      totalSlotCoinsWon: Number,
      totalSlotCoinsSpent: Number,
    },
    
    // --- SESSION ---
    session: {
      totalPlayTimeMinutes: Number,   // Lifetime play time
      totalSessions: Number,          // Number of logins
      longestSessionMinutes: Number,  // Longest single session
      totalAfkTimeMinutes: Number,    // Time spent AFK
    },
    
    // --- PUFFLES ---
    puffles: {
      totalPufflesAdopted: Number,
      totalTimesFedPuffle: Number,
      totalTimesPlayedWithPuffle: Number,
      totalPuffleHappinessGiven: Number,  // Cumulative happiness restored
    },
    
    // --- UNLOCKS ---
    unlocks: {
      totalCosmeticsOwned: Number,
      totalMountsOwned: Number,
      totalCharactersOwned: Number,
      totalStampsEarned: Number,
      totalPromoCodesRedeemed: Number,
    },
    
    // --- ROOMS VISITED (time spent per room) ---
    // Complete room list from roomConfig.js
    roomTime: {
      // Outdoor areas
      town: Number,                   // Main T-shaped street outdoor area
      
      // Building interiors
      nightclub: Number,              // Dance club interior
      dojo: Number,                   // Card Jitsu training area
      pizzaParlor: Number,            // Pizza Parlor interior (future)
      giftShop: Number,               // Gift Shop interior (future)
      
      // Individual igloo interiors (tracked separately for leaderboards)
      igloo1: Number,
      igloo2: Number,
      igloo3: Number,                 // SKNY igloo
      igloo4: Number,
      igloo5: Number,
      igloo6: Number,
      igloo7: Number,
      igloo8: Number,
      igloo9: Number,
      igloo10: Number,
      
      // Aggregate for convenience
      totalIglooTime: Number,         // Sum of all igloo time
    },
  },
  
  // --- PER-GAME STATISTICS ---
  gameStats: {
    cardJitsu: { 
      played: Number,
      wins: Number, 
      losses: Number,
      draws: Number,
      coinsWon: Number,               // From wagers
      coinsLost: Number,              // From wagers
      winStreak: Number,              // Current streak
      bestWinStreak: Number,          // All-time best
      lossStreak: Number,
      worstLossStreak: Number,
      totalRoundsPlayed: Number,      // Individual rounds within games
      // Card Jitsu specific
      fireWins: Number,               // Rounds won with fire
      waterWins: Number,
      snowWins: Number,
    },
    connect4: { 
      played: Number,
      wins: Number, 
      losses: Number, 
      draws: Number,
      coinsWon: Number, 
      coinsLost: Number,
      winStreak: Number,
      bestWinStreak: Number,
      lossStreak: Number,
      worstLossStreak: Number,
      totalMovesPlayed: Number,
      // Connect4 specific
      fourInRowHorizontal: Number,
      fourInRowVertical: Number,
      fourInRowDiagonal: Number,
    },
    ticTacToe: { 
      played: Number,
      wins: Number, 
      losses: Number, 
      draws: Number,
      coinsWon: Number, 
      coinsLost: Number,
      winStreak: Number,
      bestWinStreak: Number,
      lossStreak: Number,
      worstLossStreak: Number,
      totalMovesPlayed: Number,
      // TicTacToe specific
      winsAsX: Number,
      winsAsO: Number,
      cornerStartWins: Number,        // Wins when starting in corner
    },
    // PONG: Future game - columns included for forward compatibility
    // Not yet implemented in game, but schema ready
    pong: { 
      played: Number,
      wins: Number, 
      losses: Number,
      coinsWon: Number, 
      coinsLost: Number,
      winStreak: Number,
      bestWinStreak: Number,
      lossStreak: Number,
      worstLossStreak: Number,
      totalPointsScored: Number,
      totalPointsConceded: Number,
    },
    // Aggregate across all games
    overall: {
      totalGamesPlayed: Number,
      totalGamesWon: Number,
      totalGamesLost: Number,
      totalGamesDrew: Number,
      overallWinRate: Number,         // Calculated: wins / (wins + losses)
      favoriteGame: String,           // Most played game type
    },
  },
  
  // ========== SESSION CONVENIENCE ==========
  // Last known state for continuity (optional persistence)
  lastRoom: String,             // Last room visited (e.g., 'town', 'igloo3', 'nightclub')
  lastPosition: {
    x: Number,
    y: Number,
    z: Number
  },
  
  // ========== SETTINGS (Optional Sync) ==========
  // Note: Can also stay in localStorage - not security critical
  settings: {
    musicVolume: Number,        // 0-100
    soundEnabled: Boolean,
    mountEnabled: Boolean,      // Show mount visuals
    snowEnabled: Boolean        // Show snowfall particles
  },
  
  // ========== CONNECTION STATE ==========
  isConnected: Boolean,         // TRUE if currently online (single connection enforcement)
  currentSessionId: String,     // Active auth_session._id (for validation)
  currentPlayerId: String,      // Current WebSocket player ID
  lastLoginAt: Date,            // When current/last session started
  lastLogoutAt: Date,           // When last session ended
  lastActiveAt: Date,           // Last activity timestamp (heartbeat updates)
  lastIpAddress: String,        // For security/audit
  
  // ========== METADATA ==========
  createdAt: Date,
  updatedAt: Date,              // Any profile change
  
  // ========== USERNAME MANAGEMENT ==========
  usernameHistory: [{           // Track name changes
    previousName: String,
    changedAt: Date
  }],
  lastUsernameChangeAt: Date,   // Enforce cooldown (7 days suggested)
  
  // ========== MODERATION ==========
  isBanned: Boolean,
  banReason: String,
  banExpires: Date,             // null = permanent
  banHistory: [{                // Track all bans
    reason: String,
    bannedAt: Date,
    bannedBy: String,           // Admin wallet
    expiresAt: Date,
    liftedAt: Date,
    liftedBy: String
  }],
  
  // ========== RPC LOOKUP HELPERS ==========
  // These help with $CPw3 balance lookups and whale status
  lastBalanceCheck: Date,       // When we last fetched on-chain balance
  cachedCPw3Balance: Number,    // Cached $CPw3 balance (refresh periodically)
  whaleStatusTier: String       // 'standard'|'bronze'|'silver'|'gold'|'diamond'|'legendary'
}

// ==================== INDEXES ====================
// Identity & Auth
{ walletAddress: 1 }                          // unique - primary lookup
{ username: 1 }                               // unique (case-insensitive via collation)
{ 'username': 'text' }                        // text search for friend finding
{ isConnected: 1 }                            // find online players
{ currentSessionId: 1 }                       // session validation

// Leaderboards
{ coins: -1 }                                 // richest players
{ 'gameStats.cardJitsu.wins': -1 }            // Card Jitsu wins
{ 'gameStats.connect4.wins': -1 }             // Connect 4 wins
{ 'gameStats.ticTacToe.wins': -1 }            // Tic Tac Toe wins
{ 'gameStats.overall.totalGamesWon': -1 }     // overall wins
{ 'stats.economy.totalCoinsEarned': -1 }      // lifetime earnings
{ 'stats.session.totalPlayTimeMinutes': -1 }  // most active players

// Activity
{ lastActiveAt: -1 }                          // recently active
{ lastLoginAt: -1 }                           // recent logins
{ createdAt: -1 }                             // newest accounts

// Whale Status (for nametag rendering)
{ whaleStatusTier: 1, isConnected: 1 }        // find online whales

// Collation for case-insensitive username uniqueness:
// db.users.createIndex({ username: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } })

/*
==================== STATS UPDATE TRIGGERS ====================

| Event                  | Stats to Update                                           |
|------------------------|-----------------------------------------------------------|
| Player moves           | stats.movement.totalDistanceWalked (aggregate on logout)  |
| Player jumps           | stats.movement.totalJumps                                 |
| Player enters room     | stats.movement.totalRoomChanges, stats.roomTime[room]     |
| Player enters building | stats.movement.totalBuildingsEntered                      |
| Player sends chat      | stats.social.totalChatsSent                               |
| Player sends whisper   | stats.social.totalWhispersSent                            |
| Player uses emote      | stats.social.totalEmotesUsed, stats.emotes[emoteType]     |
| Player adds friend     | stats.social.totalFriendsAdded                            |
| Player sends challenge | stats.social.totalChallengesSent                          |
| Match starts           | gameStats[type].played                                    |
| Match ends (win)       | gameStats[type].wins, .coinsWon, .winStreak, .bestStreak  |
| Match ends (loss)      | gameStats[type].losses, .coinsLost, .lossStreak           |
| Match ends (draw)      | gameStats[type].draws                                     |
| Player earns coins     | stats.economy.totalCoinsEarned                            |
| Player spends coins    | stats.economy.totalCoinsSpent                             |
| Player wagers          | stats.economy.totalCoinsWagered                           |
| Slot spin              | stats.economy.totalSlotSpins, .totalSlotCoinsSpent        |
| Slot win               | stats.economy.totalSlotWins, .totalSlotCoinsWon           |
| Puffle adopted         | stats.puffles.totalPufflesAdopted                         |
| Puffle fed             | stats.puffles.totalTimesFedPuffle                         |
| Puffle played with     | stats.puffles.totalTimesPlayedWithPuffle                  |
| Player login           | stats.session.totalSessions, lastLoginAt                  |
| Player logout          | stats.session.totalPlayTimeMinutes, lastLogoutAt          |
| Cosmetic unlocked      | stats.unlocks.totalCosmeticsOwned                         |
| Promo redeemed         | stats.unlocks.totalPromoCodesRedeemed                     |

PERFORMANCE NOTE: 
- High-frequency stats (movement, jumps) should be batched and written periodically or on logout
- Low-frequency stats (match results, purchases) can be written immediately
- Consider using $inc operator for atomic increments
*/
```

---

### Collection: `auth_sessions`
x403 JWT authentication sessions with automatic expiration.

```javascript
{
  _id: ObjectId,
  
  walletAddress: String,        // User's wallet (indexed)
  sessionToken: String,         // JWT token (unique)
  
  // Timing
  createdAt: Date,
  expiresAt: Date,              // TTL index for auto-deletion
  lastUsed: Date,               // Updated on each request
  
  // Security metadata
  ipAddress: String,
  userAgent: String,
  
  // Activity tracking
  gamesPlayed: Number,          // Games played this session
  actionsCount: Number          // Total WebSocket messages this session
}

// ==================== INDEXES ====================
{ walletAddress: 1 }            // find sessions by wallet
{ sessionToken: 1 }             // unique - token lookup
{ expiresAt: 1 }, { expireAfterSeconds: 0 }  // TTL auto-delete expired
```

---

### Collection: `banned_ips`
Rate limiting and IP bans for anti-bot protection.

```javascript
{
  _id: ObjectId,
  
  ip: String,                   // IP address (unique)
  
  // Rate limiting
  failureCount: Number,         // Auth failures (resets on success)
  lastFailure: Date,
  unlockAt: Date,               // When rate limit expires
  
  // Permanent ban
  isPermanentBan: Boolean,
  banReason: String,
  bannedAt: Date,
  bannedBy: String,             // Admin wallet who banned
  
  // Associated wallets
  associatedWallets: [String],  // Wallets seen from this IP
  
  createdAt: Date
}

// ==================== INDEXES ====================
{ ip: 1 }                       // unique
{ unlockAt: 1 }                 // find expired rate limits
{ isPermanentBan: 1 }
```

---

## 🎟️ Promo Codes & Redemptions

### Collection: `promo_codes`
Admin-defined promotional codes. **SECURITY CRITICAL - Server only, never expose to client.**

```javascript
{
  _id: ObjectId,
  
  // Code definition
  code: String,                 // The actual code (unique, case-insensitive stored UPPERCASE)
  name: String,                 // Display name (e.g., "PENGU Partnership Code")
  description: String,
  
  // What it unlocks
  unlocks: {
    mounts: [String],           // Mount IDs to unlock (e.g., ['penguMount'])
    cosmetics: [String],        // Cosmetic IDs to unlock (e.g., ['pengu_shirt', 'joe'])
    characters: [String],       // Character types to unlock (e.g., ['marcus'])
    coins: Number               // Bonus coins (0 = none)
  },
  
  // Limits
  maxRedemptions: Number,       // null = unlimited
  redemptionCount: Number,      // Current redemptions
  singleUsePerWallet: Boolean,  // Can same wallet redeem multiple times?
  
  // Availability
  isActive: Boolean,
  validFrom: Date,              // null = immediately
  validUntil: Date,             // null = never expires
  
  // Metadata
  createdAt: Date,
  createdBy: String,            // Admin wallet who created
  notes: String                 // Internal notes
}

// ==================== INDEXES ====================
{ code: 1 }                     // unique, case-insensitive via collation
{ isActive: 1, validUntil: 1 }  // find active codes
```

---

### Collection: `promo_redemptions`
Audit trail for all promo code usage. **AUDIT CRITICAL.**

```javascript
{
  _id: ObjectId,
  
  walletAddress: String,        // Who redeemed
  promoCodeId: ObjectId,        // Reference to promo_codes._id
  code: String,                 // The actual code (for historical reference)
  
  // What was unlocked
  unlockedItems: {
    mounts: [String],
    cosmetics: [String],
    characters: [String],
    coins: Number
  },
  
  // Context
  redeemedAt: Date,
  ipAddress: String,
  sessionId: String,            // AuthSession ID
  
  // Status
  status: String                // 'success' | 'already_redeemed' | 'expired' | 'invalid'
}

// ==================== INDEXES ====================
{ walletAddress: 1 }            // find user's redemptions
{ promoCodeId: 1 }              // find who used a code
{ walletAddress: 1, promoCodeId: 1 }  // unique compound (if singleUsePerWallet)
{ redeemedAt: -1 }              // recent redemptions
```

---

## 🐧 Puffles

### Collection: `puffles`
Player-owned puffle pets with stats.

```javascript
{
  _id: ObjectId,
  
  // Identity
  puffleId: String,             // Unique puffle ID (from Puffle.id)
  ownerWallet: String,          // Wallet address of owner (indexed)
  
  // Appearance
  name: String,                 // Pet name (default: 'Puffle')
  color: String,                // From Puffle.COLORS in src/engine/Puffle.js:
                                //   Common ($50): 'blue' | 'red' | 'green'
                                //   Uncommon ($100): 'pink' | 'yellow' | 'orange'
                                //   Rare ($200): 'purple' | 'white' | 'brown'
                                //   Epic ($500): 'black' | 'gold'
                                //   Legendary ($1000): 'rainbow' (rainbow effect) | 'ghost' (glow effect)
  
  // Stats (0-100 scale, decay over time)
  happiness: Number,            // Default: 80
  energy: Number,               // Default: 100
  hunger: Number,               // Default: 20 (higher = more hungry)
  
  // Timestamps for stat decay calculation
  lastFed: Date,
  lastPlayed: Date,
  lastStatUpdate: Date,
  
  // Convenience (not critical)
  lastPosition: {               // Where puffle was last seen
    x: Number,
    y: Number,
    z: Number
  },
  
  // Metadata
  adoptedAt: Date,
  isActive: Boolean             // Currently selected as companion (only one per user)
}

// ==================== INDEXES ====================
{ puffleId: 1 }                 // unique
{ ownerWallet: 1 }              // find all puffles for user
{ ownerWallet: 1, isActive: 1 } // find active puffle quickly
```

---

## 🎨 Cosmetics & Ownership

### Collection: `cosmetics`
Cosmetic item definitions (seeded from config, admin-managed).

```javascript
{
  _id: ObjectId,
  
  // Identity
  cosmeticId: String,           // Unique ID (e.g., 'crown', 'rainbow_trail', 'pengu_shirt')
  
  // Display
  name: String,                 // e.g., "Royal Crown"
  description: String,
  
  // Classification
  category: String,             // 'hat' | 'eyes' | 'mouth' | 'bodyItem' | 'mount' | 
                                // 'trail' | 'nameStyle' | 'skin' | 'character'
  rarity: String,               // 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  
  // Acquisition
  obtainMethods: [String],      // ['purchase', 'slot_drop', 'achievement', 'promo', 'trade', 'default']
  cost: Number,                 // Cost in coins (0 = not purchasable directly)
  dropRate: Number,             // For slot drops (0-100%), null if not droppable
  
  // Visual data (for rendering) - format varies by category
  renderData: {
    // ========== MOUNT PROPERTIES (category: 'mount') ==========
    // Based on actual mount data from src/assets/mounts.js
    speedBoost: Number,         // Multiplier (e.g., 1.05 = 5% faster) - penguMount only
    animationType: String,      // 'rowing' | 'penguin_waddle' | null (static)
    animated: Boolean,          // Whether mount has animation
    hidesFeet: Boolean,         // Hide player feet when mounted
    seatOffset: {               // Player vertical offset when seated
      y: Number                 // e.g., -2 for boat, 0 for pengu
    },
    riderOffset: {              // Additional rider position adjustment
      y: Number
    },
    scale: Number,              // Mount scale factor (default 1.0)
    positionY: Number,          // Mount base Y position
    voxelData: Mixed,           // Voxel definition array
    oarData: Mixed,             // Oar voxel definition (minecraftBoat only)
    
    // ========== HAT/EYES/MOUTH/BODY PROPERTIES ==========
    voxelData: Mixed,           // Voxel definition from assets/*
    
    // ========== SKIN PROPERTIES ==========
    colorHex: String,           // Skin color hex code (e.g., '#3498db')
    
    // ========== TRAIL PROPERTIES (future) ==========
    particleConfig: Mixed,      // Particle system configuration
  }
  
  /*
   * CURRENT MOUNT DATA (from src/assets/mounts.js):
   * 
   * minecraftBoat:
   *   - animated: true
   *   - animationType: 'rowing'
   *   - hidesFeet: true
   *   - seatOffset: { y: -2 }
   *   - Has oar data for rowing animation
   * 
   * penguMount:
   *   - animated: true
   *   - animationType: 'penguin_waddle'
   *   - hidesFeet: true
   *   - seatOffset: { y: 0 }
   *   - riderOffset: { y: -1 }
   *   - speedBoost: 1.05 (5% faster movement)
   *   - scale: 0.3125
   *   - positionY: 0.65
   */
  
  // Availability
  isAvailable: Boolean,         // Can be obtained currently
  isHidden: Boolean,            // Hidden from UI unless owned
  availableFrom: Date,          // Limited time start
  availableUntil: Date,         // Limited time end
  
  // Metadata
  createdAt: Date,
  updatedAt: Date
}

// ==================== INDEXES ====================
{ cosmeticId: 1 }               // unique
{ category: 1 }                 // filter by type
{ rarity: 1 }                   // filter by rarity
{ isAvailable: 1 }              // available items
{ 'obtainMethods': 1 }          // find by obtain method
```

---

### Collection: `user_cosmetics`
**AUDIT CRITICAL** - Tracks exactly how each user obtained each cosmetic.

```javascript
{
  _id: ObjectId,
  
  // Ownership
  walletAddress: String,        // Owner wallet (indexed)
  cosmeticId: String,           // Cosmetic item ID (indexed)
  
  // ========== ACQUISITION AUDIT TRAIL ==========
  obtainedAt: Date,
  obtainMethod: String,         // 'slot_drop' | 'promo_code' | 'achievement' | 
                                // 'purchase' | 'trade' | 'admin_grant' | 'migration'
  
  // Proof of acquisition (varies by method)
  proof: {
    // For slot_drop
    slotSessionId: String,
    
    // For promo_code  
    promoRedemptionId: ObjectId,
    promoCode: String,
    
    // For achievement
    stampId: String,
    
    // For purchase
    transactionId: ObjectId,
    pricePaid: Number,
    
    // For trade
    tradeId: String,
    previousOwnerWallet: String,
    
    // For admin_grant
    adminWallet: String,
    adminReason: String,
    
    // For migration (from localStorage)
    migratedFrom: String,       // 'localStorage'
    migrationSignature: String  // Wallet signature proving ownership
  },
  
  // ========== TRADE HISTORY ==========
  tradeHistory: [{
    fromWallet: String,
    toWallet: String,
    tradeId: String,
    transferredAt: Date
  }],
  
  // Status
  isEquipped: Boolean,          // Currently being worn
  equippedSlot: String          // Which customization slot ('hat', 'bodyItem', etc.)
}

// ==================== INDEXES ====================
{ walletAddress: 1 }                    // find user's cosmetics
{ cosmeticId: 1 }                       // find who owns an item
{ walletAddress: 1, cosmeticId: 1 }     // unique compound - one ownership record per user per item
{ obtainedAt: -1 }                      // recent unlocks
{ obtainMethod: 1, obtainedAt: -1 }     // audit by method
```

---

## ⚔️ P2P Matches & Challenges

### Collection: `challenges`
Pending P2P game challenges.

```javascript
{
  _id: ObjectId,
  
  challengeId: String,          // Unique ID (matches ChallengeService)
  
  // Participants
  challengerWallet: String,     // Who sent the challenge
  challengerName: String,       // Display name at time of challenge
  challengerId: String,         // Player ID (session-based)
  
  targetWallet: String,         // Who received it (null = open challenge)
  targetName: String,
  targetId: String,
  
  // Game details
  gameType: String,             // 'cardJitsu' | 'connect4' | 'ticTacToe' | 'pong' (future)
  wagerAmount: Number,          // Coins wagered (0 = friendly)
  room: String,                 // Room where challenge was sent
  
  // Status
  status: String,               // 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled'
  
  // Timing
  createdAt: Date,
  expiresAt: Date,              // Auto-expire (typically 5 minutes)
  respondedAt: Date,            // When accepted/declined
  
  // Result reference
  matchId: String               // If accepted, reference to resulting match
}

// ==================== INDEXES ====================
{ challengeId: 1 }              // unique
{ challengerWallet: 1, status: 1 }
{ targetWallet: 1, status: 1 }  // find pending challenges for user
{ expiresAt: 1 }                // cleanup expired
{ room: 1, status: 1 }          // find challenges in a room
```

---

### Collection: `matches`
Completed and in-progress P2P matches. **Permanent history per player.**

```javascript
{
  _id: ObjectId,
  
  matchId: String,              // Unique ID (matches MatchService)
  challengeId: String,          // Original challenge (if applicable)
  
  // ========== PARTICIPANTS ==========
  player1: {
    wallet: String,
    name: String,
    playerId: String            // Session ID for reconnection
  },
  player2: {
    wallet: String,
    name: String,
    playerId: String
  },
  
  // ========== GAME CONFIG ==========
  gameType: String,             // 'cardJitsu' | 'connect4' | 'ticTacToe' | 'pong' (future)
  wagerAmount: Number,
  room: String,
  
  // ========== STATUS ==========
  status: String,               // 'active' | 'completed' | 'abandoned' | 'draw'
  
  // ========== RESULT ==========
  winnerWallet: String,         // null if draw or abandoned
  winnerName: String,
  loserWallet: String,
  loserName: String,
  
  // ========== GAME STATE (for reconnection) ==========
  // Only stored during active match, cleared on completion
  gameState: Mixed,             // Full game state object (varies by game type)
  /*
    CardJitsu: { phase, round, player1Hand, player2Hand, player1Wins, player2Wins, player1Card, player2Card }
    Connect4: { board (6x7), currentPlayer, moveHistory }
    TicTacToe: { board (3x3), currentPlayer, moveHistory }
    Pong (future): { ball: {x,y,vx,vy}, paddles: {p1Y, p2Y}, scores: {p1, p2} }
  */
  currentTurn: String,          // Wallet of current turn player
  turnCount: Number,
  lastMoveAt: Date,
  
  // ========== TIMING ==========
  startedAt: Date,
  endedAt: Date,
  duration: Number,             // Seconds
  
  // ========== PAYOUT ==========
  payoutProcessed: Boolean,
  payoutTransactionId: ObjectId // Reference to transactions collection
}

// ==================== INDEXES ====================
{ matchId: 1 }                  // unique
{ 'player1.wallet': 1, endedAt: -1 }  // player 1 match history
{ 'player2.wallet': 1, endedAt: -1 }  // player 2 match history
{ status: 1, startedAt: -1 }    // active matches
{ gameType: 1, endedAt: -1 }    // leaderboards by game
{ winnerWallet: 1, endedAt: -1 } // win history
{ room: 1, status: 1 }          // active matches in room (for spectating)
```

---

## 📬 Social Features

### Collection: `inbox_messages`
Player inbox notifications.

```javascript
{
  _id: ObjectId,
  
  messageId: String,            // Unique ID
  recipientWallet: String,      // Who receives it (indexed)
  
  // Content
  type: String,                 // 'challenge' | 'challenge_response' | 'system' | 
                                // 'friend_request' | 'friend_accepted' | 'gift' | 
                                // 'match_result' | 'promo_reward'
  title: String,
  message: String,
  
  // Sender (if applicable)
  senderWallet: String,
  senderName: String,
  
  // Related data references
  relatedData: {
    challengeId: String,
    matchId: String,
    friendRequestId: ObjectId,
    giftItemId: String,
    promoCode: String
  },
  
  // Status
  isRead: Boolean,
  readAt: Date,
  isArchived: Boolean,
  
  // Timing
  createdAt: Date,
  expiresAt: Date               // Some messages auto-delete (e.g., challenge notifications)
}

// ==================== INDEXES ====================
{ recipientWallet: 1, isRead: 1, createdAt: -1 }  // unread inbox
{ recipientWallet: 1, createdAt: -1 }  // full inbox
{ expiresAt: 1 }, { expireAfterSeconds: 0 }  // TTL auto-delete
```

---

### Collection: `friendships`
Friend relationships (bidirectional).

```javascript
{
  _id: ObjectId,
  
  // Store wallets alphabetically to avoid duplicate records
  wallet1: String,              // Alphabetically lower wallet address
  wallet2: String,              // Alphabetically higher wallet address
  
  // Status
  status: String,               // 'pending' | 'accepted' | 'blocked'
  initiatorWallet: String,      // Who sent the request
  
  // Timing
  requestedAt: Date,
  acceptedAt: Date,
  
  // Blocking info
  blockedBy: String,            // If blocked, who blocked
  blockedAt: Date,
  blockReason: String
}

// ==================== INDEXES ====================
{ wallet1: 1, wallet2: 1 }      // unique compound
{ wallet1: 1, status: 1 }
{ wallet2: 1, status: 1 }
{ initiatorWallet: 1, status: 1 }  // find pending sent requests
```

---

## 💰 Transactions & Audit

### Collection: `transactions`
All financial/value transactions for auditing.

```javascript
{
  _id: ObjectId,
  
  transactionId: String,        // Unique ID
  
  // Type
  type: String,                 // 'wager_payout' | 'wager_loss' | 'purchase' | 
                                // 'sale' | 'rental_payment' | 'slot_spin' | 
                                // 'slot_win' | 'promo_bonus' | 'stamp_bonus' | 
                                // 'admin_adjustment'
  
  // Participants
  fromWallet: String,           // Source (null for system/mint operations)
  toWallet: String,             // Destination
  
  // Amount
  amount: Number,               // Positive = credit, store absolute value
  currency: String,             // 'coins' | 'CPw3' (future on-chain)
  
  // Balances snapshot
  fromBalanceBefore: Number,
  fromBalanceAfter: Number,
  toBalanceBefore: Number,
  toBalanceAfter: Number,
  
  // On-chain details (future, for $CPw3)
  txSignature: String,          // Solana transaction signature
  solscanLink: String,          // Link to Solscan
  
  // Related entities
  relatedData: {
    matchId: String,
    iglooId: String,
    cosmeticId: String,
    slotSessionId: String,
    promoCode: String
  },
  
  // Status
  status: String,               // 'pending' | 'success' | 'failed' | 'refunded'
  
  // Metadata
  reason: String,               // Human-readable description
  createdAt: Date,
  processedAt: Date,
  failureReason: String
}

// ==================== INDEXES ====================
{ transactionId: 1 }            // unique
{ fromWallet: 1, createdAt: -1 }
{ toWallet: 1, createdAt: -1 }
{ type: 1, createdAt: -1 }
{ txSignature: 1 }              // on-chain verification
{ status: 1, createdAt: -1 }
```

---

### Collection: `audit_logs`
Security-critical event audit trail.

```javascript
{
  _id: ObjectId,
  
  // Event identification
  eventType: String,            // See EVENT_TYPES below
  severity: String,             // 'info' | 'warning' | 'critical'
  
  // Actor (who did it)
  actorWallet: String,          // null for system events
  actorIp: String,
  actorSessionId: String,
  
  // Target (what was affected)
  targetType: String,           // 'user' | 'cosmetic' | 'puffle' | 'match' | 'promo_code'
  targetId: String,
  targetWallet: String,         // If different from actor
  
  // Details
  action: String,               // Specific action description
  previousValue: Mixed,         // State before
  newValue: Mixed,              // State after
  
  // Context
  metadata: {
    endpoint: String,           // API endpoint if applicable
    requestBody: Mixed,         // Sanitized request
    responseStatus: Number,
    userAgent: String,
    reason: String              // Why this happened
  },
  
  // Verification
  signature: String,            // Cryptographic proof if applicable
  
  timestamp: Date
}

// EVENT_TYPES:
// 'cosmetic_unlock' | 'cosmetic_equip' | 'invalid_cosmetic_blocked' |
// 'promo_redeemed' | 'promo_invalid_attempt' |
// 'coin_earned' | 'coin_spent' | 'coin_admin_adjust' |
// 'match_started' | 'match_ended' | 'match_wager_resolved' |
// 'auth_success' | 'auth_failure' | 'auth_rate_limited' |
// 'user_banned' | 'user_unbanned' |
// 'admin_action' | 'suspicious_activity'

// ==================== INDEXES ====================
{ eventType: 1, timestamp: -1 }
{ actorWallet: 1, timestamp: -1 }
{ targetWallet: 1, timestamp: -1 }
{ severity: 1, timestamp: -1 }
{ timestamp: -1 }               // general time queries
```

---

## 🏠 Properties (Future)

### Collection: `igloos`
Property ownership and rentals.

```javascript
{
  _id: ObjectId,
  
  // Identity
  iglooId: String,              // Unique igloo ID (e.g., 'igloo3' for SKNY igloo)
  iglooType: String,            // Template type ('classic', 'mansion', 'ski_lodge', 'skny')
  displayName: String,          // e.g., "SKNY's Crib"
  
  // Location
  roomId: String,               // Associated room ID for multiplayer
  worldPosition: {              // Position in town for exterior
    x: Number,
    y: Number, 
    z: Number
  },
  
  // ========== OWNERSHIP ==========
  ownershipType: String,        // 'owned' | 'rentable' | 'system'
  ownerWallet: String,          // Solana wallet of owner (null if system/rentable)
  
  // Purchase info (if owned)
  purchase: {
    purchasedAt: Date,
    purchasePrice: Number,      // In $CPw3
    purchaseTxSignature: String // On-chain proof
  },
  
  // ========== RENTAL (if currently rented) ==========
  rental: {
    renterWallet: String,
    rentedAt: Date,
    expiresAt: Date,
    pricePerDay: Number,
    totalPaid: Number,
    rentalTxSignature: String
  },
  
  // ========== CUSTOMIZATION ==========
  furniture: [{
    itemId: String,
    position: { x: Number, y: Number, z: Number },
    rotation: Number
  }],
  wallpaper: String,
  flooring: String,
  
  // ========== MARKETPLACE ==========
  isForSale: Boolean,
  salePrice: Number,
  listedAt: Date,
  
  // Metadata
  createdAt: Date,
  lastModified: Date,
  visitCount: Number
}

// ==================== INDEXES ====================
{ iglooId: 1 }                  // unique
{ ownerWallet: 1 }
{ ownershipType: 1 }
{ isForSale: 1, salePrice: 1 }  // marketplace queries
{ 'rental.renterWallet': 1 }
{ 'rental.expiresAt': 1 }       // find expiring rentals
```

---

## 🎰 Casino (Future)

### Collection: `slot_sessions`
Slot machine spins for provably fair verification.

```javascript
{
  _id: ObjectId,
  
  sessionId: String,
  playerWallet: String,
  
  // Spin input
  betAmount: Number,            // $CPw3 wagered
  
  // Result
  reels: [String, String, String],  // Three symbols
  isWin: Boolean,
  
  // Payout
  coinPayout: Number,           // Coins won (if any)
  cosmeticDropId: String,       // Cosmetic won (if any)
  cosmeticRarity: String,
  
  // Provably fair
  serverSeed: String,           // Server's secret seed (revealed after)
  serverSeedHash: String,       // Hash shown to player before spin
  clientSeed: String,           // Player-provided seed
  nonce: Number,                // Spin number for this client seed
  
  // Timing
  spunAt: Date,
  
  // Audit reference
  transactionId: ObjectId,      // Bet transaction
  payoutTransactionId: ObjectId // Win transaction (if applicable)
}

// ==================== INDEXES ====================
{ sessionId: 1 }                // unique
{ playerWallet: 1, spunAt: -1 } // player history
{ isWin: 1, cosmeticDropId: 1 } // drop analysis
{ serverSeedHash: 1 }           // verify provably fair
```

---

## 📊 Leaderboards

### Collection: `leaderboards`
Cached leaderboard data (refreshed periodically).

```javascript
{
  _id: ObjectId,
  
  leaderboardType: String,      // 'coins' | 'total_wins' | 'cardJitsu_wins' | 
                                // 'connect4_wins' | 'ticTacToe_wins'
  period: String,               // 'allTime' | 'weekly' | 'daily'
  
  entries: [{
    rank: Number,
    walletAddress: String,
    username: String,
    score: Number,
    characterType: String,      // For avatar display
    customization: {            // For avatar preview
      skin: String,
      hat: String
    }
  }],
  
  maxEntries: Number,           // Typically 100
  
  lastUpdated: Date,
  nextUpdate: Date              // Scheduled refresh time
}

// ==================== INDEXES ====================
{ leaderboardType: 1, period: 1 }  // unique compound
{ nextUpdate: 1 }               // find stale leaderboards
```

---

## 📐 Index Summary

### High-Traffic Indexes (Every Request)
- `users.walletAddress` - Auth lookup
- `auth_sessions.sessionToken` - JWT validation
- `user_cosmetics { walletAddress, cosmeticId }` - Ownership validation

### Leaderboard Indexes
- `users.coins` DESC
- `users.gameStats.*.wins` DESC

### TTL Indexes (Auto-Cleanup)
- `auth_sessions.expiresAt` - Session expiry (30 min default)
- `challenges.expiresAt` - Challenge expiry (5 min default)
- `inbox_messages.expiresAt` - Message expiry

### Audit Indexes
- `audit_logs.timestamp` DESC
- `audit_logs.actorWallet`
- `transactions.txSignature` - On-chain verification

---

## 🔗 Entity Relationships

```
users ─────────────────┬──────────────────┬──────────────────┐
  │                    │                  │                  │
  │ owns               │ owns             │ participates     │
  ▼                    ▼                  ▼                  ▼
puffles          user_cosmetics       matches            igloos
                       │                  │                  │
                       │ references       │ references       │
                       ▼                  ▼                  ▼
                  cosmetics         challenges         transactions
                       │                                     │
                       │                                     │
                       └────────────── audit_logs ───────────┘

promo_codes ──────┐
                  │ tracks
                  ▼
         promo_redemptions

friendships ←────── users ──────→ inbox_messages
```

---

## 📝 Migration Notes

### Data Migration Priority
1. `users` - Core identity, merge all localStorage data
2. `user_cosmetics` - Critical for anti-cheat
3. `puffles` - Player pets
4. `matches` - Start fresh (no history migration needed)

### One-Time Migration Strategy
```
1. Player connects with Phantom wallet
2. Server checks if walletAddress exists in DB
3. If new user AND they have localStorage data:
   a. Prompt: "We detected existing progress. Sign to claim it."
   b. User signs message proving they want to migrate
   c. Server creates user with localStorage data
   d. Mark migration as complete
4. If existing user: normal login flow
5. Clear localStorage after successful migration
```
