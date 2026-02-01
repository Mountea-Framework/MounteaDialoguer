import Dexie from 'dexie';

/**
 * Mountea Dialoguer IndexedDB Database
 * Manages local storage for projects, dialogues, participants, and categories
 */
export class MounteaDialoguerDB extends Dexie {
	constructor() {
		super('MounteaDialoguerDB');

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

		this.projects = this.table('projects');
		this.dialogues = this.table('dialogues');
		this.participants = this.table('participants');
		this.categories = this.table('categories');
		this.decorators = this.table('decorators');
		this.nodes = this.table('nodes');
		this.edges = this.table('edges');
	}
}

export const db = new MounteaDialoguerDB();
