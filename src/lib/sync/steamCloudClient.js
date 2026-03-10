import { getActiveProfileId, setActiveProfileId } from '@/lib/profile/activeProfile';

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

function sanitizeProfileId(rawValue) {
	const value = String(rawValue || '').trim();
	if (!value) return 'local';
	return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function buildSteamProfileId(steamId) {
	const normalizedSteamId = String(steamId || '').trim();
	if (!normalizedSteamId) return '';
	return sanitizeProfileId(`steam-${normalizedSteamId}`);
}

async function resolveSteamSyncProfileId(electronApi) {
	const activeProfileId = sanitizeProfileId(getActiveProfileId());
	if (activeProfileId.startsWith('steam-') && activeProfileId !== 'steam-') {
		return activeProfileId;
	}

	try {
		if (typeof electronApi?.getSteamStatus === 'function') {
			const steamStatus = await electronApi.getSteamStatus();
			const isAvailable = Boolean(steamStatus?.available);
			const steamProfileId = buildSteamProfileId(steamStatus?.steamId);
			if (isAvailable && steamProfileId) {
				if (activeProfileId !== steamProfileId) {
					setActiveProfileId(steamProfileId);
					console.info(
						`[steam-sync] Corrected active profile from "${activeProfileId}" to "${steamProfileId}"`
					);
				}
				return steamProfileId;
			}
		}
	} catch (error) {
		console.warn('[steam-sync] Failed to resolve Steam profile id:', error);
	}

	return activeProfileId;
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
		profileId,
		...payload,
	});
}

export async function updateSteamCloudFile(payload) {
	const electronApi = assertSteamSyncApi();
	const profileId = await resolveSteamSyncProfileId(electronApi);
	return await electronApi.steamSyncUpdateFile({
		profileId,
		...payload,
	});
}
