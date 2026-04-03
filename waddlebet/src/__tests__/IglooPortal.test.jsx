/**
 * IglooPortal Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import IglooPortal from '../components/IglooPortal.jsx';

// Mock the config
vi.mock('../config/solana.js', () => ({
    IGLOO_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000,
        GRACE_PERIOD_HOURS: 12
    }
}));

describe('IglooPortal', () => {
    const defaultProps = {
        portal: { targetRoom: 'igloo3' },
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
                <IglooPortal {...defaultProps} isNearby={false} />
            );
            expect(container.firstChild).toBeNull();
        });
        
        it('should not render when portal is null', () => {
            const { container } = render(
                <IglooPortal {...defaultProps} portal={null} />
            );
            expect(container.firstChild).toBeNull();
        });
        
        it('should render when nearby and portal exists', () => {
            const { container } = render(<IglooPortal {...defaultProps} />);
            expect(container.firstChild).not.toBeNull();
        });
    });
    
    describe('available igloo (not rented)', () => {
        it('should show rent info for unrented igloo', () => {
            render(
                <IglooPortal 
                    {...defaultProps} 
                    iglooData={{ isRented: false, isReserved: false }}
                />
            );
            expect(screen.getByText(/FOR RENT/i)).toBeInTheDocument();
        });
        
        it('should show VIEW DETAILS action', () => {
            render(
                <IglooPortal 
                    {...defaultProps} 
                    iglooData={{ isRented: false }}
                />
            );
            expect(screen.getByText(/VIEW DETAILS/i)).toBeInTheDocument();
        });
    });
    
    describe('owner igloo', () => {
        it('should show YOUR IGLOO for owner', () => {
            render(
                <IglooPortal 
                    {...defaultProps} 
                    walletAddress="owner123"
                    iglooData={{ 
                        isRented: true, 
                        ownerWallet: 'owner123',
                        ownerUsername: 'TestOwner'
                    }}
                />
            );
            expect(screen.getByText(/YOUR IGLOO/i)).toBeInTheDocument();
        });
    });
    
    describe('user with clearance', () => {
        it('should show VIP ACCESS when user has clearance', () => {
            render(
                <IglooPortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    iglooData={{ 
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
    
    describe('token gated igloo', () => {
        it('should show access info for token-gated access', () => {
            render(
                <IglooPortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    iglooData={{ 
                        isRented: true, 
                        ownerWallet: 'owner456',
                        accessType: 'token',
                        hasTokenGate: true,
                        tokenGate: {
                            enabled: true,
                            tokenSymbol: '$WADDLE',
                            minimumBalance: 1000
                        }
                    }}
                />
            );
            // Should show token requirement info
            const container = document.body;
            expect(container.textContent).toMatch(/TOKEN|Hold|\$WADDLE/i);
        });
    });
    
    describe('entry fee igloo', () => {
        it('should show fee info for fee-gated access', () => {
            render(
                <IglooPortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    iglooData={{ 
                        isRented: true, 
                        ownerWallet: 'owner456',
                        accessType: 'fee',
                        hasEntryFee: true,
                        entryFee: {
                            enabled: true,
                            amount: 500,
                            tokenSymbol: '$WADDLE'
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
                <IglooPortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    iglooData={{ 
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
    
    describe('public igloo', () => {
        it('should show PUBLIC for public access', () => {
            render(
                <IglooPortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    iglooData={{ 
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
    
    describe('private igloo', () => {
        it('should show PRIVATE for private access', () => {
            render(
                <IglooPortal 
                    {...defaultProps} 
                    walletAddress="visitor123"
                    iglooData={{ 
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
