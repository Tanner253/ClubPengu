/**
 * SpaceOccupancySystem Tests
 * Tests for space banner sprite rendering logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../config', () => ({
    SPACE_BANNER_STYLES: [
        {
            bgGradient: ['#1a1a2e', '#16213e', '#0f3460'],
            textColor: '#ffffff',
            accentColor: '#e94560',
            titleStyle: { fill: '#ffffff', font: 'bold 14px Arial' }
        },
        {
            bgGradient: ['#2d1b69', '#1a0a3e', '#11071f'],
            textColor: '#ffffff',
            accentColor: '#9b59b6',
            titleStyle: { fill: '#ffffff', font: 'bold 14px Arial' }
        }
    ],
    SPACE_BANNER_CONTENT: [
        {
            title: 'Test Space 1',
            ticker: 'Welcome!',
            description: 'Test description'
        },
        {
            title: 'Test Space 2',
            ticker: 'Hello!',
            description: 'Another description'
        }
    ]
}));

describe('SpaceOccupancySystem', () => {
    let SpaceOccupancySystem;
    let renderSpaceBanner;
    let createSpaceOccupancySprite;
    let updateSpaceOccupancySprite;
    let mockCtx;
    let mockCanvas;
    
    beforeEach(async () => {
        // Create mock canvas context
        mockCtx = {
            createLinearGradient: vi.fn(() => ({
                addColorStop: vi.fn()
            })),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            closePath: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            arc: vi.fn(),
            ellipse: vi.fn(),
            fillText: vi.fn(),
            strokeText: vi.fn(),
            measureText: vi.fn(() => ({ width: 50 })),
            save: vi.fn(),
            restore: vi.fn(),
            clip: vi.fn(),
            drawImage: vi.fn(),
            setTransform: vi.fn(),
            clearRect: vi.fn(),
            fillRect: vi.fn(),
            roundRect: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 1,
            font: '',
            textAlign: '',
            textBaseline: '',
            shadowColor: '',
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            globalAlpha: 1,
            canvas: { width: 320, height: 96 }
        };
        
        mockCanvas = {
            getContext: vi.fn(() => mockCtx),
            width: 320,
            height: 96
        };
        
        // Mock document
        global.document = {
            createElement: vi.fn(() => mockCanvas)
        };
        
        // Mock Image
        global.Image = class {
            constructor() {
                this.onload = null;
                this.onerror = null;
            }
            set src(value) {
                setTimeout(() => this.onload?.(), 0);
            }
        };
        
        vi.resetModules();
        const module = await import('../systems/SpaceOccupancySystem.js');
        SpaceOccupancySystem = module.default;
        renderSpaceBanner = module.renderSpaceBanner;
        createSpaceOccupancySprite = module.createSpaceOccupancySprite;
        updateSpaceOccupancySprite = module.updateSpaceOccupancySprite;
    });
    
    describe('renderSpaceBanner', () => {
        it('should be exported as a function', () => {
            expect(typeof renderSpaceBanner).toBe('function');
        });
        
        it('should render banner to context', () => {
            renderSpaceBanner(mockCtx, 5, 0, null);
            
            // Should create gradient for background
            expect(mockCtx.createLinearGradient).toHaveBeenCalled();
            // Should draw shapes
            expect(mockCtx.fill).toHaveBeenCalled();
            // Should draw text
            expect(mockCtx.fillText).toHaveBeenCalled();
        });
        
        it('should render different spaces by index', () => {
            renderSpaceBanner(mockCtx, 5, 0, null);
            const firstCallCount = mockCtx.fillText.mock.calls.length;
            
            mockCtx.fillText.mockClear();
            renderSpaceBanner(mockCtx, 5, 1, null);
            
            expect(mockCtx.fillText).toHaveBeenCalled();
        });
        
        it('should render with space data', () => {
            const spaceData = {
                ownerUsername: 'TestOwner',
                accessType: 'public',
                isRented: true
            };
            
            renderSpaceBanner(mockCtx, 10, 0, spaceData);
            
            expect(mockCtx.fillText).toHaveBeenCalled();
        });
        
        it('should handle private access type', () => {
            const spaceData = {
                accessType: 'private',
                isRented: true
            };
            
            renderSpaceBanner(mockCtx, 0, 0, spaceData);
            expect(mockCtx.fill).toHaveBeenCalled();
        });
        
        it('should handle token gated access', () => {
            const spaceData = {
                accessType: 'token',
                isRented: true,
                hasTokenGate: true,
                tokenGateInfo: { tokenSymbol: 'CPw3', minimumBalance: 1000 }
            };
            
            renderSpaceBanner(mockCtx, 0, 0, spaceData);
            expect(mockCtx.fill).toHaveBeenCalled();
        });
        
        it('should handle entry fee access', () => {
            const spaceData = {
                accessType: 'fee',
                isRented: true,
                hasEntryFee: true,
                entryFeeAmount: 500
            };
            
            renderSpaceBanner(mockCtx, 0, 0, spaceData);
            expect(mockCtx.fill).toHaveBeenCalled();
        });
    });
    
    describe('createSpaceOccupancySprite', () => {
        let mockTHREE;
        
        beforeEach(() => {
            mockTHREE = {
                CanvasTexture: vi.fn(() => ({
                    needsUpdate: false
                })),
                SpriteMaterial: vi.fn(() => ({
                    map: null,
                    transparent: true
                })),
                Sprite: vi.fn(() => ({
                    scale: { set: vi.fn() },
                    position: { set: vi.fn() },
                    material: {},
                    name: '',
                    userData: {}
                }))
            };
        });
        
        it('should be exported as a function', () => {
            expect(typeof createSpaceOccupancySprite).toBe('function');
        });
        
        it('should create canvas', () => {
            createSpaceOccupancySprite(mockTHREE, 5, 0, null);
            expect(global.document.createElement).toHaveBeenCalledWith('canvas');
        });
        
        it('should create THREE.js sprite', () => {
            const sprite = createSpaceOccupancySprite(mockTHREE, 5, 0, null);
            expect(mockTHREE.Sprite).toHaveBeenCalled();
            expect(sprite).toBeDefined();
        });
        
        it('should set sprite scale', () => {
            const sprite = createSpaceOccupancySprite(mockTHREE, 5, 0, null);
            expect(sprite.scale.set).toHaveBeenCalled();
        });
    });
    
    describe('updateSpaceOccupancySprite', () => {
        let mockTHREE;
        let mockSprite;
        
        beforeEach(() => {
            mockTHREE = {
                CanvasTexture: vi.fn(() => ({
                    needsUpdate: false,
                    dispose: vi.fn()
                }))
            };
            
            mockSprite = {
                material: {
                    map: {
                        image: mockCanvas,
                        needsUpdate: false,
                        dispose: vi.fn()
                    }
                },
                scale: {
                    set: vi.fn()
                },
                userData: {
                    count: 0,
                    spaceIndex: 0
                }
            };
        });
        
        it('should be exported as a function', () => {
            expect(typeof updateSpaceOccupancySprite).toBe('function');
        });
        
        it('should call scale.set on sprite', () => {
            updateSpaceOccupancySprite(mockTHREE, mockSprite, 10, null);
            expect(mockSprite.scale.set).toHaveBeenCalled();
        });
        
        it('should not throw with valid parameters', () => {
            expect(() => {
                updateSpaceOccupancySprite(mockTHREE, mockSprite, 15, null);
            }).not.toThrow();
        });
    });
    
    describe('default export', () => {
        it('should export all functions', () => {
            expect(SpaceOccupancySystem.renderSpaceBanner).toBeDefined();
            expect(SpaceOccupancySystem.createSpaceOccupancySprite).toBeDefined();
            expect(SpaceOccupancySystem.updateSpaceOccupancySprite).toBeDefined();
        });
    });
});
