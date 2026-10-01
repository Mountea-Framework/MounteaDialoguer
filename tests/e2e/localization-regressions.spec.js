import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness.js';

test.beforeEach(async ({ page }) => {
	await openModuleHarness(page);
	await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		await db.projects.put({ id: 'p', name: 'Localization', localization: { defaultLocale: 'en', supportedLocales: ['en', 'cs'] } });
	});
});

test('ISS-016 same-named dialogues reserve distinct immutable namespaces', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		const first = await useDialogueStore.getState().createDialogue({ projectId: 'p', name: 'Same name' });
		const second = await useDialogueStore.getState().createDialogue({ projectId: 'p', name: 'Same name' });
		return [first.localizationSlug, second.localizationSlug];
	});
	expect(result[0]).not.toBe(result[1]);
});

test('ISS-017 legacy graph migrates original text before materialization and persists marker atomically', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		await db.dialogues.put({ id: 'legacy', projectId: 'p', name: 'Legacy', localizationVersion: 1 });
		await db.nodes.put({ id: 'start', dialogueId: 'legacy', type: 'startNode', data: { displayName: 'Original text' }, position: { x: 0, y: 0 } });
		const graph = await useDialogueStore.getState().loadDialogueGraph('legacy', { activeLocale: 'cs' });
		return { node: await db.nodes.get(['legacy', 'start']), entries: await db.localizedStrings.toArray(), dialogue: await db.dialogues.get('legacy'), visible: graph.nodes[0].data.displayName };
	});
	expect(result.node.data.displayNameKey).toBeTruthy();
	expect(result.node.data).not.toHaveProperty('displayName');
	expect(result.entries[0].values).toEqual({ en: 'Original text' });
	expect(result.dialogue.localizationVersion).toBe(2);
	expect(result.visible).toBe('Original text');
});

test('ISS-017 default locale seeds from prior default and preserves explicit blanks and translations', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useProjectStore } = await import('/src/stores/projectStore.js');
		await db.localizedStrings.bulkPut([
			{ projectId: 'p', dialogueId: 'd', nodeId: 'n', field: 'displayName', key: 'dlg.d.n_n.display_name', values: { en: 'Original', de: 'Deutsch' } },
			{ projectId: 'p', dialogueId: 'd', nodeId: 'm', field: 'displayName', key: 'dlg.d.n_m.display_name', values: { en: 'Fallback', cs: '' } },
		]);
		await useProjectStore.getState().updateProjectLocalization('p', { defaultLocale: 'cs', supportedLocales: ['cs', 'en', 'de'] });
		return (await db.localizedStrings.toArray()).map((entry) => ({ key: entry.key, values: entry.values }));
	});
	expect(result).toEqual(expect.arrayContaining([
		{ key: 'dlg.d.n_n.display_name', values: { en: 'Original', cs: 'Original', de: 'Deutsch' } },
		{ key: 'dlg.d.n_m.display_name', values: { en: 'Fallback', cs: '' } },
	]));
});

test('ISS-018 missing configured references fail validation and enabled is absent from normalized contract', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const strings = await import('/src/lib/localization/stringTable.js');
		return { validation: strings.validateLocalizedEntriesForDialogue({ nodes: [{ id: 'n', type: 'leadNode', data: { displayName: 'Raw', dialogueRows: [{ id: 'r', text: 'Hello' }] } }], entries: [] }), config: strings.normalizeProjectLocalizationConfig({ enabled: false }) };
	});
	expect(result.validation.valid).toBe(false);
	expect(result.validation.errors.some((error) => error.type === 'missing_key_ref')).toBe(true);
	expect(result.config).not.toHaveProperty('enabled');
});

test('ISS-017 unrecoverable translations reject migration without marking source as migrated', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		const source = { id: 'n', dialogueId: 'lost', type: 'startNode', position: { x: 0, y: 0 }, data: { displayNameKey: 'dlg.lost.n_n.display_name', localizationNodeToken: 'n' } };
		await db.dialogues.put({ id: 'lost', projectId: 'p', name: 'Lost', localizationVersion: 1 });
		await db.nodes.put(source);
		let error;
		try { await useDialogueStore.getState().loadDialogueGraph('lost'); } catch (failure) { error = failure.code || failure.message; }
		const { assertProjectReady } = await import('/src/lib/db.js');
		let blocked;
		try { await assertProjectReady('p'); } catch (failure) { blocked = failure.code; }
		return { error, blocked, source, node: await db.nodes.get(['lost', 'n']), dialogue: await db.dialogues.get('lost'), count: await db.localizedStrings.count() };
	});
	expect(result.error).toBeTruthy();
	expect(result.node).toEqual(result.source);
	expect(result.dialogue.localizationVersion).toBe(1);
	expect(result.count).toBe(0);
	expect(result.blocked).toBe('PROJECT_REPAIR_REQUIRED');
});

test('ISS-017 changing default locale migrates inline legacy text under the original locale first', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useProjectStore } = await import('/src/stores/projectStore.js');
		await db.dialogues.put({ id: 'legacy-default', projectId: 'p', name: 'Legacy', localizationVersion: 1 });
		await db.nodes.put({ id: 'n', dialogueId: 'legacy-default', type: 'startNode', position: { x: 0, y: 0 }, data: { displayName: 'Original English' } });
		await useProjectStore.getState().updateProjectLocalization('p', { defaultLocale: 'cs' });
		return { values: (await db.localizedStrings.toArray())[0].values, node: await db.nodes.get(['legacy-default', 'n']) };
	});
	expect(result.values).toEqual({ en: 'Original English', cs: 'Original English' });
	expect(result.node.data).not.toHaveProperty('displayName');
});

test('ISS-016 namespace repair rewrites keys and retains every translation including blank strings', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		await db.dialogues.bulkPut([{ id: 'first', projectId: 'p', name: 'Same', localizationSlug: 'same', localizationVersion: 2 }, { id: 'second', projectId: 'p', name: 'Same', localizationSlug: 'same', localizationVersion: 2 }]);
		await db.nodes.put({ id: 'n', dialogueId: 'second', type: 'startNode', position: { x: 0, y: 0 }, data: { displayNameKey: 'dlg.same.n_n.display_name', localizationNodeToken: 'n' } });
		await db.localizedStrings.put({ projectId: 'p', dialogueId: 'second', nodeId: 'n', field: 'displayName', key: 'dlg.same.n_n.display_name', values: { en: 'Second', cs: '', de: 'Zweite', es: 'Segundo', fr: 'Deuxième', pl: 'Drugi' } });
		await useDialogueStore.getState().loadDialogueGraph('second');
		return { dialogue: await db.dialogues.get('second'), node: await db.nodes.get(['second', 'n']), entries: await db.localizedStrings.toArray() };
	});
	expect(result.dialogue.localizationSlug).toBe('same_second');
	expect(result.node.data.displayNameKey).toBe('dlg.same_second.n_n.display_name');
	expect(result.entries).toHaveLength(1);
	expect(result.entries[0].values).toEqual({ en: 'Second', cs: '', de: 'Zweite', es: 'Segundo', fr: 'Deuxième', pl: 'Drugi' });
});

test('ISS-017 injected migration write failure rolls back nodes, entries and version marker', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
		const source = { id: 'n', dialogueId: 'rollback', type: 'startNode', position: { x: 0, y: 0 }, data: { displayName: 'Preserve me' } };
		await db.dialogues.put({ id: 'rollback', projectId: 'p', name: 'Rollback', localizationVersion: 1 });
		await db.nodes.put(source);
		const reject = () => { throw new Error('Injected string write failure'); };
		db.localizedStrings.hook('creating', reject);
		let error;
		try { await useDialogueStore.getState().loadDialogueGraph('rollback'); } catch (failure) { error = failure.message; } finally { db.localizedStrings.hook('creating').unsubscribe(reject); }
		return { error, source, node: await db.nodes.get(['rollback', 'n']), version: (await db.dialogues.get('rollback')).localizationVersion, entries: await db.localizedStrings.count() };
	});
	expect(result.error).toContain('Injected string write failure');
	expect(result.node).toEqual(result.source);
	expect(result.version).toBe(1);
	expect(result.entries).toBe(0);
});

test('ISS-017 rejected default locale update preserves previous project config and entries', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useProjectStore } = await import('/src/stores/projectStore.js');
		const source = { projectId: 'p', dialogueId: 'lost', key: 'dlg.lost.n_n.display_name', values: { de: 'Only surviving text' } };
		await db.localizedStrings.put(source);
		let error;
		try { await useProjectStore.getState().updateProjectLocalization('p', { defaultLocale: 'cs' }); } catch (failure) { error = failure.code; }
		return { error, source, entry: await db.localizedStrings.get(['p', source.key]), locale: (await db.projects.get('p')).localization.defaultLocale };
	});
	expect(result.error).toBe('LOCALIZATION_REPAIR_REQUIRED');
	expect(result.entry).toEqual(result.source);
	expect(result.locale).toBe('en');
});

test('ISS-018 validation rejects foreign ownership, token mismatch and missing default but accepts blank default', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { validateLocalizedEntriesForDialogue } = await import('/src/lib/localization/stringTable.js');
		const node = { id: 'n', type: 'startNode', data: { localizationNodeToken: 'n', displayNameKey: 'dlg.d.n_n.display_name' } };
		const entry = { projectId: 'p', dialogueId: 'd', nodeId: 'n', rowId: '', field: 'displayName', key: node.data.displayNameKey, values: { en: '' } };
		const check = (nodes, entries, extra = {}) => validateLocalizedEntriesForDialogue({ nodes, entries, projectId: 'p', dialogueId: 'd', dialogueSlug: 'd', defaultLocale: 'en', ...extra });
		return { good: check([node], [entry]), foreign: check([node], [{ ...entry, projectId: 'other' }]), token: check([{ ...node, data: { ...node.data, localizationNodeToken: 'other' } }], [entry]), missing: check([node], [{ ...entry, values: { cs: 'Ahoj' } }]), collision: check([node], [entry], { projectEntries: [{ ...entry, dialogueId: 'another' }] }) };
	});
	expect(result.good.valid).toBe(true);
	for (const name of ['foreign', 'token', 'missing', 'collision']) expect(result[name].valid, name).toBe(false);
});
