/**
 * ReferralPanel - Referral system UI for Settings menu
 * Shows referral link, earnings, referred users, and payout functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMultiplayer } from '../multiplayer';

const ReferralPanel = ({ isAuthenticated }) => {
    const { sendMessage, addMessageHandler, removeMessageHandler, userData } = useMultiplayer();
    const [referralInfo, setReferralInfo] = useState(null);
    const [referredUsers, setReferredUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [payoutPending, setPayoutPending] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [error, setError] = useState(null);
    
    // Fetch referral info on mount
    useEffect(() => {
        if (!isAuthenticated) return;
        
        const handleReferralInfo = (msg) => {
            if (msg.type === 'referral_info') {
                setReferralInfo(msg);
                setIsLoading(false);
            }
        };
        
        const handleReferralList = (msg) => {
            if (msg.type === 'referral_list') {
                setReferredUsers(msg.referrals || []);
            }
        };
        
        const handlePayoutResult = (msg) => {
            if (msg.type === 'referral_payout_result') {
                setPayoutPending(false);
                if (msg.success) {
                    setError(null);
                    // Will be updated via referral_info message
                } else {
                    setError(msg.message || msg.error);
                }
            }
        };
        
        addMessageHandler(handleReferralInfo);
        addMessageHandler(handleReferralList);
        addMessageHandler(handlePayoutResult);
        
        // Request initial data
        sendMessage({ type: 'referral_info' });
        sendMessage({ type: 'referral_list', limit: 20 });
        
        return () => {
            removeMessageHandler(handleReferralInfo);
            removeMessageHandler(handleReferralList);
            removeMessageHandler(handlePayoutResult);
        };
    }, [isAuthenticated, sendMessage, addMessageHandler, removeMessageHandler]);
    
    const handleCopyLink = useCallback(() => {
        if (!referralInfo?.referralLink) return;
        
        navigator.clipboard.writeText(referralInfo.referralLink).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    }, [referralInfo?.referralLink]);
    
    const handleRequestPayout = useCallback(() => {
        if (payoutPending) return;
        setPayoutPending(true);
        setError(null);
        sendMessage({ type: 'referral_payout' });
    }, [payoutPending, sendMessage]);
    
    if (!isAuthenticated) {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
                    <span className="text-3xl">🔗</span>
                </div>
                <h3 className="text-white font-bold mb-2">Connect Wallet</h3>
                <p className="text-white/50 text-sm">
                    Connect your wallet to access the referral system
                </p>
            </div>
        );
    }
    
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
            </div>
        );
    }
    
    const earnings = referralInfo?.earnings || {};
    const stats = referralInfo?.stats || {};
    const canCashOut = earnings.canCashOut;
    const pendingSol = earnings.pendingSol || 0;
    const thresholdSol = earnings.thresholdSol || 0.5;
    const progressPercent = Math.min(100, (pendingSol / thresholdSol) * 100);
    
    return (
        <div className="space-y-4">
            {/* Referral Link Section */}
            <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl p-4 border border-pink-500/20">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shadow-lg">
                        <span className="text-lg">🔗</span>
                    </div>
                    <div>
                        <div className="text-white font-bold text-sm">Your Referral Link</div>
                        <div className="text-white/40 text-xs">Share to earn 15% of their spending!</div>
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <div className="flex-1 bg-black/30 rounded-xl px-3 py-2 text-cyan-300 text-xs font-mono truncate border border-white/5">
                        {referralInfo?.referralLink || `waddle.bet/ref/${userData?.username}`}
                    </div>
                    <button
                        onClick={handleCopyLink}
                        className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            copySuccess
                                ? 'bg-green-500 text-white'
                                : 'bg-pink-500 hover:bg-pink-400 text-white'
                        }`}
                    >
                        {copySuccess ? '✓ Copied!' : 'Copy'}
                    </button>
                </div>
            </div>
            
            {/* Promo Banner */}
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-3 border border-amber-500/30">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🎁</span>
                    <div>
                        <div className="text-amber-300 font-bold text-sm">Launch Promo!</div>
                        <div className="text-white/60 text-xs">
                            Both you and your friend get <span className="text-amber-300 font-bold">1,000 $CP</span> when they play for 1 hour!
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Earnings Section */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-white/60 text-xs uppercase tracking-wider mb-3">Earnings</div>
                
                {/* Pending Balance */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-white/70 text-sm">Pending Balance</span>
                    <span className="text-cyan-300 font-bold text-lg">{pendingSol.toFixed(4)} SOL</span>
                </div>
                
                {/* Progress to Payout */}
                <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/40">Progress to payout</span>
                        <span className="text-white/60">{thresholdSol} SOL minimum</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                                canCashOut 
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>
                
                {/* Payout Button */}
                <button
                    onClick={handleRequestPayout}
                    disabled={!canCashOut || payoutPending}
                    className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                        canCashOut && !payoutPending
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white shadow-lg hover:shadow-green-500/25'
                            : 'bg-white/5 text-white/30 cursor-not-allowed'
                    }`}
                >
                    {payoutPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin">⏳</span> Processing...
                        </span>
                    ) : canCashOut ? (
                        `Cash Out ${pendingSol.toFixed(4)} SOL`
                    ) : (
                        `${(thresholdSol - pendingSol).toFixed(4)} SOL until payout`
                    )}
                </button>
                
                {error && (
                    <div className="mt-2 text-red-400 text-xs text-center">{error}</div>
                )}
                
                {/* Lifetime Stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/5">
                    <div>
                        <div className="text-white/40 text-xs">Total Paid</div>
                        <div className="text-green-400 font-bold">{(earnings.totalPaidOutSol || 0).toFixed(4)} SOL</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs">Tier 1 (15%)</div>
                        <div className="text-cyan-400 font-bold">{(earnings.tier1EarningsSol || 0).toFixed(4)} SOL</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs">Tier 2 (3%)</div>
                        <div className="text-purple-400 font-bold">{(earnings.tier2EarningsSol || 0).toFixed(4)} SOL</div>
                    </div>
                </div>
            </div>
            
            {/* Network Stats */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-white/60 text-xs uppercase tracking-wider mb-3">Your Network</div>
                
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-2xl font-bold text-pink-400">{stats.tier1Count || 0}</div>
                        <div className="text-white/40 text-xs">Direct Referrals</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-2xl font-bold text-green-400">{stats.tier1ActiveCount || 0}</div>
                        <div className="text-white/40 text-xs">Active (1hr+)</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-3">
                        <div className="text-2xl font-bold text-purple-400">{stats.tier2Count || 0}</div>
                        <div className="text-white/40 text-xs">Tier 2</div>
                    </div>
                </div>
            </div>
            
            {/* Referred Users List */}
            {referredUsers.length > 0 && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="text-white/60 text-xs uppercase tracking-wider mb-3">Recent Referrals</div>
                    
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {referredUsers.slice(0, 10).map((user, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                                        user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'
                                    }`}>
                                        {user.isActive ? '✓' : '⏳'}
                                    </div>
                                    <span className="text-white text-sm font-medium">{user.username}</span>
                                </div>
                                <div className="text-white/40 text-xs">
                                    {user.playTimeMinutes >= 60 
                                        ? `${Math.floor(user.playTimeMinutes / 60)}h ${user.playTimeMinutes % 60}m`
                                        : `${user.playTimeMinutes}m`
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {/* How You Earn - Detailed Revenue Breakdown */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-2xl p-4 border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💰</span>
                    <div className="text-white font-bold text-sm">How You Earn SOL</div>
                </div>
                
                {/* Revenue Source: Gacha */}
                <div className="bg-black/20 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🎰</span>
                        <span className="text-white font-bold text-sm">Gacha Rolls (Pebble Spending)</span>
                        <span className="ml-auto text-green-400 text-xs font-bold bg-green-500/20 px-2 py-0.5 rounded-full">ACTIVE</span>
                    </div>
                    <p className="text-white/60 text-xs mb-2">
                        When your referrals spend Pebbles on gacha rolls for cosmetics, you earn a percentage of the SOL value.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-cyan-500/10 rounded-lg p-2 border border-cyan-500/20">
                            <div className="text-cyan-400 font-bold">Tier 1: 15%</div>
                            <div className="text-white/50">Direct referrals</div>
                        </div>
                        <div className="bg-purple-500/10 rounded-lg p-2 border border-purple-500/20">
                            <div className="text-purple-400 font-bold">Tier 2: 3%</div>
                            <div className="text-white/50">Their referrals</div>
                        </div>
                    </div>
                </div>
                
                {/* Math Example */}
                <div className="bg-black/20 rounded-xl p-3 mb-3">
                    <div className="text-white/80 text-xs font-bold mb-2">📊 Example Calculation</div>
                    <div className="text-white/60 text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Your friend spends</span>
                            <span className="text-white font-mono">100 Pebbles</span>
                        </div>
                        <div className="flex justify-between">
                            <span>SOL equivalent (1000 Pebbles = 1 SOL)</span>
                            <span className="text-white font-mono">0.1 SOL</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-1 mt-1">
                            <span className="text-cyan-400">Your Tier 1 earnings (15%)</span>
                            <span className="text-cyan-400 font-bold font-mono">0.015 SOL</span>
                        </div>
                    </div>
                </div>
                
                {/* Other Revenue Sources */}
                <div className="space-y-2">
                    <div className="text-white/40 text-xs uppercase tracking-wider">Other Activities</div>
                    
                    <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>🃏</span>
                        <span>P2P Wagers (Coin games)</span>
                        <span className="ml-auto text-white/30 bg-white/5 px-2 py-0.5 rounded">No rake</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>🎰</span>
                        <span>Slots / Fishing (Coins)</span>
                        <span className="ml-auto text-white/30 bg-white/5 px-2 py-0.5 rounded">In-game only</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                        <span>🏠</span>
                        <span>Igloo Rentals</span>
                        <span className="ml-auto text-amber-400/50 bg-amber-500/10 px-2 py-0.5 rounded">Coming soon</span>
                    </div>
                </div>
            </div>
            
            {/* How It Works - Quick Steps */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-white/60 text-xs uppercase tracking-wider mb-3">Quick Start</div>
                
                <div className="space-y-3 text-sm">
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-xs shrink-0">1</div>
                        <div className="text-white/70">Share your unique link with friends</div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-xs shrink-0">2</div>
                        <div className="text-white/70">They sign up & connect wallet</div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-xs shrink-0">3</div>
                        <div className="text-white/70">Play 1 hour → Both get <span className="text-amber-400 font-bold">1,000 $CP</span></div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs shrink-0">$</div>
                        <div className="text-white/70">They roll gacha → You earn <span className="text-green-400 font-bold">15% SOL</span></div>
                    </div>
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">+</div>
                        <div className="text-white/70">Their friends roll → You earn <span className="text-purple-400 font-bold">3% SOL</span></div>
                    </div>
                </div>
                
                {/* Payout Info */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs">
                    <span className="text-amber-400">⚡</span>
                    <span className="text-white/50">Minimum payout: <span className="text-white font-bold">0.5 SOL</span></span>
                    <span className="text-white/30">•</span>
                    <span className="text-white/50">Sent to your connected wallet</span>
                </div>
            </div>
        </div>
    );
};

export default ReferralPanel;

