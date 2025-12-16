/**
 * GiftShop - Colorful candy-themed store
 * Extracted from PropsFactory.js for maintainability
 */

import BaseBuilding from './BaseBuilding';

class GiftShop extends BaseBuilding {
    build({ w = 10, h = 6, d = 10 } = {}) {
        const THREE = this.THREE;
        const group = this.group;
        group.name = 'gift_shop_building';

        // Colors
        const wallPink = 0xFFB6C1;
        const wallWhite = 0xFFFAFA;
        const trimGold = 0xFFD700;
        const awningRed = 0xDC143C;
        const awningWhite = 0xFFFFFF;
        const doorGreen = 0x228B22;
        const windowBlue = 0x87CEEB;
        const roofBlue = 0x4A90D9;

        // Foundation
        const foundationMat = this.getMaterial(0x8B4513, { roughness: 0.9 });
        const foundationGeo = new THREE.BoxGeometry(w + 1, 0.5, d + 1);
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.y = 0.25;
        foundation.receiveShadow = true;
        group.add(foundation);

        // Main building walls
        const wallMat = this.getMaterial(wallPink, { roughness: 0.6 });
        const mainWallGeo = new THREE.BoxGeometry(w, h, d);
        const mainWall = new THREE.Mesh(mainWallGeo, wallMat);
        mainWall.position.y = h / 2 + 0.5;
        mainWall.castShadow = true;
        mainWall.receiveShadow = true;
        group.add(mainWall);

        // White corner trim
        const trimMat = this.getMaterial(wallWhite, { roughness: 0.5 });
        [
            [-w / 2 - 0.2, d / 2 + 0.2],
            [w / 2 + 0.2, d / 2 + 0.2],
            [-w / 2 - 0.2, -d / 2 - 0.2],
            [w / 2 + 0.2, -d / 2 - 0.2],
        ].forEach(([cx, cz]) => {
            const cornerGeo = new THREE.BoxGeometry(0.4, h + 0.1, 0.4);
            const corner = new THREE.Mesh(cornerGeo, trimMat);
            corner.position.set(cx, h / 2 + 0.5, cz);
            group.add(corner);
        });

        // Peaked roof
        const roofMat = this.getMaterial(roofBlue, { roughness: 0.7 });
        const roofOverhang = 1;
        const roofHeight = 2.5;
        const roofSlope = Math.atan2(roofHeight, w / 2);
        const roofPanelLength = Math.sqrt((w / 2 + roofOverhang) ** 2 + roofHeight ** 2);
        
        const leftRoofGeo = new THREE.BoxGeometry(roofPanelLength, 0.25, d + roofOverhang * 2);
        const leftRoof = new THREE.Mesh(leftRoofGeo, roofMat);
        leftRoof.rotation.z = roofSlope;
        leftRoof.position.set(-w / 4 - 0.3, h + 0.5 + roofHeight / 2, 0);
        leftRoof.castShadow = true;
        group.add(leftRoof);
        
        const rightRoofGeo = new THREE.BoxGeometry(roofPanelLength, 0.25, d + roofOverhang * 2);
        const rightRoof = new THREE.Mesh(rightRoofGeo, roofMat);
        rightRoof.rotation.z = -roofSlope;
        rightRoof.position.set(w / 4 + 0.3, h + 0.5 + roofHeight / 2, 0);
        rightRoof.castShadow = true;
        group.add(rightRoof);

        // Roof ridge cap
        const ridgeGeo = new THREE.BoxGeometry(0.4, 0.3, d + roofOverhang * 2 + 0.2);
        const ridge = new THREE.Mesh(ridgeGeo, roofMat);
        ridge.position.set(0, h + 0.5 + roofHeight + 0.1, 0);
        group.add(ridge);

        // Snow on roof ridge
        const snowMat = this.getMaterial(0xFFFFFF, { roughness: 0.8 });
        const ridgeSnowGeo = new THREE.BoxGeometry(0.6, 0.2, d + roofOverhang * 2 + 0.4);
        const ridgeSnow = new THREE.Mesh(ridgeSnowGeo, snowMat);
        ridgeSnow.position.set(0, h + 0.5 + roofHeight + 0.3, 0);
        group.add(ridgeSnow);

        // Front gable triangle
        const gableMat = this.getMaterial(wallPink, { roughness: 0.6 });
        const gableShape = new THREE.Shape();
        gableShape.moveTo(-w / 2, 0);
        gableShape.lineTo(0, roofHeight);
        gableShape.lineTo(w / 2, 0);
        gableShape.lineTo(-w / 2, 0);
        const gableGeo = new THREE.ShapeGeometry(gableShape);
        
        const frontGable = new THREE.Mesh(gableGeo, gableMat);
        frontGable.position.set(0, h + 0.5, d / 2 + 0.01);
        group.add(frontGable);
        
        const backGable = new THREE.Mesh(gableGeo, gableMat);
        backGable.rotation.y = Math.PI;
        backGable.position.set(0, h + 0.5, -d / 2 - 0.01);
        group.add(backGable);

        // Chimney
        const chimneyMat = this.getMaterial(0x8B4513, { roughness: 0.8 });
        const chimneyGeo = new THREE.BoxGeometry(1.2, 2.5, 1.2);
        const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
        chimney.position.set(w / 4, h + roofHeight + 0.5, -d / 4);
        chimney.castShadow = true;
        group.add(chimney);

        const chimneySnowGeo = new THREE.BoxGeometry(1.5, 0.3, 1.5);
        const chimneySnow = new THREE.Mesh(chimneySnowGeo, snowMat);
        chimneySnow.position.set(w / 4, h + roofHeight + 1.9, -d / 4);
        group.add(chimneySnow);

        // Striped awning
        const awningWidth = 5;
        const awningDepth = 2.5;
        const awningMat = this.getMaterial(awningRed, { roughness: 0.5 });
        const awningGeo = new THREE.BoxGeometry(awningWidth, 0.12, awningDepth);
        const awning = new THREE.Mesh(awningGeo, awningMat);
        
        for (let i = 0; i < 4; i++) {
            const stripeMat = this.getMaterial(awningWhite, { roughness: 0.5 });
            const stripeGeo = new THREE.BoxGeometry(awningWidth / 8 - 0.05, 0.02, awningDepth + 0.01);
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(-awningWidth / 2 + awningWidth / 8 + i * awningWidth / 4, 0.08, 0);
            awning.add(stripe);
        }
        
        awning.rotation.x = Math.PI / 10;
        awning.position.set(0, h - 0.3, d / 2 + 1.8);
        group.add(awning);

        // Display window
        const displayMat = this.getMaterial(windowBlue, {
            transparent: true,
            opacity: 0.7,
            emissive: 0xFFE4B5,
            emissiveIntensity: 0.2
        });
        
        const frameMat = this.getMaterial(wallWhite, { roughness: 0.5 });
        const frameGeo = new THREE.BoxGeometry(3.8, 2.8, 0.12);
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(-w / 4, 2.5, d / 2 + 0.07);
        group.add(frame);
        
        const displayGeo = new THREE.BoxGeometry(3.4, 2.4, 0.04);
        const display = new THREE.Mesh(displayGeo, displayMat);
        display.position.set(-w / 4, 2.5, d / 2 + 0.16);
        group.add(display);

        // Window dividers
        const dividerMat = this.getMaterial(wallWhite, { roughness: 0.5 });
        const vDivGeo = new THREE.BoxGeometry(0.08, 2.4, 0.05);
        const vDiv = new THREE.Mesh(vDivGeo, dividerMat);
        vDiv.position.set(-w / 4, 2.5, d / 2 + 0.2);
        group.add(vDiv);

        const hDivGeo = new THREE.BoxGeometry(3.4, 0.08, 0.05);
        const hDiv = new THREE.Mesh(hDivGeo, dividerMat);
        hDiv.position.set(-w / 4, 2.5, d / 2 + 0.2);
        group.add(hDiv);

        // Door
        const doorFrameMat = this.getMaterial(0x5C4033, { roughness: 0.7 });
        const doorFrameGeo = new THREE.BoxGeometry(2.6, 4.4, 0.1);
        const doorFrame = new THREE.Mesh(doorFrameGeo, doorFrameMat);
        doorFrame.position.set(w / 4, 2.7, d / 2 + 0.06);
        group.add(doorFrame);

        const doorMat = this.getMaterial(doorGreen, { roughness: 0.6 });
        const doorGeo = new THREE.BoxGeometry(2.2, 4, 0.08);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(w / 4, 2.5, d / 2 + 0.14);
        group.add(door);

        const doorWindowGeo = new THREE.BoxGeometry(1, 1.5, 0.04);
        const doorWindow = new THREE.Mesh(doorWindowGeo, displayMat);
        doorWindow.position.set(w / 4, 3.5, d / 2 + 0.2);
        group.add(doorWindow);

        const handleMat = this.getMaterial(trimGold, { metalness: 0.8, roughness: 0.2 });
        const handleGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(w / 4 + 0.7, 2.5, d / 2 + 0.25);
        group.add(handle);

        // Sign board
        const signBackMat = this.getMaterial(0x5C4033, { roughness: 0.7 });
        const signBackGeo = new THREE.BoxGeometry(4.2, 1.2, 0.12);
        const signBack = new THREE.Mesh(signBackGeo, signBackMat);
        signBack.position.set(0, h + 0.2, d / 2 + 0.35);
        group.add(signBack);

        const signMat = this.getMaterial(trimGold, { metalness: 0.7, roughness: 0.3 });
        const signGeo = new THREE.BoxGeometry(4, 1, 0.06);
        const signBoard = new THREE.Mesh(signGeo, signMat);
        signBoard.position.set(0, h + 0.2, d / 2 + 0.45);
        group.add(signBoard);

        // Side windows
        [-d / 3, d / 3].forEach(wz => {
            const sideFrameGeo = new THREE.BoxGeometry(0.1, 2, 1.4);
            const sideFrame = new THREE.Mesh(sideFrameGeo, frameMat);
            sideFrame.position.set(w / 2 + 0.06, 3, wz);
            group.add(sideFrame);
            
            const sideWindowGeo = new THREE.BoxGeometry(0.04, 1.7, 1.1);
            const sideWindow = new THREE.Mesh(sideWindowGeo, displayMat);
            sideWindow.position.set(w / 2 + 0.12, 3, wz);
            group.add(sideWindow);
        });

        // Gift boxes at entrance
        const giftColors = [0xFF69B4, 0x00CED1, 0xFFD700, 0x9370DB];
        giftColors.forEach((color, i) => {
            const giftMat = this.getMaterial(color, { roughness: 0.5 });
            const giftGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const gift = new THREE.Mesh(giftGeo, giftMat);
            
            const gx = -1.5 + i * 1;
            const gz = d / 2 + 3;
            gift.position.set(gx, 0.75, gz);
            gift.rotation.y = i * 0.5;
            group.add(gift);

            const ribbonMat = this.getMaterial(0xFFFFFF, { roughness: 0.4 });
            const ribbonGeo = new THREE.BoxGeometry(0.55, 0.06, 0.06);
            const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
            ribbon.position.set(gx, 1.03, gz);
            group.add(ribbon);
            
            const ribbon2Geo = new THREE.BoxGeometry(0.06, 0.06, 0.55);
            const ribbon2 = new THREE.Mesh(ribbon2Geo, ribbonMat);
            ribbon2.position.set(gx, 1.03, gz);
            group.add(ribbon2);
        });

        // Interior light
        const interiorLight = new THREE.PointLight(0xFFF8DC, 0.8, 12);
        interiorLight.position.set(0, h / 2, 0);
        group.add(interiorLight);
        this.lights.push(interiorLight);

        // Collision data
        group.userData.collision = {
            type: 'box',
            size: { x: w + 1, y: h + roofHeight + 1, z: d + 1 },
            height: h + roofHeight,
            landingSurfaces: [
                { type: 'box', minX: -w/2 - roofOverhang, maxX: 0, minZ: -d/2 - roofOverhang, maxZ: d/2 + roofOverhang, height: h + 0.5 + roofHeight * 0.6 },
                { type: 'box', minX: 0, maxX: w/2 + roofOverhang, minZ: -d/2 - roofOverhang, maxZ: d/2 + roofOverhang, height: h + 0.5 + roofHeight * 0.6 },
                { type: 'box', minX: -0.5, maxX: 0.5, minZ: -d/2 - roofOverhang, maxZ: d/2 + roofOverhang, height: h + 0.5 + roofHeight }
            ]
        };

        return group;
    }
}

/**
 * Create a Gift Shop building
 * @param {THREE} THREE - Three.js library
 * @param {Object} config - Building configuration
 * @returns {THREE.Group}
 */
export function createGiftShop(THREE, config = {}) {
    const shop = new GiftShop(THREE);
    return shop.build(config);
}

export default GiftShop;

