import { getRepositoryContext } from '@/lib/db';
import { readAccount, writeAccount, removeAccount } from '@/lib/sync/credentialStore';
import { getActiveProfileId } from '@/lib/profile/activeProfile';
import { SYNC_TOMBSTONE_TTL_MS } from '@/lib/sync/core/constants';

export async function getSyncAccount(provider, context = null) {
	return provider ? readAccount(provider, context) : null;
}
export async function upsertSyncAccount(provider, data, context = null) {
	return provider ? writeAccount(provider, data, context) : null;
}
export async function clearSyncAccount(provider, context = null) {
	if (provider) await removeAccount(provider, context);
}
export async function getSyncProject(projectId, provider) {
	const context = await getRepositoryContext(); context.assertCurrent();
	if (!projectId || !provider) return null;
	return await context.db.syncProjects.get([projectId, provider]);
}

export async function upsertSyncProject(projectId, provider, data) {
	const context = await getRepositoryContext(); context.assertCurrent();
	if (!projectId || !provider) return null;
	const payload = {
		projectId,
		provider,
		...data,
	};
	await context.db.syncProjects.put(payload);
	return payload;
}

export async function clearSyncProject(projectId, provider) {
	const context = await getRepositoryContext(); context.assertCurrent();
	if (!projectId || !provider) return;
	await context.db.syncProjects.delete([projectId, provider]);
}

function sanitizeProfileId(value) {
	const normalized = String(value || '').trim();
	if (!normalized) return 'local';
	return normalized.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function resolveProfileId(profileId = '') {
	if (profileId) return sanitizeProfileId(profileId);
	return sanitizeProfileId(getActiveProfileId());
}

function normalizeEntityType(entityType) {
	const normalized = String(entityType || '').trim().toLowerCase();
	if (normalized === 'project' || normalized === 'dialogue') {
		return normalized;
	}
	return '';
}

function normalizeIsoDate(value, fallbackIso = '') {
	if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
		return value;
	}
	return fallbackIso;
}


export async function getSyncCatalogState(provider, profileId = '') {
	const context = await getRepositoryContext(); context.assertCurrent();
	if (!provider) return null;
	const normalizedProfileId = resolveProfileId(profileId);
	return await context.db.syncCatalogState.get([provider, normalizedProfileId]);
}

export async function upsertSyncCatalogState(provider, profileId = '', data = {}) {
	const context = await getRepositoryContext(); context.assertCurrent();
	if (!provider) return null;
	const normalizedProfileId = resolveProfileId(profileId);
	const payload = {
		provider,
		profileId: normalizedProfileId,
		...data,
	};
	await context.db.syncCatalogState.put(payload);
	return payload;
}

export async function listSyncCatalogStates(provider = '') {
	const context = await getRepositoryContext(); context.assertCurrent();
	const providerId = String(provider || '').trim();
	if (!providerId) {
		return await context.db.syncCatalogState.toArray();
	}
	return await context.db.syncCatalogState.where('provider').equals(providerId).toArray();
}

export async function getSyncTombstone({ provider, entityType, entityId } = {}) {
	const context = await getRepositoryContext(); context.assertCurrent();
	const providerId = String(provider || '').trim();
	const normalizedEntityType = normalizeEntityType(entityType);
	const normalizedEntityId = String(entityId || '').trim();
	if (!providerId || !normalizedEntityType || !normalizedEntityId) return null;
	return await context.db.syncTombstones.get([providerId, normalizedEntityType, normalizedEntityId]);
}

export async function upsertSyncTombstone(input = {}) {
	const context = await getRepositoryContext(); context.assertCurrent();
	const providerId = String(input?.provider || '').trim();
	const entityType = normalizeEntityType(input?.entityType);
	const entityId = String(input?.entityId || '').trim();
	if (!providerId || !entityType || !entityId) return null;

	const nowIso = new Date().toISOString();
	const deletedAt = normalizeIsoDate(input?.deletedAt, nowIso) || nowIso;
	const expiresAt =
		normalizeIsoDate(input?.expiresAt) ||
		new Date(Date.parse(deletedAt) + SYNC_TOMBSTONE_TTL_MS).toISOString();
	const acknowledgedAt = normalizeIsoDate(input?.acknowledgedAt);
	const pending =
		input?.pending === undefined ? !acknowledgedAt : Boolean(input.pending);

	const payload = {
		provider: providerId,
		entityType,
		entityId,
		projectId: String(input?.projectId || '').trim() || '',
		deletedAt,
		expiresAt,
		pending,
		acknowledgedAt: acknowledgedAt || (pending ? '' : nowIso),
		updatedAt: nowIso,
	};

	context.assertCurrent();
	await context.db.syncTombstones.put(payload);
	return payload;
}

export async function acknowledgeSyncTombstone({
	provider,
	entityType,
	entityId,
	acknowledgedAt = '',
} = {}) {
	const context = await getRepositoryContext(); context.assertCurrent();
	const existing = await getSyncTombstone({ provider, entityType, entityId });
	if (!existing) return null;
	const ackAt =
		normalizeIsoDate(acknowledgedAt, new Date().toISOString()) || new Date().toISOString();
	const payload = {
		...existing,
		pending: false,
		acknowledgedAt: ackAt,
		updatedAt: ackAt,
	};
	context.assertCurrent();
	await context.db.syncTombstones.put(payload);
	return payload;
}

export async function listSyncTombstones(options = {}) {
	const context = await getRepositoryContext(); context.assertCurrent();
	const providerId = String(options?.provider || '').trim();
	const entityType = normalizeEntityType(options?.entityType);
	const entityId = String(options?.entityId || '').trim();
	const projectId = String(options?.projectId || '').trim();
	const pendingOnly = Boolean(options?.pendingOnly);

	let items = [];
	if (providerId) {
		items = await context.db.syncTombstones.where('provider').equals(providerId).toArray();
	} else if (entityType) {
		items = await context.db.syncTombstones.where('entityType').equals(entityType).toArray();
	} else if (entityId) {
		items = await context.db.syncTombstones.where('entityId').equals(entityId).toArray();
	} else {
		items = await context.db.syncTombstones.toArray();
	}

	return items.filter((item) => {
		if (entityType && item.entityType !== entityType) return false;
		if (entityId && item.entityId !== entityId) return false;
		if (projectId && String(item.projectId || '').trim() !== projectId) return false;
		if (pendingOnly && !item.pending) return false;
		return true;
	});
}

export async function clearSyncTombstone() {
	throw new Error('Deletion evidence is retained indefinitely.');
}

export async function clearSyncTombstonesByEntity() {
	throw new Error('Deletion evidence is retained indefinitely.');
}

export async function hasActiveTombstone({ entityType, entityId, providers = [] } = {}) {
	const normalizedEntityType = normalizeEntityType(entityType);
	const normalizedEntityId = String(entityId || '').trim();
	if (!normalizedEntityType || !normalizedEntityId) return false;

	const providerFilter = Array.isArray(providers)
		? providers.map((item) => String(item || '').trim()).filter(Boolean)
		: [];
	const rows = await listSyncTombstones({
		entityType: normalizedEntityType,
		entityId: normalizedEntityId,
		includeExpired: false,
	});
	if (!providerFilter.length) {
		return rows.length > 0;
	}
	return rows.some((row) => providerFilter.includes(String(row?.provider || '').trim()));
}

export async function listPendingSyncTombstones(provider = '') {
	return await listSyncTombstones({
		provider,
		pendingOnly: true,
		includeExpired: false,
	});
}

// Legacy compatibility wrappers (project deletion queue v1).
export async function getSyncDeletion(projectId, provider) {
	return await getSyncTombstone({
		provider,
		entityType: 'project',
		entityId: projectId,
	});
}

export async function upsertSyncDeletion(projectId, provider, data = {}) {
	return await upsertSyncTombstone({
		provider,
		entityType: 'project',
		entityId: projectId,
		projectId,
		deletedAt: data?.deletedAt,
		expiresAt: data?.expiresAt,
		pending: data?.pending,
		acknowledgedAt: data?.acknowledgedAt,
	});
}

export async function listSyncDeletions(provider = '') {
	const rows = await listSyncTombstones({
		provider,
		entityType: 'project',
	});
	return rows.map((row) => ({
		...row,
		projectId: row.entityId,
	}));
}

export async function clearSyncDeletion(projectId, provider) {
	await clearSyncTombstone({
		provider,
		entityType: 'project',
		entityId: projectId,
	});
}
