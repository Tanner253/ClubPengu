/**
 * RentScheduler Unit Tests
 * Tests the periodic rent checking and eviction logic
 * 
 * Run with: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock SpaceService
vi.mock('../services/SpaceService.js', () => ({
    default: {
        processOverdueRentals: vi.fn()
    }
}));

import spaceService from '../services/SpaceService.js';

// ==================== TESTS ====================
describe('RentScheduler', () => {
    let scheduler;
    
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        
        // Reset module cache to get fresh instance
        vi.resetModules();
        
        // Import fresh instance
        const module = await import('../schedulers/RentScheduler.js');
        scheduler = module.default;
    });
    
    afterEach(() => {
        if (scheduler && scheduler.isRunning) {
            scheduler.stop();
        }
        vi.useRealTimers();
    });
    
    describe('start', () => {
        it('should start the scheduler', async () => {
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [], 
                gracePeriodCount: 0 
            });
            
            scheduler.start();
            
            expect(scheduler.isRunning).toBe(true);
        });
        
        it('should run check immediately on start', async () => {
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [], 
                gracePeriodCount: 0 
            });
            
            scheduler.start();
            
            // Flush promises
            await vi.runOnlyPendingTimersAsync();
            
            expect(spaceService.processOverdueRentals).toHaveBeenCalled();
        });
        
        it('should not start twice if already running', async () => {
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [], 
                gracePeriodCount: 0 
            });
            
            scheduler.start();
            scheduler.start(); // Second call should be ignored
            
            // Should still only be one interval
            expect(scheduler.isRunning).toBe(true);
        });
    });
    
    describe('stop', () => {
        it('should stop the scheduler', async () => {
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [], 
                gracePeriodCount: 0 
            });
            
            scheduler.start();
            scheduler.stop();
            
            expect(scheduler.isRunning).toBe(false);
        });
        
        it('should clear interval when stopped', async () => {
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [], 
                gracePeriodCount: 0 
            });
            
            scheduler.start();
            expect(scheduler.checkInterval).not.toBeNull();
            
            scheduler.stop();
            expect(scheduler.checkInterval).toBeNull();
        });
    });
    
    describe('checkRentals', () => {
        it('should call processOverdueRentals on interval', async () => {
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [], 
                gracePeriodCount: 0 
            });
            
            scheduler.start();
            
            // Initial call runs synchronously before interval starts
            // So we just need to verify it was called at least once
            await vi.runOnlyPendingTimersAsync();
            const initialCalls = spaceService.processOverdueRentals.mock.calls.length;
            expect(initialCalls).toBeGreaterThanOrEqual(1);
            
            // Advance by the scheduler's interval (default 60s in updated code)
            await vi.advanceTimersByTimeAsync(scheduler.intervalMs);
            
            // Should have been called again
            expect(spaceService.processOverdueRentals).toHaveBeenCalledTimes(initialCalls + 1);
        });
        
        it('should log evictions when they occur', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [
                    { spaceId: 'space1', previousOwner: 'User1' },
                    { spaceId: 'space2', previousOwner: 'User2' }
                ], 
                gracePeriodCount: 0 
            });
            
            await scheduler.checkRentals();
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Evicted 2 tenants'));
            
            consoleSpy.mockRestore();
        });
        
        it('should log grace period entries', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [], 
                gracePeriodCount: 3 
            });
            
            await scheduler.checkRentals();
            
            expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3 spaces entered grace period'));
            
            consoleSpy.mockRestore();
        });
        
        it('should handle errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            spaceService.processOverdueRentals.mockRejectedValue(new Error('Database error'));
            
            // Should not throw, should return error result
            const result = await scheduler.checkRentals();
            expect(result).toEqual({
                evictions: [],
                gracePeriodCount: 0,
                error: 'Database error'
            });
            
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('RentScheduler error'),
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });
    });
    
    describe('triggerCheck', () => {
        it('should allow manual trigger for testing', async () => {
            spaceService.processOverdueRentals.mockResolvedValue({ 
                evictions: [], 
                gracePeriodCount: 0 
            });
            
            await scheduler.triggerCheck();
            
            expect(spaceService.processOverdueRentals).toHaveBeenCalled();
        });
    });
});

