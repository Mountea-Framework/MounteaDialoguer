export const FILE_PREFIX = 'mountea-project-';
export const FILE_SUFFIX = '.mnteasnap';
export const LEGACY_FILE_SUFFIXES = Object.freeze(['.mteasnap']);
export const MIME_TYPE = 'application/json';
export const MAX_SYNC_PAYLOAD_BYTES = 20 * 1024 * 1024;
export const STEAM_REMOTE_LIST_RETRY_COUNT = 8;
export const STEAM_REMOTE_LIST_RETRY_DELAY_MS = 3000;

export function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
