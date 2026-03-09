const APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const FULL_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const BASE_SCOPES = Object.freeze(['openid', 'email', 'profile']);

function isElectronRuntime() {
	if (typeof window === 'undefined') return false;
	return Boolean(window.electronAPI?.isElectron);
}

function normalizeEnvValue(value) {
	return String(value || '').trim();
}

export function getGoogleTeamFolderId() {
	const shared = normalizeEnvValue(import.meta.env.VITE_GOOGLE_TEAM_FOLDER_ID);
	const desktop = normalizeEnvValue(import.meta.env.VITE_GOOGLE_TEAM_FOLDER_ID_DESKTOP);
	const web = normalizeEnvValue(import.meta.env.VITE_GOOGLE_TEAM_FOLDER_ID_WEB);

	if (isElectronRuntime()) {
		return desktop || shared;
	}

	return web || shared;
}

export function getGoogleDriveSyncRoot() {
	const folderId = getGoogleTeamFolderId();
	if (folderId) {
		return {
			type: 'teamFolder',
			folderId,
		};
	}

	return {
		type: 'appData',
		folderId: '',
	};
}

export function isGoogleTeamSyncEnabled() {
	return getGoogleDriveSyncRoot().type === 'teamFolder';
}

export function getGoogleDriveScopes() {
	if (isGoogleTeamSyncEnabled()) {
		return [FULL_DRIVE_SCOPE, ...BASE_SCOPES];
	}

	return [APPDATA_SCOPE, ...BASE_SCOPES];
}
