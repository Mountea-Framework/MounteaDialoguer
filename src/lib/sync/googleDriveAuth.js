const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';
const CLIENT_ID_STORAGE_KEY = 'mountea-google-client-id';

const STORAGE_KEY = 'mountea-dialoguer-pkce';

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
	return `${window.location.origin}/oauth-callback.html`;
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

function storePkce(state, verifier) {
	sessionStorage.setItem(
		STORAGE_KEY,
		JSON.stringify({ state, verifier })
	);
}

function readPkce() {
	const raw = sessionStorage.getItem(STORAGE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch (error) {
		return null;
	}
}

function clearPkce() {
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

function waitForAuthCode(expectedState) {
	return new Promise((resolve, reject) => {
		const handler = (event) => {
			if (event.origin !== window.location.origin) return;
			const { type, code, state, error } = event.data || {};
			if (type !== 'GOOGLE_OAUTH_CODE') return;
			if (state !== expectedState) return;
			window.removeEventListener('message', handler);
			if (error) {
				reject(new Error(error));
			} else {
				resolve(code);
			}
		};
		window.addEventListener('message', handler);
	});
}

export async function startGoogleDriveAuth() {
	const clientId = getClientId();
	const redirectUri = getRedirectUri();
	const state = randomString(16);
	const verifier = randomString(64);
	const challenge = await sha256(verifier);

	storePkce(state, verifier);

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: SCOPES.join(' '),
		code_challenge: challenge,
		code_challenge_method: 'S256',
		state,
		access_type: 'offline',
		prompt: 'consent',
	});

	const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;
	const popup = openPopup(authUrl);
	if (!popup) {
		throw new Error('Popup blocked');
	}

	const code = await waitForAuthCode(state);
	popup.close();

	return { code, redirectUri, clientId };
}

export async function exchangeCodeForToken({ code, redirectUri, clientId }) {
	const pkce = readPkce();
	clearPkce();
	if (!pkce?.verifier) {
		throw new Error('Missing PKCE verifier');
	}

	const body = new URLSearchParams({
		client_id: clientId,
		code,
		code_verifier: pkce.verifier,
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
		throw new Error('Token exchange failed');
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
		throw new Error('Token refresh failed');
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
