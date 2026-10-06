import { getRepositoryContext } from '@/lib/db';

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
		'steamSyncDeleteFile',
	];
	for (const method of required) {
		if (typeof electronApi[method] !== 'function') {
			throw new Error('Steam sync bridge is unavailable');
		}
	}

	return electronApi;
}

async function resolveSteamSyncProfileId(electronApi) {
	const context = await getRepositoryContext();
	const status = await electronApi.getSteamStatus();
	context.assertCurrent();
	if (!status?.available || context.profileId !== `steam-${status.steamId}`) throw new Error('Steam profile is not active');
	return context.profileId;
}
export async function findSteamCloudFile(fileName) {
	const electronApi = assertSteamSyncApi();
	const profileId = await resolveSteamSyncProfileId(electronApi);
	return await electronApi.steamSyncFindFile({
		profileId,
		fileName,
	});
}

export async function listSteamCloudFiles({ namePrefix } = {}) {
	const electronApi = assertSteamSyncApi();
	const profileId = await resolveSteamSyncProfileId(electronApi);
	return await electronApi.steamSyncListFiles({
		profileId,
		namePrefix: String(namePrefix || ''),
	});
}

export async function downloadSteamCloudFile(fileId) {
	const electronApi = assertSteamSyncApi();
	const profileId = await resolveSteamSyncProfileId(electronApi);
	return await electronApi.steamSyncDownloadFile({
		profileId,
		fileId,
	});
}

export async function createSteamCloudFile(payload) {
	const electronApi = assertSteamSyncApi();
	const profileId = await resolveSteamSyncProfileId(electronApi);
	return await electronApi.steamSyncCreateFile({
		...payload,
		profileId,
	});
}

export async function updateSteamCloudFile(payload) {
	const electronApi = assertSteamSyncApi();
	const profileId = await resolveSteamSyncProfileId(electronApi);
	return await electronApi.steamSyncUpdateFile({
		...payload,
		profileId,
	});
}

export async function deleteSteamCloudFile(fileId) {
	const electronApi = assertSteamSyncApi();
	const profileId = await resolveSteamSyncProfileId(electronApi);
	return await electronApi.steamSyncDeleteFile({
		profileId,
		fileId,
	});
}
