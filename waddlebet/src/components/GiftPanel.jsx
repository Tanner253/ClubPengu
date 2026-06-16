/**
 * GiftPanel - Send gifts to other players
 * Supports: Gold, Pebbles, Items, SPL Tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';
import CosmeticThumbnail from './CosmeticThumbnail';
import { useTokenValidation, TOKEN_VALIDATION_STATE } from '../hooks/useTokenValidation';
import { sendSPLToken } from '../wallet/SolanaPayment';

const GIFT_CONFIG = {
    gold: {
        title: '🪙 Send Gold',
        description: 'Send gold coins to this player',
        color: '#EAB308',
        presets: [10, 50, 100, 500],
        min: 1,
        max: 100000
    },
    pebbles: {
        title: '🪨 Send Pebbles',
        description: 'Send Pebbles to this player',
        color: '#6B7280',
        presets: [10, 50, 100, 500],
        min: 1,
        max: 100000
    },
    item: {
        title: '🎒 Send Item',
        description: 'Gift a cosmetic item from your inventory',
        color: '#8B5CF6'
    },
    spl: {
        title: '🪙 Send SPL Token',
        description: 'Send any SPL token',
        color: '#14B8A6'
    }
};

const GiftPanel = ({ targetPlayer, giftType, onClose }) => {
    const { send, isAuthenticated, userData, walletAddress } = useMultiplayer();
    const config = GIFT_CONFIG[giftType] || GIFT_CONFIG.gold;
    
    // Token validation hook for SPL transfers
    const {
        validationState: tokenValidationState,
        tokenMetadata,
        userBalance: tokenBalance,
        error: tokenValidationError,
        validateTokenDebounced,
        resetValidation
    } = useTokenValidation(walletAddress);
    
    // State
    const [amount, setAmount] = useState(config.presets?.[0] || 10);
    const [customAmount, setCustomAmount] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, sending, success, error
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [recipientWallet, setRecipientWallet] = useState(null);
    
    // For items
    const [inventory, setInventory] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    
    // For SPL tokens
    const [tokenMint, setTokenMint] = useState('');
    const [tokenAmount, setTokenAmount] = useState('');
    
    // Validate token when mint address changes
    useEffect(() => {
        if (giftType === 'spl' && tokenMint) {
            validateTokenDebounced(tokenMint);
        } else {
            resetValidation();
        }
    }, [giftType, tokenMint, validateTokenDebounced, resetValidation]);
    
    // Request recipient wallet on mount
    useEffect(() => {
        if (targetPlayer?.id) {
            setStatus('loading');
            send({
                type: 'gift_get_recipient_info',
                targetPlayerId: targetPlayer.id
            });
        }
    }, [targetPlayer?.id, send]);
    
    // Load inventory for item gifts
    useEffect(() => {
        if (giftType === 'item' && isAuthenticated) {
            setInventoryLoading(true);
            send({ type: 'inventory_get', page: 1, limit: 100 });
        }
    }, [giftType, isAuthenticated, send]);
    
    // Listen for server messages
    useEffect(() => {
        const ws = window.__multiplayerWs;
        if (!ws) return;
        
        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // Recipient info
                if (data.type === 'gift_recipient_info') {
                    if (data.error) {
                        setError(data.message || 'Player not authenticated');
                        setStatus('error');
                    } else if (data.walletAddress) {
                        setRecipientWallet(data.walletAddress);
                        setStatus('idle');
                    } else {
                        setError('Player is not authenticated');
                        setStatus('error');
                    }
                }
                
                // Inventory data (for item gifts)
                if (data.type === 'inventory_data') {
                    // Filter to tradable items only
                    const tradableItems = (data.items || []).filter(item => 
                        item.tradable !== false && !item.isListed
                    );
                    setInventory(tradableItems);
                    setInventoryLoading(false);
                }
                
                // Gift result
                if (data.type === 'gift_result') {
                    if (data.success) {
                        setSuccess(data.message || 'Gift sent successfully!');
                        setStatus('success');
                        setTimeout(() => onClose?.(), 2000);
                    } else {
                        setError(data.message || data.error || 'Failed to send gift');
                        setStatus('error');
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [onClose]);
    
    // Handle preset click
    const handlePresetClick = (value) => {
        setAmount(value);
        setCustomAmount('');
    };
    
    // Handle custom amount
    const handleCustomAmountChange = (e) => {
        const value = e.target.value;
        setCustomAmount(value);
        const parsed = parseInt(value);
        if (!isNaN(parsed) && parsed > 0) {
            setAmount(parsed);
        }
    };
    
    // Send gift
    const handleSendGift = useCallback(async () => {
        if (!isAuthenticated) {
            setError('You must be connected to send gifts');
            return;
        }
        
        if (!recipientWallet) {
            setError('Recipient is not authenticated');
            return;
        }
        
        setStatus('sending');
        setError(null);
        
        try {
            if (giftType === 'gold') {
                if (amount < 1 || amount > (userData?.coins || 0)) {
                    setError(`Invalid amount. You have ${userData?.coins || 0} gold`);
                    setStatus('error');
                    return;
                }
                send({
                    type: 'gift_send_gold',
                    recipientPlayerId: targetPlayer.id,
                    recipientWallet,
                    amount
                });
            } else if (giftType === 'pebbles') {
                if (amount < 1 || amount > (userData?.pebbles || 0)) {
                    setError(`Invalid amount. You have ${userData?.pebbles || 0} pebbles`);
                    setStatus('error');
                    return;
                }
                send({
                    type: 'gift_send_pebbles',
                    recipientPlayerId: targetPlayer.id,
                    recipientWallet,
                    amount
                });
            } else if (giftType === 'item') {
                if (!selectedItem) {
                    setError('Please select an item to gift');
                    setStatus('error');
                    return;
                }
                send({
                    type: 'gift_send_item',
                    recipientPlayerId: targetPlayer.id,
                    recipientWallet,
                    itemInstanceId: selectedItem.instanceId
                });
            } else if (giftType === 'spl') {
                if (!tokenMint || !tokenAmount) {
                    setError('Please enter token mint and amount');
                    setStatus('error');
                    return;
                }
                
                // Validate token first
                if (tokenValidationState !== TOKEN_VALIDATION_STATE.VALID) {
                    setError('Please enter a valid token address');
                    setStatus('error');
                    return;
                }
                
                const sendAmount = parseFloat(tokenAmount);
                if (isNaN(sendAmount) || sendAmount <= 0) {
                    setError('Please enter a valid amount');
                    setStatus('error');
                    return;
                }
                
                // Check balance
                if (sendAmount > tokenBalance) {
                    setError(`Insufficient balance. You have ${tokenBalance.toLocaleString()} ${tokenMetadata?.symbol || 'tokens'}`);
                    setStatus('error');
                    return;
                }
                
                // Execute actual SPL token transfer (client-side via wallet)
                try {
                    const result = await sendSPLToken({
                        recipientAddress: recipientWallet,
                        tokenMintAddress: tokenMint,
                        amount: sendAmount,
                        memo: `Gift to ${targetPlayer.name}`
                    });
                    
                    if (result.success) {
                        // Notify server of the transfer (for logging purposes)
                        send({
                            type: 'gift_spl_completed',
                            recipientPlayerId: targetPlayer.id,
                            recipientWallet,
                            tokenMint,
                            amount: sendAmount,
                            signature: result.signature,
                            tokenSymbol: tokenMetadata?.symbol || 'TOKEN'
                        });
                        
                        setSuccess(`Sent ${sendAmount.toLocaleString()} ${tokenMetadata?.symbol || 'tokens'} to ${targetPlayer.name}!`);
                        setStatus('success');
                        setTimeout(() => onClose?.(), 2500);
                        return; // Don't continue to server message handler
                    } else {
                        setError(result.message || 'Transaction failed');
                        setStatus('error');
                        return;
                    }
                } catch (txError) {
                    console.error('SPL transfer error:', txError);
                    setError(txError.message || 'Transaction failed');
                    setStatus('error');
                    return;
                }
            }
        } catch (err) {
            console.error('Gift error:', err);
            setError(err.message || 'Failed to send gift');
            setStatus('error');
        }
    }, [isAuthenticated, recipientWallet, targetPlayer, amount, giftType, selectedItem, tokenMint, tokenAmount, userData, send]);
    
    if (!targetPlayer || !giftType) return null;
    
    const panelContent = (
        <div 
            data-player-modal="true"
            className="fixed inset-0 z-[10100] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
            onTouchStart={(e) => e.stopPropagation()}
        >
            <div 
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/10 shadow-2xl p-5 w-[360px] max-w-[95vw] max-h-[90vh] overflow-y-auto pointer-events-auto overscroll-contain"
                style={{ WebkitOverflowScrolling: 'touch' }}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
                data-no-camera="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold" style={{ color: config.color }}>
                        {config.title}
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-white/50 hover:text-white text-xl p-1"
                    >
                        ✕
                    </button>
                </div>
                
                {/* Recipient */}
                <div className="bg-white/5 rounded-xl p-4 mb-4 text-center">
                    <div className="text-white font-bold text-lg">{targetPlayer.name}</div>
                    <div className="text-white/40 text-xs font-mono">
                        {recipientWallet ? `${recipientWallet.slice(0, 6)}...${recipientWallet.slice(-4)}` : 'Loading...'}
                    </div>
                </div>
                
                {/* Gold/Pebbles Amount Selection */}
                {(giftType === 'gold' || giftType === 'pebbles') && (
                    <>
                        <div className="mb-4">
                            <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Amount</div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {config.presets.map(preset => (
                                    <button
                                        key={preset}
                                        onClick={() => handlePresetClick(preset)}
                                        disabled={status === 'sending'}
                                        className={`py-2 rounded-lg font-bold text-sm transition-all ${
                                            amount === preset && !customAmount
                                                ? 'bg-white/20 border-2'
                                                : 'bg-white/5 hover:bg-white/10 border border-white/10'
                                        }`}
                                        style={{ borderColor: amount === preset && !customAmount ? config.color : undefined, color: '#fff' }}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                placeholder="Custom amount"
                                value={customAmount}
                                onChange={handleCustomAmountChange}
                                disabled={status === 'sending'}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-center focus:border-white/30 focus:outline-none"
                                min={config.min}
                                max={config.max}
                            />
                        </div>
                        
                        {/* Balance */}
                        <div className="text-center text-sm text-white/50 mb-4">
                            Your {giftType === 'gold' ? '🪙 Gold' : '🪨 Pebbles'}: <span className="font-bold text-white">{giftType === 'gold' ? (userData?.coins || 0) : (userData?.pebbles || 0)}</span>
                        </div>
                    </>
                )}
                
                {/* Item Selection */}
                {giftType === 'item' && (
                    <div className="mb-4">
                        <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Select Item</div>
                        {inventoryLoading ? (
                            <div className="text-center text-white/50 py-8">Loading inventory...</div>
                        ) : inventory.length === 0 ? (
                            <div className="text-center text-white/50 py-8">No tradable items in inventory</div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2 max-h-[200px] overflow-y-auto p-1">
                                {inventory.map(item => (
                                    <button
                                        key={item.instanceId}
                                        onClick={() => setSelectedItem(item)}
                                        disabled={status === 'sending'}
                                        className={`aspect-square rounded-lg border-2 transition-all overflow-hidden ${
                                            selectedItem?.instanceId === item.instanceId
                                                ? 'border-purple-500 ring-2 ring-purple-500/50'
                                                : 'border-white/10 hover:border-white/30'
                                        }`}
                                    >
                                        <CosmeticThumbnail
                                            templateId={item.templateId}
                                            category={item.category}
                                            assetKey={item.assetKey}
                                            rarity={item.rarity}
                                            size={56}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                        {selectedItem && (
                            <div className="mt-2 text-center text-sm text-white">
                                Selected: <span className="font-bold">{selectedItem.name}</span> #{selectedItem.serialNumber}
                            </div>
                        )}
                    </div>
                )}
                
                {/* SPL Token */}
                {giftType === 'spl' && (
                    <div className="mb-4 space-y-3">
                        <div>
                            <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Token Mint Address</div>
                            <input
                                type="text"
                                placeholder="Enter SPL token mint address"
                                value={tokenMint}
                                onChange={(e) => setTokenMint(e.target.value)}
                                disabled={status === 'sending'}
                                className={`w-full bg-white/5 border rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none ${
                                    tokenValidationState === TOKEN_VALIDATION_STATE.VALID 
                                        ? 'border-green-500/50 focus:border-green-500' 
                                        : tokenValidationState === TOKEN_VALIDATION_STATE.INVALID
                                            ? 'border-red-500/50 focus:border-red-500'
                                            : 'border-white/10 focus:border-white/30'
                                }`}
                            />
                            {/* Token validation status */}
                            <div className="mt-1.5 min-h-[20px]">
                                {tokenValidationState === TOKEN_VALIDATION_STATE.VALIDATING && (
                                    <span className="text-xs text-white/50">⏳ Validating token...</span>
                                )}
                                {tokenValidationState === TOKEN_VALIDATION_STATE.VALID && tokenMetadata && (
                                    <span className="text-xs text-green-400">
                                        ✅ {tokenMetadata.symbol || 'Token'} {tokenMetadata.isKnown ? '(Verified)' : ''}
                                    </span>
                                )}
                                {tokenValidationState === TOKEN_VALIDATION_STATE.INVALID && (
                                    <span className="text-xs text-red-400">❌ {tokenValidationError || 'Invalid token'}</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="text-white/60 text-xs mb-2 uppercase tracking-wide">Amount</div>
                            <input
                                type="number"
                                placeholder="Amount to send"
                                value={tokenAmount}
                                onChange={(e) => setTokenAmount(e.target.value)}
                                disabled={status === 'sending'}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-center focus:border-white/30 focus:outline-none"
                                step="any"
                                min="0"
                            />
                        </div>
                        
                        {/* Token Balance Display */}
                        {tokenValidationState === TOKEN_VALIDATION_STATE.VALID && (
                            <div className="text-center text-sm text-white/50">
                                Your Balance: <span className={`font-bold ${tokenBalance > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {tokenBalance.toLocaleString()} {tokenMetadata?.symbol || 'tokens'}
                                </span>
                            </div>
                        )}
                        
                        <div className="text-center text-xs text-amber-400/70">
                            ⚠️ This will prompt a wallet transaction
                        </div>
                    </div>
                )}
                
                {/* Status Messages */}
                {error && (
                    <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-4">
                        ❌ {error}
                    </div>
                )}
                
                {success && (
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 text-green-400 text-sm mb-4">
                        ✅ {success}
                    </div>
                )}
                
                {/* Send Button */}
                <button
                    onClick={handleSendGift}
                    disabled={status === 'loading' || status === 'sending' || status === 'success' || !recipientWallet}
                    className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                        background: status === 'success' 
                            ? 'linear-gradient(90deg, #22C55E, #16A34A)'
                            : `linear-gradient(90deg, ${config.color}, ${config.color}CC)`
                    }}
                >
                    {status === 'loading' && '⏳ Loading...'}
                    {status === 'sending' && '📤 Sending...'}
                    {status === 'success' && '✅ Sent!'}
                    {status === 'error' && '↻ Try Again'}
                    {status === 'idle' && recipientWallet && `🎁 Send Gift`}
                    {status === 'idle' && !recipientWallet && '⏳ Loading...'}
                </button>
                
                {/* Info */}
                <div className="text-center text-white/30 text-xs mt-3">
                    Gifts are one-way and cannot be reversed
                </div>
            </div>
        </div>
    );

    return createPortal(panelContent, document.body);
};

export default GiftPanel;

