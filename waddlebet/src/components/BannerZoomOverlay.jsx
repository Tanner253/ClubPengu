/**
 * BannerZoomOverlay - Magnifying glass functionality for in-game banners
 * When users click on banners/billboards, opens a 2D overlay with enlarged view
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '../i18n';

const BannerZoomOverlay = ({ 
    isOpen, 
    onClose, 
    bannerData,  // { type, title, imagePath, canvasContent, description }
    renderCanvas // Function to render custom canvas content
}) => {
    const { t } = useLanguage();
    const canvasRef = useRef(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isPortrait, setIsPortrait] = useState(false);
    
    // Detect mobile and portrait mode
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            const portrait = window.innerHeight > window.innerWidth;
            setIsMobile(mobile);
            setIsPortrait(portrait);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        window.addEventListener('orientationchange', checkMobile);
        return () => {
            window.removeEventListener('resize', checkMobile);
            window.removeEventListener('orientationchange', checkMobile);
        };
    }, []);
    
    // Render canvas content when overlay opens
    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (bannerData?.type === 'image' && bannerData?.imagePath) {
            // Load and display image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                setImageLoaded(true);
            };
            img.onerror = () => {
                // Draw error message
                canvas.width = 800;
                canvas.height = 400;
                ctx.fillStyle = '#1a1a2e';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ff6b6b';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Failed to load image', canvas.width/2, canvas.height/2);
            };
            img.src = bannerData.imagePath;
        } else if (bannerData?.type === 'canvas') {
            // Use provided render function or draw from existing canvas
            const isPortraitMobile = isMobile && isPortrait;
            
            if (bannerData.canvas && !isPortraitMobile) {
                // Draw from existing canvas first (if available and not mobile portrait)
                canvas.width = bannerData.canvas.width || 1600;
                canvas.height = bannerData.canvas.height || 800;
                ctx.drawImage(bannerData.canvas, 0, 0, canvas.width, canvas.height);
                setImageLoaded(true);
            } else if (renderCanvas || bannerData.renderFn) {
                // Use provided render function for custom canvas content
                // For mobile portrait, use portrait-optimized dimensions
                if (isPortraitMobile) {
                    canvas.width = Math.min(window.innerWidth - 40, 600);
                    canvas.height = Math.min(window.innerHeight - 200, 1200);
                } else {
                    canvas.width = 1600;
                    canvas.height = 800;
                }
                
                const renderFn = renderCanvas || bannerData.renderFn;
                if (renderFn) {
                    renderFn(ctx, canvas.width, canvas.height, isPortraitMobile);
                }
                setImageLoaded(true);
            } else if (bannerData.canvas) {
                // Fallback: draw existing canvas even on mobile (scaled)
                canvas.width = Math.min(window.innerWidth - 40, bannerData.canvas.width);
                canvas.height = Math.min(window.innerHeight - 200, bannerData.canvas.height);
                ctx.drawImage(bannerData.canvas, 0, 0, canvas.width, canvas.height);
                setImageLoaded(true);
            }
        }
    }, [isOpen, bannerData, renderCanvas, isMobile, isPortrait]);
    
    // Close on escape key
    useEffect(() => {
        if (!isOpen) return;
        
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    
    if (!isOpen) return null;
    
    const isPortraitMobile = isMobile && isPortrait;
    
    return (
        <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            {/* Close button - top right */}
            <button 
                onClick={onClose}
                className={`absolute ${isPortraitMobile ? 'top-2 right-2' : 'top-4 right-4'} z-10 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-xl font-bold transition-colors shadow-lg`}
                aria-label="Close"
            >
                ✕
            </button>
            
            {/* Content container - centered and responsive */}
            <div 
                className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden flex flex-col ${
                    isPortraitMobile 
                        ? 'w-full max-w-full max-h-[95vh] p-3' 
                        : 'max-w-[90vw] max-h-[90vh] p-6'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Title - centered header */}
                {bannerData?.title && (
                    <div className={`flex items-center justify-center gap-2 mb-4 ${isPortraitMobile ? 'mb-3' : 'mb-4'}`}>
                        <span className={`${isPortraitMobile ? 'text-xl' : 'text-2xl'}`}>🔍</span>
                        <h2 className={`text-white font-bold ${isPortraitMobile ? 'text-lg' : 'text-2xl'}`}>
                            {bannerData.title}
                        </h2>
                    </div>
                )}
                
                {/* Canvas container - centered with proper aspect ratio */}
                <div className="flex-1 flex items-center justify-center overflow-auto">
                    <canvas 
                        ref={canvasRef}
                        className={`max-w-full max-h-full rounded-lg object-contain ${
                            isPortraitMobile ? 'max-h-[70vh]' : 'max-h-[75vh]'
                        }`}
                        width={1600}
                        height={800}
                        style={{ 
                            display: imageLoaded ? 'block' : 'none',
                            margin: '0 auto'
                        }}
                    />
                    {!imageLoaded && (
                        <div className="flex items-center justify-center h-64 text-white/60">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 mx-auto mb-2"></div>
                                <p>Loading...</p>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Description - centered and formatted */}
                {bannerData?.description && (
                    <div className={`mt-4 text-white/90 text-center whitespace-pre-line ${
                        isPortraitMobile 
                            ? 'text-xs px-2' 
                            : 'text-sm px-4'
                    }`}>
                        {bannerData.description}
                    </div>
                )}
                
                {/* Close hint - bottom center */}
                <div className={`mt-3 text-white/50 text-center ${isPortraitMobile ? 'text-xs' : 'text-sm'}`}>
                    {isPortraitMobile ? t('ui.tapToClose') : t('ui.clickOrEscToClose')}
                </div>
            </div>
        </div>
    );
};

export default BannerZoomOverlay;

