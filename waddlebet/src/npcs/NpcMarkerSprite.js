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
    // Above NPC head (parented to npc_penguin mesh, not the shop sign)
    sprite.position.set(0, 2.85, 0);
    sprite.visible = false;
    sprite.renderOrder = 999;
    sprite.name = 'npc_marker';
    sprite.userData.symbol = null;
    updateNpcMarkerSymbol(sprite, symbol);
    return sprite;
}
