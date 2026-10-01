import { useCallback, useRef, useState } from 'react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { cloneGraphDraft, createEditorDraft, editorDraftReducer } from '@/lib/editorDraft';

export function useEditorDraft(initialNodes, initialEdges) {
	const [state, render] = useState(() => createEditorDraft(initialNodes, initialEdges));
	const current = useRef(state);
	// Resolve event updates once against the current draft, never inside a React
	// functional updater (which React may defer or replay in StrictMode).
	const dispatch = useCallback((action) => {
		current.current = editorDraftReducer(current.current, action);
		render(current.current);
		return current.current;
	}, []);
	const setNodes = useCallback((value) => {
		const next = typeof value === 'function' ? value(current.current.nodes) : value;
		dispatch({ type: 'nodes', value: next });
	}, [dispatch]);
	const setEdges = useCallback((value) => {
		const next = typeof value === 'function' ? value(current.current.edges) : value;
		dispatch({ type: 'edges', value: next });
	}, [dispatch]);
	const markUnsaved = useCallback(() => dispatch({ type: 'dirty' }), [dispatch]);
	const onNodesChange = useCallback((changes) => {
		setNodes((nodes) => applyNodeChanges(changes, nodes));
		if (changes.some((change) => ['position', 'remove', 'add', 'replace'].includes(change.type))) markUnsaved();
		if (changes.some((change) => change.type === 'position' && change.dragging === false)) {
			dispatch({ type: 'checkpoint', nodes: current.current.nodes, edges: current.current.edges });
		}
	}, [setNodes, markUnsaved, dispatch]);
	const onEdgesChange = useCallback((changes) => {
		setEdges((edges) => applyEdgeChanges(changes, edges));
		if (changes.some((change) => change.type !== 'select')) markUnsaved();
	}, [setEdges, markUnsaved]);
	const saveToHistory = useCallback((nodes, edges) => dispatch({ type: 'checkpoint', nodes, edges }), [dispatch]);
	const resetDraft = useCallback((nodes, edges) => dispatch({ type: 'reset', nodes, edges }), [dispatch]);
	const updateNodeData = useCallback((id, data) => {
		const revision = current.current.revision;
		return dispatch({ type: 'nodeData', id, data }).revision !== revision;
	}, [dispatch]);
	const captureSave = useCallback(() => ({ ...cloneGraphDraft(current.current.nodes, current.current.edges), revision: current.current.revision, generation: current.current.generation }), []);
	const acknowledgeSave = useCallback((ticket) => {
		const next = dispatch({ type: 'saved', ticket });
		return ticket.generation === next.generation && next.revision === next.savedRevision;
	}, [dispatch]);
	const undo = useCallback(() => dispatch({ type: 'undo' }), [dispatch]);
	const redo = useCallback(() => dispatch({ type: 'redo' }), [dispatch]);
	return { ...state, setNodes, setEdges, onNodesChange, onEdgesChange, markUnsaved, saveToHistory, resetDraft, updateNodeData, captureSave, acknowledgeSave, undo, redo, hasUnsavedChanges: state.revision !== state.savedRevision };
}
