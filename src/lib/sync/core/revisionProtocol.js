import { getRepositoryContext, assertProjectReady } from '@/lib/db';
import { readProjectState, mutateProject, applyRemoteRevision, prepareProjectCommit, commitPreparedProject } from '@/lib/persistence/projectRepository';
import { canonicalizeProject, hashProject } from '@/lib/persistence/canonicalProject';
import { applyProjectSnapshotAsNew } from '@/lib/sync/snapshot';
import { encryptPayload, decryptPayload } from '@/lib/sync/crypto';
import { getSyncContext } from './providerGateway';
import { MAX_SYNC_PAYLOAD_BYTES, SYNC_CATALOG_FILE_NAME } from './constants';

export const REVISION_PREFIX = 'mountea-revision-v2--';
const DELETION_PREFIX = 'mountea-deletion-v2--';
const locks = new WeakMap();
const now = () => new Date().toISOString();
const error = (code, message) => Object.assign(new Error(message), { code });
export const revisionFileName = async (projectId, revisionId) => {
 const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([projectId, revisionId])));
 return `${REVISION_PREFIX}${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}.json`;
};
const ordered = value => Array.isArray(value) ? value.map(ordered) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])])) : value;
const equalRevision = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
async function optionsFor(options) {
 const context = options.context || await getRepositoryContext(); context.assertCurrent();
 const gateway = options.storage ? { storage: options.storage, providerId: options.provider || options.storage.id } : getSyncContext(options);
 const storage = { ...gateway.storage };
 for (const method of ['listFiles', 'findFileByName', 'downloadFile', 'createFile', 'updateFile', 'deleteFile']) {
  storage[method] = argument => new Promise((resolve, reject) => {
   const abort = () => { try { context.assertCurrent(); reject(error('STALE_PROFILE', 'Repository operation was cancelled.')); } catch (failure) { reject(failure); } };
   if (context.signal.aborted) { abort(); return; }
   context.signal.addEventListener('abort', abort, { once: true });
   Promise.resolve().then(() => { context.assertCurrent(); return gateway.storage[method](argument, { context }); }).then(
    result => { context.signal.removeEventListener('abort', abort); resolve(result); },
    failure => { context.signal.removeEventListener('abort', abort); reject(failure); }
   );
  });
 }
 return { ...options, ...gateway, storage, context };
}
function parse(text) {
 if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_SYNC_PAYLOAD_BYTES) throw error('CORRUPT_REMOTE', 'Remote object is invalid or oversized.');
 try { return JSON.parse(text); } catch { throw error('CORRUPT_REMOTE', 'Remote object contains malformed JSON.'); }
}
async function validateRevision(revision) {
 if (!revision || typeof revision.id !== 'string' || !revision.id || typeof revision.projectId !== 'string' || !revision.projectId || !Array.isArray(revision.parentRevisionIds) || revision.parentRevisionIds.some(id => typeof id !== 'string' || !id || id === revision.id) || !['create','update','delete','restore','resolve'].includes(revision.operation) || typeof revision.deviceId !== 'string' || !revision.deviceId || !Number.isFinite(Date.parse(revision.createdAt))) throw error('CORRUPT_REMOTE', 'Remote revision metadata is invalid.');
 const snapshot = await canonicalizeProject(revision.snapshot, { allowIncompleteMedia: true });
 if (snapshot.project.id !== revision.projectId || await hashProject(snapshot) !== revision.payloadHash) throw error('CORRUPT_REMOTE', 'Remote revision payload hash does not match.');
 // History may contain drafts subsequently repaired by a descendant. Applying a
 // head still uses the repository's strict validation before any authoring write.
 return { ...revision, snapshot };
}
async function decodeRevision(text, options) {
 const envelope = parse(text);
 if (envelope.schemaVersion !== 2) throw error('UNSUPPORTED_REMOTE', 'Unsupported immutable revision protocol.');
 const revision = options.providerId === 'steam' ? envelope.revision : await decryptPayload(options.passphrase, envelope.encrypted);
 return validateRevision(revision);
}
async function encodeRevision(revision, options) {
 const envelope = options.providerId === 'steam' ? { schemaVersion: 2, revision } : { schemaVersion: 2, encrypted: await encryptPayload(options.passphrase, revision) };
 const content = JSON.stringify(envelope);
 if (new TextEncoder().encode(content).length > MAX_SYNC_PAYLOAD_BYTES) throw error('PAYLOAD_QUOTA', 'Revision exceeds the sync payload limit; it remains pending.');
 return content;
}
function addRevision(map, revision) {
 const previous = map.get(revision.id);
 if (previous && !equalRevision(previous, revision)) throw error('REVISION_COLLISION', 'An immutable revision identity has different content.');
 map.set(revision.id, revision);
}
export function ancestry(ancestorId, descendantId, revisions) {
 const visited = new Set(), pending = [descendantId]; let incomplete = false;
 while (pending.length) {
  const id = pending.pop(); if (id === ancestorId) return true;
  if (visited.has(id)) continue; visited.add(id);
  const revision = revisions.get(id); if (!revision) { incomplete = true; continue; }
  pending.push(...revision.parentRevisionIds);
 }
 return incomplete ? null : false;
}
export function completeAncestry(id, revisions) {
 const visiting = new Set(), complete = new Set(), stack = [{ id, exit: false }];
 let missing = false;
 while (stack.length) {
  const frame = stack.pop();
  if (frame.exit) { visiting.delete(frame.id); complete.add(frame.id); continue; }
  if (complete.has(frame.id)) continue;
  if (visiting.has(frame.id)) throw error('CORRUPT_REMOTE', 'Remote revision history contains a cycle.');
  const revision = revisions.get(frame.id); if (!revision) { missing = true; continue; }
  visiting.add(frame.id); stack.push({ id: frame.id, exit: true });
  for (const parent of revision.parentRevisionIds) {
   if (revisions.has(parent) && revisions.get(parent).projectId !== revision.projectId) throw error('CORRUPT_REMOTE', 'Revision parent belongs to another project.');
   stack.push({ id: parent, exit: false });
  }
 }
 return !missing;
}
function headsFor(revisions, projectId, ids) {
 const candidates = [...new Set(ids)].filter(id => revisions.get(id)?.projectId === projectId);
 return candidates.filter(id => !candidates.some(other => id !== other && ancestry(id, other, revisions) === true));
}
async function legacyRevision(text, options) {
 const envelope = parse(text);
 const legacyPassphrase = options.providerId === 'steam' ? `auto:steam:${options.context.profileId}:v1` : options.passphrase;
 const raw = envelope.project ? envelope : await decryptPayload(legacyPassphrase, envelope);
 const snapshot = await canonicalizeProject(raw);
 const payloadHash = await hashProject(snapshot);
 return validateRevision({ id: `legacy-${payloadHash}`, projectId: snapshot.project.id, parentRevisionIds: [], deviceId: 'legacy-import', payloadHash, operation: 'update', snapshot, createdAt: snapshot.project.modifiedAt || snapshot.project.createdAt || '1970-01-01T00:00:00.000Z' });
}
function validateTombstone(item) {
 if (!item || !['project','dialogue'].includes(item.entityType) || typeof item.entityId !== 'string' || !item.entityId || !Number.isFinite(Date.parse(item.deletedAt))) throw error('CORRUPT_REMOTE', 'Deletion evidence is malformed.');
 return { entityType: item.entityType, entityId: item.entityId, projectId: item.projectId || (item.entityType === 'project' ? item.entityId : ''), deletedAt: item.deletedAt };
}
/** Read-only discovery: catalogue absence never implies deletion or a complete listing. */
export async function inspectRevisions(input = {}) {
 const options = await optionsFor(input), { context, storage } = options;
 const revisions = new Map(), remoteIds = new Set(), fileIds = new Map(), tombstones = [];
 for (const revision of await context.db.projectRevisions.toArray()) addRevision(revisions, revision);
 context.assertCurrent();
 const files = await storage.listFiles({}); context.assertCurrent();
 const unique = new Map(files.map(file => [file.id, file]));
 const catalog = await storage.findFileByName(SYNC_CATALOG_FILE_NAME); context.assertCurrent();
 if (catalog?.id) unique.set(catalog.id, { ...catalog, name: SYNC_CATALOG_FILE_NAME });
 for (const file of unique.values()) {
  const name = file.name || '';
  if (!name.startsWith(REVISION_PREFIX) && !name.startsWith(DELETION_PREFIX) && !/^mountea-project-.*\.(mnteasnap|mteasnap)$/.test(name) && name !== SYNC_CATALOG_FILE_NAME) continue;
  const text = await storage.downloadFile(file.id); context.assertCurrent();
  if (name === SYNC_CATALOG_FILE_NAME) {
   const catalogData = parse(text);
   if (catalogData.schemaVersion !== 1) throw error('UNSUPPORTED_REMOTE', 'Unsupported legacy catalogue version.');
   if (!catalogData.objects || !Array.isArray(catalogData.objects.projects) || !Array.isArray(catalogData.objects.dialogues) || !Array.isArray(catalogData.tombstones)) throw error('CORRUPT_REMOTE', 'Legacy catalogue is corrupt.');
   tombstones.push(...catalogData.tombstones.map(validateTombstone));
   // The catalogue is only a positive hint. Missing hinted objects fail closed.
   for (const entry of catalogData.objects.projects) {
    if (!entry.snapshotFileId || unique.has(entry.snapshotFileId)) continue;
    const revision = await legacyRevision(await storage.downloadFile(entry.snapshotFileId), options); context.assertCurrent();
    addRevision(revisions, revision); remoteIds.add(revision.id); fileIds.set(revision.id, entry.snapshotFileId);
   }
  } else if (name.startsWith(DELETION_PREFIX)) {
   const envelope = parse(text); if (envelope.schemaVersion !== 2) throw error('UNSUPPORTED_REMOTE', 'Unsupported deletion protocol.');
   tombstones.push(validateTombstone(envelope.tombstone));
  } else {
   const revision = name.startsWith(REVISION_PREFIX) ? await decodeRevision(text, options) : await legacyRevision(text, options);
   if (name.startsWith(REVISION_PREFIX) && name !== await revisionFileName(revision.projectId, revision.id)) throw error('CORRUPT_REMOTE', 'Remote filename does not match its immutable revision.');
   addRevision(revisions, revision); remoteIds.add(revision.id); fileIds.set(revision.id, file.id);
  }
 }
 // Fetch positively referenced ancestors by deterministic name even when listing is delayed.
 const queue = [...remoteIds], visited = new Set();
 while (queue.length) {
  const id = queue.pop(); if (visited.has(id)) continue; visited.add(id);
  const revision = revisions.get(id);
  for (const parentId of revision.parentRevisionIds) {
   if (!revisions.has(parentId)) {
    const file = await storage.findFileByName(await revisionFileName(revision.projectId, parentId)); context.assertCurrent();
    if (!file?.id) continue;
    const parent = await decodeRevision(await storage.downloadFile(file.id), options); context.assertCurrent();
    if (parent.id !== parentId || parent.projectId !== revision.projectId) throw error('CORRUPT_REMOTE', 'Ancestor identity mismatch.');
    addRevision(revisions, parent); fileIds.set(parent.id, file.id); remoteIds.add(parent.id);
   }
   if (revisions.has(parentId)) queue.push(parentId);
  }
 }
 // Historic tombstones have no expiry. Keep every positive observation indefinitely.
 for (const row of await context.db.syncTombstones.toArray()) tombstones.push(validateTombstone(row));
 for (const row of await context.db.syncDeletions.toArray()) tombstones.push(validateTombstone({ ...row, entityType: 'project', entityId: row.projectId }));
 context.assertCurrent();
 const deletionMap = new Map(tombstones.map(row => [`${row.entityType}:${row.entityId}:${row.deletedAt}`, row]));
 return { options, revisions, remoteIds, fileIds, tombstones: [...deletionMap.values()], catalogueStatus: catalog?.id ? 'readable' : 'missing' };
}
async function cacheRevision(revision, context) {
 await context.db.transaction('rw', context.db.projectRevisions, async () => { context.assertCurrent(); const previous = await context.db.projectRevisions.get(revision.id); if (previous && !equalRevision(previous, revision)) throw error('REVISION_COLLISION', 'Immutable cached revision differs.'); if (!previous) await context.db.projectRevisions.add(revision); });
}
async function publishRevision(revision, options) {
 const { context, providerId, storage } = options;
 const state = await context.db.projectState.get(revision.projectId);
 if (!state?.deleted) await assertProjectReady(revision.projectId, context);
 const key = `delivery:${providerId}:${revision.id}`;
 const delivery = await context.db.syncOutbox.get(key); context.assertCurrent();
 if (delivery?.status === 'acknowledged') return;
 await context.db.syncOutbox.put({ id: key, provider: providerId, projectId: revision.projectId, localRevisionId: revision.id, payloadHash: revision.payloadHash, status: 'pending', phase: 'queued', createdAt: delivery?.createdAt || now() });
 const name = await revisionFileName(revision.projectId, revision.id);
 try {
  let file = await storage.findFileByName(name); context.assertCurrent();
  if (!file?.id) {
   const content = await encodeRevision(revision, options); context.assertCurrent();
   file = await storage.createFile({ name, content, mimeType: 'application/json', appProperties: { projectId: revision.projectId, revisionId: revision.id, payloadHash: revision.payloadHash, protocol: '2' } }); context.assertCurrent();
  }
  await context.db.syncOutbox.update(key, { phase: 'uploaded', remoteFileId: file.id }); context.assertCurrent();
  const verified = await decodeRevision(await storage.downloadFile(file.id), options); context.assertCurrent();
  if (!equalRevision(verified, revision)) throw error('REMOTE_VERIFY_FAILED', 'Uploaded revision failed exact content verification.');
  await context.db.transaction('rw', context.db.syncOutbox, context.db.syncProjects, async () => {
   context.assertCurrent();
   await context.db.syncOutbox.update(key, { status: 'acknowledged', phase: 'verified', remoteFileId: file.id, acknowledgedAt: now(), error: '' });
   await context.db.syncProjects.put({ projectId: revision.projectId, provider: providerId, acknowledgedRevisionId: revision.id, remoteFileId: file.id, lastSyncedAt: now() });
  });
 } catch (failure) {
  if (!context.signal.aborted) await context.db.syncOutbox.update(key, { status: 'pending', error: failure.code || 'UPLOAD_FAILED' });
  throw failure;
 }
}
async function publishDeletionEvidence(tombstone, options) {
 const { context, storage } = options;
 const content = JSON.stringify({ schemaVersion: 2, tombstone });
 const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
 const id = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2,'0')).join('');
 const name = `${DELETION_PREFIX}${id}.json`;
 let file = await storage.findFileByName(name); context.assertCurrent();
 if (!file?.id) { file = await storage.createFile({ name, content, mimeType: 'application/json' }); context.assertCurrent(); }
 if (await storage.downloadFile(file.id) !== content) throw error('REMOTE_VERIFY_FAILED', 'Deletion evidence failed remote verification.');
 context.assertCurrent();
}
async function tombstoneRevision(tombstone, base, revisions) {
 const projectId = tombstone.projectId;
 if (!projectId) return null;
 const snapshot = base ? structuredClone(base.snapshot) : await canonicalizeProject({ project: { id: projectId, name: 'Deleted project' }, dialogues: [], nodes: [], edges: [], participants: [], categories: [], decorators: [], conditions: [], localizedStrings: [] });
 const parents = [...revisions.values()].filter(row => row.projectId === projectId && row.deviceId === 'legacy-import' && Date.parse(row.createdAt) <= Date.parse(tombstone.deletedAt)).map(row => row.id).sort();
 if (tombstone.entityType === 'dialogue') {
  snapshot.dialogues = snapshot.dialogues.filter(row => row.id !== tombstone.entityId);
  snapshot.nodes = snapshot.nodes.filter(row => row.dialogueId !== tombstone.entityId);
  snapshot.edges = snapshot.edges.filter(row => row.dialogueId !== tombstone.entityId);
  snapshot.localizedStrings = snapshot.localizedStrings.filter(row => row.dialogueId !== tombstone.entityId);
 }
 const payloadHash = await hashProject(snapshot);
 // Bind identity to the exact selected baseline, retaining all deletion observations.
 const idHash = await hashProject({ tombstone, payloadHash, parents });
 return { id: `deletion-${idHash}`, projectId, parentRevisionIds: parents, deviceId: 'legacy-deletion', operation: tombstone.entityType === 'project' ? 'delete' : 'update', payloadHash, snapshot, createdAt: tombstone.deletedAt };
}
async function recordConflict(projectId, localId, remoteIds, context, providerId, incomplete = false) {
 const ids = [...new Set([localId, ...remoteIds].filter(Boolean))].sort();
 const id = `${providerId}:${projectId}:${ids.join(':')}`;
 await context.db.syncConflicts.put({ id, projectId, provider: providerId, localRevisionId: localId, revisionIds: ids, status: 'unresolved', incomplete, createdAt: now() });
 return id;
}
async function runUnlocked(input) {
 const inspected = await inspectRevisions(input);
 const { options, revisions, remoteIds, tombstones } = inspected, { context, providerId, mode = 'full' } = options;
 if (!['list','pull','push','full'].includes(mode)) throw error('INVALID_SYNC_MODE', 'Unsupported sync mode.');
 const states = await context.db.projectState.toArray(), projects = await context.db.projects.toArray(); context.assertCurrent();
 const comparisons = [], failures = [], conflicts = [];
 if (mode === 'list') {
  const ids = new Set([...projects.map(row => row.id), ...[...remoteIds].map(id => revisions.get(id).projectId)]);
  for (const projectId of ids) comparisons.push({ projectId, localRevisionId: states.find(row => row.projectId === projectId)?.revisionId || null, remoteRevisionIds: headsFor(revisions, projectId, [...remoteIds]) });
  return { mode, comparisons, conflicts, failures, catalogueStatus: inspected.catalogueStatus };
 }
 // Existing authoring without a revision receives one durable baseline before reconciliation.
 for (const project of projects) if (!states.some(state => state.projectId === project.id)) {
  const committed = await mutateProject(project.id, { context });
  const revision = await context.db.projectRevisions.get(committed.revisionId); addRevision(revisions, revision);
 }
 for (const id of remoteIds) await cacheRevision(revisions.get(id), context);
 for (const tombstone of tombstones) {
  const base = [...revisions.values()].filter(row => row.projectId === tombstone.projectId && row.deviceId === 'legacy-import').sort((a,b) => a.id.localeCompare(b.id))[0];
  const revision = await tombstoneRevision(tombstone, base, revisions);
  if (revision) { addRevision(revisions, revision); remoteIds.add(revision.id); await cacheRevision(revision, context); }
  await context.db.syncTombstones.put({ ...tombstone, provider: providerId, pending: true });
 }
 const freshStates = await context.db.projectState.toArray(); context.assertCurrent();
 const ids = new Set([...freshStates.map(row => row.projectId), ...[...remoteIds].map(id => revisions.get(id).projectId)]);
 for (const projectId of ids) {
  if (options.projectId && options.projectId !== projectId) continue;
  const current = await readProjectState(projectId, context), localId = current.revisionId;
  const candidates = [...remoteIds].filter(id => revisions.get(id).projectId === projectId);
  if (localId) candidates.push(localId);
  const heads = headsFor(revisions, projectId, candidates);
  const incomplete = heads.some(id => !completeAncestry(id, revisions));
  comparisons.push({ projectId, localRevisionId: localId, remoteRevisionIds: heads });
  if (!incomplete && heads.length === 1) {
   for (const conflict of await context.db.syncConflicts.where('projectId').equals(projectId).toArray()) {
    if (conflict.status === 'unresolved' && conflict.revisionIds.every(id => ancestry(id, heads[0], revisions) === true)) await context.db.syncConflicts.update(conflict.id, { status: 'resolved', resolvedRevisionId: heads[0], resolvedAt: now() });
   }
  }
  if (incomplete || heads.length > 1) {
   conflicts.push(await recordConflict(projectId, localId, heads, context, providerId, incomplete));
  } else if (heads.length === 1 && heads[0] !== localId && mode !== 'push') {
   const revision = revisions.get(heads[0]);
   try { await applyRemoteRevision(revision, { context, expectedSequence: current.sequence }); }
   catch (failure) { failures.push({ projectId, code: failure.code || 'APPLY_FAILED', message: failure.message }); }
  }
 }
 if (mode === 'full' || mode === 'push') {
  // Publish immutable ancestry, including conflicting local branches. Acknowledgements
  // target only each captured revision; a concurrent edit remains independently pending.
  const pending = await context.db.syncOutbox.filter(row => !row.provider).toArray(); context.assertCurrent();
  const published = new Set();
  const publishTree = async (id) => {
   // Include edits committed while discovery was in flight without acknowledging
   // or dropping a different revision. Work arriving later waits for the retry.
   if (!revisions.has(id)) { const row = await context.db.projectRevisions.get(id); if (row) addRevision(revisions, row); }
   if (!completeAncestry(id, revisions)) throw error('MISSING_ANCESTOR', 'Incomplete revision ancestry remains pending.');
   const stack = [{ id, exit: false }];
   while (stack.length) {
    const frame = stack.pop(); if (published.has(frame.id)) continue;
    const revision = revisions.get(frame.id);
    if (frame.exit) { await publishRevision(revision, options); published.add(frame.id); continue; }
    stack.push({ id: frame.id, exit: true });
    for (const parent of revision.parentRevisionIds) stack.push({ id: parent, exit: false });
   }
  };
  for (const item of pending) {
   if (options.projectId && options.projectId !== item.projectId) continue;
   try { await publishTree(item.localRevisionId); } catch (failure) { failures.push({ projectId: item.projectId, code: failure.code || 'UPLOAD_FAILED', message: failure.message }); }
  }
  for (const tombstone of tombstones) {
   try { await publishDeletionEvidence(tombstone, options); await context.db.syncTombstones.update([providerId,tombstone.entityType,tombstone.entityId], { pending: false, acknowledgedAt: now() }); }
   catch (failure) { failures.push({ projectId: tombstone.projectId, code: failure.code || 'UPLOAD_FAILED', message: failure.message }); }
  }
 }
 context.assertCurrent();
 return { mode, comparisons, conflicts, failures, catalogueStatus: inspected.catalogueStatus };
}
export async function syncRevisions(input = {}) {
 const options = await optionsFor(input);
 let providers = locks.get(options.context.db); if (!providers) { providers = new Map(); locks.set(options.context.db, providers); }
 const previous = providers.get(options.providerId) || Promise.resolve();
 const work = previous.catch(() => {}).then(async () => {
  options.context.assertCurrent(); const result = await runUnlocked(options);
  return { ...result, queue: await getRevisionQueueStatus(options.providerId, options.context) };
 });
 providers.set(options.providerId, work);
 try { return await work; } finally { if (providers.get(options.providerId) === work) providers.delete(options.providerId); }
}

/** Metadata-only provider view: durable base intents remain for future providers. */
export async function getRevisionQueueStatus(providerId, suppliedContext) {
 const context = suppliedContext || await getRepositoryContext(); context.assertCurrent();
 const rows = await context.db.syncOutbox.toArray();
 const deliveries = new Map(rows.filter(row => row.provider === providerId).map(row => [row.localRevisionId, row]));
 const intents = rows.filter(row => !row.provider);
 const status = { queued: 0, uploaded: 0, verified: 0, pending: 0, oldestPendingAgeMs: 0, conflicts: 0, errorCodes: [] };
 for (const intent of intents) {
  const delivery = deliveries.get(intent.localRevisionId);
  if (delivery?.status === 'acknowledged') { status.verified++; continue; }
  status.pending++;
  if (delivery?.phase === 'uploaded') status.uploaded++; else status.queued++;
  const createdAt = Date.parse(intent.createdAt); if (Number.isFinite(createdAt)) status.oldestPendingAgeMs = Math.max(status.oldestPendingAgeMs, Date.now() - createdAt);
  if (delivery?.error) status.errorCodes.push(delivery.error);
 }
 status.conflicts = await context.db.syncConflicts.filter(row => row.status === 'unresolved' && row.provider === providerId).count();
 status.errorCodes = [...new Set(status.errorCodes)].sort(); context.assertCurrent(); return status;
}
export async function resolveRevisionConflict(conflictId, choice, input = {}) {
 const context = input.context || await getRepositoryContext(); context.assertCurrent();
 const conflict = await context.db.syncConflicts.get(conflictId);
 if (!conflict || conflict.status !== 'unresolved' || conflict.incomplete) throw error('CONFLICT_UNAVAILABLE', 'Reload complete revision history before resolving this conflict.');
 if (!['local','remote','both'].includes(choice)) throw error('INVALID_RESOLUTION', 'Choose which revision to retain.');
 const current = await readProjectState(conflict.projectId, context);
 if (current.revisionId !== conflict.localRevisionId) throw error('STALE_CONFLICT', 'The project changed; synchronize again before resolving.');
 const revisions = await context.db.projectRevisions.bulkGet(conflict.revisionIds);
 if (revisions.some(row => !row)) throw error('MISSING_ANCESTOR', 'Conflict history is missing.');
 const local = revisions.find(row => row.id === conflict.localRevisionId);
 const remote = revisions.find(row => row.id !== conflict.localRevisionId);
 if (!remote || (choice === 'remote' && conflict.revisionIds.length > 2 && !input.revisionId)) throw error('CHOOSE_REVISION', 'Select a specific competing revision.');
 const selected = input.revisionId ? revisions.find(row => row.id === input.revisionId) : choice === 'remote' ? remote : local || remote;
 if (!selected) throw error('CHOOSE_REVISION', 'Select an available revision.');
 let copiedProjectId;
 if (choice === 'both') {
  for (const competing of revisions.filter(row => row.id !== selected.id && row.operation !== 'delete')) {
   const digest = await hashProject({ conflictId, revisionId: competing.id });
   const copyId = `${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-8${digest.slice(17,20)}-${digest.slice(20,32)}`;
   copiedProjectId = copyId;
   if (!await context.db.projectState.get(copyId)) await applyProjectSnapshotAsNew(competing.snapshot, { context, projectId: copyId, name: `${competing.snapshot.project.name} (conflict copy)` });
  }
 }
 const prepared = await prepareProjectCommit(selected.snapshot, { context, expectedSequence: current.sequence, parentRevisionIds: conflict.revisionIds, operation: selected.operation === 'delete' ? 'delete' : 'resolve' });
 const result = await commitPreparedProject(prepared);
 await context.db.syncConflicts.update(conflictId, { status: 'resolved', resolvedRevisionId: result.revisionId, resolvedAt: now(), copiedProjectId });
 return { ...result, copiedProjectId };
}
