/**
 * Vitest Configuration for Server Tests
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const serverRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    // Keep Vite from walking up to waddlebet/postcss.config.js (needs tailwindcss).
    root: serverRoot,
    css: {
        postcss: false,
    },
    test: {
        // Test environment
        environment: 'node',
        
        // Test file patterns
        include: ['__tests__/**/*.test.js'],
        
        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov', 'json-summary'],
            include: ['services/**/*.js', 'db/models/**/*.js', 'handlers/**/*.js', 'schedulers/**/*.js'],
            exclude: ['node_modules', '__tests__'],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 60,
                statements: 70
            }
        },
        
        // Global setup
        globals: true,
        
        // Setup files
        setupFiles: ['./__tests__/setup.js'],
        
        // Mock reset between tests
        mockReset: true,
        clearMocks: true,
        
        // Timeout for tests
        testTimeout: 10000,
        
        // Reporter
        reporters: ['verbose']
    }
});

