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
import { createPortal } from 'react-dom';
import { useMultiplayer } from '../multiplayer';
import { useClickOutside, useEscapeKey } from '../hooks';
import CosmeticPreview3D from './CosmeticPreview3D';
import CosmeticThumbnail from './CosmeticThumbnail';
import { thumbnailCache } from './CosmeticThumbnailCache';
import PhantomWallet from '../wallet/PhantomWallet';
import NFTPhotoBooth from './NFTPhotoBooth';

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

// ==================== TOOLTIPS ====================
const TOOLTIPS = {
    rarity: {
        title: 'Rarity',
        desc: 'How rare this item is from gacha rolls.',
        tiers: [
            { label: 'Divine', color: '#F59E0B', info: '0.1% - Extremely rare!' },
            { label: 'Mythic', color: '#EF4444', info: '0.5% - Very rare' },
            { label: 'Legendary', color: '#EC4899', info: '2% - Highly sought' },
            { label: 'Epic', color: '#A855F7', info: '7% - Valuable' },
            { label: 'Rare', color: '#3B82F6', info: '15%' },
            { label: 'Uncommon', color: '#22C55E', info: '30%' },
            { label: 'Common', color: '#9CA3AF', info: '45.4%' }
        ]
    },
    quality: {
        title: 'Quality',
        desc: 'Affects burn value (gold when destroyed).',
        tiers: [
            { label: 'Flawless', color: '#C084FC', info: '4x burn - 2%' },
            { label: 'Pristine', color: '#60A5FA', info: '1.8x burn - 10%' },
            { label: 'Standard', color: '#9CA3AF', info: '1x burn - 60%' },
            { label: 'Worn', color: '#6B7280', info: '0.7x burn - 28%' }
        ]
    },
    edition: {
        title: 'First Edition',
        desc: 'Serial #1-3',
        info: '🏆 2x burn value. Only first 3 minted of each item!'
    },
    holographic: {
        title: 'Holographic',
        desc: '3% chance roll',
        info: '✨ Sparkles with rainbow effects. +1.5x burn value.'
    },
    burnValue: {
        title: 'Burn Value',
        desc: 'Gold earned when item is destroyed',
        info: 'Value = Base × Quality × Edition × Holographic. This gold can be used for gacha rolls!'
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
            className="fixed z-[99999] w-56 p-2 bg-gray-900 border border-white/20 rounded-lg shadow-2xl text-left pointer-events-none"
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

// Tier tooltip for rarity/quality - uses portal
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
            className="fixed z-[99999] w-64 p-2 bg-gray-900 border border-white/20 rounded-lg shadow-2xl pointer-events-none"
            style={{
                left: `${Math.max(8, coords.x - 270)}px`,
                top: `${coords.y}px`,
                transform: 'translateY(-50%)'
            }}
        >
            <div className="font-bold text-white text-sm mb-1">{data.title}</div>
            <div className="text-xs text-white/60 mb-2">{data.desc}</div>
            <div className="space-y-0.5">
                {data.tiers?.map(tier => (
                    <div 
                        key={tier.label}
                        className={`text-xs flex items-center gap-2 px-1 py-0.5 rounded ${
                            value?.toLowerCase() === tier.label.toLowerCase() ? 'bg-white/10' : ''
                        }`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tier.color }} />
                        <span style={{ color: tier.color }} className="w-16">{tier.label}</span>
                        <span className="text-white/50">{tier.info}</span>
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

// Badge tooltip - uses portal
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
            className="fixed z-[99999] w-56 p-2 bg-gray-900 border border-white/20 rounded-lg shadow-2xl pointer-events-none"
            style={{
                left: `${Math.max(8, coords.x - 230)}px`,
                top: `${coords.y}px`,
                transform: 'translateY(-50%)'
            }}
        >
            <div className="font-bold text-white text-sm">{data.title}</div>
            <div className="text-xs text-white/60">{data.desc}</div>
            <div className="text-xs text-white/80 mt-1">{data.info}</div>
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

const InventoryModal = ({ isOpen, onClose }) => {
    const modalRef = useRef(null);
    const { userData, isAuthenticated, walletAddress, send, registerCallbacks, updateAppearance } = useMultiplayer();
    
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
    
    // Reset mint confirmation when item changes
    useEffect(() => {
        setConfirmMint(false);
    }, [selectedItem?.instanceId]);
    
    // Sell item state
    const [sellItem, setSellItem] = useState(null);
    const [selling, setSelling] = useState(false);
    
    // NFT mint confirmation
    const [confirmMint, setConfirmMint] = useState(false);
    
    // Photo booth for NFT minting
    const [showPhotoBooth, setShowPhotoBooth] = useState(false);
    const [photoBoothItem, setPhotoBoothItem] = useState(null);
    
    // Bulk selection
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    
    // NFT minting
    const [minting, setMinting] = useState(false);
    const [mintInfo, setMintInfo] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    
    // Status messages
    const [message, setMessage] = useState(null);
    
    useClickOutside(modalRef, onClose);
    useEscapeKey(onClose);
    
    // Ref to hold fetchInventory so callbacks always get the latest version
    const fetchInventoryRef = useRef(null);
    
    // Fetch inventory function
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
    
    // Keep ref updated
    useEffect(() => {
        fetchInventoryRef.current = fetchInventory;
    }, [fetchInventory]);
    
    // Helper to call fetchInventory via ref (always gets latest)
    const refreshInventory = useCallback(() => {
        fetchInventoryRef.current?.();
    }, []);
    
    // Register callbacks - re-register when modal opens to ensure our callbacks are active
    useEffect(() => {
        if (!isOpen) return; // Only register when open to avoid conflicts with MarketplaceModal
        
        const callbacks = {
            onInventoryData: (data) => {
                const newItems = data.items || [];
                setItems(newItems);
                setTotal(data.total || 0);
                setMaxSlots(data.maxSlots || 150);
                setUpgradeInfo(data.upgradeInfo || null);
                setHasMore(data.hasMore || false);
                setLoading(false);
                
                // Update selectedItem if it exists in new data (to refresh NFT status etc)
                setSelectedItem(prev => {
                    if (!prev) return null;
                    const updated = newItems.find(i => i.instanceId === prev.instanceId);
                    return updated || prev;
                });
                
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
                refreshInventory();
                setTimeout(() => setMessage(null), 3000);
            },
            onInventoryBulkBurned: (data) => {
                setBurning(false);
                setBulkMode(false);
                setSelectedIds(new Set());
                setMessage({ type: 'success', text: `Burned ${data.itemsBurned} items for ${data.totalGold} gold!` });
                setTotal(data.inventoryCount);
                refreshInventory();
                setTimeout(() => setMessage(null), 3000);
            },
            onInventoryUpgraded: (data) => {
                setUpgrading(false);
                setMaxSlots(data.newMaxSlots);
                setMessage({ type: 'success', text: `Inventory upgraded to ${data.newMaxSlots} slots!` });
                refreshInventory();
                setTimeout(() => setMessage(null), 3000);
            },
            onInventoryError: (data) => {
                setBurning(false);
                setUpgrading(false);
                setMessage({ type: 'error', text: data.message || 'An error occurred' });
                setTimeout(() => setMessage(null), 5000);
            },
            // Marketplace listing result
            onMarketListResult: (data) => {
                setSelling(false);
                if (data.success) {
                    setSellItem(null);
                    setSelectedItem(null); // Close detail panel
                    
                    // Show appropriate message
                    if (data.wasUnequipped) {
                        setMessage({ type: 'success', text: 'Item listed! (Automatically unequipped)' });
                    } else {
                        setMessage({ type: 'success', text: 'Item listed on marketplace!' });
                    }
                    
                    refreshInventory(); // Refresh to show item is now listed
                } else {
                    setMessage({ type: 'error', text: data.message || 'Failed to list item' });
                }
                setTimeout(() => setMessage(null), 3000);
            },
            // NFT mint info response
            onNftMintInfo: (data) => {
                setMintInfo(data);
            },
            // NFT image upload response
            onNftUploadImageResponse: (data) => {
                if (!data.success) {
                    setMessage({ type: 'error', text: data.message || 'Failed to upload image' });
                    setShowPhotoBooth(true); // Re-open photo booth on error
                    setTimeout(() => setMessage(null), 5000);
                }
            },
            // NFT check mintable response
            onNftCheckMintableResponse: (data) => {
                if (!data.canMint) {
                    setMinting(false);
                    if (data.error === 'ALREADY_MINTED') {
                        setMessage({ type: 'info', text: `Already minted as NFT: ${data.mintAddress?.slice(0,8)}...` });
                    } else {
                        setMessage({ type: 'error', text: data.message || `Cannot mint: ${data.error}` });
                    }
                    setTimeout(() => setMessage(null), 5000);
                }
            },
            // NFT build transaction response
            onNftBuildMintTxResponse: (data) => {
                console.log('🎨 Received nft_build_mint_tx_response:', data);
                
                if (!data.success) {
                    setMinting(false);
                    if (data.error === 'INSUFFICIENT_PEBBLES') {
                        setMessage({ 
                            type: 'error', 
                            text: `Not enough Pebbles! Need ${data.required}, you have ${data.current}.`
                        });
                    } else {
                        setMessage({ type: 'error', text: data.message || 'Failed to build mint transaction' });
                    }
                    setTimeout(() => setMessage(null), 5000);
                    return;
                }
                
                // Validate transaction data exists
                if (!data.transaction) {
                    console.error('🎨 Missing transaction in response:', data);
                    setMinting(false);
                    setMessage({ type: 'error', text: 'Server returned empty transaction' });
                    setTimeout(() => setMessage(null), 5000);
                    return;
                }
                
                // Show fee charged message if applicable
                if (data.pebblesFeeCharged > 0) {
                    setMessage({ type: 'info', text: `${data.pebblesFeeCharged} Pebbles charged. Confirm in wallet...` });
                } else {
                    setMessage({ type: 'info', text: 'Confirm transaction in wallet...' });
                }
                
                // Transaction built - trigger wallet signing
                handleNftSign(data);
            },
            // NFT confirm mint response
            onNftConfirmMintResponse: (data) => {
                console.log('🎨 NFT confirm response:', data);
                setMinting(false);
                if (data.success) {
                    const solscanUrl = `https://solscan.io/token/${data.mintAddress}`;
                    setMessage({ 
                        type: 'success', 
                        text: `NFT minted successfully!`,
                        link: solscanUrl,
                        linkText: 'View on Solscan'
                    });
                    
                    // Update selected item to show NFT badge immediately
                    setSelectedItem(prev => prev?.instanceId === data.instanceId 
                        ? { ...prev, nftMintAddress: data.mintAddress } 
                        : prev
                    );
                    
                    refreshInventory(); // Refresh to show NFT badge
                    // Keep success message longer
                    setTimeout(() => setMessage(null), 15000);
                } else {
                    console.error('🎨 NFT mint failed:', data.error, data.message);
                    setMessage({ type: 'error', text: data.message || `Mint failed: ${data.error}` });
                    setTimeout(() => setMessage(null), 8000);
                }
            }
        };
        registerCallbacks(callbacks);
        
        // Request NFT mint info on open
        if (isAuthenticated) {
            send({ type: 'nft_get_mint_info' });
        }
    }, [registerCallbacks, isOpen, isAuthenticated, send, refreshInventory]);
    
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
    
    // Handle list for sale - opens sell modal
    const handleListForSale = useCallback((item) => {
        setSellItem(item);
    }, []);
    
    // Handle equip item - update appearance with this cosmetic
    const handleEquip = useCallback((item) => {
        if (!updateAppearance || !userData?.appearance) return;
        
        // Map category to appearance key
        const categoryToKey = {
            hat: 'hat',
            bodyItem: 'bodyItem',
            eyes: 'eyes',
            mouth: 'mouth',
            mount: 'mount'
        };
        
        const key = categoryToKey[item.category];
        if (!key) {
            console.warn('Unknown category for equip:', item.category);
            return;
        }
        
        // Build new appearance with this item equipped
        const newAppearance = {
            ...userData.appearance,
            [key]: item.assetKey
        };
        
        updateAppearance(newAppearance);
        setMessage({ type: 'success', text: `Equipped ${item.name}!` });
        setTimeout(() => setMessage(null), 2000);
    }, [updateAppearance, userData?.appearance]);
    
    // Handle sell submission
    const handleSell = useCallback((price) => {
        if (!sellItem || selling) return;
        
        setSelling(true);
        send({
            type: 'market_list_item',
            itemInstanceId: sellItem.instanceId,
            price
        });
    }, [sellItem, selling, send]);
    
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
    
    // Handle mint as NFT - open photo booth first
    const handleMintNft = useCallback(() => {
        if (minting || !mintInfo?.enabled || !selectedItem) return;
        setPhotoBoothItem(selectedItem);
        setShowPhotoBooth(true);
    }, [minting, mintInfo, selectedItem]);
    
    // Handle photo captured from booth - upload to server then show confirmation
    const handlePhotoCaptured = useCallback((imageData) => {
        if (!photoBoothItem) return;
        
        setUploadingImage(true);
        
        // Send image to server
        send({
            type: 'nft_upload_image',
            instanceId: photoBoothItem.instanceId,
            imageData
        });
        
        // Close photo booth and show confirmation
        setShowPhotoBooth(false);
        setConfirmMint(true);
        setUploadingImage(false);
    }, [photoBoothItem, send]);
    
    // Actually execute the mint after confirmation
    const executeMint = useCallback((item) => {
        if (minting || !item) return;
        
        setMinting(true);
        setConfirmMint(false);
        send({
            type: 'nft_build_mint_tx',
            instanceId: item.instanceId
        });
    }, [minting, send]);
    
    // Handle NFT transaction signing (called from callback)
    // Uses same pattern as SolanaPayment.js for consistency
    const handleNftSign = useCallback(async (txData) => {
        console.log('🎨 handleNftSign called with:', txData);
        
        try {
            // Validate txData
            if (!txData || !txData.transaction) {
                throw new Error(`Invalid transaction data received`);
            }
            
            const wallet = PhantomWallet.getInstance();
            const provider = wallet.getProvider();
            
            if (!provider) {
                throw new Error('Phantom wallet not found. Please install Phantom.');
            }
            
            console.log('🎨 Decoding transaction...');
            
            // Decode the base64 transaction to Uint8Array
            const txBuffer = Uint8Array.from(atob(txData.transaction), c => c.charCodeAt(0));
            
            // Import solana web3 classes
            const { Transaction, Connection } = await import('@solana/web3.js');
            const transaction = Transaction.from(txBuffer);
            
            // Create connection (same as other payment flows)
            const rpcUrl = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
            const connection = new Connection(rpcUrl, 'confirmed');
            
            console.log('🎨 Transaction deserialized, requesting signature...');
            
            // Use same pattern as SolanaPayment.js - try sendTransaction first
            let signature;
            const hasSendTransaction = provider.sendTransaction && typeof provider.sendTransaction === 'function';
            
            if (hasSendTransaction) {
                try {
                    console.log('🎨 Using Phantom sendTransaction...');
                    signature = await provider.sendTransaction(transaction, connection, {
                        skipPreflight: true,
                        preflightCommitment: 'confirmed'
                    });
                    console.log('🎨 Transaction sent via sendTransaction!');
                } catch (sendError) {
                    // Fallback to sign + send
                    console.warn('🎨 sendTransaction failed, using fallback:', sendError.message);
                    const signedTx = await provider.signTransaction(transaction);
                    signature = await connection.sendRawTransaction(signedTx.serialize(), {
                        skipPreflight: true,
                        preflightCommitment: 'confirmed'
                    });
                    console.log('🎨 Transaction sent via fallback!');
                }
            } else {
                // Fallback: sign then send
                console.log('🎨 Using signTransaction + sendRawTransaction fallback...');
                const signedTx = await provider.signTransaction(transaction);
                signature = await connection.sendRawTransaction(signedTx.serialize(), {
                    skipPreflight: true,
                    preflightCommitment: 'confirmed'
                });
                console.log('🎨 Transaction sent via fallback!');
            }
            
            console.log('🎨 NFT mint tx sent:', signature);
            setMessage({ type: 'info', text: `Transaction sent! Waiting for confirmation...` });
            
            // Confirm with server
            console.log('🎨 Sending nft_confirm_mint to server...');
            console.log('   instanceId:', txData.instanceId);
            console.log('   mintAddress:', txData.mintAddress);
            console.log('   txSignature:', signature);
            
            send({
                type: 'nft_confirm_mint',
                instanceId: txData.instanceId,
                mintAddress: txData.mintAddress,
                txSignature: signature
            });
            
        } catch (err) {
            console.error('🎨 NFT sign/send error:', err);
            setMinting(false);
            
            let msg = err.message || 'Transaction failed';
            if (err.code === 4001 || msg.includes('User rejected') || msg.includes('user rejected')) {
                msg = 'Transaction cancelled';
            }
            
            setMessage({ type: 'error', text: msg });
            setTimeout(() => setMessage(null), 5000);
        }
    }, [send]);
    
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
            const result = await wallet.sendSOL(
                RAKE_WALLET, 
                INVENTORY_UPGRADE_SOL,
                `WaddleBet: Inventory upgrade (+200 slots)`
            );
            
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
            .filter(item => selectedIds.has(item.instanceId) && item.tradable !== false)
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
                        message.type === 'success' ? 'bg-green-500/20 text-green-400' : 
                        message.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                    }`}>
                        {message.text}
                        {message.link && (
                            <a 
                                href={message.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="ml-2 underline hover:text-white"
                            >
                                {message.linkText || 'View'}
                            </a>
                        )}
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
                                        const isListed = item.isListed;
                                        
                                        return (
                                            <button
                                                key={item.instanceId}
                                                onClick={() => {
                                                    // Don't allow bulk selecting listed items
                                                    if (bulkMode && !isListed) {
                                                        toggleBulkSelect(item.instanceId);
                                                    } else if (!bulkMode) {
                                                        setSelectedItem(isSelected ? null : item);
                                                        setConfirmBurn(false);
                                                    }
                                                }}
                                                className={`aspect-square rounded-lg border-2 transition-all relative overflow-hidden ${
                                                    isListed 
                                                        ? 'border-cyan-500/50 opacity-60 cursor-default'
                                                        : isSelected || isBulkSelected
                                                            ? 'border-amber-400 ring-2 ring-amber-400/50'
                                                            : `${rarity.border} hover:border-white/50`
                                                } bg-gradient-to-br ${rarity.bg}`}
                                            >
                                                {/* Cached thumbnail - no WebGL context per item! */}
                                                <CosmeticThumbnail
                                                    templateId={item.templateId}
                                                    category={item.category}
                                                    assetKey={item.assetKey}
                                                    rarity={item.rarity}
                                                    isHolographic={item.isHolographic}
                                                    size={72}
                                                    className="w-full h-full"
                                                />
                                                
                                                {/* Listed overlay */}
                                                {isListed && (
                                                    <div className="absolute inset-0 bg-cyan-900/40 flex items-center justify-center">
                                                        <span className="text-[10px] bg-cyan-600 text-white px-1.5 py-0.5 rounded font-bold shadow-lg">
                                                            🏪 LISTED
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {/* NFT badge - top left */}
                                                {item.nftMintAddress && !isListed && (
                                                    <div className="absolute top-0.5 left-0.5 bg-purple-600 text-white px-1 py-0.5 rounded text-[8px] font-bold shadow-lg">
                                                        NFT
                                                    </div>
                                                )}
                                                
                                                {/* Rarity indicator dot */}
                                                {!isListed && (
                                                    <div 
                                                        className="absolute top-1 right-1 w-2 h-2 rounded-full"
                                                        style={{ backgroundColor: rarity.color, boxShadow: `0 0 6px ${rarity.color}` }}
                                                    />
                                                )}
                                                
                                                {/* Special badges */}
                                                {!isListed && (
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
                                                )}
                                                
                                                {/* Bulk selection check */}
                                                {bulkMode && isBulkSelected && !isListed && (
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
                                    onEquip={handleEquip}
                                    onListForSale={handleListForSale}
                                    onMintNft={handleMintNft}
                                    confirmMint={confirmMint}
                                    setConfirmMint={setConfirmMint}
                                    onExecuteMint={executeMint}
                                    minting={minting}
                                    mintInfo={mintInfo}
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
                                    onEquip={handleEquip}
                                    onListForSale={handleListForSale}
                                    onMintNft={handleMintNft}
                                    confirmMint={confirmMint}
                                    setConfirmMint={setConfirmMint}
                                    onExecuteMint={executeMint}
                                    minting={minting}
                                    mintInfo={mintInfo}
                                    onClose={() => setSelectedItem(null)}
                                    isMobile={true}
                                />
                            </div>
                        </>
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
            
            {/* NFT Photo Booth */}
            <NFTPhotoBooth
                isOpen={showPhotoBooth}
                appearance={userData?.appearance || { 
                    ...userData?.customization, 
                    characterType: userData?.characterType || 'penguin' 
                }}
                item={photoBoothItem}
                onCapture={handlePhotoCaptured}
                onClose={() => {
                    setShowPhotoBooth(false);
                    setPhotoBoothItem(null);
                }}
            />
        </div>
    );
};

// Sell Modal Component for listing items
const SellModal = ({ item, onSell, onClose, selling }) => {
    const [price, setPrice] = React.useState('');
    const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
    
    const numPrice = parseInt(price) || 0;
    const isValidPrice = numPrice >= 1 && numPrice <= 1000000;
    
    return (
        <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
        >
            <div className="bg-gray-900 rounded-xl border border-white/20 max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-900/50 to-purple-900/50">
                    <h3 className="font-bold text-white text-lg">🏪 List Item for Sale</h3>
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
                    
                    {/* Price Preview */}
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
    const isNotTradable = item.tradable === false;
    
    // If item is not tradable (promo/achievement), show message instead of burn button
    if (isNotTradable) {
        return (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-purple-300 text-sm">
                    <span className="text-lg">🎁</span>
                    <div>
                        <div className="font-semibold">Promo Item</div>
                        <div className="text-xs text-purple-200/70">This item was unlocked via promo code and cannot be burned or traded.</div>
                    </div>
                </div>
            </div>
        );
    }
    
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
                <InfoTooltip content={TOOLTIPS.burnValue.info}>
                    <span className="text-red-300 text-sm">Burn Value</span>
                </InfoTooltip>
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

// Mint NFT Section Component with inline confirmation
const MintNftSection = ({ item, mintInfo, confirmMint, setConfirmMint, minting, onMintNft, onExecuteMint }) => {
    const networkCost = mintInfo?.estimatedCost?.networkCost || 0.015;
    const solFee = mintInfo?.solFee || 0;
    const pebblesFee = mintInfo?.pebblesFee || 0;
    const totalSol = mintInfo?.estimatedCost?.sol || networkCost + solFee;
    const royaltyPercent = mintInfo?.royaltyPercent || 5;
    
    if (minting) {
        return (
            <div className="p-4 bg-purple-500/20 border border-purple-500/40 rounded-lg">
                <div className="flex items-center justify-center gap-3 text-purple-300">
                    <Spinner className="text-2xl" />
                    <div>
                        <div className="font-bold">Minting NFT...</div>
                        <div className="text-xs text-purple-200/70">Please confirm in your wallet</div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (!confirmMint) {
        // Show initial button with cost preview
        return (
            <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-white/70">Mint as NFT</span>
                    <div className="flex gap-1">
                        <span className="bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded text-xs font-mono">
                            ~{totalSol.toFixed(3)} SOL
                        </span>
                        {pebblesFee > 0 && (
                            <span className="bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded text-xs">
                                +{pebblesFee} 🪨
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={onMintNft}
                    className="w-full py-2 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all flex items-center justify-center gap-2"
                >
                    <span>🎨</span>
                    <span>Mint as NFT</span>
                </button>
            </div>
        );
    }
    
    // Show confirmation details
    return (
        <div className="p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-purple-300 font-bold">
                <span>🎨</span>
                <span>Mint as Solana NFT</span>
            </div>
            
            {/* Cost Breakdown */}
            <div className="bg-black/30 rounded-lg p-2 space-y-1 text-xs">
                <div className="flex justify-between text-white/60">
                    <span>Network cost</span>
                    <span className="font-mono">~{networkCost.toFixed(4)} SOL</span>
                </div>
                {solFee > 0 && (
                    <div className="flex justify-between text-white/60">
                        <span>Platform fee</span>
                        <span className="font-mono">{solFee} SOL</span>
                    </div>
                )}
                {pebblesFee > 0 && (
                    <div className="flex justify-between text-amber-300/80">
                        <span>Platform fee</span>
                        <span className="font-mono">{pebblesFee} 🪨</span>
                    </div>
                )}
                <div className="flex justify-between text-white font-bold pt-1 border-t border-white/10">
                    <span>Total</span>
                    <span className="font-mono">~{totalSol.toFixed(3)} SOL{pebblesFee > 0 ? ` + ${pebblesFee} 🪨` : ''}</span>
                </div>
            </div>
            
            {/* What you get */}
            <div className="text-xs text-white/70 space-y-1">
                <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Permanent on-chain NFT</span>
                </div>
                <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Trade on Magic Eden, Tensor, etc.</span>
                </div>
                <div className="flex items-start gap-2">
                    <span className="text-green-400">✓</span>
                    <span>Rendered penguin image included</span>
                </div>
                <div className="flex items-start gap-2">
                    <span className="text-purple-400">ℹ</span>
                    <span>{royaltyPercent}% royalty on resales</span>
                </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-2">
                <button
                    onClick={() => setConfirmMint(false)}
                    className="flex-1 py-2 rounded-lg font-bold bg-gray-600 hover:bg-gray-500 text-white transition-all text-sm"
                >
                    Cancel
                </button>
                <button
                    onClick={() => onExecuteMint(item)}
                    className="flex-1 py-2 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all text-sm flex items-center justify-center gap-1"
                >
                    <span>✨</span>
                    <span>Confirm Mint</span>
                </button>
            </div>
        </div>
    );
};

// Item Detail Panel Component
const ItemDetailPanel = ({ item, confirmBurn, setConfirmBurn, burning, onBurn, onEquip, onListForSale, onMintNft, confirmMint, setConfirmMint, onExecuteMint, minting, mintInfo, onClose, isMobile = false }) => {
    const rarity = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
    const quality = QUALITY_CONFIG[item.quality] || QUALITY_CONFIG.standard;
    const canSell = item.tradable !== false;
    const canMintNft = item.tradable !== false && !item.nftMintAddress && mintInfo?.enabled;
    const canEquip = !item.isListed && ['hat', 'bodyItem', 'eyes', 'mouth', 'mount'].includes(item.category);
    
    // Reset confirmMint when item changes
    React.useEffect(() => {
        setConfirmMint?.(false);
    }, [item.instanceId, setConfirmMint]);
    
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
                        <TierTooltip type="rarity" value={rarity.label}>
                            <span className="text-white font-bold flex items-center gap-2">
                                <span 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: rarity.color, boxShadow: `0 0 8px ${rarity.color}` }}
                                />
                                {rarity.label}
                            </span>
                        </TierTooltip>
                        <span className="text-white/70 text-sm capitalize">
                            {item.category}
                        </span>
                    </div>
                </div>
            )}
            
            {/* Properties - Desktop only (mobile shows inline) */}
            {!isMobile && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm items-center">
                        <InfoTooltip content="Lower serial numbers are rarer and more valuable. #1 is the first ever minted!">
                            <span className="text-white/60">Serial</span>
                        </InfoTooltip>
                        <span className="text-white font-mono">#{item.serialNumber}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm items-center">
                        <TierTooltip type="quality" value={quality.label}>
                            <span className="text-white/60">Quality</span>
                        </TierTooltip>
                        <span style={{ color: quality.color }} className="font-bold">
                            {quality.label} ({quality.multiplier})
                        </span>
                    </div>
                    
                    {item.isHolographic && (
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">Holographic</span>
                            <BadgeTooltip type="holographic">
                                <span className="text-pink-400 font-bold flex items-center gap-1">
                                    ✨ Yes (1.5x)
                                </span>
                            </BadgeTooltip>
                        </div>
                    )}
                    
                    {item.isFirstEdition && (
                        <div className="flex justify-between text-sm items-center">
                            <span className="text-white/60">First Edition</span>
                            <BadgeTooltip type="edition">
                                <span className="text-amber-400 font-bold flex items-center gap-1">
                                    👑 Yes (2x)
                                </span>
                            </BadgeTooltip>
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
            
            {/* Listed on Marketplace Notice */}
            {item.isListed && (
                <div className="p-4 bg-cyan-900/30 border border-cyan-500/50 rounded-lg">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏪</span>
                        <div>
                            <div className="font-bold text-cyan-300">Listed for Sale</div>
                            <div className="text-xs text-cyan-200/70">
                                This item is currently on the marketplace. Cancel the listing to equip, burn, or modify it.
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* NFT Status Badge - if already minted */}
            {item.nftMintAddress && (
                <div className="p-3 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/40 rounded-lg">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🎨</span>
                            <div>
                                <div className="text-purple-300 font-bold text-sm">Minted as NFT</div>
                                <div className="text-xs text-purple-200/60 font-mono">
                                    {item.nftMintAddress.slice(0, 8)}...{item.nftMintAddress.slice(-6)}
                                </div>
                            </div>
                        </div>
                        <a
                            href={`https://solscan.io/token/${item.nftMintAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1 bg-purple-600/50 hover:bg-purple-600 rounded text-xs text-white transition-colors"
                        >
                            View ↗
                        </a>
                    </div>
                </div>
            )}
            
            {/* Mint as NFT Section - only show if not minted and mintable */}
            {canMintNft && !item.isListed && onMintNft && (
                <MintNftSection
                    item={item}
                    mintInfo={mintInfo}
                    confirmMint={confirmMint}
                    setConfirmMint={setConfirmMint}
                    minting={minting}
                    onMintNft={onMintNft}
                    onExecuteMint={onExecuteMint}
                />
            )}
            
            {/* Equip Button - only show if not listed and is equippable category */}
            {canEquip && onEquip && (
                <button
                    onClick={() => onEquip(item)}
                    className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white transition-all flex items-center justify-center gap-2"
                >
                    <span>👕</span>
                    <span>Equip Item</span>
                </button>
            )}
            
            {/* List for Sale Button - only show if not already listed */}
            {canSell && onListForSale && !item.isListed && (
                <button
                    onClick={() => onListForSale(item)}
                    className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white transition-all flex items-center justify-center gap-2"
                >
                    <span>🏪</span>
                    <span>List for Sale</span>
                </button>
            )}
            
            {/* Burn Value - only show if not listed */}
            {!item.isListed && (
                <BurnSection 
                    item={item} 
                    rarity={rarity}
                    confirmBurn={confirmBurn}
                    setConfirmBurn={setConfirmBurn}
                    burning={burning}
                    onBurn={onBurn}
                />
            )}
        </div>
    );
};

export default InventoryModal;

