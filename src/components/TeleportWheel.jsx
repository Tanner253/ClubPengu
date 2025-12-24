import React from 'react';

/**
 * TeleportWheel - Radial location selection wheel for teleportation
 * 
 * Props:
 * - isOpen: boolean - Whether the wheel is visible
 * - selection: number - Currently selected index (-1 for none)
 * - items: Array<{ id, emoji, label, color }> - Location items to display
 * - onSelect: (locationId) => void - Called when a location is selected
 * - onClose: () => void - Called when wheel should close
 */
const TeleportWheel = ({ isOpen, selection, items, onSelect, onClose }) => {
    if (!isOpen || !items?.length) return null;
    
    const SECTOR_SIZE = 360 / items.length;
    const radius = 110;
    
    const handleLocationClick = (location) => {
        onSelect(location);
        onClose();
    };
    
    return (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
            <div className="relative w-80 h-80">
                {/* Location sectors arranged in a circle (top = index 0, clockwise) */}
                {items.map((location, index) => {
                    const angle = (index * SECTOR_SIZE - 90) * (Math.PI / 180); // -90 to start at top
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    const isSelected = selection === index;
                    
                    return (
                        <div
                            key={location.id}
                            className="absolute flex flex-col items-center justify-center"
                            style={{ 
                                left: `calc(50% + ${x}px)`, 
                                top: `calc(50% + ${y}px)`,
                                transform: `translate(-50%, -50%) scale(${isSelected ? 1.2 : 1})`,
                                opacity: location.disabled ? 0.3 : (isSelected ? 1 : 0.6),
                                transition: 'transform 0.1s, opacity 0.1s',
                                cursor: location.disabled ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => !location.disabled && handleLocationClick(location)}
                            onTouchStart={() => !location.disabled && handleLocationClick(location)}
                        >
                            <div 
                                className={`w-16 h-16 rounded-full ${location.color} flex items-center justify-center shadow-lg`}
                                style={{
                                    border: location.disabled ? '2px solid rgba(255,255,255,0.2)' : (isSelected ? '4px solid white' : '2px solid rgba(255,255,255,0.4)'),
                                    boxShadow: location.disabled ? 'none' : (isSelected ? '0 0 20px rgba(255,255,255,0.5)' : 'none'),
                                    filter: location.disabled ? 'grayscale(100%)' : 'none'
                                }}
                            >
                                <span className="text-2xl">{location.emoji}</span>
                            </div>
                            <span className={`text-xs mt-2 retro-text font-bold ${location.disabled ? 'text-white/20' : (isSelected ? 'text-white' : 'text-white/50')}`}>
                                {location.label}
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
                            <span className="text-4xl" style={{ filter: items[selection].disabled ? 'grayscale(100%)' : 'none' }}>
                                {items[selection].emoji}
                            </span>
                            <span className={`text-xs retro-text mt-1 font-bold ${items[selection].disabled ? 'text-white/30' : 'text-white'}`}>
                                {items[selection].disabled ? 'Already here' : items[selection].label}
                            </span>
                        </>
                    ) : (
                        <span className="text-white/40 text-xs retro-text text-center">Drag to<br/>select</span>
                    )}
                </div>
                
                {/* Instructions */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 text-white/50 text-xs retro-text">
                    Release [M] to teleport
                </div>
            </div>
        </div>
    );
};

export default TeleportWheel;

