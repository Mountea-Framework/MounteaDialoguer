import { useEffect } from "react";
import mergeWithExistingData from "../helpers/autoSaveHelpers";

const saveNodesAndEdgesToLocalStorage = (nodes, edges) => {
	const mergedData = mergeWithExistingData({ nodes, edges });
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
