/**
 * Body Assets - All body/clothing customization options
 * Contains voxel data for penguin body accessories and clothing
 */

export const BODY = {
    none: [],
    
    scarf: (() => {
        const voxelMap = new Map();
        const addVoxel = (x, y, z, c) => {
            const key = `${x},${y},${z}`;
            if (!voxelMap.has(key)) voxelMap.set(key, {x, y, z, c});
        };
        const scarfColor = '#8B2252';
        const scarfStripe = '#D4A574';
        for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) {
            const d = Math.sqrt(x*x+z*z);
            if(d > 5.5 && d < 6.8) {
                const stripe = (x + z) % 5 === 0;
                addVoxel(x, 4, z, stripe ? scarfStripe : scarfColor);
            }
        }
        addVoxel(2, 3, 6, scarfColor);
        addVoxel(2, 2, 6.5, scarfStripe);
        addVoxel(2, 1, 7, scarfColor);
        addVoxel(2, 0, 7, scarfColor);
        addVoxel(2, -1, 7.5, scarfStripe);
        addVoxel(2, -2, 7.5, scarfColor);
        return Array.from(voxelMap.values());
    })(),
    
    bowtie: [
        {x:0, y:4, z:5.5, c:'red'}, 
        {x:-1, y:4.2, z:5.3, c:'red'}, {x:1, y:4.2, z:5.3, c:'red'},
        {x:-2, y:4.5, z:5, c:'red'}, {x:2, y:4.5, z:5, c:'red'}
    ],
    
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
        const gold = '#FFD700';
        const goldDark = '#B8860B';
        const goldLight = '#FFEC8B';
        const diamond = '#E0FFFF';
        for(let x=-6; x<=6; x++) for(let z=-6; z<=6; z++) {
            const d = Math.sqrt(x*x+z*z);
            if(d > 5.6 && d < 6.8) {
                const isOuter = d > 6.2;
                addVoxel(x, 4, z, isOuter ? goldDark : gold);
            }
        }
        for(let x=-5; x<=5; x++) for(let z=3; z<=6; z++) {
            const d = Math.sqrt(x*x+z*z);
            if(d > 5.6 && d < 6.5) {
                addVoxel(x, 3, z, goldDark);
            }
        }
        for(let x=-4; x<=4; x++) for(let z=4; z<=6; z++) {
            const d = Math.sqrt(x*x+z*z);
            if(d > 5.8 && d < 6.3 && (x + z) % 3 === 0) {
                addVoxel(x, 5, z, goldLight);
            }
        }
        addVoxel(-2, 3, 7, gold);
        addVoxel(2, 3, 7, gold);
        addVoxel(-2, 2, 7, goldDark);
        addVoxel(2, 2, 7, goldDark);
        addVoxel(-1, 1, 7, gold);
        addVoxel(1, 1, 7, gold);
        addVoxel(0, 0, 7, goldDark);
        addVoxel(0, -1, 7, gold);
        const py = -3;
        const pz = 8;
        for(let mx=-2; mx<=2; mx++) for(let my=-2; my<=2; my++) {
            const d = Math.sqrt(mx*mx + my*my);
            if(d >= 1.5 && d <= 2.5) {
                addVoxel(mx, py + my, pz, gold);
            }
        }
        addVoxel(-1, py, pz, goldDark);
        addVoxel(1, py, pz, goldDark);
        addVoxel(0, py - 1, pz, goldDark);
        addVoxel(0, py + 1, pz, goldDark);
        addVoxel(0, py, pz + 1, diamond, true);
        addVoxel(0, py + 1, pz + 1, goldLight);
        addVoxel(0, py - 1, pz + 1, goldLight);
        for(let mx=-1; mx<=1; mx++) for(let my=-1; my<=1; my++) {
            addVoxel(mx, py + my, pz - 1, goldDark);
        }
        return Array.from(voxelMap.values());
    })(),
    
    tie: [
         {x:0, y:4, z:5.5, c:'red'}, {x:0, y:3, z:5.8, c:'red'}, 
         {x:0, y:2, z:6, c:'red'}, {x:0, y:1, z:6, c:'red'},
         {x:0, y:0, z:6, c:'red'}, {x:-0.5, y:-0.5, z:5.8, c:'red'}, {x:0.5, y:-0.5, z:5.8, c:'red'}
    ],
    
    shirtWhite: (() => {
         let v = [];
         for(let y=-4; y<4; y++) {
             const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
             const innerR = bodyRadius;
             const outerR = bodyRadius + 1.2;
             for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                 const d = Math.sqrt(x*x+z*z);
                 if(d >= innerR && d <= outerR && !(z > 3 && x > -3 && x < 3)) {
                     v.push({x,y,z,c:'white'});
                 }
             }
         }
         return v;
    })(),
    
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
         v.push({x:-2, y:1, z:5.5, c:'blue'}, {x:2, y:1, z:5.5, c:'blue'});
         v.push({x:-2, y:2, z:5.2, c:'blue'}, {x:2, y:2, z:5.2, c:'blue'});
         v.push({x:-2, y:3, z:5, c:'blue'}, {x:2, y:3, z:5, c:'blue'});
         v.push({x:-2, y:3, z:5.3, c:'gold'}, {x:2, y:3, z:5.3, c:'gold'});
         return v;
    })(),
    
    bikini: [
         {x:-2, y:1, z:5.8, c:'pink'}, {x:2, y:1, z:5.8, c:'pink'},
         {x:0, y:-5, z:5.5, c:'pink'}, {x:-1, y:-5, z:5.3, c:'pink'}, {x:1, y:-5, z:5.3, c:'pink'}
    ],
    
    backpack: (() => {
         let v = [];
         for(let x=-3; x<=3; x++) for(let y=-2; y<4; y++) {
             v.push({x, y, z:-6, c:'brown'});
             v.push({x, y, z:-7, c:'brown'});
         }
         v.push({x:-2, y:4, z:-5, c:'brown'}, {x:2, y:4, z:-5, c:'brown'});
         return v;
    })(),
    
    cape: (() => {
         let v = [];
         for(let x=-5; x<=5; x++) for(let y=-7; y<4; y++) {
             const depth = y < 0 ? -6 - Math.abs(y)*0.1 : -6;
             v.push({x, y, z:depth, c:'red'});
         }
         return v;
    })(),
    
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
    
    guitar: (() => {
        const voxelMap = new Map();
        const addVoxel = (x, y, z, c) => {
            const key = `${Math.round(x*2)/2},${Math.round(y*2)/2},${Math.round(z*2)/2}`;
            if (!voxelMap.has(key)) voxelMap.set(key, {x, y, z, c});
        };
        const bodyWood = '#8B4513';
        const neck = '#DEB887';
        const soundHole = '#1A1A1A';
        const headstock = '#2F1810';
        const tuners = '#FFD700';
        const strap = '#2F1810';
        for(let lx=-2; lx<=2; lx++) for(let ly=-3; ly<=0; ly++) {
            const d = lx*lx + ly*ly;
            if(d <= 5) addVoxel(4+lx, ly-1, 6, bodyWood);
        }
        for(let lx=-2; lx<=2; lx++) for(let ly=0; ly<=2; ly++) {
            const d = lx*lx + ly*ly;
            if(d <= 4) addVoxel(4+lx, ly+1, 6, bodyWood);
        }
        addVoxel(4, 0, 6.5, soundHole);
        addVoxel(3, 0, 6.3, '#FFD700');
        addVoxel(5, 0, 6.3, '#FFD700');
        addVoxel(4, -2, 6.3, headstock);
        for(let ny=3; ny<9; ny++) {
            addVoxel(4, ny, 6, neck);
        }
        addVoxel(4, 9, 6, headstock);
        addVoxel(4, 10, 6, headstock);
        addVoxel(3, 9, 6, tuners);
        addVoxel(3, 10, 6, tuners);
        addVoxel(5, 9, 6, tuners);
        addVoxel(5, 10, 6, tuners);
        addVoxel(2, 3, 5, strap);
        addVoxel(1, 4, 4, strap);
        addVoxel(0, 5, 3, strap);
        addVoxel(-1, 5, 2, strap);
        addVoxel(-2, 4, -2, strap);
        addVoxel(-3, 3, -4, strap);
        return Array.from(voxelMap.values());
    })(),
    
    sword: (() => {
        const voxelMap = new Map();
        const addVoxel = (x, y, z, c, glow) => {
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
        for(let y=-5; y<2; y++) {
            addVoxel(8, y, -1, scabbard);
        }
        addVoxel(9, -4, -1, hiltGold);
        addVoxel(9, 0, -1, hiltGold);
        for(let y=2; y<=10; y++) {
            addVoxel(8, y, 0, blade);
        }
        addVoxel(8, 2, -2, hiltGold);
        addVoxel(8, 2, -1, hiltGold);
        addVoxel(8, 2, 1, hiltGold);
        addVoxel(8, 2, 2, hiltGold);
        addVoxel(8, 1, 0, leather);
        addVoxel(8, 0, 0, leather);
        addVoxel(8, -1, 0, leather);
        addVoxel(8, -2, 0, hiltGold);
        addVoxel(8, -3, 0, gem, true);
        addVoxel(7, -4, 0, leather);
        addVoxel(6, -4, 0, hiltGold);
        return Array.from(voxelMap.values());
    })(),
    
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
        for(let i = 0; i < 8; i++) {
            addVoxel(6, i - 2, 5, woodHandle);
        }
        addVoxel(6, 6, 5, ferrule);
        addVoxel(6, 7, 5, ferrule);
        const paintColors = ['#FFFFFF', '#1E90FF', '#4A3728', '#228B22', '#8B0000'];
        for(let bx = -1; bx <= 1; bx++) {
            for(let by = 0; by < 3; by++) {
                const color = paintColors[(bx + by + 2) % paintColors.length];
                addVoxel(6 + bx, 8 + by, 5, by === 0 ? bristleBase : color);
            }
        }
        addVoxel(6, 11, 5, '#FFFFFF');
        const paletteWood = '#DEB887';
        for(let px = -3; px <= 1; px++) {
            for(let pz = -2; pz <= 2; pz++) {
                const dist = (px * px) / 4 + (pz * pz) / 3;
                if(dist < 2.5) {
                    addVoxel(-5 + px, 1, 4 + pz, paletteWood);
                }
            }
        }
        addVoxel(-7, 1, 4, '#1A1A1A');
        addVoxel(-5, 1.5, 3, '#FFFFFF');
        addVoxel(-4, 1.5, 3, '#FFD700');
        addVoxel(-6, 1.5, 5, '#1E90FF');
        addVoxel(-5, 1.5, 5, '#228B22');
        addVoxel(-4, 1.5, 5, '#8B0000');
        addVoxel(-6, 1.5, 3, '#4A3728');
        return Array.from(voxelMap.values());
    })(),
    
    shield: (() => {
         let v = [];
         for(let y=-2; y<3; y++) for(let z=-2; z<3; z++) {
             v.push({x:-8, y, z, c:'silver'});
         }
         v.push({x:-8.5, y:0, z:0, c:'gold'});
         return v;
    })(),
    
    tutu: (() => {
         let v = [];
         const y = -5;
         const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.9));
         for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
             const d = Math.sqrt(x*x+z*z);
             if(d > bodyRadius && d < bodyRadius + 3) {
                 v.push({x, y, z, c:'pink'});
                 if((x+z) % 2 === 0) v.push({x, y:-4.5, z, c:'pink'});
             }
         }
         return v;
    })(),
    
    angelWings: (() => {
        const v = [];
        for(let x=-8; x<=-3; x++) for(let y=-2; y<=6; y++) {
            const dist = Math.abs(x+5) + Math.abs(y-2);
            if(dist < 6) {
                v.push({x, y, z:-5, c:'white', glow: true});
            }
        }
        for(let x=3; x<=8; x++) for(let y=-2; y<=6; y++) {
            const dist = Math.abs(x-5) + Math.abs(y-2);
            if(dist < 6) {
                v.push({x, y, z:-5, c:'white', glow: true});
            }
        }
        v.fx = 'wingFlap';
        return v;
    })(),
    
    demonWings: (() => {
        const v = [];
        for(let x=-9; x<=-3; x++) for(let y=-3; y<=5; y++) {
            const dist = Math.abs(x+6) + Math.abs(y-1);
            if(dist < 7) {
                v.push({x, y, z:-5, c:'#8B0000'});
            }
        }
        v.push({x:-9, y:5, z:-5, c:'#1a1a1a'});
        v.push({x:-8, y:4, z:-5, c:'#1a1a1a'});
        for(let x=3; x<=9; x++) for(let y=-3; y<=5; y++) {
            const dist = Math.abs(x-6) + Math.abs(y-1);
            if(dist < 7) {
                v.push({x, y, z:-5, c:'#8B0000'});
            }
        }
        v.push({x:9, y:5, z:-5, c:'#1a1a1a'});
        v.push({x:8, y:4, z:-5, c:'#1a1a1a'});
        v.fx = 'wingFlap';
        return v;
    })(),
    
    jetpack: (() => {
        const v = [];
        for(let x=-3; x<=3; x++) for(let y=-4; y<=2; y++) {
            v.push({x, y, z:-6, c:'#444'});
            v.push({x, y, z:-7, c:'#333'});
        }
        v.push({x:-2, y:-5, z:-6, c:'#FF4500', glow: true, fx: 'fire'});
        v.push({x:2, y:-5, z:-6, c:'#FF4500', glow: true, fx: 'fire'});
        v.push({x:-2, y:-6, z:-6, c:'#FFD700', glow: true, fx: 'fire'});
        v.push({x:2, y:-6, z:-6, c:'#FFD700', glow: true, fx: 'fire'});
        return v;
    })(),
    
    hoodie: (() => {
        let v = [];
        const hoodieColor = '#555555';
        const hoodieStripe = '#444444';
        for(let y=-4; y<4; y++) {
            const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
            for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d >= bodyRadius && d <= bodyRadius + 1.2) {
                    v.push({x, y, z, c: hoodieColor});
                }
            }
        }
        for(let x=-4; x<=4; x++) for(let z=-5; z<=-3; z++) {
            v.push({x, y:4, z, c: hoodieColor});
            v.push({x, y:5, z, c: hoodieColor});
        }
        for(let x=-3; x<=3; x++) {
            v.push({x, y:5, z:-3, c: hoodieStripe});
        }
        for(let x=-3; x<=3; x++) {
            v.push({x, y:-2, z:6.5, c: hoodieStripe});
            v.push({x, y:-3, z:6.5, c: hoodieStripe});
        }
        v.push({x:-1, y:3, z:6.5, c:'white'});
        v.push({x:-1, y:2, z:6.8, c:'white'});
        v.push({x:1, y:3, z:6.5, c:'white'});
        v.push({x:1, y:2, z:6.8, c:'white'});
        return v;
    })(),
    
    labCoat: (() => {
        let v = [];
        for(let y=-6; y<4; y++) {
            const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
            for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d >= bodyRadius && d <= bodyRadius + 1.3) {
                    v.push({x, y, z, c:'white'});
                }
            }
        }
        for(let y=-4; y<3; y++) {
            v.push({x:0, y, z:6.5, c:'#333'});
        }
        v.push({x:-2, y:4, z:5, c:'white'}); v.push({x:-1, y:4, z:5.5, c:'white'});
        v.push({x:2, y:4, z:5, c:'white'}); v.push({x:1, y:4, z:5.5, c:'white'});
        v.push({x:-3, y:2, z:6.5, c:'#EEEEEE'}); v.push({x:-4, y:2, z:6.5, c:'#EEEEEE'});
        v.push({x:-3, y:1, z:6.5, c:'#EEEEEE'}); v.push({x:-4, y:1, z:6.5, c:'#EEEEEE'});
        v.push({x:-3, y:2.5, z:6.6, c:'blue'});
        v.push({x:-4, y:-2, z:6, c:'#EEEEEE'}); v.push({x:-5, y:-2, z:5.5, c:'#EEEEEE'});
        v.push({x:4, y:-2, z:6, c:'#EEEEEE'}); v.push({x:5, y:-2, z:5.5, c:'#EEEEEE'});
        v.push({x:1, y:2, z:6.6, c:'white'}); 
        v.push({x:1, y:0, z:6.6, c:'white'}); 
        v.push({x:1, y:-2, z:6.6, c:'white'});
        return v;
    })(),
    
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
        v.push({x:0, y:3, z:6, c:'red'}); 
        v.push({x:-1, y:3, z:5.8, c:'red'}); v.push({x:1, y:3, z:5.8, c:'red'});
        return v;
    })(),
    
    hawaiianShirt: (() => {
        let v = [];
        const baseColor = '#FF6B6B';
        const flowerColors = ['#FFD93D', '#6BCB77', '#4D96FF', '#FF6B6B'];
        for(let y=-4; y<4; y++) {
            const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
            for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d >= bodyRadius && d <= bodyRadius + 1.2) {
                    const pattern = ((x + y * 3 + z * 7) % 7);
                    const color = pattern < 2 ? flowerColors[pattern % flowerColors.length] : baseColor;
                    v.push({x, y, z, c: color});
                }
            }
        }
        for(let y=2; y<4; y++) {
            v.push({x:-2, y, z:6, c:'#333'});
            v.push({x:-1, y, z:6.2, c:'#333'});
            v.push({x:0, y, z:6.3, c:'#333'});
            v.push({x:1, y, z:6.2, c:'#333'});
            v.push({x:2, y, z:6, c:'#333'});
        }
        v.push({x:-3, y:3, z:5.5, c: baseColor});
        v.push({x:3, y:3, z:5.5, c: baseColor});
        return v;
    })(),
    
    leatherJacket: (() => {
        let v = [];
        for(let y=-4; y<4; y++) {
            const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
            for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d >= bodyRadius && d <= bodyRadius + 1.2) v.push({x,y,z,c:'#2F1810'});
            }
        }
        for(let y=-3; y<3; y++) v.push({x:0, y, z:6.5, c:'silver'});
        return v;
    })(),
    
    superheroCape: (() => {
        let v = [];
        for(let x=-6; x<=6; x++) for(let y=-8; y<4; y++) {
            const depth = y < 0 ? -6 - Math.abs(y)*0.15 : -6;
            v.push({x, y, z:depth, c:'#DC143C'});
        }
        for(let x=-6; x<=6; x++) v.push({x, y:3, z:-6, c:'gold'});
        return v;
    })(),
    
    wizardRobe: (() => {
        let v = [];
        for(let y=-7; y<4; y++) {
            const bodyRadius = Math.sqrt(Math.max(0, 40 - y*y*0.6));
            for(let x=-8; x<=8; x++) for(let z=-8; z<=8; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d >= bodyRadius - 1 && d <= bodyRadius + 1) v.push({x,y,z,c:'#4B0082'});
            }
        }
        v.push({x:3, y:0, z:6, c:'gold', glow: true});
        v.push({x:-2, y:-3, z:5.5, c:'gold', glow: true});
        return v;
    })(),
    
    bikerVest: (() => {
        let v = [];
        for(let y=-2; y<4; y++) {
            const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
            for(let x=-7; x<=7; x++) for(let z=-7; z<=0; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d >= bodyRadius && d <= bodyRadius + 1.2) v.push({x,y,z,c:'#1a1a1a'});
            }
        }
        v.push({x:0, y:1, z:-7, c:'white'}); v.push({x:0, y:2, z:-7, c:'white'});
        return v;
    })(),
    
    royalSash: (() => {
        let v = [];
        for(let i=0; i<10; i++) {
            const x = -4 + i * 0.5;
            const y = 3 - i * 0.7;
            v.push({x:Math.round(x), y:Math.round(y), z:6, c:'#8B0000'});
        }
        v.push({x:3, y:-3, z:6.5, c:'gold', glow: true});
        return v;
    })(),
    
    samuraiArmor: (() => {
        let v = [];
        for(let y=-2; y<4; y++) for(let x=-5; x<=5; x++) for(let z=4; z<=6; z++) {
            if(Math.abs(x) > 2 || y < 2) v.push({x, y, z, c:'#8B0000'});
        }
        for(let x=-7; x<=-4; x++) for(let y=2; y<=4; y++) v.push({x, y, z:0, c:'#8B0000'});
        for(let x=4; x<=7; x++) for(let y=2; y<=4; y++) v.push({x, y, z:0, c:'#8B0000'});
        return v;
    })(),
    
    pirateCoat: (() => {
        let v = [];
        for(let y=-6; y<4; y++) {
            const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
            for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d >= bodyRadius && d <= bodyRadius + 1.3) v.push({x,y,z,c:'#8B0000'});
            }
        }
        for(let y=-2; y<3; y+=2) v.push({x:2, y, z:6.5, c:'gold'});
        return v;
    })(),
    
    astronautSuit: (() => {
        let v = [];
        for(let y=-5; y<4; y++) {
            const bodyRadius = Math.sqrt(Math.max(0, 36 - y*y*0.8));
            for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
                const d = Math.sqrt(x*x+z*z);
                if(d >= bodyRadius && d <= bodyRadius + 1.0) {
                    v.push({x, y, z, c:'white'});
                }
            }
        }
        for(let y=-4; y<3; y++) {
            v.push({x:-6, y, z:0, c:'#FF6600'});
            v.push({x:6, y, z:0, c:'#FF6600'});
        }
        v.push({x:-3, y:2, z:6.5, c:'#0066CC'}); v.push({x:-2, y:2, z:6.5, c:'#0066CC'}); 
        v.push({x:-3, y:1, z:6.5, c:'#0066CC'}); v.push({x:-2, y:1, z:6.5, c:'#0066CC'});
        v.push({x:5, y:2, z:3, c:'red'}); v.push({x:6, y:2, z:3, c:'white'}); v.push({x:6, y:3, z:3, c:'blue'});
        v.push({x:0, y:3, z:-6, c:'#C0C0C0'});
        v.push({x:0, y:2, z:-6.5, c:'#C0C0C0'});
        return v;
    })(),
    
    lightningAura: (() => {
        let v = [];
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
    
    suspenders: [
        {x:-2, y:-4, z:6, c:'red'}, {x:-2, y:-2, z:6, c:'red'}, {x:-2, y:0, z:6, c:'red'},
        {x:-2, y:2, z:5.5, c:'red'}, {x:-2, y:3, z:5, c:'red'},
        {x:2, y:-4, z:6, c:'red'}, {x:2, y:-2, z:6, c:'red'}, {x:2, y:0, z:6, c:'red'},
        {x:2, y:2, z:5.5, c:'red'}, {x:2, y:3, z:5, c:'red'}
    ],
    
    apron: (() => {
        let v = [];
        for(let y=-5; y<3; y++) for(let x=-4; x<=4; x++) {
            v.push({x, y, z:6.5, c:'white'});
        }
        v.push({x:-1, y:-2, z:6.8, c:'white'}); v.push({x:0, y:-2, z:6.8, c:'white'}); v.push({x:1, y:-2, z:6.8, c:'white'});
        return v;
    })(),
    
    barrel: (() => {
        let v = [];
        const woodLight = '#C19A6B';
        const woodDark = '#8B4513';
        const metalBand = '#4A4A4A';
        for(let y=-7; y<=2; y++) {
            const bulge = 1 - Math.abs((y + 2.5) / 5) * 0.25;
            const radius = 7 * bulge;
            for(let x=-8; x<=8; x++) for(let z=-8; z<=8; z++) {
                const d = Math.sqrt(x*x + z*z);
                if(d >= radius - 1.2 && d <= radius) {
                    const angle = Math.atan2(z, x);
                    const plankIndex = Math.floor((angle + Math.PI) / (Math.PI / 4));
                    const color = plankIndex % 2 === 0 ? woodLight : woodDark;
                    v.push({x, y, z, c: color});
                }
            }
        }
        for(let x=-7; x<=7; x++) for(let z=-7; z<=7; z++) {
            const d = Math.sqrt(x*x + z*z);
            if(d >= 5.5 && d <= 7) {
                v.push({x, y:3, z, c: woodDark});
            }
        }
        for(let x=-8; x<=8; x++) for(let z=-8; z<=8; z++) {
            const d = Math.sqrt(x*x + z*z);
            if(d >= 6 && d <= 7.2) {
                v.push({x, y:-5, z, c: metalBand});
                v.push({x, y:-1, z, c: metalBand});
                v.push({x, y:1, z, c: metalBand});
            }
        }
        for(let i=0; i<4; i++) {
            v.push({x:-3, y:3+i, z:5-i*0.5, c:'#654321'});
            v.push({x:3, y:3+i, z:5-i*0.5, c:'#654321'});
        }
         return v;
    })(),
    
    mistorShirt: { 
        textDecal: {
            text: 'LOBOTOMY',
            color: '#000000',
            font: 'bold 64px Arial Black, Arial, sans-serif',
            y: 0,
            z: 5.51,
            scale: 1.0
        },
        voxels: [] 
    },
    
    joe: { hideBody: true, voxels: [] }
};

export default BODY;
