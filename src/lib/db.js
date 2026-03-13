import Dexie from 'dexie';
import { getActiveProfileId } from '@/lib/profile/activeProfile';

/**
 * Mountea Dialoguer IndexedDB Database
 * Manages local storage for projects, dialogues, participants, and categories
 */
export class MounteaDialoguerDB extends Dexie {
	constructor(databaseName = 'MounteaDialoguerDB') {
		super(databaseName);

		// Version 1 - Auto-increment IDs (deprecated)
		this.version(1).stores({
			projects: '++id, name, createdAt, modifiedAt',
			dialogues: '++id, projectId, name, createdAt, modifiedAt',
			participants: '++id, projectId, name, category',
			categories: '++id, projectId, name',
			decorators: '++id, projectId, name, type',
			nodes: '++id, dialogueId, type, position',
			edges: '++id, dialogueId, source, target',
		});

		// Version 2 - UUID-based IDs
		this.version(2).stores({
			projects: 'id, name, createdAt, modifiedAt',
			dialogues: 'id, projectId, name, createdAt, modifiedAt',
			participants: 'id, projectId, name, category',
			categories: 'id, projectId, name',
			decorators: 'id, projectId, name, type',
			nodes: 'id, dialogueId, type, position',
			edges: 'id, dialogueId, source, target',
		});

		// Version 3 - Add parent category support (hierarchical categories)
		this.version(3).stores({
			projects: 'id, name, createdAt, modifiedAt',
			dialogues: 'id, projectId, name, createdAt, modifiedAt',
			participants: 'id, projectId, name, category',
			categories: 'id, projectId, name, parentCategoryId',
			decorators: 'id, projectId, name, type',
			nodes: 'id, dialogueId, type, position',
			edges: 'id, dialogueId, source, target',
		});

		// Version 4 - Use compound keys for nodes and edges (scoped by dialogue)
		this.version(4).stores({
			projects: 'id, name, createdAt, modifiedAt',
			dialogues: 'id, projectId, name, createdAt, modifiedAt',
			participants: 'id, projectId, name, category',
			categories: 'id, projectId, name, parentCategoryId',
			decorators: 'id, projectId, name, type',
			nodes: '[dialogueId+id], dialogueId, type',
			edges: '[dialogueId+id], dialogueId, source, target',
		}).upgrade(async (trans) => {
			// Migrate existing nodes and edges to use compound keys
			// Dexie will automatically handle the re-indexing with the new compound key
			// We just need to ensure the data has both dialogueId and id fields
			const nodes = await trans.table('nodes').toArray();
			const edges = await trans.table('edges').toArray();

			// Clear and re-add with compound keys
			await trans.table('nodes').clear();
			await trans.table('edges').clear();

			// Re-add nodes (they should already have dialogueId and id)
			if (nodes.length > 0) {
				await trans.table('nodes').bulkAdd(nodes);
			}

			// Re-add edges (they should already have dialogueId and id)
			if (edges.length > 0) {
				await trans.table('edges').bulkAdd(edges);
			}
		});

		// Version 5 - Add sync metadata tables
		this.version(5).stores({
			projects: 'id, name, createdAt, modifiedAt',
			dialogues: 'id, projectId, name, createdAt, modifiedAt',
			participants: 'id, projectId, name, category',
			categories: 'id, projectId, name, parentCategoryId',
			decorators: 'id, projectId, name, type',
			nodes: '[dialogueId+id], dialogueId, type',
			edges: '[dialogueId+id], dialogueId, source, target',
			syncAccounts: 'provider, accountId, email, expiresAt',
			syncProjects: '[projectId+provider], projectId, provider, revision, remoteFileId, lastSyncedAt',
		});

		// Version 6 - Add condition definitions table
		this.version(6).stores({
			projects: 'id, name, createdAt, modifiedAt',
			dialogues: 'id, projectId, name, createdAt, modifiedAt',
			participants: 'id, projectId, name, category',
			categories: 'id, projectId, name, parentCategoryId',
			decorators: 'id, projectId, name, type',
			conditions: 'id, projectId, name, type',
			nodes: '[dialogueId+id], dialogueId, type',
			edges: '[dialogueId+id], dialogueId, source, target',
			syncAccounts: 'provider, accountId, email, expiresAt',
			syncProjects: '[projectId+provider], projectId, provider, revision, remoteFileId, lastSyncedAt',
		});

		// Version 7 - Add localized strings StringTable
		this.version(7).stores({
			projects: 'id, name, createdAt, modifiedAt',
			dialogues: 'id, projectId, name, createdAt, modifiedAt',
			participants: 'id, projectId, name, category',
			categories: 'id, projectId, name, parentCategoryId',
			decorators: 'id, projectId, name, type',
			conditions: 'id, projectId, name, type',
			nodes: '[dialogueId+id], dialogueId, type',
			edges: '[dialogueId+id], dialogueId, source, target',
			syncAccounts: 'provider, accountId, email, expiresAt',
			syncProjects: '[projectId+provider], projectId, provider, revision, remoteFileId, lastSyncedAt',
			localizedStrings:
				'[projectId+key], projectId, dialogueId, nodeId, rowId, field, modifiedAt',
		});

		this.projects = this.table('projects');
		this.dialogues = this.table('dialogues');
		this.participants = this.table('participants');
		this.categories = this.table('categories');
		this.decorators = this.table('decorators');
		this.conditions = this.table('conditions');
		this.nodes = this.table('nodes');
		this.edges = this.table('edges');
		this.syncAccounts = this.table('syncAccounts');
		this.syncProjects = this.table('syncProjects');
		this.localizedStrings = this.table('localizedStrings');
	}
}

function sanitizeProfileIdForDb(rawValue) {
	const value = String(rawValue || '').trim();
	if (!value) return 'local';
	return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function getDatabaseNameForProfile(profileId) {
	const normalizedProfileId = sanitizeProfileIdForDb(profileId);
	if (normalizedProfileId === 'local') {
		return 'MounteaDialoguerDB';
	}
	return `MounteaDialoguerDB__${normalizedProfileId}`;
}

function resolveActiveProfileId() {
	try {
		return sanitizeProfileIdForDb(getActiveProfileId());
	} catch (error) {
		return 'local';
	}
}

let activeDbInstance = null;
let activeDbProfileId = '';

function ensureDbInstance() {
	const profileId = resolveActiveProfileId();
	if (!activeDbInstance || activeDbProfileId !== profileId) {
		if (activeDbInstance) {
			try {
				activeDbInstance.close();
			} catch (error) {
				// Swallow close errors; switching profile should be best-effort.
			}
		}
		activeDbInstance = new MounteaDialoguerDB(getDatabaseNameForProfile(profileId));
		activeDbProfileId = profileId;
	}
	return activeDbInstance;
}

export const db = new Proxy(
	{},
	{
		get(_target, property) {
			const instance = ensureDbInstance();
			const value = instance[property];
			if (typeof value === 'function') {
				return value.bind(instance);
			}
			return value;
		},
		set(_target, property, value) {
			const instance = ensureDbInstance();
			instance[property] = value;
			return true;
		},
	}
);

export function getProfileScopedDbName() {
	return ensureDbInstance().name;
}
