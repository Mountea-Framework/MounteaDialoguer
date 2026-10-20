import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openModuleHarness } from './helpers/moduleHarness.js';

async function setup(page) {
 await openModuleHarness(page);
 await page.evaluate(async () => {
  const { MounteaDialoguerDB, getRepositoryContext } = await import('/src/lib/db.js');
  const repository = await import('/src/lib/persistence/projectRepository.js');
  const protocol = await import('/src/lib/sync/core/revisionProtocol.js');
  const { createProviderBackend } = await import('/tests/e2e/helpers/providerFake.js');
  const backend = createProviderBackend();
  const client = async name => {
   const db = name === 'a' ? (await getRepositoryContext()).db : new MounteaDialoguerDB(`sync-${name}`); await db.open();
   const context = name === 'a' ? await getRepositoryContext() : { db, profileId: name, assertCurrent() {}, signal: new AbortController().signal };
   const storage = backend.createClient(name);
   const options = { context, storage, provider: 'steam' };
   return { db, context, storage, options, run: (mode = 'full') => protocol.syncRevisions({ ...options, mode }) };
  };
  const a = await client('a'), b = await client('b');
  const create = async (device = a, name = 'Base') => repository.commitPreparedProject(await repository.prepareProjectCommit({ project: { id: 'p', name }, dialogues: [], nodes: [], edges: [], categories: [], participants: [], decorators: [], conditions: [], localizedStrings: [] }, { context: device.context, expectedSequence: 0, operation: 'create' }));
  const edit = (device, name) => repository.mutateProject('p', { context: device.context, transform: snapshot => { snapshot.project.name = name; } });
  window.rig = { a, b, backend, create, edit, repository, protocol };
 });
}

test('ISS-015 two independent clients retain both branches and explicit resolution acknowledges both parents', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, edit, protocol, backend } = window.rig;
  await create(); await a.run(); await b.run('pull');
  const left = await edit(a, 'Left'), right = await edit(b, 'Right');
  await a.run(); const conflictResult = await b.run(); await a.run();
  const before = [(await a.db.projects.get('p')).name, (await b.db.projects.get('p')).name];
  const conflict = (await b.db.syncConflicts.toArray()).find(row => row.status === 'unresolved');
  const resolved = await protocol.resolveRevisionConflict(conflict.id, 'local', { context: b.context });
  await b.run(); await a.run();
  const revision = await b.db.projectRevisions.get(resolved.revisionId);
  return { before, conflicts: conflictResult.conflicts.length, parents: revision.parentRevisionIds.sort(), expected: [left.revisionId, right.revisionId].sort(), final: (await a.db.projects.get('p')).name, mutations: backend.calls.filter(call => ['updateFile', 'deleteFile'].includes(call.method)).length };
 });
 expect(result.before).toEqual(['Left', 'Right']); expect(result.conflicts).toBe(1); expect(result.parents).toEqual(result.expected); expect(result.final).toBe('Right'); expect(result.mutations).toBe(0);
});

test('ISS-021 lost upload replies retry exact revision, duplicate listings and concurrent edits retain pending work', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, backend, create, edit } = window.rig;
  const first = await create(); a.storage.failNext('createFile', { afterCommit: true });
  const failed = await a.run(); const pending = await a.db.syncOutbox.get(`delivery:steam:${first.revisionId}`);
  a.storage.duplicateListings(); await a.run();
  const second = await edit(a, 'Second'); const release = a.storage.holdNext('createFile');
  const running = a.run();
  while (!backend.calls.some(call => call.method === 'createFile' && call.args.appProperties?.revisionId === second.revisionId)) await new Promise(resolve => setTimeout(resolve, 0));
  const third = await edit(a, 'Third'); release(); await running;
  const thirdBefore = await a.db.syncOutbox.get(`delivery:steam:${third.revisionId}`);
  await a.run();
  return { failures: failed.failures.length, pending: pending.status, thirdBefore: thirdBefore?.status || 'pending', thirdAfter: (await a.db.syncOutbox.get(`delivery:steam:${third.revisionId}`)).status, files: backend.files.size, revisions: await a.db.projectRevisions.count() };
 });
 expect(result).toEqual({ failures: 1, pending: 'pending', thirdBefore: 'pending', thirdAfter: 'acknowledged', files: 3, revisions: 3 });
});

test('ISS-019 list is read only, pull never publishes and corrupt catalogue leaves authored records unchanged', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, backend } = window.rig;
  await create(); await a.run();
  const beforeCalls = backend.calls.length; await b.run('list');
  const afterList = { projects: await b.db.projects.count(), revisions: await b.db.projectRevisions.count(), outbox: await b.db.syncOutbox.count() };
  await b.run('pull'); const writes = backend.calls.slice(beforeCalls).filter(call => ['createFile','updateFile','deleteFile'].includes(call.method)).length;
  await a.storage.createFile({ name: '_mountea-sync-catalog.v1.json', content: '{broken' });
  let code; try { await b.run(); } catch (error) { code = error.code; }
  return { afterList, writes, code, name: (await b.db.projects.get('p')).name };
 });
 expect(result).toEqual({ afterList: { projects: 0, revisions: 0, outbox: 0 }, writes: 0, code: 'CORRUPT_REMOTE', name: 'Base' });
});

test('ISS-020 delete versus edit conflicts, stale snapshots cannot resurrect a project and absence cannot delete it', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, edit, repository, protocol, backend } = window.rig;
  await create(); await a.run(); await b.run('pull');
  await repository.mutateProject('p', { context: a.context, operation: 'delete' });
  await edit(b, 'Offline edit'); await a.run(); const outcome = await b.run();
  const conflict = (await b.db.syncConflicts.toArray()).find(row => row.status === 'unresolved');
  await protocol.resolveRevisionConflict(conflict.id, 'remote', { context: b.context }); await b.run(); await a.run();
  const deleted = [await a.db.projects.count(), await b.db.projects.count()];
  // A delayed listing returning only the oldest snapshot cannot resurrect a deleted head.
  const saved = [...backend.files.entries()]; backend.files.clear(); backend.files.set(...saved[0]); await b.run('pull');
  const stillDeleted = await b.db.projects.count();
  backend.files.clear(); await a.db.projects.put({ id: 'other', name: 'Local only' }); await a.run('pull');
  return { conflicts: outcome.conflicts.length, deleted, stillDeleted, localOnly: !!await a.db.projects.get('other') };
 });
 expect(result).toEqual({ conflicts: 1, deleted: [0,0], stillDeleted: 0, localOnly: true });
});

test('ISS-015 missing ancestry remains a conflict until fetched; deep histories are iterative', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, edit, backend, protocol } = window.rig;
  await create(); await a.run(); await edit(a, 'Descendant'); await a.run();
  const first = [...backend.files.entries()][0]; backend.files.delete(first[0]);
  const incomplete = await b.run('pull'); const countBefore = await b.db.projects.count();
  backend.files.set(...first); await b.run('pull');
  const chain = new Map(); for (let index = 0; index < 20000; index++) chain.set(String(index), { projectId: 'p', parentRevisionIds: index ? [String(index - 1)] : [] });
  const deep = protocol.completeAncestry('19999', chain); chain.get('0').parentRevisionIds = ['19999'];
  let cycle; try { protocol.completeAncestry('19999', chain); } catch (error) { cycle = error.code; }
  return { incomplete: incomplete.conflicts.length, countBefore, after: (await b.db.projects.get('p')).name, deep, cycle };
 });
 expect(result).toEqual({ incomplete: 1, countBefore: 0, after: 'Descendant', deep: true, cycle: 'CORRUPT_REMOTE' });
});

test('ISS-020 expired legacy deletions without a project retry indefinitely without changing old cloud objects', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, backend } = window.rig;
  await a.db.syncDeletions.put({ projectId: 'gone', provider: 'steam', deletedAt: '2000-01-01T00:00:00.000Z' });
  a.storage.failNext('createFile'); const first = await a.run(); await a.run(); await b.run('pull');
  return { failures: first.failures.length, retained: await a.db.syncDeletions.count(), state: (await b.db.projectState.get('gone'))?.deleted, deletionFiles: [...backend.files.values()].filter(file => file.name.startsWith('mountea-deletion-v2--')).length };
 });
 expect(result).toEqual({ failures: 1, retained: 1, state: true, deletionFiles: 1 });
});

test('ISS-021 draft ancestry can precede a repaired head without applying the incomplete draft', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, repository } = window.rig;
  await create();
  await repository.mutateProject('p', { context: a.context, transform: snapshot => { snapshot.dialogues.push({ id: 'd', projectId: 'p', name: 'Draft' }); } });
  const { prepareLocalizedNodesAndEntries } = await import('/src/lib/localization/stringTable.js');
  await repository.mutateProject('p', { context: a.context, transform: snapshot => {
   snapshot.dialogues[0].localizationSlug = 'draft';
   const prepared = prepareLocalizedNodesAndEntries({ projectId: 'p', dialogueId: 'd', dialogueSlug: 'draft', nodes: [{ id: '00000000-0000-0000-0000-000000000001', dialogueId: 'd', type: 'startNode', data: { displayName: 'Start' } }], locale: 'en', existingEntries: [] });
   snapshot.nodes = prepared.nodes; snapshot.localizedStrings = prepared.entries;
  } });
  const published = await a.run(); const pulled = await b.run('pull');
  return { failures: [...published.failures, ...pulled.failures], nodes: await b.db.nodes.count(), history: await b.db.projectRevisions.count() };
 });
 expect(result).toEqual({ failures: [], nodes: 1, history: 3 });
});

test('ISS-015 keep both creates an independent project with both authored versions', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, edit, protocol } = window.rig;
  await create(); await a.run(); await b.run('pull'); await edit(a, 'Left'); await edit(b, 'Right'); await a.run(); await b.run();
  const conflict = (await b.db.syncConflicts.toArray())[0];
  const resolution = await protocol.resolveRevisionConflict(conflict.id, 'both', { context: b.context });
  return { names: (await b.db.projects.toArray()).map(row => row.name).sort(), copied: !!resolution.copiedProjectId, parents: (await b.db.projectRevisions.get(resolution.revisionId)).parentRevisionIds.length };
 });
 expect(result).toEqual({ names: ['Left (conflict copy)', 'Right'], copied: true, parents: 2 });
});

test('ISS-015 conflict resolution repairs legacy references and localization in selected revision', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, create, protocol } = window.rig;
  const base = await create();
  const legacyRevision = {
   id: 'legacy-remote',
   projectId: 'p',
   parentRevisionIds: [base.revisionId],
   deviceId: 'legacy-device',
   payloadHash: 'legacy',
   operation: 'update',
   createdAt: new Date().toISOString(),
   snapshot: {
    project: { id: 'p', name: 'Legacy Remote', localization: { defaultLocale: 'en', supportedLocales: ['en'] } },
    dialogues: [{ id: 'd', projectId: 'p', name: 'Legacy Dialogue' }],
    categories: [{ id: 'root', projectId: 'p', name: 'Root' }],
    participants: [{ id: 'speaker', projectId: 'p', name: 'Speaker', category: 'Root' }],
    decorators: [],
    conditions: [],
    nodes: [
     { id: '00000000-0000-0000-0000-000000000001', dialogueId: 'd', type: 'startNode', data: { displayName: 'Start' } },
     { id: 'line', dialogueId: 'd', type: 'leadNode', data: { participant: 'Speaker', displayName: 'Line', dialogueRows: [{ id: 'row', participant: 'Speaker', text: 'Hello' }] } },
    ],
    edges: [],
    localizedStrings: [],
   },
  };
  await a.db.projectRevisions.put(legacyRevision);
  await a.db.syncConflicts.put({ id: 'conflict', provider: 'steam', projectId: 'p', localRevisionId: base.revisionId, revisionIds: [base.revisionId, legacyRevision.id], status: 'unresolved', createdAt: new Date().toISOString() });
  const resolved = await protocol.resolveRevisionConflict('conflict', 'remote', { context: a.context });
  const state = await a.db.projectState.get('p');
  const node = await a.db.nodes.get(['d', 'line']);
  const participant = await a.db.participants.get('speaker');
  const strings = await a.db.localizedStrings.where('projectId').equals('p').toArray();
  return { resolved: !!resolved.revisionId, conflictStatus: (await a.db.syncConflicts.get('conflict')).status, state: state.revisionId === resolved.revisionId, participantId: node.data.participantId, rowParticipantId: node.data.dialogueRows[0].participantId, categoryId: participant.categoryId, keyCount: strings.length, rowKey: node.data.dialogueRows[0].textKey };
 });
 expect(result).toMatchObject({ resolved: true, conflictStatus: 'resolved', state: true, participantId: 'speaker', rowParticipantId: 'speaker', categoryId: 'root', keyCount: 4 });
 expect(result.rowKey).toMatch(/^dlg\.legacy_dialogue\.n_.+\.r_.+\.text$/);
});

test('ISS-021 offline restart and local acknowledgement quota retry exact uploaded revisions', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, create, protocol, backend } = window.rig;
  const created = await create(); a.storage.failNext('listFiles', { message: 'Offline' });
  let offline; try { await a.run(); } catch (error) { offline = error.message; }
  const fail = modifications => { if (modifications.status === 'acknowledged') throw new Error('Quota exceeded'); };
  a.db.syncOutbox.hook('updating', fail); const quota = await a.run(); a.db.syncOutbox.hook('updating').unsubscribe(fail);
  const pending = (await a.db.syncOutbox.get(`delivery:steam:${created.revisionId}`)).status;
  a.db.close(); await a.db.open(); await protocol.syncRevisions(a.options);
  return { offline, failures: quota.failures.length, pending, acknowledged: (await a.db.syncOutbox.get(`delivery:steam:${created.revisionId}`)).status, files: backend.files.size };
 });
 expect(result).toEqual({ offline: 'Offline', failures: 1, pending: 'pending', acknowledged: 'acknowledged', files: 1 });
});

test('ISS-015 legacy Steam encryption is read with historical profile key and old object stays untouched', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, create, backend, edit } = window.rig;
  const revision = await create(); await a.db.projects.clear(); await a.db.projectState.clear(); await a.db.projectRevisions.clear(); await a.db.syncOutbox.clear();
  const { encryptPayload } = await import('/src/lib/sync/crypto.js');
  const content = JSON.stringify(await encryptPayload(`auto:steam:${a.context.profileId}:v1`, revision.snapshot));
  const legacy = await a.storage.createFile({ name: 'mountea-project-p.mnteasnap', content });
  await a.run('pull'); await edit(a, 'Migrated'); await a.run();
  return { name: (await a.db.projects.get('p')).name, untouched: backend.files.get(legacy.id).content === content, newFiles: [...backend.files.values()].filter(file => file.name.startsWith('mountea-revision-v2--')).length, writes: backend.calls.filter(call => ['updateFile', 'deleteFile'].includes(call.method)).length };
 });
 expect(result).toEqual({ name: 'Migrated', untouched: true, newFiles: 2, writes: 0 });
});

test('ISS-019 store list and pull honor read-only transport modes and full mode drains offline intent', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, create, backend } = window.rig;
  const { useSyncStore } = await import('/src/stores/syncStore.js');
  await create(); useSyncStore.setState({ provider: 'steam', status: 'connected', syncMode: 'full' });
  await useSyncStore.getState().syncAllProjects({ mode: 'list', storage: a.storage });
  await useSyncStore.getState().syncAllProjects({ mode: 'pull', storage: a.storage });
  const before = backend.files.size;
  await useSyncStore.getState().syncAllProjects({ mode: 'full', storage: a.storage });
  return { before, after: backend.files.size, status: useSyncStore.getState().status, error: useSyncStore.getState().error };
 });
 expect(result).toEqual({ before: 0, after: 1, status: 'connected', error: null });
});

test('ISS-015 globally mounted conflict controls resolve locally deleted project versus remote edit', async ({ page }) => {
 await setup(page);
 await page.evaluate(async () => {
  const { a, b, create, edit, repository } = window.rig;
  await create(); await a.run(); await b.run('pull');
  await repository.mutateProject('p', { context: a.context, operation: 'delete' }); await edit(b, 'Remote surviving edit'); await b.run(); await a.run();
  await import('/src/i18n/index.js');
  const { default: React } = await import('/node_modules/.vite/deps/react.js');
  const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
  const { SyncConflictPanel } = await import('/src/components/sync/SyncConflictPanel.jsx');
  const mount = document.createElement('div'); document.body.appendChild(mount); createRoot(mount).render(React.createElement(SyncConflictPanel));
 });
 await expect(page.getByRole('complementary', { name: 'Synchronization conflicts' })).toBeVisible();
 await page.getByRole('button', { name: 'Keep remote', exact: true }).click();
 await expect(page.getByRole('complementary', { name: 'Synchronization conflicts' })).toHaveCount(0);
 const result = await page.evaluate(async () => { const { a } = window.rig; return { name: (await a.db.projects.get('p')).name, conflicts: await a.db.syncConflicts.where('status').equals('unresolved').count() }; });
 expect(result).toEqual({ name: 'Remote surviving edit', conflicts: 0 });
});

// Real revisions and provider conflicts; only malformed-history tests edit records directly.
async function panelConflict(page, { content = false, three = false, deleted = false, sameTime = false } = {}) {
 await setup(page);
 await page.clock.setFixedTime(new Date('2026-03-29T00:59:59Z'));
 await page.evaluate(async ({ content, deleted }) => {
  const { a, b, create, repository } = window.rig;
  await create(a, 'Shared name');
  await repository.mutateProject('p', { context: a.context, transform: snapshot => { snapshot.project.modifiedAt = '2000-01-01T00:00:00Z'; } });
  await a.run(); await b.run('pull');
  window.panelBase = await repository.readProjectState('p', a.context);
  if (content) {
   const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
   const dialogue = await useDialogueStore.getState().createDialogue({ projectId: 'p', name: 'Local dialogue' });
   await useDialogueStore.getState().saveDialogueGraph(dialogue.id, [
    { id: '00000000-0000-0000-0000-000000000001', type: 'startNode', position: { x: 0, y: 0 }, data: { displayName: 'Start' } },
    { id: 'end', type: 'completeNode', position: { x: 300, y: 0 }, data: { displayName: 'Local ending' } },
   ], [{ id: 'edge', source: '00000000-0000-0000-0000-000000000001', target: 'end', type: 'conditionEdge', data: { conditions: { mode: 'all', rules: [] } } }], { x: 0, y: 0, zoom: 1 });
  } else {
   await repository.mutateProject('p', { context: a.context, operation: deleted ? 'delete' : 'update', transform: snapshot => { snapshot.project.description = 'local'; } });
  }
 }, { content, deleted });
 if (!sameTime) await page.clock.setFixedTime(new Date('2026-03-29T01:00:01Z'));
 const state = await page.evaluate(async ({ content, three }) => {
  const { a, b, repository } = window.rig;
  await repository.mutateProject('p', { context: b.context, transform: snapshot => {
   snapshot.project.description = 'remote';
   if (content) for (let index = 0; index < 2; index++) {
    const id = `remote-${index}`;
    snapshot.dialogues.push({ id, projectId: 'p', name: `Remote ${index}` });
    snapshot.nodes.push(
     { id: '00000000-0000-0000-0000-000000000001', dialogueId: id, type: 'startNode', position: { x: 0, y: 0 }, data: { displayName: 'Start' } },
     { id: 'end', dialogueId: id, type: 'completeNode', position: { x: 300, y: 0 }, data: { displayName: 'End' } },
    );
    snapshot.edges.push({ id: 'edge', dialogueId: id, source: '00000000-0000-0000-0000-000000000001', target: 'end', type: 'conditionEdge', data: { conditions: { mode: 'all', rules: [] } } });
   }
  } });
  await b.run();
  if (three) {
   const current = await repository.readProjectState('p', a.context);
   const third = structuredClone(window.panelBase.snapshot); third.project.description = 'third';
   await repository.commitPreparedProject(await repository.prepareProjectCommit(third, { context: a.context, expectedSequence: current.sequence, parentRevisionIds: [window.panelBase.revisionId] }));
  }
  await a.run(); await a.run();
  const conflict = (await a.db.syncConflicts.where('status').equals('unresolved').toArray()).find(row => row.revisionIds.length === (three ? 3 : 2));
  const revisions = await a.db.projectRevisions.bulkGet(conflict.revisionIds);
  revisions.sort((left, right) => left.id === conflict.localRevisionId ? -1 : right.id === conflict.localRevisionId ? 1 : left.id < right.id ? -1 : 1);
  return { conflictId: conflict.id, localId: conflict.localRevisionId, revisions: revisions.map(row => ({ id: row.id, createdAt: row.createdAt, operation: row.operation, description: row.snapshot.project.description, projectStamp: row.snapshot.project.modifiedAt })) };
 }, { content, three });
 await page.evaluate(async () => {
  await import('/src/index.css');
  await import('/src/i18n/index.js');
  const { default: React } = await import('/node_modules/.vite/deps/react.js');
  const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
  const { SyncConflictPanel } = await import('/src/components/sync/SyncConflictPanel.jsx');
  const mount = document.createElement('div'); document.body.appendChild(mount); createRoot(mount).render(React.createElement(SyncConflictPanel));
 });
 const section = page.locator(`[data-conflict-id="${state.conflictId}"]`);
 await expect(section.getByTestId('conflict-summary').locator('li')).toHaveCount(three ? 3 : 2);
 return { ...state, section };
}

async function expectedStamp(page, value, language) {
 return page.evaluate(({ value, language }) => new Intl.DateTimeFormat(language, {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
 }).format(new Date(value)), { value, language });
}

for (const timezoneId of ['Europe/Prague', 'UTC']) test.describe(`conflict dates in ${timezoneId}`, () => {
 test.use({ locale: 'en-US', timezoneId });
 test('normal dialogue edits show revision timestamps, timezone, and exact per-version counts', async ({ page }) => {
  const state = await panelConflict(page, { content: true });
  for (const [index, revision] of state.revisions.entries()) {
   const row = state.section.locator(`[data-revision-id="${revision.id}"]`);
   expect(revision.projectStamp).toBe('2000-01-01T00:00:00Z');
   await expect(row.locator('time')).toHaveAttribute('datetime', revision.createdAt);
   await expect(row.locator('time')).toHaveText(await expectedStamp(page, revision.createdAt, 'en'));
   await expect(row).toContainText(index === 0 ? '1 dialogue · 2 nodes' : '2 dialogues · 4 nodes');
  }
  await expect(state.section.getByRole('button', { name: 'Keep both projects', exact: true })).toBeVisible();
 });
});

test('numbered summaries map identical competing versions to the exact selected revision', async ({ page }) => {
 const state = await panelConflict(page, { three: true, sameTime: true });
 const selector = state.section.getByRole('combobox');
 for (const [index, revision] of state.revisions.entries()) {
  const row = state.section.locator(`[data-revision-id="${revision.id}"]`);
  const label = await row.locator('strong').textContent();
  expect(label).toBe(`Version ${index + 1} · Shared name · ${index === 0 ? 'This browser' : 'Server / other device'}`);
  if (index > 0) await expect(selector.locator('option').filter({ hasText: label })).toHaveAttribute('value', revision.id);
 }
 const chosen = state.revisions[2];
 await selector.focus(); await page.keyboard.press('End'); await page.keyboard.press('Enter');
 await expect(selector).toHaveValue(chosen.id);
 await state.section.getByRole('button', { name: 'Keep remote', exact: true }).click();
 await expect.poll(() => page.evaluate(async () => (await window.rig.a.db.projects.get('p')).description)).toBe(chosen.description);
});

for (const [three, deleted] of [[false, false], [true, false], [true, true]]) test(`keep ${three ? 'all' : 'both'} preserves every live version${deleted ? ' with a competing deletion' : ''}`, async ({ page }) => {
 const state = await panelConflict(page, { three, deleted });
 await state.section.getByRole('button', { name: three ? 'Keep all versions' : 'Keep both projects', exact: true }).click();
 await expect.poll(() => page.evaluate(async () => (await window.rig.a.db.projects.toArray()).map(row => row.description).sort())).toEqual(deleted ? ['remote', 'third'] : three ? ['local', 'remote', 'third'] : ['local', 'remote']);
});

test('deletion versions have a timestamp and no content counts; keep both preserves the surviving edit', async ({ page }) => {
 const state = await panelConflict(page, { deleted: true });
 const deleted = state.revisions.find(row => row.operation === 'delete');
 const row = state.section.locator(`[data-revision-id="${deleted.id}"]`);
 await expect(row).toContainText('Deleted project');
 await expect(row.locator('time')).toHaveAttribute('datetime', deleted.createdAt);
 await expect(row.locator('p')).toHaveCount(0);
 await state.section.getByRole('button', { name: 'Keep both projects', exact: true }).click();
 await expect.poll(() => page.evaluate(async () => (await window.rig.a.db.projects.toArray()).map(project => project.description))).toEqual(['remote']);
});

test('invalid and absent revision dates show localized unknown text rather than project dates', async ({ page }) => {
 const state = await panelConflict(page);
 await page.evaluate(async revisions => {
  const db = window.rig.a.db;
  await db.projectRevisions.update(revisions[0].id, { createdAt: null });
  await db.projectRevisions.update(revisions[1].id, { createdAt: 'not-a-date' });
  await (await import('/src/i18n/index.js')).default.changeLanguage('cs');
 }, state.revisions);
 await expect(state.section.getByText('Neznámé datum', { exact: true })).toHaveCount(2);
 await expect(state.section.locator('time')).toHaveCount(0);
});

test('missing expected revisions and explicit incomplete history prevent resolution', async ({ page }) => {
 const state = await panelConflict(page);
 await page.evaluate(async id => {
  const db = window.rig.a.db;
  window.missingPanelRevision = await db.projectRevisions.get(id);
  await db.projectRevisions.delete(id);
 }, state.revisions[1].id);
 await expect(page.getByText('Some revision history is unavailable. Synchronize again before resolving.', { exact: true })).toBeVisible();
 await expect(page.getByRole('button', { name: /^Keep / })).toHaveCount(0);
 await page.evaluate(async id => {
  const db = window.rig.a.db;
  await db.transaction('rw', db.projectRevisions, db.syncConflicts, async () => {
   await db.projectRevisions.put(window.missingPanelRevision);
   await db.syncConflicts.update(id, { incomplete: true });
  });
 }, state.conflictId);
 await expect(page.getByText('Some revision history is unavailable. Synchronize again before resolving.', { exact: true })).toBeVisible();
 await expect(page.getByRole('combobox')).toHaveCount(0);
});

test('an unavailable saved selection falls back to the first remaining competing revision', async ({ page }) => {
 const state = await panelConflict(page, { three: true });
 const selector = state.section.getByRole('combobox');
 await selector.selectOption(state.revisions[2].id);
 await page.evaluate(async ({ conflictId, revisions }) => {
  await window.rig.a.db.syncConflicts.update(conflictId, { revisionIds: revisions.slice(0, 2).map(row => row.id) });
 }, { conflictId: state.conflictId, revisions: state.revisions });
 await expect(selector).toHaveValue(state.revisions[1].id);
 await state.section.getByRole('button', { name: 'Keep remote', exact: true }).click();
 await expect.poll(() => page.evaluate(async () => (await window.rig.a.db.projects.get('p')).description)).toBe(state.revisions[1].description);
});

test('all six languages reformat the mounted panel and provide integer count plurals', async ({ page }) => {
 const state = await panelConflict(page, { content: true });
 const languages = JSON.parse(await readFile(new URL('../../electron/shared/app-languages.json', import.meta.url), 'utf8'));
 for (const { code } of languages) {
  const copy = JSON.parse(await readFile(new URL(`../../src/i18n/locales/${code}.json`, import.meta.url), 'utf8')).syncConflicts;
  for (const key of ['versionLabel', 'description', 'hint', 'unknownDate', 'revisionDetails', 'keepAll']) {
   expect(copy[key]).not.toMatch(/[?\uFFFD]/);
  }
  await page.evaluate(async code => { await (await import('/src/i18n/index.js')).default.changeLanguage(code); }, code);
  await expect(page.getByRole('complementary')).toHaveAccessibleName(copy.title);
  await expect(state.section.getByText(copy.hint, { exact: true })).toBeVisible();
  await expect(state.section.locator('strong').first()).toHaveText(copy.versionLabel.replace('{{number}}', '1').replace('{{name}}', 'Shared name').replace('{{source}}', copy.thisBrowser));
  await expect(state.section.locator('time').first()).toHaveText(await expectedStamp(page, state.revisions[0].createdAt, code));
  for (const [index, counts] of [[0, [1, 2]], [1, [2, 4]]]) {
   const text = ['dialogueCount', 'nodeCount'].map((field, fieldIndex) => {
    const count = counts[fieldIndex];
    return copy[`${field}_${new Intl.PluralRules(code).select(count)}`].replace('{{count}}', String(count));
   }).join(' · ');
   await expect(state.section.locator('li').nth(index).locator('p')).toHaveText(text);
  }
  for (const field of ['dialogueCount', 'nodeCount']) for (const count of [0, 1, 2, 5, 21, 1000000]) {
   const plural = new Intl.PluralRules(code).select(count);
   expect(copy[`${field}_${plural}`]).toBeTruthy();
   const actual = await page.evaluate(async ({ field, count }) => (await import('/src/i18n/index.js')).default.t(`syncConflicts.${field}`, { count }), { field, count });
   expect(actual).toBe(copy[`${field}_${plural}`].replace('{{count}}', String(count)));
  }
 }
});

test('long version names and full IDs wrap at a narrow viewport and details open by keyboard', async ({ page }) => {
 const state = await panelConflict(page);
 const longId = `revision-${'x'.repeat(180)}`;
 await page.evaluate(async ({ state, longId }) => {
  const db = window.rig.a.db;
  const remote = await db.projectRevisions.get(state.revisions[1].id);
  remote.id = longId; remote.snapshot.project.name = 'A'.repeat(180);
  await db.projectRevisions.put(remote);
  await db.syncConflicts.update(state.conflictId, { revisionIds: [state.localId, longId] });
 }, { state: { revisions: state.revisions, conflictId: state.conflictId, localId: state.localId }, longId });
 await page.setViewportSize({ width: 360, height: 740 });
 const row = page.locator(`[data-revision-id="${longId}"]`);
 await expect(row).toBeVisible();
 await row.locator('summary').focus(); await page.keyboard.press('Enter');
 await expect(row.locator('details')).toHaveAttribute('open', '');
 await expect(row.locator('code')).toHaveText(longId);
 expect(await page.getByRole('complementary').evaluate(panel => panel.scrollWidth <= panel.clientWidth)).toBe(true);
});

test('ISS-015 stale conflict choices cannot replace a newer local edit', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, edit, protocol } = window.rig;
  await create(); await a.run(); await b.run('pull'); await edit(a, 'Left'); await edit(b, 'Right'); await b.run(); await a.run();
  const conflict = (await a.db.syncConflicts.toArray())[0]; const newer = await edit(a, 'Newer unsynchronized edit');
  let code; try { await protocol.resolveRevisionConflict(conflict.id, 'remote', { context: a.context }); } catch (error) { code = error.code; }
  return { code, name: (await a.db.projects.get('p')).name, revision: (await a.db.projectState.get('p')).revisionId, expected: newer.revisionId };
 });
 expect(result.code).toBe('STALE_CONFLICT'); expect(result.name).toBe('Newer unsynchronized edit'); expect(result.revision).toBe(result.expected);
});

test('ISS-015 immutable names bind arbitrary identity tuples within native filename limits', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { revisionFileName } = window.rig.protocol;
  return { left: await revisionFileName('a', 'b--c'), right: await revisionFileName('a--b', 'c'), long: await revisionFileName('x'.repeat(2000), 'y'.repeat(2000)) };
 });
 expect(result.left).not.toBe(result.right); expect(result.long.length).toBeLessThan(255);
});

test('ISS-021 Google encryption preserves exact media while acknowledgements remain provider specific', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, repository, protocol, backend } = window.rig;
  await create(); await a.run();
  const { prepareLocalizedNodesAndEntries } = await import('/src/lib/localization/stringTable.js');
  await repository.mutateProject('p', { context: a.context, transform: snapshot => {
   snapshot.project.name = 'Encrypted'; snapshot.dialogues = [{ id: 'd', projectId: 'p', name: 'Graph', localizationSlug: 'graph' }];
   const prepared = prepareLocalizedNodesAndEntries({ projectId: 'p', dialogueId: 'd', dialogueSlug: 'graph', nodes: [{ id: '00000000-0000-0000-0000-000000000001', dialogueId: 'd', type: 'startNode', data: { displayName: 'Start' } }, { id: 'line', dialogueId: 'd', type: 'leadNode', data: { displayName: 'Line', selectionTitle: '', dialogueRows: [{ id: 'row', text: 'Spoken', audioFile: { name: 'voice.wav', mimeType: 'audio/wav', blob: new Blob([new Uint8Array([0,255,1,127])], { type: 'audio/wav' }) } }] } }], locale: 'en', existingEntries: [] }); snapshot.nodes = prepared.nodes; snapshot.localizedStrings = prepared.entries;
  } });
  const { createProviderBackend } = await import('/tests/e2e/helpers/providerFake.js'); const google = createProviderBackend();
  const passphrase = 'test-only-secret'; const options = { provider: 'googleDrive', passphrase };
  const pushed = await protocol.syncRevisions({ ...options, context: a.context, storage: google.createClient('a') });
  const pulled = await protocol.syncRevisions({ ...options, context: b.context, storage: google.createClient('b'), mode: 'pull' });
  const media = (await b.db.nodes.get(['d','line']))?.data.dialogueRows[0].audioFile.base64;
  return { media, failures: [...pushed.failures, ...pulled.failures], name: (await b.db.projects.get('p'))?.name, encrypted: [...google.files.values()].every(file => !file.content.includes('Encrypted') && !!JSON.parse(file.content).encrypted), steamFiles: backend.files.size, googleFiles: google.files.size, providers: [...new Set((await a.db.syncOutbox.toArray()).map(row => row.provider).filter(Boolean))].sort() };
 });
 expect(result).toEqual({ media: 'data:audio/wav;base64,AP8Bfw==', failures: [], name: 'Encrypted', encrypted: true, steamFiles: 1, googleFiles: 2, providers: ['googleDrive','steam'] });
});

test('ISS-020 dialogue deletion cannot be reversed by an older snapshot and concurrent edits retain both heads', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, edit, repository, backend } = window.rig;
  await create();
  const { prepareLocalizedNodesAndEntries } = await import('/src/lib/localization/stringTable.js');
  await repository.mutateProject('p', { context: a.context, transform: snapshot => {
   snapshot.dialogues = [{ id: 'd', projectId: 'p', name: 'Graph', localizationSlug: 'graph' }];
   const prepared = prepareLocalizedNodesAndEntries({ projectId: 'p', dialogueId: 'd', dialogueSlug: 'graph', nodes: [{ id: '00000000-0000-0000-0000-000000000001', dialogueId: 'd', type: 'startNode', data: { displayName: 'Start' } }], locale: 'en', existingEntries: [] }); snapshot.nodes = prepared.nodes; snapshot.localizedStrings = prepared.entries;
  } });
  await a.run(); await b.run('pull');
  const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
  const beforeDelete = { head: (await a.db.projectState.get('p')).revisionId, outbox: await a.db.syncOutbox.count(), nodes: await a.db.nodes.count() };
  const quota = () => { throw new Error('Injected outbox quota'); };
  a.db.syncOutbox.hook('creating', quota); let rejected = false;
  try { await useDialogueStore.getState().deleteDialogue('d'); } catch { rejected = true; }
  a.db.syncOutbox.hook('creating').unsubscribe(quota);
  const rolledBack = rejected && !!await a.db.dialogues.get('d') && (await a.db.projectState.get('p')).revisionId === beforeDelete.head && await a.db.syncOutbox.count() === beforeDelete.outbox && await a.db.nodes.count() === beforeDelete.nodes;
  await useDialogueStore.getState().deleteDialogue('d');
  await edit(b, 'Concurrent edit'); await a.run(); const outcome = await b.run();
  const files = [...backend.files.entries()]; backend.files.clear(); for (const [key, value] of files.slice(0,2)) backend.files.set(key,value);
  await a.run('pull');
  return { rolledBack, conflicts: outcome.conflicts.length, localDialogues: await a.db.dialogues.count(), remoteDialogues: await b.db.dialogues.count(), revisions: await a.db.projectRevisions.count() };
 });
 expect(result.rolledBack).toBe(true); expect(result.conflicts).toBe(1); expect(result.localDialogues).toBe(0); expect(result.remoteDialogues).toBe(1); expect(result.revisions).toBeGreaterThanOrEqual(3);
});

test('ISS-015 three competing heads keep every authored version and acknowledge every parent', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, b, create, edit, protocol, repository } = window.rig;
  await create(); await a.run(); await b.run('pull');
  const current = await repository.readProjectState('p', a.context);
  const left = await edit(a, 'Left'); await edit(b, 'Right'); await b.run();
  const third = structuredClone(current.snapshot); third.project.name = 'Third';
  const prepared = await repository.prepareProjectCommit(third, { context: a.context, expectedSequence: left.sequence, parentRevisionIds: [current.revisionId] });
  await repository.commitPreparedProject(prepared); await a.run(); await a.run();
  const conflict = (await a.db.syncConflicts.where('status').equals('unresolved').toArray()).find(row => row.revisionIds.length === 3);
  const resolved = await protocol.resolveRevisionConflict(conflict.id, 'both', { context: a.context });
  await a.run(); await b.run();
  return { parents: (await a.db.projectRevisions.get(resolved.revisionId)).parentRevisionIds.length, names: (await a.db.projects.toArray()).map(row => row.name).sort(), conflicts: await b.db.syncConflicts.where('status').equals('unresolved').count() };
 });
 expect(result).toEqual({ parents: 3, names: ['Left (conflict copy)', 'Right (conflict copy)', 'Third'], conflicts: 0 });
});

test('ISS-025 profile change during upload cannot acknowledge the old operation in the new profile', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, create, backend } = window.rig; const created = await create();
  const release = a.storage.holdNext('createFile'); const running = a.run();
  while (!backend.calls.some(call => call.method === 'createFile')) await new Promise(resolve => setTimeout(resolve, 0));
  const { setActiveProfileId } = await import('/src/lib/profile/activeProfile.js'); setActiveProfileId('next-profile'); release();
  let code; try { await running; } catch (failure) { code = failure.code; }
  const { getRepositoryContext } = await import('/src/lib/db.js'); const next = await getRepositoryContext();
  return { code, oldStatus: (await a.db.syncOutbox.get(`delivery:steam:${created.revisionId}`)).status, nextOutbox: await next.db.syncOutbox.count(), nextProjects: await next.db.projects.count() };
 });
 expect(result).toEqual({ code: 'STALE_PROFILE', oldStatus: 'pending', nextOutbox: 0, nextProjects: 0 });
});

test('ISS-021 queue counts exact provider deliveries without counting retained base intents forever', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, create, edit, protocol } = window.rig;
  const first = await create();
  await a.db.syncOutbox.update(first.revisionId, { createdAt: '2000-01-01T00:00:00.000Z' });
  const queued = await protocol.getRevisionQueueStatus('steam', a.context);
  const fail = modifications => { if (modifications.status === 'acknowledged') throw Object.assign(new Error('Quota exceeded'), { code: 'QUOTA' }); };
  a.db.syncOutbox.hook('updating', fail); await a.run(); a.db.syncOutbox.hook('updating').unsubscribe(fail);
  const uploaded = await protocol.getRevisionQueueStatus('steam', a.context);
  await a.run(); const verified = await protocol.getRevisionQueueStatus('steam', a.context);
  const second = await edit(a, 'Newest'); const changed = await protocol.getRevisionQueueStatus('steam', a.context);
  const google = await protocol.getRevisionQueueStatus('googleDrive', a.context);
  await a.db.syncConflicts.put({ id: 'conflict', projectId: 'p', provider: 'steam', status: 'unresolved', revisionIds: [first.revisionId, second.revisionId] });
  const conflict = await protocol.getRevisionQueueStatus('steam', a.context);
  return { queued, uploaded, verified, changed, google, conflicts: conflict.conflicts, baseIntents: await a.db.syncOutbox.filter(row => !row.provider).count(), privateData: JSON.stringify(conflict).includes('Newest') };
 });
 expect(result.queued).toMatchObject({ queued: 1, uploaded: 0, verified: 0, pending: 1 }); expect(result.queued.oldestPendingAgeMs).toBeGreaterThan(60000);
 expect(result.uploaded).toMatchObject({ queued: 0, uploaded: 1, verified: 0, pending: 1, errorCodes: ['QUOTA'] });
 expect(result.verified).toEqual({ queued: 0, uploaded: 0, verified: 1, pending: 0, oldestPendingAgeMs: 0, conflicts: 0, errorCodes: [] });
 expect(result.changed).toMatchObject({ queued: 1, verified: 1, pending: 1 }); expect(result.google).toMatchObject({ queued: 2, verified: 0, pending: 2 });
 expect(result.conflicts).toBe(1); expect(result.baseIntents).toBe(2); expect(result.privateData).toBe(false);
});

test('ISS-021 mounted retry worker drains offline intent, bounds busy reconnects and stops cleanly', async ({ page }) => {
 await setup(page); await page.clock.install();
 await page.evaluate(async () => {
  const { a, create } = window.rig; await create();
  const { useSyncStore, startSyncRetryWorker } = await import('/src/stores/syncStore.js');
  useSyncStore.setState({ provider: 'steam', status: 'connected', syncMode: 'full' });
  a.storage.failNext('listFiles', { message: 'Offline' });
  window.retryStore = useSyncStore;
  window.stopRetry = startSyncRetryWorker({ syncOptions: { storage: a.storage } });
  window.dispatchEvent(new Event('online'));
 });
 await expect.poll(() => page.evaluate(() => window.retryStore.getState().status)).toBe('error');
 await page.evaluate(() => { window.rig.release = window.rig.a.storage.holdNext('createFile'); });
 // An online attempt can fall just after an interval boundary, so allow the
 // next eligible interval while the first upload is deliberately held.
 await page.clock.runFor(60000);
 await expect.poll(() => page.evaluate(() => window.rig.backend.calls.filter(call => call.method === 'createFile').length)).toBe(1);
 await page.evaluate(async () => { await window.rig.edit(window.rig.a, 'Edited during retry'); for (let index = 0; index < 20; index++) window.dispatchEvent(new Event('online')); });
 await page.clock.runFor(120000);
 expect(await page.evaluate(() => window.rig.backend.calls.filter(call => call.method === 'createFile').length)).toBe(1);
 await page.evaluate(() => window.rig.release());
 await expect.poll(() => page.evaluate(() => window.retryStore.getState().status)).toBe('connected');
 await page.clock.runFor(30000);
 await expect.poll(() => page.evaluate(() => window.retryStore.getState().queueState?.pending)).toBe(0);
 expect(await page.evaluate(() => window.rig.backend.files.size)).toBe(2);
 const calls = await page.evaluate(() => { window.stopRetry(); return window.rig.backend.calls.length; });
 await page.clock.runFor(90000); await page.evaluate(() => window.dispatchEvent(new Event('online')));
 expect(await page.evaluate(() => window.rig.backend.calls.length)).toBe(calls);
});

test('ISS-025 profile cancellation settles a hung provider without waiting for its reply', async ({ page }) => {
 await setup(page);
 const result = await page.evaluate(async () => {
  const { a, create, backend } = window.rig; await create();
  const release = a.storage.holdNext('listFiles'); const running = a.run().catch(failure => failure.code);
  while (!backend.calls.some(call => call.method === 'listFiles')) await new Promise(resolve => setTimeout(resolve, 0));
  const { setActiveProfileId } = await import('/src/lib/profile/activeProfile.js'); setActiveProfileId('cancelled-profile');
  const code = await running; release();
  return { code, writes: backend.calls.filter(call => call.method === 'createFile').length };
 });
 expect(result).toEqual({ code: 'STALE_PROFILE', writes: 0 });
});
