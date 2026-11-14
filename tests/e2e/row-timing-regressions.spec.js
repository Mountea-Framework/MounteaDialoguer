import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness';

test.beforeEach(async ({ page }) => { await openModuleHarness(page); });

test('row timing resolves like Unreal GetRowDuration and defaults when fields are absent', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { resolveRowDuration, getRowDurationMode, getRowExecutionBehaviour, isValidRowTiming } = await import('/src/lib/rowTiming.js');
		const audio = { name: 'a.wav' };
		return {
			defaults: [getRowDurationMode({}), getRowExecutionBehaviour({}), getRowDurationMode({ durationMode: 'nope' })],
			duration: resolveRowDuration({ duration: 3 }),
			override: resolveRowDuration({ duration: 3, durationMode: 'override', durationOverride: 5 }),
			addWithAudio: resolveRowDuration({ duration: 3, durationMode: 'add', durationOverride: 2, audioFile: audio }),
			addWithoutAudio: resolveRowDuration({ duration: 3, durationMode: 'add', durationOverride: 2 }),
			calculate: resolveRowDuration({ duration: 3, durationMode: 'calculate' }, 'x'.repeat(100)),
			floor: resolveRowDuration({ duration: 0 }),
			valid: [isValidRowTiming({}), isValidRowTiming({ executionBehaviour: 'awaitInput', durationMode: 'add', durationOverride: 0 })],
			invalid: [isValidRowTiming({ executionBehaviour: 'x' }), isValidRowTiming({ durationMode: 'manual' }), isValidRowTiming({ durationOverride: -1 }), isValidRowTiming({ durationOverride: '2' })],
		};
	});
	expect(result).toEqual({
		defaults: ['duration', 'automatic', 'duration'], duration: 3, override: 5, addWithAudio: 5, addWithoutAudio: 2, calculate: 8, floor: 0.01,
		valid: [true, true], invalid: [false, false, false, false],
	});
});

test('row timing fields survive archive round trip, old rows stay default, invalid values are rejected', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { completeProjectFixture } = await import('/tests/e2e/helpers/projectFixtures.js');
		const { exportProjectArchive, parseProjectArchive } = await import('/src/lib/persistence/projectArchive.js');
		const input = completeProjectFixture('timing');
		const row = input.nodes.find((node) => node.type === 'leadNode').data.dialogueRows[0];
		const plain = await parseProjectArchive(await exportProjectArchive(input));
		const plainRow = plain.snapshot.nodes.find((node) => node.type === 'leadNode').data.dialogueRows[0];
		Object.assign(row, { executionBehaviour: 'awaitInput', durationMode: 'add', durationOverride: 1.5 });
		const actual = await parseProjectArchive(await exportProjectArchive(input));
		const actualRow = actual.snapshot.nodes.find((node) => node.type === 'leadNode').data.dialogueRows[0];
		row.durationMode = 'manual';
		const rejected = await exportProjectArchive(input).then(() => false, () => true);
		return { plain: ['executionBehaviour', 'durationMode', 'durationOverride'].map((key) => key in plainRow), actual: [actualRow.executionBehaviour, actualRow.durationMode, actualRow.durationOverride], rejected };
	});
	expect(result).toEqual({ plain: [false, false, false], actual: ['awaitInput', 'add', 1.5], rejected: true });
});

test('DialogueRowsPanel writes timing fields only when non-default and shows override input for override/add', async ({ page }) => {
	await page.evaluate(async () => {
		const { default: React } = await import('/node_modules/.vite/deps/react.js');
		const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
		await import('/src/i18n/index.js');
		const { DialogueRowsPanel } = await import('/src/components/dialogue/DialogueRowsPanel.jsx');
		function Rows() {
			const [rows, setRows] = React.useState([{ id: 'row', text: 'hello', duration: 2 }]);
			window.currentRows = rows;
			return React.createElement(DialogueRowsPanel, { dialogueRows: rows, onChange: setRows });
		}
		createRoot(document.getElementById('root')).render(React.createElement(Rows));
	});
	const mode = page.locator('#duration-mode-row'), execution = page.locator('#execution-row'), override = page.locator('#duration-override-row');
	await expect(mode).toBeVisible();
	await expect(override).toHaveCount(0);
	await mode.selectOption('add');
	await expect(override).toBeVisible();
	await override.fill('2.5');
	await execution.selectOption('awaitInput');
	expect(await page.evaluate(() => window.currentRows[0])).toMatchObject({ durationMode: 'add', durationOverride: 2.5, executionBehaviour: 'awaitInput' });
	await mode.selectOption('duration');
	await execution.selectOption('automatic');
	await expect(override).toHaveCount(0);
	const row = await page.evaluate(() => window.currentRows[0]);
	expect(row).not.toHaveProperty('durationMode');
	expect(row).not.toHaveProperty('executionBehaviour');
});

test('row timing labels exist in every locale', async ({ page }) => {
	const missing = await page.evaluate(async () => {
		const locales = {};
		for (const lang of ['en', 'cs', 'de', 'es', 'fr', 'pl']) locales[lang] = (await import(`/src/i18n/locales/${lang}.json`)).default;
		const keys = ['executionBehaviour.label', 'executionBehaviour.automatic', 'executionBehaviour.awaitInput', 'executionBehaviour.stopping', 'durationMode.label', 'durationMode.duration', 'durationMode.override', 'durationMode.add', 'durationMode.calculate', 'durationOverride'];
		return Object.entries(locales).flatMap(([lang, json]) => keys.filter((key) => typeof key.split('.').reduce((node, part) => node?.[part], json.editor.rows) !== 'string').map((key) => `${lang}:${key}`));
	});
	expect(missing).toEqual([]);
});

test('preview waits for Continue on awaitInput rows and ends the node before a stopping row', async ({ page }) => {
	await page.evaluate(async () => {
		const { default: React } = await import('/node_modules/.vite/deps/react.js');
		const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
		await import('/src/i18n/index.js');
		const { DialoguePreviewOverlay } = await import('/src/components/dialogue/DialoguePreviewOverlay.jsx');
		window.previewEvents = [];
		const start = '00000000-0000-0000-0000-000000000001';
		const rows = [
			{ id: 'r1', text: 'Row one', duration: 0.5, executionBehaviour: 'awaitInput' },
			{ id: 'r2', text: 'Row two', duration: 0.5 },
			{ id: 'r3', text: 'Row three', duration: 0.5, executionBehaviour: 'stopping' },
		];
		const nodes = [{ id: start, type: 'startNode', data: {} }, { id: 'n', type: 'completeNode', data: { dialogueRows: rows } }];
		const edges = [{ id: 'e', source: start, target: 'n' }];
		createRoot(document.getElementById('root')).render(React.createElement(DialoguePreviewOverlay, {
			open: true, nodes, edges, rootDialogueId: 'root',
			onNodeChange: (ref) => window.previewEvents.push(ref?.nodeId || 'closed'),
			onStop: () => {},
		}));
	});
	await expect(page.getByText('Row one', { exact: true })).toBeVisible();
	await expect(page.getByTestId('preview-continue')).toBeVisible();
	await page.waitForTimeout(800);
	await expect(page.getByText('Row one', { exact: true })).toBeVisible();
	await page.getByTestId('preview-continue').click();
	await expect(page.getByText('Row two', { exact: true })).toBeVisible();
	await expect.poll(() => page.evaluate(() => window.previewEvents.includes('closed'))).toBe(true);
	await expect(page.getByText('Row three', { exact: true })).toHaveCount(0);
});
