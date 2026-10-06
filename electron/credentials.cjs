const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

function createCredentialVault({ safeStorage, directory, platform = process.platform }) {
	let pending = Promise.resolve();
	const file = path.join(directory, 'credentials.v1.json');
	const available = () => Boolean(safeStorage.isEncryptionAvailable()) && (platform !== 'linux' || (typeof safeStorage.getSelectedStorageBackend === 'function' && safeStorage.getSelectedStorageBackend() !== 'basic_text'));
	const read = async () => {
		try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
	};
	const serialize = (action) => {
		const result = pending.then(action, action);
		pending = result.catch(() => {});
		return result;
	};
	const write = async (records) => {
		await fs.mkdir(directory, { recursive: true });
		const temporary = `${file}.${crypto.randomUUID()}.tmp`;
		try { await fs.writeFile(temporary, JSON.stringify(records), { mode: 0o600 }); await fs.rename(temporary, file); }
		finally { await fs.rm(temporary, { force: true }); }
	};
	return {
		status: () => ({ canRemember: available() }),
		get: (profileId, key) => serialize(async () => {
			if (!available()) return null;
			const value = (await read())[`${profileId}:${key}`];
			return value ? safeStorage.decryptString(Buffer.from(value, 'base64')) : null;
		}),
		set: (profileId, key, value) => serialize(async () => {
			if (!available()) throw new Error('Secure credential storage is unavailable; remembering is disabled');
			const records = await read();
			records[`${profileId}:${key}`] = safeStorage.encryptString(value).toString('base64');
			await write(records);
			return true;
		}),
		remove: (profileId, key) => serialize(async () => { const records = await read(); delete records[`${profileId}:${key}`]; await write(records); return true; }),
	};
}
module.exports = { createCredentialVault };
