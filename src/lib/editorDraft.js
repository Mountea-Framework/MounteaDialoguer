// Durable graph drafts retain binary attachments and unknown authored fields.
// Runtime callbacks, object URLs and React Flow interaction state are never history.
function cleanValue(value) {
	if (typeof value === 'function' || typeof value === 'symbol') return undefined;
	if (!value || typeof value !== 'object' || value instanceof Blob || value instanceof Date || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return value;
	if (Array.isArray(value)) return value.map(cleanValue);
	return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
		if ((key === 'url' || key === 'src') && typeof item === 'string' && item.startsWith('blob:')) return [];
		const cleaned = cleanValue(item);
		return cleaned === undefined ? [] : [[key, cleaned]];
	}));
}

export function cloneGraphDraft(nodes = [], edges = []) {
	const cleanRecord = (record) => {
		const result = cleanValue(record);
		for (const key of ['selected', 'dragging', 'resizing', 'measured', 'positionAbsolute']) delete result[key];
		return result;
	};
	const regularNodes = nodes.filter((node) => node.type !== 'placeholderNode');
	const ids = new Set(regularNodes.map((node) => node.id));
	return structuredClone({
		nodes: regularNodes.map(cleanRecord),
		edges: edges.filter((edge) => !edge.data?.isPlaceholder && ids.has(edge.source) && ids.has(edge.target)).map(cleanRecord),
	});
}

export function createEditorDraft(nodes, edges, generation = 0) {
	return { nodes, edges, history: [cloneGraphDraft(nodes, edges)], historyIndex: 0, revision: 0, savedRevision: 0, generation };
}

export function editorDraftReducer(state, action) {
	switch (action.type) {
		case 'nodes': return { ...state, nodes: action.value };
		case 'edges': return { ...state, edges: action.value };
		case 'dirty': return { ...state, history: state.history.slice(0, state.historyIndex + 1), revision: state.revision + 1 };
		case 'reset': return createEditorDraft(action.nodes, action.edges, state.generation + 1);
		case 'saved': return action.ticket.generation === state.generation
			? { ...state, savedRevision: Math.max(state.savedRevision, action.ticket.revision) } : state;
		case 'checkpoint': {
			const history = [...state.history.slice(0, state.historyIndex + 1), cloneGraphDraft(action.nodes, action.edges)].slice(-50);
			return { ...state, history, historyIndex: history.length - 1 };
		}
		case 'undo':
		case 'redo': {
			const index = state.historyIndex + (action.type === 'undo' ? -1 : 1);
			if (index < 0 || index >= state.history.length) return state;
			const graph = cloneGraphDraft(state.history[index].nodes, state.history[index].edges);
			return { ...state, ...graph, historyIndex: index, revision: state.revision + 1 };
		}
		case 'nodeData': {
			const node = state.nodes.find((candidate) => candidate.id === action.id);
			if (!node || !Object.entries(action.data).some(([key, value]) => node.data?.[key] !== value)) return state;
			return { ...state, history: state.history.slice(0, state.historyIndex + 1), revision: state.revision + 1, nodes: state.nodes.map((candidate) => candidate === node ? { ...node, data: { ...node.data, ...action.data } } : candidate) };
		}
		default: return state;
	}
}

export function createDecoratorInstance(definition) {
	return { id: definition.id, name: definition.name, values: Object.fromEntries((definition.properties || []).map((property) => [property.name, property.defaultValue ?? ''])) };
}

export function createEditorSaveQueue() {
	let tail = Promise.resolve();
	return (operation) => {
		const result = tail.then(operation);
		tail = result.catch(() => {});
		return result;
	};
}
