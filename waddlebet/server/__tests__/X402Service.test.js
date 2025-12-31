/**
 * X402Service Unit Tests
 * Tests payment payload verification and settlement
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock nacl and bs58
vi.mock('tweetnacl', () => ({
    default: {
        sign: {
            detached: {
                verify: vi.fn()
            }
        }
    }
}));

vi.mock('bs58', () => ({
    default: {
        decode: vi.fn((str) => new Uint8Array(32))
    }
}));

// Mock fetch for facilitator calls
global.fetch = vi.fn();

import nacl from 'tweetnacl';
import bs58 from 'bs58';

// ==================== TEST DATA ====================
const VALID_PAYLOAD = {
    version: '1.0',
    network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    payer: 'PayerWallet123',
    recipient: 'RecipientWallet456',
    token: 'CPw3TOKEN',
    amount: '10000',
    validUntil: Date.now() + 60000, // Valid for 1 minute
    nonce: 'uniquenonce123',
    memo: 'rent:space1:1days',
    signature: 'ValidSignature123'
};

const encodePayload = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64');

// ==================== TESTS ====================
describe('X402Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: signature verification passes
        nacl.sign.detached.verify.mockReturnValue(true);
    });
    
    describe('decodePayload', () => {
        it('should decode valid base64 payload', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const decoded = x402Service.decodePayload(encoded);
            
            expect(decoded).toEqual(VALID_PAYLOAD);
        });
        
        it('should return null for invalid base64', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const decoded = x402Service.decodePayload('not-valid-base64!!!');
            
            expect(decoded).toBeNull();
        });
        
        it('should return null for non-JSON content', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = Buffer.from('not json').toString('base64');
            const decoded = x402Service.decodePayload(encoded);
            
            expect(decoded).toBeNull();
        });
    });
    
    describe('verifyPayloadLocal', () => {
        it('should accept valid non-expired payload', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.verifyPayloadLocal(encoded);
            
            expect(result.valid).toBe(true);
            expect(result.payload).toBeDefined();
        });
        
        it('should reject expired payload', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const expiredPayload = { ...VALID_PAYLOAD, validUntil: Date.now() - 1000 };
            const encoded = encodePayload(expiredPayload);
            const result = await x402Service.verifyPayloadLocal(encoded);
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('PAYLOAD_EXPIRED');
        });
        
        it('should reject wrong network', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const wrongNetworkPayload = { ...VALID_PAYLOAD, network: 'ethereum:1' };
            const encoded = encodePayload(wrongNetworkPayload);
            const result = await x402Service.verifyPayloadLocal(encoded);
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('WRONG_NETWORK');
        });
        
        it('should reject invalid signature', async () => {
            nacl.sign.detached.verify.mockReturnValue(false);
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.verifyPayloadLocal(encoded);
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_SIGNATURE');
        });
    });
    
    describe('verifyPayload', () => {
        it('should verify expected amount', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.verifyPayload(encoded, { amount: 10000 });
            
            expect(result.valid).toBe(true);
        });
        
        it('should reject insufficient amount', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.verifyPayload(encoded, { amount: 20000 }); // Expect more
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INSUFFICIENT_AMOUNT');
        });
        
        it('should verify expected recipient', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.verifyPayload(encoded, { 
                recipient: 'RecipientWallet456' 
            });
            
            expect(result.valid).toBe(true);
        });
        
        it('should reject wrong recipient', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.verifyPayload(encoded, { 
                recipient: 'WrongWallet' 
            });
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('WRONG_RECIPIENT');
        });
        
        it('should verify expected token', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.verifyPayload(encoded, { 
                token: 'CPw3TOKEN' 
            });
            
            expect(result.valid).toBe(true);
        });
        
        it('should reject wrong token', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.verifyPayload(encoded, { 
                token: 'WrongToken' 
            });
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('WRONG_TOKEN');
        });
    });
    
    describe('settlePayment', () => {
        it('should settle valid payment successfully', async () => {
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true, transaction: 'txhash123' })
            });
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.settlePayment(encoded);
            
            expect(result.success).toBe(true);
            expect(result.transactionHash).toBe('txhash123');
        });
        
        it('should fail settlement for expired payload', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const expiredPayload = { ...VALID_PAYLOAD, validUntil: Date.now() - 1000 };
            const encoded = encodePayload(expiredPayload);
            const result = await x402Service.settlePayment(encoded);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('PAYLOAD_EXPIRED');
        });
        
        it('should handle facilitator errors', async () => {
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: false, error: 'INSUFFICIENT_FUNDS' })
            });
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.settlePayment(encoded);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('INSUFFICIENT_FUNDS');
        });
        
        it('should handle network errors', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const encoded = encodePayload(VALID_PAYLOAD);
            const result = await x402Service.settlePayment(encoded);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('SETTLEMENT_ERROR');
        });
    });
});




