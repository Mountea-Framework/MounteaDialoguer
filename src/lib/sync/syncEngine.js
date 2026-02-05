import { encryptPayload, decryptPayload } from '@/lib/sync/crypto';
import { buildProjectSnapshot, applyProjectSnapshot } from '@/lib/sync/snapshot';
import { findAppDataFile, downloadAppDataFile, createAppDataFile, updateAppDataFile, listAppDataFiles } from '@/lib/sync/googleDriveClient';
import { getSyncProject, upsertSyncProject } from '@/lib/sync/syncStorage';
import { db } from '@/lib/db';

const PROVIDER = 'googleDrive';
const FILE_PREFIX = 'mountea-project-';
const FILE_SUFFIX = '.mteasnap';
const MIME_TYPE = 'application/json';

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

export async function checkRemoteDiff(projectId) {
	const fileName = buildFileName(projectId);
	const remoteFile = await findAppDataFile(fileName);
	if (!remoteFile) return false;

	const remoteRevision = getRevisionFromFile(remoteFile);
	const local = await getSyncProject(projectId, PROVIDER);
	const localRevision = local?.revision ? Number(local.revision) : 0;

	return remoteRevision > localRevision;
}

export async function listRemoteProjects() {
	const files = await listAppDataFiles({ namePrefix: FILE_PREFIX });
	return files
		.map((file) => ({
			projectId: extractProjectId(file),
			fileId: file.id,
			revision: getRevisionFromFile(file),
			updatedAt: file.modifiedTime,
		}))
		.filter((item) => item.projectId);
}

export async function pullProjectFromFile({ projectId, fileId, revision, passphrase }) {
	const encryptedText = await downloadAppDataFile(fileId);
	const payload = JSON.parse(encryptedText);
	const snapshot = await decryptPayload(passphrase, payload);

	await applyProjectSnapshot(snapshot);

	const remoteRevision = revision ?? 0;
	await upsertSyncProject(projectId, PROVIDER, {
		revision: remoteRevision,
		remoteFileId: fileId,
		lastSyncedAt: new Date().toISOString(),
	});

	return { pulled: true, revision: remoteRevision };
}

export async function pullProject({ projectId, passphrase, onProgress }) {
	const fileName = buildFileName(projectId);
	onProgress?.('checking', 20);
	const remoteFile = await findAppDataFile(fileName);
	if (!remoteFile) {
		return { pulled: false, reason: 'missing' };
	}

	onProgress?.('downloading', 45);
	const encryptedText = await downloadAppDataFile(remoteFile.id);
	const payload = JSON.parse(encryptedText);
	onProgress?.('decrypting', 70);
	const snapshot = await decryptPayload(passphrase, payload);

	onProgress?.('applying', 90);
	await applyProjectSnapshot(snapshot);

	const remoteRevision = getRevisionFromFile(remoteFile);
	await upsertSyncProject(projectId, PROVIDER, {
		revision: remoteRevision,
		remoteFileId: remoteFile.id,
		lastSyncedAt: new Date().toISOString(),
	});

	return { pulled: true, revision: remoteRevision };
}

export async function pushProject({ projectId, passphrase }) {
	const snapshot = await buildProjectSnapshot(projectId);
	const encryptedPayload = await encryptPayload(passphrase, snapshot);
	const content = JSON.stringify(encryptedPayload);

	const fileName = buildFileName(projectId);
	const remoteFile = await findAppDataFile(fileName);
	const local = await getSyncProject(projectId, PROVIDER);
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
		result = await updateAppDataFile({
			fileId: remoteFile.id,
			content,
			mimeType: MIME_TYPE,
			appProperties,
		});
	} else {
		result = await createAppDataFile({
			name: fileName,
			content,
			mimeType: MIME_TYPE,
			appProperties,
		});
	}

	await upsertSyncProject(projectId, PROVIDER, {
		revision: nextRevision,
		remoteFileId: result.id || remoteFile?.id || null,
		lastSyncedAt: new Date().toISOString(),
	});

	return { pushed: true, revision: nextRevision };
}

export async function syncAllProjects({ passphrase, onProgress }) {
	const remoteProjects = await listRemoteProjects();
	const remoteMap = new Map(remoteProjects.map((item) => [item.projectId, item]));

	const localProjects = await db.projects.toArray();
	const localMap = new Map(localProjects.map((project) => [project.id, project]));

	let index = 0;
	const total = remoteProjects.length + localProjects.length;

	for (const remote of remoteProjects) {
		index += 1;
		onProgress?.({ phase: 'pull', projectId: remote.projectId, index, total });

		if (!localMap.has(remote.projectId)) {
			await pullProjectFromFile({
				projectId: remote.projectId,
				fileId: remote.fileId,
				revision: remote.revision,
				passphrase,
			});
		}
	}

	for (const project of localProjects) {
		index += 1;
		onProgress?.({ phase: 'sync', projectId: project.id, index, total });

		const remote = remoteMap.get(project.id);
		if (!remote) {
			await pushProject({ projectId: project.id, passphrase });
			continue;
		}

		const localMeta = await getSyncProject(project.id, PROVIDER);
		const localRevision = localMeta?.revision ? Number(localMeta.revision) : 0;
		const remoteRevision = remote.revision ?? 0;

		if (remoteRevision > localRevision) {
			await pullProjectFromFile({
				projectId: project.id,
				fileId: remote.fileId,
				revision: remoteRevision,
				passphrase,
			});
		} else {
			await pushProject({ projectId: project.id, passphrase });
		}
	}
}
