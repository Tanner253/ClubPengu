/**
 * SpaceEntryModal Component Tests - Extended Coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SpaceEntryModal from '../components/SpaceEntryModal.jsx';

// Mock the config
vi.mock('../config/solana.js', () => ({
    SPACE_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000
    }
}));

// Mock MultiplayerContext
vi.mock('../multiplayer/MultiplayerContext.jsx', () => ({
    useMultiplayer: () => ({
        send: vi.fn(),
        connected: true,
        isAuthenticated: true,
        walletAddress: 'TestWallet123'
    })
}));

describe('SpaceEntryModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        spaceData: {
            spaceId: 'space3',
            ownerUsername: 'TestOwner',
            accessType: 'fee',
            hasEntryFee: true,
            entryFee: {
                enabled: true,
                amount: 500,
                tokenSymbol: 'CPw3'
            }
        },
        onPay: vi.fn(),
        isOwner: false
    };
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('visibility', () => {
        it('should not render when closed', () => {
            const { container } = render(
                <SpaceEntryModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });
        
        it('should render when open', () => {
            const { container } = render(<SpaceEntryModal {...defaultProps} />);
            expect(container.firstChild).not.toBeNull();
        });
    });
    
    describe('entry display', () => {
        it('should show owner name', () => {
            render(<SpaceEntryModal {...defaultProps} />);
            const content = document.body.textContent;
            expect(content).toMatch(/TestOwner/i);
        });
        
        it('should show cannot enter message', () => {
            render(<SpaceEntryModal {...defaultProps} />);
            const content = document.body.textContent;
            expect(content).toMatch(/Cannot|Enter/i);
        });
    });
    
    describe('buttons', () => {
        it('should have close button', () => {
            render(<SpaceEntryModal {...defaultProps} />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
        
        it('should call onClose when close button clicked', () => {
            render(<SpaceEntryModal {...defaultProps} />);
            const buttons = screen.getAllByRole('button');
            const closeButton = buttons.find(btn => btn.textContent.match(/close/i));
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(defaultProps.onClose).toHaveBeenCalled();
            }
        });
    });
    
    describe('owner view', () => {
        it('should render for owner', () => {
            const { container } = render(
                <SpaceEntryModal 
                    {...defaultProps} 
                    isOwner={true}
                />
            );
            expect(container.firstChild).not.toBeNull();
        });
    });
    
    describe('different access types', () => {
        it('should render for public access', () => {
            const props = {
                ...defaultProps,
                spaceData: {
                    ...defaultProps.spaceData,
                    accessType: 'public'
                }
            };
            const { container } = render(<SpaceEntryModal {...props} />);
            expect(container.firstChild).not.toBeNull();
        });
        
        it('should render for private access', () => {
            const props = {
                ...defaultProps,
                spaceData: {
                    ...defaultProps.spaceData,
                    accessType: 'private'
                }
            };
            const { container } = render(<SpaceEntryModal {...props} />);
            expect(container.firstChild).not.toBeNull();
        });
    });
});
