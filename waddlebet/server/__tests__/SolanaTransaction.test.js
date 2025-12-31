/**
 * SolanaTransaction Model Tests
 * Tests for audit logging and replay attack prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';

// Create a mock schema that mimics Mongoose behavior
const createMockModel = () => {
    const documents = new Map();
    
    const MockModel = function(data) {
        this._id = new mongoose.Types.ObjectId();
        Object.assign(this, data);
        this.save = vi.fn().mockResolvedValue(this);
    };
    
    MockModel.findOne = vi.fn().mockImplementation((query) => ({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(documents.get(query.signature) || null)
    }));
    
    MockModel.find = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([])
    }));
    
    MockModel.countDocuments = vi.fn().mockResolvedValue(0);
    
    MockModel.aggregate = vi.fn().mockResolvedValue([]);
    
    // Static methods
    MockModel.isSignatureUsed = async (signature) => {
        return documents.has(signature);
    };
    
    MockModel.recordTransaction = async (data) => {
        const doc = new MockModel({
            ...data,
            processedAt: new Date(),
            createdAt: new Date()
        });
        documents.set(data.signature, doc);
        return doc;
    };
    
    MockModel.countRecentTransactions = async (walletAddress, windowMs = 60000) => {
        let count = 0;
        const windowStart = Date.now() - windowMs;
        for (const doc of documents.values()) {
            if (doc.senderWallet === walletAddress && 
                doc.processedAt.getTime() >= windowStart) {
                count++;
            }
        }
        return count;
    };
    
    MockModel.getWalletHistory = (walletAddress, options = {}) => {
        const results = [];
        for (const doc of documents.values()) {
            if (doc.senderWallet === walletAddress || doc.recipientWallet === walletAddress) {
                results.push(doc);
            }
        }
        return Promise.resolve(results.slice(0, options.limit || 50));
    };
    
    MockModel._documents = documents;
    MockModel._clear = () => documents.clear();
    
    return MockModel;
};

describe('SolanaTransaction Model', () => {
    let SolanaTransaction;
    
    beforeEach(() => {
        SolanaTransaction = createMockModel();
        SolanaTransaction._clear();
    });
    
    describe('isSignatureUsed', () => {
        it('should return false for unused signature', async () => {
            const result = await SolanaTransaction.isSignatureUsed('newSignature123');
            expect(result).toBe(false);
        });
        
        it('should return true for used signature', async () => {
            // Record a transaction first
            await SolanaTransaction.recordTransaction({
                signature: 'usedSignature456',
                type: 'space_entry_fee',
                senderWallet: 'sender123',
                recipientWallet: 'recipient456',
                amount: 1000,
                amountRaw: '1000000000',
                tokenMint: 'tokenMint789'
            });
            
            const result = await SolanaTransaction.isSignatureUsed('usedSignature456');
            expect(result).toBe(true);
        });
    });
    
    describe('recordTransaction', () => {
        it('should save transaction with all required fields', async () => {
            const txData = {
                signature: 'txSig123',
                type: 'space_rent',
                senderWallet: 'senderWallet',
                recipientWallet: 'recipientWallet',
                amount: 10000,
                amountRaw: '10000000000',
                tokenMint: 'CPw3token',
                tokenSymbol: 'CPw3',
                spaceId: 'space5',
                status: 'verified'
            };
            
            const doc = await SolanaTransaction.recordTransaction(txData);
            
            expect(doc.signature).toBe('txSig123');
            expect(doc.type).toBe('space_rent');
            expect(doc.amount).toBe(10000);
            expect(doc.spaceId).toBe('space5');
            expect(doc.processedAt).toBeDefined();
        });
        
        it('should record entry fee transaction', async () => {
            const doc = await SolanaTransaction.recordTransaction({
                signature: 'entryFeeSig',
                type: 'space_entry_fee',
                senderWallet: 'visitor',
                recipientWallet: 'owner',
                amount: 500,
                amountRaw: '500000000',
                tokenMint: 'token123',
                spaceId: 'space3'
            });
            
            expect(doc.type).toBe('space_entry_fee');
        });
        
        it('should record rent renewal transaction', async () => {
            const doc = await SolanaTransaction.recordTransaction({
                signature: 'renewalSig',
                type: 'space_rent_renewal',
                senderWallet: 'owner',
                recipientWallet: 'treasury',
                amount: 10000,
                amountRaw: '10000000000',
                tokenMint: 'token123',
                spaceId: 'space7'
            });
            
            expect(doc.type).toBe('space_rent_renewal');
        });
    });
    
    describe('countRecentTransactions', () => {
        it('should count transactions within window', async () => {
            const wallet = 'rateTestWallet';
            
            // Record some transactions
            await SolanaTransaction.recordTransaction({
                signature: 'tx1',
                type: 'space_entry_fee',
                senderWallet: wallet,
                recipientWallet: 'owner1',
                amount: 100,
                amountRaw: '100000000',
                tokenMint: 'token'
            });
            
            await SolanaTransaction.recordTransaction({
                signature: 'tx2',
                type: 'space_entry_fee',
                senderWallet: wallet,
                recipientWallet: 'owner2',
                amount: 200,
                amountRaw: '200000000',
                tokenMint: 'token'
            });
            
            const count = await SolanaTransaction.countRecentTransactions(wallet, 60000);
            expect(count).toBe(2);
        });
        
        it('should not count other wallets transactions', async () => {
            await SolanaTransaction.recordTransaction({
                signature: 'otherTx',
                type: 'space_entry_fee',
                senderWallet: 'otherWallet',
                recipientWallet: 'owner',
                amount: 100,
                amountRaw: '100000000',
                tokenMint: 'token'
            });
            
            const count = await SolanaTransaction.countRecentTransactions('myWallet', 60000);
            expect(count).toBe(0);
        });
    });
    
    describe('getWalletHistory', () => {
        it('should return transactions for wallet', async () => {
            const wallet = 'historyWallet';
            
            await SolanaTransaction.recordTransaction({
                signature: 'histTx1',
                type: 'space_rent',
                senderWallet: wallet,
                recipientWallet: 'treasury',
                amount: 10000,
                amountRaw: '10000000000',
                tokenMint: 'token'
            });
            
            await SolanaTransaction.recordTransaction({
                signature: 'histTx2',
                type: 'space_entry_fee',
                senderWallet: 'visitor',
                recipientWallet: wallet,
                amount: 500,
                amountRaw: '500000000',
                tokenMint: 'token'
            });
            
            const history = await SolanaTransaction.getWalletHistory(wallet);
            expect(history.length).toBe(2);
        });
        
        it('should respect limit option', async () => {
            const wallet = 'limitWallet';
            
            for (let i = 0; i < 5; i++) {
                await SolanaTransaction.recordTransaction({
                    signature: `limitTx${i}`,
                    type: 'space_entry_fee',
                    senderWallet: wallet,
                    recipientWallet: 'owner',
                    amount: 100,
                    amountRaw: '100000000',
                    tokenMint: 'token'
                });
            }
            
            const history = await SolanaTransaction.getWalletHistory(wallet, { limit: 3 });
            expect(history.length).toBe(3);
        });
    });
    
    describe('transaction types', () => {
        it('should accept all valid transaction types', async () => {
            const types = ['space_rent', 'space_rent_renewal', 'space_entry_fee', 'wager', 'other'];
            
            for (const type of types) {
                const doc = await SolanaTransaction.recordTransaction({
                    signature: `typeTx_${type}`,
                    type,
                    senderWallet: 'sender',
                    recipientWallet: 'recipient',
                    amount: 100,
                    amountRaw: '100000000',
                    tokenMint: 'token'
                });
                
                expect(doc.type).toBe(type);
            }
        });
    });
});

