import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness';

test.beforeEach(async ({ page }) => { await openModuleHarness(page); });

for (let version = 1; version <= 9; version++) {
	test(`migrates historical schema ${version} without changing its source`, async ({ page }) => {
		const result = await page.evaluate(async (version) => {
			const { default: Dexie } = await import('/node_modules/.vite/deps/dexie.js');
			const { seedHistoricalDatabase } = await import('/tests/e2e/helpers/projectFixtures.js');
			const { MounteaDialoguerDB } = await import('/src/lib/db.js');
			const name = `historical-${version}-${crypto.randomUUID()}`;
			const numeric = version === 1;
			const id = (number) => numeric ? number : `record-${number}`;
			await seedHistoricalDatabase(Dexie, name, version, {
				projects: [{ id: id(1), name: 'Original', extra: { untouched: true } }],
				dialogues: [{ id: id(2), projectId: id(1), name: 'Dialogue' }],
				categories: [{ id: id(3), projectId: id(1), name: 'Root' }],
				participants: [{ id: id(4), projectId: id(1), name: 'Speaker', category: 'Root' }],
				decorators: [{ id: id(5), projectId: id(1), name: 'Effect', properties: [] }],
				nodes: [{ id: id(6), dialogueId: id(2), type: 'startNode', data: {} }, { id: id(7), dialogueId: id(2), type: 'returnNode', data: { participant: 'Speaker', targetNode: id(8), decorators: [{ id: id(5) }], dialogueRows: [{ id: id(10), text: 'Original', audioFile: { blob: new Blob(['audio']) } }] } }, { id: id(8), dialogueId: id(2), type: 'leadNode', data: {} }],
				edges: [{ id: id(9), dialogueId: id(2), source: id(6), target: id(7) }],
			});
			const target = new MounteaDialoguerDB(name); await target.open();
			const project = await target.projects.toCollection().first(), dialogue = await target.dialogues.toCollection().first();
			const participant = await target.participants.toCollection().first(), category = await target.categories.toCollection().first();
			const nodes = await target.nodes.toArray(), edge = await target.edges.toCollection().first();
			const returnNode = nodes.find((node) => node.type === 'returnNode');
			const source = new Dexie(name); await source.open();
			const result = { sourceVersion: source.verno, original: await source.table('projects').get(id(1)), project, related: dialogue.projectId === project.id && participant.categoryId === category.id && returnNode.data.participantId === participant.id, targetMapped: returnNode.data.targetNode === nodes.find((node) => node.type === 'leadNode').id, edgeMapped: edge.source === '00000000-0000-0000-0000-000000000001' && edge.target === returnNode.id, audio: await returnNode.data.dialogueRows[0].audioFile.blob.text(), diagnostics: await target.recoveryRecords.count(), manifest: JSON.parse(localStorage.getItem(`mountea-database-manifest::${name}`)).status };
			source.close(); target.close(); await Dexie.delete(name); await Dexie.delete(`${name}__generation2`); return result;
		}, version);
		expect(result.sourceVersion).toBe(version); expect(result.original.name).toBe('Original');
		expect(result.project.extra).toEqual({ untouched: true }); expect(typeof result.project.id).toBe('string');
		expect(result.related).toBe(true); expect(result.targetMapped).toBe(true); expect(result.edgeMapped).toBe(true);
		expect(result.audio).toBe('audio'); expect(result.diagnostics).toBe(0); expect(result.manifest).toBe('complete');
	});
}

test('rolls back failed copy and resumes after committed copy but interrupted activation', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { default: Dexie } = await import('/node_modules/.vite/deps/dexie.js');
		const { seedHistoricalDatabase } = await import('/tests/e2e/helpers/projectFixtures.js');
		const { MounteaDialoguerDB } = await import('/src/lib/db.js');
		const name = `interruption-${crypto.randomUUID()}`;
		await seedHistoricalDatabase(Dexie, name, 3, { projects: [{ id: 'p', name: 'Keep original' }] });
		localStorage.setItem(`mountea-database-manifest::${name}`, JSON.stringify({ status: 'complete', targetName: `${name}__generation2` }));
		let target = new MounteaDialoguerDB(name, { beforeCommit: () => { throw new DOMException('Injected full storage', 'QuotaExceededError'); } });
		let failure; try { await target.open(); } catch (error) { failure = error.name; } target.close();
		const partial = new Dexie(`${name}__generation2`); await partial.open();
		const rolledBack = await partial.table('projects').count() === 0 && await partial.table('migrationState').count() === 0; partial.close();
		target = new MounteaDialoguerDB(name, { beforeActivation: () => { throw new Error('Interrupted after copy'); } });
		try { await target.open(); } catch { /* intended simulated process interruption */ } target.close();
		const committed = new Dexie(`${name}__generation2`); await committed.open();
		await committed.table('projects').update('p', { name: 'Later edit' }); committed.close();
		target = new MounteaDialoguerDB(name); await target.open();
		const preserved = (await target.projects.get('p')).name;
		const original = new Dexie(name); await original.open(); const sourceName = (await original.table('projects').get('p')).name;
		original.close(); target.close(); await Dexie.delete(name); await Dexie.delete(`${name}__generation2`);
		return { failure, rolledBack, preserved, sourceName };
	});
	expect(result).toEqual({ failure: 'QuotaExceededError', rolledBack: true, preserved: 'Later edit', sourceName: 'Keep original' });
});

test('ambiguous references remain intact and prevent unsafe export', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { transformLegacyRecords } = await import('/src/lib/persistence/migration.js');
		const { getRepositoryContext, assertProjectReady } = await import('/src/lib/db.js');
		const context = await getRepositoryContext();
		const { records, diagnostics } = transformLegacyRecords({ projects: [{ id: 'p' }], categories: [{ id: 'a', projectId: 'p', name: 'Same' }, { id: 'b', projectId: 'p', name: 'Same' }], participants: [{ id: 'speaker', projectId: 'p', name: 'Speaker', category: 'Same', custom: 'preserved' }] });
		await context.db.recoveryRecords.bulkAdd(diagnostics);
		let error; try { await assertProjectReady('p', context); } catch (caught) { error = caught.code; }
		return { participant: records.participants[0], code: diagnostics[0].code, original: diagnostics[0].original, error };
	});
	expect(result.participant.categoryId).toBeUndefined(); expect(result.participant.category).toBe('Same');
	expect(result.original.custom).toBe('preserved'); expect(result.code).toBe('ambiguous_reference'); expect(result.error).toBe('PROJECT_REPAIR_REQUIRED');
});

test('profile switching aborts captured contexts and rehydrates defaults without leaking preferences', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { getRepositoryContext, readProjectRecords } = await import('/src/lib/db.js');
		const { setActiveProfileId } = await import('/src/lib/profile/activeProfile.js');
		const { useUIStore } = await import('/src/stores/uiStore.js');
		const first = await getRepositoryContext(); await first.db.projects.add({ id: 'p', name: 'First profile' });
		useUIStore.getState().setViewMode('list'); useUIStore.getState().setProjectContentLocale('p', 'cs');
		setActiveProfileId(`second-${crypto.randomUUID()}`);
		await useUIStore.persist.rehydrate(); const second = await getRepositoryContext();
		let failure; try { await readProjectRecords('p', first); } catch (error) { failure = error.code; }
		return { failure, aborted: first.signal.aborted, currentCount: await second.db.projects.count(), originalCount: await first.db.projects.count(), view: useUIStore.getState().viewMode, locales: useUIStore.getState().contentLocaleByProject };
	});
	expect(result).toEqual({ failure: 'STALE_PROFILE', aborted: true, currentCount: 0, originalCount: 1, view: 'grid', locales: {} });
});

test('quarantines duplicate start nodes, reports missing targets, and validates repaired references', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { transformLegacyRecords } = await import('/src/lib/persistence/migration.js');
		const { getRepositoryContext, revalidateProjectRecovery, assertProjectReady, restoreQuarantinedNode } = await import('/src/lib/db.js');
		const { records, diagnostics } = transformLegacyRecords({ projects: [{ id: 'p' }], dialogues: [{ id: 'd', projectId: 'p' }], nodes: [{ id: 'one', dialogueId: 'd', type: 'startNode', data: {} }, { id: 'two', dialogueId: 'd', type: 'startNode', data: { custom: 'recover me' } }, { id: 'return', dialogueId: 'd', type: 'returnNode', data: { targetNode: 'missing' } }] });
		const context = await getRepositoryContext();
		await context.db.projects.bulkAdd(records.projects); await context.db.dialogues.bulkAdd(records.dialogues); await context.db.nodes.bulkAdd(records.nodes);
		await context.db.recoveryRecords.bulkAdd(diagnostics.filter((row) => row.code !== 'duplicate_identity'));
		await context.db.nodes.update(['d', 'return'], { 'data.targetNode': '00000000-0000-0000-0000-000000000001' });
		const remaining = await revalidateProjectRecovery('p', context); await assertProjectReady('p', context);
		const quarantined = diagnostics.find((row) => row.code === 'duplicate_identity');
		await context.db.recoveryRecords.add(quarantined);
		await restoreQuarantinedNode(quarantined.id, { ...quarantined.original, id: 'restored', type: 'leadNode' }, context);
		await assertProjectReady('p', context);
		return { count: records.nodes.length, codes: diagnostics.map((row) => row.code), original: diagnostics.find((row) => row.code === 'duplicate_identity').original, remaining: remaining.length, history: await context.db.recoveryRecords.where('status').equals('resolved').count() };
	});
	expect(result.count).toBe(2); expect(result.codes).toEqual(['duplicate_identity', 'missing_reference']);
	expect(result.original.data.custom).toBe('recover me'); expect(result.remaining).toBe(0); expect(result.history).toBe(2);
});

test('rejects profile names that previously collided after sanitization', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { setActiveProfileId, getActiveProfileId } = await import('/src/lib/profile/activeProfile.js');
		setActiveProfileId('a-b'); let rejected = false;
		try { setActiveProfileId('a.b'); } catch { rejected = true; }
		return { rejected, active: getActiveProfileId() };
	});
	expect(result).toEqual({ rejected: true, active: 'a-b' });
});

test('startup waits for delayed Steam profile resolution and hydrates that profile before the dashboard', async ({ page }) => {
	await page.addInitScript(() => {
		window.__steamRequests = [];
		window.electronAPI = { isElectron: true, getSteamStatus: () => new Promise((resolve) => window.__steamRequests.push(resolve)) };
		localStorage.setItem('mountea-dialoguer-ui::steam-1234', JSON.stringify({ state: { viewMode: 'list', contentLocaleByProject: { p: 'cs' } }, version: 0 }));
		localStorage.setItem('mountea-dialoguer-sync::steam-1234', JSON.stringify({ state: { hideLoginPrompt: true }, version: 0 }));
	});
	await page.goto('/#/');
	await expect.poll(() => page.evaluate(() => window.__steamRequests.length)).toBeGreaterThan(0);
	await expect(page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first()).not.toBeVisible();
	await page.evaluate(() => window.__steamRequests.forEach((resolve) => resolve({ initialized: true, available: true, channel: 'desktop', steamId: '1234', cloud: { available: false } })));
	await expect(page.getByRole('button', { name: /(create new|new project|new dialogue)/i }).first()).toBeVisible();
	const result = await page.evaluate(async () => {
		const { useUIStore } = await import('/src/stores/uiStore.js');
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const context = await getRepositoryContext();
		return { profile: context.profileId, view: useUIStore.getState().viewMode, locales: useUIStore.getState().contentLocaleByProject };
	});
	expect(result).toEqual({ profile: 'steam-1234', view: 'list', locales: { p: 'cs' } });
});
