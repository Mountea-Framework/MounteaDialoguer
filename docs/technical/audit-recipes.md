# Executed audit recipes

These scripts were executed for the [verification record](verification.md). They require existing npm dependencies and installed Playwright Chromium. Save each JavaScript block as a separate `.mjs` file under repository `tmp` and run from the repository root with `node tmp/<filename>.mjs`. Run sequentially: both use port 4189. They create a disposable browser context, block external requests, and delete only synthetic databases. Do not transplant destructive fixtures into a normal user browser console/profile.

These are investigation reproducers with captured observations, not passing regression assertions or a replacement for CI tests. Random IDs/timestamps vary. No credentials are required.

## Main import, persistence, and snapshot audit

```javascript
import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const server = await createServer({ server: { host: '127.0.0.1', port: 4189, strictPort: true }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/documentation-audit') return route.fulfill({ contentType: 'text/html', body: '<html><body>Isolated documentation audit</body></html>' });
    return route.continue();
  });
  await page.goto('http://127.0.0.1:4189/documentation-audit');
  const results = await page.evaluate(async () => {
    const { default: RefreshRuntime } = await import('/@react-refresh');
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    localStorage.setItem('mountea-active-profile-id', 'documentation-audit');
    const { db, MounteaDialoguerDB } = await import('/src/lib/db.js');
    const { useDialogueStore } = await import('/src/stores/dialogueStore.js');
    const { useProjectStore } = await import('/src/stores/projectStore.js');
    const { useCategoryStore } = await import('/src/stores/categoryStore.js');
    const { useParticipantStore } = await import('/src/stores/participantStore.js');
    const { buildProjectSnapshot, applyProjectSnapshotAsNew, applyProjectSnapshot } = await import('/src/lib/sync/snapshot.js');
    const strings = await import('/src/lib/localization/stringTable.js');
    const { encryptPayload, decryptPayload } = await import('/src/lib/sync/crypto.js');
    const { default: JSZip } = await import('/node_modules/.vite/deps/jszip.js');
    const { default: Dexie } = await import('/node_modules/.vite/deps/dexie.js');
    const findings = {};
    const start = '00000000-0000-0000-0000-000000000001';
    const now = new Date().toISOString();
    const project = id => ({ id, name: id, createdAt: now, modifiedAt: now, localization: { defaultLocale: 'en', supportedLocales: ['en'] } });
    const node = (id, type = 'leadNode', data = {}) => ({ id, type, position: { x: 0, y: 0 }, data: { displayName: id, ...data } });
    const makeArchive = async (id, nodes, edges = [], extra = {}) => {
      const zip = new JSZip();
      for (const [name, value] of Object.entries({ 'dialogueData.json': { dialogueGuid: id, dialogueName: id }, 'nodes.json': nodes, 'edges.json': edges, ...extra })) zip.file(name, JSON.stringify(value));
      return new File([await zip.generateAsync({ type: 'blob' })], `${id}.mnteadlg`);
    };
    await db.projects.bulkAdd([project('p1'), project('p2')]);
    await useDialogueStore.getState().importDialogue('p1', await makeArchive('d1', [node(start, 'startNode'), node('n1'), node('obsolete')], [{ id: 'e', source: start, target: 'n1', type: 'conditionEdge', data: { conditions: { mode: 'all', rules: [{ id: 'cond', name: 'Check', values: { value: 3 } }] } } }], { 'conditions.json': [{ id: 'cond', name: 'Check', properties: [{ name: 'value', type: 'number', defaultValue: 3 }] }], 'decorators.json': [{ id: 'dec', name: 'Effect', type: 'effect', properties: [{ name: 'amount', type: 'number', defaultValue: 4 }] }] }));
    findings.importConditions = { edge: await db.edges.where('dialogueId').equals('d1').first(), definitions: await db.conditions.toArray(), decorators: await db.decorators.toArray() };
    await useDialogueStore.getState().importDialogue('p1', await makeArchive('d1', [node(start, 'startNode'), node('n1')]));
    findings.importStaleNodes = (await db.nodes.where('dialogueId').equals('d1').toArray()).map(n => n.id);
    await useDialogueStore.getState().importDialogue('p2', await makeArchive('d1', [node(start, 'startNode'), node('n1')]));
    findings.crossProjectImport = { owner: (await db.dialogues.get('d1')).projectId, firstProjectDialogues: await db.dialogues.where('projectId').equals('p1').count() };
    findings.failedImportReturn = String(await useDialogueStore.getState().importDialogue('p1', await makeArchive('broken', [node('no-start')])));
    const parent = await useCategoryStore.getState().createCategory({ projectId: 'p1', name: 'Root' });
    const child = await useCategoryStore.getState().createCategory({ projectId: 'p1', name: 'Child', parentCategoryId: parent.id });
    await useCategoryStore.getState().updateCategory(parent.id, { parentCategoryId: child.id });
    findings.categoryCycle = { root: (await db.categories.get(parent.id)).parentCategoryId, child: (await db.categories.get(child.id)).parentCategoryId };
    await db.categories.update(parent.id, { parentCategoryId: null });
    try { await useCategoryStore.getState().importCategories('p1', [{ fullPath: 'Root.Child.Grandchild' }]); findings.categorySharedPath = 'accepted'; } catch (e) { findings.categorySharedPath = e.message; }
    const part = await useParticipantStore.getState().createParticipant({ projectId: 'p1', name: 'Speaker', category: 'Child' });
    await db.nodes.put({ ...node('ref', 'leadNode', { participant: 'Speaker' }), dialogueId: 'd-ref' });
    await useParticipantStore.getState().updateParticipant(part.id, { name: 'Renamed' });
    findings.renameParticipantReference = (await db.nodes.get(['d-ref', 'ref'])).data.participant;
    await useCategoryStore.getState().deleteCategory(parent.id);
    findings.deleteCategoryOrphan = (await db.categories.get(child.id)).parentCategoryId;
    await db.dialogues.put({ id: 'snap-a', name: 'Snapshot', projectId: 'p1', localizationSlug: 'snapshot', localizationVersion: 2 });
    await db.dialogues.put({ id: 'snap-b', name: 'Child', projectId: 'p1' });
    await db.decorators.put({ id: 'snap-dec', name: 'Effect', projectId: 'p1', properties: [] });
    await db.conditions.put({ id: 'snap-cond', name: 'Rule', projectId: 'p1', properties: [] });
    await useDialogueStore.getState().saveDialogueGraph('snap-a', [node(start, 'startNode'), node('jump', 'openChildGraphNode', { targetDialogue: 'snap-b', decorators: [{ id: 'snap-dec', name: 'Effect', values: {} }] })], [{ id: 'snap-edge', source: start, target: 'jump', data: { conditions: { rules: [{ id: 'snap-cond', values: {} }] } } }], null);
    const snapshot = await buildProjectSnapshot('p1');
    const cloneId = await applyProjectSnapshotAsNew(snapshot);
    const clonedDialogues = await db.dialogues.where('projectId').equals(cloneId).toArray();
    const clonedDialogue = clonedDialogues.find(d => d.name === 'Snapshot');
    const clonedNode = await db.nodes.get([clonedDialogue.id, 'jump']);
    findings.snapshotClone = { targetDialogue: clonedNode.data.targetDialogue, clonedDialogueIds: clonedDialogues.map(d => d.id), decoratorReference: clonedNode.data.decorators[0].id, clonedDefinitionIds: (await db.decorators.where('projectId').equals(cloneId).toArray()).map(d => d.id), text: (await useDialogueStore.getState().loadDialogueGraphForPreview(clonedDialogue.id)).nodes.find(n => n.id === 'jump').data.displayName };
    await db.nodes.put({ ...node('blob'), dialogueId: 'snap-b', data: { dialogueRows: [{ id: 'audio', audioFile: { blob: new Blob(['audio'], { type: 'audio/wav' }) } }] } });
    const blobSnapshot = await buildProjectSnapshot('p1');
    const decoded = await decryptPayload('audit-only', await encryptPayload('audit-only', blobSnapshot));
    findings.snapshotBlob = decoded.nodes.find(n => n.id === 'blob').data.dialogueRows[0].audioFile;
    await applyProjectSnapshot({ project: project('p-other'), dialogues: [{ id: 'd1', projectId: 'p-other' }], nodes: [], edges: [] });
    findings.crossProjectSnapshot = (await db.dialogues.get('d1')).projectId;
    const invalidProject = new JSZip();
    invalidProject.file('projectData.json', JSON.stringify({ projectGuid: 'p1', projectName: 'Replacement' }));
    invalidProject.file('dialogues/bad.mnteadlg', new Uint8Array([1, 2, 3]));
    findings.projectPartialImport = { result: await useProjectStore.getState().importProject(new File([await invalidProject.generateAsync({ type: 'blob' })], 'bad.mnteadlgproj')), remainingDialogues: await db.dialogues.where('projectId').equals('p1').count() };
    await db.projects.put(project('export-project'));
    for (const [id, name] of [['export-1', 'A B'], ['export-2', 'A_B']]) {
      await db.dialogues.put({ id, name, projectId: 'export-project', localizationSlug: id, localizationVersion: 2 });
      await useDialogueStore.getState().saveDialogueGraph(id, [node(start, 'startNode')], [], null);
    }
    window.electronAPI = { isElectron: true, saveFileDialog: async payload => { window.auditExport = payload.fileBase64; return { canceled: true }; } };
    await useProjectStore.getState().exportProject('export-project');
    const exportedZip = await JSZip.loadAsync(window.auditExport, { base64: true });
    findings.exportNameCollision = Object.keys(exportedZip.files).filter(k => k.endsWith('.mnteadlg'));
    delete window.electronAPI;
    findings.localizationAlwaysOn = strings.normalizeProjectLocalizationConfig({ enabled: false });
    findings.localizationMissingRefs = strings.validateLocalizedEntriesForDialogue({ nodes: [node('raw', 'leadNode', { dialogueRows: [{ id: 'row', text: 'text' }] })], entries: [] });
    for (const version of [1, 3]) {
      const name = `documentation-migration-${version}`;
      const old = new Dexie(name);
      old.version(version).stores({ projects: `${version === 1 ? '++' : ''}id,name`, nodes: `${version === 1 ? '++' : ''}id,dialogueId,type,position`, edges: `${version === 1 ? '++' : ''}id,dialogueId,source,target` });
      await old.open();
      await old.nodes.put({ id: version === 1 ? 1 : 'legacy', dialogueId: 'legacy', type: 'startNode' });
      old.close();
      const current = new MounteaDialoguerDB(name);
      try { await current.open(); findings[`migrationV${version}`] = 'opened'; } catch(e) { findings[`migrationV${version}`] = `${e.name}: ${e.message}`; }
      current.close(); await Dexie.delete(name);
    }
    await db.delete();
    return findings;
  });
  await fs.writeFile('tmp/documentation-audit-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  if (browser) await browser.close();
  await server.close();
}
```

Captured result:

```json
{
  "importConditions": {
    "edge": {
      "id": "31266e1e-93dc-42a0-8358-76aa80d65bab",
      "dialogueId": "d1",
      "source": "00000000-0000-0000-0000-000000000001",
      "target": "n1"
    },
    "definitions": [],
    "decorators": [
      {
        "id": "e8a20105-f0c7-42e2-a53f-774fcd7e6e41",
        "name": "Effect",
        "type": "",
        "properties": [],
        "projectId": "p1",
        "createdAt": "2026-09-19T10:06:28.812Z",
        "modifiedAt": "2026-09-19T10:06:28.812Z"
      }
    ]
  },
  "importStaleNodes": [
    "00000000-0000-0000-0000-000000000001",
    "n1",
    "obsolete"
  ],
  "crossProjectImport": {
    "owner": "p2",
    "firstProjectDialogues": 0
  },
  "failedImportReturn": "undefined",
  "categoryCycle": {
    "root": "7c2269c5-5954-4a9e-940c-a097724b2daf",
    "child": "794ea712-9d6f-4a27-99f0-150f2c137f0d"
  },
  "categorySharedPath": "Category name must be unique within its tree.",
  "renameParticipantReference": "Speaker",
  "deleteCategoryOrphan": "794ea712-9d6f-4a27-99f0-150f2c137f0d",
  "snapshotClone": {
    "targetDialogue": "snap-b",
    "clonedDialogueIds": [
      "af682af9-6382-4e70-939d-b8a5f224f871",
      "cf20101b-8717-481b-bf7a-808334317784"
    ],
    "decoratorReference": "snap-dec",
    "clonedDefinitionIds": [
      "22e13418-ade0-4899-a0e0-1b9770883617",
      "49e02cbb-3ae7-439a-b878-ebbabae362bb"
    ],
    "text": ""
  },
  "snapshotBlob": {
    "blob": {}
  },
  "crossProjectSnapshot": "p-other",
  "projectPartialImport": {
    "result": "p1",
    "remainingDialogues": 0
  },
  "exportNameCollision": [
    "dialogues/A_B.mnteadlg"
  ],
  "localizationAlwaysOn": {
    "enabled": true,
    "defaultLocale": "en",
    "supportedLocales": [
      "en"
    ]
  },
  "localizationMissingRefs": {
    "valid": true,
    "errors": []
  },
  "migrationV1": "UpgradeError: Not yet support for changing primary key",
  "migrationV3": "UpgradeError: Not yet support for changing primary key"
}
```

## Additional localization and naming audit

```javascript
import { createServer } from 'vite';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const server = await createServer({ server: { host: '127.0.0.1', port: 4189, strictPort: true }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname === '/documentation-extra') return route.fulfill({ contentType: 'text/html', body: '<html><body>Isolated extra audit</body></html>' });
    return route.continue();
  });
  await page.goto('http://127.0.0.1:4189/documentation-extra');
  const results = await page.evaluate(async () => {
    const { default: RefreshRuntime } = await import('/@react-refresh');
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    localStorage.setItem('mountea-active-profile-id', 'documentation-extra');
    const { db } = await import('/src/lib/db.js');
    const { useDialogueStore: D } = await import('/src/stores/dialogueStore.js');
    const { useProjectStore: P } = await import('/src/stores/projectStore.js');
    const { sanitizeAudioFileName } = await import('/src/lib/assetNaming.js');
    const results = { extensionless: sanitizeAudioFileName('voice') };
    const start = '00000000-0000-0000-0000-000000000001';
    const node = text => ({ id: start, type: 'startNode', position: { x: 0, y: 0 }, data: { displayName: text, localizationNodeToken: 'same_start' } });
    await db.projects.put({ id: 'p', name: 'p', localization: { defaultLocale: 'en', supportedLocales: ['en'] } });
    for (const id of ['a','b']) {
      await db.dialogues.put({ id, name: 'Same Name', projectId: 'p', localizationSlug: 'same_name', localizationVersion: 2 });
      await D.getState().saveDialogueGraph(id, [node(id)], [], null);
    }
    results.sharedKeys = { entries: (await db.localizedStrings.toArray()).map(e => ({ key: e.key, dialogueId: e.dialogueId, values: e.values })), aText: (await D.getState().loadDialogueGraphForPreview('a')).nodes[0].data.displayName };
    await db.dialogues.put({ id: 'legacy', name: 'Legacy', projectId: 'p', localizationVersion: 0 });
    await db.nodes.put({ ...node('Legacy text'), dialogueId: 'legacy' });
    await D.getState().loadDialogueGraph('legacy');
    results.migration = { version: (await db.dialogues.get('legacy')).localizationVersion, storedKey: (await db.nodes.get(['legacy',start])).data.displayNameKey || null, strings: await db.localizedStrings.where('dialogueId').equals('legacy').count() };
    await P.getState().updateProjectLocalization('p', { defaultLocale: 'cs', supportedLocales: ['en','cs'] });
    results.newDefaultValues = (await db.localizedStrings.where('dialogueId').equals('b').toArray()).map(e => e.values);
    const graph = await D.getState().loadDialogueGraphForPreview('b', { activeLocale: 'en' });
    try { await D.getState().saveDialogueGraph('b', graph.nodes, graph.edges, null, { activeLocale: 'en' }); results.saveAfterDefaultChange = 'saved'; }
    catch(e) { results.saveAfterDefaultChange = e.message; }
    await db.delete();
    return results;
  });
  await fs.writeFile('tmp/documentation-extra-audit-results.json', JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
} finally { if(browser) await browser.close(); await server.close(); }
```

Captured result:

```json
{
  "extensionless": "voice.asset",
  "sharedKeys": {
    "entries": [
      {
        "key": "dlg.same_name.n_same_start.display_name",
        "dialogueId": "b",
        "values": {
          "en": "b"
        }
      }
    ],
    "aText": ""
  },
  "migration": {
    "version": 2,
    "storedKey": null,
    "strings": 0
  },
  "newDefaultValues": [
    {
      "en": "b"
    }
  ],
  "saveAfterDefaultChange": "Localization integrity validation failed for this dialogue: missing_default_locale_value (dlg.same_name.n_same_start.display_name)"
}
```

