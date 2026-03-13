const LOCALIZATION_LOCALE_OPTIONS = Object.freeze([
	{ code: 'en', label: 'English' },
	{ code: 'fr', label: 'French' },
	{ code: 'it', label: 'Italian' },
	{ code: 'de', label: 'German' },
	{ code: 'es-ES', label: 'Spanish (Spain)' },
	{ code: 'ar', label: 'Arabic' },
	{ code: 'bg', label: 'Bulgarian' },
	{ code: 'ca', label: 'Catalan' },
	{ code: 'cs', label: 'Czech' },
	{ code: 'da', label: 'Danish' },
	{ code: 'nl', label: 'Dutch' },
	{ code: 'fi', label: 'Finnish' },
	{ code: 'el', label: 'Greek' },
	{ code: 'hi', label: 'Hindi' },
	{ code: 'hu', label: 'Hungarian' },
	{ code: 'id', label: 'Indonesian' },
	{ code: 'ja', label: 'Japanese' },
	{ code: 'ko', label: 'Korean' },
	{ code: 'no', label: 'Norwegian' },
	{ code: 'pl', label: 'Polish' },
	{ code: 'pt-BR', label: 'Portuguese (Brazil)' },
	{ code: 'pt-PT', label: 'Portuguese (Portugal)' },
	{ code: 'ro', label: 'Romanian' },
	{ code: 'ru', label: 'Russian' },
	{ code: 'sk', label: 'Slovak' },
	{ code: 'sv', label: 'Swedish' },
	{ code: 'th', label: 'Thai' },
	{ code: 'tr', label: 'Turkish' },
	{ code: 'uk', label: 'Ukrainian' },
	{ code: 'vi', label: 'Vietnamese' },
	{ code: 'zh-Hans', label: 'Chinese (Simplified)' },
	{ code: 'zh-Hant', label: 'Chinese (Traditional)' },
]);

const LABEL_BY_LOCALE = new Map(
	LOCALIZATION_LOCALE_OPTIONS.map((option) => [option.code, option.label])
);

export function getLocalizationLocaleLabel(locale) {
	const tag = String(locale || '').trim();
	if (!tag) return '';
	return LABEL_BY_LOCALE.get(tag) || tag;
}

export { LOCALIZATION_LOCALE_OPTIONS };
