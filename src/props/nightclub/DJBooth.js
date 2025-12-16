/**
 * DJBooth - DJ booth with turntables, mixer, and equipment rack
 * Features spinning records and animated LED rack
 */

import BaseProp from '../BaseProp';

class DJBooth extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.turntables = [];
        this.rackLEDs = [];
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        
        // Elevated platform
        const platformMat = this.createMaterial({ color: 0x4a4a4a, roughness: 0.7 });
        const platformGeo = new THREE.BoxGeometry(12, 0.75, 6);
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(0, 0.375, 0);
        platform.castShadow = true;
        platform.receiveShadow = true;
        this.addMesh(platform, group);
        
        // Steps up to platform
        const stepMat = this.createMaterial({ color: 0x3a3a3a });
        const stepHeights = [0.24, 0.48, 0.73];
        
        // LEFT front steps
        for (let i = 0; i < 3; i++) {
            const stepGeo = new THREE.BoxGeometry(3.5, 0.24, 1.2);
            const step = new THREE.Mesh(stepGeo, stepMat);
            step.position.set(-4.5, stepHeights[2-i] / 2, 4.2 + i * 1.2);
            step.castShadow = true;
            step.receiveShadow = true;
            this.addMesh(step, group);
        }
        
        // RIGHT front steps
        for (let i = 0; i < 3; i++) {
            const stepGeo = new THREE.BoxGeometry(3.5, 0.24, 1.2);
            const step = new THREE.Mesh(stepGeo, stepMat);
            step.position.set(4.5, stepHeights[2-i] / 2, 4.2 + i * 1.2);
            step.castShadow = true;
            step.receiveShadow = true;
            this.addMesh(step, group);
        }
        
        // DJ desk
        const deskMat = this.createMaterial({ color: 0x2a2a2a, roughness: 0.6 });
        const deskGeo = new THREE.BoxGeometry(8, 0.6, 2);
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.set(0, 1.05, 1);
        this.addMesh(desk, group);
        
        // Create turntables
        this._createTurntables(group);
        
        // Mixer
        this._createMixer(group);
        
        // Equipment rack
        this._createEquipmentRack(group);
        
        // Headphones on desk
        this._createHeadphones(group);
        
        this.setPosition(x, y, z);
        return this;
    }
    
    _createTurntables(group) {
        const THREE = this.THREE;
        const ttMat = this.createMaterial({ color: 0x1a1a1a, roughness: 0.5 });
        
        [-2.2, 2.2].forEach((xPos, idx) => {
            // Base
            const ttBaseGeo = new THREE.BoxGeometry(2, 0.2, 1.8);
            const ttBase = new THREE.Mesh(ttBaseGeo, ttMat);
            ttBase.position.set(xPos, 1.45, 1);
            this.addMesh(ttBase, group);
            
            // Platter
            const platterMat = this.createMaterial({ 
                color: 0x333333, roughness: 0.3, metalness: 0.5 
            });
            const platterGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.1, 24);
            const platter = new THREE.Mesh(platterGeo, platterMat);
            platter.position.set(xPos, 1.6, 1);
            platter.userData.isTurntable = true;
            platter.userData.turntableIndex = idx;
            this.addMesh(platter, group);
            this.turntables.push(platter);
            
            // Record on platter
            const recordMat = this.createMaterial({ color: 0x111111, roughness: 0.2 });
            const recordGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.02, 24);
            const record = new THREE.Mesh(recordGeo, recordMat);
            record.position.set(xPos, 1.65, 1);
            record.userData.isTurntable = true;
            this.addMesh(record, group);
            this.turntables.push(record);
            
            // Record label
            const labelMat = this.createMaterial({ 
                color: idx === 0 ? 0xFF0000 : 0x00FF00, roughness: 0.4 
            });
            const labelGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.025, 16);
            const label = new THREE.Mesh(labelGeo, labelMat);
            label.position.set(xPos, 1.67, 1);
            label.userData.isTurntable = true;
            this.addMesh(label, group);
            this.turntables.push(label);
            
            // Tonearm
            const armMat = this.createMaterial({ color: 0x888888, metalness: 0.8 });
            const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6);
            const arm = new THREE.Mesh(armGeo, armMat);
            arm.rotation.z = Math.PI / 4;
            arm.position.set(xPos + 0.5, 1.75, 1.3);
            this.addMesh(arm, group);
        });
    }
    
    _createMixer(group) {
        const THREE = this.THREE;
        
        const mixerMat = this.createMaterial({ color: 0x222222 });
        const mixerGeo = new THREE.BoxGeometry(1.5, 0.3, 1.2);
        const mixer = new THREE.Mesh(mixerGeo, mixerMat);
        mixer.position.set(0, 1.5, 1);
        this.addMesh(mixer, group);
        
        // Mixer knobs
        const knobMat = this.createMaterial({ color: 0xCCCCCC, metalness: 0.7 });
        for (let i = 0; i < 6; i++) {
            const knobGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8);
            const knob = new THREE.Mesh(knobGeo, knobMat);
            knob.position.set(-0.5 + i * 0.2, 1.7, 0.8);
            this.addMesh(knob, group);
        }
        
        // Faders
        for (let i = 0; i < 3; i++) {
            const faderGeo = new THREE.BoxGeometry(0.08, 0.02, 0.4);
            const fader = new THREE.Mesh(faderGeo, knobMat);
            fader.position.set(-0.3 + i * 0.3, 1.67, 1.2);
            this.addMesh(fader, group);
        }
    }
    
    _createEquipmentRack(group) {
        const THREE = this.THREE;
        
        const rackMat = this.createMaterial({ color: 0x1a1a1a });
        const rackGeo = new THREE.BoxGeometry(3, 2, 1);
        const rack = new THREE.Mesh(rackGeo, rackMat);
        rack.position.set(0, 1.75, -1.5);
        this.addMesh(rack, group);
        
        // Equipment LEDs on rack
        const ledColors = [0xFF0000, 0x00FF00, 0xFFFF00, 0x00FFFF];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 8; col++) {
                const ledMat = this.createMaterial({
                    color: ledColors[row % ledColors.length],
                    emissive: ledColors[row % ledColors.length],
                    emissiveIntensity: 0.8
                });
                const ledGeo = new THREE.BoxGeometry(0.1, 0.08, 0.05);
                const led = new THREE.Mesh(ledGeo, ledMat);
                led.position.set(-1.2 + col * 0.3, 1.0 + row * 0.4, -0.95);
                led.userData.isRackLED = true;
                led.userData.ledRow = row;
                led.userData.ledCol = col;
                this.addMesh(led, group);
                this.rackLEDs.push(led);
            }
        }
    }
    
    _createHeadphones(group) {
        const THREE = this.THREE;
        
        const hpMat = this.createMaterial({ color: 0x222222 });
        const hpBandGeo = new THREE.TorusGeometry(0.2, 0.03, 8, 16, Math.PI);
        const hpBand = new THREE.Mesh(hpBandGeo, hpMat);
        hpBand.position.set(3.2, 2.9, 1);
        hpBand.rotation.z = Math.PI / 2;
        this.addMesh(hpBand, group);
        
        // Headphone cups
        [-1, 1].forEach(side => {
            const cupGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
            const cup = new THREE.Mesh(cupGeo, hpMat);
            cup.rotation.x = Math.PI / 2;
            cup.position.set(3.2, 2.7 + side * 0.2, 1);
            this.addMesh(cup, group);
        });
    }
    
    update(time, delta) {
        const bassIntensity = Math.sin(time * 15) * 0.5 + 0.5;
        
        // Spin turntables
        this.turntables.forEach(elem => {
            if (elem.userData.isTurntable) {
                elem.rotation.y = time * 3;
            }
        });
        
        // VU meter style animation on rack LEDs
        this.rackLEDs.forEach(led => {
            const row = led.userData.ledRow;
            const col = led.userData.ledCol;
            const vuLevel = bassIntensity + Math.sin(time * 10 + col * 0.3) * 0.3;
            const threshold = (3 - row) * 0.25;
            const isLit = vuLevel > threshold;
            led.material.emissiveIntensity = isLit ? 0.9 : 0.15;
        });
    }
    
    getLandingSurfaces() {
        return [
            {
                name: 'dj_platform',
                minX: -6, maxX: 6,
                minZ: -3, maxZ: 3,
                height: 0.75
            },
            {
                name: 'dj_desk',
                minX: -4, maxX: 4,
                minZ: -1, maxZ: 1,
                height: 2.7
            }
        ];
    }
}

export default DJBooth;

