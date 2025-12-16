import { useEffect } from 'react';

/**
 * Hook that calls a callback when clicking outside the referenced element
 * @param {React.RefObject} ref - Reference to the element to detect clicks outside of
 * @param {Function} callback - Function to call when click outside detected
 * @param {boolean} enabled - Whether the hook is active (default true)
 */
export const useClickOutside = (ref, callback, enabled = true) => {
    useEffect(() => {
        if (!enabled) return;
        
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                callback(e);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside, { passive: true });
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [ref, callback, enabled]);
};

export default useClickOutside;

