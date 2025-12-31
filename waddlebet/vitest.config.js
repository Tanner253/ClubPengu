/**
 * Vitest Configuration for Client Tests
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        // Test environment
        environment: 'jsdom',
        
        // Test file patterns
        include: ['src/__tests__/**/*.test.{js,jsx}'],
        
        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: ['src/wallet/**/*.js', 'src/space/**/*.{js,jsx}', 'src/components/Space*.jsx', 'src/systems/SpaceOccupancySystem.js'],
            exclude: ['node_modules', 'src/__tests__'],
            thresholds: {
                lines: 45,
                functions: 45,
                branches: 45,
                statements: 45
            }
        },
        
        // Global setup
        globals: true,
        
        // Mock reset between tests
        mockReset: true,
        clearMocks: true,
        
        // Setup files
        setupFiles: ['./src/__tests__/setup.js'],
        
        // Timeout for tests
        testTimeout: 10000,
        
        // Reporter
        reporters: ['verbose']
    }
});

