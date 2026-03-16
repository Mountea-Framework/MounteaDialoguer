import { getActiveProfileId } from '@/lib/profile/activeProfile';
import {
	MIME_TYPE,
	SYNC_CATALOG_FILE_NAME,
	SYNC_CATALOG_SCHEMA_VERSION,
} from '@/lib/sync/core/constants';
import { getSyncContext } from '@/lib/sync/core/providerGateway';

function toIsoOrFallback(value, fallbackIso) {
	if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
		return value;
	}
	return fallbackIso;
}

function toRevision(value) {
	const revision = Number(value || 0);
	if (Number.isNaN(revision) || revision < 0) return 0;
	return Math.floor(revision);
}

function normalizeProjectObject(item = {}, fallbackIso) {
	const projectId = String(item?.projectId || '').trim();
	if (!projectId) return null;
	const snapshotFileId = String(item?.snapshotFileId || '').trim();
	return {
		projectId,
		snapshotFileId,
		snapshotRevision: toRevision(item?.snapshotRevision),
		updatedAt: toIsoOrFallback(item?.updatedAt, fallbackIso),
	};
}

function normalizeDialogueObject(item = {}, fallbackIso) {
	const dialogueId = String(item?.dialogueId || '').trim();
	const projectId = String(item?.projectId || '').trim();
	if (!dialogueId || !projectId) return null;
	return {
		dialogueId,
		projectId,
		updatedAt: toIsoOrFallback(item?.updatedAt, fallbackIso),
	};
}

function normalizeTombstone(item = {}, fallbackIso) {
	const entityTypeRaw = String(item?.entityType || '').trim().toLowerCase();
	const entityType =
		entityTypeRaw === 'dialogue' || entityTypeRaw === 'project' ? entityTypeRaw : '';
	const entityId = String(item?.entityId || '').trim();
	if (!entityType || !entityId) return null;
	const deletedAt = toIsoOrFallback(item?.deletedAt, fallbackIso);
	const expiresAt = toIsoOrFallback(item?.expiresAt, fallbackIso);
	return {
		entityType,
		entityId,
		projectId: String(item?.projectId || '').trim() || '',
		deletedAt,
		expiresAt,
	};
}

export function createDefaultProviderCatalog(nowIso = new Date().toISOString()) {
	return {
		schemaVersion: SYNC_CATALOG_SCHEMA_VERSION,
		catalogRevision: 0,
		updatedAt: nowIso,
		objects: {
			projects: [],
			dialogues: [],
		},
		tombstones: [],
	};
}

export function normalizeProviderCatalog(catalog = null) {
	const nowIso = new Date().toISOString();
	const source =
		catalog && typeof catalog === 'object' && !Array.isArray(catalog)
			? catalog
			: createDefaultProviderCatalog(nowIso);

	const projects = Array.isArray(source?.objects?.projects)
		? source.objects.projects
				.map((item) => normalizeProjectObject(item, nowIso))
				.filter(Boolean)
		: [];
	const dialogues = Array.isArray(source?.objects?.dialogues)
		? source.objects.dialogues
				.map((item) => normalizeDialogueObject(item, nowIso))
				.filter(Boolean)
		: [];
	const tombstones = Array.isArray(source?.tombstones)
		? source.tombstones.map((item) => normalizeTombstone(item, nowIso)).filter(Boolean)
		: [];

	return {
		schemaVersion: SYNC_CATALOG_SCHEMA_VERSION,
		catalogRevision: toRevision(source?.catalogRevision),
		updatedAt: toIsoOrFallback(source?.updatedAt, nowIso),
		objects: {
			projects,
			dialogues,
		},
		tombstones,
	};
}

export function stripCatalogTransientFields(catalog = null) {
	return normalizeProviderCatalog(catalog);
}

export async function readProviderCatalog(provider) {
	const { providerId, storage } = getSyncContext({ provider });
	try {
		const remoteFile = await storage.findFileByName(SYNC_CATALOG_FILE_NAME);
		if (!remoteFile?.id) {
			return {
				providerId,
				readable: true,
				exists: false,
				fileId: '',
				catalog: createDefaultProviderCatalog(),
			};
		}

		const rawText = await storage.downloadFile(remoteFile.id);
		let parsed = null;
		try {
			parsed = JSON.parse(rawText);
		} catch (error) {
			parsed = null;
		}

		return {
			providerId,
			readable: true,
			exists: true,
			fileId: String(remoteFile.id || ''),
			catalog: normalizeProviderCatalog(parsed),
		};
	} catch (error) {
		return {
			providerId,
			readable: false,
			exists: false,
			fileId: '',
			catalog: createDefaultProviderCatalog(),
			error: String(error?.message || error),
		};
	}
}

export async function writeProviderCatalog(provider, catalog, options = {}) {
	const { providerId, storage } = getSyncContext({ provider });
	const nowIso = new Date().toISOString();
	const normalized = normalizeProviderCatalog(catalog);
	const nextCatalog = {
		...normalized,
		catalogRevision:
			options?.bumpRevision === false
				? toRevision(normalized.catalogRevision)
				: toRevision(normalized.catalogRevision) + 1,
		updatedAt: nowIso,
	};

	const appProperties = {
		schemaVersion: String(SYNC_CATALOG_SCHEMA_VERSION),
		catalogRevision: String(nextCatalog.catalogRevision),
		profileId: String(getActiveProfileId() || 'local'),
		updatedAt: nowIso,
		kind: 'mountea-sync-catalog',
	};

	const content = JSON.stringify(stripCatalogTransientFields(nextCatalog));
	let fileId = String(options?.fileId || '').trim();
	if (!fileId) {
		const existing = await storage.findFileByName(SYNC_CATALOG_FILE_NAME);
		fileId = String(existing?.id || '').trim();
	}

	if (fileId) {
		const result = await storage.updateFile({
			fileId,
			content,
			mimeType: MIME_TYPE,
			appProperties,
		});
		return {
			providerId,
			fileId: String(result?.id || fileId),
			catalog: nextCatalog,
		};
	}

	const result = await storage.createFile({
		name: SYNC_CATALOG_FILE_NAME,
		content,
		mimeType: MIME_TYPE,
		appProperties,
	});
	return {
		providerId,
		fileId: String(result?.id || ''),
		catalog: nextCatalog,
	};
}

function compareByUpdatedAtThenRevision(current, candidate) {
	if (!current) return candidate;
	if (!candidate) return current;
	const currentRevision = toRevision(current?.snapshotRevision);
	const candidateRevision = toRevision(candidate?.snapshotRevision);
	if (candidateRevision !== currentRevision) {
		return candidateRevision > currentRevision ? candidate : current;
	}
	const currentTime = Date.parse(current?.updatedAt || '') || 0;
	const candidateTime = Date.parse(candidate?.updatedAt || '') || 0;
	if (candidateTime !== currentTime) {
		return candidateTime > currentTime ? candidate : current;
	}
	return current;
}

function compareByDeletedAtThenExpiry(current, candidate) {
	if (!current) return candidate;
	if (!candidate) return current;
	const currentDeletedAt = Date.parse(current?.deletedAt || '') || 0;
	const candidateDeletedAt = Date.parse(candidate?.deletedAt || '') || 0;
	if (candidateDeletedAt !== currentDeletedAt) {
		return candidateDeletedAt > currentDeletedAt ? candidate : current;
	}
	const currentExpiresAt = Date.parse(current?.expiresAt || '') || 0;
	const candidateExpiresAt = Date.parse(candidate?.expiresAt || '') || 0;
	if (candidateExpiresAt !== currentExpiresAt) {
		return candidateExpiresAt > currentExpiresAt ? candidate : current;
	}
	return current;
}

export function mergeProviderCatalogs(catalogEntries = []) {
	const nowIso = new Date().toISOString();
	const nowMs = Date.now();
	const projectMap = new Map();
	const dialogueMap = new Map();
	const tombstoneMap = new Map();
	let maxRevision = 0;

	for (const entry of catalogEntries) {
		if (!entry?.readable) continue;
		const providerId = String(entry?.providerId || entry?.provider || '').trim();
		const catalog = normalizeProviderCatalog(entry?.catalog);
		maxRevision = Math.max(maxRevision, toRevision(catalog.catalogRevision));

		for (const project of catalog.objects.projects || []) {
			const key = String(project?.projectId || '').trim();
			if (!key) continue;
			const candidate = {
				...project,
				sourceProvider: providerId,
			};
			projectMap.set(key, compareByUpdatedAtThenRevision(projectMap.get(key), candidate));
		}

		for (const dialogue of catalog.objects.dialogues || []) {
			const key = String(dialogue?.dialogueId || '').trim();
			if (!key) continue;
			const candidate = {
				...dialogue,
				sourceProvider: providerId,
			};
			dialogueMap.set(key, compareByUpdatedAtThenRevision(dialogueMap.get(key), candidate));
		}

		for (const tombstone of catalog.tombstones || []) {
			const key = `${tombstone.entityType}:${tombstone.entityId}`;
			const current = tombstoneMap.get(key);
			const candidate = compareByDeletedAtThenExpiry(current, {
				...tombstone,
				sourceProviders: Array.from(
					new Set(
						[
							...(Array.isArray(current?.sourceProviders) ? current.sourceProviders : []),
							providerId,
						].filter(Boolean)
					)
				),
			});
			tombstoneMap.set(key, candidate);
		}
	}

	const activeTombstones = Array.from(tombstoneMap.values()).filter((item) => {
		const expiresAtMs = item?.expiresAt ? Date.parse(item.expiresAt) : 0;
		return !(expiresAtMs && expiresAtMs <= nowMs);
	});

	const projectTombstones = new Set(
		activeTombstones
			.filter((item) => item.entityType === 'project')
			.map((item) => String(item.entityId || '').trim())
			.filter(Boolean)
	);
	const dialogueTombstones = new Set(
		activeTombstones
			.filter((item) => item.entityType === 'dialogue')
			.map((item) => String(item.entityId || '').trim())
			.filter(Boolean)
	);

	for (const projectId of projectTombstones) {
		projectMap.delete(projectId);
	}

	for (const dialogueId of dialogueTombstones) {
		dialogueMap.delete(dialogueId);
	}

	for (const [dialogueId, dialogue] of dialogueMap.entries()) {
		if (projectTombstones.has(String(dialogue?.projectId || '').trim())) {
			dialogueMap.delete(dialogueId);
		}
	}

	return {
		schemaVersion: SYNC_CATALOG_SCHEMA_VERSION,
		catalogRevision: maxRevision,
		updatedAt: nowIso,
		objects: {
			projects: Array.from(projectMap.values()),
			dialogues: Array.from(dialogueMap.values()),
		},
		tombstones: activeTombstones,
	};
}
