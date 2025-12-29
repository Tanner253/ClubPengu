/**
 * AnimationSystem - Penguin mesh animation logic
 * Handles walking, emotes, sitting, mounted animations
 */

/**
 * Cache animated part references on a mesh to avoid expensive lookups every frame
 * @param {THREE.Object3D} meshWrapper - The penguin mesh wrapper
 */
export function cacheAnimParts(meshWrapper) {
    if (!meshWrapper || !meshWrapper.children[0]) return null;
    const meshInner = meshWrapper.children[0];
    
    meshWrapper._animParts = {
        flipperL: meshInner.getObjectByName('flipper_l'),
        flipperR: meshInner.getObjectByName('flipper_r'),
        head: meshInner.getObjectByName('head'),
        hatPart: meshInner.getObjectByName('hat'),
        eyesPart: meshInner.getObjectByName('eyes'),
        mouthPart: meshInner.getObjectByName('mouth'),
        footL: meshInner.getObjectByName('foot_l'),
        footR: meshInner.getObjectByName('foot_r')
    };
    
    return meshWrapper._animParts;
}

/**
 * Animate a penguin mesh based on movement, emotes, and state
 * @param {THREE.Object3D} meshWrapper - The penguin mesh wrapper
 * @param {boolean} isMoving - Whether the character is moving
 * @param {string|null} emoteType - Current emote type
 * @param {number} emoteStartTime - When the emote started
 * @param {boolean} isSeatedOnFurniture - Whether seated on furniture
 * @param {string} characterType - 'penguin' or 'marcus'
 * @param {boolean} isMounted - Whether on a mount
 * @param {boolean} isAirborne - Whether in the air
 * @param {number} time - Current game time
 * @param {Function} onEmoteEnd - Callback when emote ends naturally
 */
export function animateMesh(
    meshWrapper, 
    isMoving, 
    emoteType, 
    emoteStartTime, 
    isSeatedOnFurniture = false, 
    characterType = 'penguin', 
    isMounted = false, 
    isAirborne = false,
    time = 0,
    onEmoteEnd = null
) {
    if (!meshWrapper || !meshWrapper.children[0]) return;
    const meshInner = meshWrapper.children[0];
    // Marcus has different body proportions, whale uses penguin body
    const isMarcus = characterType === 'marcus';
    const isWhale = characterType?.includes('Whale');
    
    // Use cached parts if available, otherwise look up and cache
    if (!meshWrapper._animParts) {
        cacheAnimParts(meshWrapper);
    }
    const { flipperL, flipperR, head, hatPart, eyesPart, mouthPart, footL, footR } = meshWrapper._animParts || {};
    
    // Reset all parts to default pose
    if(flipperL) { flipperL.rotation.set(0,0,0); }
    if(flipperR) { flipperR.rotation.set(0,0,0); }
    meshInner.position.y = 0.8;
    meshInner.rotation.z = 0;
    meshInner.rotation.y = 0;
    meshInner.rotation.x = 0;
    if(footL) { footL.rotation.x = 0; footL.position.z = 0; }
    if(footR) { footR.rotation.x = 0; footR.position.z = 0; }
    if(head) { head.rotation.x = 0; head.position.y = 0; head.position.z = 0; }
    if(hatPart) { hatPart.rotation.x = 0; hatPart.position.y = 0; hatPart.position.z = 0; }
    if(eyesPart) { eyesPart.position.y = 0; eyesPart.position.z = 0; eyesPart.rotation.x = 0; }
    if(mouthPart) { mouthPart.position.y = 0; mouthPart.position.z = 0; mouthPart.rotation.x = 0; }
    
    // Jumping animation - feet point down when airborne
    if (isAirborne && !isSeatedOnFurniture && !isMounted) {
        if(footL) footL.rotation.x = 0.4;
        if(footR) footR.rotation.x = 0.4;
    }

    // Mounted animation (sitting on mount)
    if (isMounted) {
        // Raise player up to sit on mount - different heights for different mounts
        // Mount name is stored in userData.mount on the wrapper (meshInner's parent)
        const mountName = meshInner.parent?.userData?.mount || 'penguMount';
        meshInner.position.y = mountName === 'minecraftBoat' ? 0.8 : 1.2;
        if(footL) {
            footL.rotation.x = -Math.PI / 2.5;
            footL.position.z = 2.5;
        }
        if(footR) {
            footR.rotation.x = -Math.PI / 2.5;
            footR.position.z = 2.5;
        }
        if(flipperL) flipperL.rotation.z = 0.3;
        if(flipperR) flipperR.rotation.z = -0.3;
        return;
    }

    // Emote animations
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
            meshInner.position.y = 0.8 + Math.abs(Math.sin(eTime * 5)) * 1;
            if(flipperL) flipperL.rotation.z = Math.sin(eTime * 10) * 1;
            if(flipperR) flipperR.rotation.z = -Math.sin(eTime * 10) * 1;
        }
        else if (emoteType === 'Sit') {
            if (isMarcus) {
                meshInner.position.y = -0.2;
                if(footL) {
                    footL.rotation.x = -Math.PI / 3;
                    footL.position.z = 1.5;
                }
                if(footR) {
                    footR.rotation.x = -Math.PI / 3;
                    footR.position.z = 1.5;
                }
            } else {
                meshInner.position.y = 0.5;
                if(footL) {
                    footL.rotation.x = -Math.PI / 2.5;
                    footL.position.z = 2.5;
                }
                if(footR) {
                    footR.rotation.x = -Math.PI / 2.5;
                    footR.position.z = 2.5;
                }
            }
            if(flipperL) flipperL.rotation.z = 0.3;
            if(flipperR) flipperR.rotation.z = -0.3;
        }
        else if (emoteType === 'Laugh') {
            const laughRot = -0.5 + Math.sin(eTime * 20) * 0.2; 
            if(head) head.rotation.x = laughRot;
            if(hatPart) hatPart.rotation.x = laughRot;
            if(eyesPart) eyesPart.rotation.x = laughRot;
            if(mouthPart) mouthPart.rotation.x = laughRot;
            meshInner.rotation.x = -0.2;
            meshInner.position.y = 0.8 + Math.abs(Math.sin(eTime * 15)) * 0.1;
        }
        else if (emoteType === 'Breakdance') {
            const spinSpeed = eTime * 6;
            const kickSpeed = eTime * 10;
            
            meshInner.rotation.x = 0;
            meshInner.rotation.z = Math.PI;
            meshInner.rotation.y = spinSpeed;
            meshInner.position.y = 1.8 + Math.sin(eTime * 3) * 0.1;
            
            if(footL) {
                footL.rotation.x = Math.sin(kickSpeed) * 1.0;
                footL.position.z = 1 + Math.sin(kickSpeed) * 0.5;
            }
            if(footR) {
                footR.rotation.x = Math.sin(kickSpeed + Math.PI) * 1.0;
                footR.position.z = 1 + Math.sin(kickSpeed + Math.PI) * 0.5;
            }
            
            if(flipperL) {
                flipperL.rotation.z = Math.PI / 2;
                flipperL.rotation.x = 0;
            }
            if(flipperR) {
                flipperR.rotation.z = -Math.PI / 2;
                flipperR.rotation.x = 0;
            }
        }
        else if (emoteType === '67') {
            const scaleSpeed = eTime * 4;
            const seesaw = Math.sin(scaleSpeed) * 0.35;
            
            if(flipperL) {
                flipperL.rotation.x = -Math.PI / 2 + seesaw;
                flipperL.rotation.y = 0;
                flipperL.rotation.z = 0.2;
            }
            if(flipperR) {
                flipperR.rotation.x = -Math.PI / 2 - seesaw;
                flipperR.rotation.y = 0;
                flipperR.rotation.z = -0.2;
            }
            
            if(head) head.rotation.x = -0.1;
        }
        else if (emoteType === 'Headbang') {
            const bangSpeed = eTime * 6;
            const headBangAmount = Math.sin(bangSpeed) * 0.25;
            const HEAD_LIFT = 1.0;
            const HEAD_FORWARD = 0.25;
            
            if(head) {
                head.rotation.x = headBangAmount;
                head.position.y = HEAD_LIFT;
                head.position.z = HEAD_FORWARD;
            }
            if(hatPart) {
                hatPart.rotation.x = headBangAmount;
                hatPart.position.y = HEAD_LIFT;
                hatPart.position.z = HEAD_FORWARD;
            }
            if(eyesPart) {
                eyesPart.rotation.x = headBangAmount;
                eyesPart.position.y = HEAD_LIFT;
                eyesPart.position.z = HEAD_FORWARD;
            }
            if(mouthPart) {
                mouthPart.rotation.x = headBangAmount;
                mouthPart.position.y = HEAD_LIFT;
                mouthPart.position.z = HEAD_FORWARD;
            }
            
            const pumpAmount = Math.sin(bangSpeed) * 0.15;
            if(flipperL) {
                flipperL.rotation.x = -0.3 + pumpAmount;
                flipperL.rotation.z = 0.3;
            }
            if(flipperR) {
                flipperR.rotation.x = -0.3 + pumpAmount;
                flipperR.rotation.z = -0.3;
            }
        }
        else if (emoteType === 'DJ') {
            const djScratchSpeed = eTime * 3;
            const djScratch = Math.sin(djScratchSpeed) * 0.15;
            const djHeadBob = Math.sin(eTime * 4) * 0.08;
            
            if(flipperL) {
                flipperL.rotation.x = 0;
                flipperL.rotation.y = 0.2;
                flipperL.rotation.z = Math.PI * 0.85;
            }
            if(flipperR) {
                flipperR.rotation.x = -Math.PI / 2 + djScratch;
                flipperR.rotation.y = 0.3;
                flipperR.rotation.z = -0.1;
            }
            
            if(head) head.rotation.x = djHeadBob;
            if(hatPart) hatPart.rotation.x = djHeadBob;
            if(eyesPart) eyesPart.rotation.x = djHeadBob;
            if(mouthPart) mouthPart.rotation.x = djHeadBob;
        }
        
        // Auto-stop non-persistent emotes
        const loopingEmotes = ['Sit', 'Breakdance', 'DJ', '67', 'Headbang'];
        if (!loopingEmotes.includes(emoteType) && eTime > 3) {
            if (onEmoteEnd) {
                onEmoteEnd();
            }
        }
    } else if (isMoving) {
        // Walking animation
        const walkCycle = time * 10;
        if(footL) footL.rotation.x = Math.sin(walkCycle) * 0.5;
        if(footR) footR.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
        if(flipperL) flipperL.rotation.x = Math.sin(walkCycle) * 0.5;
        if(flipperR) flipperR.rotation.x = -Math.sin(walkCycle) * 0.5;
        meshInner.rotation.z = Math.sin(time * 8) * 0.05; 
    } else {
        // Idle animation
        meshInner.rotation.z = Math.sin(time * 1.5) * 0.02;
    }
}

export default { animateMesh, cacheAnimParts };

