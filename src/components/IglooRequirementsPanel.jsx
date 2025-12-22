/**
 * IglooRequirementsPanel - Shows entry requirements for a rented igloo
 * Displays token gate requirements with balance check, entry fee status, and unified enter button
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext.jsx';
import { payIglooEntryFee } from '../wallet/SolanaPayment.js';

/**
 * Abbreviate a wallet address: "abc123...xyz789"
 */
const abbreviateWallet = (wallet) => {
    if (!wallet || wallet.length < 12) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
};

/**
 * Copyable address component with click-to-copy and visual feedback
 */
const CopyableAddress = ({ address, label }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = async () => {
        if (!address) return;
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };
    
    if (!address) return null;
    
    return (
        <div className="bg-black/40 rounded-lg p-2 mt-2">
            <div className="text-[10px] text-slate-400 mb-1">{label}</div>
            <button
                onClick={handleCopy}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 rounded border border-slate-600 hover:border-cyan-500/50 transition-all group"
            >
                <span className="font-mono text-xs text-cyan-400 truncate max-w-[180px]">
                    {abbreviateWallet(address)}
                </span>
                <span className={`text-[10px] transition-all ${copied ? 'text-green-400' : 'text-slate-400 group-hover:text-cyan-400'}`}>
                    {copied ? '✓ Copied!' : '📋 Copy'}
                </span>
            </button>
            <div className="text-[9px] text-slate-500 mt-1 font-mono truncate">
                {address}
            </div>
        </div>
    );
};

/**
 * Status indicator component
 */
const StatusIndicator = ({ met, label }) => (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        met ? 'bg-green-500/20 border border-green-500/40' : 'bg-red-500/20 border border-red-500/40'
    }`}>
        <span className="text-lg">{met ? '✅' : '❌'}</span>
        <span className={`text-sm font-medium ${met ? 'text-green-400' : 'text-red-400'}`}>
            {label}
        </span>
    </div>
);

const IglooRequirementsPanel = ({ 
    isOpen, 
    onClose,
    iglooData,
    walletAddress,
    onEnterSuccess,
    isLoading = false
}) => {
    const { send } = useMultiplayer();
    
    // Status tracking state
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [userTokenBalance, setUserTokenBalance] = useState(null);
    const [hasTokenGateMet, setHasTokenGateMet] = useState(false);
    const [hasEntryFeePaid, setHasEntryFeePaid] = useState(false);
    const [statusChecked, setStatusChecked] = useState(false);
    const [error, setError] = useState(null);
    
    // Extract igloo data safely (before any hooks that depend on them)
    const iglooId = iglooData?.iglooId;
    const ownerUsername = iglooData?.ownerUsername;
    const ownerWallet = iglooData?.ownerWallet;
    const accessType = iglooData?.accessType;
    const hasTokenGate = iglooData?.hasTokenGate;
    const hasEntryFee = iglooData?.hasEntryFee;
    const tokenGate = iglooData?.tokenGate;
    const tokenGateInfo = iglooData?.tokenGateInfo;
    const entryFee = iglooData?.entryFee;
    const entryFeeToken = iglooData?.entryFeeToken;
    const entryFeeAmount = iglooData?.entryFeeAmount;
    
    // Normalize token gate info
    const tokenGateData = tokenGateInfo || tokenGate || {};
    const tokenAddress = tokenGateData.tokenAddress;
    const tokenSymbol = tokenGateData.symbol || tokenGateData.tokenSymbol || 'TOKEN';
    const minBalance = tokenGateData.minimumBalance || tokenGateData.minimum || 1;
    
    // Normalize entry fee info
    const entryFeeData = entryFeeToken || entryFee || {};
    const feeTokenAddress = entryFeeData.tokenAddress;
    const feeTokenSymbol = entryFeeData.tokenSymbol || 'TOKEN';
    const feeAmount = entryFeeAmount || entryFee?.amount || 0;
    
    // Determine what requirements exist
    const showTokenGate = hasTokenGate || accessType === 'token' || accessType === 'both';
    const showEntryFee = hasEntryFee || accessType === 'fee' || accessType === 'both';
    
    // Calculate if all requirements are met
    const tokenGateOk = !showTokenGate || hasTokenGateMet;
    const entryFeeOk = !showEntryFee || hasEntryFeePaid;
    const allRequirementsMet = tokenGateOk && entryFeeOk;
    const needsPayment = showEntryFee && !hasEntryFeePaid;
    
    // Refresh status handler - MUST be defined before useEffect that uses it
    const handleRefreshStatus = useCallback(() => {
        if (!iglooId || !send) return;
        setCheckingStatus(true);
        setError(null);
        send({
            type: 'igloo_check_requirements',
            iglooId
        });
    }, [send, iglooId]);
    
    // Handle pay and enter
    const handlePayAndEnter = useCallback(async () => {
        if (!walletAddress) {
            setError('Please connect your wallet');
            return;
        }
        
        if (needsPayment && send) {
            setPaymentLoading(true);
            setError(null);
            
            try {
                // Step 1: Verify eligibility BEFORE payment
                console.log('🔍 Verifying entry eligibility before payment...');
                
                const eligibilityCheck = await new Promise((resolve) => {
                    const ws = window.__multiplayerWs;
                    if (!ws) {
                        resolve({ canEnter: false, error: 'NO_CONNECTION', message: 'Not connected to server' });
                        return;
                    }
                    
                    const timeout = setTimeout(() => {
                        resolve({ canEnter: false, error: 'TIMEOUT', message: 'Server did not respond' });
                    }, 10000);
                    
                    const handleResponse = (event) => {
                        try {
                            const msg = JSON.parse(event.data);
                            if (msg.type === 'igloo_can_enter' && msg.iglooId === iglooId) {
                                clearTimeout(timeout);
                                ws.removeEventListener('message', handleResponse);
                                resolve(msg);
                            }
                        } catch (e) {}
                    };
                    
                    ws.addEventListener('message', handleResponse);
                    send({ type: 'igloo_can_enter', iglooId });
                });
                
                // Check if token gate is met (entry fee check comes after payment)
                if (eligibilityCheck.tokenGateRequired && !eligibilityCheck.tokenGateMet) {
                    console.log('❌ Token gate not met');
                    setError(eligibilityCheck.message || 'You do not meet the token requirement');
                    setPaymentLoading(false);
                    return;
                }
                
                // Check if already paid
                if (eligibilityCheck.entryFeePaid) {
                    console.log('✅ Entry fee already paid!');
                    setPaymentLoading(false);
                    if (onEnterSuccess) {
                        onEnterSuccess(iglooId);
                    }
                    onClose();
                    return;
                }
                
                console.log('✅ Eligible for entry fee payment, proceeding...');
                
                // Step 2: Execute payment (only after eligibility confirmed)
                console.log('💰 Starting real Solana SPL payment...');
                console.log(`   Igloo: ${iglooId}`);
                console.log(`   Amount: ${feeAmount}`);
                console.log(`   To: ${ownerWallet}`);
                console.log(`   Token: ${feeTokenAddress}`);
                
                // Execute REAL Solana SPL token transfer
                // DEAD SIMPLE: Send tokens to igloo owner, decimals fetched automatically
                const paymentResult = await payIglooEntryFee(
                    iglooId,
                    feeAmount,
                    ownerWallet,
                    feeTokenAddress
                );
                
                if (!paymentResult.success) {
                    console.error('Payment failed:', paymentResult);
                    setError(paymentResult.message || 'Payment failed. Please try again.');
                    setPaymentLoading(false);
                    return;
                }
                
                console.log('✅ Payment successful! Signature:', paymentResult.signature);
                
                // Step 3: Send transaction signature to server for verification
                send({
                    type: 'igloo_pay_entry',
                    iglooId,
                    transactionSignature: paymentResult.signature  // Real tx signature, not signed intent
                });
                
            } catch (err) {
                console.error('Payment error:', err);
                setError(err.message || 'Payment failed. Please try again.');
                setPaymentLoading(false);
            }
        } else if (allRequirementsMet) {
            if (onEnterSuccess) {
                onEnterSuccess(iglooId);
            }
            onClose();
        }
    }, [walletAddress, needsPayment, allRequirementsMet, iglooId, feeAmount, ownerWallet, feeTokenAddress, send, onEnterSuccess, onClose]);
    
    // Reset state when panel opens/closes or igloo changes
    // ALWAYS fetch fresh status from server when panel opens (token balance may have changed)
    useEffect(() => {
        if (isOpen && iglooId && send) {
            setError(null);
            setStatusChecked(false);
            setUserTokenBalance(null);
            setHasTokenGateMet(false);
            setHasEntryFeePaid(false);
            setCheckingStatus(true);
            
            // Always request fresh status from server to get current token balance
            console.log('🏠 Requesting fresh requirements status for:', iglooId);
            send({
                type: 'igloo_check_requirements',
                iglooId
            });
        }
    }, [isOpen, iglooId, send]);
    
    // Listen for server responses
    useEffect(() => {
        if (!isOpen) return;
        
        const ws = window.__multiplayerWs;
        if (!ws) return;
        
        const handleMessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                
                if (msg.type === 'igloo_requirements_status' && msg.iglooId === iglooId) {
                    console.log('🏠 Requirements status:', msg);
                    setCheckingStatus(false);
                    setStatusChecked(true);
                    setUserTokenBalance(msg.userTokenBalance ?? null);
                    setHasTokenGateMet(msg.tokenGateMet ?? false);
                    setHasEntryFeePaid(msg.entryFeePaid ?? false);
                    
                    if (msg.error) {
                        setError(msg.error);
                    }
                }
                
                if (msg.type === 'igloo_pay_entry_result' && msg.iglooId === iglooId) {
                    setPaymentLoading(false);
                    if (msg.success) {
                        setHasEntryFeePaid(true);
                        if (!showTokenGate || hasTokenGateMet) {
                            if (onEnterSuccess) {
                                onEnterSuccess(iglooId);
                            }
                            onClose();
                        }
                    } else {
                        setError(msg.error || msg.message || 'Payment failed');
                    }
                }
                
                if (msg.type === 'igloo_can_enter' && msg.iglooId === iglooId) {
                    if (msg.canEnter) {
                        if (onEnterSuccess) {
                            onEnterSuccess(iglooId);
                        }
                        onClose();
                    }
                }
                
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        ws.addEventListener('message', handleMessage);
        return () => ws.removeEventListener('message', handleMessage);
    }, [isOpen, iglooId, showTokenGate, hasTokenGateMet, onEnterSuccess, onClose]);
    
    // Early return AFTER all hooks
    if (!isOpen || !iglooData) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-600 text-white/60 hover:text-white text-xl transition-all"
                >
                    ×
                </button>
                
                {/* Header */}
                <div className="relative px-6 py-5 bg-gradient-to-r from-purple-600/30 via-indigo-600/20 to-cyan-600/30 border-b border-white/10">
                    <div className="text-center">
                        <div className="text-4xl mb-2">🔐</div>
                        <h2 className="text-xl font-bold text-white mb-1">
                            Entry Requirements
                        </h2>
                        <p className="text-purple-300 text-sm">
                            {ownerUsername ? `${ownerUsername}'s Igloo` : `Igloo ${iglooId?.replace('igloo', '')}`}
                        </p>
                        {ownerWallet && (
                            <div className="mt-2 inline-block bg-black/30 rounded-full px-3 py-1">
                                <span className="text-cyan-400 text-xs font-mono">
                                    🔑 {abbreviateWallet(ownerWallet)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Status Summary */}
                {statusChecked && (
                    <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700/50">
                        <div className="flex items-center justify-between gap-2">
                            {showTokenGate && (
                                <StatusIndicator 
                                    met={hasTokenGateMet} 
                                    label={hasTokenGateMet ? 'Token ✓' : 'Token ✗'} 
                                />
                            )}
                            {showEntryFee && (
                                <StatusIndicator 
                                    met={hasEntryFeePaid} 
                                    label={hasEntryFeePaid ? 'Fee Paid ✓' : 'Fee Required'} 
                                />
                            )}
                            <button
                                onClick={handleRefreshStatus}
                                disabled={checkingStatus}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                                title="Refresh status"
                            >
                                {checkingStatus ? '⏳' : '🔄'}
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Loading State */}
                {checkingStatus && !statusChecked && (
                    <div className="px-6 py-8 text-center">
                        <div className="animate-spin text-3xl mb-3">⏳</div>
                        <p className="text-slate-400">Checking your eligibility...</p>
                    </div>
                )}
                
                {/* Requirements Content */}
                <div className="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">
                    
                    {/* Token Gate Requirement */}
                    {showTokenGate && (
                        <div className={`rounded-xl p-4 border ${
                            hasTokenGateMet 
                                ? 'bg-green-900/20 border-green-500/40' 
                                : 'bg-purple-900/30 border-purple-500/40'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">🪙</span>
                                    <h3 className="text-lg font-semibold text-purple-300">Token Gate</h3>
                                </div>
                                {statusChecked && (
                                    <span className={`text-xl ${hasTokenGateMet ? 'text-green-400' : 'text-red-400'}`}>
                                        {hasTokenGateMet ? '✅' : '❌'}
                                    </span>
                                )}
                            </div>
                            
                            {/* Balance Display */}
                            <div className="bg-black/30 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">Required:</span>
                                    <span className="text-lg font-bold text-purple-400">
                                        {minBalance.toLocaleString()} {tokenSymbol}
                                    </span>
                                </div>
                                {statusChecked && userTokenBalance !== null && (
                                    <div className="flex justify-between items-center border-t border-slate-700 pt-2">
                                        <span className="text-sm text-slate-400">Your Balance:</span>
                                        <span className={`text-lg font-bold ${
                                            hasTokenGateMet ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                            {userTokenBalance.toLocaleString()} {tokenSymbol}
                                        </span>
                                    </div>
                                )}
                                {statusChecked && userTokenBalance !== null && (
                                    <div className="text-center">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            hasTokenGateMet 
                                                ? 'bg-green-500/20 text-green-400' 
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {hasTokenGateMet 
                                                ? `✓ You have enough ${tokenSymbol}!` 
                                                : `Need ${(minBalance - userTokenBalance).toLocaleString()} more`
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <CopyableAddress 
                                address={tokenAddress} 
                                label="Token Contract Address (tap to copy)"
                            />
                        </div>
                    )}
                    
                    {/* Entry Fee Requirement */}
                    {showEntryFee && (
                        <div className={`rounded-xl p-4 border ${
                            hasEntryFeePaid 
                                ? 'bg-green-900/20 border-green-500/40' 
                                : 'bg-yellow-900/30 border-yellow-500/40'
                        }`}>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">💰</span>
                                    <h3 className="text-lg font-semibold text-yellow-300">Entry Fee</h3>
                                </div>
                                {statusChecked && (
                                    <span className={`text-xl ${hasEntryFeePaid ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {hasEntryFeePaid ? '✅' : '💳'}
                                    </span>
                                )}
                            </div>
                            
                            <div className="bg-black/30 rounded-lg p-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-slate-400">One-time fee:</span>
                                    <span className="text-lg font-bold text-yellow-400">
                                        {feeAmount.toLocaleString()} {feeTokenSymbol}
                                    </span>
                                </div>
                                {statusChecked && (
                                    <div className="text-center mt-2">
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            hasEntryFeePaid 
                                                ? 'bg-green-500/20 text-green-400' 
                                                : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                            {hasEntryFeePaid 
                                                ? '✓ Already paid - free entry!' 
                                                : '○ Payment required'
                                            }
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            <CopyableAddress 
                                address={feeTokenAddress} 
                                label="Payment Token Contract Address (tap to copy)"
                            />
                            
                            <p className="text-xs text-slate-400 mt-3">
                                Paid directly to {ownerUsername || 'the owner'} via x402 protocol.
                                {hasEntryFeePaid && ' You can now enter and exit freely as long as you hold the required tokens.'}
                            </p>
                        </div>
                    )}
                    
                    {/* Combined Requirements Note */}
                    {showTokenGate && showEntryFee && (
                        <div className="bg-slate-800/50 border border-slate-600/50 rounded-lg p-3 text-center">
                            <span className="text-xs text-slate-400">
                                {allRequirementsMet 
                                    ? '✨ All requirements met! You can enter freely.'
                                    : '⚠️ You must meet both requirements to enter this igloo'
                                }
                            </span>
                        </div>
                    )}
                    
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 text-center">
                            <span className="text-red-300 text-sm">⚠️ {error}</span>
                        </div>
                    )}
                </div>
                
                {/* Footer with Action Buttons */}
                <div className="px-6 py-4 bg-slate-900/90 border-t border-slate-700/50 space-y-3">
                    
                    {/* Main Action Button */}
                    {walletAddress && statusChecked && (
                        <>
                            {allRequirementsMet ? (
                                <button
                                    onClick={handlePayAndEnter}
                                    className="w-full py-3.5 rounded-xl font-bold text-base bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400 shadow-lg hover:shadow-green-500/30 transition-all duration-300"
                                >
                                    🚪 Enter Igloo
                                </button>
                            ) : needsPayment && tokenGateOk ? (
                                <button
                                    onClick={handlePayAndEnter}
                                    disabled={paymentLoading}
                                    className={`w-full py-3.5 rounded-xl font-bold text-base transition-all duration-300 ${
                                        paymentLoading
                                            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-400 hover:to-amber-400 shadow-lg hover:shadow-yellow-500/30'
                                    }`}
                                >
                                    {paymentLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                            </svg>
                                            Processing Payment...
                                        </span>
                                    ) : (
                                        `💰 Pay ${feeAmount.toLocaleString()} ${feeTokenSymbol} & Enter`
                                    )}
                                </button>
                            ) : !tokenGateOk ? (
                                <div className="w-full py-3 rounded-xl font-semibold text-base bg-slate-700/50 text-slate-400 text-center border border-slate-600">
                                    🪙 Need more {tokenSymbol} to enter
                                </div>
                            ) : null}
                        </>
                    )}
                    
                    {/* Connect Wallet Warning */}
                    {!walletAddress && (
                        <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 text-center">
                            <span className="text-red-300 text-sm">
                                ⚠️ Connect your wallet to check requirements
                            </span>
                        </div>
                    )}
                    
                    {/* Cancel Button */}
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-slate-400 hover:text-slate-300 text-sm transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IglooRequirementsPanel;
