import { useEffect } from "react";
import { getDB } from "../indexedDB";

const saveNodesAndEdgesToIndexedDB = async (nodes, edges) => {
	const db = await getDB();
	const tx = db.transaction("projects", "readwrite");
	const guid = sessionStorage.getItem("project-guid");
	const project = await tx.objectStore("projects").get(guid);

	const updatedProject = {
		...project,
		guid: project.guid,
		dialogueName: project.dialogueName || "Untitled Project",
		nodes: nodes.map((node) => ({
			id: node.id,
			type: node.type,
			position: node.position,
			data: {
				title: node.data.title,
				additionalInfo: {
					participant: node.data.additionalInfo?.participant || "",
					dialogueRows: node.data.additionalInfo?.dialogueRows || [],
					targetNodeId: node.data.additionalInfo?.targetNodeId || "",
					displayName:
						node.data.additionalInfo?.displayName || "Selectable Node",
				},
			},
		})),
		edges: edges.map((edge) => ({
			id: edge.id,
			source: edge.source,
			target: edge.target,
			type: edge.type,
		})),
	};

	// Save updated project with nodes, edges, title, and GUID
	await tx.objectStore("projects").put(updatedProject);
	await tx.done;
	console.log("Updated project saved with nodes, edges, title, and GUID.");
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
