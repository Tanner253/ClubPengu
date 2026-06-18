/**
 * Guided onboarding quest — teaches core gameplay loop (server authority).
 * Keep step ids in sync with src/config/onboardingQuest.js
 */

export const ONBOARDING_REWARD_GOLD = 10;

/** One-time gold for beating Sensei during onboarding (server grants on dojo_gold step). */
export const DOJO_SENSEI_WIN_GOLD = 1;

/** @typedef {{ id: string, label: string, hint: string }} OnboardingStepDef */

/** @type {OnboardingStepDef[]} */
export const ONBOARDING_STEPS = [
    {
        id: 'dojo_gold',
        label: 'Beat Sensei in Card Jitsu',
        hint: 'Win a match in the Dojo for 1g — then challenge players in town for gold wagers.',
    },
    {
        id: 'ferry_snow_forts',
        label: 'Ride the ferry to Snow Forts',
        hint: 'Find Captain Skipper at the town dock and buy a ticket.',
    },
    {
        id: 'catch_fish',
        label: 'Catch a fish',
        hint: 'Equip a rod, find an ice hole, and reel in a catch.',
    },
    {
        id: 'sell_fish',
        label: 'Sell fish to Old Salty',
        hint: 'Talk to Old Salty and sell your catch for gold.',
    },
    {
        id: 'ferry_forest',
        label: 'Ferry to Forest Trails',
        hint: 'From Snow Forts, take the ferry to Whiskerwood Forest.',
    },
    {
        id: 'chop_wood',
        label: 'Chop and harvest wood',
        hint: 'Equip an axe, chop a tree, and collect the logs.',
    },
    {
        id: 'ferry_town',
        label: 'Return to Town by ferry',
        hint: 'Use a travel ticket at the forest dock to sail back to town.',
    },
    {
        id: 'upgrade_backpack',
        label: 'Upgrade your backpack',
        hint: 'Visit Copper Clive in town — backpack upgrades cost harvested wood, not gold.',
    },
    {
        id: 'search_trash',
        label: 'Search a town trash can',
        hint: 'Walk up to any trash can in town and search it.',
    },
];

/** Ferry route id → quest step completed on arrival */
export const TRAVEL_ROUTE_QUEST_STEPS = {
    town_snow_forts: 'ferry_snow_forts',
    snow_forts_forest: 'ferry_forest',
    forest_town: 'ferry_town',
};

export function getOnboardingStepIds() {
    return ONBOARDING_STEPS.map((s) => s.id);
}

/** True when the player finished the intro quest (reward claimed or all steps done). */
export function isOnboardingQuestComplete(user) {
    if (!user?.onboardingQuest) return false;
    if (user.onboardingQuest.rewardClaimed) return true;
    const completed = user.onboardingQuest.completedSteps || [];
    const required = getOnboardingStepIds();
    return required.length > 0 && required.every((id) => completed.includes(id));
}

export function getOnboardingProgress(user) {
    const completed = user?.onboardingQuest?.completedSteps || [];
    const totalSteps = ONBOARDING_STEPS.length;
    const completedCount = ONBOARDING_STEPS.filter((s) => completed.includes(s.id)).length;
    return { completedCount, totalSteps, complete: isOnboardingQuestComplete(user) };
}

export function isTownTrashSpot(spotId) {
    return typeof spotId === 'string' && spotId.startsWith('town_trash_');
}
