/**
 * SceneManager - Initializes and manages Three.js scene, renderer, camera
 */

class SceneManager {
    constructor(THREE) {
        this.THREE = THREE;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = null;
        this.container = null;
    }
    
    /**
     * Initialize the scene
     * @param {HTMLElement} container - DOM element to render into
     * @param {Object} options - Configuration options
     */
    init(container, options = {}) {
        const THREE = this.THREE;
        this.container = container;
        
        const isMobileGPU = options.isMobileGPU || false;
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Camera
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(
            options.fov || 60,
            aspect,
            options.near || 0.1,
            options.far || 500
        );
        this.camera.position.set(0, 15, 25);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: !isMobileGPU,
            powerPreference: isMobileGPU ? 'low-power' : 'high-performance',
        });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(isMobileGPU ? 1 : Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = !isMobileGPU;
        if (!isMobileGPU) {
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        container.appendChild(this.renderer.domElement);
        
        // Clock for delta time
        this.clock = new THREE.Clock();
        
        // Handle resize
        window.addEventListener('resize', this.handleResize);
        
        return this;
    }
    
    /**
     * Setup OrbitControls
     * @param {Object} OrbitControls - OrbitControls class
     * @param {Object} options - Control options
     */
    setupControls(OrbitControls, options = {}) {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.minDistance = options.minDistance || 5;
        this.controls.maxDistance = options.maxDistance || 50;
        this.controls.maxPolarAngle = options.maxPolarAngle || Math.PI * 0.45;
        this.controls.minPolarAngle = options.minPolarAngle || 0.1;
        
        return this.controls;
    }
    
    /**
     * Handle window resize
     */
    handleResize = () => {
        if (!this.container || !this.camera || !this.renderer) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    };
    
    /**
     * Update camera to follow a target
     * @param {THREE.Vector3} targetPos - Position to follow
     * @param {Object} options - { offsetY, smoothing }
     */
    followTarget(targetPos, options = {}) {
        if (!this.controls) return;
        
        const offsetY = options.offsetY || 1;
        const smoothing = options.smoothing || 0.1;
        
        // Smoothly interpolate target position
        this.controls.target.x += (targetPos.x - this.controls.target.x) * smoothing;
        this.controls.target.y += (targetPos.y + offsetY - this.controls.target.y) * smoothing;
        this.controls.target.z += (targetPos.z - this.controls.target.z) * smoothing;
    }
    
    /**
     * Render frame
     */
    render() {
        if (this.controls) {
            this.controls.update();
        }
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Get delta time since last frame
     */
    getDelta() {
        return this.clock.getDelta();
    }
    
    /**
     * Get elapsed time
     */
    getElapsedTime() {
        return this.clock.getElapsedTime();
    }
    
    /**
     * Add object to scene
     */
    add(object) {
        this.scene.add(object);
    }
    
    /**
     * Remove object from scene
     */
    remove(object) {
        this.scene.remove(object);
    }
    
    /**
     * Set fog
     * @param {Object} options - { color, near, far }
     */
    setFog(options = {}) {
        const THREE = this.THREE;
        this.scene.fog = new THREE.Fog(
            options.color || 0xCCDDEE,
            options.near || 50,
            options.far || 150
        );
    }
    
    /**
     * Set background color
     * @param {number|string} color
     */
    setBackground(color) {
        this.scene.background = new this.THREE.Color(color);
    }
    
    /**
     * Cleanup
     */
    dispose() {
        window.removeEventListener('resize', this.handleResize);
        
        if (this.controls) {
            this.controls.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement && this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }
        
        // Cleanup scene objects
        if (this.scene) {
            this.scene.traverse(object => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(m => m.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.clock = null;
    }
}

export default SceneManager;

