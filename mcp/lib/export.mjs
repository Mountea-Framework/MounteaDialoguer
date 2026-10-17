// Archive export (.mnteadlg / .mnteadlgproj, format "mountea.archive.v3"), ported from exportProjectArchive in
// src/lib/persistence/projectArchive.js (which needs JSZip and the browser). Same layout, same record naming.
// tests/e2e/mcp.spec.js compares this output with the UI export, so keep both in step.
import {
	RECORD_TABLES,
	canonicalizeProject,
	decodeMediaBase64,
	requireValidProject,
} from '../../src/lib/persistence/canonicalProject.js';
import { ToolError } from './store.mjs';
import { buildZip } from './zip.mjs';

const LIMITS = { compressed: 25 * 1024 * 1024, json: 5 * 1024 * 1024, entries: 1000, dialogues: 250, expanded: 128 * 1024 * 1024 };
const encode = (value) => Buffer.from(JSON.stringify(value));
const filename = (name, id) => `${String(name || 'record').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70)}--${encodeURIComponent(id)}`;

async function exportArchive(input, { kind, dialogueId }) {
	let snapshot;
	try {
		snapshot = requireValidProject(await canonicalizeProject(input));
	} catch (error) {
		throw new ToolError(`Export blocked: ${error.message}`);
	}
	if (snapshot.dialogues.length > LIMITS.dialogues) throw new ToolError('Project has too many dialogues for one archive.');
	const files = [];
	const manifest = { format: 'mountea.archive.v3', kind, dialogueId, project: 'project.json', records: [], media: [] };
	let expanded = 0;
	const add = (path, bytes) => {
		if (path.endsWith('.json') && bytes.length > LIMITS.json) throw new ToolError(`A record exceeds the 5 MiB JSON limit: ${path}`);
		expanded += bytes.length;
		if (expanded > LIMITS.expanded || files.length + 1 > LIMITS.entries) throw new ToolError('Export exceeds the archive limits.');
		files.push({ name: path, data: bytes });
	};
	for (const node of snapshot.nodes) {
		for (const row of node.data?.dialogueRows || []) {
			if (!row.audioFile) continue;
			const path = `media/${filename(row.audioFile.name, JSON.stringify([node.dialogueId, node.id, row.id]))}`;
			add(path, Buffer.from(decodeMediaBase64(row.audioFile.base64)));
			delete row.audioFile.base64;
			manifest.media.push({ path, dialogueId: node.dialogueId, nodeId: node.id, rowId: row.id });
		}
	}
	for (const participant of snapshot.participants) {
		if (!participant.thumbnail?.base64) continue;
		const path = `media/thumbnails/${encodeURIComponent(participant.id)}`;
		add(path, Buffer.from(decodeMediaBase64(participant.thumbnail.base64)));
		delete participant.thumbnail.base64;
		manifest.media.push({ path, participantId: participant.id });
	}
	add(manifest.project, encode(snapshot.project));
	for (const table of RECORD_TABLES) {
		for (const [index, record] of snapshot[table].entries()) {
			const path = `${table}/${filename(record.name || record.key || table, `${record.dialogueId || ''}:${record.id || record.key}:${index}`)}.json`;
			add(path, encode(record));
			manifest.records.push({ table, path });
		}
	}
	add('manifest.json', encode(manifest));
	const zip = buildZip(files);
	if (zip.length > LIMITS.compressed) throw new ToolError('Export exceeds the 25 MiB archive limit.');
	return zip;
}

export function buildProjectExport(snapshot) {
	return exportArchive(snapshot, { kind: 'project' });
}

/** One dialogue plus every child graph it opens (transitively), like the Export button. */
export function buildDialogueExport(snapshot, dialogueId) {
	if (!snapshot.dialogues.some((d) => d.id === dialogueId)) throw new ToolError(`Dialogue "${dialogueId}" not found`);
	const copy = structuredClone(snapshot);
	const selected = new Set([dialogueId]);
	let changed = true;
	while (changed) {
		changed = false;
		for (const node of copy.nodes) {
			if (selected.has(node.dialogueId) && node.data?.targetDialogue && !selected.has(node.data.targetDialogue)) {
				selected.add(node.data.targetDialogue);
				changed = true;
			}
		}
	}
	for (const table of ['dialogues', 'nodes', 'edges', 'localizedStrings']) {
		copy[table] = copy[table].filter((row) => selected.has(table === 'dialogues' ? row.id : row.dialogueId));
	}
	return exportArchive(copy, { kind: 'dialogue', dialogueId });
}
