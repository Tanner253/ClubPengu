/**
 * MovementSystem - Handles player and entity movement, collision, jumping
 */

class MovementSystem {
    constructor(collisionSystem) {
        this.collisionSystem = collisionSystem;
        this.gravity = -20;
        this.jumpForce = 8;
        this.walkSpeed = 5;
        this.sprintMultiplier = 1.5;
        this.groundY = 0;
    }
    
    /**
     * Update player movement
     * @param {Object} player - Player data with position, velocity
     * @param {Object} input - Movement input { x, z, jump, sprint }
     * @param {number} delta - Time since last frame
     * @param {Object} bounds - Movement bounds { minX, maxX, minZ, maxZ }
     * @returns {Object} Updated player state
     */
    updatePlayer(player, input, delta, bounds) {
        const speed = input.sprint ? this.walkSpeed * this.sprintMultiplier : this.walkSpeed;
        
        // Calculate target velocity from input
        let velocityX = input.x * speed;
        let velocityZ = input.z * speed;
        
        // Handle jumping
        let velocityY = player.velocityY || 0;
        let isGrounded = player.y <= this.groundY + 0.01;
        
        if (input.jump && isGrounded) {
            velocityY = this.jumpForce;
            isGrounded = false;
        }
        
        // Apply gravity
        if (!isGrounded) {
            velocityY += this.gravity * delta;
        }
        
        // Calculate new position
        let newX = player.x + velocityX * delta;
        let newZ = player.z + velocityZ * delta;
        let newY = player.y + velocityY * delta;
        
        // Clamp Y to ground and landing surfaces
        if (newY < this.groundY) {
            newY = this.groundY;
            velocityY = 0;
            isGrounded = true;
        }
        
        // Check collision
        if (this.collisionSystem) {
            const collision = this.collisionSystem.checkCollision(newX, newZ, player.radius || 0.5);
            
            if (collision) {
                // Slide along collision
                const slideResult = this.slideAlongCollision(
                    player.x, player.z,
                    newX, newZ,
                    collision
                );
                newX = slideResult.x;
                newZ = slideResult.z;
            }
        }
        
        // Clamp to bounds
        if (bounds) {
            newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
            newZ = Math.max(bounds.minZ, Math.min(bounds.maxZ, newZ));
        }
        
        // Calculate if walking (for animation)
        const isWalking = Math.abs(input.x) > 0.01 || Math.abs(input.z) > 0.01;
        
        // Calculate facing angle
        let facingAngle = player.facingAngle || 0;
        if (isWalking) {
            facingAngle = Math.atan2(input.x, input.z);
        }
        
        return {
            x: newX,
            y: newY,
            z: newZ,
            velocityY,
            isGrounded,
            isWalking,
            facingAngle,
        };
    }
    
    /**
     * Slide along collision surface
     */
    slideAlongCollision(oldX, oldZ, newX, newZ, collision) {
        // Simple slide: project movement onto collision normal
        const moveX = newX - oldX;
        const moveZ = newZ - oldZ;
        
        // Get collision center
        const cx = (collision.minX + collision.maxX) / 2;
        const cz = (collision.minZ + collision.maxZ) / 2;
        
        // Normal from collision to player
        const nx = oldX - cx;
        const nz = oldZ - cz;
        const nLen = Math.sqrt(nx * nx + nz * nz) || 1;
        const normX = nx / nLen;
        const normZ = nz / nLen;
        
        // Project movement onto tangent (perpendicular to normal)
        const tangentX = -normZ;
        const tangentZ = normX;
        
        const dot = moveX * tangentX + moveZ * tangentZ;
        
        return {
            x: oldX + tangentX * dot,
            z: oldZ + tangentZ * dot,
        };
    }
    
    /**
     * Check if a position is on a landing surface
     * @param {number} x
     * @param {number} z
     * @param {Array} landingSurfaces
     * @returns {Object|null} Surface if standing on one
     */
    checkLandingSurface(x, z, landingSurfaces) {
        for (const surface of landingSurfaces) {
            if (x >= surface.minX && x <= surface.maxX &&
                z >= surface.minZ && z <= surface.maxZ) {
                return surface;
            }
        }
        return null;
    }
    
    /**
     * Apply walking animation to mesh
     * @param {THREE.Object3D} mesh
     * @param {boolean} isWalking
     * @param {number} time - Animation time
     */
    applyWalkAnimation(mesh, isWalking, time) {
        if (isWalking) {
            // Bobbing motion
            mesh.position.y = Math.abs(Math.sin(time * 8)) * 0.15;
            
            // Slight tilt
            mesh.rotation.z = Math.sin(time * 8) * 0.05;
        } else {
            // Idle breathing
            mesh.position.y = Math.sin(time * 2) * 0.02;
            mesh.rotation.z = 0;
        }
    }
    
    /**
     * Update ground level for jumping (e.g., on elevated surfaces)
     */
    setGroundLevel(y) {
        this.groundY = y;
    }
    
    /**
     * Get current ground level
     */
    getGroundLevel() {
        return this.groundY;
    }
}

export default MovementSystem;

