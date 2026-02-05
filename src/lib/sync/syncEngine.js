import { encryptPayload, decryptPayload } from '@/lib/sync/crypto';
import { buildProjectSnapshot, applyProjectSnapshot } from '@/lib/sync/snapshot';
import { findAppDataFile, downloadAppDataFile, createAppDataFile, updateAppDataFile } from '@/lib/sync/googleDriveClient';
import { getSyncProject, upsertSyncProject } from '@/lib/sync/syncStorage';

const PROVIDER = 'googleDrive';
const FILE_PREFIX = 'mountea-project-';
const FILE_SUFFIX = '.mteasnap';
const MIME_TYPE = 'application/json';

function buildFileName(projectId) {
	return `${FILE_PREFIX}${projectId}${FILE_SUFFIX}`;
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
