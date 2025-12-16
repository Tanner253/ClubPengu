/**
 * DiscoBall - Spinning disco ball with mirror tiles and light
 */

import BaseProp from '../BaseProp';

class DiscoBall extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.ball = null;
        this.mirrorTiles = [];
        this.discoLight = null;
        this.discoMode = false;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.userData.isDiscoBall = true;
        
        const { skipLight = false } = options;
        
        // Ball - shiny reflective surface
        const ballMat = this.createMaterial({ 
            color: 0xEEEEEE,
            metalness: 1.0,
            roughness: 0.05,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.1
        });
        const ballGeo = new THREE.SphereGeometry(0.8, 24, 24);
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.userData.isDiscoBall = true;
        this.addMesh(ball, group);
        this.ball = ball;
        
        // Mirror tiles - brighter and more emissive
        const mirrorMat = this.createMaterial({
            color: 0xFFFFFF,
            metalness: 1,
            roughness: 0,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.6
        });
        
        for (let lat = 0; lat < 8; lat++) {
            const phi = (lat / 8) * Math.PI;
            const rowRadius = Math.sin(phi) * 0.82;
            const yPos = Math.cos(phi) * 0.82;
            const tilesInRow = Math.max(4, Math.floor(16 * Math.sin(phi)));
            
            for (let lon = 0; lon < tilesInRow; lon++) {
                const theta = (lon / tilesInRow) * Math.PI * 2;
                const tileGeo = new THREE.PlaneGeometry(0.12, 0.12);
                const tile = new THREE.Mesh(tileGeo, mirrorMat.clone());
                tile.userData.isMirrorTile = true;
                tile.userData.tileIndex = lat * tilesInRow + lon;
                
                tile.position.set(
                    rowRadius * Math.cos(theta),
                    yPos,
                    rowRadius * Math.sin(theta)
                );
                tile.lookAt(0, 0, 0);
                tile.rotateY(Math.PI);
                this.addMesh(tile, group);
                this.mirrorTiles.push(tile);
            }
        }
        
        // Mount (hangs from ceiling)
        const mountGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
        const mountMat = this.createMaterial({ color: 0x333333 });
        const mount = new THREE.Mesh(mountGeo, mountMat);
        mount.position.y = 1.3;
        this.addMesh(mount, group);
        
        // Main disco ball light
        if (!skipLight) {
            const discoLight = new THREE.PointLight(0xFFFFFF, 3, 25);
            discoLight.userData.isDiscoLight = true;
            discoLight.intensity = 0; // Start off, controlled by disco mode
            this.addLight(discoLight, group);
            this.discoLight = discoLight;
        }
        
        this.setPosition(x, y, z);
        return this;
    }
    
    setDiscoMode(enabled) {
        this.discoMode = enabled;
    }
    
    update(time, delta) {
        const beatPhase = Math.sin(time * 8) * 0.5 + 0.5;
        
        // Always spin the disco ball
        if (this.group) {
            this.group.rotation.y = time * 0.8;
        }
        
        // Light and sparkle effect - controlled by disco mode
        if (this.discoLight) {
            if (this.discoMode) {
                const discoHue = (time * 0.3) % 1;
                this.discoLight.color.setHSL(discoHue, 1.0, 0.6);
                this.discoLight.intensity = 2.0 + beatPhase * 2.0;
            } else {
                this.discoLight.intensity = 0;
            }
        }
        
        // Mirror tiles sparkle effect
        this.mirrorTiles.forEach(tile => {
            if (this.discoMode) {
                const sparkle = Math.sin(time * 15 + tile.userData.tileIndex * 0.5);
                tile.material.emissiveIntensity = 0.4 + sparkle * 0.4 + beatPhase * 0.3;
                const tileHue = (time * 0.2 + tile.userData.tileIndex * 0.02) % 1;
                tile.material.emissive.setHSL(tileHue, 0.8, 0.5);
            } else {
                tile.material.emissiveIntensity = 0.05;
                tile.material.emissive.setHSL(0, 0, 0.2);
            }
        });
    }
    
    getLight() {
        return this.discoLight;
    }
}

export default DiscoBall;

