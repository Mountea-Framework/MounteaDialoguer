import { useEffect } from "react";

const saveNodesAndEdgesToLocalStorage = (nodes, edges) => {
	// Extract only the necessary serializable data from nodes and edges
	const serializableNodes = nodes.map((node) => ({
		id: node.id,
		type: node.type,
		position: node.position,
		data: node.data, // Ensure `data` contains only serializable values
	}));

	const serializableEdges = edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		type: edge.type,
	}));

	const projectData = {
		nodes: serializableNodes,
		edges: serializableEdges,
	};

	localStorage.setItem("autoSaveProject", JSON.stringify(projectData));
};

const useAutoSaveNodesAndEdges = (nodes, edges) => {
	useEffect(() => {
		if (nodes && edges) {
			saveNodesAndEdgesToLocalStorage(nodes, edges);
		}
	}, [nodes, edges]);
};

export default useAutoSaveNodesAndEdges;
