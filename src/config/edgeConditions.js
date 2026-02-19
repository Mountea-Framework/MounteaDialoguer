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
