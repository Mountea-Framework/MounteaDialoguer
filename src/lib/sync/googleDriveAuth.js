const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';
const CLIENT_ID_STORAGE_KEY = 'mountea-google-client-id';

const STORAGE_KEY = 'mountea-dialoguer-auth-state';

const SCOPES = [
	'https://www.googleapis.com/auth/drive.appdata',
	'openid',
	'email',
	'profile',
];

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

export function getConfiguredClientId() {
	const stored = getStoredClientId();
	return stored || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
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

function toBase64Url(buffer) {
	const bytes = new Uint8Array(buffer);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i += 1) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sha256(input) {
	const data = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest('SHA-256', data);
	return toBase64Url(digest);
}

function randomString(length = 64) {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (x) => x.toString(16).padStart(2, '0')).join('');
}

function storeAuthState(state) {
	sessionStorage.setItem(STORAGE_KEY, state);
}

function readAuthState() {
	return sessionStorage.getItem(STORAGE_KEY);
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
	const redirectUri = getRedirectUri();
	const state = randomString(16);
	storeAuthState(state);

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'token',
		scope: SCOPES.join(' '),
		state,
		prompt: 'consent',
	});

	const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;
	const popup = openPopup(authUrl);
	if (!popup) {
		throw new Error('Popup blocked');
	}

	const result = await waitForAuthResult(state);
	clearAuthState();

	if (!result?.accessToken) {
		throw new Error('Missing access token');
	}

	return {
		accessToken: result.accessToken,
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
