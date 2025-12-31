/**
 * AIUpdateLoop - Handles all AI penguin behavior updates
 * Extracted from VoxelWorld.jsx for maintainability
 * 
 * This module manages:
 * - AI room transitions (town ↔ dojo ↔ pizza ↔ nightclub)
 * - AI conversations with scripts
 * - AI movement and pathfinding
 * - AI emotes and animations
 * - AI puffle companions
 * - AI cosmetic animations (wizard trails, etc.)
 */

import { AI_CONVERSATIONS } from '../config/roomConfig';

/**
 * Update all AI agents in the game loop
 * @param {Object} params - All required parameters
 * @param {Array} params.aiAgents - Array of AI agent objects
 * @param {Array} params.aiPets - Array of AI puffle entries { id, puffle }
 * @param {string} params.currentRoom - Player's current room
 * @param {Object} params.roomData - Current room data (for dance floor, etc.)
 * @param {number} params.frameCount - Current frame number
 * @param {number} params.time - Current time
 * @param {number} params.delta - Time since last frame
 * @param {Object} params.centerCoords - { centerX, centerZ }
 * @param {Object} params.dojoCoords - { dojoBx, dojoBz, dojoHd }
 * @param {Object} params.constants - { CITY_SIZE, BUILDING_SCALE, BUILDINGS }
 * @param {Object} params.THREE - THREE.js library
 * @param {Function} params.createChatSprite - Function to create chat bubbles
 * @param {Function} params.animateMesh - Function to animate penguin mesh
 * @param {Function} params.cacheAnimatedParts - Function to cache animated cosmetic parts
 * @param {Function} params.animateCosmeticsFromCache - Function to animate cosmetics
 * @param {Object} params.wizardTrailRef - Ref for wizard hat particle trails
 */
export function updateAIAgents(params) {
    const {
        aiAgents,
        aiPets,
        currentRoom,
        roomData,
        frameCount,
        time,
        delta,
        centerCoords,
        dojoCoords,
        constants,
        THREE,
        createChatSprite,
        animateMesh,
        cacheAnimatedParts,
        animateCosmeticsFromCache,
        wizardTrailRef
    } = params;

    const now = Date.now();
    const { centerX, centerZ } = centerCoords;
    const { dojoBx, dojoBz, dojoHd } = dojoCoords;
    const { CITY_SIZE, BUILDING_SCALE, BUILDINGS } = constants;

    // Build lookup maps for O(1) access
    const puffleMap = new Map();
    aiPets.forEach(entry => puffleMap.set(entry.id, entry));
    
    const aiMap = new Map();
    aiAgents.forEach(ai => aiMap.set(ai.id, ai));

    // OPTIMIZATION: Only run full AI logic every 2nd frame (60fps -> 30fps AI updates)
    const runFullAILogic = frameCount % 2 === 0;

    // Pre-calculate common positions
    const dojoDoorZ = dojoBz + dojoHd;
    const pizzaBx = centerX + 25;
    const pizzaBz = centerZ + 5;
    const pizzaDoorZ = pizzaBz + 5 + 1;
    const nightclubDoorX = centerX;
    const nightclubDoorZ = centerZ - 60;

    aiAgents.forEach(ai => {
        // Only show AI that are in the same room as the player (every frame for smoothness)
        const sameRoom = ai.currentRoom === currentRoom;
        if (ai.mesh) ai.mesh.visible = sameRoom;

        // Also show/hide AI's puffle - O(1) lookup
        const aiPetEntry = puffleMap.get(ai.id);
        if (aiPetEntry && aiPetEntry.puffle && aiPetEntry.puffle.mesh) {
            aiPetEntry.puffle.mesh.visible = sameRoom;
        }

        let aiMoving = false;

        // Skip expensive AI logic on odd frames (but still sync mesh positions)
        if (!runFullAILogic) {
            if (ai.mesh && sameRoom) {
                let aiY = 0;
                if (ai.currentRoom === 'nightclub' && roomData && roomData.danceFloor) {
                    const df = roomData.danceFloor;
                    if (ai.pos.x >= df.minX && ai.pos.x <= df.maxX && 
                        ai.pos.z >= df.minZ && ai.pos.z <= df.maxZ) {
                        aiY = df.height;
                    }
                }
                ai.mesh.position.set(ai.pos.x, aiY, ai.pos.z);
            }
            return;
        }

        // --- AI Room Transition Logic ---
        updateAIRoomTransition(ai, {
            now,
            centerX, centerZ,
            dojoBx, dojoBz, dojoHd, dojoDoorZ,
            pizzaBx, pizzaDoorZ,
            nightclubDoorX, nightclubDoorZ,
            aiPetEntry
        });

        // --- AI Behavior (conversation, walking, etc.) ---
        aiMoving = updateAIBehavior(ai, {
            now,
            aiAgents,
            aiMap,
            currentRoom,
            centerX, centerZ,
            dojoBx, dojoBz, dojoHd, dojoDoorZ,
            pizzaBx, pizzaDoorZ,
            nightclubDoorX, nightclubDoorZ,
            CITY_SIZE, BUILDING_SCALE, BUILDINGS,
            THREE,
            createChatSprite
        });

        // OPTIMIZATION: Skip expensive mesh updates for invisible AIs
        if (!sameRoom) return;

        // Calculate AI Y position - respect dance floor in nightclub
        let aiY = 0;
        if (ai.currentRoom === 'nightclub' && roomData && roomData.danceFloor) {
            const df = roomData.danceFloor;
            if (ai.pos.x >= df.minX && ai.pos.x <= df.maxX && 
                ai.pos.z >= df.minZ && ai.pos.z <= df.maxZ) {
                aiY = df.height;
            }
        }
        ai.mesh.position.set(ai.pos.x, aiY, ai.pos.z);
        if (ai.action !== 'chatting') ai.mesh.rotation.y = ai.rot;

        // Pass all params including time for proper walk animation
        animateMesh(ai.mesh, aiMoving, ai.emoteType, ai.emoteStart, false, 'penguin', false, false, time);

        // --- AI COSMETIC ANIMATIONS ---
        updateAICosmetics(ai, { time, delta, cacheAnimatedParts, animateCosmeticsFromCache });

        // --- AI Wizard Hat Trail ---
        updateAIWizardTrail(ai, {
            sameRoom,
            wizardTrailRef,
            THREE,
            delta
        });

        // --- AI Pet Follow/Animate ---
        updateAIPet(ai, aiPetEntry, {
            time,
            delta,
            roomData
        });
    });
}

/**
 * Handle AI room transitions
 * AI must respect roomTransitionCooldown to prevent rapid flipping
 */
function updateAIRoomTransition(ai, ctx) {
    const {
        now,
        centerX, centerZ,
        dojoBx, dojoBz, dojoHd, dojoDoorZ,
        pizzaBx, pizzaDoorZ,
        nightclubDoorX, nightclubDoorZ,
        aiPetEntry
    } = ctx;

    // Initialize cooldown if not set
    if (!ai.roomTransitionCooldown) {
        ai.roomTransitionCooldown = 0;
    }
    
    // Don't allow room transitions during cooldown
    if (now < ai.roomTransitionCooldown) {
        return;
    }

    if (ai.currentRoom === 'town') {
        // Check if AI is at the dojo door (tighter detection)
        const doorWidth = 3;
        const atDojoDoor = Math.abs(ai.pos.x - dojoBx) < doorWidth && 
                           Math.abs(ai.pos.z - dojoDoorZ) < 3;
        
        // Check if AI is at the pizza door (tighter detection)
        const atPizzaDoor = Math.abs(ai.pos.x - pizzaBx) < 4 && 
                            Math.abs(ai.pos.z - pizzaDoorZ) < 3;
        
        // Check if AI is at the nightclub door (tighter detection)
        const atNightclubDoor = Math.abs(ai.pos.x - nightclubDoorX) < 4 && 
                                Math.abs(ai.pos.z - nightclubDoorZ) < 4;

        // When at dojo door, small chance to enter (only if intentionally walking there)
        if (atDojoDoor && ai.action === 'walk' && Math.random() < 0.02) {
            ai.currentRoom = 'dojo';
            ai.pos.x = (Math.random() - 0.5) * 10;
            ai.pos.z = 10 + Math.random() * 2; // Spawn further inside
            resetAIAfterTransition(ai, now, aiPetEntry);
        }
        // When at pizza door, small chance to enter
        else if (atPizzaDoor && ai.action === 'walk' && Math.random() < 0.02) {
            ai.currentRoom = 'pizza';
            ai.pos.x = (Math.random() - 0.5) * 8;
            ai.pos.z = 10 + Math.random() * 2; // Spawn further inside
            resetAIAfterTransition(ai, now, aiPetEntry);
        }
        // When at nightclub door, small chance to enter
        else if (atNightclubDoor && ai.action === 'walk' && Math.random() < 0.025) {
            ai.currentRoom = 'nightclub';
            ai.pos.x = 20 + (Math.random() - 0.5) * 6;
            ai.pos.z = 24 + Math.random() * 3; // Spawn further inside
            resetAIAfterTransition(ai, now, aiPetEntry);
        }
        // If stuck at door too long without entering, move away
        else if ((atDojoDoor || atPizzaDoor || atNightclubDoor) && ai.stuckCounter > 60) {
            ai.action = 'walk';
            ai.target = { 
                x: centerX + (Math.random() - 0.5) * 30, 
                z: centerZ + (Math.random() - 0.5) * 30 
            };
            ai.actionTimer = now + 5000;
            ai.stuckCounter = 0;
        }
    } else if (ai.currentRoom === 'dojo') {
        // AI in dojo can exit - but only near the actual exit
        const atExit = ai.pos.z > 14 && Math.abs(ai.pos.x) < 5;
        
        if (atExit && ai.action === 'walk' && Math.random() < 0.015) {
            ai.currentRoom = 'town';
            ai.pos.x = dojoBx + (Math.random() - 0.5) * 6;
            ai.pos.z = dojoDoorZ + 4 + Math.random() * 3;
            resetAIAfterTransition(ai, now, aiPetEntry);
        }
    } else if (ai.currentRoom === 'pizza') {
        // AI in pizza can exit - but only near the actual exit
        const atExit = ai.pos.z > 14 && Math.abs(ai.pos.x) < 5;
        
        if (atExit && ai.action === 'walk' && Math.random() < 0.012) {
            ai.currentRoom = 'town';
            ai.pos.x = pizzaBx + (Math.random() - 0.5) * 6;
            ai.pos.z = pizzaDoorZ + 4 + Math.random() * 3;
            resetAIAfterTransition(ai, now, aiPetEntry);
        }
    } else if (ai.currentRoom === 'nightclub') {
        // AI in nightclub can exit - but only near the actual exit
        const atExit = ai.pos.z > 29 && ai.pos.x < 6;
        
        if (atExit && ai.action === 'walk' && Math.random() < 0.008) {
            ai.currentRoom = 'town';
            ai.pos.x = nightclubDoorX + (Math.random() - 0.5) * 6;
            ai.pos.z = nightclubDoorZ + 6 + Math.random() * 3;
            resetAIAfterTransition(ai, now, aiPetEntry);
            ai.emoteType = null;
        }
    }
}

/**
 * Reset AI state after room transition
 */
function resetAIAfterTransition(ai, now, aiPetEntry) {
    ai.action = 'idle';
    ai.actionTimer = now + 2000 + Math.random() * 3000;
    ai.target = null;
    ai.stuckCounter = 0;
    // Prevent rapid room transitions - must stay in room for at least 15-30 seconds
    ai.roomTransitionCooldown = now + 15000 + Math.random() * 15000;
    ai.lastRoomChange = now;
    if (aiPetEntry && aiPetEntry.puffle) {
        aiPetEntry.puffle.position.x = ai.pos.x + 1.5;
        aiPetEntry.puffle.position.z = ai.pos.z + 1.5;
    }
}

/**
 * Handle AI behavior (conversations, walking, emotes)
 */
function updateAIBehavior(ai, ctx) {
    const {
        now,
        aiAgents,
        aiMap,
        currentRoom,
        centerX, centerZ,
        dojoBx, dojoBz, dojoHd, dojoDoorZ,
        pizzaBx, pizzaDoorZ,
        nightclubDoorX, nightclubDoorZ,
        CITY_SIZE, BUILDING_SCALE, BUILDINGS,
        THREE,
        createChatSprite
    } = ctx;

    let aiMoving = false;

    if (ai.action === 'chatting') {
        updateAIChatting(ai, { now, aiMap, THREE, createChatSprite });
    }
    else if (now > ai.actionTimer) {
        // Clear sitting emote when timer expires
        if (ai.action === 'sitting') {
            ai.emoteType = null;
        }
        
        // If we have a scheduled walk target from being stuck, use it
        if (ai.nextWalkTarget) {
            ai.action = 'walk';
            ai.target = ai.nextWalkTarget;
            ai.nextWalkTarget = null;
            ai.emoteType = null;
            ai.actionTimer = now + 5000 + Math.random() * 4000;
        }
        else {
            // Find conversation partner in same room
            let foundPartner = null;
            if (now > ai.conversationCooldown && ai.action !== 'sitting') {
                for (let other of aiAgents) {
                    if (other.id !== ai.id && 
                        (other.action === 'idle' || other.action === 'sitting') && 
                        other.currentRoom === ai.currentRoom &&
                        now > other.conversationCooldown) {
                        const dx = other.pos.x - ai.pos.x;
                        const dz = other.pos.z - ai.pos.z;
                        const dist = Math.sqrt(dx*dx + dz*dz);
                        if (dist < 6) {
                            foundPartner = other;
                            break;
                        }
                    }
                }
            }

            if (foundPartner) {
                startConversation(ai, foundPartner, now);
            }
            else {
                chooseNewAction(ai, {
                    now,
                    centerX, centerZ,
                    dojoBx, dojoBz, dojoHd, dojoDoorZ,
                    pizzaBx, pizzaDoorZ,
                    nightclubDoorX, nightclubDoorZ,
                    CITY_SIZE, BUILDING_SCALE, BUILDINGS
                });
            }
        }
    }
    else if (ai.action === 'walk') {
        aiMoving = updateAIWalking(ai, {
            now,
            centerX, centerZ,
            CITY_SIZE, BUILDING_SCALE, BUILDINGS
        });
    }

    return aiMoving;
}

/**
 * Handle AI chatting state
 */
function updateAIChatting(ai, ctx) {
    const { now, aiMap, THREE, createChatSprite } = ctx;

    if (ai.conversationPartner) {
        const partner = aiMap.get(ai.conversationPartner);
        if (partner && partner.currentRoom === ai.currentRoom) {
            ai.mesh.lookAt(partner.pos.x, 0, partner.pos.z);
        } else {
            // Partner left room, end conversation
            ai.action = 'idle';
            ai.conversationCooldown = now + 5000;
            ai.conversationPartner = null;
        }
    }

    if (ai.conversationTurn) {
        if (!ai.bubble) {
            const script = ai.conversationScript;
            const line = script[ai.conversationLineIdx];
            
            if (line) {
                const bubble = createChatSprite(THREE, line);
                ai.mesh.add(bubble);
                ai.bubble = bubble;
                ai.bubbleTimer = now + 3500;
                ai.emoteType = 'Wave';
                ai.emoteStart = now;
            } else {
                ai.action = 'idle';
                ai.conversationCooldown = now + 10000;
                ai.conversationPartner = null;
                ai.emoteType = null;
            }
        } else if (now > ai.bubbleTimer) {
            ai.mesh.remove(ai.bubble);
            ai.bubble = null;
            ai.conversationTurn = false;
            
            const partner = aiMap.get(ai.conversationPartner);
            if (partner) {
                partner.conversationTurn = true;
                partner.conversationLineIdx++;
            }
            
            if (ai.conversationLineIdx >= ai.conversationScript.length - 2) {
                endConversation(ai, partner, now);
            }
        }
    } else {
        ai.emoteType = null;
    }
}

/**
 * Start a conversation between two AIs
 */
function startConversation(ai, partner, now) {
    const scriptIdx = Math.floor(Math.random() * AI_CONVERSATIONS.length);
    const script = AI_CONVERSATIONS[scriptIdx];
    
    ai.action = 'chatting';
    ai.conversationPartner = partner.id;
    ai.conversationScript = script;
    ai.conversationLineIdx = 0;
    ai.conversationTurn = true;
    
    partner.action = 'chatting';
    partner.conversationPartner = ai.id;
    partner.conversationScript = script;
    partner.conversationLineIdx = 1;
    partner.conversationTurn = false;
    
    partner.actionTimer = now + 999999;
    ai.actionTimer = now + 999999;
}

/**
 * End a conversation between two AIs
 */
function endConversation(ai, partner, now) {
    ai.action = 'idle';
    ai.emoteType = 'Laugh';
    ai.emoteStart = now;
    ai.actionTimer = now + 2000;
    ai.conversationCooldown = now + 15000;
    ai.conversationPartner = null;
    ai.conversationScript = null;
    ai.conversationTurn = false;
    
    if (partner) {
        partner.action = 'idle';
        partner.emoteType = 'Laugh';
        partner.emoteStart = now;
        partner.actionTimer = now + 2000;
        partner.conversationCooldown = now + 15000;
        partner.conversationPartner = null;
        partner.conversationScript = null;
        partner.conversationTurn = false;
        if (partner.bubble && partner.mesh) {
            partner.mesh.remove(partner.bubble);
            partner.bubble = null;
        }
    }
}

/**
 * Choose a new action for idle AI
 */
function chooseNewAction(ai, ctx) {
    const {
        now,
        centerX, centerZ,
        dojoBx, dojoBz, dojoHd, dojoDoorZ,
        pizzaBx, pizzaDoorZ,
        nightclubDoorX, nightclubDoorZ,
        CITY_SIZE, BUILDING_SCALE, BUILDINGS
    } = ctx;

    const r = Math.random();
    
    if (r < 0.10) {
        // Random emote
        ai.action = 'idle';
        const nonSitEmotes = ['Wave', 'Dance', 'Laugh'];
        ai.emoteType = nonSitEmotes[Math.floor(Math.random() * nonSitEmotes.length)];
        ai.emoteStart = now;
        ai.actionTimer = now + 3000 + Math.random() * 2000;
    }
    else if (r < 0.20) {
        // Sit down for a while
        ai.action = 'sitting';
        ai.emoteType = 'Sit';
        ai.emoteStart = now;
        ai.actionTimer = now + 8000 + Math.random() * 12000;
    }
    else if (r < 0.75) {
        // Walk somewhere
        ai.action = 'walk';
        ai.emoteType = null;
        
        ai.target = getWalkTarget(ai, {
            centerX, centerZ,
            dojoBx, dojoBz, dojoHd, dojoDoorZ,
            pizzaBx, pizzaDoorZ,
            nightclubDoorX, nightclubDoorZ,
            CITY_SIZE, BUILDING_SCALE, BUILDINGS
        });
        
        ai.actionTimer = now + 5000 + Math.random() * 4000;
    }
    else {
        // Just idle
        ai.action = 'idle';
        ai.emoteType = null;
        ai.actionTimer = now + 2000 + Math.random() * 5000;
    }
}

/**
 * Get a walk target for AI based on current room
 */
function getWalkTarget(ai, ctx) {
    const {
        centerX, centerZ,
        dojoBx, dojoBz, dojoHd, dojoDoorZ,
        pizzaBx, pizzaDoorZ,
        nightclubDoorX, nightclubDoorZ,
        CITY_SIZE, BUILDING_SCALE, BUILDINGS
    } = ctx;

    if (ai.currentRoom === 'town') {
        return getTownWalkTarget(ai, {
            centerX, centerZ,
            dojoBx, dojoBz, dojoHd, dojoDoorZ,
            pizzaBx, pizzaDoorZ,
            nightclubDoorX, nightclubDoorZ,
            CITY_SIZE, BUILDING_SCALE, BUILDINGS
        });
    } else if (ai.currentRoom === 'dojo') {
        if (Math.random() < 0.30) {
            return { x: (Math.random() - 0.5) * 6, z: 14 + Math.random() * 2 };
        }
        return { x: (Math.random()-0.5) * 26, z: (Math.random()-0.5) * 26 };
    } else if (ai.currentRoom === 'pizza') {
        return getPizzaWalkTarget(ai);
    } else if (ai.currentRoom === 'nightclub') {
        return getNightclubWalkTarget(ai);
    }
    
    return { x: ai.pos.x, z: ai.pos.z };
}

/**
 * Get walk target in town
 */
function getTownWalkTarget(ai, ctx) {
    const {
        centerX, centerZ,
        dojoBx, dojoBz, dojoHd, dojoDoorZ,
        pizzaBx, pizzaDoorZ,
        nightclubDoorX, nightclubDoorZ,
        CITY_SIZE, BUILDING_SCALE, BUILDINGS
    } = ctx;

    const walkChoice = Math.random();
    
    if (walkChoice < 0.10) {
        const doorX = dojoBx + (Math.random() - 0.5) * 4;
        const doorZ = dojoDoorZ + 2;
        return { x: doorX, z: doorZ };
    } else if (walkChoice < 0.18) {
        const doorX = pizzaBx + (Math.random() - 0.5) * 4;
        const doorZ = pizzaDoorZ + 2;
        return { x: doorX, z: doorZ };
    } else if (walkChoice < 0.30) {
        return { 
            x: nightclubDoorX + (Math.random() - 0.5) * 6, 
            z: nightclubDoorZ + 3 + Math.random() * 3 
        };
    } else if (walkChoice < 0.40) {
        return { 
            x: centerX + (Math.random() - 0.5) * 15, 
            z: centerZ + (Math.random() - 0.5) * 15 
        };
    } else if (walkChoice < 0.45) {
        return { 
            x: centerX + 29 + (Math.random() - 0.5) * 8, 
            z: centerZ - 1 + (Math.random() - 0.5) * 8 
        };
    } else if (walkChoice < 0.55) {
        return { 
            x: centerX + (Math.random() - 0.5) * 80, 
            z: centerZ - 15 + (Math.random() - 0.5) * 10 
        };
    } else if (walkChoice < 0.65) {
        const isLeft = Math.random() > 0.5;
        return { 
            x: centerX + (isLeft ? -50 : 50) + (Math.random() - 0.5) * 20, 
            z: centerZ - 45 + (Math.random() - 0.5) * 15
        };
    } else {
        // Random walk - validate against buildings
        return getValidTownTarget(ai, { centerX, centerZ, CITY_SIZE, BUILDING_SCALE, BUILDINGS });
    }
}

/**
 * Get a valid random target in town (avoiding buildings/spaces)
 */
function getValidTownTarget(ai, ctx) {
    const { centerX, centerZ, CITY_SIZE, BUILDING_SCALE, BUILDINGS } = ctx;
    
    let tx, tz;
    let attempts = 0;
    let validTarget = false;
    const mapMargin = 15;
    
    do {
        tx = centerX + (Math.random()-0.5) * 180;
        tz = centerZ + (Math.random()-0.5) * 180;
        validTarget = true;
        
        // Stay within map bounds
        const gridX = Math.floor(tx / BUILDING_SCALE);
        const gridZ = Math.floor(tz / BUILDING_SCALE);
        if (gridX < 3 || gridX >= CITY_SIZE - 3 || gridZ < 3 || gridZ >= CITY_SIZE - 3) {
            validTarget = false;
        }
        
        // Check against all buildings
        if (validTarget) {
            for (const building of BUILDINGS) {
                const bx = centerX + building.position.x;
                const bz = centerZ + building.position.z;
                const hw = building.size.w / 2 + 4;
                const hd = building.size.d / 2 + 4;
                
                if (tx > bx - hw && tx < bx + hw && tz > bz - hd && tz < bz + hd) {
                    validTarget = false;
                    break;
                }
            }
        }
        
        // Check against space positions
        if (validTarget) {
            const spacePositions = [
                { x: -75, z: -75 }, { x: -50, z: -78 }, { x: -25, z: -75 },
                { x: 25, z: -75 }, { x: 50, z: -78 }, { x: 75, z: -75 },
                { x: -70, z: -15 }, { x: -40, z: -18 },
                { x: 40, z: -18 }, { x: 70, z: -15 }
            ];
            const spaceRadius = 8;
            
            for (const space of spacePositions) {
                const ix = centerX + space.x;
                const iz = centerZ + space.z;
                const dx = tx - ix;
                const dz = tz - iz;
                if (Math.sqrt(dx*dx + dz*dz) < spaceRadius) {
                    validTarget = false;
                    break;
                }
            }
        }
        attempts++;
    } while (!validTarget && attempts < 8);
    
    return { x: tx, z: tz };
}

/**
 * Get walk target in pizza parlor
 */
function getPizzaWalkTarget(ai) {
    if (Math.random() < 0.20) {
        return { x: (Math.random() - 0.5) * 6, z: 14 + Math.random() * 2 };
    } else if (Math.random() < 0.50) {
        const tableSpots = [
            { x: -8 + (Math.random()-0.5)*3, z: 2 + (Math.random()-0.5)*2 },
            { x: 8 + (Math.random()-0.5)*3, z: 2 + (Math.random()-0.5)*2 },
            { x: -8 + (Math.random()-0.5)*3, z: 9 + (Math.random()-0.5)*2 },
            { x: 8 + (Math.random()-0.5)*3, z: 9 + (Math.random()-0.5)*2 },
        ];
        return tableSpots[Math.floor(Math.random() * tableSpots.length)];
    }
    return { x: (Math.random()-0.5) * 26, z: -8 + Math.random() * 20 };
}

/**
 * Get walk target in nightclub
 * Nightclub room is 40x35 (W=40, D=35), CX=20
 * Dance floor: centered at (20, 22.5), size 14x10
 */
function getNightclubWalkTarget(ai) {
    // Actual dance floor bounds from Nightclub.js: CX=20, width=14, depth=10, centerZ=22.5
    const DANCE_FLOOR = { minX: 12.5, maxX: 27.5, minZ: 17, maxZ: 28 };
    
    const onDanceFloor = ai.pos.x > DANCE_FLOOR.minX && ai.pos.x < DANCE_FLOOR.maxX &&
                         ai.pos.z > DANCE_FLOOR.minZ && ai.pos.z < DANCE_FLOOR.maxZ;
    
    if (onDanceFloor && Math.random() < 0.70) {
        // HIGH CHANCE to dance when on the dance floor!
        ai.action = 'idle';
        ai.emoteType = Math.random() < 0.7 ? 'Dance' : 'Breakdance';
        ai.emoteStart = Date.now();
        ai.actionTimer = Date.now() + 4000 + Math.random() * 8000;
        return null;
    } else if (Math.random() < 0.08) {
        // Walk toward exit door area (left wall, z ~30)
        return { x: 2 + Math.random() * 4, z: 28 + Math.random() * 4 };
    } else if (Math.random() < 0.60) {
        // Walk to dance floor
        return { 
            x: DANCE_FLOOR.minX + Math.random() * (DANCE_FLOOR.maxX - DANCE_FLOOR.minX), 
            z: DANCE_FLOOR.minZ + Math.random() * (DANCE_FLOOR.maxZ - DANCE_FLOOR.minZ) 
        };
    } else if (Math.random() < 0.30) {
        // Walk to DJ booth area (front of room)
        return { x: 20 + (Math.random() - 0.5) * 8, z: 6 + Math.random() * 4 };
    } else {
        // Walk to side walls (left side ~4, right side ~36)
        const side = Math.random() > 0.5 ? 4 : 36;
        return { x: side + (Math.random() - 0.5) * 4, z: 12 + Math.random() * 16 };
    }
}

/**
 * Update AI walking state
 */
function updateAIWalking(ai, ctx) {
    const { now, centerX, centerZ, CITY_SIZE, BUILDING_SCALE, BUILDINGS } = ctx;
    
    if (!ai.target) {
        ai.action = 'idle';
        return false;
    }
    
    const dx = ai.target.x - ai.pos.x;
    const dz = ai.target.z - ai.pos.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    
    if (dist < 1) {
        ai.target = null;
        ai.action = 'idle';
        ai.actionTimer = now + 1000 + Math.random() * 2000;
        return false;
    }
    
    const speed = 0.08;
    const moveX = (dx / dist) * speed;
    const moveZ = (dz / dist) * speed;
    
    // Collision detection for town
    if (ai.currentRoom === 'town') {
        const nextX = ai.pos.x + moveX;
        const nextZ = ai.pos.z + moveZ;
        let blocked = false;
        
        // Check buildings
        for (const building of BUILDINGS) {
            const bx = centerX + building.position.x;
            const bz = centerZ + building.position.z;
            const hw = building.size.w / 2 + 1.5;
            const hd = building.size.d / 2 + 1.5;
            
            if (nextX > bx - hw && nextX < bx + hw && nextZ > bz - hd && nextZ < bz + hd) {
                blocked = true;
                break;
            }
        }
        
        if (blocked) {
            handleAIBlocked(ai, { now, centerX, centerZ, CITY_SIZE, BUILDING_SCALE });
            return false;
        }
    }
    
    ai.pos.x += moveX;
    ai.pos.z += moveZ;
    ai.rot = Math.atan2(moveX, moveZ);
    ai.stuckCounter = Math.max(0, (ai.stuckCounter || 0) - 1);
    
    return true;
}

/**
 * Handle AI being blocked by obstacle
 */
function handleAIBlocked(ai, ctx) {
    const { now, centerX, centerZ, CITY_SIZE, BUILDING_SCALE } = ctx;
    
    ai.stuckCounter = (ai.stuckCounter || 0) + 1;
    
    if (ai.stuckCounter > 20) {
        // Give up and become idle, schedule new walk
        ai.action = 'idle';
        ai.target = null;
        ai.actionTimer = now + 500;
        ai.nextWalkTarget = {
            x: centerX + (Math.random() - 0.5) * 40,
            z: centerZ + (Math.random() - 0.5) * 40
        };
        ai.stuckCounter = 0;
    } else if (ai.stuckCounter > 10) {
        // Try backing up and turning
        ai.rot += (Math.random() > 0.5 ? 1 : -1) * Math.PI / 2;
        const backDist = 2 + Math.random() * 3;
        ai.target = {
            x: ai.pos.x + Math.sin(ai.rot) * backDist,
            z: ai.pos.z + Math.cos(ai.rot) * backDist
        };
    } else {
        // Try sliding along the wall
        const slideAngle = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 4 + Math.random() * Math.PI / 4);
        ai.rot += slideAngle;
        
        const newDist = 4 + Math.random() * 6;
        const mapMargin2 = 15;
        const maxCoord2 = CITY_SIZE * BUILDING_SCALE - mapMargin2;
        
        if (ai.currentRoom === 'town') {
            ai.target = {
                x: Math.max(mapMargin2, Math.min(maxCoord2, ai.pos.x + Math.sin(ai.rot) * newDist)),
                z: Math.max(mapMargin2, Math.min(maxCoord2, ai.pos.z + Math.cos(ai.rot) * newDist))
            };
        } else if (ai.currentRoom === 'pizza') {
            ai.target = {
                x: Math.max(-14, Math.min(14, ai.pos.x + Math.sin(ai.rot) * newDist)),
                z: Math.max(-10, Math.min(14, ai.pos.z + Math.cos(ai.rot) * newDist))
            };
        } else if (ai.currentRoom === 'nightclub') {
            ai.target = {
                x: Math.max(4, Math.min(36, ai.pos.x + Math.sin(ai.rot) * newDist)),
                z: Math.max(8, Math.min(32, ai.pos.z + Math.cos(ai.rot) * newDist))
            };
        } else {
            ai.target = {
                x: Math.max(-15, Math.min(15, ai.pos.x + Math.sin(ai.rot) * newDist)),
                z: Math.max(-15, Math.min(15, ai.pos.z + Math.cos(ai.rot) * newDist))
            };
        }
    }
}

/**
 * Update AI cosmetic animations
 */
function updateAICosmetics(ai, ctx) {
    const { time, delta, cacheAnimatedParts, animateCosmeticsFromCache } = ctx;
    
    const aiAppearance = ai.aiData;
    if (!aiAppearance) return;
    
    // Check and cache animated cosmetics flag once
    if (ai._hasAnimatedCosmetics === undefined) {
        ai._hasAnimatedCosmetics = aiAppearance.hat === 'propeller' || 
                                   aiAppearance.hat === 'flamingCrown' ||
                                   aiAppearance.hat === 'wizardHat' ||
                                   aiAppearance.mouth === 'cigarette' || 
                                   aiAppearance.mouth === 'pipe' ||
                                   aiAppearance.mouth === 'cigar' ||
                                   aiAppearance.eyes === 'laser' ||
                                   aiAppearance.eyes === 'fire' ||
                                   aiAppearance.bodyItem === 'angelWings' ||
                                   aiAppearance.bodyItem === 'demonWings' ||
                                   aiAppearance.bodyItem === 'fireAura' ||
                                   aiAppearance.bodyItem === 'lightningAura';
    }
    
    if (ai._hasAnimatedCosmetics) {
        // Build cache lazily on first animation frame
        if (!ai.mesh.userData._animatedPartsCache) {
            ai.mesh.userData._animatedPartsCache = cacheAnimatedParts(ai.mesh);
        }
        animateCosmeticsFromCache(ai.mesh.userData._animatedPartsCache, time, delta);
    }
}

/**
 * Update AI wizard hat particle trail
 */
function updateAIWizardTrail(ai, ctx) {
    const { sameRoom, wizardTrailRef, THREE, delta } = ctx;
    
    const aiAppearance = ai.aiData;
    if (!aiAppearance || aiAppearance.hat !== 'wizardHat' || !wizardTrailRef?.current || !sameRoom) {
        return;
    }
    
    const poolKey = `ai_${ai.id}`;
    let trailGroup = wizardTrailRef.current.pools.get(poolKey);
    
    // Create pool if it doesn't exist
    if (!trailGroup) {
        trailGroup = new THREE.Group();
        trailGroup.userData.particles = [];
        const particleCount = 15;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 6, 6),
                new THREE.MeshBasicMaterial({ 
                    color: Math.random() > 0.5 ? 0x8844ff : 0x44ffaa,
                    transparent: true,
                    opacity: 0.8
                })
            );
            particle.visible = false;
            particle.userData.active = false;
            particle.userData.life = 0;
            trailGroup.add(particle);
            trailGroup.userData.particles.push(particle);
        }
        
        wizardTrailRef.current.pools.set(poolKey, trailGroup);
        wizardTrailRef.current.scene.add(trailGroup);
    }
    
    // Spawn new particles
    if (Math.random() < 0.3) {
        const availableParticle = trailGroup.userData.particles.find(p => !p.userData.active);
        if (availableParticle) {
            availableParticle.position.set(
                ai.mesh.position.x + (Math.random() - 0.5) * 0.5,
                ai.mesh.position.y + 2.5 + Math.random() * 0.3,
                ai.mesh.position.z + (Math.random() - 0.5) * 0.5
            );
            availableParticle.userData.active = true;
            availableParticle.userData.life = 0;
            availableParticle.visible = true;
            availableParticle.material.opacity = 0.8;
            availableParticle.scale.setScalar(1);
        }
    }
    
    // Update particles
    trailGroup.userData.particles.forEach(particle => {
        if (particle.userData.active) {
            particle.userData.life += delta;
            particle.position.y += delta * 0.5;
            particle.position.x += (Math.random() - 0.5) * delta * 0.3;
            particle.position.z += (Math.random() - 0.5) * delta * 0.3;
            
            if (particle.userData.life < 1.5) {
                const opacity = 0.8 * (1 - particle.userData.life / 1.5);
                particle.material.opacity = Math.max(0, opacity);
                particle.scale.setScalar(particle.scale.x * (1 + delta * 0.05));
            } else {
                particle.userData.active = false;
                particle.visible = false;
            }
        }
    });
}

/**
 * Update AI puffle companion
 */
function updateAIPet(ai, aiPetEntry, ctx) {
    const { time, delta, roomData } = ctx;
    
    if (!aiPetEntry || !aiPetEntry.puffle || !aiPetEntry.puffle.mesh) return;
    
    const aiPet = aiPetEntry.puffle;
    
    if (typeof aiPet.tick === 'function') {
        aiPet.tick();
    }
    
    if (typeof aiPet.followOwner === 'function') {
        aiPet.followOwner(ai.pos, delta);
    }
    
    if (typeof aiPet.animate === 'function') {
        aiPet.animate(time);
    }
    
    // Sync puffle mesh position
    if (aiPet.mesh && aiPet.position) {
        aiPet.mesh.position.x = aiPet.position.x;
        aiPet.mesh.position.z = aiPet.position.z;
        
        // Respect dance floor height in nightclub
        let puffleY = 0.5;
        if (ai.currentRoom === 'nightclub' && roomData && roomData.danceFloor) {
            const df = roomData.danceFloor;
            if (aiPet.position.x >= df.minX && aiPet.position.x <= df.maxX && 
                aiPet.position.z >= df.minZ && aiPet.position.z <= df.maxZ) {
                puffleY = df.height + 0.5;
            }
        }
        aiPet.mesh.position.y = puffleY;
    }
}

export default { updateAIAgents };

