import { useEffect } from "react";
import { getDB } from "../indexedDB";
import { v4 as uuidv4 } from "uuid";

const saveProjectToIndexedDB = async (newData) => {
	const db = await getDB();
	const guid = sessionStorage.getItem("project-guid");
	const tx = db.transaction("projects", "readwrite");
	const store = tx.objectStore("projects");

	try {
		const existingData = await store.get(guid);

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

		// Function to remove non-serializable data
		const removeNonSerializable = (obj) => {
			const newObj = {};
			for (let key in obj) {
				if (obj.hasOwnProperty(key)) {
					if (typeof obj[key] !== "function" && typeof obj[key] !== "symbol") {
						if (Array.isArray(obj[key])) {
							newObj[key] = obj[key].map((item) =>
								typeof item === "object" && item !== null
									? removeNonSerializable(item)
									: item
							);
						} else if (typeof obj[key] === "object" && obj[key] !== null) {
							newObj[key] = removeNonSerializable(obj[key]);
						} else {
							newObj[key] = obj[key];
						}
					}
				}
			}
			return newObj;
		};

		// Apply removeNonSerializable to newData and existingData
		const cleanNewData = removeNonSerializable(newData);
		const cleanExistingData = removeNonSerializable(existingData);

		const mergedData = {
			...cleanExistingData,
			...cleanNewData,
			dialogueName:
				cleanNewData.dialogueName || cleanExistingData?.dialogueName,
			categories:
				cleanNewData.categories || cleanExistingData?.categories || [],
			participants:
				cleanNewData.participants || cleanExistingData?.participants || [],
			nodes: mergeArrays(cleanExistingData?.nodes, cleanNewData.nodes),
			edges: mergeArrays(cleanExistingData?.edges, cleanNewData.edges),
			files: mergeArrays(cleanExistingData?.files, cleanNewData.files, "path"),
		};

		await store.put(mergedData);
		await tx.done;
	} catch (error) {
		console.error("Error saving project data:", error);
		tx.abort();
	}
};

const useAutoSave = (
	dialogueName,
	categories,
	participants,
	nodes,
	edges,
	files
) => {
	useEffect(() => {
		const guid = sessionStorage.getItem("project-guid") || uuidv4();
		sessionStorage.setItem("project-guid", guid);

		const projectData = {
			guid,
			dialogueName: dialogueName,
		};

		if (categories) projectData.categories = categories;
		if (participants) projectData.participants = participants;
		if (nodes) projectData.nodes = nodes;
		if (edges) projectData.edges = edges;
		if (files) projectData.files = files;

		saveProjectToIndexedDB(projectData);
	}, [dialogueName, categories, participants, nodes, edges, files]);

	return { saveProjectToIndexedDB };
};

export { useAutoSave, saveProjectToIndexedDB };
