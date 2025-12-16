import { useState, useEffect } from 'react';

/**
 * Hook that detects device type and orientation
 * @returns {{ isMobile: boolean, isLandscape: boolean, isMobileGPU: boolean }}
 */
export const useDeviceDetection = () => {
    const [deviceInfo, setDeviceInfo] = useState(() => {
        if (typeof window === 'undefined') {
            return { isMobile: false, isLandscape: true, isMobileGPU: false };
        }
        const width = window.innerWidth;
        const height = window.innerHeight;
        return {
            isMobile: width < 768 || height < 500,
            isLandscape: width > height,
            isMobileGPU: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        };
    });
    
    useEffect(() => {
        const checkLayout = () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            setDeviceInfo({
                isMobile: width < 768 || height < 500,
                isLandscape: width > height,
                isMobileGPU: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            });
        };
        
        window.addEventListener('resize', checkLayout);
        window.addEventListener('orientationchange', () => setTimeout(checkLayout, 100));
        
        return () => {
            window.removeEventListener('resize', checkLayout);
            window.removeEventListener('orientationchange', checkLayout);
        };
    }, []);
    
    return deviceInfo;
};

export default useDeviceDetection;

