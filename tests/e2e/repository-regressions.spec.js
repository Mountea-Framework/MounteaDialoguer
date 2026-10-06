import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness';

test.beforeEach(async ({ page }) => { await openModuleHarness(page); });

test('commits exact immutable media payload and offline intent together, then rejects a stale prepared write', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { prepareProjectCommit, commitPreparedProject, readProjectState } = await import('/src/lib/persistence/projectRepository.js');
		const { hashProject, decodeMediaBase64 } = await import('/src/lib/persistence/canonicalProject.js');
		const context = await getRepositoryContext();
		const input = { project: { id: 'p', name: 'Original', lastExportPath: 'private-path' }, dialogues: [{ id: 'd', projectId: 'p', name: 'Draft' }], nodes: [{ id: 'row-node', dialogueId: 'd', type: 'leadNode', data: { dialogueRows: [{ id: 'r', text: 'Draft text', audioFile: { name: 'test.wav', blob: new Blob([new Uint8Array([0, 1, 127, 255])], { type: 'audio/wav' }), size: 4 } }] } }], syncAccounts: [{ token: 'do-not-export' }] };
		const first = await prepareProjectCommit(input, { context, expectedSequence: 0, operation: 'create', validation: 'draft' });
		const competing = await prepareProjectCommit({ ...input, project: { ...input.project, name: 'Competing' } }, { context, expectedSequence: 0, validation: 'draft' });
		await commitPreparedProject(first);
		input.project.name = 'Mutation after preparation';
		let stale; try { await commitPreparedProject(competing); } catch (error) { stale = error.code; }
		const state = await readProjectState('p', context), revision = await context.db.projectRevisions.get(state.revisionId), outbox = await context.db.syncOutbox.toArray();
		return { stale, name: state.snapshot.project.name, revisionName: revision.snapshot.project.name, hashMatches: revision.payloadHash === await hashProject(revision.snapshot), bytes: [...decodeMediaBase64(revision.snapshot.nodes[0].data.dialogueRows[0].audioFile.base64)], intentRevision: outbox[0].localRevisionId === revision.id, sequence: state.sequence, privateFields: ['syncAccounts' in revision.snapshot, 'lastExportPath' in revision.snapshot.project], revisionCount: await context.db.projectRevisions.count() };
	});
	expect(result).toEqual({ stale: 'STALE_PROJECT', name: 'Original', revisionName: 'Original', hashMatches: true, bytes: [0, 1, 127, 255], intentRevision: true, sequence: 1, privateFields: [false, false], revisionCount: 1 });
});

test('failed revision insertion rolls authoring back; deletion retains its exact snapshot and intent', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { prepareProjectCommit, commitPreparedProject, mutateProject } = await import('/src/lib/persistence/projectRepository.js');
		const context = await getRepositoryContext();
		await commitPreparedProject(await prepareProjectCommit({ project: { id: 'p', name: 'Keep' } }, { context, expectedSequence: 0, operation: 'create' }));
		const fail = () => { throw new Error('Injected revision storage failure'); };
		context.db.projectRevisions.hook('creating', fail);
		let failed = false;
		try { await mutateProject('p', { context, transform: (snapshot) => { snapshot.project.name = 'Must roll back'; } }); } catch { failed = true; }
		context.db.projectRevisions.hook('creating').unsubscribe(fail);
		const preserved = await context.db.projects.get('p'), countAfterFailure = await context.db.syncOutbox.count();
		const deleted = await mutateProject('p', { context, operation: 'delete' });
		const revision = await context.db.projectRevisions.get(deleted.revisionId);
		return { failed, preserved: preserved.name, countAfterFailure, remaining: await context.db.projects.count(), operation: revision.operation, deletedName: revision.snapshot.project.name, intentCount: await context.db.syncOutbox.count() };
	});
	expect(result).toEqual({ failed: true, preserved: 'Keep', countAfterFailure: 1, remaining: 0, operation: 'delete', deletedName: 'Keep', intentCount: 2 });
});

test('foreign entity ownership fails before any project replacement', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { prepareProjectCommit, commitPreparedProject } = await import('/src/lib/persistence/projectRepository.js');
		const context = await getRepositoryContext();
		await context.db.projects.add({ id: 'foreign', name: 'Owner' }); await context.db.categories.add({ id: 'shared', projectId: 'foreign', name: 'Category' });
		let failure;
		try { await commitPreparedProject(await prepareProjectCommit({ project: { id: 'incoming', name: 'Import' }, categories: [{ id: 'shared', projectId: 'incoming', name: 'Category' }] }, { context, expectedSequence: 0, operation: 'create' })); } catch (error) { failure = error.code; }
		return { failure, projects: await context.db.projects.count(), owner: (await context.db.categories.get('shared')).projectId, revisions: await context.db.projectRevisions.count() };
	});
	expect(result).toEqual({ failure: 'FOREIGN_OWNERSHIP', projects: 1, owner: 'foreign', revisions: 0 });
});

test('incomplete drafts remain editable while strict export readiness reports them', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { prepareProjectCommit, commitPreparedProject, mutateProject } = await import('/src/lib/persistence/projectRepository.js');
		const { validateCanonicalProject } = await import('/src/lib/persistence/canonicalProject.js');
		const context = await getRepositoryContext();
		await commitPreparedProject(await prepareProjectCommit({ project: { id: 'p', name: 'Draft' }, dialogues: [{ id: 'd', projectId: 'p', name: 'Empty graph' }] }, { context, expectedSequence: 0, operation: 'create', validation: 'draft' }));
		const saved = await mutateProject('p', { context, transform: (snapshot) => { snapshot.project.description = 'Still editable'; } });
		return { description: saved.snapshot.project.description, readiness: validateCanonicalProject(saved.snapshot).map((row) => row.code) };
	});
	expect(result).toEqual({ description: 'Still editable', readiness: ['INVALID_START'] });
});

test('remote revision application preserves sender metadata and hash, rejects tampering and emits no echo intent', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { getRepositoryContext } = await import('/src/lib/db.js');
		const { canonicalizeProject, hashProject } = await import('/src/lib/persistence/canonicalProject.js');
		const { applyRemoteRevision } = await import('/src/lib/persistence/projectRepository.js');
		const context = await getRepositoryContext(), snapshot = await canonicalizeProject({ project: { id: 'p', name: 'Remote' } });
		const revision = { id: 'remote-id', projectId: 'p', parentRevisionIds: ['ancestor'], deviceId: 'other-device', payloadHash: await hashProject(snapshot), operation: 'update', createdAt: '2026-01-02T03:04:05.000Z', snapshot };
		await context.db.projectRevisions.add(revision);
		const applied = await applyRemoteRevision(revision, { context, expectedSequence: 0 });
		let tamper; try { await applyRemoteRevision({ ...revision, id: 'tampered', snapshot: { ...snapshot, project: { ...snapshot.project, name: 'Altered' } } }, { context }); } catch (error) { tamper = error.code; }
		return { exact: JSON.stringify(await context.db.projectRevisions.get(revision.id)) === JSON.stringify(revision), head: applied.revisionId, outbox: await context.db.syncOutbox.count(), tamper };
	});
	expect(result).toEqual({ exact: true, head: 'remote-id', outbox: 0, tamper: 'INVALID_REMOTE_REVISION' });
});

test('local mutations serialize across browser tabs while independently prepared imports reject stale revisions', async ({ page, context }) => {
	await page.evaluate(async () => {
		const { prepareProjectCommit, commitPreparedProject } = await import('/src/lib/persistence/projectRepository.js');
		await commitPreparedProject(await prepareProjectCommit({ project: { id: 'p', name: 'Initial' } }, { expectedSequence: 0, operation: 'create' }));
	});
	const profileId = await page.evaluate(() => localStorage.getItem('mountea-active-profile-id'));
	const second = await context.newPage(); await openModuleHarness(second, { profileId });
	const firstMutation = page.evaluate(async () => { const { mutateProject } = await import('/src/lib/persistence/projectRepository.js'); return mutateProject('p', { transform: async (snapshot) => { window.editStarted = true; await new Promise((resolve) => { window.releaseEdit = resolve; }); snapshot.project.name = 'First'; } }); });
	await page.waitForFunction(() => window.editStarted);
	const secondMutation = second.evaluate(async () => { const { mutateProject } = await import('/src/lib/persistence/projectRepository.js'); return mutateProject('p', { transform: (snapshot) => { snapshot.project.description = snapshot.project.name; } }); });
	await page.evaluate(() => window.releaseEdit()); await Promise.all([firstMutation, secondMutation]);
	const result = await page.evaluate(async () => (await (await import('/src/lib/persistence/projectRepository.js')).readProjectState('p')).snapshot.project);
	expect(result).toMatchObject({ name: 'First', description: 'First' }); await second.close();
});


test('canonical binary media survives encrypted snapshot application byte for byte', async ({ page }) => {
	const result = await page.evaluate(async () => {
		const { completeProjectFixture } = await import('/tests/e2e/helpers/projectFixtures.js');
		const { remapProjectIdentities } = await import('/src/lib/persistence/projectRemap.js');
		const { canonicalizeProject, decodeMediaBase64 } = await import('/src/lib/persistence/canonicalProject.js');
		const { encryptPayload, decryptPayload } = await import('/src/lib/sync/crypto.js');
		const { applyProjectSnapshot, buildProjectSnapshot } = await import('/src/lib/sync/snapshot.js');
		const input = completeProjectFixture('encrypted');
		for (const node of input.nodes) { if (!node.data.displayNameKey) node.data.displayName = node.type; if (node.type === 'leadNode') node.data.selectionTitle = 'Choose'; }
		input.participants[0].thumbnail = { base64: 'data:image/png;base64,AAH//w==', mimeType: 'image/png', sizeBytes: 4, custom: 'retained' };
		const expected = await canonicalizeProject(remapProjectIdentities(input, { projectId: input.project.id, preserveEntityIds: true }).snapshot);
		const restored = await decryptPayload('test-only-password', await encryptPayload('test-only-password', expected));
		await applyProjectSnapshot(restored);
		const actual = await buildProjectSnapshot(expected.project.id, { requireReady: true });
		return { same: JSON.stringify(expected) === JSON.stringify(actual), audio: [...decodeMediaBase64(actual.nodes.find((node) => node.type === 'leadNode').data.dialogueRows[0].audioFile.base64)], thumbnail: [...decodeMediaBase64(actual.participants[0].thumbnail.base64)] };
	});
	expect(result).toEqual({ same: true, audio: [0, 1, 127, 255], thumbnail: [0, 1, 255, 255] });
});
