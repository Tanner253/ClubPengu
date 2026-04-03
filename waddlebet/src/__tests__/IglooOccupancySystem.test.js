/**
 * IglooOccupancySystem Tests
 * Tests for igloo banner sprite rendering logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config
vi.mock('../config', () => ({
    IGLOO_BANNER_STYLES: [
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
    IGLOO_BANNER_CONTENT: [
        {
            title: 'Test Igloo 1',
            ticker: 'Welcome!',
            description: 'Test description'
        },
        {
            title: 'Test Igloo 2',
            ticker: 'Hello!',
            description: 'Another description'
        }
    ]
}));

describe('IglooOccupancySystem', () => {
    let IglooOccupancySystem;
    let renderIglooBanner;
    let createIglooOccupancySprite;
    let updateIglooOccupancySprite;
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
        const module = await import('../systems/IglooOccupancySystem.js');
        IglooOccupancySystem = module.default;
        renderIglooBanner = module.renderIglooBanner;
        createIglooOccupancySprite = module.createIglooOccupancySprite;
        updateIglooOccupancySprite = module.updateIglooOccupancySprite;
    });
    
    describe('renderIglooBanner', () => {
        it('should be exported as a function', () => {
            expect(typeof renderIglooBanner).toBe('function');
        });
        
        it('should render banner to context', () => {
            renderIglooBanner(mockCtx, 5, 0, null);
            
            // Should create gradient for background
            expect(mockCtx.createLinearGradient).toHaveBeenCalled();
            // Should draw shapes
            expect(mockCtx.fill).toHaveBeenCalled();
            // Should draw text
            expect(mockCtx.fillText).toHaveBeenCalled();
        });
        
        it('should render different igloos by index', () => {
            renderIglooBanner(mockCtx, 5, 0, null);
            const firstCallCount = mockCtx.fillText.mock.calls.length;
            
            mockCtx.fillText.mockClear();
            renderIglooBanner(mockCtx, 5, 1, null);
            
            expect(mockCtx.fillText).toHaveBeenCalled();
        });
        
        it('should render with igloo data', () => {
            const iglooData = {
                ownerUsername: 'TestOwner',
                accessType: 'public',
                isRented: true
            };
            
            renderIglooBanner(mockCtx, 10, 0, iglooData);
            
            expect(mockCtx.fillText).toHaveBeenCalled();
        });
        
        it('should handle private access type', () => {
            const iglooData = {
                accessType: 'private',
                isRented: true
            };
            
            renderIglooBanner(mockCtx, 0, 0, iglooData);
            expect(mockCtx.fill).toHaveBeenCalled();
        });
        
        it('should handle token gated access', () => {
            const iglooData = {
                accessType: 'token',
                isRented: true,
                hasTokenGate: true,
                tokenGateInfo: { tokenSymbol: '$WADDLE', minimumBalance: 1000 }
            };
            
            renderIglooBanner(mockCtx, 0, 0, iglooData);
            expect(mockCtx.fill).toHaveBeenCalled();
        });
        
        it('should handle entry fee access', () => {
            const iglooData = {
                accessType: 'fee',
                isRented: true,
                hasEntryFee: true,
                entryFeeAmount: 500
            };
            
            renderIglooBanner(mockCtx, 0, 0, iglooData);
            expect(mockCtx.fill).toHaveBeenCalled();
        });
    });
    
    describe('createIglooOccupancySprite', () => {
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
            expect(typeof createIglooOccupancySprite).toBe('function');
        });
        
        it('should create canvas', () => {
            createIglooOccupancySprite(mockTHREE, 5, 0, null);
            expect(global.document.createElement).toHaveBeenCalledWith('canvas');
        });
        
        it('should create THREE.js sprite', () => {
            const sprite = createIglooOccupancySprite(mockTHREE, 5, 0, null);
            expect(mockTHREE.Sprite).toHaveBeenCalled();
            expect(sprite).toBeDefined();
        });
        
        it('should set sprite scale', () => {
            const sprite = createIglooOccupancySprite(mockTHREE, 5, 0, null);
            expect(sprite.scale.set).toHaveBeenCalled();
        });
    });
    
    describe('updateIglooOccupancySprite', () => {
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
                    iglooIndex: 0
                }
            };
        });
        
        it('should be exported as a function', () => {
            expect(typeof updateIglooOccupancySprite).toBe('function');
        });
        
        it('should call scale.set on sprite', () => {
            updateIglooOccupancySprite(mockTHREE, mockSprite, 10, null);
            expect(mockSprite.scale.set).toHaveBeenCalled();
        });
        
        it('should not throw with valid parameters', () => {
            expect(() => {
                updateIglooOccupancySprite(mockTHREE, mockSprite, 15, null);
            }).not.toThrow();
        });
    });
    
    describe('default export', () => {
        it('should export all functions', () => {
            expect(IglooOccupancySystem.renderIglooBanner).toBeDefined();
            expect(IglooOccupancySystem.createIglooOccupancySprite).toBeDefined();
            expect(IglooOccupancySystem.updateIglooOccupancySprite).toBeDefined();
        });
    });
});
