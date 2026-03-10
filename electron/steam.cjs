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
	launchedViaSteam: false,
	overlayRenderer: '',
	steamGameId: '',
	steamAppIdEnv: '',
	error: '',
});

let steamworksModule = null;
let steamClient = null;
let steamState = { ...DEFAULT_STATE };
let overlayPrepared = false;
let cachedPackageMetadata = null;
const OVERLAY_DIALOG_VALUES = Object.freeze({
	Friends: 0,
	Community: 1,
	Players: 2,
	Settings: 3,
	OfficialGameGroup: 4,
	Stats: 5,
	Achievements: 6,
});
const DEFAULT_STEAM_CLOUD_STATUS = Object.freeze({
	available: false,
	enabledForAccount: false,
	enabledForApp: false,
	error: '',
});

function toPositiveInt(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return 0;
	if (parsed <= 0) return 0;
	return Math.floor(parsed);
}

function readPackageMetadata() {
	if (cachedPackageMetadata) return cachedPackageMetadata;

	const defaultMetadata = { channel: '', steamAppId: 0 };
	try {
		const packagePath = path.join(__dirname, '..', 'package.json');
		if (!fs.existsSync(packagePath)) {
			cachedPackageMetadata = defaultMetadata;
			return cachedPackageMetadata;
		}

		const raw = fs.readFileSync(packagePath, 'utf8');
		const parsed = JSON.parse(raw);
		cachedPackageMetadata = {
			channel: String(parsed?.mounteaDistChannel || '').trim().toLowerCase(),
			steamAppId: toPositiveInt(parsed?.mounteaSteamAppId || 0),
		};
		return cachedPackageMetadata;
	} catch (error) {
		cachedPackageMetadata = defaultMetadata;
		return cachedPackageMetadata;
	}
}

function resolveDistributionChannel() {
	const fromPackage = readPackageMetadata().channel;
	const raw =
		process.env.VITE_DIST_CHANNEL ||
		process.env.MOUNTEA_DIST_CHANNEL ||
		fromPackage ||
		'desktop';
	return String(raw).trim().toLowerCase();
}

function detectSteamLaunchContext() {
	const overlayRenderer = String(
		process.env.GAMEOVERLAYRENDERER64 || process.env.GAMEOVERLAYRENDERER || ''
	).trim();
	const steamGameId = String(process.env.SteamGameId || '').trim();
	const steamAppIdEnv = String(process.env.SteamAppId || '').trim();
	const launchedViaSteam = Boolean(overlayRenderer || steamGameId || steamAppIdEnv);

	return {
		launchedViaSteam,
		overlayRenderer,
		steamGameId,
		steamAppIdEnv,
	};
}

function resolveSteamAppId() {
	const fromEnv = toPositiveInt(process.env.STEAM_APP_ID || process.env.VITE_STEAM_APP_ID);
	if (fromEnv > 0) return fromEnv;
	const fromPackage = readPackageMetadata().steamAppId;
	if (fromPackage > 0) return fromPackage;

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

function normalizeSteamId(rawSteamId) {
	if (!rawSteamId) return '';
	if (typeof rawSteamId === 'string') return rawSteamId.trim();
	if (typeof rawSteamId === 'number' || typeof rawSteamId === 'bigint') {
		return String(rawSteamId);
	}
	if (typeof rawSteamId === 'object') {
		const steamId64 = rawSteamId.steamId64;
		if (steamId64 !== undefined && steamId64 !== null && steamId64 !== '') {
			return String(steamId64);
		}
		const steamId32 = rawSteamId.steamId32;
		if (steamId32 !== undefined && steamId32 !== null && steamId32 !== '') {
			return String(steamId32);
		}
		const accountId = rawSteamId.accountId;
		if (accountId !== undefined && accountId !== null && accountId !== '') {
			return String(accountId);
		}
	}
	return '';
}

function prepareSteamOverlayForElectron() {
	if (overlayPrepared) return true;

	const channel = resolveDistributionChannel();
	const appId = resolveSteamAppId();
	if (channel !== 'steam' || !appId) return false;

	try {
		if (!steamworksModule) {
			steamworksModule = require('steamworks.js');
		}
		if (typeof steamworksModule?.electronEnableSteamOverlay !== 'function') {
			return false;
		}
		steamworksModule.electronEnableSteamOverlay();
		overlayPrepared = true;
		return true;
	} catch (error) {
		return false;
	}
}

function initializeSteamRuntime() {
	const channel = resolveDistributionChannel();
	const appId = resolveSteamAppId();
	const launchContext = detectSteamLaunchContext();

	steamState = {
		...DEFAULT_STATE,
		initialized: true,
		channel,
		appId,
		launchedViaSteam: launchContext.launchedViaSteam,
		overlayRenderer: launchContext.overlayRenderer,
		steamGameId: launchContext.steamGameId,
		steamAppIdEnv: launchContext.steamAppIdEnv,
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
		if (!steamworksModule) {
			steamworksModule = require('steamworks.js');
		}
		steamClient = steamworksModule.init(appId);

		const rawSteamId = safeCall(() => steamClient?.localplayer?.getSteamId?.(), null);
		const steamId = normalizeSteamId(rawSteamId);
		const personaName = safeCall(() => steamClient?.localplayer?.getName?.(), '');

		steamState.available = Boolean(steamClient);
		steamState.steamId = steamId || '';
		steamState.personaName = personaName ? String(personaName) : '';
		steamState.error = '';

		const overlayHooked = prepareSteamOverlayForElectron();
		steamState.overlayEnabled = Boolean(overlayHooked && launchContext.launchedViaSteam);
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
	if (!steamState.launchedViaSteam) return false;

	const requestedDialog = String(dialog || 'Friends').trim() || 'Friends';
	const normalizedDialog =
		{
			friends: 'Friends',
			community: 'Community',
			players: 'Players',
			settings: 'Settings',
			officialgamegroup: 'OfficialGameGroup',
			stats: 'Stats',
			achievements: 'Achievements',
		}[requestedDialog.toLowerCase()] || 'Friends';
	const overlay = steamClient?.overlay;
	const dialogEnum = overlay?.Dialog;
	const activateDialogFn = overlay?.activateDialog;

	if (typeof activateDialogFn !== 'function') return false;

	// Keep one canonical call path to avoid opening a different Steam surface.
	const dialogValue =
		dialogEnum && Object.prototype.hasOwnProperty.call(dialogEnum, normalizedDialog)
			? dialogEnum[normalizedDialog]
			: OVERLAY_DIALOG_VALUES[normalizedDialog];

	if (dialogValue === undefined || dialogValue === null) return false;

	try {
		activateDialogFn(dialogValue);
		return true;
	} catch (error) {
		return false;
	}
}

function setRichPresence(entries = {}) {
	if (!steamState.available || !steamClient) {
		return { ok: false, error: 'Steam runtime unavailable' };
	}

	if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
		return { ok: false, error: 'Invalid rich presence payload' };
	}

	const setRichPresenceFn =
		steamClient?.localplayer?.setRichPresence ??
		steamClient?.setRichPresence ??
		steamworksModule?.localplayer?.setRichPresence ??
		null;
	if (typeof setRichPresenceFn !== 'function') {
		return { ok: false, error: 'setRichPresence is not available in Steam client' };
	}

	try {
		let applied = 0;
		for (const [rawKey, rawValue] of Object.entries(entries)) {
			const key = String(rawKey || '').trim();
			if (!key) continue;
			const value =
				rawValue === undefined || rawValue === null || rawValue === ''
					? null
					: String(rawValue);
			setRichPresenceFn(key, value);
			applied += 1;
		}
		return { ok: true, applied };
	} catch (error) {
		return {
			ok: false,
			error: String(error?.message || 'Failed to set rich presence'),
		};
	}
}

function getSteamCloudApi() {
	if (!steamState.available || !steamClient) return null;
	return steamClient?.cloud ?? steamworksModule?.cloud ?? null;
}

function getSteamCloudStatus() {
	const cloud = getSteamCloudApi();
	if (!cloud) return { ...DEFAULT_STEAM_CLOUD_STATUS };

	try {
		const enabledForAccount = Boolean(cloud?.isEnabledForAccount?.());
		const enabledForApp = Boolean(cloud?.isEnabledForApp?.());
		return {
			available: true,
			enabledForAccount,
			enabledForApp,
			error: '',
		};
	} catch (error) {
		return {
			available: false,
			enabledForAccount: false,
			enabledForApp: false,
			error: String(error?.message || 'Steam cloud status failed'),
		};
	}
}

function listSteamCloudFileNames() {
	const cloud = getSteamCloudApi();
	if (!cloud || typeof cloud?.listFiles !== 'function') {
		return [];
	}

	try {
		const files = cloud.listFiles();
		if (!Array.isArray(files)) return [];
		return files
			.map((item) => String(item?.name || '').trim())
			.filter(Boolean);
	} catch (error) {
		return [];
	}
}

function steamCloudFileExists(name) {
	const fileName = String(name || '').trim();
	if (!fileName) return false;

	const cloud = getSteamCloudApi();
	if (!cloud || typeof cloud?.fileExists !== 'function') {
		return false;
	}

	try {
		return Boolean(cloud.fileExists(fileName));
	} catch (error) {
		return false;
	}
}

function readSteamCloudFile(name) {
	const fileName = String(name || '').trim();
	if (!fileName) {
		throw new Error('Steam cloud file name is required');
	}

	const cloud = getSteamCloudApi();
	if (!cloud || typeof cloud?.readFile !== 'function') {
		throw new Error('Steam cloud read is unavailable');
	}

	const content = cloud.readFile(fileName);
	return typeof content === 'string' ? content : String(content || '');
}

function writeSteamCloudFile(name, content) {
	const fileName = String(name || '').trim();
	if (!fileName) return false;

	const cloud = getSteamCloudApi();
	if (!cloud || typeof cloud?.writeFile !== 'function') {
		return false;
	}

	try {
		return Boolean(cloud.writeFile(fileName, String(content || '')));
	} catch (error) {
		return false;
	}
}

function deleteSteamCloudFile(name) {
	const fileName = String(name || '').trim();
	if (!fileName) return false;

	const cloud = getSteamCloudApi();
	if (!cloud || typeof cloud?.deleteFile !== 'function') {
		return false;
	}

	try {
		return Boolean(cloud.deleteFile(fileName));
	} catch (error) {
		return false;
	}
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

function shutdownSteamRuntime() {
	try {
		if (steamworksModule && typeof steamworksModule.shutdown === 'function') {
			steamworksModule.shutdown();
		}
	} catch (error) {
		// Best-effort shutdown; quitting should proceed even if this fails.
	}

	steamClient = null;
	steamState = { ...steamState, available: false };
	return true;
}

module.exports = {
	initializeSteamRuntime,
	prepareSteamOverlayForElectron,
	getSteamStatus,
	openOverlay,
	setRichPresence,
	unlockAchievement,
	getSteamCloudStatus,
	listSteamCloudFileNames,
	steamCloudFileExists,
	readSteamCloudFile,
	writeSteamCloudFile,
	deleteSteamCloudFile,
	shutdownSteamRuntime,
};
