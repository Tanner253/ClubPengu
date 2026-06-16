/**
 * Tool upgrade chains — must own the previous tier before buying the next.
 * Keep in sync with src/config/toolTiers.js
 */

/** @type {Record<string, string[]>} */
export const TOOL_UPGRADE_CHAINS = {
    axe: ['basic_axe', 'iron_axe', 'steel_axe', 'master_axe'],
    /** Fishing rod line — must own previous tier in backpack */
    fishing_rod: ['basic_rod', 'iron_rod', 'pro_rod', 'master_rod'],
    /** Future pickaxe line */
    pickaxe: [],
};

export const TOOL_DISPLAY_NAMES = {
    basic_axe: 'Basic Axe',
    iron_axe: 'Iron Axe',
    steel_axe: 'Steel Axe',
    master_axe: 'Master Axe',
    basic_rod: 'Basic Rod',
    iron_rod: 'Iron Rod',
    pro_rod: 'Pro Rod',
    master_rod: 'Master Rod',
};

/**
 * @param {string} itemId
 * @returns {string | null}
 */
export function getPreviousTierToolId(itemId) {
    for (const chain of Object.values(TOOL_UPGRADE_CHAINS)) {
        const index = chain.indexOf(itemId);
        if (index > 0) return chain[index - 1];
        if (index === 0) return null;
    }
    return null;
}

/**
 * @param {string} itemId
 * @param {(toolId: string) => boolean} ownsTool
 * @returns {{ requiredItemId: string, message: string } | null}
 */
export function getToolPurchasePrerequisite(itemId, ownsTool) {
    const previousId = getPreviousTierToolId(itemId);
    if (!previousId) return null;
    if (ownsTool(previousId)) return null;

    const previousName = TOOL_DISPLAY_NAMES[previousId] || previousId;
    return {
        requiredItemId: previousId,
        message: `Buy ${previousName} first (must be in your backpack)`,
    };
}

export default TOOL_UPGRADE_CHAINS;
