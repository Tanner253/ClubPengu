/**
 * Client X402Service Unit Tests
 * Tests payment payload creation and wallet integration
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock config
vi.mock('../config/solana.js', () => ({
    CURRENT_NETWORK_ID: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    CPW3_TOKEN_ADDRESS: 'CPw3TEST',
    X402_FACILITATOR_URL: 'https://test.facilitator.com',
    RENT_WALLET_ADDRESS: 'RENTTEST'
}));

// ==================== TESTS ====================
describe('X402Service (Client)', () => {
    let mockWallet;
    let X402Service;
    
    beforeEach(async () => {
        // Reset modules to clear singleton between tests
        vi.resetModules();
        
        // Setup mock wallet with default behavior
        mockWallet = {
            isConnected: vi.fn(() => true),
            getPublicKey: vi.fn(() => 'TestWallet123'),
            signMessage: vi.fn()
        };
        
        // Mock PhantomWallet before importing X402Service
        vi.doMock('../wallet/PhantomWallet.js', () => ({
            default: {
                getInstance: vi.fn(() => mockWallet)
            }
        }));
        
        // Import fresh X402Service after mocking
        const module = await import('../wallet/X402Service.js');
        X402Service = module.default;
    });
    
    describe('isReady', () => {
        it('should return true when wallet is connected', () => {
            mockWallet.isConnected.mockReturnValue(true);
            
            const service = X402Service.getInstance();
            
            expect(service.isReady()).toBe(true);
        });
        
        it('should return false when wallet is not connected', () => {
            mockWallet.isConnected.mockReturnValue(false);
            
            const service = X402Service.getInstance();
            
            expect(service.isReady()).toBe(false);
        });
    });
    
    describe('getWalletAddress', () => {
        it('should return connected wallet address', () => {
            const service = X402Service.getInstance();
            
            expect(service.getWalletAddress()).toBe('TestWallet123');
        });
    });
    
    describe('createPaymentPayload', () => {
        it('should fail when wallet not connected', async () => {
            mockWallet.isConnected.mockReturnValue(false);
            
            const service = X402Service.getInstance();
            
            const result = await service.createPaymentPayload({
                amount: 10000,
                recipient: 'Recipient123'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('WALLET_NOT_CONNECTED');
        });
        
        it('should create payload with valid wallet connection', async () => {
            mockWallet.isConnected.mockReturnValue(true);
            mockWallet.signMessage.mockResolvedValue({ 
                success: true, 
                signature: 'TestSignature123' 
            });
            
            const service = X402Service.getInstance();
            
            const result = await service.createPaymentPayload({
                amount: 10000,
                recipient: 'Recipient123',
                memo: 'test payment'
            });
            
            expect(result.success).toBe(true);
            expect(result.payload).toBeDefined();
            expect(result.paymentDetails).toBeDefined();
            expect(result.paymentDetails.amount).toBe('10000');
            expect(result.paymentDetails.recipient).toBe('Recipient123');
        });
        
        it('should fail when user rejects signature', async () => {
            mockWallet.isConnected.mockReturnValue(true);
            mockWallet.signMessage.mockResolvedValue({ 
                success: false, 
                error: 'USER_REJECTED',
                message: 'User rejected signature'
            });
            
            const service = X402Service.getInstance();
            
            const result = await service.createPaymentPayload({
                amount: 10000,
                recipient: 'Recipient123'
            });
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('USER_REJECTED');
        });
        
        it('should use default token when not specified', async () => {
            mockWallet.isConnected.mockReturnValue(true);
            mockWallet.signMessage.mockResolvedValue({ 
                success: true, 
                signature: 'TestSignature123' 
            });
            
            const service = X402Service.getInstance();
            
            const result = await service.createPaymentPayload({
                amount: 10000,
                recipient: 'Recipient123'
            });
            
            expect(result.success).toBe(true);
            expect(result.paymentDetails.token).toBe('CPw3TEST');
        });
    });
    
    describe('createRentPayment', () => {
        it('should create rent payment with correct memo', async () => {
            mockWallet.isConnected.mockReturnValue(true);
            mockWallet.signMessage.mockResolvedValue({ 
                success: true, 
                signature: 'TestSignature123' 
            });
            
            const service = X402Service.getInstance();
            
            const result = await service.createRentPayment('space1', 1, 10000);
            
            expect(result.success).toBe(true);
            expect(result.paymentDetails.memo).toBe('rent:space1:1days');
            expect(result.paymentDetails.amount).toBe('10000');
        });
        
        it('should calculate multi-day rent correctly', async () => {
            mockWallet.isConnected.mockReturnValue(true);
            mockWallet.signMessage.mockResolvedValue({ 
                success: true, 
                signature: 'TestSignature123' 
            });
            
            const service = X402Service.getInstance();
            
            const result = await service.createRentPayment('space5', 3, 10000);
            
            expect(result.success).toBe(true);
            expect(result.paymentDetails.memo).toBe('rent:space5:3days');
            expect(result.paymentDetails.amount).toBe('30000'); // 3 * 10000
        });
    });
    
    describe('createEntryFeePayment', () => {
        it('should create entry fee payment to owner wallet', async () => {
            mockWallet.isConnected.mockReturnValue(true);
            mockWallet.signMessage.mockResolvedValue({ 
                success: true, 
                signature: 'TestSignature123' 
            });
            
            const service = X402Service.getInstance();
            
            const result = await service.createEntryFeePayment('space7', 500, 'OwnerWallet789');
            
            expect(result.success).toBe(true);
            expect(result.paymentDetails.memo).toBe('entry:space7');
            expect(result.paymentDetails.recipient).toBe('OwnerWallet789');
            expect(result.paymentDetails.amount).toBe('500');
        });
    });
    
    describe('createWagerPayment', () => {
        it('should create wager payment to opponent', async () => {
            mockWallet.isConnected.mockReturnValue(true);
            mockWallet.signMessage.mockResolvedValue({ 
                success: true, 
                signature: 'TestSignature123' 
            });
            
            const service = X402Service.getInstance();
            
            const result = await service.createWagerPayment({
                amount: 5000,
                matchId: 'match123',
                opponentWallet: 'OpponentWallet456'
            });
            
            expect(result.success).toBe(true);
            expect(result.paymentDetails.memo).toBe('wager:match123:$CPw3');
            expect(result.paymentDetails.recipient).toBe('OpponentWallet456');
            expect(result.paymentDetails.amount).toBe('5000');
        });
    });
    
    describe('decodePayload', () => {
        it('should decode valid payload', () => {
            const service = X402Service.getInstance();
            
            const originalPayload = {
                amount: '10000',
                recipient: 'Test',
                validUntil: Date.now() + 60000
            };
            const encoded = btoa(JSON.stringify(originalPayload));
            
            const decoded = service.decodePayload(encoded);
            
            expect(decoded.amount).toBe('10000');
            expect(decoded.recipient).toBe('Test');
        });
        
        it('should return null for invalid payload', () => {
            const service = X402Service.getInstance();
            
            const decoded = service.decodePayload('invalid-base64!!!');
            
            expect(decoded).toBeNull();
        });
    });
    
    describe('isPayloadExpired', () => {
        it('should return false for non-expired payload', () => {
            const service = X402Service.getInstance();
            
            const payload = { validUntil: Date.now() + 60000 };
            const encoded = btoa(JSON.stringify(payload));
            
            expect(service.isPayloadExpired(encoded)).toBe(false);
        });
        
        it('should return true for expired payload', () => {
            const service = X402Service.getInstance();
            
            const payload = { validUntil: Date.now() - 1000 };
            const encoded = btoa(JSON.stringify(payload));
            
            expect(service.isPayloadExpired(encoded)).toBe(true);
        });
        
        it('should return true for invalid payload', () => {
            const service = X402Service.getInstance();
            
            expect(service.isPayloadExpired('invalid')).toBe(true);
        });
    });
});

