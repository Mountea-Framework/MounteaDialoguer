// Shared disk storage for the app server and the MCP server.
// The web app syncs through immutable revision files (see src/lib/sync/core/revisionProtocol.js); this module is the
// "file store" behind that protocol: DATA_DIR/sync/<name>. A file is never rewritten once created, so the
// revision history doubles as the backup history.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(here, '..', 'data'));
export const SYNC_DIR = path.join(DATA_DIR, 'sync');
export const LEGACY_PROJECTS_DIR = path.join(DATA_DIR, 'projects');
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // same cap as MAX_SYNC_PAYLOAD_BYTES in the web app

// Only names the protocol uses. No path separators, no hidden files.
export const isValidFileName = (name) => /^mountea-[A-Za-z0-9._-]{1,200}$/.test(name || '') && !name.includes('..');
export const isImmutableFile = (name) => ['mountea-revision-v2--', 'mountea-deletion-v2--'].some((prefix) => name.startsWith(prefix));
function assertMutable(name) {
	if (isImmutableFile(name)) throw Object.assign(new Error('Historical files are immutable. Create a new revision instead.'), { status: 409, code: 'IMMUTABLE_FILE' });
}

export class FileExistsError extends Error {
	constructor(name) {
		super(`File "${name}" already exists`);
		this.status = 409;
	}
}

export async function ensureDirs() {
	await fs.mkdir(SYNC_DIR, { recursive: true });
}

export async function readJson(file, fallback) {
	try {
		return JSON.parse(await fs.readFile(file, 'utf8'));
	} catch {
		return fallback;
	}
}

// Write atomically: temp file then rename.
export async function writeAtomic(file, text) {
	const tmp = `${file}.${randomUUID()}.tmp`;
	try { await fs.writeFile(tmp, text, { flag: 'wx' }); await fs.rename(tmp, file); }
	finally { await fs.unlink(tmp).catch(() => {}); }
}

const filePath = (name) => path.join(SYNC_DIR, name);

export async function listFiles({ prefix = '', name = '' } = {}) {
	const entries = await fs.readdir(SYNC_DIR).catch(() => []);
	return entries
		.filter((entry) => isValidFileName(entry) && !entry.endsWith('.tmp'))
		.filter((entry) => (name ? entry === name : entry.startsWith(prefix)))
		.sort()
		.map((entry) => ({ id: entry, name: entry }));
}

export async function readFileText(name) {
	if (!isValidFileName(name)) return null;
	try {
		return await fs.readFile(filePath(name), 'utf8');
	} catch {
		return null;
	}
}

/** Creates a file; refuses to replace an existing one (revisions are immutable). */
export async function createFile(name, content) {
	if (!isValidFileName(name)) throw Object.assign(new Error('Invalid file name'), { status: 400 });
	if (Buffer.byteLength(content) > MAX_FILE_BYTES) throw Object.assign(new Error('File too large'), { status: 413 });
	await ensureDirs();
	const tmp = `${filePath(name)}.${randomUUID()}.tmp`;
	await fs.writeFile(tmp, content, { flag: 'wx' });
	try {
		// link() fails if the target exists: atomic create-if-absent.
		await fs.link(tmp, filePath(name));
	} catch (error) {
		if (error.code === 'EEXIST') throw new FileExistsError(name);
		throw error;
	} finally {
		await fs.unlink(tmp).catch(() => {});
	}
	return { id: name, name };
}

export async function updateFile(name, content) {
	if (!isValidFileName(name)) throw Object.assign(new Error('Invalid file name'), { status: 400 });
	assertMutable(name);
	if (Buffer.byteLength(content) > MAX_FILE_BYTES) throw Object.assign(new Error('File too large'), { status: 413 });
	await writeAtomic(filePath(name), content);
	return { id: name, name };
}

export async function deleteFile(name) {
	if (!isValidFileName(name)) return;
	assertMutable(name);
	await fs.unlink(filePath(name)).catch(() => {});
}
