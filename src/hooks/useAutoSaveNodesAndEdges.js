import { useEffect } from "react";
import { getDB } from "../indexedDB";

const saveNodesAndEdgesToIndexedDB = async (nodes, edges) => {
	const db = await getDB();
	const txNodes = db.transaction("nodes", "readwrite");
	const txEdges = db.transaction("edges", "readwrite");

	// Ensure nodes are serializable and only include necessary properties
	const serializableNodes = nodes.map((node) => ({
		id: node.id,
		type: node.type,
		position: node.position,
		data: {
			title: node.data.title,
			additionalInfo: {
				participant: node.data.additionalInfo?.participant || "",
				dialogueRows: node.data.additionalInfo?.dialogueRows || [],
			},
		},
	}));

	const serializableEdges = edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		type: edge.type,
	}));

	serializableNodes.forEach((node) => txNodes.objectStore("nodes").put(node));
	serializableEdges.forEach((edge) => txEdges.objectStore("edges").put(edge));

	await txNodes.done;
	await txEdges.done;
};

const useAutoSaveNodesAndEdges = (nodes, edges) => {
	useEffect(() => {
		if (nodes && edges) {
			saveNodesAndEdgesToIndexedDB(nodes, edges);
		}
	}, [nodes, edges]);

	return { saveNodesAndEdgesToIndexedDB };
};

export { useAutoSaveNodesAndEdges, saveNodesAndEdgesToIndexedDB };
