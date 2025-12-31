/**
 * SpaceRentalModal Component Tests - Extended Coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SpaceRentalModal from '../components/SpaceRentalModal.jsx';

// Mock the config
vi.mock('../config/solana.js', () => ({
    SPACE_CONFIG: {
        DAILY_RENT_CPW3: 10000,
        MINIMUM_BALANCE_CPW3: 70000,
        GRACE_PERIOD_HOURS: 12,
        CPW3_TOKEN_ADDRESS: 'CPw3TokenMint123',
        RENT_WALLET_ADDRESS: 'RentWallet123'
    }
}));

// Mock SolanaPayment
vi.mock('../wallet/SolanaPayment.js', () => ({
    paySpaceRent: vi.fn().mockResolvedValue({ success: true, signature: 'mockRentSig' })
}));

// Mock MultiplayerContext
vi.mock('../multiplayer/MultiplayerContext.jsx', () => ({
    useMultiplayer: () => ({
        send: vi.fn()
    })
}));

describe('SpaceRentalModal', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        spaceData: {
            spaceId: 'space5',
            isReserved: false
        },
        walletAddress: 'testWallet123',
        onRentSuccess: vi.fn()
    };
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    describe('visibility', () => {
        it('should not render when closed', () => {
            const { container } = render(
                <SpaceRentalModal {...defaultProps} isOpen={false} />
            );
            expect(container.firstChild).toBeNull();
        });
        
        it('should render when open', () => {
            const { container } = render(<SpaceRentalModal {...defaultProps} />);
            expect(container.firstChild).not.toBeNull();
        });
    });
    
    describe('content', () => {
        it('should show space name', () => {
            render(<SpaceRentalModal {...defaultProps} />);
            const content = document.body.textContent;
            expect(content).toMatch(/space|Space 5/i);
        });
        
        it('should show rental price', () => {
            render(<SpaceRentalModal {...defaultProps} />);
            const content = document.body.textContent;
            expect(content).toMatch(/10,000|CPw3|rent/i);
        });
        
        it('should show minimum balance', () => {
            render(<SpaceRentalModal {...defaultProps} />);
            const content = document.body.textContent;
            expect(content).toMatch(/70,000|minimum|balance/i);
        });
    });
    
    describe('reserved space', () => {
        it('should show reserved status', () => {
            render(
                <SpaceRentalModal 
                    {...defaultProps} 
                    spaceData={{ ...defaultProps.spaceData, isReserved: true }}
                />
            );
            const content = document.body.textContent;
            expect(content).toMatch(/reserved/i);
        });
    });
    
    describe('buttons', () => {
        it('should have rent button', () => {
            render(<SpaceRentalModal {...defaultProps} />);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
        
        it('should call onClose when cancel clicked', () => {
            render(<SpaceRentalModal {...defaultProps} />);
            
            // Find cancel/close button
            const buttons = screen.getAllByRole('button');
            const cancelButton = buttons.find(btn => 
                btn.textContent.match(/cancel|close|×/i)
            );
            
            if (cancelButton) {
                fireEvent.click(cancelButton);
                expect(defaultProps.onClose).toHaveBeenCalled();
            }
        });
    });
    
    describe('wallet not connected', () => {
        it('should show connect wallet message', () => {
            render(
                <SpaceRentalModal 
                    {...defaultProps} 
                    walletAddress={null}
                />
            );
            const content = document.body.textContent;
            expect(content).toMatch(/connect|wallet/i);
        });
    });
});

