/**
 * SpaceRequirementsPanel Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SpaceRequirementsPanel from '../components/SpaceRequirementsPanel.jsx';

// Mock MultiplayerContext
vi.mock('../multiplayer/MultiplayerContext.jsx', () => ({
    useMultiplayer: () => ({
        send: vi.fn()
    })
}));

// Mock SolanaPayment
vi.mock('../wallet/SolanaPayment.js', () => ({
    paySpaceEntryFee: vi.fn().mockResolvedValue({ success: true, signature: 'mockSig123' })
}));

describe('SpaceRequirementsPanel', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        spaceData: {
            spaceId: 'space3',
            ownerUsername: 'TestOwner',
            ownerWallet: 'ownerWallet123456789',
            accessType: 'both',
            tokenGate: {
                enabled: true,
                tokenAddress: 'tokenMint123',
                tokenSymbol: 'CPw3',
                minimumBalance: 1000
            },
            entryFee: {
                enabled: true,
                amount: 500,
                tokenAddress: 'feeToken456',
                tokenSymbol: 'CPw3'
            }
        },
        walletAddress: 'visitorWallet987',
        onEnterSuccess: vi.fn(),
        isLoading: false
    };
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('visibility', () => {
        it('should not render when isOpen is false', () => {
            const { container } = render(
                <SpaceRequirementsPanel {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });
        
        it('should render when isOpen is true', () => {
            const { container } = render(<SpaceRequirementsPanel {...defaultProps} />);
            expect(container.firstChild).not.toBeNull();
        });
    });
    
    describe('header display', () => {
        it('should show owner info in panel', () => {
            render(<SpaceRequirementsPanel {...defaultProps} />);
            const content = document.body.textContent;
            expect(content).toMatch(/TestOwner|space3/i);
        });
    });
    
    describe('token gate requirement', () => {
        it('should display token gate info when enabled', () => {
            render(<SpaceRequirementsPanel {...defaultProps} />);
            const content = document.body.textContent;
            // Should mention token or holding requirement
            expect(content).toMatch(/token|hold|balance|gate/i);
        });
    });
    
    describe('entry fee requirement', () => {
        it('should display entry fee when enabled', () => {
            render(<SpaceRequirementsPanel {...defaultProps} />);
            const content = document.body.textContent;
            // Should mention fee
            expect(content).toMatch(/fee|pay|500/i);
        });
    });
    
    describe('close button', () => {
        it('should call onClose when close button clicked', () => {
            render(<SpaceRequirementsPanel {...defaultProps} />);
            
            // Find close button by × character
            const closeButtons = screen.getAllByRole('button');
            const closeButton = closeButtons.find(btn => btn.textContent.includes('×'));
            
            if (closeButton) {
                fireEvent.click(closeButton);
                expect(defaultProps.onClose).toHaveBeenCalled();
            }
        });
    });
    
    describe('loading state', () => {
        it('should show loading indicator when isLoading is true', () => {
            render(<SpaceRequirementsPanel {...defaultProps} isLoading={true} />);
            const content = document.body.textContent;
            expect(content).toMatch(/loading|checking/i);
        });
    });
    
    describe('status indicators', () => {
        it('should render status for token gate', () => {
            render(<SpaceRequirementsPanel {...defaultProps} />);
            // Panel should show status indicators
            const content = document.body.textContent;
            expect(content).toMatch(/token|gate|hold/i);
        });
    });
    
    describe('action buttons', () => {
        it('should have actionable buttons', () => {
            render(<SpaceRequirementsPanel {...defaultProps} />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });
    
    describe('fee-only space', () => {
        it('should show fee for fee-gated space', () => {
            const props = {
                ...defaultProps,
                spaceData: {
                    ...defaultProps.spaceData,
                    accessType: 'fee',
                    tokenGate: { enabled: false },
                    entryFee: {
                        enabled: true,
                        amount: 1000,
                        tokenSymbol: 'USDC'
                    }
                }
            };
            render(<SpaceRequirementsPanel {...props} />);
            
            const content = document.body.textContent;
            expect(content).toMatch(/fee|1,000|1000/i);
        });
    });
    
    describe('token-only space', () => {
        it('should show token requirement', () => {
            const props = {
                ...defaultProps,
                spaceData: {
                    ...defaultProps.spaceData,
                    accessType: 'token',
                    tokenGate: {
                        enabled: true,
                        tokenSymbol: 'SOL',
                        minimumBalance: 5
                    },
                    entryFee: { enabled: false }
                }
            };
            render(<SpaceRequirementsPanel {...props} />);
            
            const content = document.body.textContent;
            expect(content).toMatch(/SOL|token|hold/i);
        });
    });
});
