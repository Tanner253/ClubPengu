/**
 * SkatePark - Skate park with solid half pipes, rails, ramps
 * All ramps have proper solid backs and sides
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

class SkatePark extends BaseProp {
    constructor(THREE, config = {}) {
        super(THREE);
        this.matManager = getMaterialManager(THREE);
        this.parkWidth = config.width || 30;
        this.parkDepth = config.depth || 25;
        this.withLights = config.withLights !== false;
        this.colliders = [];
    }
    
    /**
     * Create a SOLID quarter pipe with filled back and sides
     */
    _createSolidQuarterPipe(x, z, width, height, rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'quarter_pipe';
        
        const concreteMat = this.matManager.get(0x606060, { roughness: 0.85, doubleSided: true });
        const darkConcreteMat = this.matManager.get(0x505050, { roughness: 0.9, doubleSided: true });
        const copingMat = this.matManager.get(0xc0c0c0, { roughness: 0.2, metalness: 0.9 });
        
        const curveRadius = height * 1.1;
        const segments = 16;
        const thickness = 0.3; // Ramp surface thickness
        
        // Create the curved ramp surface (using thick segments)
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * (Math.PI / 2);
            const angle2 = ((i + 1) / segments) * (Math.PI / 2);
            
            const z1 = Math.sin(angle1) * curveRadius;
            const z2 = Math.sin(angle2) * curveRadius;
            const y1 = (1 - Math.cos(angle1)) * curveRadius;
            const y2 = (1 - Math.cos(angle2)) * curveRadius;
            
            const segLength = Math.sqrt(Math.pow(z2 - z1, 2) + Math.pow(y2 - y1, 2));
            const segAngle = Math.atan2(y2 - y1, z2 - z1);
            
            // Thicker segments for solid appearance
            const segGeo = new THREE.BoxGeometry(width, thickness, segLength + 0.02);
            const seg = new THREE.Mesh(segGeo, concreteMat);
            seg.position.set(0, (y1 + y2) / 2, (z1 + z2) / 2);
            seg.rotation.x = -segAngle;
            seg.castShadow = true;
            seg.receiveShadow = true;
            group.add(seg);
        }
        
        // SOLID BACK WALL - fills the entire back of the ramp
        const backWallGeo = new THREE.BoxGeometry(width, height + 0.5, thickness * 2);
        const backWall = new THREE.Mesh(backWallGeo, darkConcreteMat);
        backWall.position.set(0, (height + 0.5) / 2, curveRadius + thickness);
        backWall.castShadow = true;
        backWall.receiveShadow = true;
        group.add(backWall);
        
        // SOLID SIDE WALLS - triangular fill for each side
        const sideShape = new THREE.Shape();
        sideShape.moveTo(0, 0);
        // Trace the curve
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * (Math.PI / 2);
            const sz = Math.sin(angle) * curveRadius;
            const sy = (1 - Math.cos(angle)) * curveRadius;
            sideShape.lineTo(sz, sy);
        }
        // Close to back wall and down
        sideShape.lineTo(curveRadius + thickness, height + 0.5);
        sideShape.lineTo(curveRadius + thickness, 0);
        sideShape.lineTo(0, 0);
        
        const sideGeo = new THREE.ExtrudeGeometry(sideShape, { 
            depth: thickness * 1.5, 
            bevelEnabled: false 
        });
        
        // Left side wall
        const leftSide = new THREE.Mesh(sideGeo, darkConcreteMat);
        leftSide.rotation.y = Math.PI / 2;
        leftSide.position.set(-width / 2 - thickness * 0.75, 0, 0);
        leftSide.castShadow = true;
        group.add(leftSide);
        
        // Right side wall
        const rightSide = new THREE.Mesh(sideGeo, darkConcreteMat);
        rightSide.rotation.y = Math.PI / 2;
        rightSide.position.set(width / 2 + thickness * 0.75, 0, 0);
        rightSide.castShadow = true;
        group.add(rightSide);
        
        // Platform at top
        const platGeo = new THREE.BoxGeometry(width + thickness * 3, thickness, 1.5);
        const plat = new THREE.Mesh(platGeo, concreteMat);
        plat.position.set(0, height + thickness / 2, curveRadius + 0.75);
        plat.castShadow = true;
        plat.receiveShadow = true;
        group.add(plat);
        
        // Coping (metal edge)
        const copingGeo = new THREE.CylinderGeometry(0.08, 0.08, width + 0.2, 8);
        const coping = new THREE.Mesh(copingGeo, copingMat);
        coping.rotation.z = Math.PI / 2;
        coping.position.set(0, height + 0.08, curveRadius);
        coping.castShadow = true;
        group.add(coping);
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        
        this.colliders.push({
            type: 'quarterpipe',
            x, z, width: width + 1, depth: curveRadius + 2, height, rotation
        });
        
        return group;
    }
    
    /**
     * Create a SOLID half pipe (two quarter pipes facing each other with flat bottom)
     */
    _createSolidHalfPipe(x, z, width, height, length, rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'half_pipe';
        
        const concreteMat = this.matManager.get(0x5a5a5a, { roughness: 0.85, doubleSided: true });
        const darkMat = this.matManager.get(0x454545, { roughness: 0.9, doubleSided: true });
        const copingMat = this.matManager.get(0xb0b0b0, { roughness: 0.2, metalness: 0.9 });
        
        const curveRadius = height * 1.0;
        const segments = 12;
        const thickness = 0.35;
        const halfWidth = width / 2;
        
        // LEFT SIDE CURVE
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * (Math.PI / 2);
            const angle2 = ((i + 1) / segments) * (Math.PI / 2);
            
            const x1 = -halfWidth - Math.sin(angle1) * curveRadius;
            const x2 = -halfWidth - Math.sin(angle2) * curveRadius;
            const y1 = (1 - Math.cos(angle1)) * curveRadius;
            const y2 = (1 - Math.cos(angle2)) * curveRadius;
            
            const segLen = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            const segAng = Math.atan2(y2 - y1, x2 - x1);
            
            const segGeo = new THREE.BoxGeometry(segLen + 0.02, thickness, length);
            const seg = new THREE.Mesh(segGeo, concreteMat);
            seg.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
            seg.rotation.z = segAng;
            seg.castShadow = true;
            seg.receiveShadow = true;
            group.add(seg);
        }
        
        // RIGHT SIDE CURVE (mirrored - angle needs to be negated)
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * (Math.PI / 2);
            const angle2 = ((i + 1) / segments) * (Math.PI / 2);
            
            const x1 = halfWidth + Math.sin(angle1) * curveRadius;
            const x2 = halfWidth + Math.sin(angle2) * curveRadius;
            const y1 = (1 - Math.cos(angle1)) * curveRadius;
            const y2 = (1 - Math.cos(angle2)) * curveRadius;
            
            const segLen = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
            // Negate the angle for the right side (curve goes opposite direction)
            const segAng = -Math.atan2(y2 - y1, x2 - x1);
            
            const segGeo = new THREE.BoxGeometry(segLen + 0.02, thickness, length);
            const seg = new THREE.Mesh(segGeo, concreteMat);
            seg.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
            seg.rotation.z = segAng;
            seg.castShadow = true;
            seg.receiveShadow = true;
            group.add(seg);
        }
        
        // FLAT BOTTOM
        const bottomGeo = new THREE.BoxGeometry(width, thickness, length);
        const bottom = new THREE.Mesh(bottomGeo, concreteMat);
        bottom.position.set(0, thickness / 2, 0);
        bottom.receiveShadow = true;
        group.add(bottom);
        
        // LEFT PLATFORM (top)
        const leftPlatGeo = new THREE.BoxGeometry(1.5, thickness, length);
        const leftPlat = new THREE.Mesh(leftPlatGeo, concreteMat);
        leftPlat.position.set(-halfWidth - curveRadius - 0.75, height + thickness / 2, 0);
        leftPlat.castShadow = true;
        leftPlat.receiveShadow = true;
        group.add(leftPlat);
        
        // RIGHT PLATFORM (top)
        const rightPlatGeo = new THREE.BoxGeometry(1.5, thickness, length);
        const rightPlat = new THREE.Mesh(rightPlatGeo, concreteMat);
        rightPlat.position.set(halfWidth + curveRadius + 0.75, height + thickness / 2, 0);
        rightPlat.castShadow = true;
        rightPlat.receiveShadow = true;
        group.add(rightPlat);
        
        // LEFT BACK WALL
        const leftBackGeo = new THREE.BoxGeometry(thickness, height + 0.5, length);
        const leftBack = new THREE.Mesh(leftBackGeo, darkMat);
        leftBack.position.set(-halfWidth - curveRadius - 1.5 - thickness / 2, (height + 0.5) / 2, 0);
        leftBack.castShadow = true;
        group.add(leftBack);
        
        // RIGHT BACK WALL
        const rightBackGeo = new THREE.BoxGeometry(thickness, height + 0.5, length);
        const rightBack = new THREE.Mesh(rightBackGeo, darkMat);
        rightBack.position.set(halfWidth + curveRadius + 1.5 + thickness / 2, (height + 0.5) / 2, 0);
        rightBack.castShadow = true;
        group.add(rightBack);
        
        // FRONT END WALL
        const endWallShape = new THREE.Shape();
        const totalWidth = width + curveRadius * 2 + 3;
        endWallShape.moveTo(-totalWidth / 2, 0);
        // Left curve profile
        for (let i = segments; i >= 0; i--) {
            const angle = (i / segments) * (Math.PI / 2);
            const ex = -halfWidth - Math.sin(angle) * curveRadius;
            const ey = (1 - Math.cos(angle)) * curveRadius;
            endWallShape.lineTo(ex, ey);
        }
        // Across bottom
        endWallShape.lineTo(halfWidth, 0);
        // Right curve profile
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * (Math.PI / 2);
            const ex = halfWidth + Math.sin(angle) * curveRadius;
            const ey = (1 - Math.cos(angle)) * curveRadius;
            endWallShape.lineTo(ex, ey);
        }
        // Up to top and across
        endWallShape.lineTo(totalWidth / 2, height + 0.5);
        endWallShape.lineTo(-totalWidth / 2, height + 0.5);
        endWallShape.lineTo(-totalWidth / 2, 0);
        
        const endWallGeo = new THREE.ExtrudeGeometry(endWallShape, { 
            depth: thickness, 
            bevelEnabled: false 
        });
        
        // Front end
        const frontEnd = new THREE.Mesh(endWallGeo, darkMat);
        frontEnd.position.set(0, 0, -length / 2 - thickness / 2);
        frontEnd.castShadow = true;
        group.add(frontEnd);
        
        // Back end
        const backEnd = new THREE.Mesh(endWallGeo, darkMat);
        backEnd.position.set(0, 0, length / 2 + thickness / 2);
        backEnd.castShadow = true;
        group.add(backEnd);
        
        // COPING (metal edges)
        const copingGeo = new THREE.CylinderGeometry(0.08, 0.08, length, 8);
        
        const leftCoping = new THREE.Mesh(copingGeo, copingMat);
        leftCoping.rotation.x = Math.PI / 2;
        leftCoping.position.set(-halfWidth - curveRadius, height + 0.08, 0);
        leftCoping.castShadow = true;
        group.add(leftCoping);
        
        const rightCoping = new THREE.Mesh(copingGeo, copingMat);
        rightCoping.rotation.x = Math.PI / 2;
        rightCoping.position.set(halfWidth + curveRadius, height + 0.08, 0);
        rightCoping.castShadow = true;
        group.add(rightCoping);
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        
        this.colliders.push({
            type: 'halfpipe',
            x, z, width: totalWidth, depth: length + 1, height, rotation
        });
        
        return group;
    }
    
    /**
     * Create a grind rail
     */
    _createRail(x, z, length, height, rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'grind_rail';
        
        const railMat = this.matManager.get(0xd0d0d0, { roughness: 0.15, metalness: 0.95 });
        const supportMat = this.matManager.get(0x3a3a3a, { roughness: 0.5, metalness: 0.7 });
        
        // Main rail tube
        const railGeo = new THREE.CylinderGeometry(0.07, 0.07, length, 8);
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.rotation.z = Math.PI / 2;
        rail.position.y = height;
        rail.castShadow = true;
        group.add(rail);
        
        // Support posts
        const supportCount = Math.max(2, Math.floor(length / 2.5));
        const supportGeo = new THREE.CylinderGeometry(0.05, 0.06, height, 6);
        const baseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.08, 8);
        
        for (let i = 0; i < supportCount; i++) {
            const t = supportCount === 1 ? 0 : (i / (supportCount - 1)) - 0.5;
            
            const support = new THREE.Mesh(supportGeo, supportMat);
            support.position.set(t * (length - 0.6), height / 2, 0);
            support.castShadow = true;
            group.add(support);
            
            const base = new THREE.Mesh(baseGeo, supportMat);
            base.position.set(t * (length - 0.6), 0.04, 0);
            base.castShadow = true;
            group.add(base);
        }
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        
        return group;
    }
    
    /**
     * Create a fun box / manual pad
     */
    _createFunBox(x, z, width, depth, height) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'fun_box';
        
        const concreteMat = this.matManager.get(0x5a5a5a, { roughness: 0.85, side: THREE.DoubleSide });
        const sideMat = this.matManager.get(0x4a4a4a, { roughness: 0.9, side: THREE.DoubleSide });
        const edgeMat = this.matManager.get(0xa0a0a0, { roughness: 0.3, metalness: 0.8 });
        
        // Main box (solid)
        const boxGeo = new THREE.BoxGeometry(width, height, depth);
        const box = new THREE.Mesh(boxGeo, concreteMat);
        box.position.set(0, height / 2, 0);
        box.castShadow = true;
        box.receiveShadow = true;
        group.add(box);
        
        // Metal edges on top
        const edgeGeo = new THREE.CylinderGeometry(0.05, 0.05, width + 0.1, 6);
        
        const frontEdge = new THREE.Mesh(edgeGeo, edgeMat);
        frontEdge.rotation.z = Math.PI / 2;
        frontEdge.position.set(0, height, depth / 2);
        frontEdge.castShadow = true;
        group.add(frontEdge);
        
        const backEdge = new THREE.Mesh(edgeGeo, edgeMat);
        backEdge.rotation.z = Math.PI / 2;
        backEdge.position.set(0, height, -depth / 2);
        backEdge.castShadow = true;
        group.add(backEdge);
        
        // Ramps on front and back
        const rampLength = height * 1.8;
        const rampAngle = Math.atan2(height, rampLength);
        const rampHyp = Math.sqrt(height * height + rampLength * rampLength);
        
        const rampGeo = new THREE.BoxGeometry(width, 0.2, rampHyp);
        
        const frontRamp = new THREE.Mesh(rampGeo, concreteMat);
        frontRamp.rotation.x = -rampAngle;
        frontRamp.position.set(0, height / 2, depth / 2 + rampLength / 2);
        frontRamp.castShadow = true;
        frontRamp.receiveShadow = true;
        group.add(frontRamp);
        
        const backRamp = new THREE.Mesh(rampGeo, concreteMat);
        backRamp.rotation.x = rampAngle;
        backRamp.position.set(0, height / 2, -depth / 2 - rampLength / 2);
        backRamp.castShadow = true;
        backRamp.receiveShadow = true;
        group.add(backRamp);
        
        // Side panels for the ramps (triangular fill)
        const sideShape = new THREE.Shape();
        sideShape.moveTo(0, 0);
        sideShape.lineTo(rampLength, 0);
        sideShape.lineTo(0, height);
        sideShape.lineTo(0, 0);
        
        const sideGeo = new THREE.ShapeGeometry(sideShape);
        
        // Front ramp - left side
        const frontLeftSide = new THREE.Mesh(sideGeo, sideMat);
        frontLeftSide.rotation.y = -Math.PI / 2;
        frontLeftSide.position.set(-width / 2, 0, depth / 2);
        frontLeftSide.castShadow = true;
        group.add(frontLeftSide);
        
        // Front ramp - right side
        const frontRightSide = new THREE.Mesh(sideGeo, sideMat);
        frontRightSide.rotation.y = -Math.PI / 2;
        frontRightSide.position.set(width / 2, 0, depth / 2);
        frontRightSide.castShadow = true;
        group.add(frontRightSide);
        
        // Back ramp sides (mirrored)
        const backSideShape = new THREE.Shape();
        backSideShape.moveTo(0, 0);
        backSideShape.lineTo(-rampLength, 0);
        backSideShape.lineTo(0, height);
        backSideShape.lineTo(0, 0);
        
        const backSideGeo = new THREE.ShapeGeometry(backSideShape);
        
        // Back ramp - left side
        const backLeftSide = new THREE.Mesh(backSideGeo, sideMat);
        backLeftSide.rotation.y = -Math.PI / 2;
        backLeftSide.position.set(-width / 2, 0, -depth / 2);
        backLeftSide.castShadow = true;
        group.add(backLeftSide);
        
        // Back ramp - right side
        const backRightSide = new THREE.Mesh(backSideGeo, sideMat);
        backRightSide.rotation.y = -Math.PI / 2;
        backRightSide.position.set(width / 2, 0, -depth / 2);
        backRightSide.castShadow = true;
        group.add(backRightSide);
        
        group.position.set(x, 0, z);
        
        this.colliders.push({
            type: 'funbox',
            x, z, width, depth: depth + rampLength * 2, height
        });
        
        return group;
    }
    
    /**
     * Create a kicker/launch ramp
     */
    _createKicker(x, z, width, height, length, rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        group.name = 'kicker';
        
        const concreteMat = this.matManager.get(0x555555, { roughness: 0.85, side: THREE.DoubleSide });
        const sideMat = this.matManager.get(0x4a4a4a, { roughness: 0.9, side: THREE.DoubleSide });
        const edgeMat = this.matManager.get(0x999999, { roughness: 0.3, metalness: 0.8 });
        
        // Ramp surface (angled box)
        const rampAngle = Math.atan2(height, length);
        const rampLength = Math.sqrt(height * height + length * length);
        
        const rampGeo = new THREE.BoxGeometry(width, 0.15, rampLength);
        const ramp = new THREE.Mesh(rampGeo, concreteMat);
        ramp.rotation.x = -rampAngle;
        ramp.position.set(0, height / 2, 0);
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        group.add(ramp);
        
        // Solid triangular side panels (proper orientation)
        const sideShape = new THREE.Shape();
        sideShape.moveTo(0, 0);
        sideShape.lineTo(length, 0);
        sideShape.lineTo(length, height);
        sideShape.lineTo(0, 0);
        
        const sideGeo = new THREE.ShapeGeometry(sideShape);
        
        // Left side panel
        const leftSide = new THREE.Mesh(sideGeo, sideMat);
        leftSide.rotation.y = Math.PI / 2;
        leftSide.position.set(-width / 2, 0, -length / 2);
        leftSide.castShadow = true;
        group.add(leftSide);
        
        // Right side panel
        const rightSide = new THREE.Mesh(sideGeo, sideMat);
        rightSide.rotation.y = Math.PI / 2;
        rightSide.position.set(width / 2, 0, -length / 2);
        rightSide.castShadow = true;
        group.add(rightSide);
        
        // Back wall (vertical face at the high end)
        const backGeo = new THREE.BoxGeometry(width, height, 0.15);
        const back = new THREE.Mesh(backGeo, sideMat);
        back.position.set(0, height / 2, length / 2);
        back.castShadow = true;
        group.add(back);
        
        // Metal lip at top
        const lipGeo = new THREE.CylinderGeometry(0.04, 0.04, width, 6);
        const lip = new THREE.Mesh(lipGeo, edgeMat);
        lip.rotation.z = Math.PI / 2;
        lip.position.set(0, height, length / 2);
        lip.castShadow = true;
        group.add(lip);
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        
        // Add kicker collider
        this.colliders.push({
            type: 'kicker',
            x, z, width, depth: length, height, rotation
        });
        
        return group;
    }
    
    /**
     * Create a light pole
     */
    _createLightPole(x, z, height = 5) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        const poleMat = this.matManager.get(0x353535, { roughness: 0.4, metalness: 0.6 });
        const lightMat = this.matManager.get(0xffffee, { emissive: 0xffffaa, emissiveIntensity: 0.4 });
        
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.14, height, 8);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = height / 2;
        pole.castShadow = true;
        group.add(pole);
        
        const fixtureGeo = new THREE.BoxGeometry(0.6, 0.12, 0.35);
        const fixture = new THREE.Mesh(fixtureGeo, poleMat);
        fixture.position.set(0, height, 0);
        fixture.castShadow = true;
        group.add(fixture);
        
        const lightGeo = new THREE.BoxGeometry(0.5, 0.04, 0.25);
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.set(0, height - 0.08, 0);
        group.add(light);
        
        group.position.set(x, 0, z);
        return group;
    }
    
    /**
     * Create a bench for spectators
     */
    _createBench(x, z, rotation = 0) {
        const THREE = this.THREE;
        const group = new THREE.Group();
        
        const woodMat = this.matManager.get(0x8B5A2B, { roughness: 0.85 });
        const metalMat = this.matManager.get(0x404040, { roughness: 0.5, metalness: 0.6 });
        
        const seatGeo = new THREE.BoxGeometry(2.2, 0.12, 0.5);
        const seat = new THREE.Mesh(seatGeo, woodMat);
        seat.position.y = 0.45;
        seat.castShadow = true;
        group.add(seat);
        
        const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6);
        [[-0.9, -0.18], [-0.9, 0.18], [0.9, -0.18], [0.9, 0.18]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(legGeo, metalMat);
            leg.position.set(lx, 0.225, lz);
            leg.castShadow = true;
            group.add(leg);
        });
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        return group;
    }
    
    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'skate_park';
        group.position.set(x, y, z);
        
        const W = this.parkWidth;
        const D = this.parkDepth;
        
        // NO FLOOR - uses existing ground
        
        // ==================== MAIN HALF PIPE ====================
        // Central half pipe - the main attraction (moved slightly forward)
        const halfPipe = this._createSolidHalfPipe(0, -3, 6, 3, 10, 0);
        this.addMesh(halfPipe, group);
        
        // ==================== QUARTER PIPES ====================
        // Front quarter pipe (moved forward to give space)
        const frontQP = this._createSolidQuarterPipe(0, -D/2 + 1, 7, 2.5, Math.PI);
        this.addMesh(frontQP, group);
        
        // Back quarter pipe (moved further back to avoid clipping with half pipe)
        const backQP = this._createSolidQuarterPipe(0, D/2 - 1, 9, 3.5, 0);
        this.addMesh(backQP, group);
        
        // ==================== GRIND RAILS ====================
        // Rail to the side of half pipe
        const rail1 = this._createRail(-10, -2, 5, 0.5, 0);
        this.addMesh(rail1, group);
        
        // Diagonal rail on opposite side
        const rail2 = this._createRail(10, -5, 4, 0.45, Math.PI / 5);
        this.addMesh(rail2, group);
        
        // Low beginner rail near front
        const rail3 = this._createRail(-6, -10, 3.5, 0.35, Math.PI / 2);
        this.addMesh(rail3, group);
        
        // ==================== FUN BOX ====================
        const funBox = this._createFunBox(10, 6, 3.5, 2.5, 0.9);
        this.addMesh(funBox, group);
        
        // ==================== KICKERS ====================
        const kicker1 = this._createKicker(-11, -6, 2.5, 0.8, 2, Math.PI / 4);
        this.addMesh(kicker1, group);
        
        const kicker2 = this._createKicker(7, -11, 2, 0.6, 1.5, -Math.PI / 6);
        this.addMesh(kicker2, group);
        
        // ==================== LIGHTS ====================
        if (this.withLights) {
            this.addMesh(this._createLightPole(-W/2 + 2, -D/2 + 2), group);
            this.addMesh(this._createLightPole(W/2 - 2, -D/2 + 2), group);
            this.addMesh(this._createLightPole(-W/2 + 2, D/2 - 2), group);
            this.addMesh(this._createLightPole(W/2 - 2, D/2 - 2), group);
        }
        
        // ==================== SPECTATOR BENCHES ====================
        this.addMesh(this._createBench(-W/2 - 2, 0, Math.PI / 2), group);
        this.addMesh(this._createBench(W/2 + 2, 0, -Math.PI / 2), group);
        
        // Store collision data
        group.userData.colliders = this.colliders;
        group.userData.parkBounds = {
            minX: -W/2 - 3,
            maxX: W/2 + 3,
            minZ: -D/2 - 3,
            maxZ: D/2 + 3
        };
        
        return group;
    }
    
    getColliders() {
        return this.colliders;
    }
}

/**
 * Factory function
 */
export function createSkatePark(THREE, config = {}) {
    const park = new SkatePark(THREE, config);
    return park.spawn(null, config.x || 0, config.y || 0, config.z || 0);
}

export default SkatePark;
