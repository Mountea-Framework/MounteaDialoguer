import { useEffect } from "react";

import mergeWithExistingData from "../helpers/autoSaveHelpers";

const saveNodesAndEdgesToLocalStorage = (nodes, edges) => {
	// Extract only the necessary serializable data from nodes and edges
	const serializableNodes = nodes.map((node) => ({
		id: node.id,
		type: node.type,
		position: node.position,
		data: {
			...node.data,
			additionalInfo: {
				participant: node.data.additionalInfo?.participant || "",
				dialogueRows:
					node.data.additionalInfo?.dialogueRows.map((row) => ({
						id: row.id,
						text: row.text,
						audio: row.audio?.path || null,
					})) || [],
			},
		},
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

	const mergedData = mergeWithExistingData(projectData);
	localStorage.setItem("autoSaveProject", JSON.stringify(mergedData));
};

const useAutoSaveNodesAndEdges = (nodes, edges) => {
	useEffect(() => {
		if (nodes && edges) {
			saveNodesAndEdgesToLocalStorage(nodes, edges);
		}
	}, [nodes, edges]);
};

export default useAutoSaveNodesAndEdges;
