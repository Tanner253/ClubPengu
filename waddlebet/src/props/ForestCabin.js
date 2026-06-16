/**
 * ForestCabin — Whiskerwood ranger cabin with porch, chimney, and warm windows.
 */

import BaseProp from './BaseProp';
import { getMaterialManager } from './PropMaterials';

class ForestCabin extends BaseProp {
    constructor(THREE, options = {}) {
        super(THREE);
        this.matManager = getMaterialManager(THREE);
        this.nameplate = options.name || "Whiskerwood Cabin";
        this.windowLights = [];
    }

    spawn(scene, x, y, z) {
        const THREE = this.THREE;
        const group = this.createGroup(scene);
        group.name = 'forest_cabin';
        group.position.set(x, y, z);

        const logDark = this.matManager.get(0x4a3220, { roughness: 0.92 });
        const logMid = this.matManager.get(0x6b4a2e, { roughness: 0.88 });
        const logLight = this.matManager.get(0x8b6342, { roughness: 0.85 });
        const roofMat = this.matManager.get(0x3d3028, { roughness: 0.9 });
        const stoneMat = this.matManager.get(0x5a5a58, { roughness: 0.95 });
        const doorMat = this.matManager.get(0x3a2515, { roughness: 0.9 });
        const glassMat = this.matManager.get(0xffcc66, {
            roughness: 0.2,
            emissive: 0xff9933,
            emissiveIntensity: 0.55,
            transparent: true,
            opacity: 0.92
        });
        const trimMat = this.matManager.get(0x2a1a10, { roughness: 0.95 });

        // Stone foundation
        const foundation = new THREE.Mesh(
            new THREE.BoxGeometry(9.2, 0.45, 7.2),
            stoneMat
        );
        foundation.position.y = 0.22;
        foundation.castShadow = true;
        foundation.receiveShadow = true;
        group.add(foundation);

        // Log walls — stacked boxes with slight color variation
        const wallRows = [
            { y: 0.7, w: 8.8, d: 6.8, mat: logMid },
            { y: 1.35, w: 8.6, d: 6.6, mat: logLight },
            { y: 2.0, w: 8.4, d: 6.4, mat: logDark },
            { y: 2.65, w: 8.2, d: 6.2, mat: logMid },
        ];
        wallRows.forEach(row => {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(row.w, 0.55, row.d), row.mat);
            wall.position.y = row.y;
            wall.castShadow = true;
            wall.receiveShadow = true;
            group.add(wall);
        });

        // Horizontal log lines (chink detail)
        for (let i = 0; i < 4; i++) {
            const chink = new THREE.Mesh(
                new THREE.BoxGeometry(8.9, 0.06, 6.9),
                trimMat
            );
            chink.position.y = 0.45 + i * 0.65;
            group.add(chink);
        }

        // Front door
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.12), doorMat);
        door.position.set(0, 1.35, 3.38);
        door.castShadow = true;
        group.add(door);

        // Door frame + lantern
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.45, 0.08), trimMat);
        frame.position.set(0, 1.35, 3.42);
        group.add(frame);

        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.35), this.matManager.get(0x1a1208, { roughness: 0.8 }));
        lantern.position.set(1.1, 2.0, 3.55);
        group.add(lantern);
        const lanternGlow = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 8, 8),
            this.matManager.get(0xffaa44, { emissive: 0xff8822, emissiveIntensity: 1.2 })
        );
        lanternGlow.position.set(1.1, 2.0, 3.72);
        group.add(lanternGlow);
        this.windowLights.push({ mesh: lanternGlow, base: 1.0, speed: 2.2 });

        // Windows (warm glow)
        const windowPositions = [
            { x: -2.4, z: 3.35 },
            { x: 2.4, z: 3.35 },
            { x: -3.35, z: 0 },
            { x: 3.35, z: -1.2 },
        ];
        windowPositions.forEach((pos, idx) => {
            const frameMesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.1), trimMat);
            frameMesh.position.set(pos.x, 1.75, pos.z);
            if (Math.abs(pos.z) > 3) frameMesh.rotation.y = 0;
            else frameMesh.rotation.y = Math.PI / 2;
            group.add(frameMesh);

            const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.7), glassMat.clone());
            pane.position.set(pos.x, 1.75, pos.z + (Math.abs(pos.z) > 3 ? 0.06 : 0));
            if (Math.abs(pos.z) <= 3) {
                pane.rotation.y = Math.PI / 2;
                pane.position.x += 0.06;
            }
            group.add(pane);
            this.windowLights.push({
                mesh: pane,
                base: 0.45 + (idx % 2) * 0.15,
                speed: 1.4 + idx * 0.3
            });
        });

        // Porch
        const porch = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 2.2), logLight);
        porch.position.set(0, 0.55, 4.35);
        porch.castShadow = true;
        porch.receiveShadow = true;
        group.add(porch);

        const step = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 0.8), stoneMat);
        step.position.set(0, 0.25, 5.0);
        group.add(step);

        // Porch posts + roof overhang
        [-1.6, 1.6].forEach(px => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.4, 0.25), logDark);
            post.position.set(px, 1.5, 4.35);
            post.castShadow = true;
            group.add(post);
        });
        const overhang = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.15, 2.6), roofMat);
        overhang.position.set(0, 2.85, 4.2);
        group.add(overhang);

        // Main roof (two slopes)
        const roofGeo = new THREE.ConeGeometry(6.2, 2.2, 4);
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = 3.55;
        roof.rotation.y = Math.PI / 4;
        roof.scale.set(1, 1, 0.75);
        roof.castShadow = true;
        group.add(roof);

        // Chimney + smoke stack
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.9), stoneMat);
        chimney.position.set(-2.5, 4.0, -1.0);
        chimney.castShadow = true;
        group.add(chimney);

        // Wooden sign
        const signBoard = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.7, 0.12), logLight);
        signBoard.position.set(0, 3.15, 5.15);
        signBoard.castShadow = true;
        group.add(signBoard);

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#3d2817';
        ctx.fillRect(0, 0, 256, 64);
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 252, 60);
        ctx.fillStyle = '#f5e6c8';
        ctx.font = 'bold 22px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.nameplate, 128, 32);
        const signTex = new THREE.CanvasTexture(canvas);
        signTex.colorSpace = THREE.SRGBColorSpace;
        const signFace = new THREE.Mesh(
            new THREE.PlaneGeometry(2.6, 0.6),
            new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.9 })
        );
        signFace.position.set(0, 3.15, 5.22);
        group.add(signFace);

        // Axes & wood pile (personality)
        const woodPile = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.6, 8), logDark);
        woodPile.rotation.z = Math.PI / 2;
        woodPile.position.set(3.2, 0.55, 3.8);
        woodPile.castShadow = true;
        group.add(woodPile);
        const woodPile2 = woodPile.clone();
        woodPile2.position.set(3.45, 0.62, 3.55);
        woodPile2.rotation.z = Math.PI / 2.2;
        group.add(woodPile2);

        return this;
    }

    update(time) {
        this.windowLights.forEach(({ mesh, base, speed }) => {
            if (mesh.material?.emissiveIntensity !== undefined) {
                mesh.material.emissiveIntensity = base + Math.sin(time * speed) * 0.18;
            }
        });
    }

    getCollisionBounds() {
        if (!this.group) return null;
        const x = this.group.position.x;
        const z = this.group.position.z;
        return {
            minX: x - 5,
            maxX: x + 5,
            minZ: z - 4,
            maxZ: z + 5.5,
            height: 4.5,
        };
    }

    getTrigger() {
        if (!this.group) return null;
        return {
            type: 'message',
            x: this.group.position.x,
            z: this.group.position.z + 4,
            radius: 3.5,
            message: '🏡 Whiskerwood Cabin — ranger rest stop. Mind the chimney smoke!',
        };
    }
}

export default ForestCabin;
