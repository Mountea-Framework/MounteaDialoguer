import { getDB } from "../indexedDB";
import JSZip from "jszip";

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
					try {
						const audioData = await fetchAudioFile(
							db,
							projectGuid,
							row.audio.path
						);
						const subFolder = audioFolder.folder(row.id); // Create subfolder named after the row id
						subFolder.file(row.audio.path.split("/").pop(), audioData, {
							binary: true,
						});
					} catch (error) {
						console.warn(
							`Failed to export audio file for row ${row.id}: ${error.message}`
						);
					}
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

export const fetchAudioFile = async (db, projectGuid, filePath) => {
	try {
		const transaction = db.transaction(["projects"], "readonly");
		const projectsStore = transaction.objectStore("projects");
		const projectData = await projectsStore.get(projectGuid);

		if (!projectData || !projectData.files) {
			throw new Error(
				`Project or files not found for project GUID: ${projectGuid}`
			);
		}

		const file = projectData.files.find((f) => f.path === filePath);

		if (!file || !file.data) {
			throw new Error(`Audio file not found: ${filePath}`);
		}
		
		if (file.data instanceof Blob || file.data instanceof ArrayBuffer) {
			return file.data;
		}

		if (typeof file.data === "string") {
			const byteCharacters = atob(file.data);
			const byteNumbers = new Array(byteCharacters.length);
			for (let i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i);
			}
			const byteArray = new Uint8Array(byteNumbers);
			return new Blob([byteArray], { type: "audio/wav" });
		}

		throw new Error(`Unexpected data type for audio file: ${typeof file.data}`);
	} catch (error) {
		console.error("Error fetching audio file:", error);
		throw error;
	}
};

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
