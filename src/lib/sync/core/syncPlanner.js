import { db } from '@/lib/db';
import { readProviderCatalog } from '@/lib/sync/core/providerCatalog';
import { listRemoteProjectsWithSteamRetry } from '@/lib/sync/core/remoteCatalog';
import { getSyncContext } from '@/lib/sync/core/providerGateway';

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

	const remoteRaw = await listRemoteProjectsWithSteamRetry(providerId, 'diff');
	const { unique: remoteUnique, duplicates } = dedupeRemoteProjects(remoteRaw);
	const remoteMap = new Map(remoteUnique.map((item) => [item.projectId, item]));

	const catalogRead = await readProviderCatalog(providerId);
	const catalog = catalogRead?.readable ? catalogRead.catalog : null;
	const activeProjectTombstones = new Set(
		(catalog?.tombstones || [])
			.filter((entry) => {
				if (String(entry?.entityType || '').trim() !== 'project') return false;
				const expiresAtMs = entry?.expiresAt ? Date.parse(entry.expiresAt) : 0;
				return !(expiresAtMs && expiresAtMs <= Date.now());
			})
			.map((entry) => String(entry?.entityId || '').trim())
			.filter(Boolean)
	);
	const projectsWithDialogueTombstones = new Set(
		(catalog?.tombstones || [])
			.filter((entry) => {
				if (String(entry?.entityType || '').trim() !== 'dialogue') return false;
				const expiresAtMs = entry?.expiresAt ? Date.parse(entry.expiresAt) : 0;
				return !(expiresAtMs && expiresAtMs <= Date.now());
			})
			.map((entry) => String(entry?.projectId || '').trim())
			.filter(Boolean)
	);
	for (const projectEntry of catalog?.objects?.projects || []) {
		const projectId = String(projectEntry?.projectId || '').trim();
		if (!projectId || remoteMap.has(projectId)) continue;
		const fileId = String(projectEntry?.snapshotFileId || '').trim();
		if (!fileId) continue;
		remoteMap.set(projectId, {
			projectId,
			fileId,
			revision: Number(projectEntry?.snapshotRevision || 0),
			updatedAt: projectEntry?.updatedAt || '',
		});
	}

	const localProjects = await db.projects.toArray();
	const localMap = new Map(localProjects.map((project) => [project.id, project]));

	const localMeta = await db.syncProjects.where('provider').equals(providerId).toArray();
	const metaMap = new Map(localMeta.map((item) => [item.projectId, item]));

	const allIds = new Set([...remoteMap.keys(), ...localMap.keys()]);
	const comparisons = [];
	const actions = {
		toPull: [],
		toPush: [],
		toDeleteLocal: [],
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
		if (local && activeProjectTombstones.has(projectId)) {
			decision = 'delete-local';
		} else if (local && remote && projectsWithDialogueTombstones.has(projectId)) {
			decision = 'pull';
		} else if (remote && !local) {
			decision = 'pull';
			actions.remoteOnly.push(projectId);
		} else if (!remote && local) {
			if (meta) {
				decision = 'unchanged';
			} else {
				decision = 'push';
				actions.localOnly.push(projectId);
			}
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
		else if (decision === 'delete-local') actions.toDeleteLocal.push(projectId);
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
						hasSyncMeta: Boolean(meta),
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


