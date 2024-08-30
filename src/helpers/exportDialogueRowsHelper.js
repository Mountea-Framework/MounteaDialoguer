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

		console.log("Project data retrieved:", projectData);

		const dialogueRows = [];
		const zip = new JSZip();
		const audioFolder = zip.folder("audio");

		let totalAudioFiles = 0;
		let successfullyAddedAudioFiles = 0;

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
					totalAudioFiles++;
					try {
						const audioData = await fetchAudioFile(
							db,
							projectGuid,
							row.audio.path
						);
						if (audioData) {
							const subFolder = audioFolder.folder(row.id);
							const fileName = row.audio.path.split("/").pop();
							subFolder.file(fileName, audioData, { binary: true });
							successfullyAddedAudioFiles++;
							console.log(
								`Added audio file: ${fileName}, size: ${audioData.size} bytes`
							);
						} else {
							console.warn(
								`No audio data found for row ${row.id}, file path: ${row.audio.path}`
							);
						}
					} catch (error) {
						console.warn(
							`Failed to export audio file for row ${row.id}: ${error.message}`
						);
					}
				}
			}
		}

		console.log(`Total audio files: ${totalAudioFiles}`);
		console.log(
			`Successfully added audio files: ${successfullyAddedAudioFiles}`
		);

		const jsonString = JSON.stringify({ dialogueRows }, null, 2);
		zip.file(`${projectData.dialogueName}_dialogueRows.json`, jsonString);

		console.log("Generating zip file...");
		const zipBlob = await zip.generateAsync({ type: "blob" });
		console.log(`Zip file generated. Size: ${zipBlob.size} bytes`);

		if (zipBlob.size === 0) {
			console.error("Generated zip file is empty!");
			throw new Error("Generated zip file is empty");
		}

		downloadFile(zipBlob, `${projectData.dialogueName}_dialogueRows.zip`);
		console.log("Download initiated.");
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

		if (!file) {
			throw new Error(`Audio file not found: ${filePath}`);
		}

		console.log("File object:", file);

		if (!file.data || file.data.byteLength === 0) {
			console.warn(`File data is empty for file: ${filePath}`);
			return null;
		}

		console.log(`File data type: ${file.data.constructor.name}`);
		console.log(`File data length: ${file.data.byteLength} bytes`);

		const audioBlob = new Blob([file.data], { type: "audio/wav" });
		console.log(`Created audio Blob. Size: ${audioBlob.size} bytes`);
		return audioBlob;
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
