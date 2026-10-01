import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness';

test.beforeEach(async ({ page }) => { await openModuleHarness(page); });

test('canonical backup preserves colliding names, unused definitions, extension fields and exact binary bytes', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { exportProjectArchive, parseProjectArchive } = await import('/src/lib/persistence/projectArchive.js');
		const { canonicalizeProject, START_NODE_ID } = await import('/src/lib/persistence/canonicalProject.js');
		const snapshot = { project: { id: 'p', name: 'Backup', metadata: { nested: ['preserved'] } }, dialogues: ['d1', 'd2'].map((id) => ({ id, projectId: 'p', name: 'A B', localizationSlug: id, viewport: { x: 3, y: 4, zoom: 2 } })), nodes: ['d1', 'd2'].map((dialogueId) => ({ id: START_NODE_ID, dialogueId, type: 'startNode', data: {} })), decorators: [{ id: 'unused', projectId: 'p', name: 'Unused', properties: [{ name: 'flag', type: 'boolean', defaultValue: false }] }] };
		const { prepareLocalizedNodesAndEntries } = await import('/src/lib/localization/stringTable.js');
		snapshot.localizedStrings = [];
		for (const dialogue of snapshot.dialogues) { const prepared = prepareLocalizedNodesAndEntries({ projectId: 'p', dialogueId: dialogue.id, dialogueSlug: dialogue.localizationSlug, nodes: snapshot.nodes.filter((node) => node.dialogueId === dialogue.id).map((node) => ({ ...node, data: { displayName: 'Start' } })), locale: 'en', existingEntries: [] }); snapshot.nodes = snapshot.nodes.filter((node) => node.dialogueId !== dialogue.id).concat(prepared.nodes); snapshot.localizedStrings.push(...prepared.entries); }
		const expected = await canonicalizeProject(snapshot), actual = await parseProjectArchive(await exportProjectArchive(snapshot));
		return { same: JSON.stringify(expected) === JSON.stringify(actual.snapshot), dialogues: actual.snapshot.dialogues.length, properties: actual.snapshot.decorators[0].properties };
	});
	expect(result).toEqual({ same: true, dialogues: 2, properties: [{ name: 'flag', type: 'boolean', defaultValue: false }] });
});

test('parsing failed nested legacy archives performs no writes and checks original unsafe paths', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const JSZip = (await import('/node_modules/.vite/deps/jszip.js')).default;
		const { parseProjectArchive } = await import('/src/lib/persistence/projectArchive.js');
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const context = await getRepositoryContext(); await context.db.projects.add({ id: 'keep', name: 'Keep' });
		const bad = new JSZip(); bad.file('projectData.json', JSON.stringify({ projectGuid: 'keep', projectName: 'Replacement' })); bad.file('dialogues/bad.mnteadlg', 'broken');
		const unsafe = new JSZip(); unsafe.file('../projectData.json', '{}');
		const failures = [];
		for (const zip of [bad, unsafe]) try { await parseProjectArchive(new Blob([await zip.generateAsync({ type: 'uint8array' })])); } catch (error) { failures.push(error.code); }
		return { failures, name: (await context.db.projects.get('keep')).name, revisions: await context.db.projectRevisions.count() };
	});
	expect(result).toEqual({ failures: ['INVALID_ARCHIVE', 'UNSAFE_ARCHIVE_PATH'], name: 'Keep', revisions: 0 });
});

test('serialized mutations retain concurrent independent updates and recover after rejected work', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { prepareProjectCommit, commitPreparedProject, mutateProject, readProjectState } = await import('/src/lib/persistence/projectRepository.js');
		await commitPreparedProject(await prepareProjectCommit({ project: { id: 'p', name: 'Original' } }, { expectedSequence: 0, operation: 'create' }));
		let release; const gate = new Promise((resolve) => { release = resolve; });
		const first = mutateProject('p', { transform: async (snapshot) => { await gate; snapshot.project.name = 'First'; } });
		const second = mutateProject('p', { transform: (snapshot) => { snapshot.project.description = snapshot.project.name; } });
		release(); await Promise.all([first, second]);
		await mutateProject('p', { transform: () => { throw new Error('Rejected edit'); } }).catch(() => {});
		await mutateProject('p', { transform: (snapshot) => { snapshot.project.custom = true; } });
		const state = await readProjectState('p'); return { project: state.snapshot.project, sequence: state.sequence };
	});
	expect(result.project).toMatchObject({ name: 'First', description: 'First', custom: true }); expect(result.sequence).toBe(4);
});

test('complete binary backup and clone remap forward return, child graphs, definitions and every locale', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { completeProjectFixture } = await import('/tests/e2e/helpers/projectFixtures.js');
		const { exportProjectArchive, parseProjectArchive, prepareArchiveImport } = await import('/src/lib/persistence/projectArchive.js');
		const { canonicalizeProject, decodeMediaBase64 } = await import('/src/lib/persistence/canonicalProject.js');
		const { remapProjectIdentities } = await import('/src/lib/persistence/projectRemap.js');
		const { commitPreparedProject, prepareProjectCommit } = await import('/src/lib/persistence/projectRepository.js');
		const input = completeProjectFixture('binary');
		for (const node of input.nodes) { if (!node.data.displayNameKey) node.data.displayName = node.type; if (node.type === 'leadNode') node.data.selectionTitle = 'Choose'; }
		input.nodes.unshift({ id: 'return', dialogueId: input.dialogues[0].id, type: 'returnNode', data: { displayName: 'Return', targetNode: 'LINE' } });
		input.participants[0].thumbnail = { dataUrl: 'data:image/png;base64,AAH//w==', mimeType: 'image/png', size: 4, custom: 'retained' };
		const normalized = remapProjectIdentities(input, { projectId: input.project.id, preserveEntityIds: true }).snapshot;
		const expected = await canonicalizeProject(normalized), blob = await exportProjectArchive(expected), actual = (await parseProjectArchive(blob)).snapshot;
		await commitPreparedProject(await prepareProjectCommit({ project: { id: 'destination', name: 'Target' } }, { expectedSequence: 0, operation: 'create' }));
		const dialogueBlob = await exportProjectArchive(actual, { kind: 'dialogue', dialogueId: input.dialogues[0].id });
		const imported = await prepareArchiveImport(dialogueBlob, { projectId: 'destination' });
		await commitPreparedProject(imported.prepared);
		const copy = imported.prepared.revision.snapshot, line = copy.nodes.find((node) => node.type === 'leadNode'), child = copy.nodes.find((node) => node.type === 'openChildGraphNode');
		return { equal: JSON.stringify(expected) === JSON.stringify(actual), root: imported.firstDialogueId === line.dialogueId, return: copy.nodes.find((node) => node.type === 'returnNode').data.targetNode === line.id, child: copy.dialogues.some((dialogue) => dialogue.id === child.data.targetDialogue), bytes: [...decodeMediaBase64(line.data.dialogueRows[0].audioFile.base64)], thumbnail: copy.participants[0].thumbnail, locales: copy.localizedStrings.find((entry) => entry.rowId === line.data.dialogueRows[0].id).values, effect: line.data.decorators[0].id === copy.decorators.find((row) => row.name === 'Effect').id, condition: copy.edges[0].data.conditions.rules[0].id === copy.conditions[0].id, unused: copy.decorators.find((row) => row.name === 'Unused').properties[0].defaultValue };
	});
	expect(result).toEqual({ equal: true, root: true, return: true, child: true, bytes: [0, 1, 127, 255], thumbnail: { base64: 'data:image/png;base64,AAH//w==', mimeType: 'image/png', size: 4, custom: 'retained' }, locales: { en: 'Hello', cs: 'Ahoj' }, effect: true, condition: true, unused: false });
});

test('explicit replacement removes obsolete graph records, preserves unrelated dialogues and rolls back storage failure', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		const { prepareProjectCommit, commitPreparedProject, readProjectState, mutateProject } = await import('/src/lib/persistence/projectRepository.js');
		const { exportProjectArchive, prepareArchiveImport } = await import('/src/lib/persistence/projectArchive.js');
		const { START_NODE_ID } = await import('/src/lib/persistence/canonicalProject.js');
		const context = await getRepositoryContext();
		await commitPreparedProject(await prepareProjectCommit({ project: { id: 'p', name: 'P' } }, { expectedSequence: 0, operation: 'create' }));
		for (const name of ['Keep', 'Replace']) { const dialogue = await useDialogueStore.getState().createDialogue({ projectId: 'p', name }); await useDialogueStore.getState().saveDialogueGraph(dialogue.id, [{ id: START_NODE_ID, type: 'startNode', data: { displayName: 'Start' } }], []); }
		const original = await readProjectState('p'), [keep, target] = original.snapshot.dialogues;
		const source = structuredClone(original.snapshot); source.dialogues = [target]; source.nodes = source.nodes.filter((row) => row.dialogueId === target.id); source.localizedStrings = source.localizedStrings.filter((row) => row.dialogueId === target.id);
		const file = await exportProjectArchive(source, { kind: 'dialogue', dialogueId: target.id });
		await useDialogueStore.getState().saveDialogueGraph(target.id, [...source.nodes, { id: 'obsolete', type: 'leadNode', data: { displayName: 'Old', selectionTitle: 'Old choice', dialogueRows: [{ id: 'old-row', text: 'Gone' }] } }], []);
		const before = await readProjectState('p'), failedImport = await prepareArchiveImport(file, { context, projectId: 'p', dialogueId: target.id, mode: 'replace' });
		const failure = () => { throw new Error('Injected revision failure'); }; context.db.projectRevisions.hook('creating', failure);
		let rolledBack; try { await commitPreparedProject(failedImport.prepared); } catch { rolledBack = JSON.stringify((await readProjectState('p')).snapshot) === JSON.stringify(before.snapshot); }
		context.db.projectRevisions.hook('creating').unsubscribe(failure);
		const prepared = await prepareArchiveImport(file, { context, projectId: 'p', dialogueId: target.id, mode: 'replace' }); await commitPreparedProject(prepared.prepared);
		const after = await readProjectState('p'), stale = await prepareArchiveImport(file, { context, projectId: 'p', dialogueId: target.id, mode: 'replace' }); await mutateProject('p', { transform: (snapshot) => { snapshot.project.description = 'Interleaved edit'; } });
		let staleCode; try { await commitPreparedProject(stale.prepared); } catch (error) { staleCode = error.code; }
		return { rolledBack, staleCode, root: prepared.firstDialogueId === target.id, keep: JSON.stringify(after.snapshot.dialogues.find((row) => row.id === keep.id)) === JSON.stringify(keep), obsolete: after.snapshot.nodes.some((node) => node.id === 'obsolete'), obsoleteStrings: after.snapshot.localizedStrings.some((row) => row.rowId === 'old-row'), dialogueCount: after.snapshot.dialogues.length };
	});
	expect(result).toEqual({ rolledBack: true, staleCode: 'STALE_PROJECT', root: true, keep: true, obsolete: false, obsoleteStrings: false, dialogueCount: 2 });
});

test('ZIP readers and writers enforce entry, JSON, compressed and actual cumulative expanded limits', async ({ page }) => {
	test.setTimeout(90000);
	const result = await page.evaluate(async () => {
		const JSZip = (await import('/node_modules/.vite/deps/jszip.js')).default;
		const { readBoundedArchive, exportProjectArchive, ARCHIVE_LIMITS } = await import('/src/lib/persistence/projectArchive.js');
		const errors = [];
		const attempt = async (work) => { try { await work(); errors.push('accepted'); } catch (error) { errors.push(error.code); } };
		await attempt(() => readBoundedArchive(new Uint8Array(ARCHIVE_LIMITS.compressed + 1)));
		const many = new JSZip(); for (let i = 0; i < 1001; i++) many.file(`entry${i}`, '');
		await attempt(async () => readBoundedArchive(await many.generateAsync({ type: 'uint8array' })));
		const json = new JSZip(); json.file('large.json', ' '.repeat(ARCHIVE_LIMITS.json + 1));
		await attempt(async () => readBoundedArchive(await json.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })));
		const chunk = new JSZip(); chunk.file('binary', new Uint8Array(2 * 1024 * 1024)); const compressed = await chunk.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
		await attempt(() => readBoundedArchive(compressed, { entries: 0, expanded: ARCHIVE_LIMITS.expanded - 1024 }));
		await attempt(() => exportProjectArchive({ project: { id: 'p', name: 'Large', extra: ' '.repeat(ARCHIVE_LIMITS.json) } }));
		await attempt(() => exportProjectArchive({ project: { id: 'p', name: 'Many' }, categories: Array.from({ length: 1000 }, (_, i) => ({ id: `c${i}`, projectId: 'p', name: `C${i}` })) }));
		return errors;
	});
	expect(result).toEqual(['ARCHIVE_COMPRESSED_LIMIT', 'ARCHIVE_ENTRY_LIMIT', 'ARCHIVE_EXPANSION_LIMIT', 'ARCHIVE_EXPANSION_LIMIT', 'ARCHIVE_JSON_LIMIT', 'ARCHIVE_EXPANSION_LIMIT']);
});

test('bundled historical project remains readable with all nested graphs and audio', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { parseProjectArchive } = await import('/src/lib/persistence/projectArchive.js');
		const file = await (await fetch('/ExampleProject/OnboardingExample.mnteadlgproj')).blob();
		const parsed = await parseProjectArchive(file);
		return { name: parsed.snapshot.project.name, dialogues: parsed.snapshot.dialogues.length, audio: parsed.snapshot.nodes.flatMap((node) => node.data?.dialogueRows || []).filter((row) => row.audioFile?.base64).length };
	});
	expect(result.name).toBe('OnboardingExample'); expect(result.dialogues).toBe(2); expect(result.audio).toBeGreaterThan(10);
});

test('ZIP duplicate central names, path aliases and Unicode overrides are rejected before extraction', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const JSZip = (await import('/node_modules/.vite/deps/jszip.js')).default;
		const { readBoundedArchive } = await import('/src/lib/persistence/projectArchive.js');
		const failures = [], inspect = async (zip, mutate) => { let bytes = await zip.generateAsync({ type: 'uint8array' }); if (mutate) bytes = mutate(bytes); try { await readBoundedArchive(bytes); failures.push('accepted'); } catch (error) { failures.push(error.code); } };
		const duplicate = new JSZip(); duplicate.file('first', 'a'); duplicate.file('other', 'b');
		await inspect(duplicate, (bytes) => { for (let i = 0; i < bytes.length - 5; i++) if (new TextDecoder().decode(bytes.subarray(i, i + 5)) === 'other') bytes.set(new TextEncoder().encode('first'), i); return bytes; });
		const localMismatch = new JSZip(); localMismatch.file('first', 'a'); localMismatch.file('other', 'b');
		await inspect(localMismatch, (bytes) => { const view = new DataView(bytes.buffer); for (let i = 0; i < bytes.length - 35; i++) if (view.getUint32(i, true) === 0x04034b50 && new TextDecoder().decode(bytes.subarray(i + 30, i + 35)) === 'other') bytes.set(new TextEncoder().encode('first'), i + 30); return bytes; });
		const alias = new JSZip(); alias.file('a//b', 'x'); await inspect(alias);
		const unicode = new JSZip(); unicode.file('ééé', 'x');
		await inspect(unicode, (bytes) => { const view = new DataView(bytes.buffer); for (let i = 0; i < bytes.length - 15; i++) if (view.getUint16(i, true) === 0x7075 && view.getUint16(i + 2, true) === 11) bytes.set(new TextEncoder().encode('../bad'), i + 9); return bytes; });
		return failures;
	});
	expect(result).toEqual(['DUPLICATE_ARCHIVE_PATH', 'UNSUPPORTED_ARCHIVE_PATH', 'UNSAFE_ARCHIVE_PATH', 'UNSAFE_ARCHIVE_PATH']);
});

test('nested archives share the actual 128 MiB streaming expansion budget', async ({ page }) => {
	test.setTimeout(90000);
	const code = await page.evaluate(async () => {
		const JSZip = (await import('/node_modules/.vite/deps/jszip.js')).default;
		const { parseProjectArchive } = await import('/src/lib/persistence/projectArchive.js');
		const outer = new JSZip(); outer.file('projectData.json', JSON.stringify({ projectGuid: 'p', projectName: 'Nested bomb' }));
		for (let index = 0; index < 2; index++) {
			const child = new JSZip(); child.file('dialogueData.json', JSON.stringify({ dialogueGuid: `d${index}`, dialogueName: `D${index}` })); child.file('nodes.json', JSON.stringify([{ id: '00000000-0000-0000-0000-000000000001', type: 'startNode', data: { displayName: 'Start' } }])); child.file('edges.json', '[]'); child.file('huge.bin', new Uint8Array(65 * 1024 * 1024));
			outer.file(`dialogues/d${index}.mnteadlg`, await child.generateAsync({ type: 'uint8array', compression: 'DEFLATE' }));
		}
		try { await parseProjectArchive(new Blob([await outer.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })])); return 'accepted'; } catch (error) { return error.code; }
	});
	expect(code).toBe('ARCHIVE_EXPANSION_LIMIT');
});


test('canonical boundaries diagnose malformed records and unrecoverable thumbnail bytes', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { canonicalizeProject } = await import('/src/lib/persistence/canonicalProject.js');
		const failures = [];
		for (const fields of [{ nodes: [null] }, { nodes: [{ data: 'bad' }] }, { nodes: [{ data: { dialogueRows: {} } }] }, { edges: [{ data: { conditions: { rules: {} } } }] }, ...['blob:expired', { base64: 'invalid' }, { url: 'blob:expired' }].map((thumbnail) => ({ participants: [{ id: 'actor', thumbnail }] }))]) {
			try { await canonicalizeProject({ project: { id: 'p', name: 'P', note: 'blob:legitimate text' }, ...fields }); } catch (error) { failures.push({ code: error.code, path: error.diagnostics[0]?.path }); }
		}
		return failures;
	});
	expect(result).toEqual([{ code: 'INVALID_RECORD', path: 'nodes[0]' }, { code: 'INVALID_RECORD', path: 'nodes[0].data' }, { code: 'INVALID_TABLE', path: 'nodes[0].data.dialogueRows' }, { code: 'INVALID_TABLE', path: 'edges[0].data.conditions.rules' }, { code: 'MISSING_MEDIA', path: 'participants.actor.thumbnail' }, { code: 'INVALID_MEDIA', path: 'participants.actor.thumbnail' }, { code: 'MISSING_MEDIA', path: 'participants.actor.thumbnail' }]);
});

test('mounted archive import requires an explicit replacement choice and names its target', async ({ page }) => {
	await page.evaluate(async () => {
		const React = (await import('/node_modules/.vite/deps/react.js')).default, { createRoot } = (await import('/node_modules/.vite/deps/react-dom_client.js')).default;
		const { ArchiveImportDialog } = await import('/src/components/projects/ArchiveImportDialog.jsx');
		createRoot(document.getElementById('root')).render(React.createElement(ArchiveImportDialog, { file: { name: 'project.mnteadlgproj' }, kind: 'project', targets: [{ id: 'target-a', name: 'First' }, { id: 'target-b', name: 'Second' }], onClose: () => {}, onImport: async (options) => { window.importChoice = options; } }));
	});
	await expect(page.getByRole('radio', { name: 'Import as a new copy' })).toBeChecked();
	await page.getByRole('radio', { name: 'Replace an existing item' }).check();
	await page.getByRole('combobox', { name: 'Item to replace' }).selectOption('target-b');
	await page.getByRole('button', { name: 'Replace selected item' }).click();
	expect(await page.evaluate(() => window.importChoice)).toEqual({ mode: 'replace', projectId: 'target-b' });
});


test('streamed extraction rejects corrupted stored bytes after enforcing size budgets', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const JSZip = (await import('/node_modules/.vite/deps/jszip.js')).default;
		const { readBoundedArchive } = await import('/src/lib/persistence/projectArchive.js');
		const zip = new JSZip(); zip.file('media/audio', new Uint8Array([0, 1, 127, 255]), { createFolders: false });
		const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'STORE' }), view = new DataView(bytes.buffer);
		bytes[30 + view.getUint16(26, true) + view.getUint16(28, true)] ^= 255;
		try { await readBoundedArchive(bytes); return 'accepted'; } catch (error) { return error.code; }
	});
	expect(result).toBe('ARCHIVE_CHECKSUM_MISMATCH');
});
