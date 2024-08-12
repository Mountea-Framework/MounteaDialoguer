import { getDB } from "../indexedDB";

// Helper to export dialogue rows
export const exportDialogueRows = async (projectGuid) => {
	try {
		const db = await getDB();
		const transaction = db.transaction(["projects"], "readonly");
		const projectsStore = transaction.objectStore("projects");
		const projectData = await projectsStore.get(projectGuid);

		if (!projectData || !projectData.nodes) {
			throw new Error("No nodes found in the project.");
		}

		const dialogueRows = projectData.nodes.flatMap(
			(node) =>
				node.data?.additionalInfo?.dialogueRows.map((row) => ({
					id: row.id,
					text: row.text,
					audioPath: row.audio?.path || null,
					nodeId: node.id,
				})) || []
		);

		const jsonString = JSON.stringify({ dialogueRows }, null, 2);
		downloadFile(jsonString, `${projectData.dialogueName}_dialogueRows.json`);
	} catch (error) {
		console.error("Failed to export dialogue rows:", error);
		throw error;
	}
};

// Utility function to trigger download
const downloadFile = (content, fileName) => {
	const blob = new Blob([content], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};
