import { getDB } from "../indexedDB";

const mergeWithExistingData = async (newData) => {
	const db = await getDB();
	const tx = db.transaction("projects", "readonly");
	const projectsStore = tx.objectStore("projects");
	const guid = localStorage.getItem("project-guid");
	const existingData = (await projectsStore.get(guid)) || {};
	return { ...existingData, ...newData };
};

export default mergeWithExistingData;
