import { useEffect } from 'react';

/**
 * Hook that calls a callback when Escape key is pressed
 * @param {Function} callback - Function to call when Escape pressed
 * @param {boolean} enabled - Whether the hook is active (default true)
 */
export const useEscapeKey = (callback, enabled = true) => {
    useEffect(() => {
        if (!enabled) return;
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                callback(e);
            }
        };
        
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [callback, enabled]);
};

export default useEscapeKey;

