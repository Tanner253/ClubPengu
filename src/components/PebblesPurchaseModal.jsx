import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMultiplayer } from '../multiplayer';
import { useClickOutside, useEscapeKey } from '../hooks';
import PhantomWallet from '../wallet/PhantomWallet';
import { sendSPLToken } from '../wallet/SolanaPayment';

// Pebble bundles (must match server constants)
const BUNDLES = [
    { id: 'starter', pebbles: 100, sol: 0.1, bonus: 0 },
    { id: 'value', pebbles: 500, sol: 0.5, bonus: 0 },
    { id: 'popular', pebbles: 1000, sol: 1.0, bonus: 0, featured: true },
    { id: 'whale', pebbles: 5250, sol: 5.0, bonus: 250, bonusPercent: 5 },
    { id: 'mega', pebbles: 10750, sol: 10.0, bonus: 750, bonusPercent: 7.5 }
];

const ROLL_COST = 25; // Pebbles per gacha roll
const PEBBLES_PER_SOL = 1000;
const PEBBLES_PER_SOL_WADDLE = 667; // $WADDLE is 1.5x more expensive
const WADDLE_PREMIUM = 1.5;
const WITHDRAWAL_RAKE = 5; // 5%
const MIN_WITHDRAWAL = 100; // Minimum pebbles to withdraw

// $WADDLE token address
const WADDLE_TOKEN = import.meta.env.VITE_CPW3_TOKEN_ADDRESS || 'BDbMVbcc5hD5qiiGYwipeuUVMKDs16s9Nxk2hrhbpump';

// Rake wallet from env (where SOL deposits go)
const RAKE_WALLET = import.meta.env.VITE_RAKE_WALLET || '';
console.log('🪨 RAKE_WALLET configured:', RAKE_WALLET ? RAKE_WALLET.slice(0, 8) + '...' : 'NOT SET');

/**
 * PebblesPurchaseModal - Modal for buying and withdrawing Pebbles
 * Uses existing PhantomWallet infrastructure
 */
const PebblesPurchaseModal = ({ isOpen, onClose }) => {
    const panelRef = useRef(null);
    const { userData, isAuthenticated, send, walletAddress, registerCallbacks } = useMultiplayer();
    
    // Tab state
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' | 'withdraw'
    
    // Buy state
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('SOL'); // 'SOL' | 'WADDLE'
    
    // Withdraw state
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawals, setWithdrawals] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    
    // Shared state
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Close handlers
    useClickOutside(panelRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);
    
    const pebbles = userData?.pebbles || 0;
    const rollsAvailable = Math.floor(pebbles / ROLL_COST);
    
    // Calculate withdrawal preview
    const withdrawPebbles = parseInt(withdrawAmount) || 0;
    const rakeAmount = Math.floor(withdrawPebbles * (WITHDRAWAL_RAKE / 100));
    const netPebbles = withdrawPebbles - rakeAmount;
    const solToReceive = netPebbles / PEBBLES_PER_SOL;
    const canWithdraw = withdrawPebbles >= MIN_WITHDRAWAL && withdrawPebbles <= pebbles;
    
    // Fetch withdrawal history - MUST be defined before useEffects that use it
    const fetchWithdrawals = useCallback(() => {
        setLoadingHistory(true);
        send({ type: 'pebbles_withdrawals' });
    }, [send]);
    
    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setSelectedBundle(null);
            setError(null);
            setSuccess(null);
            setWithdrawAmount('');
            setPaymentMethod('SOL'); // Default to SOL
            
            // Fetch withdrawal history when opening
            if (isAuthenticated) {
                fetchWithdrawals();
            }
        }
    }, [isOpen, isAuthenticated, fetchWithdrawals]);
    
    // Register callbacks for pebble responses
    useEffect(() => {
        if (!isOpen || !registerCallbacks) return;
        
        registerCallbacks({
            onPebblesWithdrawn: (msg) => {
                if (msg.status === 'completed') {
                    setSuccess(`Withdrawal complete! Sent ${msg.solReceived?.toFixed(4)} SOL`);
                } else if (msg.status === 'queued') {
                    setSuccess(`Queued at #${msg.queuePosition}. You'll receive ${msg.solToReceive?.toFixed(4)} SOL when funds are available.`);
                }
                setIsWithdrawing(false);
                setWithdrawAmount('');
                // Use included withdrawal history if available, otherwise fetch
                if (msg.withdrawals) {
                    setWithdrawals(msg.withdrawals);
                } else {
                    fetchWithdrawals();
                }
            },
            onPebblesWithdrawalCancelled: (msg) => {
                setSuccess(`Withdrawal cancelled. Refunded ${msg.refundedPebbles} Pebbles.`);
                // Use included withdrawal history if available, otherwise fetch
                if (msg.withdrawals) {
                    setWithdrawals(msg.withdrawals);
                } else {
                    fetchWithdrawals();
                }
            },
            onPebblesWithdrawalCompleted: (msg) => {
                // Queued withdrawal was processed by server!
                setSuccess(`💸 Queued withdrawal processed! ${msg.solReceived?.toFixed(4)} SOL sent to your wallet!`);
                fetchWithdrawals();
            },
            onPebblesWithdrawals: (list) => {
                setWithdrawals(list || []);
                setLoadingHistory(false);
            },
            onPebblesError: (msg) => {
                setError(msg.message || msg.error || 'Operation failed');
                setIsWithdrawing(false);
            }
        });
        
        // Cleanup - unregister specific callbacks when modal closes
        return () => {
            registerCallbacks({
                onPebblesWithdrawn: null,
                onPebblesWithdrawalCancelled: null,
                onPebblesWithdrawalCompleted: null,
                onPebblesWithdrawals: null,
                onPebblesError: null
            });
        };
    }, [isOpen, registerCallbacks, fetchWithdrawals]);
    
    // Handle purchase - SOL or $WADDLE transfer
    const handlePurchase = async (bundle) => {
        if (!isAuthenticated || !walletAddress) {
            setError('Please connect your wallet first');
            return;
        }
        
        if (!RAKE_WALLET) {
            setError('Pebble shop not configured. Contact support.');
            return;
        }
        
        setSelectedBundle(bundle);
        setIsPurchasing(true);
        setError(null);
        
        try {
            const wallet = PhantomWallet.getInstance();
            
            if (!wallet.isConnected()) {
                throw new Error('Wallet not connected');
            }
            
            if (paymentMethod === 'SOL') {
                // SOL Payment
                console.log(`🪨 Purchasing ${bundle.pebbles} Pebbles for ${bundle.sol} SOL`);
                
                const result = await wallet.sendSOL(RAKE_WALLET, bundle.sol);
                
                if (!result.success) {
                    throw new Error(result.message || result.error || 'Transaction failed');
                }
                
                console.log(`🪨 Pebble deposit tx: ${result.signature}`);
                
                send({
                    type: 'pebbles_deposit',
                    txSignature: result.signature,
                    amountSol: bundle.sol
                });
                
                setSuccess(`Successfully purchased ${bundle.pebbles} Pebbles!`);
            } else {
                // $WADDLE Payment (1.5x more expensive)
                const waddleAmount = bundle.sol * WADDLE_PREMIUM;
                const pebblesToReceive = Math.floor(bundle.sol * PEBBLES_PER_SOL_WADDLE);
                
                console.log(`🪨 Purchasing ${pebblesToReceive} Pebbles for ${waddleAmount} $WADDLE`);
                
                // Send $WADDLE SPL token using SolanaPayment
                const result = await sendSPLToken({
                    recipientAddress: RAKE_WALLET,
                    tokenMintAddress: WADDLE_TOKEN,
                    amount: waddleAmount,
                    memo: `Pebbles purchase: ${pebblesToReceive}`
                });
                
                if (!result.success) {
                    throw new Error(result.message || result.error || 'Transaction failed');
                }
                
                console.log(`🪨 Pebble $WADDLE deposit tx: ${result.signature}`);
                
                send({
                    type: 'pebbles_deposit_waddle',
                    txSignature: result.signature,
                    waddleAmount: waddleAmount
                });
                
                setSuccess(`Successfully purchased ${pebblesToReceive} Pebbles with $WADDLE!`);
            }
            
            setTimeout(() => {
                setSuccess(null);
            }, 3000);
            
        } catch (err) {
            console.error('Pebble purchase error:', err);
            
            // Parse common errors
            let userMessage = err.message || 'Transaction failed';
            if (err.message?.includes('User rejected') || err.message?.includes('user rejected')) {
                userMessage = 'Transaction cancelled';
            } else if (err.message?.includes('insufficient') || err.message?.includes('Insufficient')) {
                userMessage = `Insufficient ${paymentMethod} balance`;
            }
            
            setError(userMessage);
        } finally {
            setIsPurchasing(false);
        }
    };
    
    // Handle withdrawal request
    const handleWithdraw = () => {
        if (!canWithdraw) return;
        
        setIsWithdrawing(true);
        setError(null);
        setSuccess(null);
        
        send({
            type: 'pebbles_withdraw',
            pebbleAmount: withdrawPebbles
        });
    };
    
    // Handle cancel withdrawal
    const handleCancelWithdrawal = (withdrawalId) => {
        send({
            type: 'pebbles_cancel_withdrawal',
            withdrawalId
        });
    };
    
    // Set max withdrawal
    const handleSetMax = () => {
        setWithdrawAmount(pebbles.toString());
    };
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div 
                ref={panelRef}
                className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl max-w-md w-full border border-purple-500/30 shadow-2xl shadow-purple-500/20 overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 p-4 border-b border-purple-500/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🪨</span>
                            <div>
                                <h2 className="text-xl font-bold text-white retro-text">Pebbles</h2>
                                <p className="text-purple-300/80 text-xs">Premium currency for Gacha</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-white/50 hover:text-white text-2xl leading-none"
                        >
                            ×
                        </button>
                    </div>
                </div>
                
                {/* Current Balance */}
                <div className="px-4 py-3 bg-black/30 border-b border-purple-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🪨</span>
                            <span className="text-white font-bold">{pebbles.toLocaleString()}</span>
                            <span className="text-purple-300/60 text-sm">Pebbles</span>
                        </div>
                        <div className="text-sm text-purple-300/60">
                            = <span className="text-green-400 font-bold">{rollsAvailable}</span> rolls
                        </div>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-purple-500/20">
                    <button
                        onClick={() => { setActiveTab('buy'); setError(null); setSuccess(null); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${
                            activeTab === 'buy'
                                ? 'text-green-400 border-b-2 border-green-400 bg-green-400/10'
                                : 'text-white/50 hover:text-white/80'
                        }`}
                    >
                        💰 Buy Pebbles
                    </button>
                    <button
                        onClick={() => { setActiveTab('withdraw'); setError(null); setSuccess(null); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${
                            activeTab === 'withdraw'
                                ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-400/10'
                                : 'text-white/50 hover:text-white/80'
                        }`}
                    >
                        💸 Withdraw
                    </button>
                </div>
                
                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'buy' ? (
                        /* Buy Tab */
                        <div className="p-4 space-y-3">
                            {/* Payment Method Toggle */}
                            <div className="flex gap-2 p-1 bg-black/30 rounded-lg">
                                <button
                                    onClick={() => setPaymentMethod('SOL')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        paymentMethod === 'SOL'
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <span>◎</span> SOL
                                </button>
                                <button
                                    onClick={() => setPaymentMethod('WADDLE')}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                        paymentMethod === 'WADDLE'
                                            ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <span>🐧</span> $WADDLE
                                </button>
                            </div>
                            
                            <p className="text-xs text-purple-300/60">
                                {paymentMethod === 'SOL' 
                                    ? `1 roll = ${ROLL_COST} Pebbles • 1,000 Pebbles = 1 SOL`
                                    : `1 roll = ${ROLL_COST} Pebbles • ${PEBBLES_PER_SOL_WADDLE} Pebbles = 1 $WADDLE (1.5x premium)`
                                }
                            </p>
                            
                            {paymentMethod === 'WADDLE' && (
                                <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2 text-xs text-cyan-300">
                                    💡 Paying with $WADDLE costs 1.5x more but supports the ecosystem!
                                </div>
                            )}
                            
                            {BUNDLES.map((bundle) => {
                                const displayPrice = paymentMethod === 'SOL' 
                                    ? bundle.sol 
                                    : (bundle.sol * WADDLE_PREMIUM).toFixed(2);
                                const displayPebbles = paymentMethod === 'SOL'
                                    ? bundle.pebbles
                                    : Math.floor(bundle.sol * PEBBLES_PER_SOL_WADDLE);
                                const displayRolls = Math.floor(displayPebbles / ROLL_COST);
                                
                                return (
                                    <button
                                        key={bundle.id}
                                        onClick={() => handlePurchase(bundle)}
                                        disabled={isPurchasing}
                                        className={`w-full p-3 rounded-xl border transition-all ${
                                            bundle.featured 
                                                ? paymentMethod === 'SOL'
                                                    ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border-purple-400/50 hover:border-purple-400'
                                                    : 'bg-gradient-to-r from-cyan-600/40 to-blue-600/40 border-cyan-400/50 hover:border-cyan-400'
                                                : 'bg-black/30 border-purple-500/20 hover:border-purple-500/50 hover:bg-black/50'
                                        } ${isPurchasing && selectedBundle?.id === bundle.id ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🪨</span>
                                                <div className="text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold">
                                                            {displayPebbles.toLocaleString()}
                                                        </span>
                                                        {bundle.bonus > 0 && paymentMethod === 'SOL' && (
                                                            <span className="text-green-400 text-xs font-bold bg-green-400/20 px-1.5 py-0.5 rounded">
                                                                +{bundle.bonusPercent}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-purple-300/60">
                                                        {displayRolls} rolls
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-bold">
                                                    {displayPrice} {paymentMethod === 'SOL' ? 'SOL' : '$WADDLE'}
                                                </div>
                                                {bundle.featured && (
                                                    <div className="text-xs text-yellow-400">⭐ Popular</div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        /* Withdraw Tab */
                        <div className="p-4 space-y-4">
                            {/* Withdraw Input */}
                            <div className="space-y-2">
                                <label className="text-sm text-purple-300/80 block">
                                    Amount to Withdraw
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            type="number"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder={`Min ${MIN_WITHDRAWAL}`}
                                            min={MIN_WITHDRAWAL}
                                            max={pebbles}
                                            disabled={isWithdrawing || pebbles < MIN_WITHDRAWAL}
                                            className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white font-bold focus:outline-none focus:border-purple-400 disabled:opacity-50"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300/60 text-sm">
                                            🪨
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleSetMax}
                                        disabled={pebbles < MIN_WITHDRAWAL}
                                        className="px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-bold hover:bg-purple-600/50 disabled:opacity-50"
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>
                            
                            {/* Withdrawal Preview */}
                            {withdrawPebbles > 0 && (
                                <div className="bg-black/30 rounded-xl p-3 border border-purple-500/20 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/60">Withdraw</span>
                                        <span className="text-white">{withdrawPebbles.toLocaleString()} 🪨</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-400/80">Rake ({WITHDRAWAL_RAKE}%)</span>
                                        <span className="text-red-400">-{rakeAmount.toLocaleString()} 🪨</span>
                                    </div>
                                    <div className="border-t border-purple-500/20 pt-2 flex justify-between">
                                        <span className="text-green-400 font-bold">You Receive</span>
                                        <span className="text-green-400 font-bold">{solToReceive.toFixed(4)} SOL</span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Withdraw Button */}
                            <button
                                onClick={handleWithdraw}
                                disabled={!canWithdraw || isWithdrawing}
                                className={`w-full py-3 rounded-xl font-bold transition-all ${
                                    canWithdraw && !isWithdrawing
                                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90'
                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {isWithdrawing ? (
                                    <span className="animate-pulse">Processing...</span>
                                ) : pebbles < MIN_WITHDRAWAL ? (
                                    `Need ${MIN_WITHDRAWAL}+ Pebbles`
                                ) : !canWithdraw ? (
                                    'Enter valid amount'
                                ) : (
                                    `Withdraw ${solToReceive.toFixed(4)} SOL`
                                )}
                            </button>
                            
                            {/* Withdrawal History */}
                            {withdrawals.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm text-purple-300/80 font-bold">Recent Withdrawals</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {withdrawals.map((w) => (
                                            <div 
                                                key={w.withdrawalId}
                                                className={`bg-black/30 rounded-lg p-3 border text-sm ${
                                                    w.status === 'pending' ? 'border-yellow-500/30' :
                                                    w.status === 'completed' ? 'border-green-500/30' :
                                                    w.status === 'cancelled' ? 'border-gray-500/30' :
                                                    'border-purple-500/20'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="text-white font-bold">{w.pebbleAmount} 🪨</span>
                                                        <span className="text-white/50 mx-2">→</span>
                                                        <span className="text-green-400">{w.solAmount?.toFixed(4)} SOL</span>
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                                        w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        w.status === 'queued' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        w.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                                        w.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                        w.status === 'cancelled' ? 'bg-gray-500/20 text-gray-400' :
                                                        'bg-red-500/20 text-red-400'
                                                    }`}>
                                                        {w.status === 'pending' && w.queuePosition ? `#${w.queuePosition} in queue` : w.status}
                                                    </span>
                                                </div>
                                                {w.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleCancelWithdrawal(w.withdrawalId)}
                                                        className="mt-2 w-full py-1.5 text-xs bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30"
                                                    >
                                                        Cancel & Refund Pebbles
                                                    </button>
                                                )}
                                                {w.txSignature && (
                                                    <a
                                                        href={`https://solscan.io/tx/${w.txSignature}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-purple-400 hover:text-purple-300 block mt-1"
                                                    >
                                                        View on Solscan ↗
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {loadingHistory && (
                                <p className="text-center text-purple-300/60 text-sm animate-pulse">
                                    Loading history...
                                </p>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Status Messages */}
                {error && (
                    <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/30">
                        <p className="text-red-400 text-sm text-center">{error}</p>
                    </div>
                )}
                
                {success && (
                    <div className="px-4 py-2 bg-green-500/20 border-t border-green-500/30">
                        <p className="text-green-400 text-sm text-center">{success}</p>
                    </div>
                )}
                
                {isPurchasing && (
                    <div className="px-4 py-2 bg-purple-500/20 border-t border-purple-500/30">
                        <p className="text-purple-300 text-sm text-center animate-pulse">
                            Processing transaction...
                        </p>
                    </div>
                )}
                
                {/* Footer */}
                <div className="p-3 bg-black/30 border-t border-purple-500/20">
                    <p className="text-[10px] text-white/40 text-center">
                        {activeTab === 'buy' 
                            ? 'SOL sent to platform wallet • Pebbles credited instantly after confirmation'
                            : `${WITHDRAWAL_RAKE}% rake on withdrawals • Queued if wallet balance low`
                        }
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PebblesPurchaseModal;
