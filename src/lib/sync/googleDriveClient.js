import { getSyncAccount, upsertSyncAccount } from '@/lib/sync/syncStorage';
import { refreshAccessToken } from '@/lib/sync/googleDriveAuth';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';
const ALLOWED_PREFIXES = [DRIVE_FILES_ENDPOINT, DRIVE_UPLOAD_ENDPOINT];

async function getValidAccessToken() {
	const account = await getSyncAccount('googleDrive');
	if (!account?.accessToken) {
		throw new Error('Missing Google Drive token');
	}

	const expiresAt = account.expiresAt ? Number(account.expiresAt) : 0;
	if (expiresAt && Date.now() < expiresAt - 60000) {
		return account.accessToken;
	}

	if (!account.refreshToken) {
		throw new Error('tokenExpired');
	}

	const refreshed = await refreshAccessToken(account.refreshToken);
	const nextExpiresAt = Date.now() + refreshed.expires_in * 1000;

	await upsertSyncAccount('googleDrive', {
		...account,
		accessToken: refreshed.access_token,
		expiresAt: nextExpiresAt,
	});

	return refreshed.access_token;
}

function buildDriveUrl(base, pathSegment, params) {
	const url = new URL(base);
	if (pathSegment) {
		url.pathname = `${url.pathname}/${encodeURIComponent(pathSegment)}`;
	}
	if (params) {
		url.search = params.toString();
	}
	return url;
}

async function driveRequest(url, options = {}) {
	const urlString = url.toString();
	if (!ALLOWED_PREFIXES.some((prefix) => urlString.startsWith(prefix))) {
		throw new Error('Blocked non-Google Drive request');
	}
	const token = await getValidAccessToken();
	const response = await fetch(urlString, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			...options.headers,
		},
	});

	if (!response.ok) {
		throw new Error(`Google Drive request failed: ${response.status}`);
	}

	return response;
}

function buildMultipartBody(metadata, content, mimeType) {
	const boundary = `mountea-${Math.random().toString(36).slice(2)}`;
	const parts = [
		`--${boundary}\r\n`,
		'Content-Type: application/json; charset=UTF-8\r\n\r\n',
		JSON.stringify(metadata),
		'\r\n',
		`--${boundary}\r\n`,
		`Content-Type: ${mimeType}\r\n\r\n`,
		content,
		'\r\n',
		`--${boundary}--`,
	];
	const body = new Blob(parts);
	return { body, boundary };
}

export async function findAppDataFile(fileName) {
	const query = [
		`name='${fileName.replace(/'/g, "\\'")}'`,
		"'appDataFolder' in parents",
	].join(' and ');

	const params = new URLSearchParams({
		q: query,
		spaces: 'appDataFolder',
		fields: 'files(id,name,modifiedTime,appProperties)',
	});

	const url = buildDriveUrl(DRIVE_FILES_ENDPOINT, null, params);
	const response = await driveRequest(url);
	const data = await response.json();
	return data.files?.[0] || null;
}

export async function listAppDataFiles({ namePrefix } = {}) {
	const queryParts = ["'appDataFolder' in parents"];
	if (namePrefix) {
		const safePrefix = namePrefix.replace(/'/g, "\\'");
		queryParts.push(`name contains '${safePrefix}'`);
	}

	const files = [];
	let pageToken = null;

	do {
		const params = new URLSearchParams({
			q: queryParts.join(' and '),
			spaces: 'appDataFolder',
			fields: 'nextPageToken,files(id,name,modifiedTime,appProperties)',
		});

		if (pageToken) {
			params.set('pageToken', pageToken);
		}

		const url = buildDriveUrl(DRIVE_FILES_ENDPOINT, null, params);
		const response = await driveRequest(url);
		const data = await response.json();
		if (Array.isArray(data.files)) {
			files.push(...data.files);
		}
		pageToken = data.nextPageToken || null;
	} while (pageToken);

	return files;
}

export async function downloadAppDataFile(fileId) {
	const params = new URLSearchParams({ alt: 'media' });
	const url = buildDriveUrl(DRIVE_FILES_ENDPOINT, fileId, params);
	const response = await driveRequest(url);
	return await response.text();
}

export async function createAppDataFile({ name, content, mimeType, appProperties }) {
	const metadata = {
		name,
		parents: ['appDataFolder'],
		appProperties,
	};
	const { body, boundary } = buildMultipartBody(metadata, content, mimeType);
	const params = new URLSearchParams({
		uploadType: 'multipart',
		fields: 'id,modifiedTime,appProperties',
	});

	const url = buildDriveUrl(DRIVE_UPLOAD_ENDPOINT, null, params);
	const response = await driveRequest(url, {
		method: 'POST',
		headers: {
			'Content-Type': `multipart/related; boundary=${boundary}`,
		},
		body,
	});

	return await response.json();
}

export async function updateAppDataFile({ fileId, content, mimeType, appProperties }) {
	const metadata = {
		appProperties,
	};
	const { body, boundary } = buildMultipartBody(metadata, content, mimeType);
	const params = new URLSearchParams({
		uploadType: 'multipart',
		fields: 'id,modifiedTime,appProperties',
	});

	const url = buildDriveUrl(DRIVE_UPLOAD_ENDPOINT, fileId, params);
	const response = await driveRequest(url, {
		method: 'PATCH',
		headers: {
			'Content-Type': `multipart/related; boundary=${boundary}`,
		},
		body,
	});

	return await response.json();
}
