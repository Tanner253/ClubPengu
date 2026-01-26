/**
 * PuffleFoodVendingMachine - Vending machine for puffle food
 * Players can buy different types of food to feed their puffles
 */

import BaseProp from './BaseProp';

class PuffleFoodVendingMachine extends BaseProp {
    constructor(THREE) {
        super(THREE);
        this.screenCanvas = null;
        this.screenTexture = null;
        this.screenCtx = null;
        this.animTime = 0;
        this.selectedItem = 0;
    }
    
    spawn(scene, x, y, z, options = {}) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'puffle_food_vending';
        
        const {
            machineColor = 0x2d5a27, // Green puffle theme
            accentColor = 0xffcc00, // Gold accents
            interactionRadius = 4
        } = options;
        
        // Main body
        const machineMat = this.createMaterial({
            color: machineColor,
            roughness: 0.3,
            metalness: 0.5
        });
        
        const accentMat = this.createMaterial({
            color: accentColor,
            roughness: 0.2,
            metalness: 0.8,
            emissive: accentColor,
            emissiveIntensity: 0.3
        });
        
        // Main cabinet body
        const bodyGeo = new THREE.BoxGeometry(2, 4, 1.2);
        const body = new THREE.Mesh(bodyGeo, machineMat);
        body.position.y = 2;
        body.castShadow = true;
        body.receiveShadow = true;
        this.addMesh(body, group);
        
        // Top section (curved)
        const topGeo = new THREE.CylinderGeometry(1, 1, 0.5, 16, 1, false, 0, Math.PI);
        const top = new THREE.Mesh(topGeo, machineMat);
        top.position.set(0, 4.25, 0);
        top.rotation.x = Math.PI / 2;
        top.rotation.z = Math.PI / 2;
        this.addMesh(top, group);
        
        // Display window (glass effect)
        const glassMat = this.createMaterial({
            color: 0x88ccff,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.4
        });
        
        const glassGeo = new THREE.BoxGeometry(1.6, 2.5, 0.1);
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 2.5, 0.56);
        this.addMesh(glass, group);
        
        // Food display shelves
        const shelfMat = this.createMaterial({
            color: 0x333333,
            roughness: 0.8
        });
        
        for (let i = 0; i < 4; i++) {
            const shelfGeo = new THREE.BoxGeometry(1.5, 0.05, 0.8);
            const shelf = new THREE.Mesh(shelfGeo, shelfMat);
            shelf.position.set(0, 1.2 + i * 0.7, 0.1);
            this.addMesh(shelf, group);
        }
        
        // Food items on shelves (simple representations)
        this.createFoodDisplays(group, THREE);
        
        // Coin slot
        const slotGeo = new THREE.BoxGeometry(0.3, 0.15, 0.15);
        const slot = new THREE.Mesh(slotGeo, accentMat);
        slot.position.set(0.6, 1.5, 0.58);
        this.addMesh(slot, group);
        
        // Coin symbol
        const coinGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16);
        const coin = new THREE.Mesh(coinGeo, accentMat);
        coin.position.set(0.6, 1.5, 0.68);
        coin.rotation.x = Math.PI / 2;
        this.addMesh(coin, group);
        
        // Pickup tray
        const trayGeo = new THREE.BoxGeometry(0.8, 0.4, 0.4);
        const trayMat = this.createMaterial({ color: 0x222222, roughness: 0.9 });
        const tray = new THREE.Mesh(trayGeo, trayMat);
        tray.position.set(0, 0.5, 0.5);
        this.addMesh(tray, group);
        
        // Sign on top - "PUFFLE FOOD"
        this.createSign(group, THREE, accentColor);
        
        // Decorative puffle icon
        this.createPuffleIcon(group, THREE);
        
        // Glowing accent strips
        const stripMat = this.createMaterial({
            color: 0x00ff88,
            emissive: 0x00ff88,
            emissiveIntensity: 0.8
        });
        
        [-0.95, 0.95].forEach(xOffset => {
            const stripGeo = new THREE.BoxGeometry(0.05, 3.5, 0.05);
            const strip = new THREE.Mesh(stripGeo, stripMat);
            strip.position.set(xOffset, 2, 0.55);
            this.addMesh(strip, group);
        });
        
        // Point light for glow
        const light = new THREE.PointLight(0x00ff88, 0.5, 4);
        light.position.set(0, 2.5, 1);
        group.add(light);
        
        // Set collision bounds
        this.collisionBounds = {
            minX: -1.2,
            maxX: 1.2,
            minZ: -0.7,
            maxZ: 0.7,
            height: 4.5
        };
        
        // Set interaction trigger
        this.interactionTrigger = {
            type: 'vending_machine',
            subType: 'puffle_food',
            radius: interactionRadius,
            message: 'Press E to buy Puffle Food',
            emote: '🐾'
        };
        
        this.mesh = group;
        this.mesh.userData.propType = 'puffle_food_vending';
        
        this.setPosition(x, y, z);
        return this;
    }
    
    createFoodDisplays(group, THREE) {
        // Food colors representing different items
        const foods = [
            { color: 0xdaa520, y: 1.35 }, // Cookie
            { color: 0x4169e1, y: 2.05 }, // Fish
            { color: 0xff69b4, y: 2.75 }, // Cake
            { color: 0x9932cc, y: 3.45 }  // Gourmet
        ];
        
        foods.forEach((food, row) => {
            for (let i = 0; i < 3; i++) {
                const foodMat = this.createMaterial({
                    color: food.color,
                    roughness: 0.6
                });
                
                // Simple box representation
                const foodGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
                const foodMesh = new THREE.Mesh(foodGeo, foodMat);
                foodMesh.position.set(-0.4 + i * 0.4, food.y, 0.2);
                this.addMesh(foodMesh, group);
            }
        });
    }
    
    createSign(group, THREE, accentColor) {
        // Sign board
        const signMat = this.createMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 0.5
        });
        
        const signGeo = new THREE.BoxGeometry(1.8, 0.4, 0.1);
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 4.4, 0.6);
        this.addMesh(sign, group);
        
        // Sign text using canvas texture
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Background
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(0, 0, 256, 64);
        
        // Text
        ctx.fillStyle = '#2d5a27';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PUFFLE FOOD', 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const textMat = new THREE.MeshBasicMaterial({ 
            map: texture,
            transparent: true
        });
        
        const textGeo = new THREE.PlaneGeometry(1.7, 0.35);
        const textMesh = new THREE.Mesh(textGeo, textMat);
        textMesh.position.set(0, 4.4, 0.66);
        this.addMesh(textMesh, group);
    }
    
    createPuffleIcon(group, THREE) {
        // Simple puffle shape on front
        const puffleMat = this.createMaterial({
            color: 0x4488ff,
            emissive: 0x4488ff,
            emissiveIntensity: 0.3
        });
        
        const puffleGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const puffle = new THREE.Mesh(puffleGeo, puffleMat);
        puffle.position.set(-0.6, 1.5, 0.58);
        puffle.scale.set(1, 0.85, 1);
        this.addMesh(puffle, group);
        
        // Eyes
        const eyeMat = this.createMaterial({ color: 0xffffff });
        [-0.05, 0.05].forEach(offset => {
            const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(-0.6 + offset, 1.52, 0.75);
            this.addMesh(eye, group);
        });
    }
    
    animate(time) {
        this.animTime = time;
        
        // Could add subtle animations like blinking lights
        if (this.mesh) {
            // Find the accent strips and pulse them
            this.mesh.traverse(child => {
                if (child.material && child.material.emissive) {
                    const pulse = 0.5 + Math.sin(time * 2) * 0.3;
                    child.material.emissiveIntensity = pulse;
                }
            });
        }
    }
}

export default PuffleFoodVendingMachine;

