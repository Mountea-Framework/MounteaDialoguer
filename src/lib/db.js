import Dexie from 'dexie';
import { getActiveProfileId, getProfileGeneration, subscribeProfileChanges } from '@/lib/profile/activeProfile';
import { DATABASE_SCHEMA, AUTHORING_TABLES } from '@/lib/persistence/schema';
import { migrateLegacyDatabase } from '@/lib/persistence/migration';
import { transformLegacyRecords } from '@/lib/persistence/migration';

export class MounteaDialoguerDB extends Dexie {
	constructor(sourceName = 'MounteaDialoguerDB', options = {}) {
		super(`${sourceName}__generation2`);
		this.sourceName = sourceName;
		this.version(1).stores(DATABASE_SCHEMA);
		for (const name of Object.keys(DATABASE_SCHEMA)) this[name] = this.table(name);
		this.on('ready', () => migrateLegacyDatabase(this, sourceName, options), true);
	}
}
export function getDatabaseNameForProfile(profileId = getActiveProfileId()) {
	const normalized = String(profileId || 'local');
	if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) throw new Error('Invalid profile identifier; refusing an ambiguous database name.');
	return normalized === 'local' ? 'MounteaDialoguerDB' : `MounteaDialoguerDB__${normalized}`;
}
const instances = new Map();
let activeController = new AbortController();
subscribeProfileChanges(() => { activeController.abort(); activeController = new AbortController(); });
function instanceFor(profileId = getActiveProfileId()) {
	const name = getDatabaseNameForProfile(profileId);
	if (!instances.has(name)) instances.set(name, new MounteaDialoguerDB(name));
	return instances.get(name);
}
// Legacy single-step access remains compatible. Multi-step callers capture a
// context and use its database for the entire operation, never the moving proxy.
export const db = new Proxy({}, {
	get(_target, property) { const instance = instanceFor(); const value = instance[property]; return typeof value === 'function' ? value.bind(instance) : value; },
	set(_target, property, value) { instanceFor()[property] = value; return true; },
});
export function getProfileScopedDbName() { return instanceFor().name; }
export async function initializeRepository(profileId = getActiveProfileId()) {
	const instance = instanceFor(profileId); await instance.open(); return instance;
}
export async function getRepositoryContext() {
	const profileId = getActiveProfileId(), generation = getProfileGeneration(), signal = activeController.signal;
	const instance = instanceFor(profileId);
	const assertCurrent = () => {
		if (signal.aborted || generation !== getProfileGeneration() || profileId !== getActiveProfileId()) {
			const error = new Error('The active profile changed. Retry this operation in the current profile.');
			error.code = 'STALE_PROFILE'; throw error;
		}
	};
	await instance.open(); assertCurrent();
	return Object.freeze({ db: instance, profileId, generation, signal, assertCurrent });
}
export async function readProjectRecords(projectId, context) {
	const captured = context || await getRepositoryContext(); captured.assertCurrent();
	const result = await captured.db.transaction('r', AUTHORING_TABLES.map((name) => captured.db.table(name)), async () => {
		const project = await captured.db.projects.get(projectId);
		const dialogues = await captured.db.dialogues.where('projectId').equals(projectId).toArray();
		const dialogueIds = dialogues.map((row) => row.id);
		const records = { projects: project ? [project] : [], dialogues };
		for (const table of AUTHORING_TABLES.filter((name) => !['projects', 'dialogues'].includes(name))) records[table] = await (['nodes', 'edges'].includes(table) ? captured.db[table].where('dialogueId').anyOf(dialogueIds) : captured.db[table].where('projectId').equals(projectId)).toArray();
		return records;
	});
	captured.assertCurrent(); return result;
}
export async function getRecoveryDiagnostics(projectId, context) {
	const captured = context || await getRepositoryContext(); captured.assertCurrent();
	const records = await captured.db.recoveryRecords.filter((record) => record.status !== 'resolved' && (!projectId || !record.projectId || record.projectId === projectId)).toArray();
	captured.assertCurrent(); return records;
}
export async function assertProjectReady(projectId, context) {
	const diagnostics = await getRecoveryDiagnostics(projectId, context);
	if (diagnostics.length) { const error = new Error('Repair unresolved migration references before exporting or synchronizing this project.'); error.code = 'PROJECT_REPAIR_REQUIRED'; error.diagnostics = diagnostics; throw error; }
}

/** After repairing references through the normal authoring UI, revalidate them
 * atomically. Historical diagnostics/originals remain available for recovery;
 * callers cannot simply dismiss a still-invalid reference. Quarantined records
 * require explicit restoration before their diagnostic can be cleared. */
export async function revalidateProjectRecovery(projectId, context) {
	const captured = context || await getRepositoryContext(); captured.assertCurrent();
	const result = await captured.db.transaction('rw', [...AUTHORING_TABLES, 'recoveryRecords'].map((name) => captured.db.table(name)), async () => {
		const records = await readProjectRecords(projectId, captured);
		const { diagnostics } = transformLegacyRecords(records);
		const previous = await captured.db.recoveryRecords.where('projectId').equals(projectId).toArray();
		const locationKey = (record) => JSON.stringify([record.table, record.recordKey ?? (['nodes', 'edges'].includes(record.table) ? [record.original?.dialogueId, record.original?.id] : record.original?.id), record.path, record.rowId || null]);
		const unresolved = new Map(diagnostics.map((record) => [locationKey(record), record]));
		for (const record of previous) {
			if (['duplicate_identity', 'unknown_table', 'missing_project', 'missing_dialogue'].includes(record.code)) continue;
			const key = record.recordKey ?? (['nodes', 'edges'].includes(record.table) ? [record.original?.dialogueId, record.original?.id] : record.original?.id);
			const candidates = records[record.table] || [];
			const candidate = candidates.find((candidate) => Array.isArray(key) ? candidate.id === key[1] && candidate.dialogueId === key[0] : candidate.id === key);
			if (!candidate || (record.rowId && !candidate.data?.dialogueRows?.some((row) => row.id === record.rowId))) continue;
			const location = locationKey(record);
			if (unresolved.has(location)) { unresolved.delete(location); continue; }
			if (record.status !== 'resolved') await captured.db.recoveryRecords.update(record.id, { status: 'resolved', resolvedAt: new Date().toISOString() });
		}
		if (unresolved.size) await captured.db.recoveryRecords.bulkAdd([...unresolved.values()]);
		captured.assertCurrent(); return diagnostics;
	});
	captured.assertCurrent(); return result;
}

export async function restoreQuarantinedNode(diagnosticId, restoredNode, context) {
	const captured = context || await getRepositoryContext(); captured.assertCurrent();
	const diagnostic = await captured.db.recoveryRecords.get(diagnosticId); captured.assertCurrent();
	if (diagnostic?.code !== 'duplicate_identity' || diagnostic.table !== 'nodes' || diagnostic.status === 'resolved') throw new Error('Select an unresolved quarantined node.');
	const node = structuredClone(restoredNode);
	const { mutateProject } = await import('@/lib/persistence/projectRepository'); captured.assertCurrent();
	await mutateProject(diagnostic.projectId, { context: captured, recoveryResolutions: [{ id: diagnosticId, restoredKey: [node.dialogueId, node.id] }], transform: (snapshot) => {
		if (!node.id || !node.type || !node.data || !snapshot.dialogues.some((dialogue) => dialogue.id === node.dialogueId)) throw new Error('The restored node must have an identity, type, data, and a dialogue in the affected project.');
		if (['start', 'startNode'].includes(node.type)) throw new Error('The dialogue already has a Start node. Choose the intended non-Start type for the recovered node.');
		if (snapshot.nodes.some((existing) => existing.dialogueId === node.dialogueId && existing.id === node.id)) throw new Error('Choose a distinct node identity before restoring this record.');
		snapshot.nodes.push(node);
	} });
	return revalidateProjectRecovery(diagnostic.projectId, captured);
}

/** Explicit target selection; never guess between equal display names. */
export async function repairIdentityReference(diagnosticId, targetId, context) {
	const captured = context || await getRepositoryContext();
	const diagnostic = await captured.db.recoveryRecords.get(diagnosticId); captured.assertCurrent();
	if (!diagnostic || diagnostic.status === 'resolved' || !['missing_reference', 'ambiguous_reference'].includes(diagnostic.code)) throw new Error('Select an unresolved identity reference.');
	const { mutateProject } = await import('@/lib/persistence/projectRepository');
	const { normalizeParticipant } = await import('@/lib/domainIntegrity'); captured.assertCurrent();
	await mutateProject(diagnostic.projectId, { context: captured, transform: (snapshot) => {
		if (diagnostic.table === 'participants' && diagnostic.path === 'categoryId') {
			const record = snapshot.participants.find((item) => item.id === (diagnostic.recordKey || diagnostic.original.id));
			if (!record) throw new Error('The original participant is unavailable; retain the evidence for recovery.');
			Object.assign(record, normalizeParticipant({ ...record, categoryId: targetId }, snapshot, record.id));
		} else if (diagnostic.table === 'nodes' && (diagnostic.path === 'participantId' || diagnostic.rowId)) {
			const key = diagnostic.recordKey || [diagnostic.original.dialogueId, diagnostic.original.id];
			const node = snapshot.nodes.find((item) => item.id === key[1] && item.dialogueId === key[0]);
			const target = snapshot.participants.find((item) => item.id === targetId);
			if (!node || !target) throw new Error('Choose a participant and node in this project.');
			const data = diagnostic.rowId ? node.data.dialogueRows?.find((row) => row.id === diagnostic.rowId) : node.data;
			if (!data) throw new Error('The affected row is unavailable; retain the evidence for recovery.');
			data.participantId = target.id; data.participant = target.name;
		} else throw new Error('Repair this reference in its authoring editor, then revalidate.');
	} });
	return revalidateProjectRecovery(diagnostic.projectId, captured);
}
