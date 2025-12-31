/**
 * SpaceContext Unit Tests
 * Tests client-side space state management
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mock send function
const mockSend = vi.fn();

// Create a mock WebSocket with event listener support
const createMockWebSocket = () => {
    const listeners = {};
    return {
        addEventListener: vi.fn((type, callback) => {
            if (!listeners[type]) listeners[type] = [];
            listeners[type].push(callback);
        }),
        removeEventListener: vi.fn((type, callback) => {
            if (listeners[type]) {
                listeners[type] = listeners[type].filter(cb => cb !== callback);
            }
        }),
        dispatchEvent: (event) => {
            const type = event.type || 'message';
            if (listeners[type]) {
                listeners[type].forEach(cb => cb(event));
            }
        },
        // Helper to simulate server message
        simulateMessage: (msg) => {
            const event = { data: JSON.stringify(msg) };
            if (listeners['message']) {
                listeners['message'].forEach(cb => cb(event));
            }
        }
    };
};

let mockWs = createMockWebSocket();

// Mock MultiplayerContext
vi.mock('../multiplayer/MultiplayerContext.jsx', () => ({
    useMultiplayer: () => ({
        send: mockSend,
        connected: true,
        isAuthenticated: true,
        walletAddress: 'TestWallet123'
    })
}));

// Mock config
vi.mock('../config/solana.js', () => ({
    SPACE_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000,
        GRACE_PERIOD_HOURS: 12,
        RESERVED_SPACE_IDS: ['space3', 'space8'],
        RENTABLE_SPACES: ['space1', 'space2', 'space4', 'space5', 'space6', 'space7', 'space9', 'space10']
    }
}));

import { SpaceProvider, useSpace } from '../space/SpaceContext.jsx';

// ==================== HELPER ====================
const wrapper = ({ children }) => <SpaceProvider>{children}</SpaceProvider>;

// ==================== TESTS ====================
describe('SpaceContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock WebSocket
        mockWs = createMockWebSocket();
        window.__multiplayerWs = mockWs;
    });
    
    afterEach(() => {
        delete window.__multiplayerWs;
    });
    
    describe('initialization', () => {
        it('should request space list on mount', async () => {
            renderHook(() => useSpace(), { wrapper });
            
            // Wait for the useEffect to run
            await waitFor(() => {
                expect(mockSend).toHaveBeenCalledWith({ type: 'space_list' });
            });
        });
        
        it('should request user rentals when authenticated', async () => {
            renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockSend).toHaveBeenCalledWith({ type: 'space_my_rentals' });
            });
        });
    });
    
    describe('spaces state', () => {
        it('should update spaces when server responds', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            // Wait for WebSocket to be set up
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            // Simulate server response
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_list',
                    spaces: [
                        { spaceId: 'space1', isRented: false },
                        { spaceId: 'space2', isRented: true, ownerUsername: 'TestOwner' }
                    ]
                });
            });
            
            await waitFor(() => {
                expect(result.current.spaces).toHaveLength(2);
            });
            expect(result.current.spaces[0].spaceId).toBe('space1');
        });
        
        it('should update myRentals when server responds', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_my_rentals',
                    spaces: [
                        { spaceId: 'space5', ownerWallet: 'TestWallet123' }
                    ]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            expect(result.current.myRentals[0].spaceId).toBe('space5');
        });
    });
    
    describe('getSpace', () => {
        it('should return space by id', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_list',
                    spaces: [
                        { spaceId: 'space1', isRented: false },
                        { spaceId: 'space2', isRented: true }
                    ]
                });
            });
            
            await waitFor(() => {
                expect(result.current.spaces).toHaveLength(2);
            });
            
            const space = result.current.getSpace('space2');
            
            expect(space).toBeDefined();
            expect(space.spaceId).toBe('space2');
            expect(space.isRented).toBe(true);
        });
        
        it('should return undefined for non-existent space', () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            const space = result.current.getSpace('space99');
            
            expect(space).toBeUndefined();
        });
    });
    
    describe('isOwner', () => {
        it('should return true when user owns space', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_my_rentals',
                    spaces: [{ spaceId: 'space5' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            
            expect(result.current.isOwner('space5')).toBe(true);
        });
        
        it('should return false when user does not own space', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_my_rentals',
                    spaces: [{ spaceId: 'space5' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            
            expect(result.current.isOwner('space1')).toBe(false);
        });
        
        it('should return true when wallet matches space owner in spaces list', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_list',
                    spaces: [{ spaceId: 'space3', ownerWallet: 'TestWallet123' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.spaces).toHaveLength(1);
            });
            
            // Should return true because walletAddress matches ownerWallet
            expect(result.current.isOwner('space3')).toBe(true);
        });
    });
    
    describe('openRentalModal', () => {
        it('should set selected space and request can_rent', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_list',
                    spaces: [{ spaceId: 'space1', isRented: false }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.spaces).toHaveLength(1);
            });
            
            act(() => {
                result.current.openRentalModal('space1');
            });
            
            expect(result.current.showRentalModal).toBe(true);
            expect(mockSend).toHaveBeenCalledWith({ type: 'space_can_rent', spaceId: 'space1' });
        });
    });
    
    describe('openSettingsPanel', () => {
        it('should set selected space and request owner_info', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_my_rentals',
                    spaces: [{ spaceId: 'space5' }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.myRentals).toHaveLength(1);
            });
            
            act(() => {
                result.current.openSettingsPanel('space5');
            });
            
            expect(result.current.showSettingsPanel).toBe(true);
            expect(mockSend).toHaveBeenCalledWith({ type: 'space_owner_info', spaceId: 'space5' });
        });
    });
    
    describe('updateSettings', () => {
        it('should send settings update to server', () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            act(() => {
                result.current.updateSettings('space5', {
                    accessType: 'public',
                    banner: { title: 'My Space' }
                });
            });
            
            expect(mockSend).toHaveBeenCalledWith({
                type: 'space_update_settings',
                spaceId: 'space5',
                settings: {
                    accessType: 'public',
                    banner: { title: 'My Space' }
                }
            });
        });
    });
    
    describe('getBannerInfo', () => {
        it('should return banner info for space', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_list',
                    spaces: [{
                        spaceId: 'space1',
                        isRented: true,
                        ownerUsername: 'CoolOwner',
                        accessType: 'public',
                        banner: { title: 'Cool Space', ticker: '$COOL' },
                        hasEntryFee: false,
                        hasTokenGate: false
                    }]
                });
            });
            
            await waitFor(() => {
                expect(result.current.spaces).toHaveLength(1);
            });
            
            const bannerInfo = result.current.getBannerInfo('space1');
            
            expect(bannerInfo).toBeDefined();
            expect(bannerInfo.title).toBe('Cool Space');
            expect(bannerInfo.ticker).toBe('$COOL');
            expect(bannerInfo.ownerUsername).toBe('CoolOwner');
            expect(bannerInfo.accessType).toBe('public');
        });
        
        it('should return null for non-existent space', () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            const bannerInfo = result.current.getBannerInfo('space99');
            
            expect(bannerInfo).toBeNull();
        });
    });
    
    describe('entry check flow', () => {
        it('should show requirements panel when entry is blocked', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_can_enter',
                    spaceId: 'space7',
                    space: { spaceId: 'space7', ownerUsername: 'SomeOwner' },
                    canEnter: false,
                    reason: 'ENTRY_FEE_REQUIRED',
                    requiresPayment: true,
                    paymentAmount: 500,
                    isOwner: false
                });
            });
            
            await waitFor(() => {
                expect(result.current.showRequirementsPanel).toBe(true);
            });
            expect(result.current.entryCheckResult.reason).toBe('ENTRY_FEE_REQUIRED');
            expect(result.current.entryCheckResult.paymentAmount).toBe(500);
        });
        
        it('should not show modal when entry is allowed', async () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            await waitFor(() => {
                expect(mockWs.addEventListener).toHaveBeenCalled();
            });
            
            act(() => {
                mockWs.simulateMessage({
                    type: 'space_can_enter',
                    spaceId: 'space1',
                    space: { spaceId: 'space1' },
                    canEnter: true,
                    isOwner: false
                });
            });
            
            // Wait a tick for any potential state updates
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Should not show requirements panel when entry is allowed
            expect(result.current.showRequirementsPanel).toBe(false);
        });
    });
    
    describe('config', () => {
        it('should expose space config', () => {
            const { result } = renderHook(() => useSpace(), { wrapper });
            
            expect(result.current.config).toBeDefined();
            expect(result.current.config.DAILY_RENT_CPW3).toBe(10000);
            expect(result.current.config.MINIMUM_BALANCE_CPW3).toBe(70000);
            expect(result.current.config.GRACE_PERIOD_HOURS).toBe(12);
        });
    });
});
