/**
 * World NPC positions for server-side proximity checks.
 * Keep offsets in sync with src/config/worldNpcs.js + src/config/roomConfig.js
 */

const CENTER_X = 110;
const CENTER_Z = 110;

/** @type {Record<string, { room: string, x: number, z: number, radius: number }>} */
export const MERCHANT_LOCATIONS = {
    fish_buyer: {
        room: 'snow_forts',
        x: 18,
        z: 18,
        radius: 5.5
    },
    supply_merchant: {
        room: 'town',
        x: CENTER_X + 39.5,
        z: CENTER_Z + 50.2,
        radius: 7.5
    },
    forest_ranger: {
        room: 'forest_trails',
        x: 125,
        z: 58.2,
        radius: 5.5
    }
};

/**
 * @param {{ room?: string, position?: { x: number, z: number } } | null | undefined} player
 * @param {string} merchantId
 */
export function isPlayerNearMerchant(player, merchantId) {
    const loc = MERCHANT_LOCATIONS[merchantId];
    if (!loc || !player?.position) return false;
    if (player.room !== loc.room) return false;
    const dx = player.position.x - loc.x;
    const dz = player.position.z - loc.z;
    return Math.sqrt(dx * dx + dz * dz) <= loc.radius;
}

export default MERCHANT_LOCATIONS;
