/**
 * Client copy of onboarding quest labels — keep step ids in sync with server/config/onboardingQuest.js
 */

export const ONBOARDING_REWARD_GOLD = 10;

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
