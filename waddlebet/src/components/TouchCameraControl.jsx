/**
 * TouchCameraControl - Touch area for camera rotation
 * 
 * MULTITOUCH SUPPORT:
 * - Tracks touches by ID, allowing simultaneous joystick + camera control
 * - Any touch that starts outside interactive elements (buttons, joystick) controls camera
 * - Multiple camera touches supported (uses the most recent one)
 * - Proper touch ID tracking prevents interference with joystick touches
 */

import React, { useRef, useCallback, useEffect, useState } from 'react';

const TouchCameraControl = ({ 
    onRotate, 
    sensitivity = 0.3
}) => {
    const [touchId, setTouchId] = useState(null);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const activeTouchesRef = useRef(new Map()); // Track all active camera touches
    
    const handleTouchStart = useCallback((e) => {
        for (const touch of e.changedTouches) {
            // Check if touch is on a UI element (buttons, joystick, etc.)
            const target = document.elementFromPoint(touch.clientX, touch.clientY);
            if (target) {
                // Skip if touching a button, joystick, or other interactive element
                const isInteractive = target.closest('button') || 
                                     target.closest('[data-joystick]') ||
                                     target.closest('[data-no-camera]') ||
                                     target.closest('[data-player-modal]') ||
                                     target.closest('[data-emote-wheel]') ||
                                     target.closest('input') ||
                                     target.tagName === 'INPUT' ||
                                     target.tagName === 'BUTTON' ||
                                     target.tagName === 'TEXTAREA';
                if (isInteractive) continue;
            }
            
            // Track this touch for camera control
            activeTouchesRef.current.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY
            });
            
            // Use the most recent camera touch as the active one
            setTouchId(touch.identifier);
            lastPosRef.current = { x: touch.clientX, y: touch.clientY };
        }
    }, []);
    
    const handleTouchMove = useCallback((e) => {
        for (const touch of e.changedTouches) {
            // Check if this is one of our tracked camera touches
            if (activeTouchesRef.current.has(touch.identifier)) {
                const lastPos = activeTouchesRef.current.get(touch.identifier);
                
                const deltaX = (touch.clientX - lastPos.x) * sensitivity;
                const deltaY = (touch.clientY - lastPos.y) * sensitivity;
                
                // Update stored position
                activeTouchesRef.current.set(touch.identifier, {
                    x: touch.clientX,
                    y: touch.clientY
                });
                
                // Only report deltas from the primary camera touch
                if (touch.identifier === touchId && onRotate) {
                    onRotate({ deltaX, deltaY });
                }
            }
        }
    }, [touchId, sensitivity, onRotate]);
    
    const handleTouchEnd = useCallback((e) => {
        for (const touch of e.changedTouches) {
            // Remove from tracked touches
            activeTouchesRef.current.delete(touch.identifier);
            
            if (touch.identifier === touchId) {
                // If primary touch ended, switch to another camera touch if available
                const remaining = Array.from(activeTouchesRef.current.keys());
                if (remaining.length > 0) {
                    const newPrimary = remaining[remaining.length - 1];
                    setTouchId(newPrimary);
                    const pos = activeTouchesRef.current.get(newPrimary);
                    lastPosRef.current = { x: pos.x, y: pos.y };
                } else {
                    setTouchId(null);
                }
            }
        }
    }, [touchId]);
    
    useEffect(() => {
        // Listen on document for full screen coverage
        // Using passive: false allows us to potentially preventDefault in the future
        // but currently we allow default behavior for scroll etc.
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('touchcancel', handleTouchEnd, { passive: true });
        
        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
    
    // This component doesn't render anything visible - it just handles touch events
    return null;
};

export default TouchCameraControl;
