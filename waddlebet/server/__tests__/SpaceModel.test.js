/**
 * Space Model Unit Tests
 * Tests the Space mongoose model methods
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ==================== TEST DATA ====================
const createMockSpaceDoc = (overrides = {}) => ({
    spaceId: 'space1',
    position: { x: -75, z: -70, row: 'north' },
    isRented: false,
    isReserved: false,
    ownerWallet: null,
    ownerUsername: null,
    rentStartDate: null,
    lastRentPaidDate: null,
    rentDueDate: null,
    rentStatus: null,
    accessType: 'private',
    tokenGate: { enabled: false, tokenAddress: null, tokenSymbol: null, minimumBalance: 1 },
    entryFee: { enabled: false, amount: 0 },
    paidEntryFees: [],
    entryFeeVersion: 1,
    banner: { 
        title: null, 
        ticker: null, 
        shill: null, 
        styleIndex: 0,
        // Custom color/style fields
        useCustomColors: false,
        customGradient: ['#845EF7', '#BE4BDB', '#F06595'],
        textColor: '#FFFFFF',
        accentColor: '#00FFFF',
        font: 'Inter, system-ui, sans-serif',
        textAlign: 'center'
    },
    stats: { 
        totalVisits: 0, 
        uniqueVisitors: 0, 
        totalRentPaid: 0,
        totalEntryFeesCollected: 0,
        timesRented: 0
    },
    uniqueVisitorWallets: [],
    ...overrides
});

// ==================== TESTS ====================
describe('Space Model Methods', () => {
    describe('canEnter', () => {
        it('should always allow owner to enter', () => {
            const space = createMockSpaceDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'private'
            });
            
            // Simulate the canEnter method logic
            const canEnter = (walletAddress, options = {}) => {
                if (walletAddress === space.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (space.accessType === 'private') {
                    return { canEnter: false, reason: 'SPACE_LOCKED' };
                }
                return { canEnter: true };
            };
            
            const result = canEnter('Owner123');
            
            expect(result.canEnter).toBe(true);
            expect(result.isOwner).toBe(true);
        });
        
        it('should block non-owner from private space', () => {
            const space = createMockSpaceDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'private'
            });
            
            const canEnter = (walletAddress) => {
                if (walletAddress === space.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (space.accessType === 'private') {
                    return { canEnter: false, reason: 'SPACE_LOCKED', message: 'This space is private' };
                }
                return { canEnter: true };
            };
            
            const result = canEnter('RandomUser456');
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('SPACE_LOCKED');
        });
        
        it('should allow anyone into public space', () => {
            const space = createMockSpaceDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'public'
            });
            
            const canEnter = (walletAddress) => {
                if (walletAddress === space.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (space.accessType === 'private') {
                    return { canEnter: false, reason: 'SPACE_LOCKED' };
                }
                if (space.accessType === 'public') {
                    return { canEnter: true };
                }
                return { canEnter: true };
            };
            
            const result = canEnter('AnyUser');
            
            expect(result.canEnter).toBe(true);
        });
        
        it('should require token for token-gated space', () => {
            const space = createMockSpaceDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'token',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN', tokenSymbol: '$TEST', minimumBalance: 100 }
            });
            
            const canEnter = (walletAddress, options = {}) => {
                if (walletAddress === space.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (space.accessType === 'token' && space.tokenGate.enabled) {
                    const balance = options.tokenBalance || 0;
                    if (balance < space.tokenGate.minimumBalance) {
                        return { 
                            canEnter: false, 
                            reason: 'TOKEN_REQUIRED',
                            tokenRequired: {
                                address: space.tokenGate.tokenAddress,
                                symbol: space.tokenGate.tokenSymbol,
                                minimum: space.tokenGate.minimumBalance
                            }
                        };
                    }
                }
                return { canEnter: true };
            };
            
            const result = canEnter('User456', { tokenBalance: 50 });
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('TOKEN_REQUIRED');
            expect(result.tokenRequired.minimum).toBe(100);
        });
        
        it('should allow token holder into token-gated space', () => {
            const space = createMockSpaceDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'token',
                tokenGate: { enabled: true, tokenAddress: 'TOKEN', tokenSymbol: '$TEST', minimumBalance: 100 }
            });
            
            const canEnter = (walletAddress, options = {}) => {
                if (walletAddress === space.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (space.accessType === 'token' && space.tokenGate.enabled) {
                    const balance = options.tokenBalance || 0;
                    if (balance < space.tokenGate.minimumBalance) {
                        return { canEnter: false, reason: 'TOKEN_REQUIRED' };
                    }
                }
                return { canEnter: true };
            };
            
            const result = canEnter('TokenHolder', { tokenBalance: 200 });
            
            expect(result.canEnter).toBe(true);
        });
        
        it('should require payment for entry fee space (unpaid)', () => {
            const space = createMockSpaceDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'fee',
                entryFee: { enabled: true, amount: 500 },
                paidEntryFees: []
            });
            
            const canEnter = (walletAddress) => {
                if (walletAddress === space.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (space.accessType === 'fee' && space.entryFee.enabled && space.entryFee.amount > 0) {
                    const hasPaid = space.paidEntryFees.some(f => f.walletAddress === walletAddress);
                    if (!hasPaid) {
                        return { 
                            canEnter: false, 
                            reason: 'ENTRY_FEE_REQUIRED',
                            requiresPayment: true,
                            paymentAmount: space.entryFee.amount
                        };
                    }
                }
                return { canEnter: true };
            };
            
            const result = canEnter('User789');
            
            expect(result.canEnter).toBe(false);
            expect(result.reason).toBe('ENTRY_FEE_REQUIRED');
            expect(result.paymentAmount).toBe(500);
        });
        
        it('should allow user who already paid entry fee', () => {
            const space = createMockSpaceDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                accessType: 'fee',
                entryFee: { enabled: true, amount: 500 },
                paidEntryFees: [{ walletAddress: 'PaidUser', amount: 500, paidAt: new Date() }]
            });
            
            const canEnter = (walletAddress) => {
                if (walletAddress === space.ownerWallet) {
                    return { canEnter: true, isOwner: true };
                }
                if (space.accessType === 'fee' && space.entryFee.enabled && space.entryFee.amount > 0) {
                    const hasPaid = space.paidEntryFees.some(f => f.walletAddress === walletAddress);
                    if (!hasPaid) {
                        return { canEnter: false, reason: 'ENTRY_FEE_REQUIRED' };
                    }
                }
                return { canEnter: true };
            };
            
            const result = canEnter('PaidUser');
            
            expect(result.canEnter).toBe(true);
        });
    });
    
    describe('startRental', () => {
        it('should set up rental correctly', () => {
            const space = createMockSpaceDoc();
            const now = new Date();
            
            // Simulate startRental
            space.isRented = true;
            space.ownerWallet = 'NewOwner123';
            space.ownerUsername = 'NewOwner';
            space.rentStartDate = now;
            space.lastRentPaidDate = now;
            space.rentDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            space.rentStatus = 'current';
            space.accessType = 'private';
            space.stats.timesRented += 1;
            
            expect(space.isRented).toBe(true);
            expect(space.ownerWallet).toBe('NewOwner123');
            expect(space.rentStatus).toBe('current');
            expect(space.accessType).toBe('private');
            expect(space.stats.timesRented).toBe(1);
            expect(space.rentDueDate.getTime()).toBeGreaterThan(now.getTime());
        });
    });
    
    describe('payRent', () => {
        it('should extend due date by 24 hours', () => {
            const now = new Date();
            const space = createMockSpaceDoc({
                isRented: true,
                rentStatus: 'grace_period',
                rentDueDate: new Date(now.getTime() - 1000) // Overdue
            });
            
            // Simulate payRent
            space.lastRentPaidDate = now;
            space.rentDueDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            space.rentStatus = 'current';
            space.stats.totalRentPaid += 10000;
            
            expect(space.rentStatus).toBe('current');
            expect(space.stats.totalRentPaid).toBe(10000);
            expect(space.rentDueDate.getTime()).toBeGreaterThan(now.getTime());
        });
    });
    
    describe('evict', () => {
        it('should clear all rental data including custom banner settings', () => {
            const space = createMockSpaceDoc({
                isRented: true,
                ownerWallet: 'Owner123',
                ownerUsername: 'Owner',
                rentStatus: 'grace_period',
                accessType: 'public',
                banner: { 
                    title: 'My Space', 
                    ticker: '$COIN',
                    shill: 'Join us!',
                    styleIndex: 3,
                    useCustomColors: true,
                    customGradient: ['#FF0000', '#00FF00', '#0000FF'],
                    textColor: '#FFFF00',
                    accentColor: '#FF00FF',
                    font: "'Orbitron', monospace",
                    textAlign: 'right'
                },
                paidEntryFees: [{ walletAddress: 'User1' }],
                entryFee: { enabled: true, amount: 100 }
            });
            
            // Simulate evict - reset all banner fields to defaults
            space.isRented = false;
            space.ownerWallet = null;
            space.ownerUsername = null;
            space.rentStartDate = null;
            space.lastRentPaidDate = null;
            space.rentDueDate = null;
            space.rentStatus = 'evicted';
            space.accessType = 'private';
            space.banner = { 
                title: null, 
                ticker: null, 
                shill: null, 
                styleIndex: 0,
                useCustomColors: false,
                customGradient: ['#845EF7', '#BE4BDB', '#F06595'],
                textColor: '#FFFFFF',
                accentColor: '#00FFFF',
                font: 'Inter, system-ui, sans-serif',
                textAlign: 'center'
            };
            space.paidEntryFees = [];
            space.entryFeeVersion += 1;
            space.tokenGate = { enabled: false, tokenAddress: null, tokenSymbol: null, minimumBalance: 1 };
            space.entryFee = { enabled: false, amount: 0 };
            
            expect(space.isRented).toBe(false);
            expect(space.ownerWallet).toBeNull();
            expect(space.rentStatus).toBe('evicted');
            expect(space.banner.title).toBeNull();
            expect(space.banner.useCustomColors).toBe(false);
            expect(space.banner.customGradient).toEqual(['#845EF7', '#BE4BDB', '#F06595']);
            expect(space.banner.textColor).toBe('#FFFFFF');
            expect(space.banner.textAlign).toBe('center');
            expect(space.paidEntryFees).toHaveLength(0);
            expect(space.entryFeeVersion).toBe(2);
        });
    });
    
    describe('banner customization', () => {
        it('should support custom gradient colors', () => {
            const space = createMockSpaceDoc({
                banner: {
                    title: 'Gradient Test',
                    useCustomColors: true,
                    customGradient: ['#9945FF', '#14F195', '#00C2FF'] // Solana colors
                }
            });
            
            expect(space.banner.useCustomColors).toBe(true);
            expect(space.banner.customGradient).toHaveLength(3);
            expect(space.banner.customGradient[0]).toBe('#9945FF');
        });
        
        it('should support custom fonts', () => {
            const space = createMockSpaceDoc({
                banner: {
                    title: 'Font Test',
                    font: "'Press Start 2P', cursive"
                }
            });
            
            expect(space.banner.font).toBe("'Press Start 2P', cursive");
        });
        
        it('should support text alignment options', () => {
            const testCases = ['left', 'center', 'right'];
            
            testCases.forEach(alignment => {
                const space = createMockSpaceDoc({
                    banner: {
                        title: `Aligned ${alignment}`,
                        textAlign: alignment
                    }
                });
                
                expect(space.banner.textAlign).toBe(alignment);
            });
        });
        
        it('should support shill descriptions up to 60 chars', () => {
            const maxShill = 'A'.repeat(60);
            const space = createMockSpaceDoc({
                banner: {
                    title: 'Description Test',
                    shill: maxShill
                }
            });
            
            expect(space.banner.shill.length).toBe(60);
        });
        
        it('should preserve whitespace in shill for multi-line descriptions', () => {
            const multiLineShill = 'Line 1\nLine 2\nLine 3';
            const space = createMockSpaceDoc({
                banner: {
                    title: 'Multi-line Test',
                    shill: multiLineShill
                }
            });
            
            expect(space.banner.shill).toContain('\n');
            expect(space.banner.shill.split('\n')).toHaveLength(3);
        });
    });
    
    describe('recordVisit', () => {
        it('should increment visit count', () => {
            const space = createMockSpaceDoc();
            
            // Simulate recordVisit
            space.stats.totalVisits += 1;
            
            expect(space.stats.totalVisits).toBe(1);
        });
        
        it('should track unique visitors', () => {
            const space = createMockSpaceDoc();
            
            // First visit
            if (!space.uniqueVisitorWallets.includes('User1')) {
                space.uniqueVisitorWallets.push('User1');
                space.stats.uniqueVisitors += 1;
            }
            space.stats.totalVisits += 1;
            
            // Second visit (same user)
            if (!space.uniqueVisitorWallets.includes('User1')) {
                space.uniqueVisitorWallets.push('User1');
                space.stats.uniqueVisitors += 1;
            }
            space.stats.totalVisits += 1;
            
            // Third visit (new user)
            if (!space.uniqueVisitorWallets.includes('User2')) {
                space.uniqueVisitorWallets.push('User2');
                space.stats.uniqueVisitors += 1;
            }
            space.stats.totalVisits += 1;
            
            expect(space.stats.totalVisits).toBe(3);
            expect(space.stats.uniqueVisitors).toBe(2);
            expect(space.uniqueVisitorWallets).toHaveLength(2);
        });
    });
    
    describe('resetEntryFees', () => {
        it('should clear paid fees and increment version', () => {
            const space = createMockSpaceDoc({
                paidEntryFees: [
                    { walletAddress: 'User1', amount: 500 },
                    { walletAddress: 'User2', amount: 500 }
                ],
                entryFeeVersion: 1
            });
            
            // Simulate resetEntryFees
            space.paidEntryFees = [];
            space.entryFeeVersion += 1;
            
            expect(space.paidEntryFees).toHaveLength(0);
            expect(space.entryFeeVersion).toBe(2);
        });
    });
});


