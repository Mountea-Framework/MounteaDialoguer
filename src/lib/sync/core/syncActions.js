import { db } from '@/lib/db';
import { encryptPayload, decryptPayload } from '@/lib/sync/crypto';
import { MIME_TYPE } from '@/lib/sync/core/constants';
import { getSyncContext } from '@/lib/sync/core/providerGateway';
import {
	buildFileName,
	getRevisionFromFile,
	listRemoteProjectsWithSteamRetry,
} from '@/lib/sync/core/remoteCatalog';
import {
	applyProjectSnapshot,
	applyProjectSnapshotAsNew,
	buildProjectSnapshot,
} from '@/lib/sync/snapshot';
import { clearSyncProject, getSyncProject, upsertSyncProject } from '@/lib/sync/syncStorage';
import { getActiveProfileId } from '@/lib/profile/activeProfile';

const MAX_SYNC_PAYLOAD_BYTES = 20 * 1024 * 1024;

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

export async function previewPullFromFile({
	projectId,
	fileId,
	revision,
	passphrase,
	provider,
}) {
	const { storage } = getSyncContext({ provider });
	console.log('[sync] Preview pull', { projectId, fileId, revision });
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
	provider,
}) {
	const { providerId, storage } = getSyncContext({ provider });
	console.log('[sync] Pulling project from file', { projectId, fileId, revision });
	const encryptedText = await storage.downloadFile(fileId);
	const payload = parseEncryptedPayloadJson(encryptedText, 'remote sync payload');
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
	provider,
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
	const payload = parseEncryptedPayloadJson(encryptedText, 'remote sync payload');
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
	provider,
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
	const payload = parseEncryptedPayloadJson(encryptedText, 'remote sync payload');
	onProgress?.('decrypting', 70);
	const snapshot = await decryptPayload(passphrase, payload);

	onProgress?.('applying', 90);
	const newProjectId = await applyProjectSnapshotAsNew(snapshot);

	return { pulled: true, sourceProjectId: projectId, newProjectId, revision: revision ?? 0 };
}

export async function pushProject({
	projectId,
	passphrase,
	provider,
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
		profileId: String(getActiveProfileId() || 'local'),
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

export async function deleteRemoteProject({
	projectId,
	provider,
}) {
	const { providerId, storage } = getSyncContext({ provider });
	if (typeof storage.deleteFile !== 'function') {
		throw new Error(`Sync provider "${providerId}" does not support remote deletion`);
	}

	const fileName = buildFileName(projectId);
	const remoteFile = await storage.findFileByName(fileName);
	if (!remoteFile?.id) {
		await clearSyncProject(projectId, providerId);
		return { deleted: false, reason: 'missing' };
	}

	await storage.deleteFile(remoteFile.id);
	await clearSyncProject(projectId, providerId);
	return { deleted: true, fileId: remoteFile.id };
}

export async function syncAllProjects({
	passphrase,
	onProgress,
	provider,
}) {
	const { providerId } = getSyncContext({ provider });
	console.log('[sync] Sync all projects start');
	const remoteProjects = await listRemoteProjectsWithSteamRetry(providerId, 'full-sync');
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

