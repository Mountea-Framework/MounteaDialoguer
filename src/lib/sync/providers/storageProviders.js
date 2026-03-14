import {
	findAppDataFile as findGoogleAppDataFile,
	listAppDataFiles as listGoogleAppDataFiles,
	downloadAppDataFile as downloadGoogleAppDataFile,
	createAppDataFile as createGoogleAppDataFile,
	updateAppDataFile as updateGoogleAppDataFile,
	deleteAppDataFile as deleteGoogleAppDataFile,
} from '@/lib/sync/googleDriveClient';
import {
	findSteamCloudFile,
	listSteamCloudFiles,
	downloadSteamCloudFile,
	createSteamCloudFile,
	updateSteamCloudFile,
	deleteSteamCloudFile,
} from '@/lib/sync/steamCloudClient';
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
	deleteFile: async (fileId) => await deleteGoogleAppDataFile(fileId),
});

const steamStorageProvider = Object.freeze({
	id: 'steam',
	supportsCloudSync: true,
	findFileByName: async (fileName) => await findSteamCloudFile(fileName),
	listFiles: async ({ namePrefix } = {}) => await listSteamCloudFiles({ namePrefix }),
	downloadFile: async (fileId) => await downloadSteamCloudFile(fileId),
	createFile: async (payload) => await createSteamCloudFile(payload),
	updateFile: async (payload) => await updateSteamCloudFile(payload),
	deleteFile: async (fileId) => await deleteSteamCloudFile(fileId),
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
