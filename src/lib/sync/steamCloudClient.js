import { getActiveProfileId } from '@/lib/profile/activeProfile';

function getElectronApi() {
	if (typeof window === 'undefined') return null;
	if (typeof window.electronAPI !== 'object' || !window.electronAPI) return null;
	return window.electronAPI;
}

function assertSteamSyncApi() {
	const electronApi = getElectronApi();
	if (!electronApi?.isElectron) {
		throw new Error('Steam sync is only available in Electron runtime');
	}

	const required = [
		'steamSyncFindFile',
		'steamSyncListFiles',
		'steamSyncDownloadFile',
		'steamSyncCreateFile',
		'steamSyncUpdateFile',
	];
	for (const method of required) {
		if (typeof electronApi[method] !== 'function') {
			throw new Error('Steam sync bridge is unavailable');
		}
	}

	return electronApi;
}

function getProfileId() {
	return String(getActiveProfileId() || 'local');
}

export async function findSteamCloudFile(fileName) {
	const electronApi = assertSteamSyncApi();
	return await electronApi.steamSyncFindFile({
		profileId: getProfileId(),
		fileName,
	});
}

export async function listSteamCloudFiles({ namePrefix } = {}) {
	const electronApi = assertSteamSyncApi();
	return await electronApi.steamSyncListFiles({
		profileId: getProfileId(),
		namePrefix: String(namePrefix || ''),
	});
}

export async function downloadSteamCloudFile(fileId) {
	const electronApi = assertSteamSyncApi();
	return await electronApi.steamSyncDownloadFile({
		profileId: getProfileId(),
		fileId,
	});
}

export async function createSteamCloudFile(payload) {
	const electronApi = assertSteamSyncApi();
	return await electronApi.steamSyncCreateFile({
		profileId: getProfileId(),
		...payload,
	});
}

export async function updateSteamCloudFile(payload) {
	const electronApi = assertSteamSyncApi();
	return await electronApi.steamSyncUpdateFile({
		profileId: getProfileId(),
		...payload,
	});
}
