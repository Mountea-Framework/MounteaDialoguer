import { getDB } from "../indexedDB";
import JSZip from "jszip";

// Helper to export dialogue rows and audio files as a ZIP
export const exportDialogueRows = async (projectGuid) => {
	try {
		const db = await getDB();
		const transaction = db.transaction(["projects"], "readonly");
		const projectsStore = transaction.objectStore("projects");
		const projectData = await projectsStore.get(projectGuid);

		if (!projectData || !projectData.nodes) {
			throw new Error("No nodes found in the project.");
		}

		const dialogueRows = [];
		const zip = new JSZip();
		const audioFolder = zip.folder("audio");

		for (const node of projectData.nodes) {
			const nodeDialogueRows = node.data?.additionalInfo?.dialogueRows || [];

			for (const row of nodeDialogueRows) {
				dialogueRows.push({
					id: row.id,
					text: row.text,
					audioPath: row.audio?.path || null,
					nodeId: node.id,
				});

				if (row.audio?.path) {
					const audioData = await fetchAudioFile(
						db,
						projectGuid,
						row.audio.path
					);
					const subFolder = audioFolder.folder(row.id); // Create subfolder named after the row id
					subFolder.file(row.audio.path.split("/").pop(), audioData);
				}
			}
		}

		const jsonString = JSON.stringify({ dialogueRows }, null, 2);
		zip.file(`${projectData.dialogueName}_dialogueRows.json`, jsonString);

		const zipBlob = await zip.generateAsync({ type: "blob" });
		downloadFile(zipBlob, `${projectData.dialogueName}_dialogueRows.zip`);
	} catch (error) {
		console.error("Failed to export dialogue rows:", error);
		throw error;
	}
};

// Fetch the audio file data from IndexedDB
const fetchAudioFile = async (db, projectGuid, filePath) => {
	const transaction = db.transaction(["projects"], "readonly");
	const projectsStore = transaction.objectStore("projects");
	const projectData = await projectsStore.get(projectGuid);

	if (projectData && projectData.files) {
		const file = projectData.files.find((f) => f.path === filePath);
		if (file) {
			return file.data; // Assuming file data is stored as a Blob or ArrayBuffer
		}
	}
	throw new Error(`Audio file not found: ${filePath}`);
};

// Utility function to trigger download
const downloadFile = (blob, fileName) => {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};
