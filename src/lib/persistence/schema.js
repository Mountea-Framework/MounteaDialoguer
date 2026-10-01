export const AUTHORING_TABLES = ['projects', 'dialogues', 'participants', 'categories', 'decorators', 'conditions', 'nodes', 'edges', 'localizedStrings'];
// New generation: never attempt to alter a historical primary key in place.
export const DATABASE_SCHEMA = {
	projects: 'id,name,createdAt,modifiedAt',
	dialogues: 'id,projectId,name,createdAt,modifiedAt',
	participants: 'id,projectId,name,category,categoryId',
	categories: 'id,projectId,name,parentCategoryId',
	decorators: 'id,projectId,name,type',
	conditions: 'id,projectId,name,type',
	nodes: '[dialogueId+id],dialogueId,type',
	edges: '[dialogueId+id],dialogueId,source,target',
	localizedStrings: '[projectId+key],projectId,dialogueId,nodeId,rowId,field,modifiedAt',
	syncAccounts: 'provider,accountId,email,expiresAt',
	syncProjects: '[projectId+provider],projectId,provider,revision,remoteFileId,lastSyncedAt',
	syncDeletions: '[projectId+provider],projectId,provider,deletedAt',
	syncCatalogState: '[provider+profileId],provider,profileId,catalogRevision,fetchedAt,status',
	syncTombstones: '[provider+entityType+entityId],provider,entityType,entityId,projectId,deletedAt,expiresAt,pending,acknowledgedAt',
	projectState: 'projectId,revisionId,sequence,modifiedAt',
	projectRevisions: 'id,projectId,createdAt',
	syncOutbox: 'id,[provider+projectId],projectId,provider,status,createdAt',
	syncConflicts: 'id,projectId,provider,status,createdAt',
	recoveryRecords: 'id,projectId,table,code,status',
	migrationState: 'key',
};
