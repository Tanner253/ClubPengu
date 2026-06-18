/**
 * Illuminated rooftop banner sprites for town buildings (Casino-style).
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
    scaleX = 16,
    scaleY = 4,
    primaryColor = '#FFD700',
    glowColor = '#FF8800',
    name = 'building_banner',
}) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = subtitle ? 320 : 256;
    const ctx = canvas.getContext('2d');

    const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const spaced = title.toUpperCase().split('').join('  ');
        ctx.font = 'bold 108px Impact, Haettenschweiler, Arial Black, sans-serif';

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 36;
        ctx.fillStyle = glowColor;
        ctx.globalAlpha = 0.55;
        ctx.fillText(spaced, 512, subtitle ? 118 : 128);

        ctx.shadowBlur = 16;
        ctx.fillStyle = primaryColor;
        ctx.globalAlpha = 0.92;
        ctx.fillText(spaced, 512, subtitle ? 118 : 128);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFF8E7';
        ctx.globalAlpha = 1;
        ctx.fillText(spaced, 512, subtitle ? 118 : 128);

        if (subtitle) {
            ctx.font = '600 42px Inter, system-ui, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = 0.9;
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
    group.add(sprite);

    const accent = new THREE.PointLight(
        parseInt(glowColor.replace('#', ''), 16) || 0xff8800,
        0.85,
        14
    );
    accent.position.set(0, y - 1.5, z - 1);
    group.add(accent);

    return sprite;
}

export default addBuildingBanner;
