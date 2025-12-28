/**
 * CosmeticThumbnailCache - Shared WebGL renderer for generating cosmetic thumbnails
 * 
 * Solves the "Too many active WebGL contexts" problem by using a SINGLE
 * shared renderer to generate static image thumbnails for all cosmetics.
 * 
 * Usage:
 *   import { thumbnailCache } from './CosmeticThumbnailCache';
 *   const imageUrl = await thumbnailCache.getThumbnail(templateId, category, options);
 */

import * as THREE from 'three';
import { ASSETS } from '../assets';

// Shared geometry for all voxels
const VOXEL_SIZE = 0.12;
let sharedGeometry = null;

// Color palette (same as VoxelWorld)
const PALETTE = {
    white: '#FFFFFF', black: '#1a1a1a', blue: '#4169E1', red: '#DC143C',
    green: '#228B22', yellow: '#FFD700', orange: '#FF8C00', pink: '#FF69B4',
    purple: '#8B008B', grey: '#808080', gray: '#808080', brown: '#8B4513',
    gold: '#FFD700', silver: '#C0C0C0', cyan: '#00CED1', magenta: '#FF00FF',
    lime: '#32CD32', teal: '#008080', navy: '#000080', maroon: '#800000',
    olive: '#808000', coral: '#FF7F50', salmon: '#FA8072', lavender: '#E6E6FA',
    tan: '#D2B48C', beige: '#F5F5DC', ivory: '#FFFFF0', peach: '#FFDAB9',
    mint: '#98FF98', sky: '#87CEEB', darkBlue: '#00008B',
};

// Rarity glow colors
const RARITY_GLOW = {
    common: null,
    uncommon: '#22C55E',
    rare: '#3B82F6',
    epic: '#A855F7',
    legendary: '#EC4899',
    mythic: '#EF4444',
    divine: '#F59E0B'
};

/**
 * Get voxel data for a cosmetic by templateId
 */
function getCosmeticVoxels(templateId, category) {
    let assetKey = templateId;
    let cat = category;
    
    if (templateId?.includes('_')) {
        const parts = templateId.split('_');
        cat = parts[0];
        assetKey = parts.slice(1).join('_');
    }
    
    const categoryMap = {
        hat: ASSETS.HATS,
        eyes: ASSETS.EYES,
        mouth: ASSETS.MOUTH,
        bodyItem: ASSETS.BODY,
        mount: ASSETS.MOUNTS,
        skin: null
    };
    
    const assetCategory = categoryMap[cat];
    if (!assetCategory) return [];
    
    const assetData = assetCategory[assetKey];
    if (!assetData) return [];
    
    if (Array.isArray(assetData)) {
        return assetData;
    } else if (assetData.voxels) {
        return assetData.voxels;
    }
    
    return [];
}

/**
 * Build voxel mesh from voxel data
 */
function buildVoxelMesh(voxels) {
    if (!voxels || voxels.length === 0) return null;
    
    if (!sharedGeometry) {
        sharedGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    }
    
    const group = new THREE.Group();
    
    // Batch by color for instanced rendering
    const colorBatches = {};
    voxels.forEach(v => {
        const color = PALETTE[v.c] || v.c || '#888888';
        if (!colorBatches[color]) colorBatches[color] = [];
        colorBatches[color].push(v);
    });
    
    // Create instanced mesh for each color
    Object.entries(colorBatches).forEach(([color, voxelList]) => {
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            roughness: 0.4,
            metalness: 0.1
        });
        
        const instancedMesh = new THREE.InstancedMesh(
            sharedGeometry,
            material,
            voxelList.length
        );
        
        const dummy = new THREE.Object3D();
        voxelList.forEach((v, i) => {
            dummy.position.set(
                v.x * VOXEL_SIZE,
                v.y * VOXEL_SIZE,
                v.z * VOXEL_SIZE
            );
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i, dummy.matrix);
        });
        
        instancedMesh.instanceMatrix.needsUpdate = true;
        group.add(instancedMesh);
    });
    
    return group;
}

/**
 * Calculate bounding box center
 */
function calculateCenter(voxels) {
    if (!voxels || voxels.length === 0) return { x: 0, y: 0, z: 0 };
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    voxels.forEach(v => {
        minX = Math.min(minX, v.x);
        maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y);
        maxY = Math.max(maxY, v.y);
        minZ = Math.min(minZ, v.z);
        maxZ = Math.max(maxZ, v.z);
    });
    
    return {
        x: ((minX + maxX) / 2) * VOXEL_SIZE,
        y: ((minY + maxY) / 2) * VOXEL_SIZE,
        z: ((minZ + maxZ) / 2) * VOXEL_SIZE
    };
}

/**
 * Calculate camera distance based on item size
 */
function calculateCameraDistance(voxels) {
    if (!voxels || voxels.length === 0) return 2;
    
    let maxDist = 0;
    voxels.forEach(v => {
        const dist = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        maxDist = Math.max(maxDist, dist);
    });
    
    return Math.max(1.5, maxDist * VOXEL_SIZE * 2.5);
}

/**
 * CosmeticThumbnailCache class - manages a single shared renderer
 */
class CosmeticThumbnailCache {
    constructor() {
        this.cache = new Map(); // templateId+options -> dataURL
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.lights = [];
        this.renderQueue = [];
        this.isProcessing = false;
        this.initialized = false;
        
        // Default render size
        this.defaultSize = 128;
    }
    
    /**
     * Initialize the shared renderer (lazy initialization)
     */
    _initRenderer() {
        if (this.initialized) return;
        
        // Create off-screen renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true, // Required for toDataURL
            powerPreference: 'low-power'
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        this.scene.add(directionalLight);
        this.lights.push(directionalLight);
        
        this.initialized = true;
    }
    
    /**
     * Generate cache key from parameters
     */
    _getCacheKey(templateId, category, options = {}) {
        const { size = this.defaultSize, rarity = 'common', isHolographic = false, rotation = 0 } = options;
        return `${templateId}_${category}_${size}_${rarity}_${isHolographic}_${rotation}`;
    }
    
    /**
     * Get thumbnail for a cosmetic - returns cached or generates new
     * @param {string} templateId 
     * @param {string} category 
     * @param {Object} options - { size, rarity, isHolographic, rotation }
     * @returns {Promise<string>} - Data URL of the rendered image
     */
    async getThumbnail(templateId, category, options = {}) {
        const cacheKey = this._getCacheKey(templateId, category, options);
        
        // Return cached if available
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        // Queue the render and return promise
        return new Promise((resolve, reject) => {
            this.renderQueue.push({
                templateId,
                category,
                options,
                cacheKey,
                resolve,
                reject
            });
            
            this._processQueue();
        });
    }
    
    /**
     * Check if thumbnail is cached (synchronous)
     */
    hasCached(templateId, category, options = {}) {
        const cacheKey = this._getCacheKey(templateId, category, options);
        return this.cache.has(cacheKey);
    }
    
    /**
     * Get cached thumbnail synchronously (returns null if not cached)
     */
    getCached(templateId, category, options = {}) {
        const cacheKey = this._getCacheKey(templateId, category, options);
        return this.cache.get(cacheKey) || null;
    }
    
    /**
     * Process render queue
     */
    async _processQueue() {
        if (this.isProcessing || this.renderQueue.length === 0) return;
        
        this.isProcessing = true;
        this._initRenderer();
        
        // Process in batches to avoid blocking
        const batchSize = 10;
        
        while (this.renderQueue.length > 0) {
            const batch = this.renderQueue.splice(0, batchSize);
            
            for (const item of batch) {
                try {
                    const dataUrl = this._renderThumbnail(
                        item.templateId,
                        item.category,
                        item.options
                    );
                    this.cache.set(item.cacheKey, dataUrl);
                    item.resolve(dataUrl);
                } catch (error) {
                    console.error('Thumbnail render error:', error);
                    item.reject(error);
                }
            }
            
            // Yield to main thread between batches
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        this.isProcessing = false;
    }
    
    /**
     * Render a single thumbnail (synchronous)
     */
    _renderThumbnail(templateId, category, options = {}) {
        const { 
            size = this.defaultSize, 
            rarity = 'common', 
            isHolographic = false,
            rotation = Math.PI / 6 // Default slight rotation
        } = options;
        
        // Handle skins (just colors, not voxels)
        if (category === 'skin') {
            return this._renderSkinThumbnail(templateId, size);
        }
        
        // Get voxel data
        const voxels = getCosmeticVoxels(templateId, category);
        if (!voxels || voxels.length === 0) {
            return this._renderPlaceholder(size);
        }
        
        // Set renderer size
        this.renderer.setSize(size, size);
        
        // Clear scene of previous meshes (keep lights)
        this.scene.children.forEach(child => {
            if (!this.lights.includes(child)) {
                this.scene.remove(child);
                if (child.traverse) {
                    child.traverse(obj => {
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(m => m.dispose());
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                }
            }
        });
        
        // Rebuild lights list (in case scene was cleared)
        this.scene.children = this.scene.children.filter(c => this.lights.includes(c));
        this.lights.forEach(l => {
            if (!this.scene.children.includes(l)) {
                this.scene.add(l);
            }
        });
        
        // Add rarity glow light
        const glowColor = RARITY_GLOW[rarity];
        if (glowColor || isHolographic) {
            const glowLight = new THREE.PointLight(
                isHolographic ? '#FF69B4' : glowColor,
                isHolographic ? 1.5 : 0.8,
                3
            );
            glowLight.position.set(0, 0, 0);
            this.scene.add(glowLight);
        }
        
        // Build mesh
        const mesh = buildVoxelMesh(voxels);
        if (!mesh) {
            return this._renderPlaceholder(size);
        }
        
        // Center the mesh
        const center = calculateCenter(voxels);
        mesh.position.set(-center.x, -center.y, -center.z);
        
        // Container for rotation
        const container = new THREE.Group();
        container.add(mesh);
        container.rotation.y = rotation;
        this.scene.add(container);
        
        // Position camera
        const cameraDistance = calculateCameraDistance(voxels);
        this.camera.position.set(
            cameraDistance * 0.7,
            cameraDistance * 0.5,
            cameraDistance * 0.7
        );
        this.camera.lookAt(0, 0, 0);
        
        // Apply holographic effect
        if (isHolographic) {
            container.traverse(obj => {
                if (obj.isMesh && obj.material) {
                    obj.material.emissive = new THREE.Color().setHSL(0.8, 0.5, 0.2);
                }
            });
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
        
        // Get data URL
        return this.renderer.domElement.toDataURL('image/png');
    }
    
    /**
     * Render a skin thumbnail (colored circle)
     */
    _renderSkinThumbnail(templateId, size) {
        const colorKey = templateId?.replace('skin_', '') || 'blue';
        const skinColor = PALETTE[colorKey] || colorKey || '#4169E1';
        
        // Create a canvas for skin thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw gradient circle
        const centerX = size / 2;
        const centerY = size / 2;
        const radius = size * 0.35;
        
        // Shadow
        ctx.shadowColor = skinColor + '80';
        ctx.shadowBlur = size * 0.15;
        
        // Main circle with gradient
        const gradient = ctx.createRadialGradient(
            centerX - radius * 0.3, centerY - radius * 0.3, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, this._lightenColor(skinColor, 30));
        gradient.addColorStop(0.7, skinColor);
        gradient.addColorStop(1, this._darkenColor(skinColor, 30));
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        return canvas.toDataURL('image/png');
    }
    
    /**
     * Render placeholder for missing cosmetics
     */
    _renderPlaceholder(size) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, size, size);
        
        ctx.font = `${size * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillText('❓', size / 2, size / 2);
        
        return canvas.toDataURL('image/png');
    }
    
    /**
     * Lighten a hex color
     */
    _lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    
    /**
     * Darken a hex color
     */
    _darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }
    
    /**
     * Preload thumbnails for a list of items
     * @param {Array} items - Array of { templateId, category, rarity, isHolographic }
     * @param {number} size - Thumbnail size
     */
    async preloadThumbnails(items, size = 72) {
        const promises = items.map(item => 
            this.getThumbnail(item.templateId, item.category, {
                size,
                rarity: item.rarity,
                isHolographic: item.isHolographic
            })
        );
        
        await Promise.all(promises);
    }
    
    /**
     * Clear cache (useful for memory management)
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Get cache size
     */
    getCacheSize() {
        return this.cache.size;
    }
    
    /**
     * Dispose of the renderer (call when done with all rendering)
     */
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
            
            const gl = this.renderer.getContext();
            if (gl) {
                const loseContext = gl.getExtension('WEBGL_lose_context');
                if (loseContext) {
                    loseContext.loseContext();
                }
            }
            
            this.renderer = null;
        }
        
        this.cache.clear();
        this.lights = [];
        this.scene = null;
        this.camera = null;
        this.initialized = false;
    }
}

// Export singleton instance
export const thumbnailCache = new CosmeticThumbnailCache();

export default CosmeticThumbnailCache;

