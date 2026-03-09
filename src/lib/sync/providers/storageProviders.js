import {
	findAppDataFile as findGoogleAppDataFile,
	listAppDataFiles as listGoogleAppDataFiles,
	downloadAppDataFile as downloadGoogleAppDataFile,
	createAppDataFile as createGoogleAppDataFile,
	updateAppDataFile as updateGoogleAppDataFile,
} from '@/lib/sync/googleDriveClient';
import {
	DEFAULT_SYNC_PROVIDER_ID,
	normalizeSyncProviderId,
	supportsCloudSync,
} from '@/lib/sync/providers/providerRegistry';

function createUnsupportedProviderError(providerId) {
	return new Error(`Sync provider "${providerId}" does not support cloud sync`);
}

const googleDriveStorageProvider = Object.freeze({
	id: 'googleDrive',
	supportsCloudSync: true,
	findFileByName: async (fileName) => await findGoogleAppDataFile(fileName),
	listFiles: async ({ namePrefix } = {}) => await listGoogleAppDataFiles({ namePrefix }),
	downloadFile: async (fileId) => await downloadGoogleAppDataFile(fileId),
	createFile: async (payload) => await createGoogleAppDataFile(payload),
	updateFile: async (payload) => await updateGoogleAppDataFile(payload),
});

const steamStorageProvider = Object.freeze({
	id: 'steam',
	supportsCloudSync: false,
	findFileByName: async () => {
		throw createUnsupportedProviderError('steam');
	},
	listFiles: async () => {
		throw createUnsupportedProviderError('steam');
	},
	downloadFile: async () => {
		throw createUnsupportedProviderError('steam');
	},
	createFile: async () => {
		throw createUnsupportedProviderError('steam');
	},
	updateFile: async () => {
		throw createUnsupportedProviderError('steam');
	},
});

const STORAGE_PROVIDERS = Object.freeze({
	googleDrive: googleDriveStorageProvider,
	steam: steamStorageProvider,
});

export function resolveSyncProviderId(providerId) {
	return normalizeSyncProviderId(providerId) || DEFAULT_SYNC_PROVIDER_ID;
}

export function getSyncStorageProvider(providerId = DEFAULT_SYNC_PROVIDER_ID) {
	const resolved = resolveSyncProviderId(providerId);
	return STORAGE_PROVIDERS[resolved] || STORAGE_PROVIDERS[DEFAULT_SYNC_PROVIDER_ID];
}

export function assertCloudSyncStorageProvider(providerId = DEFAULT_SYNC_PROVIDER_ID) {
	const resolved = resolveSyncProviderId(providerId);
	if (!supportsCloudSync(resolved)) {
		throw createUnsupportedProviderError(resolved);
	}

	const provider = getSyncStorageProvider(resolved);
	if (!provider?.supportsCloudSync) {
		throw createUnsupportedProviderError(resolved);
	}
	return provider;
}
