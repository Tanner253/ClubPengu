/**
 * CosmeticThumbnail - Displays cached static images of cosmetics
 * 
 * Uses CosmeticThumbnailCache to render cosmetics once and display as images.
 * This eliminates the need for individual WebGL contexts per item.
 * 
 * For interactive 3D preview, use CosmeticPreview3D instead (e.g., detail panel).
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { thumbnailCache } from './CosmeticThumbnailCache';

// Color palette for skins
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

/**
 * CosmeticThumbnail component
 * 
 * @param {string} templateId - The cosmetic template ID
 * @param {string} category - The category (hat, eyes, mouth, bodyItem, mount, skin)
 * @param {string} rarity - Rarity level for glow effects
 * @param {boolean} isHolographic - Whether item has holographic effect
 * @param {number} size - Size in pixels (default 72)
 * @param {string} className - Additional CSS classes
 */
const CosmeticThumbnail = memo(({ 
    templateId, 
    category,
    rarity = 'common',
    isHolographic = false,
    size = 72,
    className = ''
}) => {
    const [imageUrl, setImageUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const mountedRef = useRef(true);
    
    useEffect(() => {
        mountedRef.current = true;
        
        // Check cache first (synchronous)
        const cached = thumbnailCache.getCached(templateId, category, {
            size,
            rarity,
            isHolographic
        });
        
        if (cached) {
            setImageUrl(cached);
            setLoading(false);
            return;
        }
        
        // Request thumbnail (async)
        setLoading(true);
        setError(false);
        
        thumbnailCache.getThumbnail(templateId, category, {
            size,
            rarity,
            isHolographic
        })
            .then(url => {
                if (mountedRef.current) {
                    setImageUrl(url);
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error('Thumbnail error:', err);
                if (mountedRef.current) {
                    setError(true);
                    setLoading(false);
                }
            });
        
        return () => {
            mountedRef.current = false;
        };
    }, [templateId, category, size, rarity, isHolographic]);
    
    // Loading state
    if (loading) {
        return (
            <div 
                className={`flex items-center justify-center bg-black/20 rounded animate-pulse ${className}`}
                style={{ width: size, height: size }}
            >
                <div 
                    className="rounded bg-white/10"
                    style={{ width: size * 0.6, height: size * 0.6 }}
                />
            </div>
        );
    }
    
    // Error state
    if (error || !imageUrl) {
        // For skins without proper voxels, show colored circle
        if (category === 'skin') {
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
                <span className="text-xl opacity-50">❓</span>
            </div>
        );
    }
    
    // Render cached image
    return (
        <div 
            className={`relative ${className}`}
            style={{ width: size, height: size }}
        >
            <img 
                src={imageUrl}
                alt={templateId}
                className="w-full h-full object-contain"
                style={{ imageRendering: 'auto' }}
                loading="lazy"
                decoding="async"
            />
            
            {/* Holographic shimmer overlay */}
            {isHolographic && (
                <div 
                    className="absolute inset-0 pointer-events-none animate-shimmer"
                    style={{
                        background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)',
                        backgroundSize: '200% 100%',
                    }}
                />
            )}
        </div>
    );
});

CosmeticThumbnail.displayName = 'CosmeticThumbnail';

export default CosmeticThumbnail;

// Add shimmer animation to global styles (or add to your CSS)
const style = document.createElement('style');
style.textContent = `
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
    .animate-shimmer {
        animation: shimmer 3s infinite linear;
    }
`;
if (!document.getElementById('cosmetic-thumbnail-styles')) {
    style.id = 'cosmetic-thumbnail-styles';
    document.head.appendChild(style);
}

