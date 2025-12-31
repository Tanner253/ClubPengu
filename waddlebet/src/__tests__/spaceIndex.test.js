/**
 * Space Module Index Tests
 */

import { describe, it, expect } from 'vitest';

describe('Space Module Exports', () => {
    it('should export SpaceProvider', async () => {
        const module = await import('../space/index.js');
        expect(module.SpaceProvider).toBeDefined();
    });
    
    it('should export useSpace', async () => {
        const module = await import('../space/index.js');
        expect(module.useSpace).toBeDefined();
    });
});

