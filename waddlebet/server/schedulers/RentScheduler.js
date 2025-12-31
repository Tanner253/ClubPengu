/**
 * RentScheduler - Runs periodic checks for overdue space rentals
 * Handles grace periods and evictions
 */

import spaceService from '../services/SpaceService.js';

class RentScheduler {
    constructor() {
        this.checkInterval = null;
        this.isRunning = false;
        this.lastCheckTime = null;
        this.checksPerformed = 0;
        
        // Check every 60 seconds for responsive eviction handling
        this.intervalMs = parseInt(process.env.RENT_CHECK_INTERVAL_MS || '60000');
    }
    
    /**
     * Start the rent check scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('⏰ RentScheduler already running');
            return;
        }
        
        const intervalSec = Math.round(this.intervalMs / 1000);
        console.log(`⏰ RentScheduler started - checking every ${intervalSec} seconds`);
        this.isRunning = true;
        
        // Run immediately on start
        this.checkRentals();
        
        // Then run on interval
        this.checkInterval = setInterval(() => {
            this.checkRentals();
        }, this.intervalMs);
    }
    
    /**
     * Stop the scheduler
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        console.log('⏰ RentScheduler stopped');
    }
    
    /**
     * Run rent check
     */
    async checkRentals() {
        const startTime = Date.now();
        this.lastCheckTime = new Date();
        this.checksPerformed++;
        
        try {
            const result = await spaceService.processOverdueRentals();
            const duration = Date.now() - startTime;
            
            if (result.evictions.length > 0) {
                console.log(`⏰ Evicted ${result.evictions.length} tenants:`);
                result.evictions.forEach(e => {
                    console.log(`   - ${e.previousOwner} from ${e.spaceId}`);
                });
            }
            
            if (result.gracePeriodCount > 0) {
                console.log(`⏰ ${result.gracePeriodCount} spaces entered grace period`);
            }
            
            // Only log if something happened or every 60 checks (hourly at 60s interval)
            if (result.evictions.length > 0 || result.gracePeriodCount > 0 || this.checksPerformed % 60 === 0) {
                console.log(`⏰ Rent check #${this.checksPerformed} completed in ${duration}ms`);
            }
            
            return result;
        } catch (error) {
            console.error('⏰ RentScheduler error:', error);
            return { evictions: [], gracePeriodCount: 0, error: error.message };
        }
    }
    
    /**
     * Get scheduler stats (for health endpoint)
     */
    getStats() {
        return {
            isRunning: this.isRunning,
            intervalMs: this.intervalMs,
            checksPerformed: this.checksPerformed,
            lastCheckTime: this.lastCheckTime
        };
    }
    
    /**
     * Manual trigger for rent check (for testing)
     */
    async triggerCheck() {
        return this.checkRentals();
    }
}

// Export singleton
const rentScheduler = new RentScheduler();
export default rentScheduler;

