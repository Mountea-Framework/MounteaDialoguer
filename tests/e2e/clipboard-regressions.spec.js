import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness';

test.beforeEach(async ({ page }) => openModuleHarness(page));

test('clipboard keeps condition behavior, bytes, timing and isolated authored values', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { captureDialogueClipboard, pasteDialogueClipboard } = await import('/src/lib/dialogueClipboard.js');
		let next = 0;
		const nodes = ['a', 'b'].map((id) => ({ id, type: 'leadNode', selected: true, position: { x: 0, y: 100 }, data: { callback: () => {}, displayName: id, displayNameKey: 'old-key', dialogueRows: [{ id: `row-${id}`, text: id, textKey: 'old-row', executionBehaviour: 'awaitInput', durationMode: 'add', durationOverride: 2, audioFile: { blob: new Blob([new Uint8Array([1, 2, 3])]), url: 'blob:temporary' } }] } }));
		const edge = { id: 'e', source: 'a', target: 'b', selected: true, data: { onOpenDetails: () => {}, conditions: { mode: 'any', rules: [{ id: 'gate', name: 'Gate', negate: true, values: { flag: false, count: 0, blank: '' } }] } } };
		const clipboard = captureDialogueClipboard({ projectId: 'p', dialogueId: 'd', nodes, edges: [edge] });
		const destination = { projectId: 'p', dialogueId: 'd', nodes, conditions: [{ id: 'gate', projectId: 'p' }], createId: () => `new-${++next}` };
		const pasted = pasteDialogueClipboard(clipboard, destination);
		const before = structuredClone(pasted.edges[0].data.conditions);
		pasted.edges[0].data.conditions.rules[0].values.count = 9;
		const later = pasteDialogueClipboard(clipboard, destination);
		return { before, later: later.edges[0].data.conditions, original: edge.data.conditions, cleared: pasted.cleared,
			type: pasted.edges[0].type, callback: 'callback' in pasted.nodes[0].data, edgeCallback: 'onOpenDetails' in pasted.edges[0].data,
			row: { ...pasted.nodes[0].data.dialogueRows[0], audioFile: undefined },
			bytes: Array.from(new Uint8Array(await pasted.nodes[0].data.dialogueRows[0].audioFile.blob.arrayBuffer())),
			url: pasted.nodes[0].data.dialogueRows[0].audioFile.url, oldKey: pasted.nodes[0].data.displayNameKey,
			ids: pasted.nodes.map((node) => node.id), clipboardIds: clipboard.nodes.map((node) => node.id) };
	});
	expect(result.before).toEqual(result.original); expect(result.later).toEqual(result.original);
	expect(result.before).toMatchObject({ mode: 'any', rules: [{ negate: true, values: { flag: false, count: 0, blank: '' } }] });
	expect(Object.values(result.cleared).every((count) => count === 0)).toBe(true);
	expect(result).toMatchObject({ type: 'conditionEdge', callback: false, edgeCallback: false, bytes: [1, 2, 3], clipboardIds: ['a', 'b'] });
	expect(result.row).toMatchObject({ executionBehaviour: 'awaitInput', durationMode: 'add', durationOverride: 2 });
	expect(result.row.textKey).toBeUndefined(); expect(result.oldKey).toBeUndefined(); expect(result.url).toBeUndefined();
	expect(result.ids).not.toEqual(result.clipboardIds);
});

for (const destination of ['same', 'dialogue', 'project']) test(`clipboard resolves targets and speakers for ${destination} paste`, async ({ page }) => {
	const result = await page.evaluate(async (destination) => {
		const { captureDialogueClipboard, pasteDialogueClipboard } = await import('/src/lib/dialogueClipboard.js');
		let id = 0;
		const node = (id, data) => ({ id, type: 'returnNode', selected: true, position: { x: 0, y: 0 }, data });
		const nodes = [node('a', { participantId: 'speaker', participant: 'Alice', decorators: [{ id: 'dec' }], dialogueRows: [{ id: 'row', text: 'Hi', participantId: 'speaker', participant: 'Alice' }] }), node('internal', { targetNode: 'a' }), node('external', { targetNode: 'outside' }), node('start-ref', { targetNode: '00000000-0000-0000-0000-000000000001' }), node('child', { targetDialogue: 'child-dialogue' }), node('self-child', { targetDialogue: 'target' })];
		const clipboard = captureDialogueClipboard({ projectId: 'p', dialogueId: 'd', nodes, edges: [{ source: 'a', target: 'internal', data: { conditions: { mode: 'any', rules: [{ id: 'gate' }] } } }] });
		const projectId = destination === 'project' ? 'q' : 'p', dialogueId = destination === 'same' ? 'd' : 'target';
		const pasted = pasteDialogueClipboard(clipboard, { projectId, dialogueId, nodes: [{ id: 'outside' }, { id: '00000000-0000-0000-0000-000000000001' }],
			dialogues: [{ id: 'child-dialogue', projectId }, { id: 'target', projectId }], participants: [{ id: destination === 'project' ? 'different-id' : 'speaker', name: 'Alice', projectId }],
			decorators: [{ id: 'dec', projectId }], conditions: [{ id: 'gate', projectId }], createId: () => `new-${++id}` });
		return { nodes: pasted.nodes, conditions: pasted.edges[0].data.conditions, cleared: pasted.cleared };
	}, destination);
	expect(result.nodes[1].data.targetNode).toBe(result.nodes[0].id);
	expect(result.nodes[2].data.targetNode).toBe(destination === 'same' ? 'outside' : '');
	expect(result.nodes[3].data.targetNode).toBe(destination === 'same' ? '00000000-0000-0000-0000-000000000001' : '');
	expect(result.nodes[4].data.targetDialogue).toBe(destination === 'project' ? '' : 'child-dialogue');
	expect(result.nodes[5].data.targetDialogue).toBe(destination === 'same' ? 'target' : '');
	if (destination === 'project') {
		expect(result.nodes[0].data).toMatchObject({ participant: '', decorators: [], dialogueRows: [{ participant: '' }] });
		expect(result.nodes[0].data.participantId).toBeUndefined(); expect(result.nodes[0].data.dialogueRows[0].participantId).toBeUndefined();
		expect(result.conditions).toEqual({ mode: 'all', rules: [] });
		expect(result.cleared).toMatchObject({ nodeSpeakers: 1, rowSpeakers: 1, decorators: 1, conditions: 1 });
	} else expect(result.nodes[0].data.participantId).toBe('speaker');
});

test('stale same-project references clear and clipboard notices exist in every locale', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { captureDialogueClipboard, pasteDialogueClipboard } = await import('/src/lib/dialogueClipboard.js');
		const nodes = [{ id: 'a', type: 'returnNode', selected: true, position: { x: 0, y: 0 }, data: { participantId: 'gone', participant: 'Gone', targetNode: 'removed', targetDialogue: 'removed', decorators: [{ id: 'removed' }] } }];
		const clipboard = captureDialogueClipboard({ projectId: 'p', dialogueId: 'd', nodes, edges: [] });
		const pasted = pasteDialogueClipboard(clipboard, { projectId: 'p', dialogueId: 'd', createId: () => 'new' });
		const locales = await Promise.all(['en', 'cs', 'de', 'es', 'fr', 'pl'].map(async (locale) => (await import(`/src/i18n/locales/${locale}.json`)).default.editor.clipboard));
		return { cleared: pasted.cleared, locales };
	});
	expect(result.cleared).toMatchObject({ nodeSpeakers: 1, decorators: 1, returnTargets: 1, childTargets: 1 });
	for (const locale of result.locales) for (const key of ['title', 'description', ...Object.keys(result.cleared)]) expect(locale[key]).toBeTruthy();
});

test('pasted conditions and localization survive real repository save/reload and retain preview behavior', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { completeProjectFixture } = await import('/tests/e2e/helpers/projectFixtures.js');
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { prepareProjectCommit, commitPreparedProject, readProjectState } = await import('/src/lib/persistence/projectRepository.js');
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		const { captureDialogueClipboard, pasteDialogueClipboard } = await import('/src/lib/dialogueClipboard.js');
		const { evaluatePreviewEdgeConditions, getPreviewConditionRuleKey } = await import('/src/lib/dialoguePreviewEngine.js');
		const input = completeProjectFixture('clipboard-persistence'), context = await getRepositoryContext();
		input.edges[0].source = 'line'; input.edges[0].target = 'child-link';
		input.edges.push({ id: 'start-edge', dialogueId: input.dialogues[0].id, source: input.nodes[0].id, target: 'line' });
		await commitPreparedProject(await prepareProjectCommit(input, { context, expectedSequence: 0, operation: 'create' }));
		const dialogueId = input.dialogues[0].id, projectId = input.project.id;
		const graph = await useDialogueStore.getState().loadDialogueGraph(dialogueId);
		const clipboard = captureDialogueClipboard({ projectId, dialogueId, nodes: graph.nodes.map((node) => ({ ...node, selected: ['line', 'child-link'].includes(node.id) })), edges: graph.edges });
		const pasted = pasteDialogueClipboard(clipboard, { ...input, projectId, dialogueId, createId: () => crypto.randomUUID() });
		await useDialogueStore.getState().saveDialogueGraph(dialogueId, [...graph.nodes, ...pasted.nodes], [...graph.edges, ...pasted.edges], { x: 0, y: 0, zoom: 1 });
		const saved = (await useDialogueStore.getState().loadDialogueGraph(dialogueId)).edges.find((edge) => edge.id === pasted.edges[0].id);
		const snapshot = (await readProjectState(projectId)).snapshot;
		const line = snapshot.nodes.find((node) => node.id === pasted.nodes.find((node) => node.type === 'leadNode').id);
		const ruleKey = getPreviewConditionRuleKey(saved.data.conditions.rules[0]);
		return { saved: saved.data.conditions, original: graph.edges.find((edge) => edge.id === 'edge-1').data.conditions,
			blocked: !evaluatePreviewEdgeConditions(saved, { [ruleKey]: true }), allowed: evaluatePreviewEdgeConditions(saved, { [ruleKey]: false }),
			uniqueKeys: new Set(snapshot.localizedStrings.map((entry) => entry.key)).size === snapshot.localizedStrings.length,
			audio: line.data.dialogueRows[0].audioFile.base64, rowKey: line.data.dialogueRows[0].textKey };
	});
	expect(result.saved).toEqual(result.original);
	expect(result).toMatchObject({ blocked: true, allowed: true, uniqueKeys: true });
	expect(result.audio).toMatch(/^data:audio\/wav;base64,/); expect(result.rowKey).toBeTruthy();
});
