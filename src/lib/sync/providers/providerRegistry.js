export const DEFAULT_SYNC_PROVIDER_ID = 'googleDrive';

export const SYNC_PROVIDER_CONFIGS = Object.freeze({
	googleDrive: Object.freeze({
		id: 'googleDrive',
		supportsCloudSync: true,
		requiresPassphrase: true,
	}),
	steam: Object.freeze({
		id: 'steam',
		supportsCloudSync: true,
		requiresPassphrase: false,
	}),
});

export const SYNC_PROVIDER_IDS = Object.freeze(Object.keys(SYNC_PROVIDER_CONFIGS));

export function normalizeSyncProviderId(value) {
	const normalized = String(value || '').trim();
	if (!normalized) return '';
	if (!SYNC_PROVIDER_IDS.includes(normalized)) return '';
	return normalized;
}

export function getSyncProviderConfig(providerId) {
	const normalized = normalizeSyncProviderId(providerId);
	if (!normalized) return null;
	return SYNC_PROVIDER_CONFIGS[normalized] || null;
}

export function supportsCloudSync(providerId) {
	const config = getSyncProviderConfig(providerId);
	return Boolean(config?.supportsCloudSync);
}
