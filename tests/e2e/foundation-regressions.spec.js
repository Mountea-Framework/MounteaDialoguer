import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness.js';
import { createProviderBackend } from './helpers/providerFake.js';
import { conflictingRevisionFixtures } from './helpers/projectFixtures.js';

test('module harness selects its test profile before imports and prevents external requests', async ({ page, context }) => {
	const first = await openModuleHarness(page);
	await page.evaluate(() => localStorage.setItem('test-owned-key', 'first'));
	const secondPage = await context.newPage();
	const second = await openModuleHarness(secondPage);
	expect(first.profileId).not.toBe(second.profileId);
	expect(await secondPage.evaluate(() => localStorage.getItem('mountea-active-profile-id'))).toBe(second.profileId);
	expect(await page.evaluate(async () => { try { await fetch('https://example.com/must-not-contact'); return false; } catch { return true; } })).toBe(true);
});

test('historical fixture writes all nine original schema generations without current migrations', async ({ page }) => {
	await openModuleHarness(page);
	const actual = await page.evaluate(async () => {
		const { default: Dexie } = await import('/node_modules/.vite/deps/dexie.js');
		const { seedHistoricalDatabase } = await import('/tests/e2e/helpers/projectFixtures.js');
		const results = [];
		for (let version = 1; version <= 9; version += 1) {
			const name = `historical-fixture-${version}`;
			const id = version === 1 ? 1 : 'project';
			await seedHistoricalDatabase(Dexie, name, version, { projects: [{ id, name: 'Original' }] });
			const database = new Dexie(name);
			await database.open();
			results.push({ version: database.verno, id: (await database.table('projects').toArray())[0].id });
			database.close();
			await Dexie.delete(name);
		}
		return results;
	});
	expect(actual).toEqual(Array.from({ length: 9 }, (_, i) => ({ version: i + 1, id: i === 0 ? 1 : 'project' })));
});

test('complete project fixture preserves binary bytes and explicit empty translations under cloning', async ({ page }) => {
	await openModuleHarness(page);
	const actual = await page.evaluate(async () => {
		const { completeProjectFixture } = await import('/tests/e2e/helpers/projectFixtures.js');
		const fixture = completeProjectFixture();
		fixture.localizedStrings[0].values.fr = '';
		const cloned = structuredClone(fixture);
		return { bytes: [...new Uint8Array(await cloned.nodes[1].data.dialogueRows[0].audioFile.blob.arrayBuffer())], locales: cloned.localizedStrings[0].values, unused: cloned.decorators[1].name, names: cloned.dialogues.map((dialogue) => dialogue.name) };
	});
	expect(actual).toEqual({ bytes: [0, 1, 127, 255], locales: { en: 'Line', cs: 'Řádek', fr: '' }, unused: 'Unused', names: ['A B', 'A_B'] });
});

test('provider fake supports independent clients, delayed calls, duplicate listings and lost write replies', async () => {
	const backend = createProviderBackend();
	const first = backend.createClient('first');
	const second = backend.createClient('second');
	first.failNext('createFile');
	await expect(first.createFile({ name: 'must-not-exist', content: 'rejected' })).rejects.toThrow('Injected provider failure');
	expect(await second.listFiles()).toEqual([]);
	const release = first.holdNext('createFile');
	const pending = first.createFile({ name: 'revision-one', content: 'first' });
	expect(await second.listFiles()).toEqual([]);
	release();
	const created = await pending;
	expect(await second.downloadFile(created.id)).toBe('first');
	second.duplicateListings();
	expect(await second.listFiles()).toHaveLength(2);
	first.failNext('createFile', { afterCommit: true });
	await expect(first.createFile({ name: 'revision-two', content: 'survives-lost-reply' })).rejects.toThrow('Injected provider failure');
	expect(await second.findFileByName('revision-two')).toMatchObject({ content: 'survives-lost-reply' });
	second.failNext('downloadFile');
	await expect(second.downloadFile(created.id)).rejects.toThrow('Injected provider failure');
	expect(await second.downloadFile(created.id)).toBe('first');
	const revisions = conflictingRevisionFixtures();
	expect(revisions.local.parentRevisionIds).toEqual(revisions.remote.parentRevisionIds);
	expect(revisions.local.revisionId).not.toBe(revisions.remote.revisionId);
});
