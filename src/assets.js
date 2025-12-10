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
             v.push({x:-2, y:1, z:4, c:'blue'}, {x:2, y:1, z:4, c:'blue'});
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
             {x:2, y:1, z:5.2, c:'black'}
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

