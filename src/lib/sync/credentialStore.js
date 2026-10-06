import { getRepositoryContext } from '@/lib/db';

// Secrets never enter Zustand persistence or IndexedDB. The desktop vault is
// the only persistent destination; a browser session uses this process memory.
const sessionSecrets = new Map();
const bridge = () => globalThis.window?.electronAPI;
const keyFor = (context, key) => `${context.profileId}:${key}`;

export async function credentialCapabilities() {
	const api = bridge();
	return api?.isElectron && api.credentialStatus ? api.credentialStatus() : { canRemember: false };
}

export async function readSecret(key, context = null) {
	context ||= await getRepositoryContext();
	const cached = sessionSecrets.get(keyFor(context, key));
	if (cached !== undefined) { context.assertCurrent(); return cached; }
	const api = bridge();
	const value = api?.isElectron && api.getCredential ? await api.getCredential({ profileId: context.profileId, key }) : null;
	context.assertCurrent();
	if (value !== null) sessionSecrets.set(keyFor(context, key), value);
	return value;
}

export async function writeSecret(key, value, { remember = false, context = null } = {}) {
	context ||= await getRepositoryContext();
	context.assertCurrent();
	const api = bridge();
	if (remember) {
		if (!(await credentialCapabilities()).canRemember) throw new Error('Secure credential storage is unavailable');
		context.assertCurrent();
		await api.setCredential({ profileId: context.profileId, key, value });
	} else if (api?.isElectron && api.removeCredential) {
		await api.removeCredential({ profileId: context.profileId, key });
	}
	context.assertCurrent();
	sessionSecrets.set(keyFor(context, key), value);
}

export async function removeSecret(key, context = null) {
	context ||= await getRepositoryContext();
	context.assertCurrent();
	const api = bridge();
	if (api?.isElectron && api.removeCredential) await api.removeCredential({ profileId: context.profileId, key });
	context.assertCurrent();
	sessionSecrets.delete(keyFor(context, key));
}

export async function readAccount(provider, context = null) {
	context ||= await getRepositoryContext();
	const stored = await readSecret(`${provider}-account`, context);
	if (stored) return JSON.parse(stored);
	// Migrate only the active generation. The historical source database remains
	// untouched as recovery evidence. Browser users explicitly authenticate again.
	const legacy = await context.db.syncAccounts.get(provider);
	context.assertCurrent();
	if (!legacy || !(await credentialCapabilities()).canRemember) return null;
	await writeSecret(`${provider}-account`, JSON.stringify(legacy), { remember: true, context });
	context.assertCurrent();
	await context.db.syncAccounts.delete(provider);
	return legacy;
}

export async function writeAccount(provider, data, context = null) {
	context ||= await getRepositoryContext();
	const payload = { provider, ...data };
	await writeSecret(`${provider}-account`, JSON.stringify(payload), { remember: (await credentialCapabilities()).canRemember, context });
	context.assertCurrent();
	await context.db.syncAccounts.delete(provider);
	return payload;
}

export async function removeAccount(provider, context = null) {
	context ||= await getRepositoryContext();
	await removeSecret(`${provider}-account`, context);
	await removeSecret(`${provider}-passphrase`, context);
	context.assertCurrent();
	await context.db.syncAccounts.delete(provider);
}
