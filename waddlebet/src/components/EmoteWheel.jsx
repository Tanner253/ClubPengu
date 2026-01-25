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
    // Dynamically scale radius based on item count for better spacing
    const baseRadius = items.length > 10 ? 170 : items.length > 7 ? 150 : 110;
    const radius = baseRadius;
    
    const handleEmoteClick = (emoteId) => {
        onSelect(emoteId);
        onClose();
    };
    
    // Container size based on radius
    const containerSize = radius * 2 + 120; // Extra padding for icons
    
    return (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
            <div 
                className="relative"
                style={{ width: `${containerSize}px`, height: `${containerSize}px` }}
            >
                {/* Emote sectors arranged in a circle (top = index 0, clockwise) */}
                {items.map((emote, index) => {
                    const angle = (index * SECTOR_SIZE - 90) * (Math.PI / 180); // -90 to start at top
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isSelected = selection === index;
                    
                    // Smaller icons when many emotes
                    const iconSize = items.length > 10 ? 'w-12 h-12' : 'w-14 h-14';
                    const emojiSize = items.length > 10 ? 'text-xl' : 'text-2xl';
                    
                    return (
                        <div
                            key={emote.id}
                            className="absolute flex flex-col items-center justify-center"
                            style={{ 
                                left: `calc(50% + ${x}px)`, 
                                top: `calc(50% + ${y}px)`,
                                transform: `translate(-50%, -50%) scale(${isSelected ? 1.2 : 1})`,
                                opacity: isSelected ? 1 : 0.7,
                                transition: 'transform 0.1s, opacity 0.1s'
                            }}
                            onClick={() => handleEmoteClick(emote.id)}
                            onTouchStart={() => handleEmoteClick(emote.id)}
                        >
                            <div 
                                className={`${iconSize} rounded-full ${emote.color} flex items-center justify-center shadow-lg`}
                                style={{
                                    border: isSelected ? '3px solid white' : '2px solid rgba(255,255,255,0.4)',
                                    boxShadow: isSelected ? '0 0 20px rgba(255,255,255,0.5)' : 'none'
                                }}
                            >
                                <span className={emojiSize}>{emote.emoji}</span>
                            </div>
                            <span className={`text-xs mt-1 retro-text font-bold ${isSelected ? 'text-white' : 'text-white/60'}`}>
                                {emote.label}
                            </span>
                        </div>
                    );
                })}
                
                {/* Center - shows current selection */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                    w-20 h-20 rounded-full bg-black/90 border-2 border-white/30 
                    flex flex-col items-center justify-center">
                    {selection >= 0 && items[selection] ? (
                        <>
                            <span className="text-3xl">{items[selection].emoji}</span>
                            <span className="text-white text-xs retro-text mt-1 font-bold">
                                {items[selection].label}
                            </span>
                        </>
                    ) : (
                        <span className="text-white/40 text-xs retro-text text-center">Drag to<br/>select</span>
                    )}
                </div>
                
                {/* Instructions */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-2 text-white/50 text-xs retro-text">
                    Release [T] to use
                </div>
            </div>
        </div>
    );
};

export default EmoteWheel;





