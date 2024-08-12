import { getDB } from "../indexedDB";

// Helper to export categories
export const exportCategories = async (projectGuid) => {
	try {
		const db = await getDB();
		const transaction = db.transaction(["projects"], "readonly");
		const projectsStore = transaction.objectStore("projects");
		const projectData = await projectsStore.get(projectGuid);

		if (!projectData || !projectData.categories) {
			throw new Error("No categories found in the project.");
		}

		const categoriesData = projectData.categories.map((category) => ({
			name: category.name,
			parent: category.parent.split(".").pop(),
		}));

		const jsonString = JSON.stringify({ categories: categoriesData }, null, 2);
		downloadFile(jsonString, `${projectData.dialogueName}_categories.json`);
	} catch (error) {
		console.error("Failed to export categories:", error);
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
