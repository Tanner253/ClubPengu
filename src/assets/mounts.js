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
    }
};

export default MOUNTS;
