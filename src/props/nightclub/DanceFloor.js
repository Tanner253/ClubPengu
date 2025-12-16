/**
 * DanceFloor - Animated LED dance floor for nightclub
 * Features colorful tiles that animate in wave patterns
 */

import BaseProp from '../BaseProp';

class DanceFloor extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.tiles = [];
        this.tileSize = 2;
        this.gap = 0.1;
        this.rows = 6;
        this.cols = 8;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        
        const { 
            rows = this.rows, 
            cols = this.cols,
            tileSize = this.tileSize,
            gap = this.gap
        } = options;
        
        this.rows = rows;
        this.cols = cols;
        this.tileSize = tileSize;
        this.gap = gap;
        
        const totalWidth = cols * (tileSize + gap);
        const totalDepth = rows * (tileSize + gap);
        const startX = -totalWidth / 2;
        const startZ = -totalDepth / 2;
        
        // Dance floor colors
        const danceColors = [
            0xFF0000, 0xFFFF00, 0x00FF00, 0x00FFFF,
            0xFF00FF, 0xFFFFFF, 0xFF6600, 0x00FF66,
        ];
        
        // Floor base (dark frame)
        const baseMat = this.createMaterial({ color: 0x1a1a1a, roughness: 0.9 });
        const baseGeo = new THREE.BoxGeometry(totalWidth + 1, 0.3, totalDepth + 1);
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(0, 0.15, 0);
        this.addMesh(base, group);
        
        // Create tiles
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const colorIdx = (row + col) % danceColors.length;
                const color = danceColors[colorIdx];
                
                const tileMat = this.createMaterial({
                    color: color,
                    emissive: color,
                    emissiveIntensity: 0.6,
                    roughness: 0.3,
                    metalness: 0.1
                });
                
                const tileGeo = new THREE.BoxGeometry(tileSize, 0.15, tileSize);
                const tile = new THREE.Mesh(tileGeo, tileMat);
                
                const tileX = startX + col * (tileSize + gap) + tileSize / 2;
                const tileZ = startZ + row * (tileSize + gap) + tileSize / 2;
                
                tile.position.set(tileX, 0.38, tileZ);
                tile.userData.isDanceFloorTile = true;
                tile.userData.tileRow = row;
                tile.userData.tileCol = col;
                tile.userData.baseColor = color;
                
                this.addMesh(tile, group);
                this.tiles.push(tile);
            }
        }
        
        this.setPosition(x, y, z);
        return this;
    }
    
    update(time, delta) {
        // Bass frequency for synchronized animations
        const bassIntensity = Math.sin(time * 15) * 0.5 + 0.5;
        
        this.tiles.forEach((tile) => {
            const row = tile.userData.tileRow;
            const col = tile.userData.tileCol;
            
            // Multiple wave patterns for complex animation
            const wave1 = Math.sin(time * 4 + row * 0.5 + col * 0.3);
            const wave2 = Math.sin(time * 3 - col * 0.4 + row * 0.2);
            const wave3 = Math.sin(time * 2 + (row + col) * 0.3);
            
            // Pulse intensity synced to bass
            const intensity = 0.5 + bassIntensity * 0.5 + wave1 * 0.3;
            tile.material.emissiveIntensity = Math.max(0.4, Math.min(1.2, intensity));
            
            // Color cycling - rainbow wave across the floor
            const hue = (time * 0.15 + row * 0.08 + col * 0.06) % 1;
            const saturation = 0.8 + wave2 * 0.2;
            const lightness = 0.4 + wave3 * 0.15;
            
            tile.material.emissive.setHSL(hue, saturation, lightness);
            tile.material.color.setHSL(hue, saturation * 0.8, lightness * 0.7);
        });
    }
    
    getTiles() {
        return this.tiles;
    }
    
    getSize() {
        const totalWidth = this.cols * (this.tileSize + this.gap);
        const totalDepth = this.rows * (this.tileSize + this.gap);
        return { width: totalWidth, depth: totalDepth };
    }
}

export default DanceFloor;

