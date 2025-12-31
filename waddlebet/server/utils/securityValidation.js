/**
 * Security Validation Utilities
 * 
 * CRITICAL: All user inputs must be validated before use in database queries or calculations
 * This prevents:
 * - SQL/NoSQL injection attacks
 * - Type coercion vulnerabilities
 * - Integer overflow/underflow
 * - Invalid data manipulation
 */

/**
 * Validate and sanitize a numeric amount
 * @param {any} value - Input value (could be string, number, etc.)
 * @param {object} options - Validation options
 * @param {number} options.min - Minimum allowed value
 * @param {number} options.max - Maximum allowed value
 * @param {boolean} options.allowFloat - Allow floating point numbers (default: false)
 * @param {boolean} options.allowZero - Allow zero (default: true)
 * @returns {{valid: boolean, value: number|null, error: string|null}}
 */
export function validateAmount(value, options = {}) {
    const {
        min = 0,
        max = Number.MAX_SAFE_INTEGER,
        allowFloat = false,
        allowZero = true
    } = options;

    // Type check: must be a number or numeric string
    if (value === null || value === undefined) {
        return { valid: false, value: null, error: 'Amount is required' };
    }

    // Convert to number
    const numValue = typeof value === 'string' ? parseFloat(value) : Number(value);

    // Check for NaN, Infinity, or -Infinity
    if (!Number.isFinite(numValue)) {
        return { valid: false, value: null, error: 'Invalid amount: must be a finite number' };
    }

    // Check for integer if floats not allowed
    if (!allowFloat && !Number.isInteger(numValue)) {
        return { valid: false, value: null, error: 'Amount must be an integer' };
    }

    // Check for zero
    if (!allowZero && numValue === 0) {
        return { valid: false, value: null, error: 'Amount cannot be zero' };
    }

    // Check for negative
    if (numValue < 0) {
        return { valid: false, value: null, error: 'Amount cannot be negative' };
    }

    // Check bounds
    if (numValue < min) {
        return { valid: false, value: null, error: `Amount must be at least ${min}` };
    }

    if (numValue > max) {
        return { valid: false, value: null, error: `Amount exceeds maximum of ${max}` };
    }

    // Return sanitized integer or float
    return {
        valid: true,
        value: allowFloat ? numValue : Math.floor(numValue),
        error: null
    };
}

/**
 * Validate a Solana wallet address
 * @param {any} address - Wallet address to validate
 * @returns {{valid: boolean, address: string|null, error: string|null}}
 */
export function validateWalletAddress(address) {
    if (!address || typeof address !== 'string') {
        return { valid: false, address: null, error: 'Wallet address is required and must be a string' };
    }

    // Trim whitespace
    const trimmed = address.trim();

    // Solana addresses are base58 encoded and typically 32-44 characters
    // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    if (!base58Regex.test(trimmed)) {
        return { valid: false, address: null, error: 'Invalid wallet address format' };
    }

    // Additional check: ensure it's not a potential injection attempt
    // MongoDB query operators should not appear in wallet addresses
    const dangerousPatterns = [
        /\$[a-z]+/,  // MongoDB operators like $gt, $ne, etc.
        /\{|\}/,     // Object notation
        /\[|\]/,     // Array notation
        /null|undefined/i, // JavaScript keywords
        /true|false/i,    // Boolean values
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmed)) {
            return { valid: false, address: null, error: 'Invalid wallet address: contains dangerous characters' };
        }
    }

    return { valid: true, address: trimmed, error: null };
}

/**
 * Validate a Solana transaction signature
 * @param {any} signature - Transaction signature to validate
 * @returns {{valid: boolean, signature: string|null, error: string|null}}
 */
export function validateTransactionSignature(signature) {
    if (!signature || typeof signature !== 'string') {
        return { valid: false, signature: null, error: 'Transaction signature is required and must be a string' };
    }

    // Trim whitespace
    const trimmed = signature.trim();

    // Solana signatures are base58 encoded and typically 88 characters
    // Base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{80,100}$/;

    if (!base58Regex.test(trimmed)) {
        return { valid: false, signature: null, error: 'Invalid transaction signature format' };
    }

    // Check for injection patterns
    const dangerousPatterns = [
        /\$[a-z]+/,  // MongoDB operators
        /\{|\}/,     // Object notation
        /\[|\]/,     // Array notation
        /null|undefined/i,
        /true|false/i,
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmed)) {
            return { valid: false, signature: null, error: 'Invalid signature: contains dangerous characters' };
        }
    }

    return { valid: true, signature: trimmed, error: null };
}

/**
 * Validate a string input to prevent injection attacks
 * @param {any} value - Input value
 * @param {object} options - Validation options
 * @param {number} options.maxLength - Maximum allowed length
 * @param {boolean} options.allowEmpty - Allow empty strings (default: false)
 * @returns {{valid: boolean, value: string|null, error: string|null}}
 */
export function validateString(value, options = {}) {
    const {
        maxLength = 1000,
        allowEmpty = false
    } = options;

    if (value === null || value === undefined) {
        return { valid: false, value: null, error: 'Value is required' };
    }

    if (typeof value !== 'string') {
        return { valid: false, value: null, error: 'Value must be a string' };
    }

    const trimmed = value.trim();

    if (!allowEmpty && trimmed.length === 0) {
        return { valid: false, value: null, error: 'Value cannot be empty' };
    }

    if (trimmed.length > maxLength) {
        return { valid: false, value: null, error: `Value exceeds maximum length of ${maxLength}` };
    }

    // Check for MongoDB injection patterns
    const dangerousPatterns = [
        /\$[a-z]+/,  // MongoDB operators
        /\{|\}/,     // Object notation (unless explicitly allowed)
        /\[|\]/,     // Array notation
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmed)) {
            return { valid: false, value: null, error: 'Value contains potentially dangerous characters' };
        }
    }

    return { valid: true, value: trimmed, error: null };
}

/**
 * Sanitize a wallet address for use in MongoDB queries
 * Ensures it's a valid string and not an injection attempt
 * @param {any} address - Wallet address
 * @returns {string|null} - Sanitized address or null if invalid
 */
export function sanitizeWalletAddress(address) {
    const validation = validateWalletAddress(address);
    return validation.valid ? validation.address : null;
}

/**
 * Sanitize an amount for use in calculations
 * @param {any} value - Amount value
 * @param {object} options - Validation options (same as validateAmount)
 * @returns {number|null} - Sanitized amount or null if invalid
 */
export function sanitizeAmount(value, options = {}) {
    const validation = validateAmount(value, options);
    return validation.valid ? validation.value : null;
}

