import { getDB } from "../indexedDB";
import JSZip from "jszip";

export const exportDialogueRows = async (projectGuid) => {
	try {
		const db = await getDB();
		const transaction = db.transaction(["projects"], "readonly");
		const projectsStore = transaction.objectStore("projects");
		const projectData = await projectsStore.get(projectGuid);

		console.log("Retrieved project data for export:", projectData);

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
					duration: row.duration,
				});

				if (row.audio?.path) {
					try {
						console.log(`Fetching audio file: ${row.audio.path}`);
						const audioData = await fetchAudioFile(
							db,
							projectGuid,
							row.audio.path
						);
						if (audioData) {
							const subFolder = audioFolder.folder(row.id);
							const fileName = row.audio.path.split("/").pop();
							subFolder.file(fileName, audioData, { binary: true });
							console.log(
								`Added audio file to zip: ${fileName}, size: ${audioData.size} bytes`
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

		console.log("Retrieved project data:", projectData);

		if (!projectData || !projectData.files) {
			throw new Error(
				`Project or files not found for project GUID: ${projectGuid}`
			);
		}

		const file = projectData.files.find((f) => f.path === filePath);

		if (!file) {
			throw new Error(`Audio file not found: ${filePath}`);
		}

		console.log("Found file object:", file);
		console.log("File data type:", typeof file.data);

		let arrayBufferData;

		if (
			file.data &&
			file.data.type === "ArrayBuffer" &&
			Array.isArray(file.data.buffer)
		) {
			arrayBufferData = new Uint8Array(file.data.buffer).buffer;
		} else {
			throw new Error(
				`Invalid file data format: ${JSON.stringify(file.data).slice(
					0,
					100
				)}...`
			);
		}

		console.log("Array buffer length:", arrayBufferData.byteLength);

		const audioBlob = new Blob([new Uint8Array(arrayBufferData)], {
			type: "audio/wav",
		});
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
