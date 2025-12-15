import { PALETTE } from './constants';

// --- VOXEL GENERATORS ---

export const generateBaseBody = (mainColor) => {
    const bodyMap = new Map();
    for(let x=-6; x<=6; x++) {
        for(let y=-7; y<=5; y++) {  // Changed from y<=6 to y<=5 - removes top layer to prevent head clipping
            for(let z=-5; z<=5; z++) {
                let yMod = y > 0 ? 1 : 1.2;
                if(x*x + (y*yMod)*(y*yMod) + z*z <= 36) {
                    let color = mainColor;
                    if (z > 2 && x > -4 && x < 4 && y < 3 && y > -6) color = PALETTE.white;
                    bodyMap.set(`${x},${y},${z}`, {x,y,z,c:color});
                }
            }
        }
    }
    return Array.from(bodyMap.values());
};

export const generateFlippers = (mainColor, isLeft) => {
    const voxels = [];
    for(let x=0; x<3; x++) {
        for(let y=-4; y<2; y++) {
            for(let z=-1; z<2; z++) {
                if (x===2 && (y>0 || y<-3)) continue;
                voxels.push({x: isLeft ? x+5 : -x-5, y: y-1, z, c: mainColor});
            }
        }
    }
    return voxels;
};

export const generateFoot = (xOffset) => {
    const voxels = [];
    for(let x=-2; x<=2; x++) {
        for(let z=0; z<=4; z++) {
            voxels.push({x: x+xOffset, y: -7, z: z+1, c: PALETTE.orange});
        }
    }
    return voxels;
};

export const generateFeet = () => {
    return [...generateFoot(-3), ...generateFoot(3)];
};

export const generateHead = (mainColor) => {
     const voxels = [];
     const r = 4.5;
     for(let x=-r; x<=r; x++) {
        for(let y=-r; y<=r; y++) {
            for(let z=-r; z<=r; z++) {
                 if(x*x + y*y + z*z <= r*r) {
                      let color = mainColor;
                      if (z > 1.5 && y < 1) color = PALETTE.white;
                      voxels.push({x,y: y+6,z,c: color});
                 }
            }
        }
     }
     return voxels;
};







