import { useEffect } from "react";
import { getDB } from "../indexedDB";
import { v4 as uuidv4 } from "uuid";

const saveProjectToIndexedDB = async (newData) => {
	const db = await getDB();
	const guid = localStorage.getItem("project-guid");
	const tx = db.transaction("projects", "readwrite");
	const store = tx.objectStore("projects");

	try {
		// Get existing data
		const existingData = await store.get(guid);

		// Helper function to merge arrays based on a key
		const mergeArrays = (existing = [], newItems = [], key = "id") => {
			const merged = [...existing];
			newItems.forEach((item) => {
				const index = merged.findIndex((e) => e[key] === item[key]);
				if (index !== -1) {
					merged[index] = { ...merged[index], ...item };
				} else {
					merged.push(item);
				}
			});
			return merged;
		};

		// Merge existing data with new data
		const mergedData = {
			...existingData,
			...newData,
			dialogueName: newData.dialogueName || existingData?.dialogueName,
			categories: newData.categories || existingData?.categories || [],
			participants: newData.participants || existingData?.participants || [],
			nodes: mergeArrays(existingData?.nodes, newData.nodes),
			edges: mergeArrays(existingData?.edges, newData.edges),
			files: newData.files || existingData?.files || [],
		};

		// Save merged data
		await store.put(mergedData);
		await tx.done;
	} catch (error) {
		console.error("Error saving project data:", error);
		tx.abort();
	}
};

const useAutoSave = (name, categories, participants, nodes, edges, files) => {
	useEffect(() => {
		const guid = localStorage.getItem("project-guid") || uuidv4();
		localStorage.setItem("project-guid", guid);

		const projectData = {
			guid,
			dialogueName: name,
		};

		if (categories) projectData.categories = categories;
		if (participants) projectData.participants = participants;
		if (nodes) projectData.nodes = nodes;
		if (edges) projectData.edges = edges;
		if (files) projectData.files = files;

		saveProjectToIndexedDB(projectData);
	}, [name, categories, participants, nodes, edges, files]);

	return { saveProjectToIndexedDB };
};

export { useAutoSave, saveProjectToIndexedDB };
