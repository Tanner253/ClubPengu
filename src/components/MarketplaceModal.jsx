/**
 * MarketplaceModal - Open market for cosmetic trading
 * RuneScape Grand Exchange / CS:GO Market style
 * 
 * Features:
 * - Browse all listings with filters
 * - Search by item name
 * - Buy items with Pebbles
 * - View price history
 * - Manage your own listings
 * - Sell items from inventory
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMultiplayer } from '../multiplayer';
import CosmeticThumbnail from './CosmeticThumbnail';
import CosmeticPreview3D from './CosmeticPreview3D';

// ==================== CONSTANTS ====================
const RARITY_CONFIG = {
    common:    { color: '#9CA3AF', bg: 'from-gray-800/80 to-gray-900/80', border: 'border-gray-500/50', label: 'Common', emoji: '⚪' },
    uncommon:  { color: '#22C55E', bg: 'from-green-900/80 to-green-950/80', border: 'border-green-500/50', label: 'Uncommon', emoji: '🟢' },
    rare:      { color: '#3B82F6', bg: 'from-blue-900/80 to-blue-950/80', border: 'border-blue-500/50', label: 'Rare', emoji: '🔵' },
    epic:      { color: '#A855F7', bg: 'from-purple-900/80 to-purple-950/80', border: 'border-purple-500/50', label: 'Epic', emoji: '🟣' },
    legendary: { color: '#F59E0B', bg: 'from-amber-900/80 to-amber-950/80', border: 'border-amber-500/50', label: 'Legendary', emoji: '🟡' },
    mythic:    { color: '#EC4899', bg: 'from-pink-900/80 to-pink-950/80', border: 'border-pink-500/50', label: 'Mythic', emoji: '💖' },
    divine:    { color: '#06B6D4', bg: 'from-cyan-900/80 to-cyan-950/80', border: 'border-cyan-400/50', label: 'Divine', emoji: '💎' }
};

const QUALITY_CONFIG = {
    worn: { label: 'Worn', color: '#6B7280', multiplier: '0.7x' },
    standard: { label: 'Standard', color: '#9CA3AF', multiplier: '1.0x' },
    pristine: { label: 'Pristine', color: '#34D399', multiplier: '1.8x' },
    flawless: { label: 'Flawless', color: '#FBBF24', multiplier: '4.0x' }
};

const CATEGORIES = [
    { id: 'all', label: 'All Items', emoji: '🎁' },
    { id: 'hat', label: 'Hats', emoji: '🎩' },
    { id: 'eyes', label: 'Eyes', emoji: '👀' },
    { id: 'mouth', label: 'Mouths', emoji: '👄' },
    { id: 'bodyItem', label: 'Body', emoji: '👕' },
    { id: 'mount', label: 'Mounts', emoji: '🐎' },
    { id: 'skin', label: 'Skins', emoji: '🎨' }
];

const RARITIES = [
    { id: 'all', label: 'All Rarities' },
    { id: 'divine', label: '💎 Divine' },
    { id: 'mythic', label: '💖 Mythic' },
    { id: 'legendary', label: '🟡 Legendary' },
    { id: 'epic', label: '🟣 Epic' },
    { id: 'rare', label: '🔵 Rare' },
    { id: 'uncommon', label: '🟢 Uncommon' },
    { id: 'common', label: '⚪ Common' }
];

const SORT_OPTIONS = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'price_low', label: 'Price: Low to High' },
    { id: 'price_high', label: 'Price: High to Low' },
    { id: 'rarity', label: 'Rarity' }
];

const TABS = [
    { id: 'browse', label: '🏪 Browse', desc: 'Find items' },
    { id: 'myListings', label: '📋 My Listings', desc: 'Manage sales' },
    { id: 'history', label: '📊 History', desc: 'Transactions' }
];

// ==================== HOOKS ====================
const useClickOutside = (ref, callback) => {
    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                callback();
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [ref, callback]);
};

const useEscapeKey = (callback) => {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') callback();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [callback]);
};

// ==================== TOOLTIPS ====================
const TOOLTIPS = {
    rarity: {
        title: 'Rarity',
        desc: 'How rare this item is from gacha rolls.',
        tiers: [
            { label: 'Divine', color: '#06B6D4', info: '0.1% drop rate - Extremely rare!' },
            { label: 'Mythic', color: '#EC4899', info: '0.5% drop rate - Very rare' },
            { label: 'Legendary', color: '#F59E0B', info: '2% drop rate - Highly sought after' },
            { label: 'Epic', color: '#A855F7', info: '7% drop rate - Valuable' },
            { label: 'Rare', color: '#3B82F6', info: '15% drop rate' },
            { label: 'Uncommon', color: '#22C55E', info: '30% drop rate' },
            { label: 'Common', color: '#9CA3AF', info: '45.4% drop rate' }
        ]
    },
    quality: {
        title: 'Quality',
        desc: 'Affects burn value (gold when destroyed).',
        tiers: [
            { label: 'Flawless', color: '#FBBF24', info: '4x burn value - 2% chance' },
            { label: 'Pristine', color: '#34D399', info: '1.8x burn value - 10% chance' },
            { label: 'Standard', color: '#9CA3AF', info: '1x burn value - 60% chance' },
            { label: 'Worn', color: '#6B7280', info: '0.7x burn value - 28% chance' }
        ]
    },
    edition: {
        title: 'First Edition',
        desc: 'Items with serial #1-3 are First Edition.',
        info: '🏆 First Edition items have 2x burn value and are highly collectible. Only the first 3 minted of each item!'
    },
    holographic: {
        title: 'Holographic',
        desc: 'A rare visual effect applied to items.',
        info: '✨ Only 3% of items roll holographic! These shimmer and sparkle with rainbow effects. +1.5x burn value.'
    },
    serial: {
        title: 'Serial Number',
        desc: 'Unique number showing mint order.',
        info: 'Lower serials are more valuable! Serial #1 is the first ever minted of this item.'
    },
    pebbles: {
        title: 'What are Pebbles?',
        desc: 'In-game premium currency for trading.',
        points: [
            '💰 Buy Pebbles with SOL or $WADDLE',
            '🏪 Trade cosmetics on the marketplace',
            '🎰 Tip players & buy gacha rolls',
            '💸 Cash out to SOL anytime (5% fee)',
            '📈 Profit by trading rare items!'
        ]
    }
};

// Tooltip component - uses portal to escape overflow clipping
const InfoTooltip = ({ content, children }) => {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef(null);
    
    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                x: rect.left,
                y: rect.top + rect.height / 2
            });
        }
        setShow(true);
    };
    
    const tooltip = show && createPortal(
        <div 
            className="fixed z-[99999] w-56 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-2xl text-left pointer-events-none"
            style={{
                left: `${Math.max(8, coords.x - 230)}px`,
                top: `${coords.y}px`,
                transform: 'translateY(-50%)'
            }}
        >
            <div className="text-xs text-white/90">{content}</div>
        </div>,
        document.body
    );
    
    return (
        <div 
            ref={triggerRef}
            className="relative inline-flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            <span className="ml-1 text-white/40 hover:text-white/70 cursor-help text-xs">ⓘ</span>
            {tooltip}
        </div>
    );
};

// Detailed tooltip for rarity/quality tiers - uses portal
const TierTooltip = ({ type, value, children }) => {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef(null);
    const data = TOOLTIPS[type];
    
    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({ x: rect.left, y: rect.top + rect.height / 2 });
        }
        setShow(true);
    };
    
    const tooltip = show && createPortal(
        <div 
            className="fixed z-[99999] w-72 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-2xl text-left pointer-events-none"
            style={{
                left: `${Math.max(8, coords.x - 290)}px`,
                top: `${coords.y}px`,
                transform: 'translateY(-50%)'
            }}
        >
            <div className="font-bold text-white mb-1">{data.title}</div>
            <div className="text-xs text-white/70 mb-2">{data.desc}</div>
            <div className="space-y-1">
                {data.tiers?.map(tier => (
                    <div 
                        key={tier.label}
                        className={`text-xs flex items-center gap-2 p-1 rounded ${
                            value?.toLowerCase() === tier.label.toLowerCase() 
                                ? 'bg-white/10 border border-white/20' 
                                : ''
                        }`}
                    >
                        <span 
                            className="w-2 h-2 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: tier.color }}
                        />
                        <span style={{ color: tier.color }}>{tier.label}</span>
                        <span className="text-white/50 text-[10px]">{tier.info}</span>
                    </div>
                ))}
            </div>
        </div>,
        document.body
    );
    
    return (
        <div 
            ref={triggerRef}
            className="relative inline-flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            <span className="ml-1 text-white/40 hover:text-white/70 cursor-help text-xs">ⓘ</span>
            {tooltip}
        </div>
    );
};

// Simple info badge tooltip - uses portal
const BadgeTooltip = ({ type, children }) => {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef(null);
    const data = TOOLTIPS[type];
    
    const handleMouseEnter = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({ x: rect.left, y: rect.top + rect.height / 2 });
        }
        setShow(true);
    };
    
    const tooltip = show && createPortal(
        <div 
            className="fixed z-[99999] w-56 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-2xl text-left pointer-events-none"
            style={{
                left: `${Math.max(8, coords.x - 230)}px`,
                top: `${coords.y}px`,
                transform: 'translateY(-50%)'
            }}
        >
            <div className="font-bold text-white mb-1">{data.title}</div>
            <div className="text-xs text-white/70 mb-2">{data.desc}</div>
            <div className="text-xs text-white/90">{data.info}</div>
        </div>,
        document.body
    );
    
    return (
        <div 
            ref={triggerRef}
            className="relative inline-flex items-center cursor-help"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            {tooltip}
        </div>
    );
};

// Pebbles Info Panel
const PebblesInfoPanel = ({ onClose }) => {
    const data = TOOLTIPS.pebbles;
    return (
        <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">🪨</span>
                    <div>
                        <div className="font-bold text-amber-400">{data.title}</div>
                        <div className="text-xs text-white/60">{data.desc}</div>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-white/40 hover:text-white">✕</button>
                )}
            </div>
            <div className="space-y-1.5">
                {data.points.map((point, i) => (
                    <div key={i} className="text-sm text-white/80 flex items-start gap-2">
                        <span className="text-amber-400">•</span>
                        {point}
                    </div>
                ))}
            </div>
            <div className="mt-3 text-xs text-amber-400/70 border-t border-amber-500/20 pt-2">
                💡 Tip: Buy low, sell high! Watch the market for deals.
            </div>
        </div>
    );
};

// ==================== SUB COMPONENTS ====================

const Spinner = ({ className = '' }) => (
    <div className={`animate-spin ${className}`}>⏳</div>
);

const PebbleIcon = ({ size = 16 }) => (
    <span className="inline-block" style={{ fontSize: size }}>🪨</span>
);

// Listing Card Component
const ListingCard = ({ listing, onClick, isOwn = false }) => {
    const rarity = RARITY_CONFIG[listing.itemSnapshot?.rarity] || RARITY_CONFIG.common;
    const quality = QUALITY_CONFIG[listing.itemSnapshot?.quality] || QUALITY_CONFIG.standard;
    
    return (
        <button
            onClick={onClick}
            className={`relative rounded-lg border-2 transition-all hover:scale-[1.02] overflow-hidden ${rarity.border} bg-gradient-to-br ${rarity.bg} hover:border-white/50`}
        >
            {/* Thumbnail */}
            <div className="aspect-square p-2 flex items-center justify-center">
                <CosmeticThumbnail
                    templateId={listing.templateId}
                    category={listing.itemSnapshot?.category}
                    assetKey={listing.itemSnapshot?.assetKey}
                    rarity={listing.itemSnapshot?.rarity}
                    isHolographic={listing.itemSnapshot?.isHolographic}
                    size={80}
                />
            </div>
            
            {/* Info bar */}
            <div className="bg-black/60 px-2 py-1.5 border-t border-white/10">
                <div className="text-xs font-medium text-white truncate">
                    {listing.itemSnapshot?.name || 'Unknown Item'}
                </div>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-amber-400 font-bold text-sm flex items-center gap-1">
                        <PebbleIcon size={12} />
                        {listing.price?.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-white/50">
                        #{listing.itemSnapshot?.serialNumber}
                    </span>
                </div>
            </div>
            
            {/* Badges */}
            <div className="absolute top-1 left-1 flex gap-1">
                {listing.itemSnapshot?.isFirstEdition && (
                    <span className="bg-amber-500 text-black text-[10px] px-1 rounded font-bold">1ST</span>
                )}
                {listing.itemSnapshot?.isHolographic && (
                    <span className="bg-gradient-to-r from-pink-500 to-cyan-500 text-white text-[10px] px-1 rounded font-bold">✨</span>
                )}
            </div>
            
            {/* Quality badge */}
            <div className="absolute top-1 right-1">
                <span 
                    className="text-[10px] px-1 rounded font-medium"
                    style={{ backgroundColor: quality.color + '40', color: quality.color }}
                >
                    {quality.label}
                </span>
            </div>
            
            {/* Own listing indicator */}
            {isOwn && (
                <div className="absolute bottom-10 left-0 right-0 bg-cyan-500/80 text-[10px] text-center py-0.5 font-bold">
                    YOUR LISTING
                </div>
            )}
        </button>
    );
};

// Listing Detail Panel
const ListingDetailPanel = ({ listing, onBuy, onCancel, onClose, isOwn, buying, canceling, userPebbles }) => {
    const rarity = RARITY_CONFIG[listing.itemSnapshot?.rarity] || RARITY_CONFIG.common;
    const quality = QUALITY_CONFIG[listing.itemSnapshot?.quality] || QUALITY_CONFIG.standard;
    const canAfford = userPebbles >= listing.price;
    
    return (
        <div className="bg-black/90 border-l border-white/10 w-80 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-white">Item Details</h3>
                <button onClick={onClose} className="text-white/50 hover:text-white">✕</button>
            </div>
            
            {/* Preview */}
            <div className={`p-4 bg-gradient-to-br ${rarity.bg} border-b border-white/10`}>
                <div className="flex justify-center">
                    <CosmeticPreview3D
                        templateId={listing.templateId}
                        category={listing.itemSnapshot?.category}
                        rarity={listing.itemSnapshot?.rarity}
                        isHolographic={listing.itemSnapshot?.isHolographic}
                        size={160}
                        autoRotate={true}
                        interactive={true}
                    />
                </div>
            </div>
            
            {/* Item Info */}
            <div className="p-4 flex-1 overflow-y-auto">
                <h4 className="text-lg font-bold text-white mb-2">
                    {listing.itemSnapshot?.name || 'Unknown Item'}
                </h4>
                
                <div className="space-y-2 text-sm">
                    {/* Rarity */}
                    <div className="flex justify-between items-center">
                        <TierTooltip type="rarity" value={rarity.label}>
                            <span className="text-white/60">Rarity</span>
                        </TierTooltip>
                        <span style={{ color: rarity.color }}>{rarity.emoji} {rarity.label}</span>
                    </div>
                    
                    {/* Quality */}
                    <div className="flex justify-between items-center">
                        <TierTooltip type="quality" value={quality.label}>
                            <span className="text-white/60">Quality</span>
                        </TierTooltip>
                        <span style={{ color: quality.color }}>{quality.label} ({quality.multiplier})</span>
                    </div>
                    
                    {/* Serial */}
                    <div className="flex justify-between items-center">
                        <InfoTooltip content={TOOLTIPS.serial.info}>
                            <span className="text-white/60">Serial #</span>
                        </InfoTooltip>
                        <span className="text-white font-mono">#{listing.itemSnapshot?.serialNumber}</span>
                    </div>
                    
                    {/* Special badges */}
                    {listing.itemSnapshot?.isFirstEdition && (
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Edition</span>
                            <BadgeTooltip type="edition">
                                <span className="text-amber-400">🏆 First Edition</span>
                            </BadgeTooltip>
                        </div>
                    )}
                    {listing.itemSnapshot?.isHolographic && (
                        <div className="flex justify-between items-center">
                            <span className="text-white/60">Effect</span>
                            <BadgeTooltip type="holographic">
                                <span className="text-pink-400">✨ Holographic</span>
                            </BadgeTooltip>
                        </div>
                    )}
                    
                    {/* Category */}
                    <div className="flex justify-between">
                        <span className="text-white/60">Category</span>
                        <span className="text-white capitalize">{listing.itemSnapshot?.category}</span>
                    </div>
                    
                    {/* Seller */}
                    <div className="flex justify-between">
                        <span className="text-white/60">Seller</span>
                        <span className="text-cyan-400">@{listing.sellerUsername}</span>
                    </div>
                    
                    {/* Listed */}
                    <div className="flex justify-between">
                        <span className="text-white/60">Listed</span>
                        <span className="text-white/80">
                            {new Date(listing.listedAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
                
                {/* Price */}
                <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <div className="text-white/60 text-xs mb-1">PRICE</div>
                    <div className="text-2xl font-bold text-amber-400 flex items-center gap-2">
                        <PebbleIcon size={24} />
                        {listing.price?.toLocaleString()}
                    </div>
                </div>
            </div>
            
            {/* Actions */}
            <div className="p-4 border-t border-white/10">
                {isOwn ? (
                    <button
                        onClick={onCancel}
                        disabled={canceling}
                        className="w-full py-3 rounded-lg font-bold transition-all bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                    >
                        {canceling ? 'Canceling...' : '❌ Cancel Listing'}
                    </button>
                ) : (
                    <>
                        <button
                            onClick={onBuy}
                            disabled={buying || !canAfford}
                            className={`w-full py-3 rounded-lg font-bold transition-all ${
                                canAfford 
                                    ? 'bg-green-600 hover:bg-green-500 text-white' 
                                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            } disabled:opacity-50`}
                        >
                            {buying ? 'Purchasing...' : canAfford ? '💰 Buy Now' : '❌ Not Enough Pebbles'}
                        </button>
                        {!canAfford && (
                            <p className="text-red-400 text-xs text-center mt-2">
                                You need {(listing.price - userPebbles).toLocaleString()} more Pebbles
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// Sell Modal Component
const SellModal = ({ item, onSell, onClose, selling }) => {
    const [price, setPrice] = useState('');
    const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
    
    const numPrice = parseInt(price) || 0;
    const isValidPrice = numPrice >= 1 && numPrice <= 1000000;
    
    // Stop propagation to prevent parent's useClickOutside from triggering
    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            <div className="bg-gray-900 rounded-xl border border-white/20 max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-900/50 to-purple-900/50">
                    <h3 className="font-bold text-white text-lg">📤 List Item for Sale</h3>
                    <button onClick={onClose} className="text-white/50 hover:text-white text-xl">✕</button>
                </div>
                
                {/* Item Preview */}
                <div className={`p-4 bg-gradient-to-br ${rarity.bg} flex items-center gap-4`}>
                    <div className="w-20 h-20 flex items-center justify-center">
                        <CosmeticThumbnail
                            templateId={item.templateId}
                            category={item.category}
                            assetKey={item.assetKey}
                            rarity={item.rarity}
                            isHolographic={item.isHolographic}
                            size={72}
                        />
                    </div>
                    <div>
                        <h4 className="font-bold text-white">{item.name}</h4>
                        <p className="text-sm" style={{ color: rarity.color }}>{rarity.emoji} {rarity.label}</p>
                        <p className="text-xs text-white/50">Serial #{item.serialNumber}</p>
                    </div>
                </div>
                
                {/* Price Input */}
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm text-white/70 mb-2">Set Your Price (Pebbles)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">🪨</span>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="Enter price..."
                                min="1"
                                max="1000000"
                                className="w-full bg-black/50 border border-white/20 rounded-lg py-3 pl-10 pr-4 text-white text-lg font-bold focus:border-cyan-500 focus:outline-none"
                            />
                        </div>
                        <p className="text-xs text-white/40 mt-1">Min: 1 • Max: 1,000,000</p>
                    </div>
                    
                    {/* Price Preview - No fees! */}
                    {numPrice > 0 && (
                        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                                <span className="text-white/80">You will receive</span>
                                <span className="text-green-400 font-bold text-lg">{numPrice.toLocaleString()} 🪨</span>
                            </div>
                            <p className="text-xs text-green-300/60 mt-1">No marketplace fees!</p>
                        </div>
                    )}
                    
                    {/* Warning */}
                    <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-200">
                        ⚠️ Once listed, this item cannot be equipped or modified until the listing is cancelled.
                    </div>
                </div>
                
                {/* Actions */}
                <div className="p-4 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-lg font-bold bg-gray-700 hover:bg-gray-600 text-white transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSell(numPrice)}
                        disabled={!isValidPrice || selling}
                        className="flex-1 py-3 rounded-lg font-bold bg-green-600 hover:bg-green-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {selling ? 'Listing...' : '📤 List for Sale'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ==================== MAIN COMPONENT ====================
const MarketplaceModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const { userData, isAuthenticated, walletAddress, send, registerCallbacks } = useMultiplayer();
    
    // Tab state
    const [activeTab, setActiveTab] = useState('browse');
    
    // Browse state
    const [listings, setListings] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [rarity, setRarity] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    
    // Selected listing
    const [selectedListing, setSelectedListing] = useState(null);
    const [buying, setBuying] = useState(false);
    const [canceling, setCanceling] = useState(false);
    
    // My Listings state
    const [myListings, setMyListings] = useState([]);
    const [myListingsLoading, setMyListingsLoading] = useState(false);
    
    // History state
    const [salesHistory, setSalesHistory] = useState([]);
    const [purchaseHistory, setPurchaseHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    
    // Sell modal state
    const [sellItem, setSellItem] = useState(null);
    const [selling, setSelling] = useState(false);
    
    // Inventory for selling
    const [inventory, setInventory] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    
    // Market stats
    const [stats, setStats] = useState(null);
    
    // Messages
    const [message, setMessage] = useState(null);
    
    useClickOutside(modalRef, onClose);
    useEscapeKey(onClose);
    
    // Register callbacks for marketplace messages - only when open to avoid conflicts
    useEffect(() => {
        if (!registerCallbacks || !isOpen) return;
        
        registerCallbacks({
            onMarketListings: (data) => {
                setListings(data.listings || []);
                setTotal(data.total || 0);
                setHasMore(data.hasMore || false);
                setLoading(false);
            },
            onMarketMyListings: (data) => {
                setMyListings(data.listings || []);
                setMyListingsLoading(false);
            },
            onMarketSalesHistory: (data) => {
                setSalesHistory(data.sales || []);
                setHistoryLoading(false);
            },
            onMarketPurchaseHistory: (data) => {
                setPurchaseHistory(data.purchases || []);
            },
            onMarketListResult: (data) => {
                setSelling(false);
                if (data.success) {
                    setSellItem(null);
                    // Show appropriate message
                    if (data.wasUnequipped) {
                        setMessage({ type: 'success', text: 'Item listed! (Automatically unequipped)' });
                    } else {
                        setMessage({ type: 'success', text: 'Item listed successfully!' });
                    }
                    fetchMyListings();
                    fetchInventory();
                } else {
                    setMessage({ type: 'error', text: data.message || 'Failed to list item' });
                }
                setTimeout(() => setMessage(null), 3000);
            },
            onMarketBuyResult: (data) => {
                setBuying(false);
                if (data.success) {
                    setSelectedListing(null);
                    setMessage({ type: 'success', text: `Purchased ${data.item?.name}!` });
                    fetchListings();
                } else {
                    setMessage({ type: 'error', text: data.message || 'Failed to purchase' });
                }
                setTimeout(() => setMessage(null), 3000);
            },
            onMarketCancelResult: (data) => {
                setCanceling(false);
                if (data.success) {
                    setSelectedListing(null);
                    setMessage({ type: 'success', text: 'Listing cancelled' });
                    fetchMyListings();
                    fetchListings();
                } else {
                    setMessage({ type: 'error', text: data.message || 'Failed to cancel' });
                }
                setTimeout(() => setMessage(null), 3000);
            },
            onMarketStats: (data) => {
                setStats(data);
            },
            onInventoryData: (data) => {
                setInventory(data.items || []);
                setInventoryLoading(false);
            },
            // Real-time updates
            onMarketNewListing: (data) => {
                // Add new listing to the top of the list (if browse tab is active)
                if (data.listing) {
                    setListings(prev => {
                        // Don't add if already exists
                        if (prev.some(l => l.listingId === data.listing.listingId)) return prev;
                        // Add to top, respect max display
                        return [data.listing, ...prev].slice(0, 50);
                    });
                    setTotal(prev => prev + 1);
                }
            },
            onMarketListingRemoved: (data) => {
                // Remove listing from view (sold or cancelled)
                if (data.listingId) {
                    setListings(prev => prev.filter(l => l.listingId !== data.listingId));
                    setMyListings(prev => prev.filter(l => l.listingId !== data.listingId));
                    // Clear selection if viewing removed listing
                    setSelectedListing(prev => prev?.listingId === data.listingId ? null : prev);
                    setTotal(prev => Math.max(0, prev - 1));
                }
            },
            onMarketAnnouncement: (data) => {
                // Show announcement as a message
                if (data.announcement) {
                    const { event, itemName, rarity, price, sellerUsername, buyerUsername } = data.announcement;
                    if (event === 'new_listing') {
                        setMessage({ 
                            type: 'info', 
                            text: `🏪 ${sellerUsername} listed ${itemName} for ${price?.toLocaleString()} 🪨`
                        });
                    } else if (event === 'sale') {
                        setMessage({ 
                            type: 'info', 
                            text: `💰 ${buyerUsername} purchased ${itemName}!`
                        });
                    }
                    setTimeout(() => setMessage(null), 4000);
                }
            }
        });
    }, [registerCallbacks, isOpen]); // Re-register when modal opens to ensure our callbacks are active
    
    // Fetch functions
    const fetchListings = useCallback((overridePage = null) => {
        setLoading(true);
        send?.({
            type: 'market_browse',
            page: overridePage || page,
            limit: 20,
            category: category !== 'all' ? category : null,
            rarity: rarity !== 'all' ? rarity : null,
            sortBy,
            search: search || null,
            minPrice: minPrice ? parseInt(minPrice) : null,
            maxPrice: maxPrice ? parseInt(maxPrice) : null
        });
    }, [send, page, category, rarity, sortBy, search, minPrice, maxPrice]);
    
    const fetchMyListings = useCallback(() => {
        setMyListingsLoading(true);
        send?.({ type: 'market_my_listings' });
    }, [send]);
    
    const fetchHistory = useCallback(() => {
        setHistoryLoading(true);
        send?.({ type: 'market_sales_history' });
        send?.({ type: 'market_purchase_history' });
    }, [send]);
    
    const fetchStats = useCallback(() => {
        send?.({ type: 'market_stats' });
    }, [send]);
    
    const fetchInventory = useCallback(() => {
        if (!isAuthenticated) {
            setInventory([]);
            setInventoryLoading(false);
            return;
        }
        setInventoryLoading(true);
        send?.({ type: 'inventory_get', limit: 100 }); // Request more items for sell view
    }, [send, isAuthenticated]);
    
    // Initial fetch
    useEffect(() => {
        if (!isOpen) return;
        fetchListings();
        fetchStats();
    }, [isOpen, fetchListings, fetchStats]);
    
    // Fetch on tab change
    useEffect(() => {
        if (!isOpen) return;
        if (activeTab === 'myListings') {
            fetchMyListings();
            if (isAuthenticated) {
                fetchInventory();
            }
        } else if (activeTab === 'history') {
            fetchHistory();
        }
    }, [activeTab, isOpen, fetchMyListings, fetchHistory, fetchInventory, isAuthenticated]);
    
    // Refetch on filter change - use page 1 override to avoid stale closure
    useEffect(() => {
        if (!isOpen || activeTab !== 'browse') return;
        setPage(1);
        fetchListings(1); // Force page 1
    }, [category, rarity, sortBy, search, minPrice, maxPrice]);
    
    // Actions
    const handleBuy = () => {
        if (!selectedListing || buying) return;
        setBuying(true);
        send?.({ type: 'market_buy', listingId: selectedListing.listingId });
    };
    
    const handleCancel = () => {
        if (!selectedListing || canceling) return;
        setCanceling(true);
        send?.({ type: 'market_cancel_listing', listingId: selectedListing.listingId });
    };
    
    const handleSell = (price) => {
        if (!sellItem || selling) return;
        setSelling(true);
        send?.({ type: 'market_list_item', itemInstanceId: sellItem.instanceId, price });
    };
    
    // Check if listing is user's own
    const isOwnListing = (listing) => listing.sellerId === walletAddress;
    
    // Get items that can be sold (not already listed)
    const sellableItems = inventory.filter(item => 
        item.tradable !== false && 
        !myListings.some(l => l.itemInstanceId === item.instanceId)
    );
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-2 sm:p-4">
            <div 
                ref={modalRef}
                className="bg-gray-900/95 backdrop-blur-sm rounded-xl border border-white/10 w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/50 to-cyan-900/50">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🏪</span>
                        <div>
                            <h2 className="text-xl font-bold text-white">Marketplace</h2>
                            <p className="text-xs text-white/60">Buy & sell cosmetics for Pebbles</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Stats */}
                        {stats && (
                            <div className="hidden sm:flex items-center gap-4 text-sm">
                                <div className="text-center">
                                    <div className="text-white/50 text-xs">Active</div>
                                    <div className="text-white font-bold">{stats.activeListings}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-white/50 text-xs">24h Sales</div>
                                    <div className="text-green-400 font-bold">{stats.totalSold24h}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-white/50 text-xs">24h Volume</div>
                                    <div className="text-amber-400 font-bold">{stats.volume24h?.toLocaleString()} 🪨</div>
                                </div>
                            </div>
                        )}
                        {/* Pebble Balance */}
                        <div className="bg-black/40 rounded-lg px-3 py-1.5 relative group">
                            <div className="flex items-center gap-1">
                                <div className="text-xs text-white/50">Your Pebbles</div>
                                <span className="text-white/30 hover:text-white/70 cursor-help text-[10px]">ⓘ</span>
                            </div>
                            <div className="text-amber-400 font-bold flex items-center gap-1">
                                <PebbleIcon size={14} />
                                {(userData?.pebbles || 0).toLocaleString()}
                            </div>
                            {/* Pebbles Info Tooltip */}
                            <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50">
                                <PebblesInfoPanel />
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white/50 hover:text-white text-2xl">✕</button>
                    </div>
                </div>
                
                {/* Message */}
                {message && (
                    <div className={`px-4 py-2 text-sm font-medium ${
                        message.type === 'success' ? 'bg-green-600/20 text-green-400' : 
                        message.type === 'info' ? 'bg-cyan-600/20 text-cyan-400' :
                        'bg-red-600/20 text-red-400'
                    }`}>
                        {message.text}
                    </div>
                )}
                
                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-white/10 text-white border-b-2 border-cyan-400'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* ==================== BROWSE TAB ==================== */}
                    {activeTab === 'browse' && (
                        <>
                            {/* Filters Sidebar */}
                            <div className="w-48 border-r border-white/10 p-3 space-y-4 overflow-y-auto hidden md:block">
                                {/* Search */}
                                <div>
                                    <label className="block text-xs text-white/50 mb-1">Search</label>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Item name..."
                                        className="w-full bg-black/50 border border-white/20 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                    />
                                </div>
                                
                                {/* Category */}
                                <div>
                                    <label className="block text-xs text-white/50 mb-1">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-black/50 border border-white/20 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Rarity */}
                                <div>
                                    <label className="block text-xs text-white/50 mb-1">Rarity</label>
                                    <select
                                        value={rarity}
                                        onChange={(e) => setRarity(e.target.value)}
                                        className="w-full bg-black/50 border border-white/20 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                    >
                                        {RARITIES.map(r => (
                                            <option key={r.id} value={r.id}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Sort */}
                                <div>
                                    <label className="block text-xs text-white/50 mb-1">Sort By</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="w-full bg-black/50 border border-white/20 rounded px-2 py-1.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                    >
                                        {SORT_OPTIONS.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Price Range */}
                                <div>
                                    <label className="block text-xs text-white/50 mb-1">Price Range</label>
                                    <div className="flex gap-1">
                                        <input
                                            type="number"
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            placeholder="Min"
                                            className="w-1/2 bg-black/50 border border-white/20 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                                        />
                                        <input
                                            type="number"
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            placeholder="Max"
                                            className="w-1/2 bg-black/50 border border-white/20 rounded px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                
                                {/* Clear Filters */}
                                <button
                                    onClick={() => {
                                        setSearch('');
                                        setCategory('all');
                                        setRarity('all');
                                        setSortBy('newest');
                                        setMinPrice('');
                                        setMaxPrice('');
                                    }}
                                    className="w-full py-2 text-xs text-white/50 hover:text-white border border-white/20 rounded hover:bg-white/5 transition-all"
                                >
                                    Clear Filters
                                </button>
                            </div>
                            
                            {/* Listings Grid */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {loading ? (
                                    <div className="flex items-center justify-center h-full">
                                        <Spinner className="text-4xl text-cyan-400" />
                                    </div>
                                ) : listings.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-white/50">
                                        <span className="text-6xl mb-4 opacity-50">🏪</span>
                                        <p className="text-lg">No listings found</p>
                                        <p className="text-sm">Try adjusting your filters</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-3 text-sm text-white/50">
                                            {total} listings found
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {listings.map(listing => (
                                                <ListingCard
                                                    key={listing.listingId}
                                                    listing={listing}
                                                    onClick={() => setSelectedListing(listing)}
                                                    isOwn={isOwnListing(listing)}
                                                />
                                            ))}
                                        </div>
                                        
                                        {/* Pagination */}
                                        {(hasMore || page > 1) && (
                                            <div className="flex justify-center gap-2 mt-4">
                                                <button
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                    disabled={page <= 1}
                                                    className="px-4 py-2 bg-white/10 rounded text-sm text-white disabled:opacity-30"
                                                >
                                                    ← Prev
                                                </button>
                                                <span className="px-4 py-2 text-white/50 text-sm">
                                                    Page {page}
                                                </span>
                                                <button
                                                    onClick={() => setPage(p => p + 1)}
                                                    disabled={!hasMore}
                                                    className="px-4 py-2 bg-white/10 rounded text-sm text-white disabled:opacity-30"
                                                >
                                                    Next →
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            
                            {/* Detail Panel */}
                            {selectedListing && (
                                <ListingDetailPanel
                                    listing={selectedListing}
                                    onBuy={handleBuy}
                                    onCancel={handleCancel}
                                    onClose={() => setSelectedListing(null)}
                                    isOwn={isOwnListing(selectedListing)}
                                    buying={buying}
                                    canceling={canceling}
                                    userPebbles={userData?.pebbles || 0}
                                />
                            )}
                        </>
                    )}
                    
                    {/* ==================== MY LISTINGS TAB ==================== */}
                    {activeTab === 'myListings' && (
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Sell New Item Section */}
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-white mb-3">📤 Sell an Item</h3>
                                {inventoryLoading ? (
                                    <div className="flex items-center gap-2 text-white/50">
                                        <Spinner /> Loading inventory...
                                    </div>
                                ) : sellableItems.length === 0 ? (
                                    <div className="bg-black/30 rounded-lg p-4 text-white/50 text-sm">
                                        No tradable items in inventory. Roll the gacha to get items!
                                    </div>
                                ) : (
                                    <div className="bg-black/30 rounded-lg p-3">
                                        <p className="text-xs text-white/50 mb-2">
                                            Select an item to list ({sellableItems.length} available)
                                        </p>
                                        <div 
                                            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
                                            onMouseDown={(e) => {
                                                const el = e.currentTarget;
                                                el.dataset.dragging = 'true';
                                                el.dataset.startX = e.pageX;
                                                el.dataset.scrollLeft = el.scrollLeft;
                                            }}
                                            onMouseMove={(e) => {
                                                const el = e.currentTarget;
                                                if (el.dataset.dragging !== 'true') return;
                                                e.preventDefault();
                                                const walk = (e.pageX - Number(el.dataset.startX)) * 1.5;
                                                el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
                                            }}
                                            onMouseUp={(e) => e.currentTarget.dataset.dragging = 'false'}
                                            onMouseLeave={(e) => e.currentTarget.dataset.dragging = 'false'}
                                            onTouchStart={(e) => {
                                                const el = e.currentTarget;
                                                el.dataset.dragging = 'true';
                                                el.dataset.startX = e.touches[0].pageX;
                                                el.dataset.scrollLeft = el.scrollLeft;
                                            }}
                                            onTouchMove={(e) => {
                                                const el = e.currentTarget;
                                                if (el.dataset.dragging !== 'true') return;
                                                const walk = (e.touches[0].pageX - Number(el.dataset.startX)) * 1.5;
                                                el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
                                            }}
                                            onTouchEnd={(e) => e.currentTarget.dataset.dragging = 'false'}
                                        >
                                            {sellableItems.slice(0, 20).map(item => {
                                                const r = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                                                return (
                                                    <button
                                                        key={item.instanceId}
                                                        onClick={(e) => {
                                                            // Prevent click if we were dragging
                                                            if (e.currentTarget.parentElement?.dataset.dragging === 'true') return;
                                                            setSellItem(item);
                                                        }}
                                                        className={`flex-shrink-0 w-16 h-16 rounded-lg border-2 ${r.border} bg-gradient-to-br ${r.bg} hover:border-white/50 transition-all overflow-hidden`}
                                                    >
                                                        <CosmeticThumbnail
                                                            templateId={item.templateId}
                                                            category={item.category}
                                                            assetKey={item.assetKey}
                                                            rarity={item.rarity}
                                                            isHolographic={item.isHolographic}
                                                            size={56}
                                                        />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Active Listings */}
                            <h3 className="text-lg font-bold text-white mb-3">
                                📋 Your Active Listings ({myListings.length})
                            </h3>
                            
                            {myListingsLoading ? (
                                <div className="flex items-center justify-center h-32">
                                    <Spinner className="text-4xl text-cyan-400" />
                                </div>
                            ) : myListings.length === 0 ? (
                                <div className="bg-black/30 rounded-lg p-6 text-center text-white/50">
                                    <span className="text-4xl mb-2 block">📭</span>
                                    <p>You have no active listings</p>
                                    <p className="text-sm">Select an item above to start selling!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {myListings.map(listing => (
                                        <ListingCard
                                            key={listing.listingId}
                                            listing={listing}
                                            onClick={() => setSelectedListing(listing)}
                                            isOwn={true}
                                        />
                                    ))}
                                </div>
                            )}
                            
                            {/* Detail panel for canceling */}
                            {selectedListing && isOwnListing(selectedListing) && (
                                <div 
                                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
                                    onClick={() => setSelectedListing(null)}
                                    onMouseDown={e => e.stopPropagation()}
                                >
                                    <div onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
                                        <ListingDetailPanel
                                            listing={selectedListing}
                                            onCancel={handleCancel}
                                            onClose={() => setSelectedListing(null)}
                                            isOwn={true}
                                            canceling={canceling}
                                            userPebbles={userData?.pebbles || 0}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* ==================== HISTORY TAB ==================== */}
                    {activeTab === 'history' && (
                        <div className="flex-1 overflow-y-auto p-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Sales */}
                                <div>
                                    <h3 className="text-lg font-bold text-green-400 mb-3">💰 Your Sales</h3>
                                    {historyLoading ? (
                                        <Spinner className="text-2xl" />
                                    ) : salesHistory.length === 0 ? (
                                        <div className="bg-black/30 rounded-lg p-4 text-white/50 text-sm">
                                            No sales yet
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {salesHistory.map(sale => (
                                                <div key={sale.listingId} className="bg-black/30 rounded-lg p-3 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded overflow-hidden">
                                                        <CosmeticThumbnail
                                                            templateId={sale.templateId}
                                                            category={sale.itemSnapshot?.category}
                                                            rarity={sale.itemSnapshot?.rarity}
                                                            size={40}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-white truncate">
                                                            {sale.itemSnapshot?.name}
                                                        </div>
                                                        <div className="text-xs text-white/50">
                                                            Sold to @{sale.buyerUsername}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-green-400 font-bold">
                                                            +{sale.sellerReceived?.toLocaleString()} 🪨
                                                        </div>
                                                        <div className="text-xs text-white/40">
                                                            {new Date(sale.soldAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Purchases */}
                                <div>
                                    <h3 className="text-lg font-bold text-cyan-400 mb-3">🛒 Your Purchases</h3>
                                    {historyLoading ? (
                                        <Spinner className="text-2xl" />
                                    ) : purchaseHistory.length === 0 ? (
                                        <div className="bg-black/30 rounded-lg p-4 text-white/50 text-sm">
                                            No purchases yet
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {purchaseHistory.map(purchase => (
                                                <div key={purchase.listingId} className="bg-black/30 rounded-lg p-3 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded overflow-hidden">
                                                        <CosmeticThumbnail
                                                            templateId={purchase.templateId}
                                                            category={purchase.itemSnapshot?.category}
                                                            rarity={purchase.itemSnapshot?.rarity}
                                                            size={40}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-white truncate">
                                                            {purchase.itemSnapshot?.name}
                                                        </div>
                                                        <div className="text-xs text-white/50">
                                                            From @{purchase.sellerUsername}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-amber-400 font-bold">
                                                            -{purchase.price?.toLocaleString()} 🪨
                                                        </div>
                                                        <div className="text-xs text-white/40">
                                                            {new Date(purchase.soldAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Sell Modal */}
            {sellItem && (
                <SellModal
                    item={sellItem}
                    onSell={handleSell}
                    onClose={() => setSellItem(null)}
                    selling={selling}
                />
            )}
        </div>
    );
};

export default MarketplaceModal;

