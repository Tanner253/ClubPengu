import React, { useState, useEffect, useRef } from 'react';
import Pet from '../engine/Pet';
import GameManager from '../engine/GameManager';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useMultiplayer } from '../multiplayer';

/**
 * PetPanel - Pet management
 * Supports multiple puffle ownership and equip/unequip
 * Server-authoritative: adoption goes through server for authenticated users
 */
const PetPanel = ({ equippedPet, ownedPets = [], onAdopt, onEquip, onUnequip, onUpdate, onClose }) => {
    const [tab, setTab] = useState('shop'); // 'shop' | 'inventory'
    const [name, setName] = useState('Fluffy');
    const [selectedColor, setSelectedColor] = useState('blue');
    const [, forceUpdate] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const [coins, setCoins] = useState(() => GameManager.getInstance().getCoins());
    const panelRef = useRef(null);
    
    // Server-authoritative puffle adoption
    const { adoptPet, puffleAdopting, isAuthenticated } = useMultiplayer();
    
    // Use shared hooks for click outside and escape key
    useClickOutside(panelRef, onClose, true);
    useEscapeKey(onClose, true);
    
    // Listen for coin changes
    useEffect(() => {
        const gm = GameManager.getInstance();
        const handler = (data) => {
            // data is an object { coins, delta, reason }
            if (typeof data === 'object' && data.coins !== undefined) {
                setCoins(data.coins);
            } else if (typeof data === 'number') {
                setCoins(data);
            }
        };
        gm.on('coinsChanged', handler);
        return () => gm.off('coinsChanged', handler);
    }, []);

    // Auto-refresh stats display
    useEffect(() => {
        if (!equippedPet) return;
        const interval = setInterval(() => forceUpdate(n => n + 1), 1000);
        return () => clearInterval(interval);
    }, [equippedPet]);
    
    // Get colors sorted by tier/price
    const sortedColors = Object.keys(Pet.COLORS).sort((a, b) => 
        Pet.COLORS[a].price - Pet.COLORS[b].price
    );

    const handleAdopt = async (color) => {
        const colorData = Pet.COLORS[color];
        const gm = GameManager.getInstance();
        
        // Check coins locally first for quick feedback
        if (gm.getCoins() < colorData.price) {
            setFeedback({ type: 'error', message: `Need ${colorData.price} coins!` });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        // For authenticated users, use server
        if (isAuthenticated) {
            setFeedback({ type: 'info', message: 'Adopting...' });
            
            const result = await adoptPet(color, name);
            
            if (result.success) {
                // Server returns the puffle data
                const newPet = Pet.fromJSON(result.puffle);
                setFeedback({ type: 'success', message: `${name} the ${colorData.name} puffle joined your family!` });
                
                setTimeout(() => {
                    if (onAdopt) onAdopt(newPet);
                    setName('Fluffy');
                    setFeedback(null);
                }, 1000);
            } else {
                setFeedback({ type: 'error', message: result.message || 'Failed to adopt puffle' });
                setTimeout(() => setFeedback(null), 3000);
            }
        } else {
            // Guest mode - local only, no persistence
            const newPet = new Pet({ name, color });
            setFeedback({ type: 'success', message: `${name} joined! (Guest - won't save)` });
            
            setTimeout(() => {
                if (onAdopt) onAdopt(newPet);
                setName('Fluffy');
                setFeedback(null);
            }, 1000);
        }
    };

    const handleFeed = () => {
        if (!equippedPet || typeof equippedPet.feed !== 'function') return;
        
        if (equippedPet.hunger < 10) {
            setFeedback({ type: 'info', message: `${equippedPet.name} isn't hungry!` });
            setTimeout(() => setFeedback(null), 1500);
            return;
        }
        
        equippedPet.feed();
        setFeedback({ type: 'success', message: `${equippedPet.name} ate happily! 🐟` });
        setTimeout(() => setFeedback(null), 1500);
        forceUpdate(n => n + 1);
        onUpdate && onUpdate(equippedPet);
    };

    const handlePlay = () => {
        if (!equippedPet || typeof equippedPet.play !== 'function') return;
        
        if (equippedPet.energy < 20) {
            setFeedback({ type: 'warning', message: `${equippedPet.name} is too tired!` });
            setTimeout(() => setFeedback(null), 1500);
            return;
        }
        
        equippedPet.play();
        setFeedback({ type: 'success', message: `${equippedPet.name} is having fun! 🎾` });
        setTimeout(() => setFeedback(null), 1500);
        forceUpdate(n => n + 1);
        onUpdate && onUpdate(equippedPet);
    };
    
    const handleRest = () => {
        if (!equippedPet || typeof equippedPet.rest !== 'function') return;
        equippedPet.rest();
        setFeedback({ type: 'success', message: `${equippedPet.name} is napping... 💤` });
        setTimeout(() => setFeedback(null), 2000);
        forceUpdate(n => n + 1);
        onUpdate && onUpdate(equippedPet);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            <div 
                ref={panelRef}
                className="bg-gradient-to-br from-purple-900/95 to-slate-900 rounded-2xl p-5 w-full max-w-lg border border-purple-400/30 shadow-xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🐾</span>
                        <h3 className="retro-text text-lg text-white">Pet Care</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-yellow-400 text-sm">💰 {coins}</span>
                        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 mb-3">
                    <button 
                        onClick={() => setTab('shop')}
                        className={`flex-1 py-2 rounded-lg retro-text text-xs transition-all ${
                            tab === 'shop' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-black/30 text-white/60 hover:bg-black/50'
                        }`}
                    >
                        🏪 Shop
                    </button>
                    <button 
                        onClick={() => setTab('inventory')}
                        className={`flex-1 py-2 rounded-lg retro-text text-xs transition-all ${
                            tab === 'inventory' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-black/30 text-white/60 hover:bg-black/50'
                        }`}
                    >
                        📦 My Pets ({ownedPets.length})
                    </button>
                </div>
                
                {/* Feedback Toast */}
                {feedback && (
                    <div className={`mb-3 p-2 rounded-lg text-center text-sm animate-fade-in ${
                        feedback.type === 'success' ? 'bg-green-500/80' :
                        feedback.type === 'error' ? 'bg-red-500/80' :
                        feedback.type === 'warning' ? 'bg-yellow-500/80' :
                        'bg-blue-500/80'
                    } text-white`}>
                        {feedback.message}
                    </div>
                )}

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto pr-1">
                    {/* Shop Tab */}
                    {tab === 'shop' && (
                        <div className="space-y-3">
                            {/* Name input */}
                            <div className="bg-black/20 rounded-lg p-3">
                                <label className="text-white/80 text-xs block mb-1">Name your new puffle</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={12}
                                    className="w-full px-3 py-2 rounded-lg bg-black/40 text-white border border-white/20 focus:outline-none focus:border-purple-400 text-sm"
                                    placeholder="Enter a name..."
                                />
                            </div>
                            
                            {/* Pet Shop Grid */}
                            <div className="grid grid-cols-1 gap-2">
                                {['common', 'uncommon', 'rare', 'epic', 'legendary'].map(tier => {
                                    const tierColors = sortedColors.filter(c => Pet.COLORS[c].tier === tier);
                                    if (tierColors.length === 0) return null;
                                    
                                    return (
                                        <div key={tier} className="bg-black/20 rounded-lg p-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span 
                                                    className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                                                    style={{ 
                                                        backgroundColor: Pet.TIER_COLORS[tier],
                                                        color: tier === 'legendary' ? '#000' : '#fff'
                                                    }}
                                                >
                                                    {tier}
                                                </span>
                                                <span className="text-white/50 text-xs">
                                                    {Pet.COLORS[tierColors[0]].price} 💰
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {tierColors.map(color => {
                                                    const colorData = Pet.COLORS[color];
                                                    const owned = ownedPets.some(p => p.color === color);
                                                    const canAfford = coins >= colorData.price;
                                                    
                                                    return (
                                                        <button
                                                            key={color}
                                                            onClick={() => {
                                                                setSelectedColor(color);
                                                                if (canAfford) handleAdopt(color);
                                                            }}
                                                            disabled={!canAfford}
                                                            className={`relative group w-12 h-12 rounded-lg border-2 transition-all ${
                                                                !canAfford 
                                                                    ? 'opacity-40 cursor-not-allowed border-transparent' 
                                                                    : 'hover:scale-110 border-transparent hover:border-white'
                                                            } ${colorData.special === 'rainbow' ? 'animate-pulse' : ''}`}
                                                            style={{ 
                                                                backgroundColor: colorData.hex,
                                                                boxShadow: colorData.special === 'glow' 
                                                                    ? `0 0 10px ${colorData.hex}` 
                                                                    : 'none'
                                                            }}
                                                            title={`${colorData.name} - ${colorData.personality}`}
                                                        >
                                                            {colorData.special === 'rainbow' && (
                                                                <span className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 opacity-80 rounded-lg" />
                                                            )}
                                                            {owned && (
                                                                <span className="absolute -top-1 -right-1 text-xs">✓</span>
                                                            )}
                                                            <span className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[10px] rounded whitespace-nowrap z-10">
                                                                {colorData.name}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Inventory Tab */}
                    {tab === 'inventory' && (
                        <div className="space-y-3">
                            {/* Currently Equipped */}
                            {equippedPet && (
                                <div className="bg-gradient-to-r from-purple-800/50 to-pink-800/50 rounded-xl p-3 border border-purple-400/30">
                                    <div className="text-white/60 text-xs mb-2 flex items-center gap-2">
                                        <span className="text-green-400">●</span> Currently Following
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-14 h-14 rounded-full border-3 border-white/40 flex items-center justify-center"
                                            style={{ 
                                                backgroundColor: Pet.COLORS[equippedPet.color]?.hex,
                                                boxShadow: Pet.COLORS[equippedPet.color]?.special === 'glow' 
                                                    ? `0 0 15px ${Pet.COLORS[equippedPet.color]?.hex}` 
                                                    : 'none'
                                            }}
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-white">{equippedPet.name}</div>
                                            <div className="text-purple-300 text-xs">
                                                {Pet.COLORS[equippedPet.color]?.name} • {equippedPet.mood}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onUnequip && onUnequip()}
                                            className="px-3 py-1 bg-red-600/60 hover:bg-red-500 text-white text-xs rounded-lg"
                                        >
                                            Unequip
                                        </button>
                                    </div>
                                    
                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        <StatBar label="Hunger" value={equippedPet.hunger} color="orange" icon="🍽️" inverted />
                                        <StatBar label="Energy" value={equippedPet.energy} color="cyan" icon="⚡" />
                                        <StatBar label="Happy" value={equippedPet.happiness} color="yellow" icon="😊" />
                                    </div>
                                    
                                    {/* Actions */}
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        <button 
                                            onClick={handleFeed} 
                                            className="bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg text-xs flex items-center justify-center gap-1"
                                        >
                                            🐟 Feed
                                        </button>
                                        <button 
                                            onClick={handlePlay} 
                                            className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs flex items-center justify-center gap-1"
                                        >
                                            🎾 Play
                                        </button>
                                        <button 
                                            onClick={handleRest} 
                                            className="bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg text-xs flex items-center justify-center gap-1"
                                        >
                                            💤 Rest
                                        </button>
                                    </div>
                                </div>
                            )}
                            
                            {/* All Owned Pets */}
                            <div className="bg-black/20 rounded-lg p-3">
                                <div className="text-white/80 text-xs mb-2 font-bold">Your Pets</div>
                                {ownedPets.length === 0 ? (
                                    <div className="text-white/50 text-center py-4 text-sm">
                                        No puffles yet! Visit the shop to adopt one.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {ownedPets.map((puffle, idx) => {
                                            const isEquipped = equippedPet?.id === puffle.id;
                                            const colorData = Pet.COLORS[puffle.color] || {};
                                            
                                            return (
                                                <div 
                                                    key={puffle.id || idx}
                                                    className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                                                        isEquipped 
                                                            ? 'bg-purple-600/30 border border-purple-400/50' 
                                                            : 'bg-black/20 hover:bg-black/30'
                                                    }`}
                                                >
                                                    <div 
                                                        className="w-10 h-10 rounded-full border-2 border-white/30"
                                                        style={{ 
                                                            backgroundColor: colorData.hex,
                                                            boxShadow: colorData.special === 'glow' 
                                                                ? `0 0 8px ${colorData.hex}` 
                                                                : 'none'
                                                        }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-white text-sm truncate">{puffle.name}</div>
                                                        <div className="text-white/50 text-xs">
                                                            {colorData.name}
                                                            <span 
                                                                className="ml-1 px-1 rounded text-[10px]"
                                                                style={{ backgroundColor: Pet.TIER_COLORS[colorData.tier] }}
                                                            >
                                                                {colorData.tier}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {isEquipped ? (
                                                        <span className="text-green-400 text-xs">Following</span>
                                                    ) : (
                                                        <button 
                                                            onClick={() => onEquip && onEquip(puffle)}
                                                            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg"
                                                        >
                                                            Equip
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Stat bar with visual fill
const StatBar = ({ label, value, color, icon, inverted = false }) => {
    const displayValue = inverted ? (100 - value) : value;
    const barColor = color === 'orange' ? 'bg-orange-400' : 
                     color === 'cyan' ? 'bg-cyan-400' : 'bg-yellow-400';
    
    return (
        <div className="bg-black/30 rounded-lg p-2 text-center">
            <div className="text-sm mb-1">{icon}</div>
            <div className="w-full bg-black/40 rounded-full h-1.5 mb-1">
                <div 
                    className={`${barColor} h-1.5 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(5, displayValue)}%` }}
                />
            </div>
            <div className="text-white/60 text-[9px]">{label}</div>
        </div>
    );
};

export default PetPanel;
