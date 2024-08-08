import { useEffect } from "react";
import { getDB } from "../indexedDB";
import { v4 as uuidv4 } from "uuid";

const saveFileToIndexedDB = async (filePath, fileData) => {
	const db = await getDB();
	const guid = localStorage.getItem("project-guid");
	const tx = db.transaction("projects", "readwrite");
	const store = tx.objectStore("projects");

	try {
		const project = await store.get(guid);

		// Ensure files array exists
		if (!project.files) {
			project.files = [];
		}

		// Add or update the file entry in the project
		const existingFileIndex = project.files.findIndex(
			(f) => f.path === filePath
		);
		if (existingFileIndex >= 0) {
			project.files[existingFileIndex].data = fileData;
		} else {
			project.files.push({ path: filePath, data: fileData });
		}

		await store.put(project);
		await tx.done;
	} catch (error) {
		console.error("Error saving file data:", error);
		tx.abort();
	}
};

const deleteFileFromIndexedDB = async (filePath) => {
	const db = await getDB();
	const guid = localStorage.getItem("project-guid");
	const tx = db.transaction("projects", "readwrite");
	const store = tx.objectStore("projects");

	try {
		const project = await store.get(guid);

		// Remove the file entry from the project
		project.files = project.files.filter((f) => f.path !== filePath);

		await store.put(project);
		await tx.done;
	} catch (error) {
		console.error("Error deleting file data:", error);
		tx.abort();
	}
};

const saveProjectToIndexedDB = async (newData) => {
	const db = await getDB();
	const guid = localStorage.getItem("project-guid");
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

		const mergedData = {
			...existingData,
			...newData,
			dialogueName: newData.dialogueName || existingData?.dialogueName,
			categories: newData.categories || existingData?.categories || [],
			participants: newData.participants || existingData?.participants || [],
			nodes: mergeArrays(existingData?.nodes, newData.nodes),
			edges: mergeArrays(existingData?.edges, newData.edges),
			files: mergeArrays(existingData?.files, newData.files, "path"),
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
		const guid = localStorage.getItem("project-guid") || uuidv4();
		localStorage.setItem("project-guid", guid);

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

	return { saveProjectToIndexedDB, saveFileToIndexedDB, deleteFileFromIndexedDB };
};

export { useAutoSave, saveProjectToIndexedDB, saveFileToIndexedDB, deleteFileFromIndexedDB };
