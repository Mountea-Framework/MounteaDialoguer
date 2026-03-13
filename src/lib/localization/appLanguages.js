import APP_LANGUAGE_OPTIONS from '../../../electron/shared/app-languages.json';

const APP_LANGUAGE_CODES = APP_LANGUAGE_OPTIONS.map((item) => String(item.code || '').trim()).filter(
	Boolean
);

function getAppLanguageLabel(code) {
	const normalized = String(code || '').trim();
	if (!normalized) return '';

	const exactMatch = APP_LANGUAGE_OPTIONS.find((item) => item.code === normalized);
	if (exactMatch) {
		return exactMatch.label;
	}

	const base = normalized.split('-')[0];
	const baseMatch = APP_LANGUAGE_OPTIONS.find((item) => item.code === base);
	if (baseMatch) {
		return baseMatch.label;
	}

	return '';
}

export { APP_LANGUAGE_OPTIONS, APP_LANGUAGE_CODES, getAppLanguageLabel };
