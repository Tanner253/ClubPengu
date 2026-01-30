import React, { useState, useEffect, useRef } from 'react';
import Puffle from '../engine/Puffle';
import GameManager from '../engine/GameManager';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useMultiplayer } from '../multiplayer';
import PuffleTrainingGame from '../minigames/PuffleTrainingGame';

/**
 * PufflePanel - Enhanced Puffle management
 * Duck Life style training, tricks, toys, and more!
 * Server-authoritative: adoption goes through server for authenticated users
 */
const PufflePanel = ({ equippedPuffle, ownedPuffles = [], onAdopt, onEquip, onUnequip, onUpdate, onClose }) => {
    const [tab, setTab] = useState('inventory'); // 'shop' | 'inventory' | 'training' | 'tricks'
    const [name, setName] = useState('Fluffy');
    const [selectedColor, setSelectedColor] = useState('blue');
    const [, forceUpdate] = useState(0);
    const [feedback, setFeedback] = useState(null);
    const [coins, setCoins] = useState(() => GameManager.getInstance().getCoins());
    const panelRef = useRef(null);
    const [activeTraining, setActiveTraining] = useState(null); // 'flying' | 'running' | etc.
    const [restStatus, setRestStatus] = useState(null);
    
    // Server-authoritative puffle adoption
    const { adoptPuffle, puffleAdopting, isAuthenticated, send, syncPuffleState, equipPuffleAccessory, unequipPuffleAccessory, equipPuffleToy } = useMultiplayer();
    
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

    // Auto-refresh stats display and rest status
    useEffect(() => {
        if (!equippedPuffle) return;
        const interval = setInterval(() => {
            forceUpdate(n => n + 1);
            // Update rest status if puffle is resting
            if (equippedPuffle.isSleeping && typeof equippedPuffle.updateRest === 'function') {
                const status = equippedPuffle.updateRest();
                setRestStatus(status);
            } else if (restStatus?.isResting && !equippedPuffle.isSleeping) {
                setRestStatus(null);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [equippedPuffle, restStatus?.isResting]);
    
    // Initialize rest status on mount or puffle change
    useEffect(() => {
        if (equippedPuffle?.isSleeping && typeof equippedPuffle.updateRest === 'function') {
            setRestStatus(equippedPuffle.updateRest());
        } else {
            setRestStatus(null);
        }
    }, [equippedPuffle]);
    
    // Get colors sorted by tier/price
    const sortedColors = Object.keys(Puffle.COLORS).sort((a, b) => 
        Puffle.COLORS[a].price - Puffle.COLORS[b].price
    );

    const handleAdopt = async (color) => {
        const colorData = Puffle.COLORS[color];
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
            
            const result = await adoptPuffle(color, name);
            
            if (result.success) {
                // Server returns the puffle data
                const newPuffle = Puffle.fromJSON(result.puffle);
                setFeedback({ type: 'success', message: `${name} the ${colorData.name} puffle joined your family!` });
                
                setTimeout(() => {
                    if (onAdopt) onAdopt(newPuffle);
                    setName('Fluffy');
                    setFeedback(null);
                }, 1000);
            } else {
                setFeedback({ type: 'error', message: result.message || 'Failed to adopt puffle' });
                setTimeout(() => setFeedback(null), 3000);
            }
        } else {
            // Guest mode - local only, no persistence
            const newPuffle = new Puffle({ name, color });
            setFeedback({ type: 'success', message: `${name} joined! (Guest - won't save)` });
            
            setTimeout(() => {
                if (onAdopt) onAdopt(newPuffle);
                setName('Fluffy');
                setFeedback(null);
            }, 1000);
        }
    };

    const handleFeed = () => {
        if (!equippedPuffle || typeof equippedPuffle.feed !== 'function') return;
        
        if (equippedPuffle.hunger < 10) {
            setFeedback({ type: 'info', message: `${equippedPuffle.name} isn't hungry!` });
            setTimeout(() => setFeedback(null), 1500);
            return;
        }
        
        equippedPuffle.feed();
        setFeedback({ type: 'success', message: `${equippedPuffle.name} ate happily! 🐟` });
        setTimeout(() => setFeedback(null), 1500);
        forceUpdate(n => n + 1);
        onUpdate && onUpdate(equippedPuffle);
    };

    const handlePlay = () => {
        if (!equippedPuffle || typeof equippedPuffle.play !== 'function') return;
        
        if (equippedPuffle.energy < 20) {
            setFeedback({ type: 'warning', message: `${equippedPuffle.name} is too tired!` });
            setTimeout(() => setFeedback(null), 1500);
            return;
        }
        
        equippedPuffle.play();
        setFeedback({ type: 'success', message: `${equippedPuffle.name} is having fun! 🎾` });
        setTimeout(() => setFeedback(null), 1500);
        forceUpdate(n => n + 1);
        onUpdate && onUpdate(equippedPuffle);
    };
    
    const handleRest = () => {
        if (!equippedPuffle) return;
        
        // Use startRest if available, fallback to rest
        const startFn = equippedPuffle.startRest || equippedPuffle.rest;
        if (typeof startFn !== 'function') return;
        
        const result = startFn.call(equippedPuffle);
        if (result.success) {
            setRestStatus(equippedPuffle.updateRest ? equippedPuffle.updateRest() : { isResting: true });
            const hoursMsg = result.hoursToFullRest 
                ? ` (~${result.hoursToFullRest.toFixed(1)}h to full energy)` 
                : '';
            setFeedback({ type: 'success', message: `${equippedPuffle.name} is resting... 💤${hoursMsg}` });
            
            // Send to server
            if (isAuthenticated && send) {
                send({ type: 'puffle_rest', puffleId: equippedPuffle.puffleId });
            }
        } else {
            setFeedback({ type: 'error', message: result.error === 'ALREADY_RESTING' ? 'Already resting!' : 'Cannot rest' });
        }
        setTimeout(() => setFeedback(null), 3000);
        forceUpdate(n => n + 1);
        onUpdate && onUpdate(equippedPuffle);
    };
    
    const handleStopRest = () => {
        if (!equippedPuffle) return;
        
        const stopFn = equippedPuffle.stopRest;
        if (typeof stopFn !== 'function') return;
        
        const result = stopFn.call(equippedPuffle);
        if (result.success) {
            setRestStatus(null);
            setFeedback({ 
                type: 'success', 
                message: `${equippedPuffle.name} woke up! ☀️ Energy: ${result.finalEnergy}%` 
            });
            
            // Send to server
            if (isAuthenticated && send) {
                send({ type: 'puffle_stop_rest', puffleId: equippedPuffle.puffleId });
            }
        }
        setTimeout(() => setFeedback(null), 2000);
        forceUpdate(n => n + 1);
        onUpdate && onUpdate(equippedPuffle);
    };

    // Handle training complete
    const handleTrainingComplete = (stat, xpGain) => {
        if (equippedPuffle && equippedPuffle.trainingStats) {
            // Update training stat
            equippedPuffle.trainingStats[stat] = Math.min(999, (equippedPuffle.trainingStats[stat] || 10) + xpGain);
            // Reduce energy
            equippedPuffle.energy = Math.max(0, equippedPuffle.energy - 15);
            // Update mood
            if (equippedPuffle.updateMood) equippedPuffle.updateMood();
            
            setFeedback({ type: 'success', message: `+${xpGain} ${stat} XP! ⚡-15 energy` });
            setTimeout(() => setFeedback(null), 2000);
            forceUpdate(n => n + 1);
            onUpdate && onUpdate(equippedPuffle);
        }
        setActiveTraining(null);
    };

    // If training minigame is active, render it instead
    if (activeTraining && equippedPuffle) {
        return (
            <PuffleTrainingGame
                stat={activeTraining}
                puffle={equippedPuffle}
                onComplete={handleTrainingComplete}
                onClose={() => setActiveTraining(null)}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-fade-in pointer-events-auto">
            <div 
                ref={panelRef}
                className="bg-gradient-to-br from-purple-900/85 via-slate-800/80 to-slate-900/85 rounded-2xl p-5 w-full max-w-lg border border-purple-400/20 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-md"
                style={{ boxShadow: '0 0 40px rgba(139, 92, 246, 0.15)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🐾</span>
                        <h3 className="retro-text text-lg text-white">Puffle Care</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-yellow-400 text-sm">💰 {coins}</span>
                        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none">×</button>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-1 mb-3">
                    <button 
                        onClick={() => setTab('inventory')}
                        className={`flex-1 py-1.5 rounded-lg retro-text text-[10px] transition-all ${
                            tab === 'inventory' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-black/30 text-white/60 hover:bg-black/50'
                        }`}
                    >
                        🐾 Care
                    </button>
                    <button 
                        onClick={() => setTab('items')}
                        className={`flex-1 py-1.5 rounded-lg retro-text text-[10px] transition-all ${
                            tab === 'items' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-black/30 text-white/60 hover:bg-black/50'
                        }`}
                    >
                        🎒 Items
                    </button>
                    <button 
                        onClick={() => setTab('training')}
                        className={`flex-1 py-1.5 rounded-lg retro-text text-[10px] transition-all ${
                            tab === 'training' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-black/30 text-white/60 hover:bg-black/50'
                        }`}
                    >
                        💪 Train
                    </button>
                    <button 
                        onClick={() => setTab('tricks')}
                        className={`flex-1 py-1.5 rounded-lg retro-text text-[10px] transition-all ${
                            tab === 'tricks' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-black/30 text-white/60 hover:bg-black/50'
                        }`}
                    >
                        🎪 Tricks
                    </button>
                    <button 
                        onClick={() => setTab('shop')}
                        className={`flex-1 py-1.5 rounded-lg retro-text text-[10px] transition-all ${
                            tab === 'shop' 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-black/30 text-white/60 hover:bg-black/50'
                        }`}
                    >
                        🏪 Adopt
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
                            
                            {/* Puffle Shop Grid */}
                            <div className="grid grid-cols-1 gap-2">
                                {['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map(tier => {
                                    const tierColors = sortedColors.filter(c => Puffle.COLORS[c].tier === tier);
                                    if (tierColors.length === 0) return null;
                                    
                                    return (
                                        <div key={tier} className="bg-black/20 rounded-lg p-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span 
                                                    className="text-xs font-bold uppercase px-2 py-0.5 rounded"
                                                    style={{ 
                                                        backgroundColor: Puffle.TIER_COLORS[tier],
                                                        color: tier === 'legendary' ? '#000' : '#fff'
                                                    }}
                                                >
                                                    {tier}
                                                </span>
                                                <span className="text-white/50 text-xs">
                                                    {Puffle.COLORS[tierColors[0]].price} 💰
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {tierColors.map(color => {
                                                    const colorData = Puffle.COLORS[color];
                                                    const owned = ownedPuffles.some(p => p.color === color);
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
                                                            {colorData.special === 'dog' && (
                                                                <span className="absolute inset-0 flex items-center justify-center text-2xl">🐕</span>
                                                            )}
                                                            {colorData.special === 'shrimp' && (
                                                                <span className="absolute inset-0 flex items-center justify-center text-2xl">🦐</span>
                                                            )}
                                                            {colorData.special === 'duck' && (
                                                                <span className="absolute inset-0 flex items-center justify-center text-2xl">🦆</span>
                                                            )}
                                                            {colorData.special === 'babyPenguin' && (
                                                                <span className="absolute inset-0 flex items-center justify-center text-2xl">🐧</span>
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

                    {/* Inventory Tab - Care */}
                    {tab === 'inventory' && (
                        <div className="space-y-3">
                            {/* Currently Equipped */}
                            {equippedPuffle ? (
                                <div className="bg-gradient-to-r from-purple-800/50 to-pink-800/50 rounded-xl p-3 border border-purple-400/30">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-14 h-14 rounded-full border-3 border-white/40 flex items-center justify-center relative"
                                            style={{ 
                                                backgroundColor: Puffle.COLORS[equippedPuffle.color]?.hex,
                                                boxShadow: Puffle.COLORS[equippedPuffle.color]?.special === 'glow' 
                                                    ? `0 0 15px ${Puffle.COLORS[equippedPuffle.color]?.hex}` 
                                                    : 'none'
                                            }}
                                        >
                                            {/* Level badge */}
                                            <span className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[10px] font-bold px-1.5 rounded-full">
                                                Lv{equippedPuffle.level || 1}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-white flex items-center gap-2">
                                                {equippedPuffle.name}
                                                <span className="text-lg">{equippedPuffle.getMoodEmoji?.() || '😊'}</span>
                                            </div>
                                            <div className="text-purple-300 text-xs">
                                                {Puffle.COLORS[equippedPuffle.color]?.name} • {equippedPuffle.mood}
                                            </div>
                                            {/* XP Progress */}
                                            <div className="mt-1">
                                                <div className="flex items-center justify-between text-[9px] text-white/50">
                                                    <span>XP</span>
                                                    <span>{equippedPuffle.experience || 0}/{equippedPuffle.xpForNextLevel || 100}</span>
                                                </div>
                                                <div className="w-full bg-black/40 rounded-full h-1.5">
                                                    <div 
                                                        className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-1.5 rounded-full transition-all"
                                                        style={{ width: `${((equippedPuffle.experience || 0) / (equippedPuffle.xpForNextLevel || 100)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => onUnequip && onUnequip()}
                                            className="px-2 py-1 bg-red-600/60 hover:bg-red-500 text-white text-[10px] rounded-lg"
                                        >
                                            Unequip
                                        </button>
                                    </div>
                                    
                                    {/* Urgent Need Alert */}
                                    {equippedPuffle.urgentNeed && (
                                        <div className="mt-2 p-2 bg-red-500/30 border border-red-400/50 rounded-lg text-center text-sm animate-pulse">
                                            {equippedPuffle.urgentNeed.emoji} {equippedPuffle.urgentNeed.message}
                                        </div>
                                    )}
                                    
                                    {/* Stats with tooltips */}
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        <StatBar 
                                            label="Hunger" 
                                            value={equippedPuffle.hunger} 
                                            color="orange" 
                                            icon="🍽️" 
                                            inverted 
                                            tooltip="Lower is better! Feed your puffle to reduce hunger."
                                        />
                                        <StatBar 
                                            label="Energy" 
                                            value={equippedPuffle.energy} 
                                            color="cyan" 
                                            icon="⚡" 
                                            tooltip="Energy used for playing. Let your puffle rest to recover."
                                        />
                                        <StatBar 
                                            label="Happy" 
                                            value={equippedPuffle.happiness} 
                                            color="yellow" 
                                            icon="😊" 
                                            tooltip="Keep above 70% for minigame bonuses!"
                                        />
                                    </div>
                                    
                                    {/* Food Inventory */}
                                    {equippedPuffle.getTotalFood?.() > 0 && (
                                        <div className="mt-3 p-2 bg-black/30 rounded-lg">
                                            <div className="text-white/60 text-[10px] mb-2">🍽️ Food Inventory ({equippedPuffle.getTotalFood()})</div>
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(equippedPuffle.foodInventory || {}).map(([foodId, count]) => {
                                                    if (count <= 0) return null;
                                                    const food = Puffle.FOOD[foodId];
                                                    if (!food) return null;
                                                    return (
                                                        <button
                                                            key={foodId}
                                                            onClick={() => {
                                                                const result = equippedPuffle.useFood(foodId);
                                                                if (result) {
                                                                    setFeedback({ type: 'success', message: `${equippedPuffle.name} ate ${food.name}! ${food.emoji}` });
                                                                    forceUpdate(n => n + 1);
                                                                    onUpdate && onUpdate(equippedPuffle);
                                                                }
                                                                setTimeout(() => setFeedback(null), 1500);
                                                            }}
                                                            className="group relative px-2 py-1 bg-orange-600/50 hover:bg-orange-500 rounded text-xs"
                                                            title={`${food.name} (${count}x) - ${Puffle.getFoodDescription?.(foodId) || ''}`}
                                                        >
                                                            {food.emoji} ×{count}
                                                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                                {food.name} - Tap to use
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Happiness Bonus Indicator */}
                                    {equippedPuffle.happiness >= 70 && (
                                        <div className="mt-2 p-1.5 bg-green-500/20 border border-green-400/30 rounded-lg text-center">
                                            <span className="text-green-300 text-[10px]">
                                                🌟 Happy Puffle Bonus: +{Math.round((equippedPuffle.getMinigameBonus?.() || 0) * 100)}% minigame rewards!
                                            </span>
                                        </div>
                                    )}
                                    
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
                                        {!equippedPuffle.isSleeping ? (
                                            <button 
                                                onClick={handleRest} 
                                                disabled={equippedPuffle.energy >= 100}
                                                className={`py-2 rounded-lg text-xs flex items-center justify-center gap-1 ${
                                                    equippedPuffle.energy >= 100 
                                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                                                }`}
                                            >
                                                💤 Rest
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={handleStopRest} 
                                                className="bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg text-xs flex items-center justify-center gap-1 animate-pulse"
                                            >
                                                ☀️ Wake Up
                                            </button>
                                        )}
                                    </div>
                                    
                                    {/* Rest Status Display */}
                                    {equippedPuffle.isSleeping && restStatus && (
                                        <div className="mt-3 p-3 bg-purple-900/40 rounded-lg border border-purple-400/30 animate-pulse">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-white/90 text-sm font-medium">💤 {equippedPuffle.name} is resting...</span>
                                                <span className="text-purple-300 text-xs">
                                                    {restStatus.remainingHours}h remaining
                                                </span>
                                            </div>
                                            <div className="relative h-2 bg-black/40 rounded-full overflow-hidden">
                                                <div 
                                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-blue-400 transition-all duration-1000"
                                                    style={{ width: `${(restStatus.progress || 0) * 100}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between mt-2 text-xs text-white/60">
                                                <span>⚡ {restStatus.currentEnergy}%</span>
                                                <span>🍖 {restStatus.currentHunger}%</span>
                                                <span>😊 {restStatus.currentHappiness}%</span>
                                            </div>
                                            <p className="text-xs text-white/50 mt-2 text-center">
                                                Tap "Wake Up" to stop resting early
                                            </p>
                                        </div>
                                    )}
                                    
                                    {/* Total Plays & Next Trick Progress */}
                                    <div className="mt-3 p-2 bg-black/30 rounded-lg">
                                        <div className="flex items-center justify-between text-xs text-white/70">
                                            <span>🎮 Total Plays: {equippedPuffle.totalPlays || 0}</span>
                                            {equippedPuffle.getNextTrick?.() && (
                                                <span className="text-purple-300">
                                                    Next: {equippedPuffle.getNextTrick().name} ({equippedPuffle.getNextTrick().playsRequired - (equippedPuffle.totalPlays || 0)} more)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-black/20 rounded-lg p-6 text-center">
                                    <span className="text-4xl block mb-2">🐾</span>
                                    <p className="text-white/60 text-sm">No puffle equipped!</p>
                                    <p className="text-white/40 text-xs mt-1">Equip a puffle below or adopt one from the shop.</p>
                                </div>
                            )}
                            
                            {/* All Owned Puffles */}
                            <div className="bg-black/20 rounded-lg p-3">
                                <div className="text-white/80 text-xs mb-2 font-bold">Your Puffles</div>
                                {ownedPuffles.length === 0 ? (
                                    <div className="text-white/50 text-center py-4 text-sm">
                                        No puffles yet! Visit the shop to adopt one.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {ownedPuffles.map((puffle, idx) => {
                                            const isEquipped = equippedPuffle?.id === puffle.id;
                                            const colorData = Puffle.COLORS[puffle.color] || {};
                                            
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
                                                                style={{ backgroundColor: Puffle.TIER_COLORS[colorData.tier] }}
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
                    
                    {/* Items Tab - Inventory Management */}
                    {tab === 'items' && (
                        <div className="space-y-3">
                            {equippedPuffle ? (
                                <>
                                    {/* Food Inventory */}
                                    <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-3 border border-orange-400/20">
                                        <div className="text-orange-300 text-xs font-bold mb-3 flex items-center gap-2">
                                            🍽️ Food Inventory
                                            <span className="text-white/50 font-normal">
                                                ({equippedPuffle.getTotalFood?.() || 0} items)
                                            </span>
                                        </div>
                                        {equippedPuffle.getTotalFood?.() > 0 ? (
                                            <div className="space-y-2">
                                                {Object.entries(Puffle.FOOD).map(([foodId, food]) => {
                                                    const count = equippedPuffle.foodInventory?.[foodId] || 0;
                                                    if (count <= 0) return null;
                                                    return (
                                                        <div key={foodId} className="bg-black/30 rounded-lg p-2 flex items-center gap-3">
                                                            <div className="text-2xl">{food.emoji}</div>
                                                            <div className="flex-1">
                                                                <div className="text-white font-bold text-sm">{food.name}</div>
                                                                <div className="text-white/50 text-[10px]">
                                                                    -{food.hungerReduction} hunger • +{food.happinessBoost} happy
                                                                    {food.energyBoost && ` • +${food.energyBoost} energy`}
                                                                </div>
                                                            </div>
                                                            <div className="text-orange-300 font-bold">×{count}</div>
                                                            <button
                                                                onClick={() => {
                                                                    const result = equippedPuffle.useFood?.(foodId);
                                                                    if (result) {
                                                                        setFeedback({ type: 'success', message: `Fed ${equippedPuffle.name} ${food.name}! ${food.emoji}` });
                                                                        forceUpdate(n => n + 1);
                                                                        onUpdate && onUpdate(equippedPuffle);
                                                                    }
                                                                    setTimeout(() => setFeedback(null), 1500);
                                                                }}
                                                                className="px-3 py-1.5 bg-orange-500 hover:bg-orange-400 rounded-lg text-xs font-bold text-white"
                                                            >
                                                                Use
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-white/40 text-center py-3 text-xs">
                                                No food in inventory. Visit the Puffle Shop to buy some!
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Toys Inventory */}
                                    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-3 border border-blue-400/20">
                                        <div className="text-blue-300 text-xs font-bold mb-3 flex items-center gap-2">
                                            🧸 Owned Toys
                                            <span className="text-white/50 font-normal">
                                                ({equippedPuffle.ownedToys?.length || 0} toys)
                                            </span>
                                        </div>
                                        {(equippedPuffle.ownedToys?.length || 0) > 0 ? (
                                            <div className="space-y-2">
                                                {equippedPuffle.ownedToys?.map(toyId => {
                                                    const toy = Puffle.TOYS[toyId];
                                                    if (!toy) return null;
                                                    const isEquipped = equippedPuffle.equippedToy === toyId;
                                                    return (
                                                        <div key={toyId} className={`bg-black/30 rounded-lg p-2 flex items-center gap-3 ${isEquipped ? 'ring-2 ring-blue-400' : ''}`}>
                                                            <div className="text-2xl">{toy.emoji}</div>
                                                            <div className="flex-1">
                                                                <div className="text-white font-bold text-sm flex items-center gap-2">
                                                                    {toy.name}
                                                                    {isEquipped && <span className="text-blue-400 text-[10px]">⭐ Equipped</span>}
                                                                </div>
                                                                <div className="text-white/50 text-[10px]">
                                                                    +{toy.happinessBoost} happiness • -{toy.energyCost} energy per play
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => {
                                                                        const result = equippedPuffle.play?.(toyId);
                                                                        if (result?.success) {
                                                                            setFeedback({ type: 'success', message: `${equippedPuffle.name} played with ${toy.name}! ${toy.emoji}` });
                                                                            forceUpdate(n => n + 1);
                                                                            onUpdate && onUpdate(equippedPuffle);
                                                                        } else if (result?.error === 'TOO_TIRED') {
                                                                            setFeedback({ type: 'warning', message: 'Too tired to play!' });
                                                                        }
                                                                        setTimeout(() => setFeedback(null), 1500);
                                                                    }}
                                                                    className="px-2 py-1 bg-blue-500 hover:bg-blue-400 rounded text-[10px] font-bold text-white"
                                                                >
                                                                    Play
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-white/40 text-center py-3 text-xs">
                                                No toys owned. Visit the Puffle Shop to buy some!
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Accessories Inventory */}
                                    <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 rounded-xl p-3 border border-pink-400/20">
                                        <div className="text-pink-300 text-xs font-bold mb-3 flex items-center gap-2">
                                            👒 Accessories
                                        </div>
                                        <div className="space-y-3">
                                            {Object.entries({ hats: '🎩 Hats', glasses: '👓 Glasses', neckwear: '🧣 Neckwear' }).map(([category, label]) => {
                                                const owned = equippedPuffle.ownedAccessories?.[category] || [];
                                                const singularCategory = category === 'hats' ? 'hat' : category;
                                                const equipped = equippedPuffle.equippedAccessories?.[singularCategory];
                                                
                                                return (
                                                    <div key={category} className="bg-black/20 rounded-lg p-2">
                                                        <div className="text-white/70 text-[10px] font-bold mb-2 flex items-center justify-between">
                                                            <span>{label}</span>
                                                            {equipped && equipped !== 'none' && (
                                                                <span className="text-pink-300 font-normal">
                                                                    Wearing: {Puffle.ACCESSORIES[category]?.[equipped]?.name || equipped}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {owned.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {owned.map(itemId => {
                                                                    const item = Puffle.ACCESSORIES[category]?.[itemId];
                                                                    if (!item) return null;
                                                                    const isWearing = equipped === itemId;
                                                                    return (
                                                                        <button
                                                                            key={itemId}
                                                                            onClick={() => {
                                                                                if (isWearing) {
                                                                                    // Unequip locally
                                                                                    equippedPuffle.unequipAccessory?.(singularCategory);
                                                                                    // Persist to server (DB) - this also broadcasts to other players
                                                                                    unequipPuffleAccessory?.(equippedPuffle.id, singularCategory);
                                                                                    setFeedback({ type: 'info', message: `Removed ${item.name}` });
                                                                                } else {
                                                                                    // Equip locally
                                                                                    equippedPuffle.equipAccessory?.(singularCategory, itemId);
                                                                                    // Persist to server (DB) - this also broadcasts to other players
                                                                                    equipPuffleAccessory?.(equippedPuffle.id, singularCategory, itemId);
                                                                                    setFeedback({ type: 'success', message: `Equipped ${item.name}!` });
                                                                                }
                                                                                forceUpdate(n => n + 1);
                                                                                onUpdate && onUpdate(equippedPuffle);
                                                                                setTimeout(() => setFeedback(null), 1500);
                                                                            }}
                                                                            className={`px-2 py-1 rounded text-xs ${
                                                                                isWearing 
                                                                                    ? 'bg-pink-500 text-white ring-2 ring-pink-300' 
                                                                                    : 'bg-black/30 text-white/70 hover:bg-black/50'
                                                                            }`}
                                                                            title={`${item.name}${isWearing ? ' (wearing)' : ''}`}
                                                                        >
                                                                            {item.emoji || '✨'} {item.name}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="text-white/30 text-[10px]">None owned</div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    {/* Item Descriptions Reference */}
                                    <div className="bg-black/20 rounded-xl p-3 border border-white/10">
                                        <div className="text-white/60 text-xs font-bold mb-2">📖 Item Guide</div>
                                        <div className="text-white/40 text-[10px] space-y-1">
                                            <p>• <span className="text-orange-300">Food</span> reduces hunger and boosts happiness. Use from inventory anytime!</p>
                                            <p>• <span className="text-blue-300">Toys</span> increase happiness when played with, but use energy.</p>
                                            <p>• <span className="text-pink-300">Accessories</span> are cosmetic items to dress up your puffle.</p>
                                            <p>• Visit the <span className="text-emerald-300">Puffle Shop</span> in town to buy more items!</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-black/20 rounded-lg p-6 text-center">
                                    <span className="text-4xl block mb-2">🎒</span>
                                    <p className="text-white/60 text-sm">Equip a puffle to see inventory!</p>
                                    <p className="text-white/40 text-xs mt-1">Your puffle's food, toys, and accessories will appear here.</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Training Tab - Duck Life Style */}
                    {tab === 'training' && (
                        <div className="space-y-3">
                            {equippedPuffle ? (
                                <>
                                    <div className="bg-black/20 rounded-lg p-3">
                                        <div className="text-white/80 text-xs font-bold mb-3 flex items-center gap-2">
                                            💪 Training Stats
                                            <span className="text-yellow-400 font-normal">
                                                (Power: {equippedPuffle.getTotalPower?.() || 40})
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['running', 'swimming', 'flying', 'climbing'].map(stat => (
                                                <TrainingStat
                                                    key={stat}
                                                    stat={stat}
                                                    value={equippedPuffle.trainingStats?.[stat] || 10}
                                                    rating={equippedPuffle.getStatRating?.(stat) || 'D'}
                                                    onTrain={() => {
                                                        if (equippedPuffle.energy < 20) {
                                                            setFeedback({ type: 'warning', message: 'Too tired to train!' });
                                                            setTimeout(() => setFeedback(null), 1500);
                                                            return;
                                                        }
                                                        // Launch training minigame
                                                        setActiveTraining(stat);
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-black/20 rounded-lg p-3">
                                        <div className="text-white/80 text-xs font-bold mb-2">🏆 Racing Stats</div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-black/30 rounded-lg p-2">
                                                <div className="text-xl">{equippedPuffle.racingStats?.totalRaces || 0}</div>
                                                <div className="text-white/50 text-[9px]">Races</div>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2">
                                                <div className="text-xl text-green-400">{equippedPuffle.racingStats?.wins || 0}</div>
                                                <div className="text-white/50 text-[9px]">Wins</div>
                                            </div>
                                            <div className="bg-black/30 rounded-lg p-2">
                                                <div className="text-xl text-yellow-400">{equippedPuffle.racingStats?.trophies || 0}</div>
                                                <div className="text-white/50 text-[9px]">🏆 Trophies</div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-black/20 rounded-lg p-6 text-center">
                                    <span className="text-4xl block mb-2">💪</span>
                                    <p className="text-white/60 text-sm">Equip a puffle to train!</p>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Tricks Tab */}
                    {tab === 'tricks' && (
                        <div className="space-y-3">
                            {equippedPuffle ? (
                                <>
                                    <div className="bg-black/20 rounded-lg p-3">
                                        <div className="text-white/80 text-xs font-bold mb-3">
                                            🎪 Unlocked Tricks ({equippedPuffle.unlockedTricks?.length || 0}/{Object.keys(Puffle.TRICKS).length})
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(Puffle.TRICKS).map(([trickId, trick]) => {
                                                const unlocked = equippedPuffle.unlockedTricks?.includes(trickId);
                                                const progress = ((equippedPuffle.totalPlays || 0) / trick.playsRequired) * 100;
                                                
                                                return (
                                                    <div 
                                                        key={trickId}
                                                        className={`p-2 rounded-lg border transition-all ${
                                                            unlocked 
                                                                ? 'bg-green-500/20 border-green-400/50 cursor-pointer hover:bg-green-500/30' 
                                                                : 'bg-black/30 border-white/10'
                                                        }`}
                                                        onClick={() => {
                                                            if (unlocked && equippedPuffle.performTrick) {
                                                                equippedPuffle.performTrick(trickId);
                                                                setFeedback({ type: 'success', message: `${equippedPuffle.name} performed ${trick.name}!` });
                                                                setTimeout(() => setFeedback(null), 2000);
                                                                forceUpdate(n => n + 1);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-lg ${unlocked ? '' : 'grayscale opacity-50'}`}>
                                                                {trick.emoji}
                                                            </span>
                                                            <div className="flex-1 min-w-0">
                                                                <div className={`text-xs font-bold ${unlocked ? 'text-green-300' : 'text-white/50'}`}>
                                                                    {trick.name}
                                                                </div>
                                                                {!unlocked && (
                                                                    <>
                                                                        <div className="w-full bg-black/40 rounded-full h-1 mt-1">
                                                                            <div 
                                                                                className="bg-purple-400 h-1 rounded-full"
                                                                                style={{ width: `${Math.min(100, progress)}%` }}
                                                                            />
                                                                        </div>
                                                                        <div className="text-[9px] text-white/40 mt-0.5">
                                                                            {equippedPuffle.totalPlays || 0}/{trick.playsRequired} plays
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    
                                    {/* Owned Toys */}
                                    <div className="bg-black/20 rounded-lg p-3">
                                        <div className="text-white/80 text-xs font-bold mb-2">🧸 Owned Toys</div>
                                        {(equippedPuffle.ownedToys?.length || 0) > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {equippedPuffle.ownedToys?.map(toyId => {
                                                    const toy = Puffle.TOYS[toyId];
                                                    if (!toy) return null;
                                                    return (
                                                        <button
                                                            key={toyId}
                                                            onClick={() => {
                                                                const result = equippedPuffle.play(toyId);
                                                                if (result) {
                                                                    setFeedback({ type: 'success', message: `Playing with ${toy.name}! ${toy.emoji}` });
                                                                    forceUpdate(n => n + 1);
                                                                    onUpdate && onUpdate(equippedPuffle);
                                                                }
                                                                setTimeout(() => setFeedback(null), 1500);
                                                            }}
                                                            className="px-3 py-2 bg-blue-600/50 hover:bg-blue-500 rounded-lg text-xs"
                                                        >
                                                            {toy.emoji} {toy.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-white/40 text-xs">No toys yet! Visit the Puffle Food Vending Machine in town.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="bg-black/20 rounded-lg p-6 text-center">
                                    <span className="text-4xl block mb-2">🎪</span>
                                    <p className="text-white/60 text-sm">Equip a puffle to see tricks!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Training stat component
const TrainingStat = ({ stat, value, rating, onTrain }) => {
    const icons = {
        running: '🏃',
        swimming: '🏊',
        flying: '✈️',
        climbing: '🧗'
    };
    
    const ratingColors = {
        S: 'text-yellow-400',
        A: 'text-green-400',
        B: 'text-blue-400',
        C: 'text-purple-400',
        D: 'text-white/50'
    };
    
    return (
        <div className="bg-black/30 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1">
                <span className="text-sm">{icons[stat]}</span>
                <span className={`text-xs font-bold ${ratingColors[rating]}`}>{rating}</span>
            </div>
            <div className="text-white text-xs font-bold capitalize">{stat}</div>
            <div className="text-white/50 text-[10px]">{value}/999</div>
            <div className="w-full bg-black/40 rounded-full h-1.5 mt-1">
                <div 
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-1.5 rounded-full"
                    style={{ width: `${(value / 999) * 100}%` }}
                />
            </div>
            <button
                onClick={onTrain}
                className="w-full mt-2 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-[10px] text-white"
            >
                Train
            </button>
        </div>
    );
};

// Stat bar with visual fill and tooltip
const StatBar = ({ label, value, color, icon, inverted = false, tooltip }) => {
    const displayValue = inverted ? (100 - value) : value;
    const barColor = color === 'orange' ? 'bg-orange-400' : 
                     color === 'cyan' ? 'bg-cyan-400' : 'bg-yellow-400';
    
    return (
        <div className="bg-black/30 rounded-lg p-2 text-center relative group cursor-help" title={tooltip}>
            <div className="text-sm mb-1">{icon}</div>
            <div className="w-full bg-black/40 rounded-full h-1.5 mb-1">
                <div 
                    className={`${barColor} h-1.5 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.max(5, displayValue)}%` }}
                />
            </div>
            <div className="text-white/60 text-[9px]">{label}</div>
            {tooltip && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/95 text-white text-[9px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 max-w-[150px] text-center leading-tight">
                    {tooltip}
                </span>
            )}
        </div>
    );
};

export default PufflePanel;
