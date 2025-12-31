/**
 * Space Modal Component Tests
 * Tests SpaceRentalModal, SpaceEntryModal, and SpaceSettingsPanel components
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Create mock WebSocket
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
        simulateMessage: (msg) => {
            const event = { data: JSON.stringify(msg) };
            if (listeners['message']) {
                listeners['message'].forEach(cb => cb(event));
            }
        }
    };
};

let mockWs = createMockWebSocket();
const mockSend = vi.fn();

// Mock MultiplayerContext - must come before component imports
vi.mock('../multiplayer/MultiplayerContext.jsx', () => ({
    useMultiplayer: () => ({
        send: mockSend,
        connected: true,
        isAuthenticated: true,
        walletAddress: 'TestWallet123'
    })
}));

// Mock SpaceContext
const mockUpdateSettings = vi.fn();
vi.mock('../space/SpaceContext.jsx', () => ({
    useSpace: () => ({
        updateSettings: mockUpdateSettings,
        isLoading: false
    })
}));

// Mock config
vi.mock('../config/solana.js', () => ({
    CPW3_TOKEN_ADDRESS: 'CPw3TEST',
    RENT_WALLET_ADDRESS: 'RentWallet123',
    SPACE_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000,
        GRACE_PERIOD_HOURS: 12,
        RESERVED_SPACE_IDS: []
    }
}));

// Mock roomConfig for banner styles
vi.mock('../config/roomConfig.js', () => ({
    SPACE_BANNER_STYLES: [
        { bgGradient: ['#1a1a2e', '#16213e', '#0f3460'], textColor: '#fff', accentColor: '#0ff' },
        { bgGradient: ['#2d132c', '#801336', '#ee4540'], textColor: '#fff', accentColor: '#ff0' },
        { bgGradient: ['#1d2951', '#0d1b2a', '#1b263b'], textColor: '#fff', accentColor: '#0f0' },
        { bgGradient: ['#3c1642', '#086375', '#1dd3b0'], textColor: '#fff', accentColor: '#fff' }
    ]
}));

// Import components after mocks are set up
import SpaceRentalModal from '../components/SpaceRentalModal.jsx';
import SpaceEntryModal from '../components/SpaceEntryModal.jsx';
import SpaceSettingsPanel from '../components/SpaceSettingsPanel.jsx';

// ==================== RENTAL MODAL TESTS ====================
describe('SpaceRentalModal', () => {
    const mockOnClose = vi.fn();
    const mockOnRentSuccess = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockWs = createMockWebSocket();
        window.__multiplayerWs = mockWs;
    });
    
    afterEach(() => {
        delete window.__multiplayerWs;
    });
    
    it('should render rental information when open', () => {
        render(
            <SpaceRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Space 1/i)).toBeInTheDocument();
        expect(screen.getByText(/Rental Agreement/i)).toBeInTheDocument();
    });
    
    it('should show available status for unrented space', () => {
        render(
            <SpaceRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Available for Rent/i)).toBeInTheDocument();
    });
    
    it('should show rented status when space is rented', () => {
        render(
            <SpaceRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ 
                    spaceId: 'space1', 
                    isRented: true, 
                    ownerUsername: 'SomeOwner' 
                }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Currently Rented/i)).toBeInTheDocument();
        expect(screen.getByText(/SomeOwner/i)).toBeInTheDocument();
    });
    
    it('should close modal on close button click', () => {
        render(
            <SpaceRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        // Find close button (×)
        const closeButton = screen.getByText('×');
        fireEvent.click(closeButton);
        
        expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should show rent cost information', () => {
        render(
            <SpaceRentalModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        // Should show daily rent cost - use more specific selector
        expect(screen.getByText('Daily Rent:')).toBeInTheDocument();
        // The cost appears in both the details and the rent button
        expect(screen.getAllByText(/10,000/i).length).toBeGreaterThanOrEqual(1);
    });
    
    it('should not render when closed', () => {
        const { container } = render(
            <SpaceRentalModal 
                isOpen={false}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1', isRented: false }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(container.firstChild).toBeNull();
    });
});

// ==================== ENTRY MODAL TESTS ====================
describe('SpaceEntryModal', () => {
    const mockOnClose = vi.fn();
    const mockOnEntrySuccess = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        mockWs = createMockWebSocket();
        window.__multiplayerWs = mockWs;
    });
    
    afterEach(() => {
        delete window.__multiplayerWs;
    });
    
    it('should show locked message for private space', () => {
        render(
            <SpaceEntryModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1', ownerUsername: 'SomeOwner' }}
                entryCheck={{
                    canEnter: false,
                    reason: 'SPACE_LOCKED',
                    message: 'This space is private'
                }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Space Locked/i)).toBeInTheDocument();
        expect(screen.getByText(/private/i)).toBeInTheDocument();
    });
    
    it('should show token requirement for token-gated space', () => {
        render(
            <SpaceEntryModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1', ownerUsername: 'SomeOwner' }}
                entryCheck={{
                    canEnter: false,
                    reason: 'TOKEN_REQUIRED',
                    tokenRequired: { symbol: '$COOL', minimum: 1000, address: 'Token123' }
                }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Token Required/i)).toBeInTheDocument();
        expect(screen.getByText(/\$COOL/i)).toBeInTheDocument();
    });
    
    it('should show entry fee payment option', () => {
        render(
            <SpaceEntryModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ 
                    spaceId: 'space1', 
                    ownerUsername: 'SomeOwner',
                    ownerWallet: 'OwnerWallet123',
                    entryFee: { tokenSymbol: '$BONK', tokenAddress: 'BonkAddr123' }
                }}
                entryCheck={{
                    canEnter: false,
                    reason: 'ENTRY_FEE_REQUIRED',
                    requiresPayment: true,
                    paymentAmount: 500
                }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(screen.getByText(/Entry Fee Required/i)).toBeInTheDocument();
        // Fee amount appears in description and button - check the button specifically
        expect(screen.getByRole('button', { name: /Pay 500 \$BONK/i })).toBeInTheDocument();
    });
    
    it('should close on close/cancel button click', () => {
        render(
            <SpaceEntryModal 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1' }}
                entryCheck={{
                    canEnter: false,
                    reason: 'SPACE_LOCKED'
                }}
                walletAddress="TestWallet123"
            />
        );
        
        const closeButton = screen.getByRole('button', { name: /Close/i });
        fireEvent.click(closeButton);
        
        expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should not render when closed', () => {
        const { container } = render(
            <SpaceEntryModal 
                isOpen={false}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1' }}
                entryCheck={{ canEnter: false, reason: 'SPACE_LOCKED' }}
                walletAddress="TestWallet123"
            />
        );
        
        expect(container.firstChild).toBeNull();
    });
});

// ==================== SETTINGS PANEL TESTS ====================
describe('SpaceSettingsPanel', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    it('should render all access type options', () => {
        render(
            <SpaceSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{
                    spaceId: 'space1',
                    accessType: 'private',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: false, amount: 0 },
                    banner: { title: '', ticker: '', shill: '' }
                }}
                onSave={mockOnSave}
            />
        );
        
        // Check access type dropdown has all options - use exact text to avoid duplicates
        expect(screen.getByText('🔒 Private (Owner Only)')).toBeInTheDocument();
        expect(screen.getByText('🌐 Public (Anyone)')).toBeInTheDocument();
        expect(screen.getByText('🪙 Token Gated')).toBeInTheDocument();
        expect(screen.getByText('💰 Entry Fee')).toBeInTheDocument();
    });
    
    it('should show token gate fields when token access selected', () => {
        render(
            <SpaceSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{
                    spaceId: 'space1',
                    accessType: 'token',
                    tokenGate: { enabled: true, tokenAddress: '', tokenSymbol: '', minimumBalance: 1 },
                    entryFee: { enabled: false, amount: 0 },
                    banner: {}
                }}
                onSave={mockOnSave}
            />
        );
        
        // Should show token gate settings section
        expect(screen.getByText(/Token Gate Settings/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Token contract address/i)).toBeInTheDocument();
    });
    
    it('should show entry fee field when fee access selected', () => {
        render(
            <SpaceSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{
                    spaceId: 'space1',
                    accessType: 'fee',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: true, amount: 500, tokenAddress: '', tokenSymbol: '' },
                    banner: {}
                }}
                onSave={mockOnSave}
            />
        );
        
        // Should show entry fee settings section
        expect(screen.getByText(/Entry Fee Settings/i)).toBeInTheDocument();
        expect(screen.getByText(/Fee Amount/i)).toBeInTheDocument();
        expect(screen.getByText(/Token Symbol/i)).toBeInTheDocument();
    });
    
    it('should have save and cancel buttons', () => {
        render(
            <SpaceSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{
                    spaceId: 'space1',
                    accessType: 'private',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: false, amount: 0 },
                    banner: { title: '', ticker: '', shill: '' }
                }}
                onSave={mockOnSave}
            />
        );
        
        expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
    
    it('should call onClose when cancel clicked', () => {
        render(
            <SpaceSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{
                    spaceId: 'space1',
                    accessType: 'private',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: false, amount: 0 },
                    banner: {}
                }}
                onSave={mockOnSave}
            />
        );
        
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        fireEvent.click(cancelButton);
        
        expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should not render when closed', () => {
        const { container } = render(
            <SpaceSettingsPanel 
                isOpen={false}
                onClose={mockOnClose}
                spaceData={{ spaceId: 'space1' }}
                onSave={mockOnSave}
            />
        );
        
        expect(container.firstChild).toBeNull();
    });
    
    it('should call updateSettings when save is clicked', () => {
        render(
            <SpaceSettingsPanel 
                isOpen={true}
                onClose={mockOnClose}
                spaceData={{
                    spaceId: 'space5',
                    accessType: 'private',
                    tokenGate: { enabled: false },
                    entryFee: { enabled: false, amount: 0 },
                    banner: { title: '', ticker: '', shill: '', styleIndex: 0 }
                }}
                onSave={mockOnSave}
            />
        );
        
        const saveButton = screen.getByRole('button', { name: /Save Settings/i });
        fireEvent.click(saveButton);
        
        // Should call the SpaceContext updateSettings function
        expect(mockUpdateSettings).toHaveBeenCalledWith('space5', expect.any(Object));
    });
});
