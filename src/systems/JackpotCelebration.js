/**
 * JackpotCelebration - Epic celebration effects when someone hits the jackpot!
 * 
 * Features:
 * - Disco ball with spinning laser beams
 * - Confetti particles raining from ceiling
 * - Pulsing lights
 * - Sound effects ready (just add audio)
 * 
 * PERFORMANCE OPTIMIZED:
 * - Shared geometry for all laser beams (single CylinderGeometry)
 * - Cached materials per color
 */

const CELEBRATION_DURATION = 10000; // 10 seconds of party!
const CONFETTI_COUNT = 200;
const LASER_COUNT = 12;
const LASER_COLORS = [0xff0000, 0x00ff00, 0x0000ff, 0xff00ff, 0xffff00, 0x00ffff];

class JackpotCelebration {
    constructor(THREE, scene, roomWidth, roomDepth, roomHeight) {
        this.THREE = THREE;
        this.scene = scene;
        this.roomWidth = roomWidth;
        this.roomDepth = roomDepth;
        this.roomHeight = roomHeight;
        this.isActive = false;
        this.startTime = 0;
        
        // OPTIMIZATION: Shared laser geometry (created once)
        this.sharedLaserGeometry = new THREE.CylinderGeometry(0.05, 0.05, 40, 8);
        
        // OPTIMIZATION: Cached materials per color
        this.laserMaterialCache = new Map();
        LASER_COLORS.forEach(color => {
            this.laserMaterialCache.set(color, new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.7
            }));
        });
        
        // Create disco ball (always present, but hidden when not celebrating)
        this.createDiscoBall();
        
        // Create confetti system
        this.createConfettiSystem();
        
        // Create laser system
        this.createLaserSystem();
        
        // Store original ambient light for restoration
        this.originalAmbient = null;
    }
    
    createDiscoBall() {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        // Disco ball sphere with mirror material
        const ballGeo = new THREE.SphereGeometry(2, 32, 32);
        const ballMat = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            metalness: 1,
            roughness: 0.1,
            envMapIntensity: 2
        });
        this.discoBall = new THREE.Mesh(ballGeo, ballMat);
        group.add(this.discoBall);
        
        // Add mirror facets effect
        const facetGeo = new THREE.IcosahedronGeometry(2.05, 2);
        const facetMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            metalness: 1,
            roughness: 0,
            wireframe: true
        });
        const facets = new THREE.Mesh(facetGeo, facetMat);
        group.add(facets);
        
        // Hanging chain
        const chainGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
        const chainMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
        const chain = new THREE.Mesh(chainGeo, chainMat);
        chain.position.y = 4.5;
        group.add(chain);
        
        // Position at center of room, hanging from ceiling
        group.position.set(this.roomWidth / 2, this.roomHeight - 3, this.roomDepth / 2);
        group.visible = false; // Hidden until jackpot
        
        this.discoBallGroup = group;
        this.scene.add(group);
        
        // Create point light inside disco ball
        this.discoBallLight = new THREE.PointLight(0xffffff, 0, 30);
        this.discoBallLight.position.copy(group.position);
        this.scene.add(this.discoBallLight);
    }
    
    createLaserSystem() {
        const THREE = this.THREE;
        this.lasers = [];
        this.laserLights = [];
        
        for (let i = 0; i < LASER_COUNT; i++) {
            // OPTIMIZATION: Use shared geometry and clone cached material
            const color = LASER_COLORS[i % LASER_COLORS.length];
            const baseMaterial = this.laserMaterialCache.get(color);
            // Clone material so each laser can have independent opacity
            const laserMat = baseMaterial.clone();
            
            const laser = new THREE.Mesh(this.sharedLaserGeometry, laserMat);
            laser.visible = false;
            
            // Position at disco ball
            const centerX = this.roomWidth / 2;
            const centerZ = this.roomDepth / 2;
            laser.position.set(centerX, this.roomHeight - 3, centerZ);
            
            // Random initial rotation
            laser.rotation.x = Math.random() * Math.PI;
            laser.rotation.z = (i / LASER_COUNT) * Math.PI * 2;
            
            this.lasers.push({
                mesh: laser,
                color: color,
                speedX: 0.5 + Math.random() * 0.5,
                speedZ: 0.3 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2
            });
            
            this.scene.add(laser);
        }
    }
    
    createConfettiSystem() {
        const THREE = this.THREE;
        
        // Create confetti particles
        const positions = new Float32Array(CONFETTI_COUNT * 3);
        const colors = new Float32Array(CONFETTI_COUNT * 3);
        const sizes = new Float32Array(CONFETTI_COUNT);
        
        const confettiColors = [
            [1, 0.84, 0],    // Gold
            [1, 0, 0],       // Red
            [0, 1, 0],       // Green
            [0, 0, 1],       // Blue
            [1, 0, 1],       // Magenta
            [1, 1, 0],       // Yellow
            [0, 1, 1],       // Cyan
            [1, 0.5, 0]      // Orange
        ];
        
        this.confettiData = [];
        
        for (let i = 0; i < CONFETTI_COUNT; i++) {
            // Random position across room
            const x = Math.random() * this.roomWidth;
            const y = this.roomHeight + Math.random() * 5; // Start above ceiling
            const z = Math.random() * this.roomDepth;
            
            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;
            
            // Random color
            const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
            colors[i * 3] = color[0];
            colors[i * 3 + 1] = color[1];
            colors[i * 3 + 2] = color[2];
            
            sizes[i] = 0.3 + Math.random() * 0.3;
            
            // Store velocity and spin data
            this.confettiData.push({
                vx: (Math.random() - 0.5) * 2,
                vy: -3 - Math.random() * 2, // Fall speed
                vz: (Math.random() - 0.5) * 2,
                spin: Math.random() * 0.1,
                startY: y
            });
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true
        });
        
        this.confetti = new THREE.Points(geometry, material);
        this.confetti.visible = false;
        this.scene.add(this.confetti);
    }
    
    triggerJackpot(machinePosition) {
        if (this.isActive) return;
        
        console.log('🎰💰 JACKPOT CELEBRATION TRIGGERED!');
        this.isActive = true;
        this.startTime = Date.now();
        
        // Show disco ball
        this.discoBallGroup.visible = true;
        this.discoBallLight.intensity = 3;
        
        // Show lasers
        this.lasers.forEach(l => l.mesh.visible = true);
        
        // Show confetti
        this.confetti.visible = true;
        this.resetConfetti();
        
        // Schedule end of celebration
        setTimeout(() => {
            this.endCelebration();
        }, CELEBRATION_DURATION);
    }
    
    resetConfetti() {
        const positions = this.confetti.geometry.attributes.position.array;
        
        for (let i = 0; i < CONFETTI_COUNT; i++) {
            positions[i * 3] = Math.random() * this.roomWidth;
            positions[i * 3 + 1] = this.roomHeight + Math.random() * 5;
            positions[i * 3 + 2] = Math.random() * this.roomDepth;
            this.confettiData[i].startY = positions[i * 3 + 1];
        }
        
        this.confetti.geometry.attributes.position.needsUpdate = true;
    }
    
    endCelebration() {
        console.log('🎰 Jackpot celebration ended');
        this.isActive = false;
        
        // Hide disco ball
        this.discoBallGroup.visible = false;
        this.discoBallLight.intensity = 0;
        
        // Hide lasers
        this.lasers.forEach(l => l.mesh.visible = false);
        
        // Hide confetti
        this.confetti.visible = false;
    }
    
    update(time, delta) {
        if (!this.isActive) return;
        
        const elapsed = Date.now() - this.startTime;
        const progress = elapsed / CELEBRATION_DURATION;
        
        // Rotate disco ball
        if (this.discoBall) {
            this.discoBall.rotation.y += delta * 2;
        }
        
        // Animate lasers
        this.lasers.forEach((laser, i) => {
            laser.mesh.rotation.x += delta * laser.speedX;
            laser.mesh.rotation.z = Math.sin(time * 0.001 + laser.phase) * 0.5 + (i / LASER_COUNT) * Math.PI * 2;
            
            // Pulse opacity
            laser.mesh.material.opacity = 0.5 + Math.sin(time * 0.005 + laser.phase) * 0.3;
        });
        
        // Animate confetti falling
        const positions = this.confetti.geometry.attributes.position.array;
        
        for (let i = 0; i < CONFETTI_COUNT; i++) {
            const data = this.confettiData[i];
            
            // Update position
            positions[i * 3] += data.vx * delta;
            positions[i * 3 + 1] += data.vy * delta;
            positions[i * 3 + 2] += data.vz * delta;
            
            // Add swaying motion
            positions[i * 3] += Math.sin(time * 0.003 + i) * 0.02;
            positions[i * 3 + 2] += Math.cos(time * 0.003 + i) * 0.02;
            
            // Reset if fallen below floor
            if (positions[i * 3 + 1] < 0) {
                positions[i * 3] = Math.random() * this.roomWidth;
                positions[i * 3 + 1] = this.roomHeight + Math.random() * 3;
                positions[i * 3 + 2] = Math.random() * this.roomDepth;
            }
            
            // Keep in bounds
            positions[i * 3] = Math.max(0, Math.min(this.roomWidth, positions[i * 3]));
            positions[i * 3 + 2] = Math.max(0, Math.min(this.roomDepth, positions[i * 3 + 2]));
        }
        
        this.confetti.geometry.attributes.position.needsUpdate = true;
        
        // Pulse disco ball light
        this.discoBallLight.intensity = 2 + Math.sin(time * 0.01) * 1;
        
        // Color cycle disco ball light
        const hue = (time * 0.0005) % 1;
        this.discoBallLight.color.setHSL(hue, 1, 0.5);
        
        // Fade out near end
        if (progress > 0.8) {
            const fadeProgress = (progress - 0.8) / 0.2;
            this.confetti.material.opacity = 0.9 * (1 - fadeProgress);
            this.lasers.forEach(l => {
                l.mesh.material.opacity *= (1 - fadeProgress * 0.5);
            });
        }
    }
    
    cleanup() {
        // Remove all objects from scene
        if (this.discoBallGroup) {
            this.scene.remove(this.discoBallGroup);
        }
        if (this.discoBallLight) {
            this.scene.remove(this.discoBallLight);
        }
        if (this.confetti) {
            this.scene.remove(this.confetti);
            if (this.confetti.geometry) this.confetti.geometry.dispose();
            if (this.confetti.material) this.confetti.material.dispose();
        }
        
        // Dispose laser meshes (cloned materials)
        this.lasers.forEach(l => {
            this.scene.remove(l.mesh);
            if (l.mesh.material) l.mesh.material.dispose();
        });
        
        // Dispose shared laser geometry
        if (this.sharedLaserGeometry) {
            this.sharedLaserGeometry.dispose();
            this.sharedLaserGeometry = null;
        }
        
        // Dispose cached base materials
        if (this.laserMaterialCache) {
            this.laserMaterialCache.forEach(mat => mat.dispose());
            this.laserMaterialCache.clear();
        }
    }
}

export default JackpotCelebration;

