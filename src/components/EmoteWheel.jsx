import React from 'react';

/**
 * EmoteWheel - Radial emote selection wheel
 * 
 * Props:
 * - isOpen: boolean - Whether the wheel is visible
 * - selection: number - Currently selected index (-1 for none)
 * - items: Array<{ id, emoji, label, color }> - Emote items to display
 * - onSelect: (emoteId) => void - Called when an emote is selected
 * - onClose: () => void - Called when wheel should close
 */
const EmoteWheel = ({ isOpen, selection, items, onSelect, onClose }) => {
    if (!isOpen || !items?.length) return null;
    
    const SECTOR_SIZE = 360 / items.length;
    const radius = 110;
    
    const handleEmoteClick = (emoteId) => {
        onSelect(emoteId);
        onClose();
    };
    
    return (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
            <div className="relative w-80 h-80">
                {/* Emote sectors arranged in a circle (top = index 0, clockwise) */}
                {items.map((emote, index) => {
                    const angle = (index * SECTOR_SIZE - 90) * (Math.PI / 180); // -90 to start at top
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isSelected = selection === index;
                    
                    return (
                        <div
                            key={emote.id}
                            className="absolute flex flex-col items-center justify-center"
                            style={{ 
                                left: `calc(50% + ${x}px)`, 
                                top: `calc(50% + ${y}px)`,
                                transform: `translate(-50%, -50%) scale(${isSelected ? 1.2 : 1})`,
                                opacity: isSelected ? 1 : 0.6,
                                transition: 'transform 0.1s, opacity 0.1s'
                            }}
                            onClick={() => handleEmoteClick(emote.id)}
                            onTouchStart={() => handleEmoteClick(emote.id)}
                        >
                            <div 
                                className={`w-16 h-16 rounded-full ${emote.color} flex items-center justify-center shadow-lg`}
                                style={{
                                    border: isSelected ? '4px solid white' : '2px solid rgba(255,255,255,0.4)',
                                    boxShadow: isSelected ? '0 0 20px rgba(255,255,255,0.5)' : 'none'
                                }}
                            >
                                <span className="text-2xl">{emote.emoji}</span>
                            </div>
                            <span className={`text-xs mt-2 retro-text font-bold ${isSelected ? 'text-white' : 'text-white/50'}`}>
                                {emote.label}
                            </span>
                        </div>
                    );
                })}
                
                {/* Center - shows current selection */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                    w-24 h-24 rounded-full bg-black/90 border-2 border-white/30 
                    flex flex-col items-center justify-center">
                    {selection >= 0 && items[selection] ? (
                        <>
                            <span className="text-4xl">{items[selection].emoji}</span>
                            <span className="text-white text-xs retro-text mt-1 font-bold">
                                {items[selection].label}
                            </span>
                        </>
                    ) : (
                        <span className="text-white/40 text-xs retro-text text-center">Drag to<br/>select</span>
                    )}
                </div>
                
                {/* Instructions */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 text-white/50 text-xs retro-text">
                    Release [T] to use
                </div>
            </div>
        </div>
    );
};

export default EmoteWheel;

