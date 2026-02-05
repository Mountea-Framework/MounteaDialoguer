import { getSyncAccount, upsertSyncAccount } from '@/lib/sync/syncStorage';
import { refreshAccessToken } from '@/lib/sync/googleDriveAuth';

const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files';

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
		throw new Error('Missing refresh token');
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

async function driveRequest(path, options = {}) {
	const token = await getValidAccessToken();
	const response = await fetch(path, {
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

	const response = await driveRequest(`${DRIVE_FILES_ENDPOINT}?${params.toString()}`);
	const data = await response.json();
	return data.files?.[0] || null;
}

export async function downloadAppDataFile(fileId) {
	const response = await driveRequest(`${DRIVE_FILES_ENDPOINT}/${fileId}?alt=media`);
	return await response.text();
}

export async function createAppDataFile({ name, content, mimeType, appProperties }) {
	const metadata = {
		name,
		parents: ['appDataFolder'],
		appProperties,
	};
	const { body, boundary } = buildMultipartBody(metadata, content, mimeType);

	const response = await driveRequest(
		`${DRIVE_UPLOAD_ENDPOINT}?uploadType=multipart&fields=id,modifiedTime,appProperties`,
		{
			method: 'POST',
			headers: {
				'Content-Type': `multipart/related; boundary=${boundary}`,
			},
			body,
		}
	);

	return await response.json();
}

export async function updateAppDataFile({ fileId, content, mimeType, appProperties }) {
	const metadata = {
		appProperties,
	};
	const { body, boundary } = buildMultipartBody(metadata, content, mimeType);

	const response = await driveRequest(
		`${DRIVE_UPLOAD_ENDPOINT}/${fileId}?uploadType=multipart&fields=id,modifiedTime,appProperties`,
		{
			method: 'PATCH',
			headers: {
				'Content-Type': `multipart/related; boundary=${boundary}`,
			},
			body,
		}
	);

	return await response.json();
}
