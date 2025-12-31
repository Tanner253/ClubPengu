/**
 * SpaceDetailsPanel Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SpaceDetailsPanel from '../components/SpaceDetailsPanel.jsx';

// Mock the config
vi.mock('../config/solana.js', () => ({
    SPACE_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000,
        GRACE_PERIOD_HOURS: 12
    }
}));

describe('SpaceDetailsPanel', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        spaceData: { spaceId: 'space5' },
        onRent: vi.fn(),
        onPreview: vi.fn(),
        walletAddress: 'testWallet123'
    };
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('visibility', () => {
        it('should not render when isOpen is false', () => {
            const { container } = render(
                <SpaceDetailsPanel {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });
        
        it('should render when isOpen is true', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Space 5/i)).toBeInTheDocument();
        });
    });
    
    describe('content display', () => {
        it('should show space name from spaceId', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Space 5/i)).toBeInTheDocument();
        });
        
        it('should show Available for Rent', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Available for Rent/i)).toBeInTheDocument();
        });
        
        it('should display daily rent price', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/10,000 CPw3\/day/i)).toBeInTheDocument();
        });
        
        it('should display minimum balance requirement', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/70,000 CPw3/i)).toBeInTheDocument();
        });
        
        it('should display grace period', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/12h/i)).toBeInTheDocument();
        });
    });
    
    describe('benefits display', () => {
        it('should show 24/7 Advertising benefit', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/24\/7 Advertising/i)).toBeInTheDocument();
        });
        
        it('should show Monetization benefit', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Monetization/i)).toBeInTheDocument();
        });
        
        it('should show Token Gating benefit', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Token Gating/i)).toBeInTheDocument();
        });
        
        it('should show Full Customization benefit', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Full Customization/i)).toBeInTheDocument();
        });
        
        it('should show Community Hub benefit', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Community Hub/i)).toBeInTheDocument();
        });
        
        it('should show Visitor Analytics benefit', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Visitor Analytics/i)).toBeInTheDocument();
        });
    });
    
    describe('buttons and actions', () => {
        it('should call onRent when rent button clicked', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            
            const rentButton = screen.getByText(/I Want to Rent/i);
            fireEvent.click(rentButton);
            
            expect(defaultProps.onRent).toHaveBeenCalledTimes(1);
        });
        
        it('should call onPreview when preview button clicked', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            
            const previewButton = screen.getByText(/I Want to See Inside/i);
            fireEvent.click(previewButton);
            
            expect(defaultProps.onPreview).toHaveBeenCalledTimes(1);
        });
        
        it('should call onClose when close button clicked', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            
            // Find the × close button
            const closeButton = screen.getByText('×');
            fireEvent.click(closeButton);
            
            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });
        
        it('should call onClose when Maybe Later clicked', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            
            const laterButton = screen.getByText(/Maybe Later/i);
            fireEvent.click(laterButton);
            
            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });
        
        it('should call onClose when backdrop clicked', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            
            // Click the backdrop (the first div with bg-black/80)
            const backdrop = document.querySelector('.bg-black\\/80');
            fireEvent.click(backdrop);
            
            expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('wallet connection state', () => {
        it('should disable rent button when wallet not connected', () => {
            render(
                <SpaceDetailsPanel 
                    {...defaultProps} 
                    walletAddress={null}
                />
            );
            
            const rentButton = screen.getByText(/Connect Wallet to Rent/i);
            expect(rentButton).toBeDisabled();
        });
        
        it('should enable rent button when wallet connected', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            
            const rentButton = screen.getByText(/I Want to Rent/i);
            expect(rentButton).not.toBeDisabled();
        });
        
        it('should show connect wallet message when not connected', () => {
            render(
                <SpaceDetailsPanel 
                    {...defaultProps} 
                    walletAddress={null}
                />
            );
            
            expect(screen.getByText(/Connect Wallet to Rent/i)).toBeInTheDocument();
        });
    });
    
    describe('rental details section', () => {
        it('should show Rental Details header', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Rental Details/i)).toBeInTheDocument();
        });
        
        it('should show Daily Rent label', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Daily Rent:/i)).toBeInTheDocument();
        });
        
        it('should show Min Balance label', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Min Balance:/i)).toBeInTheDocument();
        });
        
        it('should show Grace Period label', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Grace Period:/i)).toBeInTheDocument();
        });
        
        it('should show Payment method', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/x402 Protocol/i)).toBeInTheDocument();
        });
    });
    
    describe('trust indicators', () => {
        it('should show secure payments message', () => {
            render(<SpaceDetailsPanel {...defaultProps} />);
            expect(screen.getByText(/Secure payments via x402/i)).toBeInTheDocument();
        });
    });
});

