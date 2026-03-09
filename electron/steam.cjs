const path = require('node:path');
const fs = require('node:fs');

const DEFAULT_STATE = Object.freeze({
	initialized: false,
	available: false,
	channel: 'desktop',
	appId: 0,
	steamId: '',
	personaName: '',
	overlayEnabled: false,
	error: '',
});

let steamworksModule = null;
let steamClient = null;
let steamState = { ...DEFAULT_STATE };

function toPositiveInt(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	if (parsed <= 0) return 0;
	return Math.floor(parsed);
}

function resolveDistributionChannel() {
	const raw = process.env.VITE_DIST_CHANNEL || process.env.MOUNTEA_DIST_CHANNEL || 'desktop';
	return String(raw).trim().toLowerCase();
}

function resolveSteamAppId() {
	const fromEnv = toPositiveInt(process.env.STEAM_APP_ID || process.env.VITE_STEAM_APP_ID);
	if (fromEnv > 0) return fromEnv;

	// Dev fallback: allow steam_appid.txt next to the executable.
	try {
		const appIdPath = path.join(process.cwd(), 'steam_appid.txt');
		if (!fs.existsSync(appIdPath)) return 0;
		const fileContent = fs.readFileSync(appIdPath, 'utf8');
		return toPositiveInt(fileContent.trim());
	} catch (error) {
		return 0;
	}
}

function safeCall(fn, fallback) {
	try {
		const value = fn();
		return value ?? fallback;
	} catch (error) {
		return fallback;
	}
}

function initializeSteamRuntime() {
	const channel = resolveDistributionChannel();
	const appId = resolveSteamAppId();

	steamState = {
		...DEFAULT_STATE,
		initialized: true,
		channel,
		appId,
	};

	if (channel !== 'steam') {
		steamState.error = 'Steam runtime disabled outside steam channel.';
		return steamState;
	}

	if (!appId) {
		steamState.error = 'Missing STEAM_APP_ID for steam channel.';
		return steamState;
	}

	try {
		steamworksModule = require('steamworks.js');
		steamClient = steamworksModule.init(appId);

		const steamId = safeCall(() => steamClient?.localplayer?.getSteamId?.(), '');
		const personaName = safeCall(() => steamClient?.localplayer?.getName?.(), '');

		steamState.available = Boolean(steamClient);
		steamState.steamId = steamId ? String(steamId) : '';
		steamState.personaName = personaName ? String(personaName) : '';
		steamState.error = '';

		if (typeof steamworksModule?.electronEnableSteamOverlay === 'function') {
			safeCall(() => steamworksModule.electronEnableSteamOverlay(), null);
			steamState.overlayEnabled = true;
		}
	} catch (error) {
		steamState.available = false;
		steamState.error = String(error?.message || 'Failed to initialize Steam runtime');
	}

	return { ...steamState };
}

function getSteamStatus() {
	return { ...steamState };
}

function openOverlay(dialog = 'Friends') {
	if (!steamState.available || !steamClient) return false;

	const normalizedDialog = String(dialog || 'Friends');
	const methods = [
		() => steamClient?.overlay?.activateDialog?.(normalizedDialog),
		() => steamClient?.overlay?.activate?.(normalizedDialog),
		() => steamClient?.localplayer?.activateGameOverlay?.(normalizedDialog),
	];

	for (const method of methods) {
		const result = safeCall(method, undefined);
		if (result !== undefined) {
			return true;
		}
	}

	return false;
}

function unlockAchievement(achievementId) {
	const id = String(achievementId || '').trim();
	if (!id) return { ok: false, error: 'Invalid achievement id' };
	if (!steamState.available || !steamClient) {
		return { ok: false, error: 'Steam runtime unavailable' };
	}

	const activated = safeCall(() => steamClient?.achievement?.activate?.(id), false);
	return {
		ok: Boolean(activated),
		error: activated ? '' : 'Activation returned false',
	};
}

module.exports = {
	initializeSteamRuntime,
	getSteamStatus,
	openOverlay,
	unlockAchievement,
};
