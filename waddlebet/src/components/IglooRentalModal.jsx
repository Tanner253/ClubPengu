/**
 * IglooRentalModal - Modal for viewing igloo rental requirements and renting
 * Shows rental agreement, costs, and can/can't afford status
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IGLOO_CONFIG } from '../config/solana.js';
import { getIglooEconomy } from '../config/iglooEconomy.js';
import { useMultiplayer } from '../multiplayer/MultiplayerContext.jsx';
import { useLanguage } from '../i18n';
import { useChainEconomy } from '../hooks/useChainEconomy.js';
import ChainComingSoonPanel from './ChainComingSoonPanel';
import { getPlatformTokenSymbol } from '../config/tokens.js';
import { payIglooRent } from '../wallet/iglooPayments.js';

const IglooRentalModal = ({ 
    isOpen, 
    onClose, 
    iglooData,
    walletAddress,
    onRentSuccess
}) => {
    const { send } = useMultiplayer();
    const { t } = useLanguage();
    const { chainId, canRentIgloo, platformToken } = useChainEconomy();
    const iglooEconomy = getIglooEconomy(chainId);
    const platformTokenLabel = getPlatformTokenSymbol(chainId);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [canAfford, setCanAfford] = useState(null);
    const [balanceInfo, setBalanceInfo] = useState(null);
    const [receipt, setReceipt] = useState(null);
    
    // Listen for rent result from server
    useEffect(() => {
        if (!isOpen) return;
        
        const ws = window.__multiplayerWs;
        if (!ws) return;
        
        const handleMessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                
                if (msg.type === 'igloo_rent_result') {
                    setIsLoading(false);
                    if (msg.success) {
                        setReceipt({
                            explorerUrl: msg.explorerUrl,
                            explorerLabel: msg.explorerLabel,
                            amount: msg.amount,
                            tokenSymbol: msg.tokenSymbol,
                            transactionHash: msg.transactionHash,
                            message: msg.message,
                        });
                        if (onRentSuccess) {
                            onRentSuccess(msg);
                        }
                    } else {
                        setError(msg.message || msg.error || 'Rental failed');
                    }
                }
                
                if (msg.type === 'igloo_can_rent') {
                    setCanAfford(msg.canRent);
                    if (!msg.canRent) {
                        setError(msg.message || msg.error);
                    }
                    setBalanceInfo({
                        current: msg.current || 0,
                        required: msg.required || iglooEconomy.minimumBalance
                    });
                }
            } catch (e) {
                // Ignore parse errors
            }
        };
        
        ws.addEventListener('message', handleMessage);
        
        // Check if user can afford to rent
        if (iglooData?.iglooId) {
            send({ type: 'igloo_can_rent', iglooId: iglooData.iglooId });
        }
        
        return () => {
            ws.removeEventListener('message', handleMessage);
        };
    }, [isOpen, iglooData?.iglooId, send, onRentSuccess, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        setIsLoading(false);
        setReceipt(null);
    }, [isOpen]);
    
    const handleRent = useCallback(async () => {
        if (!canRentIgloo) return;
        if (!walletAddress) {
            setError('Please connect your wallet first');
            return;
        }
        
        if (!iglooData?.iglooId) {
            setError('No igloo selected');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Step 1: Check eligibility BEFORE payment
            console.log('🔍 Checking rental eligibility...');
            
            const eligibilityCheck = await new Promise((resolve) => {
                const ws = window.__multiplayerWs;
                if (!ws) {
                    resolve({ canRent: false, error: 'NO_CONNECTION', message: 'Not connected to server' });
                    return;
                }
                
                const timeout = setTimeout(() => {
                    resolve({ canRent: false, error: 'TIMEOUT', message: 'Server did not respond' });
                }, 10000);
                
                const handleResponse = (event) => {
                    try {
                        const msg = JSON.parse(event.data);
                        if (msg.type === 'igloo_can_rent' && msg.iglooId === iglooData.iglooId) {
                            clearTimeout(timeout);
                            ws.removeEventListener('message', handleResponse);
                            resolve(msg);
                        }
                    } catch (e) {}
                };
                
                ws.addEventListener('message', handleResponse);
                send({ type: 'igloo_can_rent', iglooId: iglooData.iglooId });
            });
            
            if (!eligibilityCheck.canRent) {
                console.log('❌ Not eligible to rent:', eligibilityCheck.error);
                setError(eligibilityCheck.message || 'Cannot rent this igloo');
                setIsLoading(false);
                return;
            }
            
            console.log('✅ Eligible to rent! Proceeding with payment...');
            
            // Step 2: Pay rent via Solana transaction (only after eligibility confirmed)
            console.log('💰 Starting rent payment...');
            const paymentResult = await payIglooRent(chainId, iglooData.iglooId);
            
            if (!paymentResult.success) {
                setError(paymentResult.message || 'Payment failed');
                setIsLoading(false);
                return;
            }
            
            console.log('✅ Rent payment successful:', paymentResult.signature);
            
            // Step 3: Send rental request with transaction signature as proof
        send({
            type: 'igloo_rent',
            iglooId: iglooData.iglooId,
                transactionSignature: paymentResult.signature // Transaction signature as proof of payment
        });
            
        } catch (error) {
            console.error('❌ Rent payment error:', error);
            setError(error.message || 'Payment failed');
            setIsLoading(false);
        }
        
    }, [walletAddress, iglooData?.iglooId, send]);
    
    if (!isOpen) return null;
    
    // Use database values only - no hardcoded env fallbacks
    const isReserved = iglooData?.isReserved || false;
    const isRented = iglooData?.isRented;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative z-10 w-full max-w-md mx-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-cyan-500/30 overflow-hidden">
                {/* Header */}
                <div className="relative px-6 py-4 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        🏠 {iglooData?.iglooId?.replace('igloo', 'Igloo ')}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-4">
                    {receipt && (
                        <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-xl p-4 space-y-2">
                            <p className="text-emerald-300 font-bold text-lg">🏠 Igloo rented!</p>
                            <p className="text-sm text-slate-200">
                                {receipt.message || 'Welcome to your new igloo.'}
                            </p>
                            {(receipt.amount != null) && (
                                <p className="text-sm text-white font-mono">
                                    Paid {Number(receipt.amount).toLocaleString()} {receipt.tokenSymbol || platformTokenLabel}
                                </p>
                            )}
                            {receipt.explorerUrl && (
                                <a
                                    href={receipt.explorerUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex text-sm text-amber-300 hover:text-amber-200"
                                >
                                    View receipt on {receipt.explorerLabel || 'explorer'} ↗
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-2 w-full py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-400 text-white font-semibold"
                            >
                                Done
                            </button>
                        </div>
                    )}

                    {!receipt && (
                    <>
                    {/* Status Badge */}
                    {isReserved ? (
                        <div className="bg-purple-500/20 border border-purple-500/40 rounded-lg p-4 text-center">
                            <span className="text-purple-400 font-bold">
                                🔒 Reserved Rental - {iglooData?.ownerUsername || 'Reserved Owner'}
                            </span>
                        </div>
                    ) : isRented ? (
                        <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-4 text-center">
                            <span className="text-amber-400 font-bold">
                                🔑 Currently Rented by {iglooData.ownerUsername}
                            </span>
                        </div>
                    ) : (
                        <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4 text-center">
                            <span className="text-green-400 font-bold">
                                ✅ Available for Rent
                            </span>
                        </div>
                    )}
                    
                    {/* Rental Agreement */}
                    {!isReserved && !isRented && (
                        <>
                            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                <h3 className="text-lg font-semibold text-cyan-400 border-b border-cyan-400/30 pb-2">
                                    📋 Rental Agreement
                                </h3>
                                
                                <div className="space-y-2 text-sm text-slate-300">
                                    <div className="flex justify-between">
                                        <span>Daily Rent:</span>
                                        <span className="text-yellow-400 font-mono">
                                            {iglooEconomy.dailyRent.toLocaleString()} {platformTokenLabel}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Minimum Balance Required:</span>
                                        <span className="text-yellow-400 font-mono">
                                            {iglooEconomy.minimumBalance.toLocaleString()} {platformTokenLabel}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Payment Due:</span>
                                        <span className="text-white">Every 24 hours</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Grace Period:</span>
                                        <span className="text-red-400">{IGLOO_CONFIG.GRACE_PERIOD_HOURS} hours</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Requirements */}
                            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
                                    Requirements
                                </h3>
                                <ul className="text-sm text-slate-300 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span>
                                        Hold {iglooEconomy.minimumBalance.toLocaleString()} {platformTokenLabel} (7 days rent)
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-400">✓</span>
                                        Pay first day's rent upfront
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-yellow-400">!</span>
                                        Manual daily payment required
                                    </li>
                                </ul>
                            </div>
                            
                            {/* Affordability Status */}
                            {balanceInfo && (
                                <div className={`rounded-lg p-3 text-center ${
                                    canAfford 
                                        ? 'bg-green-500/20 border border-green-500/40' 
                                        : 'bg-red-500/20 border border-red-500/40'
                                }`}>
                                    {canAfford ? (
                                        <span className="text-green-400 font-semibold">
                                            ✅ You can afford this rental
                                        </span>
                                    ) : (
                                        <span className="text-red-400 font-semibold">
                                            ❌ Insufficient balance ({balanceInfo.current.toLocaleString()} / {balanceInfo.required.toLocaleString()} {platformTokenLabel})
                                        </span>
                                    )}
                                </div>
                            )}
                            
                            {/* Error */}
                            {error && (
                                <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 text-center">
                                    <span className="text-red-400">{error}</span>
                                </div>
                            )}
                            
                            {!canRentIgloo && (
                                <ChainComingSoonPanel
                                    title={t('chainEconomy.iglooTitle').replace(/\{token\}/g, platformToken)}
                                />
                            )}

                            {/* Rent Button */}
                            <button
                                onClick={handleRent}
                                disabled={!canRentIgloo || isLoading || !canAfford || !walletAddress}
                                className={`w-full py-3 rounded-lg font-bold text-lg transition-all duration-200 ${
                                    !canRentIgloo || isLoading || !canAfford || !walletAddress
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400 shadow-lg hover:shadow-cyan-500/25'
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
                                ) : !canRentIgloo ? (
                                    t('chainEconomy.comingSoon')
                                ) : !walletAddress ? (
                                    'Connect Wallet to Rent'
                                ) : !canAfford ? (
                                    `Need ${iglooEconomy.minimumBalance.toLocaleString()} ${platformTokenLabel}`
                                ) : (
                                    `🔑 Rent for ${iglooEconomy.dailyRent.toLocaleString()} ${platformTokenLabel}/day`
                                )}
                            </button>
                            
                            <p className="text-xs text-slate-500 text-center">
                                By renting, you agree to pay daily rent manually within the grace period.
                            </p>
                        </>
                    )}
                    </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IglooRentalModal;


