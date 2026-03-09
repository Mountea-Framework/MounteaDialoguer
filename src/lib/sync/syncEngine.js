import { encryptPayload, decryptPayload } from '@/lib/sync/crypto';
import { buildProjectSnapshot, applyProjectSnapshot, applyProjectSnapshotAsNew } from '@/lib/sync/snapshot';
import { getSyncProject, upsertSyncProject } from '@/lib/sync/syncStorage';
import {
	DEFAULT_SYNC_PROVIDER_ID,
} from '@/lib/sync/providers/providerRegistry';
import {
	assertCloudSyncStorageProvider,
	resolveSyncProviderId,
} from '@/lib/sync/providers/storageProviders';
import { db } from '@/lib/db';

const FILE_PREFIX = 'mountea-project-';
const FILE_SUFFIX = '.mteasnap';
const MIME_TYPE = 'application/json';

function getSyncContext(options = {}) {
	const providerId = resolveSyncProviderId(options?.provider || DEFAULT_SYNC_PROVIDER_ID);
	const storage = assertCloudSyncStorageProvider(providerId);
	return { providerId, storage };
}

function buildFileName(projectId) {
	return `${FILE_PREFIX}${projectId}${FILE_SUFFIX}`;
}

function extractProjectId(file) {
	if (file?.appProperties?.projectId) {
		return file.appProperties.projectId;
	}
	if (!file?.name) return '';
	if (!file.name.startsWith(FILE_PREFIX) || !file.name.endsWith(FILE_SUFFIX)) {
		return '';
	}
	return file.name.slice(FILE_PREFIX.length, file.name.length - FILE_SUFFIX.length);
}

function getRevisionFromFile(file) {
	const revisionRaw = file?.appProperties?.revision;
	const revision = revisionRaw ? Number(revisionRaw) : 0;
	return Number.isNaN(revision) ? 0 : revision;
}

export async function checkRemoteDiff(projectId, options = {}) {
	const { providerId, storage } = getSyncContext(options);
	const fileName = buildFileName(projectId);
	const remoteFile = await storage.findFileByName(fileName);
	if (!remoteFile) return false;

	const remoteRevision = getRevisionFromFile(remoteFile);
	const local = await getSyncProject(projectId, providerId);
	const localRevision = local?.revision ? Number(local.revision) : 0;

	return remoteRevision > localRevision;
}

export async function listRemoteProjects(options = {}) {
	const { storage } = getSyncContext(options);
	console.log('[sync] Listing remote projects');
	const files = await storage.listFiles({ namePrefix: FILE_PREFIX });
	return files
		.map((file) => ({
			projectId: extractProjectId(file),
			fileId: file.id,
			revision: getRevisionFromFile(file),
			updatedAt: file.modifiedTime,
		}))
		.filter((item) => item.projectId);
}

function compareRemoteEntries(a, b) {
	if (!a) return b;
	if (!b) return a;
	const aRev = Number(a.revision || 0);
	const bRev = Number(b.revision || 0);
	if (aRev !== bRev) return bRev > aRev ? b : a;
	const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
	const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
	if (aTime !== bTime) return bTime > aTime ? b : a;
	return a;
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
		nodeCount: snapshot?.nodes?.length || 0,
		edgeCount: snapshot?.edges?.length || 0,
		dialogueNames: dialogues.slice(0, 5).map((dialogue) => dialogue?.name || '').filter(Boolean),
	};
}

export function dedupeRemoteProjects(remoteProjects) {
	const latestById = new Map();
	const duplicates = new Map();

	for (const item of remoteProjects) {
		const existing = latestById.get(item.projectId);
		if (!existing) {
			latestById.set(item.projectId, item);
			continue;
		}
		const latest = compareRemoteEntries(existing, item);
		latestById.set(item.projectId, latest);
		const list = duplicates.get(item.projectId) || [existing];
		list.push(item);
		duplicates.set(item.projectId, list);
	}

	return {
		unique: Array.from(latestById.values()),
		duplicates,
	};
}

export async function diffRemoteLocal(options = {}) {
	const { providerId } = getSyncContext(options);
	console.log('[sync] Building remote/local diff');
	const remoteRaw = await listRemoteProjects({ provider: providerId });
	const { unique: remoteUnique, duplicates } = dedupeRemoteProjects(remoteRaw);
	const remoteMap = new Map(remoteUnique.map((item) => [item.projectId, item]));

	const localProjects = await db.projects.toArray();
	const localMap = new Map(localProjects.map((project) => [project.id, project]));

	const localMeta = await db.syncProjects
		.where('provider')
		.equals(providerId)
		.toArray();
	const metaMap = new Map(localMeta.map((item) => [item.projectId, item]));

	const allIds = new Set([...remoteMap.keys(), ...localMap.keys()]);
	const comparisons = [];
	const actions = {
		toPull: [],
		toPush: [],
		unchanged: [],
		remoteOnly: [],
		localOnly: [],
	};

	for (const projectId of allIds) {
		const remote = remoteMap.get(projectId) || null;
		const local = localMap.get(projectId) || null;
		const meta = metaMap.get(projectId) || null;
		const localRevision = meta?.revision ? Number(meta.revision) : 0;
		const remoteRevision = remote?.revision ? Number(remote.revision) : 0;
		const localUpdated = local?.modifiedAt ? Date.parse(local.modifiedAt) : 0;
		const remoteUpdated = remote?.updatedAt ? Date.parse(remote.updatedAt) : 0;

		let decision = 'unchanged';
		if (remote && !local) {
			decision = 'pull';
			actions.remoteOnly.push(projectId);
		} else if (!remote && local) {
			decision = 'push';
			actions.localOnly.push(projectId);
		} else if (remote && local) {
			if (meta) {
				if (remoteRevision > localRevision) decision = 'pull';
				else if (remoteRevision < localRevision) decision = 'push';
			} else {
				if (remoteUpdated > localUpdated) decision = 'pull';
				else if (remoteUpdated < localUpdated) decision = 'push';
			}
		}

		if (decision === 'pull') actions.toPull.push(projectId);
		else if (decision === 'push') actions.toPush.push(projectId);
		else actions.unchanged.push(projectId);

		comparisons.push({
			projectId,
			decision,
			remote: remote
				? {
						fileId: remote.fileId,
						revision: remoteRevision,
						updatedAt: remote.updatedAt,
					}
				: null,
			local: local
				? {
						modifiedAt: local.modifiedAt,
						metaRevision: localRevision || null,
					}
				: null,
		});
	}

	return {
		remoteRaw,
		remoteUnique,
		duplicates,
		comparisons,
		actions,
	};
}

export async function previewPullFromFile({
	projectId,
	fileId,
	revision,
	passphrase,
	provider = DEFAULT_SYNC_PROVIDER_ID,
}) {
	const { storage } = getSyncContext({ provider });
	console.log('[sync] Preview pull', { projectId, fileId, revision });
	const encryptedText = await storage.downloadFile(fileId);
	const payload = JSON.parse(encryptedText);
	const snapshot = await decryptPayload(passphrase, payload);
	return {
		projectId,
		fileId,
		revision: revision ?? 0,
		summary: summarizeSnapshot(snapshot),
	};
}

export async function previewPushProject({ projectId }) {
	console.log('[sync] Preview push', { projectId });
	const snapshot = await buildProjectSnapshot(projectId);
	return {
		projectId,
		summary: summarizeSnapshot(snapshot),
	};
}

export async function pullProjectFromFile({
	projectId,
	fileId,
	revision,
	passphrase,
	provider = DEFAULT_SYNC_PROVIDER_ID,
}) {
	const { providerId, storage } = getSyncContext({ provider });
	console.log('[sync] Pulling project from file', { projectId, fileId, revision });
	const encryptedText = await storage.downloadFile(fileId);
	const payload = JSON.parse(encryptedText);
	const snapshot = await decryptPayload(passphrase, payload);

	await applyProjectSnapshot(snapshot);

	const remoteRevision = revision ?? 0;
	await upsertSyncProject(projectId, providerId, {
		revision: remoteRevision,
		remoteFileId: fileId,
		lastSyncedAt: new Date().toISOString(),
	});

	return { pulled: true, revision: remoteRevision };
}

export async function pullProject({
	projectId,
	passphrase,
	onProgress,
	provider = DEFAULT_SYNC_PROVIDER_ID,
}) {
	const { providerId, storage } = getSyncContext({ provider });
	console.log('[sync] Pulling project', { projectId });
	const fileName = buildFileName(projectId);
	onProgress?.('checking', 20);
	const remoteFile = await storage.findFileByName(fileName);
	if (!remoteFile) {
		return { pulled: false, reason: 'missing' };
	}

	onProgress?.('downloading', 45);
	const encryptedText = await storage.downloadFile(remoteFile.id);
	const payload = JSON.parse(encryptedText);
	onProgress?.('decrypting', 70);
	const snapshot = await decryptPayload(passphrase, payload);

	onProgress?.('applying', 90);
	await applyProjectSnapshot(snapshot);

	const remoteRevision = getRevisionFromFile(remoteFile);
	await upsertSyncProject(projectId, providerId, {
		revision: remoteRevision,
		remoteFileId: remoteFile.id,
		lastSyncedAt: new Date().toISOString(),
	});

	return { pulled: true, revision: remoteRevision };
}

export async function pullProjectAsNew({
	projectId,
	passphrase,
	fileId,
	revision,
	onProgress,
	provider = DEFAULT_SYNC_PROVIDER_ID,
}) {
	const { storage } = getSyncContext({ provider });
	console.log('[sync] Pulling project as new', { projectId, fileId });
	const fileName = buildFileName(projectId);
	onProgress?.('checking', 20);
	const remoteFile = fileId ? { id: fileId } : await storage.findFileByName(fileName);
	if (!remoteFile) {
		return { pulled: false, reason: 'missing' };
	}

	onProgress?.('downloading', 45);
	const encryptedText = await storage.downloadFile(remoteFile.id);
	const payload = JSON.parse(encryptedText);
	onProgress?.('decrypting', 70);
	const snapshot = await decryptPayload(passphrase, payload);

	onProgress?.('applying', 90);
	const newProjectId = await applyProjectSnapshotAsNew(snapshot);

	return { pulled: true, sourceProjectId: projectId, newProjectId, revision: revision ?? 0 };
}

export async function pushProject({
	projectId,
	passphrase,
	provider = DEFAULT_SYNC_PROVIDER_ID,
}) {
	const { providerId, storage } = getSyncContext({ provider });
	console.log('[sync] Pushing project', { projectId });
	const snapshot = await buildProjectSnapshot(projectId);
	const encryptedPayload = await encryptPayload(passphrase, snapshot);
	const content = JSON.stringify(encryptedPayload);

	const fileName = buildFileName(projectId);
	const remoteFile = await storage.findFileByName(fileName);
	const local = await getSyncProject(projectId, providerId);
	const localRevision = local?.revision ? Number(local.revision) : 0;
	const nextRevision = localRevision + 1;

	const appProperties = {
		revision: String(nextRevision),
		projectId,
		schemaVersion: '1',
		updatedAt: new Date().toISOString(),
	};

	let result;
	if (remoteFile?.id) {
		result = await storage.updateFile({
			fileId: remoteFile.id,
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

	await upsertSyncProject(projectId, providerId, {
		revision: nextRevision,
		remoteFileId: result.id || remoteFile?.id || null,
		lastSyncedAt: new Date().toISOString(),
	});

	return { pushed: true, revision: nextRevision };
}

export async function syncAllProjects({
	passphrase,
	onProgress,
	provider = DEFAULT_SYNC_PROVIDER_ID,
}) {
	const { providerId } = getSyncContext({ provider });
	console.log('[sync] Sync all projects start');
	const remoteProjects = await listRemoteProjects({ provider: providerId });
	const remoteMap = new Map(remoteProjects.map((item) => [item.projectId, item]));

	const localProjects = await db.projects.toArray();
	const localMap = new Map(localProjects.map((project) => [project.id, project]));

	let index = 0;
	const total = remoteProjects.length + localProjects.length;
	onProgress?.({ phase: 'start', remoteCount: remoteProjects.length, localCount: localProjects.length, total });

	for (const remote of remoteProjects) {
		index += 1;
		onProgress?.({ phase: 'pull', projectId: remote.projectId, index, total });

		if (!localMap.has(remote.projectId)) {
			await pullProjectFromFile({
				projectId: remote.projectId,
				fileId: remote.fileId,
				revision: remote.revision,
				passphrase,
				provider: providerId,
			});
		}
	}

	for (const project of localProjects) {
		index += 1;
		onProgress?.({ phase: 'sync', projectId: project.id, index, total });

		const remote = remoteMap.get(project.id);
		if (!remote) {
			await pushProject({ projectId: project.id, passphrase, provider: providerId });
			continue;
		}

		const localMeta = await getSyncProject(project.id, providerId);
		if (!localMeta) {
			const remoteUpdated = remote.updatedAt ? Date.parse(remote.updatedAt) : 0;
			const localUpdated = project.modifiedAt ? Date.parse(project.modifiedAt) : 0;
			if (remoteUpdated && (!localUpdated || remoteUpdated > localUpdated)) {
				await pullProjectFromFile({
					projectId: project.id,
					fileId: remote.fileId,
					revision: remote.revision,
					passphrase,
					provider: providerId,
				});
				continue;
			}
			await pushProject({ projectId: project.id, passphrase, provider: providerId });
			continue;
		}

		const localRevision = localMeta?.revision ? Number(localMeta.revision) : 0;
		const remoteRevision = remote.revision ?? 0;

		if (remoteRevision > localRevision) {
			await pullProjectFromFile({
				projectId: project.id,
				fileId: remote.fileId,
				revision: remoteRevision,
				passphrase,
				provider: providerId,
			});
		} else {
			await pushProject({ projectId: project.id, passphrase, provider: providerId });
		}
	}

	console.log('[sync] Sync all projects complete');
	return { remoteCount: remoteProjects.length, localCount: localProjects.length };
}
