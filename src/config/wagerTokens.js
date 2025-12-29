/**
 * Wager Token Configuration
 * Predefined tokens available for wagering on minigames
 * 
 * Similar to igloo token configuration - same pattern for consistency
 */

// ==================== POPULAR WAGER TOKENS ====================
// Tokens available for quick-select when creating a wager
export const WAGER_TOKENS = [
    { 
        symbol: '$WADDLE', 
        name: 'WaddleBet',
        address: 'BDbMVbcc5hD5qiiGYwipeuUVMKDs16s9Nxk2hrhbpump',
        decimals: 6,
        logoURI: '/tokens/waddle.png',
        isDefault: true  // Default token for wagers
    },
    { 
        symbol: 'SOL', 
        name: 'Wrapped SOL',
        address: 'So11111111111111111111111111111111111111112',
        decimals: 9,
        logoURI: '/tokens/sol.png'
    },
    { 
        symbol: 'USDC', 
        name: 'USD Coin',
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        logoURI: '/tokens/usdc.png'
    },
    { 
        symbol: 'BONK', 
        name: 'Bonk',
        address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        decimals: 5,
        logoURI: '/tokens/bonk.png'
    }
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Get default wager token ($WADDLE)
 */
export const getDefaultWagerToken = () => {
    return WAGER_TOKENS.find(t => t.isDefault) || WAGER_TOKENS[0];
};

/**
 * Find token by address
 */
export const findTokenByAddress = (address) => {
    return WAGER_TOKENS.find(t => t.address === address);
};

/**
 * Check if an address is a known token
 */
export const isKnownToken = (address) => {
    return WAGER_TOKENS.some(t => t.address === address);
};

/**
 * Get Jupiter swap URL for a token
 */
export const getJupiterSwapUrl = (tokenAddress) => {
    return `https://jup.ag/swap/SOL-${tokenAddress}`;
};

/**
 * Get Solscan token URL
 */
export const getSolscanTokenUrl = (tokenAddress) => {
    return `https://solscan.io/token/${tokenAddress}`;
};

/**
 * Get Solscan transaction URL
 */
export const getSolscanTxUrl = (signature) => {
    return `https://solscan.io/tx/${signature}`;
};

// ==================== TOKEN VALIDATION ====================

/**
 * Basic validation of Solana address format
 * Full validation should happen on-chain via RPC
 */
export const isValidSolanaAddress = (address) => {
    if (!address || typeof address !== 'string') return false;
    // Solana addresses are base58 encoded, 32-44 characters
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
};

export default {
    WAGER_TOKENS,
    getDefaultWagerToken,
    findTokenByAddress,
    isKnownToken,
    getJupiterSwapUrl,
    getSolscanTokenUrl,
    getSolscanTxUrl,
    isValidSolanaAddress
};

