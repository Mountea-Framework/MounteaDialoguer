import { db } from '@/lib/db';

export async function buildProjectSnapshot(projectId) {
	const project = await db.projects.get(projectId);
	if (!project) {
		throw new Error('Project not found');
	}

	const dialogues = await db.dialogues.where('projectId').equals(projectId).toArray();
	const participants = await db.participants.where('projectId').equals(projectId).toArray();
	const categories = await db.categories.where('projectId').equals(projectId).toArray();
	const decorators = await db.decorators.where('projectId').equals(projectId).toArray();

	const dialogueIds = dialogues.map((dialogue) => dialogue.id);
	const nodes = dialogueIds.length
		? await db.nodes.where('dialogueId').anyOf(dialogueIds).toArray()
		: [];
	const edges = dialogueIds.length
		? await db.edges.where('dialogueId').anyOf(dialogueIds).toArray()
		: [];

	return {
		version: 1,
		project,
		dialogues,
		participants,
		categories,
		decorators,
		nodes,
		edges,
	};
}

export async function applyProjectSnapshot(snapshot) {
	const {
		project,
		dialogues = [],
		participants = [],
		categories = [],
		decorators = [],
		nodes = [],
		edges = [],
	} = snapshot || {};

	if (!project?.id) {
		throw new Error('Invalid snapshot');
	}

	await db.transaction(
		'rw',
		[
			db.projects,
			db.dialogues,
			db.participants,
			db.categories,
			db.decorators,
			db.nodes,
			db.edges,
		],
		async () => {
			await db.projects.delete(project.id);
			await db.dialogues.where('projectId').equals(project.id).delete();
			await db.participants.where('projectId').equals(project.id).delete();
			await db.categories.where('projectId').equals(project.id).delete();
			await db.decorators.where('projectId').equals(project.id).delete();

			const dialogueIds = dialogues.map((dialogue) => dialogue.id);
			if (dialogueIds.length > 0) {
				await db.nodes.where('dialogueId').anyOf(dialogueIds).delete();
				await db.edges.where('dialogueId').anyOf(dialogueIds).delete();
			}

			await db.projects.put(project);

			if (dialogues.length > 0) await db.dialogues.bulkAdd(dialogues);
			if (participants.length > 0) await db.participants.bulkAdd(participants);
			if (categories.length > 0) await db.categories.bulkAdd(categories);
			if (decorators.length > 0) await db.decorators.bulkAdd(decorators);
			if (nodes.length > 0) await db.nodes.bulkAdd(nodes);
			if (edges.length > 0) await db.edges.bulkAdd(edges);
		}
	);
}
