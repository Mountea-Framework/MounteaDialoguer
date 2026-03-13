function readFlag(rawValue, defaultValue = false) {
	if (rawValue === undefined || rawValue === null || rawValue === '') return defaultValue;
	const value = String(rawValue).trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(value)) return true;
	if (['0', 'false', 'no', 'off'].includes(value)) return false;
	return defaultValue;
}

export function getDistributionChannel() {
	const raw = import.meta.env.VITE_DIST_CHANNEL || 'desktop';
	return String(raw).trim().toLowerCase();
}

export function isSteamChannel() {
	return getDistributionChannel() === 'steam';
}

export function isGoogleSyncEnabled() {
	return readFlag(import.meta.env.VITE_ENABLE_GOOGLE_SYNC, true);
}
