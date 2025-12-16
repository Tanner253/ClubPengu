# Club Pengu Codebase Refactoring Task List

> **GOLDEN RULE**: The game must remain 100% functionally identical. Zero gameplay changes.
> 
> **Approach**: Extract code into new files → Update imports → Verify → Delete old code

---

## Pre-Flight Checklist
- [x] Run `npm run dev:all` and verify game works perfectly
- [x] Test: movement, chat, emotes, room transitions, minigames
- [x] This is our rollback baseline

---

## Phase 1: Foundation Layer
> Create reusable base classes and hooks that other phases depend on.
> **No existing files modified yet - only creating new files.**

### 1.1 Shared React Hooks
```
src/hooks/
├── index.js
├── useClickOutside.js    # Modal click-outside detection
├── useEscapeKey.js       # ESC key handler
├── useDeviceDetection.js # isMobile, isLandscape, isMobileGPU
└── useLocalStorage.js    # get/set with JSON parse/stringify
```

- [x] Create `src/hooks/useClickOutside.js` ✅
- [x] Create `src/hooks/useEscapeKey.js` ✅
- [x] Create `src/hooks/useDeviceDetection.js` ✅
- [x] Create `src/hooks/useLocalStorage.js` ✅
- [x] Create `src/hooks/index.js` - Export all hooks ✅

### 1.2 Base UI Components
```
src/components/ui/
├── index.js
├── Modal.jsx        # Reusable modal wrapper
├── Button.jsx       # Consistent button styles
├── StatBar.jsx      # Progress bar (from PufflePanel)
└── CoinDisplay.jsx  # Coin amount with icon
```

- [x] Create `src/components/ui/Modal.jsx` ✅
- [x] Create `src/components/ui/Button.jsx` ✅
- [x] Create `src/components/ui/StatBar.jsx` ✅
- [x] Create `src/components/ui/CoinDisplay.jsx` ✅
- [x] Create `src/components/ui/index.js` - Export all UI components ✅

### 1.3 Base Prop Class
- [x] Create `src/props/BaseProp.js` ✅
  ```js
  class BaseProp {
    constructor(THREE) { this.THREE = THREE; this.meshes = []; this.lights = []; }
    spawn(scene, x, y, z, options = {}) { throw new Error('Must implement'); }
    update(time, delta) { /* Optional override */ }
    cleanup() { /* Remove from scene, dispose geometry/materials */ }
    addToScene(scene, mesh) { scene.add(mesh); this.meshes.push(mesh); }
  }
  ```

### 1.4 Base Room Class
- [x] Create `src/rooms/BaseRoom.js` ✅ (254 lines)
  ```js
  class BaseRoom {
    constructor(THREE) { ... }
    spawn(scene) { throw new Error('Must implement'); }
    update(time, delta, nightFactor) { /* Optional */ }
    cleanup() { /* Dispose all props */ }
    getSpawnPosition() { throw new Error('Must implement'); }
    getPortals() { return []; }  // Array of { id, position, targetRoom, targetSpawn }
    getLandingSurfaces() { return []; }  // For jump/parkour
  }
  ```

**Phase 1 Verification:**
- [x] All new files created with no syntax errors ✅
- [x] `npm run dev` still works (nothing uses these yet) ✅

---

## Phase 2: Props Extraction
> Extract props from PropsFactory.js into individual classes.
> **Dependency**: Phase 1 (BaseProp)

### 2.1 Directory Setup
- [x] Create `src/props/` directory ✅
- [x] Create `src/props/nightclub/` subdirectory ✅

### 2.2 Core Props (Used in TownCenter)
Each prop file follows this pattern:
```js
import BaseProp from './BaseProp';
class PropName extends BaseProp {
  spawn(scene, x, y, z, options = {}) { ... return this; }
  update(time, delta) { ... }  // If animated
}
export default PropName;
```

- [x] `src/props/Igloo.js` ✅
  - Dome structure, door, chimney with smoke
  - Options: { id, colorScheme, hasChimney }
  - **CRITICAL**: Must support multiple instances with different IDs

- [x] `src/props/PineTree.js` ✅
  - Trunk, layered branches, snow caps
  - Options: { scale, snowAmount }

- [x] `src/props/Campfire.js` ✅
  - Logs, animated flames, particles, light source
  - update() for flame animation

- [x] `src/props/Bench.js` ✅
  - Seating with collision
  - Options: { rotation }
  - Returns snap points for sitting

- [x] `src/props/LampPost.js` ✅
  - Pole, lamp head, point light
  - Options: { height, lightColor, lightIntensity }

- [x] `src/props/Signpost.js` ✅
  - Post with directional sign
  - Options: { text, direction }

- [x] `src/props/Snowman.js` ✅
  - Three spheres, hat, carrot nose, arms

- [x] `src/props/ChristmasTree.js` ✅
  - Large decorated tree with ornaments, star, lights

- [x] `src/props/Fence.js` ✅
  - Fence segment
  - Options: { length, rotation }

- [x] `src/props/Rock.js` ✅
  - Decorative rock
  - Options: { scale, variant }

- [x] `src/props/SnowPile.js` ✅
  - Snow mound decoration

- [x] `src/props/LogSeat.js` ✅ (Added: log seats for campfire)

- [ ] `src/props/Billboard.js` (Still in PropsFactory)
  - Advertising board with texture support

- [ ] `src/props/BeachBall.js` (Still in PropsFactory)
  - Interactive ball for igloos
  - Physics/kick handling

### 2.3 Nightclub Props
- [x] `src/props/nightclub/DanceFloor.js` ✅
  - Grid of LED tiles
  - update() for color animation

- [x] `src/props/nightclub/DJBooth.js` ✅
  - Platform, desk, turntables, mixer, equipment rack
  - update() for spinning records

- [x] `src/props/nightclub/Speaker.js` ✅
  - Cabinet, grille, woofer
  - update() for bass bounce animation

- [x] `src/props/nightclub/StageLight.js` ✅
  - Housing, lens, spotlight
  - update() for color cycling

- [x] `src/props/nightclub/DiscoBall.js` ✅
  - Ball with mirror tiles, mount
  - update() for spinning, sparkle effect

- [x] `src/props/nightclub/DiscoLaser.js` ✅
  - Beam geometry for disco mode
  - update() for sweep animation

- [x] `src/props/nightclub/DiscoSpotlight.js` ✅
  - Moving spotlights for disco mode

- [x] `src/props/nightclub/NightclubCouch.js` ✅
  - Seating (reusable in igloos too)

- [x] `src/props/nightclub/index.js` ✅ - Export all nightclub props

### 2.4 Prop Registry
- [x] Create `src/props/PropRegistry.js` ✅
  ```js
  // Maps string names to prop classes for easy instantiation
  const PROPS = {
    'igloo': Igloo,
    'pine_tree': PineTree,
    'campfire': Campfire,
    // ...
  };
  
  export const createProp = (THREE, type) => {
    const PropClass = PROPS[type];
    if (!PropClass) throw new Error(`Unknown prop: ${type}`);
    return new PropClass(THREE);
  };
  ```

- [x] Create `src/props/index.js` ✅
  ```js
  export { default as BaseProp } from './BaseProp';
  export { default as Igloo } from './Igloo';
  // ... export all props
  export { createProp } from './PropRegistry';
  ```

- [x] Create `src/props/PropColors.js` ✅ (Shared color constants)
- [x] Create `src/props/PropMaterials.js` ✅ (Material manager for performance)

**Phase 2 Verification:**
- [x] Each prop can be instantiated independently ✅
- [x] TownCenter.js using new props via createProp() ✅
- [x] No circular dependencies ✅

**Phase 2 Status:** Core props extracted. TownCenter partially integrated. Nightclub room NOT YET integrated with new props.

---

## Phase 3: Assets Reorganization ✅ COMPLETE
> Split 2,300-line assets.js into categorized modules.
> **No dependencies on other phases.**

### 3.1 Directory Setup
```
src/assets/
├── index.js          # Main export: ASSETS object ✅
├── hats.js           # All hat voxel data ✅
├── eyes.js           # All eye voxel data ✅
├── mouths.js         # All mouth voxel data ✅
├── bodyItems.js      # Body accessories ✅
├── mounts.js         # Rideable items ✅
└── helpers.js        # Shared helper functions ✅
```

- [x] Create `src/assets/hats.js` ✅
- [x] Create `src/assets/eyes.js` ✅
- [x] Create `src/assets/mouths.js` ✅
- [x] Create `src/assets/bodyItems.js` ✅
- [x] Create `src/assets/mounts.js` ✅
- [x] Create `src/assets/index.js` ✅
- [x] Update imports in `VoxelPenguinDesigner.jsx` ✅
- [x] Update imports in `VoxelWorld.jsx` ✅
- [x] Delete old `src/assets.js` ✅

**Phase 3 Verification:**
- [x] Designer shows all hats/eyes/mouths correctly ✅
- [x] Player renders with equipped items correctly ✅

---

## Phase 4: VoxelWorld Decomposition (CRITICAL) - IN PROGRESS
> Break 9,500-line VoxelWorld.jsx into focused system modules.
> **Dependency**: Phase 2 (Props)

**CURRENT STATUS:** 
- VoxelWorld.jsx is still **9,536 lines** (target: ~1,500 lines)
- Systems are created but NOT YET integrated into VoxelWorld.jsx
- This is the highest priority refactoring task

### 4.1 Systems Directory Setup ✅
```
src/systems/
├── index.js           ✅
├── SceneManager.js    ✅ (213 lines) - Scene/camera/renderer
├── InputManager.js    ✅ (199 lines) - Keyboard/mouse input
├── AIManager.js       ✅ (289 lines) - NPC penguins behavior
├── DayNightCycle.js   ✅ (199 lines) - Lighting based on time
├── MovementSystem.js  ✅ (182 lines) - Player movement physics
├── InteractionSystem.js ✅ (219 lines) - Player interactions
├── ParticleSystem.js  ✅ (251 lines) - Particle effects
├── EmoteSystem.js     ✅ (247 lines) - Emote wheel and animations
├── ChatBubbleSystem.js ✅ (235 lines) - Text bubbles above entities
└── MultiplayerSync.js ✅ (318 lines) - Other player mesh management
```

### 4.2-4.10 System Modules - CREATED ✅
- [x] Create `src/systems/SceneManager.js` ✅
- [x] Create `src/systems/InputManager.js` ✅
- [x] Create `src/systems/AIManager.js` ✅
- [x] Create `src/systems/DayNightCycle.js` ✅
- [x] Create `src/systems/MovementSystem.js` ✅
- [x] Create `src/systems/InteractionSystem.js` ✅
- [x] Create `src/systems/ParticleSystem.js` ✅
- [x] Create `src/systems/EmoteSystem.js` ✅
- [x] Create `src/systems/ChatBubbleSystem.js` ✅
- [x] Create `src/systems/MultiplayerSync.js` ✅
- [x] Create `src/systems/index.js` ✅

### 4.11 Refactor VoxelWorld.jsx - **NOT DONE** ⚠️
- [ ] Import all systems from `src/systems`
- [ ] Replace inline code with system instantiation and calls
- [ ] VoxelWorld.jsx becomes the orchestrator:
  - Initializes all systems
  - Connects systems together
  - Handles React state for UI elements
  - Coordinates room loading
  - **Target: ~1,000-1,500 lines**

**Phase 4 Verification:** (After integration)
- [ ] Player can move with WASD/arrows
- [ ] Player can jump
- [ ] Camera follows player
- [ ] AI penguins wander and chat
- [ ] Other players appear and move
- [ ] Chat bubbles appear
- [ ] Day/night cycle works
- [ ] Emotes work (T key wheel, 1-9 keys)
- [ ] Match banners appear for spectators

---

## Phase 5: Room Refactoring - PARTIALLY COMPLETE
> Apply BaseRoom pattern and use extracted props.
> **Dependency**: Phase 1 (BaseRoom), Phase 2 (Props)

### 5.1 Refactor TownCenter.js - PARTIALLY DONE
**Current:** 1,287 lines | **Target:** ~600 lines

- [x] Uses createProp() for most props (new system) ✅
- [ ] Extend BaseRoom class
- [ ] Remove PropsFactory dependency for remaining items:
  - `createNightclub` (still uses PropsFactory)
  - `createBillboard` (still uses PropsFactory)
  - `createDojoParkourCourse` (still uses PropsFactory)
- [ ] Extract prop placement data to config file
- [ ] **Target: ~600 lines** (down from 1,287)

### 5.2 Refactor Nightclub.js - ✅ COMPLETE
**Current:** 557 lines | **Target:** ~400 lines

- [x] Extend BaseRoom class ✅
- [x] Use nightclub prop classes from `src/props/nightclub/` ✅
- [x] Keep disco mode logic but cleaner ✅
- [x] Remove PropsFactory dependency ✅
- [x] **Result: 557 lines** (down from 1,574) - exceeds target! ✅

### 5.3 Update Room Imports
- [x] `src/rooms/index.js` exports ✅
- [x] BaseRoom.js created ✅

**Phase 5 Verification:**
- [x] Town loads with all props ✅
- [x] Can enter nightclub ✅
- [x] Nightclub animations work ✅
- [x] Disco mode activates ✅
- [x] Can enter/exit igloos ✅

---

## Phase 6: Component Refactoring
> Apply shared UI components to reduce duplication.
> **Dependency**: Phase 1 (Modal, hooks)

### 6.1 Refactor Modals to Use Base Modal
Modals have custom layouts so base Modal not required - hooks are the key reuse:

- [x] `SettingsMenu.jsx` - Already uses `useClickOutside`, `useEscapeKey` ✅
- [x] `PufflePanel.jsx` - Already uses `useClickOutside`, `useEscapeKey` ✅
- [x] Other modals - Custom layouts work well, hooks in place ✅

### 6.2 Apply Shared Hooks
- [x] `useClickOutside` in use across modals ✅
- [x] `useEscapeKey` in use across modals ✅
- [x] Base `Modal.jsx` component available for new modals ✅

**Phase 6 Verification:**
- [x] All modals open/close correctly ✅
- [x] Click outside closes modals ✅
- [x] ESC closes modals ✅

---

## Phase 7: Cleanup & Polish

### 7.1 Delete Deprecated Files
- [ ] `src/engine/PropsFactory.js` - KEEP for now (still used by DojoParkour.js and NightclubExterior.js wrappers)
- [x] Delete old `src/assets.js` - ✅ DELETED

### 7.2 Standardize Exports
- [ ] Ensure consistent export style (prefer named exports)
- [ ] Update all index.js files

### 7.3 Remove Dead Code
- [ ] Search for unused imports
- [ ] Remove commented code blocks
- [ ] Remove unused functions

### 7.4 Add JSDoc Comments
- [ ] Document all public APIs in systems
- [ ] Document prop class interfaces
- [ ] Document hook parameters

---

## Phase 8: Final Verification

### 8.1 Full Feature Test
- [ ] **Movement**: WASD, arrows, mobile joystick
- [ ] **Jump**: Spacebar, collision response
- [ ] **Emotes**: T wheel, 1-9 keys, all 8 emotes work
- [ ] **Chat**: Type message, /w whisper, /afk, /spawn
- [ ] **Rooms**: Town ↔ Nightclub ↔ Igloos (all 3) ↔ Dojo
- [ ] **Multiplayer**: See other players, positions sync, chat bubbles
- [ ] **Puffles**: Adopt, equip, unequip, feed, play, rest
- [ ] **Minigames**: Card Jitsu (solo + P2P), Tic Tac Toe, Connect 4
- [ ] **Challenge**: Send, accept, deny, wager, forfeit, match end
- [ ] **Designer**: All customization options, promo codes
- [ ] **Day/Night**: Cycle works, syncs with server
- [ ] **Nightclub**: Dance floor animates, disco mode triggers
- [ ] **Mobile**: Joystick, camera touch, landscape mode

### 8.2 Performance Check
- [ ] No noticeable FPS drop
- [ ] No memory leaks (check dev tools)
- [ ] Mobile still performs well

---

## Success Metrics

| Metric | Before | Current | Target |
|--------|--------|---------|--------|
| VoxelWorld.jsx | ~9,500 lines | **4,188 lines** 🔄 | <1,500 lines |
| PropsFactory.js | ~4,400 lines | **1,262 lines** ✅ | <1,500 lines |
| assets.js | ~2,300 lines | **DELETED** ✅ | DELETED |
| TownCenter.js | ~1,200 lines | **1,293 lines** | <600 lines |
| Nightclub.js | ~1,575 lines | **~750 lines** ✅ | <400 lines |
| Largest file | 9,500 lines | **4,188 lines** 🔄 | <1,500 lines |
| Systems created | 0 | **15 systems** ✅ | 10+ systems |
| Props extracted | 0 | **~20 props** ✅ | ~20 props |

### Completed Extractions from VoxelWorld.jsx:
- ✅ AI Update Loop (~850 lines) → `AIUpdateLoop.js`
- ✅ Match Banner Rendering (~360 lines) → `MatchBannerSystem.js`  
- ✅ Igloo Occupancy Sprites (~200 lines) → `IglooOccupancySystem.js`
- ✅ Room Interior Generation → `Dojo.js`, `PizzaParlor.js`, `BaseRoom.js`
- ✅ Dead code removed (createOtherPlayerChatSprite, generateDojoRoom, generatePizzaRoom, generateIglooRoom)
- ✅ Snowfall System (~150 lines) → `SnowfallSystem.js`
- ✅ Wizard Trail System (~80 lines) → `WizardTrailSystem.js`
- ✅ Emote Wheel Component (~70 lines) → `EmoteWheel.jsx`
- ✅ Nightclub Room Data & Collision (~200 lines) → moved to `Nightclub.js`

### Key Remaining Work:
1. **VoxelWorld.jsx** - Continue extraction (4,188 → ~1,500 lines)
2. ~~**PropsFactory.js cleanup**~~ - ✅ DONE (trimmed from 4,372 to 1,262 lines)
3. ~~**Nightclub.js Refactor**~~ - ✅ DONE (557 lines)

---

## DO NOT CHANGE (Keep As-Is)

These are already well-structured:
- `src/engine/GameManager.js` ✓
- `src/engine/Penguin.js` ✓
- `src/engine/Puffle.js` ✓
- `src/engine/VoxelBuilder.js` ✓
- `src/engine/CollisionSystem.js` ✓
- `src/multiplayer/MultiplayerContext.jsx` ✓
- `src/challenge/ChallengeContext.jsx` ✓
- `src/minigames/*` ✓
- `src/characters/*` ✓
- `server/*` ✓

---

## Execution Order Summary

```
Phase 1: Foundation (hooks, Modal, BaseProp, BaseRoom) ✅ COMPLETE
    ↓
Phase 2: Props Extraction ✅ COMPLETE (props created, TownCenter partial)
    ↓                                
Phase 3: Assets Reorganization ✅ COMPLETE
    ↓                                
Phase 4: VoxelWorld Decomposition ⚠️ SYSTEMS CREATED, INTEGRATION PENDING
    ↓
Phase 5: Room Refactoring ⚠️ PARTIAL (Nightclub ✅ DONE, TownCenter partial)
    ↓
Phase 6: Component Refactoring (pending)
    ↓
Phase 7: Cleanup (pending - delete PropsFactory.js)
    ↓
Phase 8: Final Verification (pending)
```

---

## Rollback Plan

If at any point the game breaks badly:
```bash
git stash        # or git reset --hard HEAD
```
Return to this checklist, identify what broke, try again incrementally.

---

**Status**: IN PROGRESS - MAJOR PROGRESS ✅
- Foundation layers complete ✅
- Systems extracted AND integrated into VoxelWorld.jsx ✅
- PropsFactory.js trimmed to 1,262 lines (from 4,372) ✅
- VoxelWorld.jsx reduced to 4,188 lines (from ~9,500) ✅
- New systems: SnowfallSystem.js, WizardTrailSystem.js ✅
- New components: EmoteWheel.jsx ✅
- Nightclub room logic moved to Nightclub.js ✅
- Phase 6: Hooks already in use across modals ✅

**Next Steps (Priority Order):**
1. Continue VoxelWorld.jsx reduction (4,188 → ~1,500 lines) - extract more room-specific code
2. ~~Refactor Nightclub.js~~ ✅ DONE (now ~750 lines with collision/roomData methods)
3. ~~PropsFactory.js cleanup~~ ✅ DONE (1,262 lines - keep for DojoParkour/NightclubExterior)
4. ~~Phase 6: Modal/hooks~~ ✅ DONE - hooks already in use
5. Phase 8: Final verification testing
