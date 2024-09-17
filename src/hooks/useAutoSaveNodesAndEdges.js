import { useEffect } from "react";
import { getDB } from "../indexedDB";

const saveNodesAndEdgesToIndexedDB = async (nodes, edges) => {
	const db = await getDB();
	const tx = db.transaction("projects", "readwrite");
	const guid = sessionStorage.getItem("project-guid");
	const project = await tx.objectStore("projects").get(guid);

	project.nodes = nodes.map((node) => ({
		id: node.id,
		type: node.type,
		position: node.position,
		data: {
			title: node.data.title,
			additionalInfo: {
				participant: node.data.additionalInfo?.participant || "",
				dialogueRows: node.data.additionalInfo?.dialogueRows || [],
				targetNodeId: node.data.additionalInfo?.targetNodeId || "",
				displayName: node.data.additionalInfo?.displayName || "Selectable Node",
			},
		},
	}));

	project.edges = edges.map((edge) => ({
		id: edge.id,
		source: edge.source,
		target: edge.target,
		type: edge.type,
	}));

	await tx.objectStore("projects").put(project);
	await tx.done;
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
