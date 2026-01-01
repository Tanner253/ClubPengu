import React, { useState, useEffect } from 'react';

/**
 * Portal - Interactive building door prompt (Club Pengu / MapleStory style)
 */
const Portal = ({ 
    name, 
    emoji, 
    description, 
    isNearby, 
    onEnter,
    color = 'gray',
    hasGame = false
}) => {
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        const checkMobile = () => {
            const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const isIPadOS = (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
            setIsMobile(mobileUA || isIPadOS || hasTouch);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    if (!isNearby) return null;
    
    return (
        <div className="fixed bottom-28 left-1/2 transform -translate-x-1/2 z-30 animate-fade-in">
            <div className={`
                ${hasGame 
                    ? 'bg-gradient-to-br from-emerald-600 to-green-700 border-emerald-400' 
                    : 'bg-gradient-to-br from-slate-700 to-slate-800 border-slate-500'
                }
                rounded-xl p-4 shadow-2xl
                border-2
                max-w-xs text-center
                backdrop-blur-sm
            `}>
                <div className="text-3xl mb-1">{emoji}</div>
                <h3 className="text-white font-bold retro-text text-sm">{name}</h3>
                <p className="text-white/70 text-xs mb-2">{description}</p>
                
                {hasGame ? (
                    <button 
                        onClick={onEnter}
                        className="bg-white/20 hover:bg-white/30 text-white px-5 py-2 rounded-lg retro-text text-xs transition-all border border-white/30 hover:border-white/50"
                    >
                        🚪 {isMobile ? 'ENTER' : 'ENTER [E]'}
                    </button>
                ) : (
                    <div className="text-white/50 text-xs retro-text py-1">
                        🔒 Coming Soon
                    </div>
                )}
            </div>
        </div>
    );
};

export default Portal;

