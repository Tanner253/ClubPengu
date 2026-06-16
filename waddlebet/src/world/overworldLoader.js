/**
 * Overworld quadrant loaders — one 220×220 zone per room.
 */

import TownCenter from '../rooms/TownCenter';
import SnowFortsZone from '../rooms/SnowFortsZone';
import ForestTrailsZone from '../rooms/ForestTrailsZone';
import ForestTreeManager from '../systems/ForestTreeManager';
import MushroomClusterManager from '../systems/MushroomClusterManager';
import { createMountainBackground } from '../systems/MountainBackground';
import {
    OVERWORLD_ZONE_SIZE,
    getOverworldMountainConfig,
} from '../config/overworldConfig';
import { CITY_SIZE, BUILDING_SCALE } from '../config/roomConfig';

/** Shared icy ground plane for town (and reused pattern). */
export function createOverworldGroundPlane(THREE, scene, roomId) {
    const ICE_COLORS = ['#7EB8D8', '#6AA8C8', '#5898B8', '#4888A8', '#3878A0', '#A8D0E0'];
    const GROUND_EXTEND = 35;
    const SIZE = OVERWORLD_ZONE_SIZE;
    const groundWidth = SIZE + GROUND_EXTEND * 2;
    const groundDepth = SIZE + GROUND_EXTEND * 2;

    const iceGeo = new THREE.PlaneGeometry(groundWidth, groundDepth, 16, 16);
    iceGeo.rotateX(-Math.PI / 2);

    const colors = [];
    const positions = iceGeo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        const noise = Math.sin(x * 0.1) * Math.cos(z * 0.1)
            + Math.sin(x * 0.05 + 1) * Math.cos(z * 0.07) * 0.5;
        const colorIndex = Math.floor((noise + 1) * 2.5) % ICE_COLORS.length;
        const color = new THREE.Color(ICE_COLORS[colorIndex]);
        const distFromCenter = Math.sqrt(x * x + z * z) / (SIZE / 2);
        const edgeDarken = Math.max(0, 1 - distFromCenter * 0.3);
        color.multiplyScalar(0.85 + edgeDarken * 0.15);
        colors.push(color.r, color.g, color.b);
    }
    iceGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const iceMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0,
    });

    const icePlane = new THREE.Mesh(iceGeo, iceMat);
    icePlane.position.set(SIZE / 2, 0, SIZE / 2);
    icePlane.receiveShadow = true;
    icePlane.renderOrder = 0;
    icePlane.name = `${roomId}_ground`;
    scene.add(icePlane);
    return icePlane;
}

export async function loadOverworldMountains(THREE, scene, roomId) {
    try {
        return createMountainBackground(THREE, scene, getOverworldMountainConfig(roomId));
    } catch (err) {
        console.warn(`Failed to create mountains for ${roomId}:`, err);
        return null;
    }
}

export async function loadTownQuadrant(THREE, scene, refs, yieldFn) {
    createOverworldGroundPlane(THREE, scene, 'town');
    await yieldFn();

    const mountains = await loadOverworldMountains(THREE, scene, 'town');
    refs.mountainBackgroundRef.current = mountains;
    await yieldFn();

    const townCenter = new TownCenter(THREE);
    refs.townCenterRef.current = townCenter;
    const { meshes: propMeshes, lights: propLights } =
        await townCenter.spawnChunked(scene, yieldFn);
    refs.propLightsRef.current = propLights;
    console.log(`Town spawned: ${propMeshes.length} props`);
    return townCenter;
}

export async function loadSnowFortsQuadrant(THREE, scene, refs, yieldFn) {
    refs.townCenterRef.current = null;

    const mountains = await loadOverworldMountains(THREE, scene, 'snow_forts');
    refs.mountainBackgroundRef.current = mountains;
    await yieldFn();

    const snowFortsZone = new SnowFortsZone(THREE);
    refs.snowFortsZoneRef.current = snowFortsZone;
    await snowFortsZone.spawnChunked(scene, yieldFn);
    console.log('⛄ Snow Forts room loaded');
    return snowFortsZone;
}

export async function loadForestQuadrant(THREE, scene, refs, yieldFn, fetchForestTrees, forestTrees, mushroomClusters) {
    refs.townCenterRef.current = null;
    refs.snowFortsZoneRef.current = null;

    const mountains = await loadOverworldMountains(THREE, scene, 'forest_trails');
    refs.mountainBackgroundRef.current = mountains;
    await yieldFn();

    const forestTrailsZone = new ForestTrailsZone(THREE);
    refs.forestTrailsZoneRef.current = forestTrailsZone;
    await forestTrailsZone.spawnChunked(scene, yieldFn);

    if (!refs.forestTreeManagerRef.current) {
        refs.forestTreeManagerRef.current = new ForestTreeManager();
    }
    refs.forestTreeManagerRef.current.spawnTrees(
        scene,
        THREE,
        forestTrailsZone.collisionSystem,
        0,
        0,
        forestTrees || []
    );

    if (!refs.mushroomClusterManagerRef.current) {
        refs.mushroomClusterManagerRef.current = new MushroomClusterManager();
    }
    refs.mushroomClusterManagerRef.current.spawnClusters(
        scene,
        THREE,
        0,
        0,
        mushroomClusters || []
    );

    fetchForestTrees?.();
    console.log('🌲 Forest Trails room loaded');
    return forestTrailsZone;
}

/** Legacy constant for map grid size checks. */
export const OVERWORLD_MAP_GRID_SIZE = CITY_SIZE * BUILDING_SCALE;
