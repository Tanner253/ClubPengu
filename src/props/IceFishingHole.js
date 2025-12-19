/**
 * IceFishingHole - 3D ice fishing spot prop
 * 
 * Features:
 * - Frozen ice surface with hole
 * - Visual indicator for interaction
 * - Supports multiplayer fishing state display
 */

import BaseProp from './BaseProp';

class IceFishingHole extends BaseProp {
    static TYPE = 'ice_fishing_hole';
    static NAME = 'Ice Fishing Hole';
    
    constructor(THREE) {
        super(THREE);
        this.waterMesh = null;
        this.glowRing = null;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.position.set(x, y, z);
        
        const rotation = options.rotation || 0;
        group.rotation.y = rotation;
        
        // Ice platform (rough circular ice chunk)
        const iceGeometry = new THREE.CylinderGeometry(2.5, 2.8, 0.4, 16);
        const iceMaterial = new THREE.MeshStandardMaterial({
            color: 0xDDEEFF,
            roughness: 0.3,
            metalness: 0.1,
            transparent: true,
            opacity: 0.9
        });
        const icePlatform = new THREE.Mesh(iceGeometry, iceMaterial);
        icePlatform.position.y = 0.2;
        icePlatform.receiveShadow = true;
        group.add(icePlatform);
        
        // Ice cracks (decorative lines)
        const crackMaterial = new THREE.LineBasicMaterial({ 
            color: 0x99BBDD, 
            transparent: true, 
            opacity: 0.5 
        });
        
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.5;
            const length = 1.5 + Math.random();
            const points = [
                new THREE.Vector3(0, 0.41, 0),
                new THREE.Vector3(
                    Math.cos(angle) * length,
                    0.41,
                    Math.sin(angle) * length
                )
            ];
            const crackGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const crack = new THREE.Line(crackGeometry, crackMaterial);
            group.add(crack);
        }
        
        // Fishing hole (dark circle in ice)
        const holeGeometry = new THREE.CircleGeometry(0.7, 16);
        const holeMaterial = new THREE.MeshBasicMaterial({
            color: 0x112233,
            side: THREE.DoubleSide
        });
        const hole = new THREE.Mesh(holeGeometry, holeMaterial);
        hole.rotation.x = -Math.PI / 2;
        hole.position.y = 0.42;
        group.add(hole);
        
        // Water surface in hole (animated)
        const waterGeometry = new THREE.CircleGeometry(0.65, 16);
        const waterMaterial = new THREE.MeshBasicMaterial({
            color: 0x224466,
            transparent: true,
            opacity: 0.8
        });
        this.waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
        this.waterMesh.rotation.x = -Math.PI / 2;
        this.waterMesh.position.y = 0.35;
        group.add(this.waterMesh);
        
        // Interaction glow ring (pulses when available)
        const ringGeometry = new THREE.RingGeometry(0.8, 1.0, 24);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x44AAFF,
            transparent: true,
            opacity: 0.0, // Start invisible
            side: THREE.DoubleSide
        });
        this.glowRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.glowRing.rotation.x = -Math.PI / 2;
        this.glowRing.position.y = 0.43;
        group.add(this.glowRing);
        
        // Small snow mounds around edge
        const snowMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.9
        });
        
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const radius = 2.2 + Math.random() * 0.3;
            const moundGeometry = new THREE.SphereGeometry(
                0.3 + Math.random() * 0.2, 
                6, 
                4,
                0, Math.PI * 2,
                0, Math.PI / 2
            );
            const mound = new THREE.Mesh(moundGeometry, snowMaterial);
            mound.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            mound.scale.y = 0.5;
            group.add(mound);
        }
        
        // Fishing sign/marker
        const postGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 6);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x4A3728 });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(-1.8, 0.75, 0);
        group.add(post);
        
        // Sign board
        const signGeometry = new THREE.BoxGeometry(1.2, 0.6, 0.08);
        const signMaterial = new THREE.MeshStandardMaterial({ color: 0x5D4E37 });
        const sign = new THREE.Mesh(signGeometry, signMaterial);
        sign.position.set(-1.8, 1.4, 0);
        group.add(sign);
        
        // Fish icon on sign (simple triangle fish)
        const fishShape = new THREE.Shape();
        fishShape.moveTo(0, 0);
        fishShape.lineTo(0.3, 0.15);
        fishShape.lineTo(0.3, -0.15);
        fishShape.lineTo(0, 0);
        
        const fishIconGeometry = new THREE.ShapeGeometry(fishShape);
        const fishIconMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x88CCFF,
            side: THREE.DoubleSide
        });
        const fishIcon = new THREE.Mesh(fishIconGeometry, fishIconMaterial);
        fishIcon.position.set(-1.95, 1.4, 0.05);
        group.add(fishIcon);
        
        // Bucket prop (for caught fish)
        const bucketGeometry = new THREE.CylinderGeometry(0.25, 0.2, 0.4, 8, 1, true);
        const bucketMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x666688,
            side: THREE.DoubleSide
        });
        const bucket = new THREE.Mesh(bucketGeometry, bucketMaterial);
        bucket.position.set(1.5, 0.2, -0.5);
        group.add(bucket);
        
        // Bucket bottom
        const bucketBottomGeometry = new THREE.CircleGeometry(0.2, 8);
        const bucketBottom = new THREE.Mesh(bucketBottomGeometry, bucketMaterial);
        bucketBottom.rotation.x = Math.PI / 2;
        bucketBottom.position.set(1.5, 0.01, -0.5);
        group.add(bucketBottom);
        
        // Store mesh and add to scene
        this.mesh = group;
        this.mesh.userData.propType = IceFishingHole.TYPE;
        this.mesh.userData.fishingSpot = true;
        scene.add(this.mesh);
        
        return this.mesh;
    }
    
    /**
     * Update glow ring animation
     */
    update(time, isAvailable = true, isActive = false) {
        if (!this.glowRing) return;
        
        if (isActive) {
            // Active fishing - blue solid glow
            this.glowRing.material.opacity = 0.6;
            this.glowRing.material.color.setHex(0x4488FF);
        } else if (isAvailable) {
            // Available - pulsing glow
            const pulse = (Math.sin(time * 3) + 1) / 2;
            this.glowRing.material.opacity = 0.2 + pulse * 0.4;
            this.glowRing.material.color.setHex(0x44FFAA);
        } else {
            // In use by someone else - red tint
            this.glowRing.material.opacity = 0.3;
            this.glowRing.material.color.setHex(0xFF4444);
        }
        
        // Animate water ripple
        if (this.waterMesh) {
            const ripple = Math.sin(time * 2) * 0.02;
            this.waterMesh.position.y = 0.35 + ripple;
        }
    }
    
    /**
     * Get collision bounds (players can't walk through the ice)
     */
    getCollisionBounds() {
        return {
            minX: -2.5,
            maxX: 2.5,
            minZ: -2.5,
            maxZ: 2.5,
            height: 0.5
        };
    }
    
    /**
     * Get interaction trigger
     */
    getTrigger() {
        return {
            type: 'fishing',
            radius: 2.0,
            message: 'Press E to Fish',
            action: 'fishing'
        };
    }
    
    cleanup() {
        super.cleanup();
        this.waterMesh = null;
        this.glowRing = null;
    }
}

export default IceFishingHole;

