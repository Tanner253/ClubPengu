/**
 * Eye Assets - All eye/glasses customization options
 * Contains voxel data for penguin eye accessories and expressions
 */

export const EYES = {
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
    mistorEyes: [
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
        {x:-3, y:8, z:4, c:'#00AA00', glow: true}, {x:-2, y:8, z:4, c:'#00AA00', glow: true},
        {x:-3, y:7, z:4, c:'#00AA00', glow: true},
        {x:-3, y:6, z:4, c:'#00AA00', glow: true}, {x:-2, y:6, z:4, c:'#00AA00', glow: true}, {x:-1, y:6, z:4, c:'#00AA00', glow: true},
        {x:-1, y:5, z:4, c:'#00AA00', glow: true},
        {x:-3, y:4, z:4, c:'#00AA00', glow: true}, {x:-2, y:4, z:4, c:'#00AA00', glow: true},
        {x:-2, y:9, z:4, c:'#00AA00', glow: true}, {x:-2, y:3, z:4, c:'#00AA00', glow: true},
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
    
    // LEGENDARY: Galaxy Eyes
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
    
    // EPIC: Cyber Eyes
    cyber: [
        {x:-3, y:7, z:4, c:'#00FFFF', glow: true}, {x:-2, y:7, z:4, c:'#00FFFF', glow: true},
        {x:-2, y:8, z:4, c:'#00FFFF', glow: true}, {x:-2, y:6, z:4, c:'#00FFFF', glow: true},
        {x:3, y:7, z:4, c:'#00FFFF', glow: true}, {x:2, y:7, z:4, c:'#00FFFF', glow: true},
        {x:2, y:8, z:4, c:'#00FFFF', glow: true}, {x:2, y:6, z:4, c:'#00FFFF', glow: true}
    ],
    
    sleepy: [
        {x:-2, y:6, z:4, c:'black'}, {x:2, y:6, z:4, c:'black'},
        {x:-3, y:7, z:4.1, c:'#444'}, {x:-2, y:7, z:4.1, c:'#444'}, {x:-1, y:7, z:4.1, c:'#444'},
        {x:-3, y:8, z:4.1, c:'#444'}, {x:-2, y:8, z:4.1, c:'#444'}, {x:-1, y:8, z:4.1, c:'#444'},
        {x:1, y:7, z:4.1, c:'#444'}, {x:2, y:7, z:4.1, c:'#444'}, {x:3, y:7, z:4.1, c:'#444'},
        {x:1, y:8, z:4.1, c:'#444'}, {x:2, y:8, z:4.1, c:'#444'}, {x:3, y:8, z:4.1, c:'#444'},
        {x:-2, y:5, z:4, c:'#555'}, {x:2, y:5, z:4, c:'#555'}
    ],
    
    dizzy: [
        {x:-2, y:7, z:4, c:'black'}, {x:-3, y:8, z:4, c:'black'}, {x:-2, y:9, z:4, c:'black'},
        {x:-1, y:8, z:4, c:'black'}, {x:-2, y:6, z:4, c:'black'},
        {x:2, y:7, z:4, c:'black'}, {x:1, y:8, z:4, c:'black'}, {x:2, y:9, z:4, c:'black'},
        {x:3, y:8, z:4, c:'black'}, {x:2, y:6, z:4, c:'black'}
    ],
    
    anime: [
        {x:-2, y:7, z:4, c:'#6495ED'},
        {x:-3, y:7, z:4, c:'#4169E1'}, {x:-1, y:7, z:4, c:'#4169E1'},
        {x:-2, y:8, z:4, c:'#4169E1'}, {x:-2, y:6, z:4, c:'#4169E1'},
        {x:-2, y:7, z:4.1, c:'black'},
        {x:-3, y:8, z:4.2, c:'white', glow: true},
        {x:2, y:7, z:4, c:'#6495ED'},
        {x:1, y:7, z:4, c:'#4169E1'}, {x:3, y:7, z:4, c:'#4169E1'},
        {x:2, y:8, z:4, c:'#4169E1'}, {x:2, y:6, z:4, c:'#4169E1'},
        {x:2, y:7, z:4.1, c:'black'},
        {x:1, y:8, z:4.2, c:'white', glow: true}
    ],
    
    robot: [
        {x:-3, y:8, z:4, c:'#333'}, {x:-2, y:8, z:4, c:'#00FF00', glow: true}, {x:-1, y:8, z:4, c:'#333'},
        {x:-3, y:7, z:4, c:'#333'}, {x:-2, y:7, z:4, c:'#00FF00', glow: true}, {x:-1, y:7, z:4, c:'#333'},
        {x:-3, y:6, z:4, c:'#333'}, {x:-2, y:6, z:4, c:'#00FF00', glow: true}, {x:-1, y:6, z:4, c:'#333'},
        {x:3, y:8, z:4, c:'#333'}, {x:2, y:8, z:4, c:'#00FF00', glow: true}, {x:1, y:8, z:4, c:'#333'},
        {x:3, y:7, z:4, c:'#333'}, {x:2, y:7, z:4, c:'#00FF00', glow: true}, {x:1, y:7, z:4, c:'#333'},
        {x:3, y:6, z:4, c:'#333'}, {x:2, y:6, z:4, c:'#00FF00', glow: true}, {x:1, y:6, z:4, c:'#333'}
    ],
    
    determined: [
        {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
        {x:-4, y:9, z:4.1, c:'#333'}, {x:-3, y:8.5, z:4.1, c:'#333'}, {x:-2, y:8, z:4.1, c:'#333'},
        {x:4, y:9, z:4.1, c:'#333'}, {x:3, y:8.5, z:4.1, c:'#333'}, {x:2, y:8, z:4.1, c:'#333'},
        {x:-1.5, y:7.5, z:4.2, c:'white'}
    ],
    
    vrGoggles: [
        {x:-4, y:8, z:4, c:'#333'}, {x:-3, y:8, z:4, c:'#333'}, {x:-2, y:8, z:4, c:'#333'}, {x:-1, y:8, z:4, c:'#333'},
        {x:-4, y:7, z:4, c:'#333'}, {x:-3, y:7, z:4, c:'#0066FF', glow: true}, {x:-2, y:7, z:4, c:'#0066FF', glow: true}, {x:-1, y:7, z:4, c:'#333'},
        {x:-4, y:6, z:4, c:'#333'}, {x:-3, y:6, z:4, c:'#333'}, {x:-2, y:6, z:4, c:'#333'}, {x:-1, y:6, z:4, c:'#333'},
        {x:4, y:8, z:4, c:'#333'}, {x:3, y:8, z:4, c:'#333'}, {x:2, y:8, z:4, c:'#333'}, {x:1, y:8, z:4, c:'#333'},
        {x:4, y:7, z:4, c:'#333'}, {x:3, y:7, z:4, c:'#0066FF', glow: true}, {x:2, y:7, z:4, c:'#0066FF', glow: true}, {x:1, y:7, z:4, c:'#333'},
        {x:4, y:6, z:4, c:'#333'}, {x:3, y:6, z:4, c:'#333'}, {x:2, y:6, z:4, c:'#333'}, {x:1, y:6, z:4, c:'#333'},
        {x:0, y:7, z:4, c:'#333'}
    ],
    
    skiGoggles: [
        {x:-4, y:8, z:4.5, c:'orange'}, {x:-3, y:8, z:4.5, c:'white'}, {x:-2, y:8, z:4.5, c:'white'}, {x:-1, y:8, z:4.5, c:'orange'},
        {x:-4, y:7, z:4.5, c:'orange'}, {x:-3, y:7, z:4.5, c:'white'}, {x:-2, y:7, z:4.5, c:'white'}, {x:-1, y:7, z:4.5, c:'orange'},
        {x:4, y:8, z:4.5, c:'orange'}, {x:3, y:8, z:4.5, c:'white'}, {x:2, y:8, z:4.5, c:'white'}, {x:1, y:8, z:4.5, c:'orange'},
        {x:4, y:7, z:4.5, c:'orange'}, {x:3, y:7, z:4.5, c:'white'}, {x:2, y:7, z:4.5, c:'white'}, {x:1, y:7, z:4.5, c:'orange'},
        {x:0, y:7, z:4.5, c:'orange'}, {x:0, y:8, z:4.5, c:'orange'}
    ],
    
    stars: [
        {x:-2, y:7, z:4, c:'gold', glow: true}, {x:-3, y:8, z:4, c:'gold', glow: true}, {x:-1, y:8, z:4, c:'gold', glow: true},
        {x:-3, y:6, z:4, c:'gold', glow: true}, {x:-1, y:6, z:4, c:'gold', glow: true},
        {x:2, y:7, z:4, c:'gold', glow: true}, {x:1, y:8, z:4, c:'gold', glow: true}, {x:3, y:8, z:4, c:'gold', glow: true},
        {x:1, y:6, z:4, c:'gold', glow: true}, {x:3, y:6, z:4, c:'gold', glow: true}
    ],
    
    diamond: [
        {x:-2, y:7, z:4, c:'#E0FFFF', glow: true},
        {x:-3, y:7, z:4, c:'#B9F2FF', glow: true}, {x:-1, y:7, z:4, c:'#B9F2FF', glow: true},
        {x:-2, y:8, z:4, c:'#B9F2FF', glow: true}, {x:-2, y:6, z:4, c:'#B9F2FF', glow: true},
        {x:-3, y:8, z:4.2, c:'white', glow: true, fx: 'sparkle'},
        {x:-1, y:6, z:4.2, c:'white', glow: true, fx: 'sparkle'},
        {x:2, y:7, z:4, c:'#E0FFFF', glow: true},
        {x:1, y:7, z:4, c:'#B9F2FF', glow: true}, {x:3, y:7, z:4, c:'#B9F2FF', glow: true},
        {x:2, y:8, z:4, c:'#B9F2FF', glow: true}, {x:2, y:6, z:4, c:'#B9F2FF', glow: true},
        {x:1, y:8, z:4.2, c:'white', glow: true, fx: 'sparkle'},
        {x:3, y:6, z:4.2, c:'white', glow: true, fx: 'sparkle'}
    ],
    
    bloodshot: [
        {x:-3, y:7, z:4, c:'#FFFAFA'}, {x:-2, y:7, z:4, c:'#FFFAFA'}, {x:-1, y:7, z:4, c:'#FFFAFA'},
        {x:-2, y:8, z:4, c:'#FFFAFA'}, {x:-2, y:6, z:4, c:'#FFFAFA'},
        {x:-2, y:7, z:4.1, c:'#8B0000'},
        {x:-3, y:8, z:4.05, c:'#FF0000'}, {x:-3, y:6, z:4.05, c:'#FF0000'},
        {x:-1, y:8, z:4.05, c:'#FF0000'}, {x:-1, y:6, z:4.05, c:'#FF0000'},
        {x:1, y:7, z:4, c:'#FFFAFA'}, {x:2, y:7, z:4, c:'#FFFAFA'}, {x:3, y:7, z:4, c:'#FFFAFA'},
        {x:2, y:8, z:4, c:'#FFFAFA'}, {x:2, y:6, z:4, c:'#FFFAFA'},
        {x:2, y:7, z:4.1, c:'#8B0000'},
        {x:1, y:8, z:4.05, c:'#FF0000'}, {x:1, y:6, z:4.05, c:'#FF0000'},
        {x:3, y:8, z:4.05, c:'#FF0000'}, {x:3, y:6, z:4.05, c:'#FF0000'}
    ],
    
    catEyes: [
        {x:-3, y:8, z:4, c:'#90EE90'}, {x:-2, y:8, z:4, c:'#90EE90'}, {x:-1, y:8, z:4, c:'#90EE90'},
        {x:-3, y:7, z:4, c:'#90EE90'}, {x:-2, y:7, z:4, c:'black'}, {x:-1, y:7, z:4, c:'#90EE90'},
        {x:-3, y:6, z:4, c:'#90EE90'}, {x:-2, y:6, z:4, c:'black'}, {x:-1, y:6, z:4, c:'#90EE90'},
        {x:3, y:8, z:4, c:'#90EE90'}, {x:2, y:8, z:4, c:'#90EE90'}, {x:1, y:8, z:4, c:'#90EE90'},
        {x:3, y:7, z:4, c:'#90EE90'}, {x:2, y:7, z:4, c:'black'}, {x:1, y:7, z:4, c:'#90EE90'},
        {x:3, y:6, z:4, c:'#90EE90'}, {x:2, y:6, z:4, c:'black'}, {x:1, y:6, z:4, c:'#90EE90'}
    ],
    
    aviator: [
        {x:-4, y:8, z:4.5, c:'gold'}, {x:-3, y:8, z:4.5, c:'#333'}, {x:-2, y:8, z:4.5, c:'#333'}, {x:-1, y:8, z:4.5, c:'gold'},
        {x:-4, y:7, z:4.5, c:'gold'}, {x:-3, y:7, z:4.5, c:'#333'}, {x:-2, y:7, z:4.5, c:'#333'}, {x:-1, y:7, z:4.5, c:'gold'},
        {x:-3, y:6, z:4.5, c:'gold'}, {x:-2, y:6, z:4.5, c:'gold'},
        {x:4, y:8, z:4.5, c:'gold'}, {x:3, y:8, z:4.5, c:'#333'}, {x:2, y:8, z:4.5, c:'#333'}, {x:1, y:8, z:4.5, c:'gold'},
        {x:4, y:7, z:4.5, c:'gold'}, {x:3, y:7, z:4.5, c:'#333'}, {x:2, y:7, z:4.5, c:'#333'}, {x:1, y:7, z:4.5, c:'gold'},
        {x:3, y:6, z:4.5, c:'gold'}, {x:2, y:6, z:4.5, c:'gold'},
        {x:0, y:8, z:4.5, c:'gold'}
    ],
    
    sharingan: [
        {x:-2, y:7, z:4, c:'#8B0000', glow: true}, {x:-3, y:7, z:4, c:'black'}, {x:-1, y:7, z:4, c:'black'},
        {x:-2, y:8, z:4, c:'black'}, {x:-2, y:6, z:4, c:'black'},
        {x:-3, y:8, z:4.2, c:'#8B0000', glow: true}, {x:-1, y:6, z:4.2, c:'#8B0000', glow: true},
        {x:2, y:7, z:4, c:'#8B0000', glow: true}, {x:1, y:7, z:4, c:'black'}, {x:3, y:7, z:4, c:'black'},
        {x:2, y:8, z:4, c:'black'}, {x:2, y:6, z:4, c:'black'},
        {x:1, y:8, z:4.2, c:'#8B0000', glow: true}, {x:3, y:6, z:4.2, c:'#8B0000', glow: true}
    ],
    
    teary: [
        {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
        {x:-3, y:7, z:4.2, c:'white'}, {x:3, y:7, z:4.2, c:'white'},
        {x:-2, y:5, z:4.3, c:'#87CEEB'}, {x:2, y:5, z:4.3, c:'#87CEEB'}
    ],
    
    void: [
        {x:-3, y:8, z:4, c:'#1a0033'}, {x:-2, y:8, z:4, c:'#1a0033'}, {x:-1, y:8, z:4, c:'#1a0033'},
        {x:-3, y:7, z:4, c:'#1a0033'}, {x:-2, y:7, z:4, c:'#8B008B', glow: true}, {x:-1, y:7, z:4, c:'#1a0033'},
        {x:-3, y:6, z:4, c:'#1a0033'}, {x:-2, y:6, z:4, c:'#1a0033'}, {x:-1, y:6, z:4, c:'#1a0033'},
        {x:3, y:8, z:4, c:'#1a0033'}, {x:2, y:8, z:4, c:'#1a0033'}, {x:1, y:8, z:4, c:'#1a0033'},
        {x:3, y:7, z:4, c:'#1a0033'}, {x:2, y:7, z:4, c:'#8B008B', glow: true}, {x:1, y:7, z:4, c:'#1a0033'},
        {x:3, y:6, z:4, c:'#1a0033'}, {x:2, y:6, z:4, c:'#1a0033'}, {x:1, y:6, z:4, c:'#1a0033'}
    ],
    
    nervous: [
        {x:-2, y:7, z:4, c:'black'}, {x:2, y:7, z:4, c:'black'},
        {x:4, y:9, z:4, c:'#87CEEB'}, {x:4, y:8, z:4.2, c:'#87CEEB'}
    ],
    
    // LEGENDARY: LMAO Face
    lmao: (() => {
        let v = [];
        const white = '#FFFFFF';
        const black = '#000000';
        const tearBlue = '#29B6F6';
        const faceYellow = '#FFCC02';
        
        const faceCenterY = 6;
        const faceRadius = 5;
        for(let y = 1; y <= 11; y++) {
            for(let x = -5; x <= 5; x++) {
                const distFromCenter = Math.sqrt(x*x + (y - faceCenterY)*(y - faceCenterY));
                if(distFromCenter <= faceRadius) {
                    const leftEyeDist = Math.sqrt((x+2)*(x+2) + (y-7)*(y-7));
                    const rightEyeDist = Math.sqrt((x-2)*(x-2) + (y-7)*(y-7));
                    if(leftEyeDist > 1.8 && rightEyeDist > 1.8) {
                        v.push({x, y, z: 4, c: faceYellow});
                    }
                }
            }
        }
        
        const eyeLength = 5;
        const eyeStart = 3;
        
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
        v.push({x: -2, y: 7, z: eyeStart + eyeLength + 0.5, c: black});
        
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
        v.push({x: 2, y: 7, z: eyeStart + eyeLength + 0.5, c: black});
        
        for(let t = 0; t < 6; t++) {
            v.push({x: -4 - t*0.6, y: 5 - t*0.8, z: 4.5, c: tearBlue, glow: true});
            v.push({x: -4.5 - t*0.5, y: 5.5 - t*0.8, z: 4.3, c: tearBlue, glow: true});
            v.push({x: -3.5 - t*0.7, y: 4.5 - t*0.8, z: 4.6, c: tearBlue, glow: true});
        }
        for(let t = 0; t < 6; t++) {
            v.push({x: 4 + t*0.6, y: 5 - t*0.8, z: 4.5, c: tearBlue, glow: true});
            v.push({x: 4.5 + t*0.5, y: 5.5 - t*0.8, z: 4.3, c: tearBlue, glow: true});
            v.push({x: 3.5 + t*0.7, y: 4.5 - t*0.8, z: 4.6, c: tearBlue, glow: true});
        }
        
        for(let x = -3; x <= 3; x++) {
            v.push({x, y: 4, z: 5.51, c: black});
        }
        for(let x = -2; x <= 2; x++) {
            v.push({x, y: 1, z: 5.5, c: black});
        }
        
        for(let y = 2; y <= 3; y++) {
            for(let x = -2; x <= 2; x++) {
                v.push({x, y, z: 5, c: '#4A0000'});
            }
        }
        
        for(let x = -2; x <= 2; x++) {
            v.push({x, y: 3.5, z: 5.5, c: white});
        }
        
        v.push({x: -1, y: 1.5, z: 5.3, c: '#FF6B6B'});
        v.push({x: 0, y: 1.5, z: 5.3, c: '#FF6B6B'});
        v.push({x: 1, y: 1.5, z: 5.3, c: '#FF6B6B'});
        
        return v;
    })()
};

export default EYES;
