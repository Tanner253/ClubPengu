# 🎨 3D Rendering Architecture

## Overview

Waddlebet uses a **voxel-based rendering system** built entirely with **Three.js** (no Unity, no external 3D model files). All characters, buildings, items, and world objects are procedurally generated from voxel data defined in JavaScript.

---

## Core Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **3D Engine** | Three.js | 0.170.0 | WebGL rendering, scene management, lighting |
| **UI Framework** | React | 18.3.1 | Component-based UI and game state management |
| **Build Tool** | Vite | 6.0.1 | Fast development and optimized production builds |

**Note:** No Unity, no `.glb`/`.gltf`/`.fbx`/`.obj` model files. Everything is code-generated.

---

## Voxel-Based Rendering System

### What is a Voxel?

A **voxel** (volumetric pixel) is a 3D cube positioned in space. In Waddlebet, each voxel is defined as:

```javascript
{
    x: 0,      // X coordinate (integer)
    y: 5,      // Y coordinate (integer)
    z: 0,      // Z coordinate (integer)
    c: '#0066CC' // Color (hex string or palette name)
}
```

### Voxel Size

All voxels use a standard size defined in `src/constants.js`:

```javascript
export const VOXEL_SIZE = 0.5; // 0.5 world units per voxel
```

This provides a consistent, Minecraft-like aesthetic while keeping the world manageable.

---

## Asset Definition System

### How Assets Are Stored

**All game assets are defined as JavaScript arrays of voxels**, not external 3D model files.

#### Asset Organization

```
waddlebet/src/assets/
├── index.js          # Unified asset exports
├── hats.js           # Headwear definitions (topHat, crown, propeller, etc.)
├── eyes.js           # Eye styles (normal, shades, angry, hearts, etc.)
├── mouths.js         # Mouth expressions (beak, smile, beard, etc.)
├── bodyItems.js      # Clothing items (scarf, hoodie, suit, etc.)
├── mounts.js         # Mount/vehicle definitions
└── helpers.js        # Utility functions (makeCap, makeBeanie, etc.)
```

#### Example: Hat Definition

Here's how a hat is defined in `src/assets/hats.js`:

```javascript
topHat: (() => {
    let v = [];
    // Brim - circular disk
    for(let x=-5; x<=5; x++) {
        for(let z=-5; z<=5; z++) {
            if(x*x+z*z < 25) { // Circle equation
                v.push({x, y:10, z, c: '#222'}); // Black brim
            }
        }
    }
    // Crown - vertical cylinder
    for(let y=10; y<16; y++) {
        for(let x=-3; x<=3; x++) {
            for(let z=-3; z<=3; z++) {
                if(x*x+z*z < 9) { // Smaller circle for crown
                    v.push({x, y, z, c: '#222'}); // Black crown
                }
            }
        }
    }
    // Band - decorative stripe
    for(let x=-3; x<=3; x++) {
        for(let z=-3; z<=3; z++) {
            if(x*x+z*z < 9.5 && x*x+z*z > 8) {
                v.push({x, y:11, z, c: '#D00'}); // Red band
            }
        }
    }
    return v;
})()
```

**Key Points:**
- Assets are immediately-invoked function expressions (IIFE) that return voxel arrays
- Colors can be hex strings (`'#222'`) or palette names (`'gold'`, `'red'`)
- Mathematical formulas (circles, spheres) are used to create smooth shapes

### Color Palette System

Colors are defined in `src/constants.js` via the `PALETTE` object:

```javascript
export const PALETTE = {
    // Penguin skins (100+ colors for gacha system)
    blue: '#0066CC',
    red: '#CC2222',
    gold: '#DAA520',
    // ... 100+ more colors organized by rarity
    // Materials
    wood: '#6B4423',
    snow: '#E8F0F8',
    // ... etc
};
```

**Benefits:**
- Consistent color scheme across the game
- Easy theme changes (update palette once, affects everything)
- Palette names map to hex values automatically during rendering

---

## Rendering Pipeline

### From Voxel Data to 3D Mesh

The rendering pipeline converts voxel arrays into Three.js meshes:

```
Voxel Array → Group by Color → Create InstancedMeshes → Add to Scene
```

#### Step-by-Step Process

1. **Voxel Input**: Receive array of voxels (e.g., hat definition)

2. **Color Grouping**: Group voxels by color for efficient batching
   ```javascript
   const colorGroups = new Map();
   voxels.forEach(v => {
       const color = palette[v.c] || v.c; // Resolve palette name to hex
       if (!colorGroups.has(color)) {
           colorGroups.set(color, []);
       }
       colorGroups.get(color).push(v);
   });
   ```

3. **Geometry Creation**: Each voxel becomes a cube using shared geometry
   ```javascript
   const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
   ```

4. **InstancedMesh Optimization**: For each color group, create an `InstancedMesh` to batch render many cubes of the same color
   ```javascript
   const instancedMesh = new THREE.InstancedMesh(
       sharedVoxelGeo,        // Shared geometry (one cube)
       material,               // Material for this color
       voxelList.length        // Number of instances
   );
   
   // Position each instance
   voxelList.forEach((v, i) => {
       dummy.position.set(
           v.x * VOXEL_SIZE,
           v.y * VOXEL_SIZE,
           v.z * VOXEL_SIZE
       );
       dummy.updateMatrix();
       instancedMesh.setMatrixAt(i, dummy.matrix);
   });
   ```

5. **Add to Scene**: The instanced mesh is added to the Three.js scene

### Key Files for Rendering

| File | Purpose |
|------|---------|
| `src/engine/PlayerBuilder.js` | Builds player character meshes from appearance data |
| `src/components/PlayerPreview3D.jsx` | Preview component for character customization |
| `src/components/CosmeticPreview3D.jsx` | Preview component for individual cosmetics |
| `src/VoxelWorld.jsx` | Main game world rendering and scene management |

---

## Character Building System

### Character Types

Waddlebet supports multiple character types, each with unique voxel generation:

| Character Type | Base Generation | Home Type |
|----------------|----------------|-----------|
| Penguin | `src/characters/PenguinCharacter.js` | Igloo |
| Dog | `src/characters/DogCharacter.js` | Doghouse |
| Frog (Pepe) | `src/characters/FrogCharacter.js` | Pond |
| Marcus | `src/characters/MarcusCharacter.js` | Apartment |
| Whales | `src/characters/WhaleCharacter.js` | Mansion |

### Building a Character

Characters are assembled from multiple voxel layers:

1. **Base Body**: Character-specific body voxels (penguin body, dog body, etc.)
2. **Skin Color**: Applied from palette based on user's skin selection
3. **Cosmetics**:
   - Hat/Headwear (from `ASSETS.HATS`)
   - Eyes (from `ASSETS.EYES`)
   - Mouth (from `ASSETS.MOUTHS`)
   - Body Items/Clothing (from `ASSETS.BODY`)
4. **Mount**: Optional mount/vehicle attached to character

#### Example: Building a Penguin

```javascript
// 1. Generate base penguin body voxels
const bodyVoxels = generatePenguinBody(skinColor);

// 2. Add cosmetics
if (appearance.hat) {
    const hatVoxels = ASSETS.HATS[appearance.hat];
    // Merge hat voxels at correct position
}

// 3. Convert to mesh
const mesh = buildPlayerMesh(bodyVoxels, cosmetics, appearance);
```

**File**: `src/engine/PlayerBuilder.js` contains all character building logic.

---

## World Generation

### Buildings and Props

Just like characters, buildings and world props are built from voxels:

```javascript
// Example: Creating a building from voxels
const buildingVoxels = [
    // Foundation
    ...generateFoundation(width, depth),
    // Walls
    ...generateWalls(height, width, depth),
    // Roof
    ...generateRoof(roofType, width, depth),
];
const buildingMesh = buildVoxelMesh(buildingVoxels);
```

### Room System

Rooms are procedurally generated environments:

- **TownCenter** (`src/rooms/TownCenter.js`): Main hub with shops, NPCs
- **Nightclub** (`src/rooms/Nightclub.js`): Party venue with dance floor
- **CasinoRoom** (`src/rooms/CasinoRoom.js`): Casino with slot machines, blackjack tables
- **BaseRoom** (`src/rooms/BaseRoom.js`): Base class for player-owned spaces (igloos, doghouses, ponds)

Each room generates its voxel-based environment at runtime.

---

## Performance Optimizations

### 1. InstancedMesh Batching

The biggest performance win: using `THREE.InstancedMesh` to batch render thousands of voxels of the same color.

**Without Instancing**: 1000 voxels = 1000 draw calls  
**With Instancing**: 1000 voxels of same color = 1 draw call

### 2. Shared Geometry

All voxels use the same `BoxGeometry` instance:

```javascript
const sharedVoxelGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
```

This reduces memory usage dramatically.

### 3. Material Reuse

Materials are cached and reused:

```javascript
const getMaterial = (colorKey) => {
    if (!materialCache.has(colorKey)) {
        materialCache.set(colorKey, new THREE.MeshStandardMaterial({ color: colorKey }));
    }
    return materialCache.get(colorKey);
};
```

### 4. Device-Specific Optimizations

The renderer adjusts quality based on device:

```javascript
// Apple devices (Safari/Metal) get optimizations
if (isAppleDevice) {
    rendererOptions.antialias = false; // Big perf gain
    rendererOptions.precision = 'mediump'; // Faster shader math
}
```

**File**: `src/VoxelWorld.jsx` lines 555-596 contain device detection and renderer optimization.

---

## Animation System

### Voxel-Based Animation

Characters animate by manipulating voxel positions over time:

1. **Body Parts**: Head, torso, limbs are separate groups of voxels
2. **Rotation**: Apply rotations to body part groups (e.g., `headGroup.rotation.y = Math.sin(time)`)
3. **Translation**: Move body parts (e.g., leg swing, arm wave)

**File**: `src/engine/PlayerBuilder.js` contains animation helpers for character parts.

### Cosmetic Animations

Some cosmetics have special effects:

- **Glowing**: Voxels with `glow: true` use emissive materials
- **Particles**: Particle systems attached to cosmetic groups (e.g., wizard hat trail)
- **Shaders**: Custom shaders for special effects (rainbow, holographic)

---

## Creating New Assets

### How to Add a New Hat

1. **Define Voxels** in `src/assets/hats.js`:

```javascript
export const HATS = {
    // ... existing hats ...
    myNewHat: (() => {
        const v = [];
        // Add voxels for your hat
        for(let y=10; y<15; y++) {
            v.push({x:0, y, z:0, c: 'red'});
        }
        return v;
    })(),
};
```

2. **Export**: Hat is automatically exported via `src/assets/index.js`

3. **Use**: Hat appears in character creator and can be equipped

### How to Add a New Character Type

1. **Create Character Generator** in `src/characters/MyCharacter.js`:

```javascript
export function generateMyCharacterBody(skinColor) {
    const voxels = [];
    // Generate body voxels
    // ...
    return voxels;
}
```

2. **Register** in `src/engine/PlayerBuilder.js`:

```javascript
if (data.characterType === 'myCharacter') {
    group = buildMyCharacterMesh(data);
}
```

3. **Add to Database**: Update User model to support new character type

---

## Why Voxel-Based?

### Advantages

1. **No External Dependencies**: No need for Blender, 3D modeling tools, or model file pipelines
2. **Easy Customization**: Change colors, sizes, shapes programmatically
3. **Small File Size**: Voxel data is just JavaScript arrays (tiny compared to 3D model files)
4. **Procedural Generation**: Easy to generate variants, random items, seasonal content
5. **Consistent Aesthetic**: All assets share the same blocky, pixel-art-like style
6. **Web-Friendly**: Perfect for browser-based games (no heavy model loading)

### Trade-offs

- **Stylistic Limitation**: Blocky, voxel aesthetic only (can't do smooth curves easily)
- **Manual Creation**: Creating complex shapes requires more code than using a 3D modeling tool
- **Performance**: Many small cubes can be expensive (mitigated with instancing)

---

## Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    React Component                       │
│              (VoxelWorld.jsx, etc.)                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Three.js Scene Manager                      │
│         (Scene, Camera, Renderer, Lights)                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│            PlayerBuilder / VoxelBuilder                  │
│     Converts voxel arrays → Three.js InstancedMeshes     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              Asset Definitions (JS Files)                │
│    hats.js, eyes.js, characters/PenguinCharacter.js     │
│          (Voxel arrays: {x, y, z, c: color})            │
└─────────────────────────────────────────────────────────┘
```

---

## File Reference

### Core Rendering Files

| File | Lines | Purpose |
|------|-------|---------|
| `src/VoxelWorld.jsx` | ~7500 | Main game world, scene setup, rendering loop |
| `src/engine/PlayerBuilder.js` | ~1100 | Character mesh building from appearance data |
| `src/components/PlayerPreview3D.jsx` | ~500 | Character preview in UI |
| `src/constants.js` | ~85 | VOXEL_SIZE, PALETTE definitions |

### Asset Definition Files

| File | Purpose |
|------|---------|
| `src/assets/hats.js` | All headwear definitions |
| `src/assets/eyes.js` | All eye style definitions |
| `src/assets/mouths.js` | All mouth/beak definitions |
| `src/assets/bodyItems.js` | All clothing/body item definitions |
| `src/assets/mounts.js` | All mount/vehicle definitions |

### Character Generation Files

| File | Character Type |
|------|----------------|
| `src/characters/PenguinCharacter.js` | Penguin (default) |
| `src/characters/DogCharacter.js` | Dog |
| `src/characters/FrogCharacter.js` | Frog (Pepe) |
| `src/characters/MarcusCharacter.js` | Marcus |
| `src/characters/WhaleCharacter.js` | All whale variants |

---

## Future Considerations

### Potential Enhancements

1. **Voxel Editing Tools**: Visual editor for creating assets (instead of code)
2. **Mesh Optimization**: Merge adjacent voxels of same color into larger boxes
3. **Level of Detail (LOD)**: Simpler voxel representations at distance
4. **Voxel Streaming**: Load/unload voxel chunks for large worlds
5. **Procedural Generation**: Algorithmic generation of buildings, items, characters

---

## Summary

**Waddlebet's 3D rendering is 100% code-based using Three.js and voxels:**
- ✅ No Unity, no external 3D model files
- ✅ All assets defined as JavaScript voxel arrays
- ✅ Procedural generation from voxel data
- ✅ Optimized with InstancedMesh batching
- ✅ Easy to customize and extend programmatically

This architecture gives Waddlebet complete control over the rendering pipeline, enables dynamic customization, and keeps the game lightweight and web-friendly.

---

*Last Updated: December 2024*
