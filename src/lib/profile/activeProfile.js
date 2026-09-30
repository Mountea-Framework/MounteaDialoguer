const ACTIVE_PROFILE_KEY = 'mountea-active-profile-id';
const DEFAULT_PROFILE_ID = 'local';
let generation = 0;
const listeners = new Set();
export function getProfileGeneration() { return generation; }
export function subscribeProfileChanges(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function notifyProfileChange(profileId) {
	generation += 1;
	for (const listener of listeners) listener(profileId, generation);
}
if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
	if (event.key === ACTIVE_PROFILE_KEY) notifyProfileChange(getActiveProfileId());
});

function sanitizeProfileId(rawValue) {
	const value = String(rawValue || '').trim();
	if (!value) return DEFAULT_PROFILE_ID;
	if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error('Invalid profile identifier. Use letters, numbers, underscores, or hyphens; profile identifiers must not alias another profile.');
	return value;
}

function canUseStorage() {
	return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getActiveProfileId() {
	if (!canUseStorage()) return DEFAULT_PROFILE_ID;
	const stored = window.localStorage.getItem(ACTIVE_PROFILE_KEY);
	return sanitizeProfileId(stored || DEFAULT_PROFILE_ID);
}

export function setActiveProfileId(profileId) {
	if (!canUseStorage()) return DEFAULT_PROFILE_ID;
	const normalized = sanitizeProfileId(profileId);
	const previous = getActiveProfileId();
	window.localStorage.setItem(ACTIVE_PROFILE_KEY, normalized);
	if (previous !== normalized) notifyProfileChange(normalized);
	return normalized;
}

export function resolveProfileIdFromSteamStatus(steamStatus) {
	const steamId = String(steamStatus?.steamId || '').trim();
	const isAvailable = Boolean(steamStatus?.available);
	if (isAvailable && steamId) {
		return sanitizeProfileId(`steam-${steamId}`);
	}
	return DEFAULT_PROFILE_ID;
}

export function initializeActiveProfileFromSteamStatus(steamStatus) {
	const profileId = resolveProfileIdFromSteamStatus(steamStatus);
	return setActiveProfileId(profileId);
}

export function buildProfileScopedKey(baseKey, profileId = getActiveProfileId()) {
	return `${String(baseKey || '').trim()}::${sanitizeProfileId(profileId)}`;
}

export function readProfileScopedItem(baseKey, fallback = '') {
	if (!canUseStorage()) return fallback;

	const scopedKey = buildProfileScopedKey(baseKey);
	const scopedValue = window.localStorage.getItem(scopedKey);
	if (scopedValue !== null) return scopedValue;

	// Legacy fallback for pre-profile data; migrate on first read.
	// Global historical settings belong to the local profile, never every Steam
	// account that happens to sign in on this machine.
	if (getActiveProfileId() !== DEFAULT_PROFILE_ID) return fallback;
	const legacyValue = window.localStorage.getItem(baseKey);
	if (legacyValue === null) return fallback;
	window.localStorage.setItem(scopedKey, legacyValue);
	return legacyValue;
}

export function writeProfileScopedItem(baseKey, value) {
	if (!canUseStorage()) return;
	const scopedKey = buildProfileScopedKey(baseKey);
	window.localStorage.setItem(scopedKey, value);
}
