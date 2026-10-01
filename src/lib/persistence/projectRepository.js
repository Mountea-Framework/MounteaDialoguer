import { getRepositoryContext, readProjectRecords } from '@/lib/db';
import { AUTHORING_TABLES } from './schema';
import { canonicalizeProject, recordsToSnapshot, snapshotToRecords, validateCanonicalProject, hashProject, stableJson, ProjectDataError } from './canonicalProject';

const COMMIT_TABLES = [...AUTHORING_TABLES, 'projectState', 'projectRevisions', 'syncOutbox', 'recoveryRecords'];
const preparedCommits = new WeakSet();
const mutationQueues = new WeakMap();
function deviceId() {
	const key = 'mountea-revision-device-id';
	let value = localStorage.getItem(key);
	if (!value) { value = crypto.randomUUID(); localStorage.setItem(key, value); }
	return value;
}
function freeze(value) {
	if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.freeze(value); for (const child of Object.values(value)) freeze(child); }
	return value;
}

export async function readProjectState(projectId, suppliedContext) {
	const context = suppliedContext || await getRepositoryContext(); context.assertCurrent();
	const result = await context.db.transaction('r', [...AUTHORING_TABLES, 'projectState'].map((table) => context.db.table(table)), async () => {
		const records = await readProjectRecords(projectId, context);
		const state = await context.db.projectState.get(projectId);
		return { snapshot: recordsToSnapshot(records), sequence: state?.sequence || 0, revisionId: state?.revisionId || null, state };
	});
	context.assertCurrent(); return result;
}

/** All async media conversion/hashing happens here, outside IndexedDB. */
export async function prepareProjectCommit(input, { context: suppliedContext, expectedSequence, operation = 'update', parentRevisionIds, revisionId = crypto.randomUUID(), validation = 'strict', existingDiagnostics = [], enqueue = true, recoveryResolutions = [], remoteRevision } = {}) {
	const context = suppliedContext || await getRepositoryContext(); context.assertCurrent();
	if (remoteRevision) {
		if (enqueue) throw new ProjectDataError('INVALID_REMOTE_REVISION', 'Remote revisions cannot enqueue a local edit.');
		operation = remoteRevision.operation; revisionId = remoteRevision.id; parentRevisionIds = remoteRevision.parentRevisionIds;
	}
	if (!Number.isInteger(expectedSequence) || expectedSequence < 0) throw new ProjectDataError('EXPECTED_SEQUENCE_REQUIRED', 'A captured nonnegative project sequence is required.');
	if (!['update', 'create', 'delete', 'restore', 'resolve'].includes(operation)) throw new ProjectDataError('INVALID_OPERATION', 'Unsupported project operation.');
	const snapshot = await canonicalizeProject(input, { allowIncompleteMedia: validation === 'draft' });
	const diagnostics = validateCanonicalProject(snapshot, { localization: validation !== 'draft' });
	const known = new Set(existingDiagnostics.map((item) => `${item.code}:${item.path}`));
	const errors = validation === 'draft'
		? diagnostics.filter((item) => !['INVALID_START', 'UNRESOLVED_PARTICIPANT', 'UNRESOLVED_CATEGORY'].includes(item.code) && !known.has(`${item.code}:${item.path}`))
		: diagnostics;
	if (errors.length && operation !== 'delete') throw new ProjectDataError('INVALID_PROJECT_DATA', errors[0].message, errors);
	const projectId = snapshot.project.id;
	const payloadHash = await hashProject(snapshot);
	const current = await context.db.projectState.get(projectId); context.assertCurrent();
	const parents = parentRevisionIds ?? (current?.revisionId ? [current.revisionId] : []);
	if (!Array.isArray(parents) || parents.some((id) => typeof id !== 'string' || !id)) throw new ProjectDataError('INVALID_REVISION_PARENTS', 'Revision parents must be nonempty identifiers.');
	if (remoteRevision && (remoteRevision.projectId !== projectId || remoteRevision.payloadHash !== payloadHash || typeof revisionId !== 'string' || !revisionId || typeof remoteRevision.deviceId !== 'string' || !remoteRevision.deviceId || typeof remoteRevision.createdAt !== 'string' || !Number.isFinite(Date.parse(remoteRevision.createdAt)))) throw new ProjectDataError('INVALID_REMOTE_REVISION', 'Remote revision identity, metadata or payload hash is invalid.');
	const revision = freeze(remoteRevision ? { ...structuredClone(remoteRevision), snapshot } : { id: revisionId, projectId, parentRevisionIds: [...new Set(parents)], deviceId: deviceId(), payloadHash, operation, snapshot, createdAt: new Date().toISOString() });
	const prepared = Object.freeze({ context, projectId, expectedSequence, revision, records: freeze(snapshotToRecords(snapshot)), enqueue, recoveryResolutions: freeze(structuredClone(recoveryResolutions)) });
	preparedCommits.add(prepared); return prepared;
}

async function assertOwnership(database, prepared) {
	for (const table of ['dialogues', 'participants', 'categories', 'decorators', 'conditions']) {
		const ids = prepared.records[table].map((row) => row.id);
		for (const record of await database[table].bulkGet(ids)) if (record && record.projectId !== prepared.projectId) throw new ProjectDataError('FOREIGN_OWNERSHIP', `An imported ${table} identity already belongs to another project.`, [{ table, id: record.id, projectId: record.projectId }]);
	}
}

export async function commitPreparedProject(prepared) {
	if (!preparedCommits.has(prepared)) throw new ProjectDataError('INVALID_PREPARED_COMMIT', 'Prepare this project in the current session before committing.');
	const { context, projectId, expectedSequence, revision } = prepared;
	context.assertCurrent();
	const result = await context.db.transaction('rw', COMMIT_TABLES.map((table) => context.db.table(table)), async () => {
		context.assertCurrent();
		const current = await context.db.projectState.get(projectId);
		if ((current?.sequence || 0) !== expectedSequence) throw new ProjectDataError('STALE_PROJECT', 'This project changed while the operation was being prepared. Reload and retry.');
		if (revision.operation === 'create' && await context.db.projects.get(projectId)) throw new ProjectDataError('PROJECT_EXISTS', 'The destination project already exists. Choose copy or explicit replacement.');
		await assertOwnership(context.db, prepared);
		for (const resolution of prepared.recoveryResolutions) {
			const diagnostic = await context.db.recoveryRecords.get(resolution.id);
			if (!diagnostic || diagnostic.projectId !== projectId) throw new ProjectDataError('FOREIGN_RECOVERY_RECORD', 'Repair diagnostic does not belong to this project.');
			await context.db.recoveryRecords.update(resolution.id, { status: 'resolved', restoredKey: resolution.restoredKey });
		}
		const previousProject = await context.db.projects.get(projectId);
		const previousDialogues = new Map((await context.db.dialogues.where('projectId').equals(projectId).toArray()).map((dialogue) => [dialogue.id, dialogue]));
		const dialogues = await context.db.dialogues.where('projectId').equals(projectId).primaryKeys();
		for (const table of ['nodes', 'edges']) if (dialogues.length) await context.db[table].where('dialogueId').anyOf(dialogues).delete();
		for (const table of AUTHORING_TABLES.filter((name) => !['projects', 'nodes', 'edges'].includes(name))) await context.db[table].where('projectId').equals(projectId).delete();
		await context.db.projects.delete(projectId);
		if (revision.operation !== 'delete') for (const table of AUTHORING_TABLES) if (prepared.records[table].length) {
			const records = prepared.records[table].map((record) => {
				const previous = table === 'projects' ? previousProject : table === 'dialogues' ? previousDialogues.get(record.id) : null;
				return previous?.lastExportPath ? { ...record, lastExportPath: previous.lastExportPath } : record;
			});
			await context.db[table].bulkAdd(records);
		}
		const existingRevision = await context.db.projectRevisions.get(revision.id);
		if (existingRevision) {
			if (stableJson(existingRevision) !== stableJson(revision)) throw new ProjectDataError('REVISION_ID_COLLISION', 'An immutable revision identity already has different content.');
		} else await context.db.projectRevisions.add(revision);
		const sequence = expectedSequence + 1;
		await context.db.projectState.put({ projectId, sequence, revisionId: revision.id, modifiedAt: revision.createdAt, deleted: revision.operation === 'delete' });
		// Intent is provider-independent and durable even while offline/disconnected.
		// Per-provider delivery records acknowledge only this immutable revision.
		if (prepared.enqueue) await context.db.syncOutbox.add({ id: revision.id, projectId, localRevisionId: revision.id, payloadHash: revision.payloadHash, status: 'pending', operation: revision.operation, createdAt: revision.createdAt });
		context.assertCurrent(); return { projectId, revisionId: revision.id, sequence, snapshot: revision.snapshot };
	});
	preparedCommits.delete(prepared); context.assertCurrent(); return result;
}

export async function applyRemoteRevision(revision, { context: suppliedContext, expectedSequence } = {}) {
	const context = suppliedContext || await getRepositoryContext();
	const current = await readProjectState(revision?.projectId, context);
	const prepared = await prepareProjectCommit(revision?.snapshot, { context, expectedSequence: expectedSequence ?? current.sequence, enqueue: false, remoteRevision: revision });
	return commitPreparedProject(prepared);
}

export async function mutateProject(projectId, { context: suppliedContext, transform, operation = 'update', parentRevisionIds, recoveryResolutions } = {}) {
	const context = suppliedContext || await getRepositoryContext();
	context.assertCurrent();
	let queues = mutationQueues.get(context.db);
	if (!queues) { queues = new Map(); mutationQueues.set(context.db, queues); }
	const previous = queues.get(projectId) || Promise.resolve();
	const perform = async () => {
	context.assertCurrent();
	const current = await readProjectState(projectId, context);
	if (!current.snapshot.project) throw new ProjectDataError('PROJECT_NOT_FOUND', 'Project not found.');
	const snapshot = structuredClone(current.snapshot);
	const transformed = transform ? await transform(snapshot) : snapshot;
	context.assertCurrent();
	const prepared = await prepareProjectCommit(transformed ?? snapshot, { context, expectedSequence: current.sequence, operation, parentRevisionIds, recoveryResolutions, validation: 'draft', existingDiagnostics: validateCanonicalProject(current.snapshot, { localization: false }) });
	return commitPreparedProject(prepared);
	};
	const work = previous.catch(() => {}).then(() => navigator.locks?.request
		? navigator.locks.request(`mountea-project:${context.db.name}:${projectId}`, { signal: context.signal }, perform)
		: perform());
	queues.set(projectId, work);
	try { return await work; } finally { if (queues.get(projectId) === work) queues.delete(projectId); }
}
