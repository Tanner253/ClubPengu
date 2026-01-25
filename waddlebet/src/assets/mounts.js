/**
 * Mount Assets - All rideable/mountable items
 * Contains voxel data for penguin mounts and vehicles
 */

export const MOUNTS = {
    none: { voxels: [], animated: false },
    
    // LEGENDARY: Minecraft Boat - simple solid rectangular boat
    minecraftBoat: {
        voxels: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c) => {
                const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                if (!voxelMap.has(key)) {
                    voxelMap.set(key, {x: Math.round(x), y: Math.round(y), z: Math.round(z), c});
                }
            };
            
            const woodColor = '#8B4513';
            const darkWood = '#6B3A1A';
            const plankColor = '#A0522D';
            const lightWood = '#DEB887';
            
            const halfWidth = 8;
            const halfLength = 10;
            const depth = 4;
            
            // SOLID BOTTOM
            for(let x=-halfWidth; x<=halfWidth; x++) {
                for(let z=-halfLength; z<=halfLength; z++) {
                    addVoxel(x, -depth, z, woodColor);
                }
            }
            
            // SOLID WALLS
            for(let y=-depth+1; y<=0; y++) {
                for(let z=-halfLength; z<=halfLength; z++) {
                    addVoxel(-halfWidth, y, z, darkWood);
                    addVoxel(-halfWidth-1, y, z, darkWood);
                }
                for(let z=-halfLength; z<=halfLength; z++) {
                    addVoxel(halfWidth, y, z, darkWood);
                    addVoxel(halfWidth+1, y, z, darkWood);
                }
                for(let x=-halfWidth; x<=halfWidth; x++) {
                    addVoxel(x, y, halfLength, darkWood);
                    addVoxel(x, y, halfLength+1, darkWood);
                }
                for(let x=-halfWidth+2; x<=halfWidth-2; x++) {
                    addVoxel(x, y, -halfLength, darkWood);
                }
            }
            
            // Pointed bow
            for(let y=-depth+1; y<=0; y++) {
                addVoxel(0, y, -halfLength-1, darkWood);
                addVoxel(0, y, -halfLength-2, darkWood);
                addVoxel(-1, y, -halfLength-1, darkWood);
                addVoxel(1, y, -halfLength-1, darkWood);
            }
            
            // Top rim
            for(let x=-halfWidth-1; x<=halfWidth+1; x++) {
                addVoxel(x, 1, -halfLength, plankColor);
                addVoxel(x, 1, halfLength+1, plankColor);
            }
            for(let z=-halfLength; z<=halfLength+1; z++) {
                addVoxel(-halfWidth-1, 1, z, plankColor);
                addVoxel(halfWidth+1, 1, z, plankColor);
            }
            
            // Cross-bench seat
            for(let x=-halfWidth+2; x<=halfWidth-2; x++) {
                for(let z=-2; z<=2; z++) {
                    addVoxel(x, -1, z, lightWood);
                }
            }
            
            // Oarlock mounts
            addVoxel(-halfWidth-2, 0, 0, '#555555');
            addVoxel(-halfWidth-2, -1, 0, '#555555');
            addVoxel(halfWidth+2, 0, 0, '#555555');
            addVoxel(halfWidth+2, -1, 0, '#555555');
            
            return Array.from(voxelMap.values());
        })(),
        leftOar: (() => {
            const v = [];
            for(let i=0; i<10; i++) {
                const xPos = -11 - i;
                const yPos = 0 - i * 0.3;
                v.push({x: xPos, y: Math.round(yPos), z:0, c:'#DEB887'});
            }
            for(let j=-2; j<=2; j++) {
                v.push({x:-20, y:-3, z:j, c:'#8B4513'});
                v.push({x:-21, y:-3, z:j, c:'#8B4513'});
            }
            return v;
        })(),
        rightOar: (() => {
            const v = [];
            for(let i=0; i<10; i++) {
                const xPos = 11 + i;
                const yPos = 0 - i * 0.3;
                v.push({x: xPos, y: Math.round(yPos), z:0, c:'#DEB887'});
            }
            for(let j=-2; j<=2; j++) {
                v.push({x:20, y:-3, z:j, c:'#8B4513'});
                v.push({x:21, y:-3, z:j, c:'#8B4513'});
            }
            return v;
        })(),
        animated: true,
        hidesFeet: true,
        seatOffset: { y: -2 },
        animationType: 'rowing'
    },
    
    // EXCLUSIVE: Pengu Mount - A $PENGU penguin on its belly
    penguMount: {
        voxels: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c) => {
                const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                if (!voxelMap.has(key)) {
                    voxelMap.set(key, {x: Math.round(x), y: Math.round(y), z: Math.round(z), c});
                }
            };
            
            // $PENGU colors - classic penguin
            const bodyBlack = '#1a1a1a';
            const bellyWhite = '#FFFFFF';
            const beakOrange = '#FF8C00';
            const eyeWhite = '#FFFFFF';
            const eyeBlack = '#000000';
            const feetOrange = '#FF6600';
            
            // Body - penguin lying on its belly, elongated for riding
            // Head faces FORWARD (+Z direction - the way player moves)
            
            // Main body (lying flat, belly on ground)
            for(let x = -4; x <= 4; x++) {
                for(let z = -8; z <= 6; z++) {
                    const dist = Math.sqrt((x*x) / 16 + ((z+1)*(z+1)) / 64);
                    if(dist < 1) {
                        // Bottom (belly) - white
                        addVoxel(x, -3, z, bellyWhite);
                        // Top (back) - black
                        addVoxel(x, 0, z, bodyBlack);
                        addVoxel(x, -1, z, bodyBlack);
                        // Sides blend
                        if(Math.abs(x) > 2) {
                            addVoxel(x, -2, z, bodyBlack);
                        } else {
                            addVoxel(x, -2, z, bellyWhite);
                        }
                    }
                }
            }
            
            // Head (at front / +Z, slightly raised)
            for(let x = -3; x <= 3; x++) {
                for(let z = 6; z <= 10; z++) {
                    for(let y = -2; y <= 2; y++) {
                        const dist = Math.sqrt((x*x)/9 + ((z-8)*(z-8))/16 + (y*y)/9);
                        if(dist < 1.2) {
                            // Face (front) is white belly area
                            if(z > 8 && Math.abs(x) < 2 && y < 1) {
                                addVoxel(x, y, z, bellyWhite);
                            } else {
                                addVoxel(x, y, z, bodyBlack);
                            }
                        }
                    }
                }
            }
            
            // Eyes (on head, facing forward +Z) - white, positioned in front of head
            addVoxel(-2, 1, 11, eyeWhite); // Left eye
            addVoxel(2, 1, 11, eyeWhite);  // Right eye
            // Eye pupils (black dots)
            addVoxel(-2, 1, 12, eyeBlack); // Left pupil
            addVoxel(2, 1, 12, eyeBlack);  // Right pupil
            
            // Beak (pointing forward/outward from face at +Z)
            // Beak base on face
            addVoxel(0, 0, 10, beakOrange);
            addVoxel(-1, 0, 10, beakOrange);
            addVoxel(1, 0, 10, beakOrange);
            addVoxel(0, -1, 10, beakOrange);
            // Beak tip pointing forward
            addVoxel(0, 0, 11, beakOrange);
            addVoxel(0, -0.5, 11, beakOrange);
            addVoxel(0, 0, 12, beakOrange);
            
            // Tail (small bump at back -Z) - stays with body
            addVoxel(0, -1, -9, bodyBlack);
            addVoxel(0, -1, -10, bodyBlack);
            
            return Array.from(voxelMap.values());
        })(),
        // Left flipper - separate for animation
        leftFlipper: (() => {
            const v = [];
            const bodyBlack = '#1a1a1a';
            for(let z = -4; z <= 2; z++) {
                v.push({x: -5, y: -1, z, c: bodyBlack});
                v.push({x: -6, y: -2, z, c: bodyBlack});
            }
            v.push({x: -7, y: -2, z: 0, c: bodyBlack});
            v.push({x: -7, y: -2, z: -1, c: bodyBlack});
            return v;
        })(),
        // Right flipper - separate for animation
        rightFlipper: (() => {
            const v = [];
            const bodyBlack = '#1a1a1a';
            for(let z = -4; z <= 2; z++) {
                v.push({x: 5, y: -1, z, c: bodyBlack});
                v.push({x: 6, y: -2, z, c: bodyBlack});
            }
            v.push({x: 7, y: -2, z: 0, c: bodyBlack});
            v.push({x: 7, y: -2, z: -1, c: bodyBlack});
            return v;
        })(),
        // Left foot - separate for animation
        leftFoot: (() => {
            const v = [];
            const feetOrange = '#FF6600';
            for(let x = -2; x <= -1; x++) {
                v.push({x, y: -3, z: -9, c: feetOrange});
                v.push({x, y: -3, z: -10, c: feetOrange});
                v.push({x, y: -3, z: -11, c: feetOrange});
            }
            return v;
        })(),
        // Right foot - separate for animation
        rightFoot: (() => {
            const v = [];
            const feetOrange = '#FF6600';
            for(let x = 1; x <= 2; x++) {
                v.push({x, y: -3, z: -9, c: feetOrange});
                v.push({x, y: -3, z: -10, c: feetOrange});
                v.push({x, y: -3, z: -11, c: feetOrange});
            }
            return v;
        })(),
        animated: true,
        animationType: 'penguin_waddle', // Custom animation for pengu mount
        hidesFeet: true,
        seatOffset: { y: 0 },
        riderOffset: { y: -1 },
        speedBoost: 1.05, // 5% movement speed buff
        scale: 0.3125, // 25% bigger again (0.25 * 1.25)
        positionY: 0.65 // Higher to compensate for larger size
    },
    
    // EPIC: Skateboard - Ride with style and grind animations!
    skateboard: {
        voxels: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c) => {
                const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                if (!voxelMap.has(key)) {
                    voxelMap.set(key, {x: Math.round(x), y: Math.round(y), z: Math.round(z), c});
                }
            };
            
            // Skateboard colors
            const deckTop = '#1a1a1a';      // Black grip tape
            const deckBottom = '#E63946';   // Red deck bottom (cool design)
            const deckSide = '#8B4513';     // Wood sides visible
            const truckMetal = '#A0A0A0';   // Silver trucks
            const truckDark = '#606060';    // Darker truck parts
            const wheelColor = '#F0F0F0';   // White wheels
            const wheelCore = '#303030';    // Dark wheel core
            const stripeYellow = '#FFD700'; // Racing stripe
            const stripeWhite = '#FFFFFF';  // Accent stripe
            
            // === DECK (main board) ===
            // Board dimensions: length 22, width 8, thickness 2
            const boardLength = 11; // half-length
            const boardWidth = 4;   // half-width
            
            // Top surface (grip tape - black with subtle design)
            for(let x = -boardWidth; x <= boardWidth; x++) {
                for(let z = -boardLength; z <= boardLength; z++) {
                    // Taper at nose and tail
                    const taper = Math.abs(z) > 8 ? (Math.abs(z) - 8) * 0.5 : 0;
                    if(Math.abs(x) <= boardWidth - taper) {
                        // Grip tape with subtle stripe
                        const isStripe = Math.abs(x) <= 1 && Math.abs(z) < 7;
                        addVoxel(x, 0, z, isStripe ? '#2a2a2a' : deckTop);
                    }
                }
            }
            
            // Bottom surface (colored with design)
            for(let x = -boardWidth; x <= boardWidth; x++) {
                for(let z = -boardLength; z <= boardLength; z++) {
                    const taper = Math.abs(z) > 8 ? (Math.abs(z) - 8) * 0.5 : 0;
                    if(Math.abs(x) <= boardWidth - taper) {
                        // Cool racing stripes on bottom
                        let color = deckBottom;
                        if(x === 0) color = stripeYellow; // Center gold stripe
                        if(Math.abs(x) === 2 && Math.abs(z) < 6) color = stripeWhite; // Side stripes
                        addVoxel(x, -2, z, color);
                    }
                }
            }
            
            // Side edges (wood visible)
            for(let z = -boardLength; z <= boardLength; z++) {
                const taper = Math.abs(z) > 8 ? (Math.abs(z) - 8) * 0.5 : 0;
                const w = boardWidth - taper;
                if(w > 0) {
                    addVoxel(-Math.ceil(w), -1, z, deckSide);
                    addVoxel(Math.ceil(w), -1, z, deckSide);
                }
            }
            
            // Nose and tail kicks (curved up)
            for(let x = -3; x <= 3; x++) {
                // Nose kick
                addVoxel(x, 1, -boardLength, deckTop);
                addVoxel(x, 0, -boardLength - 1, deckBottom);
                // Tail kick  
                addVoxel(x, 1, boardLength, deckTop);
                addVoxel(x, 0, boardLength + 1, deckBottom);
            }
            
            return Array.from(voxelMap.values());
        })(),
        
        // Front truck assembly (animated for grinding lean)
        frontTruck: (() => {
            const v = [];
            const truckMetal = '#A0A0A0';
            const truckDark = '#606060';
            const wheelColor = '#F0F0F0';
            const wheelCore = '#303030';
            
            const truckZ = -7; // Position toward front
            
            // Truck baseplate
            for(let x = -2; x <= 2; x++) {
                v.push({x, y: -3, z: truckZ, c: truckDark});
            }
            
            // Truck hanger (T-shape)
            for(let x = -4; x <= 4; x++) {
                v.push({x, y: -4, z: truckZ, c: truckMetal});
            }
            v.push({x: 0, y: -3, z: truckZ, c: truckMetal}); // Kingpin area
            
            // Axle
            for(let x = -5; x <= 5; x++) {
                v.push({x, y: -5, z: truckZ, c: truckDark});
            }
            
            // Wheels (left side)
            for(let y = -6; y <= -4; y++) {
                for(let z = truckZ - 1; z <= truckZ + 1; z++) {
                    const isCore = y === -5 && z === truckZ;
                    v.push({x: -6, y, z, c: isCore ? wheelCore : wheelColor});
                    v.push({x: -7, y, z, c: isCore ? wheelCore : wheelColor});
                }
            }
            
            // Wheels (right side)
            for(let y = -6; y <= -4; y++) {
                for(let z = truckZ - 1; z <= truckZ + 1; z++) {
                    const isCore = y === -5 && z === truckZ;
                    v.push({x: 6, y, z, c: isCore ? wheelCore : wheelColor});
                    v.push({x: 7, y, z, c: isCore ? wheelCore : wheelColor});
                }
            }
            
            return v;
        })(),
        
        // Back truck assembly (animated for grinding lean)
        backTruck: (() => {
            const v = [];
            const truckMetal = '#A0A0A0';
            const truckDark = '#606060';
            const wheelColor = '#F0F0F0';
            const wheelCore = '#303030';
            
            const truckZ = 7; // Position toward back
            
            // Truck baseplate
            for(let x = -2; x <= 2; x++) {
                v.push({x, y: -3, z: truckZ, c: truckDark});
            }
            
            // Truck hanger (T-shape)
            for(let x = -4; x <= 4; x++) {
                v.push({x, y: -4, z: truckZ, c: truckMetal});
            }
            v.push({x: 0, y: -3, z: truckZ, c: truckMetal}); // Kingpin area
            
            // Axle
            for(let x = -5; x <= 5; x++) {
                v.push({x, y: -5, z: truckZ, c: truckDark});
            }
            
            // Wheels (left side)
            for(let y = -6; y <= -4; y++) {
                for(let z = truckZ - 1; z <= truckZ + 1; z++) {
                    const isCore = y === -5 && z === truckZ;
                    v.push({x: -6, y, z, c: isCore ? wheelCore : wheelColor});
                    v.push({x: -7, y, z, c: isCore ? wheelCore : wheelColor});
                }
            }
            
            // Wheels (right side)
            for(let y = -6; y <= -4; y++) {
                for(let z = truckZ - 1; z <= truckZ + 1; z++) {
                    const isCore = y === -5 && z === truckZ;
                    v.push({x: 6, y, z, c: isCore ? wheelCore : wheelColor});
                    v.push({x: 7, y, z, c: isCore ? wheelCore : wheelColor});
                }
            }
            
            return v;
        })(),
        
        animated: true,
        animationType: 'skateboard_grind', // Custom grinding animation
        hidesFeet: false,  // Feet visible on the board
        riderOffset: { y: 1.6 },  // Player height on board - ONLY place to edit this!
        speedBoost: 1.25, // 15% speed boost - skateboards are fast!
        scale: 0.22,
        positionY: 0.8,  // Lift board higher (was 0.35)
        // Rider stands sideways on skateboard
        riderRotation: Math.PI / 2, // 90 degrees - sideways stance
        
        // Grinding spark colors for effects
        sparkColors: ['#FFD700', '#FFA500', '#FF6600', '#FFFFFF']
    }
};

export default MOUNTS;
