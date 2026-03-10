export const FILE_PREFIX = 'mountea-project-';
export const FILE_SUFFIX = '.mteasnap';
export const MIME_TYPE = 'application/json';
export const STEAM_REMOTE_LIST_RETRY_COUNT = 8;
export const STEAM_REMOTE_LIST_RETRY_DELAY_MS = 3000;

export function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
