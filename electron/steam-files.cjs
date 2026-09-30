const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

// Immutable account-scoped objects. Local cache is evidence, never an upload
// acknowledgement or an authority for remote absence.
function createSteamFileTransport({ cloud, directory, readLegacy = async () => [] }) {
	let pending = Promise.resolve();
	const serial = (action) => { const result = pending.then(action, action); pending = result.catch(() => {}); return result; };
	const segment = (value) => { if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid Steam identity'); return value; };
	const prefix = (profileId) => `mountea-v2__${segment(profileId)}__`;
	const filename = (profileId, id) => `${prefix(profileId)}${segment(id)}.json`;
	const ready = () => { const status = cloud.status(); if (!status?.available || !status.enabledForApp || !status.enabledForAccount) throw new Error('Steam Cloud unavailable'); };
	const metadata = (entry) => { const result = { ...entry }; delete result.content; return result; };
	const readEntry = (raw, profileId) => {
		const entry = JSON.parse(raw);
		if (entry.version !== 2 || entry.profileId !== profileId || typeof entry.content !== 'string' || typeof entry.name !== 'string' || entry.hash !== crypto.createHash('sha256').update(entry.content).digest('hex')) throw new Error('Corrupt Steam Cloud object');
		segment(entry.id);
		return entry;
	};
	const cache = async (profileId, entry) => {
		const folder = path.join(directory, segment(profileId), 'v2');
		await fs.mkdir(folder, { recursive: true });
		const target = path.join(folder, `${segment(entry.id)}.json`), temporary = `${target}.${crypto.randomUUID()}.tmp`;
		try { await fs.writeFile(temporary, JSON.stringify(entry)); await fs.rename(temporary, target); }
		finally { await fs.rm(temporary, { force: true }); }
	};
	const entries = async (profileId) => {
		ready();
		const names = [...new Set(await cloud.list())].filter((name) => name.startsWith(prefix(profileId)) && name.endsWith('.json'));
		const result = [];
		for (const name of names) result.push(readEntry(await cloud.read(name), profileId));
		return result;
	};
	const list = ({ profileId, namePrefix = '' }) => serial(async () => {
		const current = await entries(profileId);
		const legacy = namePrefix.startsWith('mountea-v2') ? [] : await readLegacy(profileId);
		return [...current, ...legacy].filter((entry) => entry.name.startsWith(namePrefix)).map(metadata);
	});
	const download = ({ profileId, fileId }) => serial(async () => {
		ready();
		const names = await cloud.list();
		if (names.includes(filename(profileId, fileId))) return readEntry(await cloud.read(filename(profileId, fileId)), profileId).content;
		const legacy = (await readLegacy(profileId)).find((entry) => entry.id === fileId);
		if (!legacy) throw new Error('Steam Cloud object missing');
		return legacy.content;
	});
	const create = (payload) => serial(async () => {
		const { profileId, name, content, mimeType = 'application/json', appProperties = {} } = payload;
		ready();
		// Deterministic identity makes retries idempotent even after a lost reply.
		const hash = crypto.createHash('sha256').update(content).digest('hex');
		const id = crypto.createHash('sha256').update(`${name}\0${hash}`).digest('hex');
		const entry = { version: 2, profileId, id, name, content, hash, mimeType, appProperties, modifiedTime: new Date().toISOString() };
		await cache(profileId, { ...entry, uploadState: 'pending' });
		const remoteName = filename(profileId, id);
		const names = await cloud.list();
		if (!names.includes(remoteName) && !(await cloud.write(remoteName, JSON.stringify(entry)))) throw new Error('Steam Cloud upload failed; local revision remains pending (quota or provider unavailable)');
		const verified = readEntry(await cloud.read(remoteName), profileId);
		if (verified.hash !== hash || verified.name !== name) throw new Error('Steam Cloud verification failed');
		await cache(profileId, { ...verified, uploadState: 'verified' });
		return { ...metadata(verified), cloudWritten: true, uploadState: 'verified' };
	});
	return {
		list,
		find: async ({ profileId, fileName }) => (await list({ profileId, namePrefix: fileName })).find((entry) => entry.name === fileName) || null,
		download,
		create,
		// An update publishes a new object; the old object remains readable.
		update: async (payload) => {
			const existing = (await list({ profileId: payload.profileId })).find((entry) => entry.id === payload.fileId);
			if (!existing) throw new Error('Steam Cloud object missing');
			return create({ ...existing, ...payload, name: payload.name || existing.name });
		},
		remove: () => Promise.reject(new Error('Remote history deletion is disabled; publish a deletion revision')),
	};
}
module.exports = { createSteamFileTransport };

