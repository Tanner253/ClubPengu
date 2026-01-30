/**
 * Mount Assets - All rideable/mountable items
 * Contains voxel data for penguin mounts and vehicles
 */

export const MOUNTS = {
    none: { voxels: [], animated: false },
    
    // RARE: Shopping Cart - Wobbly cart with spinning wheels
    shoppingCart: {
        voxels: (() => {
            const v = [];
            // Colors
            const metalFrame = '#A8A8A8';     // Light silver frame
            const darkMetal = '#606060';       // Darker accents
            const meshWire = '#B0B0B0';        // Cart mesh
            const handleGrip = '#2a2a2a';      // Black rubber grip
            const basketRed = '#CC3333';       // Red basket accent
            
            // === MAIN BASKET (wire mesh style) ===
            const basketLength = 10;  // half-length
            const basketWidth = 6;    // half-width
            const basketHeight = 6;
            
            // Bottom frame
            for(let x = -basketWidth; x <= basketWidth; x++) {
                v.push({x, y: 0, z: -basketLength, c: metalFrame});
                v.push({x, y: 0, z: basketLength, c: metalFrame});
            }
            for(let z = -basketLength; z <= basketLength; z++) {
                v.push({x: -basketWidth, y: 0, z, c: metalFrame});
                v.push({x: basketWidth, y: 0, z, c: metalFrame});
            }
            
            // Wire mesh bottom (cross pattern for realistic look)
            for(let x = -basketWidth + 1; x < basketWidth; x += 2) {
                for(let z = -basketLength + 1; z < basketLength; z += 2) {
                    v.push({x, y: 0, z, c: meshWire});
                }
            }
            
            // Side walls (wire frame - vertical bars)
            for(let y = 1; y <= basketHeight; y++) {
                // Front/back walls
                for(let x = -basketWidth; x <= basketWidth; x += 2) {
                    v.push({x, y, z: -basketLength, c: meshWire});
                    v.push({x, y, z: basketLength, c: meshWire});
                }
                // Side walls
                for(let z = -basketLength + 2; z < basketLength; z += 2) {
                    v.push({x: -basketWidth, y, z, c: meshWire});
                    v.push({x: basketWidth, y, z, c: meshWire});
                }
            }
            
            // Corner posts (solid)
            for(let y = 0; y <= basketHeight; y++) {
                v.push({x: -basketWidth, y, z: -basketLength, c: metalFrame});
                v.push({x: basketWidth, y, z: -basketLength, c: metalFrame});
                v.push({x: -basketWidth, y, z: basketLength, c: metalFrame});
                v.push({x: basketWidth, y, z: basketLength, c: metalFrame});
            }
            
            // Top rim (red accent for flair)
            for(let x = -basketWidth; x <= basketWidth; x++) {
                v.push({x, y: basketHeight + 1, z: -basketLength, c: basketRed});
                v.push({x, y: basketHeight + 1, z: basketLength, c: basketRed});
            }
            for(let z = -basketLength; z <= basketLength; z++) {
                v.push({x: -basketWidth, y: basketHeight + 1, z, c: basketRed});
                v.push({x: basketWidth, y: basketHeight + 1, z, c: basketRed});
            }
            
            // === UNDERCARRIAGE / FRAME ===
            // Main support bars connecting to wheels
            for(let z = -basketLength + 2; z <= basketLength - 2; z++) {
                v.push({x: -basketWidth + 1, y: -1, z, c: darkMetal});
                v.push({x: basketWidth - 1, y: -1, z, c: darkMetal});
            }
            // Cross supports
            for(let x = -basketWidth + 1; x <= basketWidth - 1; x++) {
                v.push({x, y: -1, z: -basketLength + 4, c: darkMetal});
                v.push({x, y: -1, z: basketLength - 4, c: darkMetal});
            }
            
            // === HANDLE (push bar at back) ===
            // Vertical posts
            for(let y = basketHeight + 2; y <= basketHeight + 8; y++) {
                v.push({x: -basketWidth + 2, y, z: basketLength, c: metalFrame});
                v.push({x: basketWidth - 2, y, z: basketLength, c: metalFrame});
            }
            // Horizontal handle bar
            for(let x = -basketWidth + 2; x <= basketWidth - 2; x++) {
                v.push({x, y: basketHeight + 8, z: basketLength, c: metalFrame});
                v.push({x, y: basketHeight + 8, z: basketLength + 1, c: handleGrip}); // Rubber grip
            }
            
            // Child seat fold-down (at front, optional detail)
            for(let x = -3; x <= 3; x++) {
                v.push({x, y: basketHeight - 2, z: -basketLength + 1, c: darkMetal});
            }
            
            return v;
        })(),
        
        // Front left wheel (animated)
        wheelFL: (() => {
            const v = [];
            const wheelColor = '#1a1a1a';
            const hubColor = '#606060';
            const wheelZ = -8;
            const wheelX = -7;
            // Wheel rim (3x3 cross pattern)
            for(let dy = -1; dy <= 1; dy++) {
                v.push({x: wheelX, y: -2 + dy, z: wheelZ, c: wheelColor});
            }
            for(let dz = -1; dz <= 1; dz++) {
                v.push({x: wheelX, y: -2, z: wheelZ + dz, c: wheelColor});
            }
            // Hub center
            v.push({x: wheelX, y: -2, z: wheelZ, c: hubColor});
            return v;
        })(),
        
        // Front right wheel (animated)
        wheelFR: (() => {
            const v = [];
            const wheelColor = '#1a1a1a';
            const hubColor = '#606060';
            const wheelZ = -8;
            const wheelX = 7;
            for(let dy = -1; dy <= 1; dy++) {
                v.push({x: wheelX, y: -2 + dy, z: wheelZ, c: wheelColor});
            }
            for(let dz = -1; dz <= 1; dz++) {
                v.push({x: wheelX, y: -2, z: wheelZ + dz, c: wheelColor});
            }
            v.push({x: wheelX, y: -2, z: wheelZ, c: hubColor});
            return v;
        })(),
        
        // Back left wheel (animated - these are often smaller swivel wheels)
        wheelBL: (() => {
            const v = [];
            const wheelColor = '#1a1a1a';
            const hubColor = '#606060';
            const wheelZ = 8;
            const wheelX = -7;
            for(let dy = -1; dy <= 1; dy++) {
                v.push({x: wheelX, y: -2 + dy, z: wheelZ, c: wheelColor});
            }
            for(let dz = -1; dz <= 1; dz++) {
                v.push({x: wheelX, y: -2, z: wheelZ + dz, c: wheelColor});
            }
            v.push({x: wheelX, y: -2, z: wheelZ, c: hubColor});
            return v;
        })(),
        
        // Back right wheel (animated)
        wheelBR: (() => {
            const v = [];
            const wheelColor = '#1a1a1a';
            const hubColor = '#606060';
            const wheelZ = 8;
            const wheelX = 7;
            for(let dy = -1; dy <= 1; dy++) {
                v.push({x: wheelX, y: -2 + dy, z: wheelZ, c: wheelColor});
            }
            for(let dz = -1; dz <= 1; dz++) {
                v.push({x: wheelX, y: -2, z: wheelZ + dz, c: wheelColor});
            }
            v.push({x: wheelX, y: -2, z: wheelZ, c: hubColor});
            return v;
        })(),
        
        animated: true,
        animationType: 'cart_wobble',
        hidesFeet: false,
        riderOffset: { y: 2 },
        speedBoost: 1.1,  // 10% speed boost
        scale: 0.18,
        positionY: 0.45,
        // Rotate 180 degrees so handle is at back (player pushes cart)
        mountRotation: Math.PI,
        // Wobble configuration
        wobbleIntensity: 0.08,
        wheelSpinSpeed: 25
    },
    
    // EPIC: Giant Rubber Duck - Bouncy yellow duck ride!
    rubberDuck: {
        voxels: (() => {
            const v = [];
            // Colors
            const duckYellow = '#FFD700';      // Bright yellow body
            const duckOrange = '#FF8C00';      // Orange beak
            const eyeWhite = '#FFFFFF';
            const eyeBlack = '#000000';
            const bellyLight = '#FFEC8B';      // Lighter belly
            const wingYellow = '#FFC125';      // Slightly darker wings
            
            // === MAIN BODY (round duck shape) ===
            // Body is roughly spherical, elongated front to back
            for (let x = -6; x <= 6; x++) {
                for (let y = -4; y <= 4; y++) {
                    for (let z = -8; z <= 6; z++) {
                        // Ellipsoid shape
                        const dx = x / 6;
                        const dy = y / 4;
                        const dz = (z + 1) / 7;
                        const dist = dx*dx + dy*dy + dz*dz;
                        
                        if (dist < 1) {
                            // Bottom/belly is lighter
                            const isBottom = y < -1;
                            const color = isBottom ? bellyLight : duckYellow;
                            v.push({x, y, z, c: color});
                        }
                    }
                }
            }
            
            // === HEAD (front, raised) ===
            for (let x = -4; x <= 4; x++) {
                for (let y = 2; y <= 9; y++) {
                    for (let z = 5; z <= 12; z++) {
                        // Spherical head
                        const dx = x / 4;
                        const dy = (y - 5.5) / 4;
                        const dz = (z - 8.5) / 4;
                        const dist = dx*dx + dy*dy + dz*dz;
                        
                        if (dist < 1) {
                            v.push({x, y, z, c: duckYellow});
                        }
                    }
                }
            }
            
            // === BEAK (front of head) ===
            // Flat duck beak shape
            for (let x = -2; x <= 2; x++) {
                for (let z = 12; z <= 15; z++) {
                    const width = z < 14 ? 2 : 1;
                    if (Math.abs(x) <= width) {
                        v.push({x, y: 4, z, c: duckOrange});  // Top of beak
                        v.push({x, y: 3, z, c: duckOrange});  // Bottom of beak
                    }
                }
            }
            // Beak tip
            v.push({x: 0, y: 3, z: 16, c: duckOrange});
            v.push({x: 0, y: 4, z: 16, c: duckOrange});
            
            // === EYES ===
            // Left eye
            v.push({x: -3, y: 7, z: 11, c: eyeWhite});
            v.push({x: -3, y: 7, z: 12, c: eyeBlack}); // Pupil
            v.push({x: -3, y: 6, z: 11, c: eyeWhite});
            v.push({x: -2, y: 7, z: 11, c: eyeWhite});
            
            // Right eye
            v.push({x: 3, y: 7, z: 11, c: eyeWhite});
            v.push({x: 3, y: 7, z: 12, c: eyeBlack}); // Pupil
            v.push({x: 3, y: 6, z: 11, c: eyeWhite});
            v.push({x: 2, y: 7, z: 11, c: eyeWhite});
            
            // === TAIL (small bump at back) ===
            for (let x = -2; x <= 2; x++) {
                for (let y = 0; y <= 3; y++) {
                    v.push({x, y, z: -9, c: duckYellow});
                }
            }
            v.push({x: 0, y: 2, z: -10, c: duckYellow});
            v.push({x: 0, y: 3, z: -10, c: duckYellow});
            
            // === WINGS (small bumps on sides) ===
            // Left wing
            for (let y = -1; y <= 2; y++) {
                for (let z = -2; z <= 2; z++) {
                    v.push({x: -7, y, z, c: wingYellow});
                }
            }
            v.push({x: -8, y: 0, z: 0, c: wingYellow});
            v.push({x: -8, y: 1, z: 0, c: wingYellow});
            
            // Right wing
            for (let y = -1; y <= 2; y++) {
                for (let z = -2; z <= 2; z++) {
                    v.push({x: 7, y, z, c: wingYellow});
                }
            }
            v.push({x: 8, y: 0, z: 0, c: wingYellow});
            v.push({x: 8, y: 1, z: 0, c: wingYellow});
            
            return v;
        })(),
        
        animated: true,
        animationType: 'duck_bounce',
        hidesFeet: true,
        riderOffset: { y: 3, z: -2 },  // Sit toward back of duck
        speedBoost: 1.15,  // 15% speed boost
        scale: 0.2,
        positionY: 0.5,
        // No rotation needed - duck head is at +Z which faces player's forward direction
        // Animation configuration
        bounceIntensity: 0.15,
        waddleSpeed: 8,
        waddleIntensity: 0.12
    },
    
    // LEGENDARY: Giant Puffle - Bouncy fluffy ball with wiggling tuft!
    giantPuffle: {
        voxels: (() => {
            const v = [];
            // Colors (using classic blue puffle)
            const bodyColor = '#0055FF';       // Blue body
            const bellyColor = '#4488FF';      // Lighter belly
            const eyeWhite = '#FFFFFF';
            const eyeBlack = '#000000';
            const feetColor = '#0044CC';       // Darker blue feet
            
            // === MAIN BODY (big fluffy sphere) ===
            const radius = 8;
            for (let x = -radius; x <= radius; x++) {
                for (let y = -radius; y <= radius; y++) {
                    for (let z = -radius; z <= radius; z++) {
                        const dist = Math.sqrt(x*x + y*y + z*z);
                        if (dist <= radius && dist > radius - 2) {
                            // Outer shell only for fluffy look
                            const isBelly = z > 2 && y < 2;
                            v.push({x, y, z, c: isBelly ? bellyColor : bodyColor});
                        } else if (dist <= radius - 2) {
                            // Fill inside
                            v.push({x, y, z, c: bodyColor});
                        }
                    }
                }
            }
            
            // === EYES (big cute eyes on front) ===
            // Left eye white
            for (let x = -4; x <= -2; x++) {
                for (let y = 1; y <= 4; y++) {
                    v.push({x, y, z: radius - 1, c: eyeWhite});
                }
            }
            // Left pupil
            v.push({x: -3, y: 3, z: radius, c: eyeBlack});
            v.push({x: -3, y: 2, z: radius, c: eyeBlack});
            v.push({x: -2, y: 3, z: radius, c: eyeBlack});
            v.push({x: -2, y: 2, z: radius, c: eyeBlack});
            
            // Right eye white
            for (let x = 2; x <= 4; x++) {
                for (let y = 1; y <= 4; y++) {
                    v.push({x, y, z: radius - 1, c: eyeWhite});
                }
            }
            // Right pupil
            v.push({x: 3, y: 3, z: radius, c: eyeBlack});
            v.push({x: 3, y: 2, z: radius, c: eyeBlack});
            v.push({x: 2, y: 3, z: radius, c: eyeBlack});
            v.push({x: 2, y: 2, z: radius, c: eyeBlack});
            
            // === FEET (small, at bottom front) ===
            // Left foot
            for (let x = -4; x <= -2; x++) {
                for (let z = 2; z <= 5; z++) {
                    v.push({x, y: -radius, z, c: feetColor});
                    v.push({x, y: -radius - 1, z, c: feetColor});
                }
            }
            // Right foot
            for (let x = 2; x <= 4; x++) {
                for (let z = 2; z <= 5; z++) {
                    v.push({x, y: -radius, z, c: feetColor});
                    v.push({x, y: -radius - 1, z, c: feetColor});
                }
            }
            
            return v;
        })(),
        
        // Tuft on top (separate for wiggle animation)
        tuft: (() => {
            const v = [];
            const tuftColor = '#0055FF';
            const tuftHighlight = '#3377FF';
            
            // Main tuft spikes
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const x = Math.round(Math.cos(angle) * 2);
                const z = Math.round(Math.sin(angle) * 2);
                
                for (let y = 0; y < 4; y++) {
                    const c = y > 2 ? tuftHighlight : tuftColor;
                    v.push({x, y: 9 + y, z, c});
                }
            }
            // Center spike (tallest)
            for (let y = 0; y < 6; y++) {
                v.push({x: 0, y: 9 + y, z: 0, c: y > 3 ? tuftHighlight : tuftColor});
            }
            
            return v;
        })(),
        
        animated: true,
        animationType: 'puffle_bounce',
        hidesFeet: true,
        riderOffset: { y: 1.5, z: -0.55 },  // Move player back so feet don't cover puffle face
        speedBoost: 1.2,  // 20% speed boost - puffles are bouncy!
        scale: 0.16,
        positionY: 0.8,
        // Animation configuration
        bounceIntensity: 0.25,
        bounceSpeed: 10,
        squishFactor: 0.12,
        tuftWiggleSpeed: 15,
        tuftWiggleAmount: 0.3
    },
    
    // LEGENDARY: UFO Disc - Flying saucer with spinning ring and lights!
    ufoDisc: {
        voxels: (() => {
            const v = [];
            // Colors
            const hullSilver = '#C0C0C0';      // Main hull
            const hullDark = '#808080';         // Darker accents
            const domeCyan = '#00CED1';         // Transparent dome (cyan tint)
            const domeHighlight = '#E0FFFF';    // Dome highlight
            const lightGreen = '#00FF00';       // Green lights
            const lightRed = '#FF0000';         // Red lights
            const lightYellow = '#FFFF00';      // Yellow center light
            
            // === MAIN DISC BODY ===
            // Flattened ellipsoid shape
            for (let x = -8; x <= 8; x++) {
                for (let z = -8; z <= 8; z++) {
                    const dist = Math.sqrt(x*x + z*z);
                    if (dist <= 8) {
                        // Top surface (slightly domed)
                        const topY = dist < 4 ? 2 : (dist < 6 ? 1 : 0);
                        for (let y = -2; y <= topY; y++) {
                            const isEdge = dist > 6;
                            v.push({x, y, z, c: isEdge ? hullDark : hullSilver});
                        }
                    }
                }
            }
            
            // === DOME (cockpit on top) ===
            for (let x = -3; x <= 3; x++) {
                for (let y = 3; y <= 7; y++) {
                    for (let z = -3; z <= 3; z++) {
                        const dist = Math.sqrt(x*x + (y-4)*(y-4) + z*z);
                        if (dist <= 3.5 && dist > 2.5) {
                            // Dome shell only
                            const isTop = y > 5;
                            v.push({x, y, z, c: isTop ? domeHighlight : domeCyan});
                        }
                    }
                }
            }
            
            // === UNDERSIDE LIGHTS ===
            // Center yellow light
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    v.push({x, y: -3, z, c: lightYellow});
                }
            }
            
            // Ring of alternating green/red lights
            const lightPositions = [
                {x: 5, z: 0}, {x: -5, z: 0}, {x: 0, z: 5}, {x: 0, z: -5},
                {x: 4, z: 3}, {x: -4, z: 3}, {x: 4, z: -3}, {x: -4, z: -3},
                {x: 3, z: 4}, {x: -3, z: 4}, {x: 3, z: -4}, {x: -3, z: -4}
            ];
            lightPositions.forEach((pos, i) => {
                v.push({x: pos.x, y: -3, z: pos.z, c: i % 2 === 0 ? lightGreen : lightRed});
            });
            
            return v;
        })(),
        
        // Outer spinning ring (separate for animation)
        spinRing: (() => {
            const v = [];
            const ringColor = '#4169E1';      // Royal blue ring
            const ringHighlight = '#6495ED';  // Lighter accents
            const ringGlow = '#00BFFF';       // Glowing segments
            
            // Create ring segments
            for (let angle = 0; angle < 360; angle += 15) {
                const rad = angle * Math.PI / 180;
                const x = Math.round(Math.cos(rad) * 10);
                const z = Math.round(Math.sin(rad) * 10);
                
                // Ring segment
                const isGlow = angle % 60 === 0;
                v.push({x, y: -1, z, c: isGlow ? ringGlow : ringColor});
                v.push({x, y: 0, z, c: isGlow ? ringGlow : ringHighlight});
                
                // Fill in gaps
                const x2 = Math.round(Math.cos(rad) * 9);
                const z2 = Math.round(Math.sin(rad) * 9);
                v.push({x: x2, y: -1, z: z2, c: ringColor});
            }
            
            return v;
        })(),
        
        animated: true,
        animationType: 'ufo_hover',
        hidesFeet: true,
        riderOffset: { y: 2, z: 0 },
        speedBoost: 1.25,  // 25% speed boost - UFOs are fast!
        scale: 0.18,
        positionY: 1.4,  // Higher hover
        // Animation configuration
        hoverSpeed: 3,
        hoverIntensity: 0.12,
        ringSpinSpeed: 2,
        tiltAmount: 0.35,  // More aggressive lean
        hasAbductionRay: true
    },
    
    // MYTHIC: Rocket Jetpack - Fly with fire trail!
    rocketJetpack: {
        voxels: (() => {
            const v = [];
            // Colors
            const bodyWhite = '#F5F5F5';       // Main body
            const bodyGray = '#C0C0C0';        // Metallic accents
            const bodyDark = '#404040';        // Dark details
            const redAccent = '#E63946';       // Red racing stripes
            const blueAccent = '#1E90FF';      // Blue accents
            const goldTrim = '#FFD700';        // Gold trim
            const exhaustMetal = '#606060';    // Exhaust nozzles
            const exhaustGlow = '#FF4500';     // Orange glow inside exhaust
            
            // === MAIN BODY (cylindrical tanks) ===
            // Two fuel tanks side by side
            for (let tank = -1; tank <= 1; tank += 2) {
                const offsetX = tank * 3;
                
                // Tank body (cylinder shape)
                for (let y = -4; y <= 8; y++) {
                    for (let x = -2; x <= 2; x++) {
                        for (let z = -2; z <= 2; z++) {
                            const dist = Math.sqrt(x*x + z*z);
                            if (dist <= 2.2) {
                                // Rounded top
                                if (y === 8 && dist <= 1.5) {
                                    v.push({x: offsetX + x, y, z, c: goldTrim});
                                } else if (y >= 6) {
                                    v.push({x: offsetX + x, y, z, c: bodyGray});
                                }
                                // Main body with stripe
                                else if (y >= -2) {
                                    const isStripe = x === 0 && z < 0;
                                    v.push({x: offsetX + x, y, z, c: isStripe ? redAccent : bodyWhite});
                                }
                                // Bottom section
                                else {
                                    v.push({x: offsetX + x, y, z, c: bodyDark});
                                }
                            }
                        }
                    }
                }
                
                // Exhaust nozzle at bottom
                for (let y = -7; y <= -4; y++) {
                    for (let x = -1; x <= 1; x++) {
                        for (let z = -1; z <= 1; z++) {
                            const isInner = y > -6 && Math.abs(x) <= 0.5 && Math.abs(z) <= 0.5;
                            v.push({x: offsetX + x, y, z, c: isInner ? exhaustGlow : exhaustMetal});
                        }
                    }
                }
            }
            
            // === CENTER CONNECTOR/BACKPACK ===
            for (let y = 0; y <= 6; y++) {
                for (let x = -1; x <= 1; x++) {
                    for (let z = -1; z <= 1; z++) {
                        const isBlue = y === 3 || y === 4;
                        v.push({x, y, z, c: isBlue ? blueAccent : bodyGray});
                    }
                }
            }
            
            // Control panel on front
            v.push({x: 0, y: 4, z: -2, c: bodyDark});
            v.push({x: 0, y: 3, z: -2, c: '#00FF00'}); // Green status light
            
            // === WINGS/FINS (small stabilizers) ===
            for (let y = 2; y <= 5; y++) {
                // Left fin
                v.push({x: -6, y, z: 0, c: redAccent});
                v.push({x: -7, y: y < 4 ? y : 4, z: 0, c: redAccent});
                // Right fin
                v.push({x: 6, y, z: 0, c: redAccent});
                v.push({x: 7, y: y < 4 ? y : 4, z: 0, c: redAccent});
            }
            
            return v;
        })(),
        
        animated: true,
        animationType: 'jetpack_thrust',
        hidesFeet: false,  // Feet dangle below
        riderOffset: { y: 2, z: 0.6},  // Player in front of jetpack
        speedBoost: 1.4,  // 40% speed boost - jetpacks are FAST!
        scale: 0.14,
        positionY: 1.6,
        // Animation configuration
        hoverSpeed: 5,
        hoverIntensity: 0.06,
        thrustWobble: 0.04,
        hasFireTrail: true
    },
    
    // ========== BABY DRAGONS (Legendary - simpler, cuter) ==========
    
    // LEGENDARY: Baby Ice Dragon - Adorable ice dragon hatchling!
    babyIceDragon: {
        voxels: (() => {
            const v = [];
            const bodyIce = '#B0E0E6';
            const bodyLight = '#E0FFFF';
            const bodyDark = '#5F9EA0';
            const bellyWhite = '#F0FFFF';
            const eyeGold = '#FFD700';
            const eyePupil = '#000000';
            const hornIce = '#ADD8E6';
            const clawWhite = '#FFFFFF';
            const spineBlue = '#4169E1';
            
            // Body
            for (let z = -6; z <= 8; z++) {
                const widthMod = z < 0 ? Math.max(2, 4 + z * 0.5) : Math.max(2, 4 - (z - 2) * 0.3);
                const heightMod = z < 0 ? 3 : Math.max(2, 3 - (z - 2) * 0.15);
                for (let x = -Math.floor(widthMod); x <= Math.floor(widthMod); x++) {
                    for (let y = 0; y <= Math.floor(heightMod); y++) {
                        const isBelly = y === 0 && Math.abs(x) < widthMod - 1;
                        const isTop = y === Math.floor(heightMod);
                        v.push({x, y, z, c: isBelly ? bellyWhite : (isTop ? bodyLight : bodyIce)});
                    }
                }
            }
            // Head
            for (let z = -10; z <= -6; z++) {
                const headSize = z < -8 ? 2 : 3;
                for (let x = -headSize; x <= headSize; x++) {
                    for (let y = 1; y <= 4; y++) {
                        if (z === -10 && (y > 3 || Math.abs(x) > 1)) continue;
                        v.push({x, y, z, c: bodyIce});
                    }
                }
            }
            // Eyes
            v.push({x: -2, y: 3, z: -8, c: eyeGold});
            v.push({x: 2, y: 3, z: -8, c: eyeGold});
            v.push({x: -2, y: 3, z: -9, c: eyePupil});
            v.push({x: 2, y: 3, z: -9, c: eyePupil});
            // Horns
            for (let i = 0; i < 4; i++) {
                v.push({x: -2, y: 5 + i, z: -7 + i, c: hornIce});
                v.push({x: 2, y: 5 + i, z: -7 + i, c: hornIce});
            }
            // Nostrils
            v.push({x: -1, y: 2, z: -11, c: bodyDark});
            v.push({x: 1, y: 2, z: -11, c: bodyDark});
            // Tail
            for (let z = 9; z <= 16; z++) {
                const tailWidth = Math.max(0, 2 - Math.floor((z - 9) / 3));
                for (let x = -tailWidth; x <= tailWidth; x++) {
                    const tailHeight = Math.max(1, 2 - Math.floor((z - 9) / 4));
                    for (let y = 0; y <= tailHeight; y++) {
                        v.push({x, y, z, c: z > 13 ? bodyDark : bodyIce});
                    }
                }
            }
            v.push({x: 0, y: 3, z: 14, c: spineBlue});
            v.push({x: 0, y: 2, z: 16, c: spineBlue});
            // Spines
            for (let z = -5; z <= 8; z += 2) {
                v.push({x: 0, y: 4, z, c: spineBlue});
                if (z < 5) v.push({x: 0, y: 5, z, c: spineBlue});
            }
            // Legs
            for (let y = -3; y < 0; y++) {
                v.push({x: -3, y, z: -4, c: bodyDark});
                v.push({x: 3, y, z: -4, c: bodyDark});
                v.push({x: -3, y, z: 4, c: bodyDark});
                v.push({x: 3, y, z: 4, c: bodyDark});
            }
            // Claws
            v.push({x: -3, y: -4, z: -5, c: clawWhite});
            v.push({x: 3, y: -4, z: -5, c: clawWhite});
            v.push({x: -3, y: -4, z: 3, c: clawWhite});
            v.push({x: 3, y: -4, z: 3, c: clawWhite});
            return v;
        })(),
        leftWing: (() => {
            const v = [];
            const wingMembrane = '#87CEEB';
            const wingBone = '#B0C4DE';
            for (let i = 0; i < 8; i++) v.push({x: -4 - i, y: 3 - Math.floor(i/3), z: 0, c: wingBone});
            for (let i = 0; i < 6; i++) {
                v.push({x: -4 - i, y: 2, z: -2 + Math.floor(i/2), c: wingBone});
                v.push({x: -4 - i, y: 2, z: 2 - Math.floor(i/2), c: wingBone});
            }
            for (let x = -5; x >= -10; x--) {
                for (let z = -2; z <= 2; z++) {
                    if (Math.abs(z) <= Math.min(2, (-x - 5) / 2 + 1)) v.push({x, y: 2, z, c: wingMembrane});
                }
            }
            return v;
        })(),
        rightWing: (() => {
            const v = [];
            const wingMembrane = '#87CEEB';
            const wingBone = '#B0C4DE';
            for (let i = 0; i < 8; i++) v.push({x: 4 + i, y: 3 - Math.floor(i/3), z: 0, c: wingBone});
            for (let i = 0; i < 6; i++) {
                v.push({x: 4 + i, y: 2, z: -2 + Math.floor(i/2), c: wingBone});
                v.push({x: 4 + i, y: 2, z: 2 - Math.floor(i/2), c: wingBone});
            }
            for (let x = 5; x <= 10; x++) {
                for (let z = -2; z <= 2; z++) {
                    if (Math.abs(z) <= Math.min(2, (x - 5) / 2 + 1)) v.push({x, y: 2, z, c: wingMembrane});
                }
            }
            return v;
        })(),
        animated: true,
        animationType: 'dragon_fly',
        hidesFeet: true,
        riderOffset: { y: 1.5, z: -0.25 },
        speedBoost: 1.2,
        scale: 0.18,
        positionY: 0.8,
        mountRotation: Math.PI,
        flapSpeed: 4,
        flapIntensity: 0.6,
        bodyBobSpeed: 2.5,
        bodyBobIntensity: 0.08,
        breathInterval: 5,
        breathDuration: 1.2,
        hasIceBreath: true,
        breathColor: 'ice'
    },
    
    // LEGENDARY: Baby Fire Dragon - Fierce little fire breather!
    babyFireDragon: {
        voxels: (() => {
            const v = [];
            const bodyRed = '#C0392B';
            const bodyOrange = '#E74C3C';
            const bodyDark = '#922B21';
            const bellyYellow = '#F39C12';
            const eyeGold = '#F1C40F';
            const eyePupil = '#000000';
            const hornDark = '#7B241C';
            const clawBlack = '#1C1C1C';
            const spineOrange = '#E67E22';
            
            for (let z = -6; z <= 8; z++) {
                const widthMod = z < 0 ? Math.max(2, 4 + z * 0.5) : Math.max(2, 4 - (z - 2) * 0.3);
                const heightMod = z < 0 ? 3 : Math.max(2, 3 - (z - 2) * 0.15);
                for (let x = -Math.floor(widthMod); x <= Math.floor(widthMod); x++) {
                    for (let y = 0; y <= Math.floor(heightMod); y++) {
                        const isBelly = y === 0 && Math.abs(x) < widthMod - 1;
                        const isTop = y === Math.floor(heightMod);
                        v.push({x, y, z, c: isBelly ? bellyYellow : (isTop ? bodyOrange : bodyRed)});
                    }
                }
            }
            for (let z = -10; z <= -6; z++) {
                const headSize = z < -8 ? 2 : 3;
                for (let x = -headSize; x <= headSize; x++) {
                    for (let y = 1; y <= 4; y++) {
                        if (z === -10 && (y > 3 || Math.abs(x) > 1)) continue;
                        v.push({x, y, z, c: bodyRed});
                    }
                }
            }
            v.push({x: -2, y: 3, z: -8, c: eyeGold});
            v.push({x: 2, y: 3, z: -8, c: eyeGold});
            v.push({x: -2, y: 3, z: -9, c: eyePupil});
            v.push({x: 2, y: 3, z: -9, c: eyePupil});
            for (let i = 0; i < 4; i++) {
                v.push({x: -2, y: 5 + i, z: -7 + i, c: hornDark});
                v.push({x: 2, y: 5 + i, z: -7 + i, c: hornDark});
            }
            v.push({x: -1, y: 2, z: -11, c: bodyDark});
            v.push({x: 1, y: 2, z: -11, c: bodyDark});
            for (let z = 9; z <= 16; z++) {
                const tailWidth = Math.max(0, 2 - Math.floor((z - 9) / 3));
                for (let x = -tailWidth; x <= tailWidth; x++) {
                    const tailHeight = Math.max(1, 2 - Math.floor((z - 9) / 4));
                    for (let y = 0; y <= tailHeight; y++) {
                        v.push({x, y, z, c: z > 13 ? bodyDark : bodyRed});
                    }
                }
            }
            v.push({x: 0, y: 3, z: 14, c: spineOrange});
            v.push({x: 0, y: 2, z: 16, c: spineOrange});
            for (let z = -5; z <= 8; z += 2) {
                v.push({x: 0, y: 4, z, c: spineOrange});
                if (z < 5) v.push({x: 0, y: 5, z, c: spineOrange});
            }
            for (let y = -3; y < 0; y++) {
                v.push({x: -3, y, z: -4, c: bodyDark});
                v.push({x: 3, y, z: -4, c: bodyDark});
                v.push({x: -3, y, z: 4, c: bodyDark});
                v.push({x: 3, y, z: 4, c: bodyDark});
            }
            v.push({x: -3, y: -4, z: -5, c: clawBlack});
            v.push({x: 3, y: -4, z: -5, c: clawBlack});
            v.push({x: -3, y: -4, z: 3, c: clawBlack});
            v.push({x: 3, y: -4, z: 3, c: clawBlack});
            return v;
        })(),
        leftWing: (() => {
            const v = [];
            const wingMembrane = '#E74C3C';
            const wingBone = '#922B21';
            for (let i = 0; i < 8; i++) v.push({x: -4 - i, y: 3 - Math.floor(i/3), z: 0, c: wingBone});
            for (let i = 0; i < 6; i++) {
                v.push({x: -4 - i, y: 2, z: -2 + Math.floor(i/2), c: wingBone});
                v.push({x: -4 - i, y: 2, z: 2 - Math.floor(i/2), c: wingBone});
            }
            for (let x = -5; x >= -10; x--) {
                for (let z = -2; z <= 2; z++) {
                    if (Math.abs(z) <= Math.min(2, (-x - 5) / 2 + 1)) v.push({x, y: 2, z, c: wingMembrane});
                }
            }
            return v;
        })(),
        rightWing: (() => {
            const v = [];
            const wingMembrane = '#E74C3C';
            const wingBone = '#922B21';
            for (let i = 0; i < 8; i++) v.push({x: 4 + i, y: 3 - Math.floor(i/3), z: 0, c: wingBone});
            for (let i = 0; i < 6; i++) {
                v.push({x: 4 + i, y: 2, z: -2 + Math.floor(i/2), c: wingBone});
                v.push({x: 4 + i, y: 2, z: 2 - Math.floor(i/2), c: wingBone});
            }
            for (let x = 5; x <= 10; x++) {
                for (let z = -2; z <= 2; z++) {
                    if (Math.abs(z) <= Math.min(2, (x - 5) / 2 + 1)) v.push({x, y: 2, z, c: wingMembrane});
                }
            }
            return v;
        })(),
        animated: true,
        animationType: 'dragon_fly',
        hidesFeet: true,
        riderOffset: { y: 1.5, z: -0.25 },
        speedBoost: 1.25,
        scale: 0.18,
        positionY: 0.8,
        mountRotation: Math.PI,
        flapSpeed: 4,
        flapIntensity: 0.6,
        bodyBobSpeed: 2.5,
        bodyBobIntensity: 0.08,
        breathInterval: 4,
        breathDuration: 1.5,
        hasFireBreath: true,
        breathColor: 'fire'
    },
    
    // LEGENDARY: Baby Void Dragon - Mysterious shadow hatchling!
    babyVoidDragon: {
        voxels: (() => {
            const v = [];
            const bodyVoid = '#2C2C54';
            const bodyPurple = '#474787';
            const bodyDark = '#1B1B2F';
            const bellyDark = '#40407A';
            const eyePurple = '#9B59B6';
            const eyeGlow = '#E056FD';
            const hornVoid = '#1F1F3D';
            const clawPurple = '#5B2C6F';
            const spineGlow = '#8E44AD';
            
            for (let z = -6; z <= 8; z++) {
                const widthMod = z < 0 ? Math.max(2, 4 + z * 0.5) : Math.max(2, 4 - (z - 2) * 0.3);
                const heightMod = z < 0 ? 3 : Math.max(2, 3 - (z - 2) * 0.15);
                for (let x = -Math.floor(widthMod); x <= Math.floor(widthMod); x++) {
                    for (let y = 0; y <= Math.floor(heightMod); y++) {
                        const isBelly = y === 0 && Math.abs(x) < widthMod - 1;
                        const isTop = y === Math.floor(heightMod);
                        v.push({x, y, z, c: isBelly ? bellyDark : (isTop ? bodyPurple : bodyVoid)});
                    }
                }
            }
            for (let z = -10; z <= -6; z++) {
                const headSize = z < -8 ? 2 : 3;
                for (let x = -headSize; x <= headSize; x++) {
                    for (let y = 1; y <= 4; y++) {
                        if (z === -10 && (y > 3 || Math.abs(x) > 1)) continue;
                        v.push({x, y, z, c: bodyVoid});
                    }
                }
            }
            v.push({x: -2, y: 3, z: -8, c: eyeGlow});
            v.push({x: 2, y: 3, z: -8, c: eyeGlow});
            v.push({x: -2, y: 3, z: -9, c: eyePurple});
            v.push({x: 2, y: 3, z: -9, c: eyePurple});
            for (let i = 0; i < 4; i++) {
                v.push({x: -2, y: 5 + i, z: -7 + i, c: hornVoid});
                v.push({x: 2, y: 5 + i, z: -7 + i, c: hornVoid});
            }
            v.push({x: -1, y: 2, z: -11, c: bodyDark});
            v.push({x: 1, y: 2, z: -11, c: bodyDark});
            for (let z = 9; z <= 16; z++) {
                const tailWidth = Math.max(0, 2 - Math.floor((z - 9) / 3));
                for (let x = -tailWidth; x <= tailWidth; x++) {
                    const tailHeight = Math.max(1, 2 - Math.floor((z - 9) / 4));
                    for (let y = 0; y <= tailHeight; y++) {
                        v.push({x, y, z, c: z > 13 ? bodyDark : bodyVoid});
                    }
                }
            }
            v.push({x: 0, y: 3, z: 14, c: spineGlow});
            v.push({x: 0, y: 2, z: 16, c: spineGlow});
            for (let z = -5; z <= 8; z += 2) {
                v.push({x: 0, y: 4, z, c: spineGlow});
                if (z < 5) v.push({x: 0, y: 5, z, c: spineGlow});
            }
            for (let y = -3; y < 0; y++) {
                v.push({x: -3, y, z: -4, c: bodyDark});
                v.push({x: 3, y, z: -4, c: bodyDark});
                v.push({x: -3, y, z: 4, c: bodyDark});
                v.push({x: 3, y, z: 4, c: bodyDark});
            }
            v.push({x: -3, y: -4, z: -5, c: clawPurple});
            v.push({x: 3, y: -4, z: -5, c: clawPurple});
            v.push({x: -3, y: -4, z: 3, c: clawPurple});
            v.push({x: 3, y: -4, z: 3, c: clawPurple});
            return v;
        })(),
        leftWing: (() => {
            const v = [];
            const wingMembrane = '#474787';
            const wingBone = '#2C2C54';
            for (let i = 0; i < 8; i++) v.push({x: -4 - i, y: 3 - Math.floor(i/3), z: 0, c: wingBone});
            for (let i = 0; i < 6; i++) {
                v.push({x: -4 - i, y: 2, z: -2 + Math.floor(i/2), c: wingBone});
                v.push({x: -4 - i, y: 2, z: 2 - Math.floor(i/2), c: wingBone});
            }
            for (let x = -5; x >= -10; x--) {
                for (let z = -2; z <= 2; z++) {
                    if (Math.abs(z) <= Math.min(2, (-x - 5) / 2 + 1)) v.push({x, y: 2, z, c: wingMembrane});
                }
            }
            return v;
        })(),
        rightWing: (() => {
            const v = [];
            const wingMembrane = '#474787';
            const wingBone = '#2C2C54';
            for (let i = 0; i < 8; i++) v.push({x: 4 + i, y: 3 - Math.floor(i/3), z: 0, c: wingBone});
            for (let i = 0; i < 6; i++) {
                v.push({x: 4 + i, y: 2, z: -2 + Math.floor(i/2), c: wingBone});
                v.push({x: 4 + i, y: 2, z: 2 - Math.floor(i/2), c: wingBone});
            }
            for (let x = 5; x <= 10; x++) {
                for (let z = -2; z <= 2; z++) {
                    if (Math.abs(z) <= Math.min(2, (x - 5) / 2 + 1)) v.push({x, y: 2, z, c: wingMembrane});
                }
            }
            return v;
        })(),
        animated: true,
        animationType: 'dragon_fly',
        hidesFeet: true,
        riderOffset: { y: 1.5, z: -0.25 },
        speedBoost: 1.2,
        scale: 0.18,
        positionY: 0.8,
        mountRotation: Math.PI,
        flapSpeed: 3.5,
        flapIntensity: 0.7,
        bodyBobSpeed: 2,
        bodyBobIntensity: 0.1,
        breathInterval: 6,
        breathDuration: 1.0,
        hasVoidBreath: true,
        breathColor: 'void'
    },
    
    // ========== ADULT DRAGONS (Mythic - massive, detailed) ==========
    
    // MYTHIC: Ice Dragon - Majestic dragon with flapping wings and ice breath!
    iceDragon: {
        voxels: (() => {
            const v = [];
            // Enhanced color palette for detailed dragon
            const bodyPrimary = '#A8D8EA';     // Main ice blue body
            const bodyLight = '#D6EAF8';       // Lighter highlights
            const bodyMid = '#85C1E9';         // Mid-tone
            const bodyDark = '#5DADE2';        // Darker accents
            const bodyDeep = '#3498DB';        // Deep blue shadows
            const bellyWhite = '#EBF5FB';      // Pale belly scales
            const bellyScale = '#D4E6F1';      // Belly scale detail
            const eyeGlow = '#00FFFF';         // Glowing cyan eyes
            const eyeCore = '#FFFFFF';         // Eye highlight
            const eyePupil = '#1A1A2E';        // Deep blue pupil
            const hornBase = '#AED6F1';        // Horn base
            const hornTip = '#FFFFFF';         // Icy horn tips
            const clawIce = '#E8F6F3';         // Icy white claws
            const spineGlow = '#5DADE2';       // Glowing spines
            const spineTip = '#AED6F1';        // Spine tips
            const teethWhite = '#FDFEFE';      // Sharp teeth
            const nostrilDark = '#2E4053';     // Nostril holes
            const scaleAccent = '#7FB3D5';     // Scale edge highlights
            
            // === MAIN BODY (muscular dragon torso) ===
            // Chest/shoulder area (widest)
            for (let z = -8; z <= 12; z++) {
                // Body profile - chest bulges, tapers to tail
                let width, height;
                if (z < -4) {
                    // Neck area (thinner)
                    width = 3 + (z + 8) * 0.3;
                    height = 4;
                } else if (z < 4) {
                    // Chest/torso (widest, muscular)
                    width = 5 + Math.sin((z + 4) * 0.4) * 1.5;
                    height = 5 + Math.sin((z + 4) * 0.3);
                } else {
                    // Rear/hips tapering to tail
                    width = Math.max(2, 5 - (z - 4) * 0.4);
                    height = Math.max(3, 5 - (z - 4) * 0.25);
                }
                
                for (let x = -Math.floor(width); x <= Math.floor(width); x++) {
                    for (let y = -1; y <= Math.floor(height); y++) {
                        const distFromCenter = Math.abs(x) / width;
                        const isEdge = distFromCenter > 0.7;
                        const isBelly = y <= 0;
                        const isTop = y >= height - 1;
                        const isSpineRidge = Math.abs(x) <= 1 && y >= height - 1;
                        
                        let color;
                        if (isBelly) {
                            // Detailed belly scales
                            color = (x + z) % 2 === 0 ? bellyWhite : bellyScale;
                        } else if (isSpineRidge) {
                            color = bodyLight;
                        } else if (isTop) {
                            color = bodyMid;
                        } else if (isEdge) {
                            color = bodyDark;
                        } else {
                            // Body with scale pattern
                            color = (x + y + z) % 3 === 0 ? scaleAccent : bodyPrimary;
                        }
                        v.push({x, y, z, c: color});
                    }
                }
            }
            
            // === DETAILED HEAD ===
            // Skull base
            for (let z = -14; z <= -8; z++) {
                const headProgress = (z + 14) / 6; // 0 at snout, 1 at neck
                const headWidth = 2 + headProgress * 2.5;
                const headHeight = 3 + headProgress * 2;
                const jawDrop = z < -11 ? 1 : 0; // Lower jaw extends
                
                for (let x = -Math.floor(headWidth); x <= Math.floor(headWidth); x++) {
                    for (let y = -jawDrop; y <= Math.floor(headHeight); y++) {
                        const isJaw = y < 1;
                        const isSnoutTop = z < -12 && y >= 2;
                        const isCheek = Math.abs(x) > headWidth - 1;
                        
                        let color = isJaw ? bodyDark : (isSnoutTop ? bodyLight : bodyPrimary);
                        if (isCheek) color = bodyMid;
                        v.push({x, y, z, c: color});
                    }
                }
            }
            
            // Snout tip detail
            for (let x = -1; x <= 1; x++) {
                v.push({x, y: 2, z: -15, c: bodyLight});
                v.push({x, y: 1, z: -15, c: bodyPrimary});
            }
            
            // Nostrils (glowing frost)
            v.push({x: -1, y: 2, z: -15, c: nostrilDark});
            v.push({x: 1, y: 2, z: -15, c: nostrilDark});
            v.push({x: -1, y: 2, z: -16, c: eyeGlow}); // Frost glow from nostrils
            v.push({x: 1, y: 2, z: -16, c: eyeGlow});
            
            // Eyes (large, glowing, detailed)
            // Left eye
            v.push({x: -3, y: 4, z: -11, c: eyePupil});
            v.push({x: -3, y: 4, z: -10, c: eyeGlow});
            v.push({x: -3, y: 5, z: -11, c: eyeCore});
            v.push({x: -4, y: 4, z: -11, c: eyeGlow});
            // Right eye
            v.push({x: 3, y: 4, z: -11, c: eyePupil});
            v.push({x: 3, y: 4, z: -10, c: eyeGlow});
            v.push({x: 3, y: 5, z: -11, c: eyeCore});
            v.push({x: 4, y: 4, z: -11, c: eyeGlow});
            
            // Brow ridges
            for (let i = 0; i < 3; i++) {
                v.push({x: -3 - i * 0.5, y: 6, z: -10 + i, c: bodyDark});
                v.push({x: 3 + i * 0.5, y: 6, z: -10 + i, c: bodyDark});
            }
            
            // Teeth (visible in slightly open mouth)
            for (let x = -2; x <= 2; x++) {
                if (x !== 0) {
                    v.push({x, y: 0, z: -13, c: teethWhite});
                    v.push({x, y: -1, z: -12, c: teethWhite});
                }
            }
            // Fangs
            v.push({x: -2, y: -1, z: -13, c: teethWhite});
            v.push({x: 2, y: -1, z: -13, c: teethWhite});
            
            // === MAJESTIC HORNS ===
            // Main horns (curved back, icy)
            for (let i = 0; i < 7; i++) {
                const hornY = 6 + i * 0.8;
                const hornZ = -9 + i * 1.2;
                const hornColor = i < 4 ? hornBase : hornTip;
                v.push({x: -3, y: Math.floor(hornY), z: Math.floor(hornZ), c: hornColor});
                v.push({x: 3, y: Math.floor(hornY), z: Math.floor(hornZ), c: hornColor});
                // Horn thickness at base
                if (i < 3) {
                    v.push({x: -2, y: Math.floor(hornY), z: Math.floor(hornZ), c: hornBase});
                    v.push({x: 2, y: Math.floor(hornY), z: Math.floor(hornZ), c: hornBase});
                }
            }
            
            // Smaller head spikes/crests
            for (let i = 0; i < 4; i++) {
                v.push({x: -4, y: 5 + i * 0.5, z: -8 + i, c: spineTip});
                v.push({x: 4, y: 5 + i * 0.5, z: -8 + i, c: spineTip});
            }
            
            // === SPINE RIDGE (glowing ice spines) ===
            for (let z = -6; z <= 10; z += 1.5) {
                const spineHeight = z < 4 ? 3 : Math.max(1, 3 - (z - 4) * 0.3);
                for (let h = 0; h < spineHeight; h++) {
                    const color = h === Math.floor(spineHeight) - 1 ? spineTip : spineGlow;
                    v.push({x: 0, y: 6 + h, z: Math.floor(z), c: color});
                }
            }
            
            // === LONG DETAILED TAIL ===
            for (let z = 13; z <= 28; z++) {
                const tailProgress = (z - 13) / 15;
                const tailWidth = Math.max(0.5, 2.5 * (1 - tailProgress));
                const tailHeight = Math.max(1, 3 * (1 - tailProgress));
                
                for (let x = -Math.floor(tailWidth); x <= Math.floor(tailWidth); x++) {
                    for (let y = -1; y <= Math.floor(tailHeight); y++) {
                        const isTip = z > 24;
                        v.push({x, y, z, c: isTip ? bodyDeep : bodyDark});
                    }
                }
                
                // Tail spines
                if (z % 3 === 0 && z < 26) {
                    v.push({x: 0, y: Math.floor(tailHeight) + 1, z, c: spineGlow});
                }
            }
            
            // Tail fin/blade at end
            for (let i = 0; i < 4; i++) {
                v.push({x: 0, y: i, z: 28 + i * 0.5, c: spineTip});
                v.push({x: -1, y: i * 0.5, z: 27 + i, c: bodyDeep});
                v.push({x: 1, y: i * 0.5, z: 27 + i, c: bodyDeep});
            }
            
            // === POWERFUL LEGS ===
            // Front legs (muscular)
            for (let side of [-1, 1]) {
                const legX = side * 4;
                // Upper leg (thick)
                for (let y = -4; y < 0; y++) {
                    v.push({x: legX, y, z: -4, c: bodyDark});
                    v.push({x: legX + side, y, z: -4, c: bodyMid});
                    v.push({x: legX, y, z: -3, c: bodyMid});
                }
                // Lower leg
                for (let y = -7; y < -4; y++) {
                    v.push({x: legX, y, z: -5, c: bodyDeep});
                }
                // Foot with claws
                v.push({x: legX, y: -8, z: -6, c: bodyDeep});
                v.push({x: legX - side, y: -8, z: -7, c: clawIce}); // Side claw
                v.push({x: legX, y: -8, z: -7, c: clawIce});        // Center claw
                v.push({x: legX + side, y: -8, z: -7, c: clawIce}); // Side claw
            }
            
            // Back legs (powerful haunches)
            for (let side of [-1, 1]) {
                const legX = side * 4;
                // Upper leg/haunch (very thick)
                for (let y = -3; y < 1; y++) {
                    v.push({x: legX, y, z: 6, c: bodyDark});
                    v.push({x: legX + side, y, z: 6, c: bodyMid});
                    v.push({x: legX, y, z: 7, c: bodyMid});
                    v.push({x: legX + side, y, z: 7, c: bodyPrimary});
                }
                // Lower leg
                for (let y = -6; y < -3; y++) {
                    v.push({x: legX, y, z: 7, c: bodyDeep});
                }
                // Foot with claws
                v.push({x: legX, y: -7, z: 7, c: bodyDeep});
                v.push({x: legX - side, y: -7, z: 8, c: clawIce});
                v.push({x: legX, y: -7, z: 8, c: clawIce});
                v.push({x: legX + side, y: -7, z: 8, c: clawIce});
            }
            
            return v;
        })(),
        
        // Left wing (detailed with bones and membrane)
        leftWing: (() => {
            const v = [];
            const wingMembrane = '#87CEEB';    // Sky blue membrane
            const membraneLight = '#B3D9F2';   // Lighter membrane
            const membraneDark = '#5DADE2';    // Darker membrane edges
            const wingBone = '#D5DBDB';        // Bone color
            const wingJoint = '#AEB6BF';       // Joint color
            
            // Main wing arm bone
            for (let i = 0; i < 12; i++) {
                const boneY = 4 - Math.floor(i / 4);
                v.push({x: -5 - i, y: boneY, z: 0, c: wingBone});
                v.push({x: -5 - i, y: boneY - 1, z: 0, c: wingJoint});
            }
            
            // Wing fingers (3 main bones radiating out)
            // Finger 1 (forward)
            for (let i = 0; i < 10; i++) {
                v.push({x: -8 - i, y: 3, z: -3 - Math.floor(i/2), c: wingBone});
            }
            // Finger 2 (middle)
            for (let i = 0; i < 12; i++) {
                v.push({x: -10 - i, y: 2, z: 0, c: wingBone});
            }
            // Finger 3 (back)
            for (let i = 0; i < 10; i++) {
                v.push({x: -8 - i, y: 2, z: 3 + Math.floor(i/2), c: wingBone});
            }
            
            // Wing membrane (fills between bones)
            for (let x = -8; x >= -20; x--) {
                const progress = (-x - 8) / 12;
                const zFront = -2 - Math.floor(progress * 5);
                const zBack = 2 + Math.floor(progress * 5);
                
                for (let z = zFront; z <= zBack; z++) {
                    // Gradient from light (top) to dark (bottom)
                    const zProgress = (z - zFront) / (zBack - zFront);
                    let color = wingMembrane;
                    if (zProgress < 0.2 || zProgress > 0.8) color = membraneDark;
                    else if (Math.random() < 0.3) color = membraneLight;
                    
                    v.push({x, y: 2, z, c: color});
                    // Add some thickness
                    if (x > -15) v.push({x, y: 1, z, c: membraneDark});
                }
            }
            
            // Wing claw at joint
            v.push({x: -6, y: 5, z: -1, c: '#E8F6F3'});
            
            return v;
        })(),
        
        // Right wing (mirrored)
        rightWing: (() => {
            const v = [];
            const wingMembrane = '#87CEEB';
            const membraneLight = '#B3D9F2';
            const membraneDark = '#5DADE2';
            const wingBone = '#D5DBDB';
            const wingJoint = '#AEB6BF';
            
            // Main wing arm bone
            for (let i = 0; i < 12; i++) {
                const boneY = 4 - Math.floor(i / 4);
                v.push({x: 5 + i, y: boneY, z: 0, c: wingBone});
                v.push({x: 5 + i, y: boneY - 1, z: 0, c: wingJoint});
            }
            
            // Wing fingers
            for (let i = 0; i < 10; i++) {
                v.push({x: 8 + i, y: 3, z: -3 - Math.floor(i/2), c: wingBone});
            }
            for (let i = 0; i < 12; i++) {
                v.push({x: 10 + i, y: 2, z: 0, c: wingBone});
            }
            for (let i = 0; i < 10; i++) {
                v.push({x: 8 + i, y: 2, z: 3 + Math.floor(i/2), c: wingBone});
            }
            
            // Wing membrane
            for (let x = 8; x <= 20; x++) {
                const progress = (x - 8) / 12;
                const zFront = -2 - Math.floor(progress * 5);
                const zBack = 2 + Math.floor(progress * 5);
                
                for (let z = zFront; z <= zBack; z++) {
                    const zProgress = (z - zFront) / (zBack - zFront);
                    let color = wingMembrane;
                    if (zProgress < 0.2 || zProgress > 0.8) color = membraneDark;
                    else if (Math.random() < 0.3) color = membraneLight;
                    
                    v.push({x, y: 2, z, c: color});
                    if (x < 15) v.push({x, y: 1, z, c: membraneDark});
                }
            }
            
            // Wing claw
            v.push({x: 6, y: 5, z: -1, c: '#E8F6F3'});
            
            return v;
        })(),
        
        animated: true,
        animationType: 'dragon_fly',
        hidesFeet: true,
        riderOffset: { y: 3.5, z: -0.25 },  // Sit on dragon's back
        speedBoost: 1.35,  // 35% speed boost - dragons are swift!
        scale: 0.45,  // 300% bigger! (was 0.12)
        positionY: 1.8,  // Higher to accommodate size
        mountRotation: Math.PI,  // Face forward
        // Animation configuration
        flapSpeed: 3,           // Wing flap speed
        flapIntensity: 0.7,     // Wing flap angle
        bodyBobSpeed: 2,        // Body bob frequency
        bodyBobIntensity: 0.12, // Body bob amount
        tailSwaySpeed: 1.5,     // Tail sway frequency
        tailSwayIntensity: 0.2, // Tail sway amount
        breathInterval: 4,      // Seconds between breath bursts
        breathDuration: 1.5,    // How long breath lasts
        neckBobSpeed: 2.5,      // Head bob frequency
        hasIceBreath: true
    },
    
    // MYTHIC: Fire Dragon - Blazing inferno with flapping wings and fire breath!
    fireDragon: {
        voxels: (() => {
            const v = [];
            const bodyPrimary = '#C0392B';
            const bodyLight = '#E74C3C';
            const bodyMid = '#A93226';
            const bodyDark = '#922B21';
            const bodyDeep = '#641E16';
            const bellyWhite = '#F5B041';
            const bellyScale = '#F39C12';
            const eyeGlow = '#F1C40F';
            const eyeCore = '#FFFFFF';
            const eyePupil = '#1A1A1A';
            const hornBase = '#7B241C';
            const hornTip = '#4A1A13';
            const clawBlack = '#1C1C1C';
            const spineGlow = '#E67E22';
            const spineTip = '#F39C12';
            const teethWhite = '#FDFEFE';
            const nostrilDark = '#2C1810';
            const scaleAccent = '#CD6155';
            
            // Main body
            for (let z = -8; z <= 12; z++) {
                let width, height;
                if (z < -4) { width = 3 + (z + 8) * 0.3; height = 4; }
                else if (z < 4) { width = 5 + Math.sin((z + 4) * 0.4) * 1.5; height = 5 + Math.sin((z + 4) * 0.3); }
                else { width = Math.max(2, 5 - (z - 4) * 0.4); height = Math.max(3, 5 - (z - 4) * 0.25); }
                for (let x = -Math.floor(width); x <= Math.floor(width); x++) {
                    for (let y = -1; y <= Math.floor(height); y++) {
                        const distFromCenter = Math.abs(x) / width;
                        const isEdge = distFromCenter > 0.7;
                        const isBelly = y <= 0;
                        const isTop = y >= height - 1;
                        let color = isBelly ? ((x + z) % 2 === 0 ? bellyWhite : bellyScale) :
                                    isTop ? bodyMid : isEdge ? bodyDark : ((x + y + z) % 3 === 0 ? scaleAccent : bodyPrimary);
                        v.push({x, y, z, c: color});
                    }
                }
            }
            // Head
            for (let z = -14; z <= -8; z++) {
                const headProgress = (z + 14) / 6;
                const headWidth = 2 + headProgress * 2.5;
                const headHeight = 3 + headProgress * 2;
                const jawDrop = z < -11 ? 1 : 0;
                for (let x = -Math.floor(headWidth); x <= Math.floor(headWidth); x++) {
                    for (let y = -jawDrop; y <= Math.floor(headHeight); y++) {
                        const isJaw = y < 1;
                        v.push({x, y, z, c: isJaw ? bodyDark : bodyPrimary});
                    }
                }
            }
            for (let x = -1; x <= 1; x++) { v.push({x, y: 2, z: -15, c: bodyLight}); v.push({x, y: 1, z: -15, c: bodyPrimary}); }
            v.push({x: -1, y: 2, z: -15, c: nostrilDark}); v.push({x: 1, y: 2, z: -15, c: nostrilDark});
            v.push({x: -1, y: 2, z: -16, c: '#FF4500'}); v.push({x: 1, y: 2, z: -16, c: '#FF4500'});
            // Eyes
            v.push({x: -3, y: 4, z: -11, c: eyePupil}); v.push({x: -3, y: 4, z: -10, c: eyeGlow});
            v.push({x: -3, y: 5, z: -11, c: eyeCore}); v.push({x: -4, y: 4, z: -11, c: eyeGlow});
            v.push({x: 3, y: 4, z: -11, c: eyePupil}); v.push({x: 3, y: 4, z: -10, c: eyeGlow});
            v.push({x: 3, y: 5, z: -11, c: eyeCore}); v.push({x: 4, y: 4, z: -11, c: eyeGlow});
            // Horns
            for (let i = 0; i < 7; i++) {
                const hornY = 6 + i * 0.8; const hornZ = -9 + i * 1.2;
                v.push({x: -3, y: Math.floor(hornY), z: Math.floor(hornZ), c: i < 4 ? hornBase : hornTip});
                v.push({x: 3, y: Math.floor(hornY), z: Math.floor(hornZ), c: i < 4 ? hornBase : hornTip});
            }
            // Teeth
            for (let x = -2; x <= 2; x++) {
                if (x !== 0) { v.push({x, y: 0, z: -13, c: teethWhite}); v.push({x, y: -1, z: -12, c: teethWhite}); }
            }
            // Spines
            for (let z = -6; z <= 10; z += 1.5) {
                const spineHeight = z < 4 ? 3 : Math.max(1, 3 - (z - 4) * 0.3);
                for (let h = 0; h < spineHeight; h++) {
                    v.push({x: 0, y: 6 + h, z: Math.floor(z), c: h === Math.floor(spineHeight) - 1 ? spineTip : spineGlow});
                }
            }
            // Tail
            for (let z = 13; z <= 28; z++) {
                const tailProgress = (z - 13) / 15;
                const tailWidth = Math.max(0.5, 2.5 * (1 - tailProgress));
                const tailHeight = Math.max(1, 3 * (1 - tailProgress));
                for (let x = -Math.floor(tailWidth); x <= Math.floor(tailWidth); x++) {
                    for (let y = -1; y <= Math.floor(tailHeight); y++) {
                        v.push({x, y, z, c: z > 24 ? bodyDeep : bodyDark});
                    }
                }
            }
            // Legs
            for (let side of [-1, 1]) {
                const legX = side * 4;
                for (let y = -4; y < 0; y++) { v.push({x: legX, y, z: -4, c: bodyDark}); v.push({x: legX, y, z: -3, c: bodyMid}); }
                for (let y = -7; y < -4; y++) v.push({x: legX, y, z: -5, c: bodyDeep});
                v.push({x: legX, y: -8, z: -6, c: bodyDeep});
                v.push({x: legX - side, y: -8, z: -7, c: clawBlack}); v.push({x: legX, y: -8, z: -7, c: clawBlack});
                for (let y = -3; y < 1; y++) { v.push({x: legX, y, z: 6, c: bodyDark}); v.push({x: legX, y, z: 7, c: bodyMid}); }
                for (let y = -6; y < -3; y++) v.push({x: legX, y, z: 7, c: bodyDeep});
                v.push({x: legX, y: -7, z: 7, c: bodyDeep});
                v.push({x: legX - side, y: -7, z: 8, c: clawBlack}); v.push({x: legX, y: -7, z: 8, c: clawBlack});
            }
            return v;
        })(),
        leftWing: (() => {
            const v = [];
            const wingMembrane = '#E74C3C';
            const membraneLight = '#EC7063';
            const membraneDark = '#C0392B';
            const wingBone = '#922B21';
            const wingJoint = '#641E16';
            for (let i = 0; i < 12; i++) { v.push({x: -5 - i, y: 4 - Math.floor(i/4), z: 0, c: wingBone}); v.push({x: -5 - i, y: 3 - Math.floor(i/4), z: 0, c: wingJoint}); }
            for (let i = 0; i < 10; i++) v.push({x: -8 - i, y: 3, z: -3 - Math.floor(i/2), c: wingBone});
            for (let i = 0; i < 12; i++) v.push({x: -10 - i, y: 2, z: 0, c: wingBone});
            for (let i = 0; i < 10; i++) v.push({x: -8 - i, y: 2, z: 3 + Math.floor(i/2), c: wingBone});
            for (let x = -8; x >= -20; x--) {
                const progress = (-x - 8) / 12;
                const zFront = -2 - Math.floor(progress * 5);
                const zBack = 2 + Math.floor(progress * 5);
                for (let z = zFront; z <= zBack; z++) {
                    const zProgress = (z - zFront) / (zBack - zFront);
                    let color = zProgress < 0.2 || zProgress > 0.8 ? membraneDark : (Math.random() < 0.3 ? membraneLight : wingMembrane);
                    v.push({x, y: 2, z, c: color});
                }
            }
            return v;
        })(),
        rightWing: (() => {
            const v = [];
            const wingMembrane = '#E74C3C';
            const membraneLight = '#EC7063';
            const membraneDark = '#C0392B';
            const wingBone = '#922B21';
            const wingJoint = '#641E16';
            for (let i = 0; i < 12; i++) { v.push({x: 5 + i, y: 4 - Math.floor(i/4), z: 0, c: wingBone}); v.push({x: 5 + i, y: 3 - Math.floor(i/4), z: 0, c: wingJoint}); }
            for (let i = 0; i < 10; i++) v.push({x: 8 + i, y: 3, z: -3 - Math.floor(i/2), c: wingBone});
            for (let i = 0; i < 12; i++) v.push({x: 10 + i, y: 2, z: 0, c: wingBone});
            for (let i = 0; i < 10; i++) v.push({x: 8 + i, y: 2, z: 3 + Math.floor(i/2), c: wingBone});
            for (let x = 8; x <= 20; x++) {
                const progress = (x - 8) / 12;
                const zFront = -2 - Math.floor(progress * 5);
                const zBack = 2 + Math.floor(progress * 5);
                for (let z = zFront; z <= zBack; z++) {
                    const zProgress = (z - zFront) / (zBack - zFront);
                    let color = zProgress < 0.2 || zProgress > 0.8 ? membraneDark : (Math.random() < 0.3 ? membraneLight : wingMembrane);
                    v.push({x, y: 2, z, c: color});
                }
            }
            return v;
        })(),
        animated: true,
        animationType: 'dragon_fly',
        hidesFeet: true,
        riderOffset: { y: 3.5, z: -0.25 },
        speedBoost: 1.4,
        scale: 0.45,
        positionY: 1.8,
        mountRotation: Math.PI,
        flapSpeed: 3,
        flapIntensity: 0.7,
        bodyBobSpeed: 2,
        bodyBobIntensity: 0.12,
        breathInterval: 3,
        breathDuration: 2.0,
        hasFireBreath: true
    },
    
    // MYTHIC: Void Dragon - Eldritch terror from the abyss!
    voidDragon: {
        voxels: (() => {
            const v = [];
            const bodyPrimary = '#1B1B2F';
            const bodyLight = '#2C2C54';
            const bodyMid = '#252545';
            const bodyDark = '#131324';
            const bodyDeep = '#0A0A15';
            const bellyWhite = '#3D3D6B';
            const bellyScale = '#2E2E5E';
            const eyeGlow = '#E056FD';
            const eyeCore = '#F8C8FF';
            const eyePupil = '#9B59B6';
            const hornBase = '#4A235A';
            const hornTip = '#7D3C98';
            const clawPurple = '#6C3483';
            const spineGlow = '#8E44AD';
            const spineTip = '#BB8FCE';
            const teethWhite = '#D7BDE2';
            const nostrilDark = '#0D0D1A';
            const scaleAccent = '#5B2C6F';
            
            // Main body
            for (let z = -8; z <= 12; z++) {
                let width, height;
                if (z < -4) { width = 3 + (z + 8) * 0.3; height = 4; }
                else if (z < 4) { width = 5 + Math.sin((z + 4) * 0.4) * 1.5; height = 5 + Math.sin((z + 4) * 0.3); }
                else { width = Math.max(2, 5 - (z - 4) * 0.4); height = Math.max(3, 5 - (z - 4) * 0.25); }
                for (let x = -Math.floor(width); x <= Math.floor(width); x++) {
                    for (let y = -1; y <= Math.floor(height); y++) {
                        const distFromCenter = Math.abs(x) / width;
                        const isEdge = distFromCenter > 0.7;
                        const isBelly = y <= 0;
                        const isTop = y >= height - 1;
                        let color = isBelly ? ((x + z) % 2 === 0 ? bellyWhite : bellyScale) :
                                    isTop ? bodyMid : isEdge ? bodyDark : ((x + y + z) % 3 === 0 ? scaleAccent : bodyPrimary);
                        v.push({x, y, z, c: color});
                    }
                }
            }
            // Head
            for (let z = -14; z <= -8; z++) {
                const headProgress = (z + 14) / 6;
                const headWidth = 2 + headProgress * 2.5;
                const headHeight = 3 + headProgress * 2;
                const jawDrop = z < -11 ? 1 : 0;
                for (let x = -Math.floor(headWidth); x <= Math.floor(headWidth); x++) {
                    for (let y = -jawDrop; y <= Math.floor(headHeight); y++) {
                        const isJaw = y < 1;
                        v.push({x, y, z, c: isJaw ? bodyDark : bodyPrimary});
                    }
                }
            }
            for (let x = -1; x <= 1; x++) { v.push({x, y: 2, z: -15, c: bodyLight}); v.push({x, y: 1, z: -15, c: bodyPrimary}); }
            v.push({x: -1, y: 2, z: -15, c: nostrilDark}); v.push({x: 1, y: 2, z: -15, c: nostrilDark});
            v.push({x: -1, y: 2, z: -16, c: eyeGlow}); v.push({x: 1, y: 2, z: -16, c: eyeGlow});
            // Eyes (glowing purple)
            v.push({x: -3, y: 4, z: -11, c: eyePupil}); v.push({x: -3, y: 4, z: -10, c: eyeGlow});
            v.push({x: -3, y: 5, z: -11, c: eyeCore}); v.push({x: -4, y: 4, z: -11, c: eyeGlow});
            v.push({x: 3, y: 4, z: -11, c: eyePupil}); v.push({x: 3, y: 4, z: -10, c: eyeGlow});
            v.push({x: 3, y: 5, z: -11, c: eyeCore}); v.push({x: 4, y: 4, z: -11, c: eyeGlow});
            // Horns
            for (let i = 0; i < 7; i++) {
                const hornY = 6 + i * 0.8; const hornZ = -9 + i * 1.2;
                v.push({x: -3, y: Math.floor(hornY), z: Math.floor(hornZ), c: i < 4 ? hornBase : hornTip});
                v.push({x: 3, y: Math.floor(hornY), z: Math.floor(hornZ), c: i < 4 ? hornBase : hornTip});
            }
            // Teeth
            for (let x = -2; x <= 2; x++) {
                if (x !== 0) { v.push({x, y: 0, z: -13, c: teethWhite}); v.push({x, y: -1, z: -12, c: teethWhite}); }
            }
            // Spines (glowing)
            for (let z = -6; z <= 10; z += 1.5) {
                const spineHeight = z < 4 ? 3 : Math.max(1, 3 - (z - 4) * 0.3);
                for (let h = 0; h < spineHeight; h++) {
                    v.push({x: 0, y: 6 + h, z: Math.floor(z), c: h === Math.floor(spineHeight) - 1 ? spineTip : spineGlow});
                }
            }
            // Tail
            for (let z = 13; z <= 28; z++) {
                const tailProgress = (z - 13) / 15;
                const tailWidth = Math.max(0.5, 2.5 * (1 - tailProgress));
                const tailHeight = Math.max(1, 3 * (1 - tailProgress));
                for (let x = -Math.floor(tailWidth); x <= Math.floor(tailWidth); x++) {
                    for (let y = -1; y <= Math.floor(tailHeight); y++) {
                        v.push({x, y, z, c: z > 24 ? bodyDeep : bodyDark});
                    }
                }
            }
            // Legs
            for (let side of [-1, 1]) {
                const legX = side * 4;
                for (let y = -4; y < 0; y++) { v.push({x: legX, y, z: -4, c: bodyDark}); v.push({x: legX, y, z: -3, c: bodyMid}); }
                for (let y = -7; y < -4; y++) v.push({x: legX, y, z: -5, c: bodyDeep});
                v.push({x: legX, y: -8, z: -6, c: bodyDeep});
                v.push({x: legX - side, y: -8, z: -7, c: clawPurple}); v.push({x: legX, y: -8, z: -7, c: clawPurple});
                for (let y = -3; y < 1; y++) { v.push({x: legX, y, z: 6, c: bodyDark}); v.push({x: legX, y, z: 7, c: bodyMid}); }
                for (let y = -6; y < -3; y++) v.push({x: legX, y, z: 7, c: bodyDeep});
                v.push({x: legX, y: -7, z: 7, c: bodyDeep});
                v.push({x: legX - side, y: -7, z: 8, c: clawPurple}); v.push({x: legX, y: -7, z: 8, c: clawPurple});
            }
            return v;
        })(),
        leftWing: (() => {
            const v = [];
            const wingMembrane = '#2C2C54';
            const membraneLight = '#474787';
            const membraneDark = '#1B1B2F';
            const wingBone = '#4A235A';
            const wingJoint = '#311432';
            for (let i = 0; i < 12; i++) { v.push({x: -5 - i, y: 4 - Math.floor(i/4), z: 0, c: wingBone}); v.push({x: -5 - i, y: 3 - Math.floor(i/4), z: 0, c: wingJoint}); }
            for (let i = 0; i < 10; i++) v.push({x: -8 - i, y: 3, z: -3 - Math.floor(i/2), c: wingBone});
            for (let i = 0; i < 12; i++) v.push({x: -10 - i, y: 2, z: 0, c: wingBone});
            for (let i = 0; i < 10; i++) v.push({x: -8 - i, y: 2, z: 3 + Math.floor(i/2), c: wingBone});
            for (let x = -8; x >= -20; x--) {
                const progress = (-x - 8) / 12;
                const zFront = -2 - Math.floor(progress * 5);
                const zBack = 2 + Math.floor(progress * 5);
                for (let z = zFront; z <= zBack; z++) {
                    const zProgress = (z - zFront) / (zBack - zFront);
                    let color = zProgress < 0.2 || zProgress > 0.8 ? membraneDark : (Math.random() < 0.3 ? membraneLight : wingMembrane);
                    v.push({x, y: 2, z, c: color});
                }
            }
            return v;
        })(),
        rightWing: (() => {
            const v = [];
            const wingMembrane = '#2C2C54';
            const membraneLight = '#474787';
            const membraneDark = '#1B1B2F';
            const wingBone = '#4A235A';
            const wingJoint = '#311432';
            for (let i = 0; i < 12; i++) { v.push({x: 5 + i, y: 4 - Math.floor(i/4), z: 0, c: wingBone}); v.push({x: 5 + i, y: 3 - Math.floor(i/4), z: 0, c: wingJoint}); }
            for (let i = 0; i < 10; i++) v.push({x: 8 + i, y: 3, z: -3 - Math.floor(i/2), c: wingBone});
            for (let i = 0; i < 12; i++) v.push({x: 10 + i, y: 2, z: 0, c: wingBone});
            for (let i = 0; i < 10; i++) v.push({x: 8 + i, y: 2, z: 3 + Math.floor(i/2), c: wingBone});
            for (let x = 8; x <= 20; x++) {
                const progress = (x - 8) / 12;
                const zFront = -2 - Math.floor(progress * 5);
                const zBack = 2 + Math.floor(progress * 5);
                for (let z = zFront; z <= zBack; z++) {
                    const zProgress = (z - zFront) / (zBack - zFront);
                    let color = zProgress < 0.2 || zProgress > 0.8 ? membraneDark : (Math.random() < 0.3 ? membraneLight : wingMembrane);
                    v.push({x, y: 2, z, c: color});
                }
            }
            return v;
        })(),
        animated: true,
        animationType: 'dragon_fly',
        hidesFeet: true,
        riderOffset: { y: 3.5, z: -0.25 },
        speedBoost: 1.3,
        scale: 0.45,
        positionY: 1.8,
        mountRotation: Math.PI,
        flapSpeed: 2.5,
        flapIntensity: 0.8,
        bodyBobSpeed: 1.5,
        bodyBobIntensity: 0.15,
        breathInterval: 5,
        breathDuration: 1.5,
        hasVoidBreath: true
    },
    
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
    },
    
    // EXCLUSIVE: Pengu Mount - A $PENGU penguin on its belly
    penguMount: {
        voxels: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c) => {
                const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                if (!voxelMap.has(key)) {
                    voxelMap.set(key, {x: Math.round(x), y: Math.round(y), z: Math.round(z), c});
                }
            };
            
            // $PENGU colors - classic penguin
            const bodyBlack = '#1a1a1a';
            const bellyWhite = '#FFFFFF';
            const beakOrange = '#FF8C00';
            const eyeWhite = '#FFFFFF';
            const eyeBlack = '#000000';
            const feetOrange = '#FF6600';
            
            // Body - penguin lying on its belly, elongated for riding
            // Head faces FORWARD (+Z direction - the way player moves)
            
            // Main body (lying flat, belly on ground)
            for(let x = -4; x <= 4; x++) {
                for(let z = -8; z <= 6; z++) {
                    const dist = Math.sqrt((x*x) / 16 + ((z+1)*(z+1)) / 64);
                    if(dist < 1) {
                        // Bottom (belly) - white
                        addVoxel(x, -3, z, bellyWhite);
                        // Top (back) - black
                        addVoxel(x, 0, z, bodyBlack);
                        addVoxel(x, -1, z, bodyBlack);
                        // Sides blend
                        if(Math.abs(x) > 2) {
                            addVoxel(x, -2, z, bodyBlack);
                        } else {
                            addVoxel(x, -2, z, bellyWhite);
                        }
                    }
                }
            }
            
            // Head (at front / +Z, slightly raised)
            for(let x = -3; x <= 3; x++) {
                for(let z = 6; z <= 10; z++) {
                    for(let y = -2; y <= 2; y++) {
                        const dist = Math.sqrt((x*x)/9 + ((z-8)*(z-8))/16 + (y*y)/9);
                        if(dist < 1.2) {
                            // Face (front) is white belly area
                            if(z > 8 && Math.abs(x) < 2 && y < 1) {
                                addVoxel(x, y, z, bellyWhite);
                            } else {
                                addVoxel(x, y, z, bodyBlack);
                            }
                        }
                    }
                }
            }
            
            // Eyes (on head, facing forward +Z) - white, positioned in front of head
            addVoxel(-2, 1, 11, eyeWhite); // Left eye
            addVoxel(2, 1, 11, eyeWhite);  // Right eye
            // Eye pupils (black dots)
            addVoxel(-2, 1, 12, eyeBlack); // Left pupil
            addVoxel(2, 1, 12, eyeBlack);  // Right pupil
            
            // Beak (pointing forward/outward from face at +Z)
            // Beak base on face
            addVoxel(0, 0, 10, beakOrange);
            addVoxel(-1, 0, 10, beakOrange);
            addVoxel(1, 0, 10, beakOrange);
            addVoxel(0, -1, 10, beakOrange);
            // Beak tip pointing forward
            addVoxel(0, 0, 11, beakOrange);
            addVoxel(0, -0.5, 11, beakOrange);
            addVoxel(0, 0, 12, beakOrange);
            
            // Tail (small bump at back -Z) - stays with body
            addVoxel(0, -1, -9, bodyBlack);
            addVoxel(0, -1, -10, bodyBlack);
            
            return Array.from(voxelMap.values());
        })(),
        // Left flipper - separate for animation
        leftFlipper: (() => {
            const v = [];
            const bodyBlack = '#1a1a1a';
            for(let z = -4; z <= 2; z++) {
                v.push({x: -5, y: -1, z, c: bodyBlack});
                v.push({x: -6, y: -2, z, c: bodyBlack});
            }
            v.push({x: -7, y: -2, z: 0, c: bodyBlack});
            v.push({x: -7, y: -2, z: -1, c: bodyBlack});
            return v;
        })(),
        // Right flipper - separate for animation
        rightFlipper: (() => {
            const v = [];
            const bodyBlack = '#1a1a1a';
            for(let z = -4; z <= 2; z++) {
                v.push({x: 5, y: -1, z, c: bodyBlack});
                v.push({x: 6, y: -2, z, c: bodyBlack});
            }
            v.push({x: 7, y: -2, z: 0, c: bodyBlack});
            v.push({x: 7, y: -2, z: -1, c: bodyBlack});
            return v;
        })(),
        // Left foot - separate for animation
        leftFoot: (() => {
            const v = [];
            const feetOrange = '#FF6600';
            for(let x = -2; x <= -1; x++) {
                v.push({x, y: -3, z: -9, c: feetOrange});
                v.push({x, y: -3, z: -10, c: feetOrange});
                v.push({x, y: -3, z: -11, c: feetOrange});
            }
            return v;
        })(),
        // Right foot - separate for animation
        rightFoot: (() => {
            const v = [];
            const feetOrange = '#FF6600';
            for(let x = 1; x <= 2; x++) {
                v.push({x, y: -3, z: -9, c: feetOrange});
                v.push({x, y: -3, z: -10, c: feetOrange});
                v.push({x, y: -3, z: -11, c: feetOrange});
            }
            return v;
        })(),
        animated: true,
        animationType: 'penguin_waddle', // Custom animation for pengu mount
        hidesFeet: true,
        seatOffset: { y: 0 },
        riderOffset: { y: -1 },
        speedBoost: 1.05, // 5% movement speed buff
        scale: 0.3125, // 25% bigger again (0.25 * 1.25)
        positionY: 0.65 // Higher to compensate for larger size
    },
    
    // EPIC: Skateboard - Ride with style and grind animations!
    skateboard: {
        voxels: (() => {
            const voxelMap = new Map();
            const addVoxel = (x, y, z, c) => {
                const key = `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
                if (!voxelMap.has(key)) {
                    voxelMap.set(key, {x: Math.round(x), y: Math.round(y), z: Math.round(z), c});
                }
            };
            
            // Skateboard colors
            const deckTop = '#1a1a1a';      // Black grip tape
            const deckBottom = '#E63946';   // Red deck bottom (cool design)
            const deckSide = '#8B4513';     // Wood sides visible
            const truckMetal = '#A0A0A0';   // Silver trucks
            const truckDark = '#606060';    // Darker truck parts
            const wheelColor = '#F0F0F0';   // White wheels
            const wheelCore = '#303030';    // Dark wheel core
            const stripeYellow = '#FFD700'; // Racing stripe
            const stripeWhite = '#FFFFFF';  // Accent stripe
            
            // === DECK (main board) ===
            // Board dimensions: length 22, width 8, thickness 2
            const boardLength = 11; // half-length
            const boardWidth = 4;   // half-width
            
            // Top surface (grip tape - black with subtle design)
            for(let x = -boardWidth; x <= boardWidth; x++) {
                for(let z = -boardLength; z <= boardLength; z++) {
                    // Taper at nose and tail
                    const taper = Math.abs(z) > 8 ? (Math.abs(z) - 8) * 0.5 : 0;
                    if(Math.abs(x) <= boardWidth - taper) {
                        // Grip tape with subtle stripe
                        const isStripe = Math.abs(x) <= 1 && Math.abs(z) < 7;
                        addVoxel(x, 0, z, isStripe ? '#2a2a2a' : deckTop);
                    }
                }
            }
            
            // Bottom surface (colored with design)
            for(let x = -boardWidth; x <= boardWidth; x++) {
                for(let z = -boardLength; z <= boardLength; z++) {
                    const taper = Math.abs(z) > 8 ? (Math.abs(z) - 8) * 0.5 : 0;
                    if(Math.abs(x) <= boardWidth - taper) {
                        // Cool racing stripes on bottom
                        let color = deckBottom;
                        if(x === 0) color = stripeYellow; // Center gold stripe
                        if(Math.abs(x) === 2 && Math.abs(z) < 6) color = stripeWhite; // Side stripes
                        addVoxel(x, -2, z, color);
                    }
                }
            }
            
            // Side edges (wood visible)
            for(let z = -boardLength; z <= boardLength; z++) {
                const taper = Math.abs(z) > 8 ? (Math.abs(z) - 8) * 0.5 : 0;
                const w = boardWidth - taper;
                if(w > 0) {
                    addVoxel(-Math.ceil(w), -1, z, deckSide);
                    addVoxel(Math.ceil(w), -1, z, deckSide);
                }
            }
            
            // Nose and tail kicks (curved up)
            for(let x = -3; x <= 3; x++) {
                // Nose kick
                addVoxel(x, 1, -boardLength, deckTop);
                addVoxel(x, 0, -boardLength - 1, deckBottom);
                // Tail kick  
                addVoxel(x, 1, boardLength, deckTop);
                addVoxel(x, 0, boardLength + 1, deckBottom);
            }
            
            return Array.from(voxelMap.values());
        })(),
        
        // Front truck assembly (animated for grinding lean)
        frontTruck: (() => {
            const v = [];
            const truckMetal = '#A0A0A0';
            const truckDark = '#606060';
            const wheelColor = '#F0F0F0';
            const wheelCore = '#303030';
            
            const truckZ = -7; // Position toward front
            
            // Truck baseplate
            for(let x = -2; x <= 2; x++) {
                v.push({x, y: -3, z: truckZ, c: truckDark});
            }
            
            // Truck hanger (T-shape)
            for(let x = -4; x <= 4; x++) {
                v.push({x, y: -4, z: truckZ, c: truckMetal});
            }
            v.push({x: 0, y: -3, z: truckZ, c: truckMetal}); // Kingpin area
            
            // Axle
            for(let x = -5; x <= 5; x++) {
                v.push({x, y: -5, z: truckZ, c: truckDark});
            }
            
            // Wheels (left side)
            for(let y = -6; y <= -4; y++) {
                for(let z = truckZ - 1; z <= truckZ + 1; z++) {
                    const isCore = y === -5 && z === truckZ;
                    v.push({x: -6, y, z, c: isCore ? wheelCore : wheelColor});
                    v.push({x: -7, y, z, c: isCore ? wheelCore : wheelColor});
                }
            }
            
            // Wheels (right side)
            for(let y = -6; y <= -4; y++) {
                for(let z = truckZ - 1; z <= truckZ + 1; z++) {
                    const isCore = y === -5 && z === truckZ;
                    v.push({x: 6, y, z, c: isCore ? wheelCore : wheelColor});
                    v.push({x: 7, y, z, c: isCore ? wheelCore : wheelColor});
                }
            }
            
            return v;
        })(),
        
        // Back truck assembly (animated for grinding lean)
        backTruck: (() => {
            const v = [];
            const truckMetal = '#A0A0A0';
            const truckDark = '#606060';
            const wheelColor = '#F0F0F0';
            const wheelCore = '#303030';
            
            const truckZ = 7; // Position toward back
            
            // Truck baseplate
            for(let x = -2; x <= 2; x++) {
                v.push({x, y: -3, z: truckZ, c: truckDark});
            }
            
            // Truck hanger (T-shape)
            for(let x = -4; x <= 4; x++) {
                v.push({x, y: -4, z: truckZ, c: truckMetal});
            }
            v.push({x: 0, y: -3, z: truckZ, c: truckMetal}); // Kingpin area
            
            // Axle
            for(let x = -5; x <= 5; x++) {
                v.push({x, y: -5, z: truckZ, c: truckDark});
            }
            
            // Wheels (left side)
            for(let y = -6; y <= -4; y++) {
                for(let z = truckZ - 1; z <= truckZ + 1; z++) {
                    const isCore = y === -5 && z === truckZ;
                    v.push({x: -6, y, z, c: isCore ? wheelCore : wheelColor});
                    v.push({x: -7, y, z, c: isCore ? wheelCore : wheelColor});
                }
            }
            
            // Wheels (right side)
            for(let y = -6; y <= -4; y++) {
                for(let z = truckZ - 1; z <= truckZ + 1; z++) {
                    const isCore = y === -5 && z === truckZ;
                    v.push({x: 6, y, z, c: isCore ? wheelCore : wheelColor});
                    v.push({x: 7, y, z, c: isCore ? wheelCore : wheelColor});
                }
            }
            
            return v;
        })(),
        
        animated: true,
        animationType: 'skateboard_grind', // Custom grinding animation
        hidesFeet: false,  // Feet visible on the board
        riderOffset: { y: 2.4 },  // Player height on board - scaled up 50%
        speedBoost: 1.25, // 15% speed boost - skateboards are fast!
        scale: 0.33,  // 50% larger (was 0.22)
        positionY: 1.2,  // Lift board higher to compensate for size
        // Rider stands sideways on skateboard
        riderRotation: Math.PI / 2, // 90 degrees - sideways stance
        
        // Grinding spark colors for effects
        sparkColors: ['#FFD700', '#FFA500', '#FF6600', '#FFFFFF']
    }
};

export default MOUNTS;
