# 🎨 Cosmetics Implementation Roadmap

> **Last Updated:** January 30, 2026

---

## ✅ PHASE 1 COMPLETE: Animated Skins

All 8 new animated skins have been implemented with:
- ✅ **Multiplayer sync** - Animations visible to all players
- ✅ **Profile previews** - Animated in PenguinPreview3D
- ✅ **Designer UI** - Glowing indicator + sparkle emoji for animated colors
- ✅ **Gacha drops** - Added to seedCosmetics.js

### Implemented Skins:
| Skin | Rarity | Description |
|------|--------|-------------|
| 🔥 Lava | Epic | Orange/red/black flowing molten rock |
| 🌊 Ocean | Epic | Blue/teal wave ripple effect |
| 🌅 Sunset | Epic | Orange→pink→purple warm gradient |
| ❄️ Frost | Epic | Ice blue with crystal shimmer |
| 💻 Matrix | Epic | Green digital code cascade |
| 📺 Glitch | Epic | RGB corruption effect |
| 🔘 Chromatic | Legendary | Metallic chrome color shift |
| 🌈 Holographic | Legendary | Oily rainbow shimmer |

---

> **Work Style:** Implement ONE item → Test in-game → Mark complete → Move to next
> **Created:** January 30, 2026

---

## 🔧 SYSTEM ARCHITECTURE (How Cosmetics Work)

### Backend (Server)

| File | Purpose |
|------|---------|
| `server/db/models/CosmeticTemplate.js` | Database schema for cosmetic catalog |
| `server/scripts/seedCosmetics.js` | **MASTER SEED** - Defines all gacha cosmetics |
| `server/services/GachaService.js` | Handles gacha rolls and minting |
| `server/db/models/OwnedCosmetic.js` | Tracks user ownership |

### Frontend (Client)

| File | Purpose |
|------|---------|
| `src/assets/hats.js` | Voxel data for hats/feathers |
| `src/assets/mounts.js` | Voxel data for mounts |
| `src/assets/index.js` | Unified asset exports |
| `src/constants.js` | `PALETTE` - hex colors for skins |
| `src/engine/PenguinBuilder.js` | `ANIMATED_SKIN_COLORS` config + build logic |
| `src/VoxelPenguinDesigner.jsx` | Designer UI + cosmetic selection |
| `src/components/PenguinCreatorOverlay.jsx` | Overlay picker + animated skin config |

---

## 📋 FILES TO MODIFY PER COSMETIC TYPE

### For ANIMATED SKINS (8 items)

```
1. src/constants.js                          → Add to PALETTE (hex value)
2. src/engine/PenguinBuilder.js              → Add to ANIMATED_SKIN_COLORS
3. src/VoxelPenguinDesigner.jsx              → Add to ANIMATED_SKIN_COLORS + PREMIUM_SKIN_COLORS
4. src/components/PenguinCreatorOverlay.jsx  → Add to ANIMATED_SKIN_COLORS + PREMIUM_SKIN_COLORS
5. server/scripts/seedCosmetics.js           → Add to GACHA_SKIN_COLORS
6. RUN: node server/scripts/seedCosmetics.js → Populate database
```

### For FEATHERS/HATS (3 items)

```
1. src/assets/hats.js                        → Add voxel data
2. server/scripts/seedCosmetics.js           → Add to HATS object
3. src/engine/PenguinBuilder.js              → Add animation handler if hasFx/isAnimated
4. RUN: node server/scripts/seedCosmetics.js → Populate database
```

### For MOUNTS (6 items)

```
1. src/assets/mounts.js                      → Add voxel data + animation parts
2. server/scripts/seedCosmetics.js           → Add to MOUNTS object
3. src/engine/PenguinBuilder.js              → Add animation handler (e.g., animationType)
4. RUN: node server/scripts/seedCosmetics.js → Populate database
```

---

## 📊 Progress Overview

| Category | Total | Completed | Remaining |
|----------|-------|-----------|-----------|
| Animated Skins | 8 | 8 | 0 ✅ |
| Feathers | 3 | 3 | 0 ✅ |
| Mounts | 6 | 6 | 0 ✅ |
| Bonus Dragons | 6 | 6 | 0 ✅ |
| **TOTAL** | **23** | **23** | **0** |

### 🎉 ALL COSMETICS COMPLETE!

---

## 🎨 ANIMATED SKINS (8 items)

> **Rarity:** Epic (animated) or Legendary (animated + glow)
> **Files:** constants.js, PenguinBuilder.js, VoxelPenguinDesigner.jsx, PenguinCreatorOverlay.jsx, seedCosmetics.js

### Skin 1: Lava
- [ ] **Status:** Not Started
- **Rarity:** Epic
- **Description:** Orange/red/black flowing like molten lava
- **Palette Hex:** `#CF1020`
- **Animation Config:**
```javascript
lava: {
    colors: ['#FF4500', '#FF6600', '#CC3300', '#8B0000', '#1a0000', '#FF4500'],
    speed: 0.7,
    emissive: 0.4,
    hasStars: false,
    usePhaseOffsets: true
}
```

---

### Skin 2: Ocean
- [ ] **Status:** Not Started
- **Rarity:** Epic
- **Description:** Blue/teal with wave ripple effect
- **Palette Hex:** `#006994`
- **Animation Config:**
```javascript
ocean: {
    colors: ['#006994', '#0077B6', '#00B4D8', '#48CAE4', '#90E0EF', '#006994'],
    speed: 0.5,
    emissive: 0.15,
    hasStars: false,
    usePhaseOffsets: true
}
```

---

### Skin 3: Sunset
- [ ] **Status:** Not Started
- **Rarity:** Epic
- **Description:** Warm orange → pink → purple gradient shift
- **Palette Hex:** `#FF6B35`
- **Animation Config:**
```javascript
sunset: {
    colors: ['#FF6B35', '#F7931A', '#FF5E78', '#C71585', '#9B59B6', '#FF6B35'],
    speed: 0.4,
    emissive: 0.2,
    hasStars: false,
    usePhaseOffsets: true
}
```

---

### Skin 4: Frost
- [ ] **Status:** Not Started
- **Rarity:** Legendary (hasGlow)
- **Description:** Ice blue with white frost crystals
- **Palette Hex:** `#E0FFFF`
- **Animation Config:**
```javascript
frost: {
    colors: ['#E0FFFF', '#B0E0E6', '#87CEEB', '#ADD8E6', '#F0FFFF', '#E0FFFF'],
    speed: 0.3,
    emissive: 0.25,
    hasStars: true,  // Repurpose as ice crystals
    usePhaseOffsets: true
}
```

---

### Skin 5: Chromatic
- [ ] **Status:** Not Started
- **Rarity:** Legendary (hasGlow)
- **Description:** Metallic chrome with color shifting
- **Palette Hex:** `#C0C0C0`
- **Animation Config:**
```javascript
chromatic: {
    colors: ['#C0C0C0', '#A8A8A8', '#D4AF37', '#E6E6FA', '#B8B8B8', '#C0C0C0'],
    speed: 0.6,
    emissive: 0.35,
    hasStars: false,
    usePhaseOffsets: true
}
```
- **Note:** Already exists in seedCosmetics.js - just need frontend implementation

---

### Skin 6: Matrix
- [ ] **Status:** Not Started
- **Rarity:** Epic
- **Description:** Green digital code aesthetic
- **Palette Hex:** `#00FF00`
- **Animation Config:**
```javascript
matrix: {
    colors: ['#001100', '#003300', '#00FF00', '#00CC00', '#009900', '#001100'],
    speed: 1.0,  // Fast like code
    emissive: 0.3,
    hasStars: true,  // Repurpose as "code bits"
    usePhaseOffsets: false
}
```

---

### Skin 7: Glitch
- [ ] **Status:** Not Started
- **Rarity:** Epic
- **Description:** RGB split / digital glitch effect
- **Palette Hex:** `#FF00FF`
- **Animation Config:**
```javascript
glitch: {
    colors: ['#FF0000', '#00FF00', '#0000FF', '#FF00FF', '#00FFFF', '#FFFF00'],
    speed: 2.0,  // Fast/erratic
    emissive: 0.3,
    hasStars: false,
    usePhaseOffsets: false  // All same color = uniform glitch
}
```

---

### Skin 8: Holographic
- [ ] **Status:** Not Started
- **Rarity:** Legendary (hasGlow)
- **Description:** Oily holographic rainbow shifting (like holo cards)
- **Palette Hex:** `#E6E6FA`
- **Animation Config:**
```javascript
holographic: {
    colors: ['#FF69B4', '#00CED1', '#FFD700', '#9370DB', '#00FA9A', '#FF69B4'],
    speed: 0.8,
    emissive: 0.4,
    hasStars: true,  // Sparkle effect
    usePhaseOffsets: true,
    phaseMultiplier: 0.8
}
```
- **Note:** Already exists in seedCosmetics.js - just need frontend implementation

---

## 🪶 FEATHERS / HEAD EFFECTS (3 items)

> **Files:** src/assets/hats.js, seedCosmetics.js, PenguinBuilder.js (for FX)

### Feathers 1: Aurora Feathers
- [ ] **Status:** Not Started
- **Rarity:** Mythic
- **FX Type:** `auroraShimmer`
- **Description:** Northern lights colors flowing through feathers
- **Voxel Pattern:** Similar to `phoenixFeathers` but taller, flowing
- **Colors Cycle:** `['#00FF7F', '#00CED1', '#4169E1', '#8A2BE2', '#FF69B4']`
- **Seed Entry:**
```javascript
auroraFeathers: { 
    rarity: 'mythic', 
    name: 'Aurora Feathers', 
    duplicateGold: 10000, 
    hasGlow: true, 
    hasFx: true, 
    isAnimated: true,
    description: 'Northern lights dance through these ethereal feathers'
}
```

---

### Feathers 2: Crystal Feathers
- [ ] **Status:** Not Started
- **Rarity:** Legendary
- **FX Type:** `crystalPulse`
- **Description:** Transparent crystalline feathers with rainbow refraction
- **Voxel Pattern:** Spikey crystal formations pointing upward
- **Material:** Semi-transparent (opacity ~0.7), prismatic sparkle
- **Seed Entry:**
```javascript
crystalFeathers: { 
    rarity: 'legendary', 
    name: 'Crystal Feathers', 
    duplicateGold: 2500, 
    hasGlow: true, 
    hasFx: true, 
    isAnimated: true,
    description: 'Crystalline plumes that refract light into rainbows'
}
```

---

### Feathers 3: Void Feathers
- [ ] **Status:** Not Started
- **Rarity:** Mythic
- **FX Type:** `voidParticles`
- **Description:** Deep black feathers with purple void particles falling off
- **Voxel Pattern:** Dark feathers with purple edge glow
- **Colors:** `['#0a0012', '#1a0033', '#2d0052', '#4a0080']`
- **Seed Entry:**
```javascript
voidFeathers: { 
    rarity: 'mythic', 
    name: 'Void Feathers', 
    duplicateGold: 10000, 
    hasGlow: true, 
    hasFx: true, 
    isAnimated: true,
    description: 'Feathers touched by the void. Dark particles drift eternally.'
}
```

---

## 🛹 MOUNTS (6 items)

> **Files:** src/assets/mounts.js, seedCosmetics.js, PenguinBuilder.js (animation)

### Mount 1: Shopping Cart - ✅ COMPLETED
- [x] **Status:** Complete
- **Rarity:** Rare
- **Animation Type:** `cart_wobble`
- **Description:** Wobbly shopping cart with spinning wheels
- **Animations Implemented:**
  - 4 separate wheels spin when moving
  - Cart wobbles side-to-side and front-to-back
  - Vertical bounce for bumpy wheel effect
  - Back wheels swivel when turning (realistic shopping cart physics!)
  - Turn lean animation
  - Full multiplayer support
- **Files Modified:**
  - `src/assets/mounts.js` - Added voxel data with wire mesh basket, handle, 4 wheel parts
  - `src/engine/PenguinBuilder.js` - Added wheel pivot support
  - `src/VoxelWorld.jsx` - Added local + multiplayer animation
  - `server/scripts/seedCosmetics.js` - Added to gacha

---

### Mount 2: Giant Rubber Duck - ✅ COMPLETED
- [x] **Status:** Complete
- **Rarity:** Epic
- **Animation Type:** `duck_bounce`
- **Description:** Oversized yellow rubber duck with bouncy waddle animation
- **Animations Implemented:**
  - Bouncy up/down movement while moving
  - Side-to-side waddle (classic duck walk)
  - Forward head bob on each "step"
  - Squish effect on landing (rubber compression)
  - Turn lean when steering
  - Gentle idle bobbing when stationary
  - Full multiplayer support
- **Files Modified:**
  - `src/assets/mounts.js` - Voxel data (body, head, beak, eyes, wings, tail)
  - `src/VoxelWorld.jsx` - Local + multiplayer animation
  - `server/scripts/seedCosmetics.js` - Added to gacha

---

### Mount 3: Giant Puffle - ✅ COMPLETED
- [x] **Status:** Complete
- **Rarity:** Legendary
- **Animation Type:** `puffle_bounce`
- **Description:** Giant rideable blue puffle with wiggling tuft
- **Animations Implemented:**
  - Big exaggerated bouncy ball physics
  - Squish on landing, stretch in air (rubber ball feel)
  - Wobble/rolling motion while moving
  - Animated tuft wiggle (separate pivot)
  - Turn lean when steering
  - Idle breathing animation with gentle sway
  - Full multiplayer support
- **Files Modified:**
  - `src/assets/mounts.js` - Voxel data (body, eyes, feet, tuft)
  - `src/engine/PenguinBuilder.js` - Tuft pivot support
  - `src/VoxelWorld.jsx` - Local + multiplayer animation
  - `server/scripts/seedCosmetics.js` - Added to gacha

---

### Mount 4: UFO Disc
- [ ] **Status:** Not Started
- **Rarity:** Legendary
- **Animation Type:** `ufo_spin`
- **Description:** Flying saucer with rotating ring and glow
- **Technical Notes:**
  - Classic UFO shape: dome on top, disc body
  - Separate outer ring mesh that rotates
  - Glow effect on underside (lights)
  - Slight hover bobbing
- **Seed Entry:**
```javascript
ufoDisc: { 
    rarity: 'legendary', 
    name: 'UFO Disc', 
    duplicateGold: 2500, 
    hasGlow: true, 
    isAnimated: true,
    description: 'Alien technology at your service. Beam me up!'
}
```

---

### Mount 5: Rocket Jetpack
- [ ] **Status:** Not Started
- **Rarity:** Mythic
- **Animation Type:** `jetpack_thrust`
- **Description:** Jetpack with fire trail, rider hovers slightly
- **Technical Notes:**
  - Jetpack worn on back (not really a "mount" but rideable)
  - Fire particle system at exhaust (reuse fire FX pattern)
  - Rider hovers slightly off ground
  - Thrust increases while moving
- **Seed Entry:**
```javascript
rocketJetpack: { 
    rarity: 'mythic', 
    name: 'Rocket Jetpack', 
    duplicateGold: 10000, 
    hasGlow: true, 
    hasFx: true, 
    isAnimated: true,
    description: 'Blast off! Fire trail included.'
}
```

---

### Mount 6: Ice Dragon
- [ ] **Status:** Not Started
- **Rarity:** Mythic
- **Animation Type:** `dragon_glide`
- **Description:** Majestic ice dragon with flapping wings, ice breath trail
- **Technical Notes:**
  - Elongated dragon body for riding
  - Animated wings (reuse wingFlap pattern)
  - Ice particle trail from mouth (reuse iceBreath pattern)
  - Ice blue color palette
  - Most complex mount - save for last
- **Seed Entry:**
```javascript
iceDragon: { 
    rarity: 'mythic', 
    name: 'Ice Dragon', 
    duplicateGold: 10000, 
    hasGlow: true, 
    hasFx: true, 
    isAnimated: true,
    description: 'A magnificent ice dragon. Wings flap, frost trails behind.'
}
```

---

## 📋 IMPLEMENTATION ORDER (Suggested)

Starting with simpler items to build momentum:

### Phase 1: Animated Skins (Quick Wins - Config Only)
1. [ ] Lava Skin
2. [ ] Ocean Skin
3. [ ] Sunset Skin
4. [ ] Frost Skin
5. [ ] Matrix Skin
6. [ ] Glitch Skin
7. [ ] Chromatic Skin (already in DB, just frontend)
8. [ ] Holographic Skin (already in DB, just frontend)

### Phase 2: Feathers (Voxels + FX)
9. [ ] Crystal Feathers
10. [ ] Aurora Feathers
11. [ ] Void Feathers

### Phase 3: Mounts (Most Complex)
12. [ ] Shopping Cart (simplest)
13. [ ] Giant Rubber Duck
14. [ ] Giant Puffle
15. [ ] UFO Disc
16. [ ] Rocket Jetpack
17. [ ] Ice Dragon (most complex)

---

## 🧪 TESTING CHECKLIST (Per Item)

Before marking complete, verify:
- [ ] Voxel data renders correctly
- [ ] Animation plays smoothly (if animated)
- [ ] Appears in penguin designer selection
- [ ] Can be equipped and saved
- [ ] Appears correctly on other players (multiplayer sync)
- [ ] Database seeded (run seedCosmetics.js)
- [ ] Gacha can drop it (check rarity tier)
- [ ] No console errors
- [ ] Build passes (`npm run build`)

---

## 🔧 QUICK REFERENCE: Rarity Weights

From `server/services/GachaService.js`:

| Rarity | Weight | Chance |
|--------|--------|--------|
| Common | 5500 | 55.00% |
| Uncommon | 2800 | 28.00% |
| Rare | 1200 | 12.00% |
| Epic | 400 | 4.00% |
| Legendary | 80 | 0.80% |
| Mythic | 18 | 0.18% |
| Divine | 2 | 0.02% |

---

*Last Updated: January 30, 2026*
