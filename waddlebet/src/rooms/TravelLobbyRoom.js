/**
 * TravelLobbyRoom — small transit cabin while ferry is in motion.
 */

import BaseRoom from './BaseRoom';
import { PropColors } from '../props/PropColors';
import { getMaterialManager } from '../props/PropMaterials';
import { getGeometryManager } from '../props/PropGeometries';

class TravelLobbyRoom extends BaseRoom {
    static ID = 'travel_lobby';
    static NAME = 'Ice Ferry';
    static ROOM_WIDTH = 24;
    static ROOM_DEPTH = 16;
    static ROOM_HEIGHT = 8;
    static CENTER_X = TravelLobbyRoom.ROOM_WIDTH / 2;
    static CENTER_Z = TravelLobbyRoom.ROOM_DEPTH / 2;

    constructor(THREE, voyageMeta = null) {
        super(THREE);
        this.voyageMeta = voyageMeta;
        this.initCollisionSystem(TravelLobbyRoom.ROOM_WIDTH, TravelLobbyRoom.ROOM_DEPTH, 4);
    }

    spawn(scene) {
        const THREE = this.THREE;
        const W = TravelLobbyRoom.ROOM_WIDTH;
        const D = TravelLobbyRoom.ROOM_DEPTH;
        const H = TravelLobbyRoom.ROOM_HEIGHT;
        const CX = TravelLobbyRoom.CENTER_X;
        const CZ = TravelLobbyRoom.CENTER_Z;
        const mat = getMaterialManager(THREE);
        const geo = getGeometryManager(THREE);

        this.cleanup();

        const floor = new THREE.Mesh(
            geo.box(W, 0.15, D),
            mat.get('#2a3f55', { roughness: 0.85 })
        );
        floor.position.set(CX, 0.075, CZ);
        floor.receiveShadow = true;
        scene.add(floor);
        this.meshes.push(floor);

        const wallMat = mat.get('#1a2840', { roughness: 0.9 });
        const backWall = new THREE.Mesh(geo.box(W, H, 0.3), wallMat);
        backWall.position.set(CX, H / 2, 0.15);
        scene.add(backWall);
        this.meshes.push(backWall);

        [-0.15, W + 0.15].forEach((x) => {
            const side = new THREE.Mesh(geo.box(0.3, H, D), wallMat);
            side.position.set(x, H / 2, CZ);
            scene.add(side);
            this.meshes.push(side);
        });

        const windowMat = mat.get('#87ceeb', {
            roughness: 0.1,
            metalness: 0.1,
            emissive: '#4488cc',
            emissiveIntensity: 0.15
        });
        const windowPane = new THREE.Mesh(geo.box(8, 3, 0.1), windowMat);
        windowPane.position.set(CX, 4, D - 0.1);
        scene.add(windowPane);
        this.meshes.push(windowPane);

        const benchMat = mat.get(PropColors.plankMedium, { roughness: 0.88 });
        [[4, 4], [W - 4, 4], [4, D - 4], [W - 4, D - 4]].forEach(([bx, bz]) => {
            const bench = new THREE.Mesh(geo.box(2.5, 0.5, 0.8), benchMat);
            bench.position.set(bx, 0.45, bz);
            bench.castShadow = true;
            scene.add(bench);
            this.meshes.push(bench);
        });

        const ambient = new THREE.AmbientLight(0xaaccff, 0.55);
        scene.add(ambient);
        this.lights.push(ambient);
        const cabinLight = new THREE.PointLight(0xffeedd, 0.8, 30);
        cabinLight.position.set(CX, H - 1, CZ);
        scene.add(cabinLight);
        this.lights.push(cabinLight);

        const WALL_H = 8;
        const T = 2;
        this.collisionSystem.addCollider(CX, CZ, { type: 'box', size: { x: W - 2, z: D - 2 }, height: 0.15 }, 1, { name: 'floor' });
        this.collisionSystem.addCollider(CX, 1, { type: 'box', size: { x: W, z: T }, height: WALL_H }, 1, { name: 'wall_back' });
        this.collisionSystem.addCollider(CX, D - 1, { type: 'box', size: { x: W, z: T }, height: WALL_H }, 1, { name: 'wall_front' });
        this.collisionSystem.addCollider(1, CZ, { type: 'box', size: { x: T, z: D }, height: WALL_H }, 1, { name: 'wall_left' });
        this.collisionSystem.addCollider(W - 1, CZ, { type: 'box', size: { x: T, z: D }, height: WALL_H }, 1, { name: 'wall_right' });

        return this.getRoomData();
    }

    getRoomData() {
        return {
            name: 'travel_lobby',
            roomWidth: TravelLobbyRoom.ROOM_WIDTH,
            roomDepth: TravelLobbyRoom.ROOM_DEPTH,
            spawnPos: { x: TravelLobbyRoom.CENTER_X, z: TravelLobbyRoom.CENTER_Z + 2 },
            furniture: [],
            collisionSystem: this.collisionSystem
        };
    }

    checkPlayerMovement(x, z, newX, newZ, radius = 0.8, y = 0) {
        return this.collisionSystem.checkMovement(x, z, newX, newZ, radius, y);
    }

    checkLanding(x, z, y, radius = 0.8) {
        return this.collisionSystem.checkLanding(x, z, y, radius);
    }
}

export default TravelLobbyRoom;
