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
		name: existingData.name || newData.name,
		categories: newData.categories || existingData.categories,
		participants: newData.participants || existingData.participants,
		nodes: newData.nodes || existingData.nodes,
		edges: newData.edges || existingData.edges,
		files: newData.files || existingData.files,
	};
};

export default mergeWithExistingData;
