/**
 * StatsModal - Comprehensive player statistics and history
 * Shows game stats, match history, transaction history with Solscan links
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMultiplayer } from '../multiplayer/MultiplayerContext';

// Generate Solscan link
const getSolscanLink = (txOrAddress, type = 'tx') => {
    if (!txOrAddress) return null;
    if (txOrAddress.startsWith('DEV_')) return null;
    const base = 'https://solscan.io';
    return type === 'tx' ? `${base}/tx/${txOrAddress}` : `${base}/account/${txOrAddress}`;
};

// Format date nicely
const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
};

// Format duration
const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};

// Game type emoji map
const gameEmojis = {
    cardJitsu: '⚔️',
    ticTacToe: '⭕',
    connect4: '🔴',
    blackjack: '🎰',
    monopoly: '🎩',
    uno: '🃏',
    battleship: '🚢',
    pong: '🏓'
};

// Game type display names
const gameNames = {
    cardJitsu: 'Card Jitsu',
    ticTacToe: 'Tic Tac Toe',
    connect4: 'Connect 4',
    blackjack: 'Blackjack',
    monopoly: 'Monopoly',
    uno: 'UNO',
    battleship: 'Battleship',
    pong: 'Pong'
};

// Transaction type display
const txTypeDisplay = {
    // Coin transactions
    wager_escrow: { label: 'Wager Locked', color: 'text-orange-400', icon: '🔒' },
    wager_payout: { label: 'Wager Won', color: 'text-green-400', icon: '🏆' },
    wager_refund: { label: 'Wager Refund', color: 'text-yellow-400', icon: '↩️' },
    slot_spin: { label: 'Slot Spin', color: 'text-purple-400', icon: '🎰' },
    slot_payout: { label: 'Slot Win', color: 'text-green-400', icon: '💰' },
    blackjack_bet: { label: 'Blackjack Bet', color: 'text-orange-400', icon: '🃏' },
    blackjack_win: { label: 'Blackjack Win', color: 'text-green-400', icon: '🎰' },
    fishing_bait: { label: 'Fishing Bait', color: 'text-blue-400', icon: '🪱' },
    fishing_catch: { label: 'Fish Sold', color: 'text-green-400', icon: '🐟' },
    chat_bonus: { label: 'Chat Bonus', color: 'text-cyan-400', icon: '💬' },
    promo_bonus: { label: 'Promo Code', color: 'text-pink-400', icon: '🎁' },
    starting_bonus: { label: 'Welcome Bonus', color: 'text-green-400', icon: '🎉' },
    puffle_adopt: { label: 'Pet Adoption', color: 'text-red-400', icon: '🐾' },
    purchase: { label: 'Purchase', color: 'text-red-400', icon: '🛒' },
    // Token transactions (with Solscan links)
    token_wager: { label: 'Token Wager', color: 'text-purple-400', icon: '💎' },
    token_entry_fee: { label: 'Entry Fee (Token)', color: 'text-cyan-400', icon: '🎟️' },
    token_rent: { label: 'Space Rent (Token)', color: 'text-blue-400', icon: '🏠' },
    token_rent_renewal: { label: 'Rent Renewal (Token)', color: 'text-blue-400', icon: '🔄' },
    token_transfer: { label: 'Token Transfer', color: 'text-gray-400', icon: '💸' },
    // Pebble transactions
    pebble_deposit: { label: 'Pebbles Purchased', color: 'text-purple-400', icon: '🪨' },
    pebble_withdrawal: { label: 'Pebbles Withdrawn', color: 'text-orange-400', icon: '💸' },
    pebble_rake: { label: 'Withdrawal Fee', color: 'text-red-400', icon: '🏦' },
    // Gacha transactions
    gacha_roll: { label: 'Gacha Roll', color: 'text-pink-400', icon: '🎰' },
    gacha_dupe_gold: { label: 'Duplicate Gold', color: 'text-yellow-400', icon: '✨' }
};

// Transaction filter categories
const txCategories = {
    all: { label: 'All', icon: '📋' },
    pebbles: { label: 'Pebbles', icon: '🪨', types: ['pebble_deposit', 'pebble_withdrawal', 'pebble_rake'] },
    gacha: { label: 'Gacha', icon: '🎰', types: ['gacha_roll', 'gacha_dupe_gold', 'slot_spin', 'slot_payout'] },
    wagers: { label: 'Wagers', icon: '🎲', types: ['wager_escrow', 'wager_payout', 'wager_refund', 'token_wager'] },
    tokens: { label: 'Tokens', icon: '💎', types: ['token_wager', 'token_entry_fee', 'token_rent', 'token_rent_renewal', 'token_transfer'] },
    rewards: { label: 'Rewards', icon: '🎁', types: ['chat_bonus', 'promo_bonus', 'starting_bonus', 'fishing_catch'] },
    spending: { label: 'Spending', icon: '💸', types: ['purchase', 'puffle_adopt', 'fishing_bait', 'blackjack_bet'] }
};

// TransactionsTab with filters
const TransactionsTab = ({ transactions }) => {
    const [filter, setFilter] = useState('all');
    const [direction, setDirection] = useState('all'); // 'all', 'in', 'out'
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filter transactions
    const filteredTx = transactions.filter(tx => {
        // Category filter
        if (filter !== 'all') {
            const category = txCategories[filter];
            if (!category.types?.includes(tx.type)) return false;
        }
        
        // Direction filter
        if (direction === 'in' && tx.direction !== 'in') return false;
        if (direction === 'out' && tx.direction !== 'out') return false;
        
        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            const typeInfo = txTypeDisplay[tx.type] || { label: tx.type };
            if (!typeInfo.label.toLowerCase().includes(search) &&
                !tx.reason?.toLowerCase().includes(search) &&
                !tx.signature?.toLowerCase().includes(search)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Summary stats
    const totalIn = filteredTx.filter(tx => tx.direction === 'in').reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const totalOut = filteredTx.filter(tx => tx.direction === 'out').reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    return (
        <div className="space-y-3">
            {/* Filters */}
            <div className="bg-black/30 rounded-xl p-3 border border-white/10 space-y-3">
                {/* Category Pills */}
                <div className="flex flex-wrap gap-1.5">
                    {Object.entries(txCategories).map(([key, cat]) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                                filter === key
                                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-transparent'
                            }`}
                        >
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>
                
                {/* Direction + Search Row */}
                <div className="flex gap-2 items-center">
                    {/* Direction Toggle */}
                    <div className="flex bg-black/30 rounded-lg p-0.5">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'in', label: '↓ In', color: 'text-green-400' },
                            { id: 'out', label: '↑ Out', color: 'text-red-400' }
                        ].map(d => (
                            <button
                                key={d.id}
                                onClick={() => setDirection(d.id)}
                                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                                    direction === d.id
                                        ? `bg-white/10 ${d.color || 'text-white'}`
                                        : 'text-white/50 hover:text-white/70'
                                }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                    
                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                    />
                </div>
                
                {/* Summary */}
                <div className="flex items-center justify-between text-xs border-t border-white/10 pt-2">
                    <span className="text-white/50">{filteredTx.length} transactions</span>
                    <div className="flex gap-3">
                        <span className="text-green-400">+{totalIn.toLocaleString()}</span>
                        <span className="text-red-400">-{totalOut.toLocaleString()}</span>
                        <span className={totalIn - totalOut >= 0 ? 'text-green-400' : 'text-red-400'}>
                            = {(totalIn - totalOut).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Transaction List */}
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {filteredTx.length === 0 ? (
                    <div className="text-center py-8 text-white/50">
                        <span className="text-3xl block mb-2">🔍</span>
                        No transactions match filters
                    </div>
                ) : (
                    filteredTx.map((tx) => {
                        const typeInfo = txTypeDisplay[tx.type] || { label: tx.type, color: 'text-white', icon: '📝' };
                        const isIncoming = tx.direction === 'in';
                        const isTokenTx = tx.signature || tx.type?.startsWith('token_');
                        const solscanTxLink = tx.signature ? getSolscanLink(tx.signature, 'tx') : null;
                        
                        return (
                            <div 
                                key={tx.id}
                                className={`bg-black/30 rounded-xl p-3 border transition-colors ${
                                    isTokenTx 
                                        ? 'border-purple-500/30 hover:border-purple-500/50' 
                                        : 'border-white/10 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{typeInfo.icon}</span>
                                        <div>
                                            <p className={`font-medium text-sm ${typeInfo.color}`}>
                                                {typeInfo.label}
                                            </p>
                                            <p className="text-white/50 text-xs">
                                                {formatDate(tx.timestamp)}
                                                {tx.reason && ` • ${tx.reason}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                                            {isIncoming ? '+' : '-'}{tx.amount} {tx.currency === 'coins' ? '💰' : tx.currency === 'pebbles' ? '🪨' : `💎 ${tx.currency}`}
                                        </p>
                                        {tx.tokenAddress && (
                                            <a
                                                href={getSolscanLink(tx.tokenAddress, 'account')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-400/60 text-xs hover:text-purple-300"
                                            >
                                                {tx.tokenAddress.slice(0, 4)}...{tx.tokenAddress.slice(-4)}
                                            </a>
                                        )}
                                    </div>
                                </div>
                                
                                {solscanTxLink && (
                                    <a
                                        href={solscanTxLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                                    >
                                        🔗 View on Solscan
                                        <span className="text-purple-400/50">({tx.signature.slice(0, 8)}...)</span>
                                    </a>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const StatsModal = ({ isOpen, onClose }) => {
    const { isAuthenticated, walletAddress } = useMultiplayer();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    
    // Fetch full stats when modal opens
    const fetchStats = useCallback(() => {
        if (!isAuthenticated || !window.__multiplayerWs) return;
        
        setLoading(true);
        setError(null);
        
        // Send request
        window.__multiplayerWs.send(JSON.stringify({ type: 'my_full_stats' }));
        
        // Listen for response
        const handleMessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.type === 'my_full_stats') {
                    setData(msg);
                    setLoading(false);
                    window.__multiplayerWs.removeEventListener('message', handleMessage);
                } else if (msg.type === 'my_full_stats_error') {
                    setError(msg.error);
                    setLoading(false);
                    window.__multiplayerWs.removeEventListener('message', handleMessage);
                }
            } catch (e) {
                // Ignore non-JSON messages
            }
        };
        
        window.__multiplayerWs.addEventListener('message', handleMessage);
        
        // Cleanup timeout
        setTimeout(() => {
            window.__multiplayerWs?.removeEventListener('message', handleMessage);
        }, 10000);
    }, [isAuthenticated]);
    
    useEffect(() => {
        if (isOpen && isAuthenticated) {
            // Clear stale data and fetch fresh
            setData(null);
            setError(null);
            fetchStats();
        }
    }, [isOpen, isAuthenticated, fetchStats]);
    
    if (!isOpen) return null;
    
    const stats = data?.stats || {};
    const matchHistory = data?.matchHistory || [];
    const transactions = data?.transactions || [];
    
    // Calculate additional stats
    const winRate = stats.totalGames > 0 
        ? Math.round((stats.totalWins / stats.totalGames) * 100) 
        : 0;
    
    const totalTokensWon = matchHistory
        .filter(m => m.won && m.wagerToken)
        .reduce((sum, m) => sum + (m.wagerToken?.amount || 0) * 2, 0);
    
    const totalCoinsWon = matchHistory
        .filter(m => m.won)
        .reduce((sum, m) => sum + (m.wagerAmount || 0) * 2, 0);
    
    const totalCoinsLost = matchHistory
        .filter(m => !m.won && !m.isDraw)
        .reduce((sum, m) => sum + (m.wagerAmount || 0), 0);
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600/30 to-cyan-600/30 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        <h2 className="text-white font-bold text-lg">My Statistics</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchStats}
                            disabled={loading}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors disabled:opacity-50"
                            title="Refresh stats"
                        >
                            <span className={loading ? 'animate-spin' : ''}>🔄</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex border-b border-white/10">
                    {[
                        { id: 'overview', label: 'Overview', icon: '📈' },
                        { id: 'matches', label: 'Match History', icon: '🎮' },
                        { id: 'transactions', label: 'Transactions', icon: '💰' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 px-3 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                                activeTab === tab.id
                                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                                    : 'text-white/60 hover:text-white/80 hover:bg-white/5'
                            }`}
                        >
                            <span>{tab.icon}</span>
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
                
                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent" />
                            <span className="ml-3 text-white/60">Loading stats...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <span className="text-4xl mb-4 block">⚠️</span>
                            <p className="text-red-400">{error === 'NOT_AUTHENTICATED' ? 'Please connect your wallet to view stats' : 'Failed to load stats'}</p>
                            <button
                                onClick={fetchStats}
                                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4">
                                    {/* Main Stats Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl p-3 border border-yellow-500/30">
                                            <p className="text-yellow-400/60 text-xs mb-1">Coins Balance</p>
                                            <p className="text-yellow-400 font-bold text-xl">💰 {stats.coins || 0}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-3 border border-purple-500/30">
                                            <p className="text-purple-400/60 text-xs mb-1">Pebbles Balance</p>
                                            <p className="text-purple-400 font-bold text-xl">🪨 {stats.pebbles || 0}</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-3 border border-green-500/30">
                                            <p className="text-green-400/60 text-xs mb-1">Win Rate</p>
                                            <p className="text-green-400 font-bold text-xl">🏆 {winRate}%</p>
                                        </div>
                                        <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl p-3 border border-cyan-500/30">
                                            <p className="text-cyan-400/60 text-xs mb-1">Total Games</p>
                                            <p className="text-cyan-400 font-bold text-xl">🎮 {stats.totalGames || 0}</p>
                                        </div>
                                    </div>
                                    
                                    {/* W/L Summary */}
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                            <span>📊</span> Win/Loss Summary
                                        </h3>
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="flex-1 bg-green-500/20 rounded-lg p-2 text-center">
                                                <p className="text-green-400 font-bold text-lg">{stats.totalWins || 0}</p>
                                                <p className="text-green-400/60 text-xs">Wins</p>
                                            </div>
                                            <div className="flex-1 bg-red-500/20 rounded-lg p-2 text-center">
                                                <p className="text-red-400 font-bold text-lg">{stats.totalLosses || 0}</p>
                                                <p className="text-red-400/60 text-xs">Losses</p>
                                            </div>
                                            <div className="flex-1 bg-gray-500/20 rounded-lg p-2 text-center">
                                                <p className="text-gray-400 font-bold text-lg">{stats.totalDraws || 0}</p>
                                                <p className="text-gray-400/60 text-xs">Draws</p>
                                            </div>
                                        </div>
                                        
                                        {/* Coins P/L */}
                                        <div className="flex items-center justify-between text-sm border-t border-white/10 pt-3">
                                            <span className="text-white/60">Coins Won (from wagers)</span>
                                            <span className="text-green-400 font-bold">+{totalCoinsWon}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm mt-1">
                                            <span className="text-white/60">Coins Lost (from wagers)</span>
                                            <span className="text-red-400 font-bold">-{totalCoinsLost}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Per-Game Stats */}
                                    <div className="bg-black/30 rounded-xl p-4 border border-white/10">
                                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                                            <span>🎯</span> Per-Game Stats
                                        </h3>
                                        <div className="space-y-2">
                                            {[
                                                { game: 'cardJitsu', w: stats.cardJitsuWins, l: stats.cardJitsuLosses, d: stats.cardJitsuDraws },
                                                { game: 'ticTacToe', w: stats.ticTacToeWins, l: stats.ticTacToeLosses, d: stats.ticTacToeDraws },
                                                { game: 'connect4', w: stats.connect4Wins, l: stats.connect4Losses, d: stats.connect4Draws },
                                                { game: 'blackjack', w: stats.blackjackWins, l: stats.blackjackLosses, d: stats.blackjackPushes, extra: stats.blackjackBlackjacks ? `${stats.blackjackBlackjacks} 🂡` : null },
                                                { game: 'uno', w: stats.unoWins, l: stats.unoLosses },
                                                { game: 'monopoly', w: stats.monopolyWins, l: stats.monopolyLosses }
                                            ].map(({ game, w, l, d, extra }) => (
                                                <div key={game} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                                    <span className="text-white/80 flex items-center gap-2">
                                                        <span>{gameEmojis[game]}</span>
                                                        <span>{gameNames[game]}</span>
                                                    </span>
                                                    <div className="flex items-center gap-3 text-sm">
                                                        <span className="text-green-400">{w || 0}W</span>
                                                        <span className="text-red-400">{l || 0}L</span>
                                                        {d !== undefined && <span className="text-gray-400">{d || 0}D</span>}
                                                        {extra && <span className="text-yellow-400" title="Natural Blackjacks">{extra}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Wallet Link */}
                                    {walletAddress && (
                                        <a
                                            href={getSolscanLink(walletAddress, 'account')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block bg-gradient-to-r from-purple-600/20 to-cyan-600/20 hover:from-purple-600/30 hover:to-cyan-600/30 rounded-xl p-3 border border-purple-500/30 text-center transition-colors"
                                        >
                                            <span className="text-purple-300 text-sm">🔗 View Wallet on Solscan</span>
                                        </a>
                                    )}
                                </div>
                            )}
                            
                            {/* Matches Tab */}
                            {activeTab === 'matches' && (
                                <div className="space-y-2">
                                    {matchHistory.length === 0 ? (
                                        <div className="text-center py-12 text-white/50">
                                            <span className="text-4xl block mb-2">🎮</span>
                                            No match history yet
                                        </div>
                                    ) : (
                                        matchHistory.map((match) => (
                                            <div 
                                                key={match.matchId}
                                                className={`bg-black/30 rounded-xl p-3 border transition-colors ${
                                                    match.isDraw 
                                                        ? 'border-gray-500/30' 
                                                        : match.won 
                                                            ? 'border-green-500/30 hover:border-green-500/50' 
                                                            : 'border-red-500/30 hover:border-red-500/50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{gameEmojis[match.gameType] || '🎮'}</span>
                                                        <div>
                                                            <p className="text-white font-medium text-sm">
                                                                vs {match.opponent}
                                                            </p>
                                                            <p className="text-white/50 text-xs">
                                                                {gameNames[match.gameType] || match.gameType} • {formatDate(match.endedAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold text-sm ${
                                                            match.isDraw ? 'text-gray-400' : match.won ? 'text-green-400' : 'text-red-400'
                                                        }`}>
                                                            {match.isDraw ? '🤝 DRAW' : match.won ? '🏆 WON' : '❌ LOST'}
                                                        </p>
                                                        {match.wagerAmount > 0 && (
                                                            <p className={`text-xs ${match.won ? 'text-green-400' : match.isDraw ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                {match.isDraw ? '↩️' : match.won ? '+' : '-'}{match.isDraw ? match.wagerAmount : match.won ? match.wagerAmount * 2 : match.wagerAmount} 💰
                                                            </p>
                                                        )}
                                                        {match.wagerToken && (
                                                            <p className={`text-xs ${match.won ? 'text-cyan-400' : match.isDraw ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                {match.isDraw ? '↩️' : match.won ? '+' : '-'}{match.isDraw ? match.wagerToken.amount : match.won ? match.wagerToken.amount * 2 : match.wagerToken.amount} {match.wagerToken.symbol}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Settlement TX Link */}
                                                {match.settlementTx && getSolscanLink(match.settlementTx) && (
                                                    <a
                                                        href={getSolscanLink(match.settlementTx)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-2 flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                                                    >
                                                        🔗 View Transaction
                                                        <span className="text-purple-400/50">({match.settlementTx.slice(0, 8)}...)</span>
                                                    </a>
                                                )}
                                                
                                                {/* Duration */}
                                                {match.duration && (
                                                    <p className="text-white/30 text-xs mt-1">
                                                        ⏱️ {formatDuration(match.duration)}
                                                    </p>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            
                            {/* Transactions Tab */}
                            {activeTab === 'transactions' && (
                                <TransactionsTab transactions={transactions} />
                            )}
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="border-t border-white/10 px-4 py-3 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatsModal;

