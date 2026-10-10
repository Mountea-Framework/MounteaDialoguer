import { useEffect, useSyncExternalStore } from 'react';
import { ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { getState, subscribe } from './captureStore.js';
import { nodeTypes, edgeTypes } from './nodeTypes.js';

function Canvas({ scene, view }) {
	return (
		<ReactFlow
			nodes={scene.nodes}
			edges={scene.edges}
			nodeTypes={nodeTypes}
			edgeTypes={edgeTypes}
			viewport={view}
			onViewportChange={() => {}}
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable={false}
			panOnDrag={false}
			zoomOnScroll={false}
			zoomOnDoubleClick={false}
			minZoom={0.05}
			maxZoom={2}
			proOptions={{ hideAttribution: true }}
		/>
	);
}

export default function Stage() {
	const state = useSyncExternalStore(subscribe, getState);
	useEffect(() => {
		const root = document.documentElement;
		root.classList.remove('light', 'dark');
		root.classList.add(state.theme);
	}, [state.theme]);

	if (!state.scene || !state.view) return null;
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<ReactFlowProvider>
				<Canvas scene={state.scene} view={state.view} />
			</ReactFlowProvider>
		</div>
	);
}
