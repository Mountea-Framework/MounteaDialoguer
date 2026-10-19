import { cloneGraphDraft } from './editorDraft';
import { START_NODE_ID } from './graphLayout';

/** A clipboard contains authored data only; it survives navigation between dialogues. */
export function captureDialogueClipboard({ projectId, dialogueId, nodes, edges, selectedNodeId }) {
	const picked = nodes.filter((node) => node.id !== START_NODE_ID && node.type !== 'placeholderNode' && (node.selected || node.id === selectedNodeId));
	if (!picked.length) return null;
	const graph = cloneGraphDraft(picked, edges);
	return { projectId, dialogueId, nodes: graph.nodes.map(({ id, type, position, data }) => ({ id, type, position, data })), edges: graph.edges, pasteCount: 0 };
}

export function pasteDialogueClipboard(clipboard, { projectId, dialogueId, nodes = [], dialogues = [], participants = [], decorators = [], conditions = [], createId, pasteCount = clipboard.pasteCount + 1 }) {
	const graph = cloneGraphDraft(clipboard.nodes, clipboard.edges);
	const sameProject = clipboard.projectId === projectId;
	const sameDialogue = sameProject && clipboard.dialogueId === dialogueId;
	const ids = new Map(graph.nodes.map((node) => [node.id, createId()]));
	const existingNodes = new Set(nodes.map((node) => node.id));
	const owned = (records) => records.filter((record) => record.projectId === projectId);
	const participantRecords = owned(participants);
	const decoratorIds = new Set(owned(decorators).map((record) => record.id));
	const conditionIds = new Set(owned(conditions).map((record) => record.id));
	const dialogueIds = new Set(owned(dialogues).map((record) => record.id));
	const cleared = { conditions: 0, decorators: 0, nodeSpeakers: 0, rowSpeakers: 0, returnTargets: 0, childTargets: 0 };
	const cleanSpeaker = (data, countKey) => {
		if (!data.participantId && !data.participant) return;
		const matches = data.participantId ? participantRecords.filter((record) => record.id === data.participantId) : participantRecords.filter((record) => record.name === data.participant);
		if (sameProject && matches.length === 1) return;
		delete data.participantId;
		data.participant = '';
		cleared[countKey] += 1;
	};
	for (const node of graph.nodes) {
		const oldId = node.id;
		node.id = ids.get(oldId);
		node.position = { x: node.position.x + 40 * pasteCount, y: node.position.y + 40 * pasteCount };
		node.selected = true;
		delete node.dialogueId;
		const data = node.data || (node.data = {});
		for (const key of ['displayNameKey', 'selectionTitleKey', 'localizationNodeToken']) delete data[key];
		cleanSpeaker(data, 'nodeSpeakers');
		if (Array.isArray(data.decorators)) data.decorators = data.decorators.filter((instance) => {
			if (sameProject && decoratorIds.has(instance.id)) return true;
			cleared.decorators += 1; return false;
		});
		for (const row of data.dialogueRows || []) {
			row.id = createId();
			delete row.textKey; delete row.localizationRowToken;
			cleanSpeaker(row, 'rowSpeakers');
		}
		if (data.targetNode) {
			if (ids.has(data.targetNode)) data.targetNode = ids.get(data.targetNode);
			else if (!sameDialogue || !existingNodes.has(data.targetNode)) { data.targetNode = ''; cleared.returnTargets += 1; }
		}
		if (data.targetDialogue && (!sameProject || data.targetDialogue === dialogueId || !dialogueIds.has(data.targetDialogue))) {
			data.targetDialogue = ''; cleared.childTargets += 1;
		}
	}
	for (const edge of graph.edges) {
		edge.id = createId();
		edge.source = ids.get(edge.source); edge.target = ids.get(edge.target);
		edge.type = 'conditionEdge';
		delete edge.dialogueId;
		delete edge.internals;
		const group = edge.data?.conditions || { mode: 'all', rules: [] };
		const rules = (group.rules || []).filter((rule) => {
			if (sameProject && conditionIds.has(rule.id)) return true;
			cleared.conditions += 1; return false;
		});
		edge.data = { ...edge.data, conditions: { ...group, mode: sameProject ? group.mode : 'all', rules } };
		edge.markerEnd = { type: 'arrowclosed' };
	}
	return { ...graph, cleared };
}
