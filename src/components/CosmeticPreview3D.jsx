/**
 * CosmeticPreview3D - Interactive 3D preview of a single cosmetic item
 * 
 * Renders voxel cosmetics in a canvas with live rotation and interaction.
 * 
 * NOTE: Each instance creates its own WebGL context (browsers limit to ~8-16).
 * Use CosmeticThumbnail for grid views with many items!
 * This component should only be used for single detail views (e.g., selected item panel).
 */

import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { ASSETS } from '../assets';

// Shared geometry for all voxels
const VOXEL_SIZE = 0.12;
const sharedGeometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);

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
 * Get voxel data for a cosmetic by templateId or assetKey
 */
function getCosmeticVoxels(templateId, category) {
    // Parse templateId format: "category_assetKey" or just "assetKey"
    let assetKey = templateId;
    let cat = category;
    
    if (templateId?.includes('_')) {
        const parts = templateId.split('_');
        cat = parts[0];
        assetKey = parts.slice(1).join('_');
    }
    
    // Get from ASSETS based on category
    const categoryMap = {
        hat: ASSETS.HATS,
        eyes: ASSETS.EYES,
        mouth: ASSETS.MOUTH,
        bodyItem: ASSETS.BODY,
        mount: ASSETS.MOUNTS,
        skin: null // Skins are just colors, not voxels
    };
    
    const assetCategory = categoryMap[cat];
    if (!assetCategory) return [];
    
    const assetData = assetCategory[assetKey];
    if (!assetData) return [];
    
    // Handle objects with voxels property vs direct arrays
    if (Array.isArray(assetData)) {
        return assetData;
    } else if (assetData.voxels) {
        return assetData.voxels;
    }
    
    return [];
}

/**
 * Build an instanced mesh from voxel data (efficient batching by color)
 */
function buildVoxelMesh(voxels, THREE_ref) {
    if (!voxels || voxels.length === 0) return null;
    
    const group = new THREE_ref.Group();
    
    // Batch by color for instanced rendering
    const colorBatches = {};
    voxels.forEach(v => {
        const color = PALETTE[v.c] || v.c || '#888888';
        if (!colorBatches[color]) colorBatches[color] = [];
        colorBatches[color].push(v);
    });
    
    // Create instanced mesh for each color
    Object.entries(colorBatches).forEach(([color, voxelList]) => {
        const material = new THREE_ref.MeshStandardMaterial({
            color: new THREE_ref.Color(color),
            roughness: 0.4,
            metalness: 0.1
        });
        
        const instancedMesh = new THREE_ref.InstancedMesh(
            sharedGeometry,
            material,
            voxelList.length
        );
        
        const dummy = new THREE_ref.Object3D();
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
 * Calculate bounding box center for centering the item
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

const CosmeticPreview3D = ({ 
    templateId, 
    category,
    rarity = 'common',
    isHolographic = false,
    size = 80, // Canvas size in pixels
    autoRotate = true,
    interactive = true,
    className = ''
}) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const meshRef = useRef(null);
    const animationRef = useRef(null);
    const isDraggingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const rotationRef = useRef({ x: 0, y: 0 });
    
    // Get voxel data
    const voxels = useMemo(() => {
        return getCosmeticVoxels(templateId, category);
    }, [templateId, category]);
    
    // Initialize Three.js scene
    useEffect(() => {
        if (!containerRef.current || voxels.length === 0) return;
        
        // Scene
        const scene = new THREE.Scene();
        scene.background = null; // Transparent
        sceneRef.current = scene;
        
        // Renderer
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            powerPreference: 'low-power'
        });
        renderer.setSize(size, size);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        rendererRef.current = renderer;
        
        // Clear existing canvas
        if (canvasRef.current) {
            containerRef.current.removeChild(canvasRef.current);
        }
        containerRef.current.appendChild(renderer.domElement);
        canvasRef.current = renderer.domElement;
        
        // Camera
        const cameraDistance = calculateCameraDistance(voxels);
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(cameraDistance * 0.7, cameraDistance * 0.5, cameraDistance * 0.7);
        cameraRef.current = camera;
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        scene.add(directionalLight);
        
        // Add rarity glow light if applicable
        const glowColor = RARITY_GLOW[rarity];
        if (glowColor || isHolographic) {
            const glowLight = new THREE.PointLight(
                isHolographic ? '#FF69B4' : glowColor, 
                isHolographic ? 1.5 : 0.8, 
                3
            );
            glowLight.position.set(0, 0, 0);
            scene.add(glowLight);
        }
        
        // Build mesh
        const mesh = buildVoxelMesh(voxels, THREE);
        if (mesh) {
            // Center the mesh
            const center = calculateCenter(voxels);
            mesh.position.set(-center.x, -center.y, -center.z);
            
            // Create container for rotation
            const container = new THREE.Group();
            container.add(mesh);
            scene.add(container);
            meshRef.current = container;
            
            camera.lookAt(0, 0, 0);
        }
        
        // Animation loop
        let time = 0;
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);
            time += 0.016;
            
            if (meshRef.current) {
                if (autoRotate && !isDraggingRef.current) {
                    meshRef.current.rotation.y += 0.01;
                } else {
                    meshRef.current.rotation.y = rotationRef.current.y;
                    meshRef.current.rotation.x = rotationRef.current.x;
                }
                
                // Holographic shimmer effect
                if (isHolographic) {
                    meshRef.current.traverse(obj => {
                        if (obj.isMesh && obj.material) {
                            obj.material.emissive = new THREE.Color().setHSL(
                                (time * 0.5) % 1, 0.5, 0.2
                            );
                        }
                    });
                }
            }
            
            renderer.render(scene, camera);
        };
        animate();
        
        // Cleanup - CRITICAL: Must forcefully release WebGL context
        return () => {
            // Stop animation loop first
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            
            // Dispose all scene objects
            if (sceneRef.current) {
                sceneRef.current.traverse(obj => {
                    if (obj.geometry) obj.geometry.dispose();
                    if (obj.material) {
                        if (Array.isArray(obj.material)) {
                            obj.material.forEach(m => m.dispose());
                        } else {
                            obj.material.dispose();
                        }
                    }
                });
                sceneRef.current = null;
            }
            
            // Dispose renderer and FORCE context loss
            if (rendererRef.current) {
                rendererRef.current.dispose();
                
                // Forcefully lose the WebGL context to free it immediately
                const gl = rendererRef.current.getContext();
                if (gl) {
                    const loseContext = gl.getExtension('WEBGL_lose_context');
                    if (loseContext) {
                        loseContext.loseContext();
                    }
                }
                
                // Remove canvas from DOM
                if (rendererRef.current.domElement && rendererRef.current.domElement.parentNode) {
                    rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
                }
                
                rendererRef.current = null;
            }
            
            canvasRef.current = null;
            meshRef.current = null;
            cameraRef.current = null;
        };
    }, [voxels, size, rarity, isHolographic, autoRotate]);
    
    // Mouse interaction for rotation
    const handleMouseDown = useCallback((e) => {
        if (!interactive) return;
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }, [interactive]);
    
    const handleMouseMove = useCallback((e) => {
        if (!isDraggingRef.current || !interactive) return;
        
        const deltaX = e.clientX - lastMouseRef.current.x;
        const deltaY = e.clientY - lastMouseRef.current.y;
        
        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x += deltaY * 0.01;
        rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
        
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }, [interactive]);
    
    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);
    
    // Touch interaction
    const handleTouchStart = useCallback((e) => {
        if (!interactive) return;
        isDraggingRef.current = true;
        const touch = e.touches[0];
        lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
    }, [interactive]);
    
    const handleTouchMove = useCallback((e) => {
        if (!isDraggingRef.current || !interactive) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - lastMouseRef.current.x;
        const deltaY = touch.clientY - lastMouseRef.current.y;
        
        rotationRef.current.y += deltaX * 0.01;
        rotationRef.current.x += deltaY * 0.01;
        rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
        
        lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
    }, [interactive]);
    
    // Empty state for items with no voxels (like skins)
    if (voxels.length === 0) {
        // For skins, show a colored sphere
        if (category === 'skin') {
            // Extract color from templateId (e.g., "skin_lime" -> "lime")
            const colorKey = templateId?.replace('skin_', '') || 'blue';
            const skinColor = PALETTE[colorKey] || colorKey || '#4169E1';
            
            return (
                <div 
                    className={`flex items-center justify-center bg-black/20 rounded ${className}`}
                    style={{ width: size, height: size }}
                >
                    <div
                        className="rounded-full shadow-lg"
                        style={{ 
                            width: size * 0.6, 
                            height: size * 0.6, 
                            backgroundColor: skinColor,
                            boxShadow: `0 0 ${size * 0.2}px ${skinColor}40, inset 0 -${size * 0.1}px ${size * 0.2}px rgba(0,0,0,0.3)`
                        }}
                    />
                </div>
            );
        }
        
        return (
            <div 
                className={`flex items-center justify-center bg-black/20 rounded ${className}`}
                style={{ width: size, height: size }}
            >
                <span className="text-2xl opacity-50">❓</span>
            </div>
        );
    }
    
    return (
        <div
            ref={containerRef}
            className={`relative cursor-grab active:cursor-grabbing ${className}`}
            style={{ width: size, height: size }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
        />
    );
};

export default CosmeticPreview3D;

