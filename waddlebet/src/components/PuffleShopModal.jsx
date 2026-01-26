import React, { useState, useEffect, useRef } from 'react';
import Puffle from '../engine/Puffle';
import GameManager from '../engine/GameManager';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useMultiplayer } from '../multiplayer';

// Item descriptions for detailed item info
const getFoodDescription = (foodId) => {
    const descriptions = {
        cookie: 'A tasty treat that puffles love! Perfect for a quick snack.',
        fish: 'Fresh fish - a puffle favorite! Filling and delicious.',
        cake: 'Decadent puffle cake for special occasions. Very filling!',
        gourmet: 'Premium gourmet meal prepared by puffle chefs. The best of the best!',
        energyDrink: 'Gives your puffle an energy boost! Great before training.'
    };
    return descriptions[foodId] || 'Delicious puffle food.';
};

const getToyDescription = (toyId) => {
    const descriptions = {
        ball: 'A bouncy ball for playing fetch! Increases happiness when you play with your puffle.',
        frisbee: 'Toss and catch game! Playing gives more happiness than basic play.',
        trampoline: 'Bouncing fun! High happiness boost but uses more energy.',
        puzzleBox: 'Mental stimulation! Best happiness gain with lowest energy cost.',
        tennisBall: 'Fuzzy fetch toy! Good balance of happiness and energy.'
    };
    return descriptions[toyId] || 'Use toys to play with your puffle and boost happiness!';
};

// What toys actually DO (gameplay explanation)
const getToyEffect = (toyId, toy) => {
    return `Playing gives +${toy.happinessBoost} happiness, costs ${toy.energyCost} energy`;
};

const getAccessoryDescription = (category, itemId) => {
    const descriptions = {
        hats: {
            topHat: 'A sophisticated top hat - appears on your puffle\'s head!',
            partyHat: 'Colorful party cone - shows on your puffle in-game!',
            propellerHat: 'Spinning propeller beanie - animated on your puffle!',
            crown: 'Golden crown with gems - your puffle becomes royalty!',
            bow: 'Cute pink bow - adorable on any puffle!',
            viking: 'Viking helmet with horns - for the warrior puffle!'
        },
        glasses: {
            sunglasses: 'Dark shades - makes your puffle look cool!',
            nerdGlasses: 'Square frames - brainy puffle style!',
            hearts: 'Heart-shaped lenses - spread the love!',
            starGlasses: 'Star-shaped sparkly glasses - be a star!'
        },
        neckwear: {
            bowtie: 'Red bowtie - dapper and charming!',
            bandana: 'Orange bandana - adventurer style!',
            scarf: 'Blue scarf - warm and stylish!',
            necklace: 'Gold chain with gem pendant - shiny!'
        }
    };
    return descriptions[category]?.[itemId] || '✨ Cosmetic accessory - shows on your puffle!';
};

/**
 * PuffleShopModal - Full shop for puffle food, toys, and accessories
 * Opens when player interacts with Puffle Shop entrance
 */
const PuffleShopModal = ({ equippedPuffle, onClose, onPurchase }) => {
    const [tab, setTab] = useState('food'); // 'food' | 'toys' | 'accessories'
    const [selectedItem, setSelectedItem] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [coins, setCoins] = useState(() => GameManager.getInstance().getCoins());
    const panelRef = useRef(null);
    
    const { isAuthenticated, send, syncPuffleState, equipPuffleAccessory, unequipPuffleAccessory } = useMultiplayer();
    
    useClickOutside(panelRef, onClose, true);
    useEscapeKey(onClose, true);
    
    // Listen for coin changes
    useEffect(() => {
        const gm = GameManager.getInstance();
        const handler = (data) => {
            if (typeof data === 'object' && data.coins !== undefined) {
                setCoins(data.coins);
            } else if (typeof data === 'number') {
                setCoins(data);
            }
        };
        gm.on('coinsChanged', handler);
        return () => gm.off('coinsChanged', handler);
    }, []);
    
    const handleBuyFood = (foodType, addToInventory = false) => {
        if (!isAuthenticated) {
            setFeedback({ type: 'error', message: 'Login to purchase!' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        if (!equippedPuffle) {
            setFeedback({ type: 'warning', message: 'Equip a puffle first!' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        const food = Puffle.FOOD[foodType];
        if (coins < food.price) {
            setFeedback({ type: 'error', message: `Need ${food.price} coins!` });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        if (addToInventory) {
            // Buy to inventory (for later use)
            send({
                type: 'puffle_buy_food',
                puffleId: equippedPuffle.id,
                foodType,
                quantity: 1
            });
            
            // Optimistic local update
            if (equippedPuffle.addFood) {
                equippedPuffle.addFood(foodType, 1);
            }
            
            setFeedback({ type: 'success', message: `Added ${food.name} to inventory! ${food.emoji}` });
        } else {
            // Feed immediately
            send({
                type: 'puffle_feed',
                puffleId: equippedPuffle.id,
                foodType
            });
            
            // Optimistic local update
            equippedPuffle.feed(foodType);
            
            setFeedback({ type: 'success', message: `${equippedPuffle.name} ate ${food.name}! ${food.emoji}` });
        }
        
        setTimeout(() => setFeedback(null), 2000);
        if (onPurchase) onPurchase('food', foodType);
    };
    
    const handleBuyToy = (toyType) => {
        if (!isAuthenticated) {
            setFeedback({ type: 'error', message: 'Login to purchase!' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        if (!equippedPuffle) {
            setFeedback({ type: 'warning', message: 'Equip a puffle first!' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        // Check if already owned
        if (equippedPuffle.ownedToys?.includes(toyType)) {
            setFeedback({ type: 'info', message: 'Already owned!' });
            setTimeout(() => setFeedback(null), 1500);
            return;
        }
        
        const toy = Puffle.TOYS[toyType];
        if (coins < toy.price) {
            setFeedback({ type: 'error', message: `Need ${toy.price} coins!` });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        // Send to server
        send({
            type: 'puffle_buy_toy',
            puffleId: equippedPuffle.id,
            toyType
        });
        
        setFeedback({ type: 'success', message: `Bought ${toy.name}! ${toy.emoji}` });
        setTimeout(() => setFeedback(null), 2000);
        
        if (onPurchase) onPurchase('toy', toyType);
    };
    
    const handleBuyAccessory = (category, itemId) => {
        if (!isAuthenticated) {
            setFeedback({ type: 'error', message: 'Login to purchase!' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        if (!equippedPuffle) {
            setFeedback({ type: 'warning', message: 'Equip a puffle first!' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        const accessory = Puffle.ACCESSORIES[category]?.[itemId];
        if (!accessory || accessory.price === 0) return;
        
        // Map category to owned accessory array key
        const categoryMap = { hats: 'hats', glasses: 'glasses', neckwear: 'neckwear' };
        const arrayKey = categoryMap[category] || category;
        
        // Check if already owned
        if (equippedPuffle.ownedAccessories?.[arrayKey]?.includes(itemId)) {
            setFeedback({ type: 'info', message: 'Already owned!' });
            setTimeout(() => setFeedback(null), 1500);
            return;
        }
        
        if (coins < accessory.price) {
            setFeedback({ type: 'error', message: `Need ${accessory.price} coins!` });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        
        // Send to server
        send({
            type: 'puffle_buy_accessory',
            puffleId: equippedPuffle.id,
            category: category === 'hats' ? 'hat' : category,
            itemId,
            price: accessory.price
        });
        
        // Optimistic local update
        if (equippedPuffle.buyAccessory) {
            equippedPuffle.buyAccessory(category === 'hats' ? 'hat' : category, itemId);
        } else if (!equippedPuffle.ownedAccessories[arrayKey]) {
            equippedPuffle.ownedAccessories[arrayKey] = [];
        }
        if (!equippedPuffle.ownedAccessories[arrayKey].includes(itemId)) {
            equippedPuffle.ownedAccessories[arrayKey].push(itemId);
        }
        
        setFeedback({ type: 'success', message: `Bought ${accessory.name}! ${accessory.emoji || '✨'}` });
        setTimeout(() => setFeedback(null), 2000);
        
        if (onPurchase) onPurchase('accessory', { category, itemId });
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-fade-in pointer-events-auto">
            <div 
                ref={panelRef}
                className="bg-gradient-to-br from-emerald-900/85 via-teal-900/80 to-slate-900/85 rounded-2xl p-5 w-full max-w-xl border border-emerald-400/20 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col backdrop-blur-md"
                style={{ boxShadow: '0 0 40px rgba(52, 211, 153, 0.15)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                            🐾
                        </div>
                        <div>
                            <h3 className="retro-text text-xl text-white">Puffle Shop</h3>
                            <p className="text-emerald-300 text-xs">Food, Toys & Accessories</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-400/30">
                            <span className="text-yellow-400 text-sm font-bold">💰 {coins}</span>
                        </div>
                        <button onClick={onClose} className="text-white/70 hover:text-white text-2xl leading-none hover:rotate-90 transition-transform">×</button>
                    </div>
                </div>
                
                {/* Current Puffle Display */}
                {equippedPuffle ? (
                    <div className="bg-black/30 rounded-xl p-3 mb-4 flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-full border-2 border-white/30"
                            style={{ backgroundColor: Puffle.COLORS[equippedPuffle.color]?.hex }}
                        />
                        <div className="flex-1">
                            <div className="text-white font-bold text-sm">{equippedPuffle.name}</div>
                            <div className="text-white/50 text-xs">
                                Lv.{equippedPuffle.level || 1} • {equippedPuffle.mood} {equippedPuffle.getMoodEmoji?.() || '😊'}
                            </div>
                        </div>
                        <div className="text-xs text-white/60">
                            🎮 {equippedPuffle.totalPlays || 0} plays
                        </div>
                    </div>
                ) : (
                    <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-xl p-3 mb-4 text-center text-yellow-300 text-sm">
                        ⚠️ No puffle equipped! Equip one from the Puffle Care panel first.
                    </div>
                )}
                
                {/* Tabs */}
                <div className="flex gap-1 mb-4">
                    {[
                        { id: 'food', label: '🍽️ Food', color: 'from-orange-500 to-red-500' },
                        { id: 'toys', label: '🧸 Toys', color: 'from-blue-500 to-purple-500' },
                        { id: 'accessories', label: '👒 Style', color: 'from-pink-500 to-purple-500' }
                    ].map(t => (
                        <button 
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                tab === t.id 
                                    ? `bg-gradient-to-r ${t.color} text-white shadow-lg` 
                                    : 'bg-black/30 text-white/60 hover:bg-black/50'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
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
                    {/* Food Tab */}
                    {tab === 'food' && (
                        <div className="space-y-2">
                            <div className="bg-black/20 rounded-lg p-2 text-center text-white/50 text-xs mb-3">
                                💡 <span className="text-orange-300">Feed Now</span> uses food immediately • <span className="text-blue-300">+ Inventory</span> saves for later
                            </div>
                            {Object.entries(Puffle.FOOD).map(([foodId, food]) => {
                                const inventoryCount = equippedPuffle?.foodInventory?.[foodId] || 0;
                                return (
                                    <div 
                                        key={foodId}
                                        className="group relative bg-black/30 rounded-xl p-3 hover:bg-black/40 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl">{food.emoji}</div>
                                            <div className="flex-1">
                                                <div className="text-white font-bold text-sm flex items-center gap-2">
                                                    {food.name}
                                                    {inventoryCount > 0 && (
                                                        <span className="text-orange-400 text-[10px] bg-orange-400/20 px-1.5 py-0.5 rounded">
                                                            ×{inventoryCount} owned
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-white/50 text-[10px]">
                                                    -{food.hungerReduction} hunger • +{food.happinessBoost} happiness
                                                    {food.energyBoost && ` • +${food.energyBoost} energy`}
                                                </div>
                                                <div className="text-white/40 text-[9px] mt-1 italic">
                                                    {food.description || getFoodDescription(foodId)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleBuyFood(foodId, false)}
                                                    disabled={coins < food.price}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                                        coins >= food.price
                                                            ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-400 hover:to-red-400'
                                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    Feed {food.price}💰
                                                </button>
                                                <button
                                                    onClick={() => handleBuyFood(foodId, true)}
                                                    disabled={coins < food.price}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                                        coins >= food.price
                                                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-400 hover:to-cyan-400'
                                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    + Inventory
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Toys Tab */}
                    {tab === 'toys' && (
                        <div className="space-y-2">
                            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3 text-center text-white/70 text-xs mb-3 border border-blue-400/30">
                                <div className="font-bold text-blue-300 mb-1">🧸 How Toys Work</div>
                                <div className="text-[10px]">
                                    Toys boost <span className="text-green-300">happiness</span> when you <span className="text-blue-300">Play</span> with your puffle!
                                    <br/>Better toys = more happiness. One-time purchase, use forever!
                                </div>
                            </div>
                            {Object.entries(Puffle.TOYS).map(([toyId, toy]) => {
                                const owned = equippedPuffle?.ownedToys?.includes(toyId);
                                const equipped = equippedPuffle?.equippedToy === toyId;
                                
                                return (
                                    <div 
                                        key={toyId}
                                        className={`bg-black/30 rounded-xl p-3 transition-all ${
                                            owned ? 'border border-green-400/50' : 'hover:bg-black/40'
                                        } ${equipped ? 'ring-2 ring-blue-400' : ''}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="text-3xl">{toy.emoji}</div>
                                            <div className="flex-1">
                                                <div className="text-white font-bold text-sm flex items-center gap-2">
                                                    {toy.name}
                                                    {owned && <span className="text-green-400 text-[10px] bg-green-400/20 px-1.5 py-0.5 rounded">✓ Owned</span>}
                                                    {equipped && <span className="text-blue-400 text-[10px] bg-blue-400/20 px-1.5 py-0.5 rounded">⭐ Favorite</span>}
                                                </div>
                                                <div className="text-white/50 text-[10px]">
                                                    +{toy.happinessBoost} happiness • -{toy.energyCost} energy per play
                                                </div>
                                                <div className="text-white/40 text-[9px] mt-1 italic">
                                                    {getToyDescription(toyId)}
                                                </div>
                                            </div>
                                            {owned ? (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            if (equippedPuffle.play) {
                                                                const result = equippedPuffle.play(toyId);
                                                                if (result?.success) {
                                                                    setFeedback({ type: 'success', message: `Playing with ${toy.name}! ${toy.emoji}` });
                                                                } else if (result?.error === 'TOO_TIRED') {
                                                                    setFeedback({ type: 'warning', message: 'Too tired to play!' });
                                                                }
                                                                setTimeout(() => setFeedback(null), 1500);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500 hover:bg-blue-400 text-white transition-all"
                                                    >
                                                        Play
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleBuyToy(toyId)}
                                                    disabled={coins < toy.price}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                                        coins >= toy.price
                                                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-400 hover:to-purple-400'
                                                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                    }`}
                                                >
                                                    Buy {toy.price}💰
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Accessories Tab */}
                    {tab === 'accessories' && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg p-3 text-center text-white/70 text-xs mb-3 border border-pink-400/30">
                                <div className="font-bold text-pink-300 mb-1">👒 Visual Cosmetics</div>
                                <div className="text-[10px]">
                                    Accessories appear <span className="text-pink-300">visually on your puffle</span> in-game!
                                    <br/>Buy → Equip from Items tab → See on your puffle! ✨
                                </div>
                            </div>
                            {Object.entries(Puffle.ACCESSORIES).map(([category, items]) => {
                                // Map category to equippedAccessories key
                                const singularKey = category === 'hats' ? 'hat' : category;
                                const equipped = equippedPuffle?.equippedAccessories?.[singularKey];
                                
                                return (
                                <div key={category} className="bg-black/20 rounded-xl p-3">
                                    <div className="text-white/80 text-xs font-bold mb-3 capitalize flex items-center gap-2">
                                        {category === 'hats' && '🎩'}
                                        {category === 'glasses' && '👓'}
                                        {category === 'neckwear' && '🧣'}
                                        {category}
                                        {equipped && equipped !== 'none' && (
                                            <span className="text-purple-300 text-[10px] font-normal bg-purple-400/20 px-2 py-0.5 rounded">
                                                Wearing: {Puffle.ACCESSORIES[category][equipped]?.name || equipped}
                                            </span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        {Object.entries(items).filter(([id]) => id !== 'none').map(([itemId, item]) => {
                                            const owned = equippedPuffle?.ownedAccessories?.[category]?.includes(itemId);
                                            const isEquipped = equipped === itemId;
                                            
                                            return (
                                                <div 
                                                    key={itemId}
                                                    className={`p-2 rounded-lg transition-all ${
                                                        isEquipped ? 'bg-purple-500/30 border border-purple-400/50' :
                                                        owned ? 'bg-green-500/20 border border-green-400/30' : 'bg-black/30 hover:bg-black/40'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl">{item.emoji || '✨'}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-white text-xs font-bold flex items-center gap-2">
                                                                {item.name}
                                                                {owned && <span className="text-green-400 text-[9px]">✓</span>}
                                                                {isEquipped && <span className="text-purple-300 text-[9px]">⭐ Wearing</span>}
                                                            </div>
                                                            <div className="text-white/40 text-[9px] italic">
                                                                {getAccessoryDescription(category, itemId)}
                                                            </div>
                                                        </div>
                                                        {owned ? (
                                                            isEquipped ? (
                                                                <button
                                                                    onClick={() => {
                                                                        if (equippedPuffle.unequipAccessory) {
                                                                            // Unequip locally
                                                                            equippedPuffle.unequipAccessory(singularKey);
                                                                            // Persist to server (DB) and broadcast to other players
                                                                            unequipPuffleAccessory?.(equippedPuffle.id, singularKey);
                                                                            setFeedback({ type: 'info', message: `Removed ${item.name}` });
                                                                            setTimeout(() => setFeedback(null), 1500);
                                                                        }
                                                                    }}
                                                                    className="px-2 py-1 rounded text-[9px] font-bold bg-gray-500 hover:bg-gray-400 text-white"
                                                                >
                                                                    Remove
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        if (equippedPuffle.equipAccessory) {
                                                                            // Equip locally
                                                                            equippedPuffle.equipAccessory(singularKey, itemId);
                                                                            // Persist to server (DB) and broadcast to other players
                                                                            equipPuffleAccessory?.(equippedPuffle.id, singularKey, itemId);
                                                                            setFeedback({ type: 'success', message: `Equipped ${item.name}!` });
                                                                            setTimeout(() => setFeedback(null), 1500);
                                                                        }
                                                                    }}
                                                                    className="px-2 py-1 rounded text-[9px] font-bold bg-purple-500 hover:bg-purple-400 text-white"
                                                                >
                                                                    Wear
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button
                                                                onClick={() => handleBuyAccessory(category, itemId)}
                                                                disabled={coins < item.price}
                                                                className={`px-2 py-1 rounded text-[10px] font-bold ${
                                                                    coins >= item.price
                                                                        ? 'bg-pink-500 hover:bg-pink-400 text-white'
                                                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                                                }`}
                                                            >
                                                                {item.price}💰
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )})}
                        </div>
                    )}
                </div>
                
                {/* Footer tip */}
                <div className="mt-3 pt-3 border-t border-white/10 text-center">
                    <p className="text-white/40 text-xs">
                        💡 Tip: Keep your puffle happy for bonus minigame rewards!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PuffleShopModal;

