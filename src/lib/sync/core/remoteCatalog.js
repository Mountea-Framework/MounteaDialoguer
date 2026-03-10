import { getSyncProject } from '@/lib/sync/syncStorage';
import {
	FILE_PREFIX,
	FILE_SUFFIX,
	STEAM_REMOTE_LIST_RETRY_COUNT,
	STEAM_REMOTE_LIST_RETRY_DELAY_MS,
	wait,
} from '@/lib/sync/core/constants';
import { getSyncContext } from '@/lib/sync/core/providerGateway';

export function buildFileName(projectId) {
	return `${FILE_PREFIX}${projectId}${FILE_SUFFIX}`;
}

export function extractProjectId(file) {
	if (file?.appProperties?.projectId) {
		return file.appProperties.projectId;
	}
	if (!file?.name) return '';
	if (!file.name.startsWith(FILE_PREFIX) || !file.name.endsWith(FILE_SUFFIX)) {
		return '';
	}
	return file.name.slice(FILE_PREFIX.length, file.name.length - FILE_SUFFIX.length);
}

export function getRevisionFromFile(file) {
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

export async function listRemoteProjectsWithSteamRetry(providerId, reason = 'unspecified') {
	let remoteProjects = await listRemoteProjects({ provider: providerId });
	if (providerId !== 'steam' || remoteProjects.length > 0) {
		return remoteProjects;
	}

	for (let attempt = 1; attempt <= STEAM_REMOTE_LIST_RETRY_COUNT; attempt += 1) {
		console.log(
			`[sync] Steam remote list empty; retry ${attempt}/${STEAM_REMOTE_LIST_RETRY_COUNT} in ${STEAM_REMOTE_LIST_RETRY_DELAY_MS}ms (${reason})`
		);
		await wait(STEAM_REMOTE_LIST_RETRY_DELAY_MS);
		remoteProjects = await listRemoteProjects({ provider: providerId });
		if (remoteProjects.length > 0) {
			console.log('[sync] Steam remote list became available', {
				reason,
				count: remoteProjects.length,
				attempt,
			});
			break;
		}
	}

	return remoteProjects;
}
