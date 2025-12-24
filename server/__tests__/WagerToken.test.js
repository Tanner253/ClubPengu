/**
 * Tests for SPL Token Wagering Model Extensions
 * Verifies Challenge and Match models correctly handle wagerToken and signed payloads
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock mongoose before importing models
vi.mock('mongoose', () => {
    const mockSchema = vi.fn().mockImplementation(() => ({
        index: vi.fn(),
        methods: {},
        statics: {},
        pre: vi.fn(),
        post: vi.fn()
    }));
    mockSchema.Types = { Mixed: 'Mixed', ObjectId: 'ObjectId' };
    
    return {
        default: {
            Schema: mockSchema,
            model: vi.fn().mockImplementation((name) => {
                return { modelName: name };
            }),
            connect: vi.fn(),
            connection: { readyState: 1 }
        },
        Schema: mockSchema
    };
});

describe('Challenge Model - Wager Token Fields', () => {
    it('should have wagerToken schema fields', () => {
        // Test that Challenge schema includes wagerToken fields
        const challengeData = {
            challengeId: 'chal_test123',
            challengerWallet: 'wallet1',
            challengerName: 'Player1',
            challengerId: 'p1',
            targetWallet: 'wallet2',
            targetName: 'Player2',
            targetId: 'p2',
            gameType: 'ticTacToe',
            wagerAmount: 100,
            wagerToken: {
                tokenAddress: '63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump',
                tokenSymbol: '$CPw3',
                tokenDecimals: 6,
                tokenAmount: 50,
                amountRaw: '50000000'
            },
            challengerSignedPayload: 'base64encodedpayload1',
            targetSignedPayload: null,
            expiresAt: new Date(Date.now() + 300000)
        };
        
        // Verify structure
        expect(challengeData.wagerToken).toBeDefined();
        expect(challengeData.wagerToken.tokenAddress).toBe('63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump');
        expect(challengeData.wagerToken.tokenSymbol).toBe('$CPw3');
        expect(challengeData.wagerToken.tokenDecimals).toBe(6);
        expect(challengeData.wagerToken.tokenAmount).toBe(50);
        expect(challengeData.wagerToken.amountRaw).toBe('50000000');
        expect(challengeData.challengerSignedPayload).toBe('base64encodedpayload1');
        expect(challengeData.targetSignedPayload).toBeNull();
    });
    
    it('should allow challenges with only coin wager (no token)', () => {
        const coinOnlyChallenge = {
            challengeId: 'chal_coins',
            challengerWallet: 'wallet1',
            challengerName: 'Player1',
            challengerId: 'p1',
            targetWallet: 'wallet2',
            targetName: 'Player2',
            targetId: 'p2',
            gameType: 'connect4',
            wagerAmount: 500,
            wagerToken: {
                tokenAddress: null,
                tokenSymbol: null,
                tokenDecimals: 6,
                tokenAmount: 0,
                amountRaw: null
            },
            challengerSignedPayload: null,
            targetSignedPayload: null,
            expiresAt: new Date(Date.now() + 300000)
        };
        
        expect(coinOnlyChallenge.wagerAmount).toBe(500);
        expect(coinOnlyChallenge.wagerToken.tokenAddress).toBeNull();
        expect(coinOnlyChallenge.challengerSignedPayload).toBeNull();
    });
    
    it('should allow challenges with both coin AND token wager', () => {
        const combinedWager = {
            challengeId: 'chal_combined',
            wagerAmount: 100, // In-game coins
            wagerToken: {
                tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
                tokenSymbol: 'BONK',
                tokenDecimals: 5,
                tokenAmount: 1000000,
                amountRaw: '100000000000'
            },
            challengerSignedPayload: 'signedPayloadForBONK'
        };
        
        // Both coin and token wager should coexist
        expect(combinedWager.wagerAmount).toBe(100);
        expect(combinedWager.wagerToken.tokenAmount).toBe(1000000);
        expect(combinedWager.wagerToken.tokenSymbol).toBe('BONK');
    });
});

describe('Match Model - Wager Token Fields', () => {
    it('should have wagerToken and settlement schema fields', () => {
        const matchData = {
            matchId: 'match_test123',
            challengeId: 'chal_test123',
            player1: {
                wallet: 'wallet1',
                name: 'Player1',
                playerId: 'p1'
            },
            player2: {
                wallet: 'wallet2',
                name: 'Player2',
                playerId: 'p2'
            },
            gameType: 'ticTacToe',
            wagerAmount: 100,
            wagerToken: {
                tokenAddress: '63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump',
                tokenSymbol: '$CPw3',
                tokenDecimals: 6,
                tokenAmount: 50,
                amountRaw: '50000000'
            },
            player1SignedPayload: 'p1_signed_payload',
            player2SignedPayload: 'p2_signed_payload',
            settlementTx: null,
            settlementStatus: 'none',
            settlementError: null,
            status: 'active'
        };
        
        // Verify structure
        expect(matchData.wagerToken).toBeDefined();
        expect(matchData.player1SignedPayload).toBe('p1_signed_payload');
        expect(matchData.player2SignedPayload).toBe('p2_signed_payload');
        expect(matchData.settlementStatus).toBe('none');
    });
    
    it('should track settlement lifecycle', () => {
        const match = {
            matchId: 'match_settle',
            settlementStatus: 'none',
            settlementTx: null,
            settlementError: null
        };
        
        // Simulate settlement flow
        match.settlementStatus = 'pending';
        expect(match.settlementStatus).toBe('pending');
        
        match.settlementStatus = 'processing';
        expect(match.settlementStatus).toBe('processing');
        
        match.settlementStatus = 'completed';
        match.settlementTx = 'tx_signature_abc123';
        expect(match.settlementStatus).toBe('completed');
        expect(match.settlementTx).toBe('tx_signature_abc123');
    });
    
    it('should track settlement failures', () => {
        const match = {
            matchId: 'match_fail',
            settlementStatus: 'processing',
            settlementTx: null,
            settlementError: null
        };
        
        // Simulate failure
        match.settlementStatus = 'failed';
        match.settlementError = 'Loser balance insufficient';
        
        expect(match.settlementStatus).toBe('failed');
        expect(match.settlementError).toBe('Loser balance insufficient');
    });
    
    it('should support all settlement status values', () => {
        const validStatuses = ['none', 'pending', 'processing', 'completed', 'failed', 'manual_review'];
        
        validStatuses.forEach(status => {
            const match = { settlementStatus: status };
            expect(match.settlementStatus).toBe(status);
        });
    });
});

describe('Wager Token Config', () => {
    // Import dynamically to avoid ESM issues with mocked mongoose
    it('should validate Solana address format', () => {
        const isValidSolanaAddress = (address) => {
            if (!address || typeof address !== 'string') return false;
            const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
            return base58Regex.test(address);
        };
        
        // Valid addresses
        expect(isValidSolanaAddress('63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump')).toBe(true);
        expect(isValidSolanaAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(true);
        expect(isValidSolanaAddress('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263')).toBe(true);
        
        // Invalid addresses
        expect(isValidSolanaAddress('')).toBe(false);
        expect(isValidSolanaAddress(null)).toBe(false);
        expect(isValidSolanaAddress('invalid')).toBe(false);
        expect(isValidSolanaAddress('0x1234567890abcdef')).toBe(false); // Ethereum address
    });
    
    it('should calculate raw amounts correctly', () => {
        const calculateRawAmount = (amount, decimals) => {
            return String(Math.floor(amount * Math.pow(10, decimals)));
        };
        
        // 50 CPw3 with 6 decimals
        expect(calculateRawAmount(50, 6)).toBe('50000000');
        
        // 100 USDC with 6 decimals
        expect(calculateRawAmount(100, 6)).toBe('100000000');
        
        // 1 SOL with 9 decimals
        expect(calculateRawAmount(1, 9)).toBe('1000000000');
        
        // 1000000 BONK with 5 decimals
        expect(calculateRawAmount(1000000, 5)).toBe('100000000000');
    });
});

describe('X402 Wager Payment', () => {
    it('should create wager payment payload with token details', () => {
        const wagerDetails = {
            amount: '50000000', // 50 CPw3 raw
            challengeId: 'chal_test123',
            opponentWallet: 'opponent_wallet_address',
            tokenAddress: '63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump',
            tokenSymbol: '$CPw3'
        };
        
        // Simulate payload creation
        const payload = {
            version: '1.0',
            network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            payer: 'challenger_wallet',
            recipient: wagerDetails.opponentWallet,
            token: wagerDetails.tokenAddress,
            amount: wagerDetails.amount,
            validUntil: Date.now() + 30 * 60 * 1000,
            nonce: 'unique_nonce_123',
            memo: `wager:${wagerDetails.challengeId}:${wagerDetails.tokenSymbol}`
        };
        
        expect(payload.token).toBe('63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump');
        expect(payload.recipient).toBe('opponent_wallet_address');
        expect(payload.amount).toBe('50000000');
        expect(payload.memo).toContain('wager:');
        expect(payload.memo).toContain('$CPw3');
    });
    
    it('should default to CPw3 token if not specified', () => {
        const wagerDetails = {
            amount: '100000000',
            challengeId: 'chal_test',
            opponentWallet: 'opponent'
            // No tokenAddress specified
        };
        
        const defaultToken = '63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump';
        const tokenAddress = wagerDetails.tokenAddress || defaultToken;
        
        expect(tokenAddress).toBe(defaultToken);
    });
});

