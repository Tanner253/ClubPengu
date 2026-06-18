/**
 * PineCrownBuilder — tiered snow pine foliage (no trunk) for manual chop trees.
 * Matches decorative forest pines; crown origin sits on the chop hinge.
 */

import { PropColors } from './PropColors';
import { getMaterialManager } from './PropMaterials';

const CROWN_SIZES = {
    small: { layers: 3, baseRadius: 1.85, layerH: 1.45, snowDepth: 0.16 },
    medium: { layers: 4, baseRadius: 2.55, layerH: 1.85, snowDepth: 0.2 },
    large: { layers: 5, baseRadius: 3.35, layerH: 2.15, snowDepth: 0.24 }
};

const STAGE_TO_CROWN = {
    sapling: 'small',
    baby: 'medium',
    mature: 'medium',
    elder: 'large'
};

function mergeGeometries(THREE, geometries) {
    if (!geometries.length) return null;
    if (geometries.length === 1) return geometries[0].clone();
    if (THREE.BufferGeometryUtils?.mergeGeometries) {
        return THREE.BufferGeometryUtils.mergeGeometries(geometries, false);
    }
    let totalVerts = 0;
    let totalIdx = 0;
    for (const geo of geometries) {
        const pos = geo.getAttribute('position');
        if (pos) totalVerts += pos.count;
        const idx = geo.getIndex();
        if (idx) totalIdx += idx.count;
    }
    const positions = new Float32Array(totalVerts * 3);
    const normals = new Float32Array(totalVerts * 3);
    const indices = totalIdx > 0 ? new Uint32Array(totalIdx) : null;
    let vOff = 0;
    let iOff = 0;
    let idxBase = 0;
    for (const geo of geometries) {
        const pos = geo.getAttribute('position');
        const norm = geo.getAttribute('normal');
        const idx = geo.getIndex();
        if (!pos) continue;
        positions.set(pos.array, vOff * 3);
        if (norm) normals.set(norm.array, vOff * 3);
        if (idx && indices) {
            for (let i = 0; i < idx.count; i++) indices[iOff + i] = idx.array[i] + idxBase;
            iOff += idx.count;
        }
        idxBase += pos.count;
        vOff += pos.count;
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    if (indices) merged.setIndex(new THREE.BufferAttribute(indices, 1));
    merged.computeVertexNormals();
    return merged;
}

/**
 * @param {typeof import('three')} THREE
 * @param {'sapling'|'baby'|'mature'|'elder'|string} stage
 * @param {{ foliageColor?: string, foliageAccent?: string, snowCovered?: boolean, crownShape?: 'pine'|'round' }} [species]
 */
export function buildPineCrownMeshes(THREE, stage = 'mature', species = null) {
    const crownKey = STAGE_TO_CROWN[stage] || 'medium';
    const cfg = CROWN_SIZES[crownKey];
    const matManager = getMaterialManager(THREE);
    const isRound = species?.crownShape === 'round';
    const showSnow = species?.snowCovered !== false;

    const foliageGeos = [];
    const snowGeos = [];
    let currentY = 0;

    for (let i = 0; i < cfg.layers; i++) {
        const layerRatio = 1 - (i / cfg.layers) * (isRound ? 0.45 : 0.68);
        const radius = cfg.baseRadius * layerRatio * (isRound ? 1.18 : 1);
        const height = cfg.layerH * layerRatio * (isRound ? 0.72 : 1);

        const coneGeo = new THREE.ConeGeometry(radius, height, isRound ? 12 : 10);
        coneGeo.translate(0, currentY + height / 2, 0);
        foliageGeos.push(coneGeo);

        if (showSnow) {
            const snowCapGeo = new THREE.ConeGeometry(radius * 0.82, cfg.snowDepth, 10);
            snowCapGeo.translate(0, currentY + height - cfg.snowDepth / 2, 0);
            snowGeos.push(snowCapGeo);
        }

        if (showSnow && crownKey !== 'small' && i < 2) {
            for (let j = 0; j < 3; j++) {
                const angle = (j / 3) * Math.PI * 2 + i * 0.4;
                const dist = radius * 0.55;
                const clumpGeo = new THREE.SphereGeometry(0.16, 5, 4);
                clumpGeo.scale(1, 0.45, 1);
                clumpGeo.translate(
                    Math.cos(angle) * dist,
                    currentY + height * 0.38,
                    Math.sin(angle) * dist
                );
                snowGeos.push(clumpGeo);
            }
        }

        currentY += height * (isRound ? 0.48 : 0.62);
    }

    if (showSnow) {
        const topSnow = new THREE.SphereGeometry(cfg.snowDepth * 2.2, 8, 6);
        topSnow.scale(1, 0.55, 1);
        topSnow.translate(0, currentY + cfg.snowDepth * 0.5, 0);
        snowGeos.push(topSnow);
    }

    const foliageGeo = mergeGeometries(THREE, foliageGeos);
    const snowGeo = showSnow ? mergeGeometries(THREE, snowGeos) : null;
    foliageGeos.forEach(g => g.dispose());
    snowGeos.forEach(g => g.dispose());

    const foliageMat = matManager.get(species?.foliageColor || PropColors.pineMedium, { roughness: 0.88 });
    const snowMat = matManager.get(PropColors.snowLight, { roughness: 0.58 });

    const foliageMesh = foliageGeo ? new THREE.Mesh(foliageGeo, foliageMat) : null;
    const snowMesh = snowGeo ? new THREE.Mesh(snowGeo, snowMat) : null;
    if (foliageMesh) {
        foliageMesh.castShadow = true;
        foliageMesh.receiveShadow = true;
        foliageMesh.name = 'crown_foliage';
    }
    if (snowMesh) {
        snowMesh.castShadow = true;
        snowMesh.name = 'crown_snow';
    }

    return { foliageMesh, snowMesh, crownHeight: currentY + cfg.snowDepth };
}

export default buildPineCrownMeshes;
