import { getDB } from "../indexedDB";

// Helper to export participants
export const exportParticipants = async (projectGuid) => {
	try {
		const db = await getDB();
		const transaction = db.transaction(["projects"], "readonly");
		const projectsStore = transaction.objectStore("projects");
		const projectData = await projectsStore.get(projectGuid);

		if (!projectData || !projectData.participants) {
			throw new Error("No participants found in the project.");
		}

		const participantsData = projectData.participants.map((participant) => ({
			name: participant.name,
			category: participant.category.split(".").pop(),
		}));

		const jsonString = JSON.stringify(
			{ participants: participantsData },
			null,
			2
		);
		downloadFile(jsonString, `${projectData.dialogueName}_participants.json`);
	} catch (error) {
		console.error("Failed to export participants:", error);
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
