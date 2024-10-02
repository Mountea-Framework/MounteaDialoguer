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
			if (!newItems) return existing; // Preserve existing data if newItems is undefined
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

		// Separate file data before cleaning
		const fileData = newData.files || [];
		const newDataWithoutFiles = { ...newData, files: undefined };

		// Apply removeNonSerializable to newData and existingData
		const cleanNewData = removeNonSerializable(newDataWithoutFiles);
		const cleanExistingData = removeNonSerializable(existingData);

		// Merge file data separately, preserving ArrayBuffers
		const mergedFiles = mergeArrays(
			cleanExistingData?.files || [],
			fileData,
			"path"
		).map((file) => {
			if (file.data instanceof ArrayBuffer) {
				return {
					...file,
					data: {
						type: "ArrayBuffer",
						buffer: Array.from(new Uint8Array(file.data)),
					},
				};
			}
			return file;
		});

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
			files: mergedFiles,
		};

		await store.put(mergedData);
		await tx.done;
		console.log("Project saved successfully with file data preserved.");
	} catch (error) {
		console.error("Error saving project data:", error);
		tx.abort();
	}
};

const saveFileToIndexedDB = async (filePath, fileData) => {
	const db = await getDB();
	const guid = sessionStorage.getItem("project-guid");
	const tx = db.transaction("projects", "readwrite");
	const store = tx.objectStore("projects");

	try {
		let project = await store.get(guid);
		console.log("Retrieved project:", project);

		if (!project.files) {
			project.files = [];
		}

		let arrayBuffer;
		if (fileData instanceof Blob || fileData instanceof File) {
			arrayBuffer = await fileData.arrayBuffer();
			console.log("Converted Blob/File to ArrayBuffer");
		} else if (fileData instanceof ArrayBuffer) {
			arrayBuffer = fileData;
			console.log("Data is already an ArrayBuffer");
		} else if (typeof fileData === "string") {
			const binaryString = atob(fileData);
			arrayBuffer = new ArrayBuffer(binaryString.length);
			const uint8Array = new Uint8Array(arrayBuffer);
			for (let i = 0; i < binaryString.length; i++) {
				uint8Array[i] = binaryString.charCodeAt(i);
			}
			console.log("Converted base64 string to ArrayBuffer");
		} else {
			throw new Error(`Unsupported file data type: ${typeof fileData}`);
		}

		const uint8Array = new Uint8Array(arrayBuffer);
		const serializedData = Array.from(uint8Array);

		const existingFileIndex = project.files.findIndex(
			(f) => f.path === filePath
		);
		if (existingFileIndex >= 0) {
			project.files[existingFileIndex] = {
				path: filePath,
				data: {
					type: "ArrayBuffer",
					buffer: serializedData,
				},
			};
		} else {
			project.files.push({
				path: filePath,
				data: {
					type: "ArrayBuffer",
					buffer: serializedData,
				},
			});
		}

		console.log(`Saving file: ${filePath}`);
		console.log(`Original file data type: ${fileData.constructor.name}`);
		console.log(`Stored ArrayBuffer length: ${arrayBuffer.byteLength} bytes`);

		await store.put(project);
		await tx.done;

		// Verify the saved data
		const verifyTx = db.transaction("projects", "readonly");
		const verifyStore = verifyTx.objectStore("projects");
		const verifiedProject = await verifyStore.get(guid);
		const verifiedFile = verifiedProject.files.find((f) => f.path === filePath);
		console.log("Verified saved file data:", verifiedFile);
		console.log(
			`Verified data length: ${verifiedFile.data.buffer.length} bytes`
		);

		console.log(`File saved successfully: ${filePath}`);
	} catch (error) {
		console.error("Error saving file data:", error);
		tx.abort();
	}
};

const deleteFileFromIndexedDB = async (filePath) => {
	const db = await getDB();
	const guid = sessionStorage.getItem("project-guid");
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
			categories: categories || [],
			participants: participants || [],
			nodes: nodes || [],
			edges: edges || [],
			files: files || [],
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

export {
	useAutoSave,
	saveProjectToIndexedDB,
	saveFileToIndexedDB,
	deleteFileFromIndexedDB,
};
