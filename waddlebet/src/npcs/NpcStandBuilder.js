/**
 * Builds 3D merchant stands + NPC penguin meshes for world NPCs.
 * Signs use camera-facing sprites (same pattern as floating_title) — never mirrored.
 */

import Barrel from '../props/Barrel';
import Crate from '../props/Crate';
import SnowPile from '../props/SnowPile';
import { PropColors } from '../props/PropColors';
import { getMaterialManager } from '../props/PropMaterials';
import { getGeometryManager } from '../props/PropGeometries';
import { createPenguinBuilder } from '../engine/PenguinBuilder';
import { PALETTE } from '../constants';

/** Penguin feet sit at ~y=0.1 when wrapper.y=0 (inner mesh offset + scale). */
const PENGUIN_FEET_Y = 0.1;
/** Top of raised merchant deck planks. */
const DECK_SURFACE_Y = 0.30;
const NPC_STAND_Y = DECK_SURFACE_Y - PENGUIN_FEET_Y;

/**
 * @param {typeof import('three')} THREE
 * @param {Function} buildPenguinMesh
 * @param {import('../config/worldNpcs').WorldNpcDef} npcDef
 */
export function buildWorldNpc(THREE, buildPenguinMesh, npcDef) {
    const group = new THREE.Group();
    group.name = `npc_${npcDef.id}`;

    const stand = npcDef.standType === 'fishing_shack'
        ? buildFishingShack(THREE, npcDef)
        : buildSupplyStall(THREE, npcDef);
    group.add(stand);

    const appearance = { ...npcDef.appearance };
    const cosmetics = appearance.npcCosmetics || {};
    appearance.skin = appearance.skin || appearance.color || 'blue';
    delete appearance.color;
    delete appearance.npcCosmetics;

    const penguin = buildPenguinMesh(appearance);
    penguin.name = 'npc_penguin';

    if (npcDef.appearanceScale) {
        penguin.scale.setScalar(npcDef.appearanceScale);
    }

    const slot = stand.userData.npcSlot || { x: 0, z: 0, rotation: 0 };
    penguin.position.set(slot.x, NPC_STAND_Y, slot.z);
    penguin.rotation.y = slot.rotation;

    const inner = penguin.children[0];
    const { buildPartMerged } = createPenguinBuilder(THREE);
    if (inner) {
        applyNpcCosmetics(inner, buildPartMerged, cosmetics);
    }

    group.add(penguin);

    if (stand.userData.collision) {
        group.userData.collision = { ...stand.userData.collision };
    }

    group.rotation.y = npcDef.rotation || 0;
    group.userData.npcId = npcDef.id;
    group.userData.isWorldNpc = true;

    return group;
}

// ---------------------------------------------------------------------------
// Fishing shack — Old Salty
// ---------------------------------------------------------------------------

function buildFishingShack(THREE, npcDef) {
    const stand = new THREE.Group();
    stand.name = 'fishing_shack';
    const mat = getMaterialManager(THREE);
    const geo = getGeometryManager(THREE);
    const wood = mat.get(PropColors.plankMedium, { roughness: 0.9 });
    const darkWood = mat.get(PropColors.plankDark, { roughness: 0.85 });
    const lightWood = mat.get(PropColors.plankLight, { roughness: 0.88 });
    const snow = mat.get(PropColors.snowLight, { roughness: 0.65 });
    const rope = mat.get(PropColors.barkMedium, { roughness: 0.95 });
    const ice = mat.get(PropColors.iceBlue, { roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });

    // --- Dock deck (plank boards) ---
    for (let i = -2; i <= 2; i++) {
        const plank = new THREE.Mesh(geo.box(1.05, 0.12, 0.38), i % 2 === 0 ? wood : lightWood);
        plank.position.set(i * 1.05, 0.06, -0.2);
        plank.receiveShadow = true;
        stand.add(plank);
    }
    const deckFrame = new THREE.Mesh(geo.box(5.6, 0.18, 4.2), darkWood);
    deckFrame.position.set(0, 0.02, -0.3);
    deckFrame.receiveShadow = true;
    stand.add(deckFrame);

    // --- Back wall + side walls (open-front shack) ---
    const backWall = new THREE.Mesh(geo.box(5.0, 2.6, 0.22), darkWood);
    backWall.position.set(0, 1.4, -2.35);
    backWall.castShadow = true;
    stand.add(backWall);

    [-2.35, 2.35].forEach((sx) => {
        const side = new THREE.Mesh(geo.box(0.22, 2.2, 2.8), wood);
        side.position.set(sx, 1.2, -1.0);
        side.castShadow = true;
        stand.add(side);
    });

    // Horizontal plank trim on back wall
    [0.9, 1.5, 2.1].forEach((y) => {
        const trim = new THREE.Mesh(geo.box(4.8, 0.08, 0.06), lightWood);
        trim.position.set(0, y, -2.22);
        stand.add(trim);
    });

    // --- Sloped shingle roof ---
    const roofLeft = new THREE.Mesh(geo.box(2.9, 0.14, 2.6), mat.get('#3d2e22', { roughness: 0.85 }));
    roofLeft.position.set(-1.35, 2.85, -1.6);
    roofLeft.rotation.z = 0.28;
    roofLeft.castShadow = true;
    stand.add(roofLeft);
    const roofRight = roofLeft.clone();
    roofRight.position.set(1.35, 2.85, -1.6);
    roofRight.rotation.z = -0.28;
    stand.add(roofRight);
    addSnowCap(stand, { x: 0, y: 3.05, z: -1.5 }, geo, snow, 1.4, 0.35);

    // --- Striped awning over counter ---
    const awningColors = ['#1a3a5c', '#f0f0f0'];
    for (let i = 0; i < 8; i++) {
        const stripe = new THREE.Mesh(geo.box(0.55, 0.06, 1.6), mat.get(awningColors[i % 2], { roughness: 0.9 }));
        stripe.position.set(-1.9 + i * 0.55, 2.35, 0.35);
        stripe.rotation.x = -0.12;
        stand.add(stripe);
    }

    // --- Counter ---
    const counter = new THREE.Mesh(geo.box(4.4, 0.95, 0.75), lightWood);
    counter.position.set(0, 0.58, 0.55);
    counter.castShadow = true;
    stand.add(counter);
    const counterTop = new THREE.Mesh(geo.box(4.5, 0.06, 0.82), mat.get(PropColors.plankDark, { roughness: 0.7 }));
    counterTop.position.set(0, 1.08, 0.55);
    stand.add(counterTop);

    // --- Front-hanging sign (clear of awning + roof) ---
    mountFrontSign(stand, THREE, { x: 0, y: 4.15, z: 1.85, postSpread: 1.6 }, {
        title: "OLD SALTY'S",
        subtitle: 'Fish Buyer',
        emoji: '🐟',
        accent: ['#0c4a6e', '#0369a1', '#0c4a6e'],
        border: '#7dd3fc',
        text: '#ffffff',
        scale: [3.8, 1.25, 1]
    });

    // Wooden plaque on back wall (decoration only)
    const plaque = new THREE.Mesh(geo.box(2.6, 0.7, 0.1), darkWood);
    plaque.position.set(0, 2.55, -2.12);
    stand.add(plaque);

    // --- Props: barrels, ice crate, net post ---
    new Barrel(THREE, 'medium').spawn(stand, -2.0, 0, -0.8);
    new Barrel(THREE, 'medium').spawn(stand, 2.1, 0, -0.6);
    new Barrel(THREE, 'small').spawn(stand, -2.3, 0, 0.9);

    const iceCrate = new THREE.Mesh(geo.box(1.2, 0.55, 0.95), wood);
    iceCrate.position.set(1.85, 0.35, 0.85);
    stand.add(iceCrate);
    const iceBed = new THREE.Mesh(geo.box(1.05, 0.12, 0.8), ice);
    iceBed.position.set(1.85, 0.68, 0.85);
    stand.add(iceBed);
    addFishDisplay(stand, THREE, mat, geo, 1.75, 0.82, 0.8);
    addFishDisplay(stand, THREE, mat, geo, 2.0, 0.78, 0.95, 0.8);

    // Net post
    const netPost = new THREE.Mesh(geo.cylinder(0.07, 0.09, 2.4, 6), rope);
    netPost.position.set(-1.6, 1.2, -1.8);
    stand.add(netPost);
    const netRing = new THREE.Mesh(geo.torus(0.35, 0.025, 6, 12), mat.get('#8899aa', { roughness: 0.6, transparent: true, opacity: 0.7 }));
    netRing.position.set(-1.6, 2.0, -1.5);
    netRing.rotation.x = Math.PI / 2;
    stand.add(netRing);

    // Lantern
    addHangingLantern(stand, THREE, mat, geo, 0.6, 2.15, 0.7, '#ffcc77');

    // Snow drifts
    new SnowPile(THREE, 'small').spawn(stand, -2.8, 0, 1.2);
    new SnowPile(THREE, 'small').spawn(stand, 2.6, 0, 1.4);

    stand.userData.collision = { type: 'box', size: { x: 5.5, z: 4.2 }, height: 3.2 };
    // Behind counter, facing shack opening (+Z)
    stand.userData.npcSlot = { x: 0, z: -0.1, rotation: 0 };
    return stand;
}

// ---------------------------------------------------------------------------
// Supply stall — Copper Clive
// ---------------------------------------------------------------------------

function buildSupplyStall(THREE, npcDef) {
    const stand = new THREE.Group();
    stand.name = 'supply_stall';
    const mat = getMaterialManager(THREE);
    const geo = getGeometryManager(THREE);
    const wood = mat.get(PropColors.plankMedium, { roughness: 0.9 });
    const darkWood = mat.get(PropColors.plankDark, { roughness: 0.85 });
    const lightWood = mat.get(PropColors.plankLight, { roughness: 0.88 });
    const snow = mat.get(PropColors.snowLight, { roughness: 0.65 });
    const metal = mat.get(PropColors.metalMedium, { roughness: 0.45, metalness: 0.55 });

    // Raised platform
    const platform = new THREE.Mesh(geo.box(5.0, 0.22, 3.8), darkWood);
    platform.position.set(0, 0.11, 0);
    platform.receiveShadow = true;
    stand.add(platform);
    for (let i = -2; i <= 2; i++) {
        const plank = new THREE.Mesh(geo.box(0.95, 0.08, 3.5), i % 2 === 0 ? wood : lightWood);
        plank.position.set(i * 0.95, 0.26, 0);
        plank.receiveShadow = true;
        stand.add(plank);
    }

    // Corner posts with snow caps
    const postPositions = [[-2.15, -1.55], [2.15, -1.55], [-2.15, 1.55], [2.15, 1.55]];
    postPositions.forEach(([px, pz]) => {
        const post = new THREE.Mesh(geo.cylinder(0.1, 0.12, 2.75, 8), wood);
        post.position.set(px, 1.5, pz);
        post.castShadow = true;
        stand.add(post);
        addSnowCap(stand, { x: px, y: 2.95, z: pz }, geo, snow, 0.22, 0.12);
        // Metal band
        const band = new THREE.Mesh(geo.torus(0.11, 0.018, 6, 12), metal);
        band.position.set(px, 1.0, pz);
        band.rotation.x = Math.PI / 2;
        stand.add(band);
    });

    // Striped market canopy
    const stripeColors = ['#8B4513', '#D2691E', '#8B4513', '#D2691E', '#8B4513'];
    stripeColors.forEach((color, i) => {
        const stripe = new THREE.Mesh(geo.box(1.0, 0.07, 3.4), mat.get(color, { roughness: 0.92 }));
        stripe.position.set(-2.0 + i * 1.0, 2.78, 0);
        stand.add(stripe);
    });
    const canopyValance = new THREE.Mesh(geo.box(5.1, 0.12, 0.25), mat.get('#5c3317', { roughness: 0.9 }));
    canopyValance.position.set(0, 2.65, 1.7);
    stand.add(canopyValance);

    // Back shelving wall
    const backWall = new THREE.Mesh(geo.box(4.6, 2.0, 0.18), darkWood);
    backWall.position.set(0, 1.25, -1.65);
    backWall.castShadow = true;
    stand.add(backWall);

    // Counter
    const counter = new THREE.Mesh(geo.box(4.0, 0.9, 0.72), lightWood);
    counter.position.set(0, 0.62, 1.05);
    counter.castShadow = true;
    stand.add(counter);

    // Front-hanging sign — in front of canopy, not inside roof geometry
    mountFrontSign(stand, THREE, { x: 0, y: 4.2, z: 2.45, postSpread: 1.7 }, {
        title: "COPPER CLIVE'S",
        subtitle: 'Supply & Gear',
        emoji: '🔧',
        accent: ['#5c3317', '#8B5A2b', '#5c3317'],
        border: '#fbbf24',
        text: '#fff8e7',
        scale: [3.8, 1.25, 1]
    });

    // Backpack display shelf
    const shelf = new THREE.Mesh(geo.box(1.4, 0.08, 0.6), darkWood);
    shelf.position.set(-1.35, 1.35, -1.2);
    stand.add(shelf);
    const pack = new THREE.Mesh(geo.box(0.65, 0.8, 0.4), mat.get('#4a3525', { roughness: 0.9 }));
    pack.position.set(-1.35, 1.75, -1.2);
    pack.castShadow = true;
    stand.add(pack);
    [[-1.5, 1.95], [-1.2, 1.95]].forEach(([sx, sy]) => {
        const strap = new THREE.Mesh(geo.box(0.07, 0.45, 0.07), mat.get('#6B4423', { roughness: 0.9 }));
        strap.position.set(sx, sy, -1.05);
        stand.add(strap);
    });

    // Tool rack
    const rackBoard = new THREE.Mesh(geo.box(0.1, 1.5, 1.3), darkWood);
    rackBoard.position.set(1.75, 1.35, -1.25);
    stand.add(rackBoard);
    addToolOnRack(stand, THREE, mat, geo, 1.88, 1.75, -1.05, 'pickaxe');
    addToolOnRack(stand, THREE, mat, geo, 1.88, 1.45, -1.35, 'axe');

    // Crates & barrels
    new Crate(THREE, 'medium').spawn(stand, -1.6, 0.22, -0.4);
    new Crate(THREE, 'small').spawn(stand, 1.5, 0.22, -0.3);
    new Barrel(THREE, 'small').spawn(stand, 0.5, 0.22, -0.9);

    // Side lantern post
    addHangingLantern(stand, THREE, mat, geo, 2.3, 2.4, 1.5, '#ffaa55');

    new SnowPile(THREE, 'small').spawn(stand, -2.7, 0, 0.5);
    new SnowPile(THREE, 'medium').spawn(stand, 2.8, 0, -0.2);

    stand.userData.collision = { type: 'box', size: { x: 5.0, z: 3.8 }, height: 3.0 };
    stand.userData.npcSlot = { x: 0, z: 0.35, rotation: 0 };
    return stand;
}

// ---------------------------------------------------------------------------
// Shared builders
// ---------------------------------------------------------------------------

/**
 * Hanging sign on front posts — sits in front of roof/canopy, never inside geometry.
 */
function mountFrontSign(stand, THREE, mount, spriteOpts) {
    const { x, y, z, postSpread = 1.6 } = mount;
    const mat = getMaterialManager(THREE);
    const geo = getGeometryManager(THREE);
    const wood = mat.get(PropColors.plankDark, { roughness: 0.9 });
    const postHeight = y - 0.35;

    [-1, 1].forEach((side) => {
        const post = new THREE.Mesh(geo.cylinder(0.06, 0.08, postHeight, 6), wood);
        post.position.set(x + side * postSpread, postHeight / 2, z);
        post.castShadow = true;
        stand.add(post);
    });

    const beam = new THREE.Mesh(geo.box(postSpread * 2 + 0.3, 0.08, 0.1), wood);
    beam.position.set(x, y - 0.55, z);
    stand.add(beam);

    const sign = createShopSignSprite(THREE, spriteOpts);
    sign.position.set(x, y, z + 0.2);
    sign.renderOrder = 10;
    stand.add(sign);
    stand.userData.signSprite = sign;
    return sign;
}

/**
 * Camera-facing shop sign (matches TownCenter floating_title style).
 */
function createShopSignSprite(THREE, opts) {
    const {
        title,
        subtitle = '',
        emoji = '',
        accent = ['#0c4a6e', '#0369a1', '#0c4a6e'],
        border = '#7dd3fc',
        text = '#ffffff',
        scale = [4, 1.2, 1]
    } = opts;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, accent[0]);
    grad.addColorStop(0.5, accent[1]);
    grad.addColorStop(1, accent[2] || accent[0]);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(12, 12, canvas.width - 24, canvas.height - 24, 18);
    ctx.fill();

    ctx.strokeStyle = border;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 6;
    ctx.fillStyle = text;
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleText = emoji ? `${emoji} ${title}` : title;
    ctx.fillText(titleText, canvas.width / 2, subtitle ? 58 : 80);

    if (subtitle) {
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillStyle = border;
        ctx.fillText(subtitle, canvas.width / 2, 108);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
        depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale[0], scale[1], scale[2] || 1);
    sprite.name = 'shop_sign_sprite';
    return sprite;
}

function addSnowCap(parent, pos, geo, snowMat, radius, height) {
    const cap = new THREE.Mesh(geo.sphere(radius, 8, 6), snowMat);
    cap.position.set(pos.x, pos.y, pos.z);
    cap.scale.set(1.2, height, 1.2);
    parent.add(cap);
}

function addHangingLantern(parent, THREE, mat, geo, x, y, z, glowColor) {
    const chain = new THREE.Mesh(geo.cylinder(0.02, 0.02, 0.35, 4), mat.get(PropColors.metalDark, { metalness: 0.6 }));
    chain.position.set(x, y + 0.18, z);
    parent.add(chain);
    const housing = new THREE.Mesh(geo.box(0.22, 0.28, 0.22), mat.get(PropColors.metalMedium, { metalness: 0.5 }));
    housing.position.set(x, y, z);
    parent.add(housing);
    const glow = new THREE.Mesh(geo.sphere(0.1, 8, 6), mat.get(glowColor, {
        emissive: glowColor,
        emissiveIntensity: 0.65,
        roughness: 0.3
    }));
    glow.position.set(x, y - 0.02, z);
    parent.add(glow);
}

function addFishDisplay(parent, THREE, mat, geo, x, y, z, scale = 1) {
    const body = new THREE.Mesh(geo.box(0.42 * scale, 0.14 * scale, 0.2 * scale), mat.get('#e07040', { roughness: 0.5 }));
    body.position.set(x, y, z);
    body.rotation.y = 0.35;
    parent.add(body);
    const tail = new THREE.Mesh(geo.box(0.14 * scale, 0.1 * scale, 0.14 * scale), mat.get('#c05830', { roughness: 0.5 }));
    tail.position.set(x - 0.22 * scale, y, z - 0.08);
    tail.rotation.y = 0.5;
    parent.add(tail);
}

function addToolOnRack(parent, THREE, mat, geo, x, y, z, type) {
    const wood = mat.get(PropColors.plankDark, { roughness: 0.9 });
    const metal = mat.get(PropColors.metalLight, { roughness: 0.35, metalness: 0.65 });
    const handle = new THREE.Mesh(geo.cylinder(0.035, 0.04, 0.85, 5), wood);
    handle.position.set(x, y - 0.2, z);
    handle.rotation.z = type === 'pickaxe' ? -0.55 : 0.15;
    parent.add(handle);
    if (type === 'pickaxe') {
        const head = new THREE.Mesh(geo.box(0.42, 0.09, 0.09), metal);
        head.position.set(x + 0.12, y + 0.15, z);
        head.rotation.z = -0.55;
        parent.add(head);
    } else {
        const head = new THREE.Mesh(geo.box(0.28, 0.22, 0.07), metal);
        head.position.set(x + 0.08, y + 0.1, z);
        parent.add(head);
    }
}

/** Attach bespoke NPC-only props (standard cosmetics come from appearance). */
function applyNpcCosmetics(inner, buildPartMerged, cosmetics) {
    if (cosmetics.fisherHat) addFisherHat(inner, buildPartMerged);
    if (cosmetics.fishingRod) addFishingRod(inner, buildPartMerged);
    if (cosmetics.handPickaxe) addHandPickaxe(inner, buildPartMerged);
}

/** Voxel fisherman hat — same coordinate space as ASSETS.HATS (y≈10 on head). */
function addFisherHat(inner, buildPartMerged) {
    const voxels = [];
    const yellow = '#E8C040';
    const band = '#334455';
    for (let x = -6; x <= 6; x++) {
        for (let z = -6; z <= 6; z++) {
            if (x * x + z * z < 40) voxels.push({ x, y: 10, z, c: yellow });
        }
    }
    for (let x = -3; x <= 3; x++) {
        for (let z = -3; z <= 3; z++) {
            if (x * x + z * z < 10) {
                for (let y = 11; y < 13; y++) voxels.push({ x, y, z, c: yellow });
            }
        }
    }
    for (let x = -4; x <= 4; x++) {
        if (Math.abs(x) > 1) voxels.push({ x, y: 11, z: 0, c: band });
    }
    const hat = buildPartMerged(voxels, PALETTE);
    hat.name = 'fisher_hat';
    inner.add(hat);
}

/** Rod held in right flipper — grip, reel, bent pole, line, and a catch. */
function addFishingRod(inner, buildPartMerged) {
    const flipperR = inner.getObjectByName('flipper_r');
    if (!flipperR) return;

    const wood = '#6b4423';
    const cork = '#c4a574';
    const reel = '#888888';
    const line = '#e8e8e8';
    const fish = '#e85d30';
    const fishLight = '#ff9955';
    const rodVoxels = [];

    for (let y = -2; y <= 1; y++) rodVoxels.push({ x: 0, y, z: 0, c: cork });
    rodVoxels.push({ x: 0, y: 1, z: 1, c: reel }, { x: 1, y: 1, z: 0, c: reel });
    for (let i = 0; i < 14; i++) {
        rodVoxels.push({ x: 0, y: 2 + Math.floor(i * 0.3), z: 1 + i, c: wood });
    }
    for (let i = 0; i < 8; i++) {
        rodVoxels.push({ x: 0, y: 6 - Math.floor(i * 0.25), z: 14 + i, c: line });
    }
    for (let x = -1; x <= 1; x++) {
        for (let z = 21; z <= 23; z++) rodVoxels.push({ x, y: 4, z, c: fish });
    }
    rodVoxels.push({ x: -2, y: 4, z: 22, c: fishLight }, { x: 2, y: 4, z: 22, c: fishLight });

    attachToFlipper(flipperR, buildPartMerged, rodVoxels, { x: -5, y: 0, z: 0 }, { x: -5, y: -1, z: 0 }, 'fishing_rod');
}

/** Mini pickaxe in left flipper — Copper Clive's signature prop. */
function addHandPickaxe(inner, buildPartMerged) {
    const flipperL = inner.getObjectByName('flipper_l');
    if (!flipperL) return;

    const wood = '#5c4033';
    const metal = '#b8b8b8';
    const metalDark = '#7a7a7a';
    const voxels = [];

    for (let y = -2; y <= 2; y++) voxels.push({ x: 0, y, z: 0, c: wood });
    for (let x = -2; x <= 2; x++) voxels.push({ x, y: 3, z: 0, c: metal });
    voxels.push({ x: -2, y: 2, z: 0, c: metalDark }, { x: 2, y: 2, z: 0, c: metalDark });
    voxels.push({ x: 0, y: 4, z: 0, c: metal });

    attachToFlipper(flipperL, buildPartMerged, voxels, { x: 5, y: 0, z: 0 }, { x: 5, y: -1, z: 1 }, 'hand_pickaxe');
}

function attachToFlipper(flipper, buildPartMerged, voxels, pivot, offset, name) {
    const localVoxels = voxels.map((v) => ({
        ...v,
        x: v.x + offset.x - pivot.x,
        y: v.y + offset.y - pivot.y,
        z: v.z + offset.z - pivot.z
    }));
    const prop = buildPartMerged(localVoxels, PALETTE);
    prop.name = name;
    flipper.add(prop);
}

export { createShopSignSprite };
