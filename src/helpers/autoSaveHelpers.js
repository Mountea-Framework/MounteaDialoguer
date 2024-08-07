import { getDB } from "../indexedDB";

const mergeWithExistingData = async (newData) => {
	const db = await getDB();
	const tx = db.transaction("projects", "readonly");
	const projectsStore = tx.objectStore("projects");
	const guid = localStorage.getItem("project-guid");
	const existingData = (await projectsStore.get(guid)) || {};
	return {
		...existingData,
		...newData,
		dialogueName:
			existingData.dialogueName || newData.name || existingData.name,
		categories: [
			...(existingData.categories || []),
			...(newData.categories || []),
		],
		participants: [
			...(existingData.participants || []),
			...(newData.participants || []),
		],
		nodes: [...(existingData.nodes || []), ...(newData.nodes || [])],
		edges: [...(existingData.edges || []), ...(newData.edges || [])],
		files: [...(existingData.files || []), ...(newData.files || [])],
	};
};

export default mergeWithExistingData;
