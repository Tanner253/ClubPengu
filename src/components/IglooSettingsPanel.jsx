/**
 * IglooSettingsPanel - Owner control panel for igloo settings
 * Manage access control, entry fees, token gates, and banner customization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { IGLOO_BANNER_STYLES } from '../config/roomConfig.js';
import { useIgloo } from '../igloo/IglooContext.jsx';
import { payIglooRent } from '../wallet/SolanaPayment.js';
import { RENT_WALLET_ADDRESS, CPW3_TOKEN_ADDRESS, IGLOO_CONFIG } from '../config/solana.js';

// Predefined gradient presets
const GRADIENT_PRESETS = [
    { name: 'Sunset', colors: ['#FF6B6B', '#FFA94D', '#FFD43B'] },
    { name: 'Ocean', colors: ['#22B8CF', '#339AF0', '#5C7CFA'] },
    { name: 'Purple Haze', colors: ['#845EF7', '#BE4BDB', '#F06595'] },
    { name: 'Mint', colors: ['#69DB7C', '#38D9A9', '#22B8CF'] },
    { name: 'Night Club', colors: ['#1a0a2e', '#0d0d1a', '#0a0015'] },
    { name: 'Neon Pink', colors: ['#FF00FF', '#FF3366', '#FFD43B'] },
    { name: 'Cyber', colors: ['#00FF88', '#00FFFF', '#845EF7'] },
    { name: 'Gold', colors: ['#FFD43B', '#FFA94D', '#FF6B6B'] },
    { name: 'Ice', colors: ['#F8F9FA', '#CED4DA', '#22B8CF'] },
    { name: 'Dark Mode', colors: ['#212529', '#495057', '#212529'] },
    { name: 'Solana', colors: ['#9945FF', '#14F195', '#00C2FF'] },
    { name: 'Matrix', colors: ['#001100', '#003300', '#00FF00'] }
];

// Available fonts
const BANNER_FONTS = [
    { name: 'Default', value: 'Inter, system-ui, sans-serif' },
    { name: 'Retro', value: "'Press Start 2P', cursive" },
    { name: 'Elegant', value: "'Playfair Display', Georgia, serif" },
    { name: 'Bold', value: "'Bebas Neue', Impact, sans-serif" },
    { name: 'Tech', value: "'Orbitron', 'Courier New', monospace" },
    { name: 'Playful', value: "'Bangers', cursive" },
    { name: 'Clean', value: "'Poppins', 'Helvetica Neue', sans-serif" },
    { name: 'Mono', value: "'JetBrains Mono', 'Courier New', monospace" }
];

// Tokens for Token Gate (community/meme tokens that make sense for holder gating)
const TOKEN_GATE_TOKENS = [
    { 
        symbol: '$WADDLE', 
        name: 'WaddleBet',
        address: 'BDbMVbcc5hD5qiiGYwipeuUVMKDs16s9Nxk2hrhbpump'
    },
    { 
        symbol: 'BONK', 
        name: 'Bonk',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    },
    { 
        symbol: 'WIF', 
        name: 'dogwifhat',
        address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm'
    }
];

// Tokens for Entry Fee (includes stables and SOL for payments)
const ENTRY_FEE_TOKENS = [
    { 
        symbol: '$WADDLE', 
        name: 'WaddleBet',
        address: 'BDbMVbcc5hD5qiiGYwipeuUVMKDs16s9Nxk2hrhbpump'
    },
    { 
        symbol: 'BONK', 
        name: 'Bonk',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    },
    { 
        symbol: 'SOL', 
        name: 'Wrapped SOL',
        address: 'So11111111111111111111111111111111111111112'
    },
    { 
        symbol: 'USDC', 
        name: 'USD Coin',
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    },
    { 
        symbol: 'USDT', 
        name: 'Tether',
        address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    }
];

/**
 * TokenQuickSelect - Renders quick-fill buttons for tokens
 */
const TokenQuickSelect = ({ tokens, onSelect, currentAddress }) => (
    <div className="flex flex-wrap gap-1 mb-2">
        {tokens.map((token) => (
            <button
                key={token.address}
                type="button"
                onClick={() => onSelect(token.address, token.symbol)}
                className={`px-2 py-1 text-[10px] rounded transition-all ${
                    currentAddress === token.address
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
                title={`${token.name}\n${token.address}`}
            >
                {token.symbol}
            </button>
        ))}
    </div>
);

const IglooSettingsPanel = ({ 
    isOpen, 
    onClose, 
    iglooData,
    onSave
}) => {
    const { updateSettings: sendSettings, payRent: sendPayRent, isLoading: contextLoading } = useIgloo();
    
    const [settings, setSettings] = useState({
        iglooId: null, // Track which igloo these settings are for
        accessType: 'private',
        tokenGate: {
            enabled: false,
            tokenAddress: '',
            tokenSymbol: '',
            minimumBalance: 1
        },
        entryFee: {
            enabled: false,
            amount: 0,
            tokenAddress: '',
            tokenSymbol: ''
        },
        banner: {
            title: '',
            ticker: '',
            shill: '',
            styleIndex: 0,
            // New customization options
            useCustomColors: false,
            customGradient: ['#845EF7', '#BE4BDB', '#F06595'],
            textColor: '#FFFFFF',
            accentColor: '#00FFFF',
            font: 'Inter, system-ui, sans-serif',
            textAlign: 'center'
        }
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('access');
    const [isPayingRent, setIsPayingRent] = useState(false);
    const [rentPaymentSuccess, setRentPaymentSuccess] = useState(false);
    
    // Track if this is the initial load vs a save response
    const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
    
    // Load existing settings - ensure all values are non-null for controlled inputs
    // Only load on initial open, not after saving (to preserve user's changes)
    useEffect(() => {
        if (iglooData && !isSaving) {
            // Only load from server data if:
            // 1. This is the initial load (panel just opened), OR
            // 2. The iglooId changed (different igloo selected)
            const shouldLoad = !hasLoadedInitial || 
                (iglooData.iglooId && settings.iglooId !== iglooData.iglooId);
            
            if (shouldLoad) {
                console.log('🏠 [SettingsPanel] Loading iglooData:', iglooData);
                console.log('🏠 [SettingsPanel] Banner from server:', iglooData.banner);
                
            setSettings({
                    iglooId: iglooData.iglooId, // Track which igloo we loaded
                accessType: iglooData.accessType || 'private',
                tokenGate: {
                    enabled: iglooData.tokenGate?.enabled || false,
                    tokenAddress: iglooData.tokenGate?.tokenAddress || '',
                    tokenSymbol: iglooData.tokenGate?.tokenSymbol || '',
                    minimumBalance: iglooData.tokenGate?.minimumBalance || 1
                },
                entryFee: {
                    enabled: iglooData.entryFee?.enabled || false,
                    amount: iglooData.entryFee?.amount || 0,
                    tokenAddress: iglooData.entryFee?.tokenAddress || '',
                    tokenSymbol: iglooData.entryFee?.tokenSymbol || ''
                },
                banner: {
                    title: iglooData.banner?.title || '',
                    ticker: iglooData.banner?.ticker || '',
                    shill: iglooData.banner?.shill || '',
                        styleIndex: iglooData.banner?.styleIndex ?? 0,
                        // Use explicit checks for boolean/array fields
                        useCustomColors: iglooData.banner?.useCustomColors === true,
                        customGradient: Array.isArray(iglooData.banner?.customGradient) && iglooData.banner.customGradient.length === 3
                            ? iglooData.banner.customGradient 
                            : ['#845EF7', '#BE4BDB', '#F06595'],
                        textColor: iglooData.banner?.textColor || '#FFFFFF',
                        accentColor: iglooData.banner?.accentColor || '#00FFFF',
                        font: iglooData.banner?.font || 'Inter, system-ui, sans-serif',
                        textAlign: iglooData.banner?.textAlign || 'center'
                }
            });
                setHasLoadedInitial(true);
            }
        }
    }, [iglooData, isSaving, hasLoadedInitial]);
    
    // Reset hasLoadedInitial when panel closes
    useEffect(() => {
        if (!isOpen) {
            setHasLoadedInitial(false);
        }
    }, [isOpen]);
    
    // Watch for context loading to change (indicates save completed)
    useEffect(() => {
        if (!contextLoading && isSaving) {
            setIsSaving(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 2000);
        }
    }, [contextLoading, isSaving]);
    
    const handleSave = useCallback(() => {
        if (!iglooData?.iglooId) {
            setError('No igloo selected');
            return;
        }
        
        setIsSaving(true);
        setError(null);
        setSuccess(false);
        
        // Build settings without the iglooId tracker
        const { iglooId: _, ...settingsToSend } = settings;
        
        // Use WebSocket via IglooContext
        console.log('🏠 Saving igloo settings:', settingsToSend);
        console.log('🏠 Banner being saved:', settingsToSend.banner);
        sendSettings(iglooData.iglooId, settingsToSend);
        
        // Note: We don't call onSave here - the server response will update the context
        // and the success useEffect will handle showing the success message
    }, [iglooData, settings, sendSettings]);
    
    /**
     * Handle rent payment for past due igloos
     */
    const handlePayRent = useCallback(async () => {
        if (!iglooData?.iglooId) {
            setError('No igloo selected');
            return;
        }
        
        setIsPayingRent(true);
        setError(null);
        setRentPaymentSuccess(false);
        
        try {
            console.log('💰 Starting rent payment...');
            console.log(`   Igloo: ${iglooData.iglooId}`);
            console.log(`   Amount: ${IGLOO_CONFIG.DAILY_RENT_CPW3} $WADDLE`);
            
            // Step 1: Send the Solana transaction
            const paymentResult = await payIglooRent(
                iglooData.iglooId,
                IGLOO_CONFIG.DAILY_RENT_CPW3,
                RENT_WALLET_ADDRESS,
                CPW3_TOKEN_ADDRESS
            );
            
            if (!paymentResult.success) {
                throw new Error(paymentResult.message || 'Payment failed');
        }
            
            console.log('✅ Rent payment transaction sent:', paymentResult.signature);
            
            // Step 2: Send to server for verification
            sendPayRent(iglooData.iglooId, paymentResult.signature);
            setRentPaymentSuccess(true);
            
        } catch (err) {
            console.error('❌ Rent payment error:', err);
            setError(err.message || 'Rent payment failed');
        } finally {
            setIsPayingRent(false);
        }
    }, [iglooData, sendPayRent]);
    
    if (!isOpen) return null;
    
    // Check if we have full igloo data (not just the ID)
    const isDataLoading = !iglooData?.accessType && !iglooData?.ownerWallet;
    
    const tabs = [
        { id: 'access', label: '🔐 Access', icon: '🔐' },
        { id: 'banner', label: '🎨 Banner', icon: '🎨' },
        { id: 'rent', label: '💰 Rent Info', icon: '💰' }
    ];
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Panel */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-purple-500/30 overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="relative px-6 py-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-white/10 shrink-0">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        ⚙️ Igloo Settings
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {iglooData?.iglooId?.replace('igloo', 'Igloo ')}
                        {isDataLoading && <span className="ml-2 animate-pulse">Loading...</span>}
                    </p>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b border-slate-700 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                                activeTab === tab.id
                                    ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-400/10'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                
                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* Access Tab */}
                    {activeTab === 'access' && (
                        <div className="space-y-4">
                            {/* Access Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Access Type
                                </label>
                                <select
                                    value={settings.accessType}
                                    onChange={(e) => setSettings({...settings, accessType: e.target.value})}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                >
                                    <option value="private">🔒 Private (Owner Only)</option>
                                    <option value="public">🌐 Public (Anyone)</option>
                                    <option value="token">🪙 Token Gated</option>
                                    <option value="fee">💰 Entry Fee</option>
                                    <option value="both">🪙💰 Token + Fee</option>
                                </select>
                            </div>
                            
                            {/* Token Gate Settings */}
                            {(settings.accessType === 'token' || settings.accessType === 'both') && (
                                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-purple-400">Token Gate Settings</h4>
                                    
                                    {/* Quick Token Select */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quick Select</label>
                                        <TokenQuickSelect 
                                            tokens={TOKEN_GATE_TOKENS}
                                            currentAddress={settings.tokenGate.tokenAddress}
                                            onSelect={(address, symbol) => setSettings({
                                                ...settings,
                                                tokenGate: {
                                                    ...settings.tokenGate,
                                                    tokenAddress: address,
                                                    tokenSymbol: symbol,
                                                    enabled: true
                                                }
                                            })}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Token Address</label>
                                        <input
                                            type="text"
                                            value={settings.tokenGate.tokenAddress ?? ''}
                                            onChange={(e) => setSettings({
                                                ...settings, 
                                                tokenGate: {...settings.tokenGate, tokenAddress: e.target.value.replace(/\s/g, '')}
                                            })}
                                            placeholder="Token contract address..."
                                            className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Symbol</label>
                                            <input
                                                type="text"
                                                value={settings.tokenGate.tokenSymbol ?? ''}
                                                onChange={(e) => setSettings({
                                                    ...settings, 
                                                    tokenGate: {...settings.tokenGate, tokenSymbol: e.target.value}
                                                })}
                                                placeholder="$TOKEN"
                                                maxLength={10}
                                                className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Min Balance</label>
                                            <input
                                                type="number"
                                                value={settings.tokenGate.minimumBalance ?? 1}
                                                onChange={(e) => setSettings({
                                                    ...settings, 
                                                    tokenGate: {...settings.tokenGate, minimumBalance: parseInt(e.target.value) || 1}
                                                })}
                                                min={1}
                                                className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Entry Fee Settings */}
                            {(settings.accessType === 'fee' || settings.accessType === 'both') && (
                                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                    <h4 className="text-sm font-semibold text-yellow-400">Entry Fee Settings</h4>
                                    
                                    {/* Quick Token Select */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Quick Select</label>
                                        <TokenQuickSelect 
                                            tokens={ENTRY_FEE_TOKENS}
                                            currentAddress={settings.entryFee.tokenAddress}
                                            onSelect={(address, symbol) => setSettings({
                                                ...settings,
                                                entryFee: {
                                                    ...settings.entryFee,
                                                    tokenAddress: address,
                                                    tokenSymbol: symbol,
                                                    enabled: true
                                                }
                                            })}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">Token Contract Address</label>
                                        <input
                                            type="text"
                                            value={settings.entryFee.tokenAddress ?? ''}
                                            onChange={(e) => setSettings({
                                                ...settings, 
                                                entryFee: {...settings.entryFee, tokenAddress: e.target.value.replace(/\s/g, ''), enabled: true}
                                            })}
                                            placeholder="Token contract address..."
                                            className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Token Symbol</label>
                                            <input
                                                type="text"
                                                value={settings.entryFee.tokenSymbol ?? ''}
                                                onChange={(e) => setSettings({
                                                    ...settings, 
                                                    entryFee: {...settings.entryFee, tokenSymbol: e.target.value, enabled: true}
                                                })}
                                                placeholder="$TOKEN"
                                                maxLength={10}
                                                className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">Fee Amount</label>
                                            <input
                                                type="number"
                                                value={settings.entryFee.amount ?? 0}
                                                onChange={(e) => setSettings({
                                                    ...settings, 
                                                    entryFee: {...settings.entryFee, amount: parseInt(e.target.value) || 0, enabled: true}
                                                })}
                                                min={0}
                                                className="w-full bg-slate-600 border border-slate-500 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-slate-500">
                                        One-time payment per visitor (resets if you change settings)
                                    </p>
                                </div>
                            )}
                            
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                <p className="text-xs text-blue-400">
                                    💡 Entry fees are paid directly to your wallet via x402 protocol.
                                    Token gates check visitor balance at entry.
                                </p>
                            </div>
                        </div>
                    )}
                    
                    {/* Banner Tab */}
                    {activeTab === 'banner' && (
                        <div className="space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Banner Title
                                </label>
                                <input
                                    type="text"
                                    value={settings.banner.title ?? ''}
                                    onChange={(e) => setSettings({
                                        ...settings, 
                                        banner: {...settings.banner, title: e.target.value}
                                    })}
                                    placeholder="My Cool Igloo"
                                        maxLength={20}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                                    <p className="text-xs text-slate-500 mt-1">{settings.banner.title?.length || 0}/20</p>
                            </div>
                            
                            <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Ticker Symbol
                                </label>
                                <input
                                    type="text"
                                    value={settings.banner.ticker ?? ''}
                                    onChange={(e) => setSettings({
                                        ...settings, 
                                        banner: {...settings.banner, ticker: e.target.value}
                                    })}
                                    placeholder="$TOKEN"
                                    maxLength={10}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
                                />
                                    <p className="text-xs text-slate-500 mt-1">{settings.banner.ticker?.length || 0}/10</p>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">
                                        Text Alignment
                                    </label>
                                    <div className="flex gap-1 bg-slate-700 rounded-lg p-1">
                                        {[
                                            { value: 'left', icon: '◀' },
                                            { value: 'center', icon: '◆' },
                                            { value: 'right', icon: '▶' }
                                        ].map(align => (
                                            <button
                                                key={align.value}
                                                onClick={() => setSettings({
                                                    ...settings,
                                                    banner: {...settings.banner, textAlign: align.value}
                                                })}
                                                className={`flex-1 py-1.5 rounded text-sm transition-all ${
                                                    settings.banner.textAlign === align.value
                                                        ? 'bg-purple-500 text-white'
                                                        : 'text-slate-400 hover:text-white hover:bg-slate-600'
                                                }`}
                                            >
                                                {align.icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Description with textarea */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Description / Shill
                                </label>
                                <textarea
                                    value={settings.banner.shill ?? ''}
                                    onChange={(e) => setSettings({
                                        ...settings, 
                                        banner: {...settings.banner, shill: e.target.value}
                                    })}
                                    placeholder="Short tagline for your igloo..."
                                    maxLength={60}
                                    rows={2}
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 resize-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">{settings.banner.shill?.length || 0}/60</p>
                            </div>
                            
                            {/* Font Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Font Style
                                </label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {BANNER_FONTS.map((font) => (
                                        <button
                                            key={font.name}
                                            onClick={() => setSettings({
                                                ...settings,
                                                banner: {...settings.banner, font: font.value}
                                            })}
                                            className={`py-1.5 px-2 text-[10px] rounded transition-all ${
                                                settings.banner.font === font.value
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                            }`}
                                            style={{ fontFamily: font.value }}
                                        >
                                            {font.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Color Mode Toggle */}
                            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                                <span className="text-sm text-slate-300">Use Custom Colors</span>
                                <button
                                    onClick={() => setSettings({
                                        ...settings,
                                        banner: {...settings.banner, useCustomColors: !settings.banner.useCustomColors}
                                    })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${
                                        settings.banner.useCustomColors ? 'bg-purple-500' : 'bg-slate-600'
                                    }`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                                        settings.banner.useCustomColors ? 'right-1' : 'left-1'
                                    }`} />
                                </button>
                            </div>
                            
                            {/* Preset Styles (when not using custom) */}
                            {!settings.banner.useCustomColors && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Preset Styles
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {IGLOO_BANNER_STYLES.slice(0, 8).map((style, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSettings({
                                                ...settings,
                                                banner: {...settings.banner, styleIndex: idx}
                                            })}
                                                className={`h-10 rounded-lg border-2 transition-all ${
                                                    settings.banner.styleIndex === idx && !settings.banner.useCustomColors
                                                        ? 'border-white scale-105 ring-2 ring-purple-400'
                                                    : 'border-transparent hover:border-white/50'
                                            }`}
                                            style={{
                                                background: `linear-gradient(180deg, ${style.bgGradient[0]}, ${style.bgGradient[2]})`
                                            }}
                                        />
                                    ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Custom Colors (when enabled) */}
                            {settings.banner.useCustomColors && (
                                <div className="space-y-3">
                                    {/* Gradient Presets */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Gradient Presets
                                        </label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {GRADIENT_PRESETS.map((preset) => (
                                                <button
                                                    key={preset.name}
                                                    onClick={() => setSettings({
                                                        ...settings,
                                                        banner: {...settings.banner, customGradient: preset.colors}
                                                    })}
                                                    className={`h-8 rounded border transition-all text-[8px] font-bold ${
                                                        JSON.stringify(settings.banner.customGradient) === JSON.stringify(preset.colors)
                                                            ? 'border-white ring-1 ring-purple-400'
                                                            : 'border-transparent hover:border-white/50'
                                                    }`}
                                                    style={{
                                                        background: `linear-gradient(135deg, ${preset.colors[0]}, ${preset.colors[1]}, ${preset.colors[2]})`,
                                                        color: preset.name.includes('Dark') || preset.name.includes('Night') || preset.name.includes('Matrix') ? '#fff' : '#000',
                                                        textShadow: '0 0 2px rgba(0,0,0,0.5)'
                                                    }}
                                                    title={preset.name}
                                                >
                                                    {preset.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Custom Gradient Colors */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            Custom Gradient (Top → Middle → Bottom)
                                        </label>
                                        <div className="flex gap-2">
                                            {[0, 1, 2].map((idx) => (
                                                <div key={idx} className="flex-1">
                                                    <input
                                                        type="color"
                                                        value={settings.banner.customGradient?.[idx] || '#845EF7'}
                                                        onChange={(e) => {
                                                            const newGradient = [...(settings.banner.customGradient || ['#845EF7', '#BE4BDB', '#F06595'])];
                                                            newGradient[idx] = e.target.value;
                                                            setSettings({
                                                                ...settings,
                                                                banner: {...settings.banner, customGradient: newGradient}
                                                            });
                                                        }}
                                                        className="w-full h-8 rounded cursor-pointer border border-slate-600"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    {/* Text Color */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">
                                            Text Color
                                        </label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="color"
                                                value={settings.banner.textColor || '#FFFFFF'}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    banner: {...settings.banner, textColor: e.target.value}
                                                })}
                                                className="w-10 h-10 rounded cursor-pointer border-2 border-slate-600 hover:border-purple-400 transition-colors"
                                            />
                                            <div className="flex flex-wrap gap-1.5 flex-1">
                                                {['#FFFFFF', '#F8F9FA', '#FFD43B', '#FFA94D', '#FF6B6B', '#F06595', '#CC5DE8', '#845EF7', '#5C7CFA', '#339AF0', '#22B8CF', '#20C997', '#51CF66', '#94D82D', '#000000', '#495057'].map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setSettings({
                                                            ...settings,
                                                            banner: {...settings.banner, textColor: c}
                                                        })}
                                                        className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                                                            settings.banner.textColor === c 
                                                                ? 'border-white ring-2 ring-purple-400 scale-110' 
                                                                : 'border-slate-700 hover:border-slate-500'
                                                        }`}
                                                        style={{ backgroundColor: c }}
                                                        title={c}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Accent Color (Border & Ticker) */}
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1.5">
                                            Accent Color <span className="text-slate-500">(ticker & border glow)</span>
                                        </label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="color"
                                                value={settings.banner.accentColor || '#00FFFF'}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    banner: {...settings.banner, accentColor: e.target.value}
                                                })}
                                                className="w-10 h-10 rounded cursor-pointer border-2 border-slate-600 hover:border-purple-400 transition-colors"
                                            />
                                            <div className="flex flex-wrap gap-1.5 flex-1">
                                                {['#00FFFF', '#00FF88', '#14F195', '#00FF00', '#FFD43B', '#FFA94D', '#FF6B6B', '#FF00FF', '#F06595', '#CC5DE8', '#9945FF', '#845EF7', '#5C7CFA', '#339AF0', '#FFFFFF', '#ADB5BD'].map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setSettings({
                                                            ...settings,
                                                            banner: {...settings.banner, accentColor: c}
                                                        })}
                                                        className={`w-6 h-6 rounded-md border-2 transition-all hover:scale-110 ${
                                                            settings.banner.accentColor === c 
                                                                ? 'border-white ring-2 ring-purple-400 scale-110' 
                                                                : 'border-slate-700 hover:border-slate-500'
                                                        }`}
                                                        style={{ backgroundColor: c }}
                                                        title={c}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Image Upload - Coming Soon */}
                            <div className="relative">
                                <div className="bg-slate-700/30 border border-dashed border-slate-500 rounded-lg p-4 text-center opacity-60">
                                    <div className="text-2xl mb-1">🖼️</div>
                                    <p className="text-sm text-slate-400">Upload Banner Image</p>
                                    <p className="text-[10px] text-slate-500">PNG, JPG, GIF up to 2MB</p>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg">
                                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                                        ✨ COMING SOON
                                    </span>
                                </div>
                            </div>
                            
                            {/* Preview */}
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-xs text-slate-400 mb-2">Preview:</p>
                                <div 
                                    className="rounded-lg p-4 transition-all"
                                    style={{
                                        background: settings.banner.useCustomColors
                                            ? `linear-gradient(180deg, ${settings.banner.customGradient?.[0] || '#845EF7'}, ${settings.banner.customGradient?.[1] || '#BE4BDB'}, ${settings.banner.customGradient?.[2] || '#F06595'})`
                                            : `linear-gradient(180deg, ${IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.bgGradient[0] || '#333'}, ${IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.bgGradient[2] || '#111'})`,
                                        textAlign: settings.banner.textAlign || 'center',
                                        border: `3px solid ${settings.banner.useCustomColors ? settings.banner.accentColor : IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.accentColor || '#0ff'}`,
                                        boxShadow: `0 0 15px ${settings.banner.useCustomColors ? settings.banner.accentColor : IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.accentColor || '#0ff'}40`
                                    }}
                                >
                                    <div 
                                        className="text-lg font-bold"
                                        style={{ 
                                            color: settings.banner.useCustomColors 
                                                ? settings.banner.textColor 
                                                : IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.textColor || '#fff',
                                            fontFamily: settings.banner.font || 'Inter, system-ui, sans-serif'
                                        }}
                                    >
                                        {settings.banner.title || 'Your Igloo'}
                                    </div>
                                    {settings.banner.ticker && (
                                        <div 
                                            className="text-sm font-mono"
                                            style={{ 
                                                color: settings.banner.useCustomColors 
                                                    ? settings.banner.accentColor 
                                                    : IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.accentColor || '#0ff',
                                                fontFamily: settings.banner.font || 'Inter, system-ui, sans-serif'
                                            }}
                                        >
                                            {settings.banner.ticker}
                                        </div>
                                    )}
                                    {settings.banner.shill && (
                                        <div 
                                            className="text-xs mt-2 opacity-90 whitespace-pre-wrap"
                                            style={{ 
                                                color: settings.banner.useCustomColors 
                                                    ? settings.banner.textColor 
                                                    : IGLOO_BANNER_STYLES[settings.banner.styleIndex ?? 0]?.textColor || '#fff',
                                                fontFamily: settings.banner.font || 'Inter, system-ui, sans-serif'
                                            }}
                                        >
                                            {settings.banner.shill}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Rent Info Tab */}
                    {activeTab === 'rent' && (
                        <div className="space-y-4">
                            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Status:</span>
                                    <span className={`font-semibold ${
                                        iglooData?.rentStatus === 'current' ? 'text-green-400' :
                                        iglooData?.rentStatus === 'grace_period' ? 'text-amber-400' :
                                        'text-red-400'
                                    }`}>
                                        {iglooData?.rentStatus === 'current' ? '✅ Rent Paid' :
                                         iglooData?.rentStatus === 'grace_period' ? '⚠️ Payment Due' :
                                         '❌ Overdue'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Next Payment Due:</span>
                                    <span className={`${iglooData?.isReserved ? 'text-purple-400' : 'text-white'}`}>
                                        {iglooData?.isReserved 
                                            ? '✨ Pre-Paid' 
                                            : iglooData?.rentDueDate 
                                            ? new Date(iglooData.rentDueDate).toLocaleString()
                                            : 'N/A'}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Total Rent Paid:</span>
                                    <span className="text-yellow-400 font-mono">
                                        {iglooData?.stats?.totalRentPaid?.toLocaleString() || 0} $WADDLE
                                    </span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Total Visitors:</span>
                                    <span className="text-white">
                                        {iglooData?.stats?.uniqueVisitors || 0}
                                    </span>
                                </div>
                                
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Entry Fees Collected:</span>
                                    <span className="text-green-400 font-mono">
                                        {iglooData?.stats?.totalEntryFeesCollected?.toLocaleString() || 0} {iglooData?.entryFee?.tokenSymbol || 'tokens'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Rent Payment Required Warning */}
                            {(iglooData?.rentStatus === 'grace_period' || iglooData?.rentStatus === 'overdue') && (
                                <div className={`border rounded-lg p-4 ${
                                    iglooData?.rentStatus === 'overdue' 
                                        ? 'bg-red-500/20 border-red-500/40' 
                                        : 'bg-amber-500/20 border-amber-500/40'
                                }`}>
                                    <p className={`font-semibold ${
                                        iglooData?.rentStatus === 'overdue' ? 'text-red-400' : 'text-amber-400'
                                    }`}>
                                        {iglooData?.rentStatus === 'overdue' 
                                            ? '🚨 RENT OVERDUE - Eviction Imminent!' 
                                            : '⚠️ Rent Payment Required!'}
                                    </p>
                                    <p className="text-sm text-slate-300 mt-1">
                                        {iglooData?.rentStatus === 'overdue'
                                            ? 'Pay immediately to keep your igloo!'
                                            : 'Pay your daily rent to avoid eviction. You have 12 hours after due date.'}
                                    </p>
                                    
                                    {/* Rent Payment Success Message */}
                                    {rentPaymentSuccess && (
                                        <div className="mt-3 p-2 bg-green-500/20 border border-green-500/40 rounded text-green-400 text-sm">
                                            ✅ Rent payment submitted! Refreshing...
                                        </div>
                                    )}
                                    
                                    {/* Pay Rent Button */}
                                    <button
                                        onClick={handlePayRent}
                                        disabled={isPayingRent || rentPaymentSuccess}
                                        className={`mt-3 w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                                            isPayingRent || rentPaymentSuccess
                                                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400'
                                        }`}
                                    >
                                        {isPayingRent 
                                            ? '⏳ Processing Payment...' 
                                            : rentPaymentSuccess 
                                                ? '✅ Payment Sent!'
                                                : `💰 Pay Rent (${IGLOO_CONFIG.DAILY_RENT_CPW3.toLocaleString()} $WADDLE)`}
                                    </button>
                                </div>
                            )}
                            
                            {/* Rent is current - show status */}
                            {iglooData?.rentStatus === 'current' && (
                                <div className="bg-green-500/20 border border-green-500/40 rounded-lg p-4">
                                    <p className="text-green-400 font-semibold">✅ Rent Status: Current</p>
                                    <p className="text-sm text-slate-300 mt-1">
                                        Your rent is paid. Next payment due: {iglooData?.rentDueDate ? new Date(iglooData.rentDueDate).toLocaleString() : 'Unknown'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 shrink-0">
                    {/* Status Messages */}
                    {error && (
                        <div className="mb-3 text-center text-red-400 text-sm">
                            ❌ {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-3 text-center text-green-400 text-sm">
                            ✅ Settings saved successfully!
                        </div>
                    )}
                    
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 px-4 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                                isSaving
                                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-400 hover:to-pink-400'
                            }`}
                        >
                            {isSaving ? 'Saving...' : '💾 Save Settings'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IglooSettingsPanel;


