import { getGoogleDriveScopes } from '@/lib/sync/googleDriveConfig';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';
const CLIENT_ID_STORAGE_KEY = 'mountea-google-client-id';

const STORAGE_KEY = 'mountea-dialoguer-auth-state';

export function getStoredClientId() {
	if (typeof window === 'undefined') return '';
	return window.localStorage.getItem(CLIENT_ID_STORAGE_KEY) || '';
}

export function setStoredClientId(value) {
	if (typeof window === 'undefined') return;
	const trimmed = value.trim();
	if (!trimmed) {
		window.localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
		return;
	}
	window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, trimmed);
}

function getElectronApi() {
	if (typeof window === 'undefined') return null;
	if (typeof window.electronAPI !== 'object' || !window.electronAPI) return null;
	return window.electronAPI;
}

function resolveEnvClientId() {
	const electronApi = getElectronApi();
	if (electronApi?.isElectron) {
		return import.meta.env.VITE_GOOGLE_CLIENT_ID_DESKTOP || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
	}
	return import.meta.env.VITE_GOOGLE_CLIENT_ID_WEB || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
}

export function getConfiguredClientId() {
	const stored = getStoredClientId();
	const envClientId = resolveEnvClientId();
	const electronApi = getElectronApi();

	// In Electron prefer env-configured desktop client ID over stale persisted values.
	if (electronApi?.isElectron) {
		return envClientId || stored;
	}

	return stored || envClientId;
}

function getClientId() {
	const clientId = getConfiguredClientId();
	if (!clientId) {
		throw new Error('Missing Google client id');
	}
	return clientId;
}

function getRedirectUri() {
	return new URL('./oauth-callback.html', window.location.href).toString();
}

function randomString(length = 64) {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (x) => x.toString(16).padStart(2, '0')).join('');
}

function storeAuthState(state) {
	sessionStorage.setItem(STORAGE_KEY, state);
}

function clearAuthState() {
	sessionStorage.removeItem(STORAGE_KEY);
}

function openPopup(url) {
	const width = 520;
	const height = 620;
	const left = window.screenX + (window.outerWidth - width) / 2;
	const top = window.screenY + (window.outerHeight - height) / 2;
	return window.open(
		url,
		'mountea-google-auth',
		`width=${width},height=${height},left=${left},top=${top}`
	);
}

function waitForAuthResult(expectedState) {
	return new Promise((resolve, reject) => {
		const handler = (event) => {
			if (event.origin !== window.location.origin) return;
			const { type, code, state, error, accessToken, expiresIn, tokenType, scope } = event.data || {};
			if (type !== 'GOOGLE_OAUTH_RESULT') return;
			if (state !== expectedState) return;
			window.removeEventListener('message', handler);
			if (error) {
				reject(new Error(error));
			} else {
				resolve({ code, accessToken, expiresIn, tokenType, scope });
			}
		};
		window.addEventListener('message', handler);
	});
}

export async function startGoogleDriveAuth() {
	const clientId = getClientId();
	const scopes = getGoogleDriveScopes();
	const electronApi = getElectronApi();
	if (electronApi?.isElectron && typeof electronApi.startGoogleOAuth === 'function') {
		const desktopClientSecret =
			import.meta.env.VITE_GOOGLE_CLIENT_SECRET_DESKTOP ||
			import.meta.env.VITE_GOOGLE_CLIENT_SECRET ||
			'';
		const result = await electronApi.startGoogleOAuth({
			clientId,
			clientSecret: desktopClientSecret,
			scopes,
		});

		if (!result?.accessToken) {
			throw new Error('Missing access token');
		}

		return {
			accessToken: result.accessToken,
			refreshToken: result.refreshToken || '',
			expiresIn: result.expiresIn,
			tokenType: result.tokenType,
			scope: result.scope,
			redirectUri: result.redirectUri || '',
			clientId: result.clientId || clientId,
		};
	}

	const redirectUri = getRedirectUri();
	const state = randomString(16);
	storeAuthState(state);

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'token',
		scope: scopes.join(' '),
		state,
		prompt: 'consent',
	});

	const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;
	const popup = openPopup(authUrl);
	if (!popup) {
		throw new Error('Popup blocked');
	}

	let result;
	try {
		result = await waitForAuthResult(state);
	} finally {
		clearAuthState();
	}

	if (!result?.accessToken) {
		throw new Error('Missing access token');
	}

	return {
		accessToken: result.accessToken,
		refreshToken: '',
		expiresIn: result.expiresIn,
		tokenType: result.tokenType,
		scope: result.scope,
		redirectUri,
		clientId,
	};
}

export async function exchangeCodeForToken({ code, redirectUri, clientId }) {
	const body = new URLSearchParams({
		client_id: clientId,
		code,
		grant_type: 'authorization_code',
		redirect_uri: redirectUri,
	});

	const response = await fetch(TOKEN_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	});

	if (!response.ok) {
		let details = '';
		try {
			const payload = await response.json();
			details = payload.error_description || payload.error || '';
		} catch (error) {
			details = '';
		}
		throw new Error(details || 'Token exchange failed');
	}

	return await response.json();
}

export async function refreshAccessToken(refreshToken) {
	const clientId = getClientId();
	const body = new URLSearchParams({
		client_id: clientId,
		grant_type: 'refresh_token',
		refresh_token: refreshToken,
	});

	const response = await fetch(TOKEN_ENDPOINT, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body,
	});

	if (!response.ok) {
		let details = '';
		try {
			const payload = await response.json();
			details = payload.error_description || payload.error || '';
		} catch (error) {
			details = '';
		}
		throw new Error(details || 'Token refresh failed');
	}

	return await response.json();
}

export async function fetchUserInfo(accessToken) {
	const response = await fetch(USERINFO_ENDPOINT, {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		throw new Error('Failed to fetch user info');
	}

	return await response.json();
}

export function getGoogleClientId() {
	return getClientId();
}
