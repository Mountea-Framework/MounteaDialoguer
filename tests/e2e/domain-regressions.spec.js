import { test, expect } from '@playwright/test';
import { openModuleHarness } from './helpers/moduleHarness.js';

for (const version of [1, 3]) test(`ISS-012 numeric v${version} migration repairs independent node and row references`, async ({ page }) => {
 await openModuleHarness(page);
 const result = await page.evaluate(async (version) => {
  const { default: Dexie } = await import('/node_modules/.vite/deps/dexie.js');
  const { seedHistoricalDatabase } = await import('/tests/e2e/helpers/projectFixtures.js');
  const { MounteaDialoguerDB, repairIdentityReference, revalidateProjectRecovery } = await import('/src/lib/db.js');
  const name = `repair-numeric-${version}`;
  await seedHistoricalDatabase(Dexie, name, version, {
   projects: [{ id: 1, name: 'Project' }], dialogues: [{ id: 2, projectId: 1, name: 'Graph' }],
   categories: [{ id: 3, projectId: 1, name: 'Root' }, { id: 4, projectId: 1, name: 'Other' }],
   participants: [{ id: 5, projectId: 1, name: 'Speaker', category: 'Root' }, { id: 6, projectId: 1, name: 'Speaker', category: 'Other' }],
   nodes: [{ id: 7, dialogueId: 2, type: 'leadNode', data: { participant: 'Speaker', dialogueRows: [{ id: 8, participant: 'Speaker' }, { id: 9, participant: 'Speaker' }] } }],
  });
  const database = new MounteaDialoguerDB(name); await database.open();
  const context = { db: database, assertCurrent() {}, signal: new AbortController().signal };
  const projectId = (await database.projects.toArray())[0].id;
  const diagnostics = await database.recoveryRecords.toArray();
  const target = (await database.participants.toArray())[0].id;
  const nodeDiagnostic = diagnostics.find(row => !row.rowId), rowDiagnostics = diagnostics.filter(row => row.rowId);
  await repairIdentityReference(rowDiagnostics[0].id, target, context);
  const intermediate = await database.recoveryRecords.toArray();
  await repairIdentityReference(nodeDiagnostic.id, target, context);
  await repairIdentityReference(rowDiagnostics[1].id, target, context);
  const node = (await database.nodes.toArray())[0];
  await database.recoveryRecords.add({ ...rowDiagnostics[0], id: 'orphan-row', rowId: 'absent', path: 'data.dialogueRows.absent.participantId', status: 'unresolved' });
  await revalidateProjectRecovery(projectId, context);
  const final = await database.recoveryRecords.toArray();
  return { count: diagnostics.length, originals: diagnostics.every(row => row.original.id === 7 && row.original.dialogueId === 2), mapped: diagnostics.every(row => row.recordKey[0] === node.dialogueId && row.recordKey[1] === node.id), independent: intermediate.filter(row => row.status === 'resolved').map(row => row.id), first: rowDiagnostics[0].id, targets: [node.data.participantId, ...node.data.dialogueRows.map(row => row.participantId)], target, resolved: final.filter(row => row.status === 'resolved').length, orphan: final.find(row => row.id === 'orphan-row').status };
 }, version);
 expect(result.count).toBe(3); expect(result.originals).toBe(true); expect(result.mapped).toBe(true);
 expect(result.independent).toEqual([result.first]); expect(result.targets).toEqual([result.target, result.target, result.target]);
 expect(result.resolved).toBe(3); expect(result.orphan).toBe('unresolved');
});

async function seedDomain(page) {
	await openModuleHarness(page);
	await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		await db.projects.bulkPut([{ id: 'p', name: 'Project' }, { id: 'other', name: 'Other' }]);
		await db.categories.bulkPut([{ id: 'root', projectId: 'p', name: 'Root' }, { id: 'child', projectId: 'p', name: 'Child', parentCategoryId: 'root' }, { id: 'foreign', projectId: 'other', name: 'Foreign' }]);
	});
}

test('ISS-009 category mutations reject cycles and foreign parents without writing', async ({ page }) => {
	await seedDomain(page);
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useCategoryStore } = await import('/src/stores/categoryStore.js');
		const errors = [];
		for (const operation of [() => useCategoryStore.getState().updateCategory('root', { parentCategoryId: 'child' }), () => useCategoryStore.getState().createCategory({ projectId: 'p', name: 'Bad', parentCategoryId: 'foreign' })]) {
			try { await operation(); errors.push(null); } catch (error) { errors.push(error.code || error.message); }
		}
		return { errors, rootParent: (await db.categories.get('root')).parentCategoryId || null, count: await db.categories.count() };
	});
	expect(result.errors.every(Boolean)).toBe(true);
	expect(result.rootParent).toBe(null);
	expect(result.count).toBe(3);
});

test('ISS-010 category import reuses existing hierarchy prefixes and rolls back invalid batches', async ({ page }) => {
	await seedDomain(page);
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useCategoryStore } = await import('/src/stores/categoryStore.js');
		const store = useCategoryStore.getState();
		const created = await store.importCategories('p', [{ fullPath: 'Root.Child.Grandchild' }]);
		let rejected = false;
		try { await store.importCategories('p', [{ fullPath: 'Root.Child.Valid' }, { fullPath: 'Root.Invalid!' }]); } catch { rejected = true; }
		return { created: created.map((row) => ({ name: row.name, parent: row.parentCategoryId })), rejected, names: (await db.categories.where('projectId').equals('p').toArray()).map((row) => row.name).sort() };
	});
	expect(result).toEqual({ created: [{ name: 'Grandchild', parent: 'child' }], rejected: true, names: ['Child', 'Grandchild', 'Root'] });
});

test('ISS-011 referenced categories and participants cannot be deleted', async ({ page }) => {
	await seedDomain(page);
	const result = await page.evaluate(async () => {
		const { db } = await import('/src/lib/db.js');
		const { useCategoryStore } = await import('/src/stores/categoryStore.js');
		const { useParticipantStore } = await import('/src/stores/participantStore.js');
		await db.participants.put({ id: 'speaker', projectId: 'p', name: 'Speaker', categoryId: 'child', category: 'Child' });
		await db.dialogues.put({ id: 'dialogue', projectId: 'p', name: 'Graph' });
		await db.nodes.put({ id: 'node', dialogueId: 'dialogue', type: 'leadNode', data: { participantId: 'speaker', participant: 'Speaker' } });
		const errors = [];
		for (const operation of [() => useCategoryStore.getState().deleteCategory('root'), () => useCategoryStore.getState().deleteCategory('child'), () => useParticipantStore.getState().deleteParticipant('speaker')]) {
			try { await operation(); errors.push(null); } catch (error) { errors.push(error.code || error.message); }
		}
		return { errors, categories: await db.categories.count(), participants: await db.participants.count() };
	});
	expect(result.errors.every(Boolean)).toBe(true);
	expect(result.categories).toBe(3);
	expect(result.participants).toBe(1);
});

 test('ISS-009 subtree moves validate resulting depth; failed moves have no revision', async ({ page }) => {
 await seedDomain(page);
 const result = await page.evaluate(async () => {
  const { db } = await import('/src/lib/db.js'); const { useCategoryStore } = await import('/src/stores/categoryStore.js');
  await db.categories.bulkPut([{id:'a',name:'A',projectId:'p',parentCategoryId:'child'}, {id:'b',name:'B',projectId:'p',parentCategoryId:'a'}, {id:'c',name:'C',projectId:'p',parentCategoryId:'b'}, {id:'second',name:'Second',projectId:'p'}]);
  let error; try { await useCategoryStore.getState().updateCategory('second',{parentCategoryId:'c'}); } catch (e) {error=e.code;}
  return {error,parent:(await db.categories.get('second')).parentCategoryId, revisions:await db.projectRevisions.count()};
 }); expect(result).toEqual({error:'CATEGORY_DEPTH',parent:undefined,revisions:0});
 });
 test('ISS-011 participant identities survive duplicate names, renames and label projections', async ({ page }) => {
 await seedDomain(page);
 const result = await page.evaluate(async () => {
  const { db } = await import('/src/lib/db.js'); const {useParticipantStore} = await import('/src/stores/participantStore.js');
  await db.categories.bulkPut([{id:'second',name:'Second',projectId:'p'}, {id:'secondChild',name:'Child',projectId:'p',parentCategoryId:'second'}]);
  const first=await useParticipantStore.getState().createParticipant({projectId:'p',name:'Speaker',categoryId:'child'});
  const second=await useParticipantStore.getState().createParticipant({projectId:'p',name:'Speaker',categoryId:'secondChild'});
  await db.dialogues.put({id:'dialogue',projectId:'p',name:'Graph'});
  await db.nodes.put({id:'node',dialogueId:'dialogue',type:'leadNode',data:{participantId:second.id,participant:'Speaker'}});
  await useParticipantStore.getState().updateParticipant(first.id,{name:'Renamed'});
  const node=await db.nodes.get(['dialogue','node']); let ambiguous;
  try { await useParticipantStore.getState().createParticipant({projectId:'p',name:'Other',category:'Child'}); } catch(e){ambiguous=e.code;}
  return {distinct:first.id!==second.id, category:second.categoryId, speaker:node.data.participant, participantId:node.data.participantId===second.id,ambiguous,outbox:await db.syncOutbox.count()};
 }); expect(result).toEqual({distinct:true,category:'secondChild',speaker:'Speaker',participantId:true,ambiguous:'AMBIGUOUS_REFERENCE',outbox:3});
 });
 test('ISS-012 definition validation allows additions but blocks referenced deletion and destructive schemas', async ({ page }) => {
 await seedDomain(page);
 const result=await page.evaluate(async()=>{
  const {db}=await import('/src/lib/db.js'); const {useDecoratorStore}=await import('/src/stores/decoratorStore.js'); const {useConditionStore}=await import('/src/stores/conditionStore.js');
  await db.dialogues.put({id:'dialogue',projectId:'p',name:'Graph'});
  const decorator=await useDecoratorStore.getState().createDecorator({projectId:'p',name:'Gate',properties:[{name:'active',type:'boolean',defaultValue:false}]});
  const condition=await useConditionStore.getState().createCondition({projectId:'p',name:'Test',properties:[{name:'score',type:'number',defaultValue:0}]});
  await db.nodes.bulkPut([{id:'a',dialogueId:'dialogue',type:'leadNode',data:{decorators:[{id:decorator.id,properties:{active:false}}]}},{id:'b',dialogueId:'dialogue',type:'completeNode',data:{}}]);
  await db.edges.put({id:'e',dialogueId:'dialogue',source:'a',target:'b',data:{conditions:{rules:[{id:condition.id}]}}});
  await useDecoratorStore.getState().updateDecorator(decorator.id,{properties:[...decorator.properties,{name:'count',type:'number',defaultValue:0}]});
  const errors=[];for(const action of [()=>useDecoratorStore.getState().deleteDecorator(decorator.id),()=>useConditionStore.getState().deleteCondition(condition.id),()=>useDecoratorStore.getState().updateDecorator(decorator.id,{properties:[]}),()=>useConditionStore.getState().createCondition({projectId:'p',name:'Bad',properties:[{name:'x',type:'number',defaultValue:'wrong'}]})]){try{await action();}catch(e){errors.push({code:e.code,refs:e.references?.length||0});}}
  return {errors,count:(await db.decorators.get(decorator.id)).properties.length};
 });expect(result).toEqual({count:2,errors:[{code:'RECORD_REFERENCED',refs:1},{code:'RECORD_REFERENCED',refs:1},{code:'DEFINITION_REFERENCED',refs:1},{code:'INVALID_PROPERTY_DEFAULT',refs:0}]});
 });
 test('ISS-011 child dialogue and return node destinations are protected',async({page})=>{
 await seedDomain(page);const result=await page.evaluate(async()=>{
  const {db}=await import('/src/lib/db.js');const {useDialogueStore}=await import('/src/stores/dialogueStore.js');const {assertGraphNodesRemovable}=await import('/src/lib/domainIntegrity.js');
  await db.dialogues.bulkPut([{id:'parent',projectId:'p',name:'Parent'},{id:'childGraph',projectId:'p',name:'Child'}]);
  await db.nodes.put({id:'call',dialogueId:'parent',type:'childNode',data:{targetDialogue:'childGraph'}});
  let childError,returnError;try{await useDialogueStore.getState().deleteDialogue('childGraph');}catch(e){childError=e.code;}
  const nodes=[{id:'return',data:{targetNode:'target'}},{id:'target',data:{}}];try{assertGraphNodesRemovable(nodes,new Set(['target']));}catch(e){returnError=e.code;}
  assertGraphNodesRemovable(nodes,new Set(['target','return']));return {childError,returnError,exists:!!await db.dialogues.get('childGraph')};
 });expect(result).toEqual({childError:'RECORD_REFERENCED',returnError:'RECORD_REFERENCED',exists:true});
 });
 test('ISS-025 stale domain loads cannot overwrite the new profile store',async({page})=>{
 await seedDomain(page);const result=await page.evaluate(async()=>{
  const {getRepositoryContext}=await import('/src/lib/db.js');const {setActiveProfileId}=await import('/src/lib/profile/activeProfile.js');const {loadDomainRecords}=await import('/src/stores/domainStoreSupport.js');
  const context=await getRepositoryContext();let release;const gate=new Promise(resolve=>release=resolve);const states=[];
  const delayed={...context,db:{categories:{where:()=>({equals:()=>({toArray:async()=>{await gate;return [{id:'old'}];}})})}}};
  const pending=loadDomainRecords(value=>states.push(value),'categories','p',delayed).catch(e=>e.code);
  setActiveProfileId('new-profile');release();return {code:await pending,states};
 });expect(result).toEqual({code:'STALE_PROFILE',states:[{isLoading:true}]});
 });

 test('ISS-008 repair panel assigns stable category and keeps original evidence',async({page})=>{
 await seedDomain(page);await page.evaluate(async()=>{
  await import('/src/i18n/index.js');
  const {db}=await import('/src/lib/db.js');await db.participants.put({id:'speaker',projectId:'p',name:'Speaker',category:'Unknown'});
  await db.recoveryRecords.put({id:'repair',projectId:'p',table:'participants',path:'categoryId',code:'missing_reference',status:'unresolved',message:'Choose the category',original:{id:'speaker',projectId:'p',name:'Speaker',category:'Unknown'}});
  const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');const {ProjectRecoveryPanel}=await import('/src/components/projects/ProjectRecoveryPanel.jsx');
  const mount=document.createElement('div');document.body.appendChild(mount);createRoot(mount).render(React.createElement(ProjectRecoveryPanel,{projectId:'p'}));
 });
 await page.getByRole('region', { name: 'Project recovery' }).locator('summary').first().click();
 await expect(page.getByRole('link',{name:'Download original evidence'})).toHaveAttribute('download','recovery-repair.json');
 await page.getByLabel('Replacement for speaker').selectOption('child');await page.getByRole('button',{name:'Assign',exact:true}).click();await expect(page.getByRole('region',{name:'Project recovery'})).toHaveCount(0);
 const result=await page.evaluate(async()=>{const {db}=await import('/src/lib/db.js');return {category:(await db.participants.get('speaker')).categoryId,evidence:(await db.recoveryRecords.get('repair')).original.category,status:(await db.recoveryRecords.get('repair')).status,outbox:await db.syncOutbox.count()};});
 expect(result).toEqual({category:'child',evidence:'Unknown',status:'resolved',outbox:1});
 });
 test('ISS-008 quarantine restore commits node, revision, outbox and resolution atomically; absent originals remain unresolved',async({page})=>{
 await seedDomain(page);const result=await page.evaluate(async()=>{
  const {db,restoreQuarantinedNode,revalidateProjectRecovery}=await import('/src/lib/db.js');
  await db.dialogues.put({id:'dialogue',name:'Graph',projectId:'p'});
  await db.recoveryRecords.bulkPut([{id:'quarantine',projectId:'p',table:'nodes',code:'duplicate_identity',status:'unresolved',original:{id:'original',data:{dialogueRows:[{id:'audio',audioFile:{blob:new Blob([new Uint8Array([0,255,7])],{type:'audio/wav'})}}]}}},{id:'orphan',projectId:'p',table:'participants',code:'missing_reference',status:'unresolved',original:{id:'absent',projectId:'p',category:'lost'}}]);
  let invalid=false;try{await restoreQuarantinedNode('quarantine',{id:'new',dialogueId:'foreign',type:'leadNode',data:{}});}catch{invalid=true;}
  const before={status:(await db.recoveryRecords.get('quarantine')).status,outbox:await db.syncOutbox.count()};
  const {serializeRecoveryEvidence}=await import('/src/lib/recoveryEvidence.js'); const evidence=await serializeRecoveryEvidence(await db.recoveryRecords.get('quarantine'));
  await restoreQuarantinedNode('quarantine',{...JSON.parse(JSON.stringify(evidence.original)),id:'new',dialogueId:'dialogue',type:'leadNode'});await revalidateProjectRecovery('p');
  return {media:(await db.nodes.get(['dialogue','new'])).data.dialogueRows[0].audioFile.base64,invalid,before,restored:!!await db.nodes.get(['dialogue','new']),status:(await db.recoveryRecords.get('quarantine')).status,original:(await db.recoveryRecords.get('quarantine')).original.id,orphan:(await db.recoveryRecords.get('orphan')).status,revisions:await db.projectRevisions.count(),outbox:await db.syncOutbox.count()};
 });expect(result).toEqual({media:'data:audio/wav;base64,AP8H',invalid:true,before:{status:'unresolved',outbox:0},restored:true,status:'resolved',original:'original',orphan:'unresolved',revisions:1,outbox:1});
 });

test('ISS-012 storage failure rolls back recovery resolution with all authored and outbox writes', async ({ page }) => {
 await seedDomain(page);
 const result = await page.evaluate(async () => {
  const { db, restoreQuarantinedNode } = await import('/src/lib/db.js');
  await db.dialogues.put({ id: 'graph', projectId: 'p', name: 'Graph' });
  await db.recoveryRecords.put({ id: 'repair', projectId: 'p', table: 'nodes', code: 'duplicate_identity', status: 'unresolved', original: { id: 'old' } });
  const fail = () => { throw new Error('Injected outbox quota failure'); };
  db.syncOutbox.hook('creating', fail);
  let rejected = false;
  try { await restoreQuarantinedNode('repair', { id: 'recovered', dialogueId: 'graph', type: 'leadNode', data: {} }); } catch { rejected = true; }
  db.syncOutbox.hook('creating').unsubscribe(fail);
  return { rejected, status: (await db.recoveryRecords.get('repair')).status, nodes: await db.nodes.count(), revisions: await db.projectRevisions.count(), outbox: await db.syncOutbox.count() };
 });
 expect(result).toEqual({ rejected: true, status: 'unresolved', nodes: 0, revisions: 0, outbox: 0 });
});

test('ISS-008 global recovery exposes missing-owner historical evidence with zero projects', async ({ page }) => {
 await openModuleHarness(page, { profileId: 'orphan-recovery' });
 await page.evaluate(async () => {
  const { default: Dexie } = await import('/node_modules/.vite/deps/dexie.js');
  const { seedHistoricalDatabase } = await import('/tests/e2e/helpers/projectFixtures.js');
  await seedHistoricalDatabase(Dexie, 'MounteaDialoguerDB__orphan-recovery', 1, { dialogues: [{ id: 2, projectId: 77, name: 'Lost graph', evidence: { audio: { blob: new Blob([new Uint8Array([0,255,7])], { type: 'audio/wav' }), size: 99, url: 'original-url', custom: 'retained' }, bytes: new Uint16Array([256,511]), buffer: new Uint8Array([2,3]).buffer, date: new Date('2020-01-02T00:00:00Z') } }] });
  await import('/src/i18n/index.js');
  const { default: React } = await import('/node_modules/.vite/deps/react.js');
  const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js');
  const { RecoverySummary } = await import('/src/components/projects/RecoverySummary.jsx');
  createRoot(document.getElementById('root')).render(React.createElement(RecoverySummary));
 });
 const region = page.getByRole('region', { name: 'Recovery report' });
 await expect(region).toBeVisible(); await region.locator('summary').first().click();
 await region.locator('details details summary').first().click();
 await expect(region.getByText(/These records have no available owning project/)).toBeVisible();
 await expect(region.getByRole('button', { name: /Open project recovery settings/ })).toHaveCount(0);
 const href = await region.getByRole('link', { name: 'Download recovery report' }).getAttribute('href');
 const [diagnostic] = JSON.parse(decodeURIComponent(href.split(',').slice(1).join(',')));
 expect(diagnostic.original.id).toBe(2); expect(diagnostic.original.projectId).toBe(77);
 const evidence = diagnostic.original.evidence;
 expect(evidence.audio.base64).toBe('data:audio/wav;base64,AP8H');
 expect(evidence.audio.recoveredOriginal).toMatchObject({ size: 99, url: 'original-url', custom: 'retained' });
 expect(evidence.bytes).toEqual({ recoveredType: 'Uint16Array', base64: 'AAH/AQ==', byteLength: 4 });
 expect(evidence.buffer).toEqual({ recoveredType: 'ArrayBuffer', base64: 'AgM=', byteLength: 2 });
 expect(evidence.date).toEqual({ recoveredType: 'Date', value: '2020-01-02T00:00:00.000Z' });
 expect(await page.evaluate(async () => { const { db } = await import('/src/lib/db.js'); const record = (await db.recoveryRecords.toArray())[0]; return { projects: await db.projects.count(), original: record.original.id, status: record.status, bytes: [...new Uint8Array(await record.original.evidence.audio.blob.arrayBuffer())] }; })).toEqual({ projects: 0, original: 2, status: 'unresolved', bytes: [0,255,7] });
});
