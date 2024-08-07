import { useEffect } from "react";
import { getDB } from "../indexedDB";
import { v4 as uuidv4 } from "uuid";

const saveProjectToIndexedDB = async (projectData) => {
	const db = await getDB();
	const tx = db.transaction("projects", "readwrite");
	await tx.objectStore("projects").put(projectData); // This will overwrite the existing entry if GUID is the same
	await tx.done;
};

const useAutoSave = (name, categories, participants, nodes, edges, files) => {
	useEffect(() => {
		if (name && categories && participants) {
			const guid = localStorage.getItem("project-guid") || uuidv4();
			localStorage.setItem("project-guid", guid);

			const projectData = {
				guid,
				dialogueName: name || "UntitledProject",
				categories: categories || [],
				participants: participants || [],
				nodes: nodes || [],
				edges: edges || [],
				files: files || [],
			};

			saveProjectToIndexedDB(projectData);
		}
	}, [name, categories, participants, nodes, edges, files]);

	return { saveProjectToIndexedDB };
};

export { useAutoSave, saveProjectToIndexedDB };
