const { pathToFileURL } = require('node:url');

function isTrustedRendererUrl(rawUrl, { distIndexPath, devServerUrl, isPackaged = false }) {
	try {
		const url = new URL(rawUrl);
		if (!isPackaged && devServerUrl) {
			const dev = new URL(devServerUrl);
			return ['http:', 'https:'].includes(dev.protocol) && url.origin === dev.origin && url.pathname === dev.pathname && url.search === dev.search && !url.username && !url.password;
		}
		const expected = pathToFileURL(distIndexPath);
		return url.protocol === 'file:' && url.host === expected.host && url.pathname === expected.pathname && !url.search;
	} catch { return false; }
}

function requireObject(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid IPC object');
}
function requireString(value, max = 4096, optional = false) {
	if ((optional && value === undefined) || (typeof value === 'string' && value.length <= max && (optional || value.length > 0))) return;
	throw new Error('Invalid IPC string');
}
function validatePayload(channel, payload, status) {
	if (['steam:get-status', 'credentials:status'].includes(channel)) { if (payload !== undefined) throw new Error('Unexpected IPC payload'); return; }
	if (channel.startsWith('shell:')) { requireString(payload); return; }
	requireObject(payload);
	if (channel.startsWith('credentials:')) {
		const expected = status?.available && status?.steamId ? `steam-${status.steamId}` : 'local';
		if (payload.profileId !== expected) throw new Error('Credential profile mismatch');
		if (!['googleDrive-account', 'googleDrive-passphrase'].includes(payload.key)) throw new Error('Unknown credential capability');
		if (channel === 'credentials:set') requireString(payload.value, 65536);
		return;
	}
	if (channel.startsWith('steam-sync:')) {
		if (!status?.available || !status.steamId || payload.profileId !== `steam-${status.steamId}`) throw new Error('Steam profile unavailable or mismatched');
		if (channel.endsWith('find-file')) requireString(payload.fileName, 255);
		if (channel.endsWith('list-files')) requireString(payload.namePrefix, 255, true);
		if (/download-file|update-file|delete-file/.test(channel)) requireString(payload.fileId, 255);
		if (/create-file|update-file/.test(channel)) {
			requireString(payload.name, 255, channel.endsWith('update-file'));
			requireString(payload.content, 32 * 1024 * 1024);
			requireString(payload.mimeType, 128, true);
			if (payload.appProperties !== undefined) {
				requireObject(payload.appProperties);
				if (JSON.stringify(payload.appProperties).length > 8192) throw new Error('IPC metadata exceeds limit');
			}
		}
		return;
	}
	if (channel === 'auth:start-google-oauth') {
		requireString(payload.clientId, 512);
		if (Object.keys(payload).some((key) => !['clientId', 'scopes'].includes(key))) throw new Error('Unknown OAuth argument');
		if (!Array.isArray(payload.scopes) || payload.scopes.length > 10 || payload.scopes.some((scope) => typeof scope !== 'string' || !['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.appdata', 'https://www.googleapis.com/auth/drive'].includes(scope))) throw new Error('Invalid OAuth scopes');
		return;
	}
	if (channel === 'auth:cancel-google-oauth') { if (Object.keys(payload).length) throw new Error('Unexpected OAuth argument'); return; }
	if (channel === 'dialog:save-file') {
		requireString(payload.fileBase64, 48 * 1024 * 1024);
		if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload.fileBase64)) throw new Error('Invalid file bytes');
		requireString(payload.defaultPath, 4096, true);
		requireString(payload.title, 256, true);
		if (payload.filters !== undefined) {
			if (!Array.isArray(payload.filters) || payload.filters.length > 20) throw new Error('Invalid file filters');
			for (const filter of payload.filters) {
				requireObject(filter); requireString(filter.name, 128);
				if (!Array.isArray(filter.extensions) || filter.extensions.length > 20 || filter.extensions.some((extension) => typeof extension !== 'string' || !/^[A-Za-z0-9*]{1,32}$/.test(extension))) throw new Error('Invalid file extension');
			}
		}
		return;
	}
	if (channel === 'steam:open-overlay') {
		if (!status?.available || !['Friends', 'Community', 'Players', 'Settings', 'OfficialGameGroup', 'Stats', 'Achievements'].includes(payload.dialog || 'Friends')) throw new Error('Invalid Steam overlay capability');
		return;
	}
	if (channel === 'steam:unlock-achievement') {
		if (!status?.available || !['EXAMPLE_PROJECT', 'FIRST_PROJECT', 'POWER_USER_10H', 'FIRST_CONDITION', 'FIRST_DECORATOR', 'FIRST_PARTICIPANT', 'FIRST_CATEGORY'].includes(payload.achievementId)) throw new Error('Invalid achievement capability');
		return;
	}
	if (channel === 'steam:set-rich-presence') {
		if (!status?.available) throw new Error('Steam unavailable');
		requireObject(payload.entries);
		if (Object.keys(payload.entries).length > 20) throw new Error('Too many presence entries');
		for (const [key, value] of Object.entries(payload.entries)) { requireString(key, 64); if (value !== null) requireString(value, 256, true); }
		return;
	}
	if (['menu:set-context', 'sync:trace'].includes(channel)) {
		if (JSON.stringify(payload).length > 8192) throw new Error('IPC payload exceeds limit');
		if (channel === 'menu:set-context') {
			for (const key of ['route', 'projectId', 'dialogueId', 'appLanguage', 'contentLocale']) requireString(payload[key], 256, true);
			if (payload.supportedContentLocales !== undefined && (!Array.isArray(payload.supportedContentLocales) || payload.supportedContentLocales.length > 100 || payload.supportedContentLocales.some((locale) => typeof locale !== 'string' || locale.length > 64))) throw new Error('Invalid menu locales');
		} else {
			requireString(payload.event, 128);
			if (payload.details !== undefined) requireObject(payload.details);
		}
		return;
	}
	throw new Error('Unknown IPC capability');
}

function createTrustedIpc({ ipcMain, getWindow, getPolicy, getSteamStatus, onRejected = () => {} }) {
	const authorize = (event, channel, payload) => {
		const contents = getWindow()?.webContents;
		if (!contents || event.sender !== contents || event.senderFrame !== contents.mainFrame || !isTrustedRendererUrl(event.senderFrame.url, getPolicy())) throw new Error('Untrusted IPC sender');
		validatePayload(channel, payload, getSteamStatus());
	};
	return {
		handle(channel, handler) { ipcMain.handle(channel, (event, payload) => { authorize(event, channel, payload); return handler(event, payload); }); },
		on(channel, handler) { ipcMain.on(channel, (event, payload) => { try { authorize(event, channel, payload); handler(event, payload); } catch (error) { onRejected(channel, error); } }); },
	};
}
module.exports = { isTrustedRendererUrl, validatePayload, createTrustedIpc };
