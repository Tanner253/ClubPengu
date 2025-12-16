/**
 * Mouth Assets - All mouth/beak customization options
 * Contains voxel data for penguin mouth accessories
 */

export const MOUTHS = {
    beak: [{x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'}],
    cigarette: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:2, y:5.5, z:5, c:'white'}, {x:3, y:5.5, z:5.2, c:'white'}, {x:4, y:5.5, z:5.4, c:'white'},
        {x:4.5, y:5.5, z:5.5, c:'red', fx:'smoke'}
    ],
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
    
    goldGrill: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:-1, y:5, z:5.2, c:'gold', glow: true}, {x:0, y:5, z:5.3, c:'gold', glow: true}, {x:1, y:5, z:5.2, c:'gold', glow: true}
    ],
    
    diamondGrill: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:-2, y:5, z:5.2, c:'#E0FFFF', glow: true, fx: 'sparkle'},
        {x:-1, y:5, z:5.3, c:'#B9F2FF', glow: true, fx: 'sparkle'}, 
        {x:0, y:5, z:5.4, c:'#FFFFFF', glow: true, fx: 'sparkle'}, 
        {x:1, y:5, z:5.3, c:'#B9F2FF', glow: true, fx: 'sparkle'},
        {x:2, y:5, z:5.2, c:'#E0FFFF', glow: true, fx: 'sparkle'}
    ],
    
    lollipop: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:2, y:5, z:5, c:'white'}, {x:3, y:5, z:5.2, c:'white'}, {x:4, y:5, z:5.4, c:'white'},
        {x:5, y:5, z:5.6, c:'#FF69B4'}, {x:5, y:6, z:5.6, c:'#FF69B4'}, {x:5, y:4, z:5.6, c:'#FF69B4'},
        {x:6, y:5, z:5.6, c:'#FF69B4'}, {x:4, y:5, z:5.6, c:'#FF69B4'}
    ],
    
    rose: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:2, y:5.5, z:5.2, c:'#228B22'}, {x:3, y:5.5, z:5.4, c:'#228B22'},
        {x:4, y:5.5, z:5.5, c:'#DC143C'}, {x:4, y:6, z:5.5, c:'#DC143C'}, {x:4, y:5, z:5.5, c:'#DC143C'},
        {x:5, y:5.5, z:5.5, c:'#DC143C'}
    ],
    
    whistle: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:1, y:5, z:5.3, c:'silver'}, {x:2, y:5, z:5.5, c:'silver'}, {x:2, y:5.5, z:5.5, c:'silver'}
    ],
    
    bubblegumPop: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:0, y:5, z:6, c:'#FF69B4'}, {x:0, y:5, z:7, c:'#FF69B4'},
        {x:1, y:5, z:6.5, c:'#FF69B4'}, {x:-1, y:5, z:6.5, c:'#FF69B4'},
        {x:0, y:6, z:6.5, c:'#FF69B4'}, {x:0, y:4, z:6.5, c:'#FF69B4'}
    ],
    
    fancyStache: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:-2, y:5, z:5.2, c:'#1a1a1a'}, {x:-3, y:5.5, z:5, c:'#1a1a1a'}, {x:-4, y:6, z:4.8, c:'#1a1a1a'},
        {x:2, y:5, z:5.2, c:'#1a1a1a'}, {x:3, y:5.5, z:5, c:'#1a1a1a'}, {x:4, y:6, z:4.8, c:'#1a1a1a'}
    ],
    
    goatee: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:0, y:4, z:5.3, c:'#2F1810'}, {x:0, y:3, z:5.2, c:'#2F1810'}, {x:0, y:2, z:5, c:'#2F1810'}
    ],
    
    fullBeard: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:-2, y:4, z:5, c:'#3D2314'}, {x:-1, y:4, z:5.2, c:'#3D2314'}, {x:0, y:4, z:5.3, c:'#3D2314'},
        {x:1, y:4, z:5.2, c:'#3D2314'}, {x:2, y:4, z:5, c:'#3D2314'},
        {x:-2, y:3, z:4.8, c:'#3D2314'}, {x:-1, y:3, z:5, c:'#3D2314'}, {x:0, y:3, z:5.1, c:'#3D2314'},
        {x:1, y:3, z:5, c:'#3D2314'}, {x:2, y:3, z:4.8, c:'#3D2314'},
        {x:-1, y:2, z:4.8, c:'#3D2314'}, {x:0, y:2, z:4.9, c:'#3D2314'}, {x:1, y:2, z:4.8, c:'#3D2314'}
    ],
    
    buckTeeth: [
        {x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'},
        {x:-0.5, y:4.5, z:5.3, c:'#FFFAF0'}, {x:0.5, y:4.5, z:5.3, c:'#FFFAF0'},
        {x:-0.5, y:4, z:5.4, c:'#FFFAF0'}, {x:0.5, y:4, z:5.4, c:'#FFFAF0'},
        {x:-0.5, y:3.5, z:5.3, c:'#FFFAF0'}, {x:0.5, y:3.5, z:5.3, c:'#FFFAF0'}
    ],
    
    vampireDrool: [
        {x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'},
        {x:-1.5, y:4.5, z:5.2, c:'#FFFAF0'}, {x:1.5, y:4.5, z:5.2, c:'#FFFAF0'},
        {x:-1.5, y:4, z:5.3, c:'#FFFAF0'}, {x:1.5, y:4, z:5.3, c:'#FFFAF0'},
        {x:-1.5, y:3.5, z:5.2, c:'#FFFAF0'}, {x:1.5, y:3.5, z:5.2, c:'#FFFAF0'},
        {x:-1.5, y:3, z:5.3, c:'#8B0000', glow: true}, {x:1.5, y:3, z:5.3, c:'#8B0000', glow: true}
    ],
    
    pacifier: [
        {x:0, y:5, z:5.5, c:'#87CEEB'}, {x:0, y:5, z:6, c:'#87CEEB'},
        {x:-1, y:5, z:6, c:'#FFB6C1'}, {x:1, y:5, z:6, c:'#FFB6C1'},
        {x:0, y:6, z:6, c:'#FFB6C1'}, {x:0, y:4, z:6, c:'#FFB6C1'}
    ],
    
    straw: [
        {x:0, y:5.5, z:5, c:'orange'}, {x:-1, y:5.5, z:4.5, c:'orange'}, {x:1, y:5.5, z:4.5, c:'orange'},
        {x:1, y:5, z:5.2, c:'#FF6B6B'}, {x:2, y:4.5, z:5.3, c:'#FF6B6B'},
        {x:3, y:3, z:5.5, c:'#FFD93D'}, {x:4, y:3, z:5.5, c:'#FFD93D'}, {x:5, y:3, z:5.5, c:'#FFD93D'},
        {x:3, y:2, z:5.5, c:'#FFD93D'}, {x:4, y:2, z:5.5, c:'#FFD93D'}, {x:5, y:2, z:5.5, c:'#FFD93D'},
        {x:3, y:1, z:5.5, c:'#FFD93D'}, {x:4, y:1, z:5.5, c:'#FFD93D'}, {x:5, y:1, z:5.5, c:'#FFD93D'},
        {x:3, y:0, z:5.5, c:'#FFD93D'}, {x:4, y:0, z:5.5, c:'#FFD93D'}, {x:5, y:0, z:5.5, c:'#FFD93D'},
        {x:3, y:4, z:5.5, c:'#E74C3C'}, {x:4, y:4, z:5.5, c:'#E74C3C'}, {x:5, y:4, z:5.5, c:'#E74C3C'},
        {x:3, y:4, z:5.5, c:'#FF6B6B'}, {x:3, y:5, z:5.4, c:'#FF6B6B'}
    ],
    
    fishBone: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:2, y:5.5, z:5.2, c:'white'}, {x:3, y:5.5, z:5.3, c:'white'}, {x:4, y:5.5, z:5.4, c:'white'},
        {x:3, y:6, z:5.3, c:'white'}, {x:3, y:5, z:5.3, c:'white'},
        {x:5, y:5.5, z:5.4, c:'white'}, {x:5, y:6, z:5.4, c:'white'}, {x:5, y:5, z:5.4, c:'white'}
    ],
    
    kiss: [
        {x:0, y:5.5, z:5, c:'#FF69B4'},
        {x:2, y:6, z:5.5, c:'#FF69B4', glow: true}
    ],
    
    fireBreath: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:0, y:5, z:5.5, c:'#FF4500', glow: true, fx: 'fireBreath', emitter: true}
    ],
    
    iceBreath: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:0, y:5, z:5.5, c:'#87CEEB', glow: true, fx: 'iceBreath', emitter: true}
    ],
    
    cigar: [
        {x:0, y:5.5, z:5, c:'orange'},
        {x:2, y:5, z:5, c:'#5D3A1A'}, {x:3, y:5, z:5.2, c:'#8B4513'}, {x:4, y:5, z:5.4, c:'#8B4513'},
        {x:5, y:5, z:5.5, c:'#6B4423'},
        {x:2.5, y:5, z:5.1, c:'#FFD700'},
        {x:5.5, y:5, z:5.6, c:'#FF4500', glow: true},
        {x:6, y:5.5, z:5.6, c:'#AAAAAA', fx: 'cigarSmoke', emitter: true}
    ],
    
    surgicalMask: [
        {x:-2, y:5, z:5.2, c:'#87CEEB'}, {x:-1, y:5, z:5.3, c:'#87CEEB'}, {x:0, y:5, z:5.4, c:'#87CEEB'},
        {x:1, y:5, z:5.3, c:'#87CEEB'}, {x:2, y:5, z:5.2, c:'#87CEEB'},
        {x:-2, y:4, z:5.1, c:'#87CEEB'}, {x:-1, y:4, z:5.2, c:'#87CEEB'}, {x:0, y:4, z:5.3, c:'#87CEEB'},
        {x:1, y:4, z:5.2, c:'#87CEEB'}, {x:2, y:4, z:5.1, c:'#87CEEB'}
    ]
};

export default MOUTHS;
