import { useEffect } from "react";
import { getDB } from "../indexedDB";

const saveProjectToIndexedDB = async (projectData) => {
	const db = await getDB();
	const tx = db.transaction("projects", "readwrite");
	await tx.objectStore("projects").put(projectData);
	await tx.done;
};

const useAutoSave = (name, categories, participants) => {
	useEffect(() => {
		if (name && categories && participants) {
			saveProjectToIndexedDB({ name, categories, participants });
		}
	}, [name, categories, participants]);

	return { saveProjectToIndexedDB };
};

export { useAutoSave, saveProjectToIndexedDB };
