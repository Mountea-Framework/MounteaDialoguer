import Dexie from 'dexie';
import { DATABASE_SCHEMA } from './schema';

const present = (value) => value !== null && value !== undefined && value !== '';
const identity = (value) => `${typeof value}:${String(value)}`;
const nodeKey = (dialogueId, id) => `${identity(dialogueId)}|${identity(id)}`;
const START_ID = '00000000-0000-0000-0000-000000000001';

/** Pure two-pass conversion. The source database remains an untouched backup. */
export function transformLegacyRecords(source) {
	const output = Object.fromEntries(Object.keys(DATABASE_SCHEMA).map((name) => [name, []]));
	const maps = {}, diagnostics = [];
	const originals = new WeakMap();
	const diagnose = (table, row, code, path, message, projectId = row.projectId, location = {}) => {
		diagnostics.push({ id: crypto.randomUUID(), projectId, table, code, path, message, status: 'unresolved', original: structuredClone(originals.get(row) || row), recordKey: ['nodes', 'edges'].includes(table) ? [row.dialogueId, row.id] : row.id, ...location });
	};
	for (const table of ['projects', 'dialogues', 'categories', 'participants', 'decorators', 'conditions']) {
		maps[table] = new Map((source[table] || []).map((row) => [identity(row.id), typeof row.id === 'number' ? crypto.randomUUID() : row.id]));
	}
	const remap = (table, id) => maps[table]?.get(identity(id)) ?? (typeof id === 'string' && /^\d+$/.test(id) ? maps[table]?.get(identity(Number(id))) : undefined) ?? id;
	for (const [table, rows] of Object.entries(source)) {
		if (!output[table]) {
			for (const row of rows) diagnose(table, row, 'unknown_table', '', 'This unrecognized table requires recovery using the preserved source database.');
			continue;
		}
		if (['nodes', 'edges', 'migrationState', 'recoveryRecords'].includes(table)) continue;
		output[table] = rows.map((original) => {
			const row = structuredClone(original);
			originals.set(row, original);
			if (maps[table]) row.id = remap(table, row.id);
			if (present(row.projectId)) row.projectId = remap('projects', row.projectId);
			if (present(row.dialogueId)) row.dialogueId = remap('dialogues', row.dialogueId);
			if (present(row.parentCategoryId)) row.parentCategoryId = remap('categories', row.parentCategoryId);
			if (present(row.categoryId)) row.categoryId = remap('categories', row.categoryId);
			if (table === 'syncTombstones') row.entityId = remap(row.entityType === 'project' ? 'projects' : 'dialogues', row.entityId);
			return row;
		});
	}
	const dialogueProjects = new Map(output.dialogues.map((row) => [row.id, row.projectId]));
	const categoryPath = (category) => {
		const names = [], visited = new Set();
		let cursor = category;
		while (cursor) {
			if (visited.has(cursor.id)) return null;
			visited.add(cursor.id); names.unshift(cursor.name);
			cursor = output.categories.find((row) => row.id === cursor.parentCategoryId && row.projectId === category.projectId);
		}
		return names.join('.');
	};
	const resolveNamedReference = (table, row, field, projection, candidates, projectId, original = row, location = {}) => {
		const path = location.rowId ? `data.dialogueRows.${location.rowId}.${field}` : field;
		if (present(row[field])) {
			if (!candidates.some((candidate) => candidate.id === row[field])) diagnose(table, original, 'missing_reference', path, `Referenced ${field} is missing or belongs to another project.`, projectId, location);
			return;
		}
		if (!present(projection)) return;
		const matches = candidates.filter((candidate) => candidate.name === projection || (table === 'participants' && categoryPath(candidate) === projection));
		if (matches.length === 1) row[field] = matches[0].id;
		else diagnose(table, original, matches.length ? 'ambiguous_reference' : 'missing_reference', path, `Choose a replacement for ${field}: ${String(projection)}.`, projectId, location);
	};
	for (const [index, row] of output.participants.entries()) resolveNamedReference('participants', row, 'categoryId', row.categoryPath || row.category, output.categories.filter((item) => item.projectId === row.projectId), row.projectId, source.participants[index], { recordKey: row.id });
	const nodeIds = new Map(), rowIds = new Map();
	for (const row of source.nodes || []) {
		nodeIds.set(nodeKey(row.dialogueId, row.id), ['start', 'startNode'].includes(row.type) ? START_ID : typeof row.id === 'number' ? crypto.randomUUID() : row.id);
		for (const item of row.data?.dialogueRows || []) rowIds.set(`${nodeKey(row.dialogueId, row.id)}|${identity(item.id)}`, typeof item.id === 'number' ? crypto.randomUUID() : item.id);
	}
	const nodeId = (dialogueId, id) => nodeIds.get(nodeKey(dialogueId, id)) ?? (typeof id === 'string' && /^\d+$/.test(id) ? nodeIds.get(nodeKey(dialogueId, Number(id))) : undefined) ?? id;
	for (const original of source.nodes || []) {
		const row = structuredClone(original);
		originals.set(row, original);
		row.id = nodeIds.get(nodeKey(original.dialogueId, original.id));
		row.dialogueId = remap('dialogues', original.dialogueId);
		const projectId = dialogueProjects.get(row.dialogueId);
		if (output.nodes.some((item) => item.id === row.id && item.dialogueId === row.dialogueId)) {
			diagnose('nodes', original, 'duplicate_identity', 'id', 'Two records map to the same node identity. This original is quarantined for manual recovery; restore it with a distinct identity.', projectId);
			continue;
		}
		row.data ||= {};
		if (present(row.data.targetNode)) row.data.targetNode = nodeId(original.dialogueId, row.data.targetNode);
		if (present(row.data.targetDialogue)) row.data.targetDialogue = remap('dialogues', row.data.targetDialogue);
		if (present(row.data.participantId)) row.data.participantId = remap('participants', row.data.participantId);
		resolveNamedReference('nodes', row.data, 'participantId', row.data.participant, output.participants.filter((item) => item.projectId === projectId), projectId, original, { recordKey: [row.dialogueId, row.id], dialogueId: row.dialogueId, nodeId: row.id });
		for (const decorator of row.data.decorators || []) decorator.id = remap('decorators', decorator.id);
		for (const dialogueRow of row.data.dialogueRows || []) {
			dialogueRow.id = rowIds.get(`${nodeKey(original.dialogueId, original.id)}|${identity(dialogueRow.id)}`) ?? dialogueRow.id;
			if (present(dialogueRow.participantId)) dialogueRow.participantId = remap('participants', dialogueRow.participantId);
			resolveNamedReference('nodes', dialogueRow, 'participantId', dialogueRow.participant, output.participants.filter((item) => item.projectId === projectId), projectId, original, { recordKey: [row.dialogueId, row.id], dialogueId: row.dialogueId, nodeId: row.id, rowId: dialogueRow.id });
		}
		output.nodes.push(row);
	}
	for (const original of source.edges || []) {
		const row = structuredClone(original);
		originals.set(row, original);
		row.id = typeof row.id === 'number' ? crypto.randomUUID() : row.id;
		row.dialogueId = remap('dialogues', original.dialogueId);
		row.source = nodeId(original.dialogueId, original.source);
		row.target = nodeId(original.dialogueId, original.target);
		for (const rule of row.data?.conditions?.rules || []) rule.id = remap('conditions', rule.id);
		output.edges.push(row);
	}
	for (let index = 0; index < output.localizedStrings.length; index++) {
		const original = source.localizedStrings[index];
		output.localizedStrings[index].nodeId = nodeId(original.dialogueId, original.nodeId);
		if (present(original.rowId)) output.localizedStrings[index].rowId = rowIds.get(`${nodeKey(original.dialogueId, original.nodeId)}|${identity(original.rowId)}`) ?? original.rowId;
	}
	const projects = new Set(output.projects.map((row) => row.id));
	for (const table of ['dialogues', 'categories', 'participants', 'decorators', 'conditions']) for (const row of output[table]) if (!projects.has(row.projectId)) diagnose(table, row, 'missing_project', 'projectId', 'The owning project is missing.');
	for (const row of output.categories) {
		if (!categoryPath(row)) diagnose('categories', row, 'category_cycle', 'parentCategoryId', 'Remove the cycle in the category hierarchy.');
		else if (categoryPath(row).split('.').length > 5) diagnose('categories', row, 'category_depth', 'parentCategoryId', 'Move this category within the maximum depth of five.');
		if (present(row.parentCategoryId) && !output.categories.some((item) => item.id === row.parentCategoryId && item.projectId === row.projectId)) diagnose('categories', row, 'missing_reference', 'parentCategoryId', 'The parent category is missing or belongs to another project.');
	}
	for (const row of output.nodes) {
		const projectId = dialogueProjects.get(row.dialogueId);
		if (!dialogueProjects.has(row.dialogueId)) diagnose('nodes', row, 'missing_dialogue', 'dialogueId', 'The owning dialogue is missing.');
		if (present(row.data.targetNode) && !output.nodes.some((item) => item.id === row.data.targetNode && item.dialogueId === row.dialogueId)) diagnose('nodes', row, 'missing_reference', 'data.targetNode', 'The return target is missing.', projectId);
		if (present(row.data.targetDialogue) && dialogueProjects.get(row.data.targetDialogue) !== projectId) diagnose('nodes', row, 'missing_reference', 'data.targetDialogue', 'The child dialogue is missing or belongs to another project.', projectId);
		for (const decorator of row.data.decorators || []) if (!output.decorators.some((item) => item.id === decorator.id && item.projectId === projectId)) diagnose('nodes', row, 'missing_reference', 'data.decorators', 'A decorator definition is missing or belongs to another project.', projectId);
	}
	for (const row of output.edges) for (const rule of row.data?.conditions?.rules || []) if (!output.conditions.some((item) => item.id === rule.id && item.projectId === dialogueProjects.get(row.dialogueId))) diagnose('edges', row, 'missing_reference', 'data.conditions.rules', 'A condition definition is missing or belongs to another project.', dialogueProjects.get(row.dialogueId));
	for (const row of output.edges) for (const field of ['source', 'target']) if (!output.nodes.some((node) => node.dialogueId === row.dialogueId && node.id === row[field])) diagnose('edges', row, 'missing_reference', field, 'The edge endpoint is missing.', dialogueProjects.get(row.dialogueId));
	output.recoveryRecords = diagnostics;
	return { records: output, diagnostics };
}

export async function migrateLegacyDatabase(target, sourceName, { beforeCommit, beforeActivation } = {}) {
	const manifestKey = `mountea-database-manifest::${sourceName}`;
	let completed = await target.migrationState.get('generation2');
	if (!completed) {
		let sourceRecords = {}, sourceVersion = null;
		if (await Dexie.exists(sourceName)) {
			const source = new Dexie(sourceName); // Dynamic schema: no version declaration or upgrade.
			try {
				await source.open(); sourceVersion = source.verno;
				if (sourceVersion > 9) throw new Error(`Unsupported source database version ${sourceVersion}; use a newer application. The source has not been modified.`);
				sourceRecords = await source.transaction('r', source.tables, async () => Object.fromEntries(await Promise.all(source.tables.map(async (table) => [table.name, await table.toArray()]))));
			} finally { source.close(); }
		}
		const { records, diagnostics } = transformLegacyRecords(sourceRecords);
		await target.transaction('rw', target.tables, async () => {
			completed = await target.migrationState.get('generation2');
			if (completed) return;
			for (const [table, rows] of Object.entries(records)) if (rows.length) await target.table(table).bulkAdd(rows);
			await beforeCommit?.({ records, diagnostics });
			completed = { key: 'generation2', status: 'complete', sourceName, sourceVersion, targetName: target.name, diagnostics: diagnostics.length, completedAt: new Date().toISOString() };
			await target.migrationState.put(completed);
		});
	}
	await beforeActivation?.(completed);
	// Activation is retried after interruption. The transactional target marker
	// prevents copying again and overwriting newer edits. The manifest alone is
	// never trusted as evidence that copying completed.
	globalThis.localStorage?.setItem(manifestKey, JSON.stringify(completed));
	return completed;
}
