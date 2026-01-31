/**
 * NFTPhotoBooth - Capture a photo of your penguin for NFT minting
 * Shows a 3D preview of the penguin with the cosmetic equipped
 * and allows the user to capture an image for their NFT
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { VOXEL_SIZE, PALETTE } from '../constants';
import { generateBaseBody, generateFlippers, generateFeet, generateHead } from '../generators';
import { ASSETS } from '../assets/index';
import { 
    DoginalGenerators,
    generateDogPalette,
    FrogGenerators,
    generateFrogPalette,
    MarcusGenerators,
    MARCUS_PALETTE,
    WhiteWhaleGenerators,
    WHITE_WHALE_PALETTE,
    BlackWhaleGenerators,
    BLACK_WHALE_PALETTE,
    SilverWhaleGenerators,
    SILVER_WHALE_PALETTE,
    GoldWhaleGenerators,
    GOLD_WHALE_PALETTE,
    ShrimpGenerators,
    generateShrimpPalette,
    DuckGenerators,
    DUCK_PALETTE,
    TungTungGenerators,
    TUNG_PALETTE,
    GakeGenerators,
    GAKE_PALETTE,
    PumpGenerators,
    PUMP_PALETTE
} from '../characters';

// Color palette for penguin skins (same as PenguinPreview3D)
const SKIN_COLORS = {
    blue: { color: '#3B82F6', highlight: '#60A5FA', shadow: '#2563EB' },
    red: { color: '#EF4444', highlight: '#F87171', shadow: '#DC2626' },
    green: { color: '#22C55E', highlight: '#4ADE80', shadow: '#16A34A' },
    yellow: { color: '#EAB308', highlight: '#FACC15', shadow: '#CA8A04' },
    pink: { color: '#EC4899', highlight: '#F472B6', shadow: '#DB2777' },
    purple: { color: '#A855F7', highlight: '#C084FC', shadow: '#9333EA' },
    orange: { color: '#F97316', highlight: '#FB923C', shadow: '#EA580C' },
    black: { color: '#374151', highlight: '#4B5563', shadow: '#1F2937' },
    white: { color: '#F3F4F6', highlight: '#FFFFFF', shadow: '#D1D5DB' },
    cyan: { color: '#06B6D4', highlight: '#22D3EE', shadow: '#0891B2' },
    teal: { color: '#14B8A6', highlight: '#2DD4BF', shadow: '#0D9488' },
    gold: { color: '#F59E0B', highlight: '#FBBF24', shadow: '#D97706' },
    cosmic: { color: '#0B0B45', highlight: '#3d1a6e', shadow: '#1a0a3e' },
    galaxy: { color: '#1A0533', highlight: '#2a1055', shadow: '#0a1628' },
    rainbow: { color: '#ff0000', highlight: '#ff8800', shadow: '#ffff00' },
    prismatic: { color: '#ff00ff', highlight: '#00ffff', shadow: '#ffff00' },
    nebula: { color: '#9932CC', highlight: '#8A2BE2', shadow: '#4B0082' },
    lava: { color: '#FF4500', highlight: '#FF6600', shadow: '#CC3300' },
    ocean: { color: '#006994', highlight: '#00B4D8', shadow: '#0077B6' },
    sunset: { color: '#FF6B35', highlight: '#FF5E78', shadow: '#C71585' },
    frost: { color: '#E0FFFF', highlight: '#87CEEB', shadow: '#ADD8E6' },
    matrix: { color: '#00FF00', highlight: '#00CC00', shadow: '#003300' },
    glitch: { color: '#FF0000', highlight: '#00FF00', shadow: '#0000FF' },
    chromatic: { color: '#C0C0C0', highlight: '#D4AF37', shadow: '#E6E6FA' },
    holographic: { color: '#FF69B4', highlight: '#00CED1', shadow: '#FFD700' },
};

const NFTPhotoBooth = ({ 
    appearance, 
    item,
    onCapture, 
    onClose,
    isOpen
}) => {
    const mountRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const penguinGroupRef = useRef(null);
    const animationRef = useRef(null);
    const rotationRef = useRef(0); // Use ref to persist rotation across rebuilds
    const zoomRef = useRef(12);    // Use ref to persist zoom
    const [capturedImage, setCapturedImage] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [, forceUpdate] = useState(0); // For UI updates only
    
    const size = 400;
    
    // Capture the current canvas as an image
    const captureImage = useCallback(() => {
        if (!rendererRef.current) return;
        
        setIsCapturing(true);
        
        // Render one clean frame
        if (sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
        
        // Get the image data from canvas
        const canvas = rendererRef.current.domElement;
        const imageData = canvas.toDataURL('image/png');
        
        setCapturedImage(imageData);
        setIsCapturing(false);
    }, []);
    
    // Confirm and send the captured image
    const confirmCapture = useCallback(() => {
        if (capturedImage && onCapture) {
            onCapture(capturedImage);
        }
    }, [capturedImage, onCapture]);
    
    // Retake photo
    const retake = useCallback(() => {
        setCapturedImage(null);
    }, []);
    
    // Rotate penguin - uses ref to persist across rebuilds
    const handleRotate = useCallback((direction) => {
        if (penguinGroupRef.current) {
            rotationRef.current += direction * Math.PI / 4;
            penguinGroupRef.current.rotation.y = rotationRef.current;
            forceUpdate(n => n + 1); // Trigger re-render for UI feedback
        }
    }, []);
    
    // Zoom in/out - uses ref to persist across rebuilds
    const handleZoom = useCallback((direction) => {
        const newZoom = Math.max(6, Math.min(20, zoomRef.current + (direction * 2)));
        zoomRef.current = newZoom;
        if (cameraRef.current) {
            cameraRef.current.position.z = newZoom;
        }
        forceUpdate(n => n + 1); // Trigger re-render for UI feedback
    }, []);
    
    useEffect(() => {
        if (!isOpen || !mountRef.current) return;
        
        const THREE = window.THREE;
        if (!THREE) return;
        
        // Create scene
        const scene = new THREE.Scene();
        sceneRef.current = scene;
        
        // Add gradient background
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = 512;
        bgCanvas.height = 512;
        const ctx = bgCanvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#1a1a3e');
        gradient.addColorStop(0.5, '#2d1b4e');
        gradient.addColorStop(1, '#1a2a3e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        const bgTexture = new THREE.CanvasTexture(bgCanvas);
        scene.background = bgTexture;
        
        // Camera - use ref for zoom to persist across rebuilds
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.set(0, 4, zoomRef.current);
        camera.lookAt(0, 1, 0);
        cameraRef.current = camera;
        
        // Renderer with preserveDrawingBuffer for screenshots
        const renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: false,
            preserveDrawingBuffer: true
        });
        renderer.setSize(size, size);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Clear any existing canvas
        while (mountRef.current.firstChild) {
            mountRef.current.removeChild(mountRef.current.firstChild);
        }
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
        keyLight.position.set(5, 10, 7);
        scene.add(keyLight);
        
        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
        fillLight.position.set(-5, 5, -5);
        scene.add(fillLight);
        
        // Create penguin group
        const penguinGroup = new THREE.Group();
        penguinGroupRef.current = penguinGroup;
        scene.add(penguinGroup);
        
        // Build penguin with current appearance + item equipped
        const fullAppearance = { ...appearance };
        if (item) {
            const categoryToKey = {
                hat: 'hat',
                bodyItem: 'bodyItem',
                eyes: 'eyes',
                mouth: 'mouth',
                mount: 'mount'
            };
            const key = categoryToKey[item.category];
            if (key) {
                fullAppearance[key] = item.assetKey;
            }
        }
        
        buildPenguin(THREE, penguinGroup, fullAppearance);
        
        // Apply stored rotation (persists across rebuilds)
        penguinGroup.rotation.y = rotationRef.current;
        
        // Animation loop
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate);
            renderer.render(scene, camera);
        };
        animate();
        
        // Cleanup
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
            if (mountRef.current) {
                while (mountRef.current.firstChild) {
                    mountRef.current.removeChild(mountRef.current.firstChild);
                }
            }
        };
    }, [isOpen, appearance, item]); // Don't include zoom - handled via ref
    
    if (!isOpen) return null;
    
    // Use portal to render at document body level, escaping any parent event handlers
    return createPortal(
        <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center p-4"
            style={{ zIndex: 99999 }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >
            {/* Backdrop - click to close */}
            <div 
                className="absolute inset-0" 
                onClick={onClose}
            />
            
            {/* Modal content */}
            <div 
                className="relative bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 rounded-2xl border border-purple-500/30 max-w-lg w-full overflow-hidden shadow-2xl"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-pink-900/50">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📸</span>
                        <div>
                            <h2 className="font-bold text-white text-lg">NFT Photo Booth</h2>
                            <p className="text-white/60 text-sm">Capture your penguin for the NFT image</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white text-xl p-2"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Preview/Captured Image */}
                <div className="p-4 flex flex-col items-center gap-4">
                    {capturedImage ? (
                        // Show captured image
                        <div className="relative">
                            <img 
                                src={capturedImage} 
                                alt="Captured NFT preview" 
                                className="rounded-xl border-2 border-purple-500/50"
                                style={{ width: size, height: size }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 hover:opacity-100 transition-opacity">
                                <span className="text-white text-lg font-bold">Preview</span>
                            </div>
                        </div>
                    ) : (
                        // Show live 3D preview
                        <>
                            <div 
                                ref={mountRef}
                                className="rounded-xl border-2 border-purple-500/50 overflow-hidden"
                                style={{ width: size, height: size }}
                            />
                            
                            {/* Controls */}
                            <div className="flex items-center gap-4">
                                {/* Rotation controls */}
                                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                                    <button
                                        onClick={() => handleRotate(-1)}
                                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                    >
                                        ←
                                    </button>
                                    <span className="text-white/60 text-sm">Rotate</span>
                                    <button
                                        onClick={() => handleRotate(1)}
                                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                    >
                                        →
                                    </button>
                                </div>
                                
                                {/* Zoom controls */}
                                <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                                    <button
                                        onClick={() => handleZoom(1)}
                                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                    >
                                        −
                                    </button>
                                    <span className="text-white/60 text-sm">Zoom</span>
                                    <button
                                        onClick={() => handleZoom(-1)}
                                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    
                    {/* Item being minted */}
                    <div className="w-full bg-black/30 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/50 to-pink-600/50 flex items-center justify-center text-2xl">
                            🎨
                        </div>
                        <div>
                            <div className="text-white font-bold">{item?.name || 'Cosmetic'}</div>
                            <div className="text-white/50 text-sm">#{item?.serialNumber || 1}</div>
                        </div>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="p-4 border-t border-white/10 flex gap-3">
                    {capturedImage ? (
                        <>
                            <button
                                onClick={retake}
                                className="flex-1 py-3 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
                            >
                                🔄 Retake
                            </button>
                            <button
                                onClick={confirmCapture}
                                className="flex-1 py-3 rounded-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white transition-all flex items-center justify-center gap-2"
                            >
                                ✓ Use This Photo
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={captureImage}
                                disabled={isCapturing}
                                className="flex-1 py-3 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isCapturing ? '📷 Capturing...' : '📷 Take Photo'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// ==================== PENGUIN BUILDING (from PenguinPreview3D) ====================

function buildPenguin(THREE, group, appearance) {
    // Validate appearance object
    if (!appearance || typeof appearance !== 'object') {
        console.warn('buildPenguin: Invalid appearance object, using defaults');
        appearance = {};
    }
    
    // Clear existing
    while (group.children.length > 0) {
        const child = group.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        group.remove(child);
    }
    
    // Normalize character type
    let characterType = appearance.characterType || 'penguin';
    if (characterType === 'white_whale') characterType = 'whiteWhale';
    else if (characterType === 'black_whale') characterType = 'blackWhale';
    else if (characterType === 'silver_whale') characterType = 'silverWhale';
    else if (characterType === 'gold_whale') characterType = 'goldWhale';
    
    const skinName = appearance.skin || 'blue';
    const skinColor = SKIN_COLORS[skinName] || SKIN_COLORS.blue;
    
    let voxels = [];
    let characterPalette = null;
    
    // Generate voxels based on character type
    if (characterType === 'penguin') {
        characterPalette = {
            main: skinColor.color,
            mainLight: skinColor.highlight,
            mainDark: skinColor.shadow,
            belly: '#FFFFFF',
            bellyShade: '#E5E5E5',
            beak: '#FFB347',
            beakDark: '#FF8C00',
            feet: '#FFB347',
            feetDark: '#FF8C00'
        };
        
        voxels = [
            ...generateBaseBody(characterPalette.main),
            ...generateHead(characterPalette.main),
            ...generateFlippers(characterPalette.main, true),  // Left flipper
            ...generateFlippers(characterPalette.main, false), // Right flipper
            ...generateFeet()
        ];
    } else if (characterType === 'doginal') {
        characterPalette = generateDogPalette(
            appearance.dogPrimaryColor || '#D2691E',
            appearance.dogSecondaryColor || '#8B4513'
        );
        voxels = [
            ...DoginalGenerators.head(),
            ...DoginalGenerators.body(),
            ...DoginalGenerators.armLeft(),
            ...DoginalGenerators.armRight(),
            ...DoginalGenerators.legLeft(),
            ...DoginalGenerators.legRight(),
            ...DoginalGenerators.tail(),
            ...DoginalGenerators.earLeft(),
            ...DoginalGenerators.earRight()
        ];
        
        // Doginal ALWAYS wears wizard hat
        const doginalHat = ASSETS.HATS['wizardHat'] || [];
        if (doginalHat.length > 0) {
            const offsetHatVoxels = doginalHat.map(v => ({ ...v, y: v.y + 3, z: v.z + 3 }));
            voxels = [...voxels, ...offsetHatVoxels];
        }
    } else if (characterType === 'frog') {
        characterPalette = generateFrogPalette(
            appearance.frogPrimaryColor || '#6B8E23',
            appearance.frogSecondaryColor || '#556B2F'
        );
        voxels = [
            ...FrogGenerators.head(),
            ...FrogGenerators.body(),
            ...FrogGenerators.flipperLeft(),
            ...FrogGenerators.flipperRight(),
            ...FrogGenerators.footLeft(),
            ...FrogGenerators.footRight()
        ];
    } else if (characterType === 'shrimp') {
        characterPalette = generateShrimpPalette(appearance.shrimpPrimaryColor || '#FF6B4A');
        voxels = [
            ...ShrimpGenerators.head(),
            ...ShrimpGenerators.body(),
            ...ShrimpGenerators.flipperLeft(),
            ...ShrimpGenerators.flipperRight(),
            ...ShrimpGenerators.tail(),
            ...ShrimpGenerators.legs()
        ];
    } else if (characterType === 'duck') {
        characterPalette = DUCK_PALETTE;
        voxels = [
            ...DuckGenerators.head(),
            ...DuckGenerators.body(),
            ...DuckGenerators.armLeft(),
            ...DuckGenerators.armRight(),
            ...DuckGenerators.legLeft(),
            ...DuckGenerators.legRight(),
            ...DuckGenerators.tail()
        ];
    } else if (characterType === 'tungTung') {
        characterPalette = TUNG_PALETTE;
        voxels = [
            ...TungTungGenerators.head(),
            ...TungTungGenerators.body(),
            ...TungTungGenerators.armLeft(),
            ...TungTungGenerators.armRight(),
            ...TungTungGenerators.legLeft(),
            ...TungTungGenerators.legRight()
        ];
    } else if (characterType === 'gake') {
        characterPalette = GAKE_PALETTE;
        voxels = [
            ...GakeGenerators.head(),
            ...GakeGenerators.body(),
            ...GakeGenerators.armLeft(),
            ...GakeGenerators.armRight(),
            ...GakeGenerators.footLeft(),
            ...GakeGenerators.footRight()
        ];
    } else if (characterType === 'pump') {
        characterPalette = PUMP_PALETTE;
        voxels = [
            ...PumpGenerators.head(),
            ...PumpGenerators.body(),
            ...PumpGenerators.armLeft(),
            ...PumpGenerators.armRight(),
            ...PumpGenerators.footLeft(),
            ...PumpGenerators.footRight()
        ];
        
        // Add eyes with offset for pump head
        const PUMP_FACE_OFFSET = 5;
        const pumpEyes = appearance.eyes && appearance.eyes !== 'none' ? ASSETS.EYES[appearance.eyes] : ASSETS.EYES['normal'];
        if (pumpEyes) {
            voxels = [...voxels, ...pumpEyes.map(v => ({ ...v, y: v.y + PUMP_FACE_OFFSET, z: v.z + 2 }))];
        }
        
        const pumpMouth = appearance.mouth && appearance.mouth !== 'none' ? ASSETS.MOUTH[appearance.mouth] : ASSETS.MOUTH['beak'];
        if (pumpMouth) {
            voxels = [...voxels, ...pumpMouth.map(v => ({ ...v, y: v.y + PUMP_FACE_OFFSET, z: v.z + 2 }))];
        }
    } else if (characterType === 'marcus') {
        characterPalette = MARCUS_PALETTE;
        voxels = [
            ...MarcusGenerators.generateMarcusBody(MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusHead(MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusFlipper(true, MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusFlipper(false, MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusFoot(true, MARCUS_PALETTE),
            ...MarcusGenerators.generateMarcusFoot(false, MARCUS_PALETTE)
        ];
    } else if (characterType === 'whiteWhale' || characterType === 'white_whale') {
        characterPalette = WHITE_WHALE_PALETTE;
        voxels = [
            ...WhiteWhaleGenerators.generateWhaleBody(WHITE_WHALE_PALETTE),
            ...WhiteWhaleGenerators.generateWhaleHead(WHITE_WHALE_PALETTE),
            ...WhiteWhaleGenerators.generateWhaleFlipper(true, WHITE_WHALE_PALETTE),
            ...WhiteWhaleGenerators.generateWhaleFlipper(false, WHITE_WHALE_PALETTE),
            ...WhiteWhaleGenerators.generateWhaleTail(WHITE_WHALE_PALETTE)
        ];
    } else if (characterType === 'blackWhale' || characterType === 'black_whale') {
        characterPalette = BLACK_WHALE_PALETTE;
        voxels = [
            ...BlackWhaleGenerators.generateWhaleBody(BLACK_WHALE_PALETTE),
            ...BlackWhaleGenerators.generateWhaleHead(BLACK_WHALE_PALETTE),
            ...BlackWhaleGenerators.generateWhaleFlipper(true, BLACK_WHALE_PALETTE),
            ...BlackWhaleGenerators.generateWhaleFlipper(false, BLACK_WHALE_PALETTE),
            ...BlackWhaleGenerators.generateWhaleTail(BLACK_WHALE_PALETTE)
        ];
    } else if (characterType === 'silverWhale' || characterType === 'silver_whale') {
        characterPalette = SILVER_WHALE_PALETTE;
        voxels = [
            ...SilverWhaleGenerators.generateWhaleBody(SILVER_WHALE_PALETTE),
            ...SilverWhaleGenerators.generateWhaleHead(SILVER_WHALE_PALETTE),
            ...SilverWhaleGenerators.generateWhaleFlipper(true, SILVER_WHALE_PALETTE),
            ...SilverWhaleGenerators.generateWhaleFlipper(false, SILVER_WHALE_PALETTE),
            ...SilverWhaleGenerators.generateWhaleTail(SILVER_WHALE_PALETTE)
        ];
    } else if (characterType === 'goldWhale' || characterType === 'gold_whale') {
        characterPalette = GOLD_WHALE_PALETTE;
        voxels = [
            ...GoldWhaleGenerators.generateWhaleBody(GOLD_WHALE_PALETTE),
            ...GoldWhaleGenerators.generateWhaleHead(GOLD_WHALE_PALETTE),
            ...GoldWhaleGenerators.generateWhaleFlipper(true, GOLD_WHALE_PALETTE),
            ...GoldWhaleGenerators.generateWhaleFlipper(false, GOLD_WHALE_PALETTE),
            ...GoldWhaleGenerators.generateWhaleTail(GOLD_WHALE_PALETTE)
        ];
    } else {
        // Default to penguin
        characterPalette = {
            main: skinColor.color,
            mainLight: skinColor.highlight,
            mainDark: skinColor.shadow,
            belly: '#FFFFFF',
            bellyShade: '#E5E5E5',
            beak: '#FFB347',
            beakDark: '#FF8C00',
            feet: '#FFB347',
            feetDark: '#FF8C00'
        };
        
        voxels = [
            ...generateBaseBody(characterPalette.main),
            ...generateHead(characterPalette.main),
            ...generateFlippers(characterPalette.main, true),
            ...generateFlippers(characterPalette.main, false),
            ...generateFeet()
        ];
    }
    
    // Create voxel mesh
    const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    
    // Group voxels by color for instancing
    const colorGroups = new Map();
    
    voxels.forEach(v => {
        let color = v.c;
        // Resolve palette color names to hex
        if (typeof color === 'string' && !color.startsWith('#')) {
            if (characterPalette) {
                color = characterPalette[color] || color;
            } else if (characterType === 'penguin') {
                const palette = {
                    main: skinColor.color,
                    mainLight: skinColor.highlight,
                    mainDark: skinColor.shadow,
                    belly: '#FFFFFF',
                    bellyShade: '#E5E5E5',
                    beak: '#FFB347',
                    beakDark: '#FF8C00',
                    feet: '#FFB347',
                    feetDark: '#FF8C00'
                };
                color = palette[color] || skinColor.color;
            } else {
                color = skinColor.color;
            }
        }
        
        if (!colorGroups.has(color)) {
            colorGroups.set(color, []);
        }
        colorGroups.get(color).push(v);
    });
    
    // Create meshes for each color group
    colorGroups.forEach((voxelList, color) => {
        const material = new THREE.MeshLambertMaterial({ color: color });
        
        voxelList.forEach(v => {
            const mesh = new THREE.Mesh(boxGeo, material);
            mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
            group.add(mesh);
        });
    });
    
    // Add cosmetics
    addCosmetics(THREE, group, appearance, characterType, characterPalette || skinColor);
    
    // Add mount
    addMount(THREE, group, appearance);
}

// Add cosmetics to the penguin
function addCosmetics(THREE, group, appearance, characterType, paletteOrSkinColor) {
    const cosmeticsPalette = (paletteOrSkinColor && typeof paletteOrSkinColor === 'object' && !paletteOrSkinColor.color) 
        ? paletteOrSkinColor 
        : PALETTE;
    
    // Add hat
    if (appearance.hat && appearance.hat !== 'none' && ASSETS.HATS && ASSETS.HATS[appearance.hat]) {
        let hatVoxels = ASSETS.HATS[appearance.hat];
        if (hatVoxels && hatVoxels.length > 0) {
            if (characterType === 'gake') {
                hatVoxels = hatVoxels.map(v => ({ ...v, y: v.y + 2 }));
            }
            const hatGroup = buildVoxelGroup(THREE, hatVoxels, cosmeticsPalette);
            hatGroup.name = 'hat';
            group.add(hatGroup);
        }
    }
    
    // Add eyes
    const eyesKey = appearance.eyes && ASSETS.EYES && ASSETS.EYES[appearance.eyes] ? appearance.eyes : 'normal';
    if (ASSETS.EYES && ASSETS.EYES[eyesKey] && characterType !== 'pump') {
        let eyesVoxels = ASSETS.EYES[eyesKey];
        if (eyesVoxels && eyesVoxels.length > 0) {
            if (characterType === 'tungTung') {
                eyesVoxels = eyesVoxels.map(v => ({ ...v, y: v.y + 21, z: v.z + 1 }));
            }
            if (characterType === 'gake') {
                eyesVoxels = eyesVoxels.map(v => ({ ...v, y: v.y + 2 }));
            }
            const eyesGroup = buildVoxelGroup(THREE, eyesVoxels, cosmeticsPalette);
            eyesGroup.name = 'eyes';
            group.add(eyesGroup);
        }
    }
    
    // Add mouth
    const mouthKey = appearance.mouth && ASSETS.MOUTH && ASSETS.MOUTH[appearance.mouth] ? appearance.mouth : 'beak';
    if (ASSETS.MOUTH && ASSETS.MOUTH[mouthKey] && characterType !== 'pump') {
        let mouthVoxels = ASSETS.MOUTH[mouthKey];
        if (mouthVoxels && mouthVoxels.length > 0) {
            if (characterType === 'tungTung') {
                mouthVoxels = mouthVoxels.map(v => ({ ...v, y: v.y + 21, z: v.z + 1 }));
            }
            if (characterType === 'gake') {
                mouthVoxels = mouthVoxels.map(v => ({ ...v, y: v.y + 2 }));
            }
            const mouthGroup = buildVoxelGroup(THREE, mouthVoxels, cosmeticsPalette);
            mouthGroup.name = 'mouth';
            group.add(mouthGroup);
        }
    }
    
    // Add body item
    if (appearance.bodyItem && appearance.bodyItem !== 'none' && ASSETS.BODY && ASSETS.BODY[appearance.bodyItem]) {
        const bodyItemInfo = ASSETS.BODY[appearance.bodyItem];
        const isHideBodyItem = bodyItemInfo?.hideBody === true;
        
        if (!isHideBodyItem) {
            const bodyVoxels = bodyItemInfo?.voxels || bodyItemInfo || [];
            if (bodyVoxels && bodyVoxels.length > 0) {
                const bodyGroup = buildVoxelGroup(THREE, bodyVoxels, cosmeticsPalette);
                bodyGroup.name = 'bodyItem';
                group.add(bodyGroup);
            }
        }
    }
}

// Add mount to the penguin
function addMount(THREE, group, appearance) {
    if (!appearance.mount || appearance.mount === 'none' || !ASSETS.MOUNTS || !ASSETS.MOUNTS[appearance.mount]) {
        return;
    }
    
    const mountData = ASSETS.MOUNTS[appearance.mount];
    const mountGroup = new THREE.Group();
    mountGroup.name = 'mount';
    
    if (mountData.voxels && mountData.voxels.length > 0) {
        const mountMesh = buildVoxelGroup(THREE, mountData.voxels, PALETTE);
        mountMesh.name = 'mount_hull';
        mountGroup.add(mountMesh);
    }
    
    // Build oars for boat mounts
    if (mountData.leftOar && mountData.leftOar.length > 0) {
        const leftOarMesh = buildVoxelGroup(THREE, mountData.leftOar, PALETTE);
        leftOarMesh.name = 'left_oar';
        mountGroup.add(leftOarMesh);
    }
    
    if (mountData.rightOar && mountData.rightOar.length > 0) {
        const rightOarMesh = buildVoxelGroup(THREE, mountData.rightOar, PALETTE);
        rightOarMesh.name = 'right_oar';
        mountGroup.add(rightOarMesh);
    }
    
    if (mountGroup.children.length > 0) {
        const mountScale = mountData.scale || 0.2;
        mountGroup.scale.set(mountScale, mountScale, mountScale);
        mountGroup.position.y = mountData.positionY ?? 0.4;
        
        if (mountData.mountRotation) {
            mountGroup.rotation.y = mountData.mountRotation;
        }
        
        group.add(mountGroup);
    }
}

// Helper function to build voxel group from voxel array
function buildVoxelGroup(THREE, voxels, palette) {
    const group = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    
    // Group voxels by color
    const colorGroups = new Map();
    
    voxels.forEach(v => {
        let color = v.c;
        // Resolve palette color names to hex
        if (typeof color === 'string' && !color.startsWith('#')) {
            color = palette[color] || color;
        }
        
        if (!colorGroups.has(color)) {
            colorGroups.set(color, []);
        }
        colorGroups.get(color).push(v);
    });
    
    // Create meshes for each color group
    colorGroups.forEach((voxelList, color) => {
        const material = new THREE.MeshLambertMaterial({ color: color });
        
        voxelList.forEach(v => {
            const mesh = new THREE.Mesh(boxGeo, material);
            mesh.position.set(v.x * VOXEL_SIZE, v.y * VOXEL_SIZE, v.z * VOXEL_SIZE);
            group.add(mesh);
        });
    });
    
    return group;
}

export default NFTPhotoBooth;
