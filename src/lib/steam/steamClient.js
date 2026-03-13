function getElectronApi() {
	if (typeof window === 'undefined') return null;
	return window.electronAPI || null;
}

export async function getSteamStatus() {
	const electronApi = getElectronApi();
	if (!electronApi?.isElectron || typeof electronApi.getSteamStatus !== 'function') {
		return {
			initialized: true,
			available: false,
			channel: 'web',
			appId: 0,
			steamId: '',
			personaName: '',
			overlayEnabled: false,
			launchedViaSteam: false,
			overlayRenderer: '',
			steamGameId: '',
			steamAppIdEnv: '',
			cloud: {
				available: false,
				enabledForAccount: false,
				enabledForApp: false,
				error: '',
			},
			error: 'Steam runtime unavailable in this environment',
		};
	}

	try {
		return await electronApi.getSteamStatus();
	} catch (error) {
		return {
			initialized: true,
			available: false,
			channel: 'desktop',
			appId: 0,
			steamId: '',
			personaName: '',
			overlayEnabled: false,
			launchedViaSteam: false,
			overlayRenderer: '',
			steamGameId: '',
			steamAppIdEnv: '',
			cloud: {
				available: false,
				enabledForAccount: false,
				enabledForApp: false,
				error: '',
			},
			error: String(error?.message || 'Failed to load Steam status'),
		};
	}
}

export async function openSteamOverlay(dialog = 'Friends') {
	const electronApi = getElectronApi();
	if (!electronApi?.isElectron || typeof electronApi.openSteamOverlay !== 'function') {
		return false;
	}

	try {
		const result = await electronApi.openSteamOverlay({ dialog });
		return Boolean(result?.ok);
	} catch (error) {
		return false;
	}
}

export async function setSteamRichPresence(entries = {}) {
	const electronApi = getElectronApi();
	if (!electronApi?.isElectron || typeof electronApi.setSteamRichPresence !== 'function') {
		return { ok: false, error: 'Steam runtime unavailable in this environment' };
	}

	try {
		return await electronApi.setSteamRichPresence({ entries });
	} catch (error) {
		return {
			ok: false,
			error: String(error?.message || 'Failed to set Steam rich presence'),
		};
	}
}

export async function unlockSteamAchievement(achievementId) {
	const id = String(achievementId || '').trim();
	if (!id) return { ok: false, error: 'Invalid achievement id' };

	const electronApi = getElectronApi();
	if (!electronApi?.isElectron || typeof electronApi.unlockSteamAchievement !== 'function') {
		return { ok: false, error: 'Steam runtime unavailable in this environment' };
	}

	try {
		return await electronApi.unlockSteamAchievement({ achievementId: id });
	} catch (error) {
		return { ok: false, error: String(error?.message || 'Failed to unlock achievement') };
	}
}
