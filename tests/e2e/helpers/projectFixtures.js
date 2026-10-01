export const START_ID = '00000000-0000-0000-0000-000000000001';
export const FIXTURE_TIME = '2026-01-02T03:04:05.000Z';

/** Authored records include unused definitions, cross-graph references, locales,
 * binary audio and unknown metadata so incomplete serializers cannot pass. */
export function completeProjectFixture(id = 'fixture-project') {
	const dialogueId = `${id}-dialogue`;
	const childId = `${id}-child`;
	const prefix = `dlg.${id.replaceAll('-', '_')}.n_line`;
	const project = { id, name: 'Complete project', description: 'Backup fidelity', createdAt: FIXTURE_TIME, modifiedAt: FIXTURE_TIME, localization: { defaultLocale: 'en', supportedLocales: ['en', 'cs'] }, customMetadata: { authoring: true } };
	const row = { id: 'row-1', textKey: `${prefix}.r_row.text`, duration: 1, audioFile: { name: 'line.wav', mimeType: 'audio/wav', size: 4, blob: new Blob([new Uint8Array([0, 1, 127, 255])], { type: 'audio/wav' }) } };
	const dialogue = (key, name) => ({ id: key, projectId: id, name, description: 'Preserve this description', createdAt: FIXTURE_TIME, modifiedAt: FIXTURE_TIME, viewport: { x: 25, y: -30, zoom: 0.75 }, localizationVersion: 2, localizationSlug: key.replaceAll('-', '_') });
	const node = (key, type, data = {}) => ({ id: key, dialogueId, type, position: { x: 0, y: 100 }, data });
	return {
		version: 2, project,
		dialogues: [dialogue(dialogueId, 'A B'), dialogue(childId, 'A_B')],
		categories: [{ id: `${id}-category`, projectId: id, name: 'Root', parentCategoryId: null }],
		participants: [{ id: `${id}-speaker`, projectId: id, name: 'Speaker', category: 'Root', categoryId: `${id}-category`, customMetadata: 'preserve' }],
		decorators: [{ id: `${id}-effect`, projectId: id, name: 'Effect', type: 'effect', properties: [{ name: 'amount', type: 'number', defaultValue: 0 }] }, { id: `${id}-unused`, projectId: id, name: 'Unused', type: 'effect', properties: [{ name: 'flag', type: 'boolean', defaultValue: false }] }],
		conditions: [{ id: `${id}-condition`, projectId: id, name: 'Check', properties: [{ name: 'value', type: 'number', defaultValue: 3 }] }],
		nodes: [node(START_ID, 'startNode'), node('line', 'leadNode', { participant: 'Speaker', participantId: `${id}-speaker`, displayNameKey: `${prefix}.display_name`, localizationToken: 'line', decorators: [{ id: `${id}-effect`, values: { amount: 0 } }], dialogueRows: [row] }), node('child-link', 'openChildGraphNode', { targetDialogue: childId }), { ...node(START_ID, 'startNode'), dialogueId: childId }],
		edges: [{ id: 'edge-1', dialogueId, source: START_ID, target: 'line', type: 'conditionEdge', data: { conditions: { mode: 'all', rules: [{ id: `${id}-condition`, values: { value: 3 }, negate: true }] } } }],
		localizedStrings: [{ projectId: id, dialogueId, nodeId: 'line', field: 'displayName', key: `${prefix}.display_name`, values: { en: 'Line', cs: 'Řádek' }, modifiedAt: FIXTURE_TIME }, { projectId: id, dialogueId, nodeId: 'line', rowId: 'row-1', field: 'rowText', key: `${prefix}.r_row.text`, values: { en: 'Hello', cs: 'Ahoj' }, modifiedAt: FIXTURE_TIME }],
	};
}

/** Seed a real historical Dexie version without opening the current DB class. */
export async function seedHistoricalDatabase(Dexie, name, version, records = {}) {
	if (!Number.isInteger(version) || version < 1 || version > 9) throw new Error('Historical schema version must be 1..9');
	const key = version === 1 ? '++id' : 'id';
	const schema = {
		projects: `${key},name,createdAt,modifiedAt`, dialogues: `${key},projectId,name,createdAt,modifiedAt`,
		participants: `${key},projectId,name,category`, categories: `${key},projectId,name${version >= 3 ? ',parentCategoryId' : ''}`,
		decorators: `${key},projectId,name,type`,
		nodes: version >= 4 ? '[dialogueId+id],dialogueId,type' : `${key},dialogueId,type,position`,
		edges: version >= 4 ? '[dialogueId+id],dialogueId,source,target' : `${key},dialogueId,source,target`,
	};
	if (version >= 5) Object.assign(schema, { syncAccounts: 'provider,accountId,email,expiresAt', syncProjects: '[projectId+provider],projectId,provider,revision,remoteFileId,lastSyncedAt' });
	if (version >= 6) schema.conditions = 'id,projectId,name,type';
	if (version >= 7) schema.localizedStrings = '[projectId+key],projectId,dialogueId,nodeId,rowId,field,modifiedAt';
	if (version >= 8) schema.syncDeletions = '[projectId+provider],projectId,provider,deletedAt';
	if (version >= 9) Object.assign(schema, { syncCatalogState: '[provider+profileId],provider,profileId,catalogRevision,fetchedAt,status', syncTombstones: '[provider+entityType+entityId],provider,entityType,entityId,projectId,deletedAt,expiresAt,pending,acknowledgedAt' });
	const database = new Dexie(name);
	database.version(version).stores(schema);
	try {
		await database.open();
		await database.transaction('rw', database.tables, async () => {
			for (const [table, rows] of Object.entries(records)) await database.table(table).bulkPut(rows);
		});
	} finally { database.close(); }
	return name;
}

export function conflictingRevisionFixtures() {
	const base = { projectId: 'conflict-project', revisionId: 'base', parentRevisionIds: [], deviceId: 'device-a', operation: 'update' };
	return { base, local: { ...base, revisionId: 'local', parentRevisionIds: ['base'], payloadHash: 'local-hash' }, remote: { ...base, revisionId: 'remote', parentRevisionIds: ['base'], deviceId: 'device-b', payloadHash: 'remote-hash' } };
}
