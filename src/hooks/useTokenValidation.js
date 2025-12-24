/**
 * useTokenValidation - Hook for validating SPL tokens on Solana blockchain
 * 
 * Fetches token metadata from on-chain to verify:
 * - Token exists
 * - Token has valid metadata (symbol, decimals)
 * - User's balance of that token
 * 
 * Similar pattern to username availability check
 */

import { useState, useCallback, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { isValidSolanaAddress, findTokenByAddress } from '../config/wagerTokens';

// RPC endpoint (use env or fallback)
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Debounce timeout for validation
const VALIDATION_DEBOUNCE_MS = 500;

/**
 * Token validation states
 */
export const TOKEN_VALIDATION_STATE = {
    IDLE: 'idle',
    VALIDATING: 'validating',
    VALID: 'valid',
    INVALID: 'invalid',
    ERROR: 'error'
};

/**
 * Hook for validating SPL tokens
 * @param {string} walletAddress - User's wallet address (for balance check)
 */
export function useTokenValidation(walletAddress = null) {
    const [validationState, setValidationState] = useState(TOKEN_VALIDATION_STATE.IDLE);
    const [tokenMetadata, setTokenMetadata] = useState(null);
    const [userBalance, setUserBalance] = useState(0);
    const [error, setError] = useState(null);
    
    const debounceRef = useRef(null);
    const connectionRef = useRef(null);
    
    // Get or create connection
    const getConnection = useCallback(() => {
        if (!connectionRef.current) {
            connectionRef.current = new Connection(SOLANA_RPC_URL, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 30000
            });
        }
        return connectionRef.current;
    }, []);
    
    /**
     * Validate a token address
     * @param {string} tokenAddress - SPL token mint address
     * @returns {Promise<{valid: boolean, metadata?: object, balance?: number, error?: string}>}
     */
    const validateToken = useCallback(async (tokenAddress) => {
        // Clear previous state
        setError(null);
        setTokenMetadata(null);
        setUserBalance(0);
        
        // Empty address - reset to idle
        if (!tokenAddress || tokenAddress.trim() === '') {
            setValidationState(TOKEN_VALIDATION_STATE.IDLE);
            return { valid: false, error: 'No address provided' };
        }
        
        // Basic format validation
        if (!isValidSolanaAddress(tokenAddress)) {
            setValidationState(TOKEN_VALIDATION_STATE.INVALID);
            setError('Invalid Solana address format');
            return { valid: false, error: 'Invalid address format' };
        }
        
        // Check if it's a known token (quick path)
        const knownToken = findTokenByAddress(tokenAddress);
        if (knownToken) {
            setTokenMetadata({
                address: tokenAddress,
                symbol: knownToken.symbol,
                name: knownToken.name,
                decimals: knownToken.decimals,
                logoURI: knownToken.logoURI,
                isKnown: true
            });
            setValidationState(TOKEN_VALIDATION_STATE.VALID);
            
            // Fetch balance if wallet connected
            if (walletAddress) {
                fetchBalance(tokenAddress, knownToken.decimals);
            }
            
            return { 
                valid: true, 
                metadata: knownToken,
                isKnown: true
            };
        }
        
        // Validate on-chain for unknown tokens
        setValidationState(TOKEN_VALIDATION_STATE.VALIDATING);
        
        try {
            const connection = getConnection();
            const mintPubkey = new PublicKey(tokenAddress);
            
            // Fetch mint account info
            const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
            
            if (!mintInfo.value) {
                setValidationState(TOKEN_VALIDATION_STATE.INVALID);
                setError('Token not found on chain');
                return { valid: false, error: 'Token not found' };
            }
            
            const data = mintInfo.value.data;
            
            // Check if it's actually a token mint
            if (data.program !== 'spl-token' && data.program !== 'spl-token-2022') {
                setValidationState(TOKEN_VALIDATION_STATE.INVALID);
                setError('Address is not a SPL token');
                return { valid: false, error: 'Not a SPL token' };
            }
            
            const parsed = data.parsed;
            if (!parsed || parsed.type !== 'mint') {
                setValidationState(TOKEN_VALIDATION_STATE.INVALID);
                setError('Address is not a token mint');
                return { valid: false, error: 'Not a token mint' };
            }
            
            const decimals = parsed.info?.decimals ?? 6;
            
            // Try to get token metadata (name/symbol) from Metaplex or use address as fallback
            let symbol = tokenAddress.slice(0, 6) + '...';
            let name = 'Unknown Token';
            
            // For now, use truncated address as symbol for unknown tokens
            // Full metadata lookup would require Metaplex integration
            const metadata = {
                address: tokenAddress,
                symbol: symbol,
                name: name,
                decimals: decimals,
                isKnown: false
            };
            
            setTokenMetadata(metadata);
            setValidationState(TOKEN_VALIDATION_STATE.VALID);
            
            // Fetch balance if wallet connected
            if (walletAddress) {
                fetchBalance(tokenAddress, decimals);
            }
            
            return { 
                valid: true, 
                metadata,
                isKnown: false
            };
            
        } catch (err) {
            console.error('Token validation error:', err);
            setValidationState(TOKEN_VALIDATION_STATE.ERROR);
            setError(err.message || 'Validation failed');
            return { valid: false, error: err.message };
        }
    }, [walletAddress, getConnection]);
    
    /**
     * Fetch user's balance of a token
     */
    const fetchBalance = useCallback(async (tokenAddress, decimals = 6) => {
        if (!walletAddress) {
            setUserBalance(0);
            return 0;
        }
        
        try {
            const connection = getConnection();
            const walletPubkey = new PublicKey(walletAddress);
            const mintPubkey = new PublicKey(tokenAddress);
            
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                walletPubkey,
                { mint: mintPubkey }
            );
            
            if (tokenAccounts.value.length === 0) {
                setUserBalance(0);
                return 0;
            }
            
            let totalBalance = 0;
            for (const account of tokenAccounts.value) {
                const parsedInfo = account.account.data.parsed?.info;
                if (parsedInfo) {
                    totalBalance += parsedInfo.tokenAmount?.uiAmount || 0;
                }
            }
            
            setUserBalance(totalBalance);
            return totalBalance;
            
        } catch (err) {
            console.error('Balance fetch error:', err);
            setUserBalance(0);
            return 0;
        }
    }, [walletAddress, getConnection]);
    
    /**
     * Debounced validation (for input typing)
     */
    const validateTokenDebounced = useCallback((tokenAddress) => {
        // Clear any pending validation
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        
        // Set validating state immediately for UX feedback
        if (tokenAddress && tokenAddress.trim() !== '') {
            setValidationState(TOKEN_VALIDATION_STATE.VALIDATING);
        }
        
        // Debounce the actual validation
        debounceRef.current = setTimeout(() => {
            validateToken(tokenAddress);
        }, VALIDATION_DEBOUNCE_MS);
    }, [validateToken]);
    
    /**
     * Reset validation state
     */
    const resetValidation = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        setValidationState(TOKEN_VALIDATION_STATE.IDLE);
        setTokenMetadata(null);
        setUserBalance(0);
        setError(null);
    }, []);
    
    return {
        validationState,
        tokenMetadata,
        userBalance,
        error,
        validateToken,
        validateTokenDebounced,
        fetchBalance,
        resetValidation,
        isValidating: validationState === TOKEN_VALIDATION_STATE.VALIDATING,
        isValid: validationState === TOKEN_VALIDATION_STATE.VALID,
        isInvalid: validationState === TOKEN_VALIDATION_STATE.INVALID
    };
}

export default useTokenValidation;

