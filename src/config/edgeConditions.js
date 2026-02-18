export const EDGE_CONDITION_DEFINITIONS = [
	{
		id: 'isFirstTime',
		name: 'isFirstTime',
		description: 'Checks whether this dialogue/branch is visited for the first time.',
		properties: [
			{ name: 'scope', type: 'string', defaultValue: 'dialogue' },
			{ name: 'key', type: 'string', defaultValue: '' },
		],
	},
	{
		id: 'isQuestActive',
		name: 'isQuestActive',
		description: 'Checks whether a quest is currently active.',
		properties: [{ name: 'questId', type: 'string', defaultValue: '' }],
	},
	{
		id: 'hasItemInInventory',
		name: 'hasItemInInventory',
		description: 'Checks whether an item exists in inventory with optional minimum count.',
		properties: [
			{ name: 'itemId', type: 'string', defaultValue: '' },
			{ name: 'count', type: 'int', defaultValue: 1 },
		],
	},
];

export const getConditionDefaultValues = (definition) => {
	const values = {};
	if (!definition?.properties) return values;

	definition.properties.forEach((property) => {
		values[property.name] = property.defaultValue ?? '';
	});

	return values;
};

export const createConditionInstance = (definition) => ({
	id: definition.id,
	name: definition.name,
	values: getConditionDefaultValues(definition),
	negate: false,
});
