/**
 * VirtualJoystick - PUBG-style touch joystick for mobile movement
 * Supports multi-touch and provides normalized direction values
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';

const VirtualJoystick = ({ 
    onMove, 
    size = 120, 
    position = 'left', // 'left' or 'right'
    deadzone = 0.1 
}) => {
    const containerRef = useRef(null);
    const [isActive, setIsActive] = useState(false);
    const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });
    const [touchId, setTouchId] = useState(null);
    const centerRef = useRef({ x: 0, y: 0 });
    
    const knobSize = size * 0.45;
    const maxDistance = (size - knobSize) / 2;
    
    const handleTouchStart = useCallback((e) => {
        // Find a touch that started in this joystick area
        for (const touch of e.changedTouches) {
            const rect = containerRef.current.getBoundingClientRect();
            const touchX = touch.clientX;
            const touchY = touch.clientY;
            
            // Check if touch is within the joystick area
            if (touchX >= rect.left && touchX <= rect.right &&
                touchY >= rect.top && touchY <= rect.bottom) {
                
                e.preventDefault();
                setTouchId(touch.identifier);
                setIsActive(true);
                
                // Set center to touch position for floating joystick feel
                centerRef.current = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
                
                // Calculate initial offset
                const offsetX = touchX - centerRef.current.x;
                const offsetY = touchY - centerRef.current.y;
                
                updateStickPosition(offsetX, offsetY);
                break;
            }
        }
    }, []);
    
    const updateStickPosition = useCallback((offsetX, offsetY) => {
        // Calculate distance and angle
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
        const clampedDistance = Math.min(distance, maxDistance);
        
        let normalizedX = 0;
        let normalizedY = 0;
        let stickX = 0;
        let stickY = 0;
        
        if (distance > 0) {
            // Normalize direction
            const dirX = offsetX / distance;
            const dirY = offsetY / distance;
            
            // Calculate stick visual position (clamped to max distance)
            stickX = dirX * clampedDistance;
            stickY = dirY * clampedDistance;
            
            // Calculate normalized output (-1 to 1)
            normalizedX = (clampedDistance / maxDistance) * dirX;
            normalizedY = (clampedDistance / maxDistance) * dirY;
            
            // Apply deadzone
            const magnitude = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
            if (magnitude < deadzone) {
                normalizedX = 0;
                normalizedY = 0;
            }
        }
        
        setStickPosition({ x: stickX, y: stickY });
        
        if (onMove) {
            onMove({ x: normalizedX, y: -normalizedY }); // Invert Y for game coordinates
        }
    }, [maxDistance, deadzone, onMove]);
    
    const handleTouchMove = useCallback((e) => {
        if (touchId === null) return;
        
        for (const touch of e.changedTouches) {
            if (touch.identifier === touchId) {
                e.preventDefault();
                
                const offsetX = touch.clientX - centerRef.current.x;
                const offsetY = touch.clientY - centerRef.current.y;
                
                updateStickPosition(offsetX, offsetY);
                break;
            }
        }
    }, [touchId, updateStickPosition]);
    
    const handleTouchEnd = useCallback((e) => {
        for (const touch of e.changedTouches) {
            if (touch.identifier === touchId) {
                e.preventDefault();
                setTouchId(null);
                setIsActive(false);
                setStickPosition({ x: 0, y: 0 });
                
                if (onMove) {
                    onMove({ x: 0, y: 0 });
                }
                break;
            }
        }
    }, [touchId, onMove]);
    
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        
        // Use non-passive listeners to allow preventDefault
        container.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd, { passive: false });
        document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        
        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
    
    // Detect iPad/tablet for extra padding
    const isTablet = window.innerWidth >= 768;
    const horizontalPadding = isTablet ? '40px' : '16px';
    const bottomPadding = isTablet ? '100px' : '70px';
    
    const positionStyle = position === 'left' 
        ? { left: horizontalPadding, bottom: bottomPadding }
        : { right: horizontalPadding, bottom: bottomPadding };
    
    return (
        <div 
            ref={containerRef}
            data-joystick="true"
            className="absolute z-30 touch-none select-none"
            style={{ width: size, height: size, ...positionStyle }}
        >
            {/* Outer ring */}
            <div 
                className={`absolute inset-0 rounded-full border-2 transition-all duration-150 ${
                    isActive 
                        ? 'bg-white/20 border-white/50' 
                        : 'bg-black/40 border-white/30'
                }`}
            />
            
            {/* Direction indicators */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="absolute top-2 text-white text-xs">▲</div>
                <div className="absolute bottom-2 text-white text-xs">▼</div>
                <div className="absolute left-2 text-white text-xs">◀</div>
                <div className="absolute right-2 text-white text-xs">▶</div>
            </div>
            
            {/* Inner knob */}
            <div 
                className={`absolute rounded-full transition-all ${
                    isActive ? 'duration-0' : 'duration-150'
                } ${isActive ? 'bg-white/80 shadow-lg' : 'bg-white/50'}`}
                style={{
                    width: knobSize,
                    height: knobSize,
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${stickPosition.x}px), calc(-50% + ${stickPosition.y}px))`,
                }}
            >
                {/* Knob inner detail */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/40 to-transparent" />
            </div>
        </div>
    );
};

export default VirtualJoystick;

