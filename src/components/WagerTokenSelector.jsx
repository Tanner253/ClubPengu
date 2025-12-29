/**
 * WagerTokenSelector - Collapsible dropdown for selecting SPL tokens for wagering
 * 
 * Features:
 * - Quick-select buttons for popular tokens ($WADDLE, SOL, USDC, BONK)
 * - Custom CA input with live validation
 * - User's balance display
 * - Validation status indicator (like username availability check)
 * 
 * Mobile-first design, portrait view priority
 */

import React, { useState, useCallback } from 'react';
import { useTokenValidation, TOKEN_VALIDATION_STATE } from '../hooks';
import { 
    WAGER_TOKENS, 
    getJupiterSwapUrl, 
    isValidSolanaAddress 
} from '../config/wagerTokens';

/**
 * Token Quick Select Button
 */
const TokenQuickButton = ({ token, isSelected, onSelect, disabled }) => (
    <button
        type="button"
        onClick={() => onSelect(token)}
        disabled={disabled}
        className={`px-2 py-1.5 text-[10px] sm:text-xs rounded-lg transition-all font-medium ${
            isSelected
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                : disabled
                    ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 active:scale-95'
        }`}
        title={token.name}
    >
        {token.symbol}
    </button>
);

/**
 * Validation Status Indicator
 */
const ValidationIndicator = ({ state, error }) => {
    if (state === TOKEN_VALIDATION_STATE.IDLE) return null;
    
    return (
        <div className="flex items-center gap-1 text-[10px] mt-1">
            {state === TOKEN_VALIDATION_STATE.VALIDATING && (
                <>
                    <span className="animate-spin">⏳</span>
                    <span className="text-slate-400">Validating...</span>
                </>
            )}
            {state === TOKEN_VALIDATION_STATE.VALID && (
                <>
                    <span className="text-green-400">✓</span>
                    <span className="text-green-400">Valid token</span>
                </>
            )}
            {state === TOKEN_VALIDATION_STATE.INVALID && (
                <>
                    <span className="text-red-400">✗</span>
                    <span className="text-red-400">{error || 'Invalid token'}</span>
                </>
            )}
            {state === TOKEN_VALIDATION_STATE.ERROR && (
                <>
                    <span className="text-yellow-400">⚠</span>
                    <span className="text-yellow-400">{error || 'Validation error'}</span>
                </>
            )}
        </div>
    );
};

/**
 * Main WagerTokenSelector Component
 */
const WagerTokenSelector = ({
    selectedToken,        // { tokenAddress, tokenSymbol, tokenDecimals, tokenAmount, amountRaw }
    onTokenSelect,        // (tokenConfig) => void
    walletAddress,        // User's wallet for balance check
    disabled = false
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [customAddress, setCustomAddress] = useState('');
    const [tokenAmount, setTokenAmount] = useState('');
    
    const {
        validationState,
        tokenMetadata,
        userBalance,
        error: validationError,
        validateTokenDebounced,
        resetValidation,
        isValid,
        isValidating
    } = useTokenValidation(walletAddress);
    
    /**
     * Handle quick-select token
     */
    const handleQuickSelect = useCallback((token) => {
        setCustomAddress(token.address);
        
        onTokenSelect({
            tokenAddress: token.address,
            tokenSymbol: token.symbol,
            tokenDecimals: token.decimals,
            tokenAmount: parseFloat(tokenAmount) || 0,
            amountRaw: tokenAmount 
                ? String(Math.floor(parseFloat(tokenAmount) * Math.pow(10, token.decimals)))
                : null
        });
        
        // Validate to get balance
        validateTokenDebounced(token.address);
    }, [onTokenSelect, tokenAmount, validateTokenDebounced]);
    
    /**
     * Handle custom address input
     */
    const handleCustomAddressChange = useCallback((e) => {
        const address = e.target.value.replace(/\s/g, ''); // Strip whitespace
        setCustomAddress(address);
        
        if (!address) {
            resetValidation();
            onTokenSelect({
                tokenAddress: null,
                tokenSymbol: null,
                tokenDecimals: 6,
                tokenAmount: 0,
                amountRaw: null
            });
            return;
        }
        
        validateTokenDebounced(address);
    }, [validateTokenDebounced, resetValidation, onTokenSelect]);
    
    /**
     * Handle token amount change
     */
    const handleAmountChange = useCallback((e) => {
        const value = e.target.value.replace(/[^0-9.]/g, '');
        // Only allow one decimal point
        const parts = value.split('.');
        const sanitized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
        
        setTokenAmount(sanitized);
        
        if (selectedToken?.tokenAddress && sanitized) {
            const decimals = tokenMetadata?.decimals || selectedToken.tokenDecimals || 6;
            const amount = parseFloat(sanitized) || 0;
            
            onTokenSelect({
                ...selectedToken,
                tokenAmount: amount,
                amountRaw: String(Math.floor(amount * Math.pow(10, decimals)))
            });
        }
    }, [selectedToken, tokenMetadata, onTokenSelect]);
    
    /**
     * Update selected token when validation completes
     */
    React.useEffect(() => {
        if (isValid && tokenMetadata && customAddress) {
            onTokenSelect({
                tokenAddress: customAddress,
                tokenSymbol: tokenMetadata.symbol,
                tokenDecimals: tokenMetadata.decimals,
                tokenAmount: parseFloat(tokenAmount) || 0,
                amountRaw: tokenAmount 
                    ? String(Math.floor(parseFloat(tokenAmount) * Math.pow(10, tokenMetadata.decimals)))
                    : null
            });
        }
    }, [isValid, tokenMetadata, customAddress, tokenAmount, onTokenSelect]);
    
    /**
     * Check if a token is currently selected
     */
    const isTokenSelected = (token) => {
        return selectedToken?.tokenAddress === token.address;
    };
    
    /**
     * Has token wager configured
     */
    const hasTokenWager = selectedToken?.tokenAddress && selectedToken?.tokenAmount > 0;
    
    return (
        <div className="w-full">
            {/* Collapsible Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                disabled={disabled}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                    hasTokenWager 
                        ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300'
                        : 'bg-slate-700/50 border border-slate-600 text-slate-400 hover:bg-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <span>🪙</span>
                    <span>
                        {hasTokenWager 
                            ? `+ ${selectedToken.tokenAmount} ${selectedToken.tokenSymbol}`
                            : 'Add Token Wager (Optional)'
                        }
                    </span>
                </div>
                <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            
            {/* Expanded Content */}
            {isExpanded && !disabled && (
                <div className="mt-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                    {/* Quick Select Tokens */}
                    <div>
                        <label className="block text-[10px] text-slate-400 mb-1.5">
                            Quick Select
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {WAGER_TOKENS.map((token) => (
                                <TokenQuickButton
                                    key={token.address}
                                    token={token}
                                    isSelected={isTokenSelected(token)}
                                    onSelect={handleQuickSelect}
                                    disabled={disabled}
                                />
                            ))}
                        </div>
                    </div>
                    
                    {/* Custom Token Address */}
                    <div>
                        <label className="block text-[10px] text-slate-400 mb-1.5">
                            Token Address (CA)
                        </label>
                        <input
                            type="text"
                            value={customAddress}
                            onChange={handleCustomAddressChange}
                            placeholder="Paste token contract address..."
                            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                            disabled={disabled}
                        />
                        <ValidationIndicator state={validationState} error={validationError} />
                    </div>
                    
                    {/* Token Amount - Only show if token is valid */}
                    {(isValid || selectedToken?.tokenAddress) && (
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[10px] text-slate-400">
                                    Wager Amount
                                </label>
                                {userBalance > 0 && (
                                    <span className="text-[10px] text-slate-500">
                                        Balance: {userBalance.toLocaleString()} {tokenMetadata?.symbol || selectedToken?.tokenSymbol}
                                    </span>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={tokenAmount}
                                    onChange={handleAmountChange}
                                    placeholder="0"
                                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 pr-16 text-white text-sm font-medium placeholder-slate-500 focus:outline-none focus:border-purple-500"
                                    disabled={disabled}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                                    {tokenMetadata?.symbol || selectedToken?.tokenSymbol || 'TOKEN'}
                                </span>
                            </div>
                            
                            {/* Quick amount buttons */}
                            {userBalance > 0 && (
                                <div className="flex gap-1 mt-2">
                                    {[0.25, 0.5, 1].map((fraction) => {
                                        const amount = Math.floor(userBalance * fraction * 100) / 100;
                                        return (
                                            <button
                                                key={fraction}
                                                type="button"
                                                onClick={() => setTokenAmount(String(amount))}
                                                className="flex-1 py-1 text-[10px] bg-slate-700 text-slate-300 rounded hover:bg-slate-600 active:scale-95"
                                            >
                                                {fraction === 1 ? 'MAX' : `${fraction * 100}%`}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            
                            {/* Insufficient balance warning */}
                            {tokenAmount && userBalance > 0 && parseFloat(tokenAmount) > userBalance && (
                                <div className="mt-2 flex items-center justify-between text-[10px]">
                                    <span className="text-red-400">
                                        ⚠ Insufficient balance
                                    </span>
                                    <a
                                        href={getJupiterSwapUrl(selectedToken?.tokenAddress || customAddress)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-cyan-400 hover:underline"
                                    >
                                        Buy on Jupiter →
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Clear Token Wager */}
                    {hasTokenWager && (
                        <button
                            type="button"
                            onClick={() => {
                                setCustomAddress('');
                                setTokenAmount('');
                                resetValidation();
                                onTokenSelect({
                                    tokenAddress: null,
                                    tokenSymbol: null,
                                    tokenDecimals: 6,
                                    tokenAmount: 0,
                                    amountRaw: null
                                });
                            }}
                            className="w-full py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                            Remove Token Wager
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default WagerTokenSelector;

