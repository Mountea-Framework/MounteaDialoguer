import { db } from '@/lib/db';
import { getActiveProfileId } from '@/lib/profile/activeProfile';
import { encryptPayload, decryptPayload } from '@/lib/sync/crypto';
import {
	MIME_TYPE,
	MAX_SYNC_PAYLOAD_BYTES,
	SYNC_TOMBSTONE_TTL_MS,
} from '@/lib/sync/core/constants';
import {
	createDefaultProviderCatalog,
	mergeProviderCatalogs,
	normalizeProviderCatalog,
	readProviderCatalog,
	writeProviderCatalog,
} from '@/lib/sync/core/providerCatalog';
import { getSyncContext } from '@/lib/sync/core/providerGateway';
import {
	buildFileName,
	findRemoteProjectById,
} from '@/lib/sync/core/remoteCatalog';
import {
	applyProjectSnapshot,
	applyProjectSnapshotAsNew,
	buildProjectSnapshot,
} from '@/lib/sync/snapshot';
import {
	acknowledgeSyncTombstone,
	clearSyncProject,
	getSyncProject,
	hasActiveTombstone,
	listSyncTombstones,
	upsertSyncCatalogState,
	upsertSyncProject,
	upsertSyncTombstone,
} from '@/lib/sync/syncStorage';

function parseEncryptedPayloadJson(encryptedText, contextLabel = 'sync payload') {
	if (typeof encryptedText !== 'string') {
		throw new Error(`Invalid ${contextLabel}: expected text payload`);
	}

	const payloadBytes = new TextEncoder().encode(encryptedText).length;
	if (payloadBytes > MAX_SYNC_PAYLOAD_BYTES) {
		throw new Error(`Refusing oversized ${contextLabel}`);
	}

	let payload;
	try {
		payload = JSON.parse(encryptedText);
	} catch (error) {
		throw new Error(`Invalid ${contextLabel}: malformed JSON`);
	}

	if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
		throw new Error(`Invalid ${contextLabel}: expected object`);
	}

	return payload;
}

function summarizeSnapshot(snapshot) {
	const project = snapshot?.project || {};
	const dialogues = snapshot?.dialogues || [];
	return {
		projectId: project?.id || '',
		name: project?.name || '',
		version: project?.version || '',
		createdAt: project?.createdAt || '',
		modifiedAt: project?.modifiedAt || '',
		dialogueCount: dialogues.length,
		participantCount: snapshot?.participants?.length || 0,
		categoryCount: snapshot?.categories?.length || 0,
		decoratorCount: snapshot?.decorators?.length || 0,
		localizedStringCount: snapshot?.localizedStrings?.length || 0,
		nodeCount: snapshot?.nodes?.length || 0,
		edgeCount: snapshot?.edges?.length || 0,
		dialogueNames: dialogues.slice(0, 5).map((dialogue) => dialogue?.name || '').filter(Boolean),
	};
}

function toRevision(value) {
	const revision = Number(value || 0);
	if (Number.isNaN(revision) || revision < 0) return 0;
	return Math.floor(revision);
}

function toTimeMs(value) {
	const parsed = Date.parse(value || '');
	return Number.isNaN(parsed) ? 0 : parsed;
}

function resolvePassphraseForProvider(providerId, passphrase = '', passphrases = null) {
	if (passphrases && typeof passphrases === 'object') {
		const providerPassphrase = String(passphrases?.[providerId] || '').trim();
		if (providerPassphrase) return providerPassphrase;
	}
	return String(passphrase || '').trim();
}

function normalizeProviders(provider, providers = []) {
	const all = [];
	for (const entry of Array.isArray(providers) ? providers : []) {
		const value = String(entry || '').trim();
		if (value) all.push(value);
	}
	const providerId = String(provider || '').trim();
	if (providerId) all.push(providerId);
	return Array.from(new Set(all));
}

async function markProjectSyncTimestamp(projectId, syncTimestamp = '') {
	const normalizedProjectId = String(projectId || '').trim();
	if (!normalizedProjectId) return;
	const timestamp = syncTimestamp || new Date().toISOString();
	await db.projects.update(normalizedProjectId, { syncTimestamp: timestamp });
	const dialogues = await db.dialogues.where('projectId').equals(normalizedProjectId).toArray();
	if (!dialogues.length) return;
	await db.dialogues.bulkPut(
		dialogues.map((dialogue) => ({
			...dialogue,
			syncTimestamp: timestamp,
		}))
	);
}

async function deleteLocalDialogueRecords(dialogueId) {
	const normalizedDialogueId = String(dialogueId || '').trim();
	if (!normalizedDialogueId) return { deleted: false, reason: 'invalid-dialogue-id' };
	let deleted = false;
	await db.transaction('rw', [db.dialogues, db.nodes, db.edges, db.localizedStrings], async () => {
		const existing = await db.dialogues.get(normalizedDialogueId);
		if (!existing) return;
		deleted = true;
		await db.dialogues.delete(normalizedDialogueId);
		await db.nodes.where('dialogueId').equals(normalizedDialogueId).delete();
		await db.edges.where('dialogueId').equals(normalizedDialogueId).delete();
		await db.localizedStrings.where('dialogueId').equals(normalizedDialogueId).delete();
	});
	return { deleted, dialogueId: normalizedDialogueId };
}

async function deleteLocalProjectRecords(projectId, providerId = '') {
	const normalizedProjectId = String(projectId || '').trim();
	if (!normalizedProjectId) return { deleted: false, reason: 'invalid-project-id' };

	let deleted = false;
	await db.transaction(
		'rw',
		[
			db.projects,
			db.dialogues,
			db.participants,
			db.categories,
			db.decorators,
			db.conditions,
			db.localizedStrings,
			db.nodes,
			db.edges,
			db.syncProjects,
		],
		async () => {
			const existingProject = await db.projects.get(normalizedProjectId);
			deleted = Boolean(existingProject);
			const projectDialogues = await db.dialogues.where('projectId').equals(normalizedProjectId).toArray();
			const dialogueIds = projectDialogues.map((dialogue) => dialogue.id);

			if (dialogueIds.length > 0) {
				await db.nodes.where('dialogueId').anyOf(dialogueIds).delete();
				await db.edges.where('dialogueId').anyOf(dialogueIds).delete();
			}

			await db.projects.delete(normalizedProjectId);
			await db.dialogues.where('projectId').equals(normalizedProjectId).delete();
			await db.participants.where('projectId').equals(normalizedProjectId).delete();
			await db.categories.where('projectId').equals(normalizedProjectId).delete();
			await db.decorators.where('projectId').equals(normalizedProjectId).delete();
			await db.conditions.where('projectId').equals(normalizedProjectId).delete();
			await db.localizedStrings.where('projectId').equals(normalizedProjectId).delete();
			if (providerId) {
				await db.syncProjects.delete([normalizedProjectId, providerId]);
			} else {
				await db.syncProjects.where('projectId').equals(normalizedProjectId).delete();
			}
		}
	);

	return { deleted, projectId: normalizedProjectId };
}

function buildTombstonePayload({ entityType, entityId, projectId = '', deletedAt = '', expiresAt = '' }) {
	const normalizedEntityType = String(entityType || '').trim().toLowerCase();
	if (normalizedEntityType !== 'project' && normalizedEntityType !== 'dialogue') {
		throw new Error('Invalid tombstone entity type');
	}
	const normalizedEntityId = String(entityId || '').trim();
	if (!normalizedEntityId) {
		throw new Error('Invalid tombstone entity id');
	}
	const nowIso = new Date().toISOString();
	const normalizedDeletedAt = deletedAt && !Number.isNaN(Date.parse(deletedAt)) ? deletedAt : nowIso;
	const normalizedExpiresAt =
		expiresAt && !Number.isNaN(Date.parse(expiresAt))
			? expiresAt
			: new Date(toTimeMs(normalizedDeletedAt) + SYNC_TOMBSTONE_TTL_MS).toISOString();
	return {
		entityType: normalizedEntityType,
		entityId: normalizedEntityId,
		projectId: String(projectId || '').trim() || '',
		deletedAt: normalizedDeletedAt,
		expiresAt: normalizedExpiresAt,
	};
}

function upsertCatalogTombstone(catalog, tombstone) {
	const normalizedCatalog = normalizeProviderCatalog(catalog || createDefaultProviderCatalog());
	const key = `${tombstone.entityType}:${tombstone.entityId}`;
	const tombstoneMap = new Map((normalizedCatalog.tombstones || []).map((entry) => [`${entry.entityType}:${entry.entityId}`, entry]));
	const existing = tombstoneMap.get(key);
	if (!existing || toTimeMs(tombstone.deletedAt) >= toTimeMs(existing.deletedAt)) {
		tombstoneMap.set(key, tombstone);
	}
	return {
		...normalizedCatalog,
		tombstones: Array.from(tombstoneMap.values()),
	};
}

function setProjectInCatalog(catalog, { projectId, snapshotFileId, snapshotRevision, updatedAt, dialogueIds = [] }) {
	const normalizedCatalog = normalizeProviderCatalog(catalog || createDefaultProviderCatalog());
	const nextProjects = (normalizedCatalog.objects.projects || []).filter(
		(entry) => String(entry?.projectId || '').trim() !== projectId
	);
	nextProjects.push({ projectId, snapshotFileId, snapshotRevision: toRevision(snapshotRevision), updatedAt });
	const nextDialogues = (normalizedCatalog.objects.dialogues || []).filter(
		(entry) => String(entry?.projectId || '').trim() !== projectId
	);
	for (const dialogueId of dialogueIds) {
		nextDialogues.push({ dialogueId, projectId, updatedAt });
	}
	return {
		...normalizedCatalog,
		objects: {
			projects: nextProjects,
			dialogues: nextDialogues,
		},
	};
}

async function refreshCatalogState(providerId, catalogRevision = 0, status = 'ok', error = '') {
	await upsertSyncCatalogState(providerId, getActiveProfileId(), {
		catalogRevision,
		fetchedAt: new Date().toISOString(),
		status,
		error,
	});
}

export async function previewPullFromFile({ projectId, fileId, revision, passphrase, provider }) {
	const { storage } = getSyncContext({ provider });
	const encryptedText = await storage.downloadFile(fileId);
	const payload = parseEncryptedPayloadJson(encryptedText, 'remote sync payload');
	const snapshot = await decryptPayload(passphrase, payload);
	return {
		projectId,
		fileId,
		revision: revision ?? 0,
		summary: summarizeSnapshot(snapshot),
	};
}

export async function previewPushProject({ projectId }) {
	const snapshot = await buildProjectSnapshot(projectId);
	return {
		projectId,
		summary: summarizeSnapshot(snapshot),
	};
}

export async function pullProjectFromFile({ projectId, fileId, revision, passphrase, provider }) {
	const { providerId, storage } = getSyncContext({ provider });
	const encryptedText = await storage.downloadFile(fileId);
	const payload = parseEncryptedPayloadJson(encryptedText, 'remote sync payload');
	const snapshot = await decryptPayload(passphrase, payload);
	await applyProjectSnapshot(snapshot);
	const nowIso = new Date().toISOString();
	await markProjectSyncTimestamp(projectId, nowIso);
	await upsertSyncProject(projectId, providerId, {
		revision: revision ?? 0,
		remoteFileId: fileId,
		lastSyncedAt: nowIso,
	});
	return { pulled: true, revision: revision ?? 0 };
}

export async function pullProject({ projectId, passphrase, onProgress, provider }) {
	const { providerId, storage } = getSyncContext({ provider });
	onProgress?.('checking', 20);
	const remoteFile = await findRemoteProjectById(projectId, { provider: providerId });
	if (!remoteFile) {
		return { pulled: false, reason: 'missing' };
	}
	onProgress?.('downloading', 45);
	const encryptedText = await storage.downloadFile(remoteFile.fileId);
	const payload = parseEncryptedPayloadJson(encryptedText, 'remote sync payload');
	onProgress?.('decrypting', 70);
	const snapshot = await decryptPayload(passphrase, payload);
	onProgress?.('applying', 90);
	await applyProjectSnapshot(snapshot);
	const nowIso = new Date().toISOString();
	await markProjectSyncTimestamp(projectId, nowIso);
	const remoteRevision = Number(remoteFile.revision || 0);
	await upsertSyncProject(projectId, providerId, {
		revision: remoteRevision,
		remoteFileId: remoteFile.fileId,
		lastSyncedAt: nowIso,
	});
	return { pulled: true, revision: remoteRevision };
}

export async function pullProjectAsNew({ projectId, passphrase, fileId, revision, onProgress, provider }) {
	const { storage } = getSyncContext({ provider });
	const fileName = buildFileName(projectId);
	onProgress?.('checking', 20);
	const remoteFile = fileId ? { id: fileId } : await storage.findFileByName(fileName);
	if (!remoteFile) return { pulled: false, reason: 'missing' };
	onProgress?.('downloading', 45);
	const encryptedText = await storage.downloadFile(remoteFile.id);
	const payload = parseEncryptedPayloadJson(encryptedText, 'remote sync payload');
	onProgress?.('decrypting', 70);
	const snapshot = await decryptPayload(passphrase, payload);
	onProgress?.('applying', 90);
	const newProjectId = await applyProjectSnapshotAsNew(snapshot);
	return { pulled: true, sourceProjectId: projectId, newProjectId, revision: revision ?? 0 };
}
export async function pushProject({ projectId, passphrase, provider, mergedTombstones = [] }) {
	const { providerId, storage } = getSyncContext({ provider });
	const normalizedProjectId = String(projectId || '').trim();
	if (!normalizedProjectId) {
		throw new Error('Invalid project id');
	}

	const tombstonedInMerge = mergedTombstones.some(
		(entry) =>
			entry?.entityType === 'project' &&
			String(entry?.entityId || '').trim() === normalizedProjectId &&
			!(entry?.expiresAt && Date.parse(entry.expiresAt) <= Date.now())
	);
	if (tombstonedInMerge) {
		throw new Error(`Push blocked: project ${normalizedProjectId} is tombstoned`);
	}

	const hasLocalProjectTombstone = await hasActiveTombstone({
		entityType: 'project',
		entityId: normalizedProjectId,
	});
	if (hasLocalProjectTombstone) {
		throw new Error(`Push blocked: project ${normalizedProjectId} is tombstoned`);
	}

	const snapshot = await buildProjectSnapshot(normalizedProjectId);
	const snapshotDialogueIds = Array.isArray(snapshot?.dialogues)
		? snapshot.dialogues.map((dialogue) => String(dialogue?.id || '').trim()).filter(Boolean)
		: [];
	for (const dialogueId of snapshotDialogueIds) {
		const hasDialogueTombstone = await hasActiveTombstone({
			entityType: 'dialogue',
			entityId: dialogueId,
		});
		if (hasDialogueTombstone) {
			throw new Error(`Push blocked: dialogue ${dialogueId} is tombstoned`);
		}
	}

	const encryptedPayload = await encryptPayload(passphrase, snapshot);
	const content = JSON.stringify(encryptedPayload);
	const fileName = buildFileName(normalizedProjectId);
	const remoteFile = await findRemoteProjectById(normalizedProjectId, { provider: providerId });
	const localMeta = await getSyncProject(normalizedProjectId, providerId);
	const localRevision = toRevision(localMeta?.revision);
	const nextRevision = localRevision + 1;
	const nowIso = new Date().toISOString();

	const appProperties = {
		revision: String(nextRevision),
		projectId: normalizedProjectId,
		profileId: String(getActiveProfileId() || 'local'),
		schemaVersion: '1',
		updatedAt: nowIso,
	};

	let result;
	if (remoteFile?.fileId) {
		result = await storage.updateFile({
			fileId: remoteFile.fileId,
			content,
			mimeType: MIME_TYPE,
			appProperties,
		});
	} else {
		result = await storage.createFile({
			name: fileName,
			content,
			mimeType: MIME_TYPE,
			appProperties,
		});
	}

	const remoteFileId = String(result?.id || remoteFile?.fileId || '').trim();
	await upsertSyncProject(normalizedProjectId, providerId, {
		revision: nextRevision,
		remoteFileId,
		lastSyncedAt: nowIso,
	});
	await markProjectSyncTimestamp(normalizedProjectId, nowIso);

	const readResult = await readProviderCatalog(providerId);
	const nextCatalog = setProjectInCatalog(readResult?.catalog, {
		projectId: normalizedProjectId,
		snapshotFileId: remoteFileId,
		snapshotRevision: nextRevision,
		updatedAt: nowIso,
		dialogueIds: snapshotDialogueIds,
	});
	const writeResult = await writeProviderCatalog(providerId, nextCatalog, {
		fileId: readResult?.fileId || '',
	});
	await refreshCatalogState(providerId, toRevision(writeResult.catalog?.catalogRevision), 'ok', '');

	return { pushed: true, revision: nextRevision, providerId };
}

export async function publishTombstone({ provider, entityType, entityId, projectId = '', deletedAt = '', expiresAt = '' }) {
	const { providerId, storage } = getSyncContext({ provider });
	const tombstone = buildTombstonePayload({ entityType, entityId, projectId, deletedAt, expiresAt });
	const readResult = await readProviderCatalog(providerId);
	if (!readResult?.readable) {
		throw new Error(`Provider ${providerId} catalog is unavailable`);
	}

	let nextCatalog = normalizeProviderCatalog(readResult.catalog);
	const existingProject = (nextCatalog.objects.projects || []).find(
		(entry) => String(entry?.projectId || '').trim() === String(tombstone.entityId || '').trim()
	);
	nextCatalog = upsertCatalogTombstone(nextCatalog, tombstone);
	if (tombstone.entityType === 'project') {
		nextCatalog = {
			...nextCatalog,
			objects: {
				projects: (nextCatalog.objects.projects || []).filter(
					(entry) => String(entry?.projectId || '').trim() !== tombstone.entityId
				),
				dialogues: (nextCatalog.objects.dialogues || []).filter(
					(entry) => String(entry?.projectId || '').trim() !== tombstone.entityId
				),
			},
		};
	}
	if (tombstone.entityType === 'dialogue') {
		nextCatalog = {
			...nextCatalog,
			objects: {
				...nextCatalog.objects,
				dialogues: (nextCatalog.objects.dialogues || []).filter(
					(entry) => String(entry?.dialogueId || '').trim() !== tombstone.entityId
				),
			},
		};
	}

	const writeResult = await writeProviderCatalog(providerId, nextCatalog, {
		fileId: readResult.fileId || '',
	});
	await refreshCatalogState(providerId, toRevision(writeResult.catalog?.catalogRevision), 'ok', '');

	if (tombstone.entityType === 'project') {
		let fileIdToDelete = String(existingProject?.snapshotFileId || '').trim();
		if (!fileIdToDelete) {
			const remote = await findRemoteProjectById(tombstone.entityId, { provider: providerId });
			fileIdToDelete = String(remote?.fileId || '').trim();
		}
		if (fileIdToDelete && typeof storage.deleteFile === 'function') {
			await storage.deleteFile(fileIdToDelete);
		}
		await clearSyncProject(tombstone.entityId, providerId);
	}

	await upsertSyncTombstone({
		provider: providerId,
		entityType: tombstone.entityType,
		entityId: tombstone.entityId,
		projectId: tombstone.projectId,
		deletedAt: tombstone.deletedAt,
		expiresAt: tombstone.expiresAt,
		pending: false,
		acknowledgedAt: new Date().toISOString(),
	});
	await acknowledgeSyncTombstone({
		provider: providerId,
		entityType: tombstone.entityType,
		entityId: tombstone.entityId,
	});

	return { published: true, providerId, tombstone };
}

export async function applyMergedTombstones({ tombstones = [], fallbackProviders = [] } = {}) {
	const nowMs = Date.now();
	let deletedProjects = 0;
	let deletedDialogues = 0;
	for (const entry of tombstones) {
		const entityType = String(entry?.entityType || '').trim().toLowerCase();
		const entityId = String(entry?.entityId || '').trim();
		if (!entityId) continue;
		const expiresAtMs = entry?.expiresAt ? Date.parse(entry.expiresAt) : 0;
		if (expiresAtMs && expiresAtMs <= nowMs) continue;

		if (entityType === 'project') {
			const result = await deleteLocalProjectRecords(entityId);
			if (result?.deleted) deletedProjects += 1;
		} else if (entityType === 'dialogue') {
			const result = await deleteLocalDialogueRecords(entityId);
			if (result?.deleted) deletedDialogues += 1;
		} else {
			continue;
		}

		const providers = Array.from(
			new Set([
				...(Array.isArray(entry?.sourceProviders) ? entry.sourceProviders : []),
				...fallbackProviders,
			].filter(Boolean))
		);
		for (const providerId of providers) {
			await upsertSyncTombstone({
				provider: providerId,
				entityType,
				entityId,
				projectId: String(entry?.projectId || '').trim() || '',
				deletedAt: entry?.deletedAt,
				expiresAt: entry?.expiresAt,
				pending: false,
				acknowledgedAt: new Date().toISOString(),
			});
		}
	}
	return { deletedProjects, deletedDialogues };
}

export async function gcExpiredTombstones({ providers = [] } = {}) {
	const providerIds = normalizeProviders('', providers);
	const nowMs = Date.now();
	const localRows = await db.syncTombstones.toArray();
	const expiredRows = localRows.filter((row) => row?.expiresAt && Date.parse(row.expiresAt) <= nowMs && !row.pending);
	if (expiredRows.length > 0) {
		await db.syncTombstones.bulkDelete(
			expiredRows.map((row) => [row.provider, row.entityType, row.entityId])
		);
	}

	let catalogPurged = 0;
	for (const providerId of providerIds) {
		const readResult = await readProviderCatalog(providerId);
		if (!readResult?.readable) continue;
		const catalog = normalizeProviderCatalog(readResult.catalog);
		const nextTombstones = (catalog.tombstones || []).filter((entry) => !(entry?.expiresAt && Date.parse(entry.expiresAt) <= nowMs));
		if (nextTombstones.length === (catalog.tombstones || []).length) continue;
		catalogPurged += (catalog.tombstones || []).length - nextTombstones.length;
		await writeProviderCatalog(providerId, {
			...catalog,
			tombstones: nextTombstones,
		}, {
			fileId: readResult.fileId || '',
		});
	}

	return { localPurged: expiredRows.length, catalogPurged };
}

export async function deleteRemoteProject({ projectId, provider }) {
	const { providerId, storage } = getSyncContext({ provider });
	if (typeof storage.deleteFile !== 'function') {
		throw new Error(`Sync provider "${providerId}" does not support remote deletion`);
	}

	const remoteFile = await findRemoteProjectById(projectId, { provider: providerId });
	if (!remoteFile?.fileId) {
		await clearSyncProject(projectId, providerId);
		return { deleted: false, reason: 'missing' };
	}

	await storage.deleteFile(remoteFile.fileId);
	await clearSyncProject(projectId, providerId);
	return { deleted: true, fileId: remoteFile.fileId };
}

export async function deleteLocalProject({ projectId, provider }) {
	const { providerId } = getSyncContext({ provider });
	return await deleteLocalProjectRecords(projectId, providerId);
}

export async function syncAllProjects({
	passphrase,
	passphrases = null,
	onProgress,
	provider,
	providers = [],
	mode = 'full',
}) {
	const providerIds = normalizeProviders(provider, providers);
	if (!providerIds.length) {
		throw new Error('No sync provider available');
	}

	const readResults = await Promise.all(providerIds.map(async (providerId) => await readProviderCatalog(providerId)));
	for (const readResult of readResults) {
		if (readResult?.readable) {
			await refreshCatalogState(readResult.providerId, toRevision(readResult.catalog?.catalogRevision), 'ok', '');
		} else {
			await refreshCatalogState(readResult.providerId, 0, 'unavailable', String(readResult?.error || 'catalog-read-failed'));
		}
	}
	const readableCatalogs = readResults.filter((entry) => entry?.readable);
	if (!readableCatalogs.length) {
		return {
			mode,
			providers: providerIds,
			readableProviders: [],
			skippedDestructive: true,
			remoteCount: 0,
			localCount: await db.projects.count(),
		};
	}

	const mergedCatalog = mergeProviderCatalogs(readableCatalogs);
	const readableProviders = readableCatalogs.map((entry) => entry.providerId);
	await applyMergedTombstones({
		tombstones: mergedCatalog.tombstones,
		fallbackProviders: readableProviders,
	});

	const remoteProjects = Array.isArray(mergedCatalog.objects?.projects) ? mergedCatalog.objects.projects : [];
	const remoteMap = new Map(remoteProjects.map((entry) => [entry.projectId, entry]));
	const localProjects = await db.projects.toArray();
	const localMap = new Map(localProjects.map((entry) => [entry.id, entry]));
	const allSyncMeta = await db.syncProjects.toArray();
	const metaMap = new Map(allSyncMeta.map((entry) => [`${entry.projectId}::${entry.provider}`, entry]));
	const localProjectTombstones = await listSyncTombstones({
		entityType: 'project',
		includeExpired: false,
	});
	const localProjectTombstoneProviders = new Map();
	for (const entry of localProjectTombstones) {
		const projectId = String(entry?.entityId || '').trim();
		const providerId = String(entry?.provider || '').trim();
		if (!projectId || !providerId) continue;
		if (!localProjectTombstoneProviders.has(projectId)) {
			localProjectTombstoneProviders.set(projectId, new Set());
		}
		localProjectTombstoneProviders.get(projectId).add(providerId);
	}
	const toPull = [];
	const toPush = [];
	for (const remote of remoteProjects) {
		if (mode === 'push') continue;
		const projectId = String(remote?.projectId || '').trim();
		const sourceProvider = String(remote?.sourceProvider || '').trim();
		if (!projectId || !sourceProvider) continue;
		const localTombstoneProviders = localProjectTombstoneProviders.get(projectId);
		if (localTombstoneProviders?.has(sourceProvider)) {
			continue;
		}
		const local = localMap.get(projectId);
		const meta = metaMap.get(`${projectId}::${sourceProvider}`) || null;
		const localRevision = toRevision(meta?.revision);
		const remoteRevision = toRevision(remote?.snapshotRevision);
		if (!local || remoteRevision > localRevision || (!meta && toTimeMs(remote.updatedAt) > toTimeMs(local?.syncTimestamp))) {
			toPull.push({
				projectId,
				providerId: sourceProvider,
				fileId: String(remote?.snapshotFileId || '').trim(),
				revision: remoteRevision,
			});
		}
	}

	for (const local of localProjects) {
		if (mode === 'pull') continue;
		const projectId = String(local?.id || '').trim();
		if (!projectId) continue;
		const remote = remoteMap.get(projectId);
		if (!remote) {
			const hasAnyMeta = allSyncMeta.some((entry) => String(entry?.projectId || '').trim() === projectId);
			if (!hasAnyMeta && !local?.syncTimestamp) {
				toPush.push({ projectId, providerId: providerIds[0] });
			}
			continue;
		}

		const sourceProvider = String(remote?.sourceProvider || providerIds[0] || '').trim();
		if (!sourceProvider) continue;
		const meta = metaMap.get(`${projectId}::${sourceProvider}`) || null;
		const remoteRevision = toRevision(remote?.snapshotRevision);
		const localRevision = toRevision(meta?.revision);
		const hasUnsyncedChanges = toTimeMs(local?.modifiedAt) > toTimeMs(meta?.lastSyncedAt || local?.syncTimestamp) + 1000;
		if (!meta || localRevision > remoteRevision || hasUnsyncedChanges) {
			toPush.push({ projectId, providerId: sourceProvider });
		}
	}

	const total = toPull.length + toPush.length;
	onProgress?.({
		phase: 'start',
		mode,
		total,
		remoteCount: remoteProjects.length,
		localCount: localProjects.length,
	});

	let index = 0;
	for (const action of toPull) {
		index += 1;
		onProgress?.({ phase: 'pull', projectId: action.projectId, providerId: action.providerId, index, total });
		if (!action.fileId) continue;
		const providerPassphrase = resolvePassphraseForProvider(action.providerId, passphrase, passphrases);
		if (!providerPassphrase) {
			console.warn('[sync] Missing passphrase, skipping pull for provider', action.providerId);
			continue;
		}
		await pullProjectFromFile({
			projectId: action.projectId,
			fileId: action.fileId,
			revision: action.revision,
			passphrase: providerPassphrase,
			provider: action.providerId,
		});
	}

	for (const action of toPush) {
		index += 1;
		onProgress?.({ phase: 'push', projectId: action.projectId, providerId: action.providerId, index, total });
		const providerPassphrase = resolvePassphraseForProvider(action.providerId, passphrase, passphrases);
		if (!providerPassphrase) {
			console.warn('[sync] Missing passphrase, skipping push for provider', action.providerId);
			continue;
		}
		await pushProject({
			projectId: action.projectId,
			passphrase: providerPassphrase,
			provider: action.providerId,
			mergedTombstones: mergedCatalog.tombstones,
		});
	}

	await gcExpiredTombstones({ providers: readableProviders });

	return {
		mode,
		providers: providerIds,
		readableProviders,
		remoteCount: remoteProjects.length,
		localCount: localProjects.length,
		toPull: toPull.length,
		toPush: toPush.length,
		pendingTombstones: (await listSyncTombstones({ pendingOnly: true, includeExpired: false })).length,
	};
}

