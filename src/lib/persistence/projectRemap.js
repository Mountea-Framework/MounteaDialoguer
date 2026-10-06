import { RECORD_TABLES, START_NODE_ID, compoundIdentity, ProjectDataError } from './canonicalProject';
import { allocateDialogueLocalizationSlug, prepareLocalizedNodesAndEntries } from '@/lib/localization/stringTable';

/** Allocate every identity before applying references, including forward edges,
 * return targets, child graphs, definitions, row audio and localization scopes. */
export function remapProjectIdentities(input, { projectId = crypto.randomUUID(), dialogueIds = new Map(), existingDialogues = [], preserveEntityIds = false } = {}) {
	const snapshot = structuredClone(input), maps = {};
	for (const table of ['dialogues', 'categories', 'participants', 'decorators', 'conditions']) maps[table] = new Map((input[table] || []).map((row) => [row.id, table === 'dialogues' && dialogueIds.has(row.id) ? dialogueIds.get(row.id) : preserveEntityIds ? row.id : crypto.randomUUID()]));
	maps.nodes = new Map(); maps.rows = new Map();
	for (const node of input.nodes || []) {
		maps.nodes.set(compoundIdentity(node.dialogueId, node.id), ['start', 'startNode'].includes(node.type) ? START_NODE_ID : preserveEntityIds ? node.id : crypto.randomUUID());
		for (const row of node.data?.dialogueRows || []) maps.rows.set(JSON.stringify([node.dialogueId, node.id, row.id]), preserveEntityIds ? row.id : crypto.randomUUID());
	}
	const remap = (table, id) => maps[table]?.get(id) ?? id;
	const remapNode = (dialogueId, id) => {
		const exact = maps.nodes.get(compoundIdentity(dialogueId, id));
		if (exact) return exact;
		// Legacy UUID casing may differ on forward references. Never use a
		// case-insensitive match when more than one identity could match.
		const matches = (input.nodes || []).filter((node) => node.dialogueId === dialogueId && String(node.id).toLowerCase() === String(id).toLowerCase());
		if (matches.length > 1) throw new ProjectDataError('AMBIGUOUS_NODE_ID', 'A case-insensitive legacy node reference has multiple matches.');
		return matches.length === 1 ? maps.nodes.get(compoundIdentity(dialogueId, matches[0].id)) : id;
	};
	snapshot.project.id = projectId;
	for (const table of RECORD_TABLES) for (const row of snapshot[table] || []) {
		if (table !== 'nodes' && table !== 'edges') row.projectId = projectId;
		if (maps[table] && table !== 'nodes') row.id = remap(table, row.id);
	}
	for (const row of snapshot.categories || []) if (row.parentCategoryId) row.parentCategoryId = remap('categories', row.parentCategoryId);
	for (const row of snapshot.participants || []) if (row.categoryId) row.categoryId = remap('categories', row.categoryId);
	for (const node of snapshot.nodes || []) {
		const oldDialogue = node.dialogueId, oldId = node.id;
		node.id = remapNode(oldDialogue, oldId); node.dialogueId = remap('dialogues', oldDialogue);
		const data = node.data || {};
		if (data.participantId) data.participantId = remap('participants', data.participantId);
		if (data.targetNode) data.targetNode = remapNode(oldDialogue, data.targetNode);
		if (data.targetDialogue) data.targetDialogue = remap('dialogues', data.targetDialogue);
		for (const instance of data.decorators || []) instance.id = remap('decorators', instance.id);
		for (const row of data.dialogueRows || []) {
			row.id = maps.rows.get(JSON.stringify([oldDialogue, oldId, row.id])) ?? row.id;
			if (row.participantId) row.participantId = remap('participants', row.participantId);
		}
	}
	for (const edge of snapshot.edges || []) {
		const oldDialogue = edge.dialogueId;
		edge.id = preserveEntityIds ? edge.id : crypto.randomUUID(); edge.dialogueId = remap('dialogues', oldDialogue);
		edge.source = remapNode(oldDialogue, edge.source); edge.target = remapNode(oldDialogue, edge.target);
		for (const rule of edge.data?.conditions?.rules || []) rule.id = remap('conditions', rule.id);
	}
	for (const entry of snapshot.localizedStrings || []) {
		const oldDialogue = entry.dialogueId, oldNode = entry.nodeId;
		entry.dialogueId = remap('dialogues', oldDialogue); entry.nodeId = remapNode(oldDialogue, oldNode);
		if (entry.rowId) entry.rowId = maps.rows.get(JSON.stringify([oldDialogue, oldNode, entry.rowId])) ?? entry.rowId;
	}
	const allocated = [...existingDialogues];
	for (const dialogue of snapshot.dialogues || []) {
		const oldSlug = dialogue.localizationSlug;
		dialogue.localizationSlug = allocateDialogueLocalizationSlug(dialogue, allocated); allocated.push(dialogue);
		const nodes = snapshot.nodes.filter((node) => node.dialogueId === dialogue.id);
		const existingEntries = snapshot.localizedStrings.filter((entry) => entry.dialogueId === dialogue.id);
		const prepared = prepareLocalizedNodesAndEntries({ projectId, dialogueId: dialogue.id, dialogueSlug: dialogue.localizationSlug, nodes, locale: snapshot.project.localization?.defaultLocale || 'en', existingEntries });
		snapshot.nodes = snapshot.nodes.filter((node) => node.dialogueId !== dialogue.id).concat(prepared.nodes);
		// Keep unreferenced authored translation entries too: complete backups must
		// not prune them as a side effect of cloning.
		const referencedOldKeys = new Set(nodes.flatMap((node) => [node.data?.displayNameKey, node.data?.selectionTitleKey, ...(node.data?.dialogueRows || []).map((row) => row.textKey)]).filter(Boolean));
		const preparedEntries = prepared.entries.map((entry) => ({ ...existingEntries.find((original) => original.nodeId === entry.nodeId && (original.rowId || '') === (entry.rowId || '') && original.field === entry.field), ...entry }));
		const unusedEntries = existingEntries.filter((entry) => !referencedOldKeys.has(entry.key) && !prepared.entries.some((newEntry) => newEntry.key === entry.key)).map((entry) => {
			const oldNamespace = `dlg.${oldSlug || entry.dialogueSlug}.`;
			const key = entry.key.startsWith(oldNamespace) ? `dlg.${dialogue.localizationSlug}.${entry.key.slice(oldNamespace.length)}` : preserveEntityIds ? entry.key : `dlg.${dialogue.localizationSlug}.unused_${crypto.randomUUID().replaceAll('-', '_')}`;
			return { ...entry, key, dialogueSlug: dialogue.localizationSlug };
		});
		snapshot.localizedStrings = snapshot.localizedStrings.filter((entry) => entry.dialogueId !== dialogue.id).concat(preparedEntries, unusedEntries);
		dialogue.localizationVersion = 2;
	}
	return { snapshot, maps };
}
