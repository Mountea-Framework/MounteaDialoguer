import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { buildLocalizedStringKey } from '@/lib/localization/stringTable';

function stripLocalOnlyProjectFields(project = {}) {
	const sanitized = { ...(project || {}) };
	delete sanitized.lastExportPath;
	return sanitized;
}

function stripLocalOnlyDialogueFields(dialogue = {}) {
	const sanitized = { ...(dialogue || {}) };
	delete sanitized.lastExportPath;
	return sanitized;
}

function dedupeBy(items = [], keySelector) {
	const latestByKey = new Map();
	for (const item of items) {
		const key = String(keySelector(item) || '').trim();
		if (!key) continue;
		latestByKey.set(key, item);
	}
	return Array.from(latestByKey.values());
}

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
	const localizedStrings = await db.localizedStrings
		.where('projectId')
		.equals(projectId)
		.toArray();

	const dialogueIds = dialogues.map((dialogue) => dialogue.id);
	const nodes = dialogueIds.length
		? await db.nodes.where('dialogueId').anyOf(dialogueIds).toArray()
		: [];
	const edges = dialogueIds.length
		? await db.edges.where('dialogueId').anyOf(dialogueIds).toArray()
		: [];

	return {
		version: 2,
		project: stripLocalOnlyProjectFields(project),
		dialogues: dialogues.map((dialogue) => stripLocalOnlyDialogueFields(dialogue)),
		participants,
		categories,
		decorators,
		conditions,
		localizedStrings,
		nodes,
		edges,
	};
}

export async function applyProjectSnapshot(snapshot) {
	const {
		project: rawProject,
		dialogues = [],
		participants = [],
		categories = [],
		decorators = [],
		conditions = [],
		localizedStrings = [],
		nodes = [],
		edges = [],
	} = snapshot || {};
	const project = stripLocalOnlyProjectFields(rawProject);
	const sanitizedDialogues = dedupeBy(
		dialogues.map((dialogue) => stripLocalOnlyDialogueFields(dialogue)),
		(dialogue) => dialogue?.id
	);
	const sanitizedParticipants = dedupeBy(participants, (participant) => participant?.id);
	const sanitizedCategories = dedupeBy(categories, (category) => category?.id);
	const sanitizedDecorators = dedupeBy(decorators, (decorator) => decorator?.id);
	const sanitizedConditions = dedupeBy(conditions, (condition) => condition?.id);
	const normalizedLocalizedStrings = localizedStrings.map((entry) => {
		const key =
			entry?.key ||
			buildLocalizedStringKey({
				dialogueId: entry?.dialogueId,
				nodeId: entry?.nodeId,
				rowId: entry?.rowId,
				field: entry?.field,
			});
		return {
			...entry,
			projectId: project.id,
			key,
		};
	});
	const sanitizedLocalizedStrings = dedupeBy(
		normalizedLocalizedStrings,
		(entry) => `${project.id}::${entry?.key || ''}`
	);
	const sanitizedNodes = dedupeBy(
		nodes,
		(node) => `${node?.dialogueId || ''}::${node?.id || ''}`
	);
	const sanitizedEdges = dedupeBy(
		edges,
		(edge) => `${edge?.dialogueId || ''}::${edge?.id || ''}`
	);

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
			db.localizedStrings,
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
			await db.localizedStrings.where('projectId').equals(project.id).delete();

			await db.projects.put(project);

			if (sanitizedDialogues.length > 0) await db.dialogues.bulkPut(sanitizedDialogues);
			if (sanitizedParticipants.length > 0) await db.participants.bulkPut(sanitizedParticipants);
			if (sanitizedCategories.length > 0) await db.categories.bulkPut(sanitizedCategories);
			if (sanitizedDecorators.length > 0) await db.decorators.bulkPut(sanitizedDecorators);
			if (sanitizedConditions.length > 0) await db.conditions.bulkPut(sanitizedConditions);
			if (sanitizedLocalizedStrings.length > 0)
				await db.localizedStrings.bulkPut(sanitizedLocalizedStrings);
			if (sanitizedNodes.length > 0) await db.nodes.bulkPut(sanitizedNodes);
			if (sanitizedEdges.length > 0) await db.edges.bulkPut(sanitizedEdges);
		}
	);
}

export async function applyProjectSnapshotAsNew(snapshot) {
	const {
		project: rawProject,
		dialogues = [],
		participants = [],
		categories = [],
		decorators = [],
		conditions = [],
		localizedStrings = [],
		nodes = [],
		edges = [],
	} = snapshot || {};
	const project = stripLocalOnlyProjectFields(rawProject);
	const sanitizedDialogues = dialogues.map((dialogue) => stripLocalOnlyDialogueFields(dialogue));

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
	const newDialogues = sanitizedDialogues.map((dialogue) => {
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

	const newLocalizedStrings = localizedStrings.map((entry) => {
		const mappedDialogueId = dialogueIdMap.get(entry.dialogueId) || entry.dialogueId || '';
		const key = buildLocalizedStringKey({
			dialogueId: mappedDialogueId,
			nodeId: entry.nodeId,
			rowId: entry.rowId,
			field: entry.field,
		});
		return {
			...entry,
			projectId: newProjectId,
			dialogueId: mappedDialogueId,
			key: key || entry.key,
			createdAt: now,
			modifiedAt: now,
		};
	});

	await db.transaction(
		'rw',
		[
			db.projects,
			db.dialogues,
			db.participants,
			db.categories,
			db.decorators,
			db.conditions,
			db.localizedStrings,
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
			if (newLocalizedStrings.length > 0) await db.localizedStrings.bulkAdd(newLocalizedStrings);
			if (newNodes.length > 0) await db.nodes.bulkAdd(newNodes);
			if (newEdges.length > 0) await db.edges.bulkAdd(newEdges);
		}
	);

	return newProjectId;
}
