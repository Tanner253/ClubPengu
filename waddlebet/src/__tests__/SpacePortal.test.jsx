/**
 * SpacePortal Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpacePortal from '../components/SpacePortal.jsx';

// Mock the config
vi.mock('../config/solana.js', () => ({
    SPACE_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000,
        GRACE_PERIOD_HOURS: 12
    }
}));

describe('SpacePortal', () => {
    const defaultProps = {
        portal: { targetRoom: 'space3' },
        isNearby: true,
        onEnter: vi.fn(),
        onViewDetails: vi.fn(),
        onViewRequirements: vi.fn(),
        walletAddress: null,
        isAuthenticated: false,
        userClearance: null
    };
    
    describe('visibility', () => {
        it('should not render when not nearby', () => {
            const { container } = render(
                <SpacePortal {...defaultProps} isNearby={false} />
            );
            expect(container.firstChild).toBeNull();
        });
        
        it('should not render when portal is null', () => {
            const { container } = render(
                <SpacePortal {...defaultProps} portal={null} />
            );
            expect(container.firstChild).toBeNull();
        });
        
        it('should render when nearby and portal exists', () => {
            const { container } = render(<SpacePortal {...defaultProps} />);
            expect(container.firstChild).not.toBeNull();
        });
    });
    
    describe('available space (not rented)', () => {
        it('should show rent info for unrented space', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    spaceData={{ isRented: false, isReserved: false }}
                />
            );
            expect(screen.getByText(/FOR RENT/i)).toBeInTheDocument();
        });
        
        it('should show VIEW DETAILS action', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    spaceData={{ isRented: false }}
                />
            );
            expect(screen.getByText(/VIEW DETAILS/i)).toBeInTheDocument();
        });
    });
    
    describe('owner space', () => {
        it('should show YOUR SPACE for owner', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    walletAddress="owner123"
                    spaceData={{ 
                        isRented: true, 
                        ownerWallet: 'owner123',
                        ownerUsername: 'TestOwner'
                    }}
                />
            );
            expect(screen.getByText(/YOUR SPACE/i)).toBeInTheDocument();
        });
    });
    
    describe('user with clearance', () => {
        it('should show VIP ACCESS when user has clearance', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    spaceData={{ 
                        isRented: true, 
                        ownerWallet: 'owner456',
                        accessType: 'both'
                    }}
                    userClearance={{ canEnter: true, tokenGateMet: true, entryFeePaid: true }}
                />
            );
            expect(screen.getByText(/Requirements met/i)).toBeInTheDocument();
        });
    });
    
    describe('token gated space', () => {
        it('should show access info for token-gated access', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    spaceData={{ 
                        isRented: true, 
                        ownerWallet: 'owner456',
                        accessType: 'token',
                        hasTokenGate: true,
                        tokenGate: {
                            enabled: true,
                            tokenSymbol: 'CPw3',
                            minimumBalance: 1000
                        }
                    }}
                />
            );
            // Should show token requirement info
            const container = document.body;
            expect(container.textContent).toMatch(/TOKEN|Hold|CPw3/i);
        });
    });
    
    describe('entry fee space', () => {
        it('should show fee info for fee-gated access', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    spaceData={{ 
                        isRented: true, 
                        ownerWallet: 'owner456',
                        accessType: 'fee',
                        hasEntryFee: true,
                        entryFee: {
                            enabled: true,
                            amount: 500,
                            tokenSymbol: 'CPw3'
                        }
                    }}
                />
            );
            // Should show fee requirement info
            const container = document.body;
            expect(container.textContent).toMatch(/FEE|Pay|500/i);
        });
    });
    
    describe('both requirements (token + fee)', () => {
        it('should show requirements for both access type', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    spaceData={{ 
                        isRented: true, 
                        ownerWallet: 'owner456',
                        accessType: 'both',
                        hasTokenGate: true,
                        hasEntryFee: true
                    }}
                />
            );
            // Should show requirements
            const container = document.body;
            expect(container.textContent).toMatch(/REQUIREMENTS|required/i);
        });
    });
    
    describe('public space', () => {
        it('should show PUBLIC for public access', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    spaceData={{ 
                        isRented: true, 
                        ownerWallet: 'owner456',
                        ownerUsername: 'SomeOwner',
                        accessType: 'public'
                    }}
                />
            );
            // Should show public access info
            const container = document.body;
            expect(container.textContent).toMatch(/PUBLIC|Open|SomeOwner/i);
        });
    });
    
    describe('private space', () => {
        it('should show PRIVATE for private access', () => {
            render(
                <SpacePortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    spaceData={{ 
                        isRented: true, 
                        ownerWallet: 'owner456',
                        accessType: 'private'
                    }}
                />
            );
            // Should show private access info
            const container = document.body;
            expect(container.textContent).toMatch(/PRIVATE|Owner only/i);
        });
    });
});
