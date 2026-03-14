import { getSyncProject } from '@/lib/sync/syncStorage';
import {
	FILE_PREFIX,
	FILE_SUFFIX,
	LEGACY_FILE_SUFFIXES,
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
	if (!file.name.startsWith(FILE_PREFIX)) {
		return '';
	}
	const suffixes = [FILE_SUFFIX, ...LEGACY_FILE_SUFFIXES];
	const matchingSuffix = suffixes.find((suffix) => file.name.endsWith(suffix));
	if (!matchingSuffix) return '';
	return file.name.slice(FILE_PREFIX.length, file.name.length - matchingSuffix.length);
}

export function getRevisionFromFile(file) {
	const revisionRaw = file?.appProperties?.revision;
	const revision = revisionRaw ? Number(revisionRaw) : 0;
	return Number.isNaN(revision) ? 0 : revision;
}

export async function checkRemoteDiff(projectId, options = {}) {
	const { providerId } = getSyncContext(options);
	const local = await getSyncProject(projectId, providerId);
	const remoteFile = await findRemoteProjectById(projectId, { provider: providerId });
	if (!remoteFile) {
		// Remote missing + local sync metadata means project was likely deleted on another device.
		return Boolean(local);
	}

	const remoteRevision = Number(remoteFile?.revision || 0);
	const localRevision = local?.revision ? Number(local.revision) : 0;

	return remoteRevision > localRevision;
}

export async function findRemoteProjectById(projectId, options = {}) {
	const targetId = String(projectId || '').trim();
	if (!targetId) return null;

    const { providerId } = getSyncContext(options);
    const remoteProjects = await listRemoteProjectsWithSteamRetry(
        providerId,
        `find-project:${targetId}`
    );
	const matches = remoteProjects.filter((entry) => entry.projectId === targetId);
	if (!matches.length) return null;

	matches.sort((a, b) => {
		const byRevision = Number(b.revision || 0) - Number(a.revision || 0);
		if (byRevision !== 0) return byRevision;
		const aTime = a?.updatedAt ? Date.parse(a.updatedAt) : 0;
		const bTime = b?.updatedAt ? Date.parse(b.updatedAt) : 0;
		return bTime - aTime;
	});

	return matches[0] || null;
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
