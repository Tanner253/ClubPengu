/**
 * CameraController - Smooth third-person camera enhancement for OrbitControls
 * 
 * Works alongside OrbitControls to provide:
 * - Arrow key horizontal camera rotation
 * - Touch/mobile camera rotation (multitouch support)
 * - Smooth auto-align behind player when moving (after manual input timeout)
 * - Soft/gradual transitions for all camera movements
 * 
 * OrbitControls still handles:
 * - Mouse drag rotation
 * - Scroll wheel zoom
 * - Touch pinch zoom
 */

class CameraController {
    constructor(THREE, camera, controls) {
        this.THREE = THREE;
        this.camera = camera;
        this.controls = controls;
        
        // Player state
        this.playerPosition = new THREE.Vector3();
        this.playerFacingAngle = 0;
        this.playerIsMoving = false;
        
        // Auto-align settings
        this.autoAlignEnabled = true;
        this.autoAlignDelay = 0.8;      // Seconds of no manual input before auto-align
        this.autoAlignSpeed = 0.0375;   // How fast camera aligns behind player (0-1) - 50% faster than before
        this.lastManualInput = 0;       // Timestamp of last manual camera control
        
        // Input accumulators (applied smoothly each frame)
        this.pendingYawDelta = 0;       // From arrow keys
        this.pendingTouchYaw = 0;       // From touch drag
        this.pendingTouchPitch = 0;     // From touch drag (vertical)
        
        // Rotation speeds
        this.arrowKeySpeed = 2.5;       // Radians per second for arrow keys
        this.touchSensitivity = 1.0;    // Multiplier for touch input
        
        // Smooth follow settings
        this.followSmoothing = 0.1;     // How fast camera follows player position
        
        // Reusable vectors
        this._offset = new THREE.Vector3();
        this._targetPos = new THREE.Vector3();
        this._spherical = new THREE.Spherical();
    }
    
    /**
     * Update player state - call every frame before update()
     */
    setPlayerState(position, facingAngle, isMoving) {
        this.playerPosition.set(position.x, position.y + 1.2, position.z);
        this.playerFacingAngle = facingAngle;
        this.playerIsMoving = isMoving;
    }
    
    /**
     * Apply rotation from touch/mouse drag
     * @param {number} deltaX - Horizontal delta (positive = rotate right)
     * @param {number} deltaY - Vertical delta (positive = rotate up)
     * @param {number} sensitivity - Sensitivity multiplier
     */
    applyRotationInput(deltaX, deltaY, sensitivity = 1.0) {
        this.pendingTouchYaw += deltaX * 0.01 * sensitivity * this.touchSensitivity;
        this.pendingTouchPitch += deltaY * 0.005 * sensitivity * this.touchSensitivity;
        this.lastManualInput = Date.now();
    }
    
    /**
     * Apply arrow key rotation
     * @param {number} direction - -1 for left, +1 for right, 0 for none
     */
    applyArrowKeyRotation(direction) {
        this.pendingYawDelta = direction;
        if (direction !== 0) {
            this.lastManualInput = Date.now();
        }
    }
    
    /**
     * Main update - call every frame
     * @param {number} delta - Time since last frame in seconds
     */
    update(delta) {
        if (!this.controls || !this.camera) return;
        
        const now = Date.now();
        const timeSinceManual = (now - this.lastManualInput) / 1000;
        
        // === Dynamically adjust max polar angle based on player elevation ===
        this._updateMaxPolarAngle();
        
        // === Apply Arrow Key Rotation ===
        if (this.pendingYawDelta !== 0) {
            // Rotate around the target (player)
            const rotateAngle = this.pendingYawDelta * this.arrowKeySpeed * delta;
            this._rotateAroundTarget(rotateAngle);
        }
        
        // === Apply Touch/Mobile Rotation ===
        if (this.pendingTouchYaw !== 0 || this.pendingTouchPitch !== 0) {
            // Horizontal rotation
            if (this.pendingTouchYaw !== 0) {
                this._rotateAroundTarget(-this.pendingTouchYaw);
                this.pendingTouchYaw = 0;
            }
            
            // Vertical rotation (pitch) - adjust polar angle
            if (this.pendingTouchPitch !== 0) {
                this._adjustPitch(this.pendingTouchPitch);
                this.pendingTouchPitch = 0;
            }
        }
        
        // === Auto-Align Behind Player When Moving ===
        if (this.autoAlignEnabled && this.playerIsMoving && timeSinceManual > this.autoAlignDelay) {
            this._autoAlignBehindPlayer(delta);
        }
        
        // === Smooth Follow Player Position ===
        this._smoothFollowPlayer(delta);
        
        // Update OrbitControls (handles damping)
        this.controls.update();
    }
    
    /**
     * Dynamically update the max polar angle based on player elevation.
     * When player is elevated, allow camera to rotate further down (to look up more)
     * while ensuring camera never goes below ground level.
     */
    _updateMaxPolarAngle() {
        // Get target Y (player position + offset, this is head-level ~1.2 above feet)
        const targetY = this.playerPosition.y;
        
        // Get current camera distance (radius)
        this._offset.copy(this.camera.position).sub(this.controls.target);
        const radius = this._offset.length();
        
        // Minimum ground clearance for camera (higher value = safer, prevents clipping)
        // Using 1.5 to account for camera frustum and visual comfort
        const groundClearance = 1.5;
        
        // Default max angle (horizon level, slightly above)
        const defaultMaxAngle = Math.PI / 2 - 0.1;
        
        // If player target is below the clearance threshold, use default
        // (player at ground level shouldn't be able to look up much)
        if (targetY <= groundClearance + 0.5) {
            this.controls.maxPolarAngle = defaultMaxAngle;
            return;
        }
        
        // Calculate max phi that keeps camera above ground
        // Camera Y = targetY + radius * cos(phi) where phi is angle from +Y axis
        // To keep Camera Y >= groundClearance:
        // targetY + radius * cos(phi) >= groundClearance
        // cos(phi) >= (groundClearance - targetY) / radius
        // phi <= acos((groundClearance - targetY) / radius)
        
        const cosPhiMin = (groundClearance - targetY) / radius;
        
        // Clamp to valid acos range [-1, 1]
        if (cosPhiMin <= -1) {
            // Player is very high, could look almost straight up
            // Cap at a reasonable angle (not quite straight down from above)
            this.controls.maxPolarAngle = Math.PI - 0.4;
        } else if (cosPhiMin >= 1) {
            // Shouldn't happen, but use default
            this.controls.maxPolarAngle = defaultMaxAngle;
        } else {
            // Calculate the angle that keeps camera above ground
            const maxAngle = Math.acos(cosPhiMin);
            // Use the larger of this calculated angle or the default
            // (allows looking up more when elevated)
            // Cap at PI - 0.4 to prevent going too far under
            this.controls.maxPolarAngle = Math.max(defaultMaxAngle, Math.min(maxAngle, Math.PI - 0.4));
        }
    }
    
    /**
     * Rotate camera around the target point (horizontal orbit)
     */
    _rotateAroundTarget(angle) {
        // Get current offset from target
        this._offset.copy(this.camera.position).sub(this.controls.target);
        
        // Convert to spherical coordinates
        this._spherical.setFromVector3(this._offset);
        
        // Rotate theta (horizontal angle)
        this._spherical.theta += angle;
        
        // Convert back to cartesian
        this._offset.setFromSpherical(this._spherical);
        
        // Apply new camera position
        this.camera.position.copy(this.controls.target).add(this._offset);
    }
    
    /**
     * Adjust camera pitch (vertical angle)
     */
    _adjustPitch(delta) {
        // Get current offset from target
        this._offset.copy(this.camera.position).sub(this.controls.target);
        
        // Convert to spherical
        this._spherical.setFromVector3(this._offset);
        
        // Adjust phi (vertical angle), clamped to valid range
        this._spherical.phi = Math.max(
            this.controls.minPolarAngle || 0.1,
            Math.min(
                this.controls.maxPolarAngle || (Math.PI / 2 - 0.1),
                this._spherical.phi + delta
            )
        );
        
        // Convert back
        this._offset.setFromSpherical(this._spherical);
        this.camera.position.copy(this.controls.target).add(this._offset);
    }
    
    /**
     * Smoothly rotate camera to trail behind player
     */
    _autoAlignBehindPlayer(delta) {
        // Get current camera angle around player
        this._offset.copy(this.camera.position).sub(this.controls.target);
        this._spherical.setFromVector3(this._offset);
        
        // Target angle: behind player (opposite of facing direction)
        // Player faces direction rotRef, camera should be PI radians behind (opposite side)
        // Spherical theta is measured from +Z axis, player rotation is also from +Z
        const targetTheta = this.playerFacingAngle + Math.PI;
        
        // Calculate shortest rotation path
        let angleDiff = targetTheta - this._spherical.theta;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        // Only align if camera is significantly off (prevents jitter)
        if (Math.abs(angleDiff) > 0.05) {
            // Smooth interpolation
            const alignAmount = angleDiff * this.autoAlignSpeed;
            this._spherical.theta += alignAmount;
            
            // Apply new position
            this._offset.setFromSpherical(this._spherical);
            this.camera.position.copy(this.controls.target).add(this._offset);
        }
    }
    
    /**
     * Smoothly move camera to follow player
     */
    _smoothFollowPlayer(delta) {
        // Target is the player position
        this._targetPos.copy(this.playerPosition);
        
        // Get current offset from target
        this._offset.copy(this.camera.position).sub(this.controls.target);
        
        // Smoothly move target toward player
        this.controls.target.lerp(this._targetPos, this.followSmoothing);
        
        // Move camera to maintain offset
        this.camera.position.copy(this.controls.target).add(this._offset);
    }
    
    /**
     * Instantly snap camera to current target (for teleports/room changes)
     */
    snapToTarget() {
        this.controls.target.copy(this.playerPosition);
        this.controls.update();
    }
    
    /**
     * Reset camera to behind player
     */
    resetBehindPlayer() {
        this._offset.copy(this.camera.position).sub(this.controls.target);
        this._spherical.setFromVector3(this._offset);
        this._spherical.theta = this.playerFacingAngle + Math.PI;
        this._offset.setFromSpherical(this._spherical);
        this.camera.position.copy(this.controls.target).add(this._offset);
        this.controls.update();
    }
    
    /**
     * Set auto-align enabled/disabled
     */
    setAutoAlign(enabled) {
        this.autoAlignEnabled = enabled;
    }
    
    /**
     * Set smoothing factors
     */
    setSmoothingFactors(follow = 0.1, autoAlign = 0.025) {
        this.followSmoothing = follow;
        this.autoAlignSpeed = autoAlign;
    }
    
    /**
     * Cleanup
     */
    dispose() {
        // Nothing special to clean up
    }
}

export default CameraController;
