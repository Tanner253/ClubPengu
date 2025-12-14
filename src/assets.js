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
        })(),
        
        // ==================== NEW HATS (20 Epic/Legendary Items) ====================
        
        // LEGENDARY: Flaming Crown - crown with animated fire particles
        flamingCrown: (() => {
            let v = [];
            // Gold crown base
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z > 10 && x*x+z*z < 18) {
                v.push({x, y:10, z, c: '#FFD700'});
                v.push({x, y:11, z, c: '#FFD700'});
                if((x+z)%2===0) v.push({x, y:12, z, c: '#FFD700'});
            }
            // Fire emitter points (particles will be added in VoxelWorld)
            v.push({x:0, y:12, z:0, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
            v.push({x:3, y:12, z:0, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
            v.push({x:-3, y:12, z:0, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
            v.push({x:0, y:12, z:3, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
            v.push({x:0, y:12, z:-3, c: '#FF4500', glow: true, fx: 'crownFire', emitter: true});
            return v;
        })(),
        
        // LEGENDARY: Ice Crown - crystalline frozen crown
        iceCrown: (() => {
            let v = [];
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z > 10 && x*x+z*z < 18) {
                v.push({x, y:10, z, c: '#87CEEB'});
                v.push({x, y:11, z, c: '#ADD8E6'});
            }
            // Ice spikes
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
        
        // EPIC: Wizard Hat - tall purple wizard hat with stars and magic trail
        wizardHat: (() => {
            let v = [];
            // Wide brim
            for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) if(x*x+z*z < 40) v.push({x, y:10, z, c:'#4B0082'});
            // Cone
            for(let y=11; y<18; y++) {
                const r = Math.max(1, 5 - (y-11)*0.6);
                for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) if(x*x+z*z < r*r) v.push({x, y, z, c:'#4B0082'});
            }
            // Stars
            v.push({x:2, y:13, z:3, c:'gold', glow: true});
            v.push({x:-1, y:15, z:2, c:'gold', glow: true});
            v.push({x:0, y:17, z:1, c:'gold', glow: true});
            // Magic particle emitter at tip (purple/pink trail when walking)
            v.push({x:0, y:18, z:0, c:'#FF69B4', glow: true, fx: 'magicTrail', emitter: true});
            return v;
        })(),
        
        // EPIC: Astronaut Helmet - large round space helmet with glass visor
        astronautHelmet: (() => {
            let v = [];
            const centerY = 9;
            const radius = 7;
            
            // Large spherical helmet shell (white) - back and sides only
            for(let x=-radius; x<=radius; x++) {
                for(let z=-radius; z<=radius; z++) {
                    for(let y=5; y<=16; y++) {
                        const dy = y - centerY;
                        const d = Math.sqrt(x*x + dy*dy + z*z);
                        // Shell thickness
                        if(d >= radius - 1 && d <= radius) {
                            // Leave entire front open for glass visor
                            const isFrontFace = z > 2;
                            if(!isFrontFace) {
                                v.push({x, y, z, c:'white'});
                            }
                        }
                    }
                }
            }
            
            // Glass visor frame (gold rim only - visor is transparent/empty)
            // Top rim
            for(let x=-5; x<=5; x++) {
                const zOuter = Math.sqrt(Math.max(0, 36 - x*x)) * 0.9;
                if(zOuter > 2) v.push({x, y:13, z: Math.round(zOuter), c:'#FFD700'});
            }
            // Bottom rim  
            for(let x=-5; x<=5; x++) {
                const zOuter = Math.sqrt(Math.max(0, 36 - x*x)) * 0.9;
                if(zOuter > 2) v.push({x, y:5, z: Math.round(zOuter), c:'#FFD700'});
            }
            // Side rims
            for(let y=5; y<=13; y++) {
                v.push({x:-5, y, z:4, c:'#FFD700'});
                v.push({x:5, y, z:4, c:'#FFD700'});
            }
            
            // Visor glass effect - just a few voxels to suggest reflection
            // Very sparse to show it's glass
            v.push({x:-2, y:11, z:6, c:'#AADDFF', glass: true, glow: true});
            v.push({x:2, y:10, z:6, c:'#AADDFF', glass: true, glow: true});
            v.push({x:0, y:8, z:7, c:'#AADDFF', glass: true, glow: true});
            
            // Neck ring (collar)
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) {
                const d = x*x + z*z;
                if(d > 18 && d < 28) v.push({x, y:4, z, c:'#C0C0C0'});
            }
            
            // Air tubes on sides
            v.push({x:-6, y:7, z:-2, c:'#888888'});
            v.push({x:-6, y:8, z:-3, c:'#888888'});
            v.push({x:6, y:7, z:-2, c:'#888888'});
            v.push({x:6, y:8, z:-3, c:'#888888'});
            
            return v;
        })(),
        
        // Pirate Tricorn
        pirateTricorn: (() => {
            let v = [];
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 28) v.push({x, y:10, z, c:'#2F1810'});
            // Turned up brims
            for(let x=-5; x<=5; x++) v.push({x, y:11, z:-5, c:'#2F1810'});
            for(let z=-5; z<=5; z++) { v.push({x:-5, y:11, z, c:'#2F1810'}); v.push({x:5, y:11, z, c:'#2F1810'}); }
            // Skull emblem
            v.push({x:0, y:11, z:5, c:'white'});
            return v;
        })(),
        
        // LEGENDARY: Angel Halo (animated glow)
        angelHalo: (() => {
            let v = [];
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z > 16 && x*x+z*z < 26) {
                v.push({x, y:15, z, c:'#FFFACD', glow: true});
            }
            return v;
        })(),
        
        // Devil Horns
        devilHorns: (() => {
            let v = [];
            // Left horn
            for(let y=10; y<15; y++) { v.push({x:-3, y, z:0, c:'#8B0000'}); }
            v.push({x:-4, y:14, z:-1, c:'#8B0000'});
            v.push({x:-5, y:15, z:-2, c:'#8B0000'});
            // Right horn
            for(let y=10; y<15; y++) { v.push({x:3, y, z:0, c:'#8B0000'}); }
            v.push({x:4, y:14, z:-1, c:'#8B0000'});
            v.push({x:5, y:15, z:-2, c:'#8B0000'});
            return v;
        })(),
        
        // Ninja Headband
        ninjaHeadband: (() => {
            let v = [];
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z > 14 && x*x+z*z < 22) {
                v.push({x, y:9, z, c:'#1a1a1a'});
            }
            // Tail ribbons
            v.push({x:-4, y:9, z:-5, c:'#1a1a1a'});
            v.push({x:-3, y:9, z:-6, c:'#1a1a1a'});
            v.push({x:-2, y:9, z:-7, c:'#1a1a1a'});
            v.push({x:4, y:9, z:-5, c:'#1a1a1a'});
            v.push({x:3, y:9, z:-6, c:'#1a1a1a'});
            v.push({x:2, y:9, z:-7, c:'#1a1a1a'});
            return v;
        })(),
        
        // Party Hat
        partyHat: (() => {
            let v = [];
            for(let y=10; y<16; y++) {
                const r = Math.max(1, 4 - (y-10)*0.6);
                for(let x=-r; x<=r; x++) for(let z=-r; z<=r; z++) if(x*x+z*z < r*r) {
                    const stripe = (y % 2 === 0) ? '#FF69B4' : '#00CED1';
                    v.push({x, y, z, c: stripe});
                }
            }
            // Pom pom on top
            v.push({x:0, y:16, z:0, c:'gold', glow: true});
            return v;
        })(),
        
        // Graduation Cap
        graduationCap: (() => {
            let v = [];
            // Flat top
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) v.push({x, y:12, z, c:'#1a1a1a'});
            // Band
            for(let x=-4; x<=4; x++) for(let z=-4; z<=4; z++) if(x*x+z*z < 18) v.push({x, y:11, z, c:'#1a1a1a'});
            // Tassel
            v.push({x:4, y:12, z:4, c:'gold'});
            v.push({x:5, y:11, z:5, c:'gold'});
            v.push({x:6, y:10, z:6, c:'gold'});
            return v;
        })(),
        
        // LEGENDARY: Rainbow Crown (animated colors)
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
        
        // Construction Helmet
        hardHat: (() => {
            let v = [];
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 26) {
                v.push({x, y:10, z, c:'#FFA500'});
                if(x*x+z*z < 20) v.push({x, y:11, z, c:'#FFA500'});
            }
            // Rim
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z > 20 && x*x+z*z < 28) v.push({x, y:9, z, c:'#FFA500'});
            return v;
        })(),
        
        // Bunny Ears
        bunnyEars: (() => {
            let v = [];
            // Left ear
            for(let y=10; y<17; y++) {
                v.push({x:-3, y, z:0, c:'white'});
                if(y > 11 && y < 16) v.push({x:-3, y, z:1, c:'#FFB6C1'});
            }
            // Right ear
            for(let y=10; y<17; y++) {
                v.push({x:3, y, z:0, c:'white'});
                if(y > 11 && y < 16) v.push({x:3, y, z:1, c:'#FFB6C1'});
            }
            return v;
        })(),
        
        // Cat Ears
        catEars: (() => {
            let v = [];
            // Left ear (triangle)
            v.push({x:-4, y:10, z:0, c:'#333'}); v.push({x:-3, y:10, z:0, c:'#333'});
            v.push({x:-4, y:11, z:0, c:'#333'}); v.push({x:-3, y:11, z:0, c:'#FFB6C1'});
            v.push({x:-4, y:12, z:0, c:'#333'});
            // Right ear
            v.push({x:4, y:10, z:0, c:'#333'}); v.push({x:3, y:10, z:0, c:'#333'});
            v.push({x:4, y:11, z:0, c:'#333'}); v.push({x:3, y:11, z:0, c:'#FFB6C1'});
            v.push({x:4, y:12, z:0, c:'#333'});
            return v;
        })(),
        
        // EPIC: Samurai Helmet
        samuraiHelmet: (() => {
            let v = [];
            // Dome
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 26) {
                v.push({x, y:10, z, c:'#8B0000'});
                if(x*x+z*z < 18) v.push({x, y:11, z, c:'#8B0000'});
            }
            // Crest
            for(let y=12; y<16; y++) v.push({x:0, y, z:0, c:'gold'});
            // Horn decorations
            v.push({x:-4, y:11, z:3, c:'gold'}); v.push({x:-5, y:12, z:4, c:'gold'});
            v.push({x:4, y:11, z:3, c:'gold'}); v.push({x:5, y:12, z:4, c:'gold'});
            return v;
        })(),
        
        // EPIC: Spartan Helmet - Corinthian style with horsehair crest
        spartanHelmet: (() => {
            let v = [];
            const bronze = '#CD7F32';
            const darkBronze = '#8B5A2B';
            const plume = '#8B0000';
            
            // Main helmet dome
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) {
                const d = x*x + z*z;
                if(d < 26) {
                    v.push({x, y:10, z, c: bronze});
                    if(d < 20) v.push({x, y:11, z, c: bronze});
                    if(d < 14) v.push({x, y:12, z, c: bronze});
                }
            }
            
            // Cheek guards (hanging down sides)
            for(let y=7; y<=10; y++) {
                v.push({x:-4, y, z:2, c: darkBronze});
                v.push({x:-4, y, z:3, c: darkBronze});
                v.push({x:4, y, z:2, c: darkBronze});
                v.push({x:4, y, z:3, c: darkBronze});
            }
            
            // Nose guard (vertical strip down center front)
            for(let y=7; y<=10; y++) {
                v.push({x:0, y, z:5, c: darkBronze});
            }
            
            // Eye slits (leave gaps)
            // Horsehair crest (mohawk style plume)
            for(let y=12; y<=18; y++) {
                const height = y - 12;
                for(let z=-4; z<=2; z++) {
                    // Crest gets narrower at top
                    if(height < 4 || Math.abs(z) < 2) {
                        v.push({x:0, y, z, c: plume});
                    }
                }
            }
            
            // Crest base/holder
            v.push({x:0, y:12, z:0, c: bronze});
            v.push({x:-1, y:12, z:0, c: bronze});
            v.push({x:1, y:12, z:0, c: bronze});
            
            return v;
        })(),
        
        // Mushroom Cap
        mushroomCap: (() => {
            let v = [];
            for(let x=-5; x<=5; x++) for(let z=-5; z<=5; z++) if(x*x+z*z < 28) {
                v.push({x, y:10, z, c:'#FF0000'});
                if(x*x+z*z < 20) v.push({x, y:11, z, c:'#FF0000'});
            }
            // White spots
            v.push({x:2, y:11, z:2, c:'white'});
            v.push({x:-2, y:11, z:2, c:'white'});
            v.push({x:0, y:11, z:-3, c:'white'});
            v.push({x:3, y:10, z:-1, c:'white'});
            return v;
        })(),
        
        // UFO Hat
        ufoHat: (() => {
            let v = [];
            // Saucer
            for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) if(x*x+z*z < 38) v.push({x, y:10, z, c:'#C0C0C0'});
            // Dome
            for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) if(x*x+z*z < 10) {
                v.push({x, y:11, z, c:'#87CEEB'});
                v.push({x, y:12, z, c:'#87CEEB'});
            }
            // Lights
            v.push({x:5, y:10, z:0, c:'#00FF00', glow: true});
            v.push({x:-5, y:10, z:0, c:'#00FF00', glow: true});
            v.push({x:0, y:10, z:5, c:'#00FF00', glow: true});
            v.push({x:0, y:10, z:-5, c:'#00FF00', glow: true});
            return v;
        })(),
        
        // LEGENDARY: Phoenix Feathers
        phoenixFeathers: (() => {
            let v = [];
            // Base feathers
            for(let y=10; y<18; y++) {
                const spread = (y - 10) * 0.5;
                v.push({x:0, y, z:-spread, c: y < 14 ? '#FF4500' : '#FFD700', glow: true, fx: 'fire'});
                v.push({x:Math.floor(spread), y, z:-spread/2, c:'#FF6347', glow: true, fx: 'fire'});
                v.push({x:-Math.floor(spread), y, z:-spread/2, c:'#FF6347', glow: true, fx: 'fire'});
            }
            return v;
        })(),
        
        // Pumpkin Hat - small cute pumpkin sitting on head
        pumpkinHead: (() => {
            let v = [];
            const orange = '#FF7518';
            const darkOrange = '#E65C00';
            
            // Small pumpkin body (sphere with segments)
            for(let x=-3; x<=3; x++) for(let z=-3; z<=3; z++) for(let y=10; y<=14; y++) {
                const dy = y - 12;
                const d = x*x + dy*dy + z*z;
                if(d <= 10) {
                    // Pumpkin segments (ridges)
                    const isRidge = (x + z) % 2 === 0;
                    v.push({x, y, z, c: isRidge ? orange : darkOrange});
                }
            }
            
            // Carved face on front (glowing)
            v.push({x:-1, y:12, z:3, c:'#FFFF00', glow: true}); // Left eye
            v.push({x:1, y:12, z:3, c:'#FFFF00', glow: true});  // Right eye
            v.push({x:0, y:11, z:3, c:'#FFFF00', glow: true});  // Nose
            v.push({x:-1, y:10, z:3, c:'#FFFF00', glow: true}); // Mouth
            v.push({x:0, y:10, z:3, c:'#FFFF00', glow: true});
            v.push({x:1, y:10, z:3, c:'#FFFF00', glow: true});
            
            // Stem
            v.push({x:0, y:15, z:0, c:'#228B22'});
            v.push({x:0, y:16, z:0, c:'#2E8B2E'});
            
            // Curly vine
            v.push({x:1, y:16, z:0, c:'#228B22'});
            v.push({x:2, y:15, z:0, c:'#228B22'});
            
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
        // Money Eyes - dollar signs ($)
        money: [
            // Left $ sign
            {x:-3, y:8, z:4, c:'#00AA00', glow: true}, {x:-2, y:8, z:4, c:'#00AA00', glow: true},
            {x:-3, y:7, z:4, c:'#00AA00', glow: true},
            {x:-3, y:6, z:4, c:'#00AA00', glow: true}, {x:-2, y:6, z:4, c:'#00AA00', glow: true}, {x:-1, y:6, z:4, c:'#00AA00', glow: true},
            {x:-1, y:5, z:4, c:'#00AA00', glow: true},
            {x:-3, y:4, z:4, c:'#00AA00', glow: true}, {x:-2, y:4, z:4, c:'#00AA00', glow: true},
            {x:-2, y:9, z:4, c:'#00AA00', glow: true}, {x:-2, y:3, z:4, c:'#00AA00', glow: true}, // vertical line
            // Right $ sign
            {x:1, y:8, z:4, c:'#00AA00', glow: true}, {x:2, y:8, z:4, c:'#00AA00', glow: true},
            {x:1, y:7, z:4, c:'#00AA00', glow: true},
            {x:1, y:6, z:4, c:'#00AA00', glow: true}, {x:2, y:6, z:4, c:'#00AA00', glow: true}, {x:3, y:6, z:4, c:'#00AA00', glow: true},
            {x:3, y:5, z:4, c:'#00AA00', glow: true},
            {x:1, y:4, z:4, c:'#00AA00', glow: true}, {x:2, y:4, z:4, c:'#00AA00', glow: true},
            {x:2, y:9, z:4, c:'#00AA00', glow: true}, {x:2, y:3, z:4, c:'#00AA00', glow: true}
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
        // Fire Eyes - animated flames (with fx tag for animation)
        fire: [
            {x:-2, y:7, z:4, c:'#FF4500', glow: true, fx: 'fireEyes'},
            {x:-2, y:8, z:4, c:'#FF6600', glow: true, fx: 'fireEyes'},
            {x:-2, y:9, z:4, c:'#FFFF00', glow: true, fx: 'fireEyes'},
            {x:-3, y:8, z:4, c:'#FF4500', glow: true, fx: 'fireEyes'},
            {x:-1, y:8, z:4, c:'#FF4500', glow: true, fx: 'fireEyes'},
            {x:2, y:7, z:4, c:'#FF4500', glow: true, fx: 'fireEyes'},
            {x:2, y:8, z:4, c:'#FF6600', glow: true, fx: 'fireEyes'},
            {x:2, y:9, z:4, c:'#FFFF00', glow: true, fx: 'fireEyes'},
            {x:1, y:8, z:4, c:'#FF4500', glow: true, fx: 'fireEyes'},
            {x:3, y:8, z:4, c:'#FF4500', glow: true, fx: 'fireEyes'}
        ],
        
        // ==================== NEW EYES (20 Epic/Legendary Items) ====================
        
        // LEGENDARY: Galaxy Eyes - swirling cosmic eyes
        galaxy: [
            {x:-2, y:7, z:4, c:'#4B0082', glow: true}, {x:2, y:7, z:4, c:'#4B0082', glow: true},
            {x:-2, y:7, z:4.2, c:'#FF69B4', glow: true}, {x:2, y:7, z:4.2, c:'#FF69B4', glow: true},
            {x:-3, y:7, z:4, c:'#00CED1', glow: true}, {x:3, y:7, z:4, c:'#00CED1', glow: true}
        ],
        
        // LEGENDARY: Rainbow Eyes
        rainbow: [
            {x:-3, y:7, z:4, c:'#FF0000', glow: true}, {x:-2, y:7, z:4, c:'#FF7F00', glow: true},
            {x:-1, y:7, z:4, c:'#FFFF00', glow: true}, {x:1, y:7, z:4, c:'#00FF00', glow: true},
            {x:2, y:7, z:4, c:'#0000FF', glow: true}, {x:3, y:7, z:4, c:'#8B00FF', glow: true}
        ],
        
        // EPIC: Cyber Eyes - digital/tech look
        cyber: [
            {x:-3, y:7, z:4, c:'#00FFFF', glow: true}, {x:-2, y:7, z:4, c:'#00FFFF', glow: true},
            {x:-2, y:8, z:4, c:'#00FFFF', glow: true}, {x:-2, y:6, z:4, c:'#00FFFF', glow: true},
            {x:3, y:7, z:4, c:'#00FFFF', glow: true}, {x:2, y:7, z:4, c:'#00FFFF', glow: true},
            {x:2, y:8, z:4, c:'#00FFFF', glow: true}, {x:2, y:6, z:4, c:'#00FFFF', glow: true}
        ],
        
        // Sleepy Eyes - half-lidded with droopy eyelids
        sleepy: [
            // Pupils (small, half visible)
            {x:-2, y:6, z:4, c:'black'}, {x:2, y:6, z:4, c:'black'},
            // Heavy eyelids (skin color covering top half)
            {x:-3, y:7, z:4.1, c:'#444'}, {x:-2, y:7, z:4.1, c:'#444'}, {x:-1, y:7, z:4.1, c:'#444'},
            {x:-3, y:8, z:4.1, c:'#444'}, {x:-2, y:8, z:4.1, c:'#444'}, {x:-1, y:8, z:4.1, c:'#444'},
            {x:1, y:7, z:4.1, c:'#444'}, {x:2, y:7, z:4.1, c:'#444'}, {x:3, y:7, z:4.1, c:'#444'},
            {x:1, y:8, z:4.1, c:'#444'}, {x:2, y:8, z:4.1, c:'#444'}, {x:3, y:8, z:4.1, c:'#444'},
            // Bags under eyes
            {x:-2, y:5, z:4, c:'#555'}, {x:2, y:5, z:4, c:'#555'}
        ],
        
        // Dizzy Spiral Eyes
        dizzy: [
            {x:-2, y:7, z:4, c:'black'}, {x:-3, y:8, z:4, c:'black'}, {x:-2, y:9, z:4, c:'black'},
            {x:-1, y:8, z:4, c:'black'}, {x:-2, y:6, z:4, c:'black'},
            {x:2, y:7, z:4, c:'black'}, {x:1, y:8, z:4, c:'black'}, {x:2, y:9, z:4, c:'black'},
            {x:3, y:8, z:4, c:'black'}, {x:2, y:6, z:4, c:'black'}
        ],
        
        // Anime Eyes - big round shiny eyes with sparkle
        anime: [
            // Left eye - large circle
            {x:-2, y:7, z:4, c:'#6495ED'}, // Center
            {x:-3, y:7, z:4, c:'#4169E1'}, {x:-1, y:7, z:4, c:'#4169E1'},
            {x:-2, y:8, z:4, c:'#4169E1'}, {x:-2, y:6, z:4, c:'#4169E1'},
            // Pupil
            {x:-2, y:7, z:4.1, c:'black'},
            // Sparkle/shine
            {x:-3, y:8, z:4.2, c:'white', glow: true},
            
            // Right eye - large circle  
            {x:2, y:7, z:4, c:'#6495ED'}, // Center
            {x:1, y:7, z:4, c:'#4169E1'}, {x:3, y:7, z:4, c:'#4169E1'},
            {x:2, y:8, z:4, c:'#4169E1'}, {x:2, y:6, z:4, c:'#4169E1'},
            // Pupil
            {x:2, y:7, z:4.1, c:'black'},
            // Sparkle/shine
            {x:1, y:8, z:4.2, c:'white', glow: true}
        ],
        
        // Robot Eyes - square screens
        robot: [
            {x:-3, y:8, z:4, c:'#333'}, {x:-2, y:8, z:4, c:'#00FF00', glow: true}, {x:-1, y:8, z:4, c:'#333'},
            {x:-3, y:7, z:4, c:'#333'}, {x:-2, y:7, z:4, c:'#00FF00', glow: true}, {x:-1, y:7, z:4, c:'#333'},
            {x:-3, y:6, z:4, c:'#333'}, {x:-2, y:6, z:4, c:'#00FF00', glow: true}, {x:-1, y:6, z:4, c:'#333'},
            {x:3, y:8, z:4, c:'#333'}, {x:2, y:8, z:4, c:'#00FF00', glow: true}, {x:1, y:8, z:4, c:'#333'},
            {x:3, y:7, z:4, c:'#333'}, {x:2, y:7, z:4, c:'#00FF00', glow: true}, {x:1, y:7, z:4, c:'#333'},
            {x:3, y:6, z:4, c:'#333'}, {x:2, y:6, z:4, c:'#00FF00', glow: true}, {x:1, y:6, z:4, c:'#333'}
        ],
        
        // Determined Eyes - intense stare with angled brows
        determined: [
            // Eyes (focused)
            {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
            // Furrowed eyebrows (angled inward)
            {x:-4, y:9, z:4.1, c:'#333'}, {x:-3, y:8.5, z:4.1, c:'#333'}, {x:-2, y:8, z:4.1, c:'#333'},
            {x:4, y:9, z:4.1, c:'#333'}, {x:3, y:8.5, z:4.1, c:'#333'}, {x:2, y:8, z:4.1, c:'#333'},
            // Slight glint in eyes
            {x:-1.5, y:7.5, z:4.2, c:'white'}
        ],
        
        // VR Goggles
        vrGoggles: [
            {x:-4, y:8, z:4, c:'#333'}, {x:-3, y:8, z:4, c:'#333'}, {x:-2, y:8, z:4, c:'#333'}, {x:-1, y:8, z:4, c:'#333'},
            {x:-4, y:7, z:4, c:'#333'}, {x:-3, y:7, z:4, c:'#0066FF', glow: true}, {x:-2, y:7, z:4, c:'#0066FF', glow: true}, {x:-1, y:7, z:4, c:'#333'},
            {x:-4, y:6, z:4, c:'#333'}, {x:-3, y:6, z:4, c:'#333'}, {x:-2, y:6, z:4, c:'#333'}, {x:-1, y:6, z:4, c:'#333'},
            {x:4, y:8, z:4, c:'#333'}, {x:3, y:8, z:4, c:'#333'}, {x:2, y:8, z:4, c:'#333'}, {x:1, y:8, z:4, c:'#333'},
            {x:4, y:7, z:4, c:'#333'}, {x:3, y:7, z:4, c:'#0066FF', glow: true}, {x:2, y:7, z:4, c:'#0066FF', glow: true}, {x:1, y:7, z:4, c:'#333'},
            {x:4, y:6, z:4, c:'#333'}, {x:3, y:6, z:4, c:'#333'}, {x:2, y:6, z:4, c:'#333'}, {x:1, y:6, z:4, c:'#333'},
            {x:0, y:7, z:4, c:'#333'}
        ],
        
        // Ski Goggles
        skiGoggles: [
            {x:-4, y:8, z:4.5, c:'orange'}, {x:-3, y:8, z:4.5, c:'white'}, {x:-2, y:8, z:4.5, c:'white'}, {x:-1, y:8, z:4.5, c:'orange'},
            {x:-4, y:7, z:4.5, c:'orange'}, {x:-3, y:7, z:4.5, c:'white'}, {x:-2, y:7, z:4.5, c:'white'}, {x:-1, y:7, z:4.5, c:'orange'},
            {x:4, y:8, z:4.5, c:'orange'}, {x:3, y:8, z:4.5, c:'white'}, {x:2, y:8, z:4.5, c:'white'}, {x:1, y:8, z:4.5, c:'orange'},
            {x:4, y:7, z:4.5, c:'orange'}, {x:3, y:7, z:4.5, c:'white'}, {x:2, y:7, z:4.5, c:'white'}, {x:1, y:7, z:4.5, c:'orange'},
            {x:0, y:7, z:4.5, c:'orange'}, {x:0, y:8, z:4.5, c:'orange'}
        ],
        
        // Star Eyes
        stars: [
            {x:-2, y:7, z:4, c:'gold', glow: true}, {x:-3, y:8, z:4, c:'gold', glow: true}, {x:-1, y:8, z:4, c:'gold', glow: true},
            {x:-3, y:6, z:4, c:'gold', glow: true}, {x:-1, y:6, z:4, c:'gold', glow: true},
            {x:2, y:7, z:4, c:'gold', glow: true}, {x:1, y:8, z:4, c:'gold', glow: true}, {x:3, y:8, z:4, c:'gold', glow: true},
            {x:1, y:6, z:4, c:'gold', glow: true}, {x:3, y:6, z:4, c:'gold', glow: true}
        ],
        
        // LEGENDARY: Diamond Eyes - sparkling gems with twinkle animation
        diamond: [
            // Left diamond gem
            {x:-2, y:7, z:4, c:'#E0FFFF', glow: true}, // Center facet
            {x:-3, y:7, z:4, c:'#B9F2FF', glow: true}, {x:-1, y:7, z:4, c:'#B9F2FF', glow: true},
            {x:-2, y:8, z:4, c:'#B9F2FF', glow: true}, {x:-2, y:6, z:4, c:'#B9F2FF', glow: true},
            // Sparkle points (animated via fx)
            {x:-3, y:8, z:4.2, c:'white', glow: true, fx: 'sparkle'},
            {x:-1, y:6, z:4.2, c:'white', glow: true, fx: 'sparkle'},
            
            // Right diamond gem
            {x:2, y:7, z:4, c:'#E0FFFF', glow: true}, // Center facet
            {x:1, y:7, z:4, c:'#B9F2FF', glow: true}, {x:3, y:7, z:4, c:'#B9F2FF', glow: true},
            {x:2, y:8, z:4, c:'#B9F2FF', glow: true}, {x:2, y:6, z:4, c:'#B9F2FF', glow: true},
            // Sparkle points
            {x:1, y:8, z:4.2, c:'white', glow: true, fx: 'sparkle'},
            {x:3, y:6, z:4.2, c:'white', glow: true, fx: 'sparkle'}
        ],
        
        // Bloodshot Eyes - red veiny tired eyes
        bloodshot: [
            // Left eye - white base
            {x:-3, y:7, z:4, c:'#FFFAFA'}, {x:-2, y:7, z:4, c:'#FFFAFA'}, {x:-1, y:7, z:4, c:'#FFFAFA'},
            {x:-2, y:8, z:4, c:'#FFFAFA'}, {x:-2, y:6, z:4, c:'#FFFAFA'},
            // Left eye - pupil
            {x:-2, y:7, z:4.1, c:'#8B0000'},
            // Left eye - red veins
            {x:-3, y:8, z:4.05, c:'#FF0000'}, {x:-3, y:6, z:4.05, c:'#FF0000'},
            {x:-1, y:8, z:4.05, c:'#FF0000'}, {x:-1, y:6, z:4.05, c:'#FF0000'},
            
            // Right eye - white base
            {x:1, y:7, z:4, c:'#FFFAFA'}, {x:2, y:7, z:4, c:'#FFFAFA'}, {x:3, y:7, z:4, c:'#FFFAFA'},
            {x:2, y:8, z:4, c:'#FFFAFA'}, {x:2, y:6, z:4, c:'#FFFAFA'},
            // Right eye - pupil
            {x:2, y:7, z:4.1, c:'#8B0000'},
            // Right eye - red veins
            {x:1, y:8, z:4.05, c:'#FF0000'}, {x:1, y:6, z:4.05, c:'#FF0000'},
            {x:3, y:8, z:4.05, c:'#FF0000'}, {x:3, y:6, z:4.05, c:'#FF0000'}
        ],
        
        // Cat Eyes - vertical pupils
        catEyes: [
            {x:-3, y:8, z:4, c:'#90EE90'}, {x:-2, y:8, z:4, c:'#90EE90'}, {x:-1, y:8, z:4, c:'#90EE90'},
            {x:-3, y:7, z:4, c:'#90EE90'}, {x:-2, y:7, z:4, c:'black'}, {x:-1, y:7, z:4, c:'#90EE90'},
            {x:-3, y:6, z:4, c:'#90EE90'}, {x:-2, y:6, z:4, c:'black'}, {x:-1, y:6, z:4, c:'#90EE90'},
            {x:3, y:8, z:4, c:'#90EE90'}, {x:2, y:8, z:4, c:'#90EE90'}, {x:1, y:8, z:4, c:'#90EE90'},
            {x:3, y:7, z:4, c:'#90EE90'}, {x:2, y:7, z:4, c:'black'}, {x:1, y:7, z:4, c:'#90EE90'},
            {x:3, y:6, z:4, c:'#90EE90'}, {x:2, y:6, z:4, c:'black'}, {x:1, y:6, z:4, c:'#90EE90'}
        ],
        
        // Sunglasses Aviator
        aviator: [
            {x:-4, y:8, z:4.5, c:'gold'}, {x:-3, y:8, z:4.5, c:'#333'}, {x:-2, y:8, z:4.5, c:'#333'}, {x:-1, y:8, z:4.5, c:'gold'},
            {x:-4, y:7, z:4.5, c:'gold'}, {x:-3, y:7, z:4.5, c:'#333'}, {x:-2, y:7, z:4.5, c:'#333'}, {x:-1, y:7, z:4.5, c:'gold'},
            {x:-3, y:6, z:4.5, c:'gold'}, {x:-2, y:6, z:4.5, c:'gold'},
            {x:4, y:8, z:4.5, c:'gold'}, {x:3, y:8, z:4.5, c:'#333'}, {x:2, y:8, z:4.5, c:'#333'}, {x:1, y:8, z:4.5, c:'gold'},
            {x:4, y:7, z:4.5, c:'gold'}, {x:3, y:7, z:4.5, c:'#333'}, {x:2, y:7, z:4.5, c:'#333'}, {x:1, y:7, z:4.5, c:'gold'},
            {x:3, y:6, z:4.5, c:'gold'}, {x:2, y:6, z:4.5, c:'gold'},
            {x:0, y:8, z:4.5, c:'gold'}
        ],
        
        // EPIC: Sharingan (anime style)
        sharingan: [
            {x:-2, y:7, z:4, c:'#8B0000', glow: true}, {x:-3, y:7, z:4, c:'black'}, {x:-1, y:7, z:4, c:'black'},
            {x:-2, y:8, z:4, c:'black'}, {x:-2, y:6, z:4, c:'black'},
            {x:-3, y:8, z:4.2, c:'#8B0000', glow: true}, {x:-1, y:6, z:4.2, c:'#8B0000', glow: true},
            {x:2, y:7, z:4, c:'#8B0000', glow: true}, {x:1, y:7, z:4, c:'black'}, {x:3, y:7, z:4, c:'black'},
            {x:2, y:8, z:4, c:'black'}, {x:2, y:6, z:4, c:'black'},
            {x:1, y:8, z:4.2, c:'#8B0000', glow: true}, {x:3, y:6, z:4.2, c:'#8B0000', glow: true}
        ],
        
        // Teary Eyes
        teary: [
            {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
            {x:-3, y:7, z:4.2, c:'white'}, {x:3, y:7, z:4.2, c:'white'},
            {x:-2, y:5, z:4.3, c:'#87CEEB'}, {x:2, y:5, z:4.3, c:'#87CEEB'}
        ],
        
        // LEGENDARY: Void Eyes - deep black with purple glow
        void: [
            {x:-3, y:8, z:4, c:'#1a0033'}, {x:-2, y:8, z:4, c:'#1a0033'}, {x:-1, y:8, z:4, c:'#1a0033'},
            {x:-3, y:7, z:4, c:'#1a0033'}, {x:-2, y:7, z:4, c:'#8B008B', glow: true}, {x:-1, y:7, z:4, c:'#1a0033'},
            {x:-3, y:6, z:4, c:'#1a0033'}, {x:-2, y:6, z:4, c:'#1a0033'}, {x:-1, y:6, z:4, c:'#1a0033'},
            {x:3, y:8, z:4, c:'#1a0033'}, {x:2, y:8, z:4, c:'#1a0033'}, {x:1, y:8, z:4, c:'#1a0033'},
            {x:3, y:7, z:4, c:'#1a0033'}, {x:2, y:7, z:4, c:'#8B008B', glow: true}, {x:1, y:7, z:4, c:'#1a0033'},
            {x:3, y:6, z:4, c:'#1a0033'}, {x:2, y:6, z:4, c:'#1a0033'}, {x:1, y:6, z:4, c:'#1a0033'}
        ],
        
        // Sweat Drop (nervous)
        nervous: [
            {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
            {x:4, y:9, z:4, c:'#87CEEB'}, {x:4, y:8, z:4.2, c:'#87CEEB'}
        ],
        
        // LEGENDARY: LMAO Face - Crying laughing emoji with CYLINDRICAL popping eyes
        // Unlocked via promo code "LMAO" - covers eyes AND mouth area
        lmao: (() => {
            let v = [];
            const white = '#FFFFFF';
            const black = '#000000';
            const tearBlue = '#29B6F6';
            const faceYellow = '#FFCC02'; // Dark golden emoji yellow
            
            // === ROUND YELLOW EMOJI FACE (circular like the meme) ===
            const faceCenterY = 6; // Center of face
            const faceRadius = 5; // Round face radius
            for(let y = 1; y <= 11; y++) {
                for(let x = -5; x <= 5; x++) {
                    // Check if within circular face
                    const distFromCenter = Math.sqrt(x*x + (y - faceCenterY)*(y - faceCenterY));
                    if(distFromCenter <= faceRadius) {
                        // Skip ONLY the inner part of eye cylinders (smaller gap)
                        const leftEyeDist = Math.sqrt((x+2)*(x+2) + (y-7)*(y-7));
                        const rightEyeDist = Math.sqrt((x-2)*(x-2) + (y-7)*(y-7));
                        if(leftEyeDist > 1.8 && rightEyeDist > 1.8) {
                            v.push({x, y, z: 4, c: faceYellow});
                        }
                    }
                }
            }
            
            // === SOLID WHITE CYLINDER EYES popping straight out ===
            const eyeLength = 5; // How far cylinders extend
            const eyeStart = 3; // Start closer to face (pushed into head)
            
            // LEFT EYE - SOLID white cylinder
            for(let z = eyeStart; z <= eyeStart + eyeLength; z++) {
                for(let dx = -2; dx <= 2; dx++) {
                    for(let dy = -2; dy <= 2; dy++) {
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if(dist <= 2) {
                            v.push({x: -2 + dx, y: 7 + dy, z: z, c: white});
                        }
                    }
                }
            }
            // Left pupil at front
            v.push({x: -2, y: 7, z: eyeStart + eyeLength + 0.5, c: black});
            
            // RIGHT EYE - SOLID white cylinder
            for(let z = eyeStart; z <= eyeStart + eyeLength; z++) {
                for(let dx = -2; dx <= 2; dx++) {
                    for(let dy = -2; dy <= 2; dy++) {
                        const dist = Math.sqrt(dx*dx + dy*dy);
                        if(dist <= 2) {
                            v.push({x: 2 + dx, y: 7 + dy, z: z, c: white});
                        }
                    }
                }
            }
            // Right pupil at front
            v.push({x: 2, y: 7, z: eyeStart + eyeLength + 0.5, c: black});
            
            // === TEAR STREAMS (angled outward as they flow down) ===
            // Left tears - angle outward to the left as going down
            for(let t = 0; t < 6; t++) {
                v.push({x: -4 - t*0.6, y: 5 - t*0.8, z: 4.5, c: tearBlue, glow: true});
                v.push({x: -4.5 - t*0.5, y: 5.5 - t*0.8, z: 4.3, c: tearBlue, glow: true});
                v.push({x: -3.5 - t*0.7, y: 4.5 - t*0.8, z: 4.6, c: tearBlue, glow: true});
            }
            // Right tears - angle outward to the right as going down
            for(let t = 0; t < 6; t++) {
                v.push({x: 4 + t*0.6, y: 5 - t*0.8, z: 4.5, c: tearBlue, glow: true});
                v.push({x: 4.5 + t*0.5, y: 5.5 - t*0.8, z: 4.3, c: tearBlue, glow: true});
                v.push({x: 3.5 + t*0.7, y: 4.5 - t*0.8, z: 4.6, c: tearBlue, glow: true});
            }
            
            // === WIDE OPEN LAUGHING MOUTH (no overlapping voxels) ===
            // Top lip (black outline) - brought forward to prevent overlap
            for(let x = -3; x <= 3; x++) {
                v.push({x, y: 4, z: 5.51, c: black});
            }
            // Bottom lip - corners removed
            for(let x = -2; x <= 2; x++) {
                v.push({x, y: 1, z: 5.5, c: black});
            }
            
            // Mouth interior (dark red) - back layer z: 5
            for(let y = 2; y <= 3; y++) {
                for(let x = -2; x <= 2; x++) {
                    v.push({x, y, z: 5, c: '#4A0000'});
                }
            }
            
            // Teeth (top row - white) - front layer z: 5.5
            for(let x = -2; x <= 2; x++) {
                v.push({x, y: 3.5, z: 5.5, c: white});
            }
            
            // Tongue (pink) - middle layer z: 5.3
            v.push({x: -1, y: 1.5, z: 5.3, c: '#FF6B6B'});
            v.push({x: 0, y: 1.5, z: 5.3, c: '#FF6B6B'});
            v.push({x: 1, y: 1.5, z: 5.3, c: '#FF6B6B'});
            
            return v;
        })()
    },
    MOUTH: {
        beak: [{x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'}],
        cigarette: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:2, y:5.5, z:5, c:'white'}, {x:3, y:5.5, z:5.2, c:'white'}, {x:4, y:5.5, z:5.4, c:'white'},
            {x:4.5, y:5.5, z:5.5, c:'red', fx:'smoke'}
        ],
        // Bubblegum - animated grow/pop cycle
        bubblegum: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:0, y:5, z:6, c:'#FF69B4', fx: 'bubblegum', emitter: true}
        ],
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
        ],
        
        // ==================== NEW MOUTH (20 Items) ====================
        
        // Gold Grill
        goldGrill: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:-1, y:5, z:5.2, c:'gold', glow: true}, {x:0, y:5, z:5.3, c:'gold', glow: true}, {x:1, y:5, z:5.2, c:'gold', glow: true}
        ],
        
        // Diamond Grill - sparkling teeth
        diamondGrill: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:-2, y:5, z:5.2, c:'#E0FFFF', glow: true, fx: 'sparkle'},
            {x:-1, y:5, z:5.3, c:'#B9F2FF', glow: true, fx: 'sparkle'}, 
            {x:0, y:5, z:5.4, c:'#FFFFFF', glow: true, fx: 'sparkle'}, 
            {x:1, y:5, z:5.3, c:'#B9F2FF', glow: true, fx: 'sparkle'},
            {x:2, y:5, z:5.2, c:'#E0FFFF', glow: true, fx: 'sparkle'}
        ],
        
        // Lollipop
        lollipop: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:2, y:5, z:5, c:'white'}, {x:3, y:5, z:5.2, c:'white'}, {x:4, y:5, z:5.4, c:'white'},
            {x:5, y:5, z:5.6, c:'#FF69B4'}, {x:5, y:6, z:5.6, c:'#FF69B4'}, {x:5, y:4, z:5.6, c:'#FF69B4'},
            {x:6, y:5, z:5.6, c:'#FF69B4'}, {x:4, y:5, z:5.6, c:'#FF69B4'}
        ],
        
        // Rose in Mouth
        rose: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:2, y:5.5, z:5.2, c:'#228B22'}, {x:3, y:5.5, z:5.4, c:'#228B22'},
            {x:4, y:5.5, z:5.5, c:'#DC143C'}, {x:4, y:6, z:5.5, c:'#DC143C'}, {x:4, y:5, z:5.5, c:'#DC143C'},
            {x:5, y:5.5, z:5.5, c:'#DC143C'}
        ],
        
        // Whistle
        whistle: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:1, y:5, z:5.3, c:'silver'}, {x:2, y:5, z:5.5, c:'silver'}, {x:2, y:5.5, z:5.5, c:'silver'}
        ],
        
        // Bubblegum Pop
        bubblegumPop: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:0, y:5, z:6, c:'#FF69B4'}, {x:0, y:5, z:7, c:'#FF69B4'},
            {x:1, y:5, z:6.5, c:'#FF69B4'}, {x:-1, y:5, z:6.5, c:'#FF69B4'},
            {x:0, y:6, z:6.5, c:'#FF69B4'}, {x:0, y:4, z:6.5, c:'#FF69B4'}
        ],
        
        // Moustache Fancy
        fancyStache: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:-2, y:5, z:5.2, c:'#1a1a1a'}, {x:-3, y:5.5, z:5, c:'#1a1a1a'}, {x:-4, y:6, z:4.8, c:'#1a1a1a'},
            {x:2, y:5, z:5.2, c:'#1a1a1a'}, {x:3, y:5.5, z:5, c:'#1a1a1a'}, {x:4, y:6, z:4.8, c:'#1a1a1a'}
        ],
        
        // Goatee
        goatee: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:0, y:4, z:5.3, c:'#2F1810'}, {x:0, y:3, z:5.2, c:'#2F1810'}, {x:0, y:2, z:5, c:'#2F1810'}
        ],
        
        // Full Beard
        fullBeard: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:-2, y:4, z:5, c:'#3D2314'}, {x:-1, y:4, z:5.2, c:'#3D2314'}, {x:0, y:4, z:5.3, c:'#3D2314'},
            {x:1, y:4, z:5.2, c:'#3D2314'}, {x:2, y:4, z:5, c:'#3D2314'},
            {x:-2, y:3, z:4.8, c:'#3D2314'}, {x:-1, y:3, z:5, c:'#3D2314'}, {x:0, y:3, z:5.1, c:'#3D2314'},
            {x:1, y:3, z:5, c:'#3D2314'}, {x:2, y:3, z:4.8, c:'#3D2314'},
            {x:-1, y:2, z:4.8, c:'#3D2314'}, {x:0, y:2, z:4.9, c:'#3D2314'}, {x:1, y:2, z:4.8, c:'#3D2314'}
        ],
        
        // Buck Teeth - cute oversized front teeth
        buckTeeth: [
            // Beak
            {x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'},
            // Two big front teeth
            {x:-0.5, y:4.5, z:5.3, c:'#FFFAF0'}, {x:0.5, y:4.5, z:5.3, c:'#FFFAF0'},
            {x:-0.5, y:4, z:5.4, c:'#FFFAF0'}, {x:0.5, y:4, z:5.4, c:'#FFFAF0'},
            {x:-0.5, y:3.5, z:5.3, c:'#FFFAF0'}, {x:0.5, y:3.5, z:5.3, c:'#FFFAF0'}
        ],
        
        // Vampire Fangs - proper vampire fangs
        vampireDrool: [
            // Beak
            {x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'},
            // Sharp fangs
            {x:-1.5, y:4.5, z:5.2, c:'#FFFAF0'}, {x:1.5, y:4.5, z:5.2, c:'#FFFAF0'},
            {x:-1.5, y:4, z:5.3, c:'#FFFAF0'}, {x:1.5, y:4, z:5.3, c:'#FFFAF0'},
            {x:-1.5, y:3.5, z:5.2, c:'#FFFAF0'}, {x:1.5, y:3.5, z:5.2, c:'#FFFAF0'},
            // Blood drip
            {x:-1.5, y:3, z:5.3, c:'#8B0000', glow: true}, {x:1.5, y:3, z:5.3, c:'#8B0000', glow: true}
        ],
        
        // Pacifier
        pacifier: [
            {x:0, y:5, z:5.5, c:'#87CEEB'}, {x:0, y:5, z:6, c:'#87CEEB'},
            {x:-1, y:5, z:6, c:'#FFB6C1'}, {x:1, y:5, z:6, c:'#FFB6C1'},
            {x:0, y:6, z:6, c:'#FFB6C1'}, {x:0, y:4, z:6, c:'#FFB6C1'}
        ],
        
        // Drink Cup with Straw - sippy cup held near mouth
        straw: [
            // Beak
            {x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'},
            // Straw going into mouth
            {x:1, y:5, z:5.2, c:'#FF6B6B'}, {x:2, y:4.5, z:5.3, c:'#FF6B6B'},
            // Cup body
            {x:3, y:3, z:5.5, c:'#FFD93D'}, {x:4, y:3, z:5.5, c:'#FFD93D'}, {x:5, y:3, z:5.5, c:'#FFD93D'},
            {x:3, y:2, z:5.5, c:'#FFD93D'}, {x:4, y:2, z:5.5, c:'#FFD93D'}, {x:5, y:2, z:5.5, c:'#FFD93D'},
            {x:3, y:1, z:5.5, c:'#FFD93D'}, {x:4, y:1, z:5.5, c:'#FFD93D'}, {x:5, y:1, z:5.5, c:'#FFD93D'},
            {x:3, y:0, z:5.5, c:'#FFD93D'}, {x:4, y:0, z:5.5, c:'#FFD93D'}, {x:5, y:0, z:5.5, c:'#FFD93D'},
            // Cup lid
            {x:3, y:4, z:5.5, c:'#E74C3C'}, {x:4, y:4, z:5.5, c:'#E74C3C'}, {x:5, y:4, z:5.5, c:'#E74C3C'},
            // Straw in cup
            {x:3, y:4, z:5.5, c:'#FF6B6B'}, {x:3, y:5, z:5.4, c:'#FF6B6B'}
        ],
        
        // Fish Bone
        fishBone: [
            {x:0, y:5.5, z:5, c:'orange'},
            {x:2, y:5.5, z:5.2, c:'white'}, {x:3, y:5.5, z:5.3, c:'white'}, {x:4, y:5.5, z:5.4, c:'white'},
            {x:3, y:6, z:5.3, c:'white'}, {x:3, y:5, z:5.3, c:'white'},
            {x:5, y:5.5, z:5.4, c:'white'}, {x:5, y:6, z:5.4, c:'white'}, {x:5, y:5, z:5.4, c:'white'}
        ],
        
        // Blowing Kiss
        kiss: [
            {x:0, y:5.5, z:5, c:'#FF69B4'},
            {x:2, y:6, z:5.5, c:'#FF69B4', glow: true}
        ],
        
        // LEGENDARY: Fire Breath - animated flame particles shooting forward
        fireBreath: [
            {x:0, y:5.5, z:5, c:'orange'},
            // Fire particle emitter at mouth
            {x:0, y:5, z:5.5, c:'#FF4500', glow: true, fx: 'fireBreath', emitter: true}
        ],
        
        // LEGENDARY: Ice Breath - animated ice particles shooting forward
        iceBreath: [
            {x:0, y:5.5, z:5, c:'orange'},
            // Ice particle emitter at mouth
            {x:0, y:5, z:5.5, c:'#87CEEB', glow: true, fx: 'iceBreath', emitter: true}
        ],
        
        // Cigar - with animated smoke particles
        cigar: [
            {x:0, y:5.5, z:5, c:'orange'},
            // Cigar body (brown)
            {x:2, y:5, z:5, c:'#5D3A1A'}, {x:3, y:5, z:5.2, c:'#8B4513'}, {x:4, y:5, z:5.4, c:'#8B4513'},
            {x:5, y:5, z:5.5, c:'#6B4423'},
            // Cigar band (gold)
            {x:2.5, y:5, z:5.1, c:'#FFD700'},
            // Glowing ember tip
            {x:5.5, y:5, z:5.6, c:'#FF4500', glow: true},
            // Smoke emitter
            {x:6, y:5.5, z:5.6, c:'#AAAAAA', fx: 'cigarSmoke', emitter: true}
        ],
        
        // Medical Mask
        surgicalMask: [
            {x:-2, y:5, z:5.2, c:'#87CEEB'}, {x:-1, y:5, z:5.3, c:'#87CEEB'}, {x:0, y:5, z:5.4, c:'#87CEEB'},
            {x:1, y:5, z:5.3, c:'#87CEEB'}, {x:2, y:5, z:5.2, c:'#87CEEB'},
            {x:-2, y:4, z:5.1, c:'#87CEEB'}, {x:-1, y:4, z:5.2, c:'#87CEEB'}, {x:0, y:4, z:5.3, c:'#87CEEB'},
            {x:1, y:4, z:5.2, c:'#87CEEB'}, {x:2, y:4, z:5.1, c:'#87CEEB'}
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
        })(),
        
        // ==================== NEW BODY ITEMS (20 Items) ====================
        
        // LEGENDARY: Angel Wings - large feathered wings with glow
        angelWings: (() => {
            const v = [];
            // Left wing
            for(let x=-8; x<=-3; x++) for(let y=-2; y<=6; y++) {
                const dist = Math.abs(x+5) + Math.abs(y-2);
                if(dist < 6) {
                    v.push({x, y, z:-5, c:'white', glow: true});
                }
            }
            // Right wing
            for(let x=3; x<=8; x++) for(let y=-2; y<=6; y++) {
                const dist = Math.abs(x-5) + Math.abs(y-2);
                if(dist < 6) {
                    v.push({x, y, z:-5, c:'white', glow: true});
                }
            }
            // Mark for animation
            v.fx = 'wingFlap';
            return v;
        })(),
        
        // LEGENDARY: Demon Wings - dark bat-like wings
        demonWings: (() => {
            const v = [];
            // Left wing
            for(let x=-9; x<=-3; x++) for(let y=-3; y<=5; y++) {
                const dist = Math.abs(x+6) + Math.abs(y-1);
                if(dist < 7) {
                    v.push({x, y, z:-5, c:'#8B0000'});
                }
            }
            // Left wing tip claws
            v.push({x:-9, y:5, z:-5, c:'#1a1a1a'});
            v.push({x:-8, y:4, z:-5, c:'#1a1a1a'});
            // Right wing
            for(let x=3; x<=9; x++) for(let y=-3; y<=5; y++) {
                const dist = Math.abs(x-6) + Math.abs(y-1);
                if(dist < 7) {
                    v.push({x, y, z:-5, c:'#8B0000'});
                }
            }
            // Right wing tip claws
            v.push({x:9, y:5, z:-5, c:'#1a1a1a'});
            v.push({x:8, y:4, z:-5, c:'#1a1a1a'});
            // Mark for animation
            v.fx = 'wingFlap';
            return v;
        })(),
        
        // Jetpack
        jetpack: (() => {
            const v = [];
            // Main body
            for(let x=-3; x<=3; x++) for(let y=-4; y<=2; y++) {
                v.push({x, y, z:-6, c:'#444'});
                v.push({x, y, z:-7, c:'#333'});
            }
            // Thrusters
            v.push({x:-2, y:-5, z:-6, c:'#FF4500', glow: true, fx: 'fire'});
            v.push({x:2, y:-5, z:-6, c:'#FF4500', glow: true, fx: 'fire'});
            v.push({x:-2, y:-6, z:-6, c:'#FFD700', glow: true, fx: 'fire'});
            v.push({x:2, y:-6, z:-6, c:'#FFD700', glow: true, fx: 'fire'});
            return v;
        })(),
        
        // Hoodie (hood down) - with hood bunched at back of neck
        hoodie: (() => {
            let v = [];
            const hoodieColor = '#555555';
            const hoodieStripe = '#444444';
            
            // Main hoodie body
            for(let y=-4; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius && d <= bodyRadius + 1.2) {
                        v.push({x, y, z, c: hoodieColor});
                    }
                }
            }
            
            // Hood bunched up at back of neck (down position)
            for(let x=-4; x<=4; x++) for(let z=-5; z<=-3; z++) {
                v.push({x, y:4, z, c: hoodieColor});
                v.push({x, y:5, z, c: hoodieColor});
            }
            // Hood opening
            for(let x=-3; x<=3; x++) {
                v.push({x, y:5, z:-3, c: hoodieStripe});
            }
            
            // Front pocket
            for(let x=-3; x<=3; x++) {
                v.push({x, y:-2, z:6.5, c: hoodieStripe});
                v.push({x, y:-3, z:6.5, c: hoodieStripe});
            }
            
            // Drawstrings
            v.push({x:-1, y:3, z:6.5, c:'white'});
            v.push({x:-1, y:2, z:6.8, c:'white'});
            v.push({x:1, y:3, z:6.5, c:'white'});
            v.push({x:1, y:2, z:6.8, c:'white'});
            
            return v;
        })(),
        
        // Hoodie (hood up) - covers head, removes hat slot
        // Lab Coat - full coverage with collar and pockets
        labCoat: (() => {
            let v = [];
            // Full coat coverage (front and back)
            for(let y=-6; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius && d <= bodyRadius + 1.3) {
                        v.push({x, y, z, c:'white'});
                    }
                }
            }
            
            // Coat front opening (slightly open, showing dark underneath)
            for(let y=-4; y<3; y++) {
                v.push({x:0, y, z:6.5, c:'#333'});
            }
            
            // Collar (turned up)
            v.push({x:-2, y:4, z:5, c:'white'}); v.push({x:-1, y:4, z:5.5, c:'white'});
            v.push({x:2, y:4, z:5, c:'white'}); v.push({x:1, y:4, z:5.5, c:'white'});
            
            // Chest pocket with pen
            v.push({x:-3, y:2, z:6.5, c:'#EEEEEE'}); v.push({x:-4, y:2, z:6.5, c:'#EEEEEE'});
            v.push({x:-3, y:1, z:6.5, c:'#EEEEEE'}); v.push({x:-4, y:1, z:6.5, c:'#EEEEEE'});
            v.push({x:-3, y:2.5, z:6.6, c:'blue'}); // Pen
            
            // Side pockets
            v.push({x:-4, y:-2, z:6, c:'#EEEEEE'}); v.push({x:-5, y:-2, z:5.5, c:'#EEEEEE'});
            v.push({x:4, y:-2, z:6, c:'#EEEEEE'}); v.push({x:5, y:-2, z:5.5, c:'#EEEEEE'});
            
            // Buttons
            v.push({x:1, y:2, z:6.6, c:'white'}); 
            v.push({x:1, y:0, z:6.6, c:'white'}); 
            v.push({x:1, y:-2, z:6.6, c:'white'});
            
            return v;
        })(),
        
        // EPIC: Tuxedo
        tuxedo: (() => {
            let v = [];
            for(let y=-4; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius && d <= bodyRadius + 1.2) {
                        const isLapel = z > 3 && Math.abs(x) < 4 && y > 0;
                        v.push({x,y,z,c: isLapel ? 'white' : '#1a1a1a'});
                    }
                }
            }
            // Bowtie
            v.push({x:0, y:3, z:6, c:'red'}); 
            v.push({x:-1, y:3, z:5.8, c:'red'}); v.push({x:1, y:3, z:5.8, c:'red'});
            return v;
        })(),
        
        // Hawaiian Shirt - full coverage with tropical pattern
        hawaiianShirt: (() => {
            let v = [];
            const baseColor = '#FF6B6B'; // Coral base
            const flowerColors = ['#FFD93D', '#6BCB77', '#4D96FF', '#FF6B6B'];
            
            // Full shirt coverage (front AND back)
            for(let y=-4; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius && d <= bodyRadius + 1.2) {
                        // Create floral pattern
                        const pattern = ((x + y * 3 + z * 7) % 7);
                        const color = pattern < 2 ? flowerColors[pattern % flowerColors.length] : baseColor;
                        v.push({x, y, z, c: color});
                    }
                }
            }
            
            // Open collar showing chest
            for(let y=2; y<4; y++) {
                v.push({x:-2, y, z:6, c:'#333'});
                v.push({x:-1, y, z:6.2, c:'#333'});
                v.push({x:0, y, z:6.3, c:'#333'});
                v.push({x:1, y, z:6.2, c:'#333'});
                v.push({x:2, y, z:6, c:'#333'});
            }
            
            // Collar points
            v.push({x:-3, y:3, z:5.5, c: baseColor});
            v.push({x:3, y:3, z:5.5, c: baseColor});
            
            return v;
        })(),
        
        // Leather Jacket
        leatherJacket: (() => {
            let v = [];
            for(let y=-4; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius && d <= bodyRadius + 1.2) v.push({x,y,z,c:'#2F1810'});
                }
            }
            // Zipper
            for(let y=-3; y<3; y++) v.push({x:0, y, z:6.5, c:'silver'});
            return v;
        })(),
        
        // Superhero Cape (Red)
        superheroCape: (() => {
            let v = [];
            for(let x=-6; x<=6; x++) for(let y=-8; y<4; y++) {
                const depth = y < 0 ? -6 - Math.abs(y)*0.15 : -6;
                v.push({x, y, z:depth, c:'#DC143C'});
            }
            // Gold trim
            for(let x=-6; x<=6; x++) v.push({x, y:3, z:-6, c:'gold'});
            return v;
        })(),
        
        // Wizard Robe
        wizardRobe: (() => {
            let v = [];
            for(let y=-7; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 40 - y*y*0.6));
                for(let x=-8; x<=8; x++) for(let z=-8; z<=8; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius - 1 && d <= bodyRadius + 1) v.push({x,y,z,c:'#4B0082'});
                }
            }
            // Stars
            v.push({x:3, y:0, z:6, c:'gold', glow: true});
            v.push({x:-2, y:-3, z:5.5, c:'gold', glow: true});
            return v;
        })(),
        
        // Biker Vest
        bikerVest: (() => {
            let v = [];
            for(let y=-2; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                for(let x=-7; x<=7; x++) for(let z=-7; z<=0; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius && d <= bodyRadius + 1.2) v.push({x,y,z,c:'#1a1a1a'});
                }
            }
            // Skull emblem on back
            v.push({x:0, y:1, z:-7, c:'white'}); v.push({x:0, y:2, z:-7, c:'white'});
            return v;
        })(),
        
        // Sash (Royal)
        royalSash: (() => {
            let v = [];
            // Diagonal sash
            for(let i=0; i<10; i++) {
                const x = -4 + i * 0.5;
                const y = 3 - i * 0.7;
                v.push({x:Math.round(x), y:Math.round(y), z:6, c:'#8B0000'});
            }
            // Medal
            v.push({x:3, y:-3, z:6.5, c:'gold', glow: true});
            return v;
        })(),
        
        // EPIC: Samurai Armor
        samuraiArmor: (() => {
            let v = [];
            // Chest plate
            for(let y=-2; y<4; y++) for(let x=-5; x<=5; x++) for(let z=4; z<=6; z++) {
                if(Math.abs(x) > 2 || y < 2) v.push({x, y, z, c:'#8B0000'});
            }
            // Shoulder pads
            for(let x=-7; x<=-4; x++) for(let y=2; y<=4; y++) v.push({x, y, z:0, c:'#8B0000'});
            for(let x=4; x<=7; x++) for(let y=2; y<=4; y++) v.push({x, y, z:0, c:'#8B0000'});
            return v;
        })(),
        
        // Pirate Coat
        pirateCoat: (() => {
            let v = [];
            for(let y=-6; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius && d <= bodyRadius + 1.3) v.push({x,y,z,c:'#8B0000'});
                }
            }
            // Gold buttons
            for(let y=-2; y<3; y+=2) v.push({x:2, y, z:6.5, c:'gold'});
            return v;
        })(),
        
        // Astronaut Suit - sleeker form-fitting design
        astronautSuit: (() => {
            let v = [];
            // Slimmer suit that follows body contour more closely
            for(let y=-5; y<4; y++) {
                const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
                for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                    const d = Math.sqrt(x*x+z*z);
                    if(d >= bodyRadius && d <= bodyRadius + 1.0) {
                        v.push({x, y, z, c:'white'});
                    }
                }
            }
            
            // Orange/blue accent stripes
            for(let y=-4; y<3; y++) {
                v.push({x:-6, y, z:0, c:'#FF6600'});
                v.push({x:6, y, z:0, c:'#FF6600'});
            }
            
            // NASA-style logo patch area
            v.push({x:-3, y:2, z:6.5, c:'#0066CC'}); v.push({x:-2, y:2, z:6.5, c:'#0066CC'}); 
            v.push({x:-3, y:1, z:6.5, c:'#0066CC'}); v.push({x:-2, y:1, z:6.5, c:'#0066CC'});
            
            // Flag patch on arm
            v.push({x:5, y:2, z:3, c:'red'}); v.push({x:6, y:2, z:3, c:'white'}); v.push({x:6, y:3, z:3, c:'blue'});
            
            // Life support connector
            v.push({x:0, y:3, z:-6, c:'#C0C0C0'});
            v.push({x:0, y:2, z:-6.5, c:'#C0C0C0'});
            
            return v;
        })(),
        
        // LEGENDARY: Lightning Aura - electric bolts circling body
        lightningAura: (() => {
            let v = [];
            // Electric bolts around body in a circle
            for(let i=0; i<8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const x = Math.round(Math.cos(angle) * 8);
                const z = Math.round(Math.sin(angle) * 8);
                v.push({x, y:2, z, c:'#00FFFF', glow: true, fx: 'lightning'});
                v.push({x, y:0, z, c:'#FFFFFF', glow: true, fx: 'lightning'});
                v.push({x, y:-2, z, c:'#00FFFF', glow: true, fx: 'lightning'});
            }
            return v;
        })(),
        
        // LEGENDARY: Fire Aura - flames circling body
        fireAura: (() => {
            let v = [];
            for(let i=0; i<12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const x = Math.round(Math.cos(angle) * 8);
                const z = Math.round(Math.sin(angle) * 8);
                v.push({x, y:-4, z, c:'#FF4500', glow: true, fx: 'fire'});
                v.push({x, y:-3, z, c:'#FF6600', glow: true, fx: 'fire'});
                v.push({x, y:-2, z, c:'#FFAA00', glow: true, fx: 'fire'});
                v.push({x, y:-1, z, c:'#FFD700', glow: true, fx: 'fire'});
            }
            return v;
        })(),
        
        // Suspenders
        suspenders: [
            {x:-2, y:-4, z:6, c:'red'}, {x:-2, y:-2, z:6, c:'red'}, {x:-2, y:0, z:6, c:'red'},
            {x:-2, y:2, z:5.5, c:'red'}, {x:-2, y:3, z:5, c:'red'},
            {x:2, y:-4, z:6, c:'red'}, {x:2, y:-2, z:6, c:'red'}, {x:2, y:0, z:6, c:'red'},
            {x:2, y:2, z:5.5, c:'red'}, {x:2, y:3, z:5, c:'red'}
        ],
        
        // Apron
        apron: (() => {
            let v = [];
            for(let y=-5; y<3; y++) for(let x=-4; x<=4; x++) {
                v.push({x, y, z:6.5, c:'white'});
            }
            // Pocket
            v.push({x:-1, y:-2, z:6.8, c:'white'}); v.push({x:0, y:-2, z:6.8, c:'white'}); v.push({x:1, y:-2, z:6.8, c:'white'});
            return v;
        })(),
        
        // Barrel (funny) - properly sized wooden barrel
        barrel: (() => {
            let v = [];
            const woodLight = '#C19A6B';
            const woodDark = '#8B4513';
            const metalBand = '#4A4A4A';
            
            // Larger barrel body - covers penguin properly
            for(let y=-7; y<=2; y++) {
                // Barrel bulges in middle
                const bulge = 1 - Math.abs((y + 2.5) / 5) * 0.25;
                const radius = 7 * bulge;
                
                for(let x=-8; x<=8; x++) for(let z=-8; z<=8; z++) {
                    const d = Math.sqrt(x*x + z*z);
                    if(d >= radius - 1.2 && d <= radius) {
                        // Alternating plank colors
                        const angle = Math.atan2(z, x);
                        const plankIndex = Math.floor((angle + Math.PI) / (Math.PI / 4));
                        const color = plankIndex % 2 === 0 ? woodLight : woodDark;
                        v.push({x, y, z, c: color});
                    }
                }
            }
            
            // Top rim (thicker)
            for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                const d = Math.sqrt(x*x + z*z);
                if(d >= 5.5 && d <= 7) {
                    v.push({x, y:3, z, c: woodDark});
                }
            }
            
            // Metal bands (wider and more visible)
            for(let x=-8; x<=8; x++) for(let z=-8; z<=8; z++) {
                const d = Math.sqrt(x*x + z*z);
                if(d >= 6 && d <= 7.2) {
                    v.push({x, y:-5, z, c: metalBand});
                    v.push({x, y:-1, z, c: metalBand});
                    v.push({x, y:1, z, c: metalBand});
                }
            }
            
            // Suspender straps (holding it up) - thicker
            for(let i=0; i<4; i++) {
                v.push({x:-3, y:3+i, z:5-i*0.5, c:'#654321'});
                v.push({x:3, y:3+i, z:5-i*0.5, c:'#654321'});
            }
            
             return v;
        })()
    },
    
    // ==================== MOUNTS ====================
    MOUNTS: {
        none: { voxels: [], animated: false },
        
        // LEGENDARY: Minecraft Boat - simple solid rectangular boat
        minecraftBoat: {
            voxels: (() => {
                const v = [];
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
                
                // Simple rectangular boat dimensions
                const halfWidth = 8;  // x: -8 to 8
                const halfLength = 10; // z: -10 to 10
                const depth = 4;
                
                // SOLID BOTTOM - fill every voxel
                for(let x=-halfWidth; x<=halfWidth; x++) {
                    for(let z=-halfLength; z<=halfLength; z++) {
                        addVoxel(x, -depth, z, woodColor);
                    }
                }
                
                // SOLID WALLS - left, right, front, back (multiple layers thick)
                for(let y=-depth+1; y<=0; y++) {
                    // Left wall (solid 2 thick)
                    for(let z=-halfLength; z<=halfLength; z++) {
                        addVoxel(-halfWidth, y, z, darkWood);
                        addVoxel(-halfWidth-1, y, z, darkWood);
                    }
                    // Right wall (solid 2 thick)
                    for(let z=-halfLength; z<=halfLength; z++) {
                        addVoxel(halfWidth, y, z, darkWood);
                        addVoxel(halfWidth+1, y, z, darkWood);
                    }
                    // Back wall (stern)
                    for(let x=-halfWidth; x<=halfWidth; x++) {
                        addVoxel(x, y, halfLength, darkWood);
                        addVoxel(x, y, halfLength+1, darkWood);
                    }
                    // Front wall (bow) - pointed
                    for(let x=-halfWidth+2; x<=halfWidth-2; x++) {
                        addVoxel(x, y, -halfLength, darkWood);
                    }
                }
                
                // Pointed bow (front triangular extension)
                for(let y=-depth+1; y<=0; y++) {
                    addVoxel(0, y, -halfLength-1, darkWood);
                    addVoxel(0, y, -halfLength-2, darkWood);
                    addVoxel(-1, y, -halfLength-1, darkWood);
                    addVoxel(1, y, -halfLength-1, darkWood);
                }
                
                // Top rim (lip all around)
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
            // Oar voxels - angled down towards ground
            leftOar: (() => {
                const v = [];
                // Oar shaft - horizontal from oarlock, then angles down
                for(let i=0; i<10; i++) {
                    const xPos = -11 - i;
                    const yPos = 0 - i * 0.3;
                    v.push({x: xPos, y: Math.round(yPos), z:0, c:'#DEB887'});
                }
                // Oar blade (paddle at end)
                for(let j=-2; j<=2; j++) {
                    v.push({x:-20, y:-3, z:j, c:'#8B4513'});
                    v.push({x:-21, y:-3, z:j, c:'#8B4513'});
                }
                return v;
            })(),
            rightOar: (() => {
                const v = [];
                // Oar shaft - horizontal from oarlock, then angles down
                for(let i=0; i<10; i++) {
                    const xPos = 11 + i;
                    const yPos = 0 - i * 0.3;
                    v.push({x: xPos, y: Math.round(yPos), z:0, c:'#DEB887'});
                }
                // Oar blade (paddle at end)
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
    }
};

