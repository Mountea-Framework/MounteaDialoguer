import { AUTHORING_TABLES } from './schema';
import { normalizeProjectLocalizationConfig, validateLocalizedEntriesForDialogue } from '@/lib/localization/stringTable';
import { validateCategoryTree, normalizeParticipant, validateDefinition } from '@/lib/domainIntegrity';

export const PROJECT_FORMAT = 'mountea.project.v3';
export const RECORD_TABLES = AUTHORING_TABLES.filter((table) => table !== 'projects');
export const START_NODE_ID = '00000000-0000-0000-0000-000000000001';
export const compoundIdentity = (dialogueId, id) => JSON.stringify([dialogueId, id]);
const LOCAL_FIELDS = ['lastExportPath', 'syncTimestamp', 'syncRevision', 'lastSyncedAt', 'remoteFileId'];
export class ProjectDataError extends Error {
	constructor(code, message, diagnostics = []) { super(message); this.name = 'ProjectDataError'; this.code = code; this.diagnostics = diagnostics; }
}
export function recordsToSnapshot(records) { return { version: 3, format: PROJECT_FORMAT, project: records.projects?.[0], ...Object.fromEntries(RECORD_TABLES.map((table) => [table, records[table] || []])) }; }
export function snapshotToRecords(snapshot) { return { projects: snapshot.project ? [snapshot.project] : [], ...Object.fromEntries(RECORD_TABLES.map((table) => [table, snapshot[table] || []])) }; }

function bytesToBase64(bytes) {
	let value = '';
	for (let offset = 0; offset < bytes.length; offset += 32768) value += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
	return btoa(value);
}
export function decodeMediaBase64(value, path = 'audioFile') {
	if (typeof value !== 'string' || !/^data:[^,]*;base64,[A-Za-z0-9+/]*={0,2}$/.test(value)) throw new ProjectDataError('INVALID_MEDIA', `Invalid base64 media at ${path}.`, [{ path }]);
	try { return Uint8Array.from(atob(value.slice(value.indexOf(',') + 1)), (character) => character.charCodeAt(0)); }
	catch { throw new ProjectDataError('INVALID_MEDIA', `Invalid base64 media at ${path}.`, [{ path }]); }
}
export async function serializeAudio(audio, path) {
	if (!audio) return audio;
	const result = { ...audio };
	let bytes;
	if (audio.blob instanceof Blob) bytes = new Uint8Array(await audio.blob.arrayBuffer());
	else if (audio.base64 || audio.dataUrl) bytes = decodeMediaBase64(audio.base64 || audio.dataUrl, path);
	else throw new ProjectDataError('MISSING_MEDIA', `Audio bytes are missing at ${path}. Restore the original audio before exporting or synchronizing.`, [{ path }]);
	if (Number.isFinite(audio.size) && audio.size !== bytes.length) throw new ProjectDataError('MEDIA_SIZE_MISMATCH', `Audio byte length differs from its metadata at ${path}.`, [{ path, expected: audio.size, actual: bytes.length }]);
	const mimeType = audio.mimeType || audio.blob?.type || audio.type || 'application/octet-stream';
	delete result.blob; delete result.url; delete result.dataUrl;
	return { ...result, mimeType, size: bytes.length, base64: `data:${mimeType};base64,${bytesToBase64(bytes)}` };
}
function jsonValue(value, path = '', ancestors = new Set()) {
	if (value === undefined || typeof value === 'function') return undefined;
	if (value === null || ['string', 'boolean'].includes(typeof value)) return value;
	if (typeof value === 'number') { if (Number.isFinite(value)) return value; throw new ProjectDataError('INVALID_JSON_VALUE', `Non-finite number at ${path}.`); }
	if (value instanceof Date) return value.toISOString();
	if (value instanceof Blob || typeof value !== 'object') throw new ProjectDataError('INVALID_JSON_VALUE', `Unsupported authored value at ${path}.`);
	if (ancestors.has(value)) throw new ProjectDataError('INVALID_JSON_VALUE', `Cyclic authored value at ${path}.`);
	ancestors.add(value);
	const result = Array.isArray(value) ? value.map((entry, index) => jsonValue(entry, `${path}[${index}]`, ancestors) ?? null) : Object.fromEntries(Object.keys(value).sort().flatMap((key) => { const entry = jsonValue(value[key], `${path}.${key}`, ancestors); return entry === undefined ? [] : [[key, entry]]; }));
	ancestors.delete(value); return result;
}

/** Produces durable JSON; object URLs and React Flow runtime callbacks never
 * enter backups/revision hashes. Unknown JSON-compatible authored fields remain. */
export async function canonicalizeProject(input, { allowIncompleteMedia = false } = {}) {
	if (!input?.project) throw new ProjectDataError('INVALID_PROJECT', 'A project record is required.');
	const objectAt = (value, path) => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ProjectDataError('INVALID_RECORD', `Expected an object at ${path}.`, [{ path }]); };
	const recordsAt = (value, path) => { if (value !== undefined && !Array.isArray(value)) throw new ProjectDataError('INVALID_TABLE', `Expected an array at ${path}.`, [{ path }]); for (const [index, row] of (value || []).entries()) objectAt(row, `${path}[${index}]`); };
	objectAt(input.project, 'project');
	for (const table of RECORD_TABLES) recordsAt(input[table], table);
	for (const [index, node] of (input.nodes || []).entries()) {
		if (node.data !== undefined) objectAt(node.data, `nodes[${index}].data`);
		recordsAt(node.data?.dialogueRows, `nodes[${index}].data.dialogueRows`);
		recordsAt(node.data?.decorators, `nodes[${index}].data.decorators`);
	}
	for (const [index, edge] of (input.edges || []).entries()) {
		if (edge.data !== undefined) objectAt(edge.data, `edges[${index}].data`);
		if (edge.data?.conditions !== undefined) objectAt(edge.data.conditions, `edges[${index}].data.conditions`);
		recordsAt(edge.data?.conditions?.rules, `edges[${index}].data.conditions.rules`);
	}
	// Domain envelope is explicit so credentials/provider tables cannot leak when
	// a caller accidentally supplies a database dump instead of project records.
	const snapshot = { version: 3, format: PROJECT_FORMAT, project: { ...input.project } };
	for (const field of LOCAL_FIELDS) delete snapshot.project[field];
	snapshot.project.localization = normalizeProjectLocalizationConfig(snapshot.project.localization);
	for (const table of RECORD_TABLES) {
		if (input[table] !== undefined && !Array.isArray(input[table])) throw new ProjectDataError('INVALID_TABLE', `${table} must be an array.`, [{ path: table }]);
		snapshot[table] = (input[table] || []).map((record) => ({ ...record }));
	}
	snapshot.dialogues = snapshot.dialogues.map((row) => { const next = { ...row }; for (const field of LOCAL_FIELDS) delete next[field]; return next; });
	snapshot.participants = await Promise.all(snapshot.participants.map(async (participant) => {
		if (!participant.thumbnail) return participant;
		const path = `participants.${participant.id}.thumbnail`, thumbnail = participant.thumbnail;
		try {
			if (typeof thumbnail !== 'object' || (!thumbnail.blob && !thumbnail.base64 && !thumbnail.dataUrl)) throw new ProjectDataError('MISSING_MEDIA', `Thumbnail bytes are missing at ${path}. Restore the original image before exporting or synchronizing.`, [{ path }]);
			const normalized = await serializeAudio({ ...thumbnail, size: thumbnail.size ?? thumbnail.sizeBytes }, path);
			return { ...participant, thumbnail: normalized };
		} catch (error) {
			if (!allowIncompleteMedia || error.code !== 'MISSING_MEDIA') throw error;
			return participant;
		}
	}));
	snapshot.nodes = await Promise.all(snapshot.nodes.filter((node) => node.type !== 'placeholderNode').map(async (node) => {
		const data = { ...(node.data || {}) };
		if (Array.isArray(data.dialogueRows)) data.dialogueRows = await Promise.all(data.dialogueRows.map(async (row, index) => {
			if (!row.audioFile) return { ...row };
			try { return { ...row, audioFile: await serializeAudio(row.audioFile, `nodes.${node.id}.data.dialogueRows.${index}.audioFile`) }; }
			catch (error) {
				if (!allowIncompleteMedia || error.code !== 'MISSING_MEDIA') throw error;
				const original = { ...row.audioFile }; delete original.url;
				return { ...row, audioFile: original };
			}
		}));
		const result = { ...node, data };
		for (const field of ['selected', 'dragging', 'resizing', 'measured', 'positionAbsolute', 'internals']) delete result[field];
		return result;
	}));
	const originalPlaceholderIds = new Set((input.nodes || []).filter((node) => node.type === 'placeholderNode').map((node) => compoundIdentity(node.dialogueId, node.id)));
	snapshot.edges = snapshot.edges.filter((edge) => !originalPlaceholderIds.has(compoundIdentity(edge.dialogueId, edge.source)) && !originalPlaceholderIds.has(compoundIdentity(edge.dialogueId, edge.target))).map((edge) => { const result = { ...edge }; delete result.selected; return result; });
	// IndexedDB returns primary-key order, whereas imported arrays may use any
	// order. Canonicalize record sets while preserving authored embedded order.
	for (const table of RECORD_TABLES) {
		const key = (row) => JSON.stringify(['nodes', 'edges'].includes(table) ? [row.dialogueId, row.id] : [table === 'localizedStrings' ? row.key : row.id]);
		snapshot[table].sort((left, right) => key(left) < key(right) ? -1 : key(left) > key(right) ? 1 : 0);
	}
	return jsonValue(snapshot);
}

export function validateCanonicalProject(snapshot, { localization = true } = {}) {
	const diagnostics = [];
	const issue = (code, path, message) => diagnostics.push({ code, path, message });
	const projectId = snapshot.project?.id;
	if (typeof projectId !== 'string' || !projectId) issue('INVALID_ID', 'project.id', 'Project identity must be a nonempty string.');
	const maps = {};
	const domainCheck = (path, check) => { try { check(); } catch (error) { issue(error.code || 'INVALID_DOMAIN_RECORD', path, error.message); } };
	domainCheck('categories', () => validateCategoryTree(snapshot.categories || [], projectId));
	for (const row of snapshot.participants || []) domainCheck(`participants.${row.id}`, () => normalizeParticipant(row, snapshot, row.id));
	for (const table of ['decorators', 'conditions']) for (const row of snapshot[table] || []) domainCheck(`${table}.${row.id}`, () => validateDefinition(row));
	for (const table of RECORD_TABLES) {
		maps[table] = new Map();
		for (const [index, row] of (snapshot[table] || []).entries()) {
			const id = table === 'localizedStrings' ? row.key : row.id;
			const path = `${table}[${index}]`;
			if (typeof id !== 'string' || !id) issue('INVALID_ID', path, 'Record identity must be a nonempty string.');
			const key = ['nodes', 'edges'].includes(table) ? compoundIdentity(row.dialogueId, id) : id;
			if (maps[table].has(key)) issue('DUPLICATE_ID', path, 'Duplicate record identity.');
			maps[table].set(key, row);
			if (!['nodes', 'edges'].includes(table) && row.projectId !== projectId) issue('FOREIGN_OWNERSHIP', `${path}.projectId`, 'Record belongs to a different project.');
		}
	}
	for (const node of snapshot.nodes || []) {
		const path = `nodes.${node.dialogueId}.${node.id}`, data = node.data || {};
		if (!maps.dialogues.has(node.dialogueId)) issue('MISSING_DIALOGUE', `${path}.dialogueId`, 'Owning dialogue is missing.');
		if (data.participantId && !maps.participants.has(data.participantId)) issue('MISSING_PARTICIPANT', `${path}.data.participantId`, 'Participant is missing.');
		if (data.participant && !data.participantId) issue('UNRESOLVED_PARTICIPANT', `${path}.data.participantId`, 'Resolve the participant name to a stable identity.');
		if (data.targetNode && !maps.nodes.has(compoundIdentity(node.dialogueId, data.targetNode))) issue('MISSING_TARGET', `${path}.data.targetNode`, 'Return target is missing.');
		if (data.targetDialogue && !maps.dialogues.has(data.targetDialogue)) issue('MISSING_TARGET', `${path}.data.targetDialogue`, 'Child dialogue is missing.');
		for (const [index, instance] of (data.decorators || []).entries()) if (!maps.decorators.has(instance.id)) issue('MISSING_DEFINITION', `${path}.data.decorators[${index}]`, 'Decorator definition is missing.');
		const rows = new Set();
		for (const [index, row] of (data.dialogueRows || []).entries()) {
			if (!row.id || rows.has(row.id)) issue('INVALID_ROW_ID', `${path}.data.dialogueRows[${index}].id`, 'Row identities must be unique within a node.');
			rows.add(row.id);
			if (row.participantId && !maps.participants.has(row.participantId)) issue('MISSING_PARTICIPANT', `${path}.data.dialogueRows[${index}].participantId`, 'Row participant is missing.');
			if (row.participant && !row.participantId) issue('UNRESOLVED_PARTICIPANT', `${path}.data.dialogueRows[${index}].participantId`, 'Resolve the row participant name to a stable identity.');
		}
	}
	for (const edge of snapshot.edges || []) {
		for (const field of ['source', 'target']) if (!maps.nodes.has(compoundIdentity(edge.dialogueId, edge[field]))) issue('MISSING_ENDPOINT', `edges.${edge.id}.${field}`, 'Edge endpoint is missing.');
		for (const [index, instance] of (edge.data?.conditions?.rules || []).entries()) if (!maps.conditions.has(instance.id)) issue('MISSING_DEFINITION', `edges.${edge.id}.data.conditions.rules[${index}]`, 'Condition definition is missing.');
	}
	for (const participant of snapshot.participants || []) {
		if (participant.categoryId && !maps.categories.has(participant.categoryId)) issue('MISSING_CATEGORY', `participants.${participant.id}.categoryId`, 'Category is missing.');
		if (participant.category && !participant.categoryId) issue('UNRESOLVED_CATEGORY', `participants.${participant.id}.categoryId`, 'Resolve the category name to a stable identity.');
	}
	for (const category of snapshot.categories || []) {
		let cursor = category; const seen = new Set();
		while (cursor) {
			if (seen.has(cursor.id)) { issue('CATEGORY_CYCLE', `categories.${category.id}.parentCategoryId`, 'Category hierarchy contains a cycle.'); break; }
			seen.add(cursor.id);
			if (seen.size > 5) { issue('CATEGORY_DEPTH', `categories.${category.id}.parentCategoryId`, 'Category depth exceeds five.'); break; }
			if (cursor.parentCategoryId && !maps.categories.has(cursor.parentCategoryId)) issue('MISSING_CATEGORY', `categories.${category.id}.parentCategoryId`, 'Parent category is missing.');
			cursor = maps.categories.get(cursor.parentCategoryId);
		}
	}
	for (const dialogue of snapshot.dialogues || []) {
		const nodes = (snapshot.nodes || []).filter((node) => node.dialogueId === dialogue.id);
		const start = nodes.filter((node) => ['start', 'startNode'].includes(node.type));
		if (start.length !== 1 || start[0]?.id !== START_NODE_ID) issue('INVALID_START', `dialogues.${dialogue.id}`, 'Dialogue must contain exactly one canonical Start node.');
		if (localization) {
			const entries = (snapshot.localizedStrings || []).filter((entry) => entry.dialogueId === dialogue.id);
			const validation = validateLocalizedEntriesForDialogue({ projectId, dialogueId: dialogue.id, dialogueSlug: dialogue.localizationSlug, nodes, entries, projectEntries: snapshot.localizedStrings, defaultLocale: snapshot.project?.localization?.defaultLocale || 'en' });
			for (const error of validation.errors) issue('LOCALIZATION_REPAIR_REQUIRED', `dialogues.${dialogue.id}.${error.key || error.nodeId || ''}.${error.field || ''}`, error.type);
		}
	}
	return diagnostics;
}
export function requireValidProject(snapshot, options) {
	const diagnostics = validateCanonicalProject(snapshot, options);
	if (diagnostics.length) throw new ProjectDataError('INVALID_PROJECT_DATA', diagnostics[0].message, diagnostics);
	return snapshot;
}
export const stableJson = (value) => JSON.stringify(jsonValue(value));
export async function hashProject(snapshot) {
	const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(stableJson(snapshot)));
	return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
