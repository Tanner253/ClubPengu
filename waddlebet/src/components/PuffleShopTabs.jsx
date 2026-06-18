import React, { useState } from 'react';
import Puffle from '../engine/Puffle';
import { useMultiplayer } from '../multiplayer';

const getFoodDescription = (foodId) => ({
    cookie: 'A tasty treat that puffles love!',
    fish: 'Fresh fish — a puffle favorite!',
    cake: 'Decadent cake for special occasions.',
    gourmet: 'Premium gourmet meal from puffle chefs.',
    energyDrink: 'Energy boost before training.',
}[foodId] || 'Delicious puffle food.');

const getToyDescription = (toyId) => ({
    ball: 'Bouncy fetch toy.',
    frisbee: 'Toss and catch fun.',
    trampoline: 'Big happiness boost.',
    puzzleBox: 'Mental stimulation.',
    tennisBall: 'Classic fuzzy fetch.',
}[toyId] || 'Play with your puffle!');

const getAccessoryDescription = (category, itemId) => {
    const descriptions = {
        hats: {
            topHat: 'Sophisticated top hat on your puffle\'s head!',
            partyHat: 'Colorful party cone!',
            propellerHat: 'Spinning propeller beanie!',
            crown: 'Royal golden crown!',
            bow: 'Cute pink bow!',
            viking: 'Viking helmet with horns!',
        },
        glasses: {
            sunglasses: 'Cool dark shades!',
            nerdGlasses: 'Brainy square frames!',
            hearts: 'Heart-shaped lenses!',
            starGlasses: 'Sparkly star glasses!',
        },
        neckwear: {
            bowtie: 'Dapper red bowtie!',
            bandana: 'Adventurer bandana!',
            scarf: 'Warm blue scarf!',
            necklace: 'Gold gem pendant!',
        },
    };
    return descriptions[category]?.[itemId] || 'Shows on your puffle in-game!';
};

/**
 * In-shop supplies: food, toys, cosmetics (used inside Pet Shop / PufflePanel).
 */
export default function PuffleShopTabs({ equippedPuffle, coins, onPurchase, feedback, setFeedback }) {
    const [tab, setTab] = useState('food');
    const { isAuthenticated, send, equipPuffleAccessory, unequipPuffleAccessory } = useMultiplayer();

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
            send({ type: 'puffle_buy_food', puffleId: equippedPuffle.id, foodType, quantity: 1 });
            equippedPuffle.addFood?.(foodType, 1);
            setFeedback({ type: 'success', message: `Added ${food.name} to inventory! ${food.emoji}` });
        } else {
            send({ type: 'puffle_feed', puffleId: equippedPuffle.id, foodType });
            equippedPuffle.feed?.(foodType);
            setFeedback({ type: 'success', message: `${equippedPuffle.name} ate ${food.name}! ${food.emoji}` });
        }
        setTimeout(() => setFeedback(null), 2000);
        onPurchase?.('food', foodType);
    };

    const handleBuyToy = (toyType) => {
        if (!isAuthenticated || !equippedPuffle) {
            setFeedback({ type: 'error', message: 'Equip a puffle first!' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
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
        send({ type: 'puffle_buy_toy', puffleId: equippedPuffle.id, toyType });
        setFeedback({ type: 'success', message: `Bought ${toy.name}! ${toy.emoji}` });
        setTimeout(() => setFeedback(null), 2000);
        onPurchase?.('toy', toyType);
    };

    const handleBuyAccessory = (category, itemId) => {
        if (!isAuthenticated || !equippedPuffle) {
            setFeedback({ type: 'error', message: 'Equip a puffle first!' });
            setTimeout(() => setFeedback(null), 2000);
            return;
        }
        const accessory = Puffle.ACCESSORIES[category]?.[itemId];
        if (!accessory || accessory.price === 0) return;
        const arrayKey = category === 'hats' ? 'hats' : category;
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
        send({
            type: 'puffle_buy_accessory',
            puffleId: equippedPuffle.id,
            category: category === 'hats' ? 'hat' : category,
            itemId,
            price: accessory.price,
        });
        equippedPuffle.buyAccessory?.(category === 'hats' ? 'hat' : category, itemId);
        setFeedback({ type: 'success', message: `Bought ${accessory.name}! ${accessory.emoji || '✨'}` });
        setTimeout(() => setFeedback(null), 2000);
        onPurchase?.('accessory', { category, itemId });
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-1">
                {[
                    { id: 'food', label: '🍽️ Food' },
                    { id: 'toys', label: '🧸 Toys' },
                    { id: 'accessories', label: '👒 Style' },
                ].map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                            tab === t.id ? 'bg-emerald-600 text-white' : 'bg-black/30 text-white/60 hover:bg-black/50'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'food' && (
                <div className="space-y-2">
                    <div className="bg-black/20 rounded-lg p-2 text-center text-white/50 text-xs">
                        Feed now or stock food in your puffle&apos;s inventory
                    </div>
                    {Object.entries(Puffle.FOOD).map(([foodId, food]) => {
                        const inventoryCount = equippedPuffle?.foodInventory?.[foodId] || 0;
                        return (
                            <div key={foodId} className="bg-black/30 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{food.emoji}</div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold text-sm flex items-center gap-2">
                                            {food.name}
                                            {inventoryCount > 0 && (
                                                <span className="text-orange-400 text-[10px] bg-orange-400/20 px-1.5 py-0.5 rounded">
                                                    ×{inventoryCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-white/50 text-[10px]">{getFoodDescription(foodId)}</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <button type="button" onClick={() => handleBuyFood(foodId, false)} className="px-2 py-1 rounded text-[10px] font-bold bg-orange-500 hover:bg-orange-400 text-white">
                                            Feed {food.price}💰
                                        </button>
                                        <button type="button" onClick={() => handleBuyFood(foodId, true)} className="px-2 py-1 rounded text-[10px] font-bold bg-blue-600/70 hover:bg-blue-500 text-white">
                                            +Stock
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {tab === 'toys' && (
                <div className="space-y-2">
                    {Object.entries(Puffle.TOYS).map(([toyId, toy]) => {
                        const owned = equippedPuffle?.ownedToys?.includes(toyId);
                        return (
                            <div key={toyId} className={`bg-black/30 rounded-xl p-3 ${owned ? 'border border-green-400/40' : ''}`}>
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{toy.emoji}</div>
                                    <div className="flex-1">
                                        <div className="text-white font-bold text-sm">{toy.name}</div>
                                        <div className="text-white/50 text-[10px]">{getToyDescription(toyId)}</div>
                                    </div>
                                    {owned ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const result = equippedPuffle.play?.(toyId);
                                                if (result?.success) setFeedback({ type: 'success', message: `Playing with ${toy.name}!` });
                                                else setFeedback({ type: 'warning', message: 'Too tired!' });
                                                setTimeout(() => setFeedback(null), 1500);
                                            }}
                                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-500 text-white"
                                        >
                                            Play
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleBuyToy(toyId)}
                                            disabled={coins < toy.price}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${coins >= toy.price ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-400'}`}
                                        >
                                            {toy.price}💰
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {tab === 'accessories' && (
                <div className="space-y-3">
                    {Object.entries(Puffle.ACCESSORIES).map(([category, items]) => {
                        const singularKey = category === 'hats' ? 'hat' : category;
                        const equipped = equippedPuffle?.equippedAccessories?.[singularKey];
                        return (
                            <div key={category} className="bg-black/20 rounded-xl p-3">
                                <div className="text-white/80 text-xs font-bold mb-2 capitalize">{category}</div>
                                <div className="space-y-2">
                                    {Object.entries(items).filter(([id]) => id !== 'none').map(([itemId, item]) => {
                                        const owned = equippedPuffle?.ownedAccessories?.[category]?.includes(itemId);
                                        const isEquipped = equipped === itemId;
                                        return (
                                            <div key={itemId} className="flex items-center gap-2 p-2 rounded-lg bg-black/30">
                                                <span className="text-2xl">{item.emoji || '✨'}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-white text-xs font-bold">{item.name}</div>
                                                    <div className="text-white/40 text-[9px]">{getAccessoryDescription(category, itemId)}</div>
                                                </div>
                                                {owned ? (
                                                    isEquipped ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                equippedPuffle.unequipAccessory?.(singularKey);
                                                                unequipPuffleAccessory?.(equippedPuffle.id, singularKey);
                                                            }}
                                                            className="px-2 py-1 rounded text-[9px] bg-gray-600 text-white"
                                                        >
                                                            Remove
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                equippedPuffle.equipAccessory?.(singularKey, itemId);
                                                                equipPuffleAccessory?.(equippedPuffle.id, singularKey, itemId);
                                                            }}
                                                            className="px-2 py-1 rounded text-[9px] bg-purple-600 text-white"
                                                        >
                                                            Wear
                                                        </button>
                                                    )
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleBuyAccessory(category, itemId)}
                                                        disabled={coins < item.price}
                                                        className="px-2 py-1 rounded text-[9px] font-bold bg-pink-600 text-white disabled:opacity-50"
                                                    >
                                                        {item.price}💰
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
