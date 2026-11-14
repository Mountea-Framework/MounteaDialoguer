// Where the desktop app keeps its profile (userData). Shared by electron/main.cjs and the CLI (cli/dialoguer.mjs),
// which has to find <userData>/automation.json without Electron. Pure: callers pass the environment in.
const path = require('node:path');

const APP_DISPLAY_NAME = 'Mountea Dialoguer';

/** Fallbacks main.cjs tries when the default userData folder is not writable, in order. */
function fallbackUserDataDirs({ env = {}, tempPath = '' } = {}) {
	const candidates = [];
	const envOverride = String(env.MOUNTEA_USER_DATA_DIR || '').trim();
	if (envOverride) {
		candidates.push(envOverride);
	}

	const localAppData = String(env.LOCALAPPDATA || '').trim();
	if (localAppData) {
		candidates.push(path.join(localAppData, APP_DISPLAY_NAME));
		candidates.push(path.join(localAppData, APP_DISPLAY_NAME, 'user-data'));
	}

	const temp = String(tempPath || '').trim();
	if (temp) {
		candidates.push(path.join(temp, APP_DISPLAY_NAME, 'user-data'));
	}

	return [...new Set(candidates.filter(Boolean))];
}

/** Electron's default app.getPath('userData') for this product name. */
function defaultUserDataDir({ platform = process.platform, env = {}, homedir = '' } = {}) {
	if (platform === 'win32') return path.join(String(env.APPDATA || '').trim() || path.join(homedir, 'AppData', 'Roaming'), APP_DISPLAY_NAME);
	if (platform === 'darwin') return path.join(homedir, 'Library', 'Application Support', APP_DISPLAY_NAME);
	return path.join(String(env.XDG_CONFIG_HOME || '').trim() || path.join(homedir, '.config'), APP_DISPLAY_NAME);
}

/** Every folder the app may be using, most likely first: explicit choice, default, fallbacks. */
function userDataCandidates({ explicit = '', platform = process.platform, env = {}, homedir = '', tempPath = '' } = {}) {
	return [...new Set([
		String(explicit || '').trim(),
		defaultUserDataDir({ platform, env, homedir }),
		...fallbackUserDataDirs({ env, tempPath }),
	].filter(Boolean))];
}

module.exports = { APP_DISPLAY_NAME, fallbackUserDataDirs, defaultUserDataDir, userDataCandidates };
