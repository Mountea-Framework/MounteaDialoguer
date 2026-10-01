const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');
const { URL, URLSearchParams } = require('node:url');
const { app, BrowserWindow, Menu, dialog, ipcMain, shell, safeStorage } = require('electron');
const {
	initializeSteamRuntime,
	prepareSteamOverlayForElectron,
	getSteamStatus,
	openOverlay: openSteamOverlay,
	setRichPresence: setSteamRichPresence,
	unlockAchievement: unlockSteamAchievement,
	getSteamCloudStatus,
	listSteamCloudFileNames,
	readSteamCloudFile,
	writeSteamCloudFile,
	shutdownSteamRuntime,
} = require('./steam.cjs');
const {
	initMainProcessSentry,
	captureMainProcessException,
} = require('./sentry.cjs');

const { createTrustedIpc, isTrustedRendererUrl } = require('./security.cjs');
const { createCredentialVault } = require('./credentials.cjs');
const { createSteamFileTransport } = require('./steam-files.cjs');
const { appendDiagnostic, sanitizeDiagnostics } = require('./diagnostics.cjs');
let credentialVault;
function getCredentialVault() {
	if (!credentialVault) credentialVault = createCredentialVault({ safeStorage, directory: app.getPath('userData') });
	return credentialVault;
}
function rendererPolicy() { return { distIndexPath: getDistIndexPath(), devServerUrl: process.env.VITE_DEV_SERVER_URL, isPackaged: app.isPackaged }; }

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const LOOPBACK_HOST = '127.0.0.1';
const LOOPBACK_PATH = '/oauth/callback';
const configuredOAuthTimeoutMs = Number(process.env.MOUNTEA_OAUTH_TIMEOUT_MS || '');
const OAUTH_TIMEOUT_MS =
	Number.isFinite(configuredOAuthTimeoutMs) && configuredOAuthTimeoutMs > 0
		? configuredOAuthTimeoutMs
		: 60 * 1000;
const SUPPORT_URL = 'https://discord.gg/hCjh8e3Y9r';
const ISSUES_URL = 'https://github.com/Mountea-Framework/MounteaDialoguer/issues';
const APP_DISPLAY_NAME = 'Mountea Dialoguer';
const STEAM_SYNC_ROOT_FOLDER = 'steam-sync';

let mainWindow = null;
const DEFAULT_MENU_CONTEXT = Object.freeze({
	route: 'none',
	projectId: '',
	dialogueId: '',
	appLanguage: 'en',
	contentLocale: '',
	supportedContentLocales: [],
});
let menuContext = { ...DEFAULT_MENU_CONTEXT };
const SUPPORTED_LANGUAGES = require('./shared/app-languages.json');
const USER_DATA_DIR_ARG_PREFIX = '--user-data-dir=';
const USER_DATA_REROUTE_FLAG = '--mountea-user-data-reroute';

function configureLinuxRuntimeStability() {
	if (process.platform !== 'linux') return;

	const linuxSafeMode = String(process.env.MOUNTEA_ELECTRON_SAFE_MODE || '1').trim() !== '0';
	if (linuxSafeMode) {
		app.disableHardwareAcceleration();
		app.commandLine.appendSwitch('disable-gpu');
		app.commandLine.appendSwitch('disable-software-rasterizer');
	}

	const ozoneHint = String(process.env.ELECTRON_OZONE_PLATFORM_HINT || '').trim();
	if (!ozoneHint) {
		process.env.ELECTRON_OZONE_PLATFORM_HINT = 'x11';
		app.commandLine.appendSwitch('ozone-platform-hint', 'x11');
	}
}

function canUseUserDataPath(targetPath) {
	const resolvedPath = String(targetPath || '').trim();
	if (!resolvedPath) return false;
	try {
		fs.mkdirSync(resolvedPath, { recursive: true });
		fs.accessSync(resolvedPath, fs.constants.R_OK | fs.constants.W_OK);

		// Use a dedicated probe file. Chromium's SingletonLock can be a dangling symlink.
		const writeProbePath = path.join(resolvedPath, '.mountea_write_probe');
		fs.writeFileSync(writeProbePath, 'probe', { encoding: 'utf8', flag: 'w' });
		fs.unlinkSync(writeProbePath);

		return true;
	} catch {
		return false;
	}
}

function getUserDataFallbackCandidates() {
	const candidates = [];
	const envOverride = String(process.env.MOUNTEA_USER_DATA_DIR || '').trim();
	if (envOverride) {
		candidates.push(envOverride);
	}

	const localAppData = String(process.env.LOCALAPPDATA || '').trim();
	if (localAppData) {
		candidates.push(path.join(localAppData, APP_DISPLAY_NAME));
		candidates.push(path.join(localAppData, APP_DISPLAY_NAME, 'user-data'));
	}

	const tempPath = String(app.getPath('temp') || '').trim();
	if (tempPath) {
		candidates.push(path.join(tempPath, APP_DISPLAY_NAME, 'user-data'));
	}

	return [...new Set(candidates.filter(Boolean))];
}

function getUserDataDirFromProcessArgs() {
	for (const rawArg of process.argv || []) {
		const arg = String(rawArg || '');
		if (!arg.startsWith(USER_DATA_DIR_ARG_PREFIX)) continue;
		return arg.slice(USER_DATA_DIR_ARG_PREFIX.length).trim();
	}
	return '';
}

function ensureWritableUserDataPath() {
	const userDataDirFromArgs = getUserDataDirFromProcessArgs();
	if (userDataDirFromArgs && canUseUserDataPath(userDataDirFromArgs)) {
		return userDataDirFromArgs;
	}

	let defaultUserDataPath = '';
	try {
		defaultUserDataPath = String(app.getPath('userData') || '').trim();
	} catch {
		defaultUserDataPath = '';
	}

	if (canUseUserDataPath(defaultUserDataPath)) {
		return defaultUserDataPath;
	}

	for (const candidate of getUserDataFallbackCandidates()) {
		if (!canUseUserDataPath(candidate)) continue;

		if (!process.argv.includes(USER_DATA_REROUTE_FLAG)) {
			const relaunchArgs = (process.argv || [])
				.slice(1)
				.filter(
					(arg) =>
						!String(arg || '').startsWith(USER_DATA_DIR_ARG_PREFIX) &&
						String(arg || '') !== USER_DATA_REROUTE_FLAG
				);
			console.warn(
				`[startup] userData fallback requires relaunch: "${candidate}" (default "${defaultUserDataPath}")`
			);
			app.relaunch({
				args: [...relaunchArgs, `${USER_DATA_DIR_ARG_PREFIX}${candidate}`, USER_DATA_REROUTE_FLAG],
			});
			app.exit(0);
			process.exit(0);
		}

		app.setPath('userData', candidate);
		console.warn(
			`[startup] userData fallback activated: "${candidate}" (default "${defaultUserDataPath}")`
		);
		return candidate;
	}

	console.warn(
		`[startup] No writable userData path found; continuing with default "${defaultUserDataPath}".`
	);
	return defaultUserDataPath;
}

app.setName(APP_DISPLAY_NAME);
configureLinuxRuntimeStability();
ensureWritableUserDataPath();
initMainProcessSentry();

function reportMainProcessError(error, context = {}) {
	const safeContext = context && typeof context === 'object' ? context : {};
	console.error('[main] runtime error', {
		message: error?.message || String(error),
		...safeContext,
	});
	captureMainProcessException(error, safeContext);
}

let steamRuntimeState = {
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
};

// Must happen before app ready for Steam overlay injection switches.
prepareSteamOverlayForElectron();

function readDotEnvValueFromFile(envPath, key) {
	if (!fs.existsSync(envPath)) return '';

	let content = '';
	try {
		content = fs.readFileSync(envPath, 'utf8');
	} catch (error) {
		return '';
	}

	const lines = content.split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const separatorIndex = trimmed.indexOf('=');
		if (separatorIndex < 0) continue;

		const name = trimmed.slice(0, separatorIndex).trim();
		if (name !== key) continue;

		let value = trimmed.slice(separatorIndex + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		return value;
	}

	return '';
}

function readDotEnvValue(key) {
	const appRoot = path.join(__dirname, '..');
	const mode = String(process.env.NODE_ENV || '').trim().toLowerCase();
	const envCandidates = [
		'.env.local',
		mode ? `.env.${mode}.local` : '',
		mode ? `.env.${mode}` : '',
		'.env',
	].filter(Boolean);

	for (const candidate of envCandidates) {
		const value = readDotEnvValueFromFile(path.join(appRoot, candidate), key);
		if (value) return value;
	}

	return '';
}

function resolveDesktopOAuthClientId(payloadClientId) {
	return (
		readDotEnvValue('VITE_GOOGLE_CLIENT_ID_DESKTOP') ||
		process.env.VITE_GOOGLE_CLIENT_ID_DESKTOP ||
		payloadClientId ||
		''
	);
}

function resolveDesktopOAuthClientSecret(payloadClientSecret) {
	const resolved =
		readDotEnvValue('VITE_GOOGLE_CLIENT_SECRET_DESKTOP') ||
		process.env.VITE_GOOGLE_CLIENT_SECRET_DESKTOP ||
		payloadClientSecret ||
		'';

	const trimmed = typeof resolved === 'string' ? resolved.trim() : '';
	const lower = trimmed.toLowerCase();
	const looksLikePlaceholder =
		lower === 'your_desktop_client_secret' ||
		lower === 'your_client_secret' ||
		lower === '<your_desktop_client_secret>' ||
		lower === '<your_client_secret>';

	return looksLikePlaceholder ? '' : trimmed;
}

function toBase64Url(buffer) {
	return Buffer.from(buffer)
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');
}

function createPkcePair() {
	const codeVerifier = toBase64Url(crypto.randomBytes(48));
	const codeChallenge = toBase64Url(
		crypto.createHash('sha256').update(codeVerifier).digest()
	);
	return { codeVerifier, codeChallenge };
}

function getIconPath() {
	const candidates = [
		path.join(__dirname, '..', 'dist', 'mounteaDialoguerIcon.png'),
		path.join(__dirname, '..', 'public', 'mounteaDialoguerIcon.png'),
		path.join(__dirname, '..', 'mounteaDialoguerIcon.png'),
	];

	return candidates.find((candidate) => fs.existsSync(candidate));
}

function getDistIndexPath() {
	return path.join(__dirname, '..', 'dist', 'index.html');
}

function isAllowedExternalUrl(rawUrl) {
	try {
		const parsed = new URL(rawUrl);
		const protocol = String(parsed.protocol || '').toLowerCase();
		if (protocol === 'mailto:') {
			return true;
		}
		if (protocol !== 'https:') {
			return false;
		}

		const hostname = String(parsed.hostname || '').toLowerCase();
		if (!hostname) return false;

		if (
			hostname === 'localhost' ||
			hostname === '127.0.0.1' ||
			hostname === '::1' ||
			hostname.endsWith('.local')
		) {
			return false;
		}

		if (/^10\./.test(hostname)) return false;
		if (/^127\./.test(hostname)) return false;
		if (/^192\.168\./.test(hostname)) return false;
		if (/^169\.254\./.test(hostname)) return false;
		if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return false;

		return true;
	} catch (error) {
		return false;
	}
}

function isInternalNavigation(url) {
	return isTrustedRendererUrl(url, rendererPolicy());
}

function shouldBlockNativeShortcut(input = {}) {
	const key = String(input.key || '').toLowerCase();
	const hasPrimaryModifier = Boolean(input.control || input.meta);

	// Browser-like navigation and reload shortcuts should be disabled for desktop app UX.
	if (key === 'f5' || key === 'browserbackward' || key === 'browserforward') {
		return true;
	}
	if (input.alt && (key === 'left' || key === 'right')) {
		return true;
	}
	if (hasPrimaryModifier && (key === 'r' || key === 'l')) {
		return true;
	}
	if (key === 'f12') {
		return true;
	}
	if (hasPrimaryModifier && input.shift && key === 'i') {
		return true;
	}

	return false;
}

function sanitizeFileNameForSaveDialog(fileName, fallback = 'export.bin') {
	const normalized = String(fileName || '')
		.trim()
		.replace(/[<>:"/\\|?*]/g, '_')
		.split('').map((character) => character.charCodeAt(0) < 32 ? '_' : character).join('');
	return normalized || fallback;
}

function normalizeSaveDialogFilters(rawFilters = []) {
	if (!Array.isArray(rawFilters)) return [];
	return rawFilters
		.map((item) => {
			const name = String(item?.name || '').trim();
			const extensions = Array.isArray(item?.extensions)
				? item.extensions
						.map((extension) => String(extension || '').trim().replace(/^\./, ''))
						.filter(Boolean)
				: [];
			if (!name || extensions.length === 0) return null;
			return { name, extensions };
		})
		.filter(Boolean);
}

async function openPathInShell(targetPath) {
	const normalizedPath = String(targetPath || '').trim();
	if (!normalizedPath) return false;
	const openError = await shell.openPath(normalizedPath);
	return !openError;
}

async function openContainingFolderInShell(targetFilePath) {
	const normalizedFilePath = String(targetFilePath || '').trim();
	if (!normalizedFilePath) return false;

	try {
		if (fs.existsSync(normalizedFilePath)) {
			const stats = fs.statSync(normalizedFilePath);
			if (stats.isDirectory()) {
				return await openPathInShell(normalizedFilePath);
			}
			shell.showItemInFolder(normalizedFilePath);
			return true;
		}

		const containingDirectory = path.dirname(normalizedFilePath);
		if (
			!containingDirectory ||
			containingDirectory === '.' ||
			containingDirectory === normalizedFilePath
		) {
			return false;
		}
		return await openPathInShell(containingDirectory);
	} catch (error) {
		console.warn('[shell] Failed to open containing folder:', error);
		return false;
	}
}

async function saveFileFromRenderer(payload = {}) {
	const defaultFileName = sanitizeFileNameForSaveDialog(payload?.defaultFileName, 'export.bin');
	const defaultDirectory = app.getPath('downloads');
	const defaultPath = path.join(defaultDirectory, defaultFileName);
	const filters = normalizeSaveDialogFilters(payload?.filters);

	const saveResult = await dialog.showSaveDialog(mainWindow || undefined, {
		title: 'Export File',
		defaultPath,
		filters: filters.length > 0 ? filters : [{ name: 'All Files', extensions: ['*'] }],
		properties: ['createDirectory', 'showOverwriteConfirmation'],
	});
	if (saveResult.canceled || !saveResult.filePath) {
		return { canceled: true, filePath: '' };
	}

	const fileBase64 = String(payload?.fileBase64 || '').trim();
	if (!fileBase64) {
		throw new Error('Missing export payload');
	}

	const fileBuffer = Buffer.from(fileBase64, 'base64');
	await fs.promises.mkdir(path.dirname(saveResult.filePath), { recursive: true });
	await fs.promises.writeFile(saveResult.filePath, fileBuffer);
	return {
		canceled: false,
		filePath: saveResult.filePath,
	};
}

function sanitizeSteamSyncSegment(value, fallback = 'local') {
	const normalized = String(value || '').trim().replace(/[^a-zA-Z0-9._-]/g, '_');
	return normalized || fallback;
}

function getSteamSyncRootDirectory() {
	return path.join(app.getPath('userData'), STEAM_SYNC_ROOT_FOLDER);
}

function getSteamSyncProfileDirectory(profileId) {
	const safeProfileId = sanitizeSteamSyncSegment(profileId, 'local');
	return path.join(getSteamSyncRootDirectory(), safeProfileId);
}

function logSteamSyncEvent(eventName, details = {}) {
	const safeEvent = String(eventName || 'event');
	const safeDetails = sanitizeDiagnostics(details && typeof details === 'object' ? details : {});
	const timestamp = new Date().toISOString();
	const logLine = `[${timestamp}] [steam-sync] ${safeEvent} ${JSON.stringify(safeDetails)}`;
	console.log(logLine);
	try {
		if (app.isReady()) {
			const diagnosticsPath = path.join(app.getPath('userData'), 'steam-sync-diagnostics.log');
			appendDiagnostic(diagnosticsPath, safeEvent, safeDetails);
		}
	} catch (error) {
		// Best-effort diagnostics logging only.
	}
}

async function ensureSteamSyncRootDirectory() {
	const rootDir = getSteamSyncRootDirectory();
	await fs.promises.mkdir(rootDir, { recursive: true });
	return rootDir;
}

async function ensureSteamSyncProfileDirectory(profileId) {
	await ensureSteamSyncRootDirectory();
	const profileDir = getSteamSyncProfileDirectory(profileId);
	await fs.promises.mkdir(profileDir, { recursive: true });
	return profileDir;
}

async function ensureSteamSyncDirectoriesForRuntime(runtimeState = steamRuntimeState) {
	await ensureSteamSyncRootDirectory();
	if (runtimeState?.available && runtimeState?.steamId) await ensureSteamSyncProfileDirectory(`steam-${runtimeState.steamId}`);
}
let steamFileTransport;
function getSteamFileTransport() {
	if (!steamFileTransport) steamFileTransport = createSteamFileTransport({
		directory: getSteamSyncRootDirectory(),
		cloud: { status: getSteamCloudStatus, list: listSteamCloudFileNames, read: readSteamCloudFile, write: writeSteamCloudFile },
		readLegacy: async (profileId) => {
			const legacyName = `steam-sync__${profileId}__bundle.json`;
			const names = listSteamCloudFileNames();
			const entries = [];
			if (names.includes(legacyName)) entries.push(...(JSON.parse(readSteamCloudFile(legacyName)).entries || []));
			const folder = getSteamSyncProfileDirectory(profileId);
			try {
				for (const file of await fs.promises.readdir(folder)) {
					if (!file.endsWith('.json')) continue;
					const data = JSON.parse(await fs.promises.readFile(path.join(folder, file), 'utf8'));
					entries.push(...(file === 'bundle.json' ? data.entries || [] : [data]));
				}
			} catch (error) { if (error.code !== 'ENOENT') throw error; }
			return [...new Map(entries.filter((entry) => entry.id && entry.name).map((entry) => [entry.id, entry])).values()];
		},
	});
	return steamFileTransport;
}
const steamSyncFindFile = (payload) => getSteamFileTransport().find(payload);
const steamSyncListFiles = (payload) => getSteamFileTransport().list(payload);
const steamSyncDownloadFile = (payload) => getSteamFileTransport().download(payload);
const steamSyncCreateFile = (payload) => getSteamFileTransport().create(payload);
const steamSyncUpdateFile = (payload) => getSteamFileTransport().update(payload);
const steamSyncDeleteFile = (payload) => getSteamFileTransport().remove(payload);
function sendMenuCommand(command, payload = {}) {
	const targetWindow = BrowserWindow.getFocusedWindow() || mainWindow;
	if (!targetWindow || targetWindow.isDestroyed()) return;
	targetWindow.webContents.send('menu:command', { command, payload });
}

function normalizeLocaleCode(value) {
	return String(value || '').trim();
}

function getLocaleMenuLabel(localeCode) {
	const normalized = normalizeLocaleCode(localeCode);
	if (!normalized) return '';

	const exactMatch = SUPPORTED_LANGUAGES.find((item) => item.code === normalized);
	if (exactMatch) {
		return `${exactMatch.label} (${normalized})`;
	}

	const base = normalized.split('-')[0];
	const baseMatch = SUPPORTED_LANGUAGES.find((item) => item.code === base);
	if (baseMatch) {
		return `${baseMatch.label} (${normalized})`;
	}

	try {
		const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
		const fallbackLabel = displayNames.of(base) || normalized;
		return `${fallbackLabel} (${normalized})`;
	} catch (error) {
		return normalized;
	}
}

function normalizeMenuContext(payload = {}) {
	const route = String(payload?.route || DEFAULT_MENU_CONTEXT.route);
	const projectId = String(payload?.projectId || '');
	const dialogueId = String(payload?.dialogueId || '');
	const appLanguage =
		normalizeLocaleCode(payload?.appLanguage) ||
		normalizeLocaleCode(DEFAULT_MENU_CONTEXT.appLanguage) ||
		'en';
	const supportedContentLocales = Array.isArray(payload?.supportedContentLocales)
		? payload.supportedContentLocales.map((locale) => normalizeLocaleCode(locale)).filter(Boolean)
		: [];
	const requestedContentLocale = normalizeLocaleCode(payload?.contentLocale);
	const contentLocale = supportedContentLocales.includes(requestedContentLocale)
		? requestedContentLocale
		: supportedContentLocales[0] || '';

	return {
		route,
		projectId,
		dialogueId,
		appLanguage,
		contentLocale,
		supportedContentLocales,
	};
}

function updateMenuContext(payload = {}) {
	menuContext = normalizeMenuContext(payload);
	createAppMenu(menuContext);
}

function createAppMenu(context = menuContext) {
	const isMac = process.platform === 'darwin';
	const normalizedContext = normalizeMenuContext(context);
	const isDashboard = normalizedContext.route === 'dashboard';
	const isProject = normalizedContext.route === 'project';
	const isDialogue = normalizedContext.route === 'dialogue';
	const isDialogueSettings = normalizedContext.route === 'dialogue-settings';
	const isLegal = normalizedContext.route === 'legal';
	const canNavigateBack = isProject || isDialogue || isDialogueSettings || isLegal;
	const canImportExportProject = isProject;
	const canSaveDialogue = isDialogue;
	const canExportDialogue = isDialogue || isDialogueSettings;
	const canOpenDialogueLastExport = canExportDialogue;
	const canUndoRedoDialogue = isDialogue;
	const canGraphNavigation = isDialogue;
	const canSetContentLocale = (isDialogue || isDialogueSettings) && Boolean(normalizedContext.projectId);
	const canOpenSettingsDialog = isProject || isDialogue || isDialogueSettings;
	const canOpenSync = !isDialogue;
	const canShowTour = isDashboard || isDialogue;
	const contentLocaleMenuItems = normalizedContext.supportedContentLocales.map((localeCode) => ({
		label: getLocaleMenuLabel(localeCode),
		type: 'radio',
		checked: normalizedContext.contentLocale === localeCode,
		click: () => sendMenuCommand('set-content-locale', { locale: localeCode }),
	}));
	const languageMenuItems = SUPPORTED_LANGUAGES.map(({ code, label }) => ({
		label: `${label} (${code})`,
		type: 'radio',
		checked: normalizedContext.appLanguage === code,
		click: () => sendMenuCommand('set-language', { language: code }),
	}));
	const settingsLabel =
		isDialogue || isDialogueSettings
			? 'Dialogue Settings'
			: isProject
				? 'Project Settings'
				: 'Preferences';
	const tourLabel = isDialogue
		? 'Restart Graph Tour'
		: isDashboard
			? 'Restart Dashboard Tour'
			: 'Restart Tour';
	const appendMenuSection = (menuItems, sectionItems = []) => {
		if (!Array.isArray(sectionItems) || sectionItems.length === 0) return;
		if (menuItems.length > 0 && menuItems[menuItems.length - 1]?.type !== 'separator') {
			menuItems.push({ type: 'separator' });
		}
		menuItems.push(...sectionItems);
	};

	const fileTopItems = [];
	if (canNavigateBack) {
		fileTopItems.push({
			label: 'Back',
			accelerator: 'CmdOrCtrl+[',
			click: () => sendMenuCommand('navigate-back'),
		});
	}
	if (isDashboard) {
		fileTopItems.push({
			label: 'New Project',
			accelerator: 'CmdOrCtrl+N',
			click: () => sendMenuCommand('new-project'),
		});
	} else if (isProject) {
		fileTopItems.push({
			label: 'New Dialogue',
			accelerator: 'CmdOrCtrl+N',
			click: () => sendMenuCommand('new-dialogue'),
		});
	}
	if (isDashboard) {
		fileTopItems.push({
			label: 'Find Projects',
			accelerator: 'CmdOrCtrl+F',
			click: () => sendMenuCommand('dashboard-focus-search'),
		});
	}
	const fileMenuItems = [];
	appendMenuSection(fileMenuItems, fileTopItems);

	const projectFileItems = [];
	if (canImportExportProject) {
		projectFileItems.push(
			{
				label: 'Import Project',
				accelerator: 'CmdOrCtrl+I',
				enabled: true,
				click: () => sendMenuCommand('project-import'),
			},
			{
				label: 'Export Project',
				accelerator: 'CmdOrCtrl+Shift+E',
				enabled: true,
				click: () => sendMenuCommand('project-export'),
			},
			{
				label: 'Open Last Project Export Path',
				enabled: true,
				click: () => sendMenuCommand('project-open-last-export'),
			}
		);
	}
	if (projectFileItems.length > 0) {
		appendMenuSection(fileMenuItems, projectFileItems);
	}

	const dialogueFileItems = [];
	if (canSaveDialogue) {
		dialogueFileItems.push({
			label: 'Save Dialogue',
			accelerator: 'CmdOrCtrl+S',
			enabled: true,
			click: () => sendMenuCommand('dialogue-save'),
		});
	}
	if (canExportDialogue) {
		dialogueFileItems.push({
			label: 'Export Dialogue',
			accelerator: 'CmdOrCtrl+E',
			enabled: true,
			click: () => sendMenuCommand('dialogue-export'),
		});
	}
	if (canOpenDialogueLastExport) {
		dialogueFileItems.push({
			label: 'Open Last Dialogue Export Path',
			enabled: true,
			click: () => sendMenuCommand('dialogue-open-last-export'),
		});
	}
	if (dialogueFileItems.length > 0) {
		appendMenuSection(fileMenuItems, dialogueFileItems);
	}

	appendMenuSection(fileMenuItems, [isMac ? { role: 'close' } : { role: 'quit' }]);

	const editMenuItems = [];
	if (canUndoRedoDialogue) {
		editMenuItems.push(
			{
				label: 'Undo',
				accelerator: 'CmdOrCtrl+Z',
				click: () => sendMenuCommand('dialogue-undo'),
			},
			{
				label: 'Redo',
				accelerator: isMac ? 'Shift+Cmd+Z' : 'CmdOrCtrl+Y',
				click: () => sendMenuCommand('dialogue-redo'),
			}
		);
	}

	const viewMenuItems = [
		{
			label: 'Command Palette',
			accelerator: 'CmdOrCtrl+K',
			click: () => sendMenuCommand('open-command-palette'),
		},
	];
	const viewDialogueItems = [];
	if (isDialogue) {
		viewDialogueItems.push({
			label: 'Start Preview',
			click: () => sendMenuCommand('dialogue-start-preview'),
		});
	}
	if (canGraphNavigation) {
		viewDialogueItems.push(
			{
				label: 'Recenter Graph',
				click: () => sendMenuCommand('dialogue-recenter'),
			},
			{
				label: 'Focus Start Node',
				click: () => sendMenuCommand('dialogue-focus-start'),
			}
		);
	}
	appendMenuSection(viewMenuItems, viewDialogueItems);
	appendMenuSection(viewMenuItems, [
		{ role: 'resetZoom' },
		{ role: 'zoomIn' },
		{ role: 'zoomOut' },
		{ role: 'togglefullscreen' },
	]);

	const settingsMenuItems = [
		{
			label: 'Theme',
			submenu: [
				{
					label: 'Light',
					click: () => sendMenuCommand('set-theme', { theme: 'light' }),
				},
				{
					label: 'Dark',
					click: () => sendMenuCommand('set-theme', { theme: 'dark' }),
				},
			],
		},
	];
	if (canSetContentLocale && contentLocaleMenuItems.length > 0) {
		settingsMenuItems.push({
			label: 'Content Locale',
			submenu: contentLocaleMenuItems,
		});
	}
	settingsMenuItems.push({
		label: 'Language',
		submenu: languageMenuItems,
	});
	appendMenuSection(settingsMenuItems, [
		...(canOpenSettingsDialog
			? [
					{
						label: settingsLabel,
						accelerator: 'CmdOrCtrl+,',
						click: () => sendMenuCommand('open-settings'),
					},
			]
			: []),
		...(canOpenSync
			? [
					{
						label: 'Cloud Sync',
						accelerator: 'CmdOrCtrl+Shift+S',
						click: () => sendMenuCommand('open-sync'),
					},
			]
			: []),
	]);

	const helpMenuItems = [];
	if (canShowTour) {
		helpMenuItems.push({
			label: tourLabel,
			click: () => sendMenuCommand('show-tour'),
		});
	}
	appendMenuSection(helpMenuItems, [
		{
			label: 'Terms of Service',
			click: () => sendMenuCommand('open-terms'),
		},
		{
			label: 'Data Policy',
			click: () => sendMenuCommand('open-data-policy'),
		},
	]);
	appendMenuSection(helpMenuItems, [
		{
			label: 'Report Issue',
			click: () => shell.openExternal(ISSUES_URL),
		},
		{
			label: 'Community Discord',
			click: () => shell.openExternal(SUPPORT_URL),
		},
	]);

	const template = [
		...(isMac
			? [
					{
						label: APP_DISPLAY_NAME,
						submenu: [
							{ role: 'about' },
							{ type: 'separator' },
							{ role: 'services' },
							{ type: 'separator' },
							{ role: 'hide' },
							{ role: 'hideOthers' },
							{ role: 'unhide' },
							{ type: 'separator' },
							{ role: 'quit' },
						],
					},
			]
			: []),
		{
			label: 'File',
			submenu: fileMenuItems,
		},
		...(editMenuItems.length > 0 ? [{ label: 'Edit', submenu: editMenuItems }] : []),
		{
			label: 'View',
			submenu: viewMenuItems,
		},
		{
			label: 'Settings',
			submenu: settingsMenuItems,
		},
		{
			label: 'Help',
			submenu: helpMenuItems,
		},
	];

	Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function renderOAuthResultPage({ success, message }) {
	const title = success ? 'Sign in complete' : 'Sign in failed';
	const color = success ? '#15803d' : '#b91c1c';
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>${title}</title>
	<style>
		body {
			margin: 0;
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			background: #0f172a;
			color: #f8fafc;
		}
		.card {
			max-width: 480px;
			padding: 24px;
			border-radius: 12px;
			background: rgba(15, 23, 42, 0.9);
			border: 1px solid rgba(148, 163, 184, 0.25);
			text-align: center;
		}
		h1 {
			font-size: 1.25rem;
			margin: 0 0 12px;
			color: ${color};
		}
		p {
			margin: 0;
			line-height: 1.5;
		}
	</style>
</head>
<body>
	<div class="card">
		<h1>${title}</h1>
		<p>${message}</p>
	</div>
</body>
</html>`;
}

function renderOAuthTokenRelayPage() {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<title>Completing sign in...</title>
	<style>
		body {
			margin: 0;
			min-height: 100vh;
			display: flex;
			align-items: center;
			justify-content: center;
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			background: #0f172a;
			color: #f8fafc;
		}
		p {
			margin: 0;
			opacity: 0.9;
		}
	</style>
</head>
<body>
	<p>Completing sign in...</p>
	<script>
		(function () {
			const hashParams = new URLSearchParams(window.location.hash.slice(1));
			const queryParams = new URLSearchParams(window.location.search);
			const relayParams = new URLSearchParams();

			['access_token', 'expires_in', 'token_type', 'scope', 'state', 'error'].forEach((key) => {
				const value = hashParams.get(key) || queryParams.get(key) || '';
				if (value) relayParams.set(key, value);
			});
			relayParams.set('relay', '1');

			const relayUrl = window.location.pathname + '?' + relayParams.toString();
			window.location.replace(relayUrl);
		})();
	</script>
</body>
</html>`;
}

async function exchangeCodeForToken({
	clientId,
	code,
	redirectUri,
	codeVerifier,
	clientSecret,
	signal,
}) {
	const body = new URLSearchParams({
		client_id: clientId,
		code,
		code_verifier: codeVerifier,
		grant_type: 'authorization_code',
		redirect_uri: redirectUri,
	});
	const trimmedClientSecret = typeof clientSecret === 'string' ? clientSecret.trim() : '';
	if (trimmedClientSecret) {
		body.set('client_secret', trimmedClientSecret);
	}

	const response = await fetch(TOKEN_ENDPOINT, {
		signal,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	});

	let payload = null;
	try {
		payload = await response.json();
	} catch (error) {
		payload = null;
	}

	if (!response.ok) {
		const details = payload?.error_description || payload?.error || 'Token exchange failed';
		if (
			typeof details === 'string' &&
			details.toLowerCase().includes('client_secret is missing')
		) {
			throw new Error(
				'client_secret is missing'
			);
		}
		throw new Error(details);
	}

	return payload || {};
}

const oauthSession = require('./oauth-session.cjs').createOAuthSession();
async function executeOAuthAttempt({
	clientId,
	clientSecret,
	scopes,
	responseType,
	signal,
}) {
	console.log(`[oauth] Starting Google OAuth attempt (${responseType})`);
	const oauthStartedAt = Date.now();
	const trimmedClientId = typeof clientId === 'string' ? clientId.trim() : '';
	if (!trimmedClientId) {
		throw new Error('Missing Google client id');
	}

	const normalizedScopes = Array.isArray(scopes) && scopes.length > 0
		? scopes
		: ['openid', 'email', 'profile'];

	const state = toBase64Url(crypto.randomBytes(16));
	const { codeVerifier, codeChallenge } = createPkcePair();

	let server = null;
	let timeoutHandle = null;
	let rejectAuthResult = null;
	const callbackSockets = new Set();
	const cancelAttempt = () => rejectAuthResult(signal.reason);

	const authResultPromise = new Promise((resolve, reject) => {
		let settled = false;
		const settle = (handler, value) => {
			if (settled) return;
			settled = true;
			handler(value);
		};
		rejectAuthResult = (reason) => settle(reject, reason);
		signal.addEventListener('abort', cancelAttempt, { once: true });

		server = http.createServer((req, res) => {
			res.setHeader('Connection', 'close');
			const requestUrl = new URL(req.url || '/', `http://${LOOPBACK_HOST}`);
			if (requestUrl.pathname !== LOOPBACK_PATH) {
				res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
				res.end('Not found');
				return;
			}
			const callbackElapsed = Date.now() - oauthStartedAt;
			console.log(`[oauth] Callback request received after ${callbackElapsed}ms`);

			const returnedState = requestUrl.searchParams.get('state') || '';
			const code = requestUrl.searchParams.get('code');
			const error = requestUrl.searchParams.get('error');
			const accessToken = requestUrl.searchParams.get('access_token') || '';
			const expiresIn = requestUrl.searchParams.get('expires_in') || '';
			const tokenType = requestUrl.searchParams.get('token_type') || '';
			const scope = requestUrl.searchParams.get('scope') || '';
			const isRelay = requestUrl.searchParams.get('relay') === '1';

			if (error) {
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				res.end(
					renderOAuthResultPage({
						success: false,
						message: `Google sign-in failed: ${error}. You can close this tab.`,
					})
				);
				rejectAuthResult(new Error(error));
				return;
			}

			if (responseType === 'token' && !isRelay && !accessToken) {
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				res.end(renderOAuthTokenRelayPage());
				return;
			}

			if (!returnedState || returnedState !== state) {
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				res.end(
					renderOAuthResultPage({
						success: false,
						message: 'Sign-in state mismatch. Please return to the app and try again.',
					})
				);
				rejectAuthResult(new Error('Invalid auth state'));
				return;
			}

			if (responseType === 'token') {
				if (!accessToken) {
					res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
					res.end(
						renderOAuthResultPage({
							success: false,
							message: 'Missing access token. Please try signing in again.',
						})
					);
					rejectAuthResult(new Error('Missing access token'));
					return;
				}

				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				res.end(
					renderOAuthResultPage({
						success: true,
						message: 'Google sign-in completed. Return to Mountea Dialoguer.',
					})
				);
				settle(resolve, {
					kind: 'token',
					accessToken,
					expiresIn,
					tokenType,
					scope,
				});
				return;
			}

			if (!code) {
				res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
				res.end(
					renderOAuthResultPage({
						success: false,
						message: 'Missing authorization code. Please try signing in again.',
					})
				);
				rejectAuthResult(new Error('Missing authorization code'));
				return;
			}

			res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
			res.end(
				renderOAuthResultPage({
					success: true,
					message: 'Authorization received. Return to Mountea Dialoguer to finish sign-in.',
				})
			);
			settle(resolve, { kind: 'code', code });
		});

		server.on('error', (error) => {
			rejectAuthResult(error);
		});
		server.on('connection', (socket) => {
			callbackSockets.add(socket);
			socket.on('close', () => {
				callbackSockets.delete(socket);
			});
		});
	});

	// Attach immediately: cancellation can precede the listen callback.
	authResultPromise.catch(() => {});
	try {
		signal.throwIfAborted();
		await new Promise((resolve, reject) => {
			server.listen(0, LOOPBACK_HOST, resolve);
			server.once('error', reject);
		});

		signal.throwIfAborted();
		const address = server.address();
		const port = typeof address === 'object' && address ? address.port : null;
		if (!port) {
			throw new Error('Unable to start OAuth callback server');
		}

		const redirectUri = `http://${LOOPBACK_HOST}:${port}${LOOPBACK_PATH}`;
		const authParams = new URLSearchParams({
			client_id: trimmedClientId,
			redirect_uri: redirectUri,
			response_type: responseType,
			scope: normalizedScopes.join(' '),
			state,
			include_granted_scopes: 'true',
		});
		const forceConsentPrompt = process.env.MOUNTEA_OAUTH_FORCE_CONSENT === '1';
		if (forceConsentPrompt) {
			authParams.set('prompt', 'consent');
		}
		if (responseType === 'code') {
			authParams.set('code_challenge', codeChallenge);
			authParams.set('code_challenge_method', 'S256');
			authParams.set('access_type', 'offline');
		}

		const authUrl = `${AUTH_ENDPOINT}?${authParams.toString()}`;
		console.log(`[oauth] Callback listening on ${redirectUri}`);
		console.log(`[oauth] Waiting up to ${OAUTH_TIMEOUT_MS}ms for callback`);
		timeoutHandle = setTimeout(() => {
			console.warn('[oauth] OAuth timed out waiting for callback');
			rejectAuthResult(new Error('OAuth timed out'));
		}, OAUTH_TIMEOUT_MS);

		shell.openExternal(authUrl).then(
			() => {
				console.log('[oauth] Browser launched for Google sign-in');
			},
			(error) => {
				console.error('[oauth] Failed to open browser for Google sign-in', error);
				rejectAuthResult(
					new Error(String(error?.message || 'Failed to open browser for OAuth'))
				);
			}
		);
		const authResult = await authResultPromise;
		console.log(
			`[oauth] Callback payload accepted (${authResult.kind}) after ${Date.now() - oauthStartedAt}ms`
		);
		clearTimeout(timeoutHandle);
		timeoutHandle = null;

		if (authResult.kind === 'token') {
			console.log(`[oauth] OAuth completed in ${Date.now() - oauthStartedAt}ms`);
			return {
				accessToken: authResult.accessToken,
				refreshToken: '',
				expiresIn: Number(authResult.expiresIn || 3600),
				tokenType: authResult.tokenType || 'Bearer',
				scope: authResult.scope || normalizedScopes.join(' '),
				redirectUri,
				clientId: trimmedClientId,
			};
		}

		const tokenExchangeStartedAt = Date.now();
		console.log('[oauth] Exchanging authorization code for token');
		const tokenPayload = await exchangeCodeForToken({
			clientId: trimmedClientId,
			code: authResult.code,
			redirectUri,
			codeVerifier,
			clientSecret,
			signal,
		});
		signal.throwIfAborted();
		console.log(
			`[oauth] Token exchange completed in ${Date.now() - tokenExchangeStartedAt}ms`
		);

		if (!tokenPayload.access_token) {
			throw new Error('Missing access token');
		}

		console.log(`[oauth] OAuth completed in ${Date.now() - oauthStartedAt}ms`);
		return {
			accessToken: tokenPayload.access_token,
			refreshToken: tokenPayload.refresh_token || '',
			expiresIn: Number(tokenPayload.expires_in || 3600),
			tokenType: tokenPayload.token_type || 'Bearer',
			scope: tokenPayload.scope || normalizedScopes.join(' '),
			redirectUri,
			clientId: trimmedClientId,
		};
	} finally {
		signal.removeEventListener('abort', cancelAttempt);
		if (timeoutHandle) {
			clearTimeout(timeoutHandle);
		}
		if (server?.listening) {
			const closeStartedAt = Date.now();
			await new Promise((resolve) => {
				let settled = false;
				const settle = () => {
					if (settled) return;
					settled = true;
					resolve();
				};

				server.close(settle);
				for (const socket of callbackSockets) {
					try {
						socket.end();
						socket.destroy();
					} catch (error) {
						// Best effort. Individual socket teardown failures are non-fatal.
					}
				}

				const fallbackTimer = setTimeout(settle, 1500);
				if (typeof fallbackTimer.unref === 'function') {
					fallbackTimer.unref();
				}
			});
			console.log(`[oauth] Callback server closed in ${Date.now() - closeStartedAt}ms`);
		}
	}
}

async function startGoogleOAuth({ clientId, clientSecret, scopes }, signal) {
	const resolvedClientId = resolveDesktopOAuthClientId(clientId);
	const resolvedClientSecret = resolveDesktopOAuthClientSecret(clientSecret);
	console.log(
		`[oauth] Config resolved clientId=${resolvedClientId} hasSecret=${Boolean(
			resolvedClientSecret && resolvedClientSecret.trim()
		)}`
	);

	try {
		return await executeOAuthAttempt({
			clientId: resolvedClientId,
			clientSecret: resolvedClientSecret,
			scopes,
			responseType: 'code',
			signal,
		});
	} catch (error) {
		signal.throwIfAborted();
		const message = String(error?.message || '').toLowerCase();
		const allowImplicitFallback = process.env.MOUNTEA_OAUTH_ALLOW_IMPLICIT === '1';
		const isRecoverableCodeFlowError =
			message.includes('client_secret is missing') ||
			message.includes('unsupported_response_type') ||
			message.includes('unauthorized') ||
			message.includes('invalid_client') ||
			message.includes('unauthorized_client');
		const shouldFallbackToToken =
			allowImplicitFallback && isRecoverableCodeFlowError;
		if (!shouldFallbackToToken) {
			throw error;
		}
		console.warn(
			'[oauth] Code flow failed, retrying with implicit token flow.',
			error?.message || error
		);

		return executeOAuthAttempt({
			clientId: resolvedClientId,
			clientSecret: '',
			scopes,
			responseType: 'token',
			signal,
		});
	}
}

function createMainWindow() {
	const iconPath = getIconPath();
	const disableLinuxWindowIcon =
		process.platform === 'linux' &&
		String(process.env.MOUNTEA_DISABLE_LINUX_WINDOW_ICON || '1').trim() !== '0';
	mainWindow = new BrowserWindow({
		width: 1440,
		height: 920,
		minWidth: 1240,
		minHeight: 720,
		show: false,
		autoHideMenuBar: false,
		title: APP_DISPLAY_NAME,
		icon: disableLinuxWindowIcon ? undefined : iconPath,
		webPreferences: {
			preload: path.join(__dirname, 'preload.cjs'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (isAllowedExternalUrl(url)) {
			shell.openExternal(url);
		}
		return { action: 'deny' };
	});

	const guardNavigation = (event, url) => {
		if (isInternalNavigation(url)) {
			return;
		}
		event.preventDefault();
		if (isAllowedExternalUrl(url)) {
			shell.openExternal(url);
		}
	};
	mainWindow.webContents.on('will-navigate', guardNavigation);
	mainWindow.webContents.on('will-redirect', guardNavigation);

	mainWindow.webContents.on('before-input-event', (event, input) => {
		if (shouldBlockNativeShortcut(input)) {
			event.preventDefault();
		}
	});

	mainWindow.webContents.on('render-process-gone', (_event, details) => {
		reportMainProcessError(new Error('Renderer process terminated unexpectedly'), {
			event: 'render-process-gone',
			reason: details?.reason || 'unknown',
			exitCode: details?.exitCode ?? null,
		});
	});

	mainWindow.webContents.on('unresponsive', () => {
		reportMainProcessError(new Error('Renderer became unresponsive'), {
			event: 'renderer-unresponsive',
		});
	});

	mainWindow.once('ready-to-show', () => {
		if (process.env.MOUNTEA_STARTUP_CHECK !== '1') mainWindow.show();
	});

	const devServerUrl = app.isPackaged ? null : process.env.VITE_DEV_SERVER_URL;
	if (devServerUrl) {
		mainWindow.loadURL(devServerUrl);
		return;
	}

	const distIndexPath = getDistIndexPath();
	if (!fs.existsSync(distIndexPath)) {
		throw new Error(`Missing renderer build at ${distIndexPath}. Run "npm run build".`);
	}
	mainWindow.loadFile(distIndexPath);
}

function registerIpcHandlers() {
	const trustedIpc = createTrustedIpc({ ipcMain, getWindow: () => mainWindow, getPolicy: rendererPolicy, getSteamStatus, onRejected: (channel) => logSteamSyncEvent('IPC_REJECTED', { channel }) });
	for (const channel of ['credentials:status', 'credentials:get', 'credentials:set', 'credentials:remove']) ipcMain.removeHandler(channel);
	trustedIpc.handle('credentials:status', () => getCredentialVault().status());
	trustedIpc.handle('credentials:get', (_event, payload) => getCredentialVault().get(payload.profileId, payload.key));
	trustedIpc.handle('credentials:set', (_event, payload) => getCredentialVault().set(payload.profileId, payload.key, payload.value));
	trustedIpc.handle('credentials:remove', (_event, payload) => getCredentialVault().remove(payload.profileId, payload.key));
	ipcMain.removeAllListeners('menu:set-context');
	ipcMain.removeAllListeners('sync:trace');
	ipcMain.removeHandler('shell:open-external');
	ipcMain.removeHandler('shell:open-path');
	ipcMain.removeHandler('shell:open-containing-folder');
	ipcMain.removeHandler('dialog:save-file');
	ipcMain.removeHandler('auth:start-google-oauth');
	ipcMain.removeHandler('auth:cancel-google-oauth');
	ipcMain.removeHandler('steam:get-status');
	ipcMain.removeHandler('steam:open-overlay');
	ipcMain.removeHandler('steam:set-rich-presence');
	ipcMain.removeHandler('steam:unlock-achievement');
	ipcMain.removeHandler('steam-sync:find-file');
	ipcMain.removeHandler('steam-sync:list-files');
	ipcMain.removeHandler('steam-sync:download-file');
	ipcMain.removeHandler('steam-sync:create-file');
	ipcMain.removeHandler('steam-sync:update-file');
	ipcMain.removeHandler('steam-sync:delete-file');

	trustedIpc.handle('shell:open-external', async (_event, rawUrl) => {
		if (!isAllowedExternalUrl(rawUrl)) {
			return false;
		}
		await shell.openExternal(rawUrl);
		return true;
	});

	trustedIpc.handle('shell:open-path', async (_event, rawPath) => {
		return await openPathInShell(rawPath);
	});

	trustedIpc.handle('shell:open-containing-folder', async (_event, rawFilePath) => {
		return await openContainingFolderInShell(rawFilePath);
	});

	trustedIpc.handle('dialog:save-file', async (_event, payload) => {
		return await saveFileFromRenderer(payload || {});
	});

	trustedIpc.handle('auth:cancel-google-oauth', () => { oauthSession.cancel(); return true; });
	trustedIpc.handle('auth:start-google-oauth', async (_event, payload) => {
		return oauthSession.run((signal) => startGoogleOAuth(payload, signal));
	});

	trustedIpc.handle('steam:get-status', async () => {
		return getSteamStatus();
	});

	trustedIpc.handle('steam:open-overlay', async (_event, payload) => {
		const dialog = payload?.dialog || 'Friends';
		const ok = openSteamOverlay(dialog);
		return { ok };
	});

	trustedIpc.handle('steam:set-rich-presence', async (_event, payload) => {
		const entries = payload?.entries || {};
		return setSteamRichPresence(entries);
	});

	trustedIpc.handle('steam:unlock-achievement', async (_event, payload) => {
		const achievementId = payload?.achievementId || '';
		return unlockSteamAchievement(achievementId);
	});

	trustedIpc.handle('steam-sync:find-file', async (_event, payload) => {
		return await steamSyncFindFile(payload || {});
	});

	trustedIpc.handle('steam-sync:list-files', async (_event, payload) => {
		return await steamSyncListFiles(payload || {});
	});

	trustedIpc.handle('steam-sync:download-file', async (_event, payload) => {
		return await steamSyncDownloadFile(payload || {});
	});

	trustedIpc.handle('steam-sync:create-file', async (_event, payload) => {
		return await steamSyncCreateFile(payload || {});
	});

	trustedIpc.handle('steam-sync:update-file', async (_event, payload) => {
		return await steamSyncUpdateFile(payload || {});
	});

	trustedIpc.handle('steam-sync:delete-file', async (_event, payload) => {
		return await steamSyncDeleteFile(payload || {});
	});

	trustedIpc.on('menu:set-context', (_event, payload) => {
		updateMenuContext(payload || {});
	});

	trustedIpc.on('sync:trace', (_event, payload) => { logSteamSyncEvent(payload.event || 'event', payload.details || {}); });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

process.on('uncaughtException', (error) => {
	reportMainProcessError(error, { event: 'uncaughtException' });
});

process.on('unhandledRejection', (reason) => {
	reportMainProcessError(reason, { event: 'unhandledRejection' });
});

if (!gotSingleInstanceLock) {
	app.quit();
} else {
	app.on('second-instance', () => {
		if (!mainWindow) return;
		if (mainWindow.isMinimized()) {
			mainWindow.restore();
		}
		mainWindow.focus();
	});

	app.whenReady().then(async () => {
		if (process.env.MOUNTEA_STARTUP_CHECK === '1') require('electron').session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
		steamRuntimeState = initializeSteamRuntime();
		if (steamRuntimeState.available) {
			console.log(
				`[steam] runtime initialized appId=${steamRuntimeState.appId} steamId=${steamRuntimeState.steamId} launchedViaSteam=${steamRuntimeState.launchedViaSteam}`
			);
		} else {
			console.log(`[steam] runtime not available: ${steamRuntimeState.error}`);
		}
		try {
			await ensureSteamSyncDirectoriesForRuntime(steamRuntimeState);
		} catch (error) {
			logSteamSyncEvent('ROOT_READY_ERROR', {
				message: String(error?.message || error),
			});
		}

		createAppMenu(menuContext);
		registerIpcHandlers();
		createMainWindow();

		app.on('activate', () => {
			if (BrowserWindow.getAllWindows().length === 0) {
				createMainWindow();
			}
		});
	});
}

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		try {
			shutdownSteamRuntime();
		} catch (error) {
			// Best-effort cleanup before exit.
		}
		app.exit(0);
	}
});

app.on('before-quit', () => {
	oauthSession.cancel();
	try {
		shutdownSteamRuntime();
	} catch (error) {
		// Best-effort cleanup.
	}
});
