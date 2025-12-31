/**
 * SpaceEntryModal - Modal shown when trying to enter an space
 * Displays entry requirements and handles entry fee payments
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext.jsx';

const SpaceEntryModal = ({ 
    isOpen, 
    onClose, 
    spaceData,
    entryCheck, // Result from canEnter() - { canEnter, reason, ... }
    walletAddress,
    onEntrySuccess
}) => {
    const { send } = useMultiplayer();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Listen for entry payment result from server
    useEffect(() => {
        if (!isOpen) return;
        
        const ws = window.__multiplayerWs;
        if (!ws) return;
        
        const handleMessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                
                if (msg.type === 'space_pay_entry_result') {
                    setIsLoading(false);
                    if (msg.success) {
                        if (onEntrySuccess) {
                            onEntrySuccess();
                        }
                        onClose();
                    } else {
                        setError(msg.message || msg.error || 'Payment failed');
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        ws.addEventListener('message', handleMessage);
        
        return () => {
            ws.removeEventListener('message', handleMessage);
        };
    }, [isOpen, onEntrySuccess, onClose]);
    
    const handlePayEntryFee = useCallback(() => {
        if (!walletAddress) {
            setError('Please connect your wallet');
            return;
        }
        
        if (!spaceData?.spaceId) {
            setError('No space selected');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        // Send entry payment request via WebSocket
        // Note: Payment is handled server-side for now
        // TODO: Implement x402 payment flow
        send({
            type: 'space_pay_entry',
            spaceId: spaceData.spaceId,
            paymentPayload: null // Will be implemented with x402
        });
        
    }, [walletAddress, spaceData?.spaceId, send]);
    
    if (!isOpen) return null;
    
    const { reason, message, tokenRequired, paymentAmount, requiresPayment } = entryCheck || {};
    
    // Get entry fee token info from space data
    const entryFeeToken = spaceData?.entryFeeToken || spaceData?.entryFee;
    const feeTokenSymbol = entryFeeToken?.tokenSymbol || 'TOKEN';
    const feeTokenAddress = entryFeeToken?.tokenAddress;
    
    // Determine display based on denial reason
    const getReasonDisplay = () => {
        switch (reason) {
            case 'SPACE_LOCKED':
                return {
                    icon: '🔒',
                    title: 'Space Locked',
                    description: 'This space is private. Only the owner can enter.',
                    color: 'red'
                };
            case 'TOKEN_REQUIRED':
                return {
                    icon: '🪙',
                    title: 'Token Required',
                    description: `You need to hold ${tokenRequired?.minimum || 1} ${tokenRequired?.symbol || 'tokens'} to enter.`,
                    color: 'purple'
                };
            case 'ENTRY_FEE_REQUIRED':
                return {
                    icon: '💰',
                    title: 'Entry Fee Required',
                    description: `One-time entry fee: ${paymentAmount?.toLocaleString() || 0} ${feeTokenSymbol}`,
                    color: 'yellow',
                    canPay: true,
                    feeTokenSymbol,
                    feeTokenAddress
                };
            default:
                return {
                    icon: '❌',
                    title: 'Cannot Enter',
                    description: message || 'You cannot enter this space.',
                    color: 'red'
                };
        }
    };
    
    const display = getReasonDisplay();
    const colorClasses = {
        red: 'from-red-600/20 to-red-900/20 border-red-500/30',
        purple: 'from-purple-600/20 to-purple-900/20 border-purple-500/30',
        yellow: 'from-yellow-600/20 to-yellow-900/20 border-yellow-500/30'
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className={`relative z-10 w-full max-w-sm mx-4 bg-gradient-to-b ${colorClasses[display.color]} rounded-2xl shadow-2xl border overflow-hidden`}>
                {/* Header */}
                <div className="px-6 py-4 text-center border-b border-white/10">
                    <div className="text-4xl mb-2">{display.icon}</div>
                    <h2 className="text-xl font-bold text-white">{display.title}</h2>
                </div>
                
                {/* Content */}
                <div className="p-6 text-center space-y-4">
                    <p className="text-slate-300">{display.description}</p>
                    
                    {/* Owner Info */}
                    {spaceData?.ownerUsername && (
                        <div className="text-sm text-slate-400">
                            Owner: <span className="text-white font-medium">{spaceData.ownerUsername}</span>
                        </div>
                    )}
                    
                    {/* Token Requirement Details */}
                    {reason === 'TOKEN_REQUIRED' && tokenRequired && (
                        <div className="bg-slate-800/50 rounded-lg p-3 text-sm">
                            <div className="text-slate-400">Token Address:</div>
                            <div className="text-purple-400 font-mono text-xs break-all">
                                {tokenRequired.address}
                            </div>
                        </div>
                    )}
                    
                    {/* Entry Fee Payment */}
                    {display.canPay && (
                        <>
                            {/* Show token info */}
                            {display.feeTokenAddress && (
                                <div className="bg-slate-800/50 rounded-lg p-2 text-xs">
                                    <div className="text-slate-400">Payment Token:</div>
                                    <div className="text-yellow-400 font-mono text-[10px] break-all">
                                        {display.feeTokenAddress}
                                    </div>
                                </div>
                            )}
                            
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-2 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}
                            
                            <button
                                onClick={handlePayEntryFee}
                                disabled={isLoading || !walletAddress}
                                className={`w-full py-3 rounded-lg font-bold transition-all ${
                                    isLoading || !walletAddress
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-400 hover:to-amber-400'
                                }`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : !walletAddress ? (
                                    'Connect Wallet to Pay'
                                ) : (
                                    `💰 Pay ${paymentAmount?.toLocaleString() || 0} ${display.feeTokenSymbol || 'TOKEN'}`
                                )}
                            </button>
                            
                            <p className="text-xs text-slate-500">
                                One-time payment to space owner - you won't be charged again.
                            </p>
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10">
                    <button
                        onClick={onClose}
                        className="w-full py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                        {display.canPay ? 'Cancel' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SpaceEntryModal;


