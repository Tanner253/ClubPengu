/**
 * X402Service Integration Tests
 * Tests complete payment flows and production scenarios
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

// Mock dependencies
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

global.fetch = vi.fn();

import nacl from 'tweetnacl';

// ==================== TEST DATA ====================
const createValidPayload = (overrides = {}) => ({
    version: '1.0',
    network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    payer: 'PayerWallet123',
    recipient: 'RecipientWallet456',
    token: 'CPw3TOKEN',
    amount: '10000',
    validUntil: Date.now() + 60000,
    nonce: 'uniquenonce123',
    memo: 'test:payment',
    signature: 'ValidSignature123',
    ...overrides
});

const encodePayload = (payload) => Buffer.from(JSON.stringify(payload)).toString('base64');

// ==================== TESTS ====================
describe('X402Service Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        nacl.sign.detached.verify.mockReturnValue(true);
        process.env = { ...originalEnv };
    });
    
    afterEach(() => {
        process.env = originalEnv;
    });
    
    describe('Full Payment Flow', () => {
        it('should complete full rent payment flow', async () => {
            // Setup
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true, transaction: 'txhash_rent' })
            });
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const rentPayload = createValidPayload({
                amount: '10000',
                memo: 'rent:space1:1days'
            });
            const encoded = encodePayload(rentPayload);
            
            // Step 1: Verify locally
            const localVerify = await x402Service.verifyPayloadLocal(encoded);
            expect(localVerify.valid).toBe(true);
            
            // Step 2: Verify with expected details
            const fullVerify = await x402Service.verifyPayload(encoded, {
                amount: 10000,
                recipient: 'RecipientWallet456'
            });
            expect(fullVerify.valid).toBe(true);
            
            // Step 3: Settle payment
            const settlement = await x402Service.settlePayment(encoded);
            expect(settlement.success).toBe(true);
            expect(settlement.transactionHash).toBe('txhash_rent');
        });
        
        it('should complete full entry fee payment flow', async () => {
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true, transaction: 'txhash_entry' })
            });
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const entryPayload = createValidPayload({
                amount: '500',
                recipient: 'OwnerWallet789',
                memo: 'entry:space5'
            });
            const encoded = encodePayload(entryPayload);
            
            // Verify owner receives payment
            const verify = await x402Service.verifyPayload(encoded, {
                recipient: 'OwnerWallet789'
            });
            expect(verify.valid).toBe(true);
            
            // Settle
            const settlement = await x402Service.settlePayment(encoded);
            expect(settlement.success).toBe(true);
        });
        
        it('should complete wager payment flow', async () => {
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true, transaction: 'txhash_wager' })
            });
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const wagerPayload = createValidPayload({
                amount: '5000',
                recipient: 'OpponentWallet',
                memo: 'wager:match123'
            });
            const encoded = encodePayload(wagerPayload);
            
            const verify = await x402Service.verifyPayload(encoded, {
                amount: 5000,
                recipient: 'OpponentWallet'
            });
            expect(verify.valid).toBe(true);
            
            const settlement = await x402Service.settlePayment(encoded);
            expect(settlement.success).toBe(true);
        });
    });
    
    describe('Production Mode Behavior', () => {
        it('should call facilitator verify in production', async () => {
            process.env.NODE_ENV = 'production';
            
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ valid: true })
            });
            
            // Re-import to pick up new env
            vi.resetModules();
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const payload = createValidPayload();
            const encoded = encodePayload(payload);
            
            await x402Service.verifyPayload(encoded, { amount: 10000 });
            
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/verify'),
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            );
        });
        
        it('should fail closed when facilitator is unreachable in production', async () => {
            process.env.NODE_ENV = 'production';
            
            global.fetch.mockRejectedValue(new Error('Network error'));
            
            vi.resetModules();
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const payload = createValidPayload();
            const encoded = encodePayload(payload);
            
            const result = await x402Service.verifyPayload(encoded, { amount: 10000 });
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('FACILITATOR_ERROR');
        });
        
        it('should reject when facilitator rejects in production', async () => {
            process.env.NODE_ENV = 'production';
            
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ 
                    valid: false, 
                    error: 'INVALID_SIGNATURE',
                    message: 'Signature verification failed'
                })
            });
            
            vi.resetModules();
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const payload = createValidPayload();
            const encoded = encodePayload(payload);
            
            const result = await x402Service.verifyPayload(encoded, { amount: 10000 });
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_SIGNATURE');
        });
    });
    
    describe('Edge Cases', () => {
        it('should handle BigInt amounts correctly', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const largePayload = createValidPayload({
                amount: '999999999999999'
            });
            const encoded = encodePayload(largePayload);
            
            const result = await x402Service.verifyPayload(encoded, {
                amount: 999999999999999
            });
            
            expect(result.valid).toBe(true);
        });
        
        it('should reject when amount is less than expected', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const payload = createValidPayload({ amount: '5000' });
            const encoded = encodePayload(payload);
            
            const result = await x402Service.verifyPayload(encoded, {
                amount: 10000 // Expect more than payload has
            });
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INSUFFICIENT_AMOUNT');
        });
        
        it('should accept when amount exceeds expected', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const payload = createValidPayload({ amount: '15000' });
            const encoded = encodePayload(payload);
            
            const result = await x402Service.verifyPayload(encoded, {
                amount: 10000 // Expect less than payload has
            });
            
            expect(result.valid).toBe(true);
        });
        
        it('should handle malformed JSON in payload', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const badBase64 = Buffer.from('{ invalid json }').toString('base64');
            
            const result = await x402Service.verifyPayloadLocal(badBase64);
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('INVALID_PAYLOAD');
        });
        
        it('should handle empty payload', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const result = await x402Service.verifyPayloadLocal('');
            
            expect(result.valid).toBe(false);
        });
        
        it('should handle payload with missing fields', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const incompletePayload = { amount: '1000' }; // Missing required fields
            const encoded = encodePayload(incompletePayload);
            
            const result = await x402Service.verifyPayloadLocal(encoded);
            
            // Should fail due to missing validUntil or network
            expect(result.valid).toBe(false);
        });
        
        it('should handle just-expired payload', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const payload = createValidPayload({ validUntil: Date.now() - 1 });
            const encoded = encodePayload(payload);
            
            const result = await x402Service.verifyPayloadLocal(encoded);
            
            expect(result.valid).toBe(false);
            expect(result.error).toBe('PAYLOAD_EXPIRED');
        });
        
        it('should handle very long validity period', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            // Valid for 1 year
            const payload = createValidPayload({ validUntil: Date.now() + 365 * 24 * 60 * 60 * 1000 });
            const encoded = encodePayload(payload);
            
            const result = await x402Service.verifyPayloadLocal(encoded);
            
            expect(result.valid).toBe(true);
        });
    });
    
    describe('Settlement Edge Cases', () => {
        it('should handle settlement timeout', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            global.fetch.mockImplementation(() => new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 100);
            }));
            
            const payload = createValidPayload();
            const encoded = encodePayload(payload);
            
            const result = await x402Service.settlePayment(encoded);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('SETTLEMENT_ERROR');
        });
        
        it('should include payload in successful settlement', async () => {
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true, transaction: 'tx123' })
            });
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const payload = createValidPayload();
            const encoded = encodePayload(payload);
            
            const result = await x402Service.settlePayment(encoded);
            
            expect(result.success).toBe(true);
            expect(result.payload).toBeDefined();
            expect(result.payload.amount).toBe('10000');
        });
        
        it('should handle facilitator returning empty transaction hash', async () => {
            global.fetch.mockResolvedValue({
                json: () => Promise.resolve({ success: true, transaction: '' })
            });
            
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const payload = createValidPayload();
            const encoded = encodePayload(payload);
            
            const result = await x402Service.settlePayment(encoded);
            
            expect(result.success).toBe(true);
            expect(result.transactionHash).toBe('');
        });
    });
    
    describe('Token Balance Checking', () => {
        it('should check rent eligibility', async () => {
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const result = await x402Service.checkRentEligibility('TestWallet', 70000);
            
            expect(result).toBeDefined();
            expect(result.hasBalance).toBeDefined();
        });
        
        it('should return mock balance in development', async () => {
            process.env.NODE_ENV = 'development';
            
            vi.resetModules();
            const { default: x402Service } = await import('../services/X402Service.js');
            
            const result = await x402Service.checkTokenBalance('TestWallet', 'TOKEN', 50000);
            
            expect(result.hasBalance).toBe(true);
            expect(result.currentBalance).toBeGreaterThanOrEqual(50000);
        });
    });
});

describe('X402Service Error Recovery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        nacl.sign.detached.verify.mockReturnValue(true);
    });
    
    it('should handle multiple rapid verification calls', async () => {
        const { default: x402Service } = await import('../services/X402Service.js');
        
        const payloads = Array(10).fill(null).map((_, i) => 
            encodePayload(createValidPayload({ nonce: `nonce${i}` }))
        );
        
        const results = await Promise.all(
            payloads.map(p => x402Service.verifyPayloadLocal(p))
        );
        
        expect(results.every(r => r.valid)).toBe(true);
    });
    
    it('should handle concurrent settlement attempts', async () => {
        global.fetch.mockResolvedValue({
            json: () => Promise.resolve({ success: true, transaction: 'tx' })
        });
        
        const { default: x402Service } = await import('../services/X402Service.js');
        
        const payload = encodePayload(createValidPayload());
        
        // Concurrent settlement attempts (simulating double-spend attempt)
        const [result1, result2] = await Promise.all([
            x402Service.settlePayment(payload),
            x402Service.settlePayment(payload)
        ]);
        
        // Both should succeed at our layer (facilitator handles double-spend)
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
    });
});




