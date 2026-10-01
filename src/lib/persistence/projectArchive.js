import JSZip from 'jszip';
import { canonicalizeProject, requireValidProject, RECORD_TABLES, decodeMediaBase64, serializeAudio, ProjectDataError } from './canonicalProject';
import { remapProjectIdentities } from './projectRemap';
import { getRepositoryContext } from '@/lib/db';
import { readProjectState, prepareProjectCommit } from './projectRepository';
import { parseImportedStringTableData } from '@/lib/localization/stringTable';

export const ARCHIVE_LIMITS = Object.freeze({ compressed: 25 * 1024 * 1024, json: 5 * 1024 * 1024, entries: 1000, dialogues: 250, expanded: 128 * 1024 * 1024 });
const fail = (code, message, path) => { throw new ProjectDataError(code, message, path ? [{ path }] : []); };
const decoder = new TextDecoder('utf-8', { fatal: true });
const encode = (value) => new TextEncoder().encode(JSON.stringify(value));
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
	let value = index;
	for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
	return value >>> 0;
});
function safePath(name) {
	if (typeof name !== 'string' || !name || name.includes('\\') || name.startsWith('/') || name.includes(':') || name.includes('//') || [...name].some((character) => character.charCodeAt(0) < 32) || name.split('/').some((part) => part === '..' || part === '.')) fail('UNSAFE_ARCHIVE_PATH', 'Archive contains an unsafe original entry path.', name);
	return name.normalize('NFC');
}
/** Inspect original central directory names before JSZip can normalize or replace
 * duplicate entries. ZIP64 and multipart containers are intentionally unsupported. */
function inspectDirectory(bytes, budget) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	let end = -1;
	for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) if (view.getUint32(offset, true) === 0x06054b50 && offset + 22 + view.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
	if (end < 0) fail('INVALID_ARCHIVE', 'ZIP directory is missing or truncated.');
	const count = view.getUint16(end + 10, true), size = view.getUint32(end + 12, true), start = view.getUint32(end + 16, true);
	if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || count === 65535 || start + size !== end) fail('UNSUPPORTED_ARCHIVE', 'Multipart and ZIP64 archives are unsupported.');
	budget.entries += count;
	if (budget.entries > ARCHIVE_LIMITS.entries) fail('ARCHIVE_ENTRY_LIMIT', 'Archive exceeds the cumulative entry count limit.');
	const names = new Set(), checksums = new Map(); let cursor = start;
	for (let index = 0; index < count; index++) {
		if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) fail('INVALID_ARCHIVE', 'ZIP directory entry is invalid.');
		const length = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true);
		if (cursor + 46 + length + extra + comment > end) fail('INVALID_ARCHIVE', 'ZIP directory entry is truncated.');
		const name = safePath(decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + length)));
		// JSZip takes the filename from the local header. Inspect it before the
		// library can overwrite entries with mismatching effective identities.
		const local = view.getUint32(cursor + 42, true);
		if (local + 30 > start || view.getUint32(local, true) !== 0x04034b50) fail('INVALID_ARCHIVE', 'ZIP local header is invalid.');
		const localLength = view.getUint16(local + 26, true), localExtra = view.getUint16(local + 28, true);
		if (local + 30 + localLength + localExtra > start) fail('INVALID_ARCHIVE', 'ZIP local header is truncated.');
		const localName = safePath(decoder.decode(bytes.subarray(local + 30, local + 30 + localLength)));
		if (localName !== name) fail('UNSUPPORTED_ARCHIVE_PATH', 'ZIP local and central entry paths must match.', name);
		// JSZip interprets Unicode path extras before normalizing names. Reject
		// overrides rather than letting them hide duplicate or traversing paths.
		let extraCursor = cursor + 46 + length;
		const extraEnd = extraCursor + extra;
		while (extraCursor < extraEnd) {
			if (extraCursor + 4 > extraEnd) fail('INVALID_ARCHIVE', 'Truncated ZIP extra field.');
			const tag = view.getUint16(extraCursor, true), fieldLength = view.getUint16(extraCursor + 2, true);
			if (extraCursor + 4 + fieldLength > extraEnd) fail('INVALID_ARCHIVE', 'Truncated ZIP extra field.');
			if (tag === 0x7075) {
				if (fieldLength < 5 || safePath(decoder.decode(bytes.subarray(extraCursor + 9, extraCursor + 4 + fieldLength))) !== name) fail('UNSUPPORTED_ARCHIVE_PATH', 'ZIP Unicode path overrides are unsupported.', name);
			}
			extraCursor += 4 + fieldLength;
		}
		const identity = name.replace(/\/$/, '');
		if (names.has(identity)) fail('DUPLICATE_ARCHIVE_PATH', 'Archive contains duplicate normalized entry paths.', name);
		names.add(identity); checksums.set(name, view.getUint32(cursor + 16, true)); cursor += 46 + length + extra + comment;
	}
	if (cursor !== end) fail('INVALID_ARCHIVE', 'ZIP directory size does not match its entries.');
	return checksums;
}
async function boundedEntry(entry, budget, expectedCrc) {
	return new Promise((resolve, reject) => {
		const chunks = []; let length = 0, stopped = false, crc = 0xffffffff;
		const stream = entry.internalStream('uint8array');
		stream.on('data', (chunk) => {
			if (stopped) return;
			length += chunk.length; budget.expanded += chunk.length;
			if (budget.expanded > ARCHIVE_LIMITS.expanded || (/\.json$/i.test(entry.name) && length > ARCHIVE_LIMITS.json)) {
				stopped = true; stream.pause(); chunks.length = 0;
				reject(new ProjectDataError('ARCHIVE_EXPANSION_LIMIT', 'Archive expanded content exceeds its allowed size.', [{ path: entry.name }])); return;
			}
			for (const byte of chunk) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
			chunks.push(chunk);
		}).on('error', reject).on('end', () => {
			if (stopped) return;
			if (((crc ^ 0xffffffff) >>> 0) !== expectedCrc) { chunks.length = 0; reject(new ProjectDataError('ARCHIVE_CHECKSUM_MISMATCH', 'Archive entry bytes do not match their checksum.', [{ path: entry.name }])); return; }
			const bytes = new Uint8Array(length); let offset = 0;
			for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
			resolve(bytes);
		}).resume();
	});
}
async function extract(input, budget) {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(await input.arrayBuffer());
	if (bytes.length > ARCHIVE_LIMITS.compressed) fail('ARCHIVE_COMPRESSED_LIMIT', 'Archive exceeds the compressed size limit.');
	const checksums = inspectDirectory(bytes, budget);
	const zip = await JSZip.loadAsync(bytes), entries = new Map();
	for (const entry of Object.values(zip.files)) if (!entry.dir) {
		safePath(entry.unsafeOriginalName || entry.name);
		const name = safePath(entry.name);
		if (entries.has(name)) fail('DUPLICATE_ARCHIVE_PATH', 'Archive contains duplicate effective entry paths.', name);
		entries.set(name, await boundedEntry(entry, budget, checksums.get(name)));
	}
	return entries;
}
export async function readBoundedArchive(input, budget = { entries: 0, expanded: 0 }) { return extract(input, budget); }
function json(entries, path, fallback) {
	if (!entries.has(path)) { if (fallback !== undefined) return fallback; fail('MISSING_ARCHIVE_ENTRY', 'Required archive entry is missing.', path); }
	const bytes = entries.get(path);
	if (bytes.length > ARCHIVE_LIMITS.json) fail('ARCHIVE_JSON_LIMIT', 'JSON entry exceeds its size limit.', path);
	try { return JSON.parse(decoder.decode(bytes)); } catch { fail('INVALID_ARCHIVE_JSON', 'Archive contains invalid JSON.', path); }
}
const empty = (project) => ({ project, ...Object.fromEntries(RECORD_TABLES.map((table) => [table, []])) });
const filename = (name, id) => `${String(name || 'record').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 70)}--${encodeURIComponent(id)}`;

export async function exportProjectArchive(input, { kind = 'project', dialogueId } = {}) {
	const snapshot = requireValidProject(await canonicalizeProject(input));
	if (snapshot.dialogues.length > ARCHIVE_LIMITS.dialogues) fail('ARCHIVE_DIALOGUE_LIMIT', 'Project has too many dialogues for one backup.');
	const zip = new JSZip(), manifest = { format: 'mountea.archive.v3', kind, dialogueId, project: 'project.json', records: [], media: [] };
	let expanded = 0, count = 0;
	const add = (path, bytes) => {
		if (path.endsWith('.json') && bytes.length > ARCHIVE_LIMITS.json) fail('ARCHIVE_JSON_LIMIT', 'A record exceeds the JSON entry limit.', path);
		expanded += bytes.length; count++;
		if (expanded > ARCHIVE_LIMITS.expanded || count > ARCHIVE_LIMITS.entries) fail('ARCHIVE_EXPANSION_LIMIT', 'Project exceeds the restorable archive limits.');
		zip.file(path, bytes, { createFolders: false });
	};
	for (const node of snapshot.nodes) for (const row of node.data?.dialogueRows || []) if (row.audioFile) {
		const path = `media/${filename(row.audioFile.name, JSON.stringify([node.dialogueId, node.id, row.id]))}`;
		add(path, decodeMediaBase64(row.audioFile.base64)); delete row.audioFile.base64;
		manifest.media.push({ path, dialogueId: node.dialogueId, nodeId: node.id, rowId: row.id });
	}
	for (const participant of snapshot.participants) if (participant.thumbnail?.base64) {
		const path = `media/thumbnails/${encodeURIComponent(participant.id)}`;
		add(path, decodeMediaBase64(participant.thumbnail.base64)); delete participant.thumbnail.base64;
		manifest.media.push({ path, participantId: participant.id });
	}
	add(manifest.project, encode(snapshot.project));
	for (const table of RECORD_TABLES) for (const [index, record] of snapshot[table].entries()) {
		const path = `${table}/${filename(record.name || record.key || table, `${record.dialogueId || ''}:${record.id || record.key}:${index}`)}.json`;
		add(path, encode(record)); manifest.records.push({ table, path });
	}
	add('manifest.json', encode(manifest));
	const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
	if (bytes.length > ARCHIVE_LIMITS.compressed) fail('ARCHIVE_COMPRESSED_LIMIT', 'Backup exceeds the supported compressed size limit.');
	return new Blob([bytes], { type: 'application/zip' });
}

async function parseVersioned(entries, manifest) {
	if (manifest.format !== 'mountea.archive.v3') fail('UNSUPPORTED_ARCHIVE', 'Unsupported archive format.');
	if (!['project', 'dialogue'].includes(manifest.kind)) fail('INVALID_ARCHIVE_MANIFEST', 'Archive kind must be project or dialogue.');
	if (!Array.isArray(manifest.records) || !Array.isArray(manifest.media)) fail('INVALID_ARCHIVE_MANIFEST', 'Archive manifest lists are invalid.');
	const snapshot = empty(json(entries, manifest.project)); const used = new Set(['manifest.json', manifest.project]);
	for (const item of manifest.records) {
		if (!RECORD_TABLES.includes(item.table) || used.has(item.path)) fail('INVALID_ARCHIVE_MANIFEST', 'Duplicate or unsupported manifest record.', item.path);
		used.add(item.path); snapshot[item.table].push(json(entries, item.path));
	}
	const bindings = new Set();
	for (const item of manifest.media) {
		const binding = JSON.stringify(item.participantId ? ['thumbnail', item.participantId] : ['audio', item.dialogueId, item.nodeId, item.rowId]);
		if (bindings.has(binding)) fail('INVALID_ARCHIVE_MEDIA', 'Multiple media entries claim the same record.', item.path);
		bindings.add(binding);
		if (item.participantId) {
			const participant = snapshot.participants.find((row) => row.id === item.participantId);
			if (!participant?.thumbnail || used.has(item.path) || !entries.has(item.path)) fail('INVALID_ARCHIVE_MEDIA', 'Thumbnail manifest reference is missing or duplicated.', item.path);
			used.add(item.path);
			const media = await serializeAudio({ ...participant.thumbnail, blob: new Blob([entries.get(item.path)], { type: participant.thumbnail.mimeType }) }, item.path);
			participant.thumbnail.base64 = media.base64;
			continue;
		}
		const row = snapshot.nodes.find((node) => node.dialogueId === item.dialogueId && node.id === item.nodeId)?.data?.dialogueRows?.find((candidate) => candidate.id === item.rowId);
		if (!row?.audioFile || used.has(item.path) || !entries.has(item.path)) fail('INVALID_ARCHIVE_MEDIA', 'Media manifest reference is missing or duplicated.', item.path);
		used.add(item.path); row.audioFile = await serializeAudio({ ...row.audioFile, blob: new Blob([entries.get(item.path)], { type: row.audioFile.mimeType }) }, item.path);
	}
	if (used.size !== entries.size) fail('INVALID_ARCHIVE_MANIFEST', 'Archive has entries not declared by its manifest.');
	if (manifest.kind === 'dialogue' && !snapshot.dialogues.some((row) => row.id === manifest.dialogueId)) fail('INVALID_ARCHIVE_MANIFEST', 'The archive root dialogue is missing.');
	return { snapshot, kind: manifest.kind, dialogueId: manifest.dialogueId };
}

function uniqueByName(records, name, path) {
	const matches = records.filter((row) => row.name === name);
	if (matches.length !== 1) fail('LEGACY_REFERENCE_REPAIR_REQUIRED', 'Legacy reference cannot be resolved uniquely.', path);
	return matches[0].id;
}
async function legacySupport(entries, snapshot) {
	const projectId = snapshot.project.id, paths = new Map();
	const category = (path) => {
		let parentCategoryId = null, full = '';
		for (const name of String(path || '').split('.').filter(Boolean)) {
			full = full ? `${full}.${name}` : name;
			let row = paths.get(full);
			if (!row) { row = { id: crypto.randomUUID(), projectId, name, parentCategoryId }; paths.set(full, row); snapshot.categories.push(row); }
			parentCategoryId = row.id;
		}
		return parentCategoryId;
	};
	for (const record of json(entries, 'categories.json', [])) category(record.fullPath || record.name);
	for (const record of json(entries, 'participants.json', [])) {
		const row = { ...record, id: record.id || crypto.randomUUID(), projectId, categoryId: category(record.fullPath || record.category), category: String(record.fullPath || record.category || '').split('.').pop() };
		if (record.participantImage) {
			const path = `Thumbnails/${record.participantImage}.png`;
			if (entries.has(path)) { const audio = await serializeAudio({ blob: new Blob([entries.get(path)], { type: 'image/png' }) }, path); row.thumbnail = { dataUrl: audio.base64, mimeType: 'image/png', size: audio.size }; }
		}
		snapshot.participants.push(row);
	}
	for (const table of ['decorators', 'conditions']) for (const row of json(entries, `${table}.json`, [])) snapshot[table].push({ ...row, id: row.id || crypto.randomUUID(), projectId, properties: row.properties || [] });
}
async function legacyDialogue(entries, snapshot) {
	const metadata = json(entries, 'dialogueData.json'), id = metadata.dialogueGuid || metadata.id;
	if (!id) fail('INVALID_ID', 'Legacy dialogue has no identity.');
	const dialogue = { ...metadata, id, projectId: snapshot.project.id, name: metadata.dialogueName || metadata.name, createdAt: metadata.createdAt, modifiedAt: metadata.modifiedOnDate || metadata.modifiedAt };
	snapshot.dialogues.push(dialogue);
	const exportedRows = json(entries, 'dialogueRows.json', []);
	for (const node of json(entries, 'nodes.json')) {
		node.dialogueId = id; node.data ||= {};
		if (node.data.participant && !node.data.participantId) node.data.participantId = uniqueByName(snapshot.participants, node.data.participant.name || node.data.participant, `nodes.${node.id}.participant`);
		for (const instance of node.data.decorators || []) if (!snapshot.decorators.some((definition) => definition.id === instance.id)) instance.id = uniqueByName(snapshot.decorators, instance.name, `nodes.${node.id}.decorators`);
		for (const row of node.data.dialogueRows || []) {
			row.id ||= crypto.randomUUID();
			const files = [...entries.keys()].filter((path) => path.startsWith(`audio/${row.id}/`) && path.split('/').length === 3);
			if (files.length > 1) fail('AMBIGUOUS_MEDIA', 'Multiple audio files claim the same legacy row.', row.id);
			if (files.length) row.audioFile = await serializeAudio({ name: files[0].split('/').pop(), blob: new Blob([entries.get(files[0])]) }, files[0]);
			else if (exportedRows.some((entry) => entry.id === row.id && entry.audioPath)) fail('MISSING_MEDIA', 'Legacy row refers to absent audio.', row.id);
		}
		snapshot.nodes.push(node);
	}
	snapshot.edges.push(...json(entries, 'edges.json').map((edge) => ({ ...edge, dialogueId: id })));
	snapshot.localizedStrings.push(...parseImportedStringTableData(json(entries, 'stringTable.json', null)).map((row) => ({ ...row, projectId: snapshot.project.id, dialogueId: id })));
}

export async function parseProjectArchive(input) {
	const budget = { entries: 0, expanded: 0 }, entries = await extract(input, budget);
	let parsed;
	if (entries.has('manifest.json')) parsed = await parseVersioned(entries, json(entries, 'manifest.json'));
	else {
		const metadata = json(entries, 'projectData.json', null), project = metadata ? { ...metadata, id: metadata.projectGuid || metadata.id || crypto.randomUUID(), name: metadata.projectName || metadata.name, description: metadata.projectDescription || metadata.description || '' } : { id: crypto.randomUUID(), name: 'Imported dialogue' };
		const snapshot = empty(project); await legacySupport(entries, snapshot);
		if (metadata) {
			const children = [...entries].filter(([path]) => path.startsWith('dialogues/') && path.endsWith('.mnteadlg'));
			if (children.length > ARCHIVE_LIMITS.dialogues) fail('ARCHIVE_DIALOGUE_LIMIT', 'Archive has too many dialogues.');
			for (const [, bytes] of children) { const child = await extract(bytes, budget); await legacyDialogue(child, snapshot); }
		} else await legacyDialogue(entries, snapshot);
		parsed = { snapshot: remapProjectIdentities(snapshot, { projectId: project.id, preserveEntityIds: true }).snapshot, kind: metadata ? 'project' : 'dialogue', dialogueId: snapshot.dialogues[0]?.id };
	}
	if (parsed.snapshot.dialogues.length > ARCHIVE_LIMITS.dialogues) fail('ARCHIVE_DIALOGUE_LIMIT', 'Archive has too many dialogues.');
	parsed.snapshot = requireValidProject(await canonicalizeProject(parsed.snapshot));
	return { ...parsed, diagnostics: [], expandedBytes: budget.expanded };
}

/** Pure preparation with respect to authoring data; only commitPreparedProject writes. */
export async function prepareArchiveImport(input, { context: suppliedContext, mode = 'copy', projectId, dialogueId, isExample } = {}) {
	const context = suppliedContext || await getRepositoryContext();
	if (!['copy', 'replace'].includes(mode)) fail('INVALID_IMPORT_MODE', 'Choose copy or explicit replacement.');
	const destination = projectId ? await readProjectState(projectId, context) : null;
	const parsed = await parseProjectArchive(input); context.assertCurrent();
	let snapshot, importedRootId, expectedSequence = 0, operation = 'create';
	if (parsed.kind === 'dialogue') {
		if (!destination?.snapshot.project) fail('PROJECT_NOT_FOUND', 'Choose a destination project for this dialogue.');
		if (mode === 'replace' && (!dialogueId || !destination.snapshot.dialogues.some((row) => row.id === dialogueId))) fail('INVALID_REPLACEMENT_TARGET', 'Explicit replacement requires a dialogue in the destination project.');
		const replacements = mode === 'replace' ? new Map([[parsed.dialogueId, dialogueId]]) : new Map();
		const imported = remapProjectIdentities(parsed.snapshot, { projectId, dialogueIds: replacements, existingDialogues: destination.snapshot.dialogues.filter((row) => row.id !== dialogueId) });
		importedRootId = imported.maps.dialogues.get(parsed.dialogueId);
		snapshot = structuredClone(destination.snapshot);
		for (const table of RECORD_TABLES) {
			if (mode === 'replace' && ['dialogues', 'nodes', 'edges', 'localizedStrings'].includes(table)) snapshot[table] = snapshot[table].filter((row) => (table === 'dialogues' ? row.id : row.dialogueId) !== dialogueId);
			snapshot[table].push(...imported.snapshot[table]);
		}
		expectedSequence = destination.sequence; operation = 'update';
	} else if (mode === 'replace') {
		if (!destination?.snapshot.project) fail('INVALID_REPLACEMENT_TARGET', 'Explicit replacement requires an existing destination project.');
		snapshot = remapProjectIdentities(parsed.snapshot, { projectId }).snapshot;
		expectedSequence = destination.sequence; operation = 'update';
	} else snapshot = remapProjectIdentities(parsed.snapshot).snapshot;
	if (isExample !== undefined) snapshot.project.isExample = Boolean(isExample);
	const prepared = await prepareProjectCommit(snapshot, { context, expectedSequence, operation });
	return { prepared, diagnostics: parsed.diagnostics, projectId: snapshot.project.id, firstDialogueId: importedRootId || snapshot.dialogues[0]?.id };
}
