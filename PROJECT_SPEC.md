# Club Penguin Island 3D - Project Specification

> Transforming the classic 2D Club Penguin Island map into a fully explorable 3D voxel world.

## 📋 Table of Contents
1. [Overview](#overview)
2. [Current State](#current-state)
3. [Phase 1: Town Center Polish](#phase-1-town-center-polish)
4. [Phase 2: Plaza & Center Fields](#phase-2-plaza--center-fields)
5. [Phase 3: Ski Village](#phase-3-ski-village)
6. [Phase 4: Beach & Dock](#phase-4-beach--dock)
7. [Phase 5: Forest & Cove](#phase-5-forest--cove)
8. [Phase 6: Underground & Mines](#phase-6-underground--mines)
9. [Technical Architecture](#technical-architecture)
10. [Asset Library](#asset-library)

---

## Overview

### Vision
Recreate Club Penguin Island as an immersive 3D voxel experience where players can explore interconnected areas, interact with environment objects, and discover hidden secrets.

### Reference Map Regions
Based on the original Club Penguin Island map:
- **Town Center** - Central hub with shops (Coffee Shop, Gift Shop, Night Club, Arcade)
- **Ski Village** - Northern area with Lodge, Ski Hill, Ski Lift
- **Plaza/Center Fields** - Eastern area with Pizza Parlor, Pet Shop, Stage/Theater
- **Snow Forts & Stadium** - Central-east with Ice Rink
- **Beach & Dock** - Southern coastline
- **Forest Trails** - Connecting paths through trees
- **Cove Beach Area** - Eastern beach with lighthouse
- **Snowy Mountains** - Northern backdrop (decorative)
- **Underground** - Mine carts, caves, hidden pool

---

## Current State

### What Exists ✅
- Ice/snow ground plane with water edges
- 3 basic buildings: Dojo, Gift Shop, Pizza Parlor
- Portal/door system for room transitions
- Dojo interior room (functional)
- AI penguins with wandering behavior
- Player movement with collision (water/buildings)
- Puffle companion system
- Chat and emote systems
- GameManager for coins/inventory

### What's Missing ❌
- Environmental decoration (trees, rocks, igloos)
- Snow accumulation/variation
- Lamp posts and lighting fixtures
- Benches, signs, and interactive props
- Path/road textures differentiating areas
- Proper area boundaries
- Most building interiors
- Connection paths between areas

---

## Phase 1: Town Center Polish

**Goal:** Transform the flat ice plane into a living, breathing town center with authentic Club Penguin atmosphere.

### 1.1 Environmental Props

#### Snow Trees (Pine/Evergreen)
```
Model: Procedural voxel pine tree
- Trunk: 3x3 base, 2x2 top, brown bark color (#4A3020)
- Branches: Triangular layers, dark green (#1A4A2A)
- Snow caps: White/pale blue on top of each branch layer
- Sizes: Small (8 units), Medium (12 units), Large (16 units)
- Collision: Cylinder around trunk (radius 1.5)
```

**Placement:**
- 4-6 trees around plaza perimeter
- 2-3 trees near each building
- Cluster groups of 2-3 for natural look
- Keep paths clear for player movement

#### Igloos
```
Model: Hemispherical dome
- Base: 8x8 units footprint
- Height: 5 units
- Color: Snow white with ice blue highlights
- Door: Small arched opening (2x3)
- Tunnel entrance: Optional extended entry
- Collision: Full dome collision shape
```

**Placement:**
- 2 igloos in residential area (south-west)
- 1 igloo near forest trail entrance

#### Lamp Posts
```
Model: Classic street lamp
- Post: Thin cylinder, dark metal (#2A3A4A)
- Height: 6 units
- Light bulb: Sphere at top, warm yellow glow
- Point light: Warm color (#E8C840), radius 8
- Collision: Thin cylinder (radius 0.3)
```

**Placement:**
- Along pathways every 15-20 units
- Near building entrances
- At path intersections

#### Benches
```
Model: Snowy park bench
- Seat: Wooden planks (#6B4423)
- Snow layer: On seat and back
- Legs: Metal or wood
- Size: 4x2x2 units
- Collision: Box collider
- Interactive: "Sit" emote trigger zone
```

**Placement:**
- 2 benches near town center
- 1 bench near each major building

#### Snow Piles / Drifts
```
Model: Organic snow mounds
- Irregular shapes, various sizes
- Colors: White to pale blue gradient
- Some with sparkle effect
- Collision: Rounded collision shape
```

**Placement:**
- Along building edges
- Path borders
- Near trees (wind drift effect)

#### Signposts
```
Model: Wooden directional signs
- Post: Wooden pole
- Signs: Arrows pointing to areas
- Text: "SKI VILLAGE →", "← BEACH", etc.
- Collision: Thin cylinder
```

**Placement:**
- At each path intersection
- Near town center (multi-directional)

### 1.2 Ground/Terrain Improvements

#### Path System
```
- Main paths: Lighter snow/packed ice texture
- Path width: 6-8 units
- Edge treatment: Snow banks/curbs
- Visual distinction from surrounding snow
```

#### Ground Variation
```
- Base: Ice blue (#7EB8D8)
- Paths: Packed snow (#E8F0F8)
- Grass patches: Visible through thin snow
- Ice patches: Reflective areas near water
```

#### Elevation Changes
```
- Subtle hills: 0.5-1 unit height variation
- Building platforms: Slight elevation
- Path depressions: Worn areas lower
```

### 1.3 Building Enhancements

#### Coffee Shop (New Building)
```
Position: (-22, -8) - Currently "Gift Shop" location
Style: Cozy cabin aesthetic
- Wooden exterior
- Smoking chimney
- Warm window glow
- Outdoor seating area with snow cover
- Size: 12x8x12 units
```

#### Gift Shop Enhancement
```
Position: Move to (-12, -18)
- Add awning
- Display windows with items
- Rotating sign
- Door mat area
```

#### Night Club (New Building)
```
Position: (0, -8) - Center of town
Style: Modern igloo/dome
- Pulsing colored lights
- Music note decorations
- Neon-style sign
- Size: 14x10x14 units
```

#### Arcade Lounge (New Building)
```
Position: (12, -8)
Style: Retro gaming aesthetic
- Pixelated decorations
- Glowing windows
- Joystick sign
- Size: 10x7x10 units
```

### 1.4 Collision System

#### Collision Types
```javascript
COLLISION_TYPES = {
    NONE: 0,        // Walkable
    SOLID: 1,       // Full block collision
    WATER: 2,       // Slows/damages player
    INTERACTIVE: 3, // Triggers action on contact
    DECORATION: 4   // Partial collision (trees, posts)
}
```

#### Collision Map Structure
```javascript
// Each cell stores collision data
collisionGrid[x][z] = {
    type: COLLISION_TYPES.SOLID,
    height: 1.5,  // For stepping up/down
    trigger: null // Optional trigger function
}
```

### 1.5 Visual Atmosphere

#### Lighting
```
- Time of day: Perpetual arctic day (bright, cool)
- Sun position: Low angle, long shadows
- Ambient: Cool blue (#C0E0F0)
- Building lights: Warm yellow contrast
```

#### Particles (Optional)
```
- Light snow fall
- Chimney smoke
- Breath puffs from penguins
- Sparkles on snow
```

#### Fog/Atmosphere
```
- Light fog at edges
- Distance fade to sky color
- Creates sense of vastness
```

### 1.6 Town Center Task Checklist

- [ ] **Trees**
  - [ ] Create procedural pine tree generator
  - [ ] Add snow cap layers
  - [ ] Implement 3 size variants
  - [ ] Place 12-15 trees around town
  - [ ] Add collision cylinders

- [ ] **Igloos**
  - [ ] Create igloo mesh generator
  - [ ] Add door opening
  - [ ] Place 2-3 igloos
  - [ ] Add collision shapes

- [ ] **Lamp Posts**
  - [ ] Create lamp post model
  - [ ] Add point light component
  - [ ] Place along paths (8-10 posts)
  - [ ] Wire to day/night system (future)

- [ ] **Benches**
  - [ ] Create bench model
  - [ ] Add snow cover variant
  - [ ] Place strategically
  - [ ] Add sit interaction zone

- [ ] **Ground**
  - [ ] Create path texture variation
  - [ ] Add subtle elevation
  - [ ] Snow drift placement
  - [ ] Ice patch reflections

- [ ] **Buildings**
  - [ ] Coffee Shop exterior
  - [ ] Night Club dome
  - [ ] Arcade building
  - [ ] Enhanced door/window details
  - [ ] Chimney smoke effects

- [ ] **Collision**
  - [ ] Implement new collision grid
  - [ ] Add tree collision
  - [ ] Add prop collision
  - [ ] Test all walkable areas

- [ ] **Polish**
  - [ ] Adjust lighting
  - [ ] Add ambient sounds (future)
  - [ ] Performance optimization
  - [ ] Test with AI penguins

---

## Phase 2: Plaza & Center Fields

**Goal:** Expand eastward to create the plaza area with Pet Shop, Pizza Parlor, and Stage.

### Key Features
- Pet Shop building (Puffle adoption)
- Pizza Parlor (already exists - enhance)
- Stage/Theater for performances
- Snow Forts play area
- Stadium/Ice Rink

### Layout
```
[Snow Forts] [Stadium/Rink]
              [Pizza]
   [Pet Shop] [Stage]
```

### New Props
- Performance stage with curtains
- Ice rink with boards
- Snow fort walls (buildable?)
- Theater spotlights
- Pet shop window displays

---

## Phase 3: Ski Village

**Goal:** Create the northern mountain area with winter sports theme.

### Key Features
- Ski Lodge building (warm interior)
- Ski Hill with lift
- Ski Lift gondolas (animated)
- O'Berry bush (for puffles)
- Mountain backdrop

### Terrain
- Elevated ground (10-15 units higher)
- Ski slope ramp
- Snow-covered paths
- Rocky outcrops

### New Props
- Ski rack with skis
- Hot cocoa stand
- Snowboard displays
- Mountain pine trees (denser)
- Wooden fences

---

## Phase 4: Beach & Dock

**Goal:** Create the southern coastline with water activities.

### Key Features
- Lighthouse (tall, rotating light)
- Dock with boats
- Beach area (sand texture)
- Beacon tower
- Migrator ship (docked)

### Terrain
- Transition from snow to sand
- Water edge with waves
- Dock platform over water
- Rocky coastline

### New Props
- Beach chairs
- Surfboards
- Fishing poles
- Boat/ship models
- Beach umbrellas
- Lighthouse interior

---

## Phase 5: Forest & Cove

**Goal:** Dense forest trails connecting areas, plus eastern cove.

### Key Features
- Winding forest paths
- Dense tree coverage
- Hidden clearings
- Cove beach area
- Campfire spot

### Terrain
- Narrow trails
- Tree canopy (shadow)
- Stream/creek
- Grassy clearings

### New Props
- Fallen logs
- Mushrooms
- Forest animals (decoration)
- Camping tent
- Bonfire (animated flames)

---

## Phase 6: Underground & Mines

**Goal:** Hidden underground areas accessible from surface.

### Key Features
- Mine entrance (near ski village)
- Mine cart tracks (rideable?)
- Crystal cavern (glowing)
- Underground pool/lake
- Hidden cave systems

### Terrain
- Cave walls (rock texture)
- Stalactites/stalagmites
- Underground water
- Narrow tunnels

### New Props
- Mine carts
- Track switches
- Crystals (glowing)
- Lanterns
- Support beams
- Hidden treasure

---

## Technical Architecture

### File Structure
```
src/
├── engine/
│   ├── GameManager.js      # Global state
│   ├── CollisionSystem.js  # New - collision detection
│   ├── PropsGenerator.js   # New - procedural props
│   └── TerrainGenerator.js # New - ground/terrain
├── rooms/
│   ├── TownCenter.js       # Town room definition
│   ├── SkiVillage.js       # Ski area
│   ├── Plaza.js            # Plaza area
│   ├── Beach.js            # Beach/dock
│   └── Forest.js           # Forest trails
├── models/
│   ├── trees.js            # Tree generators
│   ├── buildings.js        # Building generators
│   ├── props.js            # Furniture/decorations
│   └── terrain.js          # Ground features
└── components/
    └── ... (existing)
```

### Collision System Design
```javascript
class CollisionSystem {
    constructor(width, depth, cellSize = 1) {
        this.grid = new Map();
        this.width = width;
        this.depth = depth;
        this.cellSize = cellSize;
    }
    
    addCollider(x, z, radius, type) { }
    checkCollision(x, z, playerRadius) { }
    raycast(start, direction, maxDistance) { }
}
```

### Room Definition Schema
```javascript
const RoomDefinition = {
    id: 'town',
    name: 'Town Center',
    bounds: { minX, maxX, minZ, maxZ },
    spawnPoint: { x, y, z },
    groundType: 'snow',
    buildings: [...],
    props: [...],
    portals: [...],
    lights: [...],
    collisionMap: CollisionSystem
}
```

---

## Asset Library

### Color Palette Additions
```javascript
// Nature
snowLight: '#F0F8FF',
snowMedium: '#E8F0F8',
snowDark: '#C8D8E8',
snowShadow: '#A8C0D8',
iceBlue: '#B8D8F0',
iceReflect: '#D8F0FF',

// Wood
barkDark: '#3A2010',
barkLight: '#5A4030',
plankLight: '#8B7355',
plankDark: '#6B5335',

// Rock
rockGrey: '#5A6A6A',
rockDark: '#3A4A4A',
rockLight: '#7A8A8A',

// Foliage
pineGreen: '#1A4A2A',
pineDark: '#0A3A1A',
pineLight: '#2A5A3A'
```

### Model Specifications

| Model | Voxel Count (approx) | Collision Shape |
|-------|---------------------|-----------------|
| Small Tree | 150 | Cylinder r=1 |
| Medium Tree | 300 | Cylinder r=1.5 |
| Large Tree | 500 | Cylinder r=2 |
| Igloo | 400 | Hemisphere r=4 |
| Lamp Post | 30 | Cylinder r=0.3 |
| Bench | 50 | Box 4x2x2 |
| Snow Pile | 80 | None (decoration) |
| Signpost | 25 | Cylinder r=0.3 |

---

## Development Priority

### Immediate (Phase 1)
1. 🌲 Snow trees with collision
2. 🏠 Igloo models
3. 💡 Lamp posts with lighting
4. 🪑 Benches and props
5. 🛤️ Path textures
6. 💥 Collision system update

### Short Term (Phases 2-3)
7. Plaza area expansion
8. Ski Village terrain
9. New building exteriors
10. Interior rooms

### Long Term (Phases 4-6)
11. Beach and dock
12. Forest trails
13. Underground caves
14. Special effects

---

## Notes

- Keep draw calls low by merging static geometry
- Use instanced meshes for repeated props (trees, posts)
- Collision checks should use spatial hashing for performance
- Each area should be loadable/unloadable for memory management
- Save player position when changing rooms

---

*Last Updated: December 9, 2025*
*Version: 1.0*

