import { db } from '@/lib/db';

export async function getSyncAccount(provider) {
	if (!provider) return null;
	return await db.syncAccounts.get(provider);
}

export async function upsertSyncAccount(provider, data) {
	if (!provider) return null;
	const payload = {
		provider,
		...data,
	};
	await db.syncAccounts.put(payload);
	return payload;
}

export async function clearSyncAccount(provider) {
	if (!provider) return;
	await db.syncAccounts.delete(provider);
}

export async function getSyncProject(projectId, provider) {
	if (!projectId || !provider) return null;
	return await db.syncProjects.get([projectId, provider]);
}

export async function upsertSyncProject(projectId, provider, data) {
	if (!projectId || !provider) return null;
	const payload = {
		projectId,
		provider,
		...data,
	};
	await db.syncProjects.put(payload);
	return payload;
}

export async function clearSyncProject(projectId, provider) {
	if (!projectId || !provider) return;
	await db.syncProjects.delete([projectId, provider]);
}
