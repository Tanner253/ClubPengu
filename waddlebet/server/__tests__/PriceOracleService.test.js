import { describe, it, expect, beforeEach, vi } from 'vitest';
import priceOracleService, { PEBBLES_PER_SOL_RATE } from '../services/PriceOracleService.js';

describe('PriceOracleService', () => {
    beforeEach(() => {
        priceOracleService._clearForTests();
        priceOracleService._setCacheForTests({
            solUsd: 100,
            ethUsd: 2000,
            pebbleUsd: 0.1,
            fetchedAt: Date.now(),
        });
    });

    it('defines pebble USD as solUsd / 1000', () => {
        expect(PEBBLES_PER_SOL_RATE).toBe(1000);
        const prices = { solUsd: 150, ethUsd: 3000, pebbleUsd: 0.15 };
        expect(priceOracleService.getPebbleUsd(prices)).toBe(0.15);
    });

    it('credits pebbles from ETH using USD peg math', () => {
        // eth * ethUsd * 1000 / solUsd = 0.05 * 2000 * 1000 / 100 = 1000
        const prices = { solUsd: 100, ethUsd: 2000, pebbleUsd: 0.1 };
        expect(priceOracleService.ethToPebbles(0.05, prices)).toBe(1000);
        expect(priceOracleService.ethToPebbles(0.005, prices)).toBe(100);
    });

    it('converts pebbles back to ETH with inverse FX', () => {
        const prices = { solUsd: 100, ethUsd: 2000, pebbleUsd: 0.1 };
        const eth = priceOracleService.pebblesToEth(1000, prices);
        expect(eth).toBeCloseTo(0.05, 8);
    });

    it('creates and consumes locked deposit quotes', async () => {
        const created = await priceOracleService.createDepositQuote({
            chainId: '4663',
            walletAddress: '0x4B1234567890abcdef1234567890abcdef12f974',
            targetPebbles: 1000,
        });
        expect(created.success).toBe(true);
        expect(created.quote.quoteId).toMatch(/^pq_/);
        expect(created.quote.pebbles).toBeGreaterThanOrEqual(100);
        expect(created.quote.ethAmount).toBeGreaterThan(0);

        const consumed = priceOracleService.consumeQuote(
            created.quote.quoteId,
            '0x4B1234567890abcdef1234567890abcdef12f974'
        );
        expect(consumed.success).toBe(true);

        const again = priceOracleService.consumeQuote(
            created.quote.quoteId,
            '0x4B1234567890abcdef1234567890abcdef12f974'
        );
        expect(again.success).toBe(false);
        expect(again.error).toBe('QUOTE_NOT_FOUND');
    });

    it('rejects quote for wrong wallet', async () => {
        const created = await priceOracleService.createDepositQuote({
            chainId: '4663',
            walletAddress: '0x1111111111111111111111111111111111111111',
            ethAmount: 0.01,
        });
        const consumed = priceOracleService.consumeQuote(
            created.quote.quoteId,
            '0x2222222222222222222222222222222222222222'
        );
        expect(consumed.success).toBe(false);
        expect(consumed.error).toBe('QUOTE_WALLET_MISMATCH');
    });

    it('rejects expired locked quotes', async () => {
        const created = await priceOracleService.createDepositQuote({
            chainId: '4663',
            walletAddress: '0x4B1234567890abcdef1234567890abcdef12f974',
            targetPebbles: 1000,
        });
        const quote = priceOracleService.peekQuote(created.quote.quoteId);
        quote.expiresAt = Date.now() - 1;

        const consumed = priceOracleService.consumeQuote(
            created.quote.quoteId,
            '0x4B1234567890abcdef1234567890abcdef12f974'
        );
        expect(consumed.success).toBe(false);
        expect(consumed.error).toBe('QUOTE_EXPIRED');
    });

    it('rejects stale oracle prices when refresh fails', async () => {
        priceOracleService._setCacheForTests({
            solUsd: 100,
            ethUsd: 2000,
            pebbleUsd: 0.1,
            fetchedAt: Date.now() - 10 * 60_000,
        });
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
        await expect(priceOracleService.requireFreshPrices()).rejects.toThrow();
        fetchSpy.mockRestore();
    });
});
