/**
 * Hat Assets - All hat/headwear customization options
 * Contains voxel data for penguin head accessories
 */

import { makeCap, makeBeanie } from './helpers';

export const HATS = {
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
        let v = [];
        for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) if(x*x+z*z < 50 && x*x+z*z > 12) v.push({x, y:10, z, c:'#c4a35a'});
        for(let y=10; y<14; y++) {
            const r = 5 - (y-10);
            for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) if(x*x+z*z < r*r) v.push({x, y, z, c:'#c4a35a'});
        }
        for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z < 17 && x*x+z*z > 12) v.push({x, y:11, z, c:'#8b0000'});
        return v;
    })(),
    bobRossAfro: (() => {
        const v = [];
        const baseColor = '#3D2314';
        const highlightColor = '#5C3A21';
        const centerY = 11;
        const radius = 5;
        for(let x = -radius; x <= radius; x++) {
            for(let y = 7; y <= 16; y++) {
                for(let z = -radius; z <= radius; z++) {
                    const dy = y - centerY;
                    const dist = Math.sqrt(x*x + dy*dy + z*z);
                    if(dist <= radius) {
                        const isCurl = ((x + y + z) % 2 === 0);
                        v.push({x, y, z, c: isCurl ? highlightColor : baseColor});
                    }
                }
            }
        }
        return v;
    })(),
    
    // LEGENDARY: Flaming Crown
    flamingCrown: (() => {
        let v = [];
        for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z > 10 && x*x+z*z < 18) {
            v.push({x, y:10, z, c: '#FFD700'});
            v.push({x, y:11, z, c: '#FFD700'});
            if((x+z)%2===0) v.push({x, y:12, z, c: '#FFD700'});
        }
        v.push({x:0, y:12, z:0, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
        v.push({x:3, y:12, z:0, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
        v.push({x:-3, y:12, z:0, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
        v.push({x:0, y:12, z:3, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
        v.push({x:0, y:12, z:-3, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
        return v;
    })(),
    
    // LEGENDARY: Ice Crown
    iceCrown: (() => {
        let v = [];
        for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z > 10 && x*x+z*z < 18) {
            v.push({x, y:10, z, c: '#87CEEB'});
            v.push({x, y:11, z, c: '#ADD8E6'});
        }
        v.push({x:0, y:12, z:4, c: '#E0FFFF', glow: true});
        v.push({x:0, y:13, z:4, c: '#E0FFFF', glow: true});
        v.push({x:0, y:14, z:4, c: '#FFFFFF', glow: true});
        v.push({x:4, y:12, z:0, c: '#E0FFFF', glow: true});
        v.push({x:4, y:13, z:0, c: '#FFFFFF', glow: true});
        v.push({x:-4, y:12, z:0, c: '#E0FFFF', glow: true});
        v.push({x:-4, y:13, z:0, c: '#FFFFFF', glow: true});
        v.push({x:0, y:12, z:-4, c: '#E0FFFF', glow: true});
        v.push({x:0, y:13, z:-4, c: '#FFFFFF', glow: true});
        return v;
    })(),
    
    // EPIC: Wizard Hat
    wizardHat: (() => {
        let v = [];
        for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) if(x*x+z*z < 40) v.push({x, y:9, z, c:'#4B0082'});
        for(let y=10; y<17; y++) {
            const r = Math.max(1, 5 - (y-10)*0.6);
            for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) if(x*x+z*z < r*r) v.push({x, y, z, c:'#4B0082'});
        }
        v.push({x:2, y:12, z:3, c:'gold', glow: true});
        v.push({x:-1, y:14, z:2, c:'gold', glow: true});
        v.push({x:0, y:16, z:1, c:'gold', glow: true});
        v.push({x:0, y:17, z:0, c:'#FF69B4', glow: true, fx: 'magicTrail', emitter: true});
        return v;
    })(),
    
    // EPIC: Astronaut Helmet
    astronautHelmet: (() => {
        let v = [];
        const centerY = 9;
        const radius = 7;
        for(let x=-radius; x<=radius; x++) {
            for(let z=-radius; z<=radius; z++) {
                for(let y=5; y<=16; y++) {
                    const dy = y - centerY;
                    const d = Math.sqrt(x*x + dy*dy + z*z);
                    if(d >= radius - 1 && d <= radius) {
                        const isFrontFace = z > 2;
                        if(!isFrontFace) {
                            v.push({x, y, z, c:'white'});
                        }
                    }
                }
            }
        }
        for(let x=-5; x<=5; x++) {
            const zOuter = Math.sqrt(Math.max(0, 36 - x*x)) * 0.9;
            if(zOuter > 2) v.push({x, y:13, z: Math.round(zOuter), c:'#FFD700'});
        }
        for(let x=-5; x<=5; x++) {
            const zOuter = Math.sqrt(Math.max(0, 36 - x*x)) * 0.9;
            if(zOuter > 2) v.push({x, y:5, z: Math.round(zOuter), c:'#FFD700'});
        }
        for(let y=5; y<=13; y++) {
            v.push({x:-5, y, z:4, c:'#FFD700'});
            v.push({x:5, y, z:4, c:'#FFD700'});
        }
        v.push({x:-2, y:11, z:6, c:'#AADDFF', glass: true, glow: true});
        v.push({x:2, y:10, z:6, c:'#AADDFF', glass: true, glow: true});
        v.push({x:0, y:8, z:7, c:'#AADDFF', glass: true, glow: true});
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) {
            const d = x*x + z*z;
            if(d > 18 && d < 28) v.push({x, y:4, z, c:'#C0C0C0'});
        }
        v.push({x:-6, y:7, z:-2, c:'#888888'});
        v.push({x:-6, y:8, z:-3, c:'#888888'});
        v.push({x:6, y:7, z:-2, c:'#888888'});
        v.push({x:6, y:8, z:-3, c:'#888888'});
        return v;
    })(),
    
    pirateTricorn: (() => {
        let v = [];
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 28) v.push({x, y:10, z, c:'#2F1810'});
        for(let x=-5; x<=5; x++) v.push({x, y:11, z:-5, c:'#2F1810'});
        for(let z=-5; z<=5; z++) { v.push({x:-5, y:11, z, c:'#2F1810'}); v.push({x:5, y:11, z, c:'#2F1810'}); }
        v.push({x:0, y:11, z:5, c:'white'});
        return v;
    })(),
    
    angelHalo: (() => {
        let v = [];
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z > 16 && x*x+z*z < 26) {
            v.push({x, y:15, z, c:'#FFFACD', glow: true});
        }
        return v;
    })(),
    
    devilHorns: (() => {
        let v = [];
        for(let y=10; y<15; y++) { v.push({x:-3, y, z:0, c:'#8B0000'}); }
        v.push({x:-4, y:14, z:-1, c:'#8B0000'});
        v.push({x:-5, y:15, z:-2, c:'#8B0000'});
        for(let y=10; y<15; y++) { v.push({x:3, y, z:0, c:'#8B0000'}); }
        v.push({x:4, y:14, z:-1, c:'#8B0000'});
        v.push({x:5, y:15, z:-2, c:'#8B0000'});
        return v;
    })(),
    
    ninjaHeadband: (() => {
        let v = [];
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z > 14 && x*x+z*z < 22) {
            v.push({x, y:9, z, c:'#1a1a1a'});
        }
        v.push({x:-4, y:9, z:-5, c:'#1a1a1a'});
        v.push({x:-3, y:9, z:-6, c:'#1a1a1a'});
        v.push({x:-2, y:9, z:-7, c:'#1a1a1a'});
        v.push({x:4, y:9, z:-5, c:'#1a1a1a'});
        v.push({x:3, y:9, z:-6, c:'#1a1a1a'});
        v.push({x:2, y:9, z:-7, c:'#1a1a1a'});
        return v;
    })(),
    
    partyHat: (() => {
        let v = [];
        for(let y=10; y<16; y++) {
            const r = Math.max(1, 4 - (y-10)*0.6);
            for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) if(x*x+z*z < r*r) {
                const stripe = (y % 2 === 0) ? '#FF69B4' : '#00CED1';
                v.push({x, y, z, c: stripe});
            }
        }
        v.push({x:0, y:16, z:0, c:'gold', glow: true});
        return v;
    })(),
    
    graduationCap: (() => {
        let v = [];
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) v.push({x, y:12, z, c:'#1a1a1a'});
        for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z < 18) v.push({x, y:11, z, c:'#1a1a1a'});
        v.push({x:4, y:12, z:4, c:'gold'});
        v.push({x:5, y:11, z:5, c:'gold'});
        v.push({x:6, y:10, z:6, c:'gold'});
        return v;
    })(),
    
    rainbowCrown: (() => {
        let v = [];
        const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#8B00FF'];
        let ci = 0;
        for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z > 10 && x*x+z*z < 18) {
            v.push({x, y:10, z, c: colors[ci % colors.length], glow: true});
            v.push({x, y:11, z, c: colors[(ci+1) % colors.length], glow: true});
            if((x+z)%2===0) v.push({x, y:12, z, c: colors[(ci+2) % colors.length], glow: true});
            ci++;
        }
        return v;
    })(),
    
    hardHat: (() => {
        let v = [];
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 26) {
            v.push({x, y:10, z, c:'#FFA500'});
            if(x*x+z*z < 20) v.push({x, y:11, z, c:'#FFA500'});
        }
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z > 20 && x*x+z*z < 28) v.push({x, y:9, z, c:'#FFA500'});
        return v;
    })(),
    
    bunnyEars: (() => {
        let v = [];
        for(let y=10; y<17; y++) {
            v.push({x:-3, y, z:0, c:'white'});
            if(y > 11 && y < 16) v.push({x:-3, y, z:1, c:'#FFB6C1'});
        }
        for(let y=10; y<17; y++) {
            v.push({x:3, y, z:0, c:'white'});
            if(y > 11 && y < 16) v.push({x:3, y, z:1, c:'#FFB6C1'});
        }
        return v;
    })(),
    
    catEars: (() => {
        let v = [];
        v.push({x:-4, y:10, z:0, c:'#333'}); v.push({x:-3, y:10, z:0, c:'#333'});
        v.push({x:-4, y:11, z:0, c:'#333'}); v.push({x:-3, y:11, z:0, c:'#FFB6C1'});
        v.push({x:-4, y:12, z:0, c:'#333'});
        v.push({x:4, y:10, z:0, c:'#333'}); v.push({x:3, y:10, z:0, c:'#333'});
        v.push({x:4, y:11, z:0, c:'#333'}); v.push({x:3, y:11, z:0, c:'#FFB6C1'});
        v.push({x:4, y:12, z:0, c:'#333'});
        return v;
    })(),
    
    samuraiHelmet: (() => {
        let v = [];
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 26) {
            v.push({x, y:10, z, c:'#8B0000'});
            if(x*x+z*z < 18) v.push({x, y:11, z, c:'#8B0000'});
        }
        for(let y=12; y<16; y++) v.push({x:0, y, z:0, c:'gold'});
        v.push({x:-4, y:11, z:3, c:'gold'}); v.push({x:-5, y:12, z:4, c:'gold'});
        v.push({x:4, y:11, z:3, c:'gold'}); v.push({x:5, y:12, z:4, c:'gold'});
        return v;
    })(),
    
    spartanHelmet: (() => {
        let v = [];
        const bronze = '#CD7F32';
        const darkBronze = '#8B5A2B';
        const plume = '#8B0000';
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) {
            const d = x*x + z*z;
            if(d < 26) {
                v.push({x, y:10, z, c: bronze});
                if(d < 20) v.push({x, y:11, z, c: bronze});
                if(d < 14) v.push({x, y:12, z, c: bronze});
            }
        }
        for(let y=7; y<=10; y++) {
            v.push({x:-4, y, z:2, c: darkBronze});
            v.push({x:-4, y, z:3, c: darkBronze});
            v.push({x:4, y, z:2, c: darkBronze});
            v.push({x:4, y, z:3, c: darkBronze});
        }
        for(let y=7; y<=10; y++) {
            v.push({x:0, y, z:5, c: darkBronze});
        }
        for(let y=12; y<=18; y++) {
            const height = y - 12;
            for(let z=-4; z<=2; z++) {
                if(height < 4 || Math.abs(z) < 2) {
                    v.push({x:0, y, z, c: plume});
                }
            }
        }
        v.push({x:0, y:12, z:0, c: bronze});
        v.push({x:-1, y:12, z:0, c: bronze});
        v.push({x:1, y:12, z:0, c: bronze});
        return v;
    })(),
    
    mushroomCap: (() => {
        let v = [];
        for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 28) {
            v.push({x, y:10, z, c:'#FF0000'});
            if(x*x+z*z < 20) v.push({x, y:11, z, c:'#FF0000'});
        }
        v.push({x:2, y:11, z:2, c:'white'});
        v.push({x:-2, y:11, z:2, c:'white'});
        v.push({x:0, y:11, z:-3, c:'white'});
        v.push({x:3, y:10, z:-1, c:'white'});
        return v;
    })(),
    
    ufoHat: (() => {
        let v = [];
        for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) if(x*x+z*z < 38) v.push({x, y:10, z, c:'#C0C0C0'});
        for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 10) {
            v.push({x, y:11, z, c:'#87CEEB'});
            v.push({x, y:12, z, c:'#87CEEB'});
        }
        v.push({x:5, y:10, z:0, c:'#00FF00', glow: true});
        v.push({x:-5, y:10, z:0, c:'#00FF00', glow: true});
        v.push({x:0, y:10, z:5, c:'#00FF00', glow: true});
        v.push({x:0, y:10, z:-5, c:'#00FF00', glow: true});
        return v;
    })(),
    
    phoenixFeathers: (() => {
        let v = [];
        for(let y=10; y<18; y++) {
            const spread = (y - 10) * 0.5;
            v.push({x:0, y, z:-spread, c: y < 14 ? '#FF4500' : '#FFD700', glow: true, fx: 'fire'});
            v.push({x:Math.floor(spread), y, z:-spread/2, c:'#FF6347', glow: true, fx: 'fire'});
            v.push({x:-Math.floor(spread), y, z:-spread/2, c:'#FF6347', glow: true, fx: 'fire'});
        }
        return v;
    })(),
    
    pumpkinHead: (() => {
        let v = [];
        const orange = '#FF7518';
        const darkOrange = '#E65C00';
        for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) for(let y=10; y<=14; y++) {
            const dy = y - 12;
            const d = x*x + dy*dy + z*z;
            if(d <= 10) {
                const isRidge = (x + z) % 2 === 0;
                v.push({x, y, z, c: isRidge ? orange : darkOrange});
            }
        }
        v.push({x:-1, y:12, z:3, c:'#FFFF00', glow: true});
        v.push({x:1, y:12, z:3, c:'#FFFF00', glow: true});
        v.push({x:0, y:11, z:3, c:'#FFFF00', glow: true});
        v.push({x:-1, y:10, z:3, c:'#FFFF00', glow: true});
        v.push({x:0, y:10, z:3, c:'#FFFF00', glow: true});
        v.push({x:1, y:10, z:3, c:'#FFFF00', glow: true});
        v.push({x:0, y:15, z:0, c:'#228B22'});
        v.push({x:0, y:16, z:0, c:'#2E8B2E'});
        v.push({x:1, y:16, z:0, c:'#228B22'});
        v.push({x:2, y:15, z:0, c:'#228B22'});
        return v;
    })(),
    
    // EXCLUSIVE: BONK "!!!" - Three simple exclamation marks (shaft + dot)
    bonkExclamation: (() => {
        const v = [];
        const red = '#E53935';
        
        // Simple exclamation: straight line + dot bottom
        const addExclamation = (x, baseY) => {
            // Straight line (the shaft)
            for (let y = baseY; y < baseY + 5; y++) {
                v.push({x, y, z: 0, c: red, glow: true});
                v.push({x: x+1, y, z: 0, c: red, glow: true});
                v.push({x, y, z: 1, c: red, glow: true});
                v.push({x: x+1, y, z: 1, c: red, glow: true});
            }
            
            // Dot at bottom
            v.push({x, y: baseY - 2, z: 0, c: red, glow: true});
            v.push({x: x+1, y: baseY - 2, z: 0, c: red, glow: true});
            v.push({x, y: baseY - 2, z: 1, c: red, glow: true});
            v.push({x: x+1, y: baseY - 2, z: 1, c: red, glow: true});
        };
        
        // Three exclamation marks - left, center (higher), right
        addExclamation(-4, 14);  // Left
        addExclamation(-1, 15);  // Center (slightly higher)
        addExclamation(2, 14);   // Right
        
        return v;
    })(),
    
    // EXCLUSIVE: Mistor Goat White Hair
    mistorHair: (() => {
        const v = [];
        const hairLight = '#FFFFFF';
        const hairBase = '#F0F0F0';
        const hairMid = '#E5E5E5';
        const hairDark = '#D8D8D8';
        const headCenterY = 7.5;
        const headR = 4.5;
        const hairR = 5.5;
        for(let x=-6; x<=6; x++) {
            for(let y=3; y<=12; y++) {
                for(let z=-6; z<=6; z++) {
                    const dy = y - headCenterY;
                    const dist = Math.sqrt(x*x + dy*dy + z*z);
                    if(dist > headR && dist <= hairR && dy >= -1) {
                        if(z > 3 && dy < 2 && Math.abs(x) < 3) continue;
                        let col;
                        if(y >= 10) col = hairLight;
                        else if(y >= 7) col = hairBase;
                        else col = hairMid;
                        v.push({x, y, z, c: col});
                    }
                }
            }
        }
        for(let y=5; y<=9; y++) {
            v.push({x:-4, y, z:4, c: y >= 8 ? hairBase : hairMid});
            if(y <= 7) v.push({x:-3, y, z:5, c: hairMid});
        }
        v.push({x:-4, y:4, z:4, c: hairDark});
        v.push({x:-3, y:5, z:5, c: hairDark});
        for(let y=5; y<=9; y++) {
            v.push({x:4, y, z:4, c: y >= 8 ? hairBase : hairMid});
            if(y <= 7) v.push({x:3, y, z:5, c: hairMid});
        }
        v.push({x:4, y:4, z:4, c: hairDark});
        v.push({x:3, y:5, z:5, c: hairDark});
        for(let x=-2; x<=2; x++) {
            v.push({x, y:9, z:5, c: hairBase});
            v.push({x, y:8, z:5, c: hairMid});
        }
        return v;
    })(),
    
    // ========== ANIMATED FEATHERS ==========
    
    // Aurora Feathers - Northern lights shimmer effect
    auroraFeathers: (() => {
        let v = [];
        const colors = ['#00FF7F', '#00CED1', '#9370DB', '#00FA9A', '#48D1CC'];
        for(let y = 10; y < 18; y++) {
            const spread = (y - 10) * 0.6;
            const colorIdx = (y - 10) % colors.length;
            // Center feather
            v.push({x: 0, y, z: -spread * 0.5, c: colors[colorIdx], glow: true, fx: 'aurora'});
            // Side feathers
            v.push({x: Math.floor(spread * 0.8), y, z: -spread * 0.3, c: colors[(colorIdx + 1) % colors.length], glow: true, fx: 'aurora'});
            v.push({x: -Math.floor(spread * 0.8), y, z: -spread * 0.3, c: colors[(colorIdx + 2) % colors.length], glow: true, fx: 'aurora'});
        }
        // Extra sparkle tips
        v.push({x: 0, y: 18, z: -5, c: '#FFFFFF', glow: true, fx: 'aurora'});
        v.push({x: 3, y: 17, z: -4, c: '#ADFF2F', glow: true, fx: 'aurora'});
        v.push({x: -3, y: 17, z: -4, c: '#7FFFD4', glow: true, fx: 'aurora'});
        return v;
    })(),
    
    // Crystal Feathers - Transparent prismatic effect
    crystalFeathers: (() => {
        let v = [];
        const colors = ['#E0FFFF', '#B0E0E6', '#ADD8E6', '#87CEEB', '#F0FFFF'];
        for(let y = 10; y < 17; y++) {
            const spread = (y - 10) * 0.5;
            const colorIdx = (y - 10) % colors.length;
            // Crystalline center
            v.push({x: 0, y, z: -spread * 0.4, c: colors[colorIdx], glow: true, fx: 'crystal', transparent: true});
            // Faceted sides
            if (y > 11) {
                v.push({x: Math.floor(spread * 0.7), y, z: -spread * 0.2, c: colors[(colorIdx + 1) % colors.length], glow: true, fx: 'crystal', transparent: true});
                v.push({x: -Math.floor(spread * 0.7), y, z: -spread * 0.2, c: colors[(colorIdx + 2) % colors.length], glow: true, fx: 'crystal', transparent: true});
            }
        }
        // Crystal tips with high glow
        v.push({x: 0, y: 17, z: -4, c: '#FFFFFF', glow: true, fx: 'crystal', transparent: true});
        v.push({x: 2, y: 16, z: -3, c: '#E6E6FA', glow: true, fx: 'crystal', transparent: true});
        v.push({x: -2, y: 16, z: -3, c: '#E6E6FA', glow: true, fx: 'crystal', transparent: true});
        return v;
    })(),
    
    // Void Feathers - Black with purple particle effect
    voidFeathers: (() => {
        let v = [];
        const colors = ['#1a0a2e', '#2d1b4e', '#4a1a6b', '#3d0f5c', '#0d0d0d'];
        for(let y = 10; y < 18; y++) {
            const spread = (y - 10) * 0.55;
            const colorIdx = (y - 10) % colors.length;
            // Dark core feathers
            v.push({x: 0, y, z: -spread * 0.5, c: colors[colorIdx], glow: true, fx: 'void'});
            v.push({x: Math.floor(spread * 0.75), y, z: -spread * 0.35, c: colors[(colorIdx + 1) % colors.length], glow: true, fx: 'void'});
            v.push({x: -Math.floor(spread * 0.75), y, z: -spread * 0.35, c: colors[(colorIdx + 2) % colors.length], glow: true, fx: 'void'});
        }
        // Purple energy tips
        v.push({x: 0, y: 18, z: -5, c: '#8B008B', glow: true, fx: 'void'});
        v.push({x: 2, y: 17, z: -4, c: '#9400D3', glow: true, fx: 'void'});
        v.push({x: -2, y: 17, z: -4, c: '#9400D3', glow: true, fx: 'void'});
        return v;
    })()
};

export default HATS;
