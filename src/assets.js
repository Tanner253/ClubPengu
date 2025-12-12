import { PALETTE } from './constants';

// --- ASSET GENERATORS ---
const makeCap = (color, reverse=false) => {
    const v = [];
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

export const ASSETS = {
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
             v.push({x:0, y:13, z:0, c:'gold'});
             return v;
        })(),
        halo: (() => {
            let v = [];
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z > 12 && x*x+z*z < 18) v.push({x, y:14, z, c: 'gold', glow:true});
            return v;
        })(),
        headphones: (() => {
            let v = [];
            v.push({x:-5, y:8, z:0, c:'black'}, {x:-5, y:9, z:0, c:'black'});
            v.push({x:5, y:8, z:0, c:'black'}, {x:5, y:9, z:0, c:'black'});
            for(let x=-5; x<=5; x++) v.push({x, y:11, z:0, c:'grey'});
            return v;
        })(),
        santa: (() => {
            const v = [];
            for(let x=-5; x<=5; x++) {
                for(let z=-5; z<=5; z++) {
                    const d = x*x + z*z;
                    if(d < 26 && d > 12) {
                        v.push({x, y:10, z, c:'white'});
                    }
                }
            }
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z < 17) v.push({x, y:11, z, c:'red'});
            for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 10) v.push({x, y:12, z, c:'red'});
            for(let x=-2; x<=2; x++) for(let z=-2; z<=2; z++) if(x*x+z*z < 5) v.push({x, y:13, z, c:'red'});
            v.push({x:0, y:14, z:0, c:'red'});
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
        capRed: makeCap('red'), capGreen: makeCap('green'), capBlack: makeCap('black'),
        beanieBlue: makeBeanie('blue'), beanieOrange: makeBeanie('orange'), beaniePink: makeBeanie('pink'),
        capBackwards: makeCap('purple', true),
        sensei: (() => {
            // Conical straw hat (like a rice farmer/sensei hat)
            let v = [];
            // Wide brim
            for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) if(x*x+z*z < 50 && x*x+z*z > 12) v.push({x, y:10, z, c:'#c4a35a'});
            // Cone shape
            for(let y=10; y<14; y++) {
                const r = 5 - (y-10);
                for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) if(x*x+z*z < r*r) v.push({x, y, z, c:'#c4a35a'});
            }
            // Red band
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z < 17 && x*x+z*z > 12) v.push({x, y:11, z, c:'#8b0000'});
            return v;
        })(),
        bobRossAfro: (() => {
            // Big fluffy Bob Ross perm/afro - round and natural
            const v = [];
            const baseColor = '#3D2314'; // Dark brown
            const highlightColor = '#5C3A21'; // Lighter brown for depth
            
            // Afro sits on head - center around y=11, radius 5
            const centerY = 11;
            const radius = 5;
            
            for(let x = -radius; x <= radius; x++) {
                for(let y = 7; y <= 16; y++) {
                    for(let z = -radius; z <= radius; z++) {
                        // Perfect sphere calculation
                        const dy = y - centerY;
                        const dist = Math.sqrt(x*x + dy*dy + z*z);
                        
                        // Solid sphere with slight surface texture
                        if(dist <= radius) {
                            // Curly texture - alternate colors based on position
                            const isCurl = ((x + y + z) % 2 === 0);
                            v.push({x, y, z, c: isCurl ? highlightColor : baseColor});
                        }
                    }
                }
            }
            
            return v;
        })()
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
        // Scarf - cozy knitted scarf wrapping fully around neck with tail
        scarf: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c) => {
                const key = `${x},${y},${z}`;
                if (!voxelMap.has(key)) voxelMap.set(key, {x, y, z, c});
            };
            
            const scarfColor = '#8B2252';
            const scarfStripe = '#D4A574';
            
            // Full wrap around neck at y=4 - complete circle
            for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) {
                const d = Math.sqrt(x*x+z*z);
                // Ring around neck - full 360 degrees
                if(d > 5.5 && d < 6.8) {
                    const stripe = (x + z) % 5 === 0;
                    addVoxel(x, 4, z, stripe ? scarfStripe : scarfColor);
                }
            }
            
            // Tail hanging down front
            addVoxel(2, 3, 6, scarfColor);
            addVoxel(2, 2, 6.5, scarfStripe);
            addVoxel(2, 1, 7, scarfColor);
            addVoxel(2, 0, 7, scarfColor);
            addVoxel(2, -1, 7.5, scarfStripe);
            addVoxel(2, -2, 7.5, scarfColor);
            
            return Array.from(voxelMap.values());
        })(),
        // Bowtie - sits on front of body at white belly area
        bowtie: [
            {x:0, y:4, z:5.5, c:'red'}, 
            {x:-1, y:4.2, z:5.3, c:'red'}, {x:1, y:4.2, z:5.3, c:'red'},
            {x:-2, y:4.5, z:5, c:'red'}, {x:2, y:4.5, z:5, c:'red'}
        ],
        // Gold Chain - thick Cuban link chain with detailed pendant
        goldChain: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c, glow) => {
                const key = `${x},${y},${z}`;
                if (!voxelMap.has(key)) {
                    const v = {x, y, z, c};
                    if (glow) v.glow = true;
                    voxelMap.set(key, v);
                }
            };
            
            const gold = '#FFD700';       // Bright gold
            const goldDark = '#B8860B';   // Darker gold for depth
            const goldLight = '#FFEC8B';  // Shine highlights
            const diamond = '#E0FFFF';    // Diamond sparkle
            
            // Main chain ring around neck at y=4 - thick with two-tone
            for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d > 5.6 && d < 6.8) {
                    // Outer edge darker, inner brighter for 3D effect
                    const isOuter = d > 6.2;
                    addVoxel(x, 4, z, isOuter ? goldDark : gold);
                }
            }
            
            // Second layer for thickness at y=3 (partial, front only)
            for(let x=-5; x<=5; x++) for(let z=3; z<=6; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d > 5.6 && d < 6.5) {
                    addVoxel(x, 3, z, goldDark);
                }
            }
            
            // Highlight shimmer on top at y=5 (partial)
            for(let x=-4; x<=4; x++) for(let z=4; z<=6; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d > 5.8 && d < 6.3 && (x + z) % 3 === 0) {
                    addVoxel(x, 5, z, goldLight);
                }
            }
            
            // V-chain going down to pendant
            addVoxel(-2, 3, 7, gold);
            addVoxel(2, 3, 7, gold);
            addVoxel(-2, 2, 7, goldDark);
            addVoxel(2, 2, 7, goldDark);
            addVoxel(-1, 1, 7, gold);
            addVoxel(1, 1, 7, gold);
            addVoxel(0, 0, 7, goldDark);
            addVoxel(0, -1, 7, gold);
            
            // Large medallion pendant
            const py = -3; // pendant center y
            const pz = 8;  // pendant z
            
            // Outer ring of medallion
            for(let mx=-2; mx<=2; mx++) for(let my=-2; my<=2; my++) {
                const d = Math.sqrt(mx*mx + my*my);
                if(d >= 1.5 && d <= 2.5) {
                    addVoxel(mx, py + my, pz, gold);
                }
            }
            
            // Inner medallion disc
            addVoxel(-1, py, pz, goldDark);
            addVoxel(1, py, pz, goldDark);
            addVoxel(0, py - 1, pz, goldDark);
            addVoxel(0, py + 1, pz, goldDark);
            
            // Center diamond
            addVoxel(0, py, pz + 1, diamond, true);
            
            // Diamond facet sparkles
            addVoxel(0, py + 1, pz + 1, goldLight);
            addVoxel(0, py - 1, pz + 1, goldLight);
            
            // Medallion back plate for depth
            for(let mx=-1; mx<=1; mx++) for(let my=-1; my<=1; my++) {
                addVoxel(mx, py + my, pz - 1, goldDark);
            }
            
            return Array.from(voxelMap.values());
        })(),
        // Tie - hangs from neck down front of body
        tie: [
             {x:0, y:4, z:5.5, c:'red'}, {x:0, y:3, z:5.8, c:'red'}, 
             {x:0, y:2, z:6, c:'red'}, {x:0, y:1, z:6, c:'red'},
             {x:0, y:0, z:6, c:'red'}, {x:-0.5, y:-0.5, z:5.8, c:'red'}, {x:0.5, y:-0.5, z:5.8, c:'red'}
        ],
        // White Shirt - wraps around body as outer layer (radius 6-7)
        shirtWhite: (() => {
             let v = [];
             for(let y=-4; y<4; y++) {
                 // Body radius varies with y: larger at middle, smaller at top/bottom
                 const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                 const innerR = bodyRadius;
                 const outerR = bodyRadius + 1.2;
                 for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                     const d = Math.sqrt(x*x+z*z);
                     // Wrap around body, but not on belly (front where z > 2)
                     if(d >= innerR && d <= outerR && !(z > 3 && x > -3 && x < 3)) {
                         v.push({x,y,z,c:'white'});
                     }
                 }
             }
             return v;
        })(),
        // Black Shirt - same as white but black color
        shirtBlack: (() => {
             let v = [];
             for(let y=-4; y<4; y++) {
                 const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                 const innerR = bodyRadius;
                 const outerR = bodyRadius + 1.2;
                 for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                     const d = Math.sqrt(x*x+z*z);
                     if(d >= innerR && d <= outerR && !(z > 3 && x > -3 && x < 3)) {
                         v.push({x,y,z,c:'#222'});
                     }
                 }
             }
             return v;
        })(),
        // Overalls - wraps around lower body
        overalls: (() => {
             let v = [];
             for(let y=-6; y<1; y++) {
                 const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.9));
                 const innerR = bodyRadius;
                 const outerR = bodyRadius + 1.2;
                 for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                     const d = Math.sqrt(x*x+z*z);
                     if(d >= innerR && d <= outerR) {
                         v.push({x,y,z,c:'blue'});
                     }
                 }
             }
             // Straps going up the front
             v.push({x:-2, y:1, z:5.5, c:'blue'}, {x:2, y:1, z:5.5, c:'blue'});
             v.push({x:-2, y:2, z:5.2, c:'blue'}, {x:2, y:2, z:5.2, c:'blue'});
             v.push({x:-2, y:3, z:5, c:'blue'}, {x:2, y:3, z:5, c:'blue'});
             // Buckles
             v.push({x:-2, y:3, z:5.3, c:'gold'}, {x:2, y:3, z:5.3, c:'gold'});
             return v;
        })(),
        // Bikini - small accent pieces on body surface
        bikini: [
             {x:-2, y:1, z:5.8, c:'pink'}, {x:2, y:1, z:5.8, c:'pink'},
             {x:0, y:-5, z:5.5, c:'pink'}, {x:-1, y:-5, z:5.3, c:'pink'}, {x:1, y:-5, z:5.3, c:'pink'}
        ],
        // Backpack - sits on back of body (negative z)
        backpack: (() => {
             let v = [];
             for(let x=-3; x<=3; x++) for(let y=-2; y<4; y++) {
                 v.push({x, y, z:-6, c:'brown'});
                 v.push({x, y, z:-7, c:'brown'});
             }
             // Straps
             v.push({x:-2, y:4, z:-5, c:'brown'}, {x:2, y:4, z:-5, c:'brown'});
             return v;
        })(),
        // Cape - flows from shoulders down back
        cape: (() => {
             let v = [];
             for(let x=-5; x<=5; x++) for(let y=-7; y<4; y++) {
                 // Cape is attached at shoulders and flows down
                 const depth = y < 0 ? -6 - Math.abs(y)*0.1 : -6;
                 v.push({x, y, z:depth, c:'red'});
             }
             return v;
        })(),
        // Life Vest - wraps around torso as outer layer
        lifevest: (() => {
             let v = [];
             for(let y=-3; y<4; y++) {
                 const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                 const innerR = bodyRadius;
                 const outerR = bodyRadius + 1.5;
                 for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                     const d = Math.sqrt(x*x+z*z);
                     if(d >= innerR && d <= outerR) {
                         v.push({x,y,z,c:'orange'});
                     }
                 }
             }
             return v;
        })(),
        // Guitar - acoustic guitar with detailed body, neck, and strings
        guitar: (() => {
            const voxelMap = new Map(); // Prevent duplicates
            const addVoxel = (x, y, z, c) => {
                const key = `${Math.round(x*2)/2},${Math.round(y*2)/2},${Math.round(z*2)/2}`;
                if (!voxelMap.has(key)) voxelMap.set(key, {x, y, z, c});
            };
            
            const bodyWood = '#8B4513';
            const bodyDark = '#5D3A1A';
            const neck = '#DEB887';
            const soundHole = '#1A1A1A';
            const headstock = '#2F1810';
            const tuners = '#FFD700';
            const strap = '#2F1810';
            
            // Guitar body - figure-8 shape (front face only, no depth layer)
            for(let lx=-2; lx<=2; lx++) for(let ly=-3; ly<=0; ly++) {
                const d = lx*lx + ly*ly;
                if(d <= 5) addVoxel(4+lx, ly-1, 6, bodyWood);
            }
            for(let lx=-2; lx<=2; lx++) for(let ly=0; ly<=2; ly++) {
                const d = lx*lx + ly*ly;
                if(d <= 4) addVoxel(4+lx, ly+1, 6, bodyWood);
            }
            
            // Sound hole
            addVoxel(4, 0, 6.5, soundHole);
            
            // Rosette
            addVoxel(3, 0, 6.3, '#FFD700');
            addVoxel(5, 0, 6.3, '#FFD700');
            
            // Bridge
            addVoxel(4, -2, 6.3, headstock);
            
            // Neck
            for(let ny=3; ny<9; ny++) {
                addVoxel(4, ny, 6, neck);
            }
            
            // Headstock
            addVoxel(4, 9, 6, headstock);
            addVoxel(4, 10, 6, headstock);
            
            // Tuning pegs
            addVoxel(3, 9, 6, tuners);
            addVoxel(3, 10, 6, tuners);
            addVoxel(5, 9, 6, tuners);
            addVoxel(5, 10, 6, tuners);
            
            // Guitar strap
            addVoxel(2, 3, 5, strap);
            addVoxel(1, 4, 4, strap);
            addVoxel(0, 5, 3, strap);
            addVoxel(-1, 5, 2, strap);
            addVoxel(-2, 4, -2, strap);
            addVoxel(-3, 3, -4, strap);
            
            return Array.from(voxelMap.values());
        })(),
        // Sword - elegant knight's sword with detailed hilt and scabbard
        sword: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c, glow) => {
                // Use integer keys to prevent floating point duplicates
                const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                if (!voxelMap.has(key)) {
                    const v = {x: Math.round(x), y: Math.round(y), z: Math.round(z), c};
                    if (glow) v.glow = true;
                    voxelMap.set(key, v);
                }
            };
            
            const blade = '#C0C0C0';
            const hiltGold = '#FFD700';
            const leather = '#4A3728';
            const gem = '#DC143C';
            const scabbard = '#2F1810';
            
            // Scabbard at hip
            for(let y=-5; y<2; y++) {
                addVoxel(8, y, -1, scabbard);
            }
            addVoxel(9, -4, -1, hiltGold); // Metal band
            addVoxel(9, 0, -1, hiltGold);  // Metal band
            
            // Blade
            for(let y=2; y<=10; y++) {
                addVoxel(8, y, 0, blade);
            }
            
            // Crossguard
            addVoxel(8, 2, -2, hiltGold);
            addVoxel(8, 2, -1, hiltGold);
            addVoxel(8, 2, 1, hiltGold);
            addVoxel(8, 2, 2, hiltGold);
            
            // Handle
            addVoxel(8, 1, 0, leather);
            addVoxel(8, 0, 0, leather);
            addVoxel(8, -1, 0, leather);
            
            // Pommel with gem
            addVoxel(8, -2, 0, hiltGold);
            addVoxel(8, -3, 0, gem, true);
            
            // Belt
            addVoxel(7, -4, 0, leather);
            addVoxel(6, -4, 0, hiltGold);
            
            return Array.from(voxelMap.values());
        })(),
        // Paint brush and palette - Bob Ross style artist gear
        paintBrush: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c) => {
                const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                if (!voxelMap.has(key)) {
                    voxelMap.set(key, {x: Math.round(x), y: Math.round(y), z: Math.round(z), c});
                }
            };
            
            const woodHandle = '#8B5A2B';
            const ferrule = '#C0C0C0';
            const bristleBase = '#F5DEB3';
            
            // Paint brush held in right flipper - angled up
            // Handle (wooden)
            for(let i = 0; i < 8; i++) {
                addVoxel(6, i - 2, 5, woodHandle);
            }
            
            // Metal ferrule (silver band where bristles attach)
            addVoxel(6, 6, 5, ferrule);
            addVoxel(6, 7, 5, ferrule);
            
            // Bristles (with paint colors - Titanium White, Phthalo Blue, Van Dyke Brown!)
            const paintColors = ['#FFFFFF', '#1E90FF', '#4A3728', '#228B22', '#8B0000'];
            for(let bx = -1; bx <= 1; bx++) {
                for(let by = 0; by < 3; by++) {
                    const color = paintColors[(bx + by + 2) % paintColors.length];
                    addVoxel(6 + bx, 8 + by, 5, by === 0 ? bristleBase : color);
                }
            }
            // Bristle tip
            addVoxel(6, 11, 5, '#FFFFFF'); // Titanium white on the tip
            
            // Paint palette held in left flipper
            const paletteWood = '#DEB887';
            
            // Oval palette shape
            for(let px = -3; px <= 1; px++) {
                for(let pz = -2; pz <= 2; pz++) {
                    const dist = (px * px) / 4 + (pz * pz) / 3;
                    if(dist < 2.5) {
                        addVoxel(-5 + px, 1, 4 + pz, paletteWood);
                    }
                }
            }
            
            // Thumb hole
            addVoxel(-7, 1, 4, '#1A1A1A');
            
            // Paint blobs on palette
            addVoxel(-5, 1.5, 3, '#FFFFFF');    // Titanium White
            addVoxel(-4, 1.5, 3, '#FFD700');    // Cadmium Yellow
            addVoxel(-6, 1.5, 5, '#1E90FF');    // Phthalo Blue
            addVoxel(-5, 1.5, 5, '#228B22');    // Sap Green
            addVoxel(-4, 1.5, 5, '#8B0000');    // Alizarin Crimson
            addVoxel(-6, 1.5, 3, '#4A3728');    // Van Dyke Brown
            
            return Array.from(voxelMap.values());
        })(),
        // Shield - on left side
        shield: (() => {
             let v = [];
             for(let y=-2; y<3; y++) for(let z=-2; z<3; z++) {
                 v.push({x:-8, y, z, c:'silver'});
             }
             // Shield emblem
             v.push({x:-8.5, y:0, z:0, c:'gold'});
             return v;
        })(),
        // Tutu - skirt around waist at outer body surface
        tutu: (() => {
             let v = [];
             const y = -5;
             const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.9));
             for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                 const d = Math.sqrt(x*x+z*z);
                 if(d > bodyRadius && d < bodyRadius + 3) {
                     v.push({x, y, z, c:'pink'});
                     // Add ruffles in a pattern
                     if((x+z) % 2 === 0) v.push({x, y:-4.5, z, c:'pink'});
                 }
             }
             return v;
        })()
    }
};

