import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMultiplayer } from '../multiplayer';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useLanguage } from '../i18n';
import { useChainEconomy } from '../hooks/useChainEconomy.js';
import ChainComingSoonPanel from './ChainComingSoonPanel';
import PhantomWallet from '../wallet/PhantomWallet';
import { sendNativeEth } from '../wallet/EvmPayment.js';
import { getTxExplorerUrl, getExplorerLabelForTx } from '../utils/txExplorer.js';

// Target pebble packs (ETH packs are priced via locked USD-pegged quotes)
const BUNDLES = [
    { id: 'starter', pebbles: 100, sol: 0.1, bonus: 0 },
    { id: 'value', pebbles: 500, sol: 0.5, bonus: 0 },
    { id: 'popular', pebbles: 1000, sol: 1.0, bonus: 0, featured: true },
    { id: 'whale', pebbles: 5250, sol: 5.0, bonus: 250, bonusPercent: 5 },
    { id: 'mega', pebbles: 10750, sol: 10.0, bonus: 750, bonusPercent: 7.5 }
];

const ROLL_COST = 25;
const PEBBLES_PER_SOL = 1000;
const WITHDRAWAL_RAKE = 5;
const MIN_WITHDRAWAL = 100;

const RAKE_WALLET = import.meta.env.VITE_RAKE_WALLET || '';
const EVM_RAKE_WALLET =
    import.meta.env.VITE_EVM_RAKE_WALLET_ADDRESS
    || import.meta.env.VITE_EVM_RAKE_WALLET
    || '';

const formatUsd = (n) => {
    if (n == null || !Number.isFinite(Number(n))) return null;
    return `≈ $${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * PebblesPurchaseModal — Solana (fixed 1 SOL = 1000) + EVM (USD-pegged ETH)
 */
const PebblesPurchaseModal = ({ isOpen, onClose }) => {
    const panelRef = useRef(null);
    const pendingQuoteRef = useRef(null);
    const { userData, isAuthenticated, send, walletAddress, registerCallbacks } = useMultiplayer();
    const { t } = useLanguage();
    const { canUsePebblesRail, isEvm, chainId, platformToken } = useChainEconomy();

    const [activeTab, setActiveTab] = useState('buy');
    const [selectedBundle, setSelectedBundle] = useState(null);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [withdrawals, setWithdrawals] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [priceInfo, setPriceInfo] = useState(null); // solUsd, ethUsd, pebbleUsd
    const [ethQuotes, setEthQuotes] = useState({}); // bundleId → quote

    useClickOutside(panelRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);

    const pebbles = userData?.pebbles || 0;
    const rollsAvailable = Math.floor(pebbles / ROLL_COST);
    const assetLabel = isEvm ? 'ETH' : 'SOL';

    const withdrawPebbles = parseInt(withdrawAmount, 10) || 0;
    const rakeAmount = Math.floor(withdrawPebbles * (WITHDRAWAL_RAKE / 100));
    const netPebbles = withdrawPebbles - rakeAmount;
    const solToReceive = netPebbles / PEBBLES_PER_SOL;
    const ethToReceive = priceInfo?.pebbleUsd && priceInfo?.ethUsd
        ? (netPebbles * priceInfo.pebbleUsd) / priceInfo.ethUsd
        : null;
    const nativeToReceive = isEvm ? ethToReceive : solToReceive;
    const canWithdraw = withdrawPebbles >= MIN_WITHDRAWAL && withdrawPebbles <= pebbles;

    const fetchWithdrawals = useCallback(() => {
        setLoadingHistory(true);
        send({ type: 'pebbles_withdrawals' });
    }, [send]);

    const requestSolanaPrices = useCallback(() => {
        send({ type: 'pebbles_quote' });
    }, [send]);

    const requestEthBundleQuotes = useCallback(() => {
        BUNDLES.forEach((bundle) => {
            send({ type: 'pebbles_quote', targetPebbles: bundle.pebbles });
        });
    }, [send]);

    useEffect(() => {
        if (!isOpen) return;
        setSelectedBundle(null);
        setError(null);
        setSuccess(null);
        setWithdrawAmount('');
        setEthQuotes({});
        if (isAuthenticated) {
            fetchWithdrawals();
            if (isEvm) {
                requestEthBundleQuotes();
            } else {
                requestSolanaPrices();
            }
        }
    }, [isOpen, isAuthenticated, isEvm, fetchWithdrawals, requestEthBundleQuotes, requestSolanaPrices]);

    useEffect(() => {
        if (!isOpen || !registerCallbacks) return;

        registerCallbacks({
            onPebblesQuote: (msg) => {
                if (!msg.success && msg.success !== undefined) return;
                if (msg.solUsd != null) {
                    setPriceInfo({
                        solUsd: msg.solUsd,
                        ethUsd: msg.ethUsd,
                        pebbleUsd: msg.pebbleUsd ?? (msg.solUsd / PEBBLES_PER_SOL),
                    });
                }
                if (msg.quoteId && msg.pebbles != null) {
                    const match = BUNDLES.find((b) => b.pebbles === msg.pebbles)
                        || BUNDLES.reduce((best, b) => (
                            Math.abs(b.pebbles - msg.pebbles) < Math.abs((best?.pebbles || 0) - msg.pebbles) ? b : best
                        ), null);
                    if (match) {
                        setEthQuotes((prev) => ({ ...prev, [match.id]: msg }));
                    }
                    if (pendingQuoteRef.current?.targetPebbles === msg.pebbles) {
                        pendingQuoteRef.current.resolve?.(msg);
                        pendingQuoteRef.current = null;
                    }
                }
            },
            onPebblesDeposited: (msg) => {
                if (msg.pebblesAwarded != null) {
                    const usd = msg.usdValue != null ? ` (${formatUsd(msg.usdValue)})` : '';
                    setSuccess(`Purchased ${msg.pebblesAwarded.toLocaleString()} Pebbles${usd}!`);
                }
                setIsPurchasing(false);
            },
            onPebblesWithdrawn: (msg) => {
                const received = msg.ethReceived ?? msg.solReceived;
                const label = msg.asset || assetLabel;
                if (msg.status === 'completed') {
                    setSuccess(`Withdrawal complete! Sent ${Number(received)?.toFixed(6)} ${label}`);
                } else if (msg.status === 'queued') {
                    setSuccess(
                        msg.message
                        || `Queued at #${msg.queuePosition}. You'll receive ${Number(received)?.toFixed(6)} ${label} when funds are available.`
                    );
                }
                setIsWithdrawing(false);
                setWithdrawAmount('');
                if (msg.withdrawals) setWithdrawals(msg.withdrawals);
                else fetchWithdrawals();
            },
            onPebblesWithdrawalCancelled: (msg) => {
                setSuccess(`Withdrawal cancelled. Refunded ${msg.refundedPebbles} Pebbles.`);
                if (msg.withdrawals) setWithdrawals(msg.withdrawals);
                else fetchWithdrawals();
            },
            onPebblesWithdrawalCompleted: (msg) => {
                const received = msg.ethReceived ?? msg.solReceived;
                const label = msg.asset || assetLabel;
                setSuccess(`Queued withdrawal processed! ${Number(received)?.toFixed(6)} ${label} sent!`);
                fetchWithdrawals();
            },
            onPebblesWithdrawals: (list) => {
                setWithdrawals(list || []);
                setLoadingHistory(false);
            },
            onPebblesError: (msg) => {
                setError(msg.message || msg.error || 'Operation failed');
                setIsWithdrawing(false);
                setIsPurchasing(false);
                if (pendingQuoteRef.current) {
                    pendingQuoteRef.current.reject?.(new Error(msg.message || 'Quote failed'));
                    pendingQuoteRef.current = null;
                }
            },
        });

        return () => {
            registerCallbacks({
                onPebblesQuote: null,
                onPebblesDeposited: null,
                onPebblesWithdrawn: null,
                onPebblesWithdrawalCancelled: null,
                onPebblesWithdrawalCompleted: null,
                onPebblesWithdrawals: null,
                onPebblesError: null,
            });
        };
    }, [isOpen, registerCallbacks, fetchWithdrawals, assetLabel]);

    const waitForEthQuote = (targetPebbles) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            if (pendingQuoteRef.current?.targetPebbles === targetPebbles) {
                pendingQuoteRef.current = null;
                reject(new Error('Quote timed out — try again'));
            }
        }, 12_000);
        pendingQuoteRef.current = {
            targetPebbles,
            resolve: (q) => { clearTimeout(timeout); resolve(q); },
            reject: (e) => { clearTimeout(timeout); reject(e); },
        };
        send({ type: 'pebbles_quote', targetPebbles });
    });

    const handlePurchase = async (bundle) => {
        if (!isAuthenticated || !walletAddress) {
            setError('Please connect your wallet first');
            return;
        }

        setSelectedBundle(bundle);
        setIsPurchasing(true);
        setError(null);

        try {
            if (isEvm) {
                const rake = EVM_RAKE_WALLET;
                if (!rake) {
                    throw new Error('Pebble shop not configured (EVM rake wallet). Contact support.');
                }
                let quote = ethQuotes[bundle.id];
                if (!quote?.quoteId || (quote.expiresAt && Date.now() > quote.expiresAt - 5_000)) {
                    quote = await waitForEthQuote(bundle.pebbles);
                }
                console.log(`🪨 Purchasing ~${quote.pebbles} Pebbles for ${quote.ethAmount} ETH (USD-pegged)`);
                const result = await sendNativeEth({
                    recipientAddress: quote.rakeWallet || rake,
                    amountEth: quote.ethAmount,
                });
                if (!result.success) {
                    throw new Error(result.message || result.error || 'Transaction failed');
                }
                send({
                    type: 'pebbles_deposit',
                    txSignature: result.signature,
                    quoteId: quote.quoteId,
                });
            } else {
                if (!RAKE_WALLET) {
                    throw new Error('Pebble shop not configured. Contact support.');
                }
                const wallet = PhantomWallet.getInstance();
                if (!wallet.isConnected()) {
                    throw new Error('Wallet not connected');
                }
                console.log(`🪨 Purchasing ${bundle.pebbles} Pebbles for ${bundle.sol} SOL`);
                const result = await wallet.sendSOL(
                    RAKE_WALLET,
                    bundle.sol,
                    `WaddleBet: Purchase ${bundle.pebbles} Pebbles with SOL`
                );
                if (!result.success) {
                    throw new Error(result.message || result.error || 'Transaction failed');
                }
                send({
                    type: 'pebbles_deposit',
                    txSignature: result.signature,
                    amountSol: bundle.sol,
                });
                setSuccess(`Successfully purchased ${bundle.pebbles} Pebbles!`);
                setTimeout(() => setSuccess(null), 3000);
                setIsPurchasing(false);
            }
        } catch (err) {
            console.error('Pebble purchase error:', err);
            let userMessage = err.message || 'Transaction failed';
            if (err.message?.includes('User rejected') || err.message?.includes('user rejected')) {
                userMessage = 'Transaction cancelled';
            } else if (err.message?.includes('insufficient') || err.message?.includes('Insufficient')) {
                userMessage = `Insufficient ${assetLabel} balance`;
            }
            setError(userMessage);
            setIsPurchasing(false);
        }
    };

    const handleWithdraw = () => {
        if (!canWithdraw) return;
        setIsWithdrawing(true);
        setError(null);
        setSuccess(null);
        send({ type: 'pebbles_withdraw', pebbleAmount: withdrawPebbles });
    };

    const handleCancelWithdrawal = (withdrawalId) => {
        send({ type: 'pebbles_cancel_withdrawal', withdrawalId });
    };

    const handleSetMax = () => setWithdrawAmount(pebbles.toString());

    if (!isOpen) return null;

    if (!canUsePebblesRail) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div
                    ref={panelRef}
                    className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl max-w-md w-full border border-purple-500/30 shadow-2xl p-5"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white retro-text">🪨 Pebbles</h2>
                        <button type="button" onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none">×</button>
                    </div>
                    <ChainComingSoonPanel title={t('chainEconomy.pebblesTitle')} />
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full mt-4 py-3 rounded-xl font-bold text-sm bg-white/10 text-white/40"
                    >
                        {t('chainEconomy.comingSoon')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div
                ref={panelRef}
                className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl max-w-md w-full border border-purple-500/30 shadow-2xl shadow-purple-500/20 overflow-hidden max-h-[90vh] flex flex-col"
            >
                <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 p-4 border-b border-purple-500/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🪨</span>
                            <div>
                                <h2 className="text-xl font-bold text-white retro-text">Pebbles</h2>
                                <p className="text-purple-300/80 text-xs">
                                    {isEvm
                                        ? 'USD-pegged · pay with ETH on Robinhood Chain'
                                        : 'Premium currency for Gacha · pay with SOL'}
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="text-white/50 hover:text-white text-2xl leading-none">×</button>
                    </div>
                </div>

                <div className="px-4 py-3 bg-black/30 border-b border-purple-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">🪨</span>
                            <span className="text-white font-bold">{pebbles.toLocaleString()}</span>
                            <span className="text-purple-300/60 text-sm">Pebbles</span>
                            {priceInfo?.pebbleUsd != null && (
                                <span className="text-emerald-400/80 text-xs">
                                    {formatUsd(pebbles * priceInfo.pebbleUsd)}
                                </span>
                            )}
                        </div>
                        <div className="text-sm text-purple-300/60">
                            = <span className="text-green-400 font-bold">{rollsAvailable}</span> rolls
                        </div>
                    </div>
                </div>

                <div className="flex border-b border-purple-500/20">
                    <button
                        type="button"
                        onClick={() => { setActiveTab('buy'); setError(null); setSuccess(null); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${
                            activeTab === 'buy'
                                ? 'text-green-400 border-b-2 border-green-400 bg-green-400/10'
                                : 'text-white/50 hover:text-white/80'
                        }`}
                    >
                        Buy Pebbles
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('withdraw'); setError(null); setSuccess(null); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${
                            activeTab === 'withdraw'
                                ? 'text-pink-400 border-b-2 border-pink-400 bg-pink-400/10'
                                : 'text-white/50 hover:text-white/80'
                        }`}
                    >
                        Withdraw
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'buy' ? (
                        <div className="p-4 space-y-3">
                            <p className="text-xs text-purple-300/60">
                                1 roll = {ROLL_COST} Pebbles
                                {isEvm
                                    ? ' · ETH priced so $1 buys the same pebbles as on Solana'
                                    : ' · 1,000 Pebbles = 1 SOL'}
                                {priceInfo?.pebbleUsd != null && (
                                    <span className="text-emerald-400/80"> · 1 🪨 {formatUsd(priceInfo.pebbleUsd)}</span>
                                )}
                            </p>

                            {BUNDLES.map((bundle) => {
                                const displayRolls = Math.floor(bundle.pebbles / ROLL_COST);
                                const quote = ethQuotes[bundle.id];
                                const usd = isEvm
                                    ? (quote?.usdValue ?? (priceInfo?.pebbleUsd != null ? bundle.pebbles * priceInfo.pebbleUsd : null))
                                    : (priceInfo?.solUsd != null ? bundle.sol * priceInfo.solUsd : null);
                                const priceLine = isEvm
                                    ? (quote?.ethAmount != null
                                        ? `${Number(quote.ethAmount).toFixed(6)} ETH`
                                        : 'Getting price…')
                                    : `${bundle.sol} SOL`;

                                return (
                                    <button
                                        key={bundle.id}
                                        type="button"
                                        onClick={() => handlePurchase(bundle)}
                                        disabled={isPurchasing || (isEvm && !quote?.quoteId)}
                                        className={`w-full p-3 rounded-xl border transition-all ${
                                            bundle.featured
                                                ? 'bg-gradient-to-r from-purple-600/40 to-pink-600/40 border-purple-400/50 hover:border-purple-400'
                                                : 'bg-black/30 border-purple-500/20 hover:border-purple-500/50 hover:bg-black/50'
                                        } ${isPurchasing && selectedBundle?.id === bundle.id ? 'opacity-50' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">🪨</span>
                                                <div className="text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold">
                                                            {bundle.pebbles.toLocaleString()}
                                                        </span>
                                                        {bundle.bonus > 0 && !isEvm && (
                                                            <span className="text-green-400 text-xs font-bold bg-green-400/20 px-1.5 py-0.5 rounded">
                                                                +{bundle.bonusPercent}%
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-purple-300/60">
                                                        {displayRolls} rolls
                                                        {usd != null && (
                                                            <span className="text-emerald-400/70"> · {formatUsd(usd)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-white font-bold text-sm">{priceLine}</div>
                                                {bundle.featured && (
                                                    <div className="text-xs text-yellow-400">Popular</div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm text-purple-300/80 block">Amount to Withdraw</label>
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
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-300/60 text-sm">🪨</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleSetMax}
                                        disabled={pebbles < MIN_WITHDRAWAL}
                                        className="px-4 py-2 bg-purple-600/30 border border-purple-500/30 rounded-lg text-purple-300 text-sm font-bold hover:bg-purple-600/50 disabled:opacity-50"
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>

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
                                        <span className="text-green-400 font-bold">
                                            {nativeToReceive != null
                                                ? `${nativeToReceive.toFixed(isEvm ? 6 : 4)} ${assetLabel}`
                                                : `… ${assetLabel}`}
                                        </span>
                                    </div>
                                    {priceInfo?.pebbleUsd != null && (
                                        <div className="flex justify-between text-xs text-emerald-400/80">
                                            <span>≈ USD</span>
                                            <span>{formatUsd(netPebbles * priceInfo.pebbleUsd)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleWithdraw}
                                disabled={!canWithdraw || isWithdrawing || (isEvm && nativeToReceive == null)}
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
                                    `Withdraw ${nativeToReceive != null ? nativeToReceive.toFixed(isEvm ? 6 : 4) : '…'} ${assetLabel}`
                                )}
                            </button>

                            {withdrawals.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-sm text-purple-300/80 font-bold">Recent Withdrawals</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {withdrawals.map((w) => {
                                            const wAsset = w.asset || (String(w.txSignature || '').startsWith('0x') ? 'ETH' : 'SOL');
                                            const explorer = w.txSignature
                                                ? getTxExplorerUrl(w.txSignature, w.chainId || (wAsset === 'ETH' ? chainId : 'solana'))
                                                : null;
                                            return (
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
                                                            <span className="text-green-400">
                                                                {w.solAmount?.toFixed(wAsset === 'ETH' ? 6 : 4)} {wAsset}
                                                            </span>
                                                        </div>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                                            w.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            w.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                            w.status === 'cancelled' ? 'bg-gray-500/20 text-gray-400' :
                                                            'bg-red-500/20 text-red-400'
                                                        }`}>
                                                            {w.status === 'pending' && w.queuePosition ? `#${w.queuePosition} in queue` : w.status}
                                                        </span>
                                                    </div>
                                                    {w.status === 'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelWithdrawal(w.withdrawalId)}
                                                            className="mt-2 w-full py-1.5 text-xs bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/30"
                                                        >
                                                            Cancel & Refund Pebbles
                                                        </button>
                                                    )}
                                                    {explorer && (
                                                        <a
                                                            href={explorer}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-purple-400 hover:text-purple-300 block mt-1"
                                                        >
                                                            View on {getExplorerLabelForTx(w.txSignature, w.chainId)} ↗
                                                        </a>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {loadingHistory && (
                                <p className="text-center text-purple-300/60 text-sm animate-pulse">Loading history...</p>
                            )}
                        </div>
                    )}
                </div>

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
                        <p className="text-purple-300 text-sm text-center animate-pulse">Processing transaction...</p>
                    </div>
                )}

                <div className="p-3 bg-black/30 border-t border-purple-500/20">
                    <p className="text-[10px] text-white/40 text-center">
                        {activeTab === 'buy'
                            ? (isEvm
                                ? 'ETH sent to platform rake wallet · pebbles credited from locked USD quote'
                                : 'SOL sent to platform wallet · Pebbles credited after confirmation')
                            : `${WITHDRAWAL_RAKE}% rake · same-chain payout only (${assetLabel}) · ${platformToken} nametags unchanged`}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PebblesPurchaseModal;
