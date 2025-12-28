/**
 * InventoryModal - View and manage owned cosmetics
 * 
 * Features:
 * - Grid view of all owned cosmetics
 * - Filter by category, rarity, quality
 * - Sort by date, rarity, serial number, value
 * - Item detail panel with burn option
 * - Inventory slots and upgrade system
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useMultiplayer } from '../multiplayer';
import { useClickOutside, useEscapeKey } from '../hooks';
import CosmeticPreview3D from './CosmeticPreview3D';
import CosmeticThumbnail from './CosmeticThumbnail';
import { thumbnailCache } from './CosmeticThumbnailCache';
import PhantomWallet from '../wallet/PhantomWallet';

// Inventory upgrade costs SOL (paid to rake wallet like pebbles)
const INVENTORY_UPGRADE_SOL = 1; // 1 SOL for +200 slots
const INVENTORY_UPGRADE_SLOTS = 200;
const RAKE_WALLET = import.meta.env.VITE_RAKE_WALLET;

// Simple spinner component
const Spinner = ({ className = '' }) => (
    <div className={`animate-spin ${className}`}>⟳</div>
);

// Rarity colors and display
const RARITY_CONFIG = {
    common: { color: '#9CA3AF', bg: 'from-gray-500/20 to-gray-600/20', border: 'border-gray-500/30', emoji: '⚪', label: 'Common' },
    uncommon: { color: '#22C55E', bg: 'from-green-500/20 to-green-600/20', border: 'border-green-500/30', emoji: '🟢', label: 'Uncommon' },
    rare: { color: '#3B82F6', bg: 'from-blue-500/20 to-blue-600/20', border: 'border-blue-500/30', emoji: '🔵', label: 'Rare' },
    epic: { color: '#A855F7', bg: 'from-purple-500/20 to-purple-600/20', border: 'border-purple-500/30', emoji: '🟣', label: 'Epic' },
    legendary: { color: '#EC4899', bg: 'from-pink-500/20 to-pink-600/20', border: 'border-pink-500/30', emoji: '🟡', label: 'Legendary' },
    mythic: { color: '#EF4444', bg: 'from-red-500/20 to-red-600/20', border: 'border-red-500/30', emoji: '🔴', label: 'Mythic' },
    divine: { color: '#F59E0B', bg: 'from-amber-500/20 to-amber-600/20', border: 'border-amber-500/30', emoji: '✨', label: 'Divine' }
};

// Quality display
const QUALITY_CONFIG = {
    worn: { color: '#6B7280', label: 'Worn', multiplier: '0.7x' },
    standard: { color: '#9CA3AF', label: 'Standard', multiplier: '1x' },
    pristine: { color: '#60A5FA', label: 'Pristine', multiplier: '1.8x' },
    flawless: { color: '#C084FC', label: 'Flawless', multiplier: '4x' }
};

// Category icons
const CATEGORY_ICONS = {
    hat: '🎩',
    eyes: '👀',
    mouth: '👄',
    bodyItem: '👕',
    mount: '🐴',
    skin: '🎨'
};

const InventoryModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const { userData, isAuthenticated, walletAddress, send, registerCallbacks } = useMultiplayer();
    
    // Inventory state
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [maxSlots, setMaxSlots] = useState(150);
    const [upgradeInfo, setUpgradeInfo] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [rarityFilter, setRarityFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    
    // Selected item
    const [selectedItem, setSelectedItem] = useState(null);
    const [confirmBurn, setConfirmBurn] = useState(false);
    const [burning, setBurning] = useState(false);
    const [upgrading, setUpgrading] = useState(false);
    
    // Bulk selection
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    
    // Status messages
    const [message, setMessage] = useState(null);
    
    useClickOutside(modalRef, onClose);
    useEscapeKey(onClose);
    
    // Register callbacks
    useEffect(() => {
        const callbacks = {
            onInventoryData: (data) => {
                const newItems = data.items || [];
                setItems(newItems);
                setTotal(data.total || 0);
                setMaxSlots(data.maxSlots || 150);
                setUpgradeInfo(data.upgradeInfo || null);
                setHasMore(data.hasMore || false);
                setLoading(false);
                
                // Preload thumbnails in background (uses single shared WebGL context)
                if (newItems.length > 0) {
                    thumbnailCache.preloadThumbnails(newItems, 72).catch(console.error);
                }
            },
            onInventoryBurned: (data) => {
                setBurning(false);
                setConfirmBurn(false);
                setSelectedItem(null);
                setMessage({ type: 'success', text: `Burned for ${data.goldAwarded} gold!` });
                setTotal(data.inventoryCount);
                // Refresh inventory
                fetchInventory();
                setTimeout(() => setMessage(null), 3000);
            },
            onInventoryBulkBurned: (data) => {
                setBurning(false);
                setBulkMode(false);
                setSelectedIds(new Set());
                setMessage({ type: 'success', text: `Burned ${data.itemsBurned} items for ${data.totalGold} gold!` });
                setTotal(data.inventoryCount);
                fetchInventory();
                setTimeout(() => setMessage(null), 3000);
            },
            onInventoryUpgraded: (data) => {
                setUpgrading(false);
                setMaxSlots(data.newMaxSlots);
                setMessage({ type: 'success', text: `Inventory upgraded to ${data.newMaxSlots} slots!` });
                fetchInventory();
                setTimeout(() => setMessage(null), 3000);
            },
            onInventoryError: (data) => {
                setBurning(false);
                setUpgrading(false);
                setMessage({ type: 'error', text: data.message || 'An error occurred' });
                setTimeout(() => setMessage(null), 5000);
            }
        };
        registerCallbacks(callbacks);
    }, [registerCallbacks]);
    
    // Fetch inventory
    const fetchInventory = useCallback(() => {
        if (!isAuthenticated) return;
        
        setLoading(true);
        send({
            type: 'inventory_get',
            page,
            limit: 50,
            category: categoryFilter !== 'all' ? categoryFilter : null,
            rarity: rarityFilter !== 'all' ? rarityFilter : null,
            sortBy
        });
    }, [isAuthenticated, send, page, categoryFilter, rarityFilter, sortBy]);
    
    // Fetch on open and filter changes
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            fetchInventory();
        }
    }, [isOpen, isAuthenticated, fetchInventory]);
    
    // Handle burn
    const handleBurn = useCallback(() => {
        if (!selectedItem || burning) return;
        
        setBurning(true);
        send({
            type: 'inventory_burn',
            instanceId: selectedItem.instanceId
        });
    }, [selectedItem, burning, send]);
    
    // Handle bulk burn
    const handleBulkBurn = useCallback(() => {
        if (selectedIds.size === 0 || burning) return;
        
        if (!window.confirm(`Are you sure you want to burn ${selectedIds.size} items? This cannot be undone!`)) {
            return;
        }
        
        setBurning(true);
        send({
            type: 'inventory_bulk_burn',
            instanceIds: Array.from(selectedIds)
        });
    }, [selectedIds, burning, send]);
    
    // Handle upgrade - now uses SOL payment
    const handleUpgrade = useCallback(async () => {
        if (upgrading || !upgradeInfo?.canUpgrade) return;
        
        if (!isAuthenticated || !walletAddress) {
            setMessage({ type: 'error', text: 'Please connect your wallet first' });
            return;
        }
        
        if (!RAKE_WALLET) {
            setMessage({ type: 'error', text: 'Upgrade service not available' });
            return;
        }
        
        const confirmed = window.confirm(
            `Upgrade inventory for ${INVENTORY_UPGRADE_SOL} SOL?\n\n` +
            `• Current: ${maxSlots} slots\n` +
            `• After upgrade: ${maxSlots + INVENTORY_UPGRADE_SLOTS} slots\n\n` +
            `This will open your wallet to confirm the transaction.`
        );
        
        if (!confirmed) return;
        
        setUpgrading(true);
        setMessage(null);
        
        try {
            const wallet = PhantomWallet.getInstance();
            
            if (!wallet.isConnected()) {
                throw new Error('Wallet not connected');
            }
            
            // Send SOL to rake wallet
            const result = await wallet.sendSOL(RAKE_WALLET, INVENTORY_UPGRADE_SOL);
            
            if (!result.success) {
                throw new Error(result.message || result.error || 'Transaction failed');
            }
            
            console.log(`📦 Inventory upgrade tx: ${result.signature}`);
            
            // Notify server to verify and apply upgrade
            send({
                type: 'inventory_upgrade',
                txSignature: result.signature,
                solAmount: INVENTORY_UPGRADE_SOL
            });
            
        } catch (err) {
            console.error('Inventory upgrade error:', err);
            setUpgrading(false);
            
            let userMessage = err.message || 'Transaction failed';
            if (err.message?.includes('User rejected') || err.message?.includes('user rejected')) {
                userMessage = 'Transaction cancelled';
            } else if (err.message?.includes('insufficient') || err.message?.includes('Insufficient')) {
                userMessage = 'Insufficient SOL balance';
            }
            
            setMessage({ type: 'error', text: userMessage });
            setTimeout(() => setMessage(null), 5000);
        }
    }, [upgrading, upgradeInfo, isAuthenticated, walletAddress, maxSlots, send]);
    
    // Toggle bulk selection
    const toggleBulkSelect = useCallback((instanceId) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(instanceId)) {
                next.delete(instanceId);
            } else {
                next.add(instanceId);
            }
            return next;
        });
    }, []);
    
    // Calculate total burn value for selected items
    const selectedBurnValue = useMemo(() => {
        return items
            .filter(item => selectedIds.has(item.instanceId))
            .reduce((sum, item) => sum + (item.burnValue || 0), 0);
    }, [items, selectedIds]);
    
    if (!isOpen) return null;
    
    const usagePercent = Math.min(100, (total / maxSlots) * 100);
    const isNearFull = usagePercent >= 80;
    const isFull = usagePercent >= 100;
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                ref={modalRef}
                className="bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] border border-amber-500/30 shadow-2xl shadow-amber-500/10 overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600/30 to-orange-600/30 p-3 sm:p-4 border-b border-amber-500/30">
                    {/* Mobile: Compact header */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <span className="text-2xl sm:text-3xl shrink-0">📦</span>
                            <div className="min-w-0">
                                <h2 className="text-lg sm:text-xl font-bold text-white retro-text truncate">Inventory</h2>
                                <p className="text-amber-300/80 text-xs hidden sm:block">
                                    Manage your cosmetic collection
                                </p>
                            </div>
                        </div>
                        
                        {/* Slot Usage - Compact on mobile */}
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                            <div className="text-right">
                                <div className={`font-bold text-sm sm:text-lg ${isFull ? 'text-red-400' : isNearFull ? 'text-amber-400' : 'text-white'}`}>
                                    {total}/{maxSlots}
                                </div>
                                <div className="text-[10px] sm:text-xs text-white/60">slots</div>
                            </div>
                            
                            {/* Progress bar - smaller on mobile */}
                            <div className="w-12 sm:w-24 h-2 sm:h-3 bg-black/40 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full transition-all ${
                                        isFull ? 'bg-red-500' : isNearFull ? 'bg-amber-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                            
                            <button
                                onClick={onClose}
                                className="text-white/50 hover:text-white text-xl sm:text-2xl leading-none p-1"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                    
                    {/* Upgrade button - costs SOL */}
                    {isAuthenticated && (
                        <button
                            onClick={handleUpgrade}
                            disabled={upgrading}
                            className="mt-3 w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-700 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                            {upgrading ? (
                                <Spinner className="text-lg" />
                            ) : (
                                <>
                                    <span>⬆️</span>
                                    <span className="hidden sm:inline">Upgrade to {maxSlots + INVENTORY_UPGRADE_SLOTS} slots</span>
                                    <span className="sm:hidden">+{INVENTORY_UPGRADE_SLOTS} slots</span>
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                                        {INVENTORY_UPGRADE_SOL} SOL
                                    </span>
                                </>
                            )}
                        </button>
                    )}
                </div>
                
                {/* Filters - Responsive layout */}
                <div className="p-2 sm:p-3 bg-black/30 border-b border-white/10">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Category filter */}
                        <select
                            value={categoryFilter}
                            onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs sm:text-sm flex-1 sm:flex-none min-w-[100px]"
                        >
                            <option value="all">All Categories</option>
                            <option value="hat">🎩 Hats</option>
                            <option value="eyes">👀 Eyes</option>
                            <option value="mouth">👄 Mouths</option>
                            <option value="bodyItem">👕 Body</option>
                            <option value="mount">🐴 Mounts</option>
                            <option value="skin">🎨 Skins</option>
                        </select>
                        
                        {/* Rarity filter */}
                        <select
                            value={rarityFilter}
                            onChange={(e) => { setRarityFilter(e.target.value); setPage(1); }}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs sm:text-sm flex-1 sm:flex-none min-w-[100px]"
                        >
                            <option value="all">All Rarities</option>
                            <option value="divine">✨ Divine</option>
                            <option value="mythic">🔴 Mythic</option>
                            <option value="legendary">🟡 Legendary</option>
                            <option value="epic">🟣 Epic</option>
                            <option value="rare">🔵 Rare</option>
                            <option value="uncommon">🟢 Uncommon</option>
                            <option value="common">⚪ Common</option>
                        </select>
                        
                        {/* Sort */}
                        <select
                            value={sortBy}
                            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs sm:text-sm flex-1 sm:flex-none min-w-[100px]"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="rarity">Rarity ↓</option>
                            <option value="value">Value ↓</option>
                            <option value="serial">Serial #</option>
                        </select>
                        
                        {/* Bulk burn button */}
                        <button
                            onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                                bulkMode 
                                    ? 'bg-red-600 text-white' 
                                    : 'bg-gray-700 text-white/70 hover:bg-gray-600'
                            }`}
                        >
                            {bulkMode ? 'Cancel' : 'Bulk Burn'}
                        </button>
                    </div>
                </div>
                
                {/* Status message */}
                {message && (
                    <div className={`px-4 py-2 ${
                        message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                        {message.text}
                    </div>
                )}
                
                {/* Bulk burn bar */}
                {bulkMode && selectedIds.size > 0 && (
                    <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/30 flex items-center justify-between">
                        <span className="text-white">
                            {selectedIds.size} items selected = <span className="text-amber-400 font-bold">{selectedBurnValue} gold</span>
                        </span>
                        <button
                            onClick={handleBulkBurn}
                            disabled={burning}
                            className="px-4 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold text-sm flex items-center gap-2"
                        >
                            {burning ? <Spinner className="text-lg" /> : <span>🔥</span>}
                            Burn Selected
                        </button>
                    </div>
                )}
                
                {/* Content */}
                <div className="flex-1 overflow-hidden flex">
                    {/* Item Grid */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <Spinner className="text-4xl text-amber-400" />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-white/50">
                                <span className="text-6xl mb-4 opacity-50">📦</span>
                                <p className="text-lg">No items found</p>
                                <p className="text-sm">Roll the gacha to get cosmetics!</p>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                    {items.map((item) => {
                                        const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
                                        const isSelected = selectedItem?.instanceId === item.instanceId;
                                        const isBulkSelected = selectedIds.has(item.instanceId);
                                        
                                        return (
                                            <button
                                                key={item.instanceId}
                                                onClick={() => {
                                                    if (bulkMode) {
                                                        toggleBulkSelect(item.instanceId);
                                                    } else {
                                                        setSelectedItem(isSelected ? null : item);
                                                        setConfirmBurn(false);
                                                    }
                                                }}
                                                className={`aspect-square rounded-lg border-2 transition-all relative overflow-hidden ${
                                                    isSelected || isBulkSelected
                                                        ? 'border-amber-400 ring-2 ring-amber-400/50'
                                                        : `${rarity.border} hover:border-white/50`
                                                } bg-gradient-to-br ${rarity.bg}`}
                                            >
                                                {/* Cached thumbnail - no WebGL context per item! */}
                                                <CosmeticThumbnail
                                                    templateId={item.templateId}
                                                    category={item.category}
                                                    rarity={item.rarity}
                                                    isHolographic={item.isHolographic}
                                                    size={72}
                                                    className="w-full h-full"
                                                />
                                                
                                                {/* Rarity indicator dot */}
                                                <div 
                                                    className="absolute top-1 right-1 w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: rarity.color, boxShadow: `0 0 6px ${rarity.color}` }}
                                                />
                                                
                                                {/* Special badges */}
                                                <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5">
                                                    {item.isFirstEdition && (
                                                        <span className="text-[8px] bg-amber-500 text-black px-0.5 rounded font-bold shadow-lg">FE</span>
                                                    )}
                                                    {item.isHolographic && (
                                                        <span className="text-[8px] bg-pink-500 text-white px-0.5 rounded font-bold shadow-lg">H</span>
                                                    )}
                                                    {item.quality === 'flawless' && (
                                                        <span className="text-[8px] bg-purple-500 text-white px-0.5 rounded font-bold shadow-lg">FL</span>
                                                    )}
                                                    {item.quality === 'pristine' && (
                                                        <span className="text-[8px] bg-blue-500 text-white px-0.5 rounded font-bold shadow-lg">PR</span>
                                                    )}
                                                </div>
                                                
                                                {/* Bulk selection check */}
                                                {bulkMode && isBulkSelected && (
                                                    <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center pointer-events-none">
                                                        <span className="text-xl text-white drop-shadow-lg">✓</span>
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                {/* Pagination */}
                                <div className="flex items-center justify-center gap-4 mt-4">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg bg-gray-800 text-white disabled:opacity-50"
                                    >
                                        ◀
                                    </button>
                                    <span className="text-white">Page {page}</span>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={!hasMore}
                                        className="p-2 rounded-lg bg-gray-800 text-white disabled:opacity-50"
                                    >
                                        ▶
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {/* Item Detail Panel - Side panel on desktop, bottom sheet on mobile */}
                    {selectedItem && !bulkMode && (
                        <>
                            {/* Desktop: Side panel */}
                            <div className="hidden md:block w-72 bg-black/40 border-l border-white/10 p-4 overflow-y-auto">
                                <ItemDetailPanel
                                    item={selectedItem}
                                    confirmBurn={confirmBurn}
                                    setConfirmBurn={setConfirmBurn}
                                    burning={burning}
                                    onBurn={handleBurn}
                                    onClose={() => setSelectedItem(null)}
                                />
                            </div>
                            
                            {/* Mobile: Bottom sheet overlay */}
                            <div className="md:hidden fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-gray-900 via-slate-900 to-gray-900/95 border-t border-amber-500/30 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto shadow-2xl animate-slide-up">
                                <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-3" />
                                <ItemDetailPanel
                                    item={selectedItem}
                                    confirmBurn={confirmBurn}
                                    setConfirmBurn={setConfirmBurn}
                                    burning={burning}
                                    onBurn={handleBurn}
                                    onClose={() => setSelectedItem(null)}
                                    isMobile={true}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Check if item is "valuable" and requires extra confirmation
const isValuableItem = (item) => {
    const highRarities = ['legendary', 'mythic', 'divine'];
    return (
        item.isFirstEdition || 
        item.isHolographic || 
        highRarities.includes(item.rarity) ||
        item.quality === 'flawless'
    );
};

// Burn Section Component with double confirmation for valuable items
const BurnSection = ({ item, rarity, confirmBurn, setConfirmBurn, burning, onBurn }) => {
    const [finalConfirm, setFinalConfirm] = React.useState(false);
    const isValuable = isValuableItem(item);
    
    // Reset final confirm when item changes or confirmBurn resets
    React.useEffect(() => {
        if (!confirmBurn) setFinalConfirm(false);
    }, [confirmBurn]);
    
    const handleBurnClick = () => {
        if (isValuable && !finalConfirm) {
            setFinalConfirm(true);
        } else {
            onBurn();
        }
    };
    
    const getValueWarnings = () => {
        const warnings = [];
        if (item.isFirstEdition) warnings.push('🏆 First Edition (#1-3)');
        if (item.isHolographic) warnings.push('✨ Holographic');
        if (['legendary', 'mythic', 'divine'].includes(item.rarity)) {
            warnings.push(`💎 ${rarity.label} Rarity`);
        }
        if (item.quality === 'flawless') warnings.push('⭐ Flawless Quality');
        return warnings;
    };
    
    return (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
                <span className="text-red-300 text-sm">Burn Value</span>
                <span className="text-amber-400 font-bold text-lg flex items-center gap-1">
                    🪙 {item.burnValue}
                </span>
            </div>
            
            {!confirmBurn ? (
                <button
                    onClick={() => setConfirmBurn(true)}
                    className="w-full py-2 bg-red-600/50 hover:bg-red-600 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    🔥 Burn for Gold
                </button>
            ) : !finalConfirm && isValuable ? (
                /* First confirmation for valuable items */
                <div className="space-y-3">
                    <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-amber-300 font-bold mb-2">
                            ⚠️ VALUABLE ITEM DETECTED
                        </div>
                        <div className="text-amber-200/80 text-xs space-y-1">
                            {getValueWarnings().map((warning, i) => (
                                <div key={i}>{warning}</div>
                            ))}
                        </div>
                        <div className="text-white/70 text-xs mt-2 border-t border-amber-500/30 pt-2">
                            <strong>This item may have real resale value</strong> on the future marketplace. 
                            Burning is <strong className="text-red-400">permanent and cannot be undone</strong>.
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        <button
                            onClick={() => setConfirmBurn(false)}
                            className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-bold text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBurnClick}
                            className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-bold text-sm"
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            ) : (
                /* Final confirmation */
                <div className="space-y-2">
                    <div className={`text-center text-xs flex flex-col items-center gap-1 ${finalConfirm ? 'text-red-400' : 'text-red-300'}`}>
                        {finalConfirm ? (
                            <>
                                <span className="font-bold">🔥 FINAL WARNING 🔥</span>
                                <span>You are about to destroy a valuable item!</span>
                            </>
                        ) : (
                            <span>⚠️ This cannot be undone!</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setFinalConfirm(false);
                                setConfirmBurn(false);
                            }}
                            className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-bold text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleBurnClick}
                            disabled={burning}
                            className={`flex-1 py-2 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 ${
                                finalConfirm 
                                    ? 'bg-red-700 hover:bg-red-600 animate-pulse' 
                                    : 'bg-red-600 hover:bg-red-500'
                            }`}
                        >
                            {burning ? (
                                <Spinner className="text-lg" />
                            ) : (
                                <>🔥 {finalConfirm ? 'DESTROY FOREVER' : 'Confirm'}</>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Item Detail Panel Component
const ItemDetailPanel = ({ item, confirmBurn, setConfirmBurn, burning, onBurn, onClose, isMobile = false }) => {
    const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
    const quality = QUALITY_CONFIG[item.quality] || QUALITY_CONFIG.standard;
    
    return (
        <div className={isMobile ? "space-y-3" : "space-y-4"}>
            <div className="flex items-center justify-between">
                <h3 className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-lg'}`}>{item.name}</h3>
                <button onClick={onClose} className="text-white/50 hover:text-white text-xl p-1">
                    ✕
                </button>
            </div>
            
            {/* Mobile: Horizontal layout with preview and info side by side */}
            {isMobile ? (
                <div className="flex gap-4">
                    {/* 3D Preview */}
                    <div 
                        className={`relative rounded-xl overflow-hidden border-2 ${rarity.border} bg-gradient-to-br ${rarity.bg} shrink-0`}
                        style={{ 
                            boxShadow: item.isHolographic 
                                ? `0 0 20px ${rarity.color}40` 
                                : `0 0 15px ${rarity.color}30`
                        }}
                    >
                        <CosmeticPreview3D
                            templateId={item.templateId}
                            category={item.category}
                            rarity={item.rarity}
                            isHolographic={item.isHolographic}
                            size={120}
                            autoRotate={true}
                            interactive={true}
                        />
                        
                        {/* Serial badge */}
                        <div className="absolute top-1 left-1 bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-mono text-white/80">
                            #{item.serialNumber}
                        </div>
                        
                        {/* Special badges */}
                        <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                            {item.isFirstEdition && (
                                <span className="bg-amber-500 text-black px-1 py-0.5 rounded text-[10px] font-bold">FE</span>
                            )}
                            {item.isHolographic && (
                                <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-1 py-0.5 rounded text-[10px] font-bold">H</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 space-y-2">
                        {/* Rarity */}
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${rarity.bg} border ${rarity.border}`}>
                            <span className="text-white font-bold flex items-center gap-2 text-sm">
                                <span 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: rarity.color, boxShadow: `0 0 6px ${rarity.color}` }}
                                />
                                {rarity.label} • <span className="capitalize text-white/70">{item.category}</span>
                            </span>
                        </div>
                        
                        {/* Quality */}
                        <div className="flex justify-between text-sm px-1">
                            <span className="text-white/60">Quality</span>
                            <span style={{ color: quality.color }} className="font-bold">
                                {quality.label} ({quality.multiplier})
                            </span>
                        </div>
                        
                        {/* Minted date */}
                        <div className="flex justify-between text-sm px-1">
                            <span className="text-white/60">Minted</span>
                            <span className="text-white/80">{new Date(item.mintedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            ) : (
                /* Desktop: Vertical layout */
                <div 
                    className={`relative rounded-xl overflow-hidden border-2 ${rarity.border} bg-gradient-to-br ${rarity.bg}`}
                    style={{ 
                        boxShadow: item.isHolographic 
                            ? `0 0 20px ${rarity.color}40, inset 0 0 30px ${rarity.color}20` 
                            : `0 0 15px ${rarity.color}30`
                    }}
                >
                    <div className="flex items-center justify-center p-2">
                        <CosmeticPreview3D
                            templateId={item.templateId}
                            category={item.category}
                            rarity={item.rarity}
                            isHolographic={item.isHolographic}
                            size={140}
                            autoRotate={true}
                            interactive={true}
                        />
                    </div>
                    
                    {/* Serial badge */}
                    <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs font-mono text-white/80">
                        #{item.serialNumber}
                    </div>
                    
                    {/* Special badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                        {item.isFirstEdition && (
                            <span className="bg-amber-500 text-black px-1.5 py-0.5 rounded text-xs font-bold shadow-lg">
                                1st Edition
                            </span>
                        )}
                        {item.isHolographic && (
                            <span className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-1.5 py-0.5 rounded text-xs font-bold shadow-lg animate-pulse">
                                ✨ Holo
                            </span>
                        )}
                    </div>
                    
                    <p className="text-center text-xs text-white/50 pb-2">Drag to rotate</p>
                </div>
            )}
            
            {/* Rarity & Category - Desktop only (mobile shows inline) */}
            {!isMobile && (
                <div className={`p-3 rounded-lg bg-gradient-to-r ${rarity.bg} border ${rarity.border}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-white font-bold flex items-center gap-2">
                            <span 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: rarity.color, boxShadow: `0 0 8px ${rarity.color}` }}
                            />
                            {rarity.label}
                        </span>
                        <span className="text-white/70 text-sm capitalize">
                            {item.category}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Properties - Desktop only (mobile shows inline) */}
            {!isMobile && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-white/60">Serial</span>
                        <span className="text-white font-mono">#{item.serialNumber}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                        <span className="text-white/60">Quality</span>
                        <span style={{ color: quality.color }} className="font-bold">
                            {quality.label} ({quality.multiplier})
                        </span>
                    </div>
                    
                    {item.isHolographic && (
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">Holographic</span>
                            <span className="text-pink-400 font-bold flex items-center gap-1">
                                ✨ Yes (3x)
                            </span>
                        </div>
                    )}
                    
                    {item.isFirstEdition && (
                        <div className="flex justify-between text-sm">
                            <span className="text-white/60">First Edition</span>
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                                👑 Yes (2x)
                            </span>
                        </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                        <span className="text-white/60">Minted</span>
                        <span className="text-white/80">
                            {new Date(item.mintedAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Mobile: Additional properties not shown inline */}
            {isMobile && (
                <div className="flex flex-wrap gap-2 text-xs">
                    {item.isHolographic && (
                        <span className="bg-pink-500/20 text-pink-300 px-2 py-1 rounded-full flex items-center gap-1">
                            ✨ Holographic (3x)
                        </span>
                    )}
                    {item.isFirstEdition && (
                        <span className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full flex items-center gap-1">
                            👑 First Edition (2x)
                        </span>
                    )}
                </div>
            )}
            
            {/* Burn Value */}
            <BurnSection 
                item={item} 
                rarity={rarity}
                confirmBurn={confirmBurn}
                setConfirmBurn={setConfirmBurn}
                burning={burning}
                onBurn={onBurn}
            />
        </div>
    );
};

export default InventoryModal;

