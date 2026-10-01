/** Compatibility entry points route through immutable revision synchronization.
 * Legacy mutable snapshots/catalogues are read-only migration inputs. */
import { getRepositoryContext } from '@/lib/db';
import { mutateProject, readProjectState } from '@/lib/persistence/projectRepository';
import { syncRevisions, inspectRevisions, completeAncestry } from './revisionProtocol';
import { applyProjectSnapshotAsNew } from '@/lib/sync/snapshot';
import { upsertSyncTombstone } from '@/lib/sync/syncStorage';

export const pushProject = options => syncRevisions({ ...options, mode: 'push' });
export const pullProject = options => syncRevisions({ ...options, mode: 'pull' });
export const pullProjectFromFile = options => pullProject(options);
export const syncAllProjects = options => syncRevisions(options);
export const previewPushProject = async ({ projectId, context }) => readProjectState(projectId, context);
export const previewPullFromFile = options => inspectRevisions(options);
export async function pullProjectAsNew(options = {}) {
 const inspected = await inspectRevisions(options);
 const candidates = [...inspected.remoteIds].map(id => inspected.revisions.get(id)).filter(row => row.projectId === options.projectId && (!options.fileId || inspected.fileIds.get(row.id) === options.fileId));
 if (candidates.length !== 1 || !completeAncestry(candidates[0].id, inspected.revisions)) throw new Error('Select one complete revision before copying this project.');
 if (candidates[0].operation === 'delete') throw new Error('A deletion revision has no project to copy.');
 return applyProjectSnapshotAsNew(candidates[0].snapshot, { context: inspected.options.context });
}
export async function deleteLocalProject({ projectId, context: suppliedContext } = {}) {
 const context = suppliedContext || await getRepositoryContext();
 if (!await context.db.projects.get(projectId)) return;
 return mutateProject(projectId, { context, operation: 'delete' });
}
export async function deleteRemoteProject(options = {}) {
 await deleteLocalProject(options);
 return pushProject(options);
}
export async function publishTombstone(options = {}) {
 await upsertSyncTombstone({ ...options, pending: true });
 return pushProject(options);
}
export const applyMergedTombstones = options => syncRevisions({ ...options, mode: 'pull' });
// Deletion observations remain durable; no age-based garbage collection.
export const gcExpiredTombstones = async () => ({ removed: 0 });
