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
    
    // PROMO: Pengu Mount - A $PENGU penguin on its belly
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
            const eyeGrey = '#888888';
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
            
            // Eyes (on head, facing forward +Z) - grey, centered on face
            // Left eye
            addVoxel(-2, 1, 10, eyeGrey);
            addVoxel(-2, 1, 11, eyeGrey);
            addVoxel(-2, 0, 10, eyeGrey);
            addVoxel(-2, 0, 11, eyeGrey);
            // Right eye  
            addVoxel(2, 1, 10, eyeGrey);
            addVoxel(2, 1, 11, eyeGrey);
            addVoxel(2, 0, 10, eyeGrey);
            addVoxel(2, 0, 11, eyeGrey);
            
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
            
            // Flippers (spread out to sides for balance)
            for(let z = -4; z <= 2; z++) {
                addVoxel(-5, -1, z, bodyBlack);
                addVoxel(-6, -2, z, bodyBlack);
                addVoxel(5, -1, z, bodyBlack);
                addVoxel(6, -2, z, bodyBlack);
            }
            // Flipper tips
            addVoxel(-7, -2, 0, bodyBlack);
            addVoxel(-7, -2, -1, bodyBlack);
            addVoxel(7, -2, 0, bodyBlack);
            addVoxel(7, -2, -1, bodyBlack);
            
            // Feet (tucked back behind body at -Z)
            for(let x = -2; x <= -1; x++) {
                addVoxel(x, -3, -9, feetOrange);
                addVoxel(x, -3, -10, feetOrange);
                addVoxel(x, -3, -11, feetOrange);
            }
            for(let x = 1; x <= 2; x++) {
                addVoxel(x, -3, -9, feetOrange);
                addVoxel(x, -3, -10, feetOrange);
                addVoxel(x, -3, -11, feetOrange);
            }
            
            // Tail (small bump at back -Z)
            addVoxel(0, -1, -9, bodyBlack);
            addVoxel(0, -1, -10, bodyBlack);
            
            return Array.from(voxelMap.values());
        })(),
        animated: true,
        animationType: 'penguin_waddle', // Custom animation for pengu mount
        hidesFeet: true,
        seatOffset: { y: 0 },
        riderOffset: { y: -1 },
        speedBoost: 1.05 // 5% movement speed buff
    }
};

export default MOUNTS;
