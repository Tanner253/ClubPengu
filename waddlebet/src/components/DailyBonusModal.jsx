/**
 * DailyBonusModal - Daily Login Bonus Panel
 * Rewards players with 5,000 $CP for 1 hour of play time
 * 24 hour cooldown between claims
 * 
 * Design copied from SettingsMenu.jsx
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useClickOutside, useEscapeKey } from '../hooks';
import { useMultiplayer } from '../multiplayer';

// Generate secure random nonce for replay protection
const generateNonce = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
};

const DailyBonusModal = ({ isOpen, onClose }) => {
    const menuRef = useRef(null);
    const { send, registerCallbacks, isAuthenticated } = useMultiplayer();
    
    // State
    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [claimResult, setClaimResult] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [receivedAt, setReceivedAt] = useState(null);
    const [localSessionSeconds, setLocalSessionSeconds] = useState(0);
    
    // Close handlers
    useClickOutside(menuRef, onClose, isOpen);
    useEscapeKey(onClose, isOpen);
    
    // Register callbacks for daily bonus responses
    useEffect(() => {
        if (!isOpen || !registerCallbacks) return;
        
        registerCallbacks({
            onDailyBonusStatus: (msg) => {
                setIsLoading(false);
                if (msg.success !== false) {
                    setStatus(msg);
                    setReceivedAt(Date.now());
                    setClaimResult(null);
                    // Initialize local session seconds from server data
                    setLocalSessionSeconds((msg.sessionMinutes || 0) * 60);
                }
            },
            onDailyBonusResult: (msg) => {
                setIsClaiming(false);
                setClaimResult(msg);
                if (msg.success) {
                    // Refresh status after successful claim
                    setTimeout(() => {
                        send({ type: 'daily_bonus_status' });
                    }, 500);
                }
            }
        });
    }, [isOpen, registerCallbacks, send]);
    
    // Fetch status when opened
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            setIsLoading(true);
            setClaimResult(null);
            send({ type: 'daily_bonus_status' });
        }
    }, [isOpen, isAuthenticated, send]);
    
    // Update session time every second (count up)
    useEffect(() => {
        if (!isOpen || !status || status.hasEnoughTime) return;
        
        const interval = setInterval(() => {
            setLocalSessionSeconds(prev => {
                const newValue = prev + 1;
                const requiredSeconds = (status.requiredMinutes || 60) * 60;
                // If we've reached the requirement, refresh status from server
                if (newValue >= requiredSeconds && prev < requiredSeconds) {
                    send({ type: 'daily_bonus_status' });
                }
                return newValue;
            });
        }, 1000);
        
        return () => clearInterval(interval);
    }, [isOpen, status, send]);
    
    // Update countdown timer
    useEffect(() => {
        if (!status?.timeUntilClaim || status.timeUntilClaim <= 0) {
            setCountdown(null);
            return;
        }
        
        const updateCountdown = () => {
            const elapsed = Date.now() - (receivedAt || Date.now());
            const remaining = status.timeUntilClaim - elapsed;
            
            if (remaining <= 0) {
                setCountdown(null);
                // Refresh status when cooldown expires
                send({ type: 'daily_bonus_status' });
                return;
            }
            
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            
            setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };
        
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [status, receivedAt, send]);
    
    // Claim handler
    const handleClaim = useCallback(() => {
        if (isClaiming || !status?.canClaim) return;
        
        setIsClaiming(true);
        setClaimResult(null);
        
        const nonce = generateNonce();
        send({ type: 'daily_bonus_claim', nonce });
    }, [isClaiming, status, send]);
    
    if (!isOpen) return null;
    
    // Calculate progress percentage for session time (use local seconds for real-time updates)
    const requiredSeconds = (status?.requiredMinutes || 60) * 60;
    const sessionProgress = status ? Math.min(100, (localSessionSeconds / requiredSeconds) * 100) : 0;
    const currentMinutes = Math.floor(localSessionSeconds / 60);
    const currentSeconds = localSessionSeconds % 60;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-2 sm:p-4">
            <div 
                ref={menuRef}
                className="bg-gradient-to-br from-slate-900/98 via-slate-800/98 to-slate-900/98 rounded-3xl border border-white/10 shadow-2xl w-full max-w-[480px] max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
                style={{
                    boxShadow: '0 0 60px rgba(0, 200, 255, 0.1), 0 0 100px rgba(100, 50, 200, 0.05)'
                }}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative px-6 pt-5 pb-3 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                                <span className="text-lg">🎁</span>
                            </div>
                            <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                                Daily Bonus
                            </span>
                        </h2>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 overscroll-contain">
                    
                    {!isAuthenticated ? (
                        <div className="text-center py-8">
                            <div className="text-5xl mb-4">🔐</div>
                            <p className="text-white/60 text-sm">Connect your wallet to access daily bonuses</p>
                        </div>
                    ) : isLoading ? (
                        <div className="text-center py-8">
                            <div className="text-4xl animate-bounce mb-4">⏳</div>
                            <p className="text-white/60 text-sm">Loading bonus status...</p>
                        </div>
                    ) : status?.error ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">⚠️</div>
                            <p className="text-red-400 text-sm">{status.message || status.error}</p>
                        </div>
                    ) : (
                        <>
                            {/* Reward Info Card */}
                            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-2xl p-4 border border-cyan-500/20">
                                <div className="text-center">
                                    <div className="text-3xl mb-2">💰</div>
                                    <div className="text-2xl font-bold text-cyan-300">
                                        5,000 $CP
                                    </div>
                                    <p className="text-white/50 text-xs mt-1">
                                        Daily reward for active players
                                    </p>
                                </div>
                            </div>
                            
                            {/* Session Time Progress */}
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">⏱️</span>
                                        <span className="text-white text-sm font-medium">Play Time</span>
                                    </div>
                                    <span className="text-cyan-400 font-mono text-sm">
                                        {currentMinutes}:{currentSeconds.toString().padStart(2, '0')} / {status?.requiredMinutes || 60}:00
                                    </span>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ${
                                            sessionProgress >= 100 
                                                ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                                                : 'bg-gradient-to-r from-cyan-500 to-blue-400'
                                        }`}
                                        style={{ width: `${sessionProgress}%` }}
                                    />
                                </div>
                                
                                <p className="text-white/40 text-xs mt-2">
                                    {sessionProgress >= 100 
                                        ? '✅ Time requirement met!' 
                                        : (() => {
                                            const totalSecondsRemaining = Math.max(0, requiredSeconds - localSessionSeconds);
                                            const mins = Math.floor(totalSecondsRemaining / 60);
                                            const secs = totalSecondsRemaining % 60;
                                            return `${mins}:${secs.toString().padStart(2, '0')} remaining`;
                                        })()
                                    }
                                </p>
                            </div>
                            
                            {/* Cooldown Timer */}
                            {countdown && (
                                <div className="bg-white/5 rounded-2xl p-4 border border-purple-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">🕐</span>
                                            <span className="text-white text-sm font-medium">Next Claim In</span>
                                        </div>
                                        <span className="text-2xl font-mono font-bold text-purple-300">
                                            {countdown}
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Claim Statistics */}
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-base">📊</span>
                                    <span className="text-white text-sm font-medium">Your Stats</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <div className="text-xl font-bold text-cyan-300">
                                            {status?.totalClaimed || 0}
                                        </div>
                                        <div className="text-white/40 text-xs">Total Claims</div>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <div className="text-xl font-bold text-green-300">
                                            {((status?.totalWaddleEarned || 0) / 1000).toFixed(0)}K
                                        </div>
                                        <div className="text-white/40 text-xs">$CP Earned</div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Custodial Wallet Balance */}
                            {status?.custodialBalance !== null && status?.custodialBalance !== undefined && (
                                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-500/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">🏦</span>
                                            <span className="text-white/60 text-sm">Reward Pool</span>
                                        </div>
                                        <span className="text-purple-300 font-mono font-bold">
                                            {status.custodialBalance?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '---'} $CP
                                        </span>
                                    </div>
                                </div>
                            )}
                            
                            {/* Claim Result */}
                            {claimResult && (
                                <div className={`rounded-2xl p-4 border ${
                                    claimResult.success 
                                        ? 'bg-green-500/20 border-green-500/30' 
                                        : 'bg-red-500/20 border-red-500/30'
                                }`}>
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">
                                            {claimResult.success ? '🎉' : '❌'}
                                        </span>
                                        <div className="flex-1">
                                            <div className={`font-bold ${
                                                claimResult.success ? 'text-green-300' : 'text-red-300'
                                            }`}>
                                                {claimResult.success ? 'Bonus Claimed!' : 'Claim Failed'}
                                            </div>
                                            <p className="text-white/60 text-sm mt-1">
                                                {claimResult.message}
                                            </p>
                                            {claimResult.txSignature && (
                                                <a 
                                                    href={`https://solscan.io/tx/${claimResult.txSignature}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-cyan-400 text-xs hover:text-cyan-300 mt-2 inline-block"
                                                >
                                                    View Transaction ↗
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 border-t border-white/5">
                    {isAuthenticated && status && !status.error ? (
                        <button
                            onClick={handleClaim}
                            disabled={!status.canClaim || isClaiming}
                            className={`w-full py-3 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                                status.canClaim && !isClaiming
                                    ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white hover:shadow-cyan-500/25'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                            }`}
                        >
                            {isClaiming ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span>
                                    Claiming...
                                </span>
                            ) : status.canClaim ? (
                                <span className="flex items-center justify-center gap-2">
                                    🎁 Claim 5,000 $CP
                                </span>
                            ) : !status.cooldownExpired ? (
                                <span className="flex items-center justify-center gap-2">
                                    🕐 Cooldown Active
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    ⏱️ Play {status.minutesRemaining} More Minutes
                                </span>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white rounded-2xl font-bold text-sm transition-all shadow-lg hover:shadow-cyan-500/25"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DailyBonusModal;
