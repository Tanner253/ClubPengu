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
        footR: meshInner.getObjectByName('foot_r'),
        // Doginal-specific animated parts
        tail: meshInner.getObjectByName('tail'),
        earL: meshInner.getObjectByName('ear_l'),
        earR: meshInner.getObjectByName('ear_r')
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
    // Character type flags for different animations
    const isMarcus = characterType === 'marcus';
    const isWhale = characterType?.includes('Whale');
    const isDoginal = characterType === 'doginal';
    const isShrimp = characterType === 'shrimp';
    const isDuck = characterType === 'duck';
    const isTungTung = characterType === 'tungTung';
    
    // Use cached parts if available, otherwise look up and cache
    if (!meshWrapper._animParts) {
        cacheAnimParts(meshWrapper);
    }
    const { flipperL, flipperR, head, hatPart, eyesPart, mouthPart, footL, footR, tail, earL, earR } = meshWrapper._animParts || {};
    
    // Reset all parts to default pose (ensures clean state after any emote)
    // NOTE: Only reset ROTATIONS - positions are set by the model builder and should not be touched!
    if(flipperL) { flipperL.rotation.set(0,0,0); }
    if(flipperR) { flipperR.rotation.set(0,0,0); }
    meshInner.position.y = 0.8;
    meshInner.rotation.set(0,0,0);
    // Feet: reset rotation + only position.z (used by sit emote)
    if(footL) { footL.rotation.set(0,0,0); footL.position.z = 0; }
    if(footR) { footR.rotation.set(0,0,0); footR.position.z = 0; }
    // Head + face parts: reset rotations + only position offsets used by emotes (y, z for headbang)
    if(head) { head.rotation.set(0,0,0); head.position.y = 0; head.position.z = 0; }
    if(hatPart) { hatPart.rotation.set(0,0,0); hatPart.position.y = 0; hatPart.position.z = 0; }
    if(eyesPart) { eyesPart.rotation.set(0,0,0); eyesPart.position.y = 0; eyesPart.position.z = 0; }
    if(mouthPart) { mouthPart.rotation.set(0,0,0); mouthPart.position.y = 0; mouthPart.position.z = 0; }
    // Doginal animated parts reset (only rotations)
    if(tail) { tail.rotation.set(0,0,0); }
    if(earL) { earL.rotation.set(0,0,0); }
    if(earR) { earR.rotation.set(0,0,0); }
    
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
        const mountData = meshInner.parent?.userData?.mountData;
        
        // === SKATEBOARD STANCE === 
        // Rider stands SIDEWAYS on the board (90° rotated) - like a real skater
        if (mountName === 'skateboard') {
            const riderY = mountData?.riderOffset?.y ?? 1.8; // Configured in mounts.js
            meshInner.position.y = riderY;
            
            // ROTATE 90 DEGREES - character faces sideways on board
            meshInner.rotation.y = Math.PI / 2;
            
            // Get skateboard lean and trick state from userData (set by VoxelWorld animation)
            const skateboardLean = meshInner.parent?.userData?.skateboardLean || 0;
            const isSkating = meshInner.parent?.userData?.skateboardSpeed > 0;
            const isDoingTrick = meshInner.parent?.userData?.isDoingTrick || false;
            const trickArmIntensity = meshInner.parent?.userData?.trickArmIntensity || 0;
            
            // Feet planted on board (tuck during tricks)
            if(footL) { 
                footL.rotation.x = isDoingTrick ? 0.5 * trickArmIntensity : 0;
                footL.rotation.y = 0; 
                footL.position.z = 0; 
            }
            if(footR) { 
                footR.rotation.x = isDoingTrick ? 0.5 * trickArmIntensity : 0;
                footR.rotation.y = 0; 
                footR.position.z = 0; 
            }
            
            // Arms out for balance (adjusted for sideways stance)
            // During tricks, arms go UP for style! 🤙
            if(flipperL) {
                if (isDoingTrick) {
                    flipperL.rotation.z = 0.5 + trickArmIntensity * 1.0; // Arms up!
                    flipperL.rotation.x = -trickArmIntensity * 0.4;
                } else {
                    flipperL.rotation.z = 0.5 + skateboardLean * 1.5;
                    flipperL.rotation.x = isSkating ? -0.2 : 0;
                }
            }
            if(flipperR) {
                if (isDoingTrick) {
                    flipperR.rotation.z = -0.5 - trickArmIntensity * 1.0; // Arms up!
                    flipperR.rotation.x = -trickArmIntensity * 0.4;
                } else {
                    flipperR.rotation.z = -0.5 + skateboardLean * 1.5;
                    flipperR.rotation.x = isSkating ? -0.2 : 0;
                }
            }
            
            // Body lean (now on X axis since we're rotated 90°)
            // During tricks, body stays more upright
            meshInner.rotation.x = isDoingTrick ? 0 : skateboardLean * 0.3;
            return;
        }
        
        // Default mount pose (sitting)
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
            // Friendly head tilt while waving
            const waveTilt = Math.sin(eTime * 3) * 0.1;
            if(head) head.rotation.z = waveTilt;
            if(hatPart) hatPart.rotation.z = waveTilt;
            if(eyesPart) eyesPart.rotation.z = waveTilt;
            if(mouthPart) mouthPart.rotation.z = waveTilt;
        } 
        else if (emoteType === 'Dance') {
            meshInner.rotation.y = eTime * 6; 
            meshInner.position.y = 0.8 + Math.abs(Math.sin(eTime * 5)) * 1;
            if(flipperL) flipperL.rotation.z = Math.sin(eTime * 10) * 1;
            if(flipperR) flipperR.rotation.z = -Math.sin(eTime * 10) * 1;
            // Head bob while dancing
            const danceBob = Math.sin(eTime * 10) * 0.15;
            if(head) head.rotation.x = danceBob;
            if(hatPart) hatPart.rotation.x = danceBob;
            if(eyesPart) eyesPart.rotation.x = danceBob;
            if(mouthPart) mouthPart.rotation.x = danceBob;
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
            if (isTungTung) {
                // TungTung has a tall cylindrical head - rotate the whole body instead
                meshInner.rotation.x = laughRot * 0.5;
                meshInner.position.y = 0.8 + Math.abs(Math.sin(eTime * 15)) * 0.15;
            } else {
                if(head) head.rotation.x = laughRot;
                if(hatPart) hatPart.rotation.x = laughRot;
                if(eyesPart) eyesPart.rotation.x = laughRot;
                if(mouthPart) mouthPart.rotation.x = laughRot;
                meshInner.rotation.x = -0.2;
                meshInner.position.y = 0.8 + Math.abs(Math.sin(eTime * 15)) * 0.1;
            }
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
            
            if (isTungTung) {
                // TungTung has a tall cylindrical body - rock the whole body forward/back
                meshInner.rotation.x = headBangAmount * 0.6;
                meshInner.position.y = 0.8 + Math.abs(Math.sin(bangSpeed)) * 0.1;
            } else {
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
        // ==================== NEW EMOTES ====================
        else if (emoteType === 'Dab') {
            // Classic dab pose - one arm up diagonal, head tucked into other arm
            // Quick snap into position, then hold
            const snapTime = Math.min(eTime * 8, 1); // Snap into pose over 0.125s
            
            // Right flipper goes UP and diagonal (the "dab arm")
            if(flipperR) {
                flipperR.rotation.z = -Math.PI * 0.7 * snapTime;  // Arm up diagonal
                flipperR.rotation.x = -0.3 * snapTime;             // Slight forward
            }
            // Left flipper tucks across body (head goes here)
            if(flipperL) {
                flipperL.rotation.z = Math.PI * 0.4 * snapTime;   // Arm across body
                flipperL.rotation.x = -0.5 * snapTime;             // Forward to "catch" head
            }
            // Head tucks into left arm
            if(head) {
                head.rotation.x = 0.4 * snapTime;   // Look down
                head.rotation.z = 0.3 * snapTime;   // Tilt toward arm
            }
            if(hatPart) {
                hatPart.rotation.x = 0.4 * snapTime;
                hatPart.rotation.z = 0.3 * snapTime;
            }
            if(eyesPart) {
                eyesPart.rotation.x = 0.4 * snapTime;
                eyesPart.rotation.z = 0.3 * snapTime;
            }
            if(mouthPart) {
                mouthPart.rotation.x = 0.4 * snapTime;
                mouthPart.rotation.z = 0.3 * snapTime;
            }
            // Slight body lean into the dab
            meshInner.rotation.z = 0.15 * snapTime;
        }
        else if (emoteType === 'Flex') {
            // Bodybuilder flex pose - arms up showing muscles
            const flexPulse = Math.sin(eTime * 4) * 0.1; // Subtle pulse
            const flexPose = Math.min(eTime * 5, 1); // Quick pose setup
            
            // Both flippers up in classic flex pose
            if(flipperL) {
                flipperL.rotation.z = (Math.PI * 0.6 + flexPulse) * flexPose;
                flipperL.rotation.x = (-0.8 - flexPulse * 0.5) * flexPose;
            }
            if(flipperR) {
                flipperR.rotation.z = (-Math.PI * 0.6 - flexPulse) * flexPose;
                flipperR.rotation.x = (-0.8 - flexPulse * 0.5) * flexPose;
            }
            // Puff out chest - lean back slightly
            meshInner.rotation.x = -0.15 * flexPose;
            // Slight bounce to show off
            meshInner.position.y = 0.8 + Math.abs(Math.sin(eTime * 6)) * 0.05;
            // Proud head tilt - looking to the side showing off
            const proudTilt = -0.15 * flexPose;
            if(head) { head.rotation.x = proudTilt; head.rotation.z = Math.sin(eTime * 2) * 0.1; }
            if(hatPart) { hatPart.rotation.x = proudTilt; hatPart.rotation.z = Math.sin(eTime * 2) * 0.1; }
            if(eyesPart) { eyesPart.rotation.x = proudTilt; eyesPart.rotation.z = Math.sin(eTime * 2) * 0.1; }
            if(mouthPart) { mouthPart.rotation.x = proudTilt; mouthPart.rotation.z = Math.sin(eTime * 2) * 0.1; }
        }
        else if (emoteType === 'Sleep') {
            // Sleeping on the ground - lying down with Zzz motion
            const breathe = Math.sin(eTime * 1.5) * 0.05; // Slow breathing
            
            // Lie down on side
            meshInner.rotation.x = Math.PI * 0.4;  // Lean forward a lot
            meshInner.rotation.z = Math.PI * 0.15; // Slight tilt
            meshInner.position.y = 0.6;            // Raised position
            
            // Flippers relaxed at sides
            if(flipperL) {
                flipperL.rotation.z = 0.5 + breathe;
                flipperL.rotation.x = 0.2;
            }
            if(flipperR) {
                flipperR.rotation.z = -0.5 - breathe;
                flipperR.rotation.x = 0.2;
            }
            // Feet tucked
            if(footL) {
                footL.rotation.x = -0.4;
            }
            if(footR) {
                footR.rotation.x = -0.3;
            }
            // Head resting - gentle bob from breathing
            const sleepyHead = breathe * 0.5;
            if(head) head.rotation.x = 0.2 + sleepyHead;
            if(hatPart) hatPart.rotation.x = 0.2 + sleepyHead;
            if(eyesPart) eyesPart.rotation.x = 0.2 + sleepyHead;
            if(mouthPart) mouthPart.rotation.x = 0.2 + sleepyHead;
        }
        else if (emoteType === 'Cry') {
            // Sad crying animation - head down, shaking, arms to face
            const sobSpeed = eTime * 8;
            const sob = Math.sin(sobSpeed) * 0.08;
            const shake = Math.sin(sobSpeed * 1.5) * 0.03;
            
            // Arms up to face (wiping tears)
            if(flipperL) {
                flipperL.rotation.z = Math.PI * 0.5;
                flipperL.rotation.x = -0.6 + sob * 0.5;
            }
            if(flipperR) {
                flipperR.rotation.z = -Math.PI * 0.5;
                flipperR.rotation.x = -0.6 - sob * 0.5;
            }
            // Head down, shaking
            if(head) {
                head.rotation.x = 0.3 + sob;
                head.rotation.z = shake;
            }
            if(hatPart) {
                hatPart.rotation.x = 0.3 + sob;
                hatPart.rotation.z = shake;
            }
            if(eyesPart) {
                eyesPart.rotation.x = 0.3 + sob;
                eyesPart.rotation.z = shake;
            }
            if(mouthPart) {
                mouthPart.rotation.x = 0.3 + sob;
                mouthPart.rotation.z = shake;
            }
            // Body shaking from sobs
            meshInner.rotation.z = shake;
            meshInner.position.y = 0.8 + Math.abs(sob) * 0.3;
        }
        else if (emoteType === 'Backflip') {
            // Exciting backflip - full rotation!
            const flipDuration = 1.2; // Full flip takes 1.2 seconds
            const flipProgress = Math.min(eTime / flipDuration, 1);
            
            // Jump arc
            const jumpHeight = Math.sin(flipProgress * Math.PI) * 3;
            meshInner.position.y = 0.8 + jumpHeight;
            
            // Full backward rotation
            meshInner.rotation.x = -flipProgress * Math.PI * 2;
            
            // Arms spread during flip
            if(flipperL) {
                flipperL.rotation.z = Math.PI * 0.6 * (1 - flipProgress * 0.5);
            }
            if(flipperR) {
                flipperR.rotation.z = -Math.PI * 0.6 * (1 - flipProgress * 0.5);
            }
            // Tuck legs during flip
            if(footL) footL.rotation.x = -0.8 * Math.sin(flipProgress * Math.PI);
            if(footR) footR.rotation.x = -0.8 * Math.sin(flipProgress * Math.PI);
        }
        else if (emoteType === 'Facepalm') {
            // Classic facepalm - flipper to face, head down
            const palmTime = Math.min(eTime * 4, 1); // Smooth transition
            const headShake = Math.sin(eTime * 3) * 0.05; // Subtle disappointment shake
            
            // Right flipper to face
            if(flipperR) {
                flipperR.rotation.z = -Math.PI * 0.3 * palmTime;
                flipperR.rotation.x = -Math.PI * 0.5 * palmTime;
            }
            // Left flipper relaxed/disappointed
            if(flipperL) {
                flipperL.rotation.z = 0.2 * palmTime;
            }
            // Head tilted down into flipper
            if(head) {
                head.rotation.x = 0.25 * palmTime;
                head.rotation.z = headShake;
            }
            if(hatPart) {
                hatPart.rotation.x = 0.25 * palmTime;
                hatPart.rotation.z = headShake;
            }
            if(eyesPart) {
                eyesPart.rotation.x = 0.25 * palmTime;
                eyesPart.rotation.z = headShake;
            }
            if(mouthPart) {
                mouthPart.rotation.x = 0.25 * palmTime;
                mouthPart.rotation.z = headShake;
            }
            // Slight slouch of disappointment
            meshInner.rotation.x = 0.1 * palmTime;
        }
        
        // Auto-stop non-persistent emotes
        const loopingEmotes = ['Sit', 'Breakdance', 'DJ', '67', 'Headbang', 'Dance', 'Sleep', 'Cry'];
        if (!loopingEmotes.includes(emoteType) && eTime > 3) {
            if (onEmoteEnd) {
                onEmoteEnd();
            }
        }
    } else if (isMoving) {
        // Walking animation
        const walkCycle = time * 10;
        
        if (isDoginal) {
            // Quadruped dog trot animation
            // Front-left + back-right move together, front-right + back-left together
            const trotSpeed = time * 12; // Faster trot cycle
            const trotAmount = 0.6;
            
            // Front legs (flipperL/R are front paws for dog)
            if(flipperL) flipperL.rotation.x = Math.sin(trotSpeed) * trotAmount;
            if(flipperR) flipperR.rotation.x = Math.sin(trotSpeed + Math.PI) * trotAmount;
            
            // Back legs (footL/R are back paws for dog) - opposite phase to front
            if(footL) footL.rotation.x = Math.sin(trotSpeed + Math.PI) * trotAmount;
            if(footR) footR.rotation.x = Math.sin(trotSpeed) * trotAmount;
            
            // Subtle body bounce and sway like a trotting dog
            meshInner.position.y = 0.8 + Math.abs(Math.sin(trotSpeed * 2)) * 0.08;
            meshInner.rotation.z = Math.sin(trotSpeed) * 0.03;
            
            // Head bob while trotting
            if(head) head.rotation.x = Math.sin(trotSpeed * 2) * 0.05;
            if(hatPart) hatPart.rotation.x = Math.sin(trotSpeed * 2) * 0.05;
            
            // TAIL WAG - fast happy wagging while running!
            if(tail) {
                tail.rotation.y = Math.sin(time * 20) * 0.8; // Fast side-to-side wag
                tail.rotation.x = 0.2; // Tail up when running
            }
            
            // EARS - flop while running
            if(earL) {
                earL.rotation.x = Math.sin(trotSpeed * 2) * 0.15;
                earL.rotation.z = -0.1 + Math.sin(trotSpeed) * 0.1;
            }
            if(earR) {
                earR.rotation.x = Math.sin(trotSpeed * 2) * 0.15;
                earR.rotation.z = 0.1 - Math.sin(trotSpeed) * 0.1;
            }
        } else if (isShrimp) {
            // Shrimp scuttle animation - tail flapping propulsion style
            const scuttleSpeed = time * 14; // Fast scuttle
            const flapAmount = 0.5;
            
            // TAIL FLAPPING - up and down like swimming/propulsion
            if(tail) {
                tail.rotation.x = Math.sin(scuttleSpeed) * flapAmount;
            }
            
            // Arms/claws wave alternately while moving
            if(flipperL) {
                flipperL.rotation.x = Math.sin(scuttleSpeed) * 0.4;
                flipperL.rotation.z = 0.2 + Math.sin(scuttleSpeed * 0.5) * 0.1;
            }
            if(flipperR) {
                flipperR.rotation.x = Math.sin(scuttleSpeed + Math.PI) * 0.4;
                flipperR.rotation.z = -0.2 - Math.sin(scuttleSpeed * 0.5) * 0.1;
            }
            
            // Body bob - shrimp scuttles with a bounce
            meshInner.position.y = 0.8 + Math.abs(Math.sin(scuttleSpeed * 2)) * 0.06;
            meshInner.rotation.z = Math.sin(scuttleSpeed) * 0.04;
            
            // Antennae movement (via head bob)
            if(head) head.rotation.x = Math.sin(scuttleSpeed * 1.5) * 0.08;
            if(hatPart) hatPart.rotation.x = Math.sin(scuttleSpeed * 1.5) * 0.08;
        } else if (isDuck) {
            // Duck waddle animation - cute waddle with tail wag!
            const waddleSpeed = time * 10;
            const waddleAmount = 0.4;
            
            // Feet waddle alternating
            if(footL) footL.rotation.x = Math.sin(waddleSpeed) * waddleAmount;
            if(footR) footR.rotation.x = Math.sin(waddleSpeed + Math.PI) * waddleAmount;
            
            // Wings flap slightly while waddling
            if(flipperL) flipperL.rotation.z = 0.2 + Math.sin(waddleSpeed * 2) * 0.15;
            if(flipperR) flipperR.rotation.z = -0.2 - Math.sin(waddleSpeed * 2) * 0.15;
            
            // Body waddle side-to-side (classic duck waddle!)
            meshInner.position.y = 0.8 + Math.abs(Math.sin(waddleSpeed)) * 0.05;
            meshInner.rotation.z = Math.sin(waddleSpeed) * 0.08; // More pronounced side waddle
            
            // Head bob
            if(head) head.rotation.x = Math.sin(waddleSpeed * 2) * 0.04;
            if(hatPart) hatPart.rotation.x = Math.sin(waddleSpeed * 2) * 0.04;
            
            // TAIL WAG - happy duck tail wagging while waddling!
            if(tail) {
                tail.rotation.y = Math.sin(time * 18) * 0.6; // Fast side-to-side wag
                tail.rotation.x = -0.15; // Tail slightly up when moving
            }
        } else if (isTungTung) {
            // Tung Tung walking - menacing march with bat swing
            const marchSpeed = time * 8;
            const marchAmount = 0.45;
            
            // Legs march with purpose
            if(footL) footL.rotation.x = Math.sin(marchSpeed) * marchAmount;
            if(footR) footR.rotation.x = Math.sin(marchSpeed + Math.PI) * marchAmount;
            
            // Arms swing - right arm (with bat) swings more menacingly
            if(flipperL) flipperL.rotation.x = Math.sin(marchSpeed) * 0.4;
            if(flipperR) flipperR.rotation.x = Math.sin(marchSpeed + Math.PI) * 0.3 + Math.sin(time * 12) * 0.1; // Bat ready swing
            
            // Slight body lean forward while marching
            meshInner.rotation.z = Math.sin(marchSpeed) * 0.06;
            meshInner.position.y = 0.8 + Math.abs(Math.sin(marchSpeed)) * 0.03;
        } else {
            // Standard biped walking animation (penguin, marcus, whale, frog)
        if(footL) footL.rotation.x = Math.sin(walkCycle) * 0.5;
        if(footR) footR.rotation.x = Math.sin(walkCycle + Math.PI) * 0.5;
        if(flipperL) flipperL.rotation.x = Math.sin(walkCycle) * 0.5;
        if(flipperR) flipperR.rotation.x = -Math.sin(walkCycle) * 0.5;
        meshInner.rotation.z = Math.sin(time * 8) * 0.05; 
        }
    } else {
        // Idle animation
        if (isDoginal) {
            // Dog idle - subtle breathing and ear twitch
            meshInner.rotation.z = Math.sin(time * 1.5) * 0.015;
            if(head) head.rotation.x = Math.sin(time * 0.8) * 0.02; // Slight head movement
            
            // TAIL - gentle slow wag when idle (happy dog)
            if(tail) {
                tail.rotation.y = Math.sin(time * 3) * 0.4; // Slower, gentler wag
            }
            
            // EARS - occasional twitch
            const earTwitch = Math.sin(time * 0.5) > 0.9 ? Math.sin(time * 15) * 0.1 : 0;
            if(earL) earL.rotation.z = -0.05 + earTwitch;
            if(earR) earR.rotation.z = 0.05 - earTwitch;
        } else if (isShrimp) {
            // Shrimp idle - gentle tail sway and antennae movement
            meshInner.rotation.z = Math.sin(time * 1.2) * 0.015;
            
            // TAIL - gentle up/down movement like breathing/floating
            if(tail) {
                tail.rotation.x = Math.sin(time * 2) * 0.15;
            }
            
            // Arms held slightly forward, occasional twitch
            const clawTwitch = Math.sin(time * 0.7) > 0.8 ? Math.sin(time * 12) * 0.1 : 0;
            if(flipperL) {
                flipperL.rotation.z = 0.15 + clawTwitch;
            }
            if(flipperR) {
                flipperR.rotation.z = -0.15 - clawTwitch;
            }
            
            // Antennae subtle movement (via head)
            if(head) head.rotation.x = Math.sin(time * 0.8) * 0.03;
        } else if (isDuck) {
            // Duck idle - gentle breathing sway and tail wag
            meshInner.rotation.z = Math.sin(time * 1.2) * 0.02;
            
            // Slight head movement
            if(head) head.rotation.x = Math.sin(time * 0.9) * 0.025;
            
            // Wings resting at sides with subtle movement
            if(flipperL) flipperL.rotation.z = 0.15 + Math.sin(time * 1.5) * 0.03;
            if(flipperR) flipperR.rotation.z = -0.15 - Math.sin(time * 1.5) * 0.03;
            
            // TAIL - gentle slow wag when idle (happy duck)
            if(tail) {
                tail.rotation.y = Math.sin(time * 2.5) * 0.3; // Slower, gentler wag
            }
        } else if (isTungTung) {
            // Tung Tung idle - menacing presence with bat at ready
            meshInner.rotation.z = Math.sin(time * 1.2) * 0.015;
            
            // Slight lean forward like ready to strike
            if(head) head.rotation.x = Math.sin(time * 0.6) * 0.02;
            
            // Left arm relaxed at side
            if(flipperL) flipperL.rotation.z = 0.1 + Math.sin(time * 1.5) * 0.02;
            
            // Right arm (with bat) - occasional menacing tap/swing
            if(flipperR) {
                const batTwitch = Math.sin(time * 0.4) > 0.85 ? Math.sin(time * 8) * 0.15 : 0;
                flipperR.rotation.z = -0.1 - Math.sin(time * 1.5) * 0.02;
                flipperR.rotation.x = batTwitch; // Occasional bat tap
            }
        } else {
        meshInner.rotation.z = Math.sin(time * 1.5) * 0.02;
        }
    }
}

export default { animateMesh, cacheAnimParts };

