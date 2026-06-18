/**
 * Updates ! / ? on an existing NPC marker sprite canvas.
 * @param {import('three').Sprite} sprite
 * @param {'!' | '?' | null} symbol
 */
export function updateNpcMarkerSymbol(sprite, symbol) {
    if (!sprite?.material?.map?.image) return;
    if (sprite.userData.symbol === symbol) return;
    sprite.userData.symbol = symbol;

    const size = 64;
    const canvas = sprite.material.map.image;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    if (symbol) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, 28, 0, Math.PI * 2);
        ctx.fillStyle = symbol === '!' ? '#FFD700' : '#88CCFF';
        ctx.fill();
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1a1a2e';
        ctx.fillText(symbol, size / 2, size / 2 + 2);
    }
    sprite.material.map.needsUpdate = true;
    sprite.visible = Boolean(symbol);
}

/** Vertical gap between the top of a shop banner and the quest marker. */
const MARKER_SIGN_GAP = 1.1;
/** Default height above penguin root when no shop banner exists. */
const MARKER_HEAD_Y = 2.85;

/**
 * Place ! / ? above the shop banner when present, otherwise above the NPC head.
 * Stand signs live on group.children[0] at the group origin, so sign local coords match group space.
 *
 * @param {import('three').Sprite} marker
 * @param {import('three').Group} group
 * @param {import('three').Object3D | null | undefined} penguin
 * @param {import('three').Sprite | null | undefined} signSprite
 */
export function attachNpcMarker(marker, group, penguin, signSprite) {
    if (marker.parent) marker.parent.remove(marker);

    if (signSprite) {
        group.add(marker);
        marker.userData.anchor = 'sign';
        marker.userData.signGap = MARKER_SIGN_GAP;
        syncNpcMarkerToSign(marker, signSprite);
        return;
    }

    if (penguin) {
        penguin.add(marker);
        marker.position.set(0, MARKER_HEAD_Y, 0);
    } else {
        group.add(marker);
        marker.position.set(0, 3.2, 0);
    }
    marker.userData.anchor = 'head';
}

/**
 * Keep marker stacked above a bobbing shop banner.
 * @param {import('three').Sprite} marker
 * @param {import('three').Sprite} signSprite
 */
export function syncNpcMarkerToSign(marker, signSprite) {
    if (!marker || !signSprite || marker.userData.anchor !== 'sign') return;
    const gap = marker.userData.signGap ?? MARKER_SIGN_GAP;
    const signTop = signSprite.position.y + signSprite.scale.y * 0.52;
    marker.position.set(signSprite.position.x, signTop + gap, signSprite.position.z);
}

/**
 * @param {typeof import('three')} THREE
 * @param {'!' | '?' | null} symbol
 */
export function createNpcMarkerSprite(THREE, symbol = '!') {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthTest: false,
        depthWrite: false
    }));
    sprite.scale.set(1.35, 1.35, 1);
    sprite.visible = false;
    sprite.renderOrder = 999;
    sprite.name = 'npc_marker';
    sprite.userData.symbol = null;
    updateNpcMarkerSymbol(sprite, symbol);
    return sprite;
}
