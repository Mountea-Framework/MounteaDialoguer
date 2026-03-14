export const FILE_PREFIX = 'mountea-project-';
export const FILE_SUFFIX = '.mnteasnap';
export const LEGACY_FILE_SUFFIXES = Object.freeze(['.mteasnap']);
export const MIME_TYPE = 'application/json';

const BYTES_PER_MEBIBYTE = 1024 * 1024;
export const MAX_SYNC_PAYLOAD_MIB = 20;
export const MAX_SYNC_PAYLOAD_BYTES = MAX_SYNC_PAYLOAD_MIB * BYTES_PER_MEBIBYTE;

export const SYNC_CATALOG_FILE_NAME = '_mountea-sync-catalog.v1.json';
export const SYNC_CATALOG_SCHEMA_VERSION = 1;
export const SYNC_TOMBSTONE_TTL_DAYS = 30;
export const SYNC_TOMBSTONE_TTL_MS = SYNC_TOMBSTONE_TTL_DAYS * 24 * 60 * 60 * 1000;

export const STEAM_REMOTE_LIST_RETRY_COUNT = 8;
export const STEAM_REMOTE_LIST_RETRY_DELAY_MS = 3000;

export function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
