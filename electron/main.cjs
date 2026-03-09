const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');
const { URL, URLSearchParams } = require('node:url');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const {
	initializeSteamRuntime,
	prepareSteamOverlayForElectron,
	getSteamStatus,
	openOverlay: openSteamOverlay,
	setRichPresence: setSteamRichPresence,
	unlockAchievement: unlockSteamAchievement,
} = require('./steam.cjs');

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

let mainWindow = null;
const DEFAULT_MENU_CONTEXT = Object.freeze({
	route: 'none',
	projectId: '',
	dialogueId: '',
});
let menuContext = { ...DEFAULT_MENU_CONTEXT };
const SUPPORTED_LANGUAGES = [
	{ code: 'en', label: 'English' },
	{ code: 'cs', label: 'Čeština' },
	{ code: 'de', label: 'Deutsch' },
	{ code: 'fr', label: 'Francais' },
	{ code: 'es', label: 'Espanol' },
	{ code: 'pl', label: 'Polski' },
];

app.setName(APP_DISPLAY_NAME);

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
		return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
	} catch (error) {
		return false;
	}
}

function isInternalNavigation(url) {
	const devServerUrl = process.env.VITE_DEV_SERVER_URL;
	if (devServerUrl && url.startsWith(devServerUrl)) {
		return true;
	}
	return url.startsWith('file://');
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

function sendMenuCommand(command, payload = {}) {
	const targetWindow = BrowserWindow.getFocusedWindow() || mainWindow;
	if (!targetWindow || targetWindow.isDestroyed()) return;
	targetWindow.webContents.send('menu:command', { command, payload });
}

function normalizeMenuContext(payload = {}) {
	const route = String(payload?.route || DEFAULT_MENU_CONTEXT.route);
	const projectId = String(payload?.projectId || '');
	const dialogueId = String(payload?.dialogueId || '');
	return { route, projectId, dialogueId };
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
	const canUndoRedoDialogue = isDialogue;
	const canGraphNavigation = isDialogue;
	const canShowTour = isDashboard || isDialogue;
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
			submenu: [
				{
					label: 'Back',
					accelerator: 'CmdOrCtrl+[',
					enabled: canNavigateBack,
					click: () => sendMenuCommand('navigate-back'),
				},
				{ type: 'separator' },
				{
					label: 'New Project',
					accelerator: 'CmdOrCtrl+N',
					click: () => sendMenuCommand('new-project'),
				},
				{
					label: 'Find Projects',
					accelerator: 'CmdOrCtrl+F',
					enabled: isDashboard,
					click: () => sendMenuCommand('dashboard-focus-search'),
				},
				{ type: 'separator' },
				{
					label: 'Import Project',
					accelerator: 'CmdOrCtrl+I',
					enabled: canImportExportProject,
					click: () => sendMenuCommand('project-import'),
				},
				{
					label: 'Export Project',
					accelerator: 'CmdOrCtrl+Shift+E',
					enabled: canImportExportProject,
					click: () => sendMenuCommand('project-export'),
				},
				{ type: 'separator' },
				{
					label: 'Save Dialogue',
					accelerator: 'CmdOrCtrl+S',
					enabled: canSaveDialogue,
					click: () => sendMenuCommand('dialogue-save'),
				},
				{
					label: 'Export Dialogue',
					accelerator: 'CmdOrCtrl+E',
					enabled: canExportDialogue,
					click: () => sendMenuCommand('dialogue-export'),
				},
				{ type: 'separator' },
				isMac ? { role: 'close' } : { role: 'quit' },
			],
		},
		{
			label: 'Edit',
			submenu: [
				{
					label: 'Undo',
					accelerator: 'CmdOrCtrl+Z',
					enabled: canUndoRedoDialogue,
					click: () => sendMenuCommand('dialogue-undo'),
				},
				{
					label: 'Redo',
					accelerator: isMac ? 'Shift+Cmd+Z' : 'CmdOrCtrl+Y',
					enabled: canUndoRedoDialogue,
					click: () => sendMenuCommand('dialogue-redo'),
				},
			],
		},
		{
			label: 'View',
			submenu: [
				{
					label: 'Command Palette',
					accelerator: 'CmdOrCtrl+K',
					click: () => sendMenuCommand('open-command-palette'),
				},
				{
					label: 'Start Preview',
					enabled: isDialogue,
					click: () => sendMenuCommand('dialogue-start-preview'),
				},
				{
					label: 'Recenter Graph',
					enabled: canGraphNavigation,
					click: () => sendMenuCommand('dialogue-recenter'),
				},
				{
					label: 'Focus Start Node',
					enabled: canGraphNavigation,
					click: () => sendMenuCommand('dialogue-focus-start'),
				},
				{ type: 'separator' },
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
			],
		},
		{
			label: 'Settings',
			submenu: [
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
				{
					label: 'Language',
					submenu: SUPPORTED_LANGUAGES.map(({ code, label }) => ({
						label,
						click: () => sendMenuCommand('set-language', { language: code }),
					})),
				},
				{ type: 'separator' },
				{
					label: settingsLabel,
					accelerator: 'CmdOrCtrl+,',
					click: () => sendMenuCommand('open-settings'),
				},
				{
					label: 'Cloud Sync',
					accelerator: 'CmdOrCtrl+Shift+S',
					click: () => sendMenuCommand('open-sync'),
				},
			],
		},
		{
			label: 'Help',
			submenu: [
				{
					label: tourLabel,
					enabled: canShowTour,
					click: () => sendMenuCommand('show-tour'),
				},
				{ type: 'separator' },
				{
					label: 'Terms of Service',
					click: () => sendMenuCommand('open-terms'),
				},
				{
					label: 'Data Policy',
					click: () => sendMenuCommand('open-data-policy'),
				},
				{ type: 'separator' },
				{
					label: 'Report Issue',
					click: () => shell.openExternal(ISSUES_URL),
				},
				{
					label: 'Community Discord',
					click: () => shell.openExternal(SUPPORT_URL),
				},
			],
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

async function executeOAuthAttempt({
	clientId,
	clientSecret,
	scopes,
	responseType,
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

	const authResultPromise = new Promise((resolve, reject) => {
		let settled = false;
		const settle = (handler, value) => {
			if (settled) return;
			settled = true;
			handler(value);
		};
		rejectAuthResult = (reason) => settle(reject, reason);

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

	try {
		await new Promise((resolve, reject) => {
			server.listen(0, LOOPBACK_HOST, resolve);
			server.once('error', reject);
		});

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
		});
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

async function startGoogleOAuth({ clientId, clientSecret, scopes }) {
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
		});
	} catch (error) {
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
		});
	}
}

function createMainWindow() {
	const iconPath = getIconPath();
	mainWindow = new BrowserWindow({
		width: 1440,
		height: 920,
		minWidth: 1240,
		minHeight: 720,
		show: false,
		autoHideMenuBar: false,
		title: APP_DISPLAY_NAME,
		icon: iconPath,
		webPreferences: {
			preload: path.join(__dirname, 'preload.cjs'),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
		},
	});

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (isAllowedExternalUrl(url)) {
			shell.openExternal(url);
		}
		return { action: 'deny' };
	});

	mainWindow.webContents.on('will-navigate', (event, url) => {
		if (isInternalNavigation(url)) {
			return;
		}
		if (isAllowedExternalUrl(url)) {
			event.preventDefault();
			shell.openExternal(url);
		}
	});

	mainWindow.webContents.on('before-input-event', (event, input) => {
		if (shouldBlockNativeShortcut(input)) {
			event.preventDefault();
		}
	});

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
	});

	const devServerUrl = process.env.VITE_DEV_SERVER_URL;
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
	ipcMain.removeAllListeners('menu:set-context');
	ipcMain.removeAllListeners('sync:trace');
	ipcMain.removeHandler('shell:open-external');
	ipcMain.removeHandler('auth:start-google-oauth');
	ipcMain.removeHandler('steam:get-status');
	ipcMain.removeHandler('steam:open-overlay');
	ipcMain.removeHandler('steam:set-rich-presence');
	ipcMain.removeHandler('steam:unlock-achievement');

	ipcMain.handle('shell:open-external', async (_event, rawUrl) => {
		if (!isAllowedExternalUrl(rawUrl)) {
			return false;
		}
		await shell.openExternal(rawUrl);
		return true;
	});

	ipcMain.handle('auth:start-google-oauth', async (_event, payload) => {
		return startGoogleOAuth(payload || {});
	});

	ipcMain.handle('steam:get-status', async () => {
		return getSteamStatus();
	});

	ipcMain.handle('steam:open-overlay', async (_event, payload) => {
		const dialog = payload?.dialog || 'Friends';
		const ok = openSteamOverlay(dialog);
		return { ok };
	});

	ipcMain.handle('steam:set-rich-presence', async (_event, payload) => {
		const entries = payload?.entries || {};
		return setSteamRichPresence(entries);
	});

	ipcMain.handle('steam:unlock-achievement', async (_event, payload) => {
		const achievementId = payload?.achievementId || '';
		return unlockSteamAchievement(achievementId);
	});

	ipcMain.on('menu:set-context', (_event, payload) => {
		updateMenuContext(payload || {});
	});

	ipcMain.on('sync:trace', (_event, payload) => {
		const eventName = String(payload?.event || 'event');
		const details = payload?.details && typeof payload.details === 'object'
			? payload.details
			: {};
		console.log(`[${new Date().toISOString()}] [sync] ${eventName}`, details);
	});
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

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

	app.whenReady().then(() => {
		steamRuntimeState = initializeSteamRuntime();
		if (steamRuntimeState.available) {
			console.log(
				`[steam] runtime initialized appId=${steamRuntimeState.appId} steamId=${steamRuntimeState.steamId} launchedViaSteam=${steamRuntimeState.launchedViaSteam}`
			);
		} else {
			console.log(`[steam] runtime not available: ${steamRuntimeState.error}`);
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
		app.quit();
	}
});
