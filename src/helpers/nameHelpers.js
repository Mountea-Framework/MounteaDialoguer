// Names for participants, categories, decorators, conditions and projects end up as Unreal
// gameplay tags and data table row names. Allowed: letters and digits.
// No spaces, dots (the dot separates tag levels), underscores or dashes (the Unreal importer rejects them).

export const NAME_PATTERN = /^[A-Za-z0-9]+$/;
export const NAME_RULE_TEXT = 'Use letters and numbers only (spaces are joined automatically)';

const capitalize = (word) => (word ? word[0].toUpperCase() + word.slice(1) : '');

/** "my cool name" -> "MyCoolName". Other characters are removed. */
export function toPascalName(input) {
	return String(input ?? '')
		.trim()
		.split(/\s+/)
		.map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
		.filter(Boolean)
		.map(capitalize)
		.join('');
}

/**
 * Used while typing. Leaves single words alone, but as soon as a space is typed the words are
 * joined in PascalCase. One trailing space is kept so the next letter gets capitalised.
 */
export function toPascalNameLive(input) {
	const value = String(input ?? '');
	if (!/\s/.test(value)) return value;
	const joined = toPascalName(value);
	return /\s$/.test(value) && joined ? `${joined} ` : joined;
}

export function isValidName(name) {
	return NAME_PATTERN.test(String(name ?? ''));
}
