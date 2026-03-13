export const STEAM_ACHIEVEMENT_IDS = Object.freeze({
	EXAMPLE_PROJECT: 'ACH_EXAMPLE_PROJECT',
	FIRST_PROJECT: 'ACH_FIRST_PROJECT',
	POWER_USER_10H: 'ACH_POWER_USER_10H',
	FIRST_CONDITION: 'ACH_FIRST_CONDITION',
	FIRST_DECORATOR: 'ACH_FIRST_DECORATOR',
	FIRST_PARTICIPANT: 'ACH_FIRST_PARTICIPANT',
	FIRST_CATEGORY: 'ACH_FIRST_CATEGORY',
});

// Placeholder metadata for first pass. Icons can be replaced from Steamworks admin later.
export const STEAM_ACHIEVEMENTS = Object.freeze([
	{
		id: STEAM_ACHIEVEMENT_IDS.EXAMPLE_PROJECT,
		hidden: false,
		title: 'Example Builder',
		description: 'Generate the onboarding example project.',
		iconUnlocked: 'placeholder_unlocked',
		iconLocked: 'placeholder_locked',
	},
	{
		id: STEAM_ACHIEVEMENT_IDS.FIRST_PROJECT,
		hidden: false,
		title: 'Fresh Start',
		description: 'Create your first non-example project.',
		iconUnlocked: 'placeholder_unlocked',
		iconLocked: 'placeholder_locked',
	},
	{
		id: STEAM_ACHIEVEMENT_IDS.POWER_USER_10H,
		hidden: false,
		title: 'Power User',
		description: 'Spend 10 active hours in the app.',
		iconUnlocked: 'placeholder_unlocked',
		iconLocked: 'placeholder_locked',
	},
	{
		id: STEAM_ACHIEVEMENT_IDS.FIRST_CONDITION,
		hidden: true,
		title: 'First Condition',
		description: 'Create your first condition in a non-example project.',
		iconUnlocked: 'placeholder_unlocked',
		iconLocked: 'placeholder_locked',
	},
	{
		id: STEAM_ACHIEVEMENT_IDS.FIRST_DECORATOR,
		hidden: true,
		title: 'First Decorator',
		description: 'Create your first decorator in a non-example project.',
		iconUnlocked: 'placeholder_unlocked',
		iconLocked: 'placeholder_locked',
	},
	{
		id: STEAM_ACHIEVEMENT_IDS.FIRST_PARTICIPANT,
		hidden: true,
		title: 'First Participant',
		description: 'Create your first participant in a non-example project.',
		iconUnlocked: 'placeholder_unlocked',
		iconLocked: 'placeholder_locked',
	},
	{
		id: STEAM_ACHIEVEMENT_IDS.FIRST_CATEGORY,
		hidden: true,
		title: 'First Category',
		description: 'Create your first category in a non-example project.',
		iconUnlocked: 'placeholder_unlocked',
		iconLocked: 'placeholder_locked',
	},
]);
