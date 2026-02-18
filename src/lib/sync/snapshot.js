import { v4 as uuidv4 } from 'uuid';
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
	const conditions = await db.conditions.where('projectId').equals(projectId).toArray();

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
		conditions,
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
		conditions = [],
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
			db.conditions,
			db.nodes,
			db.edges,
		],
		async () => {
			const existingDialogues = await db.dialogues.where('projectId').equals(project.id).toArray();
			const existingDialogueIds = existingDialogues.map((dialogue) => dialogue.id);
			if (existingDialogueIds.length > 0) {
				await db.nodes.where('dialogueId').anyOf(existingDialogueIds).delete();
				await db.edges.where('dialogueId').anyOf(existingDialogueIds).delete();
			}

			await db.projects.delete(project.id);
			await db.dialogues.where('projectId').equals(project.id).delete();
			await db.participants.where('projectId').equals(project.id).delete();
			await db.categories.where('projectId').equals(project.id).delete();
			await db.decorators.where('projectId').equals(project.id).delete();
			await db.conditions.where('projectId').equals(project.id).delete();

			await db.projects.put(project);

			if (dialogues.length > 0) await db.dialogues.bulkAdd(dialogues);
			if (participants.length > 0) await db.participants.bulkAdd(participants);
			if (categories.length > 0) await db.categories.bulkAdd(categories);
			if (decorators.length > 0) await db.decorators.bulkAdd(decorators);
			if (conditions.length > 0) await db.conditions.bulkAdd(conditions);
			if (nodes.length > 0) await db.nodes.bulkAdd(nodes);
			if (edges.length > 0) await db.edges.bulkAdd(edges);
		}
	);
}

export async function applyProjectSnapshotAsNew(snapshot) {
	const {
		project,
		dialogues = [],
		participants = [],
		categories = [],
		decorators = [],
		conditions = [],
		nodes = [],
		edges = [],
	} = snapshot || {};

	if (!project?.id) {
		throw new Error('Invalid snapshot');
	}

	const now = new Date().toISOString();
	const newProjectId = uuidv4();

	const newProject = {
		...project,
		id: newProjectId,
		createdAt: now,
		modifiedAt: now,
	};

	const dialogueIdMap = new Map();
	const newDialogues = dialogues.map((dialogue) => {
		const newId = uuidv4();
		dialogueIdMap.set(dialogue.id, newId);
		return {
			...dialogue,
			id: newId,
			projectId: newProjectId,
			createdAt: now,
			modifiedAt: now,
		};
	});

	const categoryIdMap = new Map();
	const newCategories = categories.map((category) => {
		const newId = uuidv4();
		categoryIdMap.set(category.id, newId);
		return {
			...category,
			id: newId,
			projectId: newProjectId,
			createdAt: now,
			modifiedAt: now,
			parentCategoryId: category.parentCategoryId || null,
		};
	});
	const normalizedCategories = newCategories.map((category) => ({
		...category,
		parentCategoryId: category.parentCategoryId
			? categoryIdMap.get(category.parentCategoryId) || null
			: null,
	}));

	const newParticipants = participants.map((participant) => ({
		...participant,
		id: uuidv4(),
		projectId: newProjectId,
		createdAt: now,
		modifiedAt: now,
	}));

	const newDecorators = decorators.map((decorator) => ({
		...decorator,
		id: uuidv4(),
		projectId: newProjectId,
		createdAt: now,
		modifiedAt: now,
	}));
	const newConditions = conditions.map((condition) => ({
		...condition,
		id: uuidv4(),
		projectId: newProjectId,
		createdAt: now,
		modifiedAt: now,
	}));

	const newNodes = nodes.map((node) => ({
		...node,
		dialogueId: dialogueIdMap.get(node.dialogueId) || node.dialogueId,
	}));

	const newEdges = edges.map((edge) => ({
		...edge,
		dialogueId: dialogueIdMap.get(edge.dialogueId) || edge.dialogueId,
	}));

	await db.transaction(
		'rw',
		[
			db.projects,
			db.dialogues,
			db.participants,
			db.categories,
			db.decorators,
			db.conditions,
			db.nodes,
			db.edges,
		],
		async () => {
			await db.projects.add(newProject);
			if (newDialogues.length > 0) await db.dialogues.bulkAdd(newDialogues);
			if (newParticipants.length > 0) await db.participants.bulkAdd(newParticipants);
			if (normalizedCategories.length > 0) await db.categories.bulkAdd(normalizedCategories);
			if (newDecorators.length > 0) await db.decorators.bulkAdd(newDecorators);
			if (newConditions.length > 0) await db.conditions.bulkAdd(newConditions);
			if (newNodes.length > 0) await db.nodes.bulkAdd(newNodes);
			if (newEdges.length > 0) await db.edges.bulkAdd(newEdges);
		}
	);

	return newProjectId;
}
