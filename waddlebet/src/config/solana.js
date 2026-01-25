/**
 * Solana Configuration - Token addresses, wallets, and payment settings
 * Central config for all blockchain-related constants
 * 
 * Environment variables (set in .env):
 *   VITE_CPW3_TOKEN_ADDRESS - $CP token mint address
 *   VITE_RENT_WALLET_ADDRESS - Treasury wallet for rent
 *   VITE_SOLANA_NETWORK - 'mainnet' or 'devnet'
 *   VITE_X402_FACILITATOR_URL - x402 facilitator endpoint
 */

// ==================== TOKEN ADDRESSES ====================
// $CP Token - Native game currency (WaddleBet)
export const CPW3_TOKEN_ADDRESS = import.meta.env.VITE_CPW3_TOKEN_ADDRESS || '9kdJA8Ahjyh7Yt8UDWpihznwTMtKJVEAmhsUFmeppump';

// USDC on Solana (for x402 payments)
export const USDC_TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ==================== WALLETS ====================
// Treasury wallet for rent payments
export const RENT_WALLET_ADDRESS = import.meta.env.VITE_RENT_WALLET_ADDRESS || '466jab8XPyn5vXj3SgzCz8wuEkBKqVuQrUy4EtLiadxM';

// ==================== NETWORK ====================
// Solana mainnet CAIP-2 identifier
export const SOLANA_NETWORK_ID = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

// Solana devnet CAIP-2 identifier (for testing)
export const SOLANA_DEVNET_NETWORK_ID = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

// Current network (use environment variable or default to mainnet)
export const CURRENT_NETWORK_ID = import.meta?.env?.VITE_SOLANA_NETWORK === 'devnet' 
    ? SOLANA_DEVNET_NETWORK_ID 
    : SOLANA_NETWORK_ID;

// ==================== x402 FACILITATOR ====================
// Production facilitator URL
export const X402_FACILITATOR_URL = import.meta.env.VITE_X402_FACILITATOR_URL || 'https://x402.org/facilitator';

// ==================== IGLOO RENTAL CONFIG ====================
export const IGLOO_CONFIG = {
    // Daily rent cost in $CP tokens
    DAILY_RENT_CPW3: 10000,
    
    // Minimum balance required to rent (7 days worth of $CP)
    MINIMUM_BALANCE_CPW3: 70000,
    
    // Grace period before eviction (in hours)
    GRACE_PERIOD_HOURS: 12,
    
    // Total igloos in the game
    TOTAL_IGLOOS: 10,
    
    // Reserved rental igloos (pre-set owners, not available for public rent)
    // These are still rental igloos, just pre-configured with owners
    RESERVED_IGLOO_IDS: ['igloo3', 'igloo8'],
    
    // Available for rent
    RENTABLE_IGLOOS: ['igloo1', 'igloo2', 'igloo4', 'igloo5', 'igloo6', 'igloo7', 'igloo9', 'igloo10'],
    
    // Igloo positions (for DB sync)
    IGLOO_POSITIONS: {
        'igloo1': { x: -75, z: -70, row: 'north' },
        'igloo2': { x: -50, z: -73, row: 'north' },
        'igloo3': { x: -25, z: -70, row: 'north' },  // SKNY GANG
        'igloo4': { x: 25, z: -70, row: 'north' },
        'igloo5': { x: 50, z: -73, row: 'north' },
        'igloo6': { x: 75, z: -70, row: 'north' },
        'igloo7': { x: -70, z: -20, row: 'south' },
        'igloo8': { x: -40, z: -23, row: 'south' },  // REGEN
        'igloo9': { x: 40, z: -23, row: 'south' },
        'igloo10': { x: 70, z: -20, row: 'south' }
    }
};

// ==================== PAYMENT STATUS CODES ====================
export const PAYMENT_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
    SETTLED: 'settled',
    FAILED: 'failed',
    EXPIRED: 'expired'
};

// ==================== ACCESS CONTROL ====================
export const IGLOO_ACCESS = {
    PRIVATE: 'private',      // Only owner can enter
    PUBLIC: 'public',        // Anyone can enter
    TOKEN_GATED: 'token',    // Must hold specified token
    ENTRY_FEE: 'fee',        // One-time payment required
    BOTH: 'both'             // Token + entry fee
};

