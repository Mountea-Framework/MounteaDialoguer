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
	findFileByName: async (fileName, options) => await findGoogleAppDataFile(fileName, options),
	listFiles: async ({ namePrefix } = {}, options) => await listGoogleAppDataFiles({ namePrefix }, options),
	downloadFile: async (fileId, options) => await downloadGoogleAppDataFile(fileId, options),
	createFile: async (payload, options) => await createGoogleAppDataFile(payload, options),
	updateFile: async (payload, options) => await updateGoogleAppDataFile(payload, options),
	deleteFile: async (fileId, options) => await deleteGoogleAppDataFile(fileId, options),
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

const API = `${import.meta.env.BASE_URL || '/'}api/sync`.replace(/\/{2,}/g, '/');

async function request(path, options = {}) {
	const response = await fetch(`${API}${path}`, options);
	if (response.status === 404) return null;
	if (!response.ok) {
		throw Object.assign(new Error(`Server ${response.status} on ${path}`), { code: 'SERVER_ERROR', status: response.status });
	}
	return response;
}

// Revision and deletion files are immutable and content-addressed, so a downloaded file never has to be fetched twice.
const downloadCache = new Map();
const IMMUTABLE_PREFIXES = ['mountea-revision-v2--', 'mountea-deletion-v2--'];
const isImmutable = (id) => IMMUTABLE_PREFIXES.some((prefix) => String(id).startsWith(prefix));

/** Storage contract used by the revision protocol: files are {id, name}; the id is the file name. */
const serverStorageProvider = Object.freeze({
	id: 'server',
	supportsCloudSync: true,
	findFileByName: async (fileName) => {
		const response = await request(`/files?name=${encodeURIComponent(fileName)}`);
		const { files = [] } = response ? await response.json() : {};
		return files[0] || null;
	},
	listFiles: async ({ namePrefix } = {}) => {
		const response = await request(`/files${namePrefix ? `?prefix=${encodeURIComponent(namePrefix)}` : ''}`);
		const { files = [] } = response ? await response.json() : {};
		return files;
	},
	downloadFile: async (fileId) => {
		if (downloadCache.has(fileId)) return downloadCache.get(fileId);
		const response = await request(`/files/${encodeURIComponent(fileId)}`);
		if (!response) throw Object.assign(new Error('Remote file not found'), { code: 'NOT_FOUND' });
		const text = await response.text();
		if (isImmutable(fileId)) downloadCache.set(fileId, text);
		return text;
	},
	createFile: async ({ name, content }) => {
		const response = await request('/files', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, content }),
		});
		return response.json();
	},
	updateFile: async ({ fileId, content }) => {
		const response = await request(`/files/${encodeURIComponent(fileId)}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content }),
		});
		downloadCache.delete(fileId);
		return response.json();
	},
	deleteFile: async (fileId) => {
		await request(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
		downloadCache.delete(fileId);
	},
});

const STORAGE_PROVIDERS = Object.freeze({
	googleDrive: googleDriveStorageProvider,
	steam: steamStorageProvider,
	server: serverStorageProvider,
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

/** True when the self-hosted sync server answers. */
export async function isSyncServerReachable({ signal, timeoutMs = 5000 } = {}) {
	const controller = new AbortController();
	const abort = () => controller.abort();
	const timer = setTimeout(abort, timeoutMs);
	if (signal?.aborted) abort();
	signal?.addEventListener('abort', abort, { once: true });
	try {
		const response = await fetch(`${import.meta.env.BASE_URL || '/'}api/health`.replace(/\/{2,}/g, '/'), { cache: 'no-store', signal: controller.signal });
		return response.ok;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
		signal?.removeEventListener('abort', abort);
	}
}
