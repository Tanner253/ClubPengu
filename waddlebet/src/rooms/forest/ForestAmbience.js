/**
 * ForestAmbience — terrain texture, grass tufts, butterflies, and trail decorations.
 */

import { createProp, PROP_TYPES } from '../../props';
import ForestCabin from '../../props/ForestCabin';

/**
 * Procedural forest floor texture with moss, dirt, and leaf litter variation.
 */
export function createForestGroundTexture(THREE, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base earthy green
    ctx.fillStyle = '#243824';
    ctx.fillRect(0, 0, size, size);

    // Moss patches
    for (let i = 0; i < 140; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 8 + Math.random() * 28;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${50 + Math.random() * 30}, ${90 + Math.random() * 40}, ${45 + Math.random() * 20}, 0.55)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Dirt / pine-needle dark spots
    for (let i = 0; i < 90; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(${25 + Math.random() * 15}, ${18 + Math.random() * 12}, ${10 + Math.random() * 8}, 0.35)`;
        ctx.fillRect(x, y, 3 + Math.random() * 10, 2 + Math.random() * 8);
    }

    // Leaf litter specks
    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#4a3520' : '#5c4030';
        ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/**
 * Worn forest trail texture — packed earth, pebbles, pine needles (replaces flat tan paths).
 */
export function createForestPathTexture(THREE, size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#5c4634';
    ctx.fillRect(0, 0, size, size);

    // Subtle center tread (slightly lighter where penguins walk)
    const tread = ctx.createLinearGradient(0, 0, size, 0);
    tread.addColorStop(0, 'rgba(0,0,0,0)');
    tread.addColorStop(0.35, 'rgba(0,0,0,0)');
    tread.addColorStop(0.5, 'rgba(210,185,140,0.18)');
    tread.addColorStop(0.65, 'rgba(0,0,0,0)');
    tread.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tread;
    ctx.fillRect(0, 0, size, size);

    const pebbleColors = [
        '#4a3828', '#6b5344', '#7a6350', '#3d2e22', '#8a7560',
        '#554030', '#6a5840', '#453528', '#958068', '#504030',
    ];
    for (let i = 0; i < 2200; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 0.8 + Math.random() * 2.8;
        ctx.fillStyle = pebbleColors[Math.floor(Math.random() * pebbleColors.length)];
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (0.6 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }

    // Pine needle scatter
    for (let i = 0; i < 350; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const len = 3 + Math.random() * 7;
        ctx.strokeStyle = `rgba(${30 + Math.random() * 25}, ${55 + Math.random() * 30}, ${25 + Math.random() * 15}, 0.55)`;
        ctx.lineWidth = 0.6 + Math.random() * 0.8;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(Math.random() * Math.PI) * len, y + Math.sin(Math.random() * Math.PI) * len);
        ctx.stroke();
    }

    // Moss / leaf litter at trail edges
    for (let i = 0; i < 60; i++) {
        const edge = Math.random() < 0.5 ? 0 : size;
        const along = Math.random() * size;
        const x = edge === 0 ? along : (Math.random() < 0.5 ? 0 : size);
        const y = edge === 0 ? (Math.random() < 0.5 ? 0 : size) : along;
        const r = 6 + Math.random() * 14;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${45 + Math.random() * 20}, ${75 + Math.random() * 25}, ${35 + Math.random() * 15}, 0.45)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Fine grit
    for (let i = 0; i < 500; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#3a2a1a' : '#7a6548';
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/**
 * Instanced grass tufts — cheap ground cover off the trails.
 */
export function spawnGrassTufts(THREE, parent, placements, OX, OZ) {
    if (!placements.length) return null;

    const bladeGeo = new THREE.PlaneGeometry(0.35, 0.55);
    const tuftMat = new THREE.MeshStandardMaterial({
        color: 0x3d6b32,
        roughness: 0.95,
        side: THREE.DoubleSide,
        alphaTest: 0.4,
        transparent: true
    });
    const tuftMat2 = tuftMat.clone();
    tuftMat2.color.setHex(0x4a7a3a);

    const group = new THREE.Group();
    group.name = 'forest_grass_tufts';

    placements.forEach((p, i) => {
        const mat = i % 3 === 0 ? tuftMat2 : tuftMat;
        for (let b = 0; b < 3; b++) {
            const blade = new THREE.Mesh(bladeGeo, mat);
            blade.position.set(
                OX + p.x + (b - 1) * 0.12,
                0.28 + (i % 5) * 0.02,
                OZ + p.z + Math.sin(b + i) * 0.08
            );
            blade.rotation.y = p.rot + b * 0.9;
            blade.receiveShadow = true;
            group.add(blade);
        }
    });

    parent.add(group);
    return group;
}

/** Default dimensions for decorative trail logs (local X = trunk axis). */
export const FALLEN_LOG_DECOR = {
    length: 4.2,
    radius: 0.52,
    defaultScale: 1.15
};

/**
 * Decorative fallen log (visual only or with optional sit via LOG_SEAT).
 * Returns collider hints so zones can register solid blocking geometry.
 */
export function spawnFallenLog(THREE, parent, OX, OZ, pos, options = {}) {
    const { rot = 0, sit = false, mossy = false, scale = FALLEN_LOG_DECOR.defaultScale } = options;

    if (sit) {
        const logProp = createProp(THREE, null, PROP_TYPES.LOG_SEAT, 0, 0, 0, { rotation: rot });
        if (!logProp) return null;
        const mesh = logProp.group;
        mesh.position.set(OX + pos.x, 0, OZ + pos.z);
        mesh.rotation.y = rot;
        parent.add(mesh);
        return { mesh, logProp, sit: true };
    }

    const group = new THREE.Group();
    group.name = 'fallen_log_decor';
    group.position.set(OX + pos.x, 0, OZ + pos.z);
    group.rotation.y = rot;
    group.scale.setScalar(scale);

    const trunkLen = FALLEN_LOG_DECOR.length;
    const trunkR = FALLEN_LOG_DECOR.radius;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.92 });
    const woodLightMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.88 });
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x2e1f12, roughness: 1 });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x3a5c2a, roughness: 0.95 });
    const mossDarkMat = new THREE.MeshStandardMaterial({ color: 0x2d4a22, roughness: 0.98 });

    // Main trunk — tapered, slightly sunk into the ground
    const log = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkR * 0.82, trunkR, trunkLen, 14),
        woodMat
    );
    log.rotation.z = Math.PI / 2;
    log.position.y = trunkR * 0.72;
    log.castShadow = true;
    log.receiveShadow = true;
    group.add(log);

    // Root flare at the thick end (reads as a fallen tree, not a bench)
    const rootFlare = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkR * 1.35, trunkR * 0.95, trunkR * 1.1, 12),
        barkMat
    );
    rootFlare.rotation.z = Math.PI / 2;
    rootFlare.position.set(-trunkLen / 2 + trunkR * 0.35, trunkR * 0.55, 0);
    rootFlare.castShadow = true;
    group.add(rootFlare);

    // Splintered break at the thin end
    const breakCap = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkR * 0.75, trunkR * 0.55, 0.35, 8),
        woodLightMat
    );
    breakCap.rotation.z = Math.PI / 2;
    breakCap.position.set(trunkLen / 2 - 0.1, trunkR * 0.85, 0);
    breakCap.castShadow = true;
    group.add(breakCap);

    for (let i = 0; i < 4; i++) {
        const splinter = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.08, 0.28 + (i % 2) * 0.12),
            woodLightMat
        );
        splinter.position.set(
            trunkLen / 2 - 0.05,
            trunkR * 0.9 + (i % 2) * 0.06,
            -0.18 + i * 0.12
        );
        splinter.rotation.set(0.4 + i * 0.15, i * 0.5, 0.25 * i);
        group.add(splinter);
    }

    // Bark rings along the trunk
    [-1.1, -0.2, 0.75, 1.45].forEach((xOff, i) => {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(trunkR + 0.03, 0.045, 6, 14),
            barkMat
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.set(xOff, trunkR * 0.78, 0);
        ring.scale.set(1, 1 - i * 0.04, 1);
        group.add(ring);
    });

    // Side branch stubs
    [
        { x: 0.4, y: trunkR * 1.05, z: 0.22, rz: 0.75 },
        { x: -0.65, y: trunkR * 0.95, z: -0.18, rz: -0.55 }
    ].forEach(st => {
        const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.42, 6), barkMat);
        stub.position.set(st.x, st.y, st.z);
        stub.rotation.z = st.rz;
        stub.castShadow = true;
        group.add(stub);
    });

    if (mossy) {
        [
            { x: 0.15, z: 0.12, sx: 1.4, sy: 0.32, sz: 1.0, mat: mossMat },
            { x: -0.55, z: -0.08, sx: 1.0, sy: 0.28, sz: 0.85, mat: mossDarkMat },
            { x: 0.95, z: 0.05, sx: 0.75, sy: 0.22, sz: 0.7, mat: mossMat }
        ].forEach(m => {
            const moss = new THREE.Mesh(new THREE.SphereGeometry(trunkR * 0.55, 8, 6), m.mat);
            moss.scale.set(m.sx, m.sy, m.sz);
            moss.position.set(m.x, trunkR * 1.08, m.z);
            moss.receiveShadow = true;
            group.add(moss);
        });
    }

    parent.add(group);

    const scaledLen = trunkLen * scale;
    const scaledR = trunkR * scale;
    return {
        mesh: group,
        sit: false,
        collider: {
            size: { x: scaledLen + 0.5, z: scaledR * 2 + 0.35 },
            height: scaledR * 1.6
        }
    };
}

/**
 * Mushroom cluster decoration.
 */
export function spawnMushroomCluster(THREE, parent, OX, OZ, x, z) {
    const group = new THREE.Group();
    group.name = 'mushroom_cluster';
    group.position.set(OX + x, 0, OZ + z);

    const caps = [
        { r: 0.18, h: 0.22, color: 0xc44b33, x: 0, z: 0 },
        { r: 0.12, h: 0.16, color: 0xd4a017, x: 0.25, z: 0.15 },
        { r: 0.1, h: 0.14, color: 0x8b4513, x: -0.2, z: 0.1 },
    ];
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.9 });

    caps.forEach(c => {
        const capMat = new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.75 });
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.35, c.r * 0.4, c.h, 6), stemMat);
        stem.position.set(c.x, c.h / 2, c.z);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(c.r, 10, 8), capMat);
        cap.scale.y = 0.55;
        cap.position.set(c.x, c.h + c.r * 0.35, c.z);
        group.add(stem, cap);
    });

    parent.add(group);
    return group;
}

/**
 * Forest butterflies orbiting meadow patches (adapted from garden park).
 */
export function createForestButterflies(THREE, parent, patches, OX, OZ) {
    const root = new THREE.Group();
    root.name = 'forest_butterflies';
    const butterflies = [];
    const colors = [0xffb347, 0xf4d03f, 0xe67e22, 0xa8dadc, 0xf8a5c2, 0xc9b1ff];

    patches.forEach(patch => {
        const count = patch.count || 3;
        for (let i = 0; i < count; i++) {
            const b = new THREE.Group();
            const color = colors[(patch.seed + i) % colors.length];
            const wingMat = new THREE.MeshStandardMaterial({
                color,
                roughness: 0.55,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.88
            });
            const wingShape = new THREE.Shape();
            wingShape.moveTo(0, 0);
            wingShape.quadraticCurveTo(0.12, 0.14, 0.2, 0.02);
            wingShape.quadraticCurveTo(0.1, -0.1, 0, 0);
            const wingGeo = new THREE.ShapeGeometry(wingShape);
            const leftWing = new THREE.Mesh(wingGeo, wingMat);
            leftWing.position.x = -0.01;
            b.add(leftWing);
            const rightWing = new THREE.Mesh(wingGeo, wingMat.clone());
            rightWing.scale.x = -1;
            rightWing.position.x = 0.01;
            b.add(rightWing);
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.012, 0.008, 0.09, 4),
                new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
            );
            body.rotation.x = Math.PI / 2;
            b.add(body);

            const angle = (i / count) * Math.PI * 2 + patch.seed;
            const radius = 2.5 + (i % 3) * 1.2;
            b.position.set(
                OX + patch.x + Math.cos(angle) * radius,
                1.2 + (i % 4) * 0.35,
                OZ + patch.z + Math.sin(angle) * radius
            );

            b.userData = {
                leftWing,
                rightWing,
                centerX: OX + patch.x,
                centerZ: OZ + patch.z,
                baseY: b.position.y,
                angle,
                speed: 0.25 + (patch.seed % 5) * 0.06,
                radius,
                wingSpeed: 10 + i * 2,
                bobSpeed: 1.2 + i * 0.2,
                bobAmount: 0.25
            };
            butterflies.push(b);
            root.add(b);
        }
    });

    parent.add(root);

    return {
        group: root,
        update(time, playerPos) {
            if (!playerPos) return;
            butterflies.forEach(b => {
                const d = b.userData;
                const dx = playerPos.x - d.centerX;
                const dz = playerPos.z - d.centerZ;
                if (dx * dx + dz * dz > 100 * 100) return;

                d.angle += d.speed * 0.016;
                b.position.x = d.centerX + Math.cos(d.angle) * d.radius;
                b.position.z = d.centerZ + Math.sin(d.angle) * d.radius;
                b.position.y = d.baseY + Math.sin(time * d.bobSpeed) * d.bobAmount;
                b.rotation.y = -d.angle - Math.PI / 2;
                const flap = Math.sin(time * d.wingSpeed) * 0.55;
                d.leftWing.rotation.y = flap;
                d.rightWing.rotation.y = -flap;
            });
        }
    };
}

/** Spawn Whiskerwood ranger cabin (porch bench is registered separately in ForestTrailsZone). */
export function spawnForestCabin(THREE, parent, OX, OZ, localX, localZ) {
    const cabin = new ForestCabin(THREE, { name: 'Whiskerwood Cabin' });
    cabin.spawn(null, OX + localX, 0, OZ + localZ);
    parent.add(cabin.group);
    return cabin;
}

/** Precomputed grass tuft positions (local coords, off paths). */
export function buildGrassPlacements(isOnPath) {
    const placements = [];
    for (let x = 15; x < 210; x += 7) {
        for (let z = 25; z < 210; z += 7) {
            if (isOnPath(x, z)) continue;
            if ((x * 13 + z * 7) % 11 !== 0) continue;
            placements.push({
                x: x + Math.sin(x * 0.4) * 1.5,
                z: z + Math.cos(z * 0.3) * 1.5,
                rot: (x + z) * 0.1
            });
        }
    }
    return placements;
}

/** Trail-side fallen logs — mix of sittable and decorative. */
export const TRAIL_LOG_PLACEMENTS = [
    { x: 82, z: 55, rot: 0.25, sit: true },
    { x: 108, z: 92, rot: -0.55, sit: true },
    { x: 42, z: 118, rot: 1.05, sit: true },
    { x: 138, z: 132, rot: -0.15, sit: true },
    { x: 158, z: 178, rot: 0.35, sit: true },
    { x: 52, z: 68, rot: 0.7, sit: false, mossy: true },
    { x: 118, z: 108, rot: -0.9, sit: false, mossy: true, scale: 1.05 },
    { x: 175, z: 88, rot: 0.4, sit: false, scale: 1.2 },
    { x: 98, z: 185, rot: 1.2, sit: false, mossy: true },
    { x: 48, z: 145, rot: -0.3, sit: false },
];

export const MUSHROOM_PLACEMENTS = [
    { x: 38, z: 82 }, { x: 102, z: 62 }, { x: 148, z: 118 },
    { x: 72, z: 168 }, { x: 185, z: 145 }, { x: 55, z: 132 },
];

export const BUTTERFLY_PATCHES = [
    { x: 90, z: 72, count: 4, seed: 1 },
    { x: 32, z: 102, count: 3, seed: 4 },
    { x: 125, z: 58, count: 3, seed: 7 },
    { x: 158, z: 125, count: 4, seed: 2 },
    { x: 68, z: 175, count: 2, seed: 9 },
];
