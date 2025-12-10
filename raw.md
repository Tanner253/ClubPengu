import React, { useState, useEffect, useRef, useMemo } from 'react';

// --- 1. ASSET DEFINITIONS & VOXEL DATA ---

const VOXEL_SIZE = 0.5;
const PALETTE = {
    // Skins
    blue: '#0055AA', darkBlue: '#003366', white: '#EEEEEE', orange: '#FF8800',
    black: '#111111', pink: '#FF69B4', gold: '#FFD700', red: '#FF2222',
    green: '#22CC44', grey: '#888888', brown: '#5D4037', purple: '#6600CC',
    teal: '#008080', lime: '#32CD32', cyan: '#00FFFF', magenta: '#FF00FF',
    lavender: '#E6E6FA', coral: '#FF7F50', mint: '#98FF98', navy: '#000080',
    maroon: '#800000', olive: '#808000', silver: '#C0C0C0', sky: '#87CEEB',
    
    // Materials
    beerGold: '#F28C28', glass: '#88CCFF',
    floorLight: '#E8F5E9', floorDark: '#C8E6C9',
    rug: '#FF5252', wood: '#8D6E63',
    mirrorFrame: '#4A3B2C', mirrorGlass: '#E0F7FA',
    
    // Clothing Base
    tieRed: '#D32F2F', tieBlue: '#1976D2',
    shirtWhite: '#FFFFFF', shirtBlack: '#212121',
    camoGreen: '#33691E', jeans: '#1565C0',

    // World Colors (High Quality Theme)
    asphalt: '#404040', roadLine: '#FFD700', sidewalk: '#bdc3c7',
    grass: '#58D68D', water: '#5DADE2', waterDeep: '#2E86C1',
    buildingConcrete: '#95a5a6', buildingDark: '#34495e',
    buildingBeige: '#f5f5dc', buildingBrick: '#c0392b',
    windowLight: '#F7DC6F', windowDark: '#2C3E50', // Lit and unlit windows
    lampPost: '#2c3e50', lampLight: '#F4D03F',
    butterfly1: '#F1C40F', butterfly2: '#E74C3C', butterfly3: '#8E44AD'
};

// --- VOXEL GENERATORS ---

const generateBaseBody = (mainColor) => {
    const bodyMap = new Map();
    for(let x=-6; x<=6; x++) {
        for(let y=-7; y<=6; y++) {
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

const generateFlippers = (mainColor, isLeft) => {
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

const generateFoot = (xOffset) => {
    const voxels = [];
    for(let x=-2; x<=2; x++) {
        for(let z=0; z<=4; z++) {
            voxels.push({x: x+xOffset, y: -7, z: z+1, c: PALETTE.orange});
        }
    }
    return voxels;
};

const generateFeet = () => {
    return [...generateFoot(-3), ...generateFoot(3)];
};

const generateHead = (mainColor) => {
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

// --- ASSET GENERATORS ---
const makeCap = (color, reverse=false) => {
    const v = [];
    // Corrected loop structure for Cap
    for(let x=-4; x<=4; x++) {
        for(let z=-4; z<=4; z++) {
            if(x*x+z*z < 18) {
                for(let y=10; y<12; y++) {
                    v.push({x,y,z,c:color});
                }
            }
        }
    }
    const billZ = reverse ? -1 : 1;
    for(let x=-3; x<=3; x++) for(let z=0; z<4; z++) v.push({x,y:10,z: (z*billZ) + (reverse ? -4 : 4), c:color});
    return v;
};

const makeBeanie = (color) => {
    const v = [];
    for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) for(let y=10; y<13; y++) if(x*x+z*z<17) v.push({x,y,z,c:color});
    v.push({x:0, y:13, z:0, c:color}); 
    return v;
};

const ASSETS = {
    HATS: {
        none: [],
        topHat: (() => {
            let v = [];
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 25) v.push({x, y:10, z, c: '#222'});
            for(let y=10; y<16; y++) for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 9) v.push({x, y, z, c: '#222'});
            for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 9.5 && x*x+z*z > 8) v.push({x, y:11, z, c: '#D00'});
            return v;
        })(),
        propeller: (() => {
            let v = makeCap('blue');
            v.push({x:0, y:12, z:0, c:'grey'});
            return v;
        })(),
        beerHelmet: (() => {
            let v = [];
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) for(let y=9; y<13; y++) if(x*x + (y-9)*(y-9) + z*z < 25 && y>=10) v.push({x,y,z,c:'#DD2'});
            const can = (ox) => {
                let c = [];
                for(let y=10; y<14; y++) for(let x=-2; x<=2; x++) for(let z=-2; z<=2; z++) if(x*x+z*z<4) c.push({x:x+ox, y, z, c:'red'});
                return c;
            };
            v = [...v, ...can(-6), ...can(6)];
            return v;
        })(),
        mohawk: (() => {
            let v = [];
            for(let z=-4; z<=4; z++) for(let y=10; y<14 - Math.abs(z)*0.5; y++) v.push({x:0, y, z, c: '#0F0'});
            return v;
        })(),
        crown: (() => {
            let v = [];
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z > 12 && x*x+z*z < 18) {
                v.push({x, y:10, z, c: 'gold'});
                v.push({x, y:11, z, c: 'gold'});
                if((x+z)%3===0) v.push({x, y:12, z, c: 'gold'});
            }
            return v;
        })(),
        viking: (() => {
            let v = makeBeanie('grey');
            v.push({x:-4, y:11, z:0, c:'white'}, {x:-5, y:12, z:0, c:'white'}, {x:-6, y:13, z:0, c:'white'});
            v.push({x:4, y:11, z:0, c:'white'}, {x:5, y:12, z:0, c:'white'}, {x:6, y:13, z:0, c:'white'});
            return v;
        })(),
        chef: (() => {
            let v = [];
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z<18) for(let y=10; y<15; y++) v.push({x,y,z,c:'white'});
            return v;
        })(),
        cowboy: (() => {
             let v = [];
             for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) if(x*x+z*z < 40) v.push({x, y:10, z, c: 'brown'});
             for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 12) for(let y=11; y<14; y++) v.push({x, y, z, c: 'brown'});
             return v;
        })(),
        sombrero: (() => {
             let v = [];
             for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) if(x*x+z*z < 50) v.push({x, y:10, z, c: '#EDC'});
             for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 12) for(let y=11; y<15; y++) v.push({x, y, z, c: '#EDC'});
             return v;
        })(),
        fez: (() => {
             let v = [];
             for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 10) for(let y=10; y<13; y++) v.push({x, y, z, c: 'red'});
             v.push({x:0, y:13, z:0, c:'gold'}); // Tassel
             return v;
        })(),
        halo: (() => {
            let v = [];
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z > 12 && x*x+z*z < 18) v.push({x, y:14, z, c: 'gold', glow:true});
            return v;
        })(),
        headphones: (() => {
            let v = [];
            v.push({x:-5, y:8, z:0, c:'black'}, {x:-5, y:9, z:0, c:'black'}); // Ear cups
            v.push({x:5, y:8, z:0, c:'black'}, {x:5, y:9, z:0, c:'black'});
            for(let x=-5; x<=5; x++) v.push({x, y:11, z:0, c:'grey'}); // Band
            return v;
        })(),
        santa: (() => {
            const v = [];
            // 1. White Fur Brim
            for(let x=-5; x<=5; x++) {
                for(let z=-5; z<=5; z++) {
                    const d = x*x + z*z;
                    if(d < 26 && d > 12) {
                        v.push({x, y:10, z, c:'white'});
                    }
                }
            }
            
            // 2. Rigid Red Cone (Tapering Up)
            // Base
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z < 17) v.push({x, y:11, z, c:'red'});
            // Mid
            for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 10) v.push({x, y:12, z, c:'red'});
            // Top
            for(let x=-2; x<=2; x++) for(let z=-2; z<=2; z++) if(x*x+z*z < 5) v.push({x, y:13, z, c:'red'});
            // Tip
            v.push({x:0, y:14, z:0, c:'red'});

            // 3. Puffball (Centered on top)
            v.push({x:0, y:15, z:0, c:'white'});
            v.push({x:1, y:15, z:0, c:'white'});
            v.push({x:-1, y:15, z:0, c:'white'});
            v.push({x:0, y:15, z:1, c:'white'});
            v.push({x:0, y:15, z:-1, c:'white'});
            v.push({x:0, y:16, z:0, c:'white'});

            return v;
        })(),
        flower: (() => {
            let v = [];
            v.push({x:3, y:11, z:3, c:'yellow'});
            v.push({x:2, y:11, z:3, c:'pink'}, {x:4, y:11, z:3, c:'pink'}, {x:3, y:11, z:2, c:'pink'}, {x:3, y:11, z:4, c:'pink'});
            return v;
        })(),
        // Colors
        capRed: makeCap('red'), capGreen: makeCap('green'), capBlack: makeCap('black'),
        beanieBlue: makeBeanie('blue'), beanieOrange: makeBeanie('orange'), beaniePink: makeBeanie('pink'),
        capBackwards: makeCap('purple', true)
    },
    EYES: {
        normal: [{x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'}],
        bored: [
            {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
            {x:-2, y:7.5, z:4.5, c:'white'}, {x:2, y:7.5, z:4.5, c:'white'}, 
            {x:-3, y:7.5, z:4.2, c:'white'}, {x:3, y:7.5, z:4.2, c:'white'}
        ],
        angry: [
            {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
            {x:-1, y:7.5, z:4, c:'black'}, {x:1, y:7.5, z:4, c:'black'} 
        ],
        laser: [
            {x:-2, y:7, z:4, c:'red', glow: true}, {x:2, y:7, z:4, c:'red', glow: true},
            {x:-3, y:7, z:4, c:'red', glow: true}, {x:3, y:7, z:4, c:'red', glow: true} 
        ],
        shades: (() => {
            let v = [];
            for(let x=-4; x<=4; x++) v.push({x, y:7, z:4.5, c:'black'});
            v.push({x:-4, y:7, z:3, c:'black'}, {x:4, y:7, z:3, c:'black'});
            return v;
        })(),
        cute: [
             {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
             {x:-2, y:8, z:4, c:'black'}, {x:2, y:8, z:4, c:'black'},
             {x:-1.5, y:7.5, z:4.2, c:'white'}, {x:2.5, y:7.5, z:4.2, c:'white'}
        ],
        cyclops: [
             {x:0, y:7, z:4.5, c:'black'}, {x:-1, y:7, z:4.5, c:'white'}, {x:1, y:7, z:4.5, c:'white'},
             {x:0, y:8, z:4.5, c:'white'}, {x:0, y:6, z:4.5, c:'white'}
        ],
        winking: [
             {x:-2, y:7, z:4, c:'black'}, 
             {x:2, y:7, z:4, c:'black', scaleY:0.2}
        ],
        dead: [
             {x:-2, y:7, z:4, c:'black'}, {x:-3, y:8, z:4, c:'black'}, {x:-1, y:6, z:4, c:'black'}, {x:-3, y:6, z:4, c:'black'}, {x:-1, y:8, z:4, c:'black'},
             {x:2, y:7, z:4, c:'black'}, {x:1, y:8, z:4, c:'black'}, {x:3, y:6, z:4, c:'black'}, {x:1, y:6, z:4, c:'black'}, {x:3, y:8, z:4, c:'black'}
        ],
        hearts: [
             {x:-2, y:7, z:4, c:'pink'}, {x:-3, y:8, z:4, c:'pink'}, {x:-1, y:8, z:4, c:'pink'},
             {x:2, y:7, z:4, c:'pink'}, {x:1, y:8, z:4, c:'pink'}, {x:3, y:8, z:4, c:'pink'}
        ],
        money: [
             {x:-2, y:7, z:4, c:'green'}, {x:-2, y:6, z:4, c:'green'}, {x:-2, y:8, z:4, c:'green'},
             {x:2, y:7, z:4, c:'green'}, {x:2, y:6, z:4, c:'green'}, {x:2, y:8, z:4, c:'green'}
        ],
        patch: [
             {x:-2, y:7, z:4, c:'black'}, {x:-2, y:8, z:4, c:'black'}, {x:-2, y:6, z:4, c:'black'}, {x:-1, y:7, z:4, c:'black'}, {x:-3, y:7, z:4, c:'black'},
             {x:2, y:7, z:4, c:'black'}
        ],
        glasses3D: [
             {x:-2, y:7, z:4.5, c:'red', alpha:0.5}, {x:2, y:7, z:4.5, c:'blue', alpha:0.5},
             {x:0, y:7, z:4.5, c:'white'}
        ],
        crying: [
             {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
             {x:-2, y:6, z:4.2, c:'cyan'}, {x:-2, y:5, z:4.2, c:'cyan'},
             {x:2, y:6, z:4.2, c:'cyan'}, {x:2, y:5, z:4.2, c:'cyan'}
        ],
        monocle: [
             {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4.5, c:'gold', wire:true}, {x:2, y:7, z:4, c:'black'}
        ],
        hypno: [
             {x:-2, y:7, z:4, c:'white'}, {x:-2, y:7, z:4.2, c:'black'},
             {x:2, y:7, z:4, c:'white'}, {x:2, y:7, z:4.2, c:'black'}
        ],
        fire: [
             {x:-2, y:7, z:4, c:'orange'}, {x:-2, y:8, z:4, c:'red'},
             {x:2, y:7, z:4, c:'orange'}, {x:2, y:8, z:4, c:'red'}
        ]
    },
    MOUTH: {
        beak: [{x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'}],
        cigarette: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:2, y:5.5, z:5, c:'white'}, {x:3, y:5.5, z:5.2, c:'white'}, {x:4, y:5.5, z:5.4, c:'white'},
            {x:4.5, y:5.5, z:5.5, c:'red', fx:'smoke'}
        ],
        bubblegum: [{x:0, y:5.5, z:5, c:'pink', fx: 'bubble'}],
        mustache: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:-1, y:5, z:5.2, c:'brown'}, {x:1, y:5, z:5.2, c:'brown'}, {x:-2, y:4.5, z:5, c:'brown'}, {x:2, y:4.5, z:5, c:'brown'}
        ],
        beard: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:0, y:4, z:5, c:'grey'}, {x:-1, y:4.5, z:4.8, c:'grey'}, {x:1, y:4.5, z:4.8, c:'grey'}, {x:0, y:3, z:4.8, c:'grey'}
        ],
        tongue: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:0, y:4.5, z:5, c:'red'}, {x:0, y:3.5, z:5.2, c:'red'}
        ],
        pipe: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:1, y:5, z:5.5, c:'brown'}, {x:2, y:5, z:6, c:'brown'}, {x:2, y:6, z:6, c:'brown', fx:'smoke'}
        ],
        smile: [
             {x:0, y:5.5, z:5, c:'orange'},
             {x:-1, y:6, z:4.5, c:'black'}, {x:1, y:6, z:4.5, c:'black'}
        ],
        fangs: [
             {x:0, y:5.5, z:5, c:'orange'},
             {x:-1, y:4.5, z:5, c:'white'}, {x:1, y:4.5, z:5, c:'white'}
        ],
        mask: [
             {x:0, y:5, z:5.2, c:'white'}, {x:-1, y:5, z:5, c:'white'}, {x:1, y:5, z:5, c:'white'},
             {x:0, y:4, z:5, c:'white'}
        ],
        lipstick: [
             {x:0, y:5.5, z:5, c:'red'}, {x:-1, y:5.5, z:4.5, c:'red'}, {x:1, y:5.5, z:4.5, c:'red'}
        ],
        braces: [
             {x:0, y:5.5, z:5, c:'orange'},
             {x:-0.5, y:5.5, z:5.1, c:'silver'}, {x:0.5, y:5.5, z:5.1, c:'silver'}
        ]
    },
    BODY: {
        none: [],
        scarf: (() => {
            let v = [];
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z>9 && x*x+z*z<25) v.push({x, y:4, z, c:'#AA22AA'});
            v.push({x:3, y:3, z:4, c:'#AA22AA'}, {x:3, y:2, z:4, c:'#AA22AA'});
            return v;
        })(),
        bowtie: [
            {x:0, y:4, z:4, c:'red'}, {x:-1, y:4.2, z:4, c:'red'}, {x:1, y:4.2, z:4, c:'red'},
            {x:-2, y:4.5, z:3.8, c:'red'}, {x:2, y:4.5, z:3.8, c:'red'}
        ],
        goldChain: (() => {
            let v = [];
             for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z>12 && x*x+z*z<18) v.push({x, y:3.5, z, c:PALETTE.gold});
             v.push({x:0, y:2, z:4.5, c:PALETTE.gold});
             v.push({x:-1, y:2, z:4.5, c:PALETTE.gold});
             v.push({x:1, y:2, z:4.5, c:PALETTE.gold});
             return v;
        })(),
        tie: [
             {x:0, y:4, z:4.2, c:'red'}, {x:0, y:3, z:4.2, c:'red'}, {x:0, y:2, z:4.3, c:'red'}, {x:0, y:1, z:4.4, c:'red'}
        ],
        shirtWhite: (() => {
             let v = [];
             for(let x=-4; x<=4; x++) for(let y=-3; y<4; y++) for(let z=-4; z<=4; z++) if(x*x+z*z < 25 && x*x+z*z > 16) v.push({x,y,z,c:'white'});
             return v;
        })(),
        shirtBlack: (() => {
             let v = [];
             for(let x=-4; x<=4; x++) for(let y=-3; y<4; y++) for(let z=-4; z<=4; z++) if(x*x+z*z < 25 && x*x+z*z > 16) v.push({x,y,z,c:'#222'});
             return v;
        })(),
        overalls: (() => {
             let v = [];
             for(let x=-4; x<=4; x++) for(let y=-5; y<0; y++) for(let z=-4; z<=4; z++) if(x*x+z*z < 25 && x*x+z*z > 16) v.push({x,y,z,c:'blue'});
             v.push({x:-2, y:1, z:4, c:'blue'}, {x:2, y:1, z:4, c:'blue'}); // Straps
             return v;
        })(),
        bikini: [
             {x:-2, y:1, z:4.2, c:'pink'}, {x:2, y:1, z:4.2, c:'pink'},
             {x:0, y:-5, z:4.2, c:'pink'}
        ],
        backpack: (() => {
             let v = [];
             for(let x=-3; x<=3; x++) for(let y=-2; y<4; y++) v.push({x, y, z:-5, c:'brown'});
             return v;
        })(),
        cape: (() => {
             let v = [];
             for(let x=-4; x<=4; x++) for(let y=-6; y<4; y++) v.push({x, y, z:-5, c:'red'});
             return v;
        })(),
        lifevest: (() => {
             let v = [];
             for(let x=-4; x<=4; x++) for(let y=-3; y<3; y++) for(let z=-4; z<=4; z++) if(x*x+z*z > 16 && x*x+z*z<26) v.push({x,y,z,c:'orange'});
             return v;
        })(),
        guitar: [
             {x:3, y:0, z:5, c:'brown'}, {x:4, y:-1, z:5, c:'brown'}, {x:5, y:-2, z:5, c:'brown'},
             {x:2, y:1, z:5.2, c:'black'} // Neck
        ],
        sword: [
             {x:5, y:-2, z:0, c:'silver'}, {x:5, y:-1, z:0, c:'silver'}, {x:5, y:0, z:0, c:'silver'}, {x:5, y:1, z:0, c:'silver'},
             {x:5, y:-3, z:0, c:'brown'}, {x:4, y:-2, z:0, c:'gold'}, {x:6, y:-2, z:0, c:'gold'}
        ],
        shield: (() => {
             let v = [];
             for(let y=-2; y<2; y++) for(let z=-2; z<2; z++) v.push({x:-6, y, z, c:'silver'});
             return v;
        })(),
        tutu: (() => {
             let v = [];
             for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z > 20 && x*x+z*z < 36) v.push({x, y:-5, z, c:'pink'});
             return v;
        })()
    }
};

// Simple Icons
const IconSettings = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
    </svg>
);
const IconChevronLeft = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
);
const IconChevronRight = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
);
const IconCamera = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
);
const IconSparkles = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
);
const IconWorld = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
    </svg>
);
const IconSend = ({size}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);

// --- 2. VOXEL WORLD ENGINE ---

const VoxelWorld = ({ penguinData, onExit }) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const playerRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const reqRef = useRef(null);
    const mapRef = useRef(null);
    const clockRef = useRef(null);
    
    // Player State
    const posRef = useRef({ x: 0, y: 0, z: 0 });
    const velRef = useRef({ x: 0, z: 0 });
    const rotRef = useRef(0);
    const keysRef = useRef({});
    
    // Chat State
    const [chatInput, setChatInput] = useState("");
    const [activeBubble, setActiveBubble] = useState(null);
    const bubbleSpriteRef = useRef(null);
    
    // AI State
    const aiAgentsRef = useRef([]);
    const AI_NAMES = ["Puddles", "Waddle", "Snowy", "Flipper", "IceCube", "Chilly", "Pebble", "Igloo", "Frosty", "Slippy"];
    
    // STRUCTURED CONVERSATION DIALOGUES
    const CONVERSATIONS = [
        ["Did you see SOL today?", "SOLANA is skyrocketing! 🚀", "To the moon we go!", "HODL your flippers!"],
        ["Club Penguin is back!", "I missed this place.", "Let's go dance!", "Wait for me!"],
        ["Nice outfit.", "Thanks, it's custom.", "Very stylish.", "You look cool too."],
        ["Is it cold?", "Ideally freezing.", "Perfect weather.", "Let's slide on the ice."],
        ["Waddle on!", "Waddle on!", "See you around.", "Bye for now!"],
        ["Anyone seen the dojo?", "I think it's north.", "Let's become ninjas!", "Hyah!"],
        ["Pizza time?", "Always pizza time.", "Extra fish topping?", "Gross, but okay."]
    ];

    const AI_EMOTES = ['Wave', 'Dance', 'Laugh', 'Sit'];
    
    // Game State
    const [showEmoteWheel, setShowEmoteWheel] = useState(false);
    const emoteRef = useRef({ type: null, startTime: 0 });
    
    // City Generation
    const CITY_SIZE = 40; 
    const BUILDING_SCALE = 4; // Voxel units
    
    // Create Chat Bubble Sprite
    const createChatSprite = (message) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const fontSize = 48; // Higher resolution for crisp text
        const padding = 20;
        
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        // Word Wrap Logic
        const maxLineWidth = 600; 
        const words = message.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(currentLine + " " + word).width;
            if (width < maxLineWidth) {
                currentLine += " " + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
        
        // Canvas Dimensions
        const textHeight = lines.length * (fontSize * 1.2);
        const textWidth = lines.length > 1 ? maxLineWidth : ctx.measureText(lines[0]).width;
        
        const w = textWidth + padding * 3;
        const h = textHeight + padding * 3;
        
        canvas.width = w;
        canvas.height = h;
        
        // Re-apply font context after resize
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        
        // Draw Bubble Background
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 6;
        
        const r = 25; // Corner radius
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(w-r, 0);
        ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h-r);
        ctx.quadraticCurveTo(w, h, w-r, h);
        ctx.lineTo(r, h);
        ctx.quadraticCurveTo(0, h, 0, h-r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        ctx.fill();
        ctx.shadowColor = 'transparent'; // clear shadow for stroke
        ctx.stroke();
        
        // Draw Text
        ctx.fillStyle = 'black';
        lines.forEach((line, i) => {
            ctx.fillText(line, w/2, padding + (i * fontSize * 1.2));
        });
        
        const texture = new THREE.CanvasTexture(canvas);
        // Important: depthTest: false to render on top of trees/buildings
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false }); 
        const sprite = new THREE.Sprite(material);
        
        // Adjust scale relative to world units
        const scale = 0.02; // Pixel to world unit ratio
        sprite.scale.set(w * scale, h * scale, 1);
        sprite.position.set(0, 4.5, 0); // Position above head (Adjusted from 13 down to 4.5)
        sprite.renderOrder = 999; // Ensure it draws last on top
        
        return sprite;
    };

    useEffect(() => {
        if (!mountRef.current || !window.THREE) return;
        const THREE = window.THREE;
        const OrbitControls = window.THREE.OrbitControls;
        
        // Setup
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(PALETTE.sky);
        // Removed Fog
        
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 300); // Increased far plane
        cameraRef.current = camera;
        camera.position.set(0, 15, -15);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        const clock = new THREE.Clock();
        clockRef.current = clock;

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.minDistance = 5;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI / 2 - 0.1; 
        controls.enablePan = false; 
        controlsRef.current = controls;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.7); // Slightly brighter
        scene.add(ambient);
        
        const sunLight = new THREE.DirectionalLight(0xffffee, 1.1);
        sunLight.position.set(100, 150, 50); // Higher sun
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.set(4096, 4096); // Higher res shadows
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        scene.add(sunLight);
        
        // --- HIGH FIDELITY CITY GENERATION ---
        const generateCity = () => {
            const map = [];
            const dummy = new THREE.Object3D();
            
            // Map Layout (Grid with "Districts")
            for(let x=0; x<CITY_SIZE; x++) {
                map[x] = [];
                for(let z=0; z<CITY_SIZE; z++) {
                    const dx = x - CITY_SIZE/2;
                    const dz = z - CITY_SIZE/2;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    
                    let type = 1; // Building
                    if (dist < 7) type = 2; // Park (Larger)
                    if (dist < 3) type = 2; // REMOVED WATER (was type 3, now 2) to reduce lag and collision
                    else if (x % 5 === 0 || z % 5 === 0) type = 0; // Dense Roads
                    
                    // Random "Plazas"
                    if (type === 1 && Math.random() > 0.95) type = 2;
                    
                    map[x][z] = type;
                }
            }
            mapRef.current = map;
            
            // Instance Groups Data
            const groups = {
                // Buildings
                base: { mats: [], cols: [] },
                tiers: { mats: [], cols: [] },
                windows: { mats: [], cols: [] }, // Lit
                windowsDark: { mats: [], cols: [] }, // Unlit
                trims: { mats: [], cols: [] },
                roofs: { mats: [], cols: [] },
                doors: { mats: [], cols: [] },
                vents: { mats: [], cols: [] },
                // Environment
                roads: { mats: [], cols: [] },
                sidewalks: { mats: [], cols: [] },
                grass: { mats: [], cols: [] },
                water: { mats: [], cols: [] },
                trunks: { mats: [], cols: [] },
                leaves: { mats: [], cols: [] },
                lamps: { mats: [], cols: [] },
                bushes: { mats: [], cols: [] }
            };
            
            const buildingPalette = [PALETTE.buildingBrickRed, PALETTE.buildingBrickYellow, PALETTE.buildingBrickBlue, PALETTE.buildingConcrete, PALETTE.buildingBeige, PALETTE.buildingDark];

            for(let x=0; x<CITY_SIZE; x++) {
                for(let z=0; z<CITY_SIZE; z++) {
                    const type = map[x][z];
                    const px = x * BUILDING_SCALE;
                    const pz = z * BUILDING_SCALE;
                    
                    if (type === 1) {
                        // === ADVANCED BUILDING ===
                        const bColorHex = buildingPalette[Math.floor(Math.random() * buildingPalette.length)];
                        const bColor = new THREE.Color(bColorHex);
                        
                        // Base
                        const height = 4 + Math.floor(Math.random() * 6);
                        dummy.position.set(px, height/2, pz);
                        dummy.rotation.set(0,0,0);
                        dummy.scale.set(3.8, height, 3.8); // Nearly filling tile
                        dummy.updateMatrix();
                        groups.base.mats.push(dummy.matrix.clone());
                        groups.base.cols.push(bColor.r, bColor.g, bColor.b);
                        
                        // Roof Trim
                        dummy.position.set(px, height + 0.1, pz);
                        dummy.scale.set(4.0, 0.2, 4.0);
                        dummy.updateMatrix();
                        groups.trims.mats.push(dummy.matrix.clone());
                        
                        // Entrance
                        // Decide orientation (face nearest road?) - simplified random for now
                        const side = Math.floor(Math.random()*4);
                        dummy.rotation.y = side * (Math.PI/2);
                        dummy.position.set(px + (side===0?1.95:side===1?0:side===2?-1.95:0), 0.75, pz + (side===1?1.95:side===0?0:side===3?-1.95:0));
                        if(side===0||side===2) dummy.position.z = pz; 
                        if(side===1||side===3) dummy.position.x = px;
                        
                        dummy.scale.set(0.1, 1.5, 1.2); // Door frame
                        dummy.updateMatrix();
                        groups.doors.mats.push(dummy.matrix.clone());
                        
                        // Windows (Grid pattern)
                        for(let wy=1.5; wy<height-0.5; wy+=1.2) {
                            for(let s=0; s<4; s++) { // 4 sides
                                if(Math.random() > 0.3) {
                                    dummy.rotation.set(0, s*(Math.PI/2), 0);
                                    let wx = 0, wz = 0;
                                    const offset = 1.95;
                                    if(s===0) wx = offset; 
                                    else if(s===1) wz = offset;
                                    else if(s===2) wx = -offset;
                                    else wz = -offset;
                                    
                                    dummy.position.set(px+wx, wy, pz+wz);
                                    // Slight offset for details
                                    if(s===0 || s===2) dummy.position.z = pz - 1 + Math.random()*2;
                                    else dummy.position.x = px - 1 + Math.random()*2;
                                    
                                    // Window sill
                                    dummy.scale.set(0.2, 0.1, 0.8);
                                    dummy.position.y -= 0.3;
                                    dummy.updateMatrix();
                                    groups.trims.mats.push(dummy.matrix.clone());
                                    
                                    // Glass
                                    dummy.position.y += 0.3;
                                    dummy.scale.set(0.05, 0.6, 0.6);
                                    dummy.updateMatrix();
                                    
                                    if(Math.random() > 0.4) groups.windows.mats.push(dummy.matrix.clone());
                                    else groups.windowsDark.mats.push(dummy.matrix.clone());
                                }
                            }
                        }
                        
                        // Roof Clutter (AC/Vents)
                        if(Math.random() > 0.3) {
                            dummy.rotation.set(0,0,0);
                            dummy.position.set(px, height + 0.5, pz);
                            dummy.scale.set(1, 0.8, 1);
                            dummy.updateMatrix();
                            groups.vents.mats.push(dummy.matrix.clone());
                        }
                        
                        // Sidewalk around building
                        dummy.rotation.set(0,0,0);
                        dummy.position.set(px, 0.05, pz);
                        dummy.scale.set(BUILDING_SCALE, 0.1, BUILDING_SCALE);
                        dummy.updateMatrix();
                        groups.sidewalks.mats.push(dummy.matrix.clone());
                    }
                    else if (type === 0) {
                        // Road
                        dummy.position.set(px, 0, pz);
                        dummy.scale.set(BUILDING_SCALE, 0.1, BUILDING_SCALE);
                        dummy.updateMatrix();
                        groups.roads.mats.push(dummy.matrix.clone());
                        
                        // Street Lamp (Corners)
                        if (x % 5 === 0 && z % 5 === 0) {
                            dummy.position.set(px + 1.8, 2, pz + 1.8);
                            dummy.scale.set(0.2, 4, 0.2);
                            dummy.updateMatrix();
                            groups.lamps.mats.push(dummy.matrix.clone());
                        }
                    }
                    else if (type === 2) {
                        // Grass
                        dummy.position.set(px, 0, pz);
                        dummy.scale.set(BUILDING_SCALE, 0.1, BUILDING_SCALE);
                        dummy.updateMatrix();
                        groups.grass.mats.push(dummy.matrix.clone());
                        
                        const rand = Math.random();
                        if(rand > 0.6) {
                            // Tree
                            dummy.position.set(px, 1, pz);
                            dummy.scale.set(0.5, 2, 0.5);
                            dummy.updateMatrix();
                            groups.trunks.mats.push(dummy.matrix.clone());
                            
                            dummy.position.set(px, 3, pz);
                            dummy.scale.set(2 + Math.random(), 2 + Math.random(), 2 + Math.random());
                            dummy.updateMatrix();
                            groups.leaves.mats.push(dummy.matrix.clone());
                        } else if (rand > 0.3) {
                            // Bush
                            dummy.position.set(px + (Math.random()-0.5)*2, 0.5, pz + (Math.random()-0.5)*2);
                            dummy.scale.set(1, 0.8, 1);
                            dummy.updateMatrix();
                            groups.bushes.mats.push(dummy.matrix.clone());
                        }
                    }
                    else if (type === 3) {
                        // Water
                        dummy.position.set(px, -0.2, pz);
                        dummy.scale.set(BUILDING_SCALE, 0.1, BUILDING_SCALE);
                        dummy.updateMatrix();
                        groups.water.mats.push(dummy.matrix.clone());
                    }
                }
            }
            
            const makeInstanced = (data, color, isEmissive=false) => {
                if(data.mats.length === 0) return;
                const geo = new THREE.BoxGeometry(1,1,1);
                const matOpts = { color: color };
                if(isEmissive) matOpts.emissive = color;
                const mat = new THREE.MeshStandardMaterial(matOpts);
                
                // Special case for random colored buildings
                if(data.cols.length > 0) {
                    mat.vertexColors = true;
                    mat.color.setHex(0xffffff);
                }
                
                const mesh = new THREE.InstancedMesh(geo, mat, data.mats.length);
                data.mats.forEach((m, i) => mesh.setMatrixAt(i, m));
                
                if(data.cols.length > 0) {
                    const cArray = new Float32Array(data.cols);
                    geo.setAttribute('color', new THREE.InstancedBufferAttribute(cArray, 3));
                }
                
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                scene.add(mesh);
            };
            
            makeInstanced(groups.base, null); // Vertex colored
            makeInstanced(groups.trims, '#2c3e50');
            makeInstanced(groups.doors, '#5D4037');
            makeInstanced(groups.windows, PALETTE.windowLight, true); // Emissive
            makeInstanced(groups.windowsDark, PALETTE.windowDark);
            makeInstanced(groups.vents, '#7f8c8d');
            
            makeInstanced(groups.roads, PALETTE.asphalt);
            makeInstanced(groups.sidewalks, PALETTE.sidewalk);
            makeInstanced(groups.grass, PALETTE.grass);
            makeInstanced(groups.water, PALETTE.water);
            makeInstanced(groups.trunks, PALETTE.wood);
            makeInstanced(groups.leaves, '#27ae60');
            makeInstanced(groups.bushes, '#2ecc71');
            makeInstanced(groups.lamps, PALETTE.lampPost);
            
            // Butterflies
            const butterflyGroup = new THREE.Group();
            for(let i=0; i<5; i++) { // Reduced from 30 to 5
                const wingGeo = new THREE.BoxGeometry(0.2, 0.05, 0.2);
                const color = i%3===0 ? PALETTE.butterfly1 : i%3===1 ? PALETTE.butterfly2 : PALETTE.butterfly3;
                const wing1 = new THREE.Mesh(wingGeo, new THREE.MeshBasicMaterial({color}));
                const wing2 = new THREE.Mesh(wingGeo, new THREE.MeshBasicMaterial({color}));
                wing1.position.x = 0.1;
                wing2.position.x = -0.1;
                
                const b = new THREE.Group();
                b.add(wing1, wing2);
                
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.random() * 20;
                b.position.set((Math.cos(angle) * radius) + (CITY_SIZE/2 * BUILDING_SCALE), 2 + Math.random()*2, (Math.sin(angle) * radius) + (CITY_SIZE/2 * BUILDING_SCALE));
                
                b.userData = {
                    speed: 0.05 + Math.random() * 0.05,
                    yOffset: Math.random() * 100,
                    center: b.position.clone()
                };
                butterflyGroup.add(b);
            }
            scene.add(butterflyGroup);
            return { butterflyGroup };
        };
        
        const { butterflyGroup } = generateCity();
        
        // --- PLAYER & AI BUILDER ---
        const buildPenguinMesh = (data) => {
             const group = new THREE.Group();
             // Pivot-aware buildPart
             const buildPart = (voxels, palette, pivot) => {
                 const g = new THREE.Group();
                 const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
                 voxels.forEach(v => {
                      const mat = new THREE.MeshStandardMaterial({ color: palette[v.c] || v.c });
                      const mesh = new THREE.Mesh(geo, mat);
                      
                      let px = v.x * VOXEL_SIZE;
                      let py = v.y * VOXEL_SIZE;
                      let pz = v.z * VOXEL_SIZE;
                      
                      // Subtract pivot if present
                      if(pivot) {
                          px -= pivot.x * VOXEL_SIZE;
                          py -= pivot.y * VOXEL_SIZE;
                          pz -= pivot.z * VOXEL_SIZE;
                      }
                      
                      mesh.position.set(px, py, pz);
                      mesh.castShadow = true;
                      if(v.scaleY) mesh.scale.y = v.scaleY;
                      g.add(mesh);
                 });
                 
                 // If pivot used, move group to pivot
                 if(pivot) {
                      g.position.set(pivot.x * VOXEL_SIZE, pivot.y * VOXEL_SIZE, pivot.z * VOXEL_SIZE);
                 }
                 
                 return g;
             };
             
             const skin = data.skin || 'blue';
             const body = buildPart(generateBaseBody(PALETTE[skin] || skin), PALETTE);
             const head = buildPart(generateHead(PALETTE[skin] || skin), PALETTE);
             
             const footL = buildPart(generateFoot(3), PALETTE, {x:3, y:-6, z:1});
             footL.name = 'foot_l';
             const footR = buildPart(generateFoot(-3), PALETTE, {x:-3, y:-6, z:1});
             footR.name = 'foot_r';
             
             const flippersLeft = buildPart(generateFlippers(PALETTE[skin] || skin, true), PALETTE, {x:5, y:0, z:0});
             const flippersRight = buildPart(generateFlippers(PALETTE[skin] || skin, false), PALETTE, {x:-5, y:0, z:0});
             
             flippersLeft.name = 'flipper_l';
             flippersRight.name = 'flipper_r';
             head.name = 'head';
             body.name = 'body';
             
             group.add(body, head, flippersLeft, flippersRight, footL, footR);
             
             if (data.hat && data.hat !== 'none') {
                 const p = buildPart(ASSETS.HATS[data.hat], PALETTE);
                 p.name = 'hat';
                 group.add(p);
             }
             
             if (data.eyes && data.eyes !== 'normal') {
                 const p = buildPart(ASSETS.EYES[data.eyes], PALETTE);
                 p.name = 'eyes';
                 group.add(p);
             } else {
                 const p = buildPart(ASSETS.EYES.normal, PALETTE);
                 p.name = 'eyes';
                 group.add(p);
             }
             
             if (data.mouth && data.mouth !== 'beak') {
                 const p = buildPart(ASSETS.MOUTH[data.mouth], PALETTE);
                 p.name = 'mouth';
                 group.add(p);
             } else {
                 const p = buildPart(ASSETS.MOUTH.beak, PALETTE);
                 p.name = 'mouth';
                 group.add(p);
             }
             
             if (data.bodyItem && data.bodyItem !== 'none') {
                 const p = buildPart(ASSETS.BODY[data.bodyItem], PALETTE);
                 p.name = 'accessory';
                 group.add(p);
             }
             
             // Scale and Initial Position
             group.scale.set(0.2, 0.2, 0.2); 
             group.position.y = 1; 
             
             // Create wrapper for easier transforms
             const wrapper = new THREE.Group();
             wrapper.add(group);
             return wrapper;
        };
        
        // --- BUILD PLAYER ---
        const playerWrapper = buildPenguinMesh(penguinData);
        playerRef.current = playerWrapper;
        scene.add(playerWrapper);
        
        // Spawn Player
        posRef.current = { x: (CITY_SIZE/2) * BUILDING_SCALE, y: 0, z: (CITY_SIZE/2) * BUILDING_SCALE + 10 };
        
        // --- INITIALIZE AI AGENTS ---
        AI_NAMES.forEach((name, i) => {
            // Random Config
            const skins = Object.keys(PALETTE).filter(k => !['floorLight','floorDark','wood','rug','glass','beerGold','mirrorFrame','mirrorGlass', 'asphalt', 'roadLine', 'buildingBrickRed', 'buildingBrickYellow', 'buildingBrickBlue', 'windowLight', 'windowDark', 'grass', 'snow', 'water', 'waterDeep', 'butterfly1', 'butterfly2', 'butterfly3'].includes(k));
            const hats = Object.keys(ASSETS.HATS);
            const bodyItems = Object.keys(ASSETS.BODY);
            
            const aiData = {
                skin: skins[Math.floor(Math.random() * skins.length)],
                hat: hats[Math.floor(Math.random() * hats.length)],
                eyes: 'normal',
                mouth: 'beak',
                bodyItem: bodyItems[Math.floor(Math.random() * bodyItems.length)]
            };
            
            const aiMesh = buildPenguinMesh(aiData);
            
            // Random Start Pos around center
            const angle = Math.random() * Math.PI * 2;
            const dist = 5 + Math.random() * 20;
            const sx = (CITY_SIZE/2 * BUILDING_SCALE) + Math.cos(angle)*dist;
            const sz = (CITY_SIZE/2 * BUILDING_SCALE) + Math.sin(angle)*dist;
            
            aiMesh.position.set(sx, 0, sz);
            scene.add(aiMesh);
            
            aiAgentsRef.current.push({
                id: i,
                name: name,
                mesh: aiMesh,
                pos: { x: sx, y: 0, z: sz },
                rot: Math.random() * Math.PI * 2,
                action: 'idle', // idle, walk, chatting
                conversationCooldown: 0,
                conversationPartner: null,
                conversationScript: null,
                conversationLineIdx: 0,
                conversationTurn: false,
                target: null,
                actionTimer: 0,
                emoteType: null,
                emoteStart: 0,
                bubble: null,
                bubbleTimer: 0
            });
        });

        // --- INPUT HANDLING ---
        const handleDown = (e) => {
            if (document.activeElement.tagName === 'INPUT') {
                if(e.code === 'Escape') {
                    document.activeElement.blur();
                }
                return;
            }
            keysRef.current[e.code] = true;
            
            // Break ANY animation state on movement input
            if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                if (emoteRef.current.type) { // If any emote is active
                    emoteRef.current.type = null;
                    // Reset visuals immediately
                    if (playerRef.current && playerRef.current.children[0]) {
                        const m = playerRef.current.children[0];
                        m.position.y = 1;
                        m.rotation.x = 0;
                    }
                }
            }

            if(e.code === 'KeyE') setShowEmoteWheel(true);
            if(e.code === 'Enter') {
                 const input = document.getElementById('chat-input-field');
                 if(input) input.focus();
            }
        };
        const handleUp = (e) => {
            keysRef.current[e.code] = false;
            if(e.code === 'KeyE') setShowEmoteWheel(false);
        };
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        
        // --- GAME LOOP ---
        const update = () => {
            reqRef.current = requestAnimationFrame(update);
            
            const delta = clock.getDelta();
            const time = clock.getElapsedTime(); 
            
            // --- PLAYER UPDATE ---
            const speed = 10 * delta; 
            const rotSpeed = 2 * delta; 
            let moving = false;
            
            if (!emoteRef.current.type) {
                if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) {
                    velRef.current.z = Math.cos(rotRef.current) * speed;
                    velRef.current.x = Math.sin(rotRef.current) * speed;
                    moving = true;
                } else if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) {
                    velRef.current.z = -Math.cos(rotRef.current) * speed;
                    velRef.current.x = -Math.sin(rotRef.current) * speed;
                    moving = true;
                } else {
                    velRef.current.x = 0;
                    velRef.current.z = 0;
                }
                
                if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) rotRef.current += rotSpeed;
                if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) rotRef.current -= rotSpeed;
            } else {
                velRef.current.x = 0;
                velRef.current.z = 0;
            }
            
            // Collision Check (Simplified for grid)
            const nextX = posRef.current.x + velRef.current.x;
            const nextZ = posRef.current.z + velRef.current.z;
            const gridX = Math.floor((nextX + BUILDING_SCALE/2) / BUILDING_SCALE);
            const gridZ = Math.floor((nextZ + BUILDING_SCALE/2) / BUILDING_SCALE);
            
            let collided = false;
            if (gridX >= 0 && gridX < CITY_SIZE && gridZ >= 0 && gridZ < CITY_SIZE) {
                const type = mapRef.current[gridX][gridZ];
                // Removed type 3 collision check as water is removed
                if (type === 1) collided = true; 
            } else {
                collided = true;
            }
            
            if (!collided) {
                posRef.current.x = nextX;
                posRef.current.z = nextZ;
            }
            
            // Apply Transform
            if (playerRef.current) {
                playerRef.current.position.set(posRef.current.x, posRef.current.y, posRef.current.z);
                playerRef.current.rotation.y = rotRef.current;
            }
            
            // Helper to animate any penguin mesh
            const animateMesh = (meshWrapper, isMoving, emoteType, emoteStartTime) => {
                if (!meshWrapper || !meshWrapper.children[0]) return;
                const meshInner = meshWrapper.children[0];
                const flipperL = meshInner.getObjectByName('flipper_l');
                const flipperR = meshInner.getObjectByName('flipper_r');
                const head = meshInner.getObjectByName('head');
                const hatPart = meshInner.getObjectByName('hat');
                const eyesPart = meshInner.getObjectByName('eyes');
                const mouthPart = meshInner.getObjectByName('mouth');
                const footL = meshInner.getObjectByName('foot_l');
                const footR = meshInner.getObjectByName('foot_r');
                
                // Reset defaults
                if(flipperL) { flipperL.rotation.set(0,0,0); }
                if(flipperR) { flipperR.rotation.set(0,0,0); }
                meshInner.position.y = 1;
                meshInner.rotation.z = 0;
                meshInner.rotation.y = 0;
                meshInner.rotation.x = 0;
                if(footL) { footL.rotation.x = 0; }
                if(footR) { footR.rotation.x = 0; }
                if(head) { head.rotation.x = 0; }
                if(hatPart) { hatPart.rotation.x = 0; }
                if(eyesPart) { eyesPart.rotation.x = 0; }
                if(mouthPart) { mouthPart.rotation.x = 0; }

                if (emoteType) {
                    const eTime = (Date.now() - emoteStartTime) * 0.001;
                    
                    if (emoteType === 'Wave') {
                        if(flipperR) {
                            flipperR.rotation.z = -Math.PI / 1.25; 
                            flipperR.rotation.x = Math.sin(eTime * 10) * 0.5; 
                        }
                    } 
                    else if (emoteType === 'Dance') {
                        meshInner.rotation.y = eTime * 6; 
                        meshInner.position.y = 1 + Math.abs(Math.sin(eTime * 5)) * 1; 
                        if(flipperL) flipperL.rotation.z = Math.sin(eTime * 10) * 1;
                        if(flipperR) flipperR.rotation.z = -Math.sin(eTime * 10) * 1;
                    }
                    else if (emoteType === 'Sit') {
                        meshInner.position.y = 0.6; // Sit butt on ground
                        if(footL) footL.rotation.x = -Math.PI / 2;
                        if(footR) footR.rotation.x = -Math.PI / 2;
                        if(flipperL) flipperL.rotation.z = 0.5;
                        if(flipperR) flipperR.rotation.z = -0.5;
                    }
                    else if (emoteType === 'Laugh') {
                          const laughRot = -0.5 + Math.sin(eTime * 20) * 0.2; 
                          if(head) head.rotation.x = laughRot;
                          if(hatPart) hatPart.rotation.x = laughRot;
                          if(eyesPart) eyesPart.rotation.x = laughRot;
                          if(mouthPart) mouthPart.rotation.x = laughRot;
                          meshInner.rotation.x = -0.2;
                          meshInner.position.y = 1 + Math.abs(Math.sin(eTime * 15)) * 0.1;
                    }
                    
                    // Stop non-sit animations automatically after 3 seconds
                    if (emoteType !== 'Sit' && eTime > 3) {
                        if (playerRef.current === meshWrapper) {
                            emoteRef.current.type = null;
                        }
                    }
                } else if (isMoving) {
                    const walkCycle = time * 10;
                    if(footL) footL.rotation.x = Math.sin(walkCycle) * 0.5;
                    if(footR) footR.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
                    if(flipperL) flipperL.rotation.x = Math.sin(walkCycle) * 0.5;
                    if(flipperR) flipperR.rotation.x = -Math.sin(walkCycle) * 0.5;
                    meshInner.rotation.z = Math.sin(time * 8) * 0.05; 
                } else {
                    meshInner.rotation.z = Math.sin(time * 1.5) * 0.02;
                }
            };

            // Animate Player
            if (playerRef.current) {
                animateMesh(playerRef.current, moving, emoteRef.current.type, emoteRef.current.startTime);
            }
            
            // --- AI UPDATE LOOP ---
            const now = Date.now();
            aiAgentsRef.current.forEach(ai => {
                let aiMoving = false;
                
                // === CHATTING STATE ===
                if (ai.action === 'chatting') {
                    // Face partner
                    if (ai.conversationPartner) {
                        const partner = aiAgentsRef.current.find(a => a.id === ai.conversationPartner);
                        if (partner) {
                            ai.mesh.lookAt(partner.pos.x, 0, partner.pos.z);
                        }
                    }

                    if (ai.conversationTurn) {
                        // My turn to speak
                        if (!ai.bubble) {
                            const script = ai.conversationScript;
                            const line = script[ai.conversationLineIdx];
                            
                            if (line) {
                                const bubble = createChatSprite(line);
                                ai.mesh.add(bubble);
                                ai.bubble = bubble;
                                ai.bubbleTimer = now + 3500; // Speak for 3.5s
                                
                                // Talk animation
                                ai.emoteType = 'Wave'; // Little wave while talking
                                ai.emoteStart = now;
                            } else {
                                // Conversation Over for me
                                ai.action = 'idle';
                                ai.conversationCooldown = now + 10000;
                                ai.conversationPartner = null;
                                ai.emoteType = null;
                            }
                        } else if (now > ai.bubbleTimer) {
                            // Finished speaking line
                            ai.mesh.remove(ai.bubble);
                            ai.bubble = null;
                            ai.conversationTurn = false;
                            
                            // Pass turn to partner
                            const partner = aiAgentsRef.current.find(a => a.id === ai.conversationPartner);
                            if (partner) {
                                partner.conversationTurn = true;
                                partner.conversationLineIdx++;
                            }
                            
                            // Check if I'm done entirely
                            if (ai.conversationLineIdx >= ai.conversationScript.length - 2) {
                                 // Celebration emote before leaving
                                 ai.action = 'idle';
                                 ai.emoteType = 'Laugh';
                                 ai.emoteStart = now;
                                 ai.actionTimer = now + 2000; // Laugh duration
                                 ai.conversationCooldown = now + 15000;
                            }
                        }
                    } else {
                        // Partner's turn, just listen (idle look)
                        ai.emoteType = null;
                    }
                }
                
                // === IDLE/DECISION STATE ===
                else if (now > ai.actionTimer) {
                    
                    // 1. Check for Social Interaction (if cooldown is over)
                    let foundPartner = null;
                    if (now > ai.conversationCooldown) {
                        for(let other of aiAgentsRef.current) {
                            if (other.id !== ai.id && other.action === 'idle' && now > other.conversationCooldown) {
                                const dx = other.pos.x - ai.pos.x;
                                const dz = other.pos.z - ai.pos.z;
                                const dist = Math.sqrt(dx*dx + dz*dz);
                                if (dist < 5) {
                                    foundPartner = other;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundPartner) {
                        // Start Conversation
                        const scriptIdx = Math.floor(Math.random() * CONVERSATIONS.length);
                        const script = CONVERSATIONS[scriptIdx];
                        
                        // Setup Self
                        ai.action = 'chatting';
                        ai.conversationPartner = foundPartner.id;
                        ai.conversationScript = script;
                        ai.conversationLineIdx = 0; // Starts first
                        ai.conversationTurn = true;
                        
                        // Setup Partner
                        foundPartner.action = 'chatting';
                        foundPartner.conversationPartner = ai.id;
                        foundPartner.conversationScript = script;
                        foundPartner.conversationLineIdx = 1; // Starts second
                        foundPartner.conversationTurn = false;
                        
                        // Force update partner timer to prevent them walking away
                        foundPartner.actionTimer = now + 999999; 
                        ai.actionTimer = now + 999999;
                    }
                    
                    // 2. Default Actions (Walk/Idle/Emote)
                    else {
                        const r = Math.random();
                        if (r < 0.2) {
                            // Random Emote
                            ai.action = 'idle';
                            ai.emoteType = AI_EMOTES[Math.floor(Math.random() * AI_EMOTES.length)];
                            ai.emoteStart = now;
                            ai.actionTimer = now + 4000; 
                        }
                        else if (r < 0.7) {
                            // Walk
                            ai.action = 'walk';
                            ai.emoteType = null;
                            const angle = Math.random() * Math.PI * 2;
                            const cx = (CITY_SIZE/2 * BUILDING_SCALE);
                            const cz = (CITY_SIZE/2 * BUILDING_SCALE);
                            const tx = cx + (Math.random()-0.5) * 60;
                            const tz = cz + (Math.random()-0.5) * 60;
                            ai.target = { x: tx, z: tz };
                            ai.actionTimer = now + 4000 + Math.random() * 4000;
                        }
                        else {
                            // Just Stand
                            ai.action = 'idle';
                            ai.emoteType = null;
                            ai.actionTimer = now + 2000 + Math.random() * 2000;
                        }
                    }
                }
                
                // === MOVEMENT EXECUTION ===
                if (ai.action === 'walk' && ai.target) {
                    const dx = ai.target.x - ai.pos.x;
                    const dz = ai.target.z - ai.pos.z;
                    const dist = Math.sqrt(dx*dx + dz*dz);
                    
                    if (dist > 0.5) {
                        const targetRot = Math.atan2(dx, dz);
                        let angleDiff = targetRot - ai.rot;
                        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                        ai.rot += angleDiff * 0.1;
                        
                        const moveSpeed = speed * 0.6; 
                        
                        // Calculate next position
                        const nextX = ai.pos.x + Math.sin(ai.rot) * moveSpeed;
                        const nextZ = ai.pos.z + Math.cos(ai.rot) * moveSpeed;

                        // AI Collision Check
                        const gridX = Math.floor((nextX + BUILDING_SCALE/2) / BUILDING_SCALE);
                        const gridZ = Math.floor((nextZ + BUILDING_SCALE/2) / BUILDING_SCALE);
                        
                        let collided = false;
                        if (gridX >= 0 && gridX < CITY_SIZE && gridZ >= 0 && gridZ < CITY_SIZE) {
                            const type = mapRef.current[gridX][gridZ];
                            if (type === 1) collided = true; // Building or Water
                        } else {
                            collided = true; // Out of bounds
                        }

                        if (!collided) {
                            ai.pos.x = nextX;
                            ai.pos.z = nextZ;
                            aiMoving = true;
                        } else {
                            // Hit obstacle, stop walking and think of something else
                            ai.action = 'idle';
                            ai.actionTimer = now + 1000;
                        }
                    } else {
                        ai.action = 'idle';
                    }
                }
                
                // Sync Mesh
                ai.mesh.position.set(ai.pos.x, 0, ai.pos.z);
                if (ai.action !== 'chatting') ai.mesh.rotation.y = ai.rot;
                
                animateMesh(ai.mesh, aiMoving, ai.emoteType, ai.emoteStart);
            });

            // Butterfly Animation
            butterflyGroup.children.forEach(b => {
                 const speed = b.userData.speed * 0.5; 
                 b.position.y = 2 + Math.sin(time * speed * 20 + b.userData.yOffset) * 1;
                 const wings = b.children;
                 wings[0].rotation.z = Math.sin(time * 15) * 0.5;
                 wings[1].rotation.z = -Math.sin(time * 15) * 0.5;
                 b.position.x = b.userData.center.x + Math.cos(time * speed * 5) * 3;
                 b.position.z = b.userData.center.z + Math.sin(time * speed * 5) * 3;
                 b.lookAt(b.userData.center.x, b.position.y, b.userData.center.z);
            });

            // Camera
            const offset = camera.position.clone().sub(controls.target);
            const targetPos = new THREE.Vector3(posRef.current.x, 1, posRef.current.z);
            camera.position.copy(targetPos).add(offset);
            controls.target.copy(targetPos);
            controls.update();
            
            renderer.render(scene, camera);
        };
        update();
        
        return () => {
            cancelAnimationFrame(reqRef.current);
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
            if(rendererRef.current && mountRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, [penguinData]);
    
    const triggerEmote = (type) => {
        emoteRef.current = { type, startTime: Date.now() };
        setShowEmoteWheel(false);
    };
    
    // Watch for chat updates to create sprites
    useEffect(() => {
        if (!activeBubble || !playerRef.current) return;
        
        // Remove old bubble if exists
        if (bubbleSpriteRef.current) {
            playerRef.current.remove(bubbleSpriteRef.current);
        }
        
        // Create new sprite
        const sprite = createChatSprite(activeBubble);
        playerRef.current.add(sprite);
        bubbleSpriteRef.current = sprite;
        
        const timeout = setTimeout(() => {
            if (playerRef.current && bubbleSpriteRef.current) {
                playerRef.current.remove(bubbleSpriteRef.current);
                bubbleSpriteRef.current = null;
                setActiveBubble(null);
            }
        }, 5000);
        
        return () => clearTimeout(timeout);
    }, [activeBubble]);
    
    const sendChat = () => {
        if(!chatInput.trim()) return;
        setActiveBubble(chatInput);
        setChatInput("");
    };
    
    return (
        <div className="relative w-full h-full bg-black">
             <div ref={mountRef} className="absolute inset-0" />
             
             {/* UI Overlay */}
             <div className="absolute top-4 left-4 retro-text text-white drop-shadow-md z-10 pointer-events-none">
                 <h2 className="text-2xl text-yellow-400">CLUB WORLD</h2>
                 <p className="text-xs opacity-70">WASD to Move • Hold E for Emotes • Mouse to Orbit</p>
             </div>

             <div className="absolute bottom-4 left-4 right-4 flex gap-2 pointer-events-auto z-20">
                  <input 
                    id="chat-input-field"
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                        if(e.key === 'Enter') sendChat();
                        if(e.key === 'Escape') e.target.blur();
                    }}
                    placeholder="Press Enter to chat..."
                    className="flex-1 bg-black/50 border-2 border-white/30 rounded-full px-4 py-2 text-white retro-text text-xs focus:outline-none focus:border-yellow-400 backdrop-blur-sm"
                  />
                  <button onClick={sendChat} className="bg-yellow-500 text-black px-4 rounded-full retro-text text-xs hover:bg-yellow-400">
                      <IconSend size={16}/>
                  </button>
             </div>

             <button 
                className="absolute top-4 right-4 bg-red-600 hover:bg-red-500 text-white p-2 rounded retro-text text-xs z-20 pointer-events-auto"
                onClick={onExit}
             >
                EXIT WORLD
             </button>
             
             {/* Emote Wheel */}
             {showEmoteWheel && (
                 <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50 backdrop-blur-sm animate-fade-in">
                     <div className="relative w-64 h-64 rounded-full border-4 border-white/20 bg-black/80 flex items-center justify-center">
                         <div className="absolute top-4 text-center w-full retro-text text-yellow-400 text-xs">EMOTES</div>
                         
                         {/* Radial Buttons */}
                         <button className="absolute top-12 hover:scale-110 transition-transform p-3 bg-blue-500 rounded-full border-2 border-white" onClick={() => triggerEmote('Wave')}>👋</button>
                         <button className="absolute bottom-12 hover:scale-110 transition-transform p-3 bg-green-500 rounded-full border-2 border-white" onClick={() => triggerEmote('Dance')}>💃</button>
                         <button className="absolute left-4 hover:scale-110 transition-transform p-3 bg-purple-500 rounded-full border-2 border-white" onClick={() => triggerEmote('Sit')}>🧘</button>
                         <button className="absolute right-4 hover:scale-110 transition-transform p-3 bg-red-500 rounded-full border-2 border-white" onClick={() => triggerEmote('Laugh')}>😂</button>
                         
                         <div className="text-white text-xs text-center opacity-50 retro-text">Select<br/>Animation</div>
                     </div>
                 </div>
             )}
        </div>
    );
};

// --- 3. DESIGNER COMPONENT ---

function VoxelPenguinDesigner({ onEnterWorld, currentData, updateData }) {
    const mountRef = useRef(null);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);
    
    // We lift state up or use props if provided, else defaults
    const [skinColor, setSkinColor] = useState(currentData?.skin || 'blue');
    const [hat, setHat] = useState(currentData?.hat || 'none');
    const [eyes, setEyes] = useState(currentData?.eyes || 'normal');
    const [mouth, setMouth] = useState(currentData?.mouth || 'beak');
    const [bodyItem, setBodyItem] = useState(currentData?.bodyItem || 'none');
    
    // Sync back to parent
    useEffect(() => {
        if(updateData) updateData({skin: skinColor, hat, eyes, mouth, bodyItem});
    }, [skinColor, hat, eyes, mouth, bodyItem, updateData]);

    const sceneRef = useRef(null);
    const penguinRef = useRef(null);
    const reflectionRef = useRef(null); 
    const particlesRef = useRef([]);
    const lasersRef = useRef([]); 
    const timeRef = useRef(0);
    const spinRef = useRef(0); 
    const reqRef = useRef(null);
    const rendererRef = useRef(null);

    // --- SCRIPT LOADING ---
    useEffect(() => {
        const loadScripts = async () => {
            if (window.THREE && window.THREE.OrbitControls) {
                setScriptsLoaded(true);
                return;
            }

            if (!window.THREE) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }

            if (!window.THREE.OrbitControls) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                });
            }
            
            setScriptsLoaded(true);
        };

        loadScripts().catch(console.error);
    }, []);

    // --- 3D SCENE SETUP ---
    const backgroundData = useMemo(() => {
        const items = [];
        // Floor (Checkerboard)
        for(let x=-12; x<=12; x++) {
            for(let z=-12; z<=12; z++) {
                const color = (x+z)%2===0 ? PALETTE.floorLight : PALETTE.floorDark;
                items.push({ type: 'box', x, y: -8, z, w: 1, h: 1, d: 1, c: color });
            }
        }
        // Pedestal (Wood)
        items.push({ type: 'box', x: 0, y: -7.5, z: 0, w: 8, h: 2, d: 8, c: PALETTE.wood });
        items.push({ type: 'box', x: 0, y: -6.5, z: 0, w: 6, h: 1, d: 6, c: PALETTE.gold });
        // Back Wall / Mirror Frame
        items.push({ type: 'box', x: 0, y: 5, z: -10, w: 22, h: 26, d: 2, c: PALETTE.wood });
        // Mirror Surface
        items.push({ type: 'box', x: 0, y: 5, z: -9, w: 18, h: 22, d: 1, c: '#E0F7FA' });
        // Red Carpet/Rug
        for(let z=0; z<12; z++) items.push({ type: 'box', x: 0, y: -7.4, z: z, w: 4, h: 0.2, d: 1, c: PALETTE.rug });
        return items;
    }, []);

    // Scene Init
    useEffect(() => {
        if (!scriptsLoaded || !mountRef.current) return;

        const THREE = window.THREE;

        // Init Scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color('#2c3e50');
        scene.fog = new THREE.Fog('#2c3e50', 20, 60);
        
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(20, 20, 30);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        scene.add(dirLight);
        
        const warmLight = new THREE.PointLight(0xFFDDAA, 1.2, 50);
        warmLight.position.set(0, 15, 5);
        scene.add(warmLight);
        
        const rimLight = new THREE.SpotLight(0x4455ff, 1.5);
        rimLight.position.set(-20, 10, -10);
        scene.add(rimLight);

        // Controls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.minDistance = 15;
        controls.maxDistance = 60;
        controls.target.set(0, 5, 0);

        // Grid (Subtle)
        const gridHelper = new THREE.GridHelper(100, 100, 0x333333, 0x222222);
        gridHelper.position.y = -8;
        scene.add(gridHelper);
        
        // Background
        const bgGroup = new THREE.Group();
        const colorBatches = {};
        backgroundData.forEach(item => {
            const key = item.c;
            if(!colorBatches[key]) colorBatches[key] = [];
            colorBatches[key].push(item);
        });

        Object.keys(colorBatches).forEach(color => {
            const items = colorBatches[color];
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshStandardMaterial({ color: color });
            const mesh = new THREE.InstancedMesh(geo, mat, items.length);
            mesh.receiveShadow = true;
            
            const dummy = new THREE.Object3D();
            items.forEach((item, i) => {
                dummy.position.set(item.x * (item.w === 1 ? VOXEL_SIZE * 2 : 1), item.y, item.z * (item.w === 1 ? VOXEL_SIZE * 2 : 1));
                dummy.scale.set(item.w, item.h, item.d);
                if (item.w === 1 && item.h === 1 && item.d === 1) {
                     dummy.position.set(item.x * 2, item.y, item.z * 2);
                     dummy.scale.set(2, 1, 2); 
                } else {
                     dummy.position.set(item.x, item.y, item.z);
                     dummy.scale.set(item.w, item.h, item.d);
                }
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
            });
            bgGroup.add(mesh);
        });
        scene.add(bgGroup);

        // Character Group
        const penguinGroup = new THREE.Group();
        scene.add(penguinGroup);
        penguinRef.current = penguinGroup;
        
        // Reflection Group (Mirror)
        const reflectionGroup = new THREE.Group();
        reflectionGroup.scale.set(1, 1, -1);
        reflectionGroup.position.set(0, 0, -18); // Mirror is at -9, so reflection is -18
        scene.add(reflectionGroup);
        reflectionRef.current = reflectionGroup;

        // Animation Loop
        const animate = () => {
            reqRef.current = requestAnimationFrame(animate);
            timeRef.current += 0.02;
            controls.update();

            // Idle Bobbing & Spin
            if (penguinRef.current) {
                if (spinRef.current > 0) {
                    penguinRef.current.rotation.y += 0.2;
                    spinRef.current -= 0.2;
                    penguinRef.current.position.y = Math.sin(timeRef.current * 10) * 0.5; // Jump while spinning
                } else {
                    penguinRef.current.rotation.y = THREE.MathUtils.lerp(penguinRef.current.rotation.y, 0, 0.1);
                    penguinRef.current.position.y = Math.sin(timeRef.current * 2) * 0.2;
                }
                
                if (reflectionRef.current) {
                    reflectionRef.current.position.y = penguinRef.current.position.y;
                    reflectionRef.current.rotation.y = penguinRef.current.rotation.y;
                }
            }

            const propeller = scene.getObjectByName('propeller_blades');
            if (propeller) propeller.rotation.y += 0.3;
            
            const mirrorPropeller = reflectionGroup.getObjectByName('propeller_blades');
            if (mirrorPropeller) mirrorPropeller.rotation.y += 0.3;

            particlesRef.current.forEach((p, i) => {
                p.mesh.position.y += p.speed;
                p.mesh.position.x += Math.sin(timeRef.current + i) * 0.02;
                p.life -= 0.01;
                const scale = 1 - p.life;
                p.mesh.scale.set(scale, scale, scale);
                p.mesh.material.opacity = p.life;
                if (p.life <= 0) {
                    p.mesh.position.set(p.origin.x, p.origin.y, p.origin.z);
                    p.life = 1;
                }
            });

            if (lasersRef.current.length > 0) {
                const intensity = 1 + Math.sin(timeRef.current * 10) * 0.5;
                lasersRef.current.forEach(l => {
                    l.intensity = intensity;
                });
            }

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            cancelAnimationFrame(reqRef.current);
            if (rendererRef.current && mountRef.current) {
                mountRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, [scriptsLoaded, backgroundData]);

    // --- REBUILD PENGUIN ---
    useEffect(() => {
        if (!scriptsLoaded || !sceneRef.current || !penguinRef.current) return;
        
        spinRef.current = Math.PI * 2;
        const THREE = window.THREE;
        const group = penguinRef.current;
        const mirrorGroup = reflectionRef.current;
        
        while(group.children.length > 0) group.remove(group.children[0]); 
        if (mirrorGroup) while(mirrorGroup.children.length > 0) mirrorGroup.remove(mirrorGroup.children[0]);
        
        particlesRef.current = [];
        lasersRef.current = [];

        function buildVoxelPart(voxelData, colorPalette, offset = {x:0, y:0, z:0}) {
            const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
            const partGroup = new THREE.Group();
            const colorBatches = {};
            voxelData.forEach(v => {
                const colorHex = colorPalette[v.c] || v.c; 
                if (!colorBatches[colorHex]) colorBatches[colorHex] = [];
                const matrix = new THREE.Matrix4();
                matrix.setPosition(
                    (v.x + offset.x) * VOXEL_SIZE,
                    (v.y + offset.y) * VOXEL_SIZE,
                    (v.z + offset.z) * VOXEL_SIZE
                );
                if (v.scaleY) matrix.scale(new THREE.Vector3(1, v.scaleY, 1));
                colorBatches[colorHex].push(matrix);
            });

            Object.keys(colorBatches).forEach(color => {
                const count = colorBatches[color].length;
                const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ 
                    color: new THREE.Color(color),
                    roughness: 0.3,
                    metalness: 0.1,
                }), count);
                colorBatches[color].forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
                mesh.instanceMatrix.needsUpdate = true;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                partGroup.add(mesh);
            });
            return partGroup;
        }

        const bodyVoxels = generateBaseBody(PALETTE[skinColor] || skinColor);
        const headVoxels = generateHead(PALETTE[skinColor] || skinColor);
        const flippersLeft = generateFlippers(PALETTE[skinColor] || skinColor, true);
        const flippersRight = generateFlippers(PALETTE[skinColor] || skinColor, false);
        const feetVoxels = generateFeet();

        const hatVoxels = ASSETS.HATS[hat] || [];
        const eyeVoxels = ASSETS.EYES[eyes] || [];
        const mouthVoxels = ASSETS.MOUTH[mouth] || [];
        const bodyItemVoxels = ASSETS.BODY[bodyItem] || [];

        const addPart = (voxels, name) => {
            const partGroup = buildVoxelPart(voxels, PALETTE);
            partGroup.name = name;
            group.add(partGroup);
            if (mirrorGroup) {
                const mirrorPart = partGroup.clone();
                mirrorGroup.add(mirrorPart);
            }
        };

        addPart(bodyVoxels, 'body');
        addPart(headVoxels, 'head');
        addPart(flippersLeft, 'flipper_l');
        addPart(flippersRight, 'flipper_r');
        addPart(feetVoxels, 'feet');
        addPart(hatVoxels, 'hat');
        addPart(eyeVoxels, 'eyes');
        addPart(mouthVoxels, 'mouth');
        addPart(bodyItemVoxels, 'accessory');

        if (hat === 'propeller') {
            const blades = new THREE.Group();
            blades.name = 'propeller_blades';
            blades.position.set(0, 13 * VOXEL_SIZE, 0); 
            const bladeGeo = new THREE.BoxGeometry(4, 0.2, 0.5);
            const bladeMat = new THREE.MeshStandardMaterial({color: 'red'});
            const b1 = new THREE.Mesh(bladeGeo, bladeMat);
            const b2 = new THREE.Mesh(bladeGeo, bladeMat);
            b2.rotation.y = Math.PI / 2;
            blades.add(b1, b2);
            group.add(blades);
            if (mirrorGroup) mirrorGroup.add(blades.clone());
        }

        if (mouth === 'cigarette' || mouth === 'pipe') {
            const tipX = mouth === 'pipe' ? 2 * VOXEL_SIZE : 4.5 * VOXEL_SIZE;
            const tipY = mouth === 'pipe' ? 6 * VOXEL_SIZE : 5.5 * VOXEL_SIZE;
            const tipZ = mouth === 'pipe' ? 6 * VOXEL_SIZE : 5.5 * VOXEL_SIZE;
            for(let i=0; i<10; i++) {
                const pGeo = new THREE.BoxGeometry(0.2, 0.2, 0.2);
                const pMat = new THREE.MeshBasicMaterial({color: 0xaaaaaa, transparent: true});
                const pMesh = new THREE.Mesh(pGeo, pMat);
                pMesh.position.set(tipX, tipY, tipZ);
                group.add(pMesh);
                if(mirrorGroup) mirrorGroup.add(pMesh.clone());
                particlesRef.current.push({
                    mesh: pMesh,
                    life: Math.random(),
                    speed: 0.05 + Math.random() * 0.05,
                    origin: {x: tipX, y: tipY, z: tipZ}
                });
            }
        }

        if (eyes === 'laser') {
            const lightLeft = new THREE.PointLight(0xff0000, 1, 10);
            lightLeft.position.set(-2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 5 * VOXEL_SIZE);
            const lightRight = new THREE.PointLight(0xff0000, 1, 10);
            lightRight.position.set(2 * VOXEL_SIZE, 7 * VOXEL_SIZE, 5 * VOXEL_SIZE);
            lasersRef.current.push(lightLeft, lightRight);
            group.add(lightLeft, lightRight);
            if (mirrorGroup) {
                 mirrorGroup.add(lightLeft.clone());
                 mirrorGroup.add(lightRight.clone());
            }
        }
        
        if (hat === 'halo') {
             const light = new THREE.PointLight(0xFFD700, 1, 5);
             light.position.set(0, 14 * VOXEL_SIZE, 0);
             group.add(light);
             if (mirrorGroup) mirrorGroup.add(light.clone());
        }

    }, [scriptsLoaded, skinColor, hat, eyes, mouth, bodyItem]);

    const options = {
        skin: Object.keys(PALETTE).filter(k => !['floorLight','floorDark','wood','rug','glass','beerGold','mirrorFrame','mirrorGlass', 'asphalt', 'roadLine', 'buildingBrickRed', 'buildingBrickYellow', 'buildingBrickBlue', 'windowLight', 'windowDark', 'grass', 'snow', 'water', 'waterDeep', 'butterfly1', 'butterfly2', 'butterfly3'].includes(k) && !k.startsWith('tie') && !k.startsWith('shirt') && !k.startsWith('camo') && !k.startsWith('jeans')),
        head: Object.keys(ASSETS.HATS),
        eyes: Object.keys(ASSETS.EYES),
        mouth: Object.keys(ASSETS.MOUTH),
        body: Object.keys(ASSETS.BODY)
    };
    
    const cycle = (current, list, setter, dir) => {
        const idx = list.indexOf(current);
        let nextIdx = idx + dir;
        if(nextIdx < 0) nextIdx = list.length - 1;
        if(nextIdx >= list.length) nextIdx = 0;
        setter(list[nextIdx]);
    };

    return (
        <div className="relative w-full h-full bg-gray-900 overflow-hidden font-sans">
            <div ref={mountRef} className="absolute inset-0 z-0" />
            
            {/* OVERLAY UI */}
            <div className="absolute top-0 left-0 p-6 z-10 w-full pointer-events-none">
                <h1 className="retro-text text-4xl text-white drop-shadow-lg" style={{textShadow: '4px 4px 0px #000'}}>
                    PENGUIN MAKER <span className="text-yellow-400 text-sm align-top">DELUXE</span>
                </h1>
            </div>

            <div className="absolute bottom-10 right-10 z-10 w-80 pointer-events-auto">
                <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
                    <h2 className="text-white font-bold text-lg mb-2 flex items-center gap-2 sticky top-0 bg-gray-900/50 p-2 rounded backdrop-blur-md z-20">
                        <IconSettings size={20} /> Wardrobe
                    </h2>

                    {/* Skin Color */}
                    <div className="flex flex-col gap-2 text-white">
                        <span className="font-semibold text-xs text-gray-300 uppercase tracking-wider">Feathers ({options.skin.length})</span>
                        <div className="grid grid-cols-6 gap-2">
                            {options.skin.map(c => (
                                <button 
                                    key={c}
                                    onClick={() => setSkinColor(c)}
                                    title={c}
                                    className={`w-8 h-8 rounded-full border-2 ${skinColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70'} transition-all hover:scale-105`}
                                    style={{backgroundColor: PALETTE[c] || c}}
                                />
                            ))}
                        </div>
                    </div>

                    <hr className="border-gray-600/50" />

                    {/* Accessory Controls */}
                    {[
                        { label: `HEADWEAR (${options.head.length})`, val: hat, set: setHat, list: options.head },
                        { label: `EYES (${options.eyes.length})`, val: eyes, set: setEyes, list: options.eyes },
                        { label: `MOUTH (${options.mouth.length})`, val: mouth, set: setMouth, list: options.mouth },
                        { label: `CLOTHING (${options.body.length})`, val: bodyItem, set: setBodyItem, list: options.body },
                    ].map((opt, i) => (
                        <div key={i} className="flex flex-col gap-1">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{opt.label}</span>
                            <div className="flex items-center justify-between bg-black/30 rounded-lg p-1">
                                <button 
                                    className="voxel-btn p-2 text-white hover:text-yellow-400"
                                    onClick={() => cycle(opt.val, opt.list, opt.set, -1)}
                                >
                                    <IconChevronLeft size={20} />
                                </button>
                                <span className="text-white font-medium text-sm capitalize truncate max-w-[120px] text-center">
                                    {opt.val.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <button 
                                    className="voxel-btn p-2 text-white hover:text-yellow-400"
                                    onClick={() => cycle(opt.val, opt.list, opt.set, 1)}
                                >
                                    <IconChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={onEnterWorld}
                        className="mt-4 w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg shadow-lg transform active:scale-95 transition-all retro-text text-xs border-b-4 border-yellow-700 flex justify-center items-center gap-2"
                    >
                        <IconWorld size={16} /> ENTER WORLD
                    </button>
                </div>
            </div>
            
            <div className="absolute bottom-4 left-6 text-white/30 text-xs flex items-center gap-2">
                <IconCamera size={14} /> Click & Drag to Rotate • Scroll to Zoom
            </div>

            {!scriptsLoaded && (
                <div className="absolute inset-0 bg-black flex items-center justify-center text-white retro-text z-50">
                    LOADING ENGINE...
                </div>
            )}
        </div>
    );
}

// --- 4. MAIN APP CONTROLLER ---

const App = () => {
    const [mode, setMode] = useState('designer'); // 'designer' | 'world'
    const [penguinData, setPenguinData] = useState({
        skin: 'blue',
        hat: 'none',
        eyes: 'normal',
        mouth: 'beak',
        bodyItem: 'none'
    });

    return (
        <div className="w-screen h-screen">
             <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;600;800&display=swap');
                .retro-text { font-family: 'Press Start 2P', cursive; }
                .glass-panel {
                    background: rgba(20, 20, 30, 0.85);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                }
                .voxel-btn {
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .voxel-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 0 0 rgba(0,0,0,0.5);
                }
                .voxel-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 0 0 0 rgba(0,0,0,0.5);
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.2s ease-out; }
            `}</style>

            {mode === 'designer' ? (
                <VoxelPenguinDesigner 
                    onEnterWorld={() => setMode('world')} 
                    currentData={penguinData}
                    updateData={setPenguinData}
                />
            ) : (
                <VoxelWorld 
                    penguinData={penguinData} 
                    onExit={() => setMode('designer')} 
                />
            )}
        </div>
    );
};

export default App;