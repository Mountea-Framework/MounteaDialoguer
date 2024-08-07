import { useEffect } from "react";
import { getDB } from "../indexedDB";

const saveNodesAndEdgesToIndexedDB = async (nodes, edges) => {
	const db = await getDB();
	const txNodes = db.transaction("nodes", "readwrite");
	const txEdges = db.transaction("edges", "readwrite");

	nodes.forEach((node) => txNodes.objectStore("nodes").put(node));
	edges.forEach((edge) => txEdges.objectStore("edges").put(edge));

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
