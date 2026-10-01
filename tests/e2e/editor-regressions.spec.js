import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness.js';

async function mountPreview(page, strict = false, branch = false) {
	await openModuleHarness(page);
	await page.evaluate(async ({ strict, branch }) => {
		const { default: React } = await import('/node_modules/.vite/deps/react.js');
		const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
		await import('/src/i18n/index.js');
		const { DialoguePreviewOverlay } = await import('/src/components/dialogue/DialoguePreviewOverlay.jsx');
		window.previewEvents = [];
		window.previewAudio = [];
		window.previewUrls = new Set();
		const createUrl = URL.createObjectURL.bind(URL);
		const revokeUrl = URL.revokeObjectURL.bind(URL);
		URL.createObjectURL = (blob) => { const url = createUrl(blob); window.previewUrls.add(url); return url; };
		URL.revokeObjectURL = (url) => { window.previewUrls.delete(url); revokeUrl(url); };
		window.Audio = class {
			constructor(src) { this.src = src; this.volume = 1; window.previewAudio.push(this); }
			play() { return Promise.resolve(); }
			pause() { this.paused = true; }
		};
		const start = '00000000-0000-0000-0000-000000000001';
		const audioFile = { blob: new Blob([new Uint8Array([0, 1, 2])], { type: 'audio/wav' }) };
		const nodes = [
			{ id: start, type: 'startNode', data: {} },
			{ id: 'first', type: 'leadNode', data: { dialogueRows: [{ text: 'First preview row', duration: 1.5, audioFile }] } },
			{ id: 'second', type: 'completeNode', data: { dialogueRows: [{ text: 'Second preview row', duration: 1.5, audioFile }] } },
		];
		const edges = [{ id: 'a', source: start, target: 'first' }, { id: 'b', source: 'first', target: 'second' }];
		if (branch) {
			nodes.push({ id: 'child', type: 'openChildGraphNode', data: { targetDialogue: 'child-dialogue', selectionTitle: 'Visit child graph' } });
			edges.push({ id: 'c', source: 'first', target: 'child' });
		}
		function Preview() {
			const [open, setOpen] = React.useState(true);
			window.reopenPreview = () => setOpen(true);
			return React.createElement(DialoguePreviewOverlay, {
				open, nodes, edges, rootDialogueId: 'root',
				loadDialogueGraphForPreview: async () => ({ nodes: [{ id: start, type: 'startNode', data: {} }, { id: 'child-row', type: 'completeNode', data: { dialogueRows: [{ text: 'Child preview row', duration: 1.5, audioFile }] } }], edges: [{ id: 'child-edge', source: start, target: 'child-row' }] }),
				onNodeChange: (ref) => window.previewEvents.push(ref?.nodeId || 'closed'),
				onStop: () => setOpen(false),
			});
		}
		window.previewRoot = createRoot(document.getElementById('root'));
		window.previewRoot.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Preview)) : React.createElement(Preview));
	}, { strict, branch });
}

for (const strict of [false, true]) {
	test(`ISS-043 volume changes preserve preview progression${strict ? ' in StrictMode' : ''}`, async ({ page }) => {
		await mountPreview(page, strict);
		await expect(page.getByText('First preview row', { exact: true })).toBeVisible();
		const volume = page.locator('input[type="range"]');
		await volume.fill('0');
		await expect.poll(() => page.evaluate(() => window.previewAudio.at(-1).volume)).toBe(0);
		await volume.fill('35');
		await expect.poll(() => page.evaluate(() => window.previewAudio.at(-1).volume)).toBe(0.35);
		await expect(page.getByText('Second preview row', { exact: true })).toBeVisible({ timeout: 5000 });
		await expect.poll(() => page.evaluate(() => window.previewAudio.at(-1).volume)).toBe(0.35);
		await expect.poll(() => page.evaluate(() => window.previewEvents.includes('closed'))).toBe(true);
		await expect.poll(() => page.evaluate(() => window.previewUrls.size)).toBe(0);
		await page.evaluate(() => window.reopenPreview());
		await expect(page.getByText('First preview row', { exact: true })).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByText('First preview row', { exact: true })).not.toBeVisible();
		await expect.poll(() => page.evaluate(() => window.previewUrls.size)).toBe(0);
	});
}

test('ISS-043 volume survives branch selection and child-graph transitions', async ({ page }) => {
	await mountPreview(page, true, true);
	await expect(page.getByText('First preview row', { exact: true })).toBeVisible();
	await page.locator('input[type="range"]').fill('25');
	await page.getByRole('button', { name: /Visit child graph/ }).click();
	await expect(page.getByText('Child preview row', { exact: true })).toBeVisible();
	await expect.poll(() => page.evaluate(() => window.previewAudio.at(-1).volume)).toBe(0.25);
	await expect.poll(() => page.evaluate(() => window.previewEvents.includes('closed'))).toBe(true);
	await expect.poll(() => page.evaluate(() => window.previewUrls.size)).toBe(0);
});

test('ISS-028/029 history isolates snapshots, retains bytes and false/zero defaults, caps and branches', async ({ page }) => {
	await openModuleHarness(page);
	const result = await page.evaluate(async () => {
		const { createEditorDraft, editorDraftReducer: reduce, createDecoratorInstance } = await import('/src/lib/editorDraft.js');
		const nodes = [{ id: 'n', type: 'leadNode', selected: true, data: { custom: { value: 1 }, callback: () => {}, dialogueRows: [{ audioFile: { blob: new Blob([new Uint8Array([1, 2, 3])]), url: 'blob:transient' } }] } }];
		let state = createEditorDraft(nodes, []);
		nodes[0].data.custom.value = 9;
		state = reduce(state, { type: 'checkpoint', nodes, edges: [] });
		state = reduce(state, { type: 'undo' });
		const undo = state.nodes[0];
		const bytes = Array.from(new Uint8Array(await undo.data.dialogueRows[0].audioFile.blob.arrayBuffer()));
		state = reduce(state, { type: 'redo' });
		const redone = state.nodes[0].data.custom.value;
		state.nodes[0].data.custom.value = 40;
		const isolated = state.history[state.historyIndex].nodes[0].data.custom.value;
		for (let i = 0; i < 60; i++) state = reduce(state, { type: 'checkpoint', nodes: [{ id: 'n', data: { value: i } }], edges: [] });
		const capped = state.history.length;
		state = reduce(state, { type: 'undo' });
		state = reduce(state, { type: 'nodeData', id: 'n', data: { value: 'branch' } });
		state = reduce(state, { type: 'redo' });
		return { bytes, undone: undo.data.custom.value, callback: 'callback' in undo.data, url: 'url' in undo.data.dialogueRows[0].audioFile, selected: 'selected' in undo, redone, isolated, capped, branch: state.nodes[0].data.value, defaults: createDecoratorInstance({ id: 'd', properties: [{ name: 'zero', defaultValue: 0 }, { name: 'false', defaultValue: false }, { name: 'blank' }] }).values };
	});
	expect(result).toEqual({ bytes: [1, 2, 3], undone: 1, callback: false, url: false, selected: false, redone: 9, isolated: 9, capped: 50, branch: 'branch', defaults: { zero: 0, false: false, blank: '' } });
});

test('ISS-030 mounted StrictMode draft updates once and an old save cannot clear newer edits', async ({ page }) => {
	await openModuleHarness(page);
	await page.evaluate(async () => {
		const { default: React } = await import('/node_modules/.vite/deps/react.js');
		const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
		const { useEditorDraft } = await import('/src/hooks/useEditorDraft.js');
		function Draft() { window.draft = useEditorDraft([{ id: 'node', data: { value: 0 } }], []); return null; }
		createRoot(document.getElementById('root')).render(React.createElement(React.StrictMode, null, React.createElement(Draft)));
	});
	await expect.poll(() => page.evaluate(() => Boolean(window.draft))).toBe(true);
	await page.evaluate(() => {
		window.updateCalls = 0;
		window.draft.setNodes((nodes) => { window.updateCalls++; window.draft.markUnsaved(); return nodes.map((node) => ({ ...node, data: { value: 1 } })); });
		window.ticket = window.draft.captureSave();
		window.draft.updateNodeData('node', { value: 2 });
		window.oldSaveClean = window.draft.acknowledgeSave(window.ticket);
	});
	await expect.poll(() => page.evaluate(() => ({ calls: window.updateCalls, oldClean: window.oldSaveClean, value: window.draft.nodes[0].data.value, dirty: window.draft.hasUnsavedChanges }))).toEqual({ calls: 1, oldClean: false, value: 2, dirty: true });
	await page.evaluate(() => { window.draft.acknowledgeSave(window.draft.captureSave()); });
	await expect.poll(() => page.evaluate(() => window.draft.hasUnsavedChanges)).toBe(false);
	await page.evaluate(() => {
		const old = window.draft.captureSave();
		window.draft.resetDraft([{ id: 'new', data: {} }], []);
		window.draft.updateNodeData('new', { value: 3 });
		window.wrongGenerationClean = window.draft.acknowledgeSave(old);
	});
	await expect.poll(() => page.evaluate(() => ({ clean: window.wrongGenerationClean, dirty: window.draft.hasUnsavedChanges }))).toEqual({ clean: false, dirty: true });
});

test('ISS-039 restoration allocates no URLs; row playback owns replacement/removal/unmount cleanup', async ({ page }) => {
	await openModuleHarness(page);
	await page.evaluate(async () => {
		const { default: React } = await import('/node_modules/.vite/deps/react.js');
		const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
		const { restoreAudioFromStorage } = await import('/src/lib/audioUtils.js');
		const { DialogueRowsPanel } = await import('/src/components/dialogue/DialogueRowsPanel.jsx');
		window.ownedUrls = new Set();
		window.createdUrls = 0;
		const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
		URL.createObjectURL = (blob) => { const url = create(blob); window.createdUrls++; window.ownedUrls.add(url); return url; };
		URL.revokeObjectURL = (url) => { window.ownedUrls.delete(url); revoke(url); };
		const audioFile = restoreAudioFromStorage({ name: 'clip.wav', base64: 'data:audio/wav;base64,AQID', mimeType: 'audio/wav' });
		window.restoreCount = window.createdUrls;
		function Rows() {
			const [rows, setRows] = React.useState([{ id: 'row', text: 'row', duration: 1, audioFile }]);
			window.updateRows = setRows;
			return React.createElement(DialogueRowsPanel, { dialogueRows: rows, onChange: setRows });
		}
		window.rowsRoot = createRoot(document.getElementById('root'));
		window.rowsRoot.render(React.createElement(React.StrictMode, null, React.createElement(Rows)));
	});
	await expect.poll(() => page.evaluate(() => window.ownedUrls.size)).toBe(1);
	expect(await page.evaluate(() => window.restoreCount)).toBe(0);
	const created = await page.evaluate(() => window.createdUrls);
	await page.evaluate(() => window.updateRows((rows) => rows.map((row) => ({ ...row, text: 'edited' }))));
	await expect(page.locator('textarea')).toHaveValue('edited');
	expect(await page.evaluate(() => window.createdUrls)).toBe(created);
	await page.evaluate(() => window.updateRows((rows) => rows.map((row) => ({ ...row, audioFile: { name: 'new.wav', blob: new Blob(['new']) } }))));
	await expect.poll(() => page.evaluate(() => window.createdUrls)).toBe(created + 1);
	expect(await page.evaluate(() => window.ownedUrls.size)).toBe(1);
	await page.evaluate(() => window.updateRows([]));
	await expect.poll(() => page.evaluate(() => window.ownedUrls.size)).toBe(0);
	await page.evaluate(() => window.updateRows([{ id: 'new-row', text: '', duration: 1, audioFile: { name: 'last.wav', size: 4, blob: new Blob(['last']) } }]));
	await expect.poll(() => page.evaluate(() => window.ownedUrls.size)).toBe(1);
	await page.evaluate(() => window.rowsRoot.unmount());
	expect(await page.evaluate(() => window.ownedUrls.size)).toBe(0);
});

test('ISS-030 save and export commits are ordered and recover after a rejected save', async ({ page }) => {
	await openModuleHarness(page);
	const result = await page.evaluate(async () => {
		const { createEditorSaveQueue } = await import('/src/lib/editorDraft.js');
		const queue = createEditorSaveQueue();
		const events = [];
		let release;
		const wait = new Promise((resolve) => { release = resolve; });
		const first = queue(async () => { events.push('old started'); await wait; events.push('old committed'); });
		const second = queue(async () => { events.push('new committed'); events.push('exported new'); });
		await Promise.resolve();
		const whilePending = events.slice();
		release();
		await Promise.all([first, second]);
		await queue(() => { throw new Error('write rejected'); }).catch(() => events.push('rejected'));
		await queue(() => events.push('recovered'));
		return { whilePending, events };
	});
	expect(result).toEqual({ whilePending: ['old started'], events: ['old started', 'old committed', 'new committed', 'exported new', 'rejected', 'recovered'] });
});


