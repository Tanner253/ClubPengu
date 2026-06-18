/**
 * Illuminated floating banner sprites — same Vegas / nightclub visual language as Casino.js.
 */

/**
 * @param {typeof import('three')} THREE
 * @param {import('three').Group} group
 * @param {Object} opts
 * @param {string} opts.title - Main banner text
 * @param {string} [opts.subtitle] - Smaller line under title
 * @param {number} [opts.y] - Height above ground
 * @param {number} [opts.z] - Forward offset (front face +Z)
 * @param {number} [opts.scaleX]
 * @param {number} [opts.scaleY]
 * @param {string} [opts.primaryColor]
 * @param {string} [opts.glowColor]
 * @param {string} [opts.name]
 * @returns {import('three').Sprite}
 */
export function addBuildingBanner(THREE, group, {
    title,
    subtitle = '',
    y = 12,
    z = 8,
    scaleX = 22,
    scaleY = 5.5,
    primaryColor = '#FFD700',
    glowColor = '#FF8800',
    name = 'building_banner',
}) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = subtitle ? 300 : 256;
    const ctx = canvas.getContext('2d');

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const spaced = title.toUpperCase().split('').join('  ');
        const titleY = subtitle ? 108 : 128;
        ctx.font = 'bold 108px "Impact", "Haettenschweiler", "Arial Black", sans-serif';

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 40;
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.65;
        ctx.fillText(spaced, 512, titleY);

        ctx.shadowBlur = 18;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.88;
        ctx.fillText(spaced, 512, titleY);

        ctx.shadowBlur = 8;
        ctx.fillStyle = '#FFF8E7';
        ctx.globalAlpha = 1;
        ctx.fillText(spaced, 512, titleY);

        if (subtitle) {
            ctx.shadowBlur = 0;
            ctx.font = 'bold 40px "Impact", "Haettenschweiler", Arial, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = 0.92;
            ctx.fillText(subtitle, 512, 210);
        }
    };

    draw();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.name = name;
    sprite.scale.set(scaleX, scaleY, 1);
    sprite.position.set(0, y, z);
    sprite.renderOrder = 100;
    sprite.userData.isBuildingBanner = true;
    sprite.userData.bannerTitle = title;
    sprite.userData.baseY = y;
    sprite.userData.baseScaleX = scaleX;
    sprite.userData.baseScaleY = scaleY;
    group.add(sprite);

    const accent = new THREE.PointLight(
        parseInt(glowColor.replace('#', ''), 16) || 0xff8800,
        1.1,
        16
    );
    accent.position.set(0, y - 1.2, z - 0.8);
    group.add(accent);

    return sprite;
}

/** Gentle bob + pulse — matches casino_title_sign motion. */
export function animateBuildingBanner(sprite, time) {
    if (!sprite) return;
    const baseY = sprite.userData.baseY ?? sprite.position.y;
    const baseScaleX = sprite.userData.baseScaleX ?? sprite.scale.x;
    const baseScaleY = sprite.userData.baseScaleY ?? sprite.scale.y;
    const bobSpeed = sprite.userData.bobSpeed ?? 1.8;
    const bobAmount = sprite.userData.bobAmount ?? 0.22;

    sprite.position.y = baseY + Math.sin(time * bobSpeed) * bobAmount;
    const pulse = 1 + Math.sin(time * 2.5) * 0.03;
    sprite.scale.set(baseScaleX * pulse, baseScaleY * pulse, 1);
}

export default addBuildingBanner;
