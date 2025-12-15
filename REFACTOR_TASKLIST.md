# Club Pengu Codebase Refactoring Task List

> **GOLDEN RULE**: The game must remain 100% functionally identical. Zero gameplay changes.
> 
> **Approach**: Extract code into new files → Update imports → Verify → Delete old code

---

## Pre-Flight Checklist
- [ ] Run `npm run dev:all` and verify game works perfectly
- [ ] Test: movement, chat, emotes, room transitions, minigames
- [ ] This is our rollback baseline

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

- [ ] Create `src/hooks/useClickOutside.js`
  ```js
  // Takes ref and callback, calls callback when click outside ref
  export const useClickOutside = (ref, callback) => { ... }
  ```

- [ ] Create `src/hooks/useEscapeKey.js`
  ```js
  // Calls callback when ESC pressed
  export const useEscapeKey = (callback, enabled = true) => { ... }
  ```

- [ ] Create `src/hooks/useDeviceDetection.js`
  ```js
  // Returns { isMobile, isLandscape, isMobileGPU }
  export const useDeviceDetection = () => { ... }
  ```

- [ ] Create `src/hooks/useLocalStorage.js`
  ```js
  // Like useState but persists to localStorage
  export const useLocalStorage = (key, initialValue) => { ... }
  ```

- [ ] Create `src/hooks/index.js` - Export all hooks

### 1.2 Base UI Components
```
src/components/ui/
├── index.js
├── Modal.jsx        # Reusable modal wrapper
├── Button.jsx       # Consistent button styles
├── StatBar.jsx      # Progress bar (from PufflePanel)
└── CoinDisplay.jsx  # Coin amount with icon
```

- [ ] Create `src/components/ui/Modal.jsx`
  ```jsx
  // Props: isOpen, onClose, title, children, size ('sm'|'md'|'lg'), className
  // Handles: backdrop, click-outside, ESC key, animations, scroll lock
  // Uses: useClickOutside, useEscapeKey hooks
  ```

- [ ] Create `src/components/ui/Button.jsx`
  ```jsx
  // Props: variant ('primary'|'secondary'|'danger'), size, disabled, children
  // Consistent styling across app
  ```

- [ ] Create `src/components/ui/StatBar.jsx`
  ```jsx
  // Props: label, value (0-100), color, icon, inverted
  // Extract from PufflePanel
  ```

- [ ] Create `src/components/ui/CoinDisplay.jsx`
  ```jsx
  // Props: amount, size, showIcon
  // Reusable coin display
  ```

- [ ] Create `src/components/ui/index.js` - Export all UI components

### 1.3 Base Prop Class
- [ ] Create `src/props/BaseProp.js`
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
- [ ] Create `src/rooms/BaseRoom.js`
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
- [ ] All new files created with no syntax errors
- [ ] `npm run dev` still works (nothing uses these yet)

---

## Phase 2: Props Extraction
> Extract props from PropsFactory.js into individual classes.
> **Dependency**: Phase 1 (BaseProp)

### 2.1 Directory Setup
- [ ] Create `src/props/` directory
- [ ] Create `src/props/nightclub/` subdirectory

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

- [ ] `src/props/Igloo.js` (~150 lines)
  - Dome structure, door, chimney with smoke
  - Options: { id, colorScheme, hasChimney }
  - **CRITICAL**: Must support multiple instances with different IDs

- [ ] `src/props/PineTree.js` (~80 lines)
  - Trunk, layered branches, snow caps
  - Options: { scale, snowAmount }

- [ ] `src/props/Campfire.js` (~120 lines)
  - Logs, animated flames, particles, light source
  - update() for flame animation

- [ ] `src/props/Bench.js` (~60 lines)
  - Seating with collision
  - Options: { rotation }
  - Returns snap points for sitting

- [ ] `src/props/LampPost.js` (~70 lines)
  - Pole, lamp head, point light
  - Options: { height, lightColor, lightIntensity }

- [ ] `src/props/SignPost.js` (~50 lines)
  - Post with directional sign
  - Options: { text, direction }

- [ ] `src/props/Snowman.js` (~80 lines)
  - Three spheres, hat, carrot nose, arms

- [ ] `src/props/ChristmasTree.js` (~150 lines)
  - Large decorated tree with ornaments, star, lights

- [ ] `src/props/Fence.js` (~40 lines)
  - Fence segment
  - Options: { length, rotation }

- [ ] `src/props/Rock.js` (~30 lines)
  - Decorative rock
  - Options: { scale, variant }

- [ ] `src/props/SnowPile.js` (~30 lines)
  - Snow mound decoration

- [ ] `src/props/Billboard.js` (~60 lines)
  - Advertising board with texture support

- [ ] `src/props/BeachBall.js` (~80 lines)
  - Interactive ball for igloos
  - Physics/kick handling

### 2.3 Nightclub Props
- [ ] `src/props/nightclub/DanceFloor.js` (~100 lines)
  - Grid of LED tiles
  - update() for color animation

- [ ] `src/props/nightclub/DJBooth.js` (~200 lines)
  - Platform, desk, turntables, mixer, equipment rack
  - update() for spinning records

- [ ] `src/props/nightclub/Speaker.js` (~80 lines)
  - Cabinet, grille, woofer
  - update() for bass bounce animation

- [ ] `src/props/nightclub/StageLight.js` (~60 lines)
  - Housing, lens, spotlight
  - update() for color cycling

- [ ] `src/props/nightclub/DiscoBall.js` (~100 lines)
  - Ball with mirror tiles, mount
  - update() for spinning, sparkle effect

- [ ] `src/props/nightclub/Laser.js` (~50 lines)
  - Beam geometry for disco mode
  - update() for sweep animation

- [ ] `src/props/nightclub/Couch.js` (~50 lines)
  - Seating (reusable in igloos too)

- [ ] `src/props/nightclub/index.js` - Export all nightclub props

### 2.4 Prop Registry
- [ ] Create `src/props/PropRegistry.js`
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

- [ ] Create `src/props/index.js`
  ```js
  export { default as BaseProp } from './BaseProp';
  export { default as Igloo } from './Igloo';
  // ... export all props
  export { createProp } from './PropRegistry';
  ```

**Phase 2 Verification:**
- [ ] Each prop can be instantiated independently
- [ ] Test a few props in isolation if possible
- [ ] No circular dependencies

---

## Phase 3: Assets Reorganization  
> Split 2,300-line assets.js into categorized modules.
> **No dependencies on other phases.**

### 3.1 Directory Setup
```
src/assets/
├── index.js          # Main export: ASSETS object
├── hats.js           # All hat voxel data (~800 lines)
├── eyes.js           # All eye voxel data (~200 lines)
├── mouths.js         # All mouth voxel data (~150 lines)
├── bodyItems.js      # Body accessories (~200 lines)
└── mounts.js         # Rideable items (~200 lines)
```

- [ ] Create `src/assets/hats.js`
  - Move all hat definitions from assets.js
  - Export as `HATS` object

- [ ] Create `src/assets/eyes.js`
  - Move all eye definitions
  - Export as `EYES` object

- [ ] Create `src/assets/mouths.js`
  - Move all mouth definitions
  - Export as `MOUTHS` object

- [ ] Create `src/assets/bodyItems.js`
  - Move all body item definitions
  - Export as `BODY_ITEMS` object

- [ ] Create `src/assets/mounts.js`
  - Move all mount definitions
  - Export as `MOUNTS` object

- [ ] Create `src/assets/index.js`
  ```js
  import { HATS } from './hats';
  import { EYES } from './eyes';
  import { MOUTHS } from './mouths';
  import { BODY_ITEMS } from './bodyItems';
  import { MOUNTS } from './mounts';
  
  export const ASSETS = {
    hats: HATS,
    eyes: EYES,
    mouths: MOUTHS,
    bodyItems: BODY_ITEMS,
    mounts: MOUNTS,
  };
  
  export { HATS, EYES, MOUTHS, BODY_ITEMS, MOUNTS };
  ```

- [ ] Update imports in `VoxelPenguinDesigner.jsx`
- [ ] Update imports in `VoxelWorld.jsx`
- [ ] Delete old `src/assets.js`

**Phase 3 Verification:**
- [ ] Designer shows all hats/eyes/mouths correctly
- [ ] Player renders with equipped items correctly

---

## Phase 4: VoxelWorld Decomposition (CRITICAL)
> Break 9,500-line VoxelWorld.jsx into focused system modules.
> **Dependency**: Phase 2 (Props)

### 4.1 Systems Directory Setup
```
src/systems/
├── index.js
├── SceneSetup.js           # Three.js scene initialization
├── PlayerController.js     # Movement, jump, collision
├── CameraController.js     # Orbit controls, follow player
├── AIManager.js            # NPC penguins behavior
├── MultiplayerSync.js      # Other player mesh management
├── ChatBubbleSystem.js     # Text bubbles above entities
├── DayNightCycle.js        # Lighting based on time
├── EmoteSystem.js          # Emote wheel and animations
└── MatchBannerSystem.js    # Spectator banners
```

### 4.2 Scene Setup System
- [ ] Create `src/systems/SceneSetup.js` (~200 lines)
  ```js
  export function createScene(container, options = {}) {
    // Returns: { scene, camera, renderer, controls, clock, raycaster }
    // Handles: WebGL renderer, scene fog, initial lights, resize handler
  }
  
  export function disposeScene({ scene, renderer, controls }) {
    // Cleanup function
  }
  ```

### 4.3 Player Controller System
- [ ] Create `src/systems/PlayerController.js` (~400 lines)
  ```js
  export function createPlayerController(options) {
    // options: { scene, camera, collisionSystem, onPositionChange }
    // Returns controller object with:
    //   - update(delta) - Call each frame
    //   - setPosition(x, y, z)
    //   - getPosition() -> { x, y, z }
    //   - getRotation() -> number
    //   - handleKeyDown(e), handleKeyUp(e)
    //   - setJoystickInput(x, z) - For mobile
    //   - jump()
    //   - isGrounded()
    //   - dispose()
  }
  ```
  - Extract: keysRef logic, posRef, velRef, rotRef, isGroundedRef
  - Extract: movement update loop code
  - Extract: collision response code
  - Extract: jump mechanics

### 4.4 Camera Controller System
- [ ] Create `src/systems/CameraController.js` (~150 lines)
  ```js
  export function createCameraController(camera, renderer, options = {}) {
    // Sets up OrbitControls
    // Returns: { update(), setTarget(position), dispose() }
  }
  ```

### 4.5 AI Manager System
- [ ] Create `src/systems/AIManager.js` (~300 lines)
  ```js
  export function createAIManager(scene, options) {
    // options: { buildPenguinMesh, conversationData, emoteList }
    // Returns: {
    //   spawnAI(count),
    //   update(delta),
    //   getAgents() -> array,
    //   dispose()
    // }
  }
  ```
  - Extract: AI_NAMES, CONVERSATIONS, AI_EMOTES constants
  - Extract: aiAgentsRef logic
  - Extract: AI wandering/conversation behavior

### 4.6 Multiplayer Sync System
- [ ] Create `src/systems/MultiplayerSync.js` (~350 lines)
  ```js
  export function createMultiplayerSync(scene, options) {
    // options: { buildPenguinMesh, buildPuffleMesh, chatBubbleSystem }
    // Returns: {
    //   handlePlayerJoined(playerData),
    //   handlePlayerLeft(playerId),
    //   handlePlayerMoved(playerId, position, rotation),
    //   handlePlayerEmote(playerId, emote),
    //   handlePlayerAppearance(playerId, appearance),
    //   handlePlayerPuffle(playerId, puffleData),
    //   updatePositions(playersDataRef), // Interpolation
    //   getPlayerMesh(playerId),
    //   dispose()
    // }
  }
  ```
  - Extract: otherPlayerMeshesRef logic
  - Extract: player mesh creation/removal
  - Extract: position interpolation

### 4.7 Chat Bubble System
- [ ] Create `src/systems/ChatBubbleSystem.js` (~200 lines)
  ```js
  export function createChatBubbleSystem(scene) {
    // Returns: {
    //   showBubble(entityMesh, text, duration),
    //   showAfkBubble(entityMesh, text),
    //   hideBubble(entityMesh),
    //   update(), // Position bubbles, handle fading
    //   dispose()
    // }
  }
  ```
  - Extract: Canvas text rendering logic
  - Extract: Sprite positioning logic
  - Extract: Fade/timeout logic

### 4.8 Day/Night Cycle System
- [ ] Create `src/systems/DayNightCycle.js` (~250 lines)
  ```js
  export function createDayNightCycle(scene, lights, options = {}) {
    // Returns: {
    //   setTime(0-1),
    //   getTime(),
    //   update(delta, serverTime), // Can sync to server
    //   getNightFactor(), // For room updates
    //   dispose()
    // }
  }
  ```
  - Extract: Sky color calculation
  - Extract: Ambient/directional light adjustment
  - Extract: Star rendering
  - Extract: Fog adjustment

### 4.9 Emote System
- [ ] Create `src/systems/EmoteSystem.js` (~200 lines)
  ```js
  export const EMOTE_WHEEL_ITEMS = [ ... ];
  
  export function createEmoteSystem(options) {
    // options: { onEmoteTriggered, playerMesh }
    // Returns: {
    //   openWheel(),
    //   closeWheel(),
    //   isWheelOpen(),
    //   setSelection(index),
    //   getSelection(),
    //   triggerSelectedEmote(),
    //   stopCurrentEmote(),
    //   update(delta), // Animation updates
    //   getCurrentEmote(),
    // }
  }
  ```
  - Extract: EMOTE_WHEEL_ITEMS
  - Extract: emoteRef logic
  - Extract: Emote animation application

### 4.10 Match Banner System
- [ ] Create `src/systems/MatchBannerSystem.js` (~150 lines)
  ```js
  export function createMatchBannerSystem(scene) {
    // Returns: {
    //   showMatchBanner(matchId, players, gameType, wager),
    //   updateMatchState(matchId, state),
    //   hideMatchBanner(matchId),
    //   update(), // Position banners
    //   dispose()
    // }
  }
  ```
  - Extract: matchBannersRef logic
  - Extract: Banner sprite creation

### 4.11 Systems Index
- [ ] Create `src/systems/index.js`
  ```js
  export * from './SceneSetup';
  export * from './PlayerController';
  export * from './CameraController';
  export * from './AIManager';
  export * from './MultiplayerSync';
  export * from './ChatBubbleSystem';
  export * from './DayNightCycle';
  export * from './EmoteSystem';
  export * from './MatchBannerSystem';
  ```

### 4.12 Refactor VoxelWorld.jsx
- [ ] Import all systems from `src/systems`
- [ ] Replace inline code with system instantiation and calls
- [ ] VoxelWorld.jsx becomes the orchestrator:
  - Initializes all systems
  - Connects systems together
  - Handles React state for UI elements
  - Coordinates room loading
  - **Target: ~1,000-1,500 lines**

**Phase 4 Verification:**
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

## Phase 5: Room Refactoring
> Apply BaseRoom pattern and use extracted props.
> **Dependency**: Phase 1 (BaseRoom), Phase 2 (Props)

### 5.1 Refactor TownCenter.js
- [ ] Extend BaseRoom
- [ ] Replace inline prop creation with prop classes:
  ```js
  // Before (inline):
  const igloo = this._createIgloo(scene, x, z);
  
  // After (using prop class):
  const igloo = new Igloo(this.THREE);
  igloo.spawn(scene, x, y, z, { id: 'igloo1' });
  this.props.push(igloo);
  ```
- [ ] Move portal definitions to a constant at top of file
- [ ] Move building definitions to a constant
- [ ] **Target: ~600 lines** (down from 1,200)

### 5.2 Refactor Nightclub.js
- [ ] Extend BaseRoom
- [ ] Use nightclub prop classes
- [ ] Keep disco mode logic but cleaner
- [ ] **Target: ~400 lines** (down from 1,575)

### 5.3 Update Room Imports
- [ ] Update `src/rooms/index.js` exports
- [ ] Verify VoxelWorld imports work

**Phase 5 Verification:**
- [ ] Town loads with all props
- [ ] Can enter nightclub
- [ ] Nightclub animations work
- [ ] Disco mode activates
- [ ] Can enter/exit igloos

---

## Phase 6: Component Refactoring
> Apply shared UI components to reduce duplication.
> **Dependency**: Phase 1 (Modal, hooks)

### 6.1 Refactor Modals to Use Base Modal
For each modal, pattern is:
```jsx
// Before:
<div className="fixed inset-0 z-50 ...">
  <div className="bg-gradient-to-br ...">
    {/* content */}
  </div>
</div>

// After:
<Modal isOpen={isOpen} onClose={onClose} title="Title">
  {/* content only */}
</Modal>
```

- [ ] Refactor `ProfileMenu.jsx`
- [ ] Refactor `WagerModal.jsx`
- [ ] Refactor `PufflePanel.jsx`
- [ ] Refactor `TokenomicsModal.jsx`
- [ ] Refactor `SettingsMenu.jsx`
- [ ] Refactor `Inbox.jsx`

### 6.2 Apply Shared Hooks
- [ ] Replace inline click-outside logic with `useClickOutside`
- [ ] Replace inline ESC handling with `useEscapeKey`
- [ ] Replace inline mobile detection with `useDeviceDetection`

**Phase 6 Verification:**
- [ ] All modals open/close correctly
- [ ] Click outside closes modals
- [ ] ESC closes modals
- [ ] Mobile layout detection works

---

## Phase 7: Cleanup & Polish

### 7.1 Delete Deprecated Files
- [ ] Delete `src/engine/PropsFactory.js` (if not already)
- [ ] Delete old `src/assets.js` (if not already)

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

| Metric | Before | After Target |
|--------|--------|--------------|
| VoxelWorld.jsx | ~9,500 lines | <1,500 lines |
| PropsFactory.js | ~4,400 lines | DELETED (split into ~20 files) |
| assets.js | ~2,300 lines | DELETED (split into 5 files) |
| TownCenter.js | ~1,200 lines | <600 lines |
| Nightclub.js | ~1,575 lines | <400 lines |
| Largest file | 9,500 lines | <1,500 lines |
| Total files | ~40 | ~70+ (but smaller) |

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
Phase 1: Foundation (hooks, Modal, BaseProp, BaseRoom)
    ↓
Phase 2: Props Extraction ←──────────┐
    ↓                                │
Phase 3: Assets Reorganization       │ (parallel possible)
    ↓                                │
Phase 4: VoxelWorld Decomposition ───┘
    ↓
Phase 5: Room Refactoring
    ↓
Phase 6: Component Refactoring
    ↓
Phase 7: Cleanup
    ↓
Phase 8: Final Verification
```

---

## Rollback Plan

If at any point the game breaks badly:
```bash
git stash        # or git reset --hard HEAD
```
Return to this checklist, identify what broke, try again incrementally.

---

**Status**: READY TO EXECUTE
