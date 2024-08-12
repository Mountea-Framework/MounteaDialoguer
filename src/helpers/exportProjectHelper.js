import { getDB } from "../indexedDB";
import JSZip from "jszip";
import { exportCategories } from "./exportCategoriesHelper";
import { exportParticipants } from "./exportParticipantsHelper";
import { fetchAudioFile } from "./exportDialogueRowsHelper";

export const exportProject = async (projectGuid) => {
	try {
		const db = await getDB();
		const transaction = db.transaction(["projects"], "readonly");
		const projectsStore = transaction.objectStore("projects");
		const projectData = await projectsStore.get(projectGuid);

		if (!projectData) {
			throw new Error("Project not found.");
		}

		const zip = new JSZip();

		// Export categories
		const categories = projectData.categories || [];
		const categoriesJson = JSON.stringify(categories, null, 2);
		zip.file("categories.json", categoriesJson);

		// Export participants
		const participants = projectData.participants || [];
		const participantsJson = JSON.stringify(participants, null, 2);
		zip.file("participants.json", participantsJson);

		// Prepare the nodes for export
		const nodes = projectData.nodes || [];
		const edges = projectData.edges || [];
		const dialogueRows = [];
		const audioFolder = zip.folder("audio");

		for (const node of nodes) {
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

		const nodesJson = JSON.stringify(nodes, null, 2);
		const edgesJson = JSON.stringify(edges, null, 2);
		const dialogueRowsJson = JSON.stringify(dialogueRows, null, 2);

		zip.file("nodes.json", nodesJson);
		zip.file("edges.json", edgesJson);
		zip.file("dialogueRows.json", dialogueRowsJson);

		const zipBlob = await zip.generateAsync({ type: "blob" });
		downloadFile(zipBlob, `${projectData.dialogueName}_Project.mnteadlg`);
	} catch (error) {
		console.error("Failed to export project:", error);
		throw error;
	}
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
